import type { CombatApi, GameContext, System } from '../core/context'
import { newId, resolveTarget } from '../core/lookup'
import type { Resolved } from '../core/lookup'

/** Arrow flight and hit resolution. Damage itself is applied by DamageSystem. */
export class CombatSystem implements System, CombatApi {
  constructor(private ctx: GameContext) {}

  fireArrow(args: Parameters<CombatApi['fireArrow']>[0]): void {
    const { state, bus } = this.ctx
    const target = resolveTarget(state, args.target)
    const [tx, ty] = target ? this.aimPoint(target) : [args.x, 0]
    const dist = Math.hypot(tx - args.x, ty - args.y)
    state.projectiles.push({
      id: newId(state),
      x: args.x,
      y: args.y,
      fromX: args.x,
      fromY: args.y,
      target: args.target,
      damage: args.damage,
      speed: args.speed,
      sourceId: args.sourceId,
      travelled: 0,
      totalDist: Math.max(1, dist),
      lastX: tx,
      lastY: ty,
      hostile: args.hostile ?? false,
      fromHero: args.fromHero ?? false,
    })
    bus.emit('sfx', { name: 'arrow' })
  }

  update(dt: number): void {
    const { state, sys } = this.ctx
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i]
      const target = resolveTarget(state, p.target)
      if (target) [p.lastX, p.lastY] = this.aimPoint(target)
      const dx = p.lastX - p.x
      const dy = p.lastY - p.y
      const dist = Math.hypot(dx, dy)
      const step = p.speed * dt
      if (dist <= step) {
        state.projectiles.splice(i, 1)
        if (!target) continue
        if (p.hostile) {
          if (target.kind === 'building')
            sys.damage.damageBuilding(p.target.id, p.damage)
          else if (target.kind === 'citizen')
            sys.damage.damageCitizen(p.target.id, p.damage)
          else if (target.kind === 'hero') sys.damage.hitHero(p.x, p.damage)
        } else if (target.kind === 'camp')
          sys.damage.damageCamp(p.target.id, p.damage)
        else if (target.kind === 'enemy')
          sys.damage.damageEnemy(p.target.id, p.damage, p.sourceId)
        else if (target.kind === 'animal')
          sys.damage.damageAnimal(
            p.target.id,
            p.damage,
            p.fromHero ? -1 : p.sourceId,
          )
        continue
      }
      p.x += (dx / dist) * step
      p.y += (dy / dist) * step
      p.travelled += step
    }
  }

  private aimPoint(t: Resolved): [number, number] {
    switch (t.kind) {
      case 'enemy':
        return [t.entity.x, 24]
      case 'animal':
        return [t.entity.x, 6]
      case 'citizen':
        return [t.entity.x, 24]
      case 'building':
        return [t.entity.x, 26]
      case 'camp':
        return [t.entity.x, 26]
      case 'hero':
        return [this.ctx.state.hero.x, 34]
      default:
        return [0, 0]
    }
  }
}
