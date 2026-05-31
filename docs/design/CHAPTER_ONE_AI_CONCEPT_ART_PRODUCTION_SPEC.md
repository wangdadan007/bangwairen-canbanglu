# 第一章 AI 概念图生产规格

日期：2026-05-27
更新：2026-05-30
性质：AI 概念候选提示词规格、安全流程、命名与审图标准；已登记 T108 美术方向锚点，不入正式构建

## 1. 目标

本文件用于启动第一章角色、怪物、UI token 与短反馈特效的 AI 概念候选生产。它不是正式美术入库单，也不是素材授权证明。

本轮目标：

- 给衡简、照微、莲烬、纸面鬼、窃榜使建立第一轮 AI 概念图 prompt。
- 统一第一轮构图、尺寸、朝向、留白、禁区和审图标准。
- 规定 AI 图只进入“概念候选 / 不入正式构建”，避免未审图、未授权、未抠图素材误接入游戏。
- 为后续 contact sheet、人工审图、二轮精修和小规模接入切片提供稳定流程。

本轮不做：

- 不在仓库内批量生成 AI 图片。
- 不提交第三方图片、字体、音频、视频或素材包。
- 不把任何 AI 图直接作为正式角色立绘、敌人立绘、UI 图标、特效序列帧或宣传素材。
- 不改变玩法机制、角色机制、敌人机制、卡牌、路线、数值或 UI 布局基准。
- 不新增生产依赖。

2026-05-30 追加：用户已在 GPT 中按本规格生成并人工筛选出 T108 美术方向锚点，包含纸面鬼标准图、普通战背景图和普通战合成审图；原衡简单张标准图已被后续 `ch1-ai-concept-20260530-b02` 的 6 张统一规格动作包替代并删除。相关文件仍只作为概念候选 / 审图参考，图片文件已归档到 `docs/assets/concept_ai/ch1/` 下对应批次目录，不进入正式构建。

2026-05-31 追加：T109 已归档照微 6 张统一规格透明底动作包和 Krita 源文件，批次为 `ch1-ai-concept-20260531-b03`。本批使用“照微待机标准图 -> 图生图动作包 -> Krita 统一画布 / 脚底线 / 透明底”的流程，当前仍只作为概念候选，不进入正式构建。

## 2. 模型与输出口径

推荐使用当前可用的高质量 GPT Image 系列模型做第一轮概念候选；实际模型名称以生成时账号可用列表为准，并必须写入素材台账的 `model` 字段。

第一轮输出定位：

| 项 | 口径 |
|---|---|
| 资产状态 | 概念候选 |
| 是否入正式构建 | 否 |
| 是否视为可商用 | 否，直到授权和平台条款复核完成 |
| 背景 | 干净旧纸色 / 浅灰背景，便于审图和后续抠图 |
| 透明底 | 第一轮不强制；后续二轮精修或人工处理时再抠透明底 |
| 图中文字 | 禁止；编号由本地 contact sheet 加，不让模型画进图里 |
| 参考图 | 默认不使用；若使用，必须先记录来源与授权 |

## 3. 第一轮生产范围

第一轮只覆盖最关键的战斗识别对象：

| 批次对象 | 数量建议 | 构图 | 用途 |
|---|---:|---|---|
| 衡简 | 6-8 | 全身战斗 sprite 概念，朝右 | 左侧执簿者战斗图方向 |
| 照微 | 6-8 | 全身战斗 sprite 概念，朝右 | 左侧执簿者战斗图方向 |
| 莲烬 | 6-8 | 全身战斗 sprite 概念，朝右 | 左侧执簿者战斗图方向 |
| 纸面鬼 | 6 | 小型全身 / 完整漂浮轮廓，朝左 | 首战教学怪方向 |
| 窃榜使 | 6 | Boss 全身 / 近全身完整轮廓，朝左 | 第一章 Boss 方向 |
| UI token | 每类 4-6 | 方形 token / 小图标概念 | 名格、来势、异动、判印方向 |

先不批量生成所有普通怪、三精英、所有法宝、事件图和完整动画序列帧。第一轮先定角色与第一眼敌方气质。

## 4. 通用 Prompt 组件

### 4.1 通用风格底座

所有角色和怪物 prompt 都应包含：

```text
Original 2D game battle sprite concept for a Chinese mythic deckbuilder roguelike game.
Full-body readable silhouette, complete figure visible, clean plain old-paper background, generous margins around the character.
Ritual desk atmosphere, old paper scrolls, cinnabar seals, oxidized bronze, dark wood, ink marks, ash-gray temple mood, restrained dark gold accents.
Painterly stylized 2D game art, clear shape language, readable at small in-game size.
No text, no logo, no UI frame, no watermark.
```

说明：

- `full-body` 用于源图生产，方便角色选择页、图鉴页、战斗页裁切复用。
- 战斗页实际展示可缩放或少量裁切，但源图必须保留完整轮廓。
- `generous margins` 是为了后续抠图、接入 UI 和 contact sheet 编号。

### 4.2 通用禁区

所有 prompt 后面都追加：

```text
Avoid collectible mobile gacha hero illustration style.
Avoid direct resemblance to Jiang Ziya, Yang Jian, Nezha, Daji, Shen Gongbao, Wen Zhong, or any named Fengshen character.
Avoid blue-purple xianxia glow, oversized magical aura, futuristic elements, modern clothing, guns, sci-fi armor, cute mascot style, horror close-up face.
Avoid text, calligraphy characters, readable symbols, logo, watermark, UI panel, card frame.
Avoid copying any existing game, anime, film, TV, or comic character design.
```

### 4.3 构图要求

角色：

- 全身或近全身源图。
- 朝右，视线或姿态指向敌方。
- 站在旧纸 / 桌案感地面上，不做飞天海报。
- 身体外轮廓清楚，法宝身份物可缩成小图标。
- 留出四周边距，不能贴边裁切。

敌人：

- 全身或完整漂浮轮廓源图。
- 朝左或面向中间。
- 主体轮廓必须适合贴敌形条、名格、来势 / 异动标记。
- Boss 可以更高更宽，但主体不能被红印、烟雾或背景遮住。

UI token：

- 方形构图。
- 单个标记居中。
- 不画长说明文字。
- 能在 32-64 px 下仍区分形状。

## 5. 角色 Prompt

### 5.1 衡简

用途：旧榜执笔，稳健、旧吏、裁定入口。战斗页左侧执簿者源图。

```text
[Global style base]
Original 2D game battle sprite concept for a Chinese mythic ritual ledger deckbuilder.
Eastern ritual judgment atmosphere: old paper, cinnabar seals, oxidized bronze, dark wood, temple ash, restrained dark gold.
Hand-drawn low-detail 2D game sprite for an indie card roguelike.
Bold simple shapes, clear silhouette, readable at small battle-screen size.
Slightly mature cartoon-stylized, but not cute, not chibi, not anime.
Simple flat-to-soft shading, limited value groups, clean visible edges.
Costume and props should be simplified into iconic shapes, not detailed illustration.
Rough, charming, functional game art with strong identity, closer to readable battle sprites than polished character concept art.

Keep the general direction of the previous best candidate: large readable robe blocks, sparse accessories, short writing brush, broken whip fragment, ledger page, restrained cinnabar verdict seal.
Do not redesign into a highly detailed fantasy character.
Only refine the identity, pose, and broken-registry feeling.

[Object-specific description]
Hengjian, an original ledger-keeper outside the Fengshen roster.
A calm old-registry scribe and verdict officer, steady and upright, facing right.
Middle-aged or mature adult, not an elderly sage, not a high-ranking imperial minister.
He should feel like an outsider clerk of a broken divine registry, weighing names before writing a verdict.

His silhouette should feel composed, narrow, disciplined, and slightly severe.
Use long sleeves, a few large robe panels, one damaged residual ledger-page shape, and a short ritual writing brush as the main identity cue.
The costume should remain iconic and sparse, built from large readable blocks instead of many ornaments.

Use tied hair or a small low ledger-keeper headpiece, not a tall official crown.
The ritual brush should be short, clearly a writing brush for verdicts, held close to the body.
The brush should be in a "verdict about to be written" pose: his hand is slightly raised or angled downward, as if the brush tip is just about to touch the broken ledger page.
This should feel like writing a judgment, not attacking.

Replace the large plain paper-board feeling with a smaller broken residual ledger page.
The ledger page should be cracked, torn, scorched, or chipped at the edges, like a fragment torn from a damaged divine roster.
It should not block the character's body too much.
The page can be held lower, closer to the torso, or slightly to the side, leaving the body posture readable.
The page should contain no readable writing.
Use one rough, uneven cinnabar verdict seal or broken seal mark, not a perfect modern red UI circle.

Add a subtle "outside the roster" strangeness without adding detail: the robe hem or one side panel can resemble old torn ledger fragments, with a few large jagged paper-like shapes integrated into the clothing silhouette.
These fragments should be simple, readable, and not covered in text.

A small broken whip fragment should hang near his belt or rest close to his side.
Make it clearer than a normal waist ornament: a short segmented dark cord or broken ritual whip piece with one simple bronze ring and a frayed end.
It should feel like a restrained registry object tied to old authority, not a main weapon.

Make the ledger motif, cinnabar verdict seal, and broken registry identity clear with only a few big shapes.
Use very few accessories: one seal token, one ledger strap, one short brush, one broken whip fragment.
No dense ornaments.
No heroic combat pose.
No court-official grandeur.
He should read as a quiet, severe, original verdict clerk from a broken divine registry.

[Pose and action]
Standing full-body or near full-body, facing right.
Calm but active enough for battle UI.
One hand holds or steadies the smaller broken ledger page.
The other hand holds the short brush close to the page, about to write a verdict.
The pose should suggest "执笔将落判" rather than simply standing and displaying a document.
Keep the motion restrained, precise, ritualistic, and clerical.

[Composition]
Full-body or near full-body, complete figure visible, facing right, generous margins.
Clean plain old-paper background.
3:4 portrait aspect ratio.
Battle sprite concept for a left-side player character in a card roguelike battle UI.
Readable as a small on-screen character, with no need to zoom in to understand the role.
Leave clear space around the silhouette for later cutout and UI placement.

[Color and material]
Muted black, ash gray, old parchment beige, dark wood brown, oxidized bronze, restrained dark gold, and limited cinnabar red.
The cinnabar red should appear as one or two strong identity accents only.
The robe should be mostly large dark and parchment color blocks.
The broken ledger page should feel old, dry, damaged, and ceremonial.
Avoid glossy fabric, bright magic colors, or polished fantasy armor materials.

[Negative]
No text, no readable calligraphy, no logo, no watermark.
Not gacha, not anime, not Chinese donghua character art, not cute, not chibi, not children's cartoon.
Not blue-purple xianxia glow, not modern, not sci-fi, not western fantasy armor.
Avoid realistic Chinese historical costume illustration.
Avoid high-detail fantasy concept art, polished character design sheet, cinematic key art, oil-painting realism.
Avoid photorealistic face, realistic skin rendering, complex facial details, dramatic cinematic lighting.
Avoid ornate robe embroidery, dense fabric texture, tiny belts, tiny metal accessories, dangling trinkets, readable plaques, bamboo-slip text patterns, readable seal symbols.
Avoid direct resemblance to named Fengshen characters, especially Jiang Ziya, Wen Zhong, or any famous sage / minister figure.
No tall imperial crown, no emperor robe, no court-official cosplay.
No oversized magical aura, no excessive floating scrolls.
No spear-like brush, no staff-like brush, no weaponized brush.
No large file board blocking the body.
No clean modern red circle icon.
No perfectly round UI-like seal symbol.
No highly refined donghua protagonist face, no handsome fantasy hero styling.
```

关键审图点：

- 是否像旧榜执笔者，而不是姜子牙本人。
- 打神鞭残节是否只是身份物，不像完整神兵。
- 轮廓是否稳、直、收束。
- 2026-05-30 人工筛选结论：`HJ_T108_standard` 曾替换旧 `HJ_B01_anchor` 作为衡简标准图；后续已由 `ch1-ai-concept-20260530-b02` 衡简 6 张统一规格动作包替代，其中 `HJ_idle.png` 承接标准姿态，`HJ_action_master.kra` 保留 Krita 源文件。当前仍保留低细节手绘 sprite、大袖、短笔、残榜页、腰侧断鞭和旧纸朱砂气质；后续小调优先观察脸、发冠、腰间红印、断鞭长度、衣摆破损和手持纸张一致性，不把该候选直接接入正式构建。

### 5.2 照微

用途：照影断名，低己形高信息，问名 / 辨势方向。照微当前按男性角色口径处理。

```text
Original full-body 2D battle sprite concept for a Chinese mythic deckbuilder roguelike game.
Zhaowei, an original male ledger-keeper outside the Fengshen roster, slender and precise, facing right.
Sharp narrow silhouette, one oxidized bronze bone-revealing mirror held at an angle, thin cinnabar threads and pale green mirror light kept subtle.
Calm analytical posture, as if reading hidden names and enemy intent from the mirror.
Cold jade, oxidized bronze mirror, pale green, cold white, dark gold, fine cinnabar lines, ash-gray temple mood.
Full body visible, feet visible, complete readable silhouette, clean plain old-paper background, generous margins.
Painterly stylized 2D game art, readable at small in-game size.
No text, no logo, no UI frame, no watermark.
Avoid collectible mobile gacha hero illustration style.
Avoid blue-purple xianxia mage look, wing-like magic glow, futuristic armor, modern clothing.
Avoid direct resemblance to any named Fengshen character.
```

关键审图点：

- 是否清瘦、锋利、信息型，而不是蓝紫仙侠法师。
- 照骨镜是否是视觉中心，但不挡脸、不像巨大光翼。
- 是否仍然像执簿者，不像普通术士。
- 2026-05-31 人工筛选结论：`ch1-ai-concept-20260531-b03` 已保留照微待机、问名 / 辨势、破形、正名 / 归册、受击 / 承压、胜利 / 收镜 6 张动作候选和 `ZW_action_master.kra`。后续小调优先观察动作间脸、发髻、镜子大小、袍子体量、脚底线、白边、镜光 / 朱印 / 碎屑是否需要拆成独立特效层，不把该候选直接接入正式构建。

### 5.3 莲烬

用途：莲骨破形，直攻、高己形、火轮与风险边界。

```text
Original full-body 2D battle sprite concept for a Chinese mythic deckbuilder roguelike game.
Lianjin, an original ledger-keeper outside the Fengshen roster, aggressive forward-leaning battle stance, facing right.
Strong dynamic silhouette with scorched lotus-bone motifs, red silk strips, and a cinnabar fire-wheel ritual object near the body.
The fire wheel should feel like an original ritual artifact, not Nezha's wheel, not a child deity design.
Charcoal black edges, muted cinnabar red, dark gold, burnt lotus texture, ash-gray temple mood.
Full body visible, feet visible, complete readable silhouette, clean plain old-paper background, generous margins.
Painterly stylized 2D game art, readable at small in-game size.
No text, no logo, no UI frame, no watermark.
Avoid collectible mobile gacha hero illustration style.
Avoid direct resemblance to Nezha, child deity design, twin wheel iconography, blue-purple xianxia glow, oversized fire aura.
Avoid futuristic elements and modern clothing.
```

关键审图点：

- 是否有直攻动势，但不直接像哪吒。
- 赤绫火轮是否是原创器物，不是风火轮复刻。
- 朱红、炭黑和暗金是否可控，不满屏大火。

## 6. 敌人与 Boss Prompt

### 6.1 纸面鬼

用途：第一战教学怪，低威胁、纸页、残名、可问名。

```text
Original full-body enemy battle sprite concept for a Chinese mythic deckbuilder roguelike game.
Paper Wraith, a thin floating paper figure made from a miscopied name page, facing left.
Small complete silhouette, torn paper edges, old paper fibers, ink stains, burnt edges, faint cinnabar thread marks.
Low threat teaching enemy, eerie but not horror, no large scary face, no gore.
The body should look like paper sheets lifted from a ritual desk, with a readable outline for in-game battle UI.
Full figure visible, clean plain old-paper background, generous margins.
Painterly stylized 2D game art, readable at small in-game size.
No text, no readable calligraphy, no logo, no UI frame, no watermark.
Avoid horror monster close-up, cute mascot style, anime ghost, blue-purple xianxia glow, modern objects.
```

关键审图点：

- 第一眼是否是“错抄名页浮起”，不是恐怖怪大脸。
- 体量是否轻，不提高前三场心理压力。
- 是否适合复用成无名纸祟低成本杂祟。

### 6.2 窃榜使

用途：第一章 Boss，窃名、撕榜、遮名、塞污卷和终审压案。

```text
Original full-body boss battle sprite concept for a Chinese mythic deckbuilder roguelike game.
Registry Thief, an imposing corrupted registry officer fused with torn fragments of the broken Fengshen ledger, facing left.
Large complete silhouette, taller and heavier than normal enemies, old official robe shapes, torn vertical ledger strips, deep red cinnabar seals, black-brown paper shadows, oxidized bronze token details.
The body should feel like an old clerk-shaped shadow and a ripped divine ledger overlapped, with a central torn scroll motif.
Boss pressure, ritual judgment, stolen names, final docket atmosphere.
Full body or near full body visible, complete readable silhouette, clean plain old-paper background, generous margins.
Painterly stylized 2D game art, readable at in-game boss size.
No text, no readable calligraphy, no logo, no UI frame, no watermark.
Avoid recruitable hero look, deity portrait, handsome gacha boss, demon king cliche, blue-purple xianxia glow, sci-fi armor, modern elements.
Avoid any suggestion that the boss can join the player after defeat.
```

关键审图点：

- 是否比普通敌人明显压迫，但不像可招募神将。
- 是否有“旧役吏 + 破榜阴影 + 撕榜竖带”。
- 红印是否增强终审感，而不是盖住主体。

## 7. UI Token Prompt

UI token 只做风格探索，不直接替换正式 UI。

### 7.1 名格 / 名札

```text
Square UI icon concept for a Chinese mythic deckbuilder roguelike game.
Small name plaque token made of old paper and cinnabar seal marks, used to show revealed enemy name slots.
Clear simple shape, readable at 32 to 64 pixels, no text, no readable characters, no logo, no frame.
Old paper, ink edge, cinnabar dot, restrained dark gold.
Clean plain background.
```

### 7.2 来势标记

```text
Square UI icon concept for enemy incoming force in a Chinese mythic deckbuilder roguelike game.
Directional pressure mark, bronze-gold impact line pressing toward a ritual desk, designed to be sealed or blocked.
Clear simple shape, readable at 32 to 64 pixels, no text, no readable characters, no logo.
Old bronze, dark gold, ink shadow, restrained cinnabar accent.
Clean plain background.
```

### 7.3 异动标记

```text
Square UI icon concept for enemy abnormal move warning in a Chinese mythic deckbuilder roguelike game.
Cinnabar-red warning sigil, torn paper and polluted scroll mark, clearly different from incoming force.
Clear simple shape, readable at 32 to 64 pixels, no text, no readable characters, no logo.
Old paper, cinnabar red, black ink tear, ash-gray shadow.
Clean plain background.
```

### 7.4 裁定判印

```text
Square UI icon concept for verdict stamps in a Chinese mythic deckbuilder roguelike game.
Three variant stamp directions: register into ledger, red-ink annotation, erase from registry.
Cinnabar seal, old paper, carved stamp texture, restrained dark gold edge.
Clear simple shape, readable at 64 pixels, no text, no readable characters, no logo.
Clean plain background.
```

## 8. 批次与命名规则

### 8.1 Batch ID

格式：

```text
ch1-ai-concept-YYYYMMDD-bNN
```

示例：

```text
ch1-ai-concept-20260527-b01
```

### 8.2 Asset ID

| 对象 | 前缀 |
|---|---|
| 衡简 | HJ |
| 照微 | ZW |
| 莲烬 | LJ |
| 纸面鬼 | PW |
| 窃榜使 | RT |
| 名格 / 名札 | NAME |
| 来势 | FORCE |
| 异动 | ABNORMAL |
| 裁定判印 | VERDICT |

### 8.3 文件名

候选图：

```text
<asset-prefix>_<batch-id>_vNN.png
```

示例：

```text
HJ_ch1-ai-concept-20260527-b01_v01.png
RT_ch1-ai-concept-20260527-b01_v04.png
```

Contact sheet：

```text
contact_<batch-id>_<group>.png
```

示例：

```text
contact_ch1-ai-concept-20260527-b01_roles.png
contact_ch1-ai-concept-20260527-b01_enemies.png
contact_ch1-ai-concept-20260527-b01_ui_tokens.png
```

### 8.4 建议目录

第一轮图片可以先放在候选目录，不从 `src` 引用：

```text
docs/assets/concept_ai/ch1/<batch-id>/
  roles/
  enemies/
  ui_tokens/
  contact_sheets/
  ledger.csv
```

进入正式构建前必须另开接入任务，不能在概念候选任务里直接 import 到 React / Phaser。

## 9. 素材台账字段

每张 AI 候选图必须登记：

| 字段 | 说明 |
|---|---|
| asset_id | 例如 `HJ_ch1-ai-concept-20260527-b01_v01` |
| object | 衡简 / 照微 / 莲烬 / 纸面鬼 / 窃榜使等 |
| batch_id | 本次批次 ID |
| file_path | 候选图路径 |
| contact_sheet_path | 所属 contact sheet |
| model | 实际使用模型 |
| provider | 平台 / 工具 |
| generation_date | 生成日期 |
| prompt_version | prompt 版本 |
| prompt_summary | 提示词摘要，不放账号、token 或私有链接 |
| reference_used | 是否用了参考图 |
| reference_source | 参考图来源 |
| reference_license | 参考图授权 |
| postprocess | 抠图、裁切、调色、拼图等 |
| reviewer | 审图人 |
| review_result | reject / iterate / approved_concept / approved_for_slice |
| status | concept_candidate / discarded / selected_for_iteration / ready_for_slice |
| can_use_commercially | yes / no / unknown |
| can_modify | yes / no / unknown |
| enters_build | yes / no |
| notes | 风险、修改要求、禁区命中情况 |

默认值：

- `status = concept_candidate`
- `can_use_commercially = unknown`
- `can_modify = unknown`
- `enters_build = no`

## 10. 人工审图标准

### 10.1 一票否决

任一命中即淘汰：

- 像原典人物直接复刻，例如姜子牙、哪吒、杨戬、妲己等。
- 像二次元封神抽卡手游立绘或神将收集角色。
- 图中出现可读文字、商标、签名、水印、现代品牌或疑似第三方 IP。
- 蓝紫仙侠大光效压住主体。
- 裁切严重，身体关键部位缺失，无法作为战斗 sprite 源图。
- 角色或敌人轮廓在小尺寸下不可读。
- 设计暗示 Boss 可被招募、饶恕助战或变成玩家伙伴。
- 参考图来源或授权不清。

### 10.2 评分项

每项 0-3 分：

| 项 | 说明 |
|---|---|
| 轮廓识别 | 小尺寸下是否一眼能认 |
| 项目气质 | 残榜、案前、朱砂、旧纸、青铜、庙宇感是否成立 |
| 角色 / 敌人身份 | 是否服务衡简、照微、莲烬、纸面鬼、窃榜使各自定位 |
| UI 落位适配 | 是否能放入 T101 左 / 中 / 右结构，不挡核心信息 |
| 禁区规避 | 是否避开原典复刻、抽卡神将、蓝紫仙侠 |
| 后处理可行性 | 是否适合抠图、裁切、拆层或做 sprite |

建议结论：

| 结论 | 条件 |
|---|---|
| reject | 命中一票否决，或总分明显偏低 |
| iterate | 方向有价值但需重生或精修 |
| approved_concept | 可作为视觉方向参考 |
| approved_for_slice | 可进入后续小规模接入切片，仍不是正式资产 |

## 11. Contact Sheet 要求

Contact sheet 用于集中审图，不用于游戏构建。

要求：

- 每张候选图加本地编号，例如 `HJ-01`、`ZW-03`、`RT-06`。
- 编号由拼图脚本或图像编辑工具添加，不要求模型生成。
- 每组保留同等缩放比例，避免某张图因为更大而显得更好。
- 背景使用中性灰或旧纸色。
- 每张图下方只放编号，不放长评语。
- 审图结论写入 ledger，不写进图里。

建议分组：

```text
roles: HJ / ZW / LJ
enemies: PW / RT
ui_tokens: NAME / FORCE / ABNORMAL / VERDICT
```

## 12. 安全流程

### 12.1 生成前

1. 确认本批对象和数量。
2. 确认 prompt 版本。
3. 若使用参考图，先登记参考图来源与授权；授权不清则不得使用。
4. 确认输出目录在候选区，不在 `src` 或正式资源目录。
5. 确认本批不会使用账号 token、私有 cookie、付费素材包未授权内容或第三方 IP。

### 12.2 生成后

1. 每张图写入 ledger。
2. 生成 contact sheet。
3. 人工筛除一票否决图。
4. 对保留图写 `review_result` 和 `notes`。
5. 选出每个对象 1-2 个方向进入二轮精修。
6. 未通过图保留为候选记录或丢弃，但不得进入构建。

### 12.3 接入前

接入游戏前必须另开任务，并满足：

- 图像状态至少为 `approved_for_slice`。
- 仍然不是正式商用资产，除非授权字段已明确。
- 已完成抠图、裁切、尺寸压缩和文件大小检查。
- 已验证不挡己形、敌形、名格、来势 / 异动、手牌和按钮。
- 已跑对应截图脚本或浏览器复核。
- `docs/assets/ASSET_MANIFEST.md` 已补完整素材记录。

### 12.4 禁止

- 禁止把 `concept_candidate` 图片 import 到 `src`。
- 禁止把 AI 图直接放入 Steam 页面、宣传图、README 宣传位或商店图。
- 禁止把 AI 图标记为“项目自有正式素材”，除非授权和人工后处理结论完整。
- 禁止用授权不清参考图、影视截图、其他游戏角色、社交媒体图片做参考。
- 禁止为了追求效果绕过验证码、下载限制、付费墙或站点反爬机制。

## 13. 后续任务建议

建议按以下顺序执行：

1. `AI 概念候选 B01`：生成三角色、纸面鬼、窃榜使和少量 UI token。
2. `Contact sheet 审图`：输出分组 contact sheet 和 ledger，人工筛选。
3. `二轮精修 B02`：只围绕入选方向重生 / 精修，减少随机发散。
4. `接入切片`：挑 1 名角色、纸面鬼、窃榜使和 2-3 个 UI token 接入战斗页候选分支。
5. `截图复核`：按 T101 三档视口检查遮挡、比例、首屏可读性和风格一致性。

若审图发现角色像换皮或敌人识别弱，先继续概念候选，不急着接入游戏。
