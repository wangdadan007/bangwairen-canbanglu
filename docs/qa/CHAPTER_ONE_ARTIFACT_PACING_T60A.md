# T60A 第一章法宝节奏收敛记录

日期：2026-05-20
阶段：阶段 D 后小调整

## 1. 调整目标

根据用户确认，第一章法宝仍给得太早、太多。本轮把法宝获得节奏收敛为：

- 开局获得 1 件法宝，三选一。
- 第一章过程中获得 1 件法宝，三选一。
- 打完第一章 Boss 后获得 1 件法宝，三选一。

第一章法宝池仍保留 10 件候选定义；本轮改变获得节奏，不删除法宝系统，也不把法宝改成卡牌。

## 2. 实现口径

- 开局候选：打神鞭残节、照骨镜、案铃残舌。
- 途中候选：朱砂斗、镇门残牌、残榜砚。
- Boss 后候选：缚名线轴、裂榜针、终劫铃。
- 触发点：新局进入第一战前、首个精英战后、Boss 战后。
- 商店不再直接出售法宝，只保留买卡、删牌和临时朱批服务。
- 休整维护法宝反噬预警保留。

## 3. 验证记录

| 命令 / 检查 | 结果 |
|---|---|
| `npm run typecheck` | 通过。 |
| `npm run test` | 通过，26 个测试文件，147 个测试。 |
| `npm run build` | 通过；Vite 仍提示 Phaser 首包超过 500 kB，延续既有可接受风险。 |
| `npm run preview -- --host 127.0.0.1` | 普通沙箱因 `listen EPERM 127.0.0.1:4173` 失败；提权后启动成功，实际地址为 `http://127.0.0.1:4175/`。 |
| 浏览器新局检查 | 通过。新局先显示“法宝三选一”和“法宝 0 件 / 待选法宝”；选择打神鞭残节后进入第一战，摘要显示“法宝 1 件”，不再残留待选法宝。 |
| 浏览器错误日志 | 通过。浏览器 error 级日志 0 条。 |
| 1280x720 溢出检查 | 通过。`scrollWidth 1265 <= innerWidth 1280`。截图：`/private/tmp/bangwairen-t60a-artifact-offer-1280x720.png`、`/private/tmp/bangwairen-t60a-after-artifact-choice-1280x720.png`。 |
| `git diff --check` | 通过。 |

## 4. 覆盖点

- `src/tests/artifactResolver.test.ts` 覆盖开局 offer、途中 offer、Boss 后 offer 和已选记录。
- `src/tests/chapterOneLongFlow.test.ts` 覆盖完整第一章逻辑流程最终累计 3 件法宝，且没有残留 pending offer。
- `src/tests/shopResolver.test.ts` 覆盖当前商店数据不再暴露 `shop_artifact_*` 直买法宝商品。
- `src/tests/firstRunGuidance.test.ts` 覆盖首局提示对“开局、途中、Boss 后各选 1 件”的说明。
- `src/tests/data.test.ts` 覆盖商店商品数量从 7 收敛为 5。

## 5. 剩余风险

- 三组选项池当前是固定候选，尚未做随机三选、权重、稀有度或按构筑方向动态筛选。
- `artifact_ash_lamp` 仍保留在 10 件法宝定义中，但本轮未放入第一章 3 次获得池；后续可按试玩反馈调整候选池。
- Boss 后法宝目前主要作为后续阶段承接记录；若第一章独立试玩不继续下一章，玩家会感到它更像通关纪念而非当局战力。
