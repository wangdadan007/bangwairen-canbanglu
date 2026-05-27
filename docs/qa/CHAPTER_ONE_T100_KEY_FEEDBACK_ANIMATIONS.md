# T100 关键反馈动效一期 QA

日期：2026-05-27

## 范围

- 本轮覆盖破形、问名、正名、封势、异动、裁定六类关键反馈短动画。
- 动效来源为现有 actionLog / run 状态派生的反馈面板、战斗壳 class 和 CSS 动画。
- 保留现有玩法规则、UI 文案可读性、动画开关和 `prefers-reduced-motion` 兜底。
- 本轮不新增 AI 图、第三方素材、正式图片资产、音频、字体或生产依赖。

## 实现摘要

- `BattleHud` 的 active battle shell 新增 T100 反馈 class 和一次性 burst overlay，用于破形、问名、正名、封势、异动的短促视觉反馈。
- 反馈优先级按 `actionLog.sequence` 选择最新动作，避免封势反馈被上一条破形反馈盖掉。
- 关键反馈 panel 加 `key` 触发重挂载，使同类型反馈连续出现时仍能重播短动画。
- `VerdictPage` 新增 `t100-verdict-feedback` 标记，裁定页进入时执行展开 / 判印短动效。
- 截图脚本新增 T100 探针，自动打出破形、封势、问名、正名，并在第二战捕捉异动生效。

## 截图与 Manifest

截图目录：`docs/qa/screenshots/t100-key-feedback-animations/`

- 共生成 33 张截图，覆盖 1280x720、1366x768、1920x1080。
- 每个视口包含标题、首战、第二战、多敌、Boss 开场、裁定页和 T100 五类战斗反馈探针。
- manifest 汇总：
  - `count`: 33
  - `horizontalOverflow`: 0
  - `battleScreenShellVisible`: 30
  - `activeCanvasNonBlank`: 30
  - `feedbackBreakEffectActive`: 3
  - `feedbackSealEffectActive`: 3
  - `feedbackAskEffectActive`: 3
  - `feedbackNamedEffectActive`: 3
  - `feedbackAbnormalEffectActive`: 6
  - `feedbackVerdictEffectActive`: 3
  - `feedbackBurstVisible`: 18

抽查截图：

- `1280x720-07-t100-break-feedback.png`
- `1280x720-08-t100-seal-feedback.png`
- `1280x720-09-t100-ask-feedback.png`
- `1280x720-10-t100-named-feedback.png`
- `1280x720-11-t100-abnormal-feedback.png`
- `1280x720-06-verdict-page.png`

抽查结论：反馈卡、敌方压案区、玩家锚点、手牌和主要按钮未出现不可用遮挡；六类反馈均能在真实战斗或裁定页中出现对应视觉标记。

## 验证命令

- `node --check scripts/capture-t96-battle-layout-screenshots.mjs`：通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run test`：通过，35 个测试文件、247 个用例。
- `npm run build`：通过；Vite 仍保留单 chunk 超过 500 kB 的既有提示。
- `npm run capture:t100`：通过，生成 33 张截图与 manifest。
- `git diff --check`：通过。

环境说明：

- 普通沙箱启动 dev server 因 `listen EPERM 127.0.0.1:5173` 失败；提权后 `npm run dev -- --host 127.0.0.1` 启动成功。
- 普通沙箱运行 Playwright Chromium 因 macOS MachPort 权限失败；提权后 `npm run capture:t100` 通过。
- 截图复核完成后已停止 Vite 进程，`127.0.0.1:5173` 无监听。

## 剩余风险

- 当前是程序化短动效，不是正式特效资源；正式美术或音效进入前仍需单独资产授权与台账。
- T100 截图只覆盖桌面三档视口；更窄移动宽度如需支持，需要另立响应式复核。
- 动效节奏以“更清楚”为目标，没有做完整动画调参面板；后续人工审图如认为过亮或过忙，应优先调 CSS 时长、透明度和面积，而不是改玩法规则。
