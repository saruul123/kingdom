import { describe, expect, it } from 'vitest'
import { tradePoints } from '../ai/trader'
import { GameManager } from '../GameManager'
import { NullInput } from '../input/Input'
import { createBuilding } from '../systems/BuildingSystem'
import { createCitizen } from '../systems/CitizenSystem'

const STEP = 1 / 30
const run = (g: GameManager, s: number) => {
  for (let i = 0; i < s / STEP; i++) g.step(STEP)
}

function setup() {
  const input = new NullInput()
  const game = new GameManager({ seed: 2, input, persist: false })
  game.state.timeRemaining = 1e6
  game.state.enemyCamps = []
  game.state.enemies = []
  game.state.animals = []
  game.state.coinPickups = []
  game.state.kingdomLevel = 3
  game.state.hero.x = -2500
  return { game, input }
}

describe('trade', () => {
  it('a market (kingdom level 2) trains traders, up to its capacity', () => {
    const { game, input } = setup()
    const { state, ctx, config } = game
    state.coins = 30
    state.buildings.push(createBuilding(ctx, 'market', 360, 'marketR', true))
    for (let i = 0; i < 3; i++)
      state.citizens.push(createCitizen(ctx, 340 + i * 6, 'player'))
    state.hero.x = 360
    for (let n = 0; n < 3; n++) {
      game.step(STEP)
      input.press()
      game.step(STEP)
    }
    const traders = state.citizens.filter(
      (c) => c.pendingProfession === 'Trader' || c.profession === 'Trader',
    )
    expect(traders).toHaveLength(config.buildings.market.traderCapacity!)
    expect(state.coins).toBe(30 - 2 * config.professions.trader.cost)
  })

  it('a trader walks to the farthest safe trade point and brings back coins by distance', () => {
    const { game } = setup()
    const { state, ctx, config } = game
    const market = createBuilding(ctx, 'market', 360, 'marketR', true)
    state.buildings.push(market)
    const trader = createCitizen(ctx, 350, 'player')
    trader.profession = 'Trader'
    state.citizens.push(trader)
    const points = tradePoints(ctx).filter((x) => x > 0)
    expect(points.length).toBeGreaterThan(0)
    const dest = Math.max(...points)
    const expected = Math.round(
      config.professions.trader.rewardBase +
        (config.professions.trader.rewardPer100 * Math.abs(dest - market.x)) /
          100,
    )
    run(game, 90)
    const income = state.coinPickups
      .filter((c) => c.origin === 'income')
      .reduce((n, c) => n + c.amount, 0)
    expect(income).toBeGreaterThanOrEqual(expected)
  })

  it('an outpost pushes the border out and opens longer, more profitable routes', () => {
    const { game } = setup()
    const { state, ctx } = game
    const before = Math.max(...tradePoints(ctx).map(Math.abs))
    const outpost = createBuilding(ctx, 'outpost', 1900, 'camp:1', true)
    state.buildings.push(outpost)
    state.controlledTerritories.push({ id: 'outpost:1', x: 1900, radius: 450 })
    const after = Math.max(...tradePoints(ctx).map(Math.abs))
    expect(after).toBeGreaterThan(before)
    expect(tradePoints(ctx)).toContain(1900)
  })

  it('traders go home at dusk and back out at dawn', () => {
    const { game } = setup()
    const { state, ctx } = game
    state.buildings.push(createBuilding(ctx, 'market', 360, 'marketR', true))
    const trader = createCitizen(ctx, 360, 'player')
    trader.profession = 'Trader'
    state.citizens.push(trader)
    run(game, 12)
    expect(['GoToPoint', 'Trade']).toContain(trader.brain)
    state.currentPhase = 'Sunset'
    state.timeRemaining = 60
    run(game, 40)
    expect(['ReturnToMarket', 'Shelter']).toContain(trader.brain)
    state.currentPhase = 'Sunrise'
    state.timeRemaining = 60
    run(game, 10)
    expect(['Idle', 'PickRoute', 'GoToPoint']).toContain(trader.brain)
  })
})

describe('relay stations (Örtöö)', () => {
  it('speed the hero up', () => {
    const speedWith = (n: number) => {
      const input = new NullInput()
      const game = new GameManager({ seed: 2, input, persist: false })
      game.state.timeRemaining = 1e6
      game.state.enemyCamps = []
      game.state.enemies = []
      for (let i = 0; i < n; i++)
        game.state.buildings.push(
          createBuilding(
            game.ctx,
            'ortoo',
            560 * (i ? -1 : 1),
            i ? 'ortooL' : 'ortooR',
            true,
          ),
        )
      game.state.hero.x = 0
      input.right = true
      run(game, 3)
      return game.state.hero.vx
    }
    expect(speedWith(1)).toBeGreaterThan(speedWith(0))
    expect(speedWith(2)).toBeGreaterThan(speedWith(1))
  })

  it('fast-travel to the other station for a small fare', () => {
    const { game, input } = setup()
    const { state, ctx } = game
    state.buildings.push(createBuilding(ctx, 'ortoo', 560, 'ortooR', true))
    state.buildings.push(createBuilding(ctx, 'ortoo', -560, 'ortooL', true))
    state.coins = 5
    state.hero.x = 560
    game.step(STEP)
    expect(game.player.current?.id).toMatch(/^travel:/)
    input.press()
    game.step(STEP)
    expect(state.hero.x).toBe(-560)
    expect(state.coins).toBe(5 - game.config.ortoo.travelCost)
  })

  it('travel out to an outpost on the same side, and back', () => {
    const { game, input } = setup()
    const { state, ctx } = game
    state.buildings.push(createBuilding(ctx, 'ortoo', 560, 'ortooR', true))
    state.buildings.push(createBuilding(ctx, 'outpost', 1900, 'camp:1', true))
    state.coins = 5
    state.hero.x = 560
    game.step(STEP)
    input.press()
    game.step(STEP)
    expect(state.hero.x).toBe(1900)
    game.step(STEP)
    input.press()
    game.step(STEP)
    expect(state.hero.x).toBe(560)
  })
})
