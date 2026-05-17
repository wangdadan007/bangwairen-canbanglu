# PRD-architecture：技术架构与数据驱动要求

版本：v0.6  
日期：2026-05-17  
建议路径：`docs/prd/PRD-architecture.md`

## 1. 技术方向

建议技术栈：

- TypeScript
- Vite
- React
- Phaser 4.1.x
- Electron 或 Tauri 用于桌面打包，第一版可优先 Electron
- GitHub
- GitHub Actions
- 数据驱动内容配置

第一阶段不要先做桌面打包，先确保浏览器内核心战斗 MVP 可运行、可测试、可调试。

## 2. 架构原则

必须坚持：

- 战斗逻辑和渲染逻辑分离。
- `src/core` 为纯逻辑层，不依赖 React / Phaser。
- 卡牌、敌人、遭遇、法宝、事件、裁定尽量数据驱动。
- 每张卡、每个敌人、每个遭遇、每件法宝、每个事件都必须有唯一 ID。
- 状态变化必须记录到 actionLog，方便测试、回放和调试。
- 不要把大量玩法逻辑写死在 UI 组件或 Phaser 场景里。
- 中文文案不得硬编码在核心逻辑里，应使用 localization 文件。

## 3. 建议目录结构

```text
src/
  core/
    battle/
      battleState.ts
      battleReducer.ts
      turnFlow.ts
      cardResolver.ts
      enemyIntentResolver.ts
      nameResolver.ts
      verdictResolver.ts
      artifactResolver.ts
    rng/
      seededRng.ts
    log/
      actionLog.ts
  data/
    cards.json
    enemies.json
    encounters.json
    artifacts.json
    verdicts.json
    events.json
    routes.json
    tutorial_unlocks.json
    localization/
      zh-CN.json
      en-US.json
  game/
    scenes/
      BootScene.ts
      BattleScene.ts
  ui/
    App.tsx
    pages/
      TitlePage.tsx
      BattleHud.tsx
      RewardPage.tsx
      VerdictPage.tsx
      RoutePage.tsx
      ShopPage.tsx
      RestPage.tsx
      SettingsPage.tsx
      RunSummaryPage.tsx
  types/
    card.ts
    enemy.ts
    battle.ts
    artifact.ts
    verdict.ts
    event.ts
    route.ts
  tests/
    battleCore.test.ts
    nameResolver.test.ts
    enemyIntent.test.ts
    artifactState.test.ts
```

## 4. 核心状态

建议核心状态：

| 状态 | 说明 |
|---|---|
| runState | 本局状态：角色、生命、钱、劫数、榜裂、已过节点、随机种子 |
| battleState | 当前战斗：回合、香火、敌人、意图、来势、异动、坛位、日志 |
| deckState | 抽牌堆、弃牌堆、消耗区、手牌、永久牌组 |
| routeState | 路线节点、已访问节点、当前章节 |
| unlockState | 当前已解锁机制、奖励池可见内容 |
| artifactState | 法宝列表、状态、认主进度、过载、反噬标记 |
| verdictState | 登簿条目、朱批记录、削籍记录 |
| settingsState | 分辨率、窗口、音量、语言、动画开关 |

## 5. 数据文件

第一批优先实现：

- `cards.json`
- `enemies.json`
- `encounters.json`
- `tutorial_unlocks.json`
- `localization/zh-CN.json`

后续再补：

- `artifacts.json`
- `verdicts.json`
- `events.json`
- `routes.json`
- `localization/en-US.json`

## 6. 基础类型建议

### 6.1 CardDefinition

```ts
export interface CardDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  cost: number
  type: 'talisman' | 'edict' | 'ritual' | 'counter' | 'temporary'
  unlockStage: string
  effects: CardEffect[]
  tags: string[]
}
```

### 6.2 EnemyDefinition

```ts
export interface EnemyDefinition {
  id: string
  nameKey: string
  maxForm: number
  nameSlots: number
  tier: 'minion' | 'normal' | 'key_normal' | 'elite' | 'boss'
  intents: EnemyIntentDefinition[]
  onNamed?: EnemyMechanicChange[]
  rewards?: RewardRule[]
}
```

### 6.3 ArtifactDefinition

```ts
export interface ArtifactDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  state: 'unbound' | 'bound' | 'backlash'
  triggerType: 'battle_trigger' | 'active_charge' | 'verdict_modifier'
  bindCondition: ArtifactCondition
  overloadCondition?: ArtifactCondition
  backlashEffect?: ArtifactEffect
}
```

## 7. 战斗日志

所有关键状态变化都写入 actionLog。

至少记录：

- 抽牌、弃牌、洗牌。
- 获得 / 消耗香火。
- 打出卡牌。
- 破形数值、目标、来源。
- 问名、揭示名格、正名、名破。
- 来势生成、封势抵消、异动执行或被阻止。
- 法宝触发、认主、过载、反噬。
- 伏诛 / 归册结算。
- 裁定选择。

## 8. 调试入口

从第一阶段起必须预留：

- 开发者快速战斗入口。
- 指定敌人测试。
- 指定卡组测试。
- 指定机制解锁进度测试。
- 一键胜利 / 一键归册。
- 查看 actionLog。
- 设置随机种子。

## 9. 第一阶段开发边界

DEV-001 不做：

- 完整美术。
- 路线地图。
- 商店。
- 事件。
- 法宝完整系统。
- 裁定完整系统。
- Boss。
- 桌面打包。

DEV-001 要做：

- 项目可运行。
- 战斗状态模型可运行。
- 5 到 8 张基础卡。
- 1 个敌人“纸面鬼”。
- 破形和形归零胜利。
- 预留问名 / 正名字段。
- 基础测试。

## 10. 建议脚本

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

开发任务结束前，Codex 至少应尝试运行：

```text
npm install
npm run typecheck
npm run test
npm run dev
```

如果命令因依赖或环境问题失败，必须在任务总结中明确写出失败原因。
