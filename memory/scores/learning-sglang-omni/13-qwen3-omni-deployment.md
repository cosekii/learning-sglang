# 第 13 章评分卡 · Deploy and tune Qwen3-Omni

日期：2026-11-26。本轮修复协调复审 `afae801` 留下的第 6、8 步两项问题，教程提交为 `dcdc5a8`。未改步沿用协调人的 R1–R5 评审；独立文本冷读者复读两个改动步。协调人的上次结论是 R1–R5 79/80、原十二项 190/192，不能直接当作本轮通过结论。

R6、原 #4「图自己说话」和原 #5「颜色一个意思」仍需 PNG 冷读。当前模型不能读取图片，因此不给 R6、易读总分或原分 `/24`，也不记协调通过或最终完成。

本轮材料：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-zg696dya/opencode/ls-k1-omni13-rework/`。其中有第 6、8 步的 8 张中英桌面／390 px 手机舞台图和 4 张双语深入讲解图。浏览器另完成 8 个桌面／手机文本与 ARIA 断言，以及 4 个深入讲解 DOM 检查。

| 步 | R1–R5 /10 | R6 | 易读总分 | R1 小学生复述 | 原分 /24 | 当前未决文本洞 | 待评项 | 日期 |
|---|---:|---:|---:|---|---:|---:|---|---|
| 1 | 10 | — | — | 纯文字部署开一卡一进程，默认语音部署开两卡七进程。 | — | 0 | R6、#4/#5 目测、协调复审 | 2026-11-26 |
| 2 | 10 | — | — | 语音服务器只答文字时绕过 talker；要声音时才走 talker 和 code2wav。 | — | 0 | R6、#4/#5 目测、协调复审 | 2026-11-26 |
| 3 | 10 | — | — | 8 路并发时 talker 独占让首音等待接近减半，但单请求总耗时变长。 | — | 0 | R6、#4/#5 目测、协调复审 | 2026-11-26 |
| 4 | 10 | — | — | thinker 的 78% 减去整卡 5 个百分点，留给 AR 的是 73%。 | — | 0 | R6、#4/#5 目测、协调复审 | 2026-11-26 |
| 5 | 10 | — | — | INT4 的文档估计比 BF16 约少一半，但 talker 和 code2wav 仍用 BF16。 | — | 0 | R6、#4/#5 目测、协调复审 | 2026-11-26 |
| 6 | 10 | — | — | 两种摆法都把两个 encoder 和 thinker 留在 GPU 0；每个 code2wav 进程默认有 32 个状态位，replica2 有 64 个，但不等于吞吐翻倍。 | — | 0 | R6、#4/#5 目测、协调复审 | 2026-11-26 |
| 7 | 10 | — | — | readiness 只证明小请求能跑完，比较部署要固定设置并分开记录客户端和听者结果。 | — | 0 | R6、#4/#5 目测、协调复审 | 2026-11-26 |
| 8 | 10 | — | — | 决策表列出起步摆法和要补的证据；图末问客户端读得慢时，API 进程里排队的声音会怎样。 | — | 0 | R6、#4/#5 目测、协调复审 | 2026-11-26 |

**当前状态：author-rework-verified / coordinator-review-pending / owner-visual-review-pending。** 本轮文本复审的 R1–R5 为 80/80。表中的 0 只表示本轮没有留下已知文本问题，不代表协调复审已经销项。R6 和原视觉项未评分，不记 8/8 步易读 12/12、原分 24.00/24、零显示洞或 `complete-under-EVAL`。

## 本轮两项返工

- 第 6 步 caption／ARIA 明说两图都有 `2 encoders + thinker` 在 GPU 0，默认 code2wav 也在那里。英文写 `Each code2wav process`，中文保留「每个 code2wav 进程」和「状态位」，避免把 32／64 读成精度，也不再把 64 个状态位泛化到全部九个进程。
- 独立文本冷读首轮曾给第 6 步 R3=1，指出英文漏 `process`、中文「32 位」有精度歧义。修正后复读 R1–R5=10/10，未留下文本阻塞项。
- 第 8 步桌面、手机、caption／ARIA、MDX 和双语深入讲解统一为 `client ← queued audio (API process)`。独立文本冷读 R1–R5=10/10。

## 视觉边界

- 八步都有 `phase`、`nextLap()` 和 `<LoopProgress>`。本轮只改文字，没有重新评审完整动画相位。
- 真实 DOM 断言确认第 6 步 caption／ARIA 的进程范围，以及第 8 步桌面和手机上的 API process 位置。该检查不代替 R6 或 PNG 视觉评分。
- 已生成并尝试读取上述 12 张 PNG；当前模型返回 `Cannot read image`，所以本轮不做视觉完成声明。

## 验证记录

- `npm run build`：60 页，通过。
- `BOOK=omni ONLY=13 npm run transcript -- http://localhost:4324/learning-sglang`：8 步，无布局问题，transcript 已重生成。
- `BOOK=omni ONLY=13 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=13 npm run mobile -- http://localhost:4324/learning-sglang`：360、390、430 px 均无布局断裂。
- 中文第 6、8 步分别运行 `BOOK=omni ONLY=13 STEP=M LANG=zh npm run mobile -- http://localhost:4324/learning-sglang`：三种宽度均通过布局和字号硬门。
- `BOOK=omni node scripts/deep-check.mjs 13` 与 `BASE=http://localhost:4324/learning-sglang BOOK=omni ONLY=13 node scripts/zh-check.mjs`：通过。
- 第 6、8 步的 4 个双语深入讲解 DOM 视图均打开成功，必需文本齐全，无残留 `$`、KaTeX 错误或横向溢出。
- 只运行目标章检查，没有运行全站回归、真实模型、GPU benchmark 或音频质量评测。代码出处固定到 `sglang-omni origin/main@9725235249df851281d4dc62a04b2d34b02ac0fe`。
