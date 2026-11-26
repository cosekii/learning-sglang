# 第 13 章评分卡 · 返工后待协调与主人视觉验收

日期：2026-11-26。旧 `127fa69` 的协调结论为 R1–R5 **58/70**、原十个非视觉项 **123/140**、机制 R6 **10/14**、静态原 #4/#5 **24/28**、原十二项 **147/168**，且只有 7 步。本轮补齐第 8 步，并重做八步机制动画和全部未决内容项。

当前作者与独立只读复审结果：R1–R5 **80/80**、原十个非视觉项 **160/160**、机制 R6 **16/16**、未决内容洞 **0**。独立复审在 `c0ab0de` 对源码、双语深入讲解和 transcript 给出 **GO（source/content/mechanism）**。原 #4/#5 和原十二项总分仍不记：当前模型不能读取 PNG，协调复审和主人最终视觉验收未完成，本章不标 `complete-under-EVAL`。

材料：`.bot/out/ml13-review/` 内有八步桌面与手机阶段图，以及 16 张双语深入讲解图。R6 来自逐步真实相位 DOM 断言和独立源码复审，不是静态场景评分。PNG 已生成，但未把无法读取图片当作视觉通过。

| 步 | 易读分 /12 | R1 小学生复述 | 非视觉原项 /20 | 洞数 | 最差的两条 |
|---|---:|---|---:|---:|---|
| 1 | 12 | 第二次模型调用也要看前面的动作和工具观察，只给 prompt 会少 7 个响应 token。 | 20 | 0 | 原 #4／#5 待目视 |
| 2 | 12 | 9 个动作 token 参与学习，3 个观察 token 留作上下文但不参与学习。 | 20 | 0 | 原 #4／#5 待目视 |
| 3 | 12 | 先量出空模板的 6 个 token，再从完整 9 个中裁掉它们，只留下 3 个 Δ。 | 20 | 0 | 原 #4／#5 待目视 |
| 4 | 12 | 新图片一份给下次 rollout，另一份变成训练张量，两张图片都保留。 | 20 | 0 | 原 #4／#5 待目视 |
| 5 | 12 | 同一个 key 的 2 行和 1 行最后拼成 3 行，只拼一次。 | 20 | 0 | 原 #4／#5 待目视 |
| 6 | 12 | 轮数用完或环境完成是 COMPLETED，token 耗尽是 TRUNCATED。 | 20 | 0 | 原 #4／#5 待目视 |
| 7 | 12 | ToolAgentLoop 决定何时找模型和工具，server 只生成动作 token。 | 20 | 0 | 原 #4／#5 待目视 |
| 8 | 12 | 配置宽度是 12，S2 的 7 个响应补 5 个空格，空格的两种 mask 都是 0。 | 20 | 0 | 原 #4／#5 待目视 |

## 本轮关闭的协调与冷读项

- 第 1 步：`P P = 2` 改为 `P = 2`；动画依次把 `A+O` 加入第二次调用，再追加 `B`，不再只移动红框。
- 第 2 步：caption 改为 mask 选择训练位置，模型才是学习主体；逐格出现动作 mask 1、观察 mask 0 和最终 12 格 mask。
- 第 3 步：明确 `assistant generation prompt` 位于观察后，是请求助手回复的模板 token；动画裁掉 6 个前缀，只追加 3 个 Δ。公式改用 `U` 和 `enc`，不再复用 `D/E`。
- 第 4 步：用图片图标和两条实际分叉展示 rollout 与训练路径；`Q` 保存字典 `D0/D1`，不再复用后续动作 `B`。第 5 步的 `T0/T1` 只表示字典里的张量。
- 第 5 步：`key k` 定义为两份字典共有的张量字段名；逐行画出 2＋1→3 的 concat。行数改用 `r`，合并张量改用 `X_k`。
- 第 6 步：三个独立示例分别出现状态标签，红色改标 `example`，不再把备选出口演成一次运行的顺序。橙色只对应 TRUNCATED，蓝色只对应 COMPLETED。
- 第 7 步：统一使用 `ToolAgentLoop` 和 `request_id u`；生成动作、标 mask、返回观察、追加 mask 0 并形成下一次调用均有相位。只有调用有效、`O` 有余量且轮数未满时才继续，其他停止条件不再被漏掉。
- 第 8 步：样本改名 `S1/S2`，避免与动作 `A/B` 冲突；动画补 5 格右侧 padding，再分别给两种 mask 赋值。章末问题指向图上的 `A`、`O` 和训练 batch。
- 双语深入讲解已同步每张图的方块、行块、分叉、返回箭头和状态标签；删除了图上没有的 LRU 淘汰、字段排除和表格描述。旧桌面长文案已缩短，手机图例同步收窄。

## 硬门槛与验证

- `npx astro --config .astro/k2.config.mjs build`：60 页，通过。
- `WAIT=6000 BOOK=ml-sys ONLY=13 npm run transcript -- http://127.0.0.1:4385/learning-sglang`：8 步，无 caption、出界、重叠或脚注问题。6000 ms 落在八步各自的末相位保持段内。
- `BOOK=ml-sys ONLY=13 npm run readability`：8 步，0 机械问题。
- 英文全章及中文全章 `BOOK=ml-sys ONLY=13 [LANG=zh] npm run mobile -- http://127.0.0.1:4385/learning-sglang`：360／390／430 px 均通过。
- `BOOK=ml-sys node scripts/deep-check.mjs 13`、`BASE=http://127.0.0.1:4385/learning-sglang BOOK=ml-sys ONLY=13 node scripts/zh-check.mjs`、`git diff --check`：通过。
- `node .astro/check-ml13.mjs 1` 至 `8`：每步机制按预期推进，末相位完整，ARIA 无 `undefined`，卡片正文没有越过自己的卡片边界。
- `node .astro/check-ml13-deep.mjs`：16 个中英深入讲解抽屉全部打开，无残留 `$$`、KaTeX 错误或横向溢出。
- 固定 CDP 端口与其他 lane 冲突时，临时改用进程派生端口，检查后已还原 `scripts/transcript.mjs` 和 `scripts/mobile.mjs`。截图使用同一 `scripts/lib/browser.mjs` 的独立端口脚本。

## 边界

- 本章没有直接的 zero-to-sglang 或上游对应章；以 pinned slime、verl 源码和两篇 Awesome 文章为事实标尺。
- 所有 token、图片、tensor 行数、预算和配置值都是构造教学值，不是 benchmark。第 6 步是 slime，第 7–8 步切换到 verl，不混用停止状态。
- 未跑全站回归、真实训练、rollout、工具调用、VLM、GPU benchmark 或质量评测。独立复审不覆盖 PNG 视觉验收；主人最终视觉验收仍待。
