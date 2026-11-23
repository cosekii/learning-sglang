## 第 1 步 · 默认布局要两块 GPU

> **一句话：** Qwen3-Omni 的默认布局里，GPU 0 放四个 stage，GPU 1 只放 talker：80 GB 的卡上只有 6.6 GB 权重。

### 图上是什么

- 两个面板：GPU 0 和 GPU 1，各放第 17 章第 4 步里在 GPU 上跑的 stage。GPU 0：`image_encoder`、`audio_encoder`、`thinker`、`code2wav`；GPU 1：`talker_ar`。
- 「内存 · 80 GB」：按比例画的内存条，深色部分是权重，浅色是「其余 · KV cache 和工作内存」。
- 「忙碌程度随时间」：一条示意的时间条。GPU 0 是几乎首尾相接的琥珀色块；GPU 1 是蓝色块，中间有空隙，右边标「86%，同时 8 个 request（PR #1235）」。这条是示意，不是实测轨迹。
- 底部两条脚注：权重按 bf16 算和各模型的参数量；颜色的含义。

### 公式

$$
W = P \times B
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $P$ | 一个模型的参数量 | 见下表 | `src/numbers.ts` 的 `OMNI_PARAMS_B`，从 checkpoint 的张量形状数出来 |
| $B$ | 每个参数的字节数，bf16（16 位浮点数） | 2 B | `src/numbers.ts` 的 `BYTES`；第 18 章第 1 步用过同一个 $B$ |
| $W$ | 这个模型的权重占多少内存 | | 本步 |
| $M$ | 一块 H100 的内存 | 80 GB | `src/numbers.ts` 的 `HBM_GB` |

### 代入图上的数

| 模型 | $P$ | $W = P \times 2$ | 在哪块卡 |
|---|---|---|---|
| thinker | 30.5B | 61.0 GB | GPU 0 |
| audio encoder | 0.65B | 1.3 GB | GPU 0 |
| image encoder | 0.54B | 1.1 GB | GPU 0 |
| code2wav | 0.22B | 0.4 GB | GPU 0 |
| talker + code predictor | 3.3B | 6.6 GB | GPU 1 |

- GPU 0：$61.0 + 1.3 + 1.1 + 0.4 = 63.8$ GB 权重，剩 $80 - 63.8 = 16.2$ GB 给 KV cache 和工作内存。
- GPU 1：6.6 GB 权重，约占卡的 $6.6 \div 80 \approx 8\%$，剩 73.4 GB。
- 图上内存条宽 312 px 代表 80 GB，每 GB 3.9 px。

### 86% 是什么

PR #1235 在 talker 独占一块 GPU 时测得：同时 8 个 request，GPU 上有 kernel 在跑的时间占 86%（nvidia-smi 的 utilization，中位数）。所以 GPU 1 的内存几乎空着，计算却不闲。

### 接下来

第 2 步：talker 能不能挪到 GPU 0，由谁来定。

## 第 2 步 · 布局写在 config 里

> **一句话：** config 为每个 stage 指定设备；SGLang-Omni 为 Qwen3-Omni 附带两种布局，只有 `talker_ar` 换了 GPU。

### 图上是什么

- 每行是第 17 章第 4 步的七个 stage。
- 两列是两份 config：`speech`（默认，第 1 步的布局）和 `speech-colocated`（单 GPU 布局）。
- 小框颜色：灰色是 CPU（`preprocessing` 和 `decode` 没有模型），白色是 GPU 0，蓝色是 GPU 1。
- 框起来的 `talker_ar` 那行：GPU 1 → GPU 0，标「移动」。其余六行两列一样。
- 两条带点的说明；两条脚注，第一条是启动前的检查，第二条是设计说明里的历史。

### 在 SGLang-Omni 里

- `models/qwen3_omni/config.py` 用同一个函数 `speech_stages(thinker_gpu, talker_gpu, …)` 构建两种布局：`speech` 传 `talker_gpu=1`，`speech-colocated` 传 `talker_gpu=0`。两个 encoder 和 `code2wav` 都跟着 `thinker_gpu`。
- 两个名字在同一文件的变体表里：`"speech"` 和 `"speech-colocated"`。
- 第一条脚注的检查：Qwen3-Omni 的放置策略（`models/qwen3_omni/placement.py`）只在 colocated 配置下允许 thinker 和 talker 同在一块 GPU，在任何进程启动前检查。

### 挪过去之后

talker 的 6.6 GB 权重加到 GPU 0 的 63.8 GB 上（第 1 步）：

$$
63.8 + 6.6 = 70.4\ \text{GB}
$$

这只是一块 80 GB 卡上的权重，还没算 KV cache 和工作内存。五个 stage 共用一块卡，所以 `speech-colocated` 还要规定每个 stage 能拿多少内存。

### 接下来

第 3 步看这份 config 怎么分一块卡的内存。

## 第 3 步 · 一块卡的内存按固定份额分

> **一句话：** 单 GPU 时，config 给每个 stage 写一个固定份额（卡的比例）；五份加起来 94%，剩 6% 预留。

### 图上是什么

- 一条长条：一块 H100，80 GB，画成 660 px 宽。
- 五段：两个 encoder 各 2%，thinker 78%（橙色），`talker_ar` 10%（蓝色），code2wav 2%。小段的名字标在条下面。
- 上方括号「已分配 · 2 + 2 + 78 + 10 + 2 = 94%」；右边虚线一段「6% 预留」。
- 标题写明：这份 config 是为 SGLang-Omni 的语音合成测试写的。

### 公式

$$
G_s = f_s \times M,\qquad R_s = G_s - W_s
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $f_s$ | stage $s$ 的份额，卡的比例 | config 文件里的 `gpu_memory_fraction` |
| $M$ | 一块 H100 的内存，80 GB | 第 1 步 |
| $G_s$ | stage $s$ 分到的 GB | 本步 |
| $W_s$ | stage $s$ 的权重 | 第 1 步，$W = P \times B$ |
| $R_s$ | 放完权重后剩下的：工作内存，thinker 和 talker 还要放 KV cache | 本步 |
| $b_{\text{kv}}$ | thinker 一个 token 的 K 和 V，所有层加起来，96 KB | 第 4 步 |

### 代入图上的数

卡的 1% 是 0.8 GB，画成 6.6 px。

| stage | $f_s$ | $G_s$ | $W_s$ | $R_s$ |
|---|---|---|---|---|
| image_encoder | 0.02 | 1.6 GB | 1.1 GB | |
| audio_encoder | 0.02 | 1.6 GB | 1.3 GB | |
| thinker | 0.78 | 62.4 GB | 61.0 GB | **1.4 GB** |
| talker_ar | 0.10 | 8.0 GB | 6.6 GB | **1.4 GB** |
| code2wav | 0.02 | 1.6 GB | 0.4 GB | |
| 合计 | 0.94 | 75.2 GB | | |
| 预留 | 0.06 | 4.8 GB | | |

thinker 剩下的 1.4 GB 最多放 $1.4\ \text{GB} \div 96\ \text{KB} \approx 14{,}600$ 个 token 的 KV cache，还没扣工作内存。语音合成测试的 prompt 只有几百 token，够用；视频不够，第 4 步算。

### 为什么要固定份额

- SGLang 单独跑时，KV cache 拿走启动时剩下的全部内存（第 7 章第 1 步）。
- 五个 stage 在一块卡上时，先启动的会把剩下的全拿走。固定份额让每个 stage 的大小不取决于启动顺序。
- 启动前，SGLang-Omni 的 planner（`config/placement.py`）把每块 GPU 上的份额加起来，超过上限（`max_total_gpu_memory_fraction_per_gpu`，默认 1.0，即 100%）就拒绝启动。
- 预留的 6% 给 CUDA graph（第 11 章）、工作区和内存峰值（第一条脚注）。

### 接下来

第 4 步：视频测试在一块卡上最少要多少内存。

## 第 4 步 · 原因 1：内存，一块 H100 放不下

> **一句话：** 把每部分压到视频测试能跑的最低，合计 85.7 GB，比 80 GB 多 5.7 GB；去掉 talker 那份就放得下，所以 talker 挪到 GPU 1。

### 图上是什么

- 上面一条 GPU 0（80 GB，每 GB 6.4 px），六部分首尾相接，编号 1–6：
  - 1 橙色：thinker 权重；2 斜线：给视频 encoder 预留；3 浅橙：thinker 的 KV cache；4 白底带深色：两个 encoder 和 code2wav；5 虚线：预留；6 蓝色虚线框：talker，画在它本来会在的位置，越过卡的右边界。
  - 红色括号「超出显卡 5.7 GB」。
- 下面一条 GPU 1：第 6 部分画成实线，「6 · talker，挪到这里」。
- 表格：每部分一行，「GB」和「为什么不能再小」，最后一行合计。

### 公式

$$
b_{\text{kv}} = L \times H_{\text{kv}} \times d \times 2 \times B,\qquad
S_3 = T_{\max} \times b_{\text{kv}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $L$ | thinker 的层数 | 48 | `src/numbers.ts` 的 `OMNI_LAYERS` |
| $H_{\text{kv}}$ | 每层的 K/V head 数 | 4 | `src/numbers.ts` 的 `OMNI_KV_HEADS` |
| $d$ | 一个 head 的向量长度 | 128 | `src/numbers.ts` 的 `HEAD_DIM`，第 2 章第 3 步 |
| 2 | k 和 v 各一份 | | 第 2 章第 14 步 |
| $B$ | bf16，每个数 2 字节 | 2 B | 第 1 步 |
| $b_{\text{kv}}$ | 一个 token 在 thinker 里的 KV cache | 96 KB | 本步 |
| $T_{\max}$ | 图上取的 thinker 最长 request | 32,768 token | 本步（见下面「核实」） |
| $S_3$ | 第 3 部分：装下最长 request 的 KV cache | | 本步 |

这和第 2 章第 14 步算 Llama 每 token 128 KB 是同一个算式，层数和 head 数换成 Qwen3-Omni thinker 的。

### 代入图上的数

$b_{\text{kv}} = 48 \times 4 \times 128 \times 2 \times 2 = 98{,}304\ \text{B} = 96\ \text{KB}$，$S_3 = 32{,}768 \times 96\ \text{KB} \approx 3.1\ \text{GB}$。

| # | 部分 | 算式 | GB | 为什么不能再小 |
|---|---|---|---|---|
| 1 | thinker 权重 | $30.5 \times 2$ | 61.0 | 只有更小的格式（如 FP8）才能压缩 |
| 2 | 给视频 encoder 预留 | $0.05 \times 80$ | 4.0 | 编码 128 帧需要空间 |
| 3 | thinker 的 KV cache | $32{,}768 \times 96\ \text{KB}$ | 3.1 | KV cache 装不下整个 request，SGLang 就不启动它（第 7 章第 1 步） |
| 4 | encoder 和 code2wav | $0.06 \times 80$ | 4.8 | 其中 2.8 GB 是权重，加工作内存（各 2%，第 3 步） |
| 5 | 预留 | $0.06 \times 80$ | 4.8 | CUDA graph、工作区和峰值（第 3 步） |
| 6 | talker | $0.10 \times 80$ | 8.0 | 6.6 GB 权重加它的 KV cache（第 3 步） |
| | 合计 | | **85.7** | 比 80 多 5.7 |

- 只看 1–3，thinker 自己就要 $61.0 + 4.0 + 3.1 = 68.1$ GB，比第 3 步给 thinker 的 62.4 GB 多。
- 去掉第 6 部分：$85.7 - 8.0 = 77.7$ GB，放得下。第 6 部分就是挪到 GPU 1 的 talker。
- 第二条脚注的 85 GB：卡上是 80 GiB，PyTorch 报告约 85 GB，份额按报告值算。这样 2、4、5、6 是 $(0.05 + 0.06 + 0.06 + 0.10) \times 85 = 23.0$ GB，加上 1 和 3 的 $61.0 + 3.1$，共 87.1 GB，仍多出 2.1 GB。

### 这些数从哪来

- 第 2 部分：thinker 的 `encoder_mem_reserve` 参数，默认 0.05（`models/qwen3_omni/stages.py`）。
- 128 帧：SGLang-Omni 的视频测试（Video-MME）每个视频最多取 128 帧，一次 16 个视频（`tests/test_model/test_qwen3_omni_videoamme_ci.py`）。
- 第 4、5、6 部分：直接用第 3 步那份单 H100 config 的份额，它是 SGLang-Omni 附带的最小配置。

### 核实：32,768 是旧上限

PR #2735（2026 年 10 月）之后，SGLang-Omni 的 thinker 上限默认取 checkpoint 里的 context，Instruct checkpoint 是 65,536 token。按这个上限，第 3 部分是 $65{,}536 \times 96\ \text{KB} \approx 6.3$ GB，合计更大，结论不变：一块 H100 放不下。

### 接下来

第 5 步是第二个原因：时间。

## 第 5 步 · 原因 2：时间，共用一块 GPU 要轮流

> **一句话：** 单 GPU 时 thinker 和 talker 轮流用 GPU，talker 就绪的步要等 thinker 这一轮跑完；实测首个声音的 p90 从 1.4 s 变成 2.7 s。

### 图上是什么

- 动画（循环）：第 2 步 `speech-colocated` 那样，一块 GPU 同时放 thinker 和 talker。
  - 下面一行「GPU 0 运行」：琥珀色宽块是 thinker 的轮次，窄蓝块是 talker 的步。
  - 上面一行 `talker_ar`「它的下一步」：蓝色竖标「就绪」是 talker 的下一步准备好了；红色虚线「等待」是它等这轮 thinker 跑完的时间；蓝色点线从上面落到下面真正运行的蓝块。
  - 每圈出现两次等待。7 个阶段，每隔 1.1 s 一个，然后停顿，一圈 10 s；右上角「循环」进度条每圈走满一次。宽度非等比。
- 下面两根条「实测 · 首个声音 p90」：talker 在 thinker 的 GPU 上（红）2.7 s；talker 独占一块 GPU（蓝）1.4 s，「快 46%」。

### 公式

$$
\text{快} = 1 - \frac{t_{\text{alone}}}{t_{\text{shared}}}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| p90 | 十个 request 里九个在这个时间内拿到首个声音 | 本步 |
| $t_{\text{shared}}$ | talker 和 thinker 共用 GPU 时的 p90，两次运行取平均 | PR #1235 |
| $t_{\text{alone}}$ | talker 独占 GPU 时的 p90，两次运行取平均 | PR #1235 |

### 代入图上的数

| 布局 | 两次运行 | 平均 | 图上 |
|---|---|---|---|
| 共享 | 2.697、2.663 s | 2.68 s | 2.7 s |
| 独占 | 1.463、1.415 s | 1.44 s | 1.4 s |

$1 - 1.44 \div 2.68 = 0.46$，即快 46%。条长每秒 120 px。

### 为什么会等

- talker 独占 GPU 时忙碌 86%（第 1 步）：它的步几乎一个接一个。
- 共用一块 GPU 时，GPU 在两个进程的 kernel 之间轮流跑，talker 的很多步正好在 thinker 的轮次中就绪，只能等。
- 每一帧声音都要 talker 跑一步（第 16 章第 3 步），所以等待直接推迟声音。

### 测量条件（第二条脚注）

- H200，同时 8 个 request，thinker 拆在两块 GPU 上；只改 talker 是和 thinker 的一半共用一块 GPU，还是独占一块。
- 所以这些数说明方向，不是 H100 上五个 stage 全放一块卡时的值。PR 还测到共享时整次运行长了 9–16%。

### 接下来

第 6 步：无论哪种布局，声音都有一条截止线。

## 第 6 步 · 声音的截止线

> **一句话：** chunk 1 播放的 800 ms 里，talker 要写完后 10 帧、code2wav 要把它们变成 chunk 2，平均每帧 80 ms。

### 图上是什么

- 上面一行「GPU 0 运行」（按单 GPU 画）：琥珀色是 thinker，十条细蓝线是 talker 的 10 步（每步一帧），深色块是一次 code2wav 调用。
- 下面一行「扬声器」：「chunk 1 · 播放 800 ms」实线框，后面是虚线框 chunk 2。
- 红色虚线「chunk 1 结束」：chunk 2 必须在这之前就绪。
- 从 code2wav 往下的箭头「chunk 2 就绪，赶在虚线前」。

### 公式

$$
t_{\text{frame}} = \frac{n_{\text{samp}}}{f_{\text{out}}},\qquad
t_{\text{chunk}} = N \times t_{\text{frame}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n_{\text{samp}}$ | codec 把一帧变成多少个声音采样点 | 1,920 | `src/numbers.ts` 的 `SAMPLES_PER_FRAME`，第 16 章第 3 步 |
| $f_{\text{out}}$ | 每秒播放的采样点 | 24,000 | `src/numbers.ts` 的 `SPEECH_OUT_HZ` |
| $t_{\text{frame}}$ | 一帧声音的时长 | 80 ms | 本步 |
| $N$ | code2wav 一次解码的帧数 | 10 | 第 16 章第 3 步 |
| $t_{\text{chunk}}$ | 一个 chunk 的时长 | 800 ms | 本步 |

### 代入图上的数

- $t_{\text{frame}} = 1{,}920 \div 24{,}000 = 0.08\ \text{s} = 80\ \text{ms}$。
- $t_{\text{chunk}} = 10 \times 80 = 800\ \text{ms}$。
- 预算：$800\ \text{ms} \div 10 = 80\ \text{ms}$ 每帧，要装下 talker 的一步、分摊的 code2wav 调用，以及第 5 步那种排在 thinker 后面的等待。

### 两种布局

- 单 GPU（图上画的）：talker 每一步都可能等 thinker（第 5 步）。
- 默认两块 GPU：talker 不等 thinker，但 code2wav 仍和 thinker 同在 GPU 0（第 1 步）。

### 接下来

chunk 2 错过红线会怎样，SGLang-Omni 怎么对着这条线流式输出声音：第 20 章。
