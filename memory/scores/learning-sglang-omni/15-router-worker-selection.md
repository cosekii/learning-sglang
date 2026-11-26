# 第 15 章评分卡 · Choose a compatible worker

日期：2026-11-26。

## 协调基线与本轮边界

- 协调内容与已读静态视图 GO：R1–R5 **80/80**、原十个非视觉项 **160/160**、静态场景 R6 **16/16**、静态原 #4/#5 **32/32**、原十二项 **192/192**。
- 协调对 `2849014` 的最新机制 verdict 为 **14/16**，逐步 **1、2、2、2、2、1、2、2**。第 1 步没有逐步排除 A，第 6 步没有把 recency、并列处理和 active 更新连成机制过程。`78e172c` 错记的历史 **0/16** 不再使用。
- 本轮只返工第 1、6 步及记录。作者与独立只读 reviewer 对当前源码、transcript 和 live DOM 的复评支持八步机制 **16/16**；reviewer 先检出手机 dispatch 指向 A 的问题，修复后复评通过。此分不是协调 verdict。
- 当前模型和 reviewer 都不能读取 PNG。相位图已生成，但 PNG 冷读和主人最终视觉验收未完成，因此不记 `complete-under-EVAL`，不改协调分。

## 逐步评分

「协调机制 R6」保留 `2849014` 的独立评审；「本轮源码＋DOM」是当前返工的作者与独立只读 reviewer 复评，均不包含 PNG 冷读。

| 步 | R1 小学生复述 | 协调 R1–R5 /10 | 协调静态 R6 /2 | 协调机制 R6 /2 | 本轮源码＋DOM /2 | 协调原分 /24 | 未决内容洞 |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 先排除不能收图片的 A，再确认 B 能收，才把请求发给 B。 | 10 | 2 | 1 | 2 | 24 | 0 |
| 2 | worker 能力相同时可跳过请求体分类，不同则先读路由事实。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 3 | 同一个 profile 行必须满足整个请求，不能跨行拼能力。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 4 | 连续 2 次成功转为 healthy，连续 3 次失败转为 unhealthy。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 5 | round robin 只按顺序轮换，不比较活跃请求数。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 6 | 先找活跃数最少，并列时按顺序选，再把被选 worker 加一并移到队尾。 | 10 | 2 | 1 | 2 | 24 | 0 |
| 7 | RequestLease 持有活跃数 +1，响应结束、出错或取消时收回。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 8 | 新例子里 C 被选中后故障，router 不会把这个响应转到 B 重试。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 合计 |  | **80/80** | **16/16** | **14/16** | **16/16（待 PNG 冷读）** | **192/192** | **0** |

## 本轮关闭的返工项

- **第 1 步兼容性过滤**：四个 held phases 依次显示两个未检查候选、图片检查排除 A、图片检查接受 B、dispatch 到 B。最终候选数由输入状态更新，不再开场就显示过滤结果。手机路径从请求右侧绕到 B，reviewer 指出的旧箭头进入 A 的问题已修复。
- **第 6 步 least-requests 机制**：每个请求分选择、更新两个 held phases。组件由当前 active 数计算最小值和并列集合，按 recency 扫描得出选择，再显示被选 worker 的 `before→after` 和 recency 队尾更新。四次得到 B、C、B、C，后续行使用前一行的更新值。
- **记录基线**：协调分恢复为 **14/16**，与本轮源码＋DOM 自评分列；不再写历史 0 分或把作者满分当协调结果。

## 既有五组内容返工

- **第 4 步健康判断**：`2xx = HTTP status 200–299`；timeout 是超过探测期限仍无回应。
- **第 6 步策略对照**：同一初始顺序 `[A,B,C]` 和负载 `[2,0,0]` 下，round robin 选 A，least requests 选 B。
- **第 7 步 RequestLease**：持有活跃数 +1，响应结束、出错或取消时收回。
- **第 8 步例子承接**：明确是构造负载的新例子，不冒充第 6 或第 7 步的后续。
- **第 8 步退出措辞**：英文使用 `worker failure and graceful exit`，不使用未解释的 `drain`。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页通过。忽略的本地配置只隔离 Vite cache 并允许 shared `node_modules` 符号链接。
- 本章默认 `transcript`：8 步，无 caption、出界、重叠或脚注问题；最终生成文件已提交。`BOOK=omni ONLY=15 npm run readability`：8 步，0 机械问题。`BOOK=omni node scripts/deep-check.mjs 15`：通过。
- 英中全章 `mobile`：360／390／430 px 均通过；中文第 1、6 步分别复跑字号门也通过。`WAIT=11000` 的本章 `zh-check` 通过。并行 lane 占用共享端口时，忽略的 `.astro/run-with-cdp-port.mjs` 只替换 CDP 端口，共享检查脚本未改。
- 第 1 步 4 相和第 6 步 10 相均逐相核对 live SVG 文本、状态与几何。英文桌面和中文 390 px 手机共 **28 张**相位 PNG，未发现文字出界、重叠或低于 10 CSS px；图在 `.bot/out/omni15-k1-step1/` 和 `.bot/out/omni15-k1-step6/`。
- 独立只读 reviewer 复核第 1、6 步：第 6 步直接 GO；第 1 步先因手机 dispatch 指向 A 而 NO-GO，修复后 GO。两次结论都仅限源码、transcript 和 live DOM。
- 第 1、6 步英中深入讲解抽屉均无横向溢出或 KaTeX 错误；4 张图在 `.bot/out/omni15-k1-deep/`。本章 `zh-check` 图在 `.bot/out/omni15-k1-zh-check/`。
- `git diff --check`：通过。一次 transcript 本地运行出现 unsettled await 且没有写出结果，换新 CDP 端口后完整重跑通过，未把首次结果计为通过。

## 提交与剩余

- 教程提交：`ed092b5`（第 1 步过滤机制）、`e128beb`（第 6 步选择机制）、`8c8ccfa`（手机 dispatch 目标）。均已推 `origin/tutorials`；被拒后均按要求 rebase 再推，没有 force-push。
- 剩余：协调人读取新相位 PNG 并更新正式机制 verdict，主人最终视觉验收另计。复审前不开第 16 章。
- 未跑全站回归、真实 router、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。代码出处仍固定到 `sglang-omni origin/main@3a31bd72e034db37ce5115a03dd4827b449683be`。
