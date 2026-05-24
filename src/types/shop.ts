import type { ArtifactId, CardId, LocalizationKey, RouteNodeId, UnlockStageId } from './common'
import type { IncenseSealId, IncenseSealInstanceId } from './incenseSeal'
import type { RunDeckCardId } from './run'

export type TutorialShopCurrency = 'incense_money'
export type TutorialShopItemKind =
  | 'card'
  | 'artifact'
  | 'remove_card'
  | 'red_ink_service'
  | 'cleanse_service'
  | 'guard_name_service'
  | 'artifact_maintenance_service'
  | 'incense_seal'

export type TutorialShopShelfSlot =
  | 'card'
  | 'remove_card'
  | 'red_ink_service'
  | 'maintenance_service'
  | 'incense_seal'

export interface TutorialCurrencyState {
  readonly incenseMoney: number
}

export interface TutorialShopItemDefinition {
  readonly id: string
  readonly kind: TutorialShopItemKind
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly cost: number
  readonly currency: TutorialShopCurrency
  readonly cardDefinitionId?: CardId
  readonly artifactDefinitionId?: ArtifactId
  readonly incenseSealDefinitionId?: IncenseSealId
  readonly shelfSlot?: TutorialShopShelfSlot
  readonly requiredUnlockStages?: readonly UnlockStageId[]
  readonly repeatable?: boolean
}

export interface TutorialShopRecord {
  readonly id: string
  readonly routeNodeId?: RouteNodeId
  readonly itemId: string
  readonly kind: TutorialShopItemKind
  readonly cost: number
  readonly purchasedCardDefinitionId?: CardId
  readonly purchasedArtifactDefinitionId?: ArtifactId
  readonly purchasedIncenseSealDefinitionId?: IncenseSealId
  readonly removedDeckCardId?: RunDeckCardId
  readonly removedCardDefinitionId?: CardId
  readonly replacedIncenseSealInstanceId?: IncenseSealInstanceId
  readonly replacedIncenseSealDefinitionId?: IncenseSealId
  readonly createdRedInkOffer: boolean
}

export interface TutorialShopState {
  readonly purchasedItemIds: readonly string[]
  readonly records: readonly TutorialShopRecord[]
}
