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

## Step 3 · An aborted request id cannot directly return

> **In one sentence:** Abort clears A's work record, but every stage keeps an abort marker for A; submitting A again is rejected, so the caller needs a fresh request id.

### What the picture shows

- **Abort** stops a request before normal completion. An **abort marker** is a stage's record that this request id was cancelled; it corresponds to the source's `aborted` set.
- Panel 1 continues the earlier steps: the coordinator holds A's work record `requests[A]`, and A's replica state is in copy 0. Neither copy has an abort marker for A yet.
- Panel 2 is a later snapshot after both copies handle the broadcast, not only bound copy 0. The work record clears, and both copies remember A as aborted. This is not a stage acknowledgement or a coordinator wait for one.
- In panel 3, a stage finds A's abort marker and rejects the resubmitted name. D is a fresh request id and passes this name check; the figure does not claim that D has started running. Broadcasting the same ban to both copies prevents late work from old A being attached to a new A.
- A blue border means the record remains; a grey dashed border and — mean it is absent. The picture omits transient abort tasks, stream queues and GPU cleanup.

### Formula

Each stage applies this abort-marker check when it receives a submission:

$$\mathrm{reject}(id)\iff id\in\mathrm{aborted}$$

| Symbol | Meaning | Source |
|---|---|---|
| $id$ | Request id being checked | A or D in this step |
| $\mathrm{aborted}$ | Set of cancelled request ids held by this stage | Stage runtime |
| $\mathrm{reject}(id)$ | Whether the abort marker rejects this id | Defined in this step |

### The numbers on the stage

After abort, $A\in\mathrm{aborted}$, so $\mathrm{reject}(A)$ is true. $D\notin\mathrm{aborted}$, so this check does not reject D; the example's other admission checks also pass.

### Broadcast and cleanup in the source

`AbortMessage` carries only `request_id`, not the replica binding from Step 1. The coordinator broadcasts it to every stage over PUB/SUB, so both copies receive it. Waiting for publication does not wait for every stage to acknowledge that its work has stopped.

The coordinator then marks the request `ABORTED`, rejects its completion future with a cancellation error, and removes `requests[A]` and partial results. The awaiting caller's cleanup removes its `completion_futures[A]` result-wait record. While cancellation is running, `abort_tasks[A]` still reserves the name; that entry is removed when the task finishes. The picture omits this transient state because the stage-side abort marker continues to reject A afterward.

Each receiving stage adds A to `aborted`, clears request state and replica bindings, and calls its scheduler's abort logic. A later submission named A reaches `on_submit`, which returns “use a fresh request ID.” This is the rejection in panel 3.

### Scope and sources

Abort markers are not permanent: when the set exceeds 10,000 ids, it is trimmed to 5,000. These thresholds are implementation constants, not values derived from the example. Trimming follows set-iteration order, not id age. If A's marker is removed, this check no longer rejects A, and the marker-based old/new protection ends. The main picture covers behavior while the marker remains. TP-fanned work may finish its current collective; GPU memory and in-flight data reclamation are outside this picture.

Sources on `sglang-omni origin/main@91d06c70b00746c0b2b84db12a318240db360f1d`:

- [The abort message carries only the request id: `sglang_omni/proto/messages.py:300-311`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/proto/messages.py#L300-L311).
- [The coordinator broadcasts abort over PUB/SUB: `sglang_omni/pipeline/control_plane.py:425-491`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/control_plane.py#L425-L491).
- [Abort tasks, coordinator cleanup and task-record removal: `sglang_omni/pipeline/coordinator.py:761-843`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/coordinator.py#L761-L843).
- [Result-wait record removal during caller cleanup: `sglang_omni/pipeline/coordinator.py:703-740`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/coordinator.py#L703-L740).
- [Stage marker, state cleanup and bounded set: `sglang_omni/pipeline/stage/runtime.py:2603-2687`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage/runtime.py#L2603-L2687).
- [Explicit rejection of a reused id: `sglang_omni/pipeline/stage/runtime.py:732-743`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage/runtime.py#L732-L743).

### Next

The request has a bound replica and two taught exit paths. The next chapter asks when downstream may start computing and when upstream must wait.
