import type { GameContext, System } from '../core/context'
import { isAlive, newId } from '../core/lookup'
import { clamp, sideOf } from '../core/math'
import type { Animal, Side } from '../core/types'

type AnimalType = Animal['type']

/** Rabbits and deer: wander, and run from archers. Hunters cash them in. */
export class WildlifeSystem implements System {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase }) => {
      if (phase === 'Sunrise') this.respawnDaily()
    })
  }

  /** Initial population for a new game. */
  populate(): void {
    for (const side of [-1, 1] as Side[]) {
      for (const type of ['rabbit', 'deer'] as AnimalType[]) {
        const n = this.ctx.config.content.wildlife[type].perSide
        for (let i = 0; i < n; i++) this.spawn(type, side)
      }
    }
  }

  private count(type: AnimalType, side: Side): number {
    return this.ctx.state.animals.filter(
      (a) => a.type === type && isAlive(a) && sideOf(a.x) === side,
    ).length
  }

  private spawn(type: AnimalType, side: Side): void {
    const { state, config, rng } = this.ctx
    const w = config.content.wildlife
    const def = w[type]
    const x = side * rng.range(w.minX, w.maxX)
    state.animals.push({
      id: newId(state),
      type,
      x,
      facing: rng.sign(),
      health: def.health,
      state: 'Idle',
      timer: rng.range(0, 3),
      targetX: x,
      reward: def.reward,
      claimedBy: null,
      deadTimer: 0,
    })
  }

  private respawnDaily(): void {
    const { config, rng } = this.ctx
    const w = config.content.wildlife
    for (let i = 0; i < w.respawnPerDay; i++) {
      const type: AnimalType = rng.chance(0.65) ? 'rabbit' : 'deer'
      const side = rng.sign()
      if (this.count(type, side) < w[type].perSide) this.spawn(type, side)
    }
  }

  update(dt: number): void {
    const { state, config, rng } = this.ctx
    const w = config.content.wildlife
    for (const a of state.animals) {
      if (!isAlive(a)) continue
      const def = w[a.type]
      a.timer += dt

      let threat: number | null = null
      let threatD = def.fleeRange
      for (const c of state.citizens) {
        if (c.owner !== 'player' || c.profession !== 'Archer' || !isAlive(c))
          continue
        const d = Math.abs(c.x - a.x)
        if (d < threatD) {
          threatD = d
          threat = c.x
        }
      }
      if (Math.abs(state.hero.x - a.x) < def.fleeRange * 0.6)
        threat = state.hero.x

      if (threat !== null || a.state === 'Fleeing') {
        if (threat !== null) {
          a.state = 'Fleeing'
          a.timer = 0
          a.facing = threat < a.x ? 1 : -1
        } else if (a.timer > 1.5) {
          a.state = 'Idle'
          a.timer = 0
        }
        a.x += a.facing * def.fleeSpeed * dt
      } else if (a.state === 'Moving') {
        const dx = a.targetX - a.x
        if (Math.abs(dx) < 3) {
          a.state = 'Idle'
          a.timer = 0
        } else {
          a.facing = sideOf(dx)
          a.x += a.facing * Math.min(Math.abs(dx), def.speed * dt)
        }
      } else if (a.timer > 2 + rng.next() * 3) {
        a.timer = 0
        a.targetX = a.x + rng.range(-90, 90)
        a.state = 'Moving'
      }

      // Stay in the hunting grounds on their side of the settlement.
      const side = sideOf(a.x)
      const ax = clamp(Math.abs(a.x), w.minX - 60, w.maxX + 100)
      if (ax !== Math.abs(a.x)) {
        a.x = side * ax
        if (a.state === 'Fleeing') a.facing = (side * -1) as Side
      }
    }
  }
}
