import { annotateRunDeckCard } from './deckResolver'
import { advanceArtifactProgress } from './artifactResolver'
import type {
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

  const record: TutorialRedInkRecord = {
    id: `red_ink_record_${run.redInkRecords.length + 1}`,
    deckCardId: targetCard.id,
    cardDefinitionId: targetCard.definitionId,
    annotationId: option.id,
    skipped: false,
  }

  return {
    ...run,
    deckCards: annotateRunDeckCard(run.deckCards, targetCard.id, option.annotation),
    artifacts: advanceArtifactProgress(run.artifacts, [
      {
        kind: 'red_ink_applied',
      },
    ]),
    pendingRedInk: undefined,
    redInkRecords: [...run.redInkRecords, record],
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
