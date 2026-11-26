# k2 本轮报告

日期：2026-11-26。范围只含 Learning ML Systems 第 10、12 章第 5 步的协调返工及对应评分卡；未动 Omni、Voxt、第 1 本英文原文、`.bot/memory/` 或第 13 章草稿。

## 已修复的 review 项

- **ML 10 第 5 步**：桌面和手机把 `.weight` 改为至少二维，`K` 改为最后一维。双语深入讲解补 `view(-1, param.shape[-1])` 的高维展平及 `K` 的符号来源，transcript 已重生成。独立冷读另发现“形状不支持就保留原形式”不适用于已展平但 K 不整除的张量，已改为“保持未量化”，复读为 GO。
- **ML 10 评分卡**：协调基线改为 R1–R5 **90/90**、非视觉原项 **179/180**，保留静态场景口径 R6 **18/18**、原 #4/#5 **36/36**、原十二项 **215/216**。修复后作者重评非视觉原项 **180/180**、未决文本洞 0；协调复评仍待。
- **ML 12 第 5 步**：双语公式、符号表和梯度说明由 `θ_shared` 改为 `θ_detached`，只指辅助 CE 分支上被 detach 的 target 主干参数。target 主干不称为共享参数；embedding 和 LM head 的共享关系留在正文。独立冷读为 GO。
- **ML 12 评分卡**：协调基线改为 R1–R5 **80/80**、非视觉原项 **159/160**，保留静态场景口径 R6 **16/16**、原 #4/#5 **32/32**、原十二项 **191/192**。修复后作者重评非视觉原项 **160/160**、未决文本洞 0；协调复评仍待。

## 验证

两章分别运行并通过：

- `npm run build`：60 页。
- `BOOK=ml-sys ONLY=N JOBS=1 node scripts/transcript.mjs http://localhost:4324/learning-sglang`：ML 10 为 9 步并提交生成差异；ML 12 为 8 步，无生成差异。
- `BOOK=ml-sys ONLY=N npm run readability`：ML 10 九步、ML 12 八步，均 0 机械问题。
- `BOOK=ml-sys ONLY=N node scripts/mobile.mjs http://localhost:4324/learning-sglang`：英文章节在 360、390、430 px 均无布局破坏。
- `BOOK=ml-sys ONLY=N STEP=5 LANG=zh node scripts/mobile.mjs http://localhost:4324/learning-sglang`：第 5 步中文三种宽度均通过，含字号门。
- `BOOK=ml-sys node scripts/deep-check.mjs N`、`BASE=http://localhost:4324/learning-sglang BOOK=ml-sys ONLY=N node scripts/zh-check.mjs`、`git diff --check`：全部通过。

截图：`.bot/out/ml10-final/` 有第 5 步中英桌面、390 px 手机和中英深入讲解共 6 张；`.bot/out/ml12-final/` 有第 5 步中英深入讲解共 2 张。当前模型不能读图，本轮没有新增视觉评分，也没有把机械检查当作 PNG 目视。

未跑全站回归、真实训练、rollout、GPU benchmark 或模型质量评测。静态场景旧分不替代 EVAL 第 6 节的动画验收。

## 提交与后续

- `c7814a7`：`[k2] Fix INT4 weight dimension rules`，已推送。
- `ba32bf7`：`[k2] Correct detached target gradient symbols`，已推送。
- 本报告随最后一条 `[k2]` 提交推送。

下一轮先等协调复评这两处返工；之后按 direction 对照 ML 13 旧 diff 与当时 HEAD 决定保留或重做，继续跳过缺原始来源的第 11 章。动画、PNG 视觉验收和主人的最终产品验收仍未完成。

本地章节地址为 `http://localhost:4324/learning-sglang/ml-sys/ch/10-int4-qat-rollout/?step=5` 和 `http://localhost:4324/learning-sglang/ml-sys/ch/12-rl-speculative-decoding/?step=5`。本轮启动的 dev server 在收尾时关闭；需要再看时运行 `npx astro dev --background`。
