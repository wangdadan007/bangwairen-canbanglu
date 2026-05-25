import type { ArtifactId, CardId, LocalizationKey, RouteNodeId, UnlockStageId } from './common'
import type { RunDeckCardId } from './run'

export type TutorialRestOptionId =
  | 'restore_form'
  | 'remove_card'
  | 'red_ink_service'
  | 'maintain_artifact'

export interface TutorialRestOption {
  readonly id: TutorialRestOptionId
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly rewardKey: LocalizationKey
  readonly costKey: LocalizationKey
  readonly requiredUnlockStages?: readonly UnlockStageId[]
}

export interface TutorialRestRecord {
  readonly id: string
  readonly routeNodeId?: RouteNodeId
  readonly optionId: TutorialRestOptionId
  readonly removedDeckCardId?: RunDeckCardId
  readonly removedCardDefinitionId?: CardId
  readonly maintainedArtifactId?: ArtifactId
  readonly maintainedArtifactDefinitionId?: ArtifactId
  readonly clearedArtifactBacklash: boolean
  readonly inkDelta: number
  readonly redInkInkCostReductionApplied?: number
  readonly formRestored: number
  readonly playerCurrentFormAfter: number
  readonly playerMaxFormAfter: number
  readonly createdRedInkOffer: boolean
}

export interface TutorialRestState {
  readonly records: readonly TutorialRestRecord[]
}
