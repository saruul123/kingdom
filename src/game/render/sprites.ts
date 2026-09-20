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

export type PersonKind =
  | 'neutral'
  | 'citizen'
  | 'archer'
  | 'builder'
  | 'herder'
  | 'trader'
  | 'bandit'
  | 'raiderArcher'
  | 'heavy'

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
  herder: {
    deel: '#9a63d6',
    sash: C.gold,
    hat: '#5b3a8a',
    brim: '#f0e6ff',
    trim: '#f0d8ff',
  },
  raiderArcher: {
    deel: '#9a5a2a',
    sash: '#2a1a10',
    hat: C.iron,
    brim: C.ironDark,
    trim: C.banditRed,
  },
  heavy: {
    deel: '#3d4352',
    sash: '#1c1c24',
    hat: C.iron,
    brim: C.ironDark,
    trim: '#9aa0b0',
  },
  trader: {
    deel: '#d8a838',
    sash: '#7a2a20',
    hat: '#8a3a20',
    brim: '#f6e6b0',
    trim: '#fff0b8',
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
export const ROLE_COLOUR = {
  archer: '#1fa08c',
  builder: '#e08a2c',
  herder: '#9a63d6',
  horseman: '#4f7fe0',
  trader: '#d8a838',
} as const

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
  const hostile =
    o.kind === 'bandit' || o.kind === 'raiderArcher' || o.kind === 'heavy'
  if (hostile) {
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

  if (o.kind === 'archer' || o.kind === 'raiderArcher') {
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
  if (o.kind === 'heavy') {
    r(c(C.iron), -5, -14 + by, 2, 3)
    r(c(C.iron), 4, -14 + by, 2, 3)
    r(c('#6a5a3a'), 2, -14 + by, 4, 9)
    r(c('#c8b070'), 2, -14 + by, 4, 1)
    r(c(C.iron), 5, -27 + by, 1, 15)
    r(c('#dfe5f0'), 4, -29 + by, 3, 2)
  }
  if (o.kind === 'trader') {
    // a bundle of goods on the back
    r(c('#8a5a2a'), -7, -14 + by, 4, 8)
    r(c('#b07a3a'), -7, -14 + by, 4, 2)
    r(c(C.gold), -6, -10 + by, 2, 2)
  }
  if (o.kind === 'herder') {
    // shepherd's staff with a lasso loop (urga)
    r('#b98a4a', 5, -25 + by, 1, 21)
    r('#efe4c8', 4, -27 + by, 3, 1)
    r('#efe4c8', 4, -26 + by, 1, 2)
    r('#efe4c8', 6, -26 + by, 1, 2)
  }
  if (o.carrying) r(C.gold, 4, -8 + by, 2, 2)
  g.restore()
}

/** A raider on horseback: fast, weak, hunts citizens and herders. */
export function drawHorseRaider(
  g: G,
  x: number,
  facing: 1 | -1,
  t: number,
  moving: boolean,
  hurt: boolean,
  dead: boolean,
  fade?: number,
  ally = false,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.6) : col)
  g.save()
  g.translate(Math.round(x), 0)
  if (fade !== undefined) g.globalAlpha = fade
  if (dead) g.rotate((facing * Math.PI) / 2)
  g.scale(2, 2)
  const r = mk(g, facing)
  const gait = moving && !dead ? Math.floor(t * 12) % 4 : 0
  const s = [0, 2, 0, -2][gait]
  r('rgba(0,0,0,0.3)', -10, -1, 21, 1)
  const horse = ally ? '#9a6a3a' : '#4a3020'
  for (const [lx, o] of [
    [-7, s],
    [-5, -s],
    [4, -s],
    [6, s],
  ] as const)
    r(c('#2a1a10'), lx + o, -6, 2, 6)
  r(c(horse), -8, -13, 17, 7)
  r(c(shade(horse, 0.3)), -8, -7, 17, 1)
  r(c(horse), 8, -17, 4, 6)
  r(c(horse), 10, -18, 5, 3)
  r(c('#2a1a10'), 10, -19, 1, 2)
  r(c('#2a1a10'), -11, -13, 3, 6)
  // rider
  r(c(ally ? '#3f6fd6' : '#7a2c2c'), -2, -20, 5, 7)
  r(c(C.skin), -1, -23, 4, 3)
  r(c(ally ? C.fur : C.iron), -2, -25, 6, 2)
  r(c(ally ? '#2f4f8f' : C.iron), 0, -27, 2, 2)
  r(c(ally ? C.gold : C.banditRed), -1, -22, 4, 1)
  r('#6b4a2b', 3, -17, 13, 1)
  r(c('#dfe5f0'), 16, -18, 2, 3)
  g.restore()
}

/** Stable: a plank barn with a hay loft and a horse looking out. */
export function drawStable(
  g: G,
  x: number,
  progress: number,
  hurt: boolean,
  t: number,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.28)', -26, -1, 52, 3)
  const h = Math.max(8, Math.round(34 * progress))
  px(g, c('#7a4a26'), -22, -h, 44, h)
  for (let dx = -22; dx < 22; dx += 5) px(g, c('#5a3618'), dx, -h, 1, h)
  px(g, c('#a86a3a'), -22, -h, 44, 2)
  if (progress >= 0.6) {
    // pitched roof
    for (let dy = 0; dy < 10; dy++) {
      const half = 26 - dy * 2
      px(g, c(dy % 2 ? '#8a3a2a' : '#a44a34'), -half, -h - dy - 1, half * 2, 1)
    }
    px(g, c('#e6c860'), -8, -h - 8, 16, 3)
    // open stall with a horse
    px(g, c('#241610'), -8, -20, 16, 20)
    const nod = Math.round(Math.sin(t * 1.4 + x) * 1)
    px(g, c('#9a6a3a'), -4, -16 + nod, 9, 7)
    px(g, c('#9a6a3a'), 3, -20 + nod, 4, 6)
    px(g, c('#2a1a10'), 5, -19 + nod, 1, 1)
    px(g, c('#2a1a10'), 1, -18 + nod, 2, 7)
  }
  g.restore()
}

/** A market stall: striped awning, crates and a coin sign. */
export function drawMarket(
  g: G,
  x: number,
  progress: number,
  hurt: boolean,
  t: number,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.28)', -28, -1, 56, 3)
  const h = Math.max(8, Math.round(36 * progress))
  px(g, c(C.woodDark), -24, -h, 3, h)
  px(g, c(C.woodDark), 21, -h, 3, h)
  if (progress >= 0.6) {
    for (let dx = -26; dx < 26; dx += 6) {
      px(g, c((dx / 6) % 2 === 0 ? '#c0392b' : '#f4ead0'), dx, -h - 2, 6, 8)
    }
    px(g, c('#7a2a20'), -26, -h + 6, 52, 2)
    // goods
    px(g, c(C.wood), -18, -12, 14, 12)
    px(g, c(C.woodLight), -18, -12, 14, 2)
    px(g, c('#8fb84a'), -16, -15, 5, 3)
    px(g, c('#e08a2c'), -10, -15, 5, 3)
    px(g, c(C.wood), 4, -9, 16, 9)
    px(g, c('#d8a838'), 6, -12, 12, 3)
    // sign
    const bob = Math.round(Math.sin(t * 2 + x) * 1)
    px(g, c(C.goldDark), -3, -h - 14 + bob, 8, 8)
    px(g, c(C.gold), -2, -h - 13 + bob, 6, 6)
  }
  g.restore()
}

/** A relay station (Örtöö): hitching rail, fresh horses' water and a blue pennant. */
export function drawOrtoo(
  g: G,
  x: number,
  progress: number,
  hurt: boolean,
  t: number,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.28)', -22, -1, 44, 3)
  const h = Math.max(10, Math.round(40 * progress))
  px(g, c(C.woodDark), -16, -h, 4, h)
  px(g, c(C.woodDark), 12, -h, 4, h)
  px(g, c(C.wood), -16, -h, 32, 4)
  if (progress >= 0.6) {
    px(g, c(C.woodLight), -16, -h, 32, 1)
    // trough
    px(g, c(C.woodDark), -10, -8, 20, 6)
    px(g, c('#5aa0e0'), -8, -8, 16, 2)
    // hitching rail
    px(g, c(C.wood), -14, -20, 28, 2)
    // pennant
    px(g, c(C.woodDark), 0, -h - 22, 2, 22)
    for (let i = 0; i < 12; i++) {
      const wave = Math.round(Math.sin(t * 5 - i * 0.5) * 1.2)
      px(g, c(C.blue), 2 + i, -h - 21 + wave, 1, 8 - Math.floor(i / 3))
    }
    // hanging bell
    px(g, c(C.gold), -3, -h + 4, 6, 6)
  }
  g.restore()
}

/** A wooden ram on wheels: slow, huge damage against buildings. */
export function drawSiegeRam(
  g: G,
  x: number,
  facing: 1 | -1,
  t: number,
  moving: boolean,
  hurt: boolean,
  dead: boolean,
  fade?: number,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.6) : col)
  g.save()
  g.translate(Math.round(x), 0)
  if (fade !== undefined) g.globalAlpha = fade
  if (dead) g.rotate((facing * Math.PI) / 2)
  g.scale(2, 2)
  const r = mk(g, facing)
  const roll = moving && !dead ? Math.floor(t * 6) % 2 : 0
  r('rgba(0,0,0,0.3)', -13, -1, 27, 1)
  r(c(C.woodDark), -12, -8, 24, 3)
  r(c(C.wood), -10, -16, 20, 8)
  r(c(shade(C.wood, 0.25)), -10, -10, 20, 2)
  for (let i = 0; i < 4; i++) r(c('#9a3a2a'), -9 + i * 5, -17 - (i % 2), 4, 2)
  r(c('#5a2a20'), -8, -19, 16, 3)
  // ram beam and iron head
  r(c(C.woodLight), 4, -8, 14, 3)
  r(c(C.iron), 18, -9, 3, 5)
  r(c(C.ironDark), 20, -8, 2, 3)
  // wheels
  for (const wx of [-8, 7]) {
    r(c('#2a1a10'), wx - 3, -6 + roll, 6, 6)
    r(c(C.wood), wx - 2, -5 + roll, 4, 4)
    r(c(C.iron), wx - 1, -4 + roll, 2, 2)
  }
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
const SHEEP_ICON = [
  '.yyyy..',
  'yyyyyy.',
  'yyyyyyy',
  'yyyyyyy',
  'yyyyyyy',
  '.y..y..',
  '.y..y..',
]
const COIN_ICON = [
  '..yyy..',
  '.yyyyy.',
  'yyy.yyy',
  'yy...yy',
  'yyy.yyy',
  '.yyyyy.',
  '..yyy..',
]
const SHIELD_ICON = [
  'yyyyyyy',
  'yyyyyyy',
  'yyyyyyy',
  '.yyyyy.',
  '.yyyyy.',
  '..yyy..',
  '...y...',
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
  role: 'archer' | 'builder' | 'herder' | 'horseman' | 'trader',
): void {
  const cx = Math.round(x)
  disc(g, ROLE_COLOUR[role], cx, y, 8)
  disc(g, '#101828', cx, y, 6)
  bitmap(
    g,
    role === 'archer'
      ? BOW_ICON
      : role === 'herder'
        ? SHEEP_ICON
        : role === 'horseman'
          ? SHIELD_ICON
          : role === 'trader'
            ? COIN_ICON
            : HAMMER_ICON,
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
  attackFlash = 0,
): void {
  let { row, column } = heroAnimationFrame(stride, speed01)
  if (attackFlash > 0) {
    // bow-drawing frames from the atlas' attack row
    row = 3
    column = Math.min(3, Math.floor((1 - attackFlash / 0.28) * 4))
  }
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
    // level 3: stone-faced
    const wood =
      level >= 3
        ? i % 2
          ? '#8a877f'
          : '#a5a298'
        : i % 2
          ? C.wood
          : C.woodLight
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

/** A gate: two tall posts and iron-bound double doors. */
export function drawGate(
  g: G,
  x: number,
  h: number,
  progress: number,
  damage: number,
  hurt: boolean,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.28)', -16, -1, 32, 3)
  const ph = Math.max(10, Math.round(h * progress))
  px(g, c(C.woodDark), -13, -ph - 4, 5, ph + 4)
  px(g, c(C.woodDark), 8, -ph - 4, 5, ph + 4)
  px(g, c(C.woodLight), -13, -ph - 4, 1, ph + 4)
  px(g, c(C.gold), -14, -ph - 7, 7, 3)
  px(g, c(C.gold), 7, -ph - 7, 7, 3)
  px(g, c(C.woodDark), -8, -ph, 16, 4)
  const doorH = Math.max(6, ph - 4)
  px(g, c(C.wood), -8, -doorH, 7, doorH)
  px(g, c(C.wood), 1, -doorH, 7, doorH)
  px(g, c(C.woodLight), -8, -doorH, 1, doorH)
  px(g, c(C.woodLight), 1, -doorH, 1, doorH)
  px(g, c(C.iron), -8, -Math.round(doorH * 0.75), 16, 2)
  px(g, c(C.iron), -8, -Math.round(doorH * 0.3), 16, 2)
  px(g, c(C.gold), -2, -Math.round(doorH * 0.5), 2, 3)
  px(g, c(C.gold), 1, -Math.round(doorH * 0.5), 2, 3)
  if (damage > 0.5) px(g, c(C.woodDark), 2, -Math.round(doorH * 0.6), 4, 5)
  if (progress < 1) px(g, C.woodLight, -14, -ph - 10, 28, 1)
  g.restore()
}

/** A fenced yard with grazing sheep; more herders means a bigger flock. */
export function drawPasture(
  g: G,
  x: number,
  progress: number,
  damage: number,
  hurt: boolean,
  t: number,
  herders: number,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  ellipse(g, 'rgba(120,150,70,0.55)', 0, 0, 34, 6)
  const fenceH = Math.max(6, Math.round(16 * progress))
  for (let dx = -28; dx <= 28; dx += 14) {
    px(g, c(C.woodDark), dx - 1, -fenceH, 3, fenceH)
    px(g, c(C.woodLight), dx - 1, -fenceH, 3, 1)
  }
  if (progress > 0.4) {
    px(g, c(C.wood), -28, -fenceH + 3, 57, 2)
    px(g, c(C.wood), -28, -fenceH + 9, 57, 2)
  }
  if (damage > 0.5) px(g, c(C.woodDark), 2, -fenceH + 3, 8, 2)
  if (progress >= 1) {
    const flock = 3 + herders * 2
    for (let i = 0; i < flock; i++) {
      const sx = Math.round(
        -22 + ((i * 37) % 44) + Math.sin(t * 0.6 + i * 2.1) * 3,
      )
      const sy = -1 - (i % 2) * 2
      ellipse(g, c('#f4f0e6'), sx, sy - 4, 4, 3)
      px(g, c('#3a2c22'), sx + (i % 2 ? -5 : 4), sy - 5, 2, 2)
      px(g, c('#3a2c22'), sx - 2, sy - 1, 1, 2)
      px(g, c('#3a2c22'), sx + 2, sy - 1, 1, 2)
    }
  }
  g.restore()
}

/** A raiders' camp: dark tents, a fire and a wolf-skin banner. */
export function drawEnemyCamp(
  g: G,
  x: number,
  hurt: boolean,
  cleared: boolean,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.3)', -46, -1, 92, 3)
  if (cleared) {
    // burnt ground and toppled poles
    ellipse(g, 'rgba(40,30,28,0.55)', 0, 0, 40, 5)
    line(g, '#3a2c22', -30, -1, -12, -9)
    line(g, '#3a2c22', 14, -1, 30, -6)
    px(g, '#5a5a62', -4, -3, 9, 3)
    g.restore()
    return
  }
  for (const [tx, w, h] of [
    [-26, 40, 30],
    [22, 34, 24],
  ] as const) {
    for (let dy = 0; dy < h; dy++) {
      const half = Math.round((w / 2) * (1 - dy / (h + 2)))
      px(
        g,
        c(dy % 5 === 0 ? '#1c1418' : '#3a2a2e'),
        tx - half,
        -1 - dy,
        half * 2 + 1,
        1,
      )
    }
    px(g, c(C.banditRed), tx - 3, -8, 6, 8)
    px(g, c('#2a1a10'), tx - 1, -h - 6, 2, 6)
  }
  // fire
  px(g, C.stoneDark, -5, -3, 4, 3)
  px(g, C.stoneDark, 2, -3, 4, 3)
  px(g, C.woodDark, -4, -5, 9, 2)
  // banner
  px(g, '#2a1a10', 46, -46, 2, 46)
  px(g, c('#5a1f1f'), 48, -46, 14, 16)
  px(g, c('#e0c090'), 52, -42, 6, 3)
  px(g, c('#e0c090'), 54, -39, 2, 6)
  g.restore()
}

/** A wooden watch fort with a blue banner — the mark of a claimed camp. */
export function drawOutpost(
  g: G,
  x: number,
  progress: number,
  hurt: boolean,
  t: number,
): void {
  const c = (col: string) => (hurt ? tint(col, HURT, 0.5) : col)
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.28)', -24, -1, 48, 3)
  const h = Math.max(10, Math.round(40 * progress))
  px(g, c(C.woodDark), -18, -h, 36, h)
  for (let dx = -16; dx < 16; dx += 6) {
    px(g, c(C.wood), dx, -h + 1, 5, h - 1)
    px(g, c(C.woodLight), dx, -h + 1, 1, h - 1)
  }
  if (progress >= 0.6) {
    for (let dx = -18; dx < 18; dx += 6) px(g, c(C.woodDark), dx, -h - 5, 4, 5)
    px(g, c('#5a2a1c'), -20, -h - 8, 40, 3)
    px(g, c(C.woodDark), 0, -h - 34, 2, 30)
    const w = 14
    for (let i = 0; i < w; i++) {
      const wave = Math.round(Math.sin(t * 5 - i * 0.5) * 1.2)
      px(g, c(C.blue), 2 + i, -h - 33 + wave, 1, 9)
    }
    px(g, c('#f6dc78'), 6, -h - 30, 3, 3)
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

/** A stone-ringed well with a wooden crank and a bucket. */
export function drawWell(g: G, x: number, used: boolean): void {
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.25)', -18, -1, 36, 3)
  px(g, C.stoneDark, -14, -14, 28, 14)
  for (let i = 0; i < 4; i++) {
    px(g, i % 2 ? C.stone : light(C.stone, 0.1), -14 + i * 7, -14, 7, 7)
    px(g, i % 2 ? light(C.stone, 0.1) : C.stone, -14 + i * 7, -7, 7, 7)
  }
  px(g, used ? '#3a4a5a' : '#4a90d8', -10, -15, 20, 2)
  px(g, C.woodDark, -13, -34, 3, 22)
  px(g, C.woodDark, 10, -34, 3, 22)
  px(g, C.wood, -14, -36, 28, 3)
  px(g, C.woodLight, -14, -36, 28, 1)
  px(g, '#d9d2c0', 0, -33, 1, 12)
  px(g, C.woodLight, -3, -21, 7, 5)
  g.restore()
}

/** Toppled stone walls: a place to dig (grey and dark once looted). */
export function drawRuins(g: G, x: number, looted: boolean): void {
  g.save()
  g.translate(Math.round(x), 0)
  px(g, 'rgba(0,0,0,0.25)', -28, -1, 56, 3)
  const stone = looted ? '#77746e' : C.stone
  px(g, stone, -24, -12, 8, 12)
  px(g, shade(stone, 0.2), -24, -12, 2, 12)
  px(g, stone, -8, -22, 9, 22)
  px(g, light(stone, 0.12), -8, -22, 9, 2)
  px(g, shade(stone, 0.25), 6, -22, 3, 22)
  px(g, stone, 14, -9, 11, 9)
  px(g, C.stoneDark, -16, -5, 6, 5)
  px(g, C.stoneDark, 1, -6, 6, 6)
  if (!looted) {
    // a glint of something buried
    px(g, C.gold, 8, -3, 3, 2)
    px(g, '#fff2a8', 9, -4, 1, 1)
  }
  g.restore()
}

export function drawStand(
  g: G,
  x: number,
  profession: 'archer' | 'builder' | 'herder',
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
  } else if (profession === 'herder') {
    px(g, '#b98a4a', -1, -22, 2, 20)
    px(g, '#efe4c8', -4, -23, 8, 2)
    px(g, '#efe4c8', -4, -22, 2, 6)
    px(g, '#efe4c8', 2, -22, 2, 6)
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
  type:
    | 'wall'
    | 'tower'
    | 'gate'
    | 'pasture'
    | 'stable'
    | 'market'
    | 'ortoo'
    | 'outpost',
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
  } else if (type === 'market') {
    px(g, '#eef4df', x - 8, -26, 16, 4)
    px(g, '#eef4df', x - 6, -22, 2, 8)
    px(g, '#eef4df', x + 4, -22, 2, 8)
    px(g, '#eef4df', x - 3, -20, 6, 4)
  } else if (type === 'ortoo') {
    px(g, '#eef4df', x - 2, -27, 4, 14)
    px(g, '#eef4df', x - 7, -22, 14, 3)
    px(g, '#eef4df', x + 5, -26, 4, 4)
  } else if (type === 'stable') {
    // a horse head
    px(g, '#eef4df', x - 6, -22, 10, 8)
    px(g, '#eef4df', x + 3, -28, 5, 8)
    px(g, '#eef4df', x - 7, -16, 3, 4)
  } else if (type === 'outpost') {
    // a flag on a hill
    px(g, '#eef4df', x - 1, -26, 2, 13)
    px(g, '#eef4df', x + 1, -26, 8, 5)
    px(g, '#eef4df', x - 6, -14, 12, 2)
  } else if (type === 'pasture') {
    // a sheep
    px(g, '#eef4df', x - 6, -24, 10, 6)
    px(g, '#eef4df', x - 4, -26, 6, 3)
    px(g, '#eef4df', x + 3, -22, 4, 4)
    px(g, '#eef4df', x - 5, -18, 2, 4)
    px(g, '#eef4df', x + 1, -18, 2, 4)
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
  profession: 'archer' | 'builder' | 'herder',
  t: number,
): void {
  x = Math.round(x)
  const rim =
    profession === 'archer'
      ? '#64cbd4'
      : profession === 'herder'
        ? '#b98cf0'
        : '#efbb62'
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
  hostile = false,
): void {
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  line(g, hostile ? '#c04a3a' : '#d9d2c0', x - ux * 8, y - uy * 8, x, y)
  px(g, hostile ? '#ffb0a0' : '#ffffff', x, y, 2, 1)
  px(g, hostile ? '#7a2a20' : '#c8b898', x - ux * 8 - 1, y - uy * 8, 2, 1)
}

export function drawAnimal(
  g: G,
  type: 'rabbit' | 'deer' | 'wolf',
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
  if (type === 'wolf') {
    const s = f ? 2 : -2
    const fur = '#7d7d88'
    for (const lx of [-8, -5, 4, 7])
      r('#4a4a54', lx + (lx % 2 ? s : -s), -6, 2, 6)
    r(fur, -9, -12, 18, 6)
    r(light(fur, 0.2), -8, -12, 16, 1)
    r(shade(fur, 0.25), -10, -11, 3, 5)
    r(fur, 8, -15, 5, 5)
    r(fur, 11, -13, 4, 3)
    r('#2a2a30', 14, -13, 1, 1)
    r('#ff5a4a', 11, -15, 1, 1)
    r('#4a4a54', 9, -18, 1, 3)
    r('#4a4a54', 12, -18, 1, 3)
    r(fur, -13, -12, 4, 2)
    r('#4a4a54', -15, -11, 3, 2)
  } else if (type === 'rabbit') {
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
