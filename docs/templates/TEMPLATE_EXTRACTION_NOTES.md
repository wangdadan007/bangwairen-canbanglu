# 模板沉淀区

版本：v0.3
日期：2026-05-19
建议路径：`docs/templates/TEMPLATE_EXTRACTION_NOTES.md`

## 1. 文件用途

本文件记录《榜外人：残榜录》开发过程中可沉淀为通用游戏模板、开发工具包或商业化数字产品的候选模块。

它不是当前游戏的功能计划，也不是立刻要维护的第二套模板仓库。当前游戏开发仍以 `docs/tasks/PROJECT_PLAN.md` 为唯一主动任务入口。

本文件只做轻量记录，帮助后续在第一章完整可玩、桌面打包或 Steam 准备完成后，能快速判断哪些系统可以去题材化、独立包装并售卖。

## 2. 记录原则

- 不为了模板反向扩大当前游戏任务范围。
- 不在本文件写入开发密钥、账号、API token 或授权不明素材。
- 不把《榜外人：残榜录》的独有世界观、文案、角色、敌人、卡牌、Boss、事件、美术或音频直接列为可售模板内容。
- 模板候选必须优先抽象为中性命名，例如 card、enemy、artifact、relic、route、event、reward、run，而不是保留封神、残榜、问名、裁定等项目独有表达。
- 只有经过实际任务验证的模块才记录为候选；纯设想放入“待观察”。
- 若模板化涉及商业化、授权、素材或版权边界变化，需要同步更新 `docs/prd/PRD-changelog.md`。

## 3. 阶段收尾检查

每个编号任务或阶段性开发任务收尾时，除常规验证和计划更新外，增加一次检查：

> 本阶段是否产生可模板化模块？是否需要记录到模板候选文档？

判断口径：

- 如果只是新增《榜外人》独有内容，不必记录。
- 如果新增的是通用规则、数据结构、resolver、页面流、QA 工具、构建/发布流程或 AI 协作流程，且未来其他卡牌 / 肉鸽项目可能复用，应记录。
- 如果模块目前仍和本作强绑定，但有明显抽象价值，可记录为“待去题材化”。

## 4. 候选模板方向

| 方向 | 暂定商品形态 | 当前状态 | 说明 |
|---|---|---|---|
| 数据驱动卡牌肉鸽模板 | `Phaser React Deckbuilder Roguelike Starter Kit` | 已有 T00-T50 回溯候选 | 抽牌、费用、出牌、敌人意图、奖励、路线、商店、事件、存档和测试。 |
| 纯逻辑卡牌战斗引擎 | `Data-Driven Card Battle Engine` | 已有 T00-T08 回溯候选 | `src/core/battle` 中可去题材化的战斗状态机、卡牌效果、日志和测试。 |
| 肉鸽局内流程模板 | `Roguelike Run Flow Kit` | 已有 T09-T39 回溯候选 | 路线、遭遇池、奖励、商店、休整、事件、解锁、结算等 run 层结构。 |
| React 卡牌游戏 UI 套件 | `React Card Game UI Kit` | 已有 T05-T46 回溯候选 | 战斗 HUD、卡牌组件、奖励页、路线页、商店页、设置页、结算页。 |
| AI 游戏开发流程模板 | `AI Game Development Planning and QA Kit` | 已有 T30-T50 回溯候选 | AGENTS、PRD 拆分、任务看板、changelog、QA checklist、内容覆盖表。 |
| Steam 桌面包装模板 | `Steam-ready Vite Phaser Desktop Wrapper` | 仅完成方案评估 | T49 已评估 Electron / Tauri；等窗口、全屏、存档路径、构建脚本和平台 QA 真正验证后再记录为模板。 |

## 5. 方向到证据映射

同一条回溯候选可能支撑多个商品方向。这里按“未来卖什么”组织证据，不强行把候选记录只归入一个模板。

| 模板方向 | 主要回溯候选 | 关系说明 |
|---|---|---|
| `Phaser React Deckbuilder Roguelike Starter Kit` | T00-T08、T09-T13、T16-T22 / T28 / T39 / T42A、T14-T15 / T26 / T31-T38 / T49A、T23-T27 / T35 / T44、T29 / T43、T30 / T38 / T42 / T45 / T48 / T50、T40-T46 | 主产品方向，吸收战斗、run flow、数据、UI、QA、存档和高级扩展模块。 |
| `Data-Driven Card Battle Engine` | T00-T08；T23-T27 / T35 / T44 | T00-T08 是核心战斗包；资源、时机窗口和 relic / artifact 可作为高级扩展。 |
| `Roguelike Run Flow Kit` | T09-T13、T16-T22 / T28 / T39 / T42A、T29 / T43 | 重点覆盖跨战流程、路线节点、事件 / 休整 / 商店、遭遇池、结算和存档。 |
| `React Card Game UI Kit` | T40-T46；参考 T05-T08、T20-T22 | T40-T46 是主要 UI 分层和反馈证据；早期战斗与页面 MVP 可作为接入案例。 |
| `AI Game Development Planning and QA Kit` | 初始化记录、T30 / T38 / T42 / T45 / T48 / T50、T14-T15 / T26 / T31-T38 / T49A | 重点覆盖 AI 协作规则、PRD 拆分、任务看板、QA、素材授权、内容覆盖和数据扩展流程。 |
| `Steam-ready Vite Phaser Desktop Wrapper` | T49 | 目前只有方案评估，不作为已验证模板；等桌面打包真实完成后再升级。 |

## 6. 候选记录格式

新增记录时使用以下格式：

```text
### YYYY-MM-DD · Txx / 阶段名称 · 候选名称

- 候选类型：
- 主归属模板：
- 也支持：
- 涉及文件：
- 可复用价值：
- 与本作强绑定部分：
- 去题材化思路：
- 依赖与授权注意：
- 是否值得抽到模板：
- 后续动作：
```

## 7. 当前记录

### 2026-05-19 · 初始化 · 模板沉淀机制

- 候选类型：开发流程 / 商业化抽象记录机制。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：全部模板方向的长期沉淀。
- 涉及文件：`AGENTS.md`、`docs/tasks/PROJECT_PLAN.md`、`docs/templates/TEMPLATE_EXTRACTION_NOTES.md`、`docs/prd/PRD-changelog.md`。
- 可复用价值：让后续每个阶段收尾都顺手判断是否产生可售模板候选，避免游戏完成后再回头拆代码。
- 与本作强绑定部分：当前只建立记录规则，不抽取本作玩法、文案或素材。
- 去题材化思路：未来候选模板统一用中性 card / enemy / route / event / reward / run 命名。
- 依赖与授权注意：模板化前需复核所有生产依赖、字体、素材、音频和第三方代码许可证。
- 是否值得抽到模板：值得记录，暂不单独抽仓库。
- 后续动作：从 T51 或下一阶段性任务开始，在任务收尾时补充是否产生模板候选。

### 2026-05-19 · T00-T08 回溯 · 纯逻辑卡牌战斗核心

- 候选类型：纯逻辑卡牌战斗引擎 / 主模板核心模块。
- 主归属模板：`Data-Driven Card Battle Engine`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`src/types/card.ts`、`src/types/effect.ts`、`src/types/enemy.ts`、`src/types/battle.ts`、`src/core/battle/battleState.ts`、`src/core/battle/battleReducer.ts`、`src/core/battle/turnFlow.ts`、`src/core/battle/cardResolver.ts`、`src/core/battle/enemyIntentResolver.ts`、`src/core/battle/nameResolver.ts`、`src/core/battle/victoryResolver.ts`、`src/core/log/actionLog.ts`、`src/tests/battleCore.test.ts`、`src/tests/enemyIntent.test.ts`、`src/tests/nameResolver.test.ts`。
- 可复用价值：已验证抽牌、费用、出牌、弃牌、回合推进、敌方意图、行动日志、目标结算和基础胜负判断，是卡牌肉鸽模板最核心的可复用骨架。
- 与本作强绑定部分：形、破形、问名、正名、伏诛 / 归册等命名和部分结算逻辑属于本作表达。
- 去题材化思路：抽象为 health / damage、identify / reveal、marked / exposed、win quality / reward tier；保留 actionLog、resolver 和测试结构。
- 依赖与授权注意：核心逻辑不应依赖 React、Phaser、DOM 或浏览器存储；模板化时要附带依赖许可证清单。
- 是否值得抽到模板：值得，是 `Data-Driven Card Battle Engine` 的第一优先候选。
- 后续动作：第一章完整可玩后，复制到独立 sandbox 仓库，用中性卡牌和敌人数据重写示例。

### 2026-05-19 · T09-T13 回溯 · 教学纵切与跨战成长流程

- 候选类型：肉鸽 run flow / onboarding flow。
- 主归属模板：`Roguelike Run Flow Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/core/run/tutorialRun.ts`、`src/core/run/rewardResolver.ts`、`src/core/run/redInkResolver.ts`、`src/core/run/verdictResolver.ts`、`src/core/run/deckResolver.ts`、`src/ui/pages/RewardPage.tsx`、`src/ui/pages/RedInkPage.tsx`、`src/ui/pages/VerdictPage.tsx`、`src/ui/pages/RunSummaryPage.tsx`、`src/tests/tutorialRun.test.ts`、`src/tests/rewardResolver.test.ts`、`src/tests/redInkResolver.test.ts`、`src/tests/verdictResolver.test.ts`。
- 可复用价值：把单场战斗串成多战教学、战后奖励、卡牌永久改造、特殊战后选择和小型结算，解决很多卡牌模板只做到单场战斗的问题。
- 与本作强绑定部分：朱批、裁定三类和归册入口是本作核心体验，不能原样出售。
- 去题材化思路：抽象为 card upgrade、run modifier、high-risk reward choice、post-battle decision；保留跨战 deck state、pending reward、pending decision 和 resolver 流程。
- 依赖与授权注意：模板示例奖励和改造词条必须重新写成中性数据，不能复用本作卡牌文案。
- 是否值得抽到模板：值得，适合作为 `Roguelike Run Flow Kit` 的早期骨架。
- 后续动作：等 T51-T60 验证完整局后，补一条“固定教学路线”和一条“随机短局路线”的模板示例。

### 2026-05-19 · T16-T22 / T28 / T39 / T42A 回溯 · 路线节点、遭遇池与页面节点流

- 候选类型：路线 / 节点 / 遭遇池 / 多敌 run flow。
- 主归属模板：`Roguelike Run Flow Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`React Card Game UI Kit`。
- 涉及文件：`src/types/route.ts`、`src/types/encounter.ts`、`src/core/run/routeResolver.ts`、`src/core/run/encounterResolver.ts`、`src/core/run/eventResolver.ts`、`src/core/run/restResolver.ts`、`src/core/run/shopResolver.ts`、`src/ui/pages/RoutePage.tsx`、`src/ui/pages/EventPage.tsx`、`src/ui/pages/RestPage.tsx`、`src/ui/pages/ShopPage.tsx`、`src/tests/routeResolver.test.ts`、`src/tests/eventResolver.test.ts`、`src/tests/restResolver.test.ts`、`src/tests/shopResolver.test.ts`、`src/tests/multiEnemyEncounter.test.ts`。
- 可复用价值：已覆盖路线节点、事件、休整、商店、精英 / Boss、遭遇池抽样、单敌 fallback、多敌 slots 和目标选择，是完整肉鸽一局流程的高价值模板。
- 与本作强绑定部分：路线视觉、节点文案、具体敌人组合和第一章结构属于本作。
- 去题材化思路：抽象为 map node graph、encounter pool、node flow kind、shop/rest/event services；示例使用中性 dungeon / arena / archive 主题。
- 依赖与授权注意：路线模板需要清楚声明只提供逻辑和基础 UI，不包含正式地图美术或商用素材。
- 是否值得抽到模板：非常值得，是 `Phaser React Deckbuilder Roguelike Starter Kit` 区别于普通战斗 demo 的关键卖点。
- 后续动作：阶段 D 后用完整局验证结果补 route authoring 文档和示例 route JSON。

### 2026-05-19 · T14-T15 / T26 / T31-T38 / T49A 回溯 · 数据驱动内容扩展流水线

- 候选类型：数据驱动内容包 / 内容覆盖工具链。
- 主归属模板：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 也支持：`AI Game Development Planning and QA Kit`、`Data-Driven Card Battle Engine`、`Roguelike Run Flow Kit`。
- 涉及文件：`src/data/cards.json`、`src/data/enemies.json`、`src/data/encounters.json`、`src/data/artifacts.json`、`src/data/events.json`、`src/data/routes.json`、`src/data/localization/zh-CN.json`、`src/data/gameData.ts`、`docs/qa/CARD_POOL_COVERAGE.md`、`src/tests/data.test.ts`、`src/tests/eliteBossEncounter.test.ts`。
- 可复用价值：多轮内容扩展证明新增卡牌、敌人、遭遇、法宝、事件和 localization 可以主要走数据 + resolver + tests，不必大改 React / Phaser 场景。
- 与本作强绑定部分：所有具体卡牌、敌人、法宝、事件、术语和中文文案属于本作内容资产。
- 去题材化思路：保留数据 schema、引用完整性校验、unlock tags、mechanic tags、coverage 表；示例内容全部替换为中性 fantasy / sci-fi / abstract card game 样例。
- 依赖与授权注意：模板化前必须清空本作剧情文案和任何授权未确认素材描述。
- 是否值得抽到模板：值得，是主模板和 AI 开发流程模板之间的桥梁。
- 后续动作：补一个 `content-authoring.md`，说明新增 card / enemy / encounter / localization / test 的最小路径。

### 2026-05-19 · T23-T27 / T35 / T44 回溯 · 资源、时机窗口、遗物与反馈事件

- 候选类型：进阶战斗扩展模块 / relic and timing system。
- 主归属模板：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 也支持：`Data-Driven Card Battle Engine`、`React Card Game UI Kit`。
- 涉及文件：`src/types/resource.ts`、`src/types/altar.ts`、`src/types/artifact.ts`、`src/core/run/resourceResolver.ts`、`src/core/battle/altarResolver.ts`、`src/core/run/artifactResolver.ts`、`src/core/battle/artifactBattleResolver.ts`、`src/ui/pages/ArtifactBar.tsx`、`src/ui/pages/actionLogView.ts`、`src/ui/audio/audioCues.ts`、`src/tests/resourceResolver.test.ts`、`src/tests/altarResolver.test.ts`、`src/tests/artifactResolver.test.ts`、`src/tests/actionLogView.test.ts`。
- 可复用价值：已验证跨战资源、回合结束 / 敌方行动前 / 下回合开始等时机窗口、牌组外器物、过载/反噬和表现反馈事件，可以抽成高级模板模块。
- 与本作强绑定部分：墨、劫数、榜裂、三坛、法宝等命名和规则含义属于本作。
- 去题材化思路：抽象为 resource meters、timing slots、relics、overload / backlash、feedback cues；示例仅保留中性资源和通用触发事件。
- 依赖与授权注意：Web Audio 占位可作为代码示例，但不得打包第三方音频；视觉/音频表现应保持可替换。
- 是否值得抽到模板：值得，但建议作为主模板的专业版或扩展模块，不是免费版核心。
- 后续动作：第一章稳定后判断哪些时机窗口应进入基础模板，哪些留给高级包。

### 2026-05-19 · T29 / T43 回溯 · 设置、存档与异常兜底

- 候选类型：本地存档 / 设置 / 容错模块。
- 主归属模板：`Roguelike Run Flow Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`Steam-ready Vite Phaser Desktop Wrapper`。
- 涉及文件：`src/types/save.ts`、`src/types/settings.ts`、`src/core/run/saveResolver.ts`、`src/core/run/storageResolver.ts`、`src/core/run/settingsResolver.ts`、`src/ui/pages/SettingsPage.tsx`、`src/tests/saveSettingsResolver.test.ts`。
- 可复用价值：已验证版本化存档、继续游戏入口、v1 到 v2 迁移、坏档 fallback、storage 异常兜底和设置状态，是 Steam / 桌面阶段前的重要通用模块。
- 与本作强绑定部分：存档内的 run 数据字段和显示文案目前与本作资源、路线和结算结构绑定。
- 去题材化思路：抽象为 saveVersion、migration、safeLoad、safeWrite、settings state；示例 run state 使用最小中性字段。
- 依赖与授权注意：浏览器 localStorage 与未来桌面文件路径要分层；Steam 模板阶段再补真实桌面路径。
- 是否值得抽到模板：值得，先进入主模板，桌面路径部分等 Steam wrapper 验证后再升级。
- 后续动作：T51-T60 后记录真实完整局中存档恢复、设置切换和坏档兜底是否稳定。

### 2026-05-19 · T30 / T38 / T42 / T45 / T48 / T50 回溯 · QA、内容覆盖与 AI 协作流程

- 候选类型：AI 游戏开发流程模板 / QA 工具包。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`AGENTS.md`、`docs/prd/`、`docs/tasks/PROJECT_PLAN.md`、`docs/tasks/OPEN_QUESTIONS.md`、`docs/assets/ASSET_MANIFEST.md`、`docs/qa/DEMO_QA_BASELINE.md`、`docs/qa/CARD_POOL_COVERAGE.md`、`docs/qa/CHAPTER_ONE_LONG_FLOW_BASELINE.md`、`docs/qa/CHAPTER_ONE_CANDIDATE_RELEASE_CHECKLIST.md`、`.github/workflows/`、`src/tests/chapterOneLongFlow.test.ts`。
- 可复用价值：已沉淀任务编号推进、PRD 拆分、changelog、开放问题、素材授权清单、内容覆盖、长流程 smoke、候选版 QA 和 CI 验证，是可较早包装成独立数字产品的流程模板。
- 与本作强绑定部分：项目术语、第一章目标、具体任务编号和素材关键词都与本作相关。
- 去题材化思路：保留文档结构、表格模板、检查项和 runbook；替换成通用 indie game / card roguelike 示例。
- 依赖与授权注意：发布前要剥离私有仓库 URL、具体商业计划、未公开素材路线和任何账号信息。
- 是否值得抽到模板：非常值得，优先级仅次于主 starter kit，甚至可以先做轻量版售卖。
- 后续动作：阶段 D 每轮收尾继续补“真实试玩反馈模板”和“bug bash 记录模板”。

### 2026-05-19 · T40-T46 回溯 · React 页面编排、反馈层与可访问设置

- 候选类型：React 卡牌游戏 UI 套件 / feedback layer。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`src/ui/pages/BattleHud.tsx`、`src/ui/pages/battleHudSelectors.ts`、`src/ui/pages/useTutorialRunFlow.ts`、`src/ui/pages/actionLogView.ts`、`src/ui/pages/TitlePage.tsx`、`src/ui/pages/RewardPage.tsx`、`src/ui/pages/RoutePage.tsx`、`src/ui/pages/ShopPage.tsx`、`src/ui/pages/RestPage.tsx`、`src/ui/pages/SettingsPage.tsx`、`src/ui/styles.css`、`src/ui/audio/audioCues.ts`。
- 可复用价值：已拆出 selector、run flow hook、日志展示 helper、tooltip、不可操作原因、响应式约束、动画开关和音量控制，适合未来沉淀为卡牌游戏 UI 套件。
- 与本作强绑定部分：视觉基调、术语解释、反馈文案、页面文案和仪式化表现是本作资产。
- 去题材化思路：保留组件分层、状态选择器、页面流和 UI 状态；替换主题色、文案、术语和示例数据。
- 依赖与授权注意：当前 UI 仍是本作风格，尚未达到可直接出售的中性 UI kit 质感；不要提前承诺商用美术质量。
- 是否值得抽到模板：值得记录，但优先级低于战斗核心、run flow 和 AI 流程模板。
- 后续动作：等 T52 全页面点击回归和 T57 低成本表现二轮完成后，再评估是否单独拆 UI kit。

### 2026-05-19 · T49 回溯 · 桌面包装方案评估

- 候选类型：Steam 桌面包装模板前置调研。
- 主归属模板：`Steam-ready Vite Phaser Desktop Wrapper`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`docs/qa/CHAPTER_ONE_CANDIDATE_RELEASE_CHECKLIST.md`、`docs/tasks/PROJECT_PLAN.md`。
- 可复用价值：已完成 Electron / Tauri 在体积、维护、构建、授权、Vite 适配和团队维护门槛上的方案评估。
- 与本作强绑定部分：当前只有评估，没有真实窗口 API、安装包、Steam 接入、崩溃日志或平台 QA。
- 去题材化思路：未来抽象为 Vite + Phaser 桌面包装 runbook，包含窗口、全屏、分辨率、存档路径、构建脚本和平台检查。
- 依赖与授权注意：未新增 Electron / Tauri 生产依赖；不能把该方向包装成已验证商品。
- 是否值得抽到模板：暂不抽，只作为 `Steam-ready Vite Phaser Desktop Wrapper` 的前置观察记录。
- 后续动作：等用户单独确认桌面打包阶段并完成真实构建验证后，再升级为模板候选。
