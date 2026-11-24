# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 本轮修旧：完成 Learning SGLang 第 2 章第 3 步的中文冷读和补评，未改教程。R1 只能复述为「每个 token 的 x 变成 q、k、v，但我说不清它们是什么。」易读分 **3/12**，原 12 项 **20/24**，冷读 **8 洞**；逐项分数和八类洞已写入评分卡。
- 章均分因本次重评从 **23.93** 调整为 **23.64 / 24**，不是教程改动造成的退步。第 1 章仍为 **12/12** 步易读满分、均分 **23.75 / 24**；第 2 章仍为 **4/14** 步易读满分。
- 截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch02-s03-fix/ch02-s03-before-zh.png`、`ch02-s03-before-en.png`。`build`、第 2 章 `transcript`、`deep-check 02`、第 2 章 `zh-check` 通过；`readability` 仍有 3 个问题，中文手机硬门在 360/390/430 px 各有 30 个 SVG 文字低于 10 CSS px，未通过。
- 完整修复需要拆步、后续重编号和手机图整改；英文原文受保护，已保留在 `docs/ideas.md` 标「待主人定」。本轮只提交评估记录，不把第 3 步标成完成。本轮类型：**修旧**；下一普通轮转为**新书**。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 完成：12/12 步易读满分 | 23.75 |
| 02 | 02-attention | 易读整改：4/14 步满分；第 3 步待主人定 | 23.64 |
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

规划完成：`docs/plan-voxt.md` 共 3 部分、16 章；尚无已制作章节。事实来源只使用 `sglang-omni` 的 `origin/main` 公开代码和文档。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-one-dictation | 规划 | — |
| 02 | 02-helper-permissions-hotkeys | 规划 | — |
| 03 | 03-microphone-to-voice-frames | 规划 | — |
| 04 | 04-speech-recognition-routes | 规划 | — |
| 05 | 05-language-model-connection | 规划 | — |
| 06 | 06-compose-and-cleanup | 规划 | — |
| 07 | 07-deliver-text-safely | 规划 | — |
| 08 | 08-personal-dictionary | 规划 | — |
| 09 | 09-history-retry-retention | 规划 | — |
| 10 | 10-file-transcription | 规划 | — |
| 11 | 11-models-and-app-updates | 规划 | — |
| 12 | 12-meeting-capture-modes | 规划 | — |
| 13 | 13-meeting-live-and-final | 规划 | — |
| 14 | 14-meeting-speaker-labels | 规划 | — |
| 15 | 15-meeting-summary-and-export | 规划 | — |
| 16 | 16-logs-tests-and-evaluation | 规划 | — |
