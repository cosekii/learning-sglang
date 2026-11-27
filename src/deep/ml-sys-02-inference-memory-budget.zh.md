## 第 1 步 · 调大静态比例，KV 空间从哪里来

**一句话。** `mem_fraction_static` 不改变已经装入的模型；它改变给其他工作留多少余量，从而改变剩余多少空间给 KV cache。

### 图上是什么

- 本例沿用原文的约数：装入模型前，当前可用显存约 78 GB；装入后约 18 GB。两者相差约 60 GB，本步在无 LoRA 的范围内把它画成模型装入占用。
- 上下两条预算使用同一把 78 GB 标尺。橙色模型装入都约 60 GB，不随比例改变；灰色斜线是动态余量，蓝色是 KV cache，红色表示 KV 还缺多少。
- 0.70 时，模型装入约 60 GB，加动态余量 23.4 GB，已经超过 78 GB；KV 为 −5.4 GB，表示少了 5.4 GB，不是图里真的存在一块「负显存」。
- 0.85 时，动态余量缩到 11.7 GB，KV 得到 6.3 GB。约 60 + 6.3 + 11.7 = 78 GB。
- KV cache 保存 token 历史，后续生成可以复用旧结果。本步只算它分到多少空间，不讲 KV page 或请求准入。

### 公式与符号

设装入模型前的当前可用显存为 $P$，装入后的当前可用显存为 $Q$，比例为 $f$，动态余量为 $R$，KV 空间为 $K$：

$$R=(1-f)P,\qquad K=Q-R=Q-(1-f)P$$

模型装入前后减少的可用显存为 $M=P-Q$，所以也可以写成：

$$K=fP-M$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 装入模型前的当前可用显存 | `pre_model_load_memory`；本例约 78 GB |
| $Q$ | 装入模型后的当前可用显存 | `post_model_load_memory`；本例约 18 GB |
| $M$ | 装入前后减少的可用显存 | $P-Q$；本例约 60 GB |
| $f$ | `mem_fraction_static` | 本例比较 0.70 与 0.85 |
| $R$ | 给静态分配外工作留下的动态余量 | $(1-f)P$ |
| $K$ | 可用于 KV 池的空间 | $Q-R$ |

$P$ 是当前可用量，不是显卡标称总显存。CUDA context、通信缓冲区或其他进程可能已经占去一部分。$M$ 是装入前后读数之差；启用 LoRA 时还可能包含相关预分配，本步明确排除这种情况。

### 代入图上的数

当 $f=0.70$：

$$R=(1-0.70)\times78=23.4\ \mathrm{GB}$$

$$K=18-23.4=-5.4\ \mathrm{GB}$$

当 $f=0.85$：

$$R=(1-0.85)\times78=11.7\ \mathrm{GB}$$

$$K=18-11.7=6.3\ \mathrm{GB}$$

比例从 0.70 调到 0.85，模型装入读数不变。动态余量减少 11.7 GB：

$$23.4-11.7=11.7\ \mathrm{GB}$$

KV 空间同样增加 11.7 GB：

$$6.3-(-5.4)=11.7\ \mathrm{GB}$$

原文写的是 GB；代码辅助函数把字节数除以 `1 << 30`，本步保留原文的约数，不另做单位换算。

### 源码怎样算出 KV 空间

SGLang 在分布式初始化后、模型装入前读取 `pre_model_load_memory`，在模型装入后、KV 池创建前读取 `post_model_load_memory`。CUDA 上，辅助函数通过 `torch.cuda.mem_get_info` 读取当前空闲量；分布式运行取各 rank 的最小值。

`model_runner_kv_cache_mixin.py` 直接计算 `rest = post_model_load_memory - pre_model_load_memory * (1 - mem_fraction_static)`，再交给 KV 池配置。默认配置器把可用字节换算成 token 数并按 page 对齐；若 `max_total_num_tokens <= 0`，启动会失败。因此 −5.4 GB 表示这次尺寸计算无法成立，不是一种可继续运行的 KV 配置。

### 边界与出处

动态余量不等于已经全部占用。KV 池初始化先于 CUDA Graph capture，激活也会随运行变化；灰色区域只是给其他工作留出的空间，不能叫作「启动后仍然空闲的显存」。本步只讲单 GPU、无 LoRA、无 hybrid/mamba 池的尺寸关系，不讲 KV 字节推导、paging、准入、graph 录制、运行时 OOM 调参或多模态预留。

以下来源位于 `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7` 与 `sglang@4fa3482`：

- 原文的两次读数、公式和 −5.4／6.3 GB 例子：`sglang/kvcache-code-walk-through/mem-fraction-static.md:34-60,73-85`。
- [装入模型前读取可用显存：`model_executor/model_runner.py:451-452,1083-1088`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L1083-L1088)。
- [CUDA 读取空闲显存、分布式取最小值、字节换算：`utils/common.py:498-525,594-601`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/utils/common.py#L498-L525)。
- [装入模型与 KV 池初始化顺序：`model_executor/model_runner.py:567-569,656-677`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L656-L677)。
- [`rest` 的直接计算：`model_executor/model_runner_kv_cache_mixin.py:56-70`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner_kv_cache_mixin.py#L56-L70)。
- [非正 token 数不能启动：`model_executor/pool_configurator.py:39-44,170-175`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/pool_configurator.py#L170-L175)。
- [KV 池后才 capture CUDA Graph：`model_executor/model_runner.py:676-677,709-726`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L709-L726)。
- [参数说明区分权重与 KV 池、激活与 graph 缓冲区：`server_args.py:1227-1236`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1236)。

### 接下来

下一步沿着 0.85 的成功启动顺序，依次看模型、KV pool 和 CUDA Graph 缓冲怎样进入同一张卡。

## 第 2 步 · 启动顺序

**一句话。** SGLang 先装模型，再建 KV pool，最后在剩下的动态余量里分配 CUDA Graph 的输入输出缓冲。

### 图上是什么

- 顶部沿用第 1 步 0.85 的成功预算，仍是同一把 78 GB 标尺：橙色模型约 60 GB，蓝色 KV 为 6.3 GB，灰色动态余量为 11.7 GB。
- 三张卡按执行顺序出现。模型装入完成后才创建 KV pool，graph 缓冲分配又在 KV pool 之后。
- `G` 表示 CUDA Graph 的输入输出缓冲。指向灰色区域的箭头说明缓冲使用动态余量，不表示它们独占全部 11.7 GB。
- 本例没有测量 `G` 的大小，所以图上写 `G = ? GB`，不编一个分项数值。

### 公式与符号

这张卡的约数预算是 $M+K+R=P$。graph 缓冲是 $R$ 的一种用途，分配后满足 $0<G\le R$。

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 装入模型前的当前可用显存 | 第 1 步；78 GB |
| $M$ | 模型装入前后减少的可用显存 | 第 1 步；约 60 GB |
| $K$ | KV pool 分到的空间 | 第 1 步；0.85 时为 6.3 GB |
| $R$ | 动态余量 | 第 1 步；0.85 时为 11.7 GB |
| $G$ | CUDA Graph 输入输出缓冲 | 本步；没有实测大小 |

### 代入图上的数

$$M+K+R\approx60+6.3+11.7=78\ \mathrm{GB}$$

包含关系写成 $G\le11.7\ \mathrm{GB}$。它是预算边界，不是实测值，也不是 allocator 单独强制执行的配额。

### 源码顺序与边界

`ModelRunner` 先装入模型，再初始化 KV pool，之后初始化 device graph。`CudaGraphRunner` 分配 capture 使用的输入缓冲。下一步把「分配缓冲」与「记录计算」分开看。

以下来源位于 `sglang@4fa3482`：

- [模型、KV pool、device graph 的初始化顺序：`model_executor/model_runner.py:567-569,656-677,709-726`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L709-L726)。
- [capture 输入缓冲的分配：`model_executor/cuda_graph_runner.py:624-655`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L624-L655)。
- [权重与 KV pool 和激活与 graph buffers 的分类：`server_args.py:1227-1238`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238)。

本步不测量缓冲字节，也不展开临时 workspace、多模态预留和其他进程。

### 接下来

下一步记录一张 graph，看这次记录使用哪些缓冲。

## 第 3 步 · capture 记录计算

**一句话。** capture 用固定的输入输出缓冲执行并记录 GPU 步骤，然后把记录好的 graph 和这些缓冲都留给重放。

### 图上是什么

- `G.input` 收到本例的输入 token。GPU 步骤执行后，`G.output` 收到输出 token。
- 同时，右栏按顺序把 GPU 步骤记录成一张 graph。记录的是计算步骤，不是把这次输出 token 当答案保存下来。
- capture 后，`G.input` 和 `G.output` 的名字与位置都不变。它们继续占用分配的空间，供之后的 replay 复用。
- 本步只跟随一张示意 graph。第 1 本 Ch. 11 Steps 2–4 已讲真实服务为什么按选定的 batch 形状分别 capture。

### 公式与符号

设 $G=(I,O)$ 是 graph 的输入输出缓冲，$F$ 是有序的 GPU 计算，$\Gamma$ 是记录好的 graph：

$$\Gamma=\operatorname{record}(F,I,O)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $I$ | 固定输入缓冲，图上的 `G.input` | capture 的输入分配 |
| $O$ | 固定输出缓冲，图上的 `G.output` | graph 的输出存储 |
| $F$ | 按顺序排列的 GPU 步骤 | 本次被记录的工作 |
| $\Gamma$ | 记录好的 CUDA Graph | 留给下一步 replay |

### 代入图上的数

本例只记录一张 graph，所以 capture 次数是 1。第 2 步的预算边界仍然成立：$G\le11.7\ \mathrm{GB}$，但没有 $I$、$O$ 的分项实测值。token 卡片只是示意，不带字节数。

### 源码与边界

capture 时，`CudaGraphRunner` 使用已经分配的输入缓冲，记录模型执行的 GPU 操作。graph 和缓冲随后保留，供 replay 使用。本步不把 capture 说成缓存某个请求的答案；replay 仍需写入新输入。

以下来源位于 `sglang@4fa3482`：

- [capture 输入缓冲与入口：`model_executor/cuda_graph_runner.py:624-655,801-802`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L624-L655)。
- [对模型执行进行 graph capture：`model_executor/cuda_graph_runner.py:1112-1222`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L1112-L1222)。

本章不逐项展开所有被记录的操作，也不列出全部 batch 形状档位。

### 接下来

下一步把同一张 graph 重放两次，用新输入输出覆盖同一组缓冲。

## 第 4 步 · replay 覆盖固定缓冲

**一句话。** 每次 replay 都把新输入复制进同一个缓冲，运行同一张记录好的 graph，再覆盖同一个输出缓冲。

### 图上是什么

- 三个对象沿用第 3 步的身份：`G.input`、记录好的 graph $\Gamma$ 和 `G.output`。
- replay $t$ 时，输入卡是 `input t`，输出卡从空变为 `output t`。
- replay $t+1$ 时，`input t+1` 替换旧输入。第二次 replay 再把 `output t` 替换成 `output t+1`。
- graph 没有重新记录。一次 capture 服务两次 replay，`G` 始终是同一份分配。

### 公式与符号

对 replay $r\in\{t,t+1\}$：

$$I\leftarrow\operatorname{copy}(\operatorname{input}_r),\qquad O\leftarrow\Gamma(I)=\operatorname{output}_r$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $I$ | 同一个 `G.input` 分配 | 第 3 步 |
| $O$ | 同一个 `G.output` 分配 | 第 3 步 |
| $\Gamma$ | 只记录一次的 graph | 第 3 步 |
| $r$ | replay 序号 | 图上构造的两次 replay |

### 代入图上的数

图上先演示 $\Gamma(I_t)=O_t$，再演示 $\Gamma(I_{t+1})=O_{t+1}$。capture 次数保持 1，replay 次数变为 2。这些是构造例的操作次数，不是 benchmark 结果或字节数。

### 源码与边界

replay 路径把当前输入复制进 runner 的输入缓冲，再调用已经 capture 的 graph。它不会为每个 token 新建一张 graph。与同一张 graph 关联的输出也由这套 replay 机制复用。

以下来源位于 `sglang@4fa3482`：

- [输入缓冲准备与复制：`model_executor/cuda_graph_runner.py:262-298,520-521`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L262-L298)。
- [调用 capture 后的 graph：`model_executor/cuda_graph_runner.py:1112-1222`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L1112-L1222)。

本例固定一个 batch 形状，不展开 padding、形状选择和输出处理。

### 接下来

下一步加入运行时与这些常驻 graph 缓冲同时存在的临时激活。

## 第 5 步 · 激活的使用期更短

**一句话。** 运行时激活是当前计算需要的临时中间结果，只在需要它们时与常驻 graph 缓冲同时存在。

### 图上是什么

- `Γ.replay()` 之前、期间和之后，`G` 都留在 11.7 GB 动态余量里。
- 计算 token 时，`A` 出现，表示叫激活的中间结果。这些结果仍在使用时，图上写出 `G + A ≤ 11.7 GB`。
- 当前计算不再需要这些中间结果后，`A` 的使用期结束。`G` 和其中的输出仍保留，供下一次 replay 使用。
- 虚线表示对象的使用期结束，不保证 allocator 立即把字节还给驱动。

### 公式与符号

计算同时需要两个对象时：

$$G+A\le R=(1-0.85)\times78$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $G$ | 常驻 CUDA Graph 缓冲 | 第 2–4 步；没有实测大小 |
| $A$ | 仍在使用的激活，也就是中间结果 | 当前前向计算；没有实测大小 |
| $R$ | 动态余量 | 第 1 步；0.85 时为 11.7 GB |

### 代入图上的数

$$G+A\le11.7\ \mathrm{GB}$$

源码没有给本例的 $G$ 和 $A$ 分项 GB 数。这条式子是计入其他动态开销前的必要预算关系，不是 allocator 强制执行的配额，也不保证不会 OOM。

### 源码与边界

SGLang 的参数说明把权重和 KV 与激活和 graph 缓冲区分开。课程也区分临时激活与长期保存的 KV 状态。原文把激活余量不足列为运行时 OOM 的一种路径，它不同于第 1 步 KV 尺寸非正导致的启动失败。

来源：

- [显存分类：`server_args.py:1227-1238`，`sglang@4fa3482`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238)。
- 运行时激活 OOM：`Awesome-ML-SYS-Tutorial/sglang/kvcache-code-walk-through/mem-fraction-static.md:89-96`，固定于 `d1f309b46f81a23e8b6ca0718c05bc897fafacf7`。
- [zero-to-sglang 第 1 部分第 4 章 §4：临时激活与持久状态](https://zero-to-sglang.datawhale.cc/ch/part1/%E7%AC%AC4%E7%AB%A0_%E6%8E%A8%E7%90%86%E7%9A%84%E6%A0%B8%E5%BF%83%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84%E5%85%A5%E9%97%A8.html)。

本步不测量激活峰值，不指定复用地址，也不展开其他动态分配。

### 接下来

最后一步把模型、KV、常驻 graph 缓冲和临时激活放回同一份有明确范围的账里。

## 第 6 步 · 有范围的账，不是保证

**一句话。** 0.85 通过了本例的 KV 尺寸计算，但大小未知的 graph 缓冲、激活和其他动态工作仍可能耗尽运行时显存。

### 图上是什么

- 顶部把启动约数账合上：$M\approx60$ GB、$K=6.3$ GB、$R=11.7$ GB，合计 78 GB。
- $R$ 内部有常驻 graph 缓冲 $G$、临时激活 $A$ 和其他动态工作 $D$。本例不知道三项大小，所以写 `?`，不是写 0。
- 运行时要求 $G+A+D\le R$。通过第 1 步的 KV 尺寸计算，并没有测量或保证这个后面的条件。
- 本章有意停在这份有范围的账，不声称列出了 allocator 的每一笔分配。

### 公式与符号

$$M+K+R=P,\qquad G+A+D\le R=(1-f)P$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $M$ | 模型装入前后减少的可用显存 | 第 1 步；约 60 GB |
| $K$ | KV pool 分到的空间 | 第 1 步；6.3 GB |
| $R$ | 动态余量 | 第 1 步；11.7 GB |
| $G$ | 常驻 graph 缓冲 | 第 2–4 步；字节数未知 |
| $A$ | 临时激活 | 第 5 步；字节数未知 |
| $D$ | 本章未逐项展开的其他动态工作 | 范围边界；字节数未知 |

### 代入图上的数

$$60+6.3+11.7=78\ \mathrm{GB}$$

$$G+A+D\le11.7\ \mathrm{GB}$$

本步不给 $G$、$A$、$D$ 编数。因此，本例能证明 KV 空间为正，却不能证明运行时峰值一定装得下。真发生运行时 OOM 时，可能需要调小 `mem_fraction_static` 来增大 $R$，方向与第 1 步修 KV 启动尺寸时相反。

### 源码与边界

SGLang 把激活和 CUDA Graph buffers 列为权重与 KV 静态分配之外的用途。原文区分启动时的 KV 尺寸失败与运行时激活 OOM。多模态预留和其他进程的情况不在本章展开，因为舞台没有给出它们的配置与测量。

来源：

- [静态与动态显存分类：`server_args.py:1227-1238`，`sglang@4fa3482`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238)。
- [参数文档的 OOM 建议：`server_args.py:4227-4232`，`sglang@4fa3482`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L4227-L4232)。
- 启动与运行时失败的调参方向：`Awesome-ML-SYS-Tutorial/sglang/kvcache-code-walk-through/mem-fraction-static.md:67-100`，固定于 `d1f309b46f81a23e8b6ca0718c05bc897fafacf7`。

本章不展开 KV 字节推导、paging、请求准入、多模态预留、allocator 内部和整个进程的完整显存普查。

### 接下来

两个请求有共同前缀，hybrid 模型能从共同前缀的末尾继续算吗？
