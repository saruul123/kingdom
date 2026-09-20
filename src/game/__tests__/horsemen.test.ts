import { describe, expect, it } from 'vitest'
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
  const game = new GameManager({ seed: 9, input, persist: false })
  game.state.timeRemaining = 1e6
  game.state.enemyCamps = []
  game.state.enemies = []
  game.state.animals = []
  game.state.coinPickups = []
  game.state.kingdomLevel = 2
  return { game, input }
}

describe('stable and horsemen', () => {
  it('a stable (kingdom level 2) turns free citizens into horsemen, up to its capacity', () => {
    const { game, input } = setup()
    const { state, ctx, config } = game
    state.coins = 30
    state.buildings.push(createBuilding(ctx, 'stable', 258, 'stableR', true))
    for (let i = 0; i < 3; i++)
      state.citizens.push(createCitizen(ctx, 240 + i * 8, 'player'))
    state.hero.x = 258
    for (let n = 0; n < 3; n++) {
      game.step(STEP)
      input.press()
      game.step(STEP)
    }
    const horsemen = () =>
      state.citizens.filter(
        (c) =>
          c.pendingProfession === 'Horseman' || c.profession === 'Horseman',
      )
    expect(horsemen()).toHaveLength(config.buildings.stable.horsemanCapacity!)
    expect(state.coins).toBe(30 - 2 * config.professions.horseman.cost)
    run(game, 10)
    expect(
      state.citizens.filter((c) => c.profession === 'Horseman'),
    ).toHaveLength(2)
  })

  it('cannot be built before kingdom level 2', () => {
    const { game, input } = setup()
    game.state.kingdomLevel = 1
    game.state.buildings.push(
      createBuilding(game.ctx, 'wall', -300, 'wallL1', true),
    )
    game.state.coins = 30
    game.state.hero.x = -258
    game.step(STEP)
    expect(game.player.current?.id).toBe('build:stableL')
    expect(game.player.current?.enabled).toBe(false)
    input.press()
    game.step(STEP)
    expect(game.state.buildings.some((b) => b.type === 'stable')).toBe(false)
  })

  it('a horseman charges a raider that comes near and kills it', () => {
    const { game } = setup()
    const { state, ctx } = game
    const horseman = createCitizen(ctx, 100, 'player')
    horseman.profession = 'Horseman'
    state.citizens.push(horseman)
    state.currentPhase = 'Night'
    state.hero.x = -2000
    const bandit = ctx.sys.enemies.spawn('bandit', 1)!
    bandit.x = 350
    bandit.brain = 'Idle'
    run(game, 15)
    expect(bandit.state).toBe('Dead')
    expect(horseman.state).not.toBe('Dead')
  })

  it('raiders treat horsemen as defenders', () => {
    const { game } = setup()
    const { state, ctx } = game
    const horseman = createCitizen(ctx, 150, 'player')
    horseman.profession = 'Horseman'
    horseman.brain = 'Shelter' // parked, so it won't ride out
    state.citizens.push(horseman)
    state.currentPhase = 'Night'
    state.hero.x = -2000
    const bandit = ctx.sys.enemies.spawn('bandit', 1)!
    bandit.x = 500
    run(game, 0.7)
    expect(bandit.target).toEqual({ kind: 'citizen', id: horseman.id })
  })
})
