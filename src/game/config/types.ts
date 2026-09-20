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
  attackRange: number
  attackDamage: number
  attackCooldown: number
  arrowSpeed: number
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

export interface HerderDef {
  label: string
  cost: number
  health: number
  speed: number
  /** Seconds between the coins a herder produces at a pasture. */
  incomeInterval: number
  income: number
}

export interface HorsemanDef {
  label: string
  cost: number
  health: number
  speed: number
  damage: number
  cooldown: number
  /** Melee reach. */
  range: number
  /** How far off a raider is noticed and charged. */
  aggroRange: number
  patrolRadius: number
}

export interface TraderDef {
  label: string
  cost: number
  health: number
  speed: number
  /** Coins for a trip, plus `rewardPer100` per 100 units of one-way distance. */
  rewardBase: number
  rewardPer100: number
  waitTime: number
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
  /** Kingdom level (era) needed before this upgrade can be ordered. */
  minKingdomLevel?: number
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
  herderCapacity: number
  horsemanCapacity?: number
  traderCapacity?: number
  /** Kingdom level (era) needed to build this at all. */
  minKingdomLevel?: number
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
  /** Shoots from a distance instead of closing to melee. */
  ranged?: boolean
  projectileSpeed?: number
  /** Multiplier on damage dealt to buildings (heavy units and siege engines). */
  structureDamageMultiplier?: number
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
  boss: { multiplier: number; reward: number; extra: WaveGroup[] }
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
  profession: 'archer' | 'builder' | 'herder'
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
  /** Wolves: attack the hero and citizens instead of fleeing. */
  hostile?: boolean
  damage?: number
  aggroRange?: number
  attackCooldown?: number
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
    /** Replacement caches appear at least this far from the settlement. */
    respawnMinX: number
  }
  enemyCamps: {
    perSide: number
    minX: number
    maxX: number
    minSpacing: number
    health: number
    /** Seconds between new guards while the camp stands. */
    spawnInterval: number
    maxGuards: number
    loot: [number, number]
    /** Extra raiders each camp adds to every night's raid. */
    raidersPerNight: number
    outpostCost: number
    territoryRadius: number
  }
  wells: { count: number; minX: number; maxX: number }
  ruins: {
    count: number
    max: number
    minX: number
    maxX: number
    loot: [number, number]
    ambushChance: number
    ambushSize: number
    /** A fresh ruin turns up every this many days. */
    newEveryDays: number
  }
  /** Leaving an offering at an ovoo: a blessing, coins back, or silence. */
  ovooOffering: {
    cost: number
    blessingChance: number
    coinsChance: number
    coinsBack: number
    /** Archer damage bonus while blessed. */
    damageBonus: number
  }
  ovoos: { count: number; minX: number; maxX: number }
  wildlife: {
    rabbit: WildlifeDef
    deer: WildlifeDef
    wolf: WildlifeDef
    minX: number
    maxX: number
    respawnPerDay: number
  }
}

export type Difficulty = 'easy' | 'normal' | 'hard'
export interface DifficultyDef {
  enemyHealth: number
  waveSize: number
  startCoins: number
}

export interface GameConfig {
  difficulty: Record<Difficulty, DifficultyDef>
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
  economy: {
    coinPickupDelay: number
    gerCoinDropSpread: number
    /** Dawn tax: base + one coin per `perCitizens` citizens, left at the ger. */
    tax: { base: number; perCitizens: number }
  }
  /** Relay stations: hero speed bonus per station and the fare for fast travel. */
  ortoo: { speedBonus: number; travelCost: number }
  save: { autosaveKey: string; exitKey: string }
  professions: {
    archer: ArcherDef
    builder: BuilderDef
    herder: HerderDef
    horseman: HorsemanDef
    trader: TraderDef
  }
  buildings: Record<string, BuildingDef>
  enemies: Record<string, EnemyDef>
  waves: WavesConfig
  content: WorldConfig
}
