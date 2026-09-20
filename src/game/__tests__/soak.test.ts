import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { Bot, runBot } from './bot'

function finite(g: GameManager): boolean {
  const s = g.state
  const xs = [
    s.hero.x,
    ...s.citizens.map((c) => c.x),
    ...s.enemies.map((e) => e.x),
    ...s.animals.map((a) => a.x),
    ...s.projectiles.map((p) => p.x),
    ...s.buildings.map((b) => b.x),
  ]
  return xs.every(Number.isFinite) && Number.isFinite(s.coins)
}

describe('long-run stability', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    it(`plays ${difficulty} through 16 days (boss nights included) without errors or NaNs`, () => {
      const game = new GameManager({ seed: 31, persist: false, difficulty })
      const bot = new Bot()
      ;(game.player as unknown as { input: Bot }).input = bot
      const cycle =
        game.config.time.dayDuration + game.config.time.nightDuration
      let bosses = 0
      game.bus.on('toast', (t) => {
        if (t.text.includes('Том арми')) bosses++
      })
      for (let day = 0; day < 16 && game.state.status === 'playing'; day++) {
        runBot(game, bot, cycle)
        expect(finite(game)).toBe(true)
        expect(game.state.enemies.length).toBeLessThan(120)
        expect(game.state.projectiles.length).toBeLessThan(200)
      }
      // either it survived, or it ended in a proper game over — never a crash
      expect(['playing', 'gameOver']).toContain(game.state.status)
      if (game.state.currentDay >= 8) expect(bosses).toBeGreaterThanOrEqual(1)
    })
  }
})
