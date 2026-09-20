import type { GameManager } from '../GameManager'
import type { ToastKind } from '../core/events'
import { isAlive } from '../core/lookup'
import { PAL } from './sprites'

type G = CanvasRenderingContext2D

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif"
const SANS = "'Manrope', system-ui, 'Segoe UI', sans-serif"

const TOAST_COLOR: Record<ToastKind, string> = {
  info: '#f4ead2',
  good: '#b6f2a6',
  warning: '#ffd47a',
  danger: '#ff9b8a',
}

function pill(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke?: string,
): void {
  g.beginPath()
  g.roundRect(x, y, w, h, h / 2)
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = 1.5
    g.stroke()
  }
}

function sunIcon(g: G, x: number, y: number, r: number): void {
  g.fillStyle = '#ffd24a'
  g.strokeStyle = '#ffd24a'
  g.lineWidth = r * 0.22
  g.beginPath()
  g.arc(x, y, r * 0.55, 0, Math.PI * 2)
  g.fill()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    g.beginPath()
    g.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8)
    g.lineTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1)
    g.stroke()
  }
}

function moonIcon(g: G, x: number, y: number, r: number): void {
  g.fillStyle = '#dfe6ff'
  g.beginPath()
  g.arc(x, y, r * 0.9, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  g.arc(x + r * 0.45, y - r * 0.2, r * 0.8, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'source-over'
}

function coinIcon(g: G, x: number, y: number, r: number): void {
  g.fillStyle = PAL.goldDark
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = PAL.gold
  g.beginPath()
  g.arc(x, y, r * 0.8, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = PAL.goldDark
  g.fillRect(x - r * 0.22, y - r * 0.22, r * 0.44, r * 0.44)
}

export interface HudOptions {
  W: number
  H: number
  camX: number
  scale: number
  groundY: number
  debug: boolean
  fps: number
}

/** Minimal HUD: coins top-left, day/night indicator top-centre, contextual prompts. */
export function drawHud(g: G, game: GameManager, o: HudOptions): void {
  const { state, ui, config } = game
  const hs = Math.max(0.8, Math.min(1.6, o.H / 720))
  g.save()
  g.textBaseline = 'middle'

  // --- coins (top-left)
  const pulse = 1 + ui.coinPulse * 0.18
  const cx = 18 * hs
  const cy = 20 * hs
  g.save()
  g.translate(cx, cy + 12 * hs)
  g.scale(pulse, pulse)
  g.translate(-cx, -(cy + 12 * hs))
  pill(
    g,
    cx,
    cy,
    128 * hs,
    26 * hs,
    'rgba(38,26,14,0.72)',
    'rgba(232,185,35,0.55)',
  )
  coinIcon(g, cx + 15 * hs, cy + 13 * hs, 8 * hs)
  g.fillStyle = '#fff3cf'
  g.font = `700 ${15 * hs}px ${SANS}`
  g.textAlign = 'left'
  g.fillText(`Coins: ${state.coins}`, cx + 30 * hs, cy + 14 * hs)
  g.restore()

  const stamina = state.hero.stamina / config.hero.maxStamina
  if (stamina < 0.999) {
    const bw = 128 * hs
    g.fillStyle = 'rgba(38,26,14,0.6)'
    g.fillRect(cx, cy + 32 * hs, bw, 5 * hs)
    g.fillStyle = state.hero.exhausted ? '#d96a4e' : '#8fd07a'
    g.fillRect(cx, cy + 32 * hs, bw * stamina, 5 * hs)
  }

  // --- day / night indicator (top-centre)
  const night = state.currentPhase === 'Night'
  const label = `${night ? 'Night' : 'Day'} ${state.currentDay}`
  const pw = 170 * hs
  const px = o.W / 2 - pw / 2
  pill(
    g,
    px,
    cy,
    pw,
    26 * hs,
    'rgba(38,26,14,0.72)',
    night ? 'rgba(160,180,255,0.5)' : 'rgba(232,185,35,0.55)',
  )
  if (night) moonIcon(g, px + 17 * hs, cy + 13 * hs, 8 * hs)
  else sunIcon(g, px + 17 * hs, cy + 13 * hs, 8 * hs)
  g.fillStyle = '#fff3cf'
  g.font = `700 ${15 * hs}px ${SANS}`
  g.textAlign = 'left'
  g.fillText(label, px + 34 * hs, cy + 14 * hs)
  g.fillStyle = 'rgba(255,243,207,0.6)'
  g.font = `600 ${11 * hs}px ${SANS}`
  g.textAlign = 'right'
  g.fillText(state.currentPhase, px + pw - 14 * hs, cy + 14 * hs)

  // cycle bar: gold = daylight, navy = night, marker = now
  const t = config.time
  const total = t.dayDuration + t.nightDuration
  const phaseStart: Record<string, number> = {
    Sunrise: 0,
    Day: t.sunriseDuration,
    Sunset: t.dayDuration - t.sunsetDuration,
    Night: t.dayDuration,
  }
  const dur = game.time.phaseDuration(state.currentPhase)
  const elapsed = phaseStart[state.currentPhase] + (dur - state.timeRemaining)
  const bx = px + 8 * hs
  const bw = pw - 16 * hs
  const by = cy + 31 * hs
  g.fillStyle = '#e0a93a'
  g.fillRect(bx, by, (bw * t.dayDuration) / total, 4 * hs)
  g.fillStyle = '#e07b39'
  g.fillRect(
    bx + (bw * (t.dayDuration - t.sunsetDuration)) / total,
    by,
    (bw * t.sunsetDuration) / total,
    4 * hs,
  )
  g.fillStyle = '#26356b'
  g.fillRect(
    bx + (bw * t.dayDuration) / total,
    by,
    (bw * t.nightDuration) / total,
    4 * hs,
  )
  const mx = bx + bw * Math.min(1, elapsed / total)
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(mx, by + 2 * hs, 4 * hs, 0, Math.PI * 2)
  g.fill()

  // --- enemies remaining (night only)
  if (night) {
    const alive = state.enemies.filter(isAlive).length + state.wave.queue.length
    const ew = 120 * hs
    const ex = o.W - ew - 18 * hs
    pill(g, ex, cy, ew, 26 * hs, 'rgba(60,20,20,0.75)', 'rgba(255,120,100,0.5)')
    g.fillStyle = '#ffd2c8'
    g.font = `700 ${14 * hs}px ${SANS}`
    g.textAlign = 'center'
    g.fillText(`Raiders: ${alive}`, ex + ew / 2, cy + 14 * hs)
  }

  // --- toasts
  g.textAlign = 'center'
  let ty = cy + 64 * hs
  for (const toast of ui.toasts) {
    const a = Math.min(1, toast.age / 0.2, (toast.ttl - toast.age) / 0.5)
    g.globalAlpha = Math.max(0, a)
    g.font = `600 ${14 * hs}px ${SANS}`
    const w = g.measureText(toast.text).width + 28 * hs
    pill(g, o.W / 2 - w / 2, ty - 12 * hs, w, 24 * hs, 'rgba(30,20,10,0.75)')
    g.fillStyle = TOAST_COLOR[toast.kind]
    g.fillText(toast.text, o.W / 2, ty)
    ty += 30 * hs
  }
  g.globalAlpha = 1

  // --- big announcement
  if (ui.banner) {
    const b = ui.banner
    const a = Math.max(0, Math.min(1, b.age / 0.5, (b.ttl - b.age) / 0.8))
    g.globalAlpha = a
    g.font = `700 ${46 * hs}px ${SERIF}`
    g.textAlign = 'center'
    g.lineWidth = 6 * hs
    g.strokeStyle = 'rgba(20,10,0,0.7)'
    g.strokeText(b.text, o.W / 2, o.H * 0.3)
    g.fillStyle = night ? '#dbe4ff' : '#fff1c9'
    g.fillText(b.text, o.W / 2, o.H * 0.3)
    g.globalAlpha = 1
  }

  // --- contextual prompt above the interactive object
  if (ui.prompt) {
    const p = ui.prompt
    const sx = (p.x - o.camX) * o.scale + o.W / 2
    const sy = o.groundY - 104 * o.scale
    g.font = `700 ${14 * hs}px ${SANS}`
    const tw = g.measureText(p.text).width
    const w = tw + 58 * hs
    const bob = Math.sin(performance.now() / 260) * 2
    const fill =
      p.state === 'ok'
        ? 'rgba(38,26,14,0.9)'
        : p.state === 'poor'
          ? 'rgba(80,24,20,0.9)'
          : 'rgba(50,50,50,0.85)'
    const stroke =
      p.state === 'ok' ? PAL.gold : p.state === 'poor' ? '#ff8a72' : '#999'
    pill(g, sx - w / 2, sy - 14 * hs + bob, w, 28 * hs, fill, stroke)
    g.fillStyle = 'rgba(255,255,255,0.16)'
    g.beginPath()
    g.roundRect(
      sx - w / 2 + 6 * hs,
      sy - 9 * hs + bob,
      24 * hs,
      18 * hs,
      5 * hs,
    )
    g.fill()
    g.fillStyle = '#fff'
    g.font = `800 ${12 * hs}px ${SANS}`
    g.textAlign = 'center'
    g.fillText('E', sx - w / 2 + 18 * hs, sy + bob + 1)
    g.fillStyle =
      p.state === 'ok' ? '#fff3cf' : p.state === 'poor' ? '#ffc4b8' : '#ccc'
    g.font = `700 ${14 * hs}px ${SANS}`
    g.textAlign = 'left'
    g.fillText(p.text, sx - w / 2 + 40 * hs, sy + bob + 1)
  }

  // --- controls hint on the first day
  if (
    state.currentDay === 1 &&
    ui.hintTime < 40 &&
    state.status === 'playing'
  ) {
    const text =
      '← → / A D ride   ·   Shift gallop   ·   E / ↓ / Space act   ·   P pause'
    g.globalAlpha = Math.min(1, (40 - ui.hintTime) / 4)
    g.font = `600 ${13 * hs}px ${SANS}`
    g.textAlign = 'center'
    const w = g.measureText(text).width + 32 * hs
    pill(g, o.W / 2 - w / 2, o.H - 44 * hs, w, 26 * hs, 'rgba(30,20,10,0.65)')
    g.fillStyle = '#f4ead2'
    g.fillText(text, o.W / 2, o.H - 30 * hs)
    g.globalAlpha = 1
  }

  if (o.debug) {
    g.textAlign = 'left'
    g.font = `500 ${12 * hs}px monospace`
    g.fillStyle = '#fff'
    g.fillText(
      `fps ${o.fps.toFixed(0)}  x=${state.hero.x.toFixed(0)}  cit=${state.citizens.length} en=${state.enemies.length} bld=${state.buildings.length} phase=${state.currentPhase} ${state.timeRemaining.toFixed(0)}s`,
      18 * hs,
      cy + 56 * hs,
    )
  }
  g.restore()
}
