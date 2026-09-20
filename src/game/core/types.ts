import type { BuildingCategory } from '../config'

export type Side = -1 | 1
export type Phase = 'Sunrise' | 'Day' | 'Sunset' | 'Night'

export type UnitState =
  | 'Idle'
  | 'Moving'
  | 'Working'
  | 'Returning'
  | 'Defending'
  | 'Fighting'
  | 'Fleeing'
  | 'Dead'

export type ProfessionId = 'Citizen' | 'Archer' | 'Builder'
export type BuildingType = 'ger' | 'wall' | 'tower'
export type BuildingState =
  'Planned' | 'UnderConstruction' | 'Active' | 'Damaged' | 'Destroyed'

export type TargetKind =
  'building' | 'citizen' | 'enemy' | 'animal' | 'hero' | 'banner'
export interface TargetRef {
  kind: TargetKind
  id: number
}

/** All entities are plain JSON-serialisable data so the whole state can be saved. */
export interface Hero {
  x: number
  vx: number
  facing: Side
  stamina: number
  exhausted: boolean
  sprinting: boolean
  invulnerable: number
}

export interface Banner {
  state: 'held' | 'ground' | 'carried'
  x: number
  carrierId: number | null
  /** Seconds before the hero can pick a dropped banner back up. */
  delay: number
}

export interface Territory {
  id: string
  x: number
  radius: number
}

export interface Citizen {
  id: number
  owner: 'neutral' | 'player'
  profession: ProfessionId
  health: number
  maxHealth: number
  x: number
  facing: Side
  state: UnitState
  /** Fine-grained state-machine node (see ai/*). `state` is the coarse view. */
  brain: string
  target: TargetRef | null
  timer: number
  cooldown: number
  homeX: number
  /** Coins being carried back to the settlement (hunting reward). */
  carrying: number
  /** Profession this citizen is walking to a tool stand to receive. */
  pendingProfession: ProfessionId | null
  /** Tower this archer is stationed in. */
  postBuildingId: number | null
  postX: number
  postSide: Side
  /** Neutral citizens only: which camp they belong to. */
  campId: number | null
  /** Seconds of corpse lifetime left once dead. */
  deadTimer: number
}

export interface Building {
  id: number
  type: BuildingType
  level: number
  x: number
  side: Side
  health: number
  maxHealth: number
  /** 0..1 */
  constructionProgress: number
  state: BuildingState
  buildPointId: string | null
  occupants: number[]
  /** An upgrade has been paid for and builders are working on it. */
  upgrading: boolean
  /** 0..1 progress of the current upgrade. */
  upgradeProgress: number
  /** Seconds since last damage (used for visual flash). */
  hitFlash: number
}

export interface Enemy {
  id: number
  type: string
  health: number
  maxHealth: number
  damage: number
  movementSpeed: number
  attackRange: number
  x: number
  facing: Side
  side: Side
  state: UnitState
  brain: string
  target: TargetRef | null
  cooldown: number
  timer: number
  retargetIn: number
  carryingBanner: boolean
  deadTimer: number
  hitFlash: number
}

export interface Animal {
  id: number
  type: 'rabbit' | 'deer'
  x: number
  facing: Side
  health: number
  state: UnitState
  timer: number
  targetX: number
  reward: number
  claimedBy: number | null
  deadTimer: number
}

export interface CoinPickup {
  id: number
  x: number
  amount: number
  /** Cannot be collected until this reaches 0 (drop animation). */
  delay: number
  /** Cache = treasure found while exploring; dropped = spilled/produced. */
  origin: 'cache' | 'dropped' | 'income'
}

export interface Projectile {
  id: number
  x: number
  y: number
  fromX: number
  fromY: number
  target: TargetRef
  damage: number
  speed: number
  sourceId: number | null
  travelled: number
  totalDist: number
  /** Last known target position, used if the target vanishes mid-flight. */
  lastX: number
  lastY: number
}

export interface Camp {
  id: number
  x: number
  capacity: number
}

export interface Ovoo {
  x: number
}

export interface SpawnEntry {
  type: string
  side: Side
  at: number
}

export interface WaveState {
  /** Night this wave belongs to (0 = none). */
  night: number
  elapsed: number
  queue: SpawnEntry[]
  total: number
}

export interface BossNight {
  interval: number
  nextNight: number
  active: boolean
}

export interface Stats {
  enemiesKilled: number
  coinsCollected: number
  nightsSurvived: number
  citizensLost: number
}

export interface GameState {
  version: number
  seed: number
  rngState: number
  nextId: number
  status: 'playing' | 'gameOver'
  gameOverReason: string | null
  currentDay: number
  currentPhase: Phase
  /** Seconds left in the current phase. */
  timeRemaining: number
  coins: number
  era: number
  kingdomLevel: number
  controlledTerritories: Territory[]
  bossNight: BossNight
  hero: Hero
  banner: Banner
  citizens: Citizen[]
  enemies: Enemy[]
  animals: Animal[]
  buildings: Building[]
  coinPickups: CoinPickup[]
  projectiles: Projectile[]
  camps: Camp[]
  ovoos: Ovoo[]
  /** Extent of the steppe the hero has seen (drives the map's fog of war). */
  explored: { min: number; max: number }
  wave: WaveState
  stats: Stats
  /** Real time the player has spent in this save. */
  playTime: number
}

export const BUILDING_DEFENSE_CATEGORIES: BuildingCategory[] = [
  'wall',
  'tower',
  'gate',
]
