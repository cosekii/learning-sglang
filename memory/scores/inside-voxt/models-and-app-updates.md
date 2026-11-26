# 第 11 章评分卡 · Model storage and app updates（模型仓库与应用更新站）

日期：2026-11-26（协调复审后重记）。评分办法：`.bot/EVAL.md` 第 0 节 R1–R6 与第 2 节原 12 项，每项 0 / 1 / 2。
材料：协调人独立复审 `7ed99e3…7ce17a7`，已跑 build、6 步及全章 readability、transcript、deep-check、zh-check、英中全章逐步 360/390/430 px mobile，证据在 `/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-coord-20261126-1001/`；已读英中 6 步桌面、390 px 手机和 6 步深入讲解打开图，共 38 张。事实来源为 `sglang-omni origin/main@c2fc0f102c61daee13c73ced280970a7d72ed12d`。

> **分数状态：** 下面采用协调人的独立复审分，**不通过**。本轮模型不能读图，不另记自评分，也不把静态视觉分或机械门当成内容通过。

## 协调人独立复审

| 范围 | 分数 |
|---|---|
| 易读 R1–R5 | **46/60** |
| 静态 R6 | 12/12（协调人按无 phase 的静态场景补评） |
| 原 #1–#3、#7–#12 非视觉 | **108/120** |
| 原 #4／#5 静态视觉 | 24/24 |
| 合计 | **132/144** |

结论：5 组内容必修、1 个 caption 硬门、4 个舞台冷读洞，另有评分卡重评项。静态视觉分只说明所读图自身可读，不能抵销事实错误。

| 步 | 复审问题 | 本轮状态 |
|---|---|---|
| 1 | 历史大小贴在 `VOXT.APP`／`Voxt.app`，但 `docs/release.md:29-35` 对应 `VoxtNew.app` | 舞台改为中性 `APP BUNDLE`／「应用包」，双语深入讲解同步；保留 `0.1.0-beta.1` 边界。待复审 |
| 2 | 深入讲解用 `\frac` 和斜线表示文件路径；舞台未说明 `a8379a2` 是完整 commit 的缩写；`vocab.json = 2.78 MB` 缺代入 | 路径改为 `join($HUB, models--<owner>--<name>, snapshots, <commit>)`；舞台标出「前 7 位／first 7」；补 `2,776,833 B = 2.78 MB`（`catalog.go:213`）。待复审 |
| 3 | 深入讲解 VAD 把比值定义为 fraction，却写 `0.05%`，代入漏 `×100` | 公式改为 `× 100%`，结果 `0.050%`，代入写 `1,238,323 ÷ 2,469,094,826 × 100`。舞台原本正确。待复审 |
| 4 | 把「请求停止」写成「已经退出」 | caption、舞台、ARIA、双语深入讲解改为 `t_stop request`；写明卸载在进程退出时完成（`server.go:241-251`、`process.go:188-205`）。待复审 |
| 5 | 舞台把 «no update list → installer» 写得过宽；英文 caption 17 词；手机缺版本不匹配原因 | 舞台标明 `release build without a feed` 与「开发版没有更新」；caption 改 15 词；手机补「和应用的版本对不上」。待复审 |
| 6 | 章末未把「应用已就绪」锚到会议声音问题 | 舞台改为 `WITH THE APP READY, WHAT DOES A MEETING RECORD?`／「应用就绪后，会议要录下什么？」。待复审 |

## 本轮修复（待复审）

- 第 1 步：`VOXT.APP` → `APP BUNDLE`／「应用包」，深入讲解同步。
- 第 2 步：快照路径改为 `join(...)`；短标签改标「完整提交的前 7 位」；补 `2,776,833 B = 2.78 MB`。
- 第 3 步：VAD 占比公式与代入补 `× 100`，结果写 `0.050%`。
- 第 4 步：caption、舞台、ARIA、深入讲解把空闲动作写成停止请求，卸载以进程退出为完成；`Automatic: idle 10 min → stop request`。
- 第 5 步：caption 保留 release/feed 边界并写出「匹配的 DMG 或发布页」；桌面和手机面板都标 `NO FEED · RELEASE BUILD`，补「开发版没有更新」；手机补版本不匹配原因。
- 第 6 步：章末问题改为「应用就绪后，会议要录下什么？」。
- 评分卡：按协调人独立分重记，不再写 `60/60`、`120/120` 或零洞。

## 机械门槛（本轮修复后）

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=11 node scripts/transcript.mjs http://localhost:4322/learning-sglang`：6 步，无出界、重叠或脚注告警。
- `BOOK=voxt ONLY=11 npm run readability`：6 步，0 机械问题。
- `BOOK=voxt node scripts/deep-check.mjs 11`：通过。
- `BASE=http://localhost:4322/learning-sglang BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：通过。
- 英中本章 `mobile`：360、390、430 px 无布局断裂；中文第 1、2、4、5、6 步逐步字号门也通过。

## 待办与边界

- 复审需重新打开改过的第 1、2、4、5、6 步桌面和手机图，确认新文字不重叠、不越界，并重评 R1–R5 与舞台冷读洞。
- 本轮未跑真实 Voxt、模型下载、更新或模型进程；事实按 pinned 源码与文档核对。
