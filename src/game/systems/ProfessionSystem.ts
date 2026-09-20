import type {
  GameContext,
  Interaction,
  InteractionProvider,
  System,
} from '../core/context'
import { isAlive } from '../core/lookup'
import type { Citizen } from '../core/types'
import { mn } from '../i18n'

export const gerOffset = (ctx: GameContext, dx: number): number =>
  (ctx.sys.buildings.ger()?.x ?? 0) + dx

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
    for (const stand of config.content.stands) {
      const def = config.professions[stand.profession]
      out.push({
        id: `stand:${stand.id}`,
        x: stand.x,
        radius: 34,
        label: mn.makeProfession(stand.label, def.label),
        cost: def.cost,
        enabled: free > 0,
        disabledReason: free > 0 ? undefined : mn.noFreeCitizens,
        execute: () => this.assign(stand.x, stand.profession),
      })
    }
  }

  private assign(standX: number, profession: 'archer' | 'builder'): void {
    const { config, sys } = this.ctx
    const free = this.freeCitizens().sort(
      (a, b) => Math.abs(a.x - standX) - Math.abs(b.x - standX),
    )
    const citizen = free.at(0)
    if (!citizen) return
    if (!sys.economy.trySpend(config.professions[profession].cost)) return
    citizen.pendingProfession = profession === 'archer' ? 'Archer' : 'Builder'
    citizen.postX = standX
    citizen.brain = 'GoToStand'
    citizen.state = 'Moving'
    citizen.timer = 0
  }
}
