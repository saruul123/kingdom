import type { Side } from './types'

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const sideOf = (dx: number, fallback: Side = 1): Side =>
  dx > 0 ? 1 : dx < 0 ? -1 : fallback

export function approach(v: number, target: number, step: number): number {
  if (v < target) return Math.min(target, v + step)
  return Math.max(target, v - step)
}
