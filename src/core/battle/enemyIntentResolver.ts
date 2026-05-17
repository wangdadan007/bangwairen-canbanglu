import { appendLog } from '../log/actionLog'
import { triggerEarthAltars } from './altarResolver'
import type {
  AbnormalMoveDefinition,
  CardInstance,
  CombatState,
  EnemyDefinition,
  EnemyIntentDefinition,
  EnemyState,
} from '../../types'

const FOULED_SCROLL_CARD_ID = 'card_fouled_scroll'

export function executeEnemyTurn(
  state: CombatState,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  let nextState: CombatState = {
    ...state,
    phase: 'enemy_turn',
  }

  nextState = triggerEarthAltars(nextState)

  for (const enemy of nextState.enemies) {
    if (enemy.currentForm <= 0) {
      continue
    }

    nextState = executeEnemyIntent(nextState, enemy, enemyDefinitions)
  }

  return nextState
}

function executeEnemyIntent(
  state: CombatState,
  enemy: EnemyState,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  if (!enemy.currentIntent) {
    return state
  }

  let nextState = state

  for (const effect of enemy.currentIntent.effects) {
    if (effect.type === 'INCOMING_FORCE') {
      const amount = enemy.incomingForce
      nextState = appendLog(nextState, {
        type: 'INCOMING_FORCE_CREATED',
        sourceId: enemy.instanceId,
        targetId: 'player',
        payload: {
          intentId: enemy.currentIntent.id,
          amount,
          baseAmount: effect.amount,
        },
      })
    }

    if (effect.type === 'ABNORMAL_MOVE') {
      nextState = executeAbnormalMove(nextState, enemy, enemy.currentIntent.id, effect.move)
    }
  }

  return advanceEnemyIntent(nextState, enemy, enemyDefinitions)
}

function executeAbnormalMove(
  state: CombatState,
  enemy: EnemyState,
  intentId: string,
  move: AbnormalMoveDefinition,
): CombatState {
  if (enemy.blockedAbnormalMoveTypes.includes(move.type)) {
    return appendLog(state, {
      type: 'ABNORMAL_MOVE_COUNTERED',
      sourceId: enemy.instanceId,
      targetId: 'player',
      payload: {
        intentId,
        moveType: move.type,
        result: 'prevented',
      },
    })
  }

  let nextState = state
  let resultPayload = {}

  if (move.type === 'steal_incense') {
    nextState = {
      ...nextState,
      nextTurnIncensePenalty: nextState.nextTurnIncensePenalty + (move.amount ?? 1),
    }
    resultPayload = {
      nextTurnIncensePenalty: nextState.nextTurnIncensePenalty,
    }
  }

  if (move.type === 'add_fouled_scroll') {
    const addedCards = createFouledScrollCards(nextState, move.amount ?? 1)
    nextState = {
      ...nextState,
      discardPile: [...nextState.discardPile, ...addedCards],
    }
    resultPayload = {
      addedCardDefinitionId: FOULED_SCROLL_CARD_ID,
      addedCardCount: addedCards.length,
      discardPileCount: nextState.discardPile.length,
    }
  }

  if (move.type === 'cover_name') {
    const { state: coveredState, coveredSlotIndex } = coverOneRevealedNameSlot(nextState, enemy)
    nextState = coveredState
    resultPayload = {
      coveredSlotIndex,
    }
  }

  if (move.type === 'heal_form') {
    const healAmount = move.amount ?? 1
    const nextCurrentForm = Math.min(enemy.maxForm, enemy.currentForm + healAmount)
    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((candidate) =>
        candidate.instanceId === enemy.instanceId
          ? {
              ...candidate,
              currentForm: nextCurrentForm,
            }
          : candidate,
      ),
    }
    resultPayload = {
      healedAmount: nextCurrentForm - enemy.currentForm,
      currentForm: nextCurrentForm,
    }
  }

  return appendLog(nextState, {
    type: 'ABNORMAL_MOVE_EXECUTED',
    sourceId: enemy.instanceId,
    targetId: 'player',
    payload: {
      intentId,
      moveType: move.type,
      amount: move.amount ?? null,
      ...resultPayload,
    },
  })
}

function createFouledScrollCards(
  state: CombatState,
  count: number,
): readonly CardInstance[] {
  return Array.from({ length: count }, (_, index) => ({
    instanceId: `temporary_card_instance_${state.turn}_${state.actionLog.length}_${index + 1}_${FOULED_SCROLL_CARD_ID}`,
    definitionId: FOULED_SCROLL_CARD_ID,
    owner: 'player',
    isTemporary: true,
    annotations: [],
  }))
}

function coverOneRevealedNameSlot(
  state: CombatState,
  enemy: EnemyState,
): {
  readonly state: CombatState
  readonly coveredSlotIndex: number | null
} {
  const currentEnemy = state.enemies.find((candidate) => candidate.instanceId === enemy.instanceId)

  if (!currentEnemy || currentEnemy.isNamed) {
    return {
      state,
      coveredSlotIndex: null,
    }
  }

  const revealedSlot = currentEnemy.nameSlots
    .slice()
    .reverse()
    .find((slot) => slot.isRevealed)

  if (!revealedSlot) {
    return {
      state,
      coveredSlotIndex: null,
    }
  }

  return {
    state: {
      ...state,
      enemies: state.enemies.map((candidate) =>
        candidate.instanceId === currentEnemy.instanceId
          ? {
              ...candidate,
              nameSlots: candidate.nameSlots.map((slot) =>
                slot.index === revealedSlot.index
                  ? {
                      ...slot,
                      isRevealed: false,
                    }
                  : slot,
              ),
            }
          : candidate,
      ),
    },
    coveredSlotIndex: revealedSlot.index,
  }
}

function advanceEnemyIntent(
  state: CombatState,
  enemy: EnemyState,
  enemyDefinitions: readonly EnemyDefinition[],
): CombatState {
  const definition = enemyDefinitions.find((candidate) => candidate.id === enemy.definitionId)

  if (!definition || definition.intents.length === 0) {
    return state
  }

  const nextIntentIndex = (enemy.intentIndex + 1) % definition.intents.length
  const nextIntent = definition.intents[nextIntentIndex]
  const enemies = state.enemies.map((candidate) =>
    candidate.instanceId === enemy.instanceId
      ? {
          ...candidate,
          intentIndex: nextIntentIndex,
          currentIntent: nextIntent,
          incomingForce: getIncomingForce(nextIntent),
          blockedAbnormalMoveTypes: [],
        }
      : candidate,
  )

  return {
    ...state,
    enemies,
  }
}

function getIncomingForce(intent: EnemyIntentDefinition | undefined): number {
  if (!intent) {
    return 0
  }

  return intent.effects.reduce(
    (total, effect) => total + (effect.type === 'INCOMING_FORCE' ? effect.amount : 0),
    0,
  )
}
