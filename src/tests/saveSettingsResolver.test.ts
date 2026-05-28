import { describe, expect, it } from 'vitest'
import {
  clearTutorialSaveData,
  completeCurrentRouteNode,
  createDefaultSettingsState,
  createInitialRouteState,
  createInitialTutorialRunState,
  createTutorialSaveData,
  normalizeSettingsState,
  readSettingsState,
  readTutorialSaveData,
  LEGACY_TUTORIAL_SAVE_STORAGE_KEYS,
  TUTORIAL_SAVE_STORAGE_KEY,
  TUTORIAL_SAVE_VERSION,
  writeSettingsState,
  writeTutorialSaveData,
  type KeyValueStorage,
} from '../core'
import { gameData } from '../data'

describe('T29 settings and local save MVP', () => {
  it('normalizes settings with compatible fallback values', () => {
    const settings = normalizeSettingsState({
      audio: {
        masterVolume: 120,
        musicVolume: -5,
        sfxVolume: 63.6,
        muted: true,
      },
      display: {
        windowMode: 'invalid',
        resolution: '1600x900',
      },
      language: 'zh-CN',
      animationsEnabled: false,
      compactTerms: true,
    })

    expect(settings.audio).toEqual({
      masterVolume: 100,
      musicVolume: 0,
      sfxVolume: 64,
      muted: true,
    })
    expect(settings.display).toEqual({
      windowMode: 'windowed',
      resolution: '1600x900',
    })
    expect(settings.animationsEnabled).toBe(false)
    expect(settings.compactTerms).toBe(true)
  })

  it('writes and reads settings through storage', () => {
    const storage = createMemoryStorage()
    const settings = {
      ...createDefaultSettingsState(),
      compactTerms: true,
      audio: {
        masterVolume: 55,
        musicVolume: 40,
        sfxVolume: 65,
        muted: true,
      },
    }

    writeSettingsState(storage, settings)

    expect(readSettingsState(storage)).toEqual(settings)
  })

  it('saves and restores the current run and route state', () => {
    const storage = createMemoryStorage()
    const route = gameData.routes[0]
    const routeState = completeCurrentRouteNode(route, createInitialRouteState(route))
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks, [
      'encounter_tutorial_paper_wraith',
      'encounter_boss_registry_thief',
    ])
    const save = createTutorialSaveData({
      run,
      route: routeState,
      savedAt: '2026-05-17T12:00:00.000Z',
    })

    writeTutorialSaveData(storage, save)

    expect(readTutorialSaveData(storage)).toEqual(save)
  })

  it('repairs duplicate run deck card ids while reading saved runs', () => {
    const storage = createMemoryStorage()
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const duplicatedCard = run.deckCards[0]
    const duplicateRun = {
      ...run,
      deckDefinitionIds: [...run.deckDefinitionIds, duplicatedCard.definitionId],
      deckCards: [
        ...run.deckCards,
        {
          ...duplicatedCard,
        },
      ],
    }
    const save = createTutorialSaveData({
      run: duplicateRun,
      route: createInitialRouteState(gameData.routes[0]),
    })

    writeTutorialSaveData(storage, save)

    const restoredSave = readTutorialSaveData(storage)
    const restoredDeckCards = restoredSave?.run.deckCards ?? []
    const restoredDeckCardIds = restoredDeckCards.map((card) => card.id)
    const lastRestoredDeckCard = restoredDeckCards[restoredDeckCards.length - 1]

    expect(new Set(restoredDeckCardIds).size).toBe(restoredDeckCardIds.length)
    expect(lastRestoredDeckCard?.definitionId).toBe(duplicatedCard.definitionId)
    expect(lastRestoredDeckCard?.id).not.toBe(duplicatedCard.id)
  })

  it('normalizes legacy ordinary pending verdict options', () => {
    const storage = createMemoryStorage()
    const run = createInitialTutorialRunState(gameData.tutorialUnlocks)
    const legacyRun = {
      ...run,
      pendingVerdict: {
        id: 'verdict_offer_legacy',
        encounterId: 'encounter_tutorial_paper_wraith',
        enemyDefinitionId: 'enemy_paper_wraith',
        enemyNameKey: 'enemy.paper_wraith.name',
        revealedNameKeys: [],
        options: [
          {
            id: 'register',
            choiceId: 'register',
            nameKey: 'verdict.register.name',
            rulesTextKey: 'verdict.register.rules',
          },
          {
            id: 'erase',
            choiceId: 'erase',
            eraseVariantId: 'erase',
            nameKey: 'verdict.erase.name',
            rulesTextKey: 'verdict.erase.rules',
          },
          {
            id: 'erase_heavy_split_form',
            choiceId: 'erase',
            eraseVariantId: 'erase_heavy_split_form',
            nameKey: 'verdict.erase.heavy_split_form.name',
            rulesTextKey: 'verdict.erase.heavy_split_form.rules',
          },
        ],
      } as const,
    }
    const save = createTutorialSaveData({
      run: legacyRun,
      route: createInitialRouteState(gameData.routes[0]),
    })

    writeTutorialSaveData(storage, save)

    expect(readTutorialSaveData(storage)?.run.pendingVerdict?.options.map((option) => option.id)).toEqual([
      'erase',
    ])
  })

  it('falls back safely for incompatible or malformed saves', () => {
    const storage = createMemoryStorage()

    storage.setItem(
      TUTORIAL_SAVE_STORAGE_KEY,
      JSON.stringify({
        version: TUTORIAL_SAVE_VERSION + 1,
        run: {},
        route: {},
      }),
    )
    expect(readTutorialSaveData(storage)).toBeUndefined()

    storage.setItem(TUTORIAL_SAVE_STORAGE_KEY, '{not json')
    expect(readTutorialSaveData(storage)).toBeUndefined()

    const save = createTutorialSaveData({
      run: createInitialTutorialRunState(gameData.tutorialUnlocks),
      route: createInitialRouteState(gameData.routes[0]),
    })
    writeTutorialSaveData(storage, save)
    clearTutorialSaveData(storage)
    expect(readTutorialSaveData(storage)).toBeUndefined()
  })

  it('migrates compatible legacy saves to the current normalized version', () => {
    const storage = createMemoryStorage()
    const legacySave = {
      version: 1,
      savedAt: '2026-05-17T12:00:00.000Z',
      run: createInitialTutorialRunState(gameData.tutorialUnlocks),
      route: createInitialRouteState(gameData.routes[0]),
    }

    storage.setItem(LEGACY_TUTORIAL_SAVE_STORAGE_KEYS[0], JSON.stringify(legacySave))

    expect(readTutorialSaveData(storage)).toEqual({
      ...legacySave,
      version: TUTORIAL_SAVE_VERSION,
      route: {
        ...legacySave.route,
        encounterSelections: legacySave.route.encounterSelections ?? {},
      },
      run: {
        ...legacySave.run,
        playerForm: {
          current: 72,
          max: 72,
        },
      },
    })
  })

  it('treats storage read and write exceptions as safe fallbacks', () => {
    const throwingStorage = createThrowingStorage()

    expect(readSettingsState(throwingStorage)).toEqual(createDefaultSettingsState())
    expect(readTutorialSaveData(throwingStorage)).toBeUndefined()
    expect(() => writeSettingsState(throwingStorage, createDefaultSettingsState())).not.toThrow()
    expect(() =>
      writeTutorialSaveData(
        throwingStorage,
        createTutorialSaveData({
          run: createInitialTutorialRunState(gameData.tutorialUnlocks),
          route: createInitialRouteState(gameData.routes[0]),
        }),
      ),
    ).not.toThrow()
    expect(() => clearTutorialSaveData(throwingStorage)).not.toThrow()
  })
})

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

function createThrowingStorage(): KeyValueStorage {
  return {
    getItem() {
      throw new Error('storage read unavailable')
    },
    setItem() {
      throw new Error('storage write unavailable')
    },
    removeItem() {
      throw new Error('storage remove unavailable')
    },
  }
}
