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
