import { go } from '../ai/stateMachine'
import type { EnemyDef } from '../config'
import type { EnemyApi, GameContext, System } from '../core/context'
import { isAlive, newId } from '../core/lookup'
import type { Side } from '../core/types'

/** Spawns enemies from definitions; combat behaviour is in ai/enemy.ts. */
export class EnemySystem implements System, EnemyApi {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase }) => {
      if (phase === 'Sunrise') this.retreatAll()
    })
  }

  update(): void {}

  spawn(type: string, side: Side): void {
    const { state, config, rng, bus } = this.ctx
    const def = config.enemies[type] as EnemyDef | undefined
    if (!def) return
    const id = newId(state)
    state.enemies.push({
      id,
      type,
      health: def.health,
      maxHealth: def.health,
      damage: def.damage,
      movementSpeed: def.movementSpeed,
      attackRange: def.attackRange,
      x: side * (config.world.spawnDistance + rng.range(0, 80)),
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
    })
    bus.emit('enemySpawned', { id, side })
  }

  /** Night is over: whoever is left withdraws (unless they hold the banner). */
  private retreatAll(): void {
    for (const e of this.ctx.state.enemies) {
      if (!isAlive(e) || e.carryingBanner) continue
      e.target = null
      go(e, 'Retreat', 'Fleeing')
    }
  }
}
