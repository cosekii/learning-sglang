# Voxt 全书对抗质量评审（对照 upstream/main 原作）

- 评审对象：`tutorials@57ac77d` 的 voxt 书（16 章、104 步，全部 ready）。
- 标杆：`upstream/main@ca3ed92`（原作第 1 本，第 1–15 章共 157 步、31,203 词，均值 10.5 步／2,080 词；voxt 均值 6.5 步／1,354 词，为原作的 65%）。
- 本轮实跑：`BOOK=voxt node scripts/deep-check.mjs` 全 ok；transcript 全书重生成与已提交版本逐字一致、布局检查零报告（命中项均为舞台文字误报）；`BOOK=voxt node scripts/mobile.mjs` 360/390/430 px 无布局断裂、无小字或出界审计输出；桌面 1440×900 逐步实测全书最小可见 SVG 字号；双时刻截图（1,500 ms vs 6,000 ms，MD5 比对）验证动画有无。截图在 `.bot/out/voxt-quality-shots/`。
- 环境说明：本仓库 `node_modules` 是指向 `~/code/learning-sglang/node_modules` 的符号链接，其 `.vite` 缓存带 provenance 锁无法写，dev server 起在 `$TMPDIR/voxt-review/repo`（内容与本仓库逐字一致，仅 `astro.config.mjs` 加 `cacheDir` 与 `fs.allow`）；原作起在 `voxt-review/up`（`.up` worktree 的拷贝，同样只改这两处）。transcript/mobile 均在拷贝内运行，本仓库教程文件零改动。
- 与 `.bot/memory/review.md` 的关系：Voxt-01／02 已关闭不重复；Voxt-11（390 px deep 长路径横溢）与 Voxt-12（中文 390 px Step 4 公式裁切）已在台账，本条目不重复登记；本轮新增证据均为首次登记。

## Findings（最严重在前）

- [ ] [P0] file-transcription/Steps 6–11：11 步中 6 步完全静态——组件 `STEP_PHASES` 只定义 `{0:3, 1:4, 2:6, 4:4}`（`src/components/voxt/FileTranscription.svelte:132`），组件全文件无 `in:fly`/`transition:fade`，transcript 这 6 步无 `loops` 标记；1,500 ms 与 6,000 ms 两张截图 MD5 逐字节相同（`.bot/out/voxt-quality-shots/voxt10-s6.png` == `voxt10-s6-late.png`）| 原作每一步都动：元素随状态切换 `in:fly`（`.up/src/components/viz/AttentionStep.svelte:93,104,107`），重点步还有步内循环（`?step=8` 的 Ch.14 双时刻截图 MD5 不同）| 我们：后半章（7 秒上限切点、逐句识别、SRT/TXT、失败矩阵、不写清单、去向图）一次性画全，其中 Step 6「在 7 秒上限内找最安静处切」本可与 Step 4 的游标扫掠（`FileTranscription.svelte:465-468`）同款动画 | 修法：给 Steps 6–11 各配相位序列（Step 6 做搜索窗扫掠＋切点落定），或至少补入场过渡；静态步按主人规则 R6=0。
- [ ] [P0] logs-tests-and-evaluation/全章：计划主题 6「评测口径」是本章的核心任务（`docs/plan-voxt.md:84-90` 落点即第 16 章），但 Stop-to-text／Stop-to-insert／Stop-to-paste 三分口径、fake clock／fake provider／回放／真实 App 分层、`voxt-v2.1.4` 与 beta 序列、主题 6 全部 31 个 PR 编号在 transcript 与 deep 中均为 0 命中（grep 复核）；仅剩 deep Step 6 一句话提到 merge/beta/stable（`src/deep/voxt-logs-tests-and-evaluation.en.md:125`）| 原作同类「证据章」把每个数字的来源、测量条件写进舞台和 deep（Ch.19 Step 5 的 2.7/1.4 s p90 实测直接上舞台，`.up/transcript/19-sharing-gpus.md`）| 我们：本章 1676 词全部讲测试数量与样本边界，评测口径这一半任务未交付 | 修法：把口径分层画进证据地图步（每个已引数字挂 Stop-to-* 类别与 harness 层级），补上 stable/beta 分层与「MERGED≠验收」的舞台例。
- [ ] [P0] meeting-summary-and-export/Step 2：caption 讲「纠正改写存稿」，但五行存稿从头到尾渲染 `line.raw`（`src/components/voxt/MeetingSummaryExport.svelte:165,244`），`line.fixed` 全文件不存在；纠正的效果只在答案卡里说一句，被改的对象本身永不变。另：ariaLabel 写「107 runes」（:46-47），舞台公式实算 106（transcript/voxt/meeting-summary-and-export.md Step 2）| 原作标准：机制必须发生在对象上——Ch.13 的 silu→mul 中间量是在舞台上被消掉的（`.up/src/components/viz/TorchCompile.svelte`）| 我们：核心状态变化缺位＋无障碍文本与舞台自相矛盾 | 修法：结算相位把被纠正行切换为 `line.fixed` 并变色，ariaLabel 与舞台数字对齐。
- [ ] [P1] compose-and-cleanup/Step 5 deep：在「分片合流」这一步下面塞全章级 stop-to-text 证据清单（#4295、#2214、#3720、#3822、#4728、#4727，`src/deep/voxt-compose-and-cleanup.en.md:238-250`），与本步 slide 无关；同时主题 1／4 的头条数字 #4618（Stop-to-insert p50/p90 1199/2425→804/1543 ms）、#4643（1.69→0.94 s）、#4722（11.41→1.90 s）、#4612（1000→300 ms）与 MERGED 项 #4709/#4655 在全书任何文件 0 命中（grep 复核）| 原作：deep 逐节对准当步 slide（Ch.14 每节只讲当步对象）| 我们：落点章（plan-voxt.md:53-76 指定第 6 章）只落了一半证据，且落点 deep 错位 | 修法：把主题 1／4 缺漏数字补进对应步（整理等待步、流式整理步），每节只留当步内容。
- [ ] [P1] 全书/动画密度：104 步中机制动画 50（其中约 1/4 是换图式弱机制）、held-reveal 48、静态 6；最该动的「检查／判决」步（ch1 S3/S4 的 same-session 与 cancel 门、ch2 S2/S3 的权限 OFF/ON、ch14 S3–S5 的切块/carry/anchor、ch16 全章 0 机制）全是卡片依次出现，被检查对象从不变态 | 原作：相位改变对象本身——Ch.14 的 S、P 两个框在舞台上一闪后消失只留虚线框（`.up/src/components/viz/AttentionBackends.svelte`），Ch.7 的页表逐相填充 | 我们：相位多数是 `{#if phase >= N}` 的整卡出现（如 `MeetingSpeakerLabels.svelte:332-342`、`LogsTestsEvaluation.svelte:434-445`）| 修法：按 EVAL「held reveal 必须展示本步数据变换」逐章返工判决步，让检查从「未判」到「已判」发生在对象上。
- [ ] [P1] 全书/numbers.ts：计划要求「数字进 `src/voxt/numbers.ts`，组件从它推导」（`docs/plan-voxt.md:49`），但该文件 0 条 perf 常量（grep `4618|4643|4722|4295|2214|4497|2549|4589` 全空）；已落的 perf 数字全部手写在 deep markdown 里 | 原作：所有共享数字从 `src/numbers.ts` 推导（AGENTS.md「Numbers stay consistent across chapters」）| 我们：`src/voxt/numbers.ts` 只有结构常量 | 修法：perf 数字先入库再引用，deep 从同一来源生成或至少对照。
- [ ] [P1] models-and-app-updates/Step 4 deep：主题 5「启动」落点只落了 #4407（`src/deep/voxt-models-and-app-updates.en.md:185-188`），计划同主题的 #4497（cold first text 3353.2→2799.1 ms）与 #2231（`RootView.body` 10→1 次）在全书 0 命中（grep 复核）| 计划把三个 PR 都列为主题 5 可引数字（plan-voxt.md:80-82）| 我们：落点章只交付约一半 | 修法：补齐两组数字及其边界（#4497 的 head 与 ABABAB 口径、#2231 的 10 s idle 口径），或写明不引的原因。
- [ ] [P1] speech-recognition-routes/Step 4：主题 2「分段识别」的两个落点步之一（plan-voxt.md:58 明确「安静处分块」步），其 deep 无任何谱系指针；整条谱系（#2549、#3285、#3579、#3580/#3604 等）全部倒进 Step 6 的 deep（`voxt-speech-recognition-routes.en.md:61-74`），构成局部 chapter-wide dump；且全书 transcript（舞台层）0 条 perf 数字，读者在主线上看不到这些证据存在 | 原作：性能证据直接上舞台（Ch.19 的 p90 对照）| 我们：证据全部埋在 deep 散文且堆错步 | 修法：Step 4 deep 补指向并分流主题 2 证据；关键数字至少一组上舞台。
- [ ] [P1] one-dictation・helper-permissions-hotkeys・language-model-connection/全章：619／532／692 词、4／3／5 步，是原作均值（2,080 词、10.5 步）的 26–33%，也低于原作最薄章（Ch.1：12 步、1,056 词）；三章 MDX 散文只有出处说明，没有任何「少讲了什么、为什么」（EVAL §6 厚度条的硬性要求）| 原作同类入门章 Ch.1 用 12 步演示一个更简单的循环（`.up/transcript/01-inference.md`）| 我们：ch1 的 same-session 门、cancel 门与 ch2 的 OFF/ON 对照各只有一步且为 held-reveal，deep 里的 run 绑定 vs 字符串比较、2 秒重试、`/usr/bin/security` 等机制只在 deep 出现 | 修法：写明薄的理由，或把 deep 独有机制提为新的舞台步（如 ch2 的重试时间线、ch1 的 run 绑定对照）。
- [ ] [P1] meeting-capture-modes/Step 7：本步把 `Speaker 1`、`Speaker 2` 标签直接画上舞台（transcript/voxt/meeting-capture-modes.md:193-197），而第 14 章整章（meeting-speaker-labels）回答的正是「怎样给每句话贴上说话人标签」；第 12 章的章末问题预支了后两章的核心对象，削弱 ch12→13→14 的提问链 | 原作：章末问题只抛出、对象留给下一章揭示（Ch.13 末步只点两个 kernel，不展开 FlashAttention）| 我们：ch12 Step 7 的「?→Speaker 标签」翻转（`MeetingCaptureModes.svelte:614-621`）提前上演 ch14 的结果 | 修法：ch12 Step 7 停在「系统音轨的话要会后才知道谁说的」，把标签留到 ch14。
- [ ] [P2] meeting-live-and-final/Step 2 deep：写存入行是 `00:02–00:05 · the next release is Friday`（`src/deep/voxt-meeting-live-and-final.en.md:28`），舞台上实为 `00:21–00:25`（`MeetingLiveAndFinal.svelte:125`，transcript:50）；`00:02–00:05` 是另一行「hi everyone」的 span（:128）| deep 必须与 slide 逐字一致（EVAL 执行门「深入讲解对准当前图」）| 我们：deep 把 finalLines[0] 的 span 抄错行 | 修法：改为 `00:21–00:25`。
- [ ] [P2] meeting-capture-modes/Step 1 deep：称顶部虚线问题条「在台上」（`voxt-meeting-capture-modes.en.md:7`），但它只在 phase 0 渲染（`MeetingCaptureModes.svelte:158-161` 的 `{#if phase === 0}`），定稿画面没有；transcript 的 On stage 也不含它 | EVAL 执行门：deep 的图外内容必须显式标记 | 修法：注明该条只在循环开场出现，或改为常驻。
- [ ] [P2] history-retry-retention/Step 9 deep：「Parallel cleanup」一节（`voxt-history-retry-retention.en.md:418-420`）讲 Clear the history、`DeleteAll`、compaction，全章任何一步的舞台都没有这些对象，属往末步塞章级内容 | 原作：deep 每节只讲当步 slide | 修法：移到来源说明或单列「本章未展开」并标注。
- [ ] [P2] compose-and-cleanup→deliver-text-safely、microphone-to-voice-frames→speech-recognition-routes、language-model-connection→compose-and-cleanup 三处接缝：ch6 末步 caption「It never inserts unseen.」、ch3 末步「This peak lands at −1 dBFS.」、ch5 末步「It stays out of the body.」都落在事实上，问题只留在 deep 的 Next 或散文里（transcript/voxt/compose-and-cleanup.md:216、microphone-to-voice-frames.md:194,213、language-model-connection.md:116）| 原作：每章末步在舞台上留下一步要答的问题，且锚定台上可见物（Ch.13 末步的两个 kernel 框）| 我们：三处末步舞台无收尾问题，靠 deep 补 | 修法：三处末步舞台各加一句指向下一章首步对象的问题行。
- [ ] [P2] one-dictation/Step 4 deep：写「the cases appear one at a time」（`voxt-one-dictation.en.md` Step 4），但相位落定后两个 case 盒同时留在屏上（`OneDictation.svelte:342-354` 各自 `{#if phase >= 2/3}` 出现后不收起）| deep 描述播放过程、读者看到的是定格 | 修法：改为「依次出现后并列对照」，或让两盒互斥切换。
- [ ] [P2] models-and-app-updates/Step 4：服务器生命周期是纯文字状态机——状态行随相位换字（`ModelStorageUpdates.svelte:357-358`），进程框不消失、不变色、内存条不动；同章 Step 1/2 的机制也只是文字翻转 | 原作讲进程生命周期时对象本身变化（Ch.17 的 stage 进程逐个出现并点亮 GPU）| 修法：让进程框在 exit 相位消失、内存条回落。
- [ ] [P2] microphone-to-voice-frames/Step 1：桌面 1440×900 实测可见 SVG 最小字号 9.00 px（刻度「0–100 ms」），低于 EVAL「新书桌面 ≥10 CSS px」执行门；全书其余章最低 10.00 px | 原作自身也有 9 px（Ch.2 Step 14「new」，同法实测），属与原作持平，但过不了本书自己的门 | 修法：刻度标签提到 10 px 或减刻度数量。
- [ ] [P2] file-transcription/全章：计划行事实来源含 `meeting/track_transcribe.go`（plan-voxt.md 第 10 章行），全章未引用（改用 transcribe_socket.go、fileasr.go、meeting/cutter.go——更贴题但偏离计划行）；主题 2「第 10 章切分步补指向」只在 deep Step 6（`voxt-file-transcription.en.md:280`）有一句话，舞台层无 | 修法：计划行改记实际来源，切分步舞台加指向上游谱系的脚注。
- [ ] [P2] helper-permissions-hotkeys・one-dictation/判决步：ch2 S2/S3 的权限 OFF/ON 对照、ch1 S3/S4 的 same-session 与 cancel 门，红 × 与绿箭头都是数据里预置的标记，「拦截」「拒绝」从未被演示成事件（`OneDictation.svelte:240-271`、`HelperPermissionsHotkeys.svelte:220-293`）| 原作演示拒绝：Ch.6 的 prefill-first 冻结是请求卡在 waiting 里逐步发生的 | 修法：让消息先到达、再被门弹回（位移＋变色），而不是直接出现带 × 的静态卡。

## 逐章对照表

原版对照列：原作第 1–15 章均值 10.5 步／2,080 词（最小章 Ch.1：12 步／1,056 词；最大 Ch.14：13 步／5,064 词）。「动画」= 机制步／总步数（held-reveal 与静态不计）。

| 章 | 步数 | 动画 | 词数 | 原作均值对照 |
|---|---|---|---|---|
| one-dictation | 4 | 1/4 | 619 | 10.5 步／2,080 词 |
| helper-permissions-hotkeys | 3 | 1/3 | 532 | 同上 |
| microphone-to-voice-frames | 8 | 5/8 | 1,072 | 同上 |
| speech-recognition-routes | 7 | 3/7 | 1,109 | 同上 |
| language-model-connection | 5 | 3/5 | 692 | 同上 |
| compose-and-cleanup | 8 | 5/8 | 1,200 | 同上 |
| deliver-text-safely | 5 | 3/5 | 1,351 | 同上 |
| personal-dictionary | 7 | 7/7 | 1,556 | 同上 |
| history-retry-retention | 9 | 5/9 | 2,010 | 同上 |
| file-transcription | 11 | 2/11 | 1,901 | 同上 |
| models-and-app-updates | 6 | 5/6 | 1,510 | 同上 |
| meeting-capture-modes | 7 | 2/7 | 1,571 | 同上 |
| meeting-live-and-final | 6 | 5/6 | 1,307 | 同上 |
| meeting-speaker-labels | 6 | 2/6 | 1,672 | 同上 |
| meeting-summary-and-export | 6 | 1/6 | 1,893 | 同上 |
| logs-tests-and-evaluation | 6 | 0/6 | 1,676 | 同上 |
| **全书** | **104** | **50/104** | **21,671** | 157 步／31,203 词 |

呈现面补充：站点外壳（Chapter.astro、StepControls、global.css、stage.css）与原作共用；voxt 组件全部使用共享 CSS 变量（`var(--accent)` 等，仅 2 处 `font-size="10"` 字面量、3 处 `fill="white"`），色彩/字体系统与原作一致；transcript 布局门与 mobile 门全绿。呈现差距不在外壳，而在上表的动画密度与舞台信息密度，需人工目检定稿（本轮截图已存 `.bot/out/voxt-quality-shots/`，本模型无图像输入能力，未做像素级判读）。

## EVAL changes（建议追加到 `.bot/EVAL.md` 第 6 节执行门的原文）

```text
- **静态步扫描门**：组件内无 phase、无 rAF/clock、且无 `in:fly`/`transition` 的步，与 transcript 无 `loops` 标记的步取并集，自动判 R6=0；另对每个被扫描步保存两个时间点的截图并比对哈希，逐字节相同即静态铁证。组件层面的扫描优先于作者自述的「参考面板」定位。
- **判决步必须演判决**：相位只控制 `{#if phase >= N}` 整卡出现、而检查/拒绝/拦截的结果标记（×、✓、FAILED）在数据里预置的步，按 held-reveal 计，不计机制动画；被检查对象必须从「未判」迁移到「已判」。
- **deep 引用舞台逐字核对**：deep 的 `On the stage` 中出现的引号串、时间戳、span、代码名与数字，逐字符串与 transcript 的 `On stage` 比对，不一致即失败；只存活于中间相位（如 `{#if phase === 0}`）的元素必须注明「只在循环开场出现」。
- **计划数字落点自动核销**：plan 的每个「可引数字」（PR 编号＋数值对）在落点章的 transcript、deep、numbers.ts 三处 grep，全空即 P1；已落的数字必须能在 `src/<book>/numbers.ts` 找到同名常量，deep 手写数字而库中无对应项按未落地计。
- **章末问题必须在舞台层**：末步 caption 或舞台文本必须包含下一章首步回答的问题（逐字或同对象改写），只在 deep 的 `Next` 或 MDX 散文里留问题不算衔接；扫描末步 caption 是否以事实陈述收尾且无问题行。
- **预支对象检查**：本步舞台出现下一章标题所指的机制对象（如下一章叫「说话人标签」，本步舞台出现 Speaker 标签成品）时报警；章末问题只许抛出，不许把答案对象画上舞台。
- **薄章理由硬门**：章 transcript 词数低于原作均值 50% 时，MDX 散文必须写明少讲了什么、为什么；无理由即不算完成，不管其他门是否全绿。
```

## 对抗审查

**环境假象排查（两条潜在假 finding 被否决）**：

1. 「`?step=N` 深链失效」一度成立：探针显示 voxt 与原作打开 `?step=N` 都停在 Step 1（counter `01 / 04`、`data-animation-step=0`），连原作 Ch.2 在 upstream dev server 上同样失败，transcript 重跑报「animation did not reach the requested step's final phase」。追到底层：本仓库 `node_modules` 是指向 `~/code/learning-sglang/node_modules` 的符号链接，vite 按 realpath 发 `@fs/Users/shuohuang/code/learning-sglang/...` 请求被 `fs.allow` 拒（403），hydration 整体失败，页面只剩 SSR 静态 DOM。在拷贝内补 `fs.allow` 与 `cacheDir` 后，`?step=2` 在两本书都正确落到 Step 2 且相位循环、键盘可用。**深链无缺陷，此 finding 撤销**；同时作废首轮全部截图（均为 SSR 定格），重拍后所有动画结论以新证据为准。
2. 「7/16 voxt 组件缺 `prefers-reduced-motion`」被降级否决：grep 确认 `PersonalDictionary`、`ModelStorageUpdates`、`MeetingCaptureModes`、`MeetingLiveAndFinal`、`MeetingSpeakerLabels`、`MeetingSummaryExport`、`LogsTestsEvaluation` 七个组件无 reduced 分支；但原作 21 个 viz 组件只有 2 个有 reduced 处理（`.up/src/components/viz/`），本项是超出原作的加分项而非落后项，**不作为对照 finding**，仅在此记录为站点级债。

**逐条复核（P0/P1 全部重开证据）**：

- file-transcription 静态：重读 `FileTranscription.svelte:132` 的 `STEP_PHASES`、确认全文件无 `in:fly`，并在修复环境后重拍 Step 6 双时刻截图，MD5 相同（`voxt10-s6.png`/`voxt10-s6-late.png`）；对照组 Step 4 双时刻不同、原作 Ch.14 Step 8 双时刻不同。**维持 P0**。
- ch16 主题 6 缺席：grep `Stop-to|v2.1.4|fake clock|fake provider` 于 transcript 与双语 deep 全空，唯一命中是 `voxt-logs-tests-and-evaluation.en.md:125` 的一句 merge/beta/stable。**维持 P0**。
- ch15 Step 2 存稿不更新：grep `line.fixed` 全组件不存在、`line.raw` 四处（:165,202,244,272）；aria 107 vs 舞台 106 双向核对（:46-47 与 transcript Step 2 的 `24+28+21+12+21=106`）。**维持 P0**。
- ch6/ch11/ch4 数字缺口：逐 PR 编号 grep（#4618、#4643、#4722、#4612、#4709、#4655、#4497、#2231）全书 0 命中；#4407、#2549、#3285、#4589、#4593 均在 deep 内联散文命中且带边界。**维持 P1**，并把「已落数字的忠实度」从 finding 中剔除（抽查 #2549/#4589 的数字与 plan-voxt.md 一致）。
- ch13 deep 时间戳：deep:28 的 `00:02–00:05` 对照组件 :125/:128 与 transcript:50，确属抄错行。**维持 P2**（数字不涉机制结论）。
- 字号 9 px：补测原作 Ch.2 Step 14 同为 9 px，从 P1 降为 P2 并注明与原作持平。

**抽样（writer 未引用的 5 步）**：voxt03 Step 3（flush 末帧：deep 与舞台一致，1/16 宽度来源清楚，无新洞）；voxt07 Step 3（writable 规则卡：transcript 与 deep 一致，held-reveal 已计入全书密度 finding）；voxt09 Step 7（JSONL 字段卡：deep 自注 key count 非重点，合规）；voxt14 Step 3（重读 `MeetingSpeakerLabels.svelte:336-342`：1 s 重叠确为 8 px 静态灰块、请求整盒出现，补强「ch14 核心步 held-reveal」）；voxt16 Step 5（日志轮转：deep 的 500 ms 慢调用已标 Not on the stage，合规，但加深「ch16 全章 0 机制」证据）。抽样未推翻任何 finding，新增 0 条独立 finding。

---

三条最严重：① file-transcription 后半 6 步全静态（P0，主人规则一硬失败）；② logs-tests-and-evaluation 的核心任务「评测口径」基本未交付（P0，0 个 PR、无 Stop-to-* 分层）；③ meeting-summary-and-export Step 2 纠正从不落到存稿行上（P0，机制不在对象上发生）。
Findings 计数：P0 × 3、P1 × 7、P2 × 9，共 19 条。
