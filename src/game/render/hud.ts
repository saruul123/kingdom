import type { GameManager } from '../GameManager'
import type { ToastKind } from '../core/events'
import { bitmap } from './pixel'
import type { G } from './pixel'
import { mn } from '../i18n'
import { DISPLAY, FONT, panel, text } from './hudKit'
import {
  drawFloats,
  drawMinimap,
  drawObjective,
  drawPopulation,
  drawThreats,
} from './hudExtras'

const TOAST_COLOR: Record<ToastKind, string> = {
  info: '#f4ead2',
  good: '#b6f2a6',
  warning: '#ffd47a',
  danger: '#ff9b8a',
}

const BAG = [
  '...dddd....',
  '....rr.....',
  '..dddddd...',
  '.dyyyyyyd..',
  'dyyYYyyyyd.',
  'dyYyyyyyyd.',
  'dyYyyyyyyd.',
  'dyyyyyyyyd.',
  '.dyyyyyyd..',
  '..dddddd...',
]
const BAG_PAL = { d: '#7a5410', y: '#e8b823', Y: '#fff0a0', r: '#c0392b' }

const SUN = [
  '....y....',
  '.y..y..y.',
  '..yyyyy..',
  '..yyyyy..',
  'yyyyyyyyy',
  '..yyyyy..',
  '..yyyyy..',
  '.y..y..y.',
  '....y....',
]
const MOON = [
  '...yyy...',
  '..yyy....',
  '.yyy.....',
  '.yyy.....',
  '.yyy.....',
  '.yyy.....',
  '..yyy....',
  '...yyyyy.',
  '.....yyy.',
]
const FLAG = [
  'yyyyyy..',
  'yBBBBBy.',
  'yBYYBBBy',
  'yBBYBBy.',
  'yBYYYBBy',
  'yBBBBBy.',
  'y.......',
  'y.......',
  'y.......',
]

export interface HudOptions {
  W: number
  H: number
  /** Pixel scale of the low-res buffer. */
  ps: number
  /** Buffer width in pixels. */
  bw: number
  camX: number
  /** Ground line in buffer pixels. */
  groundY: number
  debug: boolean
  fps: number
}

/** Minimal HUD: coins top-left, day/night indicator top-centre, contextual prompts. */
export function drawHud(g: G, game: GameManager, o: HudOptions): void {
  const { state, ui, config } = game
  const u = Math.min(o.ps, Math.max(1, Math.floor(o.W / 240)))
  const fs = 8 * u
  g.save()

  // --- coins (top-left)
  const cx = 6 * u
  const cy = 6 * u
  const pulse = ui.coinPulse > 0 ? Math.round(ui.coinPulse * 2) * u : 0
  panel(g, cx, cy, 50 * u + pulse, 15 * u, u, '#c9a24a')
  bitmap(g, BAG, BAG_PAL, cx + 4 * u, cy + 3 * u, u)
  text(
    g,
    String(state.coins),
    cx + 18 * u,
    cy + 8 * u,
    fs + Math.round(pulse / 2),
    '#fff3cf',
  )

  const stamina = state.hero.stamina / config.hero.maxStamina
  if (stamina < 0.999) {
    g.fillStyle = 'rgba(14,18,44,0.85)'
    g.fillRect(cx, cy + 17 * u, 50 * u, 4 * u)
    g.fillStyle = state.hero.exhausted ? '#d96a4e' : '#8fd07a'
    g.fillRect(cx + u, cy + 18 * u, Math.round(48 * u * stamina), 2 * u)
  }

  // banner status
  const held = state.banner.state === 'held'
  bitmap(
    g,
    FLAG,
    { y: held ? '#c9a24a' : '#d9534f', B: '#2f5cc0', Y: '#f6dc78' },
    cx + 54 * u,
    cy + 3 * u,
    u,
  )
  if (!held)
    text(
      g,
      state.banner.state === 'carried' ? mn.bannerStolen : mn.bannerDropped,
      cx + 66 * u,
      cy + 8 * u,
      fs,
      '#ff9b8a',
    )

  // --- day / night indicator (top-right)
  const night = state.currentPhase === 'Night'
  const pw = 100 * u
  const px0 = o.W - pw - 6 * u
  panel(g, px0, cy, pw, 15 * u, u, night ? '#7f8fd8' : '#c9a24a')
  bitmap(
    g,
    night ? MOON : SUN,
    { y: night ? '#dfe6ff' : '#ffd24a' },
    px0 + 5 * u,
    cy + 3 * u,
    u,
  )
  text(
    g,
    night ? mn.nightN(state.currentDay) : mn.dayN(state.currentDay),
    px0 + 18 * u,
    cy + 8 * u,
    fs,
    '#fff3cf',
  )
  text(
    g,
    mn.phase[state.currentPhase],
    px0 + pw - 5 * u,
    cy + 8 * u,
    6 * u,
    'rgba(255,243,207,0.6)',
    'right',
  )

  // cycle bar: gold = daylight, orange = dusk, navy = night, marker = now
  const t = config.time
  const total = t.dayDuration + t.nightDuration
  const start: Record<string, number> = {
    Sunrise: 0,
    Day: t.sunriseDuration,
    Sunset: t.dayDuration - t.sunsetDuration,
    Night: t.dayDuration,
  }
  const dur = game.time.phaseDuration(state.currentPhase)
  const elapsed = start[state.currentPhase] + (dur - state.timeRemaining)
  const bx = px0 + 3 * u
  const bwid = pw - 6 * u
  const by = cy + 17 * u
  g.fillStyle = '#e0a93a'
  g.fillRect(bx, by, Math.round((bwid * t.dayDuration) / total), 2 * u)
  g.fillStyle = '#e07b39'
  g.fillRect(
    bx + Math.round((bwid * (t.dayDuration - t.sunsetDuration)) / total),
    by,
    Math.round((bwid * t.sunsetDuration) / total),
    2 * u,
  )
  g.fillStyle = '#26356b'
  g.fillRect(
    bx + Math.round((bwid * t.dayDuration) / total),
    by,
    Math.round((bwid * t.nightDuration) / total),
    2 * u,
  )
  g.fillStyle = '#ffffff'
  const mx = bx + Math.round(bwid * Math.min(1, elapsed / total))
  g.fillRect(mx - u, by - u, 2 * u, 4 * u)

  // --- raiders: which side they come from (dusk warning, then the night's remainder)
  if (state.currentPhase === 'Sunset' || night) {
    const { left, right } = game.ctx.sys.waves.incoming()
    const ew = 78 * u
    const ex = o.W - ew - 6 * u
    panel(g, ex, cy + 24 * u, ew, 15 * u, u, '#d9534f')
    text(g, mn.raiders(left + right), ex + 5 * u, cy + 32 * u, fs, '#ffd2c8')
    text(
      g,
      mn.raidersSides(left, right),
      ex + ew - 5 * u,
      cy + 32 * u,
      6 * u,
      '#ffb0a5',
      'right',
    )
  }

  // --- population, objective, map
  // keep the left column clear of the map in the middle of the top edge
  const mapLeft =
    o.W / 2 - Math.min(170 * u, o.W - 224 * u) / 2 > 116 * u
      ? o.W / 2 - Math.min(170 * u, o.W - 224 * u) / 2
      : o.W
  const popBottom = drawPopulation(
    g,
    game,
    cx,
    cy + 24 * u,
    u,
    mapLeft - cx - 6 * u,
  )
  drawObjective(g, game, o, cx, popBottom + 4 * u, u)
  drawMinimap(g, game, o, u)
  drawThreats(g, game, o, u)
  drawFloats(g, game, o, u)

  // --- toasts
  let ty = cy + 36 * u
  for (const toast of ui.toasts) {
    const a = Math.max(
      0,
      Math.min(1, toast.age / 0.2, (toast.ttl - toast.age) / 0.5),
    )
    g.globalAlpha = a
    g.font = `600 ${7 * u}px ${FONT}`
    const w = Math.ceil(g.measureText(toast.text).width) + 12 * u
    panel(g, Math.round(o.W / 2 - w / 2), ty - 6 * u, w, 12 * u, u, '#6b5a3a')
    text(g, toast.text, o.W / 2, ty, 7 * u, TOAST_COLOR[toast.kind], 'center')
    ty += 15 * u
  }
  g.globalAlpha = 1

  // --- big announcement
  if (ui.banner) {
    const b = ui.banner
    g.globalAlpha = Math.max(0, Math.min(1, b.age / 0.5, (b.ttl - b.age) / 0.8))
    const size = 22 * u
    g.font = `700 ${size}px ${DISPLAY}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const yy = Math.round(o.H * 0.28)
    g.fillStyle = 'rgba(10,6,20,0.8)'
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [1, 1],
      [-1, 1],
    ])
      g.fillText(b.text, o.W / 2 + dx * u, yy + dy * u)
    g.fillStyle = night ? '#dbe4ff' : '#fff1c9'
    g.fillText(b.text, o.W / 2, yy)
    g.globalAlpha = 1
  }

  // --- contextual prompt above the interactive object
  if (ui.prompt) {
    const p = ui.prompt
    const sx = Math.round((p.x - o.camX + o.bw / 2) * o.ps)
    const sy = Math.round(
      (o.groundY - 104) * o.ps + Math.sin(performance.now() / 260) * u,
    )
    g.font = `600 ${8 * u}px ${FONT}`
    const tw = Math.ceil(g.measureText(p.text).width)
    const w = tw + 26 * u
    const rim =
      p.state === 'ok' ? '#e8b823' : p.state === 'poor' ? '#e0705a' : '#8a8f9c'
    panel(g, sx - Math.round(w / 2), sy - 8 * u, w, 16 * u, u, rim)
    g.fillStyle = 'rgba(255,255,255,0.16)'
    g.fillRect(sx - Math.round(w / 2) + 4 * u, sy - 5 * u, 10 * u, 10 * u)
    text(
      g,
      'E',
      sx - Math.round(w / 2) + 9 * u,
      sy + u,
      7 * u,
      '#ffffff',
      'center',
    )
    text(
      g,
      p.text,
      sx - Math.round(w / 2) + 18 * u,
      sy + u,
      8 * u,
      p.state === 'ok' ? '#fff3cf' : p.state === 'poor' ? '#ffc4b8' : '#cfd3dc',
    )
  }

  if (o.debug) {
    text(
      g,
      `fps ${o.fps.toFixed(0)} x=${state.hero.x.toFixed(0)} cit=${state.citizens.length} en=${state.enemies.length} bld=${state.buildings.length} ${state.currentPhase} ${state.timeRemaining.toFixed(0)}s ps=${u}`,
      6 * u,
      o.H - 5 * u,
      6 * u,
      '#ffffff',
    )
  }
  g.restore()
}
