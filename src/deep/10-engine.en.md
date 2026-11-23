## Step 1 · Inside process 2

> **In one line:** Ch. 9 Step 5's process 2, the scheduler, opened up: in the middle a six-stage loop that never stops, on the left the lists it reads and writes, on the right memory and the GPU.

### On the stage

- **Middle column:** six boxes, the loop's six stages, run top to bottom; a grey dashed arrow on the right takes the last back to the first. One turn = one step of the model (one forward pass and one pick, Ch. 1 Steps 3 and 4).
- The second box, `get_next_batch_to_run`, is tagged `Ch. 6 Step 9`: it is the decision drawn on that step.
- **Left column:** `inbox · zmq PULL` and `outbox · zmq PUSH` (Ch. 9 Step 6's queues); `waiting_queue`, reading "empty" for now; `running_batch`, holding two orange-outlined "Req · decoding" rows.
- **Right column:**
  - `RadixCache`: a small tree of three blue dots (Ch. 8 Step 4).
  - `KV pool`: 24 small squares (Ch. 7 Step 4's pages), 11 pale cyan ones in use, 13 white ones free.
  - `GPU · ModelRunner`: one blue bar, "forward pass · 4.8 ms".

### Formula

$$
t_{\text{step}} = \frac{M_W}{BW}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $M_W$ | bytes of model weights | 16 GB | Ch. 4 Step 2; `W_GB` in `src/numbers.ts` |
| $BW$ | HBM bandwidth | 3.35 TB/s | Ch. 4 Step 5; `BW` |
| $t_{\text{step}}$ | the time of one forward pass | | Ch. 4 Step 5 |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $t_{\text{step}}$ | 16 ÷ 3.35 | 4.78 ms | 4.8 ms |
| free pages | 24 − 11 | 13 | 13 white squares |

### Next

Steps 2–7 follow one Req (rid a1f3 from Ch. 9 Step 7, the red pill) through the six stages in order.

## Step 2 · ingest_requests: drain the inbox

> **In one line:** the top of the loop takes every message in the inbox; each becomes a `Req` and goes to the end of `waiting_queue`.

### On the stage

- The inbox box has a blue outline, with a small blue block "msg" inside.
- `waiting_queue` is lit too, and the red pill `Req a1f3` appears in it.
- The first middle box is bold: `ingest_requests` · inbox → Req objects.

### What the message holds

It is the `TokenizedGenerateReqInput` that process 1 sent on Ch. 9 Step 7's blue wire:

| Field | Value | From |
|---|---|---|
| rid | a1f3 | Ch. 9 Step 7 |
| input ids | `791 6864 315 9822 374` ("The capital of France is") | Ch. 9 Step 3 |
| sampling params | temperature, top-p and so on | the request of Ch. 9 Step 2 |

The `Req` it becomes is the object of Ch. 9 Step 8: rid, input ids, output ids still empty, no pages yet.

### Why "drain"

Reading the inbox does not block (Ch. 9 Step 6): take whatever is there, and move on if nothing is. So every message that arrived during the last turn is taken now, and a request waits at most one turn of the loop to be seen. A turn is at least the 4.8 ms forward pass plus the CPU's work (step 9 puts illustrative times on that).

Nothing has touched the GPU or the cache yet; step 3 decides whether this Req runs.

### Next

Step 3: look in the radix tree, and check for room.

## Step 3 · get_next_batch_to_run: match the prefix, check for room

> **In one line:** the first 3 of the 5 tokens are already in the radix tree, so only 2 need prefill; there are enough free pages, so 2 pages are taken and the Req joins this step's prefill batch.

### On the stage

- `RadixCache` is lit, with three blue lines beside it: "match 3 of 5", "→ 2 to prefill", "→ 2 pages".
- Two squares in the `KV pool` turn solid blue (numbers 7 and 12), with "room ✓ · 2 pages taken now" under them.
- The red pill moves into the second middle box and reads `prefill batch`.
- `running_batch` is lit too: this step decides whether it runs.

### Formula

$$
n_{\text{new}} = n_{\text{prompt}} - n_{\text{hit}},\qquad
\text{pages} = \left\lceil \frac{n_{\text{new}}}{\text{page size}} \right\rceil
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n_{\text{prompt}}$ | the prompt's tokens | 5 | step 2 |
| $n_{\text{hit}}$ | tokens matched from the front in the radix tree | 3 | this step; the matching rule is Ch. 8 Step 5 |
| $n_{\text{new}}$ | tokens that actually need prefill | | this step |
| page size | tokens per page | 1 | Ch. 7 Step 6; SGLang's value on CUDA when unset |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| matched | `791 6864 315` | 3 | match 3 of 5 |
| $n_{\text{new}}$ | 5 − 3 | 2 (`9822 374`) | → 2 to prefill |
| pages | 2 ÷ 1 | 2 | → 2 pages, two blue squares |

### The room check

This is Ch. 7 Step 7's test: free pages ≥ pages needed? "Needed" is not only these 2 tokens; it also counts room for the answer ($\min(\text{max\_new\_tokens}, 4096)$, the table in Ch. 7 Step 7). 13 free squares are enough, so it passes.

The pages are taken in this stage (SGLang calls `ScheduleBatch.prepare_for_extend` here), not in the next one.

### What running_batch does this step

By default SGLang does not mix prefill and decode in one batch (`--enable-mixed-chunk` is off by default, Ch. 6 Step 7). While there is a prefill to run, the two decoding Reqs in `running_batch` wait this step out.

### Next

Step 4 turns this batch into tensors the GPU can read.

## Step 4 · ScheduleBatch → ForwardBatch: into tensors

> **In one line:** a list of Req objects becomes three kinds of tensor: every token id to compute in one array, each token's position, and each request's page table.

### On the stage

- The third middle box is bold: `ScheduleBatch → ForwardBatch` · ids · positions · pages.
- The red pill moves here and reads `ids · pos · pages`.
- Under the `KV pool`: "its 2 pages, in its page table".

### The three parts

| Part | What it is | What our Req adds |
|---|---|---|
| ids | the tokens every request in the batch computes this step, joined into one flat array | `9822 374`, the 2 uncached tokens of step 3 |
| positions | where each token sits in its own sequence | 4th and 5th (the first 3 are the cached prefix) |
| pages | each request's page table (Ch. 7 Step 7): for each position, which pool slot holds its k and v | 5 entries: the 3 pages the tree already has, then the 2 taken in step 3 |

- **Positions** are for RoPE: Llama rotates q and k by the position number (Ch. 2 Step 11). SGLang counts positions from 0, so they are actually 3 and 4.
- **Pages**: attention for positions 4 and 5 reads the k and v of all 5 positions through this table; the new k and v go into the pages the last 2 entries point at.

### Names

`ScheduleBatch` is the scheduler's object (in `schedule_batch.py`); `ForwardBatch` is the bundle of tensors the model runner reads (in `model_executor/forward_batch_info.py`, built by `ForwardBatch.init_new`, called from `tp_worker.py`). No pages are allocated here.

### Next

Step 5: the GPU runs the forward pass on these tensors.

## Step 5 · ModelRunner.forward: chapters 2 to 4

> **In one line:** on the GPU, look up embeddings, run 32 layers of attention and MLP, compute logits for each request's last position; the new k and v go into the 2 pages taken in step 3.

### On the stage

- The fourth middle box is bold: `ModelRunner.forward` · embed → 32 layers → logits.
- The red pill is in the GPU box at the lower right and reads "forward"; the GPU box has an orange outline.
- Cyan text under the `KV pool`: "read all pages · write 2 new".
- Orange text under the GPU box: "2 new tokens (+ other prefills) in".

### What happens in the forward pass

1. The ids are looked up in the embedding table; each token gets its vector $x$ (Ch. 2 Step 2).
2. 32 layers, each: attention computes $q, k, v$ for positions 4 and 5 (Ch. 2 Step 3), writes the new $k, v$ into the 2 new pages, and reads $k, v$ for all 5 positions through the page table; then the MLP.
3. Only each request's last position needs logits, because only it predicts the next token. Ours is the vector after position 5 (`␣is`), which becomes 128,256 scores (Ch. 1 Step 3's $s_t$).

### Formula

$$
\text{written} = n_{\text{new}} \times m_{kv},\qquad
\text{read} = n_{\text{prompt}} \times m_{kv}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n_{\text{new}}$ | tokens computed this step | 2 | step 3 |
| $n_{\text{prompt}}$ | all of this request's positions | 5 | step 2 |
| $m_{kv}$ | one token's k and v across all 32 layers | 128 KB | Ch. 3 Step 9; `KB_PER_TOKEN` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| KV written | 2 × 128 KB | 256 KB |
| KV read (our request) | 5 × 128 KB | 640 KB |
| logits | vocabulary size | 128,256 (`VOCAB`) |
| forward time | $t_{\text{step}}$ | 4.8 ms, the number on the GPU bar |

These few hundred KB are negligible next to 16 GB of weights. The pass takes the weight-read time as long as the whole batch stays under Ch. 4 Step 8's balance point of about 300 tokens; our Req adds 2, and the stage does not say how many the other prefills add.

### Next

Step 6 turns the logits into one token.

## Step 6 · Sampler: logits to a token

> **In one line:** each request picks one id from its 128,256 logits with its own sampling parameters; ours is 12366, `" Paris"`.

### On the stage

- The fifth middle box is bold: `Sampler` · logits → tokens.
- The red pill is back in the middle and reads "sample → 12366".
- Under the GPU box: "argmax / sample per request", "our Req: 12366 → " Paris"".

### What each parameter does

| Parameter | What it does |
|---|---|
| temperature $T$ | divides the logits by $T$ before softmax; $T<1$ sharpens the distribution, $T>1$ flattens it |
| top-p $p$ | takes tokens from most to least likely until their probabilities add up to $p$, and samples only among those |
| penalties | lower the logits of tokens already used (SGLang has repetition, frequency, presence and others) |
| greedy | when every request is greedy, take the argmax, Ch. 1 Step 4's "take the top one" |

SGLang's defaults, temperature 1.0 and top-p 1.0, sample from the raw distribution of Ch. 1 Step 4.

### The result

- The whole batch is handled together, each request with its own parameters, one id per request.
- Ours is `12366`, the id on Ch. 9 Step 7's orange wire, which decodes to `" Paris"` (with a leading space).
- It is still in GPU memory; step 7 copies it to the CPU for bookkeeping.

### Next

Step 7: bookkeeping, send, back to the top.

## Step 7 · process_batch_result: bookkeeping and sending

> **In one line:** each Req appends its new id and checks whether it is done; finished Reqs give their pages to the radix tree; one message with every new id goes to the detokenizer; then back to stage 1.

### On the stage

- The sixth middle box is bold: `process_batch_result` · append · finish · send.
- The red pill moves into `running_batch` and reads `Req a1f3 · +1 token`, with red "← joined" beside it.
- The `outbox` has a cyan outline, with a small cyan block `ids` inside.
- Beside `RadixCache`: "finished Reqs' pages stay here".

### In order

1. **Append:** each Req puts its new id into its output ids; ours adds step 6's 12366.
2. **Check for the end:** the id is EOS (Ch. 1 Step 10, id 128001), or the output has reached max_new_tokens. Ours is neither.
3. **Finished Reqs:** their pages are not put straight back as free; they are inserted into the radix tree (chapter 8), so a later request with the same prefix can reuse them, as ours reused 3 in step 3.
4. **Send:** one `BatchTokenIDOutput` with this step's new ids for every request goes into the outbox to process 3 (Ch. 9 Step 7's orange wire).

### When it enters running_batch

The stage draws our Req into `running_batch` on this step. In the code the merge happens at the start of the next turn's `get_next_batch_to_run`, which folds the last step's prefill batch into `running_batch` (the comment on the `get_next_batch_to_run` line in this chapter's code block). From the next step on it is a decode request, one new token per step.

### Next

Step 8: which of the six stages run on the CPU and which on the GPU.

## Step 8 · Where each stage runs

> **In one line:** stages 1–3 and 6 are Python on the CPU, stages 4–5 are kernels on the GPU; in this loop the two take turns and never work at once.

### On the stage

- The six boxes are outlined by colour, each with a small CPU or GPU tag on its right.
- Three brackets on the left:
  - Blue "plan · CPU", around stages 1–3: ingest, choose, build tensors; the GPU has nothing to run yet.
  - Orange "run · GPU", around stages 4–5: forward pass and sampling; the CPU waits for the tokens.
  - Cyan "process · CPU", around stage 6: append, finish, send; the GPU sits idle again.
- The right column is faded, because on this step blue means the CPU's plan, not pages in the pool.

### Which earlier steps

| Colour | Stages | Steps of this chapter |
|---|---|---|
| blue · plan | 1–3 | steps 2–4 |
| orange · run | 4–5 | steps 5–6 |
| cyan · process | 6 | step 7 |

### Why they take turns

- Until the plan is done, the GPU does not know what to run.
- Processing needs the sampled ids on the CPU, so it waits for the GPU to finish and the ids to be copied back.
- So every millisecond of Python is added to every step, on top of the 4.8 ms forward pass.

### Next

Step 9 puts times on the three colours and shows how SGLang overlaps them.

## Step 9 · Overlap scheduling

> **In one line:** a kernel launch returns at once, so the CPU can plan t+1 and process t−1's results while the GPU runs step t; the GPU lane has no gaps, and a step goes from 7.1 ms to 4.8 ms.

### On the stage

- Two rows, each with a CPU · scheduler lane and a GPU lane, on one 0–20 ms time axis; colours as in step 8.
- **Top row, without overlap:** "plan 1" → "step 1" → a cyan results block, three times over; during each plan the GPU lane reads grey "idle".
- **Bottom row, with overlap:** the GPU lane's "step 1", "step 2", "step 3" touch end to end; the CPU does "plan 2" during step 1, then r1 (step 1's results) and "plan 3" during step 2, and so on.
- Two legend lines and a footnote: the CPU times are illustrative; launching a step's kernels inside the plan assumes chapter 11's CUDA graphs.

### Formula

$$
t_{\text{no overlap}} = t_{\text{plan}} + t_{\text{step}} + t_{\text{res}}
$$

$$
t_{\text{overlap}} = \max\!\left(t_{\text{step}},\ t_{\text{plan}} + t_{\text{res}}\right)
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{plan}}$ | the plan: stages 1–3 plus launching the kernels | 1.5 ms (illustrative) | this step |
| $t_{\text{res}}$ | processing results: stage 6 | 0.8 ms (illustrative) | this step |
| $t_{\text{step}}$ | one GPU step | 4.78 ms | step 1 |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $t_{\text{no overlap}}$ | 1.5 + 4.78 + 0.8 | 7.08 ms | 7.1 ms |
| $t_{\text{plan}} + t_{\text{res}}$ | 1.5 + 0.8 | 2.3 ms | 2.3 ms of Python |
| $t_{\text{overlap}}$ | max(4.78, 2.3) | 4.78 ms | 4.8 ms |
| speed-up | 7.08 ÷ 4.78 | 1.48 | about 48% more tokens per second |

The $\max$ states the condition: the CPU's 2.3 ms must fit inside one GPU step. If the CPU were slower, it would become the bottleneck.

### In SGLang

This is `Scheduler.event_loop_overlap` (`managers/scheduler.py`), on by default and turned off by `--disable-overlap-schedule`. It puts each step's result in a queue and processes the previous step's result after launching the next one. vLLM v1 calls the same idea async scheduling.

### Next

The bottom row has a hole: step t+1's input is the token step t samples, and that token does not exist yet when the CPU plans t+1. Step 10 fills it.

## Step 10 · The placeholder: a slot on the GPU

> **In one line:** when the CPU plans t+1 it puts a slot, `buf[7]`, in the input; step t's sampler writes the token there and step t+1's first kernel reads it, so the token never goes to the CPU.

### On the stage

- Three boxes, appearing left to right:
  - Blue "CPU · plan step t+1": the decode input for our Req is not a token id yet, but `buf[7]`.
  - Orange "GPU · step t · sampler": samples 12366 for our Req and writes it straight into `buf[7] = 12366`.
  - Orange "GPU · step t+1 · first kernel": reads `buf[7]` → 12366, looks up its embedding, and the step runs as normal.
- Below, a row of 12 slots: `buf`, a small buffer in GPU memory with one slot per request; slot 7 is pale orange and holds 12366.
- Two statements and a footnote (SGLang's names).

### Why it is needed

In step 9's bottom row the CPU plans t+1 while step t is still running. If it waited for step t's token to be copied back, every launch would come after a copy and a results phase, which is the top row again.

### Why the order is safe

The GPU runs kernels in launch order. Step t's sampler is launched first and step t+1's first kernel after it, so `buf[7]` is always written before it is read.

### In SGLang

| On the stage | SGLang |
|---|---|
| `buf` | `FutureMap.output_tokens_buf` (`managers/overlap_utils.py`) |
| the slot number | indexed by the request's row in `req_to_token` (Ch. 7 Step 7's page-table table), so a request has the same slot every step |
| step t+1's first kernel reading it | `resolve_forward_inputs`: for decode, gathers the last step's tokens from this buffer by row |

The CPU still gets a copy for step 7's bookkeeping (append, check EOS), but that happens in the results phase, r1 and r2 in step 9, one step behind the GPU.

### Next

Step 11 maps this chapter and the earlier ones onto SGLang's files.

## Step 11 · The whole site as a file tree

> **In one line:** 13 files or folders under `python/sglang/srt/`, each tagged with the chapter that explained it; the loop you just watched is `managers/scheduler.py`.

### On the stage

13 rows, each with a path on the left, a short description in the middle, and a blue badge with chapter numbers on the right:

- `entrypoints/http_server.py`: the HTTP server · process 1 · ch. 9
- `managers/tokenizer_manager.py`: tokenize, own the streams · ch. 9
- `managers/scheduler.py`: the loop you just watched · ch. 6, 9, 10 (all of this chapter)
- `managers/schedule_batch.py`: Req and ScheduleBatch · ch. 10 (this chapter: steps 2–4)
- `managers/schedule_policy.py`: FCFS, LPM, the chunk cap · ch. 6, 8 (this chapter: step 3)
- `managers/detokenizer_manager.py`: ids → text · process 3 · ch. 9 (receives this chapter's step 7 message)
- `mem_cache/memory_pool.py`: KV pages and page tables · ch. 7 (this chapter: steps 3 and 4)
- `mem_cache/radix_cache.py`: the tree · ch. 8 (this chapter: steps 3 and 7)
- `model_executor/model_runner.py`: the forward pass · ch. 4, 10 (this chapter: step 5)
- `model_executor/runner/decode_cuda_graph_runner.py`: a thousand kernels as one · ch. 11
- `layers/attention/`: paged attention kernels · ch. 2, 3 (this chapter: step 5)
- `layers/sampler.py`: logits → tokens · ch. 10 (this chapter: step 6)
- `disaggregation/`: prefill and decode apart · ch. 28

- The footnote: every chapter so far is one file; the rest of the site is what those files do when the model doesn't fit on one GPU, or one machine.
- Every path was checked to exist in the current SGLang main.

### Two rows point ahead

- **`decode_cuda_graph_runner.py`, chapter 11:** step 5's forward pass launches about a thousand kernels; step 9's footnote assumes launching them is cheap, and chapter 11 shows how.
- **`disaggregation/`, chapter 28:** prefill and decode run on different GPUs.

### Next

Chapter 11: how the model runner launches a thousand kernels as one.
