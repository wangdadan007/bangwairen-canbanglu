import type { RouteState, TutorialRunState, TutorialSaveData } from '../../types'
import { normalizeRunDeckCards } from './deckResolver'
import { createInitialIncenseSealState } from './incenseSealResolver'
import { normalizeTutorialPlayerFormState } from './playerFormResolver'
import { isPlayableRoleId } from './playerRoleResolver'
import {
  type KeyValueStorage,
  removeStorageItem,
  readJsonFromStorage,
  writeJsonToStorage,
} from './storageResolver'

export const TUTORIAL_SAVE_VERSION = 2
export const TUTORIAL_SAVE_STORAGE_KEY = 'bangwairen.tutorial.save.v2'
export const LEGACY_TUTORIAL_SAVE_STORAGE_KEYS: readonly string[] = [
  'bangwairen.tutorial.save.v1',
]

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
  const currentSave = normalizeTutorialSaveData(readJsonFromStorage(storage, TUTORIAL_SAVE_STORAGE_KEY))

  if (currentSave) {
    return currentSave
  }

  for (const legacyKey of LEGACY_TUTORIAL_SAVE_STORAGE_KEYS) {
    const legacySave = normalizeTutorialSaveData(readJsonFromStorage(storage, legacyKey))

    if (legacySave) {
      return legacySave
    }
  }

  return undefined
}

export function writeTutorialSaveData(storage: KeyValueStorage, save: TutorialSaveData) {
  writeJsonToStorage(storage, TUTORIAL_SAVE_STORAGE_KEY, save)
}

export function clearTutorialSaveData(storage: KeyValueStorage) {
  removeStorageItem(storage, TUTORIAL_SAVE_STORAGE_KEY)

  for (const legacyKey of LEGACY_TUTORIAL_SAVE_STORAGE_KEYS) {
    removeStorageItem(storage, legacyKey)
  }
}

export function normalizeTutorialSaveData(value: unknown): TutorialSaveData | undefined {
  if (!isRecord(value) || (value.version !== TUTORIAL_SAVE_VERSION && value.version !== 1)) {
    return undefined
  }

  if (!isTutorialRunStateLike(value.run) || !isRouteStateLike(value.route)) {
    return undefined
  }

  return {
    version: TUTORIAL_SAVE_VERSION,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date(0).toISOString(),
    run: normalizeTutorialRunState(value.run),
    route: normalizeRouteState(value.route),
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

function normalizeTutorialRunState(value: TutorialRunState): TutorialRunState {
  return {
    ...value,
    deckCards: normalizeRunDeckCards(value.deckCards),
    roleId: isPlayableRoleId(value.roleId) ? value.roleId : undefined,
    playerForm: normalizeTutorialPlayerFormState(value.playerForm),
    incenseSeals: value.incenseSeals ?? createInitialIncenseSealState(),
    pendingArtifactOffer: value.pendingArtifactOffer,
    pendingIncenseSealOffer: value.pendingIncenseSealOffer,
    rewards: value.rewards ?? [],
    redInkRecords: value.redInkRecords ?? [],
    artifactOfferRecords: value.artifactOfferRecords ?? [],
    incenseSealOfferRecords: value.incenseSealOfferRecords ?? [],
    nextBattleStartBonus: value.nextBattleStartBonus,
  }
}

function normalizeRouteState(value: RouteState): RouteState {
  return {
    ...value,
    routeTendencyIds: value.routeTendencyIds ?? [],
    encounterSelections: value.encounterSelections ?? {},
  }
}
