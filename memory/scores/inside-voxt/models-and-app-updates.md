# 第 11 章评分卡 · Model storage and app updates（模型仓库与应用更新站）

日期：2026-11-27（同步协调固定 `26941bb` 复审：Step 5 GO）。评分办法：`.bot/EVAL.md` 第 0 节 R1–R6 与第 2 节原 12 项，每项 0 / 1 / 2。
材料：协调人固定 `fa8d912` 的 Step 1／2 复审、固定 `2760565` 的 Step 3 复审、固定 `3aa0d2d` 的 Step 4 复审（GO）、固定 `26941bb` 的 Step 5 复审（GO），及本轮 transcript、双语深入讲解、动画相位 DOM 审计。本轮模型不能读 PNG，不另记自评分，也不把静态视觉分或机械门当成内容通过。

> **分数状态：** 协调 `6467ab7` 内容基线 **R1–R5 54/60**、原 10 项非视觉 **119/120**、静态 R6 **12/12**、原 #4／#5 **24/24**，合计 R1–R5＋静态 R6 **66/72**；原十二项 **143/144**（协调记录纠偏后基线，见差异记录）。**不通过**（易读基线 R1–R5 54/60）；下表按最新协调分重记。

> **EVAL 第 6 节：** 协调固定 `26941bb` 复审通过 Step 5 的机制返工（GO：四相依次形成 feed 查询、应用内 `Voxt 2.0 → 2.1` 替换、无 feed 时匹配 DMG／发布页、helper 因版本不匹配而拒绝，3/3 转变均改变机制对象），机制 R6 从 `3aa0d2d` 的 **11/12** 升为 **12/12**，逐步 **2、2、2、2、2、2**；原十二项维持 **143/144**（协调记录纠偏：`26941bb` 只升机制分，见差异记录）。整章仍因易读基线 **NO-GO**。

## 协调人独立复审（`6467ab7`）

| 范围 | 分数 |
|---|---|
| 易读 R1–R5 | **54/60** |
| 静态 R6 | 12/12（无 phase 时的静态场景补评） |
| 原十个非视觉项 | **119/120**（逐步 19、20、20、20、20、20；第 1 步 #1 扣分保留） |
| 原 #4／#5 静态视觉 | 24/24 |
| 合计 | **143/144**；R1–R5＋静态 R6 **66/72** |
| 机制 R6（第 6 节，协调 `26941bb`） | **12/12**（逐步 2、2、2、2、2、2） |

**差异记录（已关闭，2026-11-27）：** 固定 `26941bb` 的复审正文曾把原十二项写成 144/144。协调人在 `.bot/memory/review.md` 的「记录纠偏：Voxt 11 原十二项 143/144」一节裁定：该 diff 只改 Step 5 组件相位与生成 transcript，逐步非视觉分仍为 19/20/20/20/20/20＝119/120（第 1 步 #1 扣分保留），原 #4/#5 仍为 24/24，算术合计只能是 **143/144**；上一轮写成 144/144 是协调记录错误，不对应任何内容加分。`.bot/memory/direction.md` lane d 段据此要求 d 撤回 144 的未决差异记录，本卡按纠偏后基线 **143/144** 记录，`866b58b` 的「公布 144/144、差异未决」记录作废。

结论：第 5 步 DMG／发布页条件路由已在各层统一，旧修复未回退；`c3a7773` 关闭第 5 步路由与评分卡合计，第 6 步机制 2/2；固定 `fa8d912` 通过第 1／2 步机制（各 2/2）；固定 `2760565` 通过第 3 步机制（2/2，GO）；固定 `3aa0d2d` 通过第 4 步机制（2/2，GO）；固定 `26941bb` 通过第 5 步机制（2/2，GO）。

| 步 | R1–R5（协调 `6467ab7`） | 原 10 项非视觉（协调） | R1 小学生复述 | 本轮处理 | 日期 |
|---|---|---|---|---|---|
| 1 | 8/10 | 19/20 | 装好应用时只有 280 MB；模型后来单独下载 2.47 GB，约是应用的 9 倍。 | 本轮改为 4 相位，每相只变一个对象、红框跟着它：模型卡 `0 B → 2.47 GB / 9 files`（红框停在模型卡）→ 加法式出现（红框在公式）→ 顶部出现 `2,467,856,503 ÷ 280,000,000 ≈ 8.8×`（红框在比值）；#1 数字代价扣分保留。 | 2026-11-26 |
| 2 | 9/10 | 20/20 | 一个固定提交决定模型库里的九个文件，每个文件都要用指纹核对。 | 本轮改为 4 相位，每相只变一个对象、红框跟着它：固定提交（红框在仓库卡）→ `model.safetensors` 的 SHA-256 打勾（红框在这两行）→ `vocab.json` 的 git blob ID 打勾（红框在这三行）→ `all checks pass`（红框在这一行）。修掉 `c3a7773` 复审的「末相同相新增 vocab ✓ 和 all checks pass，红框却已移到磁盘路径」。 | 2026-11-26 |
| 3 | 9/10 | 20/20 | 一个下载任务同时下模型和小模型，取消后已下的字节留着，下完要每个文件校验通过。 | 本轮改为 4 相位，每相只形成一个机制状态，红框跟随变化对象：进度停在取消点、已下字节保留（红框在进度条）→ 从取消点续传到 70%（红框在进度条）→ 续传满格（红框在进度条）→ 校验全部通过、出现 ✓（红框在状态行）。修掉 `c3a7773` 的「`next start continues` 下直接画满进度，末相校验文字变化在红框外」。 | 2026-11-27 |
| 4 | 9/10 | 20/20 | 用模型会启动一个服务器进程，空闲十分钟请求它停止，文件留在磁盘。 | 本轮改为 4 相位，每相只形成一个机制状态，红框跟随变化对象：服务器卡出现 `starting… → ready`（红框在服务器卡）→ `ready · idle 10/10 min`（红框在状态行）→ `stop request sent` 配 `the process still runs`（红框在状态行）→ `process exits → memory freed` 配 `files stay on disk`（红框在状态行）。修掉 `c3a7773` 的「首相红框在磁盘而服务器状态已变，末相把停止请求与进程退出合在同一相」。 | 2026-11-27 |
| 5 | 9/10 | 20/20 | 发布版有更新源时应用内换应用包；没有更新源时，有匹配的 DMG 就下载安装，没有匹配的才打开发布页；两条路都不碰模型。 | 本轮改为 4 相位，每相只形成一个机制状态，红框跟随变化对象：feed 查询待定（虚线 `update list ?`，红框在左侧面板）→ 应用内替换完成（`Voxt 2.1 on disk`，红框在左侧面板）→ 无源路线决定（`matching DMG` 与 `no match → release page`，红框在决定块）→ 重启前 helper 被拒（红框在拒绝盒）。`RESTART VOXT → UPDATE DONE` 改静态行；条件路由、开发版无更新、15 词 caption 与双语 deep 未动。协调固定 `26941bb` 复审 GO。 | 2026-11-27 |
| 6 | 10/10 | 20/20 | 下载看校验通过，卸载看进程退出，应用更新看重启完成。 | 加 3 相位：下载条件的 ✓ → 卸载条件的 ✓ → 更新条件的 ✓ 依次出现。 | 2026-11-26 |

**合计（协调 `6467ab7` 内容分 + `26941bb` 机制分，未通过）：** R1–R5 **54/60**；原 10 项非视觉 **119/120**；静态 R6 **12/12**，原 #4／#5 **24/24**；原十二项 **143/144**（协调记录纠偏后基线，`26941bb` 只升机制分）；R1–R5＋静态 R6 **66/72**；机制 R6 **12/12**（逐步 2、2、2、2、2、2）。整章仍因易读基线 R1–R5 **54/60** 记 **NO-GO**。

## 本轮修复（第 9 次，只第 4 步；作者证据，协调固定 `3aa0d2d` 已复审 GO）

- 按 direction 的最小单元只改第 4 步；保留第 1／2 步已通过相位，不回改待审第 3 步，不动第 5／6 步、caption、空闲 10 分钟、设置的 5/15/30/60 分钟边界和磁盘字节（2.47 GB、快照文件夹留着）。
- 第 4 步 `PHASE_COUNTS` 3→4：服务器卡 `starting… → ready` → `ready · idle 10/10 min`、`next use → restart` → `stop request sent` 配 `the process still runs` → `process exits → memory freed` 配 `files stay on disk`。旧版末相把「已发停止请求」和「进程退出 → 内存释放」合在同一相，现已拆成两个可逐一辨认的状态：请求发出时进程还在，退出才释放内存。
- 四相红框：首相随变化对象移到服务器卡（旧版红框在磁盘卡，服务器状态却在变），后三相都包住两行状态文字（桌面 y 184–234、手机 y 382–432），不再指向没有变化的对象。手机第 4 步的 LoopProgress 由 `H−44` 上移到 `H−60`，避开 H−28 的脚注。
- 末相舞台文字与旧末相比只多出 `files stay on disk`（字节边界保留），transcript 重生成只差这一行；连续两次生成逐字一致，**1502 词**，SHA-256 `b8e0a68bf731d07bdb93bf73545ea6cf24fe72b283d94feca7046d6338463444`。
- 审计 `.bot/out/voxt11-step4-audit.mjs`（可重跑，证据在 `.bot/out/voxt11-step4-audit/`）：英中桌面 1440×900 ＋ 英中 360／390／430 px 共 **8 组 × 4 相 = 32 个视图**，采集前核对 hydration（相位实际循环）、counter `04 / 06`、`data-animation-step/phase`、响应式 viewBoxWidth（桌面 720／手机 300）和 600 ms settling，按组件 bbox 完整截取。断言：四相状态行互不相同；相位 2 只含停止请求、不含进程退出；相位 3 只含进程退出、不含请求行；相位 1 含空闲上限；每相都保留「服务器退出后还留着」和 `2.47 GB`；相邻相位变化的文字必须完整落在当相红框内（含相位 3→0 回绕）；文字重叠、SVG 出界、红框描边压字均为 **0**，最低可见字体 **10.76 CSS px**（zh-360 的「循环」）。
- 首次采集发现 6 组视图里各有 2 张相邻相位 PNG 逐字节相同（DOM 状态互异，为后台 compositor 冻结帧，同 k2 在 ML 08 的问题）。已按同一修法把每组视图改用独立浏览器，并在采集时即时断言 PNG 不得与早先相位重复；重跑后 **32/32 张 PNG 全部不同**。
- 当前模型不能读 PNG，未记成已读视觉证据；以上相位证据为作者 DOM／几何实测，协调固定 `3aa0d2d` 已实读 32 张相位图并记本步 GO。

### 机械门槛（本轮，只第 4 步）

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=11 node scripts/transcript.mjs http://localhost:4473/learning-sglang`：6 步，无出界、重叠或脚注告警；连续两次生成逐字一致。
- `BOOK=voxt ONLY=11 STEP=4 npm run readability`：0 机械问题。`BOOK=voxt node scripts/deep-check.mjs 11`：通过。`BASE=…4473 BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：all clear。
- `BOOK=voxt ONLY=11` 英、`LANG=zh` 中、`LANG=zh STEP=4` 中 `mobile`（位置参数指向 4473）：360／390／430 px 均 no layout breaks，中文第 4 步字号门通过。

## 本轮修复（第 8 次，只第 3 步，协调 `2760565` 已复审 GO）

- 按 direction 的最小单元只改第 3 步；第 4／5 步留给后续轮，不动第 1／2／6 步、caption、2 GB 空位、Silero VAD、取消语义和字节／百分比算式。本 clone 的 `node_modules` 又是指向主 checkout 的符号链接，已换成本目录真实安装，未再经过主 checkout。
- 第 3 步 `PHASE_COUNTS` 3→4：取消停在 40%、字节保留 → 从取消点续传到 70% → 续传满格 → `Checks: all 9 files pass; the job is done.` 与 `2.47 GB ✓`。取消标记线在四相都保留，只作已发生取消的记录，不再随相位消失。
- 四相红框：前三相包住进度条、取消标记和状态行（填充宽度与状态文字都在框内），末相移到状态行（变化对象是校验文字与 ✓）；不再指向没有变化的 CHECK 卡。复审指出第一版前三相框底在状态文字上方、相位 1／2 变化的状态行在框外（live DOM `statusInsideFocus: false`），已把前三相框加高到含状态行，桌面框底 y=184、手机 y=176。末相舞台文字与旧末相逐字相同，transcript 重生成无 diff。
- 审计补「变化元素必在框内」断言：逐视图配对相邻相位的文本槽位与填充宽度，任何变化元素的 bbox 必须完整落在当相 `.motion-focus` 内（相位 0 校验下一相要变的对象）；32 个视图全部通过，桌面相位 1／2 的 `statusInsideFocus` 与 `fillInsideFocus` 均为 true。

### 机械门槛（本轮，只第 3 步）

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=11 node scripts/transcript.mjs http://localhost:4471/learning-sglang`：6 步，无出界、重叠或脚注告警；生成文件与已提交版本**无 diff**。
- `BOOK=voxt ONLY=11 STEP=3 npm run readability`：0 机械问题。`BOOK=voxt node scripts/deep-check.mjs 11`：通过。`BASE=…4471 BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：all clear。
- `BOOK=voxt ONLY=11` 英、`LANG=zh` 中、`LANG=zh STEP=3` 中 `mobile`（脚本只认位置参数，前一次误用 `BASE=` 连到 4321 外部服务的结果作废）：360／390／430 px 均 no layout breaks，中文第 3 步字号门通过。
- 逐相审计 `.bot/out/voxt11-step3-audit.mjs`（可重跑，证据在 `.bot/out/voxt11-step3-audit/`）：英中桌面 1440×900 ＋ 英中 360／390／430 px 共 **8 组 × 4 相 = 32 个视图**，相位身份由 `data-animation-phase` 轮询确认，核对 hydration、counter `03 / 06`、响应式 viewBoxWidth 和 settling 后截取完整组件。填充宽度逐相 248→434→620→620（手机 96→168→240→240），取消标记四相均在，✓ 只在末相出现；文字重叠、SVG 出界、红框描边压字均为 **0**，最低可见字体 **10.76 CSS px**。32 张 PNG 已保存；当前模型不能读 PNG，未记成已读视觉证据。

## 本轮修复（第 7 次，只第 2 步，已经 `fa8d912` 复审通过）

- 按 direction 的最小单元只改第 2 步；第 3–5 步留给后续轮。本 clone 的 `node_modules` 曾是指向主 checkout 的符号链接（Vite 写缓存被围栏拒），本轮换成本目录真实安装，未再经过主 checkout。
- 第 2 步 `PHASE_COUNTS` 3→4：`all checks pass` 与 vocab ✓ 拆成两相，磁盘路径一相取消（它从不变，不该被红框指）。四相红框：仓库卡 → safetensors 两行 → vocab 三行 → `all checks pass` 一行。
- 桌面仓库卡内英文 `= first 7 of the full commit` 宽 251 px、越出卡片并被相位 0 红框边穿过，改为与手机一致的 `= first 7 chars`；中文未动。transcript 重生成只差这一行。
- 逐相 DOM 审计（英桌面 1440×900 ＋ 中文 390 px 手机，相位身份由 `data-animation-phase` 确认，focus rect 经 240 ms 过渡后采 `getBBox()`）：p1 只新增 SHA-256 ✓、p2 只新增 git blob ✓、p3 只变 `all checks pass`，红框严格包住当相变化行，全部 8 个采样的 stroke 与相邻文字相交数为 **0**。

### 机械门槛（本轮，只第 2 步）

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=11 npm run transcript`：6 步，无出界、重叠或脚注告警；与组件一致（仅上述一行英文变化）。
- `BOOK=voxt ONLY=11 STEP=2 npm run readability`：0 机械问题。`BOOK=voxt node scripts/deep-check.mjs 11`：通过。`BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：all clear。
- `BOOK=voxt ONLY=11` 英、`BOOK=voxt ONLY=11 STEP=2 LANG=zh` 中 `mobile`：360／390／430 px 均 no layout breaks。
- 当前模型不能读 PNG；以上相位证据为作者 DOM／bbox 实测，协调固定 `fa8d912` 已实读相位图并记本步 GO。

## 本轮修复（第 6 次，只第 1 步，已经 `fa8d912` 复审通过）

- 按 direction 的最小单元，从 `ls-d-1126-163623` 旧草稿只移植第 1 步相关 hunks；第 2–5 步留给后续轮，旧草稿原树未动。
- 第 1 步 `PHASE_COUNTS` 3→4：模型卡 `0 B / 0 files` → `2.47 GB / 9 files` 单独一相（红框留在模型卡），加法式单独一相（红框移到底部公式），顶部比值 `2,467,856,503 ÷ 280,000,000 ≈ 8.8×` 单独一相（红框移到副标题）。修掉 `c3a7773` 复审的「第二相同相改模型卡＋顶部数字＋底部公式、第三相红框移到没变化的应用卡」。
- 副标题改为 `the model arrives separately from the app`，末相才换比值；公式前两相留空。末相舞台文字与旧末相逐字相同，transcript 重生成无 diff。
- 组件根节点补 `data-animation-step` / `data-animation-phase` / `data-animation-final-phase`，transcript 末相位采集可复现（对六步都生效，其余五步内容未改）。
- 同步机制栏为协调 `c3a7773` 的 **7/12**（逐步 1、1、1、1、1、2），关闭 review.md 的评分卡同步项；本轮不自行把第 1 步记为 2/2。

### 机械门槛（本轮，只第 1 步）

- `npx astro build --config .astro/local.config.mjs`：60 页通过（node_modules 是主 checkout 的符号链接，Vite 缓存走本 clone 的 `.astro/vite-cache`，dev 用独立端口 4399）。
- `BOOK=voxt ONLY=11 node scripts/transcript.mjs http://localhost:4399/learning-sglang`：6 步，无出界、重叠或脚注告警；生成文件与已提交版本无 diff。
- `BOOK=voxt ONLY=11 STEP=1 npm run readability`：0 机械问题。`BOOK=voxt node scripts/deep-check.mjs 11`：通过。`BASE=...4399 BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：all clear。
- `BOOK=voxt ONLY=11 STEP=1` 英／中 `mobile`：360／390／430 px 均 no layout breaks。
- 桌面 1440×900 `getScreenCTM()` 字号：英文最低 **11.50 CSS px**、中文最低 **12.31 CSS px**（≥10 门）。
- 逐相 DOM 审计（英桌面＋英手机，相位身份由 `data-animation-phase` 确认）：p0→p1 只变模型卡两行（红框留模型卡），p1→p2 只出现公式（红框在公式），p2→p3 只变副标题比值（红框在副标题）；截图存 `.bot/out/voxt11-step1-phases/`。当前模型不能读 PNG，未记成已读视觉证据。

## 本轮修复（第 5 次，协调 `c3a7773` 已复审：机制 7/12）

- 六步都加了 `phase`／`nextLap()`／`<LoopProgress>`：每步 3 个 hold 相位，相位里改舞台对象和数字，不只是红框巡游。
- 第 1 步：模型大小从 `0 B` 长到 `2.47 GB`，再出现模型／应用的比值。
- 第 2 步：两个指纹检查分别打勾，最后显示全部通过。
- 第 3 步：下载条从取消点续传满格，末尾显示校验通过。
- 第 4 步：服务器从启动到就绪、空闲十分钟、发停止请求、进程退出释放内存。
- 第 5 步：应用包替换、重启前 helper 被拒、重启后更新完成。
- 第 6 步：三种完成条件的 ✓ 依次出现。
- 评分卡：按协调 `6467ab7` 的逐步分与合计重记（54/60、119/120、24/24、143/144，逐步 R1–R5 8/9/9/9/9/10、原 10 项 19/20/20/20/20/20），并明确机制 R6 旧值 0/12。

## 机械门槛（本轮修复后）

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=11 node scripts/transcript.mjs http://localhost:4322/learning-sglang`：6 步，无出界、重叠或脚注告警；连续两次逐字一致（SHA-256 `22f8695915e45441d6f38bbec9ccf996a6be5dd0d05cbf922d74cc13cbea696a`，1510 词，较 pinned 只多 `a card then asks for a restart` 一行）。
- `BOOK=voxt ONLY=11 STEP=5 node scripts/readability.mjs`：0 机械问题。
- `BOOK=voxt node scripts/deep-check.mjs 11`：通过。
- `BASE=http://localhost:4322/learning-sglang BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：通过。
- 英中本章 `mobile`：360、390、430 px 无布局断裂；`ONLY=11 STEP=5 LANG=zh` 字号门通过。
- DOM 相位审计（`.bot/out/voxt11-step5/audit.mjs`，英中 × 桌面／390 px）：第 5 步 p0→p1、p1→p2、p2→p3 每次只有一个对象的文字新增／消失，且全部落在红框内；四相均无文字出界、无重叠。

## 待办与边界

- 协调固定 `2760565` 已复审第 3 步四相证据（`.bot/out/voxt11-step3-audit/`）并记 GO；固定 `3aa0d2d` 已复审第 4 步（32 张相位图与双语高 viewport 重拍）并记 GO；固定 `26941bb` 已复审第 5 步并记 GO（两次 transcript 均 **1,510 词**、SHA-256 `22f8695915e45441d6f38bbec9ccf996a6be5dd0d05cbf922d74cc13cbea696a`，英中各四相最低可见字 **10 CSS px**），机制 R6 升为 **12/12**。整章仍因易读基线 R1–R5 **54/60** 记 **NO-GO**，不能记整章完成。Voxt 10 displayed Step 1 的 `bd884d2` 冻结待协调固定复审；Voxt 12 排在性能公开谱系（`docs/plan-voxt.md`）与本书 P0 清理之后，当前不开。
- 本 lane 模型无图像输入，上述 **80 张**相位图（第 3 步 32、第 4 步 32、第 5 步 16）为作者证据；协调固定 `2760565`（第 3 步）、`3aa0d2d`（第 4 步）与 `26941bb`（第 5 步）已分别实读相位图并各记 GO。
- 本轮未跑真实 Voxt、模型下载、更新或模型进程；事实按 pinned `sglang-omni origin/main@c2fc0f102c61daee13c73ced280970a7d72ed12d` 核对。模型不能读 PNG；六步的视觉验收已由上述固定复审完成，主人最终视觉与产品验收另计。
