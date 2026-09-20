import type {
  GameContext,
  Interaction,
  InteractionProvider,
  System,
} from '../core/context'
import type { InputSource } from '../input/Input'
import { approach, clamp } from '../core/math'
import type { UIManager } from '../ui/UIManager'
import { mn } from '../i18n'

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
    this.combat(dt)
    this.explore()
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

    const stations = state.buildings.filter(
      (b) =>
        b.type === 'ortoo' && (b.state === 'Active' || b.state === 'Damaged'),
    ).length
    const top =
      (h.sprinting ? c.sprintSpeed : c.speed) *
      (h.boost > 0 ? 1.25 : 1) *
      (1 + config.ortoo.speedBonus * Math.min(2, stations))
    h.boost = Math.max(0, h.boost - dt)
    // A mount coasts into a stop, but should not keep sliding after release.
    const acceleration = dir === 0 ? c.acceleration * 1.35 : c.acceleration
    h.vx = approach(h.vx, dir * top, acceleration * dt)
    h.x = clamp(h.x + h.vx * dt, config.world.minX, config.world.maxX)
    if (
      (h.x === config.world.minX && h.vx < 0) ||
      (h.x === config.world.maxX && h.vx > 0)
    )
      h.vx = 0
    // Wait until the horse has actually turned before mirroring the artwork.
    if (Math.abs(h.vx) > 8) h.facing = h.vx > 0 ? 1 : -1
  }

  /** Hold the shoot key to loose arrows at the nearest raider (or game) in range. */
  private combat(dt: number): void {
    const { state, config, sys } = this.ctx
    const h = state.hero
    h.attackCooldown = Math.max(0, h.attackCooldown - dt)
    h.attackFlash = Math.max(0, h.attackFlash - dt)
    if (!this.input.attack || h.attackCooldown > 0) return
    const c = config.hero
    let best:
      { kind: 'enemy' | 'animal' | 'camp'; id: number; x: number } | undefined
    let bestScore = Infinity
    const consider = (
      kind: 'enemy' | 'animal' | 'camp',
      id: number,
      x: number,
      bias: number,
    ) => {
      const d = Math.abs(x - h.x)
      if (d > c.attackRange) return
      // prefer what the hero is facing, and raiders over game
      const behind = (x - h.x) * h.facing < 0 ? 140 : 0
      const score = d + behind + bias
      if (score < bestScore) {
        bestScore = score
        best = { kind, id, x }
      }
    }
    for (const e of state.enemies)
      if (e.state !== 'Dead') consider('enemy', e.id, e.x, 0)
    for (const a of state.animals)
      if (a.state !== 'Dead') consider('animal', a.id, a.x, 80)
    for (const camp of state.enemyCamps)
      if (!camp.cleared) consider('camp', camp.id, camp.x, 40)
    if (!best) return
    h.facing = best.x >= h.x ? 1 : -1
    h.attackCooldown = c.attackCooldown
    h.attackFlash = 0.28
    sys.combat.fireArrow({
      x: h.x + h.facing * 20,
      y: 44,
      target: { kind: best.kind, id: best.id },
      damage: c.attackDamage,
      speed: c.arrowSpeed,
      sourceId: null,
      fromHero: true,
    })
  }

  /** Reveal the steppe around the hero on the map. */
  private explore(): void {
    const { state } = this.ctx
    const seen = 380
    state.explored.min = Math.min(state.explored.min, state.hero.x - seen)
    state.explored.max = Math.max(state.explored.max, state.hero.x + seen)
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
      bus.emit('toast', { text: mn.bannerRecovered, kind: 'good' })
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
      : `${best.label} — ${mn.coins(best.cost)}`
    this.ui.setPrompt({
      x: best.x,
      text: label,
      state: !best.enabled ? 'blocked' : affordable ? 'ok' : 'poor',
    })

    if (!pressed) return
    if (!best.enabled || !affordable) {
      bus.emit('sfx', { name: 'deny' })
      if (best.enabled)
        bus.emit('toast', { text: mn.notEnoughCoins, kind: 'warning' })
      return
    }
    const before = state.coins
    best.execute()
    if (state.coins < before) {
      bus.emit('float', {
        x: best.x,
        text: `-${before - state.coins}`,
        kind: 'spend',
      })
    }
  }
}
