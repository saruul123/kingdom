import type {
  GameContext,
  Interaction,
  InteractionProvider,
  System,
} from '../core/context'
import type { InputSource } from '../input/Input'
import { approach, clamp } from '../core/math'
import type { UIManager } from '../ui/UIManager'

/** Rides the hero, picks the nearest interaction and executes it on key press. */
export class PlayerController implements System {
  constructor(
    private ctx: GameContext,
    private input: InputSource,
    private ui: UIManager,
    private providers: InteractionProvider[],
  ) {}

  current: Interaction | null = null

  update(dt: number): void {
    this.move(dt)
    this.pickupBanner(dt)
    this.updateInteraction()
  }

  private move(dt: number): void {
    const { state, config } = this.ctx
    const h = state.hero
    const c = config.hero
    const dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0)

    const wantsSprint = this.input.sprint && dir !== 0
    h.sprinting = wantsSprint && !h.exhausted && h.stamina > 0
    if (h.sprinting) {
      h.stamina = Math.max(0, h.stamina - c.staminaDrain * dt)
      if (h.stamina === 0) h.exhausted = true
    } else {
      h.stamina = Math.min(c.maxStamina, h.stamina + c.staminaRegen * dt)
      if (h.exhausted && h.stamina >= c.staminaRecoverAt) h.exhausted = false
    }

    const top = h.sprinting ? c.sprintSpeed : c.speed
    h.vx = approach(h.vx, dir * top, c.acceleration * dt)
    h.x = clamp(h.x + h.vx * dt, config.world.minX, config.world.maxX)
    if (dir !== 0) h.facing = dir > 0 ? 1 : -1
  }

  private pickupBanner(dt: number): void {
    const { state, bus } = this.ctx
    if (state.banner.state !== 'ground') return
    state.banner.delay = Math.max(0, state.banner.delay - dt)
    if (
      state.banner.delay === 0 &&
      Math.abs(state.banner.x - state.hero.x) < 30
    ) {
      state.banner = {
        state: 'held',
        x: state.hero.x,
        carrierId: null,
        delay: 0,
      }
      bus.emit('bannerRecovered', {})
      bus.emit('toast', { text: 'You recovered the banner.', kind: 'good' })
    }
  }

  private updateInteraction(): void {
    const { state, bus } = this.ctx
    const all: Interaction[] = []
    for (const p of this.providers) p.gatherInteractions(all)

    let best: Interaction | null = null
    let bestD = Infinity
    for (const i of all) {
      const d = Math.abs(i.x - state.hero.x)
      if (d <= i.radius && d < bestD) {
        best = i
        bestD = d
      }
    }
    this.current = best

    const pressed = this.input.consumeInteract()
    if (!best) {
      this.ui.setPrompt(null)
      return
    }
    const affordable = state.coins >= best.cost
    const label = best.disabledReason
      ? `${best.label} — ${best.disabledReason}`
      : `${best.label} — ${best.cost} ${best.cost === 1 ? 'Coin' : 'Coins'}`
    this.ui.setPrompt({
      x: best.x,
      text: label,
      state: !best.enabled ? 'blocked' : affordable ? 'ok' : 'poor',
    })

    if (!pressed) return
    if (!best.enabled || !affordable) {
      bus.emit('sfx', { name: 'deny' })
      if (best.enabled)
        bus.emit('toast', { text: 'Not enough coins.', kind: 'warning' })
      return
    }
    best.execute()
  }
}
