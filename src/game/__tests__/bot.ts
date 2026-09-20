import type { GameManager } from '../GameManager'
import type { InputSource } from '../input/Input'
import { isAlive, playerCitizens } from '../core/lookup'

/** A scripted player that rides around and spends coins sensibly. Used to test the MVP loop. */
export class Bot implements InputSource {
  left = false
  right = false
  sprint = true
  private wantsInteract = false
  goal = ''

  consumeInteract(): boolean {
    const v = this.wantsInteract
    this.wantsInteract = false
    return v
  }

  think(game: GameManager): void {
    const { state, config } = game
    const hero = state.hero
    const citizens = playerCitizens(state)
    const archers = citizens.filter(
      (c) => c.profession === 'Archer' || c.pendingProfession === 'Archer',
    ).length
    const builders = citizens.filter(
      (c) => c.profession === 'Builder' || c.pendingProfession === 'Builder',
    ).length
    const free = citizens.filter(
      (c) => c.profession === 'Citizen' && !c.pendingProfession,
    ).length
    const dusk =
      state.currentPhase === 'Sunset' || state.currentPhase === 'Night'

    let target: { x: number; id?: string } | null = null

    const stand = (prof: string) =>
      config.content.stands.find((s) => s.profession === prof)!
    const wantBuilder = builders < 1
    const wantArcher = archers < 4

    // 1. Spend on things that make the settlement stronger.
    if (
      free > 0 &&
      wantBuilder &&
      state.coins >= config.professions.builder.cost
    ) {
      target = { x: stand('builder').x, id: 'stand:hammerRack' }
    } else if (
      free > 0 &&
      wantArcher &&
      state.coins >= config.professions.archer.cost
    ) {
      target = { x: stand('archer').x, id: 'stand:bowRack' }
    } else {
      const point = config.content.buildPoints.find((p) => {
        if (state.buildings.some((b) => b.buildPointId === p.id)) return false
        if (
          p.requires &&
          !state.buildings.some(
            (b) =>
              b.buildPointId === p.requires &&
              b.state !== 'Planned' &&
              b.state !== 'UnderConstruction',
          )
        )
          return false
        return (
          state.coins >= config.buildings[p.building].cost &&
          archers >= 2 &&
          builders >= 1
        )
      })
      if (point) target = { x: point.x, id: `build:${point.id}` }
    }

    // 2. Recruit when there is nobody free to assign.
    if (
      !target &&
      !dusk &&
      free === 0 &&
      state.coins >= config.recruitCost &&
      (wantBuilder || wantArcher)
    ) {
      const neutral = state.citizens
        .filter((c) => c.owner === 'neutral' && isAlive(c))
        .sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x))
        .at(0)
      if (neutral) target = { x: neutral.x, id: `recruit:${neutral.id}` }
    }

    // 3. Gather coins (by day only, and not too far).
    if (!target && !dusk) {
      const coin = state.coinPickups
        .filter((c) => Math.abs(c.x) < 2200)
        .sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x))
        .at(0)
      if (coin) target = { x: coin.x }
    }

    // 4. Otherwise go home.
    if (!target) target = { x: dusk ? -20 : 0 }

    this.goal = target.id ?? `go:${Math.round(target.x)}`
    const dx = target.x - hero.x
    this.left = dx < -6
    this.right = dx > 6
    if (target.id) {
      const cur = game.player.current
      if (cur && cur.id === target.id && Math.abs(dx) < cur.radius * 0.6)
        this.wantsInteract = true
    }
  }
}

export function runBot(
  game: GameManager,
  bot: Bot,
  seconds: number,
  dt = 1 / 30,
): void {
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i++) {
    if (game.state.status !== 'playing') return
    if (i % 3 === 0) bot.think(game)
    game.step(dt)
  }
}
