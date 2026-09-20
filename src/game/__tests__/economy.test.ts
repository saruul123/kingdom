import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { NullInput } from '../input/Input'
import { createBuilding } from '../systems/BuildingSystem'
import { createCitizen } from '../systems/CitizenSystem'

const STEP = 1 / 30

function setup() {
  const input = new NullInput()
  const game = new GameManager({ seed: 6, input, persist: false })
  return { game, input }
}

function run(game: GameManager, seconds: number) {
  for (let i = 0; i < seconds / STEP; i++) game.step(STEP)
}

/** Advance to the next dawn. */
function toDawn(game: GameManager) {
  const seen: string[] = []
  game.bus.on('phaseChanged', (e) => seen.push(e.phase))
  let guard = 0
  while (!seen.includes('Sunrise') && guard++ < 100_000) {
    game.state.timeRemaining = Math.min(game.state.timeRemaining, 0.05)
    game.state.enemies = []
    game.step(STEP)
  }
}

describe('income when the steppe is picked clean', () => {
  it('pays a dawn tax at the ger even with no citizens and no coins on the map', () => {
    const { game } = setup()
    game.state.coinPickups = []
    game.state.coins = 0
    toDawn(game)
    const income = game.state.coinPickups.filter((c) => c.origin === 'income')
    expect(income.reduce((n, c) => n + c.amount, 0)).toBe(
      game.config.economy.tax.base,
    )
    expect(income.every((c) => Math.abs(c.x) < 100)).toBe(true)
  })

  it('tax grows with the number of citizens', () => {
    const { game } = setup()
    game.state.coinPickups = []
    for (let i = 0; i < 6; i++) {
      const c = createCitizen(game.ctx, i * 10, 'player')
      game.state.citizens.push(c)
    }
    toDawn(game)
    const total = game.state.coinPickups
      .filter((c) => c.origin === 'income')
      .reduce((n, c) => n + c.amount, 0)
    const { base, perCitizens } = game.config.economy.tax
    expect(total).toBe(base + Math.floor(6 / perCitizens))
  })

  it('replacement treasure appears near the settlement again after it is collected', () => {
    const { game } = setup()
    game.state.coinPickups = []
    toDawn(game)
    const caches = game.state.coinPickups.filter((c) => c.origin === 'cache')
    expect(caches.length).toBe(game.config.content.caches.respawnPerDay)
    expect(
      caches.every(
        (c) => Math.abs(c.x) >= game.config.content.caches.respawnMinX,
      ),
    ).toBe(true)
  })
})

describe('herders and pastures', () => {
  it('a herder at a pasture keeps producing coins', () => {
    const { game } = setup()
    const { state, ctx, config } = game
    state.timeRemaining = 1e6
    const pasture = createBuilding(ctx, 'pasture', -150, 'pastureL', true)
    state.buildings.push(pasture)
    const herder = createCitizen(ctx, -100, 'player')
    herder.profession = 'Herder'
    state.citizens.push(herder)
    state.coinPickups = []
    state.hero.x = 2500 // far away so nothing is picked up

    run(game, config.professions.herder.incomeInterval * 3 + 10)
    const coins = state.coinPickups.filter((c) => c.origin === 'income')
    expect(coins.length).toBeGreaterThanOrEqual(2)
    expect(herder.brain).toBe('Herd')
    expect(pasture.occupants).toContain(herder.id)
  })

  it('offers the herder tool only when a pasture has room and a citizen is free', () => {
    const { game, input } = setup()
    const { state, ctx } = game
    state.coins = 20
    state.hero.x = 120
    const free = createCitizen(ctx, 100, 'player')
    state.citizens.push(free)
    game.step(STEP)
    expect(game.player.current?.id).toBe('stand:herderRack')
    input.press()
    game.step(STEP)
    expect(free.pendingProfession).toBeNull() // no pasture: refused
    expect(state.coins).toBe(20)

    state.buildings.push(createBuilding(ctx, 'pasture', 165, 'pastureR', true))
    game.step(STEP)
    input.press()
    game.step(STEP)
    expect(free.pendingProfession).toBe('Herder')
    expect(state.coins).toBe(20 - game.config.professions.herder.cost)
  })

  it('herders go home at dusk and back to work at dawn', () => {
    const { game } = setup()
    const { state, ctx } = game
    const pasture = createBuilding(ctx, 'pasture', -150, 'pastureL', true)
    state.buildings.push(pasture)
    const herder = createCitizen(ctx, -140, 'player')
    herder.profession = 'Herder'
    state.citizens.push(herder)
    state.hero.x = 2500
    run(game, 15)
    expect(herder.brain).toBe('Herd')
    state.currentPhase = 'Sunset'
    state.timeRemaining = 30
    run(game, 15)
    expect(['ReturnHome', 'Shelter']).toContain(herder.brain)
    expect(pasture.occupants).not.toContain(herder.id)
    state.currentPhase = 'Sunrise'
    state.timeRemaining = 30
    run(game, 15)
    expect(herder.brain).toBe('Herd')
  })
})
