# 第 13 章评分卡 · Deploy and tune Qwen3-Omni

日期：2026-11-26。本轮修复协调复审 `dcdc5a8…ed2cb5d` 留下的第 6 步中文范围和评分卡记录。协调人的最新结论是 R1–R5 **79/80**、非视觉原项 **159/160**、静态原 #4/#5 **32/32**、原十二项 **191/192**。第 8 步已关闭；协调记录中的第 6 步仍有 1 个默认 32 主语洞。本轮源码修复等待协调复审，不改写这个已评分数。

完整动画 R6 未重评。协调人已评静态原 #4/#5；本轮只改中文 caption／ARIA 和记录，不重报易读总分或原分 `/24`，也不记协调通过或最终完成。当前模型不能读取图片，新 PNG 不作为视觉评分依据。

本轮材料：`.bot/out/shots/` 有第 6 步的 4 张中英桌面／390 px 手机舞台图，`.bot/out/deep/` 有 2 张双语深入讲解图。浏览器另完成第 6 步中文 caption 与 ARIA 的逐字断言。

| 步 | 协调 R1–R5 /10 | R6 | 易读总分 | R1 小学生复述 | 原分 /24 | 协调未决文本洞 | 待评项 | 日期 |
|---|---:|---:|---:|---|---:|---:|---|---|
| 1 | 10 | — | — | 纯文字部署开一卡一进程，默认语音部署开两卡七进程。 | — | 0 | 完整动画 R6、协调复审 | 2026-11-26 |
| 2 | 10 | — | — | 语音服务器只答文字时绕过 talker；要声音时才走 talker 和 code2wav。 | — | 0 | 完整动画 R6、协调复审 | 2026-11-26 |
| 3 | 10 | — | — | 8 路并发时 talker 独占让首音等待接近减半，但单请求总耗时变长。 | — | 0 | 完整动画 R6、协调复审 | 2026-11-26 |
| 4 | 10 | — | — | thinker 的 78% 减去整卡 5 个百分点，留给 AR 的是 73%。 | — | 0 | 完整动画 R6、协调复审 | 2026-11-26 |
| 5 | 10 | — | — | INT4 的文档估计比 BF16 约少一半，但 talker 和 code2wav 仍用 BF16。 | — | 0 | 完整动画 R6、协调复审 | 2026-11-26 |
| 6 | 9 | — | — | 两种摆法都把两个 encoder 和 thinker 留在 GPU 0；每个 code2wav 进程默认有 32 个状态位，replica2 有 64 个，但不等于吞吐翻倍。 | — | 1 | 完整动画 R6、协调复审 | 2026-11-26 |
| 7 | 10 | — | — | readiness 只证明小请求能跑完，比较部署要固定设置并分开记录客户端和听者结果。 | — | 0 | 完整动画 R6、协调复审 | 2026-11-26 |
| 8 | 10 | — | — | 决策表列出起步摆法和要补的证据；图末问客户端读得慢时，API 进程里排队的声音会怎样。 | — | 0 | 完整动画 R6、协调复审 | 2026-11-26 |

**当前状态：assigned-rework-source-fixed / coordinator-review-pending / owner-visual-review-pending。** 协调最新评分为 R1–R5 **79/80**，第 6 步 **9/10**、**1 个默认 32 主语洞**；原十二项 **191/192**。本轮已按该项改清中文 caption／ARIA，但在协调复审前不提高协调分数，也不销掉该洞。完整动画 R6 未重评，不记 8/8 步易读 12/12、原分 24.00/24、显示完成或 `complete-under-EVAL`。

## 本轮返工与评分边界

- 第 6 步中文 caption／ARIA 改为「code2wav 每进程默认 32 个状态位，replica2 每进程 64」，默认 32 明确属于每个 code2wav 进程。英文、舞台和双语深入讲解未改，此项源码修复待协调复审。
- 第 8 步桌面、手机、caption／ARIA、MDX 和双语深入讲解已为 `client ← queued audio (API process)`，协调复审已关闭该项，本轮未重做。
- 评分卡按协调对 `ed2cb5d` 的复审记录 **79/80**、第 6 步 **9/10** 和 **1 个文本洞**，不用作者自评覆盖协调结论。

## 视觉边界

- 八步都有 `phase`、`nextLap()` 和 `<LoopProgress>`。本轮只改文字，没有重新评审完整动画相位。
- 真实 DOM 断言确认第 6 步为 `06 / 08`，中文 caption 与 SVG `aria-label` 逐字相同，默认 32 都明确属于每个 code2wav 进程。该检查不代替 R6 或 PNG 视觉评分。
- 已生成并尝试读取上述 6 张 PNG；当前模型返回 `Cannot read image`，所以本轮不做视觉完成声明。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页，通过。本地配置只把 Vite cache 留在本工作区并允许读取共享 `node_modules`，未改教程配置。
- `BOOK=omni ONLY=13 npm run transcript -- http://localhost:4323/learning-sglang`：8 步，无布局问题，transcript 已重生成。
- `BOOK=omni ONLY=13 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=13 npm run mobile -- http://localhost:4323/learning-sglang`：360、390、430 px 均无布局断裂。
- 中文第 6 步运行 `BOOK=omni ONLY=13 STEP=6 LANG=zh npm run mobile -- http://localhost:4323/learning-sglang`：三种宽度均通过布局和字号硬门。
- `BOOK=omni node scripts/deep-check.mjs 13` 与 `BASE=http://localhost:4323/learning-sglang BOOK=omni ONLY=13 node scripts/zh-check.mjs`：通过。
- 第 6 步中文 caption／ARIA DOM 逐字断言通过；`git diff --check` 通过。
- 只运行目标章检查，没有运行全站回归、真实模型、GPU benchmark 或音频质量评测。代码出处固定到 `sglang-omni origin/main@9725235249df851281d4dc62a04b2d34b02ac0fe`。
