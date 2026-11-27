# 第 8 章评分卡 · FSDP2 training backend

## 2026-11-26 ML-09 静态机制返工与 ML-14 事实修复

- 六步加入 `[3,3,5,5,3,4]` 个相位，逐步机制变化数为 **2、2、4、4、2、3**。完整副本与分片依次形成；forward 从 7 GB 开始，all-gather 临时完整层，release 后回到 7 GB；loss 先乘 R/B，FP32 AVG 后留下梯度分片；训练账、临时层和中间结果分别出现；权重经 `Replicate()` 进入 bucket 再到 rollout。
- 本轮作者 DOM 机制分为 **R6 12/12**，ML-14 的 AVG 事实修复保持。R1–R5 沿用旧 **60/60** 内容基线；原 #4/#5、原十二项总分和协调 verdict 留待复审，不记 `complete-under-EVAL`。
- 厚度边界：transcript **1,726 词**，薄于原版同类章约 2,000 词。本章只覆盖完整复制、分片、forward gather/release、FP32 AVG、峰值类别和 Replicate 导出；不展开完整 DTensor placement、FSDP1 公式、allocator trace、精确峰值或混合精度规则。ML-17 的 DTensor 舞台展开仍是独立待修内容项，本行不销项。
- 证据目录 `/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-hu5cwwuz/opencode/ml08-phases/` 保存 **23 个**桌面相位 PNG 和可见文本签名；文字重叠、SVG 出界均为 **0**，最低 **10.390625 CSS px**。当前模型无图像输入，未把 PNG 记为已读图或视觉通过。
- `build`（60 页）、默认 transcript、6 步 readability、英中全章及中文逐步三宽度 mobile、`deep-check 08`、`zh-check`、`git diff --check` 均通过。未跑全站回归、真实 FSDP2 训练、GPU benchmark 或 reduced-motion 动态切换。

## 2026-11-26 旧协调基线

日期：2026-11-26。协调人对 `78e20ad` 的旧复审结果为 R1–R5 **60/60**、非视觉原项 **120/120**、静态 R6 **12/12**、原 #4／#5 **24/24**，原十二项 **144/144**。后续协调台账把第 4 步的归约事实单列为 ML-14：旧文误把 FP32 FSDP2 的默认 AVG 写成 sum，旧满分不覆盖该事实项。本轮已修正第 4 步并完成动画，待协调复审；旧静态场景记录不替代主人的最终视觉验收。

材料：协调人在固定提交快照读取英中 6 步桌面和 390 px 手机共 24 张舞台图，并补读第 3 步英中手机底部 2 张图，共 26 张。证据目录为 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-coord-20261126-1053-ml08/`。

| 步 | 协调 R1–R5 /10 | R1 小学生复述 | 静态 R6 与原 #4／#5 | 洞数 | 最差的两条 |
|---|---:|---|---|---:|---|
| 1 | 10 | 八张 GPU 各自保存同样的 64 GB 训练表，所以一共占了 512 GB。 | 2/2；4/4 | 0 | 当前动画硬门待评 |
| 2 | 10 | 每个 rank 只留一个 8 GB 分片，八个 rank 合计仍是 64 GB，不再是 512 GB。 | 2/2；4/4 | 0 | 当前动画硬门待评 |
| 3 | 10 | zero_grad 清掉旧梯度后，forward 先留 7 GB 的表，再借来完整一层；backward 加入 1 GB 梯度后回到 8 GB。 | 2/2；4/4 | 0 | 当前动画硬门待评 |
| 4 | 10 | 每个 rank 先把 loss 乘以 R/B，FP32 FSDP2 再取平均，合起来就是全批梯度均值。 | 2/2；4/4 | 0 | ML-14 修复待协调复审 |
| 5 | 10 | 8 GB 是完整训练状态账，不是 forward 的永久常驻量；临时层和中间结果还会把峰值推到 8 GB 以上。 | 2/2；4/4 | 0 | 当前动画硬门待评 |
| 6 | 10 | 训练后，完整权重按桶交给 rollout，梯度和优化器状态留在训练端。 | 2/2；4/4 | 0 | 当前动画硬门待评 |

**旧协调基线：内容与已读静态视图 144/144。** 本轮 ML-14 事实修复与当前动画硬门仍待协调复审，主人的最终视觉验收另计。

## 协调复审整改

- 第 3、5 步不再把 8 GB 写成永久常驻。第 3 步明确 `optimizer.zero_grad(set_to_none=True)` 后的初始 forward 为 `1 GB 权重 + 6 GB 优化器相关表 = 7 GB`，临时层另记 `U`；backward 保存 1 GB 梯度分片后，完整训练状态账才是 8 GB。第 5 步保留 `peak > 8 GB`，并把 8 GB 称为逻辑和峰值状态账。
- ML-14：第 4 步在图、caption、双语深入讲解和出处说明中同时写明 slime 的 `loss = loss * dp_size / global_batch_size` 预缩放与 FP32 FSDP2 默认 `ReduceOp.AVG`。公式展开为 `AVG(R/B × 未缩放梯度) = 1/B × 未缩放梯度之和`，并用 `R=2`、`B=8` 的标量例验证；不再误写为 sum 或声称不能取平均。
- 独立冷读复审首次发现手机卡片把梯度本身写成“backward 前已预缩放”，已改为“由预缩放 loss 算出”；复读为 PASS。

## 硬门槛与边界

- `build`（57 页）、本章 `transcript`、全章 `readability`（6 步、0 机械问题）、中英三种宽度全章 `mobile`、第 3–5 步逐步中文 `mobile` 字号与布局视图、`deep-check 08`、本章 `zh-check` 和 `git diff --check` 全部通过。
- 英文手机图例返修由 `78e20ad` 完成。本 lane 在自己的 checkout 上运行 `BOOK=ml-sys ONLY=8 node scripts/mobile.mjs http://localhost:4331/learning-sglang`，得到 `no layout breaks at 360, 390, 430 px`。这条结果供协调人核销英文手机图例项，不代表真人视觉验收已完成。
- 未跑全站回归、真实 FSDP2 训练、权重更新或 GPU benchmark。显存数字是构造算式，不是训练实测；`U` 和精确峰值没有来源数值。
- 固定事实来源：`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `actor.py:522-535,687-702`。
