import type { GameContext, System } from '../core/context'
import { liveRaiders } from '../core/lookup'
import type { Phase } from '../core/types'

/** Day/night clock. Durations come from config.time (and must stay configurable). */
export class TimeSystem implements System {
  constructor(private ctx: GameContext) {}

  phaseDuration(phase: Phase): number {
    const t = this.ctx.config.time
    switch (phase) {
      case 'Sunrise':
        return t.sunriseDuration
      case 'Day':
        return Math.max(1, t.dayDuration - t.sunriseDuration - t.sunsetDuration)
      case 'Sunset':
        return t.sunsetDuration
      case 'Night':
        return t.nightDuration
    }
  }

  update(dt: number): void {
    const { state, config } = this.ctx
    state.timeRemaining -= dt

    if (
      state.currentPhase === 'Night' &&
      config.time.nightEndsWhenCleared &&
      this.ctx.sys.waves.finishedSpawning() &&
      liveRaiders(state).length === 0
    ) {
      state.timeRemaining = 0
    }

    if (state.timeRemaining <= 0) this.advance()
  }

  private advance(): void {
    const { state, bus } = this.ctx
    switch (state.currentPhase) {
      case 'Sunrise':
        this.enter('Day')
        break
      case 'Day':
        this.enter('Sunset')
        break
      case 'Sunset':
        this.enter('Night')
        break
      case 'Night':
        state.stats.nightsSurvived++
        bus.emit('nightCleared', { night: state.currentDay })
        state.currentDay++
        this.enter('Sunrise')
        break
    }
  }

  private enter(phase: Phase): void {
    const { state, bus } = this.ctx
    state.currentPhase = phase
    state.timeRemaining = this.phaseDuration(phase)
    bus.emit('phaseChanged', { phase, day: state.currentDay })
  }

  /** 0 = deep night, 1 = full daylight. Drives sky colour and darkness. */
  daylight(): number {
    const { state } = this.ctx
    const dur = this.phaseDuration(state.currentPhase)
    const p = 1 - state.timeRemaining / dur
    switch (state.currentPhase) {
      case 'Sunrise':
        return 0.35 + 0.65 * p
      case 'Day':
        return 1
      case 'Sunset':
        return 1 - 0.75 * p
      case 'Night':
        return 0.12
    }
  }
}
