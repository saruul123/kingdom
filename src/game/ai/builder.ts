import type { GameContext } from '../core/context'
import { findById, isAlive, isBuildingStanding } from '../core/lookup'
import type { Building, Citizen } from '../core/types'
import {
  gerX,
  isDusk,
  moveToward,
  nearestEnemyDistance,
  workSpot,
} from './helpers'
import { go } from './stateMachine'
import type { Nodes } from './stateMachine'

/** Enemies this close to the work spot make the builder pull back. */
const DANGER_RANGE = 45

function def(ctx: GameContext) {
  return ctx.config.professions.builder
}

function isDefense(ctx: GameContext, b: Building): boolean {
  const cat = ctx.config.buildings[b.type].category
  return cat === 'wall' || cat === 'tower' || cat === 'gate'
}

function builderCount(
  ctx: GameContext,
  buildingId: number,
  exceptId: number,
): number {
  return ctx.state.citizens.filter(
    (c) =>
      c.id !== exceptId &&
      isAlive(c) &&
      c.profession === 'Builder' &&
      c.target?.kind === 'building' &&
      c.target.id === buildingId,
  ).length
}

const ratio = (b: Building) => b.health / b.maxHealth

/**
 * Task priority: repair critical defenses → finish construction → upgrade
 * buildings → repair anything else.
 */
function pickTask(u: Citizen, ctx: GameContext): Building | undefined {
  const buildings = ctx.state.buildings
  const safe = (b: Building) =>
    nearestEnemyDistance(ctx, workSpot(ctx, b)) > DANGER_RANGE
  const byDistance = (a: Building, b: Building) =>
    Math.abs(a.x - u.x) - Math.abs(b.x - u.x)

  const critical = buildings
    .filter(
      (b) =>
        isBuildingStanding(b) &&
        isDefense(ctx, b) &&
        ratio(b) < def(ctx).criticalHealthRatio &&
        safe(b),
    )
    .sort((a, b) => ratio(a) - ratio(b))
  if (critical[0]) return critical[0]

  const construction = buildings
    .filter(
      (b) =>
        (b.state === 'Planned' || b.state === 'UnderConstruction') &&
        builderCount(ctx, b.id, u.id) < def(ctx).maxPerTask &&
        safe(b),
    )
    .sort(byDistance)
  if (construction[0]) return construction[0]

  const upgrades = buildings
    .filter(
      (b) =>
        isBuildingStanding(b) &&
        b.upgrading &&
        builderCount(ctx, b.id, u.id) < def(ctx).maxPerTask &&
        safe(b),
    )
    .sort(byDistance)
  if (upgrades[0]) return upgrades[0]

  const damaged = buildings
    .filter((b) => isBuildingStanding(b) && b.health < b.maxHealth && safe(b))
    .sort((a, b) => ratio(a) - ratio(b) || byDistance(a, b))
  return damaged[0]
}

export const builderNodes: Nodes<Citizen> = {
  Idle(u) {
    if (u.timer < 0.4) return
    go(u, 'FindTask', 'Idle')
  },

  FindTask(u, ctx) {
    const task = pickTask(u, ctx)
    if (!task) {
      go(u, 'Rest', 'Idle')
      return
    }
    u.target = { kind: 'building', id: task.id }
    go(u, 'MoveToTask', 'Moving')
  },

  /** Nothing to do: wait beside the ger (further in at night), then look again. */
  Rest(u, ctx, dt) {
    const home =
      gerX(ctx) +
      (u.id % 2 === 0 ? -1 : 1) * (isDusk(ctx) ? 32 : 60 + (u.id % 3) * 20)
    moveToward(ctx, u, home, def(ctx).speed * 0.7, dt, 4)
    if (u.timer > 1) go(u, 'FindTask', 'Idle')
  },

  MoveToTask(u, ctx, dt) {
    const b = findById(ctx.state.buildings, u.target?.id)
    if (!b || b.state === 'Destroyed') return go(u, 'Idle', 'Idle')
    if (nearestEnemyDistance(ctx, workSpot(ctx, b)) <= DANGER_RANGE)
      return go(u, 'Idle', 'Idle')
    if (!moveToward(ctx, u, workSpot(ctx, b), def(ctx).speed, dt, 4)) return
    const constructing =
      b.state === 'Planned' || b.state === 'UnderConstruction'
    go(
      u,
      constructing ? 'Build' : b.upgrading ? 'Upgrade' : 'Repair',
      'Working',
    )
  },

  Build(u, ctx, dt) {
    const b = findById(ctx.state.buildings, u.target?.id)
    if (!b || b.state === 'Destroyed') return go(u, 'Idle', 'Idle')
    if (nearestEnemyDistance(ctx, u.x) <= DANGER_RANGE)
      return go(u, 'Idle', 'Idle')
    ctx.sys.construction.work(b, dt * def(ctx).buildRate)
    // 'Complete': once the building is up, look for the next task.
    if (b.state !== 'UnderConstruction') go(u, 'Idle', 'Idle')
  },

  Upgrade(u, ctx, dt) {
    const b = findById(ctx.state.buildings, u.target?.id)
    if (!b || !isBuildingStanding(b) || !b.upgrading)
      return go(u, 'Idle', 'Idle')
    if (nearestEnemyDistance(ctx, u.x) <= DANGER_RANGE)
      return go(u, 'Idle', 'Idle')
    ctx.sys.construction.upgrade(b, dt * def(ctx).buildRate)
  },

  Repair(u, ctx, dt) {
    const b = findById(ctx.state.buildings, u.target?.id)
    if (!b || !isBuildingStanding(b)) return go(u, 'Idle', 'Idle')
    if (nearestEnemyDistance(ctx, u.x) <= DANGER_RANGE)
      return go(u, 'Idle', 'Idle')
    ctx.sys.construction.repair(b, dt * def(ctx).repairRate)
    if (b.health >= b.maxHealth) go(u, 'Idle', 'Idle')
  },

  Dead() {},
}
