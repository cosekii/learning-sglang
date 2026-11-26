# lane k1 本轮报告

日期：2026-11-26。本轮处理 Learning SGLang Omni 第 11、13、14、15 章；`24338ba` 修改了 `RouterWorkerSelection.svelte` 的英文手机收尾文案，其余教程改动为评分记录。未碰其他书、第 1 本受保护英文原文或 `.bot/memory/`。

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

- 保留协调人在 `6fb3c27…31c5e08` 关闭的五组内容返工：`2xx`／timeout、RequestLease、例子承接、`drain` 和第 6 步策略对照均未回退。
- 复核既有 `728833f…2849014` 八步动画。独立源码冷读给八步机制 R6 各 **2/2**；DOM 验证英文桌面 40 个相位、中文手机 40 个相位和英文手机第 8 步 5 个相位，共 **85 个**内容状态样本。
- 新发现并修复英文手机第 8 步第二行收尾问题固定显示中文的问题；现在为 `When do later requests avoid C?`，中文保持原文。修复提交：`24338ba`。
- 协调内容与静态基线保持 R1–R5 **80/80**、原十个非视觉项 **160/160**、静态 R6 **16/16**、原 #4/#5 **32/32**、原十二项 **192/192**。协调机制基线为 **0/16**（`6fb3c27…31c5e08`）；作者源码和 DOM 证据为 **16/16（待协调读图）**，不记协调机制分或 `complete-under-EVAL`。

## 验证

- `npx astro --config .astro/local.config.mjs build`：60 页通过。这是 shared `node_modules` 符号链接导致默认 build 出现 EPERM 后使用的 local-only workaround；配置位于忽略的 `.astro/`，输出保存在 `.bot/out/omni15-review/build-local.log`。
- `WAIT=1500 BOOK=omni ONLY=15 npm run transcript`：8 步，无布局问题，生成文件无差异。`BOOK=omni ONLY=15 npm run readability`：0 机械问题；`BOOK=omni node scripts/deep-check.mjs 15`：通过。
- 英文全章复跑：`BOOK=omni ONLY=15 node .astro/mobile-free-port.mjs http://localhost:4330/learning-sglang`。中文第 8 步字号门复跑：同一 runner 加 `STEP=8 LANG=zh`。local-only runner 只把 `scripts/mobile.mjs` 的 CDP 端口改为空闲的 **9547**；两项均在 360／390／430 px 通过，输出分别在 `mobile-en.log` 和 `mobile-zh-s8.log`。
- 本章 `zh-check`、`git diff --check`：通过；两张 `zh-check` PNG 单独计，不计入相位图。
- `node .astro/check-omni15.mjs` 已在 `24338ba` 后重跑：85 个相位均得到预期数量的不同 SVG markup，英文手机收尾问题完整。结果在 `phase-check.json` 和 `phase-check.log`。DOM 签名只证明 markup 随相位变化，不证明可读性，也不代替协调人读图。
- 相位证据：英文桌面 40 张、中文手机 15 张、英文手机第 8 步 1 张，共 **56 张**，另有 16 张接触表，位于 `.bot/out/omni15-review/`。英文手机图已于 **15:00:20** 重拍，晚于 `24338ba` 的 **14:37:38**；两张 `zh-check` 图另计。当前模型不能读取 PNG，协调读图和主人最终验收仍待。

## 提交

- `e0c915f [k1] Sync Omni 14 coordinator scores`：已推 `origin/tutorials`。
- `24338ba [k1] Fix Omni 15 English phone handoff`：rebase 后已推 `origin/tutorials`。
- `fa4112c [k1] Record Omni 15 animation checks`：已推第 15 章评分卡、progress 和报告。
- 本次修正 Omni 15 证据、progress 基线和本报告，随 `[k1]` 记录提交推送。

## 剩余

- 本轮待办只剩协调人读取 Omni 15 八步相位图并确认机制 R6，以及主人最终验收。Omni 15 不记 `complete-under-EVAL`，不开第 16 章。
- 本轮后续补记只改记录和本地证据，未再改教程源码；未跑全站回归、真实 router、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。

---

# lane k2 本轮报告 · ML Systems 13 全章返工

日期：2026-11-26。范围只含 ML Systems 第 13 章、双语深入讲解、生成 transcript、评分卡、进度和本报告；未动其他 lane 的书、第 1 本受保护英文原文或 `.bot/memory/`。

## 修复的 open review 项

- 补齐第 8 步，并将八步从红框导读改为真实机制相位：token 合并、mask 赋值、观察切片、图片分叉、张量拼接、独立停止示例、模型—工具返回、右侧 padding 与两种 mask。
- 第 1 步修复 `P P = 2`；第 2 步修复「Mask 1 learns」主体；第 3 步补清观察后的 `assistant generation prompt`，并用 `U/enc` 消除 `D/E` 冲突。
- 第 4 步用 `Q=[D0,D1]` 表示字典，第 5 步用 `T0/T1` 表示其中的张量，并用 `r/X_k` 表示行数和合并结果；不再让 `B/R` 跨步改义。`key k` 已在图上定义为共有字段名。
- 第 6 步把三个出口标为独立示例，红框改标 `example`；橙色只表示 TRUNCATED，蓝色只表示 COMPLETED。
- 第 7 步统一 `ToolAgentLoop` 和 `request_id u`，补实际返回边。只有调用有效、`O` 有余量且轮数未满时才继续，其他停止规则不再被漏掉；删除图上没有的 LRU 细节。
- 第 8 步把样本改名 `S1/S2`，避免与动作 `A/B` 冲突；章末问题指向可见的 `A`、`O` 和训练 batch。旧桌面卡片长文案及英文手机图例已缩短，末相位 transcript 使用 6000 ms 采样。

## 分数与独立复核

- 旧协调基线：R1–R5 **58/70**、原十个非视觉项 **123/140**、机制 R6 **10/14**、静态原 #4/#5 **24/28**、原十二项 **147/168**，且只有 7 步。
- 当前作者与独立只读复审：R1–R5 **80/80**、原十个非视觉项 **160/160**、机制 R6 **16/16**、未决内容洞 **0**。独立复审在 `c0ab0de` 给出 **GO（source/content/mechanism）**，没有剩余内容或机制阻塞。
- 原 #4/#5 和原十二项总分仍不记：当前模型不能读取 PNG，协调复审和主人最终视觉验收未完成，本章不标 `complete-under-EVAL`。评分卡和 `memory/progress.md` 已同步这些边界。

## 验证

- `npx astro --config .astro/k2.config.mjs build`：60 页，通过。
- `WAIT=6000 BOOK=ml-sys ONLY=13 npm run transcript -- http://127.0.0.1:4385/learning-sglang`：8 步，无 caption、出界、重叠或脚注问题。
- `BOOK=ml-sys ONLY=13 npm run readability`：8 步，0 机械问题。
- 英中全章 `mobile`：360／390／430 px 全部通过。
- `BOOK=ml-sys node scripts/deep-check.mjs 13`、`zh-check`、`git diff --check`：通过。
- `node .astro/check-ml13.mjs 1` 至 `8`：机制相位、ARIA 和卡片内部边界全部通过。
- `node .astro/check-ml13-deep.mjs`：16 个深入讲解抽屉全部打开，无残留公式标记、KaTeX 错误或横向溢出。
- 固定 CDP 端口与其他 lane 冲突时，临时改用进程派生端口，检查后已还原共享脚本。截图在 `.bot/out/ml13-review/`，代表图为 `s7-final.png` 和 `s8-phone.png`；PNG 未冒充已读视觉证据。

## 提交

- 八步：`fd898c8`、`229fd84`、`016e346`、`efe6247`、`8a88632`、`23e9a9f`、`1b257ff`、`8d85c17`。
- 后续复核：`6edd684`（继续条件与 `u`）、`3d0dba9`（字典／张量）、`c0ab0de`（样本命名）。全部已推 `origin/tutorials`；被拒时均按要求 `git pull --rebase origin tutorials` 后重推，没有 force-push。
- 评分卡、progress 和本报告随最后一条 `[k2] ` 记录提交推送。

## 剩余

- 等协调人复审并读取实际 PNG，主人最终视觉验收另计；复审前不开第 14 章，继续跳过缺原始来源的第 11 章。
- 未跑全站回归、真实训练、rollout、工具调用、VLM、GPU benchmark 或质量评测。

---

# lane d 本轮报告 · Inside Voxt 08 返工

日期：2026-11-26。范围只含 Inside Voxt 第 8 章 `personal-dictionary` 的组件、双语深入讲解、生成 transcript、评分卡、进度和本报告；未动 Omni、ML Systems、第 1 本受保护英文原文或 `.bot/memory/`。

## 修掉的 review 项

协调 `983469c` 仍判 NO-GO 的机制与舞台事实：

- 第 1 步：原识别框不再被替换结果覆盖。识别框固定显示 `call Preeya.`，另加独立「替换后」框在第三相显示 `call Priya.`；高亮依次指向识别框、词典行、替换框。关闭原 #10 的舞台事实扣分（待复审）。
- 第 5 步：内部 `candidate` 移出 user，放进两条例子的组装区。右面板并排显示例 A（输入 `call Priya.`，候选 `Priya`，user 有 `<glossary>` 和输入）与例 B（输入 `call Sam.`，候选 `none`，user 只有 `call Sam.`）。两个输入不同，不再由同一 `call Priya.` 产生互斥结果；每相只推进 A 的「无候选→候选→术语表」。
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
- 截图在 `.bot/out/voxt08-shot/`（英文桌面第 1、2、3、4、5、7 步，中文手机第 4、5 步）。当前模型不能读 PNG，未把这些图记成已读视觉证据。

## 提交

- 教程与 transcript：一条 `[d]` 提交。
- 评分卡、progress 和本报告：随记录提交。
- 全部推 `origin/tutorials`；被拒时 `git pull --rebase origin tutorials` 后重推，不 force-push。

## 剩余

- 等协调人复审第 1、2、3、5、7 步的新相位图和两处舞台事实；复审通过后才做 Voxt 11，再 10，最后 `12-meeting-capture-modes`。
- 未跑全站回归、真实 Voxt、模型或语音服务；主人最终验收另计。
