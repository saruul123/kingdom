import { describe, expect, it } from 'vitest'
import { GameManager } from '../GameManager'
import type { InputSource } from '../input/Input'

function setup() {
  const input: InputSource = {
    left: false,
    right: false,
    sprint: false,
    consumeInteract: () => false,
  }
  const game = new GameManager({ seed: 2, input, persist: false })
  return { game, input }
}

describe('mounted movement', () => {
  it('keeps facing in the actual direction of travel while reversing', () => {
    const { game, input } = setup()
    input.right = true
    for (let i = 0; i < 30; i++) game.step(1 / 60)
    expect(game.state.hero.vx).toBeGreaterThan(0)
    expect(game.state.hero.facing).toBe(1)

    input.right = false
    input.left = true
    game.step(1 / 60)
    expect(game.state.hero.vx).toBeGreaterThan(0)
    expect(game.state.hero.facing).toBe(1)

    for (let i = 0; i < 40; i++) game.step(1 / 60)
    expect(game.state.hero.vx).toBeLessThan(0)
    expect(game.state.hero.facing).toBe(-1)
  })

  it('comes to rest and does not build up velocity against a world edge', () => {
    const { game, input } = setup()
    input.right = true
    for (let i = 0; i < 50; i++) game.step(1 / 60)
    input.right = false
    for (let i = 0; i < 30; i++) game.step(1 / 60)
    expect(game.state.hero.vx).toBe(0)

    game.state.hero.x = game.config.world.maxX
    input.right = true
    game.step(1 / 60)
    expect(game.state.hero.x).toBe(game.config.world.maxX)
    expect(game.state.hero.vx).toBe(0)
  })
})
