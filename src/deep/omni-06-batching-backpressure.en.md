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
