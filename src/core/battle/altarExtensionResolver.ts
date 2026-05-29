import { appendLog } from '../log/actionLog'
import type { AltarId, AltarSlot, CombatState, GameEntityId } from '../../types'

interface AltarExtensionResult {
  readonly state: CombatState
  readonly altarId?: AltarId
  readonly altarSlot?: AltarSlot
  readonly remainingTriggers?: number
}

const PLAYER_TURN_ALTAR_ORDER: readonly AltarSlot[] = ['human', 'earth', 'heaven']
const FALLBACK_ALTAR_ORDER: readonly AltarSlot[] = ['human', 'earth', 'heaven']

export function extendNextAltarForDiscernment(
  state: CombatState,
  sourceId: GameEntityId,
): AltarExtensionResult {
  const altar = selectNextAltar(state)

  if (!altar) {
    return { state }
  }

  if (
    state.actionLog.some(
      (entry) =>
        entry.turn === state.turn &&
        entry.type === 'ALTAR_EXTENDED' &&
        entry.payload.altarId === altar.id &&
        entry.payload.result === 'discerned_current_intent',
    )
  ) {
    return {
      state,
      altarId: altar.id,
      altarSlot: altar.slot,
      remainingTriggers: getRemainingTriggers(altar),
    }
  }

  const remainingTriggers = getRemainingTriggers(altar) + 1
  const nextState: CombatState = {
    ...state,
    altars: state.altars.map((candidate) =>
      candidate.id === altar.id
        ? {
            ...candidate,
            remainingTriggers,
          }
        : candidate,
    ),
  }

  return {
    state: appendLog(nextState, {
      type: 'ALTAR_EXTENDED',
      sourceId,
      targetId: altar.targetEnemyInstanceId,
      payload: {
        altarId: altar.id,
        slot: altar.slot,
        result: 'discerned_current_intent',
        remainingTriggers,
      },
    }),
    altarId: altar.id,
    altarSlot: altar.slot,
    remainingTriggers,
  }
}

export function consumeAltarTrigger(
  state: CombatState,
  altarId: AltarId,
  reason: string,
): CombatState | undefined {
  const altar = state.altars.find((candidate) => candidate.id === altarId)

  if (!altar) {
    return undefined
  }

  const remainingTriggers = getRemainingTriggers(altar)

  if (remainingTriggers <= 1) {
    return undefined
  }

  const nextRemainingTriggers = remainingTriggers - 1
  const nextState: CombatState = {
    ...state,
    altars: state.altars.map((candidate) =>
      candidate.id === altar.id
        ? {
            ...candidate,
            remainingTriggers: nextRemainingTriggers,
          }
        : candidate,
    ),
  }

  return appendLog(nextState, {
    type: 'ALTAR_EXTENDED',
    sourceId: altar.id,
    targetId: altar.targetEnemyInstanceId,
    payload: {
      altarId: altar.id,
      slot: altar.slot,
      result: 'continued_after_trigger',
      reason,
      remainingTriggers: nextRemainingTriggers,
    },
  })
}

function selectNextAltar(state: CombatState) {
  const slotOrder =
    state.phase === 'player_turn' ? PLAYER_TURN_ALTAR_ORDER : FALLBACK_ALTAR_ORDER

  for (const slot of slotOrder) {
    const altar = state.altars.find((candidate) => candidate.slot === slot)

    if (altar) {
      return altar
    }
  }

  return undefined
}

function getRemainingTriggers(altar: { readonly remainingTriggers?: number }) {
  return Math.max(1, altar.remainingTriggers ?? 1)
}
