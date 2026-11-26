## Step 1 · Measure the first-sound wait

**One sentence.** PR #1235 changed only the talker's placement, moving p90 first sound from about 2.7 seconds beside the thinker to about 1.4 seconds on its own GPU.

### On the stage

- `First sound` is the first audio the client receives. Learning SGLang Ch. 20 Step 1 already separated this first chunk from later gaps.
- `P90` means that 9 in 10 requests received their first sound within this time. The blue bars share one scale; they do not show individual requests inside either run.
- The two shared-placement results are 2.697 and 2.663 seconds. Their mean is 2.68 seconds, displayed as 2.7 seconds.
- The two own-GPU results are 1.463 and 1.415 seconds. Their mean is 1.439 seconds, rounded to 1.44 seconds in the arithmetic and 1.4 seconds on the bar.
- `+1.3 s` subtracts the displayed one-decimal values. The unrounded means differ by about 1.24 seconds, and the roughly 46% improvement uses two-decimal means.

### Formula and symbols

$$\bar t=\frac{t_1+t_2}{2},\qquad s=\left(1-\frac{\bar t_{\mathrm{alone}}}{\bar t_{\mathrm{shared}}}\right)\times100\%$$

| Symbol | Meaning | Source |
|---|---|---|
| $t_1,t_2$ | Two p90 results for one placement | PR #1235 |
| $\bar t_{\mathrm{shared}}$ | Mean p90 with the talker beside the thinker | 2.697 and 2.663 seconds |
| $\bar t_{\mathrm{alone}}$ | Mean p90 with the talker on its own GPU | 1.463 and 1.415 seconds |
| $s$ | Percentage by which the own-GPU wait is shorter | Calculated in this step |

### The numbers on the stage

$$\bar t_{\mathrm{shared}}=(2.697+2.663)\div2=2.68\ \text{s}$$

$$\bar t_{\mathrm{alone}}=(1.463+1.415)\div2=1.439\ \text{s}\approx1.44\ \text{s}$$

$$s=(1-1.44\div2.68)\times100\%\approx46\%$$

The test used H200s and 8 concurrent requests, with the thinker split across two GPUs. The shared case placed the talker beside one thinker half, not every stage on one card. These results describe that public experiment only.

### Next

The numbers show a changed wait without locating it. The next step fixes when the timer starts and which event stops it.

Sources: Learning SGLang Ch. 19 Step 5; the PR #1235 measurement notes in `src/pages/ch/19-sharing-gpus.mdx`.

## Step 2 · Stop TTFT at the first audio delta

**One sentence.** This streaming benchmark starts at POST submission, records TTFT at the first delta with nonempty `audio.data`, and separately times the whole stream to `[DONE]`.

### On the stage

- `POST` is request submission, set to 0.0 seconds in this constructed example.
- A `text delta` carries no audio data, so it cannot stop the TTFT timer.
- `First audio delta` is the first streaming event with nonempty `audio.data`, set to 1.4 seconds here. The orange TTFT interval stops there.
- `[DONE]` ends the stream at a constructed 3.2 seconds. The blue total-time interval runs from POST to this event.
- Orange and blue distinguish the two timing boundaries. They do not represent CPU or GPU work.

### Formula and symbols

$$T_{\mathrm{TTFT}}=t_{\mathrm{first\ audio}}-t_{\mathrm{submit}},\qquad T_{\mathrm{total}}=t_{\mathrm{done}}-t_{\mathrm{submit}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $t_{\mathrm{submit}}$ | The `time.perf_counter()` start | Before POST, 0.0 seconds in this example |
| $t_{\mathrm{first\ audio}}$ | Arrival of the first delta with nonempty `audio.data` | 1.4 seconds in this example |
| $t_{\mathrm{done}}$ | Time after the stream finishes | 3.2 seconds in this example |
| $T_{\mathrm{TTFT}}$ | Wait for the first audio | Calculated in this step |
| $T_{\mathrm{total}}$ | Wait for the whole streaming request | Calculated in this step |

### The numbers on the stage

$$T_{\mathrm{TTFT}}=1.4-0.0=1.4\ \text{s}$$

$$T_{\mathrm{total}}=3.2-0.0=3.2\ \text{s}$$

The code checks HTTP errors and streaming `error` events. If a server returns 200 without any audio delta, `_measure_one` raises an error instead of recording a valid measurement. Each `RunResult` stores TTFT, total seconds, audio chunk count and status code.

### Next

Sound can still stop after the first chunk. The next step places chunk arrivals on the playback timeline and calculates the silent gap.

Sources: `benchmarks/eval/benchmark_omni_streaming_ttft.py:73-82,148-205,259-275`.
