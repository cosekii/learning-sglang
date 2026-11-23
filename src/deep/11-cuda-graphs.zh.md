## 第 1 步 · 回到第 9 章的三条泳道

> **一句话：** scheduler 那条泳道是一排首尾相接的 decode 步，每步 4.8 ms；这一章放大其中一步。

### 图上是什么

- 三条泳道，画在 0–25 ms 的时间轴上：上面 server + tokenizer（蓝色块），中间 scheduler + GPU，下面 detokenizer。这是第 9 章第 5 步的三个进程。
- scheduler 泳道：5 个橙色块，每块一个 decode 步，首尾相接。
- detokenizer 泳道：4 道青色短标，前 4 步每步结束后一道，即新 token 往外送（第 9 章）。
- 虚线框「这一个」：第三块，下一步放大的就是它。

### 公式

一个 decode 步的长度沿用第 4 章第 5 步：

$$
t_{\text{step}} = \frac{M_W}{BW}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $M_W$ | 权重字节数 | 16 GB | 第 4 章第 2 步 |
| $BW$ | HBM 带宽 | 3.35 TB/s | `src/numbers.ts` 的 `BW` |
| $t_{\text{step}}$ | 一个 decode 步里 GPU 的工作时间 | 4.8 ms | 第 4 章第 5 步 |

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| $t_{\text{step}}$ | 16 ÷ 3.35 | 4.78 ms | 每块 4.8 ms |
| 5 块 | 5 × 4.78 | 23.9 ms | 占到约 24 ms |

小 batch 的 decode 步要把 16 GB 权重整个读一遍，计算几乎不花时间，所以块长由带宽决定。

### 接下来

本章把 $t_{\text{step}}$ 当作一步里 **GPU** 的那份；接下来问 **CPU** 那份有多长。

## 第 2 步 · 一步就是对整个模型做一次前向

> **一句话：** 第三块铺满整条，从左到右是 embedding、32 层、`lm_head` 和采样；时间几乎全在 32 层上。

### 图上是什么

- 橙色长条：第 1 步的那一块放大，仍是 $t_{\text{step}} = 4.8$ ms。
- 条下标注：左端 `embed`，中间「32 层，形状相同，权重不同」，右端 `lm_head · sample`。白线把 32 层隔开。
- 两行说明：模型跑一遍的顺序；每层读自己那份 16 GB 权重（第 4 章第 2 步）和自己那份 KV cache（第 3 章第 3 步）。

### 各段做什么

| 段 | 做什么 | 讲过的地方 |
|---|---|---|
| embedding | token id 查表，变成向量 $x$ | 第 2 章第 2 步 |
| 32 层 | 每层 attention + MLP | 第 2 章第 1 步 |
| `lm_head` | 最后一个位置的向量变成词表分数 $s_t$ | 第 1 章第 3 步 |
| sample | 每个 request 选一个 token | 第 1 章第 4 步 |

### 代入图上的数

平均到每一层：$t_{\text{step}} \div 32 = 4.78\ \text{ms} \div 32 \approx 149\ \mu\text{s}$。第 3 步图上的「~149 µs」就是它。

### 接下来

第 3 步打开其中一层（第 6 层），看它在 GPU 上是几个 kernel。

## 第 3 步 · 一层是 11 个 kernel

> **一句话：** 一层在 GPU 上分 11 次执行；乘以 32 层再加首尾和零碎算子，一步约 1,000 个 kernel，平均每个约 5 µs。

### 图上是什么

- 上方淡橙色长条里加深的一格：第 6 层。
- 下方 11 个方块：这一层的 kernel，宽度是小 batch 下大致的时间占比（示意）。
  - 蓝色：`qkv`、`o`、`gate·up`、`down`，和本层权重做的 matmul（矩阵乘），这一层读权重的时间主要在它们身上。
  - 橙色：`attn`，在 KV cache 上做 attention。
  - 灰色：`norm`、`rope`、`add`、`silu`，小的逐元素运算。窄的方块放不下名字，没有标。
- 两行说明：数 kernel；平均每个跑多久。

**kernel** 是 GPU 执行的一个函数，一次处理整个 batch。GPU 一次跑一个，跑完再跑下一个。

### 公式

$$
t_{\text{kernel}} = \frac{t_{\text{step}}}{N_{\text{kernel}}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $t_{\text{step}}$ | 一步 GPU 的工作时间 | 4.78 ms | 第 1 步 |
| $N_{\text{kernel}}$ | 一步里的 kernel 数 | 约 1,000 | 本步 |
| $t_{\text{kernel}}$ | 一个 kernel 的平均执行时间（batch 为 1） | 约 5 µs | 本步 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| 32 层的 kernel | 11 × 32 | 352 |
| $N_{\text{kernel}}$ | 352 + embedding、`lm_head`、采样 + 中间每个 PyTorch 小算子 | 约 1,000（取整） |
| $t_{\text{kernel}}$ | 4.78 ms ÷ 1,000 | 4.8 µs，图上写「约 5 µs」 |

1,000 是本章取的整数，不是对某次 PyTorch 运行的计数。

### 接下来

第 4 步拿这约 5 µs 和 CPU 发起一个 kernel 的开销比。

## 第 4 步 · CPU 逐个启动 kernel

> **一句话：** 每个 kernel 由 CPU 发起，约 9 µs 一次；1,000 次共 9 ms，比 GPU 的 4.8 ms 还长，所以 GPU 有一半时间在等。

### 图上是什么

- 标题行：同一步，逐个 kernel 启动（eager 模式），batch 为 1。
- 「CPU · 启动」行：40 根蓝色小条，左边写 `1,000 × 9 µs = 9.0 ms`。
- 「GPU · 执行」行：40 根橙色小条，合计 4.8 ms 的工作，散开在 CPU 那行下面。每根小条代表 25 个 kernel。
- 红线：「一步 = 9.0 ms · GPU 忙碌占 53%」。
- 两行说明：GPU 跑完一个 kernel 时下一个还没启动；纯 PyTorch 的 batch-1 decode 只有带宽允许速度的一半左右。

**eager 模式**是 PyTorch 的默认执行方式：Python 每执行到一个算子，就当场发起对应的 kernel。

### 公式

$$
T_{\text{cpu}} = N_{\text{kernel}} \cdot t_{\text{launch}},\qquad
t_{\text{eager}} = \max(T_{\text{cpu}},\ t_{\text{step}})
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $t_{\text{launch}}$ | CPU 发起一个 kernel 的时间：Python、PyTorch dispatcher、CUDA driver | 约 9 µs | 本步（示意值） |
| $N_{\text{kernel}}$ | 一步的 kernel 数 | 1,000 | 第 3 步 |
| $T_{\text{cpu}}$ | 一步里 CPU 的启动总时间 | | 本步 |
| $t_{\text{step}}$ | 一步 GPU 的工作时间 | 4.78 ms | 第 1 步 |
| $t_{\text{eager}}$ | eager 模式下一步的长度 | | 本步 |

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| $T_{\text{cpu}}$ | 1,000 × 9 µs | 9.0 ms | `= 9.0 ms` |
| $t_{\text{eager}}$ | max(9.0, 4.78) | 9.0 ms | 一步 = 9.0 ms |
| GPU 忙碌 | 4.78 ÷ 9.0 | 53% | 忙碌占 53% |

取 max 的理由：CPU 发起和 GPU 执行同时进行，哪边慢就等哪边。$t_{\text{launch}} = 9\ \mu\text{s}$ 比第 3 步的 $t_{\text{kernel}} \approx 5\ \mu\text{s}$ 长，所以慢的是 CPU。

### 接下来

第 5 步把 CPU 那行放大到前 4 次启动。

## 第 5 步 · eager 模式：一次一个 kernel

> **一句话：** 放大前 4 次启动：CPU 花 9 µs 发一个，GPU 花 5 µs 跑完，然后空着等下一个。

### 图上是什么

- 时间往下走（左边的「时间」箭头）。
- 左框「CPU · Python」：4 条蓝色「启动 norm / qkv / rope / attn」，每条 9 µs。
- 中间的蓝色箭头：经「driver · PCIe」把 kernel 交给 GPU。
- 右框「GPU」：4 条橙色「执行 …」，每条 5 µs；之间 3 个红色虚线框「空闲」。
- 底部灰色虚线回箭头：「步末一次同步 · CPU 读 logits」。
- 两行说明：每个 kernel 都没有回音；GPU 4.8 ms 的工作被拖成 9.0 ms。

### 为什么 GPU 会空着

- **启动是单向的。** CPU 不等 kernel 跑完，能发就发下一个。所以节奏由 CPU 每次 9 µs 决定，不由 GPU 的 5 µs 决定。
- **每个间隙都空闲。** GPU 5 µs 跑完，下一个要到 9 µs 才到，中间约 4 µs 没事做。
- **唯一的回程**在步末：CPU 读 logits 去采样（第 1 章第 4 步），这时要等 GPU 全部做完。

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| 每个间隙 | 9 − 4.8 | 约 4 µs |
| 一步 | 1,000 × 9 µs（第 4 步的 $T_{\text{cpu}}$） | 9.0 ms |

### 接下来

第 6 步：把这 1,000 次启动预先录下来。

## 第 6 步 · 录制：记下启动，不执行

> **一句话：** 开着 capture 把这一步跑一遍，每次启动不发给 GPU，而是写进一张清单（CUDA graph）。

### 图上是什么

- 左框：和第 5 步同样的启动，画出前 5 次（norm、qkv、rope、attn、o）。
- 中间虚线框「graph · 一张启动清单」：每次启动变成一行，`序号. kernel  入 地址  出 地址  [64 行]`。
- 右框 GPU：虚线框「什么都没执行」。
- 两行说明：一条记录钉死 kernel、读写的地址和行数，里面没有 Python；engine 启动时每档录一次。

**CUDA graph** 是 CUDA 提供的功能：把一串 kernel 启动录成一个对象，之后整串一起发给 GPU。

### 代入图上的数

| # | kernel | 读 | 写 |
|---|---|---|---|
| 1 | norm | 0x7f10 | 0x7f11 |
| 2 | qkv | 0x7f11 | 0x7f12 |
| 3 | rope | 0x7f12 | 0x7f12（原地） |
| 4 | attn | 0x7f12 | 0x7f13 |
| 5 | o | 0x7f13 | 0x7f14 |

地址一环扣一环：上一条写的地址就是下一条读的地址。地址是示意值。行数 64 是这份 graph 录制时的 batch 大小。

### 存下了什么，没存什么

- **存下：** 第 4 步每次启动的**结果**，即哪个 kernel、哪些地址、多大。
- **没存：** 那 9 µs 的 Python 和 dispatcher 工作。它们只在录制时跑一次。

### 接下来

第 7 步回放这张清单。

## 第 7 步 · 回放：一次调用，GPU 自己走完清单

> **一句话：** CPU 发一条消息（约 20 µs），GPU 一条接一条执行清单，kernel 之间没有间隙。

### 图上是什么

- 左框：一条蓝色 `graph.replay()`，上写「一条消息 · 20 µs」，下面写 CPU 这一步剩下的时间空闲。
- 中间：第 6 步录好的 graph，每行 `序号. kernel @ 地址 [64 行]`。
- 右框：橙色「执行 …」一个接一个，没有空闲框。
- 两行说明：地址录制时定死，无需传参、无需决策；9.0 ms 的 CPU 变成 20 µs，GPU 的 4.8 ms 现在就是整步。

### 公式

$$
t_{\text{graph}} = t_{\text{replay}} + t_{\text{step}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $t_{\text{replay}}$ | CPU 发起一次回放的时间 | 约 20 µs（示意值） | 本步 |
| $t_{\text{step}}$ | GPU 跑完 1,000 个 kernel | 4.78 ms | 第 1 步 |
| $t_{\text{graph}}$ | 用 graph 时一步的长度 | | 本步 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| CPU 开销缩小 | $T_{\text{cpu}} \div t_{\text{replay}}$ = 9.0 ms ÷ 20 µs | 约 450 倍 |
| $t_{\text{graph}}$ | 0.02 + 4.78 | 4.80 ms |

### 为什么 CPU 空出来有用

第 10 章第 9 步的重叠调度要在 GPU 跑第 t 步时，让 CPU 计划第 t+1 步。CPU 每步要花 9 ms 发 kernel 就没有余力；回放之后 CPU 只花 20 µs。

### 接下来

第 8 步把它画回第 4 步的两条泳道上对比。

## 第 8 步 · 回到两条泳道

> **一句话：** 同一比例尺下，CPU 那行只剩 20 µs 的一道细线，GPU 那行是一整条 4.8 ms；一步从 9.0 ms 变成 4.8 ms。

### 图上是什么

- 「CPU · 启动」行：一道蓝色细线，「一次启动 · 20 µs · 之后 CPU 空闲」。
- 「GPU · 执行」行：一整条橙色，「1,000 个 kernel，一个接一个」。
- 绿线：「一步 = 4.8 ms · GPU 忙碌 ~100%」。
- 说明行：`graph.replay()`，一次 driver 调用，循环里没有 Python。

### 代入图上的数

| | eager（第 4 步） | graph（本步） |
|---|---|---|
| CPU 时间 | $T_{\text{cpu}}$ = 9.0 ms | $t_{\text{replay}}$ = 20 µs |
| 一步 | $t_{\text{eager}}$ = 9.0 ms | $t_{\text{graph}}$ ≈ 4.8 ms |
| GPU 忙碌 | 53% | 约 100% |

batch 为 1 的 decode 快了 $9.0 \div 4.78 \approx 1.9$ 倍，速度重新由第 1 步的权重读取决定。

### 在 SGLang 里

decode 的 graph 由 `DecodeCudaGraphRunner`（`model_executor/runner/decode_cuda_graph_runner.py`）录制和回放，默认开启；`--disable-decode-cuda-graph` 可以关掉。

### 接下来

第 9 步：录制是字面的，batch 大小一变会怎样。

## 第 9 步 · 录制是字面的：行数也定死了

> **一句话：** 64 行录的 graph 拿 96 行去回放，kernel 还是只算 64 行，多出的 32 行输出保留上一步的旧值，而且不报错。

### 图上是什么

- 顶部一条记录：`2. qkv matmul · 读 0x7f11 [64 × 4096] · 写 0x7f12 [64 × 12288]`。行数和地址是记录的一部分，不是参数。
- 上半「batch 为 64」：16 格橙色输入（每格代表 4 行）→ 回放 → 16 格绿色输出，✓。
- 下半「batch 为 96」：24 格输入，后 8 格红色 → 回放 → 前 16 格绿色，后 8 格红色虚线「从未写入」，✗。
- 两行说明：形状不是 `replay()` 的参数，CUDA 无从检查；防护必须在 engine 里。

### 代入图上的数

| | 输入行 | 被计算的行 | 输出缓冲区里这一步的行 | 旧值 |
|---|---|---|---|---|
| batch 64 | 64 | 64 | 64 | 0 |
| batch 96 | 96 | 64 | 64 | 96 − 64 = 32 |

4096 是每个 token 向量 $x$ 的长度（第 2 章第 2 步）。

关于 12288：它等于 3 × 4096，是 q、k、v 各 4,096 宽时的输出宽度。Llama-3-8B 的 k、v 只有 8 个 head（第 2 章第 14 步），真实宽度是 $32 \times 128 + 2 \times 8 \times 128 = 6{,}144$。这不影响本步要说的事：行数定死在录制里。

### 后果

CPU 读输出缓冲区时，32 个 request 拿到的是上一步的 logits，从里面采出的 token 是错的。没有报错，因为 graph 里没有「形状」可以对照。

### 接下来

第 10、11 步：engine 怎么保证每次都挑一份合适的 graph。

## 第 10 步 · batch 大小一直在变，所以录一架梯子

> **一句话：** 运行中的 batch 每几步就变；engine 启动时为一组尺寸各录一份 graph，每步挑不小于当前 batch 的最小那份。

### 图上是什么

- 40 根橙色柱：40 个 decode 步里运行中的 request 数。从 37 开始，最低 36，最后 71（request 有完成有加入，第 6 章）。
- 每根柱上的蓝色横线：这一步回放用的档位。
- 下面 13 个蓝框：启动时录好的档位 1、2、4、8、16、24、32、48、64、96、128、160、256。
- 一行日志样式的文字 `Capture cuda graph bs [...]`，「几秒，一次」；说明行：小尺寸处档位更密。

### 公式

$$
\text{rung}(B) = \min\{\, c \in \text{梯子} : c \ge B \,\}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $B$ | 这一步运行中的 request 数 | 本步的柱高 |
| 梯子 | 启动时录过 graph 的 batch 大小 | 本步的 13 个框 |
| $\text{rung}(B)$ | 这一步回放用的 graph 的大小 | 本步 |

不能取比 $B$ 小的档，第 9 步说明了原因。

### 代入图上的数

| $B$ | $\text{rung}(B)$ |
|---|---|
| 36 – 48 | 48 |
| 50 – 61 | 64 |
| 65 – 72 | 96 |

相邻档位的间隔是 1、2、4、8、8、8、16、16、32、32、32、96。

### 在 SGLang 里

规则在 `BaseCudaGraphRunner._pad_to_bucket`：对档位列表做 `bisect_left`，取不小于 $B$ 的第一个。比最高档还大的 batch 不走 graph，由 `can_run_graph` 拦下，eager 跑。

图上的梯子是示意。SGLang 默认的 decode 梯子更密：`[1, 2, 4, 8, 12]`，然后 16 到 256 每隔 8 一档，再往上每隔 16、32（`arg_groups/cuda_graph_hook.py` 的 `generate_decode_cuda_graph_batch_sizes`）。可以用 `--cuda-graph-bs-decode` 指定，用 `--cuda-graph-max-bs-decode` 设上限。

### 接下来

第 11 步：37 是怎么补到 48 的。

## 第 11 步 · padding：37 补到 48

> **一句话：** 37 个 request 回放 48 的 graph，多出的 11 行是占位，结果丢掉；多算 11 行几乎不加时间。

### 图上是什么

- 顶部梯子：32 和 48 高亮，48 填成蓝色；「32 太小 → 补到 48，下一档」。
- 「输入行」：48 格，37 格橙色「37 真实」，11 格虚线「11 占位」。
- 橙色胶囊：「回放 48 的 graph · 4.8 ms」。
- 「输出 logits」：37 格绿色「37 → 采样器」，11 格红色虚线「11 丢弃」。
- 说明行：memory-bound 的一步里 11 行浪费几乎无代价；一千次启动要花 9.0 ms。

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| 档位 | $\text{rung}(37)$，第 10 步的公式 | 48 |
| 占位行 | 48 − 37 | 11 |
| 回放耗时 | $t_{\text{step}}$，第 1 步 | 4.8 ms |
| eager 跑 37 的启动开销 | $T_{\text{cpu}}$，第 4 步 | 9.0 ms |

### 为什么多 11 行几乎不花时间

48 行共用一次 16 GB 的权重读取（第 5 章第 2 步）。48 远低于第 4 章第 8 步约 300 token 的分界点，这一步仍是 memory-bound（等内存），多算的行只占用本来就空着的计算单元。

### 接下来

第 12 步：为什么只给 decode 录 graph。

## 第 12 步 · 只有 decode 录 graph

> **一句话：** decode batch 的形状是 [B, 1]，只有 B 会变，梯子罩得住；prefill batch 每次长度都不同，没法预先录，eager 跑。

### 图上是什么

- 左框「一个 decode batch」：`req 1` 到 `req 6` 各一个橙色小块，`… ×B`；「形状 [B, 1] · 只有 B 变」「可回放」。
- 右框「一个 prefill batch」：`seq 1`、`seq 2`、`seq 3` 分别 18、27、11 个蓝色小块；「形状 [Σ tokens, …] · 长短不齐」，「eager，没关系：反正 compute-bound」。

### 代入图上的数

| | decode | prefill |
|---|---|---|
| 每个 request 的 token 数 | 1 | 18、27、11 |
| 这一 batch 的 token 数 | $B$ | 18 + 27 + 11 = 56 |
| 会变的东西 | 只有 $B$ | 总数、每条的长度和起止位置 |
| 处理方式 | 补到 $\text{rung}(B)$（第 10、11 步） | eager |

attention 还要知道每条序列从哪开始、到哪结束，所以两个总数相同的 prefill batch 也不是同一份清单。

### 为什么 prefill 用 eager 代价不大

prefill 一次权重读取对应很多 token。超过第 4 章第 8 步约 300 token 的分界点后它就是 compute-bound，GPU 时间远长于第 4 步那 9.0 ms 的启动，启动开销占比很小。这就是第 6 章第 3 步说的两种形状。

### 在 SGLang 里

本章说的是整步一份 graph 的做法。当前的 SGLang main 也给 prefill 录 graph，用的是第 12 章的切段办法（prefill 的 graph 后端默认 `breakable`，可用 `--disable-prefill-cuda-graph` 关掉）。

## 第 13 步 · 地址冻结了，新 token 怎么进去

> **一句话：** graph 不收参数，所以每步采出的 token 写回同一个 ids 缓冲区里自己的槽位，再回放同一份录制。

### 图上是什么

- 三列：步 t、t+1、t+2。每列从上到下：ids 缓冲区 → 橙色「回放」→ logits 缓冲区 `[48 × 128256]` → 采样结果。
- 两条阴影带：`ids @ 0x7f00` 和 `logits @ 0x7f20`，各是**一个**缓冲区在三个时刻。
- 行：`req 0`、`req 1`、`req 2`（48 个槽画 3 个，「还有 45 个」）。蓝色是 `req 1`，用第 1 章的 token。
- 蓝色虚线「写回」：步 t 的采样列连到步 t+1 的 ids 列。

### 代入图上的数

| 步 | `req 1` 的 ids 槽 | 采样结果 |
|---|---|---|
| t | 374 `" is"` | 12366 `" Paris"` |
| t+1 | 12366 `" Paris"` | 13 `"."` |
| t+2 | 13 `"."` | 128001 `<EOS>` |

- 48：第 11 步的档位，所以 ids 有 48 个槽。
- 128256：Llama-3 词表的 token 数；logits 每行一个 request，每列一个词表 token（第 1 章第 3 步的 $s_t$）。
- 12366、13、128001 和第 1 章选出的 id 相同；128001 是 EOS，`req 1` 到此结束（第 1 章第 11 步）。

### 在 SGLang 里

`DecodeCudaGraphRunner` 在回放前调用 `_copy_replay_inputs`，把这一步的 `input_ids` 复制进静态缓冲区的前几行，其余的行留作 padding。采样出的 token 怎么在 CPU 还没拿到时就进入下一步的输入，见第 10 章第 10 步的占位符。

### 接下来

每次回放都是同一份录制、同样的地址，变的只有缓冲区里的数。第 14 步：哪些东西做不到这一点。

## 第 14 步 · graph 装不下的东西

> **一句话：** 一份录制要求每步是同一张 kernel 清单、同样的地址和形状；依赖数据的东西会破坏这一点，第 12 章在那里把 graph 切开。

### 图上是什么

- 标题：graph 是固定的录制，这些不固定。
- 四行，每行一个例子和原因：

| 行 | 为什么不固定 |
|---|---|
| MoE 路由 | 一个 token 走哪些 expert 由 token 本身决定，每个 expert 分到几行事先不知道 |
| 投机验证 | 有几个 draft token 被接受，跑完才知道（第 15 章） |
| attention 计划 | 有些 attention 后端在启动 kernel 前，要在 CPU 上为这个 batch 算形状和索引 |
| 任何一处 `.item()` | 把一个 GPU 上的数读到 CPU，CPU 要停下等 GPU；录制里装不下这种等待 |

- 脚注：`--enable-piecewise-cuda-graph`、`--enable-torch-compile`。

### 为什么这些会出问题

第 6–13 步成立，靠的是每一步只有两样东西会变：batch 大小（补到某一档）和缓冲区里的数。上面每一行要么改变 kernel 清单，要么改变形状，要么要求 CPU 中途参与。

### 在 SGLang 里

办法是在这些地方把 graph 切开：切口之间的部分照样回放，切口里的部分 eager 跑，第 12 章讲。有些情况也可以把 kernel 写成固定形状来绕开，例如 SGLang 给投机解码的 draft 模型单独录 graph（`speculative/eagle_draft_cuda_graph_runner.py`）。

脚注里的 `--enable-piecewise-cuda-graph` 在当前 SGLang main 里已经没有了；prefill 的分段 graph 由 `--cuda-graph-backend-prefill` 选择。`--enable-torch-compile` 仍在，是第 12、13 章用的工具。
