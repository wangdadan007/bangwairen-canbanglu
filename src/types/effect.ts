import type { AbnormalMoveType } from './enemy'

export type EffectTarget =
  | 'self'
  | 'selected_enemy'
  | 'all_enemies'
  | 'random_enemy'

export type EffectCondition =
  | {
      readonly type: 'TARGET_HAS_REVEALED_NAME_SLOT'
    }
  | {
      readonly type: 'TARGET_HAS_NO_NAME_SLOT'
    }
  | {
      readonly type: 'THIS_TURN_NAMED_ENEMY'
    }

export type CardEffect =
  | BreakShapeEffect
  | AskNameEffect
  | SealMomentumEffect
  | CounterAbnormalMoveEffect
  | DrawCardsEffect
  | GainIncenseEffect

export interface BreakShapeEffect {
  readonly type: 'BREAK_SHAPE'
  readonly target: Extract<EffectTarget, 'selected_enemy' | 'all_enemies' | 'random_enemy'>
  readonly amount: number
  readonly condition?: EffectCondition
}

export interface AskNameEffect {
  readonly type: 'ASK_NAME'
  readonly target: Extract<EffectTarget, 'selected_enemy'>
  readonly amount: number
  readonly condition?: EffectCondition
}

export interface SealMomentumEffect {
  readonly type: 'SEAL_MOMENTUM'
  readonly target: Extract<EffectTarget, 'selected_enemy' | 'all_enemies'>
  readonly amount: number
  readonly condition?: EffectCondition
}

export interface CounterAbnormalMoveEffect {
  readonly type: 'COUNTER_ABNORMAL_MOVE'
  readonly target: Extract<EffectTarget, 'selected_enemy' | 'all_enemies'>
  readonly moveType?: AbnormalMoveType
  readonly condition?: EffectCondition
}

export interface DrawCardsEffect {
  readonly type: 'DRAW'
  readonly target: Extract<EffectTarget, 'self'>
  readonly count: number
  readonly condition?: EffectCondition
}

export interface GainIncenseEffect {
  readonly type: 'GAIN_INCENSE'
  readonly target: Extract<EffectTarget, 'self'>
  readonly amount: number
  readonly condition?: EffectCondition
}
