## 第 1 步 · 第 12 章留下的一段

> **一句话：** 分段 graph 里的一段是两个 matmul 夹着一串小 kernel，每个 kernel 都从 HBM 读输入、把输出写回 HBM；这一章看中间那两个。

### 图上是什么

- 一排 4 个 kernel，从左到右：深色 `gate·up`、蓝色 `silu`、蓝色 `mul`、深色 `down`。
- 每个 kernel 两根蓝色箭头：向上是从 HBM 读输入，向下是把输出写回 HBM。4 个 kernel，8 趟。
- 底部灰条 `HBM`：GPU 板上的 80 GB 显存（第 12 章第 12 步）。
- 红色虚线框住 `silu` 和 `mul`，标「这两个」。
- 两行说明：matmul 必须碰内存，因为权重在那里；中间两个碰内存，只是因为被这样调用。

### 这四个 kernel 在做什么

这是一层 MLP 的后半段（第 12 章第 5 步那 11 个 kernel 里的 `gate·up`、`silu`、`down`，其中 `silu` 在这里拆成 silu 和 mul 两个）：

| kernel | 输入 | 输出 | 类型 |
|---|---|---|---|
| `gate·up` | 每个 token 的隐藏向量，4,096 个数 | gate、up 两个向量，各 14,336 个数 | matmul |
| `silu` | gate | $h = \text{silu}(\text{gate})$，14,336 个数 | pointwise |
| `mul` | $h$ 和 up | $h \times \text{up}$，14,336 个数 | pointwise |
| `down` | 14,336 个数 | 4,096 个数 | matmul |

**pointwise**：输出第 $i$ 个数只依赖输入第 $i$ 个数。**matmul**：和一个权重矩阵相乘。

### 哪些趟躲不掉

- 两个 matmul 的权重只存在 HBM 里，读权重就是第 4 章第 5 步那次 16 GB、4.8 ms 的读取的一部分。
- silu 和 mul 读写的只是它们之间传的那个值 $h$。第 2 步量它有多大。

### 接下来

第 2 步：$h$ 每 token 每层多少字节，乘到整个模型多少。

## 第 2 步 · silu 和 mul 之间的值有多大

> **一句话：** $h$ 每 token 每层 28 KB，写一次、读一次，32 层合计每 token 1.8 MB。

### 图上是什么

- 左上蓝色 `silu`，右上蓝色 `mul`，底部 `HBM`。
- 红箭头从 silu 向下「写入 28 KB」；HBM 里一个红框 `[1 × 14,336]`，就是 $h$；红箭头从 HBM 向上到 mul「读回 28 KB」。
- 「没有别人读它」。
- 两行说明：每 token 每层 56 KB 读写量，写出后约一微秒内读回；32 层合计每 token 1.8 MB。

### 公式

$$
m_h = d_{\text{ff}}\cdot b,\qquad
m_{\text{tok}} = 2\,m_h\,L
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $d_{\text{ff}}$ | MLP 中间层宽度，$h$ 的长度 | 14,336 | 第 12 章第 12 步，`D_FF` |
| $b$ | bf16 每个数的字节数 | 2 B | 第 4 章第 2 步，`BYTES` |
| $m_h$ | 一个 token 在一层里的 $h$ | 28,672 B | 本步 |
| $L$ | 层数 | 32 | 第 3 章，`LAYERS` |
| $m_{\text{tok}}$ | 一个 token 过完整个模型，$h$ 的写加读 | | 本步 |

第 12 章第 12 步的 $M_{\text{silu}} = n \cdot d_{\text{ff}} \cdot b$ 是 $n$ 个 token 的写出量；这里 $m_h$ 是它在 $n = 1$ 时的值。

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| $m_h$ | 14,336 × 2 B | 28,672 B ÷ 1,024 = 28 KB | 写入 28 KB、读回 28 KB |
| 写 + 读 | 2 × 28,672 B | 57,344 B = 56 KB | 每 token 每层 56 KB |
| $m_{\text{tok}}$ | 57,344 B × 32 | 1,835,008 B ≈ 1.8 MB | 每 token 1.8 MB |

### 接下来

第 9 步把这 1.8 MB 乘上 batch，和权重读取比。第 3 步先问：既然没别人读，$h$ 为什么要写进 HBM。

## 第 3 步 · eager 一行一行执行

> **一句话：** eager PyTorch 执行第 1 行时还没读到第 2 行，所以不知道 $h$ 马上就被用掉，只能把它写进 HBM。

### 图上是什么

- 左框「你写的代码」：三行 `h = silu(gate)`、`h = h * up`、`y = down(h)`。第 1 行高亮、有箭头；后两行灰色，标「还没读」。
- 右框「解释器知道的」：第 1 行是调用，调用必须返回；返回一个 tensor，tensor 在 HBM 里；第 2 行还没读，没人知道 $h$ 马上被用。
- 底部 `HBM`，红箭头「silu 返回 h 28 KB」，红框 `h · [1 × 14,336]`。
- 说明行：融合需要同时看到两行；执行第 1 行时，解释器只见过第 1 行。

### 三行对应第 1 步的哪个 kernel

| 行 | 代码 | kernel |
|---|---|---|
| 1 | `h = silu(gate)` | `silu`，算出第 2 步的 $h$ |
| 2 | `h = h * up` | `mul` |
| 3 | `y = down(h)` | `down` |

### 为什么一定写进 HBM

- **eager**：Python 一行一行执行，每行是一次函数调用，启动一个 kernel，返回一个 tensor。
- tensor 是 HBM 里的一块数据。kernel 结束时寄存器清空（第 12 章第 12 步），所以返回值只能放在 HBM。
- 要把 $h$ 留在寄存器里，得知道「第 2 行是唯一读者、而且马上读」。这个信息在还没执行的第 2 行里。

### 接下来

第 4 步画出两行都看得见时能写出的 kernel；第 5 步说「两行一起看」的视野从哪来。

## 第 4 步 · 融合成一个 kernel

> **一句话：** 一个 kernel 读 gate 和 up 各一次，在寄存器里算 silu 和乘法，结果写一次；算术相同，每 token 每层少 56 KB 读写。

### 图上是什么

- 左「之前」，红字「4 趟」：浅蓝色 `silu`、`mul` 两个框，各一根红色读箭头、一根红色写箭头。
- 右「之后」，绿字「2 趟」：一个绿色长框「silu · mul，已融合」，一根绿色读箭头、一根绿色写箭头；框下三行：gate 和 up 只读一次；两个运算都在寄存器里做；结果只写一次。
- 两行说明：中间值从不出芯片；算术相同、结果相同，每 token 每层少 56 KB 读写量。

图上每个 kernel 只画一读一写，表示「读 HBM」「写 HBM」两件事；下面按字节数实际数一遍。

### 代入图上的数

每 token 每层，每项 28 KB（第 2 步的 $m_h$；gate、up、结果都是 14,336 个 bf16）：

| | 读 | 写 | 合计 |
|---|---|---|---|
| 之前 · silu | gate | $h$ | 56 KB |
| 之前 · mul | $h$、up | 结果 | 84 KB |
| **之前合计** | | | **140 KB** |
| **之后 · 融合** | gate、up | 结果 | **84 KB** |
| 差 | | | 140 − 84 = **56 KB** |

差的 56 KB 正好是第 2 步 $h$ 的一写一读。

### 寄存器

- **SM**：H100 上 132 个处理单元之一（`SMS`）。**寄存器**是 SM 里做运算的小存储，kernel 结束就清空。
- 融合后，$h$ 的每个数在寄存器里算出，下一条乘法指令就在那里用掉，不进 HBM。
- 运算相同。唯一的数值差别：eager 把 $h$ 存进 HBM 时舍入成 bf16，融合的 kernel 可以在寄存器里保留更高精度。

### 接下来

第 5 步：这个 kernel 由谁来写。

## 第 5 步 · Inductor 写出 Triton kernel

> **一句话：** 第 12 章第 11 步 trace 出的 op 清单让「两行一起看」成为可能；Inductor 遍历清单，把相邻的 pointwise op 归组，每组生成一个 Triton kernel。

### 图上是什么

- 三个框，从左到右用箭头连起来：
  1. 灰「trace 出的图」：第 12 章第 11 步已有，一张 tensor 算子的扁平列表。
  2. 蓝「Inductor」：遍历列表，把碰同一行的 pointwise 算子归成组。
  3. 绿「生成的 Triton」：每组一个 kernel，启动时编译，缓存在磁盘上。
- 白框里 6 行代码：`fused_silu_mul`，两次 `tl.load`（注释「只读一次」）、一次 `tl.store`（注释「只写一次」）。
- 说明行：两次读、一次写；`g * sigmoid(g)` 从没离开算它的那个寄存器。
- 脚注：`SGLang: --cuda-graph-tc-compiler inductor`，第 12 章第 11 步的默认是 eager：trace、切开，到此为止。

### 几个名词

- **torch.compile**：PyTorch 的编译器，分两半。前端 **Dynamo** 负责 trace（第 12 章第 11 步）；后端 **Inductor** 拿 trace 出的图生成代码。
- **Triton**：一种写法像 Python 的 GPU 编程语言，编译成 GPU 代码。

### 逐行读代码

| 代码 | 意思 |
|---|---|
| `@triton.jit` | 这是一个 Triton kernel |
| `i = tl.program_id(0) * BLOCK + tl.arange(0, BLOCK)` | kernel 同时跑很多份；`program_id(0)` 是第几份，`i` 是这一份负责的 `BLOCK` 个连续位置。所有份合起来覆盖 14,336 个位置 |
| `g = tl.load(gate + i)` | 从 HBM 读 gate 进寄存器（第 4 步表里的一次读） |
| `u = tl.load(up + i)` | 读 up（另一次读） |
| `tl.store(out + i, g * tl.sigmoid(g) * u)` | 算 silu 再乘 up，写一次 |

$$
\text{silu}(x) = x\cdot\sigma(x),\qquad \sigma(x) = \frac{1}{1+e^{-x}}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $x$ | gate 里的一个数 | 第 1 步 |
| $\sigma(x)$ | sigmoid 函数，代码里的 `tl.sigmoid` | 本步 |

所以 `g * tl.sigmoid(g)` 就是第 3 步第 1 行，`* u` 就是第 2 行。

### 在 SGLang 里

脚注里的 `--cuda-graph-tc-compiler inductor` 属于第 12 章第 11 步说的 `tc_piecewise` 路径。当前 SGLang main 已删掉它：配置里出现 `tc_compiler` 会报错「tc_compiler was removed with tc_piecewise」（`model_executor/cuda_graph_config.py`）。现在打开 Inductor 的是 `--enable-torch-compile`，它只编译 decode 的 CUDA graph 里不超过 `--torch-compile-max-bs` 的 batch 大小（`base_cuda_graph_runner.py`）。Inductor 编译结果缓存在 `TORCHINDUCTOR_CACHE_DIR`，默认 `/tmp/torchinductor_<用户名>`。

### 接下来

第 6 步：一层的 11 个 kernel，Inductor 能融合哪些。

## 第 6 步 · 什么能融合，什么不能

> **一句话：** pointwise 链和归约链各融成一个新写的 kernel；matmul 不重写，从库里挑；attention 保持 eager。一层从 11 个 kernel 变成 8 个。

### 图上是什么

- 上一行 11 个方块：第 12 章第 5 步的一层，`norm qkv rope attn o add norm gate·up silu down add`。蓝色 pointwise / 归约，深色 matmul，红色 attn。这里的 `silu` 代表第 4 步的 silu·mul。
- 下一行 8 个方块：Inductor 处理后的结果，绿色括号把合成一个的 kernel 连起来：`qkv·rope`、`o·add`、`down·add`。
- 三行定义：pointwise、归约、matmul。
- 图例：绿色「新写」3 个，深色「挑选」4 个，红色「保持 eager」1 个。
- 说明行：消失的 3 个 kernel 都是 matmul 的 pointwise 邻居。

### 三类算子

| 类 | 规则 | 例子 | 融合方式 |
|---|---|---|---|
| pointwise | `out[i]` 只依赖 `in[i]` | silu、mul、add、rope | 一串对数据只走一遍，一个 kernel |
| 归约 | 一行变成一个数 | norm 的平方均值 | 也只走一遍，加一个累加器 |
| matmul | `out[i, j]` 需要 A 的第 i 整行和 B 的第 j 整列 | qkv、o、gate·up、down | 不重写，从库里挑 |

**norm**（RMSNorm）：先算一个 token 4,096 个数的平方均值，再把每个数除以它的平方根。**rope**：按位置旋转 q、k（第 2 章第 11 步）。

### 代入图上的数

| 下一行 | 来自上一行 | 怎么来 |
|---|---|---|
| `norm` | norm | 新写 |
| `qkv·rope` | qkv + rope | 挑选，rope 折进去 |
| `attn` | attn | 保持 eager（第 12 章第 6 步的接缝） |
| `o·add` | o + add | 挑选，add 折进去 |
| `norm` | norm | 新写 |
| `gate·up` | gate·up | 挑选 |
| `silu` | silu·mul | 新写（第 4 步） |
| `down·add` | down + add | 挑选，add 折进去 |

新写 3 + 挑选 4 + eager 1 = 8；三次折叠：11 − 3 = 8。

**挑选**：Inductor 从 cuBLAS（NVIDIA 的矩阵库）、Triton 模板、CUTLASS（NVIDIA 的 matmul 模板库）中选一个实现，第 7、8 步讲怎么选。

### 图上的分组是一种示意

把 pointwise 邻居折进 matmul 的最后一段（epilogue），只有挑中的是 Triton 模板这类 Inductor 自己生成的 matmul 时才做得到；挑中 cuBLAS 时，matmul 是外部调用，不能带 epilogue。那种情况下 `add` 通常和后面的 `norm` 融成一个 kernel。哪种情况都是 8 个左右，结论不变。

### 接下来

第 7 步先讲 tile，第 8 步讲 matmul 的实现怎么挑。

## 第 7 步 · matmul 的 tile

> **一句话：** matmul 的输出 C 切成 tile，一个 thread block 算一块；block 完整读入 tile 涉及的 A 行和 B 列，tile 越大，每次读入产出越多。

### 图上是什么

- 标题：`C = A × B · [8 × 12] = [8 × 6] × [6 × 12]`。
- 两种切法并排，每种画 A（左下）、B（上）、C（右下），一格一个数。蓝色是一个 tile 和它读入的 A 行、B 列；C 上的粗线是 tile 的边界。
- 左：`BLOCK 4 × 4 · 6 个 tile`，读入 48 格得到 16 个输出，每个输出 3.0 格；整个 C 288 次读入。
- 右：`BLOCK 8 × 6 · 2 个 tile`，读入 84 格得到 48 个输出，每个输出 1.8 格；整个 C 168 次读入。
- 三行说明：block 完整读入对应的 A 行和 B 列；8 × 6 读得少但每个 block 持 48 个累加器而不是 16 个；只产生 2 个 block，H100 有 132 个 SM。

### 几个名词

- **tile**：C 里由一个 thread block 计算的一块矩形。
- **thread block**：在一个 SM 上运行的一组 GPU 线程。
- **累加器**：每个输出在寄存器（第 4 步）里存的一个累加和。

### 公式

C 是 $M_C \times N_C$，内维 $K$，tile 是 $m_t \times n_t$：

$$
\begin{aligned}
\text{tile 数} &= \frac{M_C}{m_t}\cdot\frac{N_C}{n_t}\\
\text{每个 block 读入} &= (m_t + n_t)\,K\\
\text{整个 C 读入} &= \text{tile 数}\times(m_t + n_t)\,K
\end{aligned}
$$

| 符号 | 是什么 | 图上 |
|---|---|---|
| $M_C, N_C$ | C 的行数、列数 | 8、12 |
| $K$ | A 的列数 = B 的行数，每行每列的长度 | 6 |
| $m_t, n_t$ | tile 的行数、列数 | 4 × 4 或 8 × 6 |

$m_t$ 行 A 各 $K$ 个数，$n_t$ 列 B 各 $K$ 个数，所以一个 block 读 $(m_t + n_t)K$ 个数；它算 $m_t n_t$ 个输出。

### 代入图上的数

| | 4 × 4 | 8 × 6 |
|---|---|---|
| tile 数 | (8 ÷ 4) × (12 ÷ 4) = 6 | (8 ÷ 8) × (12 ÷ 6) = 2 |
| 每个 block 读入 | (4 + 4) × 6 = 48 | (8 + 6) × 6 = 84 |
| 每个 block 输出 / 累加器 | 16 | 48 |
| 每个输出读入 | 48 ÷ 16 = 3.0 | 84 ÷ 48 = 1.75，图上 1.8 |
| 整个 C 读入 | 6 × 48 = 288 | 2 × 84 = 168 |

### 取舍

大 tile 总读入少，但每个 block 要更多寄存器放累加器，而且 block 少：2 个 block 只能用上 132 个 SM 里的 2 个。最好的形状取决于 C 的形状。

### 接下来

第 8 步：真实 decode matmul 上的这个取舍。

## 第 8 步 · batch 16 时，方 tile 大部分是补零

> **一句话：** batch 16 的 decode matmul，C 只有 16 行；128 × 128 的 tile 有 7/8 是补零，而且只有 112 个；16 × 64 不补零、有 224 个。所以在真实 C 上实测几种形状，留最快的。

### 图上是什么

- 蓝色细条：C 的前 1,024 列，16 行，每行一个像素，「… 到第 14,336 列」。
- 红色虚线方框 `BLOCK 128 × 128`，下面浅红色是补零的部分；右边三行：128 行里只有 16 行是真的；7/8 的算力花在零上；14,336 / 128 = 112 个 tile，132 个 SM 有 20 个闲着。
- 绿框 `BLOCK 16 × 64`：覆盖的每一行都是真的；14,336 / 64 = 224 个 tile，每个 SM 都忙。
- 下方 5 根条：候选 tile 形状在这个 C 上的耗时，相对 128 × 128；最短的绿条 `BLOCK 16×64` 标「留这个」。
- 说明行：库的默认 tile 为方形 C 调优；不到 128 行时大部分是补零，矮宽的 tile 胜出。

### C 的形状

以 gate·up 里 gate 那一半为例（第 12 章第 5 步：gate 和 up 拼成 28,672 宽）：

| 矩阵 | 形状 | 是什么 |
|---|---|---|
| A | [16 × 4,096] | 16 个 token 的隐藏向量；decode 每个 request 一步一个 token，所以行数 = batch |
| B | [4,096 × 14,336] | gate 的权重 |
| C | [16 × 14,336] | 输出 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| 128 × 128 补零行 | 128 − 16 | 112 |
| 补零的算力占比 | 112 ÷ 128 | 7/8 |
| 128 × 128 的 tile 数 | 14,336 ÷ 128 | 112（只有一行 tile） |
| 闲着的 SM | 132 − 112 | 20 |
| 16 × 64 的 tile 数 | 14,336 ÷ 64 | 224，多于 132 |

### 实测（autotune）

| 候选 | 相对耗时 |
|---|---|
| 128×128 | 100% |
| 64×128 | 82% |
| 32×128 | 66% |
| 16×256 | 55% |
| 16×64 | **47%** |

这些条是本章为说明 autotune 怎样排序而画的，不是测量值。**autotune**：在这个形状的 C 上把每个候选实际跑一遍，留最快的。最快的形状取决于 C 的形状，所以每个 batch 大小各测一次（第 10 步）。

### 接下来

第 9 步：融合 silu·mul 一共值多少。

## 第 9 步 · 值多少：140 µs，4.8 ms 的 3%

> **一句话：** batch 256 的 decode 步，融合少搬 470 MB，是 16 GB 权重读取的约 3%，约合 140 µs；第 11、12 章去掉的启动开销是它的约 30 倍。

### 图上是什么

两行条，同一步先按字节、再按时间画。循环两个阶段：先是红色的一块（融合去掉的部分），再是这块消失、只剩红色虚线框。

- **字节**：橙色「权重 · 16.0 GB」，蓝色「激活 · 1.4 GB」，右端合计 17.4 GB（第二阶段 16.9 GB）；红块「融合去掉这 470 MB · 权重读取的 3%」。
- 中间一行：这一步受内存带宽限制，所以字节 ÷ HBM 带宽 3.35 TB/s = 时间。
- **时间**：深色「GPU · 4.8 ms 读权重」，蓝色虚线框「CPU · 4.2 ms 发射 · 第 11、12 章后已消失」，右端 9.0 ms；红块「融合省掉 140 µs」，第二阶段「GPU 的 4.8 ms 变成 4.6 ms」。
- 两行说明：470 MB ÷ 3.35 TB/s = 140 µs，字节和时间都占 3%；第 11、12 章省掉 4.2 ms，这里省掉的约小 30 倍。
- 标题注明：第 4 章第 6 步的 KV cache 读取未画出。

### 公式

$$
M_{\text{save}} = B\,m_{\text{tok}},\qquad
t_{\text{save}} = \frac{M_{\text{save}}}{BW},\qquad
t_{\text{mem}} = \frac{M_W}{BW}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $B$ | batch 大小，decode 时也是这一步的 token 数 | 256 | 第 5 章第 1 步 |
| $m_{\text{tok}}$ | 每 token 的 $h$ 写加读 | 1,835,008 B | 第 2 步 |
| $M_{\text{save}}$ | 融合去掉的字节 | | 本步 |
| $BW$ | HBM 带宽 | 3.35 TB/s | 第 4 章第 5 步，`BW` |
| $M_W$ | 权重字节数 | 16 GB | 第 4 章第 2 步，`W_GB` |
| $t_{\text{mem}}$ | 读一遍权重 | 4.78 ms | 第 4 章第 5 步 |
| $t_{\text{save}}$ | 融合省下的时间 | | 本步 |
| $T_{\text{cpu}}$ | eager 一步的启动时间 | 9.0 ms | 第 11 章第 4 步 |

「受内存带宽限制」（memory-bound）：这一步的用时由搬的字节决定（第 4 章第 5 步），所以时间 = 字节 ÷ $BW$。

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| $M_{\text{save}}$ | 1,835,008 B × 256 | 469.8 MB | 470 MB |
| 占权重读取 | 469.8 MB ÷ 16,000 MB | 2.94% | 3% |
| 激活 | 470 MB × 3 | 1.4 GB | 1.4 GB |
| 合计 | 16 + 1.4 | 17.4 GB | 17.4 GB |
| 去掉后 | 17.41 − 0.47 | 16.9 GB | 16.9 GB |
| $t_{\text{mem}}$ | 16 GB ÷ 3.35 TB/s | 4.78 ms | 4.8 ms |
| $t_{\text{save}}$ | 0.4698 GB ÷ 3.35 TB/s | 0.140 ms | 140 µs |
| 融合后 GPU | 4.78 − 0.14 | 4.64 ms | 4.6 ms |
| 已去掉的启动 | $T_{\text{cpu}} - t_{\text{mem}}$ = 9.0 − 4.78 | 4.22 ms | 4.2 ms |
| 倍数 | 4.22 ÷ 0.140 | 30 | 约小 30 倍 |

激活 1.4 GB 是本章的假设：按 silu 读写量的约 3 倍取，图上只用它画出权重之外的那段。

### 接下来

第 10 步：这些融合和 autotune 在启动时要付什么代价。

## 第 10 步 · 启动时多出的工作

> **一句话：** 每个捕获的 batch 大小，启动时都要编译 8 个融合 kernel、实测 4 个 matmul 的 5 种 tile 形状，最后录制一次；一层编一次，32 层共用。

### 图上是什么

- 网格：每行一个捕获形状，`batch 1`、`2`、`4`、`8`、`16`；每格是启动时做的一件事，从左到右按顺序。
  - 蓝色「编译」：8 格，8 个融合 kernel。
  - 深色「实测」：20 格，4 个 matmul × 5 种 tile 形状，仅 max-autotune。
  - 橙色「录制」：1 格，第 11 章第 6 步。
- 每列下的合计：= 40、= 100、= 5。
- 「不是 ×32 层：每层相同，每个形状编译一次就够所有层用」。
- `--torch-compile-max-bs 16`：设定这些行，更大的 batch 不走这些。`max-autotune`：打开实测那一列，默认关闭，该列为空。
- 最下一行：SGLang 实测 90 s（235B MoE）、158 s（GLM-5.2），都在第一个 request 之前。

### 代入图上的数

| 列 | 每行格数 | 来源 | × 5 行 |
|---|---|---|---|
| 编译 | 8 | 第 6 步下一行的 8 个 kernel | 40 |
| 实测 | 4 × 5 = 20 | 第 6 步挑选的 4 个 matmul × 第 8 步的 5 个候选 | 100 |
| 录制 | 1 | 第 11 章第 6 步 | 5 |

- **不乘 32**：每层跑同样的 kernel、只是权重不同，编译出的 kernel 对 32 层都能用。
- **录制放最后**：录制冻结的是录制时已有的 kernel（第 11 章第 6 步）；先录再编译，冻结的就是没融合的那些。

### 在 SGLang 里

和图上有三处不同，以当前 SGLang main 为准：

- **行**：`--torch-compile-max-bs` 默认 32。编译的 batch 大小是 decode 梯子里不超过它的那些（`base_cuda_graph_runner.py` 的 `compile_bs`）。图上的 1、2、4、8、16 用的是第 11 章第 10 步的示意梯子；SGLang 默认梯子以 `[1, 2, 4, 8, 12]` 开头，设 16 会得到 1、2、4、8、12、16 六行。
- **实测列**：PyTorch 自己的默认模式不做实测，但 SGLang 的 `--enable-torch-compile` 默认用 `max-autotune-no-cudagraphs` 模式（`compilation/torch_compile_decoration.py`，可用环境变量 `SGLANG_TORCH_COMPILE_MODE` 改）。也就是说，SGLang 默认就会跑实测这一列。
- **90 s 和 158 s**：这一轮在 SGLang 仓库里没有找到这两个数的出处。

### 接下来

第 11 步：录制、切开、融合三件事做完，一层里还剩哪个 kernel 没动过。

## 第 11 步 · 只有 attention 没动过

> **一句话：** 一层 11 个 kernel 里，除 attention 外都已融合或挑选、并录进 graph；attention 被切出后一直 eager 运行，第 11 到 13 章都没改它。

### 图上是什么

- 一行 11 个方块，按处理方式上色：绿色融合进 Inductor 的 kernel（`norm rope add norm silu add`），深色从库里挑的 matmul（`qkv o gate·up down`），红色 `attn`。
- 红箭头指向 attn：「仍是 eager，仍未动过」。
- 两行胶囊：
  - 「你遇到它们的顺序」：录制（第 11 章）→ 切开（第 12 章）→ 融合（第 13 章）。
  - 「它们发生的顺序」：切开 → 融合 → 录制。
- 两行说明：录制前先切开，attention 无法被捕获；录制前先融合，录制会冻结录制时已有的 kernel。
- 最后一行：Attention 在这三步之外。那 attention kernel 本身还能做什么？

### 三章各做了什么

| 操作 | 章 | 对象 | 结果 |
|---|---|---|---|
| 录制 | 第 11 章第 6、7 步 | 整段 kernel 的启动 | CPU 不再逐个启动 |
| 切开 | 第 12 章第 6 步 | 每个 attention 处 | 段与段之间 eager 跑 attention |
| 融合 | 本章第 4–6 步 | pointwise / 归约链 | 少读写 HBM，少几个 kernel |

### 为什么启动时是这个顺序

1. **先切开**：attention 的工作随序列边界变化（第 12 章第 4 步），不能录进 graph。
2. **再融合**：第 10 步说过，录制冻结当时已有的 kernel。
3. **最后录制**。

### 接下来

attention 是三章都没碰的那个 kernel。第 14 章看 attention kernel 本身：它读什么、有哪些写法。
