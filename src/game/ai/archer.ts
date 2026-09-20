import type { GameContext } from '../core/context'
import {
  findById,
  isAlive,
  isBuildingStanding,
  resolveTarget,
} from '../core/lookup'
import type { Animal, Citizen, Enemy, Side } from '../core/types'
import { faceToward, gerX, isDusk, moveToward } from './helpers'
import { go } from './stateMachine'
import type { Nodes } from './stateMachine'

const NIGHT_BRAINS = new Set([
  'ReturnToBase',
  'FindDefensePosition',
  'MoveToPost',
  'FindEnemy',
  'Attack',
])

function def(ctx: GameContext) {
  return ctx.config.professions.archer
}

function effectiveRange(u: Citizen, ctx: GameContext): number {
  const tower = findById(ctx.state.buildings, u.postBuildingId)
  const bonus = tower
    ? def(ctx).towerRangeBonus + ctx.sys.buildings.extraRange(tower)
    : 0
  return def(ctx).range + bonus
}

/**
 * Choose which side to defend: the one with the most raiders per defender,
 * falling back to balancing defenders (ties keep the archer where they are).
 */
function pickSide(u: Citizen, ctx: GameContext): Side {
  const centre = gerX(ctx)
  let left = 0
  let right = 0
  for (const c of ctx.state.citizens) {
    if (
      c.id === u.id ||
      c.owner !== 'player' ||
      c.profession !== 'Archer' ||
      !isAlive(c)
    )
      continue
    if (
      c.brain === 'MoveToPost' ||
      c.brain === 'FindEnemy' ||
      c.brain === 'Attack'
    ) {
      if (c.postSide < 0) left++
      else right++
    }
  }
  let enemiesLeft = 0
  let enemiesRight = 0
  for (const e of ctx.state.enemies) {
    if (!isAlive(e)) continue
    if (e.x < centre) enemiesLeft++
    else enemiesRight++
  }
  const threatLeft = enemiesLeft / (left + 1)
  const threatRight = enemiesRight / (right + 1)
  if (threatLeft !== threatRight) return threatLeft > threatRight ? -1 : 1
  if (left !== right) return left < right ? -1 : 1
  return u.brain === 'FindEnemy' || u.brain === 'Attack'
    ? u.postSide
    : u.x < centre
      ? -1
      : 1
}

/** Ground post: just behind the outermost wall on that side, or beside the ger. */
function groundPost(u: Citizen, ctx: GameContext, side: Side): number {
  const walls = ctx.sys.buildings
    .blockingWalls()
    .filter((w) => w.side === side)
    .sort((a, b) => side * (b.x - a.x))
  const wall = walls.at(0)
  if (wall)
    return (
      wall.x - side * (ctx.sys.buildings.halfWidth(wall) + 22 + (u.id % 3) * 10)
    )
  return gerX(ctx) + side * (70 + (u.id % 3) * 14)
}

function nearestEnemy(
  u: Citizen,
  ctx: GameContext,
  range: number,
): Enemy | undefined {
  let best: Enemy | undefined
  let bestD = range
  for (const e of ctx.state.enemies) {
    if (!isAlive(e)) continue
    const d = Math.abs(e.x - u.x)
    if (d <= bestD) {
      bestD = d
      best = e
    }
  }
  return best
}

function shoot(
  u: Citizen,
  ctx: GameContext,
  kind: 'enemy' | 'animal',
  id: number,
): void {
  const d = def(ctx)
  const tower = findById(ctx.state.buildings, u.postBuildingId)
  ctx.sys.combat.fireArrow({
    x: u.x,
    y:
      tower && u.brain !== 'MoveToPost'
        ? ctx.sys.buildings.heightOf(tower) + 26
        : 26,
    target: { kind, id },
    damage: d.damage,
    speed: d.arrowSpeed,
    sourceId: u.id,
  })
  u.cooldown = d.cooldown
}

export const archerNodes: Nodes<Citizen> = {
  Idle(u, _ctx, dt) {
    if (u.cooldown > 0) u.cooldown -= dt
    if (u.timer >= 0.6) go(u, 'FindAnimal', 'Idle')
  },

  FindAnimal(u, ctx) {
    const d = def(ctx)
    const cx = gerX(ctx)
    let best: Animal | undefined
    let bestD = Infinity
    for (const a of ctx.state.animals) {
      if (!isAlive(a) || (a.claimedBy !== null && a.claimedBy !== u.id))
        continue
      if (Math.abs(a.x - cx) > d.huntRadius) continue
      const dist = Math.abs(a.x - u.x)
      if (dist < bestD) {
        bestD = dist
        best = a
      }
    }
    if (!best) {
      // Nothing to hunt: loiter near the ger and look again shortly.
      go(u, 'Loiter', 'Idle')
      return
    }
    best.claimedBy = u.id
    u.target = { kind: 'animal', id: best.id }
    go(u, 'MoveToTarget', 'Moving')
  },

  Loiter(u, ctx, dt) {
    const cx = gerX(ctx)
    if (Math.abs(u.x - cx) > 140)
      moveToward(ctx, u, cx + (u.id % 5) * 20 - 40, def(ctx).speed * 0.6, dt)
    if (u.timer > 3) go(u, 'FindAnimal', 'Idle')
  },

  MoveToTarget(u, ctx, dt) {
    const animal = findById(ctx.state.animals, u.target?.id)
    if (!animal) return go(u, 'Idle', 'Idle')
    if (!isAlive(animal)) return go(u, 'CollectReward', 'Moving')
    const d = def(ctx)
    if (moveToward(ctx, u, animal.x, d.speed, dt, d.range * 0.8)) {
      go(u, 'HuntAttack', 'Fighting')
      u.cooldown = 0
    }
  },

  CollectReward(u, ctx, dt) {
    const animal = findById(ctx.state.animals, u.target?.id)
    if (!animal) return go(u, 'Idle', 'Idle')
    if (!moveToward(ctx, u, animal.x, def(ctx).speed, dt, 6)) return
    u.carrying = animal.reward
    ctx.state.animals = ctx.state.animals.filter((a) => a.id !== animal.id)
    u.target = null
    go(u, 'Return', 'Returning')
  },

  Return(u, ctx, dt) {
    if (
      !moveToward(
        ctx,
        u,
        gerX(ctx) + ((u.id % 3) - 1) * 26,
        def(ctx).speed,
        dt,
        8,
      )
    )
      return
    if (u.carrying > 0) ctx.sys.economy.dropCoins(u.x, u.carrying, 'income')
    u.carrying = 0
    go(u, 'Idle', 'Idle')
  },

  // --- Night machine ------------------------------------------------------

  ReturnToBase(u, ctx, dt) {
    if (
      !moveToward(
        ctx,
        u,
        gerX(ctx) + ((u.id % 3) - 1) * 26,
        def(ctx).speed * 1.15,
        dt,
        8,
      )
    )
      return
    if (u.carrying > 0) {
      ctx.sys.economy.dropCoins(u.x, u.carrying, 'income')
      u.carrying = 0
    }
    go(u, 'FindDefensePosition', 'Returning')
  },

  FindDefensePosition(u, ctx) {
    ctx.sys.buildings.releaseTowerSlot(u)
    const side = pickSide(u, ctx)
    const tower = ctx.sys.buildings.claimTowerSlot(u, side)
    if (tower) {
      u.postSide = tower.side
    } else {
      u.postSide = side
      u.postX = groundPost(u, ctx, side)
    }
    go(u, 'MoveToPost', 'Moving')
  },

  MoveToPost(u, ctx, dt) {
    if (u.postBuildingId !== null) {
      const tower = findById(ctx.state.buildings, u.postBuildingId)
      if (!tower || !isBuildingStanding(tower))
        return go(u, 'FindDefensePosition', 'Returning')
    }
    if (moveToward(ctx, u, u.postX, def(ctx).speed * 1.15, dt, 4))
      go(u, 'FindEnemy', 'Defending')
  },

  FindEnemy(u, ctx, dt) {
    if (u.cooldown > 0) u.cooldown -= dt
    if (u.postBuildingId !== null) {
      const tower = findById(ctx.state.buildings, u.postBuildingId)
      if (!tower || !isBuildingStanding(tower))
        return go(u, 'FindDefensePosition', 'Returning')
    } else if (u.timer > 2.5) {
      // Walls may have been built or destroyed: keep the post current.
      u.timer = 0
      const inRange = nearestEnemy(u, ctx, effectiveRange(u, ctx))
      if (!inRange && pickSide(u, ctx) !== u.postSide)
        return go(u, 'FindDefensePosition', 'Returning')
      const post = groundPost(u, ctx, u.postSide)
      if (Math.abs(post - u.postX) > 20) {
        u.postX = post
        return go(u, 'MoveToPost', 'Moving')
      }
    }
    const enemy = nearestEnemy(u, ctx, effectiveRange(u, ctx))
    if (enemy) {
      u.target = { kind: 'enemy', id: enemy.id }
      go(u, 'Attack', 'Fighting')
    }
  },

  HuntAttack(u, ctx, dt) {
    if (u.cooldown > 0) u.cooldown -= dt
    huntAttack(u, ctx)
  },

  Attack(u, ctx, dt) {
    if (u.cooldown > 0) u.cooldown -= dt
    nightAttack(u, ctx)
  },

  Dead() {},
}

function nightAttack(u: Citizen, ctx: GameContext): void {
  const t = resolveTarget(ctx.state, u.target)
  if (
    !t ||
    t.kind !== 'enemy' ||
    Math.abs(t.entity.x - u.x) > effectiveRange(u, ctx) + 20
  ) {
    u.target = null
    return go(u, 'FindEnemy', 'Defending')
  }
  faceToward(u, t.entity.x)
  if (u.cooldown <= 0) shoot(u, ctx, 'enemy', t.entity.id)
}

function huntAttack(u: Citizen, ctx: GameContext): void {
  const animal = findById(ctx.state.animals, u.target?.id)
  if (!animal) return go(u, 'Idle', 'Idle')
  if (!isAlive(animal)) return go(u, 'CollectReward', 'Moving')
  if (Math.abs(animal.x - u.x) > def(ctx).range)
    return go(u, 'MoveToTarget', 'Moving')
  faceToward(u, animal.x)
  if (u.cooldown <= 0) shoot(u, ctx, 'animal', animal.id)
}

/**
 * Phase overrides: dusk sends every archer to defend, dawn releases them.
 * Runs before the per-node logic each frame.
 */
export function archerPhaseControl(u: Citizen, ctx: GameContext): void {
  const dusk = isDusk(ctx)
  if (dusk && !NIGHT_BRAINS.has(u.brain)) {
    releaseHunt(u, ctx)
    go(u, 'ReturnToBase', 'Returning')
  } else if (!dusk && NIGHT_BRAINS.has(u.brain)) {
    ctx.sys.buildings.releaseTowerSlot(u)
    u.target = null
    go(u, 'Idle', 'Idle')
  }
}

function releaseHunt(u: Citizen, ctx: GameContext): void {
  const animal = findById(ctx.state.animals, u.target?.id)
  if (animal && animal.claimedBy === u.id) animal.claimedBy = null
  u.target = null
}
