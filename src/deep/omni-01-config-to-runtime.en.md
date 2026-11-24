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

The next diagram expands the same configuration's device groups to show which deployment controls can change independently.
