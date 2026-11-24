# 四本书制作进度

更新：2026-11-24。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 本轮新书：Learning SGLang Omni 第 2 章第 1 步，比较默认语音布局与 talker_ar、code2wav 各两份的布局，讲清整进程副本、7 → 9 个进程和 2 → 3 张 GPU。
- 初版冷读为 **7/12、16/24、9 洞**；随后补复制对象与请求分配动机，删除未解释的 `@r0/@r1`，橙色单标新增份，并完整列出五个其他 stage 的设备及 code2wav 的 GPU 0 → GPU 1 移动。
- 第二次冷读为 **12/12、22/24、1 个必须洞**；再用官方文档补足「排队时多份可并行处理」，并写明低并发可能略慢，不把多副本当成必然提速。
- 最终独立冷读为易读 **12/12**、原分 **24/24**、**0 洞**，R1–R6 均为 2；所有硬门通过。
- 事实固定在 `sglang-omni origin/main@48ee40b2563492de95efc952a0c7470db087d8a9`，只展开公开配置与文档，没有模型性能实测；7 个固定源码链接均验证 HTTP 200。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch02-s01-20261124-1051/final/` 和 `checks/`。
- 本轮类型：**新书**；下一普通轮转为**修旧**，优先处理仍有易读缺口的旧步。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 完成：12/12 步易读满分 | 23.83 |
| 02 | 02-attention | 易读整改：8/14 步满分；第 3、7、11 步待主人定 | 23.36 |
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
| 14 | 14-attention-backends | 完成；已校准；第 6 步已修 | 23.69 |
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

规划完成：`docs/plan-omni.md` 共 3 部分、13 章；第 1 章已制作 4 步并完成，第 2 章已制作第 1 步。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-config-to-runtime | 完成：4/4 步易读满分 | 24.00 |
| 02 | 02-spg-topology | 在做第 2 步；第 1 步易读满分 | 24.00 |
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

规划完成：`docs/plan-ml-sys.md` 共 3 部分、16 章；第 1 章已制作 3 步。第 11 章须先补齐训推不一致的原始来源，缺源时先跳过。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-measure-inference | 在做第 4 步；前 3 步易读满分 | 24.00 |
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

规划完成：`docs/plan-voxt.md` 共 3 部分、16 章；第 1 章已制作 3 步。事实来源只使用 `sglang-omni` 的 `origin/main` 公开代码和文档。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | one-dictation | 在做第 4 步；前 3 步易读满分 | 24.00 |
| 02 | helper-permissions-hotkeys | 规划 | — |
| 03 | microphone-to-voice-frames | 规划 | — |
| 04 | speech-recognition-routes | 规划 | — |
| 05 | language-model-connection | 规划 | — |
| 06 | compose-and-cleanup | 规划 | — |
| 07 | deliver-text-safely | 规划 | — |
| 08 | personal-dictionary | 规划 | — |
| 09 | history-retry-retention | 规划 | — |
| 10 | file-transcription | 规划 | — |
| 11 | models-and-app-updates | 规划 | — |
| 12 | meeting-capture-modes | 规划 | — |
| 13 | meeting-live-and-final | 规划 | — |
| 14 | meeting-speaker-labels | 规划 | — |
| 15 | meeting-summary-and-export | 规划 | — |
| 16 | logs-tests-and-evaluation | 规划 | — |
