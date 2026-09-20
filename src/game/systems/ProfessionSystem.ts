import type {
  GameContext,
  Interaction,
  InteractionProvider,
  System,
} from '../core/context'
import { isAlive, isBuildingStanding } from '../core/lookup'
import type { Citizen } from '../core/types'
import { mn } from '../i18n'

export const gerOffset = (ctx: GameContext, dx: number): number =>
  (ctx.sys.buildings.ger()?.x ?? 0) + dx

const PROFESSION_ID = {
  archer: 'Archer',
  builder: 'Builder',
  herder: 'Herder',
} as const

const IDLE_BRAINS = new Set(['Idle', 'GoToSettlement', 'Flee'])

/**
 * Tool stands turn an unemployed citizen into an Archer or Builder.
 * Paying at a stand sends the closest free citizen to pick up the tool.
 */
export class ProfessionSystem implements System, InteractionProvider {
  constructor(private ctx: GameContext) {}

  update(): void {}

  private freeCitizens(): Citizen[] {
    return this.ctx.state.citizens.filter(
      (c) =>
        c.owner === 'player' &&
        isAlive(c) &&
        c.profession === 'Citizen' &&
        c.pendingProfession === null &&
        IDLE_BRAINS.has(c.brain),
    )
  }

  gatherInteractions(out: Interaction[]): void {
    const { config } = this.ctx
    const free = this.freeCitizens().length
    // stables and markets turn a free citizen into a horseman / trader
    for (const b of this.ctx.state.buildings) {
      const job =
        b.type === 'stable' ? 'Horseman' : b.type === 'market' ? 'Trader' : null
      if (!job || !isBuildingStanding(b)) continue
      const def =
        job === 'Horseman'
          ? config.professions.horseman
          : config.professions.trader
      const full = this.freeSlots(job === 'Horseman' ? 'stable' : 'market') <= 0
      const reason =
        free <= 0 ? mn.noFreeCitizens : full ? mn.noSlots : undefined
      out.push({
        id: `${b.type}:${b.id}`,
        x: b.x,
        radius: 40,
        label: mn.makeProfession(config.buildings[b.type].label, def.label),
        cost: def.cost,
        enabled: reason === undefined,
        disabledReason: reason,
        execute: () => this.assignAt(b.x, job, def.cost),
      })
    }
    for (const stand of config.content.stands) {
      const def = config.professions[stand.profession]
      // herders need somewhere to work
      const noPasture =
        stand.profession === 'herder' && this.freePastureSlots() <= 0
      const reason =
        free <= 0 ? mn.noFreeCitizens : noPasture ? mn.noPasture : undefined
      out.push({
        id: `stand:${stand.id}`,
        x: stand.x,
        radius: 34,
        label: mn.makeProfession(stand.label, def.label),
        cost: def.cost,
        enabled: reason === undefined,
        disabledReason: reason,
        execute: () => this.assign(stand.x, stand.profession),
      })
    }
  }

  /** Places left in stables / markets after counting workers already assigned or on their way. */
  private freeSlots(type: 'stable' | 'market'): number {
    const { state, config } = this.ctx
    const job = type === 'stable' ? 'Horseman' : 'Trader'
    const capacity = state.buildings
      .filter((b) => b.type === type && isBuildingStanding(b))
      .reduce((sum, b) => {
        const def = config.buildings[b.type]
        const per =
          type === 'stable' ? def.horsemanCapacity : def.traderCapacity
        return sum + (per ?? 0)
      }, 0)
    const workers = state.citizens.filter(
      (c) =>
        c.owner === 'player' &&
        isAlive(c) &&
        (c.profession === job || c.pendingProfession === job),
    ).length
    return capacity - workers
  }

  private assignAt(x: number, job: 'Horseman' | 'Trader', cost: number): void {
    const { sys } = this.ctx
    const citizen = this.freeCitizens()
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))
      .at(0)
    if (!citizen) return
    if (!sys.economy.trySpend(cost)) return
    citizen.pendingProfession = job
    citizen.postX = x
    citizen.brain = 'GoToStand'
    citizen.state = 'Moving'
    citizen.timer = 0
  }

  /** Pasture places not yet taken by a herder (working or on the way). */
  private freePastureSlots(): number {
    const { state, config } = this.ctx
    const capacity = state.buildings
      .filter((b) => b.type === 'pasture' && isBuildingStanding(b))
      .reduce((sum, b) => sum + config.buildings[b.type].herderCapacity, 0)
    const herders = state.citizens.filter(
      (c) =>
        c.owner === 'player' &&
        isAlive(c) &&
        (c.profession === 'Herder' || c.pendingProfession === 'Herder'),
    ).length
    return capacity - herders
  }

  private assign(
    standX: number,
    profession: 'archer' | 'builder' | 'herder',
  ): void {
    const { config, sys } = this.ctx
    const free = this.freeCitizens().sort(
      (a, b) => Math.abs(a.x - standX) - Math.abs(b.x - standX),
    )
    const citizen = free.at(0)
    if (!citizen) return
    if (!sys.economy.trySpend(config.professions[profession].cost)) return
    citizen.pendingProfession = PROFESSION_ID[profession]
    citizen.postX = standX
    citizen.brain = 'GoToStand'
    citizen.state = 'Moving'
    citizen.timer = 0
  }
}
