import { ZHAOWEI_ROLE_ID } from '../../core'
import type { RouteFlowKind } from '../../core'
import type {
  CombatState,
  EncounterDefinition,
  RouteNodeDefinition,
  TutorialArtifactOfferStage,
  TutorialRunState,
} from '../../types'

export type FirstRunGuidanceTone =
  | 'core'
  | 'pressure'
  | 'reward'
  | 'verdict'
  | 'altar'
  | 'artifact'
  | 'boss'
  | 'route'

export interface FirstRunGuidance {
  readonly tone: FirstRunGuidanceTone
  readonly eyebrow: string
  readonly title: string
  readonly body: string
  readonly terms: readonly string[]
}

export interface FirstRunGuidanceInput {
  readonly battle: CombatState
  readonly run: TutorialRunState
  readonly currentEncounter?: EncounterDefinition
  readonly currentRouteFlowKind: RouteFlowKind
  readonly currentRouteNode?: RouteNodeDefinition
}

export function createFirstRunGuidance({
  battle,
  run,
  currentEncounter,
  currentRouteFlowKind,
  currentRouteNode,
}: FirstRunGuidanceInput): FirstRunGuidance | undefined {
  if (run.pendingArtifactOffer) {
    return {
      tone: 'artifact',
      eyebrow: '法宝三选一',
      title: getArtifactOfferGuidanceTitle(run.pendingArtifactOffer.stage),
      body: '本章法宝节奏已收敛：开局、第一章途中、Boss 后各选 1 件。法宝仍是牌组外器物，不进入抽牌堆。',
      terms: ['法宝', '三选一', '牌组外'],
    }
  }

  if (run.pendingVerdict) {
    return {
      tone: 'verdict',
      eyebrow: '归册后',
      title: '裁定是在改本局规则',
      body: '写入榜册（登簿）偏稳，批改卡牌（朱批）偏构筑，抹去名籍（削籍）收益高但会推高榜裂。',
      terms: ['裁定', '登簿', '朱批', '削籍'],
    }
  }

  if (run.pendingRedInk) {
    return {
      tone: 'verdict',
      eyebrow: '朱批',
      title: '朱批会改已有牌',
      body: '选一张本局牌册里的牌写入词条；之后每场战斗抽到这张牌，批注都会跟着触发。',
      terms: ['朱批', '牌册', '跨战保留'],
    }
  }

  if (run.pendingReward) {
    return run.pendingReward.quality === 'high'
      ? {
          tone: 'reward',
          eyebrow: '归册奖励',
          title: '归册多在裁定',
          body: '真名已明再打空敌形，会变成归册：卡牌奖励仍是同一套三选一，额外收益来自裁定。',
          terms: ['问名', '正名', '归册'],
        }
      : {
          tone: 'reward',
          eyebrow: '伏诛奖励',
          title: '快打空也能赢',
          body: '未正名前收束是伏诛，节奏更快；卡牌奖励与归册同池三选一，之后仍能继续补问名和正名牌。',
          terms: ['破形', '伏诛', '奖励'],
        }
  }

  if (run.status !== 'active') {
    return {
      tone: 'route',
      eyebrow: '本局记录',
      title: '看伏诛、归册和裁定留下了什么',
      body: '结算页会把本局改榜结果收起来：Boss 结算、榜裂、法宝认主和反噬预警都在这里留档。',
      terms: ['结算', 'Boss', '法宝'],
    }
  }

  if (currentRouteFlowKind === 'shop') {
    const bossIsNext = isBossNext(currentRouteNode)

    return {
      tone: 'artifact',
      eyebrow: '商店',
      title: bossIsNext ? 'Boss 前先补答案' : '商店只处理牌册与服务',
      body: bossIsNext
        ? '进 Boss 前优先看缺口：香封留作一次性战术资源，删牌压缩牌册，朱批补核心，净卷处理污卷。'
        : '买卡会扩大牌组，朱批服务会改已有牌；香封占槽且战斗内一次性使用，法宝不进牌堆，也不在商店出售。',
      terms: ['买卡', '法宝', '朱批'],
    }
  }

  if (currentRouteFlowKind === 'rest') {
    const hasBacklash = run.artifacts.artifacts.some((artifact) => artifact.pendingBacklash)
    const bossIsNext = isBossNext(currentRouteNode)

    return {
      tone: hasBacklash ? 'artifact' : 'route',
      eyebrow: '休整',
      title: bossIsNext
        ? 'Boss 前休整只能择重'
        : hasBacklash
          ? '反噬预警可以在休整中处理'
          : '休整是在修整下一战',
      body: bossIsNext
        ? '最后休整先看己形、法宝反噬、删牌和朱批哪一个会影响 Boss；不要只按默认修形处理。'
        : hasBacklash
        ? '拭净法宝会清掉一次反噬预警；若己形吃紧，也可以优先修形，避免下一战过早失败。'
        : '这里可以修形、删去拖累牌，或用朱批补强核心牌；没有反噬预警时不必急着维护法宝。',
      terms: ['己形', '删牌', '反噬'],
    }
  }

  if (currentRouteFlowKind === 'event') {
    return {
      tone: 'route',
      eyebrow: '事件',
      title: '事件收益会写进本局',
      body: '绿色资源偏稳，榜裂与劫数选项更激进；选项不可用时会显示缺少的资源或机制。',
      terms: ['墨', '劫数', '榜裂'],
    }
  }

  if (!currentEncounter || battle.result.status !== 'ongoing') {
    return createBattleResultGuidance(battle)
  }

  if (isBossEncounter(currentEncounter, currentRouteNode)) {
    return {
      tone: 'boss',
      eyebrow: '终点压力',
      title: 'Boss 会同时考问问名与防守',
      body: '窃榜使会用来势、遮名、塞污卷挤压节奏；先辨势看清遮势或后一动，再决定封势、断异动，或抢正名归册。',
      terms: ['Boss', '来势', '异动', '归册'],
    }
  }

  if (hasBattleBacklash(battle)) {
    return {
      tone: 'artifact',
      eyebrow: '反噬',
      title: '反噬已经进场',
      body: '法宝连续过载后会在下一战结算一次代价；处理完本战后，可在休整点清理后续预警。',
      terms: ['法宝', '过载', '反噬'],
    }
  }

  if (currentEncounter.id === 'encounter_tutorial_paper_wraith') {
    if (run.roleId === ZHAOWEI_ROLE_ID) {
      return {
        tone: 'core',
        eyebrow: '照微首战',
        title: '先问名照行动，再决定收束',
        body: '照骨镜会在首次问名后辨势；照微己形低，但问名密度高，前两场尽量抢正名和归册奖励。',
        terms: ['照骨镜', '问名', '来势', '归册'],
      }
    }

    return {
      tone: 'core',
      eyebrow: '首战',
      title: '先认清胜利和高收益的区别',
      body: '打空敌人的形就能赢；先查明真名（问名）到真名已明（正名），再收束会从伏诛变成归册。',
      terms: ['形', '问名', '正名', '归册'],
    }
  }

  if (currentEncounter.id === 'encounter_tutorial_incense_thief_mouse') {
    return {
      tone: 'pressure',
      eyebrow: '第二战',
      title: '来势和异动要分开处理',
      body: '直接冲击（来势）可用封势压住；特殊行为（异动）要靠断异动、地坛或对应效果处理。',
      terms: ['来势', '封势', '异动', '断异动'],
    }
  }

  if (currentEncounter.id === 'encounter_tutorial_bronze_bell_patrol') {
    return {
      tone: 'verdict',
      eyebrow: '第三战',
      title: '归册会打开裁定',
      body: '把真名查全后收束，战后就能在登簿、朱批、削籍中选一种方式改写本局。',
      terms: ['归册', '裁定', '朱批'],
    }
  }

  if (hasStage(run, 'stage_three_altars')) {
    return {
      tone: 'altar',
      eyebrow: '三坛',
      title: '三坛看的是触发时机',
      body: '人坛收束本回合动作，地坛预判敌人行动，天坛准备下回合开局；它们不是普通延迟破形。',
      terms: ['人坛', '地坛', '天坛'],
    }
  }

  if (hasStage(run, 'stage_human_altar')) {
    return {
      tone: 'altar',
      eyebrow: '人坛',
      title: '奉坛牌会把本回合动作留到回合末',
      body: '人坛适合把问名、正名或朱批转成后续收益；想靠它得墨，需要先安排本回合动作。',
      terms: ['奉坛', '人坛', '墨'],
    }
  }

  if (run.artifacts.artifacts.length > 0) {
    return {
      tone: 'artifact',
      eyebrow: '法宝',
      title: '法宝是牌组外器物',
      body: '法宝不会挤进抽牌堆；它们在问名、正名、朱批或削籍等时机触发，认主后收益更清楚。',
      terms: ['法宝', '认主', '过载'],
    }
  }

  return undefined
}

function createBattleResultGuidance(battle: CombatState): FirstRunGuidance | undefined {
  if (battle.result.status === 'victory') {
    return battle.result.settlement === 'catalogue'
      ? {
          tone: 'reward',
          eyebrow: '战后',
          title: '本战归册，后续收益更高',
          body: '归册会进入裁定；卡牌奖励与伏诛同池三选一，问名路线的主要回报在改榜收益。',
          terms: ['归册', '裁定', '奖励'],
        }
      : {
          tone: 'reward',
          eyebrow: '战后',
          title: '本战伏诛，路线仍可推进',
          body: '伏诛适合快速收束，卡牌奖励仍与归册同池；后续有窗口时可以再尝试正名归册。',
          terms: ['伏诛', '破形', '奖励'],
        }
  }

  if (battle.result.status === 'defeat') {
    return {
      tone: 'pressure',
      eyebrow: '败退',
      title: '己形归零会结束本局战斗',
      body: '后续完整局里，休整修形和封势处理来势都能降低这种风险。',
      terms: ['己形', '休整', '封势'],
    }
  }

  return undefined
}

function hasStage(run: TutorialRunState, stageId: string) {
  return run.unlocks.stages.includes(stageId)
}

function getArtifactOfferGuidanceTitle(stage: TutorialArtifactOfferStage) {
  if (stage === 'starter') {
    return '开局只带一件器物'
  }

  if (stage === 'mid_chapter') {
    return '途中只再补一件法宝'
  }

  return 'Boss 后再收一件余响'
}

function hasBattleBacklash(battle: CombatState) {
  return battle.actionLog.some((entry) => entry.type === 'ARTIFACT_BACKLASH_TRIGGERED')
}

function isBossEncounter(
  encounter: EncounterDefinition,
  currentRouteNode: RouteNodeDefinition | undefined,
) {
  return currentRouteNode?.type === 'boss' || encounter.id.includes('boss')
}

function isBossNext(currentRouteNode: RouteNodeDefinition | undefined) {
  return (
    currentRouteNode?.type === 'boss' ||
    Boolean(currentRouteNode?.nextNodeIds.some((nodeId) => nodeId.includes('boss')))
  )
}
