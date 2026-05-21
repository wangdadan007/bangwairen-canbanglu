import { useCallback, useEffect, useMemo, useState } from 'react'
import { PhaserGame } from '../game/PhaserGame'
import { gameData } from '../data'
import {
  clearTutorialSaveData,
  createDefaultSettingsState,
  createTutorialSaveData,
  DEFAULT_PLAYABLE_ROLE_ID,
  getPlayableRoleDefinition,
  readSettingsState,
  readTutorialSaveData,
  writeSettingsState,
  writeTutorialSaveData,
  type KeyValueStorage,
} from '../core'
import type {
  PlayableRoleId,
  RouteState,
  SettingsState,
  TutorialRunState,
  TutorialSaveData,
} from '../types'
import { AppErrorBoundary } from './ErrorBoundary'
import { appendBrowserErrorLog, createBrowserErrorLogEntry } from './errorReporting'
import { BattleHud } from './pages/BattleHud'
import { SettingsPage } from './pages/SettingsPage'
import { TitlePage } from './pages/TitlePage'

export function App() {
  const storage = useMemo(() => getBrowserStorage(), [])
  const [settings, setSettings] = useState(() =>
    storage ? readSettingsState(storage) : createDefaultSettingsState(),
  )
  const [availableSave, setAvailableSave] = useState(() =>
    storage ? readTutorialSaveData(storage) : undefined,
  )
  const [initialSave, setInitialSave] = useState<TutorialSaveData | undefined>(availableSave)
  const [selectedRoleId, setSelectedRoleId] = useState<PlayableRoleId>(DEFAULT_PLAYABLE_ROLE_ID)
  const [battleKey, setBattleKey] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const updateSettings = useCallback((nextSettings: SettingsState) => {
    setSettings(nextSettings)

    if (storage) {
      writeSettingsState(storage, nextSettings)
    }
  }, [storage])

  function startNewRun(roleId: PlayableRoleId) {
    if (storage) {
      clearTutorialSaveData(storage)
    }

    setSelectedRoleId(roleId)
    setAvailableSave(undefined)
    setInitialSave(undefined)
    setBattleKey((current) => current + 1)
    setIsSettingsOpen(false)
  }

  function continueSavedRun() {
    const save = storage ? readTutorialSaveData(storage) : availableSave

    if (!save) {
      return
    }

    setAvailableSave(save)
    setInitialSave(save)
    setBattleKey((current) => current + 1)
    setIsSettingsOpen(false)
  }

  const handleSaveChange = useCallback((run: TutorialRunState, route: RouteState) => {
    if (!storage) {
      return
    }

    if (run.status !== 'active') {
      clearTutorialSaveData(storage)
      setAvailableSave(undefined)
      return
    }

    const save = createTutorialSaveData({ run, route })
    writeTutorialSaveData(storage, save)
    setAvailableSave(save)
  }, [storage])

  useEffect(() => {
    if (!storage || typeof window === 'undefined') {
      return undefined
    }

    const handleRuntimeError = (event: ErrorEvent) => {
      appendBrowserErrorLog(
        storage,
        createBrowserErrorLogEntry({
          source: 'runtime_error',
          error: event.error ?? event.message,
          detail: formatRuntimeErrorDetail(event),
        }),
      )
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      appendBrowserErrorLog(
        storage,
        createBrowserErrorLogEntry({
          source: 'unhandled_rejection',
          error: event.reason,
        }),
      )
    }

    window.addEventListener('error', handleRuntimeError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleRuntimeError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [storage])

  return (
    <AppErrorBoundary storage={storage}>
      <main className="app-shell">
        <TitlePage
          hasSave={Boolean(availableSave)}
          saveLabel={getSaveLabel(availableSave)}
          onContinue={continueSavedRun}
          onNewGame={startNewRun}
          onOpenSettings={() => setIsSettingsOpen((current) => !current)}
        />
        {isSettingsOpen ? (
          <SettingsPage
            settings={settings}
            onChange={updateSettings}
            onClose={() => setIsSettingsOpen(false)}
          />
        ) : null}
        <section className="battle-layout" aria-label="第一章试玩区域">
          <PhaserGame />
          <BattleHud
            key={battleKey}
            initialSave={initialSave}
            selectedRoleId={selectedRoleId}
            settings={settings}
            onSaveChange={handleSaveChange}
          />
        </section>
      </main>
    </AppErrorBoundary>
  )
}

function getBrowserStorage(): KeyValueStorage | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.localStorage
}

function getSaveLabel(save: TutorialSaveData | undefined) {
  if (!save) {
    return '暂无本地进度'
  }

  const savedAt = new Date(save.savedAt)
  const savedAtText = Number.isNaN(savedAt.getTime()) ? save.savedAt : savedAt.toLocaleString()

  const role = save.run.roleId ? getPlayableRoleDefinition(save.run.roleId) : undefined
  const roleLabel = role ? `，执簿者 ${gameText(role.nameKey)}` : ''

  return `本地进度：第 ${save.run.currentEncounterIndex + 1} / ${
    save.run.encounterIds.length
  } 场${roleLabel}，保存于 ${savedAtText}`
}

function gameText(key: string) {
  return gameData.localization[key] ?? key
}

function formatRuntimeErrorDetail(event: ErrorEvent) {
  const location = [event.filename, event.lineno, event.colno].filter(Boolean).join(':')

  return location || undefined
}
