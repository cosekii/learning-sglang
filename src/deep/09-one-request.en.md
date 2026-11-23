## Step 1 · Launch the server

> **In one line:** `sglang serve` puts the 16 GB of weights on the GPU, carves most of the rest into a KV pool, opens HTTP port 30000, and waits.

### On the stage

- A command line at the top: `sglang serve --model-path … --port 30000`.
- Left, the "http server" box: listening on :30000 · async · thousands of connections; below it "tokenizer": text ↔ ids.
- Right, the "scheduler loop" box, holding one bar, "GPU · 80 GB":
  - A solid blue "weights" segment on the left, 16 ÷ 80 = 20% of the bar.
  - A dashed cyan box on the right, "KV pool · 64 GB, empty": no request's k and v yet.
- Two lines at the bottom of the box: waiting list: empty · running: none; polling its inbox, no GPU work yet.
- Grey footnote: weights loaded once; the KV pool is most of Ch. 7 Step 1's 64 GB; the loop from Ch. 6 Step 9 is already spinning.

### Formula

$$
M_{\text{room}} = M_{\text{HBM}} - M_W,\qquad
N_{\text{tok}} = \frac{M_{\text{room}}}{m_{kv}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $M_{\text{HBM}}$ | one H100's memory | 80 GB | `HBM_GB` in `src/numbers.ts` |
| $M_W$ | Llama-3-8B's weights | 16 GB | Ch. 4 Step 2; `W_GB` |
| $M_{\text{room}}$ | the room left for KV cache | | Ch. 7 Step 1 |
| $m_{kv}$ | one token's k and v across all layers | 128 KB = 131,072 B | Ch. 3 Step 9; `KB_PER_TOKEN` |
| $N_{\text{tok}}$ | how many tokens' k and v that room holds | | this step |

Units as in chapter 7: a GB is 10⁹ B, a KB is 1,024 B.

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| weights' share of the bar | 16 ÷ 80 | 20% | blue segment |
| $M_{\text{room}}$ | 80 − 16 | 64 GB | KV pool · 64 GB |
| $N_{\text{tok}}$ | 64 × 10⁹ ÷ 131,072 | about 488,000 tokens | |

Check against Ch. 7 Step 2: at a 2k context the pool fits 238 requests, 238 × 2,048 ≈ 487,000 tokens, the same number.

### The footnote's "most of"

SGLang's `--mem-fraction-static` caps weights plus KV pool as a share of memory; left unset, it comes to about 0.83 on an 80 GB card. The other ~17% is kept for intermediate results and CUDA graphs (chapter 11). So the real pool is about 55 GB, as Ch. 7 Step 1 worked out. The stage draws 64 GB.

### What else launch does

- `sglang serve` is the newer command-line entry point; the older form is `python -m sglang.launch_server`. Without `--port`, the port is 30000.
- The model is loaded once; every request uses that one copy of the weights.
- The scheduler loop (Ch. 6 Step 9) starts spinning right away: each lap checks the inbox first, and with an empty waiting list there is no GPU work.
- The stage draws two boxes; how many processes they really are, and why, is steps 4 and 5.

### Next

Step 2: a client sends a request.

## Step 2 · A client sends a request

> **In one line:** the client POSTs some JSON; the server parses it and applies the chat template, which gives a string; the GPU needs ids, so it still has to be converted.

### On the stage

- A new "client" box on the left: `POST /v1/chat/completions`, `stream: true`.
- A blue arrow labelled JSON, from the client to the http server.
- The http server box gets a thick blue border: it is the one working now.
- The scheduler box is as in step 1: nothing has reached it.

### What the request looks like

- `POST /v1/chat/completions` is the OpenAI-compatible endpoint; SGLang implements the same format, so existing OpenAI clients can connect as they are.
- The JSON body holds the chat messages (a list of `role` and `content`) and `stream: true`.
- `stream: true` asks for the answer one token at a time instead of all at once at the end; step 9 shows what comes back.

### The server's two jobs

1. **Parse the JSON** into Python objects.
2. **Apply the chat template.** Each model was trained on its own conversation format. The template joins the messages into one string and wraps each in the role markers this model knows (which part is system, which is user, where the assistant's turn begins).

The result is text. The model's input is a list of integer ids (Ch. 1 Step 2), so the next step cuts it into tokens.

### Next

Step 3: tokenize to get ids, then ask how they reach the scheduler.

## Step 3 · Tokenize, then the ids must reach the scheduler

> **In one line:** the tokenizer turns the text into 5 ids; that is Python work on the CPU, and the scheduler loop needs the CPU between GPU steps too.

### On the stage

- In the server box: `"The capital of France is"` → `791 6864 315 9822 374`.
- A grey dashed arrow labelled `ids → ?` from the server to the scheduler: how to send them is still open.
- Lower left, "server · whenever a client sends": 6 short blue bars at irregular spacing and widths. Two lines under it: parse JSON, tokenize: µs to 2 ms; per token: ids → text, write it out.
- Lower right, "scheduler loop · once requests are running": 3 pairs of a thin black bar and an orange GPU step. Two lines under it: each GPU step is 4.8 ms, Ch. 4 Step 5's weight read; the black bar is picking the next batch on the CPU between steps.
- Two dotted lines at the bottom: both sides are Python code and both run on the CPU; the simplest hand-off is one process and a function call.

### Formula

$$
t_{\text{step}} = \frac{M_W}{BW}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $M_W$ | bytes of weights | 16 GB | step 1 |
| $BW$ | HBM bandwidth | 3.35 TB/s | `BW` in `src/numbers.ts` |
| $t_{\text{step}}$ | one decode step: one read of the weights | | Ch. 4 Step 5 |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $t_{\text{step}}$ | 16 ÷ 3.35 | 4.78 ms | GPU step: 4.8 ms each |

GB ÷ TB/s comes out in ms. The steps below all use $t_{\text{step}} = 4.78$ ms.

### These 5 ids

The same sentence and the same tokenizer (Llama-3's) as Ch. 1 Step 2, so the same 5 ids; Ch. 2 Step 2 uses 9822 to look up `␣France`'s row. Tokenizing takes longer as the prompt grows: microseconds for 5 tokens, milliseconds for a long prompt.

### The two rhythms

- **Server:** it does not choose when clients send or how much, so its blue bars come at no fixed rhythm.
- **Scheduler:** while requests are running it laps continuously: pick a batch on the CPU (black bar), run one GPU step (orange bar, 4.78 ms), back to the top.

Both need the CPU. Whether putting them together slows one down is what step 4 tries.

### Next

Step 4: everything in one process, and how much the GPU sits idle.

## Step 4 · One process: the GPU idles 25%

> **In one line:** in one process only one thread runs Python, so all other work squeezes in between GPU steps; of the stage's 31.9 ms, the GPU is idle for 8.0.

### On the stage

- Title: one process · everything shares one Python interpreter (the GIL) and one core.
- The "the only thread" row: 16 segments end to end. Orange is a GPU step (labelled "step"); the rest by colour: purple parse JSON, blue tokenize, cyan detokenize, green write responses.
- The "GPU" row: orange while the thread is in a step, light grey otherwise; the two longer grey stretches are labelled "idle".
- A time axis at 0, 10, 20, 30 ms, and a legend for the 5 colours.
- Two dotted lines: GPU idle 25% of the time, with random gaps; a 4.8 ms step can't share its interpreter with anything that takes milliseconds.

### What the GIL is

CPython (the standard Python interpreter) has a **GIL** (global interpreter lock): within one process only one thread executes Python code at a time. More threads do not help; all the work forms one line. The scheduler waits for a step's result before doing anything else, so other work only fits between steps, and then the GPU has nothing to do.

### Formula

$$
T_{\text{busy}} = N_{\text{step}} \times t_{\text{step}},\qquad
T_1 = T_{\text{busy}} + T_{\text{idle}}
$$

$$
\text{idle share} = \frac{T_{\text{idle}}}{T_1}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $N_{\text{step}}$ | GPU steps on the stage | 5 | this step |
| $t_{\text{step}}$ | one step | 4.78 ms | step 3 |
| $T_{\text{busy}}$ | time the GPU works | | this step |
| $T_{\text{idle}}$ | all other work added up; the GPU is idle meanwhile | | this step |
| $T_1$ | length of the one-process row | | this step |

### The numbers on the stage

| Work | Count × each | Total |
|---|---|---|
| GPU step | 5 × 4.78 | 23.9 ms |
| detokenize | 4 × 0.4 | 1.6 ms |
| write responses | 4 × 0.6 | 2.4 ms |
| parse JSON | 1 × 0.3 | 0.3 ms |
| tokenize | 2.1 + 1.6 | 3.7 ms |
| $T_{\text{idle}}$ | 1.6 + 2.4 + 0.3 + 3.7 | **8.0 ms** |
| $T_1$ | 23.9 + 8.0 | **31.9 ms** |
| idle share | 8.0 ÷ 31.9 | **25%** |

The four gaps are 1.0, 3.4, 1.0 and 2.6 ms: detokenize 0.4 + write 0.6 after every step; plus a new prompt's 0.3 + 2.1 after step 2; plus a 1.6 tokenize after step 4. The client gets a token every 31.9 ÷ 5 = 6.4 ms on average instead of every 4.78 ms.

The CPU durations are sample values chosen for the stage; real ones depend on what clients send, which is why the legend calls the gaps random.

### Next

Step 5 splits the same 16 segments across three processes.

## Step 5 · Three processes: 24 ms instead of 32

> **In one line:** the same work on three processes, three interpreters and three cores leaves the scheduler lane with only its 5 steps back to back, done in 24 ms.

### On the stage

- Title: three processes · three interpreters · three cores · the same work, 24 ms instead of 32.
- Three lanes: "server + tokenizer", "scheduler + GPU", "detokenizer". Step 4's 16 segments slide into their lanes.
- The scheduler lane: 5 orange steps in one unbroken run.
- The other segments sit in the other lanes, running at the same time as the steps.
- A time axis at 0, 5, 10, 15, 20 ms.
- Legend line: the GPU lane is solid; tokenizing the next prompt and detokenizing the last step's tokens happen while the current step runs.
- Grey footnote: with tensor parallelism there is one scheduler process per GPU (chapter 24); the server and detokenizer stay single.

### Formula

$$
T_3 = N_{\text{step}} \times t_{\text{step}},\qquad
T_1 - T_3 = T_{\text{idle}}
$$

| Symbol | What it is | From |
|---|---|---|
| $T_3$ | length of the scheduler lane with three processes | this step |
| $T_1, T_{\text{idle}}, N_{\text{step}}$ | one-process total, idle time, step count | step 4 |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| the 5 steps' start times | $0, t_{\text{step}}, 2t_{\text{step}}, 3t_{\text{step}}, 4t_{\text{step}}$ | 0, 4.78, 9.55, 14.33, 19.10 ms | |
| $T_3$ | 5 × 4.78 | 23.9 ms | 24 ms |
| $T_1$ | step 4 | 31.9 ms | 32 |
| saved | 31.9 − 23.9 | 8.0 ms | exactly step 4's $T_{\text{idle}}$ |

### Where the other segments go

| Segment | Time | Lands in |
|---|---|---|
| parse JSON | 0.4–0.7 ms | step 1 |
| first tokenize | 0.9–3.0 ms | step 1 |
| step k's detokenize | starts 0.1 ms after step k ends, takes 0.4 ms | step k + 1 |
| step k's write | starts 0.7 ms after step k ends, takes 0.6 ms | step k + 1 |
| second tokenize | starts at 2 × 4.78 + 1.6 = 11.2 ms | step 3 |

### Why they can overlap

- Each process has its own interpreter and its own GIL, so they run at once on different CPU cores.
- To build step k + 1 the scheduler needs only step k's ids; turning ids into text and writing sockets are off its path.

The stage leaves out the scheduler's own CPU work between steps (step 3's black bar); that is chapter 10's subject.

### Next

Three processes have to pass things to each other. Step 6 says with what.

## Step 6 · ZeroMQ: a queue between processes

> **In one line:** process 1 drops a message in the queue and goes back to work; process 2 takes everything that has arrived only at the top of each step; neither waits for the other.

### On the stage

- Left, a blue box "server + tokenizer", process 1 · its own loop: accept → tokenize → put.
- Right, an orange box "scheduler", process 2 · its own loop: take → step → put. An orange progress bar inside: a step in progress.
- Middle, "the zmq socket · a queue" with 6 dashed slots, a "put" arrow on the left and a "take" arrow on the right.
- The animation (played once each time the step is entered):
  1. Requests 1, 2 and 3 are tokenized and put in turn; lower left reads "request N tokenized → put → back to accepting".
  2. The progress bar fills; lower right reads "step done → take all 3 at once", and the 3 blue blocks fly right.
  3. "next step: 3 newcomers in the waiting list", and 3 small blue blocks appear in the scheduler box.
- A line below: process 1 puts and moves on · process 2 takes everything at the top of its next step.
- Two dotted lines last: the same shape on every wire; a Unix socket underneath, tens of microseconds, messages waiting in the receiver's queue until it asks.

### What ZeroMQ is

ZeroMQ (zmq) is a messaging library. Two processes each hold one end of a socket: one end sends, the message queues inside the library, and the other end reads when it wants to. The sender does not wait for the receiver.

How SGLang's scheduler reads its inbox (`managers/scheduler_components/request_receiver.py`):

- It calls `sock_recv(socket, zmq.NOBLOCK)` in a loop. NOBLOCK means that on an empty queue the call returns at once (raising `zmq.Again`) instead of waiting.
- `sock_recv` is `recv_pyobj` by default: what arrives is a pickled Python object (controlled by the `SGLANG_USE_PICKLE_IPC` environment variable, on by default).
- By default there is no cap per lap (`SGLANG_SCHEDULER_MAX_RECV_PER_POLL = -1`); it takes until the queue is empty.
- This happens at the very top of each lap of the scheduler's main loop, before picking a batch and running a step.

### Formula

$$
t_{\text{wait}} < t_{\text{step}},\qquad
\text{transfer share} = \frac{t_{\text{ipc}}}{t_{\text{step}}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{wait}}$ | how long a message that arrives mid-step waits in the queue | | this step |
| $t_{\text{step}}$ | one step | 4.78 ms | step 3 |
| $t_{\text{ipc}}$ | one Unix socket transfer | tens of µs; take 50 µs | the stage's legend |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| longest wait | arrives just as a step starts, waits the whole step | under 4.78 ms |
| transfer share | 0.05 ÷ 4.78 | about 1% |

The animation is slowed about 900 times: the progress bar takes 4.4 s for a step that really takes 4.78 ms.

### Next

Step 7: what travels on each of the three processes' wires.

## Step 7 · Three wires, three queues, the request riding around the outside

> **In one line:** each wire is one zmq queue, written by one process and read by one other; the same request changes message shape at each hop and keeps its rid.

### On the stage

- Three processes around the outside of a triangle: blue process 1 top left (server + tokenizer), orange process 2 top right (scheduler), cyan process 3 at the bottom (detokenizer).
- Three queues on the inner triangle, each with two slots filled. The colour says who writes: blue 1 → 2, orange 2 → 3, cyan 3 → 1.
- Grey arrows: writing process → queue → reading process.
- Three message cards, in the order they travel:
  - Top, blue `TokenizedGenerateReqInput`: rid a1f3 · ids […]
  - Lower right, orange `BatchTokenIDOutput`: rids […] · ids [12366, …]
  - Lower left, cyan `BatchStrOutput`: rids […] · [" Paris", …]
- A line at the bottom: any transport · ipc:// here; tcp:// with data-parallel attention (chapter 26), same code.

### The three messages

All three are defined in SGLang's `managers/io_struct.py`.

| Wire | Message | Granularity | Main contents |
|---|---|---|---|
| 1 → 2 | `TokenizedGenerateReqInput` | one per request | `rid`, `input_ids` (step 3's 5 ids), `sampling_params`, `stream` |
| 2 → 3 | `BatchTokenIDOutput` | one per step, for the whole batch | a `rids` list, each rid's new ids from this step, `finished_reasons` |
| 3 → 1 | `BatchStrOutput` | one per step | the same `rids`, `output_strs` (the new pieces of text) |

This request's new id on this step is 12366, which detokenizes to `" Paris"` (Paris with a leading space).

### What the rid does

The rid is the request's name, carried in all three messages. Process 1 holds every open response stream (`TokenizerManager.rid_to_state` in the source); when a `BatchStrOutput` arrives it uses each rid to find the client connection and writes that text to it.

### ipc:// and tcp://

A queue's address is a URL.

- `ipc://`: a Unix socket file on one machine. By default SGLang makes a temporary file for each wire.
- `tcp://`: over the network. With data-parallel attention on, SGLang switches to tcp://, on one node or several (the comment in `PortArgs.init_new`).
- The sending and receiving code is the same for both; only the address changes.

### Next

Step 8: what the message becomes once it is inside process 2.

## Step 8 · Inside the scheduler it becomes a Req

> **In one line:** process 2 turns the message into a `Req` object, which waits in the waiting list, gets one prefill, then puts out one id per step, about 4.8 ms each.

### On the stage

- Title: one request, all the way through. The boxes are renamed "process 1 · server", "process 2 · scheduler", "process 3 · detokenizer"; the scheduler box has a thick orange border.
- A blue arrow labelled ids from the server to the scheduler; the other arrows are grey: scheduler → detokenizer (token ids · zmq), detokenizer → server (text · zmq), server → client.
- The GPU bar's KV pool now reads "64 GB, pages".
- In the scheduler box: waiting → **prefill** → running → **decode**; below it 7 small squares, the first blue and the next 6 orange, flying in one by one; to their right "→ one id out, every 4.8 ms".
- The bottom line: `Req` · rid · input ids · output ids · pages · sampling.
- In the detokenizer box: 12366 → " Paris" · 13 → ".".

### The Req's fields

`Req` is the scheduler's object for one request (SGLang `managers/schedule_batch.py`).

| On the stage | Source field | What it is | From |
|---|---|---|---|
| rid | `rid` | the request's name | step 7 |
| input ids | `origin_input_ids` | the prompt's 5 ids | step 3 |
| output ids | `output_ids` | ids generated so far, one more per step | Ch. 1 Step 4 |
| pages | `req_pool_idx` | its row in `req_to_token_pool`, which records where each position's k and v sit in the KV pool | Ch. 7 Step 4 |
| sampling | `sampling_params` | temperature and the other parameters for picking a token | Ch. 1 Step 4 |

The first pages may point straight at a shared prefix another request already computed (Ch. 8 Step 2).

### The row of squares

- First it waits in the waiting list until the scheduler picks it (Ch. 6 Step 2).
- Blue: one prefill over the 5 prompt tokens.
- Orange: decode steps, one id each.

### The numbers on the stage

| Square | Tokens | Time |
|---|---|---|
| prefill | 5 | about $t_{\text{step}}$: 5 is far below Ch. 4 Step 8's ~300-token balance point, so it still costs one weight read |
| decode | 1 | $t_{\text{step}} = 4.78$ ms (step 3) |

So each square is about 4.8 ms, the tag's "one id out, every 4.8 ms". This assumes the batch's total tokens also stay under ~300; how the batch is built is chapter 6.

### After it finishes

The Req leaves the running list when it produces an end token or hits its length limit. Its pages are not wiped right away: SGLang has prefix caching on by default, so they stay in the cache for a later request that starts the same way, and are evicted least-recently-used first only when room runs out (Ch. 7 Step 5's footnote, Ch. 8 Step 7).

### Next

Step 9: how the new ids get back to the client.

## Step 9 · The way back: ids → text → events

> **In one line:** after each step the new ids go to the detokenizer and become text, return to the server, find their connection by rid, and go to the client as one server-sent event; two events are one step apart, 4.8 ms.

### On the stage

- The server box (thick blue border) and the detokenizer box (thick cyan border) are highlighted.
- Cyan arrows: scheduler → detokenizer (token ids · zmq), detokenizer → server (text · zmq).
- A green arrow: server → client.
- Two lines in a green box, lower left:
  - `data: {"choices":[{"delta":{"content":" Paris"}}]}`
  - `data: {"choices":[{"delta":{"content":"."}}]}`
- To its right: ← one server-sent event per token, 4.8 ms apart.

### Each hop on the way back

| Hop | Message | Contents |
|---|---|---|
| process 2 → process 3 | `BatchTokenIDOutput` | new ids such as 12366 and 13 |
| inside process 3 | | `12366 → " Paris"`, `13 → "."` |
| process 3 → process 1 | `BatchStrOutput` | text pieces, with their rids |
| process 1 → client | server-sent event | one line of JSON starting `data:` |

**Server-sent events (SSE):** the server keeps one HTTP response open and writes one `data: …` line at a time; the client handles each line as it arrives. The new text goes in `choices[0].delta.content`, the OpenAI streaming format. This is what step 2's `stream: true` asked for.

### Formula

$$
\Delta t_{\text{event}} = t_{\text{step}},\qquad
\text{lag} = 0.7 + 0.6\ \text{ms}
$$

| Symbol | What it is | From |
|---|---|---|
| $\Delta t_{\text{event}}$ | the gap between two events | this step |
| $t_{\text{step}}$ | one step, 4.78 ms | step 3 |
| 0.7, 0.6 | when the write starts after a step ends, and how long it takes | step 5 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| gap between events | one per step | 4.78 ms, 4.8 ms on the stage |
| how far each trails its step | 0.7 + 0.6 | written within 1.3 ms of the step ending, while the next step runs |

### The whole chain

string (step 2) → ids (step 3) → `TokenizedGenerateReqInput` (step 7) → `Req` (step 8) → new ids → text → event.

### Next

Which requests go into each step's batch is Ch. 6 Step 9's loop. What else process 2 does to put out one id every 4.8 ms, besides picking the batch and running the GPU, is chapter 10.
