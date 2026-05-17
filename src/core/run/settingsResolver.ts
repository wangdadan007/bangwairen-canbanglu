import type {
  SettingsState,
  SupportedLanguage,
  SupportedResolution,
  WindowMode,
} from '../../types'
import {
  type KeyValueStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from './storageResolver'

export const SETTINGS_STORAGE_KEY = 'bangwairen.settings.v1'

const WINDOW_MODES: readonly WindowMode[] = ['windowed', 'fullscreen', 'borderless']
const RESOLUTIONS: readonly SupportedResolution[] = ['1280x720', '1600x900', '1920x1080']
const LANGUAGES: readonly SupportedLanguage[] = ['zh-CN']

export function createDefaultSettingsState(): SettingsState {
  return {
    audio: {
      masterVolume: 80,
      musicVolume: 70,
      sfxVolume: 80,
    },
    display: {
      windowMode: 'windowed',
      resolution: '1920x1080',
    },
    language: 'zh-CN',
    animationsEnabled: true,
    compactTerms: false,
  }
}

export function readSettingsState(storage: KeyValueStorage): SettingsState {
  return normalizeSettingsState(readJsonFromStorage(storage, SETTINGS_STORAGE_KEY))
}

export function writeSettingsState(storage: KeyValueStorage, settings: SettingsState) {
  writeJsonToStorage(storage, SETTINGS_STORAGE_KEY, normalizeSettingsState(settings))
}

export function normalizeSettingsState(value: unknown): SettingsState {
  const defaults = createDefaultSettingsState()

  if (!isRecord(value)) {
    return defaults
  }

  const audio = isRecord(value.audio) ? value.audio : {}
  const display = isRecord(value.display) ? value.display : {}

  return {
    audio: {
      masterVolume: clampVolume(audio.masterVolume, defaults.audio.masterVolume),
      musicVolume: clampVolume(audio.musicVolume, defaults.audio.musicVolume),
      sfxVolume: clampVolume(audio.sfxVolume, defaults.audio.sfxVolume),
    },
    display: {
      windowMode: pickString(display.windowMode, WINDOW_MODES, defaults.display.windowMode),
      resolution: pickString(display.resolution, RESOLUTIONS, defaults.display.resolution),
    },
    language: pickString(value.language, LANGUAGES, defaults.language),
    animationsEnabled:
      typeof value.animationsEnabled === 'boolean'
        ? value.animationsEnabled
        : defaults.animationsEnabled,
    compactTerms: typeof value.compactTerms === 'boolean' ? value.compactTerms : defaults.compactTerms,
  }
}

function clampVolume(value: unknown, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

function pickString<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
