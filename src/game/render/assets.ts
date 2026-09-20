import dayUrl from '../../assests/backgrounds/steppe-day.png'
import nightUrl from '../../assests/backgrounds/steppe-night.png'
import heroUrl from '../../assests/sprites/mounted-archer.png'
import raiderUrl from '../../assests/sprites/mounted-raider.png'
import gerUrl from '../../assests/sprites/ger.png'
import wallUrl from '../../assests/sprites/palisade.png'
import bannerUrl from '../../assests/sprites/blue-banner.png'
import towerUrl from '../../assests/sprites/watchtower.png'
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

/** Load each visual layer independently so the world can move over its backdrop. */
export async function loadAssets(): Promise<Assets> {
  const [day, night, hero, raider, ger, tower, wall, banner] =
    await Promise.all([
      loadImage(dayUrl),
      loadImage(nightUrl),
      loadImage(heroUrl),
      loadImage(raiderUrl),
      loadImage(gerUrl),
      loadImage(towerUrl),
      loadImage(wallUrl),
      loadImage(bannerUrl),
      loadFont(),
    ])
  return { day, night, hero, raider, ger, tower, wall, banner }
}
