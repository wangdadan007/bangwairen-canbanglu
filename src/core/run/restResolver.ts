import type {
  CardId,
  RouteNodeId,
  RunDeckCardId,
  TutorialRestOption,
  TutorialRestOptionId,
  TutorialRestRecord,
  TutorialRestState,
  TutorialRunState,
} from '../../types'
import { removeRunDeckCard } from './deckResolver'
import { RED_INK_OPTIONS } from './redInkResolver'

export const REST_OPTION_REMOVE_CARD: TutorialRestOptionId = 'remove_card'
export const REST_OPTION_RED_INK_SERVICE: TutorialRestOptionId = 'red_ink_service'

export const TUTORIAL_REST_OPTIONS: readonly TutorialRestOption[] = [
  {
    id: REST_OPTION_REMOVE_CARD,
    nameKey: 'rest.option.remove_card.name',
    descriptionKey: 'rest.option.remove_card.description',
    rewardKey: 'rest.option.remove_card.reward',
    costKey: 'rest.option.remove_card.cost',
  },
  {
    id: REST_OPTION_RED_INK_SERVICE,
    nameKey: 'rest.option.red_ink_service.name',
    descriptionKey: 'rest.option.red_ink_service.description',
    rewardKey: 'rest.option.red_ink_service.reward',
    costKey: 'rest.option.red_ink_service.cost',
    requiredUnlockStages: ['stage_red_ink_preview'],
  },
]

export interface ResolveTutorialRestInput {
  readonly optionId: TutorialRestOptionId
  readonly deckCardId?: RunDeckCardId
  readonly routeNodeId?: RouteNodeId
}

export function createInitialTutorialRestState(): TutorialRestState {
  return {
    records: [],
  }
}

export function getAvailableRestOptions(run: TutorialRunState): readonly TutorialRestOption[] {
  return TUTORIAL_REST_OPTIONS.filter(
    (option) =>
      everyRequiredStageUnlocked(option, run) &&
      isRestOptionAvailable(option.id, run),
  )
}

export function resolveTutorialRest(
  run: TutorialRunState,
  input: ResolveTutorialRestInput,
): TutorialRunState {
  if (run.status !== 'active') {
    return run
  }

  if (run.pendingVerdict || run.pendingReward || run.pendingRedInk) {
    throw new Error('Resolve pending run choice before resolving a rest node')
  }

  const option = getAvailableRestOptions(run).find((candidate) => candidate.id === input.optionId)

  if (!option) {
    throw new Error(`Rest option is not available: ${input.optionId}`)
  }

  if (input.optionId === REST_OPTION_REMOVE_CARD) {
    if (!input.deckCardId) {
      throw new Error('Rest remove card option requires a deck card id')
    }

    const removal = removeRunDeckCard(run.deckDefinitionIds, run.deckCards, input.deckCardId)
    const record = createRestRecord(run, input, {
      removedDeckCardId: removal.removedDeckCardId,
      removedCardDefinitionId: removal.removedCardDefinitionId,
      createdRedInkOffer: false,
    })

    return {
      ...run,
      deckDefinitionIds: removal.deckDefinitionIds,
      deckCards: removal.deckCards,
      rests: {
        records: [...run.rests.records, record],
      },
    }
  }

  const record = createRestRecord(run, input, {
    createdRedInkOffer: true,
  })

  return {
    ...run,
    pendingRedInk: {
      id: `red_ink_offer_${run.redInkRecords.length + 1}`,
      options: RED_INK_OPTIONS,
    },
    rests: {
      records: [...run.rests.records, record],
    },
  }
}

function everyRequiredStageUnlocked(option: TutorialRestOption, run: TutorialRunState) {
  return (option.requiredUnlockStages ?? []).every((stageId) =>
    run.unlocks.stages.includes(stageId),
  )
}

function isRestOptionAvailable(optionId: TutorialRestOptionId, run: TutorialRunState) {
  if (optionId === REST_OPTION_REMOVE_CARD) {
    return run.deckCards.length > 1
  }

  return true
}

function createRestRecord(
  run: TutorialRunState,
  input: ResolveTutorialRestInput,
  result: {
    readonly removedDeckCardId?: RunDeckCardId
    readonly removedCardDefinitionId?: CardId
    readonly createdRedInkOffer: boolean
  },
): TutorialRestRecord {
  return {
    id: `rest_record_${run.rests.records.length + 1}`,
    routeNodeId: input.routeNodeId,
    optionId: input.optionId,
    removedDeckCardId: result.removedDeckCardId,
    removedCardDefinitionId: result.removedCardDefinitionId,
    createdRedInkOffer: result.createdRedInkOffer,
  }
}
