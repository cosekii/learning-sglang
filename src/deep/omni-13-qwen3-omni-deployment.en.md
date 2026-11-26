## Step 1 · Two startup bills

> **In one line:** The same Qwen3-Omni checkpoint starts one process on one GPU for text, or seven processes on two GPUs for default speech.

### On the stage

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
