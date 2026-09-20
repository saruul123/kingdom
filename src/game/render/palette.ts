import type { Phase } from '../core/types'
import { parse } from './color'

/** How much of each time-of-day look is active (weights sum to 1). */
export interface Tod {
  d: number
  u: number
  n: number
}

export function todWeights(phase: Phase, p: number): Tod {
  switch (phase) {
    case 'Sunrise':
      return p < 0.5
        ? { d: 0, u: p * 2, n: 1 - p * 2 }
        : { d: (p - 0.5) * 2, u: 1 - (p - 0.5) * 2, n: 0 }
    case 'Day':
      return { d: 1, u: 0, n: 0 }
    case 'Sunset':
      return p < 0.55
        ? { d: 1 - p / 0.55, u: p / 0.55, n: 0 }
        : { d: 0, u: 1 - (p - 0.55) / 0.45, n: (p - 0.55) / 0.45 }
    case 'Night':
      return { d: 0, u: 0, n: 1 }
  }
}

/** Blend three colours (day, dusk, night) by the time-of-day weights. */
export function tri(w: Tod, day: string, dusk: string, night: string): string {
  const a = parse(day)
  const b = parse(dusk)
  const c = parse(night)
  const r = Math.round(a[0] * w.d + b[0] * w.u + c[0] * w.n)
  const g = Math.round(a[1] * w.d + b[1] * w.u + c[1] * w.n)
  const bl = Math.round(a[2] * w.d + b[2] * w.u + c[2] * w.n)
  return `rgb(${r},${g},${bl})`
}

/** Sky colour stops, top → horizon. */
export const SKY = {
  day: ['#2f6fc4', '#4f93d8', '#8fc3ea', '#d9eef6'],
  dusk: ['#2a2a66', '#6c4a8e', '#dc7a8a', '#f8b46a'],
  night: ['#060a20', '#0e1846', '#262f6b', '#6d4f8c'],
} as const

export const C = {
  // wood, felt, metal
  wood: '#7a5230',
  woodDark: '#4a3020',
  woodLight: '#a97a4b',
  felt: '#ece4d0',
  feltShade: '#c9bfa5',
  feltDark: '#a89d84',
  red: '#b8322a',
  redDark: '#7f1f1f',
  gold: '#f0c030',
  goldDark: '#b58a14',
  blue: '#2f5cc0',
  blueDark: '#1c357a',
  blueLight: '#5f8ae0',
  skin: '#e2b48a',
  skinDark: '#b98560',
  fur: '#efe6d2',
  iron: '#8a8f9c',
  ironDark: '#4b4f5e',
  stone: '#8a877f',
  stoneDark: '#5c5a56',
  moss: '#5f7a3a',
  // people
  bandit: '#5a2f2c',
  banditDark: '#33191a',
  banditRed: '#b23a2c',
  archerDeel: '#2c7a72',
  builderDeel: '#c07a30',
  citizenDeel: '#5f86c8',
  neutralDeel: '#9a8d7c',
  // animals
  rabbit: '#b7a28a',
  deer: '#a9773f',
  fireA: '#f28a24',
  fireB: '#ffd35a',
  fireC: '#fff2b0',
} as const

export type Palette = typeof C
