# 第 13 章评分卡 · Deploy and tune Qwen3-Omni

日期：2026-11-26。本轮终审 `afae801` 的三项返工。R1–R5 沿用协调人的全章文本评审，并复读改动的第 6、8 步。R6 仍需截图冷读；浏览器逐相位 DOM 轮询只证明焦点数量与相位顺序，不能判断节奏是否看得清，因此不给 R6 或易读总分。原 #4「图自己说话」和原 #5「颜色一个意思」也需 PNG 目视。当前模型和独立文本冷读者都不能读取图片，本轮不给原分 `/24`，也不记最终完成。

本轮材料：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-ylivnoee/opencode/ls-k1-omni13-review/`。其中有 32 张中英桌面／390 px 手机舞台图，以及第 6、8 步的 4 张双语深入讲解图。浏览器另完成 16 个桌面／手机整轮相位审计和 4 个深入讲解 DOM 审计。

| 步 | R1–R5 /10 | R6 | 易读总分 | R1 小学生复述 | 原分 /24 | 已知文本洞 | 待评项 | 日期 |
|---|---:|---:|---:|---|---:|---:|---|---|
| 1 | 10 | — | — | 纯文字部署开一卡一进程，默认语音部署开两卡七进程。 | — | 0 | R6、#4/#5 目测 | 2026-11-26 |
| 2 | 10 | — | — | 语音服务器只答文字时绕过 talker；要声音时才走 talker 和 code2wav。 | — | 0 | R6、#4/#5 目测 | 2026-11-26 |
| 3 | 10 | — | — | 8 路并发时 talker 独占让首音等待接近减半，但单请求总耗时变长。 | — | 0 | R6、#4/#5 目测 | 2026-11-26 |
| 4 | 10 | — | — | thinker 的 78% 减去整卡 5 个百分点，留给 AR 的是 73%。 | — | 0 | R6、#4/#5 目测 | 2026-11-26 |
| 5 | 10 | — | — | INT4 的文档估计比 BF16 约少一半，但 talker 和 code2wav 仍用 BF16。 | — | 0 | R6、#4/#5 目测 | 2026-11-26 |
| 6 | 10 | — | — | 两种摆法都把两个 encoder 和 thinker 留在 GPU 0；replica2 每个 code2wav 有 64 个状态位，但不等于速度翻倍。 | — | 0 | R6、#4/#5 目测 | 2026-11-26 |
| 7 | 10 | — | — | readiness 只证明小请求能跑完，比较部署要固定设置并分开记录客户端和听者结果。 | — | 0 | R6、#4/#5 目测 | 2026-11-26 |
| 8 | 10 | — | — | 决策表列出起步摆法和要补的证据；图末问客户端读得慢时，排队声音会怎样。 | — | 0 | R6、#4/#5 目测 | 2026-11-26 |

**当前状态：assigned-review-fixes-verified / owner-visual-review-pending。** R1–R5 为 80/80。R6、原 #4/#5 均未完成截图冷读，不记 R6 分数、8/8 步易读 12/12、原分 24.00/24、零显示洞或 `complete-under-EVAL` 结论。

## 本轮三项返工终审

- 第 6 步两个拓扑面板都写 `GPU 0 · 2 encoders + …`，caption、ARIA、MDX、双语深入讲解和 transcript 一致。浏览器在桌面与手机 DOM 中都读到两处标签。
- 第 8 步改为 `CHAPTERS 1–12 REVIEW`／「第 1–12 章回顾」，不再写「全书」；MDX 和双语深入讲解同步收窄。
- 第 8 步图末有 `client ← queued audio`。桌面最后一枚轮廓为 `16,581,688,142`，手机为 `11,726,278,326`，都覆盖这条提示和问题。
- 独立文本冷读曾提示第 6 步同时定义 `running cap` 和 `codec state slot`。复读前章后确认两者都不是新概念：第 6 章第 2 步已讲 `max_running_requests`，第 10 章第 3 步已讲 `codec-state slot`，因此 R2 不扣分。
- `afae801` 已包含三项源码修复，本轮没有改动教程源码。

## 动画 DOM 代理与视觉边界

- 八步都有 `phase`、`nextLap()` 和 `<LoopProgress>`。相位计数依次是 `3, 3, 4, 4, 3, 4, 4, 6`；每个相位 1,500 ms，轮末停留 1,800 ms，循环时长依次为 6.3、6.3、7.8、7.8、6.3、7.8、7.8、10.8 秒。
- 当前浏览器以 200 ms 间隔轮询完整一轮，桌面和 390 px 手机都观察到全部相位，且任何采样点都只有一枚 `.motion-focus`。这只是 DOM 结构代理，不是 EVAL 要求的 R6 截图冷读，不能据此判断节奏是否看得清。
- R6、原 #4/#5 均未完成 PNG 目视，本轮不给这些项打分。

## 验证记录

- `npm run build`：60 页，通过。
- `BOOK=omni ONLY=13 npm run transcript -- http://localhost:4322/learning-sglang`：8 步，无布局问题，无生成差异。
- `BOOK=omni ONLY=13 npm run readability`：8 步，0 机械问题。
- 英文和中文 `BOOK=omni ONLY=13 npm run mobile -- http://localhost:4322/learning-sglang`：360、390、430 px 均无布局断裂；中文第 6、8 步的字号硬门也分别通过。
- `BOOK=omni node scripts/deep-check.mjs 13` 与 `BASE=http://localhost:4322/learning-sglang BOOK=omni ONLY=13 node scripts/zh-check.mjs`：通过。
- 第 6、8 步的 4 个双语深入讲解 DOM 视图均打开成功，必需文本齐全，无残留 `$`、KaTeX 错误或横向溢出。
- 16 个桌面／手机整轮相位 DOM 代理检查完成；第 6 步标签和第 8 步末相位锚点均在真实 DOM 中确认。该检查不记为 R6 视觉评分。
- 只运行目标章检查，没有运行全站回归、真实模型、GPU benchmark 或音频质量评测。代码出处固定到 `sglang-omni origin/main@9725235249df851281d4dc62a04b2d34b02ac0fe`。
