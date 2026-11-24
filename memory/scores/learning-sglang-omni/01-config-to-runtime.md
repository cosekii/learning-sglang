# 第 1 章评分卡 · From config to a runtime graph

日期：2026-11-23。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
材料：各步最终中英桌面截图、360 px 中文手机截图、深入讲解截图和逐步 transcript；目录见下方各步记录。冷读者先读第 1 本 Ch.17 Step 3 与 Ch.19 Step 3，再读本书前面步骤。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | 五个 stage 在同一张卡上共分 94% 显存，还剩 6%。 | 24 | 0 | — | 2026-11-23 |
| 2 | 12 | 七个 stage 在六个进程里跑，因为 talker_ar 和 code2wav 共用一个，另外五个各用一个，所以 5＋1＝6。 | 24 | 0 | — | 2026-11-23 |
| 3 | 12 | 六个干活的小组里，四个一起用同一张 GPU 卡，另外两个只用 CPU，合起来还是六个。 | 24 | 0 | — | 2026-11-23 |
| 4 | 12 | 七个环节分在六个运行程序里，一共交接 11 次数据，10 次跨过程序，1 次在同一程序里。 | 24 | 0 | — | 2026-11-23 |

**当前平均：24 / 24；最低：24；总洞数：0；4/4 步易读满分。** 本章完成；结尾的问题由第 2 章的三种部署图回答。

## 冷读与整改记录

- 初版为 **9/12、18/24、6 类洞**：小数到百分比的换算、stage 与格子的对应、6% 和预算的含义、配置文件与 YAML、同卡方式、标题中的运行图。随后补上 `0.02 = 2%` 等换算、`gpu_memory_fraction = 显存占比`、配置文件的白话说明、100 格图例和「未分配不代表实际空闲」。
- 第二版核心结论无误解，但冷读仍给 **9/12、21/24**：R2=0、R3=1。核对先修后，在图上明确「复习 · 第 1 本 Ch.19 Step 3」；stage 名、config 和五份份额都属于已学内容。完整先修冷读升为 **12/12、23/24**，剩 1 个图示洞。
- 唯一剩余洞是「按左边名单从上到下」暗示读者能辨认五份格子的边界，但 94 格同为蓝色。删除这句误导说明，格子只表示五项合计；复核为 **12/12、24/24、0 洞**，R1–R6 均为 2。

## 第 2 步冷读与检查（18:11 轮）

- 独立冷读一次通过：易读 **12 / 12**、原分 **24 / 24**、**0 洞**，R1–R6 均为 2。R1：「七个 stage 在六个进程里跑，因为 talker_ar 和 code2wav 共用一个，另外五个各用一个，所以 5＋1＝6。」
- 图把七个 stage 映射到六个 stage 进程，蓝框标出 `talker_ar` 与 `code2wav` 共用进程；四个进程使用 GPU 0，两个进程只用 CPU。静态展开配置，不含 server/router 父进程，不是 H100 实测。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch01-s02/`。最终图为 `omni-ch01-s02-zh.png`、`omni-ch01-s02-en.png`、`omni-ch01-s02-phone-zh.png`，深入讲解图也已打开检查。
- `build`、Omni 全章 `transcript`、全章 `mobile`、第 2 步中文手机字号硬门、`readability`、`deep-check`、`zh-check` 均通过；360 px 手机可下滚读完整内容。第 1 本 `transcript/01-inference.md` SHA-256 仍为 `724a97db913e51c5bfd73a872d2b0700d2b9f679ed66d3be69889df348ea627f`。

## 第 3 步冷读与检查（19:21 轮）

- 初稿独立冷读为易读 **11 / 12**、原分 **23 / 24**、**1 洞**：R3=1、#2=1；「按设备分组」没有直接说明设备在这里指 GPU 或 CPU。图顶随后改为「设备 = GPU 或 CPU」，手机用同一句短解释，双语深入讲解同步补上定义。
- 最终独立冷读为易读 **12 / 12**、原分 **24 / 24**、**0 洞**，R1–R6 均为 2。R1：「六个干活的小组里，四个一起用同一张 GPU 卡，另外两个只用 CPU，合起来还是六个。」初稿的术语洞已关闭。
- 图把第 2 步的六个进程分成两组：四个蓝框进程共用一块 GPU 0，两个灰框进程只用 CPU；`talker_ar` 框中的两个 stage 仍只算一个进程。数量由 `src/omni/numbers.ts` 的进程组推导，浏览器实际数到六个进程框，算式为 `4 + 2 = 6`。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch01-s03/`。最终图为 `omni-ch01-s03-zh.png`、`omni-ch01-s03-en.png`、`omni-ch01-s03-phone-zh.png`、`omni-ch01-s03-deep-zh.png`、`omni-ch01-s03-deep-en.png`，均已打开检查；360 px 手机可下滚读完整内容。
- `build`、Omni 全章 `transcript`、全章 `mobile`、第 3 步中文手机字号硬门、`readability`、`deep-check`、`zh-check` 均通过。第 1 本 `transcript/01-inference.md` SHA-256 仍为 `724a97db913e51c5bfd73a872d2b0700d2b9f679ed66d3be69889df348ea627f`；事实来源为 `sglang-omni origin/main@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`。

## 第 4 步冷读与检查（22:11 轮）

- 独立冷读一次通过：易读 **12 / 12**、**0 洞**，R1–R6 均为 2；主 session 按原 12 项复核为 **24 / 24**。R1：「七个环节分在六个运行程序里，一共交接 11 次数据，10 次跨过程序，1 次在同一程序里。」
- 本例同时输入图像和音频、输出文本和声音。主图 8 次交接，下方另列 3 次，共 11 次；灰色跨进程交接为 `7 + 3 = 10` 次，橙色 `talker_ar → code2wav` 留在共用进程内。箭头只表示数据流向。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch01-s04/final/`。中英桌面图、360 px 中文手机图和深入讲解图均已打开检查；手机箭头没有穿字，caption 完整。
- 浏览器实测 **8 条主图交接、6 个进程框、7 个 stage 框，其中 1 条进程内交接**。第 1 本 `transcript/01-inference.md` SHA-256 仍为 `724a97db913e51c5bfd73a872d2b0700d2b9f679ed66d3be69889df348ea627f`。
- 第 4 步事实来源为 `sglang-omni origin/main@5b00b2968cfa19cbd04b7305d18f5bb8cc557de2`；只核对公开配置和请求构造代码，未运行模型，也不把箭头当成全局执行顺序。

## 硬门与事实边界

- `build`、Omni `transcript`、中文和英文本步 `mobile`（360/390/430 px）、`readability`、`deep-check`、`zh-check` 全部通过；transcript 无裁切、重叠或布局规则标记。
- 浏览器直接数到 **100 个格子，其中 94 个已分、6 个未分**。首页、第 1 本第 1 章和 Omni 新步均返回 HTTP 200；首页截图确认列出四本书。
- 第 1 本英文教程和 URL 未改，`transcript/01-inference.md` 前后 SHA-256 均为 `724a97db913e51c5bfd73a872d2b0700d2b9f679ed66d3be69889df348ea627f`。
- 第 1–3 步来源为 `sglang-omni origin/main@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`，第 4 步来源为 `sglang-omni origin/main@5b00b2968cfa19cbd04b7305d18f5bb8cc557de2`；精确出处见各步深入讲解。未启动 H100 或模型实测；94% / 6% 只是配置声明预算的静态核算。
