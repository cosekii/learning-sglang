# k1 本轮报告

日期：2026-11-26。范围只含 Learning SGLang Omni 第 13 章第 6 步的协调返工及对应评分卡；未动其他 lane 的书、第 1 本英文原文或 `.bot/memory/`。Omni 11 已在 `1df0d34…d86329d` 复审为 GO，Omni 12 已通过，因此本轮按 direction 处理 Omni 13。

## 已修复的 review 项

- **Omni 13 第 6 步中文 caption／ARIA**：改为「两图的 GPU 0 都有 2 encoders + thinker；默认还有 code2wav。code2wav 每进程默认 32 个状态位，replica2 每进程 64，吞吐未必翻倍。」默认 32 明确属于每个 code2wav 进程，保留两句和 replica2 的 64 上限。英文、舞台、MDX 和双语深入讲解未改，transcript 已重生成。
- **Omni 13 评分卡**：按协调对 `ed2cb5d` 的复审记录 R1–R5 **79/80**、第 6 步 **9/10**、**1 个默认 32 主语洞**、非视觉原项 **159/160**、静态原 #4/#5 **32/32**、原十二项 **191/192**。不再用作者自评覆盖协调结论。第 8 步 `client ← queued audio (API process)` 保持已关闭，不重做。

## 验证

- `npx astro --config .astro/local.config.mjs build`：60 页，通过。`node_modules` 是指向协调 checkout 的符号链接；本地配置只把 Vite cache 留在本工作区并允许读取该依赖目录，没有修改协调 checkout 或教程配置。
- `BOOK=omni ONLY=13 npm run transcript -- http://localhost:4323/learning-sglang`：8 步，无布局问题，生成差异已提交。
- `BOOK=omni ONLY=13 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=13 npm run mobile -- http://localhost:4323/learning-sglang`：英文章节在 360、390、430 px 均无布局破坏。
- `BOOK=omni ONLY=13 STEP=6 LANG=zh npm run mobile -- http://localhost:4323/learning-sglang`：中文第 6 步三种宽度均通过布局和字号硬门。
- `BOOK=omni node scripts/deep-check.mjs 13`、`BASE=http://localhost:4323/learning-sglang BOOK=omni ONLY=13 node scripts/zh-check.mjs`、`git diff --check`：全部通过。
- 真实浏览器逐字断言通过：计数器为 `06 / 08`，中文 caption 与 SVG `aria-label` 都是上述新句子。

截图：`.bot/out/shots/` 有第 6 步中英桌面和 390 px 手机共 4 张；`.bot/out/deep/` 有中英深入讲解共 2 张。代表图为 `.bot/out/shots/s6-zh-desktop.png`。当前模型返回 `Cannot read image`，本轮没有新增视觉评分，也没有把机械检查当作 PNG 目视。

未跑全站回归、真实模型、GPU、服务或音频质量评测。完整动画 R6 未重评；独立 `pstack-reviewer` 因配置的模型不存在而未能运行，本报告不冒称独立复审通过。

## 提交与后续

- `720a6f7`：`[k1] Clarify Omni 13 code2wav slot scope`，rebase 后已推送到 `origin/tutorials`。
- 本报告随最后一条 `[k1]` 提交推送。
- 协调复评和主人的最终视觉验收仍待；评分卡保留协调基线，不提前提高分数或销洞。
- 后续按 direction 先修 Omni 14 的五个未决项，再修 Omni 15 的五个未决项；这些返工通过前不开下一章。

本地章节地址为 `http://localhost:4323/learning-sglang/omni/ch/13-qwen3-omni-deployment/?step=6`。本轮启动的 dev server 在收尾时关闭；需要再看时运行 `npx astro --config .astro/local.config.mjs dev --background`。
