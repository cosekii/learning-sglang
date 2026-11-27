# Inside Voxt 规划

## 读法与边界

- 本书跟着一次语音输入走完 macOS 桌面应用：按键和权限、声音采集、语音识别、语言模型、文本交付、历史与会议，不假设读者学过推理引擎。模型内部只讲够用的输入和输出；token、KV cache 或 GPU 调度的深入原理标成前两本的可选回读，不在本书重讲。
- `Omni/` 指 `~/code/sglang-omni`。本规划只核对公开的 `origin/main@42b5b8cc1a71c8eacfad66ce49b6bf8bd9a4003e`，表中路径都相对这个提交。写章时回到代码、公开文档和测试核对行为，不采用本机日志、未提交文件或其他 worktree。
- 每章先画数据在哪里，再画它下一步交给谁。状态名、协议字段和文件格式保留代码中的英文；首次出现时用一句日常语言解释。数字旁边写来源或算式，失败、取消和回退与成功路径画在同一张图上。
- 除最后一章外，章末问题由下一章回答。新数字进入本书的 numbers 文件，组件从同一份数据推导。

## 部分

- `dictation`（第 1–6 章）：跟一句话从快捷键走到整理好的文字。
- `desktop`（第 7–11 章）：把文字安全交给其他应用，再跟踪词典、历史、文件和模型。
- `meetings`（第 12–16 章）：把单条语音链路扩展成双轨会议，最后用公开测试和评测核对证据边界。

## 章节表

| 章 | part | slug | 标题 | 一句 hook | 回答的问题 | 前置 | 事实来源 | 章末引出 |
|---|---|---|---|---|---|---|---|---|
| 01 | `dictation` | `one-dictation` | 一句话的完整旅程 | 把一次右 Option 听写画成快捷键、helper、session、ASR、整理、交付和历史的路线。 | 一句话经过哪些站，取消或迟到的结果为什么不会混入下一段？ | 无 | `Omni/Voxt/docs/architecture.md`；`Omni/Voxt/internal/session/session.go`；`Omni/Voxt/internal/session/manager.go` | 路线有了，谁接收按键，谁检查 macOS 权限？ |
| 02 | `dictation` | `helper-permissions-hotkeys` | 快捷键和权限 | 画 Go app 与 Swift helper 的 JSON 接力，并把麦克风、辅助功能和其他权限分成不同的门。 | 快捷键怎样到达 app，各项权限分别打开哪条路？ | 第 1 章 | `Omni/Voxt/docs/helper-protocol.md`；`Omni/Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift`；`Omni/Voxt/helper/Sources/VoxtNewHelper/Permissions.swift`；`Omni/Voxt/internal/hotkey/route.go` | 门打开后，连续的声音怎样变成能搬运的数据块？ |
| 03 | `dictation` | `microphone-to-voice-frames` | 从麦克风到音频帧 | 把波形切成 16 kHz、单声道、PCM16 LE 的帧，再走高通、VAD、增益和限幅。 | 哪些音频送给识别服务，哪些原始声音仍留在本机录音里？ | 第 2 章 | `Omni/Voxt/docs/helper-protocol.md`；`Omni/Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift`；`Omni/Voxt/internal/session/pcm.go`；`Omni/Voxt/internal/dsp/doc.go`；`Omni/Voxt/internal/vad/doc.go` | 音频帧准备好了，本机模型和 API 怎样把它们听成文字？ |
| 04 | `dictation` | `speech-recognition-routes` | 声音变文字的几条路 | 并排画本机 Omni、配置的 ASR API 和系统听写，再区分流式草稿与最终结果。 | 文件型和流式识别怎样接收同一段声音，长录音又怎样分块并合并？ | 第 3 章 | `Omni/Voxt/internal/asr/asr.go`；`Omni/Voxt/internal/asr/split.go`；`Omni/Voxt/internal/dictation/dictation.go`；`Omni/Voxt/internal/omni/doc.go`；`Omni/Voxt/internal/omni/live_wrapup.go` | ASR 听出原话后，语言模型服务还收到什么，API key 又放在哪里？ |
| 05 | `dictation` | `language-model-connection` | 语言模型服务与钥匙串 | 把模型地址、模型名和文本画进请求，把 API key 画成从钥匙串取出的授权信息。 | 文本和 API key 分别去哪里，本机地址与外部服务怎样区分？ | 第 4 章 | `Omni/Voxt/docs/architecture.md`；`Omni/Voxt/internal/providers/providers.go`；`Omni/Voxt/internal/llm/openai.go`；`Omni/Voxt/internal/secrets/secrets.go`；`Omni/docs/get_started/voxt-tutorials/byok.md` | 连接准备好以后，整理、翻译和改写怎样组成各自的请求？ |
| 06 | `dictation` | `compose-and-cleanup` | 文字加工厂 | 把角色、输入、清理、任务和输出约定叠成一份 prompt，再画出三种任务的不同失败出口。 | 整理、翻译和改写怎样组装请求，失败或截断时为什么走不同出口？ | 第 5 章 | `Omni/Voxt/internal/compose/compose.go`；`Omni/Voxt/internal/compose/compose_full.go`；`Omni/Voxt/internal/session/cleanup.go`；`Omni/Voxt/internal/session/write.go` | 文字加工完成，怎样安全放进用户正在使用的应用？ |
| 07 | `desktop` | `deliver-text-safely` | 文字落地前的检查 | 对照按键时的应用与此刻的前台应用，依次检查焦点、密码框、粘贴确认和剪贴板恢复。 | 什么时候可以插入或替换，什么时候必须退回答案卡或复制？ | 第 2、6 章 | `Omni/Voxt/internal/deliver/deliver.go`；`Omni/Voxt/helper/Sources/VoxtNewHelper/TextIO.swift`；`Omni/Voxt/helper/Sources/VoxtNewHelperKit/PasteCheck.swift`；`Omni/Voxt/internal/session/write.go` | 文字能落地了，人名和术语怎样作为识别和整理的参考？ |
| 08 | `desktop` | `personal-dictionary` | 你的小词典 | 用同一个词条分画标准词、别名、识别提示和语言模型上下文的去向。 | 哪些词发给 ASR，哪些别名只替换文本，没有语言模型时什么仍有效？ | 第 4、6、7 章 | `Omni/Voxt/internal/dict/dict.go`；`Omni/Voxt/internal/dict/alias.go`；`Omni/Voxt/internal/compose/dictionary.go`；`Omni/Voxt/internal/session/cleanup.go` | 词典帮助写对内容，历史和录音又会保留多久？ |
| 09 | `desktop` | `history-retry-retention` | 历史和重试的保质期 | 给历史条目与失败重试录音各画一个闹钟，再画出 Retry、导出和访问接口。 | 默认 90 天历史和默认 7 天重试录音分别怎样到期清理，访问开关又不是哪种安全边界？ | 第 4、7 章 | `Omni/Voxt/docs/settings.md`；`Omni/Voxt/docs/history-access.md`；`Omni/Voxt/internal/session/session.go`；`Omni/Voxt/internal/session/run.go`；`Omni/Voxt/internal/session/retry.go`；`Omni/Voxt/internal/store/sqlitestore/history.go`；`Omni/Voxt/internal/store/sqlitestore/history_retention.go` | 除了现场说话，已有音频文件怎样变成字幕或文本？ |
| 10 | `desktop` | `file-transcription` | 文件转写的另一条传送带 | 把音频文件经过会议式切分和 ASR，送到 SRT 或 TXT，而不是其他应用的光标。 | 文件转写与听写共用哪些零件，保存和外部 ASR 的数据边界有什么不同？ | 第 4、9 章 | `Omni/Voxt/docs/transcribe.md`；`Omni/Voxt/transcribe_cli.go`；`Omni/Voxt/internal/meeting/track_transcribe.go` | 两条转写路线都离不开模型，模型文件和应用更新又怎样到达 Mac？ |
| 11 | `desktop` | `models-and-app-updates` | 模型仓库与应用更新站 | 对照模型文件的固定版本、SHA-256、续传和占用声明，以及应用自己的 stable 或 beta 更新。 | 模型下载、运行时卸载和应用更新为什么是三件不同的事？ | 第 4 章 | `Omni/Voxt/internal/models/catalog.go`；`Omni/Voxt/internal/models/hub.go`；`Omni/Voxt/internal/omni/runtime.go`；`Omni/Voxt/internal/updates/updates.go`；`Omni/Voxt/updates.go` | 单人听写的零件齐备了，怎样把它们组合成会议系统？ |
| 12 | `meetings` | `meeting-capture-modes` | 会议的三种采集模式 | 并排画 `meeting`、`subtitles`、`recording`，完整会议同时采集麦克风与系统声音，并先写入两条 WAV 音轨。 | 三种模式各采集什么，为什么只有完整会议进入分人流程？ | 第 2、3 章 | `Omni/Voxt/internal/meeting/mode.go`；`Omni/Voxt/internal/meeting/doc.go`；`Omni/Voxt/internal/meeting/archive.go`；`Omni/Voxt/internal/meeting/finalize.go`；`Omni/Voxt/meeting_audio.go`；`Omni/Voxt/README.md` | 双轨采集以后，直播字幕和会后终稿怎样分工？ |
| 13 | `meetings` | `meeting-live-and-final` | 先看直播，再做终稿 | 上层画实时句子，下层画会后逐轨重识别，并保留每条失败音轨的实时内容。 | 成功音轨怎样替换自己的直播内容，失败和回声又在哪里处理？ | 第 4、12 章 | `Omni/Voxt/internal/meeting/live.go`；`Omni/Voxt/internal/meeting/finalize.go`；`Omni/Voxt/internal/meeting/manager_finalize.go`；`Omni/Voxt/internal/meeting/echo.go` | 终稿有了，怎样给每句话贴上说话人标签？ |
| 14 | `meetings` | `meeting-speaker-labels` | 给声音贴姓名牌 | 给完整会议的系统音轨画 MOSS-Transcribe-Diarize 分块和跨块标签，麦克风音轨标为 `Me`。 | 分人结果怎样接到终稿，公开样本证明了什么、还没有证明什么？ | 第 13 章 | `Omni/Voxt/internal/meeting/finalize.go`；`Omni/Voxt/meeting_asr.go`；`Omni/Voxt/internal/omni/asr.go`；`Omni/Voxt/docs/MTDEvaluation.zh-CN.md` | 分清说话人后，怎样纠正、总结、追问和导出？ |
| 15 | `meetings` | `meeting-summary-and-export` | 会议终稿再加工 | 把转写、分批纠正、总结、基于会议内容的追问和导出的出口按顺序连起来；纠正失败时总结仍用识别文本。 | 纠正成功或失败时总结分别读取什么，追问和导出又分别使用什么内容？ | 第 5、14 章 | `Omni/Voxt/internal/meeting/correct.go`；`Omni/Voxt/internal/meeting/manager_finalize.go`；`Omni/Voxt/internal/meeting/summary.go`；`Omni/Voxt/internal/meeting/followup.go`；`Omni/Voxt/internal/meeting/export.go` | 功能链走完了，哪些结论有测试或评测证据？ |
| 16 | `meetings` | `logs-tests-and-evaluation` | 给整本书装上放大镜 | 给第 1 章总图贴上代码测试、固定样本评测和真实设备检查三类证据标签。 | 日志和诊断怎样帮助定位问题，已有评测又不能替哪些真实场景作保证？ | 第 1、11、13–15 章 | `Omni/Voxt/internal/logs/logs.go`；`Omni/Voxt/settings_about_controller.go`；`Omni/Voxt/docs/eval.md`；`Omni/Voxt/docs/MTDEvaluation.zh-CN.md`；`Omni/Voxt/docs/helper-protocol.md` | 回到全书总图，分别标出代码事实、样本结果和尚未验证的范围。 |

## 来源限制

- `Voxt/docs/behavior.md` 是新旧行为对照，`Voxt/docs/plan.md` 是历史计划。两者只提供阅读线索；当前行为以代码、当前协议和测试为准，待验证条目不画成已完成事实。
- 当前语言模型走用户配置的 OpenAI 兼容 API，端点可以在本机，也可以在外部服务。`Voxt/docs/llm-models.md` 和 `Voxt/docs/eval.md` 中已移除的 `voxtnew-llm` 及本地语言模型数字只作历史材料，不进入当前架构图。
- 本机 ASR、外部 ASR API、语言模型 API、历史、答案卡和剪贴板分别画数据边界。文件转写不写历史、不保留录音，不等于外部 ASR 收不到音频；历史访问开关也不是阻止同账户程序读取数据库的安全边界。
- 历史默认 90 天，失败重试录音默认 7 天并在到期后删除，不写成长久保存。System Audio Recording 的部分拒绝状态尚无真机观察，不补猜错误分类。
- 会议采集先写 WAV 不等于永久保留。会后处理由采集模式、`KeepAudio`、成功或失败以及 `AudioUntil` 共同决定保留和删除；第 12 章必须分开画采集与清理。
- `Voxt/docs/MTDEvaluation.zh-CN.md` 末尾关于当前路径拿不到分人结果的旧结论已被代码超越，不采用。2/3/4 人标签结果只限公开合成样本；代码没有四人硬上限，也没有证明五人以上的效果。真实噪声、重叠说话和远场效果仍标未测。
- 文档有评测不等于完整链路全部验证。写第 16 章时逐项区分单元测试、固定样本、真实 helper 的单一样本和尚未覆盖的模型、设备及应用组合。

## 性能公开谱系（规划）

性能内容不开新章，补进已有章节的对应步；第 12 章仍排在本书 P0 清理之后。事实只用 `.bot/perf-public.md`（本轮 SHA-256 `f79e86576628ac5baef23e9ac85c41acea446cefdf3c963909258f8e2574ffb8`）和 `sglang-omni` main 的公开代码与 PR；不写群名、聊天原文、人名（含 GitHub 用户名）、主人的机器名或 NAACL，不补 public.md 没有的事实，不把旧 head 的测量数字写成当前结果。每条优化按同一模板写全：**瓶颈 → 方案 → PR（公开编号）→ head 演变 → 数字（各带测量 head／机器／样本／证据等级）→ 合入 → 发布（beta／stable 分层）→ 真机验收 → 未闭环项**。MERGED 不等于发布，发布不等于真机性能验收；CI wall-clock、模型微基准和 Stop-to-text／Stop-to-insert／Stop-to-paste 不混写；负结果和未落地分支保留。数字进 `src/voxt/numbers.ts`，组件从它推导。

六个主题，各标落点；写作时先在第 04、06、16 章相关步补指向，再在落点写全。每个主题给出瓶颈、方案链、可引数字（含边界）、合入／发布／验收分层和未闭环项；主题正文只写要进教程的条目，全部 327 个 covered PR 的归属见本节末尾的覆盖图。

1. **停止到出字**（落点：第 6 章整理等待的步；口径细节归第 16 章）。瓶颈：按下 stop 后串行等 ASR Final、整理和投递。方案链：基线 `#2214`；结果前的等待拆解 `#3720`（去掉首字期限）、`#3795`（大词典不等别名替换，经 `#3826` 落地）、`#3822`（慢 LLM 的 Raw 回退，CLOSED）；Final 请求构造 `#4728`（OPEN）；共享 PCM 解码 `#4727`（OPEN）。可引数字：
   - `#2214`：Apple M4/16 GB、Qwen3-ASR 0.6B 4bit＋独立本地 MLX-LM `default_model`，一次合成语音的首个非空 live hypothesis 2.573 s；另一次 API smoke 的含启动 batch ASR 12.531 s、英文 cleanup 1.386 s；测量 head 未记录，统计量为单次值，证据 C。
   - `#4728`：M5 Pro、Go 1.27.4、`BenchmarkFinalMultipart`、250 ms、3 runs median：60 s PCM **3,861,533→9,881 B/op**、120 s **7,695,096→9,877 B/op**；测量 head 和 Before 的测量 baseline SHA 均未给（当前 head `4a0da2ffc0cb` 只表示读取时的 head）；52 s 和 156 s 输入转写逐字节一致；证据只覆盖 request construction allocations 和文本一致性，PR 仍 OPEN／REVIEW_REQUIRED。
   - `#4727`：测量 head `cd6a3afb5bc7`、baseline `0f70d9c7c41c`；Apple M5 arm64、macOS 26.5、Python 3.12.16、NumPy 2.2.6，666 个不同 reference path、10 次交替 AB/BA、10 个 cohort means 的 median：24 kHz **45.60→32.91 µs/clip**、离线转 16 kHz **31.30→22.57**、60 s 拼接 **369.54→264.44**；peak traced bytes **9,600,706→3,874,819**；waveform 和 fingerprint bit-identical；只覆盖 `load_audio` CPU 微基准，float32 分支仍显式复制，PR 仍 OPEN／REVIEW_REQUIRED。
   未闭环：`#4727`／`#4728` 的 same-head 验证、真实 App 与人工 review。
2. **分段识别**（落点：第 4 章「安静处分块、按序合并」与「本机 Omni」步；第 10 章切分步补指向）。瓶颈：长录音一次识别慢且占内存；decode 每个 token 都要完整前向。方案链：前史 `#1730`（Apple MLX/Torch MPS 路径）→`#1981`（共享 runner）→standalone `#2549→#2576`→native `#2577`；分段与内存 `#4433`、`#3393`、`#3062`（CLOSED）、`#4161`（CLOSED）、`#3172`（OPEN）、`#4609`（OPEN）、`#3456`（CLOSED）；长音频可靠性测量 `#3360`（MERGED，测量链，不提供通用提速结论）；共享 runner 与 kernel `#2648`（跨模型共享 decoder／loader／worker／HTTP surface）、`#4184`（native 模型共享代码并入 common）、`#2710`、`#2711`、`#4187`–`#4190`、`#3200`、`#3561`、`#3414`、`#4507`（CLOSED）、`#4511`（CLOSED）、`#2708`（OPEN）、`#2713`（OPEN）；speculative decode `#3285`、`#3352`、`#3579`、`#3661`、`#4133`、`#4546`、`#3730`、`#3490`、`#3580`/`#3604`；负结果与未落地：`#3710`（draft 每轮不足 2 token 时回退，CLOSED/DRAFT）、`#3765`（长 prompt 替代路线，CLOSED）、`#3827`/`#3877`/`#3878`/`#4099`（CLOSED）、`#3374`（OPEN/DRAFT）、`#4171`（CLOSED/DRAFT）、`#4549`（OPEN）、`#4554`（DSpark 负结果，OPEN/DRAFT）；替代路线未落地：`#2646`、`#2655`、`#2690`、`#2866`、`#3755`（均 CLOSED）。可引数字：
   - `#2549`：Apple M5/24 GB、Qwen3-ASR 0.6B 4bit、392 clips；Final 为 A0/C/C/A0 interleaved、median：short **p50/p95 194/279→111/145 ms**、throughput **21.0→49.8 audio-s/s**；first preview 为 live C r1 对 A0 r14–16：**p50/p95 202/1207→197/2518 ms**，p95 退化；同一 A/B 还暴露 meeting update gap 退化（来源未给数字，按未量化负结果保留）。主表测量 head 未记录，main 落地归 `#2576`，不当作两次收益；真实 native 服务路径，非完整真实 App。
   - `#3285`：Apple M5/16 GiB、392 clips／5,225 秒、ABBA、native CLI/server protocol（非完整 Voxt App）；所有 benchmark 表均未绑定精确测量 SHA：1.7B 8bit decode **57→189 tok/s**、0.6B 4bit **244→402 tok/s**；另单列 18 分钟单 chunk、1.7B 8-bit、`--max-new-tokens 4096` 下 **30.4→34.6 s（0.88×，draft 更慢）**，与该表口径不同，不合并。
   - `#3579`：Whisper distil speculative decoding，英文和中文加速，mixed 与 silence/noise 退化（负结果保留）。
   - `#3580`/`#3604`：`#3580` 测量 head `c6d2eca0`、Apple M5 Pro/64 GB、401 个 speech inputs、ABBA 两轮均值 **328.42→302.88 s（约 1.08×）**，轮间差与收益同量级；三方对照 plain `8b54e03b`、`#3580` `eb82034e0`、`#3604` `cf7af2b73`、384 clips、顺序 plain→`#3580`→`#3604`→`#3604`→`#3580`→plain、每 pass fresh server、排除 warmup、间隔 10 分钟、c=1 non-streaming、每种实现两轮：`#3604` 在 speech total/median/P95 比 `#3580` 再快 3.5/2.1/4.7%，但只是单轮六 pass，输出差异仍不能省略，不能累计。
   - `#1981`：作者在测量 head 未绑定的固定 clip 对照中以两条 p50 处于噪声内判定性能中性，但 p95/First SSE 并非逐项不变，最终 head 未复测；并发会提高吞吐并显著抬高 p50/p95，不写成无成本 batching。
   未闭环：`#2708`／`#2713`／`#3172`／`#3374`／`#4549` 仍 OPEN；`#2615` 的 first-real-text 指标是 CLOSED 提案，不用新口径宣布旧门槛通过。
3. **预填和复用**（落点：第 4 章「本机 Omni 预览后的 Final」步）。瓶颈：Final 重算 live 预览已经算过的音频窗口、KV 和文本；prompt terms 增加时 prefill 变贵。方案链：`#3780`（CLOSED）→`#4182`（明确替代前者并加入 DFlash path）；`#4589→#4593→#4650→#4707`；checkpoint cache 免重验证 `#1808`/`#1878`（OPEN）；`#1807`（prompt 进 system turn 的 prefill 成本与识别质量 Pareto）；`#3053`（CLOSED）。可引数字：
   - `#4589`：fanless M4 MacBook Air、Qwen3-ASR 1.7B 8-bit＋DFlash、greedy、93 段 2–38 s、每段一次 Final、mean；测量 head 未单列且混合两轮：无词典 **535→290 ms**、30 terms **643→304 ms**、463 terms **2769→382 ms**；另 10 段 31.5–59.5 s 为独立样本，不合并。
   - `#4593`：同机同模型，8 段 64–77 s、rest 28–44 s、每段一次 Final、mean、fast-forward；re-check 列测量 head 未单列，并非全在最终 build：无词典 **1262→716 ms（1.76×）**、463 terms **3618→879 ms（4.12×）**；真实长录音 App 和反复变响未测。
   合入／验收分层：`#4650` MERGED（head `d8ee54cd26f4`、merge `26cfbcef1722`），但 `Performance validation is pending`（native 输出等价、DFlash/greedy、错误 guess、混合语言、Mac Metal `startup_failure`）；`#4707` MERGED（head `095226b8d0ba`、merge `da2cadcf72b8`），真实模型执行和实际延迟未测，reused-token 与 guess-acceptance 只有实现和测试计数。合入不等于性能验收。
4. **流式整理**（落点：第 6 章整理请求的步；会议校对链落第 15 章）。瓶颈：整理等整段说完才开始；长录音的整理全部堆到 stop 之后。方案链：`#4295→#4324→#4551→#4552→#4592→#4612→#4618→#4643/#4655→#4709`；live 失败回退 `#4722`（OPEN）；会议链 `#4539/#4541→#4640/#4644/#4645`，另 `#4573`（OPEN；尾部等待、无语音 piece 跳过和 detector scheduling，未换算成用户延迟收益）；答案流式展示 `#4063`。可引数字：
   - `#4295`：Apple M5 Max、Qwen3-ASR 0.6B 4bit、scripted fake LLM 每答 3 s、4 分 13 秒英文输入：Stop 前 19 次 cleanup、Stop 后 1 次，结果栏 Clean-up 4.0 s；real-App 测量 head 在评论中互相矛盾（一说 `6b4cdf5`、一说 `f013cf2`），不无争议绑定；后经 `#4324` 集成；只证明提前调度，不是 remote provider 收益。
   - `#4612`：candidate `4f675f06eab5`、baseline `09dc7839e93c`；fake ASR/LLM＋fake clock、6 场景各 10 次、指标为 Stop→session snapshot 首个 cleaned presentation：**1000→300、1000→400、400→300 ms**；不是 wall-clock、real-provider、UI 或 Stop-to-paste，最终 head 未重测。
   - `#4618`：candidate `2fabbaa86add`（早于最终 head）；M4 Air、150 AASR-Bench clips×4＝600 sessions、8 并发、回放 ASR＋真实 Claude Haiku 5.5 thinking off：Stop-to-insert **p50/p90 1199/2425→804/1543 ms**，paired median −395 ms、95% interval `[−515,−288]`、94/150 更快；不是完整真实 App，最终 head 未重测。
   - `#4643`：测量 head `1468412f5530`；M1 Pro/16 GB、Qwen3-ASR 0.6B 4bit Faster＋llama.cpp Qwen3-4B Q4_0、5 段 7–39 s 中文回放、两批各 30 sessions/arm：Stop→text median **1.69→0.94 s**、P90 **4.04→3.14 s**；ASR Final median 0.44→0.48 s、first preview 0.45→0.51 s 的共享资源成本同画；PR 仍 OPEN、默认关闭。
   - `#4722`（concurrent 口径，已取代 serial 旧数）：A＝main `84ba2fa96f`、B＝main＋本改动，两臂均 Remote=true、concurrent、max in flight 4；同一 95 秒中文听写、注入首次 live cleanup 失败、idle M1 8 GB MacBook Air、ABABAB 3 pairs median、stop-button 参考：Stop→first cleaned text **11.41→1.90 s**、Stop→cleanup done **27.13→15.84 s**、requests **5→12**；full-text similarity 0.980–0.986、evaluation diff 0.91%–2.46%，第三 pair 总时间只省 1.75 s；B 的精确测量 SHA、provider 和模型名未给，不写成当前 head 的同 head benchmark；PR 仍 OPEN／REVIEW_REQUIRED。旧 serial 结果（34.6→6.1 s、84.5→62.8 s）是意外 serial 的 harness 数字，已被作者用本组 concurrent 数字 supersede，只保留为历史，不引用。
   合入／发布／验收分层：`#4709` MERGED（head `9e0504c830f6`、merge `84ba2fa96f15`、APPROVED、25 SUCCESS／19 SKIPPED／2 FAILURE，两个早期 mac-ci-gate FAILURE 保留），真实 backlog、cancellation、stop-to-TTLC baseline/candidate workload 未测；`#4655` MERGED，late candidate 出现率、复用率、额外请求成本、Stop-to-text/insert 未闭环；会议链数字只适用于对应会议样本和测量 head。
   未闭环：`#4592` 改后真实模型、`#4552` 真实 provider、`#4709` 真实 backlog、`#4722` 的 same-head 与真实 App。
5. **启动**（落点：第 11 章「用模型会启动服务器」步；第 4 章首次等待可补指向）。瓶颈：首次识别等模型服务器、VAD 和 Metal kernel 初始化；设置页和麦克风启停卡住 UI。方案链：readiness `#3784→#4602→#4700`；`#4407`、`#4497`；`#2833`；UI 线程 `#2231`、`#2304`（OPEN）、`#2247/#2249/#2250`（preload 与模型常驻未落地，cold-start race 保留）、`#2256`（cached start 离线路径，OPEN）；`#4124`、`#1809`（idle inbox 改阻塞唤醒）、`#4230`（CLOSED）。可引数字：
   - `#2231`：测量 head `c44f8f47a8cb`、Apple M5、10 秒 idle：`RootView.body` 和 `SMAppService.status` 均从 10 次降为 1 次。
   - `#2304`：Apple M5 Pro/macOS 27.0，公开 warm key→inserted 为 verbatim **0.20 s**、clean **0.65 s**；样本是本地逐步毫秒时间戳和日常听写，测量 head、模型/provider、重复次数与方差缺，证据 C，PR 仍 OPEN。
   - `#4407`：8 GB Apple silicon、95.394 s public clip、ABABAB、每组 median of 3；正文未给各组独立测量 commit：server ready **0.099→0.882 s**、warm-ready request **1.928→1.203 s**、cold 合计 **2.027→2.085 s**——首个请求变快，合计未变快（负结果保留）。
   - `#4497`：测量 head `83b1e7668790`、Apple silicon MacBook Air、ABABAB、cold/warm 各 3 pairs、median、12 份 Final 文本一致：first text cold **3353.2→2799.1 ms**、warm **2396.0→1851.5 ms**；`eebd05da9b` 的早期 short stop/full window 回归已由后续 preemption/scheduling 修复，最终真实模型 benchmark 未独立重跑。
   - `#2833`：验证 head `fd29e6607a6b`、Apple Silicon/macOS 27.0：修复前第 65 次 activation 失败，修复后 70 次全通过；属 native VAD 生命周期功能回归，不是模型推理 benchmark，也不直接提供 Stop-to-insert 收益。
   未闭环：`#4602` 真实 cold start、`#4700` 真实 piece 路径、`#2304`／`#2256` 的验收。
6. **评测口径**（落点：第 16 章；写作前先在 04、06 的深入讲解用同一口径）。口径：Stop-to-text／Stop-to-insert／Stop-to-paste 分列；fake clock、fake provider、离线回放、loopback real-App、回放 ASR＋真实 provider、完整真实 App 不混写；每个数字带测量 head／机器／样本／证据等级；MERGED→beta→stable→真机验收分层。测量与工具链 `#4525`（OPEN）/`#4529`（CLOSED）/`#4389`（CLOSED）/`#4431`（OPEN）/`#4435`（OPEN）/`#4449`（OPEN）/`#4671`（OPEN／CHANGES_REQUESTED）/`#4692`（OPEN）/`#4693`（OPEN）；基准与回放 `#3867`、`#3892`、`#4103`（CLOSED）、`#4162`（OPEN/DRAFT）、`#4168`（OPEN/DRAFT）、`#4423`（OPEN/DRAFT）、`#3411`（OPEN）、`#3663`（OPEN）、`#3728`（OPEN）；golden 与质量门禁 `#2936`（OPEN/DRAFT）/`#2948`（CLOSED）/`#2992`（OPEN）/`#3064`/`#3410`（CLOSED）/`#3497`（OPEN）/`#3866`（OPEN/DRAFT）/`#4081`（OPEN/DRAFT）/`#4273`（CLOSED）/`#4376`——门禁不证明产品性能收益。可引数字：
   - `#2615`：first-real-text-from-speech-onset 指标，CLOSED 测量提案，不能用新口径宣布旧门槛通过。
   - `#4697`：M4 MacBook Air、session replay、Anthropic API、thinking off，不同 replay 批次：一批 150 held-out AASR-Bench 的 Haiku 5.5 score 80.4、Stop→insert p50 879 ms；另一批 Haiku 800 ms/74.2、Sonnet 1435 ms/76.6；批次不同，不当作模型净效应；测量 head 未单列。
   - `#3807`：baseline `7b47233fe`，未在最终 head `71ff3b6` 重测；Apple M5 Max 18 cores、macOS 27.0.1、`go test -c` 后 `/usr/bin/time` 前后交替各 3 次、机器有其他负载（load 1.5–4.7）：root package wall median **91.89→82.12 s（−10.6%）**；是 CI wall time，不是产品性能；CLOSED，经 `#3826` 落地。
   - issue #94（公开）：整体 TTLC 未关闭；incremental LogMel 公开记录为 `NO_MATERIAL_GAIN`。
   发布分层：stable `voxt-v2.1.4`（2026-11-26T23:20:03Z，发布 run head `5e0a40ff4823`、SUCCESS），最新 prerelease `voxt-v2.1.5-beta.20261127.147`；beta 序列和 release 都不替代真实模型或真实 App 验收。
   未闭环：在同一构建上分别测 ASR Final、first cleaned presentation、Stop-to-text/insert/paste（public.md 公开待办 1），及公开待办 2–5 的各项真实条件复测。

### 覆盖图（327 个 covered PR ＋ 公开 issue #94）

pinned 来源声明 **327 covered / 3,580 excluded**。每个 covered PR 在这里分到一个主题和落点，或记入一个排除类；排除只表示不进本书性能谱系的六个主题，不表示该 PR 没有价值。主题行内只列 PR 编号，方案、数字与边界见上面六个主题和 pinned 来源。

- 主题 1 停止到出字（第 6 章）：`#2214` `#3708` `#3720` `#3795` `#3822` `#4727` `#4728`
- 主题 2 分段识别（第 4 章；第 10 章补指向）：`#1730` `#1977` `#1981` `#1983` `#1989` `#2235` `#2549` `#2576` `#2577` `#2646` `#2648` `#2655` `#2690` `#2708` `#2710` `#2711` `#2713` `#2866` `#3062` `#3172` `#3200` `#3285` `#3352` `#3360` `#3374` `#3393` `#3456` `#3490` `#3561` `#3579` `#3580` `#3604` `#3661` `#3710` `#3730` `#3755` `#3765` `#3827` `#3877` `#3878` `#4099` `#4133` `#4138` `#4161` `#4171` `#4184` `#4187` `#4188` `#4189` `#4190` `#4433` `#4507` `#4511` `#4546` `#4549` `#4554` `#4609`
- 主题 3 预填和复用（第 4 章）：`#1807` `#1808` `#1878` `#3053` `#3414` `#3780` `#4182` `#4589` `#4593` `#4650` `#4707`
- 主题 4 流式整理（第 6 章；会议链落第 15 章）：`#4063` `#4295` `#4324` `#4539` `#4541` `#4551` `#4552` `#4573` `#4592` `#4612` `#4618` `#4640` `#4643` `#4644` `#4645` `#4655` `#4709` `#4722`
- 主题 5 启动（第 11 章；第 4 章首次等待）：`#1809` `#2231` `#2247` `#2249` `#2250` `#2256` `#2304` `#2833` `#3784` `#4124` `#4230` `#4407` `#4497` `#4602` `#4700`
- 主题 6 评测口径（第 16 章）：`#2615` `#2936` `#2948` `#2992` `#3064` `#3410` `#3411` `#3497` `#3663` `#3728` `#3807` `#3866` `#3867` `#3892` `#4081` `#4103` `#4162` `#4168` `#4273` `#4376` `#4389` `#4423` `#4431` `#4435` `#4449` `#4525` `#4529` `#4671` `#4692` `#4693` `#4697`，及公开 issue #94
- 排除 X1（TTS／音乐／多模态分支，仅作共享 native runner 的谱系背景；不表示已进入当前 Voxt App）：`#1964` `#1990` `#1991` `#2008` `#2017` `#2085` `#2130` `#2243` `#2306` `#2315` `#2430` `#2440` `#2444` `#2783` `#2788` `#2870` `#2926` `#2927` `#3094` `#3127` `#3137` `#3138` `#3139` `#3140` `#3141` `#3142` `#3154` `#3173` `#3338` `#3425` `#3597` `#3618` `#3629` `#3631` `#3638` `#3718` `#3860`
- 排除 X2（ASR 模型接入与功能支持，非优化；各自内存和 cold-start 代价留在 pinned 来源）：`#1982` `#1992` `#2198` `#2520` `#2586` `#2587` `#2588` `#2590` `#2591` `#2592` `#2593` `#2644` `#2676` `#2688` `#2689` `#2956` `#3219` `#3262` `#3596` `#3744` `#4059` `#4069` `#4098` `#4432` `#4548`
- 排除 X3（CI、测试、构建与发布工程，不证明产品性能收益；`#3826`／`#3891` 等集合 PR 的大 diff 不全部归因于集合本身）：`#1980` `#1984` `#2135` `#2825` `#2851` `#3375` `#3396` `#3429` `#3514` `#3515` `#3521` `#3550` `#3551` `#3560` `#3562` `#3636` `#3697` `#3754` `#3760` `#3826` `#3891` `#4031` `#4102` `#4169` `#4179` `#4181` `#4239` `#4254` `#4259` `#4283` `#4290` `#4291` `#4323` `#4338` `#4447` `#4476` `#4488` `#4499` `#4510` `#4514` `#4517` `#4634` `#4637` `#4646` `#4647` `#4649`
- 排除 X4（质量与正确性修复，非性能）：`#1788` `#2261` `#2519` `#3272` `#3394` `#3413` `#3417` `#3419` `#3421` `#3519` `#3599` `#3864` `#4129` `#4132` `#4163` `#4211` `#4234` `#4274` `#4361` `#4383` `#4414` `#4459` `#4512` `#4565` `#4631` `#4657` `#4672` `#4674`
- 排除 X5（功能、UI 与感知流畅度，无性能验收口径）：`#2683` `#3043` `#3054` `#3412` `#3420` `#3593` `#3655` `#3678` `#3696` `#3726` `#3751` `#3758` `#3839` `#3843` `#3847` `#3849` `#3863` `#3868` `#3894` `#3937` `#3966` `#3997` `#4040` `#4070` `#4073` `#4145` `#4237` `#4301` `#4306` `#4325` `#4326` `#4330` `#4363` `#4396` `#4399` `#4405` `#4451` `#4469` `#4504` `#4574` `#4622` `#4633` `#4652` `#4659` `#4666` `#4668` `#4691`
- 排除 X6（会话生命周期与实时协议正确性）：`#3014` `#3015` `#3504` `#4553` `#4718`

## 制作顺序

按 01 → 16 制作，每轮一步；来源不足的章节跳过并后补。第 1 章建立全书共用的 session 路线，第 12 章再把一条音轨扩成两条。每一步先过易读性检查，再核对原 12 项评分和冷读洞。

性能谱系按上节六个主题做：先在第 04、06 章相关步补指向，再在各落点写全，评测口径随第 16 章完成；每条按模板写齐瓶颈、方案、PR、head 演变、数字边界、合入、发布、真机验收和未闭环项，并过本章 EVAL 硬门。
