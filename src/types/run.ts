import type { CardId, EncounterId, LocalizationKey } from './common'
import type { CardAnnotation } from './card'
import type { UnlockState, VictorySettlement } from './battle'
import type { TutorialVerdictOffer, TutorialVerdictState } from './verdict'

export type TutorialRunStatus = 'active' | 'complete' | 'failed'
export type TutorialRunFailureReason = 'abandoned' | 'battle_defeat'
export type RewardQuality = 'ordinary' | 'high'
export type RunDeckCardId = string
export type RedInkAnnotationId = string

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

export interface RunDeckCard {
  readonly id: RunDeckCardId
  readonly definitionId: CardId
  readonly annotations: readonly CardAnnotation[]
}

export interface TutorialRedInkOption {
  readonly id: RedInkAnnotationId
  readonly nameKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
  readonly annotation: CardAnnotation
}

export interface TutorialRedInkOffer {
  readonly id: string
  readonly options: readonly TutorialRedInkOption[]
}

export interface TutorialRedInkRecord {
  readonly id: string
  readonly deckCardId?: RunDeckCardId
  readonly cardDefinitionId?: CardId
  readonly annotationId?: RedInkAnnotationId
  readonly skipped: boolean
}

export interface TutorialRunState {
  readonly status: TutorialRunStatus
  readonly failureReason?: TutorialRunFailureReason
  readonly currentEncounterIndex: number
  readonly encounterIds: readonly EncounterId[]
  readonly completedEncounterIds: readonly EncounterId[]
  readonly settlements: readonly TutorialRunSettlementRecord[]
  readonly deckDefinitionIds: readonly CardId[]
  readonly deckCards: readonly RunDeckCard[]
  readonly unlocks: UnlockState
  readonly verdict: TutorialVerdictState
  readonly pendingVerdict?: TutorialVerdictOffer
  readonly pendingReward?: TutorialRewardOffer
  readonly pendingRedInk?: TutorialRedInkOffer
  readonly rewards: readonly TutorialRewardRecord[]
  readonly redInkRecords: readonly TutorialRedInkRecord[]
}

export interface TutorialRunSummary {
  readonly status: TutorialRunStatus
  readonly failureReason?: TutorialRunFailureReason
  readonly completedEncounterCount: number
  readonly totalEncounterCount: number
  readonly vanquishCount: number
  readonly catalogueCount: number
  readonly rewardTakenCount: number
  readonly rewardSkippedCount: number
  readonly redInkAppliedCount: number
  readonly redInkSkippedCount: number
  readonly verdictRegisterCount: number
  readonly verdictRedInkCount: number
  readonly verdictEraseCount: number
  readonly fracture: number
  readonly deckSize: number
}
