# 第 13 章评分卡 · 制作中

日期：2026-11-26。计划 8 步；本表逐步记录 EVAL 自评。每步只有一个静态场景，组件没有 phase、setTimeout 或 LoopProgress，因此 R6 按静态场景复核。原 #4／#5 按组件与 transcript 的直接标签、图例和同尺度记录复核。模型不能读取 PNG，真人视觉验收待主人。

截图目录：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-uz21ci8z/opencode/ls-k2-mlsys13/` 的 `final-desktop/`、`final-phone-zh/`、`final-deep/`。独立文本冷读与源码终审将在全章完成后记录。

| 步 | 易读分 /12 | R1 小学生复述 | 原 12 项 /24 | 洞数 | 最差的两条 |
|---|---:|---|---:|---:|---|
| 1 | 12 | 后面的模型也要看前面的动作和工具回复，所以不能把这些内容拆到互不相干的记录里。 | 24 | 0 | 无 |

## 逐步硬门槛

- 第 1 步：`build`（60 页）、本章 `transcript`、`readability`（0 机械问题）、英文和中文 360／390／430 px `mobile`、中文逐步字号、`deep-check 13`、`zh-check` 通过；`git diff --check` 在提交前执行。PNG 已生成并尝试打开，但模型无图片输入，未声称目测通过。

## 边界

- 本章没有直接的 zero-to-sglang 对照章，不添加映射链接。
- server-based rollout 文章只用于历史设计动机，不作为当前行为证据。
- 所有 token 数都是构造值；未运行真实训练、rollout、工具调用或 benchmark。
