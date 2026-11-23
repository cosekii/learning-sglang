# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 整点轮完成自主优化第 1 项「像读者一样从头读一遍」：从首页进入第 1 章，连续走完 12 步，再点进第 2 章第 1 步；计数、caption 和跨章链接正确，桌面及手机走查均无横向出界。本轮只记录问题和改进，不改步骤内容，逐步评分不变。
- 独立冷读能复述整章主线，第 5–9 步已能分清上一轮结果和本轮新结果。新增待办：第 12 步问题应限定为模型内部的重复计算；第 11→12 步应分清两个输出文字编号与 Paris、句号、EOS 三个选中 token。两项都只改中文说明。
- 390 px 手机的首页入口、caption、控制条和跨章按钮可用，无重叠或截断。顶部跨章链接实测对比度 **4.25:1**（12.8 px），新增一个 CSS 选择器的加深待办；已知图内小字问题继续保留。
- 硬门槛：`build`、第 1 章 `transcript`、全量 `mobile`、`deep-check 01`、第 1 章 `zh-check`、第 1 步 `readability` 和 `token-legends` 均通过。
- 第 1 章仍为 7/12 步易读满分，不计算章均分。下一普通轮修第 10 步图例；下次整点轮做第 2 项「向好的范例学」。新书规划仍排在已有步骤整改之后。第 3、4、10、11、12 步的英文拆改许可已登记 Orca item #2，主人未回复前保留英文。

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
