## Step 1 · Where more KV room comes from

**One sentence.** `mem_fraction_static` does not shrink the loaded model; it changes the headroom left for other work, which changes the room left for KV cache.

### What the diagram shows

- The article's rounded example has about 78 GB available before model loading and 18 GB afterward. The roughly 60 GB reduction is drawn as model loading in this no-LoRA example.
- Both budgets use the same 78 GB scale. Orange model loading stays at about 60 GB; gray hatching marks dynamic headroom, blue marks KV cache and red marks a KV shortfall.
- At 0.70, about 60 GB of model loading plus 23.4 GB of headroom exceeds 78 GB. KV room is −5.4 GB: the budget is 5.4 GB short, not a physical negative memory region.
- At 0.85, headroom shrinks to 11.7 GB and KV receives 6.3 GB. Approximately 60 + 6.3 + 11.7 = 78 GB.
- KV cache stores token history so later generation can reuse earlier work. This step only calculates its allowance, not KV pages or request admission.

### Formula and symbols

Let $P$ be available memory before model loading, $Q$ be available memory afterward, $f$ be the fraction, $R$ be dynamic headroom and $K$ be KV room:

$$R=(1-f)P,\qquad K=Q-R=Q-(1-f)P$$

The model-loading reduction is $M=P-Q$, so the same relationship is:

$$K=fP-M$$

| Symbol | Meaning | Origin |
|---|---|---|
| $P$ | Available memory before model loading | `pre_model_load_memory`; about 78 GB here |
| $Q$ | Available memory after model loading | `post_model_load_memory`; about 18 GB here |
| $M$ | Reduction across model loading | $P-Q$; about 60 GB here |
| $f$ | `mem_fraction_static` | This example compares 0.70 and 0.85 |
| $R$ | Dynamic headroom outside static allocation | $(1-f)P$ |
| $K$ | Room available for the KV pool | $Q-R$ |

$P$ is current available memory, not nominal HBM capacity. A CUDA context, communication buffers or other processes may already occupy memory. $M$ is the difference between two readings; with LoRA enabled it may include related preallocation, which this step excludes.

### Substitute the diagram's numbers

For $f=0.70$:

$$R=(1-0.70)\times78=23.4\ \mathrm{GB}$$

$$K=18-23.4=-5.4\ \mathrm{GB}$$

For $f=0.85$:

$$R=(1-0.85)\times78=11.7\ \mathrm{GB}$$

$$K=18-11.7=6.3\ \mathrm{GB}$$

Raising the fraction from 0.70 to 0.85 leaves the model-loading readings unchanged. Headroom falls by $23.4-11.7=11.7$ GB and KV room rises by $6.3-(-5.4)=11.7$ GB. The article writes GB; the code helper divides bytes by `1 << 30`. This step preserves the article's rounded values without a separate unit conversion.

### How the source calculates KV room

SGLang reads `pre_model_load_memory` after distributed initialization and before model loading, then reads `post_model_load_memory` after loading and before KV-pool creation. On CUDA, the helper uses `torch.cuda.mem_get_info`; distributed execution takes the minimum across ranks.

`model_runner_kv_cache_mixin.py` computes `rest = post_model_load_memory - pre_model_load_memory * (1 - mem_fraction_static)` and passes it to pool configuration. The default configurator converts available bytes to tokens and page-aligns the count. It rejects `max_total_num_tokens <= 0`, so −5.4 GB means startup sizing fails, not a usable KV configuration.

### Scope and sources

Dynamic headroom is not all occupied memory. KV-pool initialization precedes CUDA Graph capture, and activations vary during execution. The gray region is an allowance for other work, not a measurement of free memory after startup. This step covers one GPU without LoRA or hybrid/mamba pools. It excludes KV-byte derivation, paging, admission, graph recording, runtime OOM tuning and multimodal reserves.

Sources use `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7` and `sglang@4fa3482`:

- Worked readings, formula and −5.4/6.3 GB results: `sglang/kvcache-code-walk-through/mem-fraction-static.md:34-60,73-85`.
- [Pre-load available-memory read: `python/sglang/srt/model_executor/model_runner.py:451-452,1083-1088`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L1083-L1088).
- [CUDA free-memory read, distributed minimum and byte conversion: `python/sglang/srt/utils/common.py:498-525,594-601`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/utils/common.py#L498-L525).
- [Model-loading and KV-pool initialization order: `python/sglang/srt/model_executor/model_runner.py:567-569,656-677`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L656-L677).
- [Direct `rest` calculation: `python/sglang/srt/model_executor/model_runner_kv_cache_mixin.py:56-70`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner_kv_cache_mixin.py#L56-L70).
- [Non-positive token counts fail: `python/sglang/srt/model_executor/pool_configurator.py:39-44,170-175`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/pool_configurator.py#L170-L175).
- [CUDA Graph capture follows KV-pool initialization: `python/sglang/srt/model_executor/model_runner.py:676-677,709-726`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L709-L726).
- [Parameter help distinguishes weights and KV from activations and graph buffers: `python/sglang/srt/server_args.py:1227-1236`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1236).

### Next

The next question is: which parts of this headroom do activations and CUDA Graph capture actually use?

## Step 2 · What uses dynamic headroom

**One sentence.** Dynamic headroom is a budget outside static allocation, shared by CUDA Graph buffers and activations rather than spare memory available for KV.

### What the diagram shows

- The top keeps Step 1's 78 GB budget: about 60 GB for model loading, 6.3 GB for KV and 11.7 GB for dynamic headroom. Headroom falls from 23.4 to 11.7 GB, exactly half.
- The left panel shows CUDA Graph capture at startup: record GPU steps once, then replay them. The panel's `buffers` are CUDA Graph `graph buffers`; they retain those computations' input and output data, so they remain at runtime. This step keeps Step 1's no-LoRA scope and excludes special preallocation paths.
- The right panel shows token computation at runtime. Its temporary, intermediate results are called `activations`; their size varies with the model, batch and other configuration.
- Gray hatching marks dynamic headroom throughout: an allowance at the top and two uses below. Blue marks only KV. The gray shapes' widths are not measured byte counts.

### Formula and symbols

Let $R$ be dynamic headroom, $G$ be CUDA Graph buffers and $A$ be activations. When both are live, they must at least satisfy:

$$G+A\le R=(1-0.85)\times78$$

| Symbol | Meaning | Origin |
|---|---|---|
| $R$ | Dynamic headroom outside static allocation | Step 1, $(1-f)P$ |
| $G$ | Buffers used by CUDA Graph capture | Left panel; no measured value |
| $A$ | Intermediate results from forward passes | Right panel; no measured value |

The displayed $G+A\le R$ is a budget requirement, not a category quota enforced by the allocator. Other dynamic overhead is omitted, so this inequality alone cannot guarantee freedom from OOM.

### Substitute the diagram's numbers

$$R=(1-0.85)\times78=11.7\ \mathrm{GB}$$

The example therefore shows $G+A\le11.7\ \mathrm{GB}$. The source does not measure $G$ and $A$ for this teaching example, so this step assigns no invented GB values to them. The 11.7 GB total also comes from rounded accounting; it is not the measured capacity of a separate memory pool.

### Source order and scope

SGLang loads the model, initializes the KV pool, then initializes and captures CUDA Graphs. `CudaGraphRunner` allocates input buffers for capture. Both capture failure and runtime dynamic-allocation failure can encounter insufficient memory. They differ from Step 1's startup configuration error when KV sizing produces no positive token capacity.

Sources use `sglang@4fa3482`:

- [The memory account includes weights, KV pool, activations and CUDA Graph buffers: `python/sglang/srt/server_args.py:1227-1238`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238).
- [Model, KV-pool and device-graph initialization order: `python/sglang/srt/model_executor/model_runner.py:567-569,673-677,709-713`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L673-L713).
- [Capture input buffers and insufficient-memory handling: `python/sglang/srt/model_executor/cuda_graph_runner.py:624-655`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L624-L655).
- [The parameter help recommends a smaller static fraction for OOM: `python/sglang/srt/server_args.py:4227-4232`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L4227-L4232).

This step covers only two dynamic uses. It does not provide measured shares or cover other temporary allocations, multimodal encoder reserves, memory reuse or allocator details.

### Further reading

- [zero-to-sglang Part I Chapter 4: KV Cache — The Core Data Structure of Inference](https://zero-to-sglang.datawhale.cc/eng/part1/Chapter4_KV%20Cache%20The%20Core%20Data%20Structure%20of%20Inference.html) §4 contrasts persistent KV-cache occupancy with temporary activations.

### Next

The next question is: does an insufficient KV pool necessarily make the process OOM?
