import type {
  GameContext,
  Interaction,
  InteractionProvider,
  System,
} from '../core/context'
import { mn } from '../i18n'

/**
 * Things worth riding out for: ovoos to make offerings at, wells to water the horse,
 * and ruins to dig through (with the odd ambush).
 */
export class EventSystem implements System, InteractionProvider {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase, day }) => {
      if (phase === 'Sunrise') this.maybeNewRuin(day)
    })
    ctx.bus.on('nightCleared', () => {
      ctx.state.blessing = Math.max(0, ctx.state.blessing - 1)
    })
  }

  update(): void {}

  gatherInteractions(out: Interaction[]): void {
    const { state, config } = this.ctx
    const offering = config.content.ovooOffering
    state.ovoos.forEach((o, i) => {
      const used = o.usedDay === state.currentDay
      out.push({
        id: `ovoo:${i}`,
        x: o.x,
        radius: 46,
        label: mn.offerOvoo,
        cost: offering.cost,
        enabled: !used,
        disabledReason: used ? mn.ovooUsed : undefined,
        execute: () => this.offer(i),
      })
    })
    state.wells.forEach((w, i) => {
      const used = w.usedDay === state.currentDay
      out.push({
        id: `well:${i}`,
        x: w.x,
        radius: 40,
        label: mn.drawWater,
        cost: 0,
        enabled: !used,
        disabledReason: used ? mn.wellUsed : undefined,
        execute: () => this.drink(i),
      })
    })
    state.ruins.forEach((r, i) => {
      if (r.looted) return
      out.push({
        id: `ruin:${i}`,
        x: r.x,
        radius: 44,
        label: mn.digRuins,
        cost: 1,
        enabled: true,
        execute: () => this.dig(i),
      })
    })
  }

  private offer(i: number): void {
    const { state, config, sys, bus, rng } = this.ctx
    const o = state.ovoos[i]
    const cfg = config.content.ovooOffering
    if (o.usedDay === state.currentDay || !sys.economy.trySpend(cfg.cost))
      return
    o.usedDay = state.currentDay
    const roll = rng.next()
    if (roll < cfg.blessingChance) {
      state.blessing = 1
      bus.emit('toast', { text: mn.blessing, kind: 'good' })
    } else if (roll < cfg.blessingChance + cfg.coinsChance) {
      sys.economy.dropCoins(o.x, cfg.coinsBack, 'dropped')
      bus.emit('toast', { text: mn.ovooCoins(cfg.coinsBack), kind: 'good' })
    } else {
      bus.emit('toast', { text: mn.ovooSilent, kind: 'info' })
    }
  }

  private drink(i: number): void {
    const { state, config, bus } = this.ctx
    const w = state.wells[i]
    if (w.usedDay === state.currentDay) return
    w.usedDay = state.currentDay
    state.hero.stamina = config.hero.maxStamina
    state.hero.exhausted = false
    state.hero.boost = 40
    bus.emit('toast', { text: mn.wellDone, kind: 'good' })
  }

  private dig(i: number): void {
    const { state, config, sys, bus, rng } = this.ctx
    const r = state.ruins[i]
    const cfg = config.content.ruins
    if (r.looted || !sys.economy.trySpend(1)) return
    r.looted = true
    const loot = rng.int(cfg.loot[0], cfg.loot[1])
    sys.economy.dropCoins(r.x, loot, 'dropped')
    bus.emit('toast', { text: mn.ruinLoot(loot), kind: 'good' })
    if (rng.chance(cfg.ambushChance)) {
      for (let k = 0; k < cfg.ambushSize; k++) {
        const side = k % 2 === 0 ? -1 : 1
        const e = sys.enemies.spawn('bandit', side, r.x + side * (90 + k * 20))
        if (e) e.campId = null
      }
      bus.emit('toast', { text: mn.ruinAmbush, kind: 'danger' })
    }
  }

  private maybeNewRuin(day: number): void {
    const { state, config, rng } = this.ctx
    const cfg = config.content.ruins
    if (day % cfg.newEveryDays !== 0 || state.ruins.length >= cfg.max) return
    state.ruins.push({
      x: rng.sign() * rng.range(cfg.minX, cfg.maxX),
      looted: false,
    })
  }
}
