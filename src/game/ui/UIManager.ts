import type { GameContext, System } from '../core/context'
import type { ToastKind } from '../core/events'
import { mn } from '../i18n'

export interface Prompt {
  x: number
  text: string
  state: 'ok' | 'poor' | 'blocked'
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

  constructor(ctx: GameContext) {
    const { bus } = ctx
    bus.on('toast', ({ text, kind }) => this.toast(text, kind))
    bus.on('coinsChanged', () => (this.coinPulse = 1))
    bus.on('phaseChanged', ({ phase, day }) => {
      if (phase === 'Sunrise') this.announce(mn.dayN(day))
      if (phase === 'Sunset') {
        this.announce(mn.sunSetting)
        bus.emit('sfx', { name: 'horn' })
      }
      if (phase === 'Night') this.announce(mn.nightN(day))
    })
    bus.on('nightCleared', () => this.toast(mn.nightSurvived, 'good'))
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
    for (const t of this.toasts) t.age += dt
    this.toasts = this.toasts.filter((t) => t.age < t.ttl)
    if (this.banner) {
      this.banner.age += dt
      if (this.banner.age >= this.banner.ttl) this.banner = null
    }
  }
}
