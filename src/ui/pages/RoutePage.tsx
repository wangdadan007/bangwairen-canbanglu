import { getCurrentRouteNode, getRouteNodeStatus } from '../../core'
import type { LocalizationKey, RouteDefinition, RouteNodeDefinition, RouteState } from '../../types'

interface RoutePageProps {
  readonly route: RouteDefinition
  readonly routeState: RouteState
  readonly t: (key: LocalizationKey) => string
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

export function RoutePage({ route, routeState, t }: RoutePageProps) {
  const currentNode = getCurrentRouteNode(route, routeState)

  return (
    <section className="route-page" aria-label="路线与节点">
      <header>
        <div>
          <p className="panel-kicker">路线分流 / T21</p>
          <h3>{t(route.nameKey)}</h3>
        </div>
        <span>{currentNode ? nodeTypeLabels[currentNode.type] : '收束'}</span>
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
              </div>
              <em>{node.isPlaceholder ? '占位' : statusLabels[status]}</em>
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
