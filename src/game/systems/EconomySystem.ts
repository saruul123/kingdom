import type { EconomyApi, GameContext, System } from '../core/context'
import { newId } from '../core/lookup'
import type { CoinPickup } from '../core/types'
import { mn } from '../i18n'

/** Owns the hero's coin purse and every coin lying on the ground. */
export class EconomySystem implements System, EconomyApi {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase }) => {
      if (phase === 'Sunrise') this.collectTax()
    })
  }

  /**
   * Every dawn the people leave a tax at the ger, so the kingdom always earns
   * a little even when the steppe has been picked clean.
   */
  private collectTax(): void {
    const { state, config, sys, bus } = this.ctx
    const citizens = state.citizens.filter(
      (c) => c.owner === 'player' && c.state !== 'Dead',
    ).length
    const tax = config.economy.tax
    const amount = tax.base + Math.floor(citizens / tax.perCitizens)
    if (amount <= 0) return
    this.dropCoins(sys.buildings.ger()?.x ?? 0, amount, 'income')
    bus.emit('toast', { text: mn.taxCollected(amount), kind: 'good' })
  }

  update(dt: number): void {
    const { state, config, bus } = this.ctx
    const hero = state.hero
    for (const c of state.coinPickups) if (c.delay > 0) c.delay -= dt

    for (let i = state.coinPickups.length - 1; i >= 0; i--) {
      const c = state.coinPickups[i]
      if (c.delay > 0) continue
      if (Math.abs(c.x - hero.x) <= config.hero.pickupRadius) {
        state.coinPickups.splice(i, 1)
        state.coins += c.amount
        state.stats.coinsCollected += c.amount
        bus.emit('coinsChanged', { coins: state.coins, delta: c.amount })
        bus.emit('sfx', { name: 'coin' })
        bus.emit('float', { x: hero.x, text: `+${c.amount}`, kind: 'gain' })
      }
    }
  }

  trySpend(amount: number): boolean {
    const { state, bus } = this.ctx
    if (state.coins < amount) return false
    state.coins -= amount
    if (amount > 0) {
      bus.emit('coinsChanged', { coins: state.coins, delta: -amount })
      bus.emit('sfx', { name: 'spend' })
    }
    return true
  }

  /** Put coins on the ground. Large amounts are split into a small scatter. */
  dropCoins(x: number, amount: number, origin: CoinPickup['origin']): void {
    const { state, config, rng } = this.ctx
    const spread = config.economy.gerCoinDropSpread
    for (let i = 0; i < amount; i++) {
      state.coinPickups.push({
        id: newId(state),
        x: x + (amount > 1 ? rng.range(-spread, spread) * 0.5 : 0),
        amount: 1,
        delay: origin === 'cache' ? 0 : config.economy.coinPickupDelay,
        origin,
      })
    }
  }

  /** Removes up to `amount` coins from the hero; returns how many were lost. */
  heroLoseCoins(amount: number): number {
    const { state, bus } = this.ctx
    const lost = Math.min(state.coins, amount)
    if (lost > 0) {
      state.coins -= lost
      bus.emit('coinsChanged', { coins: state.coins, delta: -lost })
    }
    return lost
  }
}
