import type {
  Animal,
  Building,
  Citizen,
  Enemy,
  GameState,
  TargetRef,
} from './types'

export const findById = <T extends { id: number }>(
  list: T[],
  id: number | null | undefined,
): T | undefined =>
  id === null || id === undefined ? undefined : list.find((e) => e.id === id)

export const newId = (state: GameState): number => state.nextId++

export const isAlive = (e: { state: string }) => e.state !== 'Dead'

export const liveEnemies = (state: GameState): Enemy[] =>
  state.enemies.filter(isAlive)
export const liveCitizens = (state: GameState): Citizen[] =>
  state.citizens.filter(isAlive)

export const playerCitizens = (state: GameState): Citizen[] =>
  state.citizens.filter((c) => c.owner === 'player' && isAlive(c))

export const isBuildingStanding = (b: Building) =>
  b.state === 'Active' || b.state === 'Damaged'

export type Resolved =
  | { kind: 'building'; entity: Building }
  | { kind: 'citizen'; entity: Citizen }
  | { kind: 'enemy'; entity: Enemy }
  | { kind: 'animal'; entity: Animal }
  | { kind: 'hero'; entity: null }
  | { kind: 'banner'; entity: null }

/** Resolve a target reference; returns undefined when the entity is gone/dead. */
export function resolveTarget(
  state: GameState,
  ref: TargetRef | null,
): Resolved | undefined {
  if (!ref) return undefined
  switch (ref.kind) {
    case 'building': {
      const e = findById(state.buildings, ref.id)
      return e && isBuildingStanding(e)
        ? { kind: 'building', entity: e }
        : undefined
    }
    case 'citizen': {
      const e = findById(state.citizens, ref.id)
      return e && isAlive(e) ? { kind: 'citizen', entity: e } : undefined
    }
    case 'enemy': {
      const e = findById(state.enemies, ref.id)
      return e && isAlive(e) ? { kind: 'enemy', entity: e } : undefined
    }
    case 'animal': {
      const e = findById(state.animals, ref.id)
      return e && isAlive(e) ? { kind: 'animal', entity: e } : undefined
    }
    case 'hero':
      return { kind: 'hero', entity: null }
    case 'banner':
      return state.banner.state === 'ground'
        ? { kind: 'banner', entity: null }
        : undefined
  }
}
