# lane d 本轮报告

日期：2026-11-26。只动 Inside Voxt 第 8、11、10 章及其评分卡、transcript；未碰 Omni、ML Systems、第 1 本英文原文或 `.bot/memory/`。按 `direction.md` 的 d 线顺序 Voxt 08→11→10 修 `review.md` 未决项，未开新章。

## 已修复的 review 项

### Voxt 08 `personal-dictionary`（`d57bf52`）

- 第 4 步：舞台两条规则行改为 `Han / Hiragana / Katakana / Hangul: anywhere` 和中文对应；ARIA、MDX、双语深入讲解把「非中日韩／CJK」收窄为汉字、平假名、片假名、韩文四类，保留标点端不查该侧边界、整词和忽略大小写。
- 第 5 步：ARIA 删掉已撤下的 60 行／2000 字节截断、最长前缀和缓存细节，只留消息位置与 `≤30`／`>30` 候选规则；双语深入讲解「图上是什么」不再把已删内容说成舞台底部。
- 删掉组件顶部两个未用 import：`VOXT_DICT_GLOSSARY_MAX_TERMS`、`VOXT_DICT_GLOSSARY_MAX_BYTES`。
- 评分卡改按最新独立复审 `50275a7` 记 **69/70、137/140、静态 R6 14/14、原 #4/#5 28/28、165/168、83/84**，列出本轮处理项。

### Voxt 11 `models-and-app-updates`（`6467ab7`）

- 第 5 步统一更新回退：有匹配 DMG 就下载安装，没有匹配才打开发布页。英文 caption 15 词 `A feed updates a release build; without one, a matching DMG, else the release page.`；中文两句各 15／24 字。
- 桌面和手机副标题、`NO FEED · RELEASE BUILD` 面板、MDX 出处和双语出处表都改成条件式，不再写成 DMG／发布页并列；开发版无更新路线保留。
- 评分卡改按 `469dcc6` 记 **53/60、118/120、24/24、142/144、65/72**。

### Voxt 10 `file-transcription`（`04ded69`）

- 第 9 步英文 caption 缩到 15 词；第 11 步缩到 15 词并保留「模型文件怎样到达这台 Mac」的问题。
- 第 3、7 步双语深入讲解「图上是什么」与现舞台同步：删掉已撤下的「回复早于最后 PCM 字节」和 `--lang` 脚注描述。
- 第 9、11 步双语深入讲解补 `公式 + 符号表 + 代入图上的数`；第 11 步 MDX 和尾声只问模型文件，不再提应用更新。
- 第 6 步单点出处从 `cutter.go:198` 改为 return 所在的 `cutter.go:199`。
- 第 1 步补一小时文件解码后 115.2 MB 的代价，双语深入讲解补 `B = T × f_s × b`、符号表和 `3,600 × 16,000 × 2` 代入，关闭 #1／#12 缺口。
- 第 3 步加入循环播放头动画（`requestAnimationFrame` + `LoopProgress`）：0–8 s 扫过波形，走到 2.90–3.35 s 安静段时加框高亮，作为 R6 机制动画；`prefers-reduced-motion` 时停在终点。
- 评分卡按 `80515da` 记 **108/110、214/220、44/44、258/264**，R6 保留复审时的 **0/22** 并标明本轮动画待重评。

## 验证

- `npm run build`：60 页通过（rebase 到 `6fb3c27` 后再跑一次仍通过）。
- Voxt 08／11／10 各自 `ONLY=N` 的 `transcript`、`readability`、`deep-check`、`zh-check` 全过；英中 `mobile` 360／390／430 px 无布局断裂。
- Voxt 10 中文第 1、3、9、11 步另跑 `STEP=M LANG=zh` 字号硬门，三种宽度全过。
- 截图目录 `/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-t9w2wsvq/opencode/voxt08/`（第 4／5 步英中桌面与手机各 7 张）。当前模型不能读图，未把机械门当视觉评分；动画相位和最终视觉验收仍待协调复审。

## 分数与状态

- Voxt 08：仍 **NO-GO**（最新独立复审 69/70、137/140）；本轮剩余项已改，待复审。
- Voxt 11：仍 **NO-GO**（53/60、118/120、142/144）；第 5 步路由本轮已修，待复审。
- Voxt 10：仍 **NO-GO**（108/110、214/220、258/264，R6 0/22）；文本项本轮已修，R6 加入第 3 步动画但未获视觉复审。
- 未跑真实 Voxt、ASR、音频文件、模型下载或更新；事实按 pinned `sglang-omni@3a31bd72e034db37ce5115a03dd4827b449683be` 核对。

## 提交

- `d57bf52` `[d] Narrow Voxt 08 alias scripts and step 5 ARIA`
- `6467ab7` `[d] Make Voxt 11 update fallback conditional`
- `04ded69` `[d] Close Voxt 10 captions, deep-dive gaps, and add step 3 animation`
- 均已推送 `origin/tutorials`；评分卡与 transcript 随对应提交。

## 下一轮

- 等协调复审三章。若 Voxt 10 的第 3 步动画 R6 不过，按复审意见调整相位或换到更贴机制的一步；通过后再做 `12-meeting-capture-modes`。
