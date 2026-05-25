import type { TutorialRunState } from '../../types'

export const RED_INK_INK_COST_REDUCTION_DELTA = 1

export function getRedInkInkCostReduction(run: TutorialRunState): number {
  return Math.max(0, run.redInkInkCostReduction ?? 0)
}

export function getDiscountedRedInkInkCost(
  run: TutorialRunState,
  baseInkCost: number,
): number {
  return Math.max(0, baseInkCost - getRedInkInkCostReduction(run))
}

export function getAppliedRedInkInkCostReduction(
  run: TutorialRunState,
  baseInkCost: number,
): number {
  return Math.min(baseInkCost, getRedInkInkCostReduction(run))
}

export function getRemainingRedInkInkCostReduction(
  run: TutorialRunState,
  baseInkCost: number,
): number {
  return Math.max(
    0,
    getRedInkInkCostReduction(run) - getAppliedRedInkInkCostReduction(run, baseInkCost),
  )
}
