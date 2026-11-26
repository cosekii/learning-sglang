# 第 14 章评分卡 · When the client reads too slowly

日期：2026-11-26。协调人对 `6ded516…208cea2` 的独立结论是 R1–R5 **75/80**、非视觉原项 **156/160**。R6 和原 #4/#5 未全评，旧作者的满分与无洞结论全部撤回。协调没有给出逐步 R1–R5 分布，表内不伪造逐步分数。本轮修复五组返工，独立文本冷读已关闭其指出问题；协调复评仍待，分数不变。

材料：`.bot/out/omni14/shots/` 有第 1、2、7、8 步的 16 张中英桌面／390 px 手机图，`.bot/out/omni14/deep/` 有对应 8 张双语深入讲解图。`.bot/out/omni14/dom-check.json` 记录 8 个中英舞台／深入讲解视图的逐字断言。24 张 PNG 均已尝试读取；当前模型返回 `Cannot read image`，不据此给视觉分。

| 步 | R1 小学生复述 | 协调 R1–R5 /10 | R6 | 原分 /24 | 协调未决项（本轮修复前） | 日期 |
|---|---|---:|---:|---:|---|---|
| 1 | 生成比播放快，socket 填满后，6 秒未读声音以 internal float32 留在 API 进程。 | 未单列 | 未全评 | 未全评 | internal payload、socket、慢读动机；前两项与第 2 步共享 | 2026-11-26 |
| 2 | 一个 API 进程把所有流的消息字节放在一起限额，socket 缓冲不在这份账里。 | 未单列 | 未全评 | 未全评 | internal payload、socket；两项与第 1 步共享 | 2026-11-26 |
| 3 | 读者取走消息会把空闲钟归零，生成新消息不会。 | 未单列 | 未全评 | 未全评 | 本轮未改 | 2026-11-26 |
| 4 | 总量超限后，最久没读的流先失败。 | 未单列 | 未全评 | 未全评 | 本轮未改 | 2026-11-26 |
| 5 | 两路老流依次失败，总量才回到上限以内。 | 未单列 | 未全评 | 未全评 | 本轮未改 | 2026-11-26 |
| 6 | 超过上限会让整条流失败，还在生成时才中止生成。 | 未单列 | 未全评 | 未全评 | 本轮未改 | 2026-11-26 |
| 7 | 首音前 HTTP SSE 和 raw audio 返回 JSON 503；SSE 开始后发 error，raw 响应流提前结束。 | 未单列 | 未全评 | 未全评 | 首音前 HTTP 503、SSE 开始后的 error、raw 响应流出口 | 2026-11-26 |
| 8 | 关闭会清掉队列和积压，但 abort 消息没送到时，工作记录可能继续占住流 ID。 | 未单列 | 未全评 | 未全评 | abort transport 失败时的队列清理与 ID 保留 | 2026-11-26 |

**当前状态：assigned-rework-source-fixed / coordinator-review-pending / owner-visual-review-pending。** 协调基线保持 R1–R5 **75/80**、非视觉原项 **156/160**。本轮源码修复和独立文本冷读不提高协调分，不记 `complete-under-EVAL`。组件只有响应式 `matchMedia`，本轮未新增动画；完整 R6 和原视觉项仍待协调评审。

## 五组返工

- **第 1、2 步内部格式**：在 `24,000 samples/s × 4 B/sample` 和 3.1 小时算式旁标明 coordinator 队列里的 internal 24 kHz float32 payload，并区分 mono 16-bit HTTP 输出。MDX 和双语深入讲解同步，避免把 96,000 B/s 或 3.1 小时直接套到 raw PCM 交付。
- **第 1、2 步 socket 缓冲**：舞台和正文说明它是已经交给操作系统或 HTTP runtime、不再属于 coordinator 账本的字节。它们也在等客户端，但不计入共享消息总量。
- **第 1 步慢读动机**：caption 和正文说明客户端按播放速度读取，生成可快于实时；socket 填满后形成本步积压，并指回第 8 章第 3 步。
- **第 7 步协议出口**：首音前 HTTP SSE 和 raw audio 返回 JSON 503；SSE 开始后改发 error 事件；raw 响应开始后只能提前结束，没有通用错误外壳；语音 WebSocket 使用 error 事件，自己的完成路径不在本步展开。`CONNECTION CLOSED EARLY` 改为 `RESPONSE STREAM ENDS EARLY`／「响应流提前结束」。保留请求到达时不被这个上限拒绝的边界。
- **第 8 步两种清理保证**：取走错误或关闭读者会释放队列和剩余积压，不重复扣减已经归零的声音。abort transport 失败时，请求工作记录可能继续占住流 ID；只有 abort 成功、ownership 已完成或后续恢复时才释放。ownership 已完成表示不需要再次 abort，后续恢复机制不在本章展开。

独立文本冷读者检查组件、MDX、双语深入讲解和 transcript。首轮指出 503 范围、WebSocket 完成路径说明、admission 限定、双语队列保证和 ID 释放条件五组问题；修复后复查指出深入讲解摘要仍漏 SSE/raw 范围。补齐后终审为 **all prior findings closed**。这不替代协调复审或 PNG 视觉验收。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页，通过；`BOOK=omni node scripts/deep-check.mjs 14` 通过。
- `BOOK=omni ONLY=14 npm run transcript -- http://localhost:4323/learning-sglang`：8 步，无布局问题，transcript 已重生成。
- `BOOK=omni ONLY=14 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=14 npm run mobile -- http://localhost:4323/learning-sglang`：英文 24 个视图在 360、390、430 px 均无布局破坏。
- 中文第 1、2、7、8 步分别运行 `BOOK=omni ONLY=14 STEP=M LANG=zh npm run mobile -- http://localhost:4323/learning-sglang`：三种宽度均通过布局和字号硬门。
- `BASE=http://localhost:4323/learning-sglang BOOK=omni ONLY=14 node scripts/zh-check.mjs`：8 步通过。
- `node .astro/check-omni14.mjs`：8 个中英舞台／深入讲解视图通过；caption 与 ARIA 逐字一致，内部格式、socket、协议出口和条件清理文字齐全，深入讲解无横向溢出、残留 `$$` 或 KaTeX 错误。
- `git diff --check`：通过。
- 只运行目标章检查，没有运行全站回归、真实 SSE／WebSocket／raw-PCM 连接、模型或 GPU benchmark。代码出处固定到 `sglang-omni origin/main@9725235249df851281d4dc62a04b2d34b02ac0fe`。

源码提交：`5e92976`（第 1、2 步）、`76b0599`（第 7 步）、`1b016aa`（第 8 步）、`b4c7160`（独立冷读整改），均已推送到 `origin/tutorials`。
