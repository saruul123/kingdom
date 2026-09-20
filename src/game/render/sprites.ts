import { C } from './palette'
import {
  bitmap,
  disc,
  ellipse,
  hash,
  light,
  line,
  px,
  shade,
  tint,
} from './pixel'
import type { G } from './pixel'

/**
 * Pixel-art sprites drawn from integer rectangles. Origin is the entity's
 * feet on the ground line; negative y is up. `facing` mirrors horizontally.
 */

type Rect = (c: string, dx: number, dy: number, w?: number, h?: number) => void

function mk(g: G, facing: 1 | -1): Rect {
  return (c, dx, dy, w = 1, h = 1) => {
    g.fillStyle = c
    g.fillRect(facing > 0 ? dx : -dx - w + 1, dy, w, h)
  }
}

const HURT = '#ff6a4a'

// ------------------------------------------------------------------ people

export type PersonKind = 'neutral' | 'citizen' | 'archer' | 'builder' | 'bandit'

interface Look {
  deel: string
  sash: string
  hat: string
  brim: string
  trim: string
}

const LOOK: Record<PersonKind, Look> = {
  neutral: {
    deel: '#f0eadc',
    sash: '#7a6f60',
    hat: '#8d7f68',
    brim: '#e6dcc6',
    trim: '#d8c99a',
  },
  citizen: {
    deel: '#5d86d6',
    sash: C.red,
    hat: '#2f4f8f',
    brim: C.fur,
    trim: C.gold,
  },
  archer: {
    deel: '#1fa08c',
    sash: C.gold,
    hat: '#146b5d',
    brim: C.fur,
    trim: C.gold,
  },
  builder: {
    deel: '#e08a2c',
    sash: '#4a2f16',
    hat: '#8a4e14',
    brim: '#f0dcae',
    trim: '#fbe3a0',
  },
  bandit: {
    deel: '#7a2c2c',
    sash: '#1c1010',
    hat: C.iron,
    brim: C.ironDark,
    trim: C.banditRed,
  },
}

/** Roles that get a badge above the head so they read at a glance. */
export const ROLE_COLOUR = { archer: '#1fa08c', builder: '#e08a2c' } as const

/** People are drawn at 2x so they stay readable next to the mounted hero. */
export const PERSON_SCALE = 2
export const PERSON_HEIGHT = 24 * PERSON_SCALE

export interface PersonOpts {
  kind: PersonKind
  t: number
  moving: boolean
  /** 'shoot' shows a nocked arrow; 'hammer' swings the hammer. */
  action?: 'shoot' | 'hammer' | null
  hurt?: boolean
  dead?: boolean
  fade?: number
  carrying?: boolean
}

/**
 * A plain figure in a deel and pointed hat, built from a few big pixels.
 * Origin = feet; the sprite is 23 units tall, drawn at PERSON_SCALE.
 */
export function drawPerson(
  g: G,
  x: number,
  y: number,
  facing: 1 | -1,
  o: PersonOpts,
): void {
  const look = LOOK[o.kind]
  const c = (col: string) => (o.hurt ? tint(col, HURT, 0.6) : col)
  g.save()
  g.translate(Math.round(x), Math.round(y))
  if (o.fade !== undefined) g.globalAlpha = o.fade
  if (o.dead) g.rotate((facing * Math.PI) / 2)
  g.scale(PERSON_SCALE, PERSON_SCALE)
  const r = mk(g, facing)

  const f = o.moving && !o.dead ? Math.floor(o.t * 9) % 4 : 0
  const stride = [0, 1, 0, -1][f]
  const by = o.moving && f % 2 === 1 ? -1 : 0

  r('rgba(0,0,0,0.3)', -5, -1, 11, 1)
  const legs = '#3a2c22'
  r(legs, -2 + stride, -5, 2, 4)
  r(legs, 1 - stride, -5, 2, 4)
  r('#1f1712', -2 + stride, -1, 2, 1)
  r('#1f1712', 1 - stride, -1, 2, 1)

  if (o.kind === 'bandit') {
    r('#6b4a2b', 5, -27 + by, 1, 22)
    r(c('#dfe5f0'), 4, -30 + by, 3, 3)
  }

  const body = c(look.deel)
  r(body, -3, -13 + by, 7, 5)
  r(body, -4, -8 + by, 9, 4)
  r(c(light(look.deel, 0.2)), -3, -13 + by, 1, 9)
  r(c(shade(look.deel, 0.3)), 3, -13 + by, 1, 9)
  r(c(look.sash), -3, -9 + by, 7, 1)
  r(c(look.trim), -2, -13 + by, 5, 1)

  r(c(C.skin), -2, -17 + by, 5, 4)
  r('#2a1a12', 1, -16 + by, 1, 1)
  if (o.kind === 'bandit') {
    r(c(C.banditRed), -2, -15 + by, 5, 2)
    r(c(C.iron), -3, -18 + by, 7, 2)
    r(c(light(C.iron, 0.2)), -2, -20 + by, 5, 2)
    r(c(C.ironDark), -1, -22 + by, 3, 2)
    r(c(C.banditRed), -4, -20 + by, 1, 3)
  } else {
    r(c(look.brim), -3, -18 + by, 7, 2)
    r(c(look.hat), -2, -20 + by, 5, 2)
    r(c(look.hat), -1, -22 + by, 3, 2)
    r(C.gold, 0, -23 + by, 1, 1)
  }

  r(body, 2, -12 + by, 2, 5)
  r(c(C.skin), 2, -7 + by, 2, 1)

  if (o.kind === 'archer') {
    const bow: [number, number][] = [
      [4, -17],
      [5, -16],
      [5, -15],
      [5, -14],
      [5, -13],
      [5, -12],
      [5, -11],
      [5, -10],
      [4, -9],
    ]
    for (const [bx, bY] of bow) r('#c98a3c', bx, bY + by, 1, 1)
    r('#f0f0f0', 4, -16 + by, 1, 7)
    if (o.action === 'shoot') {
      r('#e8dfc8', 1, -13 + by, 8, 1)
      r('#ffffff', 9, -13 + by, 1, 1)
    }
  } else if (o.kind === 'builder') {
    const swing = o.action === 'hammer' && Math.floor(o.t * 5) % 2 === 0
    if (swing) {
      r(C.woodDark, 4, -17 + by, 1, 9)
      r('#9aa0ac', 2, -19 + by, 5, 2)
    } else {
      r(C.woodDark, 3, -8 + by, 5, 1)
      r('#9aa0ac', 7, -10 + by, 2, 3)
    }
  }
  if (o.carrying) r(C.gold, 4, -8 + by, 2, 2)
  g.restore()
}

/** Coloured disc under a unit: allies green, raiders red, neutrals white, the hero gold. */
export function drawGroundDisc(
  g: G,
  x: number,
  colour: string,
  rx: number,
  alpha = 0.55,
): void {
  g.globalAlpha = alpha
  ellipse(g, colour, Math.round(x), 1, rx, 4)
  g.globalAlpha = 0.9
  ellipse(g, colour, Math.round(x), 1, Math.max(2, rx - 2), 2)
  g.globalAlpha = 1
}

const BOW_ICON = [
  '.yy....',
  'y..y...',
  'y..y.y.',
  'yyyyyyy',
  'y..y.y.',
  'y..y...',
  '.yy....',
]
const HAMMER_ICON = [
  'yyyyy..',
  'yyyyyy.',
  'yyyyy..',
  '..yy...',
  '..yy...',
  '..yy...',
  '..yy...',
]

/** Round badge above a worker's head showing their job. */
export function drawRoleBadge(
  g: G,
  x: number,
  y: number,
  role: 'archer' | 'builder',
): void {
  const cx = Math.round(x)
  disc(g, ROLE_COLOUR[role], cx, y, 8)
  disc(g, '#101828', cx, y, 6)
  bitmap(
    g,
    role === 'archer' ? BOW_ICON : HAMMER_ICON,
    { y: '#ffffff' },
    cx - 3,
    y - 3,
    1,
  )
}

// -------------------------------------------------------------------- hero

export interface Assets {
  hero: HTMLImageElement
}

const HERO_CELL_W = 88
const HERO_CELL_H = 92

/** Idle row column with the legs most nearly planted; the other idle frames are trot poses. */
const HERO_STANDING_FRAME = 2

/**
 * Atlas rows: idle, walk, run, attack. Walk/run advance with distance travelled;
 * standing still holds one frame instead of cycling (the idle row looks like walking).
 */
export function heroAnimationFrame(
  stride: number,
  speed01: number,
): { row: number; column: number } {
  if (speed01 <= 0.06) return { row: 0, column: HERO_STANDING_FRAME }
  return { row: speed01 > 0.7 ? 2 : 1, column: Math.floor(stride) % 4 }
}

/** Draw one foot-aligned frame of the animated mounted hero. */
export function drawHero(
  g: G,
  assets: Assets,
  x: number,
  y: number,
  facing: 1 | -1,
  stride: number,
  speed01: number,
): void {
  const { row, column } = heroAnimationFrame(stride, speed01)
  ellipse(g, 'rgba(15,20,12,0.34)', x, y - 1, 30, 3)
  g.save()
  g.translate(Math.round(x), Math.round(y))
  g.scale(facing, 1)
  g.drawImage(
    assets.hero,
    column * HERO_CELL_W,
    row * HERO_CELL_H,
    HERO_CELL_W,
    HERO_CELL_H,
    -50,
    -104,
    100,
    104,
  )
  g.restore()
}

// ------------------------------------------------------------------ banner

const SOYOMBO = [
  '...y...',
  '..yyy..',
  '..yyy..',
  '...y...',
  '.yyyyy.',
  '..yyy..',
  '.y.y.y.',
  'y.yyy.y',
  '.yyyyy.',
  'y.....y',
]

/** Blue banner with the Soyombo, flying to the left of its pole. */
export function drawBanner(
  g: G,
  x: number,
  y: number,
  t: number,
  height = 56,
): void {
  x = Math.round(x)
  y = Math.round(y)
  px(g, C.woodDark, x, y - height, 2, height)
  px(g, C.gold, x - 1, y - height - 3, 4, 3)
  px(g, C.goldDark, x, y - height - 5, 2, 2)
  const w = 26
  const h = 16
  const top = y - height + 2
  for (let i = 0; i < w; i++) {
    const wave = Math.round(
      Math.sin(t * 5 - i * 0.45) * 1.6 * Math.min(1, i / 8),
    )
    const tatter = i > w - 6 ? (i * 7) % 5 : 0
    const hh = h - tatter
    px(g, C.blue, x - 1 - i, top + wave, 1, hh)
    px(g, C.blueLight, x - 1 - i, top + wave, 1, 1)
    px(g, C.blueDark, x - 1 - i, top + wave + hh - 1, 1, 1)
  }
  const wv = Math.round(Math.sin(t * 5 - 12 * 0.45) * 1.6)
  bitmap(g, SOYOMBO, { y: '#f6dc78' }, x - 20, top + wv + 3, 1)
  // ribbons
  for (let k = 0; k < 2; k++) {
    const rx = x + 1 + k * 2
    px(
      g,
      k ? '#e8c030' : '#f0f0f0',
      rx,
      y - height + 3 + Math.round(Math.sin(t * 4 + k) * 1),
      1,
      10 + k * 3,
    )
  }
}

// --------------------------------------------------------------- buildings

export function drawGer(
  g: G,
  x: number,
  hw: number,
  wallH: number,
  roofH: number,
  hurt: boolean,
  lit: boolean,
  t: number,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.25)', -hw - 4, -1, hw * 2 + 8, 3)

  // lattice wall (khana)
  px(g, c(C.feltShade), -hw, -wallH, hw * 2, wallH)
  g.fillStyle = c(C.feltDark)
  for (let lx = -hw; lx < hw; lx += 5) {
    line(g, c(C.feltDark), lx, -wallH, Math.min(hw - 1, lx + 5), -3)
    line(g, c(C.feltDark), Math.min(hw - 1, lx + 5), -wallH, lx, -3)
  }
  px(g, c('#7a5a3a'), -hw, -3, hw * 2, 3)

  // dome roof
  const base = -wallH
  for (let dy = 0; dy <= roofH; dy++) {
    const t01 = dy / (roofH + 0.5)
    const half = Math.round((hw + 4) * Math.sqrt(1 - t01 * t01))
    for (let dx = -half; dx <= half; dx++) {
      const xn = half === 0 ? 0 : dx / half
      const col =
        xn < -0.35
          ? light(C.felt, 0.12)
          : xn > 0.4
            ? shade(C.felt, 0.2)
            : C.felt
      px(g, c(col), dx, base - dy, 1, 1)
    }
    // roof ropes
    for (const k of [-0.66, -0.33, 0.33, 0.66])
      px(g, c(C.feltDark), Math.round(half * k), base - dy, 1, 1)
  }
  px(g, c('#c0632a'), -hw - 4, base - 1, hw * 2 + 9, 3)
  px(g, c(C.blue), -hw - 4, base + 2, hw * 2 + 9, 1)
  for (let dx = -hw; dx < hw; dx += 6) px(g, c(C.gold), dx, base, 2, 1)

  // crown (toono)
  const top = base - roofH
  px(g, c(C.woodDark), -8, top - 3, 16, 4)
  px(g, c(C.red), -8, top - 4, 16, 1)
  px(g, c(C.woodLight), -2, top - 6, 4, 3)

  // door
  const dw = Math.max(10, Math.round(hw * 0.4))
  const dh = Math.round(wallH * 0.92)
  px(g, c(C.gold), -dw / 2 - 1, -dh - 1, dw + 2, dh + 1)
  px(g, c(lit ? '#f4a640' : '#a02a22'), -dw / 2, -dh, dw, dh)
  px(g, c(lit ? '#ffd27a' : C.redDark), 0, -dh, 1, dh)
  if (dw >= 14)
    for (let ry = -dh + 3; ry < -3; ry += 4)
      px(g, c(C.gold), -dw / 2 + 2, ry, dw - 4, 1)

  // smoke from the crown
  if (lit) {
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.3 + i / 4) % 1
      const sx = Math.round(Math.sin(p * 5 + i) * 4)
      px(
        g,
        `rgba(200,200,215,${0.5 * (1 - p)})`,
        sx - 2,
        top - 8 - Math.round(p * 34),
        4 + Math.round(p * 3),
        4,
      )
    }
  }
  g.restore()
}

export function drawWall(
  g: G,
  x: number,
  h: number,
  progress: number,
  damage: number,
  hurt: boolean,
  level = 1,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.25)', -11, -1, 22, 3)
  const ph = Math.max(6, Math.round(h * progress))
  for (let i = 0; i < 4; i++) {
    const lx = -8 + i * 4
    const broken = damage > 0 && i % 2 === 1 ? Math.round(damage * h * 0.35) : 0
    const lh = ph - (i % 2) * 3 - broken
    const wood = i % 2 ? C.wood : C.woodLight
    px(g, c(wood), lx, -lh, 4, lh)
    px(g, c(light(wood, 0.18)), lx, -lh, 1, lh)
    px(g, c(shade(wood, 0.35)), lx + 3, -lh, 1, lh)
    px(g, c(shade(wood, 0.3)), lx + 1, -lh - 2, 2, 2)
    px(g, c(C.woodDark), lx + 1, -lh - 3, 2, 1)
    if (damage > 0.5 && i === 2)
      px(g, C.woodDark, lx + 1, -Math.round(lh * 0.5), 1, 5)
  }
  if (ph > 14) {
    px(g, c(C.woodDark), -9, -Math.round(ph * 0.68), 18, 2)
    px(g, c(C.woodDark), -9, -Math.round(ph * 0.28), 18, 2)
    px(g, c(C.iron), -9, -Math.round(ph * 0.68), 2, 2)
    px(g, c(C.iron), 7, -Math.round(ph * 0.68), 2, 2)
  }
  if (level > 1 && ph > 14) {
    // upgraded: iron-banded and capped
    px(g, c('#b8c0d0'), -9, -Math.round(ph * 0.48), 18, 2)
    px(g, c('#b8c0d0'), -9, -Math.round(ph * 0.12), 18, 2)
    for (let i = 0; i < 4; i++) px(g, c('#e6ebf5'), -8 + i * 4, -ph - 1, 2, 2)
  }
  if (progress < 1) {
    px(g, C.woodLight, -11, -ph - 6, 1, ph + 6)
    px(g, C.woodLight, 10, -ph - 6, 1, ph + 6)
    px(g, C.woodLight, -11, -ph - 6, 22, 1)
  }
  g.restore()
}

export function drawTower(
  g: G,
  x: number,
  h: number,
  progress: number,
  hurt: boolean,
  level = 1,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.25)', -18, -1, 36, 3)
  const ph = Math.max(10, Math.round(h * Math.min(1, progress * 1.6)))
  for (let k = 0; k < 3; k++) {
    line(g, c(C.wood), -15 + k, 0, -11 + k, -ph)
    line(g, c(C.wood), 14 - k, 0, 10 - k, -ph)
  }
  line(g, c(C.woodDark), -14, 0, 10, -ph)
  line(g, c(C.woodDark), 13, 0, -11, -ph)
  line(g, c(C.woodDark), -14, -Math.round(ph * 0.5), 13, -Math.round(ph * 0.5))
  line(
    g,
    c(C.woodDark),
    -13,
    -Math.round(ph * 0.22),
    12,
    -Math.round(ph * 0.22),
  )
  if (progress >= 0.5) {
    // platform, walls, roof
    px(g, c(C.woodDark), -17, -ph, 34, 4)
    px(g, c(C.woodLight), -17, -ph, 34, 2)
    for (let dx = -15; dx <= 13; dx += 4)
      px(g, c(dx % 8 ? C.wood : C.woodLight), dx, -ph - 9, 3, 9)
    px(g, c(C.woodDark), -16, -ph - 10, 32, 2)
    // open cabin tall enough for archers to stand in
    px(g, c(C.woodDark), -16, -ph - 52, 2, 44)
    px(g, c(C.woodDark), 14, -ph - 52, 2, 44)
    const rows = 14
    for (let dy = 0; dy < rows; dy++) {
      const half = Math.round(24 * (1 - dy / (rows + 2)))
      px(
        g,
        c(
          level > 1
            ? dy % 2
              ? '#1c3f8a'
              : '#2f5cc0'
            : dy % 2
              ? '#6b2a20'
              : '#8a3a2a',
        ),
        -half,
        -ph - 52 - dy,
        half * 2 + 1,
        1,
      )
    }
    px(g, c(C.gold), 0, -ph - 70, 1, 5)
    px(g, c(C.goldDark), -1, -ph - 66, 3, 1)
  }
  g.restore()
}

/** A wall-mounted or standing torch (flame is drawn in the emissive pass). */
export function drawTorchPole(g: G, x: number, y: number): void {
  px(g, C.woodDark, x, y - 10, 2, 10)
  px(g, C.iron, x - 1, y - 12, 4, 3)
}

export function drawFlame(
  g: G,
  x: number,
  y: number,
  t: number,
  size = 1,
): void {
  const f = Math.floor(t * 12 + x) % 3
  const h = 5 * size + f
  px(g, C.fireA, x - size, y - h, 2 * size + 1, h)
  px(
    g,
    C.fireB,
    x - Math.max(1, size - 1),
    y - h + 2,
    2 * Math.max(1, size - 1) + 1,
    h - 3,
  )
  px(g, C.fireC, x, y - h + 4, 1, Math.max(1, h - 6))
  px(g, C.fireA, x + (f - 1), y - h - 1, 1, 2)
}

/** Small gold diamonds above a building, one per upgrade level. */
export function drawLevelPips(g: G, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const px0 = Math.round(x + (i - (n - 1) / 2) * 8)
    px(g, '#7a5410', px0 - 1, y - 3, 3, 7)
    px(g, '#7a5410', px0 - 3, y - 1, 7, 3)
    px(g, '#ffd24a', px0, y - 2, 1, 5)
    px(g, '#ffd24a', px0 - 2, y, 5, 1)
  }
}

export function drawOvoo(g: G, x: number, t: number): void {
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.22)', -24, -1, 48, 3)
  // stacked-stone cairn, narrowing towards the top
  const rows = 32
  for (let y = 0; y < rows; y++) {
    const half = Math.round(21 * Math.pow(1 - y / (rows + 5), 1.25))
    const course = Math.floor(y / 4) % 2 ? C.stone : shade(C.stone, 0.12)
    px(g, course, -half, -y - 1, half * 2 + 1, 1)
    px(g, light(C.stone, 0.15), -half, -y - 1, 2, 1)
    px(g, shade(C.stone, 0.32), half - 2, -y - 1, 3, 1)
    if (y % 4 === 0) px(g, C.stoneDark, -half, -y - 1, half * 2 + 1, 1)
  }
  for (let k = 0; k < 14; k++) {
    const gy = 2 + Math.floor(hash(k * 3.1) * 26)
    const half = Math.round(21 * Math.pow(1 - gy / (rows + 5), 1.25))
    px(g, C.stoneDark, Math.round((hash(k) * 2 - 1) * (half - 3)), -gy, 1, 3)
  }
  // ritual sticks and blue silk (khadag)
  const topY = -rows - 1
  for (const [dx, tip] of [
    [-6, 22],
    [0, 30],
    [6, 22],
  ] as const)
    line(g, C.woodDark, dx, topY + 2, dx * 2, topY - tip)
  for (const [k, dx] of [-11, 0, 11].entries()) {
    const tipY = topY - (k === 1 ? 30 : 22) + 4
    for (let i = 0; i < 14; i++) {
      const wv = Math.round(Math.sin(t * 3 + k + i * 0.5) * (1 + i * 0.1))
      px(g, i % 4 === 3 ? '#8ab4f0' : '#3d7fe0', dx + wv, tipY + i, 2, 1)
    }
  }
  g.restore()
}

export function drawStand(
  g: G,
  x: number,
  profession: 'archer' | 'builder',
): void {
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.22)', -12, -1, 24, 2)
  px(g, C.woodDark, -10, -26, 2, 26)
  px(g, C.woodDark, 8, -26, 2, 26)
  px(g, C.wood, -11, -25, 22, 3)
  if (profession === 'archer') {
    for (const [dx, dy] of [
      [-3, -22],
      [-2, -21],
      [-1, -20],
      [-1, -19],
      [-1, -18],
      [-1, -17],
      [-1, -16],
      [-2, -15],
      [-3, -14],
    ] as const)
      px(g, C.woodLight, dx + 3, dy, 1, 1)
    px(g, '#e8e8e8', 3, -21, 1, 7)
    px(g, C.woodLight, -6, -16, 1, 12)
    px(g, '#d9d2c0', -4, -16, 1, 12)
  } else {
    line(g, C.woodLight, -3, -6, 3, -21)
    px(g, C.iron, 1, -24, 7, 4)
    px(g, light(C.iron, 0.2), 1, -24, 7, 1)
  }
  g.restore()
}

/** Persistent, high-contrast sign for a place where the player can build. */
export function drawBuildSite(
  g: G,
  x: number,
  type: 'wall' | 'tower',
  t: number,
): void {
  x = Math.round(x)
  ellipse(g, 'rgba(7,16,24,0.58)', x, 1, 15, 3)
  px(g, '#172535', x - 12, -32, 24, 26)
  px(g, '#e4b94f', x - 12, -32, 24, 2)
  px(g, '#e4b94f', x - 12, -8, 24, 2)
  px(g, '#e4b94f', x - 12, -30, 2, 22)
  px(g, '#e4b94f', x + 10, -30, 2, 22)
  px(g, '#365b80', x - 8, -27, 16, 16)
  if (type === 'tower') {
    px(g, '#eef4df', x - 5, -22, 10, 2)
    px(g, '#eef4df', x - 3, -20, 2, 7)
    px(g, '#eef4df', x + 1, -20, 2, 7)
    px(g, '#eef4df', x - 6, -24, 12, 2)
  } else {
    for (const dx of [-5, -1, 3]) px(g, '#eef4df', x + dx, -25, 3, 12)
  }
  const glint = Math.sin(t * 3 + x) > 0.65 ? '#fff8ce' : '#f0d47d'
  px(g, glint, x - 1, -38, 3, 3)
  px(g, '#37475a', x - 10, -6, 3, 6)
  px(g, '#37475a', x + 7, -6, 3, 6)
}

/** A small beacon above an equipment stand, separate from the scenery. */
export function drawStandMarker(
  g: G,
  x: number,
  profession: 'archer' | 'builder',
  t: number,
): void {
  x = Math.round(x)
  const rim = profession === 'archer' ? '#64cbd4' : '#efbb62'
  const lift = Math.round(Math.sin(t * 2.5 + x) * 1)
  px(g, '#152334', x - 8, -43 + lift, 16, 12)
  px(g, rim, x - 8, -43 + lift, 16, 2)
  px(g, rim, x - 8, -33 + lift, 16, 2)
  px(g, '#f8f0d7', x - 1, -40 + lift, 2, 6)
  px(g, '#f8f0d7', x - 3, -38 + lift, 6, 2)
}

export function drawBorderPost(g: G, x: number, t: number): void {
  g.save()
  g.translate(Math.round(x), 0)
  px(g, C.stoneDark, -3, -5, 8, 5)
  px(g, C.stone, -2, -6, 6, 2)
  px(g, C.woodDark, 0, -44, 2, 40)
  px(g, C.gold, -1, -47, 4, 3)
  for (let i = 0; i < 10; i++) {
    const wv = Math.round(Math.sin(t * 4 + i * 0.5 + x) * 1)
    px(g, C.blue, 2 + i, -42 + wv + (i > 6 ? 1 : 0), 1, 8 - Math.floor(i * 0.5))
  }
  g.restore()
}

// ------------------------------------------------------------------- items

export function drawCoin(
  g: G,
  x: number,
  amount: number,
  t: number,
  seed: number,
): void {
  const n = Math.min(amount, 3)
  const bob = Math.round(Math.sin(t * 3 + seed) * 1.5)
  ellipse(g, 'rgba(6,13,23,0.62)', x, 0, 12, 3)
  ellipse(g, 'rgba(255,207,75,0.2)', x, -13 + bob, 15, 13)
  for (let i = 0; i < n; i++) {
    const cx = Math.round(x) + (i - (n - 1) / 2) * 8
    const cy = -13 + bob - (i % 2) * 2
    disc(g, '#172332', cx, cy, 6)
    disc(g, C.goldDark, cx, cy, 5)
    disc(g, '#ffd653', cx, cy, 4)
    px(g, '#fff9cf', cx - 2, cy - 3, 2, 2)
    px(g, '#a66519', cx + 2, cy + 1, 1, 2)
  }
  px(g, '#fff4ac', Math.round(x) - 1, -27 + bob, 2, 5)
  px(g, '#fff4ac', Math.round(x) - 3, -25 + bob, 6, 2)
}

export function drawArrow(
  g: G,
  x: number,
  y: number,
  dx: number,
  dy: number,
): void {
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  line(g, '#d9d2c0', x - ux * 8, y - uy * 8, x, y)
  px(g, '#ffffff', x, y, 2, 1)
  px(g, '#c8b898', x - ux * 8 - 1, y - uy * 8, 2, 1)
}

export function drawAnimal(
  g: G,
  type: 'rabbit' | 'deer',
  x: number,
  facing: 1 | -1,
  t: number,
  moving: boolean,
  dead: boolean,
): void {
  g.save()
  g.translate(Math.round(x), 0)
  px(
    g,
    'rgba(0,0,0,0.25)',
    type === 'deer' ? -10 : -5,
    -1,
    type === 'deer' ? 22 : 11,
    2,
  )
  if (dead) g.rotate((facing * Math.PI) / 2)
  const r = mk(g, facing)
  const f = moving && !dead ? Math.floor(t * 8) % 2 : 0
  if (type === 'rabbit') {
    const hop = moving && !dead ? (f ? 3 : 0) : 0
    g.translate(0, -hop)
    r(C.rabbit, -4, -6, 8, 4)
    r(shade(C.rabbit, 0.15), -5, -5, 4, 4)
    r(C.rabbit, 3, -9, 4, 4)
    r(C.rabbit, 4, -13, 1, 4)
    r(C.rabbit, 6, -13, 1, 4)
    r('#f6ecec', 5, -13, 1, 2)
    r('#2a1a12', 6, -8, 1, 1)
    r('#ffffff', -6, -6, 2, 2)
    r(shade(C.rabbit, 0.25), -4, -2, 2 + f, 2)
    r(shade(C.rabbit, 0.25), 3, -2, 2, 2)
  } else {
    const s = f ? 2 : -2
    const leg = '#6b4a2a'
    r(leg, -7 + s, -10, 2, 10)
    r(leg, -4 - s, -10, 2, 10)
    r(leg, 4 - s, -10, 2, 10)
    r(leg, 7 + s, -10, 2, 10)
    r('#3a2818', -7 + s, -2, 2, 2)
    r('#3a2818', 7 + s, -2, 2, 2)
    r(C.deer, -9, -18, 19, 8)
    r(light(C.deer, 0.25), -8, -12, 17, 2)
    r(shade(C.deer, 0.2), -9, -18, 3, 8)
    r(C.deer, 7, -22, 4, 8)
    r(C.deer, 9, -26, 4, 5)
    r(C.deer, 12, -25, 4, 3)
    r('#2a1a12', 15, -25, 1, 1)
    r('#2a1a12', 12, -24, 1, 1)
    r('#f2ead8', -11, -18, 2, 3)
    r('#5a3b1f', 9, -30, 1, 5)
    r('#5a3b1f', 12, -30, 1, 5)
    r('#5a3b1f', 8, -31, 1, 2)
    r('#5a3b1f', 13, -31, 1, 2)
  }
  g.restore()
}

/** Pixel HP / progress bar centred on x. */
export function drawBar(
  g: G,
  x: number,
  y: number,
  frac: number,
  colour: string,
  w = 18,
): void {
  const left = Math.round(x - w / 2)
  const top = Math.round(y)
  px(g, '#140c06', left - 1, top - 1, w + 2, 5)
  px(g, '#3a2c22', left, top, w, 3)
  px(g, colour, left, top, Math.max(0, Math.round(w * Math.min(1, frac))), 3)
  px(
    g,
    'rgba(255,255,255,0.35)',
    left,
    top,
    Math.max(0, Math.round(w * Math.min(1, frac))),
    1,
  )
}

export function drawStones(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  palette: { stone: string; dark: string; moss: string },
): void {
  ellipse(
    g,
    palette.dark,
    x,
    y + 1,
    Math.round(w / 2) + 1,
    Math.round(h / 2) + 1,
  )
  ellipse(g, palette.stone, x, y, Math.round(w / 2), Math.round(h / 2))
  px(
    g,
    light(palette.stone, 0.18),
    x - Math.round(w / 4),
    y - Math.round(h / 2),
    Math.round(w / 2),
    1,
  )
  const mossW = Math.round(w * 0.6)
  px(
    g,
    palette.moss,
    x - Math.round(mossW / 2),
    y - Math.round(h / 2) - 1,
    mossW,
    2,
  )
  if (seed % 3 === 0) disc(g, palette.dark, x + 2, y, 1)
}
