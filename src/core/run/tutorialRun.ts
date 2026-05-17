import type {
  ArtifactDefinition,
  CardDefinition,
  CardId,
  EncounterDefinition,
  EncounterId,
  TutorialRunSettlementRecord,
  TutorialRunFailureReason,
  TutorialRunState,
  TutorialUnlockDefinition,
  UnlockStageId,
  UnlockState,
  VictorySettlement,
} from '../../types'
import { DEFAULT_STARTER_DECK_IDS } from '../battle/battleState'
import {
  advanceArtifactsAfterBattle,
  createInitialArtifactCollection,
  type ArtifactBattleProgressInput,
} from './artifactResolver'
import { createRunDeckCards } from './deckResolver'
import { createTutorialRewardOffer } from './rewardResolver'
import {
  createInitialTutorialVerdictState,
  createTutorialVerdictOffer,
  type TutorialVerdictContext,
} from './verdictResolver'
import { createInitialTutorialEventState } from './eventResolver'
import { createInitialTutorialRestState } from './restResolver'
import {
  createInitialTutorialCurrencyState,
  createInitialTutorialShopState,
} from './shopResolver'

export const TUTORIAL_ENCOUNTER_IDS: readonly EncounterId[] = [
  'encounter_tutorial_paper_wraith',
  'encounter_tutorial_incense_thief_mouse',
  'encounter_tutorial_bronze_bell_patrol',
]

export function createInitialTutorialRunState(
  tutorialUnlocks: readonly TutorialUnlockDefinition[],
  encounterIds: readonly EncounterId[] = TUTORIAL_ENCOUNTER_IDS,
  deckDefinitionIds: readonly CardId[] = DEFAULT_STARTER_DECK_IDS,
  artifactDefinitions: readonly ArtifactDefinition[] = [],
): TutorialRunState {
  return {
    status: 'active',
    currentEncounterIndex: 0,
    encounterIds,
    completedEncounterIds: [],
    settlements: [],
    deckDefinitionIds,
    deckCards: createRunDeckCards(deckDefinitionIds),
    artifacts: createInitialArtifactCollection(artifactDefinitions),
    currency: createInitialTutorialCurrencyState(),
    unlocks: createUnlockState(['stage_core'], tutorialUnlocks),
    verdict: createInitialTutorialVerdictState(),
    events: createInitialTutorialEventState(),
    rests: createInitialTutorialRestState(),
    shops: createInitialTutorialShopState(),
    rewards: [],
    redInkRecords: [],
  }
}

export function getCurrentTutorialEncounter(
  run: TutorialRunState,
  encounters: readonly EncounterDefinition[],
): EncounterDefinition | undefined {
  if (run.status !== 'active') {
    return undefined
  }

  const encounterId = run.encounterIds[run.currentEncounterIndex]
  return encounters.find((encounter) => encounter.id === encounterId)
}

export function advanceTutorialRun(
  run: TutorialRunState,
  encounters: readonly EncounterDefinition[],
  tutorialUnlocks: readonly TutorialUnlockDefinition[],
  settlement: VictorySettlement,
  cardDefinitions?: readonly CardDefinition[],
  verdictContext?: TutorialVerdictContext,
  artifactProgress?: ArtifactBattleProgressInput,
): TutorialRunState {
  if (run.status !== 'active') {
    return run
  }

  if (run.pendingVerdict || run.pendingReward || run.pendingRedInk) {
    throw new Error('Resolve pending tutorial offer before advancing the run')
  }

  const currentEncounter = getCurrentTutorialEncounter(run, encounters)

  if (!currentEncounter) {
    throw new Error(`Missing tutorial encounter at index ${run.currentEncounterIndex}`)
  }

  const nextCompletedEncounterIds = [...run.completedEncounterIds, currentEncounter.id]
  const nextSettlements: readonly TutorialRunSettlementRecord[] = [
    ...run.settlements,
    {
      encounterId: currentEncounter.id,
      settlement,
    },
  ]
  const nextUnlocks = mergeUnlockStages(
    run.unlocks,
    currentEncounter.unlocksOnVictory,
    tutorialUnlocks,
  )
  const nextEncounterIndex = run.currentEncounterIndex + 1
  const isComplete = nextEncounterIndex >= run.encounterIds.length

  return {
    ...run,
    status: isComplete ? 'complete' : 'active',
    currentEncounterIndex: isComplete ? run.currentEncounterIndex : nextEncounterIndex,
    completedEncounterIds: nextCompletedEncounterIds,
    settlements: nextSettlements,
    artifacts: advanceArtifactsAfterBattle(run.artifacts, artifactProgress),
    unlocks: nextUnlocks,
    pendingVerdict: verdictContext
      ? createTutorialVerdictOffer({
          encounter: currentEncounter,
          settlement,
          ...verdictContext,
        })
      : undefined,
    pendingReward: cardDefinitions
      ? createTutorialRewardOffer({
          encounter: currentEncounter,
          settlement,
          unlocks: nextUnlocks,
          cardDefinitions,
        })
      : undefined,
  }
}

export function failTutorialRun(
  run: TutorialRunState,
  reason: TutorialRunFailureReason = 'abandoned',
): TutorialRunState {
  if (run.status !== 'active') {
    return run
  }

  return {
    ...run,
    status: 'failed',
    failureReason: reason,
    pendingVerdict: undefined,
    pendingReward: undefined,
    pendingRedInk: undefined,
  }
}

export function createUnlockState(
  stageIds: readonly UnlockStageId[],
  tutorialUnlocks: readonly TutorialUnlockDefinition[],
): UnlockState {
  return mergeUnlockStages(
    {
      stages: [],
      keywords: [],
    },
    stageIds,
    tutorialUnlocks,
  )
}

function mergeUnlockStages(
  current: UnlockState,
  stageIds: readonly UnlockStageId[],
  tutorialUnlocks: readonly TutorialUnlockDefinition[],
): UnlockState {
  const nextStages = new Set(current.stages)
  const nextKeywords = new Set(current.keywords)

  for (const stageId of stageIds) {
    nextStages.add(stageId)

    const unlock = tutorialUnlocks.find((candidate) => candidate.id === stageId)

    if (!unlock) {
      throw new Error(`Missing tutorial unlock definition: ${stageId}`)
    }

    for (const keyword of unlock.keywords) {
      nextKeywords.add(keyword)
    }
  }

  return {
    stages: [...nextStages],
    keywords: [...nextKeywords],
  }
}
