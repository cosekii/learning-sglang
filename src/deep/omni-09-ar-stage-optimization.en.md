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
