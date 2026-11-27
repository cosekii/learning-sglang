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

The next step opens with a five-axis map: route, placement, precision, capacity and evidence. It then follows requests through these two server modes and shows when the speech stages actually run.

## Step 2 · The requested output picks the route

> **In one line:** A speech server bypasses talker and code2wav unless the request asks for audio output.

### On the stage

- The opening map puts this step at `1 of 5 · route`. The later axes are placement in Steps 3–4, precision in Step 5, capacity in Step 6, and evidence in Steps 7–8.
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
- In the shared panel, the talker also uses GPU 4. Its next step first becomes ready, then waits through the thinker's current turn, then runs when that turn ends. The red dashed link marks that wait.
- In the isolated panel, the talker moves to GPU 2. This preserves the experiment's TP2 topology. The comparison holds the first two bars back until this final topology is visible, so a 2.68-second shared measurement never appears under the isolated label.
- First audio means the first returned audio chunk, not proof of acoustic playback. The p90 boundary has 90% of measured first-audio waits at or below it.
- The two dark bars use the same scale. Their means of two measured p90 values fall from 2.680 to 1.439 seconds.
- The orange card reports a different workload. With one request at a time, total time rises 14–17% after isolation. Its last line limits this to a relative change because the source does not publish the two absolute total times.

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

The single-stream 14–17% increase is the source's reported range. The stage states this relative-only boundary beside the number. The guide does not provide the underlying pair of total times, so the chapter does not invent an absolute bar.

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
- `Explicit AR fraction` means setting AR's whole-card share directly. This config leaves it unset, so the factory derives it. Five percentage points means five of the card's 100 equal shares, not 5% of 78%.
- The other stage shares stay at 2%, 2%, 10% and 2%.
- The bottom panel adds the constructed video-test minimum: 61.0 GB of thinker weights, 4.0 GB of video reserve, 3.1 GB of KV cache, 4.8 GB for encoders and code2wav, 4.8 GB held back and 8.0 GB for the talker. The 85.7 GB total exceeds the 80 GB card by 5.7 GB. Removing the talker's 8.0 GB leaves 77.7 GB, so the talker moves to GPU 1.

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

### The video-test arithmetic on the stage

| Part | Arithmetic | GB |
|---|---|---:|
| Thinker weights | `30.5B × 2 B` | 61.0 |
| Video encoder reserve | `5% × 80 GB` | 4.0 |
| KV cache for the constructed longest request | `32,768 × 96 KB` | about 3.1 |
| Two encoders and code2wav | `(2% + 2% + 2%) × 80 GB` | 4.8 |
| Held back outside declarations | `6% × 80 GB` | 4.8 |
| Talker | `10% × 80 GB` | 8.0 |
| Total | sum of the six rows | about 85.7 |

The overflow is `85.7 − 80 = 5.7 GB`. Removing only the talker gives `85.7 − 8.0 = 77.7 GB`, which fits. These values come from `src/omni/numbers.ts` and reproduce Learning SGLang Ch. 19 Step 4's constructed lower bound. Its 32,768-token KV entry uses the previous limit. The checkpoint's current 65,536-token default raises that entry, so this is not a current peak-memory measurement and the overflow conclusion still holds.

### Boundaries and sources

The config values come from `examples/configs/qwen3_omni_colocated_h100_bf16.yaml:7-20`. The reserve mechanism is in `sglang_omni/models/qwen3_omni/stages.py:155-215,1230-1243,1358-1373`; encoder headroom is described in `backend/server_args_builder.py:176-210`, where `backend/` abbreviates sglang_omni/scheduling/sglang_backend/. With no explicit `thinker.engine.mem_fraction_static`, the factory derives 73%. A matching explicit fraction skips the reserve; a conflicting fraction is rejected (`tests/unit_test/qwen3_omni/test_sglang_ar_budget.py:491-511,540-562`). A byte-sized KV declaration skips the fraction adjustment (`stages.py:1384-1402`). Off the stage, this colocated layout permits only TP 1. A worker is the group of processes running this deployment. One colocated worker cannot add process replicas for a stage; extra copies must run as separate workers behind a router. Every GPU stage declares a budget (`sglang_omni/models/qwen3_omni/placement.py:55-60,84-108,122-187`).

### Next

Memory also depends on the checkpoint's precision, so the next step compares BF16, FP8 and INT4.

## Step 5 · Fewer bits, different stage precisions

> **In one line:** BF16, FP8 and INT4 checkpoints reduce the documented estimate from about 60 to 40 to 30 GB, while INT4 keeps talker AR and code2wav at BF16.

### On the stage

- Precision is the number of bits used to store a weight. A weight is one saved number in the model; a bit is one 0-or-1 digit.
- The three blue bars use one scale for approximate 60, 40 and 30 GB values in a single-GPU H100/H20 section. The source does not define whether the quantity is weights alone, loaded stages, runtime peak or whole-server footprint, so these are not measured per-card budgets.
- The bottom arithmetic shows `40 ÷ 60 ≈ 67%` and `30 ÷ 60 = 50%`. A separate line warns that other data and unquantized parts also use memory, so bit counts alone do not produce the GB estimates.
- BF16 loads thinker and talker AR as BF16. The FP8 checkpoint loads those two AR stages as FP8. The INT4 checkpoint quantizes the thinker transformer layers to 4 bits; talker AR and code2wav remain BF16.
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

These ratios come from approximate values.

### Boundaries and sources

Off the stage, INT4 uses groups of 128 weights. Its approximate estimate is `30 ÷ 40 × 100% = 75%` of FP8, or 25% less. These details are not drawn on this slide.

BF16 is the default. The FP8 checkpoint supplies its own precision config; `--dtype fp8` is not the selection mechanism (`docs/cookbook/qwen3_omni.md:153-169`; `sglang_omni/models/weight_loader.py:19-42`). The INT4 stage boundary and estimates are in `docs/cookbook/qwen3_omni.md:181-200`. Code2wav's default dtype is resolved in `components/code2wav_scheduler.py:146-154,1230-1260` and `sglang_omni/models/weight_loader.py:19-26`. Here and in Step 6, `components/` abbreviates sglang_omni/models/qwen3_omni/components/. The compatibility matrix permits each precision for text-only output, separate thinker/talker cards at TP1 or TP2, or one shared card at TP1 (`docs/cookbook/qwen3_omni.md:25-44`). The chapter does not claim a local memory, speed or accuracy measurement.

### Next

After choosing a checkpoint and layout, more simultaneous speech requests may require another talker/code2wav pair rather than another precision.

## Step 6 · Two talker copies, 64 codec slots

> **In one line:** Replica2 keeps one 64-request thinker, adds a second 32-request talker and configures 64 codec-state slots per code2wav process.

### On the stage

- The running cap is the most requests a stage may process at once. It is a scheduler limit, not a measured completion rate.
- Default speech keeps `image_encoder`, `audio_encoder`, the 64-request thinker and code2wav on GPU 0. Its one talker is capped at 32.
- Replica2 keeps both encoders and the thinker on GPU 0, then adds a second talker/code2wav pair. GPU 1 holds pair `r0`; GPU 2 holds pair `r1`.
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

- The top chain starts with `config resolve`, which checks the parsed settings, then runs readiness, then starts a controlled A/B comparison.
- Readiness sends a small image, one second of audio and a short instruction. Each token-generating stage is capped at most eight new tokens. For a text-only intuition, eight tokens are roughly six English words. Audio tokens carry sound, not words. This is health evidence, not a speed or quality result.
- An arm is one deployment choice in an A/B comparison. The measurement plan holds inputs, sampling, hardware and warmup fixed while changing that one choice. `c` means concurrency, the number of requests running together.
- The example sweep uses concurrency 1 and 16 with five repeats at each level: ten measured runs per arm.
- The benchmark client measures first-audio and total-request wall time, throughput and failures. The listener record separately covers playback stalls, stop wait `L−S` and response wait `N−R` from Ch. 12 Step 8.
- The bottom timeline explains a stall. Ten 80 ms frames make one 800 ms chunk. Chunk 2 is first pending, then ready before chunk 1 ends. If it misses that boundary, the listener hears a gap.

### Formula

$$
J=K\times Q,\qquad D=N\times F
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $J$ | Measured runs per comparison arm | 10 | This step |
| $K$ | Concurrency levels | 2: 1 and 16 | Documented sweep |
| $Q$ | Repeats at each level | 5 | Documented sweep |
| $D$ | Playback time in one audio chunk | 800 ms | This step |
| $N$ | Frames in one chunk | 10 | Learning SGLang Ch. 20 Steps 1–3 |
| $F$ | Playback time per frame | 80 ms | Learning SGLang Ch. 20 Steps 1–3 |

### The numbers on the stage

$$
J=2\times5=10\ \text{runs per arm},\qquad D=10\times80=800\ \text{ms}
$$

The ten-run count belongs to the two-level `c = 1,16` example. Warmup runs are separate. Requests inside one run do not become independent experiment repeats, following Ch. 8 Step 8. The p99 boundary has 99% of measured requests at or below it. Report p99 only when the measured sample contains results from at least 100 requests; ten runs alone neither establish nor forbid that sample count. The 800 ms deadline is playback duration, not a measured code2wav compute budget. The pending and ready states are a constructed timing example.

### Procedure and sources

Resolve the configuration with `sgl-omni config resolve --config <config.yaml> --show config` (`docs/basic_usage/process_topology.md:52-53`). Readiness is defined in `docs/cookbook/qwen3_omni.md:202-204` and `sglang_omni/models/qwen3_omni/config.py:328-366`; its limited warm-up coverage is in `docs/basic_usage/omni.md:345-349`. The SeedTTS sweep and percentile guidance are in `benchmarks/README.md:249-288`. The benchmark client records request wall time (`benchmarks/metrics/performance.py:27-31`; `benchmarks/eval/benchmark_omni_seedtts.py:371,398,408`). The implementation counts requests, not runs, for the p99 warning (`benchmarks/eval/benchmark_omni_seedtts.py:504-505,552-561`; `benchmarks/benchmarker/conditions.py:19-20,95-100`).  `--generate-only` saves audio and generation-speed records, including success and failure counts; it does not transcribe audio or compute WER or speaker similarity (`benchmarks/README.md:215-220,659`). Keep those completion records, then run transcription, WER and reference-based voice-match checks separately where applicable.

### Next

The final step puts configuration, waiting, data and memory on one decision sheet reviewing Chapters 1–12.

## Step 8 · One deployment decision sheet

> **In one line:** An eight-request example starts with default BF16 speech and an isolated talker, then keeps or changes that choice only from recorded evidence.

### On the stage

- The goal is eight concurrent spoken requests with earlier first audio.
- The starting route requests text and audio from the default speech graph. BF16 is the initial checkpoint because it is the default, not because this chapter measured it as best. The precision row tests FP8 first. INT4 needs separate memory and quality evidence and is not part of this first A/B.
- GPU 0 holds the input encoders, thinker and code2wav; GPU 1 holds the talker. This TP1 starting hypothesis is motivated by Step 3's different H200/TP2 experiment and requires a local precision A/B with this layout fixed.
- The talker cap has 24 requests of headroom after subtracting the example's eight requests. No second pair is added before a queue is measured.
- Both evidence arms keep the same two-GPU TP1 hardware, request route, code2wav placement and isolated talker. Arm A uses the default BF16 checkpoint; arm B uses the native FP8 checkpoint, changing only checkpoint precision. The row limits this first comparison to BF16 and FP8 at `c = 8`, with total time, memory and raw results. The decision procedure below adds failures and listener metrics. For an odd number of results, the median is the middle first-audio value; for an even number, it is the mean of the two middle values. The stage defines this as the middle result. Custom p90 means our own 90% cutoff, calculated by the off-stage procedure below rather than the shipped summary. Ch. 8 Step 8 supplies separate output-quality checks where applicable.
- The bottom map reviews Chapters 1–12: Chapters 1–3 cover configuration, routes and binding; 4–6 waiting rules, data and queues; 7–8 memory and measurement; 9–12 optimization and model strategies.
- The closing line defines `queued audio` as sound waiting in the API process for the client to read, then asks what happens when that reader is too slow.

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

This is a constructed TP1 starting hypothesis from H200/TP2 evidence, not a benchmark winner. INT4 is outside this first A/B; the chapter neither rejects it nor claims to have measured it. First resolve the configuration and run readiness. Then compare BF16 with native FP8 while holding the starting layout and Step 7's other controls fixed at target concurrency 8. With only `c = 8`, five repeats give five runs per arm. Off the stage, the shipped summary provides first-audio median, p95 and p99. For the custom p90 named on this slide, apply `numpy.percentile(..., 90)` to non-null `per_request.audio_ttfp_s` values from successful streaming requests, separately for each arm at `c = 8` (`benchmarks/metrics/performance.py:219-223,480`). Keep separate first-audio, total-time and listener results, and run the output-quality checks outside the generate-only sweep. Change a choice only after the records identify a problem to solve, which may be memory or quality rather than waiting.

### Next

The next part follows the running service. The closing cue is `client ← queued audio (API process)`. Chapter 14 answers the closing question: after generation finishes, what happens when a client reads too slowly and audio remains queued in the API process?
