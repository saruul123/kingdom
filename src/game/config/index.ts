import buildings from './buildings.json'
import enemies from './enemies.json'
import game from './game.json'
import professions from './professions.json'
import waves from './waves.json'
import world from './world.json'
import type { GameConfig } from './types'

export type * from './types'

/**
 * Balance data lives in the sibling JSON files. Rebalancing the game means
 * editing those files (or passing overrides to `createConfig`) — no system code.
 */
export const defaultConfig: GameConfig = {
  ...(game as Omit<
    GameConfig,
    'professions' | 'buildings' | 'enemies' | 'waves' | 'content'
  >),
  professions: professions,
  buildings: buildings as GameConfig['buildings'],
  enemies: enemies as GameConfig['enemies'],
  waves: waves,
  content: world as unknown as GameConfig['content'],
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

function merge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return patch as T
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    out[k] = merge((base as Record<string, unknown>)[k], v)
  }
  return out as T
}

export function createConfig(overrides?: DeepPartial<GameConfig>): GameConfig {
  return merge(structuredClone(defaultConfig), overrides)
}
