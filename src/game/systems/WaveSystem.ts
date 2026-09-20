import type { GameContext, System, WaveApi } from '../core/context'
import type { SpawnEntry, Side } from '../core/types'

/** Turns the data-driven wave table into timed spawns during the night. */
export class WaveSystem implements System, WaveApi {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase, day }) => {
      if (phase === 'Night') this.startNight(day)
      else if (phase === 'Sunrise') this.reset()
    })
  }

  finishedSpawning(): boolean {
    return this.ctx.state.wave.queue.length === 0
  }

  update(dt: number): void {
    const { state, sys } = this.ctx
    if (state.currentPhase !== 'Night') return
    const wave = state.wave
    wave.elapsed += dt
    while (wave.queue.length > 0 && wave.queue[0].at <= wave.elapsed) {
      const entry = wave.queue.shift()!
      sys.enemies.spawn(entry.type, entry.side)
    }
  }

  private reset(): void {
    this.ctx.state.wave = { night: 0, elapsed: 0, queue: [], total: 0 }
  }

  private startNight(night: number): void {
    const { config, rng, state } = this.ctx
    const tier = config.waves.nights.find(
      (t) => night >= t.from && night <= t.to,
    )
    const entries: SpawnEntry[] = []
    if (tier) {
      const window = config.time.spawnWindow * config.time.nightDuration
      for (const group of tier.groups) {
        const count = group.base + group.perNight * (night - tier.from)
        let side: Side = rng.sign()
        for (let i = 0; i < count; i++) {
          entries.push({
            type: group.type,
            side,
            at: (i / Math.max(1, count)) * window + rng.range(0, 2),
          })
          side = (side * -1) as Side
        }
      }
    }
    entries.sort((a, b) => a.at - b.at)
    state.wave = { night, elapsed: 0, queue: entries, total: entries.length }
  }
}
