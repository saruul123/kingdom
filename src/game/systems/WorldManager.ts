import type { GameContext, System } from '../core/context'
import { newId } from '../core/lookup'
import { createBuilding } from './BuildingSystem'
import type { Camp, EnemyCamp } from '../core/types'

/** Generates the steppe (camps, treasure, landmarks) and refreshes it every dawn. */
export class WorldManager implements System {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase }) => {
      if (phase === 'Sunrise') this.respawnCaches()
    })
  }

  update(): void {}

  generate(): void {
    const { state, config, rng, sys } = this.ctx
    const content = config.content

    state.buildings.push(createBuilding(this.ctx, 'ger', 0, null, true))

    for (const side of [-1, 1] as const) {
      let x = content.camps.minX + rng.range(0, 100)
      while (x <= content.camps.maxX) {
        const camp: Camp = {
          id: newId(state),
          x: side * x,
          capacity: rng.int(
            content.camps.capacity[0],
            content.camps.capacity[1],
          ),
        }
        state.camps.push(camp)
        for (let i = 0; i < camp.capacity; i++) sys.citizens.spawnNeutral(camp)
        x += rng.range(content.camps.spacing[0], content.camps.spacing[1])
      }
    }

    const ec = content.enemyCamps
    for (const side of [-1, 1] as const) {
      const placed: number[] = []
      for (let i = 0; i < ec.perSide; i++) {
        for (let attempt = 0; attempt < 20; attempt++) {
          const x = rng.range(ec.minX, ec.maxX)
          if (placed.some((p) => Math.abs(p - x) < ec.minSpacing)) continue
          placed.push(x)
          const camp: EnemyCamp = {
            id: newId(state),
            x: side * x,
            health: ec.health,
            maxHealth: ec.health,
            spawnTimer: ec.spawnInterval * rng.next(),
            cleared: false,
          }
          state.enemyCamps.push(camp)
          for (let g = 0; g < ec.maxGuards; g++) sys.enemies.spawnGuard(camp)
          break
        }
      }
    }

    for (const c of content.caches.initial) this.addCache(c.x, c.amount)
    for (let i = 0; i < content.caches.count; i++) this.randomCache()

    for (let i = 0; i < content.ovoos.count; i++) {
      const side = rng.sign()
      state.ovoos.push({
        x: side * rng.range(content.ovoos.minX, content.ovoos.maxX),
        usedDay: -1,
      })
    }
    for (let i = 0; i < content.wells.count; i++)
      state.wells.push({
        x: rng.sign() * rng.range(content.wells.minX, content.wells.maxX),
        usedDay: -1,
      })
    for (let i = 0; i < content.ruins.count; i++)
      state.ruins.push({
        x: rng.sign() * rng.range(content.ruins.minX, content.ruins.maxX),
        looted: false,
      })
  }

  private addCache(x: number, amount: number): void {
    const { state } = this.ctx
    state.coinPickups.push({
      id: newId(state),
      x,
      amount,
      delay: 0,
      origin: 'cache',
    })
  }

  /** Treasure grows with distance from home: more reward, more risk. */
  private randomCache(minX?: number): void {
    const { config, rng } = this.ctx
    const c = config.content.caches
    const x = rng.sign() * rng.range(minX ?? c.minX, c.maxX)
    const amount = Math.max(
      1,
      Math.round(
        c.baseAmount + Math.abs(x) * c.amountPerDistance + rng.range(-0.5, 0.5),
      ),
    )
    this.addCache(x, amount)
  }

  private respawnCaches(): void {
    const { state, config } = this.ctx
    const c = config.content.caches
    const remaining = state.coinPickups.filter(
      (p) => p.origin === 'cache',
    ).length
    for (let i = 0; i < c.respawnPerDay && remaining + i < c.count; i++)
      this.randomCache(c.respawnMinX)
  }
}
