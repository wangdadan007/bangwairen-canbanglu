import type { SettingsState, SupportedResolution, WindowMode } from '../../types'

interface SettingsPageProps {
  readonly settings: SettingsState
  readonly onChange: (settings: SettingsState) => void
  readonly onClose: () => void
}

const windowModes: readonly { readonly value: WindowMode; readonly label: string }[] = [
  { value: 'windowed', label: '窗口化' },
  { value: 'fullscreen', label: '全屏' },
  { value: 'borderless', label: '无边框' },
]

const resolutions: readonly SupportedResolution[] = ['1280x720', '1600x900', '1920x1080']

export function SettingsPage({ settings, onChange, onClose }: SettingsPageProps) {
  function updateAudio(key: keyof SettingsState['audio'], value: number) {
    onChange({
      ...settings,
      audio: {
        ...settings.audio,
        [key]: value,
      },
    })
  }

  function updateWindowMode(windowMode: WindowMode) {
    onChange({
      ...settings,
      display: {
        ...settings.display,
        windowMode,
      },
    })
  }

  function updateResolution(resolution: SupportedResolution) {
    onChange({
      ...settings,
      display: {
        ...settings.display,
        resolution,
      },
    })
  }

  return (
    <section className="settings-page" aria-label="设置">
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">设置 / T29</p>
          <h2>案前设置</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onClose}>
          返回
        </button>
      </div>

      <div className="settings-grid">
        <SliderSetting
          label="主音量"
          value={settings.audio.masterVolume}
          onChange={(value) => updateAudio('masterVolume', value)}
        />
        <SliderSetting
          label="音乐"
          value={settings.audio.musicVolume}
          onChange={(value) => updateAudio('musicVolume', value)}
        />
        <SliderSetting
          label="音效"
          value={settings.audio.sfxVolume}
          onChange={(value) => updateAudio('sfxVolume', value)}
        />

        <label className="setting-field">
          <span>窗口模式</span>
          <select
            value={settings.display.windowMode}
            onChange={(event) => updateWindowMode(event.currentTarget.value as WindowMode)}
          >
            {windowModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>

        <label className="setting-field">
          <span>分辨率</span>
          <select
            value={settings.display.resolution}
            onChange={(event) => updateResolution(event.currentTarget.value as SupportedResolution)}
          >
            {resolutions.map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution}
              </option>
            ))}
          </select>
        </label>

        <label className="setting-toggle">
          <input
            checked={settings.animationsEnabled}
            type="checkbox"
            onChange={(event) =>
              onChange({
                ...settings,
                animationsEnabled: event.currentTarget.checked,
              })
            }
          />
          <span>动画</span>
        </label>

        <label className="setting-toggle">
          <input
            checked={settings.compactTerms}
            type="checkbox"
            onChange={(event) =>
              onChange({
                ...settings,
                compactTerms: event.currentTarget.checked,
              })
            }
          />
          <span>术语简写</span>
        </label>
      </div>
    </section>
  )
}

function SliderSetting({
  label,
  value,
  onChange,
}: {
  readonly label: string
  readonly value: number
  readonly onChange: (value: number) => void
}) {
  return (
    <label className="setting-field">
      <span>{label}</span>
      <input
        max={100}
        min={0}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <strong>{value}</strong>
    </label>
  )
}
