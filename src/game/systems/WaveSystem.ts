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
    ctx.bus.on('nightCleared', () => this.rewardBossNight())
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
      if (e.state === 'Dead' || e.campId !== null) continue
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

  /** Surviving the great raid pays a chest at the ger and schedules the next one. */
  private rewardBossNight(): void {
    const { state, config, sys, bus } = this.ctx
    if (!state.bossNight.active) return
    state.bossNight.active = false
    state.bossNight.nextNight += config.waves.bossInterval
    const reward = config.waves.boss.reward
    sys.economy.dropCoins(sys.buildings.ger()?.x ?? 0, reward, 'income')
    bus.emit('toast', { text: mn.bossDefeated(reward), kind: 'good' })
  }

  private reset(): void {
    this.ctx.state.wave = { night: 0, elapsed: 0, queue: [], total: 0 }
  }

  private planNight(night: number): void {
    const { config, rng, state, bus } = this.ctx
    const diff = config.difficulty[state.difficulty]
    const tier = config.waves.nights.find(
      (t) => night >= t.from && night <= t.to,
    )
    const boss = night % config.waves.bossInterval === 0
    state.bossNight.active = boss
    const window = config.time.spawnWindow * config.time.nightDuration
    const entries: SpawnEntry[] = []
    const add = (type: string, count: number, x?: number) => {
      let side: Side = rng.sign()
      for (let i = 0; i < count; i++) {
        entries.push({
          type,
          side: x === undefined ? side : x < 0 ? -1 : 1,
          x,
          at: (i / Math.max(1, count)) * window + rng.range(0, 3),
        })
        side = (side * -1) as Side
      }
    }
    if (tier) {
      const scale = (boss ? config.waves.boss.multiplier : 1) * diff.waveSize
      for (const group of tier.groups) {
        const raw = group.base + group.perNight * (night - tier.from)
        add(group.type, Math.max(1, Math.round(Math.floor(raw) * scale)))
      }
    }
    if (boss) {
      for (const g of config.waves.boss.extra) {
        add(g.type, Math.max(1, Math.round(g.base * diff.waveSize)))
      }
      bus.emit('toast', { text: mn.bossWarning, kind: 'danger' })
    }
    // every standing camp sends raiders from its own doorstep
    for (const camp of state.enemyCamps) {
      if (!camp.cleared)
        add('bandit', config.content.enemyCamps.raidersPerNight, camp.x)
    }
    entries.sort((a, b) => a.at - b.at)
    state.wave = { night, elapsed: 0, queue: entries, total: entries.length }
  }
}
