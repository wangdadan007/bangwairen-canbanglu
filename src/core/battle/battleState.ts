import { appendLog } from '../log/actionLog'
import { createInitialArtifactCollection, type ArtifactBacklashRecord } from '../run/artifactResolver'
import { createInitialTutorialResourceState } from '../run/resourceResolver'
import { startPlayerTurn } from './turnFlow'
import type {
  ArtifactCollectionState,
  CardDefinition,
  CardId,
  CardInstance,
  CombatState,
  EnemyDefinition,
  EnemyIntentDefinition,
  EnemyState,
  RunDeckCard,
  TutorialResourceState,
  UnlockState,
} from '../../types'

export const DEFAULT_MAX_INCENSE = 3
export const DEFAULT_HAND_DRAW = 5

export const DEFAULT_STARTER_DECK_IDS: readonly CardId[] = [
  'card_guard_desk_talisman',
  'card_cut_supply_talisman',
  'card_zhu_fu',
  'card_zhu_fu',
  'card_zhu_fu',
  'card_zhu_fu',
  'card_guard_desk_talisman',
  'card_ask_name',
  'card_ask_name',
  'card_mark_forehead',
  'card_order_scroll',
  'card_quiet_incense',
]

export interface CreateBattleStateInput {
  readonly cardDefinitions: readonly CardDefinition[]
  readonly enemyDefinition: EnemyDefinition
  readonly deckDefinitionIds?: readonly CardId[]
  readonly deckCards?: readonly RunDeckCard[]
  readonly maxIncenseBonus?: number
  readonly resources?: TutorialResourceState
  readonly temporaryResourceDelta?: TutorialResourceState
  readonly artifacts?: ArtifactCollectionState
  readonly extraHandDefinitionIds?: readonly CardId[]
  readonly artifactBacklashRecords?: readonly ArtifactBacklashRecord[]
  readonly unlocks?: UnlockState
}

export function createInitialBattleState(input: CreateBattleStateInput): CombatState {
  const deckDefinitionIds = input.deckDefinitionIds ?? DEFAULT_STARTER_DECK_IDS
  const deckCards = input.deckCards
  const extraHandDefinitionIds = input.extraHandDefinitionIds ?? []
  assertDeckDefinitionsExist(
    [
      ...(deckCards ? deckCards.map((card) => card.definitionId) : deckDefinitionIds),
      ...extraHandDefinitionIds,
    ],
    input.cardDefinitions,
  )

  const deck = deckCards
    ? createCardInstancesFromRunDeck(deckCards)
    : createCardInstances(deckDefinitionIds)
  const extraHandCards = createTemporaryCardInstances(extraHandDefinitionIds)
  const enemy = createEnemyState(input.enemyDefinition, 0)
  const maxIncense = DEFAULT_MAX_INCENSE + (input.maxIncenseBonus ?? 0)

  let state: CombatState = {
    turn: 1,
    phase: 'setup',
    player: {
      incense: 0,
      maxIncense,
      deck,
      unlocks: input.unlocks ?? {
        stages: ['stage_core'],
        keywords: ['break_form', 'ask_name', 'seal_momentum', 'draw', 'gain_incense'],
      },
    },
    enemies: [enemy],
    drawPile: deck,
    hand: extraHandCards,
    discardPile: [],
    exhaustPile: [],
    nextTurnIncensePenalty: 0,
    resources: input.resources ?? createInitialTutorialResourceState(),
    temporaryResourceDelta: input.temporaryResourceDelta ?? createInitialTutorialResourceState(),
    altars: [],
    artifacts: input.artifacts ?? createInitialArtifactCollection(),
    triggeredArtifactIds: [],
    actionLog: [],
    result: {
      status: 'ongoing',
    },
  }

  state = appendLog(state, {
    type: 'BATTLE_STARTED',
    sourceId: 'system',
    targetId: enemy.instanceId,
    payload: {
      enemyDefinitionId: input.enemyDefinition.id,
      deckSize: deck.length,
    },
  })

  for (const backlashRecord of input.artifactBacklashRecords ?? []) {
    state = appendLog(state, {
      type: 'ARTIFACT_BACKLASH_TRIGGERED',
      sourceId: backlashRecord.artifactId,
      payload: {
        effectType: backlashRecord.effectType,
        amount: backlashRecord.amount ?? null,
        cardDefinitionId: backlashRecord.cardDefinitionId ?? null,
        fractureDelta: backlashRecord.fractureDelta ?? null,
      },
    })
  }

  return startPlayerTurn(state, DEFAULT_HAND_DRAW)
}

export function createCardInstances(deckDefinitionIds: readonly CardId[]): readonly CardInstance[] {
  return deckDefinitionIds.map((definitionId, index) => ({
    instanceId: `card_instance_${(index + 1).toString().padStart(3, '0')}_${definitionId}`,
    definitionId,
    owner: 'player',
    isTemporary: false,
    annotations: [],
  }))
}

export function createCardInstancesFromRunDeck(
  deckCards: readonly RunDeckCard[],
): readonly CardInstance[] {
  return deckCards.map((card, index) => ({
    instanceId: `card_instance_${(index + 1).toString().padStart(3, '0')}_${card.id}`,
    definitionId: card.definitionId,
    owner: 'player',
    isTemporary: false,
    annotations: card.annotations,
  }))
}

export function createTemporaryCardInstances(
  deckDefinitionIds: readonly CardId[],
): readonly CardInstance[] {
  return deckDefinitionIds.map((definitionId, index) => ({
    instanceId: `temporary_card_instance_${(index + 1).toString().padStart(3, '0')}_${definitionId}`,
    definitionId,
    owner: 'player',
    isTemporary: true,
    annotations: [],
  }))
}

export function createEnemyState(definition: EnemyDefinition, index: number): EnemyState {
  const nameSlots = Array.from({ length: definition.nameSlots }, (_, slotIndex) => {
    const slotDefinition = definition.nameSlotDefinitions?.find((slot) => slot.index === slotIndex)

    return {
      index: slotIndex,
      nameKey: slotDefinition?.nameKey,
      isRevealed: false,
    }
  })

  return {
    instanceId: `enemy_instance_${(index + 1).toString().padStart(3, '0')}_${definition.id}`,
    definitionId: definition.id,
    maxForm: definition.maxForm,
    currentForm: definition.maxForm,
    nameSlots,
    isNamed: false,
    hasTriggeredNameBreak: false,
    intentIndex: 0,
    currentIntent: definition.intents[0],
    incomingForce: getIncomingForce(definition.intents[0]),
    blockedAbnormalMoveTypes: [],
    traits: definition.traits,
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

function assertDeckDefinitionsExist(
  deckDefinitionIds: readonly CardId[],
  cardDefinitions: readonly CardDefinition[],
) {
  const knownCardIds = new Set(cardDefinitions.map((card) => card.id))

  for (const definitionId of deckDefinitionIds) {
    if (!knownCardIds.has(definitionId)) {
      throw new Error(`Unknown card definition in starter deck: ${definitionId}`)
    }
  }
}
