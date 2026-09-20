import { hash } from './color'

type G = CanvasRenderingContext2D

export const PAL = {
  wood: '#7b5230',
  woodDark: '#4e321d',
  woodLight: '#a97a4b',
  felt: '#f3ecd9',
  feltShade: '#d9cfb4',
  door: '#b3261e',
  gold: '#e8b923',
  goldDark: '#a67c00',
  blue: '#1f56b8',
  skin: '#e0b48a',
  bandit: '#3b2626',
  banditScarf: '#8b1a1a',
  citizen: '#6f92cf',
  neutral: '#a39683',
  archer: '#2f7f6d',
  builder: '#c0752b',
  horse: '#7a4a2a',
  horseDark: '#4a2b16',
  stone: '#8c8a83',
  silk: '#2b7bd4',
}

export interface PersonStyle {
  deel: string
  sash?: string
  hat?: string
  t: number
  moving: boolean
  tool?: 'bow' | 'hammer' | 'club' | null
  scale?: number
  lying?: boolean
  alpha?: number
}

/** A small Mongolian-clad figure in a deel and pointed hat. Origin = feet, y up is negative. */
export function drawPerson(
  g: G,
  x: number,
  y: number,
  facing: 1 | -1,
  s: PersonStyle,
): void {
  const k = s.scale ?? 1
  g.save()
  g.globalAlpha = s.alpha ?? 1
  g.translate(x, y)
  if (s.lying) g.rotate((facing * Math.PI) / 2)
  g.scale(facing * k, k)
  const swing = s.moving ? Math.sin(s.t * 11) * 4 : 0

  g.fillStyle = 'rgba(0,0,0,0.22)'
  g.beginPath()
  g.ellipse(0, 0, 7, 2, 0, 0, Math.PI * 2)
  g.fill()

  g.strokeStyle = '#2b2118'
  g.lineWidth = 2.4
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(-1.5, -9)
  g.lineTo(-2 + swing, -0.5)
  g.moveTo(1.5, -9)
  g.lineTo(2 - swing, -0.5)
  g.stroke()

  // deel: long robe, wider at the hem
  g.fillStyle = s.deel
  g.beginPath()
  g.moveTo(-4, -22)
  g.lineTo(4, -22)
  g.lineTo(5.5, -7)
  g.lineTo(-5.5, -7)
  g.closePath()
  g.fill()
  g.fillStyle = s.sash ?? '#c8262c'
  g.fillRect(-4.2, -15.5, 8.4, 2.4)

  // arm + tool
  g.strokeStyle = s.deel
  g.lineWidth = 2.6
  g.beginPath()
  g.moveTo(1, -20)
  g.lineTo(6, -15 + (s.moving ? Math.sin(s.t * 11) : 0))
  g.stroke()
  if (s.tool === 'bow') {
    g.strokeStyle = PAL.woodLight
    g.lineWidth = 1.6
    g.beginPath()
    g.arc(4, -16, 8, -Math.PI * 0.42, Math.PI * 0.42)
    g.stroke()
    g.strokeStyle = '#eee'
    g.lineWidth = 0.6
    g.beginPath()
    g.moveTo(
      4 + 8 * Math.cos(-Math.PI * 0.42),
      -16 + 8 * Math.sin(-Math.PI * 0.42),
    )
    g.lineTo(
      4 + 8 * Math.cos(Math.PI * 0.42),
      -16 + 8 * Math.sin(Math.PI * 0.42),
    )
    g.stroke()
  } else if (s.tool === 'hammer') {
    g.strokeStyle = PAL.woodDark
    g.lineWidth = 1.8
    g.beginPath()
    g.moveTo(6, -15)
    g.lineTo(9, -25)
    g.stroke()
    g.fillStyle = '#777'
    g.fillRect(6.5, -28, 6, 4)
  } else if (s.tool === 'club') {
    g.strokeStyle = PAL.woodDark
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(6, -15)
    g.lineTo(10, -27)
    g.stroke()
  }

  // head + hat
  g.fillStyle = PAL.skin
  g.beginPath()
  g.arc(0, -25.5, 3.8, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = s.hat ?? s.deel
  g.beginPath()
  g.moveTo(-4.6, -27)
  g.quadraticCurveTo(0, -37, 4.6, -27)
  g.closePath()
  g.fill()
  g.fillStyle = PAL.gold
  g.fillRect(-0.7, -36.5, 1.4, 2)
  g.restore()
}

export function drawHorseRider(
  g: G,
  x: number,
  y: number,
  facing: 1 | -1,
  t: number,
  speed01: number,
  banner: boolean,
  alpha: number,
): void {
  g.save()
  g.globalAlpha = alpha
  g.translate(x, y)
  g.scale(facing * 1.2, 1.2)
  const gait = t * (9 + speed01 * 8)
  const amp = 0.25 + speed01 * 0.6

  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.ellipse(0, 0, 22, 3, 0, 0, Math.PI * 2)
  g.fill()

  const leg = (lx: number, phase: number) => {
    const a = Math.sin(gait + phase) * amp
    g.strokeStyle = PAL.horseDark
    g.lineWidth = 3
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(lx, -15)
    g.lineTo(
      lx + Math.sin(a) * 12,
      -1 - Math.max(0, Math.cos(gait + phase)) * 3 * speed01,
    )
    g.stroke()
  }
  leg(-13, 0)
  leg(-9, Math.PI * 0.7)
  leg(10, Math.PI)
  leg(14, Math.PI * 1.7)

  // tail
  g.strokeStyle = PAL.horseDark
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(-19, -24)
  g.quadraticCurveTo(-28, -22 + Math.sin(gait) * 2, -27, -10)
  g.stroke()

  // body + neck + head
  g.fillStyle = PAL.horse
  g.beginPath()
  g.ellipse(0, -22, 20, 8.5, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.moveTo(12, -26)
  g.lineTo(22, -41)
  g.lineTo(27, -37)
  g.lineTo(19, -20)
  g.closePath()
  g.fill()
  g.beginPath()
  g.ellipse(27, -37, 7, 3.6, 0.5, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = PAL.horseDark
  g.beginPath()
  g.moveTo(20, -42)
  g.lineTo(22, -46)
  g.lineTo(24, -41)
  g.fill()
  g.strokeStyle = PAL.horseDark
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(12, -29)
  g.quadraticCurveTo(17, -40, 21, -42)
  g.stroke()
  // saddle cloth
  g.fillStyle = '#b3261e'
  g.fillRect(-6, -30, 12, 4)

  // rider
  g.fillStyle = PAL.blue
  g.beginPath()
  g.moveTo(-4, -30)
  g.lineTo(4, -30)
  g.lineTo(3, -43)
  g.lineTo(-3, -43)
  g.closePath()
  g.fill()
  g.fillStyle = PAL.gold
  g.fillRect(-3.5, -37, 7, 1.6)
  g.fillStyle = PAL.skin
  g.beginPath()
  g.arc(0, -47, 4, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#12327a'
  g.beginPath()
  g.moveTo(-5, -49)
  g.quadraticCurveTo(0, -59, 5, -49)
  g.closePath()
  g.fill()
  g.fillStyle = '#c8262c'
  g.fillRect(-0.8, -58.5, 1.6, 3)

  if (banner) drawBannerPole(g, -8, -34, t)
  g.restore()
}

export function drawBannerPole(g: G, x: number, y: number, t: number): void {
  g.strokeStyle = PAL.woodDark
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y - 56)
  g.stroke()
  const w = 20
  const flutter = Math.sin(t * 6) * 2
  g.fillStyle = '#b3261e'
  g.beginPath()
  g.moveTo(x, y - 56)
  g.quadraticCurveTo(x - w * 0.5, y - 58 + flutter, x - w, y - 54 + flutter)
  g.lineTo(x - w, y - 42 + flutter)
  g.quadraticCurveTo(x - w * 0.5, y - 44 + flutter, x, y - 42)
  g.closePath()
  g.fill()
  g.fillStyle = PAL.gold
  g.beginPath()
  g.arc(x - w * 0.5, y - 49 + flutter * 0.6, 3.2, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#b3261e'
  g.beginPath()
  g.arc(x - w * 0.5, y - 49 + flutter * 0.6, 1.4, 0, Math.PI * 2)
  g.fill()
}

export function drawGer(
  g: G,
  x: number,
  scale: number,
  t: number,
  lit: boolean,
  hurt: number,
): void {
  g.save()
  g.translate(x, 0)
  g.scale(scale, scale)
  g.fillStyle = 'rgba(0,0,0,0.2)'
  g.beginPath()
  g.ellipse(0, 0, 56, 5, 0, 0, Math.PI * 2)
  g.fill()

  const flash = hurt > 0 ? 0.25 : 0
  // lattice wall
  g.fillStyle = PAL.feltShade
  g.fillRect(-46, -26, 92, 26)
  // roof dome
  g.fillStyle = PAL.felt
  g.beginPath()
  g.moveTo(-50, -26)
  g.quadraticCurveTo(-46, -50, 0, -54)
  g.quadraticCurveTo(46, -50, 50, -26)
  g.closePath()
  g.fill()
  // roof ropes
  g.strokeStyle = 'rgba(120,100,70,0.55)'
  g.lineWidth = 1.2
  for (const px of [-30, -12, 12, 30]) {
    g.beginPath()
    g.moveTo(px * 0.9, -26)
    g.quadraticCurveTo(px * 0.7, -46, px * 0.15, -53)
    g.stroke()
  }
  g.beginPath()
  g.moveTo(-49, -27)
  g.lineTo(49, -27)
  g.stroke()
  // crown (toono) and chimney
  g.fillStyle = PAL.woodDark
  g.fillRect(-7, -58, 14, 5)
  g.fillStyle = PAL.door
  g.fillRect(-7, -59, 14, 1.6)
  // painted door
  g.fillStyle = PAL.door
  g.fillRect(-9, -22, 18, 22)
  g.strokeStyle = PAL.gold
  g.lineWidth = 1.2
  g.strokeRect(-9, -22, 18, 22)
  g.beginPath()
  g.moveTo(0, -22)
  g.lineTo(0, 0)
  g.stroke()
  g.fillStyle = PAL.gold
  g.beginPath()
  g.arc(-4.5, -11, 1.2, 0, Math.PI * 2)
  g.arc(4.5, -11, 1.2, 0, Math.PI * 2)
  g.fill()
  // blue trim band
  g.fillStyle = PAL.silk
  g.fillRect(-46, -28, 92, 2)
  if (flash) {
    g.fillStyle = `rgba(255,80,60,${flash})`
    g.fillRect(-50, -56, 100, 56)
  }
  // smoke
  if (lit) {
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.35 + i / 4) % 1
      g.fillStyle = `rgba(190,190,190,${0.35 * (1 - p)})`
      g.beginPath()
      g.arc(Math.sin(p * 5 + i) * 5, -60 - p * 34, 3 + p * 6, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.restore()
}

export function drawWall(
  g: G,
  x: number,
  width: number,
  height: number,
  progress: number,
  damaged: number,
  hurt: number,
): void {
  const h = height * Math.max(0.18, progress)
  g.save()
  g.translate(x, 0)
  g.globalAlpha = progress < 1 ? 0.65 + 0.35 * progress : 1
  g.fillStyle = 'rgba(0,0,0,0.2)'
  g.beginPath()
  g.ellipse(0, 0, width, 2.5, 0, 0, Math.PI * 2)
  g.fill()
  const n = 4
  const sw = width / n
  for (let i = 0; i < n; i++) {
    const sx = -width / 2 + i * sw
    const sh = h - (damaged > 0 && i % 2 === 1 ? damaged * 8 : 0)
    g.fillStyle = i % 2 ? PAL.wood : PAL.woodLight
    g.beginPath()
    g.moveTo(sx, 0)
    g.lineTo(sx, -sh + 5)
    g.lineTo(sx + sw / 2, -sh)
    g.lineTo(sx + sw, -sh + 5)
    g.lineTo(sx + sw, 0)
    g.closePath()
    g.fill()
  }
  g.fillStyle = PAL.woodDark
  g.fillRect(-width / 2 - 1, -h * 0.72, width + 2, 3)
  g.fillRect(-width / 2 - 1, -h * 0.32, width + 2, 3)
  if (hurt > 0) {
    g.fillStyle = 'rgba(255,90,60,0.35)'
    g.fillRect(-width / 2 - 1, -h, width + 2, h)
  }
  g.restore()
}

export function drawTower(
  g: G,
  x: number,
  width: number,
  height: number,
  progress: number,
  hurt: number,
): void {
  const h = height * Math.max(0.15, progress)
  g.save()
  g.translate(x, 0)
  g.globalAlpha = progress < 1 ? 0.65 + 0.35 * progress : 1
  g.fillStyle = 'rgba(0,0,0,0.2)'
  g.beginPath()
  g.ellipse(0, 0, width * 0.8, 3, 0, 0, Math.PI * 2)
  g.fill()
  const top = width * 0.36
  g.strokeStyle = PAL.wood
  g.lineWidth = 3.2
  g.beginPath()
  g.moveTo(-width / 2, 0)
  g.lineTo(-top, -h)
  g.moveTo(width / 2, 0)
  g.lineTo(top, -h)
  g.stroke()
  g.lineWidth = 2
  g.strokeStyle = PAL.woodDark
  g.beginPath()
  g.moveTo(-width / 2, 0)
  g.lineTo(top, -h)
  g.moveTo(width / 2, 0)
  g.lineTo(-top, -h)
  g.moveTo(-width * 0.44, -h * 0.5)
  g.lineTo(width * 0.44, -h * 0.5)
  g.stroke()
  if (progress >= 0.5) {
    // platform, rail and tent roof
    g.fillStyle = PAL.woodLight
    g.fillRect(-width / 2 - 3, -h - 3, width + 6, 4)
    g.strokeStyle = PAL.woodDark
    g.lineWidth = 1.4
    g.strokeRect(-width / 2 - 1, -h - 12, width + 2, 9)
    g.fillStyle = PAL.door
    g.beginPath()
    g.moveTo(-width / 2 - 6, -h - 22)
    g.lineTo(0, -h - 36)
    g.lineTo(width / 2 + 6, -h - 22)
    g.closePath()
    g.fill()
    g.fillStyle = PAL.gold
    g.fillRect(-0.8, -h - 42, 1.6, 8)
  }
  if (hurt > 0) {
    g.fillStyle = 'rgba(255,90,60,0.3)'
    g.fillRect(-width / 2, -h - 22, width, h + 22)
  }
  g.restore()
}

export function drawOvoo(g: G, x: number, t: number): void {
  g.save()
  g.translate(x, 0)
  g.fillStyle = 'rgba(0,0,0,0.18)'
  g.beginPath()
  g.ellipse(0, 0, 26, 3, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = PAL.stone
  g.beginPath()
  g.moveTo(-24, 0)
  g.lineTo(-10, -26)
  g.lineTo(0, -32)
  g.lineTo(10, -26)
  g.lineTo(24, 0)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.25)'
  g.lineWidth = 1
  for (let i = 0; i < 6; i++) {
    g.beginPath()
    g.moveTo(-18 + i * 6, -3 - (i % 3) * 4)
    g.lineTo(-13 + i * 6, -3 - (i % 3) * 4)
    g.stroke()
  }
  g.strokeStyle = PAL.woodDark
  g.lineWidth = 1.6
  for (const dx of [-5, 0, 5]) {
    g.beginPath()
    g.moveTo(dx, -30)
    g.lineTo(dx * 1.6, -58)
    g.stroke()
  }
  // blue silk (khadag)
  g.fillStyle = PAL.silk
  for (const [i, dx] of [-8, 0, 8].entries()) {
    const wv = Math.sin(t * 3 + i) * 2
    g.beginPath()
    g.moveTo(dx * 0.6, -50)
    g.quadraticCurveTo(dx + wv, -42, dx * 0.6 + wv, -34)
    g.lineTo(dx * 0.6 + 2 + wv, -34)
    g.quadraticCurveTo(dx + 3 + wv, -42, dx * 0.6 + 2, -50)
    g.fill()
  }
  g.restore()
}

export function drawCoin(
  g: G,
  x: number,
  amount: number,
  t: number,
  seed: number,
): void {
  const n = Math.min(amount, 5)
  for (let i = 0; i < n; i++) {
    const bob = Math.sin(t * 3 + seed + i) * 1.2
    const cx = x + (i - (n - 1) / 2) * 4.5
    const cy = -5 - bob - (i % 2) * 2
    g.fillStyle = PAL.goldDark
    g.beginPath()
    g.arc(cx, cy, 4.2, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = PAL.gold
    g.beginPath()
    g.arc(cx, cy, 3.3, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = PAL.goldDark
    g.fillRect(cx - 0.9, cy - 0.9, 1.8, 1.8)
  }
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
  g.translate(x, 0)
  g.scale(facing, 1)
  if (dead) g.rotate(-0.15)
  g.fillStyle = 'rgba(0,0,0,0.2)'
  g.beginPath()
  g.ellipse(0, 0, type === 'deer' ? 13 : 6, 2, 0, 0, Math.PI * 2)
  g.fill()
  const hop =
    moving && !dead ? Math.abs(Math.sin(t * 9)) * (type === 'deer' ? 3 : 4) : 0
  if (type === 'rabbit') {
    g.translate(0, -hop)
    g.fillStyle = '#b9a48c'
    g.beginPath()
    g.ellipse(0, -5, 6, 4.2, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.arc(5.5, -8, 3, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.ellipse(4.5, -13, 1.2, 3.6, -0.2, 0, Math.PI * 2)
    g.ellipse(6.8, -13, 1.2, 3.6, 0.15, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(-6, -5, 1.8, 0, Math.PI * 2)
    g.fill()
  } else {
    g.translate(0, -hop)
    g.strokeStyle = '#6b4a2a'
    g.lineWidth = 2
    const sw = moving && !dead ? Math.sin(t * 10) * 3 : 0
    g.beginPath()
    g.moveTo(-8, -12)
    g.lineTo(-8 + sw, 0)
    g.moveTo(-4, -12)
    g.lineTo(-4 - sw, 0)
    g.moveTo(6, -12)
    g.lineTo(6 - sw, 0)
    g.moveTo(9, -12)
    g.lineTo(9 + sw, 0)
    g.stroke()
    g.fillStyle = '#a9773f'
    g.beginPath()
    g.ellipse(0, -15, 12, 5.5, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.moveTo(8, -17)
    g.lineTo(13, -27)
    g.lineTo(16, -25)
    g.lineTo(12, -14)
    g.closePath()
    g.fill()
    g.beginPath()
    g.ellipse(16, -27, 4, 2.4, 0.3, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#6b4a2a'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(14, -29)
    g.lineTo(13, -36)
    g.lineTo(16, -34)
    g.moveTo(13, -36)
    g.lineTo(11, -35)
    g.stroke()
  }
  g.restore()
}

/** Border post: a pole with a pennant, marking the limit of controlled land. */
export function drawBorderPost(g: G, x: number, t: number): void {
  g.save()
  g.translate(x, 0)
  g.strokeStyle = PAL.woodDark
  g.lineWidth = 2.2
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, -46)
  g.stroke()
  const f = Math.sin(t * 4 + x) * 1.5
  g.fillStyle = PAL.door
  g.beginPath()
  g.moveTo(0, -46)
  g.lineTo(14, -42 + f)
  g.lineTo(0, -36)
  g.closePath()
  g.fill()
  g.fillStyle = PAL.gold
  g.fillRect(-1.5, -48, 3, 3)
  g.restore()
}

export function grassTufts(
  g: G,
  from: number,
  to: number,
  color: string,
): void {
  g.strokeStyle = color
  g.lineWidth = 1.2
  g.beginPath()
  const start = Math.floor(from / 38) * 38
  for (let x = start; x < to; x += 38) {
    const h = hash(x)
    if (h < 0.35) continue
    const gx = x + h * 30
    const gh = 4 + hash(x + 9) * 6
    g.moveTo(gx, 0)
    g.lineTo(gx - 2, -gh)
    g.moveTo(gx, 0)
    g.lineTo(gx + 0.5, -gh - 1)
    g.moveTo(gx, 0)
    g.lineTo(gx + 2.5, -gh + 1)
  }
  g.stroke()
}
