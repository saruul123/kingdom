import type { GameManager } from '../GameManager'
import { clamp, lerp } from '../core/math'
import { findById, isBuildingStanding } from '../core/lookup'
import type { Citizen, Enemy } from '../core/types'
import { drawBackdrop, makeAtmosphere } from './atmosphere'
import type { Atmosphere } from './atmosphere'
import { drawHud } from './hud'
import { ellipse, px } from './pixel'
import type { G } from './pixel'
import { C } from './palette'
import {
  drawAnimal,
  drawArrow,
  drawBanner,
  drawBar,
  drawBorderPost,
  drawBuildSite,
  drawCoin,
  drawFlame,
  drawGer,
  drawGroundDisc,
  drawRoleBadge,
  PERSON_HEIGHT,
  drawLevelPips,
  drawHero,
  drawOvoo,
  drawPerson,
  drawStand,
  drawStandMarker,
  drawTorchPole,
  drawTower,
  drawWall,
} from './sprites'
import type { Assets, PersonKind } from './sprites'

/** Ground line as a fraction of the (low-resolution) buffer height. */
const GROUND_FRACTION = 0.74

const OUTLINE_OFFSETS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

export interface RendererOptions {
  debug?: boolean
}

interface Light {
  x: number
  y: number
  r: number
  colour: string
  strength: number
  /** Flame drawn at (x, flameY) when set. */
  flameY?: number
}

function makeCanvas(): { canvas: HTMLCanvasElement; g: G } {
  const canvas = document.createElement('canvas')
  const g = canvas.getContext('2d')!
  return { canvas, g }
}

/**
 * Pixel-art renderer. The scene is drawn into a low-resolution buffer (one
 * buffer pixel = one world unit) and scaled up with nearest-neighbour.
 * Holds no gameplay state.
 */
export class Renderer {
  private out: G
  private scene = makeCanvas()
  private world = makeCanvas()
  private silhouette = makeCanvas()
  private final = makeCanvas()
  private camX: number
  private heroLastX: number
  private heroStride = 0
  private strideFrame = 0
  /** Hoof dust kicked up while galloping. */
  private dust: { x: number; age: number; size: number }[] = []
  private t = 0
  private fps = 60

  constructor(
    private canvas: HTMLCanvasElement,
    private game: GameManager,
    private assets: Assets,
    private opts: RendererOptions = {},
  ) {
    this.out = canvas.getContext('2d')!
    this.camX = game.state.hero.x
    this.heroLastX = game.state.hero.x
  }

  draw(dt: number): void {
    const { game, canvas, out } = this
    const { state } = game
    const W = canvas.width
    const H = canvas.height
    // Sprites are large and few, so keep the low-res buffer around 340px tall.
    const ps = Math.max(2, Math.round(H / 340))
    const bw = Math.ceil(W / ps)
    const bh = Math.ceil(H / ps)
    for (const c of [this.scene, this.world, this.silhouette, this.final]) {
      if (c.canvas.width !== bw || c.canvas.height !== bh) {
        c.canvas.width = bw
        c.canvas.height = bh
      }
      c.g.imageSmoothingEnabled = false
    }
    const s = this.scene.g
    const groundY = Math.round(bh * GROUND_FRACTION)
    this.t += dt
    this.fps = lerp(this.fps, 1 / Math.max(dt, 0.001), 0.05)
    const travelled = Math.abs(state.hero.x - this.heroLastX)
    this.heroLastX = state.hero.x
    // Four frames per gait cycle, driven by ground covered rather than wall time.
    this.heroStride += Math.min(travelled, 50) / 20
    this.updateDust(
      dt,
      state.hero.x,
      state.hero.facing,
      Math.abs(state.hero.vx) / game.config.hero.sprintSpeed,
    )

    // camera (buffer pixels == world units)
    const halfView = bw / 2
    const target = state.hero.x + clamp(state.hero.vx * 0.1, -28, 28)
    this.camX += (target - this.camX) * Math.min(1, dt * 3)
    this.camX = clamp(
      this.camX,
      game.config.world.minX + halfView - 160,
      game.config.world.maxX - halfView + 160,
    )
    const cx = Math.round(this.camX)
    const atm = this.atmosphere()

    // --- plain backdrop, then markers that sit under the sprites
    s.setTransform(1, 0, 0, 1, 0, 0)
    drawBackdrop(s, bw, bh, groundY, cx, atm)
    s.setTransform(1, 0, 0, 1, Math.round(bw / 2 - cx), groundY)
    this.drawGameplayCues(s, cx - bw / 2, cx + bw / 2)
    s.setTransform(1, 0, 0, 1, 0, 0)

    // --- sprites on a transparent layer
    const w = this.world.g
    w.setTransform(1, 0, 0, 1, 0, 0)
    w.clearRect(0, 0, bw, bh)
    w.setTransform(1, 0, 0, 1, Math.round(bw / 2 - cx), groundY)
    const lights: Light[] = []
    this.drawWorld(w, cx - bw / 2 - 90, cx + bw / 2 + 90, lights)
    w.setTransform(1, 0, 0, 1, 0, 0)

    // --- dark 1px outline around everything, so shapes separate from the backdrop
    this.compose(bw, bh, atm)
    s.drawImage(this.final.canvas, 0, 0)

    // --- emissive pass: fire glow and flames
    s.setTransform(1, 0, 0, 1, Math.round(bw / 2 - cx), groundY)
    this.drawEmissive(s, atm, lights)
    s.setTransform(1, 0, 0, 1, 0, 0)

    // --- present, then HUD at full resolution
    out.setTransform(1, 0, 0, 1, 0, 0)
    out.imageSmoothingEnabled = false
    out.drawImage(this.scene.canvas, 0, 0, bw, bh, 0, 0, bw * ps, bh * ps)
    drawHud(out, game, {
      W,
      H,
      ps,
      bw,
      camX: cx,
      groundY,
      debug: !!this.opts.debug,
      fps: this.fps,
    })
  }

  /** Outline + night/dusk grade, both applied only where sprites were drawn. */
  private compose(bw: number, bh: number, a: Atmosphere): void {
    const sil = this.silhouette.g
    sil.globalCompositeOperation = 'source-over'
    sil.clearRect(0, 0, bw, bh)
    sil.drawImage(this.world.canvas, 0, 0)
    sil.globalCompositeOperation = 'source-in'
    sil.fillStyle = '#0c1020'
    sil.fillRect(0, 0, bw, bh)
    sil.globalCompositeOperation = 'source-over'

    const f = this.final.g
    f.clearRect(0, 0, bw, bh)
    for (const [dx, dy] of OUTLINE_OFFSETS)
      f.drawImage(this.silhouette.canvas, dx, dy)
    f.drawImage(this.world.canvas, 0, 0)
    f.globalCompositeOperation = 'source-atop'
    if (a.w.n > 0.01) {
      f.fillStyle = `rgba(16,24,84,${0.42 * a.w.n})`
      f.fillRect(0, 0, bw, bh)
    }
    if (a.w.u > 0.01) {
      f.fillStyle = `rgba(255,110,60,${0.14 * a.w.u})`
      f.fillRect(0, 0, bw, bh)
    }
    f.globalCompositeOperation = 'source-over'
  }

  /** Important world objects stay bright and legible at every time of day. */
  private drawGameplayCues(g: G, left: number, right: number): void {
    const { state, config } = this.game
    // coloured discs under units: who is on whose side, at a glance
    for (const c of state.citizens) {
      if (c.state === 'Dead' || c.x < left - 30 || c.x > right + 30) continue
      if (
        c.postBuildingId !== null &&
        (c.brain === 'FindEnemy' || c.brain === 'Attack')
      )
        continue
      drawGroundDisc(
        g,
        c.x,
        c.owner === 'neutral' ? '#f2f2f2' : '#4fd68a',
        13,
        c.owner === 'neutral' ? 0.4 : 0.5,
      )
    }
    for (const e of state.enemies) {
      if (e.state === 'Dead' || e.x < left - 30 || e.x > right + 30) continue
      drawGroundDisc(g, e.x, '#ff4a3a', 13, 0.6)
    }
    drawGroundDisc(g, state.hero.x, '#ffd24a', 28, 0.4)
    for (const point of config.content.buildPoints) {
      if (point.x < left - 30 || point.x > right + 30) continue
      if (point.building !== 'wall' && point.building !== 'tower') continue
      if (state.buildings.some((b) => b.buildPointId === point.id)) continue
      if (point.requires) {
        const prerequisite = state.buildings.find(
          (b) => b.buildPointId === point.requires,
        )
        if (!prerequisite || !isBuildingStanding(prerequisite)) continue
      }
      drawBuildSite(g, point.x, point.building, this.t)
    }

    for (const stand of config.content.stands)
      if (stand.x >= left - 20 && stand.x <= right + 20)
        drawStandMarker(g, stand.x, stand.profession, this.t)

    for (const coin of state.coinPickups) {
      if (coin.x < left - 25 || coin.x > right + 25) continue
      const drop =
        coin.delay > 0
          ? Math.round((coin.delay / config.economy.coinPickupDelay) * 14)
          : 0
      g.save()
      g.translate(0, -drop)
      drawCoin(g, coin.x, coin.amount, this.t, coin.id)
      g.restore()
    }
  }

  /** One puff per gait frame while moving fast, fading within half a second. */
  private updateDust(
    dt: number,
    x: number,
    facing: 1 | -1,
    speed01: number,
  ): void {
    const frame = Math.floor(this.heroStride)
    if (frame !== this.strideFrame && speed01 > 0.3) {
      this.dust.push({
        x: x - facing * 30,
        age: 0,
        size: speed01 > 0.7 ? 3 : 2,
      })
    }
    this.strideFrame = frame
    for (const d of this.dust) d.age += dt
    this.dust = this.dust.filter((d) => d.age < 0.55)
  }

  private drawDust(g: G): void {
    for (const d of this.dust) {
      const k = d.age / 0.55
      const size = Math.round(d.size + k * 5)
      g.globalAlpha = 0.55 * (1 - k)
      px(
        g,
        '#d9caa2',
        Math.round(d.x - size / 2),
        Math.round(-2 - k * 12 - size / 2),
        size,
        size,
      )
    }
    g.globalAlpha = 1
  }

  private atmosphere(): Atmosphere {
    const { game } = this
    const { state, config } = game
    const t = config.time
    const dur = game.time.phaseDuration(state.currentPhase)
    const p = 1 - state.timeRemaining / dur
    const elapsed = dur - state.timeRemaining
    let sunF = -1
    if (state.currentPhase === 'Sunrise') sunF = elapsed / t.dayDuration
    else if (state.currentPhase === 'Day')
      sunF = (t.sunriseDuration + elapsed) / t.dayDuration
    else if (state.currentPhase === 'Sunset')
      sunF = (t.dayDuration - t.sunsetDuration + elapsed) / t.dayDuration
    return makeAtmosphere(
      state.currentPhase,
      p,
      sunF,
      state.currentPhase === 'Night' ? p : 0,
      this.t,
      game.time.daylight(),
    )
  }

  // ---------------------------------------------------------------- world

  private drawWorld(g: G, left: number, right: number, lights: Light[]): void {
    const { game, t } = this
    const { state, config } = game
    const vis = (x: number, pad = 60) => x > left - pad && x < right + pad

    for (const ter of state.controlledTerritories) {
      for (const side of [-1, 1]) {
        const x = ter.x + side * ter.radius
        if (vis(x)) drawBorderPost(g, x, t)
      }
    }
    for (const o of state.ovoos) if (vis(o.x)) drawOvoo(g, o.x, t)

    const dark = game.time.daylight() < 0.55
    for (const c of state.camps) {
      if (!vis(c.x, 120)) continue
      drawGer(g, c.x - 18, 32, 17, 24, false, dark, t)
      const fx = c.x + 44
      px(g, C.stoneDark, fx - 7, -3, 4, 3)
      px(g, C.stone, fx - 3, -4, 4, 4)
      px(g, C.stoneDark, fx + 2, -3, 4, 3)
      px(g, C.woodDark, fx - 5, -5, 10, 2)
      lights.push({
        x: fx,
        y: -10,
        r: 46,
        colour: 'rgba(255,150,60,A)',
        strength: 0.6,
        flameY: -5,
      })
    }

    const order = { ger: 0, wall: 1, tower: 2 } as const
    const buildings = [...state.buildings].sort(
      (a, b) => order[a.type] - order[b.type],
    )
    for (const b of buildings) {
      if (!vis(b.x, 120)) continue
      const def = config.buildings[b.type]
      const building = b.state === 'Planned' || b.state === 'UnderConstruction'
      const progress = building ? Math.max(0.12, b.constructionProgress) : 1
      const dmg = b.state === 'Damaged' ? 1 - b.health / b.maxHealth : 0
      const hurt = b.hitFlash > 0
      // top of the sprite, for bars and level pips above it
      const topY = b.type === 'tower' ? def.height + 72 : def.height
      if (b.type === 'ger') {
        drawGer(g, b.x, 60, 30, 44, hurt, dark, t)
        lights.push({
          x: b.x,
          y: -26,
          r: 120,
          colour: 'rgba(255,175,90,A)',
          strength: 0.75,
        })
      } else if (b.type === 'wall') {
        drawWall(g, b.x, def.height, progress, dmg, hurt, b.level)
        if (!building) {
          drawTorchPole(g, b.x, -def.height - 2)
          lights.push({
            x: b.x,
            y: -def.height - 18,
            r: 44,
            colour: 'rgba(255,170,80,A)',
            strength: 0.55,
            flameY: -def.height - 14,
          })
        }
      } else {
        drawTower(g, b.x, def.height, progress, hurt, b.level)
        if (!building) {
          lights.push({
            x: b.x + 17,
            y: -def.height - 16,
            r: 60,
            colour: 'rgba(255,180,90,A)',
            strength: 0.6,
            flameY: -def.height - 12,
          })
        }
      }
      if (b.level > 1) drawLevelPips(g, b.x, -topY - 20, b.level - 1)
      if (b.upgrading)
        drawBar(g, b.x, -topY - 10, b.upgradeProgress, '#6ab0ff', 24)
      else if (building)
        drawBar(g, b.x, -topY - 10, b.constructionProgress, '#f3c64a', 24)
      else if (b.health < b.maxHealth)
        drawBar(
          g,
          b.x,
          -topY - 10,
          b.health / b.maxHealth,
          b.health / b.maxHealth < 0.4 ? '#e5533d' : '#7ecb5a',
          24,
        )
    }

    for (const s of config.content.stands)
      if (vis(s.x)) drawStand(g, s.x, s.profession)

    if (state.banner.state === 'ground') drawBanner(g, state.banner.x, 0, t, 52)

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
    for (const c of state.citizens) if (vis(c.x)) this.citizen(g, c)
    for (const e of state.enemies) if (vis(e.x)) this.enemy(g, e)

    // hero
    const h = state.hero
    const blink = h.invulnerable > 0 && Math.floor(t * 14) % 2 === 0
    g.save()
    if (blink) g.globalAlpha = 0.4
    if (state.banner.state === 'held') {
      g.save()
      g.translate(Math.round(h.x), 0)
      g.scale(h.facing, 1)
      drawBanner(g, -20, -36, t, 60)
      g.restore()
    }
    this.drawDust(g)
    drawHero(
      g,
      this.assets,
      h.x,
      0,
      h.facing,
      this.heroStride,
      Math.abs(h.vx) / config.hero.sprintSpeed,
    )
    g.restore()

    for (const p of state.projectiles) {
      const u = clamp(p.travelled / p.totalDist, 0, 1)
      const arc = 4 * p.totalDist * 0.1 * u * (1 - u)
      drawArrow(g, p.x, -p.y - arc, p.lastX - p.x, -(p.lastY - p.y))
    }
  }

  private citizen(g: G, c: Citizen): void {
    const { game, t } = this
    const dead = c.state === 'Dead'
    const kind: PersonKind =
      c.owner === 'neutral'
        ? 'neutral'
        : c.profession === 'Archer'
          ? 'archer'
          : c.profession === 'Builder'
            ? 'builder'
            : 'citizen'
    let y = 0
    if (
      c.postBuildingId !== null &&
      (c.brain === 'FindEnemy' || c.brain === 'Attack')
    ) {
      const tower = findById(game.state.buildings, c.postBuildingId)
      if (tower) y = -game.config.buildings[tower.type].height
    }
    const action =
      c.brain === 'Attack' || c.brain === 'HuntAttack'
        ? 'shoot'
        : c.brain === 'Build' || c.brain === 'Repair'
          ? 'hammer'
          : null
    drawPerson(g, c.x, y, c.facing, {
      kind,
      t: t + c.id,
      moving:
        c.state === 'Moving' ||
        c.state === 'Returning' ||
        c.state === 'Fleeing',
      action,
      dead,
      fade: dead ? clamp(c.deadTimer / 1.5, 0, 1) : undefined,
      carrying: c.carrying > 0 && !dead,
    })
    // Workers on the ground carry a job badge; archers already stand out on towers.
    if (!dead && y === 0 && (kind === 'archer' || kind === 'builder'))
      drawRoleBadge(g, c.x, -PERSON_HEIGHT - 12, kind)
  }

  private enemy(g: G, e: Enemy): void {
    const { t } = this
    const dead = e.state === 'Dead'
    drawPerson(g, e.x, 0, e.facing, {
      kind: 'bandit',
      t: t + e.id,
      moving: e.state === 'Moving' || e.state === 'Fleeing',
      hurt: e.hitFlash > 0,
      dead,
      fade: dead ? clamp(e.deadTimer / 1.5, 0, 1) : undefined,
    })
    if (dead) return
    if (e.carryingBanner) drawBanner(g, e.x - e.facing * 10, -10, t, 40)
    if (e.health < e.maxHealth)
      drawBar(
        g,
        e.x,
        -PERSON_HEIGHT - 12,
        e.health / e.maxHealth,
        '#e5533d',
        22,
      )
  }

  // ------------------------------------------------------------- lighting

  private glow(g: G, l: Light, k: number): void {
    const steps = 6
    for (let i = 0; i < steps; i++) {
      const r = Math.round(l.r * (1 - i / (steps + 1)) * 0.8)
      const a = l.strength * k * 0.035
      ellipse(
        g,
        l.colour.replace('A', a.toFixed(3)),
        l.x,
        l.y,
        r,
        Math.round(r * 0.75),
      )
    }
  }

  private drawEmissive(g: G, atm: Atmosphere, lights: Light[]): void {
    const dark = clamp(1 - atm.daylight * 1.25, 0, 1)
    const flick = 0.88 + 0.12 * Math.sin(this.t * 9)
    if (dark > 0.02) {
      g.save()
      g.globalCompositeOperation = 'lighter'
      for (const l of lights) this.glow(g, l, dark * flick)
      g.restore()
    }
    // the flames themselves are always visible
    for (const l of lights)
      if (l.flameY !== undefined)
        drawFlame(g, Math.round(l.x), l.flameY, this.t, 1)
  }
}
