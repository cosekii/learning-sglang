# lane k1 本轮报告

日期：2026-11-26。本轮在既有 Omni 11、13、14 记录上，只返工 Learning SGLang Omni 第 15 章第 1、6 步机制、一个手机 dispatch 目标和相关记录。未碰其他书、其他 lane 的章节、第 1 本受保护英文原文或 `.bot/memory/`。

## 已处理的 review 项

### Omni 11 `fish-s2-pro`

- 按协调对 `1df0d34…d86329d` 的 GO 结论同步评分卡和 progress 表：R1–R5 **80/80**、原十个非视觉项 **160/160**、R6 **16/16**、原 #4/#5 **32/32**、原十二项 **192/192**。
- cached-prefix／fingerprint 已关闭，不再保留 **191/192** 和协调待审记录；live cache-hit 与主人最终验收另计。

### Omni 13 `qwen3-omni-deployment`

- 按协调对 `720a6f7` 的内容与已读静态视图 GO 结论同步评分卡和 progress 表：R1–R5 **80/80**、原十个非视觉项 **160/160**、原 #4/#5 **32/32**、原十二项 **192/192**。
- 第 6 步改为 **10/10、0 个未决文本洞**，不再保留默认 32 主语洞。完整动画 R6 未重评，主人视觉验收仍待；不重做教程，不记 `complete-under-EVAL`。

### Omni 14 `slow-reader-backpressure`

- 同步 `bfc6517…0f4cba0` 的协调 verdict：第 6 步失败态已关闭，机制 R6 由 `955e518` 的 **15/16** 升为 **16/16**，八步均 **2/2**。
- R1–R5 **80/80**、原十个非视觉项 **160/160**、静态原 #4/#5 **32/32**、原十二项 **192/192**。评分卡和 `memory/progress.md` 不再停留在 14/16 或「源码／DOM 16/16 待复审」。记录同步后为 `complete-under-EVAL`，主人最终验收另计。
- 记录提交：`e0c915f`。

### Omni 15 `router-worker-selection`

- 保留协调已关闭的五组内容返工和英文手机第 8 步 handoff；本轮没有重做这些项。
- 第 1 步由两个未检查候选开始，先排除不收图片的 A，再确认 B，最后 dispatch 到 B。头部在 phase 0、1 分别写 `2 to check`、`1 to check`，phase 2 接受 B 后才写 `1 compatible`。手机 dispatch 从请求右侧绕到 B。
- 第 6 步由 active 数和 recency 实时推导四次选择，逐相显示最小集合、顺序扫描、active `before→after` 和队尾更新。保留 B、C、B、C 与策略对照，另加 active `[2,1,1]`、recency `[A,C,B]` 的独立轮换并列例，由 C 获胜。
- 协调内容与静态基线保持 R1–R5 **80/80**、原十个非视觉项 **160/160**、静态 R6 **16/16**、原 #4/#5 **32/32**、原十二项 **192/192**。协调机制分保持 **14/16**（1、2、2、2、2、1、2、2）。本轮源码＋live DOM 复核只作非视觉参考，不换算成机制分，也不作为 EVAL §6 硬门通过证据；不记 `complete-under-EVAL`。

## 验证

- `npx astro --config .astro/local.config.mjs build`：60 页通过。忽略的本地配置隔离 Vite cache 并允许 shared `node_modules` 符号链接。
- 本章默认 `transcript`：8 步，无布局问题，生成文件已提交；8 步 `readability` 0 机械问题；`deep-check 15` 通过。一次本地 transcript 出现 unsettled await 且未写出结果，换新 CDP 端口后完整重跑通过。
- 英中全章 `mobile` 在 360／390／430 px 通过；中文第 1、6 步字号门通过。`WAIT=13000` 的本章 `zh-check` 和 `git diff --check` 通过。忽略的 `.astro/run-with-cdp-port.mjs` 只替换检查脚本的 CDP 端口，避免连接其他 lane 的浏览器。
- 第 1 步 4 相、第 6 步 11 相均核对 live SVG 状态、文本与几何。英文桌面和中文 390 px 手机共 **30 张**相位 PNG 在 `.bot/out/omni15-k1-step1/`、`.bot/out/omni15-k1-step6/`；未发现文字出界、重叠或低于 10 CSS px。
- 独立只读 reviewer 对两项后续加强均给出源码、transcript 和 live DOM GO，但不换算成机制分。深入讲解有 4 张图在 `.bot/out/omni15-k1-deep/`；两次补跑抽屉 DOM 检查时 Chrome 未能启动，未计为通过。
- 当前模型和 reviewer 都不能读取 PNG。上述证据不冒充 PNG 冷读、协调视觉 verdict 或主人最终验收。

## 提交

- `ed092b5 [k1] Animate Omni 15 compatibility filtering`：第 1 步输入驱动的兼容性过滤。
- `e128beb [k1] Animate Omni 15 least-requests selection`：第 6 步 recency、并列与 active 更新。
- `8c8ccfa [k1] Fix Omni 15 phone dispatch target`：手机 dispatch 绕到 B。
- `540c9e0 [k1] Clarify Omni 15 compatibility count phases`：接受 B 后才显示 compatible。
- `cc1377b [k1] Show Omni 15 rotated-order tie break`：独立轮换并列由 C 获胜。
- 教程提交均已推 `origin/tutorials`；被拒后均 `git pull --rebase origin tutorials` 再推，没有 force-push。评分卡、progress 和本报告随最后一条 `[k1]` 记录提交推送。

## 剩余

- 等具备图像输入的评审读取 `.bot/out/omni15-k1-step1/{en,zh-phone}-p0..3.png` 和 `.bot/out/omni15-k1-step6/{en,zh-phone}-p0..10.png`，再由协调人更新正式机制 verdict。复审前不开第 16 章。
- 未跑全站回归、真实 router、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。

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
