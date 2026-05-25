import type {
  ArtifactDefinition,
  CodexRecordEntry,
  CodexRecordKind,
  CodexRecordState,
  CodexRecordUpdate,
  EncounterDefinition,
  EnemyDefinition,
  LocalizationKey,
  TutorialRunState,
  TutorialVerdictRecord,
} from '../../types'
import { getEncounterEnemyDefinitionIds } from './encounterResolver'
import { isHeavyFractureEnding } from './riskThresholdResolver'
import {
  CHAPTER_ONE_BOSS_ENCOUNTER_ID,
  REGISTRY_THIEF_REGISTER_RULE_ID,
} from './runSummary'
import {
  type KeyValueStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from './storageResolver'

export const CODEX_RECORD_VERSION = 1
export const CODEX_RECORD_STORAGE_KEY = 'bangwairen.codex.records.v1'

export interface CodexRecordSourceData {
  readonly encounters: readonly EncounterDefinition[]
  readonly enemies: readonly EnemyDefinition[]
  readonly artifacts: readonly ArtifactDefinition[]
}

export function createInitialCodexRecordState(): CodexRecordState {
  return {
    version: CODEX_RECORD_VERSION,
    entries: [],
  }
}

export function createCodexRecordStateUpdate(
  previous: CodexRecordState,
  run: TutorialRunState,
  sourceData: CodexRecordSourceData,
  recordedAt = new Date().toISOString(),
): CodexRecordUpdate {
  const normalizedPrevious = normalizeCodexRecordState(previous)
  const runEntries = createCodexRunRecordEntries(run, sourceData, recordedAt)
  const previousEntriesById = new Map(
    normalizedPrevious.entries.map((entry) => [entry.id, entry]),
  )
  const newEntries: CodexRecordEntry[] = []

  for (const entry of runEntries) {
    const previousEntry = previousEntriesById.get(entry.id)

    if (!previousEntry) {
      previousEntriesById.set(entry.id, entry)
      newEntries.push(entry)
      continue
    }

    previousEntriesById.set(entry.id, {
      ...previousEntry,
      count: previousEntry.count + 1,
      lastRecordedAt: recordedAt,
    })
  }

  return {
    state: {
      version: CODEX_RECORD_VERSION,
      entries: [...previousEntriesById.values()],
    },
    runEntries,
    newEntries,
  }
}

export function createCodexRunRecordEntries(
  run: TutorialRunState,
  sourceData: CodexRecordSourceData,
  recordedAt = new Date().toISOString(),
): readonly CodexRecordEntry[] {
  const encountersById = new Map(sourceData.encounters.map((encounter) => [encounter.id, encounter]))
  const enemiesById = new Map(sourceData.enemies.map((enemy) => [enemy.id, enemy]))
  const artifactsById = new Map(sourceData.artifacts.map((artifact) => [artifact.id, artifact]))
  const entries: CodexRecordEntry[] = []

  for (const settlementRecord of run.settlements) {
    const encounter = encountersById.get(settlementRecord.encounterId)

    if (!encounter) {
      continue
    }

    for (const enemyDefinitionId of getEncounterEnemyDefinitionIds(encounter)) {
      const enemy = enemiesById.get(enemyDefinitionId)
      const isBoss = encounter.id === CHAPTER_ONE_BOSS_ENCOUNTER_ID || enemy?.tier === 'boss'
      const kind: CodexRecordKind =
        settlementRecord.settlement === 'catalogue'
          ? 'enemy_catalogued'
          : isBoss
            ? 'boss_vanquished'
            : 'enemy_vanquished'

      entries.push(
        createCodexRecordEntry({
          kind,
          subjectId: enemyDefinitionId,
          nameKey: enemy?.nameKey,
          detailKey: getCodexDetailKey(kind),
          recordedAt,
        }),
      )
    }
  }

  if (hasRegistryThiefSeal(run)) {
    const boss = findBossEnemy(sourceData.enemies)
    entries.push(
      createCodexRecordEntry({
        kind: 'boss_sealed',
        subjectId: boss?.id ?? 'enemy_registry_thief',
        nameKey: boss?.nameKey,
        detailKey: getCodexDetailKey('boss_sealed'),
        recordedAt,
      }),
    )
  }

  for (const artifactDefinitionId of getRunArtifactDefinitionIds(run)) {
    const artifact = artifactsById.get(artifactDefinitionId)

    entries.push(
      createCodexRecordEntry({
        kind: 'artifact_claimed',
        subjectId: artifactDefinitionId,
        nameKey: artifact?.nameKey,
        detailKey: getCodexDetailKey('artifact_claimed'),
        recordedAt,
      }),
    )
  }

  for (const artifact of run.artifacts.artifacts) {
    if (artifact.bindingStatus !== 'bound') {
      continue
    }

    const definition = artifactsById.get(artifact.definitionId)
    entries.push(
      createCodexRecordEntry({
        kind: 'artifact_bound',
        subjectId: artifact.definitionId,
        nameKey: definition?.nameKey,
        detailKey: getCodexDetailKey('artifact_bound'),
        recordedAt,
      }),
    )
  }

  for (const verdictRecord of run.verdict.records) {
    const kind = getVerdictRecordKind(verdictRecord)

    if (!kind) {
      continue
    }

    const enemy = enemiesById.get(verdictRecord.enemyDefinitionId)
    entries.push(
      createCodexRecordEntry({
        kind,
        subjectId: getVerdictRecordSubjectId(verdictRecord),
        nameKey: getVerdictRecordNameKey(verdictRecord, run) ?? enemy?.nameKey,
        detailKey: getCodexDetailKey(kind),
        recordedAt,
      }),
    )
  }

  for (const endingSubjectId of getRouteEndingSubjectIds(run)) {
    entries.push(
      createCodexRecordEntry({
        kind: 'route_ending',
        subjectId: endingSubjectId,
        nameKey: `codex.route_ending.${endingSubjectId}.name`,
        detailKey: getCodexDetailKey('route_ending'),
        recordedAt,
      }),
    )
  }

  return uniqueCodexRecordEntries(entries)
}

export function readCodexRecordState(storage: KeyValueStorage): CodexRecordState {
  return normalizeCodexRecordState(readJsonFromStorage(storage, CODEX_RECORD_STORAGE_KEY))
}

export function writeCodexRecordState(
  storage: KeyValueStorage,
  state: CodexRecordState,
) {
  return writeJsonToStorage(storage, CODEX_RECORD_STORAGE_KEY, normalizeCodexRecordState(state))
}

export function normalizeCodexRecordState(value: unknown): CodexRecordState {
  if (!isRecord(value) || value.version !== CODEX_RECORD_VERSION || !Array.isArray(value.entries)) {
    return createInitialCodexRecordState()
  }

  return {
    version: CODEX_RECORD_VERSION,
    entries: value.entries.filter(isCodexRecordEntryLike).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      subjectId: entry.subjectId,
      nameKey: entry.nameKey,
      detailKey: entry.detailKey,
      count: Math.max(1, Math.floor(entry.count)),
      firstRecordedAt: entry.firstRecordedAt,
      lastRecordedAt: entry.lastRecordedAt,
    })),
  }
}

function createCodexRecordEntry({
  kind,
  subjectId,
  nameKey,
  detailKey,
  recordedAt,
}: {
  readonly kind: CodexRecordKind
  readonly subjectId: string
  readonly nameKey?: LocalizationKey
  readonly detailKey?: LocalizationKey
  readonly recordedAt: string
}): CodexRecordEntry {
  return {
    id: `${kind}:${subjectId}`,
    kind,
    subjectId,
    nameKey,
    detailKey,
    count: 1,
    firstRecordedAt: recordedAt,
    lastRecordedAt: recordedAt,
  }
}

function getRunArtifactDefinitionIds(run: TutorialRunState) {
  return [
    ...new Set([
      ...run.artifacts.artifacts.map((artifact) => artifact.definitionId),
      ...run.artifactOfferRecords.map((record) => record.selectedArtifactDefinitionId),
    ]),
  ]
}

function getVerdictRecordKind(
  record: TutorialVerdictRecord,
): CodexRecordKind | undefined {
  if (record.choiceId === 'register') {
    return 'verdict_register'
  }

  if (record.choiceId === 'red_ink') {
    return 'verdict_red_ink'
  }

  if (record.choiceId === 'erase') {
    return 'verdict_erase'
  }

  return undefined
}

function getVerdictRecordSubjectId(record: TutorialVerdictRecord) {
  if (record.choiceId === 'register') {
    return record.registerRuleId ?? record.enemyDefinitionId
  }

  if (record.choiceId === 'erase') {
    return `${record.enemyDefinitionId}:${record.eraseVariantId ?? record.optionId}`
  }

  return record.enemyDefinitionId
}

function getVerdictRecordNameKey(
  record: TutorialVerdictRecord,
  run: TutorialRunState,
): LocalizationKey | undefined {
  if (record.choiceId !== 'register') {
    return undefined
  }

  return run.verdict.registerEntries.find(
    (entry) =>
      entry.registerRuleId === record.registerRuleId ||
      entry.enemyDefinitionId === record.enemyDefinitionId,
  )?.ruleNameKey
}

function getRouteEndingSubjectIds(run: TutorialRunState) {
  if (run.status === 'failed') {
    return ['failed']
  }

  if (run.status !== 'complete') {
    return []
  }

  const subjectIds: string[] = []
  const bossRecord = run.settlements.find(
    (record) => record.encounterId === CHAPTER_ONE_BOSS_ENCOUNTER_ID,
  )

  if (hasRegistryThiefSeal(run)) {
    subjectIds.push('registry_thief_sealed')
  } else if (bossRecord?.settlement === 'catalogue') {
    subjectIds.push('registry_thief_catalogued')
  } else if (bossRecord?.settlement === 'vanquish') {
    subjectIds.push('registry_thief_vanquished')
  } else {
    subjectIds.push('complete')
  }

  if (isHeavyFractureEnding(run.resources)) {
    subjectIds.push('heavy_fracture')
  }

  return subjectIds
}

function hasRegistryThiefSeal(run: TutorialRunState) {
  return run.verdict.registerEntries.some(
    (entry) => entry.registerRuleId === REGISTRY_THIEF_REGISTER_RULE_ID,
  )
}

function findBossEnemy(enemies: readonly EnemyDefinition[]) {
  return enemies.find((enemy) => enemy.id === 'enemy_registry_thief')
}

function getCodexDetailKey(kind: CodexRecordKind) {
  return `codex.detail.${kind}`
}

function uniqueCodexRecordEntries(entries: readonly CodexRecordEntry[]) {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()]
}

const CODEX_RECORD_KINDS: readonly CodexRecordKind[] = [
  'enemy_vanquished',
  'enemy_catalogued',
  'boss_vanquished',
  'boss_sealed',
  'artifact_claimed',
  'artifact_bound',
  'verdict_register',
  'verdict_red_ink',
  'verdict_erase',
  'route_ending',
]

function isCodexRecordEntryLike(value: unknown): value is CodexRecordEntry {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    CODEX_RECORD_KINDS.includes(value.kind as CodexRecordKind) &&
    typeof value.subjectId === 'string' &&
    (typeof value.nameKey === 'string' || value.nameKey === undefined) &&
    (typeof value.detailKey === 'string' || value.detailKey === undefined) &&
    typeof value.count === 'number' &&
    typeof value.firstRecordedAt === 'string' &&
    typeof value.lastRecordedAt === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
