import type { GameContext, System } from '../core/context'
import type { ToastKind } from '../core/events'
import { mn } from '../i18n'
import { currentObjective } from './objectives'
import type { Objective } from './objectives'

export interface Prompt {
  x: number
  text: string
  state: 'ok' | 'poor' | 'blocked'
}

export interface FloatText {
  x: number
  text: string
  kind: 'gain' | 'spend' | 'loss' | 'info'
  age: number
}

export interface Toast {
  text: string
  kind: ToastKind
  age: number
  ttl: number
}

/** View-model for the HUD: what the renderer draws on top of the world. */
export class UIManager implements System {
  prompt: Prompt | null = null
  toasts: Toast[] = []
  coinPulse = 0
  /** Big centred banner text for phase changes. */
  banner: { text: string; age: number; ttl: number } | null = null
  hintTime = 0
  floats: FloatText[] = []
  objective: Objective | null = null
  private objectiveTimer = 0
  private nightStart = { kills: 0, lost: 0 }

  constructor(private ctx: GameContext) {
    const { bus } = ctx
    bus.on('toast', ({ text, kind }) => this.toast(text, kind))
    bus.on('coinsChanged', () => (this.coinPulse = 1))
    bus.on('phaseChanged', ({ phase, day }) => {
      if (phase === 'Sunrise') this.announce(mn.dayN(day))
      if (phase === 'Sunset') {
        this.announce(mn.sunSetting)
        bus.emit('sfx', { name: 'horn' })
      }
      if (phase === 'Night')
        this.announce(
          ctx.state.bossNight.active ? mn.bossAnnounce : mn.nightN(day),
        )
    })
    bus.on('phaseChanged', ({ phase }) => {
      if (phase === 'Night') {
        this.nightStart = {
          kills: ctx.state.stats.enemiesKilled,
          lost: ctx.state.stats.citizensLost,
        }
      }
    })
    bus.on('nightCleared', () => {
      const { stats } = ctx.state
      this.toast(
        mn.nightReport(
          stats.enemiesKilled - this.nightStart.kills,
          stats.citizensLost - this.nightStart.lost,
        ),
        'good',
      )
    })
    bus.on('float', ({ x, text, kind }) => {
      this.floats.push({ x, text, kind, age: 0 })
      if (this.floats.length > 12) this.floats.shift()
    })
  }

  toast(text: string, kind: ToastKind = 'info'): void {
    this.toasts.push({ text, kind, age: 0, ttl: 3.5 })
    if (this.toasts.length > 4) this.toasts.shift()
  }

  announce(text: string): void {
    this.banner = { text, age: 0, ttl: 3.2 }
  }

  setPrompt(prompt: Prompt | null): void {
    this.prompt = prompt
  }

  update(dt: number): void {
    this.hintTime += dt
    this.coinPulse = Math.max(0, this.coinPulse - dt * 3)
    for (const f of this.floats) f.age += dt
    this.floats = this.floats.filter((f) => f.age < 1.1)
    this.objectiveTimer -= dt
    if (this.objectiveTimer <= 0) {
      this.objectiveTimer = 0.4
      this.objective = currentObjective(this.ctx)
    }
    for (const t of this.toasts) t.age += dt
    this.toasts = this.toasts.filter((t) => t.age < t.ttl)
    if (this.banner) {
      this.banner.age += dt
      if (this.banner.age >= this.banner.ttl) this.banner = null
    }
  }
}
