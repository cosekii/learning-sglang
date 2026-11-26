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
