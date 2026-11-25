# 第 1 章评分卡 · Measure one inference request

日期：2026-11-24。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
材料：每步的最终中英桌面截图、中文手机截图、深入讲解截图和逐步 transcript；第 1 步位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s01/`，第 2 步位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s02/`，第 3 步位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s03/`，第 4 步最新复核位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-repair-20261124-1622/mlsys/`，第 5 步位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s05-20261124-1711/`；第 5 步本轮修旧材料位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s05-repair-20261124-1851/final/`，检查日志在相邻的 `checks/`；第 6 步材料位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s06-20261124-1901/final/`，检查日志在相邻的 `checks/`。冷读者只带 request、token、prefill 和毫秒的前置知识；后续步骤另带前面步骤的 TTFT、ITL、TPOT、E2E、P50。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | 我发出请求后，等了 250 毫秒，也就是 1/4 秒，才看到回答的第一个 token，这段等待叫 TTFT。 | 24 | 0 | — | 2026-11-23 |
| 2 | 12 | 从 request 发出开始计时，首个 token 在 250 ms 出现，这段等待叫 TTFT；后面三个 token 分别在 275、295、325 ms 出现，相邻 token 的间隔叫 ITL，所以三段 ITL 分别是 25、20、30 ms。 | 24 | 0 | — | 2026-11-23 |
| 3 | 12 | 首个 token 后有 25、20、30 ms 三段间隔，加起来除以 3，TPOT 就是 25 ms；它不含 TTFT，也不表示每段一样长。 | 24 | 0 | — | 2026-11-24 |
| 4 | 12 | 整个请求用 325 ms：首 token 前等 250 ms，后面三段 25、20、30 ms 共 75 ms。 | 24 | 0 | — | 2026-11-24 |
| 5 | 12 | 100 个请求从快到慢排队，第 50、51 个都等 200 ms，所以有 51 个不超过 200 ms；最慢的 1 个等 2000 ms，是 P50 的 10 倍。 | 24 | 0 | — | 2026-11-24 |
| 6 | 12 | 把 100 个请求按等待时间排队，第 99 个等 300 ms，这个位置叫 P99；最慢的第 100 个等 2000 ms，它不是 P99。 | 24 | 0 | — | 2026-11-24 |

**当前平均：24.00 / 24；最低：24；总洞数：0；6/6 个已制作步骤易读满分。** 本章继续制作第 7 步。

## 第 1 步冷读与检查

- 独立冷读一次通过：易读 **12 / 12**、原分 **24 / 24**、**0 洞**，R1–R6 均为 2。读者能从图说出 TTFT 的起点、终点和 250 ms = 1/4 秒，桌面与手机都能直接读。
- 图用 `0 ms → 250 ms` 标出首个 token 前的等待；蓝色只表示 TTFT。250 ms 是 zero-to-sglang 第 1 部分第 5 章 §3.1 的构造教学值，不冒充本机实测；定义与 `Inference Engineering §1.4` 一致。
- 最终图为 `mlsys-ch01-s01-zh.png`、`mlsys-ch01-s01-en.png`、`mlsys-ch01-s01-phone-zh.png`，深入讲解图为 `mlsys-ch01-s01-deep-zh.png`，均已打开检查。首页 `home-mlsys-zh.png` 确认第三本书可进入。
- `build`、ML Systems `transcript`、全章手机布局、中文手机字号硬门、`readability`、`deep-check 01`、`zh-check` 均通过。zero-to-sglang 中英在线章节链接均返回 HTTP 200。
- 新书接入共用布局和检查脚本；第 1 本 roster 与 URL 未改，`transcript/01-inference.md` 前后 SHA-256 均为 `724a97db913e51c5bfd73a872d2b0700d2b9f679ed66d3be69889df348ea627f`。

## 第 2 步冷读与检查

- 初稿独立冷读为易读 **11 / 12**、原分 **23 / 24**、**1 洞**：四个 token 卡片没有直接说明从 request 发出开始计时。桌面与手机图补上「从请求发出计时 / time since request sent」后，同一冷读者复读为易读 **12 / 12**、原分 **24 / 24**、**0 洞**，R1–R6 均为 2。
- 图标出四个时刻 250、275、295、325 ms 和三段 ITL 25、20、30 ms。首个时刻沿用第 1 步，后续时刻是补写的构造教学值；间隔在 `ml-sys/numbers.ts` 中由相邻时刻相减得出，不冒充本机实测。ITL 定义与 zero-to-sglang 第 1 部分第 5 章 §3.1、`Inference Engineering §1.4` 一致。
- 最终图为 `mlsys-ch01-s02-zh.png`、`mlsys-ch01-s02-en.png`、`mlsys-ch01-s02-phone-zh.png`，深入讲解图为 `mlsys-ch01-s02-deep-zh.png`，均已打开检查。
- `build`、ML Systems `transcript`、全章手机布局、中文手机字号硬门、`readability`、`deep-check 01`、`zh-check` 均通过；zero-to-sglang 中英在线章节链接均返回 HTTP 200。

## 第 3 步冷读与检查

- 独立冷读一次通过：易读 **12 / 12**、**0 洞**，R1–R6 均为 2；主 session 与独立原分复核均为 **24 / 24**。原分复核起初因 aria-label 和手机图例写死间隔数给 #3 一分；改用 `DEMO_POST_FIRST_GAP_COUNT` 或删去该数量后恢复满分，三张可见截图逐字节不变，冷读结果仍适用。读者能说出 TPOT 从 token 1 的 250 ms 算到 token 4 的 325 ms，4 个 token 只有 3 段间隔，TTFT 不参加平均，25 ms 不表示每段相同。
- 图沿用第 2 步时间线，以 `(25 + 20 + 30) ÷ 3 = 25 ms` 和 `(325 − 250) ÷ (4 − 1) = 25 ms` 互相验算。TPOT 在 `ml-sys/numbers.ts` 中由 ITL 总和除以间隔段数得出；课程依据为 zero-to-sglang 第 1 部分第 5 章 §3.1，200 个输出 token 对应 199 段。
- 最终图为 `mlsys-ch01-s03-zh.png`、`mlsys-ch01-s03-en.png`、`mlsys-ch01-s03-phone-zh.png`，深入讲解图为 `mlsys-ch01-s03-deep-zh.png`、`mlsys-ch01-s03-deep-en.png`，均已打开检查；360 px 手机无需放大即可读完。
- `build`、ML Systems `transcript`、本章三种宽度的中英手机布局、第 3 步中文手机字号硬门、全章 `readability`、`deep-check 01`、`zh-check` 均通过；全站手机检查在 360、390、430 px 无布局破坏，另报告 588 个非阻断小字审计项；zero-to-sglang 中英在线章节链接均返回 HTTP 200。浏览器确认从第 2 步按右箭头与直达第 3 步的 caption 和 aria-label 一致。

## 第 4 步冷读与检查

- 首轮独立冷读为易读 **11/12**、原分 **22/24**、**0 洞**，未过硬门：390 px 手机图写了 `75 ms = 25 + 20 + 30`，却漏掉桌面已有的「三段 ITL」；主图也没有直接回答量全程等待有什么用。
- 手机补上 `75 ms = 25 + 20 + 30 (三段 ITL)`，桌面标题改成「同一个请求 · 全程要等多久？」；没有增加新术语，也没有改动前 3 步的 caption 和数值。
- 同一冷读者复读为易读 **12/12**、原分 **23/24**、**0 洞**，通过硬门。桌面原分 **24/24**；手机因未单独显示全程等待之问，#1 保持 1 分，但没有理解洞。两种布局都明确 `E2E = 250 + (25 + 20 + 30) = 325 ms`，不会误读成只加一个 TPOT。
- `build`、本章 `transcript`、第 4 步 `readability`、本章三种宽度的中英手机布局、中文手机字号硬门、`deep-check 01`、`zh-check`、数字断言和 `git diff --check` 均通过；zero-to-sglang 中英课程链接均返回 HTTP 200。中英桌面、390 px 中文手机和双语深入讲解顶部与底部截图均已打开检查，浏览器从第 3 步按右箭头可进入本步。
- 最终截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s04-20261124-1515/final/` 和 `checks/`。
- 2026-11-24 修旧：手机顶部补回桌面已有的「同一个请求 · 全程要等多久？」，与下一行 E2E 定义分开；桌面 caption、数值和深入讲解均未改。独立冷读复核易读 **12/12**、原分 **24/24**、**0 洞**，R1–R6 与原 #1–#12 均为 2，手机原 #1 恢复 2 分。360、390、430 px 的浏览器断言确认标题在 SVG 内且不与 E2E 行相交，360 和 390 px 截图已打开检查。
- 本轮 `build`、本章 `transcript`、本步 `readability`、本章三种宽度的中英手机布局、本步中文手机字号、`deep-check 01`、`zh-check`、数字断言、课程链接和 `git diff --check` 均通过。最新中英桌面、中文手机及双语深入讲解顶部与底部截图位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-repair-20261124-1622/mlsys/final/`，日志在同级 `checks/`。

## 第 5 步冷读与检查

- 首轮独立冷读为易读 **10/12**、参考原分 **22/24**、**0 内容洞**：桌面与手机补 `ms` 和从短到长排序说明，`≤` 改为「不超过／at most」，手机补 `#50/#99/#100` 名次标记。
- 修订后冷读为易读 **11/12**、原分 **24/24**、**0 洞**，仍因同一步出现「百分位、P50、P99」三个新标签扣 R2。最终只引入 **P50**，删去 P99 和「中位数」别名，保留下一步要看的第 99 个请求。
- 最终同一冷读者复读为易读 **12/12**、原分 **24/24**、**0 洞**，R1–R6 与原 #1–#12 均为 2。读者能复述：第 50 个请求是 200 ms，第 100 个最慢为 2000 ms，是中间那个的 10 倍。
- 构造分布为 51×200 ms、48×300 ms、1×2000 ms，沿用 zero-to-sglang 第 1 部分第 5 章 §5.2 的 99 个较快请求和 1 个 2 s 请求情境，不冒充本机实测。P50 按 `r = ⌈0.50N⌉` 取排位；第 50、51 个都为 200 ms，中间两数取平均也得到 200 ms。
- `build`、本章 `transcript`、本步 `readability`、本章三种宽度的中英手机布局、本步中文手机字号、`deep-check 01`、`zh-check`、数字断言、浏览器导航、课程与本地链接、`git diff --check` 均通过。
- 全站默认等待的 `mobile` 在 600 秒被终止，未报告布局断言失败；改用 `WAIT=100 npm run mobile` 完整重跑通过，360、390、430 px 无布局破坏，另有 **576** 个小字视图仅作审计。
- 最终中英桌面、360／390 px 中文手机、双语深入讲解顶部与底部截图均已打开核对，无裁切或重叠；浏览器从第 4 步按右箭头可进入本步，显示 `05 / 05`、100 根柱且下一步禁用。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s05-20261124-1711/final/` 和 `checks/`。
- 2026-11-24 修旧：改前独立冷读指出 P50 取位不清、分数式计数难读两个洞；主评审另发现 51 个请求为 200 ms，图上却写 `50/100 requests at most 200 ms`。静态图复核后，改前为易读 **11/12**、原分 **21/24**、**3 洞**。
- 主图改为「P50 = 本图第 50 个请求的总延迟」；新增 `DEMO_AT_MOST_P50_COUNT`，由实际延迟数组算出不超过 P50 的数量。中英文都改写为「100 个中有 51 个不超过 200 ms」和「100 个中有 1 个」，不再用分数式表达请求个数。caption、柱图、数值分布和深入讲解未改。
- 同一冷读者复读并补核双语深入讲解，最终易读 **12/12**、原分 **24/24**、**0 洞**，R1–R6 与原 #1–#12 均为 2。读者能说明第 50、51 个请求同为 200 ms，所以 51 个不超过 200 ms；最慢 1 个为 2000 ms，是 P50 的 10 倍。
- 本轮 `build`、本章 `transcript`、本步 `readability`、本章与全站三种宽度手机布局、本步中文手机字号、`deep-check 01`、`zh-check`、数字断言、浏览器导航、静态截图对比和 `git diff --check` 均通过。全站另有 **576** 个既有小字视图仅作审计。
- 最新截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s05-repair-20261124-1851/final/` 和 `checks/`。中英桌面、360／390／430 px 中文手机、双语深入讲解顶部与底部均已打开核对。

## 第 6 步冷读与检查

- 首轮独立冷读为易读 **9/12**、参考原分 **23/24**、**1 洞**：深入讲解的「长尾／long tail」没有解释，Next 又提前引入「吞吐量／throughput」；R6 和 #10 当时只有截图证据限制，不另算内容洞。
- 按冷读者建议，把「长尾」改成「那 1 个慢请求」，Next 只保留「同一段时间能完成多少个请求」的白话预告。对照第 5、6 步及静态截图日志后，同一冷读者复读为易读 **12/12**、**0 洞**，R1–R6 均为 2；原 #1–#9、#11、#12 均为 2，合计 **22/22**。
- 主评核对 zero-to-sglang 第 1 部分第 5 章 §5.1–5.2、《Inference Engineering》§1.4.1 和 `numbers.ts`，#10 为 2，最终原分 **24/24**。课程没有规定本图的取位公式；深入讲解明确这里使用 `r = ⌈0.99N⌉`，其他工具可能插值。
- 本步沿用 51×200 ms、48×300 ms、1×2000 ms 的构造分布。`DEMO_P99_RANK`、`DEMO_P99_MS`、`DEMO_AT_MOST_P99_COUNT` 和 `DEMO_SLOWEST_OVER_P99_MS` 均由同一数组推导：第 99 个为 300 ms，99 个不超过 300 ms，最慢 2000 ms，比 P99 多 1700 ms。
- `build`、本章 `transcript`、本步 `readability`、本章与全站三种宽度手机布局、本步中文手机字号、`deep-check 01`、`zh-check`、数字断言、浏览器导航、静态截图对比、课程链接和 `git diff --check` 均通过。全站另有 **576** 个既有小字视图仅作审计。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s06-20261124-1901/final/` 和 `checks/`。中英桌面、360／390／430 px 中文手机顶部与底部、双语深入讲解顶部与底部均已打开核对；浏览器确认第 5 步右箭头进入本步、末步不越界、直达链接和 100 根柱均正确。
