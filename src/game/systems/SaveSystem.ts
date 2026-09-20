import type { GameConfig } from '../config'
import type { GameContext, System } from '../core/context'
import { SAVE_VERSION } from '../core/state'
import type { GameState } from '../core/types'

interface Envelope {
  savedAt: number
  state: GameState
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function read(key: string): Envelope | null {
  try {
    const raw = storage()?.getItem(key)
    if (!raw) return null
    const env = JSON.parse(raw) as Envelope
    return (env as Partial<Envelope>).state?.version === SAVE_VERSION
      ? env
      : null
  } catch {
    return null
  }
}

/** Static access so menus can check for saves before a game exists. */
export const SaveStore = {
  hasSave(config: GameConfig): boolean {
    return !!(read(config.save.autosaveKey) || read(config.save.exitKey))
  },
  loadAutosave(config: GameConfig): GameState | null {
    return read(config.save.autosaveKey)?.state ?? null
  },
  loadLatest(config: GameConfig): GameState | null {
    const a = read(config.save.autosaveKey)
    const b = read(config.save.exitKey)
    if (a && b) return (a.savedAt > b.savedAt ? a : b).state
    return (a ?? b)?.state ?? null
  },
  clear(config: GameConfig): void {
    storage()?.removeItem(config.save.autosaveKey)
    storage()?.removeItem(config.save.exitKey)
  },
}

/**
 * Autosaves at every sunrise and on normal exit. The state is plain data, so a
 * save is just the serialised GameState.
 */
export class SaveSystem implements System {
  constructor(
    private ctx: GameContext,
    private persist = true,
  ) {
    ctx.bus.on('phaseChanged', ({ phase }) => {
      if (phase === 'Sunrise') this.save('autosave')
    })
  }

  update(): void {}

  save(slot: 'autosave' | 'exit'): void {
    const { state, config } = this.ctx
    if (!this.persist || state.status !== 'playing') return
    const key =
      slot === 'autosave' ? config.save.autosaveKey : config.save.exitKey
    try {
      const env: Envelope = { savedAt: Date.now(), state }
      storage()?.setItem(key, JSON.stringify(env))
    } catch {
      // Storage full or unavailable: the game keeps running without saves.
    }
  }
}
