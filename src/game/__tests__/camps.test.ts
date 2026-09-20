import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { NullInput } from '../input/Input'
import { createCitizen } from '../systems/CitizenSystem'

const STEP = 1 / 30
const run = (g: GameManager, s: number) => {
  for (let i = 0; i < s / STEP; i++) g.step(STEP)
}

function setup(seed = 12) {
  const input = new NullInput()
  const game = new GameManager({ seed, input, persist: false })
  game.state.timeRemaining = 1e6
  return { game, input }
}

describe('enemy camps', () => {
  it('are generated on both sides, well outside the settlement, with guards', () => {
    const { game } = setup()
    const { enemyCamps } = game.state
    const cfg = game.config.content.enemyCamps
    expect(enemyCamps.length).toBeGreaterThanOrEqual(2)
    expect(enemyCamps.some((c) => c.x < 0)).toBe(true)
    expect(enemyCamps.some((c) => c.x > 0)).toBe(true)
    for (const c of enemyCamps) {
      expect(Math.abs(c.x)).toBeGreaterThanOrEqual(cfg.minX)
      const guards = game.state.enemies.filter((e) => e.campId === c.id)
      expect(guards).toHaveLength(cfg.maxGuards)
    }
  })

  it('guards stay home, but chase and hurt a hero who rides in', () => {
    const { game } = setup()
    const camp = game.state.enemyCamps.find((c) => c.x > 0)!
    const guards = game.state.enemies.filter((e) => e.campId === camp.id)
    run(game, 10)
    expect(guards.every((g) => Math.abs(g.x - camp.x) < 120)).toBe(true)

    let hits = 0
    game.bus.on('heroHit', () => hits++)
    game.state.coins = 6
    game.state.hero.x = camp.x - 200
    run(game, 8)
    expect(hits).toBeGreaterThan(0)
  })

  it('the hero can tear a camp down for loot; its guards flee', () => {
    const { game, input } = setup()
    const camp = game.state.enemyCamps.find((c) => c.x > 0)!
    game.state.enemies = game.state.enemies.filter((e) => e.campId !== camp.id) // clear the way
    const pickups = game.state.coinPickups.length
    game.state.hero.x = camp.x - 250
    input.attack = true
    run(game, 25)
    expect(camp.cleared).toBe(true)
    expect(game.state.coinPickups.length).toBeGreaterThan(pickups)
  })

  it('destroyed camp guards leave instead of guarding ruins', () => {
    const { game } = setup()
    const camp = game.state.enemyCamps[0]
    game.ctx.sys.damage.damageCamp(camp.id, 9999)
    const guards = game.state.enemies.filter((e) => e.state !== 'Dead')
    const former = guards.filter((e) => e.brain === 'Retreat')
    expect(former.length).toBeGreaterThan(0)
    expect(former.every((e) => e.campId === null)).toBe(true)
  })

  it('every standing camp adds raiders at its own doorstep to the night raid', () => {
    const { game } = setup()
    game.state.currentPhase = 'Day'
    game.state.timeRemaining = 0.01
    run(game, 0.2)
    const fromCamps = game.state.wave.queue.filter((q) => q.x !== undefined)
    expect(fromCamps.length).toBe(
      game.state.enemyCamps.length *
        game.config.content.enemyCamps.raidersPerNight,
    )
    // a cleared camp stops sending them
    const { game: g2 } = setup()
    for (const c of g2.state.enemyCamps)
      g2.ctx.sys.damage.damageCamp(c.id, 9999)
    g2.state.currentPhase = 'Day'
    g2.state.timeRemaining = 0.01
    run(g2, 0.2)
    expect(g2.state.wave.queue.filter((q) => q.x !== undefined)).toHaveLength(0)
  })

  it('guards do not stop the night from ending', () => {
    const { game } = setup()
    game.state.currentPhase = 'Night'
    game.state.timeRemaining = 60
    game.state.wave.queue = []
    run(game, 3)
    expect(game.state.currentPhase).not.toBe('Night')
  })
})

describe('outposts', () => {
  it('a cleared camp can be claimed: builders raise an outpost, the border moves out', () => {
    const { game, input } = setup()
    const { state, ctx } = game
    const camp = state.enemyCamps.find((c) => c.x > 0)!
    ctx.sys.damage.damageCamp(camp.id, 9999)
    state.enemies = state.enemies.filter(
      (e) => e.campId === null && e.state !== 'Dead' && false,
    )
    state.coinPickups = []
    state.coins = 30
    state.hero.x = camp.x
    game.step(STEP)
    expect(game.player.current?.id).toBe(`outpost:${camp.id}`)
    const before = state.controlledTerritories.length
    input.press()
    game.step(STEP)
    expect(state.coins).toBe(30 - game.config.content.enemyCamps.outpostCost)
    const outpost = state.buildings.find((b) => b.type === 'outpost')!
    expect(outpost.state).toBe('Planned')

    const builder = createCitizen(ctx, camp.x - 40, 'player')
    builder.profession = 'Builder'
    state.citizens.push(builder)
    state.hero.x = -2000
    run(game, 40)
    expect(outpost.state).toBe('Active')
    expect(state.controlledTerritories.length).toBe(before + 1)
    expect(ctx.sys.territory.contains(camp.x + 300)).toBe(true)
    expect(state.extraBuildPoints.length).toBe(1)
  })
})
