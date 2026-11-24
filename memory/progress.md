# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 新建 `docs/z2s-map.md`：按课程目录逐章覆盖 Part 0 两章、Part I 五章、Part II 十章、Part III 五章、Part IV 三章，共 **25 章**。Part II 第 2–6、8–10 章的代码篇与正文一起核对；每章记录对应教程、已覆盖、课程更清楚的 §、缺口、不一致和改进编号。
- 课程基线为 `zero-to-sglang@bcf0cd82b9d1a058e5211d56431f14efd99eaf12`，教程基线为 `07933b8`。Learning ML Systems 和第 1 本 Ch. 22–29 均只记「仅规划」，没有写成已覆盖；mini 与当前 SGLang 的实现差异未核码处都标「待核」。
- `docs/ideas.md` 新增 **35 条**相互链接的改进，按效果大、改动小排列。优先记录第 6 章 mixed 停顿、第 7 章碎片、第 8 章释放和第 9 章 SSE 的口径，再补关键机制与未制作章节的规划。第 1 本改进默认只落中文层；英文原版需要同步的地方逐项标「待主人定」。
- 自定义检查通过：25 章顺序与课程目录一致，35 个改进编号均有一一对应的定义，无缺失或闲置编号。独立复核后修正了教学状态与 mini 实现的边界、SGLang 请求返回路径的待核范围、中文 Prose 的改动口径和一处漏字。`build`、全量 `transcript`、全量 `deep-check`、全量 `WAIT=100 mobile` 和 `git diff --check` 通过。已截取并复核第 1 本 Ch. 1 Step 1 参照页：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-z2s-map/z2s-map-reference.png`。
- 本轮只写对照规划和改进清单，未改教程步骤；易读分、原 12 项、R1 复述和冷读洞均不适用。第 1 章仍为 **12/12** 步易读满分、章均分 **23.75 / 24**；第 2 章仍为 **4/14** 步易读满分、章均分 **23.93 / 24**。本轮类型：**参考资料规划**（优先级 3b，不改变新旧交替状态）；下一普通轮仍按上一轮「新书」转为**修旧**，先复核第 2 章第 3 步的记录。

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
