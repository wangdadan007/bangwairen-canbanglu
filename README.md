# 《榜外人：残榜录》

封神题材单机牌组构筑肉鸽。玩家扮演封神榜外的执簿者，在战斗中破敌之形、问敌之名、正名归册，并通过裁定逐步改写一卷破裂的封神榜。

## 当前状态

当前仓库已完成第一步技术骨架：TypeScript + Vite + React + Phaser 4.1.x 项目可以启动，现阶段仍处于阶段 A：核心战斗 MVP 的最早期。

当前应推进的阶段是：

> 阶段 A：核心战斗 MVP

第一步目标不是完整第一章，而是跑通一场可测试的最小战斗：抽牌、出牌、香火费用、破形、问名、正名、名破、伏诛 / 归册。

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

常用验证命令：

```bash
npm run typecheck
npm run test
npm run build
```

## 协作规则

- 开始任何仓库任务前先阅读 `AGENTS.md`。
- 不要擅自扩大任务范围。
- 不要擅自新增生产依赖。
- 不要编造测试结果。
- 涉及玩法、文案、美术或系统设计时，同时阅读 `docs/design/` 与相关 PRD。
- 发生需求范围、核心机制、技术栈或任务顺序变化时，同步追加 `docs/prd/PRD-changelog.md`。
