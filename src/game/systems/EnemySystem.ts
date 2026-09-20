import { go } from '../ai/stateMachine'
import type { EnemyDef } from '../config'
import type { EnemyApi, GameContext, System } from '../core/context'
import { isAlive, newId } from '../core/lookup'
import type { Enemy, EnemyCamp, Side } from '../core/types'

/** Spawns enemies from definitions; combat behaviour is in ai/enemy.ts. */
export class EnemySystem implements System, EnemyApi {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase }) => {
      if (phase === 'Sunrise') this.retreatAll()
    })
  }

  update(): void {}

  spawn(type: string, side: Side, atX?: number): Enemy | undefined {
    const { state, config, rng, bus } = this.ctx
    const def = config.enemies[type] as EnemyDef | undefined
    if (!def) return undefined
    const id = newId(state)
    const health = Math.max(
      1,
      Math.round(def.health * config.difficulty[state.difficulty].enemyHealth),
    )
    const enemy: Enemy = {
      id,
      type,
      health,
      maxHealth: health,
      damage: def.damage,
      movementSpeed: def.movementSpeed,
      attackRange: def.attackRange,
      x: atX ?? side * (config.world.spawnDistance + rng.range(0, 80)),
      facing: (side * -1) as Side,
      side,
      state: 'Moving',
      brain: 'FindTarget',
      target: null,
      cooldown: def.attackCooldown * rng.next(),
      timer: 0,
      retargetIn: 0,
      carryingBanner: false,
      deadTimer: 0,
      hitFlash: 0,
      campId: null,
    }
    state.enemies.push(enemy)
    bus.emit('enemySpawned', { id, side })
    return enemy
  }

  /** A camp's guard: stays home until an intruder appears. */
  spawnGuard(camp: EnemyCamp): void {
    const { rng } = this.ctx
    const guard = this.spawn(
      'bandit',
      camp.x < 0 ? -1 : 1,
      camp.x + rng.range(-60, 60),
    )
    if (!guard) return
    guard.campId = camp.id
    guard.brain = 'Guard'
    guard.state = 'Idle'
  }

  /** Night is over: whoever is left withdraws (unless they hold the banner). */
  private retreatAll(): void {
    for (const e of this.ctx.state.enemies) {
      if (!isAlive(e) || e.carryingBanner || e.campId !== null) continue
      e.target = null
      go(e, 'Retreat', 'Fleeing')
    }
  }
}
