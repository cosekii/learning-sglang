## 第 1 步 · 先量首音等待

**一句话。** PR #1235 只改变 talker 的位置，首音 p90 就从同卡的约 2.7 秒变成独占 GPU 的约 1.4 秒。

### 图上是什么

- `first sound` 是客户端收到的第一段声音；Learning SGLang 第 20 章第 1 步已经画出第一段声音与后续空档的区别。
- `p90` 在这里指十个请求里九个的首音在此时间内到达。两条蓝条使用同一时间比例，不能直接当作两次运行的逐条请求记录。
- 同卡的两轮结果是 2.697、2.663 秒，均值 2.68 秒，图上保留一位小数写成 2.7 秒。
- 独占 GPU 的两轮结果是 1.463、1.415 秒，均值 1.439 秒，深入讲解按 1.44 秒计算，图上写成 1.4 秒。
- `+1.3 s` 是两个一位小数显示值之差。用未取整均值计算，差额约 1.24 秒；「约 46% 更早」使用两位小数均值。

### 公式与符号

$$\bar t=\frac{t_1+t_2}{2},\qquad s=\left(1-\frac{\bar t_{\mathrm{alone}}}{\bar t_{\mathrm{shared}}}\right)\times100\%$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t_1,t_2$ | 同一种放置的两次 p90 结果 | PR #1235 |
| $\bar t_{\mathrm{shared}}$ | talker 与 thinker 同卡的平均 p90 | 2.697、2.663 秒 |
| $\bar t_{\mathrm{alone}}$ | talker 独占 GPU 的平均 p90 | 1.463、1.415 秒 |
| $s$ | 独占后首音等待缩短的百分比 | 本步计算 |

### 代入图上的数

$$\bar t_{\mathrm{shared}}=(2.697+2.663)\div2=2.68\ \text{s}$$

$$\bar t_{\mathrm{alone}}=(1.463+1.415)\div2=1.439\ \text{s}\approx1.44\ \text{s}$$

$$s=(1-1.44\div2.68)\times100\%\approx46\%$$

测试使用 H200、同时 8 个请求，thinker 拆在两张 GPU 上。共享情形是 talker 与 thinker 的一半同卡，不是所有 stage 挤在一张卡上。结果只说明这次公开实验。

### 接下来

数字说明首音等待变了，但还没有指出等待落在哪一段。下一步先确定计时器从何时开始、到哪一个事件停止。

来源：Learning SGLang 第 19 章第 5 步；`src/pages/ch/19-sharing-gpus.mdx` 的 PR #1235 测量说明。

## 第 2 步 · TTFT 在首个 audio delta 停表

**一句话。** 这份 streaming benchmark 从提交 POST 开始计时，在第一个带非空 `audio.data` 的 delta 到达时记录 TTFT，另记整个流到 `[DONE]` 的总时间。

### 图上是什么

- `POST` 是客户端提交请求的时刻，本例构造为 0.0 秒。
- `text delta` 只带文字，没有音频数据，所以它不是 TTFT 的停止事件。
- `first audio delta` 是第一个带非空 `audio.data` 的流式事件，本例构造为 1.4 秒，橙色 TTFT 在这里停止。
- `[DONE]` 表示整个流结束，本例构造为 3.2 秒。蓝色总计时覆盖从 POST 到 `[DONE]` 的全过程。
- 橙色和蓝色表示两种计时边界，不代表 CPU 或 GPU 工作。

### 公式与符号

$$T_{\mathrm{TTFT}}=t_{\mathrm{first\ audio}}-t_{\mathrm{submit}},\qquad T_{\mathrm{total}}=t_{\mathrm{done}}-t_{\mathrm{submit}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t_{\mathrm{submit}}$ | 调用 `time.perf_counter()` 开始计时的时刻 | POST 前，本例 0.0 秒 |
| $t_{\mathrm{first\ audio}}$ | 首个含非空 `audio.data` 的 delta 到达时刻 | 本例 1.4 秒 |
| $t_{\mathrm{done}}$ | 流读完后的时刻 | 本例 3.2 秒 |
| $T_{\mathrm{TTFT}}$ | 首音等待 | 本步相减 |
| $T_{\mathrm{total}}$ | 整个流式请求的等待 | 本步相减 |

### 代入图上的数

$$T_{\mathrm{TTFT}}=1.4-0.0=1.4\ \text{s}$$

$$T_{\mathrm{total}}=3.2-0.0=3.2\ \text{s}$$

代码先检查 HTTP 错误和流内 `error`。若服务器返回 200 却没有任何 audio delta，`_measure_one` 会报错，不把这次请求写成有效测量。TTFT 与 `total_seconds`、`audio_chunks`、`status_code` 一起存入每条 `RunResult`。

### 接下来

首音之后仍可能停声。下一步把 chunk 到达时刻放到播放时间线上，算出空档有多长。

来源：`benchmarks/eval/benchmark_omni_streaming_ttft.py:73-82,148-205,259-275`。

## 第 3 步 · 用到达时刻算静音空档

**一句话。** 播放器按顺序播放 800 ms chunk；下一块没到就留下空档，空档等于实际到达时刻超过应播时刻的部分。

### 图上是什么

- 上方两个蓝点是 chunk 到达时刻：chunk 1 为 1.4 秒，chunk 2 为 2.5 秒。
- 下方蓝块是正在播放的声音。chunk 1 从 1.4 秒播到 $1.4+0.8=2.2$ 秒。
- 橙色块从 2.2 秒持续到 2.5 秒，表示播放器没有下一块可播，静音 0.3 秒。
- chunk 2 在 2.5 秒到达后开始播放，到 3.3 秒结束。所有块使用同一时间比例。
- 这些时刻是构造教学例。0.3 秒占一个 800 ms chunk 的 37.5%，不是公开实测值。

### 公式与符号

$$e_1=a_1+d,\qquad g=\max(0,a_2-e_1)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $a_1$ | chunk 1 到达时刻 | 本步构造，1.4 秒 |
| $d$ | 一个 chunk 的播放时长 | Learning SGLang 第 20 章，0.8 秒 |
| $e_1$ | chunk 1 播完、需要 chunk 2 的时刻 | 本步相加，2.2 秒 |
| $a_2$ | chunk 2 实际到达时刻 | 本步构造，2.5 秒 |
| $g$ | 没有声音可播的空档 | 本步计算 |

### 代入图上的数

$$e_1=1.4+0.8=2.2\ \text{s}$$

$$g=\max(0,2.5-2.2)=0.3\ \text{s}$$

$$\frac{g}{d}=\frac{0.3}{0.8}=37.5\%$$

若 chunk 2 在 2.2 秒前到达，$\max$ 会把负数收成 0，不把提前到达记成负空档。当前 benchmark 在每次 audio delta 到达时增加 `audio_chunks`，但没有保存每个 $a_i$。要得到真实 $g$，需要在客户端增加逐块到达时间记录，并采用同一播放规则；现有脚本没有直接输出这个指标。

### 接下来

到达时间能指出空档，却还不能解释等待发生在哪一段交接。下一步打开通信 trace，把一次交接拆成带时间戳的事件。

来源：`benchmarks/eval/benchmark_omni_streaming_ttft.py:179-205`；Learning SGLang 第 20 章第 1 步。

## 第 4 步 · 打开通信 trace

**一句话。** 环境开关打开后，运行时把发送、读取等事件写成带时间戳和局部耗时的 JSON 日志。

### 图上是什么

- `SGLANG_OMNI_COMM_TRACE=1` 打开日志；未设置、设为 0 或 false 等值时，`emit` 直接返回。
- `comm_send_enqueue` 记录发送进入队列。示例字段包含请求 A、chunk 7、两端 stage 和 transport；这些标识符是构造的。
- `comm_stream_read` 记录一次读取。跨进程读取使用 `object_id`、transport、bytes 和 `elapsed_ms`；inline 路径还可带 request、stage 与 chunk 字段。
- 橙色区域区分两种时间：`ts_ns` 是写日志时的 `time.time_ns()` 时间戳，`elapsed_ms` 是一个局部调用前后的差值。
- `elapsed_ms: <operation>` 与 `<read>` 是字段含义占位，不是把未知耗时写成 0。

### 公式与符号

$$d=\frac{c_{\mathrm{end}}-c_{\mathrm{start}}}{1{,}000{,}000}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $c_{\mathrm{start}}$ | 操作前的 `perf_counter_ns()` | `now_ns()` |
| $c_{\mathrm{end}}$ | 操作后的 `perf_counter_ns()` | `elapsed_ms()` |
| $d$ | 这段操作的毫秒数 | 本步相减并换算 |
| $1{,}000{,}000$ | 1 毫秒包含的纳秒数 | 单位换算 |

### 代入图上的数

本步不虚构耗时数值。若某次局部区间是 20,000 纳秒，则 $d=20{,}000\div1{,}000{,}000=0.020$ 毫秒；这只是公式读法示例，不是图上新加的测量结果。

`comm_send_enqueue` 的日志在 `await ready` 之前发出，所以它的 `elapsed_ms` 只覆盖 enqueue 附近的工作，不包含等待发送完成的全部时间。`comm_stream_read` 则在读取结束后记录该次读取耗时。两类字段不能混当成端到端等待。

### 接下来

日志已经能分开局部操作。下一步读取 CUDA IPC 的 host 等待与 GPU event 等待，避免把整段 host 时间都叫成 GPU 拷贝。

来源：`sglang_omni/profiler/comm_trace.py:14-34`；`sglang_omni/comm/engine.py:327-393`；`sglang_omni/pipeline/stage/runtime.py:665-682`。

## 第 5 步 · 分开 host 等待与 GPU event 区间

**一句话。** `cuda_ipc_get_wait_copy` 同时报告 host 侧总等待和 GPU event 区间，两者之差显示 host 路径上还有多少时间不属于这段 GPU event。

### 图上是什么

- `host` 指这次交接的 CPU 侧。`elapsed_ms=12.0` 是构造的 host 总等待。
- `GPU event` 是 GPU 上记录的 start、done 标记。蓝色 5 ms 表示两标记之间的 `receiver_gpu_wait_copy_ms`。
- 橙色 7 ms 是 `host_minus_receiver_gpu_ms`，与蓝块合计为 12 ms host 总等待。
- 7 ms 只是差额。它可能包含队列、线程阻塞、恢复调度或其他 host 工作，不能直接称为 CPU 计算，也不能直接称为 GPU 拷贝。
- 所有数值都是构造的字段读法示例，不是一次抓取的 CUDA IPC 日志。

### 公式与符号

$$r=h-g$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $h$ | host 侧总等待，`elapsed_ms` | 本步构造，12 ms |
| $g$ | GPU start/done event 区间，`receiver_gpu_wait_copy_ms` | 本步构造，5 ms |
| $r$ | host 等待减去 GPU event 的差额，`host_minus_receiver_gpu_ms` | 本步计算 |

### 代入图上的数

$$r=12-5=7\ \text{ms}$$

只有存在 GPU start、done event 时，代码才写入 $g$ 和 $r$。在线程同步路径上，日志还可包含 `worker_queue_ms`、`worker_block_ms` 和 `worker_done_to_resume_ms`，用来继续定位 host 差额。`completion_mode=query_ready` 时不应有这组 worker 字段。代码没有在缺失 event 时把差额伪装成 0。

### 接下来

字段能指出等待在哪一侧，但优化结论还需要公平对照。下一步固定输入、seed、硬件与预热，只改变 partial-start 开关。

来源：`sglang_omni/relay/cuda_ipc.py:526-581`；`sglang_omni/profiler/comm_trace.py:19-24`。
