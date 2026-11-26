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
