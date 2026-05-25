import type { LocalizationKey } from './common'

export type CodexRecordKind =
  | 'enemy_vanquished'
  | 'enemy_catalogued'
  | 'boss_vanquished'
  | 'boss_sealed'
  | 'artifact_claimed'
  | 'artifact_bound'
  | 'verdict_register'
  | 'verdict_red_ink'
  | 'verdict_erase'
  | 'route_ending'

export interface CodexRecordEntry {
  readonly id: string
  readonly kind: CodexRecordKind
  readonly subjectId: string
  readonly nameKey?: LocalizationKey
  readonly detailKey?: LocalizationKey
  readonly count: number
  readonly firstRecordedAt: string
  readonly lastRecordedAt: string
}

export interface CodexRecordState {
  readonly version: number
  readonly entries: readonly CodexRecordEntry[]
}

export interface CodexRecordUpdate {
  readonly state: CodexRecordState
  readonly runEntries: readonly CodexRecordEntry[]
  readonly newEntries: readonly CodexRecordEntry[]
}
