## 第 1 步 · 第 11 章停在这里

> **一句话：** 第 11 章只给 decode 录 graph，prefill 用 eager 跑，理由是「prefill 是 compute-bound，启动开销被藏住」；这一章检查这句话在什么时候成立。

### 图上是什么

- 左框「一个 decode batch」：`req 1` 到 `req 5` 各一个橙色小块；「shape [B, 1] · 只有 B 变」；绿字「整步一个 graph」。
- 右框「一个 prefill batch」：`seq 1`、`seq 2`、`seq 3` 分别是 18、27、11 个蓝色小块；「shape [Σ tokens, …] · 长短不齐」；红字「eager 跑，逐个 kernel」。
- 下面两行：第 11 章第 12 步当时的结论，以及「大 prefill 确实如此。小 prefill 不是。」

这一幅就是第 11 章第 12 步的图。

### 两种形状

| | decode | prefill |
|---|---|---|
| 每个 request 的 token 数 | 1 | 18、27、11 |
| 这个 batch 的 token 数 | $B$ | 18 + 27 + 11 = 56 |
| 会变的东西 | 只有 $B$ | 总数，以及每条序列的长度和起止位置 |
| 第 11 章的做法 | 补到梯级 $\text{rung}(B)$，replay（第 11 章第 10、11 步） | eager |

`[Σ tokens, …]` 的意思：几个 prompt 首尾拼成一长串，行数是所有 prompt 的 token 数之和。

### 第 11 章用到的两个数

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $t_{\text{mem}}$ | 读一遍 16 GB 权重的时间 | 16 GB ÷ 3.35 TB/s = 4.78 ms | 第 4 章第 5 步 |
| $T_{\text{cpu}}$ | CPU 逐个启动一步全部 kernel 的时间 | 1,000 × 9 µs = 9.0 ms | 第 11 章第 4 步 |

「启动开销被藏住」的意思是：prefill 的 GPU 时间比 9.0 ms 长，CPU 发 kernel 的速度跟得上 GPU。

### 接下来

第 2 步把 prefill 的 GPU 时间画成 token 数的函数，看它在哪里超过 9.0 ms。

## 第 2 步 · token 少的 prefill 是 launch-bound

> **一句话：** prefill 的 GPU 时间约 560 个 token 才超过 9.0 ms 的启动时间；比这少，一步的长度由 CPU 决定。

### 图上是什么

- 横轴：一个 prefill 步里的 token 数 $n$，0 到 800。纵轴：时间，0 到 12 ms。
- 两条细的橙色虚线：平的是权重读取 4.8 ms，斜的是计算，每 token 16 µs。
- 粗的橙色线：GPU 用时，取两条虚线中较大的那条。
- 蓝色虚线：启动 9.0 ms，与 $n$ 无关。
- 橙点 `300 · Ch. 4 Step 8 的平衡点`；横轴上的红字 `560` 和红色竖虚线；它左边浅红色区域标 `launch-bound`，右边写「启动开销被藏住」。

### 公式

$$
t_{\text{tok}} = \frac{f}{F},\qquad
T_{\text{gpu}}(n) = \max\big(t_{\text{mem}},\ n\,t_{\text{tok}}\big),\qquad
n_{\text{launch}} = \frac{T_{\text{cpu}}}{t_{\text{tok}}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n$ | 一个 prefill 步里的 token 数 | 横轴 | 第 4 章第 3 步 |
| $f$ | 一个 token 过一遍模型的运算次数 | 16 GFLOP | 第 4 章第 3 步，`GFLOP_PER_TOKEN` |
| $F$ | GPU 每秒的 bf16 运算次数 | 989 TFLOP/s | 第 4 章第 5 步，`TFLOPS` |
| $t_{\text{tok}}$ | 每个 token 的计算时间 | 约 16 µs | 本步 |
| $t_{\text{mem}}$ | 读一遍权重 | 4.78 ms | 第 4 章第 5 步 |
| $T_{\text{gpu}}(n)$ | GPU 跑完这一步的时间 | 粗橙线 | 本步 |
| $T_{\text{cpu}}$ | CPU 启动这一步的时间 | 9.0 ms | 第 11 章第 4 步 |
| $n_{\text{launch}}$ | GPU 时间追上启动时间的 token 数 | 约 560 | 本步 |

一步的长度是 $\max(T_{\text{cpu}}, T_{\text{gpu}}(n))$，理由同第 11 章第 4 步：CPU 发 kernel 和 GPU 执行同时进行，慢的一边决定一步多长。

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| $t_{\text{tok}}$ | 16 GFLOP ÷ 989 TFLOP/s | 16.2 µs | 每 token 16 µs |
| 平衡点 | 4.78 ms ÷ 16 µs | 299 | 300 |
| $n_{\text{launch}}$ | 9,000 µs ÷ 16 µs | 562.5 | 560 |
| $T_{\text{gpu}}(100)$ | max(4.78, 100 × 0.016 = 1.6) | 4.8 ms | 红区里 |
| GPU 忙碌，$n = 100$ | 4.78 ÷ 9.0 | 53% | |
| $T_{\text{gpu}}(800)$ | max(4.78, 800 × 0.016) | 12.8 ms | 右边，超过 9.0 ms |

组件里每 token 取整数 16 µs，所以 560 是 9,000 ÷ 16 再取到十位。

### 落在 560 以下的 prefill

图下第二行举了三种：短 prompt；chunked prefill（第 6 章第 6 步）切剩的最后一块；视觉编码器（图片的编码器，第 16 章）。这些都是常见的 prefill，第 11 章那句话对它们不成立。

### 接下来

第 3 步：既然小 prefill 也受启动限制，就给 prefill 也录 graph。

## 第 3 步 · 按 token 数补齐到梯级

> **一句话：** 和第 11 章的梯子同一个办法，只是梯级数的是 token 而不是 request：56 补到 64，131 补到 144，92 补到 96。

### 图上是什么

- 三行 `batch 1`、`batch 2`、`batch 3`，每个小方块是一个 token：蓝色是真 token，白色带边框的是补齐的。
- 每行下面：`56 真实` `+8`、`131 真实` `+13`、`92 真实` `+4`。
- 每行右边：`→ 64 的 graph`、`→ 144 的 graph`、`→ 96 的 graph`。

### 公式

第 11 章第 10 步的规则，把 $B$ 换成 $n$：

$$
\text{rung}(n) = \min\{\, c \in \text{梯级表} : c \ge n \,\},\qquad
\text{pad}(n) = \text{rung}(n) - n
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $n$ | 这一步的 token 数 | 第 2 步 |
| 梯级表 | 启动时录过 graph 的 token 数 | 第 9 步画出全表 |
| $\text{rung}(n)$ | 这一步 replay 的 graph 的大小 | 本步 |
| $\text{pad}(n)$ | 补齐的 token 数 | 本步 |

### 代入图上的数

这几个大小落在梯级表「48 到 256，每隔 16」那一段：48、64、80、96、112、128、144……

| batch | $n$ | $\text{rung}(n)$ | $\text{pad}(n)$ | 占该梯级 |
|---|---|---|---|---|
| 1 | 56 | 64 | 8 | 8 ÷ 64 = 13% |
| 2 | 131 | 144 | 13 | 13 ÷ 144 = 9% |
| 3 | 92 | 96 | 4 | 4 ÷ 96 = 4% |

补齐的行和真行一样跑完 graph，输出丢掉，同第 11 章第 11 步的占位行。

### 接下来

补齐固定了总行数 $n$。第 4 步看它没固定的东西。

## 第 4 步 · 总数相同，边界不同

> **一句话：** 两个都是 56 个 token 的 batch，attention 要算的 query-key 对一个是 615、一个是 893，位置也不同。

### 图上是什么

- 两个 56 × 56 的网格：每行一个 query，每列一个 key，都按 batch 里的顺序（左边标 `queries ↓`，上边标 `keys，按顺序 →`）。
- 上边和左边的色条：每个 token 属于哪条序列（蓝、橙、青）。
- 网格里的彩色三角形：真正要算的格子；灰色是从不计算的格子。
- 左：`batch 1 · 18 + 27 + 11`，`3 个三角形 · 18×18 · 27×27 · 11×11`。右：`batch 2 · 40 + 9 + 7`，`40×40 · 9×9 · 7×7`。

### 为什么是三角形

第 2 章第 7 步：位置 $i$ 只看自己和前面的 key（causal）。一个 batch 里拼着几条序列，所以还要再加一条：只看**自己序列里**的 key。每条序列各占对角线上的一块三角形，序列之间的格子全是灰的。

### 公式

$$
P = \sum_{s} \frac{L_s\,(L_s + 1)}{2}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $s$ | batch 里的第几条序列 | 本步 |
| $L_s$ | 序列 $s$ 的 token 数 | 本步，18、27、11 或 40、9、7 |
| $P$ | 这个 batch 里 attention 要算的 query-key 对数 | 本步 |

一条长 $L$ 的序列里，第 $i$ 个 query 看 $i$ 个 key，合计 $1 + 2 + \dots + L = L(L+1)/2$。第 2 章第 7 步的 5 个 token 就是 15 对。

### 代入图上的数

| batch | 各序列 | $P$ |
|---|---|---|
| 1 | 18·19/2 + 27·28/2 + 11·12/2 = 171 + 378 + 66 | 615 |
| 2 | 40·41/2 + 9·10/2 + 7·8/2 = 820 + 45 + 28 | 893 |

两者 $n$ 都是 56，按第 3 步会 replay 同一份 64 的 graph。图上标的 `18×18` 等是三角形所在方块的边长，不是对数。

### 为什么一份录制不能两用

第 11 章第 9 步：录制把 kernel 读写哪些格子、多少行都定死了。attention 要算哪些格子取决于序列的起止位置，而这些位置每个 batch 都不同。

### 接下来

第 5 步看一层里的其他 kernel 是否也受边界影响。

## 第 5 步 · 一层里只有 attention 读边界

> **一句话：** 把两个 batch 各过一层，11 个 kernel 里 10 个看到的形状完全相同，只有 attn 不同。

### 图上是什么

- 11 行：第 11 章第 3 步的一层 11 个 kernel，`norm`、`qkv`、`rope`、`attn`、`o`、`add`、`norm`、`gate·up`、`silu`、`down`、`add`。
- 两列：每个 kernel 在 batch 1（18+27+11）和 batch 2（40+9+7）上看到的形状。
- 右列「相同？」：10 个绿色 ✓，`attn` 一行红底、红色 ✗。

### 怎么读形状

`[行, 列]`：行是 token 数，列是每个 token 的向量宽度。`A × B` 是和一个权重矩阵相乘。

| 宽度 | 是什么 | 算式 |
|---|---|---|
| 4,096 | 每个 token 的隐藏向量 $x$（第 2 章第 2 步） | `D_MODEL` |
| 6,144 | q、k、v 拼在一起 | 32 × 128 + 2 × 8 × 128 = 4,096 + 2,048 |
| 28,672 | gate 和 up 两个矩阵拼在一起 | 2 × 14,336 |
| 14,336 | MLP 中间层宽度 | `D_FF` |

32 个 query head、8 个 k/v head、每个 head 128 维，来自第 2 章第 14 步。

### 为什么 10 行相同

这 10 个 kernel 每行各算各的：输出第 $i$ 行只取决于输入第 $i$ 行和权重，与第 $i$ 行属于哪条序列无关。所以两个 batch 在这些 kernel 里的形状都是 `[56, …]`，补到 64 后可以共用一份录制。这类 kernel 本章叫「逐 token」（token-wise）。

attn 那一行写的是第 4 步的三角形：`18×18 27×27 11×11` 对 `40×40 9×9 7×7`。

### 接下来

第 6 步：既然只有 attention 不能录，就在每个 attention 处把一步切开。

## 第 6 步 · 在每个 attention 处切一刀

> **一句话：** 32 层有 32 个 attention，切 32 刀得到 33 段；每段都只含逐 token 的 kernel，可以按补齐后的 token 数录制。

### 图上是什么

- 一根蓝色长条：一整个 prefill 步，左端 `embed`，右端 `lm_head`。
- 32 道红线：每层一个 attention，`32 个 attention · 32 刀`。
- 下面一排白框：`第 1 段` 到 `第 8 段` 和 `…`；「33 段，大约每层一段」。
- 最下一行：每个梯级录 33 次而不是一次。

`embed` 把 token id 换成向量（第 2 章第 2 步）；`lm_head` 把最后的向量变成词表分数（第 1 章第 3 步）。

### 公式

$$
N_{\text{piece}} = N_{\text{layer}} + 1
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $N_{\text{layer}}$ | 层数，也是 attention 的个数 | 32 | `src/numbers.ts` 的 `LAYERS` |
| $N_{\text{piece}}$ | 切出来的段数 | 33 | 本步 |

一根条切 $k$ 刀得到 $k + 1$ 段，所以 32 + 1 = 33。

### 每段里是什么

按第 5 步的 kernel 顺序：

| 段 | 内容 |
|---|---|
| 第 1 段 | embed，第 1 层的 norm、qkv、rope |
| 第 2–32 段 | 上一层 attention 之后的 o、add、norm、gate·up、silu、down、add，加下一层的 norm、qkv、rope |
| 第 33 段 | 第 32 层的 o 到 add，再加 lm_head |

### 接下来

第 7 步看切开之后，一步在 CPU 和 GPU 上怎么跑。

## 第 7 步 · 运行时：replay 和 eager 交替

> **一句话：** 一步变成「replay 一段、eager 跑 attention、replay 下一段」；CPU 要做 129 件事，而不是 1,000 件。

### 图上是什么

- 两条泳道，同第 11 章第 4 步：上面 CPU，下面 GPU，时间从左到右。画了 33 段里的前 5 段。
- CPU 上蓝色 `replay`：一次 replay 调用（第 11 章第 7 步），对应第 6 步的一段。下面橙色块 `第 N 段`：这段的 kernel 在 GPU 上一个接一个跑。
- CPU 上红色 `eager`：按老方式启动 attention。下面红色块 `attn`：这次 attention 在跑。
- 说明：每个橙色块里 CPU 都空闲，只在接缝处忙。

### 公式

$$
N_{\text{cpu}} = N_{\text{piece}} + N_{\text{layer}} \cdot a
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $N_{\text{piece}}$ | 段数，每段一次 replay | 33 | 第 6 步 |
| $N_{\text{layer}}$ | attention 个数 | 32 | 第 6 步 |
| $a$ | 一个 attention 要启动的 kernel 数 | 3 | 本章取的示意值 |
| $N_{\text{cpu}}$ | CPU 一步要发起的调用数 | | 本步 |
| $N_{\text{kernel}}$ | 一步的 kernel 总数 | 1,000 | 第 11 章第 3 步 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| $N_{\text{cpu}}$ | 33 + 32 × 3 | 129 |
| 在段里、不用 CPU 的 kernel | 1,000 − 32 × 3 | 904 |

$a = 3$ 是本章的假设，不同的 attention 后端启动的 kernel 数不同（第 14 章）。

### 为什么 attention 用 eager 也没关系

要紧的是 CPU 一步的总次数：32 个 attention 只有 96 次启动，96 × 9 µs = 864 µs，远小于 GPU 的 4.8 ms（第 8 步算完整账）。

### 接下来

第 8 步把 129 次调用换算成时间。

## 第 8 步 · CPU 用时：9.0 ms 变成约 1.2 ms

> **一句话：** 分段时 CPU 一步约 1.2 ms，是整模型一个 graph（20 µs）的 60 倍，但两者都低于 GPU 的 4.8 ms，所以一步的长度一样。

### 图上是什么

- 三根横条，同一比例尺，每个 prefill 步的 CPU 用时：
  - 红 `eager`：`1,000 次启动 × 9 µs`，9.0 ms。
  - 绿 `分段`：`33 次 replay (330 µs) + 32 次 eager attention (864 µs)`，1.2 ms。
  - 灰 `一个整模型 graph`：20 µs；「这里用不了：形状每个 batch 都变」。
- 橙色竖虚线 `GPU 的 4.8 ms`，左边绿字「这条线左边的部分都免费」。

### 公式

$$
T_{\text{pw}} = N_{\text{piece}}\,t_{\text{piece}} + N_{\text{layer}}\,a\,t_{\text{launch}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $N_{\text{piece}}, N_{\text{layer}}, a$ | 段数、attention 数、每个 attention 的启动数 | 33、32、3 | 第 6、7 步 |
| $t_{\text{piece}}$ | CPU 发起一段 replay 的时间 | 约 10 µs | 本章取的示意值 |
| $t_{\text{launch}}$ | CPU 启动一个 kernel 的时间 | 9 µs | 第 11 章第 4 步 |
| $t_{\text{replay}}$ | 整模型一个 graph 的 replay 时间 | 20 µs | 第 11 章第 7 步 |
| $T_{\text{pw}}$ | 分段时 CPU 一步的用时 | | 本步 |

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| eager | 1,000 × 9 µs | 9.0 ms | 红条 |
| 段的 replay | 33 × 10 µs | 330 µs | `(330 µs)` |
| attention 启动 | 32 × 3 × 9 µs | 864 µs | `(864 µs)` |
| $T_{\text{pw}}$ | 330 + 864 | 1,194 µs | 1.2 ms |
| 对整模型 graph | 1,194 ÷ 20 | 59.7 | 60 倍 |

### 为什么 60 倍也无所谓

一步的长度是 $\max(\text{CPU}, T_{\text{gpu}})$（第 2 步）。$n$ 小于约 300 时 $T_{\text{gpu}} = 4.8$ ms（第 2 步）。1.2 ms 和 20 µs 都小于 4.8 ms，两种做法一步都是 4.8 ms；eager 的 9.0 ms 超过它，一步就是 9.0 ms。

### 接下来

第 9 步：这些梯级具体有哪些，各隔多远。

## 第 9 步 · 梯级表：间隔随 token 数增大

> **一句话：** SGLang 默认的 prefill 梯级从 4 到 4096 共 50 个，间隔从 4 增到 256；每段顶端的间隔是 token 数的十六分之一。

### 图上是什么

- 两条轴都是对数刻度。横轴：token 数 $n$（4、32、256、1024、4096）。纵轴：相邻梯级的间隔（4、16、64、256）。
- 五段粗蓝线：默认梯级表的五个区间，每个梯级一道刻度，标着 `每隔 4` `4–32` 等。
- 左上：「共 50 个梯级 / 每个录 33 次 / 启动时建一次」。

### 代入图上的数

| 区间 | 间隔 | 梯级数 |
|---|---|---|
| 4–32 | 4 | (32 − 4) ÷ 4 + 1 = 8 |
| 48–256 | 16 | (256 − 48) ÷ 16 + 1 = 14 |
| 288–512 | 32 | 8 |
| 576–1024 | 64 | 8 |
| 1280–4096 | 256 | 12 |
| 合计 | | 50 |

启动时要录 50 × 33 = 1,650 份（第 6 步，每个梯级 33 段）。

### 补齐浪费多少

$\text{pad}(n)$ 最多是间隔减 1（第 3 步的 +8、+13、+4，间隔都是 16）。浪费占比约为「间隔 ÷ $n$」：

| 位置 | 间隔 ÷ $n$ |
|---|---|
| 各区间顶端：16/256、32/512、64/1024、256/4096 | 1/16 |
| 区间底端，例如 48 | 16/48 = 1/3 |
| 288 | 32/288 ≈ 1/9 |

所以「约十六分之一」只在每个区间的上半部分成立，每个区间的底端浪费比例更大。如果间隔固定为 4，到 4096 要 4096 ÷ 4 = 1,024 个梯级；让间隔随 $n$ 增大，梯级只有 50 个。

### 在 SGLang 里

梯级表在 `arg_groups/cuda_graph_hook.py` 的 `generate_prefill_cuda_graph_batch_sizes`，五个区间与图上一致；4096 以上每隔 512 一个，直到上限。可以用 `--cuda-graph-bs-prefill` 指定整张表，用 `--cuda-graph-max-bs-prefill` 设上限（这里的 bs 指 token 数）。

### 接下来

第 10 步：除了 attention，还有哪些 op 也要切出去。

## 第 10 步 · 其他接缝

> **一句话：** 判断一个 op 要不要切出去，只问一个问题：它的工作取决于 batch 里的数据，还是只取决于 token 数。

### 图上是什么

- 三个框：
  - 红 `attention`：需要序列边界，边界每个 batch 都变（第 4 步）。
  - 青 `all-reduce`：要等组里其他 GPU（第 24 章）。
  - 橙 `MoE dispatch`：发给每个 expert 多少 token 由 token 本身决定。
- 中间的问题：「它的工作依赖数据，还是只依赖 token 数？」
- 两个分支：绿「只看 token 数 → 补齐、录制、放进一段里」；红「数据 → 留在外面，成为接缝」。
- 脚注：接缝清单是配置，引擎自己指定。

### 两个新名词

- **all-reduce**：一个模型分到几张 GPU 上时（第 24 章），每张 GPU 只算出结果的一部分，要经 GPU 之间的连线把各部分加起来。
- **MoE dispatch**：mixture-of-experts 模型里，一个 router 给每个 token 挑几个 expert（几组 MLP 权重中的几组），dispatch 把 token 发过去。每个 expert 分到几行，由 token 的值决定，所以同一个 $n$ 下形状也每次不同。

### 归类

| op | 只看 $n$？ | 处理 |
|---|---|---|
| 第 5 步的 10 个逐 token kernel | 是 | 放进段里 |
| attention | 否，看边界 | 切出 |
| MoE dispatch | 否，看 token 的值 | 切出 |
| all-reduce | 形状只看 $n$，但要和别的 GPU 同步 | 图上把它列为接缝 |

全书的例子 Llama-3-8B 单卡运行，这三种里只有 attention。

### 在 SGLang 里

SGLang 的 torch.compile 分段路径（`tc_piecewise`）里，all-reduce（`inplace_all_reduce`）用 `register_split_op` 注册为切分点；用 DeepEP 或 Mooncake 做 MoE 通信时再加上 MoE 的那个 op。当前默认的 prefill 后端（`breakable`，见第 11 步）在 attention 和 EP MoE 的 all-to-all 处断开，all-reduce 留在段内一起录制。

### 接下来

第 11 步：这 33 段是谁切出来的。

## 第 11 步 · 谁找到这些接缝：tracer

> **一句话：** torch.compile 把模型跑一遍、按顺序记下每个 op，在指定的 op 处切开，交回 33 个子图，每个子图按梯级录制。

### 图上是什么

- 四个框，从左到右：
  1. 模型：一个 Python 类，`forward()` 调用其他模块。
  2. trace：在 Dynamo 下跑一遍，记下每个 op。
  3. 切：在指定的 op 处，attention、all-reduce、MoE dispatch。
  4. 录制：33 个子图，每个按梯级录制（第 11 章第 10 步）。
- 下面一条：tracer 交回的 op 清单，`norm qkv rope ✂attn o add norm gate·up silu down add ✂attn …`，剪刀处是切口。

### 几个名词

- **trace**：真的执行一遍 `forward()`，同时记下遇到的每个张量运算，得到一张按顺序排开的 op 清单（图）。
- **Dynamo**：torch.compile 里做 trace 的那部分，它在 Python 执行时记录 op。
- **子图**：两个切口之间的那一段 op。

### 对上前几步

| 图上 | 对应 |
|---|---|
| op 清单的顺序 | 第 5 步的 11 行 |
| 每把剪刀 | 第 6 步的一刀 |
| 33 个子图 | 第 6 步的 33 段 |
| 每个按梯级录制 | 第 9 步的 50 个梯级，共 1,650 份 |

### 在 SGLang 里

本章讲的是 torch.compile 的做法，SGLang 里叫 `tc_piecewise`。当前 SGLang main 的命令行已经不能选它（`--cuda-graph-backend-prefill` 只接受 `full`、`breakable`、`disabled`），CUDA 上 prefill 的默认后端是 `breakable`：不做 trace，录制时遇到标了 `@eager_on_graph` 的函数（例如 `RadixAttention` 的 attention）就结束当前段、eager 跑它、再开下一段。切出来的结构和本章一样：段与段之间是 eager 的 attention。可以用 `--disable-prefill-cuda-graph` 关掉。

### 接下来

第 12 步放大看一段：tracer 把段里的 kernel 原样交回，没有改动。

## 第 12 步 · 放大一段：silu 和 mul 之间的往返

> **一句话：** 一段里，silu 写出的中间结果先写进 HBM，mul 马上又读回来；分段 graph 去掉了 CPU 的启动，这些往返还在。

### 图上是什么

- 左边虚线框 `CPU · 在睡`：整条链都在一次 replay 里（第 7 步）。
- 橙框 `GPU`，里面一排 4 个 kernel：深色 `gate·up`、蓝色 `silu`、蓝色 `mul`、深色 `down`。
- 每个 kernel 两根蓝色箭头：向上是从 HBM 读，向下是写回 HBM。
- 底部灰条 `HBM`：GPU 自己的 80 GB，权重和 KV cache 也在里面。
- 红色虚线框住 `silu` 和 `mul`。
- 说明行：4 个 kernel、8 趟；kernel 一结束寄存器就清空；×32 层。最后一行是给第 13 章的问题。

### 几个名词

- **HBM**：GPU 板上的显存，第 4 章第 2 步每步读 16 GB 权重的地方。
- **SM**：H100 上 132 个处理单元之一（`src/numbers.ts` 的 `SMS`）。kernel 的算术在 SM 的寄存器里做，寄存器很快但只在一个 kernel 运行期间存在。
- **gate·up 拆开**：第 5 步的一行 `silu` 在这里是两个 kernel：先对 gate·up 输出的 gate 那一半做 silu，再乘以 up 那一半（`mul`）。

### 公式

silu 每一步写出、mul 再读回的字节数：

$$
M_{\text{silu}} = n \cdot d_{\text{ff}} \cdot b
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n$ | 这一步的 token 数 | 56 | 第 4 步的 batch |
| $d_{\text{ff}}$ | MLP 中间层宽度 | 14,336 | 第 5 步，`D_FF` |
| $b$ | bf16 每个数的字节数 | 2 B | 第 4 章第 2 步，`BYTES` |
| $M_{\text{silu}}$ | 一层里 silu 写出的字节数 | | 本步 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| 每个 token | 14,336 × 2 B | 28,672 B = 28 KB |
| 56 个 token | 56 × 28,672 B | 1.6 MB |
| 趟数 | 4 个 kernel × (读 + 写) | 8 |

这 1.6 MB 每层都写一次、读一次，共 32 层。matmul 那两个 kernel 必须读 HBM，因为权重在那里；silu 和 mul 读写 HBM，只是因为它们是两个独立的 kernel，中间结果没法留在寄存器里。

### 接下来

第 13 章问：只有 mul 读 silu 写的东西，而且马上就读，为什么它们是两个 kernel。
