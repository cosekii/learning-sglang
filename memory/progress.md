# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 第 2 章第 12 步中文图保留六列总览，补齐六个分数与权重、共同分母 23.41、Paris 完整算例、舍入说明、六项展开求和和绿线 `×wⱼ`；中文本步改为静态，英文截图逐字节未变，caption 和其他步骤未改。
- 易读分 **11→12**，原 12 项 **21→24**，中文桌面冷读洞 **4→0**，章均分 **23.71→23.93**。中途冷读两次保留 `e/^` 的 1 洞；最终用 `2^3 = 2×2×2` 解释连乘，并明确小数次方不手算、采用计算工具的近似值后，R3 和 #2 才升为 2。
- 第 11→12 步后 100ms / 1400ms 教学区域 **0 个像素差异**，R6 由 1 升为 2。桌面所有 SVG 文字均在界内且下方无重叠；390 px 手机 caption 完整，图内小字未做独立冷读。
- `build`、第 2 章 `transcript`、全量 `mobile`、`deep-check 02`、第 2 章 `zh-check` 和第 12 步 `readability` 均通过。
- 第 1 章仍为 **11/12** 步易读满分，第 2 章现有 **4/14** 步易读满分且原分总洞数为 0。下一普通轮先补评第 2 章第 3 步，下次整点轮做第 3 项「复盘自己」；Orca item #3 仍等待第 1 章第 3 步英文许可决定，新书规划排在已有步骤整改之后。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 易读整改：11/12 步满分 | — |
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
