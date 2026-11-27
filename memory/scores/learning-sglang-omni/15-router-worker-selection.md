# 第 15 章评分卡 · Choose a compatible worker

日期：2026-11-26。

## 协调基线与本轮边界

- 协调对原八步的内容与已读静态视图 GO：R1–R5 **80/80**、原十个非视觉项 **160/160**、静态 R6 **16/16**、原 #4/#5 **32/32**、原十二项 **192/192**。
- 协调对原八步的机制 R6 为 **16/16**，八步均 **2/2**。`ed092b5` 已关闭第 1 步候选排除，`e128beb` 已关闭第 6 步并列选择、active 和 recency 更新。旧 **14/16** 和 **0/16** 不再作为当前基线。
- 本轮在原第 8 步前新增服务路由地图，原第 8 步成为第 9 步。新增第 8 步、第 9 步 RESET 释放和全书收尾尚未取得协调 verdict。非视觉自查不换算成协调分，不记当前九步总分或 `complete-under-EVAL`。
- 当前模型不能读取 PNG。截图和 DOM 证据不冒充图像冷读或主人最终视觉验收。

## 逐步评分

「本轮非视觉复核」只覆盖源码、transcript 和 live DOM。原第 8 步的协调分随原步骤保留，不表示修订后的第 9 步已复审。

| 步 | R1 小学生复述 | 协调 R1–R5 /10 | 协调机制 R6 /2 | 本轮非视觉复核 | 协调原分 /24 | 未决内容洞 |
|---|---|---:|---:|---|---:|---:|
| 1 | 先排除不能收图片的 A，再确认 B 能收，才把请求发给 B。 | 10 | 2 | 已关闭项，不重做 | 24 | 0 |
| 2 | worker 能力相同时可跳过请求体分类，不同则先读路由事实。 | 10 | 2 | 已关闭项，不重做 | 24 | 0 |
| 3 | 同一个 profile 行必须满足整个请求，不能跨行拼能力。 | 10 | 2 | 已关闭项，不重做 | 24 | 0 |
| 4 | 连续 2 次成功转为 healthy，连续 3 次失败转为 unhealthy。 | 10 | 2 | 已关闭项，不重做 | 24 | 0 |
| 5 | round robin 只按顺序轮换，不比较活跃请求数。 | 10 | 2 | 已关闭项，不重做 | 24 | 0 |
| 6 | 先找活跃数最少，并列时按顺序选，再把被选 worker 加一并移到队尾。 | 10 | 2 | 已关闭项，不重做 | 24 | 0 |
| 7 | RequestLease 持有活跃数 +1，响应结束、出错或取消时收回。 | 10 | 2 | 已关闭项，不重做 | 24 | 0 |
| 8 | A 活跃数更少但 session 已满，所以 router 改选还有空槽位的 B。 | —（新增） | —（新增） | R1–R5 10/10；机制 2/2；原非视觉项 20/20 | — | 0（文本） |
| 9 | C 选中后故障，响应不转到 B；RESET 把 C 的活跃数从 2 降到 1。 | 10（原第 8 步） | 2（原第 8 步） | RESET 释放 2/2；收尾文本 10/10 | 24（原第 8 步） | 0（文本） |
| 原八步合计 |  | **80/80** | **16/16** | 不合计为当前协调分 | **192/192** | **0** |

## 本轮处理的四组 review 项

- **RESET 后 lease 释放**：第 9 步新增第六相，显示 `RESET: lease released · active 2 → 1`。live DOM 在 phase 2 测得该文字 opacity `0.12`，phase 5 为 `1`，不再只写清理结论。
- **桌面小字**：`loops` 与脚注桌面字号提高到 13px，手机保持原字号。1440×900 下九步末相所有可见 SVG 文字均不低于 10 CSS px，全书最小值为第 6 步 **10.3295 CSS px**。
- **ServiceClass／固定 owner／session capacity**：新增第 8 步地图，覆盖四种普通 HTTP、两种 WebSocket session、uploaded-voice owner 和 pinned follow-up。构造例中 A 为 active 0、session 1/1，B 为 active 3、session 1/2；A 已满而跳过，B 被选中后变为 active 4、session 2/2。
- **15→16／17 断链**：`docs/plan-omni.md` 和 Omni roster 收束到第 15 章，删除未实现的第 16、17 章规划。第 9 步不再留下指向下一章的问题，收尾直接区分 RESET 清理和后续 health 资格。

## 已关闭且不重做的内容项

- 第 1 步候选排除、手机 dispatch 到 B，以及接受 B 后才显示 `1 compatible`。
- 第 6 步并列选择、active `before→after`、recency 更新、最终 `[2,2,2]` 和独立轮换并列由 C 获胜。
- 第 4 步 `2xx = HTTP status 200–299` 和 timeout 解释。
- 第 7 步 RequestLease 在响应结束、出错或取消时恰好释放一次。
- 英文手机 handoff 不回滚。

## 验证记录

- `npx astro --config .astro/local.config.mjs build`：60 页通过。忽略的本地配置只隔离 Vite cache，并允许当前目录和 shared `node_modules` 符号链接。
- 本章默认 `transcript` 连续两次生成一致：9 步，无 caption、出界、重叠或脚注问题。9 步 `readability` 为 0 机械问题；`deep-check 15` 和 `zh-check` 通过。
- 英中全章 `mobile` 在 360／390／430 px 均通过；中文第 8、9 步字号门通过。`git diff --check` 通过。
- 第 8 步 phase 2 显示 B 为 active 3、session 1/2；phase 4 显示 active 3→4、session 1/2→2/2。第 9 步 phase 2 的 RESET 释放文字 opacity 为 0.12，phase 5 为 1。
- 第 8、9 步英中深入讲解均实际打开，`aria-expanded=true`，预期文字存在，横向溢出为 0，KaTeX 错误为 0，无残留 `$$`。
- 截图在 `.bot/out/omni15-service-map/` 和 `.bot/out/omni15-final/`，深入讲解图在 `.bot/out/omni15-deep/`。当前模型不能读取这些 PNG，未声称已看图或视觉通过。

## 提交与剩余

- 教程提交：`26ef8df`（RESET 释放）、`6eb85dc`（桌面字号）、`cc75c74`（服务路由地图）、`ce5224f`（全书收尾）。均推送到 `origin/tutorials`；一次拒推后按要求 rebase 再推，没有 force-push。
- 等协调复审新增第 8 步、修订后的第 9 步和四组 P0 修复，并由具备图像输入的评审读取相位图。复审前不记当前九步的协调总分或 `complete-under-EVAL`。
- 下一单元按 direction 回修 Omni 13 的红框导读，之后处理 Omni 11 除 Step 7 tail 外的机制和 Omni 14 小字。不开新章。
- 未跑全站回归、真实 router、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。代码出处固定到 `sglang-omni origin/main@3a31bd72e034db37ce5115a03dd4827b449683be`。
