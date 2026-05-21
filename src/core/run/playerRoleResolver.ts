import type { PlayableRoleDefinition, PlayableRoleId } from '../../types'
import {
  BONE_MIRROR_ARTIFACT_ID,
  RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
  WHIP_FRAGMENT_ARTIFACT_ID,
} from './artifactResolver'

export const HENGJIAN_ROLE_ID: PlayableRoleId = 'role_hengjian'
export const ZHAOWEI_ROLE_ID: PlayableRoleId = 'role_zhaowei'
export const LIANJIN_ROLE_ID: PlayableRoleId = 'role_lianjin'
export const DEFAULT_PLAYABLE_ROLE_ID: PlayableRoleId = HENGJIAN_ROLE_ID

export const PLAYABLE_ROLE_DEFINITIONS: readonly PlayableRoleDefinition[] = [
  {
    id: HENGJIAN_ROLE_ID,
    nameKey: 'role.hengjian.name',
    titleKey: 'role.hengjian.title',
    archetypeKey: 'role.hengjian.archetype',
    descriptionKey: 'role.hengjian.description',
    featureKey: 'role.hengjian.feature',
    playerMaxForm: 72,
    maxIncense: 3,
    difficulty: 1,
    starterArtifactId: WHIP_FRAGMENT_ARTIFACT_ID,
    starterDeckDefinitionIds: [
      'card_guard_desk_talisman',
      'card_cut_supply_talisman',
      'card_zhu_fu',
      'card_zhu_fu',
      'card_zhu_fu',
      'card_zhu_fu',
      'card_guard_desk_talisman',
      'card_ask_name',
      'card_ask_name',
      'card_mark_forehead',
      'card_order_scroll',
      'card_quiet_incense',
    ],
    tags: ['starter', 'stable', 'catalogue', 'red_ink'],
  },
  {
    id: ZHAOWEI_ROLE_ID,
    nameKey: 'role.zhaowei.name',
    titleKey: 'role.zhaowei.title',
    archetypeKey: 'role.zhaowei.archetype',
    descriptionKey: 'role.zhaowei.description',
    featureKey: 'role.zhaowei.feature',
    playerMaxForm: 64,
    maxIncense: 3,
    difficulty: 2,
    starterArtifactId: BONE_MIRROR_ARTIFACT_ID,
    starterDeckDefinitionIds: [
      'card_guard_desk_talisman',
      'card_cut_supply_talisman',
      'card_zhu_fu',
      'card_zhu_fu',
      'card_zhu_fu',
      'card_guard_desk_talisman',
      'card_ask_name',
      'card_ask_name',
      'card_ask_name',
      'card_mark_forehead',
      'card_mark_forehead',
      'card_order_scroll',
    ],
    tags: ['starter', 'ask_name', 'intent', 'catalogue'],
  },
  {
    id: LIANJIN_ROLE_ID,
    nameKey: 'role.lianjin.name',
    titleKey: 'role.lianjin.title',
    archetypeKey: 'role.lianjin.archetype',
    descriptionKey: 'role.lianjin.description',
    featureKey: 'role.lianjin.feature',
    playerMaxForm: 78,
    maxIncense: 3,
    difficulty: 1,
    starterArtifactId: RED_SASH_FIRE_WHEEL_ARTIFACT_ID,
    starterDeckDefinitionIds: [
      'card_zhu_fu',
      'card_zhu_fu',
      'card_zhu_fu',
      'card_zhu_fu',
      'card_zhu_fu',
      'card_split_form_talisman',
      'card_guard_desk_talisman',
      'card_ask_name',
      'card_mark_forehead',
      'card_order_scroll',
      'card_quiet_incense',
    ],
    tags: ['starter', 'break_form', 'tempo', 'overload'],
  },
]

export function getPlayableRoleDefinition(
  roleId: PlayableRoleId = DEFAULT_PLAYABLE_ROLE_ID,
): PlayableRoleDefinition {
  const role = PLAYABLE_ROLE_DEFINITIONS.find((candidate) => candidate.id === roleId)

  if (!role) {
    throw new Error(`Missing playable role definition: ${roleId}`)
  }

  return role
}

export function isPlayableRoleId(value: unknown): value is PlayableRoleId {
  return PLAYABLE_ROLE_DEFINITIONS.some((role) => role.id === value)
}
