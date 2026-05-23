import { appendLog } from '../log/actionLog'
import { consumePendingBreakShapeBonus } from './artifactBattleResolver'
import { consumePendingRegisterBreakShapeBonus } from './registerBattleResolver'
import type {
  CombatState,
  EffectTargetFilter,
  EnemyInstanceId,
  EnemyState,
  GameEntityId,
} from '../../types'

export interface BreakEnemyFormInput {
  readonly sourceId: GameEntityId
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly amount: number
  readonly targetType?: 'selected_enemy' | 'all_enemies' | 'random_enemy'
  readonly targetFilter?: EffectTargetFilter
  readonly consumeBreakShapeBonuses?: boolean
  readonly logFormBroken?: boolean
}

export function breakEnemyForm(state: CombatState, input: BreakEnemyFormInput): CombatState {
  const targets = selectEnemyTargets(
    state.enemies,
    input.targetEnemyInstanceId,
    input.targetType,
    input.targetFilter,
  )
  let nextState = state

  for (const selectedTarget of targets) {
    const target = findEnemy(nextState, selectedTarget.instanceId)

    if (!target) {
      continue
    }

    let breakAmount = input.amount

    if (input.consumeBreakShapeBonuses !== false && nextState.pendingArtifactBreakShapeBonus) {
      const consumedBonus = consumePendingBreakShapeBonus(nextState, target.instanceId)
      nextState = consumedBonus.state
      breakAmount += consumedBonus.bonusAmount
    }

    if (input.consumeBreakShapeBonuses !== false && nextState.pendingRegisterBreakShapeBonus) {
      const consumedBonus = consumePendingRegisterBreakShapeBonus(nextState, target.instanceId)
      nextState = consumedBonus.state
      breakAmount += consumedBonus.bonusAmount
    }

    const nextCurrentForm = Math.max(0, target.currentForm - breakAmount)
    const brokenAmount = target.currentForm - nextCurrentForm

    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              currentForm: nextCurrentForm,
            }
          : enemy,
      ),
    }

    if (input.logFormBroken !== false) {
      nextState = appendLog(nextState, {
        type: 'FORM_BROKEN',
        sourceId: input.sourceId,
        targetId: target.instanceId,
        payload: {
          amount: brokenAmount,
          currentForm: nextCurrentForm,
        },
      })
    }
  }

  return nextState
}

export function selectEnemyTargets(
  enemies: readonly EnemyState[],
  targetEnemyInstanceId?: EnemyInstanceId,
  targetType: 'selected_enemy' | 'all_enemies' | 'random_enemy' = 'selected_enemy',
  targetFilter?: EffectTargetFilter,
): readonly EnemyState[] {
  const livingEnemies = enemies.filter((enemy) => enemy.currentForm > 0)
  const filteredEnemies = targetFilter
    ? livingEnemies.filter((enemy) => isEnemyTargetFilterMatched(enemy, targetFilter))
    : livingEnemies

  if (targetType === 'all_enemies') {
    return filteredEnemies
  }

  if (targetEnemyInstanceId) {
    const selectedEnemy = filteredEnemies.find((enemy) => enemy.instanceId === targetEnemyInstanceId)

    if (selectedEnemy) {
      return [selectedEnemy]
    }
  }

  const firstLivingEnemy = filteredEnemies[0]
  return firstLivingEnemy ? [firstLivingEnemy] : []
}

function findEnemy(state: CombatState, enemyInstanceId: EnemyInstanceId) {
  return state.enemies.find((enemy) => enemy.instanceId === enemyInstanceId)
}

function isEnemyTargetFilterMatched(enemy: EnemyState, targetFilter: EffectTargetFilter): boolean {
  if (targetFilter === 'nameless') {
    return enemy.nameSlots.length === 0
  }

  return true
}
