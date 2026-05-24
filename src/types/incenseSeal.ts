import type { LocalizationKey } from './common'

export type IncenseSealId =
  | 'seal_guard_name'
  | 'seal_clean_scroll'
  | 'seal_suppress_force'
  | 'seal_counter_abnormal'
  | 'seal_renew_incense'
  | 'seal_burn_desk'

export type IncenseSealEffectType =
  | 'guard_name'
  | 'cleanse_fouled_scroll'
  | 'suppress_incoming_force'
  | 'counter_abnormal_move'
  | 'gain_incense_draw'
  | 'break_shape'

export type IncenseSealTargetMode = 'none' | 'selected_enemy'

export interface IncenseSealDefinition {
  readonly id: IncenseSealId
  readonly nameKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
  readonly effectType: IncenseSealEffectType
  readonly targetMode: IncenseSealTargetMode
  readonly amount?: number
  readonly namedAmount?: number
  readonly drawCount?: number
  readonly rarity?: 'common' | 'uncommon' | 'rare'
  readonly price: number
}

export type IncenseSealInstanceId = string

export interface IncenseSealInstance {
  readonly id: IncenseSealInstanceId
  readonly definitionId: IncenseSealId
}

export interface IncenseSealState {
  readonly maxSlots: number
  readonly seals: readonly IncenseSealInstance[]
  readonly records: readonly IncenseSealRecord[]
}

export interface IncenseSealRecord {
  readonly id: string
  readonly source: 'shop' | 'event' | 'elite' | 'battle'
  readonly result: 'gained' | 'replaced' | 'used' | 'skipped'
  readonly sealDefinitionId?: IncenseSealId
  readonly replacedSealDefinitionId?: IncenseSealId
}
