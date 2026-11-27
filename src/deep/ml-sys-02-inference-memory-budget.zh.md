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

比例从 0.70 调到 0.85，模型装入读数不变；动态余量减少 $23.4-11.7=11.7$ GB，KV 空间增加 $6.3-(-5.4)=11.7$ GB。原文写的是 GB；代码辅助函数把字节数除以 `1 << 30`，本步保留原文的约数，不另做单位换算。

### 源码怎样算出 KV 空间

SGLang 在分布式初始化后、模型装入前读取 `pre_model_load_memory`，在模型装入后、KV 池创建前读取 `post_model_load_memory`。CUDA 上，辅助函数通过 `torch.cuda.mem_get_info` 读取当前空闲量；分布式运行取各 rank 的最小值。

`model_runner_kv_cache_mixin.py` 直接计算 `rest = post_model_load_memory - pre_model_load_memory * (1 - mem_fraction_static)`，再交给 KV 池配置。默认配置器把可用字节换算成 token 数并按 page 对齐；若 `max_total_num_tokens <= 0`，启动会失败。因此 −5.4 GB 表示这次尺寸计算无法成立，不是一种可继续运行的 KV 配置。

### 边界与出处

动态余量不等于已经全部占用。KV 池初始化先于 CUDA Graph capture，激活也会随运行变化；灰色区域只是给其他工作留出的空间，不能叫作「启动后仍然空闲的显存」。本步只讲单 GPU、无 LoRA、无 hybrid/mamba 池的尺寸关系，不讲 KV 字节推导、paging、准入、graph 录制、运行时 OOM 调参或多模态预留。

以下来源位于 `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7` 与 `sglang@4fa3482`：

- 原文的两次读数、公式和 −5.4／6.3 GB 例子：`sglang/kvcache-code-walk-through/mem-fraction-static.md:34-60,73-85`。
- [装入模型前读取可用显存：`python/sglang/srt/model_executor/model_runner.py:451-452,1083-1088`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L1083-L1088)。
- [CUDA 读取空闲显存、分布式取最小值、字节换算：`python/sglang/srt/utils/common.py:498-525,594-601`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/utils/common.py#L498-L525)。
- [装入模型与 KV 池初始化顺序：`python/sglang/srt/model_executor/model_runner.py:567-569,656-677`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L656-L677)。
- [`rest` 的直接计算：`python/sglang/srt/model_executor/model_runner_kv_cache_mixin.py:56-70`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner_kv_cache_mixin.py#L56-L70)。
- [非正 token 数不能启动：`python/sglang/srt/model_executor/pool_configurator.py:39-44,170-175`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/pool_configurator.py#L170-L175)。
- [KV 池后才 capture CUDA Graph：`python/sglang/srt/model_executor/model_runner.py:676-677,709-726`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L709-L726)。
- [参数说明区分权重与 KV 池、激活与 graph 缓冲区：`python/sglang/srt/server_args.py:1227-1236`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1236)。

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

- [模型、KV pool、device graph 的初始化顺序：`python/sglang/srt/model_executor/model_runner.py:567-569,656-677,709-726`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L709-L726)。
- [capture 输入缓冲的分配：`python/sglang/srt/model_executor/cuda_graph_runner.py:624-655`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L624-L655)。
- [权重与 KV pool 和激活与 graph buffers 的分类：`python/sglang/srt/server_args.py:1227-1238`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238)。

本步不测量缓冲字节，也不展开临时 workspace、多模态预留和其他进程。

### 接下来

下一步记录一张 graph，看这次记录使用哪些缓冲。
