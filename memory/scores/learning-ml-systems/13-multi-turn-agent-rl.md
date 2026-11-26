# 第 13 章评分卡 · 文本与动画完成，待主人视觉验收

日期：2026-11-26。全章 8 步已完成。作者按协调前口径自评：R1–R5 **80/80**，非视觉原项 **160/160**，机制 R6 **16/16**，未决内容洞 **0**。R6 来自真实相位 DOM 检查，不是静态场景评分。当前模型不能读取 PNG，原 #4／#5／#6 与主人最终视觉验收仍待，不记原十二项总分或 `complete-under-EVAL`。

材料：`.bot/out/ml13/s1.png` 至 `s8.png`；深入讲解图为 `.bot/out/ml13-deep/`。独立冷读者完成三轮文本、动画与源码复查，最终结论为 **no must-fix issues remain**。它未检查 PNG，视觉分不由文本结论代替。

| 步 | 易读分 /12 | R1 小学生复述 | 非视觉原项 /20 | 洞数 | 最差的两条 |
|---|---:|---|---:|---:|---|
| 1 | 12 | 第二次模型调用也要看前面的动作和工具观察，只给 prompt 会少 7 个响应 token。 | 20 | 0 | 原 #4／#5／#6 待目视 |
| 2 | 12 | 9 个动作 token 参与学习，3 个观察 token 留作上下文但不参与学习。 | 20 | 0 | 原 #4／#5／#6 待目视 |
| 3 | 12 | 先量出空模板的 6 个 token，再从完整 9 个中裁掉它们，只留下 3 个 Δ。 | 20 | 0 | 原 #4／#5／#6 待目视 |
| 4 | 12 | 新图片一份给下次 rollout，另一份变成训练张量，两张图片都保留。 | 20 | 0 | 原 #4／#5／#6 待目视 |
| 5 | 12 | 同一个 key 的 2 行和 1 行最后拼成 3 行，只拼一次。 | 20 | 0 | 原 #4／#5／#6 待目视 |
| 6 | 12 | 轮数用完或环境完成是 COMPLETED，token 耗尽是 TRUNCATED。 | 20 | 0 | 原 #4／#5／#6 待目视 |
| 7 | 12 | AgentLoop 决定何时找模型和工具，server 只生成动作 token。 | 20 | 0 | 原 #4／#5／#6 待目视 |
| 8 | 12 | 配置宽度是 12，7 个响应补 5 个空格，空格的两种 mask 都是 0。 | 20 | 0 | 原 #4／#5／#6 待目视 |

## 冷读整改

- 第 1 步把「拆开记录必然丢上下文」改成「本对照只给第二次调用 `P`」，同步舞台、ARIA、MDX、双语深入讲解与 `D` 的定义。
- 第 2 步明确 mask 只选择训练 token，不删除下一次调用的上下文。
- 第 3 步把 `Δ` 定义为完整观察增量，说明生成标记也在其中；本例统一记为 3 个 `O`，并解释 chat template 和共同前缀假设。
- 第 4 步明确新增初始图片的教学假设；第 5 步改成只有 key 下所有值都是张量才合并。
- 第 6 步把三个出口标为备选而非检查顺序，修正环境已返回观察但不再追加的边界，并声明下一步切换到 verl 的不同停止规则。
- 第 7 步把 mask 0 归给 AgentLoop，限定有效工具调用路径和仍在 LRU 缓存中的 request_id，补工具错误与无工具调用停止边界。
- 第 8 步把 12 改为配置的 `response_length`，不按 batch 最长响应决定；删去与本步无关且符号不一致的 `position_ids` 展开。
- 每步都有真实相位动画与循环进度；完整 SVG ARIA 包含舞台定义、数字和机制。支持 `prefers-reduced-motion`，此时展示完整末相位并停用循环。

## 硬门槛与验证

- `npx astro --config .astro/k2.config.mjs build`：60 页，通过。
- `BOOK=ml-sys ONLY=13 npm run transcript -- http://localhost:4382/learning-sglang`：8 步，无布局问题，生成文件已提交。
- `BOOK=ml-sys ONLY=13 npm run readability`：8 步，0 机械问题。
- 英文与中文分别运行 `BOOK=ml-sys ONLY=13 [LANG=zh] npm run mobile -- http://localhost:4382/learning-sglang`：360／390／430 px 全部通过。第 3 步中文副标题曾出界，缩短后逐步复查通过。
- `BOOK=ml-sys node scripts/deep-check.mjs 13`、`BASE=http://localhost:4382/learning-sglang BOOK=ml-sys ONLY=13 node scripts/zh-check.mjs`、`git diff --check`：通过。
- `node .astro/check-ml13.mjs`：8 步的活动相位从第 1 个对象推进到第 2 个对象，末相位完整显示，ARIA 无 `undefined`；16 个中英深入讲解抽屉全部打开，无横向溢出、残留 `$$` 或 KaTeX 错误。
- transcript 的固定 CDP 端口曾与其他 lane 冲突，改用未占用端口完成检查后已还原脚本；没有把超时命令记为通过。

## 边界

- 本章没有直接的 zero-to-sglang 或上游对应章，不虚构对照；以 pinned slime、verl 源码和两篇 Awesome 文章为事实标尺。
- 所有 token、图片、tensor 行数、预算和配置值都是构造教学值，不是 benchmark。第 6 步是 slime，第 7–8 步切换到 verl，不混用停止状态。
- 未跑真实训练、rollout、工具调用、VLM、GPU benchmark 或质量评测，也未跑全站回归。PNG 已生成并尝试读取，当前模型返回 `Cannot read image`，原 #4／#5／#6 与主人最终视觉验收仍待。
