# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 主人已许可第 1 章第 3、4、10、11、12 步的最小英文拆改（原话：「没什么问题，你照着你的想法改就行」），Orca item #2 已关闭。本轮只把第 10 步英文 caption 末尾从 `when it's done` 缩为 `when done`，第二句 **16→15 词**；中文、图和其他步骤未改。
- 第 10 步易读分 **11→12**，原 12 项 **24→24**，桌面冷读洞 **0→0**。独立冷读确认 `when done` 仍表示模型在结束时输出 EOS，没有新增歧义；R4 升为 2。
- 中文桌面截图改前后逐像素一致；英文像素差异只在 caption 和原虚线动画区域。390 px 英文 caption 三行完整，无重叠、出界或截断；已知图内小字继续保留手机专项待办。
- 硬门槛：`build`、第 1 章 `transcript`、全量 `mobile`、`deep-check 01`、第 1 章 `zh-check`、第 10 步 `readability` 和 `token-legends` 均通过。
- 第 1 章现有 **8/12 步易读满分**，不计算章均分。下一普通轮修最低分的第 3 步英文；下次整点轮做第 2 项「向好的范例学」。新书规划仍排在已有步骤整改之后。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 易读整改：8/12 步满分 | — |
| 02 | 02-attention | 易读整改：3/14 步满分 | 23.86 |
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
