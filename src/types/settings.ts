export type WindowMode = 'windowed' | 'fullscreen' | 'borderless'
export type SupportedResolution = '1280x720' | '1600x900' | '1920x1080'
export type SupportedLanguage = 'zh-CN'

export interface AudioSettingsState {
  readonly masterVolume: number
  readonly musicVolume: number
  readonly sfxVolume: number
}

export interface DisplaySettingsState {
  readonly windowMode: WindowMode
  readonly resolution: SupportedResolution
}

export interface SettingsState {
  readonly audio: AudioSettingsState
  readonly display: DisplaySettingsState
  readonly language: SupportedLanguage
  readonly animationsEnabled: boolean
  readonly compactTerms: boolean
}
