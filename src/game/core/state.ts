import type { GameConfig } from '../config'
import type { GameState } from './types'

export const SAVE_VERSION = 6

/** Blank state for a new game; WorldManager fills in the world itself. */
export function newGameState(
  config: GameConfig,
  seed: number,
  difficulty: GameState['difficulty'] = 'normal',
): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    rngState: seed | 0,
    nextId: 1,
    status: 'playing',
    difficulty,
    gameOverReason: null,
    currentDay: 1,
    currentPhase: 'Day',
    timeRemaining: Math.max(
      1,
      config.time.dayDuration -
        config.time.sunriseDuration -
        config.time.sunsetDuration,
    ),
    coins: Math.max(
      0,
      config.hero.startCoins + config.difficulty[difficulty].startCoins,
    ),
    era: 1,
    kingdomLevel: 1,
    controlledTerritories: [
      { id: 'home', x: 0, radius: config.territory.initialRadius },
    ],
    bossNight: {
      interval: config.waves.bossInterval,
      nextNight: config.waves.bossInterval,
      active: false,
    },
    hero: {
      x: 0,
      vx: 0,
      facing: 1,
      stamina: config.hero.maxStamina,
      exhausted: false,
      sprinting: false,
      invulnerable: 0,
      attackCooldown: 0,
      attackFlash: 0,
      boost: 0,
    },
    banner: { state: 'held', x: 0, carrierId: null, delay: 0 },
    citizens: [],
    enemies: [],
    animals: [],
    buildings: [],
    coinPickups: [],
    projectiles: [],
    camps: [],
    enemyCamps: [],
    extraBuildPoints: [],
    ovoos: [],
    wells: [],
    ruins: [],
    blessing: 0,
    achievements: [],
    explored: { min: -400, max: 400 },
    wave: { night: 0, elapsed: 0, queue: [], total: 0 },
    stats: {
      enemiesKilled: 0,
      coinsCollected: 0,
      nightsSurvived: 0,
      citizensLost: 0,
    },
    playTime: 0,
  }
}
