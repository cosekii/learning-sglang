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
| omni | 05 | [Data references and reclamation](omni/05-data-lifetime.md) | 5 |
| omni | 06 | [Queues, batches and backpressure](omni/06-batching-backpressure.md) | 8 |
| omni | 07 | [A shared GPU budget](omni/07-shared-gpu-budgets.md) | 6 |
| omni | 08 | [Measure first sound and stalls](omni/08-measure-streaming.md) | 8 |
| omni | 09 | [Optimize AR and encoders](omni/09-ar-stage-optimization.md) | 7 |
| omni | 10 | [Optimize the streaming vocoder](omni/10-vocoder-optimization.md) | 8 |
| omni | 11 | [Fish S2 Pro: Dual-AR in practice](omni/11-fish-s2-pro.md) | 8 |
| omni | 12 | [Full-duplex strategies and measurement](omni/12-full-duplex-strategies.md) | 8 |
| omni | 13 | [Deploy and tune Qwen3-Omni](omni/13-qwen3-omni-deployment.md) | 8 |
| ml-sys | 01 | [Measure one inference request](ml-sys/01-measure-inference.md) | 7 |
| ml-sys | 02 | [The full GPU memory budget](ml-sys/02-inference-memory-budget.md) | 2 |
| ml-sys | 03 | [Prefix state in hybrid models](ml-sys/03-hybrid-state-cache.md) | 6 |
| ml-sys | 04 | [The tensor road between GPUs](ml-sys/04-gpu-communication.md) | 7 |
| ml-sys | 05 | [A distributed serving experiment](ml-sys/05-distributed-serving.md) | 7 |
| ml-sys | 06 | [One RL round in slime](ml-sys/06-slime-rollout-loop.md) | 8 |
| ml-sys | 07 | [The weight-update path](ml-sys/07-weight-updates.md) | 8 |
| ml-sys | 08 | [The FSDP2 training backend](ml-sys/08-fsdp2-training-backend.md) | 6 |
| ml-sys | 09 | [FP8 rollout and training](ml-sys/09-fp8-rollout-training.md) | 8 |
| ml-sys | 10 | [INT4 QAT and rollout](ml-sys/10-int4-qat-rollout.md) | 3 |
| voxt | 01 | [The journey of one sentence](voxt/one-dictation.md) | 4 |
| voxt | 02 | [Hotkeys and permissions](voxt/helper-permissions-hotkeys.md) | 3 |
| voxt | 03 | [From microphone to audio frames](voxt/microphone-to-voice-frames.md) | 8 |
| voxt | 04 | [Routes from sound to text](voxt/speech-recognition-routes.md) | 7 |
| voxt | 05 | [The language-model connection](voxt/language-model-connection.md) | 5 |
| voxt | 06 | [The text workshop](voxt/compose-and-cleanup.md) | 8 |
| voxt | 07 | [Checks before text lands](voxt/deliver-text-safely.md) | 5 |
| voxt | 08 | [Your small dictionary](voxt/personal-dictionary.md) | 7 |
| voxt | 09 | [History and retry expiration](voxt/history-retry-retention.md) | 9 |
| voxt | 10 | [A separate file-transcription route](voxt/file-transcription.md) | 9 |
