## 第 1 步 · attention 每步要读多少

> **一句话：** 一个 decode 步里，attention 要把每个 request 的整个 KV cache 读一遍；batch 256 时，context 约 480 token，这份读取就超过 16 GB 权重。

### 图上是什么

- 五组柱子，每组是 batch 256 下某个 context 长度的一个 decode 步：256、512、1k、2k、4k token。
- 橙色柱：权重读取，每组都是 16 GB；橙色虚线是它的耗时 4.8 ms。
- 红色柱：KV cache 读取，标着 GB 数；柱下标「读取需 … ms」。
- 标题行：`cache 读取 = batch × context × 128 KB`。

### 公式

$$
\begin{gathered}
M_{KV} = B \cdot c \cdot 128\ \text{KB}\\[4pt]
t_{KV} = \frac{M_{KV}}{BW}\\[4pt]
c^{*} = \frac{M_W}{B \cdot 128\ \text{KB}}
\end{gathered}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $B$ | batch，同时在跑的 request 数 | 256 | 第 13 章第 9 步的 batch |
| $c$ | context 长度：每个 request 的 KV cache 里已有的 token 数 | 横轴 | 第 4 章第 6 步 |
| 128 KB | 一个 token 在 32 层里的 k 和 v | 131,072 B | 第 3 章第 9 步 |
| $M_{KV}$ | 这一步要读的 cache 字节数 | 红柱 | 第 4 章第 6 步的 $M_{KV}$ 乘上 $B$ |
| $M_W$ | 权重字节数 | 16 GB | 第 4 章第 2 步 |
| $BW$ | HBM 带宽 | 3.35 TB/s | `src/numbers.ts` 的 `BW` |
| $c^{*}$ | 红柱和橙柱一样高时的 context | | 本步 |

128 KB 的来历：每层 8 个 K/V head × 128 个数 × 2（k 和 v）× 2 B = 4,096 B，再 × 32 层 = 131,072 B。

### 代入图上的数

| $c$ | $M_{KV}$ | $t_{KV}$ |
|---|---|---|
| 256 | 256 × 256 × 131,072 B = 8.6 GB | 2.6 ms |
| 512 | 17 GB | 5.1 ms |
| 1,024 | 34 GB | 10 ms |
| 2,048 | 69 GB | 21 ms |
| 4,096 | 137 GB | 41 ms |

$c^{*} = 16 \times 10^9 \div (256 \times 131{,}072) \approx 477$，caption 取整为 480。超过它，attention 的读取就是这一步的大头。

### 为什么这一章讲 attention

第 11–13 章把层里除 attention 之外的部分录成 graph、切段、融合（第 13 章第 11 步那个红框里的 `attn` 没动过）。这一章讲做这份读取的 kernel。

### 接下来

第 2 步先看 attention 最直白的写法：三个 kernel。

## 第 2 步 · 写成三个 kernel

> **一句话：** 直白的 attention 是三个 kernel：打分得 S，softmax 得 P，P 乘 V 得 out；P 的每个元素要用到 S 一整行，所以 S 必须先完整写进 HBM。

### 图上是什么

- 上排三个框是三个 kernel：深色 `S = Q · Kᵀ`、蓝色 `P = softmax(S)`、深色 `out = P · V`。红箭头向上是从 HBM 读，向下是写回（最后一根写 out 的是绿色）。
- 下面的大框 `HBM`：Q、K、S、P、V、out，按 n = 6 画。S 和 P 是 6 × 6 的格子，Q、K、V、out 是 n × 128 的竖条。
- 红色是 token $i$ 的输出会碰到的部分：Q 的第 $i$ 行、整个 K、S 和 P 的第 $i$ 行、整个 V、out 的第 $i$ 行。P 的第 $i$ 行里有一格加了框，标 $P_{ij}$。
- 左下三条公式（KaTeX），右边各配说明。

### 公式

$$
\begin{gathered}
S_{ij} = q_i \cdot k_j\\[4pt]
P_{ij} = \frac{e^{\,S_{ij} - m_i}}{\sum_k e^{\,S_{ik} - m_i}}\\[4pt]
m_i = \max_k S_{ik}\\[4pt]
\text{out}_i = \sum_j P_{ij}\, v_j
\end{gathered}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n$ | 这次 prefill 的 token 数 | 图上 6 | 本步 |
| $q_i, k_j, v_j$ | token $i$ 的 query、token $j$ 的 key 和 value（一个 head 里） | 各 128 个数 | 第 2 章第 3 步 |
| Q、K、V | 把 $n$ 个 $q$、$k$、$v$ 按行摞起来 | 各 $n \times 128$ | 本步 |
| $S_{ij}$ | token $i$ 对 token $j$ 的分数 | S 是 $n \times n$ | 第 2 章第 4 步的 $\text{score}_j$，换成每个 $i$ |
| $m_i$ | S 第 $i$ 行的最大分数 | 一个数 | 本步 |
| $k$（求和下标） | 跑遍第 $i$ 行的每一列 | | 本步 |
| $P_{ij}$ | token $i$ 给 token $j$ 的权重 | P 是 $n \times n$ | 第 2 章第 7 步的 $w_{ij}$ |
| $\text{out}_i$ | token $i$ 在这个 head 的输出 | 128 个数 | 第 2 章第 7 步 |

和第 2 章第 4 步一样，公式里省略了 $\div\sqrt{128}$。这里的 $m_i$ 是最大分数，和第 13 章的字节数 $m_h$ 无关。

### 为什么要减 $m_i$

分子分母同乘 $e^{-m_i}$，比值不变；最大的指数变成 $e^0 = 1$，不会溢出。用第 2 章第 4 步的 5 个分数验证：

| $j$ | $S_{ij}$ | $S_{ij} - m_i$ | $e^{S_{ij} - m_i}$ | $P_{ij}$ |
|---|---|---|---|---|
| 1 | 0.4 | −2.2 | 0.11 | 0.06 |
| 2 | 1.9 | −0.7 | 0.50 | 0.26 |
| 3 | 0.2 | −2.4 | 0.09 | 0.05 |
| 4 | 2.6 | 0 | 1 | 0.53 |
| 5 | 0.9 | −1.7 | 0.18 | 0.10 |
| | $m_i = 2.6$ | | 合计 1.88 | 1.00 |

权重和第 2 章第 5 步完全相同。

### 为什么 S 必须写进 HBM

加框的 $P_{ij}$ 需要 $m_i$ 和分母，两者都来自 S 的整个第 $i$ 行。写成三个 kernel 时，每个 kernel 跑完、把结果写进 HBM，下一个才开始；所以 S 完整躺在 HBM 里，接着是 P。

### 接下来

第 3 步按真实大小算这些写入和读取。

## 第 3 步 · 三个 kernel 搬多少字节

> **一句话：** 2,000 token 的 prompt，每个 head 三个 kernel 搬 34 MB，其中 32 MB 是写一次、读一次就扔掉的 S 和 P；整个模型 35 GB，约 10 ms。

### 图上是什么

- 第 2 步同一张图，每个矩阵下面多了 MB 数：Q、K、V、out 各 0.5 MB，S、P 各 8 MB。
- 底部四行算式：矩阵大小、三个 kernel 各搬多少、每 head 和每 prompt 的合计、S 和 P 占多少。

### 公式

$$
\begin{gathered}
M_{Q} = n \cdot 128 \cdot b\\[4pt]
M_{S} = n^2 \cdot b\\[4pt]
M_{\text{head}} = \underbrace{(2M_Q + M_S)}_{\text{kernel 1}} + \underbrace{2M_S}_{\text{kernel 2}} + \underbrace{(M_S + 2M_Q)}_{\text{kernel 3}}
\end{gathered}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n$ | prompt 的 token 数 | 2,000 | 本步 |
| $b$ | bf16 每个数的字节数 | 2 B | `src/numbers.ts` 的 `BYTES` |
| $M_Q$ | Q、K、V、out 中任一个，一个 head | 0.512 MB | 本步 |
| $M_S$ | S 或 P，一个 head | 8 MB | 本步 |
| $M_{\text{head}}$ | 三个 kernel 读加写的字节，一个 head | 34 MB | 本步 |

每个 kernel 的字节数 = 它读的 + 它写的。这里 1 MB = 10⁶ B。

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| $M_Q$ | 2,000 × 128 × 2 B | 512,000 B ≈ 0.5 MB |
| $M_S$ | 2,000² × 2 B | 8 MB |
| kernel 1：读 Q、K，写 S | 0.512 + 0.512 + 8 | ≈ 9 MB |
| kernel 2：读 S，写 P | 8 + 8 | 16 MB |
| kernel 3：读 P、V，写 out | 8 + 0.512 + 0.512 | ≈ 9 MB |
| $M_{\text{head}}$ | 9.024 + 16 + 9.024 | 34.048 ≈ 34 MB |
| 一个 prompt | 34.048 MB × 32 head × 32 层 | 34.9 ≈ 35 GB |
| 时间 | 34.9 GB ÷ 3.35 TB/s | ≈ 10 ms |

10 ms 大约是 4.8 ms 权重读取的两倍。这里按 32 个 query head 算，因为 S 和 P 每个 query head 一份。

### 哪些字节是必要的

- S 和 P：2 ×（8 + 8）= 32 MB，各写一次、读一次，之后再也不用。
- Q、K、V 读一次，out 写一次：4 × 0.512 ≈ 2 MB。产出结果只需要这些。

### 接下来

第 4 步去掉那 32 MB。

## 第 4 步 · FlashAttention：一个 kernel，分 chunk 读 K 和 V

> **一句话：** 把三个 kernel 融合成一个：K、V 一个 chunk 一个 chunk 地读，每行只带着最大值、和、输出三个滚动值，分数用完就扔；S 和 P 不进 HBM，每 head 34 MB 变成 2 MB。

### 图上是什么

- 上方一个绿色框：`attention · 融合 · 在线 softmax`，里面写着每行携带 $m_i$、$\ell_i$、$\text{out}_i$。
- HBM 里：Q（第 $i$ 行红色）、K 和 V 各切成 4 个 chunk、S 和 P 变成虚线框「从未写入」（0 MB）、out。
- 动画循环：chunk 1、2、3、4 依次变深（正在读），读过的变淡；四个都读完，out 的第 $i$ 行变红，绿箭头写回。
- 粗体一行说明当前在做什么；HBM 框右上角：此 head 搬运 2 MB，对比第 3 步的 34 MB。
- 底部：修正因子的恒等式（KaTeX）。

### 公式

一个新 chunk 把第 $i$ 行的最大值从 $m$ 抬到 $m'$ 时：

$$
\begin{gathered}
e^{\,s - m'} = e^{\,s - m}\, e^{\,m - m'}
\\[2pt] \Downarrow \\[2pt]
\ell \leftarrow \ell\, e^{\,m - m'} + \sum_{\text{chunk}} e^{\,s - m'}\\[4pt]
\text{out} \leftarrow \text{out}\, e^{\,m - m'} + \sum_{\text{chunk}} e^{\,s - m'}\, v
\end{gathered}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $s$ | 一个分数 $S_{ij}$，在寄存器里算出，用完就扔 | 第 2 步 |
| $m_i$（图上 $m$） | 目前见过的最大分数 | 第 2 步的 $m_i$，只是还没看完整行 |
| $m'$ | 加上新 chunk 后的最大值 | 本步 |
| $\ell_i$（图上 $\ell$） | 目前 $e^{S_{ij} - m_i}$ 的累计和，即第 2 步 $P_{ij}$ 的分母 | 本步 |
| $\text{out}_i$ | 目前 $e^{S_{ij} - m_i}\, v_j$ 的累计和，即分子 | 本步 |
| $v$ | 这个 chunk 里各 key 的 value | 第 2 步的 V |

最后 $\text{out}_i \div \ell_i$ 就是第 2 步的 $\text{out}_i$。三个滚动值放在寄存器里（第 13 章第 4 步）。

### 代入图上的数

用第 2 章第 4 步的 5 个分数，每 chunk 两个（图上是 4 个 chunk，这里为了算得清楚用 3 个）：

| chunk | 分数 | $m$ | 因子 $e^{m - m'}$ | $\ell$ | out |
|---|---|---|---|---|---|
| 1 | 0.4、1.9 | 1.9 | | $e^{-1.5} + e^0 = 0.22 + 1 = 1.22$ | $0.22\,v_1 + 1\,v_2$ |
| 2 | 0.2、2.6 | 2.6 | $e^{-0.7} = 0.50$ | $1.22 \times 0.50 + 0.09 + 1 = 1.70$ | $0.11\,v_1 + 0.50\,v_2 + 0.09\,v_3 + 1\,v_4$ |
| 3 | 0.9 | 2.6 | 1 | $1.70 + e^{-1.7} = 1.88$ | 再加 $0.18\,v_5$ |

$\text{out} \div \ell = 0.06\,v_1 + 0.26\,v_2 + 0.05\,v_3 + 0.53\,v_4 + 0.10\,v_5$，和第 2 步的表一致。

### 搬了多少字节

Q、K、V 各读一次，out 写一次：4 × 0.512 ≈ 2 MB；S 和 P 是 0 MB。对比第 3 步的 34 MB。

### 没讲的部分

这一步只讲这个恒等式。FlashAttention 的其他设计（tile 大小、训练用的反向传播）不在本章范围，正文也这样说明。真实 kernel 每 chunk 64 个 key（第 7 步）。

### 接下来

第 5 步：这个循环在每个 attention kernel 里都一样，那为什么还有那么多 kernel。

## 第 5 步 · 四件事改变循环的写法

> **一句话：** 循环本身不变；有四件事迫使它换一种写法。两件改变执行路径（query 有多少、K/V 放在哪），另两件决定用哪个 backend（head 布局、GPU）。

### 图上是什么

- 顶部绿条：第 4 步的循环，一行 query 对 K 和 V，每次一个 chunk。
- 四个编号行，每行左边是名字和两行说明，中间是小图，右边是它落在哪一列、在第几步讲。
- 右边两个灰底列：「改变执行路径」和「决定用哪个 backend」。

### 四件事

| 行 | 是什么 | 小图 | 落在哪列 | 讲解 |
|---|---|---|---|---|
| 1 | 模型的 head 布局：几个 query head（蓝）共享一个缓存的 K/V head（橙） | MHA 一对一、GQA 几个共享一个、MLA 全部共享一个宽向量 | 决定 backend | 第 6 步 |
| 2 | query 有多少：prefill 每个 prompt token 一个，decode 每个 request 一个 | prefill 是三角（每个 token 只看到自己为止，第 2 章第 7 步），decode 是一行 | 改变执行路径 | 第 7–8 步 |
| 3 | K 和 V 放在哪：每个 request 一个 tensor，或 page 散落在 pool 里（第 7 章第 4 步） | 一条连续的 vs pool 里零散几格 | 改变执行路径 | 第 9 步 |
| 4 | 哪款 GPU：每代新增硬件 | A100 / FA2、H100 / FA3、B200 / TRT-LLM、MI300 / aiter | 决定 backend | 第 10 步 |

### 这四件事是什么关系

它们不是四选一，每个 request 同时碰到全部四件。本书的配置是：GQA（行 1），既有 prefill 又有 decode（行 2），用 page（行 3），H100（行 4）。

- 行 2、3 **改变执行路径**：prefill 和 decode 分开处理；连续行直接算地址，page 先查表。第 12 步另有只负责 decode 的 backend。
- 行 1、4 **决定用哪个 backend**：一个 backend 只为某些 head 布局、某些 GPU 而写。

先讲 head，因为第 7 步要用第 6 步的「每字节使用次数」。

### 接下来

第 6 步：行 1，head 布局。

## 第 6 步 · 4 之 1：head 布局

> **一句话：** 模型定死了几个 query head 共享一个 K/V head（1、4 或 128），以及 k、v 多宽；kernel 按宽度编译，MHA 和 GQA 都是 128 宽、共用一个 kernel，MLA 的 576 和 512 需要自己的。

### 图上是什么

- 三行：MHA（Llama-2-7B）、GQA（Llama-3-8B）、MLA（DeepSeek-V3）。每行上排蓝色是 query head，下排橙色是为它们缓存的 K/V。
  - MHA：32 个蓝格对 32 个橙格。
  - GQA：32 个蓝格对 8 个宽橙格，每个盖住 4 个蓝格。
  - MLA：128 条细蓝线对一整条橙色。
- 列「每字节使用次数」：1、4、128。列「k、v 宽度」：128、128、k 576 / v 512。
- 右边灰框：前两行「一个 128 宽 kernel，组大小只是配置」，MLA「自己的 kernel，128 宽 kernel 不适用」。
- 三条带点说明和两条脚注（使用次数的定义；MLA 的 k 由什么组成）。

### 公式

$$
\begin{gathered}
g = \frac{H_q}{H_{kv}}\\[4pt]
M_{\text{tile}} = T_k \cdot (d_k + d_v) \cdot b
\end{gathered}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $H_q$ | query head 数 | Llama-3-8B 32 | `src/numbers.ts` 的 `HEADS` |
| $H_{kv}$ | K/V head 数 | Llama-3-8B 8 | 第 2 章第 14 步，`KV_HEADS` |
| $g$ | 每字节使用次数：一个读入的 K/V 字节为一个 token 服务几个 query head | 1、4、128 | 本步 |
| $T_k$ | 一个 tile 里的 key 数 | 64 | 组件里的 `TILE_K` |
| $d_k, d_v$ | 每个 head 的 k、v 宽度 | 128、128；MLA 576、512 | 本步 |
| $b$ | 每个数的字节数 | 2 B | 第 3 步 |
| $M_{\text{tile}}$ | 一个 tile 的 K 和 V 占多少片上内存 | | 本步 |

### 代入图上的数

| 布局 | $g$ | $M_{\text{tile}}$ | 占 H100 一个 SM 的 228 KB |
|---|---|---|---|
| MHA | 32 ÷ 32 = 1 | 64 × (128 + 128) × 2 B = 32,768 B = 32 KB | 14% |
| GQA | 32 ÷ 8 = 4 | 同上，32 KB | 14% |
| MLA | 128 ÷ 1 = 128 | 64 × (576 + 512) × 2 B = 139,264 B = 136 KB | 60%，是前者的 4.25 倍 |

### 为什么宽度决定 kernel，组大小不决定

- kernel 把 K、V 按 tile 读进 SM 的片上共享内存（SM 见第 13 章第 8 步），tile 的尺寸在编译时就定了。宽度一变，tile 和内存分配全要重排。
- 几个 query head 共享一个 K/V head 只是个数：同一个 kernel 把每个 K/V head 读一次，再让这么多 query head 对它计算。

### MLA 的 576 和 512

DeepSeek-V3 每个 token 只缓存一个向量：512 个数的压缩内容，加 64 个数的位置信息（RoPE，第 2 章第 11 步）。k 用全部 576 个，v 只用那 512 个，因为位置只帮助挑选 token，不进输出。128 个 query head 都对这一个向量计算。

### 模型配置出处

- **MHA · Llama-2-7B：**[Llama 2 论文 Table 1](https://arxiv.org/html/2307.09288#S2.T1) 标明 7B 不用 GQA。Meta 参考实现的[默认参数](https://github.com/meta-llama/llama/blob/689c7f261b9c5514636ecc3c5fefefcbb3e6eed7/llama/model.py#L20-L24)是 `dim = 4096`、`n_heads = 32`、`n_kv_heads = None`；[Attention](https://github.com/meta-llama/llama/blob/689c7f261b9c5514636ecc3c5fefefcbb3e6eed7/llama/model.py#L200-L205) 此时把 K/V head 数设为 `n_heads`。所以 query 和 K/V 都是 32 个 head，宽度为 4096 ÷ 32 = 128。
- **GQA · Llama-3-8B：**[Llama 3 论文 Table 3](https://arxiv.org/html/2407.21783#S3.T3) 列出 `Model Dimension = 4096`、`Attention Heads = 32`、`Key/Value Heads = 8`。所以 4 个 query head 共享一个 K/V head，宽度为 4096 ÷ 32 = 128。
- **MLA · DeepSeek-V3：**[官方配置](https://huggingface.co/deepseek-ai/DeepSeek-V3/blob/e815299b0bcbac849fa540c768ef21845365c9eb/config.json)给出 `num_attention_heads = 128`、`kv_lora_rank = 512`、`qk_rope_head_dim = 64`。[官方 MLA 实现](https://github.com/deepseek-ai/DeepSeek-V3/blob/9b4e9788e4a3a731f7567338ed15d3ec549ce03b/inference/model.py#L439-L444)分别缓存 512 维 `kv_cache` 和 64 维 `pe_cache`；[算分用两者，输出只读 `kv_cache`](https://github.com/deepseek-ai/DeepSeek-V3/blob/9b4e9788e4a3a731f7567338ed15d3ec549ce03b/inference/model.py#L480-L495)。所以 128 个 query head 共用一份缓存，k 宽 512 + 64 = 576，v 宽 512。

### 接下来

第 7 步把 $g$ 再乘上 query 数。

## 第 7 步 · 4 之 2：prefill 和 decode

> **一句话：** prefill 一个 tile 有 128 个 query，加上 GQA 的 4，每个 K/V 字节用 512 次，计算比读取久；decode 只有 1 个 query，用 4 次，读取定时间。所以 backend 要分开处理这两种形状。

### 图上是什么

- 左上 prefill 网格（8 × 8，行是 query，列是 key）：右上浅色格是 query 之后的 key，跳过（第 2 章第 7 步）；深灰是在其他 tile 里算的；红色 4 × 4 是一个 thread block 的 tile（thread block 见第 13 章第 7 步）。一列加框：一个 key 的 K/V 读一次、用 4 次。
- 右上 decode：只有一行，红色 4 格是一个 tile，加框的一格读一次、用一次。
- 两边都写着实际值：prefill 128 query × 4 head = 512 次；decode 1 query × 4 head = 4 次。
- 下半部：一个 chunk（一个 K/V head 的 64 个 key，32 KB）的读取时间（红）对比计算时间（绿），decode 和 prefill 各一对。
- 底部一行：`forward_extend` 和 `forward_decode`；脚注写平衡点。

### 公式

$$
\begin{gathered}
u = q_{\text{tile}} \cdot g\\[4pt]
t_{\text{read}} = \frac{M_{\text{chunk}}}{BW}\\[4pt]
t_{\text{math}} = \frac{u \cdot M_{\text{chunk}}\ \text{flop}}{F}
\end{gathered}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $q_{\text{tile}}$ | 一个 tile 里的 query 数 | prefill 128，decode 1 | 本步 |
| $g$ | 每个 K/V head 服务的 query head 数 | 4 | 第 6 步 |
| $u$ | 每个 K/V 字节的使用次数 | 512 或 4 | 本步 |
| $M_{\text{chunk}}$ | 一个 chunk：64 个 key 的 K 和 V，一个 K/V head | 64 × 128 × 2 × 2 B = 32,768 B | 第 6 步的 $M_{\text{tile}}$ |
| $BW$ | HBM 带宽 | 3.35 TB/s | 第 1 步 |
| $F$ | bf16 峰值算力 | 989 TFLOP/s | `src/numbers.ts` 的 `TFLOPS` |

一次使用 = 对一个 2 字节的数做一次乘加 = 2 flop，所以每字节 1 flop，$u$ 次使用 32 KB 就是 $u \times 32{,}768$ flop。

### 代入图上的数

| | $u$ | $t_{\text{read}}$ | $t_{\text{math}}$ | 谁定时间 |
|---|---|---|---|---|
| decode | 1 × 4 = 4 | 32,768 B ÷ 3.35 TB/s = 9.8 ns | 4 × 32,768 ÷ 989 TFLOP/s = 0.13 ns | 读取 |
| prefill | 128 × 4 = 512 | 9.8 ns | 512 × 32,768 ÷ 989 TFLOP/s = 17 ns | 计算 |

两条一样长的点是 $u = F / BW = 989 \div 3.35 \approx 295$，就是第 4 章第 8 步约 300 token 的平衡点。4 远低于它，512 高于它。

### 为什么要两条执行路径

为一边设计的 kernel 在另一边浪费：decode kernel 要尽量多开 SM 拉带宽（第 8 步），prefill kernel 要把 tile 做大让计算单元吃满。所以接口把两个阶段分开：

- `forward_extend`：prefill。叫 extend 是因为 prefill 可能接在已缓存的前缀后面（第 8 章第 2 步）。
- `forward_decode`：decode。

基类 [`AttentionBackend.forward`](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/layers/attention/base_attn_backend.py#L261-L330) 按 batch 的 forward mode 分到这两个之一（第 11 步）。两条路径是两个调用入口，不保证每个 backend 都有两个专属 kernel；第 12 步的 `cutedsl_mla` 就只负责 decode。

### 接下来

第 8 步：decode 只有一行，batch 1 时怎么让更多 SM 一起读。

## 第 8 步 · 4 之 2 续：decode 的 split-KV

> **一句话：** batch 1 的 decode 每个 K/V head 一个 block，只有 8 个 SM 在读；把每个 head 的 key 切成 16 段，128 个 block 同时读，快 16 倍，最后用第 4 步的缩放把各段合并。

### 图上是什么

- 上方一行：一个 request，context 8,192 token，它唯一的 query 要在 8 个 K/V head 里各读 8,192 个 key。
- 左「不切分」、右「切分后」，布局和比例相同。每边 8 根条，每根是一个 K/V head 在这一层的 K 和 V。
- 动画循环：红色从左往右填，表示已读的 K 和 V。右边每根条切成 16 段同时填，填完后右侧小绿块（merge）亮起；左边每根条一个 block 慢慢填满。
- 每边下方一个 132 格的 SM 网格，深色是忙碌的 SM（8 个或 128 个），旁边是带宽和时间算式。
- 三条带点说明；脚注：每个忙碌 SM 均分带宽的 1/132，这是简化。

### 公式

$$
\begin{gathered}
M_{\text{head}} = c \cdot 128 \cdot 2 \cdot b\\[4pt]
BW_{\text{busy}} = \frac{N_{\text{blk}}}{132}\, BW\\[4pt]
t_{\text{layer}} = \frac{8\, M_{\text{head}}}{BW_{\text{busy}}}
\end{gathered}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $c$ | context 长度 | 8,192 | 本步 |
| $M_{\text{head}}$ | 一个 K/V head 在一层里的 K 和 V | 4.2 MB | 本步 |
| block | kernel 的一段，跑在一个 SM 上 | | 第 13 章第 7、8 步 |
| 132 | H100 的 SM 数 | | `src/numbers.ts` 的 `SMS` |
| $N_{\text{blk}}$ | 同时在跑的 block 数 | 8 或 128 | 本步 |
| $BW_{\text{busy}}$ | 忙碌 SM 能拉到的带宽（按均分假设） | | 本步 |
| $t_{\text{layer}}$ | 一层 attention 读完的时间 | | 本步 |

第 7 步说 decode 受内存限制，所以时间 = 字节 ÷ 拉到的带宽。

### 代入图上的数

| 量 | 不切分 | 切分后 |
|---|---|---|
| $M_{\text{head}}$ | 8,192 × 128 × 2 × 2 B = 4,194,304 B ≈ 4.2 MB | 同左 |
| 每个 block 走的 key | 8,192 | 8,192 ÷ 16 = 512 |
| $N_{\text{blk}}$ | 8 | 8 × 16 = 128 |
| $BW_{\text{busy}}$ | 8/132 × 3.35 = 0.20 TB/s | 128/132 × 3.35 = 3.25 TB/s |
| $t_{\text{layer}}$ | 8 × 4.2 MB ÷ 0.20 TB/s ≈ 0.17 ms | 0.010 ms |
| × 32 层 | 5.3 ms | 0.33 ms |

16 已是上限：8 × 16 = 128 ≤ 132，而 8 × 17 = 136 > 132。不切分时 5.3 ms，比 4.8 ms 的权重读取还长。

### merge 怎么合并

每段跑完带着自己 512 个 key 上的 $m$、$\ell$、out（第 4 步的三个值）。两段 $a$、$b$ 合并：

$$
\begin{gathered}
m = \max(m_a, m_b)\\[4pt]
\ell = \ell_a\, e^{\,m_a - m} + \ell_b\, e^{\,m_b - m}\\[4pt]
\text{out} = \text{out}_a\, e^{\,m_a - m} + \text{out}_b\, e^{\,m_b - m}
\end{gathered}
$$

16 段依次这样合并，最后 out ÷ $\ell$。这和第 4 步换 chunk 时的修正是同一个恒等式。

### 简化在哪

真实 GPU 上不用全部 SM 也能把 HBM 读满，所以不切分的 5.3 ms 是上限，正文也这样说明。

### 接下来

第 9 步：行 3，K 和 V 在内存里的位置。

## 第 9 步 · 4 之 3：page

> **一句话：** 不用 page 时，request 的 K、V 是连续的行，kernel 自己算地址；用 page 时，行散落在 pool 里，kernel 先查 page 编号表再读行，寻址方式也要跟着变。

### 图上是什么

- 上半「不用 page」：一个 tensor 里 A0–A4（蓝）、B0–B2（绿）紧挨着。B 的 token $t$ 在第 5 + $t$ 行。
- 下半「用 page」：10 个 page 的 KV pool。A 占 3、9、1、7、2，B 占 4、8、6，0 和 5 空着。
- 两个数组：`kv_indices`（8 格，A 的淡蓝、B 的深绿）和 `kv_indptr`（3 格）。绿箭头从 `kv_indices` 里 B 的三格指向 pool 的 page；灰线从 `kv_indptr` 的格子指向 `kv_indices` 的切分边界。
- 两条带点说明；脚注：每个 batch 在 `init_forward_metadata` 里重建这两个数组。

### 公式

$$
\text{row}(r, t) = \texttt{kv\_indices}\big[\,\texttt{kv\_indptr}[r] + t\,\big]
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $r$ | batch 里第几个 request（A 是 0，B 是 1） | 本步 |
| $t$ | 该 request 的第几个 token | 本步 |
| `kv_indptr` | 每个 request 的切片从 `kv_indices` 的哪里开始，末尾多一个总长 | 本步 |
| `kv_indices` | 每个 token 所在的 page，一个 request 接一个 | 第 7 章第 4 步的 page 表，拼起来 |
| $\text{row}(r, t)$ | 这个 token 的 k、v 在 pool 的哪一行 | 本步 |

这里一个 page 放一行，也就是 SGLang 默认的 page 大小 1。

### 代入图上的数

| 量 | 值 |
|---|---|
| `kv_indices` | [3, 9, 1, 7, 2, 4, 8, 6] |
| `kv_indptr` | [0, 5, 8] |
| A 的切片 | `kv_indices[0:5]` = 3, 9, 1, 7, 2 |
| B 的切片 | `kv_indices[5:8]` = 4, 8, 6，长度 8 − 5 = 3 |
| B 的 token 2 | `kv_indices[5 + 2]` = `kv_indices[7]` = 6 |

不用 page 时，B 的 token 2 就是第 5 + 2 = 7 行，一次加法；用 page 时它在 page 6，要先读一次表。

### 为什么读取路径要变

- 每读一行之前多读一次表。一个按 5 + $t$ 算地址的 kernel 会从 pool 里读错行。
- 不用 page 时，一个 64 key 的 chunk 是相邻 64 行，一次连续读。为 16–128 行的大 page 写的 kernel 每 page 查一次表，page 内的行是连续的（第 12 步的 page 大小列）。

### 每步重建

哪些 request 在 batch 里、各有多长，每步都在变，所以每个 batch 都重建这两个数组。`kv_indptr` 存的就是第 12 章第 4 步的序列边界。固定版本的 Triton 实现在 [`_fill_kv_indptr_and_indices`](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/layers/attention/triton_backend.py#L504-L522) 里用序列长度累计出 `kv_indptr`，再填 `kv_indices`。

数组名因 backend 而异：flashinfer 和 triton 用 `kv_indptr` / `kv_indices`；本书默认的 fa3 用 `cu_seqlens_k`（每个 request 的起点）和 `page_table`（每个 request 一行 page 编号），信息相同。

### 接下来

第 10 步：行 4，GPU。

## 第 10 步 · 4 之 4：GPU

> **一句话：** 每代 GPU 新增 kernel 要专门写才能用上的单元；同一块 H100 上，为 A100 写的 FlashAttention-2 只到峰值的 35%，为 H100 写的 FlashAttention-3 到 75%。

### 图上是什么

- 表的四行：GPU、这代新增什么、为它写的 attention kernel。
- 下方两根绿条：FlashAttention-2 ≈ 350 TFLOP/s · 35%，FlashAttention-3 ≈ 740 TFLOP/s · 75%，灰底是 989 TFLOP/s 的峰值。
- 脚注：Triton 一份源码编译到所有这些 GPU，可移植但通常更慢。

### 每代新增什么

| GPU | 新增 | attention kernel |
|---|---|---|
| A100（Ampere，2020） | SM 计算时能同时从 HBM 拷贝 | FlashAttention-2、FlashInfer |
| H100（Hopper，2022） | TMA（自己搬整个 tile 的单元）；SM 做别的事时同时跑 matmul；8 位数 | FlashAttention-3 |
| B200（Blackwell，2024） | 存 matmul 结果的独立内存；4 位数 | TensorRT-LLM 的 kernel、FlashAttention-4 |
| MI300（AMD，2023） | 不是 NVIDIA：指令集不同，没有 CUDA | aiter，AMD 的库 |

### 公式

$$
\text{达到的算力} = f \times F
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $f$ | 占峰值的比例 | 0.35、0.75 | FlashAttention-3 论文（2024） |
| $F$ | H100 的 bf16 峰值 | 989 TFLOP/s | 第 7 步 |

### 代入图上的数

| kernel | 算式 | 结果 |
|---|---|---|
| FlashAttention-2 | 0.35 × 989 | ≈ 346，图上取 350 TFLOP/s |
| FlashAttention-3 | 0.75 × 989 | ≈ 742，图上取 740 TFLOP/s |
| 比值 | 0.75 ÷ 0.35 | 约 2.1 倍 |

### 为什么这能证明「要为每代重写」

- 测的是长 prefill，第 7 步说它受计算限制（每字节 512 次，高于约 300），所以速度就是每秒做了多少计算。
- 两个 kernel 都占满 132 个 SM，芯片也相同；差别只在 kernel 有没有用上 H100 的新单元。

### 接下来

第 11 步：kernel 这么多，一个模型怎么用它们。

## 第 11 步 · 一个接口，许多 backend

> **一句话：** 模型只调用 `AttentionBackend` 这一个接口；各 backend 通过同样的入口接入：plan、prefill 和 decode 两条路径、CUDA graph 缓冲区。

### 图上是什么

- 左「模型」：32 层，每层有一个 attention 层 `RadixAttention.forward`，它从不点名 kernel。箭头「调用」指向中间。
- 中间红框 `AttentionBackend`（`sglang/srt/layers/attention/` 里的基类），四个槽：
  - 蓝框 `init_forward_metadata(batch)`，圆圈 3：每 batch 一次，建第 9 步的数组。
  - 黑框 `forward(q, k, v, layer, batch)`，圆圈 2：分到下面两个深色框 `forward_extend`（prefill，第 7 步）和 `forward_decode`（decode，第 7–8 步）。
  - 橙框 `init_cuda_graph_state(max_bs)`：graph 缓冲区。
- 右「各自来填」：fa3、flashinfer、trtllm_mha、aiter、triton，「总共约二十几个」；选哪个由 map 的行 1 和行 4 决定。
- 两条带点说明；脚注说明编号圆圈是 map 的行。

### 每个槽做什么

| 槽 | 什么时候调用 | 做什么 | 对应 |
|---|---|---|---|
| `init_forward_metadata` | 每个 batch 一次，在所有层之前 | 建第 9 步的 page 数组，所有层共用 | map 行 3，第 9 步 |
| `forward` | 每层一次 | 按 forward mode 分到 `forward_decode` 或 `forward_extend` | map 行 2，第 7–8 步 |
| `init_cuda_graph_state` | 启动时一次 | 按最大 batch 一次性分配 plan 数组 | 第 11 章第 13 步 |

固定版本的基类源码把 [`init_forward_metadata`](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/layers/attention/base_attn_backend.py#L88-L94) 拆成 graph 内外的准备，把 [`init_cuda_graph_state(max_bs, max_num_tokens)`](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/layers/attention/base_attn_backend.py#L202-L204) 留给各 backend 分配缓冲区；图上只画了 `max_bs`。

### 为什么需要 graph 缓冲区

第 11 章第 13 步说过，录好的 graph 在固定地址重放，所以 plan 数组不能每步新建。backend 按最大 batch 分配一次，每步把新的 page 数组写进去。

### 另外两件事

- 两条路径还负责把新 token 的 k、v 写进 pool（`forward` 的 `save_kv_cache` 参数），因为只有 backend 知道 page 在哪。
- map 的行 1（head）和行 4（GPU）没有槽：它们决定用哪个子类。`--attention-backend` 换的就是这个子类，模型代码不变。

### 接下来

第 12 步列出这些 backend。

## 第 12 步 · backend 一览

> **一句话：** 每个 backend 覆盖一部分 head 布局、page 大小和 GPU；不指定时，本书这类非 MLA 模型的默认选择是：Hopper 用 fa3，Blackwell 用 trtllm_mha，AMD 用 aiter，其他 NVIDIA 用 flashinfer，都不合适时用 triton。

### 图上是什么

- 表头：backend、kernel 来自、①head 布局、③page 大小、④GPU、默认用于。编号是 map 的行（第 5 步）。
- 六行：fa3（高亮）、trtllm_mha、aiter、flashinfer、triton、torch_native。
- 下方「仅 MLA」：flashmla page 64、cutedsl_mla page 32 · 64、trtllm_mla page 32 · 64 · Blackwell。
- 两条带点说明；脚注写来源。

### 怎么读这张表

- ① 对应第 6 步，③ 对应第 9 步，④ 对应第 10 步。prefill 与 decode 是两条执行路径（第 7 步），不等于每端一个专属 kernel；`cutedsl_mla` 只负责 decode，prefill 默认交给 `trtllm_mla`。
- page 大小「1」表示一个 page 一行，kernel 每个 token 查一次表；「16–128」表示为这么多行一页而写。Triton 也能按大于 1 的 page 大小特化。
- 「默认用于」是没给 `--attention-backend` 时 `get_default_attn_backend` 对非 MLA 模型的选择。

### 本书的配置，逐列核对

| 列 | 本书 | fa3 | 合适吗 |
|---|---|---|---|
| ① head | Llama-3-8B 是 GQA（第 6 步） | MHA · GQA · MLA | 是 |
| ③ page | 大小 1（第 9 步） | 任意 | 是 |
| ④ GPU | H100 是 Hopper | Hopper | 是 |

三列都合适，fa3 也是 H100 的默认。trtllm_mha 不会被选：它为 Blackwell 和 16–128 行的 page 而写。

### 对照源码

- 固定版本的 [`get_default_attn_backend`](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/arg_groups/model_override_base.py#L268-L341)：非 MLA 模型在 Hopper 上选 fa3（前提是没开 topk > 1 的 speculative decoding），Blackwell（SM100）上选 trtllm_mha，AMD 上选 aiter，其他有 FlashInfer 的 NVIDIA 选 flashinfer，否则 triton。torch_native 在 Apple 的 MPS 上是默认，其他平台要手动指定。
- [page 大小检查](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/arg_groups/overrides.py#L1067-L1133)：trtllm_mha 只接受 16、32、64、128；trtllm_mla 和 cutedsl_mla 只接受 32、64；flashmla 只接受 64。
- [backend 注册表](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/arg_groups/choices.py#L68-L97)里有 `cutedsl_mla`，没有 `cutlass_mla`。Triton 把 [page 大小交给 kernel wrapper 特化](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/layers/attention/triton_backend.py#L214-L216)，支持大于 1 的 page。
- [`cutedsl_mla` 目前只支持 decode](https://github.com/sgl-project/sglang/blob/1d019ce1c85e11ff2f425344e66f446b106f6074/python/sglang/srt/arg_groups/overrides.py#L1178-L1205)，且只支持 Blackwell SM100；未另指定 prefill backend 时默认配 `trtllm_mla`。这是「两条路径不等于每端一个专属 kernel」的实例。

### 接下来

第 13 步：kernel 换了一圈，单个 request 的 decode 还剩下什么成本。

## 第 13 步 · 一个 request 独自 decode

> **一句话：** 第 11–14 章之后，单独 decode 时每个 token 仍要读一遍 16 GB 权重，因为每趟的输入是上一趟写出的 token；一趟本可以像 prefill 那样算 5 个位置，问题是另外 4 个输入从哪来。

### 图上是什么

- 上排「decode · 每个 token 一趟」：`is` → 读 16 GB → `Paris` → 读 16 GB → `.` → … → `is`，共 4 趟、4 次读。
- 下排「一趟算 5 个位置」：第一格 `is`（蓝），后四格是红色虚线框里的 `?`，下面一条长框「只读一次 16 GB」，1 次读。虚线把上排的每个输出连到下排对应的 `?`。
- 中间一行说明：每个 `?` 都是上面链条一趟写一个的 token，所以还不知道。
- 脚注：batch 1，一趟就是读 16 GB 权重，4.8 ms。

### 公式

$$
\begin{gathered}
t_{\text{chain}} \approx k \cdot t_{\text{mem}}\\[4pt]
t_{\text{one pass}} \approx t_{\text{mem}} + (k + 1)\, t_{\text{tok}}
\end{gathered}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $k$ | 要产生的 token 数 | 4（下排是 1 + 4 = 5 个位置） | 本步 |
| $t_{\text{mem}}$ | 读一遍权重 | 16 GB ÷ 3.35 TB/s = 4.8 ms | 第 4 章第 5 步 |
| $t_{\text{tok}}$ | 一个位置的计算 | 0.016 ms | 第 4 章第 5 步 |

### 代入图上的数

| | 读权重 | 计算 | 合计 |
|---|---|---|---|
| 上排：4 趟 | 4 × 4.8 ms | 很少 | ≈ 19 ms |
| 下排：1 趟 5 个位置 | 4.8 ms | 5 × 0.016 = 0.08 ms | ≈ 4.9 ms |

5 个位置意味着每个权重字节用 5 次，远低于第 7 步约 300 的平衡点，所以下排仍是读取定时间，多算的 4 个位置几乎不加时间（第 4 章第 3 步：权重读一次，给每个位置用）。

### 卡在哪里

第 11–14 章去掉了 launch 开销、中间结果和 attention 的多余读写，但没改变这一点：一趟、一次权重读取、一个新 token。下排第 1 个位置是 `is`，第 2–5 个需要 `Paris`、`.`、`It`、`is`，而它们正是上排一趟一个写出来的。

### 接下来

第 15 章讲这 4 个输入可以从哪来。
