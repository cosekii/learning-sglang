## Step 1 · Count the full training copies

**One sentence.** Full replication puts the same weights, gradients and optimizer state on every GPU, so this constructed example costs 64 GB per GPU and 512 GB across eight GPUs.

### On the stage

- The orange card separates 8 GB of 16-bit weights, 8 GB of 16-bit gradients and 48 GB of optimizer-related tables. Together they are the 64 GB saved training state on one GPU.
- The blue card repeats that full 64 GB copy on all eight GPUs. The 512 GB total counts repeated copies, not eight different models.
- The 80% comparison uses the shared 80 GB H100 capacity from earlier chapters. This example covers saved tables only, not the whole memory budget.

### Formula and symbols

$$M=P(b_w+b_g+b_o),\qquad C=N M,\qquad f=M/80\ \text{GB}$$

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

The optimizer convention is FP32 master weights, momentum and variance. It belongs to this worked example, not to every possible FSDP2 configuration. No activation, gather buffer or runtime allocation is included yet.

### Next

The bill comes from repeating the same tables. The next step divides those tables across the same eight ranks instead of copying them.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:21-31`; shared `HBM_GB` in `src/numbers.ts`.

## Step 2 · Own one slice instead of a full copy

**One sentence.** FSDP2 divides the parameters, gradients and optimizer state across the DP group, leaving each rank with matching shards instead of a full replica.

### On the stage

- The left panel repeats Step 1's 64 GB full copy on every GPU, reaching 512 GB across eight copies.
- The right panel uses the same bar scale for one rank's 8 GB shard: 1 GB of weights, 1 GB of gradients and 6 GB of optimizer-related tables.
- Eight ranks own different slices of the same logical tables, so their combined saved state is 64 GB. The equal partition is a teaching simplification, not a promise that real tensors divide evenly.

### Formula and symbols

$$M_i=M/N,\qquad C_{\text{shard}}=N M_i$$

| Symbol | Meaning | Source |
|---|---|---|
| $M$ | Bytes in one full training-state copy | Step 1, 64 GB |
| $N$ | DP sharding-group size | Eight ranks in this example |
| $i$ | One rank's identifier | Rank 0 through 7 |
| $M_i$ | Saved tables owned by rank $i$ | Derived here, 8 GB |
| $C_{\text{shard}}$ | Owned shards across the DP group | Derived here, 64 GB |

### The numbers on the stage

$$M_i=64\ \text{GB}/8=8\ \text{GB},\qquad C_{\text{shard}}=8\times8\ \text{GB}=64\ \text{GB}$$

The per-rank breakdown is $8/8=1$ GB of weights, $8/8=1$ GB of gradients and $48/8=6$ GB of optimizer-related tables. The 250-pixel and 31.25-pixel bars have an 8:1 width ratio, matching 64:8 GB.

### FSDP2 and DTensor

FSDP2 represents each parameter as a DTensor: the logical tensor plus its distribution metadata and local shards. It does not need FSDP1's module-wide `FlatParameter`. Slime computes `dp_size = world_size // cp_size` and passes the DP mesh to `fully_shard`. With CP enabled, physical GPU count and DP shard count can differ; this example uses CP 1.

### Next

Keeping shards saves persistent memory, but a layer still needs its full parameter values for computation. The next step gathers one layer temporarily.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16-23`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:43-47,62-82`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/actor.py:94-98,158-186`.

## Step 3 · Borrow a full layer for forward computation

**One sentence.** Forward all-gathers the current unit's parameter shards, computes with the full layer and releases the temporary copy.

### On the stage

- The orange 8 GB box is the persistent state owned by one rank from Step 2.
- `All-gather` means every rank contributes its shard so the group can reconstruct the full parameter values for one FSDP unit. A unit is the layer or parameter group gathered together.
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

The all-gather reconstructs parameters. Gradients do not exist until backward computation, so they are not part of this gather.

### Next

Backward also needs parameter values, but its new output is a gradient. The next step shows why gradients use reduce-scatter and return to owned slices.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:18`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:53-56,101-105`.

## Step 4 · Reduce gradients back to owned slices

**One sentence.** Backward reduce-scatters the completed gradients, then each rank's optimizer updates the parameter shard whose gradient it owns.

### On the stage

- The blue full gradient is temporary output from backward computation. Parameters were gathered as needed, but gradients do not use that same collective.
- `Reduce-scatter` sums matching gradient values across ranks and gives each rank its reduced slice. The owned gradient in this example is 1 GB.
- The optimizer uses that gradient slice and its saved optimizer-state tables to update the rank's weight shard. The full gradient is not retained.

### Formula and symbols

$$g_i=S_i\!\left(\sum_{r=1}^{N}g^{(r)}\right)$$

| Symbol | Meaning | Source |
|---|---|---|
| $N$ | DP sharding-group size | Step 2, eight ranks |
| $r$ | Rank contributing a gradient | One member of the DP group |
| $g^{(r)}$ | Gradient values contributed by rank $r$ | Backward computation |
| $S_i$ | Select the slice owned by rank $i$ | FSDP placement |
| $g_i$ | Reduced gradient shard retained by rank $i$ | Reduce-scatter result, 1 GB in this example |

### The numbers on the stage

The example's full gradient table is 8 GB across the logical model, so equal sharding gives $8/8=1$ GB per rank. The figure does not claim that the full temporary gradient has a measured peak size or that every real tensor splits evenly.

Slime calls `loss.backward()` and `optimizer.step()` in the actor. The FSDP wrapper handles parameter gathers and gradient reduce-scatter; the actor does not write separate collective calls beside those methods.

### Next

Persistent shards are smaller, but full units and other temporary results still need space. The next step separates owned state from peak memory.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:19`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:47-58`; `THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7`, `slime/backends/fsdp_utils/actor.py:687-702,1000-1039`.
