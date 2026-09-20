export type BuildingCategory = 'palace' | 'wall' | 'tower' | 'gate' | 'economy'
export type TargetCategory =
  | 'banner'
  | 'gate'
  | 'wall'
  | 'tower'
  | 'defender'
  | 'citizen'
  | 'economy'
  | 'palace'

export interface TimeConfig {
  dayDuration: number
  nightDuration: number
  sunsetDuration: number
  sunriseDuration: number
  nightEndsWhenCleared: boolean
  /** Fraction of the night during which the wave is spread out. */
  spawnWindow: number
}

export interface HeroConfig {
  speed: number
  sprintSpeed: number
  acceleration: number
  maxStamina: number
  staminaDrain: number
  staminaRegen: number
  staminaRecoverAt: number
  startCoins: number
  pickupRadius: number
  hitCoinLoss: number
  invulnerableTime: number
  knockback: number
}

export interface ArcherDef {
  label: string
  cost: number
  health: number
  speed: number
  range: number
  towerRangeBonus: number
  damage: number
  cooldown: number
  arrowSpeed: number
  huntRadius: number
}

export interface BuilderDef {
  label: string
  cost: number
  health: number
  speed: number
  buildRate: number
  repairRate: number
  maxPerTask: number
  criticalHealthRatio: number
}

export interface BuildingUpgradeDef {
  label: string
  cost: number
  buildWork: number
  maxHealth: number
  /** Replaces the base tower capacity when set. */
  archerCapacity?: number
  /** Extra archer range (in addition to the tower bonus) for archers posted here. */
  rangeBonus?: number
}

export interface BuildingDef {
  label: string
  category: BuildingCategory
  cost: number
  buildWork: number
  maxHealth: number
  width: number
  height: number
  blocksEnemies: boolean
  archerCapacity: number
  /** Successive upgrades: upgrades[0] takes the building from level 1 to 2. */
  upgrades: BuildingUpgradeDef[]
}

export interface EnemyDef {
  label: string
  health: number
  damage: number
  movementSpeed: number
  attackRange: number
  attackCooldown: number
  heroAggroRange: number
  /** Chance that a defeated raider drops a coin. */
  coinDropChance: number
  targetPriority: TargetCategory[]
}

export interface WaveGroup {
  type: string
  base: number
  perNight: number
}
export interface WaveTier {
  from: number
  to: number
  groups: WaveGroup[]
}
export interface WavesConfig {
  bossInterval: number
  nights: WaveTier[]
}

export interface BuildPointDef {
  id: string
  building: string
  x: number
  requires: string | null
}
export interface StandDef {
  id: string
  profession: 'archer' | 'builder'
  x: number
  label: string
}
export interface WildlifeDef {
  label: string
  health: number
  speed: number
  fleeSpeed: number
  fleeRange: number
  reward: number
  perSide: number
}
export interface WorldConfig {
  buildPoints: BuildPointDef[]
  stands: StandDef[]
  camps: {
    minX: number
    maxX: number
    spacing: [number, number]
    capacity: [number, number]
    respawnPerDay: number
  }
  caches: {
    initial: { x: number; amount: number }[]
    count: number
    minX: number
    maxX: number
    baseAmount: number
    amountPerDistance: number
    respawnPerDay: number
  }
  ovoos: { count: number; minX: number; maxX: number }
  wildlife: {
    rabbit: WildlifeDef
    deer: WildlifeDef
    minX: number
    maxX: number
    respawnPerDay: number
  }
}

export interface GameConfig {
  time: TimeConfig
  hero: HeroConfig
  recruitCost: number
  recruitRadius: number
  citizen: {
    speed: number
    health: number
    wanderRadius: number
    fleeRange: number
  }
  territory: { initialRadius: number }
  world: { minX: number; maxX: number; spawnDistance: number }
  economy: { coinPickupDelay: number; gerCoinDropSpread: number }
  save: { autosaveKey: string; exitKey: string }
  professions: { archer: ArcherDef; builder: BuilderDef }
  buildings: Record<string, BuildingDef>
  enemies: Record<string, EnemyDef>
  waves: WavesConfig
  content: WorldConfig
}
