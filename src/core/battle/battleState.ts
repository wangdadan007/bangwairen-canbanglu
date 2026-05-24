import { appendLog } from '../log/actionLog'
import { createInitialArtifactCollection, type ArtifactBacklashRecord } from '../run/artifactResolver'
import {
  createInitialTutorialPlayerFormState,
  normalizeTutorialPlayerFormState,
} from '../run/playerFormResolver'
import { createInitialTutorialResourceState } from '../run/resourceResolver'
import { getIncomingForceBaseAmount, resolveCurrentIncomingForces } from './incomingForceResolver'
import { startPlayerTurn } from './turnFlow'
import type {
  ArtifactCollectionState,
  CardDefinition,
  CardId,
  CardInstance,
  CombatState,
  EnemyDefinition,
  EnemyIntentMaskMode,
  EnemyMechanicChange,
  EnemyNamedPhaseState,
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
  readonly enemyDefinition?: EnemyDefinition
  readonly enemyDefinitions?: readonly EnemyDefinition[]
  readonly deckDefinitionIds?: readonly CardId[]
  readonly deckCards?: readonly RunDeckCard[]
  readonly maxIncenseBonus?: number
  readonly playerCurrentForm?: number
  readonly playerMaxForm?: number
  readonly resources?: TutorialResourceState
  readonly temporaryResourceDelta?: TutorialResourceState
  readonly temporaryPlayerFormDelta?: number
  readonly artifacts?: ArtifactCollectionState
  readonly registerEntries?: CombatState['registerEntries']
  readonly openingHandDefinitionIds?: readonly CardId[]
  readonly extraHandDefinitionIds?: readonly CardId[]
  readonly extraDrawPileDefinitionIds?: readonly CardId[]
  readonly artifactBacklashRecords?: readonly ArtifactBacklashRecord[]
  readonly unlocks?: UnlockState
  readonly initialEnemyIntentIds?: Readonly<Record<string, string>>
  readonly openingIncenseBonus?: number
  readonly openingIncensePenalty?: number
  readonly openingDrawCount?: number
  readonly openingAskNamePenalty?: number
  readonly openingRiskLogRecords?: readonly OpeningRiskLogRecord[]
}

export interface OpeningRiskLogRecord {
  readonly resource: 'doom' | 'fracture'
  readonly threshold: number
  readonly stateLabel: string
  readonly result:
    | 'record_only'
    | 'draw_penalty'
    | 'incense_penalty'
    | 'doom_ash'
    | 'elite_boss_abnormal'
    | 'fouled_scroll'
    | 'ask_name_penalty'
    | 'boss_high_fracture'
    | 'terminal_marker'
  readonly amount?: number
  readonly cardDefinitionId?: CardId
  readonly enemyDefinitionId?: string
  readonly intentId?: string
}

export function createInitialBattleState(input: CreateBattleStateInput): CombatState {
  const deckDefinitionIds = input.deckDefinitionIds ?? DEFAULT_STARTER_DECK_IDS
  const deckCards = input.deckCards
  const openingHandDefinitionIds = input.openingHandDefinitionIds ?? []
  const extraHandDefinitionIds = input.extraHandDefinitionIds ?? []
  const extraDrawPileDefinitionIds = input.extraDrawPileDefinitionIds ?? []
  assertDeckDefinitionsExist(
    [
      ...(deckCards ? deckCards.map((card) => card.definitionId) : deckDefinitionIds),
      ...openingHandDefinitionIds,
      ...extraHandDefinitionIds,
      ...extraDrawPileDefinitionIds,
    ],
    input.cardDefinitions,
  )

  const deck = deckCards
    ? createCardInstancesFromRunDeck(deckCards)
    : createCardInstances(deckDefinitionIds)
  const openingHandSelection = takeOpeningHandCards(deck, openingHandDefinitionIds)
  const extraHandCards = createTemporaryCardInstances(extraHandDefinitionIds)
  const fallbackOpeningDrawPileCards = createTemporaryCardInstances(
    openingHandSelection.missingDefinitionIds,
  )
  const extraDrawPileCards = createTemporaryCardInstances(extraDrawPileDefinitionIds)
  const enemyDefinitions = input.enemyDefinitions ?? (input.enemyDefinition ? [input.enemyDefinition] : [])
  const hiddenIntentEnemyIds = createHiddenIntentEnemyIdSet(
    enemyDefinitions,
    input.openingRiskLogRecords ?? [],
  )
  const hasIntentBacklash = (input.artifactBacklashRecords ?? []).some(
    (record) => record.effectType === 'hide_intent_before_ask_name',
  )

  if (enemyDefinitions.length === 0) {
    throw new Error('createInitialBattleState requires at least one enemy definition')
  }

  const enemies = enemyDefinitions.map((enemyDefinition, index) =>
    createEnemyState(
      enemyDefinition,
      index,
      input.initialEnemyIntentIds?.[enemyDefinition.id],
      getInitialIntentMaskMode(enemyDefinition, index, hiddenIntentEnemyIds, hasIntentBacklash),
    ),
  )
  const maxIncense = DEFAULT_MAX_INCENSE + (input.maxIncenseBonus ?? 0)
  const persistentPlayerForm = normalizeTutorialPlayerFormState(
    input.playerCurrentForm === undefined && input.playerMaxForm === undefined
      ? createInitialTutorialPlayerFormState()
      : {
          current: input.playerCurrentForm,
          max: input.playerMaxForm,
        },
  )
  const temporaryPlayerFormDelta = Math.floor(input.temporaryPlayerFormDelta ?? 0)
  const playerForm = createTemporaryBattlePlayerForm(
    persistentPlayerForm.current,
    persistentPlayerForm.max,
    temporaryPlayerFormDelta,
  )

  let state: CombatState = {
    turn: 1,
    phase: 'setup',
    player: {
      incense: 0,
      maxIncense,
      currentForm: playerForm.current,
      maxForm: playerForm.max,
      deck,
      unlocks: input.unlocks ?? {
        stages: ['stage_core'],
        keywords: ['break_form', 'ask_name', 'seal_momentum', 'draw', 'gain_incense'],
      },
    },
    enemies,
    drawPile: [
      ...fallbackOpeningDrawPileCards,
      ...openingHandSelection.deck,
      ...extraDrawPileCards,
    ],
    hand: [...openingHandSelection.hand, ...extraHandCards],
    discardPile: [],
    exhaustPile: [],
    nextTurnIncensePenalty: Math.max(0, Math.floor(input.openingIncensePenalty ?? 0)),
    nextTurnIncenseBonus: Math.max(0, Math.floor(input.openingIncenseBonus ?? 0)),
    nextAskNamePenalty: Math.max(0, Math.floor(input.openingAskNamePenalty ?? 0)),
    resources: input.resources ?? createInitialTutorialResourceState(),
    temporaryResourceDelta: input.temporaryResourceDelta ?? createInitialTutorialResourceState(),
    temporaryPlayerFormDelta,
    altars: [],
    artifacts: input.artifacts ?? createInitialArtifactCollection(),
    registerEntries: input.registerEntries ?? [],
    triggeredArtifactIds: [],
    actionLog: [],
    result: {
      status: 'ongoing',
    },
  }

  state = resolveCurrentIncomingForces(state)

  state = appendLog(state, {
    type: 'BATTLE_STARTED',
    sourceId: 'system',
    targetId: enemies[0]?.instanceId,
    payload: {
      enemyDefinitionId: enemyDefinitions[0]?.id,
      enemyDefinitionIds: enemyDefinitions.map((enemyDefinition) => enemyDefinition.id),
      enemyCount: enemyDefinitions.length,
      playerCurrentForm: playerForm.current,
      playerMaxForm: playerForm.max,
      deckSize: openingHandSelection.deck.length,
      openingHandCount: openingHandSelection.hand.length,
      extraDrawPileCount: extraDrawPileCards.length,
    },
  })

  for (const riskLogRecord of input.openingRiskLogRecords ?? []) {
    state = appendLog(state, {
      type: 'RISK_THRESHOLD_APPLIED',
      sourceId: 'system',
      targetId: riskLogRecord.enemyDefinitionId,
      payload: {
        resource: riskLogRecord.resource,
        threshold: riskLogRecord.threshold,
        stateLabel: riskLogRecord.stateLabel,
        result: riskLogRecord.result,
        amount: riskLogRecord.amount ?? null,
        cardDefinitionId: riskLogRecord.cardDefinitionId ?? null,
        enemyDefinitionId: riskLogRecord.enemyDefinitionId ?? null,
        intentId: riskLogRecord.intentId ?? null,
      },
    })
  }

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

  return startPlayerTurn(state, input.openingDrawCount ?? DEFAULT_HAND_DRAW)
}

function createTemporaryBattlePlayerForm(
  currentForm: number,
  maxForm: number,
  temporaryPlayerFormDelta: number,
) {
  if (temporaryPlayerFormDelta === 0) {
    return {
      current: currentForm,
      max: maxForm,
    }
  }

  const nextMaxForm = Math.max(1, maxForm + temporaryPlayerFormDelta)
  const nextCurrentForm = Math.max(0, Math.min(nextMaxForm, currentForm + temporaryPlayerFormDelta))

  return {
    current: nextCurrentForm,
    max: nextMaxForm,
  }
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

function takeOpeningHandCards(
  deck: readonly CardInstance[],
  definitionIds: readonly CardId[],
): {
  readonly deck: readonly CardInstance[]
  readonly hand: readonly CardInstance[]
  readonly missingDefinitionIds: readonly CardId[]
} {
  const remainingDeck = [...deck]
  const openingHand: CardInstance[] = []
  const missingDefinitionIds: CardId[] = []

  for (const definitionId of definitionIds) {
    const cardIndex = remainingDeck.findIndex((card) => card.definitionId === definitionId)

    if (cardIndex < 0) {
      missingDefinitionIds.push(definitionId)
      continue
    }

    const [card] = remainingDeck.splice(cardIndex, 1)
    openingHand.push(card)
  }

  return {
    deck: remainingDeck,
    hand: openingHand,
    missingDefinitionIds,
  }
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

export function createEnemyState(
  definition: EnemyDefinition,
  index: number,
  initialIntentId?: string,
  initialIntentMaskMode = getDefaultIntentMaskMode(definition),
): EnemyState {
  const initialIntentIndex = Math.max(
    0,
    initialIntentId
      ? definition.intents.findIndex((intent) => intent.id === initialIntentId)
      : 0,
  )
  const currentIntent = definition.intents[initialIntentIndex]
  const nextIntent = getNextIntent(definition, initialIntentIndex)
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
    tier: definition.tier,
    maxForm: definition.maxForm,
    currentForm: definition.maxForm,
    fireMark: 0,
    thunderLead: 0,
    nameSlots,
    coveredNameSlotIndices: [],
    isNamed: false,
    hasTriggeredNameBreak: false,
    intentIndex: initialIntentIndex,
    currentIntent,
    currentIntentVisibility:
      initialIntentMaskMode === 'none' ? 'revealed' : 'masked',
    intentMaskMode: initialIntentMaskMode,
    nextIntent,
    incomingForce: getIncomingForceBaseAmount(currentIntent),
    blockedAbnormalMoveTypes: [],
    traits: definition.traits,
    namedPhase: createNamedPhaseState(definition.onNamed),
  }
}

function createNamedPhaseState(
  changes: readonly EnemyMechanicChange[] | undefined,
): EnemyNamedPhaseState | undefined {
  if (!changes || changes.length === 0) {
    return undefined
  }

  return {
    isActive: false,
    changeIds: changes.map((change) => change.id),
    descriptionKeys: changes.map((change) => change.descriptionKey),
    removeTraitIds: uniqueStrings(changes.flatMap((change) => change.removeTraitIds ?? [])),
    addTraitIds: uniqueStrings(changes.flatMap((change) => change.addTraitIds ?? [])),
    disabledMoveTypes: uniqueStrings(changes.flatMap((change) => change.disabledMoveTypes ?? [])),
    downgradedMoveTypes: uniqueStrings(
      changes.flatMap((change) => change.downgradedMoveTypes ?? []),
    ),
    conditionalDisabledMoveTypes: changes.flatMap(
      (change) => change.conditionalDisabledMoveTypes ?? [],
    ),
    conditionalDowngradedMoveTypes: changes.flatMap(
      (change) => change.conditionalDowngradedMoveTypes ?? [],
    ),
    disabledAftereffects: uniqueStrings(
      changes.flatMap((change) => change.disabledAftereffects ?? []),
    ),
    conditionalDisabledAftereffects: changes.flatMap(
      (change) => change.conditionalDisabledAftereffects ?? [],
    ),
    counterIntentId: changes.find((change) => change.counterIntentId)?.counterIntentId,
  }
}

function uniqueStrings<T extends string>(values: readonly T[]): readonly T[] {
  return Array.from(new Set(values))
}

function createHiddenIntentEnemyIdSet(
  enemyDefinitions: readonly EnemyDefinition[],
  openingRiskLogRecords: readonly OpeningRiskLogRecord[],
) {
  const hiddenIntentEnemyIds = new Set<string>()

  for (const record of openingRiskLogRecords) {
    if (
      record.resource === 'fracture' &&
      record.enemyDefinitionId &&
      (record.result === 'ask_name_penalty' || record.result === 'boss_high_fracture')
    ) {
      hiddenIntentEnemyIds.add(record.enemyDefinitionId)
    }
  }

  for (const enemyDefinition of enemyDefinitions) {
    if (enemyDefinition.tier === 'elite' || enemyDefinition.tier === 'boss') {
      hiddenIntentEnemyIds.add(enemyDefinition.id)
    }
  }

  return hiddenIntentEnemyIds
}

function getInitialIntentMaskMode(
  definition: EnemyDefinition,
  index: number,
  hiddenIntentEnemyIds: ReadonlySet<string>,
  hasIntentBacklash: boolean,
): EnemyIntentMaskMode {
  const defaultMaskMode = getDefaultIntentMaskMode(definition)

  if (defaultMaskMode === 'always') {
    return defaultMaskMode
  }

  if (hiddenIntentEnemyIds.has(definition.id) || (hasIntentBacklash && index === 0)) {
    return 'current_only'
  }

  return defaultMaskMode
}

function getDefaultIntentMaskMode(definition: EnemyDefinition): EnemyIntentMaskMode {
  return definition.tier === 'elite' || definition.tier === 'boss' ? 'always' : 'none'
}

function getNextIntent(definition: EnemyDefinition, currentIntentIndex: number) {
  if (definition.intents.length === 0) {
    return undefined
  }

  return definition.intents[(currentIntentIndex + 1) % definition.intents.length]
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
