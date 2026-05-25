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
import { clearFirstPendingArtifactBacklash } from './artifactResolver'
import { removeRunDeckCard } from './deckResolver'
import {
  RESTORE_PLAYER_FORM_AMOUNT,
  restoreTutorialPlayerForm,
} from './playerFormResolver'
import {
  getAppliedRedInkInkCostReduction,
  getDiscountedRedInkInkCost,
  getRemainingRedInkInkCostReduction,
} from './redInkCostResolver'
import { createTutorialRedInkOffer } from './redInkResolver'
import {
  applyTutorialResourceDelta,
  canSpendTutorialResources,
} from './resourceResolver'

export const REST_OPTION_RESTORE_FORM: TutorialRestOptionId = 'restore_form'
export const REST_OPTION_REMOVE_CARD: TutorialRestOptionId = 'remove_card'
export const REST_OPTION_RED_INK_SERVICE: TutorialRestOptionId = 'red_ink_service'
export const REST_OPTION_MAINTAIN_ARTIFACT: TutorialRestOptionId = 'maintain_artifact'
export const REST_RED_INK_SERVICE_BASE_INK_COST = 1

export const TUTORIAL_REST_OPTIONS: readonly TutorialRestOption[] = [
  {
    id: REST_OPTION_RESTORE_FORM,
    nameKey: 'rest.option.restore_form.name',
    descriptionKey: 'rest.option.restore_form.description',
    rewardKey: 'rest.option.restore_form.reward',
    costKey: 'rest.option.restore_form.cost',
  },
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
  {
    id: REST_OPTION_MAINTAIN_ARTIFACT,
    nameKey: 'rest.option.maintain_artifact.name',
    descriptionKey: 'rest.option.maintain_artifact.description',
    rewardKey: 'rest.option.maintain_artifact.reward',
    costKey: 'rest.option.maintain_artifact.cost',
    requiredUnlockStages: ['stage_three_altars'],
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

  if (input.optionId === REST_OPTION_RESTORE_FORM) {
    const formRestore = restoreTutorialPlayerForm(run.playerForm, RESTORE_PLAYER_FORM_AMOUNT)
    const record = createRestRecord(run, input, {
      formRestored: formRestore.restored,
      playerCurrentFormAfter: formRestore.playerForm.current,
      playerMaxFormAfter: formRestore.playerForm.max,
      createdRedInkOffer: false,
      clearedArtifactBacklash: false,
      inkDelta: 0,
    })

    return {
      ...run,
      playerForm: formRestore.playerForm,
      rests: {
        records: [...run.rests.records, record],
      },
    }
  }

  if (input.optionId === REST_OPTION_REMOVE_CARD) {
    if (!input.deckCardId) {
      throw new Error('Rest remove card option requires a deck card id')
    }

    const removal = removeRunDeckCard(run.deckDefinitionIds, run.deckCards, input.deckCardId)
    const record = createRestRecord(run, input, {
      removedDeckCardId: removal.removedDeckCardId,
      removedCardDefinitionId: removal.removedCardDefinitionId,
      formRestored: 0,
      playerCurrentFormAfter: run.playerForm.current,
      playerMaxFormAfter: run.playerForm.max,
      createdRedInkOffer: false,
      clearedArtifactBacklash: false,
      inkDelta: 0,
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

  if (input.optionId === REST_OPTION_MAINTAIN_ARTIFACT) {
    const maintenance = clearFirstPendingArtifactBacklash(run.artifacts)
    const record = createRestRecord(run, input, {
      maintainedArtifactId: maintenance.clearedArtifact?.id,
      maintainedArtifactDefinitionId: maintenance.clearedArtifact?.definitionId,
      clearedArtifactBacklash: Boolean(maintenance.clearedArtifact),
      formRestored: 0,
      playerCurrentFormAfter: run.playerForm.current,
      playerMaxFormAfter: run.playerForm.max,
      createdRedInkOffer: false,
      inkDelta: 0,
    })

    return {
      ...run,
      artifacts: maintenance.artifacts,
      rests: {
        records: [...run.rests.records, record],
      },
    }
  }

  const redInkInkCost = getRestRedInkServiceInkCost(run)
  const redInkInkDelta = redInkInkCost === 0 ? 0 : -redInkInkCost
  const redInkInkCostReductionApplied = getAppliedRedInkInkCostReduction(
    run,
    REST_RED_INK_SERVICE_BASE_INK_COST,
  )

  if (!canSpendTutorialResources(run.resources, { ink: -redInkInkCost })) {
    throw new Error(`Rest red ink service requires ${redInkInkCost} ink`)
  }

  const record = createRestRecord(run, input, {
    formRestored: 0,
    playerCurrentFormAfter: run.playerForm.current,
    playerMaxFormAfter: run.playerForm.max,
    createdRedInkOffer: true,
    clearedArtifactBacklash: false,
    inkDelta: redInkInkDelta,
    redInkInkCostReductionApplied,
  })

  return {
    ...run,
    resources: applyTutorialResourceDelta(run.resources, {
      ink: redInkInkDelta,
    }),
    redInkInkCostReduction: getRemainingRedInkInkCostReduction(
      run,
      REST_RED_INK_SERVICE_BASE_INK_COST,
    ),
    pendingRedInk: createTutorialRedInkOffer(run),
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
  if (optionId === REST_OPTION_RESTORE_FORM) {
    return run.playerForm.current < run.playerForm.max
  }

  if (optionId === REST_OPTION_REMOVE_CARD) {
    return run.deckCards.length > 1
  }

  if (optionId === REST_OPTION_MAINTAIN_ARTIFACT) {
    return run.artifacts.artifacts.some((artifact) => artifact.pendingBacklash)
  }

  return true
}

export function getRestRedInkServiceInkCost(run: TutorialRunState) {
  return getDiscountedRedInkInkCost(run, REST_RED_INK_SERVICE_BASE_INK_COST)
}

function createRestRecord(
  run: TutorialRunState,
  input: ResolveTutorialRestInput,
  result: {
    readonly removedDeckCardId?: RunDeckCardId
    readonly removedCardDefinitionId?: CardId
    readonly maintainedArtifactId?: string
    readonly maintainedArtifactDefinitionId?: string
    readonly clearedArtifactBacklash: boolean
    readonly inkDelta: number
    readonly redInkInkCostReductionApplied?: number
    readonly formRestored: number
    readonly playerCurrentFormAfter: number
    readonly playerMaxFormAfter: number
    readonly createdRedInkOffer: boolean
  },
): TutorialRestRecord {
  return {
    id: `rest_record_${run.rests.records.length + 1}`,
    routeNodeId: input.routeNodeId,
    optionId: input.optionId,
    removedDeckCardId: result.removedDeckCardId,
    removedCardDefinitionId: result.removedCardDefinitionId,
    maintainedArtifactId: result.maintainedArtifactId,
    maintainedArtifactDefinitionId: result.maintainedArtifactDefinitionId,
    clearedArtifactBacklash: result.clearedArtifactBacklash,
    inkDelta: result.inkDelta,
    ...(result.redInkInkCostReductionApplied
      ? { redInkInkCostReductionApplied: result.redInkInkCostReductionApplied }
      : {}),
    formRestored: result.formRestored,
    playerCurrentFormAfter: result.playerCurrentFormAfter,
    playerMaxFormAfter: result.playerMaxFormAfter,
    createdRedInkOffer: result.createdRedInkOffer,
  }
}
