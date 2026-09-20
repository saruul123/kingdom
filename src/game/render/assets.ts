import heroUrl from '../../assests/sprites/hero.png'
import type { Assets } from './sprites'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${url}`))
    img.src = url
  })
}

/** Make sure the pixel font (incl. Ө/Ү) is ready before the canvas HUD first draws with it. */
async function loadFont(): Promise<void> {
  const ready = document.fonts
    .load('600 16px "Pixelify Sans"', 'Өө Үү Аа')
    .then(() => undefined)
    .catch(() => undefined)
  await Promise.race([ready, new Promise<void>((r) => setTimeout(r, 2000))])
}

/** Loads what the renderer needs: the mounted-archer atlas and the pixel font. */
export async function loadAssets(): Promise<Assets> {
  const [hero] = await Promise.all([loadImage(heroUrl), loadFont()])
  return { hero }
}
