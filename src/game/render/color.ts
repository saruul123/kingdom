type RGB = [number, number, number]

const cache = new Map<string, RGB>()

export function parse(hex: string): RGB {
  let c = cache.get(hex)
  if (!c) {
    const n = parseInt(hex.slice(1), 16)
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    cache.set(hex, c)
  }
  return c
}

export function mix(a: string, b: string, t: number): string {
  const x = parse(a)
  const y = parse(b)
  const k = Math.max(0, Math.min(1, t))
  return `rgb(${Math.round(x[0] + (y[0] - x[0]) * k)},${Math.round(x[1] + (y[1] - x[1]) * k)},${Math.round(x[2] + (y[2] - x[2]) * k)})`
}

/** Deterministic hash → 0..1, for scenery that must not flicker between frames. */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
