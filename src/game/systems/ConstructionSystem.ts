import type { ConstructionApi, GameContext, System } from '../core/context'
import type { Building } from '../core/types'

/** Applies builder work: finishing construction and repairing damage. */
export class ConstructionSystem implements System, ConstructionApi {
  constructor(private ctx: GameContext) {}

  update(): void {}

  work(b: Building, seconds: number): void {
    if (b.state !== 'Planned' && b.state !== 'UnderConstruction') return
    const def = this.ctx.config.buildings[b.type]
    b.state = 'UnderConstruction'
    b.constructionProgress = Math.min(
      1,
      b.constructionProgress + seconds / def.buildWork,
    )
    if (b.constructionProgress < 1) return
    b.state = 'Active'
    b.health = b.maxHealth
    this.ctx.bus.emit('buildingCompleted', { id: b.id, type: b.type })
    this.ctx.bus.emit('sfx', { name: 'build' })
  }

  repair(b: Building, hp: number): void {
    if (b.state !== 'Damaged' && b.state !== 'Active') return
    b.health = Math.min(b.maxHealth, b.health + hp)
    if (b.health >= b.maxHealth) b.state = 'Active'
    else b.state = 'Damaged'
  }
}
