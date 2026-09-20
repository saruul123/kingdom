import type { GameContext } from '../core/context'
import { clamp, sideOf } from '../core/math'
import type { Building, Side } from '../core/types'
import { isAlive } from '../core/lookup'

interface Mover {
  x: number
  facing: Side
}

/** Step towards `tx`; returns true once within `arrive` of it. */
export function moveToward(
  ctx: GameContext,
  u: Mover,
  tx: number,
  speed: number,
  dt: number,
  arrive = 3,
): boolean {
  const dx = tx - u.x
  if (Math.abs(dx) <= arrive) return true
  u.facing = sideOf(dx, u.facing)
  const step = Math.min(Math.abs(dx), speed * dt)
  const { minX, maxX } = ctx.config.world
  u.x = clamp(u.x + Math.sign(dx) * step, minX, maxX)
  return Math.abs(tx - u.x) <= arrive
}

export function faceToward(u: Mover, x: number): void {
  if (x !== u.x) u.facing = sideOf(x - u.x, u.facing)
}

/** Where a friendly unit stands to work on a building (inside the wall line). */
export function workSpot(ctx: GameContext, b: Building): number {
  const hw = ctx.sys.buildings.halfWidth(b)
  const inner = b.x === 0 ? 1 : b.x > 0 ? -1 : 1
  return b.x + inner * (hw + 16)
}

/** Distance from the nearest living enemy to x (Infinity when none). */
export function nearestEnemyDistance(ctx: GameContext, x: number): number {
  let best = Infinity
  for (const e of ctx.state.enemies) {
    if (!isAlive(e)) continue
    best = Math.min(best, Math.abs(e.x - x))
  }
  return best
}

export const isNight = (ctx: GameContext) => ctx.state.currentPhase === 'Night'
export const isDusk = (ctx: GameContext) =>
  ctx.state.currentPhase === 'Sunset' || ctx.state.currentPhase === 'Night'

export function gerX(ctx: GameContext): number {
  return ctx.sys.buildings.ger()?.x ?? 0
}
