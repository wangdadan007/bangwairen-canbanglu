import type {
  IncenseSealDefinition,
  IncenseSealId,
  IncenseSealInstance,
  IncenseSealInstanceId,
  IncenseSealRecord,
  IncenseSealState,
  TutorialIncenseSealOffer,
  TutorialIncenseSealOfferRecord,
  TutorialRunState,
} from '../../types'

export const DEFAULT_INCENSE_SEAL_SLOTS = 2

const ELITE_INCENSE_SEAL_IDS: readonly IncenseSealId[] = [
  'seal_clean_scroll',
  'seal_suppress_force',
  'seal_guard_name',
  'seal_renew_incense',
  'seal_counter_abnormal',
  'seal_burn_desk',
]

export function createInitialIncenseSealState(): IncenseSealState {
  return {
    maxSlots: DEFAULT_INCENSE_SEAL_SLOTS,
    seals: [],
    records: [],
  }
}

export function addIncenseSealToRun(
  run: TutorialRunState,
  sealDefinitionId: IncenseSealId,
  source: IncenseSealRecord['source'],
  replaceInstanceId?: IncenseSealInstanceId,
): TutorialRunState {
  const result = addIncenseSealToState(run.incenseSeals, sealDefinitionId, source, replaceInstanceId)

  return {
    ...run,
    incenseSeals: result,
  }
}

export function addIncenseSealToState(
  state: IncenseSealState,
  sealDefinitionId: IncenseSealId,
  source: IncenseSealRecord['source'],
  replaceInstanceId?: IncenseSealInstanceId,
): IncenseSealState {
  const instance: IncenseSealInstance = {
    id: `incense_seal_${state.records.length + 1}_${sealDefinitionId}`,
    definitionId: sealDefinitionId,
  }
  const replacement =
    state.seals.find((seal) => seal.id === replaceInstanceId) ??
    (state.seals.length >= state.maxSlots ? state.seals[0] : undefined)
  const nextSeals = replacement
    ? state.seals.map((seal) => (seal.id === replacement.id ? instance : seal))
    : [...state.seals, instance]

  return {
    ...state,
    seals: nextSeals.slice(0, state.maxSlots),
    records: [
      ...state.records,
      {
        id: `incense_seal_record_${state.records.length + 1}`,
        source,
        result: replacement ? 'replaced' : 'gained',
        sealDefinitionId,
        replacedSealDefinitionId: replacement?.definitionId,
      },
    ],
  }
}

export function removeIncenseSealFromState(
  state: IncenseSealState,
  sealInstanceId: IncenseSealInstanceId,
): IncenseSealState {
  const seal = state.seals.find((candidate) => candidate.id === sealInstanceId)

  if (!seal) {
    return state
  }

  return {
    ...state,
    seals: state.seals.filter((candidate) => candidate.id !== sealInstanceId),
    records: [
      ...state.records,
      {
        id: `incense_seal_record_${state.records.length + 1}`,
        source: 'battle',
        result: 'used',
        sealDefinitionId: seal.definitionId,
      },
    ],
  }
}

export function createEliteIncenseSealOffer(
  run: TutorialRunState,
  encounterId: string,
  incenseSealDefinitions: readonly IncenseSealDefinition[],
): TutorialIncenseSealOffer | undefined {
  if (!encounterId.startsWith('encounter_elite_')) {
    return undefined
  }

  if (run.incenseSealOfferRecords.some((record) => record.encounterId === encounterId)) {
    return undefined
  }

  const availableIds = ELITE_INCENSE_SEAL_IDS.filter((sealId) =>
    incenseSealDefinitions.some((definition) => definition.id === sealId),
  )
  const rotatedIds = rotateIds(availableIds, `${encounterId}:${run.roleId ?? 'default'}`)
  const options = rotatedIds.slice(0, 2).map((sealDefinitionId, index) => ({
    id: `${encounterId}_incense_seal_${index + 1}_${sealDefinitionId}`,
    incenseSealDefinitionId: sealDefinitionId,
  }))

  return options.length > 0
    ? {
        id: `incense_seal_offer_${encounterId}`,
        source: 'elite',
        encounterId,
        options,
      }
    : undefined
}

export function resolveTutorialIncenseSealOffer(
  run: TutorialRunState,
  incenseSealDefinitionId?: IncenseSealId,
): TutorialRunState {
  const offer = run.pendingIncenseSealOffer

  if (!offer) {
    return run
  }

  if (
    incenseSealDefinitionId &&
    !offer.options.some((option) => option.incenseSealDefinitionId === incenseSealDefinitionId)
  ) {
    throw new Error(`Incense seal option is not available: ${incenseSealDefinitionId}`)
  }

  const record: TutorialIncenseSealOfferRecord = {
    id: `incense_seal_offer_record_${run.incenseSealOfferRecords.length + 1}`,
    source: offer.source,
    encounterId: offer.encounterId,
    offeredIncenseSealDefinitionIds: offer.options.map((option) => option.incenseSealDefinitionId),
    selectedIncenseSealDefinitionId: incenseSealDefinitionId,
    skipped: !incenseSealDefinitionId,
  }
  const nextRun = incenseSealDefinitionId
    ? addIncenseSealToRun(run, incenseSealDefinitionId, offer.source)
    : run

  return {
    ...nextRun,
    pendingIncenseSealOffer: undefined,
    incenseSealOfferRecords: [...run.incenseSealOfferRecords, record],
  }
}

function rotateIds(ids: readonly IncenseSealId[], seed: string): readonly IncenseSealId[] {
  if (ids.length <= 1) {
    return ids
  }

  const offset = getStableOffset(seed, ids.length)

  return [...ids.slice(offset), ...ids.slice(0, offset)]
}

function getStableOffset(seed: string, modulo: number): number {
  let hash = 0

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647
  }

  return hash % modulo
}
