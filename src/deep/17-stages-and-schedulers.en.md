## Step 1 · Three models with no process to run in

> **In one line:** SGLang has one process with a model in it; of chapter 16's six models, the talker, code predictor and code2wav have nowhere to run in SGLang.

### On the stage

- Top row, "SGLang today · Ch. 9 Step 5": three processes joined by two "queue"s.
  - White boxes "server + tokenizer" and "detokenizer": on the CPU, no model.
  - Blue box "scheduler + model": on the GPU, one loop.
- Bottom row, "Qwen3-Omni's six models · Ch. 16 Step 4": white is a one-pass model, blue is a loop (Ch. 16 Step 4's two kinds).
  - Vision encoder, audio encoder, the engine: solid outlines, three blue arrows into the scheduler process, "the encoders in its prefill" (Ch. 16 Step 2).
  - Talker, code predictor, code2wav: red dashed outlines, with "no process runs these" in red beneath.
- The blue "needed:" pill at the bottom: what the chapter adds.

### Why they cannot just go into the scheduler process

- The scheduler process runs one loop: pick a batch, run the forward pass, pick tokens (Ch. 10 Step 1). That loop serves the engine.
- The talker and code predictor are loops of their own (blue), with their own step every frame; they cannot share the engine's loop.
- code2wav is a one-pass model (white), but it runs only once 10 frames have built up (Ch. 16 Step 3), at a different pace from the engine.

### Next

Step 2 defines the home SGLang-Omni gives each piece of work: a stage.

## Step 2 · What a stage is

> **In one line:** a stage = a runtime that sends and receives + a scheduler doing the work in its own thread, with two queues between them, the inbox and the outbox.

### On the stage

- Two large frames, "a stage" and "the next stage", built the same way.
- The runtime at the top of each: "receives from stages, sends to stages".
- Two stacks of small boxes in the middle: the inbox on the left (down into the scheduler), the outbox on the right (up to the runtime).
- The blue scheduler box at the bottom: "a thread of its own", whose loop is "take from the inbox, run the work, put into the outbox".
- The arrow between the frames, "to the next stage", tagged "how: Ch. 18 Step 2".
- The animation: a request pill enters from the left, drops into the inbox, stops in the scheduler while a bar fills ("running the work"), turns from orange `req` to blue `req′`, goes up through the outbox to the runtime, is sent to the next stage, repeats the path and turns green `req″`. The "loops" bar in the top right fills once per lap.

### What each part does

| Part | What it does | In SGLang-Omni |
|---|---|---|
| runtime | the stage's I/O: receives from other stages, sends to them | the `Stage` class, an event loop |
| scheduler | does the stage's work | started in a thread named `scheduler-<stage name>` (`pipeline/stage/runtime.py`) |
| inbox / outbox | the two queues between runtime and scheduler | the only things the scheduler exposes |

`req′` and `req″` are the same request, carrying what earlier stages made (tokens, embeddings, codes and so on).

### Why the split

- The scheduler touches only its own inbox and outbox. It never calls the next stage and never waits for it, so each stage's loop runs at its own pace.
- This matches Ch. 9 Step 6, where the scheduler process took whatever had arrived at the top of every step and the tokenizer dropped its message and moved on. The difference is that each stage here has its own pair of queues.

### Next

Step 3 shows that a stage and a process are not the same thing.

## Step 3 · A stage is not a process

> **In one line:** the same stages can each have a process, share one process, or one stage can span several; the stage itself does not change, only the hand-off does.

### On the stage

Three columns; each dashed box is a **process** (Ch. 9 Step 4: one running program with its own Python interpreter).

| Column | What is drawn | Hand-off | Note below |
|---|---|---|---|
| left, "one process per stage" | `thinker`, `talker_ar`, `code2wav`, each in its own dashed box | "a message" | Qwen3-Omni's speech default; one stage's CPU work can't stall another |
| middle, "several in one process" | `preprocessing`, `thinker`, `decode` in one dashed box | "a direct call" | Qwen3-Omni's text-only pipeline; one interpreter, and they fail together |
| right, "one stage, several processes" | one `thinker` across "process · GPU 0" and "process · GPU 1" | | tensor parallelism, one model split over two GPUs (chapter 24) |

The blue pill at the bottom: the stage is the same in all three; only the hand-off changes.

### Checked against SGLang-Omni's config

- The speech default (`SPEECH_DEFAULT_PROCESSES` in `config.py`) gives each of the seven stages its own process name, so one process per stage.
- The text-only layout (`text_stages()`) puts `process="pipeline"` on every stage, so one process. It actually has six stages (`preprocessing`, the two encoders, `mm_aggregate`, `thinker`, `decode`); the stage draws three of them.

### The trade between the two hand-offs

- **Same process:** the hand-off is a function call, the cheapest kind; but the stages share one Python interpreter, so one stage's CPU work holds up the others, and one failure stops them all.
- **Different processes:** the hand-off is a message between processes and costs more time; in exchange the stages do not block each other and fail separately.

### Next

Step 4 draws the seven stages of Qwen3-Omni's speech pipeline. Which layout to pick is chapter 19's question.

## Step 4 · Qwen3-Omni's seven stages

> **In one line:** six models, minus one they share, plus two that run no model, make seven stages; the seven processes sit in three places, the CPU, GPU 0 and GPU 1.

### On the stage

- Seven solid boxes, each inside a dashed "process" box, naming the stage, what it holds and where it runs.
  - Grey (no model): `preprocessing`, `decode`, both on the CPU.
  - White (one pass): `image_encoder`, `audio_encoder`, `code2wav`, all on GPU 0.
  - Blue (a loop): `thinker` (the engine, GPU 0), `talker_ar` (talker + code predictor, GPU 1).
- Arrows: `preprocessing` → both encoders and `thinker`; both encoders → `thinker`; `thinker` → "token ids" → `decode` → "text out"; `thinker` → "each token" → `talker_ar` → "codes" → `code2wav` → "sound out".
- Three dotted lines and two footnotes (the talker also reads the prompt; the design notes' eighth stage).

### Formula

$$
N_{\text{stage}} = N_{\text{model}} - 1 + 2,\qquad
N_{\text{proc}} = N_{\text{CPU}} + N_{\text{GPU0}} + N_{\text{GPU1}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $N_{\text{model}}$ | Qwen3-Omni's models | 6 | Ch. 16 Step 4 |
| $-1$ | the talker and code predictor share `talker_ar` | | steps 5 and 6 say why |
| $+2$ | `preprocessing` and `decode`, which run no model | | this step |
| $N_{\text{stage}}$ | the number of stages | | this step |
| $N_{\text{CPU}}, N_{\text{GPU0}}, N_{\text{GPU1}}$ | processes in each place | | the device under each box |
| $N_{\text{proc}}$ | the number of processes | | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| $N_{\text{stage}}$ | 6 − 1 + 2 | **7** |
| $N_{\text{proc}}$ | 2 (`preprocessing`, `decode`) + 4 (both encoders, `thinker`, `code2wav`) + 1 (`talker_ar`) | **7** |

### The two stages with no model

- `preprocessing`: turns the request into tokens, photo patches and audio frames for the encoders and `thinker`.
- `decode`: the detokenizer, turning token ids back into text (Ch. 1 Step 11).

### Not drawn

- `talker_ar` also receives the output of `preprocessing` and both encoders, and builds its own prompt (in SGLang-Omni's config, `preprocessing`'s next stages include `talker_ar`). Ch. 18 Step 1 covers it.
- The design notes, `docs/design/refactor_rfc.md`, add an eighth stage, `mm_aggregate`; the speech pipeline now has `thinker` and `talker_ar` do that join themselves.
- The default config sets `thinker_gpu=0` and `talker_gpu=1`. Why the talker gets a GPU of its own is chapter 19.

### Next

Step 5 shows why the code predictor has no stage of its own.

## Step 5 · What the code predictor reads and writes are both the talker's

> **In one line:** in one talker step, the code predictor reads the talker's hidden state and code 0 and writes codes 1–15; the finished frame becomes the talker's next input.

### On the stage

- A dashed frame, "one talker step · one frame".
- Two inputs on the left: grey "a token, from the thinker", orange "the last frame".
- Blue talker box: "one forward pass · code 0".
- A blue arrow down, tagged "read from the talker: its hidden state and code 0".
- Orange code predictor box: "codes 1–15, one after another".
- Orange "the frame · 16 codes": one way "to code2wav", the other along the orange arrow back to the left, tagged "written for the talker: its next input".

### Formula

$$
n_{\text{code}} = 1 + (n_{\text{code}} - 1)
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n_{\text{code}}$ | codes per frame | 16 | Ch. 16 Step 3, `CODES_PER_FRAME` in `src/numbers.ts` |
| 1 | code 0, written by the talker | | this step |
| $n_{\text{code}} - 1$ | codes 1–15, written by the code predictor | 15 | this step |
| $t_{\text{frame}}$ | the length of one frame | 80 ms | Ch. 16 Step 3 |

Substituted: 16 = 1 + 15. One frame is 80 ms of sound.

### What the hidden state is

The vector the talker's last layer computes for the current position, the last layer's output of the kind of $x$ in Ch. 2 Step 2. The talker picks code 0 from it; the code predictor takes it and code 0 and writes on from there.

### Why this puts it inside the talker

- Its inputs come from the talker (the hidden state, code 0).
- Its output goes back to the talker (the frame is the talker's next input).
- In SGLang-Omni the code predictor runs inside `talker_ar`'s forward pass, after the talker's own layers (the footnote).

### Next

Step 6 counts the hand-offs a code predictor stage of its own would add.

## Step 6 · What a stage of its own would cost

> **In one line:** as a stage of its own, every frame needs 2 hand-offs, 500 for the 20 s answer, and the talker waits through each; inside the talker's step there are 0.

### On the stage

- The colour key: blue is a talker pass, orange is the code predictor's passes, a red dashed block is one hand-off between stages (not to scale).
- Top timeline, "if the code predictor were a stage of its own": 5 frames, each blue → red → orange → red. In red: "2 hand-offs a frame".
- Bottom timeline, "inside the talker's step · as SGLang-Omni runs it": 8 frames, blue and orange touching, "0 hand-offs".
- The footnote: SGLang-Omni's placement check, quoted.

### Formula

$$
n_{\text{frame}} = \frac{T_a}{t_{\text{frame}}},\qquad
n_{\text{hand}} = 2 \times n_{\text{frame}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $T_a$ | the answer's length | 20 s | Ch. 16 Step 1 |
| $t_{\text{frame}}$ | the length of one frame | 80 ms | Ch. 16 Step 3 |
| $n_{\text{frame}}$ | frames in the answer | | Ch. 16 Step 3 |
| 2 | hand-offs per frame: one to the code predictor (carrying the hidden state and code 0), one back (carrying the finished frame) | | step 5 |
| $n_{\text{hand}}$ | hand-offs for the whole answer | | this step |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| $n_{\text{frame}}$ | 20 s ÷ 80 ms | **250** |
| $n_{\text{hand}}$ (a stage of its own) | 2 × 250 | **500** |
| $n_{\text{hand}}$ (inside the talker's step) | | **0** |

### Why the talker waits through each one

The talker's next pass needs this frame (step 5), so it cannot start until the frame is back. All 500 hand-offs therefore sit on the talker's critical path. Inside the step, the hidden state and the frame stay where the step left them, on the GPU, and nothing moves.

What one hand-off costs is Ch. 18 Step 3. SGLang-Omni forbids the layout outright: `models/qwen3_omni/placement.py` refuses it with "Qwen code predictor is part of talker_ar and must not be a stage".

### Next

Step 7 asks whether the seven stages can share one scheduler.

## Step 7 · Three kinds of scheduler

> **In one line:** sorted by what a stage keeps between two calls, the seven stages fall into three kinds: nothing, a KV cache, or pieces still arriving.

### On the stage

Three columns, each with "k of 3", the kind, and its scheduler in the top right:

| | 1 of 3, one pass | 2 of 3, a loop | 3 of 3, streaming |
|---|---|---|---|
| The sketch | input → run → result | steps 1–4, one more small blue block under each | numbered pieces 1, 2, 3 into a dashed box, then out |
| Keeps between calls | nothing: each request arrives whole, runs once, and is gone | each request's KV cache, growing every step, and the running batch | each request's pieces so far, until there are enough to use |
| Used by | `preprocessing`, `image_encoder`, `audio_encoder` | `thinker`, `talker_ar` | `decode`, `code2wav` |
| Scheduler | `SimpleScheduler` | SGLang's own scheduler | its own, per stage |

The line below: a scheduler built around a KV cache has nothing to do for an encoder, and no way to wait for pieces. The footnote gives SGLang-Omni's class names.

### The blocks in the loop column

Each block is one position in the KV cache. Every decode step adds one position to each request's cache (Ch. 3 Step 7), so step 1 has one block and step 4 has four.

### Why three

- A one-pass stage has no KV cache, so SGLang's page pool and radix tree do nothing for it.
- A streaming stage has to hold pieces until there are enough, and SGLang's loop has no such move.
- Only the loop kind matches SGLang's own scheduler.

### Next

Steps 8–11 set each kind against SGLang's loop: step 8 one pass, steps 9 and 10 the loop, step 11 streaming.

## Step 8 · 1 of 3, one pass: SimpleScheduler

> **In one line:** set row by row against SGLang's six-row loop, `SimpleScheduler` keeps simpler versions of four rows, drops the batch choice and the Sampler, and keeps nothing.

### On the stage

- Left column, blue boxes, "SGLang's loop · Ch. 10 Step 1": six rows, over "keeps: waiting and running lists, KV pages, the radix tree".
- Right column, "one pass · SimpleScheduler": "keeps: nothing". A solid arrow and a white box mean the row has a counterpart; a dashed line and a dashed "not needed" box mean the row is dropped.
- Two footnotes: the batch limit, and where the encoder's hash cache lives.

### Row by row

| SGLang's row | `SimpleScheduler` |
|---|---|
| `recv_requests`: inbox → Req objects | take what is waiting in the inbox, up to 32 |
| `get_next_batch_to_run` | **not needed**: every request is new, and done after this run |
| `ScheduleBatch → tensors` | stack the inputs: no positions, no pages |
| `ModelRunner.forward` | run the encoder once |
| `Sampler` | **not needed**: an encoder hands over embeddings, nothing to pick |
| `process_batch_result` | put each result in the outbox: all finished |

### Checked against the source

- The top of `scheduling/simple_scheduler.py` states this loop: inbox.get() → run the function → outbox.put(), with no KV cache.
- Both encoders' `SimpleScheduler` set `max_batch_size=32` (`models/qwen3_omni/stages.py`).
- The wait, `max_batch_wait_ms`, comes from the environment variable `SGLANG_OMNI_ENCODER_BATCH_WAIT_MS` and is 0 when it is unset, so by default the encoders do not wait for more requests.
- Ch. 16 Step 2's hash cache (a photo seen before returns its result directly) lives in the encoder's own code, so the scheduler still keeps nothing.

### The row names

The left column's first row says `recv_requests`. Ch. 10 Step 1 calls this row `ingest_requests`, the method SGLang's main loop calls, which calls `recv_requests` inside to receive the messages. `recv_requests` is what SGLang-Omni overrides. The third row is `ScheduleBatch → ForwardBatch` in chapter 10 and `ScheduleBatch → tensors` here: the same thing, turning the batch into tensors.

### Next

Step 9 is kind 2: the loop that keeps every row.

## Step 9 · 2 of 3, a loop: OmniScheduler

> **In one line:** the thinker and the talker are chapter 10's loop, so all six rows stay; the middle three run SGLang's own code unchanged, and only the three that touch the outside change.

### On the stage

- Left column as in step 8: SGLang's six rows.
- Right column, "a loop · SGLang-Omni's OmniScheduler": "keeps: the same lists, pages and tree". Six solid arrows: every row has a counterpart.
  - Blue boxes, "SGLang's own code": rows 2, 3 and 6.
  - White boxes, "changed": rows 1, 4 and 5.
- Two footnotes: how OmniScheduler reuses SGLang, and what of SGLang it leaves out.

### Row by row

| SGLang's row | `OmniScheduler` | |
|---|---|---|
| `recv_requests` | reads the stage's inbox (step 2), not a socket | changed |
| `get_next_batch_to_run` | the same prefill-or-decode choice, the same page pool | SGLang's own |
| `ScheduleBatch → tensors` | the same tensors, the same pages | SGLang's own |
| `ModelRunner.forward` | the model's own runner: takes embeddings in (the encoders' output, step 4), sends each token on as soon as it is picked | changed |
| `Sampler` | picked inside the model's runner | changed |
| `process_batch_result` | the same append and finish; its send is switched off, since the runner already sent | SGLang's own |

### Checked against the source

The class note in `scheduling/omni_scheduler.py`: methods such as `get_next_batch_to_run` and `process_batch_result` are looked up on SGLang's `Scheduler` **class** and called with the `OmniScheduler` instance as `self` (through `__getattr__`), with no copy and no subclass. The methods defined on the class itself, which take precedence, are `recv_requests`, `process_input_requests`, `run_batch` and `send_to_tokenizer`.

Left out (from the design notes): sockets, the tokenizer, grammar, LoRA and speculative decoding.

### Next

Step 10 adds one row to this loop for the talker.

## Step 10 · The talker's ready check

> **In one line:** the talker's scheduler adds one row to step 9's loop: before each decode step it checks that every request in the batch has its next token, and if one is missing the whole batch waits.

### On the stage

- Left, "the talker's loop": step 9's six rows (tagged "changed" or "SGLang's own"). In the animation an orange new row, "ready check · next token here?", slides in after row 2, `get_next_batch_to_run`, and the rows below move down.
- Right, a batch of three requests A, B and C, under three cells "iteration 1 / 2 / 3":
  1. A's and B's next tokens are "here" (orange); C's is an empty red dashed slot.
  2. Iteration 1: checking → held (red), "the loop goes back to the top and checks again".
  3. Iteration 2: held again.
  4. C's token, "from the thinker", slides into C's slot, "through the inbox, filed under C".
  5. Iteration 3: "ran" (blue), one forward pass for A, B and C together.
- Two dotted lines (two features switched off, and why) and two footnotes. The "loops" bar is in the top right.

### Why the whole batch waits

A decode step runs every request in the batch at once, sharing one weight read (Ch. 5 Step 2). It cannot run A and B and leave C where it is, so one missing input stops the whole batch. This is Ch. 16 Step 5's point that the talker has to wait for each token the engine writes.

### Checked against the source (`models/qwen3_omni/talker_scheduler.py`)

- `QwenTalkerScheduler` subclasses `OmniScheduler` and overrides `get_next_batch_to_run`: it calls the parent to pick the batch, then checks it with `is_batch_ready_to_run`. If it is a decode batch and the runner says an input is missing (the talker's previous frame or the thinker's token), it calls `rollback_decode_prep_after_skip` to undo the preparation and returns nothing. The stage draws the check right after row 2, which matches the code.
- `configure_talker_server_args` sets `disable_radix_cache=True` and `chunked_prefill_size=0`, and, when `feedback_enabled` (on by default), `disable_overlap_schedule=True`.

### The three features switched off

| Feature | Where it was shown | Why it is off |
|---|---|---|
| overlap scheduling | Ch. 10 Step 9 | each step's input is the frame the step before wrote, so the next step cannot be planned early |
| the radix cache | Ch. 8 Step 4 | the tree matches token ids, and the talker's prompt arrives as vectors |
| chunked prefill | Ch. 6 Step 6 | the code gives no reason; the stage only notes that it is off |

The reasons for the first two are this book's reading of the code (see the chapter's prose). After the thinker's last token, every request reads a pad token, which is always there, so nothing holds the batch any more (the footnote).

### Next

Step 11 is kind 3: streaming.

## Step 11 · 3 of 3, streaming: decode and code2wav

> **In one line:** decode holds tokens that are not yet a whole character, code2wav holds frames until there are 10 new ones; neither needs a Sampler.

### On the stage

- Left column: SGLang's six rows, "keeps: lists, KV pages, the tree".
- Middle column `decode`, "keeps: tokens not yet a whole character"; right column `code2wav`, "keeps: the frames so far". Each row is a white "changed" box or a dashed "not needed" box, with a line beneath.
- Two footnotes: what "half a character" means; the two schedulers' class names and why earlier frames are reread.

### Row by row

| SGLang's row | `decode` | `code2wav` |
|---|---|---|
| `recv_requests` | a token at a time, filed by request | frames in pieces, filed by request |
| `get_next_batch_to_run` | not needed: each token is handled as it arrives | requests with 10 new frames, batched |
| `ScheduleBatch → tensors` | not needed: no model, no GPU | up to 25 earlier frames + the 10 new |
| `ModelRunner.forward` | pending tokens → text, on the CPU | code2wav, once over each window |
| `Sampler` | not needed: nothing to pick | not needed: it writes sound |
| `process_batch_result` | send the text; keep half a character | send the 10 new frames' sound |

### Half a character

The tokenizer works on bytes, so the bytes of one character (an emoji, say) can be split across two tokens. Sending the first token alone would send half a character, so decode holds it until the next token completes it.

### Formula

$$
n_{\text{win}} = n_{\text{ctx}} + n_{\text{chunk}},\qquad
t_{\text{chunk}} = n_{\text{chunk}} \times t_{\text{frame}},\qquad
n_{\text{c2w}} = \frac{n_{\text{frame}}}{n_{\text{chunk}}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n_{\text{chunk}}$ | new frames per pass | 10 | Ch. 16 Step 3; `stream_chunk_size=10` in `Code2WavScheduler` |
| $n_{\text{ctx}}$ | the most earlier frames reread | 25 | `left_context_size=25` in `Code2WavScheduler` |
| $n_{\text{win}}$ | the most frames one pass reads | | this step |
| $t_{\text{frame}}$ | the length of one frame | 80 ms | Ch. 16 Step 3 |
| $t_{\text{chunk}}$ | the sound one pass sends | | this step |
| $n_{\text{frame}}$ | frames in the answer | 250 | step 6 |
| $n_{\text{c2w}}$ | code2wav passes | | Ch. 16 Step 3 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| $n_{\text{win}}$ | 25 + 10 | **35** frames |
| $t_{\text{chunk}}$ | 10 × 80 ms | **800 ms** |
| $n_{\text{c2w}}$ | 250 ÷ 10 | **25** passes |

At most 25 earlier frames: in the first few passes there are not that many yet, so the window is shorter (`min(25, frames sent so far) + 10`). The earlier frames are reread so the seam between two pieces of sound is smooth; chapter 20 explains.

### Next

Step 12 puts each stage's scheduler back on step 4's graph.

## Step 12 · Eight edges, and how each hand-off is made

> **In one line:** eight edges join the seven stages; they differ in how often they carry something and where their ends sit, and the next chapter says how each one is made.

### On the stage

- Step 4's seven boxes, each with one more line, its scheduler (steps 7–11), above its device.
- All eight edges in red, each with a numbered red circle:

| Edge | From → to | Where the ends sit | How often |
|---|---|---|---|
| 1 | `preprocessing` → `image_encoder` | CPU → GPU 0 | once |
| 2 | `preprocessing` → `audio_encoder` | CPU → GPU 0 | once |
| 3 | `preprocessing` → `thinker` | CPU → GPU 0 | once |
| 4 | `image_encoder` → `thinker` | GPU 0 → GPU 0 | once |
| 5 | `audio_encoder` → `thinker` | GPU 0 → GPU 0 | once |
| 6 | `thinker` → `decode` | GPU 0 → CPU | every token |
| 7 | `thinker` → `talker_ar` | GPU 0 → GPU 1 | every token |
| 8 | `talker_ar` → `code2wav` | GPU 1 → GPU 0 | every 10 frames |

- Two dotted lines (how often, where the ends sit) and two footnotes (what each box shows; three more undrawn edges carry inputs to `talker_ar`, Ch. 18 Step 1).

### Each stage's scheduler

| Stage | Scheduler | Kind |
|---|---|---|
| `preprocessing`, `image_encoder`, `audio_encoder` | `SimpleScheduler` | one pass (step 8) |
| `thinker` | `OmniScheduler` | a loop (step 9) |
| `talker_ar` | `QwenTalkerScheduler` | a loop + the ready check (step 10) |
| `decode` | `StreamingDetokenizeScheduler` | streaming (step 11) |
| `code2wav` | `Code2WavScheduler` | streaming (step 11) |

### How often edge 8 carries something

SGLang-Omni's talker config sets `codec_coalesce_frames=10` and `codec_coalesce_early_frames=10`: the first 10 frames are sent one at a time, and after that every 10 frames go as one message. The stage's "every 10 frames" describes the steady state after the start.

### Next

Step 2 left the hand-off between runtimes undrawn. With these eight edges, chapter 18 answers how each edge's data gets from one process to another, for example how each token gets from the thinker on GPU 0 to the talker on GPU 1.
