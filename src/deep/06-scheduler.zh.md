## 第 1 步 · 第 5 章停下的地方

> **一句话：** 第 5 章第 9 步里，一个新来者的 prefill 和其他人的 decode 挤在同一步，这一步被拉长到约 7 倍；SGLang 默认不这样混，而是每步只跑一种 batch。

### 图上是什么

- 左边网格就是第 5 章第 9 步的：行是槽位 slot 1–6（batch 里的位置），列是引擎步，每列一次前向。
- 四个窄列：6 个槽位都在 decode，各出一个橙色 token。
- 中间的宽列：slot 3 是蓝色的「新来者的 prefill」；其余 5 个槽位是浅橙色格、右端一条实心橙色，表示它们的 token 要等整次前向结束才出来。
- 宽列上方的红色括号：「一步被拉长到一个 prompt 的计算量」。
- 右边的框「不混合」：一步要么是 prefill batch，要么是 decode batch。
- 底部灰色脚注：SGLang 默认每步只跑一种 batch（vLLM v1 默认混合）；混合在第 7 步回来，有意且有界。

### 公式

一步的耗时沿用第 4 章第 5 步，一步里有 $n$ 个 token：

$$
t_{\text{mem}} = \frac{M_W}{BW},\qquad
t_{\text{comp}}(n) = \frac{n\,f}{F}
$$

$$
t_{\text{step}}(n) = \max\big(t_{\text{mem}},\ t_{\text{comp}}(n)\big)
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n$ | 这一步前向里的 token 数 | | 第 4 章第 3 步 |
| $M_W$ | 每步要读的权重 | 16 GB | 第 4 章第 2 步；`W_GB` |
| $BW$ | HBM 带宽 | 3.35 TB/s | 第 4 章第 5 步；`BW` |
| $f$ | 一个 token 的运算次数 | 16 GFLOP | 第 4 章第 3 步；`GFLOP_PER_TOKEN` |
| $F$ | 每秒运算次数（bf16） | 989 TFLOP/s | 第 4 章第 5 步；`TFLOPS` |
| $t_{\text{mem}}$ | 读一遍权重的时间 | 4.78 ms | 第 4 章第 5 步 |
| $t_{\text{comp}}(n)$ | $n$ 个 token 的计算时间 | | 第 4 章第 5 步 |
| $t_{\text{step}}(n)$ | 一步耗时，两者取较慢的 | | 第 4 章第 5 步 |

本章所有时间都只算权重读取，不算每个用户自己的 KV cache 读取（第 4 章第 6 步），和第 5 章一样。

### 代入图上的数

| 列 | $n$ | $t_{\text{comp}}(n)$ | $t_{\text{step}}$ |
|---|---|---|---|
| 窄列：6 个 decode | 6 | 6 × 16 ÷ 989 = 0.10 ms | 4.78 ms（读取更慢） |
| 宽列：2,000 token 的 prompt + 5 个 decode | 2,005 | 2,005 × 16 ÷ 989 = 32.4 ms | 32.4 ms |

32.4 ÷ 4.78 ≈ 7：宽列里正在 decode 的 5 个槽位，这一个 token 要等平时的约 7 倍。

### 接下来

第 2–3 步说清这两种 batch 是什么；第 4–8 步算「不混合」的代价，以及切 chunk 怎样改变它。

## 第 2 步 · 两个列表，每步一个 batch

> **一句话：** 引擎维护 waiting 和 running 两个列表；每一步从其中一个列表组一个 batch，跑一次前向。

### 图上是什么

- 左边蓝色虚线框「waiting · 需要 prefill」：req 7、8、9，蓝条长度和 prompt 长度成比例（1,200、2,600、800 个 token）。框里注明「prompt token，一个都没处理」「一个 prefill batch：其中一些，一次跑完全部 prompt token」。
- 右边橙色虚线框「running · 还差一个 token」：req 1–6，每条浅橙色是已有的 token，末端实心小块是下一个要出的 token。「一个 decode batch：所有这些，各一个 token」。
- 中间的框「本步」：一个 prefill batch，或 decode batch；下面「一次前向，然后回到这里」。
- 说明行：「默认从不同时跑两种。下一步讲为什么。」

### 两个列表

| 列表 | 放什么 | 下一次前向要做的 | 这种 batch 的 $n$ |
|---|---|---|---|
| waiting | prompt 还没过模型的 request；它们的 K、V 还不在 KV cache 里（第 3 章） | prefill：对整个 prompt 做一次前向 | 选中的 prompt 长度之和 |
| running | 回答到一半的 request；已有的 token 都在 cache 里 | decode：每条再出 1 个 token | 正在运行的条数，也就是第 5 章的 $B$ |

### 一个 request 的路线

1. 到达，进 waiting。
2. 被选进某个 prefill batch，prompt 跑完，拿到第一个 token，移到 running。
3. 每个 decode 步出一个 token。
4. 输出结束 token（第 1 章的 EOS）后离开 running。

### 接下来

第 3 步说明为什么这两种工作要分成两个 batch。

## 第 3 步 · 同一个模型，两种形状

> **一句话：** prefill batch 序列少、每条 token 多、长短不齐，受计算限制；decode batch 序列多、每条 1 个 token，受内存限制。

### 图上是什么

- 左框「一个 prefill batch」：seq 1–3，各 18、27、11 个蓝色方块。方块代表 token；真实 prompt 有几百到几千个 token，图上画少了。
- 左框文字：「序列少 · 各几百 token」「长短不齐」「专属 attention kernel · 受计算限制」「每个 batch 形状都不同」。
- 右框「decode batch」：seq 1–16，各 1 个橙色方块。
- 右框文字：「序列多 · 各一个 token」「只有 batch 大小变化」「另一个 attention kernel · 受内存限制」「每个 batch 大小一份录制 → CUDA graph 回放，第 11 章」。
- 说明行「两种形状 → 两个 batch → 两条快路径」；脚注：拆分解锁独立机器（第 28 章）和 decode 用的 CUDA graph（第 11 章）。

### 用第 4 章第 8 步的分界点来看

分界点 $n^* = F / BW = 989 ÷ 3.35 \approx 295$，图上取整为约 300。一步的 token 数低于它，$t_{\text{step}} = t_{\text{mem}}$；高于它，$t_{\text{step}} = t_{\text{comp}}(n)$。

| | prefill batch | decode batch |
|---|---|---|
| $n$ | prompt 长度之和，几百以上 | 序列条数，这里低于约 300 |
| 一步耗时 | $t_{\text{comp}}(n)$，受计算限制 | $t_{\text{mem}} = 4.78$ ms，受内存限制 |
| attention | 每个 prompt token 对同一 prompt 里更早的 token（第 2 章第 7 步的三角形） | 每条序列 1 个 query 对自己整个 cache（第 3 章） |
| 输入的形状 | 每条长度不同，每个 batch 都在变 | 只由 batch 大小决定 |

### 名词

- **attention kernel**：kernel 是 GPU 上执行的一个函数。SGLang 的每个 attention 后端都分别实现 prefill 用的 `forward_extend` 和 decode 用的 `forward_decode`。
- **CUDA graph**：把一次 decode 步要发给 GPU 的整串 kernel 录下来、以后整串回放（第 11 章）。decode 步输入的形状只由 batch 大小决定，所以每个 batch 大小录一次就够；prefill 的形状每次都不同，这样录不了。

### 接下来

第 4 步把两种 batch 放到一条时间轴上，看默认的「prefill 优先」花了谁的时间。

## 第 4 步 · prefill 优先：新来者快，其他人冻结

> **一句话：** 一个 2,000 token 的 prompt 到达时，默认策略先单独跑它的 prefill；新来者 32 ms 拿到首个 token，其他 64 个用户两个 token 之间等了 37 ms。

### 图上是什么

- 横轴是时间，0 到 100 ms，每 ms 5.6 px。
- 上行「其他人」：64 个正在 decode 的用户。橙色块每块一个 decode 步，末端深色细条是这一步出的 token；灰色块「冻结」是他们拿不到 token 的那一步。
- 下行「新来者」：蓝色块「prefill · 2,000 tokens」，结束处白色圆点「首个 token」；之后它也加入 decode（橙色）。
- 竖虚线「到达」：prompt 在第 3 个 decode 步结束时到达。
- 「步类型」色条：每一步是哪种 batch（蓝 = prefill batch，橙 = decode batch，上蓝下橙 = 混合 batch）。
- 上方红色括号「37 ms 没有 token」。
- 两个数字块：「其他人 · token 间最长间隔」37 ms（红框），「新来者 · 首个 token 用时」32 ms。

### 公式

prompt 有 $P$ 个 token、正在 decode 的有 $B$ 个用户时：

$$
\text{TTFT} = t_{\text{step}}(P)
$$

$$
\text{gap} = t_{\text{step}}(P) + t_{\text{mem}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $P$ | 新 prompt 的 token 数 | 2,000 | 第 1 章的记号；本步 |
| $B$ | 正在 decode 的用户数 | 64 | 第 5 章第 1 步的记号；本步 |
| $\text{TTFT}$ | 首个 token 用时：从到达到首个 token | | 第 4 章第 9 步 |
| $\text{gap}$ | 其他人两个相邻 token 之间的最长间隔 | | 本步 |

gap 为什么多一个 $t_{\text{mem}}$：上一个 token 在到达时出来，prefill 那一步没有 token，下一个要等 prefill 之后那个 decode 步结束。

### 代入图上的数

| 量 | 计算 | 结果 | 图上 |
|---|---|---|---|
| 一个 decode 步 | $B = 64$：$t_{\text{comp}}$ = 64 × 16 ÷ 989 = 1.04 ms，小于 4.78 ms | 4.78 ms | |
| 到达时刻 | 3 × 4.78 | 14.3 ms | 竖虚线 |
| $\text{TTFT}$ | 2,000 × 16 ÷ 989 | 32.4 ms | 32 ms |
| $\text{gap}$ | 32.4 + 4.78 | 37.1 ms | 37 ms |
| 8k 的 prompt（caption） | 8,192 × 16 ÷ 989 | 132.5 ms | 133 ms |

数字块在 gap 超过两个 decode 步（2 × 4.78 = 9.55 ms）时变红。8,192 是 Llama-3-8B 的最大上下文长度。

### SGLang 里

「先跑 prefill」已对源码核对：`Scheduler.get_next_batch_to_run()` 先调 `get_new_batch_prefill()`，组出了 prefill batch 就跑它，否则才跑 running 的 decode batch。

### 接下来

第 5 步：如果等待的不止一个 prompt，冻结更长。

## 第 5 步 · 三个 prompt 合进一个 prefill 步

> **一句话：** 第 2 步的三个 prompt 一起到达，被合进一个 4,600 token 的 prefill 步；三个新来者都要 74 ms，其他人冻结 79 ms。

### 图上是什么

- 和第 4 步同一条时间轴、同样的 64 个用户。
- 下行「新来者们」：一个蓝色长块「prefill · 3 prompts · 4,600 tokens」。
- 竖虚线「到达」：三个 prompt 都在 14.3 ms 到达。
- 红色括号「79 ms 没有 token」；数字块 79 ms（红框）和 74 ms。

### 代入图上的数

用第 4 步的公式，$P$ 换成三个 prompt 之和：

| 量 | 计算 | 结果 | 图上 |
|---|---|---|---|
| $n$ | 1,200 + 2,600 + 800 | 4,600 | |
| $\text{TTFT}$（三个都一样） | 4,600 × 16 ÷ 989 | 74.4 ms | 74 ms |
| $\text{gap}$ | 74.4 + 4.78 | 79.2 ms | 79 ms |
| 800 token 的 prompt 单独跑 | 800 × 16 ÷ 989 | 12.9 ms | |

### 为什么会合在一起

对 GPU 来说合并更省：三个 prompt 只读一次权重。代价落在两类人身上：

- 800 token 的那个 prompt 单独跑只要 12.9 ms，现在也要等 74 ms。
- 64 个正在 decode 的用户，冻结时长随等待中的 token 总数增长，prefill 优先本身不给它设上限。

SGLang 里一个 prefill batch 的 token 数受 `max_prefill_tokens`（默认 16,384）和第 6 步的 chunk 大小限制；图上的 4,600 在这两个上限之内。

### 接下来

第 6 步给 prefill batch 设一个小得多的上限。

## 第 6 步 · 切 chunk，不混合

> **一句话：** 把 prompt 切成最多 512 token 的 chunk，chunk 步和 decode 步交替；冻结从 37 ms 降到 13 ms，首个 token 从 32 ms 推迟到 47 ms。

### 图上是什么

- 同一条时间轴，回到一个 2,000 token 的 prompt。
- 下行「新来者」：四个蓝色块，标着 512、512、512、464。
- 上行：每个 chunk 步对应一块灰色（冻结），chunk 之间各有一个橙色 decode 步。
- 红色括号「13 ms 没有 token」；数字块 13 ms（仍是红框，超过 9.55 ms）和 47 ms。
- 底部灰色脚注：SGLang 默认切 chunk（H100 上 8,192 token），但一个 prompt 的 chunk 连着跑；图上的交替需要 `--prefill-decode-interval 1`。

### 公式

chunk 大小 $C$：一个 prefill batch 最多 $C$ 个 prompt token。prompt 切成 $\lceil P/C \rceil$ 个 chunk，每两个 chunk 之间跑一个 decode 步：

$$
\text{gap} = t_{\text{step}}(C) + t_{\text{mem}}
$$

$$
\text{TTFT} = \sum_{\text{各 chunk}} t_{\text{step}}(\text{chunk 长度}) + \big(\lceil P/C \rceil - 1\big)\,t_{\text{mem}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $C$ | chunk 大小：一个 prefill batch 最多几个 prompt token | 512 | 本步 |
| $\lceil P/C \rceil$ | chunk 个数，向上取整 | 4 | 本步 |
| $P$、$\text{gap}$、$\text{TTFT}$ | 同第 4 步 | | 第 4 步 |

正文的「算术」把 chunk 大小写成小写 $c$；这里用 $C$，因为第 4 章第 6 步的 $c$ 已经是上下文长度。

### 代入图上的数

| 量 | 计算 | 结果 | 图上 |
|---|---|---|---|
| chunk | 512 + 512 + 512 + 464 | 2,000 | 四个蓝块的标注 |
| $t_{\text{step}}(512)$ | 512 × 16 ÷ 989 | 8.28 ms | |
| $t_{\text{step}}(464)$ | 464 × 16 ÷ 989 | 7.51 ms | |
| $\text{gap}$ | 8.28 + 4.78 | 13.1 ms | 13 ms（第 4 步 37 ms） |
| $\text{TTFT}$ | 3 × 8.28 + 7.51 + 3 × 4.78 | 46.7 ms | 47 ms（第 4 步 32 ms） |

gap 只取决于 $C$，不取决于 prompt 多长。一个 chunk 的 K、V 写进 cache，下一个 chunk 直接对它们做 attention，不重算。

### SGLang 里（脚注已对源码核对）

- `chunked_prefill_size` 就是 $C$。不设时按显存大小选，80 GB 的 H100 落在 8,192 那一档。
- 默认情况下，一个 prompt 的下一个 chunk 在下一步就跑，中间没有 decode 步，所以单靠切 chunk 不缩短冻结。
- `--prefill-decode-interval N`：每个 prefill batch 之后先跑 N 个 decode 步，再允许下一个 prefill。默认关闭（0），只有 Hopper 上的 Qwen3-VL 配置会自动设成 22。这里的 N 是图上的写法，和第 1 章的轮数 $N$ 无关。

### 接下来

第 7 步让 chunk 和 decode 搭同一次前向。

## 第 7 步 · 切 chunk，并且混合

> **一句话：** 每步一次前向带一个 236 token 的 chunk 和全部 64 个 decode token，正好落在约 300 的分界点；没有冻结，首个 token 44 ms。

### 图上是什么

- 下行「新来者」：九个蓝色块，前八个标 236，最后一个 112。
- 上行：每一步都是橙色块，都出 token；带 chunk 的步颜色较浅（浅色 = 这一步里还搭着 chunk）。
- 「步类型」色条：带 chunk 的步上蓝下橙，表示混合 batch。
- 没有红色括号；数字块 4.9 ms（不红）和 44 ms。

### 公式

混合步的 token 数是 chunk 加全部 decode：$n = C + B$。让 $n$ 落在分界点上，chunk 就几乎不拉长这一步：

$$
C = n^* - B
$$

$$
\text{TTFT} = \big(\lceil P/C \rceil - 1\big)\,t_{\text{step}}(n^*) + t_{\text{step}}(\text{最后一块} + B)
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n^*$ | 分界点，图上取整为 300 | 300 | 第 4 章第 8 步；组件里的 `BALANCE` |
| $B$ | 正在 decode 的用户数 | 64 | 第 4 步 |
| $C$ | 本步的 chunk 大小 | 236 | 本步 |

### 代入图上的数

| 量 | 计算 | 结果 | 图上 |
|---|---|---|---|
| $C$ | 300 − 64 | 236 | 蓝块标注 |
| chunk 个数 | ⌈2,000 / 236⌉ | 9：8 × 236 = 1,888，最后 112 | 九个蓝块 |
| 满 chunk 的一步 | $n$ = 300：300 × 16 ÷ 989，比 4.78 ms 多 0.08 ms | 4.85 ms | |
| 最后一步 | $n$ = 112 + 64 = 176，低于 295 | 4.78 ms | |
| $\text{TTFT}$ | 8 × 4.85 + 4.78 | 43.6 ms | 44 ms |
| $\text{gap}$ | 每步都出 token，最长的一步 | 4.85 ms | 4.9 ms |

TTFT 比第 6 步的 47 ms 少，因为没有只跑 decode 的步。chunk 用的是 decode 步闲着的算力：64 个 decode token 在 4.78 ms 里只算 1.04 ms。

### SGLang 里（已对源码核对）

- `--enable-mixed-chunk` 打开混合，默认关闭。
- 打开后 chunk 和 decode 共用一个预算：chunk 最多 `chunked_prefill_size` − $B$ 个 token（调度器把 running 的条数作为 `mixed_with_decode_tokens` 传进去）。
- SGLang 不会自动把 chunk 调到分界点。图上的 236 是本章选的大小，相当于把 `chunked_prefill_size` 设成 300。

### 接下来

第 8 步把三种策略的两个数字并排比较。

## 第 8 步 · 三种策略并排

> **一句话：** 同一个 prompt：prefill 优先首个 token 最快（32 ms）但冻结 37 ms；切 chunk 冻结 13 ms；混合没有冻结。chunk 大小 $C$ 在两个数字之间取舍，它由 scheduler 决定。

### 图上是什么

- 三组，每组两根条，同一比例：蓝条「新来者 · 首个 token」，下面一根「其他人 · 最长间隔」（超过两个 decode 步为红色，否则橙色）。
- 每组标题和说明：「prefill 优先 · 一个 prompt，单独一步」「切 chunk，不混合 · 每 chunk 512 token」「切 chunk，混合 · 每 chunk 236 token」。
- 说明行：「decode 步的下限是 4.8 ms：间隔为 4.8 ms 说明没人察觉新来者」。
- 底部脚注同第 6 步。

### 代入图上的数

| 策略 | $\text{TTFT}$ | $\text{gap}$ | gap 条颜色 | 来自 |
|---|---|---|---|---|
| prefill 优先 | 32 ms | 37 ms | 红 | 第 4 步 |
| 切 chunk，$C$ = 512 | 47 ms | 13 ms | 红 | 第 6 步 |
| 混合，$C$ = 236 | 44 ms | 4.9 ms | 橙 | 第 7 步 |

最长的条是 47 ms，其余按它的比例画。混合的 4.9 ms 只比下限 $t_{\text{mem}}$ = 4.78 ms 多 0.08 ms。

### 为什么 $C$ 是旋钮（不混合时）

当 $C$ 大于分界点、每个 chunk 都受计算限制时，各 chunk 的计算时间加起来正好是整个 prompt 的计算时间：

$$
\text{gap} = t_{\text{comp}}(C) + t_{\text{mem}}
$$

$$
\text{TTFT} = t_{\text{comp}}(P) + \big(\lceil P/C \rceil - 1\big)\,t_{\text{mem}}
$$

| $C$ | $\text{gap}$ | $\text{TTFT}$ |
|---|---|---|
| 512 | 8.28 + 4.78 = 13.1 ms | 32.4 + 3 × 4.78 = 46.7 ms |
| 2,000 | 32.4 + 4.78 = 37.1 ms | 32.4 ms（回到 prefill 优先） |

$C$ 越大，gap 越大、TTFT 越小。模型的权重和计算对任何 $C$ 都一样，变的只是步的顺序，而顺序由 scheduler 决定。

### 接下来

第 9 步把 scheduler 每一步做的判断画成流程图。

## 第 9 步 · scheduler 的一步

> **一句话：** 每步先问「有人等待，且 cache 有空位吗？」；是就组 prefill batch（开了混合再带上 decode），否就跑 decode batch；跑完一次前向回到顶部。

### 图上是什么

- 顶部判断框：「有人等待，且 cache 有空位吗？」；下面两行「cache 的问题见第 7 章」「若设间隔 N，还要求：上次 prefill 后已有 N 个 decode 步」。
- 「是」→ 蓝框「一个 prefill batch」：从 waiting 列表按策略顺序取（先来先服务 · 最短优先 · 最长缓存前缀），不超过 chunk 大小。框里两个小框：
  - 「关闭混合 · 默认」：prefill 单独跑，运行中的等一步。
  - 「开启混合 · 第 7 步」：每个运行中 request 的下一个 token 在同一次前向中跑，两者共享 chunk 大小。
- 「否」→ 橙框「decode batch」：所有运行中的各一个 token；完成的序列离开，释放它们的 cache；每个 batch 大小一份录制 → CUDA graph 回放，第 11 章。
- 两条路汇到黑色条「一次前向 · 然后回到顶部」，虚线绕回判断框。
- 底部两行脚注：SGLang 的四个设置 `schedule_policy`、`chunked_prefill_size`、`prefill_decode_interval`、`enable_mixed_chunk`；这个循环就是 `Scheduler.get_next_batch_to_run()`。

### 每个部分对应本章哪一步

| 流程图里 | SGLang 设置 | 默认 | 本章 |
|---|---|---|---|
| 有人等待 | waiting 列表 | | 第 2 步 |
| 上次 prefill 后 N 个 decode 步 | `prefill_decode_interval` | 0（关闭） | 第 6 步 |
| 按策略顺序 | `schedule_policy` | `fcfs` | 本步 |
| 不超过 chunk 大小 | `chunked_prefill_size` | H100 上 8,192 | 第 6 步 |
| 开启混合 | `enable_mixed_chunk` | 关闭 | 第 7 步 |
| decode batch | running 列表 | | 第 2、3 步 |

### 三种排序策略

图上的三种都在 `schedule_policy` 的可选值里（源码另有 `random`、`dfs-weight`、`lof`、`priority` 等）：

- **先来先服务**（`fcfs`，默认）：按到达顺序。
- **最短优先**（`shortest-prefill-first`，实验性）：还没进 cache、要真正算的 token 少的先跑。
- **最长缓存前缀**（`lpm`，longest prefix match）：prompt 开头已经在 cache 里的部分最长的先跑；这种前缀缓存是第 8 章。

### 两条路各发生什么

- **是**：从 waiting 取 request，直到它们的 prompt token 数达到 $C$。关闭混合时 running 的用户这一步拿不到 token，就是第 4–6 步的 gap；开启混合时它们的 $B$ 个 token 也进这次前向，占同一个预算，如第 7 步 236 + 64 = 300。
- **否**：running 的每条出 1 个 token，$n = B$；只要 $B$ 低于约 300，$t_{\text{step}} = t_{\text{mem}}$。输出结束 token 的 request 离开 running、释放 cache，下一次 prefill 才有空位。

源码里的一处细节：间隔 N 只在 running 的条数不少于 `prefill_decode_interval_min_bs`（默认 0）时生效；没有人在 decode 时也不等。

### 接下来

判断框里的「cache 有空位」具体指什么、怎么算，第 7 章讲。
