## 第 1 步 · 后续窗口重复计算旧内容

**一句话。** Qwen3-Omni 的后续无状态窗口读取 25 帧旧内容和 10 帧新内容，只把 10 帧新内容输出为下一段声音。

### 图上是什么

- `vocoder` 把 codec frames 变成声音。第 9 章第 7 步讲过这次交接，Learning SGLang 第 20 章第 1–3 步讲过 10 帧对应 800 ms 声音。
- 灰色输入框有 25 帧，之前的窗口已经解码过它们。蓝色输入框有 10 帧新内容。这个窗口一共读取 35 帧。
- 只有 10 帧新内容成为新的声音 chunk。25 帧旧内容提供前文，不会变成重复播放的旧声音。
- 地图三项预告本章：合并准备好的窗口、保留之前算过的解码内容、按精确形状重放录下的 kernels。它们是三种不同机制。
- 蓝色表示新帧和对应声音，灰色表示旧输入。地图使用中性边框，因为本步还没有省掉重复工作。

### 公式与符号

$$I=c+n$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $c$ | 再次读取的旧帧数 | Qwen3-Omni 默认左文，25 |
| $n$ | 本次解码并输出的新帧数 | 默认 stream chunk，10 |
| $I$ | 后续无状态窗口读取的总帧数 | 本步计算 |

### 代入图上的数

$$I=25+10=35\ \text{帧}$$

输出有 10 帧新内容，代表 $10\times80=800$ ms 播放。35 和 800 ms 都不是这个窗口的计算耗时。

### 接下来

地图第一项改变多个独立请求怎样共用模型调用。下一步把三个准备好的首个窗口合并计算，同时保持各自输出独立。

来源：`sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:79-109,999-1011`；Learning SGLang 第 20 章第 1–3 步。

## 第 2 步 · 合并匹配窗口

**一句话。** 三个首个窗口匹配的请求进入一次三行模型调用，每一行仍生成自己请求的声音。

### 图上是什么

- `B` 是一起解码的请求数，`T` 是每个请求窗口里的帧数。左图有三次 `[B=1,T=10]` 调用，右图有一次 `[B=3,T=10]` 调用。
- 这些都是首个窗口，每个请求有 10 帧新内容，没有旧上下文。A、B、C 是独立请求，不是一个请求拆成的三份。
- `匹配` 不只要求 `T` 相同。调度器还要求首个/后续类型相同，以及 slot 或无状态模式相同。首个窗口不会和后续窗口同组。
- 蓝框是模型调用及其声音输出。共享框里三行各属一个请求。batching 不会把三行混成一份输出，也不会把某个请求的声音复制给其他请求。
- 对照从三次模型调用变成一次，不填写毫秒，也不声称每组都有三个请求。

### 公式与符号

$$C_{\mathrm{separate}}=n,\qquad C_{\mathrm{batch}}=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $n$ | 已准备好的匹配请求数 | 本例构造，3 |
| $C_{\mathrm{separate}}$ | 不做跨请求 batching 时的模型调用数 | 左图，3 |
| $C_{\mathrm{batch}}$ | 三行共享组的模型调用数 | 右图，1 |

### 代入图上的数

$$C_{\mathrm{separate}}=3,\qquad C_{\mathrm{batch}}=1$$

这个组仍返回三段声音。调度器一次最多重放八行，并选择能被当前组填满的已发布 graph batch 大小。不同帧长不会靠补位塞进同一次 replay。

### 接下来

batching 让多个请求共享一次调用。下一种机制保留单个请求在窗口之间的解码工作，减少窗口内重复读取的帧。

来源：`sglang_omni/scheduling/streaming_vocoder.py:819-842`；`sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:999-1079`；`tests/unit_test/qwen3_omni/test_code2wav_batching.py:111-191`。

## 第 3 步 · 在窗口之间保留解码工作

**一句话。** codec-state slot 保留一条流的解码状态，后续窗口只解码 10 帧新内容，不再读取 25 帧旧内容。

### 图上是什么

- `codec-state slot` 是保存一个请求解码工作的存储位置。里面有 transformer K/V 环、因果卷积历史、转置卷积的重叠样本和流的帧位置。
- 左图重复第 1 步：25 帧旧内容和 10 帧新内容进入 vocoder。右图从 slot 读取旧工作，只给 vocoder 输入 10 帧新内容。
- 两图输出的新帧数相同。橙色是已存工作，灰色是再次解码的旧输入，蓝色是新输入和输出。
- 首个窗口创建状态并写入 slot，后续窗口才能复用。首份 codes 到达时流领取 slot，完成或取消时释放。
- slot 数量有限。没有空 slot 时，这个请求整个生命周期都走原来的左文无状态路径。首个完整窗口之前就结束的流也不用 slot 状态。

### 公式与符号

$$I_{\mathrm{stateless}}=c+n,\qquad I_{\mathrm{slot}}=n$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $c$ | 没有 slot 时再次解码的旧帧数 | 第 1 步，25 |
| $n$ | 后续窗口里的新帧数 | 第 1 步，10 |
| $I_{\mathrm{stateless}}$ | 不保留状态时的输入帧数 | 本步计算，35 |
| $I_{\mathrm{slot}}$ | 保留状态时的输入帧数 | 本步计算，10 |

### 代入图上的数

$$I_{\mathrm{stateless}}=25+10=35,\qquad I_{\mathrm{slot}}=10$$

slot 让这个后续窗口少读 25 帧输入。这是帧数对照，不是 3.5 倍延迟收益。slot 也占显存，首次写入状态还会增加工作。

### 接下来

下一步把公开的首窗口和后续窗口耗时放到同一比例，包含首窗口写入状态的额外成本。

来源：`sglang_omni/models/qwen3_omni/components/codec_state_pool.py:13-24,63-115`；`sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:296-327,999-1011,1230-1246,1283-1300`；`sglang_omni/models/qwen3_omni/components/code2wav.py:380-402,419-462`。

## 第 4 步 · 测量首个窗口和后续窗口

**一句话。** PR #2909 的 8 行 H200 测试里，保留状态让后续窗口快 60.5%，首个窗口慢 9.2%。

### 图上是什么

- 每次计时使用 Qwen3-Omni 同卡 BF16、一张 H200、8 行和一次 CUDA graph replay。图中取 20 次计时的中位数，也就是排在中间的值。
- 两边都使用 graph replay，所以这里只比较无状态窗口和 slot 窗口，不比较 graph 与 eager。
- 首个窗口在两条路径上都输入 10 帧。slot 路径还要写 K/V、卷积历史和重叠样本，因此耗时从 3,656.3 升到 3,992.0 µs。
- 后续窗口的输入从 35 帧降到 10 帧，耗时从 10,777.5 降到 4,255.3 µs。四根横条使用同一个微秒比例。
- 蓝色表示无状态，橙色表示使用 slot。百分比描述窗口 GPU 耗时，不是整个请求的延迟或通用加速比。

### 公式与符号

$$\Delta_{\mathrm{first}}=\left(\frac{t_{\mathrm{first,slot}}}{t_{\mathrm{first,main}}}-1\right)100,\qquad R_{\mathrm{later}}=\left(1-\frac{t_{\mathrm{later,slot}}}{t_{\mathrm{later,main}}}\right)100$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t_{\mathrm{first,main}}$ | 无状态首窗口耗时 | PR #2909，3,656.3 µs |
| $t_{\mathrm{first,slot}}$ | slot 首窗口耗时 | PR #2909，3,992.0 µs |
| $t_{\mathrm{later,main}}$ | 无状态后续窗口耗时 | PR #2909，10,777.5 µs |
| $t_{\mathrm{later,slot}}$ | slot 后续窗口耗时 | PR #2909，4,255.3 µs |
| $\Delta_{\mathrm{first}}$ | 首窗口耗时增幅 | 本步计算 |
| $R_{\mathrm{later}}$ | 后续窗口耗时降幅 | 本步计算 |

### 代入图上的数

$$\Delta_{\mathrm{first}}=\left(\frac{3992.0}{3656.3}-1\right)100\approx9.2\%$$

$$R_{\mathrm{later}}=\left(1-\frac{4255.3}{10777.5}\right)100\approx60.5\%$$

PR #2909 还报告端到端 c64 QPS 提升 2.8%，不是 60.5%。后续窗口省下的时间要覆盖首窗口的额外成本，不能把窗口降幅当成端到端增幅。

### 接下来

保留状态改变窗口读取多少帧。下一种机制录下窗口的 kernel launches，只有 graph key 完全匹配时才重放。

来源：[公开 PR #2909 的机制与结果](https://github.com/sgl-project/sglang-omni/pull/2909)；`sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:999-1011`。

## 第 5 步 · 只重放完全匹配的 graph key

**一句话。** Qwen3-Omni 的 Code2Wav graph key 包含行数、帧数和窗口类型，只有完全匹配才重放已 capture 的 graph。

### 图上是什么

- Learning SGLang 第 11 章第 1 步讲过 `CUDA graph`：先录 kernel launches，再重放。本步看 Code2Wav 怎样选择录好的 graph。
- `B` 是请求行数，`T` 是帧数，`kind` 是窗口路径。`window` 是无状态，`first` 是 slot 首个窗口，`next` 是 slot 后续窗口。
- 示例目录只有一个 key `(3,10,first)`。调用 A 完全匹配，所以 replay。调用 B 把 `B` 改成 2，此目录没有匹配 key，所以 eager 运行。
- 单 key 目录是为说明匹配而构造的。真实 runner 有许多 key。不同的 incoming key 可能有自己的 graph；只有没有已发布 graph 匹配时才走 eager。
- 橙色表示已 capture graph 和 replay，蓝色表示 eager。graph 改变 kernel 提交方式，不改变模型数学。

### 公式与符号

$$K=(B,T,k)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $B$ | 一次调用里的请求行数 | `GraphKey.batch_size` |
| $T$ | 每行的帧数 | `GraphKey.frames` |
| $k$ | `window`、`first` 或 `next` 路径 | `GraphKey.kind` |
| $K$ | replay 要求的精确身份 | `code2wav_cuda_graph.py` |

### 代入图上的数

$$K_A=(3,10,\mathrm{first}),\qquad K_B=(2,10,\mathrm{first})$$

$K_A$ 等于目录里的 key，$K_B$ 的第一个字段不同。replay 把 codes 和 slot indices 拷进静态 buffer，再复用静态输出。capture 发布前会检查 graph 输出和 eager 输出完全相等。

缺少或不合格的 key 使用 eager。运行时 replay 失败是另一种情况：它会禁用 graphs 并抛出错误，不会悄悄把这次调用改成 eager。

### 接下来

精确 key 让 replay 可行，却没有说明收益。下一步用一次历史 H200 对照，测量开关 Code2Wav graph 的端到端吞吐量。

来源：`sglang_omni/models/qwen3_omni/components/code2wav_cuda_graph.py:85-117,264-282,673-723,804-888`；`sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:112-143,1307-1345`。

## 第 6 步 · 测量 c16 的 graph replay

**一句话。** PR #1101 的历史 H200 c16 对照中，eager 的平均吞吐是 0.575 requests/s，graph replay 是 0.635 requests/s，两个均值之比提升 10.4%。

### 图上是什么

- `c16` 是 16 个客户端请求同时运行，`QPS` 是每秒完成的请求数。两根横条使用 0 到 0.7 requests/s 的同一坐标轴。
- eager 对照每秒完成 0.575 个请求，graph replay 每秒完成 0.635 个。蓝色是 eager 对照，橙色是 graph replay。
- H200 BF16 协议为每个方案启动新 server，temperature 为 0，seed 为 777，Talker 上限 800 token。每方预热 16 个请求后测量 128 个，做两轮交替 A/B 对照。
- 所有测量和预热请求都成功，匹配音频总工作量相差不超过 0.076%，不是某一边少生成很多音频造成的差异。
- 这是 ancestor `b4159d2a` 的历史结果，不是对当前固定源码的新实测，也不保证其他模型、GPU 或并发有同样收益。

### 公式与符号

$$G_{\mathrm{mean}}=\left(\frac{q_{\mathrm{graph}}}{q_{\mathrm{eager}}}-1\right)100$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $q_{\mathrm{eager}}$ | 不用 Code2Wav graph 的平均吞吐 | PR #1101，0.575 requests/s |
| $q_{\mathrm{graph}}$ | 使用 Code2Wav graph 的平均吞吐 | PR #1101，0.635 requests/s |
| $G_{\mathrm{mean}}$ | 展示的两个平均 QPS 之比 | 本步计算 |

### 代入图上的数

$$G_{\mathrm{mean}}=\left(\frac{0.635}{0.575}-1\right)100\approx10.4\%$$

PR #1101 另报 paired delta 10.55%。它取两轮各自百分比变化的均值，不是展示均值的比。图上明确标出 10.4% 的计算口径，避免混淆。

同一张历史表还报告 c16 的 p50 首音时间下降 6.27%。另一项 H100 c8 实验的首音平均变化只有 +0.02%，所以这些结果不能证明首音普遍改善。

### 接下来

Qwen 示例已经覆盖三种机制。下一步对照 MiniCPM-o 和 Fish S2 Pro，避免把名字相近的优化误认为同一种实现。

来源：[公开 PR #1101 及 H200 实验协议](https://github.com/sgl-project/sglang-omni/pull/1101#issuecomment-5040716545)。

## 第 7 步 · 对照模型路径

**一句话。** Qwen3-Omni、MiniCPM-o native 全双工和 Fish S2 Pro 有相近的优化目标，但在不同边界实现这些机制。

### 图上是什么

- Qwen3-Omni 合并匹配的就绪窗口，保留每流 codec-state slot，并按精确 Code2Wav key capture graph。第 2–6 步展示了这些机制和两项公开测量。
- MiniCPM-o native 把每个就绪 session 的下一个计划单元组成 batch，保留每 session 的 Flow 和 HiFT caches，并把内部 Flow chunk 循环录成 graph。循环前的 Conformer 编码和循环后的 HiFT 不在这张 graph 里。
- Fish S2 Pro 只 batch 已完成的非流式请求，把较短 rows 补到最长 codes 长度，再分别裁切输出。它的流式 chunks 仍通过 `build_stream_vocoder_chunk` 逐请求运行。
- Fish 保留旧 code frames 作为上下文，并保留 512 个输出样本做 crossfade。这些保留的输入不等于 Qwen 或 MiniCPM-o 保存的执行状态。一个小测试展示了 vocoder graph，但生产 factory 没有接入它。
- MiniCPM-o 离线调度器和 Fish 的完成请求 batching，不能证明 MiniCPM-o native session batching 或 Fish 流式窗口 batching。卡片明确写出各自路径。

### 公式与符号

$$V_m=(b_m,s_m,g_m)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $m$ | 模型和调度器路径 | 三张卡片 |
| $b_m$ | 能进入一个 batch 的工作 | 各路径调度器 |
| $s_m$ | 窗口之间保留的状态 | 各路径 runtime |
| $g_m$ | 生产路径接入的 graph 边界 | 各路径 factory 和 runner |
| $V_m$ | 一条路径的三项实现选择 | 从卡片读取 |

### 代入图上的数

本步不新增耗时数字。三个元组读作 $V_{\mathrm{Qwen}}=(\text{就绪窗口},\text{codec slots},\text{精确 Code2Wav 形状})$，$V_{\mathrm{MiniCPM}}=(\text{session 单元},\text{解码器 caches},\text{内部 chunk 循环})$，$V_{\mathrm{Fish}}=(\text{只含已完成请求},\text{旧 code frames},\text{未接入 graph})$。

Fish 非流式路径默认最多收集 8 个请求，等待 2 ms。这些默认值不适用于逐请求的流式 chunks，本章也不把它们变成吞吐声明。

### 接下来

Fish 的 vocoder 每个音频帧收到十行 codebook。最后一步跟着这份输入，引出下一章的问题：哪些生成循环写出这些行？

来源：`sglang_omni/models/minicpm_o/components/tts_runtime.py:47-76,92-121,240-260`；`sglang_omni/models/minicpm_o/components/token2wav/flow.py:408-448,737-800`；`sglang_omni/models/fishaudio_s2_pro/streaming_vocoder.py:43-66`；`sglang_omni/scheduling/audio_vocoder.py:80-114,116-224`；`sglang_omni/scheduling/audio_stream.py:187-239,242-333`；`sglang_omni/models/fishaudio_s2_pro/stages.py:522-552`。
