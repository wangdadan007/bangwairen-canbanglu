export interface TutorialResourceState {
  readonly ink: number
  readonly doom: number
  readonly fracture: number
}

export interface TutorialResourceDelta {
  readonly ink?: number
  readonly doom?: number
  readonly fracture?: number
}
