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

export type ProfessionId =
  'Citizen' | 'Archer' | 'Builder' | 'Herder' | 'Horseman' | 'Trader'
export type BuildingType =
  | 'ger'
  | 'wall'
  | 'tower'
  | 'gate'
  | 'pasture'
  | 'stable'
  | 'market'
  | 'ortoo'
  | 'outpost'
export type BuildingState =
  'Planned' | 'UnderConstruction' | 'Active' | 'Damaged' | 'Destroyed'

export type TargetKind =
  'building' | 'citizen' | 'enemy' | 'animal' | 'hero' | 'banner' | 'camp'
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
  /** Seconds until the hero can shoot again. */
  attackCooldown: number
  /** Draw the bow-pull frames while > 0. */
  attackFlash: number
  /** Speed boost (seconds left) from a well. */
  boost: number
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
  /** Guards belong to an enemy camp and stay near it. */
  campId: number | null
}

export interface Animal {
  id: number
  type: 'rabbit' | 'deer' | 'wolf'
  x: number
  facing: Side
  health: number
  state: UnitState
  timer: number
  targetX: number
  reward: number
  claimedBy: number | null
  deadTimer: number
  /** Seconds until a hostile animal can bite again. */
  cooldown: number
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
  /** Fired by raiders: hurts buildings, citizens and the hero instead of enemies. */
  hostile: boolean
  /** Fired by the hero (a kill earns the animal's reward). */
  fromHero: boolean
}

export interface Camp {
  id: number
  x: number
  capacity: number
}

export interface EnemyCamp {
  id: number
  x: number
  health: number
  maxHealth: number
  spawnTimer: number
  cleared: boolean
}

export interface ExtraBuildPoint {
  id: string
  building: string
  x: number
  requires: string | null
}

export interface Ovoo {
  x: number
  /** Day of the last offering (one per ovoo per day). */
  usedDay: number
}

export interface Well {
  x: number
  usedDay: number
}

export interface Ruin {
  x: number
  looted: boolean
}

export interface SpawnEntry {
  type: string
  side: Side
  at: number
  /** Spawn here instead of at the map edge (enemy camps). */
  x?: number
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
  difficulty: 'easy' | 'normal' | 'hard'
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
  enemyCamps: EnemyCamp[]
  /** Build points unlocked by outposts. */
  extraBuildPoints: ExtraBuildPoint[]
  ovoos: Ovoo[]
  wells: Well[]
  ruins: Ruin[]
  /** Nights of archer blessing left (from an ovoo offering). */
  blessing: number
  /** Names of achievements earned so far. */
  achievements: string[]
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
