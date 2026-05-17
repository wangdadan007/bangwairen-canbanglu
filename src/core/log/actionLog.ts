import type {
  ActionLogEntry,
  ActionLogPayload,
  ActionLogType,
  CombatState,
} from '../../types'
import type { GameEntityId } from '../../types'

export interface LogInput {
  readonly type: ActionLogType
  readonly sourceId?: GameEntityId
  readonly targetId?: GameEntityId
  readonly payload?: ActionLogPayload
}

export function appendLog(state: CombatState, input: LogInput): CombatState {
  const sequence = state.actionLog.length + 1
  const entry: ActionLogEntry = {
    id: `log_${sequence.toString().padStart(6, '0')}`,
    sequence,
    type: input.type,
    turn: state.turn,
    phase: state.phase,
    sourceId: input.sourceId,
    targetId: input.targetId,
    payload: input.payload ?? {},
  }

  return {
    ...state,
    actionLog: [...state.actionLog, entry],
  }
}
