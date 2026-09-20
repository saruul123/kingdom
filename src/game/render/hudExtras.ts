import type { GameManager } from '../GameManager'
import { isAlive } from '../core/lookup'
import { mn } from '../i18n'
import { FONT, panel, text } from './hudKit'
import type { HudOptions } from './hud'
import type { G } from './pixel'

const LEFT_ARROW = ['..y', '.yy', 'yyy', '.yy', '..y']
const RIGHT_ARROW = ['y..', 'yy.', 'yyy', 'yy.', 'y..']

function bitmapArrow(
  g: G,
  rows: string[],
  colour: string,
  x: number,
  y: number,
  u: number,
): void {
  g.fillStyle = colour
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++)
      if (row[c] === 'y') g.fillRect(x + c * u, y + r * u, u, u)
  })
}

const worldToScreen = (wx: number, o: HudOptions): number =>
  (wx - o.camX + o.bw / 2) * o.ps

/** Citizen / archer / builder counts: the trade-off the spec is built around. */
export function drawPopulation(
  g: G,
  game: GameManager,
  x: number,
  y: number,
  u: number,
  maxWidth: number,
): number {
  const { state, config } = game
  const mine = state.citizens.filter((c) => c.owner === 'player' && isAlive(c))
  const count = (
    p: 'Citizen' | 'Archer' | 'Builder' | 'Herder' | 'Horseman' | 'Trader',
  ) => mine.filter((c) => c.profession === p).length
  const chips: { colour: string; label: string; n: number }[] = [
    { colour: '#5f86c8', label: mn.population.citizens, n: count('Citizen') },
    {
      colour: '#2c7a72',
      label: config.professions.archer.label,
      n: count('Archer'),
    },
    {
      colour: '#c07a30',
      label: config.professions.builder.label,
      n: count('Builder'),
    },
  ]
  if (count('Horseman') > 0 || state.buildings.some((b) => b.type === 'stable'))
    chips.push({
      colour: '#4f7fe0',
      label: config.professions.horseman.label,
      n: count('Horseman'),
    })
  if (count('Trader') > 0 || state.buildings.some((b) => b.type === 'market'))
    chips.push({
      colour: '#d8a838',
      label: config.professions.trader.label,
      n: count('Trader'),
    })
  if (state.blessing > 0)
    chips.push({ colour: '#ffe9a0', label: mn.blessed, n: state.blessing })
  chips.push({
    colour: '#e8b823',
    label: mn.eraName(state.era),
    n: state.kingdomLevel,
  })
  // herders only matter once there is somewhere for them to work
  if (count('Herder') > 0 || state.buildings.some((b) => b.type === 'pasture'))
    chips.push({
      colour: '#9a63d6',
      label: config.professions.herder.label,
      n: count('Herder'),
    })
  g.font = `600 ${6 * u}px ${FONT}`
  const widths = chips.map(
    (c) => Math.ceil(g.measureText(`${c.label} ${c.n}`).width) + 9 * u,
  )
  // wrap onto more rows rather than run under the map
  const rows: number[][] = [[]]
  let rowW = 4 * u
  chips.forEach((_, i) => {
    if (rowW + widths[i] > maxWidth && rows[rows.length - 1].length > 0) {
      rows.push([])
      rowW = 4 * u
    }
    rows[rows.length - 1].push(i)
    rowW += widths[i]
  })
  const widest = Math.max(
    ...rows.map((r) => r.reduce((sum, i) => sum + widths[i], 4 * u)),
  )
  const rowH = 11 * u
  const height = 2 * u + rows.length * rowH
  panel(g, x, y, widest, height, u, '#6b5a3a')
  rows.forEach((row, r) => {
    let cx = x + 4 * u
    const cy = y + u + r * rowH
    for (const i of row) {
      const c = chips[i]
      g.fillStyle = c.colour
      g.fillRect(cx, cy + 3 * u, 4 * u, 5 * u)
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.fillRect(cx, cy + 3 * u, 4 * u, u)
      text(
        g,
        `${c.label} ${c.n}`,
        cx + 6 * u,
        cy + 6 * u,
        6 * u,
        c.n > 0 ? '#fff3cf' : 'rgba(255,243,207,0.45)',
      )
      cx += widths[i]
    }
  })
  return y + height
}

/** The next-step hint, plus a pointer to where to go. */
export function drawObjective(
  g: G,
  game: GameManager,
  o: HudOptions,
  x: number,
  y: number,
  u: number,
): void {
  const obj = game.ui.objective
  if (!obj) return
  const maxW = Math.min(o.W * 0.42, 150 * u)
  g.font = `600 ${6 * u}px ${FONT}`
  // wrap into at most two lines
  const words = obj.text.split(' ')
  const lines: string[] = ['']
  for (const w of words) {
    const cand = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${w}` : w
    if (
      g.measureText(cand).width > maxW - 14 * u &&
      lines.length < 2 &&
      lines[lines.length - 1]
    )
      lines.push(w)
    else lines[lines.length - 1] = cand
  }
  const w = Math.min(
    maxW,
    Math.max(...lines.map((l) => g.measureText(l).width)) + 14 * u,
  )
  const h = (lines.length * 8 + 9) * u
  panel(g, x, y, w, h, u, '#c9a24a')
  text(
    g,
    mn.objective.label.toUpperCase(),
    x + 5 * u,
    y + 5 * u,
    5 * u,
    '#e8b823',
  )
  lines.forEach((l, i) =>
    text(g, l, x + 5 * u, y + (11 + i * 8) * u, 6 * u, '#fff3cf'),
  )

  if (obj.targetX === null) return
  // marker: bobbing chevron over the target, or an edge arrow with the distance
  const sx = worldToScreen(obj.targetX, o)
  const bob = Math.sin(performance.now() / 220) * u
  const margin = 10 * u
  if (sx >= margin && sx <= o.W - margin) {
    const sy = (o.groundY - 138) * o.ps + bob
    g.fillStyle = '#ffd24a'
    g.fillRect(sx - 3 * u, sy, 6 * u, 2 * u)
    g.fillRect(sx - 2 * u, sy + 2 * u, 4 * u, 2 * u)
    g.fillRect(sx - u, sy + 4 * u, 2 * u, 2 * u)
  } else {
    const left = sx < margin
    const ay = (o.groundY - 110) * o.ps
    const dist = Math.round(Math.abs(obj.targetX - game.state.hero.x))
    bitmapArrow(
      g,
      left ? LEFT_ARROW : RIGHT_ARROW,
      '#ffd24a',
      left ? margin : o.W - margin - 3 * u,
      ay - 2 * u,
      u * 1.5,
    )
    text(
      g,
      `${dist} ${mn.meters}`,
      left ? margin + 16 * u : o.W - margin - 20 * u,
      ay + 2 * u,
      5 * u,
      '#ffe9a0',
      left ? 'left' : 'right',
    )
  }
}

/** Steppe overview: territory, buildings, camps, treasure and raiders, hidden until explored. */
export function drawMinimap(
  g: G,
  game: GameManager,
  o: HudOptions,
  u: number,
): void {
  const { state, config } = game
  const cy = 6 * u
  const mapW = Math.min(170 * u, o.W - 2 * (112 * u))
  if (mapW < 64 * u) return
  const px0 = Math.round(o.W / 2 - mapW / 2)
  const inner = mapW - 6 * u
  const bx = px0 + 3 * u
  const by = cy + 4 * u
  const bh = 7 * u
  // Frame the raiders' approach and everything explored, so the map grows as you ride out.
  const reach = config.world.spawnDistance + 150
  const lo = Math.min(-reach, state.explored.min - 100)
  const hi = Math.max(reach, state.explored.max + 100)
  const mx = (wx: number) => bx + ((wx - lo) / (hi - lo)) * inner
  const seen = (wx: number) =>
    wx >= state.explored.min && wx <= state.explored.max

  panel(g, px0, cy, mapW, 15 * u, u, '#6b5a3a')
  g.fillStyle = '#0c1024'
  g.fillRect(bx, by, inner, bh)
  g.fillStyle = '#28442e'
  const ex0 = mx(Math.max(lo, state.explored.min))
  const ex1 = mx(Math.min(hi, state.explored.max))
  g.fillRect(ex0, by, ex1 - ex0, bh)
  for (const t of state.controlledTerritories) {
    g.fillStyle = '#5fb864'
    g.fillRect(
      mx(t.x - t.radius),
      by + bh - u,
      mx(t.x + t.radius) - mx(t.x - t.radius),
      u,
    )
  }
  for (const p of state.coinPickups) {
    if (p.origin === 'cache' && seen(p.x)) {
      g.fillStyle = '#ffd24a'
      g.fillRect(mx(p.x) - u / 2, by + 3 * u, u, u)
    }
  }
  for (const c of state.camps) {
    if (!seen(c.x)) continue
    const alive = state.citizens.some(
      (n) => n.owner === 'neutral' && n.campId === c.id && isAlive(n),
    )
    g.fillStyle = alive ? '#e6efff' : '#6d7796'
    g.fillRect(mx(c.x) - u, by + u, 2 * u, 2 * u)
  }
  for (const b of state.buildings) {
    g.fillStyle =
      b.type === 'ger' ? '#ffd24a' : b.type === 'tower' ? '#d9b27a' : '#b8b8b8'
    const w = b.type === 'ger' ? 4 * u : 2 * u
    const h = b.type === 'tower' ? 6 * u : b.type === 'ger' ? 4 * u : 3 * u
    g.fillRect(mx(b.x) - w / 2, by + bh - h, w, h)
  }
  for (const camp of state.enemyCamps) {
    if (!seen(camp.x)) continue
    g.fillStyle = camp.cleared ? '#6d7796' : '#ff3a2a'
    g.fillRect(mx(camp.x) - 2 * u, by + 2 * u, 4 * u, 3 * u)
  }
  for (const e of state.enemies) {
    if (!isAlive(e) || e.campId !== null) continue
    g.fillStyle = '#ff5a4a'
    g.fillRect(mx(e.x) - u, by + u, 2 * u, 4 * u)
  }
  const view = o.bw
  g.strokeStyle = 'rgba(255,255,255,0.6)'
  g.lineWidth = Math.max(1, u / 2)
  g.strokeRect(
    mx(o.camX - view / 2),
    by - u / 2,
    mx(o.camX + view / 2) - mx(o.camX - view / 2),
    bh + u,
  )
  g.fillStyle = '#ffffff'
  g.fillRect(mx(state.hero.x) - u / 2, by - u, u, bh + 2 * u)
}

/** Off-screen raiders at night: an arrow on the edge they will come from. */
export function drawThreats(
  g: G,
  game: GameManager,
  o: HudOptions,
  u: number,
): void {
  const { state } = game
  if (state.currentPhase !== 'Night') return
  const half = o.bw / 2
  const count = { left: 0, right: 0 }
  const nearest = { left: Infinity, right: Infinity }
  for (const e of state.enemies) {
    if (!isAlive(e) || e.campId !== null) continue
    const dx = e.x - o.camX
    if (Math.abs(dx) <= half + 10) continue
    const side = dx < 0 ? 'left' : 'right'
    count[side]++
    nearest[side] = Math.min(nearest[side], Math.abs(e.x - state.hero.x))
  }
  const y = (o.groundY - 70) * o.ps
  const pulse = 0.8 + 0.2 * Math.sin(performance.now() / 180)
  for (const side of ['left', 'right'] as const) {
    if (count[side] === 0) continue
    const left = side === 'left'
    const label = `${count[side]} · ${Math.round(nearest[side])} ${mn.meters}`
    g.font = `600 ${6 * u}px ${FONT}`
    const w = Math.ceil(g.measureText(label).width) + 22 * u
    const x = left ? 4 * u : o.W - w - 4 * u
    g.globalAlpha = pulse
    panel(g, x, y - 7 * u, w, 14 * u, u, '#d9534f')
    bitmapArrow(
      g,
      left ? LEFT_ARROW : RIGHT_ARROW,
      '#ff6a58',
      left ? x + 4 * u : x + w - 4 * u - 3 * u,
      y - 5 * u * 0.9 - u / 2,
      u,
    )
    text(g, label, left ? x + 12 * u : x + 6 * u, y, 6 * u, '#ffd2c8')
    g.globalAlpha = 1
  }
}

const FLOAT_COLOR = {
  gain: '#ffe066',
  spend: '#ffb46a',
  loss: '#ff7a6a',
  info: '#ffffff',
}

/** "+2" / "-4" rising from where coins changed hands. */
export function drawFloats(
  g: G,
  game: GameManager,
  o: HudOptions,
  u: number,
): void {
  for (const f of game.ui.floats) {
    const k = f.age / 1.1
    g.globalAlpha = Math.min(1, (1 - k) * 2)
    const sx = worldToScreen(f.x, o)
    const sy = (o.groundY - 78) * o.ps - k * 26 * u
    text(g, f.text, sx, sy, 9 * u, FLOAT_COLOR[f.kind], 'center')
  }
  g.globalAlpha = 1
}
