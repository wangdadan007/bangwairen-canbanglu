import { appendLog } from '../log/actionLog'
import type { CombatState, EnemyState, VictorySettlement } from '../../types'

export function settleVictoryIfNeeded(state: CombatState): CombatState {
  let nextState = logNewEnemySettlements(state)
  const allEnemiesDefeated =
    nextState.enemies.length > 0 && nextState.enemies.every((enemy) => enemy.currentForm <= 0)

  if (!allEnemiesDefeated || nextState.result.status !== 'ongoing') {
    return nextState
  }

  const decisiveEnemy = selectDecisiveEnemy(nextState.enemies)
  const settlement = getEnemySettlement(decisiveEnemy)

  nextState = clearLinzhaoAfterBattle(nextState)
  nextState = {
    ...nextState,
    phase: 'victory',
    result: {
      status: 'victory',
      settlement,
      enemyInstanceId: decisiveEnemy.instanceId,
    },
  }

  return appendLog(nextState, {
    type: 'VICTORY_SETTLED',
    sourceId: decisiveEnemy.instanceId,
    payload: {
      settlement,
      defeatedEnemyInstanceIds: nextState.enemies.map((enemy) => enemy.instanceId),
      enemyCount: nextState.enemies.length,
    },
  })
}

function clearLinzhaoAfterBattle(state: CombatState): CombatState {
  if (state.linzhao.length === 0 && !state.pendingLinzhaoBreakShapeBonus) {
    return state
  }

  return appendLog(
    {
      ...state,
      linzhao: [],
      pendingLinzhaoBreakShapeBonus: undefined,
    },
    {
      type: 'LINZHAO_CLEARED',
      sourceId: 'system',
      payload: {
        count: state.linzhao.length,
      },
    },
  )
}

function logNewEnemySettlements(state: CombatState): CombatState {
  const settledEnemyIds = new Set(
    state.actionLog
      .filter((entry) => entry.type === 'ENEMY_SETTLED' && typeof entry.targetId === 'string')
      .map((entry) => entry.targetId as string),
  )
  let nextState = state

  for (const enemy of state.enemies) {
    if (enemy.currentForm > 0 || settledEnemyIds.has(enemy.instanceId)) {
      continue
    }

    nextState = appendLog(nextState, {
      type: 'ENEMY_SETTLED',
      sourceId: enemy.instanceId,
      targetId: enemy.instanceId,
      payload: {
        settlement: getEnemySettlement(enemy),
      },
    })
  }

  return nextState
}

function selectDecisiveEnemy(enemies: readonly EnemyState[]): EnemyState {
  return enemies[0] ?? enemies.find((enemy) => enemy.currentForm <= 0)!
}

function getEnemySettlement(enemy: EnemyState): VictorySettlement {
  return enemy.isNamed ? 'catalogue' : 'vanquish'
}
