import { getCurrentRouteNode, getRouteNodeStatus } from '../../core'
import type {
  LocalizationKey,
  RouteDefinition,
  RouteNodeDefinition,
  RouteNodeId,
  RouteState,
  RouteTendencyId,
} from '../../types'

interface RoutePageProps {
  readonly route: RouteDefinition
  readonly routeState: RouteState
  readonly t: (key: LocalizationKey) => string
  readonly onChooseRouteNode?: (nodeId: RouteNodeId) => void
}

const nodeTypeLabels: Record<RouteNodeDefinition['type'], string> = {
  normal_battle: '普通战',
  elite: '精英',
  event: '事件',
  rest: '休整',
  shop: '商店',
  boss: 'Boss',
}

const statusLabels = {
  completed: '已过',
  current: '当前',
  reachable: '可达',
  locked: '未显',
}

const routeTendencyCopy: Record<RouteTendencyId, { readonly label: string; readonly hint: string }> = {
  steady: {
    label: '稳行',
    hint: '压力较稳，适合保形和补牌组厚度',
  },
  catalogue: {
    label: '归册',
    hint: '名格、精英和裁定收益更集中',
  },
  fracture: {
    label: '裂榜',
    hint: '风险更高，偏破形、劫数与裁定收益',
  },
  supply: {
    label: '补给',
    hint: '更容易接到商店、休整或资源回补',
  },
  high_pressure: {
    label: '高压',
    hint: '后段来势更急，需要更明确的构筑方向',
  },
}

export function RoutePage({ route, routeState, t, onChooseRouteNode }: RoutePageProps) {
  const currentNode = getCurrentRouteNode(route, routeState)
  const hasRouteChoices = !currentNode && routeState.reachableNodeIds.length > 0

  return (
    <section className="route-page" aria-label="路线与节点">
      <header>
        <div>
          <p className="panel-kicker">残榜路线</p>
          <h3>{t(route.nameKey)}</h3>
        </div>
        <span>{currentNode ? nodeTypeLabels[currentNode.type] : hasRouteChoices ? '择路' : '收束'}</span>
      </header>
      <p>{t(route.descriptionKey)}</p>
      <ol className="route-node-list">
        {route.nodes.map((node) => {
          const status = getRouteNodeStatus(routeState, node.id)

          return (
            <li className={`${status} ${node.type}`} key={node.id}>
              <div className="route-node-mark" aria-hidden="true">
                {getNodeMark(node.type)}
              </div>
              <div>
                <span>{nodeTypeLabels[node.type]}</span>
                <strong>{t(node.nameKey)}</strong>
                <small>{t(node.descriptionKey)}</small>
                {node.routeTendencyIds?.length ? (
                  <span className="route-tendency-row" aria-label="路线倾向">
                    {node.routeTendencyIds.map((tendencyId) => (
                      <span key={tendencyId}>{routeTendencyCopy[tendencyId].label}</span>
                    ))}
                  </span>
                ) : null}
                {status === 'reachable' ? (
                  <small className="route-choice-hint">{getRouteChoiceHint(node)}</small>
                ) : null}
              </div>
              {status === 'reachable' && onChooseRouteNode ? (
                <button
                  className="route-choice-button"
                  type="button"
                  onClick={() => onChooseRouteNode(node.id)}
                >
                  择此路
                </button>
              ) : (
                <em>{node.isPlaceholder ? '待启' : statusLabels[status]}</em>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function getNodeMark(nodeType: RouteNodeDefinition['type']) {
  if (nodeType === 'elite') {
    return '精'
  }

  if (nodeType === 'event') {
    return '事'
  }

  if (nodeType === 'rest') {
    return '息'
  }

  if (nodeType === 'shop') {
    return '市'
  }

  if (nodeType === 'boss') {
    return '终'
  }

  return '战'
}

function getRouteChoiceHint(node: RouteNodeDefinition) {
  const primaryTendencyId = node.routeTendencyIds?.[0]

  if (!primaryTendencyId) {
    return '普通节点，适合维持当前构筑节奏。'
  }

  return routeTendencyCopy[primaryTendencyId].hint
}
