# 《榜外人：残榜录》PRD 文档索引

版本：v0.7
日期：2026-05-18
适用阶段：开发启动前 / 核心战斗 MVP / 第一章 Demo 规划  
建议路径：`docs/prd/INDEX.md`

## 1. 文档用途

这组 PRD 文件用于放入本地项目库，作为 Codex、开发、测试和后续版本拆分的产品事实源。

它不是替代完整策划案，而是把“产品目标、功能范围、阶段验收、技术约束、页面需求、内容规模和 Codex 使用方式”拆成可按需读取的文件。完整机制细节仍可放在 `docs/design/`，但开发任务验收以本 PRD 为准。

## 2. 文件结构

建议放置为：

```text
docs/
  prd/
    INDEX.md
    PRD-overview.md
    PRD-gameplay.md
    PRD-content-scope.md
    PRD-architecture.md
    PRD-pages.md
    PRD-checklist.md
    PRD-codex.md
    PRD-changelog.md
```

## 3. 按需读取规则

| 场景 | 必读文件 | 说明 |
|---|---|---|
| 任何 Codex 任务开始前 | `INDEX.md`、`PRD-overview.md`、`PRD-codex.md` | 先确认产品目标、边界、开发方式 |
| 做战斗机制 | `PRD-gameplay.md`、`PRD-checklist.md` | 形、名、问名、正名、伏诛/归册、裁定、来势/异动 |
| 做第一章内容 | `PRD-content-scope.md`、`PRD-gameplay.md` | 卡牌、敌人、精英、Boss、法宝、事件、遭遇模板 |
| 做技术骨架 | `PRD-architecture.md`、`PRD-codex.md` | 技术栈、目录、数据驱动、测试 |
| 做 UI 页面 | `PRD-pages.md`、`PRD-gameplay.md` | 标题页、战斗页、裁定页、路线、商店、休整、结算 |
| 做 QA / 版本验收 | `PRD-checklist.md`、`PRD-changelog.md` | DoD、平衡目标、风险、变更记录 |
| 改需求或发现冲突 | `PRD-changelog.md` | 所有范围变化都记录到 changelog |

## 4. 事实源优先级

当文档或聊天记录冲突时，按以下顺序处理：

1. 用户最新明确指令。
2. `docs/prd/` 下最新版 PRD。
3. `docs/design/` 下最新版策划案。
4. `AGENTS.md` 中的仓库协作规则。
5. 旧聊天记录或旧版文档。

如果 Codex 根据用户最新指令修改了范围，必须同步更新 `PRD-changelog.md`，必要时更新对应 PRD 文件。

## 5. 当前版本关键变更

v0.6 在原 Codex 项目指令和 v0.4 Demo 策划案基础上纳入以下变化：

- 技术栈中的 Phaser 版本调整为 Phaser 4.1.x，当前工程锁定 `phaser@4.1.0`。
- 法宝不是卡牌本体；法宝是牌组外的局内器物。
- 法宝可生成临时法宝牌或敕令牌，但法宝本体不进入抽牌堆。
- “连续两场战斗”统一定义为反噬判定窗口，不是反噬持续两场。
- 正式版内部规划调整为 4 个常规章 + 1 个终审短章，共 5 章。
- 第一章公开 Demo 目标从 8 个普通敌人扩为 12 个普通敌人单位，并增加 18 到 22 个普通遭遇模板。
- 第一章内容分成开发 MVP 与公开 Demo 目标两档。
- 开发顺序调整为：核心战斗 MVP → 教学纵切 MVP → 第一章公开 Demo。
- PRD 拆分为按需读取文件，避免单个文档过长导致 Codex 读取负担过大。

## 6. 当前开发阶段判断

本节记录 PRD v0.6 拆分时的启动判断：项目应从“阶段 A：核心战斗 MVP”开始，而不是直接做完整第一章。

阶段 A 的最小目标：玩家能进入一场战斗，使用基础卡牌破形、问名、正名，并看到伏诛 / 归册两类结算。路线、商店、完整法宝、完整裁定、Boss、Steam 打包都不属于第一步。

当前真实进度和下一步任务不以本节为准，必须读取 `docs/tasks/PROJECT_PLAN.md`。当本索引的启动判断与 `PROJECT_PLAN.md` 的当前状态冲突时，以 `PROJECT_PLAN.md` 和用户最新明确指令为准。
