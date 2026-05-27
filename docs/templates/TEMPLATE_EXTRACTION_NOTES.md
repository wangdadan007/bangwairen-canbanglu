# 模板沉淀区

版本：v1.0
日期：2026-05-22
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
| React 卡牌游戏 UI 套件 | `React Card Game UI Kit` | 已有 T05-T58 回溯候选 | 战斗 HUD、卡牌组件、奖励页、路线页、商店页、设置页、结算页、反馈层、错误边界。 |
| AI 游戏开发流程模板 | `AI Game Development Planning and QA Kit` | 已有 T30-T60 回溯候选 | AGENTS、PRD 拆分、任务看板、changelog、QA checklist、内容覆盖表、试玩包 runbook、外部反馈模板、阶段收口清单。 |
| Steam 桌面包装模板 | `Steam-ready Vite Phaser Desktop Wrapper` | 仅完成方案评估 | T49 已评估 Electron / Tauri；等窗口、全屏、存档路径、构建脚本和平台 QA 真正验证后再记录为模板。 |

## 5. 方向到证据映射

同一条回溯候选可能支撑多个商品方向。这里按“未来卖什么”组织证据，不强行把候选记录只归入一个模板。

| 模板方向 | 主要回溯候选 | 关系说明 |
|---|---|---|
| `Phaser React Deckbuilder Roguelike Starter Kit` | T00-T08、T09-T13 / T65A / T66、T16-T22 / T28 / T39 / T42A / T65、T14-T15 / T26 / T31-T38 / T49A、T23-T27 / T35 / T44 / T67、T29 / T43、T30 / T38 / T42 / T45 / T48 / T50 / T58、T40-T46 / T56-T58 | 主产品方向，吸收战斗、run flow、数据、UI、QA、存档、高级扩展和试玩交付模块。 |
| `Data-Driven Card Battle Engine` | T00-T08；T23-T27 / T35 / T44 / T67 | T00-T08 是核心战斗包；资源、时机窗口和 relic / artifact 可作为高级扩展。 |
| `Roguelike Run Flow Kit` | T09-T13 / T65A / T66、T16-T22 / T28 / T39 / T42A / T65、T29 / T43 | 重点覆盖跨战流程、路线节点、事件 / 休整 / 商店、遭遇池、结算、存档，以及路线 / 角色倾向驱动的奖励、relic offer、卡牌改造 offer、敌人专属 run modifier 与风险收益判词池。 |
| `React Card Game UI Kit` | T40-T46、T56-T58；参考 T05-T08、T20-T22 | T40-T46 是主要 UI 分层和反馈证据；T56-T58 补首局提示、读屏标签、错误边界和试玩错误反馈。 |
| `AI Game Development Planning and QA Kit` | 初始化记录、T30 / T38 / T42 / T45 / T48 / T50 / T58-T60、T14-T15 / T26 / T31-T38 / T49A、T51 / T52-T53 / T56 | 重点覆盖 AI 协作规则、PRD 拆分、任务看板、QA、素材授权、内容覆盖、数据扩展、试玩交付、外部反馈和阶段收口流程。 |
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

### 2026-05-27 · T101 · 战斗首屏构图、美术落位规格与可运行重排

- 候选类型：combat screen composition / art placement spec / runtime-first visual planning / runnable layout slice。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`docs/design/CHAPTER_ONE_T101_BATTLE_SCREEN_ART_PLACEMENT.md`、`src/ui/pages/BattleHud.tsx`、`src/ui/styles.css`、`scripts/capture-t96-battle-layout-screenshots.mjs`、`package.json`、`docs/prd/PRD-pages.md`、`docs/assets/ASSET_MANIFEST.md`、`docs/tasks/PROJECT_PLAN.md`、`docs/prd/PRD-changelog.md`。
- 可复用价值：把卡牌战斗首屏拆成顶部资源、左侧玩家角色、中央动作通道、右侧敌人和底部操作层，并进一步把玩家节奏状态贴左侧角色、持续增益槽贴底部快捷、中央只留动作通道；题材核心物从常驻大面板降为背景、贴对象信息和关键时展开，再落到可运行 React/CSS shell 与截图 manifest 指标，适合复用到信息量较大的战斗 UI 定稿前规格。
- 与本作强绑定部分：执簿者、残榜审案、名格、问名、正名、裁定、衡简、照微、莲烬、纸面鬼和窃榜使属于本作。
- 去题材化思路：抽象为 player anchor, enemy anchor, action lane, thematic surface, enemy-attached status, temporary reveal overlay 和 bottom operation layer；示例使用中性 card battler / boss combat / inspect action 命名。
- 依赖与授权注意：本轮未新增生产依赖、第三方素材、AI 生成图、字体、音频或正式图片；模板化时要保留“先定落位规格，再生产资产”的授权护栏。
- 是否值得抽到模板：值得记录，暂不单独抽仓库。
- 后续动作：若 T101 截图审阅成立，可继续补 responsive layout token、screenshot metric 和 art handoff checklist 模板；若审图仍觉得复杂，再围绕敌方贴身信息和底部快捷区继续减法。

### 2026-05-27 · T100 · 关键反馈短动效与 reduced-motion 验收流程

- 候选类型：UI feedback animation / screenshot manifest / reduced-motion QA。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/ui/pages/BattleHud.tsx`、`src/ui/pages/VerdictPage.tsx`、`src/ui/styles.css`、`scripts/capture-t96-battle-layout-screenshots.mjs`、`package.json`、`docs/qa/CHAPTER_ONE_T100_KEY_FEEDBACK_ANIMATIONS.md`、`docs/assets/ASSET_MANIFEST.md`、`docs/tasks/PROJECT_PLAN.md`、`docs/prd/PRD-changelog.md`。
- 可复用价值：把 card battler 的关键动作反馈拆成 actionLog 派生、shell class、one-shot burst overlay、页面进入动效、动画关闭兜底和截图 manifest 指标，适合复用到其他卡牌战斗 UI 的可读性 polish。
- 与本作强绑定部分：破形、问名、正名、封势、异动、裁定、残榜审案和相关中文反馈文案属于本作。
- 去题材化思路：抽象为 damage feedback、reveal feedback、state change feedback、block feedback、special action feedback、post-combat choice feedback、latest-log-priority 和 reduced-motion guardrail；示例使用中性 combat log / battle shell / result page 命名。
- 依赖与授权注意：本轮未新增生产依赖、第三方素材、AI 生成图、字体、音频或正式图片；模板化时要声明这些是代码生成的 CSS 动效，不包含特效贴图、序列帧或音频资源。
- 是否值得抽到模板：值得记录，暂不单独抽仓库。
- 后续动作：若后续加入正式特效资源或音效，可继续补 asset manifest 状态流转、motion token 和动画强度分级模板。

### 2026-05-27 · T99 · 非正式素材前视觉方向与程序化占位流程

- 候选类型：视觉方向规划 / 程序化占位 / 素材授权护栏 / 自动截图验收流程。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`docs/design/CHAPTER_ONE_T99_VISUAL_DIRECTION_AND_PLACEHOLDERS.md`、`src/ui/pages/BattleHud.tsx`、`src/ui/styles.css`、`scripts/capture-t96-battle-layout-screenshots.mjs`、`docs/qa/CHAPTER_ONE_T99_VISUAL_PLACEHOLDERS.md`、`docs/assets/ASSET_MANIFEST.md`、`docs/tasks/PROJECT_PLAN.md`、`docs/prd/PRD-changelog.md`。
- 可复用价值：把“正式美术还没进来，但截图不能再是文字块”拆成角色 / 敌人视觉方向、程序化占位、截图 manifest、素材台账和 AI / 第三方授权边界，适合复用到其他无正式素材的卡牌战斗或游戏原型。
- 与本作强绑定部分：衡简、照微、莲烬、纸面鬼、窃榜使、残榜审案、问名、正名和裁定等命名与题材表达属于本作。
- 去题材化思路：抽象为 playable role visual direction, tutorial enemy visual direction, boss visual direction, programmatic placeholder, screenshot visibility metric, asset manifest guardrail；示例使用中性 role_a / role_b / role_c / tutorial_enemy / chapter_boss。
- 依赖与授权注意：本轮未新增生产依赖、第三方素材、AI 生成图、字体、音频或正式图片；模板化时要明确不包含美术资产，并保留 AI 概念候选不得直接入正式构建的检查项。
- 是否值得抽到模板：值得记录，暂不单独抽仓库。
- 后续动作：若后续进入 AI 概念候选或人工正式美术，可继续补 contact sheet、资产状态流转和正式构建授权检查模板。

### 2026-05-25 · T94 · 游戏画面表现规格与截图验收包

- 候选类型：表现规格 / UI QA / 自动截图验收流程。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`docs/qa/CHAPTER_ONE_T94_PRESENTATION_PHASE_TWO.md`、`scripts/capture-t94-presentation-screenshots.mjs`、`docs/assets/ASSET_MANIFEST.md`、`src/ui/pages/BattleHud.tsx`、`src/ui/styles.css`、`src/game/scenes/BattleScene.ts`、`docs/tasks/PROJECT_PLAN.md`。
- 可复用价值：把“画面表现优化”拆成首屏层级、敌方锚点、关键行动可读性、正式素材前置清单、三档视口截图和静态 / 动画关闭可读性检查，适合复用到其他卡牌战斗或肉鸽项目的表现验收。
- 与本作强绑定部分：残榜、裁定、破形、问名、正名、来势、异动、法宝等术语和题材视觉属于本作。
- 去题材化思路：抽象为 battle stage hierarchy、enemy visual anchor、action readability cue、asset production backlog、screenshot manifest、reduced motion guardrail；示例使用中性 health / intent / status / relic / reward 命名。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时必须移除本作题材文案，并单独声明不包含正式美术、字体或音频资产。
- 是否值得抽到模板：值得记录，暂不单独抽仓库。
- 后续动作：若后续 T94A/T95 继续补截图稳定性、视觉 token 或素材 contact sheet，可合并成通用 presentation QA kit。

### 2026-05-26 · T95 · 卡牌肉鸽战斗首屏结构设计

- 候选类型：竞品 UI 拆解 / 战斗首屏信息架构 / 可执行布局方案。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`docs/design/CHAPTER_ONE_BATTLE_SCREEN_STRUCTURE_T95.md`、`docs/tasks/PROJECT_PLAN.md`、`docs/prd/PRD-changelog.md`。
- 可复用价值：把“竞品看起来像真实游戏”拆成可执行的首屏判断链：当前危险、当前操作、核心差异、长期状态和回看解释，并把卡牌肉鸽常见结构抽象为中部战场、底部手牌、边缘状态和折叠日志；最新推荐口径是用成熟卡牌肉鸽横向骨架承接可读性，用题材化中轴承接作品调性。
- 与本作强绑定部分：残榜案面、敌方压案、形、名、问名、正名、来势、异动、三坛、法宝等术语和国风视觉意象属于本作。
- 去题材化思路：抽象为 combat arena, enemy row, hand rail, resource strip, central ritual axis, corner equipment slots, intent badge, special action badge, timeline slots, relic rail 和 log drawer；示例用中性 fantasy / sci-fi / abstract card battler 内容替代本作题材。
- 依赖与授权注意：本轮只引用公开商店页和新闻报道做研究，未新增生产依赖或正式素材；模板化时需要移除第三方竞品截图，只保留分析框架和中性 wireframe。
- 是否值得抽到模板：值得记录，暂不单独抽仓库。
- 后续动作：T96 若完成可运行重构和三视口截图验收，可与 T94 合并为完整 card battle screen layout kit。

### 2026-05-26 · T96 · 可运行卡牌肉鸽战斗首屏 shell

- 候选类型：React 战斗页布局 / 卡牌手牌操作区 / 自动截图验收流程。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/ui/App.tsx`、`src/ui/pages/BattleHud.tsx`、`src/ui/styles.css`、`scripts/capture-t96-battle-layout-screenshots.mjs`、`docs/qa/CHAPTER_ONE_T96_BATTLE_LAYOUT_RESTRUCTURE.md`、`docs/tasks/PROJECT_PLAN.md`、`docs/prd/PRD-changelog.md`。
- 可复用价值：把可玩的卡牌肉鸽战斗页拆成 top risk resource bar、player anchor、enemy stage summary、central mechanic axis、bottom hand rail、command strip、equipment corners 和 compact log drawer，并配套三档视口截图脚本与 manifest 指标，适合复用到其他 deckbuilder / roguelike battle UI。
- 与本作强绑定部分：残榜审案、形、问名、正名、来势、异动、三坛、法宝、香封、裁定等术语和国风表达属于本作。
- 去题材化思路：抽象为 battle shell、player anchor、enemy row、intent badge、special action badge、resource rail、timeline slots、equipment slots、hand rail、action buttons、log drawer、screenshot manifest；示例改用 health、energy、block、intent、status、relic、timeline 等中性命名。
- 依赖与授权注意：本轮未新增生产依赖、第三方素材或 AI 生成正式图；模板化时需要移除本作文案和题材 CSS 命名，只保留结构、状态映射和截图验收思路。
- 是否值得抽到模板：值得记录，暂不单独抽仓库。
- 后续动作：等人工审图 / 试玩确认后，可与 T94 表现验收、T95 结构设计合并成完整 card battle screen layout kit。

### 2026-05-26 · T97 · 新战斗 shell 表现切片与截图验收

- 候选类型：CSS / canvas-style presentation layer / reduced-motion visual QA。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/ui/pages/BattleHud.tsx`、`src/ui/styles.css`、`src/game/scenes/BattleScene.ts`、`scripts/capture-t96-battle-layout-screenshots.mjs`、`docs/qa/CHAPTER_ONE_T97_BATTLE_SHELL_PRESENTATION_SLICE.md`、`docs/assets/ASSET_MANIFEST.md`、`docs/tasks/PROJECT_PLAN.md`、`docs/prd/PRD-changelog.md`。
- 可复用价值：把战斗界面正式素材前的表现工作拆成 enemy silhouette layers、card frame marks、action-state visual cues、boss pressure layers、verdict stamps、reduced-motion fallback 和 screenshot metrics，适合复用到其他无正式美术资产的卡牌战斗原型。
- 与本作强绑定部分：残榜、敌形、来势、异动、正名、裁定、符诏、判印和 Boss 压案等题材表达属于本作。
- 去题材化思路：抽象为 enemy portrait layers、intent status overlay、card frame token、choice stamp, boss emphasis, motion preference guardrail 和 screenshot manifest；示例使用中性 enemy / boss / card / choice / effect / relic 命名。
- 依赖与授权注意：本轮未新增生产依赖、第三方素材、AI 生成正式图、字体或音频；模板化时要声明这些只是 CSS / canvas 程序化占位，不包含正式美术资源。
- 是否值得抽到模板：值得记录，暂不单独抽仓库。
- 后续动作：若用户审图认可，可把 T94 / T95 / T96 / T97 合并为 battle screen layout + presentation QA kit；若审图要求改结构，先迁移 T97 层再抽象模板。

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

### 2026-05-22 · T65 · 角色 / 路线倾向驱动的奖励与 relic offer

- 候选类型：肉鸽 run flow / build-direction resolver。
- 主归属模板：`Roguelike Run Flow Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`React Card Game UI Kit`。
- 涉及文件：`src/core/run/rewardResolver.ts`、`src/core/run/artifactResolver.ts`、`src/core/run/bossRoutePressureResolver.ts`、`src/core/battle/battleState.ts`、`src/ui/pages/RoutePage.tsx`、`src/ui/pages/ArtifactOfferPage.tsx`、`src/tests/rewardResolver.test.ts`、`src/tests/artifactResolver.test.ts`、`src/tests/eliteBossEncounter.test.ts`。
- 可复用价值：把角色 archetype、路线 tendency、奖励 offer、relic offer 和 Boss 开场压力连接成一套确定性倾向系统，适合复用到其他牌组构筑肉鸽项目中，让路线选择和构筑奖励更早产生可感知回应。
- 与本作强绑定部分：衡简、照微、莲烬、法宝、窃榜使、问名 / 归册 / 裁定等命名与规则表达属于本作。
- 去题材化思路：抽象为 role archetype weights、route tendency weights、reward option ordering、relic offer ordering、boss opening pressure profile；示例使用中性 warrior / scout / caster 角色与 damage / control / economy / risk 标签。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时只保留 resolver 结构和中性样例数据。
- 是否值得抽到模板：值得记录，适合成为 `Roguelike Run Flow Kit` 的中后期 build-direction 模块。
- 后续动作：待 T66 人工试玩复核后，再决定是否把“确定性排序”升级为 seeded weighted offer 模板。

### 2026-05-22 · T65A · 目标兼容与倾向驱动的卡牌改造 offer

- 候选类型：run flow / card upgrade offer resolver。
- 主归属模板：`Roguelike Run Flow Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`Data-Driven Card Battle Engine`、`React Card Game UI Kit`。
- 涉及文件：`src/core/run/redInkResolver.ts`、`src/types/effect.ts`、`src/core/battle/cardResolver.ts`、`src/ui/pages/RedInkPage.tsx`、`src/tests/redInkResolver.test.ts`。
- 可复用价值：把卡牌改造池拆成总池、解锁过滤、目标牌兼容过滤、角色权重、路线权重和稳定随机展示，适合复用到其他牌组构筑项目的升级 / 附魔 / 铭刻系统。
- 与本作强绑定部分：朱批、香火、墨、劫数、三坛、问名、正名等命名和触发含义属于本作。
- 去题材化思路：抽象为 upgrade option pool、unlock gates、card compatibility predicates、role archetype weights、route tendency weights、seeded display count；示例使用中性 draw / energy / block / status / risk 标签。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时只保留 resolver 和中性样例数据。
- 是否值得抽到模板：值得记录，适合作为 `Roguelike Run Flow Kit` 的 card upgrade service 模块。
- 后续动作：待 T66 试玩确认候选数量和过滤手感后，再决定是否把目标牌筛选 UI 抽成通用组件。

### 2026-05-22 · T66 · 敌人专属 run modifier 与风险收益判词池

- 候选类型：run flow / enemy-specific modifier / risk-reward verdict resolver。
- 主归属模板：`Roguelike Run Flow Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`Data-Driven Card Battle Engine`、`React Card Game UI Kit`。
- 涉及文件：`src/core/run/verdictResolver.ts`、`src/core/battle/registerBattleResolver.ts`、`src/core/battle/drawResolver.ts`、`src/core/battle/cardResolver.ts`、`src/core/battle/nameResolver.ts`、`src/core/battle/altarResolver.ts`、`src/ui/pages/VerdictPage.tsx`、`src/ui/pages/RunSummaryPage.tsx`、`src/tests/verdictResolver.test.ts`。
- 可复用价值：把“击败特定精英 / Boss 后获得一条本局永久规则”做成数据化 ruleId + 触发窗口 + 每战上限 + 日志反馈，同时把高风险战后选择拆成多个收益变体并支持终局过滤，适合复用到其他牌组构筑肉鸽的 elite reward、boss seal、curse reward 或 pact 系统。
- 与本作强绑定部分：登簿、削籍、榜裂、墨、香火、劫数、裂形符和具体敌人名称属于本作。
- 去题材化思路：抽象为 enemy-specific run modifiers、post-battle verdict options、risk meter delta、next-combat start bonus、combat trigger windows；示例使用中性 elite_a / elite_b / boss_flag、energy / currency / curse / delayed bonus 命名。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时只保留 resolver、触发窗口和中性样例数据。
- 是否值得抽到模板：值得记录，适合作为 `Roguelike Run Flow Kit` 的 advanced run reward 模块。
- 后续动作：待 T68 人工试玩确认收益强度和显示可读性后，再决定是否抽象为通用 rule registry。

### 2026-05-22 · T67 · 时间窗口型延迟效果与触发提示模板

- 候选类型：战斗时机窗口 / card timing template / UI feedback pattern。
- 主归属模板：`Data-Driven Card Battle Engine`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`React Card Game UI Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`docs/prd/PRD-gameplay.md`、`src/ui/pages/actionLogView.ts`、`src/ui/pages/BattleHud.tsx`、`src/ui/pages/firstRunGuidance.ts`、`src/data/localization/zh-CN.json`、`src/tests/altarResolver.test.ts`、`src/tests/data.test.ts`。
- 可复用价值：把“打出一张牌，布置到未来某个战斗窗口，再按窗口读取条件结算”的规则拆成规则定义、卡牌模板、触发 / 跳过 / 归寂日志和 HUD 提示，可复用到其他卡牌游戏的 stance、trap、delayed spell、reaction slot 或 next-turn setup 系统。
- 与本作强绑定部分：人坛、地坛、天坛、问名、正名、朱批、墨、归册等命名和仪式感属于本作。
- 去题材化思路：抽象为 timing slots，例如 end_of_player_turn、before_enemy_action、next_player_turn_start；卡牌模板使用 trigger window、condition reader、fallback、expiration reason 和 UI hint。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时只保留中性时机窗口和样例日志。
- 是否值得抽到模板：值得记录，适合作为卡牌战斗引擎的 advanced timing module。
- 后续动作：后续若把 `三坛合符` 改为三选一或多窗口联动，再观察是否需要补通用 choice UI 模板。

### 2026-05-23 · T69 · 内容可达性审计与 reward offer 覆盖护栏

- 候选类型：内容 QA / reward pool reachability / deterministic offer coverage。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：`Roguelike Run Flow Kit`、`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`src/core/run/rewardResolver.ts`、`src/core/run/routeResolver.ts`、`src/core/run/eventResolver.ts`、`src/tests/cardReachability.test.ts`、`src/tests/playerRoleResolver.test.ts`、`docs/tasks/PROJECT_PLAN.md`。
- 可复用价值：把“内容数据存在”升级成“玩家流程真实可达”的自动化护栏，能捕捉奖励池尾部内容永远不展示、事件池内容被路线展示逻辑遮住、非临时卡缺少获得渠道、角色起始牌组数量漂移等问题。
- 与本作强绑定部分：衡简、照微、莲烬、香火、断供符、裁定等命名属于本作。
- 去题材化思路：抽象为 content reachability audit、starter deck size invariant、reward pool vs actual offer union、seeded route event visibility、channel registry；示例使用 card / reward / shop / event / post-battle choice 等中性渠道。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时只保留测试结构和中性样例数据。
- 是否值得抽到模板：值得记录，适合作为内容规模类项目的 QA guardrail。
- 后续动作：后续如果 reward offer 或 route event 改为 seeded random，应把本轮确定性轮换测试升级为 seed coverage / sampling coverage 测试。

### 2026-05-23 · T72 · 低成本召唤异动与普通怪风险交易模板

- 候选类型：战斗敌人意图 / summon resolver / risk trade custom move。
- 主归属模板：`Data-Driven Card Battle Engine`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`Roguelike Run Flow Kit`、`React Card Game UI Kit`。
- 涉及文件：`src/types/enemy.ts`、`src/core/battle/enemyIntentResolver.ts`、`src/core/battle/altarResolver.ts`、`src/data/enemies.json`、`src/data/cards.json`、`src/ui/pages/actionLogView.ts`、`src/tests/enemyIntent.test.ts`、`src/tests/chapterOneBalance.test.ts`。
- 可复用价值：把敌人召唤拆成数据里的召唤目标、数量和场上上限，把普通怪专属风险交易拆成“短期收益 + 风险资源增加 + 可反制”的最小模式，适合复用到其他卡牌战斗项目的 minion summon、enemy reinforcements、pact / debt enemy move。
- 与本作强绑定部分：无灯庙祝、无名纸祟、断签客、倒签入账、香火、劫数和三坛文案属于本作。
- 去题材化思路：抽象为 summon target id、living enemy cap、summon result log、risk bargain effect、next-turn energy bonus、risk meter delta、counter window；示例使用中性 enemy_summoner、enemy_minion、debt_move、energy / risk 命名。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时只保留 resolver、schema、日志格式和中性样例数据。
- 是否值得抽到模板：值得记录，适合作为战斗引擎的 enemy action extension 模块。
- 后续动作：T73 人工试玩后再观察召唤上限、通用地坛反制和风险交易强度是否需要进一步参数化。

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

### 2026-05-19 · T51 · 浏览器完整局 Bug Bash 记录

- 候选类型：真实试玩 QA 记录模板 / 阻断问题分级模板。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`docs/qa/CHAPTER_ONE_PLAYABLE_BUG_BASH.md`、`docs/tasks/PROJECT_PLAN.md`、`src/ui/pages/BattleHud.tsx`。
- 可复用价值：把完整局点击验证拆成路线记录、阻断问题、非阻断限制、修复记录和后续建议，适合复用到其他独立游戏或 demo 收口流程。
- 与本作强绑定部分：伏诛、归册、削籍、榜裂、法宝反噬和第一章节点名称属于本作表达。
- 去题材化思路：抽象为 run style、completion result、critical blocker、known limitation、fix record 和 follow-up bucket。
- 依赖与授权注意：模板只记录 QA 流程，不包含本作剧情、素材或私有发布信息。
- 是否值得抽到模板：值得，适合作为 `AI Game Development Planning and QA Kit` 的 bug bash worksheet。
- 后续动作：T59 外部试玩反馈模板完成后，合并成“内部 bug bash + 外部反馈”双表模板。

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

### 2026-05-19 · T52-T53 · 页面回归与平衡 Guardrail 记录

- 候选类型：页面回归 QA checklist / 长流程平衡 guardrail。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`React Card Game UI Kit`。
- 涉及文件：`docs/qa/CHAPTER_ONE_PAGE_REGRESSION_T52.md`、`docs/qa/CHAPTER_ONE_BALANCE_T53.md`、`docs/tasks/PROJECT_PLAN.md`、`src/tests/chapterOneBalance.test.ts`、`src/core/battle/nameResolver.ts`、`src/ui/pages/BattleHud.tsx`。
- 可复用价值：把页面点击回归拆成页面矩阵、截图矩阵、控制台 / 溢出指标、结算入口验证，再把平衡检查拆成 tier-based ratio 和 enemy abnormal move coverage，可复用到其他卡牌肉鸽 demo 收口。
- 与本作强绑定部分：页面名称、名破、异动、法宝、三坛、归册和伏诛属于本作表达。
- 去题材化思路：抽象为 page reachability matrix、viewport evidence、post-combat state cleanup、enemy-tier payoff ratio、abnormal-move counter coverage。
- 依赖与授权注意：本轮未新增依赖或第三方素材；截图路径只作为本地 QA 证据，不应进入模板商品示例资产。
- 是否值得抽到模板：值得，适合作为 `AI Game Development Planning and QA Kit` 的回归与平衡收口 worksheet。
- 后续动作：T59 外部试玩反馈和 T60 最终硬化后，合并成完整的 pre-demo QA pack。

### 2026-05-19 · T54-T55 · 卡牌改造循环与法宝经济服务

- 候选类型：永久卡牌改造 / relic economy / run service loop。
- 主归属模板：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 也支持：`Data-Driven Card Battle Engine`、`Roguelike Run Flow Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/core/run/redInkResolver.ts`、`src/core/battle/artifactBattleResolver.ts`、`src/core/run/artifactResolver.ts`、`src/core/run/shopResolver.ts`、`src/core/run/restResolver.ts`、`src/ui/pages/ShopPage.tsx`、`src/ui/pages/RestPage.tsx`、`src/tests/redInkResolver.test.ts`、`src/tests/artifactResolver.test.ts`、`src/tests/shopResolver.test.ts`、`src/tests/restResolver.test.ts`、`docs/qa/CHAPTER_ONE_RED_INK_ARTIFACT_ECONOMY_T54_T55.md`。
- 可复用价值：把“永久改造已有卡牌”和“牌组外器物的获得 / 维护 / 反噬清理”接入同一局内经济，是卡牌肉鸽模板中很常见但容易做散的系统。T60A 后本作已从商店买法宝改为固定三阶段三选一，可作为该模板的节奏收敛案例。
- 与本作强绑定部分：朱批、法宝、问名、封势、墨、反噬、裁定等术语和具体数据属于本作。
- 去题材化思路：抽象为 card modification options、run services、relic offer pacing、rest maintenance、overload / backlash cleanup；示例换成中性 upgrade / relic / repair service。
- 依赖与授权注意：本轮未新增依赖或第三方素材；模板化时要替换全部本作文案和资产名称。
- 是否值得抽到模板：值得，适合进入主 starter kit 的中级模块，也可拆成 `Run Economy Services` 示例章节。
- 后续动作：T56-T60 后结合玩家理解与外部反馈，决定该模块是否需要更明确的新手提示和服务价格 authoring 文档。

### 2026-05-20 · T60A · 三阶段法宝三选一节奏

- 候选类型：relic offer pacing / reward economy / first-run cognitive load control。
- 主归属模板：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 也支持：`Roguelike Run Flow Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/core/run/artifactResolver.ts`、`src/types/run.ts`、`src/ui/pages/ArtifactOfferPage.tsx`、`src/ui/pages/BattleHud.tsx`、`src/ui/pages/firstRunGuidance.ts`、`src/data/shop_items.json`、`src/tests/artifactResolver.test.ts`、`src/tests/chapterOneLongFlow.test.ts`、`docs/qa/CHAPTER_ONE_ARTIFACT_PACING_T60A.md`。
- 可复用价值：把 relic acquisition 从“开局多件 + 商店购买”收敛成开局、章节中点、Boss 后三次三选一，有助于控制第一局认知负担，并保留玩家选择感。
- 与本作强绑定部分：法宝名称、问名、正名、Boss、残榜等术语属于本作表达。
- 去题材化思路：抽象为 starter relic offer、mid-act relic offer、act-boss relic offer、offer records 和 shop relic gating removal。
- 依赖与授权注意：本轮未新增依赖或第三方素材；模板化时应替换全部本作文案和法宝 ID。
- 是否值得抽到模板：值得，适合成为 starter kit 的 progression economy 示例。
- 后续动作：外部试玩后记录玩家是否能理解三次 offer 的时机与价值，再决定是否加入权重、稀有度或构筑倾向过滤。

### 2026-05-20 · T56 · 上下文首局提示层

- 候选类型：onboarding guidance / contextual hint layer / 首局理解 QA 模板。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`AI Game Development Planning and QA Kit`、`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`src/ui/pages/firstRunGuidance.ts`、`src/ui/pages/BattleHud.tsx`、`src/ui/styles.css`、`src/tests/firstRunGuidance.test.ts`、`docs/qa/CHAPTER_ONE_FIRST_RUN_GUIDANCE_T56.md`。
- 可复用价值：用当前 run / battle / route 状态生成短提示，覆盖首战、战后奖励、裁定、商店、休整、法宝、反噬和 Boss 压力，避免把新手教学写成固定长墙。
- 与本作强绑定部分：问名、正名、伏诛、归册、裁定、三坛、法宝等术语和具体文案属于本作表达。
- 去题材化思路：抽象为 first-run guidance rules、reward quality explanation、post-combat decision hint、relic economy hint 和 boss pressure hint；示例项目替换为中性术语。
- 依赖与授权注意：本轮未新增依赖或第三方素材；模板化时需要替换本作专有文案和截图。
- 是否值得抽到模板：值得，适合进入 UI kit 和 AI QA kit 的 onboarding 章节。
- 后续动作：等 T59 外部试玩反馈完成后，补充“提示是否被玩家读懂”的反馈字段。

### 2026-05-20 · T57 · 表现反馈与可访问性二轮修边

- 候选类型：feedback layer / accessibility polish / reduced-motion guardrail。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/ui/pages/BattleHud.tsx`、`src/ui/styles.css`、`src/ui/audio/audioCues.ts`、`src/game/scenes/BattleScene.ts`、`docs/qa/CHAPTER_ONE_BROWSER_PLAYTEST_T57_T58.md`。
- 可复用价值：把关键状态反馈、读屏摘要、键盘焦点、动画关闭和系统减弱动态偏好放进同一轮收口检查，适合卡牌游戏 demo 在正式素材前提升可玩手感。
- 与本作强绑定部分：反馈文案、残榜案面、问名 / 正名 / 裁定等术语属于本作。
- 去题材化思路：抽象为 status feedback panels、aria summaries、focus-visible tokens、reduced-motion fallback、placeholder stage composition。
- 依赖与授权注意：本轮未新增依赖或第三方素材；Web Audio 仍为合成占位，模板化时应保留可替换接口。
- 是否值得抽到模板：值得，适合进入 UI kit 的 polish checklist。
- 后续动作：T59 外部试玩后，记录哪些反馈仍被玩家忽略。

### 2026-05-20 · T58 · 浏览器试玩包与错误反馈 Runbook

- 候选类型：browser playtest release runbook / frontend error reporting。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：`React Card Game UI Kit`、`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`src/ui/ErrorBoundary.tsx`、`src/ui/errorReporting.ts`、`src/tests/errorReporting.test.ts`、`README.md`、`package.json`、`docs/qa/CHAPTER_ONE_BROWSER_PLAYTEST_T57_T58.md`。
- 可复用价值：把本地 browser preview、重开 / 继续 / 清存档、问题反馈格式、错误边界、本地错误日志和 chunk warning 决策记录串成可交给外部试玩者的轻量交付包。
- 与本作强绑定部分：试玩说明里的页面名称、存档 key 和第一章语境属于本作。
- 去题材化思路：抽象为 build-preview checklist、save reset guide、playtest feedback template、error boundary report format、bundle warning decision log。
- 依赖与授权注意：本轮只新增 npm preview 脚本，没有新增生产依赖；模板化时要替换私有仓库路径和本地截图路径。
- 是否值得抽到模板：值得，是 AI QA kit 中“外部试玩前交付”章节的直接候选。
- 后续动作：T59-T60 反馈模板和收口完成后，把 runbook、反馈分类表、完局问卷和收口清单合成一份 playtest pack。

### 2026-05-20 · T59-T60 · 外部试玩反馈包与阶段 D 收口清单

- 候选类型：external playtest feedback pack / pre-demo release closeout checklist。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`React Card Game UI Kit`。
- 涉及文件：`docs/qa/CHAPTER_ONE_EXTERNAL_PLAYTEST_T59.md`、`docs/qa/CHAPTER_ONE_PLAYABLE_RELEASE_T60.md`、`docs/tasks/PROJECT_PLAN.md`、`README.md`、`docs/templates/TEMPLATE_EXTRACTION_NOTES.md`。
- 可复用价值：把小范围外部试玩准备拆成启动说明、试玩任务单、问题分类、单问题模板、完局问卷、已知问题、传播限制和反馈整理表，并把阶段收口拆成已完成任务、验证命令、剩余风险和下一阶段决策闸门。
- 与本作强绑定部分：页面名称、术语、存档 key、第一章路线和禁用宣传表达属于本作语境。
- 去题材化思路：抽象为 tester onboarding, issue taxonomy, one-issue report, post-run survey, known limitations, release gate, next-phase decision menu。
- 依赖与授权注意：模板化时要剥离本地截图路径、私有仓库 URL、具体项目术语和任何未公开发行信息；不包含第三方素材。
- 是否值得抽到模板：值得，可作为 `AI Game Development Planning and QA Kit` 的 pre-demo playtest pack。
- 后续动作：等真实外部试玩反馈收集后，补一条 feedback triage and fix queue 候选记录。

### 2026-05-20 · T61 · 工程质量门禁

- 候选类型：engineering quality gate / CI smoke pack。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`React Card Game UI Kit`。
- 涉及文件：`eslint.config.js`、`playwright.config.ts`、`e2e/chapter-one-smoke.spec.ts`、`vite.config.ts`、`.github/workflows/ci.yml`、`package.json`、`docs/qa/ENGINEERING_QUALITY_GATE_T61.md`。
- 可复用价值：把 lint、typecheck、unit test、build、coverage baseline 和 browser smoke 合成轻量门禁，适合非代码审阅者用“命令是否通过”来监督 AI 代码质量。
- 与本作强绑定部分：Playwright smoke 里的标题、法宝三选一、第一战等页面文案属于本作。
- 去题材化思路：抽象为 title smoke、settings smoke、new-run first decision smoke、first combat smoke、no console error、viewport overflow check。
- 依赖与授权注意：新增依赖均为开发期依赖；模板化时要保留 dev-only 边界，并记录 Playwright 浏览器下载和 CI 时间成本。
- 是否值得抽到模板：值得，适合作为 `AI Game Development Planning and QA Kit` 的 quality gate 章节。
- 后续动作：外部试玩反馈稳定后，评估是否加入覆盖率硬阈值、更多 E2E 页面和 React Compiler 更严格 lint 规则。

### 2026-05-22 · T68 · 阈值型风险惩罚与局内修补资源

- 候选类型：risk threshold resolver / run resource sink / combat maintenance action。
- 主归属模板：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 也支持：`Roguelike Run Flow Kit`、`React Card Game UI Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/core/run/riskThresholdResolver.ts`、`src/core/battle/inkBattleResolver.ts`、`src/core/run/restResolver.ts`、`src/core/battle/battleState.ts`、`src/core/battle/nameResolver.ts`、`src/core/battle/enemyIntentResolver.ts`、`src/ui/pages/BattleHud.tsx`、`src/ui/pages/RestPage.tsx`、`src/ui/pages/RunSummaryPage.tsx`、`src/ui/pages/actionLogView.ts`、`src/tests/riskThresholdResolver.test.ts`、`src/tests/inkBattleResolver.test.ts`。
- 可复用价值：把长期风险资源从“每点即时惩罚”改成战斗开始一次性结算的最高阈值，并提供局内资源消耗入口来修补对应压力，适合 roguelike demo 在早期给玩家可感知后果又避免完全劝退。
- 与本作强绑定部分：墨、劫数、榜裂、问名、遮名、污卷、劫灰、残榜重裂等命名和叙事含义属于本作表达。
- 去题材化思路：抽象为 run risk meters, highest-threshold start-of-combat penalties, temporary junk cards, first-action penalties, elite/boss pressure overrides, maintenance resource actions 和 terminal ending flags。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时应替换所有本作术语、牌 ID、敌人 intent ID 和日志文案。
- 是否值得抽到模板：值得，适合作为 starter kit 的中后段风险经济示例，也能成为 AI QA kit 中“风险机制落地前后对照”的测试样例。
- 后续动作：T69 人工试玩复核中观察玩家是否能理解阈值惩罚来源、墨消耗是否太稀有，以及是否需要在后续事件或休整中加入“解劫 / 止裂”入口。

### 2026-05-23 · T70 · 意图可见性与后一动预告

- 候选类型：combat intent visibility / masked telegraph / next-action preview UI。
- 主归属模板：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 也支持：`React Card Game UI Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/types/enemy.ts`、`src/types/battle.ts`、`src/core/battle/battleState.ts`、`src/core/battle/enemyIntentResolver.ts`、`src/core/battle/intentInsightResolver.ts`、`src/core/battle/nameResolver.ts`、`src/core/battle/artifactBattleResolver.ts`、`src/core/run/artifactResolver.ts`、`src/ui/pages/BattleHud.tsx`、`src/ui/pages/actionLogView.ts`、`src/ui/styles.css`、`src/tests/nameResolver.test.ts`、`src/tests/artifactResolver.test.ts`、`src/tests/types.test.ts`。
- 可复用价值：把敌人行动信息拆成“当前行动可见性、遮蔽模式、下一动、下一动预告”四层，让普通战保持明牌公平，关键战保留信息压力，并让侦察类卡牌 / relic 在明牌场景下仍有稳定价值。
- 与本作强绑定部分：辨势、遮势、来势、异动、问名、照骨镜、法宝反噬、榜裂等命名和具体 UI 文案属于本作表达。
- 去题材化思路：抽象为 visible intent, masked intent, inspect intent, next-intent preview, elite / boss masking rules, risk-triggered temporary masking 和 combat log feedback。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时应替换本作术语、敌人 intent ID 和中文 actionLog 文案。
- 是否值得抽到模板：值得，适合作为 deckbuilder starter kit 中“明牌公平 + 局部隐藏信息”的范例，也适合作为 UI kit 的弱权重预告槽组件。
- 后续动作：T71 三角色浏览器试玩中重点观察玩家是否理解遮势与后一动、照微信息优势是否成立，以及 Boss 遮势是否太压迫。

### 2026-05-23 · T71 · 第一章异动分层差异化

- 候选类型：enemy abnormal move authoring / encounter pressure differentiation / data-driven enemy skill variants。
- 主归属模板：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 也支持：`Data-Driven Card Battle Engine`、`Roguelike Run Flow Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/types/enemy.ts`、`src/core/battle/enemyIntentResolver.ts`、`src/data/enemies.json`、`src/data/localization/zh-CN.json`、`src/ui/pages/actionLogView.ts`、`src/tests/enemyIntent.test.ts`、`docs/prd/PRD-gameplay.md`、`docs/prd/PRD-content-scope.md`、`docs/tasks/PROJECT_PLAN.md`。
- 可复用价值：把敌人技能从“同一底层效果换名”推进为数据驱动的轻 / 强差异化：普通怪通过落点、目标、失败兜底和组合场景轻调，精英 / Boss 通过首次强度、正名前后差异、资源干扰和路线压力建立身份。
- 与本作强绑定部分：异动、偷香、污卷、遮名、回形、三坛、形、名迹、窃榜使等命名和具体敌人 ID 属于本作表达。
- 去题材化思路：抽象为 abnormal action type, first-use modifier, junk-card destination, reveal-hide fallback, support-heal target selection, board-object disruption 和 boss route pressure profile。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时应替换本作术语、敌人名、卡 ID、日志文案和路线倾向命名。
- 是否值得抽到模板：值得，适合作为 deckbuilder starter kit 的 enemy authoring 示例，也能作为 QA kit 的“设计表到真实战斗验证”案例。
- 后续动作：T72 三角色人工试玩中观察普通怪轻差异是否足够可读、精英 / Boss 首次强化是否过强，以及斗部空壳挪坛是否需要更明显的 HUD 预警。

### 2026-05-23 · T73 · 数据驱动来势附带与全封压制后果

- 候选类型：enemy incoming action modifier / attack rider / full-block suppression feedback。
- 主归属模板：`Data-Driven Card Battle Engine`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`React Card Game UI Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/types/enemy.ts`、`src/core/battle/incomingForceResolver.ts`、`src/core/battle/enemyIntentResolver.ts`、`src/core/battle/altarResolver.ts`、`src/data/enemies.json`、`src/data/localization/zh-CN.json`、`src/ui/pages/BattleHud.tsx`、`src/ui/pages/actionLogView.ts`、`src/tests/enemyIntent.test.ts`、`docs/tasks/PROJECT_PLAN.md`。
- 可复用价值：把敌人攻击从纯数值扩展为数据声明的条件加压和未全封后果，同时保留“防御足够时压住后果”的公平反馈，适合卡牌肉鸽中精英 / Boss 攻击身份化。
- 与本作强绑定部分：来势、封势、坛位、污卷、遮势、终审拍案、窃榜使路线压力等命名属于本作表达。
- 去题材化思路：抽象为 incoming action base amount, conditional bonus, on-unblocked rider, full-block suppression log 和 UI preview text；样例可替换为 armor break、trap shake、next-intent mask、junk-card injection。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时应替换本作术语、敌人 intent ID、卡 ID 和中文日志文案。
- 是否值得抽到模板：值得，适合作为战斗引擎的 enemy intent authoring 扩展，也能作为 UI kit 的“attack rider preview / suppression feedback”组件范例。
- 后续动作：T74 三角色人工试玩中观察来势附带是否足够可读，尤其是斗部空壳震坛和窃榜使终审路线压力是否需要更强 HUD 预警。

### 2026-05-24 · 裁定平衡补丁 · 局内永久收益强度预算与升级兼容护栏

- 候选类型：run reward balance guardrail / card upgrade compatibility policy。
- 主归属模板：`Roguelike Run Flow Kit`。
- 也支持：`Phaser React Deckbuilder Roguelike Starter Kit`、`Data-Driven Card Battle Engine`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/core/run/verdictResolver.ts`、`src/core/battle/registerBattleResolver.ts`、`src/core/run/redInkResolver.ts`、`src/types/verdict.ts`、`src/types/run.ts`、`src/ui/pages/VerdictPage.tsx`、`src/ui/pages/actionLogView.ts`、`src/data/localization/zh-CN.json`、`src/tests/verdictResolver.test.ts`、`src/tests/redInkResolver.test.ts`、`docs/prd/PRD-gameplay.md`、`docs/prd/PRD-checklist.md`。
- 可复用价值：把局内永久收益拆成普通 fallback、精英 / Boss 专属规则、触发窗口、每战上限、分段总额度和日志反馈，同时让卡牌升级选项声明最低费用、排除标签和排除效果，避免低费循环牌承接过强升级；短期风险选项可用“下一战开局上手 / 首回合资源”形成真实诱惑。
- 与本作强绑定部分：登簿、朱批、削籍、残名入档、问名、正名、墨、香火、榜裂等命名和数值含义属于本作。
- 去题材化思路：抽象为 common run modifier、elite / boss unique modifier、trigger cap、segment budget、upgrade minimum cost、excluded tags、excluded effect types、loop-risk filter 和 next-fight burst delivery；示例用中性 currency、energy、draw、status、risk 命名。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时只保留数据结构、resolver 策略和中性测试样例。
- 是否值得抽到模板：值得，适合作为 `Roguelike Run Flow Kit` 中防止永久奖励和升级系统失控的平衡护栏章节。
- 后续动作：后续人工试玩重点观察普通 fallback 在 3 次额度内是否仍有存在感、精英 / Boss 专属规则是否足够可识别、削籍首战爆发是否值得承担榜裂，以及升级过滤是否导致某些牌长期无可用朱批。

### 2026-05-25 · T91 · Boss 前准备摘要与首局短提示复核

- 候选类型：run readiness dashboard / pre-boss preparation checklist / first-run short guidance。
- 主归属模板：`React Card Game UI Kit`。
- 也支持：`Roguelike Run Flow Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/ui/pages/RunReadinessPanel.tsx`、`src/ui/pages/RoutePage.tsx`、`src/ui/pages/ShopPage.tsx`、`src/ui/pages/RestPage.tsx`、`src/ui/pages/firstRunGuidance.ts`、`docs/qa/CHAPTER_ONE_T91_T92_EXPERIENCE_PRESENTATION.md`。
- 可复用价值：把 run 状态、资源、牌组信号、一次性资源、永久奖励和风险标签压缩成 Boss 前可读摘要，适合卡牌肉鸽在不新增教程墙的情况下帮助玩家判断补给、休整和路线压力。
- 与本作强绑定部分：临战整册、香火钱、墨、香封、法宝、朱批、榜裂、劫数、问名、破形等命名属于本作表达。
- 去题材化思路：抽象为 health, premium resource, shop currency, deck action coverage, consumable slots, relic status, upgrades, risk meters 和 concise route / shop / rest context notes。
- 依赖与授权注意：本轮未新增依赖、第三方素材或正式美术；模板化时只保留组件输入、信号计算和风险标签结构。
- 是否值得抽到模板：值得，适合作为 `React Card Game UI Kit` 的 pre-boss readiness panel，也可放入 QA kit 的 first-run comprehension checklist。
- 后续动作：真实外部试玩后观察摘要是否帮助玩家做 Boss 前判断，若玩家误读为强制推荐，再抽象出更中性的风险文案规则。

### 2026-05-25 · T92 · 低成本战斗表现纵切与多视口 canvas smoke

- 候选类型：procedural combat table / placeholder enemy silhouettes / reduced-motion feedback / canvas smoke test。
- 主归属模板：`Phaser React Deckbuilder Roguelike Starter Kit`。
- 也支持：`React Card Game UI Kit`、`AI Game Development Planning and QA Kit`。
- 涉及文件：`src/game/scenes/BattleScene.ts`、`src/ui/pages/BattleHud.tsx`、`src/ui/styles.css`、`e2e/chapter-one-smoke.spec.ts`、`playwright.config.ts`、`docs/qa/CHAPTER_ONE_T91_T92_EXPERIENCE_PRESENTATION.md`。
- 可复用价值：用程序化 Phaser 桌案、CSS 敌人剪影、卡牌稀有度框线和轻动效建立“能被玩家感知”的战斗表现基准，并用 Playwright 三视口 smoke 验证 canvas 可见、尺寸正常、截图数据非空和页面无水平溢出。
- 与本作强绑定部分：残榜、朱砂、三坛、法宝、临诏、形、来势、异动等视觉关键词和术语属于本作表达。
- 去题材化思路：抽象为 canvas stage baseline, procedural board props, enemy silhouette classes, card rarity frames, feedback sweep animation, reduced motion guard 和 multi-viewport smoke project matrix。
- 依赖与授权注意：本轮未新增生产依赖或第三方素材；模板化时保留无外部素材的程序化占位策略，避免把题材色彩和中文文案带入通用模板。
- 是否值得抽到模板：值得，适合作为 starter kit 的 pre-art vertical slice，帮助 AI 项目在正式美术前避免“系统可跑但不像游戏”的问题。
- 后续动作：若 T93 继续表现二期，可补截图基线、更多反馈事件和正式资产登记流程，再考虑抽象为完整 visual slice checklist。

### 2026-05-25 · T92A · 真实流程截图采集与试玩取样包

- 候选类型：visual QA automation / real-flow screenshot review / playtest sampling packet。
- 主归属模板：`AI Game Development Planning and QA Kit`。
- 也支持：`React Card Game UI Kit`、`Phaser React Deckbuilder Roguelike Starter Kit`。
- 涉及文件：`scripts/capture-t91-t92-flow-screenshots.mjs`、`docs/qa/CHAPTER_ONE_T91_T92_REAL_FLOW_SCREENSHOT_REVIEW.md`、`docs/qa/screenshots/t91-t92-flow-review/manifest.json`、`src/ui/pages/BattleHud.tsx`。
- 可复用价值：用真实页面点击流程采集多视口截图，把“UI 是否真的首屏可读、canvas 是否非空、关键页面是否被旧面板压住”沉淀成可复跑证据，并把自动化截图和真人试玩取样表拆开记录，避免把脚本结果误写成玩家反馈。
- 与本作强绑定部分：截图流程里的角色名、路线节点、Boss、临战整册、商店 / 休整文案和第一章节奏属于本作。
- 去题材化思路：抽象为 target page steps、viewport matrix、screenshot manifest、horizontal overflow metrics、current-panel visibility checks、post-slice playtest questionnaire 和 sample tracker。
- 依赖与授权注意：本轮只使用既有 devDependency `@playwright/test`，未新增生产依赖、第三方素材或正式美术；截图若用于模板示例需替换为中性 demo 内容。
- 是否值得抽到模板：值得，适合作为 QA kit 的 visual regression / post-vertical-slice review pack。
- 后续动作：若后续 T93 继续表现二期，可把脚本参数化为通用 page-flow capture，并把截图判断从人工复核升级为关键面板可见性断言。
