import type { GameConfig } from '../config'
import type { EventBus } from './events'
import type { Rng } from './rng'
import type {
  Building,
  BuildingType,
  CoinPickup,
  GameState,
  Side,
  TargetRef,
  Camp,
  Citizen,
} from './types'

/**
 * Systems talk to each other through these narrow interfaces (and the event
 * bus) instead of holding references to GameManager or to each other's classes.
 */
export interface EconomyApi {
  trySpend: (amount: number) => boolean
  dropCoins: (x: number, amount: number, origin: CoinPickup['origin']) => void
  heroLoseCoins: (amount: number) => number
}

export interface DamageApi {
  damageEnemy: (id: number, amount: number, sourceId?: number | null) => void
  damageBuilding: (id: number, amount: number) => void
  damageCitizen: (id: number, amount: number) => void
  damageAnimal: (id: number, amount: number, sourceId?: number | null) => void
  hitHero: (fromX: number, amount: number) => void
}

export interface CombatApi {
  fireArrow: (args: {
    x: number
    y: number
    target: TargetRef
    damage: number
    speed: number
    sourceId: number | null
  }) => void
}

export interface BuildingApi {
  defenses: () => Building[]
  blockingWalls: () => Building[]
  heightOf: (b: Building) => number
  halfWidth: (b: Building) => number
  /** Reserve a tower slot for the archer; returns the tower or undefined. */
  claimTowerSlot: (archer: Citizen, preferredSide: Side) => Building | undefined
  releaseTowerSlot: (archer: Citizen) => void
  ger: () => Building | undefined
  archerCapacity: (b: Building) => number
  /** Extra archer range granted by this building's upgrade level. */
  extraRange: (b: Building) => number
}

export interface ConstructionApi {
  work: (b: Building, seconds: number) => void
  repair: (b: Building, hp: number) => void
  /** Builder work on a paid-for upgrade (seconds of work). */
  upgrade: (b: Building, seconds: number) => void
}

export interface TerritoryApi {
  contains: (x: number) => boolean
  edge: (side: Side) => number
}

export interface WaveApi {
  /** True when the night's wave has fully spawned. */
  finishedSpawning: () => boolean
  /** Raiders still to come (queued + alive) on each side of the settlement. */
  incoming: () => { left: number; right: number }
}

export interface EnemyApi {
  spawn: (type: string, side: Side) => void
}

export interface CitizenApi {
  spawnNeutral: (camp: Camp) => void
  neutralCount: (camp: Camp) => number
}

export interface Systems {
  economy: EconomyApi
  damage: DamageApi
  combat: CombatApi
  buildings: BuildingApi
  construction: ConstructionApi
  territory: TerritoryApi
  waves: WaveApi
  enemies: EnemyApi
  citizens: CitizenApi
}

export interface GameContext {
  state: GameState
  config: GameConfig
  bus: EventBus
  rng: Rng
  sys: Systems
}

export interface System {
  update: (dt: number) => void
}

/** Something the hero can do by standing next to it and pressing the action key. */
export interface Interaction {
  id: string
  x: number
  radius: number
  label: string
  cost: number
  enabled: boolean
  /** Shown instead of the cost when disabled for a reason other than coins. */
  disabledReason?: string
  execute: () => void
}

export interface InteractionProvider {
  gatherInteractions: (out: Interaction[]) => void
}

export type { BuildingType }
