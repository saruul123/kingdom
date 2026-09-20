import type { GameContext } from '../core/context'
import {
  findById,
  isAlive,
  isBuildingStanding,
  resolveTarget,
} from '../core/lookup'
import type { Resolved } from '../core/lookup'
import type { Building, Enemy, Side, TargetRef } from '../core/types'
import { go } from './stateMachine'
import type { Nodes } from './stateMachine'
import { faceToward, moveToward } from './helpers'
import { sideOf } from '../core/math'
import { mn } from '../i18n'

const RETARGET_INTERVAL = 0.6
/** How far from its camp a guard will follow the hero. */
const GUARD_LEASH = 380

function def(e: Enemy, ctx: GameContext) {
  return ctx.config.enemies[e.type]
}

/** Is x on the settlement-facing side of the enemy (up to the settlement centre)? */
function ahead(e: Enemy, x: number, ctx: GameContext): boolean {
  const centre = ctx.sys.buildings.ger()?.x ?? 0
  const slack = 60
  return e.side < 0
    ? x >= e.x - 5 && x <= centre + slack
    : x <= e.x + 5 && x >= centre - slack
}

function nearestBy<T>(
  items: T[],
  x: number,
  pos: (t: T) => number,
): T | undefined {
  let best: T | undefined
  let bestD = Infinity
  for (const it of items) {
    const d = Math.abs(pos(it) - x)
    if (d < bestD) {
      bestD = d
      best = it
    }
  }
  return best
}

/** Nearest intact wall standing between the enemy and x (it must be broken first). */
function blockerBetween(
  e: Enemy,
  x: number,
  ctx: GameContext,
  exceptId: number | null,
): Building | undefined {
  if (e.carryingBanner || def(e, ctx).ranged) return undefined
  const lo = Math.min(e.x, x)
  const hi = Math.max(e.x, x)
  const walls = ctx.sys.buildings
    .blockingWalls()
    .filter((w) => w.id !== exceptId && w.x > lo && w.x < hi)
  return nearestBy(walls, e.x, (w) => w.x)
}

/** Target selection follows the enemy definition's priority list (data-driven). */
export function chooseTarget(e: Enemy, ctx: GameContext): TargetRef | null {
  const { state, config } = ctx
  const d = def(e, ctx)

  // Camp guards only ever chase a hero who wanders into their territory.
  if (e.campId !== null) {
    const camp = findById(state.enemyCamps, e.campId)
    const near =
      camp &&
      !camp.cleared &&
      Math.abs(state.hero.x - camp.x) < GUARD_LEASH &&
      Math.abs(state.hero.x - e.x) <= d.heroAggroRange + 80 &&
      state.banner.state !== 'carried'
    return near ? { kind: 'hero', id: 0 } : null
  }

  let ref: TargetRef | null = null
  let refX = 0
  let refBuildingId: number | null = null

  // A dropped banner outranks everything else; otherwise the hero is fair game up close.
  if (
    d.targetPriority.includes('banner') &&
    state.banner.state === 'ground' &&
    Math.abs(state.banner.x - e.x) < 700
  ) {
    ref = { kind: 'banner', id: 0 }
    refX = state.banner.x
  } else if (
    Math.abs(state.hero.x - e.x) <= d.heroAggroRange &&
    state.banner.state !== 'carried'
  ) {
    ref = { kind: 'hero', id: 0 }
    refX = state.hero.x
  }

  for (const cat of ref ? [] : d.targetPriority) {
    if (cat === 'banner') continue
    if (cat === 'defender' || cat === 'citizen') {
      const list = state.citizens.filter(
        (c) =>
          c.owner === 'player' &&
          isAlive(c) &&
          (cat === 'defender') ===
            (c.profession === 'Archer' || c.profession === 'Horseman') &&
          ahead(e, c.x, ctx),
      )
      const c = nearestBy(list, e.x, (u) => u.x)
      if (c) {
        ref = { kind: 'citizen', id: c.id }
        refX = c.x
      }
    } else {
      const list = state.buildings.filter(
        (b) =>
          isBuildingStanding(b) &&
          config.buildings[b.type].category === cat &&
          ahead(e, b.x, ctx),
      )
      const b = nearestBy(list, e.x, (x) => x.x)
      if (b) {
        ref = { kind: 'building', id: b.id }
        refX = b.x
        refBuildingId = b.id
      }
    }
    if (ref) break
  }
  if (!ref) return null

  const blocker = blockerBetween(e, refX, ctx, refBuildingId)
  return blocker ? { kind: 'building', id: blocker.id } : ref
}

/** Horizontal distance from the enemy to the edge of its target. */
function edgeDistance(e: Enemy, t: Resolved, ctx: GameContext): number {
  switch (t.kind) {
    case 'building':
      return Math.abs(t.entity.x - e.x) - ctx.sys.buildings.halfWidth(t.entity)
    case 'citizen':
    case 'enemy':
    case 'animal':
    case 'camp':
      return Math.abs(t.entity.x - e.x)
    case 'hero':
      return Math.abs(ctx.state.hero.x - e.x)
    case 'banner':
      return Math.abs(ctx.state.banner.x - e.x)
  }
}

function targetX(t: Resolved, ctx: GameContext): number {
  if (t.kind === 'hero') return ctx.state.hero.x
  if (t.kind === 'banner') return ctx.state.banner.x
  return t.entity.x
}

/** Enemies cannot walk through intact walls (from either side) unless they carry the banner. */
function clampAgainstWalls(e: Enemy, prevX: number, ctx: GameContext): void {
  if (e.carryingBanner) return
  for (const w of ctx.sys.buildings.blockingWalls()) {
    const hw = ctx.sys.buildings.halfWidth(w)
    if (prevX <= w.x - hw && e.x > w.x - hw - 2) e.x = w.x - hw - 2
    else if (prevX >= w.x + hw && e.x < w.x + hw + 2) e.x = w.x + hw + 2
  }
}

function step(
  e: Enemy,
  ctx: GameContext,
  x: number,
  dt: number,
  arrive: number,
): boolean {
  const prev = e.x
  const arrived = moveToward(ctx, e, x, def(e, ctx).movementSpeed, dt, arrive)
  clampAgainstWalls(e, prev, ctx)
  return arrived
}

function applyHit(e: Enemy, ctx: GameContext, t: Resolved): void {
  const damage = e.damage
  switch (t.kind) {
    case 'building':
      ctx.sys.damage.damageBuilding(
        t.entity.id,
        damage * (def(e, ctx).structureDamageMultiplier ?? 1),
      )
      break
    case 'citizen':
      ctx.sys.damage.damageCitizen(t.entity.id, damage)
      break
    case 'hero':
      ctx.sys.damage.hitHero(e.x, damage)
      break
    case 'banner': {
      const { state, bus } = ctx
      state.banner = { state: 'carried', x: e.x, carrierId: e.id, delay: 0 }
      e.carryingBanner = true
      bus.emit('toast', {
        text: mn.bannerSeized,
        kind: 'danger',
      })
      go(e, 'Escape', 'Fleeing')
      break
    }
    default:
      break
  }
}

export const enemyNodes: Nodes<Enemy> = {
  Idle(e) {
    go(e, 'FindTarget', 'Moving')
  },

  FindTarget(e, ctx) {
    e.target = chooseTarget(e, ctx)
    e.retargetIn = RETARGET_INTERVAL
    if (!e.target) {
      if (e.campId !== null) return go(e, 'Guard', 'Idle')
      // Nothing left to attack: hold position; the night will end on its own.
      e.state = 'Idle'
      return
    }
    go(e, 'Move', 'Moving')
  },

  Move(e, ctx, dt) {
    e.retargetIn -= dt
    if (e.retargetIn <= 0) {
      e.retargetIn = RETARGET_INTERVAL
      const next = chooseTarget(e, ctx)
      if (!next) return go(e, 'FindTarget', 'Moving')
      e.target = next
    }
    const t = resolveTarget(ctx.state, e.target)
    if (!t) return go(e, 'FindTarget', 'Moving')
    const attackRange = def(e, ctx).attackRange
    if (edgeDistance(e, t, ctx) <= attackRange) {
      faceToward(e, targetX(t, ctx))
      go(e, 'Attack', 'Fighting')
      e.cooldown = Math.min(e.cooldown, 0.3)
      return
    }
    const hw = t.kind === 'building' ? ctx.sys.buildings.halfWidth(t.entity) : 0
    const dir = sideOf(targetX(t, ctx) - e.x, e.facing)
    const stopX = targetX(t, ctx) - dir * (hw + attackRange * 0.8)
    step(e, ctx, stopX, dt, 1)
  },

  Attack(e, ctx, dt) {
    if (e.cooldown > 0) e.cooldown -= dt
    e.retargetIn -= dt
    const t = resolveTarget(ctx.state, e.target)
    if (!t) return go(e, 'TargetDestroyed', 'Moving')
    if (edgeDistance(e, t, ctx) > def(e, ctx).attackRange + 6)
      return go(e, 'Move', 'Moving')
    faceToward(e, targetX(t, ctx))
    if (e.retargetIn <= 0) {
      e.retargetIn = RETARGET_INTERVAL
      const next = chooseTarget(e, ctx)
      // Only switch for something more urgent (hero/banner) or a different blocker.
      if (
        next &&
        (next.kind === 'hero' || next.kind === 'banner') &&
        next.kind !== e.target?.kind
      ) {
        e.target = next
        return go(e, 'Move', 'Moving')
      }
    }
    if (e.cooldown > 0) return
    e.cooldown = def(e, ctx).attackCooldown
    const d = def(e, ctx)
    if (d.ranged && e.target) {
      ctx.sys.combat.fireArrow({
        x: e.x,
        y: 26,
        target: e.target,
        damage: e.damage,
        speed: d.projectileSpeed ?? 400,
        sourceId: e.id,
        hostile: true,
      })
      return
    }
    applyHit(e, ctx, t)
  },

  /** Camp guard: mill about the fire and pounce on an intruding hero. */
  Guard(e, ctx, dt) {
    const camp = findById(ctx.state.enemyCamps, e.campId)
    if (!camp || camp.cleared) {
      e.campId = null
      return go(e, 'Retreat', 'Fleeing')
    }
    e.retargetIn -= dt
    if (e.retargetIn <= 0) {
      e.retargetIn = 0.5
      const t = chooseTarget(e, ctx)
      if (t) {
        e.target = t
        return go(e, 'Move', 'Moving')
      }
    }
    const home = camp.x + ((e.id % 5) - 2) * 22
    e.state = moveToward(ctx, e, home, def(e, ctx).movementSpeed * 0.4, dt, 4)
      ? 'Idle'
      : 'Moving'
  },

  TargetDestroyed(e) {
    e.target = null
    go(e, 'FindTarget', 'Moving')
  },

  /** Carrying the banner off the steppe. Leaving controlled territory ends the game. */
  Escape(e, ctx, dt) {
    const dir: Side = e.x === 0 ? e.side : sideOf(e.x)
    moveToward(ctx, e, e.x + dir * 200, def(e, ctx).movementSpeed * 1.25, dt, 0)
    ctx.state.banner.x = e.x
    if (!ctx.sys.territory.contains(e.x)) {
      ctx.bus.emit('gameOver', {
        reason: mn.reasonBannerLost,
      })
    }
  },

  /** Dawn: surviving enemies withdraw back to where they came from. */
  Retreat(e, ctx, dt) {
    const far =
      e.side *
      Math.max(ctx.config.world.spawnDistance + 120, Math.abs(e.x) + 150)
    if (step(e, ctx, far, dt, 4)) {
      // Gone from the map: expire immediately (not a kill).
      e.state = 'Dead'
      e.deadTimer = 0
    }
  },

  Dead() {},
}
