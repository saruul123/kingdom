import type { ConstructionApi, GameContext, System } from '../core/context'
import type { Building } from '../core/types'
import { mn } from '../i18n'

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

  /** Builder work on a paid-for upgrade; finishing it raises the building a level. */
  upgrade(b: Building, seconds: number): void {
    if (!b.upgrading) return
    const up = this.ctx.config.buildings[b.type].upgrades.at(b.level - 1)
    if (!up) {
      b.upgrading = false
      return
    }
    b.upgradeProgress = Math.min(1, b.upgradeProgress + seconds / up.buildWork)
    if (b.upgradeProgress < 1) return
    b.level++
    b.maxHealth = up.maxHealth
    b.health = up.maxHealth
    b.state = 'Active'
    b.upgrading = false
    b.upgradeProgress = 0
    const { bus } = this.ctx
    bus.emit('buildingUpgraded', { id: b.id, type: b.type, level: b.level })
    if (b.type === 'ger') {
      this.ctx.state.kingdomLevel = b.level
      this.ctx.state.era = b.level
      bus.emit('eraChanged', { era: b.level })
      bus.emit('toast', {
        text: mn.eraReached(mn.eraName(b.level)),
        kind: 'good',
      })
    }
    bus.emit('toast', { text: mn.upgradeDone(up.label), kind: 'good' })
    bus.emit('sfx', { name: 'build' })
  }

  repair(b: Building, hp: number): void {
    if (b.state !== 'Damaged' && b.state !== 'Active') return
    b.health = Math.min(b.maxHealth, b.health + hp)
    if (b.health >= b.maxHealth) b.state = 'Active'
    else b.state = 'Damaged'
  }
}
