# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 第 1 章第 11 步中文图已补齐蓝框输入、橙框新生成、红框 EOS 的图例，说明新增部分与完整内容的关系及第 12 步去向；编号和文字列表改用顿号，消除加号歧义。英文原文、英文图和动画未动。易读分 **11→11**，原 12 项 **23→24**，冷读洞 **0→0**。
- 本轮三次独立冷读依次留下 2、1、0 个洞，最终能完整复述，遮住 caption 也能看懂。本步 `readability` 仍报英文 caption 超两句，并列出英文新词 `decode`；英文原文不能改，阻塞已记入 `docs/ideas.md`，待主人定。第 1 章仍为 7/12 步易读满分，暂不计算章均分。
- 第 1 章第 3、4、10、11、12 步仍需拆改英文才能通过机械检查；第 5、7、8 步的图例，以及第 3、5、7、8、11 步的手机图内小字仍未补。
- 硬门槛：`build`、第 1 章 `transcript`、全量 `mobile`、`deep-check 01`、第 1 章 `zh-check` 通过；第 11 步 `readability` 因受保护英文未过。逐步截图、独立冷读和评分复核已完成。
- 下一普通轮先复核最低分的第 3 步手机图内小字；下次整点轮做第 3 项「复盘自己」。新书规划仍排在已有步骤易读整改之后。

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
