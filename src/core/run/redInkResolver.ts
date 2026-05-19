import { annotateRunDeckCard } from './deckResolver'
import { advanceArtifactProgress, CINNABAR_DOU_ARTIFACT_ID } from './artifactResolver'
import type {
  CardAnnotation,
  RedInkAnnotationId,
  RunDeckCardId,
  TutorialRedInkOption,
  TutorialRedInkRecord,
  TutorialRunState,
} from '../../types'

export const RED_INK_OPTIONS: readonly TutorialRedInkOption[] = [
  {
    id: 'red_ink_return_incense',
    nameKey: 'red_ink.return_incense.name',
    rulesTextKey: 'red_ink.return_incense.rules',
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
    id: 'red_ink_trace_name',
    nameKey: 'red_ink.trace_name.name',
    rulesTextKey: 'red_ink.trace_name.rules',
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
    id: 'red_ink_press_momentum',
    nameKey: 'red_ink.press_momentum.name',
    rulesTextKey: 'red_ink.press_momentum.rules',
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
]

export interface ResolveTutorialRedInkInput {
  readonly deckCardId: RunDeckCardId
  readonly annotationId: RedInkAnnotationId
}

export function createTutorialRedInkOfferIfNeeded(run: TutorialRunState): TutorialRunState {
  if (!shouldCreateTutorialRedInkOffer(run)) {
    return run
  }

  return {
    ...run,
    pendingRedInk: {
      id: `red_ink_offer_${run.redInkRecords.length + 1}`,
      options: RED_INK_OPTIONS,
    },
  }
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
