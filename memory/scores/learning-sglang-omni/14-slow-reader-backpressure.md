# 第 14 章评分卡 · When the client reads too slowly

日期：2026-11-26。

## 协调基线与本轮边界

协调人对 `5e92976…6e190ef` 的结论是：五组内容返工全部通过，R1–R5 **80/80**，原十个非视觉项 **160/160**，静态原 #4/#5 **32/32**，原十二项 **192/192**；八步都没有机制动画，按 EVAL §6 记机制 R6 **0/16**。静态场景分数不代替动画分数。

本轮给八步补上 held phases、`requestAnimationFrame` 和 `LoopProgress`。独立源码冷读首轮给 R6 **14/16**，指出第 1 步初始卡片与条形图分别为 6 秒和 10 秒排队、标签早于条形图到位两处问题；本轮已修正。当前源码和 DOM 证据支持 R6 **16/16**，这是 lane 的待复审结果，不是新的协调 verdict。协调 R6 复审和主人视觉验收仍待，不记 `complete-under-EVAL`。

## 逐步评分

「协调 R6」保留动画返工前的 **0/16** 基线；「本轮 R6」是当前源码与 DOM 相位检查的待复审结果。

| 步 | R1 小学生复述 | 协调 R1–R5 /10 | 协调 R6 /2 | 本轮 R6 /2 | 协调原分 /24 | 未决内容洞 |
|---|---|---:|---:|---:|---:|---:|
| 1 | 生成比播放快，读者取走 4 秒后，6 秒未读声音还留在 API 进程。 | 10 | 0 | 2 | 24 | 0 |
| 2 | 一个 API 进程把各流的消息字节加在一起限额，文字不计入。 | 10 | 0 | 2 | 24 | 0 |
| 3 | 读者取走消息会把空闲钟归零，生成新消息不会。 | 10 | 0 | 2 | 24 | 0 |
| 4 | 总量超限后，最久没读的流先失败，不是积压最大的流先失败。 | 10 | 0 | 2 | 24 | 0 |
| 5 | 两路老流依次失败，总量才回到上限以内。 | 10 | 0 | 2 | 24 | 0 |
| 6 | 超过上限会让整条流失败，只有还在生成时才中止生成。 | 10 | 0 | 2 | 24 | 0 |
| 7 | 首音前 HTTP 返回 JSON 503；响应开始后，SSE 发 error，raw 响应流提前结束。 | 10 | 0 | 2 | 24 | 0 |
| 8 | 关闭会清掉队列和积压，但 abort 消息没送到时，工作记录可能继续占住流 ID。 | 10 | 0 | 2 | 24 | 0 |
| 合计 |  | **80/80** | **0/16** | **16/16（待复审）** | **192/192** | **0** |

## 八步动画

- 第 1 步：10 秒声音先全部等待；读者取走 4 秒后，条形图留下 6 秒，再显示标签和 `576,000 B` 算式。卡片和条形图使用同一相位，标签在缩放结束后出现。
- 第 2 步：流 A 的 6 B、流 B 的 10 B 依次计入共享总量；灰色文字不计入。
- 第 3 步：左图读取后变成 4 B、idle 0 s；右图新增后变成 12 B、idle 仍为 2 s。
- 第 4 步：先新增 4 B 超过 12 B 上限，再让最久没读的 `req-idle` 失败，扣掉 4 B 后回到 12 B。
- 第 5 步：三幅面板依次显示 16 B、14 B、10 B；`req-oldest` 和 `req-older` 依次失败，最后显示两个失败流。
- 第 6 步：运行中面板先发生整流失败，再显示 abort；已完成面板随后发生同一失败，显示没有生成器可中止。
- 第 7 步：首音前 JSON 503 保持在舞台上，随后依次出现 SSE error 和 raw 响应流提前结束。
- 第 8 步：提前关闭先把 12 B 清为 0 B，再显示 ID 可能保留；上限失败案例随后释放错误队列，也显示 ID 可能保留。

每步循环播放并在末相位停留。`prefers-reduced-motion: reduce` 直接显示完成场景；切换步骤会取消旧的 `requestAnimationFrame`。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页，通过。
- `WAIT=6000 BOOK=omni ONLY=14 npm run transcript -- http://localhost:4325/learning-sglang`：8 步，无布局问题；生成文件已提交。
- `BOOK=omni ONLY=14 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=14 npm run mobile -- http://localhost:4325/learning-sglang`：英文 360、390、430 px 全章通过；第 1 步修改后单独复跑通过。
- 中文第 1–8 步分别运行 `BOOK=omni ONLY=14 STEP=M LANG=zh npm run mobile -- http://localhost:4325/learning-sglang`：三种宽度均通过布局和字号硬门；第 1 步修改后单独复跑通过。
- `WAIT=6000 BASE=http://localhost:4325/learning-sglang BOOK=omni ONLY=14 node scripts/zh-check.mjs .bot/out/omni14-motion/zh-check`：8 步通过。
- `BOOK=omni node scripts/deep-check.mjs 14`：通过。
- `node .astro/check-omni14-motion.mjs`：八步依次检测到 **4/4/4/3/4/5/3/5** 个 held states；每步最终机制文字齐全，`LoopProgress`、循环重启、caption／ARIA 一致均通过。第 1 步另检初始 10 秒排队、0 秒读取和标签延迟，均通过。结果在 `.bot/out/omni14-motion/dom-check.json`。
- `git diff --check`：通过。

截图在 `.bot/out/omni14-motion/`：`early-en/`、`mid-en/`、`final-en/`、`final-zh/`、`phone-zh/` 各 8 张，共 40 张。当前模型返回 `Cannot read image`，因此本轮不给新增 PNG 视觉分，也不把 DOM 相位检查当作主人视觉验收。

未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、模型或 GPU benchmark。代码出处仍固定到 `sglang-omni origin/main@9725235249df851281d4dc62a04b2d34b02ac0fe`。

动画源码提交：`6b2e42a…cbdb0f5`；第 1 步相位修正：`58c960c`；生成 transcript：`03f9b8d`。均已推送到 `origin/tutorials`。
