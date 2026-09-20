import type { DamageApi, GameContext, System } from '../core/context'
import { findById, isAlive } from '../core/lookup'
import { mn } from '../i18n'

const CORPSE_TIME = 3

/** Single place where HP is removed and deaths are resolved. */
export class DamageSystem implements System, DamageApi {
  constructor(private ctx: GameContext) {}

  update(dt: number): void {
    const { state } = this.ctx
    for (const b of state.buildings) b.hitFlash = Math.max(0, b.hitFlash - dt)
    for (const e of state.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt)
      if (e.state === 'Dead') e.deadTimer -= dt
    }
    for (const c of state.citizens) if (c.state === 'Dead') c.deadTimer -= dt
    for (const a of state.animals) if (a.state === 'Dead') a.deadTimer -= dt
    state.enemies = state.enemies.filter(
      (e) => e.state !== 'Dead' || e.deadTimer > 0,
    )
    state.citizens = state.citizens.filter(
      (c) => c.state !== 'Dead' || c.deadTimer > 0,
    )
    state.animals = state.animals.filter(
      (a) => a.state !== 'Dead' || a.deadTimer > 0,
    )
    state.hero.invulnerable = Math.max(0, state.hero.invulnerable - dt)
  }

  damageEnemy(id: number, amount: number): void {
    const { state, bus } = this.ctx
    const e = findById(state.enemies, id)
    if (!e || !isAlive(e)) return
    e.health -= amount
    e.hitFlash = 0.15
    bus.emit('sfx', { name: 'hit' })
    if (e.health > 0) return
    e.state = 'Dead'
    e.deadTimer = CORPSE_TIME
    e.target = null
    state.stats.enemiesKilled++
    if (e.carryingBanner) {
      e.carryingBanner = false
      state.banner = { state: 'ground', x: e.x, carrierId: null, delay: 1 }
    }
    bus.emit('enemyKilled', { id: e.id, x: e.x })
    bus.emit('sfx', { name: 'kill' })
    const chance = this.ctx.config.enemies[e.type].coinDropChance
    if (this.ctx.rng.chance(chance))
      this.ctx.sys.economy.dropCoins(e.x, 1, 'dropped')
  }

  damageBuilding(id: number, amount: number): void {
    const { state, bus } = this.ctx
    const b = findById(state.buildings, id)
    if (!b || (b.state !== 'Active' && b.state !== 'Damaged')) return
    b.health -= amount
    b.hitFlash = 0.15
    if (b.health > 0) {
      b.state = 'Damaged'
      return
    }
    b.health = 0
    b.state = 'Destroyed'
    bus.emit('buildingDestroyed', { id: b.id, type: b.type, x: b.x })
  }

  damageCitizen(id: number, amount: number): void {
    const { state, bus } = this.ctx
    const c = findById(state.citizens, id)
    if (!c || !isAlive(c)) return
    c.health -= amount
    if (c.health > 0) return
    c.state = 'Dead'
    c.brain = 'Dead'
    c.deadTimer = CORPSE_TIME
    state.stats.citizensLost++
    if (c.postBuildingId !== null) this.ctx.sys.buildings.releaseTowerSlot(c)
    bus.emit('sfx', { name: 'hit' })
    if (c.owner === 'player') {
      bus.emit('toast', { text: mn.citizenFell, kind: 'danger' })
    }
  }

  damageAnimal(id: number, amount: number): void {
    const a = findById(this.ctx.state.animals, id)
    if (!a || !isAlive(a)) return
    a.health -= amount
    if (a.health > 0) {
      a.state = 'Fleeing'
      return
    }
    a.state = 'Dead'
    a.deadTimer = 30
  }

  /** Hero takes no HP damage: enemies knock coins out of the purse, then the banner. */
  hitHero(fromX: number, _amount: number): void {
    const { state, config, bus, sys } = this.ctx
    const hero = state.hero
    if (hero.invulnerable > 0) return
    hero.invulnerable = config.hero.invulnerableTime
    const dir = hero.x >= fromX ? 1 : -1
    hero.vx = dir * config.hero.knockback * 4
    bus.emit('sfx', { name: 'hit' })

    const lost = sys.economy.heroLoseCoins(config.hero.hitCoinLoss)
    if (lost > 0) {
      sys.economy.dropCoins(hero.x, lost, 'dropped')
      bus.emit('heroHit', { coinsLost: lost })
      bus.emit('float', { x: hero.x, text: `-${lost}`, kind: 'loss' })
      return
    }
    if (state.banner.state === 'held') {
      state.banner = {
        state: 'ground',
        x: hero.x,
        carrierId: null,
        delay: config.hero.invulnerableTime + 0.6,
      }
      bus.emit('bannerLost', { x: hero.x })
      bus.emit('toast', { text: mn.bannerFell, kind: 'danger' })
    }
    bus.emit('heroHit', { coinsLost: 0 })
  }
}
