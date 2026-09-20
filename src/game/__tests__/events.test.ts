import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { NullInput } from '../input/Input'

const STEP = 1 / 30

function setup(seed = 3) {
  const input = new NullInput()
  const game = new GameManager({ seed, input, persist: false })
  game.state.timeRemaining = 1e6
  game.state.enemyCamps = []
  game.state.enemies = []
  game.state.animals = []
  game.state.coinPickups = []
  return { game, input }
}

const act = (game: GameManager, input: NullInput) => {
  game.step(STEP)
  input.press()
  game.step(STEP)
}

describe('ovoo offerings', () => {
  it('cost coins, can be made once a day, and bring a blessing, coins or nothing', () => {
    const outcomes = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const { game, input } = setup(seed)
      const ovoo = game.state.ovoos[0]
      game.state.coins = 10
      game.state.hero.x = ovoo.x
      act(game, input)
      expect(game.state.coins).toBe(10 - game.config.content.ovooOffering.cost)
      expect(ovoo.usedDay).toBe(game.state.currentDay)
      outcomes.add(
        game.state.blessing > 0
          ? 'blessing'
          : game.state.coinPickups.length > 0
            ? 'coins'
            : 'silent',
      )
      // a second offering on the same day is refused
      act(game, input)
      expect(game.state.coins).toBe(10 - game.config.content.ovooOffering.cost)
    }
    expect(outcomes).toEqual(new Set(['blessing', 'coins', 'silent']))
  })

  it('a blessing strengthens archers for one night', () => {
    const { game } = setup()
    game.state.blessing = 1
    game.state.currentPhase = 'Night'
    game.state.wave.queue = []
    game.state.timeRemaining = 0.01
    for (let i = 0; i < 10; i++) game.step(STEP)
    expect(game.state.blessing).toBe(0)
  })
})

describe('wells', () => {
  it('refill stamina and speed the hero up, once a day', () => {
    const { game, input } = setup()
    const well = game.state.wells[0]
    game.state.hero.x = well.x
    game.state.hero.stamina = 0
    game.state.hero.exhausted = true
    act(game, input)
    expect(game.state.hero.stamina).toBeGreaterThan(
      game.config.hero.maxStamina - 0.5,
    )
    expect(game.state.hero.boost).toBeGreaterThan(30)
    expect(game.state.hero.exhausted).toBe(false)
    game.state.hero.boost = 0
    act(game, input)
    expect(game.state.hero.boost).toBe(0)
  })
})

describe('ruins', () => {
  it('pay loot once, then are spent', () => {
    const { game, input } = setup()
    const ruin = game.state.ruins[0]
    game.state.coins = 5
    game.state.hero.x = ruin.x
    act(game, input)
    expect(ruin.looted).toBe(true)
    const loot = game.state.coinPickups.reduce((n, c) => n + c.amount, 0)
    expect(loot).toBeGreaterThanOrEqual(game.config.content.ruins.loot[0])
    act(game, input)
    expect(game.state.coinPickups.reduce((n, c) => n + c.amount, 0)).toBe(loot)
  })

  it('sometimes hide an ambush', () => {
    let ambushed = 0
    for (let seed = 1; seed <= 40; seed++) {
      const { game, input } = setup(seed)
      game.state.coins = 5
      game.state.hero.x = game.state.ruins[0].x
      act(game, input)
      if (game.state.enemies.length > 0) ambushed++
    }
    expect(ambushed).toBeGreaterThan(3)
    expect(ambushed).toBeLessThan(25)
  })

  it('a fresh ruin turns up every few days', () => {
    const { game } = setup()
    const before = game.state.ruins.length
    game.state.currentDay = game.config.content.ruins.newEveryDays - 1
    game.state.currentPhase = 'Night'
    game.state.wave.queue = []
    game.state.timeRemaining = 0.01
    for (let i = 0; i < 10; i++) game.step(STEP)
    expect(game.state.ruins.length).toBe(before + 1)
  })
})
