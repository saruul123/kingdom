import type { GameContext } from '../core/context'
import { isAlive } from '../core/lookup'
import type { Citizen } from '../core/types'
import { gerX, isDusk, moveToward, nearestEnemyDistance } from './helpers'
import { go } from './stateMachine'
import type { Nodes } from './stateMachine'

/** Idle/wandering behaviour shared by neutral and unemployed citizens. */
function wander(
  u: Citizen,
  ctx: GameContext,
  dt: number,
  radius: number,
): void {
  if (u.timer > 2 + (u.id % 5) * 0.6) {
    u.timer = 0
    u.target = null
    u.postX = u.homeX + (ctx.rng.next() * 2 - 1) * radius
    u.state = 'Moving'
  }
  if (u.state === 'Moving') {
    if (moveToward(ctx, u, u.postX, ctx.config.citizen.speed * 0.5, dt))
      u.state = 'Idle'
  }
}

function enemyThreat(u: Citizen, ctx: GameContext): boolean {
  return nearestEnemyDistance(ctx, u.x) < ctx.config.citizen.fleeRange
}

export const citizenNodes: Nodes<Citizen> = {
  Idle(u, ctx, dt) {
    if (u.owner === 'neutral') {
      wander(u, ctx, dt, 40)
      return
    }
    if (u.pendingProfession) {
      go(u, 'GoToStand', 'Moving')
      return
    }
    if (enemyThreat(u, ctx)) {
      go(u, 'Flee', 'Fleeing')
      return
    }
    // Unemployed citizens stay close to the ger, and closer still at night.
    if (isDusk(ctx)) {
      u.homeX = gerX(ctx) + (u.id % 2 === 0 ? -1 : 1) * (30 + (u.id % 4) * 12)
    }
    wander(u, ctx, dt, isDusk(ctx) ? 15 : ctx.config.citizen.wanderRadius)
  },

  GoToSettlement(u, ctx, dt) {
    if (moveToward(ctx, u, u.homeX, ctx.config.citizen.speed, dt))
      go(u, 'Idle', 'Idle')
  },

  GoToStand(u, ctx, dt) {
    if (!u.pendingProfession) {
      go(u, 'Idle', 'Idle')
      return
    }
    if (!moveToward(ctx, u, u.postX, ctx.config.citizen.speed * 1.2, dt, 6))
      return
    const profession = u.pendingProfession
    const def =
      profession === 'Archer'
        ? ctx.config.professions.archer
        : ctx.config.professions.builder
    u.profession = profession
    u.pendingProfession = null
    u.maxHealth = def.health
    u.health = def.health
    ctx.bus.emit('professionAssigned', { id: u.id, profession })
    ctx.bus.emit('toast', {
      text: `A citizen became ${/^[aeiou]/i.test(def.label) ? 'an' : 'a'} ${def.label}.`,
      kind: 'good',
    })
    go(u, 'Idle', 'Idle')
  },

  Flee(u, ctx, dt) {
    if (!isAlive(u)) return
    const safeX = gerX(ctx) + (u.id % 2 === 0 ? -1 : 1) * 30
    moveToward(ctx, u, safeX, ctx.config.citizen.speed * 1.6, dt)
    if (u.timer > 1 && !enemyThreat(u, ctx)) go(u, 'Idle', 'Idle')
  },

  Dead() {},
}
