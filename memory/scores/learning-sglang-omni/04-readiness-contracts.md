# 第 4 章评分卡 · Three waiting rules

日期：2026-11-25。评分办法：`EVAL.md` 易读性 R1–R6 与原 12 项，每项 0 / 1 / 2。
材料：最终中英桌面截图、360／390／430 px 中文手机截图、390 px 英文手机截图、双语深入讲解截图及逐步 transcript；冷读者先读 Omni 前三章。第 1 步截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s01-20261125-0550/final/`；第 2 步截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s02-20261125-0750/final/`；第 3 步截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s03-20261125-0935/final/`；第 4 步截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s04-20261125-0943/final/`。

| 步 | 易读分 /12 | R1 小学生复述 | 分数 /24 | 冷读者洞数 | 最差的两条 | 日期 |
|---|---:|---|---:|---:|---|---|
| 1 | 12 | thinker 等 image_encoder 和 preprocessing 各交来一份完整结果，才把请求交给 scheduler。 | 24 | 0 | — | 2026-11-25 |
| 2 | 12 | 整份结果还没到，talker_ar 也会把先到的小段结果按先后顺序存好。 | 24 | 0 | — | 2026-11-25 |
| 3 | 12 | 默认攒够五段能用的内容就能提前组装请求；内容送完后，不到五段也能组装。 | 24 | 0 | — | 2026-11-25 |
| 4 | 12 | 上一步留下的输入和下一段文字都到了，才能算下一步。 | 24 | 0 | — | 2026-11-25 |

**当前平均：24 / 24；最低：24；已制作步总洞数：0；4/4 步易读满分。** 第 1 步讲清 two-source one-shot fan-in，第 2 步讲清早到的 chunk 按到达顺序存下，第 3 步讲清默认五段可提前构建及流结束例外，第 4 步讲清 feedback 与下一段文字的逐步就绪条件；本章完成。

## 冷读与整改记录

- 初版用「图 + 声音」构造两路输入。独立源码核查发现 speech 路线的这种请求还应等 `preprocessing`，所以 0/2→2/2 不成立。终稿改为 image-only 请求，应等 `image_encoder` 和 `preprocessing` 两份结果；「thinker 开始」也收窄为「把请求交给 scheduler」，不暗示 prefill 已开始。
- 初版冷读指出「一次」可能被理解为同时到达、到达位置和去向不清、上图例及 caption 在手机上过宽。终稿明确每个来源各自交来整份结果，先到的留在 thinker 收件格；手机改为三行三列快照，并缩短 caption。
- 最终独立冷读的中文桌面、360／390／430 px 中文手机和英文桌面均 **12/12、24/24、0 内容洞、0 显示洞**。遮住 caption 后仍能复述；手机三列标题和完整 caption 均可见。英文手机也无截断或重叠。
- 最终检查：`build`、本章 `transcript`、本步 `readability`、`deep-check 04`、`zh-check`、本步中文 `mobile`、100／1400 ms 静态图逐字节一致及 `git diff --check` 均通过。双语深入讲解截图最终以 `aria-expanded=true` 和标题断言确认抽屉确实展开。
- 第 2 步独立源码核查确认：`talker_ar` 的配置允许 pre-payload 流数据；未知请求的 chunk 追加到 `pending_stream_ingress`，payload 到达后接过列表；顺序只属于同一 request/source receive lane。图文收窄为接收和保存，不把 chunk 编号说成全局排序，也不暗示收到 chunk 就开始计算。
- 第 2 步初版成人模拟冷读为中文桌面／手机和英文手机 **9/12**，英文桌面 **8/12**。终稿标明图片序号和从 0 开始的 chunk 编号，用蓝／橙图例区分已收到和新到的小段，高亮每张的新 chunk，并把固定流长度、存储与计算的说明改成大白话。
- 第 2 步最终独立成人模拟冷读：中文桌面、360／390／430 px 中文手机、英文桌面和 390 px 英文手机均 **12/12、0 内容洞、0 显示洞**；中英遮住 caption 后都能复述，原 12 项自评 **24/24**。报告：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s02-20261125-0750/checks/cold-read-final.md`。
- 第 2 步最终检查：`build`、本章 `transcript`、本步 `readability`、`deep-check 04`、本章 `zh-check`、本步中文及 Omni 全书 `mobile`、100／1400 ms 静态图逐字节一致、双语抽屉 DOM、键盘往返、HTTP 200、8 个源码链接及 `git diff --check` 均通过。
- 第 3 步源码核查发现最新 `origin/main@6d8ed2` 的默认提前构建阈值仍为 5，但可配置硬下限已改为 1，不能沿用旧测试注释把 5 写成硬下限。终稿固定展示默认配置，区分 build-ready、准入和 GPU 开始，并说明末尾 `im_end` 不计入可用段。
- 第 3 步初读发现「request builder」循环定义、流结束后的灰空格写「还没到」会造成误解；终稿改为「把已存数据构建成请求」和「条件未满足」。最终成人模拟冷读覆盖中英桌面、360／390／430 px 中文手机及 390 px 英文手机，均 **12/12、0 内容洞、0 显示洞**；遮住 caption 能复述默认阈值与流结束例外，原 12 项自评 **24/24**。报告：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s03-20261125-0935/checks/cold-read-final.md`。
- 第 3 步最终检查：`build`、本章 `transcript`、本步 `readability`、`deep-check 04`、本章 `zh-check`、本步中文及 Omni 全书 `mobile`、100／1400 ms 静态图逐字节一致、双语抽屉展开与标题断言及 `git diff --check` 均通过。
- 第 4 步源码核查确认 feedback 是 code predictor 产生的 summed embeddings，codes 发往 `code2wav`，feedback 进入逐请求队列。文字流未结束时，下一步必须有 feedback 和下一段文字；流结束后才可由 `tts_pad_embed` 补上文字。未就绪行单独排除，不要求整个 batch 等待。
- 第 4 步初读发现图顶的 code predictor 和声音 codes 未在 Omni 前序章节解释，会引入两个无关新词；终稿只画 feedback 与文字的来源，把预测实现留在深入讲解。最终成人模拟冷读覆盖中英桌面、360／390／430 px 中文手机及 390 px 英文手机，均 **12/12、0 内容洞、0 显示洞**；遮住 caption 能复述两类输入都到才算下一步，原 12 项自评 **24/24**。独立 subagent 因 API key 不可用未运行，冷读按 EVAL 的换视角自检完成。报告：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s04-20261125-0943/checks/cold-read-final.md`。
- 第 4 步最终检查：`build`、本章 `transcript`、本步 `readability`、`deep-check 04`、本章 `zh-check`、本步中文及 Omni 全书 `mobile`、100／1400 ms 静态图逐字节一致、双语抽屉展开与标题断言、HTTP 200 及 `git diff --check` 均通过。
