# lane k1 本轮报告 · Omni 13 冷读与手机返工

日期：2026-11-26。范围只含 Learning SGLang Omni 第 13 章的组件、双语深入讲解、MDX、生成 transcript、评分卡、仓库 progress 和本报告。未碰其他书、其他 lane 的章节、第 1 本受保护英文原文或 `.bot/memory/`。

## 修掉的 open review 项

- **Omni-41**：已有 `297698f` 的英文 Step 2 手机短标题通过本轮自定义末相审计；360／390／430 px 的 SVG 出界均为 **0**，不再只依赖默认 mobile 的 `no layout breaks`。
- **Step 1**：删除启动步里的输出限制，只保留两种启动形态；输出路线仍由 Step 2 单独讲。
- **旧 Step 4**：拆为当前 Step 4 的 78→73 份额拆分和 Step 5 的 85.7 GB 对 80 GB 视频溢出例。新 Step 5 用同一 0–90 GB 刻度画移卡前后两柱，保留 `85.7 − 8.0 = 77.7 GB`。
- **旧 Step 5**：当前 Step 6 只比较 BF16／FP8／INT4 的 60／40／30 GB 估计及 67%／50% 算式；各 stage 的混合精度规则移到深入讲解的图外边界。
- **旧 Step 6**：拆为当前 Step 7 的副本拓扑与 32 请求 cap，以及 Step 8 的独立 codec 状态池。Step 8 分相形成默认 32 位、`r0` 64 位和 `r1` 64 位，明确两个进程不是共享 128 位池。
- **当前 Step 9／10**：复核并保留已有 `c = concurrency`、8 token 约为 6 个英文单词、config resolve→readiness→A/B、BF16/FP8 范围、median/custom p90 和 queued audio 解释，没有重做已通过机制。
- **独立 reviewer 追加发现**：修复 Step 7 默认 code2wav 被误画到两张 GPU 的冲突；修复 Step 5 深入讲解把权重和 KV 误说成来自 Step 4 份额；说明每个池按两个 talker 配容量，但默认配对仍把每路流交给一个 codec。复审三项均 **CLOSED**，未发现新事实矛盾。
- 评分卡和 progress 已同步协调固定 `18f9bc1` 的分数，不再保留旧的八步满分口径。

## 分数边界

- 协调固定八步基线保持：R1–R5 **68/80**、机制 R6 **16/16**、R1–R6 **84/96**、原十个非视觉项 **156/160**、原 #4/#5 **32/32**、原十二项 **188/192**。
- 当前树扩为 **10 步**，不沿用旧分母。作者机制复核 **20/20**，独立只读 reviewer 的未决事实洞 **0**；当前 R1–R5 总分、原 #4/#5 和协调 verdict 留待复审，不记 `complete-under-EVAL`。
- 小学生逐步复述已写入 `memory/scores/learning-sglang-omni/13-qwen3-omni-deployment.md`。当前模型不能读取 PNG，未声称视觉通过或主人验收通过。

## 验证

- `npm run build`：60 页通过。全章 10 步 `readability` 为 0 机械问题；`deep-check 13`、`zh-check`、英中全章 `mobile`、改动中文步字号门和 `git diff --check` 通过。
- 默认 `transcript` 连续两次逐字一致：**3484 词**，SHA-256 `09c6cd90035f1fae25600f4261e80adfa6ffdb9e600a0bb944c1e48969ad77c8`；10 步无 caption、出界、重叠或脚注告警。
- `.bot/out/omni13-final/report.json` 覆盖 **42 个桌面相位 + 60 个英中手机末相 + 20 个双语 deep = 122 个状态**。身份、计数器和末相编号一致；SVG 出界、文字重叠、小字、页面横溢、deep 失败、KaTeX 错误均为 **0**。桌面最低 **10.329503676470589 CSS px**，手机最低 **10.760289634146341 CSS px**。
- 同目录保存 PNG 和可重跑的 `audit.mjs`。代表图：`.bot/out/omni13-final/phone-en-390-s02-final.png`、`.bot/out/omni13-final/desktop-en-s05-p2.png`、`.bot/out/omni13-final/deep-zh-s08.png`。未把这些文件记为模型已读图证据。
- 独立 cold-read／alignment reviewer 先发现两处事实问题，修复后同一 reviewer 复核关闭。另一个 reviewer 因配置模型不可用失败、一个空调用无报告，均未计为证据。

## 提交

- `b39b544`：分离启动形态与输出概念。
- `b3c48ab`：拆分份额与视频溢出步。
- `192be1c`：收窄精度和显存比较。
- `f328860`：拆分副本与 codec 状态池。
- `c1f7636`：缩短新溢出步的手机算式。
- `e5aba00`：修正默认 code2wav 拓扑及容量／路由说明。
- `61e82fc`：修正视频算式的来源说明。
- 评分卡、progress 和本报告随后续 `[k1] ` 记录提交推送；所有教程提交均已推 `origin/tutorials`，没有 force-push。

## 剩余

- 等协调人按当前固定提交复审本章十步的内容、相位、视觉和分数；复审前保持 **NO-GO / coordinator-rereview-pending**。协调通过后再按 direction 修 Omni 11 和 Omni 14，不开新章。
- 未跑全站回归、真实模型、服务、GPU benchmark、音频质量评测、故障注入或 reduced-motion 动态切换。代码出处固定到 `sglang-omni origin/main@9725235249df851281d4dc62a04b2d34b02ac0fe`。
- 本轮 4323 dev server 已停止；自定义审计浏览器已关闭，匹配本轮 `zh-check` 的孤儿 Chrome 已清理，未动其他 lane 的进程。

---

# lane k2 本轮报告 · ML Systems 13 定点返工

日期：2026-11-26。范围只含 ML Systems 第 13 章、共享 transcript 采集器、评分卡、进度和本报告；未动 Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## 修复的 open review 项

- `796c714 [k2] Restore ML 13 training field exclusions`：第 4 步舞台、ARIA 和双语深入讲解恢复 `D0`／`D1` 对 `input_ids`、`attention_mask` 的排除，并说明第 3 步已把 `O` 单独存入 token 记录。已对照 pinned slime 的两处过滤实现。
- `c8fb266 [k2] Stabilize ML 13 transcript phase capture`：默认采集会等待 URL 指定步的末相位，不再在 3.4 秒提前读取，也不会把 Step 1 的末相位编号用于其他步。无 data 属性的章节保持原固定等待。
- 评分卡和 `memory/progress.md` 已撤回错误的 **80/80、160/160、0 洞**。保留协调基线 **79/80、159/160、191/192、机制 16/16、1 个内容洞**，本轮返工待协调复审，不记 `complete-under-EVAL`。
- 第 4 步的 `input_ids`／`attention_mask` 目前只在深入讲解中解释；舞台 R3 和易读分留给协调重评，继续保留 **19/20、1 洞**，不自行提分。

## 验证

- 修复前默认采集复现 **1744 vs 1793 words**，漏第 7／8 步末相位文字。修复后默认重生成两次及 `WAIT=1` 重生成均与 pinned **1808 words** 逐字一致；新增 15 词来自第 4 步边界说明。ML 12 默认重生成无差异。
- `npm run build -- --config .astro/k2.config.mjs`：60 页通过。忽略的本地配置只隔离 Vite cache 并允许符号链接依赖。
- 本章默认 `transcript`、8 步 `readability`、英文全章及中文全章 `mobile`、中文第 4 步字号门、`deep-check 13`、`zh-check`、`git diff --check` 全过。
- 英中第 4 步深入讲解 DOM 均含两处排除字段和第 3 步 token 记录，横向溢出为 0，无 KaTeX 错误或残留 `$$`。
- 截图在 `.bot/out/ml13-rework/`，代表图 `s4-en.png`、`s4-zh-phone.png`。当前模型不能读取 PNG，未声称视觉验收通过。

## 提交与剩余

- 两个教程提交均已推 `origin/tutorials`；第一次推送被拒后按要求 `git pull --rebase origin tutorials` 再推，没有 force-push。评分卡、progress 和本报告随最后一条 `[k2] ` 记录提交推送。
- `2d53845 [k2] Restore lane k1 report section`：恢复 `fbb434a` 误删的 lane k1 报告块，保留当前 k2 和 d 记录；`.bot/memory` 未改。
- 等协调复审第 4 步内容、默认 transcript 和记录；主人最终视觉验收另计。复审前不开第 14 章，继续跳过缺原始来源的第 11 章。
- 未跑全站回归、真实训练、rollout、工具调用、VLM、GPU benchmark、质量评测或 reduced-motion 动态切换。

---

# lane d 本轮报告 · Inside Voxt 08 返工

日期：2026-11-26。范围只含 Inside Voxt 第 8 章 `personal-dictionary` 的组件、双语深入讲解、生成 transcript、评分卡、进度和本报告；未动 Omni、ML Systems、第 1 本受保护英文原文或 `.bot/memory/`。

## 修掉的 review 项

协调 `983469c` 仍判 NO-GO 的机制与舞台事实：

- 第 1 步：原识别框不再被替换结果覆盖。识别框固定显示 `call Preeya.`，另加独立「替换后」框在第三相显示 `call Priya.`；高亮依次指向识别框、词典行、替换框。关闭原 #10 的舞台事实扣分（待复审）。
- 第 5 步：右面板并排显示例 A（输入 `call Priya.`）和例 B（输入 `call Sam.`）。每个例子各有带标签的「组装」框，只放 input 和 candidates；另有单独的「user · 消息」框，只在术语表非空时放 `<glossary>`，再放输入。例 A 有 glossary，例 B 只有 `call Sam.`。底部候选规则恢复「文字点名词条本身或它的任一别名 → 那个词条成为候选」，桌面与手机同步，不再只写在 ARIA 或深入讲解；每相只推进 A 的「无候选→候选→术语表」。
- 第 2 步：四个去处的 payload 改为累积；文字稿写 `replace: Preeya → Priya`，不再写 `sent:`。
- 第 3 步：第二条提示和 `2 hints` 出现时，聚焦回到正在变化的语音模型框。
- 第 7 步：`solved = phase >= i`，每相只让当前行出现标记，末相不再一次补两行。
- 第 4 步手机：补回 `language-model cleanup` 执行者标签。
- 组件补上缺失的 `.detail { font-size: 11px }`，修掉第 5 步 `system` 与通用规则重叠。

## 分数

按协调 `983469c` 同步，不沿用作者或 `baff867` 旧分：

- R1–R5 **70/70**；原十个非视觉项 **138/140**（第 1、5 步各 19/20）；静态 R6 **14/14**；原 #4/#5 **28/28**；原十二项 **166/168**；机制 R6 **9/14**，逐步 **1、1、1、2、1、2、1**。
- 本轮修复待复审，不自行改总分，不记 12/12、24/24 或 `complete-under-EVAL`。

## 验证

- `npx astro --config .astro/local.config.mjs build`：60 页通过。`node_modules` 是指向主 checkout 的符号链接，本地配置只隔离 Vite cache 并允许该路径。
- `BOOK=voxt ONLY=8 npm run transcript -- http://localhost:4379/learning-sglang`：7 步，无 caption／出界／重叠／脚注告警；生成 transcript 已提交。共享 CDP 9334 被另一运行占用，临时用 `CDP_PORT` 派生端口，运行后已还原 `scripts/transcript.mjs`。
- `BOOK=voxt ONLY=8 npm run readability`：7/7，0 机械问题。`BOOK=voxt node scripts/deep-check.mjs 8`、`BASE=http://localhost:4379/learning-sglang BOOK=voxt ONLY=8 node scripts/zh-check.mjs`：通过。
- 英中全章 `mobile`（360/390/430）无布局断裂；中文第 1／2／3／4／5／7 步逐步字号门通过。
- 截图在 `.bot/out/voxt08-shot2/`（英文桌面第 5 步两个相位、中文手机第 5 步；上一轮其余步的图在 `.bot/out/voxt08-shot/`）。当前模型不能读 PNG，未把这些图记成已读视觉证据。

## 提交

- 教程与 transcript：一条 `[d]` 提交。
- 评分卡、progress 和本报告：随记录提交。
- 全部推 `origin/tutorials`；被拒时 `git pull --rebase origin tutorials` 后重推，不 force-push。

## 剩余

- 等协调人复审第 1、2、3、5、7 步的新相位图和两处舞台事实；复审通过后才做 Voxt 11，再 10，最后 `12-meeting-capture-modes`。
- 未跑全站回归、真实 Voxt、模型或语音服务；主人最终验收另计。

## 复审后跟进（同日）

- 复审指出第 5 步仍把 input、candidates、glossary 和最终消息混在同一个 rect 里，没有可见的 compose／user 分区；可见候选规则也漏了别名。本轮把每个例子拆成带标签的「组装」框（input＋candidates）和单独的「user · 消息」框（非空术语表＋输入）；底部候选规则恢复「文字点名词条本身或它的任一别名 → 那个词条成为候选」。双语深入讲解、ARIA 和 transcript 同步。
- 重跑 60 页 build、本章 transcript、readability、deep-check、zh-check、英中全章 mobile 和中文第 5 步字号门，均通过。截图在 `.bot/out/voxt08-shot2/`。按复审要求，这次只有第 5 步一个 `[d]` 教程提交，另加一条记录提交。

---

# lane d 本轮报告 · Voxt 08 桌面字号 P0

日期：2026-11-26。按 `memory/direction.md` 的 lane d 顺序，只处理 Voxt 08 的返工项；没有碰 Omni、ML Systems、第 1 本受保护英文原文或 `.bot/memory/`。

## 处理的 review 项

- 关闭 `review.md`「动画与舞台事实修复复审：Voxt 08 `f88585f…90ea3e9`」的 **P0 · 桌面字号**：1440×900 下第 5 步最低 8.19 CSS px、第 7 步 9.65 CSS px。
- 第 5 步桌面舞台 `H` 由 660 改为 520，压缩重排左栏 system／user、右栏例 A／例 B 的组装框、候选行、user 消息框和底部候选规则；第 7 步 `H` 由 560 改为 520，四行结果卡、说明行和 `recording → history` 框上移。两处同步更新桌面 `motionFrames`，未整体缩放 viewBox。手机布局不变。
- 评分卡与 progress 同步协调 `90ea3e9` 的分数，并保留「待复审前 NO-GO」；修的是上述 P0，不重开已关闭的第 1、2、3、5、7 步机制与舞台事实项。

## 分数

- 协调 `90ea3e9` 内容／机制分：R1–R5 **70/70**、原十个非视觉项 **140/140**、静态 R6 **14/14**、原 #4/#5 **28/28**、原十二项 **168/168**、机制 R6 **14/14**（七步各 2/2）。
- 桌面字号门（本轮修复后、待复审）：1440×900 下第 5、7 步最低均 **10.39 CSS px**；其余五步不变。
- 复审确认前完整 EVAL 仍记 **NO-GO**，不记 `complete-under-EVAL`。

## 验证

- 独立 dev server 端口 **4399**：本 clone 原 `node_modules` 指向协调人 checkout，Vite 写 cache 报 EPERM；改为本 clone 自己的 `node_modules` 后启动，未连接协调人的 4321 服务。
- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=8 node scripts/transcript.mjs http://localhost:4399/learning-sglang`：7 步，无重叠／出界／脚注告警；生成无差异。
- `BOOK=voxt ONLY=8 STEP=5`、`STEP=7` 的 `readability`：均 ok，0 机械问题。
- `BOOK=voxt node scripts/deep-check.mjs 08`：ok。`BASE=http://localhost:4399/learning-sglang BOOK=voxt ONLY=8 node scripts/zh-check.mjs`：all clear。
- 英中全章 `mobile`（360/390/430）无布局断裂；英中第 5、7 步逐步字号 `mobile` 均无问题。
- 桌面 1440×900 逐相采样：英中第 5、7 步无文字重叠、无出界。相位图存 `.bot/out/lane-d/voxt08-fontfix/`（英文第 5 步 4 时点、第 7 步 4 时点，中文各 1 张）。当前模型不能读 PNG，未记成已读视觉证据。

## 提交

- 教程源码、评分卡、progress 和本报告：一条 `[d]` 提交，推 `origin/tutorials`。

## 剩余

- 等复审读第 5、7 步桌面相位图并确认字号门；通过后才继续 Voxt 11 前五步逐相返工，再 Voxt 10，最后 `12-meeting-capture-modes`。
- 未跑全站回归、真实 Voxt、模型或语音服务；主人最终验收另计。

---

# lane k2 本轮报告 · ML Systems 01 静态机制返工

日期：2026-11-26。范围只含 ML Systems 第 1 章、其双语深入讲解与数字、生成 transcript、评分卡、仓库 progress 和本报告。已按 direction 只移植旧树的六个本章文件，未改 Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## 修掉的 open review 项

- **ML-02 · 01/1–7 静态时间测量**：`5f5aa56 [k2] Animate ML 01 measurement comparisons` 为七步加入 `[3,5,5,6,6,5,12]` 个相位。TTFT、ITL、TPOT、E2E 推进同一个 `stream: true` 构造请求和客户端 SSE delta 时钟；P50／P99 推进同一两批请求的排序与取位；吞吐推进同一 0–25 s 时钟上的完成数。修正旧草稿 Step 2／3 新 token 已出现而时钟仍停在前一 token 的错误，并用逐相断言核对 token、间隔和时钟。
- **ML-15 · 01/5–7 缺同尺度 A/B**：新增 B 的构造分布 `50×250 + 49×400 + 1×2000`。P50／P99 两批共用 0–2000 ms；吞吐两批共用 0–25 s，A 在 20 s 完成，B 在 25 s 完成，分别得到 5 和 4 requests/s。补齐测试起点、请求重叠和均匀填格只是平均速率简化的边界。
- **ML-24 · 01 手机 SVG overflow**：缩短手机标题、脚注和图例，修复 Step 4 `loops` 与标题相碰。最终英中 360／390／430 px 共 42 个末相视图的文字出界、文字重叠和 <10 CSS px 均为 0；默认英中全章 mobile 也均为 `no layout breaks`。
- 首轮独立冷读发现的缩写未展开、SSE delta 与 token 的关系、完成边界、arrival／completion 混用、测试起点和请求重叠问题均已返工。终审为文本 GO、机制 GO，0 未决内容洞。

## 当前作者分数与厚度边界

- R1–R5 **70/70**、机制 R6 **14/14**、原十个非视觉项 **140/140**、0 未决内容洞。原 #4/#5 和原十二项总分待图像评审，不记 `complete-under-EVAL`，也不覆盖协调 verdict。
- transcript 为 **1,317 词**。本章只定义核心指标并演示同刻度构造例；请求集、预热、token/s、SLA、Goodput 和控制变量 profiling 的范围已在 MDX 和第 7 步深入讲解写明，控制变量实验归第 14 章，不用重复内容凑字数。

## 验证

- `npm run build -- --config .astro/k2.config.mjs`：60 页通过。忽略的本地配置只隔离 Vite cache 并允许共享 `node_modules` 符号链接，未写协调人的 checkout。
- 本章默认 transcript 连续两次一致，SHA-256 均为 `bf32ad2fa2867ffbac2f151cc154570be4dda61e977fc69a8d257730c2d10ff5`；7 步 readability、deep-check、zh-check 和 `git diff --check` 全过。zero-to-sglang 中英链接均 HTTP 200。
- 42 个英文桌面相位 DOM 均核对 counter、step、phase、文字出界、重叠和字号；每步末相最小值为 13.508、13.508、13.508、13.508、10.806、10.806、10.391 CSS px。逐相断言覆盖 token 时钟、E2E 端点、A/B 排序、P50 揭示顺序、A 的 20 s 终点和 B 的 25 s 终点。
- 英中三宽度 42 个手机末相 DOM 全过；双语 14 个深入讲解均实际打开，`aria-expanded=true`，无横向溢出、KaTeX 错误或残留 `$$`。
- 证据在 `.bot/out/ml01-rework/`，代表图 `s7-p11-en.png` 和 `s4-final-zh-phone.png`。当前模型无图像输入，尝试 Read PNG 后确认不能读取，未声称已看图或视觉通过。

## 提交与剩余

- 教程提交 `5f5aa56` 首次推送被拒后，已按指令 `git pull --rebase origin tutorials` 并推送成功，没有 force-push。评分卡、progress 和本报告随后续 `[k2] ` 记录提交推送。
- 等协调复审 ML-02／15／24 和图像评审；主人最终视觉与真实产品验收另计。下一单元按 direction 继续 ML 02–10／12 的静态机制 P0 和 ML-14，不开第 14 章新书。
- ML-21／22 的共享深入讲解抽屉和其他章返工不在本单元。未跑全站回归、真实 SGLang、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。

---

# lane k2 本轮报告 · ML Systems 02 机制与内容返工

日期：2026-11-26。范围只含 ML Systems 第 2 章、双语深入讲解、生成 transcript、评分卡、仓库 progress、规划行和本报告。未改 Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## 修掉的 open review 项

- **ML-03 · 静态显存生命期**：旧 2 步扩为 6 步，35 个相位分别演示 KV 尺寸、model→KV pool→graph buffers、capture→replay→runtime 和最终账。capture 明确只记录、不执行，输出由 replay 写入；同一 `G` 贯穿两次 replay，`A` 只在计算需要时出现。
- **ML-28 · “完整显存账”过宽**：章名改为「启动与运行时显存账」。最终账写 `M+K+R=78` 与 `G+A+D≤11.7 GB`，三项未知量标 `?`，明确不覆盖 KV 字节推导、paging、多模态预留和 allocator 全量分配。
- **ML-30 · 02→03 接缝**：保留 hybrid 共同前缀，并在图上解释 hybrid 与 `num_batch`，直接引出 ML 03 Step 1 的 1024／64 等待和重算 token 数对照。
- 独立冷读另关闭 9 个术语、连续性和 capture 事实问题；源码评审另修正 capture `824-855,1029-1076` 与输入复制 `262-362,1138-1151` 的出处。缩短深入讲解源链接显示文字后，12 个双语抽屉视图无横向溢出。

## 当前作者分数与厚度边界

- 独立冷读终审：R1–R5 **60/60**、机制 R6 **12/12**、原十个非视觉项 **120/120**、**0 未决内容洞、无必修项**。源码终审同样无必修项；这些均为文本与 DOM 证据，不是 PNG 视觉通过或协调 verdict。
- 六步相位间机制变化数为 **5、4、4、4、5、6**。原 #4/#5 和原十二项总分待图像评审，不记 `complete-under-EVAL`。
- transcript 为 **1,074 词**，SHA-256 为 `22a954d5c607211627a613d5e326f99ff08c017f436983543a5f5397a1bef91d`。本章只覆盖启动尺寸、graph 缓冲与激活使用期；省略主题及原因已写在 MDX 和深入讲解，不用重复内容凑字数。

## 验证

- `npm run build -- --config .astro/k2.config.mjs`：60 页通过。本地忽略配置只隔离 Vite cache 并允许读取共享依赖，未写协调人的 checkout。
- 本章默认 transcript 重生成与 pinned 一致，6 步 readability、`deep-check 02`、`zh-check` 和 `git diff --check` 全过。zero-to-sglang 中英 Chapter 4 链接均 HTTP 200。
- 英中全章及中文逐步 360／390／430 px mobile 全部 `no layout breaks`。35 个英文桌面相位均核对 step、phase、文字出界和字号；逐步最小值为 12.593、12.007、12.007、12.007、12.007、10.326 CSS px。
- 6 个中文 390 px 手机末相和 12 个双语 deep 视图均核身份；deep 均 `aria-expanded=true`，无横向溢出、KaTeX 错误或残留 `$$`。证据在 `.bot/out/ml02-rework/report.json`，对应 PNG 在同目录。当前模型无图像输入，未声称已看图或视觉通过。

## 提交与剩余

- 六个步骤分别提交并推送，随后分别提交抽屉修复和冷读／出处修复。多次推送被拒后均按要求 `git pull --rebase origin tutorials` 再推，没有 force-push。评分卡、progress 和本报告随后续 `[k2] ` 记录提交推送。
- 等协调复审 ML-03／28／30、相位图与最终分数；主人最终视觉与真实产品验收另计。下一单元按 direction 继续 ML 03–10／12 的静态机制 P0 和 ML-14，不开第 14 章新书。
- 未跑全站回归、真实 SGLang／CUDA、allocator trace、GPU benchmark、reduced-motion 动态切换或全相位手机检查；`G`、`A`、`D` 没有实测值。
