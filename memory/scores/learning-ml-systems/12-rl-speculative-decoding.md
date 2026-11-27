# 第 12 章评分卡 · 协调内容返工通过

## 2026-11-27 ML-18／ML-34 定点修复

- 教程提交 `f7a492f`：**ML-18 作者修复完成，待协调固定复审，不自行销项。** Step 5 改为五相，新增共享表卡片，逐相形成 embedding 与 LM head 的前向用途、target 主干和共享表各自独立的辅助 CE 梯度边界。MTP 的梯度路径保留，主 RL 仍更新 target 与共享表。
- 双语公式分别列出 $\theta_{\mathrm{detached}}$、$\theta_{\mathrm{shared}}$ 和 $\theta_{\mathrm{MTP}}$；共享符号只指 embedding／LM head，不再把 target 主干混入。deep 的「蓝线路径」改为图上实际存在的蓝色卡片和 CE 文字行，同 scope 修正 ML-34，亦待复审。
- Step 5 作者参考值：R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、新内容洞 **0**。R1 复述：draft 的辅助 CE 只训练 draft，前向仍用 target 和共享表的当前数值，主 RL 仍能更新它们。两个独立 `explore` 分别对源码事实和冷读给出 **PASS**。
- `build`（60 页）、Step 5 `readability`、`deep-check 12`、`zh-check`、英中全章与中文 Step 5 三宽度 `mobile`、`git diff --check` 全过。transcript 两次 SHA-256 均为 `1f08524878dd97214befbab9103fcf51c0e0dca89a88d85cca049afba962a1e5`，**2,189 词**。
- `.bot/out/ml18-step5-audit/report.json` 覆盖 **40 个状态、32/32 个机制转变、8 个 deep 状态、39 个唯一 PNG 哈希**；普通舞台最低 **10.8425625 CSS px**，重叠、出界和 `failures` 均为 0。桌面 deep 打开后舞台最低 **7.21415625 CSS px**，仍属共享 ML-21，本单元未改。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。既有协调 **80/80、16/16、192/192** 基线不改写；原 #4/#5、整章新总分和销项不由本轮自行决定。当前模型不能读 PNG，视觉和主人最终验收另计。

## 2026-11-26 ML-12 静态机制返工

- 八步加入 `[3,4,5,5,4,5,4,4]` 个相位，逐步机制变化数为 **2、3、4、4、3、4、3、3**。在线／冻结对照、hidden state、token 左移与 embedding、二移标签、detach、两次 mask 移位与相乘、rollout 吞吐和训练秒数依次形成。
- 本轮作者 DOM 机制分为 **R6 16/16**。R1–R5 沿用协调 **80/80** 内容基线，不重打已关闭内容项；原十二项总分和协调 verdict 留待复审，不记 `complete-under-EVAL`。ML-18 的 shared tables 与 ML-20 的 draft-pair 接缝仍是独立开放内容项，本轮不销项。
- transcript **2,115 词**，覆盖原有机制，没有靠新增范围凑厚度。本轮只加动画并压缩桌面纵向间距；caption、双语深入讲解和章末 draft-pair 问题未改。
- 证据目录 `/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-w32gl41i/opencode/ml12-phases/` 保存 **34 个**桌面相位 PNG 和可见文本签名；每个相位都有机制对象变化，文字重叠、SVG 出界均为 **0**，最低 **10.8425625 CSS px**。当前模型无图像输入，未把 PNG 记为已读图或视觉通过。
- `build`（60 页）、默认 transcript 连续两次逐字一致（SHA-256 `9b1ef58701ad68630fa39a4e8bedb10248d1b4595de8af939ee1f5f073ff9141`）、8 步 readability、英中全章及中文逐步三宽度 mobile、`deep-check 12`、`zh-check`、`git diff --check` 均通过。未跑全站回归、真实 RL 训练、rollout、GPU benchmark 或 reduced-motion 动态切换。

## 协调内容基线

日期：2026-11-26。协调人对 `ba32bf7…2476dcb` 的复审结果为 R1–R5 **80/80**、非视觉原项 **160/160**、静态 R6 **16/16**、原 #4／#5 **32/32**，原十二项 **192/192**。双语公式、符号表和梯度说明已统一使用 `θ_detached`，只指辅助 CE 分支上被 detach 的 target 主干参数；未决内容洞为 0。静态场景记录不满足当前 EVAL 第 6 节的动画硬门，也不替代主人的最终视觉验收。

材料：协调人在固定 `720a6f7` 快照读取英中第 5 步深入讲解打开图 2 张，公式和符号完整可读。证据目录为 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-coord-20261126-1202-all.2ptRHD/`。

| 步 | 协调 R1–R5 /10 | R1 小学生复述 | 协调原 12 项 /24 | 洞数 | 最差的两条 |
|---|---:|---|---|---:|---|
| 1 | 10 | target 每轮会更新，draft 也学习时，公开实验每秒生成 1667 个 token，冻结版是 1464。 | 24 | 0 | 无；动画硬门另计 |
| 2 | 10 | target 每读到一个位置，就留下一份算出的内部笔记，draft 可以使用。 | 24 | 0 | 无；动画硬门另计 |
| 3 | 10 | 把 a 的笔记和 b 的数列拼起来，让 draft 练习猜再下一个 token c。 | 24 | 0 | 无；动画硬门另计 |
| 4 | 10 | 再移一次就得到答案标签，CE 会给没猜中标签的 draft 扣分。 | 24 | 0 | 无；动画硬门另计 |
| 5 | 10 | detach 保留数值，却挡住 CE 调整 target 权重的信号；draft 仍能学习。 | 24 | 0 | 无；动画硬门另计 |
| 6 | 10 | 一个位置只有在后两个 token 都有效时，才计入 draft 的 CE。 | 24 | 0 | 无；动画硬门另计 |
| 7 | 10 | 在线训练的 rollout 吞吐最高，比冻结高 13.9%，比不用投机高 36.8%。 | 24 | 0 | 无；动画硬门另计 |
| 8 | 10 | 报告的训练指标在线版高 7 秒，但原文没说这些秒数覆盖哪些训练步。 | 24 | 0 | 无；动画硬门另计 |

**当前状态：协调内容返工通过，R1–R5 为 80/80、非视觉原项为 160/160、原十二项为 192/192，未决内容洞为 0。** 当前动画硬门和主人的最终视觉验收仍待。第 11 章仍须先补源；下一章是 `13-multi-turn-agent-rl`。

## 复审整改

- 第 5 步把双语公式和符号表的 `θ_shared` 改为 `θ_detached`，定义为本步被 detach 的 target 主干参数；梯度说明同步。target 主干不与 MTP 共享，只有 embedding 和 LM head 共享，共享表仍由正文单独说明。
- 此前补齐 frozen 只限辅助 CE 不训练 MTP 层的口径、单次 MTP 调用预测一个 token、在线训练影响接受数的机制、构造 mask 标签、测量窗口白话、两处中文措辞和 Awesome 文章固定版本。独立复审逐项确认解决。
- 独立冷读初审指出 SFT、gradient、join、mask 角色和测量窗口等解释缺口，以及 hook 承诺与证据不一致。逐项整改后，8/8 步 R1–R5 均为 10/10；终审只剩 transcript 同步问题，重新生成后解决。
- 独立源码初审指出 CE 归一化被漏写、MiMo checkpoint 与 Megatron 运行时 concat 顺序混写、Step 4 引用行不支撑结论、ReTool 实验否定过宽。全部修复并补固定版本引用。
- 后续源码复审发现 `one H200 GPU` 与原文 `H200 集群` 不符，已改为 `H200 cluster`；最终复审 PASS。
- 深入讲解 DOM 审计首次因测试脚本交替开关抽屉而漏检偶数步，修正审计后 16 个中英抽屉均通过展开、正文、KaTeX、残留 `$$` 和横向溢出断言。

## 硬门槛与边界

- 本轮 `build`（60 页）、本章 `transcript`、全章 `readability`（8 步、0 机械问题）、英文三种宽度全章 `mobile`、第 5 步中文三种宽度 `mobile`、`deep-check 12`、本章 `zh-check` 和 `git diff --check` 全部通过；transcript 无生成差异。
- 此前复核已逐项确认 8 项返工，并重跑本章 `transcript`、`readability`、中英三种宽度 `mobile`、`deep-check 12` 和 `zh-check`，全部通过且 transcript 无生成差异。中文第 1、3、4、5、6、7、8 步的逐步字号与布局门也全部通过。
- 两个英文和两个中文 zero-to-sglang 延伸阅读链接均返回 HTTP 200。
- 未跑全站回归、真实 RL 训练、真实 rollout、GPU benchmark 或模型质量评测。公开表的吞吐与训练指标不能合成整轮收益；原文没有说明训练秒数覆盖哪些训练步。
