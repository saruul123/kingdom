import { archerNodes, archerPhaseControl } from '../ai/archer'
import { builderNodes } from '../ai/builder'
import { citizenNodes } from '../ai/citizen'
import { herderNodes, herderPhaseControl } from '../ai/herder'
import { horsemanNodes } from '../ai/horseman'
import { traderNodes, traderPhaseControl } from '../ai/trader'
import { enemyNodes } from '../ai/enemy'
import { runMachine } from '../ai/stateMachine'
import type { GameContext, System } from '../core/context'

/** Runs every unit's state machine each frame. Behaviour lives in ai/*. */
export class AISystem implements System {
  constructor(private ctx: GameContext) {}

  update(dt: number): void {
    const { state } = this.ctx
    for (const c of state.citizens) {
      if (c.state === 'Dead') continue
      if (c.owner === 'player' && c.profession === 'Archer') {
        archerPhaseControl(c, this.ctx)
        runMachine(archerNodes, c, this.ctx, dt)
      } else if (c.owner === 'player' && c.profession === 'Trader') {
        traderPhaseControl(c, this.ctx)
        runMachine(traderNodes, c, this.ctx, dt)
      } else if (c.owner === 'player' && c.profession === 'Horseman') {
        runMachine(horsemanNodes, c, this.ctx, dt)
      } else if (c.owner === 'player' && c.profession === 'Herder') {
        herderPhaseControl(c, this.ctx)
        runMachine(herderNodes, c, this.ctx, dt)
      } else if (c.owner === 'player' && c.profession === 'Builder') {
        runMachine(builderNodes, c, this.ctx, dt)
      } else {
        runMachine(citizenNodes, c, this.ctx, dt)
      }
    }
    for (const e of state.enemies) {
      if (e.state === 'Dead') continue
      runMachine(enemyNodes, e, this.ctx, dt)
    }
  }
}
