import type { GameContext } from '../core/context'
import { findById, isBuildingStanding } from '../core/lookup'
import type { Citizen } from '../core/types'
import { gerX, isDusk, moveToward } from './helpers'
import { go } from './stateMachine'
import type { Nodes } from './stateMachine'

const def = (ctx: GameContext) => ctx.config.professions.herder

function pastureStanding(u: Citizen, ctx: GameContext): boolean {
  const p = findById(ctx.state.buildings, u.postBuildingId)
  return !!p && isBuildingStanding(p)
}

/**
 * Herder: Idle → FindPasture → GoToPasture → Herd (a coin every few seconds)
 * … and home to the ger at dusk. The coins land at the pasture for the hero to collect.
 */
export const herderNodes: Nodes<Citizen> = {
  Idle(u) {
    if (u.timer >= 0.4) go(u, 'FindPasture', 'Idle')
  },

  FindPasture(u, ctx) {
    ctx.sys.buildings.releaseTowerSlot(u)
    if (ctx.sys.buildings.claimPastureSlot(u)) go(u, 'GoToPasture', 'Moving')
    else go(u, 'Wait', 'Idle')
  },

  /** No pasture with room: wait by the ger and look again. */
  Wait(u, ctx, dt) {
    moveToward(
      ctx,
      u,
      gerX(ctx) + (u.id % 2 === 0 ? -1 : 1) * (70 + (u.id % 3) * 14),
      def(ctx).speed * 0.7,
      dt,
      4,
    )
    if (u.timer > 3) go(u, 'FindPasture', 'Idle')
  },

  GoToPasture(u, ctx, dt) {
    if (!pastureStanding(u, ctx)) return go(u, 'FindPasture', 'Idle')
    if (moveToward(ctx, u, u.postX, def(ctx).speed, dt, 4))
      go(u, 'Herd', 'Working')
  },

  Herd(u, ctx) {
    if (!pastureStanding(u, ctx)) return go(u, 'FindPasture', 'Idle')
    if (u.timer < def(ctx).incomeInterval) return
    u.timer = 0
    ctx.sys.economy.dropCoins(
      u.postX + ((u.id % 3) - 1) * 12,
      def(ctx).income,
      'income',
    )
  },

  ReturnHome(u, ctx, dt) {
    if (
      moveToward(
        ctx,
        u,
        gerX(ctx) + (u.id % 2 === 0 ? -1 : 1) * (36 + (u.id % 3) * 10),
        def(ctx).speed * 1.2,
        dt,
        4,
      )
    )
      go(u, 'Shelter', 'Idle')
  },

  Shelter() {},

  Dead() {},
}

/** Dusk sends herders home; dawn sends them back to work. */
export function herderPhaseControl(u: Citizen, ctx: GameContext): void {
  const inside = u.brain === 'ReturnHome' || u.brain === 'Shelter'
  if (isDusk(ctx) && !inside) {
    ctx.sys.buildings.releaseTowerSlot(u)
    go(u, 'ReturnHome', 'Returning')
  } else if (!isDusk(ctx) && inside) {
    go(u, 'Idle', 'Idle')
  }
}
