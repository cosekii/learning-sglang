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

接下来的问题是：激活和 CUDA Graph capture 实际会使用动态余量里的哪些空间？

## 第 2 步 · 动态余量由谁使用

**一句话。** 动态余量是静态分配外的预算，CUDA Graph 缓冲和激活都从这里占用空间，不是另一块可以分给 KV 的空闲显存。

### 图上是什么

- 顶部仍是第 1 步的 78 GB 预算：模型约 60 GB、KV 6.3 GB、动态余量 11.7 GB。动态余量从 23.4 GB 减到 11.7 GB，恰好减半。
- 左侧是启动时的 CUDA Graph 录制：把 GPU 计算步骤记录下来，之后重放。图中的 `buffers` 是 CUDA Graph 的 `graph buffers`（缓冲），留着装这些计算的输入输出，运行时仍在；本步沿用第 1 步排除 LoRA 的范围，不展开特殊的提前分配。
- 右侧是运行时算 token。图中的「临时的中间结果」叫 `activations`（激活），随模型和 batch 等配置变化。
- 灰色斜线都标动态余量：顶部是预算，下两框是其中两类用途；蓝色只表示 KV。两项灰框的宽度不表示实测字节数。

### 公式与符号

设动态余量为 $R$，CUDA Graph 缓冲为 $G$，激活为 $A$。两项同时存活时，至少要满足：

$$G+A\le R=(1-0.85)\times78$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $R$ | 静态分配外的动态余量 | 第 1 步，$(1-f)P$ |
| $G$ | CUDA Graph 录制使用的缓冲 | 本步左图；没有实测数值 |
| $A$ | 前向计算的中间结果 | 本步右图；没有实测数值 |

图中的 $G+A\le R$ 是预算要求，不是 allocator 强制执行的分类配额。其他动态开销没有画入，所以满足这条式子也不保证一定不会 OOM。

### 代入图上的数

$$R=(1-0.85)\times78=11.7\ \mathrm{GB}$$

因此本例画出 $G+A\le11.7\ \mathrm{GB}$。源码没有给这个教学例子的 $G$、$A$ 分项测量值，本步不编造两项各是多少 GB；11.7 GB 本身也是由约数预算算出的，不是独立内存池的实测容量。

### 源码顺序与边界

SGLang 依次装入模型、初始化 KV pool，再初始化并录制 CUDA Graph。`CudaGraphRunner` 为 capture 分配输入缓冲；graph capture 失败和运行中的动态分配失败都可能遇到显存不足。它们不同于第 1 步 KV 尺寸算不出正数时的启动配置错误。

以下来源位于 `sglang@4fa3482`：

- [显存账包含权重、KV pool、activations 和 CUDA Graph buffers：`python/sglang/srt/server_args.py:1227-1238`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238)。
- [模型、KV pool、device graph 的初始化顺序：`python/sglang/srt/model_executor/model_runner.py:567-569,673-677,709-713`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L673-L713)。
- [capture 的输入缓冲和显存不足处理：`python/sglang/srt/model_executor/cuda_graph_runner.py:624-655`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L624-L655)。
- [参数文档建议 OOM 时调小静态比例：`python/sglang/srt/server_args.py:4227-4232`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L4227-L4232)。

本步只讲两类动态用途，不给出各项实测值，也不讨论其他临时分配、多模态 encoder 预留、显存复用或 allocator 细节。

### 延伸阅读

- [zero-to-sglang 第 1 部分第 4 章：推理的核心数据结构](https://zero-to-sglang.datawhale.cc/ch/part1/%E7%AC%AC4%E7%AB%A0_%E6%8E%A8%E7%90%86%E7%9A%84%E6%A0%B8%E5%BF%83%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84%E5%85%A5%E9%97%A8.html) §4 比较了 KV cache 的长期占用和激活的临时占用。

### 接下来

下一步的问题是：KV pool 不够时，请求一定会让进程 OOM 吗？
