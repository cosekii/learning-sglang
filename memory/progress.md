# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 整点自主优化完成第 3 项「复盘自己」：最近 20 条整改中，#5「颜色一个意思」有 **12 条、涉及 9 步**，至少 6 条明确缺色块图例。R3、#2 更高频但依赖语义冷读，R2、R4 已有机械检查，本轮把多色 token 的色块存在性写成 `scripts/token-legends.mjs`。
- 第 5、11、12 步在 1440、390、360 px 均通过新检查；第 7 步在三种宽度都因缺输入和新生成色块而失败，证明脚本能抓住现有错误。检查已加入 `AGENTS.md` 和 `EVAL.md` 的第 1 章改动步门槛；一色一义仍靠冷读。
- 全章审计新发现第 6、9、10 步缺蓝橙色块，原分分别改为 **23→22、24→23、24→23**；第 7、8 步原有 #5 扣分不变。本轮未改教程画面、易读分或冷读洞，第 1 章仍为 7/12 步易读满分，不计算章均分。
- 硬门槛：`build`、第 1 章 `transcript`、全量 `mobile`、`deep-check 01`、第 1 章 `zh-check`、第 5 步 `readability` 和新检查矩阵均通过。
- 下一普通轮先修第 6 步图例，再逐轮处理第 7–10 步；第 5、7、8 步手机图内小字仍留专项。下次整点轮换做第 1 项「像读者一样从头读一遍」。新书规划仍排在已有步骤整改之后。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 易读整改：7/12 步满分 | — |
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
