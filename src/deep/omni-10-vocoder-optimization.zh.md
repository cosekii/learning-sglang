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
