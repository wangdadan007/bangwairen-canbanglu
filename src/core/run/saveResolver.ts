import type { RouteState, TutorialRunState, TutorialSaveData } from '../../types'
import {
  type KeyValueStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from './storageResolver'

export const TUTORIAL_SAVE_VERSION = 1
export const TUTORIAL_SAVE_STORAGE_KEY = 'bangwairen.tutorial.save.v1'

export interface CreateTutorialSaveDataInput {
  readonly run: TutorialRunState
  readonly route: RouteState
  readonly savedAt?: string
}

export function createTutorialSaveData({
  run,
  route,
  savedAt = new Date().toISOString(),
}: CreateTutorialSaveDataInput): TutorialSaveData {
  return {
    version: TUTORIAL_SAVE_VERSION,
    savedAt,
    run,
    route,
  }
}

export function readTutorialSaveData(storage: KeyValueStorage): TutorialSaveData | undefined {
  return normalizeTutorialSaveData(readJsonFromStorage(storage, TUTORIAL_SAVE_STORAGE_KEY))
}

export function writeTutorialSaveData(storage: KeyValueStorage, save: TutorialSaveData) {
  writeJsonToStorage(storage, TUTORIAL_SAVE_STORAGE_KEY, save)
}

export function clearTutorialSaveData(storage: KeyValueStorage) {
  storage.removeItem(TUTORIAL_SAVE_STORAGE_KEY)
}

export function normalizeTutorialSaveData(value: unknown): TutorialSaveData | undefined {
  if (!isRecord(value) || value.version !== TUTORIAL_SAVE_VERSION) {
    return undefined
  }

  if (!isTutorialRunStateLike(value.run) || !isRouteStateLike(value.route)) {
    return undefined
  }

  return {
    version: TUTORIAL_SAVE_VERSION,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date(0).toISOString(),
    run: value.run,
    route: value.route,
  }
}

function isTutorialRunStateLike(value: unknown): value is TutorialRunState {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value.status === 'active' || value.status === 'complete' || value.status === 'failed') &&
    typeof value.currentEncounterIndex === 'number' &&
    Array.isArray(value.encounterIds) &&
    Array.isArray(value.completedEncounterIds) &&
    Array.isArray(value.settlements) &&
    Array.isArray(value.deckCards) &&
    isRecord(value.unlocks) &&
    isRecord(value.resources) &&
    isRecord(value.verdict)
  )
}

function isRouteStateLike(value: unknown): value is RouteState {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.routeId === 'string' &&
    (typeof value.currentNodeId === 'string' || value.currentNodeId === undefined) &&
    Array.isArray(value.completedNodeIds) &&
    Array.isArray(value.reachableNodeIds)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
