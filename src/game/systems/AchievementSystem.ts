import type { GameContext, System } from '../core/context'
import { mn } from '../i18n'

interface Achievement {
  id: string
  test: (ctx: GameContext) => boolean
}

const playerCitizens = (ctx: GameContext) =>
  ctx.state.citizens.filter((c) => c.owner === 'player' && c.state !== 'Dead')
    .length

/** Milestones checked once a second; earning one shows a toast and is remembered in the save. */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'firstNight', test: (c) => c.state.stats.nightsSurvived >= 1 },
  { id: 'fiveNights', test: (c) => c.state.stats.nightsSurvived >= 5 },
  { id: 'rich', test: (c) => c.state.stats.coinsCollected >= 100 },
  { id: 'slayer', test: (c) => c.state.stats.enemiesKilled >= 25 },
  { id: 'crowd', test: (c) => playerCitizens(c) >= 10 },
  { id: 'campBreaker', test: (c) => c.state.enemyCamps.some((e) => e.cleared) },
  {
    id: 'expander',
    test: (c) =>
      c.state.buildings.some(
        (b) => b.type === 'outpost' && b.state === 'Active',
      ),
  },
  { id: 'eraTwo', test: (c) => c.state.kingdomLevel >= 2 },
  { id: 'eraFour', test: (c) => c.state.kingdomLevel >= 4 },
  {
    id: 'bossSlayer',
    test: (c) => c.state.bossNight.nextNight > c.config.waves.bossInterval,
  },
  {
    id: 'merchant',
    test: (c) => c.state.buildings.some((b) => b.type === 'market'),
  },
]

export class AchievementSystem implements System {
  private timer = 0

  constructor(private ctx: GameContext) {}

  update(dt: number): void {
    this.timer -= dt
    if (this.timer > 0) return
    this.timer = 1
    const { state, bus } = this.ctx
    for (const a of ACHIEVEMENTS) {
      if (state.achievements.includes(a.id) || !a.test(this.ctx)) continue
      state.achievements.push(a.id)
      bus.emit('toast', {
        text: mn.achievement(mn.achievements[a.id]),
        kind: 'good',
      })
      bus.emit('sfx', { name: 'build' })
    }
  }
}
