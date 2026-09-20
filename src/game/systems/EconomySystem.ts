import type { EconomyApi, GameContext, System } from '../core/context'
import { newId } from '../core/lookup'
import type { CoinPickup } from '../core/types'

/** Owns the hero's coin purse and every coin lying on the ground. */
export class EconomySystem implements System, EconomyApi {
  constructor(private ctx: GameContext) {}

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
