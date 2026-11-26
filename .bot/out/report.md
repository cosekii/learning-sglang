# lane k1 本轮报告

日期：2026-11-26。只修 Learning SGLang Omni 第 14 章及其评分卡、transcript；未碰其他书、第 1 本英文原文或 `.bot/memory/`。

## 已修复的 review 项

- 第 1 步：`58c960c` 已让卡片和条形图同步。DOM 相位依次显示 10 秒等待、0 秒读取，随后 4 秒已读、6 秒等待，再显示标签和 `576,000 B` 算式。旧「10 秒等待」与「4＋6 秒」同屏矛盾已关闭。
- 第 6 步：橙色失败框由 `12 B queued audio` 改为 `12 B → 0 B`。运行中面板先失败并 abort，已完成面板随后失败且没有生成器可中止。双语深入讲解同步说明失败后排队声音为 0 B。
- transcript：`03f9b8d` 已补八处 `loops`。本轮重生成无差异，并提交第 6 步终态文字。
- 评分卡：撤回协调 R6 `0/16` 旧基线，改记 `cbdb0f5` 的 **14/16**，逐步为 **1、2、2、2、2、1、2、2**。本轮修复记为 **16/16（待复审）**，不冒充协调 verdict。

## 验证

- `npx astro --config .astro/local.config.mjs build`：60 页通过。配置把 Vite cache 留在本目录，避开共享 `node_modules` symlink。
- `WAIT=6000 BOOK=omni ONLY=14 npm run transcript -- http://localhost:4325/learning-sglang`：8 步，无出界、重叠或脚注问题；再次生成无差异。
- `BOOK=omni ONLY=14 npm run readability`：8 步，0 机械问题。
- 英文全章及中文第 1／6 步 `mobile`：360、390、430 px 通过；中文目标步字号门通过。
- `BOOK=omni node scripts/deep-check.mjs 14`：通过；`zh-check`：8 步通过。
- `node .astro/check-omni14.mjs`：第 1／6 步相位断言通过，证据在 `.bot/out/omni14-review/phase-check.json`。
- 独立只读冷读：第 1／6 步无剩余文本或 DOM 事实阻塞，并确认评分卡应采用协调 **14/16** 加本轮 **16/16（待复审）**。
- `git diff --check`：通过。

截图在 `.bot/out/omni14-review/final-en/` 和 `final-zh-phone/`。当前模型与独立冷读者都不能读取 PNG，未给新增视觉分，也未把 DOM 证据当作主人视觉验收。

## 分数与状态

- 协调最新：R1–R5 **80/80**、非视觉原项 **160/160**、静态原 #4/#5 **32/32**、原十二项 **192/192**、机制 R6 **14/16**。
- 本轮待复审：两个 R6 表达项已修，源码、DOM 和独立文本冷读支持 **16/16**。协调复审和主人视觉验收前，不记完整 EVAL 通过。
- 未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、模型或 GPU benchmark。

## 提交与后续

- `bfc6517 [k1] Fix Omni 14 failure queue state` 已推送到 `origin/tutorials`。
- 本报告、评分卡和 `memory/progress.md` 随下一条 `[k1] ` 记录提交推送。

## 下一轮

等 Omni 14 协调复审；随后回 Omni 15 的剩余复审与动画硬门，不开第 16 章。

---

# lane k2 本轮报告 · ML Systems 13 协调返工

日期：2026-11-26。范围只含 ML Systems 第 13 章第 1、7、8 步、生成 transcript 和真实验证记录；未动其他 lane 的书、第 1 本受保护英文原文或 `.bot/memory/`。

## 两项必修与一项 polish

- **第 1 步冷读洞**：`input: P P = 2` 与 `P = prompt (2)` 矛盾，已改为 `input: P = 2`，中文同步为 `输入：P = 2`。`P + A + O = 2 + 4 + 3 = 9` 的算式不变。独立冷读确认洞已关闭，没有新增矛盾，修复后第 1 步 R1–R5 可保持 10/10。
- **第 7 步英文手机硬门**：移动图例从 `red = current` 缩短为 `red = now`，不再在 360／390／430 px 出界。中文图例含义不变。
- **第 8 步标签**：`ATTENTION MASK` 改为 `RESPONSE ATTENTION MASK`，与深入讲解的响应 attention mask 一致；长标签使用 11 px 桌面、10 px 手机字号，transcript 与手机门均通过。

## 撤回并更新旧记录

协调指出的旧 **0 未决内容洞**和「中英 mobile 全过」记录已撤回，不再作为本轮依据。修复后作者重评为 R1–R5 **80/80**、非视觉原项 **160/160**、机制 R6 **16/16**、当前未决内容洞 **0**；这些是当前修复后的重评，不保留旧记录的虚假验证历史。当前不记原十二项总分或整章完成，协调复审、原 #4／#5／#6 与主人最终视觉验收仍待。`memory/scores/learning-ml-systems/13-multi-turn-agent-rl.md` 和 `memory/progress.md` 已同步。

## 真实验证

- `npx astro --config .astro/k2.config.mjs build`：60 页，通过。
- `BOOK=ml-sys ONLY=13 npm run transcript -- http://127.0.0.1:4384/learning-sglang`：8 步，无布局问题。diff 只有 `P P = 2 → P = 2` 和 `ATTENTION MASK → RESPONSE ATTENTION MASK`。
- `BOOK=ml-sys ONLY=13 npm run mobile -- http://127.0.0.1:4384/learning-sglang`：英文 360／390／430 px 全部通过。
- `BOOK=ml-sys ONLY=13 LANG=zh npm run mobile -- http://127.0.0.1:4384/learning-sglang`：中文 360／390／430 px 全部通过。两次均在长标签调整后重跑。
- `BOOK=ml-sys ONLY=13 npm run readability`：8 步，0 机械问题；`BOOK=ml-sys node scripts/deep-check.mjs 13`、`BASE=http://127.0.0.1:4384/learning-sglang BOOK=ml-sys ONLY=13 node scripts/zh-check.mjs`、`git diff --check`：通过。
- transcript 和 mobile 的固定 CDP 端口与其他 lane 冲突时，临时改用未占用端口，检查后已还原脚本。初次 dev server 未绑定 IPv4，Chrome 显示连接拒绝错误页；该次输出没有计作通过。改用 `--host 127.0.0.1` 并确认章节实际加载后，才记录上述手机结果。

最终第 1、7、8 步截图已重生成到 `.bot/out/ml13/s1.png`、`s7.png`、`s8.png`。当前模型不能读取 PNG，未声称视觉通过。未跑全站回归、真实训练、rollout、工具调用、VLM 或 benchmark。

## 提交与后续

本条 `[k2]` 提交包含组件、transcript、评分卡、进度和本报告，并推送 `origin/tutorials`。本章仍需协调复审和主人最终视觉验收，当前 **未完成**；不提前开始第 14 章。预览地址为 `http://127.0.0.1:4384/learning-sglang/ml-sys/ch/13-multi-turn-agent-rl/?step=1`，dev server 在收尾时关闭；需要再看时运行 `npx astro --config .astro/k2.config.mjs dev --host 127.0.0.1 --port 4384 --background`。
