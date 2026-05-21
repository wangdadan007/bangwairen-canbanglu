import type { ArtifactId, CardId, LocalizationKey } from './common'

export type PlayableRoleId = 'role_hengjian' | 'role_zhaowei' | 'role_lianjin'

export interface PlayableRoleDefinition {
  readonly id: PlayableRoleId
  readonly nameKey: LocalizationKey
  readonly titleKey: LocalizationKey
  readonly archetypeKey: LocalizationKey
  readonly descriptionKey: LocalizationKey
  readonly featureKey: LocalizationKey
  readonly playerMaxForm: number
  readonly maxIncense: number
  readonly difficulty: 1 | 2 | 3
  readonly starterArtifactId: ArtifactId
  readonly starterDeckDefinitionIds: readonly CardId[]
  readonly tags: readonly string[]
}
