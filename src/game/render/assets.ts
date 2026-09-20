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

/** Loads the image assets the renderer needs (the mounted-archer atlas). */
export async function loadAssets(): Promise<Assets> {
  return { hero: await loadImage(heroUrl) }
}
