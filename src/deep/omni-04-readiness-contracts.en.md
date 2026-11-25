## Step 1 · Dispatch after both complete inputs arrive

> **In one sentence:** In the speech topology, image-only request A waits for complete results from both `image_encoder` and `preprocessing` to reach `thinker`, then dispatches the merged request to its scheduler.

### What the picture shows

- This example uses the speech topology and isolates `image_encoder → thinker` and `preprocessing → thinker`. Request A contains an image but no audio, so it needs these two sources. The complete image result arrives first, followed by preprocessing.
- A **one-shot handoff** means that each source delivers its complete result to `thinker` in one piece, not as a sequence of chunks. The sources can arrive separately; “one-shot” does not mean simultaneous arrival.
- The three snapshots count complete results that have reached `thinker` in this example. At 0/2 and 1/2, the stage waits. At 2/2, it merges the payloads and dispatches the request. The early image result stays in thinker's input tray.
- A blue border and “at thinker” mark a source's complete result as arrived. Gray dashes and “not yet” mark a missing result. `thinker → scheduler` means dispatch to the scheduler, not the start of prefill or GPU work.
- The counts 0, 1 and 2 come from the constructed arrival order, not a latency or throughput measurement. The denominator 2 is the example's source count shown to the reader, not a numeric progress counter that the implementation always maintains.

### Formula

Let $E_A$ be request A's expected-source set and $P_A$ the sources whose complete results have arrived. Let $D_A$ indicate dispatch readiness and $n_A$ the number of arrived results:

$$D_A\iff P_A=E_A,\qquad n_A=|P_A|$$

| Symbol | Meaning | Source |
|---|---|---|
| $A$ | This image-only request | The request id carried over from Chapter 3 |
| $E_A$ | The two expected sources in this example | The speech topology's image-only source rule |
| $P_A$ | Sources whose complete results have arrived | The `pending` records that `AggregatedInput` keeps for A |
| $D_A$ | Whether the merged request can go to the scheduler | Defined in this step |
| $n_A$ | Number of complete results that have arrived | This example's count of $P_A$ |

### The numbers on the stage

Here, $E_A=\{\mathrm{image\_encoder},\mathrm{preprocessing}\}$.

| Snapshot | $P_A$ | $n_A$ | $P_A=E_A$? | Result on stage |
|---|---|---:|---|---|
| 1 | $\varnothing$ | 0 | No | Wait |
| 2 | $\{\mathrm{image\_encoder}\}$ | 1 | No | Wait |
| 3 | $\{\mathrm{image\_encoder},\mathrm{preprocessing}\}$ | 2 | Yes | Dispatch to scheduler |

When the image arrives first, the implementation has not resolved the expected-source set yet. The later preprocessing payload resolves that set to these two sources. The displayed 0/2 and 1/2 are teaching views; the source code does not necessarily store the denominator 2 at those moments.

### How the source waits for both results

The speech topology's `thinker` config supplies `wait_for`, a dynamic `wait_for_fn` and `merge_for_thinker`. The stage factory uses them to create an `AggregatedInput`. For an image-only request, the resolver selects `preprocessing` and `image_encoder` as the expected sources.

`AggregatedInput.receive()` stores arrivals by request id and source. It returns `None` while the expected set is unresolved or incomplete, so the stage does not dispatch the request. When pending and expected sources are exactly equal, it removes the saved state, calls `merge_for_thinker` to build `thinker_inputs`, and returns one `StagePayload`.

`Stage.receive_payload_from_stage()` calls `execute()` only for a non-null `StagePayload`. Ordinary dispatch then places a `new_request` message in this stage's scheduler inbox. The waiting picture therefore means “save state and do not dispatch yet,” not a request coroutine asleep. Dispatch does not imply that prefill or GPU work has started.

### Scope and sources

This step covers only two-source, one-shot fan-in and dispatch in the speech topology. It omits other dynamic-source branches, chunk buffering, per-step feedback, transport, data release and later scheduler queues. The non-speech `text_stages` topology places this aggregation in `mm_aggregate`, which this figure does not cover.

Sources on `sglang-omni origin/main@91d06c70b00746c0b2b84db12a318240db360f1d`:

- [Speech `thinker` aggregation and non-speech `mm_aggregate`: `sglang_omni/models/qwen3_omni/config.py:136-175,257-265`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/models/qwen3_omni/config.py#L136-L175).
- [The stage factory creates `AggregatedInput` from this configuration: `sglang_omni/pipeline/stage_workers.py:1157-1178`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage_workers.py#L1157-L1178).
- [Image-only source resolution and the preprocessing-triggered expected set: `sglang_omni/models/qwen3_omni/request_builders.py:264-275,566-586`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/models/qwen3_omni/request_builders.py#L264-L275).
- [Unresolved or incomplete sources return `None`; exact equality releases the merge: `sglang_omni/pipeline/stage/input.py:44-117`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage/input.py#L44-L117).
- [`merge_for_thinker` builds `thinker_inputs`: `sglang_omni/models/qwen3_omni/merge.py:47-78`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/models/qwen3_omni/merge.py#L47-L78).
- [Non-null input triggers execution and a scheduler inbox message: `sglang_omni/pipeline/stage/runtime.py:872-905,1260-1300`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage/runtime.py#L872-L905).
- [The image-only two-source test and arrival order: `tests/unit_test/qwen3_omni/test_pipeline.py:982-1020`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/tests/unit_test/qwen3_omni/test_pipeline.py#L982-L1020).

### Next

The next step examines a bufferable stream: where early chunks wait, and whether every chunk must arrive before request construction.

## Step 2 · Store early chunks in order

> **In one sentence:** `talker_ar` can store numbered `thinker` chunks in arrival order before the whole result arrives.

### What the picture shows

- A **chunk** is one small piece of a result. The route is `thinker → talker_ar`. The numbers 0, 1 and 2 are the chunk ids in this example.
- The three pictures contain one, two and three received chunks. Blue means received; orange marks the new chunk in each picture. Gray dashes mean the whole result has not arrived yet.
- The whole result is absent in snapshots 1 and 2, and present in snapshot 3. The early chunks remain in their arrival order.
- This stage allows pre-payload stream data. That permission is a stage configuration, not a rule for every stage.
- The picture shows receiving and storage only. It does not show request construction or computation starting.

### Formula

Let $C_A$ be the saved chunk sequence for request A, $c_i$ the chunk with id $i$, and $n_A$ the number saved:

$$C_A=[c_0,c_1,\ldots,c_{n_A-1}],\qquad n_A=|C_A|$$

| Symbol | Meaning | Source |
|---|---|---|
| $A$ | The request followed from Ch. 3 | Ch. 3 Step 1 |
| $C_A$ | A's chunks in arrival order | The scheduler's saved chunk list |
| $c_i$ | The chunk labelled $i$ on the stage | `StreamItem.chunk_id` |
| $n_A$ | Number of saved chunks | This step counts $C_A$ |

### The numbers on the stage

| Snapshot | $C_A$ | $n_A$ | Whole result |
|---|---|---:|---|
| 1 | $[c_0]$ | 1 | Not yet |
| 2 | $[c_0,c_1]$ | 2 | Not yet |
| 3 | $[c_0,c_1,c_2]$ | 3 | Arrived |

### Where the chunks wait

`talker_stage` sets `can_accept_stream_before_payload=True`. When a chunk arrives before the request payload, `Stage.route_stream_item_or_fail()` opens the pre-payload stream path only if the stage permits it. Otherwise, the stage aborts that request. The sender numbers chunks separately for each request and target.

For a request not yet known to `OmniScheduler`, `on_stream_chunk()` appends each `StreamItem` to `pending_stream_ingress[request_id].chunks`. When the whole `StagePayload` arrives, the scheduler moves that list to `payload.prefetched_chunks` without reordering it. This order is local to the receive lane for one request and source. Chunk ids do not globally sort different requests or sources. Here "whole result" means the ordinary terminal payload, not a large object assembled by joining all chunks.

Storage does not prove that request construction or GPU work started. Request-build readiness is a separate check.

### Scope and sources

This step omits backpressure, transport, chunk consumption, completion, data release and the request-build threshold. The three chunks are a teaching example, not a fixed stream length.

Sources on `sglang-omni origin/main@f6827ed1907e392fd67d5f13fa315c016e2056e8`:

- [`thinker` streams to `talker_ar`: `sglang_omni/models/qwen3_omni/config.py:170-185`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/models/qwen3_omni/config.py#L170-L185).
- [`talker_ar` permits pre-payload stream data: `sglang_omni/models/qwen3_omni/config.py:212-242`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/models/qwen3_omni/config.py#L212-L242).
- [The stage admits or rejects an early chunk: `sglang_omni/pipeline/stage/runtime.py:1024-1046,1238-1257`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/pipeline/stage/runtime.py#L1024-L1046).
- [Receive work is chained per request and source lane: `sglang_omni/pipeline/stage/runtime.py:571-648,700-730`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/pipeline/stage/runtime.py#L571-L648).
- [Chunk ids increase per request and target: `sglang_omni/pipeline/stage/runtime.py:2215-2229`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/pipeline/stage/runtime.py#L2215-L2229).
- [Unknown requests accumulate early chunks in arrival order: `sglang_omni/scheduling/omni_scheduler.py:3639-3653`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/scheduling/omni_scheduler.py#L3639-L3653).
- [The payload receives the buffered chunk list: `sglang_omni/scheduling/omni_scheduler.py:1565-1582`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/scheduling/omni_scheduler.py#L1565-L1582).
- [The same-process streaming test preserves chunk order: `tests/unit_test/pipeline/test_stage_streaming.py:1309-1342`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/tests/unit_test/pipeline/test_stage_streaming.py#L1309-L1342).

### Next

The next step asks when saved chunks become enough to construct and start a request.

## Step 3 · Build early with five chunks by default

> **In one sentence:** In the default configuration, five usable chunks can start request construction before the stream finishes; a finished stream has no minimum chunk count.

### What the picture shows

- **Build-ready** means the payload may pass the construction check and enter the request builder, which assembles the stored data into a request. It does not mean the request has been admitted or that GPU work has started.
- A **usable chunk** is a stored chunk that counts toward the construction threshold. A trailing `im_end` marker does not count. This example has no trailing marker, so every stored chunk is usable.
- The stream is open in the first two pictures. Four usable chunks wait, while the default five enter the request builder. The third picture has only two usable chunks, but its finished stream also passes.
- Blue borders mark satisfied conditions; gray dashes mark missing ones. The three empty slots in the third picture do not require waiting for five, because stream completion already passes the check.

### Formula

Let $U_A$ be request A's usable chunks, $u_A=|U_A|$ their count, $d_A$ whether the stream is done, $p$ whether early construction is enabled, $m$ the configured early-construction threshold, and $B_A$ construction readiness:

$$B_A\iff d_A\lor\left(p\land u_A\ge m\right)$$

| Symbol | Meaning | Source |
|---|---|---|
| $A$ | The request followed through the previous steps | Request A from Chapter 3 |
| $U_A$ | Chunks usable for the construction check | `payload.prefetched_chunks`, excluding a trailing `im_end` |
| $u_A$ | Number of usable chunks | `count_usable_prefetched_chunks()` |
| $d_A$ | Whether the stream has finished | `pending_stream_done` |
| $p$ | Whether construction may start before stream completion | `enable_partial_start`; true in this example |
| $m$ | Minimum usable chunks for early construction | `partial_start_min_chunks`; 5 in the default configuration |
| $B_A$ | Whether the request-construction check passes | The return value of `is_request_build_ready()` |

### The numbers on the stage

Here $p=\mathrm{true}$, $m=5$, and there is no trailing `im_end`, so $u_A$ equals the stored chunk count.

| Snapshot | $u_A$ | $d_A$ | $u_A\ge5$? | $B_A$ | Result on stage |
|---|---:|---|---|---|---|
| 1 | 4 | No | No | No | Wait |
| 2 | 5 | No | Yes | Yes | Enter request builder |
| 3 | 2 | Yes | No | Yes | Enter request builder |

The default is indeed $m=5$, but five is not an immutable implementation floor. The current implementation permits a configured threshold of at least 1. This picture covers only the default configuration, not every deployment.

### How the source passes the check

`talker_stage` enables `enable_partial_start` by default and passes `partial_start_min_chunks` to `QwenTalkerScheduler`. The default speech pipeline sets that value to 5. The scheduler rejects values below `TALKER_START_MIN_CHUNKS=1`.

`count_usable_prefetched_chunks()` normally returns the saved list's length. It subtracts one only when the last chunk's `metadata.token_id` equals `im_end_token_id`; the same marker in the middle does not cause another subtraction. `is_request_build_ready()` checks `pending_stream_done` first and passes immediately when it is true. Otherwise, with early construction enabled, it compares the usable count with the configured threshold.

A failed check stores the payload in `deferred_request_payloads`. Each later chunk or stream-completion event marks it for another check. After a pass, an ordinary request enters `run_request_builder()` synchronously or asynchronously. Admission and scheduling still follow. The pictured arrow therefore stops at the request builder. A finished reply with no spoken tokens can instead take `complete_without_generation()`; this example's usable chunks contain ordinary content and do not take that no-audio branch.

### Scope and sources

This step covers only the request-construction check in Qwen3-Omni's default speech configuration. It omits backpressure, builder internals, admission, batching, GPU start time, per-decode inputs and data release. Five is a default, not a universal rule for every stage.

Sources on `sglang-omni origin/main@6d8ed2dcf70da1b021bb14b62239a3add428636c`:

- [Default threshold 5 and implementation floor 1: `sglang_omni/models/qwen3_omni/config.py:33-35,445-451`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/config.py#L33-L35).
- [`talker_stage` enables early construction and passes the threshold: `sglang_omni/models/qwen3_omni/config.py:225-242`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/config.py#L225-L242).
- [Usable counting, stream-done precedence and the threshold check: `sglang_omni/models/qwen3_omni/talker_scheduler.py:62-112`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_scheduler.py#L62-L112).
- [A very short finished reply may bypass generation: `sglang_omni/models/qwen3_omni/talker_scheduler.py:114-128`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_scheduler.py#L114-L128).
- [Failed checks defer; passed checks enter the request builder: `sglang_omni/scheduling/omni_scheduler.py:1565-1652`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/scheduling/omni_scheduler.py#L1565-L1652).
- [Later chunks and stream completion trigger rechecks: `sglang_omni/scheduling/omni_scheduler.py:3639-3679`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/scheduling/omni_scheduler.py#L3639-L3679).
- [Tests for disabled early construction and counts below and at the threshold: `tests/unit_test/qwen3_omni/test_talker.py:981-1007`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/tests/unit_test/qwen3_omni/test_talker.py#L981-L1007).
- [Trailing end-marker counting tests: `tests/unit_test/qwen3_omni/test_talker.py:1023-1050`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/tests/unit_test/qwen3_omni/test_talker.py#L1023-L1050).

### Next

Once a request can be constructed, each decode step still needs its own inputs. The next step shows why the next step cannot run before the current step's feedback arrives.
