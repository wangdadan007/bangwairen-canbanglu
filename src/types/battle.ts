import type { CardInstance } from './card'
import type { CardInstanceId, GameEntityId, JsonValue, UnlockStageId } from './common'
import type { EnemyState } from './enemy'

export type BattlePhase =
  | 'setup'
  | 'player_turn'
  | 'enemy_turn'
  | 'victory'
  | 'defeat'

export type VictorySettlement = 'vanquish' | 'catalogue'

export type BattleResult =
  | {
      readonly status: 'ongoing'
    }
  | {
      readonly status: 'victory'
      readonly settlement: VictorySettlement
      readonly enemyInstanceId: string
    }
  | {
      readonly status: 'defeat'
      readonly reasonKey?: string
    }

export interface UnlockState {
  readonly stages: readonly UnlockStageId[]
  readonly keywords: readonly string[]
}

export interface PlayerState {
  readonly incense: number
  readonly maxIncense: number
  readonly deck: readonly CardInstance[]
  readonly unlocks: UnlockState
}

export interface ActionLogEntry {
  readonly id: string
  readonly sequence: number
  readonly type: ActionLogType
  readonly turn: number
  readonly phase: BattlePhase
  readonly sourceId?: GameEntityId
  readonly targetId?: GameEntityId
  readonly payload: ActionLogPayload
}

export type ActionLogPayload = Readonly<Record<string, JsonValue>>

export type ActionLogType =
  | 'BATTLE_STARTED'
  | 'TURN_STARTED'
  | 'TURN_ENDED'
  | 'CARD_DRAWN'
  | 'CARD_PLAYED'
  | 'CARD_PLAY_REJECTED'
  | 'CARD_DISCARDED'
  | 'CARD_EXHAUSTED'
  | 'PILE_SHUFFLED'
  | 'INCENSE_GAINED'
  | 'INCENSE_SPENT'
  | 'FORM_BROKEN'
  | 'NAME_ASKED'
  | 'NAME_SLOT_REVEALED'
  | 'ENEMY_NAMED'
  | 'NAME_BREAK_TRIGGERED'
  | 'INCOMING_FORCE_CREATED'
  | 'INCOMING_FORCE_SEALED'
  | 'ABNORMAL_MOVE_EXECUTED'
  | 'VICTORY_SETTLED'
  | 'DEBUG'

export interface CombatState {
  readonly turn: number
  readonly phase: BattlePhase
  readonly player: PlayerState
  readonly enemies: readonly EnemyState[]
  readonly drawPile: readonly CardInstance[]
  readonly hand: readonly CardInstance[]
  readonly discardPile: readonly CardInstance[]
  readonly exhaustPile: readonly CardInstance[]
  readonly actionLog: readonly ActionLogEntry[]
  readonly result: BattleResult
}

export type BattleState = CombatState

export interface PlayCardCommand {
  readonly type: 'PLAY_CARD'
  readonly cardInstanceId: CardInstanceId
  readonly targetEnemyInstanceId?: string
}

export interface EndTurnCommand {
  readonly type: 'END_TURN'
}

export type BattleCommand = PlayCardCommand | EndTurnCommand
