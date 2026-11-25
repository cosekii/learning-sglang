# 第 4 章评分卡 · Three waiting rules

日期：2026-11-25。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
材料：最终中英桌面截图、360／390／430 px 中文手机截图、390 px 英文手机截图、双语深入讲解截图及逐步 transcript；冷读者先读 Omni 前三章。截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s01-20261125-0550/final/`。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | thinker 等 image_encoder 和 preprocessing 各交来一份完整结果，才把请求交给 scheduler。 | 24 | 0 | — | 2026-11-25 |

**当前平均：24 / 24；最低：24；已制作步总洞数：0；1/1 步易读满分。** 本步讲清 two-source one-shot fan-in；下一步讲结果分成 chunk 后是否仍要等全部到齐。

## 冷读与整改记录

- 初版用「图 + 声音」构造两路输入。独立源码核查发现 speech 路线的这种请求还应等 `preprocessing`，所以 0/2→2/2 不成立。终稿改为 image-only 请求，应等 `image_encoder` 和 `preprocessing` 两份结果；「thinker 开始」也收窄为「把请求交给 scheduler」，不暗示 prefill 已开始。
- 初版冷读指出「一次」可能被理解为同时到达、到达位置和去向不清、上图例及 caption 在手机上过宽。终稿明确每个来源各自交来整份结果，先到的留在 thinker 收件格；手机改为三行三列快照，并缩短 caption。
- 最终独立冷读的中文桌面、360／390／430 px 中文手机和英文桌面均 **12/12、24/24、0 内容洞、0 显示洞**。遮住 caption 后仍能复述；手机三列标题和完整 caption 均可见。英文手机也无截断或重叠。
- 最终检查：`build`、本章 `transcript`、本步 `readability`、`deep-check 04`、`zh-check`、本步中文 `mobile`、100／1400 ms 静态图逐字节一致及 `git diff --check` 均通过。双语深入讲解截图最终以 `aria-expanded=true` 和标题断言确认抽屉确实展开。
