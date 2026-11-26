## Step 1 · Two startup shapes

> **In one line:** The same Qwen3-Omni checkpoint starts one process on one GPU for text-only deployment, or seven processes on two GPUs for default speech.

### On the stage

- A checkpoint is the set of saved model files loaded by the server.
- The left dashed box is one `pipeline` process containing all six text-only stages.
- The right panel gives each speech stage its own process. Four processes use GPU 0, one uses GPU 1, and two use only CPU.
- Blue marks GPU stages. White boxes with faint outlines mark CPU stages. These are startup shapes, not measured utilization.
- Both deployments accept text, image, audio or video input. “Text-only deployment” limits the output, not the input.

### The numbers on the stage

| Deployment | Stages | Stage processes | GPUs |
|---|---:|---:|---:|
| Text-only | 6 | 1 | 1 |
| Default speech | 7 | 4 + 1 + 2 = 7 | 2 |

The speech sum groups four GPU-0 processes, one GPU-1 process and two CPU processes. The six text-only stages include a join stage, which combines the preprocessing and active encoder branches before the thinker.

### Boundaries and sources

These counts come from `sglang_omni/models/qwen3_omni/config.py:136-147,257-318,412-452`. Text, image, audio and video input in text-only mode comes from `docs/cookbook/qwen3_omni.md:46-57,206-208`. The counts exclude the HTTP server and coordinator.

### Next

The next step follows requests through these two server modes and shows when the speech stages actually run.

## Step 2 · The requested output picks the route

> **In one line:** A speech server bypasses talker and code2wav unless the request asks for audio output.

### On the stage

- `modalities` lists the output kinds the client wants. Its public default is `["text"]`.
- A text-only server joins preprocessing and active encoders at `mm_aggregate`, then runs thinker and decode.
- A speech server running a text-output request lets its thinker join those inputs, then runs decode. Talker and code2wav stay unused.
- Adding `"audio"` activates the thinker-to-talker-to-code2wav branch while decode still returns text.
- Both server modes accept multimodal input. An audio request to a text-only server returns no audio.

### The routes on the stage

| Server and requested output | Terminal stages |
|---|---|
| Text-only, text | `decode` |
| Speech, text | `decode` |
| Speech, text and audio | `decode` and `code2wav` |

`mm_aggregate` is a joining stage, not another model. The speech graph has no separate `mm_aggregate`; its thinker owns that join. The code predictor remains inside `talker_ar`, so it does not add an eighth stage.

### Sources

Route construction and terminal stages: `sglang_omni/models/qwen3_omni/config.py:136-189,212-302` and `sglang_omni/models/qwen3_omni/request_builders.py:200-261`. Code predictor placement is explicit in `sglang_omni/models/qwen3_omni/placement.py:37-40`. Request behavior: `docs/basic_usage/omni.md:22,154-170,199-200,359,386-395` and `docs/cookbook/qwen3_omni.md:206-208`.

### Next

Once audio activates the talker, its GPU placement changes the first audio wait.

## Step 3 · Isolate the talker, then check both clocks

> **In one line:** Talker isolation nearly halved mean p90 first-audio wait at concurrency eight, but increased single-stream total time.

### On the stage

- The public H200 experiment splits the thinker across GPU 4 and GPU 5. Code2wav stays with the thinker process on GPU 5 in both panels.
- In the shared panel, the talker also uses GPU 4. In the isolated panel, it moves to GPU 2. This preserves the experiment's TP2 topology.
- First audio means the first returned audio chunk, not proof of acoustic playback. The p90 boundary has 90% of measured first-audio waits at or below it.
- The two dark bars use the same scale. Their means of two measured p90 values fall from 2.680 to 1.439 seconds.
- The orange card reports a different workload. With one request at a time, total time rises 14–17% after isolation.

### Formula

$$
\overline{T}=\frac{T_1+T_2}{2},\qquad \rho=\left(1-\frac{\overline{T}_{alone}}{\overline{T}_{shared}}\right)\times100\%
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $T_1,T_2$ | Two measured p90 first-audio values | seconds | PR #1235 placement runs |
| $\overline{T}$ | Arithmetic mean of two p90 values | seconds | This step |
| $\overline{T}_{shared}$ | Mean with the talker on thinker GPU 4 | 2.680 s | This step |
| $\overline{T}_{alone}$ | Mean with the talker on its own GPU | 1.439 s | This step |
| $\rho$ | First-audio wait reduction | percent | This step |

### The numbers on the stage

$$
\overline{T}_{shared}=(2.697+2.663)\div2=2.680\ \text{s}
$$

$$
\overline{T}_{alone}=(1.463+1.415)\div2=1.439\ \text{s}
$$

$$
\rho=(1-1.439\div2.680)\times100\%\approx46\%
$$

The single-stream 14–17% increase is the source's reported range. It has no absolute bar here because the guide does not provide the underlying pair of total times in this table.

### Boundaries and sources

The exact four raw values come from Chapter 8 Step 1's PR #1235 data. The pinned tuning guide reports the rounded shared range 2.66–2.70 seconds and isolated range 1.42–1.46 seconds, plus the single-stream comparison (`docs/cookbook/qwen3_omni/tuning.md:52-69`). These are H200, thinker-TP2 public experiments. Step 8's TP1 plan is a different topology and needs its own A/B comparison.

### Next

The next step packs all five GPU stages onto one card and accounts for their declared memory shares.

## Step 4 · The 78% thinker share becomes 73% AR

> **In one line:** With no explicit thinker AR fraction, this shipped config subtracts five whole-card percentage points for encoder headroom, leaving 73% for AR.

### On the stage

- The stacked bar splits one H100 into declared stage fractions, the thinker's encoder reserve and the 6% outside these fractions.
- `encoder_mem_reserve` is headroom for encoder work outside the thinker AR engine. It is separate from the image and audio encoder stages' own 2% + 2% declarations.
- The thinker's original 78% appears as two segments: 73% for its effective AR budget and five whole-card percentage points for the reserve.
- The other stage shares stay at 2%, 2%, 10% and 2%.
- This colocated layout permits only TP 1 and no process replicas inside the worker. Every GPU stage must declare a budget. Separate workers behind a router are outside this rule.

### Formula

$$
A=F-E
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $A$ | Effective thinker AR fraction | 0.73 | This step |
| $F$ | Declared thinker stage fraction | 0.78 | H100 BF16 config |
| $E$ | Encoder reserve subtracted before AR sizing | 0.05 | Thinker factory default |

### The numbers on the stage

$$
A=0.78-0.05=0.73=73\%
$$

The subtraction uses fractions of the whole card, so it removes five percentage points rather than 5% of 78%. The declared stage total remains `2 + 2 + 78 + 10 + 2 = 94%`. Splitting 78% into 73% and 5% does not add another 5% to the card. The remaining `100 − 94 = 6%` is outside these declarations, not a measured free-memory reading.

### Boundaries and sources

The config values come from `examples/configs/qwen3_omni_colocated_h100_bf16.yaml:7-20`. The reserve mechanism is in `sglang_omni/models/qwen3_omni/stages.py:155-215,1230-1243,1358-1373`; encoder headroom is described in `backend/server_args_builder.py:176-210`, where `backend/` abbreviates sglang_omni/scheduling/sglang_backend/. With no explicit `thinker.engine.mem_fraction_static`, the factory derives 73%. A matching explicit fraction skips the reserve; a conflicting fraction is rejected (`tests/unit_test/qwen3_omni/test_sglang_ar_budget.py:491-511,540-562`). A byte-sized KV declaration skips the fraction adjustment (`stages.py:1384-1402`). Colocated validation is in `sglang_omni/models/qwen3_omni/placement.py:55-60,84-108,122-187`.

### Next

Memory also depends on the checkpoint's precision, so the next step compares BF16, FP8 and INT4.

## Step 5 · Fewer bits, different stage precisions

> **In one line:** BF16, FP8 and INT4 checkpoints reduce the documented estimate from about 60 to 40 to 30 GB, while INT4 keeps talker AR and code2wav at BF16.

### On the stage

- Precision is the number of bits used to store a weight. A weight is one saved number in the model; a bit is one 0-or-1 digit.
- The three blue bars use one scale for approximate 60, 40 and 30 GB values in a single-GPU H100/H20 section. The source does not define whether the quantity is weights alone, loaded stages, runtime peak or whole-server footprint, so these are not measured per-card budgets.
- BF16 loads thinker and talker AR as BF16. The FP8 checkpoint loads those two AR stages as FP8. The INT4 checkpoint quantizes the thinker transformer layers with 4-bit quantization and group size 128, so each group contains 128 weights; talker AR and code2wav remain BF16.
- The cookbook explicitly names code2wav's BF16 precision for INT4. The implementation also defaults omitted code2wav `dtype` to BF16, so all three precision panels show that default.

### Formula

$$
M_r=\frac{M_p}{M_{BF16}}\times100\%
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $M_r$ | Estimated memory relative to BF16 | percent | This step |
| $M_p$ | Estimated memory for one precision | 60, 40 or 30 GB | Qwen cookbook |
| $M_{BF16}$ | Estimated BF16 memory | 60 GB | Qwen cookbook |

### The numbers on the stage

- FP8: `40 ÷ 60 × 100% ≈ 67%` of BF16, about one third less.
- INT4: `30 ÷ 60 × 100% = 50%` of BF16, about one half less.
- Against FP8, INT4 is `30 ÷ 40 × 100% = 75%`, or 25% less.

These ratios come from approximate values. Bit counts alone cannot produce them because other data and unquantized parts also occupy storage and memory.

### Boundaries and sources

BF16 is the default. The FP8 checkpoint supplies its own precision config; `--dtype fp8` is not the selection mechanism (`docs/cookbook/qwen3_omni.md:153-169`; `sglang_omni/models/weight_loader.py:19-42`). The INT4 stage boundary and estimates are in `docs/cookbook/qwen3_omni.md:181-200`. Code2wav's default dtype is resolved in `components/code2wav_scheduler.py:146-154,1230-1260` and `sglang_omni/models/weight_loader.py:19-26`. Here and in Step 6, `components/` abbreviates sglang_omni/models/qwen3_omni/components/. The compatibility matrix permits each precision for text-only output, separate thinker/talker cards at TP1 or TP2, or one shared card at TP1 (`docs/cookbook/qwen3_omni.md:25-44`). The chapter does not claim a local memory, speed or accuracy measurement.

### Next

After choosing a checkpoint and layout, more simultaneous speech requests may require another talker/code2wav pair rather than another precision.

## Step 6 · Two talker copies, 64 codec slots

> **In one line:** Replica2 keeps one 64-request thinker, adds a second 32-request talker and configures 64 codec-state slots per code2wav process.

### On the stage

- The running cap is the most requests a stage may process at once. It is a scheduler limit, not a measured completion rate.
- Default speech has one thinker capped at 64 and one talker capped at 32. Code2wav shares the thinker's GPU.
- Replica2 adds a second talker/code2wav pair. GPU 1 holds pair `r0`; GPU 2 holds pair `r1`.
- A codec-state slot holds decoder state for one stream. Each code2wav process computes 64 slots from the talker cap and replica count, then owns an independent pool.
- Each replica GPU declares 12.3% for talker and 1.4% for code2wav.

### Formula

$$
Z=X\times Y,\qquad B=P_T+P_C
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $Z$ | Configured codec-state slots | 64 | This step |
| $X$ | Running-request cap per talker | 32 | Qwen speech default |
| $Y$ | Talker process replicas | 2 | Replica2 config |
| $B$ | Declared fraction per replica GPU | 13.7% | This step |
| $P_T$ | Talker fraction | 12.3% | Replica2 config |
| $P_C$ | Code2wav fraction | 1.4% | Replica2 config |

### The numbers on the stage

$$
Z=32\times2=64\ \text{slots}
$$

$$
B=12.3\%+1.4\%=13.7\%
$$

The process total is `5 unchanged + 2 talker_ar + 2 code2wav = 9`. The unchanged five are preprocessing, image encoder, audio encoder, thinker and decode. The 64 slots are a per-code2wav-process factory setting that covers streams the talker replicas can run. Each codec replica owns a separate 64-slot pool; the formula does not describe one deployment-wide pool or 128 sustainable streams. A full pool does not reject a stream. That stream falls back to stateless decoding with left-context frames (`components/code2wav_scheduler.py:296-314`). The slots do not prove 64 sustainable streams or twice the throughput.

### Boundaries and sources

Caps and slot computation: `sglang_omni/models/qwen3_omni/stages.py:1276-1286`, `sglang_omni/models/qwen3_omni/config.py:37,454-496` and `tests/unit_test/qwen3_omni/test_colocation_config.py:177-203`. Each expanded stage instance resolves factory arguments independently (`sglang_omni/pipeline/mp_runner.py:160-177`; `sglang_omni/config/runtime.py:44-61`), and each scheduler constructs its own pool (`code2wav_scheduler.py:1284-1299`). Placement and budgets: `examples/configs/qwen3_omni_speech_replica2.yaml:1-42`. Default pairing keeps each request's codec stream on one GPU; a custom policy need not preserve `r0/r0` and `r1/r1` pairing.

### Next

The next step checks a resolved configuration and then measures it with real traffic instead of treating these caps as results.

## Step 7 · Readiness is not a benchmark

> **In one line:** Readiness proves one small request can finish; a deployment comparison needs controlled traffic and separate benchmark-client and listener clocks.

### On the stage

- Readiness sends a small image, one second of audio and a short instruction. Each token-generating stage is capped at most eight new tokens.
- An arm is one deployment choice in an A/B comparison. The measurement plan holds inputs, sampling, hardware and warmup fixed while changing that one choice.
- The example sweep uses concurrency 1 and 16 with five repeats at each level: ten measured runs per arm. Step 8 substitutes its target concurrency, 8.
- The benchmark client measures first-audio and total-request wall time, throughput and failures. The listener record separately covers playback stalls, stop wait `L−S` and response wait `N−R` from Ch. 12 Step 8.

### Formula

$$
J=K\times Q
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $J$ | Measured runs per comparison arm | 10 | This step |
| $K$ | Concurrency levels | 2: 1 and 16 | Documented sweep |
| $Q$ | Repeats at each level | 5 | Documented sweep |

### The numbers on the stage

$$
J=2\times5=10\ \text{runs per arm}
$$

The ten-run count belongs to the two-level `c = 1,16` example. For Step 8's `c = 8`-only comparison, five repeats give five runs per arm. Warmup runs are separate. Requests inside one run do not become independent experiment repeats, following Ch. 8 Step 8. The p99 boundary has 99% of measured requests at or below it. Report p99 only when the measured sample contains results from at least 100 requests; ten runs alone neither establish nor forbid that sample count. The shipped summary provides first-audio median, p95 and p99. For a custom p90, apply `numpy.percentile(..., 90)` to non-null `per_request.audio_ttfp_s` values from successful streaming requests, separately for each arm and concurrency level.

### Procedure and sources

Resolve the configuration with `sgl-omni config resolve --config <config.yaml> --show config` (`docs/basic_usage/process_topology.md:52-53`). Readiness is defined in `docs/cookbook/qwen3_omni.md:202-204` and `sglang_omni/models/qwen3_omni/config.py:328-366`; its limited warm-up coverage is in `docs/basic_usage/omni.md:345-349`. The SeedTTS sweep and percentile guidance are in `benchmarks/README.md:249-288`. The benchmark client records request wall time (`benchmarks/metrics/performance.py:27-31`; `benchmarks/eval/benchmark_omni_seedtts.py:371,398,408`). The implementation counts requests, not runs, for the p99 warning (`benchmarks/eval/benchmark_omni_seedtts.py:504-505,552-561`; `benchmarks/benchmarker/conditions.py:19-20,95-100`). The shipped summary fields and raw first-audio values are in `benchmarks/metrics/performance.py:219-223,480`. `--generate-only` saves audio and generation-speed records, including success and failure counts; it does not transcribe audio or compute WER or speaker similarity (`benchmarks/README.md:215-220,659`). Keep those completion records, then run transcription, WER and reference-based voice-match checks separately where applicable.

### Next

The final step puts configuration, waiting, data and memory on one decision sheet for the whole book.

## Step 8 · One deployment decision sheet

> **In one line:** An eight-request example starts with default BF16 speech and an isolated talker, then keeps or changes that choice only from recorded evidence.

### On the stage

- The goal is eight concurrent spoken requests with earlier first audio.
- The starting route requests text and audio from the default speech graph. BF16 is the initial checkpoint because it is the default, not because this chapter measured it as best.
- GPU 0 holds the input encoders, thinker and code2wav; GPU 1 holds the talker. This TP1 starting hypothesis is motivated by Step 3's different H200/TP2 experiment and requires a local precision A/B with this layout fixed.
- The talker cap has 24 requests of headroom after subtracting the example's eight requests. No second pair is added before a queue is measured.
- Both evidence arms keep the same two-GPU TP1 hardware, request route, code2wav placement and isolated talker. Arm A uses the default BF16 checkpoint; arm B uses the native FP8 checkpoint, changing only checkpoint precision. At `c = 8`, compare first-audio median and custom p90, total time, failures, memory and listener metrics, and retain per-run raw results. Ch. 8 Step 8 supplies the output-quality checks: completion, word errors and voice match where applicable. Those checks sit outside the generate-only sweep. For an odd number of results, the median is the middle first-audio value; for an even number, it is the mean of the two middle values. Step 3 defined the p90 boundary, and Step 7 defined the custom reduction.
- The bottom map closes the book: Chapters 1–3 cover configuration, routes and binding; 4–6 waiting rules, data and queues; 7–8 memory and measurement; 9–12 optimization and model strategies.

### Formula

$$
V=X-I
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $V$ | Requests of talker-cap headroom | 24 | This step |
| $X$ | Running-request cap per talker | 32 | Step 6 |
| $I$ | Expected concurrent requests in this example | 8 | Constructed goal |

### The numbers on the stage

$$
V=32-8=24\ \text{requests of headroom}
$$

This headroom sits below the configured cap. It is not measured spare throughput or free GPU memory. A real queue, rising first audio tails or another bottleneck must be observed before adding replicas.

### Decision boundary

This is a constructed TP1 starting hypothesis from H200/TP2 evidence, not a benchmark winner. First resolve the configuration and run readiness. Then compare BF16 with native FP8 while holding the starting layout and Step 7's other controls fixed at target concurrency 8. Keep separate first-audio, total-time and listener results, and run the output-quality checks outside the generate-only sweep. Change a choice only after the records identify a problem to solve, which may be memory or quality rather than waiting.

### Next

The next part follows the running service. Chapter 14 answers the closing question: after generation finishes, what happens when a client reads too slowly and audio remains queued in the API process?
