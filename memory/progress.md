# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 新建 `docs/plan-voxt.md`：全书分 `dictation`、`desktop`、`meetings` 3 部分、16 章，每章列出 slug、标题、hook、核心问题、前置、事实来源和章末衔接。主线跟一句话走过按键、音频、ASR、语言模型和文本交付，再扩展到词典、历史、文件转写、双轨会议和证据检查。
- 规划只核对 `sglang-omni origin/main@42b5b8cc1a71c8eacfad66ce49b6bf8bd9a4003e` 的公开代码和文档，不使用本机日志、未提交文件或其他 worktree。当前语言模型 API 与已移除的本地语言模型严格分开；历史与录音保存期、外部 ASR、会议分人样本和真机未测范围均设有来源限制。
- 自定义规划检查通过：16 章连续编号、3 个 Part、字段齐全，63 个公开来源路径都存在于固定提交，进度表 slug 一致。独立复核后修正了词典效果保证、重试录音到期清理、会议 WAV 保留策略和纠正失败后的总结回退。
- `build`、全量 `transcript`、全量 `deep-check`、全量 `WAIT=100 mobile` 和 `git diff --check` 通过。已截取并复核第 1 本 Ch. 16 Step 1 参照页：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-plan/voxt-plan-reference.png`。
- 本轮只写规划，未改教程步骤；易读分、原 12 项、R1 复述和冷读洞均不适用。第 1 章仍为 **12/12** 步易读满分、章均分 **23.75 / 24**；第 2 章仍为 **4/14** 步易读满分、章均分 **23.93 / 24**。本轮类型：**新书**（规划）。三份新书规划已齐全；下一普通轮转为**修旧**，按易读分选最低步，当前先复核第 2 章第 3 步的记录。

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
