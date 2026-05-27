# T99 角色 / 敌人视觉方向与战斗占位替换 QA

日期：2026-05-27

## 1. 范围

T99 只做视觉方向草案和项目内程序化占位，不生成 AI 图，不引入第三方素材，不提交正式图片资产。

覆盖内容：

- 衡简、照微、莲烬三名可玩角色的视觉方向草案。
- 教学怪纸面鬼的视觉方向草案。
- Boss 窃榜使的视觉方向草案。
- 战斗页玩家锚点的角色程序化视觉占位。
- 敌方压案区的身份 cue、纸面鬼 / 无名纸祟撕纸层、窃榜使撕榜压案层。
- T99 截图入口与 manifest 指标。

不覆盖：

- 正式角色立绘、正式敌人立绘、正式 Boss 图、宣传图或 Steam 商店素材。
- AI 概念图生成、第三方图片筛选、字体 / 音频 / 视频素材入库。
- 玩法、数值、敌人行为、路线、奖励、裁定或三坛机制改动。

## 2. 验收点

人工审图时重点看：

- 首战截图是否能看出玩家锚点不是纯文字块。
- 首战纸面鬼是否具备纸页、残名、低威胁教学怪方向。
- Boss 开场是否能看出窃榜使具备更高体量、撕榜、终审和压案感。
- 衡简、照微、莲烬是否通过形态、色彩和起始法宝 cue 形成差异。
- 己形、香火、手牌、敌人形、名格、来势 / 异动、后一动和操作按钮是否仍清楚。

自动截图 manifest 重点看：

- `battlePlayerAnchorVisible` 为 `true`。
- `playerAnchorVisualVisible` 为 `true`。
- `enemyIdentityCueVisible` 为 `true`。
- `t99VisualPlaceholdersVisible` 为 `true`。
- `horizontalOverflow` 为 `false`。
- active battle 截图 canvas 存在且中心像素非空。

## 3. 运行命令

```bash
node --check scripts/capture-t96-battle-layout-screenshots.mjs
npm run typecheck
npm run lint
npm run test
npm run build
npm run capture:t99
git diff --check
```

截图输出目录：

```text
docs/qa/screenshots/t99-visual-placeholders/
```

## 4. 验证记录

- `node --check scripts/capture-t96-battle-layout-screenshots.mjs`：通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run test`：通过，35 个测试文件、247 个用例。
- `npm run build`：通过；仍保留 Vite 单 chunk 超过 500 kB 的既有提示。
- `npm run capture:t99`：通过，输出 18 张截图。
- `git diff --check`：通过。

manifest 摘要：

- active battle 截图 12 张，`battlePlayerAnchorVisible`、`playerAnchorVisualVisible`、`enemyIdentityCueVisible`、`t99VisualPlaceholdersVisible` 均为 `true`。
- 裁定页截图 3 张，`verdictPageVisible` 均为 `true`。
- `horizontalOverflow` 为 0。
- active battle canvas 均存在，且中心像素非空。

环境说明：

- 普通沙箱启动 Vite dev server 因 `listen EPERM 127.0.0.1:5173` 失败，提权后启动成功。
- 普通沙箱运行 Playwright Chromium 因 macOS MachPort 权限失败，提权后 `npm run capture:t99` 通过。
- 截图完成后已停止本地 dev server。

## 5. 剩余风险

- 程序化占位只能解决第一眼方向和截图识别，不能替代正式美术。
- 角色方向尚未经过用户人工审图定稿，不能进入宣传图、商店页或正式资产生产。
- 若后续启用 AI 生图，必须先进入“概念候选 / 不入正式构建”状态，并补齐素材台账中的模型 / 平台、生成日期、提示词摘要、参考图授权、人工审核和是否进入构建字段。
