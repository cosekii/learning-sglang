# lane d 本轮报告 · 按 direction 继续冻结等待固定复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`memory/`、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `fee7264`，fetch 后仍一致，工作树干净。direction（06:52）lane d：Voxt 11 Step 5 的 `99ed414`／`26941bb` 与 Voxt 10 displayed Step 1 的 `bd884d2` 均冻结待固定复审；d 暂停新写作，下一最小单元是复审后指定的 Voxt 10 displayed Step 2（一个 Step 一个提交）；p3→p0 回绕、评分卡第 32 行、Step 5 审计证据三条 reviewer 线索留待固定复审。本轮没有授权的新教程单元。
- 定向核对：`bd884d2..HEAD` 对 `src/`、`docs/`、`memory/`、`transcript/` 无 diff（只有 `fee7264` 的报告提交）；`26941bb..HEAD` 对冻结的 Voxt 11 路径无 diff——`ModelStorageUpdates.svelte`、`models-and-app-updates.mdx`、两个 deep 文件、本章 transcript 和评分卡均未变（`bd884d2` 改了 Voxt 10 的 `FileTranscription.svelte` 与对应 transcript，`0c80581` 改了共享的 `memory/progress.md`，不在冻结范围内）。`git diff --check` 通过。
- **本轮修复的 review finding 为 0。** 逐条核对 review.md 中 [d] 开放项：Voxt 08 已协调 GO（`bb70918`），其报告句记录项已在此前一轮改毕（本文件旧条目：「已改为教程提交 `bb70918` 与报告提交 `b233fbe` 两笔分开」）；Voxt 11 的 caption 15 词、stop request、第 2 步近似号与双语换算、第 3 步手机分行均已被协调在 `6467ab7` 复审中确认「未回退」（review.md:1019）；评分卡头部已同步 54/60、119/120、143/144、机制 11/12（Step 4 `3aa0d2d` GO、Step 5 冻结待审），第 32 行口径属留待固定复审的三条线索之一，不动；Voxt 10 全章与 Voxt 11 Step 5 按 direction 冻结。Voxt 11 整章保持协调基线 **R1–R5 54/60、机制 R6 11/12、原十二项 143/144，NO-GO**；Voxt 10 不因作者自评改分。
- 按 direction，本轮不运行 EVAL 硬门、逐相审计或实图采集，不重跑无教程 diff 的检查。未启动 dev server 或浏览器，没有新截图。`pgrep` 列出的 `cdp-zutH77`／`cdp-t05Xt4` 两台 headless Chrome 和 4329 端口的 `astro preview` 均属后台 regress 工作树（`.orca/.../state/regress/wt`），非本轮所起；`ps` 被系统拒绝无法核 PPID，未动它们。
- 剩余事项：`bd884d2` 与 `99ed414`／`26941bb` 的协调固定复审；复审后指定的 Voxt 10 displayed Step 2；Voxt 12 排在性能谱系与 P0 清理之后；主人最终视觉验收。

---

# lane k1 本轮报告 · Omni 11 Step 1 的 Omni-46

日期：2026-11-27。类型：修旧（direction 04:56 指定的单个 P0）。本轮开始 HEAD 与 `origin/tutorials` 均为 `209c3fa`，工作树干净。范围只有 Omni 11 Step 1 的组件、caption、双语 deep、必要的 DAC 出处回指、MDX 出处、生成 transcript、定向审计和本报告；未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。Step 7／8 的舞台和 Ch.12 交接没有源码 diff。

## 修复与评分边界

- 教程提交 `4820eb3` 已推到 `origin/tutorials`，首次推送成功，未 force-push。**Omni-46 作者修复完成，待协调固定复审，不自行销项。** 固定 `f68e067` 的协调 **79/80、15/16、192/192 NO-GO** 仍是既有基线，本报告不改写它。
- Step 1 改为四个可辨认相位：十个条目都等待 → Slow AR 只选出 `c0` → 工作交给 Fast AR，`c0` 仍单独存在 → Fast AR 补齐 `c1–c9`，最后得到 `1 + 9 = 10`。caption、舞台、双语 deep 和 MDX 使用同一顺序。
- 首步删除 40 帧开窗、400 codes、1.858 秒和 final flush 的同入内容。40 帧开窗仍由 Step 7 讲解。Step 2 的 DAC 符号来源改为本步配置，Step 7 的 DAC 几何回指改为 Step 2；两处只改来源回指，没有改机制或数字。
- 小学生复述：「Slow AR 先选第一个 code，Fast AR 再在同一帧补另外九个。」独立 `explore` 冷读先指出蓝色同时表示当前 loop 和 codes；随后把 loop 卡改为中性色并删除蓝色交接箭头，复审确认该洞关闭，未留下源码、transcript 或双语 deep 冷读洞。
- 独立冷读最终给出 Step 1 R1–R5 **10/10**、机制 R6 **2/2（源码与 DOM）**、原十个非视觉项 **20/20**、原 #5 **2/2**。原 #4 因无图像输入未评分，因此不声称原十二项满分或视觉 GO。

## 目标硬门与证据

- 最终 `npm run build`：**60 页**通过；八步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 11`、`zh-check` 和 `git diff --check` 均通过。
- transcript 连续两次逐字一致：**2,147 词**，SHA-256 `3596af63a07cfacf15a614592df9407d54a79d257d64cdd3ec701abe285e6a6a`；无 caption、文字出界、重叠或文本规则报告。
- 英中全章 360／390／430 px `mobile` 均报 **no layout breaks**，中文 Step 1 字号门通过。首轮英文手机图例出界 **18／20／22 px**，缩短手机图例后重跑通过；这不是遗留问题。
- `.bot/out/omni46-full-en/report.json` 与 `omni46-full-zh/report.json`：每种语言 **8 步、38 相位、30/30 机制转变**，最低可见字号分别 **10.506／11.253 CSS px**，文字重叠、SVG 出界和灰尾溢出均为 **0**。Step 1 英中各四相 PNG 与报告已随教程提交；全章其他 PNG 保留在本 lane 的对应目录，可用已提交脚本重采。
- 英文全章首轮采集在 180 秒超时，停在 Step 8 phase 2；随后用 300 秒时限完整重跑并通过，未把超时轮计为证据。中文全章和 Step 1 英中复采均完整通过。
- `.bot/out/omni46-final-deep/report.json`：Omni 11 Steps 1／2／7／8 与 Ch.12 Step 1 的英中 deep 共 **10 个打开抽屉视图**，counter 和 `aria-expanded=true` 正确，`missing=[]`，页面／抽屉横溢、KaTeX error、raw math 均为 **0**。Step 1 双语 deep PNG 已提交。
- 主线程和独立冷读者都不能读取 PNG，工具明确返回“不支持图像输入”。以上结论来自构建、transcript、源码、DOM 和几何检查，**未声称看过图片或视觉通过**。逐相 PNG 已生成并保存，仍需具备图像能力的复审和主人最终视觉验收。

## 剩余与清理

- 剩余事项是 Omni-46 的协调固定复审、原 #4 的图像评审和主人最终验收。其他开放 finding 未改；Omni 14、Voxt、ML Systems 的队列不因本报告改变。
- 未跑全站回归、真实 Fish／SGLang-Omni、模型、GPU、音频质量、故障注入或 reduced-motion 动态切换。最新回归只有未列出布局步骤的 `(exit 13)`，不据此返工。
- 本 clone 的 `node_modules` 原指向协调人 checkout；首次 build 因该链接报 EPERM 后，只删除本目录内符号链接并在本目录安装依赖。package 文件无 diff，未写协调人的 checkout。
- 代表截图：`.bot/out/omni46-after-en/s1-p1.png`（只有 `c0`）和 `.bot/out/omni46-after-en/s1-p3.png`（Fast 补齐）。本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4496`，地址：`http://localhost:4496/learning-sglang/omni/ch/11-fish-s2-pro/?step=1`。
- 本轮 4496 dev server 已停止，端口无监听，检查脚本均退出。最终 `pgrep` 只列 `cdp-bbyuf6`／`cdp-xOLgfX` 两个 Chrome；`ps` 被系统拒绝，无法核其 PPID 或归属，故未动它们。

---

# lane k2 本轮报告 · ML Systems 06 Step 3 的 ML-37

日期：2026-11-27。类型：修旧（direction 指定的单个开放 finding）。本轮开始 HEAD 与 `origin/tutorials` 均为 `862d505`，工作树干净。范围只有 ML 06 Step 3 的组件、双语 deep、出处说明、生成 transcript、本章评分卡与进度记录、定向审计和本报告；其余七步、其他章、其他书、`.bot/memory/` 和第 1 本受保护英文原文均未改。ML 10 继续冻结，ML 12 未重开，第 14 章未开启。

## 修复与作者评分边界

- 教程提交为 `0c80581`。首次推送被拒后执行 `git pull --rebase origin tutorials`，再推送成功，未 force-push。
- **ML-37 作者修复完成，待协调固定复审，不自行销项。** Step 3 展开一份 rollout record：`rollout_log_probs` 是模型写每个回答 token 时的分数，`reward = ?` 留给第 4 步的回答检查器填写。前者逐 token 记录，后者给整个回答打分。caption、舞台、双语 deep 和 MDX 出处说明使用同一区分，不再把两类分数统称为「生成分数」。
- Step 3 作者复评：R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、新内容洞 **0**。小学生复述：「模型给每个回答 token 各记一个生成分数；检查器下一步才给整个回答 reward，两种分数不一样。」其余七步没有教程 diff，既有协调分数和全章 verdict 不变。

## 目标硬门与证据

- 最终 rebase 后 `npm run build`：**60 页**通过；八步 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 06`、`zh-check` 和 `git diff --check` 均通过。
- transcript 连续两次逐字一致，最终重采与 pinned 无 diff：**1,517 词**，SHA-256 `58c569eaa3a84b8619bc12e641c9f228ae2623aad0faecb4020f52bae8c686f6`；无 caption、文字出界、重叠或文本规则报告。
- 英中全章及中文 Step 3 的 360／390／430 px `mobile` 均报 **no layout breaks**；rebase 后英中 Step 3 末相复查也通过，中文字号门通过。
- `.bot/out/ml37-step3-audit/report.json`：共 **16 个状态**，包括英中桌面各四相、英中 360／390／430 px 末相和双语 deep。英中桌面各 **3/3 个机制转变**；counter、step、phase 正确，普通状态均确认 `deep=false`。最低可见字号 **10.194575 CSS px**，文字重叠、SVG 出界和页面横溢均为 **0**；deep 均 `aria-expanded=true`，KaTeX、raw math 和抽屉横溢失败均为 **0**。最终连续两次审计均 `failures=[]`。
- 首轮采集受持久化 deep drawer 影响，曾把中文桌面缩到 8.006 px、手机抽屉盖住舞台；这些图已作废。采集脚本在加载前固定 `deep=0`，并断言所有普通状态抽屉关闭，再重跑上述终稿证据。这是采集问题，不记教程 finding。
- 主线程按 transcript、组件、双语 deep 和逐相 DOM 冷读，未发现新增内容洞。当前模型不能读取 PNG，以上结论来自构建、transcript、源码、DOM 和几何检查，**未声称看过图片或视觉通过**。独立 `pstack-reviewer` 因配置模型不存在而未启动，未计为证据。

## 剩余与清理

- 剩余事项是 ML-37 的协调固定复审、原 #4／#5 与原十二项评分、图像能力复审和主人最终视觉验收。其他开放 finding 未改；ML 10 等既有冻结队列不因本报告改变。
- 未跑全站回归、真实 slime 训练、GPU benchmark、故障注入或 reduced-motion 动态切换。最新回归只有未列出布局步骤的 `(exit 13)`，不据此返工。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 代表截图：`.bot/out/ml37-step3-audit/zh-desktop-p3.png`。本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4495`，地址：`http://localhost:4495/learning-sglang/ml-sys/ch/06-slime-rollout-loop/?step=3`。本轮 4495 dev server 已关闭，检查脚本均退出，无 PPID 1 的 headless Chrome 残留；其他 lane 的进程未动。

---

# lane k1 本轮报告 · Omni 14 Step 7 的 Omni-37

日期：2026-11-27。类型：修旧（单个开放 finding）。本轮开始 HEAD 与 `origin/tutorials` 均为 `a35f06d`，工作树干净。范围只有 Omni 14 Step 7 的组件、双语 deep、生成 transcript、本章评分卡、逐相／deep 验证脚本和本报告；其余七步、Omni 11／13／15、其他书、`.bot/memory/` 和第 1 本受保护英文原文均未改。

## 修复与作者评分边界

- **Omni-37 作者修复完成，待协调固定复审，不自行销项。** Step 7 先在 SSE 面板出现 `error`，下一相在同一个 reader／stream 下补出 `partial_audio=true · audio sent` 和 `action=discard · reader drops it`，随后才出现 raw 响应流提前结束。caption 直接写出两个字段；双语 deep 的「图上是什么」、出口表和一句话与舞台使用同一对象和含义。pinned `sglang-omni@9725235249df851281d4dc62a04b2d34b02ac0fe` 的 `speech_streaming.py` 在同一个 `stream_events()` 中以 `emitted_audio` 决定 `error.update(partial_audio=True, action="discard")`，与图示一致。
- Step 7 作者复评：R1–R5 **10/10**、机制 R6 **2/2**、原十二项 **24/24**、内容洞 **0**。小学生复述：「首音前 HTTP 返回 JSON 503；发出声音后，SSE error 告诉读者声音已发并让其丢弃，raw 响应流提前结束。」这是作者结果，固定 `968eb98` 的协调 **191/192 NO-GO** 不在本轮自行改写，也不声称全章协调 GO。
- 其余七步没有教程 diff；Omni 11 的固定复审等待状态不变，本轮未开第 16／17 章。

## 目标硬门与证据

- 最终 `npm run build`：**60 页**通过；八步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 14`、`zh-check` 和 `git diff --check` 均通过。
- 最终 transcript 连续两次逐字一致：**2,306 词**，SHA-256 `0474b93abf85f061903eedd474b37fe0f75ec398d1386c05615c51a7e6b2e4c3`；无 caption、文字出界、重叠或文本规则报告。
- 英中全章及中文 Step 7 的 360／390／430 px `mobile` 均报 **no layout breaks**，中文 Step 7 字号门也通过。
- 英中 Step 7 各有 **4 个桌面相位、3/3 个机制转变**，counter 均为 `07 / 08`。英文最低 **10.891 CSS px**、中文最低 **12.207 CSS px**，文字重叠和 SVG 出界均为 **0**。证据：`.bot/out/omni37-step7-audit/report.json`、`.bot/out/omni37-step7-audit-zh/report.json`；代表截图：`.bot/out/omni37-step7-audit/s7-p2.png`。
- Step 7 英中 deep 在 1440／360／390／430 px 共 **8 个打开抽屉的视图**全部通过 counter、`aria-expanded=true`、字段与白话存在、无页面或抽屉横溢、无 KaTeX／raw-math 错误。证据：`.bot/out/omni37-deep-audit/report.json`。
- 当前模型不能读取 PNG，以上结论来自构建、transcript、源码、DOM 和几何检查，**未声称看过图片或视觉通过**。未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、模型、GPU、音频质量、故障注入或 reduced-motion 动态切换。剩余事项是 Omni-37 的协调固定复审、图像能力复审和主人最终视觉验收。

本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4321`，地址：`http://localhost:4321/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=7`。本轮 4321 dev server 已关闭；检查脚本均退出，无 PPID 1 的 headless Chrome 残留。

---

# lane d 本轮报告 · Voxt 11 Step 5 逐相机制返工（冻结待审）

日期：2026-11-27。类型：修旧（direction 04:31 指定的 lane d 下一最小单元）。范围：`src/components/voxt/ModelStorageUpdates.svelte` 的 Step 5、生成 transcript、评分卡与进度记录、本报告；未改其他步、双语 deep、MDX、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。Voxt 10 继续冻结，Voxt 12 未开。

## 做了什么

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `c76b855`，工作树干净。direction（04:31）lane d 单元：只修 Voxt 11 Step 5，把 release／feed 查询、匹配 DMG 或发布页、helper 因版本不匹配而拒绝拆成可辨认相位。
- **Step 5 从 3 相改为 4 相，每相只改变一个对象，变化内容完整进入红框**：p0 feed 查询待定（左侧面板虚线 `update list ?`／`the updater asks`，红框在左侧面板）→ p1 应用内路线完成（`Voxt 2.1 on disk`＋`the updater replaces the bundle`＋`a card then asks for a restart`，红框在左侧面板）→ p2 无源路线决定（`a DMG for this Mac?`→`matching DMG · download and install`，同时 `no match → release page` 出现，红框在右侧决定块）→ p3 重启前 helper 被拒（`does the new helper start?`→`app's helper manager refuses it · mismatch with the app`，红框在拒绝盒）。`RESTART VOXT → UPDATE DONE` 从分相 cut 改为静态行。
- 保留：既有条件路由（feed→应用内；无源→匹配 DMG，否则发布页）、`development builds have no update` 静态行、模型文件夹不动条、15 词英文 caption（未动）、中文 caption（未动）与双语 deep（未动）。

## 检查结果

- `npm run build`：60 页通过。
- Step 5 `readability`：0 机械问题；本章 `transcript` 连续两次逐字一致（SHA-256 `22f8695915e45441d6f38bbec9ccf996a6be5dd0d05cbf922d74cc13cbea696a`，1510 词），与 pinned 只差新增的 `a card then asks for a restart` 一行，无出界／重叠／规则标记。
- `deep-check 11`、`zh-check`：通过。英中本章三宽度 `mobile`：无布局断裂；`ONLY=11 STEP=5 LANG=zh` 字号门通过。
- 逐相 DOM 审计（`.bot/out/voxt11-step5/audit.mjs`，英中 × 桌面／390 px）：p0→p1、p1→p2、p2→p3 每次只有一个对象的文字新增／消失，全部落在红框内；四相均无文字出界、无文字重叠。相位截图 16 张在 `.bot/out/voxt11-step5/`；本 lane 模型不能读 PNG，实图仍待协调人读取或重拍。
- 环境：本 lane `node_modules` 是指向主 checkout 的符号链接，Vite 默认 403 链接外文件（hydration 失败、相位不走）；本轮用 `VITE_CACHE_DIR`／`VITE_FS_ALLOW` 环境变量绕行，`astro.config.mjs` 的临时改动已还原、未提交。4321 被占，dev server 用 4322，已关闭。发现一台非本轮起的残留 headless Chrome（pid 36299，`cdp-bnP9r7`），无法查 ppid，未 kill。本轮自起的浏览器均已关闭。

## 修复的 finding 与剩余

- 本轮修复的 review finding：Voxt 11 Step 5 机制 **1/2** 的返工项（direction 04:31 指定），冻结待协调固定复审核销，不自行提分；机制 R6 保持协调 `3aa0d2d` 的 **11/12**，整章 **54/60、119/120、24/24、143/144** NO-GO 不变。评分卡与 `memory/progress.md` 已同步上述口径。
- 未动的开放项：评分卡同步类 findings（review.md 的 Voxt 10 11 步口径重记两行、Voxt 11 评分卡旧基线两行）——它们要求按 Voxt 10 冻结树的口径重记分数，direction 将 Voxt 10 继续冻结待审，本轮单元仅限 Step 5。
- 剩余：Step 5 待协调固定复审（建议读 `.bot/out/voxt11-step5/` 相位图或重拍）；之后按 direction 承接旧目录 `ls-d-1127-031109` 的 FileTranscription 草稿 displayed Step 1（一个 Step 一个提交，不移植其余九步）；Voxt 10 复审；Voxt 12 排在性能谱系与 P0 清理之后。
- 未跑真实 Voxt、模型下载、应用更新、模型进程、全站回归或 reduced-motion 动态切换；事实沿用 pinned `updates.go`／`updates_github.go`，无新事实引入。

---

# lane k1 本轮报告 · Omni 11／14 按协调要求继续冻结

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `436a93d`，fetch 后仍一致。direction（04:06）要求 Omni 11 三项返工 `d222476`／`287f946`／`676b6d4` 与完成报告 `f68e067` 继续冻结，k1 等协调固定复审，不自行销项；Omni 14 后续提交另审。本轮没有授权的新教程单元。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，不自行关闭；Omni-37 保持开放。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 和固定 `968eb98` 的 **桌面字号 GO、完整 EVAL 191/192 NO-GO** 都只是既有协调基线，本轮分数不变。
- 定向核对 `f68e067..HEAD` 的 Omni 11／12 冻结教程文件和 `5c5f749..HEAD` 的 Omni 14 教程文件，diff 均为空；`git diff --check` 通过。最新回归测的是 `a93dc0b`，只有未列出布局步骤的 `(exit 13)`，不据此返工。
- 按 direction，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据整理。未启动 dev server 或浏览器，没有新截图。
- 剩余事项是 Omni 11 的协调固定复审、Omni 14 的后续独立复审，以及主人最终视觉验收。
---

# lane d 本轮报告 · Voxt 性能规划 + Voxt 11 评分卡同步

日期：2026-11-27。类型：规划＋记录同步。范围：`docs/plan-voxt.md`、`memory/scores/inside-voxt/models-and-app-updates.md`、`memory/progress.md`、本报告；未改教程、transcript、组件、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `436a93d`，工作树干净。direction（04:06）lane d 的下一单元是「先改规划」：当前 `docs/plan-voxt.md` 没有性能部分。
- **性能公开谱系已排全进 `docs/plan-voxt.md`**（复审后重写）：「性能公开谱系（规划）」一节覆盖 direction 点名的六个主题——停止到出字、分段识别、预填和复用、流式整理、启动、评测口径，每个主题标落点、方案 PR 链、可引数字（各带测量 head／机器／样本／证据边界）、合入／发布（beta／stable）／真机验收分层和未闭环项。节末覆盖图把 pinned 来源声明的全部 **327 个 covered PR** 逐一分到六个主题之一（含落点章节）或六个排除类之一（X1 TTS／多模态分支、X2 模型接入、X3 CI／发布工程、X4 质量修复、X5 功能／UI／感知流畅度、X6 会话生命周期），外加公开 issue #94；脚本核对 `missing=0、extra=0、map unique=327`（提取来源中 `[#NNNN](…/pull/…)` 链接集合，与 `docs/plan-voxt.md` 覆盖图逐一比对）。初审漏掉的 `#4497`、`#1807`、`#3285`（含 0.88× 负结果）、会议链 `#4539/#4541→#4640/#4644/#4645` 和 `#4722/#4727/#4728` 均已补入；`#4722` 只用 superseding 的 concurrent 口径（11.41→1.90 s／27.13→15.84 s，setup 全录），serial 旧数标为 superseded 历史不引用。数字边界已逐条对回来源：`#2549` 的 first preview 更正为 **p50/p95** 202/1207→197/2518 ms；`#4612` 补 candidate `4f675f06eab5`／baseline `09dc7839e93c` 与 6 场景×10；`#4643` 补测量 head `1468412f5530`、ASR＋llama.cpp setup 与样本；`#4593` 补非最终 build、head 未单列与 fast-forward；`#4295` 补机器／模型／输入与 head 归属争议；`#4407` 标明各组独立测量 commit 未给；`#2833` 补验证 head `fd29e6607a6b` 与平台。来源只用 `.bot/perf-public.md`（SHA-256 `f79e8657…74ffb8`，与 direction 一致）与公开 PR；不写群名、聊天原文、人名、机器名、NAACL，不把旧 head 数字写成当前结果。不开新章、不开 Voxt 12。
- **Voxt 11 评分卡与进度已同步**：机制 R6 从协调 `fa8d912` 的 **9/12** 升为协调固定 `2760565` 的 **10/12**（逐步 2、2、2、1、1、2，Step 3 GO）；内容分保持协调 `6467ab7` 基线 R1–R5 **54/60**、原十个非视觉项 **119/120**、静态 R6 **12/12**、原 #4/#5 **24/24**、原十二项 **143/144**，整章 NO-GO 不变。评分卡材料行补入 `2760565`，第 3 步段落标题改为已复审 GO，待办行改为 Voxt 10 冻结待审、Voxt 12 排在性能谱系与 P0 清理之后；`memory/progress.md` 第 11 章行同步为 10/12、Step 1／2／3 GO、Step 4 冻结、Step 5 1/2。Step 4 教程 `2d1e868`／报告 `3aa0d2d` 冻结待独立复审，Step 5 未动。
- **本轮修复的 review finding：** Voxt 11 的「评分卡同步」未决项（direction 的 10/12 同步要求）已落实。Voxt 08 的两提交更正（教程 `bb70918`＋报告 `b233fbe`）在本轮开始前已在树中（归因 `f97c179`，现 `.bot/out/report.md:1323` 与 `:1503`），不是本轮修复，仅在此说明不计入。其余 lane d 开放项（Voxt 10 冻结待审、Voxt 11 Step 4 冻结待审、Step 5 机制 1/2）按 direction 不动。
- 第二轮复审五项已修：`#3360` 回到主题 2 正文（MERGED 长音频可靠性测量链，不提供通用提速结论）；`#3580`/`#3604` 补 `c=1 non-streaming` 与「输出差异仍不能省略」边界；`#4650`（head `d8ee54cd26f4`、merge `26cfbcef1722`）与 `#4707`（head `095226b8d0ba`、merge `da2cadcf72b8`）恢复 MERGED 分层字段，与 pending 验收分开；`#2549` 补 meeting update gap 退化为未量化负结果；`#2648`、`#4184` 从 X3 改归主题 2 共享 runner／kernel 线（来源描述为跨模型共享运行时代码，不是 CI／发布工程）。
- 第三轮复审三项已修：覆盖图口径更新为来源最新 canonical **327 covered / 3,587 excluded / 3,914 total**（01:42 轮，4732–4738 excluded）；`#3414` 从主题 2 链移出、归入主题 3 prefill 链（与覆盖图一致）；`#4655` 补 head `ae0ab9500644`、merge `6f68205867bb`，pending 验收边界保留。
- 本轮无教程源码 diff，未重跑 EVAL 机械门；已跑 `git diff --check`（通过）和上述来源→规划 PR 覆盖核对（covered 327、not in map 0、extra 0、map unique 327）；未启动 dev server 或浏览器，没有新截图；未跑全站回归、真实 Voxt、模型或更新。
- 剩余：等 Step 4 的协调独立复审（重点：四相每次只改变一个可辨认对象、字节／时间／错误边界、hydration／counter／phase、红框包含、完整组件图证）；Step 5 同类返工；Voxt 10 复审；按规划补 04／06 性能指向并写各落点。

---

# lane k1 本轮报告 · Omni 11／14 继续冻结等待固定复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `c1c1bfd`，fetch 后仍一致。direction（03:43）要求 Omni 11 三项返工 `d222476`／`287f946`／`676b6d4` 与完成报告 `f68e067` 继续冻结，k1 等协调固定复审，不自行销项；Omni 14 后续提交另审。本轮没有授权的新教程单元。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，不自行关闭；Omni-37 保持开放。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 和固定 `968eb98` 的 **桌面字号 GO、完整 EVAL 191/192 NO-GO** 都只是既有协调基线，本轮分数不变。
- 最新回归测的是 `a93dc0b`，只有未列出布局步骤的 `(exit 13)`，不据此返工。按 direction，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据整理。
- 未启动 dev server 或浏览器，没有新截图。剩余事项是 Omni 11 的协调固定复审、Omni 14 的后续独立复审，以及主人最终视觉验收。

---

# lane k1 本轮报告 · Omni 11／14 按协调要求继续冻结

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `ef9b2bf`，fetch 后仍一致。direction（03:43）要求 Omni 11 三项返工 `d222476`／`287f946`／`676b6d4` 与完成报告 `f68e067` 继续冻结，k1 等协调固定复审，不自行销项；Omni 14 后续提交另审。本轮没有授权的新教程单元。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，不自行关闭；Omni-37 保持开放。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 和固定 `968eb98` 的 **桌面字号 GO、完整 EVAL 191/192 NO-GO** 都只是既有协调基线，本轮分数不变。
- 按 direction，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据整理。未启动 dev server 或浏览器，没有新截图。
- 剩余事项是 Omni 11 的协调固定复审、Omni 14 的后续独立复审，以及主人最终视觉验收。

---

# lane k2 本轮报告 · ML Systems 05 Steps 5–7 与 04→05 接缝

日期：2026-11-27。类型：修旧（同章两个 finding，加上一章的接缝 finding）。范围只有 ML Systems 04／05 的指定步骤、双语 deep、ML 05 MDX、`docs/plan-ml-sys.md` 的对应行、生成 transcript、定向审计和本报告；未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML 10 继续冻结，ML 12 继续延期，第 14 章未开启。

## 提交与 review 修复

- 本轮开始 HEAD 为 `ef9b2bf`。教程提交为 `436a93d`（ML-26／27）、`e4a3c8e`（ML-32）和 `19bbd05`（ML 05 中文 leader 称谓收尾）。三次首次推送均被拒，均执行 `git pull --rebase origin tutorials` 后推成功，未 force-push。
- **ML-26 作者修复完成，待协调核销。** ML 05 Step 6 不再把 TP GROUP 画成黑盒。六相依次展示 HTTP 分词、本地 ZMQ、rank 0 leader scheduler、跨 rank 交接、两节点 r0–r7 和输出返回。图上明确 leader 是 rank 0 的 scheduler 角色，不是第 9 个 worker；第 4 章的张量交换与本次请求交接分开标注。双语 deep、MDX 和固定 Dynamo `worker.rs`／`lib.rs`／`http.rs` 出处一致。
- **ML-27 作者修复完成，待协调核销。** Steps 5–7 现在使用同一个构造的 `stream:true` 请求。Step 5 的请求、curl、`choices[0].delta.content` 和 `[DONE]` 都是流式；Step 6 沿固定内部 `stream=true` 和新增 token 输出路径返回 SSE delta；Step 7 测量同一条流的内容 delta。图上和 deep 都注明：本例每个 delta 携带一个 token，真实 SSE 事件边界可以不同。
- **ML-32 作者修复完成，待协调核销。** ML 04 Step 7 不再问“请求怎样到达 Ring 的 GPU”，改为问服务 worker 怎样启动。ML 05 Step 1 直接以 SGLang readiness 和 HTTP 启动回答；双语 deep 的 Next 与规划表同步，避免暗示 Dynamo 必然使用教学的 Ring。

## 作者冷读与评分边界

主线程按当前 transcript、双语 deep 和逐相 DOM 冷读。只重评本轮改动的四步，其余步骤不改既有协调基线。原十个非视觉项不含需要实图的 #4／#5。

| 章／步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 04／7 | 10/10 | 2/2 | 20/20 | 一段传输多等 d，后面的相关轮次也多等 d；下一章先启动 worker，再让 GPU 组成服务。 | 0 |
| 05／5 | 10/10 | 2/2 | 20/20 | `stream:true` 让回答片段逐个到达，`[DONE]` 表示这条流结束。 | 0 |
| 05／6 | 10/10 | 2/2 | 20/20 | rank 0 的 scheduler 经本地 ZMQ 收到 token，再把工作交给两节点的 8 个 worker；回答按 SSE delta 返回。 | 0 |
| 05／7 | 10/10 | 2/2 | 20/20 | 首个 delta 等 250 ms，后三段共 75 ms，所以同一条流共 325 ms。 | 0 |

四步作者参考值合计为 R1–R5 **40/40**、机制 R6 **8/8**、原十个非视觉项 **80/80**、新内容洞 **0**。Step 5 只新增流式返回这一件事；Step 6 的 ZMQ 已在第 1 本 Ch. 9 讲过，leader 就地解释为 rank 0 scheduler；Step 7 沿用第 1 章的计时词和算式。当前模型读取 PNG 返回“不能读取图片”，因此原 #4／#5、原十二项总分和整章协调 verdict 不自行给分，既有协调分数不因本报告改变。

## 硬门与机制证据

- 最终教程代码的 `npm run build`：**60 页**通过；`git diff --check` 通过。ML 04 Step 7 与 ML 05 Steps 5–7 的 `readability` 均为 **0 机械问题**；两章 `deep-check` 各识别七步，`zh-check` 均为 **all clear**。浏览器检查显式使用本 clone 的 4494 服务。
- ML 04 transcript 稳定为 **1,207 词**，SHA-256 `5dcdfc7f85ba3e254b043ca78fa6fbb2f9c2b4696765e13db57473442259005a`。ML 05 transcript 连续两次逐字一致，**1,535 词**，SHA-256 `5f4e18e3e842dfb3988d6412e8e85712389ff07002fbe564ce7387784a92ea8b`。
- 两章英中全章 `mobile` 均在 360／390／430 px 报 **no layout breaks**；中文 ML 04 Step 7 和 ML 05 Steps 5／6／7 的逐步字号门也通过。
- `.bot/out/ml05-review-audit.mjs` 与 `report.json`：**50 个普通状态**（32 桌面＋18 手机）、**26/26 个机制转变、3/3 个改动机制步、6 个 deep 状态、50 个不同 PNG 哈希**。最低可见字号 **10.76 CSS px**，文字重叠与 SVG 出界均为 **0**；deep 展开、counter、KaTeX、raw math 和横溢断言全部通过。目录另存 **6 张 deep PNG**，代表图为 `.bot/out/ml05-review-audit/en-1440-s6-p5.png`。
- `.bot/out/ml04-next-audit.mjs` 与 `report.json`：英中各保存 Step 7 的 phase 0／3 和 deep，共 **4 个普通状态＋2 个 deep 状态**。最低 **12.593 CSS px**，重叠与出界均为 **0**；两条语言接缝都核到 ML 05 Step 1 的 readiness／HTTP 回答。代表图为 `.bot/out/ml04-next-audit/zh-s7-deep.png`。
- 上述 PNG 是本机证据，当前模型未读取图片，结论来自构建、transcript、DOM、几何和哈希，**未声称看过图片或视觉通过**。独立 `pstack-explorer` 因配置模型不存在而未启动，未计为证据。

## 剩余与清理

- 剩余事项是 ML-26／27／32 的协调固定复审、原 #4／#5 与原十二项评分，以及主人最终视觉验收。此前 ML-16／23／35／25 的作者修复也继续等协调核销；ML-21／22 等其他开放项未改。
- 未跑全站回归、真实 Dynamo／SGLang、GPU benchmark、故障注入或 reduced-motion 动态切换。最新回归仍只有不可分配布局步骤的 `(exit 13)`，不据此返工。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4494`。地址：`http://localhost:4494/learning-sglang/ml-sys/ch/05-distributed-serving/?step=6`。本轮 4494 dev server 已关闭，本轮启动的浏览器已关闭；其他 lane 的活跃进程未动。

---

# lane k1 本轮报告 · Omni 11／14 继续冻结等待固定复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `f526da2`，fetch 后仍一致。direction（03:34）要求 Omni 11 三项返工 `d222476`／`287f946`／`676b6d4` 与完成报告 `f68e067` 继续冻结，k1 等协调固定复审，不自行销项；Omni 14 后续提交另审。本轮没有授权的新教程单元。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，不自行关闭；Omni-37 保持开放。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 和固定 `968eb98` 的 **桌面字号 GO、完整 EVAL 191/192 NO-GO** 都只是既有协调基线，本轮分数不变。
- 定向核对 `f68e067..HEAD` 的 Omni 11／12 冻结教程文件和 `5c5f749..HEAD` 的 Omni 14 教程文件，diff 均为空；`git diff --check` 通过。最新回归测的是 `a93dc0b`，只有未列出布局步骤的 `(exit 13)`，不据此返工。
- 按 direction，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。未启动 dev server 或浏览器，没有新截图。
- 剩余事项是 Omni 11 的协调固定复审、Omni 14 的后续独立复审，以及主人最终视觉验收。

---

# lane k2 本轮报告 · ML Systems 07 的 ML-16／23／35

日期：2026-11-27。类型：修旧（一个章节的三个开放 finding）。范围只有 ML Systems 第 7 章的组件、双语 deep、MDX、生成 transcript 和本报告；未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML 10 继续冻结，ML 12 继续延期，第 14 章未开启。

## 提交与修复

- 本轮开始 HEAD 为 `4be48ad`。按 direction 先处理 review.md 中本书的开放项，不重做 ML 03–09 的既有机制。三个教程提交为 `c5448d8`（ML-35）、`3086bd0`（ML-23）、`f526da2`（ML-16）。两次推送被拒后均执行 `git pull --rebase origin tutorials` 再推，未 force-push。
- **ML-35 作者修复完成，待协调核销。** Step 1 的桌面和手机标题收窄为一个 `q_proj` 张量的模型代码与整个调用；右卡和移动公式同步点名 `q_proj`。双语 deep 与 MDX 说明它是这个调试示例的张量名。7.047 秒、0.001 秒、0.033 秒、33 倍和全部相位不变。
- **ML-23 作者修复完成，待协调核销。** 移动渲染新增可选 `mobileArrows: false`，只用于 Step 2 的三条备选路线和 Step 8 的一组训练保存表。真实顺序流程仍保留箭头，桌面不变。
- **ML-16 作者修复完成，待协调核销。** Step 2 直接标为 `1 of 3`，仍是八步，不重排 URL 或 Ch. 7 引用。六相依次形成保存 v1 checkpoint、读取 checkpoint、装入本地分片、distributed 地图、tensor 地图和总结。`local shard` 在图上解释为每个推理 worker 自己那片。双语 deep 补同一顺序、公式和符号表；MDX 保留固定源码与「没有磁盘计时」边界。

## 作者冷读与评分边界

主线程按当前 transcript、组件和双语 deep 冷读。下表只重评改动的 Step 1／2／8；其余五步不改既有基线。原十个非视觉项不含需要实图的 #4／#5。

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 1 | 10/10 | 2/2 | 20/20 | 一个 `q_proj` 张量的整个调用约是模型代码本身的 33 倍；完整 1B 更新的 7.047 秒是另一组测量。 | 0 |
| 2 | 10/10 | 2/2 | 20/20 | 新权重有三条路；磁盘路线先保存再读文件，每个推理 worker 最后装入自己那片。 | 0 |
| 8 | 10/10 | 2/2 | 20/20 | 训练还保存梯度和优化器状态；装不下时，下一章把这些表分给多张 GPU。 | 0 |

三步作者参考值合计为 R1–R5 **30/30**、机制 R6 **6/6**、原十个非视觉项 **60/60**。`rank` 和 `worker` 已在第 4／5 章解释，`local shard` 在本步就地解释，未发现新增冷读洞。当前模型不能读取图片，因此原 #4／#5、原十二项总分和整章协调 verdict 不自行给分；既有协调分数不因本报告改变。

## 硬门与机制证据

- 最终 rebase 后教程 HEAD 为 `f526da2`。`npm run build`：**60 页**通过；八步 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 07`：八步接线正确；`zh-check`：**all clear**；`git diff --check` 通过。
- `BOOK=ml-sys ONLY=7 JOBS=1 node scripts/transcript.mjs http://127.0.0.1:4493/learning-sglang` 连续采集稳定：**1,990 词**，SHA-256 `cdabb856e8dead78eef4934f0ae342c9e6a1c602278dc1f76bd42c72d484f5a0`。
- 英中全章 `mobile` 均在 360／390／430 px 报 **no layout breaks**；中文 Steps 1／2／8 的逐步字号门也通过。所有浏览器检查都显式连接本 clone 的 4493 服务。
- Step 2 桌面逐相断言先核对 `data-animation-step=1` 和 `data-animation-final-phase=5`，再核对六相各自的对象与文字。保存→读取→本地装入按相出现，distributed／tensor 不会提前出现；文字重叠与 SVG 横向出界均为 **0**，最低可见字号 **11.746 CSS px**。英文和中文 390 px 手机各有 **6 个不同机制相位**，箭头均为 **0**。
- 逐页末相复核确认英中 Step 1／2／8 的 phase 分别为 3／5／4，移动箭头分别为 2／0／0；Step 3 的顺序箭头仍为 2。一次并发多标签采集出现未决相位，未计为证据；上述有效结果来自逐页采集。
- 英中 Step 2 deep 均为 `aria-expanded=true`，本地分片符号与说明存在，KaTeX 错误、残留 `$$`、页面或抽屉横向溢出均为 **0**。
- PNG 采集位于 `.bot/out/ml07-before/`、`.bot/out/ml07-ml35/`、`.bot/out/ml07-ml23-phone/`、`.bot/out/ml07-disk-phases/`（六相）、`.bot/out/ml07-disk-phone/` 和 `.bot/out/ml07-deep/`。代表文件：`.bot/out/ml07-disk-phases/p5.png`。当前模型不能读取这些 PNG；上述结论来自构建、transcript、DOM 和几何检查，**未声称看过图片或视觉通过**。

## 剩余与清理

- 剩余事项是 ML-16／23／35 的协调固定复审、原 #4／#5 与整章评分，以及主人最终视觉验收。其他开放 finding 未改，ML 09 的 ML-25 也继续等协调核销。
- 未跑全站回归、真实权重更新、SGLang／CUDA、GPU benchmark 或 reduced-motion 动态切换。最新回归只有未列出布局步骤的错误，不据此返工。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4493`。地址：`http://localhost:4493/learning-sglang/ml-sys/ch/07-weight-updates/?step=2`。本轮 4493 dev server 已关闭，检查脚本启动的浏览器均已关闭，无 PPID 1 的 headless Chrome 残留。

---

# lane d 本轮跟进二 · Voxt 10 全章 deep 抽屉溢出清零

日期：2026-11-27。类型：修旧（本轮复审跟进的必修）。范围只含 `voxt-file-transcription` 双语 deep、溢出检查脚本与结果、本章评分卡和本报告；未改组件、transcript、`.bot/memory/`、其他书或第 1 本受保护英文原文。

- 复审要求修完全章扫描剩下的 10 处抽屉溢出，并更正第 7 步的肇事元素：是 `segments ≤ cues` 公式（en:307 及中文对应行），不是 `asr.Recognize(...)`。溢出检查脚本的 widest 探测也已修正：先排除被 overflow 祖先裁剪的元素（`<pre>` 代码块的真实宽度曾被误报），再按内容盒（不是边框盒）判断。
- 修复（只改双语 deep 文字，公式含义、三分支和全部数字保留）：第 2 步 afconvert 命令按 shell 续行折成两行，符号表出处改 `asr.go:32` 并删掉与代入表重复的两行结果行；第 3 步 `uploaded bytes` 符号收窄为 `uploaded`，`Request.Bytes` 去掉等宽格式，inline 出处 `Voxt/internal/historyapi/server.go:101-114` 缩短；第 7 步 segments 公式拆成两个 display；第 8 步 SRT 代入表四列并为三列（起止合并成 `start --> end`）；第 10 步 `fmt.Sprintf` 代码块改成正文 inline code（可在空格处折行），符号表出处改 `socket.go` 短写并加说明行。
- 证据：`STEPS=1..11` 全量扫描（11 步 × 英中 × 1440/360/390/430 px = 88 个开抽屉视图）连续两轮 `failures` 为 0，断言 counter、`aria-expanded=true`、无残留 `$$`、无 `.katex-error`、`.deep-body scrollWidth ≤ clientWidth`；结果 `.bot/out/voxt10-deep-overflow-all/report.json` 与 `-r2/report.json`。本模型无图像输入，结论来自实时 DOM 几何。
- 修后重跑：build 60 页、transcript 无 diff、readability 0 机械问题、`deep-check 10`、`zh-check`、英中 360/390/430 px mobile 均通过。
- 协调基线 `04ded697` 不变：R1–R5 **110/110**、原十个非视觉项 **217/220**、原 #4／#5 **44/44**、原十二项 **261/264**、机制 R6 **0/22**。整章仍 **NO-GO**：其余十步的机制动画（EVAL §6 R6）未做，deep 抽屉修复和机械门槛不构成整章完成。4488 dev server 已关闭，浏览器随脚本退出。

---

# lane k1 本轮报告 · Omni 11／14 继续冻结等待复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `4be48ad`，fetch 后仍一致。direction（03:22）要求 Omni 11 三项返工 `d222476`／`287f946`／`676b6d4` 与完成报告 `f68e067` 继续冻结，k1 等协调固定复审，不自行销项；Omni 14 后续提交另审。本轮没有授权的新教程单元。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，不自行关闭；Omni-37 保持开放。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 和固定 `968eb98` 的 **桌面字号 GO、完整 EVAL 191/192 NO-GO** 都只是既有协调基线，本轮分数不变。
- 定向核对 `f68e067..HEAD` 的 Omni 11／12 冻结教程文件和 `5c5f749..HEAD` 的 Omni 14 教程文件，diff 均为空；`git diff --check` 通过。最新回归测的是 `a93dc0b`，只有未列出布局步骤的 `(exit 13)`，不据此返工。
- 按 direction，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。未启动 dev server 或浏览器，没有新截图。
- 剩余事项是 Omni 11 的协调固定复审、Omni 14 的后续独立复审，以及主人最终视觉验收。

---

# lane d 本轮跟进 · Voxt 10 deep 抽屉溢出修复

日期：2026-11-27。类型：修旧（本轮复审跟进的必修）。范围只含 `voxt-file-transcription` 双语 deep、溢出检查脚本与结果、本章评分卡和本报告；未改组件、transcript、`.bot/memory/`、其他书或第 1 本受保护英文原文。

- 复审检出：`4be48ad` 的第 9 步三分支公式让 deep 抽屉横向溢出（英文桌面 client/scroll = 489/509，360 px 359/509，390 px 389/509；中文 360 px 359/390），第 11 步手机 360 px 英 359/418、中 359/414。`deep-check` 只查接线、`mobile` 不开抽屉，所以上一轮的门槛全绿却没发现。
- 根因两条：deep 的 `$$` 经管道渲染成 `<p>` 里的内联 `.katex`，没有 `.katex-display` 包裹，StepControls 的 `.katex-display { overflow-x: auto }` 不生效，公式只能按真实宽度排版；表格里不可断行的长出处（`transcribe_socket.go:64-80`、`docs/transcribe.md`、`transcribe_cli.go:98-101`）把来源列撑过抽屉。
- 修复（只改双语 deep 文字，三个分支与全部数字保留）：第 9 步公式条件收窄为 `any cue fails`／`success, no -o or -o -`／`success, -o FILE`（中文对应），符号表补 `stdout` 行、出处改 `cli.go` 短写；第 11 步 provider 公式拆成两个 display，表格出处改 `socket.go`／`transcribe.md` 短写；两处各加一行短写说明。
- 新证据 `.bot/out/voxt10-deep-overflow.mjs`（可重跑）：第 9／11 步 × 英中 × 1440／360／390／430 px 共 16 个开抽屉视图，counter、`aria-expanded=true`、无残留 `$$`、无 `.katex-error`、`.deep-body scrollWidth ≤ clientWidth` 全部通过（`.bot/out/voxt10-deep-overflow/report.json`）。本模型无图像输入，结论来自实时 DOM 几何。
- **全章扫描另发现本轮之前已有的 360/390 px 抽屉溢出**（`.bot/out/voxt10-deep-overflow-all/report.json`）：第 2 步 afconvert 代码行、第 3 步 1 px、第 7 步 segments 公式、第 8 步 SRT 代入表、第 10 步 `fmt.Sprintf` 代码行。当时按复审要求留待后续；已在下一轮跟进修完（见下节）。`<pre>` 是否该由共享 CSS 加 overflow 规则另请协调定。
- 修后重跑：build 60 页、transcript 无 diff、readability 0 机械问题、`deep-check 10`、`zh-check`、英中 360/390/430 px mobile 均通过；第 4 步动画审计结论不变。
- 协调基线 `04ded697` 不变：R1–R5 **110/110**、原十个非视觉项 **217/220**、原 #4／#5 **44/44**、原十二项 **261/264**、机制 R6 **0/22**；本跟进与上一轮修复均待复审，不自行记 GO。4488 dev server 已关闭，浏览器随脚本退出。

---

# lane k2 本轮报告 · ML Systems 09 Step 2 的 ML-25

日期：2026-11-27。类型：修旧（单个布局 finding）。范围只有 `Fp8RolloutTraining.svelte` 的两行布局修改和本报告；未改文字、数字、动画相位、transcript、评分卡、`.bot/memory/`、其他章、其他书或第 1 本受保护英文原文。

## 修复

- 本轮开始 HEAD 为 `676304d`。按 review.md 的 ML-25 返工点只处理 ML 09 Step 2 手机图例的 preview overflow，不重做已通过 GO 的机制。
- 改前在 preview 等到 Step 2 末相后复现：英文图例在 **360／390／430 px** 各有 **3 px** SVG 出界。根因是这段文字宽约 **304.4 SVG units**，超过手机的 **300-unit** viewBox；中文图例没有这个问题。
- 修复只给英文 Step 2 的手机图例加 `letter-spacing: -0.2px`。文字、字号、颜色、位置、数据、相位和计时器均未改，中文渲染也不受影响。**ML-25 作者修复完成，待协调核销。**

## 硬门与证据

- 最终代码的 `npm run build`：**60 页**通过。
- `BOOK=ml-sys ONLY=9` transcript 连续生成两次，均与 pinned 文件逐字一致：**1,945 词**，SHA-256 `581558bcc38ebc08948f854ba31fa010d7f90de03edee7c229f42ce31a68c034`。最终 `git diff --exit-code -- transcript/ml-sys/09-fp8-rollout-training.md` 通过。
- Step 2 readability：**0 机械问题**；`deep-check 09`：八步接线正确；`zh-check`：**all clear**。
- 英中全章 `mobile` 均在 360／390／430 px 报 **no layout breaks**。英中 Step 2 另以 `WAIT=5500` 等到末相检查，也都通过。
- 修正后的英文末相 DOM 审计逐一确认 counter 为 `02 / 08`、phase 为 `4 / 4`。图例左右边距在 360／390／430 px 分别为 **3.328／3.633／4.047 CSS px**，出界均为 **0**；图例实际字号均不低于 **12.912 CSS px**。`git diff --check` 通过。
- 截图：`.bot/out/ml25-after-desktop/step2.png` 和 `.bot/out/ml25-after-phone/step2.png`。当前模型不能读取图片，因此以上结论只来自构建、transcript、DOM 和几何检查，**未声称看过图片或视觉通过**。

## 剩余与清理

- 其余开放项 ML-16／23／26／27／29／31／32／35／37／38 未改。ML 10 继续冻结等待固定复审，ML 12 继续延期，第 14 章未开启。本轮不修改既有协调分数，也不把其他 findings 标成完成。
- 未跑全站回归、真实 FP8 训练、rollout、GPU benchmark 或 reduced-motion 动态切换。主人最终视觉验收仍待。
- 本地查看命令：`npx astro preview --host 127.0.0.1 --port 4492`。地址：`http://localhost:4492/learning-sglang/ml-sys/ch/09-fp8-rollout-training/?step=2`。本轮 4492 preview 已关闭，检查脚本启动的浏览器均已关闭。

---

# lane k1 本轮报告 · Omni 11／14 继续等待固定复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `eebdf29`，fetch 后仍一致。direction（03:12）要求 Omni 11 三项返工 `d222476`／`287f946`／`676b6d4` 与完成报告 `f68e067` 继续冻结，k1 等协调固定复审，不自行销项；Omni 14 后续提交另审。本轮没有授权的新教程单元。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，不自行关闭；Omni-37 保持开放。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 和固定 `968eb98` 的 **桌面字号 GO、完整 EVAL 191/192 NO-GO** 都只是既有协调基线，本轮分数不变。
- 定向核对 `f68e067..HEAD` 的 Omni 11／12 接缝文件和 `5c5f749..HEAD` 的 Omni 14 教程文件，diff 均为空；`git diff --check` 通过。最新回归测的是旧提交 `b1dbae6`，只有未列出布局步骤的 `(exit 1)`，不据此返工。
- 按 direction，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。未启动 dev server 或浏览器，没有新截图。
- 剩余事项是 Omni 11 的协调固定复审、Omni 14 的后续独立复审，以及主人最终视觉验收。

---

# lane d 本轮报告 · Voxt 10 第 4 步动画可见性与三处文本返工

日期：2026-11-27。类型：修旧。范围只含 Inside Voxt 第 10 章 `file-transcription`（`FileTranscription.svelte`、双语深入讲解、transcript）、本章评分卡、`memory/progress.md`、逐相审计脚本与结果和本报告；未改 Voxt 08／11、其他书、第 1 本受保护英文原文或 `.bot/memory/`。

## 单元与复审跟进

- direction（03:04）的 lane d 单元：继续 Voxt 10 `FileTranscription` 最小单元。本目录是干净 clone，上一轮未提交的工作不在其中；本轮按协调 review.md 对固定 `04ded697` 的四项开放 finding 重做：第 3 步看不见的 RAF、第 9 步英文公式与 stdout 分支矛盾、中文第 9／11 步缺公式／符号表／代入、第 11 步 ARIA 仍问「模型文件和应用更新」。
- **第 4 步动画可见性**：clock 的 `$effect` 从 `step === 2` 移到波形所在的 `step === 3`（第 4 步），删掉分支内恒假的 `step === 2` 守卫；逐相审计另发现 `(now - t0) / SLOW` 的旧错让播放头只扫半程就被 lap 重置，改为 `* SLOW`，5 s 扫完 0–8 s、rest 1.4 s 循环；进入 2.90–3.35 s 安静窗时窗口加框。手机波形补上安静窗小框与 quietNow 高亮（旧版手机没有可高亮的对象），手机 loops 标签从 y=18 移到 y=62（审计检出与标题重叠）。
- **第 9 步英文深入讲解**：公式改三分支（任一句失败无输出／全部成功且 `-o -` 或无 `-o` 写标准输出／全部成功且 `-o FILE` 一次 WriteFile），符号表补 `-o`（默认 `-`，`transcribe_cli.go:43`），代入表补 stdout 行；正文把 stdout 分支 `:94-97` 与 WriteFile `:98-101` 分开引，按 pinned `sglang-omni@3a31bd72e034db37ce5115a03dd4827b449683be` 核对。
- **中文第 9／11 步**：补齐与英文一致的公式、符号表和代入（第 9 步含 stdout 行；第 11 步 `provider = model(Transcribe)` 与 256,000 B 代入）。
- **第 11 步 ARIA**：收窄为「下一章问这些模型文件怎样到达这台 Mac」，与 caption、MDX、双语深入讲解一致。
- **本轮修复的 review finding**：固定 `04ded697` 复审的 4 项开放内容 finding（上述），全部列为待复审；评分卡按该 verdict 的 **110/110、217/220、44/44、261/264、机制 0/22** 重记，不自行记 GO，其余十步机制动画仍是硬门。

## 验证

- `npm run build`：60 页通过。`BOOK=voxt ONLY=10` 的 `transcript` 连续两次逐字一致，相对 pinned 只多第 4 步一行 `loops`；`readability` 0 机械问题；`deep-check 10` 通过；`zh-check` all clear；英中本章与中文第 4 步 360／390／430 px `mobile` 均无布局断裂。全部检查连本 clone 的 4488 服务。
- 逐相审计 `.bot/out/voxt10-step4-audit.mjs`（可重跑）：英中桌面 1440×900 与英中 390 px 共 4 组 × 40 次采样，核对 hydration、counter（`04 / 11`）、viewBox、lang；第 3 步无播放头、无 loops 标签；第 4 步播放头 40 次采样持续前进并扫过 6500 ms 以上，安静窗高亮只出现在窗口内；桌面可见 SVG 最小字号 ≥10 CSS px，文字重叠与 SVG 出界均为 0。12 张 PNG 与 `report.json` 在 `.bot/out/voxt10-step4-audit/`。
- 本模型无图像输入，未读 PNG；以上为构建、脚本、DOM 与几何证据，不声称视觉通过。未跑全站回归、真实 Voxt、音频文件或语音识别。
- 本 clone 的 `node_modules` 原是指向协调人 checkout 的符号链接；已只删本目录内符号链接并本地 `npm install`，package 文件无 diff，未写协调人 checkout。

## 剩余与本地查看

- 剩余：Voxt 10 等协调固定复审（第 4 步 R6 重评、第 9 步公式与中文结构核销、其余十步机制动画硬门）；随后按 direction 处理 Voxt 12。Voxt 11 Step 3／4 与性能公开事实增量继续冻结待审。
- 本地章节地址（查看前在本目录运行 `npx astro dev --background --port 4488`）：`http://localhost:4488/learning-sglang/voxt/ch/file-transcription/?step=4`（播放头与安静窗高亮）、`?step=9`（按 `D` 打开深入讲解看三分支公式）。本轮 4488 dev server 已关闭，未启动持久浏览器。

---

# lane k1 本轮报告 · Omni 11／14 按协调要求继续冻结

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `676304d`，fetch 后仍一致。direction（03:04）要求 Omni 11 三项返工 `d222476`／`287f946`／`676b6d4` 与报告 `f68e067` 继续冻结，等待协调固定复审；Omni 14 后续提交也独立待审。本轮没有授权的新教程单元。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，不自行销项；Omni-37 保持开放。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 和固定 `968eb98` 的 **桌面字号 GO、完整 EVAL 191/192 NO-GO** 都只是既有协调基线，本轮分数不变。
- 按 direction，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。未启动 dev server 或浏览器，没有新截图。
- 剩余事项是 Omni 11 的协调固定复审、Omni 14 的后续独立复审，以及主人最终视觉验收。

---

# lane k2 本轮报告 · ML Systems 10 持续冻结等待复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `a93dc0b`，fetch 后仍一致。direction（03:04）要求 ML 10 Steps 4–9 的 `dbe8268`／`8e27f28` 整章冻结，等待协调固定复审；本轮不重开教程，不重做 ML 03–09，不开 ML 12 或第 14 章。
- **本轮修复的 review finding 为 0。** ML-19／33 和 Steps 4–9 的重评仍由协调固定复审核销。固定 `5c7c12b` 的 **81/90、机制 18/18、213/216 NO-GO** 只是旧基线；当前树不自行记协调 GO。
- 定向核对 `8e27f28..origin/tutorials` 的 ML 10 组件、MDX、双语 deep、transcript 和最终审计，diff 为空。后续提交没有改这些冻结文件。`git diff --check` 通过。
- 最新回归只有未列出布局步骤的 `(exit 1)`，本轮没有可分配的教程返工项。按冻结要求，不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。
- 未启动 dev server 或浏览器，没有新截图。剩余事项只有 ML 10 的协调固定复审、原 #4／#5 与原十二项评分，以及主人最终视觉验收。既有审计索引为 `.bot/out/ml10-final-audit/report.json`。

---

# lane k1 本轮报告 · Omni 11／14 持续冻结等待复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `5f9229c`，fetch 后仍一致。direction（02:50）要求 Omni 11 三项返工 `d222476`／`287f946`／`676b6d4` 与完成报告 `f68e067` 继续冻结；Omni 14 后续 `6140cb9`／`5c5f749` 及证据整理也继续独立待审。本轮没有授权的新教程单元，不重做 Omni 13／15，不开第 16／17 章。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工仍由协调固定复审核销；Omni-37 保持开放，未擅自核销。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 和固定 `968eb98` 的 **桌面字号 GO、完整 EVAL 191/192 NO-GO** 都只是既有基线，不是当前树的新 verdict。
- 定向核对 `f68e067..origin/tutorials` 的 Omni 11／12 接缝文件，以及 `5c5f749..origin/tutorials` 的 Omni 14 教程文件，diff 均为空。后续提交没有改这些冻结文件。`git diff --check` 通过。
- 最新回归仍只有不能分配布局步骤的 `(exit 13)`，不据此返工。按 direction，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。
- 未启动 dev server 或浏览器，没有新截图。剩余事项是 Omni 11／14 的协调固定复审、开放 finding 的后续处理与主人最终视觉验收。

---

# lane k2 本轮报告 · ML Systems 10 继续冻结等待复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `cbcb6d3`，fetch 后仍一致。direction（02:50）要求 ML 10 Steps 4–9 的 `dbe8268`／`8e27f28` 整章冻结，等待协调固定复审；本轮不重开教程，不重做 ML 03–09，不开 ML 12 或第 14 章。
- **本轮修复的 review finding 为 0。** ML-19／33 和 Steps 4–9 的重评仍由协调固定复审核销。固定 `5c7c12b` 的 **81/90、机制 18/18、213/216 NO-GO** 只是旧基线；当前树不自行记协调 GO。
- 定向核对 `8e27f28..origin/tutorials` 的 ML 10 组件、MDX、双语 deep、transcript 和最终审计，diff 为空。后续提交只改 Omni 和共享报告，没有改这些冻结文件。`git diff --check` 通过。
- 最新回归仍只有不能分配布局步骤的 `(exit 13)`，按 direction 不据此返工。本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。
- 未启动 dev server 或浏览器。剩余事项只有 ML 10 的协调固定复审、原 #4／#5 与原十二项评分，以及主人最终视觉验收。既有审计索引为 `.bot/out/ml10-final-audit/report.json`。

---

# lane k2 本轮报告 · ML Systems 10 继续等待固定复审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `97617f9`，fetch 后仍一致。direction（02:35）要求 ML 10 Steps 4–9 的 `dbe8268`／`8e27f28` 整章冻结，等待协调固定复审；本轮不重开教程，不重做 ML 03–09，不开 ML 12 或第 14 章。
- **本轮修复的 review finding 为 0。** ML-19／33 和 Steps 4–9 的重评仍由协调固定复审核销。固定 `5c7c12b` 的 **81/90、机制 18/18、213/216 NO-GO** 只是旧基线；当前树不自行记协调 GO。
- 定向核对 `8e27f28..origin/tutorials` 的 ML 10 组件、MDX、双语 deep、transcript 和最终审计，diff 为空。后续提交只改共享报告，没有改这些冻结文件。`git diff --check` 通过。
- 最新回归仍只有不能分配布局步骤的 `(exit 13)`，按 direction 不据此返工。本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。
- 未启动 dev server 或浏览器。剩余事项只有 ML 10 的协调固定复审、原 #4／#5 与原十二项评分，以及主人最终视觉验收。

---

# lane k2 本轮报告 · ML Systems 10 持续冻结

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `b1dbae6`，fetch 后仍一致。direction（02:35）要求 ML 10 Steps 4–9 的 `dbe8268`／`8e27f28` 整章冻结，等待协调固定复审；本轮不重开教程，不开 ML 12 或第 14 章。
- **本轮修复的 review finding 为 0。** ML-19／33 和 Steps 4–9 的重评仍由协调固定复审核销。固定 `5c7c12b` 的 **81/90、机制 18/18、213/216 NO-GO** 只是旧基线；当前树不自行记协调 GO。
- 定向核对 `8e27f28..origin/tutorials` 的 ML 10 组件、MDX、双语 deep、transcript 和最终审计，diff 为空。最新 `b1dbae6` 只改共享报告，没有改这些冻结文件。`git diff --check` 通过。
- 按冻结要求，本轮不重复运行 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。未启动 dev server 或浏览器。剩余事项只有 ML 10 的协调固定复审、原 #4／#5 与原十二项评分，以及主人最终视觉验收。

---

# lane k1 本轮报告 · Omni 11 三项修复定点复核

日期：2026-11-27。类型：修旧复核。范围只有 Omni 11 的 Omni-22／33／45、Omni 12 Step 1 接缝、验证材料和本报告。未改教程源码、transcript、`.bot/memory/`、Omni 14、其他书或其他 lane 的文件。

## 固定范围与结论

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `b1dbae6`。三项教程修复 `d222476`／`287f946`／`676b6d4` 和完成报告 `f68e067` 都是当前 HEAD 的祖先；`f68e067..HEAD` 没有改这些冻结教程文件。
- **非视觉复核通过，实图与协调 verdict 仍待审。** 本轮没有自行关闭 finding，也没有把固定 `e71ab01` 的 **80/80、16/16、189/192 NO-GO** 当成当前树 verdict。Omni 14 另审，不与本结果混用。

| finding | 本轮直接复核 | 当前状态 |
|---|---|---|
| Omni-22 · Ch.10→11 entry 选择 | Ch.10 Step 8 问谁选十个 entries；Ch.11 Step 1 的标题和 caption 立即交出 Slow AR → `c0`、Fast AR → `c1–c9`，再形成 40 帧首窗。双语 deep 与 MDX 使用同一映射。 | 文本、机制和 DOM 复核通过，待协调核销。 |
| Omni-33 · Ch.11→12 状态接缝 | Ch.11 Step 8 收尾列出 queued old work、`D = delivered`、`H = heard`；Ch.12 Step 1 从同一旧回答开始，给出 `D = 2.0 s`、`H = 1.2 s` 和 `D−H = 800 ms`。 | 两章文本、deep 和手机检查通过，待协调核销。 |
| Omni-45 · Step 7 灰尾标签出徽标 | 英中桌面及 360／390／430 px 共 **24 个相位**的灰尾标签上下左右越界均为 **0**；英文 `old 512 used`、`512 released` 和中文 `用掉旧 512` 都包含在各自灰框内。 | 几何复核通过，实图待审。 |

## 作者评分与冷读

主线程按当前 transcript、组件、双语 deep 和逐相 DOM 冷读。下表只重评三个改动步；未改的 Steps 2–6 保留固定复审的满分。原十个非视觉项不含需要实图的 #4／#5。

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| Step 1 | 10/10 | 2/2 | 20/20 | Slow AR 每帧先选 c0，Fast AR 在同一帧补另外九个；攒够 40 帧就开首个窗口。 | 0 |
| Step 7 | 10/10 | 2/2 | 20/20 | 三个窗口会重读旧帧，但旧声音不重复播放；512 个采样点先留下，下次用掉，最后放出。 | 0 |
| Step 8 | 10/10 | 2/2 | 20/20 | 完成的请求补成一样长，一起解码再裁回；打断后服务器能删排队旧工作，D、H 分别记交付和播放。 | 0 |

当前树的作者参考值为 R1–R5 **80/80**、机制 R6 **16/16**、原十个非视觉项 **160/160**。原 #4／#5 和原十二项总分 **/192** 留待图像能力复审；这里不写 **192/192**，不授予协调 GO。独立 `pstack-explorer` 因配置模型 `qweneval/qwen-latest-series-invite-1102#high` 不存在而未启动，未计为证据。

## 硬门与逐相证据

- `npm run build`：**60 页**通过。Omni 11 八步与 Omni 12 Step 1 的 `readability` 均为 **0 机械问题**；两章 `deep-check` 各识别八步，`zh-check` 均为 `all clear`，`git diff --check` 通过。
- 所有计入结果的浏览器检查都显式连接本 clone 的 **4484** 服务。早期默认端口尝试和一次超时采集未计入。两章 transcript 各完成两次有效采集，均与 pinned 逐字一致。Omni 11 为 **2,229 词**，SHA-256 `982f3fe0da7184b704d1a5c279acaac825aea60a4cac9756b969d204284b72a4`；Omni 12 为 **2,298 词**，SHA-256 `fffa4eb49ad80b0ddd8ce9fa3ed661bf6d26780ca5c67de4e2e7ef045c2d503a`。
- Omni 11 英中全章及 Omni 12 Step 1 英中手机检查均在 360／390／430 px 报 `no layout breaks`。中文 Steps 1／7／8 的逐步字号门也通过。
- `.bot/out/omni11-review-en/report.json` 与 `.bot/out/omni11-review-zh/report.json`：每种语言 **40 个桌面相位、32/32 机制转变**，counter、step、phase 身份全部匹配。最低可见字号英文 **10.506**、中文 **11.253 CSS px**；文字重叠、SVG 出界和灰尾标签越界均为 **0**。
- `.bot/out/omni11-review-{en,zh}-{360,390,430}/report.json`：六种语言×宽度组合各 **3 个 Step 7 相位**，加上桌面共 **24 个相位**，灰尾标签四边越界全部为 **0**；手机最低 **10.76 CSS px**。
- `.bot/out/omni11-review-deep/report.json`：Omni 11 Steps 1／7／8 和 Omni 12 Step 1 的英中 **8 个 deep 视图**均为 `aria-expanded=true`，counter 和标题正确，指定接缝文字齐全；页面／drawer 横溢、KaTeX 错误和残留 `$$` 均为 **0**。
- 上述目录共保留 **106 张 PNG**，逐文件 SHA-256 去重后为 **106 个不同哈希**。代表图：`/Users/shuohuang/code/hmz-work/ls-k1-1127-024000/.bot/out/omni11-review-en/s7-p1.png`、`/Users/shuohuang/code/hmz-work/ls-k1-1127-024000/.bot/out/omni11-review-zh/s8-p3.png`、`/Users/shuohuang/code/hmz-work/ls-k1-1127-024000/.bot/out/omni11-review-deep/12-1-en.png`。

## 剩余与清理

- 当前模型读取实图返回 `Cannot read image (this model does not support image input)`。这里只报告 transcript、源码、DOM、几何、文件和哈希结果，**未声称看过图片或视觉通过**。剩余是图像能力固定复审、协调 verdict 和主人最终验收。
- 未跑全站回归、真实 Fish／SGLang-Omni 模型或服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。最新回归只有不可分配布局步骤的 `(exit 13)`，不据此返工。
- 本 clone 的 `node_modules` 原指向协调人 checkout。已只删除本目录内的符号链接并用本目录缓存执行 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --port 4484`。地址：`http://localhost:4484/learning-sglang/omni/ch/11-fish-s2-pro/?step=1`、`?step=7`、`?step=8`；接缝另一端为 `http://localhost:4484/learning-sglang/omni/ch/12-full-duplex-strategies/?step=1`。本轮服务和浏览器在收尾关闭。

---

# lane k2 本轮报告 · ML Systems 10 冻结复核

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `2cf81c3`，fetch 后仍一致。direction（02:12）指定的 ML 10 Steps 4–9 收尾已由 `dbe8268`、完成报告 `8e27f28` 和证据更正 `2cf81c3` 落地；本轮不重开教程，不开 ML 12 或第 14 章。
- **本轮修复的 review finding 为 0。** ML-19／33 的作者修复和 Steps 4–9 的重评仍由协调固定复审核销。固定 `5c7c12b` 的 **81/90、机制 18/18、213/216 NO-GO** 只是旧基线；当前树不自行记协调 GO。
- 定向核对 `8e27f28..HEAD` 的 ML 10 组件、MDX、双语 deep、transcript 和最终审计，diff 为空。后续提交只改共享报告，没有改这些冻结文件。
- 本轮用 Node 断言已提交的 `.bot/out/ml10-final-audit/report.json`：**78 个状态、60/60 个机制转变、9/9 个机制步、12 个 deep 状态、78 个不同 PNG 哈希**，重叠／SVG 出界为 **0/0**，最低 **10.843 CSS px**；文件 SHA-256 与报告记录的 `d0738783…11051e` 一致。这些是对既有结果的完整性和计数复核，不是本轮重跑硬门或实图采集。
- transcript 实测 **2,283 词**，SHA-256 为 `66efd73055241b926904ad8c47089f7774741010e3b81e9c857dbda9b9b4d24e`，与 `8e27f28` 的记录一致。`git diff --check` 通过。当前 clone 没有 ML 10 审计 PNG，本轮不声称看过图片或视觉通过。
- 未启动 dev server 或浏览器，未运行 `npm`／`npx`。`node_modules` 仍是指向协调人 checkout 的符号链接，本轮未通过它执行命令，也未改动它。剩余事项只有 ML 10 的协调固定复审、原 #4／#5 与原十二项评分，以及主人最终视觉验收。

---

# lane k1 本轮报告 · Omni 11／14 继续冻结

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `2cf81c3`。direction（02:12）没有授权新的教程单元：Omni 11 的 `d222476`／`287f946`／`676b6d4` 和报告 `f68e067`，以及 Omni 14 的 `5c5f749` 与既有材料，都继续冻结待审。本轮不重做 Omni 13／15，不开第 16／17 章。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，仍由协调固定复审核销。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 只是旧基线，不是当前树的新 verdict；Omni 14 也不沿用旧分数记 GO。
- `git fetch origin tutorials` 后 HEAD 与远端仍一致；`f68e067` 和 `5c5f749` 均为当前 HEAD 的祖先。定向运行 `git diff --name-only f68e067..HEAD -- <Omni 11／12 冻结文件>` 和 `git diff --name-only 5c5f749..HEAD -- <Omni 14 冻结文件>`，结果都为空。后续提交没有改这些教程、transcript 或审计文件。
- `git diff --check` 通过。按 direction 的冻结要求，本轮不重复运行 `f68e067` 已记录的 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包；既有结果不冒充本轮重跑。
- 未启动 dev server 或浏览器，没有新截图。剩余事项只有 Omni 11／14 的协调固定复审与主人最终验收。

---

# lane k2 本轮报告 · ML Systems 10 继续冻结

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `4e02d05`。direction（02:12）指定的 ML 10 Steps 4–9 收尾已由 `dbe8268` 和完成报告 `8e27f28` 落地；本轮不重复改写教程，不开 ML 12 或第 14 章。
- **本轮修复的 review finding 为 0。** ML-19／33 的作者修复和 Steps 4–9 的重评仍由协调固定复审核销。固定 `5c7c12b` 的 **81/90、机制 18/18、213/216 NO-GO** 只是旧基线；当前树不自行记协调 GO。
- 定向运行 `git diff --name-only 8e27f28..origin/tutorials -- <ML 10 组件、MDX、双语 deep、transcript 和最终审计>`，结果为空。后续提交只改 Omni 和共享报告，没有改这些冻结文件。
- 既有 `8e27f28` 已记录 60 页 build、目标硬门和逐相审计；其提交内报告仍为 **78 个状态、60/60 个机制转变、9/9 个机制步、78 个不同 PNG 哈希**，重叠／SVG 出界为 **0/0**，最低 **10.843 CSS px**。本轮只核对这些已提交结果，没有冒充重跑。
- `git diff --check` 通过。按 direction 的冻结要求，本轮不重复运行 `8e27f28` 已记录的 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包。
- 未启动 dev server 或浏览器。本 clone 没有任何 ML 10 审计 PNG；本轮回复改引已提交的 `.bot/out/ml10-final-audit/report.json` 和 `.bot/out/ml10-final-audit.mjs`，不再引用旧 clone 的截图路径。当前 `node_modules` 仍是指向协调人 checkout 的符号链接，因此撤回本地 URL 和启动命令，不在本 clone 运行 `npx` 或 `npm`。剩余事项只有 ML 10 的协调固定复审、原 #4／#5 与原十二项评分，以及主人最终视觉验收。

---

# lane k1 本轮报告 · Omni 11／14 继续冻结

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `8e27f28`。direction（02:12）没有授权新的教程单元：Omni 11 的 `d222476`／`287f946`／`676b6d4` 和报告 `f68e067`，以及 Omni 14 的 `5c5f749` 与既有材料，都继续冻结待审。本轮不重做 Omni 13／15，不开第 16／17 章。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，仍由协调固定复审核销。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 只是旧基线，不是当前树的新 verdict；Omni 14 也不沿用旧满分记 GO。
- 定向运行 `git diff --name-only f68e067..HEAD -- <Omni 11／12 接缝与 Omni 14 教程文件>`，结果为空。后续提交只改 ML Systems、Voxt 和共享报告，没有改这些冻结文件。
- `git diff --check` 通过。按 direction，本轮不重复运行 `f68e067` 已记录的 EVAL 硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包；既有结果不冒充本轮重跑。
- 未启动 dev server 或浏览器，没有新截图。剩余事项只有 Omni 11／14 的协调固定复审与主人最终验收。

---

# lane k2 本轮报告 · ML Systems 10 Steps 4–9 收尾

日期：2026-11-27。类型：修旧收尾。范围只有 ML Systems 第 10 章 Steps 4–9 的作者复审、三处双语 deep 对齐、验证材料和本报告。未改 ML 03–09、ML 12、其他书、第 1 本受保护英文原文或 `.bot/memory/`。按 direction，本章随后冻结，等待协调固定复审。

## 提交与 review 修复

- Steps 4–9 的既有教程提交为 `8eea186`、`7f3ac2a`、`59b4469`、`7858d67`、`9f277e9`、`372903e`、`4a6f275`、`297e168`，分别处理 STE 白话、真实量化信息密度、打包中文、Marlin 映射、W4A16 与 FP32 分工、checkpoint index 与导航、手机换行和 deep 卡名。
- 本轮主线程复读发现三处 deep 与舞台不完全对齐：英文 Step 4 把图上没有写的“改多少”归给 subtitle，Step 6 在 `On the stage` 解释未画出的 INT32，Step 7 在同一节写下未画出的 `is_marlin_converted` 相位。`dbe8268 [k2] Align ML 10 deep notes with visible stage` 已修正并推送到 `origin/tutorials`。首次推送被拒后执行 `git pull --rebase origin tutorials`，再推成功；未 force-push。
- **ML-19 的作者修复完成，待协调核销。** Step 9 以训练 fake BF16 与 rollout real INT4 Marlin 两条可见路径自包含收尾，不再向未发布的第 11 章提问。浏览器实测 Step 1 的上一章为 09，Step 9 的下一章为最近的 ready 章 12；deep 只把第 13 章标为后续扩展。
- **ML-33 的作者修复完成，待协调核销。** 舞台与双语 deep 都使用组合卡 `LOAD + REORDER`／`装入 + 重排`，不再拆成两张卡。
- 固定 `5c7c12b` 的协调结果仍是历史基线：R1–R5 **81/90**、机制 R6 **18/18**、原十二项 **213/216**，NO-GO。当前树不继承这个 verdict，也不自行把 ML-19、ML-33 或整章记为协调 GO。

## 当前树的作者评分卡

主线程按 transcript、组件、双语 deep 和逐相 DOM 冷读。下表只覆盖本轮指定的 Steps 4–9；Steps 1–3 没有内容改动，保留协调已给的满分。原 #4／#5 需要实图判断，本轮模型无图像输入，因此不自行给原十二项总分。

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 4 | 10/10 | 2/2 | 20/20 | 梯度告诉权重往哪改；STE 把它原样绕过舍入传给 BF16 权重，前向误差仍在。 | 0 |
| 5 | 10/10 | 2/2 | 20/20 | 每轮更新都把 BF16 权重重新变成整数编码和 BF16 scale，交给 rollout 保存。 | 0 |
| 6 | 10/10 | 2/2 | 20/20 | 编码加 8 变成非负字段，八个 4 位字段装满 32 位；32 个权重加 scale 共 18 字节。 | 0 |
| 7 | 10/10 | 2/2 | 20/20 | 先停生成，再装新权重，把 64 个 scale 按 `s0,s8,…` 的 Marlin 顺序排好，最后继续生成。 | 0 |
| 8 | 10/10 | 2/2 | 20/20 | 字段减 8 取回编码，乘 scale 变 BF16 做乘法；这条指令内部另用 FP32 累加。 | 0 |
| 9 | 10/10 | 2/2 | 20/20 | 索引里的 594.206 GB 张量一张卡装不下，八张卡总容量够，但其他运行数据还要显存。 | 0 |

- Steps 4–9 作者合计：R1–R5 **60/60**、机制 R6 **12/12**、原十个非视觉项 **120/120**、新内容洞 **0**。
- 加上未改的 Steps 1–3，当前作者参考值为 R1–R5 **90/90**、机制 R6 **18/18**、原十个非视觉项 **180/180**。原 #4／#5 和原十二项 **/216** 留待协调实图复审；这里没有把旧 **213/216** 改成 **216/216**。
- 独立 `pstack-explorer` 因配置模型 `qweneval/qwen-latest-series-invite-1102#high` 不存在而未启动，未计为证据。上述冷读由主线程完成。

## 硬门与实图证据

- 最终 rebase 后的 `npm run build`：**60 页**通过。`BOOK=ml-sys node scripts/deep-check.mjs 10` 识别九步，`zh-check` 为 **all clear**，`git diff --check` 通过。
- `BOOK=ml-sys ONLY=10` transcript 连续两次生成逐字一致，并与 pinned 文件无 diff：**2,283 词**，SHA-256 `66efd73055241b926904ad8c47089f7774741010e3b81e9c857dbda9b9b4d24e`。九步 `readability` 为 **0 机械问题**。
- 英中全章 `mobile` 均在 360／390／430 px 报 **no layout breaks**。中文 Steps 4／5／6／7／8／9 分别运行 selected-step 字号门，全部通过。
- 可重跑脚本 `.bot/out/ml10-final-audit.mjs` 对每种语言采集 **39 个桌面相位**，共 **78 个状态、60/60 个机制转变、9/9 个机制步**。采集逐一核对 counter、`data-animation-step`、`data-animation-final-phase` 和当前 phase；每相记录可见文字、出现与消失对象、截图字节数和哈希。
- `.bot/out/ml10-final-audit/report.json`：**78/78 个 PNG 哈希不同**，文字重叠 **0**，SVG 出界 **0**，最低可见字号 **10.843 CSS px**（`en-s9-p2` 的 tensor-byte 脚注）。报告 SHA-256 为 `d0738783d514e4403c6f848eebcf99c037dd86c7b5276af11d1c04d4da11051e`。
- Steps 4–9 的英中 **12 个 deep 视图**均为 `aria-expanded=true`，counter 正确；KaTeX 错误、残留 `$$` 和抽屉横向溢出均为 **0**。审计同时断言 Step 7 的具体排列、Step 8 的 FP32 边界、Step 9 的 index／metadata 与第 13 章后续接缝都在对应 deep 中。
- 旧报告记录的三个 PNG 路径属于旧 clone，不能作为当前 clone 的截图路径。当前 clone 没有这些 PNG；可核材料只有已提交的 `.bot/out/ml10-final-audit/report.json` 和 `.bot/out/ml10-final-audit.mjs`。Read 工具返回 **Cannot read image (this model does not support image input)**，所以这里只报告 DOM、几何和哈希证据，未声称看过图片或视觉通过。

## 剩余与证据边界

- 当前状态：**作者检查收尾完成，整章冻结，coordinator-rereview-pending**。剩余事项是协调固定复审、原 #4／#5 与原十二项评分，以及主人最终视觉验收。ML 12 留作复审后的独立单元，不开第 14 章。
- 未跑全站回归、真实 INT4 训练、Marlin GPU、rollout 显存测量、故障注入或 reduced-motion 动态切换。最新回归只有不可分配布局步骤的 `(exit 13)`，按 direction 不据此返工。
- 旧 clone 曾在移除符号链接后执行本地 `npm install`。当前 clone 的 `node_modules` 又是指向协调人 checkout 的符号链接；本轮没有通过这个链接运行构建、检查、dev server 或安装命令。
- 撤回当前 clone 的本地章节 URL 和 `npx astro dev` 启动命令。只有先移除当前目录内的 `node_modules` 符号链接并在本目录完成本地安装，才能提供本地查看地址。

---

# lane k1 本轮报告 · Omni 11／14 冻结待审

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

## 当前单元与结论边界

- direction 给 lane k1 的两个单元都已完成并冻结：Omni 11 的 `d222476`／`287f946`／`676b6d4` 与报告 `f68e067`，以及 Omni 14 的 `5c5f749` 与既有复审材料。本轮没有授权的新教程单元，不开第 16／17 章，也不重做 Omni 13／15。
- 当前 HEAD 为 `b3fef8e`。`f68e067..HEAD` 只有 lane d 的 Voxt deep 与共享报告改动，Omni 11／14 没有后续源码变化。
- **本轮修复的 review finding 为 0。** Omni-22／33／45 的作者返工已在当前树中，仍由协调固定复审核销。固定 `e71ab01` 的 **80/80、机制 16/16、189/192 NO-GO** 只保留为旧基线，不作为当前树的新 verdict。
- Omni 14 保持既有八步机制 R6 **16/16** 和呈现待审边界。本轮不沿用 **80/80、16/16、189/192** 给新树记 GO。

## 直接核对与未做事项

- 当前 Omni 11 transcript 的 Step 1 直接写出 Slow AR → `c0`、Fast AR → `c1–c9`；Step 8 交出 queued old work、`D = delivered`、`H = heard`。Omni 12 Step 1 从同一旧回答开始，保留 `D = 2.0 s`、`H = 1.2 s` 和 `D−H = 800 ms`。
- 当前 `FishS2Pro.svelte` 的 Step 7 灰框为桌面 `x/w = 594/92`、手机 `176/96`，对应 `676b6d4` 的包含修复。本轮没有改这些对象。
- `git diff --check` 通过。按 direction 的冻结要求，本轮不重复运行 `f68e067` 已提交的硬门、双语 deep、逐相审计或实图采集，也不追加无新教程改动的证据包；已有结果不冒充本轮重跑。
- 未启动 dev server 或浏览器，因此本轮没有新截图和本地服务地址。剩余事项只有 Omni 11／14 的协调固定复审与主人最终验收。

---

# lane d 本轮报告 · Voxt 性能公开事实增量

日期：2026-11-27。类型：修旧（deep 出处增量）。范围只含 5 个 Voxt deep 文件（双语各一）、`.bot/out/voxt-perf-public-deeps.mjs` 与结果和本报告；未改任何组件、舞台、caption、MDX、transcript、评分卡、`memory/progress.md`、`.bot/memory/`、其他书或第 1 本受保护英文原文。

## 复审跟进（同一单元内）

- **#2549 测量条件补齐**：识别路线 Step 6 双语条目现在写明两行是不同的对照——Final 是 A0/C/C/A0 interleaved 的 median，first preview 是 live C 第 1 轮对 A0 第 14–16 轮（依据 `public.md:70`），不再让读者以为 first-preview 退化与 Final 是同一比较。
- **打开抽屉的截图证据**：`.bot/out/voxt-perf-public-deeps.mjs`（可重跑）对 6 个改动小节 × 英中 = **12 张**桌面 1440×900 图，采集前核对 counter、html lang、`aria-expanded=true`，把 PR 链接 `scrollIntoView` 到抽屉视口内并断言可见；页面与抽屉横向溢出均为 0。结果 `.bot/out/voxt-perf-public-deeps/report.json`：failures 为空，12 张 PNG 哈希互不相同。代表图：`/Users/shuohuang/code/hmz-work/ls-d-1127-015553/.bot/out/voxt-perf-public-deeps/speech-recognition-routes-s6-en.png`。本模型无图像输入，以上为 DOM 与几何证据，未声称看过图片或视觉通过。
- **素材引用更正**：本报告素材出处改为只引 `/Users/shuohuang/.orca/bots/bot/research_notes/Voxt 性能优化全景/public.md`；该文件不复制进仓库、不提交，不再引用仓库内不存在的副本路径。
- 跟进后重跑：`npm run build` **60 页**通过；`BOOK=voxt node scripts/deep-check.mjs` 03／04／06／08／11 均 `ok`；`BOOK=voxt ONLY=4 zh-check` **all clear**。

## 单元与边界

- direction 的 lane d 单元：Step 4 已由上一轮提交 `2d1e868`／`3aa0d2d` 完成并推 `origin/tutorials`（协调 review.md 01:56 已记录 origin 到 `3aa0d2d`），本轮做下一个独立最小单元：**Voxt 性能公开事实增量**。
- 素材只取自 `/Users/shuohuang/.orca/bots/bot/research_notes/Voxt 性能优化全景/public.md` 第二节的可引用数字表与第一／五节的公开 PR 事实（该文件不复制进仓库、不提交）。每条保留 PR 链接、测量 head（或「未记录／未绑定」的明说）、setup 和指标边界。
- 未补群名、人名、主人机器名或 NAACL 内容；setup 只含公开 PR 的硬件行（Apple M5／M4 等）。CI、UI 帧率、模型延迟、Stop-to-text／insert／paste 各归各条，未混写；没有新增真实 App 验收宣称，每条都带「不是完整真实 App／只证明提前调度」类边界；未创建 `perf-public-done`。
- 新增内容全部在各步既有 `### Sources`／`### 源码出处` 内，或在该步末尾新增同名小节；不改舞台， transcript 不含 deep，故 pinned transcript 不重生成。评分卡不动：Voxt 11 固定 `fa8d912` 基线 **54/60、机制 9/12、143/144 NO-GO** 与 Voxt 08 的 GO 均不变，本轮不自行关闭任何协调 finding。

## 各章补充（英中对称，共 6 处）

| 章 · 步 | 公开事实 | 边界写法 |
|---|---|---|
| 04 识别路线 · Step 6（本机 Omni Final） | #2549（#2576 落地 main）：Final short p50/p95 194/279→111/145 ms，吞吐 21.0→49.8 audio-s/s，first-preview p95 1207→2518 ms 退化；#3285 DFlash decode 1.7B 8bit 57→189、0.6B 4bit 244→402 tok/s | 主表测量 head 未记录／benchmark 表未绑定精确 SHA；真实 native 服务或 CLI/server protocol，非完整真实 App |
| 11 模型与更新 · Step 4（语音服务器） | #4407 预热 Silero Metal kernel：server ready 0.099→0.882 s、暖请求 1.928→1.203 s、冷合计 2.027→2.085 s（首个变快、合计未变快）；#2261 修 Unload ASR 孤儿进程（merged，head `4091cb549196`） | #4407 未给各组独立测量 commit；#2261 只记落地事实 |
| 06 文字加工 · Step 5（长听写分片） | #4295（经 #4324 集成）：停止前清理 19 次、停止后 1 次，结果栏 Clean-up 4.0 s | 脚本假 LLM 每答 3 s；评论对真实 App 测量 head 说法不一；只证明提前调度，非 remote provider 收益 |
| 08 小词典 · Step 3（词条作提示） | #4589 Final 复用：无词典 535→290、30 词条 643→304、463 词条 2769→382 ms | 测量 head 未单列且混合两轮；10 段独立样本不能合并 |
| 08 小词典 · Step 4（别名替换） | #3795 建 alias 索引，大词典听写不再等别名替换 | CLOSED、经 #3826 落地；无公开计时数字 |
| 03 麦克风到帧 · Step 6（VAD 起点） | #2833 修 native VAD session 泄漏：修复前第 65 次激活失败，修复后 70/70 通过 | 验证 head `fd29e6607a6b`；功能回归检查，非推理 benchmark，不直接给 Stop-to-insert 收益 |

## 验证

- `npm run build`：**60 页**通过。`BOOK=voxt node scripts/deep-check.mjs` 对 03／04／06／08／11 均 `ok`（小节数与步数一致）；`BOOK=voxt ONLY=3,4,6,8,11 zh-check`：**all clear**。
- 双语渲染核对：4475 端口的 dev server 上，5 章页面 SSR 各含新增的英文条目（`PR #2549`／`#4407`／`#4295`／`#4589`／`#2833` 各 1 处）与中文条目（`公开性能证据`、`无风扇 M4`、`脚本假 LLM`、`70 次全部通过` 各 1 处）。
- 本 clone 的 `node_modules` 原是指向协调人 checkout 的符号链接，build 要写 `.vite` 会越界；已只删本目录内符号链接并本地 `npm install`，未写协调人 checkout，package 文件无 diff。
- 未跑全站回归、真实 Voxt、模型、语音服务或主人最终验收；未看图（本模型无图像输入），以上为构建、脚本与 DOM 证据。

## 剩余与本地查看

- 剩余：Voxt 11 Step 3／4 等协调固定复审；下一单元按 direction 回 **Voxt 10→12**。本增量不排期 GO，等协调核对。
- 本地章节地址（查看前在本目录运行 `npx astro dev --background --port 4475`）：`http://localhost:4475/learning-sglang/voxt/ch/speech-recognition-routes/?step=6`（按 `D` 打开深入讲解看 Sources 末尾）。本轮 4475 dev server 已关闭，未启动持久浏览器。

---

# lane d 本轮报告 · Voxt 11 Step 4 逐相机制

日期：2026-11-27。类型：修旧。范围只含 Inside Voxt 第 11 章第 4 步（`ModelStorageUpdates.svelte` 的 step index 3）、本章评分卡、`memory/progress.md`、验证脚本与结果和本报告；未改 Step 1／2／3／5／6、Voxt 08／10、其他书、第 1 本受保护英文原文或 `.bot/memory/`。

## 单元与修复

- direction 的 lane d 单元：**只做 Voxt 11 Step 4 的逐相机制**。本轮开始时工作树留有上一轮未提交的 Step 4 半成品（组件与 transcript 修改、审计脚本和一份报告），按 SOUL 接着做完。教程提交 `60282d3 [d] Split Voxt 11 step 4 into four per-phase states` 先在本机落地，`git pull --rebase origin tutorials` 后为 `2d1e868`，已推 `origin/tutorials`，未 force-push。
- 处理的 open review 项：`c3a7773` 复审的第 4 步机制 1/2（「首相红框在磁盘而服务器状态已变，末相把 `stop request sent` 与 `process exits → memory freed` 合在同一相」），固定 `fa8d912` 维持为逐步 **2、2、1、1、1、2** 中的第 4 步 1/2。
- 修复：`PHASE_COUNTS[3]` 3→4，四相各形成一个可辨认状态：服务器卡出现 `starting… → ready`（配 `files stay on disk`）→ `ready · idle 10/10 min`（配 `next use → restart`）→ `stop request sent`（配 `the process still runs`）→ `process exits → memory freed`（配 `files stay on disk`）。请求发出和进程退出拆成两相：请求时进程还在，退出才释放内存。首相红框随变化对象从磁盘卡移到服务器卡，后三相都包住两行状态文字（桌面框 y 184–234、手机框 y 382–432）。手机本步 LoopProgress 由 `H−44` 上移到 `H−60`，避开 H−28 脚注。
- 保留既有 2 GB 空位语义、空闲 10 分钟、设置的 5/15/30/60 分钟边界、磁盘字节（2.47 GB、快照文件夹留着）、双语 ARIA 和 caption，不扩新内容；transcript 重生成只差 `files stay on disk` 一行。Step 5 留给后续轮。
- **本轮没有自行关闭协调 finding，机制分不自行提。** 评分卡保持协调固定 `fa8d912` 基线：R1–R5 **54/60**、原十个非视觉项 **119/120**、静态 R6 **12/12**、原 #4/#5 **24/24**、原十二项 **143/144**、机制 R6 **9/12**（逐步 2、2、1、1、1、2）；Step 3／4 均保持待审，整章 **NO-GO / coordinator-rereview-pending**。

## 验证

- `npm run build`：**60 页**通过。`BOOK=voxt ONLY=11` transcript（6 步无告警，连续两次生成逐字一致，**1502 词**，SHA-256 `b8e0a68bf731d07bdb93bf73545ea6cf24fe72b283d94feca7046d6338463444`）、`STEP=4` readability（0 机械问题）、`deep-check 11`、`zh-check`（all clear）均通过。
- 英中全章与中文 Step 4 的 360／390／430 px `mobile` 均 no layout breaks（脚本只认位置参数，全部指向本 clone 的 4473 服务），中文 Step 4 字号门通过。
- 逐相审计 `.bot/out/voxt11-step4-audit.mjs`（可重跑）：英中桌面 1440×900 ＋ 英中 360／390／430 px 共 **8 组 × 4 相 = 32 个视图**，采集前核对 hydration（相位实际循环）、counter `04 / 06`、`data-animation-step/phase`、响应式 viewBoxWidth（桌面 720／手机 300）和 600 ms settling，按组件 bbox 完整截取。断言：四相状态行互不相同；相位 2 只含停止请求、不含进程退出；相位 3 只含进程退出、不含请求行；每相保留「服务器退出后还留着」与 `2.47 GB`；相邻相位（含 3→0 回绕）变化的文字必须完整落在当相红框内。结果 `.bot/out/voxt11-step4-audit/report.json`：文字重叠、SVG 出界、红框描边压字均为 **0**，最低可见字体 **10.76 CSS px**（zh-360 的「循环」），failures 为空。32 张 PNG 在同目录（PNG 被 gitignore，不提交）。
- **冻结帧修复。** 首轮采集发现 6 组视图各有 2 张相邻相位 PNG 逐字节相同（同期 DOM 状态互异，为后台 compositor 冻结，同 k2 在 ML 08 遇到的问题）。已按同一修法每组视图改用独立浏览器，并在写入前断言 PNG 不得与早先相位重复；重跑后 **32/32 张 PNG 全部不同**。旧报告作废，现报告为重跑结果。
- 当前模型不能读取 PNG（工具明确返回 Cannot read image），未声称已看图或视觉通过；以上为 DOM 与几何证据，协调实图复审与主人最终视觉验收仍待。

## 剩余与本地查看

- 剩余：Step 3／4 等协调固定复审重评机制分；之后按 direction 顺序做 Step 5（1/2 的同类返工），再 Voxt 10、12。Voxt 08 `bb70918` 的 GO 不回退，不碰 Omni 或 ML Systems。
- 未跑全站回归、真实 Voxt、模型下载、模型进程、应用更新、reduced-motion 动态切换或主人最终产品验收；事实按 pinned `sglang-omni origin/main@c2fc0f1` 核对。
- 本地章节地址：`http://localhost:4473/learning-sglang/voxt/ch/models-and-app-updates/?step=4`（查看前在本目录运行 `npx astro dev --background --port 4473`）。代表截图绝对路径：`/Users/shuohuang/code/hmz-work/ls-d-1127-012256/.bot/out/voxt11-step4-audit/en-desktop/p2.png`。
- 本轮 4473 dev server（沿用上一轮在本 clone 启动的进程）和脚本启动的浏览器均在收尾关闭。

---

# lane k1 本轮报告 · Omni 11 的 Omni-22／33／45

日期：2026-11-27。类型：修旧。范围只有 Omni 11 Steps 1／7／8、Omni-33 要求的 Omni 12 Step 1 接缝、对应双语 deep／MDX／transcript、验证材料及本报告。未改 Omni 13／14／15、其他书、其他 lane、第 1 本受保护英文原文或 `.bot/memory/`。

本轮开始 HEAD 为 `372903e`。教程提交依次为 `d222476`（Step 1）、`287f946`（Step 8 与 Ch.12 Step 1）、`676b6d4`（Step 7）。最后一次推送被拒后执行 `git pull --rebase origin tutorials`，纳入 k2 的 `4a6f275` 再推成功；未 force-push。

## review 修复与结论边界

| finding | 教程改动 | 本轮证据 |
|---|---|---|
| Omni-22 · Ch.10→11 entry 选择 | Step 1 的标题、caption、deep 和出处先回答 Ch.10 Step 8：Slow AR 逐帧选 `c0`，Fast AR 在帧内补 `c1–c9`；40 帧首窗机制保持不变。 | `d222476`；Step 1 英中 readability、三宽度手机和双语 deep 通过。 |
| Omni-33 · Ch.11→12 状态接缝 | Step 8 收尾直接列出 queued old work、`D = delivered`、`H = heard`；Ch.12 Step 1 以同一旧回答开头，给出 `D = 2.0 s`、`H = 1.2 s` 和 `D−H = 800 ms`。 | `287f946`；两步英中 readability、三宽度手机、两章 deep／zh-check 通过。 |
| Omni-45 · Step 7 灰尾标签出徽标 | 桌面灰框 `x/w = 600/70 → 594/92`，手机 `180/88 → 176/96`；文字、相位和机制不变。 | `676b6d4`；英文改前最大左右越界 **8.009／8.009 CSS px**，改后英中桌面及三宽度手机全部为 **0**。 |

**三项均为作者返工完成，仍待协调固定复审核销。** 新树不继承固定 `e71ab01` 的 **80/80、16/16、189/192**，也不提前写成 192/192；当前统一记为 **coordinator-rereview-pending**。Omni 14 `5c5f749`、证据整理 `b707104` 和其他 lane 的待审内容保持冻结。

## 本轮评分与冷读

下表是本轮对改动步的作者重评，不是协调新总分。原 #4／#5 和原十二项整步总分留待实图复审；未改步不重新给分。

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| Omni 11 Step 1 | 10/10 | 2/2 | 20/20 | Slow AR 每帧先选 c0，Fast AR 在同一帧补另外九个；攒够 40 帧就开首个窗口。 | 0 |
| Omni 11 Step 7 | 10/10 | 2/2 | 20/20 | 三个窗口会重读旧帧，但旧声音不重复播放；512 个采样点先留下，下次用掉，最后放出。 | 0 |
| Omni 11 Step 8 | 10/10 | 2/2 | 20/20 | 完成的请求补成一样长，一起解码再裁回；下一步看旧回答哪些工作能删，D、H 分别记交付和播放。 | 0 |

- Ch.10 的「谁选十个 entries」、Ch.11 收尾的「哪些旧工作能删、D／H 是什么」和 Step 7 的「标签是否在自己的灰框里」都能由当前舞台、caption 或 deep 直接回答。Omni 12 Step 1 只做这条接缝的重读，不给该章新总分。
- 主线程完成 transcript、组件、双语 deep 和 DOM 冷读。独立 `pstack-explorer` 因配置模型 `qweneval/qwen-latest-series-invite-1102#high` 不存在而未启动，未计为证据。

## 硬门与逐相证据

- `npm run build`：**60 页**通过。Omni 11 全八步 `readability` 为 **0 机械问题**；`deep-check 11／12` 均识别八步；两章 `zh-check` 均为 `all clear`；`git diff --check` 通过。
- Omni 11 英中全章 360／390／430 px `mobile` 均 `no layout breaks`。中文 Steps 1／7／8 的字号门分别通过；Omni 12 Step 1 的英中三宽度检查也通过。
- 两章 transcript 各连续采集两次，均与 pinned 逐字一致。Omni 11 为 **2,229 词**，SHA-256 `982f3fe0da7184b704d1a5c279acaac825aea60a4cac9756b969d204284b72a4`；Omni 12 为 **2,298 词**，SHA-256 `fffa4eb49ad80b0ddd8ce9fa3ed661bf6d26780ca5c67de4e2e7ef045c2d503a`。
- `.bot/out/omni11-final-en/report.json` 与 `omni11-final-zh/report.json`：每种语言 **40 个桌面相位、32/32 机制转变**，counter／step／phase 身份全部匹配；文字重叠、SVG 出界和灰尾标签越界均为 **0**。最低可见字号英文 **10.506**、中文 **11.253 CSS px**，保持固定基线。
- Step 7 定向审计 `.bot/out/omni11-tail-after-{en,zh}/report.json` 和 `omni11-tail-after-{en,zh}-{360,390,430}/report.json`：英中桌面及三宽度手机共 **24 个相位**，灰尾标签上下左右越界全部为 **0**；手机最低 **10.76 CSS px**。英文改前报告为 `.bot/out/omni11-tail-before/report.json`，复现 `old 512 used` 约 **7.720**、`512 released` 约 **8.009 CSS px** 的左右越界。
- `.bot/out/omni11-final-deep/report.json`：Omni 11 Steps 1／7／8 和 Omni 12 Step 1 的英中 **8 个 deep 视图**均为 `aria-expanded=true`，counter 和标题正确，指定接缝文字齐全；页面／drawer 横溢、KaTeX 错误和残留 `$$` 均为 **0**。
- 最终报告 SHA-256：英文逐相 `cfc82446a111819ca70355e040c489cd0db79575007b5323bdcda67c79fd2ba2`，中文逐相 `079e82fc5ed653a290e68d8bf83626dafbe2eba12a9c9d75e617f4a3c2936792`，deep `2b657b4d708487dfadffdfa65a41cf986e9d739575e895539d6921ce03a5023c`。

## 实图、剩余和清理

- 代表实图：`/Users/shuohuang/code/hmz-work/ls-k1-1127-013124/.bot/out/omni11-final-en/s7-p1.png`、`/Users/shuohuang/code/hmz-work/ls-k1-1127-013124/.bot/out/omni11-final-zh/s8-p3.png`、`/Users/shuohuang/code/hmz-work/ls-k1-1127-013124/.bot/out/omni11-final-deep/11-1-en.png`。各目录保留全部 PNG；PNG 被本地 exclude 规则忽略，只提交审计脚本和 JSON。
- 当前模型读取 PNG 返回 `Cannot read image`，因此这里只报告 DOM、几何、文件和哈希结果，**未声称看过图片或视觉通过**。三项 finding 的协调实图复审和主人最终视觉验收仍待。
- 未跑全站回归、真实 Fish／SGLang-Omni 模型或服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。最新回归只有不能分配到布局步骤的 `(exit 13)`，本轮未据此改教程。
- 本 clone 的 `node_modules` 原指向协调人 checkout。已只删除本目录内的符号链接并本地 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 本轮 4483 dev server（PID 13785）已停止，端口无监听。已确认属于本轮的 Chrome（PID 92044）及对应 `cdp-YRBWrB` 已清理；另一个归属不明的 Chrome 未触碰，未在 `ps` 权限受限时猜测其归属。
- 查看前在本目录运行 `npx astro dev --background --port 4483`。本地地址：`http://localhost:4483/learning-sglang/omni/ch/11-fish-s2-pro/?step=1`、`?step=7`、`?step=8`，接缝另一端为 `http://localhost:4483/learning-sglang/omni/ch/12-full-duplex-strategies/?step=1`。

---

# lane k1 本轮报告 · Omni 11／14 固定复审材料二次核对

日期：2026-11-27。类型：修旧证据整理。范围只有两份追加的逐相报告和本报告；未改教程、transcript、评分卡、`.bot/memory/`、其他书或其他 lane 的文件。本轮开始及采集时的 HEAD 与 `origin/tutorials` 均为 `8eea186`。

## 固定范围与结论边界

- Omni 11 固定为 `e71ab01942fd810ce7eb4eff3fc69fd4e8dc766b`，Omni 14 固定为 `5c5f749e707404c2fa7569c4db7e1c2fb29420ea`。当前 HEAD 到两个固定提交的组件、双语 deep、MDX、transcript 和审计脚本均无 diff。
- **本轮修复的 review finding 为 0，协调分数不变。** Omni 11 仍为 **NO-GO / coordinator-rereview-pending**，协调机制基线 **1/16**。Omni 14 仍为 **呈现 NO-GO / coordinator-rereview-pending**，协调 R1–R5 **80/80**、机制 R6 **16/16** 保持。本轮 DOM 和字号结果不自动关闭 Omni-02、Omni-15 或其他 findings。
- Omni-22、Omni-33 和 Omni-37 仍开放。下一轮协调顺序保持 **Omni 11 → Omni 14**。Omni 13、15 的既有 GO 不变，不开第 16／17 章。

## 追加材料与复核结果

| 项目 | Omni 11 `e71ab01` | Omni 14 `5c5f749` |
|---|---|---|
| 追加逐相报告 | `.bot/out/omni11-fixed-e71ab01-r2/report.json` | `.bot/out/omni14-fixed-5c5f749-r2/report.json` |
| 报告 SHA-256 | `680962fb6d72ba6f4d2899f6be3294b2c7ecf9d1e41c997f59934d20be3bbc5e` | `bb25f24d85fbe891ddcbf39c24c59d96b7c7c112657855b97ab0974ed36ebb0e` |
| 相位与机制转变 | **40** 相位，**32/32** 转变 | **34** 相位，**24/26** 转变，八步均有机制 |
| 桌面最低字号 | **10.506 CSS px** | **10.326 CSS px** |
| 重叠与出界 | **0 / 0** | **0 / 0** |
| 本地 PNG | 同目录 **40 张**，40 个不同 SHA-256 | 同目录 **34 张**，34 个不同 SHA-256 |

- 两次追加报告的汇总指标都与原报告一致。Omni 14 的 **34/34** 个状态及机制签名逐项一致。Omni 11 有 **35/40** 个机制签名一致；Step 5 phase 1／2、Step 7 phase 0／1、Step 8 phase 0 不同，因此不声称逐签名复现。全部 40 个状态的 step、phase、counter、可见文本数、最低字号和转变结果保持一致。
- 原截图、原审计 JSON、改前字号和第一次追加报告均保留。本次写入新目录，没有覆盖既有材料。PNG 被本地 exclude 规则忽略，只提交报告 JSON。

## 硬门与证据边界

- `npm run build`：**60 页**通过。两章默认 transcript 各连续采集两次，都与 pinned 逐字一致。Omni 11 为 **2,144 词**，SHA-256 `fec68ad32da78557d31306fb9664b6a983991cc0a0a59da85a73059bbc28afa1`；Omni 14 为 **2,302 词**，SHA-256 `070b24bc84a94f1c76e362db7d4f3f16e0b49b9ba1f95876f3dc98e897c458ba`。
- 两章各八步 `readability` 均为 **0 机械问题**。`deep-check` 均识别八步，`zh-check` 为 `all clear`。英中全章三宽度 `mobile` 和每个中文 Step 的三宽度字号门全部通过。
- 独立 explore 复核为 **GO（仅证据包）**：计数、哈希、固定源码 diff、各步最低字号和协调边界均未发现矛盾。它没有读取图片，也没有给予章节或协调 verdict。pstack-reviewer 因配置模型不存在而未启动，未计为证据。
- 代表图：`/Users/shuohuang/code/hmz-work/ls-k1-1127-011940/.bot/out/omni11-fixed-e71ab01-r2/s7-p1.png` 和 `/Users/shuohuang/code/hmz-work/ls-k1-1127-011940/.bot/out/omni14-fixed-5c5f749-r2/s2-p3.png`。当前模型读取四张 PNG 均返回 `Cannot read image`，所以本轮只记录 DOM、几何、文件和哈希结果，未声称看过图片或视觉通过。协调实图复审和主人最终视觉验收仍待。
- 本 clone 的 `node_modules` 原指向协调人 checkout。已只删除本目录内的符号链接并本地 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 未跑全站回归、真实模型、SGLang-Omni 服务、GPU benchmark、故障注入或 reduced-motion 动态切换。最新回归仍只有不能分配到布局步骤的 `(exit 13)`，本轮不据此改教程。
- 本地章节地址：`http://localhost:4482/learning-sglang/omni/ch/11-fish-s2-pro/?step=7` 和 `http://localhost:4482/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=2`。查看前在本目录运行 `npx astro dev --background --port 4482`；本轮服务和浏览器在收尾关闭。

---

# lane k1 本轮报告 · Omni 11／14 固定复审材料整理

日期：2026-11-27。类型：修旧证据整理。范围只有本报告和两份追加的逐相审计结果；未改教程、transcript、评分卡、`memory/progress.md`、`.bot/memory/`、其他书或其他 lane 的文件。本轮开始及材料采集时的 HEAD 与 `origin/tutorials` 均为 `9ed971e`。

## 固定快照与 review 边界

- Omni 11 固定为 `e71ab01942fd810ce7eb4eff3fc69fd4e8dc766b`，Omni 14 固定为 `5c5f749e707404c2fa7569c4db7e1c2fb29420ea`。当前 HEAD 到两个固定提交的指定组件、双语 deep、MDX、transcript 和原审计脚本均无 diff；Omni 11 从 `e71ab01` 到当前 HEAD 也没有共享布局或样式改动。追加材料因此在当前 HEAD 重放，不改动固定树。
- **本轮修复的 review finding 为 0，协调分数不变。** Omni 11 仍为 **NO-GO / coordinator-rereview-pending**，协调机制基线 **1/16**；作者 DOM 结果 **16/16** 不自动关闭 Omni-15 或 Omni-02 的本章部分。Omni-22 的 Slow AR→c0、Fast AR→c1–c9 接缝和 Omni-33 的 session 状态接缝仍开放。
- Omni 14 仍为 **呈现 NO-GO / coordinator-rereview-pending**。协调 R1–R5 **80/80**、机制 R6 **16/16** 保持；作者字号和 DOM 结果不自动关闭 Omni-02 或恢复原整章满分。Omni-37 的 Step 7 SSE 字段仍开放。
- Omni 13 固定 `bd4aa5d` 的 GO 和 Omni 15 最新九步树的 GO 不变，本轮未碰。下一轮协调顺序保持 **Omni 11 → Omni 14**，不开第 16／17 章。

## 固定材料索引

| 项目 | Omni 11 `e71ab01` | Omni 14 `5c5f749` |
|---|---|---|
| transcript | `transcript/omni/11-fish-s2-pro.md` | `transcript/omni/14-slow-reader-backpressure.md` |
| 词数与 SHA-256 | **2,144 词**；`fec68ad32da78557d31306fb9664b6a983991cc0a0a59da85a73059bbc28afa1` | **2,302 词**；`070b24bc84a94f1c76e362db7d4f3f16e0b49b9ba1f95876f3dc98e897c458ba` |
| 原逐相报告 | `.bot/out/omni11-phase-audit/report.json` | `.bot/out/omni14-phase-audit/report.json` |
| 原报告 SHA-256 | `41eb436c3daf09b3623646eff9d691390c90e80ab2ce0359a1a59f17ec940be8` | `f404b244a8c7cec3803bf58ecd84fb4a57c01681a683b03ca42395b1e6760023` |
| 原报告结果 | **40** 相位，**32/32** 机制转变，最低 **10.506 CSS px**，重叠／出界 **0/0** | **34** 相位，**24/26** 机制转变，八步均有机制，最低 **10.326 CSS px**，重叠／出界 **0/0** |
| 本轮追加报告 | `.bot/out/omni11-fixed-e71ab01/report.json` | `.bot/out/omni14-fixed-5c5f749/report.json` |
| 追加报告 SHA-256 | `dd19a3807b7fccee96ea8550b4d8e2367c8e3d5ac449e5f6ee790b56db0bad51` | `5f7215b4d4e85b9404489dd22e382ace974e983f35803adbcd16cba9610f449d` |
| 本地 PNG | 同目录 **40 张**，40 个不同 SHA-256 | 同目录 **34 张**，34 个不同 SHA-256 |

两个 transcript 哈希均直接从固定提交的 Git 对象重算。两个原审计报告与固定提交逐字节一致。追加重放的汇总指标全部与原报告一致；Omni 14 的 34 条 state 也逐项一致。Omni 11 有 34／40 条机制签名一致，Step 5 phase 1／2、Step 7 phase 0／1／2、Step 8 phase 0 的签名不同，因此不声称逐签名一致；这些状态的 step、phase、counter、最低字号、转变结果、重叠和出界结果仍一致。

### 各步桌面最低字号（1440×900，CSS px）

| Step | Omni 11 固定值 | Omni 14 基线 → 固定值 |
|---|---:|---:|
| 1 | 10.506 | 9.220 → 11.064 |
| 2 | 10.720 | 7.593 → 10.630 |
| 3 | 10.806 | 8.328 → 10.826 |
| 4 | 10.806 | 7.943 → 10.561 |
| 5 | 10.806 | 7.593 → 10.630 |
| 6 | 10.720 | 8.464 → 10.580 |
| 7 | 11.102 | 8.067 → 10.891 |
| 8 | 10.643 | 7.943 → 10.326 |

Omni 14 的改前记录保留在 `.bot/out/omni14-font-baseline/report.json`，未覆盖。Step 4／7 的末相停留也保留，不能把 24/26 写成 26/26。

## 复现、视觉边界与清理

```sh
npx astro dev --background --port 4481
BASE=http://localhost:4481/learning-sglang OUT=.bot/out/omni11-fixed-e71ab01 node .bot/out/omni11-phase-audit.mjs
BASE=http://localhost:4481/learning-sglang OUT=.bot/out/omni14-fixed-5c5f749 node .bot/out/omni14-phase-audit.mjs
npx astro dev stop
```

- 代表图：`/Users/shuohuang/code/hmz-work/ls-k1-1127-010947/.bot/out/omni11-fixed-e71ab01/s7-p1.png` 和 `/Users/shuohuang/code/hmz-work/ls-k1-1127-010947/.bot/out/omni14-fixed-5c5f749/s2-p3.png`。PNG 被 gitignore，只保留本地；报告 JSON 和可重跑脚本纳入提交。
- 当前模型读取两张代表 PNG 均返回 `Cannot read image`。本轮只提供 DOM、截图文件、哈希和几何证据，未声称看过图片、视觉通过或完成协调验收。没有新增 explore PASS，也没有重跑全站回归或真实模型、服务、GPU benchmark、故障注入和 reduced-motion 动态切换。
- 本 clone 的 `node_modules` 原指向协调人 checkout。已只删除本目录内的符号链接并本地 `npm install`，未写协调人的 checkout，package 文件无 diff。
- 本轮 4481 dev server（PID 11334）已停止，端口无监听；两个审计浏览器均已关闭。`pgrep -P 1` 未发现父进程为 1 的 Chrome，其他浏览器未触碰。查看章节前在本目录运行上面的 dev server 命令；地址为 `http://localhost:4481/learning-sglang/omni/ch/11-fish-s2-pro/?step=7` 和 `http://localhost:4481/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=2`。

---

# lane k1 本轮报告 · Omni 14 桌面小字固定树复核

日期：2026-11-27。类型：修旧复核。范围只有 Learning SGLang Omni 第 14 章的既有字号修复、逐相审计和本报告；未改 Omni 11／13／15、其他书、其他 lane、第 1 本受保护英文原文或 `.bot/memory/`。

## 单元与 review 状态

- 本轮开始时 HEAD 与 `origin/tutorials` 均为 `934a4f3`。Step 2 的 `584f99d`、其余七步的 `b6b8f6f`、`728802d`、`5187280`、`68ef3b7`、`a086e57`、`dce37ea`、`25553d6` 已在当前树中，本轮不重复改教程。
- **Omni-02 第 14 章部分的作者返工已完成，仍待协调固定复审。** 独立 explore 冷读判 scoped repair GO，未发现新的内容洞。本轮不自行关闭 finding 或提高协调分数：历史 R1–R5 **80/80**、机制 R6 **16/16**、原十个非视觉项 **160/160**、原十二项 **192/192** 保持；完整 verdict 仍为 **呈现 NO-GO / coordinator-rereview-pending**。Omni-37 和其他书内开放项不变。
- 源码对照确认本轮范围只有桌面字号和两处桌面几何。caption、事实、数字、相位数量、机制对象、双语 deep 和手机布局均未改。

## 复核证据

- `npm run build`：**60 页**通过。默认 transcript 连续两次逐字一致并与 pinned 无差异：**2,302 词**，SHA-256 `070b24bc84a94f1c76e362db7d4f3f16e0b49b9ba1f95876f3dc98e897c458ba`。八步 `readability` 为 **0 机械问题**；`deep-check 14`、`zh-check`、英文全章三宽度 `mobile`、中文逐步三宽度字号门均通过。
- 重跑 `.bot/out/omni14-phase-audit.mjs`，覆盖八步 **34 个 1440×900 桌面相位**。各步最低字号为 **11.064、10.630、10.826、10.561、10.630、10.580、10.891、10.326 CSS px**；文字重叠 **0**、SVG 出界 **0**。counter、step 和 phase 身份全部匹配，八步都有机制状态；26 个相邻转变中 24 个改变机制签名，Step 4／7 的末相停留保持。
- 首次重跑在 Step 4 phase 2 拍到 500 ms 淡入过程，导致同一末相被记成两次机制变化。审计等待由 550 ms 改为 750 ms 后，Step 4／7 都在末相稳定停留；教程组件未因此改动。最终报告为 `.bot/out/omni14-phase-audit/report.json`，34 张 PNG 在同目录，代表图为 `s2-p3.png`。
- 当前模型不能读取 PNG，工具已返回 `Cannot read image`；本轮只报告源码、transcript、DOM 和几何结果，未声称看过图片或视觉通过。协调实图复审与主人最终视觉验收仍待。
- 本 clone 的 `node_modules` 初始为指向协调人 checkout 的符号链接。已只删除本目录内的符号链接，并使用本目录缓存执行 `npm install`，后续构建和检查均未写协调人的 checkout。

## 剩余与本地查看

- 未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、SGLang-Omni 服务、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。不开第 16／17 章，不处理其他 lane 的开放项。
- 代表截图：`/Users/shuohuang/code/hmz-work/ls-k1-1127-004926/.bot/out/omni14-phase-audit/s2-p3.png`。本地章节地址：`http://localhost:4472/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=2`。
- 本轮 4472 dev server（PID 19977）已停止，脚本启动的浏览器均已关闭；`pgrep -P 1` 未发现父进程为 1 的 Chrome，其他归属不明的浏览器未触碰。查看前在本目录运行 `npx astro dev --background --port 4470`。

---

# lane k2 本轮报告 · ML Systems 08 Step 2 手机相位证据修复

日期：2026-11-27。类型：修旧证据返工。范围只有 ML 08 Step 2 的审计脚本、重新生成的证据和本报告；未改教程、其他 ML 章、Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

- **HEAD 记录更正。** 本轮写作起点是 `439b4ce`（其前为 `934a4f3`、`6140cb9`），不是下一段第 5 行误写的 `20e87b1`；后者只是协调台账的 origin 快照。本次证据修复从已推送的 `4593a99` 继续。
- **上一轮的 30 张手机相位 PNG 全部作废。** 六组 lang×width 各自的五张图逐字节相同，不能作为五相视觉证据。桌面 1440 的 10 张 PNG 逐相不同，不受这项作废影响。带身份断言的实时 DOM 结果仍然成立；本轮不重评教程分数，也不自行核销 ML-17。
- `.bot/out/ml08-step2-audit.mjs` 现在先取 screenshot buffer，相邻相位 PNG 完全相同就 throw，不写该图；每个状态另记 `pngBytes` 和 `pngMd5`，汇总要求 **40/40 个 hash 不同**。首次启用断言时在 `en 360 phase 1` 按预期失败，复现了冻结帧。
- 每组手机捕获改用独立浏览器，避免复用冻结的后台 compositor。完整重跑后，六组手机均为 **5/5 张不同 PNG**，桌面两组也为 **5/5**；独立读取磁盘文件重算 MD5 和字节数，全部与 report.json 一致。最终仍为 **40 个状态、32/32 个机制转变、40 个不同 PNG hash**，最低可见字体 **10.407 CSS px**，文字重叠和 SVG 出界均为 **0**。
- 代表手机图：`/Users/shuohuang/code/hmz-work/ls-k2-1127-004934/.bot/out/ml08-step2-audit/en-360-s2-p4.png`。当前模型不能读取 PNG，未声称视觉通过；ML-17 与其他 findings 的协调 verdict 不变，主人最终视觉验收另计。
- 未跑全站回归、真实 FSDP2 训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。不开第 14 章。本轮 4470 dev server 和脚本启动的浏览器均在收尾关闭；本地地址为 `http://localhost:4470/learning-sglang/ml-sys/ch/08-fsdp2-training-backend/?step=2`。

---

# lane k2 跟进复核 · ML Systems 08 Step 2 的 ML-17

日期：2026-11-27。类型：修旧复核。范围只有本报告和 Step 2 审计结果；未改教程、其他 ML 章、Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

- 本轮开始时 HEAD 与 `origin/tutorials` 都是 `20e87b1`。既有 `cebc7bd` 已补 logical tensor `W` → `Shard(0)` placement → local shard，并连接第 3 步 all-gather 与第 6 步 `Replicate()`；`75bb176` 已把分片范围收窄为参数张量。本轮不重复改写教程，Step 4 的 FP32 `ReduceOp.AVG` 和其他相位保持不变。
- **ML-17 的作者返工复核通过，仍待协调固定复审。** 本轮没有新关闭 review finding，也不自行提高协调总分。作者评分保持 R1–R5 **10/10**、机制 R6 **2/2**、非视觉原项 **20/20**、剩余内容洞 **0**。小学生复述：「八张 GPU 把一张权重表按行分成八份，每张只留一份，所以每卡保存的训练表从 64 GB 减到 8 GB；需要完整数值时，再把各份拼回来。」
- `npm run build`：**60 页**通过。Step 2 readability、`deep-check 08`、`zh-check`、英中全章三宽度 mobile、中文 Step 2 字号门均通过。transcript 连续两次与 pinned 逐字一致：**1,884 词**，SHA-256 `9cbc88c326308bb17fa6fc6c7cffe0a6bffbddae8c348e15fe2e9d010e8faf36`。
- 重跑 `.bot/out/ml08-step2-audit.mjs`：**40 个普通状态、32/32 个机制转变**，最低可见字体 **10.407 CSS px**，文字重叠和 SVG 出界均为 **0**。双语 deep 均确认展开，并包含 `Shard(0)` 与 `Replicate()`；KaTeX、残留公式和横向溢出检查通过。报告为 `.bot/out/ml08-step2-audit/report.json`。
- 代表截图：`/Users/shuohuang/code/hmz-work/ls-k2-1127-004146/.bot/out/ml08-step2-audit/en-1440-s2-p4.png`。当前模型不能读取 PNG，工具返回 `Cannot read image`；本轮只报告 DOM、文本和几何结果，未声称看过图片或视觉通过，原 #4／#5 与协调视觉 verdict 留待复审。
- 本 clone 的 `node_modules` 初始为指向协调人 checkout 的符号链接。已只删除本目录内的符号链接并执行本地 `npm install`，后续依赖、cache、dev server 和构建均在本 clone，未写协调人的 checkout。
- 剩余边界不变：ML-17 等协调核销，其他 ML 开放 findings 不自动关闭，不开第 14 章。未跑全站回归、真实 FSDP2 训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。主人与协调人的最终视觉和产品验收另计。
- 本地章节地址：`http://localhost:4469/learning-sglang/ml-sys/ch/08-fsdp2-training-backend/?step=2`。本轮 4469 dev server 和脚本启动的浏览器均在收尾关闭；查看前在本目录运行 `npx astro dev --background --port 4469`。

---

# lane k2 本轮报告 · ML Systems 08 Step 2 的 ML-17 收尾

日期：2026-11-27。类型：修旧。范围只有 ML Systems 第 8 章第 2 步、生成 transcript、本章评分与进度记录、验证材料和本报告；未改其他 ML 章、Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## 修复与评分

- 本轮开始时 HEAD 为 `968eb98`，既有 `cebc7bd` 已完成 logical tensor `W` → `Shard(0)` placement → local shard 的五相演示，并连接第 3 步 all-gather 与第 6 步 `Replicate()`。本轮没有重做这些相位，也没有改第 4 步的 FP32 `ReduceOp.AVG` 与 `R/B` 预缩放。
- 独立 explore 复审首先判 **NO-GO**：caption 的 `every tensor` 会误含 activation 等不分片张量。教程提交 `75bb176 [k2] Scope ML 08 sharding to parameters` 已推 `origin/tutorials`，把英中 caption 分别收窄为 `every parameter tensor` 和 `每个参数张量`。
- 同一 explore 复读为 **ML-17 PASS**：R1–R5 **10/10**、机制 R6 **2/2**、非视觉原项 **20/20**、剩余内容洞 **0**。小学生复述：「八张显卡把一张权重表按行分成八份，每张只留一份，所以每卡要保存的训练表从 64 GB 减到 8 GB；需要整张表时，再把各份拼回来。」
- 协调的 ML-17 仍待固定复审，本报告不自行销项或改写整章协调总分。pstack-reviewer 因配置模型不存在而未启动，未计为证据；上述独立结论来自 explore 的源码、transcript、deep 与 DOM 复核。

## 验证与证据

- `npm run build`：**60 页**通过。Step 2 readability、`BOOK=ml-sys node scripts/deep-check.mjs 08`、`zh-check`、英中全章三宽度 mobile、中文 Step 2 字号门和 `git diff --check` 全过。
- 默认 transcript 连续两次逐字一致：**1,884 词**，SHA-256 `9cbc88c326308bb17fa6fc6c7cffe0a6bffbddae8c348e15fe2e9d010e8faf36`。
- 重跑 `.bot/out/ml08-step2-audit.mjs`：**40 个普通状态、32/32 个机制转变**，最低可见字体 **10.407 CSS px**，文字重叠和 SVG 出界均为 **0**。双语 deep 均确认展开，并包含 `Shard(0)` 与 `Replicate()`；KaTeX、残留公式和横向溢出检查通过。报告为 `.bot/out/ml08-step2-audit/report.json`。
- 代表截图：`/Users/shuohuang/code/hmz-work/ls-k2-1127-003249/.bot/out/ml08-step2-audit/en-1440-s2-p4.png`。当前模型不能读取 PNG，工具已返回 `Cannot read image`；本轮只报告 DOM、文本和几何结果，未声称看过图片或视觉通过，原 #4／#5 与协调视觉 verdict 留待复审。
- 本 clone 的 `node_modules` 初始为指向协调人 checkout 的符号链接。已只删除本目录内的符号链接并执行本地 `npm install`，后续依赖、cache、dev server 和构建均在本 clone，未写协调人的 checkout。

## 剩余与本地查看

- 未跑全站回归、真实 FSDP2 训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。其他 ML 开放 findings 不因本轮自动关闭，不开第 14 章。
- 本地章节地址：`http://localhost:4468/learning-sglang/ml-sys/ch/08-fsdp2-training-backend/?step=2`。本轮 4468 dev server 和脚本启动的浏览器均在收尾关闭；查看前在本目录运行 `npx astro dev --background --port 4468`。
- 本记录随后续 `[k2] ` 提交推送。主人与协调人的最终视觉和产品验收另计。

---

# lane k1 跟进复核 · Omni 14 桌面小字（无新教程改动）

日期：2026-11-27。类型：修旧复核。范围只有 Learning SGLang Omni 第 14 章的既有修复、逐相审计和本报告；未改 Omni 11／13／15、其他书、其他 lane、第 1 本受保护英文原文或 `.bot/memory/`。

## 单元与 review 状态

- 本轮 HEAD 与 `origin/tutorials` 均为 `968eb98`，direction 仍指定 Omni 14 桌面小字。Step 2 的 `584f99d`、其余七步的 `b6b8f6f`、`728802d`、`5187280`、`68ef3b7`、`a086e57`、`dce37ea`、`25553d6` 及记录 `968eb98` 已提交并推送，本轮不重复改教程。
- **Omni-02 第 14 章部分的作者返工已完成，仍待协调固定复审。** 本轮没有自行关闭 finding，也没有改分数：协调历史 R1–R5 **80/80**、机制 R6 **16/16**、原十个非视觉项 **160/160**、原十二项 **192/192** 保持；完整 verdict 仍为 **呈现 NO-GO / coordinator-rereview-pending**。Omni-37 和其他书内开放项不变。

## 复核证据

- 重跑 `.bot/out/omni14-phase-audit.mjs`，覆盖八步 **34 个 1440×900 桌面相位**。各步最低字号为 **11.064、10.630、10.826、10.561、10.630、10.580、10.891、10.326 CSS px**；文字重叠 **0**、SVG 出界 **0**。counter、step 和 phase 身份全部匹配，八步都有机制状态；26 个相邻转变中 24 个改变机制签名，Step 4／7 的末相停留保持。Step 4 单独重跑得到相同四相签名。
- `npm run build`：**60 页**通过。默认 transcript 连续两次逐字一致并与 pinned 无差异：**2,302 词**，SHA-256 `070b24bc84a94f1c76e362db7d4f3f16e0b49b9ba1f95876f3dc98e897c458ba`。八步 `readability` 为 **0 机械问题**；`deep-check 14`、`zh-check`、英文全章三宽度 `mobile`、中文逐步三宽度字号门均通过。
- 独立 explore 只读冷读判定源码范围、caption／事实／deep 不变、机制保持、stage／deep 对齐和新增内容洞均为 **PASS**。当前模型不能读取 PNG，未声称已看图或视觉通过；协调实图复审与主人最终视觉验收仍待。
- 本 clone 的 `node_modules` 初始为指向协调人 checkout 的符号链接。已只删除本目录内的符号链接并执行本地 `npm install`，所有构建和检查均使用本目录依赖。

## 剩余与本地查看

- 未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、SGLang-Omni 服务、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。不开第 16／17 章，不处理其他 lane 的开放项。
- 本轮只提交复核记录和重生的 `.bot/out/omni14-phase-audit/report.json`。代表截图：`/Users/shuohuang/code/hmz-work/ls-k1-1127-003738/.bot/out/omni14-phase-audit/s2-p3.png`。
- 本地章节地址：`http://localhost:4467/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=2`。本轮 dev server 和浏览器在收尾关闭；查看前在本目录运行 `npx astro dev --background --port 4467`。

---

# lane d 本轮报告 · Voxt 11 Step 3 逐相机制

日期：2026-11-27。类型：修旧。范围只含 Inside Voxt 第 11 章第 3 步（`ModelStorageUpdates.svelte` 的 step index 2）、本章评分卡、`memory/progress.md`、验证脚本与结果和本报告；未改 Step 1／2／4／5／6、Voxt 08／10、其他书、第 1 本受保护英文原文或 `.bot/memory/`。

## 单元与修复

- direction 的 lane d 单元：**只做 Voxt 11 Step 3 的逐相机制**。本轮开始时 HEAD 为 `968eb98`，fetch 后 rebase 到 `934a4f3`（只有其他 lane 的提交）。教程提交 `439b4ce [d] Split Voxt 11 step 3 into four per-phase states` 已推 `origin/tutorials`，首次推送被拒后 `git pull --rebase origin tutorials` 再推，未 force-push。
- 处理的 open review 项：`c3a7773` 复审的第 3 步机制 1/2（「在 `next start continues` 文本下直接画满进度，末相校验文字变化又在红框外」），`fa8d912` 维持为逐步 **2、2、1、1、1、2** 中的第 3 步 1/2。
- 修复：`PHASE_COUNTS[2]` 3→4，四相各形成一个可辨认状态：进度停在 40%、`Cancel here; these bytes stay.` → 从取消点续传到 70%、`The next start continues from here.` → 续传满格 → `Checks: all 9 files pass; the job is done.` 与 `2.47 GB ✓`。取消标记线四相都保留，作为已发生取消的记录；前三相红框包住进度条、标记和状态行，末相红框移到状态行（变化对象是校验文字和 ✓），不再指向没有变化的 CHECK 卡。
- 跟进（同单元内协调复指出）：第一版前三相框底在状态文字上方（桌面 SVG y=146／手机 y=134），相位 0→1、1→2 同时变化的状态行在框外，live DOM 报 `statusInsideFocus: false`。已把前三相框加高到含状态行（桌面框底 y=184、手机 y=176），审计新增「变化元素必在 `.motion-focus` 内」断言后 32 视图全过，桌面相位 1／2 的 `statusInsideFocus` 与 `fillInsideFocus` 均为 true。
- 保留既有 2 GB 空位、Silero VAD、取消语义、字节／百分比算式和 caption，不扩新内容；末相舞台文字与旧末相逐字相同，transcript 重生成**无 diff**。Step 4／5 留给后续轮。
- **本轮没有自行关闭协调 finding，机制分不自行提。** 评分卡先同步协调固定 `fa8d912` 的基线：R1–R5 **54/60**、原十个非视觉项 **119/120**、静态 R6 **12/12**、原 #4/#5 **24/24**、原十二项 **143/144**、机制 R6 **9/12**（逐步 2、2、1、1、1、2）；Step 3 保持待审，整章 **NO-GO / coordinator-rereview-pending**。

## 验证

- `npm run build`：**60 页**通过。`BOOK=voxt ONLY=11` transcript（6 步无告警，重生成无 diff）、`STEP=3` readability（0 机械问题）、`deep-check 11`、`zh-check`（all clear）均通过。
- 英中全章与中文 Step 3 的 360／390／430 px `mobile` 均 no layout breaks，中文 Step 3 字号门通过。注意：`scripts/mobile.mjs` 只认位置参数，第一次用 `BASE=` 环境变量时误连 4321 的外部服务，该次英文结果作废，已全部用 `http://localhost:4471/learning-sglang` 位置参数重跑。
- 逐相审计 `.bot/out/voxt11-step3-audit.mjs`（可重跑）：英中桌面 1440×900 ＋ 英中 360／390／430 px 共 **8 组 × 4 相 = 32 个视图**，采集前核对 hydration（相位实际循环）、counter `03 / 06`、`data-animation-step/phase`、响应式 viewBoxWidth（桌面 720／手机 300）和 600 ms settling，按组件 bbox 完整截取。结果 `.bot/out/voxt11-step3-audit/report.json`：填充宽度逐相 248→434→620→620（手机 96→168→240→240），取消标记四相均在，✓ 只在末相出现，四相状态行互不相同；文字重叠、SVG 出界、红框描边压字均为 **0**，最低可见字体 **10.76 CSS px**（zh-360 的「循环」）；新增的变化元素框内容断言（相邻相位变化的文本与填充必须完整落在当相红框内）**32/32 通过**。32 张 PNG 在本目录 `.bot/out/voxt11-step3-audit/`（PNG 被 gitignore，不提交）。
- 采集脚本第一版有两个自身 bug 已修：模板字符串里的 `\s` 被 JS 转义吃掉导致状态行匹配失败；en 手机视图继承了同 profile 的 zh localStorage。修正后 32 视图零失败。
- 当前模型不能读取 PNG（工具明确返回 Cannot read image），未声称已看图或视觉通过；以上为 DOM 与几何证据，协调实图复审与主人最终视觉验收仍待。
- 本 clone 的 `node_modules` 初始又是指向协调人 checkout 的符号链接，已只删除本目录内的符号链接并本地 `npm install`，未写协调人的 checkout。

## 剩余与本地查看

- 剩余：Step 3 等协调固定复审重评机制分；之后按 direction 顺序做 Step 4、Step 5（各 1/2 的同类返工），再 Voxt 10、12。Voxt 08 `bb70918` 的 GO 不回退，不碰 Omni 或 ML Systems。
- 未跑全站回归、真实 Voxt、模型下载、模型进程、应用更新、reduced-motion 动态切换或主人最终产品验收；事实按 pinned `sglang-omni origin/main@c2fc0f1` 核对。
- 本地章节地址：`http://localhost:4471/learning-sglang/voxt/ch/models-and-app-updates/?step=3`（查看前在本目录运行 `npx astro dev --background --port 4471`）。代表截图绝对路径：`/Users/shuohuang/code/hmz-work/ls-d-1127-003846/.bot/out/voxt11-step3-audit/en-desktop/p1.png`。
- 本轮 4471 dev server 和脚本启动的浏览器均在收尾关闭。

---

# lane k1 本轮报告 · Omni 14 八步桌面小字返工

日期：2026-11-27。类型：修旧。范围只含 Learning SGLang Omni 第 14 章 `SlowReaderBackpressure.svelte`、本章评分记录、验证产物和本报告；未改 Omni 11／13／15、其他书、其他 lane 的章节、第 1 本受保护英文原文或 `.bot/memory/`。

## open review 项与逐提交结果

- 处理 **Omni-02 的第 14 章桌面小字部分**。按 direction 先修 Step 2，再逐步实测其余步。返工前八步最低字号为 **9.220、7.593、8.328、7.943、7.593、8.464、8.067、7.943 CSS px**；返工后为 **11.064、10.630、10.826、10.561、10.630、10.580、10.891、10.326 CSS px**。
- 教程提交依次为 `584f99d`（Step 2）、`b6b8f6f`（Step 1）、`728802d`（Step 3）、`5187280`（Step 4）、`68ef3b7`（Step 5）、`a086e57`（Step 6）、`dce37ea`（Step 7）、`25553d6`（Step 8），均已推 `origin/tutorials`。两次推送被拒后均执行 `git pull --rebase origin tutorials` 再推，没有 force-push。
- 只调整桌面字号和两处几何：Step 4 的桌面 viewBox 高度 **650→660**，避免放大后的收尾问题与脚注重叠；Step 8 使用 **13 px** 并把长失败说明左移 8 个 SVG 单位，消除右侧出界。caption、事实、相位数量、机制对象、数字和手机布局未改。
- **本轮没有自行关闭协调 finding。** Omni-02 本章部分的作者返工已完成，仍待协调固定复审。Omni-37 的 Step 7 SSE 字段和其他书内开放项保持不动。协调历史分保持 R1–R5 **80/80**、原十个非视觉项 **160/160**、原十二项 **192/192**、机制 R6 **16/16**；完整 verdict 仍记 **呈现 NO-GO / coordinator-rereview-pending**，不写 `complete-under-EVAL`。

## 冷读与验证

- 文本和内容没有变化，八步沿用已审的小学生复述，新增内容洞 **0**。返工前后 34 个相位的 step／phase 身份、可见文本数量和转变模式逐项一致；26 个步内相邻转变中有 **24** 个机制签名变化，既有 Step 4／7 末相停留不变。
- `npm run build`：**60 页**通过。全章八步 `readability` 为 **0 机械问题**；`deep-check 14`、`zh-check`、英中全章 360／390／430 px `mobile`、中文逐步字号门和 `git diff --check` 全过。
- 默认 transcript 连续两次逐字一致并与 pinned 无差异：**2,302 词**，SHA-256 `070b24bc84a94f1c76e362db7d4f3f16e0b49b9ba1f95876f3dc98e897c458ba`。
- 可重跑脚本 `.bot/out/omni14-phase-audit.mjs` 覆盖 **34 个 1440×900 桌面相位**。最终报告 `.bot/out/omni14-phase-audit/report.json`：八步都有机制状态，最低 **10.326 CSS px**，文字重叠 **0**、SVG 出界 **0**。34 张 PNG 在同目录，代表图为 `s2-p3.png`。
- 当前模型不能读取 PNG，未声称已看图或视觉通过。独立 pstack-synthesizer 因配置模型不存在而未启动，未计为证据。协调实图复审与主人最终视觉验收仍待。
- 本 clone 的 `node_modules` 初始为指向协调人 checkout 的符号链接。已只删除本目录内的符号链接并执行本地 `npm install`，后续依赖、cache、dev server 和构建均在本 clone，未写协调人的 checkout。

## 剩余与本地查看

- 未跑全站回归、真实 SSE／WebSocket／raw-PCM 连接、SGLang-Omni 服务、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。Omni-02 其他章和 Omni-37 不在本单元，不开第 16／17 章。
- 本地章节地址：`http://localhost:4467/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=2`。代表截图绝对路径：`/Users/shuohuang/code/hmz-work/ls-k1-1127-001142/.bot/out/omni14-phase-audit/s2-p3.png`。
- 本轮 4467 dev server 和脚本启动的浏览器均在收尾关闭。查看前在本目录运行 `npx astro dev --background --port 4467`。

---

# lane k1 本轮报告 · Omni 11 Step 7／8 固定树复核

日期：2026-11-26。类型：修旧复核。范围只含 Learning SGLang Omni 第 11 章和本报告；未改其他步、其他书、其他 lane、第 1 本受保护英文原文或 `.bot/memory/`。

## 当前单元与 open review 项

- 本轮开始时 HEAD 与 `origin/tutorials` 均为 `4f3576a`。direction 的 23:10 版本要求完成 Step 8 和 Step 7 完整机制后停下待固定复审；当前 origin 已包含 `d8c7c4f`（Step 8）、`50297db`（Step 7）和 `6b16377`（本章桌面字号），因此本轮不重复改写教程，只复核这组既有提交。
- **Omni-15 · 第 11 章机制**：Step 7 依次形成 40 帧首窗、20 旧帧加 45 新帧的第二窗、20 旧帧加 5 新帧的最后窗，灰色 512 尾巴随相位经历留下、使用和释放。Step 8 依次形成 B 的 50 帧补位、`[2,10,90]` 的一次 vocoder 调用和裁回 90F／40F 的两份输出。红框和 LoopProgress 不计入机制证据。
- **Omni-02 的第 11 章桌面字号部分**：40 个桌面相位最低 **10.506 CSS px**；Step 7 最低 **11.102 CSS px**，Step 8 最低 **10.643 CSS px**。本轮没有新增字号修复。
- 本轮没有新关闭协调 finding。协调基线仍是机制 R6 **1/16**，直至固定复审；Omni-33 的 session 状态接缝和其他书内开放项保持不变。按 direction 停在这里，不提前处理 Omni 14。

## 作者冷读与评分边界

主线程按 transcript、组件、双语深入讲解和相位 DOM 冷读，未把 `deep-check ok` 当作语义通过。Step 7／8 的作者评分均为 R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**，新增内容洞 **0**。

| 步 | R1–R6 | 小学生复述 | 新洞 |
|---|---:|---|---:|
| 7 | 12/12 | 三个窗口会重读旧帧，但旧声音不重复播放；512 个采样点先留下，最后再放出。 | 0 |
| 8 | 12/12 | B 的 40 帧先补到 A 的 90 帧，一起解码后再裁掉补的 50 帧。 | 0 |

独立 pstack-reviewer 因配置模型 `qweneval/qwen-latest-series-invite-1102#high` 不存在而未启动，未计为证据。当前模型不能读取 PNG，已生成但不声称看过图片；原 #4／#5、原十二项新总分和协调 verdict 均留待固定复审。

## 验证

- `npm run build`：**60 页**通过。全章八步 `readability` 为 **0 机械问题**；`deep-check 11`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 7／8 字号门和 `git diff --check` 全过。
- 默认 transcript 连续两次逐字一致并与 pinned 无差异：**2,144 词**，SHA-256 `fec68ad32da78557d31306fb9664b6a983991cc0a0a59da85a73059bbc28afa1`。
- `OUT=.bot/out/omni11-rereview BASE=http://localhost:4466/learning-sglang node .bot/out/omni11-phase-audit.mjs`：覆盖 **40 个桌面相位**，身份均匹配，排除红框和 LoopProgress 后 **32/32** 个步内相邻转变改变机制签名。文字重叠和 SVG 出界均为 **0**。报告在 `.bot/out/omni11-rereview/report.json`，代表图路径为 `.bot/out/omni11-rereview/s7-p1.png` 和 `.bot/out/omni11-rereview/s8-p3.png`。
- Step 7／8 的英中深入讲解均实际打开，`aria-expanded=true`，counter 为对应步，横向溢出、KaTeX 错误和残留 `$$` 均为 **0**。截图在 `.bot/out/omni11-rereview/deep-en/` 和 `deep-zh/`。
- 本 clone 的 `node_modules` 初始为指向协调人 checkout 的符号链接。已只删除本目录内的符号链接并执行本地 `npm install`，避免 Vite 写入协调人的目录；package 文件无 diff。
- 未跑全站回归、真实 Fish S2 Pro、SGLang-Omni 服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。

## 提交与剩余

- Step 7／8 的教程提交及桌面字号提交均已在此前推送到 `origin/tutorials`；本轮没有教程 diff，只提交这份复核记录。
- 本地章节地址：`http://localhost:4466/learning-sglang/omni/ch/11-fish-s2-pro/?step=8`。本轮 4466 dev server 已停止；查看前在本目录运行 `npx astro dev --background --port 4466`。
- 本轮脚本启动的浏览器均已关闭。另发现两个启动更早的 headless Chrome，因无法读取父进程且归属不明，未触碰。

---

# lane k2 本轮报告 · ML Systems 08 Step 2 的 ML-17 固定树复核

日期：2026-11-27。类型：修旧复核。范围只有 ML Systems 第 8 章第 2 步的既有修复、验证材料和本报告；未改教程、其他 ML 章、Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

- 本轮 HEAD 与 `origin/tutorials` 均为 `934a4f3`。既有 `cebc7bd` 和 `75bb176` 已完成 logical tensor `W` → `Shard(0)` placement → local shard，并连接第 3 步 all-gather 与第 6 步 `Replicate()`；本轮不重复改写教程，Step 4 的 FP32 `ReduceOp.AVG` 和其他相位保持不变。
- **ML-17 作者返工复核通过，仍待协调固定复审。** 独立 explore 冷读为 **PASS**：R1–R5 **10/10**、机制 R6 **2/2**、非视觉原项 **20/20**、剩余内容洞 **0**。小学生复述：「八张显卡把每张数表按行分成八份，各留一份，所以每张显卡要存的东西从 64 GB 减到 8 GB；需要完整数表时，再把这些份拼回来。」pstack-reviewer 因配置模型不存在而未启动，未计为证据。
- `npm run build`：**60 页**通过。Step 2 readability、`deep-check 08`、`zh-check`、英文全章三宽度 mobile、中文 Step 2 字号门和 `git diff --check` 均通过。transcript 连续两次与 pinned 逐字一致：**1,884 词**，SHA-256 `9cbc88c326308bb17fa6fc6c7cffe0a6bffbddae8c348e15fe2e9d010e8faf36`。
- 第一次逐相审计被 120 秒工具预算截断，未计通过；延长预算后完整重跑 `.bot/out/ml08-step2-audit.mjs`：**40 个普通状态、32/32 个机制转变**，最低可见字体 **10.407 CSS px**，文字重叠和 SVG 出界均为 **0**。双语 deep 均确认展开，并包含 `Shard(0)` 与 `Replicate()`；KaTeX、残留公式和横向溢出检查通过。报告为 `.bot/out/ml08-step2-audit/report.json`。
- 当前模型不能读取 PNG，工具返回 `Cannot read image`；本轮只报告源码、transcript、DOM 和几何结果，未声称看过图片或视觉通过。原 #4／#5、协调视觉 verdict 和主人最终视觉验收仍待。
- 本轮没有新关闭协调 finding，也不自行提高协调总分。ML-17 等协调核销，其他 ML 开放 findings 不自动关闭，不开第 14 章。未跑全站回归、真实 FSDP2 训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。
- 本 clone 的 `node_modules` 初始指向协调人 checkout。已只删除本目录内的符号链接并执行本地 `npm install`，后续依赖、cache、dev server 和构建均在本 clone。
- 代表截图：`/Users/shuohuang/code/hmz-work/ls-k2-1127-004934/.bot/out/ml08-step2-audit/en-1440-s2-p4.png`。本地章节地址：`http://localhost:4470/learning-sglang/ml-sys/ch/08-fsdp2-training-backend/?step=2`。本轮 4470 dev server 和脚本启动的浏览器均在收尾关闭；查看前在本目录运行 `npx astro dev --background --port 4470`。

---

# lane k2 跟进复核 · ML Systems 08 Step 2 的 ML-17

日期：2026-11-27。类型：修旧复核。范围只有 ML Systems 第 8 章第 2 步的既有修复、验证材料和本报告；未改其他 ML 章、Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

- 本轮开始时 HEAD 为 `5187280`，fetch 后 fast-forward 到 `68ef3b7`，新增提交只改 k1 的 Omni 14。direction 的 lane k2 单元未变；`cebc7bd` 与 `5536d1f` 已完成并推送 ML-17，本轮不重复改写教程。
- 教程仍按五相展示 logical tensor `W` → `Shard(0)` placement → 各 rank 的 local shard → 同尺度训练状态对照 → 第 3 步 all-gather／第 6 步 `Replicate()`。第 4 步 FP32 `ReduceOp.AVG` 和其他步未改。
- 独立 explore 冷读复核为 **ML-17 PASS、R1–R5 10/10、机制 R6 2/2、非视觉原项 20/20、剩余内容洞 0**。小学生复述不变：「8 张 GPU 把每张权重表按行分开，各留一片，所以每卡保存的训练表从 64 GB 变成 8 GB。」pstack-reviewer 因配置模型不存在而未启动，未计为证据。
- `npm run build`：**60 页**通过。Step 2 readability、`deep-check 08`、`zh-check`、英中全章三宽度 mobile、中文 Step 2 字号门和 `git diff --check` 全过。默认 transcript 连续两次逐字一致并与 pinned 无差异：**1,883 词**，SHA-256 `53197a468c6545732b1c466b34534884cab8e5c514ebc113c0f8fdf1dee200a3`。
- 重跑 `.bot/out/ml08-step2-audit.mjs`：**40 个普通状态、32/32 个机制转变**，最低可见字体 **10.407 CSS px**，文字重叠和 SVG 出界均为 **0**；双语 deep 的展开、字段、KaTeX 和横向溢出检查通过。报告为 `.bot/out/ml08-step2-audit/report.json`。
- 当前模型不能读取 PNG，工具已明确返回 `Cannot read image`；本轮未声称看过图片或视觉通过，原 #4／#5、整章原十二项新总分和协调 verdict 不自行提分。ML-17 仍待协调固定复审后核销，其他开放 findings 保持不变。
- 本 clone 的 `node_modules` 又是指向协调人 checkout 的符号链接。已只删除本目录内的符号链接并执行本地 `npm install`，未写 `~/code/learning-sglang`。本轮 4321 dev server（pid 54600）已停止；`pgrep -P 1` 无父进程为 1 的 Chrome，其他 lane 的活跃浏览器未动。查看地址：`http://localhost:4321/learning-sglang/ml-sys/ch/08-fsdp2-training-backend/?step=2`。
- 未跑全站回归、真实 FSDP2 训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。主人与协调人的最终视觉和产品验收另计。

---

# lane k2 本轮报告 · ML Systems 08 Step 2 的 ML-17

日期：2026-11-27。类型：修旧。范围只有 ML Systems 第 8 章第 2 步、对应双语深入讲解和出处、生成 transcript、评分记录、验证材料及本报告。未改其他 ML 章、Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## 单元与修复

- 教程提交 `cebc7bd [k2] Show DTensor shards in ML 08 step 2` 已推 `origin/tutorials`。首次推送被拒后按要求 `git pull --rebase origin tutorials`，纳入 k1 的 `3e603b8`、`584f99d`，再推成功；未 force-push。direction 的 lane k2 单元未变。
- **ML-17 作者返工完成，待协调核销。** Step 2 以五相展示 logical tensor `W` → `Shard(0)` placement → 各 rank 的 local shard → 训练状态同尺度对照 → 后续聚合指引。末相用同一个「需要完整数值时拼回去」的指引连接第 3 步 all-gather 与第 6 步 `Replicate()`。
- 首轮独立冷读发现两个阻塞：单参数的一行分片与 rank 的 8 GB 整体训练状态混在一起，以及 DTensor 术语缺少舞台内白话。返工后，caption 改为「每个张量分片，每卡训练状态共 8 GB」，副标题就地解释 logical tensor／placement／local shard，`ALL SAVED TABLES` 单独标出整体账，`250 px = 512 GB` 的双柱恢复 512 GB 对 64 GB 同尺度比较。
- 双语 deep 与舞台同步，新增 pinned `fully_shard` 默认 dim-0 DTensor 依据；`Shard` 的 `torch.chunk(..., dim=0)` 语义和 slime 的 `redistribute(..., Replicate())` 导出路径均核到固定源码。第 4 步 `R/B` 预缩放与 FP32 `ReduceOp.AVG` 未改，其他步的 caption、事实和相位未改。

## 评分与冷读

- 独立 explore 复读：**ML-17 PASS、R1–R5 10/10、机制 R6 2/2、剩余阻塞 0**。小学生复述：「8 张 GPU 把每张权重表按行分开，各留一片，所以每卡保存的训练表从 64 GB 变成 8 GB。」
- 作者非视觉原项 **20/20**。原 #4／#5、整章原十二项新总分和协调 verdict 不自行提分。固定 `f358bbf` 的 ML 03–09 协调 GO 保持，ML-09／14 不回退；ML 01／02／13 的既有 GO 不变。
- transcript **1,883 词**。本章仍只覆盖 FSDP2 的指定机制，不扩成完整 FSDP1、allocator 或混合精度课程；本轮只补 ML-17，不用新增散文代替机制。

## 验证与证据

- 最终 `npm run build`：**60 页**通过。`BOOK=ml-sys ONLY=8` 的 transcript、英中三宽度 mobile 均通过；Step 2 readability 为 **0 机械问题**；中文 Step 2 字号门、`BOOK=ml-sys node scripts/deep-check.mjs 08`、`zh-check` 和 `git diff --check` 全过。
- 默认 transcript 连续两次逐字一致，SHA-256 `53197a468c6545732b1c466b34534884cab8e5c514ebc113c0f8fdf1dee200a3`。
- `.bot/out/ml08-step2-audit.mjs` 覆盖 **40 个普通状态**：英中桌面五相 10 个，英中 360／390／430 px 五相 30 个。counter／step／phase 身份全部正确，**32/32** 个相邻相位改变机制，文字重叠和 SVG 出界均为 **0**，最低可见字体 **10.407 CSS px**。报告为 `.bot/out/ml08-step2-audit/report.json`。
- 另存 **2 张双语 deep 图**，均确认 `aria-expanded=true`，包含 `Shard(0)` 与 `Replicate()`，无 KaTeX 错误、残留 `$$` 或横向溢出。代表终相图：`.bot/out/ml08-step2-audit/en-1440-s2-p4.png`。改前四张图在 `.bot/out/ml08-step2-before/`。
- 当前模型不能读 PNG，未声称已看图或视觉通过。独立结论来自源码、transcript、DOM 和几何证据，主人与协调人的最终视觉验收另计。

## 剩余与清理

- ML-17 等协调固定复审后核销；ML-16／18／20／23／25／26／27／29／31／32／33／34／35／36／37／38 等开放项不因本轮自动关闭。ML-11／12 继续等既定复审，不开第 14 章，第 11 章缺源时继续跳过。最新回归仍只有 `(exit 13)`，没有可分配布局步骤，未据此返工。
- 未跑全站回归、真实 FSDP2 训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。
- 本 clone 最初的 `node_modules` 符号链接指向协调人 checkout，构建会写共享 Vite cache。已只删除本目录内的符号链接并执行本地 `npm install`，后续依赖和 cache 均在本 clone，未写 `~/code/learning-sglang`。
- 本轮 4321 dev server 已停止。本轮审计 Chrome `31770` 已关闭并删除对应 `cdp-0w5pH7`；其他 lane 的 Chrome 未动，`pgrep -P 1` 无父进程为 1 的残留。查看章节可在本目录运行 `npx astro dev --background`，地址为 `http://localhost:4321/learning-sglang/ml-sys/ch/08-fsdp2-training-backend/?step=2`。

---

# lane k2 上一轮报告 · 继续等 ML Systems 固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、`.bot/memory/`、其他书或其他 lane 的章节。

- 本轮开始时 HEAD 与 `origin/tutorials` 均为 `e71ab01`，fetch 后仍一致。`direction.md` 和 `review.md` 仍是 23:10 版本，协调尚未核销最早的 k2 队列，等待安排不变。
- 按 direction 不开新单元，也不继续改待审的 ML-14、ML 03–07、ML 08 `a1fbf43`、ML 09 `f358bbf`、ML 10 `637c544`、ML 12 `9a08662`。本轮修复的 open review finding 为 **0**，所有开放项和协调 verdict 保持不变。
- 分数不变：ML 01 固定 `7887a2d` 保持 **70/70、14/14、168/168**；ML 02 固定 `c7d3d86` 保持 **60/60、12/12、144/144**；ML 13 定点返工保持 **80/80、160/160、192/192、机制 16/16**。不重做这三章，不开第 14 章。
- 最新回归仍基于 `02ef5d7`，失败行只有 `(exit 13)`，没有可分配的布局步骤。剩余顺序不变：先等协调核销最早队列，再按固定快照复审 ML 08／09／10／12；第 11 章缺原始来源时继续跳过。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k2] ` 记录提交推送。

---

# lane k2 上一轮报告 · 继续等 ML Systems 固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 和 `review.md` 仍是 23:10 版本，协调尚未核销最早的 k2 队列。本轮开始时 HEAD 为 `d1f8138`；fetch 后 `origin/tutorials` 到 `8e061b5`，新增的 `07dbb35`、`8e061b5` 只有 d 的 Voxt 11 证据与评分记录。已 fast-forward 同步，k2 的等待安排不变。
- 按 direction 不开新单元，也不继续改待审的 ML-14、ML 03–07、ML 08 `a1fbf43`、ML 09 `f358bbf`、ML 10 `637c544`、ML 12 `9a08662`。本轮修复的 open review finding 为 **0**，所有开放项和协调 verdict 保持不变。
- 分数不变：ML 01 固定 `7887a2d` 保持 **70/70、14/14、168/168**；ML 02 固定 `c7d3d86` 保持 **60/60、12/12、144/144**；ML 13 定点返工保持 **80/80、160/160、192/192、机制 16/16**。不重做这三章，不开第 14 章。
- 最新回归基于 `02ef5d7`，失败行只有 `(exit 13)`，没有可分配的布局步骤。剩余顺序不变：先等协调核销最早队列，再按固定快照复审 ML 08／09／10／12；第 11 章缺原始来源时继续跳过。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k2] ` 记录提交推送。

---

# lane k2 上一轮报告 · 继续等 ML Systems 固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 和 `review.md` 仍是 23:10 版本，协调尚未核销最早的 k2 队列。本轮开始时 HEAD 为 `a3eea7c`；fetch 后 `origin/tutorials` 到 `438b710`，新增内容只有 d 的报告和 Voxt 评分记录。已同步该提交，k2 的等待安排不变。
- 按 direction 不开新单元，也不继续改待审的 ML-14、ML 03–07、ML 08 `a1fbf43`、ML 09 `f358bbf`、ML 10 `637c544`、ML 12 `9a08662`。本轮修复的 open review finding 为 **0**，所有开放项和协调 verdict 保持不变。
- 分数不变：ML 01 固定 `7887a2d` 保持 **70/70、14/14、168/168**；ML 02 固定 `c7d3d86` 保持 **60/60、12/12、144/144**；ML 13 定点返工保持 **80/80、160/160、192/192、机制 16/16**。不重做这三章，不开第 14 章。
- 最新回归基于 `02ef5d7`，失败行只有 `(exit 13)`，没有可分配的布局步骤。剩余顺序不变：先等协调核销最早队列，再按固定快照复审 ML 08／09／10／12；第 11 章缺原始来源时继续跳过。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k2] ` 记录提交推送。

---

# lane k1 本轮报告 · Omni 11 机制与桌面字号返工

日期：2026-11-26。类型：修旧。范围只含 Learning SGLang Omni 第 11 章 `FishS2Pro.svelte`、生成 transcript、验证产物和本报告。未改 Omni 13／14、其他书、其他 lane 的章节、第 1 本受保护英文原文或 `.bot/memory/`。

## 处理的 open review 项

- **Omni-15 · 第 11 章机制 R6 1/16**：八步改为 `[6,4,3,11,5,4,3,4]` 个相位，逐步提交为 `b0aae47`、`949f8c0`、`86016c7`、`0884d95`、`adaae0b`、`e904d83`、`50297db`、`d8c7c4f`。相位不再只移动红框或响应式布局：
  1. `tts_engine` 逐批产生 10／20／30／40 帧，凑齐后 vocoder 开窗。
  2. 16,000 个输入采样点依次经过重采样、补位和 `[10,22]` code 矩阵。
  3. 目标文字和参考 codes 依次进入 Slow AR，随后出现第一帧的 code 0。
  4. Fast 第 0 次调用后，c1–c9 逐格出现；计数从 `1+0=1` 到 `1+9=10`，最后十行进入 vocoder。
  5. 十个 codes 反馈到下一帧，Slow KV 跨帧保留；旧 Fast KV 淡出，新的 0–9 内层 KV 出现。
  6. EOS、长度用尽、abort 三个出口依次展示各自保留或拦截的输出。
  7. 三个流式窗口依次出现，输入分别为 40／65／25 帧；灰色 512 尾巴经历留下、使用、释放。
  8. 完成的 A／B 先补成 `[2,10,90]`，再出现一次 vocoder 调用，最后分别裁回 90F／40F。
- **Omni-02 的第 11 章桌面小字部分**：`6b16377` 按舞台高度调整共享 footnote／loops 字号，并只提高 Step 7 的主小字。返工前全书审计已知 Step 7 最低 **7.402 CSS px**；返工后本章 40 个桌面相位最低 **10.506 CSS px**。这只核销第 11 章部分，其他章的 Omni-02 保持开放。
- caption、数字、双语深入讲解和章间问题未改，既有机制结论未改。第 5 步 cached-prefix 修复、第 7 步小窗口取舍和第 8 步 session 问题原样保留。Omni 13 文件未动，Omni 14 留到下一单元。

## 作者评分与小学生冷读

以下是主线程按 transcript、组件和逐相 DOM 得出的作者自评，不是协调 verdict。R1–R5 **80/80**、机制 R6 **16/16**、原十个非视觉项 **160/160**，新增内容洞 **0**。原 #4／#5、原十二项新总分和整章 GO／NO-GO 留给固定复审；当前模型无图像输入，不声称已读 PNG 或视觉通过。

| 步 | R1–R5 | 机制 R6 | 小学生复述 | 新洞 |
|---|---:|---:|---|---:|
| 1 | 10/10 | 2/2 | 攒齐 40 帧才打开首个声音窗口，每帧有十个 codes。 | 0 |
| 2 | 10/10 | 2/2 | 一秒参考声音变成 22 帧，每帧有十行 codes，不满的最后一帧要补位。 | 0 |
| 3 | 10/10 | 2/2 | Slow AR 读完文字和参考声音，为第一帧选出 code 0。 | 0 |
| 4 | 10/10 | 2/2 | Fast AR 先接收 Slow 的数，再九次各补一个 code，最后把十行交给 vocoder。 | 0 |
| 5 | 10/10 | 2/2 | 下一帧会拿回十个 codes；Slow 记住旧工作，Fast 清空后重来。 | 0 |
| 6 | 10/10 | 2/2 | EOS 和长度用尽保留已接受的声音，abort 拦下还没交付的声音。 | 0 |
| 7 | 10/10 | 2/2 | 三个窗口会重读旧帧，但旧声音不重复播放，512 个采样点最后才放出。 | 0 |
| 8 | 10/10 | 2/2 | B 的 40 帧先补到 A 的 90 帧，一起解码后再裁掉补的 50 帧。 | 0 |

## 验证

- 最终 `npm run build`：**60 页**通过。全章八步 `readability` 为 **0 机械问题**；`deep-check 11`、`zh-check`、英中全章 360／390／430 px `mobile`、中文逐步字号门和 `git diff --check` 全过。
- 默认 transcript 连续两次逐字一致并与 pinned 无差异：**2,144 词**，SHA-256 `fec68ad32da78557d31306fb9664b6a983991cc0a0a59da85a73059bbc28afa1`。八步均有本步机制，厚度达到 EVAL 对照原版同类章约 2,000 词的参考量级；没有靠新增散文替代机制。
- 可重跑脚本 `.bot/out/omni11-phase-audit.mjs` 覆盖 **40 个 1440×900 桌面相位**，并生成 **40 张 PNG** 和 `.bot/out/omni11-phase-audit/report.json`。每个相位的 step／phase／counter 身份均核对；排除红框和 LoopProgress 后，**32/32** 个步内相邻转变都改变机制签名。文字重叠、SVG 出界均为 **0**，最低可见字体 **10.506 CSS px**。
- 中文 Step 4／7／8 和英文 Step 7 深入讲解均为 `aria-expanded=true`，横向溢出、KaTeX 错误和残留 `$$` 均为 **0**。对应 PNG 在 `.bot/out/omni11/deep/`。代表舞台图为 `.bot/out/omni11/s7/verified-final.png`。
- 首次构建发现本 clone 的 `node_modules` 符号链接指向协调人 checkout，Vite 尝试写共享 cache 并报 EPERM。已只删除本目录内的符号链接并执行本地 `npm install`，后续依赖、cache、dev server 和构建均在本 clone，未写协调人的 checkout。多次推送被拒后均执行 `git pull --rebase origin tutorials` 再推，没有 force-push。

## 提交与剩余

- 八个步骤和一个桌面字号修复均已推 `origin/tutorials`，最新教程提交为 `6b16377`。本报告随后续 `[k1] ` 记录提交推送。
- Omni-15 的作者返工和本章硬门已完成，机制 **1/16 → 16/16（作者 DOM 自评）**；完整 EVAL、原十二项和协调 verdict 仍记 **coordinator-rereview-pending**，不自行写 `complete-under-EVAL`。
- 下一单元按 direction 处理 **Omni 14 桌面小字**，当前 Step 2 为 **7.59 CSS px**；本轮未改 Omni 14。其他 Omni 开放项不因本章返工自动关闭，不开第 16／17 章。
- 未跑全站回归、真实 Fish S2 Pro、SGLang-Omni 服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。
- 本地章节地址：`http://localhost:4466/learning-sglang/omni/ch/11-fish-s2-pro/?step=7`。前次回复误写了被其他 lane 占用的 4322，也遗漏了 23:26 启动的 4466 服务；跟进轮已停止该服务（pid 53098），并确认本目录不再监听端口。查看前在本目录运行 `npx astro dev --background --port 4466`。本轮浏览器均已关闭，归属不明的其他 CDP 进程未触碰。

---

# lane k2 本轮报告 · 继续等 ML Systems 固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 和 `review.md` 仍是 23:10 版本，协调尚未核销最早的 k2 队列。本轮开始时 HEAD 与 `origin/tutorials` 均为 `d8c7c4f`，fetch 后仍一致；新增提交只涉及其他 lane 的 Omni 11，不改变 k2 的等待安排。
- 按 direction 不开新单元，也不继续改待审的 ML-14、ML 03–07、ML 08 `a1fbf43`、ML 09 `f358bbf`、ML 10 `637c544`、ML 12 `9a08662`。本轮关闭的 review finding 为 **0**，所有开放项和协调 verdict 保持不变。
- ML 01 固定 `7887a2d` 保持 **70/70、14/14、168/168**；ML 02 固定 `c7d3d86` 保持 **60/60、12/12、144/144**；ML 13 定点返工保持 **80/80、160/160、192/192、机制 16/16**。不重做这三章，不开第 14 章。
- 最新回归仍基于旧 `a1fbf43`，失败行只有 `(exit 13)`，没有可分配的布局步骤。剩余顺序不变：先等协调核销最早队列，再按固定快照复审 ML 08／09／10／12；第 11 章缺原始来源时继续跳过。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k2] ` 记录提交推送。

---

# lane k2 上一轮报告 · 等 ML Systems 固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 要求先等协调核销最早的 k2 队列，再按固定快照复审 ML 08／09／10／12；写作线暂不开新单元。本轮开始时 HEAD 与 `origin/tutorials` 均为 `50297db`，fetch 后仍一致。待审提交包括 ML-14、ML 03–07、ML 08 `a1fbf43`、ML 09 `f358bbf`、ML 10 `637c544`、ML 12 `9a08662` 及记录提交，本轮不继续改动这些章节。
- 本轮关闭的 review finding 为 **0**，分数不变。ML 01 固定 `7887a2d` 保持 **70/70、14/14、168/168**；ML 02 固定 `c7d3d86` 保持 **60/60、12/12、144/144**；ML 13 定点返工保持 **80/80、160/160、192/192、机制 16/16**。不重做这三章，不开第 14 章。
- 最新回归基于旧 `a1fbf43`，失败行只有 `(exit 13)`，没有可分配的布局步骤；它不改变本轮等待安排。
- 剩余顺序不变：等协调核销最早队列，再按固定快照复审 ML 08／09／10／12；全部既有静态机制 P0 和 ML-14 通过后才排第 14 章，第 11 章缺原始来源时继续跳过。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实训练、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k2] ` 记录提交推送。

---

# lane k2 上一轮报告 · ML Systems 10、12 静态机制返工

日期：2026-11-26。类型：修旧。范围只含 ML Systems 第 10、12 章的组件、生成 transcript、评分卡、仓库 progress 和本报告；未动 Omni、Voxt、第 1 本受保护英文原文、其他 ML 章或 `.bot/memory/`。

## 处理的 open review 项

- **ML-11 · 10/1–9 静态 INT4 QAT**：`637c544 [k2] Animate ML 10 INT4 QAT lifecycle`。九步 `[3,5,4,4,5,5,5,5,3]` 个相位依次展示原始字节与 INT4、scale 与还原、fake round trip、STE、真实编码、4-bit 打包、Marlin 更新、W4A16 和单卡／八卡对照。作者 DOM 机制 **18/18**，协调内容 R1–R5 **90/90** 保持不变。
- **ML-12 · 12/1–8 静态 RL 投机解码**：`9a08662 [k2] Animate ML 12 draft training lifecycle`。八步 `[3,4,5,5,4,5,4,4]` 个相位依次展示 hidden state、token 左移与 embedding、二移标签、detach、mask 两次移位与相乘，以及公开吞吐和训练秒数。作者 DOM 机制 **16/16**，协调内容 R1–R5 **80/80** 保持不变。
- 两章 caption、双语深入讲解和既有数字未改；桌面只压缩纵向间距，保证逐相字号。ML-33、ML-18、ML-20 等独立内容项保持开放，章末 draft-pair 问题原样保留。本轮不重做 ML 01／02／13，不开第 14 章。

## 验证

- 两章 `build` 均为 **60 页**通过；全章 `readability`、`deep-check`、`zh-check`、英中三宽度 `mobile`、中文逐步字号门和 `git diff --check` 全过。默认 transcript 连续两次逐字一致：ML 10 **2,300 词**，SHA-256 `469b5da93999529e00e24ceb61c621e085da186680c303d118fe2b53112cdd62`；ML 12 **2,115 词**，SHA-256 `9b1ef58701ad68630fa39a4e8bedb10248d1b4595de8af939ee1f5f073ff9141`。
- 自定义逐相审计覆盖 **73 个桌面相位**：ML 10 **39**，ML 12 **34**。每步至少两个机制状态，逐相可见文本签名均变化，counter／step／phase 身份正确；文字重叠、SVG 出界均为 **0**，最低可见字体均为 **10.8425625 CSS px**。
- 证据目录：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-w32gl41i/opencode/ml10-phases/` 与 `ml12-phases/`。代表图：`ml10-phases/s6-p4.png`、`ml12-phases/s6-p4.png`。当前模型无图像输入，未声称已读 PNG 或视觉通过。
- 独立 explore 冷读核对两章 transcript、组件、深入讲解对应机制和 73 条相位记录，未发现新阻塞；只覆盖文本、源码和 DOM 证据。配置的 pstack-reviewer 因模型不存在未启动，未计为证据。
- 首次 `npm run build` 因符号链接依赖的共享 Vite cache 报 EPERM；随后使用忽略的 `.astro/k2.config.mjs` 把缓存放入本 clone，并只读允许符号链接依赖，未写协调人的 checkout。两次推送被拒后均按要求 `git pull --rebase origin tutorials` 再推，未 force-push。

## 剩余

- ML-11／12 的作者返工和硬门已完成，完整 EVAL、原十二项总分和协调 verdict 仍待固定复审，不记 `complete-under-EVAL`。ML 08／09 等前轮返工同样待复审。
- 全部既有静态机制 P0 与 ML-14 经协调通过后才开第 14 章。未跑全站回归、真实训练、rollout、Marlin GPU、GPU benchmark、故障注入或 reduced-motion 动态切换；主人最终视觉与产品验收另计。
- 本地检查地址为 `http://localhost:4321/learning-sglang/ml-sys/ch/12-rl-speculative-decoding/?step=6`。本轮 4321 dev server 和浏览器已关闭，无父进程为 1 的本轮 Chrome 残留；查看前在本目录运行 `npx astro dev --background`。

---

# lane d 本轮报告 · Voxt 11 Step 1 最小单元核验（无新代码）

日期：2026-11-26。范围只有本报告；未改教程、评分卡、progress、`.bot/memory/`、其他书或其他 lane 的章节，未进入也未写 `~/code/learning-sglang`。

## 单元状态

- direction 的 lane d 单元：从 `ls-d-1126-163623` 旧草稿移植 **Voxt 11 Step 1** 相关 hunks 并跑 `ONLY=11 STEP=1` 门。核对结果：Step 1 的全部旧草稿功能 hunks 已在 `origin/tutorials` 上——`971535b`（4 相位移植）、`dac183d`（手机 loops 抬起）、`f97c179`（红框窄框避字）。`git diff --no-index`（旧草稿 → HEAD）显示：旧草稿待移植的功能 hunks 只剩 Step 2–5（`PHASE_COUNTS` 2–5 步、逐行校验打勾、停止请求与退出拆相、update 流程显形），按 direction 留给后续轮，本轮未移植；HEAD 另有旧草稿没有的 Step 1 复审几何修正（当前文件 `:101-109` 窄红框、`:175-181` 桌面 bullet／公式 y、`:216-217` 手机公式 y、`:556` 手机 loops 抬起）；旧草稿还有 Step 6 桌面高度 560→520（`:78`），超出 Step 1 最小单元，按 direction 不移植。
- 旧草稿 transcript 与 HEAD 的 diff 只涉及 Step 3、4、5 的文字（下载完成与校验打勾、停止请求／进程退出、重启后 helper）；Step 1 逐字相同，Step 2 文字也相同（差异只在组件相位）。HEAD 的评分卡和 progress 已按 direction 只写第 1 步实际结果（机制栏同步协调 `c3a7773` 的 7/12，逐步 1、1、1、1、1、2，不自行提分），不需要旧报告覆盖。旧草稿 5 个未提交文件原树未动，只读 diff。
- 本轮无教程改动，只有核验和本报告。

## 验证（本 clone，端口 4399）

- `npm run build -- --config .astro/local.config.mjs`：60 页通过。本地配置只把 Vite 缓存放进本 clone 并允许读取符号链接依赖；`node_modules` 是指向协调人 checkout 的只读符号链接，未写。
- `BOOK=voxt ONLY=11 node scripts/transcript.mjs …:4399`：6 步，无 caption／出界／重叠／脚注告警；重生成与已提交 transcript **无 diff**。
- `BOOK=voxt ONLY=11 STEP=1 npm run readability`：0 机械问题。`BOOK=voxt node scripts/deep-check.mjs 11`：ok。`BASE=…:4399 BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：all clear。
- `BOOK=voxt ONLY=11 STEP=1`（英文）和 `LANG=zh`（中文）`mobile`：360／390／430 px 均 no layout breaks。
- 逐相审计 `.bot/out/voxt11-step1-audit.mjs`（可重跑，证据在 `.bot/out/voxt11-step1-audit/`）：英／中 × 桌面 1440×900／360／390／430 × 4 相共 **32 个视图**，相位身份由 `data-animation-phase` 轮询确认，红框过渡 320 ms 后读数。文字重叠、SVG 出界、红框描边带压字均为 **0**；最低可见字体 **10.76 CSS px**（桌面英文最低 11.50）。32 张 PNG 已保存。
- 逐相文字 diff 确认每相只变一个对象：p0→p1 只变模型卡两行（`0 B`/`0 files` → `2.47 GB`/`9 files`）；p1→p2 只出现加法式 `2,463,307,541 B + 4,548,962 B = 2,467,856,503 B`；p2→p3 只把副标题换成 `÷ 280,000,000 ≈ 8.8×`。中文视图同构。
- 当前模型无图像输入，已确认不能读 PNG，未声称已看图或视觉通过；以上为 DOM 与几何证据。

## 剩余

- 等协调复审读 Step 1 四相证据并重评该步机制分；通过后按 direction 以同样方式逐个做第 2–5 步（每步一个最小单元），再 Voxt 10，最后 `12-meeting-capture-modes`。
- `state/pause-d` 真实文件在 bot 主目录，按路径映射不在本目录操作，本轮未动。
- 未跑全站回归、真实 Voxt、模型下载、更新或模型进程；主人最终验收另计。本轮 4399 dev server 与浏览器已在收尾关闭。

---

# lane k1 本轮报告 · Omni 13 仍等固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、progress、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 仍要求先等 Step 9／10 冷读固定复审，不继续扩大改动。本轮开始时 `02ef5d7` 与 `origin/tutorials` 同步，已确认包含待复审的 `610caa7`、`634500a`、`e01eda4` 和 `147a500`；本轮不重复改写或重跑已有硬门。
- 协调固定 `c7d3d86` 的分数保持：R1–R5 **97/100**、机制 R6 **20/20**、R1–R6 **117/120**、原十个非视觉项 **198/200**、原 #4/#5 **40/40**、原十二项 **238/240**。Step 9 信息密度及 Step 10 决策范围／中文冷读仍未由协调关闭，本轮没有修复记录或作者提分。
- 本轮关闭的 review finding 为 **0**。Omni-01／30／36／39／41／42／43／44 保持关闭，不重做。最新回归基于旧 `540bd0d`，失败行只有两条 `(exit 13)`，没有可分配的布局步骤。
- 剩余顺序不变：Omni 13 最新树通过协调复审后，依次处理 Omni 11 除 Step 7 tail 外的机制和 Omni 14 小字；不开第 16／17 章。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实模型、服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k1] ` 记录提交推送。

---

# lane k1 上一轮报告 · Omni 13 继续等固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、progress、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 仍要求先等 Step 9／10 冷读固定复审，不继续扩大改动。本轮开始时 `5523631` 与 `origin/tutorials` 同步，已确认包含待复审的 `610caa7`、`634500a`、`e01eda4` 和 `147a500`；本轮不重复改写或重跑已有硬门。
- 协调固定 `c7d3d86` 的分数保持：R1–R5 **97/100**、机制 R6 **20/20**、R1–R6 **117/120**、原十个非视觉项 **198/200**、原 #4/#5 **40/40**、原十二项 **238/240**。Step 9 信息密度及 Step 10 决策范围／中文冷读仍未由协调关闭，本轮没有修复记录或作者提分。
- 本轮关闭的 review finding 为 **0**。Omni-01／30／36／39／41／42／43／44 保持关闭，不重做。最新回归基于旧 `540bd0d`，失败行只有两条 `(exit 13)`，没有可分配的布局步骤。
- 剩余顺序不变：Omni 13 最新树通过协调复审后，依次处理 Omni 11 除 Step 7 tail 外的机制和 Omni 14 小字；不开第 16／17 章。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实模型、服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k1] ` 记录提交推送。

---

# lane k1 上一轮报告 · Omni 13 仍等固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、progress、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 仍要求先等 Step 9／10 冷读固定复审，不继续扩大改动。本轮开始时 `dac183d` 与 `origin/tutorials` 同步，已确认包含待复审的 `610caa7`、`634500a`、`e01eda4` 和 `147a500`；本轮不重复改写或重跑已有硬门。
- 协调固定 `c7d3d86` 的分数保持：R1–R5 **97/100**、机制 R6 **20/20**、R1–R6 **117/120**、原十个非视觉项 **198/200**、原 #4/#5 **40/40**、原十二项 **238/240**。Step 9 信息密度及 Step 10 决策范围／中文冷读仍未由协调关闭，本轮没有修复记录或作者提分。
- 本轮关闭的 review finding 为 **0**。Omni-01／30／36／39／41／42／43／44 保持关闭，不重做。最新回归基于旧 `540bd0d`，失败行只有两条 `(exit 13)`，没有可分配的布局步骤。
- 剩余顺序不变：Omni 13 最新树通过协调复审后，依次处理 Omni 11 除 Step 7 tail 外的机制和 Omni 14 小字；不开第 16／17 章。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实模型、服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k1] ` 记录提交推送。

---

# lane k1 上一轮报告 · Omni 13 继续等待固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、progress、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 仍要求先等 Step 9／10 冷读固定复审，不继续扩大改动。本轮开始时 `a1fbf43` 与 `origin/tutorials` 同步，已包含待复审的 `610caa7`、`634500a`、`e01eda4` 和 `147a500`；本轮不重复改写或重跑已有硬门。
- 协调固定 `c7d3d86` 的分数保持：R1–R5 **97/100**、机制 R6 **20/20**、R1–R6 **117/120**、原十个非视觉项 **198/200**、原 #4/#5 **40/40**、原十二项 **238/240**。Step 9 信息密度及 Step 10 决策范围／中文冷读仍未由协调关闭，本轮没有修复记录或作者提分。
- 最新回归基于旧 `540bd0d`，失败行只有两条 `(exit 13)`，没有可分配的布局步骤。Omni-01／30／36／39／41／42／43／44 保持关闭，不重做。
- 剩余顺序不变：Omni 13 最新树通过协调复审后，依次处理 Omni 11 除 Step 7 tail 外的机制和 Omni 14 小字；不开第 16／17 章。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实模型、服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k1] ` 记录提交推送。

---

# lane k1 上一轮报告 · 继续等 Omni 13 固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、progress、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 仍要求先等 Step 9／10 冷读固定复审，不继续扩大改动。当前 `ecda234` 与 `origin/tutorials` 同步，包含待复审的 `610caa7`、`634500a`、`e01eda4` 和 `147a500`；本轮不重复改写或重跑已有硬门。
- 协调固定 `c7d3d86` 的分数保持：R1–R5 **97/100**、机制 R6 **20/20**、R1–R6 **117/120**、原十个非视觉项 **198/200**、原 #4/#5 **40/40**、原十二项 **238/240**。Step 9 信息密度及 Step 10 决策范围／中文冷读仍未由协调关闭，作者自评不覆盖该 verdict。
- 最新回归基于旧 `efcb858`，虽标「有失败」，失败行只有 `(exit 0)`，没有可分配的布局步骤。Omni-01／30／36／39／41／42／43／44 保持关闭，不重做。
- 剩余顺序不变：Omni 13 最新树通过协调复审后，依次处理 Omni 11 除 Step 7 tail 外的机制和 Omni 14 小字；不开第 16／17 章。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑教程门、全站回归、真实模型、服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。本条随 `[k1] ` 记录提交推送。

---

# lane k1 上一轮报告 · Omni 15 九步协调 GO 同步

日期：2026-11-26。范围只有第 15 章评分卡、`memory/progress.md` 第 15 章行和本报告；未改教程、`.bot/memory/`、其他书或其他 lane 的章节。

- 评分卡和 progress 同步固定 `ce5224f` 最新九步树的协调 EVAL **GO**：R1–R5 **90/90**、原十个非视觉项 **180/180**、静态 R6 **18/18**、R1–R5＋静态 R6 **108/108**、原 #4/#5 **36/36**、原十二项 **216/216**、机制 R6 **18/18**、未决内容洞 **0**。
- 九步逐步均为 R1–R5 **10/10**、机制 **2/2**、原十二项 **24/24**。Omni-04／19／29 和 Omni-02 的第 15 章部分关闭，不重做本章；主人最终视觉与真实产品验收另计。
- 原八步 **80/80、160/160、192/192、机制 16/16** 保留为历史基线。这是记录同步，未跑教程门、未启动 dev server 或浏览器；本条记录随另一条 `[k1] ` 英文提交推送。

---

# lane k1 本轮报告 · Omni 13 协调基线同步

日期：2026-11-26。范围只有第 13 章评分卡、`memory/progress.md` 第 13 章行和本报告；未改教程、`.bot/memory/`、其他书或其他 lane 的章节。

- 评分卡新增固定 `c7d3d86` 的协调完整 EVAL **NO-GO** 基线：R1–R5 **97/100**、机制 R6 **20/20**、R1–R6 **117/120**、原十个非视觉项 **198/200**、原 #4/#5 **40/40**、原十二项 **238/240**。旧 `03cb6cb` 八步基线保留为历史。
- Step 9 信息密度及 Step 10 决策范围／中文冷读仍是协调扣分项。后续作者返工只待固定复审，不自行销项，不记 `complete-under-EVAL`。
- 这是记录同步，未跑教程门、未启动 dev server 或浏览器；本条记录随 `[k1] ` 英文提交推送。

---

# lane k1 上一轮报告 · 等 Omni 13 固定复审

日期：2026-11-26。类型：修旧等待。范围只有本报告；未改教程、评分卡、progress、`.bot/memory/`、其他书或其他 lane 的章节。

- `direction.md` 要求先等 Step 9／10 冷读固定复审，不继续扩大改动。当前 `ce93c39` 已包含上一轮 `e01eda4` 的 Step 9 收窄、`147a500` 的 Step 10 解释和 `ce93c39` 的记录，且与 `origin/tutorials` 同步；本轮不重复改写或重跑已有硬门。
- 协调固定 `c7d3d86` 的分数保持：R1–R5 **97/100**、机制 R6 **20/20**、R1–R6 **117/120**、原十个非视觉项 **198/200**、原 #4/#5 **40/40**、原十二项 **238/240**。上一轮的作者 **100/100、20/20、200/200、0 洞**仍是待复审自评，不覆盖协调 verdict，也不自行关闭 open review 项。
- Omni-01／30／36／39／41／42／43／44 保持关闭，不重做。剩余是 Step 9 信息密度及 Step 10 决策范围／中文冷读的固定复审；协调通过最新 Omni 13 后，才依次处理 Omni 11 除 Step 7 tail 外的机制和 Omni 14 小字。不开第 16／17 章。
- 本轮未启动 dev server 或浏览器，未新增截图，未跑全站回归、真实模型、服务、GPU benchmark、音频质量、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。
- 本条随 `[k1] ` 记录提交推送；没有教程提交。

---

# lane k1 上一轮报告 · Omni 13 Step 9／10 冷读返工

日期：2026-11-26。类型：修旧。范围只含 Learning SGLang Omni 第 13 章 Step 9／10、对应双语深入讲解、生成 transcript、验证产物和本报告。未改其他步、其他书、其他 lane 的章节、第 1 本受保护英文原文或 `.bot/memory/`。progress 和评分卡按本轮要求只记录在下方。

## open review 项处理

- **Step 9 信息密度**：`e01eda4` 把舞台主线收窄为“先确认能跑，再测快慢”。`config resolve`、`c=1,16` 的十运行算式、p99 和其他记录移到深入讲解的图外过程。readiness 只保留一个小请求和“收到响应不等于快”；A/B 直接画同样的请求进入 A、B，只改一项。客户端仍记首音和总耗时，听者仍记卡顿，`10 × 80 = 800 ms` 的未就绪→就绪动画保留。
- **Step 10 决策范围与中文冷读**：`147a500` 保持前两轮已收窄的两卡、只比精度方案，不扩大决策。舞台上直接解释 `c = 8 路同时请求`、`TP1 = 一个 thinker 进程` 和中位数；用第 6 步已有的“BF16／FP8 权重”替换 checkpoint 术语，用第 3 步已有的 p90 替换“自定义 p90”术语。实际 checkpoint 选择和 p90 算法留在图外边界。
- Omni-01／30／36／39／41／42／43／44 保持关闭，没有重做。Omni 11 和 Omni 14 等 Omni 13 协调通过后再修，本轮未碰。

## 协调基线与作者评分

- 协调固定 `c7d3d86` 的基线原样保留：R1–R5 **97/100**、机制 R6 **20/20**、R1–R6 **117/120**、原十个非视觉项 **198/200**、原 #4/#5 **40/40**、原十二项 **238/240**。
- 当前主线程作者冷读建议：R1–R5 **100/100**、机制 R6 **20/20**、R1–R6 **120/120**、原十个非视觉项 **200/200**、未决内容洞 **0**。这些只表示本 snapshot 待复审的作者评分，不覆盖协调 verdict，也不自行销项。

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | 小学生复述 | 洞 |
|---|---:|---:|---:|---|---:|
| 9 | 10/10 | 2/2 | 20/20 | 先用一个小请求确认能跑完，再让 A、B 处理同样请求并只改一项；客户端看耗时，听者看卡顿。 | 0 |
| 10 | 10/10 | 2/2 | 20/20 | 两边用同样的卡和 8 路请求，只改权重精度，记录首音和其他结果后再选。 | 0 |

- 原 #4/#5、原十二项新总分、整章 GO／NO-GO 和主人最终视觉验收留给协调复审。当前模型不支持图像输入，未声称已读 PNG 或视觉通过。

## 验证

- 最终教程树 `npm run build`：**60 页**通过。全章十步 `readability` 为 **0 机械问题**；英中全章 360／390／430 px `mobile`、中文 Step 9／10 字号门、`deep-check 13`、`zh-check` 和 `git diff --check` 全过。
- 默认 transcript 连续两次逐字一致并与 pinned 无差异：**3419 词**，SHA-256 `0c97c88f5c600af5b0bc9aedd1ad23e97c30731da2980e83e60b616eb02438c6`。比协调固定快照的 **3484 词**少 **65 词**，没有靠加字关闭冷读项。十步无 caption、出界、重叠或脚注告警。
- `.bot/out/omni13-phase-audit.mjs` 可重跑相位审计。`.bot/out/omni13-phase-audit/report.json` 覆盖 **13 个桌面机制状态 + 4 个双语 deep 状态**，失败为 **0**。普通状态的 counter、step、phase、SVG 出界、文字重叠均通过，最低可见字体 **10.329503676470589 CSS px**。deep 均为 `aria-expanded=true`，横向溢出、KaTeX 错误和残留 `$$` 均为 **0**。
- Step 9 的相位证据依次为：8 token 上限出现、A/B 同请求框出现、两类记录出现、chunk 2 未就绪、chunk 2 就绪。Step 10 的七个相位依次揭示固定路线、摆卡、容量、精度、首音、其他记录和决策规则。目录保存 **17 张 PNG**；代表图是 `.bot/out/omni13-phase-audit/s9-p5.png` 和 `.bot/out/omni13-phase-audit/s10-p6.png`。
- 两次独立只读评审都因配置模型 `qweneval/qwen-latest-series-invite-1102#high` 不存在而未启动，未计为证据。主线程按当前 transcript、双语 deep 和相位 DOM 完成冷读，没有把 `deep-check ok` 当作语义通过。
- 本轮检查地址为 `http://localhost:4322/learning-sglang/omni/ch/13-qwen3-omni-deployment/?step=10`。4322 dev server 已停止；本轮浏览器均已关闭。另有两个启动更早、父进程不为 1 的 Chrome 进程，未触碰。

## 提交与剩余

- `e01eda4 [k1] Simplify Omni 13 evidence sequence`：收窄 Step 9 的健康检查与 A/B 主线。首次推送被拒后已执行 `git pull --rebase origin tutorials`，带入 k2 的 `331e391` 后推送成功，没有 force-push。
- `147a500 [k1] Clarify Omni 13 precision comparison`：解释 Step 10 的符号并收窄术语，已推 `origin/tutorials`。本报告随后续 `[k1] ` 记录提交推送。
- 当前进度：Step 9／10 作者返工和硬门完成，完整 EVAL 仍记 **NO-GO / coordinator-rereview-pending**。等协调确认两步冷读和视觉项后，再按 direction 处理 Omni 11、Omni 14，不开新章。
- 未跑全站回归、真实模型、服务、GPU benchmark、音频质量评测、故障注入或 reduced-motion 动态切换。代码出处仍固定到 `sglang-omni origin/main@9725235249df851281d4dc62a04b2d34b02ac0fe`。

---

# lane k2 本轮报告 · ML Systems 13 定点返工

日期：2026-11-26。范围只含 ML Systems 第 13 章、共享 transcript 采集器、评分卡、进度和本报告；未动 Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## 修复的 open review 项

- `796c714 [k2] Restore ML 13 training field exclusions`：第 4 步舞台、ARIA 和双语深入讲解恢复 `D0`／`D1` 对 `input_ids`、`attention_mask` 的排除，并说明第 3 步已把 `O` 单独存入 token 记录。已对照 pinned slime 的两处过滤实现。
- `c8fb266 [k2] Stabilize ML 13 transcript phase capture`：默认采集会等待 URL 指定步的末相位，不再在 3.4 秒提前读取，也不会把 Step 1 的末相位编号用于其他步。无 data 属性的章节保持原固定等待。
- 评分卡和 `memory/progress.md` 已撤回错误的 **80/80、160/160、0 洞**。保留协调基线 **79/80、159/160、191/192、机制 16/16、1 个内容洞**，本轮返工待协调复审，不记 `complete-under-EVAL`。
- 第 4 步的 `input_ids`／`attention_mask` 目前只在深入讲解中解释；舞台 R3 和易读分留给协调重评，继续保留 **19/20、1 洞**，不自行提分。

## 验证

- 修复前默认采集复现 **1744 vs 1793 words**，漏第 7／8 步末相位文字。修复后默认重生成两次及 `WAIT=1` 重生成均与 pinned **1808 words** 逐字一致；新增 15 词来自第 4 步边界说明。ML 12 默认重生成无差异。
- `npm run build -- --config .astro/k2.config.mjs`：60 页通过。忽略的本地配置只隔离 Vite cache 并允许符号链接依赖。
- 本章默认 `transcript`、8 步 `readability`、英文全章及中文全章 `mobile`、中文第 4 步字号门、`deep-check 13`、`zh-check`、`git diff --check` 全过。
- 英中第 4 步深入讲解 DOM 均含两处排除字段和第 3 步 token 记录，横向溢出为 0，无 KaTeX 错误或残留 `$$`。
- 截图在 `.bot/out/ml13-rework/`，代表图 `s4-en.png`、`s4-zh-phone.png`。当前模型不能读取 PNG，未声称视觉验收通过。

## 提交与剩余

- 两个教程提交均已推 `origin/tutorials`；第一次推送被拒后按要求 `git pull --rebase origin tutorials` 再推，没有 force-push。评分卡、progress 和本报告随最后一条 `[k2] ` 记录提交推送。
- `2d53845 [k2] Restore lane k1 report section`：恢复 `fbb434a` 误删的 lane k1 报告块，保留当前 k2 和 d 记录；`.bot/memory` 未改。
- 等协调复审第 4 步内容、默认 transcript 和记录；主人最终视觉验收另计。复审前不开第 14 章，继续跳过缺原始来源的第 11 章。
- 未跑全站回归、真实训练、rollout、工具调用、VLM、GPU benchmark、质量评测或 reduced-motion 动态切换。

---

# lane d 本轮报告 · Inside Voxt 08 返工

日期：2026-11-26。范围只含 Inside Voxt 第 8 章 `personal-dictionary` 的组件、双语深入讲解、生成 transcript、评分卡、进度和本报告；未动 Omni、ML Systems、第 1 本受保护英文原文或 `.bot/memory/`。

## 修掉的 review 项

协调 `983469c` 仍判 NO-GO 的机制与舞台事实：

- 第 1 步：原识别框不再被替换结果覆盖。识别框固定显示 `call Preeya.`，另加独立「替换后」框在第三相显示 `call Priya.`；高亮依次指向识别框、词典行、替换框。关闭原 #10 的舞台事实扣分（待复审）。
- 第 5 步：右面板并排显示例 A（输入 `call Priya.`）和例 B（输入 `call Sam.`）。每个例子各有带标签的「组装」框，只放 input 和 candidates；另有单独的「user · 消息」框，只在术语表非空时放 `<glossary>`，再放输入。例 A 有 glossary，例 B 只有 `call Sam.`。底部候选规则恢复「文字点名词条本身或它的任一别名 → 那个词条成为候选」，桌面与手机同步，不再只写在 ARIA 或深入讲解；每相只推进 A 的「无候选→候选→术语表」。
- 第 2 步：四个去处的 payload 改为累积；文字稿写 `replace: Preeya → Priya`，不再写 `sent:`。
- 第 3 步：第二条提示和 `2 hints` 出现时，聚焦回到正在变化的语音模型框。
- 第 7 步：`solved = phase >= i`，每相只让当前行出现标记，末相不再一次补两行。
- 第 4 步手机：补回 `language-model cleanup` 执行者标签。
- 组件补上缺失的 `.detail { font-size: 11px }`，修掉第 5 步 `system` 与通用规则重叠。

## 分数

按协调 `983469c` 同步，不沿用作者或 `baff867` 旧分：

- R1–R5 **70/70**；原十个非视觉项 **138/140**（第 1、5 步各 19/20）；静态 R6 **14/14**；原 #4/#5 **28/28**；原十二项 **166/168**；机制 R6 **9/14**，逐步 **1、1、1、2、1、2、1**。
- 本轮修复待复审，不自行改总分，不记 12/12、24/24 或 `complete-under-EVAL`。

## 验证

- `npx astro --config .astro/local.config.mjs build`：60 页通过。`node_modules` 是指向主 checkout 的符号链接，本地配置只隔离 Vite cache 并允许该路径。
- `BOOK=voxt ONLY=8 npm run transcript -- http://localhost:4379/learning-sglang`：7 步，无 caption／出界／重叠／脚注告警；生成 transcript 已提交。共享 CDP 9334 被另一运行占用，临时用 `CDP_PORT` 派生端口，运行后已还原 `scripts/transcript.mjs`。
- `BOOK=voxt ONLY=8 npm run readability`：7/7，0 机械问题。`BOOK=voxt node scripts/deep-check.mjs 8`、`BASE=http://localhost:4379/learning-sglang BOOK=voxt ONLY=8 node scripts/zh-check.mjs`：通过。
- 英中全章 `mobile`（360/390/430）无布局断裂；中文第 1／2／3／4／5／7 步逐步字号门通过。
- 截图在 `.bot/out/voxt08-shot2/`（英文桌面第 5 步两个相位、中文手机第 5 步；上一轮其余步的图在 `.bot/out/voxt08-shot/`）。当前模型不能读 PNG，未把这些图记成已读视觉证据。

## 提交

- 教程与 transcript：一条 `[d]` 提交。
- 评分卡、progress 和本报告：随记录提交。
- 全部推 `origin/tutorials`；被拒时 `git pull --rebase origin tutorials` 后重推，不 force-push。

## 剩余

- 等协调人复审第 1、2、3、5、7 步的新相位图和两处舞台事实；复审通过后才做 Voxt 11，再 10，最后 `12-meeting-capture-modes`。
- 未跑全站回归、真实 Voxt、模型或语音服务；主人最终验收另计。

## 复审后跟进（同日）

- 复审指出第 5 步仍把 input、candidates、glossary 和最终消息混在同一个 rect 里，没有可见的 compose／user 分区；可见候选规则也漏了别名。本轮把每个例子拆成带标签的「组装」框（input＋candidates）和单独的「user · 消息」框（非空术语表＋输入）；底部候选规则恢复「文字点名词条本身或它的任一别名 → 那个词条成为候选」。双语深入讲解、ARIA 和 transcript 同步。
- 重跑 60 页 build、本章 transcript、readability、deep-check、zh-check、英中全章 mobile 和中文第 5 步字号门，均通过。截图在 `.bot/out/voxt08-shot2/`。按复审要求，这次只有第 5 步一个 `[d]` 教程提交，另加一条记录提交。

---

# lane d 本轮报告 · Voxt 08 桌面字号 P0

日期：2026-11-26。按 `memory/direction.md` 的 lane d 顺序，只处理 Voxt 08 的返工项；没有碰 Omni、ML Systems、第 1 本受保护英文原文或 `.bot/memory/`。

## 处理的 review 项

- 关闭 `review.md`「动画与舞台事实修复复审：Voxt 08 `f88585f…90ea3e9`」的 **P0 · 桌面字号**：1440×900 下第 5 步最低 8.19 CSS px、第 7 步 9.65 CSS px。
- 第 5 步桌面舞台 `H` 由 660 改为 520，压缩重排左栏 system／user、右栏例 A／例 B 的组装框、候选行、user 消息框和底部候选规则；第 7 步 `H` 由 560 改为 520，四行结果卡、说明行和 `recording → history` 框上移。两处同步更新桌面 `motionFrames`，未整体缩放 viewBox。手机布局不变。
- 评分卡与 progress 同步协调 `90ea3e9` 的分数，并保留「待复审前 NO-GO」；修的是上述 P0，不重开已关闭的第 1、2、3、5、7 步机制与舞台事实项。

## 分数

- 协调 `90ea3e9` 内容／机制分：R1–R5 **70/70**、原十个非视觉项 **140/140**、静态 R6 **14/14**、原 #4/#5 **28/28**、原十二项 **168/168**、机制 R6 **14/14**（七步各 2/2）。
- 桌面字号门（本轮修复后、待复审）：1440×900 下第 5、7 步最低均 **10.39 CSS px**；其余五步不变。
- 复审确认前完整 EVAL 仍记 **NO-GO**，不记 `complete-under-EVAL`。

## 验证

- 独立 dev server 端口 **4399**：本 clone 原 `node_modules` 指向协调人 checkout，Vite 写 cache 报 EPERM；改为本 clone 自己的 `node_modules` 后启动，未连接协调人的 4321 服务。
- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=8 node scripts/transcript.mjs http://localhost:4399/learning-sglang`：7 步，无重叠／出界／脚注告警；生成无差异。
- `BOOK=voxt ONLY=8 STEP=5`、`STEP=7` 的 `readability`：均 ok，0 机械问题。
- `BOOK=voxt node scripts/deep-check.mjs 08`：ok。`BASE=http://localhost:4399/learning-sglang BOOK=voxt ONLY=8 node scripts/zh-check.mjs`：all clear。
- 英中全章 `mobile`（360/390/430）无布局断裂；英中第 5、7 步逐步字号 `mobile` 均无问题。
- 桌面 1440×900 逐相采样：英中第 5、7 步无文字重叠、无出界。相位图存 `.bot/out/lane-d/voxt08-fontfix/`（英文第 5 步 4 时点、第 7 步 4 时点，中文各 1 张）。当前模型不能读 PNG，未记成已读视觉证据。

## 提交

- 教程源码、评分卡和 progress：教程提交 `bb70918`，推 `origin/tutorials`；本报告：记录提交 `b233fbe`，两笔分开。

## 剩余

- 等复审读第 5、7 步桌面相位图并确认字号门；通过后才继续 Voxt 11 前五步逐相返工，再 Voxt 10，最后 `12-meeting-capture-modes`。
- 未跑全站回归、真实 Voxt、模型或语音服务；主人最终验收另计。

---

# lane k2 本轮报告 · ML Systems 01 静态机制返工

日期：2026-11-26。范围只含 ML Systems 第 1 章、其双语深入讲解与数字、生成 transcript、评分卡、仓库 progress 和本报告。已按 direction 只移植旧树的六个本章文件，未改 Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## 修掉的 open review 项

- **ML-02 · 01/1–7 静态时间测量**：`5f5aa56 [k2] Animate ML 01 measurement comparisons` 为七步加入 `[3,5,5,6,6,5,12]` 个相位。TTFT、ITL、TPOT、E2E 推进同一个 `stream: true` 构造请求和客户端 SSE delta 时钟；P50／P99 推进同一两批请求的排序与取位；吞吐推进同一 0–25 s 时钟上的完成数。修正旧草稿 Step 2／3 新 token 已出现而时钟仍停在前一 token 的错误，并用逐相断言核对 token、间隔和时钟。
- **ML-15 · 01/5–7 缺同尺度 A/B**：新增 B 的构造分布 `50×250 + 49×400 + 1×2000`。P50／P99 两批共用 0–2000 ms；吞吐两批共用 0–25 s，A 在 20 s 完成，B 在 25 s 完成，分别得到 5 和 4 requests/s。补齐测试起点、请求重叠和均匀填格只是平均速率简化的边界。
- **ML-24 · 01 手机 SVG overflow**：缩短手机标题、脚注和图例，修复 Step 4 `loops` 与标题相碰。最终英中 360／390／430 px 共 42 个末相视图的文字出界、文字重叠和 <10 CSS px 均为 0；默认英中全章 mobile 也均为 `no layout breaks`。
- 首轮独立冷读发现的缩写未展开、SSE delta 与 token 的关系、完成边界、arrival／completion 混用、测试起点和请求重叠问题均已返工。终审为文本 GO、机制 GO，0 未决内容洞。

## 当前作者分数与厚度边界

- R1–R5 **70/70**、机制 R6 **14/14**、原十个非视觉项 **140/140**、0 未决内容洞。原 #4/#5 和原十二项总分待图像评审，不记 `complete-under-EVAL`，也不覆盖协调 verdict。
- transcript 为 **1,317 词**。本章只定义核心指标并演示同刻度构造例；请求集、预热、token/s、SLA、Goodput 和控制变量 profiling 的范围已在 MDX 和第 7 步深入讲解写明，控制变量实验归第 14 章，不用重复内容凑字数。

## 验证

- `npm run build -- --config .astro/k2.config.mjs`：60 页通过。忽略的本地配置只隔离 Vite cache 并允许共享 `node_modules` 符号链接，未写协调人的 checkout。
- 本章默认 transcript 连续两次一致，SHA-256 均为 `bf32ad2fa2867ffbac2f151cc154570be4dda61e977fc69a8d257730c2d10ff5`；7 步 readability、deep-check、zh-check 和 `git diff --check` 全过。zero-to-sglang 中英链接均 HTTP 200。
- 42 个英文桌面相位 DOM 均核对 counter、step、phase、文字出界、重叠和字号；每步末相最小值为 13.508、13.508、13.508、13.508、10.806、10.806、10.391 CSS px。逐相断言覆盖 token 时钟、E2E 端点、A/B 排序、P50 揭示顺序、A 的 20 s 终点和 B 的 25 s 终点。
- 英中三宽度 42 个手机末相 DOM 全过；双语 14 个深入讲解均实际打开，`aria-expanded=true`，无横向溢出、KaTeX 错误或残留 `$$`。
- 证据在 `.bot/out/ml01-rework/`，代表图 `s7-p11-en.png` 和 `s4-final-zh-phone.png`。当前模型无图像输入，尝试 Read PNG 后确认不能读取，未声称已看图或视觉通过。

## 提交与剩余

- 教程提交 `5f5aa56` 首次推送被拒后，已按指令 `git pull --rebase origin tutorials` 并推送成功，没有 force-push。评分卡、progress 和本报告随后续 `[k2] ` 记录提交推送。
- 等协调复审 ML-02／15／24 和图像评审；主人最终视觉与真实产品验收另计。下一单元按 direction 继续 ML 02–10／12 的静态机制 P0 和 ML-14，不开第 14 章新书。
- ML-21／22 的共享深入讲解抽屉和其他章返工不在本单元。未跑全站回归、真实 SGLang、模型、GPU benchmark、故障注入或 reduced-motion 动态切换。

---

# lane k2 本轮报告 · ML Systems 02 机制与内容返工

日期：2026-11-26。范围只含 ML Systems 第 2 章、双语深入讲解、生成 transcript、评分卡、仓库 progress、规划行和本报告。未改 Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## 修掉的 open review 项

- **ML-03 · 静态显存生命期**：旧 2 步扩为 6 步，35 个相位分别演示 KV 尺寸、model→KV pool→graph buffers、capture→replay→runtime 和最终账。capture 明确只记录、不执行，输出由 replay 写入；同一 `G` 贯穿两次 replay，`A` 只在计算需要时出现。
- **ML-28 · “完整显存账”过宽**：章名改为「启动与运行时显存账」。最终账写 `M+K+R=78` 与 `G+A+D≤11.7 GB`，三项未知量标 `?`，明确不覆盖 KV 字节推导、paging、多模态预留和 allocator 全量分配。
- **ML-30 · 02→03 接缝**：保留 hybrid 共同前缀，并在图上解释 hybrid 与 `num_batch`，直接引出 ML 03 Step 1 的 1024／64 等待和重算 token 数对照。
- 独立冷读另关闭 9 个术语、连续性和 capture 事实问题；源码评审另修正 capture `824-855,1029-1076` 与输入复制 `262-362,1138-1151` 的出处。缩短深入讲解源链接显示文字后，12 个双语抽屉视图无横向溢出。

## 当前作者分数与厚度边界

- 独立冷读终审：R1–R5 **60/60**、机制 R6 **12/12**、原十个非视觉项 **120/120**、**0 未决内容洞、无必修项**。源码终审同样无必修项；这些均为文本与 DOM 证据，不是 PNG 视觉通过或协调 verdict。
- 六步相位间机制变化数为 **5、4、4、4、5、6**。原 #4/#5 和原十二项总分待图像评审，不记 `complete-under-EVAL`。
- transcript 为 **1,074 词**，SHA-256 为 `22a954d5c607211627a613d5e326f99ff08c017f436983543a5f5397a1bef91d`。本章只覆盖启动尺寸、graph 缓冲与激活使用期；省略主题及原因已写在 MDX 和深入讲解，不用重复内容凑字数。

## 验证

- `npm run build -- --config .astro/k2.config.mjs`：60 页通过。本地忽略配置只隔离 Vite cache 并允许读取共享依赖，未写协调人的 checkout。
- 本章默认 transcript 重生成与 pinned 一致，6 步 readability、`deep-check 02`、`zh-check` 和 `git diff --check` 全过。zero-to-sglang 中英 Chapter 4 链接均 HTTP 200。
- 英中全章及中文逐步 360／390／430 px mobile 全部 `no layout breaks`。35 个英文桌面相位均核对 step、phase、文字出界和字号；逐步最小值为 12.593、12.007、12.007、12.007、12.007、10.326 CSS px。
- 6 个中文 390 px 手机末相和 12 个双语 deep 视图均核身份；deep 均 `aria-expanded=true`，无横向溢出、KaTeX 错误或残留 `$$`。证据在 `.bot/out/ml02-rework/report.json`，对应 PNG 在同目录。当前模型无图像输入，未声称已看图或视觉通过。

## 提交与剩余

- 六个步骤分别提交并推送，随后分别提交抽屉修复和冷读／出处修复。多次推送被拒后均按要求 `git pull --rebase origin tutorials` 再推，没有 force-push。评分卡、progress 和本报告随后续 `[k2] ` 记录提交推送。
- 等协调复审 ML-03／28／30、相位图与最终分数；主人最终视觉与真实产品验收另计。下一单元按 direction 继续 ML 03–10／12 的静态机制 P0 和 ML-14，不开第 14 章新书。
- 未跑全站回归、真实 SGLang／CUDA、allocator trace、GPU benchmark、reduced-motion 动态切换或全相位手机检查；`G`、`A`、`D` 没有实测值。

---

# lane k2 本轮报告 · ML Systems 01 记录同步与 02 定点返工

日期：2026-11-26。范围只含 ML Systems 第 1 章评分记录、第 2 章手机标题与评分记录、仓库 progress 和本报告。未改 Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。

## review 项与当前分数

- **ML 01 记录同步**：固定 `7887a2d` 的协调 EVAL **GO** 已写入评分卡和 progress：R1–R5 **70/70**、机制 R6 **14/14**、R1–R6 **84/84**、原十个非视觉项 **140/140**、原 #4/#5 **28/28**、原十二项 **168/168**、未决内容洞 **0**。ML-02／15／24 全部关闭，未重做教程。
- **ML-40 capture 事实**：当前 `a406a2e` 已在 Step 3、双语深入讲解和 MDX 写明 capture 只记录 GPU 工作而不执行，输出由 replay 写入。与第 1 本 Ch. 11 Step 6 的 `nothing executes` 一致；本轮未重复改写。
- **ML-30 章间接缝**：当前 Step 6 直接问 `num_batch` 1024／64 怎样改变短请求等待与重算 token 数。ML 03 Step 1 正展示 **3.95／0.91 s** 与 **1,019–1,029／63–69** 个重算 token，问题与首步回答一致；本轮未重复改写。
- **ML-39 手机交叠**：`1334bf5` 和 `5b278f7` 缩短英文 Step 1／6 手机标题，`a4d2fa4` 缩短中文 Step 1 标题。改前英文 Step 1 纵向交叠约 **4.94 px**、Step 6 约 **2.78 px**；改后英中三宽度均无交叠。
- ML 02 固定 `3060023` 的协调 **NO-GO** 基线保留：R1–R5 **58/60**、机制 R6 **12/12**、R1–R6 **70/72**、原十个非视觉项 **118/120**、原 #4/#5 **24/24**、原十二项 **142/144**、未决内容洞 **2**。上述后续修复待协调复审，不改固定快照分数，不记 `complete-under-EVAL`。

## 验证

- 最终源码 `npm run build -- --config .astro/k2.config.mjs`：**60 页**通过。本地忽略配置只隔离 Vite cache 并允许读取共享依赖，未写协调人的 checkout。
- 本章默认 transcript 重生成与 pinned 一致：**1,074 词**，SHA-256 `22a954d5c607211627a613d5e326f99ff08c017f436983543a5f5397a1bef91d`。6 步 `readability`、`deep-check 02`、`zh-check`、英中全章 `mobile`、中文 Step 1／6 字号门和 `git diff --check` 全过。
- `.bot/out/ml02-review/final-desktop-settled/report.json`：**35 个**英文桌面相位均核对身份和末态，逐相机制签名均变化，文字重叠／出界为 **0**；最低 **10.3262 CSS px**。每步保存首末相 PNG。
- `.bot/out/ml02-review/final-phone-clean/report.json`：英中六步 × 三宽度共 **36 个**手机末相，文字重叠／出界均为 **0**，最低 **10.7602 CSS px**。代表图 `en-390-s6.png`。
- `.bot/out/ml02-review/deep-audit/report.json`：**12 个**双语 deep 视图均 `aria-expanded=true`，横向溢出、KaTeX 错误和残留 `$$` 均为 **0**，Step 3 双语均含不执行语义。
- 主线程按 transcript、双语 deep、Ch. 03 Step 1 和 live DOM 完成冷读；未把 `deep-check ok` 当作语义通过。独立子代理因配置的模型不存在而未运行，未计为证据。当前模型不能读取 PNG，未声称已看图或视觉通过。

## 提交与剩余

- 教程提交：`1334bf5`（Step 1 英文手机标题）、`5b278f7`（Step 6 英文手机标题）、`a4d2fa4`（Step 1 中文手机标题）。两次推送被拒后均按要求 `git pull --rebase origin tutorials` 再推，没有 force-push。
- 评分卡、progress 和本报告随后续 `[k2] ` 记录提交推送。ML-39／40／30 等协调复审；ML-14 和其余静态机制 P0 尚未开始，不开第 14 章。
- 未跑全站回归、真实 SGLang／CUDA、allocator trace、GPU benchmark、故障注入、reduced-motion 动态切换或主人最终视觉验收。

---

# lane k2 本轮报告 · ML-14 与 ML 03–07 静态机制返工

日期：2026-11-26。范围只含 ML Systems 的协调记录同步、ML 08 Step 4 的 ML-14 事实小修，以及 ML 03–07 的静态机制 P0；未动 Omni、Voxt、第 1 本受保护英文原文或 `.bot/memory/`。本轮按 50 分钟边界收尾，ML 08–10／12 的静态机制 P0 留作下一轮，未开第 14 章。

## 已修 review 项与提交

- `141aa5f [k2] Sync ML 02 coordinated verdict`：只同步 ML 02 固定 `c7d3d86` 的协调 GO：R1–R5 **60/60**、机制 R6 **12/12**、R1–R6 **72/72**、原十个非视觉项 **120/120**、原 #4/#5 **24/24**、原十二项 **144/144**、0 未决内容洞。ML-03／28／30／39／40 全部关闭，未重做 ML 02。
- `efcb858 [k2] Correct ML 08 FP32 gradient averaging`：修复 **ML-14**。ML 08 Step 4 现在同时解释 slime 的 `loss = loss × R/B` 预缩放与 FP32 FSDP2 默认 `ReduceOp.AVG`，不再误写为 sum。双语深入讲解记录 `reduce_dtype=torch.float32`、额外 predivide／postdivide 均为 `None`，并用 `R=2`、`B=8` 验证 `(2×2/8 + 6×2/8)÷2 = (2+6)÷8 = 1`。源码依据为 pinned slime `actor.py:687-702,1000-1034` 和 PyTorch v2.8.0 `_fsdp_collectives.py:605-641`。
- `af6a574 [k2] Animate ML 03 checkpoint recovery`：修复 **ML-04**。六步 `[3,4,4,5,4,5]` 相位演示前缀复用、state 更新、checkpoint 拒绝与重算进度、hybrid 截断和 tombstone 回退。作者 DOM 机制 **12/12**，R1–R5 沿用 **60/60**。
- `79621bf [k2] Animate ML 04 ring communication`：修复 **ML-05**。七步 `[3,3,5,4,2,8,4]` 相位，Ring 明确播放三轮 Reduce-Scatter 和三轮 All-Gather，输入、S/4 分块、归约结果与完整张量依次变化。作者 DOM 机制 **14/14**，R1–R5 沿用 **70/70**。
- `8230852 [k2] Animate ML 05 serving request lifecycle`：修复 **ML-06**。七步 `[4,3,3,5,4,6,6]` 相位演示启动、ready、请求进入 rank 0／TP 组、返回及四个 token 的到达时刻。作者 DOM 机制 **14/14**，R1–R5 沿用 **70/70**。
- `331e391 [k2] Animate ML 06 rollout training loop`：修复 **ML-07**。八步 `[4,3,4,4,3,3,4,4]` 相位贯穿同一 prompt group、rollout record、reward、GRPO、训练和 v1。作者 DOM 机制 **16/16**，R1–R5 沿用 **80/80**。
- `d56e4a4 [k2] Animate ML 07 weight update lifecycle`：修复 **ML-08**。八步 `[4,4,4,5,6,5,4,5]` 相位演示 handle、bucket 1 清空后 bucket 2 上卡、版本边界和 sleep 账。作者 DOM 机制 **16/16**，R1–R5 沿用 **80/80**。

这些章节的原 #4/#5、原十二项总分和协调 verdict 均待复审，不记 `complete-under-EVAL`。ML-14 修复也待协调复审，未把旧静态满分当作新 verdict。

## 验证

- 每章均运行并通过 `npm run build`（60 页）、目标默认 transcript、全章 `readability`、`deep-check`、`zh-check`、英中全章 360／390／430 px `mobile`、中文逐步字号门和 `git diff --check`。最终记录提交前再次运行 build 与 diff check。
- ML 03–07 的默认 transcript 均连续两次逐字一致。自定义逐相审计保存 **151 张桌面 PNG、152 条可见文本签名**：ML 03 **25 张 PNG／26 条记录**，ML 04 **29**、ML 05 **31**、ML 06 **29**、ML 07 **37**。每个相位都有本步机制对象或数值变化；文字重叠、SVG 出界均为 **0**，全书本轮最低 **10.390625 CSS px**。
- 证据目录：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-hu5cwwuz/opencode/ml03-phases/`、`ml04-phases/`、`ml05-phases/`、`ml06-phases/`、`ml07-phases/`。代表图：`ml04-phases/s6-p4.png`、`ml07-phases/s5-p4.png`。
- ML-14 的独立算术脚本通过；双语 Step 4 deep 均为 `aria-expanded=true`，`counter=04 / 06`，无横向溢出、KaTeX 错误或残留 `$$`。截图在同级 `ml14-en/`、`ml14-zh-phone/`、`ml14-deep-en/`、`ml14-deep-zh/`。
- 当前模型无图像输入。已尝试读取代表 PNG，但工具返回 `Cannot read image`，因此没有声称已看图、视觉通过或主人验收通过。独立 reviewer 因配置的模型不存在而未启动，未计为证据；主线程完成 transcript、源码、双语 deep 和 live DOM 冷读。
- 未跑全站回归、真实 SGLang／slime／NCCL／CUDA、模型训练、GPU benchmark、故障注入或 reduced-motion 动态切换。本轮 4321 dev server 已停止，本轮浏览器已关闭，匹配本轮的 CDP 目录已清理。

## 剩余

- **ML-09**（ML 08 FSDP2）、**ML-10**（ML 09 FP8）、**ML-11**（ML 10 INT4 QAT）、**ML-12**（ML 12 RL 投机解码）的静态机制 P0 尚未完成。ML 08 目前只有 ML-14 事实修复，不能视为其动画 P0 已关闭。
- 下一轮从 ML 08 开始，再依次处理 ML 09、10、12；不重做 ML 01／02、ML 13 或本轮已完成的 ML 03–07，不开第 14 章新书。其他 ML 内容 finding 保持原状。
- 本地章节地址为 `http://localhost:4321/learning-sglang/ml-sys/ch/07-weight-updates/?step=5`。服务器已按要求关闭；查看前在本目录运行 `npx astro dev --background`。

---

# lane d 本轮报告 · Voxt 11 Step 1 逐相机制（最小单元）

日期：2026-11-26。范围只含 Inside Voxt 第 11 章 `models-and-app-updates` 第 1 步的组件相位、评分卡机制栏同步、progress 和本报告；未动 Omni、ML Systems、第 1 本受保护英文原文、其他 Voxt 章、`.bot/memory/` 或 `~/code/learning-sglang`。actor 已正常启动（DeepSeek 登录恢复）；本 clone 的 `.bot/state/` 下没有 `pause-d` 可删，真实暂停文件在 bot 主目录，按路径映射不在本目录操作。

## 处理的 review 项

- `c3a7773` 复审第 1 步机制 1/2 的两条扣分：「第二相同时改变模型卡、顶部数字和底部公式」「第三相比值变化时红框却移到应用卡」。按 direction，从 `ls-d-1126-163623` 旧草稿只移植第 1 步相关 hunks（第 2–5 步留给后续轮，旧草稿 5 个未提交文件原树未动）。
- 改法：`PHASE_COUNTS` 第 1 步 3→4。四相各只变一个对象，红框始终停在它上面：模型卡 `0 B / 0 files` → `2.47 GB / 9 files`（红框留模型卡）→ 底部加法式出现（红框移到公式）→ 副标题出现 `2,467,856,503 ÷ 280,000,000 ≈ 8.8×`（红框移到副标题）。副标题前三相为 `the model arrives separately from the app`，公式前两相留空；末相舞台文字与旧末相逐字相同。
- 组件根节点补 `data-animation-step` / `data-animation-phase` / `data-animation-final-phase`，transcript 的末相位采集不再依赖固定等待。
- 评分卡机制栏同步为协调 `c3a7773` 的 **7/12**（逐步 1、1、1、1、1、2），关闭 review.md 的评分卡同步项；本轮不自行把第 1 步记为 2/2，内容分保持协调 `6467ab7` 基线，完整 EVAL 仍 **NO-GO**。

## 验证

- node_modules 是指向主 checkout 的符号链接，不能写；本轮照旧草稿做法用 `.astro/local.config.mjs` 把 Vite 缓存放进本 clone，dev server 用独立端口 **4399**，未连协调人的 4321。
- `npx astro build --config .astro/local.config.mjs`：60 页通过。
- `BOOK=voxt ONLY=11 node scripts/transcript.mjs http://localhost:4399/learning-sglang`：6 步，无出界、重叠、脚注告警；重生成与已提交 transcript **无 diff**（末相文字不变）。
- `BOOK=voxt ONLY=11 STEP=1 npm run readability`：0 机械问题；`BOOK=voxt node scripts/deep-check.mjs 11`：通过；`BASE=...4399 BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：all clear。
- `BOOK=voxt ONLY=11 STEP=1` 英文与 `LANG=zh` 中文 `mobile`：360／390／430 px 均 no layout breaks。
- 桌面 1440×900 `getScreenCTM()` 字号：英文最低 **11.50 CSS px**（loops）、中文最低 **12.31 CSS px**，过 ≥10 门。
- 逐相 DOM 审计（英桌面＋英手机，相位身份由 `data-animation-phase` 确认、红框过渡 320 ms 后读数）：p0→p1 只变模型卡两行、红框留模型卡；p1→p2 只出现公式、红框在公式；p2→p3 只变副标题比值、红框在副标题。四相 PNG 存 `.bot/out/voxt11-step1-phases/`。当前模型不能读 PNG，未记成已读视觉证据。

## 剩余

- 等复审读第 1 步四相证据并重评该步机制分；通过后按 direction 依次做第 2–5 步同类返工（每步一个最小单元），再 Voxt 10，最后 `12-meeting-capture-modes`。
- 未跑全站回归、真实 Voxt、模型下载、更新或模型进程；主人最终验收另计。本轮 4399 dev server 与浏览器已在收尾关闭。

---

# lane d 本轮追加 · Voxt 11 Step 1 手机 loops 碰撞与 progress 记录

日期：2026-11-26。按复审回执修两处，仍只动 Step 1 最小单元。

- **手机公式行与 loops 标签碰撞**：英文手机第 2／3 相 `= 2,467,856,503 B`（y=630）与 LoopProgress 的 `loops`（y=621）在 360／390／430 px 实叠 2.03×5.32／2.22×5.42／2.49×6.22 CSS px。`mobile` 不查 SVG 文字互撞、transcript 只查桌面，所以上轮门没拦住。修法：本组件第 1 步手机 LoopProgress 从 `H-44` 抬到 `H-80`（其余步不动），label／bar 与公式两行和相位 2 红框边都留出 ≥5 px。
- **逐相碰撞审计**：live DOM 对英／中 × 360／390／430 px × 4 相共 24 个视图做 `getBoundingClientRect` 两两相交，全部为 0（相位身份由 `data-animation-phase` 确认）。
- **progress.md 章节行**：`models-and-app-updates` 行原来还写「6 步 R1–R5 10/10、20/20、0 洞」，与协调基线矛盾；已改为 R1–R5 **54/60**、原十个非视觉项 **119/120**、原十二项 **143/144**、机制 R6 **7/12**（逐步 1、1、1、1、1、2），第 1 步修复标为待复审，不自行提分。
- 复跑门：`astro build`（60 页）、本章 transcript（重生成仍无 diff）、STEP=1 readability、英中 STEP=1 mobile 三宽度、zh-check 全部通过。桌面布局未变（桌面 y=20 不动）。

---

# lane d 本轮追加二 · Voxt 11 Step 1 红框描边与文字相碰、Voxt 08 记录分开

日期：2026-11-26。按复审回执修两处，仍只动 Step 1 最小单元。

- **红框描边碰字**：第 2 相公式框描边在手机压到脚注（桌面同相也压脚注和上一条 bullet），第 3 相比值框描边压标题，均为 `c3a7773` 以来既有几何。修法：桌面 bullet 三行 360/386/412→352/376/400、公式 438→430，手机公式两行 608/630→600/622；第 2／3 相框改为贴合文字的窄框（桌面 `{191,413,338,28}`／`{239,38,242,15}`，手机 `{15,583,270,44}`／`{29,36,246,14}`），第 1 步手机 LoopProgress 再抬到 `H-94` 避开新框顶边。其余步不动。
- **形状×文字审计**：live DOM 把 `.motion-focus` 四条描边带（±strokeWidth/2，经 inverse CTM 换算）与全部可见文字 bbox 求交，覆盖英／中 × 桌面／360／390／430 × 4 相共 32 个视图，全部 0 相交；相位身份由 `data-animation-phase` 确认。
- **Voxt 08 提交记录**：report 第 202 行原写「教程源码、评分卡、progress 和本报告：一条 `[d]` 提交」，已改为教程提交 `bb70918` 与报告提交 `b233fbe` 两笔分开，对齐 review.md:582 和 direction.md:17。
- 复跑门：`astro build`（60 页）、本章 transcript（重生成仍无 diff，文字内容未变）、STEP=1 readability、英中 STEP=1 mobile 三宽度、zh-check、deep-check 11 全部通过。

---

# lane d 本轮 · Voxt 11 Step 2 逐相机制（最小单元）

日期：2026-11-26。direction：等 Step 1 复审时只做 Step 2 一个最小单元，修「多处状态同时变化或红框离开变化对象」，不动 Step 3–5，不整批移植旧草稿。

## 单元与基线

- 只改 `src/components/voxt/ModelStorageUpdates.svelte` 的第 2 步（固定快照）与一处第 2 步内文字。基线不变：协调 `6467ab7` 内容 R1–R5 **54/60**、原十项 **119/120**、静态 R6 **12/12**、原 #4/#5 **24/24**、原十二项 **143/144**；协调 `c3a7773` 机制 R6 **7/12**（逐步 1、1、1、1、1、2）。本轮不自行把第 2 步记为 2/2，待协调读相位证据重评。

## 修的协调扣分（`c3a7773`）

- 原命题：「第 2 步末相新增 vocab ✓ 和 `all checks pass` 时红框已移到磁盘路径」——末相两处状态同时变化，且红框指的对象（磁盘路径）本相没有变化。
- 修法：`PHASE_COUNTS[1]` 3→4。vocab ✓ 留在第 2 相，`all checks pass` 单独第 3 相；从不变化的磁盘路径不再占相位。四相红框：仓库卡 → safetensors 两行 → vocab 三行 → `all checks pass` 一行（桌面 `{310,110,380,44}`／`{310,158,380,56}`／`{310,219,380,18}`，手机 `{22,241,256,38}`／`{22,287,256,56}`／`{22,352,256,13}`）。
- 顺带一处红框描边穿字：桌面仓库卡内英文 `= first 7 of the full commit` 实测宽 251.4 px（x 40→291.4），越出 250 px 卡片并被相位 0 红框右边（x=274）穿过；改为与手机一致的 `= first 7 chars`，中文未动。这是本步唯一文字变化，transcript 重生成只差这一行。

## 逐相机制证据（DOM/bbox，当前模型不能读 PNG）

- 方法：`scripts/lib/browser.mjs` 无头 Chrome，`data-animation-phase` 确认相位身份，focus rect 240 ms 过渡后读 `getBBox()`，与全部可见文字 bbox 求交（相交且不被包住＝描边穿字）。
- 英桌面 1440×900：p0 红框在仓库卡（含 commit 行，0 穿字）；p1 只新增 `✓ SHA-256…`；p2 只新增 `✓ git blob ID…`；p3 只变 `all checks pass`。4 相穿字数均为 **0**。
- 中文 390 px 手机：同上，`… 还有 7 个文件` → `校验全部通过` 只在 p3；4 相穿字数均为 **0**（初版 p3 手机框底边擦到磁盘路径首行，框高 17→13 后归零）。

## 门槛（本轮，只本章第 2 步）

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=11 npm run transcript`：6 步，无出界／重叠／脚注告警；与 pinned 仅上述一行英文差异。
- `BOOK=voxt ONLY=11 STEP=2 npm run readability`：0 机械问题。
- `BOOK=voxt node scripts/deep-check.mjs 11`：通过。`BOOK=voxt ONLY=11 node scripts/zh-check.mjs`：all clear。
- `BOOK=voxt ONLY=11`（英）与 `BOOK=voxt ONLY=11 STEP=2 LANG=zh`（中）`mobile`：360／390／430 px 均 no layout breaks。
- 环境修复：本 clone 的 `node_modules` 曾是指向主 checkout 的符号链接，Vite 写 `.vite` 缓存被围栏拒（EPERM）；本轮改为本目录真实 `npm install`，未再写入主 checkout。

## 剩余

- 等复审读第 1／2 步四相证据并重评这两步机制分；通过后按 direction 依次做第 3–5 步同类返工（每步一个最小单元），再 Voxt 10，最后 `12-meeting-capture-modes`。
- 未跑全站回归、真实 Voxt、模型下载、更新或模型进程；主人最终验收另计。本轮 4321 dev server 与浏览器已在收尾关闭。

---

# lane d 追加 · Voxt 11 评分卡两处过时措辞

日期：2026-11-26。评分卡 `:21`「本轮先修第 1 步」与 `:32`「本轮只返工第 1 步」与第 2 步提交矛盾，已改为「第 1／2 步已先后返工、第 3–5 步未动」；其余标次（第 5／6／7 次）的章节标题保留为历史记录。实图检查仍未做：本模型无图像输入，四张英文桌面 PNG 无人读、无中文 PNG；不声称视觉通过，机制分保持协调 `c3a7773` 的 **7/12**，整章 NO-GO 等协调实图复审，Step 3–5 未动。

---

# lane d 追加二 · Voxt 11 Step 2 逐相实图集（待图像评审）

日期：2026-11-26。direction 要求的实图检查仍**未通过**：本环境模型无图像输入，协调复审方同轮也不能读图，故不声称视觉通过。已备齐相位身份可核的完整图集，等图像能力评审者检查后把结论补到本节。

- 图集目录：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-1ujx7ox4/opencode/d-s2/final/`，共 **24 张**：`en-desktop-p0..p3`、`en-phone-360-p0..p3`、`en-phone-430-p0..p3`、`zh-phone-360-p0..p3`、`zh-phone-390-p0..p3`、`zh-phone-430-p0..p3`。
- 采集身份：每张在 `data-animation-step=1` 且 `data-animation-phase` 等于目标相位后等 450 ms（focus 过渡 240 ms 已稳定）截图，打印回读相位号全部一致；zh 经 `localStorage.lang=zh`。
- 应看点：p0 红框在仓库卡；p1 只新增 SHA-256 ✓ 且红框在这两行；p2 只新增 git blob ✓ 且红框在这三行；p3 只变 `all checks pass`／`校验全部通过` 且红框在这一行；任何相位的红框描边不压邻近文字，手机三宽度无裁切或重叠。
- 状态：机制 R6 保持协调 `c3a7773` 的 **7/12**，整章 NO-GO，Step 3–5 未动；本节结论待图像评审者填写。

---

# lane d 追加三 · Voxt 11 Step 2 图集补齐 en-phone-390

日期：2026-11-26。补采 `en-phone-390-p0..p3` 四张，采集方式同前（`data-animation-step=1`、目标相位稳定 450 ms 后截图，回读相位一致）。图集现为 **28 张**：en-desktop、en-phone-360／390／430、zh-phone-360／390／430，各 p0–p3，目录 `/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-1ujx7ox4/opencode/d-s2/final/`。

**视觉门仍开放。** 本 lane 没有图像输入能力的评审者可用（主线程与可用子代理均为同一无图像输入模型），无法产出真实图像 verdict；DOM／几何审计不能代替看图。按复审要求：只有图像能力评审者实际检查这套英中图集并把结论写进本节，才关闭此门。在那之前机制 R6 保持协调 `c3a7773` 的 **7/12**，整章 NO-GO，Step 3–5 不动。

---

# lane d 追加四 · Step 2 视觉门阻塞声明（无法再推进）

日期：2026-11-26。复审要求由图像能力评审者检查 28 张相位图并回填 verdict。本 lane 环境内**不存在**这样的评审者：主线程模型读 PNG 返回「this model does not support image input」，可派生的子代理是同一模型，同样无图像输入；除 DOM／几何审计外没有其他看图通道。因此本 lane 无法产出真实图像 verdict，也不会再交 DOM 报告顶替。

- 阻塞项只有一个：图像能力评审者实看 `/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-1ujx7ox4/opencode/d-s2/final/` 的 28 张图（en-desktop、en-phone-360／390／430、zh-phone-360／390／430 各 p0–p3，相位身份已由 `data-animation-phase` 在采集时确认），核对每相焦点与状态变化、各宽度裁切／重叠／红框描边。
- 该评审只能由协调侧用有图像输入的模型执行；执行后把 verdict 写进本节和 `memory/scores/inside-voxt/models-and-app-updates.md`，再重评 Step 2 机制分。
- 在此之前：机制 R6 保持协调 `c3a7773` 的 **7/12**，整章 NO-GO，Step 3–5 不动；其余机械门（build、transcript、readability、deep-check、zh-check、英中 mobile 三宽度）均已在 `2b1ccb4` 通过，无未结代码改动。

---

# lane d 本轮报告 · Voxt 10 displayed Step 1 相位动画

日期：2026-11-27。类型：direction.md（05:32）指定的 lane d 最小单元——只承接 Voxt 10 `FileTranscription.svelte` displayed Step 1，一个 Step 一个提交，不移植其余九步大 diff。本轮开始 HEAD 与 `origin/tutorials` 均为 `ef82fe9`，工作树干净。范围只有该组件、再生成 transcript 和本报告；未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。

## 来源与边界

- 提交的是失败目录 `ls-d-1127-045747` 保留的 Step-1-only 草稿，文件 SHA-256 `0f636b30213c1bf0a891b641bdbc470d46cd69a7648b05767a3178d4a3501ead`，相对 HEAD **+66/-36**，与 review.md 记录逐项一致。草稿父版本与本目录 HEAD 的文件哈希相同（`47fa4d08…0145`），补丁原样套用、未改一行。
- 另一份草稿（`ls-d-1127-051322`／`ls-d-1127-031109`，SHA-256 `4526f171…a613`）含 11 步 `PHASE_COUNTS`／`motionFrames` 大机制，按 direction 不移植；两份草稿目录均未动，互不覆盖。
- 改动内容：Step 1（step index 0）从静态图改为三相循环——先两条路线的外框，再文件路线的输入与 `Voxt transcribe`，再输出与三条要点；带 `LoopProgress`（一圈 4.9 s）、reduced-motion 直接落末相、`data-animation-step/phase/final-phase` 身份属性。桌面和手机两套布局同机制。文字、caption、数字零改动。
- 这正面对应 EVAL 第 6 节「每一步都有动画」对本章首步的要求；其余十步的动画不在本轮范围，继续冻结待协调排期。

## 目标硬门（全过）

- `npm run build`：60 页通过（本 lane 的 `node_modules` 原是指向协调 checkout 的符号链接，已改为本地实目录重装，build／vite 缓存不再写入 `~/code/learning-sglang`）。
- `BOOK=voxt ONLY=10 node scripts/transcript.mjs`：11 步无 caption、出界、重叠或文本规则报告；再生成 diff 只有一行 `- loops`（LoopProgress 标签），已随提交。
- `BOOK=voxt ONLY=10 node scripts/mobile.mjs`：360/390/430 px **no layout breaks**；`BOOK=voxt ONLY=10 STEP=1 LANG=zh` 中文字号门通过。
- `BOOK=voxt ONLY=10 STEP=1 npm run readability`：0 机械问题。`BOOK=voxt ONLY=10 node scripts/zh-check.mjs`、`node scripts/deep-check.mjs` 均 ok（11 步）。

## 机制与几何证据（无图像输入，只报 DOM／几何）

按 EVAL 执行门，不写「已看图」；证据为 DOM 探针（1440×900，英中各三个采样点，相位以 `data-animation-phase` 锚定 lap 起点）：

- 身份：`data-animation-step=0`、counter `1 / 11`、hydration 正常；中英一致。
- 两个以上机制状态：可见 `<text>` 数相位 0/1/2 分别为 **12/16/24**；`Voxt transcribe` 框在相位 ≥1 出现，`meeting.srt / talk.txt` 输出框与三条要点在相位 2 出现，顺序与 caption「文件转写的结果是 SRT 或 TXT」一致。
- 六个采样点文字重叠 **0**、SVG 出界 **0**、最低可见字号 **11.50 CSS px**（≥10）；`loops`／`循环` 标签在场。探针脚本 `/tmp/lsd-probe.mjs`（未提交），可用 `scripts/lib/browser.mjs` 重跑。
- 截图 6 张（桌面英/中分相、手机英/中末相）在 `/tmp/lsd-shots/`；本 lane 无图像输入能力（同上一轮记录），未逐张读图，图像 verdict 仍需协调侧有图像输入的评审者实看。

## 评分（只评本轮改动的 Step 1）

- 易读 **12/12**。R1 小学生复述：「听写是把字打到光标那里；把一个录音文件交给 Voxt，它变成字幕文件或纯文字文件。」R2：本步只引「文件路线」一件新事（听写路线是第 1–9 章走过的）。R3：SRT／TXT 图上有大白话（「SRT = subtitle · TXT = plain text」），M4A 注「compressed sound」。R4：caption 两句短句。R5：一小时会议 3,600 秒、解码 115.2 MB 在图上，推导在第 2 步（既有安排，未改）。R6：三相循环一次只长出一组框，末相停留 2.2 s，reduced-motion 落末相。
- 冷读洞 **0**（只按本步与已过步检查：dictation、session、history 均在第 1–9 章讲过；115.2 MB 的「怎么算的」由第 2 步回答，aria-label 也这样说）。
- 不声称整章 GO：Voxt 10 既有冻结与待审状态不变，本轮不继承、不改写任何既有 verdict。

## 遗留

- Voxt 10 Steps 2–11 仍无相位动画（`4526f171` 草稿的其余机制未移植），等协调排期。
- Voxt 11 Step 5 `99ed414`／`26941bb` 继续冻结待固定复审；review.md 的三条 reviewer 线索（p3→p0 回绕、评分卡第 32 行、Step 5 审计证据）未动。
- 本轮开的 dev server（端口 4323）与无头 Chrome 已在收尾关闭。

---

# lane d 本轮报告 · Voxt 10 Step 1 reviewer／报告收尾（06:42 自动重试）

日期：2026-11-27。类型：direction.md lane d 指定的 06:42 自动重试——只完成 `bd884d2` 的 reviewer／报告收尾。不重写 Step 1、不重复提交教程、不另起并发、不开新单元；Voxt 10 displayed Step 2 等协调固定复审后再做。本轮开始 HEAD 与 `origin/tutorials` 均为 `bd884d2`，工作树干净；结束时教程树无 diff，只追加本节。

## 环境与边界

- 本目录 `node_modules` 又是指向协调 checkout 的符号链接，已删除符号链接并 `npm ci` 本地实装；未向 `~/code/learning-sglang` 写入任何缓存或文件，未进入该目录。
- 未改组件、MDX、deep、transcript、评分卡或 `.bot/memory/`；第 1 本受保护英文原文无 diff。dev server 用端口 4324（4321 属既有进程，未动）。

## 硬门复核（本 checkout、HEAD `bd884d2`，全过）

- `npm run build`：60 页通过。
- `BOOK=voxt ONLY=10 node scripts/transcript.mjs`：11 步，无 caption／出界／重叠／文本规则报告，再生成相对 pinned **零 diff**。
- `BOOK=voxt ONLY=10 node scripts/mobile.mjs`：360/390/430 px **no layout breaks**；`ONLY=10 STEP=1 LANG=zh` 中文字号门通过。
- `BOOK=voxt ONLY=10 STEP=1 node scripts/readability.mjs`：0 机械问题。`zh-check`（11 步 all clear）、`deep-check 10`（11 节 ok）均通过。

## 机制与几何复核（新采集，与作者报告逐项一致）

- 探针 `/tmp/lsd2-probe.mjs`（未提交，`scripts/lib/browser.mjs` 可重跑）：英中桌面相位 0/1/2 可见 `<text>` 数 **12/16/24**；`Voxt transcribe` 框相位 ≥1 出现，`meeting.srt / talk.txt` 输出框与三条要点相位 2 出现；`data-animation-step=0`、`final-phase=2`、counter `1 / 11`、`loops／循环` 标签在场。
- 文字重叠 **0**、SVG 出界 **0**；最低可见字号桌面 **11.50 CSS px**、390 px 手机 **11.76 CSS px**。8 张新截图在 `/tmp/lsd2-shots/`。
- 本模型**无图像输入**（本轮再次实测确认，读 PNG 返回不支持），不声称视觉通过；图像 verdict 仍需协调侧有图像输入的评审者实看。

## 独立 reviewer 冷读（替代 06:02 失败的 reviewer；同一无图像输入模型，只看源码／transcript／deep）

- **事实核对全过**（pinned `sglang-omni@3a31bd72`，且相关四文件与当前 `origin/main@0f70d9c7` 逐字节相同，无 current-source 漂移）：文件路线与 SRT／TXT `transcribe_cli.go:29-33`、`docs/transcribe.md:3`；复用 Transcribe 模型、不开 session `transcribe_socket.go:58-88`；不写历史、不留录音 `transcribe_socket.go:90-98`；16 kHz `internal/asr/asr.go:32`，3,600 × 16,000 × 2 = 115.2 MB 算式成立。
- **EVAL §6 动画门全过**：三个机制相位、reduced-motion 落末相且因果对象全在、手机分支同序同机制（只裁复述文字）、身份属性齐全；动画演示的对象与数字和 deep 一致；衔接成立（Ch. 09 末步点名文件→SRT/TXT，本步把 decoded 交给 Step 2）。
- **但不通过作者侧「完成」**：易读 **10/12**（R2=1：`Voxt transcribe`、SRT、TXT、M4A 四个新名同入；R5=1：115.2 MB 无可感比较，约 29 张照片在 Step 2）；原 12 项 **21/24**（最弱 #3 数字有来源、#1 动机在先）；冷读洞 **2**，同源于「3,600 s；decoded, 115.2 MB」一条（115.2 MB 无算式无指向、decoded 未解释）；deep `On the stage` 两处不符（引的舞台串 `compressed M4A` 与实际 `compressed sound (M4A)` 不一致；2 B/sample 未放进 behind-the-stage 段）。
- **reviewer verdict：NO-GO（本步作为完成）。** 与作者自评 12/12 冲突，按规矩不采信任一侧改分，两条都留待协调固定复审裁定。

## 收尾状态

- 必修项（115.2 MB 子弹的算式／decoded 大白话、deep 两处 `On the stage`）**本轮不修**：Step 1 教程内容按 direction 冻结，待协调复审 `bd884d2` 后由指定单元处理。
- 评分卡、`memory/scores/inside-voxt/file-transcription.md` 未动；不改 Voxt 10／11 任何既有分数与 verdict。Voxt 11 Step 5 `99ed414`／`26941bb` 继续冻结；三条 reviewer 线索未动。
- 本轮开的 4324 dev server 与无头 Chrome 已在收尾关闭。
