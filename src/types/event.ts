import type { CardId, EventId, LocalizationKey, UnlockStageId } from './common'
import type { IncenseSealId } from './incenseSeal'

export type EventFlag = 'ink' | 'fracture' | 'doom' | 'red_ink'

export type EventEffect =
  | {
      readonly type: 'ADD_CARD'
      readonly cardDefinitionId: CardId
    }
  | {
      readonly type: 'REMOVE_CARD'
      readonly cardDefinitionId?: CardId
    }
  | {
      readonly type: 'ADD_FRACTURE'
      readonly amount: number
    }
  | {
      readonly type: 'ADD_INK'
      readonly amount: number
    }
  | {
      readonly type: 'SPEND_INK'
      readonly amount: number
    }
  | {
      readonly type: 'ADD_DOOM'
      readonly amount: number
    }
  | {
      readonly type: 'CREATE_RED_INK_OFFER'
    }
  | {
      readonly type: 'ADD_INCENSE_SEAL'
      readonly incenseSealDefinitionId: IncenseSealId
    }

export interface EventOptionDefinition {
  readonly id: string
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly rewardKey: LocalizationKey
  readonly costKey: LocalizationKey
  readonly requiredUnlockStages?: readonly UnlockStageId[]
  readonly flags: readonly EventFlag[]
  readonly effects: readonly EventEffect[]
}

export interface EventDefinition {
  readonly id: EventId
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly unlockStage: UnlockStageId
  readonly tags: readonly string[]
  readonly options: readonly EventOptionDefinition[]
}
