import type {
  EncounterDefinition,
  EncounterId,
  TutorialRunSettlementRecord,
  TutorialRunState,
  TutorialUnlockDefinition,
  UnlockStageId,
  UnlockState,
  VictorySettlement,
} from '../../types'

export const TUTORIAL_ENCOUNTER_IDS: readonly EncounterId[] = [
  'encounter_tutorial_paper_wraith',
  'encounter_tutorial_incense_thief_mouse',
  'encounter_tutorial_bronze_bell_patrol',
]

export function createInitialTutorialRunState(
  tutorialUnlocks: readonly TutorialUnlockDefinition[],
  encounterIds: readonly EncounterId[] = TUTORIAL_ENCOUNTER_IDS,
): TutorialRunState {
  return {
    status: 'active',
    currentEncounterIndex: 0,
    encounterIds,
    completedEncounterIds: [],
    settlements: [],
    unlocks: createUnlockState(['stage_core'], tutorialUnlocks),
  }
}

export function getCurrentTutorialEncounter(
  run: TutorialRunState,
  encounters: readonly EncounterDefinition[],
): EncounterDefinition | undefined {
  if (run.status === 'complete') {
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
): TutorialRunState {
  if (run.status === 'complete') {
    return run
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
    unlocks: nextUnlocks,
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
