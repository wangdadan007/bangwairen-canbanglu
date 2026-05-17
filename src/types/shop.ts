import type { CardId, LocalizationKey, RouteNodeId, UnlockStageId } from './common'
import type { RunDeckCardId } from './run'

export type TutorialShopCurrency = 'incense_money'
export type TutorialShopItemKind = 'card' | 'remove_card' | 'red_ink_service'

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
  readonly removedDeckCardId?: RunDeckCardId
  readonly removedCardDefinitionId?: CardId
  readonly createdRedInkOffer: boolean
}

export interface TutorialShopState {
  readonly purchasedItemIds: readonly string[]
  readonly records: readonly TutorialShopRecord[]
}
