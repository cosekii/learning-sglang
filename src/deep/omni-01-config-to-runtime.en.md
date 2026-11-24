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
