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

Raising the fraction from 0.70 to 0.85 leaves the model-loading readings unchanged. Headroom falls by 11.7 GB:

$$23.4-11.7=11.7\ \mathrm{GB}$$

KV room rises by the same 11.7 GB:

$$6.3-(-5.4)=11.7\ \mathrm{GB}$$

The article writes GB; the code helper divides bytes by `1 << 30`. This step preserves the article's rounded values without a separate unit conversion.

### How the source calculates KV room

SGLang reads `pre_model_load_memory` after distributed initialization and before model loading, then reads `post_model_load_memory` after loading and before KV-pool creation. On CUDA, the helper uses `torch.cuda.mem_get_info`; distributed execution takes the minimum across ranks.

`model_runner_kv_cache_mixin.py` computes `rest = post_model_load_memory - pre_model_load_memory * (1 - mem_fraction_static)` and passes it to pool configuration. The default configurator converts available bytes to tokens and page-aligns the count. It rejects `max_total_num_tokens <= 0`, so −5.4 GB means startup sizing fails, not a usable KV configuration.

### Scope and sources

Dynamic headroom is not all occupied memory. KV-pool initialization precedes CUDA Graph capture, and activations vary during execution. The gray region is an allowance for other work, not a measurement of free memory after startup. This step covers one GPU without LoRA or hybrid/mamba pools. It excludes KV-byte derivation, paging, admission, graph recording, runtime OOM tuning and multimodal reserves.

Sources use `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7` and `sglang@4fa3482`:

- Worked readings, formula and −5.4/6.3 GB results: `sglang/kvcache-code-walk-through/mem-fraction-static.md:34-60,73-85`.
- [Pre-load available-memory read: `model_runner.py:451-452,1083-1088`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L1083-L1088).
- [CUDA free-memory read, distributed minimum and byte conversion: `utils/common.py:498-525,594-601`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/utils/common.py#L498-L525).
- [Model-loading and KV-pool initialization order: `model_runner.py:567-569,656-677`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L656-L677).
- [Direct `rest` calculation: `model_runner_kv_cache_mixin.py:56-70`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner_kv_cache_mixin.py#L56-L70).
- [Non-positive token counts fail: `pool_configurator.py:39-44,170-175`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/pool_configurator.py#L170-L175).
- [CUDA Graph capture follows KV-pool initialization: `model_runner.py:676-677,709-726`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L709-L726).
- [Parameter help distinguishes weights and KV from activations and graph buffers: `server_args.py:1227-1236`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1236).

### Next

The next step follows the successful 0.85 startup in order: model, KV pool, then CUDA Graph buffers.

## Step 2 · The startup order

**One sentence.** SGLang loads the model, creates the KV pool, then allocates CUDA Graph input and output buffers inside the remaining headroom.

### What the diagram shows

- The top bar keeps Step 1's successful 0.85 budget on the same 78 GB scale: orange model loading is about 60 GB, blue KV is 6.3 GB and gray dynamic headroom is 11.7 GB.
- The three cards appear in execution order. Model loading finishes before KV-pool creation, and graph-buffer allocation follows KV-pool creation.
- `G` names the CUDA Graph input and output buffers. The arrow into the gray region says these buffers use dynamic headroom; it does not assign them the whole 11.7 GB.
- The example has no measured size for `G`, so the diagram says `size unknown` instead of inventing a share.

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

- [Model, KV-pool and device-graph initialization order: `model_runner.py:567-569,656-677,709-726`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/model_runner.py#L709-L726).
- [Capture input-buffer allocation: `cuda_graph_runner.py:624-655`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L624-L655).
- [Weights and KV are distinct from activations and graph buffers: `server_args.py:1227-1238`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238).

This step does not measure buffer bytes or cover temporary workspaces, multimodal reserves and other processes.

### Next

The next step records one graph and shows which buffers the recording uses.

## Step 3 · Capture records the work

**One sentence.** Capture records GPU steps without executing them, using fixed input and output buffers that stay reserved for replay.

### What the diagram shows

- `G.input` shows the reserved input space. Capture records the ordered GPU steps, but does not execute them or write an output token.
- `G.output` therefore says `filled on replay`; the recording is not a saved copy of an output token.
- `G.input` and `G.output` keep the same identities and positions after capture. They stay reserved so a later replay can reuse them.
- This step follows one schematic graph. The first book's Ch. 11 Steps 2–4 explains why a real server captures graphs for selected batch shapes.

### Formula and symbols

Let $G=(I,O)$ be the graph's input and output buffers, $F$ be the ordered GPU work and $\Gamma$ be the recorded graph:

$$\Gamma=\operatorname{record}(F,I,O)$$

| Symbol | Meaning | Origin |
|---|---|---|
| $I$ | Fixed input buffer, `G.input` on stage | Capture input allocation |
| $O$ | Fixed output buffer, `G.output` on stage | Graph output storage |
| $F$ | Ordered GPU steps | The work being captured |
| $\Gamma$ | Recorded CUDA Graph | Saved for the next step's replay |

### Substitute the diagram's numbers

This example records one graph, so its capture count is 1. Step 2's budget boundary still holds: $G\le11.7\ \mathrm{GB}$, with no measured split between $I$ and $O$. The token cards are schematic and carry no byte count.

### Source and scope

During capture, `CudaGraphRunner` uses allocated input buffers and records the model's GPU operations. The graph and its buffers persist for subsequent replay. This step does not claim that capture caches a request's answer; replay still needs new input.

Sources use `sglang@4fa3482`:

- [Capture input buffers and capture entry: `cuda_graph_runner.py:624-655,801-802`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L624-L655).
- [Graph capture implementation: `cuda_graph_runner.py:824-855,1029-1076`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L824-L855).

The chapter does not enumerate every captured operation or every batch-shape rung.

### Next

The next step replays the same graph twice and overwrites the same buffers with new input and output.

## Step 4 · Replay overwrites fixed buffers

**One sentence.** Each replay copies new input into the same buffer, runs the same recorded graph and overwrites the same output buffer.

### What the diagram shows

- The three objects keep their Step 3 identities: `G.input`, the recorded graph $\Gamma$ and `G.output`.
- At replay $t$, the input card holds `input t` and the output card changes from empty to `output t`.
- At replay $t+1$, `input t+1` replaces the old input. The second replay then replaces `output t` with `output t+1`.
- The graph is not recorded again. One capture serves both replays, and `G` remains the same allocation throughout.

### Formula and symbols

For replay $r\in\{t,t+1\}$:

$$I\leftarrow\operatorname{copy}(\operatorname{input}_r),\qquad O\leftarrow\Gamma(I)=\operatorname{output}_r$$

| Symbol | Meaning | Origin |
|---|---|---|
| $I$ | The same `G.input` allocation | Step 3 |
| $O$ | The same `G.output` allocation | Step 3 |
| $\Gamma$ | The graph recorded once | Step 3 |
| $r$ | Replay index | The two constructed replays on stage |

### Substitute the diagram's numbers

The stage shows $\Gamma(I_t)=O_t$, then $\Gamma(I_{t+1})=O_{t+1}$. Capture count stays 1 while replay count becomes 2. These are operation counts in the constructed example, not benchmark results or byte counts.

### Source and scope

The replay path copies the current input into the runner's input buffers and invokes the captured graph. It does not allocate a fresh graph for each token. Output tensors associated with the graph are reused by the same replay machinery.

Sources use `sglang@4fa3482`:

- [Input-buffer preparation, grouped copy and replay call path: `cuda_graph_runner.py:262-362,1138-1151`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L262-L362).
- [Captured graph replay: `cuda_graph_runner.py:1112-1222`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/model_executor/cuda_graph_runner.py#L1112-L1222).

The example fixes one batch shape. Padding, shape selection and output processing are outside this step.

### Next

The next step adds the temporary activations that coexist with these persistent graph buffers during runtime.

## Step 5 · Activations have a shorter live range

**One sentence.** Runtime activations are temporary intermediate results that coexist with persistent graph buffers only while the current computation needs them.

### What the diagram shows

- `G` remains inside the 11.7 GB headroom before, during and after `Γ.replay()`.
- During the token computation, `A` appears as the intermediate results called activations. While those results are live, the diagram shows `G + A ≤ 11.7 GB`.
- When the computation no longer needs those intermediate results, `A`'s live range ends. `G` and its output stay reserved for the next replay.
- The dashed ending describes object lifetime, not a guarantee that the allocator immediately returns bytes to the driver.

### Formula and symbols

While the computation needs both objects:

$$G+A\le R=(1-0.85)\times78$$

| Symbol | Meaning | Origin |
|---|---|---|
| $G$ | Persistent CUDA Graph buffers | Steps 2–4; size not measured |
| $A$ | Live activations, or intermediate results | Current forward computation; size not measured |
| $R$ | Dynamic headroom | Step 1; 11.7 GB at 0.85 |

### Substitute the diagram's numbers

$$G+A\le11.7\ \mathrm{GB}$$

The source supplies no separate GB values for this example's $G$ and $A$. The inequality is a necessary budget relationship before other dynamic overhead; it is not an allocator-enforced quota or a guarantee against OOM.

### Source and scope

SGLang's parameter help distinguishes weights and KV from activations and graph buffers. The course likewise distinguishes temporary activation storage from persistent KV state. The article identifies insufficient activation headroom as a runtime OOM path that differs from Step 1's non-positive KV sizing failure.

Sources:

- [Memory categories: `server_args.py:1227-1238`, `sglang@4fa3482`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238).
- Runtime activation OOM: `Awesome-ML-SYS-Tutorial/sglang/kvcache-code-walk-through/mem-fraction-static.md:89-96`, pinned at `d1f309b46f81a23e8b6ca0718c05bc897fafacf7`.
- [zero-to-sglang Part I Chapter 4 §4: temporary activations versus persistent state](https://zero-to-sglang.datawhale.cc/eng/part1/Chapter4_KV%20Cache%20The%20Core%20Data%20Structure%20of%20Inference.html).

This step does not measure peak activation bytes, specify reuse addresses or cover other dynamic allocations.

### Next

The final step puts model, KV, persistent graph buffers and temporary activations back into one scoped account.

## Step 6 · A scoped account, not a guarantee

**One sentence.** The 0.85 setting passes this KV-sizing example, but unmeasured graph buffers, activations and other dynamic work can still exhaust runtime memory.

### What the diagram shows

- The top bar closes the rounded startup account: $M\approx60$ GB, $K=6.3$ GB and $R=11.7$ GB sum to 78 GB.
- Inside $R$, the chapter names persistent graph buffers $G$, temporary activations $A$ and other dynamic work $D$. All three have unknown sizes in this example, marked `?`, not zero.
- The runtime requirement is $G+A+D\le R$. Passing Step 1's KV sizing does not measure or guarantee this later condition.
- The chapter deliberately stops at this scoped account. It does not claim a complete ledger of every allocator allocation.

### Formula and symbols

$$M+K+R=P,\qquad G+A+D\le R=(1-f)P$$

| Symbol | Meaning | Origin |
|---|---|---|
| $M$ | Model-loading reduction | Step 1; about 60 GB |
| $K$ | KV-pool allowance | Step 1; 6.3 GB |
| $R$ | Dynamic headroom | Step 1; 11.7 GB |
| $G$ | Persistent graph buffers | Steps 2–4; unknown bytes |
| $A$ | Temporary activations | Step 5; unknown bytes |
| $D$ | Other dynamic work not itemized here | Scope boundary; unknown bytes |

### Substitute the diagram's numbers

$$60+6.3+11.7=78\ \mathrm{GB}$$

$$G+A+D\le11.7\ \mathrm{GB}$$

No values are assigned to $G$, $A$ or $D$. Consequently, this example can prove the positive KV allowance, but it cannot prove a runtime peak fits. A real runtime OOM can require lowering `mem_fraction_static` to enlarge $R$, which trades in the opposite direction from Step 1's KV-sizing repair.

### Source and scope

SGLang lists activations and CUDA Graph buffers among the uses outside static weights and KV. The worked article distinguishes startup KV-sizing failure from runtime activation OOM. Its multimodal reserve and other-process cases remain outside this chapter because the stage does not supply their configurations or measurements.

Sources:

- [Static and dynamic memory categories: `server_args.py:1227-1238`, `sglang@4fa3482`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L1227-L1238).
- [The parameter guidance for OOM: `server_args.py:4227-4232`, `sglang@4fa3482`](https://github.com/sgl-project/sglang/blob/4fa3482/python/sglang/srt/server_args.py#L4227-L4232).
- Startup and runtime failure directions: `Awesome-ML-SYS-Tutorial/sglang/kvcache-code-walk-through/mem-fraction-static.md:67-100`, pinned at `d1f309b46f81a23e8b6ca0718c05bc897fafacf7`.

This chapter excludes KV-byte derivation, paging, request admission, multimodal reserves, allocator internals and a complete process-wide memory census.

### Next

A hybrid request shares a prefix. Here `hybrid` means per-token KV history plus a recurrent state, glossed on stage as a running summary. `num_batch` is the number of tokens scheduled per batch. At 1024 versus 64, what happens to the short-request wait and recomputed-token count?
