# 四本书制作进度

更新：2026-11-22。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 第 1 章第 8 步：中文 caption 写明句号接到末尾、6 段变 7 段、下一轮仍读全部 7 段；图内标出句号的固定编号 13、下一轮输入和上一轮概率结果。英文原文未动。
- 按本轮冷读标准，易读分 **12 → 12**，原 12 项 **19 → 22**，冷读洞 **3 → 0**。目前第 1 章 6/12 步易读满分，暂不计算章均分；第 8 步的色块图例和深入讲解过宽表述仍未补。
- 第 3、4 步仍需拆改英文才能通过机械检查；第 3、4、11 步的理解洞、第 5、7、8 步的图例和手机图内小字仍未补。
- 硬门槛：`build`、第 1 章 `transcript`、第 8 步 `readability`、全量 `mobile`、`deep-check 01`、第 1 章 `zh-check` 全部通过；中英文截图和独立冷读已复核。
- 下一普通轮做第 1 章第 9 步；下次整点轮做第 2 项「向好的范例学」。新书规划仍排在已有步骤易读整改之后。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 易读整改：6/12 步满分 | — |
| 02 | 02-attention | 易读整改：2/14 步满分 | 23.71 |
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
