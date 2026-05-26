import type { ArtifactCollectionState } from './artifact'
import type { ArtifactId, CardId, EncounterId, EventId, LocalizationKey, UnlockStageId } from './common'
import type { CardAnnotation } from './card'
import type { UnlockState, VictorySettlement } from './battle'
import type { TutorialRestState } from './rest'
import type { TutorialResourceState } from './resource'
import type { PlayableRoleId } from './role'
import type { RouteTendencyId } from './route'
import type { TutorialCurrencyState, TutorialShopState } from './shop'
import type { IncenseSealId, IncenseSealState } from './incenseSeal'
import type {
  TutorialNextBattleStartBonus,
  TutorialVerdictOffer,
  TutorialVerdictState,
} from './verdict'

export type TutorialRunStatus = 'active' | 'complete' | 'failed'
export type TutorialRunFailureReason = 'abandoned' | 'battle_defeat'
export type RewardQuality = 'ordinary' | 'high'
export type RunDeckCardId = string
export type RedInkAnnotationId = string
export type TutorialArtifactOfferStage = 'starter' | 'mid_chapter' | 'boss_clear'
export type ArtifactOfferAnchorId =
  | 'ask_name'
  | 'break_form'
  | 'red_ink'
  | 'altar'
  | 'fracture'
  | 'verdict'
  | 'ink'
  | 'seal_momentum'
  | 'artifact_maintenance'
  | 'route_steady'
  | 'route_catalogue'
  | 'route_fracture'
  | 'route_supply'
  | 'route_high_pressure'

export interface TutorialRunSettlementRecord {
  readonly encounterId: EncounterId
  readonly settlement: VictorySettlement
  readonly incenseMoneyReward: number
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
  readonly incenseMoneyReward: number
  readonly options: readonly TutorialRewardOption[]
}

export interface TutorialRewardRecord {
  readonly encounterId: EncounterId
  readonly settlement: VictorySettlement
  readonly quality: RewardQuality
  readonly incenseMoneyReward: number
  readonly offeredCardDefinitionIds: readonly CardId[]
  readonly selectedCardDefinitionId?: CardId
  readonly skipped: boolean
}

export interface TutorialIncenseSealOption {
  readonly id: string
  readonly incenseSealDefinitionId: IncenseSealId
}

export interface TutorialIncenseSealOffer {
  readonly id: string
  readonly source: 'elite'
  readonly encounterId: EncounterId
  readonly options: readonly TutorialIncenseSealOption[]
}

export interface TutorialIncenseSealOfferRecord {
  readonly id: string
  readonly source: 'elite'
  readonly encounterId: EncounterId
  readonly offeredIncenseSealDefinitionIds: readonly IncenseSealId[]
  readonly selectedIncenseSealDefinitionId?: IncenseSealId
  readonly skipped: boolean
}

export interface RunDeckCard {
  readonly id: RunDeckCardId
  readonly definitionId: CardId
  readonly annotations: readonly CardAnnotation[]
}

export interface TutorialPlayerFormState {
  readonly current: number
  readonly max: number
}

export interface TutorialRedInkOption {
  readonly id: RedInkAnnotationId
  readonly cardDefinitionId?: CardId
  readonly nameKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
  readonly annotation: CardAnnotation
  readonly category?:
    | 'economy'
    | 'ask_name'
    | 'break_form'
    | 'defense'
    | 'altar'
    | 'risk'
  readonly requiredUnlockStages?: readonly UnlockStageId[]
  readonly preferredRoleIds?: readonly PlayableRoleId[]
  readonly preferredRouteTendencyIds?: readonly RouteTendencyId[]
  readonly compatibleCardTags?: readonly string[]
  readonly compatibleEffectTypes?: readonly string[]
  readonly incompatibleCardTags?: readonly string[]
  readonly incompatibleEffectTypes?: readonly string[]
  readonly minimumCardCost?: number
}

export interface TutorialRedInkOffer {
  readonly id: string
  readonly options: readonly TutorialRedInkOption[]
  readonly displayCount?: number
}

export interface TutorialRedInkRecord {
  readonly id: string
  readonly deckCardId?: RunDeckCardId
  readonly cardDefinitionId?: CardId
  readonly annotationId?: RedInkAnnotationId
  readonly skipped: boolean
}

export interface TutorialArtifactOption {
  readonly id: string
  readonly artifactDefinitionId: ArtifactId
  readonly anchorIds?: readonly ArtifactOfferAnchorId[]
}

export interface TutorialArtifactOffer {
  readonly id: string
  readonly stage: TutorialArtifactOfferStage
  readonly contextAnchorIds?: readonly ArtifactOfferAnchorId[]
  readonly options: readonly TutorialArtifactOption[]
}

export interface TutorialArtifactRecord {
  readonly id: string
  readonly stage: TutorialArtifactOfferStage
  readonly offeredArtifactDefinitionIds: readonly ArtifactId[]
  readonly selectedArtifactDefinitionId: ArtifactId
  readonly contextAnchorIds?: readonly ArtifactOfferAnchorId[]
  readonly selectedAnchorIds?: readonly ArtifactOfferAnchorId[]
}

export interface TutorialEventRecord {
  readonly id: string
  readonly eventId: EventId
  readonly optionId: string
  readonly artifactSignalKey?: LocalizationKey
  readonly addedCardDefinitionIds: readonly CardId[]
  readonly addedIncenseSealDefinitionIds: readonly IncenseSealId[]
  readonly removedDeckCardIds: readonly RunDeckCardId[]
  readonly removedCardDefinitionIds: readonly CardId[]
  readonly inkDelta: number
  readonly redInkInkCostReductionApplied?: number
  readonly doomDelta: number
  readonly fractureDelta: number
  readonly createdRedInkOffer: boolean
}

export interface TutorialEventState {
  readonly completedEventIds: readonly EventId[]
  readonly records: readonly TutorialEventRecord[]
}

export interface TutorialRunState {
  readonly status: TutorialRunStatus
  readonly failureReason?: TutorialRunFailureReason
  readonly roleId?: PlayableRoleId
  readonly currentEncounterIndex: number
  readonly encounterIds: readonly EncounterId[]
  readonly completedEncounterIds: readonly EncounterId[]
  readonly settlements: readonly TutorialRunSettlementRecord[]
  readonly deckDefinitionIds: readonly CardId[]
  readonly deckCards: readonly RunDeckCard[]
  readonly artifacts: ArtifactCollectionState
  readonly currency: TutorialCurrencyState
  readonly playerForm: TutorialPlayerFormState
  readonly resources: TutorialResourceState
  readonly incenseSeals: IncenseSealState
  readonly unlocks: UnlockState
  readonly verdict: TutorialVerdictState
  readonly events: TutorialEventState
  readonly rests: TutorialRestState
  readonly shops: TutorialShopState
  readonly pendingVerdict?: TutorialVerdictOffer
  readonly pendingReward?: TutorialRewardOffer
  readonly pendingIncenseSealOffer?: TutorialIncenseSealOffer
  readonly pendingRedInk?: TutorialRedInkOffer
  readonly pendingArtifactOffer?: TutorialArtifactOffer
  readonly rewards: readonly TutorialRewardRecord[]
  readonly redInkRecords: readonly TutorialRedInkRecord[]
  readonly artifactOfferRecords: readonly TutorialArtifactRecord[]
  readonly incenseSealOfferRecords: readonly TutorialIncenseSealOfferRecord[]
  readonly nextBattleStartBonus?: TutorialNextBattleStartBonus
  readonly redInkInkCostReduction?: number
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
  readonly restCount: number
  readonly shopPurchaseCount: number
  readonly incenseMoney: number
  readonly incenseMoneyEarned: number
  readonly incenseSealCount: number
  readonly incenseSealUsedCount: number
  readonly playerCurrentForm: number
  readonly playerMaxForm: number
  readonly ink: number
  readonly doom: number
  readonly fracture: number
  readonly heavyFractureEnding: boolean
  readonly deckSize: number
  readonly artifactCount: number
  readonly boundArtifactCount: number
  readonly pendingArtifactBacklashCount: number
  readonly artifactSignalCount: number
  readonly bossCleared: boolean
  readonly bossEncounterId?: EncounterId
  readonly bossSettlement?: VictorySettlement
  readonly registryThiefSealed: boolean
  readonly registerRuleNames: readonly LocalizationKey[]
}
