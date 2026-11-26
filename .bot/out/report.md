# k1 本轮报告

日期：2026-11-26。范围只含 Learning SGLang Omni 第 14 章第 1、2、7、8 步的五组协调返工及评分卡；未动其他 lane 的书、第 1 本英文原文、Omni 11／13 已关闭项或 `.bot/memory/`。

## 已修复的 review 项

- **第 1、2 步内部格式**：`24,000 samples/s × 4 B/sample` 和 3.1 小时算式都标明为 coordinator 队列里的 internal 24 kHz float32 payload，HTTP 输出另标为 mono 16-bit，不再把 96,000 B/s 或小时数直接套到 raw PCM 交付。
- **第 1、2 步 socket 缓冲**：舞台、MDX 和双语深入讲解都说明它是已经交给操作系统或 HTTP runtime、不再属于 coordinator 账本的字节；这些字节也在等客户端，但不计入共享消息总量。
- **第 1 步慢读动机**：caption 和正文说明客户端按播放速度读取，生成可快于实时；socket 填满后形成本步积压，并指回第 8 章第 3 步。
- **第 7 步协议出口**：首音前 HTTP SSE 和 raw audio 返回 JSON 503；SSE 开始后改发 error 事件；raw 响应只能提前结束；语音 WebSocket 使用 error 事件，自己的完成路径不在本步展开。`CONNECTION CLOSED EARLY` 改为 `RESPONSE STREAM ENDS EARLY`／「响应流提前结束」，保留请求到达时不被上限拒绝的边界。
- **第 8 步清理保证**：取走错误或关闭读者会释放队列和剩余积压，不重复扣减已经归零的声音。abort transport 失败时，请求工作记录可能继续占住流 ID；只有 abort 成功、ownership 已完成或后续恢复时才释放。

舞台、caption／ARIA、MDX、双语深入讲解和 transcript 已同步。独立文本冷读者复查五组后续问题及一处 503 范围遗留，终审为 **all prior findings closed**；这不替代协调复审。

## 评分基线

评分卡撤回旧作者满分记录，按协调对 `6ded516…208cea2` 的复审保留 R1–R5 **75/80**、非视觉原项 **156/160**。协调未给逐步分布，R6 和原 #4/#5 未全评。本轮状态为 `assigned-rework-source-fixed / coordinator-review-pending / owner-visual-review-pending`，不自行提高分数或记 `complete-under-EVAL`。

## 验证

- `npx astro --config .astro/local.config.mjs build`：60 页，通过；`BOOK=omni node scripts/deep-check.mjs 14` 通过。
- `BOOK=omni ONLY=14 npm run transcript -- http://localhost:4323/learning-sglang`：8 步，无布局问题，生成差异已提交。
- `BOOK=omni ONLY=14 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=14 npm run mobile -- http://localhost:4323/learning-sglang`：英文 24 个视图在 360、390、430 px 均无布局破坏。
- 中文第 1、2、7、8 步分别运行 `BOOK=omni ONLY=14 STEP=M LANG=zh npm run mobile -- http://localhost:4323/learning-sglang`：三种宽度均通过布局和字号硬门。
- `BASE=http://localhost:4323/learning-sglang BOOK=omni ONLY=14 node scripts/zh-check.mjs`：8 步通过。
- `node .astro/check-omni14.mjs`：8 个中英舞台／深入讲解视图通过；caption 与 ARIA 逐字一致，要求的格式、socket、协议和清理文字齐全，深入讲解无横向溢出、残留 `$$` 或 KaTeX 错误。
- `git diff --check`：通过。

截图：`.bot/out/omni14/shots/` 有 16 张中英桌面／390 px 手机舞台图，`.bot/out/omni14/deep/` 有 8 张双语深入讲解图。代表图为 `.bot/out/omni14/shots/s7-zh-desktop.png`。24 张 PNG 均已尝试读取；当前模型返回 `Cannot read image`，本轮没有新增视觉评分，也没有把机械检查当作 PNG 目视。

未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、模型或 GPU benchmark。组件本轮未新增动画，完整 R6 和最终视觉验收仍待。

## 提交与后续

- `5e92976`：`[k1] Clarify Omni 14 internal audio backlog`，已推送。
- `76b0599`：`[k1] Add Omni 14 pre-audio HTTP 503`，已推送。
- `1b016aa`：`[k1] Separate Omni 14 stream cleanup guarantees`，已推送。
- `b4c7160`：`[k1] Close Omni 14 cold-read gaps`，已推送。
- 评分卡和本报告随最后一条 `[k1]` 提交推送。
- 下一轮按 direction 修 Omni 15 的五项返工；协调复审通过前不开下一章。

本地章节地址为 `http://localhost:4323/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=7`。本轮启动的 dev server 在收尾时关闭；需要再看时运行 `npx astro --config .astro/local.config.mjs dev --background`。
