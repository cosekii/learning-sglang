# 第 7 章评分卡 · Checks before text lands（第四轮修复后）

日期：2026-11-26。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 2。
材料：舞台截图 15 张（英文桌面、中文桌面、中文 390 px 手机，各 5 步：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-fcdw3krd/opencode/ls-voxt-ch07-final2-20261126/stage/`）与深入讲解 10 张、逐步 transcript、双语深入讲解文本。冷读者只读 Voxt 第 1–6 章。

> **评审限制：** 本轮模型不能读取图片。R6（动画节奏）和原 12 项里需要看图的两条（#4 图自己说话、#5 颜色一个意思）**没有目视结果**，留给主人/复审者。下表只记文本与机械检查能确定的结果；不声称满分，也不把这章标成完成。

| 步 | 易读（文本） | R1 小学生复述 | 原分（文本项） | 冷读者内容洞 | 待目视 | 日期 |
|---|---|---|---|---|---|---|
| 1 | R1–R5 通过 | 文字去此刻的焦点，不一定回到按快捷键的 start app。 | 文本项通过 | 0 | #4 #5 R6 | 2026-11-26 |
| 2 | R1–R5 通过 | 焦点是密码框，就一个字都不贴，改看卡片。 | 文本项通过 | 0 | #4 #5 R6 | 2026-11-26 |
| 3 | R1–R5 通过 | start app 里读不出也能写；别的 app 必须说能编辑。 | 文本项通过 | 0 | #4 #5 R6 | 2026-11-26 |
| 4 | R1–R5 通过 | 贴完再读一次框里的文字和光标；普通框一样就没确认，网页区域一样按贴入。 | 文本项通过 | 0 | #4 #5 R6 | 2026-11-26 |
| 5 | R1–R5 通过 | 贴之前记住旧剪贴板，贴完放回去；只有没确认的粘贴才把文字留在剪贴板。 | 文本项通过 | 0 | #4 #5 R6 | 2026-11-26 |

**未给出总分/平均分：** 需要目视的两条和 R6 未评，任何 12/12、24/24 的说法都不成立。

## 第二轮修复（对应复审 4 条内容问题）

1. **第 4 步按普通框收窄，并把网页分支画出来。** caption、aria、比较框、总结一起改：比较框现在四行出口——不同 → 贴入；一样且普通框 → 没确认；一样且网页区域 → 贴入；读不出 → 贴入。双语深入讲解写明 `TextIO.swift` 把网页区域的 unchanged 改成 unknown、`insert()` 按贴入处理，并引用 `deliver_test.go` 的同一用例。
2. **第 5 步去掉颜色冲突。** `Priya` 和章末问句不再用 `--accent`；蓝色只表示旧剪贴板，名字靠加粗当锚点。#5 的冲突已在代码层消除，渲染仍待目视。
3. **剪贴板兜底收窄。** caption、aria、MDX 出处、双语深入讲解统一为：只有「发出粘贴但结果没确认」才把文字留在剪贴板；密码框和不可编辑在写剪贴板之前返回，不动剪贴板；`KeepClipboard` 是单独的例外。卡片提供 Insert / Copy 的说法保留。
4. **复述纠正。** 第 1 步 R1 改成「文字去此刻的焦点，不一定回到 start app」，不再与第 3 步的 start app 规则矛盾。

## 第三轮修复

1. 第 1 步舞台显式定义焦点：加「focus: the field where typing goes」/「焦点：打字会落下的框」，不再只放在 aria 里。
2. 第 5 步兜底措辞改为「Not inserted: the card offers Insert and Copy.」/「未贴入：卡片提供 Insert 和 Copy。」，覆盖 Step 4 的「发出粘贴但没确认」；旁边的标签由「landed text」改为「answer text」/「答案文字」，不再把可能没落地的文字叫「落地」。
3. 双语深入讲解第 1 步标题由「是两个 app」改为「可以不是同一个 app」/「can be different apps」，因为不切 app 时两者相同。

## 视觉评审尝试（未完成）

- 本轮模型没有图片输入。尝试让独立子代理看 `stage/` 的 15 张和 `deep/` 的 10 张截图；可用的 `general` 子代理返回 `NO_IMAGE_INPUT`，`pstack-reviewer` 的模型配置不存在（`qweneval/...` model not found）。因此 R6、#4、#5 仍无目视结果，本章不标完成，也不给 12/12、24/24。
- 需要一位有图片输入的复审者打开：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-fcdw3krd/opencode/ls-voxt-ch07-final2-20261126/stage/`（en/zh/zh-phone 各 5 步）和 `.../ls-voxt-ch07-final2-20261126/deep/`（zh/en 各 5 步）。发现就改，再补数字分。

## 第四轮修复

1. 第 1 步去掉「≠ / 不回 / 不是目的地」的绝对说法：标题改「start app can differ from front app」/「start app 和 front app 可以不同」；caption 改「not necessarily back」/「不一定回」；底部改「not automatically the destination」/「不一定是目的地」。aria 补「两者可以是同一个 app」。
2. 第 5 步兜底由「Not inserted」改为「Paste unconfirmed: the card offers Insert and Copy.」/「粘贴未确认：卡片提供 Insert 和 Copy。」，与第 4 步的 unconfirmed 一致，也不否定 `DefaultVerifyMS` 注释里慢页面晚读剪贴板的可能。
3. 重生成 transcript 与截图（`ls-voxt-ch07-final2-20261126`），重跑本章门槛。

## 机械门槛（第四轮修复后）

- `build`：通过
- 本章 `transcript`：5 步，无出界/重叠告警
- 全章 `readability`：0 机械问题
- `deep-check 07`：通过（5 节）
- `zh-check`：all clear
- 中英本章 `mobile`（360/390/430）：无布局断裂
- 中文逐步字号 `mobile`（1–5）：全部通过
- `git diff --check`：通过
