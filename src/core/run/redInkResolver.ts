import { annotateRunDeckCard } from './deckResolver'
import { advanceArtifactProgress, CINNABAR_DOU_ARTIFACT_ID } from './artifactResolver'
import type {
  CardAnnotation,
  CardDefinition,
  CardEffect,
  CardId,
  PlayableRoleId,
  RedInkAnnotationId,
  RouteTendencyId,
  RunDeckCard,
  RunDeckCardId,
  TutorialRedInkOffer,
  TutorialRedInkOption,
  TutorialRedInkRecord,
  TutorialRunState,
  UnlockStageId,
} from '../../types'

export const RED_INK_OFFER_DISPLAY_COUNT = 1

export interface RedInkOfferContext {
  readonly routeTendencyIds?: readonly RouteTendencyId[]
}

interface MainRedInkOptionDefinition {
  readonly cardDefinitionId: CardId
  readonly unlockStage?: UnlockStageId
  readonly category: NonNullable<TutorialRedInkOption['category']>
  readonly effects: readonly CardEffect[]
  readonly preferredRoleIds?: readonly PlayableRoleId[]
  readonly preferredRouteTendencyIds?: readonly RouteTendencyId[]
}

const RED_INK_MAIN_OPTION_DEFINITIONS: readonly MainRedInkOptionDefinition[] = [
  {
    cardDefinitionId: 'card_zhu_fu',
    category: 'break_form',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 3,
        condition: {
          type: 'TARGET_HAS_REVEALED_NAME_SLOT',
        },
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'catalogue'],
  },
  {
    cardDefinitionId: 'card_ask_name',
    category: 'ask_name',
    effects: [
      {
        type: 'DRAW',
        target: 'self',
        count: 1,
        condition: {
          type: 'THIS_CARD_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'steady'],
  },
  {
    cardDefinitionId: 'card_guard_desk_talisman',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_FULLY_SEALED_INCOMING_FORCE',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_cut_supply_talisman',
    category: 'defense',
    effects: [
      {
        type: 'DRAW',
        target: 'self',
        count: 1,
        condition: {
          type: 'THIS_CARD_COUNTERED_ABNORMAL_MOVE',
        },
      },
    ],
    preferredRoleIds: ['role_zhaowei', 'role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_mark_forehead',
    category: 'ask_name',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_lianjin'],
    preferredRouteTendencyIds: ['catalogue', 'fracture'],
  },
  {
    cardDefinitionId: 'card_order_scroll',
    category: 'ask_name',
    effects: [
      {
        type: 'DRAW',
        target: 'self',
        count: 1,
        condition: {
          type: 'THIS_TURN_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['catalogue', 'steady'],
  },
  {
    cardDefinitionId: 'card_quiet_incense',
    category: 'economy',
    effects: [
      {
        type: 'GAIN_INCENSE',
        target: 'self',
        amount: 1,
        condition: {
          type: 'THIS_TURN_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
  },
  {
    cardDefinitionId: 'card_split_form_talisman',
    category: 'break_form',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'TARGET_HAS_REVEALED_NAME_SLOT',
        },
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture'],
  },
  {
    cardDefinitionId: 'card_heavy_split_form_talisman',
    unlockStage: 'stage_run_resources',
    category: 'risk',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'TARGET_IS_NAMED',
        },
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_trace_name_slip',
    unlockStage: 'stage_human_altar',
    category: 'ask_name',
    effects: [
      {
        type: 'ASK_NAME',
        target: 'selected_enemy',
        amount: 1,
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue'],
  },
  {
    cardDefinitionId: 'card_thunder_splinter',
    unlockStage: 'stage_human_altar',
    category: 'break_form',
    effects: [
      {
        type: 'APPLY_THUNDER_LEAD',
        target: 'selected_enemy',
        amount: 1,
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture'],
  },
  {
    cardDefinitionId: 'card_name_hook_charm',
    unlockStage: 'stage_human_altar',
    category: 'ask_name',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'fracture'],
  },
  {
    cardDefinitionId: 'card_heavy_edict',
    unlockStage: 'stage_run_resources',
    category: 'break_form',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'TARGET_IS_NAMED',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_mirror_slip',
    unlockStage: 'stage_run_resources',
    category: 'economy',
    effects: [
      {
        type: 'GAIN_INK',
        target: 'self',
        amount: 1,
        condition: {
          type: 'THIS_TURN_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
  },
  {
    cardDefinitionId: 'card_press_door_charm',
    unlockStage: 'stage_abnormal_boundary',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_FULLY_SEALED_INCOMING_FORCE',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_counterforce_talisman',
    unlockStage: 'stage_run_resources',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_FULLY_SEALED_INCOMING_FORCE',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_lianjin'],
    preferredRouteTendencyIds: ['steady', 'fracture'],
  },
  {
    cardDefinitionId: 'card_joint_seal_tablet',
    unlockStage: 'stage_abnormal_boundary',
    category: 'defense',
    effects: [
      {
        type: 'DRAW',
        target: 'self',
        count: 1,
        condition: {
          type: 'THIS_CARD_FULLY_SEALED_INCOMING_FORCE',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_watch_incense_line',
    unlockStage: 'stage_abnormal_boundary',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_COUNTERED_ABNORMAL_MOVE',
        },
      },
    ],
    preferredRoleIds: ['role_zhaowei', 'role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_red_ink_trial',
    unlockStage: 'stage_human_altar',
    category: 'economy',
    effects: [
      {
        type: 'GAIN_INK',
        target: 'self',
        amount: 1,
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['supply'],
  },
  {
    cardDefinitionId: 'card_sweep_ash_talisman',
    unlockStage: 'stage_human_altar',
    category: 'break_form',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'all_enemies',
        amount: 1,
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_chase_imp_talisman',
    unlockStage: 'stage_human_altar',
    category: 'break_form',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'all_enemies',
        targetFilter: 'nameless',
        amount: 2,
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_ink_rubbing_slip',
    unlockStage: 'stage_run_resources',
    category: 'ask_name',
    effects: [
      {
        type: 'DRAW',
        target: 'self',
        count: 1,
        condition: {
          type: 'THIS_CARD_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
  },
  {
    cardDefinitionId: 'card_borrowed_doom_talisman',
    unlockStage: 'stage_run_resources',
    category: 'risk',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'TARGET_IS_NAMED',
        },
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_human_altar_name_sigil',
    unlockStage: 'stage_human_altar',
    category: 'altar',
    effects: [
      {
        type: 'DRAW',
        target: 'self',
        count: 1,
        condition: {
          type: 'THIS_CARD_PLACED_ALTAR',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
  },
  {
    cardDefinitionId: 'card_earth_altar_watch',
    unlockStage: 'stage_three_altars',
    category: 'altar',
    effects: [
      {
        type: 'SEAL_MOMENTUM',
        target: 'selected_enemy',
        amount: 1,
        condition: {
          type: 'THIS_CARD_PLACED_ALTAR',
        },
      },
    ],
    preferredRoleIds: ['role_zhaowei', 'role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_heaven_altar_oracle',
    unlockStage: 'stage_three_altars',
    category: 'altar',
    effects: [
      {
        type: 'ASK_NAME',
        target: 'selected_enemy',
        amount: 1,
        condition: {
          type: 'THIS_CARD_PLACED_ALTAR',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue'],
  },
  {
    cardDefinitionId: 'card_ink_seal_edict',
    unlockStage: 'stage_run_resources',
    category: 'economy',
    effects: [
      {
        type: 'GAIN_INK',
        target: 'self',
        amount: 1,
        condition: {
          type: 'THIS_TURN_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
  },
  {
    cardDefinitionId: 'card_doom_flash_talisman',
    unlockStage: 'stage_run_resources',
    category: 'risk',
    effects: [
      {
        type: 'APPLY_FIRE_MARK',
        target: 'selected_enemy',
        amount: 1,
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_altar_echo_slip',
    unlockStage: 'stage_human_altar',
    category: 'altar',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_PLACED_ALTAR',
        },
      },
    ],
    preferredRoleIds: ['role_lianjin', 'role_hengjian'],
    preferredRouteTendencyIds: ['fracture', 'catalogue'],
  },
  {
    cardDefinitionId: 'card_earth_counter_charm',
    unlockStage: 'stage_three_altars',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_COUNTERED_ABNORMAL_MOVE',
        },
      },
    ],
    preferredRoleIds: ['role_zhaowei', 'role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_heaven_trace_edict',
    unlockStage: 'stage_three_altars',
    category: 'ask_name',
    effects: [
      {
        type: 'ASK_NAME',
        target: 'selected_enemy',
        amount: 1,
        condition: {
          type: 'THIS_TURN_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue'],
  },
  {
    cardDefinitionId: 'card_artifact_polish_slip',
    unlockStage: 'stage_run_resources',
    category: 'economy',
    effects: [
      {
        type: 'GAIN_INK',
        target: 'self',
        amount: 1,
        condition: {
          type: 'THIS_TURN_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
  },
  {
    cardDefinitionId: 'card_registry_splinter',
    unlockStage: 'stage_run_resources',
    category: 'risk',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'TARGET_IS_NAMED',
        },
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_clean_scroll_charm',
    unlockStage: 'stage_run_resources',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_COUNTERED_ABNORMAL_MOVE',
        },
      },
    ],
    preferredRoleIds: ['role_zhaowei'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_name_net_talisman',
    unlockStage: 'stage_three_altars',
    category: 'defense',
    effects: [
      {
        type: 'SEAL_MOMENTUM',
        target: 'selected_enemy',
        amount: 1,
      },
    ],
    preferredRoleIds: ['role_zhaowei', 'role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_mirror_bind_edict',
    unlockStage: 'stage_three_altars',
    category: 'economy',
    effects: [
      {
        type: 'GAIN_INK',
        target: 'self',
        amount: 1,
        condition: {
          type: 'THIS_TURN_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
  },
  {
    cardDefinitionId: 'card_sealback_talisman',
    unlockStage: 'stage_abnormal_boundary',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_FULLY_SEALED_INCOMING_FORCE',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_cinnabar_return_slip',
    unlockStage: 'stage_human_altar',
    category: 'break_form',
    effects: [
      {
        type: 'TRIGGER_FIRE_MARK',
        target: 'selected_enemy',
      },
    ],
    preferredRoleIds: ['role_lianjin'],
    preferredRouteTendencyIds: ['fracture'],
  },
  {
    cardDefinitionId: 'card_doom_account_tally',
    unlockStage: 'stage_run_resources',
    category: 'risk',
    effects: [
      {
        type: 'GAIN_INK',
        target: 'self',
        amount: 1,
        condition: {
          type: 'THIS_CARD_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_lianjin', 'role_hengjian'],
    preferredRouteTendencyIds: ['fracture', 'catalogue'],
  },
  {
    cardDefinitionId: 'card_whip_follow_charm',
    unlockStage: 'stage_three_altars',
    category: 'break_form',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'TARGET_IS_NAMED',
        },
      },
    ],
    preferredRoleIds: ['role_lianjin', 'role_hengjian'],
    preferredRouteTendencyIds: ['fracture', 'catalogue'],
  },
  {
    cardDefinitionId: 'card_ash_lamp_counterseal',
    unlockStage: 'stage_three_altars',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_COUNTERED_ABNORMAL_MOVE',
        },
      },
    ],
    preferredRoleIds: ['role_zhaowei'],
    preferredRouteTendencyIds: ['steady', 'high_pressure'],
  },
  {
    cardDefinitionId: 'card_registry_rewrite_edict',
    unlockStage: 'stage_run_resources',
    category: 'break_form',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'TARGET_IS_NAMED',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_lianjin'],
    preferredRouteTendencyIds: ['catalogue', 'fracture'],
  },
  {
    cardDefinitionId: 'card_heaven_ink_decree',
    unlockStage: 'stage_three_altars',
    category: 'ask_name',
    effects: [
      {
        type: 'GAIN_INCENSE',
        target: 'self',
        amount: 1,
        condition: {
          type: 'THIS_CARD_NAMED_ENEMY',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_zhaowei'],
    preferredRouteTendencyIds: ['catalogue', 'supply'],
  },
  {
    cardDefinitionId: 'card_altar_threefold_sigil',
    unlockStage: 'stage_three_altars',
    category: 'altar',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_PLACED_ALTAR',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_lianjin'],
    preferredRouteTendencyIds: ['catalogue', 'fracture'],
  },
  {
    cardDefinitionId: 'card_fracture_guard_talisman',
    unlockStage: 'stage_run_resources',
    category: 'defense',
    effects: [
      {
        type: 'BREAK_SHAPE',
        target: 'selected_enemy',
        amount: 2,
        condition: {
          type: 'THIS_CARD_FULLY_SEALED_INCOMING_FORCE',
        },
      },
    ],
    preferredRoleIds: ['role_hengjian', 'role_lianjin'],
    preferredRouteTendencyIds: ['steady', 'fracture'],
  },
]

export const RED_INK_OPTIONS: readonly TutorialRedInkOption[] =
  RED_INK_MAIN_OPTION_DEFINITIONS.map(createMainRedInkOption)

const RED_INK_OPTIONS_BY_CARD_ID: ReadonlyMap<CardId, TutorialRedInkOption> = new Map(
  RED_INK_OPTIONS.flatMap((option) =>
    option.cardDefinitionId ? [[option.cardDefinitionId, option] as const] : [],
  ),
)

function createMainRedInkOption(
  definition: MainRedInkOptionDefinition,
): TutorialRedInkOption {
  const id = getMainRedInkAnnotationId(definition.cardDefinitionId)
  const nameKey = getMainRedInkLocalizationKey(definition.cardDefinitionId, 'name')
  const rulesTextKey = getMainRedInkLocalizationKey(definition.cardDefinitionId, 'rules')

  return {
    id,
    cardDefinitionId: definition.cardDefinitionId,
    nameKey,
    rulesTextKey,
    category: definition.category,
    requiredUnlockStages: [definition.unlockStage ?? 'stage_core'],
    preferredRoleIds: definition.preferredRoleIds,
    preferredRouteTendencyIds: definition.preferredRouteTendencyIds,
    annotation: {
      id,
      nameKey,
      rulesTextKey,
      effects: definition.effects,
    },
  }
}

function getMainRedInkAnnotationId(cardDefinitionId: CardId): RedInkAnnotationId {
  return `red_ink_main_${cardDefinitionId.replace(/^card_/, '')}`
}

function getMainRedInkLocalizationKey(cardDefinitionId: CardId, suffix: 'name' | 'rules') {
  return `red_ink.main.${cardDefinitionId.replace(/^card_/, '')}.${suffix}`
}

export interface ResolveTutorialRedInkInput {
  readonly deckCardId: RunDeckCardId
  readonly annotationId: RedInkAnnotationId
  readonly cardDefinitions?: readonly CardDefinition[]
}

export function createTutorialRedInkOffer(
  run: TutorialRunState,
  context: RedInkOfferContext = {},
): TutorialRedInkOffer {
  return {
    id: `red_ink_offer_${run.redInkRecords.length + 1}`,
    options: orderRedInkOptions(getUnlockedRedInkOptions(run), run, context),
    displayCount: RED_INK_OFFER_DISPLAY_COUNT,
  }
}

export function createTutorialRedInkOfferIfNeeded(
  run: TutorialRunState,
  context: RedInkOfferContext = {},
): TutorialRunState {
  if (!shouldCreateTutorialRedInkOffer(run)) {
    return run
  }

  return {
    ...run,
    pendingRedInk: createTutorialRedInkOffer(run, context),
  }
}

export function reorderPendingTutorialRedInkOffer(
  run: TutorialRunState,
  context: RedInkOfferContext = {},
): TutorialRunState {
  if (!run.pendingRedInk) {
    return run
  }

  return {
    ...run,
    pendingRedInk: {
      ...run.pendingRedInk,
      options: orderRedInkOptions(run.pendingRedInk.options, run, context),
      displayCount: run.pendingRedInk.displayCount ?? RED_INK_OFFER_DISPLAY_COUNT,
    },
  }
}

export function getVisibleRedInkOptionsForDeckCard(
  offer: TutorialRedInkOffer,
  deckCard: RunDeckCard | undefined,
  cardDefinition: CardDefinition | undefined,
): readonly TutorialRedInkOption[] {
  if (!deckCard || !cardDefinition || hasMainRedInkAnnotation(deckCard)) {
    return []
  }

  const option = getMainRedInkOptionForCard(cardDefinition)

  if (!option || !offer.options.some((candidate) => candidate.id === option.id)) {
    return []
  }

  return [option]
}

export function isRedInkOptionCompatibleWithCard(
  option: TutorialRedInkOption,
  cardDefinition: CardDefinition,
) {
  if (!isCardDefinitionEligibleForMainRedInk(cardDefinition)) {
    return false
  }

  return getMainRedInkOptionForCard(cardDefinition)?.id === option.id
}

export function resolveTutorialRedInk(
  run: TutorialRunState,
  input?: ResolveTutorialRedInkInput,
): TutorialRunState {
  const offer = run.pendingRedInk

  if (!offer) {
    return run
  }

  if (!input) {
    return {
      ...run,
      pendingRedInk: undefined,
      redInkRecords: [...run.redInkRecords, createSkippedRecord(run)],
    }
  }

  const targetCard = run.deckCards.find((card) => card.id === input.deckCardId)

  if (!targetCard) {
    throw new Error(`Missing run deck card for red ink: ${input.deckCardId}`)
  }

  const targetCardDefinition = input.cardDefinitions?.find(
    (definition) => definition.id === targetCard.definitionId,
  )
  const option = targetCardDefinition
    ? getMainRedInkOptionForCard(targetCardDefinition)
    : offer.options.find((candidate) => candidate.id === input.annotationId)

  if (!option || option.id !== input.annotationId) {
    throw new Error(`Missing red ink option: ${input.annotationId}`)
  }

  if (!offer.options.some((candidate) => candidate.id === option.id)) {
    throw new Error(`Red ink option is not available in current offer: ${input.annotationId}`)
  }

  if (targetCardDefinition && !isRedInkOptionCompatibleWithCard(option, targetCardDefinition)) {
    throw new Error(`Red ink option is not compatible with card: ${input.annotationId}`)
  }

  if (hasMainRedInkAnnotation(targetCard)) {
    throw new Error(`Run deck card already has a main red ink annotation: ${targetCard.id}`)
  }

  const cinnabarBonus = createCinnabarBonusAnnotation(run)
  const record: TutorialRedInkRecord = {
    id: `red_ink_record_${run.redInkRecords.length + 1}`,
    deckCardId: targetCard.id,
    cardDefinitionId: targetCard.definitionId,
    annotationId: option.id,
    skipped: false,
  }
  const deckCardsWithBaseAnnotation = annotateRunDeckCard(
    run.deckCards,
    targetCard.id,
    option.annotation,
  )
  const deckCards = cinnabarBonus
    ? annotateRunDeckCard(deckCardsWithBaseAnnotation, targetCard.id, cinnabarBonus)
    : deckCardsWithBaseAnnotation
  const progressedArtifacts = advanceArtifactProgress(run.artifacts, [
    {
      kind: 'red_ink_applied',
    },
  ])

  return {
    ...run,
    deckCards,
    artifacts: cinnabarBonus ? markCinnabarTriggered(progressedArtifacts) : progressedArtifacts,
    pendingRedInk: undefined,
    redInkRecords: [...run.redInkRecords, record],
  }
}

function getUnlockedRedInkOptions(run: TutorialRunState) {
  return RED_INK_OPTIONS.filter((option) =>
    (option.requiredUnlockStages ?? []).every((stageId) =>
      run.unlocks.stages.includes(stageId),
    ),
  )
}

function getMainRedInkOptionForCard(
  cardDefinition: CardDefinition,
): TutorialRedInkOption | undefined {
  if (!isCardDefinitionEligibleForMainRedInk(cardDefinition)) {
    return undefined
  }

  return RED_INK_OPTIONS_BY_CARD_ID.get(cardDefinition.id)
}

function isCardDefinitionEligibleForMainRedInk(cardDefinition: CardDefinition) {
  return cardDefinition.type !== 'temporary' && !cardDefinition.tags.includes('temporary')
}

function hasMainRedInkAnnotation(deckCard: RunDeckCard) {
  return deckCard.annotations.some((annotation) =>
    annotation.id.startsWith('red_ink_main_') || LEGACY_MAIN_RED_INK_IDS.has(annotation.id),
  )
}

const LEGACY_MAIN_RED_INK_IDS = new Set([
  'red_ink_return_incense',
  'red_ink_ink_drop',
  'red_ink_trace_name',
  'red_ink_named_draw',
  'red_ink_named_echo',
  'red_ink_revealed_break',
  'red_ink_named_break',
  'red_ink_press_momentum',
  'red_ink_counter_draw',
  'red_ink_altar_ink',
  'red_ink_altar_return',
  'red_ink_doom_burst',
])

function orderRedInkOptions(
  options: readonly TutorialRedInkOption[],
  run: TutorialRunState,
  context: RedInkOfferContext,
) {
  return options
    .map((option, index) => ({
      option,
      index,
      score: getRedInkWeight(option, run.roleId, context.routeTendencyIds ?? []),
      jitter: createStableRedInkJitter(run, option.id),
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.jitter - right.jitter || left.index - right.index,
    )
    .map(({ option }) => option)
}

function getRedInkWeight(
  option: TutorialRedInkOption,
  roleId: PlayableRoleId | undefined,
  routeTendencyIds: readonly RouteTendencyId[],
) {
  const roleWeight = roleId && option.preferredRoleIds?.includes(roleId) ? 4 : 0
  const routeWeight = routeTendencyIds.reduce(
    (total, tendencyId) =>
      total + (option.preferredRouteTendencyIds?.includes(tendencyId) ? 3 : 0),
    0,
  )

  return roleWeight + routeWeight
}

function createStableRedInkJitter(run: TutorialRunState, optionId: string) {
  const seed = [
    run.roleId ?? 'role_none',
    run.redInkRecords.length.toString(),
    run.completedEncounterIds.join(','),
    run.resources.fracture.toString(),
    run.resources.doom.toString(),
    optionId,
  ].join('|')

  return hashString(seed) / 0xffffffff
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createCinnabarBonusAnnotation(run: TutorialRunState): CardAnnotation | undefined {
  const cinnabarDou = run.artifacts.artifacts.find(
    (artifact) => artifact.definitionId === CINNABAR_DOU_ARTIFACT_ID,
  )

  if (!cinnabarDou || cinnabarDou.chargesRemaining <= 0) {
    return undefined
  }

  return {
    id:
      cinnabarDou.bindingStatus === 'bound'
        ? 'red_ink_cinnabar_bound_bonus'
        : 'red_ink_cinnabar_base_bonus',
    nameKey: 'red_ink.cinnabar_bonus.name',
    rulesTextKey:
      cinnabarDou.bindingStatus === 'bound'
        ? 'red_ink.cinnabar_bonus.bound.rules'
        : 'red_ink.cinnabar_bonus.base.rules',
    effects:
      cinnabarDou.bindingStatus === 'bound'
        ? [
            {
              type: 'GAIN_INK',
              target: 'self',
              amount: 1,
            },
            {
              type: 'DRAW',
              target: 'self',
              count: 1,
            },
          ]
        : [
            {
              type: 'GAIN_INK',
              target: 'self',
              amount: 1,
            },
          ],
  }
}

function markCinnabarTriggered(artifacts: TutorialRunState['artifacts']) {
  return {
    artifacts: artifacts.artifacts.map((artifact) =>
      artifact.definitionId === CINNABAR_DOU_ARTIFACT_ID
        ? {
            ...artifact,
            hasTriggeredThisBattle: true,
            triggerCountThisBattle: artifact.triggerCountThisBattle + 1,
          }
        : artifact,
    ),
  }
}

function shouldCreateTutorialRedInkOffer(run: TutorialRunState) {
  return (
    run.status === 'active' &&
    !run.pendingVerdict &&
    !run.pendingReward &&
    !run.pendingRedInk &&
    run.redInkRecords.length === 0 &&
    run.unlocks.stages.includes('stage_red_ink_preview')
  )
}

function createSkippedRecord(run: TutorialRunState): TutorialRedInkRecord {
  return {
    id: `red_ink_record_${run.redInkRecords.length + 1}`,
    skipped: true,
  }
}
