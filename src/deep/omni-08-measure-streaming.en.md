## Step 1 · Measure the first-sound wait

**One sentence.** PR #1235 changed only the talker's placement, moving p90 first sound from about 2.7 seconds beside the thinker to about 1.4 seconds on its own GPU.

### On the stage

- `First sound` is the first audio the client receives. Learning SGLang Ch. 20 Step 1 already separated this first chunk from later gaps.
- `P90` means that 9 in 10 requests received their first sound within this time. The blue bars share one scale; they do not show individual requests inside either run.
- The two shared-placement results are 2.697 and 2.663 seconds. Their mean is 2.68 seconds, displayed as 2.7 seconds.
- The two own-GPU results are 1.463 and 1.415 seconds. Their mean is 1.439 seconds, rounded to 1.44 seconds in the arithmetic and 1.4 seconds on the bar.
- `+1.2 s` subtracts the unrounded means, giving about 1.241 seconds before rounding to one decimal. The roughly 46% improvement uses two-decimal means.

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

## Step 3 · Calculate silence from chunk arrivals

**One sentence.** The player consumes 800 ms chunks in order; a missing next chunk leaves silence for the amount by which its arrival passes the playback deadline.

### On the stage

- The two blue dots above mark chunk arrivals: chunk 1 at 1.4 seconds and chunk 2 at 2.5 seconds.
- The blue blocks below are playing sound. Chunk 1 plays from 1.4 seconds to $1.4+0.8=2.2$ seconds.
- The orange block runs from 2.2 to 2.5 seconds. The player has no next chunk, so it stays silent for 0.3 seconds.
- Chunk 2 starts at 2.5 seconds and ends at 3.3 seconds. Every block uses one time scale.
- These are constructed times. The gap covers 37.5% of one 800 ms chunk; it is not a public measurement.

### Formula and symbols

$$e_1=a_1+d,\qquad g=\max(0,a_2-e_1)$$

| Symbol | Meaning | Source |
|---|---|---|
| $a_1$ | Chunk 1 arrival | Constructed here, 1.4 seconds |
| $d$ | Playback duration of one chunk | Learning SGLang Ch. 20, 0.8 seconds |
| $e_1$ | Time when chunk 1 ends and chunk 2 is needed | Calculated here, 2.2 seconds |
| $a_2$ | Actual chunk 2 arrival | Constructed here, 2.5 seconds |
| $g$ | Silent gap with no chunk to play | Calculated in this step |

### The numbers on the stage

$$e_1=1.4+0.8=2.2\ \text{s}$$

$$g=\max(0,2.5-2.2)=0.3\ \text{s}$$

$$\frac{g}{d}=\frac{0.3}{0.8}=37.5\%$$

If chunk 2 arrives before 2.2 seconds, `max` clamps the negative result to zero instead of reporting negative silence.

### The shipped continuity statistics

`benchmarks/metrics/playback_continuity.py` applies the same playback rule to every chunk, using each chunk's measured duration. A chunk starts when it arrives or when the previous chunk ends, whichever is later. `compute_max_playback_underrun_s` keeps the longest silent gap in one request and returns N/A for a request with fewer than two chunks.

Across requests, `max_playback_underrun_max_s` is the largest of those per-request longest gaps. `c50`, `c100` and `c200` are the percentages of scored requests whose longest gap is at most 50, 100 and 200 ms. `playback_continuity_requests` counts scored multi-chunk requests; `playback_continuity_na_requests` counts the excluded one-chunk requests.

Step 2's TTFT script increments `audio_chunks` but does not store each $a_i$ or calculate this metric. The TTS benchmark records HTTP chunk arrival times and measured durations before calling the continuity helper. The stage's 0.3-second gap and fixed 800 ms chunks are constructed teaching values, not benchmark output.

### Next

Arrival times locate the gap without explaining which hand-off caused it. The next step enables communication tracing and places timestamped events on that hand-off.

Sources: `benchmarks/eval/benchmark_omni_streaming_ttft.py:179-205`; `benchmarks/metrics/playback_continuity.py:11-83`; `benchmarks/metrics/performance.py:50-60,177-181,272-273`; `benchmarks/tasks/tts.py:1272-1306`; Learning SGLang Ch. 20 Step 1.

## Step 4 · Enable communication tracing

**One sentence.** The environment switch makes the runtime write JSON records with timestamps and local durations for sends, reads and other events.

### On the stage

- `SGLANG_OMNI_COMM_TRACE=1` enables the records. With no value, 0, false or another disabled value, `emit` returns without logging.
- This step shows one `comm_stream_read`, which reads one chunk. `Obj-17` is a constructed object identifier that needs no mapping to another event.
- `Ns` means nanoseconds. `Ts_ns` is the event timestamp at emission, while `elapsed_ms` measures this read's local duration.
- `Start_ns` is the reading when this read starts, and `end_ns` is the reading when it ends. `Elapsed_ms: <read>` describes the field without inventing a zero duration.

### Formula and symbols

$$d=\frac{\mathrm{end\_ns}-\mathrm{start\_ns}}{1{,}000{,}000}$$

| Symbol | Meaning | Source |
|---|---|---|
| $\mathrm{start\_ns}$ | `Perf_counter_ns()` before the operation | `now_ns()` |
| $\mathrm{end\_ns}$ | `Perf_counter_ns()` after the operation | `elapsed_ms()` |
| $d$ | Duration of this operation in milliseconds | Calculated and converted here |
| $1{,}000{,}000$ | Nanoseconds in one millisecond | Unit conversion |

### The numbers on the stage

This step invents no duration. A local interval of 20,000 nanoseconds would give $d=20{,}000\div1{,}000{,}000=0.020$ milliseconds. This arithmetic example is not a new measurement or a value on the stage.

`Comm_stream_read` is emitted after reading and measures that read, not the whole request. In the implementation, `time.time_ns()` gives the wall-clock timestamp, while `perf_counter_ns()` supplies readings suited to duration subtraction.

### Next

The log separates local operations. The next step reads CUDA IPC host waiting and GPU-event waiting without calling the entire host interval GPU copying.

Sources: `sglang_omni/profiler/comm_trace.py:14-34`; `sglang_omni/comm/engine.py:327-393`; `sglang_omni/pipeline/stage/runtime.py:665-682`.

## Step 5 · Separate host waiting from the GPU-event interval

**One sentence.** `Cuda_ipc_get_wait_copy` reports both total host-side waiting and a GPU-event interval, whose difference locates time elsewhere on the host path.

### On the stage

- `Host` is the CPU side of this hand-off. The constructed `elapsed_ms=12.0` is its total wait.
- A `GPU event` places start and done marks on the GPU. The blue 5 ms block is `receiver_gpu_wait_copy_ms` between those marks.
- The orange 7 ms block is `host_minus_receiver_gpu_ms`. Together, the two blocks make the 12 ms host wait.
- The 7 ms difference can include queues, thread blocking, resume scheduling or other host work. It does not prove 7 ms of CPU compute or GPU copying.
- Every value is a constructed field-reading example, not a captured CUDA IPC record.

### Formula and symbols

$$r=h-g$$

| Symbol | Meaning | Source |
|---|---|---|
| $h$ | Total host wait, `elapsed_ms` | Constructed here, 12 ms |
| $g$ | GPU start/done event interval, `receiver_gpu_wait_copy_ms` | Constructed here, 5 ms |
| $r$ | Host wait minus the GPU event, `host_minus_receiver_gpu_ms` | Calculated in this step |

### The numbers on the stage

$$r=12-5=7\ \text{ms}$$

The code writes $g$ and $r$ only when GPU start and done events exist. On the thread-synchronize path, the record can also include `worker_queue_ms`, `worker_block_ms` and `worker_done_to_resume_ms` to locate the host difference. `Completion_mode=query_ready` does not produce those worker fields. Missing events do not become a fake zero difference.

### Next

These fields locate waiting, but an optimization still needs a fair comparison. The next step fixes inputs, seed, hardware and warmup while changing only partial start.

Sources: `sglang_omni/relay/cuda_ipc.py:526-581`; `sglang_omni/profiler/comm_trace.py:19-24`.

## Step 6 · Change only partial start

**One sentence.** Both A/B sides keep the same inputs, seed and measurement counts while changing only whether the talker starts after 5 thinker chunks instead of the complete input.

### On the stage

- `Partial-start` starts the talker when part of the prefix is ready, without waiting for the whole thinker input. B sets the threshold to 5 chunks; A disables the feature.
- Blue marks unchanged work, and orange marks B's changed setting. Both sides also keep the same sampling method and generated-token limit, detailed below.
- The stage's practice runs are the script's `warmup`: uncounted requests that fill caches and finish first-run setup. Each prompt gets 2 practice runs and then 5 measured repeats.
- The short prompt has 7 English words, and the medium prompt has 34. Each label uses both, so it discards $2\times2=4$ warmups and keeps $2\times5=10$ measured results.
- The stage shows no winning result because the repository script does not include a fixed set of outputs.

### Formula and symbols

$$N_{\mathrm{warm}}=p\times w,\qquad N_{\mathrm{kept}}=p\times r$$

| Symbol | Meaning | Source |
|---|---|---|
| $p$ | Prompts per label | `PROMPTS`: short and medium, 2 |
| $w$ | Warmups per prompt | `--warmup` default, 2 |
| $r$ | Measured repeats per prompt | `--repeats` default, 5 |
| $N_{\mathrm{warm}}$ | Warmups discarded per label | Calculated here |
| $N_{\mathrm{kept}}$ | Measured results kept per label | Calculated here |

### The numbers on the stage

$$N_{\mathrm{warm}}=2\times2=4,\qquad N_{\mathrm{kept}}=2\times5=10$$

Warmup and measured requests reuse seed 1000, reducing cold-start and sampling differences between A and B. `Max_tokens 256` caps generated tokens rather than input length. The seed controls sampling choices but does not guarantee identical outputs under concurrent scheduling. Every measured result remains in the JSON instead of leaving only an average. The output also records the label, base URL, sampling parameters and available fingerprint fields for checking conditions.

### Next

The protocol leaves 10 measured TTFT values. The next step reads mean, min, max and stdev so one slow run cannot hide inside an average.

Sources: `benchmarks/eval/benchmark_omni_streaming_ttft.py:11-25,59-69,73-95,126-145,224-283,316-365`.

## Step 7 · Keep the spread beside the mean

**One sentence.** One 2.6-second run makes this five-run mean 1.60 seconds; min, max and stdev make that slow run visible again.

### On the stage

- The five bars share one time scale. The four faster runs are 1.3, 1.4, 1.3 and 1.4 seconds, and the orange run is 2.6 seconds.
- Their sum is 8.0 seconds, giving a mean of 1.60 seconds. The four faster runs average $5.4\div4=1.35$ seconds, which the overall mean alone cannot show.
- `Min=1.30` and `max=2.60` show the endpoints. The maximum is twice the minimum.
- `Stdev`, also written σ, describes spread around the mean. Population means all 5 runs are included. The values 0.3, 0.2, 0.3, 0.2 and 1.0 seconds are the runs' distances from the 1.60-second mean. The script uses `statistics.pstdev`, giving about 0.502 seconds.
- These are five constructed results for one prompt, not a mixture of Step 6's two prompts and not measurements.

### Formula and symbols

$$\bar t=\frac{1}{n}\sum_{i=1}^{n}t_i,\qquad \sigma=\sqrt{\frac{1}{n}\sum_{i=1}^{n}(t_i-\bar t)^2}$$

| Symbol | Meaning | Source |
|---|---|---|
| $t_i$ | TTFT in run $i$ | Five constructed values in this step |
| $n$ | Number of results | 5 in this step |
| $\bar t$ | Mean TTFT, `ttft_mean` | Calculated here |
| $\sigma$ | Population standard deviation, `ttft_stdev` | `statistics.pstdev` |

### The numbers on the stage

$$\bar t=\frac{1.3+1.4+1.3+1.4+2.6}{5}=\frac{8.0}{5}=1.60\ \text{s}$$

The deviations are $-0.3,-0.2,-0.3,-0.2,1.0$ seconds, with squared deviations summing to $1.26$:

$$\sigma=\sqrt{\frac{1.26}{5}}=\sqrt{0.252}\approx0.502\ \text{s}$$

Mean, min, max and stdev do not replace individual `per_run` records. These five constructed values provide no confidence interval or significance test. A real comparison also keeps each run's conditions and variability.

### Next

The last step assembles the evidence a fair comparison needs and returns to Step 1's question: which wait actually became shorter?

Sources: `benchmarks/eval/benchmark_omni_streaming_ttft.py:245-296,354-365`; `Awesome-ML-SYS-Tutorial/sglang/sglang-omni/batch.md:221-227`.

## Step 8 · Keep the whole comparison record

**One sentence.** A shorter wait supports an optimization only when inputs, conditions and output checks remain visible; the next step reduces work inside AR or the encoder.

### On the stage

- `SAME INPUT` preserves prompts, sampling and input/output lengths so the two sides perform the same work. The source uses a seed to control sampling choices.
- `SAME CONDITIONS` preserves hardware, configuration and practice runs so an environment change cannot hide inside the switch's effect. Practice runs are the script's warmup.
- `PER-RUN WAITS` aligns TTFT, chunk gaps and host/GPU fields for every run, locating the wait that changed.
- `VALID RESULTS` first checks completion, then transcribes the generated audio and counts word errors. Voice match compares the speaker with the input reference audio. Other workloads can check answer accuracy. Performance numbers do not replace these checks, and the mean and spread remain beside them.
- `AR` is the loop that generates tokens one by one. The `encoder` turns reference audio into numeric features the model can read. They are two places to inspect in the next chapter, not a new sequential pipeline in this picture.

### Formula and symbols

$$\Delta\bar T=\bar T_A-\bar T_B$$

| Symbol | Meaning | Source |
|---|---|---|
| $\bar T_A$ | Baseline mean TTFT | A records from Steps 6 and 7 |
| $\bar T_B$ | Partial-start mean TTFT | B records from Steps 6 and 7 |
| $\Delta\bar T$ | Mean first-audio wait saved by B | Calculated after measurement |

### The numbers on the stage

This step invents no A/B output and leaves $\Delta\bar T$ unassigned. After a real run, verify Step 6's matching conditions and Step 7's complete per-run records before calculating it. Read it beside both groups' min, max and stdev. Requests within one run share queues and the environment, so they do not provide the same number of independent experiment repeats.

### Next

Chapter 9 inspects AR and the encoder: whether a cache avoids repeated work, asynchronous decode removes waiting, and CUDA graphs reduce launch work. This chapter does not claim those mechanisms already help.

Sources: `benchmarks/eval/benchmark_omni_streaming_ttft.py:354-365`; `docs/developer_reference/omni_offline_bench.md:310-379,435-443`; `Awesome-ML-SYS-Tutorial/sglang/sglang-omni/batch.md:221-235`; `docs/plan-omni.md`, Chapter 9.
