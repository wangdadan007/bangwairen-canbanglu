import type { AltarId, CardId, CardInstanceId, EnemyInstanceId } from './common'
import type { AbnormalMoveType } from './enemy'

export type AltarSlot = 'human' | 'earth' | 'heaven'

export type AltarEffectType =
  | 'gain_ink_for_name_progress'
  | 'counter_abnormal_or_gain_ink'
  | 'ask_name_and_gain_ink'
  | 'draw_if_named_or_ink'

export interface AltarEffectDefinition {
  readonly type: AltarEffectType
  readonly amount?: number
  readonly moveType?: AbnormalMoveType
}

export interface AltarState {
  readonly id: AltarId
  readonly slot: AltarSlot
  readonly sourceCardInstanceId: CardInstanceId
  readonly sourceCardDefinitionId: CardId
  readonly targetEnemyInstanceId?: EnemyInstanceId
  readonly effect: AltarEffectDefinition
  readonly placedTurn: number
  readonly remainingTriggers?: number
}
