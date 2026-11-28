## 第 1 步 · 这条路线和三种证据

> **一句话：** 第 15 章收尾时问哪些结论有证据；本章把三种证据——代码测试、固定样本评测、真机检查——挂上本书的六站路线来回答。

### 舞台上

- 问题条引用第 15 章第 6 步的收尾问题：哪些结论有测试或评测证据？
- 六站路线回来，站名沿用第 1 章第 2 步：你按一下 → helper → 声音 → 文字 → 整理文字 → 看到文字 → 保存文字。
- 三张标签卡逐个出现，各带颜色和一句大白话：**代码测试**（蓝色）——app 自己考自己，随时能再跑一遍；**样本评测**（琥珀色）——固定录音，打分，每次都重放同几段；**真机检查**（深色）——人在真机上做，伪造不了。
- 本章地图：测试（2）、样本（3）、真机（4）、日记（5）、全图（6）。

### 这张地图在本书里

每种证据各讲一步，然后日记回答本章另一个问题——日志怎样帮人定位问题——最后一步给路线贴标签。标签是本章的图例，不是覆盖审计：一站有标签，表示本书在这里展示过钉住的证据，不表示这站的一切都被证明。

本深入讲解不展开：性能谱系（哪次改动让哪站变快）——本书另行跟踪，前面章节引用的每个性能数字都在原地带着自己的样本、机器和状态；这套口径本身（怎么量、怎么分层）收在第 3 步。

### 接下来

第一种：515 份测试文件，以及其中三份钉住了什么。

## 第 2 步 · 代码测试：515 份自检

> **一句话：** 固定的源码树里有 515 份 Go 测试文件；每份钉住一个 app 必须保住的行为，其中三份钉的是本书已经展示过的行为。

### 舞台上

- 左侧面板按归属数测试文件：root 包 258、session 53、meeting 36，再是 asr 16、omni 13、llm 10、compose 8 和其余各处 121。
- 合计面板：258 + 53 + 36 + 16 + 13 + 10 + 8 + 121 = 515 份测试，每份钉住一个行为，每次改动后再跑。
- 三个钉住的例子：第 4 章第 4 步的 9 秒上限和 300 ms 停顿就是一份测试的夹具；一个假 helper 按指令崩溃又重启（第 2 章）；有测试盯着钥匙永远进不了日志（第 5 步）。

### 树里的计数

计数是在固定版本上用 `git ls-tree` 做的：`Voxt/**` 下有 515 份以 `_test.go` 结尾的文件——root 包 258 份、`internal/` 256 份、`scripts/` 1 份。`internal/` 的细分包括 session 53、meeting 36、asr 16、omni 13、llm 10、compose 8 和 archtest 7。一份文件里有多条检查，所以数的是文件，不是断言。

三个例子都是真实测试。第 4 章第 4 步的 9 秒上限、300 ms 停顿和 10 秒录音来自公开的 `SplitPCM` 夹具（`Voxt/internal/asr/split_test.go`）。supervisor 测试驱动一个假 helper（`VOXTNEW_FAKE_HELPER`）走过握手、PCM 采集、取消、卡住的取消、崩溃重启、协议不匹配和乱码（`Voxt/internal/helper/supervisor_test.go`；覆盖清单见 `Voxt/docs/helper-protocol.md`）。日志测试覆盖轮转、丢行警告和打码路径（`Voxt/internal/logs/logs_test.go`）。

台上没画：架构守卫（`internal/archtest`），它解析 Go 源码强制 import 规则和文件大小——它检查代码的形状，不是用户看得见的行为。

### 接下来

第二种：31 段固定录音，每次都按同一方式打分。

## 第 3 步 · 样本评测：31 段固定录音

> **一句话：** 评测文档定义了 31 段合成嗓音的录音，每次运行都给它们打分——并在文档自己的文字里警告：真人听写分数更差。

### 舞台上

- 29 段短录音（共 169 秒）和 2 段长录音（95 秒和 104 秒）：29 + 2 = 31 段固定录音，每次都重放这几段。嗓音是合成的——模型念稿子，不是真人。
- 一次打分作例子：词典测试（第 8 章）。10 个听写术语，有词典作语境落上 7 个，没有落上 4 个。
- 三条警示：评测文档自己说真人听写分数更差；分人的 11/11 是旧口径（第 14 章第 6 步）；整理的评测是留下的记录，不再跑了。

### 文档里的评测集

评测集在 `testdata/eval/`：29 段短录音加 2 段长的，按 zh-filler / zh-plain / en / mix / dict / dict2 / long 分组，全部是 Qwen3-TTS 合成嗓音——「录音棚级的干净合成语音：没有噪声、没有口音、没有真实的犹豫。真人听写分数会更差。」（`Voxt/docs/eval.md` 评测集一节）。分数是归一化错误率（中文 CER、英文 WER）加术语和故障检查。跑法是 `VOXTNEW_EVAL=1` 下的 `TestEvalASR`、`TestEvalLongASR` 和 `TestEvalDictASR`；舞台上的词典数字是文档的语境偏置结果：有词典 7/10，没有 4/10。

舞台写明的两条边界。分人 11/11 是旧口径下测的——每个标签按多数嗓音、只取最后一轮——在 PR 的 1:1 匹配新口径下没有重跑（`Voxt/docs/MTDEvaluation.zh-CN.md` 2026-11-17 的注）。文档里大块的语言模型评测章节标了历史：那些评测跑的是已退役的 `voxtnew-llm`，随它一起被移除（`eval.md` 跑法一节），所以那里的「整理分数」是记录，不是当前的保证。

台上没画：文档的其他结果（语言提示、语气词、长听写决策、缓存上限）。它们共享同一条合成嗓音边界。

### 公开评测口径证据

前几章引用的性能数字共用同一套口径，定义和公开状态收在这里（每条保留 PR、测量 setup 与边界；不来自 pinned 代码基线）：

- **口径**：「从停到…」三个指标分开记——Stop-to-text（文字出现）、Stop-to-insert（文字插进目标 app）、Stop-to-paste（文字进剪贴板），不混写。测量环境也分层不混写：fake clock、fake provider、离线回放、回放 ASR 加真实 provider、完整真实 App。每个数字带测量 head、机器、样本和证据等级。合入（MERGED）、beta、stable、真机验收是四层：合入不等于发布，发布不等于真机验收。
- **测量与工具链**：[PR #4525](https://github.com/sgl-project/sglang-omni/pull/4525)（OPEN）、[PR #4529](https://github.com/sgl-project/sglang-omni/pull/4529)（已关闭 `6430e7890d8f`，未合并）、[PR #4389](https://github.com/sgl-project/sglang-omni/pull/4389)（已关闭 `44e250c9eec3`，未合并）、[PR #4431](https://github.com/sgl-project/sglang-omni/pull/4431)（OPEN/DRAFT）、[PR #4435](https://github.com/sgl-project/sglang-omni/pull/4435)（OPEN）、[PR #4449](https://github.com/sgl-project/sglang-omni/pull/4449)（OPEN）、[PR #4671](https://github.com/sgl-project/sglang-omni/pull/4671)（OPEN/CHANGES_REQUESTED）、[PR #4692](https://github.com/sgl-project/sglang-omni/pull/4692)（OPEN）、[PR #4693](https://github.com/sgl-project/sglang-omni/pull/4693)（OPEN）。
- **基准与回放**：[PR #3867](https://github.com/sgl-project/sglang-omni/pull/3867)（已合并 `950e4ded4e5c` / `0a624b1e7974`）、[PR #3892](https://github.com/sgl-project/sglang-omni/pull/3892)（已合并 `3dd3c958cb27` / `5f03f7e9f1c1`）、[PR #4103](https://github.com/sgl-project/sglang-omni/pull/4103)（已关闭，未合并）、[PR #4162](https://github.com/sgl-project/sglang-omni/pull/4162)（OPEN/DRAFT）、[PR #4168](https://github.com/sgl-project/sglang-omni/pull/4168)（OPEN/DRAFT）、[PR #4423](https://github.com/sgl-project/sglang-omni/pull/4423)（OPEN/DRAFT）、[PR #3411](https://github.com/sgl-project/sglang-omni/pull/3411)（OPEN）、[PR #3663](https://github.com/sgl-project/sglang-omni/pull/3663)（OPEN）、[PR #3728](https://github.com/sgl-project/sglang-omni/pull/3728)（OPEN）。
- **golden 与质量门禁**：[PR #2936](https://github.com/sgl-project/sglang-omni/pull/2936)（OPEN/DRAFT）、[PR #2948](https://github.com/sgl-project/sglang-omni/pull/2948)（已关闭，未合并）、[PR #2992](https://github.com/sgl-project/sglang-omni/pull/2992)（OPEN）、[PR #3064](https://github.com/sgl-project/sglang-omni/pull/3064)（已合并 `b19521e6e67a` / `9e3881bf0116`）、[PR #3410](https://github.com/sgl-project/sglang-omni/pull/3410)（已关闭，未合并）、[PR #3497](https://github.com/sgl-project/sglang-omni/pull/3497)（OPEN）、[PR #3866](https://github.com/sgl-project/sglang-omni/pull/3866)（OPEN/DRAFT）、[PR #4081](https://github.com/sgl-project/sglang-omni/pull/4081)（OPEN/DRAFT）、[PR #4273](https://github.com/sgl-project/sglang-omni/pull/4273)（已关闭，未合并）、[PR #4376](https://github.com/sgl-project/sglang-omni/pull/4376)（已合并 `bae7020394ba` / `b0f67cb69e09`）——门禁挡住回归，不证明产品性能收益。
- 三个钉住的口径例子。[PR #2615](https://github.com/sgl-project/sglang-omni/pull/2615)（已关闭的测量提案 `aa5cc58286c2`）提出 first-real-text-from-speech-onset 指标：不能用新口径宣布旧门槛通过。[PR #3807](https://github.com/sgl-project/sglang-omni/pull/3807)（已关闭 `71ff3b68ac36`，经 #3826 落地）跳过无断言的 trace：baseline `7b47233fe`，未在最终 head 重测；Apple M5 Max 18 核、macOS 27.0.1、`go test -c` 后 `/usr/bin/time` 前后交替各 3 次、机器有其他负载（load 1.5–4.7）：root 包 wall 中位数 91.89 → 82.12 s（−10.6%）——这是 CI wall time，不是产品性能。[PR #4697](https://github.com/sgl-project/sglang-omni/pull/4697)（已合并 `3849e06cea8e` / `87a11dbe98f2`）列出当前 Claude 模型并关掉 thinking：M4 MacBook Air、session replay、Anthropic API、thinking off、测量 head 未单列——一批 150 段 held-out AASR-Bench 的 Haiku 5.5 得分 80.4、Stop→insert p50 879 ms；另一批 Haiku 800 ms/74.2、Sonnet 1435 ms/76.6——批次不同，不能当作模型净效应。公开 [issue #94](https://github.com/charliechenye/sglang-omni/issues/94)（OPEN）：整体 TTLC 未关闭，incremental LogMel 的公开记录是 `NO_MATERIAL_GAIN`。
- **发布分层**：stable `voxt-v2.1.4`（2026-11-26，发布 run head `5e0a40ff4823`、SUCCESS），最新 prerelease `voxt-v2.1.5-beta.20261127.147`；beta 序列和 release 都不替代真实模型或真实 App 验收。
- **未闭环**：在同一构建上分别测 ASR Final、first cleaned presentation、Stop-to-text／insert／paste（公开待办 1），以及公开待办 2–5 的各项真实条件复测。

### 接下来

第三种：只有人在真 Mac 上才能检查的东西。

## 第 4 步 · 真机检查：人的清单

> **一句话：** 一份约 80 分钟的清单带人在真 Mac 上走过自动化伪造不了的部分——权限、按键监听、真实的辅助功能读取和真麦克风。

### 舞台上

- 一个人、一台真 Mac、约 80 分钟。
- 四张清单卡：真麦克风（你的嗓音，你的房间）、权限弹窗（Mac 问，你来答）、按键监听（真的手指按下去）、读别的 app（真实的前台窗口）——自动化伪造不了这些。
- 为什么假货不够：第 2 步的假 helper 能按指令崩溃，但真的按键只存在于真 Mac 上。
- `mac-e2e.sh` 和 `mac-regress.sh` 跑清单的一部分——仍在真 Mac 上。

### 文档里的清单

公开的 manual-test 文档按顺序走一整遍：首次打开和下载模型、听写、翻译、改写、应用增强、词典，再看模型进程、出错和离线表现，最后是首页、历史和设置（`Voxt/docs/manual-test.md`）。文档开头自己列出自动化测试碰不到的地方：权限、event tap、真实 App 的辅助功能、浏览器、浮窗的外观、真实麦克风下的本地模型。必做部分约 80 分钟，不含下载模型。第 10 节是不用人守着的真机脚本：`mac-e2e.sh`（真实的辅助进程、用文件代替麦克风的录音链路、只读的辅助功能读取、文字测量）和 `mac-regress.sh`（两个真实的语音识别模型、Silero、评测快速版、打包好的 app 以 `--smoke` 启动）。

同一篇文档告诉发现问题的人要收集什么：步骤编号、时间、一份导出的诊断包和截图——这就是第 5 步。

### 接下来

app 把自己做的事写在哪里——又永远不写什么。

## 第 5 步 · 日志：app 的日记

> **一句话：** app 把自己做的事留下最新 2,000 行，轮转进有上限的文件——钥匙、令牌和你说的话进不去——报告问题时打出的诊断包里没有你说的话。

### 舞台上

- 三行日记到达，新的在前：一次会话保存、一次慢的 helper 应答、一次会话开始（构造例，格式是代码的）。
- 最新 2,000 行留在内存，更老的滚出去。
- 三个文件——`voxtnew.log`、`.1`、`.2`——每个不超过 5 MB，留两个旧的。
- 一条被划掉的 Authorization 行：钥匙、令牌和密码永远进不了日记；你说的话默认不记。
- 报告问题打出一个诊断 .zip：diagnostics.txt + 设置 + 日志，没有你说的话；issue 正文裁到 5,000 字。

### 代码里的日记

日志服务是内存里最新 2,000 行的环，由一个专门的 goroutine 写进 `voxtnew.log` 加两个轮转文件，追加永远不卡在磁盘上（`Voxt/internal/logs/logs.go:28-37,64-74`）。文件到 5 MB 轮转，留两个旧的（`logs.go:32-33,67-70,224-230`）；写入跟不上时，行会漏掉文件但不漏环，稍后一条警告行说出漏了多少（`logs.go:85-88,200-201`）。每一行在到达面板、文件或诊断包之前都过一道打码过滤——钥匙、令牌和代理密码永远到不了（`logs.go:13,93-95`）。说话内容默认不记，隐私开关可以打开（`Voxt/docs/manual-test.md`）。级别从每行的文字推断（`logs.go:267-276`），舞台上的行格式照 `logs.go:167`。同一个文件夹里还有 `helper.log`（helper 那侧）和带 Go 崩溃堆栈的 `crash.log`（manual-test.md 的排查表）；日志面板按 ⇧⌘L 打开。

诊断包打进 `diagnostics.txt`——版本、helper 状态、机器、自检结果，注释写明不含用户说过或写过的任何内容——加上 `settings.json` 和所有日志文件（`Voxt/settings_about_controller.go:61-92,174-216`）。报告问题打开一个预填的 issue，正文把诊断裁到 5,000 字（`settings_about_controller.go:265-304`）。「关于」页还跑自检——词库、helper、数据文件夹、模型、麦克风和辅助功能权限（`settings_about_controller.go:109-171`）。

台上没画：慢调用追踪——app 把超过 500 ms 的 helper 调用记日志，helper 记自己超过 250 ms 的，两行一对就能看出一次调用等在哪里（`Voxt/docs/helper-protocol.md`）。

### 接下来

整张地图：哪些站挂哪些标签，什么仍是空白。

## 第 6 步 · 整本书：各证各的

> **一句话：** 每一站都有代码测试，识别有样本评测，人的部分有真机检查——空白带把以上都证明不了的东西留在图上。

### 舞台上

- 六站路线。蓝色 TEST 标签落到每一站；琥珀色 SAMPLE 标签落到声音 → 文字；深色 REAL 标签落到你按一下、helper 和看到文字。图例把每种颜色连到它对应的一步。
- 虚线的「仍是空白」带：噪声房间、真人嗓音和口音（评测文档自己列的未测项）；超过 4 个人的会议（第 14 章第 6 步）；你的 Mac、你的 app 和你说话的方式，合在一起。
- 收束两行：代码说清了做什么；样本说清了那些录音上的成绩；真机检查覆盖人的部分——空白留在图上。

### 逐站看标签

标签表示本书在这一站展示过钉住的证据，不是完整覆盖。TEST 挂在每一站，因为固定树上每一站对应的包都有测试文件：hotkey（`internal/hotkey`）、helper（`internal/helper`）、识别（`internal/asr`、`internal/omni`）、整理（`internal/llm`、`internal/compose`）、交付（`internal/deliver`）和保存（`internal/store`、`internal/session`）。SAMPLE 挂在识别上：ASR 评测集（第 3 步）和分人样本（第 14 章第 6 步）都给识别打分；整理文字的评测是第 3 步说的已退役记录，所以那一站不挂样本标签。REAL 挂在人工清单是唯一仪器的地方：按键监听和权限弹窗（你按一下、helper），以及真实的前台窗口（看到文字）。

空白带引用的是出处，不是猜测：评测文档的未测清单点名噪声、真人嗓音、口音、麦克风录音和经过 helper 真实采集的会话（`Voxt/docs/eval.md` 最后一节）；分人文档把超过 4 个人、真实会议音频、直播路径和长音频留作未证明（`Voxt/docs/MTDEvaluation.zh-CN.md`）。舞台没画的一层：合并、beta 和 stable 是发布状态，不是证据——合入的改动仍欠真机验收，所以本书每个性能数字都在原地带着自己的测量状态；stable 与 beta 的公开状态收在第 3 步的评测口径块。

这是本书最后一章，地图就是收束。
