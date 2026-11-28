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

## Step 4 · Give each pack its own actor loss

**One sentence.** Each pack compares current and old token probabilities, clips the change, and averages the included response-token losses.

### On the stage

- Blue marks the forward values and actor-loss arithmetic. The actor loss is a training score to make smaller, and a negative value is allowed. `FORWARD` keeps two constructed views separate: DP1 for the packing arithmetic and DP8 for the memory account. After `zero_grad(set_to_none=True)` clears the old gradient shard, the DP8 example holds 7 GB of weight and optimizer shards. `All-gather` rebuilds a temporary full layer of unknown size $U$, and `release` removes it. The 7 GB figure covers parameter tables only, not all training memory or the peak.
- `UNPACK` uses Pack 1's `cu_seqlens=[0,2,4]` to recover records A and B. Each has one response token and a response mask of `[1]`. Mask 1 includes that token in its record's mean; mask 0 would exclude it.
- `RATIO` is the current token probability divided by the old token probability. A ratio above 1 means the current model gives that token more chance. The old scoring pass and current training pass produce the two log probabilities. The constructed gaps are $+0.3365$ for A and $-0.3567$ for B, giving ratios 1.40 and 0.70.
- `CLIP` keeps the ratio inside the shipped bounds 0.80 and 1.28. Step 3 supplies advantages $+u$ for A and $-u$ for B. Their clipped ratios are 1.28 and 0.80.
- `LOSS` negates the unclipped and clipped products, then takes the larger value. A yields $-1.1973$ and B yields $+0.7483$. Pack 1's per-record means sum to $L_1=-0.4490$.
- Pack 2 contains record C with response tokens `c2` and `c3`. Its constructed ratios are `[1.00,1.00]`, so clipping changes neither one. Both advantages are $+u$, giving losses `[-0.9354,-0.9354]`. Its mask `[1,1]` includes both tokens, so the two-token mean is $L_2=-0.9354$.

### Formula and symbols

$$\rho_{i,j}=\exp(\operatorname{log\_probs}_{i,j}-\operatorname{old\_log\_probs}_{i,j})$$

$$\hat\rho_{i,j}=\operatorname{clip}(\rho_{i,j},0.80,1.28)$$

$$\ell_{i,j}=\max(-\rho_{i,j}a_i,-\hat\rho_{i,j}a_i)$$

$$\bar\ell_i=\frac{\sum_j\ell_{i,j}m_{i,j}}{\max(\sum_jm_{i,j},1)},\qquad L_p=\sum_{i\in p}\bar\ell_i$$

| Symbol | Meaning | Source |
|---|---|---|
| $\rho_{i,j}$ | Current probability divided by old probability at response position $j$ of record $i$ | Current and old log probabilities; constructed gaps here |
| $\hat\rho_{i,j}$ | Clipped ratio | Shipped `eps_clip=0.2`, `eps_clip_high=0.28` |
| $a_i$ | Advantage for record $i$ | Step 3: $+u$ for A and C, $-u$ for B |
| $\ell_{i,j}$ | Negated PPO policy loss at response position $j$ | <code>compute_<wbr>policy_<wbr>loss</code>: larger of the two negative products |
| $m_{i,j}$ | Response mask | 1 includes the token, 0 excludes it; Pack 1 uses `[1]`, Pack 2 uses `[1,1]` |
| $\bar\ell_i$ | Masked mean within record $i$ | <code>sum_of_<wbr>sample_<wbr>mean</code>; denominator is clamped to at least 1 |
| $L_p$ | Sum of per-record means in pack $p$ | $L_1$ for A+B, $L_2$ for C |

### The numbers on the stage

The calculations use the unrounded $u$ from Step 3. The stage displays it as 0.9354. For A, $\exp(0.3365)\approx1.40$ is clipped to 1.28:

$$\ell_A=\max(-1.40u,-1.28u)=\max(-1.3096,-1.1973)=-1.1973$$

For B, $\exp(-0.3567)\approx0.70$ is clipped to 0.80. Its advantage is $-u$:

$$\ell_B=\max(-0.70(-u),-0.80(-u))=\max(+0.6548,+0.7483)=+0.7483$$

Both Pack 1 masks are `[1]`, so $L_1=-1.1973+0.7483=-0.4490$. For C, both ratios are 1 and both mask entries are 1:

$$L_2=\frac{-u+(-u)}{1+1}=-u=-0.9354$$

The shipped script sets both `entropy_coef` and `kl_loss_coef` to 0, so those optional terms do not change either worked loss. The gaps and masks are constructed teaching values, not measurements from a training run.

### Derived · not drawn

For an all-zero or empty response mask, the numerator is 0 and the clamped denominator is 1, so that record contributes 0. The stage draws only masks containing 1.

### Implementation boundaries

The implementation stores `ppo_kl = old_log_probs - log_probs`. Thus `(-ppo_kl).exp()` is the stage's $\exp(\operatorname{log\_probs}-\operatorname{old\_log\_probs})$. This example leaves `use_rollout_logprobs` off: the earlier no-grad, scoring-only actor pass writes `log_probs`, which becomes `old_log_probs`, and the grad-enabled training pass writes `cur_log_probs`. Enabling that flag instead selects `rollout_log_probs` as the old scores; the stage does not draw that alternative. <code>compute_<wbr>policy_<wbr>loss</code> negates both products and uses `maximum`. This matches the usual PPO minimum after the signs are restored.

<code>sum_of_<wbr>sample_<wbr>mean</code> computes a masked mean inside each record and then sums the records. It is not one mean over all response tokens in the pack. TIS, GSPO sequence ratios and nonzero entropy or KL coefficients are optional paths outside this worked example. This actor-loss step does not expand backward, gradient accumulation, the optimizer update or offload.

### Next

The next step pre-scales actor loss and follows the resulting gradients.

Sources: <code>THUDM/<wbr>slime@<wbr>55e41ffef7193fdd4c8bc14720233e446446b1d7</code>, <code>slime/backends/<wbr>fsdp_utils/<wbr>actor.py</code> (`_train_step`, <code>sum_of_<wbr>sample_<wbr>mean</code>), <code>slime/utils/<wbr>ppo_utils.py</code> (<code>compute_<wbr>policy_<wbr>loss</code>), <code>slime/backends/<wbr>fsdp_utils/<wbr>data_packing.py</code> (`unpack_sequences`), and `scripts/run-qwen3-4B-fsdp.sh` (GRPO arguments).

## Step 5 · Accumulate two packs, update once, then export

**One sentence.** Each pack pre-scales immediately before its own backward pass, two packs accumulate gradients before one optimizer update, and the main loop then conditionally offloads before exporting the new weights.

### On the stage

- The first blue row is a rule, not a claim that both packs scale at once: each pack scales its own loss only when that pack reaches backward. `R = dp_size = rank count` and `B = global_batch_size = records per update`; the scale is `loss × R/B`. $W_0$ means the old weights.
- Pack 1 then scales $L_1=-0.4490$, runs backward and produces its gradient $g_1$. The stage saves $G=g_1$ and leaves the weights at $W_0$.
- Pack 2 scales $L_2=-0.9354$ only after Pack 1's backward, then produces its gradient $g_2$. Gradient accumulation means keeping the earlier gradient and adding the new one, so the saved sum is $G=g_1+g_2$. Neither backward pass calls the optimizer.
- The boundary after Pack 2 matches `grad_accum=[2]`. One `optimizer.step()` changes old $W_0$ to updated $W_1$, then `zero_grad(set_to_none=True)` clears $G$.
- After `train` returns, the grey rows show the main loop's order. With `offload_train` enabled, the model and optimizer move from GPU to CPU. `update_weights` then exports only $W_1$; the already-cleared $G$ is not exported. Rollout restoration sits between those calls in `train.py`, but is not drawn. Step 7 expands the bucketed export.
- A bordered `DP8 · SEPARATE REDUCTION VIEW` does not assign cross-rank averaging to the DP1 packs above it. It defines FP32 as 32-bit values and AVG as the rank sum divided by $R$. The $R/B$ pre-scale and AVG's $1/R$ give $1/B$, the mean over all $B$ records. The separate memory label counts all layers' saved gradient shards: 8 GB ÷ 8 = 1 GB per rank.
- Mobile labels the first rule `DP1` and the final reduction view `DP8 · SEPARATE`. It writes `old weights` and `new weights` instead of $W_0$ and $W_1$, and its subtitle defines $G$ as the saved sum.
- Blue marks losses and gradients, orange the optimizer update, and grey the post-train operations.

### Formula and symbols

$$\mathcal L'_p=\mathcal L_p\frac{R}{B}$$

$$G_1=g_1,\qquad G_2=g_1+g_2$$

$$W_1=\operatorname{optimizer.step}(W_0,G_2)$$

$$\text{Separate DP8 view:}\qquad \frac{R}{B}\times\frac1R=\frac1B$$

| Symbol | Meaning | Source |
|---|---|---|
| $p$ | Pack number | Pack 1 or Pack 2 from Step 3 |
| $R$ | DP rank count, `dp_size` | 1 in this DP1 pack sequence; 8 in the separate DP8 view |
| $B$ | Records in the global batch for one optimizer update | Run configuration; left symbolic here |
| $\mathcal L_p$ | Pack $p$'s loss before DP scaling | Step 4; $L_1$ and $L_2$ |
| $\mathcal L'_p$ | That pack's pre-scaled loss passed to its own backward | `actor.py:687-689` |
| $g_1,g_2$ | Pack 1 and Pack 2's gradients in the DP1 sequence | Backward from $\mathcal L'_1$ and $\mathcal L'_2$; no numeric values supplied |
| $G_1,G_2$ | Saved gradient sum after each pack | $G_1=g_1$, then $G_2=g_1+g_2$ |
| $W_0,W_1$ | Old and updated weights around the sole optimizer update | This step |

### The numbers on the stage

The pack losses are $L_1=-0.4490$ and $L_2=-0.9354$ from Step 4. The example has two backward calls and `grad_accum=[2]`, so the sole optimizer boundary follows Pack 2. $W_0$ stays visible through both accumulation rows; only the boundary produces $W_1$. The gradient values remain symbolic because the actor-loss values do not determine their derivatives.

The pack sequence is DP1, while the reduction and saved-memory labels use the chapter's separate DP8 view. There, AVG supplies $1/8$ and the all-layers saved gradient shard is $8\ \text{GB}÷8=1\ \text{GB}$ per rank. $B$ remains symbolic. The 1 GB label counts the saved gradient table from Step 2, not a temporary layer gradient or the rank's complete 8 GB training state.

### Derived · not drawn

A separate scalar check uses $R=2$, $B=8$, and unscaled gradients $2$ and $6$. Pre-scaling gives $2×2/8=0.5$ and $6×2/8=1.5$. AVG gives $(0.5+1.5)÷2=1$, equal to the global-batch mean $(2+6)÷8=1$. This check does not assign numeric gradients to Pack 1 or Pack 2.

### Implementation boundaries

The pinned implementation clips gradient norm immediately before `optimizer.step()`; this compact stage omits that operation, metric aggregation, checkpoint saves and reference-model updates. It does not move clipping after the update. On the default FP32 path, FSDP2's extra predivide and postdivide factors are `None`; NCCL AVG supplies the $1/R$ division.

`train.py:92-94` calls `offload_train()`, restores rollout, and calls `actor_model.update_weights()` in that order. With `offload_train` disabled, the helper clears training memory instead of moving the model and optimizer to CPU. The stage draws only the enabled offload branch and leaves rollout restoration off stage.

### Next

The optimizer has produced $W_1$, but the saved training state and temporary training allocations still need separate accounting. The next step compares that state bill with peak memory.

Sources: <code>THUDM/<wbr>slime@<wbr>55e41ffe<wbr>f7193fdd<wbr>4c8bc147<wbr>20233e44<wbr>6446b1d7</code>, `train.py:46-59,92-94` and <code>slime/<wbr>backends/<wbr>fsdp_utils/<wbr>actor.py:270-281,687-702,1000-1034</code>; <code>pytorch/<wbr>pytorch@<wbr>v2.8.0</code>, `_fsdp_collectives.py:605-641`; <code>Awesome-ML-SYS-Tutorial/<wbr>rlhf/<wbr>slime/<wbr>fsdp/<wbr>readme.md:19</code>; <code>Awesome-ML-SYS-Tutorial/<wbr>rlhf/<wbr>sys-design/<wbr>readme-2-en.md:47-58</code>.

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
