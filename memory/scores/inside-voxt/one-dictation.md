# 第 1 章评分卡 · The journey of one sentence

日期：2026-11-23。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
材料：最终中英桌面截图、360 px 中文手机截图、中英深入讲解截图和 transcript，位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch01-s01/`。这是本书第 1 步，冷读者没有编程前置知识。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | 两次听写会拿到不同的标签，第一次的结果跟 A，第二次的结果跟 B，所以不会混在一起。 | 24 | 0 | — | 2026-11-23 |

**当前平均：24 / 24；最低：24；总洞数：0；1/1 个已制作步骤易读满分。** 本章继续制作第 2 步：把带标签的一次听写放上完整路线。

## 第 1 步冷读与检查

- 独立冷读一次通过：易读 **12 / 12**、原分 **24 / 24**、**0 洞**，R1–R6 均为 2。读者能从桌面和手机图说出两次听写、两个不同标签及结果的对应关系。
- 章首用「2 次听写怎样分开各自的结果？」提出问题。`session ID` 解释为「结果的标签」；A、B 是两个真实 session ID 的教学代称，2 是构造数量，不是 app 限制。R6 按静态终态评价。
- 源码基线为 `sglang-omni@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`。`Manager.Start` 取新 ID 见 `Voxt/internal/session/manager.go:193-215`；生产 ID 注入见 `Voxt/session_link.go:232-237`。深入讲解还区分录音 job 的 ID 与 ASR／LLM 回调绑定的 `run`，没有把隔离机制简化成只比较字符串。
- 最终图为 `voxt-ch01-s01-zh.png`、`voxt-ch01-s01-en.png`、`voxt-ch01-s01-phone-zh.png`、`voxt-ch01-s01-deep-zh.png`、`voxt-ch01-s01-deep-en.png`，均已打开检查。首页 `home-voxt-zh.png` 确认第四本书可进入。
- `build`、Voxt `transcript`、全章手机布局、中文手机字号硬门、`readability`、`deep-check 01`、`zh-check` 均通过。第 1 本第 1 步的 readability 与第 1 章 zh-check 回归通过；`transcript/01-inference.md` 前后 SHA-256 均为 `724a97db913e51c5bfd73a872d2b0700d2b9f679ed66d3be69889df348ea627f`。
- 未运行 Voxt 产品测试；本步行为依据公开源码与测试代码核对，网页硬门检查的是教程成品。
