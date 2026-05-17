import type {
  CardId,
  EncounterDefinition,
  EnemyId,
  LocalizationKey,
  TutorialRunState,
  TutorialVerdictChoiceId,
  TutorialVerdictOffer,
  TutorialVerdictOption,
  TutorialVerdictRecord,
  TutorialVerdictRegisterEntry,
  TutorialVerdictState,
  VictorySettlement,
} from '../../types'
import { appendRunDeckCard } from './deckResolver'
import { RED_INK_OPTIONS } from './redInkResolver'

export const VERDICT_ERASE_REWARD_CARD_ID: CardId = 'card_split_form_talisman'
export const VERDICT_REGISTER_INCENSE_BONUS = 1
export const VERDICT_ERASE_FRACTURE_DELTA = 1

export const TUTORIAL_VERDICT_OPTIONS: readonly TutorialVerdictOption[] = [
  {
    id: 'register',
    nameKey: 'verdict.register.name',
    rulesTextKey: 'verdict.register.rules',
  },
  {
    id: 'red_ink',
    nameKey: 'verdict.red_ink.name',
    rulesTextKey: 'verdict.red_ink.rules',
  },
  {
    id: 'erase',
    nameKey: 'verdict.erase.name',
    rulesTextKey: 'verdict.erase.rules',
  },
]

export interface TutorialVerdictContext {
  readonly enemyDefinitionId: EnemyId
  readonly enemyNameKey: LocalizationKey
  readonly revealedNameKeys: readonly LocalizationKey[]
}

export interface CreateTutorialVerdictOfferInput extends TutorialVerdictContext {
  readonly encounter: EncounterDefinition
  readonly settlement: VictorySettlement
}

export function createInitialTutorialVerdictState(): TutorialVerdictState {
  return {
    fracture: 0,
    maxIncenseBonus: 0,
    registerEntries: [],
    records: [],
  }
}

export function createTutorialVerdictOffer(
  input: CreateTutorialVerdictOfferInput,
): TutorialVerdictOffer | undefined {
  if (input.settlement !== 'catalogue') {
    return undefined
  }

  return {
    id: `verdict_offer_${input.encounter.id}`,
    encounterId: input.encounter.id,
    enemyDefinitionId: input.enemyDefinitionId,
    enemyNameKey: input.enemyNameKey,
    revealedNameKeys: input.revealedNameKeys,
    options: TUTORIAL_VERDICT_OPTIONS,
  }
}

export function resolveTutorialVerdict(
  run: TutorialRunState,
  choiceId: TutorialVerdictChoiceId,
): TutorialRunState {
  const offer = run.pendingVerdict

  if (!offer) {
    return run
  }

  const option = offer.options.find((candidate) => candidate.id === choiceId)

  if (!option) {
    throw new Error(`Tutorial verdict option is not available: ${choiceId}`)
  }

  const record = createVerdictRecord(run, offer, choiceId)

  if (choiceId === 'register') {
    const entry = createRegisterEntry(run, offer)

    return {
      ...run,
      pendingVerdict: undefined,
      verdict: {
        ...run.verdict,
        maxIncenseBonus: run.verdict.maxIncenseBonus + VERDICT_REGISTER_INCENSE_BONUS,
        registerEntries: [...run.verdict.registerEntries, entry],
        records: [...run.verdict.records, record],
      },
    }
  }

  if (choiceId === 'red_ink') {
    if (run.pendingRedInk) {
      throw new Error('Resolve pending red ink before choosing another red ink verdict')
    }

    return {
      ...run,
      pendingVerdict: undefined,
      pendingRedInk: {
        id: `red_ink_offer_${run.redInkRecords.length + 1}`,
        options: RED_INK_OPTIONS,
      },
      verdict: {
        ...run.verdict,
        records: [...run.verdict.records, record],
      },
    }
  }

  return {
    ...run,
    deckDefinitionIds: [...run.deckDefinitionIds, VERDICT_ERASE_REWARD_CARD_ID],
    deckCards: appendRunDeckCard(run.deckCards, VERDICT_ERASE_REWARD_CARD_ID),
    pendingVerdict: undefined,
    verdict: {
      ...run.verdict,
      fracture: run.verdict.fracture + VERDICT_ERASE_FRACTURE_DELTA,
      records: [...run.verdict.records, record],
    },
  }
}

function createRegisterEntry(
  run: TutorialRunState,
  offer: TutorialVerdictOffer,
): TutorialVerdictRegisterEntry {
  return {
    id: `register_entry_${run.verdict.registerEntries.length + 1}`,
    encounterId: offer.encounterId,
    enemyDefinitionId: offer.enemyDefinitionId,
    enemyNameKey: offer.enemyNameKey,
    revealedNameKeys: offer.revealedNameKeys,
  }
}

function createVerdictRecord(
  run: TutorialRunState,
  offer: TutorialVerdictOffer,
  choiceId: TutorialVerdictChoiceId,
): TutorialVerdictRecord {
  return {
    id: `verdict_record_${run.verdict.records.length + 1}`,
    encounterId: offer.encounterId,
    enemyDefinitionId: offer.enemyDefinitionId,
    choiceId,
    fractureDelta: choiceId === 'erase' ? VERDICT_ERASE_FRACTURE_DELTA : 0,
    maxIncenseBonusDelta: choiceId === 'register' ? VERDICT_REGISTER_INCENSE_BONUS : 0,
    addedCardDefinitionId: choiceId === 'erase' ? VERDICT_ERASE_REWARD_CARD_ID : undefined,
  }
}
