# 《榜外人：残榜录》

封神题材单机牌组构筑肉鸽。玩家扮演封神榜外的执簿者，在战斗中破敌之形、问敌之名、正名归册，并通过裁定逐步改写一卷破裂的封神榜。

## 当前状态

当前仓库已完成阶段 D：第一章完整可玩硬化与外部试玩前收口。浏览器版本已经能运行第一章路线，包含战斗、奖励、裁定、事件、商店、休整、法宝、设置、本地继续和错误反馈记录。

当前建议的下一步是：

> 按 `docs/qa/CHAPTER_ONE_EXTERNAL_PLAYTEST_T59.md` 做小范围外部试玩，再根据真实反馈单独进入修复队列。

实时任务进度以 `docs/tasks/PROJECT_PLAN.md` 为准；README 只保留启动和入口说明。

## 核心边界

- 敌人的生命 / 战斗实体叫“形”，不叫血量。
- 削减敌人的形叫“破形”，不写“造成伤害”。
- 形归零是唯一基础胜利条件。
- 未正名时形归零为伏诛；正名后形归零为归册。
- 裁定只保留登簿、朱批、削籍。
- 来势和异动必须分离；封势只能处理来势。
- 法宝是牌组外器物，不是卡牌本体。

明确不做：留魂、留名、敌魂卡、Boss 饶恕助战、神将收集、商周阵营战役复刻。

## 文档入口

| 文件 | 用途 |
|---|---|
| `AGENTS.md` | Codex / AI 协作开发必须遵守的仓库规则 |
| `docs/prd/INDEX.md` | PRD 文档索引、事实源优先级、按需读取规则 |
| `docs/prd/PRD-overview.md` | 产品目标、阶段范围、章节规划 |
| `docs/prd/PRD-gameplay.md` | 形、名、问名、正名、伏诛 / 归册、裁定、来势 / 异动 |
| `docs/prd/PRD-architecture.md` | 技术栈、目录结构、数据驱动、日志、测试要求 |
| `docs/prd/PRD-content-scope.md` | 第一章内容规模、敌人池、机制解锁顺序 |
| `docs/prd/PRD-pages.md` | 标题页、战斗页、奖励页、裁定页等 UI 需求 |
| `docs/prd/PRD-checklist.md` | 阶段验收、QA、风险清单 |
| `docs/prd/PRD-codex.md` | Codex 开发顺序与首批 DEV 任务 |
| `docs/prd/PRD-changelog.md` | 需求变更记录 |
| `docs/design/demo_design_v0.4.md` | 第一版 Demo 策划案 |
| `docs/tasks/codex_tasks_v0.1.md` | 首批任务拆分 |

## 建议开发顺序

1. 建立 TypeScript + Vite + React + Phaser 项目骨架。
2. 建立 `src/core` 纯逻辑层，不依赖 React / Phaser。
3. 建立卡牌、敌人、战斗状态、玩家状态、敌人意图、actionLog 等类型。
4. 建立 `cards.json`、`enemies.json` 和基础数据加载。
5. 实现抽牌、出牌、费用、弃牌、回合结束、敌人简单行动。
6. 实现破形、问名、正名、名破、伏诛 / 归册。
7. 做最小战斗 UI 与调试日志。
8. 补基础测试。

更细的任务说明见 `docs/prd/PRD-codex.md` 与 `docs/tasks/codex_tasks_v0.1.md`。

## 技术栈

- TypeScript
- Vite
- React
- Phaser 4.1.x
- Vitest
- Electron 方向预留

第一阶段先确保浏览器内核心战斗 MVP 可运行、可测试、可调试；桌面打包放到后续阶段。

## 启动命令

安装依赖并启动开发服务器：

```bash
npm install
npm run dev
```

构建浏览器试玩包并本地预览：

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

试玩时：

- 点击“新开本局”会清掉本地路线进度并从第一章开头开始。
- 点击“继续游戏”会读取浏览器本地进度，恢复到当前路线节点。
- 如果页面出现“试玩错误记录”，把页面里显示的问题信息和刚才的操作一起反馈。
- 更完整的外部试玩启动、清存档和反馈说明见 `docs/qa/CHAPTER_ONE_BROWSER_PLAYTEST_T57_T58.md`。
- 小范围外部试玩反馈模板见 `docs/qa/CHAPTER_ONE_EXTERNAL_PLAYTEST_T59.md`。
- 第一章完整可玩版收口记录见 `docs/qa/CHAPTER_ONE_PLAYABLE_RELEASE_T60.md`。

常用验证命令：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
```

完整质量门禁：

```bash
npm run test:coverage
npm run test:e2e
npm run verify:full
```

## 协作规则

- 开始任何仓库任务前先阅读 `AGENTS.md`。
- 不要擅自扩大任务范围。
- 不要擅自新增生产依赖。
- 不要编造测试结果。
- 涉及玩法、文案、美术或系统设计时，同时阅读 `docs/design/` 与相关 PRD。
- 发生需求范围、核心机制、技术栈或任务顺序变化时，同步追加 `docs/prd/PRD-changelog.md`。
