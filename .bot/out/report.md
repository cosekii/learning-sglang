# lane d 本轮报告

日期：2026-11-26。只动 Inside Voxt 第 8、11 章及各自评分卡、transcript；未碰 Omni、ML Systems、第 1 本英文原文。按 `direction.md` 的 d 线顺序：先收尾 Voxt 08 的机制动画返工，再回 Voxt 11 补机制动画并同步评分卡。Voxt 10 未开新工作，等 08、11 复审通过。

## 已修复的 review 项

### Voxt 08 `personal-dictionary`

`baff867` 复审剩下的两条机制动画项：

- [x] 第 4 步聚焦序列漏掉 matching-rules 框：把步数升到 5，在 recognized→replaced→cleanup 之后插入对 `matching rules` 框的相位（桌面 `{20,164,370,176}`、手机 `{20,306,260,134}`），模型关闭改到第 5 相位。
- [x] 第 5 步始终显示非空 glossary：加第 4 个相位，user 依次为「无术语表行 → 候选 → 无匹配／上限挡住时 `glossary empty → none added` → 插入 `<glossary>`」，最后保留有匹配示例。
- 上一轮 `91a985f` 已把七步从「只移红框」改成实际内容相位，并给第 1 步补 `6 deletes + 5 keys = 11 keystrokes` 代价；本轮沿用，未重做已关闭的四脚本范围、标点端措辞和两个未用 import。
- 评分卡同步到协调 `baff867` 基线：R1–R5 **70/70**、原 10 项非视觉 **139/140**、静态 R6 **14/14**、原 #4/#5 **28/28**、原十二项 **167/168**、机制 R6 **7/14**；不自行改总分。

### Voxt 11 `models-and-app-updates`

`6467ab7` 复审剩下的两条：

- [x] 六步组件只有响应式 `matchMedia`，没有机制动画：六步各加 3 个 held phase（`PHASE_MS=900`）和 `LoopProgress`，相位改变舞台对象和数字，不只是移动高亮。
  - 第 1 步：模型 `0 B / 0 files` → `2.47 GB / 9 files` → 出现 `2,467,856,503 ÷ 280,000,000 ≈ 8.8×`。
  - 第 2 步：固定提交 → `model.safetensors` 的 SHA-256 打勾 → `vocab.json` 的 git blob ID 打勾并显示 `all checks pass`。
  - 第 3 步：下载条到取消点 → 从取消点续传满格 → `Checks: all 9 files pass`。
  - 第 4 步：`starting… → ready` → `ready · idle 10/10 min` → `stop request sent / process exits → memory freed`。
  - 第 5 步：更新器替换应用包 → 重启前 helper 被拒 → `RESTART VOXT → UPDATE DONE`。
  - 第 6 步：三种完成条件的 ✓ 依次出现。
- [x] 评分卡顶部与逐步行不一致、仍用 `469dcc6` 旧分：按协调 `6467ab7` 重记为 R1–R5 **54/60**、原 10 项非视觉 **119/120**、静态 R6 **12/12**、原 #4/#5 **24/24**、原十二项 **143/144**；逐步 R1–R5 **8/9/9/9/9/10**、原 10 项 **19/20/20/20/20/20**；写明机制 R6 本轮前为 **0/12**，本轮修复待复审。
- 未重做已关闭的第 5 步 DMG／发布页路由。

## 验证

- `npm run build`：60 页通过。
- 第 8 章：`transcript` 7 步、`readability` 7/7 0 问题、`deep-check 8`、`zh-check`、英中三宽度 `mobile` 全过。
- 第 11 章：`transcript` 6 步、`readability` 6/6 0 问题、`deep-check 11`、`zh-check`、英中三宽度 `mobile` 全过。
- DOM 相位审计（去掉 `.motion-focus` 和 `LoopProgress` 后读 SVG 文本）：第 8 章七步各 **3／5／3／4／4／3／4** 个不同内容状态（第 5 步四个依次是无术语表→候选→无匹配为空→插入 glossary）；第 11 章六步各 **3** 个不同内容状态，步 1／3／5 采到 `0 B→2.47 GB→比值`、`取消点→续传→校验通过`、`替换→被拒→更新完成`。
- 模型不能读 PNG（`Read` 返回 `Cannot read image`），未自评 R6 视觉分；相位截图在 `/tmp/ls-d-voxt11/ph0/`、`/tmp/ls-d-voxt11/ph2/`，视觉评分仍待协调人。
- 未跑真实 Voxt、模型下载、模型进程或应用更新；事实按 pinned `sglang-omni origin/main@c2fc0f102c61daee13c73ced280970a7d72ed12d` 的 Voxt 源码核对。

## 分数与状态

- Voxt 08：协调基线 R1–R5 70/70、原十项 139/140、静态 R6 14/14、#4/#5 28/28、原十二项 167/168、机制 R6 7/14；本轮补的两处机制路径和第 1 步代价待复审。仍 **NO-GO／未完成**。
- Voxt 11：协调基线 R1–R5 54/60、原十项 119/120、静态 R6 12/12、#4/#5 24/24、原十二项 143/144；本轮补六步机制动画待复审。仍 **NO-GO／未完成**。

## 提交

- `[d] Add Voxt 11 mechanism phases and sync scorecard`
- `[d] Add Voxt 08 matching-rules and empty-glossary phases`
- 均已推 `origin/tutorials`。

## 下一轮

- 等协调复审 Voxt 08、11 的机制相位图；通过后按 `direction.md` 转 Voxt 10 `80515da`／`04ded697` 的未决项（第 3 步时钟与播放头同一步、第 9 步 stdout 公式、第 9／11 步中文深入讲解结构、第 11 步 ARIA、第 6 步 `cutter.go:199`），再按 11→10；全部返工复审通过后才做 `12-meeting-capture-modes`。
- 未编辑 `.bot/memory`、`memory/progress.md`；按本轮指令把进度和分数写在本报告。
