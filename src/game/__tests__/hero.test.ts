import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { NullInput } from '../input/Input'
import { createCitizen } from '../systems/CitizenSystem'

const STEP = 1 / 30

/** A game with no enemy camps, so only the enemies a test spawns exist. */
function make(opts: ConstructorParameters<typeof GameManager>[0] = {}) {
  const g = new GameManager({ persist: false, ...opts })
  g.state.enemyCamps = []
  g.state.enemies = []
  return g
}
const run = (g: GameManager, s: number) => {
  for (let i = 0; i < s / STEP; i++) g.step(STEP)
}

function setup() {
  const input = new NullInput()
  const game = make({ seed: 3, input })
  game.state.timeRemaining = 1e6
  game.state.animals = []
  game.state.coinPickups = []
  return { game, input }
}

describe('hero combat', () => {
  it('shoots the nearest raider in range and can kill it', () => {
    const { game, input } = setup()
    game.ctx.sys.enemies.spawn('bandit', 1)
    const bandit = game.state.enemies[0]
    bandit.x = 200
    bandit.brain = 'Idle'
    game.state.currentPhase = 'Night'
    game.state.hero.x = 0
    input.attack = true
    run(game, 6)
    expect(bandit.state).toBe('Dead')
    expect(game.state.hero.facing).toBe(1)
  })

  it('does not shoot targets beyond range', () => {
    const { game, input } = setup()
    game.ctx.sys.enemies.spawn('bandit', 1)
    game.state.enemies[0].x = 900
    game.state.hero.x = 0
    input.attack = true
    run(game, 2)
    expect(game.state.projectiles).toHaveLength(0)
  })

  it('hunting game with the bow pays out immediately', () => {
    const { game, input } = setup()
    game.state.animals.push({
      id: 999,
      type: 'rabbit',
      x: 150,
      facing: 1,
      health: 4,
      state: 'Idle',
      timer: 0,
      targetX: 150,
      reward: 1,
      claimedBy: null,
      deadTimer: 0,
      cooldown: 0,
    })
    game.state.hero.x = 0
    input.attack = true
    run(game, 3)
    expect(game.state.animals[0].state).toBe('Dead')
    expect(game.state.coinPickups.reduce((n, c) => n + c.amount, 0)).toBe(1)
  })
})

describe('wolves', () => {
  it('bite the hero (costing coins) and citizens caught in the open', () => {
    const { game } = setup()
    game.state.coins = 5
    game.state.hero.x = 800
    game.state.animals.push({
      id: 998,
      type: 'wolf',
      x: 830,
      facing: -1,
      health: 28,
      state: 'Idle',
      timer: 0,
      targetX: 830,
      reward: 4,
      claimedBy: null,
      deadTimer: 0,
      cooldown: 0,
    })
    run(game, 3)
    expect(game.state.coins).toBeLessThan(5)

    const { game: g2 } = setup()
    const c = createCitizen(g2.ctx, 700, 'player')
    g2.state.citizens.push(c)
    g2.state.hero.x = -2000
    g2.state.animals.push({
      id: 997,
      type: 'wolf',
      x: 760,
      facing: -1,
      health: 28,
      state: 'Idle',
      timer: 0,
      targetX: 760,
      reward: 4,
      claimedBy: null,
      deadTimer: 0,
      cooldown: 0,
    })
    run(g2, 8)
    expect(c.health).toBeLessThan(c.maxHealth)
  })

  it('a hunted wolf pays its reward', () => {
    const { game, input } = setup()
    const start = game.state.coins
    game.state.hero.x = 200
    game.state.animals.push({
      id: 996,
      type: 'wolf',
      x: 400,
      facing: -1,
      health: 28,
      state: 'Idle',
      timer: 0,
      targetX: 400,
      reward: 4,
      claimedBy: null,
      deadTimer: 0,
      cooldown: 0,
    })
    input.attack = true
    run(game, 8)
    expect(game.state.animals[0].state).toBe('Dead')
    // coins the wolf knocked loose are still around, so count everything
    const total =
      game.state.coins +
      game.state.coinPickups.reduce((n, c) => n + c.amount, 0)
    expect(total).toBe(start + 4)
  })
})
