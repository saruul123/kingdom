import type { GameContext } from '../core/context'
import { findById, isAlive } from '../core/lookup'
import type { Citizen, Enemy } from '../core/types'
import { faceToward, gerX, isDusk, moveToward } from './helpers'
import { go } from './stateMachine'
import type { Nodes } from './stateMachine'

const def = (ctx: GameContext) => ctx.config.professions.horseman

/** Nearest live raider (camp guards stay out of it) within `range` of the horseman. */
function nearestRaider(
  u: Citizen,
  ctx: GameContext,
  range: number,
): Enemy | undefined {
  let best: Enemy | undefined
  let bestD = range
  for (const e of ctx.state.enemies) {
    if (!isAlive(e) || e.campId !== null) continue
    const d = Math.abs(e.x - u.x)
    if (d <= bestD) {
      bestD = d
      best = e
    }
  }
  return best
}

/**
 * Horseman: Patrol the settlement, charge any raider that comes near,
 * strike, then back to patrol. Fast, so the weak spot of the day gets covered.
 */
export const horsemanNodes: Nodes<Citizen> = {
  Idle(u) {
    if (u.timer >= 0.5) go(u, 'Patrol', 'Idle')
  },

  Patrol(u, ctx, dt) {
    const d = def(ctx)
    const enemy = nearestRaider(u, ctx, d.aggroRange)
    if (enemy) {
      u.target = { kind: 'enemy', id: enemy.id }
      return go(u, 'Charge', 'Moving')
    }
    // ride a lap between random spots; at dusk stay close to the ger
    const radius = isDusk(ctx) ? 320 : d.patrolRadius
    if (u.state !== 'Moving' && u.timer > 2) {
      u.postX = gerX(ctx) + (ctx.rng.next() * 2 - 1) * radius
      u.state = 'Moving'
      u.timer = 0
    }
    if (
      u.state === 'Moving' &&
      moveToward(ctx, u, u.postX, d.speed * 0.6, dt, 6)
    ) {
      u.state = 'Idle'
      u.timer = 0
    }
  },

  Charge(u, ctx, dt) {
    const enemy = findById(ctx.state.enemies, u.target?.id)
    if (!enemy || !isAlive(enemy)) return go(u, 'Patrol', 'Idle')
    const d = def(ctx)
    if (moveToward(ctx, u, enemy.x, d.speed, dt, d.range * 0.8)) {
      go(u, 'Strike', 'Fighting')
      u.cooldown = 0
    }
  },

  Strike(u, ctx, dt) {
    if (u.cooldown > 0) u.cooldown -= dt
    const enemy = findById(ctx.state.enemies, u.target?.id)
    if (!enemy || !isAlive(enemy)) return go(u, 'Patrol', 'Idle')
    const d = def(ctx)
    if (Math.abs(enemy.x - u.x) > d.range + 8) return go(u, 'Charge', 'Moving')
    faceToward(u, enemy.x)
    if (u.cooldown > 0) return
    u.cooldown = d.cooldown
    ctx.sys.damage.damageEnemy(enemy.id, d.damage, u.id)
  },

  Dead() {},
}
