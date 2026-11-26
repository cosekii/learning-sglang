## 第 1 步 · 三个 prompt 重复编码同一段声音

**一句话。** 三个不同的 prompt 共用一段参考音频，分别做三次 encoder 会重复花约 750 ms，然后才开始生成。

### 图上是什么

- `reference encoder` 把示例声音变成模型能读取的 codes。三张卡的 prompt 文本不同，但都写着同一个 `voice.wav`。
- 每条蓝色 encoder 横条表示一次约 250 ms 的编码，三次合计约 750 ms。prompt 文本和到达顺序是为比较构造的。
- 下方地图先用大白话标出四处等待：复用已完成的结果、共享正在做的编码、让 GPU 和 CPU 同时工作、重放录下的 kernels。后面的步骤再给出实现里的名字。
- 蓝色表示 encoder 工作。地图只用中性边框，因为本步还没有省掉任何等待。

### 公式与符号

$$T_{\mathrm{uncached}}=n\times t_{\mathrm{encode}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $n$ | 共用一段参考音频的请求数 | 本步构造，3 |
| $t_{\mathrm{encode}}$ | 一次 MOSS 参考编码的大致耗时 | 公开 profile，约 250 ms |
| $T_{\mathrm{uncached}}$ | 三次独立编码的总耗时 | 本步计算 |

### 代入图上的数

$$T_{\mathrm{uncached}}=3\times250\ \text{ms}=750\ \text{ms}$$

250 ms 本身就是约数，所以 750 ms 也是约数。这里只算重复的 encoder 工作，不算预处理、AR 生成、vocoder 和通信。

### 接下来

地图第一项要保留已经完成的 encoder 结果。下一步看 later 请求凭什么确认自己能安全复用它。

来源：`Awesome-ML-SYS-Tutorial/sglang/sglang-omni/moss-tts-local-v15-blog-zh.md:54-58`；`sglang_omni/models/moss_tts/reference_encoder.py:110-143`。

## 第 2 步 · 用完整 key 复用已完成的结果

**一句话。** 首次编码按完整输入和 encoder 身份保存 codes，后两个匹配请求读取副本，不再运行 encoder。

### 图上是什么

- `cache` 指能按 key 找到的已存结果。`完整 key` 要求每个身份字段都匹配：模型、模型版本、encoder 及其配置、结果类型、输入内容和选项。
- prompt 文本不在参考 encoder 的 key 里。A、B、C 可以有不同 prompt，因为缓存对象只描述共用的参考音频和转换它的 encoder。
- A 是 `miss`：还没有已存结果，所以 encoder 跑一次并保存 codes。B、C 是 `hit`：直接读取 codes，不再做 GPU encode。
- 蓝色表示 GPU encoder 工作，橙色表示已存 codes 的路径。读取仍有 host 和传输成本；横条只比较 GPU encode 时间，不是整个请求的延迟。
- 每次读取都返回副本。调用方改自己的输出，不会改到另一个调用方看到的缓存 tensor。

### 公式与符号

$$T_{\mathrm{cached}}=m\times t_{\mathrm{encode}},\qquad S=T_{\mathrm{uncached}}-T_{\mathrm{cached}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $m$ | 必须运行 encoder 的 cache miss 数 | 本例，1 |
| $t_{\mathrm{encode}}$ | 一次参考编码的大致耗时 | 第 1 步，250 ms |
| $T_{\mathrm{cached}}$ | 一次 miss、两次 hit 时的 GPU encode 时间 | 本步计算 |
| $T_{\mathrm{uncached}}$ | 三次独立编码的 GPU 时间 | 第 1 步，750 ms |
| $S$ | cache 少做的重复 GPU encode 时间 | 本步计算 |

### 代入图上的数

$$T_{\mathrm{cached}}=1\times250=250\ \text{ms}$$

$$S=750-250=500\ \text{ms}$$

两个 hit 是两次缓存命中，不能再各算一次 250 ms 编码。500 ms 是这个构造序列少做的大致 GPU 工作，不保证端到端也快同样多。

### 接下来

热 cache 只在首次结果完成后有帮助。下一步把三个请求都放在结果完成之前，让它们共享正在进行的编码。

来源：`sglang_omni/scheduling/reference_encoder.py:24-35,84-119,344-413`；`sglang_omni/models/moss_tts/reference_encoder.py:74-105`；`tests/unit_test/scheduling/test_reference_encoder.py:85-119,182-193`。

## 第 3 步 · 共享正在进行的一次编码

**一句话。** cache 为空时，首个相同请求成为 leader，另外两个等待它的 future，三个调用共享一次编码。

### 图上是什么

- `single-flight` 指相同 key 的调用共享一次尚未完成的编码。`leader` 负责执行，每个 `follower` 等 leader 存好结果，再读取自己的副本。
- 三个请求到达时 cache 都为空，没有可命中的已完成结果。最终计数是 `misses=1`、`merged=2`、`hits=0`。
- 左图是关闭 batching 后三次独立调用的反事实对照，右图使用 single-flight。两边使用同一个 250 ms 比例。
- 蓝条是 GPU encode 工作，橙条是 follower 等待，不是额外 GPU 工作。GPU 工作总量只累加蓝条，不代表并发 batch 的实际墙钟延迟。
- MOSS 自己的 batch encoder 也能在一个 batch 内合并相同标识。本步关闭这条独立路径，只隔离通用 service 的 single-flight 规则。

### 公式与符号

$$W_{\mathrm{single\!-\!flight}}=l\times t_{\mathrm{encode}},\qquad f=n-l$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $l$ | 实际执行编码的 leader 数 | 本例冷 cache，1 |
| $n$ | 完成前到达的相同调用数 | 第 1 步，3 |
| $f$ | 合并到这次编码的 follower 数 | 本步计算，2 |
| $t_{\mathrm{encode}}$ | leader 一次编码的大致耗时 | 第 1 步，250 ms |
| $W_{\mathrm{single\!-\!flight}}$ | single-flight 后的 GPU encode 工作 | 本步计算 |

### 代入图上的数

$$f=3-1=2,\qquad W_{\mathrm{single\!-\!flight}}=1\times250=250\ \text{ms}$$

三次独立调用会做 $3\times250=750$ ms 的 GPU encode 工作。single-flight 不会让两个 follower 提前返回，它们仍要等 leader。它减少重复执行，后来的请求再用第 2 步的已完成 cache。

### 接下来

encoder 不再重复同一份工作。AR loop 有另一种等待：CPU 收尾这一步时，GPU 本可以开始下一步。

来源：`sglang_omni/scheduling/reference_encoder.py:361-413`；`tests/unit_test/scheduling/test_reference_encoder.py:131-179`；`sglang_omni/models/moss_tts/reference_encoder.py:113-143`。

## 第 4 步 · 先启动下一步，再收尾上一步

**一句话。** 异步 decode 保留一步在途：调度器先启动第 N 步，再收尾第 N−1 步，此时 GPU 工作可以仍在运行。

### 图上是什么

- `launch` 构造并启动一个 GPU decode step，发布 resolve 需要的数据并记录完成 event，不等待 GPU。
- `resolve` 检查 event，收集每个请求的结果，完成采样并发出输出。event 尚未就绪时，resolve 会同步等待，不再重叠。
- `SYNC` 把一步的 launch、resolve 都做完才启动下一步。`ASYNC` 先启动第 N 步，再收尾第 N−1 步。两幅图使用相同的蓝色 GPU 块和橙色 CPU 块。
- 重叠区域只表示一种可行顺序，不是实测时长。图中没有画 D2H 拷贝：MOSS-TTS-Local 从 device 侧快照 resolve，Higgs 则可以使用 pinned host staging buffer。
- 异步 decode 改的是调度顺序，不改模型数学。MOSS-TTS-Local 当前默认关闭它；公开测量只报告跨会话噪声内的表现，不保证加速。

### 公式与符号

$$I_{\mathrm{overlap}}=I_{\mathrm{launch},N}\cap I_{\mathrm{resolve},N-1}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $I_{\mathrm{launch},N}$ | 启动并在 GPU 上运行第 N 步的区间 | 图上构造的顺序 |
| $I_{\mathrm{resolve},N-1}$ | CPU 收尾第 N−1 步的区间 | 图上构造的顺序 |
| $I_{\mathrm{overlap}}$ | 两个区间可以共同存在的时间 | ASYNC 图 |

### 代入图上的数

本步不填毫秒数，只看 `launch(N)` 排在 `resolve(N−1)` 前。调度器先把新启动的 step 存为 pending，再 resolve 上一个 pending step。空 batch、不合格 batch 和低于配置阈值的 batch 会先清空在途 step，再走同步路径。

### 接下来

重叠能藏住部分 CPU 等待，但没有减少 GPU 工作。下一项机制减少提交 audio encoder kernels 的 CPU launch。

来源：`sglang_omni/model_runner/base.py:137-166,502-516,577-605`；`sglang_omni/scheduling/omni_scheduler.py:5125-5197`；`sglang_omni/models/moss_tts_local/stages.py:326-346`；`Awesome-ML-SYS-Tutorial/sglang/sglang-omni/moss-tts-local-v15-blog-zh.md:210-216`。

## 第 5 步 · 录下 audio 层序列，再重放

**一句话。** Qwen3-Omni 可以把 audio encoder 的层序列录成 CUDA graph，匹配输入时重放这些 kernels，不再逐个 dispatch。

### 图上是什么

- Learning SGLang 第 11 章第 1 步讲过 `CUDA graph`：先录下一串 kernel，再重放。本步把这个办法用到 Qwen3-Omni 的 audio encoder。
- 两幅图都有相同的 attention 和 MLP kernels。`Eager` 每次调用都逐个 dispatch。graph 图先录下层序列，匹配调用时提交一次 graph replay。
- 蓝框是 GPU kernels，橙色是 graph 边界和重放路径，灰箭头是 CPU dispatch。graph 里的 kernels 和模型数学不变。
- `一张 graph` 不等于一个 kernel，也不覆盖整个请求。输入拷贝和 metadata 更新仍在层序列 replay 前后进行。
- 这条路径由 `enable_layer_cuda_graph` 主动打开，需要 CUDA 和受支持的 packed attention。capture 失败或没有匹配 graph 时，`GraphedLayerStack.forward` 会按原层序列 eager 运行。

### 公式与符号

$$D_{\mathrm{eager}}=k,\qquad D_{\mathrm{graph}}=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $k$ | 录制的层序列里的 kernel launch 数 | 模型真实层序列，本步不虚构数量 |
| $D_{\mathrm{eager}}$ | 不用 graph 时这些 kernels 的 CPU dispatch 数 | Eager 图 |
| $D_{\mathrm{graph}}$ | 匹配层序列 replay 的 graph 提交数 | Graph 图 |

### 代入图上的数

本步不填写 $k$ 或节省时间，只比较 $k$ 次单独 kernel dispatch 和一次 graph 提交。capture、预热有启动成本，replay 前后的拷贝也还在，所以 $D_{\mathrm{graph}}=1$ 不是整个请求的 launch 总数。

### 接下来

graph 的输入大小在 capture 时固定。下一步看 300 个真实 token 怎样选择并补进六个已录大小之一。

来源：Learning SGLang 第 11 章第 1 步；`sglang_omni/models/qwen3_omni/components/audio_layer_graph.py:163-221`；`sglang_omni/models/qwen3_omni/components/audio_encoder.py:170-197,200-268`。

## 第 6 步 · 选择 token bucket，再裁掉 padding

**一句话。** 300 个 token 选择能装下的最小 bucket 512，在独立 attention window 补 212 个位置，重放后只返回前 300 份输出。

### 图上是什么

- `token bucket` 是一种已 capture 的输入大小。六个默认 graph 分别是 128、256、512、1024、2048、4096 token。selector 选择能装下真实 token 和所需 segment slots 的最小 graph。
- 蓝色位置是 300 个真实 token，灰色位置是 212 个补零位置，橙色是选中的 512-token graph。
- replay 把真实 hidden states 拷进已 capture 的 buffer，剩余位置补零，再更新分段边界。padding 有自己的 attention window，真实 token 不会注意到它。
- 返回切片是 `output[:300]`。padding 也参与计算，但不会成为这次请求的输出。
- 超过 4096 token、segment 无效、segment slots 不足、device 或进程不匹配、capture 不可用，都会拒绝 replay。调用方随后使用 eager 层序列。

### 公式与符号

$$b=\min\{b_i\mid b_i\geq n\},\qquad p=b-n$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $n$ | 真实输入 token 数 | 本步构造，300 |
| $b_i$ | 一个已 capture 的 bucket 大小 | `DEFAULT_TOKEN_BUCKETS` |
| $b$ | 能装下的最小 bucket | 本例，512 |
| $p$ | replay 前补零的位置数 | 本步计算，212 |

### 代入图上的数

$$b=\min\{512,1024,2048,4096\}=512$$

$$p=512-300=212$$

bucket 还必须有足够的 segment slots，容纳真实分段和按 window 上限拆开的 padding 分段。本例假设 segment 有效且 slots 足够，所以 token 数决定选择。这些算式只描述形状，不是延迟测量。

### 接下来

四种机制的分工和边界已经讲完。最后一步把它们放回一张地图，再跟着 frames 进入 vocoder。

来源：`sglang_omni/models/qwen3_omni/components/audio_layer_graph.py:22-23,223-275`；`tests/unit_test/qwen3_omni/test_audio_layer_graph.py:105-154`。

## 第 7 步 · 跟着 frames 进入 vocoder

**一句话。** 四种机制处理不同等待；AR 产出 frames 后，vocoder 必须把每十帧变成下一段 800 ms 声音，赶在播放器没有声音前完成。

### 图上是什么

- `cache` 在完整 key 匹配时去掉重复的已完成编码。参考音频不同，输入 key 就不同，不会命中。
- `single-flight` 在一次编码仍在运行时去掉重复执行，follower 仍要等 leader。
- `异步 decode` 可以让 launch N 和 resolve N−1 重叠，改变的是顺序，不是模型工作量。
- `CUDA graph` 对固定 bucket 重放已录层序列，没有合适 graph 就回退 eager。
- `vocoder` 把 codec frames 变成声音。Learning SGLang 第 20 章第 1–3 步已经给出：十个 Qwen frames 组成一段 800 ms chunk。播放器要在当前 chunk 播完前拿到下一段。
- 蓝色表示 frames 和声音，橙色表示播放期限。最后的问题问 vocoder 怎样赶上期限，本章不声称它已经赶上。

### 公式与符号

$$C=f\times d$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $f$ | 一段声音 chunk 的 codec frame 数 | Learning SGLang 第 20 章，10 |
| $d$ | 一帧代表的声音时长 | 本步推导，80 ms |
| $C$ | vocoder 必须产出的 chunk 时长 | Learning SGLang 第 20 章，800 ms |

### 代入图上的数

$$d=800\ \text{ms}\div10=80\ \text{ms / frame}$$

$$C=10\times80\ \text{ms}=800\ \text{ms}$$

这些是播放时长，不是 vocoder 计算耗时。如果 vocoder 的结果在前一段 800 ms 播完后才到，播放器就会出现第 8 章第 3 步量出的静音空档。

### 接下来

下一章把跨请求 batching、保留的 codec 状态和 vocoder CUDA graph 放到这条播放线上，分别测量，不把效果合成没有依据的加速比。

来源：本章第 1–6 步；Learning SGLang 第 20 章第 1–3 步；`docs/plan-omni.md` 第 10 章。
