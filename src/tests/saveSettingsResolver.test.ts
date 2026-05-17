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
