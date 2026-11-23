# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 整点自主优化第 2 项「向好的范例学」：读 Bartosz Ciechanowski《Mechanical Watch》Balance，把「总览 → 放大一个阶段 → 回到整体」用于第 2 章第 12 步；最终候选为「六列总览＋Paris 完整算例＋静态展开求和」，已记入 `docs/ideas.md`，英文和教程页面未改。
- 第 2 章第 12 步补评：易读分 **—→11**，原 12 项 **23→21**，冷读洞 **1→4**；章均分 **23.86→23.71**。新增复核发现权重来源、显示值合计 1.01、Σ 的含义和绿线加权操作四个洞，R6 也因多组元素同时出现记 1 分。本轮只学习范例和补评，不作改后提分。
- 冷读否定拖动时间轴，因为会藏起静态信息并可能误教成按时间逐列混合。第 1 章第 12 步的「逐轮高亮」候选也没有实际洞可修，维持易读 **11**、原分 **24**、洞 **0**，不采用。
- 硬门槛：`build`、第 1、2 章 `transcript`、全量 `mobile`、第 2 章第 12 步 `readability`、`deep-check 01/02`、第 1、2 章 `zh-check` 和第 1 章第 12 步 `token-legends` 均通过。
- 第 1 章仍为 **10/12** 步易读满分，第 2 章仍为 **3/14** 步易读满分。下一普通轮改第 1 章第 12 步 caption，下次整点轮做第 3 项「复盘自己」；Orca item #3 仍等待第 3 步英文许可决定，新书规划排在已有步骤整改之后。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 易读整改：10/12 步满分 | — |
| 02 | 02-attention | 易读整改：3/14 步满分 | 23.71 |
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
