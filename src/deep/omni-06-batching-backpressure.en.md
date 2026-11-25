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
