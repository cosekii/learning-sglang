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

- On desktop, the left panel repeats Step 1's 64 GB full copy on every GPU, reaching 512 GB across eight copies.
- The right panel uses the same bar scale for one rank's 8 GB shard: 1 GB of weights, 1 GB of gradients and 6 GB of optimizer-related tables.
- Mobile shows the same before-and-after quantities as cards instead of bars. Eight ranks own different slices of the same logical tables, so their combined saved state is 64 GB. The equal partition is a teaching simplification, not a promise that real tensors divide evenly.

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

The per-rank breakdown is $8/8=1$ GB of weights, $8/8=1$ GB of gradients and $48/8=6$ GB of optimizer-related tables. On desktop, the 250-pixel and 31.25-pixel bars have an 8:1 width ratio, matching 64:8 GB.

### FSDP2 and DTensor

FSDP2 represents each parameter as a DTensor: the logical tensor plus its distribution metadata and local shards. FSDP1 could instead join a module's parameters into one flat table called `FlatParameter`. Slime's `world_size` counts all ranks. Context parallelism (CP) splits a sequence across `cp_size` ranks, while `dp_size = world_size // cp_size` counts the ranks in the sharding group. The rank layout is called a mesh, and slime passes the DP mesh to `fully_shard`. With CP enabled, physical GPU count and DP shard count can differ; this example uses CP 1.

### Next

Keeping shards saves persistent memory, but a layer still needs its full parameter values for computation. The next step gathers one layer temporarily.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16-23,71-74`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:43-47,62-82`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/actor.py:94-98,158-186`.

## Step 3 · Borrow a full layer for forward computation

**One sentence.** Forward all-gathers the current unit's parameter shards, computes with the full layer and releases the temporary copy.

### On the stage

- The orange 8 GB box is the persistent state owned by one rank from Step 2.
- `All-gather` means every rank contributes its shard so the group can reconstruct one full layer. The implementation calls the layer or parameter group gathered together a unit.
- The blue full layer has temporary size `U`. Computation uses that full layer, then `RELEASE` removes the temporary copy. The persistent 8 GB remains.

### Formula and symbols

$$M_{\text{forward}}\approx M_i+U,\qquad M_{\text{after}}=M_i$$

| Symbol | Meaning | Source |
|---|---|---|
| $M_i$ | Persistent state owned by this rank | Step 2, 8 GB |
| $U$ | Temporary bytes for the full unit being computed | Unit size; no source value |
| $M_{\text{forward}}$ | Residency while this unit is computed | Owned state plus the temporary unit |
| $M_{\text{after}}$ | Residency after the unit is released | Back to owned state |

### The numbers on the stage

The only supplied number is $M_i=8$ GB. The figure does not assign a value to $U$, so it cannot produce a numeric forward peak. It shows only the boundary $8\ \text{GB}+U\rightarrow8\ \text{GB}$, not a measured total.

This all-gather reconstructs parameters; forward computation does not all-gather gradients.

### Next

Backward also needs parameter values, but its new output is a gradient. The next step shows why gradients use reduce-scatter and return to owned slices.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:18`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:53-56,101-105`.

## Step 4 · Reduce gradients back to owned slices

**One sentence.** Backward is the gradient-computing pass after forward; FSDP reduce-scatters each layer's completed gradient so ranks combine updates from different records and keep matching shards.

### On the stage

- Each rank used different training records. Summing matching gradients combines the contributions from those records.
- The blue temporary gradient belongs to one layer, not to the whole model's 8 GB logical gradient table. FSDP reduce-scatters each layer's gradient when it is ready.
- The orange box is the rank's reduced shard for this layer. The 1 GB label comes from Step 2's whole-model saved total, not from this layer's temporary size.
- The optimizer updates the owned weight shards after all layers finish, not once for each box in this flow.

### Formula and symbols

$$g_{\ell,i}=S_{\ell,i}\!\left(\sum_{r=1}^{R}g_\ell^{(r)}\right)$$

| Symbol | Meaning | Source |
|---|---|---|
| $R$ | Number of ranks in the DP sharding group | Step 2, eight ranks |
| $\ell$ | Index of the layer being reduced | The current layer on the stage |
| $r$ | Rank contributing a gradient | One member of the DP group |
| $g_\ell^{(r)}$ | Rank $r$'s gradient for layer $\ell$ | Backward computation after forward |
| $S_{\ell,i}$ | Select rank $i$'s shard of layer $\ell$'s gradient | FSDP placement |
| $g_{\ell,i}$ | Reduced gradient shard for layer $\ell$ retained by rank $i$ | Reduce-scatter result; size not supplied |

### The numbers on the stage

The only gradient size on the stage is Step 2's whole-model saved total: the logical gradient table is 8 GB, so equal sharding gives $8/8=1$ GB per rank across all layers. Neither the temporary layer gradient nor the reduced layer shard has a supplied size. The optimizer runs after all layers finish, not once per layer.

Slime calls `loss.backward()` and `optimizer.step()` in the actor. The FSDP wrapper handles parameter gathers and per-layer gradient reduce-scatter; the actor does not write separate collective calls beside those methods.

### Next

Persistent shards are smaller, but full units and other temporary results still need space. The next step separates owned state from peak memory.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:19,71-74`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:47-58`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/actor.py:687-702,1000-1039`.

## Step 5 · Owned state is only one part of peak memory

**One sentence.** The 8 GB owned state persists, while the largest gathered unit, activations and other temporary results add memory whose total is not supplied.

### On the stage

- The orange bottom band is the persistent 8 GB from Step 2. It does not disappear between units.
- The blue band is the largest borrowed full layer from Step 3. The formula below calls its unknown size $U_{\max}$; Step 3 called the current layer's size $U$.
- The grey band contains training intermediates and other temporary results. The formula below calls activation memory $A$. Activations are intermediate values needed for training and change with batch size. No exact total is drawn because the source does not provide one.

### Formula and symbols

$$M_{\text{peak}}\approx M_i+U_{\max}+A+T_{\text{other}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $M_i$ | Persistent owned training state | Step 2, 8 GB |
| $U_{\max}$ | Largest full unit temporarily materialized | Unit sizes; no numeric value supplied |
| $A$ | Activation memory | Intermediate training results; batch-dependent |
| $T_{\text{other}}$ | Other temporary allocations | Not quantified in this chapter |
| $M_{\text{peak}}$ | Memory needed at the busiest point | Boundary only, not a measured total |

### The numbers on the stage

The only numeric term is $M_i=8$ GB. Since the other terms are unknown, the figure concludes $M_{\text{peak}}>8$ GB rather than inventing a total. The approximate decomposition is a reading aid, not a guarantee that every allocation can simply be added without overlap.

The linked source gives a formula with the largest fully materialized FSDP unit in its FSDP1 Stage 3 section. This chapter borrows the category distinction and explicitly does not present that formula as an exact FSDP2/slime peak measurement.

### Next

After training, rollout needs complete new parameter values, not gradients or optimizer state. The next step gathers full weight tensors into buckets for the existing update path.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:31,93-107`; `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:18-19`.

## Step 6 · Export full weight tensors in buckets

**One sentence.** Slime redistributes each sharded weight tensor to a full tensor, groups full tensors into buckets and leaves gradients and optimizer state in training.

### On the stage

- The export starts with weight shards only. Gradients and optimizer-state tables remain in the training box.
- `Replicate()` reconstructs one complete logical weight tensor from its DTensor shards. It does not reconstruct every parameter at once.
- Full tensors join a bucket. After asynchronous results are ready, the bucket uses Chapter 7's update path and rollout receives `v1`.
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
