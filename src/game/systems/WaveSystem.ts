import type { GameContext, System, WaveApi } from '../core/context'
import type { SpawnEntry, Side } from '../core/types'
import { mn } from '../i18n'

/** Turns the data-driven wave table into timed spawns during the night. */
export class WaveSystem implements System, WaveApi {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase, day }) => {
      // The raid is planned at dusk so the player can be warned which side it comes from.
      if (phase === 'Sunset') {
        this.planNight(day)
        const { left, right } = this.incoming()
        ctx.bus.emit('toast', {
          text: mn.raidPreview(left, right),
          kind: 'warning',
        })
      } else if (phase === 'Night') {
        if (this.ctx.state.wave.night !== day) this.planNight(day)
        this.ctx.state.wave.elapsed = 0
      } else if (phase === 'Sunrise') this.reset()
    })
  }

  finishedSpawning(): boolean {
    return this.ctx.state.wave.queue.length === 0
  }

  incoming(): { left: number; right: number } {
    const { state } = this.ctx
    let left = 0
    let right = 0
    for (const e of state.wave.queue) {
      if (e.side < 0) left++
      else right++
    }
    for (const e of state.enemies) {
      if (e.state === 'Dead') continue
      if (e.side < 0) left++
      else right++
    }
    return { left, right }
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

  private planNight(night: number): void {
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
