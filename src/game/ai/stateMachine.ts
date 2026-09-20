import type { GameContext } from '../core/context'
import type { UnitState } from '../core/types'

interface Machine {
  brain: string
  state: UnitState
  timer: number
}

/** A node runs every frame while the unit is in that brain state. */
export type Node<TUnit extends Machine> = (
  u: TUnit,
  ctx: GameContext,
  dt: number,
) => void
export type Nodes<TUnit extends Machine> = Record<string, Node<TUnit>>

/** Enter a brain node (resetting its timer) and optionally the coarse UnitState. */
export function go(u: Machine, brain: string, state?: UnitState): void {
  u.brain = brain
  u.timer = 0
  if (state) u.state = state
}

export function runMachine<TUnit extends Machine>(
  nodes: Nodes<TUnit>,
  u: TUnit,
  ctx: GameContext,
  dt: number,
): void {
  u.timer += dt
  const node = nodes[u.brain] ?? nodes.Idle
  node(u, ctx, dt)
}
