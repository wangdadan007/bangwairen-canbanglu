import type { RouteState } from './route'
import type { TutorialRunState } from './run'

export interface TutorialSaveData {
  readonly version: number
  readonly savedAt: string
  readonly run: TutorialRunState
  readonly route: RouteState
}
