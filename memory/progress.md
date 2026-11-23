# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 新建 `docs/plan-ml-sys.md`：全书分 `inference`、`rl`、`practice` 3 部分、16 章，每章列出 slug、标题、hook、核心问题、前置、事实来源和章末衔接。主线从推理测量与显存走到多卡服务，再跟随 rollout、权重更新、低精度和训推一致性，最后落到多轮智能体、profiling 和显存调试。
- 规划核对 `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`；27 个引用文件全部存在。第 1 本已完成的 KV cache、调度、CUDA Graph 和投机解码只回指；Ch. 22–29 仍不作前置。`mismatch` 的 TODO 实验不得采用，Dynamo 只用于操作实验；INT4 部署范围已按独立审查从「单卡」修正为「单机」。
- `memory/ai-infra-map.md` 只保留在本机并加入 `.gitignore`，不提交。自定义规划检查通过：16 章连续编号、3 个 Part、字段齐全、引用路径和进度表 slug 一致。
- `build`、全量 `transcript`、全量 `deep-check`、第 7 章默认等待的 `mobile`、全量 `WAIT=100 mobile` 和 `git diff --check` 通过。默认等待的全量 `mobile` 运行超过 10 分钟后按本轮时限停止；随后用 100ms 等待完成全量布局门。站点代码未改，上一提交 `2265e61` 的默认全量布局门也已通过。已截取并复核第 1 本 Ch. 7 Step 1 参照页：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ml-sys-plan/ml-sys-plan-reference.png`。
- 本轮只写规划，未改教程步骤；易读分、原 12 项、R1 复述和冷读洞均不适用。第 1 章仍为 **12/12** 步易读满分、章均分 **23.75 / 24**；第 2 章仍为 **4/14** 步易读满分、章均分 **23.93 / 24**。本轮类型：**新书**（规划）。下一普通轮写 `docs/plan-voxt.md`；下次整点轮换做第 1 项「像读者一样从头读一遍」。

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

规划完成：`docs/plan-omni.md` 共 3 部分、13 章；尚无已制作章节。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-config-to-runtime | 规划 | — |
| 02 | 02-spg-topology | 规划 | — |
| 03 | 03-request-binding | 规划 | — |
| 04 | 04-readiness-contracts | 规划 | — |
| 05 | 05-data-lifetime | 规划 | — |
| 06 | 06-batching-backpressure | 规划 | — |
| 07 | 07-shared-gpu-budgets | 规划 | — |
| 08 | 08-measure-streaming | 规划 | — |
| 09 | 09-ar-stage-optimization | 规划 | — |
| 10 | 10-vocoder-optimization | 规划 | — |
| 11 | 11-fish-s2-pro | 规划 | — |
| 12 | 12-full-duplex-strategies | 规划 | — |
| 13 | 13-qwen3-omni-deployment | 规划 | — |

## Learning ML Systems

规划完成：`docs/plan-ml-sys.md` 共 3 部分、16 章；尚无已制作章节。第 11 章须先补齐训推不一致的原始来源，缺源时先跳过。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-measure-inference | 规划 | — |
| 02 | 02-inference-memory-budget | 规划 | — |
| 03 | 03-hybrid-state-cache | 规划 | — |
| 04 | 04-gpu-communication | 规划 | — |
| 05 | 05-distributed-serving | 规划 | — |
| 06 | 06-slime-rollout-loop | 规划 | — |
| 07 | 07-weight-updates | 规划 | — |
| 08 | 08-fsdp2-training-backend | 规划 | — |
| 09 | 09-fp8-rollout-training | 规划 | — |
| 10 | 10-int4-qat-rollout | 规划 | — |
| 11 | 11-train-inference-mismatch | 待补源 | — |
| 12 | 12-rl-speculative-decoding | 规划 | — |
| 13 | 13-multi-turn-agent-rl | 规划 | — |
| 14 | 14-profile-rl-systems | 规划 | — |
| 15 | 15-memory-snapshot-debugging | 规划 | — |
| 16 | 16-engineering-practice | 规划 | — |

## Inside Voxt

尚无章节，状态：**规划**。`docs/plan-voxt.md` 尚未创建；事实来源只使用 `sglang-omni` 的 `origin/main` 公开代码和文档。
