import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { createConfig } from '../config'
import { playerCitizens } from '../core/lookup'
import { Bot, runBot } from './bot'

const totalDay = (g: GameManager) =>
  g.config.time.dayDuration + g.config.time.nightDuration

describe('time', () => {
  it('starts in daylight, then cycles Sunset → Night → Sunrise → Day with configurable durations', () => {
    const game = new GameManager({
      seed: 1,
      overrides: {
        time: {
          dayDuration: 60,
          nightDuration: 20,
          sunsetDuration: 10,
          sunriseDuration: 5,
        },
      },
    })
    const seen: string[] = []
    game.bus.on('phaseChanged', ({ phase }) => seen.push(phase))
    for (let i = 0; i < 90 * 30; i++) game.step(1 / 30)
    expect(game.state.currentPhase).toBe('Day')
    expect(seen).toEqual(['Sunset', 'Night', 'Sunrise', 'Day'])
    expect(game.state.currentDay).toBe(2)
  })
})

describe('world', () => {
  it('generates a settlement, camps with neutral citizens, coins and wildlife', () => {
    const game = new GameManager({ seed: 7 })
    const s = game.state
    expect(s.buildings.filter((b) => b.type === 'ger')).toHaveLength(1)
    expect(
      s.citizens.filter((c) => c.owner === 'neutral').length,
    ).toBeGreaterThan(4)
    expect(s.coinPickups.length).toBeGreaterThan(4)
    expect(s.animals.length).toBeGreaterThan(4)
    expect(s.coins).toBe(game.config.hero.startCoins)
  })

  it('is deterministic for a seed', () => {
    const a = new GameManager({ seed: 42 })
    const b = new GameManager({ seed: 42 })
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state))
  })
})

describe('save', () => {
  it('round-trips through JSON and keeps running', () => {
    const game = new GameManager({ seed: 3 })
    const bot = new Bot()
    ;(game.player as unknown as { input: Bot }).input = bot
    runBot(game, bot, 60)
    const copy = JSON.parse(JSON.stringify(game.state))
    const loaded = new GameManager({ state: copy })
    expect(loaded.state.coins).toBe(game.state.coins)
    for (let i = 0; i < 300; i++) loaded.step(1 / 30)
    expect(loaded.state.status).toBe('playing')
  })
})

describe('MVP loop', () => {
  it('lets a player recruit, assign professions, build, and survive the first nights', () => {
    const game = new GameManager({ seed: 11 })
    const bot = new Bot()
    ;(game.player as unknown as { input: Bot }).input = bot

    const events = {
      recruited: 0,
      professions: [] as string[],
      built: [] as string[],
      kills: 0,
      spawned: 0,
    }
    game.bus.on('citizenRecruited', () => events.recruited++)
    game.bus.on('professionAssigned', (e) =>
      events.professions.push(e.profession),
    )
    game.bus.on('buildingCompleted', (e) => events.built.push(e.type))
    game.bus.on('enemyKilled', () => events.kills++)
    game.bus.on('enemySpawned', () => events.spawned++)

    runBot(game, bot, totalDay(game) * 3)

    expect(game.state.status).toBe('playing')
    expect(game.state.stats.nightsSurvived).toBeGreaterThanOrEqual(3)
    expect(events.recruited).toBeGreaterThanOrEqual(2)
    expect(events.professions).toContain('Archer')
    expect(events.professions).toContain('Builder')
    expect(events.built).toContain('wall')
    expect(events.spawned).toBeGreaterThan(0)
    expect(events.kills).toBeGreaterThan(0)
    expect(playerCitizens(game.state).length).toBeGreaterThanOrEqual(2)
    console.log(
      JSON.stringify({
        day: game.state.currentDay,
        coins: game.state.coins,
        events,
        stats: game.state.stats,
        citizens: playerCitizens(game.state).length,
        buildings: game.state.buildings.map(
          (b) => `${b.type}:${b.state}:${Math.round(b.health)}`,
        ),
      }),
    )
  })

  it('config-driven: enemy stats come from data, not code', () => {
    const cfg = createConfig({ enemies: { bandit: { health: 999 } } })
    const game = new GameManager({ seed: 1, config: cfg })
    game.ctx.sys.enemies.spawn('bandit', 1)
    expect(game.state.enemies[0].health).toBe(999)
  })
})
