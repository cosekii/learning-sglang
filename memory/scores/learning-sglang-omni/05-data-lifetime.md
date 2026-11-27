# 第 5 章评分卡 · Data references and reclamation

日期：2026-11-25。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
材料：最终中英桌面截图、360／390／430 px 中文手机截图、390 px 英文手机截图、双语深入讲解截图及逐步 transcript；冷读者先读 Omni 前四章。截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch05-20261125-1130/final/`。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | A 还没读完时，B 不能抢走这一格；等 A 读完，B 才能进来。 | 24 | 0 | — | 2026-11-25 |
| 2 | 12 | DataRef 像一张取货小卡片，只写数据叫什么、走哪条路、放在哪里，数据本体还留在原处。 | 24 | 0 | — | 2026-11-25 |
| 3 | 12 | 发送方先写好 A，再留一张等回执的记录，最后把小卡片发给读者；回执没来，活不能收尾。 | 24 | 0 | — | 2026-11-25 |
| 4 | 12 | 接收方照小卡片取回并还原 A，读完先回一张 ACK，再把 A 交给后面计算。 | 24 | 0 | — | 2026-11-25 |
| 5 | 12 | 发送方用 A 的名字找到等待记录，等操作收尾后删掉记录，后端才可以回收资源。 | 24 | 0 | — | 2026-11-25 |

**2026-11-25 旧评分卡平均：24.00 / 24；最低：24；当时制作步总洞数：0；5/5 步易读满分。** 本章依次讲清安全复用、DataRef、发布时的 pending、读取后的 ACK 和发送方收尾。后续独立复核新增 Omni-09／50，旧分不关闭这些 finding，也不作为当前整章 GO。

## 冷读与整改记录

- 章末冷读发现第 4 步手机流程标题截断，以及中英顶部说明和脚注的实际 SVG 溢出。终稿缩短手机文案，保留桌面完整说明；中英 360／390／430 px 共 30 个逐步视图的 SVG bounding-box 审计均为 **0 溢出**，手机截图逐张打开复核。
- 中文冷读把含混的「主人」统一为「发送方」，补上 `version = 1` 的「格式」含义，并把「线格式」「删除 sender 数据」改成自然中文。最终主线程换视角逐洞复读：每步的动机、名词、数字来源、图上因果、前后衔接和省略边界都能在本步、前序章或深入讲解中找到答案；中英内容洞与最终显示洞均为 **0**，遮住 caption 后仍可复述。
- 两次独立 subagent 冷读均因 `Invalid or unauthorized API key` 未运行，未产生独立报告；最终冷读按 `EVAL.md` 的换视角自检由主线程完成，不声称通过独立冷读。
- 最终检查：`build`、本章 `transcript`、全章 `readability`、`deep-check 05`、本章 `zh-check`、中英三种手机宽度 `mobile`、上述 SVG 溢出审计、双语抽屉 `aria-expanded=true` 及 `git diff --check` 均通过。只跑本章检查，未跑全站回归。

## 2026-11-27 · Omni-50 作者复评（待协调固定复审）

| 步 | R1–R5 /10 | 机制 R6 /2 | 原十个非视觉项 /20 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 4 | 10 | 2 | 20 | 接收方先把 SHM 字节复制到自己的空间，再关句柄、去掉共享块名字；还原用副本，不再读旧名字。 | 0 |
| 5 | 10 | 2 | 20 | 回执到了，发送方才让 SHM put 收尾；等待内部归还一个写入名额，watcher 再删等待记录。 | 0 |

- Step 4 用七相依次形成解析、`get_async → ShmGetOperation`、等待内复制、等待内 close/unlink、接收空间返回、用副本还原、成功 ACK。Step 5 用六相形成 ACK 匹配、`pending.ack.set_result`、`mark_receiver_done`、`wait_for_completion`、其 `finally: sem.release`、`pending.pop(A)`。未完成阶段显示等待状态，不提前显示完成标签。
- 独立 `explore` 冷读首轮提出五项机制问题，随后提出 ACK 提前完成一项；修正后最终 **PASS**。这是作者复评和独立源码／transcript／DOM 冷读，不是协调 verdict；Omni-50 不自行销项。
- 最终 `npm run build`：60 页通过；五步 `readability`：0 机械问题；`BOOK=omni node scripts/deep-check.mjs 05`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Steps 4／5 字号门与 `git diff --check` 全过。transcript 为 **1,213 词**，SHA-256 `95f15493306158f1eb7f6ecbf5674e4d6fb306435eb61d0b1a147002e183bd78`。
- `.bot/out/omni50-phase-audit.mjs` 覆盖 Steps 4／5 × 英文桌面／中文桌面／中文 390 px × 直接 URL／前步入口，共 **12 组合、78 状态、66/66 机制转变**。最低 **11.760 CSS px**，重叠、SVG 出界、页面横溢均为 0；提前完成标签断言也通过。代表图：`.bot/out/omni50-s4-endesktop-direct/s4-p3.png`、`.bot/out/omni50-s5-zh390-direct/s5-p4.png`。
- `.bot/out/omni50-deep-audit.mjs` 在 360／390／1440 px 覆盖双语 Steps 4／5，共 **12 个打开抽屉视图**；目标文本、`aria-expanded=true`、页面和抽屉横溢、KaTeX 与 raw-math 检查通过。桌面抽屉打开后的舞台最低 **8.006 CSS px**，且焦点记录为空，归既有共享 ML-21／22，本单元未改也不声称这两项通过。
- 当前模型不能读取 PNG；结论来自构建、transcript、源码、独立冷读、DOM 与几何检查，未声称看过图片或视觉通过。未跑全站回归、真实 SGLang-Omni、SHM 进程间传输、模型、GPU 或 reduced-motion 动态切换。
- **Omni-50 单元不关闭 Omni-09。** 该单元只把 Steps 4／5 改为机制动画，Steps 1–3 留待后续 Omni-09 单元，见下节。

## 2026-11-27 · Omni-09 作者复评（待协调固定复审）

| 步 | R1–R5 /10 | 机制 R6 /2 | 原十个非视觉项 /20 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 1 | 10 | 2 | 20 | A 没读完时 B 不能抢这格；A 读完后，B 才能进来。 | 0 |
| 2 | 10 | 2 | 20 | DataRef 是找数据的小卡片，不带数据本体；接收方用卡片字段找 A，发布发生在下一步。 | 0 |
| 3 | 10 | 2 | 20 | 先写入并留 pending，再发 DataReady；随后启动 watcher，最后 `send_payload()` 才返回，这不表示读者已读。 | 0 |

- 教程提交：`b89db6c`（Step 1）、`975362f`（Step 2）、`54777a1`（Step 3）。Steps 4–5 沿用上一轮已验证的七相和六相，不重做。
- Step 1 四相为共同初态、左栏覆盖并读错、右栏读完 A、右栏 B 进入。标题写明 initially，蓝色只表示 A、橙色只表示 B，面板和读者边框保持 neutral。
- Step 2 三相为只有 payload、构造 DataRef、接收方使用字段。末相明确 `FIELDS IN USE · NOT SENT`，发布和读取都留给 Step 3；SHM 解释为 shared memory。
- Step 3 六相为写入中、返回 DataRef 和 live operation、登记 pending、发送 DataReady、启动 watch_pending、完成 job.ready 和 `send_payload()`。pending 先于通知，watcher 跟随通知，job.ready 最后完成。
- 独立 `explore` 对 Step 1 初轮指出标题时态和颜色双义，修正后 **PASS**；Steps 2、3 分别 **PASS**。整单元复核确认 **18 组合、78 状态、60/60 机制转变**，五步均非静态，Steps 4–5 无回归。这些是作者复评和独立源码／transcript／DOM 冷读，不是协调 verdict，Omni-09 不自行销项。
- 最终 `npm run build`：60 页通过；五步 `readability`：0 机械问题；`deep-check 05`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Steps 1–3 字号门与 `git diff --check` 全过。transcript 为 **1,249 词**，SHA-256 `4d0035fb99ad5d7f6970a5372d4b9390ae78657bf0d497f5fa7d81836609ea04`。
- `.bot/out/omni09-phase-audit.mjs` 覆盖 Steps 1–3 × 英文桌面／中文桌面／中文 390 px × 直接 URL／跨步入口，共 **18 组合、78 状态、60/60 机制转变**，最低 **11.760 CSS px**，重叠、SVG 出界、页面横溢均为 0。
- `.bot/out/omni09-deep-audit.mjs` 在 360／390／1440 px 覆盖双语 Steps 1–3，共 **18 个打开抽屉视图**；目标文本、展开身份、页面和抽屉横溢、KaTeX 与 raw-math 检查通过。桌面抽屉打开后的舞台最低 **8.006 CSS px**，焦点记录为空，仍属共享 ML-21／22。
- 当前模型不能读取 PNG；结论来自构建、transcript、源码、独立冷读、DOM 与几何检查，未声称看过图片或视觉通过。未跑全站回归、真实 SGLang-Omni、SHM 进程间传输、模型、GPU 或 reduced-motion 动态切换。

## 2026-11-27 · Omni-09 Steps 4–5 动画补完作者复评（待协调固定复审）

| 步 | R1–R5 /10 | 机制 R6 /2 | 原十个非视觉项 /20 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 4 | 10 | 2 | 20 | 接收方先把 SHM 字节复制到自己的空间，再关句柄、去掉共享块名字，最后用副本还原并回 ACK。 | 0 |
| 5 | 10 | 2 | 20 | ACK 到了，发送方先标记读者读完，再把空闲名额从一个变回两个，最后删除 pending。 | 0 |

- 教程提交：`05543c7`（Step 4）、`abc9a49`（Step 5）。Step 4 第 2 相先让接收空间显示 `copy ✓`，源 SHM 块仍在；第 3 相才把源块改为 `SHM A · unlinked` 并关闭句柄。Step 5 依次改变 ACK future、`receiver: reading → done`、`wait_for_completion`、`free permits = 1 → 2` 和 pending 是否存在。
- 两步的独立 `explore` 源码／transcript 冷读均为 **PASS**，没有阻塞内容洞。它们未读取 PNG，也不是协调 verdict；Omni-09 不自行销项，Omni-50 已提交文字没有另行返工。
- 最终 `npm run build`：60 页通过；五步 `readability`：0 机械问题；`deep-check 05`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Steps 4／5 字号门与 `git diff --check` 全过。连续重生成 transcript 与提交一致，**1,290 词**，SHA-256 `6875248e2fac15a75735ebb6c4620bffc4abca3e4dae233f7ed460a75347364b`。
- `.bot/out/omni50-phase-audit.mjs` 覆盖 Steps 4／5 × 英中 × direct／前步入口 × 桌面／360／390／430 px，共 **32 组合、208 状态、176/176 机制转变、176 个唯一 PNG 哈希**。最低 **10.760 CSS px**，重叠、SVG 出界、页面横溢和提前完成状态均为 0。
- 双语 Steps 4／5 在 360／390／430／1440 px 共 **16 个打开抽屉视图**通过目标文本、展开身份、页面和抽屉横溢、KaTeX 与 raw-math 检查。桌面抽屉打开后的舞台最低 **8.006 CSS px**，焦点记录为空，仍属共享 ML-21／22，本单元不改也不声称这两项通过。
- 当前模型不能读取 PNG；结论来自构建、transcript、源码、独立冷读、DOM 与几何检查，未声称看过图片或视觉通过。未跑全站回归、真实 SGLang-Omni、SHM 进程间传输、模型、GPU 或 reduced-motion 动态切换。剩余是 Omni-09 的协调固定复审、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。
