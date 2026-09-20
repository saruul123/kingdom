import type { GameContext, System, TerritoryApi } from '../core/context'
import type { Side } from '../core/types'

/** Tracks which part of the steppe belongs to the player's kingdom. */
export class TerritorySystem implements System, TerritoryApi {
  constructor(private ctx: GameContext) {}

  update(): void {}

  contains(x: number): boolean {
    return this.ctx.state.controlledTerritories.some(
      (t) => Math.abs(x - t.x) <= t.radius,
    )
  }

  /** Outermost controlled x on the given side of the settlement. */
  edge(side: Side): number {
    let best = 0
    for (const t of this.ctx.state.controlledTerritories) {
      const e = t.x + side * t.radius
      if (side * e > side * best) best = e
    }
    return best
  }
}
