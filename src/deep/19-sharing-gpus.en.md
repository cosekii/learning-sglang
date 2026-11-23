## Step 1 · The default layout takes two GPUs

> **In one line:** in Qwen3-Omni's default layout, GPU 0 holds four stages and GPU 1 holds only the talker: 6.6 GB of weights on an 80 GB card.

### On the stage

- Two panels, GPU 0 and GPU 1, each holding stages from Ch. 17 Step 4 that run on a GPU. GPU 0: `image_encoder`, `audio_encoder`, `thinker`, `code2wav`. GPU 1: `talker_ar`.
- "memory · 80 GB": a bar to scale. The dark part is weights, the light part "the rest · KV cache and working memory".
- "busy, over time": a drawn strip. GPU 0's amber blocks run almost end to end; GPU 1's blue blocks have gaps, labelled "86%, with 8 requests at once (PR #1235)". The strip is a drawing, not a trace.
- Two footnotes: weights in bf16 with each model's parameter count, and what the colours mean.

### Formula

$$
W = P \times B
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $P$ | one model's parameter count | see below | `OMNI_PARAMS_B` in `src/numbers.ts`, counted from the checkpoint's tensor shapes |
| $B$ | bytes per parameter, bf16 (a 16-bit float) | 2 B | `BYTES` in `src/numbers.ts`; the same $B$ as Ch. 18 Step 1 |
| $W$ | the memory that model's weights take | | this step |
| $M$ | one H100's memory | 80 GB | `HBM_GB` in `src/numbers.ts` |

### The numbers on the stage

| Model | $P$ | $W = P \times 2$ | Card |
|---|---|---|---|
| thinker | 30.5B | 61.0 GB | GPU 0 |
| audio encoder | 0.65B | 1.3 GB | GPU 0 |
| image encoder | 0.54B | 1.1 GB | GPU 0 |
| code2wav | 0.22B | 0.4 GB | GPU 0 |
| talker + code predictor | 3.3B | 6.6 GB | GPU 1 |

- GPU 0: $61.0 + 1.3 + 1.1 + 0.4 = 63.8$ GB of weights, leaving $80 - 63.8 = 16.2$ GB for KV cache and working memory.
- GPU 1: 6.6 GB of weights, about $6.6 \div 80 \approx 8\%$ of the card, leaving 73.4 GB.
- The memory bar is 312 px for 80 GB, 3.9 px per GB.

### What the 86% is

PR #1235 measured it with the talker on its own GPU and 8 requests at once: some kernel was running 86% of the time (nvidia-smi utilization, median). So GPU 1's memory is nearly empty, but its compute is not idle.

### Next

Step 2: who decides whether the talker can move to GPU 0.

## Step 2 · The layout is set in the config

> **In one line:** the config names a device for each stage; SGLang-Omni ships two layouts for Qwen3-Omni, and only `talker_ar` changes GPU.

### On the stage

- One row per stage, the seven stages of Ch. 17 Step 4.
- Two columns, two configs: `speech` (the default, step 1's layout) and `speech-colocated` (the one-GPU layout).
- Pill colours: grey is the CPU (`preprocessing` and `decode` have no model), white is GPU 0, blue is GPU 1.
- The boxed `talker_ar` row: GPU 1 → GPU 0, marked "moves". The other six rows read the same in both columns.
- Two dotted statements; two footnotes, the first a check made before start, the second history from the design notes.

### In SGLang-Omni

- `models/qwen3_omni/config.py` builds both layouts with one function, `speech_stages(thinker_gpu, talker_gpu, …)`: `speech` passes `talker_gpu=1`, `speech-colocated` passes `talker_gpu=0`. Both encoders and `code2wav` follow `thinker_gpu`.
- The two names are in the same file's variant table: `"speech"` and `"speech-colocated"`.
- The first footnote's check: Qwen3-Omni's placement policy (`models/qwen3_omni/placement.py`) allows the thinker and talker on one GPU only in the colocated config, and checks before any process starts.

### After the move

The talker's 6.6 GB of weights joins GPU 0's 63.8 GB (step 1):

$$
63.8 + 6.6 = 70.4\ \text{GB}
$$

That is weights alone on one 80 GB card, before any KV cache or working memory. Five stages now share one card, so `speech-colocated` must also set how much memory each may take.

### Next

Step 3: how this config divides one card's memory.

## Step 3 · One card's memory in fixed shares

> **In one line:** on one GPU, the config gives each stage a fixed share, a fraction of the card; the five add up to 94%, and 6% is held back.

### On the stage

- One long bar: an H100, 80 GB, drawn 660 px wide.
- Five segments: the two encoders at 2% each, the thinker at 78% (amber), `talker_ar` at 10% (blue), code2wav at 2%. The small segments are labelled below the bar.
- A bracket above, "assigned · 2 + 2 + 78 + 10 + 2 = 94%"; a dashed segment on the right, "6% held back".
- The title says this config was written for SGLang-Omni's speech-synthesis tests.

### Formula

$$
G_s = f_s \times M,\qquad R_s = G_s - W_s
$$

| Symbol | What it is | From |
|---|---|---|
| $f_s$ | stage $s$'s share, a fraction of the card | `gpu_memory_fraction` in the config file |
| $M$ | one H100's memory, 80 GB | step 1 |
| $G_s$ | the GB stage $s$ gets | this step |
| $W_s$ | stage $s$'s weights | step 1, $W = P \times B$ |
| $R_s$ | what is left after the weights: working memory, plus KV cache for the thinker and talker | this step |
| $b_{\text{kv}}$ | one token's K and V in the thinker, across all layers, 96 KB | step 4 |

### The numbers on the stage

1% of the card is 0.8 GB, drawn 6.6 px.

| Stage | $f_s$ | $G_s$ | $W_s$ | $R_s$ |
|---|---|---|---|---|
| image_encoder | 0.02 | 1.6 GB | 1.1 GB | |
| audio_encoder | 0.02 | 1.6 GB | 1.3 GB | |
| thinker | 0.78 | 62.4 GB | 61.0 GB | **1.4 GB** |
| talker_ar | 0.10 | 8.0 GB | 6.6 GB | **1.4 GB** |
| code2wav | 0.02 | 1.6 GB | 0.4 GB | |
| total | 0.94 | 75.2 GB | | |
| held back | 0.06 | 4.8 GB | | |

The thinker's 1.4 GB holds at most $1.4\ \text{GB} \div 96\ \text{KB} \approx 14{,}600$ tokens of KV cache, before any working memory. Speech-synthesis prompts are a few hundred tokens, so that is enough; video is not, as step 4 works out.

### Why fixed shares

- SGLang on its own gives its KV cache all the memory free at start (Ch. 7 Step 1).
- With five stages on one card, the first to start would take everything left. Fixed shares make each stage's size independent of start order.
- Before start, SGLang-Omni's planner (`config/placement.py`) adds up the shares on each GPU and refuses to start past the limit (`max_total_gpu_memory_fraction_per_gpu`, default 1.0, i.e. 100%).
- The 6% held back covers CUDA graphs (chapter 11), workspaces and memory peaks (first footnote).

### Next

Step 4: the least memory the video test needs on one card.

## Step 4 · Reason 1: memory, one H100 is too small

> **In one line:** cut every part to the least the video test can run with and the total is 85.7 GB, 5.7 GB over 80; without the talker's part it fits, so the talker moves to GPU 1.

### On the stage

- Top bar, GPU 0 (80 GB, 6.4 px per GB), six parts end to end, numbered 1–6:
  - 1 amber: the thinker's weights; 2 hatched: held for the video encoder; 3 light amber: the thinker's KV cache; 4 white with a dark part: the two encoders and code2wav; 5 dashed: held back; 6 dotted blue: the talker, drawn where it would sit, running past the card's edge.
  - A red bracket, "5.7 GB past the card".
- Bottom bar, GPU 1: part 6 drawn solid, "6 · the talker, moved here".
- A table: one row per part, "GB" and "why it cannot be smaller", with a total row.

### Formula

$$
b_{\text{kv}} = L \times H_{\text{kv}} \times d \times 2 \times B,\qquad
S_3 = T_{\max} \times b_{\text{kv}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $L$ | the thinker's layers | 48 | `OMNI_LAYERS` in `src/numbers.ts` |
| $H_{\text{kv}}$ | K/V heads per layer | 4 | `OMNI_KV_HEADS` in `src/numbers.ts` |
| $d$ | numbers per head vector | 128 | `HEAD_DIM` in `src/numbers.ts`, Ch. 2 Step 3 |
| 2 | one k and one v | | Ch. 2 Step 14 |
| $B$ | bf16, 2 bytes a number | 2 B | step 1 |
| $b_{\text{kv}}$ | one token's KV cache in the thinker | 96 KB | this step |
| $T_{\max}$ | the thinker's longest request, as the stage takes it | 32,768 tokens | this step (see "Checked" below) |
| $S_3$ | part 3: KV cache for the longest request | | this step |

This is the formula of Ch. 2 Step 14, which gave Llama's 128 KB a token, with Qwen3-Omni's thinker's layer and head counts.

### The numbers on the stage

$b_{\text{kv}} = 48 \times 4 \times 128 \times 2 \times 2 = 98{,}304\ \text{B} = 96\ \text{KB}$, and $S_3 = 32{,}768 \times 96\ \text{KB} \approx 3.1\ \text{GB}$.

| # | Part | Arithmetic | GB | Why it cannot be smaller |
|---|---|---|---|---|
| 1 | thinker's weights | $30.5 \times 2$ | 61.0 | only a smaller format (such as FP8) shrinks it |
| 2 | held for the video encoder | $0.05 \times 80$ | 4.0 | encoding 128 frames needs room |
| 3 | thinker's KV cache | $32{,}768 \times 96\ \text{KB}$ | 3.1 | SGLang will not start a request its KV cache cannot hold whole (Ch. 7 Step 1) |
| 4 | encoders and code2wav | $0.06 \times 80$ | 4.8 | 2.8 GB of it weights, plus working memory (2% each, step 3) |
| 5 | held back | $0.06 \times 80$ | 4.8 | CUDA graphs, workspaces and peaks (step 3) |
| 6 | talker | $0.10 \times 80$ | 8.0 | 6.6 GB of weights plus its KV cache (step 3) |
| | total | | **85.7** | 5.7 over 80 |

- Parts 1–3 alone, the thinker's own need, are $61.0 + 4.0 + 3.1 = 68.1$ GB, more than the 62.4 GB step 3 gives the thinker.
- Without part 6: $85.7 - 8.0 = 77.7$ GB, which fits. Part 6 is the talker that moves to GPU 1.
- The second footnote's 85 GB: the card holds 80 GiB, which PyTorch reports as about 85 GB, and shares are fractions of what it reports. Then parts 2, 4, 5, 6 are $(0.05 + 0.06 + 0.06 + 0.10) \times 85 = 23.0$ GB, plus parts 1 and 3, $61.0 + 3.1$, for 87.1 GB, still 2.1 GB over.

### Where these come from

- Part 2: the thinker's `encoder_mem_reserve` argument, default 0.05 (`models/qwen3_omni/stages.py`).
- 128 frames: SGLang-Omni's video test (Video-MME) takes up to 128 frames per video, 16 videos at once (`tests/test_model/test_qwen3_omni_videoamme_ci.py`).
- Parts 4, 5, 6: the shares of step 3's one-H100 config, the smallest SGLang-Omni ships.

### Checked: 32,768 is the old limit

Since PR #2735 (October 2026), SGLang-Omni takes the thinker's limit from the checkpoint's context by default, 65,536 tokens for the Instruct checkpoint. At that limit part 3 is $65{,}536 \times 96\ \text{KB} \approx 6.3$ GB, so the total is larger and the conclusion holds: one H100 is too small.

### Next

Step 5 gives the second reason: time.

## Step 5 · Reason 2: time, a shared GPU takes turns

> **In one line:** on one GPU the thinker and talker take turns, so a ready talker step waits for the thinker's turn to end; measured, p90 first sound goes from 1.4 s to 2.7 s.

### On the stage

- A looping animation: one GPU holding both the thinker and the talker, as in step 2's `speech-colocated`.
  - Lower row, "GPU 0 runs": wide amber blocks are the thinker's turns, narrow blue blocks the talker's steps.
  - Upper row, `talker_ar` "its next step": the blue "ready" tick is the talker's next step being ready; the red dashed "waits" is the time it waits for the thinker's turn to end; a blue dotted line drops to the blue block where it finally runs.
  - Two waits per lap. 7 phases 1.1 s apart, then a rest, 10 s a lap; the "loops" bar in the top right fills once per lap. Widths are not to scale.
- Two bars below, "measured · first sound, p90": the talker on the thinker's GPU (red) 2.7 s; the talker on its own GPU (blue) 1.4 s, "46% sooner".

### Formula

$$
\text{sooner} = 1 - \frac{t_{\text{alone}}}{t_{\text{shared}}}
$$

| Symbol | What it is | From |
|---|---|---|
| p90 | the time within which 9 in 10 requests got their first sound | this step |
| $t_{\text{shared}}$ | p90 with the talker sharing the thinker's GPU, mean of two runs | PR #1235 |
| $t_{\text{alone}}$ | p90 with the talker on its own GPU, mean of two runs | PR #1235 |

### The numbers on the stage

| Layout | Two runs | Mean | On the stage |
|---|---|---|---|
| shared | 2.697, 2.663 s | 2.68 s | 2.7 s |
| alone | 1.463, 1.415 s | 1.44 s | 1.4 s |

$1 - 1.44 \div 2.68 = 0.46$, so 46% sooner. The bars are 120 px per second.

### Why it waits

- On its own GPU the talker is busy 86% of the time (step 1): its steps come almost back to back.
- On a shared GPU, the GPU alternates between the two processes' kernels, and many talker steps become ready during a thinker turn and must wait.
- Every frame of sound takes one talker step (Ch. 16 Step 3), so the waits delay the sound directly.

### How it was measured (second footnote)

- H200s, 8 requests at once, the thinker split over two GPUs; the only change was whether the talker shared a GPU with half of the thinker or had its own.
- So the numbers show the direction, not a value for all five stages on one H100. The PR also measured whole runs 9–16% longer when shared.

### Next

Step 6: in either layout, the sound has a deadline.

## Step 6 · The sound's deadline

> **In one line:** during chunk 1's 800 ms of playback, the talker must write the next 10 frames and code2wav must turn them into chunk 2, 80 ms a frame on average.

### On the stage

- Upper row, "GPU 0 runs" (drawn on one GPU): amber is the thinker, ten thin blue marks are the talker's 10 steps (one frame each), the dark block is one code2wav call.
- Lower row, "speaker": a solid box "chunk 1 · 800 ms playing", then a dashed box, chunk 2.
- A red dashed line, "chunk 1 ends": chunk 2 must be ready before it.
- An arrow down from code2wav, "chunk 2 ready, before the line".

### Formula

$$
t_{\text{frame}} = \frac{n_{\text{samp}}}{f_{\text{out}}},\qquad
t_{\text{chunk}} = N \times t_{\text{frame}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n_{\text{samp}}$ | sound samples the codec writes per frame | 1,920 | `SAMPLES_PER_FRAME` in `src/numbers.ts`, Ch. 16 Step 3 |
| $f_{\text{out}}$ | samples played per second | 24,000 | `SPEECH_OUT_HZ` in `src/numbers.ts` |
| $t_{\text{frame}}$ | one frame of sound | 80 ms | this step |
| $N$ | frames code2wav decodes at once | 10 | Ch. 16 Step 3 |
| $t_{\text{chunk}}$ | one chunk of sound | 800 ms | this step |

### The numbers on the stage

- $t_{\text{frame}} = 1{,}920 \div 24{,}000 = 0.08\ \text{s} = 80\ \text{ms}$.
- $t_{\text{chunk}} = 10 \times 80 = 800\ \text{ms}$.
- Budget: $800\ \text{ms} \div 10 = 80\ \text{ms}$ per frame, which must cover one talker step, its share of the code2wav call, and every wait behind a thinker turn from step 5.

### The two layouts

- One GPU (as drawn): every talker step may wait for the thinker (step 5).
- The default two GPUs: the talker does not wait for the thinker, but code2wav still shares GPU 0 with it (step 1).

### Next

What happens when chunk 2 misses the red line, and how SGLang-Omni streams sound against it: chapter 20.
