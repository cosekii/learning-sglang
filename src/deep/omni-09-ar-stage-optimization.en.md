## Step 1 · Three prompts repeat one reference encode

**One sentence.** Three different prompts reuse the same reference voice, so three separate encoder passes repeat about 750 ms of work before generation.

### On the stage

- A `reference encoder` turns the example voice into codes that the model can read. The three prompt texts differ, but all three cards name the same `voice.wav`.
- Each blue encoder bar represents one approximately 250 ms pass. Three passes make approximately 750 ms of encoder work. The prompt texts and their order are constructed for this comparison.
- The bottom map names four waiting points in plain language: reusing a finished result, sharing a running encode, overlapping GPU and CPU work, and replaying recorded kernels. Later steps replace these descriptions with the implementation names.
- Blue marks encoder work. The map uses neutral outlines because it does not claim that any wait has been removed yet.

### Formula and symbols

$$T_{\mathrm{uncached}}=n\times t_{\mathrm{encode}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $n$ | Requests reusing one reference voice | Constructed here, 3 |
| $t_{\mathrm{encode}}$ | Approximate time for one MOSS reference encode | Public profile, about 250 ms |
| $T_{\mathrm{uncached}}$ | Encoder time for three independent passes | Calculated in this step |

### The numbers on the stage

$$T_{\mathrm{uncached}}=3\times250\ \text{ms}=750\ \text{ms}$$

The 250 ms input is already approximate, so the 750 ms total is approximate too. This arithmetic counts repeated encoder work only. It excludes preprocessing, AR generation, vocoder work and communication.

### Next

The first map entry keeps a finished encoder result. The next step shows the exact identity that lets later requests reuse it safely.

Sources: `Awesome-ML-SYS-Tutorial/sglang/sglang-omni/moss-tts-local-v15-blog-zh.md:54-58`; `sglang_omni/models/moss_tts/reference_encoder.py:110-143`.

## Step 2 · Reuse a finished result through an exact key

**One sentence.** The first encode stores its codes under the full input and encoder identity, so the next two matching requests load copies instead of running the encoder again.

### On the stage

- `Cache` means a saved output found by a key. `Exact key` means every identity field must match: model, model revision, encoder and its configuration, artifact kind, input content and options.
- The prompt text is absent from this reference-encoder key. A, B and C can have different prompts because the cached object describes only the shared reference voice and the encoder that converted it.
- A is a `miss`: no stored value exists, so the encoder runs once and stores the codes. B and C are `hits`: they load the stored codes without another GPU encode.
- Blue marks GPU encoder work. Orange marks the saved-code path. Loading still has host and transfer costs; the bars compare GPU encode time only, not whole-request latency.
- Each load returns a copy. A caller changing its output cannot mutate the cached tensor seen by another caller.

### Formula and symbols

$$T_{\mathrm{cached}}=m\times t_{\mathrm{encode}},\qquad S=T_{\mathrm{uncached}}-T_{\mathrm{cached}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $m$ | Cache misses that must run the encoder | This example, 1 |
| $t_{\mathrm{encode}}$ | Approximate time per reference encode | Step 1, 250 ms |
| $T_{\mathrm{cached}}$ | GPU encode time with one miss and two hits | Calculated here |
| $T_{\mathrm{uncached}}$ | GPU encode time for three separate passes | Step 1, 750 ms |
| $S$ | Repeated GPU encode time skipped by the cache | Calculated here |

### The numbers on the stage

$$T_{\mathrm{cached}}=1\times250=250\ \text{ms}$$

$$S=750-250=500\ \text{ms}$$

The two hits are counted as two cache hits, not as two 250 ms encodes. The 500 ms is an approximate avoided GPU-work total for this constructed sequence, not a promised end-to-end speedup.

### Next

A warm cache helps only after the first result exists. The next step puts all three requests before that first result and shares the encode already in flight.

Sources: `sglang_omni/scheduling/reference_encoder.py:24-35,84-119,344-413`; `sglang_omni/models/moss_tts/reference_encoder.py:74-105`; `tests/unit_test/scheduling/test_reference_encoder.py:85-119,182-193`.

## Step 3 · Share one encode already in flight

**One sentence.** With an empty cache, the first matching request becomes the leader and the other two wait on its future, so three callers share one encode.

### On the stage

- `Single-flight` means that callers with the same key share one unfinished encode. The `leader` runs it. Each `follower` waits for the leader's stored result and then loads its own copy.
- All three requests arrive while the cache is empty. There is no finished result to hit, so the final counters are `misses=1`, `merged=2`, `hits=0`.
- The left panel is a counterfactual with three independent calls and batching off. The right panel uses single-flight. Both use the same 250 ms scale.
- Blue bars are GPU encode work. Orange bars are followers waiting, not extra GPU work. The GPU-work totals sum the blue bars; they do not claim a wall-clock latency for a concurrent batch.
- MOSS's own batch encoder can also deduplicate identical identifiers within one batch. This step isolates the generic service's single-flight rule by turning that separate batch path off.

### Formula and symbols

$$W_{\mathrm{single\!-\!flight}}=l\times t_{\mathrm{encode}},\qquad f=n-l$$

| Symbol | Meaning | Source |
|---|---|---|
| $l$ | Leaders that execute the encode | This cold-cache example, 1 |
| $n$ | Matching callers arriving before completion | Step 1, 3 |
| $f$ | Followers merged into the running encode | Calculated here, 2 |
| $t_{\mathrm{encode}}$ | Approximate leader encode time | Step 1, 250 ms |
| $W_{\mathrm{single\!-\!flight}}$ | GPU encode work after single-flight | Calculated here |

### The numbers on the stage

$$f=3-1=2,\qquad W_{\mathrm{single\!-\!flight}}=1\times250=250\ \text{ms}$$

Three independent calls would do $3\times250=750$ ms of GPU encode work. Single-flight does not make the two followers return early: they still wait for the leader. It removes duplicate execution, and later requests can use Step 2's completed cache entry.

### Next

The encoder no longer repeats the same work. The AR loop has a different wait: the CPU finishes one step while the GPU could begin the next.

Sources: `sglang_omni/scheduling/reference_encoder.py:361-413`; `tests/unit_test/scheduling/test_reference_encoder.py:131-179`; `sglang_omni/models/moss_tts/reference_encoder.py:113-143`.

## Step 4 · Launch the next step before resolving the previous one

**One sentence.** Async decode keeps one step in flight: the scheduler launches step N, then resolves step N−1 while that GPU work can still be running.

### On the stage

- `Launch` builds and starts a GPU decode step, publishes its resolve payload and records a completion event without waiting for the GPU.
- `Resolve` checks that event, collects each request's result, finishes sampling and emits output. If the event is not ready, resolve synchronizes instead of overlapping.
- `SYNC` runs launch and resolve for one step before starting the next. `ASYNC` starts step N before resolving step N−1. The same blue GPU and orange CPU blocks appear in both panels.
- The shaded overlap is a possible ordering, not a measured duration. The diagram does not show a D2H copy: MOSS-TTS-Local resolves from a device-side snapshot, while Higgs can use a pinned host staging buffer.
- Async decode changes the schedule, not the model math. MOSS-TTS-Local currently defaults it off, and its public measurements report performance within session noise rather than a guaranteed speedup.

### Formula and symbols

$$I_{\mathrm{overlap}}=I_{\mathrm{launch},N}\cap I_{\mathrm{resolve},N-1}$$

| Symbol | Meaning | Source |
|---|---|---|
| $I_{\mathrm{launch},N}$ | Time interval in which step N is launched and runs on the GPU | Constructed ordering on the stage |
| $I_{\mathrm{resolve},N-1}$ | Interval in which the CPU resolves step N−1 | Constructed ordering on the stage |
| $I_{\mathrm{overlap}}$ | Time when those two intervals can coexist | The async panel |

### The numbers on the stage

This step assigns no milliseconds. It shows only the order `launch(N)` before `resolve(N−1)`. The scheduler holds the newly launched step as pending, then resolves the previous pending step. Empty batches, ineligible batches and batches below the configured threshold use the synchronous path after draining any pending step.

### Next

Overlap can hide some CPU waiting without removing GPU work. The next mechanism reduces the CPU launches that submit the audio encoder's kernels.

Sources: `sglang_omni/model_runner/base.py:137-166,502-516,577-605`; `sglang_omni/scheduling/omni_scheduler.py:5125-5197`; `sglang_omni/models/moss_tts_local/stages.py:326-346`; `Awesome-ML-SYS-Tutorial/sglang/sglang-omni/moss-tts-local-v15-blog-zh.md:210-216`.

## Step 5 · Capture the audio layer stack, then replay it

**One sentence.** Qwen3-Omni can record its audio encoder's layer stack in a CUDA graph and replay the recorded kernels for a matching input instead of dispatching each one again.

### On the stage

- Learning SGLang Ch. 11 Step 1 introduced `CUDA graph`: record a kernel sequence once, then replay it. This step applies that idea to Qwen3-Omni's audio encoder.
- Both panels contain the same attention and MLP kernels. `Eager` dispatches them on every call. The graph panel records the layer stack and submits one graph replay for a matching call.
- Blue boxes are GPU kernels. Orange marks the graph boundary and its replay path. Grey arrows are CPU dispatch. The kernels and model math do not change inside the graph.
- `One graph` does not mean one kernel, and it does not cover the whole request. Input copies and metadata updates still surround the layer-stack replay.
- This path is opt-in through `enable_layer_cuda_graph`. It needs CUDA and supported packed attention. If capture fails or no graph matches, `GraphedLayerStack.forward` runs the original layers eagerly.

### Formula and symbols

$$D_{\mathrm{eager}}=k,\qquad D_{\mathrm{graph}}=1$$

| Symbol | Meaning | Source |
|---|---|---|
| $k$ | Kernel launches in the recorded layer stack | The model's actual layer stack; no count invented here |
| $D_{\mathrm{eager}}$ | CPU dispatches for those kernels without a graph | Eager panel |
| $D_{\mathrm{graph}}$ | Graph submissions for one matching layer-stack replay | Graph panel |

### The numbers on the stage

This step does not assign $k$ or a time saving. It compares $k$ individual kernel dispatches with one graph submission for the recorded stack. Capture and warmup have their own startup cost, and the copies around replay remain, so $D_{\mathrm{graph}}=1$ is not an end-to-end launch count.

### Next

A graph has a fixed captured input size. The next step shows how 300 real tokens select and pad into one of the six captured sizes.

Sources: Learning SGLang Ch. 11 Step 1; `sglang_omni/models/qwen3_omni/components/audio_layer_graph.py:163-221`; `sglang_omni/models/qwen3_omni/components/audio_encoder.py:170-197,200-268`.

## Step 6 · Select a token bucket and crop the padding

**One sentence.** A 300-token input selects the smallest sufficient captured bucket, 512, pads 212 positions in separate attention windows, replays and returns only the first 300 outputs.

### On the stage

- A `token bucket` is one captured input size. The six default graphs have 128, 256, 512, 1024, 2048 and 4096 tokens. The selector picks the smallest available graph that can fit the real tokens and required segment slots.
- Blue positions are the 300 real tokens. Grey positions are the 212 zero-filled padding positions. Orange marks the selected 512-token graph.
- The replay copies real hidden states into the captured buffer, zeros the remainder and updates the segment boundaries. Padding forms its own attention windows, so real tokens do not attend to it.
- The returned slice is `output[:300]`. Padding computes extra positions, but those positions do not become outputs for this request.
- Inputs above 4096 tokens, invalid segments, insufficient segment slots, a device or process mismatch, and unavailable capture all decline replay. The caller then uses the eager layer stack.

### Formula and symbols

$$b=\min\{b_i\mid b_i\geq n\},\qquad p=b-n$$

| Symbol | Meaning | Source |
|---|---|---|
| $n$ | Real input tokens | Constructed here, 300 |
| $b_i$ | One captured bucket size | `DEFAULT_TOKEN_BUCKETS` |
| $b$ | Smallest sufficient selected bucket | This example, 512 |
| $p$ | Zero-filled positions before replay | Calculated here, 212 |

### The numbers on the stage

$$b=\min\{512,1024,2048,4096\}=512$$

$$p=512-300=212$$

The bucket must also have enough segment slots for the real segments and the window-bounded padding segments. This example assumes valid segments with sufficient slots, so token count determines the choice. The arithmetic describes shape, not a latency measurement.

### Next

The four mechanisms now have distinct jobs and limits. The last step places them on one map and follows the frames into the vocoder.

Sources: `sglang_omni/models/qwen3_omni/components/audio_layer_graph.py:22-23,223-275`; `tests/unit_test/qwen3_omni/test_audio_layer_graph.py:105-154`.
