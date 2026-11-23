# 四本书制作进度

更新：2026-11-23。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 15:01 整点自主优化完成第 3 项「复盘自己」：最近 21 个步骤整改中，R4 有 4 步、R6 有 6 步、手机小字有 10 步记录。R2/R4 已有机械检查，R6 仍须转场冷读；本轮选择旧 `mobile` 漏检的手机实际字号。
- `mobile.mjs` 现在用计算字号乘 `getScreenCTM()` 的缩放，找出低于 10 CSS px 的可见 SVG 文字。全量保留布局硬门，小字只汇总审计；`ONLY=N STEP=M LANG=zh npm run mobile` 把选中中文步的小字检查变成硬门，默认英文布局检查不变。
- 真实旧问题负测试通过：第 1 章第 5 步在 360/390/430 px 均以最小 **4.71/5.15/5.73 px** 失败；已修第 3、11 步在三种宽度都通过。360 px 全章审计另标出第 1 章其余 10 步和第 2 章全部 14 步，这些只是待冷读候选，未直接改分或记洞。
- `node --check`、`build`、第 1 章 `transcript`、全量 `mobile`、`deep-check 01`、第 1 章 `zh-check` 和全章 `readability` 均通过；独立代码审查无必须修问题。截图位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-hourly-review-03/`，已复核第 3 步清晰竖排图和第 5 步现存小字图。
- 本轮未改教程步骤，易读分、原 12 项和冷读洞不变。下一普通轮写 `docs/plan-ml-sys.md`，再写 `docs/plan-voxt.md`；下次整点轮换做第 1 项「像读者一样从头读一遍」。

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

尚无章节，状态：**规划**。`docs/plan-ml-sys.md` 尚未创建，规划后再逐章记录状态和平均分。

## Inside Voxt

尚无章节，状态：**规划**。`docs/plan-voxt.md` 尚未创建；事实来源只使用 `sglang-omni` 的 `origin/main` 公开代码和文档。
