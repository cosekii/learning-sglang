# 第 15 章评分卡 · Choose a compatible worker

日期：2026-11-26。

## 协调基线与本轮边界

协调人对 `6fb3c27…31c5e08` 的内容和已读静态视图结论为 GO：R1–R5 **80/80**，原十个非视觉项 **160/160**，静态场景 R6 **16/16**，静态原 #4/#5 **32/32**，原十二项 **192/192**。当时组件没有机制动画，按 EVAL §6 的机制 R6 为 **0/16**。

`728833f…2849014` 已给八步加入 RAF 相位和循环条。本轮独立源码冷读未发现新的事实回退，源码层面支持机制 R6 **16/16**；DOM 检查确认英中、桌面和手机共 85 个采样相位都有预期的内容状态变化。本轮另修复英文手机第 8 步第二行收尾问题误用中文的问题（`24338ba`）。

当前模型不能读取 PNG，因此本轮机制 R6 仍记为 **16/16（源码和 DOM 证据，待协调读图）**，不记 `complete-under-EVAL`。静态场景 R6 不代替机制动画评审。

## 逐步评分

「本轮机制 R6」依据当前组件、独立源码冷读和 DOM 相位检查，仍待协调人读取相位实图。

| 步 | R1 小学生复述 | 协调 R1–R5 /10 | 协调静态 R6 /2 | 本轮机制 R6 /2 | 协调原分 /24 | 未决内容洞 |
|---|---|---:|---:|---:|---:|---:|
| 1 | 两个 worker 共用网址，但只有兼容的 worker 能接收这个图片请求。 | 10 | 2 | 2 | 24 | 0 |
| 2 | worker 能力相同时可跳过请求体分类，不同则先读路由事实。 | 10 | 2 | 2 | 24 | 0 |
| 3 | 同一个 profile 行必须满足整个请求，不能跨行拼能力。 | 10 | 2 | 2 | 24 | 0 |
| 4 | 连续 2 次成功转为 healthy，连续 3 次失败转为 unhealthy。 | 10 | 2 | 2 | 24 | 0 |
| 5 | round robin 只按顺序轮换，不比较活跃请求数。 | 10 | 2 | 2 | 24 | 0 |
| 6 | 同一顺序和负载下，round robin 选 A，least requests 选 B。 | 10 | 2 | 2 | 24 | 0 |
| 7 | RequestLease 持有活跃数 +1，响应结束、出错或取消时收回。 | 10 | 2 | 2 | 24 | 0 |
| 8 | 新例子里 C 被选中后故障，router 不会把这个响应转到 B 重试。 | 10 | 2 | 2 | 24 | 0 |
| 合计 |  | **80/80** | **16/16** | **16/16（待读图）** | **192/192** | **0** |

## 五组返工

- **第 4 步健康判断**：舞台和双语深入讲解写明 `2xx = HTTP status 200–299`，以及 timeout 是超过探测期限仍无回应。其他状态、传输错误和 timeout 都算失败。
- **第 6 步策略对照**：在同一初始顺序 `[A,B,C]` 和负载 `[2,0,0]` 下，round robin 选 A，least requests 选 B。
- **第 7 步 RequestLease**：持有活跃数 +1，响应结束、出错或取消时收回。`dispatch = send to the worker`，`EOF = response end`。speech batch 的 credit 加权只留在正文和深入讲解。
- **第 8 步例子承接**：舞台标明 `New example · constructed loads`，不冒充第 6 步或第 7 步的后续负载。
- **第 8 步退出措辞**：英文使用 `worker failure and graceful exit`，不再首次出现未解释的 `drain`。

## 八步动画

- 第 1 步：B 的接收路径和高亮随后出现，演示兼容性过滤后选择 B。
- 第 2 步：direct 先确定共同契约再选择；classified 随后读取请求体、确定路由事实再选择。
- 第 3 步：依次检查 A 的两行并得到 `0 + 0 = 0`，再显示 B 的完整匹配行和 `1`。
- 第 4 步：两个 `200` 依次到达 `HEALTHY`；`503 → timeout → 503` 依次到达 `UNHEALTHY`。
- 第 5 步：六个请求依次出现为 `A → B → C → A → B → C`，对应的最近使用顺序行同步获得焦点。
- 第 6 步：四行负载和选择依次出现为 `B → C → B → C`，最后显示同状态下 round robin 选 A 的对照。
- 第 7 步：`SELECT → UPLOAD → HEADERS → RELEASE` 依次推进，活跃数为 `0→1 → 1 → 1 → 1→0`。
- 第 8 步：先选择 C 并把活跃数加到 2，再出现 `200 OK`、`data: one`、`RESET` 和「不在 B 重试」。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页，通过。
- `WAIT=1500 BOOK=omni ONLY=15 npm run transcript -- http://localhost:4322/learning-sglang`：8 步，无布局问题；生成文件与已提交 transcript 一致。
- `BOOK=omni ONLY=15 npm run readability`：8 步，0 机械问题。
- `BOOK=omni ONLY=15 npm run mobile -- http://localhost:4322/learning-sglang`：英文全章在 360、390、430 px 通过。
- 中文第 1–8 步分别运行 `BOOK=omni ONLY=15 STEP=N LANG=zh npm run mobile -- http://localhost:4322/learning-sglang`：三种宽度的布局和字号硬门均通过。
- `WAIT=1500 BASE=http://localhost:4322/learning-sglang BOOK=omni ONLY=15 node scripts/zh-check.mjs .bot/out/omni15-review/zh-check`：8 步通过。
- `BOOK=omni node scripts/deep-check.mjs 15`：通过。
- 独立只读源码冷读：五组已关闭内容项未回退；八步源码机制分均为 2/2；检出英文手机第 8 步的一行固定中文，已由 `24338ba` 修复。
- `node .astro/check-omni15.mjs`：英文桌面 40 个相位、英文手机第 8 步 5 个相位、中文手机 40 个相位均得到预期数量的不同 SVG 内容状态；英文场景无汉字，英文手机收尾问题完整。结果在 `.bot/out/omni15-review/phase-check.json`。
- `git diff --check`：通过。

相位截图在 `.bot/out/omni15-review/`：英文桌面 40 张、中文手机 16 张、英文手机第 8 步 1 张，共 **57 张**；另有 16 张接触表。当前模型不能读取 PNG，不把文件存在、DOM 断言或机械门当作已读实图。协调读图和主人最终视觉验收仍待。

未跑全站回归、真实 router、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。代码出处仍固定到 `sglang-omni origin/main@3a31bd72e034db37ce5115a03dd4827b449683be`。

动画源码提交：`728833f`、`03d53fd`、`76e7b76`、`c39f3ce`、`b92a01c`、`b010323`、`a1e1736`、`2849014`。英文手机修复：`24338ba`。均已推送到 `origin/tutorials`。
