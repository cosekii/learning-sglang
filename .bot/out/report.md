# lane d 本轮报告

日期：2026-11-26。只动 Inside Voxt 第 8 章及其评分卡、transcript；未碰 Omni、ML Systems、第 1 本英文原文或 `.bot/memory/`。按独立复审继续修 Voxt 08：把 R6 从焦点巡游改成实际内容相位，并给第 1 步补可核对数字代价。未开新章，也未跳去 11／10。

## 已修复的 review 项

### Voxt 08 `personal-dictionary`

- R6 机制动画：七步各 3–5 个 `setTimeout` held phase，相位改变舞台上的对象和数字，不是只移动高亮。
  - 第 1 步：识别文字 `Preeya`→`Priya`，行匹配提示出现，`you meant` 行切换。
  - 第 2 步：四个去处依次出现 `sent: Priya`、`sent: Preeya → Priya`、`sent: Priya + Preeya`、`sent: notes text`。
  - 第 3 步：语音提示框 `waiting`→`Priya`→`Priya + MOSS-Transcribe`，计数 `0→1→2`。
  - 第 4 步：替换框 `Preeya`→`Priya`，清理框 `waits for plain text`→`receives: call Priya.`，模型关闭标题变化。
  - 第 5 步：user 从无 glossary→`candidate: Priya`→`<glossary>` 插入。
  - 第 6 步：system 从无备注层→有备注→「never sent」出现。
  - 第 7 步：四行 ✓／✗ 逐行出现。
- 第 1 步 #1：舞台和 caption 补 `6 deletes + 5 keys = 11 keystrokes`／「删 6 个字符 + 打 5 个字符 = 11 次按键」。这是从舞台两个单词 `Preeya`（6 字符）和 `Priya`（5 字符）直接数出的可复现代价；待复审改分，不自行把 19/20 写成 20/20。
- 保留上一轮的 glossary 修正：候选是「正文提到某词条或其任一别名」的那个词条，舞台两行 `text names term or alias → that term`；user `<glossary>` 只在渲染结果非空时出现。

## 验证

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=8 node scripts/transcript.mjs http://localhost:4322/learning-sglang`：7 步，exit 0，无出界／重叠／脚注告警；生成文件已更新。
- `BOOK=voxt ONLY=8 node scripts/readability.mjs`：7/7，0 机械问题；`BOOK=voxt node scripts/deep-check.mjs 8`：ok；`BASE=... BOOK=voxt ONLY=8 node scripts/zh-check.mjs`：all clear。
- 英中本章 `mobile` 三种宽度无布局断裂；中文第 1、5 步字号 `mobile` 通过。
- DOM 相位检查：去掉 `.motion-focus` 和 `LoopProgress` 后，桌面和手机七步仍各读到 **3／5／3／4／3／3／4** 个不同 SVG 内容状态；5 个采样时点全部文字在 viewBox 内、无文字重叠。相图在 `/tmp/ls-d-voxt08-phases/`（英文第 1–7 步两相位，中文手机第 1／4／5／6／7 步两相位）。模型不能读图，未自评 R6；视觉评分仍待协调人。
- 未跑真实 Voxt、模型或语音服务；事实按 pinned `sglang-omni origin/main@3a31bd72e034db37ce5115a03dd4827b449683be` 核对。

## 分数与状态

- 协调基线保持 `d57bf52` 的 **R1–R5 70/70、非视觉原项 138/140、静态 R6 14/14、原 #4/#5 28/28、原十二项 166/168**；第 1 步 #1 已补代价，待复审可能升到 20/20，不自行改总分。
- 机制 R6 上一轮 **0/14**，本轮已有实际内容相位，待协调人读相位图评分。本章仍 **NO-GO／未完成**。

## 提交

- 本条 `[d] ` 提交包含组件、transcript、评分卡和本报告。已推 `origin/tutorials`。

## 下一轮

- 等协调复审 Voxt 08；通过后按 `direction.md` 的 d 线顺序转 Voxt 11 `6467ab7` 的评分卡逐步行与六步机制动画，再回 Voxt 10；全部返工复审通过后才做 `12-meeting-capture-modes`。
