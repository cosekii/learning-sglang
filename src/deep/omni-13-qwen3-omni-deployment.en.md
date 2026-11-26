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
