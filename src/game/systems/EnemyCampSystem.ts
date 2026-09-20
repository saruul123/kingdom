import type { GameContext, System } from '../core/context'
import { isAlive } from '../core/lookup'

/** Enemy camps keep sending out guards until the hero tears them down. */
export class EnemyCampSystem implements System {
  constructor(private ctx: GameContext) {}

  update(dt: number): void {
    const { state, config, sys } = this.ctx
    const cfg = config.content.enemyCamps
    for (const camp of state.enemyCamps) {
      if (camp.cleared) continue
      camp.spawnTimer -= dt
      if (camp.spawnTimer > 0) continue
      camp.spawnTimer = cfg.spawnInterval
      const guards = state.enemies.filter(
        (e) => isAlive(e) && e.campId === camp.id,
      ).length
      if (guards < cfg.maxGuards) sys.enemies.spawnGuard(camp)
    }
  }
}
