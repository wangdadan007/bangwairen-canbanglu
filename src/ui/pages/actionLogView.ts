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
import type { AudioCueKind } from '../audio/audioCues'

export type PressureFeedbackTone = 'incoming' | 'sealed' | 'abnormal' | 'countered'
export type RitualFeedbackTone =
  | 'break'
  | 'ask'
  | 'named'
  | 'settlement'
  | 'verdict'
  | 'artifact'
  | 'backlash'
  | 'boss'

export interface PressureFeedback {
  readonly id: string
  readonly tone: PressureFeedbackTone
  readonly label: string
  readonly title: string
  readonly detail: string
  readonly audioCue: AudioCueKind
}

export interface RitualFeedback {
  readonly id: string
  readonly tone: RitualFeedbackTone
  readonly label: string
  readonly title: string
  readonly detail: string
  readonly audioCue: AudioCueKind
}

const enemyDefinitionsById = new Map(gameData.enemies.map((enemy) => [enemy.id, enemy]))
const artifactDefinitionsById = new Map(
  gameData.artifacts.map((artifact) => [artifact.id, artifact]),
)

const termTooltips: Record<string, string> = {
  shape: '敌人的形体（形）：敌人的战斗实体。形归零即本场胜利。',
  player_shape: '己形：执簿者当前状态。跨战斗保留，归零则本场失败。',
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
  altar:
    '三坛：人坛在回合结束收束本回合动作，地坛在敌人行动前压住压力，天坛在下回合开始提前布置。',
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
        'PLAYER_FORM_LOST',
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
      id: entry.id,
      tone: 'sealed',
      label: '封势反馈',
      title: amount > 0 ? `${sourceName}压住 ${amount} 点来势` : `${sourceName}未压住来势`,
      detail: amount > 0 ? `敌方当前剩余来势 ${remaining}。` : '当前没有可被封势处理的直接来势。',
      audioCue: 'pressure',
    }
  }

  if (entry.type === 'ABNORMAL_MOVE_COUNTERED') {
    const moveLabel = getMoveLabel(getPayloadString(entry.payload.moveType))
    const result = getPayloadString(entry.payload.result)

    return {
      id: entry.id,
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
      audioCue: 'pressure',
    }
  }

  if (entry.type === 'ABNORMAL_MOVE_EXECUTED') {
    const moveLabel = getMoveLabel(getPayloadString(entry.payload.moveType))
    const incensePenalty = getPayloadNumber(entry.payload.nextTurnIncensePenalty) ?? 0

    return {
      id: entry.id,
      tone: 'abnormal',
      label: '异动生效',
      title: `${sourceName}发动${moveLabel}`,
      detail:
        incensePenalty > 0
          ? `下回合香火将受扰 -${incensePenalty}。`
          : '本次异动已经结算。',
      audioCue: 'pressure',
    }
  }

  if (entry.type === 'PLAYER_FORM_LOST') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0

    return {
      id: entry.id,
      tone: 'incoming',
      label: '己形承压',
      title: `${sourceName}冲击己形 ${amount}`,
      detail: `己形余 ${getPayloadNumber(entry.payload.currentForm) ?? 0} / ${
        getPayloadNumber(entry.payload.maxForm) ?? 0
      }。`,
      audioCue: 'pressure',
    }
  }

  const amount = getPayloadNumber(entry.payload.amount) ?? 0

  return {
    id: entry.id,
    tone: 'incoming',
    label: '来势结算',
    title: amount > 0 ? `${sourceName}来势 ${amount}` : '来势已被压住',
    detail: amount > 0 ? '未被封掉的来势进入敌方行动结算。' : '敌人的直接来势没有形成压力。',
    audioCue: 'pressure',
  }
}

export function createRitualFeedback(
  battle: CombatState,
  cardDefinitionsById: ReadonlyMap<string, CardDefinition>,
  allCardsByInstanceId: ReadonlyMap<string, CardInstance>,
): RitualFeedback | undefined {
  const entry = battle.actionLog
    .slice()
    .reverse()
    .find((candidate) =>
      [
        'FORM_BROKEN',
        'NAME_ASKED',
        'NAME_SLOT_REVEALED',
        'ENEMY_NAMED',
        'NAME_BREAK_TRIGGERED',
        'ENEMY_SETTLED',
        'VICTORY_SETTLED',
        'DEFEAT_SETTLED',
        'ARTIFACT_TRIGGERED',
        'ARTIFACT_BACKLASH_TRIGGERED',
      ].includes(candidate.type),
    )

  if (!entry) {
    return undefined
  }

  const sourceCardName = getCardName(entry.sourceId, cardDefinitionsById, allCardsByInstanceId)
  const targetEnemyName = getEnemyName(entry.targetId, battle) ?? '敌方'

  if (entry.type === 'FORM_BROKEN') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0
    const currentForm = getPayloadNumber(entry.payload.currentForm) ?? 0

    return {
      id: entry.id,
      tone: 'break',
      label: '破形反馈',
      title: `${sourceCardName ?? '符诏'}击破敌形 ${amount}`,
      detail: `${targetEnemyName}余形 ${currentForm}，战斗结果不因表现层改变。`,
      audioCue: 'break',
    }
  }

  if (entry.type === 'NAME_ASKED' || entry.type === 'NAME_SLOT_REVEALED') {
    const revealedName = t(getPayloadString(entry.payload.nameKey))

    return {
      id: entry.id,
      tone: 'ask',
      label: '问名反馈',
      title:
        entry.type === 'NAME_SLOT_REVEALED'
          ? `名格显现：${revealedName}`
          : `${sourceCardName ?? '问名'}落笔查名`,
      detail:
        getPayloadString(entry.payload.result) === 'discern_intent'
          ? '无名目标转为辨势，仍保留弱收益。'
          : '名格揭示会推动正名与归册收益。',
      audioCue: 'ask_name',
    }
  }

  if (entry.type === 'ENEMY_NAMED' || entry.type === 'NAME_BREAK_TRIGGERED') {
    const amount = getPayloadNumber(entry.payload.amount) ?? 0

    return {
      id: entry.id,
      tone: 'named',
      label: '正名反馈',
      title: entry.type === 'ENEMY_NAMED' ? `${targetEnemyName}真名已明` : `名破 ${amount}`,
      detail:
        entry.type === 'ENEMY_NAMED'
          ? '朱砂落印，目标进入高收益归册窗口。'
          : `名破后余形 ${getPayloadNumber(entry.payload.currentForm) ?? 0}。`,
      audioCue: 'named',
    }
  }

  if (entry.type === 'ENEMY_SETTLED' || entry.type === 'VICTORY_SETTLED') {
    const settlement = getPayloadString(entry.payload.settlement) as VictorySettlement | undefined
    const label = settlement ? getSettlementLabel(settlement) : '结算'

    return {
      id: entry.id,
      tone: 'settlement',
      label: `${label}反馈`,
      title:
        settlement === 'catalogue'
          ? `${targetEnemyName}归入残榜`
          : settlement === 'vanquish'
            ? `${targetEnemyName}伏诛收束`
            : '战斗已经结算',
      detail: settlement ? getSettlementText(settlement) : '结算结果已写入战斗状态。',
      audioCue: 'settlement',
    }
  }

  if (entry.type === 'DEFEAT_SETTLED') {
    return {
      id: entry.id,
      tone: 'settlement',
      label: '败退反馈',
      title: '己形已散',
      detail: '执簿者无法继续承受来势，本场战斗失败。',
      audioCue: 'backlash',
    }
  }

  if (entry.type === 'ARTIFACT_BACKLASH_TRIGGERED') {
    return {
      id: entry.id,
      tone: 'backlash',
      label: '法宝反噬',
      title: `${getArtifactName(entry.sourceId)}裂响回案`,
      detail: formatLogEntry(entry, battle, cardDefinitionsById, allCardsByInstanceId),
      audioCue: 'backlash',
    }
  }

  return {
    id: entry.id,
    tone: 'artifact',
    label: '法宝触发',
    title: `${getArtifactName(entry.sourceId)}应声`,
    detail: formatLogEntry(entry, battle, cardDefinitionsById, allCardsByInstanceId),
    audioCue: 'artifact',
  }
}

export function createRunRitualFeedback(run: TutorialRunState): RitualFeedback | undefined {
  if (run.pendingVerdict) {
    return {
      id: run.pendingVerdict.id,
      tone: 'verdict',
      label: '裁定反馈',
      title: `${t(run.pendingVerdict.enemyNameKey)}待裁定`,
      detail: '归册对象已入案，下一步只能在登簿、朱批、削籍中选择。',
      audioCue: 'verdict',
    }
  }

  const latestVerdictRecord = run.verdict.records[run.verdict.records.length - 1]

  if (!latestVerdictRecord) {
    return undefined
  }

  return {
    id: latestVerdictRecord.id,
    tone: 'verdict',
    label: '裁定反馈',
    title: getVerdictChoiceLabel(latestVerdictRecord.choiceId),
    detail: getVerdictRecordDetail(latestVerdictRecord),
    audioCue: 'verdict',
  }
}

export function createBossPressureFeedback(battle: CombatState): RitualFeedback | undefined {
  const bossEnemy = battle.enemies.find((enemy) => isBossEnemyDefinition(enemy.definitionId))

  if (!bossEnemy) {
    return undefined
  }

  const bossName = getEnemyDefinitionName(bossEnemy.definitionId)
  const abnormalMove = getCurrentAbnormalMove(bossEnemy)
  const latestBossLog = battle.actionLog
    .slice()
    .reverse()
    .find(
      (entry) =>
        (entry.sourceId === bossEnemy.instanceId || entry.targetId === bossEnemy.instanceId) &&
        [
          'INCOMING_FORCE_CREATED',
          'ABNORMAL_MOVE_EXECUTED',
          'ABNORMAL_MOVE_COUNTERED',
          'NAME_BREAK_TRIGGERED',
          'ENEMY_SETTLED',
        ].includes(entry.type),
    )
  const cueId =
    latestBossLog?.id ??
    `boss_pressure_${bossEnemy.instanceId}_${battle.turn}_${bossEnemy.currentForm}_${
      bossEnemy.incomingForce
    }_${bossEnemy.currentIntent?.id ?? 'none'}`

  if (bossEnemy.currentForm <= 0) {
    return {
      id: cueId,
      tone: 'boss',
      label: 'Boss 压力',
      title: `${bossName}已收束`,
      detail: '本章终点压力解除，等待伏诛或归册结算。',
      audioCue: 'settlement',
    }
  }

  if (abnormalMove) {
    return {
      id: cueId,
      tone: 'boss',
      label: 'Boss 压力',
      title: `${bossName}异动：${getMoveLabel(abnormalMove.type)}`,
      detail: 'Boss 行动会优先压迫问名、归册或榜裂节奏，需要专门处理。',
      audioCue: 'pressure',
    }
  }

  if (bossEnemy.incomingForce > 0) {
    return {
      id: cueId,
      tone: 'boss',
      label: 'Boss 压力',
      title: `${bossName}来势 ${bossEnemy.incomingForce}`,
      detail: '这股直接冲击可以被封势压住，但不会处理潜在异动。',
      audioCue: 'pressure',
    }
  }

  return {
    id: cueId,
    tone: 'boss',
    label: 'Boss 压力',
    title: `${bossName}正在改写残榜`,
    detail: 'Boss 仍在场，问名、正名、法宝反噬和榜裂都会影响收束质量。',
    audioCue: 'pressure',
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
    const incenseBonus = getPayloadNumber(entry.payload.incenseBonus) ?? 0

    if (incensePenalty > 0) {
      return `香火受扰 -${incensePenalty}，本回合获得 ${
        getPayloadNumber(entry.payload.amount) ?? 0
      }，当前 ${getPayloadNumber(entry.payload.currentIncense) ?? 0}。`
    }

    if (incenseBonus > 0) {
      return `开局预支香火 +${incenseBonus}，本回合获得 ${
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

  if (entry.type === 'REGISTER_RULE_TRIGGERED') {
    return formatRegisterRuleLog(entry)
  }

  if (entry.type === 'PLAYER_FORM_LOST') {
    return `${sourceEnemyName(entry.sourceId, battle) ?? '敌方'}冲击己形 ${
      getPayloadNumber(entry.payload.amount) ?? 0
    }，己形 ${getPayloadNumber(entry.payload.currentForm) ?? 0} / ${
      getPayloadNumber(entry.payload.maxForm) ?? 0
    }。`
  }

  if (entry.type === 'ALTAR_PLACED') {
    const sourceDefinitionId = getPayloadString(entry.payload.sourceCardDefinitionId)
    const sourceDefinition = sourceDefinitionId
      ? cardDefinitionsById.get(sourceDefinitionId)
      : undefined

    const slot = getPayloadString(entry.payload.slot)

    return `奉坛：${getAltarSlotLabel(slot)}置入${
      sourceDefinition ? t(sourceDefinition.nameKey) : '符诏'
    }，${getAltarWindowHint(slot)}。`
  }

  if (entry.type === 'ALTAR_TRIGGERED') {
    const slot = getPayloadString(entry.payload.slot)
    const slotLabel = getAltarSlotLabel(slot)
    const result = getPayloadString(entry.payload.result)

    if (result === 'gain_ink') {
      const reason = getPayloadString(entry.payload.reason)

      return `${slotLabel}触发：${getAltarInkReasonLabel(
        slot,
        reason,
      )}，墨 +${getPayloadNumber(entry.payload.amount) ?? 0}，当前 ${
        getPayloadNumber(entry.payload.currentInk) ?? 0
      }。`
    }

    if (result === 'counter_abnormal') {
      return `${slotLabel}触发：敌人行动前准备断异动 ${getMoveLabel(
        getPayloadString(entry.payload.moveType),
      )}。`
    }

    if (result === 'ask_name') {
      return `${slotLabel}触发：下回合开始问名 ${
        getPayloadNumber(entry.payload.amount) ?? 0
      }。`
    }

    return `${slotLabel}未触发：${getAltarSkipReasonLabel(
      slot,
      getPayloadString(entry.payload.reason),
    )}。`
  }

  if (entry.type === 'ALTAR_EXPIRED') {
    return `${getAltarSlotLabel(getPayloadString(entry.payload.slot))}归寂：${getAltarExpireReasonLabel(
      getPayloadString(entry.payload.reason),
    )}。`
  }

  if (entry.type === 'ARTIFACT_TRIGGERED') {
    const artifactName = getArtifactName(entry.sourceId)
    const result = getPayloadString(entry.payload.result)
    const effectType = getPayloadString(entry.payload.effectType)

    if (effectType === 'peek_intent_after_ask_name') {
      return `${artifactName}照见下一动：${getIntentKindLabel(
        getPayloadString(entry.payload.intentKind),
      )}。`
    }

    if (effectType === 'seal_momentum_after_ask_name') {
      return `${artifactName}震住来势 ${getPayloadNumber(entry.payload.amount) ?? 0}，余 ${
        getPayloadNumber(entry.payload.remainingIncomingForce) ?? 0
      }。`
    }

    if (effectType === 'gain_ink_after_ask_name') {
      return `${artifactName}研墨 +${getPayloadNumber(entry.payload.amount) ?? 0}，当前 ${
        getPayloadNumber(entry.payload.currentInk) ?? 0
      }。`
    }

    if (effectType === 'break_chain_incense_bonus') {
      return `${artifactName}踏火连击：香火 +${
        getPayloadNumber(entry.payload.incenseAmount) ?? 0
      }，下一次破形额外 +${getPayloadNumber(entry.payload.amount) ?? 0}。`
    }

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
    const playerFormDelta = getPayloadNumber(entry.payload.playerFormDelta) ?? 0

    if (cardDefinition) {
      return `${artifactName}反噬：${t(cardDefinition.nameKey)}临时入手。`
    }

    if (fractureDelta > 0) {
      return `${artifactName}反噬：本场开始时榜裂 +${fractureDelta}。`
    }

    if (playerFormDelta < 0) {
      return `${artifactName}反噬：本场己形临时 ${playerFormDelta}。`
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

  if (entry.type === 'DEFEAT_SETTLED') {
    return '战斗结算：己形已散。'
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

  if (entry.type === 'PLAYER_FORM_LOST') {
    return 'log-entry incoming'
  }

  if (
    entry.type === 'FORM_BROKEN' ||
    entry.type === 'NAME_BREAK_TRIGGERED' ||
    entry.type === 'ENEMY_SETTLED' ||
    entry.type === 'DEFEAT_SETTLED'
  ) {
    return 'log-entry form'
  }

  if (entry.type === 'ARTIFACT_TRIGGERED') {
    return 'log-entry artifact'
  }

  if (entry.type === 'ARTIFACT_BACKLASH_TRIGGERED') {
    return 'log-entry backlash'
  }

  if (entry.type === 'REGISTER_RULE_TRIGGERED') {
    return 'log-entry verdict'
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
    entry.type === 'ALTAR_EXPIRED'
  ) {
    return 'log-entry name'
  }

  return 'log-entry'
}

function formatRegisterRuleLog(entry: ActionLogEntry) {
  const ruleName = getRegisterRuleName(getPayloadString(entry.payload.ruleId))
  const trigger = getPayloadString(entry.payload.trigger)

  if (trigger === 'counter_abnormal') {
    const inkDelta = getPayloadNumber(entry.payload.inkDelta) ?? 0
    const incenseDelta = getPayloadNumber(entry.payload.incenseDelta) ?? 0
    return `${ruleName}触发：断异动得墨 ${inkDelta}${
      incenseDelta > 0 ? `，偷香已断，香火 +${incenseDelta}` : ''
    }。`
  }

  if (trigger === 'enemy_named') {
    return `${ruleName}触发：正名后，本回合下一次破形 +${
      getPayloadNumber(entry.payload.pendingBreakShapeBonus) ?? 0
    }。`
  }

  if (trigger === 'break_bonus_consumed') {
    return `${ruleName}触发：追加破形 +${
      getPayloadNumber(entry.payload.breakShapeBonus) ?? 0
    }。`
  }

  if (trigger === 'altar_placed') {
    return `${ruleName}触发：首次奉坛，墨 +${getPayloadNumber(entry.payload.inkDelta) ?? 0}。`
  }

  if (trigger === 'altar_triggered') {
    return `${ruleName}触发：首次坛位生效，抽 ${
      getPayloadNumber(entry.payload.drawCount) ?? 0
    } 张。`
  }

  return `${ruleName}触发。`
}

function getRegisterRuleName(ruleId: string | undefined) {
  if (ruleId === 'register_incense_clerk') {
    return '香吏归案'
  }

  if (ruleId === 'register_fire_fleeing_name') {
    return '火名落册'
  }

  if (ruleId === 'register_dipper_empty_shell') {
    return '斗壳归位'
  }

  if (ruleId === 'register_registry_thief') {
    return '窃榜归封'
  }

  return '专属登簿'
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

  if (flowKind === 'route_selection') {
    return '路线选择'
  }

  if (flowKind === 'event_placeholder') {
    return '事件节点'
  }

  if (flowKind === 'rest_placeholder') {
    return '休整节点'
  }

  if (flowKind === 'shop_placeholder') {
    return '商店节点'
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

export function getAltarSlotWindowLabel(slot: string | undefined) {
  if (slot === 'human') {
    return '回合结束窗口'
  }

  if (slot === 'earth') {
    return '敌人行动前窗口'
  }

  if (slot === 'heaven') {
    return '下回合开始窗口'
  }

  return '触发窗口'
}

export function getAltarWindowHint(slot: string | undefined) {
  if (slot === 'human') {
    return '回合结束时读取本回合问名、正名或朱批成果'
  }

  if (slot === 'earth') {
    return '敌人行动前读取当前来势或异动压力'
  }

  if (slot === 'heaven') {
    return '下回合开始提前布置问名、抽牌、墨或归册条件'
  }

  return '按对应坛位窗口触发'
}

export function getAltarEffectLabel(altar: AltarState) {
  if (altar.effect.type === 'gain_ink_for_name_progress') {
    return '回合末收束得墨'
  }

  if (altar.effect.type === 'counter_abnormal_or_gain_ink') {
    return '敌动前断异动'
  }

  return '下回合问名得墨'
}

function getAltarInkReasonLabel(slot: string | undefined, reason: string | undefined) {
  if (reason === 'name_progress') {
    return '回合末收束本回合问名、正名或朱批成果'
  }

  if (reason === 'no_abnormal_move') {
    return '敌人行动前未遇可断异动，转为守坛余墨'
  }

  if (reason === 'heaven_altar') {
    return '下回合开始完成天坛预布'
  }

  return getAltarWindowHint(slot)
}

function getAltarSkipReasonLabel(slot: string | undefined, reason: string | undefined) {
  if (reason === 'no_name_progress') {
    return '本回合没有问名、正名或朱批成果可收束'
  }

  if (reason === 'no_target') {
    return '没有可问名目标'
  }

  return `${getAltarWindowHint(slot)}，但条件未满足`
}

function getAltarExpireReasonLabel(reason: string | undefined) {
  if (reason === 'replaced') {
    return '同坛位被新的奉坛替换'
  }

  if (reason === 'triggered') {
    return '本次窗口已结算'
  }

  return '坛位效果已结束'
}

function getIntentKindLabel(intentKind: string | undefined) {
  if (intentKind === 'incoming_force') {
    return '来势'
  }

  if (intentKind === 'abnormal_move') {
    return '异动'
  }

  return '未记名行动'
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

export function isBossEnemyDefinition(definitionId: string) {
  return enemyDefinitionsById.get(definitionId)?.tier === 'boss'
}

function getVerdictChoiceLabel(choiceId: TutorialRunState['verdict']['records'][number]['choiceId']) {
  if (choiceId === 'register') {
    return '写入榜册（登簿）'
  }

  if (choiceId === 'red_ink') {
    return '批改卡牌（朱批）'
  }

  return '抹去名籍（削籍）'
}

function getVerdictRecordDetail(record: TutorialRunState['verdict']['records'][number]) {
  if (record.choiceId === 'register') {
    return `后续战斗香火上限 +${record.maxIncenseBonusDelta}，己形上限 +${record.maxFormBonusDelta}。`
  }

  if (record.choiceId === 'red_ink') {
    return '裁定转入朱批服务，本局卡牌改造记录已更新。'
  }

  return `榜裂 +${record.fractureDelta}，强收益已经写入牌组。`
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
