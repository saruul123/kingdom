import { hash, mix, parse } from './color'

export type G = CanvasRenderingContext2D

/** Filled rectangle on the integer pixel grid. */
export function px(g: G, c: string, x: number, y: number, w = 1, h = 1): void {
  g.fillStyle = c
  g.fillRect(Math.round(x), Math.round(y), w, h)
}

/** Pixel-perfect filled disc (no anti-aliasing). */
export function disc(g: G, c: string, cx: number, cy: number, r: number): void {
  ellipse(g, c, cx, cy, r, r)
}

export function ellipse(
  g: G,
  c: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  g.fillStyle = c
  cx = Math.round(cx)
  cy = Math.round(cy)
  for (let dy = -ry; dy <= ry; dy++) {
    const t = ry === 0 ? 0 : dy / (ry + 0.35)
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)))
    g.fillRect(cx - half, cy + dy, half * 2 + 1, 1)
  }
}

/** Bresenham line made of 1px squares. */
export function line(
  g: G,
  c: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  g.fillStyle = c
  x0 = Math.round(x0)
  y0 = Math.round(y0)
  x1 = Math.round(x1)
  y1 = Math.round(y1)
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    g.fillRect(x0, y0, 1, 1)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x0 += sx
    }
    if (e2 <= dx) {
      err += dx
      y0 += sy
    }
  }
}

/** Draw a small bitmap from rows of palette characters ('.' or ' ' = transparent). */
export function bitmap(
  g: G,
  rows: string[],
  pal: Record<string, string>,
  x: number,
  y: number,
  scale = 1,
): void {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    for (let c = 0; c < row.length; c++) {
      const col = pal[row[c]]
      if (!col) continue
      g.fillStyle = col
      g.fillRect(
        Math.round(x) + c * scale,
        Math.round(y) + r * scale,
        scale,
        scale,
      )
    }
  }
}

const tintCache = new Map<string, string>()
/** Blend a colour towards `toward` by k (cached, for hit flashes and shading). */
export function tint(c: string, toward: string, k: number): string {
  const key = `${c}|${toward}|${Math.round(k * 20)}`
  let v = tintCache.get(key)
  if (!v) {
    v = mix(c, toward, Math.round(k * 20) / 20)
    tintCache.set(key, v)
  }
  return v
}

export function shade(c: string, k: number): string {
  return tint(c, '#000000', k)
}
export function light(c: string, k: number): string {
  return tint(c, '#ffffff', k)
}

export { hash, mix, parse }
