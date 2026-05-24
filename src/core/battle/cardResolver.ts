import { appendLog } from '../log/actionLog'
import { applyTutorialResourceDelta } from '../run/resourceResolver'
import { placeAltar } from './altarResolver'
import { triggerArtifactsAfterBreakShapeCardPlayed } from './artifactBattleResolver'
import { drawCards } from './drawResolver'
import {
  getLinzhaoPlayBlockReason,
  isLinzhaoCardDefinition,
  MAX_ACTIVE_LINZHAO,
  placeLinzhao,
  triggerLinzhaoAfterCardAnnotationTriggered,
  triggerLinzhaoAfterIncomingForceSealed,
} from './linzhaoResolver'
import { resolveAskName } from './nameResolver'
import { breakEnemyForm, selectEnemyTargets } from './shapeResolver'
import {
  applyFireMark,
  applyThunderLead,
  triggerFireMark,
} from './shapeStatusResolver'
import { settleVictoryIfNeeded } from './victoryResolver'
import type {
  CardDefinition,
  CardAnnotation,
  CardEffect,
  CardInstance,
  CombatState,
  CounterAbnormalMoveEffect,
  EnemyInstanceId,
  SealMomentumEffect,
} from '../../types'

export interface ResolveCardInput {
  readonly cardInstanceId: string
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly cardDefinitions: readonly CardDefinition[]
}

export function resolvePlayCard(state: CombatState, input: ResolveCardInput): CombatState {
  if (state.phase !== 'player_turn' || state.result.status !== 'ongoing') {
    return state
  }

  const card = state.hand.find((candidate) => candidate.instanceId === input.cardInstanceId)

  if (!card) {
    return appendLog(state, {
      type: 'CARD_PLAY_REJECTED',
      sourceId: 'player',
      payload: {
        reason: 'card_not_in_hand',
        cardInstanceId: input.cardInstanceId,
      },
    })
  }

  const cardDefinition = input.cardDefinitions.find(
    (candidate) => candidate.id === card.definitionId,
  )

  if (!cardDefinition) {
    throw new Error(`Missing card definition: ${card.definitionId}`)
  }

  if (state.player.incense < cardDefinition.cost) {
    return appendLog(state, {
      type: 'CARD_PLAY_REJECTED',
      sourceId: card.instanceId,
      payload: {
        reason: 'not_enough_incense',
        requiredIncense: cardDefinition.cost,
        currentIncense: state.player.incense,
      },
    })
  }

  const linzhaoBlockReason = getLinzhaoPlayBlockReason(state, cardDefinition)

  if (linzhaoBlockReason) {
    return appendLog(state, {
      type: 'CARD_PLAY_REJECTED',
      sourceId: card.instanceId,
      payload: {
        reason: linzhaoBlockReason,
        cardDefinitionId: cardDefinition.id,
        limit: MAX_ACTIVE_LINZHAO,
      },
    })
  }

  let nextState: CombatState = {
    ...state,
    player: {
      ...state.player,
      incense: state.player.incense - cardDefinition.cost,
    },
  }

  nextState = appendLog(nextState, {
    type: 'INCENSE_SPENT',
    sourceId: card.instanceId,
    payload: {
      amount: cardDefinition.cost,
      currentIncense: nextState.player.incense,
    },
  })

  nextState = appendLog(nextState, {
    type: 'CARD_PLAYED',
    sourceId: card.instanceId,
    targetId: input.targetEnemyInstanceId,
    payload: {
      cardDefinitionId: cardDefinition.id,
      cost: cardDefinition.cost,
      annotationIds: card.annotations.map((annotation) => annotation.id),
    },
  })

  nextState = triggerArtifactsAfterBreakShapeCardPlayed(nextState, input.cardDefinitions)
  nextState = removeCardFromHand(nextState, card.instanceId)
  nextState = resolveCardEffects(nextState, card, cardDefinition, input.targetEnemyInstanceId)
  nextState = movePlayedCard(nextState, card, cardDefinition)

  return settleVictoryIfNeeded(nextState)
}

function resolveCardEffects(
  state: CombatState,
  card: CardInstance,
  cardDefinition: CardDefinition,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  let nextState = state

  for (const effect of cardDefinition.effects) {
    if (!isEffectConditionMet(nextState, effect, targetEnemyInstanceId)) {
      continue
    }

    nextState = resolveCardEffect(nextState, card, effect, targetEnemyInstanceId)
  }

  for (const annotation of card.annotations) {
    nextState = resolveCardAnnotation(nextState, card, annotation, targetEnemyInstanceId)
  }

  return nextState
}

function resolveCardAnnotation(
  state: CombatState,
  card: CardInstance,
  annotation: CardAnnotation,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  let nextState = appendLog(state, {
    type: 'CARD_ANNOTATION_TRIGGERED',
    sourceId: card.instanceId,
    targetId: targetEnemyInstanceId,
    payload: {
      annotationId: annotation.id,
      nameKey: annotation.nameKey,
    },
  })

  for (const effect of annotation.effects) {
    if (!isEffectConditionMet(nextState, effect, targetEnemyInstanceId)) {
      continue
    }

    nextState = resolveCardEffect(nextState, card, effect, targetEnemyInstanceId)
  }

  return triggerLinzhaoAfterCardAnnotationTriggered(nextState, {
    targetEnemyInstanceId,
  })
}

function resolveCardEffect(
  state: CombatState,
  card: CardInstance,
  effect: CardEffect,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  if (effect.type === 'BREAK_SHAPE') {
    return breakEnemyForm(
      state,
      {
        sourceId: card.instanceId,
        targetEnemyInstanceId,
        amount: effect.amount,
        targetType: effect.target,
        targetFilter: effect.targetFilter,
      },
    )
  }

  if (effect.type === 'APPLY_FIRE_MARK') {
    return applyFireMark(state, {
      sourceId: card.instanceId,
      targetEnemyInstanceId,
      amount: effect.amount,
      targetType: effect.target,
    })
  }

  if (effect.type === 'TRIGGER_FIRE_MARK') {
    return triggerFireMark(state, {
      sourceId: card.instanceId,
      targetEnemyInstanceId,
      targetType: effect.target,
    })
  }

  if (effect.type === 'APPLY_THUNDER_LEAD') {
    return applyThunderLead(state, {
      sourceId: card.instanceId,
      targetEnemyInstanceId,
      amount: effect.amount,
      targetType: effect.target,
    })
  }

  if (effect.type === 'DRAW') {
    return drawCards(state, effect.count)
  }

  if (effect.type === 'GAIN_INCENSE') {
    const nextState = {
      ...state,
      player: {
        ...state.player,
        incense: state.player.incense + effect.amount,
      },
    }

    return appendLog(nextState, {
      type: 'INCENSE_GAINED',
      sourceId: card.instanceId,
      targetId: 'player',
      payload: {
        amount: effect.amount,
        currentIncense: nextState.player.incense,
      },
    })
  }

  if (effect.type === 'GAIN_INK') {
    const nextResources = applyTutorialResourceDelta(state.resources, {
      ink: effect.amount,
    })
    const nextState = {
      ...state,
      resources: nextResources,
    }

    return appendLog(nextState, {
      type: 'INK_GAINED',
      sourceId: card.instanceId,
      targetId: 'player',
      payload: {
        amount: effect.amount,
        currentInk: nextResources.ink,
      },
    })
  }

  if (effect.type === 'GAIN_DOOM') {
    const nextResources = applyTutorialResourceDelta(state.resources, {
      doom: effect.amount,
    })
    const nextState = {
      ...state,
      resources: nextResources,
    }

    return appendLog(nextState, {
      type: 'DOOM_GAINED',
      sourceId: card.instanceId,
      targetId: 'player',
      payload: {
        amount: effect.amount,
        currentDoom: nextResources.doom,
      },
    })
  }

  if (effect.type === 'SEAL_MOMENTUM') {
    return sealIncomingForce(state, card, effect, targetEnemyInstanceId)
  }

  if (effect.type === 'COUNTER_ABNORMAL_MOVE') {
    return counterAbnormalMove(state, card, effect, targetEnemyInstanceId)
  }

  if (effect.type === 'PLACE_ALTAR') {
    return placeAltar(state, {
      card,
      effect,
      targetEnemyInstanceId,
    })
  }

  if (effect.type === 'PLACE_LINZHAO') {
    return placeLinzhao(state, card, effect)
  }

  if (effect.type === 'ASK_NAME') {
    return resolveAskName(state, {
      sourceId: card.instanceId,
      targetEnemyInstanceId,
      amount: effect.amount,
    })
  }

  return state
}

function sealIncomingForce(
  state: CombatState,
  card: CardInstance,
  effect: SealMomentumEffect,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  const targets = selectEnemyTargets(state.enemies, targetEnemyInstanceId, effect.target)
  let nextState = state

  for (const target of targets) {
    const nextIncomingForce = Math.max(0, target.incomingForce - effect.amount)
    const sealedAmount = target.incomingForce - nextIncomingForce

    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              incomingForce: nextIncomingForce,
            }
          : enemy,
      ),
    }

    nextState = appendLog(nextState, {
      type: 'INCOMING_FORCE_SEALED',
      sourceId: card.instanceId,
      targetId: target.instanceId,
      payload: {
        requestedAmount: effect.amount,
        amount: sealedAmount,
        remainingIncomingForce: nextIncomingForce,
      },
    })

    nextState = triggerLinzhaoAfterIncomingForceSealed(nextState, {
      targetEnemyInstanceId: target.instanceId,
      sealedAmount,
      remainingIncomingForce: nextIncomingForce,
    })
  }

  return nextState
}

function counterAbnormalMove(
  state: CombatState,
  card: CardInstance,
  effect: CounterAbnormalMoveEffect,
  targetEnemyInstanceId?: EnemyInstanceId,
): CombatState {
  const targets = selectEnemyTargets(state.enemies, targetEnemyInstanceId, effect.target)
  let nextState = state

  for (const target of targets) {
    const nextBlockedMoveTypes = target.blockedAbnormalMoveTypes.includes(effect.moveType ?? 'custom')
      ? target.blockedAbnormalMoveTypes
      : [...target.blockedAbnormalMoveTypes, effect.moveType ?? 'custom']

    nextState = {
      ...nextState,
      enemies: nextState.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              blockedAbnormalMoveTypes: nextBlockedMoveTypes,
            }
          : enemy,
      ),
    }

    nextState = appendLog(nextState, {
      type: 'ABNORMAL_MOVE_COUNTERED',
      sourceId: card.instanceId,
      targetId: target.instanceId,
      payload: {
        moveType: effect.moveType ?? 'custom',
        result: 'prepared',
      },
    })
  }

  return nextState
}

function isEffectConditionMet(
  state: CombatState,
  effect: CardEffect,
  targetEnemyInstanceId?: EnemyInstanceId,
) {
  if (!effect.condition) {
    return true
  }

  const target = selectEnemyTargets(state.enemies, targetEnemyInstanceId)[0]

  if (effect.condition.type === 'TARGET_HAS_REVEALED_NAME_SLOT') {
    return Boolean(target?.nameSlots.some((slot) => slot.isRevealed))
  }

  if (effect.condition.type === 'TARGET_HAS_NO_NAME_SLOT') {
    return Boolean(target && target.nameSlots.length === 0)
  }

  if (effect.condition.type === 'TARGET_IS_NAMED') {
    return Boolean(target?.isNamed)
  }

  if (effect.condition.type === 'THIS_TURN_NAMED_ENEMY') {
    return state.actionLog.some(
      (entry) => entry.turn === state.turn && entry.type === 'ENEMY_NAMED',
    )
  }

  if (effect.condition.type === 'THIS_TURN_COUNTERED_ABNORMAL_MOVE') {
    return state.actionLog.some(
      (entry) => entry.turn === state.turn && entry.type === 'ABNORMAL_MOVE_COUNTERED',
    )
  }

  if (effect.condition.type === 'THIS_TURN_PLACED_ALTAR') {
    return state.actionLog.some(
      (entry) => entry.turn === state.turn && entry.type === 'ALTAR_PLACED',
    )
  }

  return false
}

function removeCardFromHand(state: CombatState, cardInstanceId: string): CombatState {
  return {
    ...state,
    hand: state.hand.filter((card) => card.instanceId !== cardInstanceId),
  }
}

function movePlayedCard(
  state: CombatState,
  card: CardInstance,
  cardDefinition: CardDefinition,
): CombatState {
  const shouldExhaust =
    card.isTemporary || cardDefinition.type === 'temporary' || cardDefinition.tags.includes('exhaust')

  if (isLinzhaoCardDefinition(cardDefinition)) {
    return {
      ...state,
      linzhaoPile: [...state.linzhaoPile, card],
    }
  }

  const nextState = shouldExhaust
    ? {
        ...state,
        exhaustPile: [...state.exhaustPile, card],
      }
    : {
        ...state,
        discardPile: [...state.discardPile, card],
      }

  return appendLog(nextState, {
    type: shouldExhaust ? 'CARD_EXHAUSTED' : 'CARD_DISCARDED',
    sourceId: card.instanceId,
    payload: {
      cardDefinitionId: card.definitionId,
    },
  })
}
