## Step 1 · Five GPU stages, one memory budget

> **In one sentence:** The configuration assigns 94% of one GPU's declared memory budget to five stages, leaving 6% unassigned.

### What the picture shows

This step reviews the stage names from the first book's Ch.17 and the five memory shares from Ch.19 Step 3; it does not introduce their model roles again.

- The left box copies the five `gpu_memory_fraction` fields from the YAML file.
- On the right, each of the 100 squares is 1% of one GPU's declared budget. Blue squares are assigned to these five stages; white squares are unassigned.
- `preprocessing` and `decode` are CPU stages in the same seven-stage topology. They are not missing from the GPU budget; they do not declare a GPU fraction here.

### The arithmetic

| Stage | YAML fraction | Percentage |
|---|---:|---:|
| `image_encoder` | 0.02 | 2% |
| `audio_encoder` | 0.02 | 2% |
| `thinker` | 0.78 | 78% |
| `talker_ar` | 0.10 | 10% |
| `code2wav` | 0.02 | 2% |

Multiply a fraction by 100 to read it as a percentage: `0.02 × 100 = 2%`. Then `2 + 2 + 78 + 10 + 2 = 94%`, so `100 - 94 = 6%` remains unassigned. Placement checks these fractions per GPU rather than treating them as measured allocations.

### What the configuration does next

`serve --config` loads the YAML into patches, resolves a validated pipeline configuration, and hands it to the multi-process runner. The runner builds the process plan; each child process creates its scheduler with `gpu_id` and `total_gpu_memory_fraction`.

### Scope and sources

This is a static reading of one colocated worker, not an H100 measurement. The CI can start two independent workers behind an external router; this picture shows only one worker's visible GPU 0. It also omits the two CPU stages to keep this step about one GPU budget.

Sources on `sglang-omni origin/main@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`:

- Fractions: `examples/configs/qwen3_omni_colocated_h100_bf16.yaml:7-20`.
- Default GPU placement and the seven-stage topology: `sglang_omni/models/qwen3_omni/config.py:192-199`, `sglang_omni/models/qwen3_omni/config.py:268-318`, `sglang_omni/models/qwen3_omni/config.py:499-521`.
- Shared-card placement and per-GPU budget checks: `sglang_omni/models/qwen3_omni/placement.py:122-144`, `sglang_omni/config/placement.py:252-285`.
- YAML loading and runtime construction: `sglang_omni/config/sources.py:407-460`, `sglang_omni/config/resolver.py:54-91`, `sglang_omni/pipeline/runtime_config.py:123-172`, `sglang_omni/pipeline/stage_workers.py:1298-1326`.

### Next

The next steps connect more configuration fields to the stage, process, device and request-route maps.

## Step 2 · Seven stages, six processes

> **In one line:** This configuration places `talker_ar` and `code2wav` in one process, so seven stages start six stage processes.

### On the stage

- The left side lists the model topology's seven stages in their source construction order.
- Each box on the right is one stage process. The first five processes hold one stage each; the blue `talker_ar` process holds two.
- `CPU` means no stage in that process has a GPU assignment. `GPU 0` means every stage in the box uses the same GPU as Step 1.
- The count covers stage processes only, not their parent launcher. This reading did not start the model locally.

### The numbers on the stage

The first five processes hold one stage each, and the last holds two:

$$1 + 1 + 1 + 1 + 1 + 2 = 7\ \text{stages}$$

$$5 + 1 = 6\ \text{stage processes}$$

The process count falls because two stages share, not because a stage disappears. All five GPU memory budgets from Step 1 remain: `code2wav` still uses GPU 0 but shares the `talker_ar` process.

### How the configuration becomes processes

`COLOCATED_SPEECH_PROCESSES` assigns a `process` name to each stage. Both `code2wav` and `talker_ar` receive the name `talker_ar`. Topology groups stages by that name, and each group becomes one `StageWorkerProcessSpec`; the runner creates one stage process per group.

### Scope and sources

Sources on `sglang-omni origin/main@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`:

- The seven stages and their construction order: `sglang_omni/models/qwen3_omni/config.py:268-302`.
- The default process names and `code2wav` joining `talker_ar`: `sglang_omni/models/qwen3_omni/config.py:305-318`.
- The colocated configuration sets both `thinker_gpu` and `talker_gpu` to 0: `sglang_omni/models/qwen3_omni/config.py:499-521`. The `preprocessing` and `decode` constructors have no `gpu` argument: `sglang_omni/models/qwen3_omni/config.py:57-87`, `sglang_omni/models/qwen3_omni/config.py:192-199`.
- Process groups form by `process` name: `sglang_omni/config/topology.py:365-382`.
- Each group produces one process specification: `sglang_omni/pipeline/mp_runner.py:244-260`; each specification starts one child process: `sglang_omni/pipeline/stage_workers.py:422-456`.

### Next

The next diagram groups Step 2's six processes into GPU and CPU-only groups.

## Step 3 · Four processes use GPU, two use only CPU

> **In one line:** Step 2's six processes split by device: four use GPU 0 and two use only CPU, still six in total.

### On the stage

- Here, a device means a GPU or CPU; this step groups Step 2's six processes by that one distinction.
- The blue group contains four processes using the same GPU 0 as Step 1. `GPU 0` identifies that one card; it does not mean four cards.
- `preprocessing` and `decode` in the gray group have no GPU setting and run only on CPU.
- One box still represents one process. The `talker_ar` box lists both `talker_ar` and `code2wav`, but counts once.
- Blue marks the group and processes using GPU 0; gray marks the CPU-only group and processes.

### The numbers on the stage

| Device | Processes | Count |
|---|---|---:|
| GPU 0 | `image_encoder`, `audio_encoder`, `thinker`, `talker_ar` | 4 |
| CPU only | `preprocessing`, `decode` | 2 |

$$4 + 2 = 6\ \text{processes}$$

This counts processes, not stages. The four GPU processes hold five GPU stages because `talker_ar` holds two; each CPU process holds one stage.

### How the configuration chooses devices

The colocated configuration sets both `thinker_gpu` and `talker_gpu` to 0. `image_encoder`, `audio_encoder`, `thinker` and `code2wav` use `thinker_gpu`; `talker_ar` uses `talker_gpu`. All five stages therefore land on GPU 0. The `preprocessing` and `decode` constructors have no `gpu` parameter. Topology then resolves a device for each process group from Step 2.

### Scope and sources

This step reads one colocated configuration; it does not start the model locally or measure CPU and GPU use. Sources on `sglang-omni origin/main@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`:

- Device arguments for all seven stages: `sglang_omni/models/qwen3_omni/config.py:268-302`.
- Both GPU arguments set to 0: `sglang_omni/models/qwen3_omni/config.py:499-521`.
- The two CPU-stage constructors have no `gpu` parameter: `sglang_omni/models/qwen3_omni/config.py:57-87`, `sglang_omni/models/qwen3_omni/config.py:192-199`.
- Process grouping and per-group GPU resolution: `sglang_omni/config/topology.py:365-382`.

### Next

The next step follows one request along the stage connections to show how these processes form a request route.

## Step 4 · Eleven hand-offs, one inside a shared process

> **In one line:** For a request with image and audio input and text and sound output, eleven stage hand-offs connect seven stages in six processes; only `talker_ar → code2wav` stays inside one process.

### On the stage

- The example has both image and audio input and asks for sound output. That choice activates all eleven stage connections shown or listed here.
- A solid box is a stage; a dashed box is one of Step 2's six processes. The shared `talker_ar` process contains both `talker_ar` and `code2wav`.
- The main drawing shows eight hand-offs. The footnote names three more input hand-offs into `talker_ar`: one each from `preprocessing`, `image_encoder` and `audio_encoder`.
- Ten gray hand-offs cross a process boundary: seven in the main drawing and the three listed below it. The orange `talker_ar → code2wav` hand-off stays inside their shared process.
- An arrow is a data dependency, not a promise about strict timing. One arrow can cover both final data and pieces sent while a stage is still generating; this step does not count messages.

### The numbers on the stage

| Hand-offs | Count |
|---|---:|
| Main drawing | 8 |
| Additional input hand-offs listed below | 3 |
| Total | 11 |
| Cross-process: 7 shown + 3 below | 10 |
| Inside `talker_ar`: `talker_ar → code2wav` | 1 |

$$8 + 3 = 11\ \text{hand-offs}$$

$$10 + 1 = 11\ \text{hand-offs}$$

The process count is still six, and the stage count is still seven. The single internal hand-off does not remove the logical `code2wav` stage.

### How the request selects these routes

`preprocessing` can send inputs to both encoders, `thinker` and `talker_ar`. Each active encoder can send its result to both `thinker` and `talker_ar`. `thinker` sends final data to `decode`; when sound is requested, its generating text stream also goes to `talker_ar`. `talker_ar` then feeds `code2wav`.

The pictured example uses every branch. Requests without an image, without audio input, or without audio output omit the corresponding branches. There is no `decode → talker_ar` edge. `decode` produces text and `code2wav` produces sound; the coordinator merges the completed results, which this diagram does not draw.

### Scope and sources

This step reads static configuration and request-building code; it does not run the model or claim a global execution order. Sources on `sglang-omni origin/main@5b00b2968cfa19cbd04b7305d18f5bb8cc557de2`:

- The YAML selects the colocated speech pipeline: `examples/configs/qwen3_omni_colocated_h100_bf16.yaml:3-20`; the seven stages are constructed at `sglang_omni/models/qwen3_omni/config.py:268-302`, with the colocated process assignment at `sglang_omni/models/qwen3_omni/config.py:305-318`, `sglang_omni/models/qwen3_omni/config.py:499-520`.
- Preprocessing candidates and request-dependent pruning: `sglang_omni/models/qwen3_omni/config.py:57-87`, `sglang_omni/models/qwen3_omni/request_builders.py:248-261`, `sglang_omni/models/qwen3_omni/request_builders.py:556-606`.
- Encoder outputs to `thinker` and `talker_ar`: `sglang_omni/models/qwen3_omni/config.py:90-99`, `sglang_omni/models/qwen3_omni/config.py:157-164`, `sglang_omni/models/qwen3_omni/config.py:218-224`, `sglang_omni/models/qwen3_omni/request_builders.py:207-215`, `sglang_omni/models/qwen3_omni/request_builders.py:264-275`.
- Thinker outputs to `decode` and `talker_ar`: `sglang_omni/models/qwen3_omni/config.py:167-188`, `sglang_omni/models/qwen3_omni/request_builders.py:200-204`, `sglang_omni/models/qwen3_omni/request_builders.py:1162-1204`.
- `talker_ar → code2wav`: `sglang_omni/models/qwen3_omni/config.py:236-253`; output-modality selection: `sglang_omni/models/qwen3_omni/request_builders.py:138-171`, `sglang_omni/models/qwen3_omni/request_builders.py:229-261`.

### Next

Chapter 2 first separates the shared `talker_ar` and `code2wav` stages into two processes, moving from six total processes to seven with GPU ids 0 and 1 in the default speech configuration. It then adds one copy of each, making nine total processes with GPU ids 0, 1, and 2.
