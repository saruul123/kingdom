import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { createBuilding } from '../systems/BuildingSystem'
import { createCitizen } from '../systems/CitizenSystem'

function setup() {
  const game = new GameManager({ seed: 5 })
  const { ctx } = game
  const wall = createBuilding(ctx, 'wall', -300, 'wallL1', true)
  game.state.buildings.push(wall)
  const builder = createCitizen(ctx, -50, 'player')
  builder.profession = 'Builder'
  game.state.citizens.push(builder)
  return { game, wall, builder }
}

describe('combat scenarios', () => {
  it('bandits attack the wall and the builder repairs it', () => {
    const { game, wall } = setup()
    game.state.currentPhase = 'Night'
    game.state.timeRemaining = 100
    game.state.hero.x = 0
    game.ctx.sys.enemies.spawn('bandit', -1)
    game.ctx.sys.enemies.spawn('bandit', -1)
    let minHp = wall.health
    let repairedAfterDamage = false
    for (let i = 0; i < 60 * 30; i++) {
      game.step(1 / 30)
      minHp = Math.min(minHp, wall.health)
      if (minHp < wall.maxHealth && wall.health > minHp)
        repairedAfterDamage = true
      if (i % 150 === 0)
        console.log(
          i / 30,
          Math.round(wall.health),
          wall.state,
          game.state.enemies
            .map((e) => `${e.brain}@${Math.round(e.x)}`)
            .join(','),
          game.state.citizens.find((c) => c.profession === 'Builder')?.brain,
        )
    }
    expect(minHp).toBeLessThan(wall.maxHealth)
    expect(repairedAfterDamage).toBe(true)
  })

  it('an undefended kingdom falls: raiders take the banner and leave the territory', () => {
    const game = new GameManager({ seed: 9, persist: false })
    game.state.coins = 0
    game.state.currentPhase = 'Night'
    game.state.timeRemaining = 110
    for (let i = 0; i < 5; i++)
      game.ctx.sys.enemies.spawn('bandit', i % 2 ? 1 : -1)
    for (let i = 0; i < 120 * 30 && game.state.status === 'playing'; i++)
      game.step(1 / 30)
    expect(game.state.status).toBe('gameOver')
    expect(game.state.gameOverReason).toBeTruthy()
  })

  it('archers move to the side that is under attack', () => {
    const { game } = setup()
    const archer = createCitizen(game.ctx, 60, 'player')
    archer.profession = 'Archer'
    game.state.citizens.push(archer)
    game.state.currentPhase = 'Night'
    game.state.timeRemaining = 100
    game.ctx.sys.enemies.spawn('bandit', -1)
    for (let i = 0; i < 40 * 30; i++) game.step(1 / 30)
    expect(archer.postSide).toBe(-1)
  })
})
