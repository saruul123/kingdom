import type { Phase, Side } from './types'

export type ToastKind = 'info' | 'warning' | 'danger' | 'good'
export type SfxName =
  | 'coin'
  | 'spend'
  | 'deny'
  | 'arrow'
  | 'hit'
  | 'build'
  | 'horn'
  | 'recruit'
  | 'kill'
  | 'gameover'

export interface GameEvents {
  phaseChanged: { phase: Phase; day: number }
  nightCleared: { night: number }
  coinsChanged: { coins: number; delta: number }
  toast: { text: string; kind: ToastKind }
  sfx: { name: SfxName }
  citizenRecruited: { id: number }
  professionAssigned: { id: number; profession: string }
  buildingOrdered: { id: number; type: string }
  buildingCompleted: { id: number; type: string }
  buildingUpgraded: { id: number; type: string; level: number }
  /** Short text that floats up from a world position ("+2", "-4"…). */
  float: { x: number; text: string; kind: 'gain' | 'spend' | 'loss' | 'info' }
  buildingDestroyed: { id: number; type: string; x: number }
  enemySpawned: { id: number; side: Side }
  enemyKilled: { id: number; x: number }
  heroHit: { coinsLost: number }
  bannerLost: { x: number }
  bannerRecovered: Record<string, never>
  gameOver: { reason: string }
}

type Handler<T> = (payload: T) => void

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>()

  on<TKey extends keyof GameEvents>(
    type: TKey,
    handler: Handler<GameEvents[TKey]>,
  ): () => void {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set()
      this.handlers.set(type, set)
    }
    set.add(handler)
    return () => set.delete(handler)
  }

  emit<TKey extends keyof GameEvents>(
    type: TKey,
    payload: GameEvents[TKey],
  ): void {
    const set = this.handlers.get(type)
    if (!set) return
    for (const handler of [...set])
      (handler as Handler<GameEvents[TKey]>)(payload)
  }
}
