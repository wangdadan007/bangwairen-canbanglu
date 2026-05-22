import type { TutorialRunState, TutorialRunSummary } from '../../types'

export const CHAPTER_ONE_BOSS_ENCOUNTER_ID = 'encounter_boss_registry_thief'
export const REGISTRY_THIEF_REGISTER_RULE_ID = 'register_registry_thief'

export function createTutorialRunSummary(run: TutorialRunState): TutorialRunSummary {
  const bossRecord = run.settlements.find(
    (record) => record.encounterId === CHAPTER_ONE_BOSS_ENCOUNTER_ID,
  )

  return {
    status: run.status,
    failureReason: run.failureReason,
    completedEncounterCount: run.completedEncounterIds.length,
    totalEncounterCount: run.encounterIds.length,
    vanquishCount: run.settlements.filter((record) => record.settlement === 'vanquish').length,
    catalogueCount: run.settlements.filter((record) => record.settlement === 'catalogue').length,
    rewardTakenCount: run.rewards.filter((record) => !record.skipped).length,
    rewardSkippedCount: run.rewards.filter((record) => record.skipped).length,
    redInkAppliedCount: run.redInkRecords.filter((record) => !record.skipped).length,
    redInkSkippedCount: run.redInkRecords.filter((record) => record.skipped).length,
    verdictRegisterCount: run.verdict.records.filter((record) => record.choiceId === 'register')
      .length,
    verdictRedInkCount: run.verdict.records.filter((record) => record.choiceId === 'red_ink')
      .length,
    verdictEraseCount: run.verdict.records.filter((record) => record.choiceId === 'erase').length,
    restCount: run.rests.records.length,
    shopPurchaseCount: run.shops.records.length,
    incenseMoney: run.currency.incenseMoney,
    playerCurrentForm: run.playerForm.current,
    playerMaxForm: run.playerForm.max,
    ink: run.resources.ink,
    doom: run.resources.doom,
    fracture: run.resources.fracture,
    deckSize: run.deckCards.length,
    artifactCount: run.artifacts.artifacts.length,
    boundArtifactCount: run.artifacts.artifacts.filter(
      (artifact) => artifact.bindingStatus === 'bound',
    ).length,
    pendingArtifactBacklashCount: run.artifacts.artifacts.filter(
      (artifact) => artifact.pendingBacklash,
    ).length,
    bossCleared: Boolean(bossRecord),
    bossEncounterId: bossRecord?.encounterId,
    bossSettlement: bossRecord?.settlement,
    registryThiefSealed: run.verdict.registerEntries.some(
      (entry) => entry.registerRuleId === REGISTRY_THIEF_REGISTER_RULE_ID,
    ),
    registerRuleNames: run.verdict.registerEntries
      .map((entry) => entry.ruleNameKey)
      .filter((nameKey): nameKey is NonNullable<typeof nameKey> => Boolean(nameKey)),
  }
}
