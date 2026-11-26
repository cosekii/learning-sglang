# 第 13 章评分卡 · 协调基线与本轮返工证据

日期：2026-11-26。

## 最新协调基线

固定 `34e6233` 的协调结论仍为 **NO-GO**：R1–R5 **79/80**、原十个非视觉项 **159/160**、机制 R6 **16/16**、静态原 #4/#5 **32/32**、原十二项 **191/192**。第 4 步缺训练 dictionary 的字段排除边界，未决内容洞 **1**；默认 transcript 为 **1744 words**，与 pinned **1793 words** 不一致。本章不记 `complete-under-EVAL`。

下表保留这组协调分，不把本轮作者验证写成协调提分。

| 步 | 易读分 /12 | R1 小学生复述 | 非视觉原项 /20 | 洞数 | 最差的两条 |
|---|---:|---|---:|---:|---|
| 1 | 12 | 第二次模型调用也要看前面的动作和工具观察，只给 prompt 会少 7 个响应 token。 | 20 | 0 | 无未决内容项 |
| 2 | 12 | 9 个动作 token 参与学习，3 个观察 token 留作上下文但不参与学习。 | 20 | 0 | 无未决内容项 |
| 3 | 12 | 先量出空模板的 6 个 token，再从完整 9 个中裁掉它们，只留下 3 个 Δ。 | 20 | 0 | 无未决内容项 |
| 4 | 11 | 新图片一份给下次 rollout，另一份变成训练张量，两张图片都保留。 | 19 | 1 | 缺 `input_ids`／`attention_mask` 排除边界 |
| 5 | 12 | 同一个 key 的 2 行和 1 行最后拼成 3 行，只拼一次。 | 20 | 0 | 无未决内容项 |
| 6 | 12 | 轮数用完或环境完成是 COMPLETED，token 耗尽是 TRUNCATED。 | 20 | 0 | 无未决内容项 |
| 7 | 12 | ToolAgentLoop 决定何时找模型和工具，server 只生成动作 token。 | 20 | 0 | 无未决内容项 |
| 8 | 12 | 配置宽度是 12，S2 的 7 个响应补 5 个空格，空格的两种 mask 都是 0。 | 20 | 0 | 无未决内容项 |

## 本轮返工与作者验证

- `796c714` 在第 4 步舞台、ARIA 和双语深入讲解恢复边界：`D0`、`D1` 都排除 `input_ids` 和 `attention_mask`，第 3 步已把 `O` 单独存入 token 记录。依据是 pinned slime 对初始输入和观察输入的两处相同过滤。
- `c8fb266` 让 transcript 采集器等待 URL 指定步的末相位，避免默认等待在 3.4 秒时提前采集，也避免把 Step 1 的末相位编号误用到其他步。其他章节没有这些 data 属性时仍沿用原固定等待。
- 默认重生成两次及 `WAIT=1` 重生成都与 pinned **1808 words** 逐字一致。新增 15 词来自第 4 步两行边界说明。ML 12 默认重生成也无差异，确认非目标章节的采集时序未变。
- 本轮机械检查全过，但协调内容和分数复审仍待进行；不自行把基线改为 **80/80、160/160、192/192**，不记 `complete-under-EVAL`。

## 硬门槛与证据

- `npm run build -- --config .astro/k2.config.mjs`：60 页，通过。本地配置只隔离 Vite cache 并允许符号链接依赖，位于忽略的 `.astro/`。
- `BOOK=ml-sys ONLY=13 npm run transcript -- http://localhost:4385/learning-sglang`：8 步，无 caption、出界、重叠或脚注问题；默认重生成与 pinned 一致。
- `BOOK=ml-sys ONLY=13 npm run readability`：8 步，0 机械问题。
- 英文全章、中文全章及中文第 4 步 `BOOK=ml-sys ONLY=13 [STEP=4] [LANG=zh] npm run mobile -- http://localhost:4385/learning-sglang`：360／390／430 px 均通过。
- `BOOK=ml-sys node scripts/deep-check.mjs 13`、`BASE=http://localhost:4385/learning-sglang BOOK=ml-sys ONLY=13 node scripts/zh-check.mjs`、`git diff --check`：通过。
- 英中第 4 步深入讲解 DOM 均含两处排除字段和第 3 步 token 记录；横向溢出为 0，无 KaTeX 错误或残留 `$$`。
- 第 4 步英文桌面、中文手机及双语深入讲解 PNG 在 `.bot/out/ml13-rework/`。当前模型不能读取 PNG，未把文件生成或 DOM 检查记成视觉通过。

## 边界

- 本章没有直接的 zero-to-sglang 或上游对应章；以 pinned slime、verl 源码和两篇 Awesome 文章为事实标尺。
- 所有 token、图片、tensor 行数、预算和配置值都是构造教学值，不是 benchmark。第 6 步是 slime，第 7–8 步切换到 verl，不混用停止状态。
- 未跑全站回归、真实训练、rollout、工具调用、VLM、GPU benchmark 或质量评测。协调复审和主人最终视觉验收仍待。
