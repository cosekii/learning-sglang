# 第 15 章评分卡 · Choose a compatible worker

日期：2026-11-26。

## 协调基线与本轮边界

协调人对 `1422caf…bc9e4e8` 的结论是 R1–R5 **76/80**、原 #1–#3、#7–#12 合计 **138/144**。R6 和原 #4–#6 没有完整总分，不能沿用满分或零视觉洞结论。

本轮修复第 4、6、7、8 步的五组返工。独立冷读首轮关闭其中四组，并指出英文第 4 步仍漏 `HTTP`；补齐后，该冷读结论支持 R1–R5 **80/80**、原十个非视觉项 **144/144**。这些是 lane 的待协调复审结果，不覆盖协调基线。

组件仍只有响应式 `matchMedia`，没有 phase、tween、timer 或 `requestAnimationFrame`。按 EVAL §6，机制 R6 为 **0/16**。本轮没有新增动画，也不记 `complete-under-EVAL`。协调内容复审、动画返工和主人视觉验收仍待。

## 逐步评分

协调没有给出逐步扣分分布，表内只记本轮冷读结果，不伪造逐步协调分。

| 步 | R1 小学生复述 | 本轮 R1–R5 /10 | 机制 R6 /2 | 本轮原非视觉项 /18 | 原 #4–#6 | 未决内容洞 |
|---|---|---:|---:|---:|---|---:|
| 1 | 两个 worker 共用网址，但只有兼容的 worker 能接收这个图片请求。 | 10 | 0 | 18 | 未全评 | 0 |
| 2 | worker 能力相同时可跳过请求体分类，不同则先读路由事实。 | 10 | 0 | 18 | 未全评 | 0 |
| 3 | 同一个 profile 行必须满足整个请求，不能跨行拼能力。 | 10 | 0 | 18 | 未全评 | 0 |
| 4 | 连续 2 次成功转为 healthy，连续 3 次失败转为 unhealthy。 | 10 | 0 | 18 | 未全评 | 0 |
| 5 | round robin 只按顺序轮换，不比较活跃请求数。 | 10 | 0 | 18 | 未全评 | 0 |
| 6 | 同一顺序和负载下，round robin 选 A，least requests 选 B。 | 10 | 0 | 18 | 未全评 | 0 |
| 7 | RequestLease 持有活跃数 +1，响应结束、出错或取消时收回。 | 10 | 0 | 18 | 未全评 | 0 |
| 8 | 新例子里 C 被选中后故障，router 不会把这个响应转到 B 重试。 | 10 | 0 | 18 | 未全评 | 0 |
| 合计 |  | **80/80（待复审）** | **0/16** | **144/144（待复审）** | 未全评 | **0** |

## 五组返工

- **第 4 步健康判断**：舞台和双语深入讲解写明 `2xx = HTTP status 200–299`，以及 timeout 是超过探测期限仍无回应。其他状态、传输错误和 timeout 都算失败。
- **第 6 步策略对照**：在同一初始顺序 `[A,B,C]` 和负载 `[2,0,0]` 下，round robin 选 A，least requests 选 B。手机拆成两行，没有新增面板。
- **第 7 步 RequestLease**：改成「持有活跃数 +1 的凭证，响应结束、出错或取消时收回」。舞台脚注解释 `dispatch = send to the worker`、`EOF = response end`。speech batch 的 credit 加权只留在正文和深入讲解。
- **第 8 步例子承接**：舞台标明 `New example · constructed loads`。MDX 和双语深入讲解明确它不接第 6 步的 2、2、2，也不接第 7 步的新单个请求。
- **第 8 步退出措辞**：英文改成 `worker failure and graceful exit`，深入讲解说明 worker 完成现有工作后退出，不再首次出现未解释的 `drain`。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页，通过。
- `BOOK=omni ONLY=15 npm run transcript -- http://localhost:4325/learning-sglang`：8 步，无布局问题；生成文件已提交。
- `BOOK=omni ONLY=15 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=15 npm run mobile -- http://localhost:4325/learning-sglang`：英文 360、390、430 px 全章通过。
- 中文第 4、6、7、8 步分别运行 `BOOK=omni ONLY=15 STEP=M LANG=zh npm run mobile -- http://localhost:4325/learning-sglang`：三种宽度均通过布局和字号硬门；第 4 步补 `HTTP` 后复跑通过。
- `BASE=http://localhost:4325/learning-sglang BOOK=omni ONLY=15 node scripts/zh-check.mjs .bot/out/omni15/zh-check`：8 步通过。
- `BOOK=omni node scripts/deep-check.mjs 15`：通过。
- `git diff --check`：通过。

截图在 `.bot/out/omni15/`：`final-en/`、`final-zh/`、`phone-zh/` 各 8 张舞台图，`deep-en/`、`deep-zh/` 各 4 张深入讲解图，共 32 张。当前模型返回 `Cannot read image`，本轮不给新增 PNG 视觉分，也不把机械检查当作主人视觉验收。

未跑全站回归、真实 router、模型、GPU benchmark 或故障注入。代码出处仍固定到 `sglang-omni origin/main@3a31bd72e034db37ce5115a03dd4827b449683be`。

源码提交：`6fb3c27`（第 4 步）、`53fc3ca`（第 6 步）、`6222556`（第 7 步）、`6e37970`（第 8 步）、`189e02b`（第 4 步补齐 `HTTP` 和生成 transcript），均已推送到 `origin/tutorials`。
