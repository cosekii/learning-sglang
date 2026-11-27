## Step 1 · Count the full training copies

**One sentence.** Full replication puts the same weights, gradients and optimizer state on every GPU, so this constructed example costs 64 GB per GPU and 512 GB across eight GPUs.

### On the stage

- The orange card separates 8 GB of 16-bit weights, 8 GB of 16-bit gradients and 48 GB of optimizer-related tables. Together they are the 64 GB saved training state on one GPU.
- The blue card repeats that full 64 GB copy on all eight GPUs. The 512 GB total counts repeated copies, not eight different models.
- The 80% comparison uses the shared 80 GB H100 capacity from earlier chapters. This example covers saved tables only, not the whole memory budget.

### Formula and symbols

$$M=P(b_w+b_g+b_o),\qquad C=N M,\qquad f=M/(80\ \text{GB})$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | Number of model weight values | Constructed 4B example, $4\times10^9$ |
| $b_w,b_g$ | Bytes per stored weight and gradient | 2 bytes each in this example |
| $b_o$ | Optimizer-related bytes per weight value | Three FP32 tables: $3\times4=12$ bytes |
| $M$ | Saved training tables on one fully replicated GPU | Derived here |
| $N$ | Number of full copies | Eight GPUs |
| $C$ | Saved tables across all copies | Derived here |
| $f$ | Fraction of one 80 GB H100 occupied by $M$ | Shared H100 capacity |

### The numbers on the stage

$$M=4{,}000{,}000{,}000\times(2+2+12)=64{,}000{,}000{,}000\ \text{bytes}=64\ \text{GB}$$
$$C=8\times64\ \text{GB}=512\ \text{GB},\qquad f=64/80=0.8=80\%$$

The optimizer convention has three FP32 tables: master weights, the full-precision weight copy used for updates; momentum, a running average of gradients; and variance, a running average of squared gradients. It belongs to this worked example, not to every possible FSDP2 configuration. No activation, gather buffer or runtime allocation is included yet.

### Next

The bill comes from repeating the same tables. The next step divides those tables across the same eight ranks instead of copying them.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:21-31`; shared `HBM_GB` in `src/numbers.ts`.

## Step 2 · Own one slice instead of a full copy

**One sentence.** FSDP2 divides the parameters, gradients and optimizer state across the data-parallel (DP) group, whose ranks train on different records, leaving each rank with matching shards instead of a full replica.

### On the stage

- The orange logical tensor `W` is one complete parameter. Its eight numbered rows are a toy shape used to make the split visible.
- `Shard(0)` is the DTensor placement: it splits dimension 0, the rows in this example, across the eight DP ranks. The blue cards show each rank's local shard. In this toy example, rank `r` keeps row `r` on GPU `r`.
- `ALL SAVED TABLES` marks the aggregate memory account, separate from the one-row parameter shard above it. The orange and blue bars use one scale, 250 px = 512 GB: eight full copies hold 512 GB, while eight owned shards hold 64 GB. The formulas derive `64 ÷ 8 = 8` GB of saved training state per rank and its `1 + 1 + 6` GB breakdown.
- The bottom box gives one forward pointer: later steps gather the parts back when they need full values. Step 4's all-gather reconstructs a full layer for computation. Step 7's `Replicate()` redistribution reconstructs one full weight tensor for export.
- Mobile presents the same logical tensor, placement, local shards and memory arithmetic as cards. Equal rows and equal memory shards are teaching simplifications, not promises that real tensors divide evenly.

### Formula and symbols

$$M_i=M/R,\qquad C_{\text{shard}}=R M_i$$

| Symbol | Meaning | Source |
|---|---|---|
| $M$ | Bytes in one full training-state copy | Step 1, 64 GB |
| $R$ | Number of ranks in the DP sharding group | Eight ranks in this example |
| $i$ | One rank's identifier | Rank 0 through 7 |
| $M_i$ | Saved tables owned by rank $i$ | Derived here, 8 GB |
| $C_{\text{shard}}$ | Owned shards across the DP group | Derived here, 64 GB |

### The numbers on the stage

$$M_i=64\ \text{GB}/8=8\ \text{GB},\qquad C_{\text{shard}}=8\times8\ \text{GB}=64\ \text{GB}$$

The per-rank breakdown is $8/8=1$ GB of weights, $8/8=1$ GB of gradients and $48/8=6$ GB of optimizer-related tables. The figure keeps these aggregate memory quantities separate from the toy eight-row parameter above them.

### FSDP2 and DTensor

FSDP2 represents each parameter as a DTensor: the logical tensor, its placement on a device mesh and the local shard stored on each rank. On a 1D mesh, `fully_shard` represents sharded parameters as dim-0 DTensors with `Shard(0)` placement. `Shard(0)` follows `torch.chunk(..., dim=0)` semantics, so dimension 0 is split across the DP mesh. The stage uses eight rows and eight ranks so that each local shard is one visible row; real parameters can have other shapes and uneven shards.

FSDP1 could instead join a module's parameters into one flat table called `FlatParameter`. Slime's `world_size` counts all ranks. Context parallelism (CP) splits a sequence across `cp_size` ranks, while `dp_size = world_size // cp_size` counts the ranks in the sharding group. The rank layout is called a mesh, and slime passes the DP mesh to `fully_shard`. With CP enabled, physical GPU count and DP shard count can differ; this example uses CP 1.

The placement also explains the two later paths. Forward all-gathers the current unit's parameter shards for computation. During export, slime calls `redistribute` with `Replicate()` on each parameter DTensor and then uses the resulting local full tensor.

### Next

Keeping shards saves persistent memory, but a layer still needs its full parameter values for computation. The next step prepares packed records. Step 4 gathers one layer temporarily, and Step 7 revisits the same DTensor when it exports one full tensor through `Replicate()`.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16-23`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:43-47,62-82`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/actor.py:94-98,158-186` and `update_weight_utils.py:45-74`; `pytorch/pytorch@v2.8.0`, `torch/distributed/fsdp/_fully_shard/_fully_shard.py`, `fully_shard`, and `torch/distributed/tensor/placement_types.py`, `Shard` and `Replicate`.

## Step 3 · Pack records by total tokens

**One sentence.** One unified `train` call repeats normalized rewards over response tokens, then uses a constructed token cap of 4 to form two packs with explicit total-token boundaries.

### On the stage

- The locator enters `train`, calls `process_rollout_data` for this rank's records, and repeats each normalized `rewards[i]` by `response_lengths[i]` to form that record's `advantages`. `Returns` repeats the same values but stays off this compact stage.
- Records A, B and C have total lengths 2, 2, 4 and response lengths 1, 1, 2. Their symbolic normalized rewards are $+u$, $-u$ and $+u$, where $u=0.9354$ comes from Ch. 6 Step 6. These are constructed records, not Chapter 6's first three records.
- `FIRST FIT · COUNT ONLY` places A and B in one capacity bin and C in another, yielding count 2. DP `MAX` leaves that count unchanged in this DP1 example. First fit supplies the count, not the final membership.
- `pack_sequences(num_packs=2)` supplies the balanced membership A+B and C. Each pack stores its local `flat_tokens` concatenation under the key `tokens`. `cu_seqlens` starts at 0 and adds each whole record's total tokens.
- Pack 1 stores `[pA,a1,pB,b1]` with `cu_seqlens=[0,2,4]`; Pack 2 stores `[pC,c1,c2,c3]` with `cu_seqlens=[0,4]`. `grad_accum=[2]` puts the sole optimizer boundary after Pack 2.

### Formula and symbols

$$a_{i,j}=r_i\quad(1\leq j\leq L_i),\qquad c_0=0,\qquad c_{k+1}=c_k+\ell_k$$

| Symbol | Meaning | Source |
|---|---|---|
| $r_i$ | Normalized reward for record $i$ | Ch. 6 Step 6; symbolic here |
| $L_i$ | Response-token count for record $i$ | Constructed response lengths 1, 1, 2 |
| $a_{i,j}$ | Advantage at response position $j$ of record $i$ | `_train_core` repeats $r_i$ |
| $\ell_k$ | Total token count of record $k$ in this pack | `tokens.length`, including prompt and response |
| $c_k$ | Total-token boundary in `cu_seqlens` | Cumulative sum in `pack_sequences` |

### The numbers on the stage

The constructed cap is 4. First fit gives `A+B=4`, then C needs another bin, so the local count and DP1 `MAX` are both 2. Balanced packing assigns A+B and C. Thus Pack 1 has `2+2=4` tokens and boundaries `[0,2,4]`; Pack 2 has 4 tokens and `[0,4]`. Accumulating the pack counts gives `grad_accum=[2]`.

The example uses DP1 and CP1, so it needs no DP count change, CP capacity multiplier or CP padding. The shipped Qwen3-4B FSDP script uses `--max-tokens-per-gpu 9216`; cap 4 belongs only to this teaching example. The budget chooses the count here. It is not a claim that every balanced partition has a hard-cap assertion.

### Next

Step 4 follows Pack 1 into the grad-enabled forward. It preserves the existing 7 GB, all-gather, temporary layer and release account.

Sources: `THUDM/slime@55e41ffe`, <code>slime/backends/<wbr>fsdp_utils/<wbr>actor.py</code> (`train`, `_train_core`, `_packed_data`), <code>slime/utils/<wbr>data.py</code> (`process_rollout_data`, <code>get_minimum_<wbr>num_<wbr>micro_<wbr>batch_<wbr>size</code>), <code>slime/backends/<wbr>fsdp_utils/<wbr>data_packing.py</code> (`pack_sequences`), and <code>scripts/<wbr>run-qwen3-4B-fsdp.sh</code> (`--use-dynamic-batch-size`, `--max-tokens-per-gpu 9216`).

## Step 4 · Borrow a full layer for forward computation

**One sentence.** After `zero_grad` clears the old gradient shard, forward starts with 7 GB and temporarily gathers one full layer.

### On the stage

- The orange box holds the 1 GB weight shard and 6 GB of optimizer-related tables from Step 2. The 1 GB gradient shard is absent because slime calls `optimizer.zero_grad(set_to_none=True)` before this initial forward.
- `All-gather` means every rank contributes its shard so the group can reconstruct one full layer. The implementation calls the layer or parameter group gathered together a unit.
- The blue full layer has temporary size `U`. Computation uses that full layer, then `RELEASE` removes the temporary copy. The 7 GB of weights and optimizer tables remains.
- The last line restores the full training-state bill from Step 2: backward adds the 1 GB gradient shard, giving `7 + 1 = 8 GB`.

### Formula and symbols

$$M_0=W_i+O_i,\qquad M_{\text{forward}}\approx M_0+U,\qquad M_{\text{after}}=M_0$$

| Symbol | Meaning | Source |
|---|---|---|
| $W_i$ | Weight shard owned by this rank | Step 2, 1 GB |
| $O_i$ | Optimizer-related tables owned by this rank | Step 2, 6 GB |
| $M_0$ | Residency at initial forward after `zero_grad` | $W_i+O_i=7$ GB |
| $U$ | Temporary bytes for the full unit being computed | Unit size; no source value |
| $M_{\text{forward}}$ | Residency while this unit is computed | Starting tables plus the temporary unit |
| $M_{\text{after}}$ | Residency after the unit is released | Back to $M_0$ before backward stores gradients |

### The numbers on the stage

The initial forward boundary is $1+6=7$ GB, so the figure shows $7\ \text{GB}+U\rightarrow7\ \text{GB}$. It does not assign a value to $U$ or claim a measured peak. The complete training-state bill is $7+1=8$ GB only when the gradient shard is also stored.

This all-gather reconstructs parameters; forward computation does not all-gather gradients.

### Next

Backward also needs parameter values, but its new output is a gradient. The next step shows why gradients use reduce-scatter and return to owned slices.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:18`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:53-56,101-105`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/actor.py:522-535`.

## Step 5 · Pre-scale by R/B, then average gradients

**One sentence.** Slime scales each rank's loss by $R/B$, then FP32 FSDP2 averages the pre-scaled gradients and keeps matching shards.

### On the stage

- Each rank used different training records. Before backward, slime evaluates `loss = loss * dp_size / global_batch_size`, so each rank's loss carries the scale $R/B$.
- The blue temporary gradient belongs to one layer and comes from that pre-scaled loss. On this FP32 reduction path, FSDP2's default reduce-scatter operation is AVG: it sums matching values, divides by $R$, and keeps one shard per rank.
- AVG supplies the remaining $1/R$. Together, $R/B$ pre-scaling and AVG produce the mean over the global batch, not an update eight times too large.
- The orange box is the rank's averaged shard for this layer. The label shows the all-layers gradient total: 8 GB ÷ 8 = 1 GB per rank, not this layer's temporary size.
- The optimizer updates the owned weight shards after all layers finish, not once for each box in this flow.

### Formula and symbols

$$\mathcal L'_r=\mathcal L_r\frac{R}{B},\qquad g_\ell^{(r)}=\frac{R}{B}\tilde g_\ell^{(r)}$$

$$g_{\ell,i}=S_{\ell,i}\!\left(\frac1R\sum_{r=1}^{R}g_\ell^{(r)}\right)=S_{\ell,i}\!\left(\frac1B\sum_{r=1}^{R}\tilde g_\ell^{(r)}\right)$$

| Symbol | Meaning | Source |
|---|---|---|
| $R$ | Number of ranks in the DP sharding group, `dp_size` | Step 2, eight ranks |
| $B$ | Global batch size for the optimizer update | `global_batch_size` in the run configuration; no value assigned in the memory example |
| $\mathcal L_r$ | Rank $r$'s loss before DP scaling | The current microbatch |
| $\mathcal L'_r$ | Pre-scaled loss passed to backward | $\mathcal L_rR/B$ |
| $\ell$ | Index of the layer being reduced | The current layer on the stage |
| $r$ | Rank contributing a gradient | One member of the DP group |
| $\tilde g_\ell^{(r)}$ | Rank $r$'s gradient before DP scaling | Backward from $\mathcal L_r$ |
| $g_\ell^{(r)}$ | Rank $r$'s **pre-scaled** gradient for layer $\ell$ | Backward from $\mathcal L'_r$, equal to $\tilde g_\ell^{(r)}R/B$ |
| $S_{\ell,i}$ | Select rank $i$'s shard of layer $\ell$'s gradient | FSDP placement |
| $g_{\ell,i}$ | Averaged gradient shard for layer $\ell$ retained by rank $i$ | FP32 FSDP2 reduce-scatter with AVG; size not supplied |

### The numbers on the stage

This example has $R=8$ and leaves $B$ symbolic. A separate two-rank arithmetic check uses $R=2$, $B=8$, and unscaled scalar gradients $\tilde g^{(1)}=2$ and $\tilde g^{(2)}=6$. Pre-scaling gives $g^{(1)}=2\times2/8=0.5$ and $g^{(2)}=6\times2/8=1.5$. AVG gives $(0.5+1.5)\div2=1$, which matches the global-batch mean $(2+6)\div8=1$.

On this default FP32 path, FSDP2 sets both extra predivide and postdivide factors to `None`; NCCL's AVG supplies the $1/R$ division. The stage labels the all-layers gradient total: 8 GB ÷ 8 = 1 GB per rank across all layers. This is only the gradient table's shard; the rank's complete training-state bill is 8 GB from Step 2. Neither the temporary layer gradient nor the averaged layer shard has a supplied size.

Slime sets `reduce_dtype=torch.float32`, scales the loss on the line before `loss.backward()`, and later calls `optimizer.step()`. The FSDP wrapper handles parameter gathers and per-layer gradient reduce-scatter; the actor does not write separate collective calls beside those methods.

### Next

The training-state bill is smaller, but full units and other temporary results still need space. The next step separates that bill from peak memory.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:19`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:47-58`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/actor.py:687-702,1000-1034`; `pytorch/pytorch@v2.8.0`, `_fsdp_collectives.py:605-641`.

## Step 6 · The training-state bill is only one part of peak memory

**One sentence.** The complete training-state bill is 8 GB, and the largest gathered unit, activations and other temporary results raise the peak above it.

### On the stage

- The orange bottom band is the complete 8 GB training-state bill from Step 2. It includes the gradient shard, so it is a logical and peak-state account, not a permanent forward residency floor. Step 4 starts forward with 7 GB after `zero_grad` clears that shard.
- The blue band is the largest borrowed full layer from Step 4. Its size is not supplied.
- The grey band contains training intermediates and other temporary results. Activations are intermediate values needed for training and change with batch size. No exact total is drawn because the source does not provide one.

### Formula and symbols

$$M_{\text{state}}=W_i+G_i+O_i,\qquad M_{\text{peak}}>M_{\text{state}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $W_i$ | Weight shard owned by this rank | Step 2, 1 GB |
| $G_i$ | Gradient shard owned by this rank when gradients are stored | Step 2, 1 GB |
| $O_i$ | Optimizer-related tables owned by this rank | Step 2, 6 GB |
| $M_{\text{state}}$ | Complete training-state bill | Step 2, $1+1+6=8$ GB |
| $M_{\text{peak}}$ | Memory needed at the busiest point | Greater than the 8 GB bill; exact total unknown |

### The numbers on the stage

The complete bill is $M_{\text{state}}=1+1+6=8$ GB. Temporary layers and intermediates make $M_{\text{peak}}>8$ GB, but their sizes are unknown. After `zero_grad`, the initial forward instead starts at $W_i+O_i=7$ GB before adding its temporary layer.

The linked source gives a formula with the largest fully materialized FSDP unit in its FSDP1 Stage 3 section. This chapter borrows only the category distinction. It does not present that formula as an exact FSDP2/slime peak measurement or assume that every allocation overlaps in one simple sum.

### Next

After training, rollout needs complete new parameter values, not gradients or optimizer state. The next step gathers full weight tensors into buckets for the existing update path.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:31,93-107`; `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:18-19`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/actor.py:522-535`.

## Step 7 · Export full weight tensors in buckets

**One sentence.** Slime redistributes each sharded weight tensor to a full tensor, groups full tensors into buckets and leaves gradients and optimizer state in training.

### On the stage

- The export starts with weight shards only. Gradients and optimizer-state tables remain in the training box.
- `Replicate()` reconstructs one complete logical weight tensor from its DTensor shards. It does not reconstruct every parameter at once.
- Full tensors join a bucket. After asynchronous results are ready, the bucket follows Ch. 7 Step 5's one-bucket-at-a-time handoff. Ch. 7 Step 6 then waits for one complete version and rejects old KV, so rollout receives `v1` as a complete version.
- The closing question concerns the 16-bit and 32-bit saved tables from earlier steps: sharding changed their copies, not their bits per number.

### Formula and symbols

$$W_j=\mathcal{R}(D_j),\qquad B_k=\{W_j\mid j\in J_k\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $D_j$ | Sharded DTensor for parameter $j$ across the DP group | FSDP2 model state |
| $\mathcal{R}$ | Redistribute all of $D_j$'s shards to `Replicate()` | Slime updater |
| $W_j$ | Full logical weight tensor for parameter $j$ | Result of redistribution |
| $J_k$ | Parameter indices grouped into bucket $k$ | Size-bounded updater loop |
| $B_k$ | One bucket of full weight tensors | Bucket handed to the updater |

### The numbers on the stage

The saved weight and gradient values use $16/8=2$ bytes each. Each optimizer-table value uses $32/8=4$ bytes, which is $4/2=2$ times as many bytes.

### Bucket threshold from the shipped script

The shipped Qwen3-4B FSDP script sets `update_weight_buffer_size` to $536{,}870{,}912$ bytes:

$$536{,}870{,}912/(1024\times1024)=512\ \text{MiB}$$

This is a bucket-flushing threshold, not a hard memory cap. The source does not supply a total temporary-memory measurement, so the figure does not claim one.

The updater calls `param.cuda()` before redistribution. The stage therefore starts with a local or restored shard and does not assert that every FSDP2 deployment begins with all training weights on CPU. Asynchronous tensors are waited on before `update_bucket_weights`.

### Next

The saved tables still use 16 or 32 bits per number. Chapter 9 examines which parts of rollout and training can use FP8 instead; this chapter makes no precision or speed claim for FP8.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:134-140`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/update_weight_utils.py:45-74` and `scripts/run-qwen3-4B-fsdp.sh:93-108`; `docs/plan-ml-sys.md:28-29`.
