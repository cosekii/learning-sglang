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
