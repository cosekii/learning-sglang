## Step 1 · Two startup bills

> **In one line:** The same Qwen3-Omni checkpoint starts one process on one GPU for text, or seven processes on two GPUs for default speech.

### On the stage

- A checkpoint is the set of saved model files loaded by the server.
- The left dashed box is one `pipeline` process containing all six text-only stages.
- The right panel gives each speech stage its own process. Four processes use GPU 0, one uses GPU 1, and two use only CPU.
- Blue marks GPU stages. Grey marks CPU stages. These are startup shapes, not measured utilization.
- Both deployments accept text, image, audio or video input. “Text-only” limits the output, not the input.

### The numbers on the stage

| Deployment | Stages | Stage processes | GPUs |
|---|---:|---:|---:|
| Text-only | 6 | 1 | 1 |
| Default speech | 7 | 4 + 1 + 2 = 7 | 2 |

The speech sum groups four GPU-0 processes, one GPU-1 process and two CPU processes. The six text-only stages include `mm_aggregate`, which joins the preprocessing and active encoder branches before the thinker.

### Boundaries and sources

These counts come from `sglang_omni/models/qwen3_omni/config.py:136-147,257-318,412-452`. Multimodal input in text-only mode comes from `docs/cookbook/qwen3_omni.md:46-57`. The counts exclude the HTTP server and coordinator.

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

Route construction and terminal stages: `sglang_omni/models/qwen3_omni/config.py:136-189,212-302` and `sglang_omni/models/qwen3_omni/request_builders.py:200-261`. Request behavior: `docs/basic_usage/omni.md:154-170,199-200,386-395` and `docs/cookbook/qwen3_omni.md:206-208`.

### Next

Once audio activates the talker, its GPU placement changes the first-sound wait.

## Step 3 · Isolate the talker, then check both clocks

> **In one line:** Talker isolation nearly halved p90 first-sound wait at concurrency eight, but increased single-stream total time.

### On the stage

- Both placement panels keep code2wav beside the thinker. Only the talker moves from GPU 0 to GPU 1.
- The two dark bars use the same scale. At eight concurrent requests, the mean p90 first-sound wait falls from 2.680 to 1.439 seconds.
- The red card reports a different workload. With one request at a time, total time rises 14–17% after isolation.

### Formula

$$
\overline{T}=\frac{T_1+T_2}{2},\qquad R=\left(1-\frac{\overline{T}_{alone}}{\overline{T}_{shared}}\right)\times100\%
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $T_1,T_2$ | Two measured p90 first-sound values | seconds | Public placement runs |
| $\overline{T}$ | Their arithmetic mean | seconds | This step |
| $R$ | Wait reduction after isolation | percent | This step |

### The numbers on the stage

$$
\overline{T}_{shared}=(2.697+2.663)\div2=2.680\ \text{s}
$$

$$
\overline{T}_{alone}=(1.463+1.415)\div2=1.439\ \text{s}
$$

$$
R=(1-1.439\div2.680)\times100\%\approx46\%
$$

The single-stream 14–17% increase is the source's reported range. It has no absolute bar here because the guide does not provide the underlying pair of total times in this table.

### Boundaries and sources

These are public experiments from `docs/cookbook/qwen3_omni/tuning.md:52-69`, not measurements of this chapter's H100 colocated profile. The concurrency-eight experiment holds code2wav placement fixed. The single-stream result shows why first sound and total time need separate verdicts.

### Next

The next step packs all five GPU stages onto one card and accounts for their declared memory shares.

## Step 4 · The 78% thinker share becomes 73% AR

> **In one line:** The colocated thinker subtracts a 5% encoder reserve from its declared 78% share before sizing its AR engine.

### On the stage

- The stacked bar splits one H100 into declared stage fractions, the thinker's encoder reserve and the 6% outside these fractions.
- The thinker's original 78% appears as two segments: 73% for its effective AR budget and 5% for `encoder_mem_reserve`.
- The other stage shares stay at 2%, 2%, 10% and 2%.
- This colocated layout permits only TP 1 and no talker/code2wav process replicas. Every GPU stage must declare a budget.

### Formula

$$
A=S-E
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $A$ | Effective thinker AR fraction | 73% | This step |
| $S$ | Declared thinker stage fraction | 78% | H100 BF16 YAML |
| $E$ | Encoder reserve subtracted before AR sizing | 5% | Thinker factory default |

### The numbers on the stage

$$
A=78\%-5\%=73\%
$$

The declared stage total remains `2 + 2 + 78 + 10 + 2 = 94%`. Splitting 78% into 73% and 5% does not add another 5% to the card. The remaining `100 − 94 = 6%` is outside these declarations, not a measured free-memory reading.

### Boundaries and sources

The YAML values come from `examples/configs/qwen3_omni_colocated_h100_bf16.yaml:7-20`. The reserve mechanism is in `sglang_omni/models/qwen3_omni/stages.py:1230-1243,1358-1373`; the same reserve rule is tested in `tests/unit_test/qwen3_omni/test_sglang_ar_budget.py:476-488,514-537`. An explicit matching AR fraction or a byte-sized KV declaration changes this path. Colocated validation is in `sglang_omni/models/qwen3_omni/placement.py:55-60,84-108,122-187`.

### Next

Memory also depends on the checkpoint's precision, so the next step compares BF16, native FP8 and AutoRound INT4.

## Step 5 · Fewer bits, different stage precisions

> **In one line:** BF16, FP8 and INT4 checkpoints reduce the documented memory estimate from about 60 to 40 to 30 GB, but INT4 does not quantize the speech talker or code2wav.

### On the stage

- A bit is one 0-or-1 digit. Quantization stores weights with fewer bits and fewer representable levels.
- The three blue bars use one scale for the cookbook's approximate 60, 40 and 30 GB memory values.
- BF16 loads thinker and talker AR as BF16. Native FP8 loads those AR stages from an FP8 checkpoint.
- AutoRound is the quantization method named by the INT4 checkpoint. It quantizes thinker transformer layers to 4-bit groups of 128; talker and code2wav remain BF16.
- All three rows support text-only, disaggregated TP1/TP2 and colocated TP1.

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

These ratios come from the cookbook's approximate values. They are not calculated by dividing 16, 8 and 4, because scales, unquantized parts and other files also occupy storage and memory.

### Boundaries and sources

Compatibility: `docs/cookbook/qwen3_omni.md:25-44`. FP8 checkpoint loading: `docs/cookbook/qwen3_omni.md:153-169`; supported dtype strings are in `sglang_omni/models/weight_loader.py:19-42`, so `--dtype fp8` is not the mechanism. INT4 stage boundaries and estimates: `docs/cookbook/qwen3_omni.md:181-200`. The chapter does not claim a local memory, speed or accuracy measurement.

### Next

After choosing a checkpoint and layout, more simultaneous speech requests may require another talker/code2wav pair rather than another precision.

## Step 6 · Two talker copies, 64 codec slots

> **In one line:** Replica2 keeps one 64-request thinker, adds a second 32-request talker and configures 64 codec-state slots.

### On the stage

- The running cap is the most requests a stage may process at once. It is a scheduler limit, not a measured completion rate.
- Default speech has one thinker capped at 64 and one talker capped at 32. Code2wav shares the thinker's GPU.
- Replica2 adds a second talker/code2wav pair. GPU 1 holds pair `r0`; GPU 2 holds pair `r1`.
- A codec-state slot holds decoder state for one stream. The code2wav factory computes 64 slots from the talker cap and replica count.
- Each replica GPU declares 12.3% for talker and 1.4% for code2wav.

### Formula

$$
Z=X\times Y,\qquad B=P_T+P_C
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $Z$ | Configured codec-state slots | 64 | This step |
| $X$ | Running-request cap per talker | 32 | Qwen speech default |
| $Y$ | Talker process replicas | 2 | Replica2 YAML |
| $B$ | Declared fraction per replica GPU | 13.7% | This step |
| $P_T$ | Talker fraction | 12.3% | Replica2 YAML |
| $P_C$ | Code2wav fraction | 1.4% | Replica2 YAML |

### The numbers on the stage

$$
Z=32\times2=64\ \text{slots}
$$

$$
B=12.3\%+1.4\%=13.7\%
$$

The 64 slots are a code2wav factory setting that covers streams the talker replicas can run. They do not prove 64 sustainable streams, 64 simultaneous audio outputs without queueing or twice the throughput.

### Boundaries and sources

Caps and slot computation: `sglang_omni/models/qwen3_omni/stages.py:1276-1286`, `sglang_omni/models/qwen3_omni/config.py:37,454-496` and `tests/unit_test/qwen3_omni/test_colocation_config.py:177-203`. Placement and budgets: `examples/configs/qwen3_omni_speech_replica2.yaml:1-42`. Default round-robin advances equal-sized replica sets together, but a custom policy need not preserve `r0/r0` and `r1/r1` pairing.

### Next

The next step checks a resolved configuration and then measures it with real traffic instead of treating these caps as results.

## Step 7 · Readiness is not a benchmark

> **In one line:** Readiness proves one small request can finish; a deployment comparison needs controlled traffic and separate server and listener clocks.

### On the stage

- Readiness sends a small image, one second of audio and a short instruction. Each token-generating stage is capped at eight new tokens.
- The measurement plan holds inputs, sampling, hardware and warmup fixed while changing one deployment choice.
- The example sweep uses concurrency 1 and 16 with five repeats at each level: ten measured runs per arm.
- The server clock covers first audio, total time, throughput and failures. The listener clock covers stalls, stop wait `L−S` and response wait `N−R` from Chapter 12 Step 8.

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

Warmup runs are separate. Requests inside one run do not become independent experiment repeats, following Chapter 8 Step 8. A p99 estimate needs at least 100 measured samples, so this ten-run example does not support p99.

### Procedure and sources

Resolve the configuration with `sgl-omni config resolve --config <config.yaml> --show config` (`docs/basic_usage/process_topology.md:52-53`). Readiness is defined in `docs/cookbook/qwen3_omni.md:202-204` and `sglang_omni/models/qwen3_omni/config.py:328-366`. The SeedTTS sweep and percentile guidance are in `benchmarks/README.md:249-288`. Compare output quality as well as time: completion, word errors and voice match where applicable.

### Next

The final step puts configuration, waiting, data and memory on one decision sheet for the whole book.
