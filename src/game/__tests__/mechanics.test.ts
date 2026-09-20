import { describe, expect, it } from 'vitest'
import { createConfig } from '../config'
import { GameManager } from '../GameManager'
import { NullInput } from '../input/Input'
import { currentObjective } from '../ui/objectives'
import { createBuilding } from '../systems/BuildingSystem'
import { createCitizen } from '../systems/CitizenSystem'

const STEP = 1 / 30

function setup(overrides?: Parameters<typeof createConfig>[0]) {
  const input = new NullInput()
  const game = new GameManager({
    seed: 4,
    input,
    persist: false,
    config: createConfig(overrides),
  })
  return { game, input }
}

function run(game: GameManager, seconds: number) {
  for (let i = 0; i < seconds / STEP; i++) game.step(STEP)
}

describe('building upgrades', () => {
  it('a paid wall upgrade is built by a builder and raises level and HP', () => {
    const { game, input } = setup()
    const { state, ctx } = game
    const wall = createBuilding(ctx, 'wall', -300, 'wallL1', true)
    state.buildings.push(wall)
    const builder = createCitizen(ctx, -200, 'player')
    builder.profession = 'Builder'
    state.citizens.push(builder)
    state.coins = 10
    state.hero.x = -300
    state.timeRemaining = 1e6

    game.step(STEP)
    expect(game.player.current?.id).toBe(`upgrade:${wall.id}`)
    input.press()
    game.step(STEP)
    expect(state.coins).toBe(10 - game.config.buildings.wall.upgrades[0].cost)
    expect(wall.upgrading).toBe(true)
    game.step(STEP)
    expect(game.player.current).toBeNull() // no second offer while builders work

    run(game, 40)
    expect(wall.upgrading).toBe(false)
    expect(wall.level).toBe(2)
    expect(wall.maxHealth).toBe(
      game.config.buildings.wall.upgrades[0].maxHealth,
    )
    expect(wall.health).toBe(wall.maxHealth)
  })

  it('a maxed building offers no further upgrade', () => {
    const { game } = setup()
    const wall = createBuilding(game.ctx, 'wall', -300, 'wallL1', true)
    wall.level = 2
    game.state.buildings.push(wall)
    game.state.hero.x = -300
    game.step(STEP)
    expect(game.player.current).toBeNull()
  })

  it('an upgraded tower holds three archers', () => {
    const { game } = setup()
    const tower = createBuilding(game.ctx, 'tower', -215, 'towerL1', true)
    game.state.buildings.push(tower)
    expect(game.ctx.sys.buildings.archerCapacity(tower)).toBe(2)
    tower.level = 2
    expect(game.ctx.sys.buildings.archerCapacity(tower)).toBe(3)
    expect(game.ctx.sys.buildings.extraRange(tower)).toBeGreaterThan(0)
  })
})

describe('night preview', () => {
  it('plans the raid at dusk, warns which side it comes from, and spawns it at night', () => {
    const { game } = setup()
    const toasts: string[] = []
    game.bus.on('toast', (t) => toasts.push(t.text))
    game.state.currentPhase = 'Day'
    game.state.timeRemaining = 0.01
    run(game, 0.2)
    expect(game.state.currentPhase).toBe('Sunset')
    const { left, right } = game.ctx.sys.waves.incoming()
    expect(left + right).toBe(game.state.wave.total)
    expect(left + right).toBeGreaterThan(0)
    expect(game.state.enemies).toHaveLength(0)
    expect(toasts.some((t) => t.includes(String(left)))).toBe(true)

    game.state.timeRemaining = 0.01
    run(game, 0.2)
    expect(game.state.currentPhase).toBe('Night')
    run(game, 60)
    expect(game.state.enemies.length).toBeGreaterThan(0)
  })
})

describe('loot and feedback', () => {
  it('raiders can drop a coin when defeated', () => {
    const { game } = setup({ enemies: { bandit: { coinDropChance: 1 } } })
    game.ctx.sys.enemies.spawn('bandit', 1)
    const before = game.state.coinPickups.length
    game.ctx.sys.damage.damageEnemy(game.state.enemies[0].id, 999)
    expect(game.state.coinPickups.length).toBe(before + 1)
  })

  it('floats a "+N" where the hero picks coins up', () => {
    const { game } = setup()
    const floats: string[] = []
    game.bus.on('float', (f) => floats.push(f.text))
    game.state.coinPickups.push({
      id: 999,
      x: 10,
      amount: 3,
      delay: 0,
      origin: 'cache',
    })
    game.state.hero.x = 10
    game.step(STEP)
    expect(floats).toContain('+3')
  })

  it('reveals the map as the hero explores', () => {
    const { game } = setup()
    const before = game.state.explored.max
    game.state.hero.x = 1500
    game.step(STEP)
    expect(game.state.explored.max).toBeGreaterThan(before)
  })
})

describe('objectives', () => {
  it('walks a new player through coins → recruit → tools → building', () => {
    const { game } = setup()
    const { state, ctx, config } = game
    state.coins = 0
    expect(currentObjective(ctx)?.id).toBe('coins')
    state.coins = 6
    expect(currentObjective(ctx)?.id).toBe('recruit')

    const c = createCitizen(ctx, 20, 'player')
    state.citizens.push(c)
    expect(currentObjective(ctx)?.id).toBe('archer')
    c.pendingProfession = 'Archer'
    expect(currentObjective(ctx)?.id).toBe('recruit') // still needs a builder
    const b = createCitizen(ctx, 30, 'player')
    b.profession = 'Builder'
    state.citizens.push(b)
    c.profession = 'Archer'
    c.pendingProfession = null
    expect(currentObjective(ctx)?.id).toBe('build')
    state.coins = config.buildings.wall.cost - 1
    expect(currentObjective(ctx)?.id).toBe('coins')

    state.currentPhase = 'Night'
    expect(currentObjective(ctx)?.id).toBe('night')
  })
})
