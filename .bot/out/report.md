# lane d 本轮报告

日期：2026-11-26。只动 Inside Voxt 第 8 章及其评分卡、transcript；未碰 Omni、ML Systems、第 1 本英文原文或 `.bot/memory/`。按 `direction.md` 先回 Voxt 08 修 `d57bf52` 未决项，并按本轮独立复审补完候选映射、评分卡算术和七步机制动画。未开新章，也未跳去 11／10。

## 已修复的 review 项

### Voxt 08 `personal-dictionary`（`d57bf52` NO-GO，本轮返工）

- 候选谓词统一：pinned `compose.go:520-549` 的 `found()` 用词条本身及其任一别名匹配正文，命中的是**词条**，别名本身不成为候选。舞台底部改成两行 `text names term or alias → that term`／「文字点名词条或别名 → 那个词条成为候选」，caption、ARIA、MDX、双语深入讲解公式与符号表、transcript、评分卡同步。旧 `mentioned terms only`／「词条或别名作为候选」已删除。
- `<glossary>` 出现条件统一：pinned `compose.go:367-377,411-416` 只在渲染后的 `g` 非空时把它放到 user 开头；无匹配，或候选行全被 60 行／2000 字节上限挡住时，user 只有普通消息。caption、ARIA、MDX、双语深入讲解一句话与表后说明、transcript、评分卡两处摘要都补了这个条件；舞台保留有匹配的示例图。
- 评分卡算术：第 1 步补 `replace` 公式、$T$／$A$ 符号表、`MaxTermChars = 80`／`MaxAliases = 10` 和 `call Preeya.` → `call Priya.` 代入，关闭原 #12；第 1 步只留 #1 一个扣分，19/20 与全章 138/140 一致，不再同时写 #12 扣分和旧总分。
- 评分卡旧摘要：`这一章讲清的事` 的 glossary 条改成「文字提到某词条或其任一别名，该词条才成为候选；渲染出的 `<glossary>` 非空才进 user」，并重写本轮修复与待办，撤掉上一轮第 4／5 步的旧描述。
- 机制动画：七步各加 3–5 个 `setTimeout` 驱动的 held phase 与 `LoopProgress`，焦点框按步骤机制移动；换步清旧定时器。第 1 步词条→别名→备注，第 2 步词条框→四个去处，第 3 步词条→提示→不发的别名，第 4 步识别→替换→清理→模型关闭，第 5 步小词典→大词典→user glossary，第 6 步备注→system→不发送，第 7 步逐行四项。

## 验证

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=8 node scripts/transcript.mjs http://localhost:4322/learning-sglang`：7 步，exit 0，无出界／重叠／脚注告警；生成文件已更新，每步多一行 `loops`。
- `BOOK=voxt ONLY=8 node scripts/readability.mjs`：7/7 步，0 机械问题；`BOOK=voxt node scripts/deep-check.mjs 8`：ok。
- `BASE=... BOOK=voxt ONLY=8 node scripts/zh-check.mjs`：all clear；英中本章 `mobile` 三种宽度无布局断裂；中文第 5 步字号 `mobile` 通过。
- DOM 相位检查：七步分别读到 **3／5／3／4／3／3／4** 个不同焦点框位置，全部在 viewBox 内，七步都有 `LoopProgress`。截图在 `/tmp/ls-d-voxt08-anim/`（英文第 1–7 步、中文第 1／5 步、英文第 5 步第二相位）。当前模型不能读图，这些都是机械/DOM 检查，不构成视觉通过。
- 未跑真实 Voxt、模型或语音服务；事实按 pinned `sglang-omni origin/main@3a31bd72e034db37ce5115a03dd4827b449683be` 核对，未虚构上游同章对照。

## 分数与状态

- Voxt 08：协调 `d57bf52` 的 **R1–R5 70/70、非视觉原项 138/140、静态 R6 14/14、原 #4/#5 28/28、原十二项 166/168** 保持；本轮文本项已改，机制 R6 从上一轮 **0/14** 变为待复审，不先记分。
- 本章仍 **NO-GO／未完成**：等待协调人读相位图和深入讲解，主人最终视觉验收另计。

## 提交

- 本条 `[d] ` 提交包含组件、MDX、双语深入讲解、transcript、评分卡和本报告。已推 `origin/tutorials`。

## 下一轮

- 等协调复审 Voxt 08；通过后按 `direction.md` 的 d 线顺序转 Voxt 11 `6467ab7` 的评分卡逐步行与六步机制动画，再回 Voxt 10；全部返工复审通过后才做 `12-meeting-capture-modes`。
