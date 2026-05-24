import type { AltarState } from './altar'
import type { ArtifactCollectionState } from './artifact'
import type { CardInstance } from './card'
import type {
  ArtifactId,
  CardId,
  CardInstanceId,
  GameEntityId,
  JsonValue,
  LocalizationKey,
  UnlockStageId,
} from './common'
import type { EnemyState } from './enemy'
import type { LinzhaoTrigger } from './effect'
import type { TutorialResourceState } from './resource'
import type { TutorialRegisterRuleId, TutorialVerdictRegisterEntry } from './verdict'

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
  readonly currentForm: number
  readonly maxForm: number
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
  | 'CARD_ANNOTATION_TRIGGERED'
  | 'CARD_PLAY_REJECTED'
  | 'CARD_DISCARDED'
  | 'CARD_EXHAUSTED'
  | 'LINZHAO_PLACED'
  | 'LINZHAO_TRIGGERED'
  | 'LINZHAO_CLEARED'
  | 'PILE_SHUFFLED'
  | 'INCENSE_GAINED'
  | 'INCENSE_SPENT'
  | 'INK_GAINED'
  | 'INK_SPENT'
  | 'INK_ACTION_REJECTED'
  | 'DOOM_GAINED'
  | 'RISK_THRESHOLD_APPLIED'
  | 'PLAYER_FORM_LOST'
  | 'DEFEAT_SETTLED'
  | 'ALTAR_PLACED'
  | 'ALTAR_TRIGGERED'
  | 'ALTAR_EXPIRED'
  | 'ARTIFACT_TRIGGERED'
  | 'ARTIFACT_BACKLASH_TRIGGERED'
  | 'REGISTER_RULE_TRIGGERED'
  | 'FORM_BROKEN'
  | 'FIRE_MARK_APPLIED'
  | 'FIRE_MARK_TRIGGERED'
  | 'THUNDER_LEAD_APPLIED'
  | 'THUNDER_LEAD_TRIGGERED'
  | 'NAME_ASKED'
  | 'NAME_SLOT_REVEALED'
  | 'ENEMY_NAMED'
  | 'NAME_BREAK_TRIGGERED'
  | 'NAMED_PHASE_TRIGGERED'
  | 'ENEMY_SETTLED'
  | 'INCOMING_FORCE_CREATED'
  | 'INCOMING_FORCE_AFTEREFFECT'
  | 'INCOMING_FORCE_SEALED'
  | 'INTENT_DISCERNED'
  | 'ABNORMAL_MOVE_EXECUTED'
  | 'ABNORMAL_MOVE_COUNTERED'
  | 'VICTORY_SETTLED'
  | 'DEBUG'

export interface PendingArtifactBreakShapeBonus {
  readonly artifactId: ArtifactId
  readonly amount: number
}

export interface PendingRegisterBreakShapeBonus {
  readonly ruleId: TutorialRegisterRuleId
  readonly amount: number
  readonly expiresTurn: number
}

export interface ActiveLinzhaoState {
  readonly id: string
  readonly linzhaoId: string
  readonly nameKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
  readonly trigger: LinzhaoTrigger
  readonly sourceCardInstanceId: CardInstanceId
  readonly sourceCardDefinitionId: CardId
  readonly placedTurn: number
  readonly amount: number
  readonly namedAmount?: number
  readonly firstTriggerDraw: number
  readonly firstTriggerIncense: number
  readonly recurringIncense: number
  readonly triggeredTurnIds: readonly number[]
  readonly triggerCount: number
}

export interface PendingLinzhaoBreakShapeBonus {
  readonly activeLinzhaoId: string
  readonly linzhaoId: string
  readonly nameKey: LocalizationKey
  readonly amount: number
  readonly expiresTurn: number
}

export interface CombatState {
  readonly turn: number
  readonly phase: BattlePhase
  readonly player: PlayerState
  readonly enemies: readonly EnemyState[]
  readonly drawPile: readonly CardInstance[]
  readonly hand: readonly CardInstance[]
  readonly discardPile: readonly CardInstance[]
  readonly exhaustPile: readonly CardInstance[]
  readonly linzhaoPile: readonly CardInstance[]
  readonly nextTurnIncensePenalty: number
  readonly nextTurnIncenseBonus: number
  readonly nextAskNamePenalty: number
  readonly resources: TutorialResourceState
  readonly temporaryResourceDelta: TutorialResourceState
  readonly temporaryPlayerFormDelta: number
  readonly altars: readonly AltarState[]
  readonly linzhao: readonly ActiveLinzhaoState[]
  readonly artifacts: ArtifactCollectionState
  readonly registerEntries: readonly TutorialVerdictRegisterEntry[]
  readonly pendingArtifactBreakShapeBonus?: PendingArtifactBreakShapeBonus
  readonly pendingRegisterBreakShapeBonus?: PendingRegisterBreakShapeBonus
  readonly pendingLinzhaoBreakShapeBonus?: PendingLinzhaoBreakShapeBonus
  readonly triggeredArtifactIds: readonly ArtifactId[]
  readonly actionLog: readonly ActionLogEntry[]
  readonly result: BattleResult
}

export type BattleState = CombatState

export interface PlayCardCommand {
  readonly type: 'PLAY_CARD'
  readonly cardInstanceId: CardInstanceId
  readonly targetEnemyInstanceId?: string
}

export interface SpendInkGuardNameCommand {
  readonly type: 'SPEND_INK_GUARD_NAME'
  readonly targetEnemyInstanceId?: string
}

export interface SpendInkCleanseCommand {
  readonly type: 'SPEND_INK_CLEANSE'
}

export interface EndTurnCommand {
  readonly type: 'END_TURN'
}

export type BattleCommand =
  | PlayCardCommand
  | SpendInkGuardNameCommand
  | SpendInkCleanseCommand
  | EndTurnCommand
