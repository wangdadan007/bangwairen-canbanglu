import type {
  CardId,
  EncounterDefinition,
  EnemyId,
  LocalizationKey,
  TutorialEraseVariantId,
  TutorialNextBattleStartBonus,
  TutorialRunState,
  TutorialVerdictOffer,
  TutorialVerdictOptionId,
  TutorialVerdictOption,
  TutorialRegisterRuleId,
  TutorialVerdictRecord,
  TutorialVerdictRegisterEntry,
  TutorialVerdictState,
  VictorySettlement,
} from '../../types'
import {
  advanceArtifactProgress,
  getEraseRewardBonusCount,
  markArtifactOverloads,
} from './artifactResolver'
import { appendRunDeckCard } from './deckResolver'
import { increaseTutorialPlayerMaxForm } from './playerFormResolver'
import { createTutorialRedInkOffer } from './redInkResolver'
import { applyTutorialResourceDelta } from './resourceResolver'

export const VERDICT_ERASE_REWARD_CARD_ID: CardId = 'card_split_form_talisman'
export const VERDICT_ERASE_HEAVY_REWARD_CARD_ID: CardId = 'card_heavy_split_form_talisman'
export const VERDICT_REGISTER_INCENSE_BONUS = 1
export const VERDICT_REGISTER_MAX_FORM_BONUS = 4
export const VERDICT_ERASE_FRACTURE_DELTA = 1
export const VERDICT_ERASE_INK_DELTA = 2
export const VERDICT_ERASE_HEAVY_DOOM_DELTA = 1

export const REGISTER_RULE_BY_ENEMY_ID: Readonly<Partial<Record<EnemyId, {
  readonly id: TutorialRegisterRuleId
  readonly nameKey: LocalizationKey
  readonly rulesTextKey: LocalizationKey
}>>> = {
  enemy_incense_clerk: {
    id: 'register_incense_clerk',
    nameKey: 'verdict.register.rule.incense_clerk.name',
    rulesTextKey: 'verdict.register.rule.incense_clerk.rules',
  },
  enemy_fire_fleeing_name: {
    id: 'register_fire_fleeing_name',
    nameKey: 'verdict.register.rule.fire_fleeing_name.name',
    rulesTextKey: 'verdict.register.rule.fire_fleeing_name.rules',
  },
  enemy_dipper_empty_shell: {
    id: 'register_dipper_empty_shell',
    nameKey: 'verdict.register.rule.dipper_empty_shell.name',
    rulesTextKey: 'verdict.register.rule.dipper_empty_shell.rules',
  },
  enemy_registry_thief: {
    id: 'register_registry_thief',
    nameKey: 'verdict.register.rule.registry_thief.name',
    rulesTextKey: 'verdict.register.rule.registry_thief.rules',
  },
}

export const TUTORIAL_VERDICT_OPTIONS: readonly TutorialVerdictOption[] = [
  {
    id: 'register',
    choiceId: 'register',
    nameKey: 'verdict.register.name',
    rulesTextKey: 'verdict.register.rules',
  },
  {
    id: 'red_ink',
    choiceId: 'red_ink',
    nameKey: 'verdict.red_ink.name',
    rulesTextKey: 'verdict.red_ink.rules',
  },
  {
    id: 'erase',
    choiceId: 'erase',
    eraseVariantId: 'erase',
    nameKey: 'verdict.erase.name',
    rulesTextKey: 'verdict.erase.rules',
  },
  {
    id: 'erase_gain_ink',
    choiceId: 'erase',
    eraseVariantId: 'erase_gain_ink',
    nameKey: 'verdict.erase.gain_ink.name',
    rulesTextKey: 'verdict.erase.gain_ink.rules',
  },
  {
    id: 'erase_heavy_split_form',
    choiceId: 'erase',
    eraseVariantId: 'erase_heavy_split_form',
    nameKey: 'verdict.erase.heavy_split_form.name',
    rulesTextKey: 'verdict.erase.heavy_split_form.rules',
  },
  {
    id: 'erase_next_battle_resources',
    choiceId: 'erase',
    eraseVariantId: 'erase_next_battle_resources',
    nameKey: 'verdict.erase.next_battle_resources.name',
    rulesTextKey: 'verdict.erase.next_battle_resources.rules',
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
  readonly hasNextEncounter?: boolean
}

export function createInitialTutorialVerdictState(): TutorialVerdictState {
  return {
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
    options: createTutorialVerdictOptions(Boolean(input.hasNextEncounter)),
  }
}

export function resolveTutorialVerdict(
  run: TutorialRunState,
  optionId: TutorialVerdictOptionId,
): TutorialRunState {
  const offer = run.pendingVerdict

  if (!offer) {
    return run
  }

  const option = offer.options.find((candidate) => candidate.id === optionId)

  if (!option) {
    throw new Error(`Tutorial verdict option is not available: ${optionId}`)
  }

  const choiceId = option.choiceId
  const record = createVerdictRecord(run, offer, option)

  if (choiceId === 'register') {
    const entry = createRegisterEntry(run, offer)
    const isSpecialRegister = Boolean(entry.registerRuleId)

    return {
      ...run,
      pendingVerdict: undefined,
      playerForm: isSpecialRegister
        ? run.playerForm
        : increaseTutorialPlayerMaxForm(
            run.playerForm,
            VERDICT_REGISTER_MAX_FORM_BONUS,
          ),
      verdict: {
        ...run.verdict,
        maxIncenseBonus: isSpecialRegister
          ? run.verdict.maxIncenseBonus
          : run.verdict.maxIncenseBonus + VERDICT_REGISTER_INCENSE_BONUS,
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
      pendingRedInk: createTutorialRedInkOffer(run),
      verdict: {
        ...run.verdict,
        records: [...run.verdict.records, record],
      },
    }
  }

  const eraseResult = resolveEraseVariant(run, option.eraseVariantId ?? 'erase')
  const nextArtifacts = applyEraseArtifactProgress(run, eraseResult.artifacts)

  const addedEraseRewardCardIds = getAddedEraseRewardCardIds(run, eraseResult)

  return {
    ...run,
    deckDefinitionIds: [...run.deckDefinitionIds, ...addedEraseRewardCardIds],
    deckCards: appendRunDeckCards(run.deckCards, addedEraseRewardCardIds),
    artifacts: nextArtifacts,
    resources: applyTutorialResourceDelta(run.resources, eraseResult.resourceDelta),
    nextBattleStartBonus: addNextBattleStartBonus(
      run.nextBattleStartBonus,
      eraseResult.nextBattleStartBonus,
    ),
    pendingVerdict: undefined,
    verdict: {
      ...run.verdict,
      records: [...run.verdict.records, record],
    },
  }
}

function appendRunDeckCards(
  deckCards: TutorialRunState['deckCards'],
  cardDefinitionIds: readonly CardId[],
) {
  return cardDefinitionIds.reduce(
    (currentDeckCards, cardDefinitionId) => appendRunDeckCard(currentDeckCards, cardDefinitionId),
    deckCards,
  )
}

function createTutorialVerdictOptions(hasNextEncounter: boolean): readonly TutorialVerdictOption[] {
  return TUTORIAL_VERDICT_OPTIONS.filter(
    (option) => option.id !== 'erase_next_battle_resources' || hasNextEncounter,
  )
}

function createRegisterEntry(
  run: TutorialRunState,
  offer: TutorialVerdictOffer,
): TutorialVerdictRegisterEntry {
  const registerRule = REGISTER_RULE_BY_ENEMY_ID[offer.enemyDefinitionId]

  return {
    id: `register_entry_${run.verdict.registerEntries.length + 1}`,
    encounterId: offer.encounterId,
    enemyDefinitionId: offer.enemyDefinitionId,
    enemyNameKey: offer.enemyNameKey,
    revealedNameKeys: offer.revealedNameKeys,
    registerRuleId: registerRule?.id,
    ruleNameKey: registerRule?.nameKey,
    ruleTextKey: registerRule?.rulesTextKey,
  }
}

function createVerdictRecord(
  run: TutorialRunState,
  offer: TutorialVerdictOffer,
  option: TutorialVerdictOption,
): TutorialVerdictRecord {
  const choiceId = option.choiceId
  const registerRule = choiceId === 'register' ? REGISTER_RULE_BY_ENEMY_ID[offer.enemyDefinitionId] : undefined
  const eraseResult =
    choiceId === 'erase'
      ? resolveEraseVariant(run, option.eraseVariantId ?? 'erase')
      : undefined
  const addedCardDefinitionIds = eraseResult
    ? getAddedEraseRewardCardIds(run, eraseResult)
    : undefined
  const isSpecialRegister = Boolean(registerRule)

  return {
    id: `verdict_record_${run.verdict.records.length + 1}`,
    encounterId: offer.encounterId,
    enemyDefinitionId: offer.enemyDefinitionId,
    optionId: option.id,
    choiceId,
    eraseVariantId: option.eraseVariantId,
    registerRuleId: registerRule?.id,
    fractureDelta: eraseResult?.resourceDelta.fracture ?? 0,
    inkDelta: eraseResult?.resourceDelta.ink,
    doomDelta: eraseResult?.resourceDelta.doom,
    maxIncenseBonusDelta:
      choiceId === 'register' && !isSpecialRegister ? VERDICT_REGISTER_INCENSE_BONUS : 0,
    maxFormBonusDelta:
      choiceId === 'register' && !isSpecialRegister ? VERDICT_REGISTER_MAX_FORM_BONUS : 0,
    addedCardDefinitionIds,
    addedCardDefinitionId: addedCardDefinitionIds?.[0],
    nextBattleStartBonus: eraseResult?.nextBattleStartBonus,
  }
}

interface EraseVariantResult {
  readonly resourceDelta: {
    readonly ink?: number
    readonly doom?: number
    readonly fracture: number
  }
  readonly addedCardDefinitionIds: readonly CardId[]
  readonly nextBattleStartBonus?: TutorialNextBattleStartBonus
  readonly artifacts: TutorialRunState['artifacts']
}

function resolveEraseVariant(
  run: TutorialRunState,
  eraseVariantId: TutorialEraseVariantId,
): EraseVariantResult {
  if (eraseVariantId === 'erase_gain_ink') {
    return {
      resourceDelta: {
        fracture: VERDICT_ERASE_FRACTURE_DELTA,
        ink: VERDICT_ERASE_INK_DELTA,
      },
      addedCardDefinitionIds: [],
      artifacts: run.artifacts,
    }
  }

  if (eraseVariantId === 'erase_heavy_split_form') {
    return {
      resourceDelta: {
        fracture: VERDICT_ERASE_FRACTURE_DELTA,
        doom: VERDICT_ERASE_HEAVY_DOOM_DELTA,
      },
      addedCardDefinitionIds: [VERDICT_ERASE_HEAVY_REWARD_CARD_ID],
      artifacts: run.artifacts,
    }
  }

  if (eraseVariantId === 'erase_next_battle_resources') {
    return {
      resourceDelta: {
        fracture: VERDICT_ERASE_FRACTURE_DELTA,
      },
      addedCardDefinitionIds: [],
      nextBattleStartBonus: {
        ink: 1,
        incense: 1,
      },
      artifacts: run.artifacts,
    }
  }

  return {
    resourceDelta: {
      fracture: VERDICT_ERASE_FRACTURE_DELTA,
    },
    addedCardDefinitionIds: [VERDICT_ERASE_REWARD_CARD_ID],
    artifacts: run.artifacts,
  }
}

function getAddedEraseRewardCardIds(
  run: TutorialRunState,
  eraseResult: EraseVariantResult,
) {
  if (eraseResult.addedCardDefinitionIds[0] !== VERDICT_ERASE_REWARD_CARD_ID) {
    return eraseResult.addedCardDefinitionIds
  }

  const eraseRewardBonusCount = getEraseRewardBonusCount(run.artifacts)

  return [
    ...eraseResult.addedCardDefinitionIds,
    ...Array.from({ length: eraseRewardBonusCount }, () => VERDICT_ERASE_REWARD_CARD_ID),
  ]
}

function applyEraseArtifactProgress(
  run: TutorialRunState,
  artifacts: TutorialRunState['artifacts'],
) {
  const isConsecutiveErase =
    run.verdict.records[run.verdict.records.length - 1]?.choiceId === 'erase'
  const progressedArtifacts = advanceArtifactProgress(artifacts, [
    {
      kind: 'erase_verdict',
    },
  ])

  return isConsecutiveErase
    ? markArtifactOverloads(progressedArtifacts, [
        {
          kind: 'consecutive_erase_verdicts',
        },
      ])
    : progressedArtifacts
}

function addNextBattleStartBonus(
  current: TutorialRunState['nextBattleStartBonus'],
  delta: TutorialNextBattleStartBonus | undefined,
) {
  if (!delta) {
    return current
  }

  return {
    ink: (current?.ink ?? 0) + delta.ink,
    incense: (current?.incense ?? 0) + delta.incense,
  }
}
