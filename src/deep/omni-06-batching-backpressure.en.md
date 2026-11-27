## Step 1 · Collection delay postpones compute

> **In one sentence:** Zero delay collects the ready A and B now; a five-ms attempt to fill the batch postpones them without adding C, which arrives at six ms.

### What the picture shows

- Both panels use the same input: four scheduling-batch slots, A and B queued at 0 ms, and C arriving at 6 ms.
- The left or upper panel sets `max_batch_wait_ms=0`. The scheduler takes the available A and B, leaves two slots empty, and starts compute at 0 ms.
- The right or lower panel uses a teaching budget of five ms. The scheduler waits for more work, still has only A and B at the deadline, and starts compute at 5 ms.
- The animation starts A and B in the zero-delay panel, moves the other cursor to its five-ms deadline, starts that batch, then lets C arrive at six ms and miss both collections.
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
- Both panels start at the same origin and use one 27,000-frame scale. Their dashed 24,000-frame limits sit at the same position, so identical A and B segments have identical widths.
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
- <code>sglang_omni/models/minicpm_o/<wbr>audio_encoder_batching.py:85-112</code>: cross-request padding and one batched encoder call.

Line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

Step 5 contrasts Code2Wav's one-shot batch with streaming-vocoder coalescing across requests. Both can compute work for multiple requests together, but their message paths differ.

## Step 5 · One-shot batching and streaming coalescing take different paths

> **In one sentence:** MiniCPM-o Code2Wav collects whole requests for one batch call; the optional streaming-vocoder path stores chunks in request-local states before advancing ready requests together.

### What the picture shows

- The left panel is the current MiniCPM-o `code2wav` factory: cap 16, zero collection delay and `batch_wait_when_idle=false`. Its inputs are two complete `new_request` messages.
- `SimpleScheduler.collect_batch()` gathers the available requests and invokes `vocode_and_release([A, B])`. A and B still receive separate results.
- The right panel is optional cross-request coalescing in `StreamingVocoderBase`. Its inputs are arriving `stream_chunk` messages; this example assumes both A and B satisfy their subclass's readiness rule.
- The right path ingests each chunk into its own stream state, selects participants, builds a plan and invokes `run_step([A, B])` once. Returned waveforms remain keyed by request id.
- Orange marks shared compute in both panels, but their inputs, states and functions differ. The right panel's `run_step()` does not belong in MiniCPM-o's left-hand factory.

### Work through the numbers

Let the input request count be $N=2$ and shared compute calls in this example be $S=1$. Both paths produce $N=2$ distinct outputs:

$$N=2,\qquad S=1,\qquad \text{outputs}=N=2$$

Without a shared scheduling call, two requests would need two calls. This example reduces the call count from $N=2$ to $S=1$:

$$N-S=2-1=1$$

| Symbol | Meaning | Source |
|---|---|---|
| $N$ | Requests in this example | A and B |
| $S$ | One shared computation | One batch call on the left or one `run_step` on the right |
| outputs | Outputs that retain request identity | One each for A and B |
| $N-S$ | One fewer scheduling call than two independent calls | Two minus one |

$N-S=1$ counts calls only. It does not halve latency or prove doubled throughput. Shared-kernel work, padding, stream readiness and hardware all affect the result.

### The whole-request path on the left

`create_code2wav_executor()` returns a `SimpleScheduler`. It supplies `vocode_and_release` for both single and batched execution, together with request caps, delay settings and optional codec-token cost. The current model configuration uses zero delay, so this path collects available complete requests without deliberately waiting to fill empty slots.

`vocode_and_release()` calls `vocode_code2wav_payloads()` and releases each request's reference in `finally`. Batch execution and resource release here are not the right panel's streaming state machine.

### The streaming-coalescing path on the right

`StreamingVocoderBase` does not guarantee cross-request coalescing by default. A subclass opts into `can_batch_stream_chunks` and implements participant, plan and `run_step` hooks. DotsTTS is one subclass that explicitly enables the switch.

After opt-in, `on_stream_chunk_batch()` ingests every chunk under `state_lock` before pumping. `pump_one_step()` selects this round's participants, builds a plan and invokes `run_step()` once, then emits each returned waveform to its request. With no ready participant, no step runs.

This example assumes A and B are ready together. A real system may have only A ready, or a stream may emit no waveform in a step. Receiving two chunks is not proof that both requests enter the same computation.

### Boundaries and sources

If a shared step raises, the default `on_step_failure()` emits an error and clears state for every participant; external abort cleanup runs after the lock is released. The left path's batch result and error handling cannot be copied onto this streaming path.

- `sglang_omni/models/minicpm_o/config.py:144-176`: MiniCPM-o Code2Wav's cap of 16, zero delay and idle=false.
- `sglang_omni/models/minicpm_o/stages.py:397-465`: Code2Wav's `SimpleScheduler`, batch call and per-request reference release.
- `sglang_omni/scheduling/streaming_vocoder.py:347-369`: ingest all chunks, pump under the lock and run abort cleanup outside it.
- `sglang_omni/scheduling/streaming_vocoder.py:776-796`: select participants, run one step and emit waveforms by request id.
- `sglang_omni/models/dots_tts/vocoder.py:166-222`: an actual subclass that enables cross-request streaming coalescing.

Line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

Step 6 adds historical H200 measurements. Batching can improve throughput, but those results belong to their code, model and test conditions rather than a universal promise about current main.

## Step 6 · A historical win has a limited scope

> **In one sentence:** In that H200 comparison of 200 requests, client concurrency 16 and zero delay, FIFO B8 delivered about 37.9% more throughput than B1; this promises nothing universal about current main or other workloads.

### What the picture shows

- This step quotes the historical article and PR #2271; it does not rerun the model locally. Throughput means completed requests per second, so a taller bar completes more work in the same second.
- The two bars change only FIFO's Code2Wav collection cap: B1 reaches 4.100 requests/s and B8 reaches 5.652. Here B names a batch cap, not request B from earlier steps.
- The experiment used one H200, the first 200 SeedTTS EN requests, client concurrency 16 and zero deliberate delay. It excluded 50 warmup requests per launch, repeated mixed-reference configurations three times, pinned CPU cores and checked contention.
- The scope card limits the result to this old code and workload. It does not call B8 optimal for every GPU, request distribution or current main.
- Historical Code2Wav used a cap of eight; the chapter's pinned current-main configuration uses 16 and a changed implementation. These values cannot form a new performance comparison.

### Work through the numbers

Let B1 throughput be $T_1=4.100\,\mathrm{requests/s}$ and B8 throughput be $T_8=5.652\,\mathrm{requests/s}$. The additional completed requests per second are:

$$\Delta T=T_8-T_1=5.652-4.100=1.552\,\mathrm{requests/s}$$

The improvement relative to B1 is:

$$G=\frac{T_8-T_1}{T_1}\times100\%=\frac{5.652-4.100}{4.100}\times100\%\approx37.9\%$$

| Symbol | Meaning | Source |
|---|---|---|
| $T_1$ | Historical FIFO B1 average throughput | 4.100 requests/s in the H200 comparison |
| $T_8$ | Historical FIFO B8 average throughput | 5.652 requests/s in the same comparison |
| $\Delta T$ | Additional requests completed each second | 5.652 minus 4.100, giving 1.552 |
| $G$ | B8 throughput improvement over B1 | Difference divided by B1, about 37.9% |

The 37.9% baseline is explicitly FIFO B1 in the same table, not reference-aware, A800 or current main. Values from different tables and experiment rounds cannot share a denominator.

### Why the conditions still matter

Client concurrency 16 does not keep 16 requests in Code2Wav's queue. Requests may be in the network, preprocessing, Thinker or Talker. Available work arriving at this stage determines the actual batch. A scheduling cap of eight also does not prove one eight-request GPU kernel; the historical implementation regrouped by reference and other conditions.

Zero deliberate delay removes only the window spent waiting for more arrivals. Waiting for an earlier batch, serial groups, whole-batch return and insufficient upstream supply can remain. B8's win is therefore a measurement, not a theorem deduced from zero delay.

The historical record also describes a different A800 observation. The article says hardware, host and procedure were not fully aligned, so the card name alone cannot explain the difference. This step does not place those unlike environments on one axis.

### Boundaries and sources

This step does not rerun the experiment or evaluate historical reference-aware and early-emit alternatives. Current-main `code2wav` already has a cap of 16; the old reference grouping and return paths cannot be conflated with current code. A current configuration decision needs current code, the target workload and a controlled environment.

- `Awesome-ML-SYS-Tutorial/sglang/sglang-omni/batch.md:5-16`: opening FIFO B1/B8 values and the H200, request-count, concurrency, delay, warmup and repeat conditions.
- `Awesome-ML-SYS-Tutorial/sglang/sglang-omni/batch.md:27-35`: distinctions among client concurrency, scheduling batch, internal compute batch and zero delay.
- `Awesome-ML-SYS-Tutorial/sglang/sglang-omni/batch.md:119-139`: samples, CPU controls, log interpretation and call-count boundary.
- `Awesome-ML-SYS-Tutorial/sglang/sglang-omni/batch.md:143-164`: independent conditions for another batch-size round and why no universal optimum follows.
- Historical experiment code: `89e60d0bf216bacd0e072d79f969550469614662`; discussion: PR #2271.
- Current-main contrast: `sglang_omni/models/minicpm_o/config.py:144-176`, with cap 16.

Current-main line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

Step 7 moves from computing more to rejecting when full. Router, worker and coordinator each have capacity boundaries, and backpressure makes waiting or failure explicit to the client.

## Step 7 · Two admission boundaries return different errors

> **In one sentence:** Two active requests fill the teaching capacity, so C receives HTTP 429 from router admission or HTTP 503 at the coordinator's pipeline entrance.

### What the picture shows

- Backpressure here means a capacity boundary tells its caller that it is full instead of accepting unlimited new requests. The panels are independent examples; one C does not receive 429 and then 503.
- The left panel sets both router global and per-service permits to the teaching value two. A and B remain active, leaving no permit. C's non-blocking acquisition fails, producing `RouterOverloaded` and HTTP 429 without worker dispatch.
- The right panel sets coordinator `max_in_flight` to two. A and B count toward admission. C's `submit_request()` raises `QueueFullError` before pipeline submit, and the OpenAI error mapping returns HTTP 503.
- Blue marks active requests and orange marks rejected C in both panels. The errors come from different boundaries, so 429 and 503 are not interchangeable labels.
- Router permits and the worker-load guard remain held until response EOF, upstream error or downstream cancellation. Sending response headers does not release them early. The coordinator sums only requests whose `counts_toward_admission` is true.

### Work through the numbers

Let the teaching admission cap be $L=2$, active request count be $U=2$ and new request count be $N=1$. Remaining permits are:

$$F=L-U=2-2=0$$

Accepting C would produce:

$$U+N=2+1=3>L=2$$

| Symbol | Meaning | Source |
|---|---|---|
| $L$ | Teaching admission cap in each panel | Constructed value two, not a deployment default |
| $U$ | Requests currently occupying capacity | A and B |
| $N$ | New arrivals in this example | C alone |
| $F$ | Permits left before the new arrival | Cap two minus two active requests |
| $U+N$ | Occupancy after hypothetically accepting C | Two plus one gives three, above the cap |

$F=0$ explains this rejection; it does not recommend a production cap of two. Router service classes can use weighted credits, and coordinator `max_in_flight` can remain unset. Those branches are outside this figure.

### Fail-fast router admission

`AdmissionController.try_admit_envelope()` uses `try_acquire_owned()` for a global permit, and `try_admit_class()` acquires the service-class permit. With none available, the controller returns `AdmissionError::Overloaded`; the HTTP error table maps `RouterOverloaded` to 429. This is immediate failure, not a router queue waiting for a permit.

After admission, `RequestLease` owns admission, optional worker capacity and the worker-load guard. `DirectResponseBody` retains that lease and releases it on completion, upstream error or body drop. A streaming response therefore occupies its permit until the response actually terminates.

### The coordinator's pipeline-entry check

Before constructing pipeline input, `submit_request()` sums existing requests with `counts_toward_admission`. If that sum already meets or exceeds `max_in_flight`, and this request does not explicitly bypass admission, the method raises `QueueFullError`. With $U=2$, C never enters the pipeline.

`generation_error_status_code()` recognizes `QueueFullError` and returns 503. This status comes from a worker-internal capacity boundary; the left panel's 429 comes from the Rust router. Other stages can reject for their own capacity reasons, but this step shows only the two verified paths.

### Boundaries and sources

The teaching caps are not configuration recommendations or measured capacities. Worker selection separately checks health, compatibility and session capacity. The coordinator also has request-id reservation, sessions and stage-level rejection. This step omits those branches.

The coordinator has a separate, easily confused rule for its optional `stream_queue`: a supplied queue must be unbounded so one full request queue cannot stall the shared completion loop. Request-count admission still applies, and this rule does not give every response path an unbounded application queue. Step 8 concerns only the Rust router's direct response body.

- `docs/basic_usage/omni_router.md:240-251`: fail-fast admission, permits held through response termination and worker ownership of execution and queue capacity.
- `sglang_omni_router/src/worker_pool/admission.rs:143-188`: non-blocking global and class permit acquisition and `Overloaded` when none remain.
- `sglang_omni_router/src/worker_pool/admission.rs:49-103`: the worker-load guard and `RequestLease` ownership.
- `sglang_omni_router/src/error.rs:181-199`: `RouterOverloaded` to HTTP 429.
- `sglang_omni/pipeline/coordinator.py:560-601`: the pre-submit `max_in_flight` check and `QueueFullError`.
- `sglang_omni/serve/openai_errors.py:104-111`: `QueueFullError` to HTTP 503.
- `sglang_omni/admission.py:9-32`: the queue-full error and its text matching across IPC.

Line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

Step 8 follows an accepted response. The router's `DirectResponseBody` lets downstream consumers pull frames without adding a body pump or application queue.

## Step 8 · Downstream consumers pull response frames

> **In one sentence:** While the body is active, each downstream `poll_frame()` makes the router's response adapter poll upstream once, returning at most one frame without adding an application queue.

### What the picture shows

- Read `poll_frame()` as “ask for the next frame.” Orange arrows point from client to router and then worker as read demand travels upstream. Blue arrows carry response data in the opposite direction.
- The teaching example has three frames. Frame one has reached the client, while two remain upstream. These are HTTP body data frames, not the mel audio frames from Step 4.
- `DirectResponseBody` wraps the worker's `reqwest::Body` inside the downstream `axum::Body`. It retains the request lease from Step 7 but starts no extra body pump, application queue or relay task.
- When downstream polls the router, the adapter directly polls its inner body. The result can be `Pending`, one data frame, EOF or an error; this loop does not gather several frames per invocation.
- If downstream is not polling, this adapter does not poll its inner body by itself. Read demand travels back toward the upstream producer, providing response backpressure.

### Work through the numbers

Let downstream poll count be $P=1$. This adapter makes the same number of upstream polls, $P=1$. Returned data-frame count $F$ satisfies:

$$P=1\quad\Longrightarrow\quad 0\leq F\leq1$$

Let $Q$ denote application queues owned by this adapter:

$$Q=0$$

The teaching example has total frame count $T=3$ and delivered count $D=1$, leaving upstream count $U$:

$$U=T-D=3-1=2$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | One downstream poll in this example | One constructed invocation |
| $F$ | Data frames returned by that poll | Zero for `Pending`, one for a ready data frame |
| $Q$ | Application queues added by this response adapter | Zero in the direct-body structure |
| $T$ | Total data frames in the teaching example | Three constructed frames |
| $D$ | Frames delivered downstream | Frame one in the figure |
| $U$ | Frames still upstream | Three minus one gives two |

$Q=0$ describes this adapter's structure. It is not a latency measurement or a claim that the whole network stack has no buffering. $0\leq F\leq1$ constrains one `poll_frame()` invocation, not the full response length.

### How the code forwards a poll

After receiving the upstream response, the router preserves its status and sanitized headers. It calls `DirectResponseBody::new(body, lease, metrics)` and constructs a downstream `Response<axum::Body>`. No separate task first reads the entire response into memory.

While active, `DirectResponseBody.poll_frame()` invokes `Pin::new(inner).poll_frame(cx)` once. Inner `Pending` becomes outer `Pending`; one inner data frame becomes one downstream frame. EOF and upstream errors enter terminal handling.

Terminal handling drops both the inner body and request lease. Normal EOF, upstream error and downstream cancellation therefore release Step 7's admission resources and record the corresponding body termination.

### Backpressure does not remove every buffer

The HTTP framework, TCP sockets, operating system and worker internals can still buffer data. This step establishes only that the router response adapter adds no body pump, application queue or relay task. $Q=0$ does not mean system-wide zero-copy or immediate worker suspension.

This path also does not describe classified uploads. Requests requiring body-owned routing facts use a separate bounded buffering budget. The coordinator `stream_queue` from Step 7 belongs to another layer. This figure covers only Rust router response-body relay.

### Boundaries and sources

Three frames illustrate call flow; they are not throughput measurements. A poll need not return data: `Pending` is normal when upstream is not ready. This adapter treats trailers as an upstream protocol error. HTTP runtime and network behavior determine the actual waiting and propagation granularity.

- `docs/basic_usage/omni_router.md:240-251`: permit lifetime and direct request/response backpressure without a body pump, application queue or extra relay task.
- `sglang_omni_router/src/http_relay/mod.rs:219-233`: wrap the upstream body in `DirectResponseBody` and construct the downstream response.
- `sglang_omni_router/src/http_relay/response_body.rs:16-35`: inner body, request lease and terminal state owned by the adapter.
- `sglang_omni_router/src/http_relay/response_body.rs:38-72`: release the inner body and lease during termination and drop.
- `sglang_omni_router/src/http_relay/response_body.rs:75-101`: one inner poll per downstream poll, with data, `Pending`, EOF and error branches.

Line numbers refer to `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`.

### Next

The chapter connects two capacity controls. Router or worker boundaries bound new admissions, while downstream consumers pull accepted HTTP responses frame by frame. A deployment still needs target-workload measurements for each capacity and separate monitoring of 429, 503, response termination and worker queues.
