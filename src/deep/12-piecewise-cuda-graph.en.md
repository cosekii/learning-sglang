## Step 1 · Where chapter 11 stopped

> **In one line:** chapter 11 recorded graphs only for decode and ran prefill eagerly, because "prefill is compute-bound, so the launches are hidden"; this chapter checks when that holds.

### On the stage

- Left box, "a decode batch": `req 1` to `req 5`, one orange block each; "shape [B, 1] · only B changes"; in green, "one graph for the whole step".
- Right box, "a prefill batch": `seq 1`, `seq 2`, `seq 3` with 18, 27 and 11 blue blocks; "shape [Σ tokens, …] · ragged"; in red, "eager, kernel by kernel".
- Two lines below: chapter 11 Step 12's verdict, and "which is true of a big prefill. It is not true of a small one."

This is the picture from Ch. 11 Step 12.

### The two shapes

| | decode | prefill |
|---|---|---|
| tokens per request | 1 | 18, 27, 11 |
| tokens in the batch | $B$ | 18 + 27 + 11 = 56 |
| what changes | only $B$ | the total, and each sequence's length and start |
| chapter 11's treatment | pad to the rung $\text{rung}(B)$, replay (Ch. 11 Steps 10 and 11) | eager |

`[Σ tokens, …]` means the prompts are laid end to end, so the row count is the sum of their token counts.

### The two numbers chapter 11 used

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{mem}}$ | time to read the 16 GB of weights once | 16 GB ÷ 3.35 TB/s = 4.78 ms | Ch. 4 Step 5 |
| $T_{\text{cpu}}$ | time for the CPU to launch a step's kernels one by one | 1,000 × 9 µs = 9.0 ms | Ch. 11 Step 4 |

"The launches are hidden" means a prefill's GPU time is longer than 9.0 ms, so the CPU keeps up with the GPU.

### Next

Step 2 plots prefill's GPU time against the token count and finds where it passes 9.0 ms.

## Step 2 · A small prefill is launch-bound

> **In one line:** prefill's GPU time passes the 9.0 ms of launches only at about 560 tokens; below that, the CPU sets the step's length.

### On the stage

- x axis: the number of tokens $n$ in one prefill step, 0 to 800. y axis: time, 0 to 12 ms.
- Two thin dashed orange lines: the flat one is the 4.8 ms weight read, the sloped one is compute at 16 µs a token.
- The thick orange line: the GPU's time, the larger of the two dashed lines.
- The dashed blue line: the 9.0 ms of launches, the same for every $n$.
- The orange dot `300 · Ch. 4 Step 8's balance point`; the red `560` on the x axis and a dashed red vertical line; the pale red region left of it marked `launch-bound`, and "the launches are hidden" on the right.

### Formula

$$
t_{\text{tok}} = \frac{f}{F},\qquad
T_{\text{gpu}}(n) = \max\big(t_{\text{mem}},\ n\,t_{\text{tok}}\big),\qquad
n_{\text{launch}} = \frac{T_{\text{cpu}}}{t_{\text{tok}}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n$ | tokens in one prefill step | x axis | Ch. 4 Step 3 |
| $f$ | operations for one token through the model | 16 GFLOP | Ch. 4 Step 3, `GFLOP_PER_TOKEN` |
| $F$ | the GPU's bf16 operations per second | 989 TFLOP/s | Ch. 4 Step 5, `TFLOPS` |
| $t_{\text{tok}}$ | compute time per token | about 16 µs | this step |
| $t_{\text{mem}}$ | one read of the weights | 4.78 ms | Ch. 4 Step 5 |
| $T_{\text{gpu}}(n)$ | the GPU's time for the step | thick orange line | this step |
| $T_{\text{cpu}}$ | the CPU's time to launch the step | 9.0 ms | Ch. 11 Step 4 |
| $n_{\text{launch}}$ | the token count where GPU time reaches the launch time | about 560 | this step |

A step lasts $\max(T_{\text{cpu}}, T_{\text{gpu}}(n))$, for the reason in Ch. 11 Step 4: the CPU launches while the GPU runs, and the slower side sets the step's length.

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $t_{\text{tok}}$ | 16 GFLOP ÷ 989 TFLOP/s | 16.2 µs | 16 µs a token |
| balance point | 4.78 ms ÷ 16 µs | 299 | 300 |
| $n_{\text{launch}}$ | 9,000 µs ÷ 16 µs | 562.5 | 560 |
| $T_{\text{gpu}}(100)$ | max(4.78, 100 × 0.016 = 1.6) | 4.8 ms | in the red region |
| GPU busy at $n = 100$ | 4.78 ÷ 9.0 | 53% | |
| $T_{\text{gpu}}(800)$ | max(4.78, 800 × 0.016) | 12.8 ms | right side, past 9.0 ms |

The component rounds the per-token time to 16 µs, so 560 is 9,000 ÷ 16 rounded to the nearest ten.

### Prefills below 560

The second line under the plot names three: a short prompt; the last chunk of a chunked prefill (Ch. 6 Step 6); a vision encoder (the encoder that reads an image, chapter 16). These are ordinary prefills, and chapter 11's claim does not hold for them.

### Next

Step 3: since a small prefill is launch-bound too, record graphs for prefill.

## Step 3 · Pad the token count to a rung

> **In one line:** the same method as chapter 11's ladder, with rungs that count tokens instead of requests: 56 pads to 64, 131 to 144, 92 to 96.

### On the stage

- Three rows, `batch 1`, `batch 2`, `batch 3`. Each small square is one token: blue is a real token, white with a border is padding.
- Under each row: `56 real` `+8`, `131 real` `+13`, `92 real` `+4`.
- Right of each row: `→ the 64 graph`, `→ the 144 graph`, `→ the 96 graph`.

### Formula

Ch. 11 Step 10's rule with $n$ in place of $B$:

$$
\text{rung}(n) = \min\{\, c \in \text{rungs} : c \ge n \,\},\qquad
\text{pad}(n) = \text{rung}(n) - n
$$

| Symbol | What it is | From |
|---|---|---|
| $n$ | tokens in this step | Step 2 |
| rungs | the token counts recorded at startup | Step 9 draws the full list |
| $\text{rung}(n)$ | the size of the graph this step replays | this step |
| $\text{pad}(n)$ | padding tokens | this step |

### The numbers on the stage

These sizes fall in the band "48 to 256, every 16": 48, 64, 80, 96, 112, 128, 144, …

| batch | $n$ | $\text{rung}(n)$ | $\text{pad}(n)$ | share of the rung |
|---|---|---|---|---|
| 1 | 56 | 64 | 8 | 8 ÷ 64 = 13% |
| 2 | 131 | 144 | 13 | 13 ÷ 144 = 9% |
| 3 | 92 | 96 | 4 | 4 ÷ 96 = 4% |

The padding rows run through the graph like real rows and their output is dropped, like Ch. 11 Step 11's dummy rows.

### Next

Padding fixes the total row count $n$. Step 4 shows what it does not fix.

## Step 4 · Same total, different boundaries

> **In one line:** two batches of 56 tokens each; attention has 615 query-key pairs to compute in one and 893 in the other, in different places.

### On the stage

- Two 56 × 56 grids: one row per query, one column per key, both in batch order (`queries ↓` on the left, `keys, in order →` on top).
- Colour bars on the top and left: which sequence each token belongs to (blue, orange, teal).
- Coloured triangles in the grid: the cells that are computed; grey cells are never computed.
- Left: `batch 1 · 18 + 27 + 11`, `3 triangles · 18×18 · 27×27 · 11×11`. Right: `batch 2 · 40 + 9 + 7`, `40×40 · 9×9 · 7×7`.

### Why triangles

Ch. 2 Step 7: position $i$ looks only at its own key and earlier ones (causal). A batch holds several sequences laid end to end, so one more rule applies: only keys from **its own sequence**. Each sequence takes one triangle on the diagonal, and every cell between sequences is grey.

### Formula

$$
P = \sum_{s} \frac{L_s\,(L_s + 1)}{2}
$$

| Symbol | What it is | From |
|---|---|---|
| $s$ | which sequence in the batch | this step |
| $L_s$ | tokens in sequence $s$ | this step: 18, 27, 11 or 40, 9, 7 |
| $P$ | query-key pairs attention computes in this batch | this step |

In a sequence of length $L$, query $i$ looks at $i$ keys, so the total is $1 + 2 + \dots + L = L(L+1)/2$. Ch. 2 Step 7's 5 tokens gave 15 pairs.

### The numbers on the stage

| batch | per sequence | $P$ |
|---|---|---|
| 1 | 18·19/2 + 27·28/2 + 11·12/2 = 171 + 378 + 66 | 615 |
| 2 | 40·41/2 + 9·10/2 + 7·8/2 = 820 + 45 + 28 | 893 |

Both have $n = 56$, so by Step 3 both would replay the same 64 graph. The `18×18` labels give the side of the square each triangle sits in, not the pair count.

### Why one recording cannot serve both

Ch. 11 Step 9: a recording fixes which cells a kernel reads and writes and how many rows. Which cells attention computes depends on where each sequence starts and ends, and that changes every batch.

### Next

Step 5 checks whether the other kernels in a layer depend on the boundaries.

## Step 5 · Only attention reads the boundaries

> **In one line:** run both batches through one layer: 10 of the 11 kernels see identical shapes; only attn differs.

### On the stage

- 11 rows: the 11 kernels of one layer from Ch. 11 Step 3, `norm`, `qkv`, `rope`, `attn`, `o`, `add`, `norm`, `gate·up`, `silu`, `down`, `add`.
- Two columns: the shape each kernel sees on batch 1 (18+27+11) and batch 2 (40+9+7).
- The right column, "same?": ten green ✓, and the `attn` row on a red band with a red ✗.

### Reading the shapes

`[rows, columns]`: rows are tokens, columns are the width of each token's vector. `A × B` is a multiply by a weight matrix.

| Width | What it is | Arithmetic |
|---|---|---|
| 4,096 | each token's hidden vector $x$ (Ch. 2 Step 2) | `D_MODEL` |
| 6,144 | q, k and v side by side | 32 × 128 + 2 × 8 × 128 = 4,096 + 2,048 |
| 28,672 | the gate and up matrices side by side | 2 × 14,336 |
| 14,336 | the MLP's inner width | `D_FF` |

The 32 query heads, 8 k/v heads and 128 numbers per head come from Ch. 2 Step 14.

### Why 10 rows are identical

Each of these 10 kernels treats a row on its own: output row $i$ depends only on input row $i$ and the weights, not on which sequence row $i$ belongs to. So both batches give these kernels `[56, …]`, and once padded to 64 they can share one recording. This chapter calls such kernels token-wise.

The attn row shows Step 4's triangles: `18×18 27×27 11×11` against `40×40 9×9 7×7`.

### Next

Step 6: attention is the only part that cannot be recorded, so cut the step at every attention.

## Step 6 · Cut at every attention

> **In one line:** 32 layers have 32 attentions; 32 cuts give 33 pieces, each holding only token-wise kernels, so each can be recorded at a padded token count.

### On the stage

- A long blue bar: one whole prefill step, `embed` on the left, `lm_head` on the right.
- 32 red marks: one attention per layer, `32 attentions · 32 cuts`.
- A row of white boxes below: `piece 1` to `piece 8` and `…`; "33 pieces, roughly one layer each".
- The bottom line: 33 recordings per rung instead of one.

`embed` turns token ids into vectors (Ch. 2 Step 2); `lm_head` turns the last vector into vocabulary scores (Ch. 1 Step 3).

### Formula

$$
N_{\text{piece}} = N_{\text{layer}} + 1
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $N_{\text{layer}}$ | layers, which is also the number of attentions | 32 | `LAYERS` in `src/numbers.ts` |
| $N_{\text{piece}}$ | pieces after cutting | 33 | this step |

$k$ cuts split a bar into $k + 1$ pieces, so 32 + 1 = 33.

### What each piece holds

In Step 5's kernel order:

| piece | contents |
|---|---|
| piece 1 | embed, then layer 1's norm, qkv, rope |
| pieces 2–32 | o, add, norm, gate·up, silu, down, add after one layer's attention, then the next layer's norm, qkv, rope |
| piece 33 | layer 32's o through add, then lm_head |

### Next

Step 7 shows how a cut step runs on the CPU and the GPU.

## Step 7 · At run time, replay and eager take turns

> **In one line:** a step becomes "replay a piece, run attention eagerly, replay the next piece"; the CPU has 129 things to do instead of 1,000.

### On the stage

- Two lanes, as in Ch. 11 Step 4: CPU on top, GPU below, time left to right. The first 5 of the 33 pieces are drawn.
- Blue `replay` on the CPU: one replay call (Ch. 11 Step 7) for one of Step 6's pieces. The orange block `piece N` below it: that piece's kernels running back to back on the GPU.
- Red `eager` on the CPU: attention launched the old way. The red block `attn` below it: that attention running.
- The note: the CPU is idle inside every orange block and busy only at the seams.

### Formula

$$
N_{\text{cpu}} = N_{\text{piece}} + N_{\text{layer}} \cdot a
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $N_{\text{piece}}$ | pieces, one replay each | 33 | Step 6 |
| $N_{\text{layer}}$ | attentions | 32 | Step 6 |
| $a$ | kernels one attention launches | 3 | this chapter's illustrative value |
| $N_{\text{cpu}}$ | calls the CPU makes in one step | | this step |
| $N_{\text{kernel}}$ | kernels in a step | 1,000 | Ch. 11 Step 3 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| $N_{\text{cpu}}$ | 33 + 32 × 3 | 129 |
| kernels inside the pieces, no CPU needed | 1,000 − 32 × 3 | 904 |

$a = 3$ is this chapter's assumption; different attention backends launch different numbers of kernels (chapter 14).

### Why eager attention is acceptable

What matters is the CPU's total per step: the 32 attentions are 96 launches, and 96 × 9 µs = 864 µs, far below the GPU's 4.8 ms (Step 8 does the full sum).

### Next

Step 8 turns the 129 calls into time.

## Step 8 · CPU time: 9.0 ms becomes about 1.2 ms

> **In one line:** piecewise costs the CPU about 1.2 ms a step, 60 times one whole-model graph's 20 µs, but both are under the GPU's 4.8 ms, so the step lasts the same.

### On the stage

- Three bars on one scale, CPU time per prefill step:
  - red `eager`: `1,000 launches × 9 µs`, 9.0 ms.
  - green `piecewise`: `33 replays (330 µs) + 32 eager attentions (864 µs)`, 1.2 ms.
  - grey `one whole-model graph`: 20 µs; "not available here: the shape changes every batch".
- A dashed orange vertical line `the GPU's 4.8 ms`, with green "anything left of this line is free" beside it.

### Formula

$$
T_{\text{pw}} = N_{\text{piece}}\,t_{\text{piece}} + N_{\text{layer}}\,a\,t_{\text{launch}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $N_{\text{piece}}, N_{\text{layer}}, a$ | pieces, attentions, launches per attention | 33, 32, 3 | Steps 6 and 7 |
| $t_{\text{piece}}$ | CPU time to start one piece's replay | about 10 µs | this chapter's illustrative value |
| $t_{\text{launch}}$ | CPU time to launch one kernel | 9 µs | Ch. 11 Step 4 |
| $t_{\text{replay}}$ | replay of one whole-model graph | 20 µs | Ch. 11 Step 7 |
| $T_{\text{pw}}$ | CPU time per step, piecewise | | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| eager | 1,000 × 9 µs | 9.0 ms | red bar |
| piece replays | 33 × 10 µs | 330 µs | `(330 µs)` |
| attention launches | 32 × 3 × 9 µs | 864 µs | `(864 µs)` |
| $T_{\text{pw}}$ | 330 + 864 | 1,194 µs | 1.2 ms |
| against the whole-model graph | 1,194 ÷ 20 | 59.7 | 60× |

### Why 60× does not matter

A step lasts $\max(\text{CPU}, T_{\text{gpu}})$ (Step 2), and below about 300 tokens $T_{\text{gpu}} = 4.8$ ms (Step 2). 1.2 ms and 20 µs are both under 4.8 ms, so either way the step is 4.8 ms. Eager's 9.0 ms is past it, so an eager step is 9.0 ms.

### Next

Step 9: which rungs there are and how far apart.

## Step 9 · The rung schedule: the gap grows with the token count

> **In one line:** SGLang's default prefill rungs run from 4 to 4096, 50 in all, with gaps from 4 to 256; at the top of each band the gap is a sixteenth of the token count.

### On the stage

- Both axes logarithmic. x axis: the token count $n$ (4, 32, 256, 1024, 4096). y axis: the gap between neighbouring rungs (4, 16, 64, 256).
- Five thick blue segments: the five bands of the default schedule, a tick at every rung, labelled `every 4` `4–32` and so on.
- Upper left: "50 rungs in all / 33 recordings each / built once at startup".

### The numbers on the stage

| band | gap | rungs |
|---|---|---|
| 4–32 | 4 | (32 − 4) ÷ 4 + 1 = 8 |
| 48–256 | 16 | (256 − 48) ÷ 16 + 1 = 14 |
| 288–512 | 32 | 8 |
| 576–1024 | 64 | 8 |
| 1280–4096 | 256 | 12 |
| total | | 50 |

Startup records 50 × 33 = 1,650 graphs (Step 6: 33 pieces per rung).

### How much padding wastes

$\text{pad}(n)$ is at most the gap minus one (Step 3's +8, +13, +4, all with a gap of 16). The wasted share is about gap ÷ $n$:

| where | gap ÷ $n$ |
|---|---|
| top of each band: 16/256, 32/512, 64/1024, 256/4096 | 1/16 |
| bottom of a band, e.g. 48 | 16/48 = 1/3 |
| 288 | 32/288 ≈ 1/9 |

So "about a sixteenth" holds in the upper part of each band; near the bottom of each band the share is larger. A fixed gap of 4 would need 4096 ÷ 4 = 1,024 rungs to reach 4096; growing the gap with $n$ keeps it at 50.

### In SGLang

The schedule is `generate_prefill_cuda_graph_batch_sizes` in `arg_groups/cuda_graph_hook.py`, with the same five bands; above 4096 it continues every 512 up to the limit. `--cuda-graph-bs-prefill` sets the whole list and `--cuda-graph-max-bs-prefill` the limit (bs here counts tokens).

### Next

Step 10: which ops besides attention also get cut out.

## Step 10 · The other seams

> **In one line:** whether an op is cut out comes down to one question: does its work depend on the data in the batch, or only on the token count?

### On the stage

- Three boxes:
  - red `attention`: needs the sequence boundaries, which change every batch (Step 4).
  - teal `all-reduce`: waits on the other GPUs in the group (chapter 24).
  - orange `MoE dispatch`: how many tokens go to each expert is decided by the tokens.
- The question in the middle: "does its work depend on the data, or only on the token count?"
- Two branches: green "only the token count → pad it, record it, put it in a piece"; red "the data → leave it out; it becomes a seam".
- The footnote: the seam list is configuration; an engine names its own.

### Two new terms

- **all-reduce**: when one model is split across several GPUs (chapter 24), each GPU computes part of the result, and the parts are summed over the links between GPUs.
- **MoE dispatch**: in a mixture-of-experts model a router picks a few experts (a few of many sets of MLP weights) for each token, and dispatch sends the tokens there. How many rows each expert gets depends on the token values, so the shapes change from batch to batch at the same $n$.

### Sorting

| op | depends only on $n$? | treatment |
|---|---|---|
| Step 5's 10 token-wise kernels | yes | inside a piece |
| attention | no, on the boundaries | cut out |
| MoE dispatch | no, on the token values | cut out |
| all-reduce | its shape depends only on $n$, but it syncs with other GPUs | listed as a seam on the stage |

The book's example, Llama-3-8B on one GPU, has only attention among the three.

### In SGLang

In SGLang's torch.compile piecewise path (`tc_piecewise`), all-reduce (`inplace_all_reduce`) is registered as a split point with `register_split_op`; with DeepEP or Mooncake for MoE communication, the MoE op is added too. The current default prefill backend (`breakable`, Step 11) breaks at attention and at expert-parallel MoE's all-to-all, and records all-reduce inside the pieces.

### Next

Step 11: who cuts out the 33 pieces.

## Step 11 · Who finds the seams: the tracer

> **In one line:** torch.compile runs the model once, records every op in order, cuts at the named ops and hands back 33 subgraphs, each recorded per rung.

### On the stage

- Four boxes, left to right:
  1. the model: a Python class, a `forward()` that calls other modules.
  2. trace it: run it once with Dynamo watching, record every op.
  3. cut: at the named ops, attention, all-reduce, MoE dispatch.
  4. capture: 33 subgraphs, each recorded per rung (Ch. 11 Step 10).
- The strip below: the op list the tracer hands back, `norm qkv rope ✂attn o add norm gate·up silu down add ✂attn …`, with a cut at each pair of scissors.

### Terms

- **trace**: actually execute `forward()` while recording every tensor operation reached, giving a list of ops in order (a graph).
- **Dynamo**: the part of torch.compile that traces, recording ops as the Python runs.
- **subgraph**: the ops between two cuts.

### Against the earlier steps

| on the stage | matches |
|---|---|
| the order of the op list | Step 5's 11 rows |
| each pair of scissors | one of Step 6's cuts |
| 33 subgraphs | Step 6's 33 pieces |
| each recorded per rung | Step 9's 50 rungs, 1,650 graphs |

### In SGLang

This chapter describes the torch.compile method, which SGLang calls `tc_piecewise`. On current SGLang main it can no longer be chosen from the command line (`--cuda-graph-backend-prefill` accepts only `full`, `breakable`, `disabled`), and on CUDA the default prefill backend is `breakable`: there is no trace; during capture, a function marked `@eager_on_graph` (such as `RadixAttention`'s attention) ends the current piece, runs eagerly, and a new piece begins. The result has this chapter's structure: pieces with eager attention between them. `--disable-prefill-cuda-graph` turns it off.

### Next

Step 12 zooms into one piece: the tracer handed its kernels back unchanged.

## Step 12 · One piece up close: the round trip between silu and mul

> **In one line:** inside a piece, silu's intermediate is written to HBM and mul reads it straight back; piecewise graphs removed the CPU's launches, and those round trips remain.

### On the stage

- A dashed box on the left, `CPU · asleep`: the whole chain is inside one replay (Step 7).
- The orange `GPU` box with 4 kernels in a row: dark `gate·up`, blue `silu`, blue `mul`, dark `down`.
- Two blue arrows per kernel: up is a read from HBM, down is a write back.
- The grey `HBM` strip at the bottom: the GPU's own 80 GB, where the weights and the KV cache are too.
- A dashed red outline around `silu` and `mul`.
- The notes: 4 kernels, 8 trips; a kernel's registers are gone when it ends; ×32 layers. The last line is the question for chapter 13.

### Terms

- **HBM**: the GPU's on-board memory, where Ch. 4 Step 2 reads the 16 GB of weights each step.
- **SM**: one of the H100's 132 processor blocks (`SMS` in `src/numbers.ts`). A kernel's arithmetic runs in an SM's registers, which are fast but last only while that kernel runs.
- **gate·up split**: Step 5's single `silu` row is two kernels here: silu on the gate half of gate·up's output, then a multiply by the up half (`mul`).

### Formula

Bytes silu writes and mul reads back in one layer:

$$
M_{\text{silu}} = n \cdot d_{\text{ff}} \cdot b
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n$ | tokens in the step | 56 | Step 4's batch |
| $d_{\text{ff}}$ | the MLP's inner width | 14,336 | Step 5, `D_FF` |
| $b$ | bytes per number in bf16 | 2 B | Ch. 4 Step 2, `BYTES` |
| $M_{\text{silu}}$ | bytes silu writes in one layer | | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| per token | 14,336 × 2 B | 28,672 B = 28 KB |
| 56 tokens | 56 × 28,672 B | 1.6 MB |
| trips | 4 kernels × (read + write) | 8 |

Those 1.6 MB are written once and read once in every one of the 32 layers. The two matmuls have to read HBM because the weights are there; silu and mul read and write HBM only because they are two separate kernels, and the intermediate cannot stay in registers between them.

### Next

Chapter 13 asks: only mul reads what silu wrote, and it reads it at once, so why are they two kernels?
