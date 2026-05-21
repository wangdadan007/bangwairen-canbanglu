import type { TutorialPlayerFormState } from '../../types'

export const DEFAULT_PLAYER_MAX_FORM = 72
export const RESTORE_PLAYER_FORM_AMOUNT = 24

export function createInitialTutorialPlayerFormState(
  maxForm: number = DEFAULT_PLAYER_MAX_FORM,
): TutorialPlayerFormState {
  const normalizedMaxForm =
    Number.isFinite(maxForm) && maxForm > 0 ? Math.floor(maxForm) : DEFAULT_PLAYER_MAX_FORM

  return {
    current: normalizedMaxForm,
    max: normalizedMaxForm,
  }
}

export function normalizeTutorialPlayerFormState(
  playerForm: Partial<TutorialPlayerFormState> | undefined,
): TutorialPlayerFormState {
  const max = clampPositiveInteger(playerForm?.max, DEFAULT_PLAYER_MAX_FORM)
  const current = clampInteger(playerForm?.current, max, max)

  return {
    current,
    max,
  }
}

export function restoreTutorialPlayerForm(
  playerForm: TutorialPlayerFormState,
  amount: number,
): {
  readonly playerForm: TutorialPlayerFormState
  readonly restored: number
} {
  const normalized = normalizeTutorialPlayerFormState(playerForm)
  const nextCurrent = Math.min(normalized.max, normalized.current + Math.max(0, amount))

  return {
    playerForm: {
      ...normalized,
      current: nextCurrent,
    },
    restored: nextCurrent - normalized.current,
  }
}

export function increaseTutorialPlayerMaxForm(
  playerForm: TutorialPlayerFormState,
  amount: number,
): TutorialPlayerFormState {
  const normalized = normalizeTutorialPlayerFormState(playerForm)
  const bonus = Math.max(0, amount)

  return {
    current: normalized.current + bonus,
    max: normalized.max + bonus,
  }
}

function clampPositiveInteger(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.floor(value))
}

function clampInteger(value: number | undefined, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(0, Math.min(max, Math.floor(value)))
}
