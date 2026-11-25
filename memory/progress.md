# 四本书制作进度

更新：2026-11-24。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 本轮新书：Inside Voxt 第 2 章第 2 步，用同布局对照 Accessibility 关／开：同一个右 Option 分别得到 0／1 条按键消息，Go app 分别保持空闲／开始听写；章名改为直述，并补齐双语深入讲解和源码边界。
- 首次独立冷读为易读 **9/12**、**5 洞**；删去章名比喻及其他权限、监听失败的前向岔路后，最终独立冷读为 **12/12**、**0 洞**。原分 **23/24**，仅「没允许／未允许／已允许」的中文自然度扣 1 分；章均分 **24.00→23.50**。
- `build`、本章 `transcript`、本步 `readability`、全站及本章三种宽度的中英手机布局、本步中文手机字号、`deep-check 02`、`zh-check` 和 `git diff --check` 均通过；全站另有 **576** 个既有小字视图仅作审计。
- 中英桌面、360／390／430 px 中文手机和双语深入讲解截图均已打开核对。截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch02-s02-20261124-1751/final/` 和 `checks/`。
- 本轮类型：**新书**；下一普通轮按新旧交替做 **修旧**。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 完成：12/12 步易读满分 | 24.00 |
| 02 | 02-attention | 易读整改：8/14 步满分；第 3、7、8、11 步待主人定 | 23.21 |
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

规划完成：`docs/plan-omni.md` 共 3 部分、13 章；第 1 章已制作 4 步并完成，第 2 章已制作 3 步并完成。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-config-to-runtime | 完成：4/4 步易读满分 | 24.00 |
| 02 | 02-spg-topology | 完成：3/3 步易读满分 | 24.00 |
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

规划完成：`docs/plan-ml-sys.md` 共 3 部分、16 章；第 1 章已制作 5 步。第 11 章须先补齐训推不一致的原始来源，缺源时先跳过。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-measure-inference | 在做第 6 步；前 5 步易读满分 | 24.00 |
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

规划完成：`docs/plan-voxt.md` 共 3 部分、16 章；第 1 章已制作 4 步并完成，第 2 章已制作 2 步。事实来源只使用 `sglang-omni` 的 `origin/main` 公开代码和文档。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | one-dictation | 完成：4/4 步易读满分 | 24.00 |
| 02 | helper-permissions-hotkeys | 在做第 3 步；前 2 步易读满分 | 23.50 |
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
