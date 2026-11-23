## 第 1 步 · 一个 pass 里面：权重逐层到达

> **一句话：** 一个 pass 的时间由读权重决定；每层的计算在读下一层时做完，所以 1 个 position 和 5 个 position 的 pass 一样长。

### 图上是什么

- 两块面板：上面「1 个 position」（普通 decode，只有最新的 token），下面「5 个 position」（一个 pass 处理 5 个 token，像 prefill）。
- 每块的「内存」一行：深灰色方框「第 1 层」到「第 6 层」，模型共 32 层，只画前 6 层。
- 每块的「计算」一行：每层方框末尾的一小段蓝色，是这一层的计算；下面一块的蓝段宽 5 倍。
- 右边的 $x \times W$：$x$ 是 1 行或 5 行，每行 4,096 个数；$W$ 是 4,096 × 14,336 = 117 MB。
- 上面一块的标注：第 1 层的计算在读第 2 层时进行，然后等待。

**position** 就是 pass 处理的一个 token，在每层里是 $x$ 的一行（4,096 个数，第 2 章第 2 步的 $x_j$）。

### 公式

$$
t_{\text{pass}} = \max\!\left(t_{\text{mem}},\; n \cdot t_{\text{tok}}\right),\qquad
t_{\text{mem}} = \frac{M_W}{BW},\qquad
t_{\text{tok}} = \frac{f}{F}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n$ | 这个 pass 处理的 position 数 | 1 或 5 | 本步 |
| $M_W$ | 权重总量 | 16 GB | 第 4 章第 2 步 |
| $BW$ | HBM 带宽 | 3.35 TB/s | `src/numbers.ts` |
| $t_{\text{mem}}$ | 把权重读一遍的时间 | 4.8 ms | 第 4 章第 5 步 |
| $f$ | 一个 position 过整个模型的计算量 | 16 GFLOP | 第 4 章第 3 步 |
| $F$ | GPU 的 bf16 算力 | 989 TFLOP/s | `src/numbers.ts` |
| $t_{\text{tok}}$ | 一个 position 的计算时间 | 0.016 ms | 第 4 章第 5 步 |
| $t_{\text{pass}}$ | 一个 pass 的时间 | | 本步 |

取 max 而不是相加，是因为计算和读取同时进行：读第 $\ell+1$ 层时，第 $\ell$ 层的权重已在芯片上，正被拿来算。

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| 一个 $W$（MLP 的 gate） | 4,096 × 14,336 × 2 B | 117 MB |
| 一行乘 $W$ | 2 × 4,096 × 14,336（每个权重一次乘一次加） | 117 MFLOP |
| 读一层 | 4.8 ms ÷ 32 | 0.15 ms |
| 一个 position 每层的计算 | 0.016 ms ÷ 32 | 约 0.5 µs |
| 5 个 position 每层的计算 | 5 × 0.5 µs | 约 2.5 µs，仍远小于 0.15 ms |
| $t_{\text{pass}}$，$n = 1$ | max(4.8, 0.016) | 4.8 ms |
| $t_{\text{pass}}$，$n = 5$ | max(4.8, 5 × 0.016 = 0.08) | 4.8 ms |

图上的蓝段按真实比例只有约 0.2 px 宽，所以画宽了约 22 倍（第二条脚注）。

### 接下来

第 2 步用这条规则比较两种走法：每个 token 一个 pass，和一个 pass 处理 5 个 position。

## 第 2 步 · 4 个 token：4 次读取，还是 1 次

> **一句话：** 普通 decode 写 4 个 token 要 4 个 pass、19.1 ms；如果这 4 个 token 事先已知，一个 5 position 的 pass 只要 4.8 ms。

### 图上是什么

- 上一行「普通自回归 decode」：4 个蓝色 token `Paris`、`.`、`It`、`is`，每个下面一个深灰色 pass「读取 16 GB」，右边写「4 tokens · 19.1 ms」。
- 下一行「一个 pass 处理 5 个 position」：一个 pass，蓝色计算段宽 5 倍，右边写「一次读取 · 4.8 ms」。
- 横轴 0–20 ms；图例：深灰是读 16 GB 权重，蓝色是逐层完成的计算。

### 公式

$$
t_{\text{chain}} = k \cdot t_{\text{pass}}(n{=}1),\qquad
t_{\text{one pass}} = t_{\text{pass}}(n{=}k{+}1)
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $k$ | 要写的 token 数 | 4 | 本步（第 14 章第 13 步同一个 $k$） |
| $t_{\text{pass}}(n)$ | 处理 $n$ 个 position 的 pass 的时间 | | 第 1 步 |

下一行是 $k + 1 = 5$ 个 position：最后写出的 `is`，加 4 个新 token。

### 代入图上的数

| | 算式 | 结果 |
|---|---|---|
| 上一行 | 4 × 4.776 ms | 19.1 ms |
| 下一行 | max(4.8, 5 × 0.016 = 0.08) | 4.8 ms |

### 为什么上一行不能并起来

每个 pass 的输入是前一个 pass 选出的 token（第 1 章第 5 步）：没有 `Paris` 就算不出 `.`。下一行每个 position 的输出，是模型对它后一个 token 的选择，和上一行逐个 pass 做出的选择相同（第 2 章第 7 步：一次前向，每个位置各得一个输出）。

### 省略了什么

- KV cache 的读取：这里上下文最多 8 个位置，8 × 128 KB = 1 MB，而权重是 16 GB（第 4 章第 6 步）。
- 计算段画宽了约 46 倍（脚注）。

### 接下来

后面 4 个 token 事先并不知道。第 3 步先猜，再用下一行这样的一个 pass 去检查。

## 第 3 步 · 先猜，再用一个 pass 检查

> **一句话：** draft 模型猜 4 个 token，target 用一个 5 position 的 pass 检查：留下猜对的，在第一个猜错处放自己的 token，这一轮写出 3 个。

### 图上是什么

动画播放一次（右上角「播放一次」）：

- 上一行同第 2 步：普通 decode，19.1 ms。
- 下一行「投机解码」：4 段橙色是 draft 的 4 个 pass（按示意长度画），然后是深灰的「验证 · 5 个 position」pass。
- 三排 token：
  - 「draft 的猜测」：`Paris`、`.`、`The`、`city`（橙色）。
  - 「target 的选择」：`Paris` ✓、`.` ✓、`It` ✗、第 4 格「未采用」。
  - 「留下」：`Paris`、`.`（绿），`It`（蓝，target 自己的），第 4 格「丢弃」。
- 底部胶囊：每个 token 的时间 =（draft 的小读取 + target 的一次读取）÷ 留下的 token 数。

**target** 是我们要服务的模型（这里是 Llama-3-8B）；**draft 模型**是一个小得多的模型，专门用来猜。

### 检查怎么做

验证 pass 的 5 个 position 是 `is`、`Paris`、`.`、`The`、`city`。每个 position 输出 target 对下一个 token 的选择：

| position 上的 token | target 选的下一个 | draft 猜的下一个 | 结果 |
|---|---|---|---|
| `is` | `Paris` | `Paris` | ✓ |
| `Paris` | `.` | `.` | ✓ |
| `.` | `It` | `The` | ✗，用 `It` |
| `The` | `is` | `city` | 丢弃 |

从左往右比，遇到第一个不一致就停。`It` 是 target 在正确的前文之后选的，所以一定对。第 4 行的 `is` 和 `city` 都以 `The` 为前一个 token，`The` 被换掉了，所以两者都作废。

如果 4 个都猜对，第 5 个 position（`city`）的输出也能用，一轮就写出 5 个。

### 公式

$$
\tau = \frac{t_{\text{draft}} + t_{\text{mem}}}{a + 1}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $a$ | 被接受的猜测数，0 到 $k$ | 2 | 本步 |
| $a + 1$ | 这一轮写出的 token 数（加上 target 自己的一个） | 3 | 本步 |
| $t_{\text{draft}}$ | draft 产生 $k$ 个猜测的时间 | 图上为示意长度 | 第 5–7 步 |
| $t_{\text{mem}}$ | target 验证 pass 的时间，5 个 position 仍等于一次读取 | 4.8 ms | 第 1 步 |
| $\tau$ | 平均每写一个 token 的时间 | | 本步 |

### 代入图上的数

| 情况 | 算式 | 每个 token |
|---|---|---|
| 普通 decode | 3 个 token 要 3 × 4.776 = 14.3 ms | 4.8 ms |
| 本轮，假设 draft 不花时间 | 4.8 ÷ 3 | 1.6 ms |
| 全部猜错（$a = 0$） | ($t_{\text{draft}}$ + 4.8) ÷ 1 | 最多慢 $t_{\text{draft}}$ |

### 采样时

图上是 greedy：猜测等于 target 会选的 token 就留下。采样时用接受检验：每个猜测以 $\min(1, p_{\text{target}} / p_{\text{draft}})$ 的概率保留，被拒的位置从修正后的分布重采样，输出的分布和 target 自己采样完全相同（本章 prose，Leviathan et al., 2023）。

### 接下来

$\tau$ 取决于 $t_{\text{draft}}$ 和 $a$。第 4 步列出三种 drafter，它们在这两个量上取舍不同。

## 第 4 步 · 三种 drafter：同样 4 个猜测，三种做法

> **一句话：** EAGLE 一个 pass 猜一个，DFlash 一个 pass 全猜完，DSpark 在 DFlash 的一个 pass 后加一条短链，把每个猜测连到前一个。

### 图上是什么

三张卡片，每张从下往上读：底部是输入，中间是 draft 的 pass（橙色），顶部是 4 个猜测 `Paris`、`.`、`The`、`city`。

| 卡片 | 输入 | pass | 猜测之间 |
|---|---|---|---|
| 1 · EAGLE | `is` | pass 1–4，虚线把每个猜测喂进下一个 pass | 每个猜测看到前一个（绿字） |
| 2 · DFlash | `is` + 3 个空位 | 一个 pass | 每个猜测独立产生（红字） |
| 3 · DSpark | `is` + 3 个空位 | DFlash 的一个 pass，猜测之间有绿色箭头 | 每个猜测看到前一个（绿字） |

**drafter** 就是第 3 步的 draft 模型；这三种都是专为某个 target 训练的小模型。

### 放进第 3 步的公式

$\tau = (t_{\text{draft}} + t_{\text{mem}}) / (a + 1)$：

| drafter | $t_{\text{draft}}$ | $a$ |
|---|---|---|
| EAGLE | $k$ 个 pass 串行，随 $k$ 增长 | 高：每个猜测知道前一个 |
| DFlash | 一个 pass，与 $k$ 无关（第 1 步：多几个 position 不加读取） | 靠后的猜测更容易错 |
| DSpark | 一个 pass 加一条很短的串行链 | 用链接补回靠后的猜测 |

### SGLang 里怎么开

| drafter | 参数 | 默认 |
|---|---|---|
| EAGLE-3 | `--speculative-algorithm EAGLE3` | Llama 模型：5 个 draft step、每步 4 个分支、验证 8 个 token |
| DFlash | `--speculative-algorithm DFLASH` | 一块 16 个 position（draft 模型配置没写时） |
| DSpark | `--speculative-algorithm DSPARK` | 自己的 `--speculative-dspark-block-size` |

卡片各画 4 个猜测，只为对齐比较。以上按 SGLang 主仓库的参数处理代码核对。图上脚注说 DSpark 用 DFLASH 的 block 标志；现在的 SGLang 里 DSpark 是独立的算法，有自己的 block 参数。

### 接下来

第 5–7 步每种一步，按卡片顺序。

## 第 5 步 · EAGLE：一个小层，每个 pass 猜一个

> **一句话：** EAGLE 的 drafter 是一个 transformer 层（head），读 target 自己的隐藏状态；4 个猜测要 4 个串行的 pass。

### 图上是什么

- ① target 的 32 层，从左到右画成 32 根竖条；亮起的 3 根标「低层、中层、高层」，箭头连到 pass 1：「它在 3 个深度的隐藏状态，进入 pass 1」。
- ② 链条：`is` → head pass 1 → `Paris` → head pass 2 → `.` → head pass 3 → `The` → head pass 4 → `city`。
- ③ 4 段橙色时间条排成一行：「4 个 pass，一个接一个：每个都等前一个猜测」。
- 说明行：然后 target 用一个 pass 检查全部 4 个猜测（第 3 步）。

### 隐藏状态

**隐藏状态**是第 1 步里 $x$ 的一行经过某一层之后的样子，每个 position 4,096 个数。target 在自己的 pass 里本来就要算出它们，所以 EAGLE 拿来用不额外花 target 的时间。EAGLE-3 取低、中、高三层的融合起来，作为 pass 1 的输入；图上三层的位置是示意。

### 公式

$$
t_{\text{draft}} = k \cdot t_{\text{head}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $k$ | 猜测数 | 4 | 第 2 步 |
| $t_{\text{head}}$ | head 跑一个 pass 的时间 | 图上为示意长度 | 本步 |
| $t_{\text{draft}}$ | draft 的总时间 | | 第 3 步 |

pass $j$ 的输入是 pass $j-1$ 的猜测，所以不能并行，$t_{\text{draft}}$ 随 $k$ 线性增长。head 只有一层（target 有 32 层），一个 pass 很短；但按第 1 步的规则，它至少要花读自己权重的时间，而 $k$ 个这样的 pass 都排在 target 的验证 pass 前面。

### 为什么 $a$ 高

每个猜测都在知道前一个猜测的情况下做出（`The` 之后猜 `city`），和 target 自己一个接一个写的方式一致，所以常和 target 一致。

### SGLang 的分支

SGLang 还会分支（脚注，`--speculative-eagle-topk 4`）：每步保留 4 个候选，最可能的 8 个按树一起送去验证。图上只画一条链。

### 接下来

第 6 步：DFlash 把 $k$ 个串行 pass 换成一个 pass。

## 第 6 步 · DFlash：一个 pass 出全部 4 个猜测

> **一句话：** DFlash 的 drafter 是自己的 5 个小层，以 target 的隐藏状态为 context；`is` 和 3 个空位一起过一次，4 个猜测同时出来。

### 图上是什么

- ① target 的 32 层，亮起 5 根（位置为示意），向下的箭头。
- ② 蓝框「context：拼接 target 的 5 个隐藏状态」，箭头分别进入 drafter 的每一层（「进入每个 drafter 层」）。
- ③ 输入 4 行：`is` 和 3 个虚线「空位」。
- ④ drafter 自己的 5 层（编号 1–5 的浅橙色竖条），「只跑一次」。
- ⑤ 输出 4 个猜测 `Paris`、`.`、`The`、`city`，「一起出来」。
- 说明行：对话中第 1 个猜测 72% 存活，第 7 个 63%。

论文里，context 投影后加到每个 drafter 层的 key 和 value 上（本章 prose）。

### 公式：存活率怎么变成 $a$

$$
P_j = r_1 \, r_2 \cdots r_j,\qquad
\mathbb{E}[a] = \sum_{j=1}^{k} P_j
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $r_j$ | 前 $j-1$ 个都被接受时，第 $j$ 个猜测被接受的概率 | 对话中 $r_1 = 0.72$，$r_7 = 0.63$ | 本步，图上说明行 |
| $P_j$ | 第 $j$ 个猜测算数的概率：1 到 $j$ 都要被接受 | | 本步 |
| $a$ | 一轮被接受的猜测数 | | 第 3 步 |
| $k$ | 一轮的猜测数 | | 第 2 步 |

第 3 步的规则从左往右比、遇错就停，所以第 $j$ 个猜测只有在前面全对时才算数，$a$ 就是算数的猜测个数，平均值是各 $P_j$ 之和。

### 代入数

假设 7 个位置的 $r_j$ 都是 0.72（只为看乘积怎么衰减，不是论文的数）：

| $j$ | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| $P_j = 0.72^j$ | 0.72 | 0.52 | 0.37 | 0.27 | 0.19 | 0.14 | 0.10 |

$\mathbb{E}[a] = 2.31$，每轮约 3.3 个 token。实际靠后的 $r_j$ 更低（第 7 个是 0.63），乘积衰减得更快。

### 代价在哪

- $t_{\text{draft}}$：一次 drafter pass。按第 1 步，填 4 个还是默认的 16 个 position，都是一个 pass。
- $a$：第 3 行在不知道第 2 行是 `.` 的情况下填出，靠后的行猜得更盲，$r_j$ 下降。

存活率出自 DSpark 论文，脚注写的 target 是 Qwen3-4B。

### 接下来

第 7 步：DSpark 给 DFlash 补上猜测之间的链接。

## 第 7 步 · DSpark：DFlash 的一个 pass，再用小 head 连起猜测

> **一句话：** DSpark 跑 DFlash 的一个 pass，再用一个小 head 让每个猜测参考前一个，并估计每个猜测存活的机会，只把值得检查的送给 target。

### 图上是什么

从左到右五列：

- ① 输入：`is` 和 3 个空位。
- ② 「DFlash 的一个 pass」（同第 6 步）。
- ③ 「连起来的猜测」`Paris`、`.`、`The`、`city`，相邻两个之间有绿色箭头，标「小 head」。
- ④ 「存活机会」：0.95、0.85、0.68（绿条），0.21（红条）；一条红色虚线「截断」画在第 3 和第 4 个之间。
- ⑤ 「target 检查 3 个」：`Paris` ✓、`.` ✓、`It`（自己的），第 4 行「未送出」。
- 两条说明：链接让每个新猜测基于前一个；截断是因为 batch 满时检查很可能错的猜测会挤占其他 request。

小 head 是来自上一个猜测的 rank-256 偏置（脚注）：上一个 token 通过一个小矩阵改变下一个猜测的分数，串行，但每一环很便宜。

### 公式

$$
\hat P_j = \hat r_1 \, \hat r_2 \cdots \hat r_j
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $\hat r_j$ | DSpark 对第 6 步 $r_j$ 的估计：第 $j$ 个猜测自身的分数 | 本步 |
| $\hat P_j$ | 图上的「存活机会」，第 6 步 $P_j$ 的估计 | 本步 |

和第 6 步同一个道理：第 $j$ 个要存活，上面的都必须存活。

### 代入图上的数

| $j$ | 猜测 | $\hat r_j$ | $\hat P_j$ |
|---|---|---|---|
| 1 | `Paris` | 0.95 | 0.95 |
| 2 | `.` | 0.89 | 0.95 × 0.89 ≈ 0.85 |
| 3 | `The` | 0.80 | 0.85 × 0.80 = 0.68 |
| 4 | `city` | 0.31 | 0.68 × 0.31 ≈ 0.21 |

$\hat r_j$ 由图上的 $\hat P_j$ 相除得到（0.85 ÷ 0.95 ≈ 0.89 等）。这些数是示意。

按第 6 步，送 4 个时 $\mathbb{E}[a]$ 的估计是 0.95 + 0.85 + 0.68 + 0.21 = 2.69，送 3 个是 2.48：去掉 `city` 少 0.21 个期望 token，省一个 position。

### 结果和第 3 步一样

target 检查 `Paris`、`.`、`The`：`Paris` ✓，`.` ✓，`The` 换成 `It`。$a = 2$，这一轮写出 3 个，验证 pass 少一个 position。

### 为什么要截断

单个 request 时多一个 position 几乎不要钱（第 1 步）。但一个 batch 的验证 pass 带着所有 request 的 position，每步超过约 300 个 position 后，时间由计算决定而不是读取（第 4 章第 8 步）。那时一个 0.21 的猜测会占掉另一个 request 更可能对的猜测。

### 接下来

第 8 步看三种 drafter 实际每个 target pass 写出几个 token。

## 第 8 步 · 有用吗：每个 target pass 的 token 数

> **一句话：** 普通 decode 每个 target pass 写 1 个 token；同样训练数据、每轮 7 个猜测，三种 drafter 写 2.7 到 6.2 个，DSpark 在三个领域都最多。

### 图上是什么

- 三组柱子：GSM8K（数学）、HumanEval（代码）、MT-Bench（对话）。
- 每组四根：虚线框的 1（普通 decode），灰蓝 EAGLE-3，橙色 DFlash，绿色 DSpark。
- 纵轴 0、2、4、6；越高越好。
- 两条说明：每 pass 的 token 数就是 pass 数减少的倍数；还要扣掉 draft 自己的时间。

### 公式

$$
L = \mathbb{E}[a] + 1,\qquad L \le k + 1
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $a$ | 一轮被接受的猜测数 | | 第 3 步 |
| $\mathbb{E}[a]$ | $a$ 在所有轮上的平均 | | 第 6 步 |
| $k$ | 每轮的猜测数 | 7 | 本步（脚注） |
| $L$ | 每个 target pass 写出的 token 数，即柱高 | 最多 8 | 本步 |

### 代入图上的数

| 领域 | EAGLE-3 | DFlash | DSpark | DSpark ÷ EAGLE-3 |
|---|---|---|---|---|
| GSM8K · 数学 | 5.30 | 5.33 | 6.17 | 1.16× |
| HumanEval · 代码 | 4.33 | 4.64 | 5.52 | 1.27× |
| MT-Bench · 对话 | 2.66 | 3.11 | 3.72 | 1.40× |

差距在对话上最大，那里猜测错得最多。

### 换成时间

- 100 个 token 的对话：普通 decode 100 个 pass，DSpark 约 100 ÷ 3.72 ≈ 27 个。
- 如果一个 target pass 是第 1 步的 $t_{\text{mem}} = 4.8$ ms，每个 token 里 target 的份额从 4.8 ms 降到 4.8 ÷ 3.72 ≈ 1.3 ms。
- 按第 3 步的 $\tau$ 还要加 $t_{\text{draft}} / L$，图上没画。

### 数据的设定

DSpark 论文 Table 1，target 为 Qwen3-8B；三种 drafter 用同样数据重训，链式 draft，temperature 1 采样（用第 3 步说的接受检验），计数包含 target 自己的 token。DFlash 论文自己和 EAGLE-3 的对比设定不同（tree drafting，temperature 0），数字不能混用（本章 prose）。

### 接下来

第 11–15 章「让一块 GPU 快起来」到此结束。第 16 章开始讲输入输出不只是文本的模型。
