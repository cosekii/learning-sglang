# 第 1 章评分卡 · Measure one inference request

日期：2026-11-23。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
材料：最终中英桌面截图、360 px 中文手机截图、中文深入讲解截图和逐步 transcript，位于 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch01-s01/`。冷读者只带 request、token、prefill 和毫秒的前置知识。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | 我发出请求后，等了 250 毫秒，也就是 1/4 秒，才看到回答的第一个 token，这段等待叫 TTFT。 | 24 | 0 | — | 2026-11-23 |

**当前平均：24 / 24；最低：24；总洞数：0；1/1 个已制作步骤易读满分。** 本章继续制作第 2 步。

## 第 1 步冷读与检查

- 独立冷读一次通过：易读 **12 / 12**、原分 **24 / 24**、**0 洞**，R1–R6 均为 2。读者能从图说出 TTFT 的起点、终点和 250 ms = 1/4 秒，桌面与手机都能直接读。
- 图用 `0 ms → 250 ms` 标出首个 token 前的等待；蓝色只表示 TTFT。250 ms 是 zero-to-sglang 第 1 部分第 5 章 §3.1 的构造教学值，不冒充本机实测；定义与 `Inference Engineering §1.4` 一致。
- 最终图为 `mlsys-ch01-s01-zh.png`、`mlsys-ch01-s01-en.png`、`mlsys-ch01-s01-phone-zh.png`，深入讲解图为 `mlsys-ch01-s01-deep-zh.png`，均已打开检查。首页 `home-mlsys-zh.png` 确认第三本书可进入。
- `build`、ML Systems `transcript`、全章手机布局、中文手机字号硬门、`readability`、`deep-check 01`、`zh-check` 均通过。zero-to-sglang 中英在线章节链接均返回 HTTP 200。
- 新书接入共用布局和检查脚本；第 1 本 roster 与 URL 未改，`transcript/01-inference.md` 前后 SHA-256 均为 `724a97db913e51c5bfd73a872d2b0700d2b9f679ed66d3be69889df348ea627f`。
