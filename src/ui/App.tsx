import { useCallback, useMemo, useState } from 'react'
import { PhaserGame } from '../game/PhaserGame'
import {
  clearTutorialSaveData,
  createDefaultSettingsState,
  createTutorialSaveData,
  readSettingsState,
  readTutorialSaveData,
  writeSettingsState,
  writeTutorialSaveData,
  type KeyValueStorage,
} from '../core'
import type { RouteState, SettingsState, TutorialRunState, TutorialSaveData } from '../types'
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
  const [battleKey, setBattleKey] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const updateSettings = useCallback((nextSettings: SettingsState) => {
    setSettings(nextSettings)

    if (storage) {
      writeSettingsState(storage, nextSettings)
    }
  }, [storage])

  function startNewRun() {
    if (storage) {
      clearTutorialSaveData(storage)
    }

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

  return (
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
          settings={settings}
          onSaveChange={handleSaveChange}
        />
      </section>
    </main>
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

  return `本地进度：第 ${save.run.currentEncounterIndex + 1} / ${
    save.run.encounterIds.length
  } 场，保存于 ${savedAtText}`
}
