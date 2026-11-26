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
| $c$ | 再次读取的旧帧数 | Qwen3-Omni 默认读取的之前 25 帧 |
| $n$ | 本次解码并输出的新帧数 | 默认 stream chunk，10 |
| $I$ | 后续无状态窗口读取的总帧数 | 本步计算 |

### 代入图上的数

$$I=25+10=35\ \text{帧}$$

输出有 10 帧新内容，代表 $10\times80=800$ ms 播放。35 和 800 ms 都不是这个窗口的计算耗时。

### 接下来

地图第一项改变多个独立请求怎样共用模型调用。下一步把三个准备好的首个窗口合并计算，同时保持各自输出独立。

路径缩写：Qwen 路径相对于 `sglang_omni/models/qwen3_omni/`，其他路径相对于 `sglang_omni/`。

来源：`components/code2wav_scheduler.py:79-109,999-1011`；Learning SGLang 第 20 章第 1–3 步。

## 第 2 步 · 合并匹配窗口

**一句话。** 三个首个窗口匹配的请求进入一次三行模型调用，每一行仍生成自己请求的声音。

### 图上是什么

- `B` 是一起解码的请求数，`T` 是每个请求窗口里的帧数。左图有三次 `[B=1,T=10]` 调用，右图有一次 `[B=3,T=10]` 调用。
- 这些都是首个窗口，每个请求有 10 帧新内容，没有旧上下文。A、B、C 是独立请求，不是一个请求拆成的三份。
- 本例匹配帧数和首个/后续类型。真实分组还检查每个请求是否使用已存解码工作，下一步解释这份工作。首个窗口不会和后续窗口同组。
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

这个组仍返回三段声音。调度器一次最多重放八行，并选择 batch 大小正好等于当前组行数的已发布 graph。不同帧长不会靠补位塞进同一次 replay。

### 接下来

batching 让多个请求共享一次调用。下一种机制保留单个请求在窗口之间的解码工作，减少窗口内重复读取的帧。

来源：`scheduling/streaming_vocoder.py:819-842`；`components/code2wav_scheduler.py:999-1079`；`tests/unit_test/qwen3_omni/test_code2wav_batching.py:111-191`。

## 第 3 步 · 在窗口之间保留解码工作

**一句话。** codec-state slot 保留一条流的解码状态，后续窗口只解码 10 帧新内容，不再读取 25 帧旧内容。

### 图上是什么

- `codec-state slot` 是保存一个请求解码工作的存储位置。里面有之前注意力的 K/V，也就是 Learning SGLang 第 2 章的 keys 和 values，还有连接相邻窗口的小块卷积缓冲。环和重叠布局故意不展开。
- 左图重复第 1 步：25 帧旧内容和 10 帧新内容进入 vocoder。右图从 slot 读取旧工作，只给 vocoder 输入 10 帧新内容。
- 两图输出的新帧数相同。橙色是已存工作，灰色是再次解码的旧输入，蓝色是新输入和输出。
- 首个窗口创建状态并写入 slot，后续窗口才能复用。首份 codes 到达时流领取 slot，完成或取消时释放。
- slot 数量有限。没有空 slot 时，这个请求始终走读取之前帧的无状态路径。首个完整窗口之前就结束的流也不用 slot 状态。

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

来源：`components/codec_state_pool.py:13-24,63-115`；`components/code2wav_scheduler.py:296-327,999-1011,1230-1246,1283-1300`；`components/code2wav.py:380-402,419-462`。

## 第 4 步 · 测量首个窗口和后续窗口

**一句话。** PR #2909 的 8 行 H200 测试里，保留状态让后续窗口耗时减少 60.5%，首个窗口耗时增加 9.2%。

### 图上是什么

- 每次计时使用 Qwen3-Omni 同卡 BF16、一张 H200、8 行和一次 CUDA graph replay。20 次计时按耗时排序后，中位数是第 10 个和第 11 个值的平均数。
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

PR #2909 还报告 64 个并发请求时，端到端每秒完成请求数提升 2.8%，不是 60.5%。后续窗口省下的时间要覆盖首窗口的额外成本，不能把窗口降幅当成端到端增幅。

### 接下来

保留状态改变窗口读取多少帧。下一种机制录下窗口的 kernel launches，只有 graph key 完全匹配时才重放。

来源：[公开 PR #2909 的机制与结果](https://github.com/sgl-project/sglang-omni/pull/2909)；`components/code2wav_scheduler.py:999-1011`。

## 第 5 步 · 只重放完全匹配的 graph key

**一句话。** Qwen3-Omni 的 Code2Wav graph key 包含行数、帧数和窗口类型，只有完全匹配才重放已 capture 的 graph。

### 图上是什么

- Learning SGLang 第 11 章第 1 步讲过 `CUDA graph`：先录 kernel launches，再重放。本步看 Code2Wav 怎样选择录好的 graph。
- `B` 是请求行数，`T` 是帧数，`kind` 是窗口路径。`window` 是无状态，`first` 是 slot 首个窗口，`next` 是 slot 后续窗口。
- 示例目录只有一个 key `(3,10,first)`。调用 A 完全匹配，所以 replay。调用 B 把 `B` 改成 2，此目录没有匹配 key，所以 eager 运行。
- 单 key 目录是为说明匹配而构造的。真实 runner 有许多 key。不同的 incoming key 可能有自己的 graph；只有没有已发布 graph 匹配时才走 eager。
- 橙色表示已 capture graph 和 replay，蓝色表示 eager。graph 改变 kernel 提交方式，不改变模型的数学计算。

### 公式与符号

$$K=(B,T,k)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $B$ | 一次调用里的请求行数 | `GraphKey.batch_size` |
| $T$ | 每行的帧数 | `GraphKey.frames` |
| $k$ | `window`、`first` 或 `next` 路径 | `GraphKey.decode` |
| $K$ | replay 要求完全匹配的标识 | `code2wav_cuda_graph.py` |

### 代入图上的数

$$K_A=(3,10,\mathrm{first}),\qquad K_B=(2,10,\mathrm{first})$$

$K_A$ 等于目录里的 key，$K_B$ 的第一个字段不同。replay 把 codes 和 slot indices 拷进静态 buffer，再复用静态输出。capture 发布前会检查 graph 输出和 eager 输出完全相等。

缺少或不合格的 key 使用 eager。运行时 replay 失败是另一种情况：它会禁用 graphs 并抛出错误，不会悄悄把这次调用改成 eager。

### 接下来

精确 key 让 replay 可行，却没有说明收益。下一步用一次历史 H200 对照，测量开关 Code2Wav graph 的端到端吞吐量。

来源：`components/code2wav_cuda_graph.py:85-117,264-282,673-723,804-888`；`components/code2wav_scheduler.py:112-143,1307-1345`。

## 第 6 步 · 测量 c16 的 graph replay

**一句话。** PR #1101 的历史 H200 c16 对照中，eager 的平均吞吐是 0.575 requests/s，graph replay 是 0.635 requests/s，由两个均值算出的提升约为 10.4%。

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
| $G_{\mathrm{mean}}$ | 由两个平均 QPS 算出的提升 | 本步计算 |

### 代入图上的数

$$G_{\mathrm{mean}}=\left(\frac{0.635}{0.575}-1\right)100\approx10.4\%$$

PR #1101 另报 paired delta 10.55%。它取两轮各自百分比变化的均值，不是展示均值的比。图上明确标出 10.4% 的计算口径，避免混淆。

同一张历史表还报告 c16 的 p50 首音时间下降 6.27%。另一项 H100 c8 实验的首音平均变化只有 +0.02%，所以这些结果不能证明首音普遍改善。

### 接下来

Qwen 示例已经覆盖三种机制。下一步对照 MiniCPM-o 和 Fish S2 Pro，避免把名字相近的优化误认为同一种实现。

来源：[公开 PR #1101 及 H200 实验协议](https://github.com/sgl-project/sglang-omni/pull/1101#issuecomment-5040716545)。

## 第 7 步 · 对照模型路径

**一句话。** Qwen3-Omni、MiniCPM-o 全双工和 Fish S2 Pro 有相近的优化目标，但在不同边界实现这些机制。

### 图上是什么

- Qwen3-Omni 合并匹配的就绪窗口，保留每流 codec-state slot，并按精确 Code2Wav key capture graph。第 2–6 步展示了这些机制和两项公开测量。
- MiniCPM-o 全双工路径把每个就绪 session 的下一个 chunk 组成 batch，在每 session 的 cache 里保留解码工作，并把一个反复生成 chunk 的循环录成 graph。代码把缓存组件叫作 Flow 和 HiFT；它们的内部布局和合成链路的其他部分故意不展开。
- Fish S2 Pro 只 batch 已完成的非流式请求，把较短 rows 补到最长 codes 长度，再分别裁切输出。它的流式 chunks 仍通过 `build_stream_vocoder_chunk` 逐请求运行。
- Fish 保留旧 code frames 作为上下文，还保留一小段旧声音来混合相邻窗口的接缝。这种混合叫作 `crossfade`。这些保留的输入不等于 Qwen 或 MiniCPM-o 保存的执行状态。一个小测试展示了 vocoder graph，但生产 factory 没有接入它。
- MiniCPM-o 离线调度器和 Fish 的完成请求 batching，不能证明 MiniCPM-o 全双工路径的 session batching 或 Fish 流式窗口 batching。卡片明确写出各自路径。

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

本步不新增 benchmark 耗时。三张卡片给出这些元组：

$$V_{\mathrm{Qwen}}=(\text{就绪窗口},\text{codec slots},\text{精确 Code2Wav 形状})$$

$$V_{\mathrm{MiniCPM}}=(\text{session chunks},\text{已存工作},\text{chunk 循环})$$

$$V_{\mathrm{Fish}}=(\text{只含已完成请求},\text{旧 code frames},\text{未接入 graph})$$

Fish 非流式路径默认最多收集 8 个请求，等待 2 ms。这些默认值不适用于逐请求的流式 chunks，本章也不把它们变成吞吐声明。

### 接下来

Fish 的 vocoder 每个音频帧收到十行 codebook。最后一步跟着这份输入，引出下一章的问题：哪些生成循环写出这些行？

来源：`models/minicpm_o/components/tts_runtime.py:47-76,92-121,240-260`；`models/minicpm_o/components/token2wav/flow.py:408-448,737-800`；`models/fishaudio_s2_pro/streaming_vocoder.py:43-66`；`scheduling/audio_vocoder.py:80-114,116-224`；`scheduling/audio_stream.py:187-239,242-333`；`models/fishaudio_s2_pro/stages.py:522-552`。

## 第 8 步 · 跟着十个 codebook 条目进入 Fish vocoder

**一句话。** Fish S2 Pro 的 vocoder 每个音频帧读取十个 codebook 条目，下一章追溯选出它们的两个 AR 循环。

### 图上是什么

- `codebook` 是构造声音的选项表。对于一个音频帧，Fish 的十个 codebook 各贡献一个选中的条目，组成 vocoder 输入。
- 十行蓝色条目就是这些 codebook 输入。橙色问号表示 vocoder 之前做出的选择，本章还没有展示哪些生成工作做出选择。
- 左侧括线把十行合成一个帧的输入。vocoder 把它变成一个音频帧，不是十个独立音频帧。
- 这是构造的单帧视图，不填写播放时长，也不声称每个 codebook 有同样多的候选条目。

### 公式与符号

$$E=k\times1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $k$ | 每个音频帧使用的 codebook 数 | Fish S2 Pro `num_codebooks`，10 |
| $1$ | 这个帧从每个 codebook 选一个条目 | code tensor 布局 |
| $E$ | 这个帧送入 vocoder 的条目数 | 本步计算，10 |

### 代入图上的数

$$E=10\times1=10\ \text{个条目}$$

`S2ProVocoderScheduler` 把 codebook 第 1–10 行送入 vocoder。生成循环和它们之前的另一行留给第 11 章。调用次数和 cache 布局故意不在这里展开，所以本步停在十个看得见的 vocoder 输入。

### 接下来

第 11 章 `11-fish-s2-pro` 打开十个问号背后的 Dual-AR 生成路径，再跟着生成的 codes 进入流式 vocoder。

来源：`models/fishaudio_s2_pro/streaming_vocoder.py:102-106`；`models/fishaudio_s2_pro/payload_types.py:35-50`。
