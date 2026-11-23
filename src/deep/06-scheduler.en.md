## Step 1 · Where chapter 5 stopped

> **In one line:** In Ch. 5 Step 9, a newcomer's prefill shared a step with everyone else's decode and stretched it about 7×; by default SGLang does not mix the two and runs one kind of batch per step.

### On the stage

- The grid on the left is Ch. 5 Step 9's: rows are slots 1–6 (places in the batch), columns are engine steps, one forward pass each.
- Four narrow columns: all 6 slots decode, one orange token each.
- The wide middle column: slot 3 is the blue "newcomer's prefill"; the other 5 slots are pale orange cells with a solid orange end, meaning their token comes out only when the whole pass ends.
- The red bracket above the wide column: "one step, stretched to a prompt's worth of math".
- The box on the right, "don't mix": a step is either a prefill batch or a decode batch.
- The grey footnote: SGLang's default is one kind of batch per step (vLLM v1 mixes by default); mixing comes back in step 7, on purpose and bounded.

### Formula

The time of a step is Ch. 4 Step 5's, with $n$ tokens in the step:

$$
t_{\text{mem}} = \frac{M_W}{BW},\qquad
t_{\text{comp}}(n) = \frac{n\,f}{F}
$$

$$
t_{\text{step}}(n) = \max\big(t_{\text{mem}},\ t_{\text{comp}}(n)\big)
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n$ | tokens in this step's forward pass | | Ch. 4 Step 3 |
| $M_W$ | weights read every step | 16 GB | Ch. 4 Step 2; `W_GB` |
| $BW$ | HBM bandwidth | 3.35 TB/s | Ch. 4 Step 5; `BW` |
| $f$ | operations per token | 16 GFLOP | Ch. 4 Step 3; `GFLOP_PER_TOKEN` |
| $F$ | operations per second (bf16) | 989 TFLOP/s | Ch. 4 Step 5; `TFLOPS` |
| $t_{\text{mem}}$ | time to read the weights once | 4.78 ms | Ch. 4 Step 5 |
| $t_{\text{comp}}(n)$ | math time for $n$ tokens | | Ch. 4 Step 5 |
| $t_{\text{step}}(n)$ | time of a step, the slower of the two | | Ch. 4 Step 5 |

Every time in this chapter counts the weight read only, not each user's own KV cache read (Ch. 4 Step 6), as in chapter 5.

### The numbers on the stage

| Column | $n$ | $t_{\text{comp}}(n)$ | $t_{\text{step}}$ |
|---|---|---|---|
| narrow: 6 decodes | 6 | 6 × 16 ÷ 989 = 0.10 ms | 4.78 ms (the read is slower) |
| wide: a 2,000-token prompt + 5 decodes | 2,005 | 2,005 × 16 ÷ 989 = 32.4 ms | 32.4 ms |

32.4 ÷ 4.78 ≈ 7: the 5 slots decoding in the wide column wait about 7 times as long as usual for this one token.

### Next

Steps 2–3 say what the two kinds of batch are; steps 4–8 measure what not mixing costs and how chunking changes it.

## Step 2 · Two lists, one batch per step

> **In one line:** The engine keeps a waiting list and a running list; each step builds one batch from one of them and runs one forward pass.

### On the stage

- The blue dashed box on the left, "waiting · need a prefill": req 7, 8 and 9, blue bars in proportion to their prompts (1,200, 2,600 and 800 tokens). Notes in the box: "prompt tokens, none processed yet", "a prefill batch: some of these, all their prompt tokens at once".
- The orange dashed box on the right, "running · need one token": req 1–6, each pale orange bar the tokens it has, the solid chip at the end the next token it needs. "a decode batch: all of these, one token each".
- The box in the middle, "this step": a prefill batch, or the decode batch; under it, "one forward pass, then back here".
- The legend line: "never both at once, by default. The next step says why."

### The two lists

| List | Holds | Its next forward pass | $n$ for that batch |
|---|---|---|---|
| waiting | requests whose prompt has not been through the model; their K and V are not in the KV cache yet (chapter 3) | prefill: one forward pass over the whole prompt | sum of the chosen prompts' lengths |
| running | requests mid-answer; the tokens they have are all in the cache | decode: one more token each | the number running, chapter 5's $B$ |

### One request's route

1. It arrives and joins waiting.
2. It is picked into a prefill batch; its prompt runs, it gets its first token and moves to running.
3. Each decode step gives it one token.
4. It leaves running after it emits its end token (chapter 1's EOS).

### Next

Step 3 says why the two kinds of work are kept as two batches.

## Step 3 · Same model, two shapes

> **In one line:** A prefill batch has few sequences with many tokens each, ragged, and is compute-bound; the decode batch has many sequences with 1 token each and is memory-bound.

### On the stage

- Left box, "a prefill batch": seq 1–3 with 18, 27 and 11 blue chips. Chips stand for tokens; real prompts run to hundreds or thousands, so fewer are drawn.
- Left box text: "few sequences · hundreds of tokens each", "ragged lengths", "its own attention kernel · compute-bound", "shapes differ every batch".
- Right box, "the decode batch": seq 1–16 with one orange chip each.
- Right box text: "many sequences · one token each", "only the batch size changes", "a different attention kernel · memory-bound", "one recording per batch size → CUDA graph replay, chapter 11".
- The legend line "two shapes → two batches → two fast paths"; the footnote: the split unlocks separate machines (chapter 28) and CUDA graphs for decode (chapter 11).

### Seen through Ch. 4 Step 8's balance point

The balance point is $n^* = F / BW = 989 ÷ 3.35 \approx 295$, rounded to about 300 on the stage. Below it, $t_{\text{step}} = t_{\text{mem}}$; above it, $t_{\text{step}} = t_{\text{comp}}(n)$.

| | prefill batch | decode batch |
|---|---|---|
| $n$ | sum of prompt lengths, hundreds or more | number of sequences, under ~300 here |
| time of a step | $t_{\text{comp}}(n)$, compute-bound | $t_{\text{mem}} = 4.78$ ms, memory-bound |
| attention | each prompt token against the earlier tokens of its own prompt (Ch. 2 Step 7's triangle) | one query per sequence against its whole cache (chapter 3) |
| input shape | each length differs, changes every batch | set by the batch size alone |

### Terms

- **attention kernel**: a kernel is one function run on the GPU. Every SGLang attention backend implements `forward_extend` for prefill and `forward_decode` for decode separately.
- **CUDA graph**: record the whole chain of kernels one decode step sends to the GPU, then replay the chain as one (chapter 11). A decode step's input shape is set by the batch size alone, so one recording per batch size is enough; a prefill's shape is different every time, so it cannot be recorded this way.

### Next

Step 4 puts the two kinds of batch on one timeline and shows whose time the default, prefill first, spends.

## Step 4 · Prefill first: the newcomer is fast, everyone else freezes

> **In one line:** When a 2,000-token prompt arrives, the default runs its prefill alone first; the newcomer gets its first token in 32 ms and the other 64 users wait 37 ms between two tokens.

### On the stage

- The x axis is time, 0 to 100 ms, at 5.6 px per ms.
- Top row, "everyone else": the 64 users decoding. Each orange block is one decode step, its dark strip at the end the token; a grey "frozen" block is a step in which they get no token.
- Bottom row, "newcomer": the blue "prefill · 2,000 tokens" block with a white "first token" dot at its end; after it, the newcomer decodes too (orange).
- The dashed "arrives" line: the prompt arrives at the end of the third decode step.
- The "step type" strip: which kind of batch each step was (blue = prefill batch, orange = decode batch, blue over orange = mixed batch).
- The red bracket above: "no token for 37 ms".
- Two tiles: "everyone else · longest gap between tokens" 37 ms (red border), "newcomer · time to first token" 32 ms.

### Formula

With a prompt of $P$ tokens and $B$ users decoding:

$$
\text{TTFT} = t_{\text{step}}(P)
$$

$$
\text{gap} = t_{\text{step}}(P) + t_{\text{mem}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $P$ | tokens in the new prompt | 2,000 | chapter 1's symbol; this step |
| $B$ | users decoding | 64 | Ch. 5 Step 1's symbol; this step |
| $\text{TTFT}$ | time to first token: arrival to first token | | Ch. 4 Step 9 |
| $\text{gap}$ | everyone else's longest wait between two tokens | | this step |

Why the gap has one more $t_{\text{mem}}$: the last token came out at the arrival, the prefill step gives none, and the next comes at the end of the decode step after the prefill.

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| one decode step | $B = 64$: $t_{\text{comp}}$ = 64 × 16 ÷ 989 = 1.04 ms, under 4.78 ms | 4.78 ms | |
| arrival | 3 × 4.78 | 14.3 ms | dashed line |
| $\text{TTFT}$ | 2,000 × 16 ÷ 989 | 32.4 ms | 32 ms |
| $\text{gap}$ | 32.4 + 4.78 | 37.1 ms | 37 ms |
| an 8k prompt (caption) | 8,192 × 16 ÷ 989 | 132.5 ms | 133 ms |

A tile turns red when the gap exceeds two decode steps (2 × 4.78 = 9.55 ms). 8,192 is Llama-3-8B's longest context.

### In SGLang

"Prefill first" is checked against the source: `Scheduler.get_next_batch_to_run()` calls `get_new_batch_prefill()` first, runs the prefill batch if it built one, and only otherwise runs the running list's decode batch.

### Next

Step 5: when more than one prompt is waiting, the freeze is longer.

## Step 5 · Three prompts in one prefill step

> **In one line:** Step 2's three prompts arrive together and go into one 4,600-token prefill step; all three newcomers take 74 ms, and everyone else freezes for 79 ms.

### On the stage

- The same timeline as step 4, the same 64 users.
- Bottom row, "newcomers": one long blue block, "prefill · 3 prompts · 4,600 tokens".
- The dashed "arrive" line: all three prompts arrive at 14.3 ms.
- The red bracket "no token for 79 ms"; tiles of 79 ms (red border) and 74 ms.

### The numbers on the stage

Step 4's formula with $P$ replaced by the three prompts together:

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $n$ | 1,200 + 2,600 + 800 | 4,600 | |
| $\text{TTFT}$ (the same for all three) | 4,600 × 16 ÷ 989 | 74.4 ms | 74 ms |
| $\text{gap}$ | 74.4 + 4.78 | 79.2 ms | 79 ms |
| the 800-token prompt alone | 800 × 16 ÷ 989 | 12.9 ms | |

### Why they are batched

For the GPU, batching is cheaper: the weights are read once for all three prompts. Two groups pay for it:

- The 800-token prompt, which alone would take 12.9 ms, now waits 74 ms.
- The 64 decoding users: their freeze grows with the total tokens waiting, and prefill first puts no cap on it.

In SGLang, a prefill batch's tokens are capped by `max_prefill_tokens` (16,384 by default) and by step 6's chunk size; the 4,600 drawn is inside both caps.

### Next

Step 6 puts a much smaller cap on a prefill batch.

## Step 6 · Chunked, not mixed

> **In one line:** Split the prompt into chunks of at most 512 tokens and alternate chunk steps with decode steps; the freeze drops from 37 ms to 13 ms, and the first token moves from 32 ms to 47 ms.

### On the stage

- The same timeline, back to one 2,000-token prompt.
- Bottom row, "newcomer": four blue blocks labelled 512, 512, 512 and 464.
- Top row: a grey (frozen) block under each chunk step, an orange decode step between chunks.
- The red bracket "no token for 13 ms"; tiles of 13 ms (still a red border, above 9.55 ms) and 47 ms.
- The grey footnote: SGLang chunks by default (8,192 tokens on an H100) but runs a prompt's chunks back to back; the alternation drawn needs `--prefill-decode-interval 1`.

### Formula

Chunk size $C$: a prefill batch holds at most $C$ prompt tokens. The prompt splits into $\lceil P/C \rceil$ chunks, with one decode step between each two:

$$
\text{gap} = t_{\text{step}}(C) + t_{\text{mem}}
$$

$$
\text{TTFT} = \sum_{\text{chunks}} t_{\text{step}}(\text{chunk length}) + \big(\lceil P/C \rceil - 1\big)\,t_{\text{mem}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $C$ | chunk size: the most prompt tokens in one prefill batch | 512 | this step |
| $\lceil P/C \rceil$ | number of chunks, rounded up | 4 | this step |
| $P$, $\text{gap}$, $\text{TTFT}$ | as in step 4 | | step 4 |

The prose's arithmetic writes the chunk size as a lowercase $c$; this uses $C$ because Ch. 4 Step 6's $c$ is already the context length.

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| chunks | 512 + 512 + 512 + 464 | 2,000 | the four blue labels |
| $t_{\text{step}}(512)$ | 512 × 16 ÷ 989 | 8.28 ms | |
| $t_{\text{step}}(464)$ | 464 × 16 ÷ 989 | 7.51 ms | |
| $\text{gap}$ | 8.28 + 4.78 | 13.1 ms | 13 ms (step 4: 37 ms) |
| $\text{TTFT}$ | 3 × 8.28 + 7.51 + 3 × 4.78 | 46.7 ms | 47 ms (step 4: 32 ms) |

The gap depends only on $C$, not on the prompt's length. A chunk's K and V go into the cache, and the next chunk attends to them without recomputing.

### In SGLang (the footnote, checked against the source)

- `chunked_prefill_size` is $C$. Left unset, it is picked by GPU memory, and an 80 GB H100 falls in the 8,192 tier.
- By default a prompt's next chunk runs on the very next step, with no decode step between, so chunking alone does not shorten the freeze.
- `--prefill-decode-interval N`: after each prefill batch, run N decode steps before the next prefill is allowed. Off (0) by default; only the Qwen3-VL configuration on Hopper sets it to 22 on its own. This N is the stage's name for it and has nothing to do with chapter 1's round count $N$.

### Next

Step 7 lets a chunk and the decodes share one forward pass.

## Step 7 · Chunked and mixed

> **In one line:** Each step is one forward pass with a 236-token chunk and all 64 decode tokens, landing on the ~300 balance point; no freeze, first token in 44 ms.

### On the stage

- Bottom row, "newcomer": nine blue blocks, eight labelled 236 and the last 112.
- Top row: every step is an orange block and gives a token; steps carrying a chunk are paler (pale = this step also carries a chunk).
- The "step type" strip: a chunk step is blue over orange, a mixed batch.
- No red bracket; tiles of 4.9 ms (not red) and 44 ms.

### Formula

A mixed step's tokens are the chunk plus every decode: $n = C + B$. Putting $n$ on the balance point means the chunk barely stretches the step:

$$
C = n^* - B
$$

$$
\text{TTFT} = \big(\lceil P/C \rceil - 1\big)\,t_{\text{step}}(n^*) + t_{\text{step}}(\text{last chunk} + B)
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n^*$ | the balance point, rounded to 300 on the stage | 300 | Ch. 4 Step 8; the component's `BALANCE` |
| $B$ | users decoding | 64 | step 4 |
| $C$ | this step's chunk size | 236 | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $C$ | 300 − 64 | 236 | the blue labels |
| chunks | ⌈2,000 / 236⌉ | 9: 8 × 236 = 1,888, then 112 | nine blue blocks |
| a full-chunk step | $n$ = 300: 300 × 16 ÷ 989, 0.08 ms over 4.78 ms | 4.85 ms | |
| the last step | $n$ = 112 + 64 = 176, under 295 | 4.78 ms | |
| $\text{TTFT}$ | 8 × 4.85 + 4.78 | 43.6 ms | 44 ms |
| $\text{gap}$ | every step gives a token; the longest step | 4.85 ms | 4.9 ms |

The first token comes sooner than step 6's 47 ms because no step is decode alone. The chunk uses compute a decode step leaves idle: 64 decode tokens need 1.04 ms of math in 4.78 ms.

### In SGLang (checked against the source)

- `--enable-mixed-chunk` turns mixing on; it is off by default.
- With it on, the chunk and the decodes share one budget: the chunk gets at most `chunked_prefill_size` − $B$ tokens (the scheduler passes the running count in as `mixed_with_decode_tokens`).
- SGLang does not size the chunk to the balance point on its own. The 236 drawn is this chapter's choice, the same as setting `chunked_prefill_size` to 300.

### Next

Step 8 sets the two numbers of the three policies side by side.

## Step 8 · Three policies side by side

> **In one line:** For the same prompt, prefill first gives the fastest first token (32 ms) but a 37 ms freeze; chunked freezes 13 ms; mixed does not freeze. The chunk size $C$ trades one number against the other, and the scheduler sets it.

### On the stage

- Three groups of two bars on one scale: the blue "newcomer · first token" bar, and under it "everyone else · longest gap" (red when above two decode steps, orange otherwise).
- Each group's title and note: "prefill first · one prompt, its own step", "chunked, not mixed · 512 per chunk", "chunked, mixed · 236 per chunk".
- The legend line: "the decode step floor is 4.8 ms: a gap of 4.8 ms means nobody noticed the newcomer at all".
- The footnote is step 6's.

### The numbers on the stage

| Policy | $\text{TTFT}$ | $\text{gap}$ | gap bar colour | From |
|---|---|---|---|---|
| prefill first | 32 ms | 37 ms | red | step 4 |
| chunked, $C$ = 512 | 47 ms | 13 ms | red | step 6 |
| mixed, $C$ = 236 | 44 ms | 4.9 ms | orange | step 7 |

The longest bar is 47 ms, and the others are drawn in proportion to it. Mixed's 4.9 ms is only 0.08 ms over the floor $t_{\text{mem}}$ = 4.78 ms.

### Why $C$ is the knob (without mixing)

When $C$ is above the balance point, every chunk is compute-bound, and the chunks' math adds up to exactly the whole prompt's:

$$
\text{gap} = t_{\text{comp}}(C) + t_{\text{mem}}
$$

$$
\text{TTFT} = t_{\text{comp}}(P) + \big(\lceil P/C \rceil - 1\big)\,t_{\text{mem}}
$$

| $C$ | $\text{gap}$ | $\text{TTFT}$ |
|---|---|---|
| 512 | 8.28 + 4.78 = 13.1 ms | 32.4 + 3 × 4.78 = 46.7 ms |
| 2,000 | 32.4 + 4.78 = 37.1 ms | 32.4 ms (prefill first again) |

A larger $C$ raises the gap and lowers the time to first token. The model's weights and math are the same for every $C$; only the order of the steps changes, and the scheduler sets the order.

### Next

Step 9 draws the scheduler's per-step decision as a flowchart.

## Step 9 · One scheduler step

> **In one line:** Each step asks "anyone waiting, and room in the cache?"; yes builds a prefill batch (plus the decodes if mixing is on), no runs the decode batch; after one forward pass it returns to the top.

### On the stage

- The question box at the top: "anyone waiting, and room in the cache?"; under it, "the cache question is chapter 7" and "with an interval N, also: N decode steps since the last prefill".
- "yes" → the blue box "a prefill batch": from the waiting list, in policy order (first come · shortest first · longest cached prefix), up to the chunk size. Two smaller boxes inside:
  - "mixing off · the default": the prefill runs alone, the running ones wait a step.
  - "mixing on · step 7": every running request's next token rides in the same pass; the two share the chunk size.
- "no" → the orange box "the decode batch": everyone running, one token each; finished sequences leave, freeing their cache; one recording per batch size → CUDA graph replay, chapter 11.
- Both paths join at the black bar "one forward pass · then back to the top", and a dashed line loops back to the question.
- Two footnotes: SGLang's four settings `schedule_policy`, `chunked_prefill_size`, `prefill_decode_interval`, `enable_mixed_chunk`; this loop is `Scheduler.get_next_batch_to_run()`.

### Each part and its step in this chapter

| In the flowchart | SGLang setting | Default | This chapter |
|---|---|---|---|
| anyone waiting | the waiting list | | step 2 |
| N decode steps since the last prefill | `prefill_decode_interval` | 0 (off) | step 6 |
| in policy order | `schedule_policy` | `fcfs` | this step |
| up to the chunk size | `chunked_prefill_size` | 8,192 on an H100 | step 6 |
| mixing on | `enable_mixed_chunk` | off | step 7 |
| the decode batch | the running list | | steps 2 and 3 |

### The three orders

All three drawn are values of `schedule_policy` (the source has others too, such as `random`, `dfs-weight`, `lof` and `priority`):

- **First come** (`fcfs`, the default): in order of arrival.
- **Shortest first** (`shortest-prefill-first`, experimental): the request with the fewest tokens still to compute, not yet in the cache, goes first.
- **Longest cached prefix** (`lpm`, longest prefix match): the request whose prompt opening is longest already in the cache goes first; that prefix caching is chapter 8.

### What happens on each path

- **Yes**: take requests from waiting until their prompt tokens reach $C$. With mixing off, the running users get no token this step, the gap of steps 4–6; with mixing on, their $B$ tokens join the same pass and count against the same budget, as in step 7's 236 + 64 = 300.
- **No**: every running request gives 1 token, $n = B$; while $B$ stays under ~300, $t_{\text{step}} = t_{\text{mem}}$. Requests that emit their end token leave running and free their cache, which makes room for the next prefill.

One detail from the source: the interval N applies only while the running list holds at least `prefill_decode_interval_min_bs` requests (0 by default), and it does not wait when nobody is decoding.

### Next

What "room in the cache" means and how it is counted is chapter 7.
