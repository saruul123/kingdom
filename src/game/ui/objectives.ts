import type { GameContext } from '../core/context'
import { isAlive } from '../core/lookup'
import { mn } from '../i18n'

export interface Objective {
  id: string
  text: string
  /** World x to point the player at, when there is one. */
  targetX: number | null
}

const nearest = <T>(
  items: T[],
  x: number,
  pos: (t: T) => number,
): T | undefined =>
  items.reduce<T | undefined>(
    (best, it) =>
      best === undefined || Math.abs(pos(it) - x) < Math.abs(pos(best) - x)
        ? it
        : best,
    undefined,
  )

/**
 * The next thing a new player should do, derived purely from game state.
 * Returns null once the basics are covered and the player is free to play.
 */
export function currentObjective(ctx: GameContext): Objective | null {
  const { state, config } = ctx
  const hx = state.hero.x
  const ger = state.buildings.find((b) => b.type === 'ger')

  if (state.currentPhase === 'Night')
    return { id: 'night', text: mn.objective.night, targetX: null }
  if (state.currentPhase === 'Sunset')
    return { id: 'sunset', text: mn.objective.sunset, targetX: ger?.x ?? 0 }

  const mine = state.citizens.filter((c) => c.owner === 'player' && isAlive(c))
  const free = mine.filter(
    (c) => c.profession === 'Citizen' && c.pendingProfession === null,
  )
  const count = (p: 'Archer' | 'Builder' | 'Herder' | 'Trader') =>
    mine.filter((c) => c.profession === p || c.pendingProfession === p).length
  const archers = count('Archer')
  const builders = count('Builder')
  const herders = count('Herder')
  const built = state.buildings.filter((b) => b.type !== 'ger')
  const towers = built.filter((b) => b.type === 'tower').length

  const needCoins = (cost: number): Objective | null => {
    if (state.coins >= cost) return null
    const coin = nearest(state.coinPickups, hx, (c) => c.x)
    return { id: 'coins', text: mn.objective.coins, targetX: coin?.x ?? null }
  }
  const recruit = (text: string): Objective => {
    const neutral = nearest(
      state.citizens.filter((c) => c.owner === 'neutral' && isAlive(c)),
      hx,
      (c) => c.x,
    )
    return { id: 'recruit', text, targetX: neutral?.x ?? null }
  }
  const stand = (profession: 'archer' | 'builder' | 'herder') =>
    config.content.stands.find((s) => s.profession === profession)
  const buildPoint = (type: string) => {
    const open = config.content.buildPoints.filter(
      (p) =>
        p.building === type &&
        !state.buildings.some((b) => b.buildPointId === p.id) &&
        (!p.requires ||
          state.buildings.some(
            (b) => b.buildPointId === p.requires && b.state === 'Active',
          )),
    )
    return nearest(open, ger?.x ?? 0, (p) => p.x)
  }

  if (mine.length === 0)
    return needCoins(config.recruitCost) ?? recruit(mn.objective.recruit)

  if (free.length > 0 && archers === 0)
    return (
      needCoins(config.professions.archer.cost) ?? {
        id: 'archer',
        text: mn.objective.archer,
        targetX: stand('archer')?.x ?? null,
      }
    )
  if (free.length > 0 && builders === 0)
    return (
      needCoins(config.professions.builder.cost) ?? {
        id: 'builder',
        text: mn.objective.builder,
        targetX: stand('builder')?.x ?? null,
      }
    )
  if (archers === 0 || builders === 0)
    return needCoins(config.recruitCost) ?? recruit(mn.objective.moreCitizens)

  if (built.length === 0) {
    const p = buildPoint('wall')
    return (
      needCoins(config.buildings.wall.cost) ?? {
        id: 'build',
        text: mn.objective.build,
        targetX: p?.x ?? null,
      }
    )
  }
  if (towers === 0) {
    const p = buildPoint('tower')
    if (p)
      return (
        needCoins(config.buildings.tower.cost) ?? {
          id: 'tower',
          text: mn.objective.tower,
          targetX: p.x,
        }
      )
  }
  const pastures = built.filter((b) => b.type === 'pasture')
  if (towers > 0 && pastures.length === 0) {
    const p = buildPoint('pasture')
    if (p)
      return (
        needCoins(config.buildings.pasture.cost) ?? {
          id: 'pasture',
          text: mn.objective.pasture,
          targetX: p.x,
        }
      )
  }
  if (pastures.some((b) => b.state === 'Active') && herders === 0) {
    if (free.length === 0)
      return needCoins(config.recruitCost) ?? recruit(mn.objective.moreCitizens)
    return (
      needCoins(config.professions.herder.cost) ?? {
        id: 'herder',
        text: mn.objective.herder,
        targetX: stand('herder')?.x ?? null,
      }
    )
  }
  if (
    state.buildings.every((b) => b.level === 1 && !b.upgrading) &&
    built.length >= 2
  ) {
    const target = built.find(
      (b) => config.buildings[b.type].upgrades.length > 0,
    )
    if (target)
      return { id: 'upgrade', text: mn.objective.upgrade, targetX: target.x }
  }
  if (state.kingdomLevel < 4 && built.length >= 3) {
    const up = config.buildings.ger.upgrades.at(state.kingdomLevel - 1)
    if (up && !ger?.upgrading)
      return (
        needCoins(up.cost) ?? {
          id: 'ger',
          text: mn.objective.ger,
          targetX: ger?.x ?? 0,
        }
      )
  }
  if (state.kingdomLevel >= 2) {
    const markets = state.buildings.filter((b) => b.type === 'market')
    const mp = buildPoint('market')
    if (markets.length === 0 && mp)
      return (
        needCoins(config.buildings.market.cost) ?? {
          id: 'market',
          text: mn.objective.market,
          targetX: mp.x,
        }
      )
    const trader = count('Trader')
    if (markets.some((b) => b.state === 'Active') && trader === 0) {
      if (free.length === 0)
        return (
          needCoins(config.recruitCost) ?? recruit(mn.objective.moreCitizens)
        )
      const m = markets.find((b) => b.state === 'Active')
      return (
        needCoins(config.professions.trader.cost) ?? {
          id: 'trader',
          text: mn.objective.trader,
          targetX: m?.x ?? null,
        }
      )
    }
  }
  if (
    state.kingdomLevel >= 3 &&
    !state.buildings.some((b) => b.type === 'ortoo')
  ) {
    const op = buildPoint('ortoo')
    if (op)
      return (
        needCoins(config.buildings.ortoo.cost) ?? {
          id: 'ortoo',
          text: mn.objective.ortoo,
          targetX: op.x,
        }
      )
  }
  const explored = (x: number) =>
    x >= state.explored.min && x <= state.explored.max
  const cleared = state.enemyCamps.find(
    (c) =>
      c.cleared &&
      !state.buildings.some((b) => b.buildPointId === `camp:${c.id}`),
  )
  if (cleared)
    return (
      needCoins(config.content.enemyCamps.outpostCost) ?? {
        id: 'outpost',
        text: mn.objective.outpost,
        targetX: cleared.x,
      }
    )
  const camp = nearest(
    state.enemyCamps.filter((c) => !c.cleared && explored(c.x)),
    hx,
    (c) => c.x,
  )
  if (camp && archers >= 2)
    return { id: 'camp', text: mn.objective.camp, targetX: camp.x }
  return null
}
