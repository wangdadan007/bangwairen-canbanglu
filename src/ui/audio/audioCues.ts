import { useEffect, useRef } from 'react'
import type { SettingsState } from '../../types'

export type AudioCueKind =
  | 'break'
  | 'ask_name'
  | 'named'
  | 'settlement'
  | 'verdict'
  | 'artifact'
  | 'backlash'
  | 'pressure'
  | 'preview'
  | 'music_preview'

export interface AudioCue {
  readonly id: string
  readonly kind: AudioCueKind
}

let sharedAudioContext: AudioContext | undefined

export function useAudioCue(cue: AudioCue | undefined, settings: SettingsState | undefined) {
  const lastCueIdRef = useRef(cue?.id)

  useEffect(() => {
    if (!cue || !settings || lastCueIdRef.current === cue.id) {
      return
    }

    lastCueIdRef.current = cue.id
    playAudioCue(cue.kind, settings)
  }, [cue, settings])
}

export function playPreviewAudioCue(settings: SettingsState) {
  playAudioCue('preview', settings)
}

export function playPreviewMusicCue(settings: SettingsState) {
  playAudioCue('music_preview', settings, 'music')
}

function playAudioCue(kind: AudioCueKind, settings: SettingsState, channel: 'music' | 'sfx' = 'sfx') {
  const volume = getEffectiveVolume(settings, channel)

  if (volume <= 0) {
    return
  }

  const context = getAudioContext()

  if (!context) {
    return
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined)
  }

  const profile = getCueProfile(kind)
  const now = context.currentTime
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = profile.type
  oscillator.frequency.setValueAtTime(profile.startFrequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(profile.endFrequency, now + profile.duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume * profile.gain, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + profile.duration + 0.02)
}

function getEffectiveVolume(settings: SettingsState, channel: 'music' | 'sfx') {
  if (settings.audio.muted) {
    return 0
  }

  const channelVolume = channel === 'music' ? settings.audio.musicVolume : settings.audio.sfxVolume

  return (settings.audio.masterVolume / 100) * (channelVolume / 100)
}

function getAudioContext() {
  if (typeof window === 'undefined') {
    return undefined
  }

  const audioWindow = window as Window & {
    readonly webkitAudioContext?: typeof AudioContext
  }
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext

  if (!AudioContextConstructor) {
    return undefined
  }

  sharedAudioContext ??= new AudioContextConstructor()

  return sharedAudioContext
}

function getCueProfile(kind: AudioCueKind) {
  if (kind === 'ask_name') {
    return {
      type: 'sine' as OscillatorType,
      startFrequency: 520,
      endFrequency: 740,
      duration: 0.11,
      gain: 0.052,
    }
  }

  if (kind === 'named') {
    return {
      type: 'triangle' as OscillatorType,
      startFrequency: 440,
      endFrequency: 960,
      duration: 0.16,
      gain: 0.058,
    }
  }

  if (kind === 'settlement' || kind === 'verdict') {
    return {
      type: 'sine' as OscillatorType,
      startFrequency: 330,
      endFrequency: 220,
      duration: 0.18,
      gain: 0.05,
    }
  }

  if (kind === 'artifact') {
    return {
      type: 'triangle' as OscillatorType,
      startFrequency: 660,
      endFrequency: 880,
      duration: 0.12,
      gain: 0.047,
    }
  }

  if (kind === 'backlash' || kind === 'pressure') {
    return {
      type: 'sawtooth' as OscillatorType,
      startFrequency: 180,
      endFrequency: 92,
      duration: 0.15,
      gain: 0.032,
    }
  }

  if (kind === 'preview') {
    return {
      type: 'triangle' as OscillatorType,
      startFrequency: 390,
      endFrequency: 620,
      duration: 0.14,
      gain: 0.05,
    }
  }

  if (kind === 'music_preview') {
    return {
      type: 'sine' as OscillatorType,
      startFrequency: 260,
      endFrequency: 390,
      duration: 0.34,
      gain: 0.04,
    }
  }

  return {
    type: 'square' as OscillatorType,
    startFrequency: 220,
    endFrequency: 150,
    duration: 0.09,
    gain: 0.04,
  }
}
