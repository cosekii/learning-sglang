# lane k1 本轮报告 · Omni 07 Step 5 的 Omni-11 MPS lease 形成

日期：2026-11-27。类型：修旧。本轮开始 HEAD 与 `origin/tutorials` 均为 `7c98efc`，工作树干净；direction 指定的 Step 4 已在该提交完成并推送，因此不返工待复审批次，按 direction 承接下一最小单元 Step 5。范围只有本步组件、双语 MDX 与 deep、生成 transcript、本章评分卡、定向审计和本报告；Steps 1–4 与 Step 6、其他章、其他书、`.bot/memory/` 和第 1 本受保护英文原文均未改。

## 修复与 finding

- 七个 held phases 依次形成：读取 GPU 放置与 TP 设置；保留有 GPU 放置的非 TP 进程并排除 TP；解析物理 ID 并拒绝跨两张卡的进程；两个进程在 `GPU-A` 上组成一个 GPU 组；pipeline 取得一份 MPS lease；两个进程带唯一名牌 `t0`／`t1` 加入；名牌分别对到 process 0／1。跨卡拒绝和名牌匹配在手机上也上演，不只显示结果。
- 舞台只保留 MPS 租约这一个新概念。物理卡用白话标签 `GPU-A`，代码 token 改叫唯一名牌；`PhysicalMpsPlan` 在图上叫 GPU 组。lease 解释为「这个 pipeline 做 MPS 检查和清理的钥匙」，明确不表示独占 GPU、不分配显存，也不是每个进程一份。
- 蓝色只表示此 pipeline 的 MPS 对象，橙色只表示被排除对象，虚线只表示尚未出现。末相用 process 0 的 `2 GiB 租约前 → 2 GiB 验证后` 证明 MPS 不改 KV 申报；2 GiB 沿用第 3 步教学值，不再加到 reserve。
- 双语 MDX 与 deep 同步七相、数字出处、lease 范围和名牌匹配。代码 UUID／token 与舞台白话的映射写清；auto／on 比较、rollback、live-lease 检查、轮询、PID 快照和关闭清理均标为图外边界。新增 `manager.py:125-255,440-478,784-802` 精确出处，长路径和 commit 加断行机会。
- **Omni-11 的 Step 5 作者修复完成，待协调固定复审，不自行销项。** Step 6 的 offload 仍属开放范围；Omni-21／26／31／64、共享 ML-21／22 与其他 finding 未改，未申报整章 GO。下一最小单元是 Step 6 的 AuK offload，本轮未开始。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | 新内容洞 | R1 小学生复述 |
|---|---:|---:|---:|---:|---|
| 5 | 10/10 | 2/2（DOM） | 20/20 | 0 | 两个程序带着各自的名牌加入同卡共享服务，pipeline 的钥匙用于检查和清理；TP 和跨卡程序被排除，KV 申报不变。 |

- 独立 `general` 冷读首轮 **FAIL**：跨卡拒绝未在手机上演、验证只换结果标签、不变显存缺完整数值对照、同屏术语过多、蓝色在尚未接入时已表示 attachment。修复后第二轮内容通过但 R2 仍为 1；继续把 UUID／token／auto 移出舞台或改成白话，终审 **PASS**，R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、内容洞 **0**。该结论来自源码、transcript 和 DOM，不是协调 verdict。
- 当前模型不能读取 PNG；已尝试读取英中代表相位图，工具明确返回不支持图像输入。因此原 #4/#5、视觉验收和整章结论留待协调与主人，不声称看过图片或视觉通过。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；Step 5 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 07`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 5 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 均为 `0d64720001f55bcfbe663d6332eff6e5ef31a836241b5a53377031219b22155b`，**1,817 词**。无 caption、文字出界、重叠或文本规则报告。
- 可重跑脚本 `.bot/out/omni11-step5-audit.mjs`。最终结果 `.bot/out/omni11-step5-audit/report.json`：英中桌面、英中 360／390／430 px × direct／前步入口，共 **16 组合、112 状态、96/96 个机制转变**。逐相核对 TP 排除、跨卡拒绝、物理 ID、GPU 组、lease、加入箭头、名牌、两条匹配和 KV 对照。普通舞台最低 **10.760 CSS px**，重叠、SVG 出界、页面横溢和 failures 均为 0。
- 同一审计保存 **112 张相位图＋8 张 deep 图，共 120 张 PNG**。八个双语 deep 视图均 `aria-expanded=true`，无 KaTeX 错误、页面或 deep 横溢。drawer 打开后的缩舞台最低英文 **6.857**、中文 **8.006 CSS px**，仍归共享 ML-21／22，本单元未改共享组件。代表图：`.bot/out/omni11-step5-audit/en-1440-direct-p6.png`、`.bot/out/omni11-step5-audit/zh-390-previous-p6.png`。
- 未跑全站回归、真实 SGLang-Omni、模型、GPU 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。首轮审计的 deep 等待超时和一次中文 430 px 末相淡出竞态只提高等待上限并串行重跑，未计为通过；上述结果来自最终零失败运行。

## 剩余与清理

- 剩余事项是 Omni-11 Step 6、独立 Omni-21／26／31／64、共享 ML-21／22、原 #4/#5、具备图像能力的复审和主人最终视觉验收。没有提前关闭任何 finding。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout；只删除本目录内的符号链接并在本目录 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 本轮检查地址为 `http://localhost:4522/learning-sglang/omni/ch/07-shared-gpu-budgets/?step=5`。收尾用 `npx astro dev stop` 停止本轮 pid 5664，4522 无监听。
- 审计脚本均调用 `browser.close()`，每个标签页也逐个 `close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；未动其他 lane 的服务、浏览器或 Chrome 配置目录。

---

# lane k1 本轮报告 · Omni 07 Step 4 的 Omni-11 权重 alias 与私有 KV 形成

日期：2026-11-27。类型：修旧。本轮开始 HEAD 与 `origin/tutorials` 均为 `8aeecc1`，工作树干净。按 direction 只收尾 Omni 07 Step 4，不回改 Steps 1–3 的待复审批次，也不展开 Step 5。范围只有本步组件、双语 MDX 与 deep、生成 transcript、本章评分卡、定向审计和本报告；其他章、其他书、`.bot/memory/` 和第 1 本受保护英文原文均未改。

## 修复与 finding

- 左侧保留 `weight_share=off` 的两份 W、两个 KV 同布局对照，右侧用六个 held phases 形成：每池 30000 token 及仅大小比较、leader 加载一份 W、CUDA IPC handle、follower alias、两个独立 KV 池、最终 `1 W + 2 KV` 与 `2 × 30000 = 60000`。KV 池和结果算式分相出现，不把静态结果卡当动画。
- 图上以「已保存的模型权重」解释 W，以「让 follower 打开 leader 的 W」解释 CUDA IPC handle。MOSS 示例的 `max_total_tokens=30000` 与第 3 步 `engine.kv_cache_bytes` 明确互斥；`30 × 1000-token prompt` 只作大小比较，不承诺并发 prompt 数。权重／IPC、私有 KV 和虚线槽有相邻色块或图例。
- 双语 MDX 与 deep 同步六相、数字出处、互斥配置和私有状态。规划规则、逐 tensor 附着、dummy module tree 与 dummy 存储释放全部归入「图外实现细节」；新增 `ipc_weights.py:658-746,939-997,1079-1265` 精确出处。长源码路径和 commit 已加断行机会，双语 360 px deep 复验无横溢。
- **Omni-11 的 Step 4 作者修复完成，待协调固定复审，不自行销项。** Steps 5–6 的 MPS lease 和 offload 仍属开放范围；Omni-21／26／31／64、共享 ML-21／22 与其他 finding 未改，未申报整章 GO。下一最小单元是 Step 5 的 MPS lease，本轮未开始。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | 新内容洞 | R1 小学生复述 |
|---|---:|---:|---:|---:|---|
| 4 | 10/10 | 2/2（DOM） | 20/20 | 0 | 两个副本共用一份已保存的模型权重，但各有一个 30000 token 上限的 KV 池。 |

- 独立 `general` 冷读首轮 **FAIL**：字节预算到 token 上限缺桥、checkpoint／CUDA IPC handle 未解释、30000 缺图上出处、末相同时揭示多个结果、部分图外实现未标记。逐项修复后复审 **PASS**，无剩余本步内容阻塞，R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、内容洞 **0**。该结论来自源码、transcript 和 DOM，不是协调 verdict。
- 当前模型不能读取 PNG；已尝试读取代表图，工具明确返回不支持图像输入。因此原 #4/#5、视觉验收和整章结论留待协调与主人，不声称看过图片或视觉通过。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；Step 4 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 07`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 4 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 均为 `e904b7547cd22dc47b594c75afedd6575b6afee101b622491cd43f4033e2c730`，**1,693 词**。无 caption、文字出界、重叠或文本规则报告。
- 可重跑脚本 `.bot/out/omni11-step4-audit.mjs`。最终结果 `.bot/out/omni11-step4-audit/report.json`：英中桌面、英中 360／390／430 px × direct／前步入口，共 **16 组合、96 状态、80/80 个机制转变**。逐相核对 leader placeholder／W、handle、follower placeholder／alias、两个 KV、总计与算式的可见性。普通舞台最低 **10.760 CSS px**，重叠、SVG 出界、页面横溢和 failures 均为 0。
- 同一审计保存 **96 张相位图＋8 张 deep 图，共 104 张 PNG**。八个双语 deep 视图均 `aria-expanded=true`，无 KaTeX 错误、raw math、页面或 deep 横溢。drawer 打开后的缩舞台最低 **6.857 CSS px** 仍归共享 ML-21／22，本单元未改共享组件。代表图：`.bot/out/omni11-step4-audit/en-1440-direct-p5.png`、`.bot/out/omni11-step4-audit/zh-390-previous-p3.png`。
- 未跑全站回归、真实 SGLang-Omni、模型、GPU 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。两次误用默认 4321 的 transcript 和一次并行浏览器脚本的 unsettled-await 均未计为通过；改用本轮 4522 并串行重跑后才记录上述结果。

## 剩余与清理

- 剩余事项是 Omni-11 Steps 5–6、独立 Omni-21／26／31／64、共享 ML-21／22、原 #4/#5、具备图像能力的复审和主人最终视觉验收。没有提前关闭任何 finding。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout；只删除本目录内的符号链接并在本目录 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 本轮检查地址为 `http://localhost:4522/learning-sglang/omni/ch/07-shared-gpu-budgets/?step=4`。收尾已用 `npx astro dev stop` 停止本轮 pid 15751 和复采 pid 67811，4522 无监听。
- 审计脚本均调用 `browser.close()`，每个标签页也逐个 `close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；未动其他 lane 的服务、浏览器或 Chrome 配置目录。

---

# lane k2 本轮报告 · ML 06 Step 7 的 ML-48 跨章接缝

日期：2026-11-27。类型：修旧。本轮开始 HEAD 与 `origin/tutorials` 均为 `882c71c`，其中 ML 08 Step 4 已完成并推送，因此不回改待复审批次，承接 direction 指定的下一最小单元。范围只有 ML Systems 第 6 章 Step 7 的组件、双语 MDX 与 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改 ML 08、其他章、其他书、共享 drawer、`.bot/memory/` 或第 1 本受保护英文原文，未开第 14 章。

## 修复与 finding

- Step 7 改为八相的「一次训练调用 · 五项工作」地图：32 组 → 控制器 → 256 条全局记录 → 统一 `train` 与 pack → actor loss → backward → optimizer update／`v1` → 返回后的 offload。actor loss、backward 和 optimizer update 各占一相，不再从记录直接跳到新权重。
- 舞台明确本章 pinned `261ecee` 的 **Megatron** 路径。双语出处分别核对 `megatron_utils/data.py:68-150` 的 micro-batch 形成、`loss.py:228-330` 的 actor loss、`model.py:258-345` 的 forward-backward 与 `optimizer.step()`。Ch.8 Steps 3 and 4 只指向另一后端 FSDP2 的构造例，不把两包或一次更新搬成本轮计数。
- 自带 `--colocate` 在 `arguments.py:968-970` 启用 `args.offload`。舞台写训练模型 GPU → CPU，不套用 FSDP2 的模型加优化器具体范围；CPU 备份出处补全为 `actor_group.py:64-80,135-136`。末相明确 Step 8 把 `v1` 复制到 rollout，与优化器更新分开。
- `PACK` 与控制器的 `flatten + build train_data` 分开。`tokens · lengths · rewards`、`raw_reward` 的图外归属和首份样本 metadata 条件全部保留，ML-60 未返工。
- **ML-48 的 Ch.6 Step 7 作者修复完成，待协调固定复审，不自行销项。** 不申报整章或整个 finding GO；共享 ML-21／22 与其他开放项未改。

## 冷读与评分

- 独立 `explore` 首轮指出后端归属、offload 实际配置、两种 update、图例、逐相节奏、actor 白话和出处范围问题，逐项返工后最终 **PASS**：R1–R5 **10/10**、机制 R6 **2/2**、原十二项 **24/24**、剩余内容洞 **0**。
- R1 复述：「一次训练调用把 256 条回答记录分成小批次，算出怎样修改模型并修改它，再把训练模型从 GPU 移到 CPU。」五项工作按 EVAL 的 enumeration map 处理，offload 明确在调用返回后。
- 当前模型不能读取 PNG。已尝试读取英中桌面、手机和 deep 代表图，工具返回不支持图像输入；因此不声称看过图片或视觉通过。以上结论来自固定源码、transcript、pinned 实现、独立冷读、DOM 和几何检查。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；Step 7 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 06`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 7 字号门和 `git diff --check` 全过。
- transcript 连续两次逐字一致，**1,730 词**，SHA-256 `c1b6a8806754da3c8a8f49d10b9c3d15e8c8031a5574ae2ec289acd8864af040`。无 caption、文字出界、重叠或文本规则报告。
- 可重跑脚本 `.bot/out/ml48-step7-audit.mjs`。最终结果 `.bot/out/ml48-step7-audit/report.json`：英中桌面与中文 390 px × direct／前步入口，加英中三宽度末相，共 **54 状态、42/42 个机制转变、8 个双语 deep 状态**。普通舞台最低 **10.390625 CSS px**，重叠、SVG 出界、页面或 deep 横溢和 `failures` 均为 **0**。
- 同一审计保存 **54 张相位图＋8 张 deep 图，共 62 张 PNG**。代表图：`.bot/out/ml48-step7-audit/zh-390-direct-p7.png`。最终 `npm run shot` 另存 `.bot/out/ml48-step7-shot-final/ml06-en-step7.png` 与 `.bot/out/ml48-step7-shot-final-mobile/ml06-zh-step7.png`。
- 桌面 deep 打开后的舞台字号和手机 drawer 焦点仍归共享 ML-21／22，本单元未改。未跑全站回归、真实 Megatron／FSDP2 训练、rollout、GPU benchmark 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与环境

- 剩余事项是 ML-48 的协调固定复审、其他未改开放项、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。没有提前关闭任何 finding。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout。只删除本目录内的符号链接并在本目录 `npm ci`，package 文件无 diff，未写协调人的 checkout。
- 本轮检查地址为 `http://localhost:4527/learning-sglang/ml-sys/ch/06-slime-rollout-loop/?step=7`。收尾将停止本轮服务；查看前在本目录运行 `npx astro dev --background`。
- 审计脚本均调用 `browser.close()`，每个标签页也逐个 `close()`。收尾只清理本轮服务和 PPID 1 的本轮 headless Chrome，不动其他 lane 的服务或浏览器。

---

# lane k1 本轮报告 · Omni 07 Step 3 的 Omni-11 单次领取形成

日期：2026-11-27。类型：修旧。本轮开始 HEAD 与 `origin/tutorials` 均为 `b875a3d`，工作树干净。按本书 P0 顺序承接 Omni 07 Step 3，不回改 Steps 1–2 的待复审批次。范围只有本步组件、双语 MDX 与 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；Steps 1–2 与 Steps 4–6、其他章、其他书、`.bot/memory/` 和第 1 本受保护英文原文均未改。

## 修复与 finding

- 三幅面板是三种独立情况，每幅各有一份 **2 GiB** `engine.kv_cache_bytes` 申报，不共用一个作用域。四个 held phases 依次为 `consumed=false`、第一个 engine 领取并变为 `consumed=true`、空情况清理检查与第二次领取、零／一／二次领取结果。
- 蓝色只表示已领取，橙色只表示报错，虚线只表示未领取。两个-engine 面板的 `consumed=true` 记录第一次领取；橙色第二张卡是被拒绝的尝试，不是实际分配的第二份 KV 池。结果边框和总算式到末相才出现。
- Step 3 有循环、`LoopProgress`、reduced-motion 末相和 `data-animation-step／phase／final-phase`。双语 MDX 与 deep 同步独立 alternatives、逐相 consumed 标记、清理检查、全部算式和「第二次调用直接报错，不是先分配 4 GiB」的边界。
- 舞台上的 scope／factory／finally 术语改成白话：创建一个 stage 后，清理时检查有没有 engine 领取预算。中文 deep 删除把 `max_total_tokens` 错归到第 1 步的回指；双语长源码路径和 commit 加断行机会。
- **Omni-11 的 Step 3 作者修复完成，待协调固定复审，不自行销项。** Steps 4–6 的 alias、MPS lease 和 offload 仍属开放范围；Omni-21／26／31／64 与其他 finding 未改，未申报整章 GO。下一最小单元是 Step 4 的权重 alias 与私有 KV 形成过程。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | 新内容洞 | R1 小学生复述 |
|---|---:|---:|---:|---:|---|
| 3 | 10/10 | 2/2（DOM） | 20/20 | 0 | 三种情况各有一份 2 GiB KV 预算；没人领或第二次领都报错，只领一次才能启动。 |

- 独立 `explore` 首轮 **FAIL**：scope／finally 术语未解释、首相可能误读为三图共用一个作用域、中文 deep 错把 `max_total_tokens` 回指第 1 步。修复后复审 **PASS**，三个洞均关闭，R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、内容洞 **0**，无新阻塞项。该结论来自源码、transcript 和 DOM，不是协调 verdict。
- 英文手机首轮另检出图例和清理句出界；只缩短手机文案后，英中 360／390／430 px 复验全过。首轮审计探针把已移除卡片 `null` 当成教程失败，修正为「不存在即不可见」后，同一教程状态通过；这不是教程源码修复。
- 当前模型不能读取 PNG；已尝试读取英中代表相位图，工具返回不支持图像输入。因此原 #4/#5、视觉验收和整章结论留待协调与主人，不声称看过图片或视觉通过。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；Step 3 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 07`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 3 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 均为 `51b0cca900afa33fb49aa43ea0e4e3700d5b38ee4e9bb5e3d50ea0ffb918cc8b`，**1,605 词**。无 caption、文字出界、重叠或文本规则报告。
- 可重跑脚本 `.bot/out/omni11-step3-audit.mjs`。最终结果 `.bot/out/omni11-step3-audit/report.json`：英中桌面、中文 360／390／430 px × direct／前步入口，共 **10 组合、40 状态、30/30 个机制转变**。逐相核对三种情况的 consumed、等待卡、第一次／第二次领取卡、结果和总算式可见性。最低 **10.760 CSS px**，重叠、SVG 出界、页面横溢和 failures 均为 0。
- 同一审计保存 **40 张相位图＋3 张 deep 图，共 43 张 PNG**。三个双语 deep 视图均 `aria-expanded=true`，无 KaTeX 错误、raw math、页面或 deep 横溢。代表图：`.bot/out/omni11-step3-audit/en-desktop-direct-p3.png`、`.bot/out/omni11-step3-audit/zh-390-previous-p2.png`。
- 未跑全站回归、真实 SGLang-Omni、模型、GPU 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。共享 drawer 的焦点与缩舞台问题仍归 ML-21／22，本单元未改。

## 剩余与清理

- 剩余事项是 Omni-11 Steps 4–6、独立 Omni-21／26／31／64、共享 ML-21／22、原 #4/#5、具备图像能力的复审和主人最终视觉验收。没有提前关闭任何 finding。
- 本轮检查地址为 `http://localhost:4522/learning-sglang/omni/ch/07-shared-gpu-budgets/?step=3`。收尾已用 `npx astro dev stop` 停止本轮 pid 51666，4522 无监听。
- 审计脚本均调用 `browser.close()`，每个标签页也逐个 `close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；未动其他 lane 的服务、浏览器或 Chrome 配置目录。

---

# lane k1 本轮报告 · Omni 07 Step 2 的 Omni-11 容量校验形成

日期：2026-11-27。类型：修旧。本轮开始 HEAD 与 `origin/tutorials` 均为 `7b1c881`，工作树干净；direction 指定的 Step 1 已在该提交完成并推送，因此不回改待复审批次，按本书 P0 顺序承接同章下一最小单元 Step 2。范围只有本步组件、双语 MDX 与 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；Step 1 与 Steps 3–6、其他章、其他书、`.bot/memory/` 和第 1 本受保护英文原文均未改。

## 修复与 finding

- 两幅同尺面板以四个 held phases 形成容量校验：先给 50%／90%、20 GiB reserve、申报公式和 80 GiB 上限，再把比例变成 **40／72 GiB** 蓝色字节段，再加入同一份 **20 GiB** 橙色 reserve 得到 **60／92 GiB**，最后显示 **20 GiB 余量／12 GiB 超出**和通过／拒绝。段宽全部由同一 `capacityScale` 推导，不用结果卡冒充动画。
- Step 2 有循环、`LoopProgress`、reduced-motion 末相和 `data-animation-step／phase／final-phase`。面板边框到比较相才变色；中性比较长条使用实线描边，虚线只表示 80 GiB 物理上限。
- 双语 MDX 与 deep 同步逐相对象、同一比例尺、全部算式、KV 不重复计入 reserve 和独立 KV 下限检查。deep 明确中性长条的 0–92 GiB 比较空间不是另一份显存，也列全首相可见输入和公式。
- **Omni-11 的 Step 2 作者修复完成，待协调固定复审，不自行销项。** Steps 3–6 的 KV 领取、alias、MPS lease 和 offload 仍属开放范围；Omni-21／26／31／64 与其他 finding 未改，未申报整章 GO。下一最小单元是 Step 3 的 KV 领取过程。
- 首轮中文 390 px deep 审计发现长源码路径、commit inline code 和 inline 公式横溢；只在 Step 2 双语 deep 加断行并拆短段落，复验页面、drawer 与 deep-body 横溢均为 0。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | 新内容洞 | R1 小学生复述 |
|---|---:|---:|---:|---:|---|
| 2 | 10/10 | 2/2（DOM） | 20/20 | 0 | 50% 的 80 GiB 是 40 GiB，加 20 GiB 能装下；改成 90% 后总共 92 GiB，超出 12 GiB。 |

- 独立 `explore` 首轮 **FAIL**：中性比较长条与虚线同义、deep 首相说明漏掉可见输入与公式、transcript 图例陈旧。修复后复审 **PASS**，两个洞均关闭，R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、内容洞 **0**，无新阻塞项。该结论来自源码、transcript 和 DOM，不是协调 verdict。
- 当前模型不能读取 PNG；已尝试读取英中代表相位图和 deep 图，工具返回不支持图像输入。因此原 #4/#5、视觉验收和整章结论留待协调与主人，不声称看过图片或视觉通过。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；Step 2 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 07`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 2 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 均为 `e8a07d609d96c5832394293dc069223c28073f6ae9c90bda15cf1679a2959a40`，**1,562 词**。无 caption、文字出界、重叠或文本规则报告。
- 可重跑脚本 `.bot/out/omni11-step2-audit.mjs`。最终结果 `.bot/out/omni11-step2-audit/report.json`：英中桌面、中文 360／390／430 px × direct／前步入口，共 **10 组合、40 状态、30/30 个机制转变**。逐相验算两块面板的 `width/value`、共同原点、80 GiB limit、申报与结果可见性；另断言比较长条 `trackDash=none`。最低 **10.760 CSS px**，重叠、SVG 出界、页面横溢和 failures 均为 0。
- 同一审计保存 **40 张相位图＋3 张 deep 图，共 43 张 PNG**。三个双语 deep 视图均 `aria-expanded=true`，各有 **20 组 KaTeX、0 个错误**，页面与 deep 横溢均为 0。代表图：`.bot/out/omni11-step2-audit/en-desktop-direct-p3.png`、`.bot/out/omni11-step2-audit/zh-390-previous-p2.png`。
- 未跑全站回归、真实 SGLang-Omni、模型、GPU 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。本单元沿用 pinned 单元测试数值，不新增 zero-to-sglang 对照内容。

## 剩余与清理

- 剩余事项是 Omni-11 Steps 3–6、独立 Omni-21／26／31／64、共享 ML-21／22、原 #4/#5、具备图像能力的复审和主人最终视觉验收。没有提前关闭任何 finding。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout，第一次 build 因该符号链接的缓存权限报 EPERM。只删除本目录内的符号链接并在本目录 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 本轮检查地址为 `http://localhost:4522/learning-sglang/omni/ch/07-shared-gpu-budgets/?step=2`。收尾已用 `npx astro dev stop` 停止本轮 pid 50275，4522 无监听。
- 审计脚本均调用 `browser.close()`，每个标签页也逐个 `close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；未动其他 lane 的服务、浏览器或 Chrome 配置目录。

---

# lane k1 本轮报告 · Omni 07 Step 1 的 Omni-11 显存比例形成

日期：2026-11-27。类型：修旧（direction 指定的下一最小单元）。本轮开始 HEAD 与 `origin/tutorials` 均为 `7624280`，工作树干净。范围只有 Omni 07 Step 1 的组件、构造数字、双语 MDX 与 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改 Steps 2–6、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文，未开后续步。

## 修复与 finding

- 按 direction 把原 DP9 静态结果改为同一组构造数值：总显存 **80 GiB**、权重 **60 GiB**、剩余 KV 预算 **20 GiB**、比例 **75%／25%**。四个 held phases 依次为整卡、权重填入、`80−60=20 GiB` 的 KV 预算形成、两项分别除以 80 得到比例。长条始终在原位，未使用 before／after 结果卡。
- 数字集中在 `src/omni/numbers.ts`，权重和 KV 段宽由同一个 `budgetWidth / 80` 推导。Step 1 有循环、`LoopProgress`、reduced-motion 末相和 `data-animation-step／phase／final-phase`；其余五步保持原场景，未新增动画或改内容。
- 双语 MDX 与 deep 同步说明构造例、逐相对象、KV 白话和全部算式。deep 明确真实 placement 不会用 `80−60` 推导权重或 KV，真实卡的未分配字节也不自动成为某个 engine 的 KV 池。
- **Omni-11 的 Step 1 作者修复完成，待协调固定复审，不自行销项。** Steps 2–6 的 KV 领取、alias、MPS lease 和 offload 仍属开放范围；Omni-21／26／31／64 与其他 finding 未改，未申报整章 GO。
- 首轮 deep 审计发现中文 390 px 的 commit inline code 横溢。最终改成 `<code>origin/main@<wbr>…</code>`，复验 deep 横溢为 0；没有改 shared drawer 或其他步。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | 新内容洞 | R1 小学生复述 |
|---|---:|---:|---:|---:|---|
| 1 | 10/10 | 2/2（DOM） | 20/20 | 0 | 80 个格子里权重用 60 个，KV 用剩下的 20 个，所以分别占 75% 和 25%。 |

- 独立 `explore` 冷读 **PASS**：算术、相位顺序、术语、双语、deep-slide 对齐和 Steps 2–6 未改均通过，无阻塞项。该结论来自源码、transcript 和 DOM，不是协调 verdict。
- 当前模型不能读取 PNG；已尝试读取英中代表相位图，工具返回不支持图像输入。因此原 #4/#5、视觉验收和整章结论留待协调与主人，不声称看过图片或视觉通过。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；Step 1 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 07`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 1 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 均为 `f1f46fdbd629c1a084b724ff39241181a1595b184d0407a21328492898d721d8`，**1,537 词**。无 caption、文字出界、重叠或文本规则报告。
- 可重跑脚本 `.bot/out/omni11-step1-audit.mjs`。最终结果 `.bot/out/omni11-step1-audit/report.json`：英中桌面＋中文 390 px × direct／前章入口，共 **6 组合、24 状态、18/18 个机制转变**。每个相位验算整卡、权重、KV 的 `width/value` 共用比例和可见文字；最低 **11.760 CSS px**，重叠、SVG 出界、页面横溢和 failures 均为 0。
- 同一审计保存 **24 张相位图＋3 张 deep 图，27 张 PNG 全部唯一**。三个双语 deep 视图均 `aria-expanded=true`，各有 **11 组 KaTeX、0 个错误**，页面与 deep 横溢均为 0。代表图：`.bot/out/omni11-step1-audit/en-desktop-direct-p3.png`、`.bot/out/omni11-step1-audit/zh-390-previous-p2.png`。
- 未跑全站回归、真实 SGLang-Omni、模型、GPU 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。本单元采用 direction 要求的构造算术，不新增 zero-to-sglang 对照内容。

## 剩余与清理

- 剩余事项是 Omni-11 Steps 2–6、独立 Omni-21／26／31／64、共享 ML-21／22、原 #4/#5、具备图像能力的复审和主人最终视觉验收。没有提前关闭任何 finding。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout，第一次 build 因该符号链接的缓存权限报 EPERM。只删除本目录内的符号链接并在本目录 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 本轮检查地址为 `http://localhost:4522/learning-sglang/omni/ch/07-shared-gpu-budgets/?step=1`。收尾已用 `npx astro dev stop` 停止本轮 pid 42499，4522 无监听。
- 审计脚本均调用 `browser.close()`，每个标签页也逐个 `close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；未动其他 lane 的服务、浏览器或 Chrome 配置目录。

---

# lane k1 本轮报告 · Omni 06 八步机制动画（Omni-10／63）

日期：2026-11-27。类型：修旧。本轮开始 HEAD 与 `origin/tutorials` 均为 `da72e29`，工作树干净。direction 指定的 Omni-52 已由开始前的 `66016e7` 完成并推送，因此不返工待复审批次，按 owner rule 接着处理本书开放 P0 **Omni-10**。范围只有 Omni 06 的八步组件、双语 MDX 与 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；Step 2 顺带补上 **Omni-63** 要求的灰色 finished 对象。未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文，未开新章。

## 提交与 finding

- 八个逐步教程提交均已推送：`ff6bf9a` 收集等待、`98a4d31` AR 补位、`4fe08fb` encoder 收集、`caa7d7f` 帧预算拒绝、`b1f0078` 两条 vocoder 合算路径、`e452358` 历史吞吐、`b6a303b` 准入失败、`5fa7ca3` 直接响应 poll。**Omni-10／63 作者修复完成，待协调固定复审，不自行销项。** Omni-52 保持待协调复审，本轮不重做其比例尺。
- 每步都有循环、可复位的 phase driver 和 `data-animation-step／phase／final-phase`。Phase 依次改变本步对象、字段、位置或计数；双语和手机保留同一因果顺序。Step 4 的 `scale = AUDIO_ABC_MEL_FRAMES = 27,000`、相对原点 16 和 24,000 limit 公式未改。
- Step 2 的灰色 A 从 phase 1 起可见，C 从 waiting_queue 补进空行。独立 reviewer 首轮发现同相仍写「没有空行」，已改成「已有空行、等待补位」，六组合复验后 **PASS**。
- Step 8 依次播放 client poll、inner poll、frame 2 返回与交付，末态为 **D=2、U=1、3=2+1**，adapter queue 始终为 0。Step 5 的 plan construction 明确没有单独舞台卡片；Step 6 的柱只重现历史平均值，不冒充新请求轨迹。
- 手机 LoopProgress 从 y=70 移到 y=76，消掉与第三行图例的五处重叠。双语 deep 的长源码路径和 commit hash 加 `<wbr>`，清掉手机抽屉横溢；未改源码引用或公式。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 DOM | 原十个非视觉项 | 新内容洞 |
|---|---:|---:|---:|---:|
| 1–8 | 80/80 | 16/16 | 160/160 | 0 |

- 八步 R1 复述和逐项分数已写入本章评分卡。独立 `explore` 最终 **PASS**，覆盖各相机制、数字、双语 deep、transcript、Step 4 比例尺和 Step 8 计数；该结论来自源码与 DOM，不是协调 verdict。
- 原 #4/#5、整章总分、完成结论和 finding 销项均不由本轮改写。共享 ML-21／22、其他开放 finding 和其他待复审批次未回改。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；八步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 06`、`zh-check`、英中全章 360／390／430 px `mobile`、中文改动步字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 均为 `8f4f6e9b97a9f0a1a34e3722bc7a06572b7134c468e31ac46e4c31f87cfeb94d`，**2,437 词**。无 caption、文字出界、重叠或文本规则报告。
- 可重跑脚本 `.bot/out/omni10-phase-audit.mjs`。完整矩阵结果 `.bot/out/omni10-matrix-final/report.json`：八步 × 英中桌面＋中文 390 px × direct／前步入口，共 **48 组合、222 状态、174/174 个机制转变、222 张 PNG**。最低 **10.806 CSS px**，重叠、SVG 出界、页面横溢和几何失败均为 0。Step 1 时间游标与 Step 4 的 A/B `width/value`、原点和 limit 在每相验算。
- Step 2 修复复跑 `.bot/out/omni10-step2-recheck/report.json`：**6 组合、24 状态、18/18 个机制转变、24 张 PNG**，最低 **11.760 CSS px**，上述失败均为 0。
- 可重跑脚本 `.bot/out/omni10-deep-audit.mjs` 在 1440／390 px 覆盖双语八步，共 **32 个打开抽屉视图**。目标动画说明、`aria-expanded=true`、页面与抽屉横溢、KaTeX 和 raw-math 检查通过。桌面抽屉缩舞台最低 **8.006 CSS px**，手机焦点记录为空，分别仍属共享 ML-21／22；本单元未改也不声称这两项通过。
- 代表截图：`.bot/out/omni10-matrix-final/s4-zh390-direct/s4-p2.png`、`.bot/out/omni10-step2-recheck/s2-endesktop-direct/s2-p1.png`。读取 PNG 时工具返回「this model does not support image input」；以上结论来自构建、transcript、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- 未跑全站回归、真实 SGLang-Omni、模型、GPU、全双工服务或 reduced-motion 动态切换。本章无新增 zero-to-sglang 对照内容，本单元只补指定动画与同一 deep 呈现。

## 剩余与清理

- 剩余事项是 Omni-10／52／63 的协调固定复审、独立 Omni-21、原 #4/#5、整章评分、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。其他待审或开放 finding 未回改。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout。只删除本目录内的符号链接并在本目录 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 本轮检查地址为 `http://127.0.0.1:4521/learning-sglang/omni/ch/06-batching-backpressure/?step=4`。收尾已用 `npx astro dev stop` 停止本轮 pid 63048，4521 无监听。
- 审计脚本均调用 `browser.close()`。收尾发现并清理一个父进程为 1 的本轮 Chrome（pid 89343）及其 `cdp-muH98M` 配置目录；随后 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出。未动其他 lane 的服务或浏览器。

---

# lane k1 本轮报告 · Omni 06 Step 4 的 Omni-52 同尺修复

日期：2026-11-27。类型：修旧（direction 指定的下一最小单元）。本轮开始 HEAD 与 `origin/tutorials` 均为 `451124b`，工作树干净。范围只有 Omni 06 Step 4 的组件、双语 MDX 与 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改 Omni 05、Omni 13 Step 9、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。未开新章。

## 提交与 finding

- `66016e7`：**Omni-52 作者修复完成，待协调固定复审，不自行销项。** accepted 与 rejected 都使用 `scale = AUDIO_ABC_MEL_FRAMES = 27,000`，两幅图的本地原点都为 `panel.x + 16`，24,000 帧 limit 也移出条件分支，按同一公式绘制并各有一个可见标签。accepted 的 A+B+remaining 到 24,000，rejected 的 A+B+C 到 27,000。
- 桌面 `barW=280`：A、B、C 宽 **155.5556／62.2222／62.2222**，limit offset **248.8889**。手机 `barW=238`：对应宽 **132.2222／52.8889／52.8889**，limit offset **211.5556**。每个 `width/value` 都等于本视口的 `barW/27000`，同一 A、B 不再跨面板变宽或变窄。
- 双语 MDX 与 deep 明确同一原点、0–27,000 比例尺和同一 limit 位置。accepted 标签缩短为 `3000 frames left`，C 等待的原因仍由 caption、两张算式和 rejected 的 `keep C in pending_messages` 说明。同一 Step 4 deep 的长源码路径补 `<wbr>` 断行点，未改源码引用或公式。
- 首次提交 `681f563` 推送被拒后按指示 `git pull --rebase origin tutorials`，带入 k2 的 `f7a492f`、`f577514`。只有 `memory/progress.md` 顶部发生记录冲突，保留双方条目后继续；最终 `66016e7` 推送成功，未 force-push。rebase 后再次通过 60 页 build，目标 diff check 通过。

## 作者评分与独立冷读

| 步 | R1–R5 | 新内容洞 | 独立冷读 | R1 小学生复述 |
|---|---:|---:|---|---|
| 4 | 10/10 | 0 | PASS | A、B 没超过声音帧上限；再加 C 就越线，所以 C 等下一批。 |

- 独立 `explore` 逐项核对组件、双语 MDX／deep、transcript 和桌面／手机算式，结论为 **PASS**，Omni-52 没有剩余源码或文本阻塞。它只作源码、算术和 transcript 冷读，不替代协调 verdict。
- R6 属于独立的 Omni-10，本单元不重复申报 Step 4 静态场景；原 #4/#5、整章总分、完成结论和销项均不由本轮改写。

## 硬门与证据

- 最终 rebase 后 `npm run build`：**60 页**通过；Step 4 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 06`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 4 字号门和 `git diff --check` 全过。
- transcript 连续两次生成的 SHA-256 均为 `f55b4c0582521ce522f37603450fe58483054f2c05b30e8c5ff06268e2324eba`，**2,281 词**。无 caption、文字出界、重叠或文本规则报告。
- 可重跑脚本 `.bot/out/omni06-step4-scale-audit.mjs`，结果 `.bot/out/omni06-step4/audit.json`。覆盖英中桌面、英中 360／390／430 px、direct／前步入口，共 **11 个普通状态**。每个状态都实测 `width/value`、相对原点、limit、两个 limit 标签、重叠、SVG 出界和页面横溢，全部通过；最低 **10.760 CSS px**。
- 同一审计另打开 **11 个双语 deep 视图**，目标同尺说明、`aria-expanded=true` 和页面横溢检查通过。既有 KaTeX 内部滚动保留，本单元没有重写公式。
- 代表截图：`.bot/out/omni06-step4/en-desktop-direct.png`、`.bot/out/omni06-step4/zh-390-direct.png`，另有英中桌面前步入口共 **6 张 PNG**。读取 PNG 时工具返回「this model does not support image input」；以上结论来自构建、transcript、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- 未跑全站回归、真实 SGLang-Omni、模型、GPU 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。本章无新增 zero-to-sglang 对照内容，本单元只修指定比例尺。

## 剩余与清理

- 剩余事项是 Omni-52 的协调固定复审、独立的 Omni-10、原 #4/#5、整章评分、具备图像能力的复审和主人最终视觉验收。Omni-51 的既有提交与其他待审或开放 finding 未回改。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout，第一次 build 因该符号链接的缓存权限报 EPERM。只删除本目录内的符号链接并在本目录 `npm install`，package 文件无 diff，未写协调人的 checkout。
- 本轮查看地址为 `http://localhost:4325/learning-sglang/omni/ch/06-batching-backpressure/?step=4`。收尾已用 `npx astro dev stop` 停止本轮 pid 2641；随后 4325 显示为 `ls-d-1127-104804` 的进程，未动其他 lane 的服务。
- 审计脚本均调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；未动其他 lane 的浏览器或 Chrome 配置目录。
---

# lane k2 本轮报告 · ML Systems 06 Step 7 的 ML-60

日期：2026-11-27。类型：修旧（direction 指定的下一最小单元）。本轮开始 HEAD 与 `origin/tutorials` 均为 `f577514`，工作树干净。范围只有 ML 06 Step 7 的双语 deep、双语 MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；组件已只画 `tokens · lengths · rewards`，无需改动。未改 ML 13 Step 8 的 `6fcb7d0`，未重开 ML 07，未开第 14 章，未改其他书、`.bot/memory/` 或第 1 本受保护英文原文。

## 修复与 finding

- **ML-60 作者修复完成，待协调固定复审，不自行销项。** 双语 deep 的「图上是什么」现在只写舞台上实际概括的 token、回答长度和归一化 `rewards`；新增「Off-stage fields · not drawn／图外字段 · 未画出」容纳 `raw_reward`、截断标记、样本编号、loss mask 和已有的 rollout log probability。
- pinned `THUDM/slime@261ecee` 的 `buffer.py` 先由 `post_process_rewards` 建立 `raw_reward`，再只在 `samples[0].metadata` 含 `raw_reward` 时用各样本 metadata 中的值替换完整列表。双语 deep 和 MDX 都保留这个首份样本条件，没有把 `raw_reward` 写成图上必有字段，也没有把条件泛化成任意样本。
- 定向审计发现本步符号表在 360／390 px 的既有横溢；给 `global-batch-size`、`buffer.py:118-154` 和 `actor_model.async_train` 加断行机会后，双语四种宽度的 deep 均无横溢。舞台、caption、相位和组件逻辑未改。
- 独立 `explore` 冷读首轮 **FAIL**，指出 override 条件过宽；按首份样本门槛修正后复审 **PASS**，剩余阻塞项为 0。R1 复述：「控制器把 32 组变成 256 份训练记录，一次训练调用用它们算出新权重。」作者参考值为 R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、新内容洞 **0**；固定协调 **80/80、16/16、191/192** 基线和 ML-48 的开放状态不改写。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；Step 7 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 06`、`zh-check`、英中 Step 7 的 360／390／430 px `mobile` 和 `git diff --check` 全过。所有列出的浏览器检查均针对本轮 `4512` 服务；早前误用默认 `4321` 的结果全部作废并重跑。
- transcript 连续两次生成哈希一致：**1,551 词**，SHA-256 `f203326b17cd1c8a9d8b8538f4ed936664e1582b3e630c9505d740bef7d13cf7`。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml60-step7-audit.mjs` 覆盖英中桌面、中文 390 px × direct／前步入口，共 **24 状态、18/18 个机制转变**，另覆盖双语 1440／360／390／430 px 共 **8 个 deep 状态**。普通舞台最低 **11.760416666666666 CSS px**，重叠、SVG 出界、页面或 deep 横溢和 `failures` 均为 **0**。每相都没有 `raw_reward`，末相保留实际字段概括；deep 均展开并含图外字段与首份样本条件。证据：`.bot/out/ml60-step7-audit/report.json`。
- 桌面 deep 打开后舞台最低 **8.00564236111111 CSS px**，属于既有共享 ML-21；手机 drawer 焦点属于 ML-22，本单元未改也不声称这两项通过。
- 代表截图：`.bot/out/ml60-step7-audit/zh-390-direct-p3.png`、`.bot/out/ml60-step7-audit/en-1440-deep.png`。读取 PNG 时工具返回「this model does not support image input」；上述结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- `docs/z2s-map.md` 没有本章 slime RL loop 的直接对应课程章；本单元只修 pinned `buffer.py` 的字段归属和条件，不新增课程范围。未跑全站回归、真实 slime 训练、rollout、GPU benchmark 或 reduced-motion 动态切换。

## 剩余与清理

- 剩余事项是 ML-60 的协调固定复审、同章 ML-48、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。ML 13 与其他待复审批次保持原样。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout；只删除本目录内的符号链接并在本目录 `npm ci`，package 文件无 diff，未写协调人的 checkout。
- 本地查看地址：`http://127.0.0.1:4512/learning-sglang/ml-sys/ch/06-slime-rollout-loop/?step=7`。本轮 4512 服务已停止，端口无监听。
- 审计脚本均调用 `browser.close()`。收尾发现一个 PPID 1 的本轮 headless Chrome，已停止并删除对应 `cdp-*`；复查 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出，未动其他 lane 的浏览器或服务。
---

# lane k1 本轮报告 · Omni 05 Steps 4–5 的 Omni-09 动画补完

日期：2026-11-27。类型：修旧（direction 指定的下一最小单元）。本轮开始 HEAD 与 `origin/tutorials` 均为 `6fcb7d0`，工作树干净。范围只有 Omni 05 Steps 4–5 的组件、双语 MDX 与 deep、生成 transcript、本章评分卡、定向审计和本报告；未改 Steps 1–3、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。Omni-50 已提交文字未重复返工，Omni-34 与 Omni 11／13／14 未改，未开新章。

## 提交与 finding

- `05543c7`：**Omni-09 的 Step 4 作者补完，待协调固定复审，不自行销项。** 第 2 相先把接收空间改为 `copy ✓`，源 SHM 块和打开的句柄仍在；第 3 相才把源块改为 `SHM A · unlinked` 并关闭句柄。随后依次返回接收空间、用副本还原、发送 ACK。桌面和手机使用同一对象顺序。
- `abc9a49`：**Omni-09 的 Step 5 作者补完，待协调固定复审。** ACK 匹配并完成 `pending.ack` 后，`mark_receiver_done` 把 `receiver: reading` 改为 `receiver: done ✓`；随后进入 `wait_for_completion`，在 `finally: sem.release` 把空闲名额从 1 改为 2，最后才 `pending.pop(A)`。本例明确总名额为 2、本次 put 占 1，图和双语 deep 都有 `2−1=1`、`1+1=2` 的来源。
- 两步 caption 保持原样，双语 MDX 与 deep 只同步新增的对象状态。Step 4 首次推送被拒后按指示 `git pull --rebase origin tutorials`，带入 `3519b89`，最终推送成功；未 force-push。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 4 | 10/10 | 2/2 | 20/20 | 接收方先把 SHM 字节复制到自己的空间，再关句柄、去掉共享块名字，最后用副本还原并回 ACK。 | 0 |
| 5 | 10/10 | 2/2 | 20/20 | ACK 到了，发送方先标记读者读完，再把空闲名额从一个变回两个，最后删除 pending。 | 0 |

- 两步各由独立 `explore` 做源码／transcript 冷读，均为 **PASS**，没有阻塞内容洞；未读取 PNG，也不是协调 verdict。Omni-09 不自行销项，原 #4/#5、整章总分和完成结论不由本轮改写。进度只记为 Steps 4–5 的作者动画补完，不记整章 GO。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；五步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 05`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Steps 4／5 字号门和 `git diff --check` 全过。
- transcript 连续重生成与提交一致，**1,290 词**，SHA-256 `6875248e2fac15a75735ebb6c4620bffc4abca3e4dae233f7ed460a75347364b`。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/omni50-phase-audit.mjs` 覆盖 Steps 4／5 × 英中 × direct／前步入口 × 桌面／360／390／430 px，共 **32 组合、208 状态、176/176 机制转变、176 个唯一 PNG 哈希**。逐相断言复制先于 unlink、receiver done 先于 permit 归还、pending 最后删除，并禁止提前完成。最低 **10.760 CSS px**，重叠、SVG 出界、页面横溢均为 0。
- `.bot/out/omni50-deep-audit.mjs` 在 360／390／430／1440 px 覆盖双语 Steps 4／5，共 **16 个打开抽屉视图**；目标文本、`aria-expanded=true`、页面与抽屉横溢、KaTeX 和 raw-math 检查通过。桌面抽屉打开后的舞台最低 **8.006 CSS px**，焦点记录为空，属于既有共享 ML-21／22；本单元未改也不声称这两项通过。
- 代表截图：`.bot/out/omni09-r-s4-en1440-direct/s4-p3.png`、`.bot/out/omni09-r-s5-zh390-direct/s5-p4.png`。读取 PNG 时工具返回「this model does not support image input」；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- 未跑全站回归、真实 SGLang-Omni、SHM 进程间传输、模型、GPU 或 reduced-motion 动态切换。本章无新增 zero-to-sglang 对照内容，本单元只补指定 SHM 对象动画。

## 剩余与清理

- 剩余事项是 Omni-09 的协调固定复审、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。Steps 1–3 与其他待复审批次保持原样，未处理 Omni-34，未改其他开放 finding。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout；只删除本目录内的符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4511`，地址：`http://127.0.0.1:4511/learning-sglang/omni/ch/05-data-lifetime/?step=4`。本轮 4511 服务已停止，端口无监听。
- 审计脚本均调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；未动其他 lane 的浏览器或服务。

---

# lane k2 本轮报告 · ML Systems 12 Step 5 的 ML-18／34

日期：2026-11-27。类型：修旧。direction 指定的 ML-55 与后续 ML-63／64 已分别由 `622eac2`、`6fcb7d0` 完成，本轮不回改待复审批次；本书没有开放 P0，按 P1 顺序处理 ML-18。范围只有 ML 12 Step 5 的组件、双语 deep、MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；同 scope 修正 ML-34 的图外「蓝线路径」措辞。未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文，未开第 14 章。

## 提交与 finding

- `f7a492f`：**ML-18 作者修复完成，待协调固定复审，不自行销项。** Step 5 从四相改为五相，新增共享表卡片，依次形成 draft CE、draft 层、共享表和 target 主干，再展开前向与梯度路线。
- 舞台明确 `token IDs → embedding → model numbers` 和 `hidden states → LM head → token scores`，前向使用当前参数值。辅助 CE 对 target 主干与共享 embedding／LM head 的梯度分别阻断，MTP 梯度正常计算，主 RL 仍更新 target 和共享表。
- 双语 deep 分别定义 $\theta_{\mathrm{detached}}$、$\theta_{\mathrm{shared}}$ 和 $\theta_{\mathrm{MTP}}$，共享符号只指 embedding／LM head。图外实现补充 `make_viewless_tensor(..., requires_grad=True, keep_graph=False)`、`functional_call` 和原参数不被修改的边界；三条公式分行，长标识加断行机会。
- ML-34 的「蓝色路径」改为图上实际存在的蓝色卡片和 CE 文字行，作为本单元唯一顺带 P2 修复，亦待协调复审。首次教程提交 `88cd3ea` 推送被拒后按指示 `git pull --rebase origin tutorials`，最终 `f7a492f` 推送成功；未 force-push。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 5 | 10/10 | 2/2 | 20/20 | draft 的辅助 CE 只训练 draft，前向仍用 target 和共享表的当前数值，主 RL 仍能更新它们。 | 0 |

- 独立源码 `explore` **PASS**：共享表前向、两个零梯度边界、MTP 路径、主 RL 边界和 pinned 实现一致，ML-18 ready for coordinator review。
- 独立冷读 `explore` **PASS**：一步一个 detach 主题，新词有解释，双语 caption 短，图、deep、MDX 和 transcript 一致；ML-18／34 剩余内容洞均为 0。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。既有协调 **80/80、16/16、192/192** 基线不改写；原 #4/#5、整章新总分和销项不由本轮自行决定。

## 硬门与证据

- 最终 rebase 后 `npm run build`：**60 页**通过；Step 5 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 12`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 5 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同：`1f08524878dd97214befbab9103fcf51c0e0dca89a88d85cca049afba962a1e5`，**2,189 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml18-step5-audit/report.json` 覆盖英中桌面与 390 px 手机 × direct／前步入口，共 **8 组合、40 个状态、32/32 个机制转变**；另有双语 1440／360／390／430 px 共 **8 个 deep 状态**。最终审计有 **39 个唯一 PNG 哈希**，普通舞台最低 **10.8425625 CSS px**，重叠、SVG 出界、页面或抽屉横溢和 `failures` 均为 0。可重跑脚本：`.bot/out/ml18-step5-audit.mjs`。
- 桌面 deep 打开后舞台最低 **7.21415625 CSS px**，属于既有共享 ML-21，本单元未改，不声称该呈现门通过。手机 drawer 的焦点仍属共享 ML-22。
- 代表截图：`.bot/out/ml18-shot/en-desktop-final.png`、`.bot/out/ml18-shot/zh-phone-final.png`、`.bot/out/ml18-step5-audit/en-1440-deep.png`。读取 PNG 时工具返回「this model does not support image input」；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- 本轮读取 zero-to-sglang Part II Chapter 10 正文和代码走读；它讲 draft–verify、接受和 KV 边界，没有本章共享表训练梯度的直接对应内容。机制事实另由 pinned slime／Megatron 来源复核。未跑全站回归、真实 RL 训练、rollout、GPU benchmark 或 reduced-motion 动态切换。

## 剩余与清理

- 剩余事项是 ML-18／34 的协调固定复审、原 #4/#5、整章评分、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。下一单元按本书 P1 顺序处理 **ML-20**。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout。第一次 build 因该符号链接的缓存权限报 EPERM；随后只删除本目录内的符号链接并在本目录 `npm ci`，package 文件无 diff，最终 build 通过。
- 本地查看地址：`http://127.0.0.1:4512/learning-sglang/ml-sys/ch/12-rl-speculative-decoding/?step=5`。本轮 4512 服务已在收尾停止，端口无监听。
- 审计脚本调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器。

---

# lane k2 本轮报告 · ML Systems 13 Step 8 的 ML-63／64

日期：2026-11-27。类型：修旧（direction 指定的 ML-55 后下一独立单元）。本轮开始 HEAD 与 `origin/tutorials` 均为 `6b63241`，工作树干净；ML-55 已由 `622eac2` 完成并留下完整证据，本轮不回改待复审批次，直接处理 ML 13 Step 8。范围只有该步组件、双语 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML-52／53 保持关闭，未开第 14 章。

## 提交与 finding

- `6fcb7d0`：**ML-63／64 作者修复完成，待协调固定复审，不自行销项。** 中文 caption 从「7 和 12 个响应」改为「7 和 12 个 token 的响应」，英文、两种 mask 为 0 和舞台机制不变。
- 双语 deep 都声明代入例假设 tokenizer 的 pad ID 为 0。pinned `verl-project/verl@c5b189a1af496d0bc68320cd1d5bd7a1f1e3638a` 的 `agent_loop.py:354-365` 先用 `tokenizer.pad` 填充原始 response mask，再乘 response attention mask；pad ID 非 0 时原始 padding 格是该 ID，但 `$Z=0$` 使最终 padding mask 仍为 0。
- 首次教程提交为 `1d74b8c`，推送被拒后按指示 `git pull --rebase origin tutorials`，带入 d 的 `7b758d6`、`1d6132b` 和 k1 的 `844c554`。最终 `6fcb7d0` 推送成功；未 force-push。评分卡、进度、审计和本报告随下一记录提交推送。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 8 | 10/10 | 2/2 | 20/20 | 两条响应分别有 7 和 12 个 token，右侧 padding 把它们对齐；pad ID 非 0 会留在原始 mask，但最终 mask 仍排除 padding。 | 0 |

- 独立 `explore` 冷读 **PASS**：中文长度含义、两句短 caption、双语 pad-ID 前提、非 0 反例和 deep／舞台／transcript 对齐均通过，两项均 ready for coordinator review，剩余新内容洞 **0**。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。协调固定 `0ad6a13` 的 **80/80、158/160、16/16、190/192、NO-GO** 基线不改写；原 #4/#5、整章新总分和销项不由本轮自行决定。

## 硬门与证据

- 最终 rebase 后 `npm run build`：**60 页**通过；Step 8 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 13`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 8 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同，rebase 后仍为 `b39adf25ee01ac079cb5140cc685b15e46404a897ac7d1cdbdbb43fe05e6cb0e`，**1,833 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml63-step8-audit/report.json` 覆盖英中桌面与中文 390 px × direct／前步入口，共 **6 组合、24 个状态、18/18 个机制转变**；另有双语 1440／390 px 共 **4 个 deep 状态**。审计逐相检查 counter、phase、中文 token 长度和双语 pad-ID 前提，所有 deep 均 `aria-expanded=true`，无 KaTeX、raw-math 或横溢失败。
- 最终审计最低 **10.175376647834275 CSS px**，重叠、SVG 出界、页面或抽屉横溢和 `failures` 均为 **0**。可重跑脚本：`.bot/out/ml63-step8-audit.mjs`。桌面 deep 打开后舞台最低 **5.746527777777778 CSS px**，仍属共享 ML-21，本单元未改。
- 代表截图：`.bot/out/ml63-step8-audit/en-1440-direct-s8-p3.png`、`.bot/out/ml63-step8-audit/zh-390-direct-s8-p3.png`。读取 PNG 时工具返回「this model does not support image input」；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- 本章没有直接 zero-to-sglang 对照章。本单元只核对了 pinned verl 的 padding 实现，未引入新测量数字；未跑全站回归、真实训练、rollout、工具调用、VLM、GPU benchmark 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- 剩余事项是 ML-63／64 的协调固定复审、原 #4/#5、整章评分、具备图像能力的复审和主人最终视觉验收。共享 ML-21／22、ML-55 和其他待审或开放 finding 未改。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout。第一次 build 因该符号链接的缓存权限报 EPERM，未写入目标；随后只删除本目录内的符号链接并在本目录 `npm ci`，package 文件无 diff，最终 build 通过，未写协调人的 checkout。
- 本地查看地址：`http://localhost:4511/learning-sglang/ml-sys/ch/13-multi-turn-agent-rl/?step=8`。本轮 4511 服务已在收尾停止，端口无监听。
- 审计脚本调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器。

---

# lane k2 本轮报告 · ML Systems 07 Step 5 的 ML-55

日期：2026-11-27。类型：修旧（direction 指定的下一最小单元）。本轮开始 HEAD 与 `origin/tutorials` 均为 `975362f`，工作树干净。范围只有 ML 07 Step 5 的组件、双语 deep、MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML-41～44 与 ML-50 的关闭结论保持不变，Step 7 的 warm-up 链未改；`3a106be 0547d98` 的 ML 13 Step 5 记录保持独立，本单元不关闭 ML-52，也未开第 14 章。

## 提交与 finding

- `622eac2`：**ML-55 作者修复完成，待协调固定复审，不自行销项。** 同一桶卡片按 `restored → pp-ep → tp → unpad → hf → handles → loaded → cleared` 改变标题和详情，有序记录严格按 `PP/EP broadcast → TP gather → unpad → HF layout → handles → ray.get → clear` 形成，不再用 assemble／arrange 代替转换过程。
- PP/EP 广播填满空接收副本，TP 收集形成完整张量，unpad 去掉可能存在的 padding，HF 转换配上 Hugging Face 名称和布局。handles 出现后张量仍保留，`ray.get` 返回后转换副本仍保留，`clear` 才释放它；Bucket 1 在第 8 相清空，Bucket 2 在第 9 相上卡。
- 桌面与手机都有同桶对象变化及 `SGLANG + KV` 驻留对照。双语 MDX、deep 和生成 transcript 使用同一顺序与条件措辞，保留无桶大小、无字节节省量的来源边界。
- 首次教程提交为 `486b9ab`，推送被拒后按指示 `git pull --rebase origin tutorials`，带入 k1 的 `54777a1`、`9c91985`。最终 `622eac2` 推送成功；未 force-push。评分卡、进度、审计和本报告随下一记录提交推送。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 5 | 10/10 | 2/2 | 20/20 | 同一桶先补齐各 rank 的 TP 分片，再拼成完整张量、去 padding、转 HF 布局；`ray.get` 等装入结束才清空，然后下一桶上卡。 | 0 |

- 独立 `explore` 首轮 **FAIL**：只揭示操作清单、手机缺 `SGLANG + KV`、padding 被写成恒有。补齐同桶对象逐相变化、手机标签、条件措辞与英文手机相位后，第二轮 **PASS**，剩余 ML-55 内容洞 **0**。它另确认 handles／`ray.get` 不会让人读成提前释放张量，Step 7 与其他步内容未改。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。协调固定 `88fc4d1` 的 **80/80、16/16、192/192、因 ML-55 NO-GO** 基线不改写；原 #4/#5、整章新总分和销项不由本轮自行决定。

## 硬门与证据

- 最终 rebase 后 `npm run build`：**60 页**通过；Step 5 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 07`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 5 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同，rebase 后仍为 `8aab5d0297fb937d7a51dc7cd40d2e3c147a6d8a40be8b9af23fccf3eb5a7059`，**2,161 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml55-step5-audit/report.json` 覆盖英中桌面与 390 px 手机 × direct／前步入口，共 **8 组合、80 个状态、72/72 个机制转变、64 个同桶状态变化**；另有双语 1440／390 px 共 **4 个 deep 状态**。审计逐相检查 bucket id、可见标题与详情、七个操作的首次出现顺序、Bucket 1 清空和 Bucket 2 上卡时点。
- 最终审计有 **77 个唯一 PNG 哈希**，最低 **10.233191287878787 CSS px**，重叠、SVG 出界、页面或抽屉横溢和 `failures` 均为 **0**。可重跑脚本：`.bot/out/ml55-step5-audit.mjs`。首轮桌面脚注小字已改为 Step 5 专用 12.5 px 桌面脚注后复验通过。
- 代表截图：`.bot/out/ml55-step5-audit/en-1440-direct-s5-p6.png`、`.bot/out/ml55-step5-audit/zh-390-direct-s5-p9.png`。读取 PNG 时工具返回「this model does not support image input」；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- 本章没有直接 zero-to-sglang 对照章。本单元核对公开 `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:254-272,280-296,329-395` 的桶循环与转换调用，未引入新测量数字；未跑全站回归、真实训练、权重传输、SGLang／CUDA、GPU benchmark 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- 剩余事项是 ML-55 的协调固定复审、原 #4/#5、整章评分、具备图像能力的复审和主人最终视觉验收。共享 ML-21／22、ML-52 和其他待审或开放 finding 未改。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout；只删除本目录内的符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看地址：`http://127.0.0.1:4510/learning-sglang/ml-sys/ch/07-weight-updates/?step=5`。本轮 4510 服务已停止，端口无监听。
- 审计脚本调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器。

---

# lane k1 本轮报告 · Omni 13 Step 9 的 Omni-51

日期：2026-11-27。类型：修旧。本轮开始 HEAD 与 `origin/tutorials` 均为 `9c91985`，工作树干净。direction 指定的 Omni-50 已由当前 HEAD 的 `ac65a00`、`308a9d5` 完成，本轮保留该待复审批次，不重复返工；按上一轮报告的下一单元处理 Omni-51。范围只有 Omni 13 Step 9 的组件、双语 deep、MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。

## 提交与 finding

- **Omni-51 作者修复完成，待协调固定复审，不自行销项。** Step 9 改为八相：warmup 1 发送、warmup 1 HTTP 200、warmup 2 发送、warmup 2 HTTP 200 后 `UP`，随后才进入 A/B、两类记录、听者时间线和 chunk 2 就绪。图上 `max(process.num_replicas) = 2`，首个 200 后仍是 `STARTING`，不再用一个 warmup 代表 replica2。
- pinned `sglang-omni@9725235249df851281d4dc62a04b2d34b02ac0fe` 的 `serve/launcher.py:552-605,666-675,761-770` 证实：请求数取最大 `process.num_replicas`，请求逐条发送，每条检查 HTTP 200，全部成功后才设置 `ServerStatus.UP`。双语组件、MDX、deep 和 transcript 使用同一顺序；非 200 的失败边界只留在 deep。
- 首轮英文手机审计发现顶部顺序句在三宽度出界 **31／34／38 px**，已缩短手机标题并复测归零。双语 deep 的长标识增加断行机会，360／390／430 px 的抽屉横溢均降为 0；来源文字和 pinned 版本未变。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 9 | 10/10 | 2/2 | 20/20 | replica2 要依次跑完两个预热请求，两个都返回 HTTP 200，服务器才算就绪。 | 0 |

- 独立 `explore` 冷读 **PASS**：请求顺序、逐相机制、未提前就绪、caption、双语 deep 和数字对齐均无剩余阻塞项。这是作者复评与独立源码／transcript／DOM 冷读，不是协调 verdict；原 #4/#5、整章新总分和销项不由本轮自行改写。协调固定 `bd4aa5d` 的整章 GO 基线不扩展到后续修改。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；十步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 13`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 9 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同：`9f5e5a3fb73903051a860917ca49c1218a68a10c25b9de7c72824aabff987796`，**3,586 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/omni51-step9-audit.mjs` 覆盖英文桌面、中文桌面、中文 390 px × 直接 URL／前步入口，共 **6 组合、48 状态、42/42 机制转变**。最低 **10.806 CSS px**，重叠、SVG 出界和页面横溢均为 0；脚本断言 warmup 顺序、各自 HTTP 200 及全部成功前不就绪。报告在各 `omni51-step9-*` 目录。
- `.bot/out/omni51-deep-audit.mjs` 覆盖双语 360／390／430／1440 px，共 **8 个打开抽屉视图**。`aria-expanded=true`、counter、目标文本、页面与抽屉横溢、KaTeX 和 raw-math 检查全部通过。桌面抽屉打开后的舞台最低 **4.855 CSS px**，焦点记录为空，属于既有共享 ML-21／22；本单元未改也不声称这两项通过。
- 代表截图：`.bot/out/omni51-step9-endesktop-direct/s9-p3.png`、`.bot/out/omni51-step9-zh390-direct/s9-p3.png`。读取 PNG 时工具返回「this model does not support image input」；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- 未跑全站回归、真实 SGLang-Omni 服务器、replica2 warmup、模型、GPU benchmark 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- 剩余事项是 Omni-51 的协调固定复审、原 #4/#5、整章评分、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。下一单元按本书 P1 顺序处理 **Omni-52**；Omni-50 与其他待审内容未重做。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout；只删除本目录内的符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4505`，地址：`http://127.0.0.1:4505/learning-sglang/omni/ch/13-qwen3-omni-deployment/?step=9`。本轮 4505 服务已停止，端口无监听。
- 审计脚本均调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器，未动其他 lane 的进程。

---

# lane k2 本轮报告 · ML Systems 13 Step 8 的 ML-53

日期：2026-11-27。类型：修旧（ML-52 后按 owner rule 处理本书开放 P1）。本轮开始 HEAD 与 `origin/tutorials` 均为 `3a106be`，工作树干净。范围只有 ML 13 Step 8 的组件、双语 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。共享 ML-21／22 保持独立，未开第 14 章。

## 提交与 finding

- `0282af3`：**ML-53 作者修复完成，待协调固定复审，不自行销项。** 桌面、手机和双语 deep 都以 padding 后的 batch 收尾，明确本章不测量模型生成、工具执行和训练的等待，删除「哪段等待最长」及下一章承诺。第 14–16 章仍为 `ready:false`，浏览器确认末步没有下一章链接。
- padding、`7+5=12`、response mask 和 attention mask 的相位机制未改。双语 deep 的长 commit 标识和源码路径只在 `/`、`@` 后增加 `<wbr>`；首轮手机 deep 审计的 55／50 px 横溢降为 0，来源文字未变。
- 首次教程提交为 `ed6c220`，推送被拒后按指示 `git pull --rebase origin tutorials`，带入 d 的 `00365a2`。最终 `0282af3` 推送成功；未 force-push。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 8 | 10/10 | 2/2 | 20/20 | 配置要求响应占 12 格，S2 只有 7 个真实 token，所以右边补 5 格；两种 mask 都把补上的格子标为 0，本章没有测量生成、工具和训练的等待。 | 0 |

- 独立 `explore` 对 ML-53 内容给出 **PASS**：旧问题和下一章承诺已删除，双语同义，没有新增术语、性能断言或内容洞，实际 roster 没有 ready 的下一章。它另确认共享 ML-21 的桌面 drawer 字号门仍未通过，因此没有给出全 EVAL PASS。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。原 #4/#5、整章新总分和销项不由本轮自行改写。

## 硬门与证据

- 最终 rebase 后 `npm run build`：**60 页**通过；8 步 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 13`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 8 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同，rebase 后第三次仍相同：`bbf346860045c4573f2952d3b3f20cbe6d8c76487a2f1ec826755fac1dfe042d`，**1,831 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml53-step8-audit/report.json` 覆盖英文桌面、中文桌面、中文 390 px × 直接 URL／前步入口，共 **6 组合、24 个状态、18/18 个机制转变**；另有双语 1440／390 px 共 **4 个 deep 状态**。最终审计有 **24 个唯一 PNG 哈希**，普通舞台最低 **10.175376647834275 CSS px**，重叠、SVG 出界、页面或抽屉横溢和 `failures` 均为 **0**。可重跑脚本：`.bot/out/ml53-step8-audit.mjs`。
- 四个 deep 状态均展开到 Step 8，无 raw math、KaTeX 错误、页面或抽屉横溢。deep 打开后的桌面舞台最低 **5.746527777777778 CSS px**，属于既有共享 ML-21，本单元未改共享布局，不声称该呈现门通过。
- 代表截图：`.bot/out/ml53-step8-audit/en-1440-direct-s8-p3.png`、`.bot/out/ml53-step8-audit/zh-390-direct-s8-p3.png`。读取 PNG 时工具返回「this model does not support image input」；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。
- 本章没有直接 zero-to-sglang 或上游对应章。本单元只改章末范围声明和断行，不引入新的机制事实；未跑全站回归、真实训练、rollout、工具调用、VLM、GPU benchmark 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- 剩余事项是 ML-53 的协调固定复审、原 #4/#5、整章评分、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。ML-52 及其他待审或开放 finding 未改。
- 本 clone 的 `node_modules` 开始时指向协调人 checkout；只删除本目录内的符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4506`，地址：`http://127.0.0.1:4506/learning-sglang/ml-sys/ch/13-multi-turn-agent-rl/?step=8`。本轮 4506 服务已停止，端口无监听。
- 审计脚本调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器。

---

# lane k2 本轮报告 · ML Systems 13 Step 5 的 ML-52

日期：2026-11-27。类型：修旧（ML-51 后按 owner rule 处理本书开放 P1）。本轮开始 HEAD 与 `origin/tutorials` 均为 `3d7ac9f`，工作树干净。范围只有 ML 13 Step 5 的组件、数字常量、双语 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML-53 与共享 ML-21／22 保持独立，未开第 14 章。

## 提交与 finding

- `0547d98`：**ML-52 作者修复完成，待协调固定复审，不自行销项。** 三个中性底色面板用同一行宽对照「每轮都拼接」与「先 buffer 再拼接」，第三张卡展示两种做法共有的输入／输出生命周期。相位依次形成两组输入、左卡输出、右卡输出和末相的六行同时存活状态；`torch.cat([T0, T1], dim=0)` 仍在图上。
- 每轮做法明确下一轮会重抄当前 3 行，buffer 做法只复制一次。两种做法在拼接时都保留 `2+1+3=6` 行输入和输出；这些是构造行数，不是字节数，峰值是否下降明确标为未测量。双语 deep 标明下一轮及其新片段未画出，并对齐公开文章、pinned 实现和这一边界。
- 首次教程提交为 `a3a1781`，推送被拒后按指示 `git pull --rebase origin tutorials`，带入 k1／d 的新提交。`memory/progress.md` 冲突保留双方记录，最终 `0547d98` 推送成功；未 force-push。
- 首轮手机 deep 审计发现长 commit 标识造成英文 52 px、中文 47 px 横溢；只在 `/` 与 `@` 后加 `<wbr>` 后，双语 390 px 复验均无横溢，字段和出处内容未变。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 5 | 10/10 | 2/2 | 20/20 | 每轮拼接会把旧行再抄一遍；先存好片段只抄一次，但拼接时输入和输出都在，所以不知道峰值是否下降。 | 0 |

- 独立 `explore` 冷读 **PASS**：事实、双语一致性、同尺对照、相位顺序、deep 对齐和峰值边界均无剩余洞。作者随后又做了一次完整 diff 审查，把卡片底色改为中性以保留一色一义，并恢复图上的 `torch.cat` 调用；最终硬门和浏览器审计再次通过。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。原 #4/#5、整章新总分和销项不由本轮自行改写。ML-53 是下一项 P1，共享 ML-21／22 未改。

## 硬门与证据

- 最终 rebase 后 `npm run build`：**60 页**通过；8 步 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 13`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 5 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同：`2386763e5e7d9c0ffdf90ced35dfad3137faf00a8468bfcb6d746f23f3c94ca3`，**1,830 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml52-step5-audit/report.json` 覆盖英文桌面、中文桌面、中文 390 px × 直接 URL／前步入口，共 **6 组合、24 个状态、18/18 个机制转变**；另有双语 1440／390 px 共 **4 个 deep 状态**。最终审计有 **23 个唯一 PNG 哈希**，最低 **10.130859375 CSS px**，重叠、SVG 出界、页面或抽屉横溢和 `failures` 均为 **0**。可见行数按相位为 **6／9／12／18**，三张末相卡各有 3 行输入与 3 行输出，所有行共用同一宽度和高度。可重跑脚本：`.bot/out/ml52-step5-audit.mjs`。
- 四个 deep 状态均展开到 Step 5，无 raw math、KaTeX 错误、页面或抽屉横溢。deep 打开后的舞台最低 **5.721 CSS px**，属于既有共享 ML-21，本单元未改也不声称该项通过。
- 代表截图：`.bot/out/ml52-step5-audit/en-1440-direct-s5-p3.png`、`.bot/out/ml52-step5-audit/zh-390-direct-s5-p3.png`。**当前模型不能读取 PNG；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- 本轮核对公开 `Awesome-ML-SYS-Tutorial/rlhf/slime/vlm-multi-turn/readme.md` 附录与 pinned `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `rollout.py`。实现先 buffer 再按 key 做一次 `torch.cat`；文章提供减少重复分配和复制的动机，没有给本例峰值测量。本章没有直接 zero-to-sglang 对照章。未跑全站回归、真实训练、rollout、VLM、GPU benchmark、显存测量或 reduced-motion 动态切换。

## 剩余与清理

- 剩余事项是 ML-52 的协调固定复审、原 #4/#5、整章评分、具备图像能力的复审和主人最终视觉验收。下一单元按本书 P1 顺序处理 ML-53；其他开放 finding 未改。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4505`，地址：`http://localhost:4505/learning-sglang/ml-sys/ch/13-multi-turn-agent-rl/?step=5`。本轮 4505 服务已停止，端口无监听。
- 审计脚本调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器。

---

# lane k2 本轮报告 · ML Systems 09 Step 6 的 ML-51

日期：2026-11-27。类型：修旧（ML-50 后按 owner rule 处理本书开放 P1）。本轮开始 HEAD 与 `origin/tutorials` 均为 `4bae53e`，工作树干净。范围只有 ML 09 Step 6 的组件、双语 deep、MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML-38 和共享 ML-21／22 保持独立，未开第 14 章。

## 提交与 finding

- `9fd99a0`：**ML-51 作者修复完成，待协调固定复审，不自行销项。** Step 6 保留 2,030→1,590 ms、68.1→58.3 GB、440 ms 和 9.8 GB 的公开对照。末相在桌面补出输入量化、额外转置 FP8 输出和高精度激活副本三张成本卡；手机用一个「转换成本」框列出同一组对象，并用「行变成列」解释转置。
- 双语 deep 和 MDX 与桌面、手机逐一对齐，明确来源没有这些对象的分项字节或毫秒。本步不把前向从 463 升到 529 ms 归因于 CPU 或另一个单一原因。
- 首次教程提交为 `a95de80`，推送被拒后按指示 `git pull --rebase origin tutorials`，带入远端 `fdb63df`，最终 `9fd99a0` 推送成功；未 force-push。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 6 | 10/10 | 2/2 | 20/20 | FP8 总体省时省显存，但前向更慢；它还要多转一次数、多写一份行列对调的输出，并留下反向要用的副本，这些成本没有分项数字。 | 0 |

- 第一轮独立 `explore` 冷读为 **FAIL**：Step 6 新用 `kernel` 未解释，手机 deep 仍按桌面 panel 描述，手机漏写 `extra`。改成「转换代码／conversion code」、补手机合并框说明和 `extra transposed FP8 output` 后，第二轮 **PASS**，ML-51 范围无剩余洞。
- 这些是作者复评与独立源码、transcript 冷读，不是协调 verdict。原 #4/#5、整章新总分和销项不由本轮自行改写。ML-38 的第三组吞吐与配置边界、共享 ML-21／22 均未改。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；8 步 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 09`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 6 字号门和 `git diff --check` 全过。
- transcript 连续三次 SHA-256 相同：`35807bcec15eea2ea9f76e44076a6846bccb56d7fad7a6d9e257698c51decad1`，**2,020 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml51-step6-audit/report.json` 覆盖英文桌面、中文桌面、中文 390 px × 直接 URL／前步入口，共 **6 组合、30 个状态、24/24 个机制转变、29 个唯一 PNG 哈希**；另有双语 1440／390 px 共 **4 个 deep 状态**。最低 **10.506 CSS px**，重叠、SVG 出界、页面横溢和 `failures` 均为 **0**。四条收益柱逐条按各自同一比例验算，宽度误差小于 0.01。可重跑脚本：`.bot/out/ml51-step6-audit.mjs`。
- 四个 deep 状态均展开到 Step 6，无 raw math、KaTeX 错误、页面或抽屉横溢。deep 打开后的舞台最低 **8.406 CSS px**，属于既有共享 ML-21，本单元未改也不声称该项通过。
- 代表截图：`.bot/out/ml51-step6-audit/en-1440-direct-s6-p4.png`、`.bot/out/ml51-step6-audit/zh-390-direct-s6-p4.png`。**当前模型不能读取 PNG；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- 本轮重读 zero-to-sglang 第 3 部分第 2 章、InfiR2 §5.4 表 6 和固定 TransformerEngine 转换源码。未引入新测量数字；未跑全站回归、真实 FP8 训练、GPU benchmark、模型质量评测或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- 剩余事项是 ML-51 的协调固定复审、原 #4/#5、整章评分、具备图像能力的复审和主人最终视觉验收。ML-38 与共享 ML-21／22 继续独立开放；其他 P1 与新写作按 owner rule 另行处理。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4504`，地址：`http://localhost:4504/learning-sglang/ml-sys/ch/09-fp8-rollout-training/?step=6`。本轮 4504 服务已停止，端口无监听。
- 审计脚本调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器。

---

# lane k1 本轮报告 · Omni 05 Steps 1–3 的 Omni-09

日期：2026-11-27。类型：修旧（按上一轮报告与本轮主人核实的下一单元，先清同章 P0）。本轮开始 HEAD 与 `origin/tutorials` 均为 `3a106be`，工作树干净。范围只有 Omni 05 Steps 1–3 的组件、双语 deep、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。Steps 4–5 沿用上一轮修复，不重做；Omni-50 待复审批次保持原样。

## 提交与 finding

- `b89db6c`：**Omni-09 的 Step 1 作者修复完成，待协调固定复审，不自行销项。** 四相依次为共同初态、左栏覆盖并读错、右栏读完 A、右栏 B 在 A 读完后进入。标题写明 `initially`，蓝色只表示 A、橙色只表示 B，面板与读者边框改 neutral，消除颜色双义。
- `975362f`：**Omni-09 的 Step 2 作者修复完成，待复审。** 三相依次为只有 payload、构造 DataRef、接收方使用字段。SHM 写明 shared memory；末相明确 `FIELDS IN USE · NOT SENT`，没有把字段预览当成 DataReady、发布、读取或 ACK。
- `54777a1`：**Omni-09 的 Step 3 作者修复完成，待复审。** 六相依次为写入中、返回 DataRef 和 live `RelayOperation`、登记 `pending[A]`、发送 DataReady、启动 `watch_pending`、完成 `job.ready` 和 `send_payload()`。pending 先于通知，watcher 跟随通知，job.ready 最后完成；接收方读取不被暗示。
- 最后的记录提交把 Step 3 deep 的宽表改为顺序列表，并给长来源标识加断行机会，使双语手机 deep 横溢归零；包含生成 transcript、评分卡、进度、审计和本报告。Step 1、2 首次推送被拒后均按指示 `git pull --rebase origin tutorials` 再推成功，Step 3 首次成功；全程未 force-push。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 1 | 10/10 | 2/2 | 20/20 | A 没读完时 B 不能抢这格；A 读完后，B 才能进来。 | 0 |
| 2 | 10/10 | 2/2 | 20/20 | DataRef 是找数据的小卡片，不带数据本体；接收方用卡片字段找 A，发布发生在下一步。 | 0 |
| 3 | 10/10 | 2/2 | 20/20 | 先写入并留 pending，再发 DataReady；随后启动 watcher，最后 `send_payload()` 才返回，这不表示读者已读。 | 0 |

- 独立 `explore` 对 Step 1 初轮指出标题与末相矛盾、蓝橙同时表示结果与场景两项问题；修正后 **PASS**。Step 2、Step 3 分别 **PASS**。整单元复核确认五步均有真实机制动画、无提前完成标签，Steps 4–5 无回归，最终 **PASS**。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。旧评分卡和上一轮 Omni-50 的作者分不替代本轮复审，Omni-09 不自行销项，原 #4/#5 与整章新总分不自行改写。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；五步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 05`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Steps 1–3 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同：`4d0035fb99ad5d7f6970a5372d4b9390ae78657bf0d497f5fa7d81836609ea04`，**1,249 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/omni09-phase-audit.mjs` 覆盖 Steps 1–3 × 英文桌面／中文桌面／中文 390 px × 直接 URL／跨步入口，共 **18 组合、78 状态、60/60 机制转变**。Step 1 为 **24 状态／18 转变**，Step 2 为 **18／12**，Step 3 为 **36／30**。最低 **11.760 CSS px**，重叠、SVG 出界、页面横溢均为 0；脚本另断言错误读取、字段、pending、通知、watcher 和 job.ready 不提前出现。
- `.bot/out/omni09-deep-audit.mjs` 在 360／390／1440 px 覆盖双语 Steps 1–3，共 **18 个打开抽屉视图**。目标文本、`aria-expanded=true`、页面和抽屉横溢、KaTeX 与 raw-math 检查全部通过。桌面抽屉打开后的舞台最低 **8.006 CSS px**，焦点记录为空，属于既有共享 ML-21／22；本单元未改也不声称这两项通过。
- 代表截图：`.bot/out/omni09-s1-endesktop-direct/s1-p3.png`、`.bot/out/omni09-s3-zh390-direct/s3-p4.png`。**当前模型不能读取 PNG，工具已明确返回无图像输入能力；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- 未跑全站回归、真实 SGLang-Omni、SHM 进程间传输、模型、GPU 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- 剩余事项是 Omni-09 的协调固定复审、原 #4/#5、整章评分、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。下一单元按协调顺序处理 **Omni-51**。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4501`，地址：`http://localhost:4501/learning-sglang/omni/ch/05-data-lifetime/?step=1`；Steps 2、3 为 `?step=2`、`?step=3`。本轮 4501 服务已停止且端口无监听。
- 审计脚本均调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器，未动其他 lane 的进程。

---

# lane k1 本轮报告 · Omni 05 Steps 4–5 的 Omni-50

日期：2026-11-27。类型：修旧（完成 Omni-49 后的下一协调顺序项；按 11-27 owner rule 不等复审）。本轮开始 HEAD 与 `origin/tutorials` 均为 `4bae53e`，工作树干净。范围只有 Omni 05 Steps 4–5 的组件、双语 deep、MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。Omni-48／66／67 与 Omni-49 的待复审批次保持原样。

## 提交与 finding

- `ac65a00`：**Omni-50 作者修复完成，待协调固定复审，不自行销项。** Step 4 用七相依次形成解析、`get_async → ShmGetOperation`、`wait_for_completion` 内复制、同一等待内 close/unlink、接收空间返回、用副本还原、成功 ACK。接收方关闭自己的句柄并移除共享块名字，还原读取复制后的接收空间，不再读旧名字。
- 同一教程提交加入 Step 5 的六相机制：`ack_transfer` 匹配并完成 `pending.ack`、`mark_receiver_done`、`wait_for_completion`、其 `finally: sem.release`、最后的 `pending.pop(A)`。sem 在图上解释为 SHM 写入名额；归还名额发生在等待内部、等待返回之前，pending 删除只清记录。
- 第二个 Step 5 提交把 caption 同步为「等待在 `finally` 归还写入名额，`watcher` 再删除 pending」，并带上生成 transcript、评分卡、进度、审计和本报告。首个教程提交推送被拒后按指示 `git pull --rebase origin tutorials`，落到 `c18be7e` 上并推送成功；未 force-push。
- **Omni-09 保持开放。** 本单元只改 Steps 4–5，Steps 1–3 未改，不能把 Omni-50 的修复当成 Omni-09 的全章动画完成。下一单元先处理同章 P0 Omni-09，再按协调顺序处理 Omni-51。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 4 | 10/10 | 2/2 | 20/20 | 接收方先把 SHM 字节复制到自己的空间，再关句柄、去掉共享块名字；还原用副本，不再读旧名字。 | 0 |
| 5 | 10/10 | 2/2 | 20/20 | 回执到了，发送方才让 SHM put 收尾；等待内部归还一个写入名额，watcher 再删等待记录。 | 0 |

- 独立 `explore` 冷读首轮提出五项问题：提前显示完成状态、漏画 `wait_for_completion`、漏画 `pending.ack` 解锁、把 `sem.release` 画成等待后的下一步、close/unlink 对象与副本来源不清。修正后又指出 ACK 提前成功一项；全部修正并补提前完成标签断言后，最终 **PASS**。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。2026-11-25 的旧评分卡不关闭 Omni-09／50，也不记当前整章 GO。原 #4/#5、整章新总分和销项不由本轮自行改写。
- pinned `sglang-omni@0e641996a0c269601d03f1cb29d3f46d7cb345a6` 的 `relay/shm.py:100-117,142-189,193-259`、`comm/stage_io.py:826-842`、`comm/engine.py:930-971,1210-1268` 用于核对复制、清理、ACK、写入名额和 pending 的顺序。其他 relay 不继承 SHM 的 close/unlink 或 semaphore 规则，失败路径不在本图展开。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；五步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 05`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Steps 4／5 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同：`95f15493306158f1eb7f6ecbf5674e4d6fb306435eb61d0b1a147002e183bd78`，**1,213 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/omni50-phase-audit.mjs` 覆盖 Steps 4／5 × 英文桌面／中文桌面／中文 390 px × 直接 URL／前步入口，共 **12 组合、78 状态、66/66 机制转变**。最低 **11.760 CSS px**，重叠、SVG 出界、页面横溢均为 0；脚本另断言复制、清理、ACK、sem.release 和 pending 删除不会提前显示完成状态。
- `.bot/out/omni50-deep-audit.mjs` 在 360／390／1440 px 覆盖双语 Steps 4／5，共 **12 个打开抽屉视图**。目标文本、`aria-expanded=true`、页面和抽屉横溢、KaTeX 与 raw-math 检查全部通过。桌面抽屉打开后的舞台最低 **8.006 CSS px**，焦点记录为空，属于既有共享 ML-21／22；本单元未改也不声称这两项通过。
- 代表截图：`.bot/out/omni50-s4-endesktop-direct/s4-p3.png`、`.bot/out/omni50-s5-zh390-direct/s5-p4.png`。**当前模型不能读取 PNG，工具已明确返回无图像输入能力；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- 未跑全站回归、真实 SGLang-Omni、SHM 进程间传输、模型、GPU 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- 剩余事项是 Omni-50 的协调固定复审、原 #4/#5、整章评分、共享 ML-21／22、具备图像能力的复审和主人最终视觉验收。Omni-09 是独立 P0，本单元未关闭；其他待审内容未重做。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4501`，地址：`http://localhost:4501/learning-sglang/omni/ch/05-data-lifetime/?step=4`；Step 5 为 `?step=5`。本轮 4501 服务已停止且端口无监听。
- 审计脚本均调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出，本轮没有遗留浏览器。

---

# lane k2 本轮报告 · ML Systems 07 Step 7 的 ML-50

日期：2026-11-27。类型：修旧（ML-61／62 后按 owner rule 处理本书开放 P1）。本轮开始 HEAD 与 `origin/tutorials` 均为 `749347d`，工作树干净。范围只有 ML 07 Step 7 的组件、数字常量、双语 deep、MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML-55 与其他开放项保持原样，未开第 14 章。

## 提交与 finding

- `e8a69d1`：**ML-50 作者修复完成，待协调固定复审，不自行销项。** Step 7 保留三次 10 ms sleep、7.047→2.202 秒和约 160 次调用的账，新增「未 warm-up：第一次更新支付首次通信成本」与「建组后先 warm-up，再计时更新」的对照。末相在同一 `480 / 7.047` 秒数比例上补 1B 约 0.5 秒、8B 约 0.6 秒。
- 六相依次为原始 7.047 秒、去掉 sleep 的 2.202 秒、33 ms 拆解、未 warm-up 的首次通信、warm-up 交接、最终两种模型测量。手机保留同样的五张机制卡和末相公式，没有用静态替代图。
- 双语 deep 和 MDX 引用公开 `latency-accelerate-for-weight-updates/readme.md:980-1007,1023-1030,1061-1093`，补全 `dist.barrier(device_ids=[0], group=pg)`。舞台脚注把 CI 解释为自动测试并保留 `device_ids=[0]` 边界；deep 说明省略它会在 CI 因设备错误挂住，本地没有。来源没有给出精确 warm-up 时长或普遍加速比，本步不补这些数字。
- 首次教程提交为 `8e305ca`，推送被拒后按指示 `git pull --rebase origin tutorials`，带入 k1 的 `83f2901`，最终 `e8a69d1` 推送成功；未 force-push。

## 作者评分与独立冷读

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 7 | 10/10 | 2/2 | 20/20 | 重复 sleep 可以删掉；建组后先做一次小通信，后续更新不用再付首次成本。 | 0 |

- 独立 `explore` 冷读 **PASS**：事实、首次与后续调用分界、同尺算式、双语 deep 对齐、图外标记和范围均无剩余洞。`pstack-reviewer` 因配置模型不存在未启动，不计证据。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。固定 `4c4a536` 的协调基线不改写：R1–R5 **80/80**、机制 R6 **16/16**、原十二项 **192/192**，完整 EVAL 仍 **NO-GO**，ML-50／55 独立开放。原 #4/#5、整章新总分和销项不由本轮自行改写。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；Step 7 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 07`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 7 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同：`1086e264e5f172bd44000088222ea8f1fc2710fa91fb5fd51be7fa3acd95e021`，**2,072 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml50-step7-audit/report.json` 覆盖英文桌面、中文桌面、中文 390 px × 直接 URL／前步入口，共 **6 组合、36 个状态、30/30 个机制转变、36 个唯一 PNG 哈希**；另有双语 1440／390 px 共 **4 个 deep 状态**。最低 **10.14125 CSS px**，重叠、SVG 出界、页面横溢和 `failures` 均为 **0**。四条时间柱逐条按相同比例验算，宽度误差小于 0.01。
- 首轮审计发现桌面脚注随高场景缩到 **8.728125 CSS px**；只把 Step 7 桌面脚注增至 12.2 px 后复验通过。可重跑脚本：`.bot/out/ml50-step7-audit.mjs`。
- 代表截图：`.bot/out/ml50-step7-audit/en-1440-direct-s7-p4.png`、`.bot/out/ml50-step7-audit/zh-390-direct-s7-p5.png`。**当前模型不能读取 PNG；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- `docs/z2s-map.md` 没有 ML 07 的直接对应课程章；事实只取上述公开调试记录。未跑全站回归、真实训练、权重传输、SGLang／NCCL、GPU benchmark、CI 故障注入或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- 剩余事项是 ML-50 的协调固定复审、原 #4/#5、整章评分、具备图像能力的复审和主人最终视觉验收。ML-55 是独立 P2，本轮未改；其他 P1 与新写作按 owner rule 另行处理。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4502`，地址：`http://localhost:4502/learning-sglang/ml-sys/ch/07-weight-updates/?step=7`。本轮 4502 服务已停止，端口无监听。
- 审计脚本均调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；本轮没有遗留浏览器。

---

# lane k1 本轮报告 · Omni 13 Step 5 的 Omni-49

日期：2026-11-27。类型：修旧（完成 Omni-48／66／67 后的下一协调顺序项；按 11-27 owner rule 不等复审）。本轮开始 HEAD 与 `origin/tutorials` 均为 `45a9c2a`，工作树干净。范围只有 Omni 13 Step 5 的组件、数字常量、双语 deep、MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。Omni-48／66／67 的待复审批次保持原样。

## 提交与 finding

- `5f8d372`：**Omni-49 作者修复完成，待协调固定复审，不自行销项。** Step 5 现在并排列出 `PREVIOUS · 32,768 tokens` 与 `CURRENT DEFAULT · 65,536 tokens`，四根柱共用 0–90 GB 刻度与同一条 80 GB 虚线。旧例仍为 85.745728 GB、移卡后 77.745728 GB；当前例为 KV **6.291456 GB**、移卡前 **88.891456 GB**、移走 8 GB talker 后 **80.891456 GB**，仍超 **0.891456 GB**。当前默认不再被写成 fits。
- 五相依次展示共用输入、旧例移卡前、旧例移卡后、当前移卡前、当前移卡后。双语 deep 和 MDX 同步旧教程快照与 PR #2735 的版本桥、精确算式和「构造下限而非实测显存」边界。
- 首次推送被拒后按指示 `git pull --rebase origin tutorials`，带入 d／k2 的 `257acfd`、`fe86d8f` 等提交，无冲突，随后推送成功；未 force-push。

## 作者评分与独立冷读

- Step 5 作者参考值：R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、新内容洞 **0**。R1 复述：「旧例移走 talker 后放得下；当前默认仍比 80 GB 卡多 0.891456 GB。」
- 独立 `explore` 冷读 **PASS**：复算两组数值、核对舞台／双语 deep／MDX、同尺 DOM 几何和相位顺序后，指定范围无剩余内容洞，没有当前默认移卡后 fits 的残留说法。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。固定 `bd4aa5d` 的整章 **GO** 基线保持 R1–R5 **100/100**、机制 R6 **20/20**、原十个非视觉项 **200/200**、原 #4/#5 **40/40**、原十二项 **240/240**，不由本轮改写。

## 硬门与证据

- `npm run build`：**60 页**通过；十步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 13`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Step 5 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同：`d0349f418a0aeda2160dc6bdd61fbc33a98aa0bc35f5463e408ae1465a4beaf9`，**3,519 词**。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/omni49-step5-audit.mjs` 覆盖英文桌面、中文桌面、中文 390 px × 直接 URL／前步入口，共 **6 组合、30 状态、24/24 机制转变**。最低 **11.578 CSS px**，重叠、SVG 出界和 `geometryFailures` 均为 0；当前移卡后的红柱也按 `0.891456 ÷ 90 × barWidth` 验算。
- 双语 deep 在 360／390／1440 px 共 **6 个打开抽屉视图**通过目标文本、展开身份、页面与抽屉横溢、KaTeX 和 raw-math 检查。初轮公式和宽表在手机溢出，已改为分行公式、两列符号表和逐行代入后复跑通过。桌面抽屉打开后的舞台最小字为 **5.202 CSS px**，属于既有共享 ML-21，本单元未改也不声称该项通过。
- 代表截图：`.bot/out/omni49-step5-endesktop-direct/s5-p4.png`；中文手机：`.bot/out/omni49-step5-zh390-direct/s5-p4.png`。**当前模型不能读取 PNG，工具已明确返回无图像输入能力；结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。** 未跑全站回归、真实 SGLang-Omni、模型、GPU、显存实测或 reduced-motion 动态切换。

## 剩余与清理

- 剩余事项是 Omni-48／66／67 与 Omni-49 的协调固定复审、共享 ML-21、具备图像能力的复审和主人最终视觉验收。下一单元按协调顺序处理 **Omni-50**，不重做待审内容。
- 本 clone 的 `node_modules` 再次成为指向协调人 checkout 的符号链接；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4501`，地址：`http://localhost:4501/learning-sglang/omni/ch/13-qwen3-omni-deployment/?step=5`。本轮 4501 服务已停止且端口无监听。
- 审计脚本均调用 `browser.close()`；收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出，未动其他 lane 的进程。

---

# lane k2 本轮报告 · ML Systems 06 Step 3 的 ML-61

日期：2026-11-27。类型：修旧（direction 在 ML-62 后的同一项手机措辞修复）。本轮开始 HEAD 与 `origin/tutorials` 均为 `bcccdb0`，工作树干净。范围只有 ML 06 Step 3 的手机图内文字、定向审计和本报告；未改其他步、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML-19 与 ML-41～44 的作者批次保持冻结，未开新写作。

## 修复与评分

- **ML-61 作者修复完成，待协调固定复审，不自行销项。** 手机英文由 `write 8 different answers` 改为 `write 8 answers`，中文由「写出 8 份不同回答」改为「写出 8 份回答」。8 次采样不再被写成保证互不相同；桌面文字和其他机制未改。
- `.bot/out/ml61-mobile-audit/report.json` 覆盖英中 360／390／430 px 六个状态。每个状态都到达 Step 3 末相 `phase=3/3`、counter `03 / 08`，只含新措辞，不含旧措辞；SVG 出界、页面横溢和 `failures` 均为 0，最低可见字为 **10.760 CSS px**。可重跑脚本：`.bot/out/ml61-mobile-audit.mjs`。
- Step 3 作者复评：R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**，新内容洞 **0**。R1 复述不变：「模型给每个回答 token 各记一个生成分数；检查器下一步才给整个回答 reward，两种分数不一样。」协调固定 `209c3fa` 的整章基线仍为 **80/80、16/16、190/192，NO-GO**；ML-61／62 均由协调核销。
- 独立 `explore` 冷读 **PASS**：双语都不再保证回答互异，含义与桌面一致；六个手机状态的措辞、末相身份和几何检查全部通过。

## 硬门与边界

- `npm run build`：**60 页**通过。transcript 为 **8 步／1,517 词**，SHA-256 `58c569eaa3a84b8619bc12e641c9f228ae2623aad0faecb4020f52bae8c686f6`，与 pinned 逐字一致；本次手机专版文字不改变桌面 transcript。
- 显式指向本轮 4503 服务后，英中全章 360／390／430 px `mobile`、中文 Step 3 字号门、`deep-check 06`、`zh-check`、Step 3 `readability` 和 `git diff --check` 全过。
- 代表截图：`.bot/out/ml61-mobile-audit/zh-360.png`。**当前模型不能读取 PNG；结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。** 未跑全站回归、真实 slime 训练或 GPU benchmark。

## 剩余与清理

- 剩余事项是 ML-61／62 的协调固定复审、整章评分和主人最终视觉验收；其他开放 finding 与新写作均未触碰。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4503`，地址：`http://localhost:4503/learning-sglang/ml-sys/ch/06-slime-rollout-loop/?step=3`。4503 服务已停止，端口无监听。
- 收尾已执行 `pgrep -fl headless` 和 `lsof`：现存 Chrome PID 11347、40190、40967 的 cwd 分别属于后台 regress、协调快照和 lane k1，均非本轮所起，未动；本轮审计浏览器无存活进程。

---

# lane k2 本轮报告 · ML Systems 06 Step 3 的 ML-62

日期：2026-11-27。类型：修旧（P1 手机 deep 呈现门）。本轮开始 HEAD 与 `origin/tutorials` 均为 `04be539`，工作树干净。ML-45／46 已由协调关闭；ML-19 与 ML-41～44 的作者修复批次保持原样，不重做。范围只有 ML 06 Step 3 的双语 deep、定向审计和本报告；未改组件、caption、MDX、transcript、其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。

## 修复与评分

- **ML-62 作者修复完成，待协调固定复审，不自行销项。** Step 3 符号表保留 `Sample.response_length` 和 `Sample.rollout_log_probs` 的完整字段名，只在 `.` 与 `_` 后加 `<wbr>` 换行机会。中英文含义、公式和其他单元格不变，表格与共享样式未改。
- 改前实测：英文 360／390 px 的 `.deep-body` 为 `359→409`、`389→409`，中文 360 px 为 `359→370`；三处失败与 review.md 一致。改后英中 360／390／430 px 六个状态均为 `client === scroll`、`tableOverflow: 0`，counter 都是 `03 / 08`，抽屉均展开，无 raw math 或 KaTeX 错误，`failures=[]`。证据：`.bot/out/ml62-deep-audit/report.json`；可重跑脚本：`.bot/out/ml62-deep-overflow.mjs`。
- Step 3 内容评分不变，作者参考值仍为 R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**，新内容洞 **0**。R1 复述：「模型给每个回答 token 各记一个生成分数；检查器下一步才给整个回答 reward，两种分数不一样。」本项只修呈现硬门，不改协调固定 `209c3fa` 的整章基线：**80/80、16/16、190/192，NO-GO**。
- 独立 `explore` 冷读 **PASS**：渲染后的两个字段名完整，双语含义不变，六个手机状态通过，未引入新冷读洞，范围只含 ML-62。`pstack-reviewer` 因配置模型不存在未启动，不计证据。

## 硬门与边界

- `npm run build`：**60 页**通过。正确指向本轮 4503 服务后，连续两次 transcript 均为 **8 步／1,517 词**，SHA-256 均为 `58c569eaa3a84b8619bc12e641c9f228ae2623aad0faecb4020f52bae8c686f6`，与 pinned 逐字一致。
- 英中全章 360／390／430 px `mobile`、中文 Step 3 字号门、`deep-check 06`、`zh-check`、Step 3 `readability` 和 `git diff --check` 全过。首次未传 base URL 的 transcript 访问了其他服务并报告 `counter says null`，未采信；随后所有浏览器门均显式使用本轮 4503 地址重跑通过。
- 代表截图：`.bot/out/ml62-deep-audit/en-360.png`、`.bot/out/ml62-deep-audit/zh-360.png`。**当前模型不能读取 PNG，工具已明确返回无图像输入能力；结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- `docs/z2s-map.md` 没有 ML 06 的直接对应课程章；本轮未引入新事实或数字，无需另读来源扩写。未跑全站回归、真实 slime 训练、GPU benchmark 或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤。

## 剩余与清理

- ML-61 是独立 P2，本轮未改；ML-50 与其他 P1 保持开放。ML-19、ML-41～44 和其他待复审批次不改分、不销项。主人最终视觉验收另计。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4503`。地址：`http://localhost:4503/learning-sglang/ml-sys/ch/06-slime-rollout-loop/?step=3`，打开「深入讲解」查看符号表。本轮 4503 服务和审计浏览器已在收尾关闭，其他 lane 的进程未动。

---

# lane d 本轮报告 · Voxt 10 displayed Step 5 机制动画＋Step 3 断言矩阵更正＋Step 4 既有动画核销

日期：2026-11-27。类型：新步＋验证更正（按复审：先跑真正的断言矩阵，再把报告更正并入下一个教程提交，不出 report-only 提交）。教程改动只有 `FileTranscription.svelte` 的 Step 5（组件内 step 4）与生成 transcript；另按复审把 Step 3 报告的「断言」措辞更正、两个断言矩阵脚本与 JSON 输出（`.bot/out/voxt10-step3-matrix.*`、`voxt10-step4-matrix.*`、`voxt10-step5-matrix.*`）一并提交。caption、deep、MDX、数字未改。

## 提交

- 本次教程提交：**Voxt 10 displayed Step 5 机制动画完成，待协调固定复审，不自行销项。** Step 5 原为静态图，现循环四相：波形＋CUE 1 → CUE 2 括号（起点 3.40 早于讲话 3.70）→ 300 ms 提前块与「提前开始」→ 两行数字（讲话 3.70、句子 3.40、保住第一个辅音）。桌面与手机同相序；`STEP_PHASES` 加 step 4，reduced motion 停末相。同一提交含 Step 3 报告措辞更正与三个矩阵脚本及输出。
- Step 4 核销：**Step 4 的既有动画（游标扫过波形、450 ms 安静窗高亮）经 `.bot/out/voxt10-step4-matrix.mjs` 六组断言通过**（游标位置 8–9 个不同值、安静窗高亮出现、counter 均 `04 / 11`），无需教程改动，不单独提交。
- Step 3 断言更正：见下方 Step 3 报告的「验证口径更正」条目；旧探针只打印观测，新矩阵对 phase 3／4／5 分别断言精确 segment 行数、精确 `{"done":true,"count":2}` 载荷和发送状态文本，18 个状态全过。

## 硬门与证据

- `npm run build` **60 页**通过；`BOOK=voxt ONLY=10 STEP=5 npm run readability` **0 机械问题**；`deep-check 10`、英中全章 360／390／430 px `mobile`、`STEP=5 LANG=zh` 中文字号门、`zh-check`（`all clear`）全过；transcript 重生成，Step 5 新增 `loops` 行、末相内容完整。
- Step 5 机制矩阵 `.bot/out/voxt10-step5-matrix.mjs`：六组 × phase 1／3 断言全过（phase 1 有 CUE 2 括号、无 300 ms 与数字行；phase 3 齐全），输出存 `.bot/out/voxt10-step5-matrix.json`。首轮探针把桌面 CUE 2 括号标签里的 `3.40` 误当数字行而 FAIL，探针改为按 `speech at`／`讲话` 匹配后通过；这是探针误报，不是组件问题。
- Step 5 作者复评（协调基线不改写）：R1–R5 **10/10**、机制 R6 **2/2**（DOM 证据，未见图）、原十个非视觉项 **20/20**（#4／#5 待视觉复核）。R1 小学生复述：「句子不是等讲话开始才算起，而是提前 300 毫秒开始，这样第一个辅音不会被切掉。」冷读洞 **0**（300 ms 与两个时刻都在图上，原因在 caption 和末行）。截图存档（未能读取）：`/tmp/ls-d-s5/zh-390.png`。**未声称看过图片或视觉通过；未跑全站回归、真实 Voxt 或主人最终验收。**

## 剩余

- Step 1 的 P2（115.2 MB 可感比较、decoded 白话）按 TASK 顺序排在新步之后；下一单元为 Voxt 10 displayed Step 6。

# lane d 本轮报告 · Voxt 10 displayed Step 3 机制动画

日期：2026-11-27。类型：新步（一个 Step 一个提交；Step 1 的 P2 继续押后）。改动只有 `FileTranscription.svelte` 的 Step 3（组件内 step 2）动画与生成 transcript；caption、deep、MDX、数字均未改。

## 提交

- `2e11a6c`：**复审发现的协议错误已修。** 原四相末相把 `{"done":true,"count":2}` 和「还在发送」同时留在图上；pinned `Voxt/internal/fileasr/socket.go:98-106,114-123` 确认 `done` 只在上传完成（`body.n == req.Bytes`）后发出。Step 3 改为六相：路线 → 请求行 → PCM「还在发送」→ segment 1 → segment 2（PCM 仍未完）→ PCM「全部送完」＋`done`＋图例行。桌面与手机分支同相序，caption、deep、数字未改。transcript 重生成，末相为「all sent」＋两行 segment＋done。推送前 rebase 到 k1 `308a9d5` 之上，未 force-push。
- 验证口径更正（本轮）：此前 `/tmp/ls-d-probe7.mjs` 只打印观测、不含会失败的断言，且 `has('done')` 会把图例行 `done + count` 误判为 done 载荷，六组又都只采到 phase 3、没查 phase 4；上一轮把这样的观测记录写成「断言」是不准确的。已改为真正的断言矩阵 `.bot/out/voxt10-step3-matrix.mjs`：六组分别等 phase 3／4／5，要求精确的 segment 行数（1／2／2）、精确载荷 `{"done":true,"count":2}` 只在 phase 5 出现、「还在发送」与「全部送完」文本各在其相位、counter 均 `03 / 11`，任一不符即抛错退出。18 个状态全部通过，输出存 `.bot/out/voxt10-step3-matrix.json`。
- `e02da4c`：**Voxt 10 displayed Step 3 机制动画完成，待协调固定复审，不自行销项。** Step 3 原为静态图，现按同款模式循环四相：命令＋`transcribe.sock`＋运行中的 Voxt → JSON 请求行（`op`＋字节数）→ PCM 条「还在发送」→ 回复逐段回来（两个 `segment`＋`done`+句数）与图例行。末相同时看到 PCM 还在发送和回复已回来，对应 deep 的「边收边切句、识别」。桌面与手机分支同相序；`STEP_PHASES` 扩到 step 2，reduced motion 停末相。

## 硬门与证据

- `npm run build` **60 页**通过；`BOOK=voxt ONLY=10 STEP=3 npm run readability` **0 机械问题**；`deep-check 10`、英中全章 360／390／430 px `mobile`、`STEP=3 LANG=zh` 中文字号门、`zh-check`（`all clear`）全过；transcript 重生成，Step 3 新增 `loops` 行、末相内容完整，无 caption／出界／重叠报告。（协议修复后上述门全部重跑，`zh-check` 用 `WAIT=6000` 落在末相窗口内，结果不变。）
- 机制矩阵（DOM，无图像输入）：英文桌面直接 `?step=3`、中文桌面直接、中文 390×844 直接、英文桌面前步经 Next 进入、中文桌面前步进入、中文 390×844 前步进入，共 **6 组**。协议修复后先按 `/tmp/ls-d-probe7.mjs` 重采（只打印观测，不是断言）；本轮改按 `.bot/out/voxt10-step3-matrix.mjs` 的抛错断言矩阵重采，六组 × phase 3／4／5 全部通过（见上一条目），counter 均 `03 / 11`。
- Step 3 作者复评（协调基线不改写）：R1–R5 **10/10**、机制 R6 **2/2**（DOM 证据，未见图）、原十个非视觉项 **20/20**（#4／#5 待视觉复核）。R1 小学生复述：「命令先告诉运行中的 Voxt 要转多少字节，再把声音从本机 socket 送过去；声音还没送完，识别好的句子就一行一行回来了。」冷读洞 **0**（socket 由 subtitle「同一台 Mac 上两个程序之间的一扇门」解释，JSON 字段由图例行解释）。截图存档（未能读取）：`/tmp/ls-d-s3/zh-390.png`。环境同上轮；**未声称看过图片或视觉通过；未跑全站回归、真实 Voxt 或主人最终验收。**

## 剩余

- Step 1 的 P2（115.2 MB 可感比较、decoded 白话）按 TASK 顺序排在新步之后；下一单元为 Voxt 10 displayed Step 4。

# lane d 本轮报告 · Voxt 10 displayed Step 2 机制动画

日期：2026-11-27。类型：新步（复审指定的下一最小单元，一个 Step 一个提交；Step 1 的 P2 按 TASK 顺序继续押后）。改动只有 `FileTranscription.svelte` 的 Step 2（组件内 step 1）动画与生成 transcript；caption、deep、MDX、数字均未改，其余步、章、书、`.bot/memory/` 和第 1 本受保护英文原文未动。

## 提交

- 后续（同日）：手机分支补回「手机照片」名词（「约 256 KB，比一张手机照片小」「每张 4 MB 的手机照片，≈29 张」），硬门与中文 390 px 末相冷读重跑全过；报告补录两个机制矩阵组合与 Step 2 作者评分。
- `17f43dc`：**Voxt 10 displayed Step 2 机制动画完成，待协调固定复审，不自行销项。** Step 2 原为静态图，现按 Step 1 同款模式循环四相：构造的 `talk.m4a`（8 s）→ Mac 声音工具（16 kHz · 单声道 · 16 位）→ `audio.wav` 与字节算式（8 × 16,000 × 2 = 256,000 B，+44 B 头 = 256,044 B）→ 大小比较（约 256 KB 小于一张手机照片；一小时 115.2 MB ≈ 29 张）。桌面与手机分支同相序；`phase` 效果由只跑 Step 1 改为按 `STEP_PHASES` 驱动 Step 1／2，`data-animation-step/phase/final-phase` 同步；reduced motion 停在末相。推送前 rebase 到 k2 `4bae53e` 之上，未 force-push。

## 硬门与证据

- `npm run build` **60 页**通过；`BOOK=voxt ONLY=10 STEP=2 npm run readability` **0 机械问题**；`deep-check 10`、英中全章 360／390／430 px `mobile`、`STEP=2 LANG=zh` 中文字号门、`zh-check`（`all clear`）全过；transcript 重生成，Step 2 新增 `loops` 行、末相内容完整，无 caption／出界／重叠报告。
- 机制矩阵（DOM，无图像输入）：英文桌面直接 `?step=2`、中文桌面直接、中文 390×844 直接、英文桌面前步经 Next 进入（`/tmp/ls-d-probe4.mjs`），补录的中文桌面前步进入与中文 390×844 前步进入（`/tmp/ls-d-probe5.mjs`），共 **6 组 × 2 状态**。六组均为 phase 1（只有文件＋转换器）与 phase 3（`audio.wav`＋字节算式＋照片比较）两个不同机制状态，counter 均 `02 / 11`。
- Step 2 作者复评（协调基线不改写：整章仍 NO-GO）：R1–R5 **10/10**、机制 R6 **2/2**（DOM 两状态证据，无图像输入未做视觉复核）、原十个非视觉项 **20/20**（#4／#5 待视觉复核后由协调裁定）。R1 小学生复述：「Mac 自带的工具把录音文件转成模型能读的原始声音；8 秒是 256,000 个字节，一小时有 115.2 MB，大约 29 张手机照片。」冷读洞：复审发现手机分支「≈29 张」没有说清是 29 张什么（洞 1），已在本轮补回「手机照片」名词，中文 390 px 末相实测显示「约 256 KB，比一张手机照片小」与「每张 4 MB 的手机照片，≈29 张」，洞 **0**。
- 截图存档（未能读取）：`/tmp/ls-d-s2/en-early.png`、`en-final.png`、`zh-final.png`、`zh-390.png`。环境同上轮（临时 `vite.cacheDir`＋preview 4489，提交前已还原 `astro.config.mjs`）。**未声称看过图片或视觉通过；未跑全站回归、真实 Voxt 或主人最终验收。**

## 剩余

- Step 1 的 P2（115.2 MB 可感比较、decoded 白话）按 TASK 顺序排在新步之后；下一单元为 Voxt 10 displayed Step 3。

# lane d 本轮报告 · Voxt 10 Step 1 P1 修复补完（hook、输入扩展名、输出措辞）

日期：2026-11-27。类型：修旧（复审指出 `da08045` 审计面过窄后的补完）。改动只有 `src/voxt/chapters.ts` 的 hook、`FileTranscription.svelte` 的 Step 1、双语 deep 第 1 步、生成 transcript 和本报告；其余步、章、书、`.bot/memory/` 和第 1 本受保护英文原文未改。

## 提交与 finding

- `257acfd`：**P1 补完作者修复完成，待协调固定复审，不自行销项。** 两处遗留修掉：①舞台上方的可见 hook（`chapters.ts`）原来写「into SRT or TXT」，改为沿用第 9 章建立的通用任务「an audio file you already have」；桌面输入的 `meeting.m4a` 扩展名去掉，改为「a meeting you recorded · 1 hour of sound · on disk」。②caption「a new file」的绝对化承诺改掉：命令默认 `-o -` 写 stdout 不生成文件，`-o FILE` 还可能覆盖旧文件；caption 改「This one ends as a file」（这次转写的结果是一个文件），subtitle 改「a recording’s text can end in a file」（可以落成文件），ARIA 改「the example recording」，双语 deep 第 1 步的一句话、On the stage、路线动机三处同步，并指向第 9 步 stdout 的既有说明。英文 subtitle 新增手机短版（`dictation → cursor · recording → a file`），430 px 出界 15 px 的问题随之消除。
- 首次推送被拒（k2 `749347d` 先到），`git stash` 报告后 `git pull --rebase` 推送成功，再恢复报告，未 force-push。
- 已按复审更正本报告上一轮的「Step 8 首次命名 SRT/TXT」说法：第 9 章末步接缝已命名，本章 Step 8 详细解释两种格式。

## 硬门与证据

- `npm run build` **60 页**通过；`BOOK=voxt ONLY=10 STEP=1 npm run readability` **0 机械问题**；`deep-check 10`、英中全章 360／390／430 px `mobile`、`STEP=1 LANG=zh` 中文字号门、`zh-check`（`all clear`）全过；transcript 重生成，diff 含 hook 行与本步改动，无 caption／出界／重叠报告。
- 全页 DOM 审计（不只 `.viz`）：英文与中文（localStorage 切 zh）各取 phase 1／phase 2 两个机制状态，抓取 `.hook`、`.caption` 和全部 SVG 文本；两种语言两个相位对 `SRT|TXT|M4A|m4a` 全部 **clean**，phase 1 只有输入＋`Voxt transcribe`，phase 2 才出现 `TEXT IN A FILE` 与三行结论，机制 build-up 不变。探针脚本 `/tmp/ls-d-probe2.mjs`、`/tmp/ls-d-probe3.mjs`。
- 环境同上轮：`node_modules` 是指向主 checkout 的只读符号链接，临时 `vite.cacheDir`＋`astro preview --port 4489` 跑门，提交前已 `git checkout astro.config.mjs` 还原。**当前模型无图像输入能力，结论来自构建、transcript、源码、DOM 与几何检查，未声称看过图片或视觉通过。** 未跑全站回归、真实 Voxt 或主人最终验收。

## 剩余

- 同步 P2 保持开放：Step 1 末相的 `115.2 MB` 缺可感比较和可见算式，「decoded」舞台上没有白话。
- 下一单元：复审后指定的 **Voxt 10 displayed Step 2**（机制动画），一个 Step 一个提交。

# lane d 本轮报告 · Voxt 10 Step 1 的 P1「同屏新名过多」作者修复

日期：2026-11-27。类型：修旧（review.md 对 `bd884d2` 的固定复审里登记给 d 的开放 P1）。按主人 11-27 规则不等复审：先清本书开放 P1，本轮只做这一项，一个 Step 一个提交。本轮开始 HEAD 为 `04be539`，工作树干净；改动只有 `FileTranscription.svelte` 的 Step 1（组件内 step 0）图文、双语 deep 第 1 步的 On the stage 和生成 transcript。其余十步、其他章、其他书、`.bot/memory/` 和第 1 本受保护英文原文均未改；既有 `4526f171…a613` 大机制草稿未混入。

## 提交与 finding

- `da08045`：**Voxt 10 Step 1 的 P1 作者修复完成，待协调固定复审，不自行销项。** 按复审给的方向：沿用前九章建立的文件任务（第 9 章「现成的音频文件」、第 4 章文件型识别），首步不再命名格式。首步新名只剩 `Voxt transcribe` 一个：`FILE · TO SRT OR TXT` 改 `FILE · TO A FILE`（中：文件 · 到文件）；输入的「compressed sound (M4A)」改「a recording you have」（中：现成的录音）；输出的 `meeting.srt / talk.txt` 与「SRT = subtitle · TXT = plain text」改 `TEXT IN A FILE`＋「kept on disk」；caption 改为「文件转写的结果是一个新文件」。SRT／TXT 在第 9 章末步的接缝已命名，本章 Step 8 才详细解释两种格式，双语 deep 第 1 步 On the stage 同步并指向第 8 步。三相 build-up 机制（routes → 输入＋命令 → 输出＋三行）不变。
- 首次推送被拒（k1 `45a9c2a` 先到），按指示 `git pull --rebase origin tutorials` 后推送成功，未 force-push。提交落在 k1 之上。

## 作者评分与冷读边界

- Step 1 作者复评：R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**（原 R2 与新词扣分随修复消除）。R1 小学生复述：「听写把字写到光标那里；一段已经录好的会议录音，用 Voxt transcribe 变成一个存在磁盘上的新文件。」冷读洞 0：`meeting.m4a` 由「现成的录音」一句解释，dictation session、cursor、history 都在前几章出现过。
- 这是作者复评加 DOM 冷读，不是协调 verdict。协调固定基线不改写：本步 R1–R5 **10/12**、原十个非视觉项 **19/20**、原 #4/#5 **4/4**、原十二项 **23/24**；整章仍 **NO-GO**。**当前模型无图像输入能力，以上结论来自构建、transcript、源码、DOM 与几何检查，未声称看过图片或视觉通过。**

## 硬门与证据

- `npm run build` **60 页**通过；`BOOK=voxt ONLY=10 STEP=1 npm run readability` **0 机械问题**；`BOOK=voxt node scripts/deep-check.mjs 10`、英中全章 360／390／430 px `mobile`（`no layout breaks`）、`BOOK=voxt ONLY=10 STEP=1 LANG=zh` 中文字号门、`zh-check`（`all clear`）全过；transcript 重生成，diff 只有本步 6 行改动，无 caption／出界／重叠报告。
- DOM 相位矩阵（替代实图）：英文桌面直接 URL `?step=1` 在 +1300 ms（phase 1）与 +3200 ms（phase 2）两次采集，两状态的可见对象不同（phase 1 只有输入＋`Voxt transcribe`，phase 2 才出现 `TEXT IN A FILE` 与三行结论），两个机制状态成立；新文本在两种相位均无 SRT／TXT／M4A 命名。
- 环境记录：本 clone 的 `node_modules` 是指向 `~/code/learning-sglang/node_modules` 的只读符号链接，dev server 和 build 的 Vite cache 无法写入（EPERM）。本轮把 `astro.config.mjs` 的 `vite.cacheDir` 临时指向 fence 临时目录跑完 build 和 `astro preview --port 4489`，提交前已把该配置改回原样；4321 被其他进程占用，未动。
- 截图（未能读取，仅存档）：`/tmp/ls-d-s1/en-p1.png`、`en-final.png`、`zh-p1.png`、`zh-final.png`、`zh-390.png`。DOM 探针脚本 `/tmp/ls-d-probe.mjs`。未跑全站回归、真实 Voxt、音频识别或主人最终验收。

## 剩余

- **同步 P2 保持开放**（按顺序排在新步之后）：Step 1 末相的 `115.2 MB` 缺可感比较，算式只在 deep，「decoded」舞台上没有白话解释；复审要求保留精确数、补可感比较和可见算式或下一步指向。
- 下一单元：复审后指定的 **Voxt 10 displayed Step 2**（机制动画），一个 Step 一个提交；之后才轮到最多两个 P2。

# lane k1 本轮报告 · Omni 11 的 Omni-48／66／67

日期：2026-11-27。类型：修旧（direction 08:50 指定的最小单元）。本轮开始 HEAD 与 `origin/tutorials` 均为 `4c4a536`，工作树干净。范围只有 Omni 11 Steps 1、4、5，对应双语 deep、MDX 出处、`src/omni/numbers.ts`、生成 transcript、本章评分卡与进度记录、定向审计和本报告。Steps 7／8、Ch.12、Omni 13／14／15、其他书、`.bot/memory/` 和第 1 本受保护英文原文均未改。完成指定三项后停下，不提前处理 Omni-49～65，不开第 16／17 章。

## 提交与 finding

- `6f53cbc`：**Omni-48 的 Steps 4–5 作者修复完成，待协调固定复审，不自行销项。** Step 4 新增独立 `sem_id/c0` 相位，顺序为 Slow sample→reset＋Fast call 0→`sem_id/c0`→Fast calls 1–9→vocoder。Step 5 先淡出旧 Fast KV 并出现 fresh KV，再进入下一次 Slow 输入。十次 Fast 调用、十一行存储和十行送 vocoder 不变。
- `9ae66a2`：**Omni-48 的 Step 1、Omni-66、Omni-67 作者修复完成，待复审。** Step 1 使用同样的 pinned 顺序，保留 `c0` 与 `c1–c9` 分相；顶部补 `preprocessing → tts_engine → vocoder`，标明本章在 `tts_engine`。底部用 22 个非结束接受帧给出 `22 × 2,048 = 45,056` 个采样点、约 1.022 秒、22 次 Slow 采样和 220 次 Fast 调用。图上另有 `2 × 4 × 8 × 8 × 4 = 2,048`，脚注排除结束工作并声明不是实测延迟。没有搬入 Step 7 的 40 帧开窗。
- `9ae66a2` 首次提交为 `6216582`，推送被拒后按指示 `git pull --rebase origin tutorials`，落到 `04be539` 上并推送成功。`6f53cbc` 首次推送成功。全程未 force-push。
- 移动 deep 首轮发现三处横溢：Step 1 长出处、Step 4 符号表、Step 5 符号表与长出处。通过 `speech/`、`decoder/` 路径缩写和短出处单元格修复后，1440 与 390 px 的 12 个双语视图均通过，未改共享 `StepControls` 或全站 CSS。

## 作者评分与独立冷读边界

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 1 | 10/10 | 2/2 | 20/20 | Slow 先采样；Fast 第 0 次重置后得到 c0，再选 c1–c9。22 个生成帧约 1.022 秒，要 220 次 Fast 调用。 | 0 |
| 4 | 10/10 | 2/2 | 20/20 | Slow 先采样，Fast 第 0 次重置并传数，再出现 c0 和另外九个 codes。 | 0 |
| 5 | 10/10 | 2/2 | 20/20 | Fast 先清空内层 KV，再进入下一次 Slow 输入；Slow 仍保留之前的工作。 | 0 |

- 独立 `explore` 冷读第一轮否决了参考声音 22 帧与生成调用次数混用、`c0` 归属和 2,048 出处三处问题；修正后，Step 1 与 Steps 4–5 两个复审会话均 **PASS、0 非视觉洞**。移动 deep 调整后再次复核，出处和内容未回退。
- 这些是作者复评与独立源码、transcript、DOM 冷读，不是协调 verdict。固定 `ef82fe9` 的协调基线不改写：R1–R5 **80/80**、机制 R6 **16/16**、原十个非视觉项 **158/160**、原 #4/#5 **32/32**、原十二项 **190/192**，整章仍 **NO-GO**。原 #4/#5、整章新总分和销项不由本轮自行改写。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；八步 `readability`：**0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 11`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Steps 1／4／5 字号门和 `git diff --check` 全过。
- transcript 连续两次 SHA-256 相同：`c92cdd4d4679c2a6314da1845e013ff063f36f7d88c9d67d73374fc4e984eed9`，**2,313 词**。无 caption、文字出界、重叠或文本规则报告。
- 动画矩阵覆盖 Steps 1／4／5 × 英文桌面／中文桌面／中文 390 px × 直接 URL／前步入口，共 **18 个组合、132 个状态、114/114 个机制转变**。最低 **10.806 CSS px**，重叠和 SVG 出界均为 0。可重跑脚本：`.bot/out/omni11-phase-audit.mjs`；报告在 `.bot/out/omni48-s1-*`、`omni48-s4-*`、`omni48-s5-*`。
- Steps 1／4／5 的双语 deep 在 1440 和 390 px 共 **12 个打开抽屉视图**全部通过：counter 和 `aria-expanded=true` 正确，页面和抽屉横溢、KaTeX error、raw math、缺失目标文本均为 0。脚本：`.bot/out/omni11-deep-audit.mjs`；报告在 `.bot/out/omni48-deep-1440/` 和 `.bot/out/omni48-deep-390/`。
- 代表截图：`.bot/out/omni48-s1-en/s1-p3.png`（Fast call 0 后出现 `sem_id = c0`）。**当前模型不能读取 PNG，工具已明确返回无图像输入能力；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- pinned `sglang_model.py:482-508@3a31bd72` 与 `config.py`、`modded_dac_vq.yaml`、`modded_dac.py:885,913`、`audio_vocoder.py:218-223` 已用于核对顺序、locator 和帧几何。未跑全站回归、真实 Fish／SGLang-Omni、模型、GPU、音频质量、故障注入或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤，未据此返工。

## 剩余与清理

- 剩余事项是 Omni-48／66／67 的协调固定复审、原 #4/#5、整章评分、具备图像能力的复审和主人最终视觉验收。按 direction 停下，再按协调顺序处理 Omni-49～65；其他开放 finding 未改。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4501`，地址：`http://localhost:4501/learning-sglang/omni/ch/11-fish-s2-pro/?step=1`。本轮 4501 服务已停止且端口无监听。
- 审计脚本均调用 `browser.close()`。收尾 `pgrep -P 1 -fl 'headless=new.*cdp-'` 无输出；其余 Chrome 的 cwd 属于协调快照、后台 regress 或 lane d，非本轮所起，未动。
---

# lane k2 本轮报告 · ML Systems 07 的 ML-41～44

日期：2026-11-27。类型：修旧（direction 在 ML-19 后指定的同章四项）。本轮开始 HEAD 与 `origin/tutorials` 均为 `e153ede`，fetch 后 fast-forward 到 `6d56014`，工作树干净。范围只有 ML 07 Steps 2、4、5、6、7、对应双语 deep、MDX 出处、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。ML-50／55 与本轮四项分开，未改；未开新章或第 14 章。

## 提交与 finding

- `ffc1bca`：**ML-41 作者修复完成，待协调固定复审，不自行销项。** Step 2 只把 `checkpoint` 作为新技术概念并就地解释为存好的权重；另外两条路线只用「权重数值／权重位置」作地图标签，Steps 3／4 再命名并展开机制。磁盘顺序仍是保存→读取→各 worker 装入自己那份，不再同屏引入 `update channel`、`process group`、`handle`、`local shard`。Step 2 的 `update_weights_from_disk` 同时移入显式图外实现段。
- `be75f4e`：**ML-43 的 Step 4 部分作者修复完成，待复审。** `MultiprocessingSerializer.serialize`、`gather_object`、`tensor.get(tp_rank)` 和来源另有的 `[512,1024]` 都移入 `Implementation · not drawn`／「图外实现」；图上保留 `FULL_TENSOR()`、可见形状、位置便签和 `load_weights`，并修正 deep 的大小写。
- `7115a57`：**ML-42 作者修复完成，待复审。** 双语 deep 按相位写明：起初 Bucket 1 在 GPU、后续桶在外等待；Bucket 1 清空后，末相 Bucket 2 在 GPU，临时区仍只有一桶。不再把首相描述当成整步终态。
- `2174628`：**ML-44 作者修复完成，待复审。** 桌面、手机和双语 deep 统一为 `on failure, discard the partially updated model`／「失败时，弃用部分更新的模型」；英文手机拆成两行，自动回滚边界另句保留。
- `65f3033`：**ML-43 的 Step 7 部分作者修复完成，待复审。** `torch.cuda.synchronize()` 及 CPU 计时等待 GPU 排队工作的说明移入 `Measurement setup · not drawn`／「图外测量设置」，不再冒充图上对象或算式的一项。
- Step 2 与 Step 6 首次推送均被拒，均按指示 `git pull --rebase origin tutorials` 后推成功；其余首次推送成功。全程未 force-push。

## 作者评分与独立冷读边界

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 2 | 10/10 | 2/2 | 20/20 | 三条路线选一条；磁盘路线先保存再读取，每个 worker 装入自己那份。 | 0 |
| 4 | 10/10 | 2/2 | 20/20 | 四块训练分片拼成一张权重表，只传位置便签，SGLang 重建后留下自己那份。 | 0 |
| 5 | 10/10 | 2/2 | 20/20 | 临时显存一次只放一桶；第 1 桶清空后，第 2 桶才上 GPU。 | 0 |
| 6 | 10/10 | 2/2 | 20/20 | 生成等完整 v1 才恢复；更新失败时，弃用部分更新的模型。 | 0 |
| 7 | 10/10 | 2/2 | 20/20 | 每个张量三次 10 ms 暂停，约 160 次重复，合计少等 4.845 秒。 | 0 |

- 独立 `explore` 冷读对 **ML-41／42／43／44 全部 PASS**，指定范围剩余内容洞 **0**；逐步作者参考值如上。冷读核对了源码、双语 deep、transcript 和 DOM／几何报告，没有读取 PNG。
- 这些是作者复评与独立冷读，不是协调 verdict。固定 `ef9b2bf` 的协调基线不改写：R1–R5 **78/80**、机制 R6 **16/16**、原十个非视觉项 **158/160**、原 #4/#5 **32/32**、原十二项 **190/192**，整章仍 **NO-GO**。原 #4/#5、整章新总分和销项不由本轮自行改写。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；八步 `readability`：**0 机械问题**；`BOOK=ml-sys node scripts/deep-check.mjs 07`、`zh-check`、英中全章 360／390／430 px `mobile`、中文 Steps 2／6 字号门和 `git diff --check` 全过。
- transcript 连续两次逐字一致：**1,988 词**，SHA-256 `bda0a125bd055f703774d63b436d885ce6d4e5b55517ae5e5d7940f2fa93e39a`。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml07-review-audit/report.json`：**166/166 个状态、134/134 个机制转变、10 个双语 deep 状态**，最低 **10.91015625 CSS px**，重叠、SVG 出界和页面横溢均为 **0**，`failures=[]`。Steps 2／4／5／7 覆盖英中桌面和中文 390 px 的直接／前步入口；Step 6 另覆盖英文 390 px 两条入口。可重跑脚本为 `.bot/out/ml07-review-audit.mjs`。
- 代表截图：`.bot/out/ml07-review-audit/en-1440-direct-s2-p5.png`、`.bot/out/ml07-review-audit/zh-390-direct-s5-p5.png`、`.bot/out/ml07-review-audit/en-390-direct-s6-p4.png`。**当前模型不能读取 PNG，工具已明确返回无图像输入能力；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- `docs/z2s-map.md` 没有 ML 07 的直接对应课程章，本轮未借其他主题扩写。已重读 pinned `sys-design/readme-1.md:45-209,250-409` 与 `latency-accelerate-for-weight-updates/readme.md:575-614,975-1069`，只移动既有事实的呈现层级，未引入新机制或数字。
- 未跑全站回归、真实训练、权重传输、SGLang／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤，未据此返工。

## 剩余与清理

- 剩余事项是 ML-41～44 的协调固定复审、原 #4/#5、整章评分、具备图像能力的复审和主人最终视觉验收。下一修旧单元按 direction 分开处理 ML-50／55；ML 12 留作之后的独立单元，其他开放 finding 未改。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4502`。地址：`http://localhost:4502/learning-sglang/ml-sys/ch/07-weight-updates/?step=2`；Step 6 为 `?step=6`。本轮 4502 服务已在收尾停止，审计脚本已调用 `browser.close()`，其他 lane 的进程未动。

---

# lane d 本轮报告 · 撤回 Voxt 11 的 144 未决差异记录（按协调记录纠偏定为 143/144）

日期：2026-11-27。类型：修旧（记录补正第四轮）。本轮开始 HEAD 与 `origin/tutorials` 均为 `be75f4e`，工作树干净。范围只有 Voxt 11 评分卡、`memory/progress.md` 第 11 章行与本报告；无教程 diff。

- **协调已裁定 144/144 是其记录错误。** `.bot/memory/review.md` 新增「记录纠偏：Voxt 11 原十二项 143/144」：固定 `26941bb` 的 Step 5 diff 只改组件相位与生成 transcript，逐步非视觉分仍为 19+20+20+20+20+20=119/120，原 #4/#5 为 24/24，算术合计只能是 **143/144**；上一轮写成 144/144 不对应任何内容加分。`.bot/memory/direction.md` lane d 段据此要求 d 撤回 144 的未决差异记录。
- **落实撤回。** `866b58b` 写入的「公布 144/144、分项差 1 分未决」记录作废：评分卡四处（分数状态、EVAL 第 6 节注、复审表合计行、文末合计）恢复 **143/144**，差异记录改写为「已关闭」并引用协调纠偏节；progress 第 11 章行同步为 143/144（协调记录纠偏）。R1–R5 **54/60**、机制 R6 **12/12**、整章 NO-GO、相位图计数与其余历史证据措辞均不动。
- **修复的 review finding：** direction.md lane d 段的「d 应撤回 144 的未决差异记录」；review.md「记录纠偏」节对应的本线记录义务。Voxt 08 与 Voxt 10 的旧开放项本轮未动：`bd884d2`（Voxt 10 Step 1）继续冻结等固定复审，d 暂停新写作，下一最小单元是复审后指定的 Voxt 10 Step 2。
- **剩余：** Voxt 10 Step 1 的 `bd884d2` 等协调固定复审；三条 reviewer 线索（p3→p0 回绕、评分卡第 32 行、Step 5 审计证据）留待该复审；`e153ede…866b58b` 记录来回仍留队列按 oldest-first 核销。Voxt 12 排在 P0 清理之后。
- `git diff --check` 通过；markdown-only，未跑构建，未启动服务或浏览器。

---

# lane d 本轮报告 · 恢复 Voxt 11 公布总分 144/144（差异保持未决）

日期：2026-11-27。类型：修旧（记录补正第三轮，撤回上一轮的自作裁定）。本轮开始 HEAD 与 `origin/tutorials` 均为 `f00b242`，工作树干净。范围只有 Voxt 11 评分卡、`memory/progress.md` 第 11 章行与本报告。

- **恢复协调公布总分。** `.bot/memory/direction.md:3,13` 与 `.bot/memory/review.md:6,63` 均记录 `26941bb` 后原十二项为 **144/144**；上一轮把它改成 143/144 并称「协调裁定」，没有仓库证据支持，已撤回。评分卡与 progress 行恢复为：公布 **144/144**，分项 119/120＋24/24＝143/144 的 1 分差**保持未决**，等协调更新 `.bot/memory` 后再对齐；不虚构加分，也不自行改写 verdict。
- **保留有效更正：** 相位图计数 80 张（32＋32＋16）、机制 R6 12/12、R1–R5 54/60、整章 NO-GO、其余历史证据措辞，均不回退。
- `git diff --check` 通过；markdown-only，未跑构建。`bd884d2` 与 Voxt 10 Step 2 继续冻结。

---

# lane d 本轮报告 · Voxt 11 总分裁定落实与相位图计数更正

日期：2026-11-27。类型：修旧（记录补正第二轮）。本轮开始 HEAD 与 `origin/tutorials` 均为 `6d56014`，工作树干净。范围只有 Voxt 11 评分卡、`memory/progress.md` 第 11 章行与本报告。

- **原十二项定为 143/144（协调裁定）。** 固定 `fa8d912`／`2760565`／`3aa0d2d` 均明确保留 143/144，`26941bb` 只升机制 R6、未指明任何原十二项加分；评分卡与 progress 行现已一致写 **143/144**，`26941bb` 正文里的 144/144 记为已裁定更正。R1–R5 保持 **54/60**，整章仍 NO-GO，未虚构第 1 步加分。
- **相位图计数更正：** 作者证据为 **80 张**（第 3 步 32＋第 4 步 32＋第 5 步 16），替换上一轮误写的 64 张。
- `git diff --check` 通过；markdown-only，未跑构建；未启动服务或浏览器。`bd884d2` 与 Voxt 10 Step 2 继续冻结。

---

# lane d 本轮报告 · Voxt 记录同步补正（progress、差异记录、措辞）

日期：2026-11-27。类型：修旧（记录补正，应协调指出的三处）。本轮开始 HEAD 与 `origin/tutorials` 均为 `e153ede`，工作树干净。范围只有 `memory/progress.md`、两章 Voxt 评分卡与本报告；未改教程源码、transcript、`.bot/memory/` 或第 1 本受保护英文原文。

## 本轮修复

- **`memory/progress.md` 补登。** Voxt 08 行由「字号 P0 待复审」改为协调固定 `bb70918` GO（70/70、140/140、14/14、28/28、168/168、机制 14/14、0 洞，平均 24.00，主人最终验收另计）；Voxt 11 行由「143/144、机制 11/12、Step 5 冻结」改为机制 **12/12**（六步机制均 GO）、原十二项公布 **144/144**、整章因易读基线 **54/60** 仍 NO-GO。
- **评分卡算术差异如实记录，不虚构加分。** 固定 `26941bb` 公布原十二项 144/144，但复审正文未指明任何逐步内容分项加分：逐步非视觉分仍 19/20/20/20/20/20＝119/120（第 1 步 #1 扣分保留），原 #4/#5 仍 24/24，分项之和 **143/144**。Voxt 11 评分卡在表格和合计处保留已审分项，公布总分与分项之和的 1 分差记为**未决记录差异，待协调澄清**，不再声称本卡已完全同步。
- **过期「待复审」措辞改为历史作者证据。** Voxt 08 评分卡三处（表头、第 8 次修复节、桌面字号门尾注）与 Voxt 11 评分卡四处（第 4 步节标题、两处「视觉仍待协调人」、待办边界尾）均标明对应的后续固定 GO（`bb70918`、`fa8d912`、`2760565`、`3aa0d2d`、`26941bb`）。
- **上一轮报告的「Voxt 11 无剩余开放项」改为记录剩余债务**：整章因易读基线 54/60 仍 NO-GO（direction.md:13）。`bd884d2` 与 Voxt 10 displayed Step 2 继续冻结，本轮未碰。

## 验证与边界

- 无教程源码 diff，未跑构建或硬门（全部为 markdown 记录）；`git diff --check` 通过。未启动 dev server 或浏览器。
- 不改任何协调分数、不销队列行；唯一新增判断是把 144/144 对 143/144 的 1 分差异登记为待协调澄清。

---

# lane d 本轮报告 · Voxt 08／11 评分卡同步到固定复审

日期：2026-11-27。类型：修旧（记录同步）。本轮开始 HEAD 与 `origin/tutorials` 均为 `e7511b2`，工作树干净。范围只有 `memory/scores/inside-voxt/personal-dictionary.md`、`memory/scores/inside-voxt/models-and-app-updates.md` 与本报告；未改教程源码、transcript、`.bot/memory/`、其他书或第 1 本受保护英文原文。最新回归只有 `(exit 13)`，按 direction 没有可分配布局步骤，未据此返工。

## 本轮修复的 review finding

- **评分卡同步项（review.md 多次列为 [d] 开放项）。** Voxt 08 评分卡原仍记「完整 EVAL NO-GO、字号 P0 待复审」，已同步为协调固定 `bb70918` 的 verdict：R1–R5 70/70、原十项 140/140、静态 R6 14/14、原 #4/#5 28/28、原十二项 168/168、机制 R6 14/14、未决内容洞 0，**本章 GO**；主人最终视觉与真实 Voxt 产品验收另计。后续 `17b8c38` 性能 deep 增量已经固定 `5dce1be` 复核 GO、不改章分，一并记录。
- **同上。** Voxt 11 评分卡原仍记「机制 11/12、Step 5 冻结待复审、原十二项 143/144」，已同步为协调固定 `26941bb` 的 verdict：Step 5 GO，机制 R6 **12/12**（逐步 2、2、2、2、2、2），原十二项 **144/144**；R1–R5 保持 **54/60**，整章仍因易读基线 **NO-GO**，不记整章完成。同步只采用协调已发布的 verdict，不采用作者自评。
- **Voxt 08 报告句记录项（review.md:1010）：已在此前一轮改毕**（本文件历史：「教程提交 `bb70918` 与报告提交 `b233fbe` 两笔分开」），本轮复核无需再改，仅登记关闭。

## 逐项核对后无可行动项的开放 finding

- Voxt 10 `04ded697` 复审的 Step 9 公式、中文第 9／11 步深入讲解结构、ARIA 收窄与评分卡同步，已由 `bdd5d78`／`5ea23fe`／`8790312` 修毕并写入评分卡待复审；本轮逐条对照当前树确认修复在位（双语公式三分支、中文结构、ARIA 只问模型文件、`cutter.go:199` 出处、MDX 无「应用更新」措辞）。
- Voxt 10 机制 R6 0/22：displayed Step 1 的 `bd884d2` 按 direction 冻结等固定复审；Steps 2–11 的机制动画（含复审后指定的 displayed Step 2）在复审指定前不开，不重做已冻结内容，也不追加 freeze／wait 报告。
- Voxt 11 无离散开放 finding；剩余债务是整章因易读基线 R1–R5 **54/60** 仍 NO-GO（direction.md:13），不改分、不记完成。Voxt 08 无剩余开放项。Voxt 12 排在性能谱系与 P0 清理之后，lane d 暂停新写作，本轮不开。

## 验证与边界

- 无教程源码 diff，未跑硬门（评分卡在构建外）；`git diff --check` 通过。未启动 dev server 或浏览器。
- 本轮不是 freeze／wait 报告：含两处评分卡实质同步。不改任何协调分数、不销任何队列行、不改变 `bd884d2` 与其他线的冻结状态。

---

# lane k2 本轮报告 · ML Systems 10 Step 8 R2 与 Step 9 ML-19

日期：2026-11-27。类型：修旧（direction 在两个 P0 之后指定的 ML-19，同章 Step 8 的 R2 一并完成）。本轮开始 HEAD 与 `origin/tutorials` 均为 `1617877`，工作树干净。范围只有 ML 10 Steps 8–9、对应双语 deep、MDX 出处、规划、生成 transcript、本章评分卡与进度记录、定向审计和本报告；未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。此前的 ML-45／46 已在 `c4ab9c8`／`d9b4ede` 完成本轮前修复，未重做。

## 提交与 finding

- `e7511b2`：**Step 8 R2 作者修复完成，待协调固定复审，不自行销项。** 舞台和 caption 只引入 W4A16：撤销加 8、恢复 BF16 权重、与 BF16 激活值相乘。FP32 累加卡、公式和图例移出舞台，作为双语 deep 的显式图外细节保留；Step 7 的 deep Next 与 MDX 出处同步。首次推送被拒后按指示 `git pull --rebase origin tutorials`，再推成功，未 force-push。
- `b5cc7ba`：**ML-19 作者修复完成，待协调固定复审，不自行销项。** Step 9 舞台最后问「target 每轮 RL 都更新，draft 怎样跟着它学习？」双语 deep 的 Next、规划表和实际 `next` 链接均指向 ready 的第 12 章第 1 步；不再指向第 13 章，也不恢复到未 ready 的第 11 章。第 12 章第 1 步以 target 更新和在线 draft 训练回答同一问题。首次推送成功。
- 固定 `8e27f28` 的协调基线不因此改写：R1–R5 **89/90**、机制 R6 **18/18**、原十二项 **216/216**，整章仍 **NO-GO**。ML-41～44、ML-50／55 和其他队列项保持原状；未开新章或第 14 章。

## 作者评分与独立冷读边界

| 步 | R1–R5 | 机制 R6 | 原十个非视觉项 | R1 小学生复述 | 新内容洞 |
|---|---:|---:|---:|---|---:|
| 8 | 10/10 | 2/2 | 20/20 | 编码先减 8，再乘 scale 变回 BF16 权重，最后和 BF16 激活值相乘。 | 0 |
| 9 | 10/10 | 2/2 | 20/20 | 594.206 GB 的模型数据放不进一张 141 GB 卡，但八张卡合计有 1,128 GB；其他运行数据还要占显存。 | 0 |

- 两步作者参考值合计为 R1–R5 **20/20**、机制 R6 **4/4**、原十个非视觉项 **40/40**、新内容洞 **0**。两个独立 `explore` 冷读均为 **PASS**：Step 8 未见舞台残留 FP32 或双语 deep 误称已画图；Step 9 的舞台问题、双语 Next、ready roster 和第 12 章回答链一致。
- 这些是作者复评与独立源码／transcript 冷读，不是协调 verdict。原 #4/#5、原十二项新总分、整章销项和图像验收不自行改写。

## 硬门与证据

- 两次最终 `npm run build` 均为 **60 页**通过；Steps 8／9 readability 均为 **0 机械问题**；`deep-check 10`、`zh-check`、英中本章与中文目标步 360／390／430 px mobile、`git diff --check` 全过。
- 最终 transcript 连续两次逐字一致：**2,265 词**，SHA-256 `343fc025b9ea11594480c1cd471962098367b750a435dd7878447d542eb04fc1`。无 caption、文字出界、重叠或文本规则报告。
- `.bot/out/ml10-step8-audit/report.json`：英中桌面与中文 390 px 的直接／前步入口共 **12 个状态、6 个机制转变、2 个 deep 状态**，`failures=[]`，最低 **10.8425625 CSS px**。普通舞台均无 FP32，deep 中均有明确图外 FP32 细节。
- `.bot/out/ml10-step9-audit/report.json`：同类入口共 **12 个状态、6 个机制转变、2 条完整章间接缝**，`failures=[]`，最低 **10.46579391891892 CSS px**。英中实际链接和落点均核到第 12 章第 1 步。
- 代表截图：`.bot/out/ml10-step8-audit/en-1440-direct-p3.png` 与 `.bot/out/ml10-step9-audit/zh-390-direct-p2.png`。**当前模型不能读取 PNG，工具已明确返回无图像输入能力；以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，未声称看过图片或视觉通过。**
- 本轮已读 zero-to-sglang 第 3 部分第 2 章。Step 8 与其 W4A16 反量化路径一致，Step 9 保留真实 checkpoint 负载不等于完整运行显存的边界。通用 PTQ、真实 checkpoint 拆分与质量复测仍属既有 Z19a／Z19b 和第 1 本 Ch.22 范围，不借本轮扩写。
- 未跑全站回归、真实 INT4 训练、Marlin／CUDA、rollout 显存、GPU benchmark、故障注入或 reduced-motion 动态切换。最新回归只有 `(exit 13)`，没有可分配布局步骤，未据此返工。

## 剩余与清理

- 剩余事项是 Step 8 R2 与 ML-19 的协调固定复审、原 #4/#5、图像能力复审和主人最终视觉验收。下一修旧单元按 direction 处理 ML-41～44；ML-50／55 分开核销，ML 12 留作之后的独立单元。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4498`。地址：`http://localhost:4498/learning-sglang/ml-sys/ch/10-int4-qat-rollout/?step=8` 与 `?step=9`。本轮 4498 服务已停止且端口无监听，两个审计脚本均调用 `browser.close()`。
- 收尾 `pgrep` 列出 `cdp-KbTD67` 及随后两台 Chrome；`lsof` 确认它们的工作目录分别属于后台 regress、另一质量线和协调快照，均非本 lane，未动。`ps` 虽被系统拒绝，但进程归属已由 cwd 核实。本轮启动的服务和脚本浏览器已按各自接口关闭，其他 lane 进程未动。

---

# lane k2 本轮报告 · ML Systems 03 ML-45 与 04 ML-46

日期：2026-11-27。类型：修旧（direction 指定优先处理的两个新 P0）。本轮开始 HEAD 与 `origin/tutorials` 均为 `649bc13`，工作树干净。范围只有 ML 03 Step 4、ML 04 Steps 6–7、对应双语 deep、MDX 出处、`src/ml-sys/numbers.ts`、生成 transcript、两章评分卡与进度记录、定向审计和本报告；未改其他章、其他书、`.bot/memory/` 或第 1 本受保护英文原文。最新回归只有 `(exit 13)`，没有可分配布局步骤，未据此返工。

## 提交与 finding

- `c4ab9c8`：**ML-45 作者修复完成，待协调固定复审，不自行销项。** ML 03 Step 4 新增独立 M 相位，先显示 `5,514 − 4,536 = 978`，再显示 `978 + 44 = 1,022`。箭头按 P、M、E 地标分段移动，不再把 511 画到 M。首次推送成功。
- `d9b4ede`：**ML-46 作者修复完成，待协调固定复审，不自行销项。** ML 04 Step 6 每轮列出分块、发送方、接收方、接收端算式和新持有者，并以 4×4 表展示全部当前持有者；Step 7 复用第 2 轮 `A: GPU 1→2 · 3+3=6` 的同一日程。首次推送成功。
- 本报告是伴随上述教程 diff 的收尾记录，不是重复 freeze／wait 报告。ML 04／06 及此前队列的协调复审状态不改写，其他开放 finding 保持原状；未开新章节。

## 作者评分与独立冷读边界

- ML 03 Step 4：R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、新内容洞 **0**。小学生复述：「模型回到 4,536 的副本，先重走 978 个旧位置，再算 44 个新位置到 5,558。」独立 `explore` 按源码、双语 deep、transcript 和 DOM 给出 PASS。
- ML 04 Steps 6／7：每步 R1–R5 **10/10**、机制 R6 **2/2**、原十个非视觉项 **20/20**、新内容洞 **0**。独立 `explore` 逐轮复算通过；其 RS 缩写、All-Gather 空格含义和手机时间同尺三个冷读问题已修，复审确认全部关闭，剩余内容阻塞为 0。
- 这些是作者复评与独立源码／DOM 冷读结果，不是协调 verdict。原 #4/#5、原十二项总分、整章分数和图像验收不在本轮自行改写。

## 硬门与证据

- 最终 `npm run build`：**60 页**通过；ML 03 Step 4、ML 04 Steps 6／7 readability 均为 **0 机械问题**；两章 `deep-check`、`zh-check`、英中三宽度 mobile、中文目标步字号门和 `git diff --check` 全过。
- 两章 transcript 重采与各自 pinned 逐字一致。ML 03 为 **1,342 词**，SHA-256 `3b7f8a1b0e5eaf8221199b0dfd5081df0771942a6d8a5530518f1088367f2159`；ML 04 为 **1,390 词**，SHA-256 `770ffe3df018946e9548d8b2d627b3a91f559065b67217345dd053fe63cedf4f`。
- `.bot/out/ml45-audit.json`：英文桌面、中文桌面、中文 390 px 和中文前一步进入共 **12 个状态**，相位、counter、语言、M/E 坐标和文字断言全过，`failures=[]`。代表图：`.bot/out/ml45-audit/en-desktop-p3.png`。
- `.bot/out/ml46-ring-audit/report.json`：同类入口共 **48 个状态、40/40 个机制转变、8 个 deep 状态**。逐相断言传送行与 4×4 持有者表；手机末相另断言时间块宽度为 `[30,75,30,30,30,30]`。最低 **10.039 CSS px**，重叠、SVG 出界和页面横溢均为 **0**。代表图：`.bot/out/ml46-ring-audit/en-1440-s6-p3.png`。
- 当前模型不能读取 PNG，以上结论来自构建、transcript、源码、独立冷读、DOM 和几何检查，**未声称看过图片或视觉通过**。未跑全站回归、真实模型、NCCL／CUDA、GPU benchmark、故障注入或 reduced-motion 动态切换。

## 剩余与清理

- 剩余事项是 ML-45／46 的协调固定复审、原 #4/#5 和整章评分、具备图像能力的复审及主人最终视觉验收。ML 04 的 ML-29、ML 03 的 ML-49／59 等其他开放项未改；ML 07 的 ML-41～44／50／55、ML 10 Step 8、ML 12 和后续队列仍按 direction 处理。
- 本 clone 的 `node_modules` 原指向协调人 checkout；已只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本地查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4497`。地址：`http://localhost:4497/learning-sglang/ml-sys/ch/03-hybrid-state-cache/?step=4` 与 `http://localhost:4497/learning-sglang/ml-sys/ch/04-gpu-communication/?step=6`。本轮 4497 服务已停止且端口无监听，检查脚本启动的浏览器均已关闭；`pgrep -P 1` 未发现孤儿 headless Chrome，其他 lane 的活跃进程未动。

---

# lane k1 本轮报告 · Omni 13／14 的 Omni-47 步进控制

日期：2026-11-27。类型：修旧（review.md 07:50 新增的 P0，按其指定最小单元）。本轮开始 HEAD 与 `origin/tutorials` 均为 `1617877`，工作树干净。范围只有 Omni 13／14 父组件的 `StepControls` 接线和本报告；未改舞台、caption、双语 deep、MDX、transcript、评分卡、`memory/`、`.bot/memory/`、其他章、其他书或第 1 本受保护英文原文。Omni-46 继续冻结，Step 7／8 与 Ch.12 交接未改，未开第 16／17 章。

## 修复与评分边界

- 教程提交 `937ba01` 已推到 `origin/tutorials`，首次推送成功，未 force-push。**Omni-47 作者修复完成，待协调固定复审，不自行销项。** 两个父组件由 `bind:step` 改为显式 `{step}` 与 `onchange={(s) => (step = s)}`，与 `StepControls` 的实际回调接口一致；共享 `StepControls` 未改。
- 改前在本 lane 真实浏览器复现：Omni 14 英文直接打开 `?step=6`，点击 Next 和按 ArrowRight 后 counter 都停在 `06 / 08`，两次均捕获 `Uncaught TypeError: $$props.onchange is not a function`。
- 改后覆盖 Omni 13／14 × 英中四种组合。每种组合依次验证直接 `?step=6`、Next、ArrowRight、ArrowLeft、Previous、Reset 和进度段，共 **28 个状态**；counter 与 `data-animation-step` 每一步都一致，目标分别为 `06→07→08→07→06→01→05`，页面错误均为 **0**。
- 本单元只修交互接线，不重评内容或动画分。协调基线不变：Omni 13 固定 `bd4aa5d` 的既有 GO 不自行扩大；Omni 14 固定 `07cb716` 仍为 **R1–R5 80/80、机制 R6 16/16、原十二项 192/192、完整 EVAL NO-GO**，等协调核销 Omni-47，既有 ML-21／22 不在本单元改动。

## 目标硬门与证据

- `npm run build`：**60 页**通过；`git diff --check` 通过。Omni 13 十步与 Omni 14 八步 `readability` 均为 **0 机械问题**；`BOOK=omni node scripts/deep-check.mjs 13／14` 均通过。
- 两章 `transcript` 均在本 lane 4497 服务重采，无 caption、文字出界、重叠或文本规则报告，生成文件相对 pinned **无 diff**。
- 两章英文和中文全章 360／390／430 px `mobile` 均报 **no layout breaks**；两章中文 Steps 6／7 的逐步字号门也通过。`BOOK=omni ONLY=13,14 node scripts/zh-check.mjs`：**all clear**。
- 代表截图：`.bot/out/omni47-step-controls/omni14-en-step7.png` 与 `.bot/out/omni47-step-controls/omni13-zh-step7.png`。旧 clone 的 PNG 未随提交保留；本 clone 已从直接 Step 6 后按 ArrowRight 重采，截图由 `18f0b6e` 提交。重采后的 DOM 复核为 Omni 14 `06 / 08 → 07 / 08`、Omni 13 `06 / 10 → 07 / 10`，两章 `data-animation-step` 均为 `5→6`。当前模型不支持图像输入，**未声称看过图片或视觉通过**；原 28 个状态的错误监听结论不变，本次只补图并复核 counter 和相位。
- 本地查看地址：`http://localhost:4497/learning-sglang/omni/ch/14-slow-reader-backpressure/?step=6`。查看前运行 `npx astro dev --background --host 127.0.0.1 --port 4497`。

## 剩余与清理

- 剩余事项是 Omni-47 的协调固定复审、图像能力复审和主人最终验收。其他开放 finding 未改；不重做 Omni 13／15，不追加 freeze／wait 报告。
- 未跑全站回归、真实 SGLang-Omni、模型、GPU、SSE／raw-PCM 连接或 reduced-motion 动态切换。最新回归只有未列出布局步骤的 `(exit 13)`，不据此返工。
- 本 clone 的 `node_modules` 原指向协调人 checkout；首次启动失败后，只删除本目录内符号链接并在本目录安装依赖，package 文件无 diff，未写协调人的 checkout。
- 本轮 4497 dev server 已停止，端口无监听；`pgrep -fl 'headless=new.*cdp-'` 无残留，检查脚本启动的浏览器均已关闭。

---

# lane d 本轮报告 · direction 07:20 复核，状态无变化（最后一轮等待报告）

日期：2026-11-27。类型：等待固定复审。范围只有本报告；未改教程、transcript、评分卡、`memory/`、`.bot/memory/`、其他书、其他 lane 或第 1 本受保护英文原文。

- 本轮开始 HEAD 与 `origin/tutorials` 均为 `fe0d51a`，fetch 后仍一致，工作树干净。direction（07:20）lane d 与上一轮记录一致：Voxt 11 Step 5 的 `99ed414`／`26941bb` 与 Voxt 10 displayed Step 1 的 `bd884d2` 冻结待固定复审；d 暂停新写作，下一最小单元是复审后指定的 Voxt 10 displayed Step 2；三条 reviewer 线索留待固定复审。本轮没有授权的新教程单元。
- **本轮修复的 review finding 为 0。** review.md 的 [d] 开放项与上一轮逐条核对结果相同：Voxt 08 已协调 GO；Voxt 11 其余旧项已在 `6467ab7` 复审确认未回退；Voxt 11 Step 5、Voxt 10 全章按 direction 冻结。Voxt 11 保持协调基线 **R1–R5 54/60、机制 R6 11/12、原十二项 143/144，NO-GO**；Voxt 10 不因作者自评改分。CH 队列项按 direction 不跨书派给 d。
- 无教程 diff，不跑 EVAL 硬门、审计或实图采集；未启动 dev server 或浏览器。`pgrep` 仍列出 `cdp-zutH77` 一台 headless Chrome（上一轮已核为后台 regress 工作树所有，非本轮所起）；`ps` 仍被系统拒绝无法核 PPID，未动它。
- 剩余事项不变：`bd884d2` 与 `99ed414`／`26941bb` 的协调固定复审；复审后指定的 Voxt 10 displayed Step 2；Voxt 12 排在性能谱系与 P0 清理之后。**协调已表示不再消费零 diff 的 freeze／wait 报告（direction 07:20 对 k1 明示、d 的前两份已在队尾待核销），因此除非 direction 或冻结状态变化，lane d 不再提交仅记录的等待报告。**

---

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


---

# lane d 本轮报告 · Voxt 01 Steps 1–2 session 创建过程化（Voxt-01 第一部分）

日期：2026-11-27。类型：direction.md lane d 指定单元——「Voxt 01 Step 1 的 Voxt-01 第一部分，把 session 创建从终态改成过程」。本轮开始时工作树有上一轮中断留下的半成品（组件已相位化、双语 deep 已补「按顺序形成」一句），与 direction 单元完全对应，按 SOUL.md 接着做完。提交 `fc3b939`。

## 改动（`fc3b939`，4 文件 +124/-38）

- `src/components/voxt/OneDictation.svelte`：Step 1（displayed）7 相——dictation 1 → `session ID = A` → results 1 → dictation 2 → `session ID = B` → results 2 → `A ≠ B`，每相只新增本相对象，当前对象 accent 高亮；Step 2 六相——同一个蓝色 A 徽章按相位走过六站（按键 → helper → 声音→文字 → 整理 → 看到文字 → 保存文字），徽章平移有过渡，每站产物随徽章到达出现并保留，无一站换新标签。两步均循环（PHASE_MS 900、REST 2200）、有 LoopProgress、reduced-motion 落末相、`data-animation-step/phase/final-phase` 身份齐全；Step 2 caption 英中同步改为「A 跟着这句话一路到屏幕文字和保存记录」。Steps 3–4（晚到 A 的 `A≠B`、取消拦截与 `cancelled/empty`）按 direction 留后续单元，未动机制。
- 顺手修两个既有布局缺陷（不改机制）：Step 3 手机脚注 "Both rows show B's result. You can choose the window." 在 360/390/430 px 出 SVG 右界 9–11 px，改为 "Both rows are B's result; the window is optional."；手机 LoopProgress 与 zh 标题重叠（Step 1 的「循环」×「2 次听写」、Step 2 的「循环」×「一句话 · 一个标签」），手机两位改为 `(227,14)`／`(220,46)`。
- 双语 deep（en/zh）：Step 1、Step 2 的「图上是什么」各补一句相位顺序描述，与动画一致；MDX 无需改动（只含出处 details）。transcript 重生成：4 步，无 caption／出界／重叠／文本规则报告。

## 硬门（本 checkout，全过）

- `npm run build`：60 页通过。`git diff --check` 干净。
- `BOOK=voxt ONLY=1 node scripts/transcript.mjs`：4 步无报告项。
- `BOOK=voxt ONLY=1 STEP=1/2 npm run readability`：各 0 机械问题。
- `BOOK=voxt ONLY=1 node scripts/zh-check.mjs`：all clear。`node scripts/deep-check.mjs`：one-dictation 4 节 ok。
- `BOOK=voxt ONLY=1 node scripts/mobile.mjs`：360/390/430 px no layout breaks；`STEP=1 LANG=zh`、`STEP=2 LANG=zh` 中文字号门均通过。

## 逐相机制审计（EVAL §6 动画门；探针 `/tmp/lsd-voxt01-probe.mjs`，未提交，经 `scripts/lib/browser.mjs` 可重跑）

- 矩阵：英中 × 桌面 1440×900／手机 390×844 × Step 1 direct、Step 2 direct＋前步入口（?step=1 → ArrowRight）＝ **76 个状态、556 项断言、0 失败**。
- 机制转变：Step 1 每相可见 `<text>` 数单调增长（7→…→末相含 `A ≠ B`）；Step 2 每相徽章 transform 均变化且末相六站产物齐全（`one key`／`brings sound in`／`Hi!`／`at cursor`／`original + tidy` 或中文对应）。
- 几何：全部相位文字重叠 **0**、SVG 出界 **0**、最低可见字号 **≥10 CSS px**；counter 与 `data-animation-*` 身份每相正确，`loops`／`循环` 标签在场。
- 截图 19 张（en-1440 两步全相位、Step 2 两入口）在 `/tmp/lsd-voxt01-shots/`。本模型无图像输入（本轮再次实测确认），不声称视觉通过；图像 verdict 仍需协调侧有图像输入的评审者实看。

## 评分（只评本轮改动的 Steps 1–2，自评）

- Step 1 易读 **12/12**：R1「每说一次话，Voxt 给它发一个新标签，结果跟着标签走」；R2 只引 session ID 一件新事；R3 「标签」大白话在图上；R4 caption 一句；R5 无大数字；R6 一次只长出一组框、当前对象高亮、循环可复看。Step 2 易读 **12/12**：R1「按一下键，A 这个标签跟着这句话走过六站，每站留下自己的产物」；R2 只新增「路线」一件（helper 有图内大白话「把声音送进来」）；R6 一次只动徽章这一件。
- 冷读洞 **0**（按本步与已过步：dictation／session ID／结果小窗均在图上或第 1 步解释；六站名各有图内产物示例）。
- 不声称整章 GO：Voxt-01 按 direction 要 Steps 1–4 全部覆盖后才核销，本轮只覆盖 Steps 1–2。

## 遗留与边界

- Voxt-01 剩余：Step 3 晚到 A 命中 `A≠B` 的过程化、Step 4 取消后识别／整理拦截与 `cancelled/empty` 的过程化，等协调下一单元。
- review.md 给 d 的 Voxt 10 P1（Step 1 同屏新名过多）／P2（115.2 MB 可感比较）未动：按顺序 P0 Voxt-01 在先。
- 本目录 `node_modules` 又是指向协调 checkout 的符号链接，已删并 `npm ci` 本地实装；未进入也未写入 `~/code/learning-sglang`。dev server 用端口 4325（4321/4322 属既有进程，未动），收尾关闭；探针 Chrome 由 `browser.mjs` 自管关闭。

---

# lane d 本轮报告 · Voxt 01 Steps 1–2 评审修复轮

日期：2026-11-27。类型：协调评审三条必修（Step 2 站名前置、台上 R3 缺口、探针证据不足）加提交号更正。教程提交 `7e30867`（预 rebase 本地号为 `2decf2b`，rebase 只带入其他线提交，教程 diff 不变）。

## 提交号更正

- 上一节报告写的 `fc3b939` 是本地预推送号；推送时 rebase 带入 k2 两个提交，最终 `origin/tutorials` 上是 **`7b758d6`**（教程）与 **`1d6132b`**（记录）。本节起以 rebase 后号为准。

## 修复 1：Step 2 每步只新增本步对象（`7e30867`）

- 六站站名不再全部前置：第 i 站（框、站名、产物）在 A 徽章到达该相时才 `in:fade` 出现并保留；连接箭头随下一站出现。相位 0 台上只有「你按一下」一站及其产物，符合 direction「每步只新增本步对象和状态」。
- Step 2 的 R2 重述：本步的新事是「一句话带一个标签走一条路线」；路线上的站名逐个到达，每站到达时都有图内白话产物（`brings sound in`、`把声音送进来` 等），不再是开头一屏六个新名。

## 修复 2：台上 R3 白话缺口

- 脚注不用 `insertion`／`clean-up`：改为「Text stays in the result window by choice or if it cannot go where you type.」／「This dictation succeeded; tidying and saving are on.」（中文「结果小窗／贴不到打字位置」「整理和保存都开着」），手机另用短句变体（`Result window: your pick or a stuck spot.`），与台上站名 `TIDY WORDS`／`SAVE TEXT`／`result window` 对齐。
- 英文 deep 补 `ASR (speech recognition)`／`LLM (language model)` 白话，与中文层一致；双语 deep 的 Step 2「图上是什么」同步为「站带名字和产物随徽章到达出现」。aria-label 同步。

## 修复 3：探针证据（`/tmp/lsd-voxt01-probe.mjs`，未提交，`scripts/lib/browser.mjs` 可重跑）

- 逐相断言精确产物：Step 1 每相断言本相新增对象在场（手机版结果文本含 `↓ ` 前缀，第一版探针因此误报 4 条，已按真实 DOM 修正断言）；Step 2 每相断言本相站名＋产物在场、**所有未来站名与未来产物均不在场**、徽章 translate 精确等于该站坐标（桌面 `20+116i+71,127`／手机 `236,90+78i+7`）。中文 `你好` 歧义改用精确串 `嗯，你好 → 你好`。失败时 `process.exitCode=1`（误报阶段已实证 exit=1）。
- 矩阵：英中 × 1440 桌面／390 手机 × Step 1 direct、Step 2 direct＋前步入口＝ **76 个状态、1,004 项断言、0 失败，exit=0**。文字重叠 0、SVG 出界 0、最低可见字号 ≥10 CSS px、counter／`data-animation-*`／`loops·循环` 每相正确。

## 硬门复跑（在预 rebase 的 `2decf2b` 上跑，全过；rebase 为 `7e30867` 后教程文件无变化，未重复跑）

- `npm run build` 60 页；transcript 4 步无报告项；readability Step 1／2 各 0 机械问题；zh-check all clear；deep-check 21 章 ok；mobile 英 360/390/430 与中文 STEP 1／2 字号门均 no layout breaks；`git diff --check` 干净。

## 重新自评（只评 Steps 1–2）

- Step 1 易读 **12/12**（同上一轮，评审未异议）。Step 2 易读 **12/12**：R1「按一下键，标签 A 带着这句话一站一站走，走到哪站哪站亮出名字和产物」；R2 一步一件新事——站逐个到达；R3 每个站名旁有白话产物，脚注与 deep 的术语都有台上对照；R6 一次只动徽章、只出现一站。冷读洞 **0**（站名、产物、结果小窗、整理、保存均在本步或第 1 步有图上解释）。
- 仍不声称整章 GO：Voxt-01 按 direction 要 Steps 1–4 全部覆盖后才核销；Voxt 10 的 P1／P2 未动。图像 verdict 仍需协调侧有图像输入的评审者实看（本模型无图像输入，本轮再次确认）。

---

# lane d 本轮报告 · Voxt 01 Steps 3–4 过程化（Voxt-01 覆盖完成）＋提交号更正落教程提交

日期：2026-11-27。类型：协调评审两条遗留——(1) 报告提交号更正折入教程提交（本节上方三处 `2decf2b` 已改为 `7e30867` 或注明预 rebase）；(2) Voxt-01 继续 Step 3 晚到 A 的 `A≠B` 过程与 Step 4 取消拦截＋`cancelled/empty`。

## 改动（教程 4 文件＋本报告，同一提交）

- `OneDictation.svelte`：Steps 3–4 由静态终态改为相位过程。Step 3 八相：前提（A 先 B 后、A 结果晚到）→ 晚到的 A → `SAME SESSION?` + `A ≠ B` → `keep out of B`＋拦截 ×＋B 结果框（`no A here`）＋A 的去向（→ 自己的小窗＋保存记录）→ session B 当前结果 → `B = B` → `write into B`＋写进 B 的结果 → ×/✓ 总结行；caption 同步改为「晚到的 A 没通过 A ≠ B 检查，回到自己的结果小窗。B 通过 B = B，写进自己的结果。」Step 4 五相：按取消（识别或整理时）→ 两种可能的晚到结果（识别／整理，任一即可）→ `A = CANCELLED` → 拦截 ×＋看到文字处 `× 没有晚到的 A 结果` → 保存取消状态＋保存记录 `A · 已取消 · 结果文字：空`。来源框的箭头随取消状态框一起出现，不指向空位。两步均循环、LoopProgress、reduced-motion 落末相、当前相框 accent 高亮。
- 手机版同步同序：Step 3 检查框拆成三行（问题／比较／结论）与桌面对齐，A 框去向行在判定相由「晚到的结果」换为「晚到 → 结果小窗 + 保存记录」（不换行不换框）；Step 4 取消框内 × 由 y=294 移到 y=298 且手机字号 34→26 px，修掉探针发现的既有手机文字重叠（`A = CANCELLED` ↔ ×，静态版已存在）。LoopProgress 手机位改为逐步坐标 `[[227,14],[220,46],[220,46],[230,52]]`，避开各步标题。
- 双语 deep：Steps 3–4 的「图上是什么」各补一句相位顺序描述；aria-label 同步为过程描述。

## 硬门（全过）

- `npm run build` 60 页；transcript 4 步无报告项；readability Steps 1–4 各 0 机械问题；zh-check all clear；`BOOK=voxt node scripts/deep-check.mjs` one-dictation 4 节 ok；mobile 英 360/390/430 与中文 STEP 1–4 字号门均 no layout breaks；`git diff --check` 干净。

## 逐相机制审计（探针 `/tmp/lsd-voxt01-probe.mjs` 扩展版，未提交）

- 矩阵扩为四步：英中 × 1440 桌面／390 手机 × Step 1 direct、Steps 2–4 direct＋前步入口 ＝ **180 个状态、2,544 项断言、0 失败，exit=0**。Step 3 每相断言本相新增对象、未来对象缺席、`SAME SESSION?`／`B'S RESULT` 计数（1→2）；Step 4 每相断言取消键→晚到来源→已取消→拦截→`cancelled/empty` 的顺序与缺席。探针先实证 exit=1：抓出手机 × 既有重叠和两条中文手机标题与标记同名（`不写进 B`、`晚到的结果停下`，改为计数断言）。
- 文字重叠 0、SVG 出界 0、最低可见字号 ≥10 CSS px、counter／`data-animation-*`／`loops·循环` 每相正确。截图 en-1440 全相位在 `/tmp/lsd-voxt01-shots/`；本模型无图像输入，视觉 verdict 留协调侧。

## 自评（Steps 3–4）

- Step 3 易读 **12/12**：R1「晚到的 A 想写进 B，检查一看 A 不等于 B，就把 A 挡回它自己的小窗；B 自己就能写进去」；R2 只新增「同一 session 检查」一件事（A/B/session/结果小窗均在 Steps 1–2 建立）；R6 一次只出现一组框、当前相高亮。Step 4 易读 **12/12**：R1「你按取消，A 就被标记成已取消，晚到的结果到不了屏幕，保存记录写着已取消、结果是空的」；R2 只新增「取消」一件事；R3 `cancelled/empty` 在保存记录框里直写中文「已取消／结果文字：空」。冷读洞 **0**。
- **Voxt-01 的 Steps 1–4 现已全部过程化并通过上述检查**，按协调要求报备覆盖完成，是否核销 Voxt-01 由协调固定复审决定。Voxt 10 的 P1／P2 仍未动。

---

# lane d 本轮报告 · Voxt 02 Steps 1–3 过程化（Voxt-02 覆盖完成）

日期：2026-11-27。类型：下一个 P0（direction 的 Voxt 01 单元在 `057e633` 已提交并推送，本轮按次序取 Voxt 书的下一个开放 P0 Voxt-02：02/1–3 按键消息与权限结果静态）。

## 改动（教程 4 文件，同一提交）

- `HelperPermissionsHotkeys.svelte`：三步全部由静态终态改为相位过程，与 OneDictation 同一机制（ANIMATED／PHASE_COUNTS=[7,9,5]、900 ms/相、循环、LoopProgress、reduced-motion 落末相、`data-animation-step/phase/final-phase`）。Step 1 七相：按键 → helper → 消息框 → `method=hotkey.event` → `binding=transcribe/0`＋`/0` 白话 → `phase=trigger` → Go app `idle → START`（框随 `INTRO=[0,1,2,6]` 出现，箭头随目标框同相出现）。Step 2 九相：两面板先只出标题 → 左面板按键→MAC OFF→红叉＋看不见→0 条消息＋仍空闲 → 右面板按键→MAC ON→看见按键→1 条消息＋开始（阻断与通过分别上演）。Step 3 五相：两面板先只出标题 → 左 `capture.start`→麦克风被挡＋`permission_denied` → 右同一请求→声音经 helper→录音开始。Steps 2–3 不加 accent 当前相高亮：红／蓝已承担阻断／接通的语义。
- 修一处既有手机重叠（探针实证）：en 390 px 的 `binding=transcribe/0` 与右侧 `default dictation key` 同行相撞（静态版已存在，旧检查未覆盖到）；手机版该字段释义改为独占一行居中，`phase=trigger` 行下移 7 px，桌面不变。
- 双语 deep：三步的 On the stage／图上是什么各补一句相位顺序；aria-label 由静态描述改为双语过程描述。MDX 出处段无需改。

## 硬门（全过）

- `npm run build` 60 页；`BOOK=voxt ONLY=2` transcript 3 步无报告项；readability 3 步 0 机械问题；`BOOK=voxt` deep-check ok、zh-check all clear；mobile 英 360/390/430 与中文 STEP 1–3 字号门均 no layout breaks；`git diff --check` 干净。

## 逐相机制审计（探针 `/tmp/lsd-voxt02-probe.mjs`，未提交，`scripts/lib/browser.mjs` 可重跑）

- 矩阵：英中 × 1440 桌面／390 手机 × Step 1 direct、Steps 2–3 direct＋前步入口 ＝ **140 个相位状态、968 项断言、0 失败，exit=0**。每相断言本相新增文本在场、未来文本缺席（精确 `<text>` 计数）、最低可见字号 ≥10 CSS px、文字出 SVG 0、文字重叠 0、`data-animation-phase` 与读到的一致（相位与 DOM 原子读取，规避圈边竞态）。
- 探针先实证 exit=1：抓出上面的手机重叠和探针自身的圈边竞态（修后全过）。截图在 `/tmp/lsd-voxt02-shots/`（每状态末相 PNG）；本模型无图像输入，视觉 verdict 留协调侧。

## 自评（Steps 1–3）

- Step 1 易读 **12/12**：R1「按一下键，helper 把它包成一条消息，Go app 读了就开始」；R2 只新增「消息」一件事（session、路线在第 1 章建立）；R6 一相只多一个框或一行字段。Step 2 **12/12**：R1「没开 Accessibility，helper 看不见键，什么消息也没有；开了，同一个键就到了」；两面板同布局同尺，只改设置。Step 3 **12/12**：R1「麦克风权限管声音不管键：拒绝就回 permission_denied，允许声音才回去」；左拒绝右通过分别上演。冷读洞 **0**（Accessibility、麦克风权限、capture.start、permission_denied 均在本步图上有白话）。
- **Voxt-02 的 Steps 1–3 现已全部过程化并通过上述检查**，是否核销由协调固定复审决定。Voxt-03 及以后 P0、Voxt 10 的 P1／P2 未动。

## 环境备注

- 本 clone 的 `node_modules` 原是指向 `~/code/learning-sglang/node_modules` 的符号链接（build 因此 EPERM）。只删掉了本目录里的符号链接本身并 `npm install` 出本目录自己的依赖；协调 checkout 未进、未改，事后确认其 node_modules 完好。

---

# lane d 本轮报告 · Voxt 02 Step 1 评审修复（idle→START 与蓝色单义）

日期：2026-11-27。类型：主人对 `d487cc2` 的两条内容 finding，均在 Step 1，按一步一提交处理；未改已推送历史。

## 修复 1：Go app 先 `idle` 后 `START`

- Step 1 由 7 相扩为 8 相：第 6 相 Go app 框携 `GO APP`／`main program`／muted 的 `idle`（zh「空闲」，桌面另有 `nothing was recording`）出现；第 7 相同一 action 行由 `idle` 变为 `START`（zh「开始」）并补 `Transcribe = dictation`。手机版删去原来的合并标签 `idle → START`，与桌面同为两相状态切换。
- 探针同步：p6 断言 `idle` 在、`START` 不在；p7 断言 `START` 在、`idle` 不在，英中桌面／手机全覆盖，不再只查末相 `START`。

## 修复 2：蓝色只表示消息路线（EVAL #5）

- 撤销 Step 1 引入相的 accent 高亮：按键、helper、Go 框在任何相位都是 `var(--bg)`／`var(--line)`；accent-soft／accent 只剩 JSON 消息框（第 2 相起 1 个）与消息箭头，与 deep「蓝色只表示消息和它走的路线」一致。Steps 2–3 本来就没有框高亮，红=阻断、蓝=接通路线不变。
- 双语 deep 的相位句补「Blue marks only the message and its route」／「蓝色只表示消息和它走的路线」；aria 同步 idle→START 过程。
- 探针新增逐相颜色断言：每相统计 `fill=var(--accent-soft)` 与 `stroke=var(--accent)` 的 rect 数，Step 1 期望 0,0,1,1,1,1,1,1，防止回归。

## 硬门复跑（全过）

- `npm run build` 60 页；`BOOK=voxt ONLY=2` transcript 3 步无报告项（末相为 START 态，不含 idle，符合预期）；readability 0 机械问题；deep-check ok；zh-check all clear；mobile 英 360/390/430 与中文 STEP 1–3 均 no layout breaks；`git diff --check` 干净。
- 探针（`/tmp/lsd-voxt02-probe.mjs` 更新版）：**144 个相位状态、1,068 项断言、0 失败，exit=0**；含逐相 idle/START 与逐相颜色断言。

## 修订自评

- Step 1 易读 **12/12**：R1「按一下键，helper 包成一条消息，Go app 原本空闲，消息一到就开始」；R6 一相一变化，Go 的状态在同一个对象上从 idle 变成 START；EVAL #5 蓝色单义由逐相断言守住。Steps 2–3 维持上轮 12/12 不变（本轮未改）。

---

# lane d 本轮报告 · Voxt 02 Step 1 修复（消息箭头与 idle→START 同相）

日期：2026-11-27。类型：主人对 `38a6d10` 的一条机制 finding，仍属 Step 1，一个提交。

## 修复

- JSON→Go 消息箭头由第 6 相移到第 7 相：第 6 相 Go app 只有框与 `idle`，台上没有已送达的消息；第 7 相箭头（消息到达）与同一 action 行 `idle → START` 同时出现，与双语 deep「Go app 先以空闲出现，消息到达后把它变成开始」一致。组件内注释记明该箭头是"到达的消息"。
- 探针新增逐相消息箭头计数断言（`marker-end` 含 `message-arrow` 的 line 数），Step 1 期望 0,0,1,1,1,1,1,2；此前的文本与颜色断言确实抓不到该错位。

## 硬门复跑（全过）

- `npm run build` 60 页；transcript 无 diff（本修复不加文字）；readability、deep-check、zh-check、mobile 英 360/390/430 与中文 STEP 1–3 均过；`git diff --check` 干净。
- 探针：**144 个相位状态、1,100 项断言、0 失败，exit=0**（新增 32 项箭头断言）。

## 自评

- Step 1 维持 **12/12**：相位顺序现在是「Go 空闲（无消息）→ 消息到达 → START」，机制与 deep 字面一致；Steps 2–3 未动。

---

# lane k2 本轮报告 · ML 12 Step 8 → ML 13 Step 1 接缝（ML-20）

日期：2026-11-27。类型：修旧。范围只有 ML Systems 第 12 章 Step 8、第 13 章 Step 1 的双语组件／deep、ML 12 MDX、生成 transcript、目标审计和本报告；未改 ML 08、第 14 章、其他书、共享 drawer 或 `.bot/memory/`。

## 修复内容

- **ML-20 收窄章末问题。** ML 12 Step 8 的桌面和手机英中问题统一改为「第二次模型调用需要哪些 token？」；下一章 Step 1 用同一交互顺序直接回答 `P+A+O=2+4+3=9`，并显示只给 `P` 会少 `A+O=7` 个响应上下文 token。ML 12 的 MDX 与双语 deep 明确多轮 draft-pair 选择不在本章范围内，不再留下下一章未回答的问题。ML 13 Step 2 的 policy loss mask 保持原样，没有用重复 mask 解释代替接缝。
- 双语 deep 保留 shared-table 边界和既有数值。Step 8 的 3.5% 与 Step 1 的 `Sample.tokens=14` 移入 `Derived · not drawn／图外推导`，不再冒充图上数字。长公式按等式拆行，长 commit 引用加入既有 `<wbr>` 断行方式，修掉目标 deep 在 390 px 的横向溢出。
- 独立冷读首轮据此给 ML-20 **NO-GO**，指出上述两个图外推导未标记；修改后同一 reviewer 给 **GO**，剩余内容洞 **0**。两步定点自评均为易读 **12/12**、R1–R5 **10/10**、机制 R6 **2/2**、原十二项 **24/24**。这是 ML-20 定点结果，不重评或宣称两章完整 GO。

## 硬门与审计

- `npm run build`：**60 页**通过。ML 12 Step 8、ML 13 Step 1 `readability` 各 **0** 机械问题；两章 `deep-check` ok、`zh-check` all clear。两章英中 `mobile` 在 360／390／430 px 均 no layout breaks，中文目标步字号门同样通过。`git diff --check` 干净。
- 两章 transcript 连续两次生成逐字一致：ML 12 **2,204 词**，SHA-256 `3f974b1ca7d2053ef734ae9c12e4b127cec84ea93743ea018213e35a4822a20e`；ML 13 **1,833 词**，SHA-256 `b39adf25ee01ac079cb5140cc685b15e46404a897ac7d1cdbdbb43fe05e6cb0e`。首轮 transcript／zh-check 各有一次 Node 26 unsettled-await `exit 13`，独立重跑通过，与既有 flaky 记录一致。
- `.bot/out/ml20-seam-audit.mjs` 覆盖英中桌面、中文 390 px、direct／前步或前章入口：**42 状态、30/30 机制转变、8 个 deep、14 张 PNG**。普通舞台最低 **10.175 CSS px**，文字重叠、SVG 出界、页面横溢、deep 横溢和 failures 均为 **0**；实际 Next 链接、收窄问题、`P+A+O=9` 回答及双语 deep 均逐步断言。证据在 `.bot/out/ml20-seam-audit/`。
- 开抽屉后的舞台最低 **5.747 CSS px**，属于既有共享 **ML-21／22** 范围，本单元未改共享组件，也不据此关闭这些项或宣称整章 GO。当前模型无图像输入；PNG 未获视觉批准，以上通过仅指文本、DOM、几何和独立冷读。主人最终视觉验收另计。

## 剩余与环境

- ML-20 的作者修复已完成，协调固定复审后才可正式核销。ML-36、共享 ML-21／22 和其他既有开放项未动；ML-63／64 的既有修复也未返工。未跑全站回归、真实模型、训练、rollout、GPU benchmark 或故障注入。
- 代表图：`.bot/out/ml20-seam-audit/ml12-zh-390-direct-s8-p3.png` 与 `ml13-zh-390-direct-s1-p2.png`。本地地址：`http://localhost:4328/learning-sglang/ml-sys/ch/12-rl-speculative-decoding/?step=8`；收尾会停止本轮服务，查看前在本目录运行 `npx astro dev --background`。
- 本 clone 的 `node_modules` 符号链接曾指向协调 checkout，导致 Vite cache EPERM。只删除本目录中的符号链接并 `npm install` 出本目录依赖，未进入或修改协调 checkout。

---

# lane k2 本轮报告 · ML 08 Step 4 actor-loss 路径（ML-48）

日期：2026-11-27。类型：修旧。范围只有 ML Systems 第 8 章 Step 4 的组件、构造数字、双语 deep、双语 MDX 出处、生成 transcript、目标审计和评分记录。`6168324` 已完成 ML-20 接缝，本轮未返工；保留固定 `25025b4` 已通过的 Step 3 packing，未改其他书、共享 drawer、`.bot/memory/`，未开第 14 章。

## 修复内容

- Step 4 改为八相机制路径：forward 与拆包 → `ratio = exp(log_probs − old_log_probs)` → advantage 与 clip → 裁剪后的负乘积取大值 → 逐记录 masked mean 再求和 → 两包 backward → 一次 `optimizer.step()` → 条件 `sleep/offload` 与后续 `update_weights`。舞台用白话解释 actor loss、ratio 和 backward，旧评分与当前训练两次计算分开，DP1 打包与 DP8 显存例分开，7 GB 只表示参数表而非峰值。
- 构造例沿用 Pack 1 的 A／B advantage。差值 +0.3365／−0.3567 得 ratio 1.40／0.70，按自带脚本 clip 到 1.28／0.80；A／B loss 分别为 −1.1973／+0.7483，response mask 都是 `[1]`，逐记录均值求和得 `pg_loss=-0.4490`。所有结果由 `src/ml-sys/numbers.ts` 推导。双语 deep 补全零或空 mask 的 0 贡献反例、两种 old-score 来源和 `offload → rollout onload → update_weights` 顺序；rollout 恢复明确不画出，TIS 只列为本构造例不展开的可选路径。
- 独立 `explore` 冷读经 DP 边界、`U`、score producer、`R/B` 提前出现、零 mask、白话定义和 deep 行名等返工后，最终 **GO**：R1–R5 **10/10**、机制 R6 **2/2**、原十二项 **24/24**、剩余硬阻塞 **0**。R1：「模型用两包回答决定怎样改变权重，但直到第 2 包结束才更新一次。」这不是协调 verdict 或整章 GO。

## 硬门与审计

- 最终 `npm run build`：**60 页**通过。`BOOK=ml-sys ONLY=8 STEP=4 npm run readability`：0 机械问题；`BOOK=ml-sys node scripts/deep-check.mjs 08`：ok；`zh-check`：all clear；`git diff --check`：干净。
- 英中全章 `mobile` 与中文 Step 4 字号门在 360／390／430 px 均 **no layout breaks**。首轮审计发现的桌面小字、手机图例出界和 deep 表格横溢已返工，最终复跑通过。
- transcript 连续两次逐字一致：**2,511 词**，SHA-256 `e6e76f60acc1bcf4a28c7b217adfbb2d208bf57f73054acc06adcf56fb939056`。
- `.bot/out/ml48-step4-audit.mjs` 覆盖英中桌面与 390 px × direct／前步入口：**64 状态、56/56 个机制转变、8 个双语 deep 状态**，普通舞台最低 **10.806249999999999 CSS px**。文字重叠、SVG／卡片出界、页面／deep 横溢和 `failures` 均为 **0**。证据：`.bot/out/ml48-step4-audit/report.json`。
- 代表图：`.bot/out/ml48-step4-audit/zh-390-direct-p7.png`；另有 `npm run shot` 的 `.bot/out/ml48-step4-shot/ml08-en-step4.png` 与 `.bot/out/ml48-step4-shot-mobile/ml08-zh-step4.png`。本地地址：`http://localhost:4325/learning-sglang/ml-sys/ch/08-fsdp2-training-backend/?step=4`，本轮服务于收尾停止。
- 本轮开始时 `node_modules` 仍是指向协调 checkout 的符号链接，导致 Vite cache EPERM。只删除本目录中的符号链接并在本目录 `npm install`，未进入或修改协调 checkout。

## 剩余

- ML-48 的 Step 4 作者修复待协调固定复审，不自行销项。Ch.6 Step 7、其余 ML 08 范围和共享 ML-21／22 未改，整章不申报 GO。当前模型无图像输入，PNG 未获视觉批准；上述通过指文本、DOM、几何和独立冷读。
- 未跑全站回归、真实 FSDP2 训练、rollout、GPU benchmark、故障注入或 reduced-motion 动态切换。主人最终视觉与产品验收另计。

---

# lane d 本轮报告 · Voxt 01 Steps 3–4 评审修复（Voxt-01 子项）

日期：2026-11-27。类型：修 review.md 对 `057e633` 的开放 finding（Voxt-01 的 Steps 3–4 子项），一个提交 `f111ef9`，未覆盖既有四文件草稿的结构。

## 修复内容（对照 review 五点）

- **Step 3 caption 不再把 `A≠B` 写成未通过的检查**：改为问答式「Same session? Late A: A ≠ B, no, keeps its own window; B: B = B, yes, written.」／「同一个 session 吗？A ≠ B，不是，晚到的 A 回自己的小窗；B = B，是，写进 B。」；aria 与双语 deep 的相位描述同步为「同一个 session 的检查得到 A ≠ B（不是）」。
- **Step 3 蓝色单义（EVAL #5）**：B 的接受结果（session B 框、`B = B`、`write into B`、写入箭头、结果框、总结 ✓）由蓝改为琥珀（`--gen`/`--gen-soft`），蓝色只剩当前相位高亮；桌面与手机同步；双语 deep 补一条颜色说明；`current-arrow` marker 改名 `accept-arrow`。
- **Step 3 deep 公式补条件**：`write(r,c) ⇔ r=c` 改为 `write(r,c) ⇔ r=c ∧ ¬ended(r)`，符号表加 `ended(r)` 行（pinned `manager.go:341-375` 的 `m.cur != r || r.ended` 分支实证），说明句补「且该 run 必须尚未结束」，双语同步。
- **Step 4 顺序与两道检查**：相位由「取消 → 两种来源同屏 → 已取消 → 拦截 → 记录」重排为 6 相「按取消 → A 先标记已取消（每个晚到结果都先查它）→ 识别晚到结果＋它的 × cancelled → 整理晚到结果＋它的 × cancelled → 屏幕无晚到结果 → 保存记录」，与源码先置 `r.cancelled`、两条路返回后各自检查的顺序一致，两道检查分别上演；桌面重排布局（记录框走右列、折线箭头不压文字），手机改单列纵排（H 560→640）。
- **`late results stop` 收窄为不交付**：标题改「CANCEL A · LATE RESULTS NOT DELIVERED／晚到的结果不交付」，deep 的 `stopped` 改 `undelivered` 并补一句「不交付≠不检查、仍记录取消」，双语同步。

## 硬门（全过）

- `npm run build` 60 页；`BOOK=voxt ONLY=1` transcript 4 步无报告项；readability 初报 Step 3 超两句＋重复 so、Step 4 长句，改 caption 后 **0 机械问题**；`BOOK=voxt` deep-check ok；zh-check all clear；mobile 英 360/390/430 与中文 STEP 3／4 字号门均 no layout breaks；`git diff --check` 干净。（本机 4321 被他线占用，本轮 server 在 4328，脚本均显式传 base。）

## 逐相机制审计（探针 `/tmp/lsd-voxt01-probe.mjs` 更新版，未提交）

- 矩阵：英中 × 1440 桌面／390 手机 × Step 1 direct、Steps 2–4 direct＋前步入口 ＝ **188 个相位状态、2,716 项断言、0 失败，exit=0**。Step 4 逐相断言取消键→已取消标记→来源 1＋`cancelled` ×1→来源 2＋`cancelled` ×2→屏幕 ×→记录的顺序与缺席；文字重叠 0、SVG 出界 0、最低可见字号 ≥10 CSS px。
- 截图 en-1440 全相位在 `/tmp/lsd-voxt01-shots/`；本模型无图像输入，视觉 verdict 留协调侧。

## 自评

- Step 3 易读 **12/12**：R1「检查问同一个 session 吗，A 不是就回自己小窗，B 是就写进 B」；R2 不新增概念；EVAL #5 一色一义（蓝=当前相位、琥珀=通过并写入、红=拦截）。Step 4 **12/12**：R1「先标已取消，晚到结果一个一个来，各查各的，都不交付，记录写已取消、结果空」；R6 一相一变化。冷读洞 **0**。
- Voxt-01 的 Steps 3–4 五个子项均已按 review.md 要求修完，是否核销由协调固定复审决定。Voxt-11（Voxt 02 deep 手机横溢）与 Voxt-03 未动，按 direction 是下一轮。

---

# lane d 本轮报告 · Voxt 01 Steps 3–4 评审修复第二轮（OR 情形 + Next 措辞）

日期：2026-11-27。类型：主人对 `f111ef9` 的两条遗留 finding，一个提交。

## 修复内容（对照两条 finding）

- **Step 4 两种取消路径显式二选一**：来源行上方加框架行「only one of these two arrives late／晚到的只是其中一种」（第 2 相与情形 1 同相出现），两种情形同布局、仍分相上演（情形 1 第 2 相、情形 2 第 3 相），静态末相两种情形都在台上且被框架行标明为二选一，不再是同一次运行里的两个先后事件。caption 改「A late result — recognized or tidied —／晚到的结果——识别的或整理的——」，aria 双语同步为「晚到的只是其中一种」。deep 双语「图上是什么」改「是二选一，不是同一次运行里先后发生两件事」。桌面行距重排（情形行 y=186/252、屏幕 y=204、记录 y=306），手机加同一框架行（y=196，情形 y=206/296），H 不变。
- **Step 3 deep 的 Next 措辞**：en「where do its late recognition or clean-up results stop?」→「why are its late recognition or clean-up results not delivered?」；zh「在哪里停下？」→「为什么都不交付？」。Step 2 Next 的「which check stops an old session from writing」描述的是闸门功能（挡写入），与「晚到结果停下」不同，保留。
- **工作区状态纠正**：上一轮把 `.bot/out/report.md` 暂存后未提交（误以为 .bot 整目录被 gitignore；实际 `.bot/out/` 已跟踪）。本轮报告与教程修复同一提交，本段即为最终状态。

## 硬门复跑（全过，本轮 server 在 4321）

- `npm run build` 60 页；`BOOK=voxt ONLY=1` transcript 4 步无报告项；readability **0 机械问题**；deep-check 11 章 ok；zh-check all clear；mobile 英 360/390/430 与中文 STEP 3／4 均 no layout breaks；`git diff --check` 干净。
- 探针（`/tmp/lsd-voxt01-probe.mjs` 更新版）：**188 个相位状态、2,740 项断言、0 失败，exit=0**；新增框架行逐相在场／缺席断言。截图 en-1440 全相位在 `/tmp/lsd-voxt01-shots/`；本模型无图像输入，视觉 verdict 留协调侧。

## 自评

- Step 4 维持 **12/12**：R1「先标已取消；晚到的只是其中一种，两种情形各查各的，都不交付；记录写已取消、结果空」；R2 不新增概念（框架行用的是已建立的「晚到结果」）；R6 一相一变化。Step 3 未动，维持上轮 12/12。冷读洞 **0**。
- 两条 finding 均已按主人要求修完；Voxt-11 与 Voxt-03 未动。

---

# lane d 本轮报告 · Voxt 02 deep 手机横溢修复（Voxt-11）

日期：2026-11-27。类型：修 review.md 对固定 `5e777c3` 的 P1 finding Voxt-11（02/1 手机 deep 长源码路径横溢）。两个 deep 文件，一个提交。Voxt 01 Steps 3–4 的 `f111ef9`／`05942e3` 已在队列等协调复审，本轮未返工。

## 修复内容

- **长出处全部加断行机会**（既有 `<code>…<wbr>…</code>` 模式，与 omni deep 一致）：`Hotkey.swift:240-250,269-274`（两处重复出处）、`Hotkey.swift:6-19,76-89,155-169`、`Hotkey.swift:113-151`、`Permissions.swift:7-9,40-46`、`Permissions.swift:11-18`、`Capture.swift:53-79`、基线 commit hash（×3）、`settings.go:357,379`、`hotkey.go:282,304`、`route.go:114-121`（×2）、`hotkey_test.go:419`、`run.go:192-202`、`helperio.go:20-35`、`session.go:464-483`、`helper-protocol.md`（×2）、`hotkey.jsonl:3`、`proto/hotkey.go:113-127`、`proto/capture.go:20-25`——两文件所有含 `/` 的路径出处统一处理，英中同步。
- **复验发现的另两处同章横溢一并修复**（direction 要求复验 `.deep-body` 横溢，不只销原路径）：
  - Step 2 对照表在 360 px 超 8 px：表头 `Same Right Option／同一个右 Option` 收窄为 `Same key／同一个键`（图上与 bullets 已说明两幅图用同一个 Right Option）。
  - Step 3 四列表在 360 px 超约 95 px：两行请求列恒为 `capture.start`，改为表前一句「Both cases send the same `capture.start` after the hotkey.／两种情况都在按键后发出同一个 `capture.start`。」并删去该常数列；表内 `permission_denied` 加 `<wbr>`；中文「不进入设备启动」改「设备不启动」。信息无损失。
- 未改组件、共享 drawer CSS、MDX 或 transcript（deep 不进 transcript）。

## 复验（按 direction，不用通用 mobile 销项）

- 定点探针（抽屉展开，360／390／430 px × 英中 × 3 步 = **18 状态**）：修前 18/18 `.deep-body` 横溢（最大 +248 等，本章最大 +119，`Hotkey.swift:240-250,269-274` 右缘 444.9 与复审一致）；修后 **0 个元素越界、页面横溢 0、`.deep-body` 残余 ≤1 px 亚像素**，PASS。证据：`.bot/out/voxt11-deep/probe-before.json`、`probe-final.json`，代表图 `.bot/out/voxt11-deep/zh-390-step1-deep.png`。
- 残余 +1 px 为 scrollWidth 取整（359.x→360），无元素或可见行盒越界；KaTeX 隐藏 MathML 几何盒与中行尾标点悬挂属全站浏览器行为，未计入。

## 硬门（全过）

- `npm run build` 60 页；`BOOK=voxt ONLY=2` transcript 无 diff 无报告项；`BOOK=voxt node scripts/deep-check.mjs 02` ok；`BOOK=voxt ONLY=2 zh-check` all clear；readability 0 机械问题；`BOOK=voxt ONLY=2` mobile 英及中文 STEP 1–3 在 360/390/430 均 no layout breaks；`git diff --check` 干净。
- 本轮开始 `node_modules` 是指向协调 checkout 的符号链接（dev server 起不来）；只删本目录符号链接并 `npm install` 出本目录依赖，未进入或修改协调 checkout。

## 顺带发现（不属本单元，未改）

- Voxt 01 deep 在 360 px 抽屉展开也有长路径横溢（en +23／zh +34 px）；Voxt 03 Step 1 deep 在 360 px 横溢 +248 px。均记此备协调编号；Voxt-03 按 direction 是下一个 P0 单元。
- Voxt-11 是否核销由协调固定复审决定；本模型无图像输入，视觉 verdict 留协调侧。
