/** Seeded mulberry32. The generator state lives in the (serialisable) game state. */
export class Rng {
  constructor(private store: { rngState: number }) {}

  next(): number {
    this.store.rngState = (this.store.rngState + 0x6d2b79f5) | 0
    let t = this.store.rngState
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  sign(): -1 | 1 {
    return this.next() < 0.5 ? -1 : 1
  }
}
