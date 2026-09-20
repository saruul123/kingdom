import type { GameContext } from '../core/context'
import { findById, isBuildingStanding } from '../core/lookup'
import type { Citizen } from '../core/types'
import { gerX, isDusk, moveToward } from './helpers'
import { go } from './stateMachine'
import type { Nodes } from './stateMachine'

const def = (ctx: GameContext) => ctx.config.professions.trader

/**
 * Places worth a trip: neutral camps and finished outposts that lie inside
 * (or just beyond) the kingdom's borders. Push the border out and longer,
 * richer routes open up.
 */
export function tradePoints(ctx: GameContext): number[] {
  const { state, sys } = ctx
  const reach = (x: number) =>
    Math.abs(sys.territory.edge(x < 0 ? -1 : 1)) + 400
  const points = state.camps
    .map((c) => c.x)
    .filter((x) => Math.abs(x) <= reach(x))
  for (const b of state.buildings) {
    if (b.type === 'outpost' && isBuildingStanding(b)) points.push(b.x)
  }
  return points
}

function marketOf(u: Citizen, ctx: GameContext) {
  const m = findById(ctx.state.buildings, u.postBuildingId)
  return m && isBuildingStanding(m) ? m : undefined
}

/**
 * Trader: Idle → PickRoute → GoToPoint → Trade → ReturnToMarket (pays out) → Idle.
 * A longer route pays more, but leaves the trader in the open for longer.
 */
export const traderNodes: Nodes<Citizen> = {
  Idle(u) {
    if (u.timer >= 0.5) go(u, 'PickRoute', 'Idle')
  },

  PickRoute(u, ctx) {
    let market = marketOf(u, ctx)
    if (!market) {
      ctx.sys.buildings.releaseTowerSlot(u)
      market = ctx.sys.buildings.claimMarketSlot(u)
    }
    if (!market) return go(u, 'Wait', 'Idle')
    const far = tradePoints(ctx)
      .map((x) => ({ x, d: Math.abs(x - market.x) }))
      .filter((p) => p.d >= 150)
      .sort((a, b) => b.d - a.d)
      .at(0)
    if (!far) return go(u, 'Wait', 'Idle')
    u.homeX = far.x
    u.carrying = 0
    go(u, 'GoToPoint', 'Moving')
  },

  Wait(u, ctx, dt) {
    moveToward(
      ctx,
      u,
      gerX(ctx) + (u.id % 2 === 0 ? -1 : 1) * (90 + (u.id % 3) * 12),
      def(ctx).speed,
      dt,
      4,
    )
    if (u.timer > 3) go(u, 'PickRoute', 'Idle')
  },

  GoToPoint(u, ctx, dt) {
    if (!marketOf(u, ctx)) return go(u, 'PickRoute', 'Idle')
    if (moveToward(ctx, u, u.homeX, def(ctx).speed, dt, 8))
      go(u, 'Trade', 'Working')
  },

  Trade(u, ctx) {
    const d = def(ctx)
    if (u.timer < d.waitTime) return
    const dist = Math.abs(u.homeX - u.postX)
    u.carrying = Math.max(
      1,
      Math.round(d.rewardBase + (d.rewardPer100 * dist) / 100),
    )
    go(u, 'ReturnToMarket', 'Returning')
  },

  ReturnToMarket(u, ctx, dt) {
    const market = marketOf(u, ctx)
    const homeX = market?.x ?? gerX(ctx)
    if (!moveToward(ctx, u, homeX, def(ctx).speed * 1.1, dt, 8)) return
    if (u.carrying > 0 && market) {
      ctx.sys.economy.dropCoins(market.x, u.carrying, 'income')
      ctx.bus.emit('float', {
        x: market.x,
        text: `+${u.carrying}`,
        kind: 'gain',
      })
    }
    u.carrying = 0
    go(u, isDusk(ctx) ? 'Shelter' : 'Idle', isDusk(ctx) ? 'Idle' : 'Idle')
  },

  Shelter() {},

  Dead() {},
}

/** Dusk brings traders home (paying out what they carry); dawn sends them out again. */
export function traderPhaseControl(u: Citizen, ctx: GameContext): void {
  const inside = u.brain === 'ReturnToMarket' || u.brain === 'Shelter'
  if (isDusk(ctx) && !inside) go(u, 'ReturnToMarket', 'Returning')
  else if (!isDusk(ctx) && u.brain === 'Shelter') go(u, 'Idle', 'Idle')
}
