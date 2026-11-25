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
