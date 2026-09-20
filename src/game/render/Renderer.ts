import type { GameManager } from '../GameManager'
import { clamp, lerp } from '../core/math'
import { findById } from '../core/lookup'
import type { Citizen, Enemy } from '../core/types'
import { hash, mix } from './color'
import { drawHud } from './hud'
import {
  PAL,
  drawAnimal,
  drawBannerPole,
  drawBorderPost,
  drawCoin,
  drawGer,
  drawHorseRider,
  drawOvoo,
  drawPerson,
  drawTower,
  drawWall,
  grassTufts,
} from './sprites'
import type { PersonStyle } from './sprites'

const VIRTUAL_HEIGHT = 520
const GROUND_FRACTION = 0.78

const SKY = {
  day: ['#3f86d0', '#c4e6f6'],
  dusk: ['#55396f', '#f2a15a'],
  night: ['#050919', '#17224a'],
} as const

export interface RendererOptions {
  debug?: boolean
}

/** Draws the world from GameState. Holds no gameplay state of its own. */
export class Renderer {
  private g: CanvasRenderingContext2D
  private camX = 0
  private t = 0
  private fps = 60
  private stars: { x: number; y: number; r: number; p: number }[] = []

  constructor(
    private canvas: HTMLCanvasElement,
    private game: GameManager,
    private opts: RendererOptions = {},
  ) {
    this.g = canvas.getContext('2d')!
    this.camX = game.state.hero.x
    for (let i = 0; i < 140; i++) {
      this.stars.push({
        x: hash(i),
        y: hash(i + 500),
        r: 0.5 + hash(i + 900) * 1.3,
        p: hash(i + 1300) * 6,
      })
    }
  }

  draw(dt: number): void {
    const { game, g, canvas } = this
    const { state } = game
    const W = canvas.width
    const H = canvas.height
    const scale = H / VIRTUAL_HEIGHT
    const groundY = H * GROUND_FRACTION
    this.t += dt
    this.fps = lerp(this.fps, 1 / Math.max(dt, 0.001), 0.05)

    // camera
    const halfView = W / 2 / scale
    const target = state.hero.x + state.hero.facing * 60
    this.camX += (target - this.camX) * Math.min(1, dt * 4)
    this.camX = clamp(
      this.camX,
      game.config.world.minX + halfView - 200,
      game.config.world.maxX - halfView + 200,
    )
    const camX = this.camX

    const daylight = game.time.daylight()
    this.drawSky(W, H, groundY, daylight)
    this.drawBackdrop(W, groundY, scale, camX, daylight)

    g.setTransform(scale, 0, 0, scale, W / 2 - camX * scale, groundY)
    const left = camX - halfView - 80
    const right = camX + halfView + 80
    this.drawGround(left, right, W, H, groundY, daylight)
    this.drawWorld(left, right)

    g.setTransform(1, 0, 0, 1, 0, 0)
    this.drawNight(W, H, daylight)
    g.setTransform(scale, 0, 0, scale, W / 2 - camX * scale, groundY)
    this.drawGlows(left, right, daylight)

    g.setTransform(1, 0, 0, 1, 0, 0)
    drawHud(g, game, {
      W,
      H,
      camX,
      scale,
      groundY,
      debug: !!this.opts.debug,
      fps: this.fps,
    })
  }

  // ---------------------------------------------------------------- sky

  private skyPalette(): [string, string] {
    const { state } = this.game
    const dur = this.game.time.phaseDuration(state.currentPhase)
    const p = 1 - state.timeRemaining / dur
    const blend = (
      a: readonly [string, string],
      b: readonly [string, string],
      k: number,
    ): [string, string] => [mix(a[0], b[0], k), mix(a[1], b[1], k)]
    switch (state.currentPhase) {
      case 'Sunrise':
        return p < 0.5
          ? blend(SKY.night, SKY.dusk, p * 2)
          : blend(SKY.dusk, SKY.day, (p - 0.5) * 2)
      case 'Day':
        return [SKY.day[0], SKY.day[1]]
      case 'Sunset':
        return p < 0.55
          ? blend(SKY.day, SKY.dusk, p / 0.55)
          : blend(SKY.dusk, SKY.night, (p - 0.55) / 0.45)
      case 'Night':
        return [SKY.night[0], SKY.night[1]]
    }
  }

  /** Fraction (0..1) of the daylight arc the sun has travelled, or -1 at night. */
  private sunProgress(): number {
    const { state, config } = this.game
    const t = config.time
    const dur = this.game.time.phaseDuration(state.currentPhase)
    const p = dur - state.timeRemaining
    switch (state.currentPhase) {
      case 'Sunrise':
        return p / t.dayDuration
      case 'Day':
        return (t.sunriseDuration + p) / t.dayDuration
      case 'Sunset':
        return (t.dayDuration - t.sunsetDuration + p) / t.dayDuration
      case 'Night':
        return -1
    }
  }

  private drawSky(
    W: number,
    H: number,
    groundY: number,
    daylight: number,
  ): void {
    const { g } = this
    g.setTransform(1, 0, 0, 1, 0, 0)
    const [top, bottom] = this.skyPalette()
    const grad = g.createLinearGradient(0, 0, 0, groundY)
    grad.addColorStop(0, top)
    grad.addColorStop(1, bottom)
    g.fillStyle = grad
    g.fillRect(0, 0, W, H)

    const starAlpha = clamp(1 - daylight * 2.2, 0, 1)
    if (starAlpha > 0) {
      for (const s of this.stars) {
        g.globalAlpha = starAlpha * (0.55 + 0.45 * Math.sin(this.t * 1.5 + s.p))
        g.fillStyle = '#fff'
        g.beginPath()
        g.arc(s.x * W, s.y * groundY * 0.85, s.r * (H / 700), 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
    }

    const f = this.sunProgress()
    const horizon = groundY * 0.72
    if (f >= 0 && f <= 1) {
      const sx = W * (0.08 + 0.84 * f)
      const sy = horizon - Math.sin(Math.PI * f) * horizon * 0.8
      const r = H * 0.045
      const glow = g.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 4)
      glow.addColorStop(0, 'rgba(255,230,150,0.55)')
      glow.addColorStop(1, 'rgba(255,230,150,0)')
      g.fillStyle = glow
      g.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8)
      g.fillStyle = f < 0.06 || f > 0.94 ? '#ffb45a' : '#fff0a8'
      g.beginPath()
      g.arc(sx, sy, r, 0, Math.PI * 2)
      g.fill()
    } else if (daylight < 0.6) {
      const { state } = this.game
      const p = 1 - state.timeRemaining / this.game.config.time.nightDuration
      const mx = W * (0.15 + 0.7 * clamp(p, 0, 1))
      const my =
        horizon - Math.sin(Math.PI * clamp(p, 0, 1)) * horizon * 0.6 - H * 0.05
      const r = H * 0.035
      g.fillStyle = '#e8edff'
      g.beginPath()
      g.arc(mx, my, r, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = SKY.night[1]
      g.beginPath()
      g.arc(mx + r * 0.45, my - r * 0.2, r * 0.85, 0, Math.PI * 2)
      g.fill()
    }
  }

  private ridge(
    W: number,
    baseY: number,
    amp: number,
    par: number,
    camX: number,
    scale: number,
    seed: number,
    color: string,
    freq: number,
  ): void {
    const { g } = this
    g.fillStyle = color
    g.beginPath()
    g.moveTo(0, baseY + amp)
    for (let sx = 0; sx <= W + 8; sx += 8) {
      const u = camX * par + (sx - W / 2) / scale
      const v =
        0.5 +
        0.5 *
          (0.6 * Math.sin(u * freq + seed) +
            0.4 * Math.sin(u * freq * 2.7 + seed * 3.1))
      g.lineTo(sx, baseY - amp * v)
    }
    g.lineTo(W, baseY + amp)
    g.closePath()
    g.fill()
  }

  private drawBackdrop(
    W: number,
    groundY: number,
    scale: number,
    camX: number,
    daylight: number,
  ): void {
    const night = 1 - clamp(daylight * 1.25, 0, 1)
    this.ridge(
      W,
      groundY - 34 * scale,
      150 * scale,
      0.08,
      camX,
      scale,
      1.3,
      mix('#8ea3c4', '#1b2748', night),
      0.0026,
    )
    this.ridge(
      W,
      groundY - 14 * scale,
      90 * scale,
      0.2,
      camX,
      scale,
      4.1,
      mix('#7b8f6a', '#16223a', night),
      0.004,
    )
    this.ridge(
      W,
      groundY + 2 * scale,
      46 * scale,
      0.45,
      camX,
      scale,
      7.7,
      mix('#8ea060', '#141f2c', night),
      0.007,
    )
  }

  private drawGround(
    left: number,
    right: number,
    W: number,
    H: number,
    groundY: number,
    daylight: number,
  ): void {
    const { g } = this
    const night = 1 - clamp(daylight * 1.25, 0, 1)
    g.save()
    g.setTransform(1, 0, 0, 1, 0, 0)
    const grad = g.createLinearGradient(0, groundY - 4, 0, H)
    grad.addColorStop(0, mix('#a2a95b', '#1a2620', night))
    grad.addColorStop(1, mix('#7b8a45', '#0f1a16', night))
    g.fillStyle = grad
    g.fillRect(0, groundY, W, H - groundY)
    g.restore()
    grassTufts(g, left, right, mix('#6b7a35', '#243428', night))
    // a few stones and flowers
    const start = Math.floor(left / 90) * 90
    for (let x = start; x < right; x += 90) {
      const h = hash(x * 0.37)
      if (h > 0.75) {
        g.fillStyle = mix('#9a978c', '#2a3038', night)
        g.beginPath()
        g.ellipse(x + h * 60, 1, 4 + h * 4, 2.5, 0, Math.PI, 0)
        g.fill()
      } else if (h < 0.18) {
        g.fillStyle = h < 0.09 ? '#e8d24a' : '#d7e4f6'
        g.beginPath()
        g.arc(x + h * 300, -3, 1.6, 0, Math.PI * 2)
        g.fill()
      }
    }
  }

  // -------------------------------------------------------------- world

  private drawWorld(left: number, right: number): void {
    const { g, game, t } = this
    const { state, config } = game
    const vis = (x: number, pad = 60) => x > left - pad && x < right + pad

    // territory borders
    for (const ter of state.controlledTerritories) {
      for (const side of [-1, 1]) {
        const x = ter.x + side * ter.radius
        if (vis(x)) drawBorderPost(g, x, t)
      }
    }

    for (const o of state.ovoos) if (vis(o.x)) drawOvoo(g, o.x, t)

    // neutral camps: an old ger and a fire
    for (const c of state.camps) {
      if (!vis(c.x, 120)) continue
      drawGer(g, c.x - 12, 0.55, t, false, 0)
      this.fire(c.x + 42)
    }

    // buildings: ger first, then defenses
    const order = { ger: 0, wall: 1, tower: 2 } as const
    const buildings = [...state.buildings].sort(
      (a, b) => order[a.type] - order[b.type],
    )
    for (const b of buildings) {
      if (!vis(b.x, 120)) continue
      const def = config.buildings[b.type]
      const progress =
        b.state === 'Planned' || b.state === 'UnderConstruction'
          ? Math.max(0.12, b.constructionProgress)
          : 1
      const dmg = b.state === 'Damaged' ? 1 - b.health / b.maxHealth : 0
      if (b.type === 'ger') drawGer(g, b.x, 1, t, true, b.hitFlash)
      else if (b.type === 'wall')
        drawWall(g, b.x, def.width, def.height, progress, dmg, b.hitFlash)
      else drawTower(g, b.x, def.width, def.height, progress, b.hitFlash)
      if (progress < 1)
        this.progressBar(
          b.x,
          def.height + 14,
          b.constructionProgress,
          '#f3c64a',
        )
      else if (b.health < b.maxHealth)
        this.progressBar(
          b.x,
          def.height + (b.type === 'tower' ? 44 : 12),
          b.health / b.maxHealth,
          b.health / b.maxHealth < 0.4 ? '#e5533d' : '#7ecb5a',
        )
    }

    // tool stands
    for (const s of config.content.stands) {
      if (!vis(s.x)) continue
      this.standSprite(s.x, s.profession)
    }

    // ground coins
    for (const c of state.coinPickups) {
      if (!vis(c.x)) continue
      const drop =
        c.delay > 0 ? (c.delay / config.economy.coinPickupDelay) * 16 : 0
      g.save()
      g.translate(0, -drop)
      drawCoin(g, c.x, c.amount, t, c.id)
      g.restore()
    }

    // banner lying on the ground
    if (state.banner.state === 'ground') drawBannerPole(g, state.banner.x, 0, t)

    for (const a of state.animals) {
      if (!vis(a.x)) continue
      drawAnimal(
        g,
        a.type,
        a.x,
        a.facing,
        t + a.id,
        a.state === 'Moving' || a.state === 'Fleeing',
        a.state === 'Dead',
      )
    }

    for (const c of state.citizens) if (vis(c.x)) this.citizen(c)
    for (const e of state.enemies) if (vis(e.x)) this.enemy(e)

    // hero
    const h = state.hero
    const flicker =
      h.invulnerable > 0 && Math.floor(t * 18) % 2 === 0 ? 0.45 : 1
    drawHorseRider(
      g,
      h.x,
      0,
      h.facing,
      t,
      Math.min(1, Math.abs(h.vx) / config.hero.sprintSpeed),
      state.banner.state === 'held',
      flicker,
    )

    // arrows
    for (const p of state.projectiles) {
      const u = clamp(p.travelled / p.totalDist, 0, 1)
      const arc = 4 * p.totalDist * 0.1 * u * (1 - u)
      const dx = p.lastX - p.x
      const dy = -(p.lastY - p.y)
      const len = Math.hypot(dx, dy) || 1
      g.strokeStyle = '#3a2a1a'
      g.lineWidth = 1.4
      g.beginPath()
      g.moveTo(p.x, -p.y - arc)
      g.lineTo(p.x - (dx / len) * 9, -p.y - arc - (dy / len) * 9)
      g.stroke()
      g.fillStyle = '#ddd'
      g.beginPath()
      g.arc(p.x, -p.y - arc, 1.3, 0, Math.PI * 2)
      g.fill()
    }
  }

  private fire(x: number): void {
    const { g, t } = this
    g.fillStyle = PAL.stone
    for (const dx of [-5, -1, 4]) {
      g.beginPath()
      g.arc(x + dx, -1.5, 2.6, 0, Math.PI * 2)
      g.fill()
    }
    const f = Math.sin(t * 12 + x) * 1.5
    g.fillStyle = '#f08a24'
    g.beginPath()
    g.moveTo(x - 4, -3)
    g.quadraticCurveTo(x - 3 + f, -12, x, -16 - f)
    g.quadraticCurveTo(x + 3 - f, -12, x + 4, -3)
    g.fill()
    g.fillStyle = '#ffd35a'
    g.beginPath()
    g.moveTo(x - 2, -3)
    g.quadraticCurveTo(x, -9, x + 2, -3)
    g.fill()
  }

  private standSprite(x: number, profession: 'archer' | 'builder'): void {
    const { g } = this
    g.save()
    g.translate(x, 0)
    g.strokeStyle = PAL.woodDark
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(-9, 0)
    g.lineTo(-9, -24)
    g.moveTo(9, 0)
    g.lineTo(9, -24)
    g.moveTo(-11, -22)
    g.lineTo(11, -22)
    g.stroke()
    if (profession === 'archer') {
      g.strokeStyle = PAL.woodLight
      g.lineWidth = 1.8
      g.beginPath()
      g.arc(0, -13, 9, -Math.PI * 0.4, Math.PI * 0.4)
      g.stroke()
      g.strokeStyle = '#ddd'
      g.lineWidth = 0.6
      g.beginPath()
      g.moveTo(9 * Math.cos(-Math.PI * 0.4), -13 + 9 * Math.sin(-Math.PI * 0.4))
      g.lineTo(9 * Math.cos(Math.PI * 0.4), -13 + 9 * Math.sin(Math.PI * 0.4))
      g.stroke()
    } else {
      g.strokeStyle = PAL.woodLight
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(-3, -4)
      g.lineTo(3, -19)
      g.stroke()
      g.fillStyle = '#777'
      g.fillRect(0, -22, 8, 5)
    }
    g.restore()
  }

  private progressBar(x: number, y: number, frac: number, color: string): void {
    const { g } = this
    const w = 26
    g.fillStyle = 'rgba(20,12,4,0.65)'
    g.fillRect(x - w / 2, -y, w, 4)
    g.fillStyle = color
    g.fillRect(x - w / 2, -y, w * clamp(frac, 0, 1), 4)
  }

  private citizen(c: Citizen): void {
    const { g, t, game } = this
    const dead = c.state === 'Dead'
    let style: PersonStyle
    const moving =
      c.state === 'Moving' || c.state === 'Returning' || c.state === 'Fleeing'
    const base = {
      t: t + c.id,
      moving,
      alpha: dead ? clamp(c.deadTimer / 1.5, 0, 1) : 1,
      lying: dead,
    }
    if (c.owner === 'neutral')
      style = { ...base, deel: PAL.neutral, sash: '#7a6f60', hat: '#6e6455' }
    else if (c.profession === 'Archer')
      style = {
        ...base,
        deel: PAL.archer,
        sash: '#e8b923',
        hat: '#1f5a4c',
        tool: 'bow',
      }
    else if (c.profession === 'Builder')
      style = {
        ...base,
        deel: PAL.builder,
        sash: '#3a2a1a',
        hat: '#7a4a1a',
        tool: 'hammer',
      }
    else style = { ...base, deel: PAL.citizen, sash: '#c8262c', hat: '#2f4f8f' }

    let y = 0
    if (
      c.postBuildingId !== null &&
      (c.brain === 'FindEnemy' || c.brain === 'Attack')
    ) {
      const tower = findById(game.state.buildings, c.postBuildingId)
      if (tower) y = -game.config.buildings[tower.type].height
    }
    if (c.brain === 'Build' || c.brain === 'Repair') {
      // hammering: small bobbing motion
      y -= Math.abs(Math.sin(t * 8 + c.id)) * 1.5
    }
    drawPerson(g, c.x, y, c.facing, style)
    if (c.carrying > 0 && !dead) drawCoin(g, c.x, 1, t, c.id)
  }

  private enemy(e: Enemy): void {
    const { g, t } = this
    const dead = e.state === 'Dead'
    drawPerson(g, e.x, 0, e.facing, {
      deel: e.hitFlash > 0 ? '#c25050' : PAL.bandit,
      sash: PAL.banditScarf,
      hat: '#241818',
      tool: 'club',
      scale: 1.05,
      t: t + e.id,
      moving: e.state === 'Moving' || e.state === 'Fleeing',
      lying: dead,
      alpha: dead ? clamp(e.deadTimer / 1.5, 0, 1) : 1,
    })
    if (dead) return
    if (e.carryingBanner) drawBannerPole(g, e.x - e.facing * 6, -6, t)
    if (e.health < e.maxHealth)
      this.progressBar(e.x, 42, e.health / e.maxHealth, '#e5533d')
  }

  // ------------------------------------------------------------- lighting

  private drawNight(W: number, H: number, daylight: number): void {
    const { g } = this
    const a = clamp((1 - daylight) * 0.62, 0, 0.62)
    if (a <= 0.01) return
    g.fillStyle = `rgba(6,10,38,${a})`
    g.fillRect(0, 0, W, H)
  }

  private glow(
    x: number,
    y: number,
    r: number,
    color: string,
    alpha: number,
  ): void {
    const { g } = this
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, color.replace('A', String(alpha)))
    grad.addColorStop(1, color.replace('A', '0'))
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }

  private drawGlows(left: number, right: number, daylight: number): void {
    const { g, game, t } = this
    const dark = clamp(1 - daylight * 1.2, 0, 1)
    if (dark <= 0.02) return
    g.save()
    g.globalCompositeOperation = 'lighter'
    const flick = 0.85 + 0.15 * Math.sin(t * 9)
    const ger = game.state.buildings.find((b) => b.type === 'ger')
    if (ger && ger.x > left - 200 && ger.x < right + 200)
      this.glow(ger.x, -22, 170, 'rgba(255,170,80,A)', 0.55 * dark * flick)
    for (const c of game.state.camps)
      if (c.x > left - 100 && c.x < right + 100)
        this.glow(c.x + 42, -10, 80, 'rgba(255,150,60,A)', 0.5 * dark * flick)
    for (const b of game.state.buildings) {
      if (b.type !== 'tower' || (b.state !== 'Active' && b.state !== 'Damaged'))
        continue
      if (b.x < left - 100 || b.x > right + 100) continue
      this.glow(
        b.x,
        -game.config.buildings.tower.height - 12,
        90,
        'rgba(255,190,110,A)',
        0.5 * dark * flick,
      )
    }
    g.restore()
  }
}
