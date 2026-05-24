import type { AltarEffectDefinition, AltarSlot } from './altar'
import type { LocalizationKey } from './common'
import type { AbnormalMoveType } from './enemy'

export type EffectTarget =
  | 'self'
  | 'selected_enemy'
  | 'all_enemies'
  | 'random_enemy'

export type EffectTargetFilter = 'nameless'

export type EffectCondition =
  | {
      readonly type: 'TARGET_HAS_REVEALED_NAME_SLOT'
    }
  | {
      readonly type: 'TARGET_HAS_NO_NAME_SLOT'
    }
  | {
      readonly type: 'TARGET_IS_NAMED'
    }
  | {
      readonly type: 'THIS_TURN_NAMED_ENEMY'
    }
  | {
      readonly type: 'THIS_TURN_COUNTERED_ABNORMAL_MOVE'
    }
  | {
      readonly type: 'THIS_TURN_PLACED_ALTAR'
    }

export type LinzhaoTrigger =
  | 'ask_name_next_break'
  | 'seal_or_counter_break'
  | 'red_ink_engine'

export type CardEffect =
  | BreakShapeEffect
  | ApplyFireMarkEffect
  | TriggerFireMarkEffect
  | ApplyThunderLeadEffect
  | AskNameEffect
  | SealMomentumEffect
  | CounterAbnormalMoveEffect
  | DrawCardsEffect
  | GainIncenseEffect
  | GainInkEffect
  | GainDoomEffect
  | PlaceAltarEffect
  | PlaceLinzhaoEffect

export interface BreakShapeEffect {
  readonly type: 'BREAK_SHAPE'
  readonly target: Extract<EffectTarget, 'selected_enemy' | 'all_enemies' | 'random_enemy'>
  readonly targetFilter?: EffectTargetFilter
  readonly amount: number
  readonly condition?: EffectCondition
}

export interface ApplyFireMarkEffect {
  readonly type: 'APPLY_FIRE_MARK'
  readonly target: Extract<EffectTarget, 'selected_enemy' | 'all_enemies'>
  readonly amount: number
  readonly condition?: EffectCondition
}

export interface TriggerFireMarkEffect {
  readonly type: 'TRIGGER_FIRE_MARK'
  readonly target: Extract<EffectTarget, 'selected_enemy' | 'all_enemies'>
  readonly condition?: EffectCondition
}

export interface ApplyThunderLeadEffect {
  readonly type: 'APPLY_THUNDER_LEAD'
  readonly target: Extract<EffectTarget, 'selected_enemy'>
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

export interface GainInkEffect {
  readonly type: 'GAIN_INK'
  readonly target: Extract<EffectTarget, 'self'>
  readonly amount: number
  readonly condition?: EffectCondition
}

export interface GainDoomEffect {
  readonly type: 'GAIN_DOOM'
  readonly target: Extract<EffectTarget, 'self'>
  readonly amount: number
  readonly condition?: EffectCondition
}

export interface PlaceAltarEffect {
  readonly type: 'PLACE_ALTAR'
  readonly target: Extract<EffectTarget, 'selected_enemy' | 'self'>
  readonly altarSlot: AltarSlot
  readonly altarEffect: AltarEffectDefinition
  readonly condition?: EffectCondition
}

export interface PlaceLinzhaoEffect {
  readonly type: 'PLACE_LINZHAO'
  readonly target: Extract<EffectTarget, 'self'>
  readonly linzhaoId: string
  readonly nameKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
  readonly trigger: LinzhaoTrigger
  readonly amount?: number
  readonly namedAmount?: number
  readonly firstTriggerDraw?: number
  readonly firstTriggerIncense?: number
  readonly recurringIncense?: number
  readonly condition?: EffectCondition
}
