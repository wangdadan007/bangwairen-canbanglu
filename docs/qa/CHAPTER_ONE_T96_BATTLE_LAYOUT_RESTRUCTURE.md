# T96 战斗界面结构重构可运行版 QA

日期：2026-05-26

## 目标

将当前“左舞台 + 右长 HUD”的 active battle 页面重排为可运行的真实卡牌肉鸽战斗首屏：上方全局风险资源、上中敌方压案、敌方附近显示来势 / 异动 / 遮势、底部左侧执簿者锚点、底部横向手牌与结束回合按钮、最近日志降权为薄抽屉。

## 覆盖范围

- 首战单敌：`02-first-battle-t96-layout`
- 第二战动作可读性：`03-second-battle-action-near-enemy`
- 多敌布局：`04-multi-enemy-layout`
- Boss 开场：`05-boss-battle-opening-t96-layout`
- 裁定页：`06-verdict-page`
- 视口：1280x720、1366x768、1920x1080

截图输出目录：

`docs/qa/screenshots/t96-battle-layout-restructure/`

## 截图指标

`npm run capture:t96` 已生成 18 张截图和 `manifest.json`。

manifest 摘要：

- 截图总数：18
- active battle 截图：15
- 裁定页截图：3
- 横向溢出：0
- 多敌截图：3 档视口均达到 2 名敌方目标
- canvas：active battle 截图均存在，中心像素非空
- active battle 结构：执簿者锚点、敌方摘要、来势 / 异动视觉锚点、手牌、底部操作区、降权日志均可见

## 复核结论

- 首战 1280x720 / 1366x768 / 1920x1080 中，敌方、当前来势、执簿者己形、香火、手牌、结束回合按钮同屏可见。
- Boss 开场中，Boss 摘要、Boss 压力提示、异动 / 遮势锚点、执簿者锚点和手牌操作区同屏可见。
- 玩家操控角色信息已从顶部资源条迁到手牌区左侧：顶部只保留墨、劫数、榜裂，底部左侧显示执簿者名、己形条、当前香火、手 / 抽 / 弃 / 耗和目标。
- 裁定页仍走原裁定页面，但三类裁定区块可读；本轮不重做裁定页正式视觉。
- 日志已降权为底部最近记录薄抽屉，不再作为右侧长 HUD 占据首屏。

## 已运行命令

- `node --check scripts/capture-t96-battle-layout-screenshots.mjs`：通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run test`：通过，34 个测试文件、246 个测试。
- `npm run build`：通过；仍保留 Vite 单 chunk 超过 500 kB 的既有提示。
- `npm run capture:t96`：通过，生成 18 张截图。
- `git diff --check`：通过。

## 环境说明

- 普通沙箱启动 dev server 因 `listen EPERM 127.0.0.1:5173` 失败；按沙箱规则提权后 `npm run dev -- --host 127.0.0.1` 启动成功。
- 普通沙箱运行 Playwright Chromium 因 macOS MachPort 权限失败；按沙箱规则提权后 `npm run capture:t96` 通过。
- Codex in-app browser MCP 当前返回 `Browser is not available: iab`，本轮改用项目 Playwright 截图脚本完成截图复核。

## 剩余风险

- 本轮只做结构可运行版，不做正式敌人立绘、正式卡面、正式字体、正式音频或 Steam 素材。
- 中段残榜审案中轴仍是 CSS / Phaser 程序化占位，适合确认信息结构，不代表最终美术。
- 裁定页只纳入截图链路验证方向，未在 T96 内做裁定页正式重排。
