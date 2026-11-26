## 第 1 步 · 两条路线

> **一句话：** 听写把文字放进光标，文件转写把文字写成 SRT 或 TXT；两条都用 Voxt 和语音模型，但文件路线不打开听写 session。

### 图上是什么

- 左栏是**听写**：麦克风和 helper 送来的声音，经过一次听写 session，最后变成光标处的文字，并可能写一条历史记录。
- 右栏是**文件**：磁盘上的 `meeting.m4a`，标着「1 小时会议 · 压缩 M4A」，经过 `Voxt transcribe`，最后得到 `meeting.srt` 或 `talk.txt`。
- 下面三行：一小时的会议是 3,600 秒的声音，本来就在文件里；两条都用 Voxt 和语音模型；文件路线没有听写 session 和历史记录。解码后的大小是第 2 步的算式。

### 为什么是另一条路线

区别在于结果去哪里、由什么开始。听写是为光标抓一段声音；录音本来就已经是一个文件，想要的结果是磁盘上的 SRT 或 TXT。这个文件之后用来存档、当字幕播放，或交给脚本，所以文件路线不写历史记录，也不打开听写 session。

长度不是分开的理由。更新日志写明录音已经没有时长限制（`Voxt/CHANGELOG.md:531`），`audio.maxSeconds = 0` 也表示不限时（`Voxt/docs/settings.md:150`）。图上的「一小时会议」（3,600 秒）只是尺度例子，不是听写做不到的上限。

### 代码里的两条路

`runTranscribeCLI` 只把命令参数、标准输出、标准错误、socket 路径和一个解码函数交给 `transcribeCLI`（`Voxt/transcribe_cli.go:35-39`）。命令本身不做听写，也不碰历史。听写只在 `Privacy.KeepHistory` 开启时写历史，默认开启；关闭时不写（`Voxt/internal/session/run.go:572-576`、`Voxt/internal/settings/settings.go:373-380`）。应用一侧的 `fileRecognizer` 直接调用 `asr.Recognize`（`Voxt/transcribe_socket.go:84-87`），没有经过 `session` 的整理、交付和历史写入。

### 接下来

文件先要变成语音模型能读的声音。第 2 步讲解码。

## 第 2 步 · 解码成 PCM

> **一句话：** 命令让 macOS 的 `afconvert` 把文件转成 16 kHz、单声道、16 位 PCM，放进一个临时 WAV。

### 图上是什么

- 左边橙色框是输入的 `talk.m4a`，标着 8 秒。
- 中间蓝色框是 Mac 声音工具；图上写 `16 kHz · 单声道 · 16 位`，精确命令在下面。
- 右边蓝色框是临时文件 `audio.wav`。
- 下面是字节算式；8 秒的两行把 256 KB 比作「比一张手机照片小」，再下面两行算一小时的大小。

### 解码命令和字节数

`decodeAudio` 先 `os.Stat` 文件，再建临时目录，运行：

```sh
/usr/bin/afconvert -f WAVE -d LEI16@16000 -c 1 talk.m4a audio.wav
```

然后读回 WAV，用 `asr.ReadWAV` 取出 PCM（`Voxt/transcribe_cli.go:111-139`）。`LEI16` 是 little-endian 16 位整数，`@16000` 是 16 kHz，`-c 1` 是单声道。`asr.SampleRate` 就是 16000（`Voxt/internal/asr/asr.go:32`）。

$$ \text{PCM bytes} = T \times f_s \times b,\qquad \text{WAV bytes} = \text{PCM bytes} + 44 $$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $T$ | 音频时长 | 8 s | 构造的例子 |
| $f_s$ | 采样率 | 16,000 次/秒 | `asr.SampleRate`，`asr/asr.go:32` |
| $b$ | 每个样本的字节数 | 2 B | 16 位 PCM |
| 44 | WAV 文件头 | 44 B | WAV 格式 |
| PCM bytes | 解码后的声音 | 256,000 B | 本步算式 |
| WAV bytes | 临时 WAV 的大小 | 256,044 B | 本步算式 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| PCM | $8 \times 16{,}000 \times 2$ | 256,000 B |
| WAV | $256{,}000 + 44$ | 256,044 B |
| 时间 | $8 \times 16{,}000 \times 2 \div 32{,}000$ | 8 s（回到原时长） |
| 一小时会议 | $3{,}600 \times 16{,}000 \times 2$ | 115,200,000 B = 115.2 MB |
| 手机照片 | $115.2 \div 4$ | 约 29 张 |

`afconvert` 也能读 mp4、mov 里的声音，所以视频不用先单独抽音轨。`decodeAudio` 的注释写明了这一点（`transcribe_cli.go:111-112`）。

### 接下来

PCM 已经能送进模型了，但模型在运行中的 Voxt 里。第 3 步讲怎么送过去。

## 第 3 步 · 本机 socket 交接

> **一句话：** 命令把一行 JSON 请求和 PCM 通过本机的 `transcribe.sock` 送给运行中的 Voxt；命令一边写 PCM 一边读回复，所以回复可能在最后一块 PCM 传完前就回来。

### 图上是什么

- 上面是命令、`transcribe.sock` 和运行中的 Voxt。socket 上写「只有你的账户」。
- 虚线框上方是默认请求：`{"op":"transcribe","bytes":256000}`。
- 中间上半是一段还在向右送的 PCM，写着 256,000 字节；下半是从右边回来的回复。
- 下面写着：最后一块 PCM 还没传完，回复就可能到了。

### 请求和回复

请求是**一行 JSON**，后面直接跟 PCM：

```json
{"op":"transcribe","bytes":256000}
```

`Request` 有三个字段（`Voxt/internal/fileasr/socket.go:34-39`），但 `Lang` 带 `json:"lang,omitempty"`（`socket.go:38`），`Transcribe` 又直接 `json.Marshal` 这个结构（`socket.go:146`）。没给 `--lang` 时，这个键不在线上；Unmarshal 之后字段是 `""`，应用就用听写的语言提示（`transcribe_socket.go:77-79`）。一行请求最多 4 KiB（`socket.go:25-29`）。

`op` 是动作，这里是 `transcribe`；`bytes` 是 PCM 的长度。回复是**每句一行 JSON**，最后一行是 `done`：

```json
{"segment":{"start":0,"end":3350000000,"text":"Good morning."}}
{"segment":{"start":3400000000,"end":7850000000,"text":"See you at noon."}}
{"done":true,"count":2}
```

`segment` 带一句的起止时间和文字；`done` 表示回复流结束；`count` 是回来的句子数。`Segment` 的时间单位是纳秒，因为 Go 的 `time.Duration` 在 JSON 里就是整数纳秒（`Voxt/internal/fileasr/fileasr.go:26-31`）。

### 为什么不是「传完再开始」

`Transcribe` 在 `socket.go:168-176` 里用一个 goroutine 先写请求行和整段 PCM，主 goroutine 同时读回复。服务端在 `socket.go:131-146` 读到请求行后，`transcribe` 用 `io.LimitReader` 把 PCM 交给 `fileasr.Run`；`Run` 每次读 64,000 字节（2 秒，`fileasr.go:36-37`），边切句边识别。因此一句的回复可以在后面的 PCM 还在上传时回来。图上的两条方向不同的箭头表示的就是这个并行。

$$ \text{reply}_i \text{ can arrive while } \text{uploaded bytes} < \text{Request.Bytes} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $\text{reply}_i$ | 第 $i$ 句的回复 | `socket.go:41-46` |
| $\text{uploaded bytes}$ | $\text{reply}_i$ 到达时应用已经收到的 PCM 字节 | `socket.go:168-176`；从 0 到 `Request.Bytes` |
| `Request.Bytes` | 整段 PCM 的字节数 | `socket.go:35-39`，本步 256,000 |
| 64,000 | 每次读的字节数 | `fileasr.go:36-37` |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| `Request.Bytes` | $8 \times 16{,}000 \times 2$ | 256,000 B |
| 一次读取 | $64{,}000 \div 32{,}000$ | 2 s |
| 第 1 句回复到达时的 uploaded bytes | 构造：读完两次 | 128,000 B（4 s），小于 256,000 B |
| 请求行上限 | $4 \times 1{,}024$ | 4,096 B |

### socket 在哪里，谁能打开

socket 名是 `transcribe.sock`，放在应用的数据文件夹里（`socket.go:16-17`）。`historyapi.Listen` 绑定它之后 `chmod` 成 `0600`（`Voxt/internal/historyapi/server.go:101-114`）。它没有网络端口，只有你的账户能打开。命令不需要读你的任何文件夹，只读你给的那个文件。

### 接下来

应用一边收 PCM 一边切句。第 4 步讲停顿怎样结束一句。

## 第 4 步 · 停顿结束一句

> **一句话：** 切句器每 10 ms 看一小片，安静满 450 ms 就结束一句。

### 图上是什么

- 上面两条蓝色横线是第 1 句和第 2 句的时间范围：0.00–3.35 s、3.40–7.85 s。
- 中间的波形蓝色是讲话，灰色是安静。
- 中间的小橙框标出第 1 句末尾的 450 ms 安静，从 2.90 到 3.35 s。
- 下面两行说：切句器每 10 ms 看一小片；句尾的安静也一起留下。

### 结束条件和切句小片

`Cutter` 的常量在 `Voxt/internal/meeting/cutter.go:9-19`：`cutterFrame = 10 ms`，`cutterSilenceCut = 450 ms`。结束条件是 `c.silence >= cutterSilenceCut`（`cutter.go:70-74`）。这里的 10 ms 是切句器自己的小片；第 3 章说的音频帧是 100 ms，两者不是同一个单位。

$$ \text{cue end} = \text{last speech} + 450\ \text{ms} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| last speech | 最后一个超过能量门槛的小片 | `cutterSpeechRMS = 800`，`cutter.go:18` |
| 450 ms | 结束一句的安静长度 | `cutterSilenceCut`，`cutter.go:12` |
| cue end | 这一句结束的时刻 | `finalize`，`cutter.go:119-127`；本步 3.35 s |
| 10 ms | 一个切句小片 | `cutterFrame`，`cutter.go:11` |

### 代入图上的数

| 量 | 值 | 算式 |
|---|---|---|
| 第 1 句讲话结束 | 2.90 s | 构造 |
| 第 1 句结束 | 3.35 s | $2.90 + 0.45$ |
| 第 2 句讲话结束 | 7.40 s | 构造 |
| 第 2 句结束 | 7.85 s | $7.40 + 0.45$ |

### 为什么末尾的安静也留下

`finalize` 的 `End` 是触发结束的那一小片，缓冲里已经包含这 450 ms 安静（`cutter.go:119-127`）。本章把这 450 ms 留在声音里，也留在 SRT 的结束时间里；各 provider 怎么处理尾部静音不在本章范围。图上的 SRT 时间就是按这个 `End` 写的。

### 接下来

句子的起点还有一个规则。第 5 步讲 300 ms 的提前量。

## 第 5 步 · 提前 300 ms 开始

> **一句话：** 新的一句从讲话前 300 ms 开始，这样第一个辅音不会被切掉；停顿结束时，讲话不足 350 ms 的一句会丢掉；录音结尾剩下的部分由 `Flush` 直接交出，不经过这个检查。

### 图上是什么

- 波形和上一步一样：第 1 句 0.00–3.35 s，第 2 句 3.40–7.85 s。
- 第 2 句开头的小蓝框标出 300 ms 的提前量。
- 下面两行：讲话从 3.70 秒开始，句子从 3.40 秒开始；这样保住第一个辅音。

### 起点和最短长度

`pushFrame` 先把当前帧放进环形缓冲，再调用 `startUtterance`（`cutter.go:51-62`、`95-117`）。`startUtterance` 把整个环形缓冲复制进这一句，随后循环又把同一个首个讲话帧追加一次（`cutter.go:63-69`）。环形缓冲满 300 ms 时，这句里是 290 ms 的更早声音，加上两份首个 10 ms 讲话帧。报出的起点仍是「讲话开始减 300 ms」。

短句在 `finalize(end, true)` 里被拒绝：`voicedDur < cutterMinUtterance`（350 ms）时返回 `false`（`cutter.go:119-127`）。这只走停顿结束这条路。文件读完时，`fileasr.Run` 调用 `c.Flush()`（`fileasr.go:67-68`），`Flush` 直接把剩下的缓冲交出来，不调用 `finalize`，也不查 350 ms（`cutter.go:84-92`）。

$$ \text{cue start} = \max(0,\ \text{speech onset} - 300\ \text{ms}),\qquad \text{keep}_{\text{pause}} \iff \text{voiced} \ge 350\ \text{ms} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| speech onset | 第一个讲话小片 | `cutterSpeechRMS = 800` |
| 300 ms | 句首提前量 | `cutterPreRoll`，`cutter.go:15` |
| cue start | 这一句开始的地方 | $\max(0,\ \text{speech onset} - 300\ \text{ms})$ |
| voiced | 一句里讲话小片的总长 | `voicedDur`，`cutter.go:28` |
| 350 ms | 停顿结束时一句至少要有的讲话 | `cutterMinUtterance`，`cutter.go:13` |
| $\text{keep}_{\text{pause}}$ | 停顿结束这条路是否留下这一句 | `finalize(end, true)`，`cutter.go:119-127` |

### 代入图上的数

| 量 | 值 | 算式 |
|---|---|---|
| 第 2 句讲话开始 | 3.70 s | 构造 |
| 第 2 句开始 | 3.40 s | $3.70 - 0.30$ |
| 停顿结束、只有 200 ms 讲话的一句 | 丢掉 | $200 < 350$ |
| 录音结尾剩下的 200 ms | 留下 | `Flush` 不查门槛，`cutter.go:84-92` |

### 接下来

如果一句话一直说下去，450 ms 的规则永远不触发。第 6 步讲 7 秒上限。

## 第 6 步 · 7 秒上限

> **一句话：** 一句到 7 秒还没有长停顿时，切句器在最后 1 秒里找最安静的 100 ms 切开，剩下的继续当下一句。

### 图上是什么

- 上面两条蓝线是第 1 段 0–6.5 s 和第 2 段 6.5–9 s。
- 波形整段都是蓝色，只有 6.45–6.55 s 这一小段是灰色：这是构造出来的最安静窗口。
- 橙色框标出 6.0–7.0 s 的搜索范围，虚线落在 6.5 s 的切点。
- 下面三行：到 7 秒没有停顿、在最安静的 100 ms 里切、剩下的 2.5 秒成为下一句。

### 触发和切点

`pushFrame` 在 `end - c.utterStart >= cutterMaxSegment` 且没有触发 450 ms 规则时调用 `cutAtQuietest`（`cutter.go:75-78`）。`cutterMaxSegment` 是 7 秒。`cutAtQuietest` 搜索 `cutterQuietSearch = 1 s`、窗口 `cutterQuietWindow = 100 ms`（`cutter.go:16-17`、`cutter.go:130-147`）。

$$ \text{search} = [\,7 - 1,\ 7\,]\ \text{s},\qquad w^* = \arg\min_{w \subset \text{search}} \mathrm{RMS}(w),\qquad \text{cut} = \text{mid}(w^*) $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| 7 s | 一句的长度上限 | `cutterMaxSegment`，`cutter.go:14` |
| search | 最后 1 秒 | `cutterQuietSearch`，`cutter.go:16` |
| $w$ | 100 ms 的窗口 | `cutterQuietWindow`，`cutter.go:17` |
| $w^*$ | 最安静的窗口 | `quietestCutOffset`，`cutter.go:189-199` |
| RMS | 窗口内的声音能量 | `frameRMS`，`cutter.go:165` |
| cut | $w^*$ 的中点 | `bestOff + winBytes/2`，`cutter.go:198`；本步 6.5 s |

### 代入图上的数

| 量 | 值 | 从哪来 |
|---|---|---|
| 连续讲话 | 9 s | 构造 |
| 搜索范围 | 6.0–7.0 s | $7 - 1$ 到 $7$ |
| 最安静窗口 | 6.45–6.55 s | 构造，围绕 6.5 s |
| 第 1 段 | 0–6.5 s | 切点 |
| 第 2 段 | 6.5–9 s | $9 - 6.5 = 2.5$ |

切点不是固定的 6.5 s。图上的 6.5 是构造例子，安静窗 6.45–6.55 s 就放在这里，中点是 6.5。真实切点是最后 1 秒里最安静的 100 ms 窗口中点。`cutAtQuietest` 把切点之后的缓冲留在 `c.buf`，并把 `utterStart` 设成切点（`cutter.go:135-146`）。

### 接下来

句子切好了，应用把它们逐句送进模型。第 7 步讲识别。

## 第 7 步 · 逐句识别

> **一句话：** Voxt 用 Transcribe 选定的语音模型逐句识别，按顺序返回每句的文字，空文字的句子丢掉。

### 图上是什么

- 上面蓝色宽框是 Transcribe 的语音模型，下面写着它是在设置的 Speech models 里选的。
- 两行分别是第 1 句和第 2 句：左边橙色是时间范围，箭头指向右边中性色框里的文字。
- 下面说：返回空文字的句子会被丢掉；`--lang` 没给时用听写的语言提示。

### 识别器从哪里来

`fileRecognizer` 在主线程读到 Transcribe 的功能模型：`a.featureModel(local.ASR, hotkey.Transcribe)`（`Voxt/transcribe_socket.go:64-67`）。如果没装模型，它返回错误，命令以退出码 4 结束。语言提示这样选：

```go
if languageTag == "" {
    languageTag = p.lang
}
```

`p.lang` 来自 `session.SpeechLang(a.prefs, i18n.Locale())`（`transcribe_socket.go:77-79`）。语言提示告诉模型预期哪种语言，不是要转写的文字。识别本身是 `asr.Recognize(ctx, prov, pcm, languageTag, nil, "", asr.Feed{})`（`transcribe_socket.go:84-87`）。

$$ \text{segments} \le \text{cues},\qquad \text{segment} \text{ is emitted only if } \mathrm{trim}(\text{text}) \ne "" $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| cues | 切句器交出的句子 | 第 4–6 步 |
| `text` | 模型对这一句的返回 | `asr.Recognize` |
| `trim` | 去掉首尾空白 | `fileasr.go:50` |
| segments | 回给命令的句子 | `fileasr.go:53-55` |

### 代入图上的数

| 句 | 时间 | 模型返回 | 是否回给命令 |
|---|---|---|---|
| 1 | 0.00–3.35 s | `Good morning.` | 是 |
| 2 | 3.40–7.85 s | `See you at noon.` | 是 |
| 空句 | — | `""` | 否 |

`fileasr.Run` 对每个 `Utterance` 调一次 `rec`，`strings.TrimSpace` 后为空就 `continue`（`fileasr.go:44-56`）。它按切句顺序处理，所以回复的顺序就是录音顺序；由于传输是并行的，第 1 句的回复可以在第 2 句的 PCM 还在上传时回来（第 3 步）。

### 接下来

每句的文字和时间都齐了，命令要把它们写成文件。第 8 步讲 SRT 和 TXT。

## 第 8 步 · 写成 SRT 或 TXT

> **一句话：** 同样的句子可以写成带编号和起止时间的 SRT，也可以写成每句一行的 TXT；命令在最后一句之后才写文件。

### 图上是什么

- 左边蓝框是 SRT：每句有编号、`HH:MM:SS,mmm` 格式的开始和结束时间、以及文字。
- 右边橙框是 TXT：只有每句的文字，每句一行。
- 下面说：识别成功后才打开输出文件；识别失败不创建或覆盖输出；之后的写盘失败可能留下部分文件。

### 两种格式

`Write` 的循环在 `Voxt/internal/fileasr/fileasr.go:84-99`：

- `FormatText`：`fmt.Fprintln(&b, text)`，每句一行。
- `FormatSRT`：`fmt.Fprintf(&b, "%d\n%s --> %s\n%s\n", i+1, srtTime(s.Start), srtTime(s.End), text)`。
- SRT 的第 1 块和第 2 块之间多一个空行（`i > 0` 时写 `\n`）。

$$ \text{srtTime}(d) = \text{HH}:\text{MM}:\text{SS},\text{mmm} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $d$ | 一个 `time.Duration` | `Segment.Start` / `End` |
| `HH` | 小时 | `d / 3,600,000 ms` |
| `MM` | 分钟 | `d / 60,000 ms mod 60` |
| `SS` | 秒 | `d / 1,000 ms mod 60` |
| `mmm` | 毫秒 | `d mod 1,000 ms` |

`srtTime` 把负值截成 0（`fileasr.go:102-104`）。

### 代入图上的数

| 句 | 开始 | 结束 | 文字 |
|---|---|---|---|
| 1 | `00:00:00,000` | `00:00:03,350` | `Good morning.` |
| 2 | `00:00:03,400` | `00:00:07,850` | `See you at noon.` |

TXT 只有两行：`Good morning.` 和 `See you at noon.`。

### 为什么识别失败不会创建或覆盖输出

命令先把结果写进内存里的 `bytes.Buffer`。如果识别在中途失败，`err != nil`，函数在打开输出前返回，所以不会创建新文件，也不会覆盖旧文件（`Voxt/transcribe_cli.go:73-87`）。识别成功后，命令才调用 `os.WriteFile`（`transcribe_cli.go:91-100`）。这个写入不是原子的：写盘失败可能截断旧文件或留下部分新文件，本章不保证所有失败都不留半个文件。`-o -` 或没有 `-o` 时，它把缓冲区写到标准输出，也不创建文件。

### 接下来

输出已经写好了。第 9 步看这条路线在 Mac 上留下什么。

## 第 9 步 · 不写历史，不留录音

> **一句话：** 文件路线不写历史记录、不留录音，只写一行不含文字的日志；声音送给 Transcribe 选定的本机模型或远端服务。

### 图上是什么

- 标题下先对照：听写可能写历史，文件路线不写。左边「不留下」列出三样：历史记录、录音、日志里的文字。
- 右边「留下」是一行日志：长度和句子数，没有文字。
- 下面是声音的两个去向：本机语音模型，或为 Transcribe 设置的远端语音服务。
- 最后一行问：模型文件和应用更新怎样到达这台 Mac？

### 代码怎么保证

听写只在 `Privacy.KeepHistory` 开启时写历史，默认开启；关闭时不写（`Voxt/internal/session/run.go:572-576`、`Voxt/internal/settings/settings.go:373-380`）。文件路线的 `fileRecognizer` 直接调用 `asr.Recognize`（`transcribe_socket.go:84-87`），没有调用 `session` 的 `keep()`，所以不写历史记录，也不保留历史 WAV。命令解码时确实会写一个临时 `audio.wav`，返回时删掉临时目录（`transcribe_cli.go:111-139`）。完成回调只拼一条 `core.LogEntry`：

```go
Message: fmt.Sprintf("transcribed a file for the command line: %s of audio, %d segments", ...)
```

（`transcribe_socket.go:90-98`）。这段消息里没有识别出的文字。这是应用自己的诊断日志，不是第 9 章的访问日志；一个 segment 就是一句。

$$ \text{log} = \{\text{audio length},\ \text{segment count},\ \text{error?}\} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $\text{log}$ | 写进应用日志的那一条 | `core.LogEntry`，`transcribe_socket.go:90-98` |
| audio length | PCM 字节换算出的时长 | `req.Bytes/2/16000`，`socket.go:53-55` |
| segment count | 回给命令的句子数 | `fileasr.go:53-55` |
| error | 失败时的错误 | `transcribe_socket.go:95-97` |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| audio length | $256{,}000 \div 2 \div 16{,}000$ | 8 s |
| segment count | 两句的回复 | 2 |
| 日志行 | 时长取整到秒，再接句数 | `transcribed a file for the command line: 8s of audio, 2 segments` |
| error | 这次运行没有 | 不写 |

### 声音的去向

`fileRecognizer` 先读 Transcribe 的功能模型（`transcribe_socket.go:64-67`），再用 `a.local.ASR(ctx, p.id)` 拿到这个模型的 provider（`transcribe_socket.go:80`）。模型可以装在本机，也可以配置成远端服务；`docs/transcribe.md` 的 Privacy 一节写的是：声音去 Transcribe 的音频去的地方，本机模型或远端服务，Voxt 不保留它。

| 问题 | 答案 | 出处 |
|---|---|---|
| 写历史吗？ | 不写 | `transcribe_socket.go:84-87` 直接识别，无 `keep()` |
| 留录音吗？ | 不留 | 同上；`docs/transcribe.md` |
| 日志写文字吗？ | 不写 | `transcribe_socket.go:90-98` |
| 声音给谁？ | Transcribe 选定的模型 | `transcribe_socket.go:64-80` |

### 下一步的问题

文件路线已经能跑通，但它依赖一个已经装好的语音模型和正在运行的 Voxt。模型文件和应用更新本身怎样到达这台 Mac，是下一章要回答的问题。
