import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import { ACHIEVEMENTS } from '../systems/AchievementSystem'

const STEP = 1 / 30

describe('achievements', () => {
  it('are earned when their condition is met, once, with a toast', () => {
    const game = new GameManager({ seed: 1, persist: false })
    game.state.timeRemaining = 1e6
    const toasts: string[] = []
    game.bus.on('toast', (t) => toasts.push(t.text))
    for (let i = 0; i < 40; i++) game.step(STEP)
    const startCount = game.state.achievements.length

    game.state.stats.nightsSurvived = 1
    game.state.kingdomLevel = 2
    for (let i = 0; i < 40; i++) game.step(STEP)
    expect(game.state.achievements).toContain('firstNight')
    expect(game.state.achievements).toContain('eraTwo')
    expect(game.state.achievements.length).toBe(startCount + 2)
    expect(toasts.filter((t) => t.startsWith('Амжилт')).length).toBe(2)

    for (let i = 0; i < 90; i++) game.step(STEP)
    expect(toasts.filter((t) => t.startsWith('Амжилт')).length).toBe(2) // not repeated
  })

  it('every achievement has a Mongolian label', async () => {
    const { mn } = await import('../i18n')
    for (const a of ACHIEVEMENTS) expect(mn.achievements[a.id]).toBeTruthy()
  })
})
