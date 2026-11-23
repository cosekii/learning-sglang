## Step 1 · Back to chapter 9's three lanes

> **In one line:** the scheduler's lane is a row of decode steps laid end to end, 4.8 ms each; this chapter zooms into one of them.

### On the stage

- Three lanes on a 0–25 ms axis: server + tokenizer on top (blue blocks), scheduler + GPU in the middle, detokenizer at the bottom. These are the three processes of Ch. 9 Step 5.
- The scheduler lane: 5 orange blocks, one decode step each, end to end.
- The detokenizer lane: 4 short cyan marks, one after each of the first 4 steps, the new token on its way out (chapter 9).
- The dashed box "this one": the third block, the one the next step zooms into.

### Formula

The length of a decode step, carried over from Ch. 4 Step 5:

$$
t_{\text{step}} = \frac{M_W}{BW}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $M_W$ | bytes of weights | 16 GB | Ch. 4 Step 2 |
| $BW$ | HBM bandwidth | 3.35 TB/s | `BW` in `src/numbers.ts` |
| $t_{\text{step}}$ | the GPU's work in one decode step | 4.8 ms | Ch. 4 Step 5 |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $t_{\text{step}}$ | 16 ÷ 3.35 | 4.78 ms | 4.8 ms per block |
| 5 blocks | 5 × 4.78 | 23.9 ms | about 24 ms of the axis |

A decode step at small batch reads all 16 GB of weights once and spends almost no time on math, so the bandwidth sets the block's length.

### Next

The chapter takes $t_{\text{step}}$ as the **GPU's** share of a step and asks how long the **CPU's** share is.

## Step 2 · One step is one forward pass through the model

> **In one line:** the third block fills the width: embedding, 32 layers, `lm_head` and sampling, left to right; almost all the time is the 32 layers.

### On the stage

- The orange bar: step 1's block, magnified, still $t_{\text{step}} = 4.8$ ms.
- Labels under it: `embed` at the left, "32 layers, identical in shape, different weights" in the middle, `lm_head · sample` at the right. White lines separate the 32 layers.
- Two lines: the order of one pass; each layer reads its slice of the 16 GB of weights (Ch. 4 Step 2) and its slice of the KV cache (Ch. 3 Step 3).

### What each segment does

| Segment | What it does | Where it was shown |
|---|---|---|
| embedding | looks up each token id, giving the vector $x$ | Ch. 2 Step 2 |
| 32 layers | attention + MLP in each | Ch. 2 Step 1 |
| `lm_head` | turns the last position's vector into vocabulary scores $s_t$ | Ch. 1 Step 3 |
| sample | picks one token per request | Ch. 1 Step 4 |

### The numbers on the stage

Spread evenly, one layer is $t_{\text{step}} \div 32 = 4.78\ \text{ms} \div 32 \approx 149\ \mu\text{s}$. That is the "~149 µs" on step 3's stage.

### Next

Step 3 opens one layer (layer 6) and counts its kernels on the GPU.

## Step 3 · One layer is 11 kernels

> **In one line:** a layer runs on the GPU as 11 kernels; times 32 layers, plus the ends and small ops, a step is about 1,000 kernels, about 5 µs each on average.

### On the stage

- The darker cell in the pale orange bar: layer 6.
- 11 boxes below: that layer's kernels, widths a rough time share at small batch (illustrative).
  - Blue: `qkv`, `o`, `gate·up`, `down`, matmuls (matrix multiplications) against the layer's weights. Most of the layer's weight read is spent in them.
  - Orange: `attn`, attention over the KV cache.
  - Grey: `norm`, `rope`, `add`, `silu`, small elementwise work. The narrow boxes are too small for a name and are unlabelled.
- Two lines: the kernel count, and how long the average one runs.

A **kernel** is one function the GPU runs, over the whole batch at once. The GPU runs one, then the next.

### Formula

$$
t_{\text{kernel}} = \frac{t_{\text{step}}}{N_{\text{kernel}}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{step}}$ | the GPU's work in one step | 4.78 ms | Step 1 |
| $N_{\text{kernel}}$ | kernels in one step | about 1,000 | this step |
| $t_{\text{kernel}}$ | average run time of one kernel (batch 1) | about 5 µs | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| kernels in 32 layers | 11 × 32 | 352 |
| $N_{\text{kernel}}$ | 352 + embedding, `lm_head`, sampling + every small PyTorch op between them | about 1,000 (rounded) |
| $t_{\text{kernel}}$ | 4.78 ms ÷ 1,000 | 4.8 µs, "about 5 µs" on the stage |

1,000 is the chapter's round number, not a count from a PyTorch run.

### Next

Step 4 sets these 5 µs against what the CPU spends to launch one kernel.

## Step 4 · The CPU launches kernels one by one

> **In one line:** each kernel is launched by the CPU at about 9 µs; 1,000 launches are 9 ms, longer than the GPU's 4.8 ms, so the GPU waits about half the time.

### On the stage

- Title: the same step, launched kernel by kernel (eager mode), batch size 1.
- "CPU · launches" row: 40 blue bars, labelled `1,000 × 9 µs = 9.0 ms`.
- "GPU · runs" row: 40 orange bars, 4.8 ms of work in total, spread out under the CPU row. Each bar stands for 25 kernels.
- The red line: "step = 9.0 ms · GPU busy 53% of it".
- Two lines: the GPU finishes each kernel before the next is launched; batch-1 decode in plain PyTorch runs at roughly half the speed the bandwidth allows.

**Eager mode** is PyTorch's default: each time Python reaches an operation, it launches the matching kernel there and then.

### Formula

$$
T_{\text{cpu}} = N_{\text{kernel}} \cdot t_{\text{launch}},\qquad
t_{\text{eager}} = \max(T_{\text{cpu}},\ t_{\text{step}})
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{launch}}$ | CPU time to launch one kernel: Python, PyTorch's dispatcher, the CUDA driver | about 9 µs | this step (illustrative) |
| $N_{\text{kernel}}$ | kernels in one step | 1,000 | Step 3 |
| $T_{\text{cpu}}$ | the CPU's total launch time in one step | | this step |
| $t_{\text{step}}$ | the GPU's work in one step | 4.78 ms | Step 1 |
| $t_{\text{eager}}$ | the length of one step in eager mode | | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $T_{\text{cpu}}$ | 1,000 × 9 µs | 9.0 ms | `= 9.0 ms` |
| $t_{\text{eager}}$ | max(9.0, 4.78) | 9.0 ms | step = 9.0 ms |
| GPU busy | 4.78 ÷ 9.0 | 53% | busy 53% |

Why max: launching and running happen at the same time, so the step waits for whichever is slower. $t_{\text{launch}} = 9\ \mu\text{s}$ is longer than step 3's $t_{\text{kernel}} \approx 5\ \mu\text{s}$, so the slower side is the CPU.

### Next

Step 5 magnifies the CPU row to its first 4 launches.

## Step 5 · Eager mode: one kernel at a time

> **In one line:** the first 4 launches, magnified: the CPU spends 9 µs sending one, the GPU runs it in 5 µs and then sits idle until the next.

### On the stage

- Time runs downward (the "time" arrow on the left).
- Left box "CPU · Python": 4 blue bars, "launch norm / qkv / rope / attn", 9 µs each.
- Blue arrows across the middle: each kernel handed to the GPU through "driver · PCIe".
- Right box "GPU": 4 orange bars, "run …", 5 µs each, with 3 red dashed "idle" boxes between them.
- A grey dashed arrow back at the bottom: "one sync at the end of the step · the CPU reads the logits".
- Two lines: nothing comes back per kernel; the GPU's 4.8 ms of work is stretched over 9.0 ms.

### Why the GPU sits idle

- **Launches go one way.** The CPU does not wait for a kernel to finish; it sends the next as soon as it can. Its 9 µs per launch sets the pace, not the GPU's 5 µs.
- **Every gap is idle.** The GPU finishes in 5 µs and the next kernel arrives at 9 µs, leaving about 4 µs with nothing to do.
- **The one trip back** is at the end of the step: the CPU reads the logits to sample (Ch. 1 Step 4), and waits for the GPU to finish everything.

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| each gap | 9 − 4.8 | about 4 µs |
| one step | 1,000 × 9 µs (step 4's $T_{\text{cpu}}$) | 9.0 ms |

### Next

Step 6 records those 1,000 launches in advance.

## Step 6 · Recording: write the launches down, run nothing

> **In one line:** run the step once with capture on; each launch is written into a list (a CUDA graph) instead of going to the GPU.

### On the stage

- Left box: the same launches as step 5, the first 5 drawn (norm, qkv, rope, attn, o).
- The dashed box in the middle, "the graph · a list of launches": each launch becomes a line, `n. kernel  in address  out address  [64 rows]`.
- Right box, GPU: a dashed box "nothing runs yet".
- Two lines: an entry pins the kernel, the addresses it reads and writes, and the row count, with no Python left in it; the engine records once per rung at startup.

A **CUDA graph** is a CUDA feature: a sequence of kernel launches recorded as one object, later sent to the GPU as a whole.

### The numbers on the stage

| # | kernel | reads | writes |
|---|---|---|---|
| 1 | norm | 0x7f10 | 0x7f11 |
| 2 | qkv | 0x7f11 | 0x7f12 |
| 3 | rope | 0x7f12 | 0x7f12 (in place) |
| 4 | attn | 0x7f12 | 0x7f13 |
| 5 | o | 0x7f13 | 0x7f14 |

The addresses chain: what one entry writes, the next one reads. The addresses are illustrative. The row count, 64, is the batch size this graph is recorded for.

### What is stored, and what is not

- **Stored:** the **result** of each of step 4's launches: which kernel, which addresses, what size.
- **Not stored:** the 9 µs of Python and dispatcher work. It runs once, while recording.

### Next

Step 7 replays the list.

## Step 7 · Replay: one call, and the GPU walks the list

> **In one line:** the CPU sends one message (about 20 µs) and the GPU runs the list entry after entry, with no gap between kernels.

### On the stage

- Left box: one blue `graph.replay()`, headed "one message · 20 µs", with a note that the CPU is free for the rest of the step.
- Middle: the graph recorded in step 6, each line `n. kernel @ address [64 rows]`.
- Right box: orange "run …" bars back to back, with no idle boxes.
- Two lines: every address was fixed at record time, so there is nothing to pass and nothing to decide; 9.0 ms of CPU became 20 µs, and the GPU's 4.8 ms is now the whole step.

### Formula

$$
t_{\text{graph}} = t_{\text{replay}} + t_{\text{step}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{replay}}$ | CPU time to start one replay | about 20 µs (illustrative) | this step |
| $t_{\text{step}}$ | the GPU running the 1,000 kernels | 4.78 ms | Step 1 |
| $t_{\text{graph}}$ | the length of one step with a graph | | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| CPU cost, shrunk by | $T_{\text{cpu}} \div t_{\text{replay}}$ = 9.0 ms ÷ 20 µs | about 450× |
| $t_{\text{graph}}$ | 0.02 + 4.78 | 4.80 ms |

### Why a free CPU matters

Ch. 10 Step 9's overlap has the CPU plan step t+1 while the GPU runs step t. A CPU spending 9 ms a step on launches has no time left for that; after replay it spends 20 µs.

### Next

Step 8 puts this back on step 4's two lanes.

## Step 8 · Back to the two lanes

> **In one line:** on the same scale, the CPU row is a 20 µs mark and the GPU row one solid 4.8 ms bar; a step goes from 9.0 ms to 4.8 ms.

### On the stage

- "CPU · launches" row: one thin blue mark, "one launch · 20 µs · then the CPU is free".
- "GPU · runs" row: one solid orange bar, "1,000 kernels, back to back".
- The green line: "step = 4.8 ms · GPU busy ~100%".
- The line below: `graph.replay()`, one driver call, no Python in the loop.

### The numbers on the stage

| | eager (Step 4) | graph (this step) |
|---|---|---|
| CPU time | $T_{\text{cpu}}$ = 9.0 ms | $t_{\text{replay}}$ = 20 µs |
| one step | $t_{\text{eager}}$ = 9.0 ms | $t_{\text{graph}}$ ≈ 4.8 ms |
| GPU busy | 53% | about 100% |

Batch-1 decode is $9.0 \div 4.78 \approx 1.9$ times faster, and its speed is again set by step 1's weight read.

### In SGLang

Decode graphs are recorded and replayed by `DecodeCudaGraphRunner` (`model_executor/runner/decode_cuda_graph_runner.py`), on by default; `--disable-decode-cuda-graph` turns them off.

### Next

Step 9: a recording is literal. What happens when the batch size changes?

## Step 9 · A recording is literal: the row count is fixed too

> **In one line:** replay a graph recorded at 64 rows with 96 and the kernels still compute 64; the other 32 output rows keep the previous step's values, and nothing errors.

### On the stage

- One entry at the top: `2. qkv matmul · reads 0x7f11 [64 × 4096] · writes 0x7f12 [64 × 12288]`. The row count and the addresses are part of the entry, not arguments.
- Upper half, "a batch of 64": 16 orange input cells (each stands for 4 rows) → replay → 16 green output cells, ✓.
- Lower half, "a batch of 96": 24 input cells, the last 8 red → replay → 16 green cells, then 8 red dashed cells "never written", ✗.
- Two lines: shapes are not arguments to `replay()`, so CUDA has nothing to check; the guard has to sit in the engine.

### The numbers on the stage

| | rows in | rows computed | output rows from this step | stale rows |
|---|---|---|---|---|
| batch 64 | 64 | 64 | 64 | 0 |
| batch 96 | 96 | 64 | 64 | 96 − 64 = 32 |

4096 is the length of each token's vector $x$ (Ch. 2 Step 2).

About 12288: it is 3 × 4096, the output width if q, k and v were each 4,096 wide. Llama-3-8B has only 8 k, v heads (Ch. 2 Step 14), so its real width is $32 \times 128 + 2 \times 8 \times 128 = 6{,}144$. This does not change the step's point: the row count is fixed in the recording.

### The consequence

When the CPU reads the output buffer, 32 requests get the previous step's logits and sample wrong tokens from them. Nothing errors, because the graph holds no shape to compare against.

### Next

Steps 10 and 11: how the engine always picks a graph that fits.

## Step 10 · The batch size keeps changing, so record a ladder

> **In one line:** the running batch changes every few steps; at startup the engine records one graph for each of a set of sizes, and each step uses the smallest one at or above the batch.

### On the stage

- 40 orange bars: running requests over 40 decode steps. It starts at 37, dips to 36, and ends at 71 (requests finish and new ones join, chapter 6).
- A blue dash on each bar: the rung that step replays on.
- 13 blue boxes below: the rungs recorded at startup, 1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 160, 256.
- A log-style line `Capture cuda graph bs [...]`, "a few seconds, once"; and a line saying rungs are closer together at small sizes.

### Formula

$$
\text{rung}(B) = \min\{\, c \in \text{ladder} : c \ge B \,\}
$$

| Symbol | What it is | From |
|---|---|---|
| $B$ | running requests in this step | the bar heights, this step |
| ladder | the batch sizes recorded at startup | the 13 boxes, this step |
| $\text{rung}(B)$ | the size of the graph this step replays | this step |

A rung below $B$ cannot be used, for the reason step 9 showed.

### The numbers on the stage

| $B$ | $\text{rung}(B)$ |
|---|---|
| 36 – 48 | 48 |
| 50 – 61 | 64 |
| 65 – 72 | 96 |

The gaps between neighbouring rungs are 1, 2, 4, 8, 8, 8, 16, 16, 32, 32, 32, 96.

### In SGLang

The rule is `BaseCudaGraphRunner._pad_to_bucket`: a `bisect_left` over the rung list, taking the first rung at or above $B$. A batch above the top rung does not use a graph; `can_run_graph` turns it away and it runs eagerly.

The stage's ladder is illustrative. SGLang's default decode ladder is denser: `[1, 2, 4, 8, 12]`, then every 8 from 16 to 256, then every 16 and 32 above that (`generate_decode_cuda_graph_batch_sizes` in `arg_groups/cuda_graph_hook.py`). `--cuda-graph-bs-decode` sets the list and `--cuda-graph-max-bs-decode` the top.

### Next

Step 11: how 37 is padded to 48.

## Step 11 · Padding: 37 up to 48

> **In one line:** 37 requests replay the 48 graph; the 11 extra rows are filler and their results are dropped, and computing them adds almost no time.

### On the stage

- The ladder at the top: 32 and 48 highlighted, 48 filled blue; "32 is too small → pad up to 48, the next rung".
- "rows in": 48 cells, 37 orange "37 real", 11 dashed "11 dummy".
- The orange pill: "replay the 48 graph · 4.8 ms".
- "logits out": 37 green cells "37 → the sampler", 11 red dashed "11 dropped".
- The line below: 11 wasted rows of a memory-bound step cost almost nothing; a thousand launches would have cost 9.0 ms.

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| rung | $\text{rung}(37)$, step 10's formula | 48 |
| dummy rows | 48 − 37 | 11 |
| replay time | $t_{\text{step}}$, Step 1 | 4.8 ms |
| launch cost of running 37 eagerly | $T_{\text{cpu}}$, Step 4 | 9.0 ms |

### Why 11 extra rows cost almost nothing

The 48 rows share one 16 GB weight read (Ch. 5 Step 2). 48 is far below Ch. 4 Step 8's balance point of about 300 tokens, so the step is still memory-bound (waiting on memory), and the extra rows use math units that were idle anyway.

### Next

Step 12: why only decode gets graphs.

## Step 12 · Only decode gets graphs

> **In one line:** a decode batch is shape [B, 1] and only B changes, so the ladder covers it; a prefill batch has different lengths every time, cannot be recorded in advance, and runs eagerly.

### On the stage

- Left box, "a decode batch": `req 1` to `req 6`, one orange cell each, `… ×B`; "shape [B, 1] · only B changes", "replayable".
- Right box, "a prefill batch": `seq 1`, `seq 2`, `seq 3` with 18, 27 and 11 blue cells; "shape [Σ tokens, …] · ragged", "eager, and fine: compute-bound anyway".

### The numbers on the stage

| | decode | prefill |
|---|---|---|
| tokens per request | 1 | 18, 27, 11 |
| tokens in the batch | $B$ | 18 + 27 + 11 = 56 |
| what changes | only $B$ | the total, each sequence's length, and where each starts and ends |
| how it runs | padded to $\text{rung}(B)$ (Steps 10 and 11) | eager |

Attention also needs where each sequence starts and ends, so two prefill batches with the same total are still not the same list.

### Why eager prefill costs little

Prefill has many tokens per weight read. Above Ch. 4 Step 8's balance point of about 300 tokens it is compute-bound, and its GPU time is far longer than step 4's 9.0 ms of launches, so the launches are a small share. These are the two shapes of Ch. 6 Step 3.

### In SGLang

This chapter describes one graph per whole step. Current SGLang main records prefill graphs too, by cutting the step into pieces as chapter 12 shows (the prefill graph backend defaults to `breakable`; `--disable-prefill-cuda-graph` turns it off).

## Step 13 · The addresses are frozen, so how do new tokens get in?

> **In one line:** a graph takes no arguments, so each step's sampled token is written back into its own slot of the same ids buffer, and the same recording is replayed.

### On the stage

- Three columns: step t, t+1, t+2. Each, top to bottom: the ids buffer → orange "replay" → the logits buffer `[48 × 128256]` → the sampled tokens.
- Two shaded bands, `ids @ 0x7f00` and `logits @ 0x7f20`: each is **one** buffer at three moments.
- Rows `req 0`, `req 1`, `req 2` (3 of the 48 slots, "… 45 more"). Blue is `req 1`, carrying chapter 1's tokens.
- Blue dashed "written back": step t's sampled column feeds step t+1's ids column.

### The numbers on the stage

| Step | `req 1`'s ids slot | sampled |
|---|---|---|
| t | 374 `" is"` | 12366 `" Paris"` |
| t+1 | 12366 `" Paris"` | 13 `"."` |
| t+2 | 13 `"."` | 128001 `<EOS>` |

- 48: step 11's rung, so the ids buffer has 48 slots.
- 128256: tokens in Llama-3's vocabulary; the logits have one row per request and one column per vocabulary token (the $s_t$ of Ch. 1 Step 3).
- 12366, 13 and 128001 are the ids chapter 1 picked; 128001 is EOS, and `req 1` ends there (Ch. 1 Step 11).

### In SGLang

Before each replay, `DecodeCudaGraphRunner` calls `_copy_replay_inputs`, which copies the step's `input_ids` into the first rows of the static buffer; the remaining rows are padding. How a sampled token reaches the next step's input before the CPU has seen it is Ch. 10 Step 10's placeholder.

### Next

Every replay is the same recording on the same addresses; only the numbers in the buffers change. Step 14: what cannot work that way.

## Step 14 · What a graph cannot hold

> **In one line:** a recording needs every step to be the same list of kernels on the same addresses and shapes; anything data-dependent breaks that, and chapter 12 cuts the graph there.

### On the stage

- Title: a graph is a fixed recording, and these are not fixed.
- Four rows, each an example and its reason:

| Row | Why it is not fixed |
|---|---|
| MoE routing | which experts a token goes to depends on the token, so how many rows each expert gets is not known in advance |
| speculative verification | how many draft tokens are accepted is known only after the step runs (chapter 15) |
| attention plans | some attention backends compute per-batch shapes and indices on the CPU before launching |
| a `.item()` anywhere | reads a GPU value into the CPU, so the CPU stops and waits; a recording cannot contain that wait |

- Footnote: `--enable-piecewise-cuda-graph`, `--enable-torch-compile`.

### Why these are a problem

Steps 6–13 work because only two things change from step to step: the batch size (padded to a rung) and the numbers in the buffers. Each row above either changes the kernel list, changes a shape, or needs the CPU in the middle of the step.

### In SGLang

The fix is to cut the graph at those points: replay the pieces between the cuts and run the part in each cut eagerly, which is chapter 12. Some cases are instead handled by writing kernels with fixed shapes; SGLang, for example, records separate graphs for the speculative-decoding draft model (`speculative/eagle_draft_cuda_graph_runner.py`).

The footnote's `--enable-piecewise-cuda-graph` is no longer in current SGLang main; the prefill piecewise graph is chosen with `--cuda-graph-backend-prefill`. `--enable-torch-compile` is still there, and is the tool chapters 12 and 13 use.
