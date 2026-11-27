# 第 14 章评分卡 · When the client reads too slowly

日期：2026-11-27。

## 协调基线与本轮边界

协调人对 `5e92976…6e190ef` 的内容结论是：R1–R5 **80/80**，原十个非视觉项 **160/160**，静态原 #4/#5 **32/32**，原十二项 **192/192**。当时八步都没有机制动画，机制 R6 为 **0/16**。

协调人随后复审 `d1a9278…cbdb0f5`，把机制 R6 改为 **14/16**。`58c960c…955e518` 关闭第 1 步的开场状态矛盾和八处 transcript 差异后，机制 R6 升为 **15/16**。

协调人复审 `bfc6517…0f4cba0`，确认第 6 步失败框已从 `12 B queued audio` 改为 `12 B → 0 B`，并保留两种条件中止路径。机制 R6 保持 **16/16**，八步均 **2/2**；R1–R5 **80/80**、原十个非视觉项 **160/160**、静态原 #4/#5 **32/32**、原十二项 **192/192** 只作历史基线。

**当前协调 verdict：呈现 NO-GO / coordinator-rereview-pending。** 送审前 1440×900 下 Step 2 实测最低 **7.59 CSS px**，报告还列 Step 4、5、8 低于 8 px。旧 `complete-under-EVAL` 和静态视觉满分撤回，已经通过的机制动画不回滚。

本轮作者已逐步完成桌面字号返工。34 个 1440×900 相位最低 **10.326 CSS px**，文字重叠和 SVG 出界均为 **0**；各步最低值依次为 **11.064、10.630、10.826、10.561、10.630、10.580、10.891、10.326**。相位身份、文本数量和转变模式与返工前逐项一致，caption、事实、机制相位和手机布局未改。这是作者 DOM 结果，不自行关闭 Omni-02 的本章部分或改写协调总分。

## 逐步评分

| 步 | R1 小学生复述 | 历史协调 R1–R5 /10 | 协调机制 R6 /2 | 历史协调原分 /24 | 未决内容洞 |
|---|---|---:|---:|---:|---:|
| 1 | 生成比播放快，读者取走 4 秒后，6 秒未读声音还留在 API 进程。 | 10 | 2 | 24 | 0 |
| 2 | 一个 API 进程把各流的消息字节加在一起限额，文字不计入。 | 10 | 2 | 24 | 0 |
| 3 | 读者取走消息会把空闲钟归零，生成新消息不会。 | 10 | 2 | 24 | 0 |
| 4 | 总量超限后，最久没读的流先失败，不是积压最大的流先失败。 | 10 | 2 | 24 | 0 |
| 5 | 两路老流依次失败，总量才回到上限以内。 | 10 | 2 | 24 | 0 |
| 6 | 超过上限会让整条流失败，只有还在生成时才中止生成。 | 10 | 2 | 24 | 0 |
| 7 | 首音前 HTTP 返回 JSON 503；响应开始后，SSE 发 error，raw 响应流提前结束。 | 10 | 2 | 24 | 0 |
| 8 | 关闭会清掉队列和积压，但 abort 消息没送到时，工作记录可能继续占住流 ID。 | 10 | 2 | 24 | 0 |
| 合计 |  | **80/80** | **16/16** | **192/192** | **0** |

第 1／6 步的 R6 未决项均已由协调人读取相位实图后关闭。

## 八步动画

- 第 1 步：10 秒声音先全部等待；读者取走 4 秒后，条形图留下 6 秒，再显示标签和 `576,000 B` 算式。卡片和条形图使用同一相位，标签在缩放结束后出现。
- 第 2 步：流 A 的 6 B、流 B 的 10 B 依次计入共享总量；灰色文字不计入。
- 第 3 步：左图读取后变成 4 B、idle 0 s；右图新增后变成 12 B、idle 仍为 2 s。
- 第 4 步：先新增 4 B 超过 12 B 上限，再让最久没读的 `req-idle` 失败，扣掉 4 B 后回到 12 B。
- 第 5 步：三幅面板依次显示 16 B、14 B、10 B；`req-oldest` 和 `req-older` 依次失败，最后显示两个失败流。
- 第 6 步：运行中面板先把排队声音从 12 B 清为 0 B，再显示 abort；已完成面板随后发生同一失败，显示没有生成器可中止。
- 第 7 步：首音前 JSON 503 保持在舞台上，随后依次出现 SSE error 和 raw 响应流提前结束。
- 第 8 步：提前关闭先把 12 B 清为 0 B，再显示 ID 可能保留；上限失败案例随后释放错误队列，也显示 ID 可能保留。

每步循环播放并在末相位停留。`prefers-reduced-motion: reduce` 直接显示完成场景；切换步骤会取消旧的 `requestAnimationFrame`。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页，通过。
- `WAIT=6000 BOOK=omni ONLY=14 npm run transcript -- http://localhost:4325/learning-sglang`：8 步，无布局问题；生成文件已提交。
- `BOOK=omni ONLY=14 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=14 npm run mobile -- http://localhost:4325/learning-sglang`：英文全章在 360、390、430 px 通过。
- `BOOK=omni ONLY=14 STEP=1 LANG=zh npm run mobile -- http://localhost:4325/learning-sglang` 和 `STEP=6`：360、390、430 px 的布局和字号门均通过。
- `WAIT=6000 BASE=http://localhost:4325/learning-sglang BOOK=omni ONLY=14 node scripts/zh-check.mjs .bot/out/omni14-review/zh-check`：8 步通过。
- `BOOK=omni node scripts/deep-check.mjs 14`：通过。
- `node .astro/check-omni14.mjs`：第 1 步依次显示 10 秒等待、4 秒已读／6 秒等待、标签和算式；第 6 步依次显示两个 12 B 初始框、运行中面板 `12 B → 0 B`、两个清零框和两种条件中止。结果在 `.bot/out/omni14-review/phase-check.json`。
- 独立只读冷读：第 1／6 步没有剩余文本或 DOM 事实阻塞。协调人随后在 `bfc6517…0f4cba0` 的相位实图中确认两项修复，机制 R6 为 **16/16**。
- 协调人在固定 `0f4cba0` 快照完成 60 页 `build`、8 步 `readability`、`deep-check 14`、pinned-identical `transcript`、英中全章 360/390/430 px `mobile`、中文第 1／6 步字号门和 `zh-check`，全部通过；另读取英文第 6 步五个相位及中文手机第 1／2／4 相位，共 8 张新 PNG。
- `git diff --check`：通过。
- 本轮最终 `npm run build`：60 页通过；八步 `readability` 为 0 机械问题；英中全章 360／390／430 px `mobile`、中文逐步字号门、`deep-check 14`、`zh-check` 和 `git diff --check` 均通过。
- 默认 transcript 连续两次逐字一致并与 pinned 无差异：**2,302 词**，SHA-256 `070b24bc84a94f1c76e362db7d4f3f16e0b49b9ba1f95876f3dc98e897c458ba`。
- 可重跑脚本 `.bot/out/omni14-phase-audit.mjs` 覆盖 **34 个桌面相位**，报告为 `.bot/out/omni14-phase-audit/report.json`，代表图为 `.bot/out/omni14-phase-audit/s2-p3.png`。当前模型不能读取 PNG，未声称已看图或视觉通过；协调实图复审和主人最终验收另计。

本地截图在 `.bot/out/omni14-review/`。协调评审证据目录为 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-coord-20261126-omni14-0f4.WHQpnJ/`。本卡采用协调人已读实图的评分，不代替主人最终验收。

未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、模型或 GPU benchmark。代码出处仍固定到 `sglang-omni origin/main@9725235249df851281d4dc62a04b2d34b02ac0fe`。

动画源码提交：`6b2e42a…cbdb0f5`；第 1 步相位修正：`58c960c`；生成 transcript：`03f9b8d`；第 6 步失败状态修复：`bfc6517`。均已推送到 `origin/tutorials`。
