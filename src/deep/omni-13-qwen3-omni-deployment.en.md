## Step 1 · Two startup shapes

> **In one line:** The same Qwen3-Omni checkpoint starts one process on one GPU for text-only deployment, or seven processes on two GPUs for default speech.

### On the stage

- A checkpoint is the set of saved model files loaded by the server.
- The left dashed box is one `pipeline` process containing all six text-only stages.
- The right panel gives each speech stage its own process. Four processes use GPU 0, one uses GPU 1, and two use only CPU.
- Blue marks GPU stages. White boxes with faint outlines mark CPU stages. These are startup shapes, not measured utilization.
- Both deployments accept text, image, audio or video input. Step 2 covers output routes separately.

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

- The opening map puts this step at `1 of 5 · route`. The later axes are placement in Steps 3–5, precision in Step 6, capacity in Steps 7–8, and evidence in Steps 9–10.
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

The exact four raw values come from Chapter 8 Step 1's PR #1235 data. The pinned tuning guide reports the rounded shared range 2.66–2.70 seconds and isolated range 1.42–1.46 seconds, plus the single-stream comparison (`docs/cookbook/qwen3_omni/tuning.md:52-69`). These are H200, thinker-TP2 public experiments. Step 10's TP1 plan is a different topology and needs its own A/B comparison.

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

The config values come from `examples/configs/qwen3_omni_colocated_h100_bf16.yaml:7-20`. The reserve mechanism is in `sglang_omni/models/qwen3_omni/stages.py:155-215,1230-1243,1358-1373`; encoder headroom is described in `backend/server_args_builder.py:176-210`, where `backend/` abbreviates sglang_omni/scheduling/sglang_backend/. With no explicit `thinker.engine.mem_fraction_static`, the factory derives 73%. A matching explicit fraction skips the reserve; a conflicting fraction is rejected (`tests/unit_test/qwen3_omni/test_sglang_ar_budget.py:491-511,540-562`). A byte-sized KV declaration skips the fraction adjustment (`stages.py:1384-1402`). Off the stage, this colocated layout permits only TP 1. A worker is the group of processes running this deployment. One colocated worker cannot add process replicas for a stage; extra copies must run as separate workers behind a router. Every GPU stage declares a budget (`sglang_omni/models/qwen3_omni/placement.py:55-60,84-108,122-187`).

### Next

The next step tests a separate video example in GB and asks whether it fits on one card.

## Step 5 · The current default still overflows after the talker moves

> **In one line:** At 65,536 tokens, moving the 8 GB talker leaves 80.891456 GB, still 0.891456 GB above the card.

### On the stage

- Both panels share 82.6 GB before KV: 61.0 GB of thinker weights, 4.0 GB of video reserve, 4.8 GB for other stages, 4.8 GB held back and 8.0 GB for the talker. The weight row uses `30.5B × 2 B`; the other rows use Step 4's shares.
- The previous panel uses 32,768 tokens. Its KV entry is 3.145728 GB, its before total is 85.745728 GB and moving the talker leaves 77.745728 GB, which fits with 2.254272 GB free.
- The current-default panel uses 65,536 tokens. Its KV entry is 6.291456 GB, its before total is 88.891456 GB and moving the talker leaves 80.891456 GB, still 0.891456 GB over.
- All four bars use the same 0–90 GB scale and the same 80 GB dashed card line. Blue stays on GPU 0, orange is the talker and red is overflow.

### Formula

$$
\begin{gathered}
B=W+V+O+H+X\\
K_n=n\times96\times10^{-6}\ \mathrm{GB}
\end{gathered}
$$
$$
\begin{gathered}
T_n=B+K_n\\
S_n=T_n-X\\
D_n=S_n-C
\end{gathered}
$$

| Symbol | Meaning, size and source |
|---|---|
| $B$ | Shared total before KV: 82.6 GB from $W+V+O+H+X$. |
| $W$ | Thinker weights: 61.0 GB from `30.5B × 2 B`. |
| $V$ | Video encoder reserve: 4.0 GB from `5% × 80 GB`. |
| $O$ | Other stages: 4.8 GB from `(2% + 2% + 2%) × 80 GB`. |
| $H$ | Held back outside declarations: 4.8 GB from `6% × 80 GB`. |
| $X$ | Talker: 8.0 GB from `10% × 80 GB`. |
| $n$ | Token limit: 32,768 from the tutorial snapshot or 65,536 from PR #2735. |
| $K_n$ | KV cache at limit $n$: 3.145728 or 6.291456 GB from $n\times96\ \mathrm{KB}$. |
| $T_n$ | Total before the move: $B+K_n$, 85.745728 or 88.891456 GB. |
| $S_n$ | What remains after the move: $T_n-X$, 77.745728 or 80.891456 GB. |
| $C$ | H100 capacity in this example: 80 GB from Learning SGLang Ch. 19 Step 4. |
| $D_n$ | Remaining demand minus card capacity: −2.254272 GB fits; +0.891456 GB overflows. |

### The numbers on the stage

- Previous, $n=32{,}768$: `K_n = 32,768 × 96 KB = 3.145728 GB` and `T_n = 82.6 + 3.145728 = 85.745728 GB`.
- After the previous move: `S_n = 85.745728 − 8 = 77.745728 GB` and `D_n = 77.745728 − 80 = −2.254272 GB`, so it fits.
- Current default, $n=65{,}536$: `K_n = 65,536 × 96 KB = 6.291456 GB` and `T_n = 82.6 + 6.291456 = 88.891456 GB`.
- After the current move: `S_n = 88.891456 − 8 = 80.891456 GB` and `D_n = 80.891456 − 80 = 0.891456 GB`, so it still overflows.

Here `30.5B` means 30.5 billion saved values and `2 B` means 2 bytes per value. Before the move, the two examples overflow by `85.745728 − 80 = 5.745728 GB` and `88.891456 − 80 = 8.891456 GB`. The current default still overflows after the move.

### Boundaries and sources

The values come from `src/omni/numbers.ts`. The previous panel reproduces Learning SGLang Ch. 19 Step 4's 32,768-token tutorial snapshot. Since PR #2735, SGLang-Omni takes the thinker limit from the checkpoint context by default; the Instruct checkpoint uses 65,536 tokens. These are constructed configuration lower bounds, not measured peak-memory occupancy.

### Next

Memory also depends on the checkpoint's precision, so the next step compares BF16, FP8 and INT4.

## Step 6 · Fewer bits, smaller documented estimates

> **In one line:** BF16, FP8 and INT4 reduce the documented estimate from about 60 to 40 to 30 GB.

### On the stage

- Precision is the number of bits used to store a weight. A weight is one saved number in the model; a bit is one 0-or-1 digit.
- The three blue bars use one scale for approximate 60, 40 and 30 GB values in a single-GPU H100/H20 section. The source does not define whether the quantity is weights alone, loaded stages, runtime peak or whole-server footprint, so these are not measured per-card budgets.
- The bottom arithmetic shows `40 ÷ 60 ≈ 67%` and `30 ÷ 60 = 50%`. A separate line warns that other data and unquantized parts also use memory, so bit counts alone do not produce the GB estimates.

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

Off the stage, BF16 loads thinker and talker AR as BF16. The FP8 checkpoint loads those two AR stages as FP8. The INT4 checkpoint quantizes the thinker transformer layers to 4 bits; talker AR and code2wav remain BF16. The cookbook explicitly names code2wav's BF16 precision for INT4, and the implementation defaults omitted code2wav `dtype` to BF16.

BF16 is the default. The FP8 checkpoint supplies its own precision config; `--dtype fp8` is not the selection mechanism (`docs/cookbook/qwen3_omni.md:153-169`; `sglang_omni/models/weight_loader.py:19-42`). The INT4 stage boundary and estimates are in `docs/cookbook/qwen3_omni.md:181-200`. Code2wav's default dtype is resolved in `components/code2wav_scheduler.py:146-154,1230-1260` and `sglang_omni/models/weight_loader.py:19-26`. Here and in Steps 7 and 8, `components/` abbreviates sglang_omni/models/qwen3_omni/components/. The compatibility matrix permits each precision for text-only output, separate thinker/talker cards at TP1 or TP2, or one shared card at TP1 (`docs/cookbook/qwen3_omni.md:25-44`). The chapter does not claim a local memory, speed or accuracy measurement.

### Next

After choosing a checkpoint and layout, more simultaneous speech requests may require another talker/code2wav pair rather than another precision.

## Step 7 · Add one speech pair

> **In one line:** Replica2 adds a second talker/code2wav pair while every talker keeps the same 32-request running cap.

### On the stage

- The running cap is the most requests a stage may process at once. It is a scheduler limit, not a measured completion rate.
- Default speech keeps `image_encoder`, `audio_encoder`, thinker and code2wav on GPU 0. Its one talker uses GPU 1 and has a 32-request cap. Code2wav does not move to GPU 1 in this panel.
- Replica2 keeps both encoders and the thinker on GPU 0, then runs a talker/code2wav pair on each of GPU 1 and GPU 2. GPU 1 holds pair `r0`; GPU 2 holds pair `r1`. Each talker still has a 32-request cap.
- A replica means another talker/code2wav pair. The two pairs configure room for requests; they do not measure completed requests per second.

### The numbers on the stage

| Deployment | Talker + code2wav processes | Running cap per talker |
|---|---:|---:|
| Default speech | 1 + 1 | 32 |
| Replica2 | 2 + 2 | 32 |

### Boundaries and sources

Off the stage, the thinker default is 64 running requests. The process total is `5 unchanged + 2 talker_ar + 2 code2wav = 9`; the unchanged five are preprocessing, image encoder, audio encoder, thinker and decode. Each replica GPU declares `12.3% + 1.4% = 13.7%` for talker and code2wav. These facts do not appear on this slide.

Caps come from `sglang_omni/models/qwen3_omni/stages.py:1276-1286` and `sglang_omni/models/qwen3_omni/config.py:37,454-496`. Placement, process counts and budgets come from `examples/configs/qwen3_omni_speech_replica2.yaml:1-42`. Default pairing keeps each request's codec stream on one GPU; a custom policy need not preserve `r0/r0` and `r1/r1` pairing.

### Next

The next step uses these two talkers to derive each code2wav process's own codec-state pool.

## Step 8 · Two independent codec pools

> **In one line:** Two talkers make each code2wav process configure 64 state slots, and each process owns a separate pool.

### On the stage

- A codec-state slot holds decoder state for one stream. Step 7 supplied the 32-request cap per talker.
- Default speech has one talker, so its code2wav process configures `32 × 1 = 32` slots in its own pool.
- In Replica2, both talkers feed each code2wav process's capacity calculation. Process `r0` configures `32 × 2 = 64` slots in its own pool. Process `r1` does the same in a separate pool. This sizes capacity; default pairing still routes each stream to only one codec.
- The two pools are not one deployment-wide pool of 128. They configure room, not twice the throughput.

### Formula

$$
Z=X\times Y
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $Z$ | Configured codec-state slots per code2wav process | 64 | This step |
| $X$ | Running-request cap per talker | 32 | Step 7 |
| $Y$ | Talker process replicas | 2 | Step 7 |

### The numbers on the stage

$$
Z=32\times2=64\ \text{slots per code2wav process}
$$

A full pool does not reject a stream. That stream falls back to stateless decoding with left-context frames (`components/code2wav_scheduler.py:296-314`). The slots do not prove 64 sustainable streams or twice the throughput.

### Boundaries and sources

Slot computation: `sglang_omni/models/qwen3_omni/config.py:468-476` and `tests/unit_test/qwen3_omni/test_colocation_config.py:177-203`. Each expanded stage instance resolves factory arguments independently (`sglang_omni/pipeline/mp_runner.py:160-177`; `sglang_omni/config/runtime.py:44-61`), and each scheduler constructs its own pool (`components/code2wav_scheduler.py:1284-1299`). Default pairing keeps each request's codec stream on one GPU; a custom policy need not preserve `r0/r0` and `r1/r1` pairing.

### Next

The next step checks a resolved configuration and then measures it with real traffic instead of treating these caps as results.

## Step 9 · Readiness is not a benchmark

> **In one line:** Replica2 readiness sends two small requests one at a time and marks the server up after both return HTTP 200; A/B then changes one choice and records client time and listener stalls separately.

### On the stage

- The top line gives the order for Step 7's replica2 config: finish two warmups in order, then compare one choice.
- Each warmup uses the same small image, one second of audio and short instruction. Each token-generating stage produces at most eight new tokens. HTTP 200 means that request finished; it shows health, not speed.
- The launcher takes the warmup count from `max(process.num_replicas)`, which is 2 here. Warmup 1 must return HTTP 200 before warmup 2 starts. The first 200 leaves the server `STARTING`; only the second 200 makes it `UP`.
- A/B sends the same requests to both choices and changes one deployment choice. The measurement plan holds inputs, sampling, hardware and warmup fixed. Choice A keeps the first choice; choice B changes one thing.
- The benchmark client records first-audio and total-request wall time. The listener separately records playback stalls.
- The bottom timeline explains a stall. Ten 80 ms frames make one 800 ms chunk. Chunk 2 is first pending, then ready before chunk 1 ends. A late chunk 2 would leave a gap in playback.

### Formula

$$
D=N\times F
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $D$ | Playback time in one audio chunk | 800 ms | This step |
| $N$ | Frames in one chunk | 10 | Learning SGLang Ch. 20 Steps 1–3 |
| $F$ | Playback time per frame | 80 ms | Learning SGLang Ch. 20 Steps 1–3 |

### The numbers on the stage

$$
D=10\times80=800\ \text{ms}
$$

The 800 ms deadline is playback duration, not a measured code2wav compute budget. The pending and ready states form a constructed timing example.

### Off-stage procedure and sources

Before this slide, resolve the configuration with `sgl-omni config resolve --config <config.yaml> --show config` (`docs/basic_usage/process_topology.md:52-53`). Readiness is defined in `docs/cookbook/qwen3_omni.md:202-204` and <code>sglang_omni/models/qwen3_omni/<wbr>config.py:328-366</code>; its limited warm-up coverage is in `docs/basic_usage/omni.md:345-349`.

The launcher computes <code>num_replicas = max(<wbr>process.num_replicas)</code>, creates that many copies of the warmup request and sends them one at a time (<code>sglang_omni/serve/<wbr>launcher.py:552-605,761-770</code>). Consecutive admissions bind the replicas round robin, so two requests warm both replicas of the most replicated process. `send_warmup_requests` checks each response for HTTP 200 before starting the next request. `warm_up_server` sets `ServerStatus.UP` only after every request succeeds (`launcher.py:666-675`). A non-200 response stops startup instead of marking the server ready.

The documented SeedTTS sweep is a separate example from the stage. It uses concurrency 1 and 16 with five repeats at each level, giving `2 levels × 5 repeats = 10 runs per choice`. Here `c` means concurrency, the number of requests running together. Warmup runs are separate, and requests inside one run do not become independent experiment repeats, following Ch. 8 Step 8. Keep throughput, failure, memory and raw per-run records (`benchmarks/README.md:249-288`).

The benchmark client records request wall time (`benchmarks/metrics/performance.py:27-31`; <code>benchmarks/eval/<wbr>benchmark_omni_seedtts.py:371,398,408</code>). Ch. 12 Step 8's stop wait `L−S` and response wait `N−R` remain separate listener clocks. The shipped p99 boundary has 99% of measured requests at or below it. Report p99 only when the measured sample contains results from at least 100 requests; ten runs alone neither establish nor forbid that sample count (<code>benchmarks/eval/<wbr>benchmark_omni_seedtts.py:504-505,552-561</code>; `benchmarks/benchmarker/conditions.py:19-20,95-100`).

`--generate-only` saves audio and generation-speed records, including success and failure counts. It does not transcribe audio or compute WER or speaker similarity (`benchmarks/README.md:215-220,659`). Keep those completion records, then run transcription, WER and reference-based voice-match checks separately where applicable.

### Next

The final step applies this method to one eight-request BF16/FP8 comparison.

## Step 10 · The first A/B changes precision only

> **In one line:** An eight-request example holds the two-GPU layout fixed, compares only BF16 with FP8 weight precision, and decides from the recorded evidence.

### On the stage

- The goal is `c = 8`, meaning eight spoken requests running together, with earlier first audio. The fixed route requests text and audio from the default speech graph.
- The fixed placement keeps input encoders, thinker and code2wav on GPU 0 and the talker on GPU 1. `TP1 = one thinker process` means the thinker is not split across GPUs. This two-GPU starting hypothesis is motivated by Step 3's different H200/TP2 experiment.
- The fixed capacity leaves `32 − 8 = 24` requests of talker-cap headroom. No second pair is added before a queue is measured.
- The first A/B changes only the precision used to store weights, using Step 6's BF16 and FP8 labels. Both choices use the same cards and the same eight requests. Five repeats make five runs per choice. INT4 needs separate memory and quality evidence and is not part of this A/B.
- The first-audio record keeps two summaries of the same waits. The median is the middle wait, and p90 uses Step 3's definition. For an odd number of results, the median is the middle value; for an even number, it is the mean of the two middle values. The off-stage procedure below calculates p90 because the shipped summary does not provide it.
- The other records are total time, playback stalls, failures, memory and raw per-run results. Output-quality checks run separately, following Ch. 8 Step 8; they sit outside generate-only.
- The decision rule compares all records before keeping BF16 or switching to FP8. Any later change needs another comparison. No local model run has produced a measured winner. The closing line defines `queued audio` as sound waiting in the API process for the client to read, then asks what happens when that reader is too slow.

### Formula

$$
V=X-I
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $V$ | Requests of talker-cap headroom | 24 | This step |
| $X$ | Running-request cap per talker | 32 | Step 7 |
| $I$ | Expected concurrent requests in this example | 8 | Constructed goal |

### The numbers on the stage

$$
V=32-8=24\ \text{requests of headroom}
$$

This headroom sits below the configured cap. It is not measured spare throughput or free GPU memory. A real queue, rising first audio tails or another bottleneck must be observed before adding replicas.

### Decision boundary

This is a constructed TP1 starting hypothesis from H200/TP2 evidence, not a benchmark winner. INT4 is outside this first A/B; the chapter neither rejects it nor claims to have measured it. First resolve the configuration and run readiness. The stage's BF16 and FP8 labels name weight precision. The actual choice A uses the default BF16 checkpoint, and choice B uses the native FP8 checkpoint. Hold the starting layout and Step 9's other controls fixed at target concurrency 8. With only `c = 8`, five repeats give five runs per arm. Off the stage, the shipped summary provides first-audio median, p95 and p99. For the p90 shown on this slide, apply `numpy.percentile(..., 90)` to non-null `per_request.audio_ttfp_s` values from successful streaming requests, separately for each arm at `c = 8` (`benchmarks/metrics/performance.py:219-223,480`). Keep separate first-audio, total-time and listener results, and run the output-quality checks outside the generate-only sweep. Compare all records before keeping BF16 or switching to FP8; memory or quality can outweigh a first-audio gain. Retest after any later change.

### Next

The next part follows the running service. The closing cue is `client ← queued audio (API process)`. Chapter 14 answers the closing question: after generation finishes, what happens when a client reads too slowly and audio remains queued in the API process?
