import type { TutorialResourceDelta, TutorialResourceState } from '../../types'

export function createInitialTutorialResourceState(): TutorialResourceState {
  return {
    ink: 0,
    doom: 0,
    fracture: 0,
  }
}

export function applyTutorialResourceDelta(
  resources: TutorialResourceState,
  delta: TutorialResourceDelta,
): TutorialResourceState {
  return {
    ink: clampResource(resources.ink + (delta.ink ?? 0)),
    doom: clampResource(resources.doom + (delta.doom ?? 0)),
    fracture: clampResource(resources.fracture + (delta.fracture ?? 0)),
  }
}

export function canSpendTutorialResources(
  resources: TutorialResourceState,
  cost: TutorialResourceDelta,
) {
  return (
    resources.ink >= Math.abs(Math.min(0, cost.ink ?? 0)) &&
    resources.doom >= Math.abs(Math.min(0, cost.doom ?? 0)) &&
    resources.fracture >= Math.abs(Math.min(0, cost.fracture ?? 0))
  )
}

function clampResource(value: number) {
  return Math.max(0, value)
}
