# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 第 1 章第 3 步按 Orca item #3 的主人许可完成术语日常化：caption 和图改用「模型、一起算、候选 token」，后续图内 `transformer` 改为 `model`、`scores for every vocab token` 改为 `a score for every candidate token`，第 10 步 caption 删去 `in the vocabulary`；图结构和其他英文 caption 未动。
- 易读分 **10→12**，原 12 项 **24→24**，中文桌面冷读洞 **0→0**。独立冷读能复述「模型把 5 个编号一起算，给每个可能接在后面的小段打分」，R2 升为 2；R6 沿用前评，本轮未改动画。
- `forward pass` 现在第 6 步单独首次出现，全章 12 步 `readability` 均为 0 个机械问题，没有转移术语债。第 4–11 步英文截图逐张复核，未见重叠、出界、截断或不自然的新标签。
- `build`、第 1 章 `transcript`、全量 `mobile`、`deep-check 01`、第 1 章 `zh-check`、第 3 步 `token-legends` 和全章 `readability` 均通过。
- 第 1 章现有 **12/12** 步易读满分，章均分 **23.75 / 24**，总洞数为 0；第 2 章仍为 **4/14** 步易读满分。本轮类型：**修旧**。下一普通轮先写 `docs/plan-omni.md`，再依次补齐另外两本新书规划；下次整点轮做第 3 项「复盘自己」。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 完成：12/12 步易读满分 | 23.75 |
| 02 | 02-attention | 易读整改：4/14 步满分 | 23.93 |
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

尚无章节，状态：**规划**。`docs/plan-omni.md` 尚未创建，规划后再逐章记录状态和平均分。

## Learning ML Systems

尚无章节，状态：**规划**。`docs/plan-ml-sys.md` 尚未创建，规划后再逐章记录状态和平均分。

## Inside Voxt

尚无章节，状态：**规划**。`docs/plan-voxt.md` 尚未创建；事实来源只使用 `sglang-omni` 的 `origin/main` 公开代码和文档。
