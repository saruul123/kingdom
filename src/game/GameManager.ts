import { createConfig } from './config'
import type { DeepPartial, GameConfig } from './config'
import type {
  GameContext,
  InteractionProvider,
  System,
  Systems,
} from './core/context'
import { EventBus } from './core/events'
import { Rng } from './core/rng'
import { newGameState } from './core/state'
import type { GameState } from './core/types'
import { NullInput } from './input/Input'
import type { InputSource } from './input/Input'
import { AISystem } from './systems/AISystem'
import { BuildingSystem } from './systems/BuildingSystem'
import { CitizenSystem } from './systems/CitizenSystem'
import { CombatSystem } from './systems/CombatSystem'
import { ConstructionSystem } from './systems/ConstructionSystem'
import { DamageSystem } from './systems/DamageSystem'
import { EconomySystem } from './systems/EconomySystem'
import { EnemySystem } from './systems/EnemySystem'
import { PlayerController } from './systems/PlayerController'
import { ProfessionSystem } from './systems/ProfessionSystem'
import { RecruitmentSystem } from './systems/RecruitmentSystem'
import { SaveSystem } from './systems/SaveSystem'
import { TerritorySystem } from './systems/TerritorySystem'
import { TimeSystem } from './systems/TimeSystem'
import { WaveSystem } from './systems/WaveSystem'
import { WildlifeSystem } from './systems/WildlifeSystem'
import { WorldManager } from './systems/WorldManager'
import { UIManager } from './ui/UIManager'

export interface GameOptions {
  config?: GameConfig
  overrides?: DeepPartial<GameConfig>
  seed?: number
  /** Resume from a saved state instead of generating a new world. */
  state?: GameState
  input?: InputSource
  /** Write saves to storage (off for the menu backdrop and for headless tests). */
  persist?: boolean
}

const FIXED_STEP = 1 / 60
const MAX_FRAME = 0.25

/**
 * Composition root: builds the systems, wires them together through
 * `ctx.sys` and the event bus, and steps them in a fixed order.
 */
export class GameManager {
  readonly ctx: GameContext
  readonly ui: UIManager
  readonly time: TimeSystem
  readonly player: PlayerController
  readonly save: SaveSystem
  paused = false
  private updates: System[]
  private accumulator = 0

  constructor(opts: GameOptions = {}) {
    const config = opts.config ?? createConfig(opts.overrides)
    const isNew = !opts.state
    const state =
      opts.state ?? newGameState(config, opts.seed ?? Date.now() & 0x7fffffff)
    const ctx: GameContext = {
      state,
      config,
      bus: new EventBus(),
      rng: new Rng(state),
      sys: {} as Systems,
    }
    this.ctx = ctx

    const time = new TimeSystem(ctx)
    const economy = new EconomySystem(ctx)
    const damage = new DamageSystem(ctx)
    const combat = new CombatSystem(ctx)
    const buildings = new BuildingSystem(ctx)
    const construction = new ConstructionSystem(ctx)
    const territory = new TerritorySystem(ctx)
    const waves = new WaveSystem(ctx)
    const enemies = new EnemySystem(ctx)
    const citizens = new CitizenSystem(ctx)
    const recruitment = new RecruitmentSystem(ctx)
    const professions = new ProfessionSystem(ctx)
    const wildlife = new WildlifeSystem(ctx)
    const world = new WorldManager(ctx)
    const ai = new AISystem(ctx)
    const ui = new UIManager(ctx)

    Object.assign(ctx.sys, {
      economy,
      damage,
      combat,
      buildings,
      construction,
      territory,
      waves,
      enemies,
      citizens,
    } satisfies Systems)

    const providers: InteractionProvider[] = [
      recruitment,
      professions,
      buildings,
    ]
    const player = new PlayerController(
      ctx,
      opts.input ?? new NullInput(),
      ui,
      providers,
    )

    // Registered last so the sunrise autosave sees every other system's dawn update.
    const save = new SaveSystem(ctx, opts.persist ?? true)

    this.time = time
    this.ui = ui
    this.player = player
    this.save = save
    this.updates = [
      player,
      time,
      waves,
      ai,
      wildlife,
      combat,
      damage,
      economy,
      buildings,
      construction,
      territory,
      world,
      ui,
    ]

    ctx.bus.on('gameOver', ({ reason }) => this.endGame(reason))
    ctx.bus.on('buildingDestroyed', ({ type }) => {
      if (type === 'ger')
        ctx.bus.emit('gameOver', { reason: 'The Central Ger has fallen.' })
    })

    if (isNew) {
      world.generate()
      wildlife.populate()
      ui.announce('Day 1')
      save.save('autosave')
    }
  }

  get state(): GameState {
    return this.ctx.state
  }

  get bus(): EventBus {
    return this.ctx.bus
  }

  get config(): GameConfig {
    return this.ctx.config
  }

  private endGame(reason: string): void {
    const { state, bus } = this.ctx
    if (state.status === 'gameOver') return
    state.status = 'gameOver'
    state.gameOverReason = reason
    bus.emit('sfx', { name: 'gameover' })
  }

  /** Advance the simulation by exactly `dt` seconds. */
  step(dt: number): void {
    const { state } = this.ctx
    if (state.status !== 'playing') return
    state.playTime += dt
    for (const s of this.updates) s.update(dt)
  }

  /** Real-time driver: consumes wall-clock time in fixed steps. */
  frame(realDt: number): void {
    if (this.paused) return
    this.accumulator += Math.min(realDt, MAX_FRAME)
    while (this.accumulator >= FIXED_STEP) {
      this.step(FIXED_STEP)
      this.accumulator -= FIXED_STEP
    }
  }
}
