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
| 02 | `dictation` | `helper-permissions-hotkeys` | 门铃和门卫 | 画 Go app 与 Swift helper 的 JSON 接力，并把麦克风、辅助功能和其他权限分成不同的门。 | 快捷键怎样到达 app，各项权限分别打开哪条路？ | 第 1 章 | `Omni/Voxt/docs/helper-protocol.md`；`Omni/Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift`；`Omni/Voxt/helper/Sources/VoxtNewHelper/Permissions.swift`；`Omni/Voxt/internal/hotkey/route.go` | 门打开后，连续的声音怎样变成能搬运的数据块？ |
| 03 | `dictation` | `microphone-to-voice-frames` | 从麦克风到语音帧 | 把波形切成 16 kHz、单声道、PCM16 LE 的帧，再走高通、VAD、增益和限幅。 | 哪些音频送给识别服务，哪些原始声音仍留在本机录音里？ | 第 2 章 | `Omni/Voxt/docs/helper-protocol.md`；`Omni/Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift`；`Omni/Voxt/internal/session/pcm.go`；`Omni/Voxt/internal/dsp/doc.go`；`Omni/Voxt/internal/vad/doc.go` | 语音帧准备好了，本机模型和 API 怎样把它们听成文字？ |
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

## 制作顺序

按 01 → 16 制作，每轮一步；来源不足的章节跳过并后补。第 1 章建立全书共用的 session 路线，第 12 章再把一条音轨扩成两条。每一步先过易读性检查，再核对原 12 项评分和冷读洞。
