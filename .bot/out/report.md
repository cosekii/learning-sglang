# lane d 本轮报告

日期：2026-11-26。只动 Inside Voxt 第 8 章及其评分卡、transcript；未碰 Omni、ML Systems、第 1 本英文原文或 `.bot/memory/`。按 `direction.md` 的 d 线顺序先回 Voxt 08 修 `d57bf52` 两组未决项，未开新章，也未在本轮跳去 11／10。

## 已修复的 review 项

### Voxt 08 `personal-dictionary`（`d57bf52` NO-GO）

- 候选谓词统一：pinned `compose.go:520-549` 的 `found()` 用词条本身及其任一别名匹配正文，命中的是**词条**，别名本身不成为候选。舞台 `matched terms` 和底部规则、caption、ARIA、MDX、双语深入讲解公式与符号表、transcript、评分卡统一为「正文提到某词条或其任一别名时，该词条成为候选」。删掉旧 `mentioned terms only`、`只留文字提到的` 和「词条或别名作为候选」。
- `<glossary>` 出现条件统一：pinned `compose.go:367-377,411-416` 只在渲染后的 `g` 非空时把它放到 user 开头；无匹配，或匹配到的行全被 60 行／2000 字节上限挡住时，user 只有普通消息。caption、ARIA、MDX、双语深入讲解一句话、表后说明与公式符号、transcript、评分卡两处摘要都补了条件；舞台保留有匹配的示例图。
- 评分卡撤回 `50275a7` 的 69/70、137/140、165/168 和「第 4、5 步剩余内容项已修完」，改记协调最新 `d57bf52` 的 **R1–R5 70/70、非视觉原项 138/140、静态 R6 14/14、原 #4/#5 28/28、原十二项 166/168、机制 R6 0/14**，并保留第 5 步原 #10 和「待复审」，不据本轮改动提前销项。

## 验证

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=8 node scripts/transcript.mjs http://localhost:4322/learning-sglang`：7 步，exit 0，无出界／重叠／脚注告警；生成文件已随提交更新。
- `BOOK=voxt ONLY=8 STEP=5 node scripts/readability.mjs`：0 机械问题。
- `BOOK=voxt node scripts/deep-check.mjs 8`：ok；`BASE=... BOOK=voxt ONLY=8 node scripts/zh-check.mjs`：all clear。
- 英中本章 `BOOK=voxt ONLY=8 node scripts/mobile.mjs` 三种宽度无布局断裂；中文第 5 步 `BOOK=voxt ONLY=8 STEP=5 LANG=zh node scripts/mobile.mjs` 字号与出界门通过。
- DOM 边界复核：英文桌面 `matched terms` 与底部规则、中文手机对应文字都落在各自面板和舞台内。截图在 `/tmp/ls-d-voxt08/en-desktop.png` 和 `/tmp/ls-d-voxt08/zh-phone.png`；当前模型不能读图，视觉复审仍待协调人/主人。
- 未跑真实 Voxt、模型或语音服务；事实按 pinned `sglang-omni origin/main@3a31bd72e034db37ce5115a03dd4827b449683be` 核对，未虚构上游同章对照。

## 分数与状态

- Voxt 08：协调最新仍 **NO-GO**（70/70、138/140、166/168，机制 R6 0/14）。本轮两组跨层事实错误已改，待复审重评；不记整章完成。
- Voxt 08 的机制动画硬门仍未做（组件只有响应式 `matchMedia`），按 EVAL §6 记 0/14。

## 提交

- 本条 `[d] ` 提交包含：`src/components/voxt/PersonalDictionary.svelte`、`src/pages/voxt/ch/personal-dictionary.mdx`、双语深入讲解、`transcript/voxt/personal-dictionary.md`、评分卡和本报告。已推 `origin/tutorials`。

## 下一轮

- 等协调复审 Voxt 08；通过后按 `direction.md` 的 d 线顺序转 Voxt 11 `6467ab7` 的评分卡逐步行与六步机制动画，再回 Voxt 10；全部返工复审通过后才做 `12-meeting-capture-modes`。
