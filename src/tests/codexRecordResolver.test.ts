import { describe, expect, it } from 'vitest'
import {
  advanceTutorialRun,
  CODEX_RECORD_STORAGE_KEY,
  createCodexRecordStateUpdate,
  createCodexRunRecordEntries,
  createInitialArtifactCollection,
  createInitialCodexRecordState,
  createInitialTutorialRunState,
  getRouteBattleEncounterIds,
  normalizeCodexRecordState,
  readCodexRecordState,
  writeCodexRecordState,
  type KeyValueStorage,
} from '../core'
import { gameData } from '../data'

describe('T90 codex record resolver', () => {
  it('creates read-only run records for enemies, boss seal, artifacts, verdicts, and route ending', () => {
    const run = createCompletedBossSealRun()
    const entries = createCodexRunRecordEntries(
      run,
      createCodexSourceData(),
      '2026-05-24T12:00:00.000Z',
    )
    const entryIds = entries.map((entry) => entry.id)

    expect(entryIds).toContain('enemy_vanquished:enemy_paper_wraith')
    expect(entryIds).toContain('enemy_catalogued:enemy_registry_thief')
    expect(entryIds).toContain('boss_sealed:enemy_registry_thief')
    expect(entryIds).toContain('artifact_claimed:artifact_bone_mirror')
    expect(entryIds).toContain('artifact_bound:artifact_bone_mirror')
    expect(entryIds).toContain('verdict_register:register_registry_thief')
    expect(entryIds).toContain('route_ending:registry_thief_sealed')
    expect(run.resources.ink).toBe(0)
  })

  it('merges repeat runs without changing gameplay state or adding numeric progression', () => {
    const run = createCompletedBossSealRun()
    const firstUpdate = createCodexRecordStateUpdate(
      createInitialCodexRecordState(),
      run,
      createCodexSourceData(),
      '2026-05-24T12:00:00.000Z',
    )
    const secondUpdate = createCodexRecordStateUpdate(
      firstUpdate.state,
      run,
      createCodexSourceData(),
      '2026-05-25T12:00:00.000Z',
    )
    const sealedEntry = secondUpdate.state.entries.find(
      (entry) => entry.id === 'boss_sealed:enemy_registry_thief',
    )

    expect(firstUpdate.newEntries.length).toBeGreaterThan(0)
    expect(secondUpdate.newEntries).toEqual([])
    expect(sealedEntry?.count).toBe(2)
    expect(secondUpdate.state).not.toHaveProperty('incenseMoneyBonus')
  })

  it('reads, writes, and normalizes codex records through local storage safely', () => {
    const storage = createMemoryStorage()
    const state = createCodexRecordStateUpdate(
      createInitialCodexRecordState(),
      createCompletedBossSealRun(),
      createCodexSourceData(),
      '2026-05-24T12:00:00.000Z',
    ).state

    writeCodexRecordState(storage, state)

    expect(readCodexRecordState(storage)).toEqual(state)

    storage.setItem(CODEX_RECORD_STORAGE_KEY, '{not json')
    expect(readCodexRecordState(storage)).toEqual(createInitialCodexRecordState())
    expect(normalizeCodexRecordState({ version: 999, entries: [] })).toEqual(
      createInitialCodexRecordState(),
    )
  })
})

function createCompletedBossSealRun() {
  const encounterIds = getRouteBattleEncounterIds(gameData.routes[0])
  const completedRun = encounterIds.reduce(
    (currentRun, _encounterId, index) =>
      advanceTutorialRun(
        currentRun,
        gameData.encounters,
        gameData.tutorialUnlocks,
        index === encounterIds.length - 1 ? 'catalogue' : 'vanquish',
      ),
    createInitialTutorialRunState(gameData.tutorialUnlocks, encounterIds),
  )
  const boneMirror = gameData.artifacts.find((artifact) => artifact.id === 'artifact_bone_mirror')

  if (!boneMirror) {
    throw new Error('Missing artifact_bone_mirror')
  }

  const [boundBoneMirror] = createInitialArtifactCollection([boneMirror]).artifacts

  return {
    ...completedRun,
    artifacts: {
      artifacts: [
        {
          ...boundBoneMirror,
          bindingStatus: 'bound' as const,
          bindProgress: boundBoneMirror.bindCondition.requiredCount,
        },
      ],
    },
    artifactOfferRecords: [
      {
        id: 'artifact_offer_record_1',
        stage: 'starter' as const,
        offeredArtifactDefinitionIds: [
          'artifact_whip_fragment',
          'artifact_bone_mirror',
          'artifact_court_chime',
        ],
        selectedArtifactDefinitionId: 'artifact_bone_mirror',
      },
    ],
    verdict: {
      ...completedRun.verdict,
      registerEntries: [
        {
          id: 'register_entry_registry_thief',
          encounterId: 'encounter_boss_registry_thief',
          enemyDefinitionId: 'enemy_registry_thief',
          enemyNameKey: 'enemy.registry_thief.name',
          revealedNameKeys: ['enemy.registry_thief.name_slot.one'],
          registerRuleId: 'register_registry_thief' as const,
          ruleNameKey: 'verdict.register.rule.registry_thief.name',
          ruleTextKey: 'verdict.register.rule.registry_thief.rules',
        },
      ],
      records: [
        {
          id: 'verdict_record_1',
          encounterId: 'encounter_boss_registry_thief',
          enemyDefinitionId: 'enemy_registry_thief',
          optionId: 'register' as const,
          choiceId: 'register' as const,
          registerRuleId: 'register_registry_thief' as const,
          fractureDelta: 0,
          maxIncenseBonusDelta: 0,
          maxFormBonusDelta: 0,
        },
      ],
    },
  }
}

function createCodexSourceData() {
  return {
    encounters: gameData.encounters,
    enemies: gameData.enemies,
    artifacts: gameData.artifacts,
  }
}

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}
