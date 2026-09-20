import type {
  GameContext,
  Interaction,
  InteractionProvider,
  System,
} from '../core/context'
import { findById, isAlive } from '../core/lookup'
import { gerOffset } from './ProfessionSystem'

/** Pay 1 coin to turn a neutral citizen into one of your people. */
export class RecruitmentSystem implements System, InteractionProvider {
  constructor(private ctx: GameContext) {}

  update(): void {}

  gatherInteractions(out: Interaction[]): void {
    const { state, config } = this.ctx
    for (const c of state.citizens) {
      if (c.owner !== 'neutral' || !isAlive(c)) continue
      out.push({
        id: `recruit:${c.id}`,
        x: c.x,
        radius: config.recruitRadius,
        label: 'Recruit',
        cost: config.recruitCost,
        enabled: true,
        execute: () => this.recruit(c.id),
      })
    }
  }

  private recruit(id: number): void {
    const { state, config, bus, sys, rng } = this.ctx
    const c = findById(state.citizens, id)
    if (!c || c.owner !== 'neutral') return
    if (!sys.economy.trySpend(config.recruitCost)) return
    c.owner = 'player'
    c.profession = 'Citizen'
    c.campId = null
    c.homeX = gerOffset(
      this.ctx,
      rng.range(-config.citizen.wanderRadius, config.citizen.wanderRadius),
    )
    c.brain = 'GoToSettlement'
    c.state = 'Moving'
    c.timer = 0
    bus.emit('citizenRecruited', { id })
    bus.emit('sfx', { name: 'recruit' })
    bus.emit('toast', { text: 'A citizen joins your camp.', kind: 'good' })
  }
}
