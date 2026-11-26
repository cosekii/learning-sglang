## Step 1 · The update call hides a wait

**One sentence.** A nominal 1B bf16 model holds about 2 GB of weights, and one debug run spent 7.047 seconds replacing them.

### On the stage

- Training has produced `weights v1`, the new number tables. Rollout waits for the update before using them, continuing Chapter 6 Step 8.
- The left card derives the weight size. The right card shows the full-model time from the debug log.
- The dashed `WHOLE CALL` box surrounds the update. Its inner `model code` copies v1. The timing pair compares that model-code operation with the whole external call, showing what an inner-only timer misses.

### Formula and symbols

$$B=P\times b$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | Number of stored weight values | Nominal 1B model: $10^9$ |
| $b$ | Bytes per weight value | bf16: 2 bytes |
| $B$ | Total weight bytes | Derived here |

### The numbers on the stage

$$B=1{,}000{,}000{,}000\times2=2{,}000{,}000{,}000\ \text{bytes}=2\ \text{GB}$$

The 7.047-second measurement covers the full distributed update in the author's setup. The 0.001- and 0.033-second values come from one weight-tensor example. Their rounded ratio is $0.033/0.001\approx33\times$. They do not predict another model or machine.

### Next

The controller knows that rollout must receive `v1`, but not which route carries it. The next step compares three update channels.

Sources: `Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:556-558,980-1007`; Chapter 6 Step 8.

## Step 2 · Map the three update channels

**One sentence.** A checkpoint file, a process group and a GPU location note are three alternative routes for delivering the same `v1` weights.

### On the stage

- The disk card defines a `checkpoint` as saved weights: write the file, then read it. `update_weights_from_disk` uses this route.
- The distributed card defines a `process group` as cooperating members: one sender hands values to many receivers.
- The tensor card defines a `handle` as a GPU location note: send the note, then find the tensor. Step 4 opens this mechanism.
- All three cards are blue because all are alternative weight handoffs. One update chooses one route.

### Formula and symbols

$$c\in\{\text{disk},\text{distributed},\text{tensor}\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $c$ | Update channel selected for one handoff | One of the three cards |
| $v1$ | Weight version carried by that channel | Chapter 6 Step 8 |

### The numbers on the stage

The map has three alternatives from the interface comparison. It adds no engine count, byte total or timing. In particular, the source supplies no disk timing.

### Next

The next step opens the distributed card: training rank 0 broadcasts full weight tensors inside the process group.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:400-409`; `python/sglang/srt/model_executor/model_runner.py:641-694` at `sgl-project/sglang@392e441ad17c78b68638f2d959fcf592d19b4834`.

## Step 3 · Broadcast values inside a process group

**One sentence.** The distributed channel puts one training rank and the inference TP ranks into a process group, then broadcasts each full weight tensor from training rank 0.

### On the stage

- A process group is the named set of ranks that participate in this transfer. A rank is one member's number, not necessarily a separate top-level process.
- `Broadcast` sends the same weight-tensor values to every member. Orange marks the training sender, and blue marks inference receivers. TP 1 has one inference receiver; TP 2 has two.
- The bottom sequence runs for every weight tensor: allocate the destination, broadcast the full tensor from rank 0, keep the part owned by this inference rank, then load it.

### Formula and symbols

$$W=R_{\text{train}}+T$$

| Symbol | Meaning | Source |
|---|---|---|
| $R_{\text{train}}$ | Training ranks supplying values in this example | 1 |
| $T$ | Inference tensor-parallel rank count | `tp_size` |
| $W$ | Update process-group `world_size` | Sum of both sides |

### The numbers on the stage

$$T=1\Rightarrow W=1+1=2,\qquad T=2\Rightarrow W=1+2=3$$

The figure labels group membership only. It does not claim that two or three top-level processes exist.

### Next

This channel transfers weight-tensor values through the group. The tensor channel instead passes handles that let inference locate an already assembled GPU tensor.

Sources: `Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:232-262,399-412,931-950`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:407`; `model_runner.py:696-772` at `sgl-project/sglang@392e441ad17c78b68638f2d959fcf592d19b4834`.

## Step 4 · Send a handle to the assembled tensor

**One sentence.** The tensor channel assembles a full parameter, passes reconstruction handles to SGLang, and lets each inference rank rebuild and load the tensor.

### On the stage

- A parameter is one weight table. Four orange training pieces each have 256 rows and 1024 columns, written `[256,1024]`. `full_tensor()` gathers them into one `[1024,1024]` tensor.
- `MultiprocessingSerializer.serialize` bundles location notes into a handle tuple: shape, size and storage location, with no weight payload.
- The grey arrow is the note handoff. `gather_object` collects the notes at rank 0. On each SGLang rank, `tensor.get(tp_rank)` selects that rank's handle and rebuilds the full tensor; `load_weights` then keeps the part owned by that rank. Blue marks this inference-side work.

### Formula and symbols

$$E=r\times c,\qquad E=T\times r_s\times c$$

| Symbol | Meaning | Source |
|---|---|---|
| $r,c$ | Full-tensor row and column counts | Both 1024 |
| $T$ | Training shard count | Four training shards in this example |
| $r_s$ | Rows in one training shard | $1024\div4=256$ |
| $E$ | Elements in the assembled tensor | Derived here |

### The numbers on the stage

$$E=4\times256\times1024=1024\times1024=1{,}048{,}576$$

That is about 1.05 million numbers. The source's SGLang TP 2 layout has `[512,1024]` per inference rank after the loader selects local parts. This example specifies no dtype, so the figure counts elements rather than inventing bytes.

### Next

Assembling one parameter is bounded. Restoring the whole training model beside SGLang can still exceed GPU memory, so slime processes weights in buckets.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:51-60,132-204`; `verl/workers/sharding_manager/fsdp_sglang.py:160-188` at `volcengine/verl@0508af25b66e839772fba8e79d97896bf0d843d3`; `model_runner.py:774-792,1464-1479` at the pinned SGLang revision.

## Step 5 · Bound temporary residency with a bucket

**One sentence.** After training moves its weights off the GPU, slime restores one bucket, converts it to the rollout model's layout, transfers it, waits, clears it and reuses the space.

### On the stage

- The two panels compare the same SGLang and KV allocation with either the whole training model or one bucket beside it. The shapes are schematic, not a byte-scale drawing.
- `Bucket 1` is the only training-weight group restored in the right panel. Later buckets wait outside the GPU.
- The bottom order converts the bucket to the rollout model's layout before sending handles, then ends with `ray.get` and `clear`. The sender waits for SGLang's update before releasing that converted bucket.

### Formula and symbols

$$R_{\text{all}}=S+M,\qquad R_{\text{bucket}}=S+b,\qquad b<M$$

| Symbol | Meaning | Source |
|---|---|---|
| $S$ | SGLang weights, KV and related resident state | Existing rollout allocation |
| $M$ | Whole training model restored together | Left panel |
| $b$ | One restored parameter bucket | Right panel |
| $R$ | Temporary combined residency | Sum in each panel |

### The numbers on the stage

No numeric $S$, $M$ or $b$ is available in the source. The valid conclusion is that fewer parameters are restored at once, not a claimed percentage or byte saving. The panel shapes carry no scale.

### Next

Buckets bound memory, but parameters still change one by one. The next step draws the boundary that keeps generation from observing a half-old, half-new model.

Source: `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:254-272,280-296,329-395`.

## Step 6 · Close the version boundary before rollout

**One sentence.** Rollout resumes only after active requests finish, every parameter updates, old KV state becomes invalid and the update call completes.

### On the stage

- Complete `v0` and `v1` models are blue. The red-outlined mixture is not a valid generation state.
- The four boxes enforce an order: wait for active requests to finish, update every parameter, await completion, then start rollout 1.
- Cache produced under `v0` belongs to the old weights. Slime resets prefix caches before buckets; verl, another RL framework, requests a flush with the last parameter.

### Formula and symbols

$$U=\bigwedge_{i=1}^{n}u_i,\qquad \text{start rollout}\Rightarrow U$$

| Symbol | Meaning | Source |
|---|---|---|
| $u_i$ | Parameter $i$ has finished updating | Per-parameter load boundary |
| $n$ | Required parameter count | Model being replaced |
| $U$ | Every required parameter has finished | AND of all $u_i$ |
| $\bigwedge$ | Logical AND over all parameters | Notation introduced here |

### The numbers on the stage

The figure assigns no parameter count. If any $u_i$ fails, the model may contain a partial update and must be discarded rather than used for rollout. This rule does not claim that the pictured implementations provide crash-safe transactions.

### Next

This boundary makes replacement safe to read, but it says nothing about where the wait lies. The next step times the outer call and finds fixed CPU-side sleeps outside `ModelRunner`.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:268-287`; `verl/workers/sharding_manager/fsdp_sglang.py:98-135,164-188`; `Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:451-458,1011-1058`.

## Step 7 · Find the fixed wait outside ModelRunner

**One sentence.** Three 10 ms sleeps outside `ModelRunner` explain most of the 33 ms outer call, and removing them shortened this full update from 7.047 to 2.202 seconds.

### On the stage

- The two full-update bars use one scale. Removing the sleeps leaves a 2.202-second bar beside the original 7.047-second bar.
- The lower strip decomposes one rounded 33 ms outer call into 1 ms inside `ModelRunner`, three 10 ms sleeps and 2 ms of other rounded time.
- `ModelRunner` is the model-owning code on each inference rank, and a `sleep` is a programmed pause. Timing only the inner operation misses those pauses. The debug note also synchronizes CUDA around the measured GPU region so its CPU timer waits for queued work.

### Formula and symbols

$$T_{\text{outer}}\approx T_{\text{inner}}+n\,t_s+T_{\text{other}},\qquad S=T_0-T_1,\qquad Q=T_0/T_1$$

| Symbol | Meaning | Source |
|---|---|---|
| $T_{\text{inner}}$ | `ModelRunner` operation time | Rounded 1 ms |
| $n,t_s$ | Sleep count and duration | $3\times10$ ms |
| $T_{\text{other}}$ | Remaining rounded outer time | 2 ms |
| $T_0,T_1$ | Full update before and after sleep removal | 7.047 and 2.202 s |
| $S,Q$ | Saved seconds and time ratio | Derived here |

### The numbers on the stage

$$1+3\times10+2=33\ \text{ms}$$
$$S=7.047-2.202=4.845\ \text{s},\qquad Q=7.047/2.202\approx3.20$$

The values are rounded successive measurements from one author's setup. They do not establish a general 3.20× improvement.

### Next

Removing a fixed wait does not shrink training's saved tables. The final step asks how each GPU can keep only a slice when those tables do not fit.

Source: `Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:584-605,980-1007,1023-1030,1061-1065`.

## Step 8 · Leave training's saved tables as the next problem

**One sentence.** Weight transfer delivers model parameters, but training also saves gradients and optimizer state, so the next chapter must divide those tables when one GPU cannot hold them.

### On the stage

- `Weights v1` are the model numbers transferred in this chapter. `Gradients` describe how those numbers should change.
- The optimizer is the training component that updates weights. Its state is the extra set of tables it saves for later updates.
- These three kinds of saved tables fill the orange box. Activations and temporary allocations also use memory, but this step deliberately excludes them; it covers only the tables FSDP2 divides.
- The three blue-outlined GPU cards contain question marks. The figure does not answer how their shares are chosen.

### Formula and symbols

$$\mathcal{T}_{\text{saved}}=\{W,G,O\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $W$ | Model weights | `v1` from this chapter |
| $G$ | Gradients, the directions for changing weights | Training process |
| $O$ | Optimizer state, the weight updater's saved tables | Training process |
| $\mathcal{T}_{\text{saved}}$ | These three saved table kinds, excluding activations | The set of all three |

### The numbers on the stage

This step introduces no new size. The source does not supply matching dtypes and sizes for these three table kinds, so a total would be invented.

### Next

Chapter 8 answers the visible question with FSDP2, a way to divide parameters, gradients and optimizer state across GPUs during training, then gather weights for rollout. This chapter stops before that mechanism.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16`; `docs/plan-ml-sys.md:27-28`.
