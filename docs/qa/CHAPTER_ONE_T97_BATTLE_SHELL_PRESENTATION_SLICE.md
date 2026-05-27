# T97 新战斗 shell 美术动画垂直切片三期 QA

日期：2026-05-26

## 目标

在 T96 新战斗 shell 上推进低风险表现切片，让首战、多敌、Boss 开场和裁定页能更明显看出美术动画方向。T97 只做 CSS / Phaser 程序化表现与现有 UI 组件增强，不新增玩法、不新增正式素材、不新增生产依赖。

## 覆盖范围

- 敌人剪影：普通 / 精英 / Boss 继续使用 CSS 程序化剪影，增加影底、压案环、判印层和来势 / 异动差异化状态。
- 卡牌框：横向手牌增加符诏边框、角印、底部案线和按卡牌类型区分的程序化小印记。
- 动作反馈：复用现有 feedback panel，并强化敌方来势 / 异动 / 遮势的静态状态层与轻动画；动画关闭时保留静态形态差异。
- 裁定判印：裁定页三类选项增加判印式圆章和纸纹边线，仍保留文字规则为主。
- Boss 压迫感：Boss 敌形在新 shell 中增强暗影、红印、压案范围和高压轮廓，不改变 Boss 行为。

## 本轮已落地

| 模块 | 文件 | 内容 |
|---|---|---|
| 新 shell 表现入口 | `src/ui/pages/BattleHud.tsx` | `battle-screen-shell` 增加 T97 表现 class；敌人剪影增加 shadow / pressure / ruling 程序化层；手牌按钮增加符诏角印。 |
| CSS 视觉与动效 | `src/ui/styles.css` | 增强 T96 shell 背景层、敌人剪影、Boss 压案、手牌卡框、裁定判印和 reduced-motion / 动画关闭兜底。 |
| Phaser 桌案 | `src/game/scenes/BattleScene.ts` | 程序化案面补敌方压案影、残榜中轴纸纹、手牌案线、三判印暗纹和卡牌落案占位。 |
| 截图脚本 | `scripts/capture-t96-battle-layout-screenshots.mjs`、`package.json` | T96 截图脚本支持任务名和输出目录参数；新增 `npm run capture:t97` 输出 T97 截图包。 |

## 截图验收

截图输出目录：

`docs/qa/screenshots/t97-battle-shell-presentation-slice/`

`npm run capture:t97` 仍覆盖：

- 首战单敌
- 第二战动作可读性
- 多敌布局
- Boss 开场
- 裁定页
- 1280x720、1366x768、1920x1080 三档视口

重点指标：

- active battle 仍显示敌方摘要、执簿者锚点、手牌、底部操作区和降权日志。
- T97 表现层标记 `t97PresentationShellVisible` 为 `true`。
- active battle 截图中 `enemyPortraitPressureVisible`、`enemyPortraitRulingVisible`、`cardFrameGlyphVisible` 为 `true`。
- 裁定页截图中三类裁定仍可读，判印视觉不遮挡规则文本。
- 横向溢出为 0，canvas 存在且中心像素非空。

## 已运行命令

- `npm run typecheck`：通过。
- `node --check scripts/capture-t96-battle-layout-screenshots.mjs`：通过。
- `npm run lint`：通过。
- `npm run test`：通过，34 个测试文件、246 个测试。
- `npm run build`：通过；仍保留 Vite 单 chunk 超过 500 kB 的既有提示。
- `npm run capture:t97`：普通沙箱下 Chromium 因 macOS MachPort 权限失败；提权后通过，生成 18 张截图和 `manifest.json`。

## manifest 摘要

- 截图总数：18。
- active battle 截图：15。
- 裁定页截图：3。
- 横向溢出：0。
- active battle 截图中 `t97PresentationShellVisible`：15 / 15。
- active battle 截图中 `enemyPortraitPressureVisible`：15 / 15。
- active battle 截图中 `enemyPortraitRulingVisible`：15 / 15。
- active battle 截图中 `cardFrameGlyphVisible`：15 / 15。
- active battle canvas 均存在且中心像素非空；裁定页不要求 canvas 可见。

## 剩余风险

- T97 仍是程序化视觉切片，不代表正式敌人立绘、正式卡面、正式字体、正式音频或 Steam 素材已经入库。
- 用户尚未人工审阅 T96 / T97 截图；若今晚确认 T96 结构方向需要调整，本轮 T97 的 CSS / Phaser 层应随新结构迁移，不强行保留当前摆位。
- 自动截图只能证明布局、可见性和基础运行状态，不能替代真人审美判断或试玩反馈。
