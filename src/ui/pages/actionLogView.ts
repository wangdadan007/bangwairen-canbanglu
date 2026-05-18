import { gameData } from '../../data'
import type { RouteFlowKind } from '../../core'
import type {
  ActionLogEntry,
  AbnormalMoveDefinition,
  AltarState,
  CardDefinition,
  CardInstance,
  CombatState,
  EnemyState,
  JsonValue,
  TutorialRunState,
  VictorySettlement,
} from '../../types'

export type PressureFeedbackTone = 'incoming' | 'sealed' | 'abnormal' | 'countered'

export interface PressureFeedback {
  readonly tone: PressureFeedbackTone
  readonly label: string
  readonly title: string
  readonly detail: string
}

const enemyDefinitionsById = new Map(gameData.enemies.map((enemy) => [enemy.id, enemy]))
const artifactDefinitionsById = new Map(
  gameData.artifacts.map((artifact) => [artifact.id, artifact]),
)

const termTooltips: Record<string, string> = {
  shape: '敌人的形体（形）：敌人的战斗实体。形归零即本场胜利。',
  break_form: '击破敌形（破形）：削减敌人的形，不等同于伤害表述。',
  incense: '香火：每回合获得的出牌费用。',
  seal_momentum: '压住来势（封势）：只能降低直接来势，不能处理异动。',
  incoming_force: '直接冲击（来势）：敌人的正面压力，可被封势降低。',
  abnormal_move: '特殊行为（异动）：偷香、塞污卷、遮名、回形等，需要专门处理。',
  counter_abnormal_move: '断异动：专门处理某类异动的效果。',
  ask_name: '查明真名（问名）：揭示敌人的名格。',
  named: '真名已明（正名）：名格全揭示后触发名破，并提高归册收益。',
  catalogue: '归册：正名后打空敌形的高质量结算，会进入裁定。',
  vanquish: '伏诛：未正名时打空敌形的普通结算。',
  verdict: '战后改榜（裁定）：只包含登簿、朱批、削籍三类。',
  ink: '墨：中后段高级资源，用于问名、朱批或裁定相关收益。',
  doom: '劫数：以未来风险换当前爆发的负债资源。',
  fracture: '榜裂：削籍或强行取利留下的世界恶化程度。',
  altar: '三坛：人坛、地坛、天坛，各自拥有不同触发时机。',
  artifact: '法宝：牌组外器物，不进入抽牌堆，可触发认主、过载与反噬。',
}

export function t(key: string | undefined) {
  if (!key) {
    return '未记名'
  }

  return gameData.localization[key] ?? key
}

export function getTermTooltip(termId: string) {
  return termTooltips[termId] ?? termId
}

export function createPressureFeedback(
  battle: CombatState,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
  allCardsByInstanceId: ReadonlyMap<string, CardInstance>,
): PressureFeedback | undefined {
  const entry = battle.actionLog
    .slice()
    .reverse()
    .find((candidate) =>
      [
        'INCOMING_FORCE_SEALED',
        'ABNORMAL_MOVE_COUNTERED',
        'ABNORMAL_MOVE_EXECUTED',
        'INCOMING_FORCE_CREATED',
      ].includes(candidate.type),
    )

  if (!entry) {
    return undefined
  }

  const sourceCardName = getCardName(entry.sourceId, cardDefinitionsById, allCardsByInstanceId)
  const sourceName = sourceCardName ?? sourceEnemyName(entry.sourceId, battle) ?? '敌方'

  if (entry.type === 'INCOMING_FORCE_SEALED') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0
    const remaining = getPayloadNumber(entry.payload.remainingIncomingForce) ?? 0

    return {
      tone: 'sealed',
      label: '封势反馈',
      title: amount > 0 ? `${sourceName}压住 ${amount} 点来势` : `${sourceName}未压住来势`,
      detail: amount > 0 ? `敌方当前剩余来势 ${remaining}。` : '当前没有可被封势处理的直接来势。',
    }
  }

  if (entry.type === 'ABNORMAL_MOVE_COUNTERED') {
    const moveLabel = getMoveLabel(getPayloadString(entry.payload.moveType))
    const result = getPayloadString(entry.payload.result)

    return {
      tone: 'countered',
      label: result === 'prevented' ? '断异动成功' : '断异动已布置',
      title:
        result === 'prevented'
          ? `${moveLabel}已被专门效果处理`
          : `${sourceName}准备处理${moveLabel}`,
      detail:
        result === 'prevented'
          ? '本次异动没有生效。'
          : '敌人行动时若发动对应异动，会被这次布置阻止。',
    }
  }

  if (entry.type === 'ABNORMAL_MOVE_EXECUTED') {
    const moveLabel = getMoveLabel(getPayloadString(entry.payload.moveType))
    const incensePenalty = getPayloadNumber(entry.payload.nextTurnIncensePenalty) ?? 0

    return {
      tone: 'abnormal',
      label: '异动生效',
      title: `${sourceName}发动${moveLabel}`,
      detail:
        incensePenalty > 0
          ? `下回合香火将受扰 -${incensePenalty}。`
          : '本次异动已经结算。',
    }
  }

  const amount = getPayloadNumber(entry.payload.amount) ?? 0

  return {
    tone: 'incoming',
    label: '来势结算',
    title: amount > 0 ? `${sourceName}来势 ${amount}` : '来势已被压住',
    detail: amount > 0 ? '未被封掉的来势进入敌方行动结算。' : '敌人的直接来势没有形成压力。',
  }
}

export function formatLogEntry(
  entry: ActionLogEntry,
  battle: CombatState,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
  allCardsByInstanceId: ReadonlyMap<string, CardInstance>,
) {
  const sourceCardName = getCardName(entry.sourceId, cardDefinitionsById, allCardsByInstanceId)
  const targetEnemyName = getEnemyName(entry.targetId, battle)

  if (entry.type === 'BATTLE_STARTED') {
    const enemyCount = getPayloadNumber(entry.payload.enemyCount) ?? 1
    return enemyCount > 1
      ? `开战：${enemyCount} 名敌方入案。`
      : `开战：${targetEnemyName ?? '纸面鬼'}入案。`
  }

  if (entry.type === 'TURN_STARTED') {
    return `第 ${entry.turn} 回合开始。`
  }

  if (entry.type === 'TURN_ENDED') {
    return `第 ${entry.turn} 回合结束。`
  }

  if (entry.type === 'CARD_DRAWN') {
    return `抽入：${sourceCardName ?? getCardNameFromPayload(entry, cardDefinitionsById)}。`
  }

  if (entry.type === 'CARD_PLAYED') {
    return `出牌：${sourceCardName ?? getCardNameFromPayload(entry, cardDefinitionsById)}。`
  }

  if (entry.type === 'CARD_ANNOTATION_TRIGGERED') {
    return `朱批触发：${t(getPayloadString(entry.payload.nameKey))}。`
  }

  if (entry.type === 'CARD_PLAY_REJECTED') {
    return getPayloadString(entry.payload.reason) === 'not_enough_incense'
      ? '香火不足，未能出牌。'
      : '当前不能出牌。'
  }

  if (entry.type === 'CARD_DISCARDED') {
    return `弃置：${sourceCardName ?? getCardNameFromPayload(entry, cardDefinitionsById)}。`
  }

  if (entry.type === 'CARD_EXHAUSTED') {
    return `移入消耗区：${sourceCardName ?? getCardNameFromPayload(entry, cardDefinitionsById)}。`
  }

  if (entry.type === 'PILE_SHUFFLED') {
    return `弃牌堆回洗，共 ${getPayloadNumber(entry.payload.count) ?? 0} 张。`
  }

  if (entry.type === 'INCENSE_GAINED') {
    const incensePenalty = getPayloadNumber(entry.payload.incensePenalty) ?? 0

    if (incensePenalty > 0) {
      return `香火受扰 -${incensePenalty}，本回合获得 ${
        getPayloadNumber(entry.payload.amount) ?? 0
      }，当前 ${getPayloadNumber(entry.payload.currentIncense) ?? 0}。`
    }

    return `香火 +${getPayloadNumber(entry.payload.amount) ?? 0}，当前 ${
      getPayloadNumber(entry.payload.currentIncense) ?? 0
    }。`
  }

  if (entry.type === 'INCENSE_SPENT') {
    return `香火 -${getPayloadNumber(entry.payload.amount) ?? 0}，余 ${
      getPayloadNumber(entry.payload.currentIncense) ?? 0
    }。`
  }

  if (entry.type === 'INK_GAINED') {
    return `墨 +${getPayloadNumber(entry.payload.amount) ?? 0}，当前 ${
      getPayloadNumber(entry.payload.currentInk) ?? 0
    }。`
  }

  if (entry.type === 'DOOM_GAINED') {
    return `劫数 +${getPayloadNumber(entry.payload.amount) ?? 0}，当前 ${
      getPayloadNumber(entry.payload.currentDoom) ?? 0
    }。`
  }

  if (entry.type === 'ALTAR_PLACED') {
    const sourceDefinitionId = getPayloadString(entry.payload.sourceCardDefinitionId)
    const sourceDefinition = sourceDefinitionId
      ? cardDefinitionsById.get(sourceDefinitionId)
      : undefined

    return `奉坛：${getAltarSlotLabel(getPayloadString(entry.payload.slot))}置入${
      sourceDefinition ? t(sourceDefinition.nameKey) : '符诏'
    }。`
  }

  if (entry.type === 'ALTAR_TRIGGERED') {
    const slotLabel = getAltarSlotLabel(getPayloadString(entry.payload.slot))
    const result = getPayloadString(entry.payload.result)

    if (result === 'gain_ink') {
      return `${slotLabel}触发：墨 +${getPayloadNumber(entry.payload.amount) ?? 0}，当前 ${
        getPayloadNumber(entry.payload.currentInk) ?? 0
      }。`
    }

    if (result === 'counter_abnormal') {
      return `${slotLabel}触发：准备断异动 ${getMoveLabel(
        getPayloadString(entry.payload.moveType),
      )}。`
    }

    if (result === 'ask_name') {
      return `${slotLabel}触发：问名 ${getPayloadNumber(entry.payload.amount) ?? 0}。`
    }

    return `${slotLabel}未触发。`
  }

  if (entry.type === 'ALTAR_EXPIRED') {
    return `${getAltarSlotLabel(getPayloadString(entry.payload.slot))}归寂。`
  }

  if (entry.type === 'ARTIFACT_TRIGGERED') {
    const artifactName = getArtifactName(entry.sourceId)
    const result = getPayloadString(entry.payload.result)

    if (result === 'prepared') {
      return `${artifactName}触发：下一次破形额外 +${
        getPayloadNumber(entry.payload.amount) ?? 0
      }。`
    }

    if (result === 'consumed') {
      return `${artifactName}借势：本次破形额外 +${
        getPayloadNumber(entry.payload.amount) ?? 0
      }。`
    }

    return `${artifactName}触发。`
  }

  if (entry.type === 'ARTIFACT_BACKLASH_TRIGGERED') {
    const artifactName = getArtifactName(entry.sourceId)
    const cardDefinitionId = getPayloadString(entry.payload.cardDefinitionId)
    const cardDefinition = cardDefinitionId ? cardDefinitionsById.get(cardDefinitionId) : undefined
    const fractureDelta = getPayloadNumber(entry.payload.fractureDelta) ?? 0

    if (cardDefinition) {
      return `${artifactName}反噬：${t(cardDefinition.nameKey)}临时入手。`
    }

    if (fractureDelta > 0) {
      return `${artifactName}反噬：本场开始时榜裂 +${fractureDelta}。`
    }

    return `${artifactName}反噬已结算。`
  }

  if (entry.type === 'FORM_BROKEN') {
    return `${sourceCardName ?? '符诏'}破形 ${getPayloadNumber(entry.payload.amount) ?? 0}，${
      targetEnemyName ?? '敌方'
    }余形 ${getPayloadNumber(entry.payload.currentForm) ?? 0}。`
  }

  if (entry.type === 'NAME_ASKED') {
    return getPayloadString(entry.payload.result) === 'discern_intent'
      ? `${sourceCardName ?? '问名'}转为辨势。`
      : `${sourceCardName ?? '问名'}查明真名（问名）。`
  }

  if (entry.type === 'NAME_SLOT_REVEALED') {
    return `名格显现：${t(getPayloadString(entry.payload.nameKey))}。`
  }

  if (entry.type === 'ENEMY_NAMED') {
    return `${targetEnemyName ?? '敌方'}真名已明（正名）。`
  }

  if (entry.type === 'NAME_BREAK_TRIGGERED') {
    return `名破 ${getPayloadNumber(entry.payload.amount) ?? 0}，余形 ${
      getPayloadNumber(entry.payload.currentForm) ?? 0
    }。`
  }

  if (entry.type === 'ENEMY_SETTLED') {
    const settlement = getPayloadString(entry.payload.settlement) as VictorySettlement | undefined
    return `${targetEnemyName ?? '敌方'}已${settlement ? getSettlementLabel(settlement) : '收束'}。`
  }

  if (entry.type === 'INCOMING_FORCE_CREATED') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0

    return amount > 0
      ? `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}来势结算 ${amount}。`
      : `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}来势已被完全压住。`
  }

  if (entry.type === 'INCOMING_FORCE_SEALED') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0
    const remaining = getPayloadNumber(entry.payload.remainingIncomingForce) ?? 0

    return amount > 0
      ? `${sourceCardName ?? '符诏'}封势 ${amount}，剩余来势 ${remaining}。`
      : `${sourceCardName ?? '符诏'}封势未生效：当前没有可压住的来势。`
  }

  if (entry.type === 'ABNORMAL_MOVE_EXECUTED') {
    const incensePenalty = getPayloadNumber(entry.payload.nextTurnIncensePenalty) ?? 0

    return `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}发动异动：${getMoveLabel(
      getPayloadString(entry.payload.moveType),
    )}${incensePenalty > 0 ? `，下回合香火受扰 -${incensePenalty}` : ''}。`
  }

  if (entry.type === 'ABNORMAL_MOVE_COUNTERED') {
    const result = getPayloadString(entry.payload.result)

    return result === 'prevented'
      ? `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}的${getMoveLabel(
          getPayloadString(entry.payload.moveType),
        )}被断异动阻止。`
      : `${sourceCardName ?? '符诏'}准备断异动：${getMoveLabel(
          getPayloadString(entry.payload.moveType),
        )}。`
  }

  if (entry.type === 'VICTORY_SETTLED') {
    const settlement = getPayloadString(entry.payload.settlement) as VictorySettlement | undefined
    return `战斗结算：${settlement ? getSettlementLabel(settlement) : '已结算'}。`
  }

  return entry.type
}

export function getCardEffectLabels(definition: CardDefinition, card?: CardInstance) {
  const effects = [
    ...definition.effects,
    ...(card?.annotations.flatMap((annotation) => annotation.effects) ?? []),
  ]

  return Array.from(
    new Set(
      effects.map((effect) => {
        if (effect.type === 'BREAK_SHAPE') {
          return '破形'
        }

        if (effect.type === 'ASK_NAME') {
          return '问名'
        }

        if (effect.type === 'SEAL_MOMENTUM') {
          return '封势'
        }

        if (effect.type === 'COUNTER_ABNORMAL_MOVE') {
          return '断异动'
        }

        if (effect.type === 'DRAW') {
          return '抽牌'
        }

        if (effect.type === 'GAIN_INCENSE') {
          return '香火'
        }

        if (effect.type === 'GAIN_INK') {
          return '墨'
        }

        if (effect.type === 'GAIN_DOOM') {
          return '劫数'
        }

        return '奉坛'
      }),
    ),
  )
}

export function getLogEntryClassName(entry: ActionLogEntry) {
  if (entry.type === 'INCOMING_FORCE_CREATED') {
    return 'log-entry incoming'
  }

  if (entry.type === 'INCOMING_FORCE_SEALED') {
    return 'log-entry sealed'
  }

  if (entry.type === 'ABNORMAL_MOVE_EXECUTED') {
    return 'log-entry abnormal'
  }

  if (entry.type === 'ABNORMAL_MOVE_COUNTERED') {
    return 'log-entry countered'
  }

  if (
    entry.type === 'FORM_BROKEN' ||
    entry.type === 'NAME_BREAK_TRIGGERED' ||
    entry.type === 'ENEMY_SETTLED'
  ) {
    return 'log-entry form'
  }

  if (
    entry.type === 'NAME_ASKED' ||
    entry.type === 'NAME_SLOT_REVEALED' ||
    entry.type === 'ENEMY_NAMED' ||
    entry.type === 'CARD_ANNOTATION_TRIGGERED' ||
    entry.type === 'INK_GAINED' ||
    entry.type === 'DOOM_GAINED' ||
    entry.type === 'ALTAR_PLACED' ||
    entry.type === 'ALTAR_TRIGGERED' ||
    entry.type === 'ALTAR_EXPIRED' ||
    entry.type === 'ARTIFACT_TRIGGERED' ||
    entry.type === 'ARTIFACT_BACKLASH_TRIGGERED'
  ) {
    return 'log-entry name'
  }

  return 'log-entry'
}

export function getSettlementLabel(settlement: VictorySettlement) {
  return settlement === 'catalogue' ? '归册' : '伏诛'
}

export function getSettlementText(settlement: VictorySettlement) {
  return settlement === 'catalogue'
    ? '真名入卷，先入裁定，再领取高质量奖励。'
    : '敌形已散，获得普通奖励。'
}

export function getRouteFlowLabel(flowKind: RouteFlowKind) {
  if (flowKind === 'event') {
    return '事件节点'
  }

  if (flowKind === 'rest') {
    return '休整节点'
  }

  if (flowKind === 'shop') {
    return '商店节点'
  }

  if (flowKind === 'event_placeholder') {
    return '事件占位'
  }

  if (flowKind === 'rest_placeholder') {
    return '休整占位'
  }

  if (flowKind === 'shop_placeholder') {
    return '商店占位'
  }

  if (flowKind === 'battle') {
    return '战斗节点'
  }

  return '路线收束'
}

export function getMoveLabel(moveType: string | undefined) {
  if (moveType === 'steal_incense') {
    return '偷香'
  }

  if (moveType === 'add_fouled_scroll') {
    return '塞污卷'
  }

  if (moveType === 'cover_name') {
    return '遮名'
  }

  if (moveType === 'heal_form') {
    return '回形'
  }

  return moveType ?? '异动'
}

export function getAltarSlotLabel(slot: string | undefined) {
  if (slot === 'human') {
    return '人坛'
  }

  if (slot === 'earth') {
    return '地坛'
  }

  if (slot === 'heaven') {
    return '天坛'
  }

  return '坛位'
}

export function getAltarEffectLabel(altar: AltarState) {
  if (altar.effect.type === 'gain_ink_for_name_progress') {
    return '回合末问名得墨'
  }

  if (altar.effect.type === 'counter_abnormal_or_gain_ink') {
    return '敌方回合断异动'
  }

  return '下回合问名得墨'
}

export function getEnemyDefinitionName(definitionId: string) {
  const definition = enemyDefinitionsById.get(definitionId)

  return definition ? t(definition.nameKey) : definitionId
}

export function getUnlockStageName(stageId: string) {
  const stage = gameData.tutorialUnlocks.find((candidate) => candidate.id === stageId)

  return stage ? t(stage.nameKey) : stageId
}

export function getRunHeadline(status: TutorialRunState['status']) {
  if (status === 'complete') {
    return '路线收束'
  }

  if (status === 'failed') {
    return '路线中止'
  }

  return '路线推进中'
}

export function getRunProgressLabel(run: TutorialRunState) {
  if (run.status === 'complete') {
    return '已完成'
  }

  if (run.status === 'failed') {
    return '已中止'
  }

  return `第 ${run.currentEncounterIndex + 1} / ${run.encounterIds.length} 场`
}

function getCardName(
  sourceId: string | undefined,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
  allCardsByInstanceId: ReadonlyMap<string, CardInstance>,
) {
  if (!sourceId) {
    return undefined
  }

  const instance = allCardsByInstanceId.get(sourceId)
  const definition = instance ? cardDefinitionsById.get(instance.definitionId) : undefined

  return definition ? t(definition.nameKey) : undefined
}

function getCardNameFromPayload(
  entry: ActionLogEntry,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
) {
  const cardDefinitionId = getPayloadString(entry.payload.cardDefinitionId)
  const definition = cardDefinitionId ? cardDefinitionsById.get(cardDefinitionId) : undefined

  return definition ? t(definition.nameKey) : '未知牌'
}

function getEnemyName(targetId: string | undefined, battle: CombatState) {
  if (!targetId) {
    return undefined
  }

  const enemy = battle.enemies.find((candidate) => candidate.instanceId === targetId)

  return enemy ? getEnemyDefinitionName(enemy.definitionId) : undefined
}

function sourceEnemyName(sourceId: string | undefined, battle: CombatState) {
  return getEnemyName(sourceId, battle)
}

function getArtifactName(sourceId: string | undefined) {
  const artifact = sourceId ? artifactDefinitionsById.get(sourceId) : undefined

  return artifact ? t(artifact.nameKey) : '法宝'
}

function getPayloadNumber(value: JsonValue | undefined) {
  return typeof value === 'number' ? value : undefined
}

function getPayloadString(value: JsonValue | undefined) {
  return typeof value === 'string' ? value : undefined
}

export function getCurrentAbnormalMove(enemy: EnemyState): AbnormalMoveDefinition | undefined {
  return enemy.currentIntent?.effects.find((effect) => effect.type === 'ABNORMAL_MOVE')?.move
}
