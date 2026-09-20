import type { CitizenApi, GameContext, System } from '../core/context'
import { isAlive, newId } from '../core/lookup'
import type { Camp, Citizen } from '../core/types'

export function createCitizen(
  ctx: GameContext,
  x: number,
  owner: Citizen['owner'],
): Citizen {
  const { config, rng, state } = ctx
  return {
    id: newId(state),
    owner,
    profession: 'Citizen',
    health: config.citizen.health,
    maxHealth: config.citizen.health,
    x,
    facing: rng.sign(),
    state: 'Idle',
    brain: 'Idle',
    target: null,
    timer: rng.range(0, 2),
    cooldown: 0,
    homeX: x,
    carrying: 0,
    pendingProfession: null,
    postBuildingId: null,
    postX: x,
    postSide: 1,
    campId: null,
    deadTimer: 0,
  }
}

/** Neutral population living around camps; the player recruits from here. */
export class CitizenSystem implements System, CitizenApi {
  constructor(private ctx: GameContext) {
    ctx.bus.on('phaseChanged', ({ phase }) => {
      if (phase === 'Sunrise') this.respawnDaily()
    })
  }

  update(): void {}

  neutralCount(camp: Camp): number {
    return this.ctx.state.citizens.filter(
      (c) => c.owner === 'neutral' && c.campId === camp.id && isAlive(c),
    ).length
  }

  spawnNeutral(camp: Camp): void {
    const { state, rng } = this.ctx
    const c = createCitizen(this.ctx, camp.x + rng.range(-35, 35), 'neutral')
    c.campId = camp.id
    c.homeX = camp.x
    state.citizens.push(c)
  }

  private respawnDaily(): void {
    const { state, config, rng } = this.ctx
    let budget = config.content.camps.respawnPerDay
    const open = state.camps.filter((c) => this.neutralCount(c) < c.capacity)
    while (budget-- > 0 && open.length > 0) {
      const i = rng.int(0, open.length - 1)
      this.spawnNeutral(open[i])
      if (this.neutralCount(open[i]) >= open[i].capacity) open.splice(i, 1)
    }
  }
}
