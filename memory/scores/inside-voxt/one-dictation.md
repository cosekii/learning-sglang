# 第 1 章评分卡 · The journey of one sentence

日期：2026-11-23。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
材料：第 1 步截图位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch01-s01/`；第 2 步最终中英桌面截图、360 px 中文手机截图、中英深入讲解截图、transcript 和检查日志位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch01-s02/final/`。冷读者没有编程前置知识。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | 两次听写会拿到不同的标签，第一次的结果跟 A，第二次的结果跟 B，所以不会混在一起。 | 24 | 0 | — | 2026-11-23 |
| 2 | 12 | 我按一下键，这句话就挂着 A 标签，从声音变成文字，再把「嗯」去掉，最后显示出来并保存。 | 24 | 0 | — | 2026-11-23 |

**当前平均：24 / 24；最低：24；总洞数：0；2/2 个已制作步骤易读满分。** 本章继续制作第 3 步：沿着路线检查迟到结果的闸门。

## 第 1 步冷读与检查

- 独立冷读一次通过：易读 **12 / 12**、原分 **24 / 24**、**0 洞**，R1–R6 均为 2。读者能从桌面和手机图说出两次听写、两个不同标签及结果的对应关系。
- 章首用「2 次听写怎样分开各自的结果？」提出问题。`session ID` 解释为「结果的标签」；A、B 是两个真实 session ID 的教学代称，2 是构造数量，不是 app 限制。R6 按静态终态评价。
- 源码基线为 `sglang-omni@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`。`Manager.Start` 取新 ID 见 `Voxt/internal/session/manager.go:193-215`；生产 ID 注入见 `Voxt/session_link.go:232-237`。深入讲解还区分录音 job 的 ID 与 ASR／LLM 回调绑定的 `run`，没有把隔离机制简化成只比较字符串。
- 最终图为 `voxt-ch01-s01-zh.png`、`voxt-ch01-s01-en.png`、`voxt-ch01-s01-phone-zh.png`、`voxt-ch01-s01-deep-zh.png`、`voxt-ch01-s01-deep-en.png`，均已打开检查。首页 `home-voxt-zh.png` 确认第四本书可进入。
- `build`、Voxt `transcript`、全章手机布局、中文手机字号硬门、`readability`、`deep-check 01`、`zh-check` 均通过。第 1 本第 1 步的 readability 与第 1 章 zh-check 回归通过；`transcript/01-inference.md` 前后 SHA-256 均为 `724a97db913e51c5bfd73a872d2b0700d2b9f679ed66d3be69889df348ea627f`。
- 未运行 Voxt 产品测试；本步行为依据公开源码与测试代码核对，网页硬门检查的是教程成品。

## 第 2 步冷读与检查

- 初次独立冷读为易读 **9 / 12**、原分折算 **19.6 / 24**、**4 洞**；补清 helper、整理前后、结果位置和历史内容后，复读为 **12 / 12**、**22 / 24**、**1 洞**。统一英文例句并补全中文脚注后，最终复核为易读 **12 / 12**、原分折算 **24 / 24**、**0 洞**，R1–R6 均为 2，没有必须修改的问题。
- 第 2 步只引入「一条带标签的完整路线」这一个新概念。图中用同一句话展示「嗯，你好 → 你好」和 `um, hi → Hi!`，说明整理前后；结果小窗的出现条件、成功听写及整理和历史已开启的前提都写在图内。
- 公开源码基线为 `sglang-omni@14014b833299c6158a5daa88e1e0740cf7efe606`，已核对 `origin/main` 正是此提交。路线依据 `Voxt/docs/architecture.md:245-277`；历史同时保存 `RawText` 与 `Result`，见 `Voxt/internal/session/run.go:446-460`；交付区分插入与答案卡，见同文件 `476-484`。
- 最终主图为 `voxt-ch01-s02-zh.png`、`voxt-ch01-s02-en.png`、`voxt-ch01-s02-phone-zh.png`，另有手机底部和中英深入讲解顶部、底部截图，均已打开检查。独立冷读只阅读三张主图和 transcript；深入讲解由主线程核对，冷读原分按其余 11 项折算。
- 最终 `build`、Voxt `transcript`、第 2 步 `readability`、中文手机字号硬门、全章中英手机布局、`deep-check 01`、`zh-check` 均通过，日志与截图同目录。本地目标页返回 HTTP 200。
- 未运行动画播放测试或 Voxt 产品测试；R6 按静态终态评价，行为依据公开源码核对，网页硬门检查的是教程成品。
