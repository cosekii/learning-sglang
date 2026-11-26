# lane k2 本轮报告

日期：2026-11-26。范围只含 Learning ML Systems 第 10、12、13 章及本轮评分记录；未动其他 lane 的书、第 1 本受保护英文原文或 `.bot/memory/`。

## 已修复的 review 项

- `5c40c0f` 记录复核未决项：ML 10、ML 12 评分卡的逐步表头已改为「协调 R1–R5」和「协调原 12 项 /24」，9＋8 行分别同步为每步 10/10、24/24，不再写「作者文本自检」和「未重评」。顶部汇总、`memory/progress.md` 与逐步表一致，动画硬门仍单列。提交 `fe45042`。
- 未重做 ML 08、ML 10、ML 12 已通过的教程内容，未跳第 11 章的缺源限制。

## ML Systems 13 完成内容

- 第 1 步：一个有序 Sample 保留模型动作和工具观察；左图只给 `P` 是缺上下文对照，不宣称拆开存储必然丢数据。
- 第 2 步：动作 token 的 loss mask 为 1，观察 token 为 0；观察仍进入下一次模型调用。
- 第 3 步：用 dummy 编码长度裁出完整观察 delta，说明生成标记和共同前缀假设，本例统一为 3 个 `O`。
- 第 4 步：观察图片分别进入 rollout `image_data` 和训练 processor tensor buffer。
- 第 5 步：按 key 收集，每个全张量 key 只做一次 `torch.cat(dim=0)`。
- 第 6 步：slime 的 `max_turns`、token budget、env done 三个备选出口；明确观察已返回但不再追加。
- 第 7 步：切换到 verl，分清 ToolAgentLoop 与 server 的职责、有效工具路径、mask 归属和 LRU 中的 request_id。
- 第 8 步：以配置的 `response_length=12` 右侧 padding，response mask 与 attention mask 都排除 padding；结尾引向第 14 章的等待时间线。

每步都有循环相位动画、完整 SVG ARIA 和双语深入讲解；支持 `prefers-reduced-motion`，此时显示完整末相位。独立冷读者三轮检查源码、文本、动画与可访问性，最终为 **no must-fix issues remain**。

## 评分记录

作者自评：R1–R5 **80/80**、非视觉原项 **160/160**、机制 R6 **16/16**、未决内容洞 **0**。R6 由真实相位 DOM 检查支持，不是静态场景评分。原 #4／#5／#6 与主人最终视觉验收仍待，不记原十二项总分或 `complete-under-EVAL`。详见 `memory/scores/learning-ml-systems/13-multi-turn-agent-rl.md` 和 `memory/progress.md`。

## 验证

- `npx astro --config .astro/k2.config.mjs build`：60 页，通过。
- `BOOK=ml-sys ONLY=13 npm run transcript -- http://localhost:4382/learning-sglang`：8 步，无布局问题，transcript 与索引已提交。
- `BOOK=ml-sys ONLY=13 npm run readability`：8 步，0 机械问题。
- 英文、中文全章 `BOOK=ml-sys ONLY=13 [LANG=zh] npm run mobile -- http://localhost:4382/learning-sglang`：360／390／430 px 全部通过；第 3 步中文副标题出界已修并复查。
- `BOOK=ml-sys node scripts/deep-check.mjs 13`、`BASE=http://localhost:4382/learning-sglang BOOK=ml-sys ONLY=13 node scripts/zh-check.mjs`、`git diff --check`：通过。
- `node .astro/check-ml13.mjs`：8 步真实相位推进、末相位和完整 ARIA 通过；16 个中英深入讲解抽屉无横向溢出、残留 `$$` 或 KaTeX 错误。
- 本地 `node_modules` 是指向协调 checkout 的 symlink，默认 Vite cache 不可 unlink；本轮只在 gitignored `.astro/k2.config.mjs` 使用独立 cache 和 fs allow，没有改协调 checkout。transcript 固定 CDP 端口与其他 lane 冲突时，临时换端口检查后已还原脚本。

截图：`.bot/out/ml13/s1.png` 至 `s8.png`；深入讲解图在 `.bot/out/ml13-deep/`。代表图为 `.bot/out/ml13/s8.png`。当前模型返回 `Cannot read image`，未声称 PNG 目视通过。

未跑全站回归、真实训练、rollout、工具调用、VLM、GPU benchmark 或质量评测。

## 提交与后续

- `fe45042`：同步 ML 10／12 协调逐步评分表。
- `0181848`：ML 13 第 1 步与动画。
- `eb4db85`：第 2 步 loss mask。
- `c0a4c1b`、`7952d5c`：第 3 步观察 delta 与 transcript 索引。
- `206ead1`：第 4 步 VLM 图片双路径。
- `5fd9514`：第 5 步多模态训练张量合并。
- `bd4145f`：第 6 步 slime 停止出口。
- `127fa69`：第 7 步 verl AgentLoop 分工。
- `f95e1f2`：第 8 步、全章冷读整改与可访问性。
- 评分卡、进度和本报告随最后一条 `[k2]` 提交推送。所有提交均已 push 到 `origin/tutorials`，推送被拒时均按指令 `pull --rebase` 后重推，没有 force-push。

下一单元是 `14-profile-rl-systems`，需等待协调对本轮返工和新章的复审。章节地址为 `http://localhost:4382/learning-sglang/ml-sys/ch/13-multi-turn-agent-rl/?step=8`。本轮启动的 dev server 在收尾时关闭；需要再看时运行 `npx astro --config .astro/k2.config.mjs dev --port 4382 --background`。
