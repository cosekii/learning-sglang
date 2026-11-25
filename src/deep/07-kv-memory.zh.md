## 第 1 步 · 卡上还剩多少地方给 KV cache

> **一句话：** 80 GB 显存减去 16 GB 权重，剩下 64 GB 是 KV cache 能用的全部；8 个运行中的 request 已占 31 GB，还空 33 GB。

### 图上是什么

- 白色长条：一块 H100 的 80 GB HBM（显存）。
- 左端蓝色段「权重 16 GB」：Llama-3-8B 的权重，每步读一遍（第 4 章第 2 步）。
- 紧跟着 8 个青色块：8 个运行中的 request 各自的 KV cache，宽度按各自的上下文长度。够宽的 4 块标了长度（36k、48k、32k、40k），另外 4 块（24k、12k、20k、16k）太窄，没写字。
- 下方黑色括号「KV cache 的空间 · 64 GB」：权重之后的全部。
- 上方青色括号「已用 · 31 GB，8 个 request」，橙色括号「当前空闲 · 33 GB」。
- 一行说明：每个运行中的 request 每步增长 128 KB；空闲部分用来接纳新 request。
- 底部灰色脚注：SGLang 实际给池子的约 55 GB（下面「为什么」一节）。

### 公式

$$
M_{\text{room}} = M_{\text{HBM}} - M_W,\qquad
M_{\text{seq}}(c) = c \times m_{kv}
$$

$$
M_{\text{used}} = \sum_{r} M_{\text{seq}}(c_r),\qquad
M_{\text{empty}} = M_{\text{room}} - M_{\text{used}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $M_{\text{HBM}}$ | 一块 H100 的显存 | 80 GB | `src/numbers.ts` 的 `HBM_GB` |
| $M_W$ | 权重字节数 | 16 GB | 第 4 章第 2 步；`W_GB` |
| $M_{\text{room}}$ | 权重之外、KV cache 能用的空间 | | 本步 |
| $m_{kv}$ | 一个 token 在全部层的 k、v | 128 KB | 第 3 章第 9 步；`KB_PER_TOKEN` |
| $c$ | 一个 request 的上下文长度（token 数） | | 第 4 章第 6 步 |
| $M_{\text{seq}}(c)$ | 一个上下文为 $c$ 的 request 的 cache | | 本步 |
| $c_r$ | 第 $r$ 个运行中 request 的上下文 | 图上 8 个 | 本步 |
| $M_{\text{used}}, M_{\text{empty}}$ | 已用、空闲 | | 本步 |

单位：128 KB 按 1 KB = 1,024 B 算（131,072 B），GB 按 10⁹ B 算，和组件一致。

### 代入图上的数

| 量 | 计算 | 结果 | 图上 |
|---|---|---|---|
| $M_{\text{room}}$ | 80 − 16 | 64 GB | 64 GB |
| 8 个 request 的上下文合计 | 24 + 36 + 12 + 48 + 20 + 32 + 40 + 16 | 228k token | |
| $M_{\text{used}}$ | 228 × 1,024 × 131,072 B | 30.6 GB | 31 GB |
| $M_{\text{empty}}$ | 64 − 30.6 | 33.4 GB | 33 GB |
| 每步增长 | 8 × 128 KB | 1 MB | |

每个 decode 步，每个运行中的 request 多一个 token，cache 多 128 KB。所以就算没有新来者，空闲部分也在一步步缩小。

### 为什么 SGLang 的池子约 55 GB

- SGLang 用 `--mem-fraction-static`（记作 $f$）规定「权重 + KV cache 池」最多占显存的比例，其余留给计算时的中间结果（activations）和 CUDA graph（第 11 章）。
- $f$ 不设时由 SGLang 按显存估算：一张 80 GB 的卡至少留 10 GB（GiB），chunk 大小 8,192 时留得更多，得到约 0.83。
- 图上的 80 GB 是标称值；这张卡实际约 79.6 GiB ≈ 85.5 GB（10⁹ B）。所以池子 ≈ 0.83 × 85.5 − 16 ≈ 55 GB。用标称值算 0.83 × 80 − 16 只有 50 GB，差别来自 GiB 和 GB。
- 图上省略了 $f$，按 64 GB 讲，本章的结论不受影响。

### 接下来

第 2 步问：这 64 GB 能装多少个 request。

## 第 2 步 · 能装多少个 request

> **一句话：** 每个 request 都是同样的上下文长度时，64 GB 在 2k 时装 238 个、4k 时 119 个、8k 时 59 个，都低于算力能撑的约 300 个。

### 图上是什么

- 三根和第 1 步一样的长条，各对应一种上下文长度：2k、4k、8k。每根左端蓝色是权重。
- 每根条上一排青色细块，一块是一个 request；行标题写出每个 request 的大小（268 MB、537 MB、1,074 MB）。
- 每根条右下方：「238 个 request 装得下」「119 个」「59 个」。
- 下方两行说明：第 5 章第 4 步的最佳点是 300 个 request 同时 decode；即使上下文短到 2k，这张卡也只装得下 238 个。
- 底部脚注同第 1 步。

### 公式

$$
B_{\max}(c) = \left\lfloor \frac{M_{\text{room}}}{M_{\text{seq}}(c)} \right\rfloor
= \left\lfloor \frac{M_{\text{HBM}} - M_W}{c \times m_{kv}} \right\rfloor
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $M_{\text{room}}$ | 64 GB | 第 1 步 |
| $M_{\text{seq}}(c)$ | 一个 request 的 cache，$c \times m_{kv}$ | 第 1 步 |
| $B_{\max}(c)$ | 能同时放下的 request 数，也就是 decode batch 的上限 | 本步；$B$ 见第 5 章第 1 步 |
| $\lfloor\ \rfloor$ | 向下取整：放不下半个 request | |

### 代入图上的数

| $c$ | $M_{\text{seq}}(c)$ | $64 \div M_{\text{seq}}$ | $B_{\max}$ |
|---|---|---|---|
| 2,048 | 2,048 × 131,072 B = 268 MB | 238.4 | **238** |
| 4,096 | 537 MB | 119.2 | **119** |
| 8,192 | 1,074 MB ≈ 1 GB | 59.6 | **59** |

上下文翻倍，每个 request 的 cache 翻倍，能装的个数减半。

### 300 从哪来

第 4 章第 8 步的分界点：读一遍权重 $t_{\text{mem}} = 16 \div 3.35 = 4.78$ ms，一个 token 的计算 $t_{\text{comp}}(1) = 16\ \text{GFLOP} \div 989\ \text{TFLOP/s} = 0.0162$ ms，两者之比 ≈ 295，取整为 300。batch 里的 token 少于它时，一步的耗时都是那一次权重读取（第 5 章第 4 步）。

2k 时只能装 238 个，到不了 300：batch 大小被内存卡住，而不是被算力卡住。

### 接下来

所以这 64 GB 不能浪费。第 3 步看最直接的分配方法浪费了多少。

## 第 3 步 · 朴素做法：按最大长度预留一整块

> **一句话：** 给每个 request 预先留一整块 8k token 的连续内存，平均 64% 从未写入；request 结束后留下的洞又太小，新来者放不进去。

### 图上是什么

- 上排行标题：给每个 request 预留最大长度 · 8k token = 1 GB。
- 上排 5 个块（req 1–5），每块是一个 request 的预留：
  - 实心青色：已经写入的部分；
  - 斜线青色：预留了、还没写的部分。
  - 块下标签：已用 2.8k、4.8k、1.6k、4.0k、1.2k（都是 / 8k）。
- 上排图例：斜线 = 预留却从未写入，占 cache 预算的 64%。
- 下排「一段时间后」：一条内存，青色是仍在运行的块，白色虚线是结束的 request 留下的洞，标着 0.4、0.6、0.3、0.2 GB。下排和上排比例尺不同。
- 下排下方红色虚线框「1 GB」和说明：新 request 需要一整块 1 GB；空闲 1.5 GB，没有足够大的洞。这就是碎片。

### 公式

$$
\text{浪费比例} = 1 - \frac{1}{N}\sum_{r=1}^{N} u_r
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 上排的 request 数，5 | 本步 |
| $u_r$ | 第 $r$ 个 request 已写入的部分占它预留的比例 | 本步 |
| 预留大小 | $M_{\text{seq}}(8{,}192) = 1{,}074$ MB ≈ 1 GB | 第 2 步 |

### 代入图上的数

| request | $u_r$ | 已用 = $u_r$ × 8k |
|---|---|---|
| req 1 | 0.35 | 2.8k |
| req 2 | 0.60 | 4.8k |
| req 3 | 0.20 | 1.6k |
| req 4 | 0.50 | 4.0k |
| req 5 | 0.15 | 1.2k |

平均 $u = (0.35 + 0.6 + 0.2 + 0.5 + 0.15) \div 5 = 0.36$，浪费比例 $= 1 - 0.36 = 64\%$。

下排：洞合计 0.4 + 0.6 + 0.3 + 0.2 = 1.5 GB，比新来者要的 1 GB 多；但最大的洞只有 0.6 GB，所以它仍然放不进去。

### 两种浪费

- **预留了不用：** request 开始时不知道自己的回答有多长，只能按最大长度留，没写到的部分在它结束前一直占着。
- **碎片：** 空闲内存被切成互不相连的小块，总量够、单块不够。把运行中的块挪到一起能消掉洞，但要在使用中拷贝几 GB 数据。

### 接下来

第 4 步换一种分法：不再要求一个 request 的 cache 是连续的一整块。

## 第 4 步 · Paging：切成固定大小的 page

> **一句话：** 把 64 GB 切成等大的 page；新来的 req 6 要 5 个 page，就从任意空闲处各取一个，页号按顺序记进它的页表。

### 图上是什么

- 行标题：64 GB ÷ 128 KB ≈ 49 万个 page · 画出 120 个。
- 20 列 × 6 行的网格，每格一个 page。彩色格属于 req 1–5（右边图例给出颜色），白色虚线格是空闲。
- 动画分四段：
  1. 「req 6 到达 · 需要 5 个 page」，先显示成一整块粉色，即第 3 步那种分法要的形状；
  2. 拆成 5 个 page，旁边写「拆成 5 个 page，不是一整块」；
  3. 5 个 page 各自飞进网格里的空闲格，「任取 5 个空闲 page，位置不限」；
  4. 中文主图只保留 `5 token ÷ 每页 1 token = 5 page`，把注意力放在「固定小格、任取空格」这一件事。页表和页号公式留到第 6 步中文主图与本节下文；英文主图仍在底部显示页表。

### 页号怎么数

从左上角起逐行编号，第一行是 0–19，第二行 20–39，依此类推：

$$
\text{页号} = 20 \times \text{行} + \text{列}\qquad(\text{行、列都从 0 数})
$$

| 页号 | 行 | 列 |
|---|---|---|
| 13 | 0 | 13 |
| 35 | 1 | 15 |
| 60 | 3 | 0 |
| 82 | 4 | 2 |
| 104 | 5 | 4 |

### 符号和数字从哪来

| 符号或数 | 是什么 | 从哪来 |
|---|---|---|
| 页号 | page 在池中的编号 | 本图 |
| 行、列 | page 在网格里的位置，都从 0 数 | 本图的 20 列 × 6 行 |
| 20 | 每行的 page 数 | 本图网格 |
| $p$ | 一页装几个 token；本图 $p=1$ | 本图；SGLang 默认值的源码链接见第 6 步 |
| 64 GB | 权重之外的教学容量 | 第 1 步的 80 − 16 GB |
| 128 KB | 一个 token 在全部层的 K/V；本图一页装一个 | 第 3 章第 9 步；`src/numbers.ts` 的 `KB_PER_TOKEN` |

### 页表

- **页表**：一个 request 的 page 列表，按顺序排。第 1 项是它第一页 K/V 的位置，第 2 项是第二页，依此类推。
- attention 读 cache 时照表取：第 3 章第 6 步里 $q$ 读 $k_1, v_1, k_2, v_2, \dots$，现在变成「按表第 $i$ 项找到存 $k_i, v_i$ 的那一页」。所以 page 不必相邻。

### 代入图上的数

| 量 | 数 |
|---|---|
| 网格画出的 page | 20 × 6 = 120 |
| 64 GB 教学容量 | 64 × 10⁹ ÷ (128 × 1,024) ≈ 488,281 page（约 49 万个） |
| req 6 之前空闲 | 32 |
| req 6 取走 | 5 ÷ 1 = 5 page（5 个 token，本图每页 1 个 token） |
| req 6 之后空闲 | 32 − 5 = 27 |

### 第 3 步的两种浪费怎么处理

- **不预留：** 本图按 SGLang 默认的 $p=1$ 计算，request 每多一个 token 才多要一页，不替还没生成的 token 占地方；其他 $p$ 的换算见第 6 步。
- **没有外部碎片：** 每个空闲 page 都能给任何 request，不存在「空闲总量够、单块太小」的洞。
- **尾页仍可能浪费：** 一页装多个 token 时，最后一页可能装不满；第 6 步再算这部分。

### 接下来

第 5 步看一个 request 结束时，它的 page 怎么还回去。

## 第 5 步 · request 结束，page 回到池里

> **一句话：** req 5 结束，它的 14 个 page 就地标成空闲；不拷贝，别人的页表不变，空闲 page 从 27 个变成 41 个。

### 图上是什么

- 同一个网格，接着第 4 步（req 6 的粉色 page 已在里面）。
- 「req 5 结束 · 它的 14 个 page 回到池里」：req 5 的琥珀色格淡出，换成橙色虚线框的空闲格；右边图例里 req 5 变淡，标「· 结束」。
- 之后一行：现在有 41 个空闲 page，散落各处 · 谁也没移动。
- 底部灰色脚注：关闭 prefix caching 时是这样；SGLang 默认把已结束 request 的 page 留在 prefix cache 里，直到需要它们（第 8 章）。

### 代入图上的数

| 量 | 数 |
|---|---|
| req 5 的 page | 1, 12, 17, 28, 29, 33, 44, 45, 50, 61, 66, 77, 110, 114，共 14 个 |
| 之前空闲 | 27（第 4 步） |
| 之后空闲 | 27 + 14 = 41 |

### 释放为什么这么简单

- 释放只是把这些页号标回空闲，不搬数据。
- 其他 request 的页表只记自己的页号，它们的 page 一个都没动，所以页表不用改。
- 第 3 步里同样的事件留下固定大小的洞，只有更小的 request 才能用；这里每个空闲 page 都是完整的一份，下一个 request 可以单独拿走，散落和相邻一样好用。

### 脚注说的例外

SGLang 默认开着 prefix caching：request 结束后，它的 page 留作 cache，下次有 prompt 开头相同的 request 来时直接复用；池子不够用时才挤掉最久没用的。这一步画的是关掉它的简单情况，第 8 章再讲开着的情况。

### 接下来

第 6 步：下一个新来者从这些空闲 page 里取。

## 第 6 步 · 下一个新来者，以及 page 多大

> **一句话：** req 7 要 8 个 page，取到的恰好都是 req 5 刚还的；page 大小是一页装几个 token，本例对照 vLLM v0.10.1（CUDA）未设置时的 16 和 SGLang 默认的 1。

### 图上是什么

- 同一个网格，起点是第 5 步结束时的状态（41 个空闲）。
- 「req 7 到达 · 需要 8 个 page」，一整块深青色，拆成 8 个 page，一次一个飞进网格。
- 中文主图底部只讲页表：先定义「按顺序记页号的清单」，再列出 req 7 的 1, 17, 29, 44, 45, 61, 77, 114，最后写 attention 照表读、page 不必相邻。
- 英文主图底部用同样的 8 个 token 对照 page 大小：vLLM v0.10.1（CUDA）未设置时一页 16 格，本例装 8 格、空 8 格；SGLang 默认一页 1 格，本例用 8 页，没有空格。斜线格也在 vLLM 那一页里，不是可分给其他 request 的空闲 page。中文主图收起这项对照，页大小的公式和来源仍保留下文。
- 右边图例：req 1–7，req 5 仍标「· 结束」。手机只保留 req 7 和空闲两项，其余 request 的颜色沿用前几步。

### 代入图上的数

| 量 | 数 |
|---|---|
| req 7 取走 | 8 个，都在第 5 步释放的 14 个里 |
| 之后空闲 | 41 − 8 = 33 |

本图按 SGLang 默认的 $p=1$ 数页，所以 req 7 的 8 个 page 对应 8 个 token。attention kernel（在 GPU 上跑的一段计算程序）读 req 7 的 K/V 时，先读第 1 页，再读第 17 页，依此类推。

### page 大小与 token 的位置

page 大小 $p$ = 一页装几个 token 的 K/V。vLLM 是另一个开源大模型推理引擎，这里用它和 SGLang 对照 page 大小。$c$ 个 token 需要 $n$ 页；序号 $i$ 从 0 开始数，这个 token 所在的逻辑页号 $\ell$ 和页内偏移 $o$ 是：

$$
n=\left\lceil\frac{c}{p}\right\rceil,\qquad
\ell=\left\lfloor\frac{i}{p}\right\rfloor,\qquad
o=i\bmod p
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $p$ | 一页装几个 token | 本步英文 caption；中文深入讲解 |
| $c,n$ | request 的 token 数、所需 page 数 | 本步 |
| $i,\ell,o$ | token 序号、逻辑页号、页内偏移，均从 0 数 | 本步 |
| $m_{kv}$ | 一个 token 在全部层的 K/V，128 KB | 第 3 章第 9 步 |
| $M_{\text{room}}$ | 用来估算页数的 64 GB | 第 1 步的 80 − 16 GB 教学简化 |

物理页号 = 页表[$\ell$]，再取这一页的第 $o$ 份 K/V。比如 vLLM 的 $p=16$ 时，50 个 token 要 $\lceil50\div16\rceil=4$ 页；序号 $i=49$ 的 token 在逻辑页 $\ell=3$、页内偏移 $o=1$，也就是第 4 页的第 2 个位置，最后一页只装 2 个 token。

第 14 章第 4 步讲跨块读取怎样合并 attention 结果，第 9 步给 kernel 按表找物理页的例子；本步不展开在线 softmax。这里的页数关系与 [zero-to-sglang 第 2 部分第 7 章 §3.1–3.2、§4.1](https://github.com/datawhalechina/zero-to-sglang/blob/bcf0cd82b9d1a058e5211d56431f14efd99eaf12/course-material/ch/part2/%E7%AC%AC7%E7%AB%A0_PagedKVCache%E4%B8%8E%E6%98%BE%E5%AD%98%E7%AE%A1%E7%90%86.md) 相同。

### 一页多少字节，64 GB 多少页

$$
\text{一页的字节} = p \times m_{kv},\qquad
\text{池里的 page 数} = \frac{M_{\text{room}}}{p \times m_{kv}}
$$

| | $p$ | 一页 | 64 GB 里有多少页 |
|---|---|---|---|
| [vLLM v0.10.1 · CUDA 未设置](https://github.com/vllm-project/vllm/blob/aab549870df50edf0512f0a59b574f692f546465/vllm/platforms/cuda.py#L136-L138) | 16 | 16 × 128 KB = 2,048 KB | 约 3.05 万 |
| SGLang 默认 | 1 | 128 KB | 约 48.8 万 |

单位逐个展开：$m_{kv}=128\times1{,}024$ B $=131{,}072$ B；64 GB $=64\times10^9$ B。所以：

- vLLM：64 × 10⁹ ÷ (16 × 131,072) ≈ 30,518 页。
- SGLang：64 × 10⁹ ÷ 131,072 ≈ 488,281 页。

同样 64 GB，vLLM 的页数是 SGLang 的 $1/16$；反过来说，SGLang 的页数约是它的 16 倍。

第 1 步已经说明 SGLang 实际给池子的约 55 GB；这里的页数是用 64 GB 教学容量估算，不是实际池的精确页数。图上的 120 格只是其中一小部分。SGLang 在 CUDA 上 [`--page-size`](https://docs.sglang.io/docs/advanced_features/server_arguments) 不设时取 1，由源码 [`arg_groups/overrides.py` 的 `_page_size_default`](https://github.com/sgl-project/sglang/blob/v0.5.18/python/sglang/srt/arg_groups/overrides.py) 决定。

### 大 page 和小 page

- **page 大：** 页表短，kernel 每次能连续读一大段。
- **page 小：** request 最后一页的浪费更少。$p = 16$ 时最后一页最多空 15 个 token，即 15 × 128 KB = 1,920 KB；这种页内没装满的浪费叫**内部碎片**，$p = 1$ 时为 0。
- **page 小还有一个好处：** 第 8 章里两个 request 能共享到单个 token 的粒度。

### 接下来

第 7 步把本章合起来：接纳一个新来者要判断什么，以及一个 request 到底持有什么。

## 第 7 步 · 接纳是一次计数；request 持有的是页表

> **一句话：** 空闲 page 够这个新来者的 prompt 加上预计还要写的回答，就接纳并写页表；不够就等；运行中的 request 自己都放不下时，撤回一个。

### 图上是什么

左边是接纳流程：

- 判断框「空闲 page ≥ 所需 page？」，下面写「所需：它的 prompt，加上还没生成的回答」。
- 「是」（绿色）→「接纳：任取空闲 page，写页表」。
- 「否」（红色）→「等待：直到某个运行中的 request 结束并释放它的 page」；框里再一句：运行中的 request 没了 page，又没人结束？撤回输出最少的那个，之后重新 prefill。

右边「req 7 持有什么」：

- 一行 8 个深青色格：页号 1, 17, 29, 44, 45, 61, 77, 114，下面是序号 1–8。
- 「同样的 page 在池中的实际位置」：一个缩小的 120 格网格，req 7 的格里写着序号，灰色是别人的，白框是空闲的。
- 两行说明：attention 按顺序走列表；page 从来不需要相邻。
- 两行浅灰：同一个 page 在两个列表里 → 第 8 章；列表发给另一块 GPU → 第 28 章。
- 底部脚注：SGLang 里对应的 5 个名字（见下表）。

### SGLang 里的对应

| 图上 | SGLang | 做什么 |
|---|---|---|
| page 池 | `MHATokenToKVPool` | 存所有 page 的 K、V |
| 分配空闲 page | `TokenToKVPoolAllocator` | 记哪些 page 空闲，分出去、收回来 |
| 页表 | `req_to_token` | 每个 request 一行，第 $i$ 列是它第 $i$ 个 token 的 K/V 存在池里的位置（page 大小为 1 时就是页号） |
| 判断框 | `PrefillAdder` | 每次组 prefill batch 时做接纳检查 |
| 撤回 | `ScheduleBatch.retract_decode` | decode 放不下时退回 request |

### 「所需」具体怎么算

`PrefillAdder` 不只数这一步要写的 page，还要给回答留地方：

| 给谁留 | 留多少（token） |
|---|---|
| 新来者 | prompt 长度 + $\min(\text{max\_new\_tokens},\ 4096)$ |
| 每个运行中的 request | $\min(\text{max\_new\_tokens} - \text{已写},\ 4096) \times r$ |

- $\text{max\_new\_tokens}$：这个 request 允许生成的最多 token 数（请求参数）。
- 4,096：估算时的上限（`SGLANG_CLIP_MAX_NEW_TOKENS_ESTIMATION`）。
- $r$：预计还会真的写出来的比例。从 0.7 开始，每个没发生撤回的 decode 步减一点，600 步后降到 0.7 × 0.14 ≈ 0.1；发生撤回时按这批 request 已写的 token 数重新估一次。

这个判断是估计：回答可能比预计的长。

### 撤回

- 什么时候：运行中的 batch 下一个 decode 步要的 page 不够了（每人一个 token 都放不下）。
- 撤回谁：先按已输出 token 数排序，**输出最少的先撤**（相同时 prompt 更长的先撤）；至少留一个。
- 撤回后：释放它的 page，request 回到 waiting 列表（第 6 章第 2 步），之后重新 prefill，从头算它的 cache。

### 页表的意思

- req 7 持有的不是一块内存，而是第 6 步那 8 个页号。kernel 按表找 page，表里没有任何东西要求它们相邻。
- 如果两张页表里出现同一个页号，两个 request 就共用那份 K/V，不用拷贝：第 8 章。
- 页表是一串数，可以发给另一块 GPU，让对方照着读：第 28 章。

### 接下来

第 8 章：两个 request 的 prompt 开头相同时，让它们的页表指向同一批 page。
