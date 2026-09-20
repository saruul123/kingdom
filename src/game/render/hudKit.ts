import type { G } from './pixel'

export const FONT =
  "'Pixelify Sans', 'Press Start 2P', ui-monospace, 'Courier New', monospace"
export const DISPLAY = "'Pixelify Sans', ui-monospace, monospace"

/** Stepped-corner panel: gold rim, dark navy fill. */
export function panel(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  u: number,
  rim: string,
): void {
  g.fillStyle = rim
  g.fillRect(x + u, y, w - 2 * u, h)
  g.fillRect(x, y + u, w, h - 2 * u)
  g.fillStyle = 'rgba(14,18,44,0.9)'
  g.fillRect(x + 2 * u, y + u, w - 4 * u, h - 2 * u)
  g.fillRect(x + u, y + 2 * u, w - 2 * u, h - 4 * u)
  g.fillStyle = 'rgba(255,255,255,0.08)'
  g.fillRect(x + 2 * u, y + u, w - 4 * u, u)
}

export function text(
  g: G,
  s: string,
  x: number,
  y: number,
  size: number,
  colour: string,
  align: CanvasTextAlign = 'left',
  font = FONT,
): void {
  g.font = `600 ${size}px ${font}`
  g.textAlign = align
  g.textBaseline = 'middle'
  g.fillStyle = 'rgba(0,0,0,0.55)'
  g.fillText(s, x + Math.max(1, size / 12), y + Math.max(1, size / 12))
  g.fillStyle = colour
  g.fillText(s, x, y)
}
