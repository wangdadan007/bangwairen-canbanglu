import { annotateRunDeckCard } from './deckResolver'
import { advanceArtifactProgress, CINNABAR_DOU_ARTIFACT_ID } from './artifactResolver'
import type {
  CardAnnotation,
  CardDefinition,
  PlayableRoleId,
  RedInkAnnotationId,
  RouteTendencyId,
  RunDeckCard,
  RunDeckCardId,
  TutorialRedInkOffer,
  TutorialRedInkOption,
  TutorialRedInkRecord,
  TutorialRunState,
} from '../../types'

export const RED_INK_OFFER_DISPLAY_COUNT = 4

export interface RedInkOfferContext {
  readonly routeTendencyIds?: readonly RouteTendencyId[]
}

export const RED_INK_OPTIONS: readonly TutorialRedInkOption[] = [
  {
    id: 'red_ink_return_incense',
    nameKey: 'red_ink.return_incense.name',
    rulesTextKey: 'red_ink.return_incense.rules',
    category: 'economy',
    compatibleCardTags: ['break_form', 'ask_name', 'seal_momentum', 'counter_abnormal_move', 'altar'],
    compatibleEffectTypes: [
      'BREAK_SHAPE',
      'ASK_NAME',
      'SEAL_MOMENTUM',
      'COUNTER_ABNORMAL_MOVE',
      'PLACE_ALTAR',
    ],
    incompatibleCardTags: ['draw', 'gain_incense'],
    incompatibleEffectTypes: ['DRAW', 'GAIN_INCENSE'],
    minimumCardCost: 1,
    preferredRoleIds: ['role_hengjian', 'role_lianjin'],
    preferredRouteTendencyIds: ['steady', 'supply'],
    annotation: {
      id: 'red_ink_return_incense',
      nameKey: 'red_ink.return_incense.name',
      rulesTextKey: 'red_ink.return_incense.rules',
      effects: [
        {
          type: 'GAIN_INCENSE',
          target: 'self',
          amount: 1,
        },
      ],
    },
  },
  {
    id: 'red_ink_ink_drop',
    nameKey: 'red_ink.ink_drop.name',
    rulesTextKey: 'red_ink.ink_drop.rules',
    category: 'economy',
    requiredUnlockStages: ['stage_run_resources'],
    compatibleCardTags: ['break_form', 'ask_name', 'seal_momentum', 'counter_abnormal_move', 'altar'],
    compatibleEffectTypes: [
      'BREAK_SHAPE',
      'ASK_NAME',
      'SEAL_MOMENTUM',
      'COUNTER_ABNORMAL_MOVE',
      'PLACE_ALTAR',
    ],
    incompatibleCardTags: ['draw', 'gain_incense', 'ink'],
    incompatibleEffectTypes: ['DRAW', 'GAIN_INCENSE', 'GAIN_INK'],
    minimumCardCost: 1,
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
    annotation: {
      id: 'red_ink_ink_drop',
      nameKey: 'red_ink.ink_drop.name',
      rulesTextKey: 'red_ink.ink_drop.rules',
      effects: [
        {
          type: 'GAIN_INK',
          target: 'self',
          amount: 1,
        },
      ],
    },
  },
  {
    id: 'red_ink_trace_name',
    nameKey: 'red_ink.trace_name.name',
    rulesTextKey: 'red_ink.trace_name.rules',
    category: 'ask_name',
    compatibleCardTags: ['break_form', 'seal_momentum', 'counter_abnormal_move', 'altar', 'linzhao'],
    compatibleEffectTypes: [
      'BREAK_SHAPE',
      'SEAL_MOMENTUM',
      'COUNTER_ABNORMAL_MOVE',
      'PLACE_ALTAR',
    ],
    incompatibleCardTags: ['draw', 'gain_incense'],
    incompatibleEffectTypes: ['DRAW', 'GAIN_INCENSE'],
    minimumCardCost: 1,
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue'],
    annotation: {
      id: 'red_ink_trace_name',
      nameKey: 'red_ink.trace_name.name',
      rulesTextKey: 'red_ink.trace_name.rules',
      effects: [
        {
          type: 'ASK_NAME',
          target: 'selected_enemy',
          amount: 1,
        },
      ],
    },
  },
  {
    id: 'red_ink_named_draw',
    nameKey: 'red_ink.named_draw.name',
    rulesTextKey: 'red_ink.named_draw.rules',
    category: 'ask_name',
    compatibleEffectTypes: ['ASK_NAME'],
    compatibleCardTags: ['ask_name'],
    incompatibleCardTags: ['draw', 'gain_incense'],
    incompatibleEffectTypes: ['DRAW', 'GAIN_INCENSE'],
    minimumCardCost: 1,
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'steady'],
    annotation: {
      id: 'red_ink_named_draw',
      nameKey: 'red_ink.named_draw.name',
      rulesTextKey: 'red_ink.named_draw.rules',
      effects: [
        {
          type: 'DRAW',
          target: 'self',
          count: 1,
          condition: {
            type: 'THIS_TURN_NAMED_ENEMY',
          },
        },
      ],
    },
  },
  {
    id: 'red_ink_named_echo',
    nameKey: 'red_ink.named_echo.name',
    rulesTextKey: 'red_ink.named_echo.rules',
    category: 'ask_name',
    compatibleCardTags: ['ask_name', 'catalogue_reward'],
    compatibleEffectTypes: ['ASK_NAME'],
    incompatibleCardTags: ['draw', 'gain_incense'],
    incompatibleEffectTypes: ['DRAW', 'GAIN_INCENSE'],
    minimumCardCost: 1,
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue'],
    annotation: {
      id: 'red_ink_named_echo',
      nameKey: 'red_ink.named_echo.name',
      rulesTextKey: 'red_ink.named_echo.rules',
      effects: [
        {
          type: 'GAIN_INCENSE',
          target: 'self',
          amount: 1,
          condition: {
            type: 'TARGET_IS_NAMED',
          },
        },
        {
          type: 'DRAW',
          target: 'self',
          count: 1,
          condition: {
            type: 'TARGET_IS_NAMED',
          },
        },
      ],
    },
  },
  {
    id: 'red_ink_revealed_break',
    nameKey: 'red_ink.revealed_break.name',
    rulesTextKey: 'red_ink.revealed_break.rules',
    category: 'break_form',
    compatibleCardTags: ['break_form', 'ask_name', 'linzhao'],
    compatibleEffectTypes: ['BREAK_SHAPE', 'ASK_NAME'],
    minimumCardCost: 1,
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'catalogue'],
    annotation: {
      id: 'red_ink_revealed_break',
      nameKey: 'red_ink.revealed_break.name',
      rulesTextKey: 'red_ink.revealed_break.rules',
      effects: [
        {
          type: 'BREAK_SHAPE',
          target: 'selected_enemy',
          amount: 2,
          condition: {
            type: 'TARGET_HAS_REVEALED_NAME_SLOT',
          },
        },
      ],
    },
  },
  {
    id: 'red_ink_named_break',
    nameKey: 'red_ink.named_break.name',
    rulesTextKey: 'red_ink.named_break.rules',
    category: 'break_form',
    compatibleCardTags: ['break_form', 'linzhao'],
    compatibleEffectTypes: ['BREAK_SHAPE'],
    minimumCardCost: 1,
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
    annotation: {
      id: 'red_ink_named_break',
      nameKey: 'red_ink.named_break.name',
      rulesTextKey: 'red_ink.named_break.rules',
      effects: [
        {
          type: 'BREAK_SHAPE',
          target: 'selected_enemy',
          amount: 3,
          condition: {
            type: 'TARGET_IS_NAMED',
          },
        },
      ],
    },
  },
  {
    id: 'red_ink_press_momentum',
    nameKey: 'red_ink.press_momentum.name',
    rulesTextKey: 'red_ink.press_momentum.rules',
    category: 'defense',
    compatibleCardTags: ['seal_momentum', 'linzhao'],
    compatibleEffectTypes: ['SEAL_MOMENTUM'],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
    annotation: {
      id: 'red_ink_press_momentum',
      nameKey: 'red_ink.press_momentum.name',
      rulesTextKey: 'red_ink.press_momentum.rules',
      effects: [
        {
          type: 'SEAL_MOMENTUM',
          target: 'selected_enemy',
          amount: 2,
        },
        {
          type: 'BREAK_SHAPE',
          target: 'selected_enemy',
          amount: 1,
          condition: {
            type: 'TARGET_HAS_REVEALED_NAME_SLOT',
          },
        },
      ],
    },
  },
  {
    id: 'red_ink_counter_draw',
    nameKey: 'red_ink.counter_draw.name',
    rulesTextKey: 'red_ink.counter_draw.rules',
    category: 'defense',
    compatibleCardTags: ['counter_abnormal_move'],
    compatibleEffectTypes: ['COUNTER_ABNORMAL_MOVE'],
    preferredRoleIds: ['role_zhaowei', 'role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
    annotation: {
      id: 'red_ink_counter_draw',
      nameKey: 'red_ink.counter_draw.name',
      rulesTextKey: 'red_ink.counter_draw.rules',
      effects: [
        {
          type: 'DRAW',
          target: 'self',
          count: 1,
          condition: {
            type: 'THIS_TURN_COUNTERED_ABNORMAL_MOVE',
          },
        },
      ],
    },
  },
  {
    id: 'red_ink_altar_ink',
    nameKey: 'red_ink.altar_ink.name',
    rulesTextKey: 'red_ink.altar_ink.rules',
    category: 'altar',
    requiredUnlockStages: ['stage_human_altar'],
    compatibleCardTags: ['altar'],
    compatibleEffectTypes: ['PLACE_ALTAR'],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
    annotation: {
      id: 'red_ink_altar_ink',
      nameKey: 'red_ink.altar_ink.name',
      rulesTextKey: 'red_ink.altar_ink.rules',
      effects: [
        {
          type: 'GAIN_INK',
          target: 'self',
          amount: 1,
          condition: {
            type: 'THIS_TURN_PLACED_ALTAR',
          },
        },
      ],
    },
  },
  {
    id: 'red_ink_altar_return',
    nameKey: 'red_ink.altar_return.name',
    rulesTextKey: 'red_ink.altar_return.rules',
    category: 'altar',
    requiredUnlockStages: ['stage_three_altars'],
    compatibleCardTags: ['altar'],
    compatibleEffectTypes: ['PLACE_ALTAR'],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'supply'],
    annotation: {
      id: 'red_ink_altar_return',
      nameKey: 'red_ink.altar_return.name',
      rulesTextKey: 'red_ink.altar_return.rules',
      effects: [
        {
          type: 'GAIN_INCENSE',
          target: 'self',
          amount: 1,
          condition: {
            type: 'THIS_TURN_PLACED_ALTAR',
          },
        },
        {
          type: 'DRAW',
          target: 'self',
          count: 1,
          condition: {
            type: 'THIS_TURN_PLACED_ALTAR',
          },
        },
      ],
    },
  },
  {
    id: 'red_ink_doom_burst',
    nameKey: 'red_ink.doom_burst.name',
    rulesTextKey: 'red_ink.doom_burst.rules',
    category: 'risk',
    requiredUnlockStages: ['stage_run_resources'],
    compatibleCardTags: ['break_form'],
    compatibleEffectTypes: ['BREAK_SHAPE'],
    incompatibleCardTags: ['draw', 'gain_incense'],
    incompatibleEffectTypes: ['DRAW', 'GAIN_INCENSE'],
    minimumCardCost: 1,
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
    annotation: {
      id: 'red_ink_doom_burst',
      nameKey: 'red_ink.doom_burst.name',
      rulesTextKey: 'red_ink.doom_burst.rules',
      effects: [
        {
          type: 'BREAK_SHAPE',
          target: 'selected_enemy',
          amount: 4,
        },
        {
          type: 'GAIN_DOOM',
          target: 'self',
          amount: 1,
        },
      ],
    },
  },
]

export interface ResolveTutorialRedInkInput {
  readonly deckCardId: RunDeckCardId
  readonly annotationId: RedInkAnnotationId
  readonly cardDefinitions?: readonly CardDefinition[]
}

export function createTutorialRedInkOffer(
  run: TutorialRunState,
  context: RedInkOfferContext = {},
): TutorialRedInkOffer {
  return {
    id: `red_ink_offer_${run.redInkRecords.length + 1}`,
    options: orderRedInkOptions(getUnlockedRedInkOptions(run), run, context),
    displayCount: RED_INK_OFFER_DISPLAY_COUNT,
  }
}

export function createTutorialRedInkOfferIfNeeded(
  run: TutorialRunState,
  context: RedInkOfferContext = {},
): TutorialRunState {
  if (!shouldCreateTutorialRedInkOffer(run)) {
    return run
  }

  return {
    ...run,
    pendingRedInk: createTutorialRedInkOffer(run, context),
  }
}

export function reorderPendingTutorialRedInkOffer(
  run: TutorialRunState,
  context: RedInkOfferContext = {},
): TutorialRunState {
  if (!run.pendingRedInk) {
    return run
  }

  return {
    ...run,
    pendingRedInk: {
      ...run.pendingRedInk,
      options: orderRedInkOptions(run.pendingRedInk.options, run, context),
      displayCount: run.pendingRedInk.displayCount ?? RED_INK_OFFER_DISPLAY_COUNT,
    },
  }
}

export function getVisibleRedInkOptionsForDeckCard(
  offer: TutorialRedInkOffer,
  deckCard: RunDeckCard | undefined,
  cardDefinition: CardDefinition | undefined,
): readonly TutorialRedInkOption[] {
  const displayCount = offer.displayCount ?? RED_INK_OFFER_DISPLAY_COUNT

  if (!deckCard || !cardDefinition) {
    return offer.options.slice(0, displayCount)
  }

  const compatibleOptions = offer.options.filter((option) =>
    isRedInkOptionCompatibleWithCard(option, cardDefinition),
  )

  return compatibleOptions.slice(0, displayCount)
}

export function isRedInkOptionCompatibleWithCard(
  option: TutorialRedInkOption,
  cardDefinition: CardDefinition,
) {
  const requiredTags = option.compatibleCardTags ?? []
  const requiredEffectTypes = option.compatibleEffectTypes ?? []
  const incompatibleTags = option.incompatibleCardTags ?? []
  const incompatibleEffectTypes = option.incompatibleEffectTypes ?? []

  if (
    option.minimumCardCost !== undefined &&
    cardDefinition.cost < option.minimumCardCost
  ) {
    return false
  }

  if (incompatibleTags.some((tag) => cardDefinition.tags.includes(tag))) {
    return false
  }

  if (
    incompatibleEffectTypes.some((effectType) =>
      cardDefinition.effects.some((effect) => effect.type === effectType),
    )
  ) {
    return false
  }

  if (requiredTags.length === 0 && requiredEffectTypes.length === 0) {
    return true
  }

  if (cardDefinition.tags.includes('linzhao')) {
    return requiredTags.includes('linzhao')
  }

  return (
    requiredTags.some((tag) => cardDefinition.tags.includes(tag)) ||
    requiredEffectTypes.some((effectType) =>
      cardDefinition.effects.some((effect) => effect.type === effectType),
    )
  )
}

export function resolveTutorialRedInk(
  run: TutorialRunState,
  input?: ResolveTutorialRedInkInput,
): TutorialRunState {
  const offer = run.pendingRedInk

  if (!offer) {
    return run
  }

  if (!input) {
    return {
      ...run,
      pendingRedInk: undefined,
      redInkRecords: [...run.redInkRecords, createSkippedRecord(run)],
    }
  }

  const targetCard = run.deckCards.find((card) => card.id === input.deckCardId)
  const option = offer.options.find((candidate) => candidate.id === input.annotationId)

  if (!targetCard) {
    throw new Error(`Missing run deck card for red ink: ${input.deckCardId}`)
  }

  if (!option) {
    throw new Error(`Missing red ink option: ${input.annotationId}`)
  }

  const targetCardDefinition = input.cardDefinitions?.find(
    (definition) => definition.id === targetCard.definitionId,
  )

  if (
    targetCardDefinition &&
    !isRedInkOptionCompatibleWithCard(option, targetCardDefinition)
  ) {
    throw new Error(`Red ink option is not compatible with card: ${input.annotationId}`)
  }

  const cinnabarBonus = createCinnabarBonusAnnotation(run)
  const record: TutorialRedInkRecord = {
    id: `red_ink_record_${run.redInkRecords.length + 1}`,
    deckCardId: targetCard.id,
    cardDefinitionId: targetCard.definitionId,
    annotationId: option.id,
    skipped: false,
  }
  const deckCardsWithBaseAnnotation = annotateRunDeckCard(
    run.deckCards,
    targetCard.id,
    option.annotation,
  )
  const deckCards = cinnabarBonus
    ? annotateRunDeckCard(deckCardsWithBaseAnnotation, targetCard.id, cinnabarBonus)
    : deckCardsWithBaseAnnotation
  const progressedArtifacts = advanceArtifactProgress(run.artifacts, [
    {
      kind: 'red_ink_applied',
    },
  ])

  return {
    ...run,
    deckCards,
    artifacts: cinnabarBonus ? markCinnabarTriggered(progressedArtifacts) : progressedArtifacts,
    pendingRedInk: undefined,
    redInkRecords: [...run.redInkRecords, record],
  }
}

function getUnlockedRedInkOptions(run: TutorialRunState) {
  return RED_INK_OPTIONS.filter((option) =>
    (option.requiredUnlockStages ?? []).every((stageId) =>
      run.unlocks.stages.includes(stageId),
    ),
  )
}

function orderRedInkOptions(
  options: readonly TutorialRedInkOption[],
  run: TutorialRunState,
  context: RedInkOfferContext,
) {
  return options
    .map((option, index) => ({
      option,
      index,
      score: getRedInkWeight(option, run.roleId, context.routeTendencyIds ?? []),
      jitter: createStableRedInkJitter(run, option.id),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.jitter - right.jitter || left.index - right.index,
    )
    .map(({ option }) => option)
}

function getRedInkWeight(
  option: TutorialRedInkOption,
  roleId: PlayableRoleId | undefined,
  routeTendencyIds: readonly RouteTendencyId[],
) {
  const roleWeight = roleId && option.preferredRoleIds?.includes(roleId) ? 4 : 0
  const routeWeight = routeTendencyIds.reduce(
    (total, tendencyId) =>
      total + (option.preferredRouteTendencyIds?.includes(tendencyId) ? 3 : 0),
    0,
  )

  return roleWeight + routeWeight
}

function createStableRedInkJitter(run: TutorialRunState, optionId: string) {
  const seed = [
    run.roleId ?? 'role_none',
    run.redInkRecords.length.toString(),
    run.completedEncounterIds.join(','),
    run.resources.fracture.toString(),
    run.resources.doom.toString(),
    optionId,
  ].join('|')

  return hashString(seed) / 0xffffffff
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createCinnabarBonusAnnotation(run: TutorialRunState): CardAnnotation | undefined {
  const cinnabarDou = run.artifacts.artifacts.find(
    (artifact) => artifact.definitionId === CINNABAR_DOU_ARTIFACT_ID,
  )

  if (!cinnabarDou || cinnabarDou.chargesRemaining <= 0) {
    return undefined
  }

  return {
    id:
      cinnabarDou.bindingStatus === 'bound'
        ? 'red_ink_cinnabar_bound_bonus'
        : 'red_ink_cinnabar_base_bonus',
    nameKey: 'red_ink.cinnabar_bonus.name',
    rulesTextKey:
      cinnabarDou.bindingStatus === 'bound'
        ? 'red_ink.cinnabar_bonus.bound.rules'
        : 'red_ink.cinnabar_bonus.base.rules',
    effects:
      cinnabarDou.bindingStatus === 'bound'
        ? [
            {
              type: 'GAIN_INK',
              target: 'self',
              amount: 1,
            },
            {
              type: 'DRAW',
              target: 'self',
              count: 1,
            },
          ]
        : [
            {
              type: 'GAIN_INK',
              target: 'self',
              amount: 1,
            },
          ],
  }
}

function markCinnabarTriggered(artifacts: TutorialRunState['artifacts']) {
  return {
    artifacts: artifacts.artifacts.map((artifact) =>
      artifact.definitionId === CINNABAR_DOU_ARTIFACT_ID
        ? {
            ...artifact,
            hasTriggeredThisBattle: true,
            triggerCountThisBattle: artifact.triggerCountThisBattle + 1,
          }
        : artifact,
    ),
  }
}

function shouldCreateTutorialRedInkOffer(run: TutorialRunState) {
  return (
    run.status === 'active' &&
    !run.pendingVerdict &&
    !run.pendingReward &&
    !run.pendingRedInk &&
    run.redInkRecords.length === 0 &&
    run.unlocks.stages.includes('stage_red_ink_preview')
  )
}

function createSkippedRecord(run: TutorialRunState): TutorialRedInkRecord {
  return {
    id: `red_ink_record_${run.redInkRecords.length + 1}`,
    skipped: true,
  }
}
