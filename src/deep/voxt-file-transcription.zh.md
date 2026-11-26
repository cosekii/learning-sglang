## 第 1 步 · 两条路线

> **一句话：** 听写把文字放进光标，文件转写把文字写成 SRT 或 TXT；两条都用 Voxt 和语音模型，但文件路线不打开听写 session。

### 图上是什么

- 左栏是**听写**：麦克风和 helper 送来的声音，经过一次听写 session，最后变成光标处的文字，并可能写一条历史记录。
- 右栏是**文件**：磁盘上的 `meeting.m4a`，经过 `Voxt transcribe`，最后得到 `meeting.srt` 或 `talk.txt`。
- 底部两行说共同点和区别：共同点是 Voxt 和语音模型，区别是文件路线没有听写 session。

### 两条路线各做什么

| 路线 | 输入 | 中间的会话 | 输出 |
|---|---|---|---|
| 听写 | 麦克风的 16 kHz 单声道帧（第 3 章） | 一次听写 session | 光标处的文字，可能进历史 |
| 文件 | 磁盘上的音频或视频 | 无 | SRT 或 TXT 文件 |

`runTranscribeCLI` 只把命令参数、标准输出、标准错误、socket 路径和一个解码函数交给 `transcribeCLI`（`Voxt/transcribe_cli.go:35-39`）。命令本身不做听写，也不碰历史。应用一侧的 `fileRecognizer` 直接调用 `asr.Recognize`（`Voxt/transcribe_socket.go:84-87`），没有经过 `session` 的整理、交付和历史写入。

### 为什么单独画这条路线

第 9 章的结尾问「除了现场说话，已有音频文件怎样变成字幕或文本？」。文件路线回答了这个问题，但它的输出不是光标处的文字，所以不能套用听写那一步的图。后面的步骤沿着橙色走。

### 接下来

文件先要变成语音模型能读的声音。第 2 步讲解码。

## 第 2 步 · 解码成 PCM

> **一句话：** 命令让 macOS 的 `afconvert` 把文件转成 16 kHz、单声道、16 位 PCM，放进一个临时 WAV。

### 图上是什么

- 左边橙色框是输入的 `talk.m4a`，标着 8 秒。
- 中间蓝色框是 `afconvert`，写着 `-f WAVE -d LEI16@16000 -c 1`。
- 右边蓝色框是临时文件 `audio.wav`。
- 下面是字节算式，最后一行把 256 KB 比作「比一张手机照片小」。

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

`afconvert` 也能读 mp4、mov 里的声音，所以视频不用先单独抽音轨。`decodeAudio` 的注释写明了这一点（`transcribe_cli.go:111-112`）。

### 接下来

PCM 已经能送进模型了，但模型在运行中的 Voxt 里。第 3 步讲怎么送过去。

## 第 3 步 · 本机 socket 交接

> **一句话：** 命令把一行 JSON 请求和 PCM 通过本机的 `transcribe.sock` 送给运行中的 Voxt，应用每句回一行。

### 图上是什么

- 左边橙色框是命令，写着 `Voxt transcribe` 和文件名。
- 中间蓝色圆角框是 `transcribe.sock`，标着 `0600 · 只在本机`。
- 右边是运行中的 Voxt，说明它会选 Transcribe 的模型。
- 下面一行是请求 JSON，再下面是 256,000 字节 PCM；再下面是三行回复。

### 请求和回复

请求是**一行 JSON**，后面直接跟 PCM：

```json
{"op":"transcribe","bytes":256000,"lang":""}
```

`Request` 的三个字段就是这三个（`Voxt/internal/fileasr/socket.go:34-39`）。`lang` 为空表示应用用听写的语言提示；命令给了 `--lang` 就填进来（`transcribe_socket.go:77-79`）。一行请求最多 4 KiB（`socket.go:25-29`）。

回复是**每句一行 JSON**，最后一行是 `done`：

```json
{"segment":{"start":0,"end":3350000000,"text":"Good morning."}}
{"segment":{"start":3400000000,"end":7850000000,"text":"See you at noon."}}
{"done":true,"count":2}
```

`Segment` 的时间单位是纳秒，因为 Go 的 `time.Duration` 在 JSON 里就是整数纳秒（`Voxt/internal/fileasr/fileasr.go:26-31`）。图上为了读得清，只画了请求和示意回复；精确字段见上面。

### socket 在哪里，谁能打开

socket 名是 `transcribe.sock`，放在应用的数据文件夹里（`socket.go:16-17`）。`historyapi.Listen` 绑定它之后 `chmod` 成 `0600`（`Voxt/internal/historyapi/server.go:101-114`）。它没有网络端口，只有你的账户能打开。命令不需要读你的任何文件夹，只读你给的那个文件。

### 代入图上的数

| 量 | 值 | 从哪来 |
|---|---|---|
| PCM 字节 | 256,000 | 第 2 步 |
| socket 权限 | `0600` | `historyapi/server.go:111` |
| 请求行上限 | 4,096 B | `socket.go:25-29` |
| 回复行数 | 2 句 + 1 条 `done` | 本步例子 |

### 接下来

应用拿到整段 PCM 后，先要决定在哪里断开成句。第 4 步讲停顿。

## 第 4 步 · 停顿结束一句

> **一句话：** 切句器每 10 ms 看一帧，安静满 450 ms 就结束一句；下一句从讲话前 300 ms 开始，讲话太短的句子丢掉。

### 图上是什么

- 上面两条蓝色横线是第 1 句和第 2 句的时间范围：0.00–3.35 s、3.40–7.85 s。
- 中间的波形蓝色是讲话，灰色是安静。
- 中间的小橙框标出第 1 句末尾的 450 ms 安静；小蓝框标出第 2 句提前开始的 300 ms。
- 下面三行是三条规则。

### 三条规则

`Cutter` 的常量在 `Voxt/internal/meeting/cutter.go:9-19`：

| 常量 | 值 | 作用 |
|---|---|---|
| `cutterFrame` | 10 ms | 每次检查一帧 |
| `cutterSilenceCut` | 450 ms | 安静这么久就结束一句 |
| `cutterPreRoll` | 300 ms | 新一句往前多留 300 ms |
| `cutterMinUtterance` | 350 ms | 讲话不足这么久就丢掉 |

结束条件是 `c.silence >= cutterSilenceCut`（`cutter.go:70-74`）。新一句在 `startUtterance` 里把起点减 300 ms（`cutter.go:95-105`），这样句首的辅音不会被切掉。短句在 `finalize` 里被拒绝（`cutter.go:119-127`）；调用方仍然会清空缓冲，所以短句不会留下来。

$$ \text{cue end} = \text{last speech} + 450\ \text{ms},\qquad \text{cue start} = \text{speech onset} - 300\ \text{ms} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| last speech | 最后一个讲话帧 | 本步的 10 ms 帧 |
| 450 ms | 结束一句的安静长度 | `cutterSilenceCut` |
| speech onset | 第一个超过能量门槛的帧 | `cutterSpeechRMS = 800` |
| 300 ms | 句首预卷 | `cutterPreRoll` |

### 代入图上的数

| 量 | 值 | 算式 |
|---|---|---|
| 第 1 句讲话结束 | 2.90 s | 构造 |
| 第 1 句结束 | 3.35 s | $2.90 + 0.45$ |
| 第 2 句讲话开始 | 3.70 s | 构造 |
| 第 2 句开始 | 3.40 s | $3.70 - 0.30$ |
| 第 2 句讲话结束 | 7.40 s | 构造 |
| 第 2 句结束 | 7.85 s | $7.40 + 0.45$ |

### 为什么末尾的安静也留下

`finalize` 的 `End` 是触发结束的那一帧，缓冲里已经包含这 450 ms 安静（`cutter.go:119-127`）。本章不删它；模型通常会把尾部静音忽略掉。图上的 SRT 时间就是按这个 `End` 写的。

### 接下来

如果一句话一直说下去，450 ms 的规则永远不触发。第 5 步讲 7 秒上限。

## 第 5 步 · 7 秒上限

> **一句话：** 一句到 7 秒还没有长停顿时，切句器在最后 1 秒里找最安静的 100 ms 切开，剩下的继续当下一句。

### 图上是什么

- 上面两条蓝线是第 1 段 0–6.5 s 和第 2 段 6.5–9 s。
- 波形整段都是蓝色，表示没有 450 ms 的停顿。
- 橙色框和虚线标出 6.0–7.0 s 的搜索范围，切点在 6.5 s。
- 下面三行说：到 7 秒没有停顿、在最安静的 100 ms 里切、剩下的成为下一句。

### 触发和切点

`pushFrame` 在 `end - c.utterStart >= cutterMaxSegment` 且没有触发 450 ms 规则时调用 `cutAtQuietest`（`cutter.go:75-78`）。`cutterMaxSegment` 是 7 秒。`cutAtQuietest` 搜索 `cutterQuietSearch = 1 s`、窗口 `cutterQuietWindow = 100 ms`（`cutter.go:16-17`、`cutter.go:130-147`）。

$$ \text{search} = [\,7 - 1,\ 7\,]\ \text{s},\qquad \text{cut} = \arg\min_{w \subset \text{search}} \mathrm{RMS}(w) $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| 7 s | 一句的长度上限 | `cutterMaxSegment` |
| search | 最后 1 秒 | `cutterQuietSearch` |
| $w$ | 100 ms 的窗口 | `cutterQuietWindow` |
| RMS | 窗口内的声音能量 | `frameRMS`，`cutter.go:165` |

### 代入图上的数

| 量 | 值 | 从哪来 |
|---|---|---|
| 连续讲话 | 9 s | 构造 |
| 第 1 段 | 0–6.5 s | 构造的切点 |
| 第 2 段 | 6.5–9 s | $9 - 6.5$ |
| 搜索范围 | 6.0–7.0 s | $7 - 1$ 到 $7$ |

切点不是固定的 6.5 s。本步的 6.5 是构造例子；真实切点由最后 1 秒里哪个 100 ms 窗口最安静决定。`cutAtQuietest` 把切点之后的缓冲留在 `c.buf`，并把 `utterStart` 设成切点，所以剩下的声音继续组成下一句（`cutter.go:135-146`）。

### 接下来

句子切好了，应用把它们逐句送进模型。第 6 步讲识别。

## 第 6 步 · 逐句识别

> **一句话：** Voxt 用 Transcribe 选定的语音模型逐句识别，按顺序返回每句的文字，空文字的句子丢掉。

### 图上是什么

- 上面蓝色宽框是 Transcribe 的语音模型，下面写着它是在设置的 Speech models 里选的。
- 两行分别是第 1 句和第 2 句：左边橙色是时间范围，箭头指向右边蓝色框里的文字。
- 下面说：返回空文字的句子会被丢掉；`--lang` 没给时用听写的语言提示。

### 识别器从哪里来

`fileRecognizer` 在主线程读到 Transcribe 的功能模型：`a.featureModel(local.ASR, hotkey.Transcribe)`（`Voxt/transcribe_socket.go:64-67`）。如果没装模型，它返回错误，命令以退出码 4 结束。语言提示这样选：

```go
if languageTag == "" {
    languageTag = p.lang
}
```

`p.lang` 来自 `session.SpeechLang(a.prefs, i18n.Locale())`（`transcribe_socket.go:77-79`）。识别本身是 `asr.Recognize(ctx, prov, pcm, languageTag, nil, "", asr.Feed{})`（`transcribe_socket.go:84-87`）。

$$ \text{segments} \le \text{cues},\qquad \text{segment} \text{ is emitted only if } \mathrm{trim}(\text{text}) \ne "" $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| cues | 切句器交出的句子 | 第 4–5 步 |
| `text` | 模型对这一句的返回 | `asr.Recognize` |
| `trim` | 去掉首尾空白 | `fileasr.go:50` |
| segments | 回给命令的句子 | `fileasr.go:53-55` |

### 代入图上的数

| 句 | 时间 | 模型返回 | 是否回给命令 |
|---|---|---|---|
| 1 | 0.00–3.35 s | `Good morning.` | 是 |
| 2 | 3.40–7.85 s | `See you at noon.` | 是 |
| 空句 | — | `""` | 否 |

`fileasr.Run` 对每个 `Utterance` 调一次 `rec`，`strings.TrimSpace` 后为空就 `continue`（`fileasr.go:44-56`）。它按切句顺序处理，所以回复的顺序就是录音顺序。

### 接下来

每句的文字和时间都齐了，命令要把它们写成文件。第 7 步讲 SRT 和 TXT。

## 第 7 步 · 写成 SRT 或 TXT

> **一句话：** 同样的句子可以写成带编号和起止时间的 SRT，也可以写成每句一行的 TXT；命令在最后一句之后才写文件。

### 图上是什么

- 左边蓝框是 SRT：每句有编号、`HH:MM:SS,mmm` 格式的开始和结束时间、以及文字。
- 右边橙框是 TXT：只有每句的文字，每句一行。
- 下面说：最后一句之后才写文件；不给 `-o` 或写 `-o -` 时输出到 stdout，进度走 stderr。

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

### 为什么失败时没有半个文件

命令先把结果写进内存里的 `bytes.Buffer`，全部成功后才 `os.WriteFile`（`Voxt/transcribe_cli.go:91-101`）。如果识别在中途失败，`err != nil`，函数提前返回，缓冲区不会落盘。`-o -` 或没有 `-o` 时，它把缓冲区写到 stdout，也不创建文件。

### 接下来

输出已经写好了。第 8 步看这条路线在 Mac 上留下什么。

## 第 8 步 · 不写历史，不留录音

> **一句话：** 文件路线不写历史记录、不留录音，只写一行不含文字的日志；声音送给 Transcribe 选定的本机模型或远端服务。

### 图上是什么

- 左边「不留下」列出三样：历史记录、录音、日志里的文字。
- 右边「留下」是一行日志：长度和句子数，没有文字。
- 下面是声音的两个去向：本机语音模型，或为 Transcribe 设置的远端语音服务。
- 最后一行问：模型文件和应用更新怎样到达这台 Mac？

### 代码怎么保证

`fileRecognizer` 直接调用 `asr.Recognize`（`transcribe_socket.go:84-87`），没有调用 `session` 的 `keep()`，所以不会写 `store.Entry`，也不会写 WAV。完成回调只拼一条 `core.LogEntry`：

```go
Message: fmt.Sprintf("transcribed a file for the command line: %s of audio, %d segments", ...)
```

（`transcribe_socket.go:90-98`）。这段消息里没有识别出的文字。

$$ \text{log} = \{\text{audio length},\ \text{segment count},\ \text{error?}\} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| audio length | PCM 字节换算出的时长 | `socket.go:53-55` 的 `req.Bytes/2/16000` |
| segment count | 回给命令的句子数 | `fileasr.go:53-55` |
| error | 失败时的错误 | `transcribe_socket.go:95-97` |

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
