import type { Phase } from '../core/types'
import { hash, mix } from './color'
import { SKY, todWeights, tri } from './palette'
import type { Tod } from './palette'
import { disc, ellipse, px, shade } from './pixel'
import type { G } from './pixel'

export interface Atmosphere {
  w: Tod
  /** 0 (dark) … 1 (bright) */
  daylight: number
  phase: Phase
  /** Fraction of the sun's arc travelled, or -1 at night. */
  sunF: number
  /** Fraction of the night elapsed (moon arc). */
  moonF: number
  t: number
}

export function makeAtmosphere(
  phase: Phase,
  phaseProgress: number,
  sunF: number,
  moonF: number,
  t: number,
  daylight: number,
): Atmosphere {
  return {
    w: todWeights(phase, phaseProgress),
    daylight,
    phase,
    sunF,
    moonF,
    t,
  }
}

function skyStops(a: Atmosphere): string[] {
  return [0, 1, 2, 3].map((i) =>
    tri(a.w, SKY.day[i], SKY.dusk[i], SKY.night[i]),
  )
}

function vnoise(x: number, seed: number): number {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  const a = hash(i + seed * 31.7)
  const b = hash(i + 1 + seed * 31.7)
  return a + (b - a) * u
}

function smooth(x: number, seed: number): number {
  return vnoise(x, seed) * 0.65 + vnoise(x * 2.3, seed + 5) * 0.35
}

// The backdrop is deliberately plain and low-contrast: flat sky bands, two
// soft silhouettes and an empty tan steppe, so units and buildings read clearly.

function drawSky(g: G, W: number, groundY: number, a: Atmosphere): void {
  const stops = skyStops(a)
  const bandH = 4
  for (let y = 0; y < groundY + 10; y += bandH) {
    const p = Math.min(1, y / (groundY - 20)) * 3
    const k = Math.min(2, Math.floor(p))
    px(g, mix(stops[k], stops[k + 1], p - k), 0, y, W, bandH)
  }

  const starA = Math.max(0, Math.min(1, 1 - a.daylight * 2.4))
  if (starA > 0.02) {
    for (let i = 0; i < 60; i++) {
      g.globalAlpha = starA * (0.6 + 0.4 * Math.sin(a.t * 1.6 + i * 1.7))
      px(
        g,
        '#ffffff',
        Math.floor(hash(i) * W),
        Math.floor(hash(i + 400) * groundY * 0.6),
        1,
        1,
      )
    }
    g.globalAlpha = 1
  }

  const hy = groundY - 40
  if (a.sunF >= 0 && a.sunF <= 1) {
    const sx = Math.round(W * (0.08 + 0.84 * a.sunF))
    const sy = Math.round(hy - Math.sin(Math.PI * a.sunF) * hy * 0.7)
    const low = a.sunF < 0.07 || a.sunF > 0.93
    ellipse(
      g,
      low ? 'rgba(255,170,90,0.22)' : 'rgba(255,240,170,0.22)',
      sx,
      sy,
      18,
      18,
    )
    disc(g, low ? '#ffb45a' : '#fff0a8', sx, sy, 10)
  } else if (a.daylight < 0.6) {
    const m = Math.max(0, Math.min(1, a.moonF))
    const mx = Math.round(W * (0.15 + 0.7 * m))
    const my = Math.round(hy - Math.sin(Math.PI * m) * hy * 0.6 - 24)
    ellipse(g, 'rgba(190,205,255,0.16)', mx, my, 16, 16)
    disc(g, '#e9edff', mx, my, 9)
    disc(g, '#cbd2ee', mx - 3, my - 2, 2)
  }
}

function drawClouds(
  g: G,
  W: number,
  groundY: number,
  camX: number,
  a: Atmosphere,
): void {
  const light = tri(a.w, '#ffffff', '#ffd2ae', '#5c609c')
  const dark = tri(a.w, '#cfdcec', '#9d7aa8', '#2c3266')
  const cycle = W + 320
  for (let i = 0; i < 5; i++) {
    const w = 50 + hash(i + 10) * 60
    const h = 9 + hash(i + 20) * 6
    const u = hash(i) * cycle + a.t * (2 + hash(i + 30) * 2) - camX * 0.04
    const cx = Math.round((((u % cycle) + cycle) % cycle) - 160)
    const cy = Math.round(22 + hash(i + 40) * groundY * 0.32)
    ellipse(g, dark, cx, cy + 2, Math.round(w / 2), Math.round(h / 2))
    ellipse(g, light, cx, cy, Math.round(w / 2), Math.round(h / 2 - 1))
    ellipse(
      g,
      light,
      cx - Math.round(w * 0.2),
      cy - Math.round(h * 0.3),
      Math.round(w * 0.22),
      Math.round(h * 0.45),
    )
  }
}

function drawSilhouette(
  g: G,
  W: number,
  camX: number,
  par: number,
  amp: number,
  freq: number,
  base: number,
  seed: number,
  colour: string,
): void {
  for (let x = 0; x < W; x++) {
    const h = Math.round(10 + amp * smooth((camX * par + x) * freq, seed))
    px(g, colour, x, base - h, 1, h + 3)
  }
}

export function drawBackdrop(
  g: G,
  W: number,
  H: number,
  groundY: number,
  camX: number,
  a: Atmosphere,
): void {
  drawSky(g, W, groundY, a)
  drawClouds(g, W, groundY, camX, a)
  drawSilhouette(
    g,
    W,
    camX,
    0.08,
    90,
    1 / 230,
    groundY,
    3,
    tri(a.w, '#a8bcd6', '#9b86aa', '#2b3562'),
  )
  drawSilhouette(
    g,
    W,
    camX,
    0.22,
    42,
    1 / 150,
    groundY + 2,
    9,
    tri(a.w, '#94ae9c', '#857a98', '#222c54'),
  )

  // plain steppe with a bright top edge; sparse world-locked dashes give a sense of motion
  const top = tri(a.w, '#d6c586', '#bda070', '#40405a')
  const main = tri(a.w, '#c4b278', '#ab8f66', '#34364e')
  const low = tri(a.w, '#b3a26a', '#977d58', '#2b2c42')
  px(g, top, 0, groundY, W, 2)
  px(g, main, 0, groundY + 2, W, 20)
  px(g, low, 0, groundY + 22, W, H - groundY - 22)
  const dash = shade(main, 0.14)
  const first = Math.floor(camX - W / 2)
  for (let wx = Math.floor(first / 46) * 46; wx < first + W + 46; wx += 46) {
    const n = hash(wx * 0.31)
    if (n < 0.5) continue
    px(
      g,
      dash,
      wx - first,
      groundY + 8 + Math.floor(hash(wx) * 26),
      3 + Math.floor(n * 3),
      1,
    )
  }
}
