import {
  getCurrentRouteNode,
  getRouteNode,
} from '../../core'
import type {
  ArtifactDefinition,
  CardDefinition,
  CardId,
  IncenseSealDefinition,
  IncenseSealId,
  LocalizationKey,
  RouteDefinition,
  RouteNodeDefinition,
  RouteState,
  TutorialRunState,
} from '../../types'

type ReadinessContext = 'route' | 'shop' | 'rest'
type ReadinessTone = 'steady' | 'watch' | 'danger'

interface RunReadinessPanelProps {
  readonly artifactDefinitionsById: ReadonlyMap<string, ArtifactDefinition>
  readonly cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>
  readonly context: ReadinessContext
  readonly incenseSealDefinitionsById: ReadonlyMap<IncenseSealId, IncenseSealDefinition>
  readonly route: RouteDefinition
  readonly routeState: RouteState
  readonly run: TutorialRunState
  readonly t: (key: LocalizationKey) => string
}

interface ReadinessItem {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly tone: ReadinessTone
}

interface ReadinessTag {
  readonly label: string
  readonly tone: ReadinessTone
}

interface DeckSignals {
  readonly askNameCount: number
  readonly breakShapeCount: number
  readonly defenseCount: number
  readonly fouledScrollCount: number
  readonly linzhaoCount: number
}

const FOULED_SCROLL_CARD_ID = 'card_fouled_scroll'

export function RunReadinessPanel({
  artifactDefinitionsById,
  cardDefinitionsById,
  context,
  incenseSealDefinitionsById,
  route,
  routeState,
  run,
  t,
}: RunReadinessPanelProps) {
  const bossDistance = getBossDistance(route, routeState)

  if (context === 'route' && bossDistance === undefined && run.completedEncounterIds.length < 5) {
    return null
  }

  const isBossNear = bossDistance !== undefined && bossDistance <= 1
  const deckSignals = createDeckSignals(run, cardDefinitionsById)
  const items = createReadinessItems({
    artifactDefinitionsById,
    cardDefinitionsById,
    deckSignals,
    incenseSealDefinitionsById,
    isBossNear,
    run,
    t,
  })
  const riskTags = createRiskTags(run, deckSignals)

  return (
    <section
      className={`run-readiness-panel ${isBossNear ? 'boss-near' : context}`}
      aria-label={isBossNear ? '临战整册' : '补给整册'}
    >
      <div className="section-title-row">
        <div>
          <p className="panel-kicker">{isBossNear ? 'Boss 前准备' : '当前整册'}</p>
          <h3>{isBossNear ? '临战整册' : getContextTitle(context)}</h3>
        </div>
        <span>{getBossDistanceLabel(bossDistance)}</span>
      </div>
      <div className="run-readiness-grid">
        {items.map((item) => (
          <div className={`run-readiness-item ${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </div>
      <div className="readiness-risk-row" aria-label="当前风险标签">
        {riskTags.map((tag) => (
          <span className={`readiness-tag ${tag.tone}`} key={tag.label}>
            {tag.label}
          </span>
        ))}
      </div>
      <p className="run-readiness-note">{getContextNote(context, isBossNear)}</p>
    </section>
  )
}

function createReadinessItems({
  artifactDefinitionsById,
  cardDefinitionsById,
  deckSignals,
  incenseSealDefinitionsById,
  isBossNear,
  run,
  t,
}: {
  readonly artifactDefinitionsById: ReadonlyMap<string, ArtifactDefinition>
  readonly cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>
  readonly deckSignals: DeckSignals
  readonly incenseSealDefinitionsById: ReadonlyMap<IncenseSealId, IncenseSealDefinition>
  readonly isBossNear: boolean
  readonly run: TutorialRunState
  readonly t: (key: LocalizationKey) => string
}): readonly ReadinessItem[] {
  const formRatio = run.playerForm.max > 0 ? run.playerForm.current / run.playerForm.max : 0
  const boundArtifacts = run.artifacts.artifacts.filter(
    (artifact) => artifact.bindingStatus === 'bound',
  ).length
  const pendingBacklash = run.artifacts.artifacts.filter((artifact) => artifact.pendingBacklash)
    .length
  const artifactNames = run.artifacts.artifacts
    .map((artifact) => artifactDefinitionsById.get(artifact.definitionId))
    .filter((definition): definition is ArtifactDefinition => Boolean(definition))
    .slice(0, 2)
    .map((definition) => t(definition.nameKey))
  const sealNames = run.incenseSeals.seals
    .map((seal) => incenseSealDefinitionsById.get(seal.definitionId))
    .filter((definition): definition is IncenseSealDefinition => Boolean(definition))
    .slice(0, 2)
    .map((definition) => t(definition.nameKey))
  const annotatedCards = run.deckCards.filter((card) => card.annotations.length > 0).length
  const registerNames = run.verdict.registerEntries
    .flatMap((entry) => entry.ruleNameKey ?? [])
    .slice(-2)
    .map((nameKey) => t(nameKey))
  const bestCardNames = getPreparedCardNames(run, cardDefinitionsById, t)

  return [
    {
      label: '己形',
      value: `${run.playerForm.current} / ${run.playerForm.max}`,
      detail:
        formRatio <= 0.35
          ? '偏危，休整或香封优先'
          : formRatio <= 0.6
            ? '可战，但别硬吃高来势'
            : '承压余地充足',
      tone: formRatio <= 0.35 ? 'danger' : formRatio <= 0.6 ? 'watch' : 'steady',
    },
    {
      label: '墨 / 香火钱',
      value: `${run.resources.ink} 墨 / ${run.currency.incenseMoney} 钱`,
      detail:
        run.resources.ink <= 0
          ? '缺留墨护名和墨净污卷空间'
          : run.currency.incenseMoney >= 45
            ? '可接删牌、买牌或服务'
            : '钱少，优先买关键答案',
      tone: run.resources.ink <= 0 ? 'watch' : 'steady',
    },
    {
      label: '问名 / 防守',
      value: `问名 ${deckSignals.askNameCount} / 防守 ${deckSignals.defenseCount}`,
      detail:
        deckSignals.askNameCount <= 1
          ? '归册线会慢'
          : deckSignals.defenseCount <= 1
            ? 'Boss 来势或异动答案偏少'
            : '问名与防守都有入口',
      tone:
        deckSignals.askNameCount <= 1 || deckSignals.defenseCount <= 1 ? 'watch' : 'steady',
    },
    {
      label: '收束牌',
      value: `破形 ${deckSignals.breakShapeCount} / 临诏 ${deckSignals.linzhaoCount}`,
      detail:
        bestCardNames.length > 0
          ? bestCardNames.join(' / ')
          : isBossNear
            ? 'Boss 前要确认能打空形'
            : '继续补构筑核心',
      tone: deckSignals.breakShapeCount <= 3 ? 'watch' : 'steady',
    },
    {
      label: '香封',
      value: `${run.incenseSeals.seals.length} / ${run.incenseSeals.maxSlots}`,
      detail: sealNames.length > 0 ? sealNames.join(' / ') : '无一次性战术资源',
      tone: run.incenseSeals.seals.length === 0 ? 'watch' : 'steady',
    },
    {
      label: '法宝 / 改榜',
      value: `${run.artifacts.artifacts.length} 件 / 认主 ${boundArtifacts}`,
      detail:
        pendingBacklash > 0
          ? `反噬预警 ${pendingBacklash} 件`
          : registerNames.length > 0
            ? registerNames.join(' / ')
            : artifactNames.length > 0
              ? artifactNames.join(' / ')
              : `朱批 ${annotatedCards} 张牌`,
      tone: pendingBacklash > 0 ? 'danger' : 'steady',
    },
  ]
}

function createDeckSignals(
  run: TutorialRunState,
  cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>,
): DeckSignals {
  return run.deckCards.reduce<DeckSignals>(
    (signals, deckCard) => {
      const definition = cardDefinitionsById.get(deckCard.definitionId)

      if (!definition) {
        return signals
      }

      return {
        askNameCount: signals.askNameCount + (hasEffect(definition, ['ASK_NAME']) ? 1 : 0),
        breakShapeCount:
          signals.breakShapeCount +
          (hasEffect(definition, [
            'APPLY_FIRE_MARK',
            'APPLY_THUNDER_LEAD',
            'BREAK_SHAPE',
            'TRIGGER_FIRE_MARK',
          ])
            ? 1
            : 0),
        defenseCount:
          signals.defenseCount +
          (hasEffect(definition, ['COUNTER_ABNORMAL_MOVE', 'SEAL_MOMENTUM']) ? 1 : 0),
        fouledScrollCount:
          signals.fouledScrollCount + (deckCard.definitionId === FOULED_SCROLL_CARD_ID ? 1 : 0),
        linzhaoCount:
          signals.linzhaoCount + (hasEffect(definition, ['PLACE_LINZHAO']) ? 1 : 0),
      }
    },
    {
      askNameCount: 0,
      breakShapeCount: 0,
      defenseCount: 0,
      fouledScrollCount: 0,
      linzhaoCount: 0,
    },
  )
}

function createRiskTags(run: TutorialRunState, deckSignals: DeckSignals): readonly ReadinessTag[] {
  const formRatio = run.playerForm.max > 0 ? run.playerForm.current / run.playerForm.max : 0
  const tags: ReadinessTag[] = []

  if (formRatio <= 0.35) {
    tags.push({ label: '己形吃紧', tone: 'danger' })
  }

  if (run.resources.ink <= 0) {
    tags.push({ label: '无墨护名', tone: 'watch' })
  }

  if (run.incenseSeals.seals.length === 0) {
    tags.push({ label: '无香封', tone: 'watch' })
  }

  if (run.artifacts.artifacts.some((artifact) => artifact.pendingBacklash)) {
    tags.push({ label: '法宝反噬', tone: 'danger' })
  }

  if (deckSignals.fouledScrollCount > 0) {
    tags.push({ label: `污卷 ${deckSignals.fouledScrollCount}`, tone: 'danger' })
  }

  if (run.resources.fracture >= 3) {
    tags.push({ label: '高榜裂', tone: 'danger' })
  }

  if (run.resources.doom >= 3) {
    tags.push({ label: '高劫数', tone: 'watch' })
  }

  if (deckSignals.defenseCount <= 1) {
    tags.push({ label: '封势 / 断异偏少', tone: 'watch' })
  }

  return tags.length > 0 ? tags.slice(0, 6) : [{ label: '风险可控', tone: 'steady' }]
}

function getPreparedCardNames(
  run: TutorialRunState,
  cardDefinitionsById: ReadonlyMap<CardId, CardDefinition>,
  t: (key: LocalizationKey) => string,
) {
  return run.deckCards
    .map((card) => cardDefinitionsById.get(card.definitionId))
    .filter((definition): definition is CardDefinition => Boolean(definition))
    .filter((definition) =>
      hasEffect(definition, ['ASK_NAME', 'COUNTER_ABNORMAL_MOVE', 'PLACE_LINZHAO', 'SEAL_MOMENTUM']),
    )
    .slice(0, 2)
    .map((definition) => t(definition.nameKey))
}

function hasEffect(definition: CardDefinition, effectTypes: readonly string[]) {
  return definition.effects.some((effect) => effectTypes.includes(effect.type))
}

function getBossDistance(route: RouteDefinition, state: RouteState): number | undefined {
  const currentNode = getCurrentRouteNode(route, state)
  const frontierNodes = currentNode
    ? [currentNode]
    : state.reachableNodeIds
        .map((nodeId) => getRouteNode(route, nodeId))
        .filter((node): node is RouteNodeDefinition => Boolean(node))

  if (frontierNodes.some((node) => node.type === 'boss')) {
    return 0
  }

  if (frontierNodes.some((node) => hasNextBossNode(route, node))) {
    return 1
  }

  if (
    frontierNodes.some((node) =>
      node.nextNodeIds
        .map((nodeId) => getRouteNode(route, nodeId))
        .filter((nextNode): nextNode is RouteNodeDefinition => Boolean(nextNode))
        .some((nextNode) => hasNextBossNode(route, nextNode)),
    )
  ) {
    return 2
  }

  return undefined
}

function hasNextBossNode(route: RouteDefinition, node: RouteNodeDefinition) {
  return node.nextNodeIds.some((nodeId) => getRouteNode(route, nodeId)?.type === 'boss')
}

function getContextTitle(context: ReadinessContext) {
  if (context === 'shop') {
    return '补给整册'
  }

  if (context === 'rest') {
    return '休整整册'
  }

  return '后段整册'
}

function getBossDistanceLabel(distance: number | undefined) {
  if (distance === 0) {
    return '当前 Boss'
  }

  if (distance === 1) {
    return '下一节点 Boss'
  }

  if (distance === 2) {
    return '两节点内 Boss'
  }

  return '准备状态'
}

function getContextNote(context: ReadinessContext, isBossNear: boolean) {
  if (context === 'shop') {
    return isBossNear
      ? '商店最后看答案：买卡补缺口，删牌压缩，朱批强化核心，香封留给 Boss 内关键回合。'
      : '商店会改变后续牌组厚度和一次性资源，先确认当前缺收束、防守、净卷还是护名。'
  }

  if (context === 'rest') {
    return isBossNear
      ? '休整最后看承压：己形、删牌、朱批和法宝反噬只能择其一，优先处理会导致 Boss 前失手的短板。'
      : '休整不是单纯回血点，删牌、朱批和法宝维护都会改变后续几战的稳定性。'
  }

  return isBossNear
    ? '进 Boss 前确认能破形收束，也确认有处理来势、异动、遮名、污卷或榜裂压力的答案。'
    : '后段路线开始检验构筑方向；补给线保形，高压线需要更明确的封势、断异动和收束能力。'
}
