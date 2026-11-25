# Transcript

Plain text of every ready chapter: each step's English and Chinese captions, the text drawn on the stage once it has settled, and the prose under the stage.
Read it to check wording and numbers across chapters without opening the components. It is generated — edit the source, then run
`node scripts/transcript.mjs` against a running dev server (`ONLY=13` for one chapter).

| book | # | chapter | steps |
|---|---|---|---|
| sglang | 01 | [Bare-minimum inference](01-inference.md) | 12 |
| sglang | 02 | [Attention, per decode step](02-attention.md) | 14 |
| sglang | 03 | [KV cache](03-kv-cache.md) | 10 |
| sglang | 04 | [Prefill vs decode](04-prefill-decode.md) | 10 |
| sglang | 05 | [Batching & continuous batching](05-batching.md) | 9 |
| sglang | 06 | [The scheduler](06-scheduler.md) | 9 |
| sglang | 07 | [KV memory](07-kv-memory.md) | 7 |
| sglang | 08 | [Prefix caching](08-prefix-caching.md) | 8 |
| sglang | 09 | [One request, end to end](09-one-request.md) | 9 |
| sglang | 10 | [Scheduler deep dive](10-engine.md) | 11 |
| sglang | 11 | [CUDA graphs](11-cuda-graphs.md) | 14 |
| sglang | 12 | [Piecewise CUDA graphs](12-piecewise-cuda-graph.md) | 12 |
| sglang | 13 | [torch.compile](13-torch-compile.md) | 11 |
| sglang | 14 | [Attention backends](14-attention-backends.md) | 13 |
| sglang | 15 | [Speculative decoding](15-speculative-decoding.md) | 8 |
| sglang | 16 | [Omni models](16-omni-models.md) | 5 |
| sglang | 17 | [Stages and schedulers](17-stages-and-schedulers.md) | 12 |
| sglang | 18 | [Between stages](18-between-stages.md) | 11 |
| sglang | 19 | [Sharing GPUs](19-sharing-gpus.md) | 6 |
| sglang | 20 | [Streaming audio decode](20-streaming-audio.md) | 6 |
| sglang | 21 | [Full duplex](21-full-duplex.md) | 8 |
| omni | 01 | [From config to a runtime graph](omni/01-config-to-runtime.md) | 4 |
| omni | 02 | [Stage–Process–GPU layout](omni/02-spg-topology.md) | 3 |
| omni | 03 | [Request binding and exit](omni/03-request-binding.md) | 3 |
| omni | 04 | [Three waiting rules](omni/04-readiness-contracts.md) | 4 |
| ml-sys | 01 | [Measure one inference request](ml-sys/01-measure-inference.md) | 7 |
| ml-sys | 02 | [The full GPU memory budget](ml-sys/02-inference-memory-budget.md) | 2 |
| voxt | 01 | [The journey of one sentence](voxt/one-dictation.md) | 4 |
| voxt | 02 | [Hotkeys and permissions](voxt/helper-permissions-hotkeys.md) | 3 |
| voxt | 03 | [From microphone to audio frames](voxt/microphone-to-voice-frames.md) | 5 |
