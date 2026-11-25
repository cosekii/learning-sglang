## Step 1 · A request keeps its chosen replica

> **In one sentence:** Two `talker_ar` replicas take turns from copy 0 as A, B and C arrive, selecting copies 0, 1 and 0; A's work stays in copy 0, so its next send follows the saved binding to find it.

### What the picture shows

- Chapter 2 Step 1 already copied `talker_ar` into two replicas. This step draws only that one replicated process so separate process counters cannot be confused.
- Arrows show which copy receives each request. A, B and C name three requests arriving in that order. **The coordinator assigns each arriving request a copy**. It alternates copies 0 and 1, starting with copy 0. A uses copy 0, B uses copy 1, and C returns to copy 0.
- A **binding** is the copy choice saved for one request. `A → talker_ar: 0` means request A uses replica 0 of `talker_ar`; indices start at zero.
- The bottom panels compare two destinations in the same layout. A's half-finished work remains in copy 0. Following the binding finds that work; switching to copy 1 would not find A's record there. This step does not expand the resulting error or recovery behavior.

### Formula

Give A, B and C arrival indices $i=0,1,2$. With $N=2$ replicas, the selected replica index is:

$$r_i=i\bmod N$$

| Symbol | Meaning | Source |
|---|---|---|
| $i$ | Zero-based arrival index | This step's constructed A, B, C order |
| $N$ | Replica count for this process | This step's constructed two copies |
| $r_i$ | Replica index bound to the request | Remainder from the default round-robin policy |

### The numbers on the stage

$$r_0=0\bmod2=0,\qquad r_1=1\bmod2=1,\qquad r_2=2\bmod2=0$$

The three `talker_ar` bindings are therefore 0, 1 and 0. These values follow from the teaching example and source rule; they are not traffic measurements.

### How the source saves and uses a binding

At admission, the coordinator calls `assign_replica_bindings`. The default policy keeps one counter per replicated process, starts at zero, increments it for each selection, and takes the remainder modulo the replica count. When a process contains several stages, that one choice is projected onto every member stage. Separate replicated processes choose separately; they do not form one global replica group.

Each replica holds its own request state, including KV cache and sampler state. Another replica does not automatically hold the same record. The picture shortens this half-finished state to “A's record” to explain why later hand-offs keep the old replica.

The coordinator puts the `{stage name: replica index}` dictionary in `SubmitMessage`. The receiving stage saves it by request id. Later target resolution and hand-offs read the same dictionary and propagate it downstream. “Fixed” means the runtime uses the binding already carried by the request instead of running round-robin again at each hand-off.

### Scope and sources

This step covers binding and reuse for one replicated process. It does not cover completion, abort, ownership release, the arrival order of concurrent callers, or load-balancing results. Under concurrency, “take turns” follows entry into the selection code, not alphabetical request names.

Sources on `sglang-omni origin/main@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`:

- [Whole-lifetime binding, per-process round-robin and replica-private request state: `docs/basic_usage/process_topology.md:55-66,144-151`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/docs/basic_usage/process_topology.md#L55-L66).
- [The default round-robin policy: `sglang_omni/pipeline/coordinator.py:131-143,193`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L131-L143).
- [Assignment at admission and propagation in the submit message: `sglang_omni/pipeline/coordinator.py:560-674`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L560-L674).
- [Per-process counters, remainder and projection onto member stages: `sglang_omni/pipeline/replicas.py:304-356`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/replicas.py#L304-L356).
- [Request-keyed binding records and target resolution: `sglang_omni/pipeline/stage/runtime.py:232-271`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage/runtime.py#L232-L271).
- [Later hand-offs reuse and propagate the binding: `sglang_omni/pipeline/stage/runtime.py:2027-2088`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage/runtime.py#L2027-L2088).

### Next

The next step follows normal completion to explain why the name A cannot be reused as soon as its result is ready. Active cancellation comes after that.

## Step 2 · When a completed request's name can be reused

> **In one sentence:** Finishing A removes only its work record; another request can use the name A after the caller collects the result and the remaining records clear.

### What the picture shows

- A **request id** is a request's name, A in this example. The picture shows only coordinator records under that name, not replica KV cache or GPU memory.
- The work record is `requests[A]`; the result-wait record is `completion_futures[A]`. A blue border means the record remains, while a grey dashed border and — mean it has cleared.
- In panel 1, A is running: both records remain and the name is taken. In panel 2, the result is ready: the work record has cleared, but the result-wait record remains, so the name is still taken. In panel 3, the caller has collected the result: both records have cleared and another request can use the name A.
- This example uses non-streaming `submit()`; `stream_queues` and `abort_tasks` stay empty. Active cancellation, multiple terminals and GPU memory cleanup are not drawn.

### Formula

The coordinator checks four tables to decide whether a request id is still occupied:

$$
\operatorname{occupied}(A) \iff A \in R \lor A \in F \lor A \in Q \lor A \in T
$$

| Symbol | Meaning | Source |
|---|---|---|
| $A$ | This example's request id | Request A from Step 1 |
| $R$ | `requests`, the tracked work records | The coordinator |
| $F$ | `completion_futures`, the records waiting for results | The coordinator |
| $Q$ | `stream_queues`, queues for streaming results | The coordinator; empty here |
| $T$ | `abort_tasks`, cancellation tasks still running | The coordinator; empty here |

### The numbers on the stage

| Stage state | $R$ | $F$ | $Q$ | $T$ | Is the name A occupied? |
|---|---|---|---|---|---|
| Working | $\{A\}$ | $\{A\}$ | $\varnothing$ | $\varnothing$ | Yes |
| Result ready | $\varnothing$ | $\{A\}$ | $\varnothing$ | $\varnothing$ | Yes |
| Result collected | $\varnothing$ | $\varnothing$ | $\varnothing$ | $\varnothing$ | No |

When the result is ready, removing `requests[A]` releases this request's admission slot. The remaining `completion_futures[A]` still prevents another request from using the same name. Releasing an admission slot and making a request id reusable are separate events.

### The source's deletion order

A terminal stage sends a `CompleteMessage`. The coordinator's `handle_completion` delivers the result to the future, then removes `requests[request_id]`. Panel 2 therefore shows the state after completion handling, not the instant the result was computed.

After the non-streaming `submit()` caller receives the result, its `finally` block runs `release_submission`, removing the future, stream queue and backlog records. During normal completion, `requests[request_id]` is already gone, so the cleanup call to `abort()` returns immediately without broadcasting cancellation to stages.

### Scope and sources

This step covers only when a normal non-streaming request id becomes reusable. It does not claim that a ready result releases every resource, or that replica and network transfer cleanup has finished.

Sources on `sglang-omni origin/main@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`:

- [Four tables jointly decide whether a request id is occupied: `sglang_omni/pipeline/coordinator.py:733-740`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L733-L740).
- [Normal completion delivers the result, then removes the work record: `sglang_omni/pipeline/coordinator.py:984-1001`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L984-L1001).
- [`submit()` cleans up in `finally` after returning the result: `sglang_omni/pipeline/coordinator.py:485-495`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L485-L495).
- [Remaining record removal and the no-op abort after normal completion: `sglang_omni/pipeline/coordinator.py:703-727,776-778`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L703-L727).
- [Admission counts only `requests`: `sglang_omni/pipeline/coordinator.py:589-593`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L589-L593).

### Next

The next step follows active cancellation: what extra message the coordinator sends, and which records still need cleanup.
