# 第 15 章评分卡 · Choose a compatible worker

日期：2026-11-26。

## 协调基线与本轮边界

- 协调内容与已读静态视图 GO：R1–R5 **80/80**、原十个非视觉项 **160/160**、静态场景 R6 **16/16**、静态原 #4/#5 **32/32**、原十二项 **192/192**。
- 协调对 `2849014` 的最新机制 verdict 为 **14/16**，逐步 **1、2、2、2、2、1、2、2**。第 1 步没有逐步排除 A，第 6 步没有把 recency、并列处理和 active 更新连成机制过程。`78e172c` 错记的历史 **0/16** 不再使用。
- 本轮只返工第 1、6 步及记录。作者与独立只读 reviewer 完成了这两步的源码、transcript 和 live DOM 复核；reviewer 先检出手机 dispatch 指向 A 的问题，修复后复评通过。该结果不是机制分、不是协调 verdict，也不是 EVAL §6 硬门通过证据。
- 当前模型和 reviewer 都不能读取 PNG。相位图已生成，但 PNG 冷读和主人最终视觉验收未完成，因此不记 `complete-under-EVAL`，不改协调分。

## 逐步评分

「协调机制 R6」保留 `2849014` 的独立评审。「本轮非视觉参考」只是作者与独立只读 reviewer 的自查记录，不是硬门分数或通过证据，且不包含 PNG 冷读。

| 步 | R1 小学生复述 | 协调 R1–R5 /10 | 协调静态 R6 /2 | 协调机制 R6 /2 | 本轮非视觉参考 /2 | 协调原分 /24 | 未决内容洞 |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 先排除不能收图片的 A，再确认 B 能收，才把请求发给 B。 | 10 | 2 | 1 | 2 | 24 | 0 |
| 2 | worker 能力相同时可跳过请求体分类，不同则先读路由事实。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 3 | 同一个 profile 行必须满足整个请求，不能跨行拼能力。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 4 | 连续 2 次成功转为 healthy，连续 3 次失败转为 unhealthy。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 5 | round robin 只按顺序轮换，不比较活跃请求数。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 6 | 先找活跃数最少，并列时按顺序选，再把被选 worker 加一并移到队尾。 | 10 | 2 | 1 | 2 | 24 | 0 |
| 7 | RequestLease 持有活跃数 +1，响应结束、出错或取消时收回。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 8 | 新例子里 C 被选中后故障，router 不会把这个响应转到 B 重试。 | 10 | 2 | 2 | 2 | 24 | 0 |
| 合计 |  | **80/80** | **16/16** | **14/16** | **16/16（仅自查，非硬门）** | **192/192** | **0** |

## 本轮关闭的返工项

- **第 1 步兼容性过滤**：四个 held phases 依次显示两个未检查候选、图片检查排除 A、图片检查接受 B、dispatch 到 B。头部在 phase 0、1 分别写 `2 to check`、`1 to check`，phase 2 接受 B 后才写 `1 compatible`。手机路径从请求右侧绕到 B。
- **第 6 步 least-requests 机制**：每个请求分选择、更新两个 held phases。组件由当前 active 数计算最小值和并列集合，按 recency 扫描得出选择，再显示被选 worker 的 `before→after` 和 recency 队尾更新。四次得到 B、C、B、C。独立轮换例用 active `[2,1,1]` 和 recency `[A,C,B]`，让 C 在 B、C 并列 1 时获胜，保留原策略对照行。
- **记录基线**：协调分恢复为 **14/16**。非视觉参考列与协调机制分分开，不作为硬门通过证据，也不再写历史 0 分或作者满分。

## 既有五组内容返工

- **第 4 步健康判断**：`2xx = HTTP status 200–299`；timeout 是超过探测期限仍无回应。
- **第 6 步策略对照**：同一初始顺序 `[A,B,C]` 和负载 `[2,0,0]` 下，round robin 选 A，least requests 选 B。
- **第 7 步 RequestLease**：持有活跃数 +1，响应结束、出错或取消时收回。
- **第 8 步例子承接**：明确是构造负载的新例子，不冒充第 6 或第 7 步的后续。
- **第 8 步退出措辞**：英文使用 `worker failure and graceful exit`，不使用未解释的 `drain`。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页通过。忽略的本地配置只隔离 Vite cache 并允许 shared `node_modules` 符号链接。
- 本章默认 `transcript`：8 步，无 caption、出界、重叠或脚注问题；最终生成文件已提交。`BOOK=omni ONLY=15 npm run readability`：8 步，0 机械问题。`BOOK=omni node scripts/deep-check.mjs 15`：通过。
- 英中全章 `mobile`：360／390／430 px 均通过；中文第 1、6 步分别复跑字号门也通过。`WAIT=13000` 的本章 `zh-check` 通过。并行 lane 占用共享端口时，忽略的 `.astro/run-with-cdp-port.mjs` 只替换 CDP 端口，共享检查脚本未改。
- 第 1 步 4 相和第 6 步 11 相均逐相核对 live SVG 文本、状态与几何。英文桌面和中文 390 px 手机共 **30 张**相位 PNG，未发现文字出界、重叠或低于 10 CSS px；图在 `.bot/out/omni15-k1-step1/` 和 `.bot/out/omni15-k1-step6/`。
- 独立只读 reviewer 对两项后续加强均给出源码、transcript 和 live DOM GO：phase 1 不再提前写 compatible，独立轮换并列由 C 获胜。结论只覆盖指定修复，不换算成机制分。
- 第 1、6 步英中深入讲解有 4 张图在 `.bot/out/omni15-k1-deep/`，本章 `zh-check` 图在 `.bot/out/omni15-k1-zh-check/`。两次补跑抽屉 DOM 检查时 Chrome 未能启动，未把这两次计为通过；新增文本已由 build、deep-check 和 reviewer 文本复核。
- `git diff --check`：通过。一次 transcript 本地运行出现 unsettled await 且没有写出结果，换新 CDP 端口后完整重跑通过，未把首次结果计为通过。

## 提交与剩余

- 教程提交：`ed092b5`、`e128beb`、`8c8ccfa`、`540c9e0`（计数相位）、`cc1377b`（轮换并列例）。均已推 `origin/tutorials`；被拒后均按要求 rebase 再推，没有 force-push。
- 剩余：具备图像输入的评审需读取 `.bot/out/omni15-k1-step1/{en,zh-phone}-p0..3.png` 和 `.bot/out/omni15-k1-step6/{en,zh-phone}-p0..10.png`，再由协调人更新正式机制 verdict。复审前不开第 16 章。
- 未跑全站回归、真实 router、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。代码出处仍固定到 `sglang-omni origin/main@3a31bd72e034db37ce5115a03dd4827b449683be`。
