# 三本书制作进度

更新：2026-11-22。分数为 `EVAL.md` 的 24 分制平均分；`—` 表示尚未评分。

## 本轮记录

- 完成首次校准：第 2 章 **23.64**，第 14 章 **23.62**；27 步全部 ≥20，27 张截图已逐张查看，冷读和评分卡已记录。
- 修复 `scripts/transcript.mjs` 的 roster 正则，使其兼容 `titleZh`、`hookZh` 等双语字段；第 2、14 章 transcript 已重新生成，内容无 diff。
- 硬门槛通过：`npm run build`、两章 `transcript`、全量 `mobile`、两章 `deep-check`、两章 `zh-check`。
- 本轮未改教程内容。已知候选：第 14 章第 12 步的 backend 表与当前 SGLang main 有两处偏差，详见评分卡。
- 下一单元按优先级写 `docs/plan-omni.md`，然后写 `docs/plan-ml-sys.md`。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 完成 | — |
| 02 | 02-attention | 完成；已校准 | 23.64 |
| 03 | 03-kv-cache | 完成 | — |
| 04 | 04-prefill-decode | 完成 | — |
| 05 | 05-batching | 完成 | — |
| 06 | 06-scheduler | 完成 | — |
| 07 | 07-kv-memory | 完成 | — |
| 08 | 08-prefix-caching | 完成 | — |
| 09 | 09-one-request | 完成 | — |
| 10 | 10-engine | 完成 | — |
| 11 | 11-cuda-graphs | 完成 | — |
| 12 | 12-piecewise-cuda-graph | 完成 | — |
| 13 | 13-torch-compile | 完成 | — |
| 14 | 14-attention-backends | 完成；已校准 | 23.62 |
| 15 | 15-speculative-decoding | 完成 | — |
| 16 | 16-omni-models | 完成 | — |
| 17 | 17-stages-and-schedulers | 完成 | — |
| 18 | 18-between-stages | 完成 | — |
| 19 | 19-sharing-gpus | 完成 | — |
| 20 | 20-streaming-audio | 完成 | — |
| 21 | 21-full-duplex | 完成 | — |
| 22 | 22-quantization | 规划 | — |
| 23 | 23-two-batch-overlap | 规划 | — |
| 24 | 24-tensor-parallel | 规划 | — |
| 25 | 25-pipeline-expert-parallel | 规划 | — |
| 26 | 26-dp-attention | 规划 | — |
| 27 | 27-hierarchical-kv | 规划 | — |
| 28 | 28-disaggregation | 规划 | — |
| 29 | 29-router | 规划 | — |

## Learning SGLang Omni

尚无章节，状态：**规划**。下一单元创建 `docs/plan-omni.md`，规划后再逐章记录状态和平均分。

## Learning ML Systems

尚无章节，状态：**规划**。`docs/plan-ml-sys.md` 尚未创建，规划后再逐章记录状态和平均分。
