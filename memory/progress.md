# 四本书制作进度

更新：2026-11-25。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 14:05 完成 Learning ML Systems 第 4 章全部 7 步：通信代价、SUM all-reduce、进程组、NCCL、物理链路、Ring 和拓扑导致的依赖等待。全章 **7/7 步易读 12/12**，中英原分均 **24/24**，平均 **24.00/24**，**0 内容洞、0 最终显示洞**。
- 逐步提交并推送；英文手机首轮发现 18 个 SVG 标签出界，缩短后中英三种宽度均通过。最终图为 14 张双语桌面、14 张 390 px 双语手机和 14 张双语深入讲解，主线程已逐张打开冷读；独立冷读 subagent 因 API key 不可用未运行。`build`、本章 `transcript`、全章 `readability`、中英本章 `mobile`、`deep-check 04`、本章 `zh-check` 和 `git diff --check` 通过；章节与六个 zero-to-sglang 延伸阅读链接均为 HTTP 200。材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch04-20261125-1340/final/`、`checks/`。本轮只跑本章检查，未跑全站回归。本轮类型：**新书**；下一普通轮按交替规则修旧。
- 13:30 修旧 Learning SGLang 第 3 章全部 10 步：保留旧 k、v，逐格写入和读取，解释不存 q、显存账及第一次与以后每步的工作差异。全章中文 **10/10 步易读 12/12**，原分平均 **24.00/24**，**0 内容洞、0 最终显示洞**。
- 逐步提交并推送；`build`、本章 `transcript`、本章中文三种宽度 `mobile`、第 1、6、7、9、10 步中文字号、`deep-check 03`、本章 `zh-check` 和 `git diff --check` 通过。全章 `readability` 中文 0 问题，保留 7 个受保护英文 R4 机械问题。独立冷读先发现 8 个内容洞及第 9、10 步硬门失败，整改后复读为 10/10 步中文 12/12、原分均 24/24，必须修项为无。最终图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch03-repair-20261125-1252/final/`、`checks/`。本轮只跑本章检查，未跑全站回归。本轮类型：**修旧**；下一普通轮做新书。
- 12:50 完成 Inside Voxt 第 4 章全部 7 步：三条识别路线、文件型整段识别、流式整份草稿替换、安静处分块、按序合并、本机 Omni 预览后的 Final、原话交接。全章 **7/7 步易读 12/12**，平均 **23.86/24**，**0 内容洞、0 最终显示洞**；第 1 步仅原 #1 动机为 1。
- 逐步提交并推送；`build`、本章 `transcript`、全章 `readability`、中英三种宽度本章 `mobile`、逐步中文字号、`deep-check 04`、本章 `zh-check` 和 `git diff --check` 通过。独立冷读 subagent 因 API key 不可用未运行，最终由主线程换视角冷读 28 张中英桌面／手机图。最终图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch04-20261125-1230/final/`、`checks/`。本轮只跑本章检查，未跑全站回归、真实 ASR 或性能测试。本轮类型：**新书**；下一普通轮按交替规则修旧。
- 12:24 修旧 Learning SGLang 第 2 章第 3 步：主图收束为「x 经过三张数字表，变成 q、k、v 三排分工不同的数」，乘加算例收进深入讲解，并保留 `W_Q/W_K/W_V` 与三张表的对应，避免后续步骤出现未解释记号。中文易读 **11→12/12**，原分 **24/24**，**0 内容洞、0 本步显示洞**；全章中文 **14/14 步易读满分**。第 3 步整步按英文 R2、R4 记 **10/12**，只剩受保护英文问题。
- `build`、本章 `transcript`、本章中英 `mobile`、目标中文步字号、`deep-check 02`、本章 `zh-check` 和 `git diff --check` 通过；全章 `readability` 中文 0 问题，保留 9 个受保护英文机械问题。独立 subagent 因 API key 不可用未运行，主线程换视角顺序冷读 14 张中文桌面图和 14 张 390 px 手机图；既有小字仅按规则审计，不算本轮新增失败。提交 `d2d2279`、`a99fe5f` 已推送。最终图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch02-r4-20261125-1210/final/`、`checks/`。本轮只跑本章检查，未跑全站回归。本轮类型：**修旧**；下一普通轮做新书。
- 12:00 整点自主优化第 3 项「复盘自己」：最近评分卡反复靠人工冷读发现手机小字、截断和 SVG 文字出界；`mobile.mjs` 新增可见文字与所属 SVG 的实际左右边界比较，`ONLY=N` 选中章设为硬门，全站运行只汇总审计。重注 Omni 第 5 章修复前的英文脚注，旧内容被检出 **25 px** 出界，当前终稿为 **0**。
- `build`、`node --check scripts/mobile.mjs`、中英第 5 章三种宽度 `mobile`、改前内容失败／当前内容通过的自检和 `git diff --check` 均通过；检查脚本与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-autonomous-mobile-svg-20261125-1200/checks/`。本轮不改教程与评分，未跑全站回归。本轮类型：**自主优化**；下一普通轮按交替规则修旧，下次整点轮换第 1 项「像读者一样从头读一遍」。
- 11:52 完成 Learning SGLang Omni 第 5 章全部 5 步：安全复用、DataRef 描述符、发布时的 pending、读取后的 ACK、发送方收尾与后端可回收边界。全章 **5/5 步易读 12/12**，原分均 **24/24**，平均 **24.00/24**，**0 内容洞、0 最终显示洞**。
- 逐步提交并推送；`build`、本章 `transcript`、全章 `readability`、中英三种宽度本章 `mobile`、`deep-check 05`、本章 `zh-check`、30 个手机视图 SVG 溢出审计和 `git diff --check` 通过。最终图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch05-20261125-1130/final/`。独立 subagent 因 API key 不可用未运行，最终由主线程换视角冷读。本轮只跑本章检查，未跑全站回归。本轮类型：**新书**；下一普通轮按交替规则修旧。
- 11:00 修旧 Learning SGLang 第 2 章：第 13 步用「旧 q → 旧输出 → 下一层旧 x → 相同旧 k、v」解释旧 q 不再使用，第 14 步对照需要保留的旧 k、v 与每层、每组的重算；第 7 步手机另补清 query 属行、key 属列。第 13、14 步中文补评并整改至 **12/12、24/24、0 洞**；两步整步易读均 **11/12**，只剩受保护英文 R4。全章原分 **24.00/24**、总洞数 **0**，整步易读满分 **8/14**。
- 第 7、13、14 步最终独立复读均为中文 **12/12、24/24、0 内容洞、0 显示洞**，必须修项为无。逐步提交并推送；`build`、本章 `transcript`、三种宽度本章 `mobile`、目标中文步字号、`deep-check 02`、本章 `zh-check` 和 `git diff --check` 通过；本章 42 个英文小字视图仅作既有审计。全章 `readability` 中文 0 问题，保留 9 个受保护英文机械问题。最终图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch02-r3-20261125-1100/final/`、`final-checks/`。本轮只跑本章检查，未跑全站回归。本轮类型：**修旧**；下一普通轮做新书。
- 10:58 完成 Learning ML Systems 第 3 章全部 6 步：实测 `num_batch` 的矛盾、全注意力 KV 复用、recurrent state、checkpoint 重算、hybrid 共同恢复点和 MambaRadixCache 墓碑。全章 **6/6 步易读 12/12**，中英原分均 **24/24**，平均 **24.00/24**，**0 内容洞、0 最终显示洞**。
- 逐步提交并推送；最终图为 12 张双语桌面、12 张 390 px 双语手机和 12 张双语深入讲解。`build`、本章 `transcript`、全章 `readability`、三种宽度中英 `mobile`、`deep-check 03`、本章 `zh-check` 和 `git diff --check` 通过；章节与四个 zero-to-sglang 延伸阅读链接均为 HTTP 200。材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch03-20261125-1030/final/`。本轮只跑本章检查，未跑全站回归。本轮类型：**新书**；下一普通轮按交替规则修旧。
- 10:27 修旧 Learning SGLang 第 7 章第 4、6 步：中文第 4 步只讲分页，第 6 步只讲页表；两步中文易读均 **11→12/12**、原分 **23/24**、**0 冷读洞**。完整中英分均保持 **10/12**，因为受保护英文仍有 R2 两件新事及 R4 三句／长句，未标完成。
- `build`、本章 `transcript`、本章及两步中文 `mobile`、`deep-check 07`、本章 `zh-check` 和 `git diff --check` 通过；逐步 `readability` 只余上述受保护英文问题。最终中英桌面与中文手机图已打开，两步英文桌面改前改后均逐像素一致。材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch07-r2-20261125-1020/`。本轮类型：**修旧**；下一普通轮做新书的下一整章。
- 10:19 完成 Inside Voxt 第 3 章第 3–8 步：3,300 个样本的尾帧、历史原件与模型副本、50／200 Hz 高通、连续三个 20 ms 小段的 VAD 起点、轻声增加 7 dB、−1 dBFS 限幅。全章 **8/8 步易读 12/12**，平均 **23.75/24**，**0 冷读洞**。
- 逐步 `build`、本章 `transcript`、逐步 `readability`、中文目标步 `mobile`、`deep-check 03`、本章 `zh-check` 和 `git diff --check` 通过；最终全章 `readability` 为 8 步、0 机械问题。各步双语桌面和手机图均已打开检查，路径见评分卡；第 8 步材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch03-s08-20261125-1015/checks/`。本轮只跑本章检查，未跑全站回归或 Voxt 产品测试。本轮类型：**新书**；下一普通轮按交替规则修旧。
- 09:45 完成 Learning SGLang Omni 第 4 章第 3–4 步：默认五段可用 chunk 可提前构建，流结束可豁免；逐步 decode 需要当前步 feedback 和下一段 thinker 文字，文字流结束后才可用 pad 补文字。本章 4/4 步均为易读 **12/12**、原分 **24/24**、**0 冷读洞**。
- `build`、本章 `transcript`、逐步 `readability`、中文步及 Omni 全书 `mobile`、`deep-check 04`、本章 `zh-check`、静态图一致性和双语抽屉断言通过。第 3 步截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s03-20261125-0935/final/`；第 4 步截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch04-s04-20261125-0943/final/`。本轮只跑本章检查，未跑全站回归。
- 09:30 主人指出只署 Wilson Zheng 不符合当前贡献：主页、章节侧栏、README 和链接预览卡改为「原教程 Wilson Zheng；扩展 cosekii 与 learning-sglang」，网页仓库链接和预览卡地址改指 `cosekii/learning-sglang`。教程内容与评分不变。
- `build`、`og`、31 页署名与链接断言、93 个手机署名视图和 `git diff --check` 通过；360/390/430 px 均能看到完整署名，无横向溢出。截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-attribution-20261125-0930/home-zh.png`；预览图：`public/og.png`。本轮类型：**修旧**；下一普通轮做新书的下一整章。
- 09:10 主人反馈主页只露出 Learning SGLang：新增共享四本书目录，左侧固定显示四本书入口，主页正文列出四本书全部章节；章节页保留本书目录，并核对 30 个已完成章节后加上 19 组双向跨书相关链接。侧栏滚动位置改为按书保存，教程 caption、图和 transcript 未改。
- 独立审查通过；次级导航文字在普通、当前书和悬停背景的对比度均 ≥4.78:1。`build`、全量 `transcript`、全站 `mobile`、93 个中文手机导航视图、31 页链接与双向关系、四书代表章 `zh-check` / `deep-check` 和 `git diff --check` 通过；全站手机无布局断裂，612 个小字视图仅审计。教程步骤评分不变；全量 `readability` 仍报告 370 条既有机械问题，本轮未改教程。
- 截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-four-books-20261125-0910/home-zh-final.png`、`related-zh-final.png` 和 `home-phone-open-zh-final.png`。本轮类型：**修旧**；下一普通轮做新书的下一步，下次整点轮换第 3 项「复盘自己」。
- 09:00 整点自主优化第 2 项「向好的范例学」：重读 zero-to-sglang 第 1 部分第 5 章，对照 Learning ML Systems 第 1 章的 7 步 transcript、深入讲解和评分卡。课程用「先定延迟目标 → 看分布 → 只数达标请求 → 再算有效吞吐」连接 Goodput 与 Throughput；现有第 7 步明确不展开 Goodput，已把未来新增第 8 步的具体图、算式和边界记为 Z26，并同步对照表。
- 本轮只更新想法、对照表和记忆，不改教程；既有 7/7 步保持易读 **12/12**、原分 **24/24**、**0 冷读洞**。参考截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ml-sys-ch01-s07-20261124-2130/final/mlsys-ch01-s07-zh.png`；本地第 7 步 HTTP 200。本轮类型：**自主优化**；下一普通轮按交替规则修旧，下次整点轮换第 3 项「复盘自己」。
- 08:30 制作 Learning ML Systems 第 2 章第 2 步：用同一份 78 GB 预算说明启动保留的 CUDA Graph 缓冲与运行临时结果共用 11.7 GB 动态余量；主图只保留一个新术语，深入讲解补全公式、源码边界和延伸阅读。
- 最终中英独立冷读在正常和遮住 caption 两种阅读下均为 **12/12、0 内容洞**，原 12 项 **24/24**。`build`、本章 `transcript`、本章及中文目标步 `mobile`、本步 `readability`、`deep-check 02`、`zh-check` 和 `git diff --check` 均通过；未跑全站手机回归。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ml-ch02-s02-20261125-0830/final/` 和 `checks/`。本轮类型：**新书**；下一普通轮按交替规则修旧，下次整点仍轮换第 2 项「向好的范例学」。
- 08:10 修旧 Learning SGLang 第 6 章第 7 步：15 个混合步改为依次淡入，再显示首个 token、图例和数字卡；直接加载不再叠上 recap 淡出。中文图补「每步约 300 token，300 − 64 = 236」，解释 chunk 从 512 变为 236。
- 浏览器按实际 opacity 每 40 ms 采样，直接加载和 Step 6→7 的可见并发动画峰值均为 **1**，后者测到 18 个元素且结束无残留。独立成人模拟冷读中文 **12/12、0 内容洞、0 显示洞**；整步易读 **9→10/12**，原 12 项 **23/24**。受保护英文仍有 R4 两项机械失败及既有的 1 个内容洞、1 个手机显示洞，整步不标完成。
- `build`、本章 `transcript`、本步中文 `mobile`、`deep-check 06`、本章 `zh-check`、英文画布像素一致性和 `git diff --check` 均通过；`readability` 只余英文首句 22 词、caption 超过两句。
- 截图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch06-s07-animation-20261125-0810/final/` 和 `checks/`。本轮类型：**修旧**；下一普通轮做 Learning ML Systems 第 2 章第 2 步，下次整点仍轮换第 2 项「向好的范例学」。

## Learning SGLang

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-inference | 完成：12/12 步易读满分 | 24.00 |
| 02 | 02-attention | 易读整改：中文 14/14 步满分、8/14 步整步满分；第 3 步整步 10/12，第 7、8、11、13、14 步整步 11/12；第 3 步英文 R2、R4 及其余五步英文 R4 待主人定 | 24.00 |
| 03 | 03-kv-cache | 完成：中文 10/10 步易读满分；受保护英文 R4 待主人定 | 24.00 |
| 04 | 04-prefill-decode | 完成 | — |
| 05 | 05-batching | 完成 | — |
| 06 | 06-scheduler | 易读整改：第 7 步 10/12（中文 12/12、0 洞，动画已修）；英文 R4 待主人定 | — |
| 07 | 07-kv-memory | 易读整改：第 4、6 步均 10/12（中文均 12/12、0 洞；英文 R2、R4 未过）；其余步未评；英文旧文待主人定 | — |
| 08 | 08-prefix-caching | 完成 | — |
| 09 | 09-one-request | 完成 | — |
| 10 | 10-engine | 完成 | — |
| 11 | 11-cuda-graphs | 完成 | — |
| 12 | 12-piecewise-cuda-graph | 完成 | — |
| 13 | 13-torch-compile | 完成 | — |
| 14 | 14-attention-backends | 完成；已校准；第 6 步已修 | 23.69 |
| 15 | 15-speculative-decoding | 完成 | — |
| 16 | 16-omni-models | 完成 | — |
| 17 | 17-stages-and-schedulers | 完成 | — |
| 18 | 18-between-stages | 完成 | — |
| 19 | 19-sharing-gpus | 完成 | — |
| 20 | 20-streaming-audio | 完成 | — |
| 21 | 21-full-duplex | 完成 | — |
| 22 | 22-quantization | 规划 | — |
| 23 | 23-two-batch-overlap | 规划 | — |
| 24 | 24-tensor-parallel | 规划 | — |
| 25 | 25-pipeline-expert-parallel | 规划 | — |
| 26 | 26-dp-attention | 规划 | — |
| 27 | 27-hierarchical-kv | 规划 | — |
| 28 | 28-disaggregation | 规划 | — |
| 29 | 29-router | 规划 | — |

## Learning SGLang Omni

规划完成：`docs/plan-omni.md` 共 3 部分、13 章；第 1 章已制作 4 步并完成，第 2、3 章各已制作 3 步并完成，第 4 章已制作 4 步并完成，第 5 章已制作 5 步并完成。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-config-to-runtime | 完成：4/4 步易读满分 | 24.00 |
| 02 | 02-spg-topology | 完成：3/3 步易读满分 | 24.00 |
| 03 | 03-request-binding | 完成：3/3 步易读满分 | 24.00 |
| 04 | 04-readiness-contracts | 完成：4/4 步易读满分 | 24.00 |
| 05 | 05-data-lifetime | 完成：5/5 步易读满分 | 24.00 |
| 06 | 06-batching-backpressure | 在做第 1 步 | — |
| 07 | 07-shared-gpu-budgets | 规划 | — |
| 08 | 08-measure-streaming | 规划 | — |
| 09 | 09-ar-stage-optimization | 规划 | — |
| 10 | 10-vocoder-optimization | 规划 | — |
| 11 | 11-fish-s2-pro | 规划 | — |
| 12 | 12-full-duplex-strategies | 规划 | — |
| 13 | 13-qwen3-omni-deployment | 规划 | — |

## Learning ML Systems

规划完成：`docs/plan-ml-sys.md` 共 3 部分、16 章；第 1 章已制作 7 步并完成，第 2 章已制作 2 步并完成，第 3 章已制作 6 步并完成，第 4 章已制作 7 步并完成。第 11 章须先补齐训推不一致的原始来源，缺源时先跳过。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-measure-inference | 完成：7/7 步易读满分 | 24.00 |
| 02 | 02-inference-memory-budget | 完成：2/2 步易读满分 | 24.00 |
| 03 | 03-hybrid-state-cache | 完成：6/6 步易读满分 | 24.00 |
| 04 | 04-gpu-communication | 完成：7/7 步易读满分 | 24.00 |
| 05 | 05-distributed-serving | 规划 | — |
| 06 | 06-slime-rollout-loop | 规划 | — |
| 07 | 07-weight-updates | 规划 | — |
| 08 | 08-fsdp2-training-backend | 规划 | — |
| 09 | 09-fp8-rollout-training | 规划 | — |
| 10 | 10-int4-qat-rollout | 规划 | — |
| 11 | 11-train-inference-mismatch | 待补源 | — |
| 12 | 12-rl-speculative-decoding | 规划 | — |
| 13 | 13-multi-turn-agent-rl | 规划 | — |
| 14 | 14-profile-rl-systems | 规划 | — |
| 15 | 15-memory-snapshot-debugging | 规划 | — |
| 16 | 16-engineering-practice | 规划 | — |

## Inside Voxt

规划完成：`docs/plan-voxt.md` 共 3 部分、16 章；第 1 章已制作 4 步并完成，第 2 章已制作 3 步并完成，第 3 章已制作 8 步并完成，第 4 章已制作 7 步并完成。事实来源只使用 `sglang-omni` 的 `origin/main` 公开代码和文档。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | one-dictation | 完成：4/4 步易读满分 | 24.00 |
| 02 | helper-permissions-hotkeys | 完成：3/3 步易读满分 | 24.00 |
| 03 | microphone-to-voice-frames | 完成：8/8 步易读满分 | 23.75 |
| 04 | speech-recognition-routes | 完成：7/7 步易读满分 | 23.86 |
| 05 | language-model-connection | 规划 | — |
| 06 | compose-and-cleanup | 规划 | — |
| 07 | deliver-text-safely | 规划 | — |
| 08 | personal-dictionary | 规划 | — |
| 09 | history-retry-retention | 规划 | — |
| 10 | file-transcription | 规划 | — |
| 11 | models-and-app-updates | 规划 | — |
| 12 | meeting-capture-modes | 规划 | — |
| 13 | meeting-live-and-final | 规划 | — |
| 14 | meeting-speaker-labels | 规划 | — |
| 15 | meeting-summary-and-export | 规划 | — |
| 16 | logs-tests-and-evaluation | 规划 | — |
