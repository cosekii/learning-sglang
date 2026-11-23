# 四本书制作进度

更新：2026-11-22。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 新增 `scripts/readability.mjs`，检查中英文 caption 句长、句数和每步新术语；transcript 现在同时记录中文 caption，截图脚本支持 `LANG=zh`。
- 第 2 章第 1 步：补上「前面的 token 把信息传给后面」的箭头和中文解释；易读分 **7 → 12**，原 12 项 **22 → 23**，冷读洞 **1 → 0**。章均分 **23.71**。
- 第 2 章第 3 步同时引入 4 个术语，英文第一句 19 词、中文 28 字；需要拆改英文原版才能满分，已记入 `docs/ideas.md` 并标「待主人定」。
- 硬门槛：`build`、全量 `transcript`、第 1 步 `readability`、第 3 步反向检查、`deep-check 02`、第 2 章 `zh-check`、第 2 章 `mobile` 通过。全量易读扫描覆盖 205 步，现存 179 步有机械检查问题，按轮继续整改；全量 `mobile` 通过。
- 下一单元继续补已有步骤的易读分；新书规划排在其后。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 完成 | — |
| 02 | 02-attention | 易读整改：1/14 步满分 | 23.71 |
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
