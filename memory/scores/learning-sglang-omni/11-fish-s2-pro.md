# 第 11 章评分卡 · Fish S2 Pro: Dual-AR in practice

日期：2026-11-26。本轮修复协调复审 `81c6580` 留下的第 5 步 KV 必要条件，教程提交为 `1df0d34`。未改步沿用协调人的 R1–R5 评审，独立文本冷读者复读第 5 步。

协调人对 `1df0d34…d86329d` 的最终结论为 GO：R1–R5 **80/80**、原十个非视觉项 **160/160**、R6 **16/16**、原 #4/#5 **32/32**、原十二项 **192/192**。第 5 步 cached-prefix／fingerprint 问题已关闭，不再保留原十二项 **191/192** 或协调待审记录。live cache-hit 和主人最终验收另计。

本轮材料：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-zg696dya/opencode/ls-k1-omni11-rework/`。其中有第 5 步的 4 张中英桌面／390 px 手机舞台图和 2 张深入讲解图。当前模型不能读取 PNG，本轮不新增视觉分。

| 步 | R1–R5 /10 | R6 /2 | 易读分 /12 | R1 小学生复述 | 原分 /24 | 当前未决文本洞 | 待评项 | 日期 |
|---|---:|---:|---:|---|---:|---:|---|---|
| 1 | 10 | 2 | 12 | 第一段声音通常要先攒够 40 帧、选出 400 个 codes；提前结束也会直接解码。 | 24 | 0 | 主人目视 | 2026-11-26 |
| 2 | 10 | 2 | 12 | 1 秒参考录音会改成 44,100 个采样点，再补成 22 帧、10 行 codes。 | 24 | 0 | 主人目视 | 2026-11-26 |
| 3 | 10 | 2 | 12 | Slow AR 一次走一帧，读取文字和参考 codes，先选出这一帧的 code 0。 | 24 | 0 | 主人目视 | 2026-11-26 |
| 4 | 10 | 2 | 12 | Fast AR 在一帧里再选出 9 个 codes，和 Slow 的 code 0 凑成 10 行给 vocoder。 | 24 | 0 | 主人目视 | 2026-11-26 |
| 5 | 10 | 2 | 12 | Slow 留着之前算过的内容继续用，Fast 每换一帧就清空重来。 | 24 | 0 | 主人目视 | 2026-11-26 |
| 6 | 10 | 2 | 12 | 模型说结束、生成到上限或用户取消都会停下；取消后，没送出的声音不再送。 | 24 | 0 | 主人目视 | 2026-11-26 |
| 7 | 10 | 2 | 12 | 流式重读旧帧但不重播，还会延后交付 512 个采样点，最后全部放出。 | 24 | 0 | 主人目视 | 2026-11-26 |
| 8 | 10 | 2 | 12 | 短请求先补到最长，两个请求共用一次 vocoder 调用，再各自裁掉补位。 | 24 | 0 | 主人目视 | 2026-11-26 |

**当前状态：coordinator-GO / owner-visual-review-pending。** 协调最终评分为 R1–R5 **80/80**、原十个非视觉项 **160/160**、R6 **16/16**、原 #4/#5 **32/32**、原十二项 **192/192**。live cache-hit 和主人最终验收另计。

## 本轮返工

- 第 5 步舞台把 `same full prompt` 改为 `same cached prefix`，中文同步为「相同缓存前缀」。
- 舞台和双语正文说明 `extra_key` 对全部十行参考 codes 做指纹，避免不同参考声音仅因 code 0 相同而共享 radix KV。
- MDX 和双语深入讲解明确：相同参考、相同且仍缓存的前缀，即使目标后缀不同也能复用共同前缀；匹配不保证缓存仍命中。`model_runner.py:324-344` 的 `req.prefix_len` 已写入出处。
- 独立文本冷读第 5 步 R1–R5=10/10，未留下文本阻塞项。

## 验证记录

- `npm run build`：60 页，通过。
- `BOOK=omni ONLY=11 npm run transcript -- http://localhost:4323/learning-sglang`：8 步，无布局问题，transcript 已重生成。
- `BOOK=omni ONLY=11 npm run readability`：8 步，0 机械问题。
- 全章英文 mobile 与中文第 5 步 `STEP=5 LANG=zh` mobile：360、390、430 px 均通过布局和字号硬门。
- `BOOK=omni node scripts/deep-check.mjs 11` 与 `BASE=http://localhost:4323/learning-sglang BOOK=omni ONLY=11 node scripts/zh-check.mjs`：通过。
- `git diff --check`：通过。只运行目标章检查，没有运行全站回归、真实模型、GPU benchmark 或音频质量评测。
