# T101 战斗画面构图定稿 / 美术落位规格 QA

日期：2026-05-27

## 范围

- 本轮按用户确认，直接在 T101 内完成可运行战斗界面重排，不另开 T102。
- active battle shell 改为顶部极简资源、左侧执簿者、中央动作通道、右侧敌人、底部操作层。
- 残榜不再作为常驻中央大面板，改为背景淡纹理、敌方贴身名格 / 审案信息和问名 / 正名 / 裁定时的临时展开。
- 保留 T99 程序化视觉占位和 T100 关键反馈动效，不改变玩法规则、战斗数据、资源经济或存档结构。
- 本轮不新增 AI 图、第三方素材、正式图片资产、字体、音频、视频或生产依赖。

## 实现摘要

- `BattleHud` active battle shell 新增 `t101-layout-shell` 结构，主舞台拆成 `stage-player-anchor`、`battle-action-lane`、`stage-enemy-list` 三段。
- 左侧执簿者信息从手牌左下迁入主舞台左侧，后续衡简 / 照微 / 莲烬正式形象在此落位。
- 三坛作为玩家战斗节奏状态，贴在左侧执簿者信息下方，不再占据敌我之间。
- 临诏作为本场持续规则 / 战斗增益槽，放到底部快捷区，与法宝和香封同层。
- 中央动作通道只保留残榜淡纹理、出牌飞行暗线和关键反馈，不再承载常驻案面表格、三坛或临诏。
- 右侧敌人区域继续展示敌形、名格、来势 / 异动和后一动；审案信息贴近被审对象。
- 底部操作层聚焦香火、手牌、临诏、法宝快捷、香封快捷和结束回合；日志抽屉不再作为 T101 首屏常驻信息。
- 截图脚本新增 T101 manifest 指标，用于检查左我、右敌、中动作通道、底部快捷层、中央面板移除、三坛左侧落位和临诏底部落位。

## 截图与 Manifest

截图目录：`docs/qa/screenshots/t101-battle-screen-layout/`

- manifest 共记录 18 张截图，覆盖 1280x720、1366x768、1920x1080。
- 每个视口覆盖标题、首战、第二战、Boss 开场、裁定页；1920x1080 覆盖真实多敌截图，1280x720 和 1366x768 本轮记录为多敌 fallback。
- manifest 汇总：
  - `count`: 18
  - `active`: 15
  - `horizontalOverflow`: 0
  - `t101PlayerStageVisible`: 15 / 15
  - `t101ActionLaneVisible`: 15 / 15
  - `t101ActionLaneClearOfPersistentState`: 15 / 15
  - `t101AltarInPlayerStage`: 15 / 15
  - `t101EnemyStageVisible`: 15 / 15
  - `t101LinzhaoInQuickRow`: 15 / 15
  - `t101QuickRowVisible`: 15 / 15
  - `t101CentralCasePanelRemoved`: 15 / 15
  - `t101PlayerNotInBottomCommandZone`: 15 / 15
  - `activeCanvasNonBlank`: 15 / 15
  - `multiEnemyShots`: 1
  - `handCardVisibleInViewport`: 12 / 12 focused battle screenshots
  - `handCardCount`: focused battle screenshots 均为 5

抽查截图：

- `1280x720-02-first-battle-t101-layout.png`
- `1280x720-03-second-battle-action-near-enemy.png`
- `1280x720-04-multi-enemy-fallback.png`
- `1366x768-05-boss-battle-opening-t101-layout.png`
- `1920x1080-05-boss-battle-opening-t101-layout.png`
- `1920x1080-06-verdict-page.png`

抽查结论：常态战斗截图第一眼已从旧的中央残榜信息面板，改为左执簿者、右敌人、中间动作通道和底部手牌操作层；三坛归到左侧执簿者，临诏归到底部快捷，残榜审案感通过背景纹理、敌方名格和裁定页保留。T101 追加修复后，首战、第二战、多敌、Boss 的聚焦截图均能在首屏看到手牌卡面，不再只显示“手牌”标题。

## 验证命令

- `node --check scripts/capture-t96-battle-layout-screenshots.mjs`：通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run test`：通过，35 个测试文件、247 个用例。
- `npm run build`：通过；Vite 仍保留单 chunk 超过 500 kB 的既有提示。
- `npm run capture:t101`：通过，生成 18 张 manifest 截图与指标。
- `git diff --check`：通过。

环境说明：

- 普通沙箱启动 dev server 因 `listen EPERM 127.0.0.1:5173` 失败；提权后 `npm run dev -- --host 127.0.0.1` 启动成功，本轮实际截图使用 `http://127.0.0.1:5174/`。
- 普通沙箱运行 Playwright Chromium 因 macOS MachPort 权限失败；提权后 `npm run capture:t101` 通过。
- 截图复核完成后已停止本轮 Vite 进程，`127.0.0.1:5174` 无监听。

## 剩余风险

- 当前仍是程序化占位和布局重排，不是正式角色立绘、敌人立绘、背景图或特效序列帧。
- 1280x720 下右下快捷区仍有一定信息密度；是否继续压缩临诏 / 法宝 / 香封快捷入口，应以用户审图为准。
- 1280x720 和 1366x768 的自动多敌路径本轮记录为 fallback；多敌真实截图已在 1920x1080 覆盖。
- 后续如进入 AI 概念候选或人工正式美术，仍必须按素材台账记录来源、授权、用途和是否可商用。
