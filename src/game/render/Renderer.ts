import type { GameManager } from '../GameManager'
import { clamp, lerp } from '../core/math'
import { findById, isBuildingStanding } from '../core/lookup'
import type { Citizen, Enemy } from '../core/types'
import { BANK, drawReflection, makeAtmosphere } from './atmosphere'
import type { Atmosphere } from './atmosphere'
import { drawHud } from './hud'
import { ellipse, hash, px } from './pixel'
import type { G } from './pixel'
import { C, tri } from './palette'
import {
  drawAnimal,
  drawArrow,
  drawBanner,
  drawBar,
  drawBorderPost,
  drawBuildSite,
  drawCoin,
  drawCutout,
  drawFlame,
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
const GROUND_FRACTION = 0.7

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
  private camX: number
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
  }

  draw(dt: number): void {
    const { game, canvas, out } = this
    const { state } = game
    const W = canvas.width
    const H = canvas.height
    const ps = Math.max(2, Math.round(H / 440))
    const bw = Math.ceil(W / ps)
    const bh = Math.ceil(H / ps)
    for (const c of [this.scene, this.world]) {
      if (c.canvas.width !== bw || c.canvas.height !== bh) {
        c.canvas.width = bw
        c.canvas.height = bh
      }
      c.g.imageSmoothingEnabled = false
    }
    const s = this.scene.g
    const w = this.world.g
    const groundY = Math.round(bh * GROUND_FRACTION)
    this.t += dt
    this.fps = lerp(this.fps, 1 / Math.max(dt, 0.001), 0.05)

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

    // --- background scene
    s.setTransform(1, 0, 0, 1, 0, 0)
    this.drawBackdrop(s, bw, bh, cx, atm)
    this.drawForegroundGround(s, bw, groundY, cx, atm)
    s.setTransform(1, 0, 0, 1, Math.round(bw / 2 - cx), groundY)
    this.drawGameplayCues(s, cx - bw / 2, cx + bw / 2)
    s.setTransform(1, 0, 0, 1, 0, 0)

    // --- sprites on a transparent layer so the night tint only touches them
    w.setTransform(1, 0, 0, 1, 0, 0)
    w.clearRect(0, 0, bw, bh)
    w.setTransform(1, 0, 0, 1, Math.round(bw / 2 - cx), groundY)
    const lights: Light[] = []
    this.drawWorld(w, cx - bw / 2 - 90, cx + bw / 2 + 90, lights)
    w.setTransform(1, 0, 0, 1, 0, 0)
    this.tint(w, bw, bh, atm)
    s.drawImage(this.world.canvas, 0, 0)

    // --- emissive pass: fire glow, flames, lake reflections
    s.setTransform(1, 0, 0, 1, Math.round(bw / 2 - cx), groundY)
    this.drawEmissive(s, atm, lights)
    s.setTransform(1, 0, 0, 1, 0, 0)
    this.drawReflections(s, atm, bw, bh, groundY, cx, lights)

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

  private drawBackdrop(
    g: G,
    bw: number,
    bh: number,
    camX: number,
    a: Atmosphere,
  ): void {
    const draw = (img: HTMLImageElement) => {
      const scale = Math.max(bw / img.width, bh / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      const parallax = clamp(camX * 0.035, -(dw - bw) / 2, (dw - bw) / 2)
      // The painted grass edge is at ~70% of the image. Keep it under the
      // entities' feet even when the viewport crops the panorama vertically.
      g.drawImage(
        img,
        (bw - dw) / 2 - parallax,
        bh * GROUND_FRACTION - dh * 0.7,
        dw,
        dh,
      )
    }
    g.imageSmoothingEnabled = true
    const nightAlpha = clamp(a.w.n + a.w.u * 0.85, 0, 1)
    if (nightAlpha < 1) draw(this.assets.day)
    if (nightAlpha > 0) {
      g.globalAlpha = nightAlpha
      draw(this.assets.night)
    }
    g.globalAlpha = 1
    g.imageSmoothingEnabled = false
  }

  /** A world-locked near bank gives the playable plane its own value and motion. */
  private drawForegroundGround(
    g: G,
    width: number,
    groundY: number,
    camX: number,
    a: Atmosphere,
  ): void {
    const soil = tri(a.w, '#35452b', '#39382e', '#101d29')
    const grass = tri(a.w, '#829b3f', '#95804c', '#40533b')
    const highlight = tri(a.w, '#d4cc73', '#e5ac64', '#92926a')
    const pebble = tri(a.w, '#c0b99a', '#ac91a0', '#677287')

    g.save()
    g.globalAlpha = 0.44
    px(g, soil, 0, groundY + 2, width, BANK + 1)
    g.globalAlpha = 0.76
    px(g, grass, 0, groundY, width, 2)
    g.globalAlpha = 0.55
    px(g, highlight, 0, groundY - 1, width, 1)
    g.globalAlpha = 1

    const left = Math.floor(camX - width / 2)
    const first = Math.floor(left / 13) * 13
    for (let wx = first; wx < left + width + 13; wx += 13) {
      const x = wx - left
      const n = hash(wx * 0.17)
      if (n > 0.36) {
        const y = groundY + 3 + Math.floor(hash(wx * 0.47) * 22)
        px(g, grass, x, y - 2, 1, 3)
        if (n > 0.78) px(g, highlight, x + 1, y - 1, 1, 2)
      }
      if (n < 0.18) {
        const y = groundY + 9 + Math.floor(hash(wx * 0.31) * 18)
        px(g, soil, x, y + 1, 5, 2)
        px(g, pebble, x + 1, y, 3, 1)
      }
    }
    g.restore()
  }

  /** Important world objects stay bright and legible at every time of day. */
  private drawGameplayCues(g: G, left: number, right: number): void {
    const { state, config } = this.game
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

  /** Night/dusk colour grade applied only where sprites were drawn. */
  private tint(w: G, bw: number, bh: number, a: Atmosphere): void {
    w.globalCompositeOperation = 'source-atop'
    if (a.w.n > 0.01) {
      w.fillStyle = `rgba(16,24,84,${0.5 * a.w.n})`
      w.fillRect(0, 0, bw, bh)
    }
    if (a.w.u > 0.01) {
      w.fillStyle = `rgba(255,110,60,${0.16 * a.w.u})`
      w.fillRect(0, 0, bw, bh)
    }
    w.globalCompositeOperation = 'source-over'
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

    for (const c of state.camps) {
      if (!vis(c.x, 120)) continue
      drawCutout(
        g,
        this.assets.ger,
        c.x - 18,
        0,
        58,
        43,
        [155, 60, 1225, 910],
        1,
        true,
      )
      const fx = c.x + 40
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
      if (b.type === 'ger') {
        if (hurt) g.globalAlpha = 0.55
        drawCutout(
          g,
          this.assets.ger,
          b.x,
          0,
          124,
          94,
          [155, 60, 1225, 910],
          1,
          true,
        )
        g.globalAlpha = 1
        lights.push({
          x: b.x,
          y: -18,
          r: 110,
          colour: 'rgba(255,170,80,A)',
          strength: 0.7,
        })
      } else if (b.type === 'wall') {
        if (building || dmg > 0)
          drawWall(g, b.x, def.height, progress, dmg, hurt)
        else {
          if (hurt) g.globalAlpha = 0.55
          drawCutout(
            g,
            this.assets.wall,
            b.x,
            0,
            22,
            def.height,
            [610, 110, 270, 820],
            1,
            true,
          )
          g.globalAlpha = 1
        }
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
        if (building) drawTower(g, b.x, def.height, progress, hurt)
        else {
          if (hurt) g.globalAlpha = 0.55
          drawCutout(
            g,
            this.assets.tower,
            b.x,
            0,
            57,
            130,
            [135, 6, 750, 1480],
            1,
            true,
          )
          g.globalAlpha = 1
        }
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
      if (building)
        drawBar(
          g,
          b.x,
          -def.height - 60 + (b.type === 'wall' ? 26 : 0),
          b.constructionProgress,
          '#f3c64a',
        )
      else if (b.health < b.maxHealth) {
        const top =
          b.type === 'tower'
            ? def.height + 58
            : b.type === 'ger'
              ? def.height + 12
              : def.height + 12
        drawBar(
          g,
          b.x,
          -top,
          b.health / b.maxHealth,
          b.health / b.maxHealth < 0.4 ? '#e5533d' : '#7ecb5a',
          22,
        )
      }
    }

    for (const s of config.content.stands)
      if (vis(s.x)) drawStand(g, s.x, s.profession)

    if (state.banner.state === 'ground')
      drawCutout(
        g,
        this.assets.banner,
        state.banner.x,
        0,
        46,
        88,
        [108, 6, 900, 1510],
      )

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
    drawHero(
      g,
      this.assets,
      h.x,
      0,
      h.facing,
      t,
      Math.abs(h.vx) / config.hero.sprintSpeed,
      h.sprinting,
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
  }

  private enemy(g: G, e: Enemy): void {
    const { t } = this
    const dead = e.state === 'Dead'
    g.save()
    if (e.hitFlash > 0) g.globalAlpha = 0.55
    if (dead) g.globalAlpha = clamp(e.deadTimer / 1.5, 0, 1)
    const moving = e.state === 'Moving' || e.state === 'Fleeing'
    const bob = moving ? Math.sin((t + e.id) * 15) * 1.5 : 0
    drawCutout(
      g,
      this.assets.raider,
      e.x,
      bob,
      99,
      76,
      [145, 15, 1250, 980],
      e.facing === -1 ? 1 : -1,
    )
    g.restore()
    if (dead) return
    if (e.carryingBanner) drawBanner(g, e.x - e.facing * 8, -8, t, 34)
    if (e.health < e.maxHealth)
      drawBar(g, e.x, -82, e.health / e.maxHealth, '#e5533d', 20)
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

  private drawReflections(
    s: G,
    atm: Atmosphere,
    bw: number,
    bh: number,
    groundY: number,
    cx: number,
    lights: Light[],
  ): void {
    const wTop = groundY + BANK + 4
    const dark = clamp(1 - atm.daylight * 1.25, 0, 1)
    if (dark > 0.05) {
      for (const l of lights) {
        const sx = Math.round(l.x - cx + bw / 2)
        if (sx < -10 || sx > bw + 10) continue
        drawReflection(
          s,
          sx,
          wTop,
          bh,
          '#ffb45a',
          dark * l.strength * 0.8,
          this.t,
        )
      }
    }
    if (atm.sunF >= 0 && atm.sunF <= 1)
      drawReflection(
        s,
        Math.round(bw * (0.08 + 0.84 * atm.sunF)),
        wTop,
        bh,
        '#ffe9a0',
        0.6,
        this.t,
      )
    else if (atm.daylight < 0.6)
      drawReflection(
        s,
        Math.round(bw * (0.15 + 0.7 * atm.moonF)),
        wTop,
        bh,
        '#dfe6ff',
        0.55,
        this.t,
      )
  }
}
