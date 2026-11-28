## 第 1 步 · 同一段录音只走一条识别路线

> **一句话：** 选中的语音识别服务把第 3 章处理好的声音听成文字，另外两条候选路线不会同时收到录音。

### 图上是什么

- 蓝色框是同一段处理后的录音。本例长 1 秒，沿用第 3 章的 16 kHz、单声道、PCM16 LE，共 32,000 字节。
- `ASR` 是 automatic speech recognition，即语音识别：输入声音，输出文字。
- 三条路线是 alternatives（可选项），不是依次经过的三站：本机 Omni、macOS 系统听写、配置的 ASR API。
- 本例选中第 1 条：它的卡片标着「本例选中这条」，另外两张卡片标着「收不到录音」，因为一次 session 只把录音交给一个识别服务。
- 本机 Omni 在这台 Mac 上启动模型服务，通过 `127.0.0.1` 通信。这个地址只指向本机。
- 系统听写通过第 2 章的 helper 调用 macOS 自带的 `SFSpeechRecognizer`，不用从 Voxt 模型目录另下载模型。
- 配置的 ASR API 可以是外部服务。本例把它画在 Mac 外；如果地址是 `127.0.0.1`，它也属于本机路线。

### 公式

$$
B=R\times C\times T
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $B$ | 这段 PCM 录音的字节数 | 本步计算 |
| $R$ | 每秒样本数 | 第 3 章与 `asr.SampleRate`，16,000 |
| $C$ | 每个样本的字节数 | 第 3 章 PCM16 LE，2 字节 |
| $T$ | 录音时长 | 本步构造的 1 秒 |

### 代入图上的数

| 要算的量 | 算式 | 结果 |
|---|---|---:|
| 每秒 PCM 字节数 | $16{,}000\times2$ | 32,000 字节 |
| 1 秒录音大小 | $32{,}000\times1$ | 32,000 字节 |

32,000 字节是未经 WAV 文件头包装的 PCM 数据量，用来感受一段声音要搬运多少数据，不是识别耗时或网络实测流量。

### 选择与数据边界

session 解析出用户选中的 ASR provider 后，只把这次录音交给它。本地 Omni 和系统听写分别经过本机模型服务与 helper；远程服务使用用户配置的 endpoint、模型与授权信息。外部 endpoint 必须使用 `https://` 或 `wss://`，loopback 是例外。

本步不比较识别质量，也不声称系统听写适用于所有语言。macOS 没有所选语言的本机模型，或没有语音识别权限时，打开流会失败。

### 接下来

路线决定声音交给谁。下一步看只能接收整段录音的服务，在停止说话后怎样拿到一份 WAV 并返回最终文字。

### 源码出处

公开基线：<code>sglang-omni@0e641996a0<wbr>c269601d03f1cb29<wbr>d3f46d7cb345a6</code>，路径均相对该仓库。

- ASR 的输入格式、本机与远程 provider：`Voxt/internal/asr/asr.go:1-20,31-76`。
- 本机 Omni 的 loopback 服务与按需启动：`Voxt/internal/omni/doc.go:1-5,29-48`。
- 系统听写、语言与权限失败：`Voxt/internal/dictation/dictation.go:1-12,31-58`。
- 远程服务配置与预设：`Voxt/internal/providers/speech.go:27-75,158-193`。

## 第 2 步 · 文件型识别等整段结束

> **一句话：** 文件型识别在停止后接收完整录音；OpenAI 兼容接口把本例 PCM 包成 WAV，上传后返回最终文字。

### 图上是什么

- 0–3 秒的蓝色竖线是构造的说话波形；3 秒处橙色线是停止点。停止前，主图没有最终文字。
- `FileTranscriber` 是文件型识别器：一次接收完整录音并返回 `Result`，不是在说话途中持续给草稿。
- WAV 例子包含 PCM 声音和 44 字节文件头。文件头记录格式等信息，不是额外 44 字节声音。
- `final` 是最终文字，也就是这次识别正式采用的结果。橙色只标停止点和最终结果。
- 本例上传一次，得到 “Good morning.”。真实文字由模型决定，这句英文只是构造的识别结果。

### 公式

$$
W=T\times R\times C+H
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $W$ | WAV 文件总字节数 | 本步计算 |
| $T$ | 录音秒数 | 本步构造的 3 秒 |
| $R$ | 每秒样本数 | 第 1 步，16,000 |
| $C$ | 每样本字节数 | 第 1 步，2 |
| $H$ | WAV 文件头 | `asr.WAV`，44 字节 |

### 代入图上的数

| 要算的量 | 算式 | 结果 |
|---|---|---:|
| PCM 声音 | $3\times16{,}000\times2$ | 96,000 字节 |
| WAV 总大小 | $96{,}000+44$ | 96,044 字节 |

96,044 字节只计算 WAV 文件本身。实际上传还包含 multipart 表单边界、模型名等字段，所以不能把图上的文件大小当成整个 HTTP 请求大小。

### 选择规则与边界

session 先检查选中的 provider 是否实现 `Streamer` 且 `Caps().Stream` 为真；不能流式识别时，才走本步的 `FileTranscriber` 分支。它调用 `prepare` 得到处理后的 PCM，再把 `Format: "pcm"`、语言、词典提示、上下文和上传上限一起传给 provider。

OpenAI 兼容 client 收到 PCM 后调用 `asr.WAV` 包装，再向 `/audio/transcriptions` 发一个 multipart 上传。其他文件型 provider 可以使用自己的格式；本步的 44 字节算式只指这个 WAV 例子。超过上传上限的长录音留到第 4、5 步。

### 接下来

整段上传简单，但要等停止才有文字。下一步看支持流式识别的服务怎样在说话途中先给可修改的草稿，停止后再给最终结果。

### 源码出处

公开基线同第 1 步。

- 文件型接口与请求：`Voxt/internal/asr/asr.go:59-76,101-105`。
- session 的流式优先、文件型后备分支：`Voxt/internal/session/run_audio.go:18-22`；`Voxt/internal/session/run_listen.go:399-418`。
- WAV 的 44 字节头与 PCM 包装：`Voxt/internal/asr/audio.go:27-49`。
- OpenAI 兼容接口的单次上传与 PCM→WAV：`Voxt/internal/asr/openai/openai.go:1-5,101-129`。

## 第 3 步 · 流式草稿会被替换

> **一句话：** 流式识别在录音途中给出整份当前草稿；新草稿替换旧草稿，停止后的最终文字才正式采用。

### 图上是什么

- `Streamer` 是流式识别器：录音还没结束，就能接收声音并返回文字。
- 三个蓝框对应本例三次 `Send`。每次送入一些声音后，识别器可能发出 `EventPartial`，图里简写为“草稿”。
- “Good” → “Good mor” → “Good morning” 是三份依次替换的完整草稿，不是三段要接起来的话。第二份包含第一份，第三份又包含第二份。
- 本例文字只是变长；真实模型也能改动已经显示的字词，所以草稿不能当成最终结果。
- 停止后调用 `Finish`。`EventFinal` 给出正式结果，橙色框标出它取代草稿。

### 公式

$$
N=S+1
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 本例对 stream 的调用次数 | 本步计算 |
| $S$ | 录音途中调用 `Send` 的次数 | 本步构造的 3 次 |
| $1$ | 停止时调用一次 `Finish` | `run_audio.go` 的结束分支 |

### 代入图上的数

| 要算的量 | 算式 | 结果 |
|---|---|---:|
| 本例总调用次数 | $3+1$ | 4 次 |
| 本例草稿数量 | 每次 `Send` 后一份 | 3 份 |

实际 `Send` 次数随录音长度和帧大小变化；provider 也不必在每次 `Send` 后都发草稿。本例固定三次，是为了看清“替换”而不是模拟性能。

### 协议规则与边界

session 只在 provider 实现 `Streamer` 且声明 `Caps().Stream` 时走这条路。后台循环在录音期间发送音频，录音结束后调用 `Finish`；事件循环把 `EventPartial` 写进当前快照，把 `EventFinal` 或 `EventError` 当作终止事件。

`Partial` 是当前整份假设文本，不是增量 delta。不同 provider 的草稿时机和内容可以不同；本步只讲共同协议，不保证一秒一份，也不把所有本机 Omni 的细节套给其他服务。

### 接下来

流式识别可以边听边改草稿。若文件型录音超过上传上限，就要先切块；下一步看切点怎样避开词语中间。

### 源码出处

公开基线同第 1 步。

- 流式能力判断：`Voxt/internal/session/run_audio.go:18-22`。
- `Finish` 与草稿、最终、错误事件：`Voxt/internal/session/run_audio.go:176-225`。
- stream 接口和事件约定：`Voxt/internal/asr/asr.go:107-177`。

## 第 4 步 · 超长录音在安静处切块

> **一句话：** 文件上传超过上限时，`SplitPCM` 在当前块最后四分之一寻找最安静的 100 ms，把切点落在停顿里。

### 图上是什么

- 本例来自公开测试：10 秒声音，单块上限相当于 9 秒；8.5 秒处有一段 300 ms 安静停顿。
- 蓝色区域是当前 9 秒预算的最后四分之一，从 6.75 秒到 9 秒。算法只在这个范围寻找切点，避免第一块过短。
- `quietest 100 ms` 指声音能量最小的一小段。代码计算 PCM 样本平方和，能量越小越安静。
- 橙色框是停顿，橙色虚线是切点。测试只要求切点落在停顿里，不指定一个对所有录音都固定的秒数。
- 切完后有第 1、2 块。剩余部分从切点继续，不复制也不丢掉声音；两块都不超过 9 秒上限。

### 公式

$$
L=\frac{M}{4},\qquad S=M-L=\frac{3M}{4}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $L$ | 搜索范围时长 | 当前块上限的最后四分之一 |
| $M$ | 当前块的最大时长 | 测试的 9 秒 PCM 上限换算 |
| $S$ | 搜索范围起点 | $M-L$ |

代码实际使用字节数，不是先把录音转成秒。因为测试 PCM 每秒字节数固定，图上用等价的秒数显示。安静窗长为 $R/10\times2$ 字节，其中 $R$ 是采样率；16 kHz、PCM16 时正好是 100 ms。

### 代入图上的数

| 要算的量 | 算式 | 结果 |
|---|---|---:|
| 搜索范围长度 | $9/4$ | 2.25 秒 |
| 搜索范围起点 | $9-2.25$ | 6.75 秒 |
| 停顿范围 | $8.5$ 到 $8.5+0.3$ | 8.5–8.8 秒 |
| 切出的块数 | 公开测试断言 | 2 块 |

若找不到停顿，代码仍在允许的边界切，不会为了找安静处无限延长块。若剩余录音已经不超过上限，循环结束，余段成为最后一块。

### 实际上传与边界

`TranscribeInPieces` 先比较“44 字节 WAV 头 + PCM”与上传上限，需要分块时从 PCM 预算减去 44 字节。用户设置了更小上限时，采用更小者。第 2 步的 WAV 算式因此也影响这里能装多少声音。

这些块是停止后为文件上传切出的 pieces，不是第 3 步录音途中发送的 stream frames，也不是所有 provider 都会采用的策略。其他格式或未超上限的录音直接单次识别。

### 接下来

切点保证声音完整且每块可上传。下一步把各块按顺序送去识别，再把文字按相同顺序接回来。

### 源码出处

公开基线同第 1 步。

- 最后四分之一、100 ms 安静窗与切分循环：`Voxt/internal/asr/split.go:12-45`。
- 10 秒、9 秒上限和 8.5 秒停顿测试：`Voxt/internal/asr/split_test.go:13-33`。
- WAV 头预算与逐块识别入口：`Voxt/internal/asr/split.go:47-65`。

## 第 5 步 · 按原顺序合并各块文字

> **一句话：** 各块依次识别，非空结果按原顺序交给 `JoinText`；英文等文字之间补空格，中文等文字之间不强加空格。

### 图上是什么

- 第 1 块先识别为 “Good”，第 2 块随后识别为 “morning.”。代码等一块返回后才处理下一块，不并行打乱顺序。
- `JoinText` 是文字合并函数。它接收按原顺序排列的非空文本，而不是重新排列或再次识别声音。
- 英文属于用空格分词的文字，所以两份结果之间补一个空格，得到 “Good morning.”。
- 橙色框是合并后的文字。它仍是这次文件识别的最终结果，不是第 3 步那种可覆盖的流式草稿。

### 公式

$$
J=p_1\mathbin{\oplus_s}p_2
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $J$ | 合并后的文字 | `JoinText` 的返回值 |
| $p_1$ | 第 1 块的非空识别文字 | 本例 “Good” |
| $p_2$ | 第 2 块的非空识别文字 | 本例 “morning.” |
| $\oplus_s$ | 按边界字符选择分隔符后连接 | `JoinText`；本例 $s$ 是一个空格 |

分隔符不是永远为空格。前一段末尾或后一段开头是中文、日文、韩文等不使用空格分词的文字，或是全角标点时，不额外补空格；已有空白也不重复补。

### 代入图上的数

| 要算的量 | 算式 | 结果 |
|---|---|---:|
| 非空文字段数 | 第 4 步的两块各返回一份 | 2 段 |
| 英文边界数 | $2-1$ | 1 个 |
| 补充空格数 | 每个英文边界一个 | 1 个 |
| 合并文字 | $\text{Good}+\text{空格}+\text{morning.}$ | Good morning. |

若某块识别结果去掉首尾空白后为空，它不会进入 `texts`，也就不制造额外空格。剩余非空结果仍保持录音顺序。

### 错误与范围

任何一块返回错误，`TranscribeInPieces` 立即返回错误，不会把已经成功的几块包装成一次完整成功。成功时还累计时长、保留首个非空语言和最后模型信息；主图只画文字合并。

这一步仍属于 `TranscribeInPieces` 的文件上传路线。本机 Omni 长录音另有 `joinParts` 和 live pieces，不应把这里的英文空格例子当成所有文字处理规则。

之所以要切块，是因为长录音一次性识别又慢又占内存。公开的分段识别谱系和实测数字收在第 6 步的深入讲解。

### 接下来

现在已经走完文件型的切块与合并。下一步回到第 1 步的本机 Omni，看实时草稿之后为什么还要做一次完整 Final。

### 源码出处

公开基线同第 1 步。

- 逐块识别、空结果省略、错误返回与合并：`Voxt/internal/asr/split.go:47-80`。
- 英文空格与不使用空格分词的文字规则：`Voxt/internal/asr/split.go:83-107`。

## 第 6 步 · 本机 Omni 草稿之后再做 Final

> **一句话：** 默认本机 Qwen3-ASR 约每秒更新预览；`LiveResult` 关闭时，停止后仍对完整录音做 Final，最终结果不直接采用草稿。

### 图上是什么

- 本步只讲第 1 步的本机 Omni，使用 Qwen3-ASR 的默认 `LiveResult: false` 路线，不把规则套给所有 ASR。
- 首个可闻声音后约 100 ms 开始第一次解码，随后约每秒更新一次预览。起点是检测到可闻声音，不是按快捷键的时刻。
- 本例仍说 “Good morning.”，长 3 秒。按构造节拍，三份草稿出现在 0.1、1.1、2.1 秒；它们是预览，不是三份最终结果。
- 3 秒停止后，橙色 Final 重新识别完整录音并给出最后结果。第 3 步已经说过草稿可改，本步新增的是“默认本机路线最后再完整听一遍”。

### 公式

$$
t_i=t_0+0.1+i\times1\quad(i=0,1,2)
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t_i$ | 本例第 $i+1$ 次预览的秒数 | 本步按公开节拍构造 |
| $t_0$ | 首个可闻声音的时刻 | 本例设为 0 秒 |
| $0.1$ | 首次解码等待的秒数 | `FirstDecode = 100 ms` |
| $1$ | 后续解码间隔的秒数 | `DecodeInterval = 1 s` |
| $i$ | 从 0 开始的预览序号 | 本例 0、1、2 |

### 代入图上的数

| 要算的量 | 算式 | 结果 |
|---|---|---:|
| 第 1 份草稿 | $0+0.1+0\times1$ | 约 0.1 秒 |
| 第 2 份草稿 | $0+0.1+1\times1$ | 约 1.1 秒 |
| 第 3 份草稿 | $0+0.1+2\times1$ | 约 2.1 秒 |
| Final 的输入 | 停止点减去录音起点 | 完整 3 秒 |

这些时刻说明调度节拍，不是识别延迟实测。可闻声音检测、服务排队和模型速度都会影响真实草稿出现时间。

### 为什么预览失败仍可能有 Final

`Send` 一方面把音频排入预览，另一方面把 PCM 保存到 `s.audio`。因此预览落后或失败可以停止，Final 所需的录音仍在。默认 `Finish` 启动 `finalPass`，成功时最后发出 `EventFinal`。

长录音若已有后台完成的 pieces，Final 只识别剩余 tail，再与 pieces 合并；本例很短，没有这类已完成片段，所以图上说完整 3 秒。开启 `LiveResult` 后，满足条件的实时全文可以直接成为结果；失败后仍有回退。本步主图不展开这个可选开关。

### 接下来

无论走文件、流式还是本机 Final，识别路线最后都要交出一份原话。下一步看这份原话在哪里停下，以及下一章要追问什么。

### 源码出处

公开基线同第 1 步。

- 100 ms 首次解码与 1 秒间隔：`Voxt/internal/omni/models.go:157-166`。
- `Send` 保存 Final 音频并排队预览：`Voxt/internal/omni/live.go:221-265`。
- 默认 `Finish` 启动 Final：`Voxt/internal/omni/live.go:368-393`。
- Final 的 tail、合并与最终事件：`Voxt/internal/omni/live_final.go:11-18,39-56,80-82`。
- `LiveResult` 开关含义：`Voxt/internal/settings/settings.go:163-167`。

公开分段识别证据（长录音一次性识别又慢又占内存，decode 每个 token 都要一次完整前向；每条保留 PR、测量 setup 与边界；不来自 pinned 代码基线）：

- 谱系：[PR #1730](https://github.com/sgl-project/sglang-omni/pull/1730)（已合并 `d525bf6d8887` / `68c88dae641f`）建立 Qwen3-ASR 的 Apple MLX 与 Torch MPS 路径；[PR #1981](https://github.com/sgl-project/sglang-omni/pull/1981)（已合并 `667d258265a8` / `6742fb356c63`）抽出共享 runner；[PR #2549](https://github.com/sgl-project/sglang-omni/pull/2549) 把 Voxt 本机 Qwen3-ASR 迁到独立 MLX server，由 [PR #2576](https://github.com/sgl-project/sglang-omni/pull/2576) 落地 main——一次收益，不是两次；[PR #2577](https://github.com/sgl-project/sglang-omni/pull/2577)（已合并 `d2b32de5b682` / `a30e33eb83bb`）落到 native C++ runtime，不再有 Python runtime。
- [PR #2549](https://github.com/sgl-project/sglang-omni/pull/2549)：Apple M5/24 GB、Qwen3-ASR 0.6B 4bit、392 clips。短录音 Final p50/p95 194/279 → 111/145 ms，吞吐 21.0 → 49.8 audio-s/s；first-preview p50/p95 202/1207 → 197/2518 ms，p95 退化。两行是不同的对照：Final 是 A0/C/C/A0 interleaved 的 median，first preview 是 live C 第 1 轮对 A0 第 14–16 轮。同一组 A/B 还暴露了 meeting update gap 退化，来源未给数字，按未量化负结果保留。主表测量 head 未记录；这是真实 native 服务路径，不是完整真实 App。
- [PR #1981](https://github.com/sgl-project/sglang-omni/pull/1981) 的警示：共享 runner 的对照以两条 p50 处于噪声内判定性能中性，但 p95 和 First SSE 并非逐项不变，最终 head 未复测。并发会提高吞吐，同时显著抬高 p50/p95，这不是无成本的 batching。
- [PR #3285](https://github.com/sgl-project/sglang-omni/pull/3285)：native runtime 上的 DFlash 推测解码，Apple M5/16 GiB、392 clips（5,225 秒）、ABBA。1.7B 8bit decode 57 → 189 tok/s，0.6B 4bit 244 → 402 tok/s。benchmark 表未绑定精确测量 SHA，路径为 native CLI/server protocol，不是完整 Voxt App。已合并：`e52652558d06` / `6abdc68c1ee2`。保留的负结果：18 分钟单 chunk（1,040 秒、1.7B 8-bit、`--max-new-tokens 4096`）为 30.4 → 34.6 s（0.88×，draft 更慢）；它与 392 clips 表口径不同，不合并。
- [PR #3579](https://github.com/sgl-project/sglang-omni/pull/3579)（已合并 `8e04026bc0c9` / `35681602d054`）：Whisper 的 distil 推测解码。英文和中文加速；mixed 语音与 silence/noise 退化，按负结果保留。
- [PR #3580](https://github.com/sgl-project/sglang-omni/pull/3580)（已关闭，未合并）与 [PR #3604](https://github.com/sgl-project/sglang-omni/pull/3604)（已合并 `4c23ddaacc20` / `2686ad661da5`）：Ming3 MTP 的两种实现。#3580 在测量 head `c6d2eca0`、Apple M5 Pro/64 GB、401 个 speech inputs、ABBA 两轮均值下为 328.42 → 302.88 s（约 1.08×），轮间差与收益同量级。后续同机三方对照——plain `8b54e03b`、#3580 `eb82034e0`、#3604 `cf7af2b73`、384 个 speech clips，顺序 plain → #3580 → #3604 → #3604 → #3580 → plain，每 pass fresh server、排除 warmup、间隔 10 分钟、c=1 non-streaming、每种实现两轮——#3604 在 speech total/median/P95 上比 #3580 再快 3.5/2.1/4.7%。但这只是单轮六 pass，输出差异仍不能省略，两笔收益不能累计。
- [PR #3360](https://github.com/sgl-project/sglang-omni/pull/3360)（已合并 `75e04d6a9bb2` / `e68f47af6db8`）测量 Qwen3-ASR 长音频可靠性。它是测量链，不提供通用提速结论。
- 保留的未落地分支：[PR #3710](https://github.com/sgl-project/sglang-omni/pull/3710)（已关闭 draft）在 draft 每轮提交不足 2 个 token 时不用 DFlash draft 解码；[PR #3765](https://github.com/sgl-project/sglang-omni/pull/3765)（已关闭）保留长 prompt 的替代路线；[PR #4554](https://github.com/sgl-project/sglang-omni/pull/4554)（仍 OPEN draft）保留 Ming DSpark 的负结果。
- 未闭环：[PR #2708](https://github.com/sgl-project/sglang-omni/pull/2708)、[PR #2713](https://github.com/sgl-project/sglang-omni/pull/2713)、[PR #3172](https://github.com/sgl-project/sglang-omni/pull/3172)、[PR #3374](https://github.com/sgl-project/sglang-omni/pull/3374) 和 [PR #4549](https://github.com/sgl-project/sglang-omni/pull/4549) 仍 OPEN，它们的数字都不是已发布结果。[PR #2615](https://github.com/sgl-project/sglang-omni/pull/2615) 的 first-real-text 指标是已关闭的测量提案，不能用新口径宣布旧门槛通过。

## 第 7 步 · 识别交出原话，下一章再问语言模型

> **一句话：** 选中的 ASR 路线返回一份识别原话，session 把它放入 `Snapshot.Raw`；语言模型怎样连接和取钥匙是下一章的问题。

### 图上是什么

- 橙色框只有一份最终识别文字，本例是 “Good morning.”。它不是三份草稿相加，也不是分块后的两份文字。
- `raw text` 在这里指识别出来、尚未由语言模型整理的原话。它不是原始 PCM 音频。
- `Snapshot.Raw` 是 session 保存这份原话的字段。代码还会去掉首尾空白，并按设置移除结束词；图中句子没有额外空白或结束词，所以文字不变。
- 蓝色虚线框是下一章的问题：语言模型除了原话还收到什么，它的 API key 放在哪里。语言模型是负责整理文字的模型，本章没有执行这次整理。

### 公式

$$
R=\operatorname{withoutEndWord}(\operatorname{trim}(F),w)
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $R$ | 交给后续流程的识别原话 | <code>run_<wbr>listen.go</code> 的 `raw` |
| $F$ | provider 返回的最终文字 | 本例 “Good morning.” |
| $w$ | 设置的结束词 | session 配置；本例没有 |
| `trim` | 去掉首尾空白 | <code>strings.<wbr>TrimSpace</code> |
| <code>without<wbr>End<wbr>Word</code> | 按设置移除结束词 | <code>run_<wbr>listen.go</code> 同名调用 |

实际代码还先用 `inScript` 处理文字方向，再执行上式。它只改变文字表示，不调用语言模型润色。

### 代入图上的数

| 要算的量 | 算式 | 结果 |
|---|---|---:|
| 第 1 步候选路线 | 本机、系统、配置的 API | 3 条 |
| 实际识别路线 | 一次只选一条 | 1 条 |
| 原话结果 | 一次识别交付一份 | 1 份 |
| 本例原话 | $F$ 无额外空白，$w$ 未出现 | Good morning. |

若处理后 `raw` 为空，session 不会把空白当成有效原话继续；普通听写会以“没有听出语音”结束。本例非空，所以保存 `Raw` 并继续。

### 本章边界

到这里已经回答：三条路线选一条；文件型等整段，流式给可替换草稿；超长文件在安静处分块并按序合并；默认本机 Omni 在草稿后做 Final。

本章没有讲语言模型请求、文字润色、API key 存放或把文字插入其他 app。最后一步故意停在看得见的原话上，让下一章从这份原话继续，而不是提前宣称整理已经完成。

### 接下来

下一章从 `Raw` 出发，看语言模型服务还收到哪些上下文，endpoint、model 和 API key 分别怎样配置。

### 源码出处

公开基线同第 1 步。

- 原话 trim、结束词移除与 `Snapshot.Raw`：`Voxt/internal/session/run_listen.go:438-449`。
- ASR 请求中的授权字段只用于识别连接：`Voxt/internal/asr/asr.go:9-20,59-76`。
