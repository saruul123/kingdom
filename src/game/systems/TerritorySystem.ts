import type { GameContext, System, TerritoryApi } from '../core/context'
import { findById } from '../core/lookup'
import type { Side } from '../core/types'
import { mn } from '../i18n'

/** Tracks which part of the steppe belongs to the player's kingdom. */
export class TerritorySystem implements System, TerritoryApi {
  constructor(private ctx: GameContext) {
    ctx.bus.on('buildingCompleted', ({ id, type }) => {
      if (type === 'outpost') this.claim(id)
    })
    ctx.bus.on('buildingDestroyed', ({ id, type }) => {
      if (type !== 'outpost') return
      const { state } = this.ctx
      state.controlledTerritories = state.controlledTerritories.filter(
        (t) => t.id !== `outpost:${id}`,
      )
    })
  }

  update(): void {}

  /** A finished outpost pushes the border out and opens new places to build. */
  private claim(buildingId: number): void {
    const { state, config, bus } = this.ctx
    const b = findById(state.buildings, buildingId)
    if (!b) return
    const radius = config.content.enemyCamps.territoryRadius
    state.controlledTerritories.push({ id: `outpost:${b.id}`, x: b.x, radius })
    state.extraBuildPoints.push({
      id: `pasture@${b.id}`,
      building: 'pasture',
      x: b.x + (b.x < 0 ? -80 : 80),
      requires: null,
    })
    bus.emit('territoryExpanded', { x: b.x, radius })
    bus.emit('toast', { text: mn.territoryExpanded, kind: 'good' })
  }

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
