import type { EncounterId } from './common'
import type { UnlockState, VictorySettlement } from './battle'

export type TutorialRunStatus = 'active' | 'complete'

export interface TutorialRunSettlementRecord {
  readonly encounterId: EncounterId
  readonly settlement: VictorySettlement
}

export interface TutorialRunState {
  readonly status: TutorialRunStatus
  readonly currentEncounterIndex: number
  readonly encounterIds: readonly EncounterId[]
  readonly completedEncounterIds: readonly EncounterId[]
  readonly settlements: readonly TutorialRunSettlementRecord[]
  readonly unlocks: UnlockState
}
