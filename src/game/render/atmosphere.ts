import type { Phase } from '../core/types'
import { hash, mix } from './color'
import { SKY, todWeights, tri } from './palette'
import type { Tod } from './palette'
import { disc, ellipse, px, shade, light } from './pixel'
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

export function horizonColour(a: Atmosphere): string {
  return tri(a.w, SKY.day[3], SKY.dusk[3], SKY.night[3])
}

// ------------------------------------------------------------------ noise

function vnoise(x: number, seed: number): number {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  const a = hash(i + seed * 31.7)
  const b = hash(i + 1 + seed * 31.7)
  return a + (b - a) * u
}

/** Ridged multi-octave noise: sharp peaks, 0..1. */
function ridged(x: number, seed: number): number {
  let sum = 0
  let amp = 1
  let freq = 1
  let total = 0
  for (let o = 0; o < 4; o++) {
    const n = 1 - Math.abs(vnoise(x * freq, seed + o) * 2 - 1)
    sum += n * n * amp
    total += amp
    amp *= 0.5
    freq *= 2.1
  }
  return sum / total
}

function smooth(x: number, seed: number): number {
  return vnoise(x, seed) * 0.65 + vnoise(x * 2.3, seed + 5) * 0.35
}

// -------------------------------------------------------------------- sky

export function drawSky(g: G, W: number, groundY: number, a: Atmosphere): void {
  const stops = skyStops(a)
  const bandH = 3
  const span = groundY + 10
  for (let y = 0; y < span; y += bandH) {
    const p = Math.min(1, y / (groundY - 20)) * 3
    const k = Math.min(2, Math.floor(p))
    px(g, mix(stops[k], stops[k + 1], p - k), 0, y, W, bandH)
  }

  const starA = Math.max(0, Math.min(1, 1 - a.daylight * 2.4))
  if (starA > 0.02) {
    for (let i = 0; i < 110; i++) {
      const tw = 0.55 + 0.45 * Math.sin(a.t * 1.6 + i * 1.7)
      g.globalAlpha = starA * tw
      const sx = Math.floor(hash(i) * W)
      const sy = Math.floor(hash(i + 400) * groundY * 0.72)
      px(g, '#ffffff', sx, sy, 1, 1)
      if (i % 9 === 0) {
        px(g, '#cfd8ff', sx - 1, sy, 3, 1)
        px(g, '#cfd8ff', sx, sy - 1, 1, 3)
      }
    }
    g.globalAlpha = 1
  }

  const hy = groundY - 36
  if (a.sunF >= 0 && a.sunF <= 1) {
    const sx = Math.round(W * (0.08 + 0.84 * a.sunF))
    const sy = Math.round(hy - Math.sin(Math.PI * a.sunF) * hy * 0.78)
    const low = a.sunF < 0.07 || a.sunF > 0.93
    for (const [r, al] of [
      [30, 0.07],
      [22, 0.1],
      [16, 0.16],
    ] as const) {
      ellipse(
        g,
        low ? `rgba(255,150,80,${al})` : `rgba(255,230,150,${al})`,
        sx,
        sy,
        r,
        r,
      )
    }
    disc(g, low ? '#ffb45a' : '#fff0a8', sx, sy, 10)
    disc(g, low ? '#ffd58a' : '#fffbe0', sx - 2, sy - 2, 5)
  } else if (a.daylight < 0.6) {
    const m = Math.max(0, Math.min(1, a.moonF))
    const mx = Math.round(W * (0.15 + 0.7 * m))
    const my = Math.round(hy - Math.sin(Math.PI * m) * hy * 0.62 - 26)
    for (const [r, al] of [
      [26, 0.06],
      [19, 0.09],
      [14, 0.14],
    ] as const) {
      ellipse(g, `rgba(190,205,255,${al})`, mx, my, r, r)
    }
    disc(g, '#e9edff', mx, my, 10)
    disc(g, '#cbd2ee', mx - 3, my - 2, 3)
    disc(g, '#cbd2ee', mx + 3, my + 3, 2)
    disc(g, '#d6dcf4', mx + 2, my - 4, 2)
  }
}

export function drawClouds(
  g: G,
  W: number,
  groundY: number,
  camX: number,
  a: Atmosphere,
): void {
  const lightC = tri(a.w, '#ffffff', '#ffc59a', '#7a78b8')
  const darkC = tri(a.w, '#b8cce6', '#8a5c9a', '#2a3064')
  const rimC = tri(a.w, '#ffffff', '#ffe0b8', '#d8a0c0')
  const cycle = W + 320
  for (let i = 0; i < 10; i++) {
    const w = 46 + hash(i + 10) * 84
    const h = 9 + hash(i + 20) * 9
    const speed = 2 + hash(i + 30) * 3
    const u = hash(i) * cycle + a.t * speed - camX * 0.04
    const cx = Math.round((((u % cycle) + cycle) % cycle) - 160)
    const cy = Math.round(18 + hash(i + 40) * groundY * 0.42)
    g.globalAlpha = a.w.n > 0.5 ? 0.8 : 0.92
    const blobs: [number, number, number, number][] = [
      [0, 0, w / 2, h / 2],
      [-w * 0.26, -h * 0.28, w * 0.22, h * 0.5],
      [w * 0.14, -h * 0.5, w * 0.26, h * 0.62],
      [w * 0.36, -h * 0.05, w * 0.18, h * 0.4],
    ]
    for (const [dx, dy, rx, ry] of blobs)
      ellipse(g, darkC, cx + dx, cy + dy + 2, Math.round(rx), Math.round(ry))
    for (const [dx, dy, rx, ry] of blobs)
      ellipse(g, lightC, cx + dx, cy + dy, Math.round(rx), Math.round(ry - 1))
    px(
      g,
      rimC,
      cx - Math.round(w * 0.12),
      cy - Math.round(h * 0.5),
      Math.round(w * 0.3),
      1,
    )
  }
  g.globalAlpha = 1
}

// -------------------------------------------------------------- mountains

interface Layer {
  par: number
  amp: number
  freq: number
  base: number
  seed: number
  snow: boolean
  rock: string
  rockShade: string
  snowC?: string
  snowShade?: string
  haze: number
}

function drawRidge(
  g: G,
  W: number,
  camX: number,
  L: Layer,
  hazeC: string,
): void {
  const heights: number[] = new Array(W + 4)
  for (let x = -2; x < W + 2; x++) {
    const u = (camX * L.par + x) * L.freq
    heights[x + 2] = 8 + L.amp * ridged(u, L.seed)
  }
  const snowLine = L.amp * 0.5
  for (let x = 0; x < W; x++) {
    const h = Math.round(heights[x + 2])
    const slope = heights[x + 4] - heights[x]
    const top = L.base - h
    const lit = slope > -0.2
    const rock =
      L.haze > 0
        ? mix(lit ? L.rock : L.rockShade, hazeC, L.haze)
        : lit
          ? L.rock
          : L.rockShade
    px(g, rock, x, top, 1, L.base - top + 30)
    const u = camX * L.par + x
    if (hash(u * 0.31) > 0.86 && h > 20)
      px(
        g,
        L.haze > 0 ? mix(L.rockShade, hazeC, L.haze) : L.rockShade,
        x,
        top + 6,
        1,
        Math.min(h * 0.5, 8 + hash(u) * 14),
      )
    if (L.snow && L.snowC && L.snowShade && h > snowLine) {
      const depth = Math.min((h - snowLine) * 0.62 + hash(u * 0.7) * 4, 46)
      const sc = mix(lit ? L.snowC : L.snowShade, hazeC, L.haze * 0.6)
      px(g, sc, x, top, 1, Math.round(depth))
      if (!lit)
        px(
          g,
          mix(L.snowShade, hazeC, L.haze * 0.6),
          x,
          top + Math.round(depth * 0.5),
          1,
          Math.round(depth * 0.5),
        )
    }
    px(g, lit ? light(rock, 0.12) : rock, x, top, 1, 1)
  }
}

export function drawMountains(
  g: G,
  W: number,
  groundY: number,
  camX: number,
  a: Atmosphere,
): void {
  const hazeC = horizonColour(a)
  const far: Layer = {
    par: 0.08,
    amp: 150,
    freq: 1 / 170,
    base: groundY - 34,
    seed: 3,
    snow: true,
    rock: tri(a.w, '#7f92bd', '#8a6a9a', '#34407a'),
    rockShade: tri(a.w, '#62779f', '#5e4a80', '#232d62'),
    snowC: tri(a.w, '#f7faff', '#ffcbc4', '#b9c4f0'),
    snowShade: tri(a.w, '#c6d4ee', '#b990b4', '#7a84bc'),
    haze: 0.28,
  }
  const mid: Layer = {
    par: 0.2,
    amp: 82,
    freq: 1 / 120,
    base: groundY - 12,
    seed: 11,
    snow: false,
    rock: tri(a.w, '#6c8aa3', '#6a5578', '#1f2b5a'),
    rockShade: tri(a.w, '#557088', '#4d3d66', '#172050'),
    haze: 0.16,
  }
  drawRidge(g, W, camX, far, hazeC)
  drawRidge(g, W, camX, mid, hazeC)

  // low rolling steppe with pines and far-off gers
  const hill = tri(a.w, '#7d9a58', '#66705a', '#16294a')
  const hillShade = tri(a.w, '#688747', '#525a4c', '#101f3e')
  const base = groundY + 2
  const pine = tri(a.w, '#3d6a3f', '#35443f', '#0d1d38')
  for (let x = 0; x < W; x++) {
    const u = camX * 0.42 + x
    const h = Math.round(6 + 26 * smooth(u / 130, 21))
    px(
      g,
      hash(Math.floor(u / 40)) > 0.8 ? hillShade : hill,
      x,
      base - h,
      1,
      h + 40,
    )
  }
  for (let x = 0; x < W; x += 3) {
    const u = camX * 0.42 + x
    const gx = Math.floor(u / 3)
    const h = Math.round(6 + 26 * smooth(u / 130, 21))
    if (hash(gx * 1.7) > 0.93) {
      const ph = 9 + Math.floor(hash(gx) * 8)
      px(g, pine, x, base - h - ph, 1, ph)
      px(g, pine, x - 1, base - h - ph + 3, 3, ph - 3)
      px(
        g,
        pine,
        x - 2,
        base - h - Math.round(ph * 0.4),
        5,
        Math.round(ph * 0.4),
      )
    } else if (hash(gx * 2.9) > 0.985) {
      const gc = tri(a.w, '#f4efe0', '#e8c8b0', '#8a90b8')
      ellipse(g, gc, x, base - h - 1, 4, 3)
      px(g, gc, x - 4, base - h, 9, 2)
      px(g, '#3a2c22', x, base - h, 1, 2)
    }
  }
}

// ----------------------------------------------------------- ground/water

export const BANK = 30

export function drawGroundAndWater(
  g: G,
  W: number,
  H: number,
  groundY: number,
  camX: number,
  a: Atmosphere,
): void {
  const top = tri(a.w, '#9db34a', '#84904f', '#22463c')
  const main = tri(a.w, '#7f9c3c', '#68793f', '#183a2c')
  const low = tri(a.w, '#607f31', '#4f6238', '#102c25')
  const soil = tri(a.w, '#6b5238', '#4f3f36', '#1a1a2a')

  px(g, top, 0, groundY, W, 3)
  px(g, main, 0, groundY + 3, W, 16)
  px(g, low, 0, groundY + 19, W, BANK - 19)
  px(g, soil, 0, groundY + BANK, W, 3)
  px(g, shade(soil, 0.3), 0, groundY + BANK + 3, W, 1)

  // grass blades and flowers (locked to the world)
  for (let x = 0; x < W; x += 2) {
    const u = Math.floor(camX) + x
    const hsh = hash(u * 0.73)
    if (hsh > 0.72) {
      const bh = 2 + Math.floor(hash(u) * 4)
      const y = groundY + 1 + Math.floor(hash(u * 1.9) * (BANK - 6))
      px(g, hsh > 0.9 ? top : shade(main, 0.25), x, y - bh, 1, bh)
    } else if (hsh < 0.02) {
      const y = groundY + 3 + Math.floor(hash(u * 3.1) * 20)
      px(g, hsh < 0.01 ? '#f4dc4a' : '#e8f0ff', x, y, 2, 2)
    }
  }

  // water
  const wTop = groundY + BANK + 4
  const wa = tri(a.w, '#5a92c6', '#8a5f94', '#141d4a')
  const wb = tri(a.w, '#2f5e94', '#4a3670', '#0a1030')
  const rows = H - wTop
  const bandH = 3
  for (let y = 0; y < rows; y += bandH)
    px(g, mix(wa, wb, y / Math.max(1, rows)), 0, wTop + y, W, bandH)
  const ripple = tri(a.w, '#a8d0f0', '#e8a8a0', '#4a5aa0')
  for (let k = 0; k < 26; k++) {
    const yy = wTop + 3 + Math.floor(hash(k + 60) * (rows - 4))
    const len = 6 + Math.floor(hash(k + 90) * 16)
    const dir = hash(k + 120) > 0.5 ? 1 : -1
    const xx =
      Math.round(
        (((hash(k) * (W + 40) +
          a.t * (5 + hash(k + 7) * 8) * dir -
          camX * 0.25) %
          (W + 40)) +
          (W + 40)) %
          (W + 40),
      ) - 20
    g.globalAlpha = 0.35
    px(g, ripple, xx, yy, len, 1)
    g.globalAlpha = 1
  }
  // shore reeds
  for (let x = 0; x < W; x += 3) {
    const u = Math.floor(camX) + x
    if (hash(u * 0.41) > 0.9) {
      const rh = 4 + Math.floor(hash(u) * 6)
      px(
        g,
        tri(a.w, '#4a6a2a', '#3a4a30', '#0e2420'),
        x,
        groundY + BANK + 4 - rh,
        1,
        rh,
      )
    }
  }
}

/** Foreground stones on the grass, locked to world x. `ox` is the world x at the left edge of the view. */
export function drawGroundProps(
  W: number,
  groundY: number,
  ox: number,
  drawStones: (
    x: number,
    y: number,
    w: number,
    h: number,
    seed: number,
  ) => void,
): void {
  const start = Math.floor(ox / 70) * 70
  for (let wx = start - 70; wx < ox + W + 70; wx += 70) {
    const h1 = hash(wx * 0.19)
    if (h1 > 0.55) {
      const sx = Math.round(wx + hash(wx) * 60 - ox)
      const sy = groundY + 12 + Math.floor(hash(wx * 1.3) * 12)
      drawStones(
        sx,
        sy,
        10 + Math.floor(hash(wx * 2.1) * 12),
        5 + Math.floor(hash(wx * 0.7) * 3),
        Math.floor(h1 * 100),
      )
    }
  }
}

/** Warm light reflected in the lake below a light source at screen x. */
export function drawReflection(
  g: G,
  sx: number,
  waterTop: number,
  H: number,
  colour: string,
  strength: number,
  t: number,
): void {
  const rows = Math.floor((H - waterTop) / 3)
  for (let k = 0; k < rows; k++) {
    const jitter = Math.round(Math.sin(t * 3 + k * 1.3 + sx) * (1 + k * 0.15))
    const w = Math.max(1, 3 - Math.floor(k / 5))
    g.globalAlpha = Math.max(0, strength * (1 - k / rows) * (k % 2 ? 0.55 : 1))
    px(g, colour, sx + jitter - Math.floor(w / 2), waterTop + 2 + k * 3, w, 2)
  }
  g.globalAlpha = 1
}
