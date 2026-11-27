# 第 11 章评分卡 · Fish S2 Pro: Dual-AR in practice

日期：2026-11-27。

## 协调基线，不由本轮改写

固定 `ef82fe9` 的完整 EVAL 为 **NO-GO**：R1–R5 **80/80**、机制 R6 **16/16**、原十个非视觉项 **158/160**、原 #4/#5 **32/32**、原十二项 **190/192**。Step 1 的 #1 和 #10 各为 1 分，对应 Omni-67 和 Omni-48；Omni-66 同时开放。Omni-46 已关闭。后续作者提交不继承这个 verdict，也不自行核销 finding。

## 本轮作者修复，待协调固定复审

- `6f53cbc`：修正 Steps 4–5 的 Fast AR 时序。
- `9ae66a2`：修正 Step 1 时序，补请求路线 locator 和生成规模算例。该提交由 `6216582` rebase 到 `04be539` 后得到。
- 范围只有 Omni 11 Steps 1、4、5，对应双语 deep、MDX 出处、数字常量、生成 transcript 和定向证据。Steps 7–8、Ch.12、Omni 13／14／15、其他书和第 1 本受保护英文原文未改。

| 步 | 作者 R1–R5 /10 | 作者机制 R6 /2 | 作者原十个非视觉项 /20 | R1 小学生复述 | 未决非视觉洞 | 待评 |
|---|---:|---:|---:|---|---:|---|
| 1 | 10 | 2 | 20 | Slow 先采样；Fast 第 0 次重置后得到 c0，再选 c1–c9。22 个生成帧约 1.022 秒，要 220 次 Fast 调用。 | 0 | 原 #4/#5、协调复审、PNG 目视 |
| 4 | 10 | 2 | 20 | Slow 先采样，Fast 第 0 次重置并传数，再出现 c0 和另外九个 codes。 | 0 | 原 #4/#5、协调复审、PNG 目视 |
| 5 | 10 | 2 | 20 | Fast 先清空内层 KV，再进入下一次 Slow 输入；Slow 仍保留之前的工作。 | 0 | 原 #4/#5、协调复审、PNG 目视 |

这些分数是作者复评，不是协调新增分。两个独立只读复审分别对 Step 1 和 Steps 4–5 给出 **PASS、0 非视觉洞**，并复核了移动 deep 排版调整后的出处完整性。当前模型不能读取 PNG，原 #4/#5、原十二项新总分和整章 GO 不由本轮自行判定。

## 修复内容

- **Omni-48：** Steps 1、4 统一为 Slow sample → reset＋Fast call 0 → `sem_id/c0` → Fast calls 1–9。Step 1 保留独立的 `c0` 和 `c1–c9` 相位。Step 5 先重置 Fast KV，再进入下一次 Slow 输入。十次 Fast 调用、十一行存储和十行送 vocoder 保持不变。
- **Omni-66：** Step 1 顶部显示 `preprocessing → tts_engine → vocoder`，标明本章位于 `tts_engine`，并说明 vocoder 把 codes 变成声音。
- **Omni-67：** 新增构造的 22 个非结束接受帧：`22 × 2,048 = 45,056` 个采样点，约 1.022 秒，对应 22 次 Slow 采样和 220 次 Fast 调用。图上给出 `2 × 4 × 8 × 8 × 4 = 2,048`，脚注排除结束工作并声明不是实测延迟。该算例独立于参考声音的 22 帧补位例子，没有搬入 Step 7 的 40 帧开窗。

## 硬门与证据

- `npm run build`：60 页通过。全章八步 `readability`：0 机械问题。`deep-check 11`、`zh-check`、英中全章 360／390／430 px `mobile`、`git diff --check` 均通过。
- transcript 连续两次 SHA-256 相同：`c92cdd4d4679c2a6314da1845e013ff063f36f7d88c9d67d73374fc4e984eed9`，共 **2,313 词**。无 caption、文字出界、重叠或文本规则报告。
- 动画矩阵覆盖 Steps 1／4／5 × 英文桌面／中文桌面／中文 390 px × 直接 URL／前步入口，共 **18 个组合、132 个状态、114/114 个机制转变**。最低 **10.806 CSS px**，重叠和 SVG 出界均为 0。报告在 `.bot/out/omni48-s1-*`、`omni48-s4-*`、`omni48-s5-*`。
- Steps 1／4／5 的双语 deep 在 1440 和 390 px 共 **12 个打开抽屉视图**全部通过：counter 和 `aria-expanded=true` 正确，页面和抽屉横溢、KaTeX error、raw math、缺失目标文本均为 0。报告在 `.bot/out/omni48-deep-1440/` 和 `.bot/out/omni48-deep-390/`。
- 代表截图：`.bot/out/omni48-s1-en/s1-p3.png`。未声称看过 PNG 或视觉通过。未跑全站回归、真实 Fish／SGLang-Omni、模型、GPU、音频质量评测或主人最终验收。

## 剩余

Omni-48／66／67 等协调固定复审，不自行销项。原 #4/#5、图像能力复审、整章 verdict 和主人最终视觉验收仍待。按 direction 停下，不提前处理 Omni-49～65，不开第 16／17 章。
