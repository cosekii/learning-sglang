# 深入讲解进度

每章状态：`done`（第二版：已搬进 `src/deep/*.md`、已核实、`scripts/deep-check.mjs` 通过）/ `pending`（待做）。
autoloop 每轮做表里第一个不是 done 的。手册见 docs/deep-dive.md（第二版），标杆是第 2 章。
步数用于核对每个 md 文件的 `## ` 小节数（deep-check 读这一列）。

| 章 | slug | 组件 | 步数 | 状态 |
|---|---|---|---|---|
| 01 | 01-inference | AutoregressiveGen | 12 | done |
| 02 | 02-attention | AttentionStep | 14 | done |
| 03 | 03-kv-cache | KVCache | 10 | done |
| 04 | 04-prefill-decode | PrefillDecode | 10 | done |
| 05 | 05-batching | Batching | 9 | done |
| 06 | 06-scheduler | Scheduler | 9 | done |
| 07 | 07-kv-memory | KVMemory | 7 | done |
| 08 | 08-prefix-caching | PrefixCaching | 8 | done |
| 09 | 09-one-request | OneRequest | 9 | done |
| 10 | 10-engine | Engine | 11 | done |
| 11 | 11-cuda-graphs | CudaGraphs | 14 | done |
| 12 | 12-piecewise-cuda-graph | PiecewiseGraphs | 12 | done |
| 13 | 13-torch-compile | TorchCompile | 11 | done |
| 14 | 14-attention-backends | AttentionBackends | 13 | done |
| 15 | 15-speculative-decoding | SpeculativeDecoding | 8 | done |
| 16 | 16-omni-models | OmniModels | 5 | done |
| 17 | 17-stages-and-schedulers | StagesSchedulers | 12 | done |
| 18 | 18-between-stages | BetweenStages | 11 | done |
| 19 | 19-sharing-gpus | SharingGpus | 6 | done |
| 20 | 20-streaming-audio | StreamingAudio | 6 | done |
| 21 | 21-full-duplex | FullDuplex | 8 | done |