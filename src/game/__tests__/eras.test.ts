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
  const game = new GameManager({ seed: 5, input, persist: false })
  game.state.timeRemaining = 1e6
  game.state.enemyCamps = []
  game.state.enemies = []
  game.state.animals = []
  return { game, input }
}

describe('eras', () => {
  it('upgrading the central ger raises the kingdom level and era', () => {
    const { game, input } = setup()
    const { state, ctx } = game
    const eras: number[] = []
    game.bus.on('eraChanged', (e) => eras.push(e.era))
    const builder = createCitizen(ctx, 40, 'player')
    builder.profession = 'Builder'
    state.citizens.push(builder)
    state.coins = 100
    state.hero.x = 0
    game.step(STEP)
    expect(game.player.current?.id).toMatch(/^upgrade:/)
    input.press()
    game.step(STEP)
    run(game, 45)
    const ger = state.buildings.find((b) => b.type === 'ger')!
    expect(ger.level).toBe(2)
    expect(state.kingdomLevel).toBe(2)
    expect(state.era).toBe(2)
    expect(eras).toEqual([2])
    expect(ger.maxHealth).toBe(game.config.buildings.ger.upgrades[0].maxHealth)
  })

  it('stone walls and the strongest towers wait for kingdom level 3', () => {
    const { game, input } = setup()
    const { state, ctx } = game
    const wall = createBuilding(ctx, 'wall', -300, 'wallL1', true)
    wall.level = 2
    state.buildings.push(wall)
    state.coins = 50
    state.hero.x = -300
    game.step(STEP)
    const locked = game.player.current
    expect(locked?.id).toBe(`upgrade:${wall.id}`)
    expect(locked?.enabled).toBe(false)
    input.press()
    game.step(STEP)
    expect(wall.upgrading).toBe(false)
    expect(state.coins).toBe(50)

    state.kingdomLevel = 3
    game.step(STEP)
    expect(game.player.current?.enabled).toBe(true)
    input.press()
    game.step(STEP)
    expect(wall.upgrading).toBe(true)
  })

  it('gates need kingdom level 2 and are the first thing heavy raiders attack', () => {
    const { game, input } = setup()
    const { state, ctx } = game
    state.buildings.push(createBuilding(ctx, 'wall', -300, 'wallL1', true))
    state.coins = 30
    state.hero.x = -455
    game.step(STEP)
    expect(game.player.current?.id).toBe('build:gateL')
    expect(game.player.current?.enabled).toBe(false)
    input.press()
    game.step(STEP)
    expect(state.buildings.some((b) => b.type === 'gate')).toBe(false)

    state.kingdomLevel = 2
    const gate = createBuilding(ctx, 'gate', -455, 'gateL', true)
    state.buildings.push(gate)
    state.currentPhase = 'Night'
    const heavy = ctx.sys.enemies.spawn('heavy', -1)!
    heavy.x = -700
    state.hero.x = 2000
    run(game, 12)
    expect(heavy.target).toEqual({ kind: 'building', id: gate.id })
  })
})
