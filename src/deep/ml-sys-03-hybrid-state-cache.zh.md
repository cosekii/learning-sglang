## 第 1 步 · 同一个短请求，两种等待

**一句话。** 原文只改 `num_batch`，短请求从 3.95 秒降到 0.91 秒，冷启动则从 16.9 秒增到 28.4 秒。

### 图上是什么

- 两行使用同一台机器、同一个 5,500 token system 和同一批短 user；唯一改动的实验设置是 `num_batch`。
- 蓝色横条是短请求总耗时，使用同一把 3.95 秒标尺。右列是日志报告的 prefill 重算 token 范围，不是 user 本身的长度。
- 下方同时写出每次短请求少等的 3.04 秒和冷启动多等的 11.5 秒，避免只报收益。

### 公式与符号

$$W_{\mathrm{saved}}=W_{1024}-W_{64},\qquad r=\frac{W_{1024}}{W_{64}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $W_{1024}$ | `num_batch = 1024` 时的短请求总耗时 | 原文第 572–579 行，3.95 秒 |
| $W_{64}$ | `num_batch = 64` 时的短请求总耗时 | 同一表，0.91 秒 |
| $W_{\mathrm{saved}}$ | 每条短请求少等的时间 | 本步计算 |
| $r$ | 默认设置的等待是调小后的多少倍 | 本步计算 |

### 代入图上的数

$$W_{\mathrm{saved}}=3.95-0.91=3.04\ \mathrm{s}$$

$$r=\frac{3.95}{0.91}\approx4.3,\qquad \Delta W_{\mathrm{cold}}=28.4-16.9=11.5\ \mathrm{s}$$

这里的 4.3 倍是**总耗时之比**，不是吞吐提升。原文每个条件都卸载模型后独立冷启动，预热一次，再发三条短 user；条件之间不共享 cache，条件内部保留真实使用时的 cache 复用。原文还在一天 200 条请求的假设下选择 64，本步不把那个选择推广到其他请求频率或硬件。

### 接下来

重算量随设置变化已经很清楚。下一步先看全注意力为什么能只算新的短 user。

来源：`Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:566-599`。

## 第 2 步 · 全注意力按 token 留格子

**一句话。** 全注意力把每个 token 的 K/V 放在独立槽位，共同前缀之后的旧尾部可以直接释放。

### 图上是什么

- 旧、新请求都有 5,500 token system 和 40 token user。蓝色表示相同且可以复用的前缀，橙色表示要计算的新 user，斜线表示旧 user 的槽位可以释放。
- 第三行把新请求要用的 KV cache 单独画出：前 5,500 格直接读旧结果，后 40 格写入新结果。每个色块代表一段槽位，宽度不按 token 数成比例。
- 第 1 本 Ch. 8 Steps 2–3 已经说明：只有从头开始相同的 token 才能复用；第一次不同之后都属于新尾部。

### 公式与符号

$$C_{\mathrm{KV}}=E-M$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $C_{\mathrm{KV}}$ | 全注意力新请求需要 prefill 的 token 数 | 本步计算 |
| $E$ | 新请求的 prompt 末尾位置 | $5{,}500+40=5{,}540$ |
| $M$ | 从头逐 token 匹配的共同前缀长度 | 原文简化例，5,500 |

### 代入图上的数

$$E=5{,}500+40=5{,}540,\qquad C_{\mathrm{KV}}=5{,}540-5{,}500=40$$

第 $i$ 格的 K/V 由前 $i$ 个 token 决定。后续 token 只会追加新槽位，不改前 $i$ 格，所以旧请求和新请求在共同前缀里的 K/V 相同。释放尾部只是把游标和空闲标记改到第 5,500 格，不需要重算前缀。

### 接下来

这个结果依赖「每个位置都另存一份」。下一步换成只保存一份汇总的 recurrent state。

来源：`Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:71-89`；第 1 本 Ch. 3 Steps 1–3、Ch. 8 Steps 2–3。

## 第 3 步 · recurrent state 只留当前摘要

**一句话。** recurrent state 把已有 token 压进一份定长摘要；旧 user 也更新进去以后，cache 里没有第 5,500 个 token 时的另一份摘要。

### 图上是什么

- 上方蓝色是共同的 5,500 token system，斜线是旧 40 token user。它们依次更新同一个橙色 state，而不是各写一格。
- 橙色框是处理到 5,540 时的当前摘要。下方虚线框表示新请求想找的第 5,500 个 token 时的摘要。它没有单独保存，当前摘要也无法单独减去旧 user。
- 本步只讲 cache 里保存了什么。token 内容匹配仍然成立，缺的是与匹配位置对应的历史 state。

### 公式与符号

$$S_t=U(S_{t-1},x_t)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $S_t$ | 处理完第 $t$ 个 token 后的 recurrent state | 本步的抽象记号 |
| $S_{t-1}$ | 处理前一个 token 后的 state | 同一递推关系 |
| $x_t$ | 第 $t$ 个 token 的模型输入表示 | 第 1 本 Ch. 2 的逐 token 计算 |
| $U$ | 当前 recurrent layer 的更新计算 | 本步把它作为整体，不展开内部公式 |

### 代入图上的数

处理 5,540 个 token 后，cache 持有 $S_{5{,}540}$。新请求需要 $S_{5{,}500}$ 才能只算 40 个新 token，但本例只留当前 state，没有保存 $S_{5{,}500}$。state 的形状不随 token 数增加，省下了逐位置存储，也失去了直接按位置读取历史 state 的能力。

真实 Gated DeltaNet 的更新还包含擦除与门控遗忘；本章不展开这些公式，因为裁剪问题只依赖「历史被更新进一份 state」这一性质。llama.cpp 另有 `n_rs_seq` 限制的逐 token 快照环，可以回滚很短的距离；它是有额外观存副本的例外，不改变本图「没有另存历史副本」的前提。

### 接下来

既然历史位置没有自动留下副本，就在选定位置主动抄一份 state，形成 checkpoint。

来源：`Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:93-165`；llama.cpp `7e4c0a96880dae4fc4268ad441f8a6446bd5460a` 的 `src/llama-memory-recurrent.cpp:170-189`、`common/common.h:970-975`。

## 第 4 步 · 从最近的可用 checkpoint 重放

**一句话。** checkpoint 主动保存某个位置的整份 state；新请求从不超过匹配末尾的最新副本恢复，再算到新的 prompt 末尾。

### 图上是什么

- 蓝线是新旧请求相同的 5,514 个 token。橙色段是新 prompt 末尾前的重放范围，红色旧尾部副本越过了匹配位置，不能使用。
- 5,514 是理想的续算位置，但这里没有 state 副本。最新可用副本在 4,536，所以引擎先恢复该点，再处理到 5,558。
- 位置间距不按 token 数成比例。1,022 是图上位置相减的结果；原文日志写「约 1,020 个重算 token」，两者口径不同，本步不把约数改成精确等式。

### 公式与符号

$$D=E-M,\qquad C\approx E-P,\qquad P\le M$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $E$ | 新 prompt 的末尾位置 | 日志例，5,558 |
| $M$ | 新旧请求的共同前缀末尾 | 日志例，5,514 |
| $P$ | 最新可用 checkpoint 的位置 | 日志例，4,536 |
| $D$ | 新尾部包含的 token 数 | $E-M$ |
| $C$ | 从 checkpoint 到末尾的重算量 | $E-P$ 的近似 |

### 代入图上的数

$$D=5{,}558-5{,}514=44$$

$$5{,}558-4{,}536=1{,}022\ \text{个位置}\quad\Longrightarrow\quad C\approx1{,}020\ \text{个 token}$$

因此约 1,020 个重算 token 中只有 44 个属于新尾部，约 $1{,}020-44=976$ 个是已经走过的位置。llama.cpp 恢复时从后往前找 checkpoint，并拒绝 `cur.pos_max > pos_next` 的点；这就是旧尾部副本不能用的源码依据。

原文对 `num_batch` 与回退距离的精确关系保留了两处未解释之处。本步只使用日志、位置减法和已核对的恢复条件，不把「约等于一个 batch」写成普遍定律。

### 接下来

全注意力本来可以在 5,514 裁剪，recurrent state 却要到 4,536 恢复。下一步看 hybrid 模型怎样让两类 layer 对齐。

来源：`Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:139-165,202-221,385-458`；llama.cpp `7e4c0a96880dae4fc4268ad441f8a6446bd5460a` 的 `tools/server/server-context.cpp:3253-3288`。

## 第 5 步 · hybrid 请求对齐到同一个恢复点

**一句话。** SGLang 可以沿 radix 树匹配到更深的位置，但只返回最后一个仍带 Mamba state 的节点之前的 KV。

### 图上是什么

- $M=5{,}514$ 是逐 token 匹配到达的位置，全注意力的 KV 本来能复用到这里；$P=4{,}536$ 是匹配路径上最新仍存 Mamba state 的位置。
- 橙色段从 $P$ 一直到新 prompt 末尾 $E=5{,}558$。hybrid 结果行把这一段作为共同 prefill 范围，不让两类 layer 各选一个起点。
- 数字沿用上一步的 llama.cpp 日志，只为对照位置关系；本步不是一条 SGLang 实测日志。源码事实是返回数组的截断规则。

### 公式与符号

$$B=P,\qquad R=E-P,\qquad P\le M\le E$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $B$ | 本例的 `best_value_len`，即可返回的 KV 前缀长度 | 本步示意，$P=4{,}536$ |
| $P$ | 匹配路径上最新仍带 `mamba_value` 的位置 | `_match_prefix_helper` 的候选更新条件 |
| $M$ | 逐 token 匹配到达的位置 | 前一步的位置例，5,514 |
| $R$ | 共同恢复点之后的 prefill 位置数 | $E-P$ |

### 代入图上的数

$$R=5{,}558-4{,}536=1{,}022$$

`_match_prefix_helper` 只在 `node.mamba_value is not None` 时更新 `best_value_len` 和 `best_last_node`。即使随后还能继续匹配 token，`_match_post_processor` 最后仍执行 `value = value[:best_value_len]`。所以图里的返回前缀停在 $P$，不是停在更深的 $M$。

这并不改变全注意力 KV 的逐 token 语义，也不表示所有 hybrid 引擎都只能这样调度；它说明这份 SGLang 实现怎样为一次请求选出两类 layer 共用的前缀。

### 接下来

最后一个问题是谁来保存这些节点，以及 state 被淘汰后 token 路径是否还在。下一步看同一棵树上的墓碑节点。

来源：SGLang `385903b0acd69455cb688b5cb5e3afcc0fd91598` 的 `python/sglang/srt/mem_cache/mamba_radix_cache.py:1086-1126,1137-1206`；`Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:624-658`。

## 第 6 步 · 墓碑留下路径，拿走恢复能力

**一句话。** 内部节点的 Mamba state 可以独立淘汰；token 边、全注意力 KV 和子节点仍在，但匹配不能再从这里恢复。

### 图上是什么

- 蓝色路径从更早前缀 $P$ 到共同前缀 $M$。$P=4{,}536$ 仍有 state；$M=5{,}514$ 的 `mamba_value` 已置为 `None`，所以画成红色虚线墓碑。
- 旧 user 的叶节点仍可有 state，但它已经包含不同尾部，不能服务新请求。橙色新尾部 $E=5{,}558$ 必须计算。
- token 匹配仍能沿树到 $M$，恢复候选却跳过 $M$、停回 $P$。因此重放覆盖 $P\rightarrow M\rightarrow E$，不是只算 $M\rightarrow E$。

### 公式与符号

$$V(n)=1\iff n.\texttt{mamba\_value}\ne\texttt{None}$$

$$P=\max\{\operatorname{pos}(n):n\in\operatorname{path}(M),\ V(n)=1\},\qquad R=E-P$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $V(n)$ | 节点 $n$ 是否仍有可恢复的 Mamba state | 节点的 `mamba_value` 是否非空 |
| $\operatorname{path}(M)$ | 从 root 到匹配位置 $M$ 的节点路径 | radix 树匹配 |
| $P$ | 路径上最新仍满足 $V(n)=1$ 的位置 | `_match_prefix_helper` 的最佳候选 |
| $R$ | 从恢复点到新末尾的重放位置数 | 本步计算 |

### 代入图上的数

$M$ 是墓碑，旧 user 又不在新请求的共同前缀路径上，所以最新可用候选是 $P=4{,}536$：

$$R=5{,}558-4{,}536=1{,}022$$

`evict_mamba` 能选择未加锁的内部节点；`_tombstone_internal_node` 只把 `node.mamba_value` 设为 `None`。这一步本身不删除其子节点或全注意力 KV。相对地，`evict_full` 从未加锁叶节点开始回收；本步不把内部节点的规则套到所有叶节点。

另一个边界也很重要：`_split_node` 会给新父节点写入 `new_node.mamba_value = None`，注释说明 Mamba cache 不能随 token 边切开。因此「分叉处形成内容边界」不等于「这个边界自动带有可用 state」。

### 接下来

本章的回答是：相同 token 给出可匹配的路径，只有该路径上另存的 state 才给出可恢复的位置。下一章把状态分到多张卡，继续看卡与卡怎样交换张量。

来源：SGLang `385903b0acd69455cb688b5cb5e3afcc0fd91598` 的 `python/sglang/srt/mem_cache/mamba_radix_cache.py:861-919,1086-1126,1208-1241,1354-1357`；`Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:660-709`。
