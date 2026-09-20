import type {
  BuildingApi,
  GameContext,
  Interaction,
  InteractionProvider,
  System,
} from '../core/context'
import { findById, isAlive, isBuildingStanding, newId } from '../core/lookup'
import type { Building, BuildingType, Citizen, Side } from '../core/types'
import { mn } from '../i18n'

export function createBuilding(
  ctx: GameContext,
  type: BuildingType,
  x: number,
  buildPointId: string | null,
  complete: boolean,
): Building {
  const def = ctx.config.buildings[type]
  return {
    id: newId(ctx.state),
    type,
    level: 1,
    x,
    side: x < 0 ? -1 : 1,
    health: complete ? def.maxHealth : 0,
    maxHealth: def.maxHealth,
    constructionProgress: complete ? 1 : 0,
    state: complete ? 'Active' : 'Planned',
    buildPointId,
    occupants: [],
    upgrading: false,
    upgradeProgress: 0,
    hitFlash: 0,
  }
}

/** Build points, ordering construction, defenses queries and tower garrison slots. */
export class BuildingSystem
  implements System, BuildingApi, InteractionProvider
{
  constructor(private ctx: GameContext) {}

  update(): void {
    const { state, bus } = this.ctx
    // Drop destroyed buildings so their build point can be used again.
    for (const b of state.buildings) {
      if (b.state !== 'Destroyed') continue
      for (const id of b.occupants) {
        const c = findById(state.citizens, id)
        if (c) c.postBuildingId = null
      }
      b.occupants = []
    }
    const before = state.buildings.length
    state.buildings = state.buildings.filter((b) => b.state !== 'Destroyed')
    if (state.buildings.length !== before) {
      bus.emit('toast', {
        text: mn.structureDestroyed,
        kind: 'danger',
      })
    }
    // Drop stale garrison entries.
    for (const b of state.buildings) {
      b.occupants = b.occupants.filter((id) => {
        const c = findById(state.citizens, id)
        return c && isAlive(c) && c.postBuildingId === b.id
      })
    }
  }

  gatherInteractions(out: Interaction[]): void {
    const { config, state } = this.ctx
    for (const point of config.content.buildPoints) {
      if (state.buildings.some((b) => b.buildPointId === point.id)) continue
      if (point.requires) {
        const req = state.buildings.find(
          (b) => b.buildPointId === point.requires,
        )
        if (!req || !isBuildingStanding(req)) continue
      }
      const def = config.buildings[point.building]
      out.push({
        id: `build:${point.id}`,
        x: point.x,
        radius: 40,
        label: mn.build(def.label),
        cost: def.cost,
        enabled: true,
        execute: () => this.orderBuild(point.id),
      })
    }
    for (const b of state.buildings) {
      if (!isBuildingStanding(b) || b.upgrading) continue
      const up = this.nextUpgrade(b)
      if (!up) continue
      out.push({
        id: `upgrade:${b.id}`,
        x: b.x,
        radius: 40,
        label: mn.upgrade(up.label),
        cost: up.cost,
        enabled: true,
        execute: () => this.orderUpgrade(b.id),
      })
    }
  }

  private nextUpgrade(b: Building) {
    return this.ctx.config.buildings[b.type].upgrades.at(b.level - 1)
  }

  private orderUpgrade(id: number): void {
    const { state, bus, sys } = this.ctx
    const b = findById(state.buildings, id)
    if (!b || !isBuildingStanding(b) || b.upgrading) return
    const up = this.nextUpgrade(b)
    if (!up || !sys.economy.trySpend(up.cost)) return
    b.upgrading = true
    b.upgradeProgress = 0
    bus.emit('toast', { text: mn.upgradeOrdered, kind: 'info' })
  }

  private orderBuild(pointId: string): void {
    const { config, state, bus, sys } = this.ctx
    const point = config.content.buildPoints.find((p) => p.id === pointId)
    if (!point || state.buildings.some((b) => b.buildPointId === pointId))
      return
    const def = config.buildings[point.building]
    if (!sys.economy.trySpend(def.cost)) return
    const b = createBuilding(
      this.ctx,
      point.building as BuildingType,
      point.x,
      pointId,
      false,
    )
    state.buildings.push(b)
    bus.emit('buildingOrdered', { id: b.id, type: b.type })
  }

  defenses(): Building[] {
    const { config, state } = this.ctx
    return state.buildings.filter((b) => {
      if (!isBuildingStanding(b)) return false
      const cat = config.buildings[b.type].category
      return cat === 'wall' || cat === 'tower' || cat === 'gate'
    })
  }

  blockingWalls(): Building[] {
    const { config, state } = this.ctx
    return state.buildings.filter(
      (b) => isBuildingStanding(b) && config.buildings[b.type].blocksEnemies,
    )
  }

  heightOf(b: Building): number {
    return this.ctx.config.buildings[b.type].height
  }

  halfWidth(b: Building): number {
    return this.ctx.config.buildings[b.type].width / 2
  }

  /** Archer slots: the level's override if it has one, else the base capacity. */
  archerCapacity(b: Building): number {
    const def = this.ctx.config.buildings[b.type]
    let capacity = def.archerCapacity
    for (const up of def.upgrades.slice(0, b.level - 1)) {
      capacity = up.archerCapacity ?? capacity
    }
    return capacity
  }

  extraRange(b: Building): number {
    const def = this.ctx.config.buildings[b.type]
    return def.upgrades
      .slice(0, b.level - 1)
      .reduce((sum, up) => sum + (up.rangeBonus ?? 0), 0)
  }

  ger(): Building | undefined {
    return this.ctx.state.buildings.find((b) => b.type === 'ger')
  }

  claimTowerSlot(archer: Citizen, preferredSide: Side): Building | undefined {
    const { state } = this.ctx
    const free = state.buildings.filter(
      (b) =>
        isBuildingStanding(b) && b.occupants.length < this.archerCapacity(b),
    )
    if (free.length === 0) return undefined
    const pool = free.filter((b) => b.side === preferredSide)
    const list = pool.length > 0 ? pool : free
    list.sort((a, b) => Math.abs(a.x - archer.x) - Math.abs(b.x - archer.x))
    const tower = list[0]
    const slot = tower.occupants.length
    tower.occupants.push(archer.id)
    archer.postBuildingId = tower.id
    archer.postX = tower.x + ([-8, 8, 0][slot] ?? 0)
    archer.postSide = tower.side
    return tower
  }

  releaseTowerSlot(archer: Citizen): void {
    const tower = findById(this.ctx.state.buildings, archer.postBuildingId)
    if (tower)
      tower.occupants = tower.occupants.filter((id) => id !== archer.id)
    archer.postBuildingId = null
  }
}
