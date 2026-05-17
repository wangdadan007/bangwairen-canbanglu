import type { CardId, EncounterId } from './common'
import type { UnlockState, VictorySettlement } from './battle'

export type TutorialRunStatus = 'active' | 'complete'
export type RewardQuality = 'ordinary' | 'high'

export interface TutorialRunSettlementRecord {
  readonly encounterId: EncounterId
  readonly settlement: VictorySettlement
}

export interface TutorialRewardOption {
  readonly id: string
  readonly type: 'card'
  readonly cardDefinitionId: CardId
  readonly quality: RewardQuality
}

export interface TutorialRewardOffer {
  readonly encounterId: EncounterId
  readonly settlement: VictorySettlement
  readonly quality: RewardQuality
  readonly options: readonly TutorialRewardOption[]
}

export interface TutorialRewardRecord {
  readonly encounterId: EncounterId
  readonly settlement: VictorySettlement
  readonly quality: RewardQuality
  readonly offeredCardDefinitionIds: readonly CardId[]
  readonly selectedCardDefinitionId?: CardId
  readonly skipped: boolean
}

export interface TutorialRunState {
  readonly status: TutorialRunStatus
  readonly currentEncounterIndex: number
  readonly encounterIds: readonly EncounterId[]
  readonly completedEncounterIds: readonly EncounterId[]
  readonly settlements: readonly TutorialRunSettlementRecord[]
  readonly deckDefinitionIds: readonly CardId[]
  readonly unlocks: UnlockState
  readonly pendingReward?: TutorialRewardOffer
  readonly rewards: readonly TutorialRewardRecord[]
}
