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

The next step follows the successful 0.85 startup in order: model, KV pool, then CUDA Graph buffers.

## Step 2 · The startup order

**One sentence.** SGLang loads the model, creates the KV pool, then allocates CUDA Graph input and output buffers inside the remaining headroom.

### What the diagram shows

- The top bar keeps Step 1's successful 0.85 budget on the same 78 GB scale: orange model loading is about 60 GB, blue KV is 6.3 GB and gray dynamic headroom is 11.7 GB.
- The three cards appear in execution order. Model loading finishes before KV-pool creation, and graph-buffer allocation follows KV-pool creation.
- `G` names the CUDA Graph input and output buffers. The arrow into the gray region says these buffers use dynamic headroom; it does not assign them the whole 11.7 GB.
- The example has no measured size for `G`, so the diagram writes `G = ? GB` instead of inventing a share.

### Formula and symbols

The rounded card budget is $M+K+R=P$. Graph buffers are one use of $R$, so $0<G\le R$ while they are allocated.

| Symbol | Meaning | Origin |
|---|---|---|
| $P$ | Available memory before model loading | Step 1; 78 GB |
| $M$ | Model-loading reduction | Step 1; about 60 GB |
| $K$ | KV-pool allowance | Step 1; 6.3 GB at 0.85 |
| $R$ | Dynamic headroom | Step 1; 11.7 GB at 0.85 |
| $G$ | CUDA Graph input and output buffers | This step; size not measured |

### Substitute the diagram's numbers

$$M+K+R\approx60+6.3+11.7=78\ \mathrm{GB}$$

The subset relationship is $G\le11.7\ \mathrm{GB}$. This is a budget boundary, not a measurement or a separate allocator quota.

### Source order and scope

`ModelRunner` loads the model, initializes the KV pool, then initializes device graphs. `CudaGraphRunner` allocates the input buffers used during capture. The next step separates that allocation from the recording operation.

Sources use `sglang@4fa3482`:

- [Model, KV-pool and device-graph initialization order: `python/sglang/srt/model_executor/model_runner.py:567-569,656-677,709-726`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L709-L726).
- [Capture input-buffer allocation: `python/sglang/srt/model_executor/cuda_graph_runner.py:624-655`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L624-L655).
- [Weights and KV are distinct from activations and graph buffers: `python/sglang/srt/server_args.py:1227-1238`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238).

This step does not measure buffer bytes or cover temporary workspaces, multimodal reserves and other processes.

### Next

The next step records one graph and shows which buffers the recording uses.
