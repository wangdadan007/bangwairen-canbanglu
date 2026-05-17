import { appendLog } from '../log/actionLog'
import type { CombatState } from '../../types'

export function settleVictoryIfNeeded(state: CombatState): CombatState {
  const defeatedEnemy = state.enemies.find((enemy) => enemy.currentForm <= 0)

  if (!defeatedEnemy || state.result.status !== 'ongoing') {
    return state
  }

  const settlement = defeatedEnemy.isNamed ? 'catalogue' : 'vanquish'
  const nextState: CombatState = {
    ...state,
    phase: 'victory',
    result: {
      status: 'victory',
      settlement,
      enemyInstanceId: defeatedEnemy.instanceId,
    },
  }

  return appendLog(nextState, {
    type: 'VICTORY_SETTLED',
    sourceId: defeatedEnemy.instanceId,
    payload: {
      settlement,
    },
  })
}
