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
