import type {
  CardId,
  CardInstanceId,
  LocalizationKey,
  UnlockStageId,
} from './common'
import type { CardEffect } from './effect'

export type CardType = 'talisman' | 'edict' | 'ritual' | 'counter' | 'temporary'
export type CardRarity = 'common' | 'uncommon' | 'rare'

export interface CardDefinition {
  readonly id: CardId
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
  readonly cost: number
  readonly type: CardType
  readonly unlockStage: UnlockStageId
  readonly rarity: CardRarity
  readonly effects: readonly CardEffect[]
  readonly tags: readonly string[]
}

export interface CardAnnotation {
  readonly id: string
  readonly nameKey: LocalizationKey
  readonly rulesTextKey?: LocalizationKey
  readonly effects: readonly CardEffect[]
}

export interface CardInstance {
  readonly instanceId: CardInstanceId
  readonly definitionId: CardId
  readonly owner: 'player'
  readonly isTemporary: boolean
  readonly annotations: readonly CardAnnotation[]
}
