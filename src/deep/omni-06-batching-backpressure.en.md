## Step 1 · Collection delay postpones compute

> **In one sentence:** Zero delay collects the ready A and B now; a five-ms attempt to fill the batch postpones them without adding C, which arrives at six ms.

### What the picture shows

- Both panels use the same input: four scheduling-batch slots, A and B queued at 0 ms, and C arriving at 6 ms.
- The left or upper panel sets `max_batch_wait_ms=0`. The scheduler takes the available A and B, leaves two slots empty, and starts compute at 0 ms.
- The right or lower panel uses a teaching budget of five ms. The scheduler waits for more work, still has only A and B at the deadline, and starts compute at 5 ms.
- Blue marks queued work that can run. Orange marks the extra collection wait. C's mark at six ms misses both collections.
- The timelines omit GPU compute, an earlier running batch, network transfer and other queues. Only the collection budget changes.

### Work through the numbers

Let $W=5\,\mathrm{ms}$ be the active collection budget and $W_0=0\,\mathrm{ms}$ the zero-delay budget. With every other duration omitted, the extra delay before A and B start is:

$$\Delta t=W-W_0=5-0=5\,\mathrm{ms}$$

The batch cap is $B=4$ and the ready-request count is $N=2$, so the empty-slot count is:

$$E=B-N=4-2=2$$

| Symbol | Meaning | Source |
|---|---|---|
| $W$ | Active collection budget in the comparison panel | Teaching construction of five ms |
| $W_0$ | Collection budget in the zero-delay panel | 0 ms |
| $\Delta t$ | Start-time difference caused by collection in this example | Five ms minus zero ms |
| $B$ | Capacity of one scheduling collection | Four constructed slots |
| $N$ | Requests present when collection starts | Requests A and B |
| $E$ | Slots without a request | Four slots minus two requests |

These values describe only the constructed timelines. Five ms is not a measured latency, and $B=4$ is not a claimed model default. Real completion time also includes compute and other waiting.

### What zero delay removes

`SimpleScheduler.collect_batch()` starts with the first message. When a `batch_compute_fn` exists and the cap exceeds one, it calls `get_nowait()` for more available messages. An empty queue and a zero budget end collection immediately. A cap of four therefore does not require four requests.

With `batch_wait_when_idle=true`, the first message establishes a collection deadline. If the queue is empty, the code performs a blocking `get(timeout=remaining)` for the remaining budget. No request arrives within five ms in this example, so the wait postpones A and B without making the batch larger.

### Boundaries and sources

This step covers one-shot `new_request` collection in `SimpleScheduler`; it does not describe an AR running batch. With `batch_wait_when_idle=false`, the first message does not establish an idle deadline. Collection can start a deadline after a second message arrives. The figure also omits the `max_batch_cost` path, which leaves a message for later when its cost would exceed the budget.

- `sglang_omni/scheduling/simple_scheduler.py:45-80`: constructor arguments for `batch_compute_fn`, `max_batch_size`, `max_batch_wait_ms` and `batch_wait_when_idle`.
- `sglang_omni/scheduling/simple_scheduler.py:148-197`: first-item collection, the size cap, remaining-budget waits and zero-delay exit.
- `sglang_omni/scheduling/simple_scheduler.py:248-280`: one call to `batch_fn`, followed by per-message results in collection order.

Line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

Step 2 switches to autoregressive generation. A request stays in the running batch across many compute rounds, and a waiting request can take a row when another request finishes.

## Step 2 · A running batch keeps requests across rounds

> **In one sentence:** A and B stay together while unfinished; after A finishes, C can take its row when both request capacity and token memory permit.

### What the picture shows

- This example sets `max_running_requests` to two so that a refill is visible. In round 1, `running_batch` contains A and B while `waiting_queue` contains C.
- A and B each produce another token. Unfinished requests continue into later rounds. The example finishes A after round 1 and keeps B unfinished.
- Round 2 retains B and moves C from the waiting queue into A's row. The two blue requests advance together again.
- Blue marks a running row, orange a waiting request and grey a finished request. C changes from orange to blue because its scheduling set changes.
- The bottom label separates responsibilities. `generation_batch_policy.py` builds and validates configuration; `OmniScheduler` owns the queues and scheduling loop.

### Work through the numbers

Let the request-row cap be $R=2$. Round 1 has $U_1=2$ running requests, leaving:

$$F_1=R-U_1=2-2=0$$

After A finishes and before C joins, the running count is $U_2=1$:

$$F_2=R-U_2=2-1=1$$

| Symbol | Meaning | Source |
|---|---|---|
| $R$ | Request-row cap of the running batch | Two constructed teaching rows |
| $U_1$ | Running requests in round 1 | Requests A and B |
| $F_1$ | Free rows available to C in round 1 | Two minus two, giving zero |
| $U_2$ | Running requests after A finishes | Only B remains |
| $F_2$ | Free rows after A finishes | Two minus one, giving one |

$F_2=1$ removes only the request-row obstacle. Admission also checks token/KV capacity and other scheduling conditions. The figure therefore says that C joins if memory allows; a free row alone is insufficient.

### How this differs from one-shot collection

Step 1's `SimpleScheduler` invokes `batch_fn` once for a collection and returns each result. An AR request advances through many prefill/decode rounds. `OmniScheduler` consequently retains both `waiting_queue` and `running_batch`, then checks whether each pass can admit a prefill.

This pattern is continuous batching: unfinished requests remain in the running set, completed requests release rows, and waiting requests refill them. Continuous describes the scheduling set across rounds. It does not promise a busy GPU at every instant or one GPU kernel per request.

### The policy helper does not run the queue

`build_generation_batch_overrides()` normalizes `max_running_requests`. Unless explicitly overridden, `cuda_graph_max_bs` and `torch_compile_max_bs` inherit it, and the helper constructs the CUDA Graph batch ladder. `validate_generation_batch_policy()` checks positive limits and whether graph and model-buffer capacities cover the running cap.

These helpers create and validate `ServerArgs`. They contain no `waiting_queue.append`, `running_batch.reqs` or round-by-round scheduling loop. MiniCPM-o's talker factory currently passes a running cap of 32 and sets `max_total_tokens = 32 * max_seq_len`; the figure's two rows do not depict that default.

### Boundaries and sources

This step covers normal completion and refill. It omits priority, preemption, session row reuse, chunked prefill and optional prefill coalescing. The current `OmniScheduler` has configurable prefill waiting windows, so this figure does not claim that AR never waits deliberately.

- `sglang_omni/scheduling/omni_scheduler.py:566-617`: read the running cap from the model runner and initialize `waiting_queue` and `running_batch`.
- `sglang_omni/scheduling/omni_scheduler.py:2764-2805`: test whether the running batch admits prefill and whether requests remain allocatable.
- `sglang_omni/scheduling/generation_batch_policy.py:229-290`: construct running, CUDA Graph and torch.compile batch settings; `363-461`: validate those limits.
- `sglang_omni/models/minicpm_o/stages.py:251-307`: MiniCPM-o talker's default running cap of 32 and policy validation.

Line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

Step 3 returns to one-shot work. `ReferenceEncodeService` drains only requests already in its queue, and a larger cap enables batching only when the hook supports it.

## Step 3 · An encoder collects only ready requests

> **In one sentence:** With a sufficient cap and a batch-capable hook, A, B and C share one call; D is not queued yet, so this call neither waits for nor includes it.

### What the picture shows

- The shipped defaults are `max_batch_size=1` and `max_batch_wait_ms=0`, so the default service encodes one request at a time. The teaching view raises the cap to four and assumes `hook.can_encode_batch()` is true.
- Before collection, `batch_queue` contains A, B and C. The orange queue box is the arrival side; the blue box is the actual encoding call.
- `get_nowait()` takes the three available requests. The queue is then empty, and the zero-delay budget ends collection with the fourth slot unused.
- One `encode_batch([A, B, C])` call produces three outcomes, which the service returns to their respective requests. D arrives after collection and belongs to the next one.
- There is no running batch. Each reference encoding receives its complete result from this call rather than remaining in a scheduling set across AR decode rounds.

### Work through the numbers

Let the teaching cap be $B=4$ and the ready-request count be $N=3$. This batch takes:

$$K=\min(B,N)=\min(4,3)=3$$

The unused-slot count is:

$$E=B-K=4-3=1$$

| Symbol | Meaning | Source |
|---|---|---|
| $B$ | Request cap for one encoding collection | Teaching construction of four |
| $N$ | Requests in the queue at collection time | A, B and C |
| $K$ | Requests encoded by this call | Minimum of cap and ready count |
| $E$ | Unused positions in this batch | Four slots minus three requests |

With the shipped cap $B_0=1$, three ready requests need three collections and three encode calls. A larger cap is only one requirement; when the hook has no batch support, the service retains its single-request path.

### Default path and optional batching

The `ReferenceEncodeService` constructor defaults to a cap of one and zero collection delay. It creates the batch function and `queue.Queue` only when `max_batch_size > 1` and `hook.can_encode_batch()` returns true. Otherwise it retains the original per-request `encode()` path.

The batch worker blocks on `get()` for its first message. With no work present, this wait does not postpone an existing request to find it companions. After that first message, the code uses `get_nowait()` up to the remaining capacity. Only a positive delay budget can add a deadline wait when the queue is temporarily empty. This step keeps the budget at zero, so only the three ready requests enter.

The compute call returns `list[ArtifactT | BaseException]`. The worker writes each artifact or exception into that request's own `Future`. If the batch hook raises an ordinary exception, `encode_batch()` also falls back to per-item encoding, so one failure need not fail its peers.

### Boundaries and sources

This step does not claim that a MiniCPM-o model enables reference-encoding batches by default, and four is not a recommendation. It explains the optional mechanism in the current service. Cancellation, hook-level concurrency and operator padding are outside the figure.

- `sglang_omni/scheduling/reference_encoder.py:139-196`: default cap, zero delay, hook capability check and batch queue/worker creation.
- `sglang_omni/scheduling/reference_encoder.py:231-290`: first-item wait, non-blocking collection, optional remaining-time wait, one batch call and per-request `Future` results.
- `sglang_omni/scheduling/reference_encoder.py:317-342`: call the batch hook and fall back to per-item encoding after an ordinary exception.

Line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

Step 4 adds a mel-frame cost to each request. A request can wait for the next batch even when the request-count cap has room, if admitting it would exceed the cost budget.

## Step 4 · The frame budget can fill before the request count

> **In one sentence:** A and B cost 21,000 frames and C would raise the total to 27,000; three requests fit the count cap of eight, but C still waits for the next batch.

### What the picture shows

- The top line shows MiniCPM-o `audio_encoder`'s real configuration: at most eight requests, zero deliberate collection delay and at most 24,000 charged mel frames per batch.
- A mel frame is one small column of sound features. This budget limits the batch's accounted work rather than merely counting requests.
- The teaching example charges A for five full windows and B and C for two each. At 3,000 frames per full window, their costs are 15,000, 6,000 and 6,000.
- The left panel collects A and B for 21,000 frames, leaving 3,000. The right panel tries C, reaching 27,000 and crossing the dashed 24,000-frame limit.
- The scheduler returns C to the head of `pending_messages` and ends this collection. Both the request-count and frame-cost limits must pass.

### Work through the numbers

Let a full window's charged frames be $F=3000$. A, B and C contain five, two and two charged windows:

$$C_A=5F=15000,\qquad C_B=2F=6000,\qquad C_C=2F=6000$$

Collecting only A and B gives:

$$C_{AB}=C_A+C_B=15000+6000=21000\leq24000$$

Adding C would give:

$$C_{ABC}=C_{AB}+C_C=21000+6000=27000>24000$$

The overflow is:

$$O=C_{ABC}-24000=27000-24000=3000$$

| Symbol | Meaning | Source |
|---|---|---|
| $F$ | Charged frames in one full audio window | 3,000 frames in the current configuration comment |
| $C_A,C_B,C_C$ | Scheduling costs of the three teaching requests | Five, two and two full windows times 3,000 |
| $C_{AB}$ | Combined cost of A and B | 15,000 plus 6,000 |
| $C_{ABC}$ | Hypothetical cost of all three | 21,000 plus 6,000 |
| $O$ | Frames by which three would exceed the budget | 27,000 minus 24,000 |

The five, two and two windows are teaching values. The real budget equals $8\times3000=24000$ full-window frames. This does not mean every eight short requests fill it, or that frame count is strictly proportional to latency.

### Where the cost comes from

`request_mel_frame_cost()` builds the encoder request. A request that skips encoding costs zero; every other request is charged its window count times the maximum window frames. Charging full windows deliberately bounds work after cross-request padding instead of summing only valid sound lengths.

`create_encoder_executor()` passes this function to `SimpleScheduler` as `request_cost_fn` and passes `max_batch_mel_frames` as `max_batch_cost`. During actual batch compute, inputs of different lengths are padded to the batch's largest frame count before one encoder call.

The collection loop checks both `len(batch) < max_batch_size` and `batch_cost + msg_cost <= max_batch_cost`. When count passes but cost fails, `appendleft()` retains the next item in pending. The scheduler does not skip it to search for a smaller later request.

### Boundaries and sources

The first message enters the batch before later messages undergo the overflow check. A single request whose own cost exceeds the budget can therefore run alone rather than becoming stuck forever. The figure omits that branch, and the cost budget is not an exact memory or FLOP measurement.

- `sglang_omni/models/minicpm_o/config.py:57-70`: current audio-encoder cap of eight, zero delay and 24,000-frame budget.
- `sglang_omni/models/minicpm_o/stages.py:166-202`: full-window cost function and its connection to `SimpleScheduler`.
- `sglang_omni/scheduling/simple_scheduler.py:148-197`: count and cost caps, with `appendleft()` and collection exit on overflow.
- `sglang_omni/models/minicpm_o/audio_encoder_batching.py:85-112`: cross-request padding and one batched encoder call.

Line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

Step 5 contrasts Code2Wav's one-shot batch with streaming-vocoder coalescing across requests. Both can compute work for multiple requests together, but their message paths differ.
