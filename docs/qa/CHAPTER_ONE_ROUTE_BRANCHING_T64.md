# T64 第一章三主线路线分支 QA

日期：2026-05-21

T79 更新：2026-05-24 已在保留 T64 三主线结构的前提下，将所有具体支线扩到窃榜使 Boss 前 8 场实际战斗。下表的后段结构按当前路线数据更新；T64 机器验证记录仍保留为当时的历史基线。

## 1. 范围

T64 将第一章路线从线性节点升级为手工分支路线：

- 第 1 到第 3 场固定教学：纸面鬼、偷香鼠、铜铃夜巡。
- 第 4 节点后出现三条主线：稳行、归册、裂榜。
- 每条主线中段各有一次二选一小分支。
- 所有主线最终汇回 `route_node_boss_registry_thief`。
- 本轮不做完整随机地图、不新增第二章、不新增 Boss 池。

## 2. 分支结构

| 主线 | 入口 | 中段二选一 | 后段 | 风险与补给 |
|---|---|---|---|---|
| 稳行 | `route_node_unlit_temple_warden` | `route_node_first_shop` 或 `route_node_rest_site` | `route_node_steady_mid_altar_check` -> `route_node_steady_incense_clerk` -> `route_node_steady_support_pressure` -> `route_node_late_plague_paper_figure` -> Boss | 普通战压力较稳；中段必给商店或休整，后续补坛位、支援和污卷检查，适合作为基准路线。 |
| 归册 | `route_node_first_elite` | `route_node_second_elite` 或 `route_node_mid_event` | 双精英支线：`route_node_catalogue_rest` -> `route_node_catalogue_name_pressure` -> `route_node_catalogue_altar_crosscheck` -> `route_node_catalogue_final_pollution` -> Boss；事件商店支线：`route_node_catalogue_shop` -> `route_node_late_fleeing_name_paper_horse` -> `route_node_catalogue_event_altar_crosscheck` -> `route_node_catalogue_event_fire_elite` -> `route_node_catalogue_event_final_pollution` -> Boss | 入口和至少一处支线为高压精英；连续精英后固定休整，事件支线后固定商店，并在 Boss 前补遮名、坛位和污染检查。 |
| 裂榜 | `route_node_fracture_fortune_breaker` | `route_node_first_event` 或 `route_node_late_scroll_stuffer_clerk` | 事件休整支线：`route_node_fracture_rest` -> `route_node_fracture_event_altar_pressure` -> `route_node_fracture_event_fouled_pressure` -> `route_node_fracture_event_name_pressure` -> `route_node_late_event` -> `route_node_third_elite` -> `route_node_boss_ante_rest` -> Boss；塞卷商店支线：`route_node_fracture_shop` -> `route_node_fracture_shop_fouled_pressure` -> `route_node_late_event_after_shop` -> `route_node_fracture_shop_name_pressure` -> `route_node_third_elite` -> `route_node_boss_ante_rest` -> Boss | 榜裂 / 劫数倾向更强；事件支线给休整，高压塞卷支线给商店，T81 后斗部空壳后统一补一次 Boss 前休整，两条都在 Boss 前保留污染、遮名、事件补给和斗部空壳终段考核。 |

## 3. 路线倾向记录

已在 route 层记录路线倾向标签：

- `steady`：稳行主线和其补给节点。
- `catalogue`：归册精英线、归册事件 / 休整 / 商店和遮名后段。
- `fracture`：裂榜主线、塞卷支线、裂榜休整 / 商店 / 事件和斗部空壳精英。
- `supply`：商店、休整或事件补给节点。
- `high_pressure`：连续精英、高压后段普通战和终段精英。

当前 Boss 仍使用单一 `encounter_boss_registry_thief`，未按路线倾向改变数值或行动。T64 只把倾向写入 `RouteState.routeTendencyIds`，供后续 Boss 行为变体、结算摘要或人工 QA 调整使用；若后续启用 Boss 强化，必须保留上限并继续保留补给抵消空间。

## 4. 机器验证矩阵

`src/tests/chapterOneLongFlow.test.ts` 已覆盖三角色 × 三主线：

| 角色 | 稳行主线 | 归册主线 | 裂榜主线 | 机器 Boss 前 / 后己形 |
|---|---|---|---|---|
| 衡简 | 通过 | 通过 | 通过 | 72 / 72 |
| 照微 | 通过 | 通过 | 通过 | 64 / 64 |
| 莲烬 | 通过 | 通过 | 通过 | 78 / 78 |

额外支线覆盖：

| 主线 | 非推荐角色覆盖支线 | 结果 |
|---|---|---|
| 稳行 | 莲烬走 `route_node_rest_site` | 通过，包含 `steady` 与 `supply` 倾向。 |
| 归册 | 衡简走 `route_node_mid_event` | 通过，包含 `catalogue` 与 `supply` 倾向。 |
| 裂榜 | 照微走 `route_node_late_scroll_stuffer_clerk` | 通过，包含 `fracture`、`high_pressure` 与 `supply` 倾向。 |

说明：当前 long-flow smoke 是 pure-logic 护栏，不模拟真实手牌出牌与敌方扣己形；因此 Boss 前 / 后己形为路线状态可收束的机器基线，不代表真实试玩压力。T65 人工试玩需要记录实际 Boss 前己形、Boss 后己形和补给使用体感。

## 5. 验证命令

- `npm run test -- src/tests/routeResolver.test.ts src/tests/data.test.ts src/tests/tutorialRun.test.ts src/tests/chapterOneLongFlow.test.ts src/tests/artifactResolver.test.ts`：通过。
- `npm run typecheck`：通过。
- `npm run verify`：通过，包含 lint、typecheck、全量 Vitest 和 production build；全量 Vitest 当前为 27 个测试文件、152 个测试。
- `git diff --check`：通过。
- 浏览器验证：普通沙箱启动 `npm run dev -- --host 127.0.0.1` 因 `listen EPERM 127.0.0.1:5173` 失败；提权后启动成功，访问 `http://127.0.0.1:5173/`，第三战后路线页出现 3 个“择此路”按钮，处理待裁定 / 奖励后点击第一条进入“第四战：无灯庙祝”。验证后已停止本次 Vite 进程。

构建仍出现 Vite chunk size warning，沿用 T61 后的记录口径，暂不在 T64 做 code splitting。
