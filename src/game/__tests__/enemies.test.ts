import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { createBuilding } from '../systems/BuildingSystem'

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

function planned(
  day: number,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal',
) {
  const game = make({ seed: 8, difficulty })
  game.state.currentDay = day
  game.state.currentPhase = 'Day'
  game.state.timeRemaining = 0.01
  run(game, 0.2) // → Sunset: the raid is planned
  return game
}

describe('enemy variety', () => {
  it('archer raiders shoot buildings from a distance', () => {
    const game = make({ seed: 1 })
    const tower = createBuilding(game.ctx, 'tower', -215, 'towerL1', true)
    game.state.buildings.push(tower)
    game.state.currentPhase = 'Night'
    game.state.timeRemaining = 1e6
    game.state.hero.x = 2000
    game.ctx.sys.enemies.spawn('archer_raider', -1)
    const raider = game.state.enemies[0]
    let closest = Infinity
    for (let i = 0; i < 60 / STEP && tower.health === tower.maxHealth; i++) {
      game.step(STEP)
      closest = Math.min(closest, Math.abs(raider.x - tower.x))
    }
    expect(tower.health).toBeLessThan(tower.maxHealth)
    expect(closest).toBeGreaterThan(120) // never closed to melee range
  })

  it('heavy soldiers and rams hit walls harder than bandits do', () => {
    const damageOf = (type: string) => {
      const game = make({ seed: 1 })
      const wall = createBuilding(game.ctx, 'wall', -300, 'wallL1', true)
      game.state.buildings.push(wall)
      game.state.currentPhase = 'Night'
      game.state.timeRemaining = 1e6
      game.state.hero.x = 2000
      game.ctx.sys.enemies.spawn(type, -1)
      game.state.enemies[0].x = -335
      game.state.enemies[0].cooldown = 0
      run(game, 0.5)
      return wall.maxHealth - wall.health
    }
    const bandit = damageOf('bandit')
    expect(bandit).toBeGreaterThan(0)
    expect(damageOf('heavy')).toBeGreaterThan(bandit)
    expect(damageOf('siege')).toBeGreaterThan(damageOf('heavy'))
  })

  it('fast horse raiders reach the settlement sooner than bandits', () => {
    const time = (type: string) => {
      const game = make({ seed: 1 })
      game.state.currentPhase = 'Night'
      game.state.timeRemaining = 1e6
      game.state.hero.x = 2000
      game.ctx.sys.enemies.spawn(type, -1)
      const e = game.state.enemies[0]
      let t = 0
      while (e.x < -400 && t < 60) {
        game.step(STEP)
        t += STEP
      }
      return t
    }
    expect(time('horse_raider')).toBeLessThan(time('bandit') / 1.5)
  })
})

describe('boss night', () => {
  it('every 7th night brings extra heavy units and a siege engine, and pays a reward', () => {
    const game = planned(7)
    expect(game.state.bossNight.active).toBe(true)
    const types = new Set(game.state.wave.queue.map((q) => q.type))
    expect(types.has('siege')).toBe(true)
    expect(types.has('heavy')).toBe(true)
    const normal = planned(6)
    expect(normal.state.bossNight.active).toBe(false)
    expect(game.state.wave.total).toBeGreaterThan(normal.state.wave.total)

    game.state.currentPhase = 'Night'
    game.state.wave.queue = []
    game.state.enemies = []
    const before = game.state.coinPickups.length
    game.state.timeRemaining = 0.01
    run(game, 0.3)
    expect(game.state.coinPickups.length).toBeGreaterThan(before)
    expect(game.state.bossNight.active).toBe(false)
    expect(game.state.bossNight.nextNight).toBe(14)
  })
})

describe('difficulty', () => {
  it('scales raid size and raider health', () => {
    const easy = planned(5, 'easy').state.wave.total
    const normal = planned(5, 'normal').state.wave.total
    const hard = planned(5, 'hard').state.wave.total
    expect(easy).toBeLessThan(normal)
    expect(hard).toBeGreaterThan(normal)

    const hp = (d: 'easy' | 'normal' | 'hard') => {
      const g = make({ seed: 1, difficulty: d })
      g.ctx.sys.enemies.spawn('bandit', 1)
      return g.state.enemies[0].health
    }
    expect(hp('easy')).toBeLessThan(hp('normal'))
    expect(hp('hard')).toBeGreaterThan(hp('normal'))
  })
})
