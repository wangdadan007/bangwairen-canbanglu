# T61 工程质量门禁记录

日期：2026-05-20
阶段：阶段 D 后工程质量补强

## 1. 本轮目标

建立面向非代码审阅者也能复核的自动质量门禁，让后续提交前可以用固定命令确认代码质量、核心规则、构建和浏览器首屏流程没有明显倒退。

本轮只做轻量门禁，不追求一次性把所有 UI 组件和完整通关流程都自动化。

## 2. 已加入能力

- ESLint：新增 `npm run lint`，检查 TypeScript / React 代码中的未使用变量、基础语法风险和 Hooks 基础规则。
- 统一门禁：新增 `npm run verify`，顺序执行 lint、typecheck、unit test 和 build。
- 覆盖率基线：新增 `npm run test:coverage`，生成 `coverage/` 报告；当前不设硬阈值。
- 浏览器冒烟：新增 `npm run test:e2e`，用 Playwright 跑最小 Chromium 流程。
- 完整门禁：新增 `npm run verify:full`，在 `verify` 之外再跑 coverage 和 Playwright。
- CI：GitHub Actions 新增 lint、coverage baseline、Playwright Chromium 安装和浏览器冒烟。

## 3. 浏览器冒烟覆盖

当前 Playwright 只覆盖小范围关键路径：

- 标题页可见。
- 设置页可打开和返回。
- 点击“新开本局”后出现开局法宝三选一。
- 选择打神鞭残节后进入第一战。
- 第一战显示法宝 1 件、敌方目标和结束回合按钮。
- 1280x720 下无水平溢出。
- 浏览器 console error 和 pageerror 为 0。

## 4. 验证记录

| 命令 / 检查 | 结果 |
|---|---|
| `npm install -D ...` | 普通沙箱因 npm registry 网络限制失败；提权后分批安装成功。 |
| `npx playwright install chromium` | 提权后成功安装 Chromium、FFmpeg 和 headless shell。 |
| `npm run lint` | 通过。 |
| `npm run typecheck` | 通过。 |
| `npm run test` | 通过，26 个测试文件，147 个测试。 |
| `npm run build` | 通过；Vite 仍提示 Phaser 首包超过 500 kB，延续既有可接受风险。 |
| `npm run test:coverage` | 通过；当前覆盖率基线为 statements 70.26%、branches 50.1%、functions 86.54%、lines 69.8%。 |
| `npm run test:e2e` | 普通沙箱因 `listen EPERM 127.0.0.1:5173` 失败；提权后通过，1 个 Chromium 测试通过。 |
| `npm run verify` | 通过。 |
| `npm run verify:full` | 提权后通过。 |

## 5. 刻意不做

- 不设置覆盖率硬阈值，避免为了数字补无意义测试。
- 不把完整第一章通关做成 UI 自动化测试，避免测试过慢、过脆。
- 不启用 React Compiler 类过强 lint 规则作为阻断项；本轮只保留更稳定的基础规则。
- 不新增生产依赖；本轮新增均为开发期依赖。

## 6. 后续观察项

- 试玩反馈修复稳定后，再考虑给 `src/core` 设置覆盖率阈值，建议先观察 80% statements / 65% branches 是否合理。
- 若 UI bug 主要集中在页面跳转和状态恢复，再扩 Playwright 到奖励、裁定、商店、休整、失败结算和 Boss 后法宝 offer。
- 若 CI 时间过长，可把 `test:coverage` 或 `test:e2e` 改成 PR 必跑、main 定时跑。
- 若以后升级 React Compiler 或 React Hooks 插件，再单独评估是否启用更严格规则。

## 7. 模板沉淀检查

本轮产生可模板化模块：ESLint + Vitest coverage + Playwright smoke + GitHub Actions 的轻量质量门禁，可作为 `AI Game Development Planning and QA Kit` 的 engineering quality gate 候选。
