# 四本书制作进度

更新：2026-11-26。分数为 `EVAL.md` 原 12 项的 24 分制平均分；`—` 表示尚未评分。原标为「完成」的章节仍需逐步补易读性评分，易读分未满 12 不算新标完成。

## 本轮记录

- 按复审指出的静态场景标准，直接核对第 7 章组件与 transcript：每步只有一个静态场景，R6 均为 2/2；逐图核对图自身信息、直接标签和颜色图例，原 #4／#5 均为 4/4。第 7 章现为 **8/8 步易读 12/12、原分 24/24、0 已知洞**，`ready: true` 有完整评分依据，不再做文字轮次。回归旧报告改记为：测试 `d36df3a`，早于当前 HEAD，可按 SOUL 跳过；mobile 两段只有 unsettled-await 警告，没有结果，整次回归是 **inconclusive**，不是通过。
- 复审指出 `8dd368c` 的 `ready: false` 使 transcript／mobile／deep-check 报 `no ready chapters matched`，已恢复 `ready: true` 让现有门槛能选中本章，不代表完成。本章仍为 **text-complete / visual-blocked-on-owner**，R6、原 #4／#5 和总分不记。`build`、本章 `transcript`、中英布局 `mobile`、`readability`、`deep-check 07`、`zh-check` 已在 4323 端口重跑通过；下一新轮做 `08-fsdp2-training-backend`。回归 `latest.md` 虽写「有失败」，但 `run.log:65-79` 对应两条 mobile unsettled-await 警告和 `(exit 0)`，没有列出的布局失败行；此证据已写入报告。
- 复审确认 Learning ML Systems 第 7 章文本和机械门槛真实通过，但 8/8 步只有 R1–R5，未达到 12/12。停止文字重写；另行尝试 `explore` 视觉复审仍返回 `NO_IMAGE_INPUT`，本章定为 **text-complete / visual-blocked-on-owner**，`ready` 改为 `false`，R6、原 #4／#5 和总分继续不记。按「两轮还上不去就换单元」规则，下一单元明确为 `08-fsdp2-training-backend`。核查本 lane 的 ML Systems 提交只涉及第 7 章，没有其他 k2 章节的视觉总分需要追溯；其他 lane 的历史视觉分不据此改动。
- 01:45 Inside Voxt 第 8 章《你的小词典》7 步内容完成：同一词条分画语音提示、别名替换、术语表、备注四个去处与各自开关；别名替换先于清理、模型不在仍有效；术语表 ≤30 整份 / >30 只发提到的最多 60 行 2000 字符；备注作为单独一层进 system 提示。文本与机械门槛全过（build、本章 transcript、readability、deep-check、zh-check、中英三种宽度 mobile、中文逐步字号），0 内容洞；R6/#4/#5 与截图目测待有图片输入的复审者，本章保持待目视。
- 01:39 继续修 Learning ML Systems 第 7 章：独立文本冷读发现 11 项问题，分别修第 1、3、4、5、6、7、8 步的单位歧义、接收空间、两种 rank 0、句柄访问范围、SGLang 装入等待、未指定桶数、旧 KV 复用、两个深入讲解符号表和示例 GPU 数量。复审确认 11 项全部解决；按同一地图／流程标准校准后，**8/8 步 R1–R5 为 10/10**，非视觉原 12 项无新增扣分，**R6 与总分继续不记**。本章仍未完成，等待 vision-capable reviewer 或主人做视觉验收。
- 七个步骤分别提交并推送至 `2de62ec`。`build`、本章 `transcript`、全章 `readability`、中英三种宽度 `mobile`、中文目标步字号、`deep-check 07`、本章 `zh-check`、16 个深入讲解渲染断言和 `git diff --check` 通过。最终 48 张图位于 `/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-lyljndnh/opencode/ls-k2-mlsys07/`，文件齐全；主模型和独立代理均不支持图片输入，未声称目测通过。只跑本章检查，未跑全站回归、真实训练、权重传输或性能基准。本轮类型：**修旧**；下一章是 `08-fsdp2-training-backend`。
- 01:00 第五轮按源码复审修 Inside Voxt 第 7 章 5 个内容洞：目的地改成焦点的所属进程（不总是前台 app）；卡片只在功能开关打开时出现、关时复制并提示；按钮/列表规则收窄并补卡片 Insert 例外；没确认不再保证文字留在剪贴板；150 ms 放回从 ⌘V 起算并减去已花时间。transcript、15 张舞台图和 10 张深入讲解图重生成，本章门槛重跑通过。视觉/独立冷读仍待有图片输入的复审者，本章保持待目视。
- 数值复审继续修 Learning ML Systems 第 7 章：第 7 步补每 tensor 一次 30 ms 与 `4.845 ÷ 0.030 = 161.5`，约 160 次调用，并改清英文照片像素说明。第 7 步 R1 与原 #3 文本复核通过；R6 与总分继续不记。**本章仍未完成**，等待 vision-capable reviewer 或主人检查 48 张终稿。
- 00:40 完成 Learning SGLang Omni 第 8 章全部 8 步的内容制作与独立 transcript 冷读：首音 p90 对照、首个 audio delta 的 TTFT 边界、chunk 空档、通信 trace、host／GPU event 等待、partial-start 单变量协议、逐次离散程度和完整比较证据。全章 **8/8 步易读 12/12**，平均 **24.00/24**，**0 内容洞、0 机械显示洞**；图像人工视觉验收待主人。
- 逐步提交并推送；`build`、本章 `transcript`、全章 `readability`、中英三种宽度 `mobile`、中文目标步字号、`deep-check 08`、本章 `zh-check`、16 个深入讲解渲染视图和 `git diff --check` 通过。独立冷读 subagent 复审至 8/8 步没有必须修内容项；它和主模型均不支持图像输入，未声称截图目测已完成。最终 44 张图位于 `/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-v14569g1/opencode/ls-k1-omni08-final/`。本轮只跑本章检查，未跑全站回归、真实服务、GPU benchmark 或音频质量评测。本轮类型：**新书**；下一普通轮按交替规则修旧，下一章是 `09-ar-stage-optimization`。
- 00:45 第四轮修 Inside Voxt 第 7 章：第 1 步把「≠ / 不回 / 不是目的地」改成「可以不同 / 不一定回 / 不一定是目的地」，aria 补「可以是同一个 app」；第 5 步兜底改「粘贴未确认：卡片提供 Insert 和 Copy。」。重生成 transcript 与 15 张舞台图、10 张深入讲解图（`ls-voxt-ch07-final2-20261126`），重跑本章门槛均通过。视觉评审仍待有图片输入的复审者，本章保持待目视，不给总分。
- 再次复审 Learning ML Systems 第 7 章：分开完整 1B 更新和一个张量示例，统一 `0.033 ÷ 0.001`，中文改为「模型代码本身」，主图用「等结果」替代 `ray.get`；补 `2 GB ÷ 3.35 TB/s ≈ 0.6 ms` HBM 对照和 1024×1024 照片像素对照。R1–R5 保持 **8/8 步 10/10**，R6 与总分继续不记，视觉复核留给主人。
- 00:35 第三轮修 Inside Voxt 第 7 章：第 1 步舞台补「焦点：打字会落下的框」；第 5 步兜底改「未贴入：卡片提供 Insert 和 Copy。」并把「落地的文字」改成「答案文字」；双语深入讲解第 1 步标题改「可以不是同一个 app」。尝试找有图片输入的复审者看 15 张舞台图和 10 张深入讲解图：`general` 子代理返回 `NO_IMAGE_INPUT`，`pstack-reviewer` 的模型配置不存在。R6、#4、#5 仍无目视结果，本章保持待目视，不给总分。
- 00:08 修旧 Learning SGLang 第 14 章第 5、7、9、11、12 步：改清 prefill/decode 两条执行路径，补固定版本源码，修正 `cutedsl_mla`、Triton page、MPS 默认例外与 MHA/GQA 共用关系，并加中文手机大字专版。五步中文易读均 **12/12**、原分均 **24/24**、**0 内容洞**；第 9、11、12 步原分由 **23、23、22** 升为 **24**，章均分 **23.69→24.00/24**。
- `build`、本章 `transcript`、整改步中文三宽度 `mobile`、`deep-check 14`、本章 `zh-check` 和 `git diff --check` 通过。独立冷读首轮发现第 5、12 步两处矛盾，修后复读均为 12/12、0 洞；主线程打开全部整改步桌面／手机终稿，英文第 12 步改前后像素一致。材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch14-repair-20261126-0008/final/`、`checks/`。整步保留第 7、9、11、12 步 9 个受保护英文 R4 问题，第 5 步另有 2 个受保护英文 R2/R4 问题；未跑全站回归。本轮类型：**修旧**；下一普通轮做新书，下次整点轮换第 3 项「复盘自己」。
- 复审继续修 Learning ML Systems 第 7 章：第 1 步画出 `WHOLE CALL` 并标 `model code`，第 5 步写明转换为 rollout 模型布局，第 3 步改为 plain wording；hook 收窄为三条路线与安全替换时刻。R1–R5 为 **8/8 步 10/10**，**R6 全部未验证，原 12 项总分不记**；文本与机械门槛通过，视觉复核留给 vision-capable reviewer 或主人。
- 00:25 按第二轮复审继续修 Inside Voxt 第 7 章：第 4 步把「一样=没确认」收窄到普通可读框，并把「一样且网页区域 → 贴入」画成比较框里的第四条出口；第 5 步去掉 `Priya` 和问句的蓝色，只留加粗当锚点；剪贴板兜底改为只有「发出粘贴但没确认」才留文字，密码框/不可编辑在写剪贴板前返回，`KeepClipboard` 单列；第 1 步复述改成「文字去此刻焦点，不一定回 start app」。评分卡、progress、report 相应改为待目视，不标完成。
- 00:21 完成 Learning ML Systems 第 7 章全部 8 步：更新耗时、三条通道、distributed 广播、tensor 位置便签、分桶、版本边界、外部等待和训练保存的表。R1–R5 为 **8/8 步 10/10**，**R6 未验证、不记总分**，**0 已知文本洞**；视觉终检待主人。
- 本章 `build`、`transcript`、全章 `readability`（0 机械问题）、中英三种宽度 `mobile`、`deep-check 07`、`zh-check` 和 `git diff --check` 通过。独立文本冷读整改后终审无阻塞内容洞；48 张中英桌面／手机／深入讲解图已生成，8 个抽屉均经浏览器断言打开。材料：`/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/hmz-fence-4_anc940/opencode/ls-k2-mlsys-ch07/final/`。本轮模型不能读图，视觉终检留给主人。只跑本章检查，未跑全站回归、真实训练、权重传输或性能基准。本轮类型：**新书**；下一章是 `08-fsdp2-training-backend`。
- 00:15 按复审修 Inside Voxt 第 7 章 6 处事实/评估问题：第 3 步把「网页从不收文字」收窄到别的 app（start app 里 `AXWebArea` 不走 `nonText`）；第 4 步把「一样=没贴进去」改为「一样=没确认」，并补 `AXWebArea` / 可编辑网页区域改成 unknown 再按已贴入处理的例外；第 4 步主图去掉 length/digest/selection/marker，改成「框里的文字和光标」；深入讲解修正第 1、2 步不存在的描述并补 `f.Role`、`t_restore`；第 5 步加「落地的文字」卡（`Priya` 高亮）并把章末问句锚在它上面；评分卡只记文本与机械检查，目视项待主人，不再声称 12/12、24/24。
- 00:00 整点自主优化第 2 项「向好的范例学」：阅读 Jay Alammar《The Illustrated Transformer》，对照 Learning SGLang 第 2 章第 6、14 步。范例在分步后用同一例子回收多头总图；本章第 6 步只有 `32 × 128 = 4,096` 和 `W_O` 的文字说明，已把 `4096 → 32 个 128 → concat 4096 → W_O → 4096` 的具体补图方案并入 Z03。
- 本轮只更新想法、评分记录和记忆，不试改满分步骤。第 6 步整步易读 **12/12**、原分 **24/24**、**0 洞**；第 14 步中文易读 **12/12**、原分 **24/24**、**0 洞**，整步仍 **11/12**，只余受保护英文 R4；章均分保持 **24.00/24**。截图：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-autonomous-transformer-20261126-0000/final/`。`transcript`、中英本章 `mobile`、`deep-check 02`、本章 `zh-check`、`build` 和 `git diff --check` 通过；`readability` 保留既有 9 个受保护英文机械问题，未跑全站回归。本轮类型：**自主优化**；下一普通轮按交替规则修旧，下次整点轮换第 3 项「复盘自己」。
- 00:05 完成 Inside Voxt 第 7 章全部 5 步：start app 与 front app 的区别、密码框挡住投递、焦点能不能收文字的三条规则、贴完复查焦点、剪贴板快照与放回。5/5 步文本冷读通过，**0 内容洞**；R6 与图表目视项待主人，未给总分。
- 本章 `build`、`transcript`、全章 `readability`（0 机械问题）、`deep-check 07`、`zh-check`、中英本章 `mobile`、中文逐步字号 `mobile` 和 `git diff --check` 通过。只跑本章检查，未跑或等待全站回归。本轮模型不能读图，像素级目视终检留给主人/复审者；布局由 transcript、`zh-check` 和三种宽度 `mobile` 代理。本轮类型：**新书**；下一章是 `08-personal-dictionary`。
- 23:56 完成 Inside Voxt 第 6 章全部 8 步：三条任务路线、消息顺序、整理 prompt 的五部分、三种回答约定、长听写按序分片、失败片保留原话、Translate / Rewrite 失败出口、截断回答进入答案卡。全章 **8/8 步易读 12/12**，平均 **23.88/24**，**0 内容洞、0 最终显示洞**。
- 教程逐步提交并推送至 `5bff5f4`；`build`、本章 `transcript`、全章 `readability`、中英三种宽度本章 `mobile`、`deep-check 06`、本章 `zh-check` 和 `git diff --check` 通过。独立模拟冷读整改后复读无必须修项；主线程逐张检查 40 张中英桌面／手机／深入讲解终稿。最终图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch06-20261125-2319/final/`、`checks/`。本轮只跑本章检查，未跑全站回归、真实模型或 Voxt 产品测试。本轮类型：**新书**；下一普通轮按交替规则修旧，下一章是 `deliver-text-safely`。
- 23:14 完成 Learning ML Systems 第 6 章全部 8 步：一轮 256 个回答、prompt 复制、rollout 记录、原始 reward、GRPO 均值中心化、标准差归一化、训练调用和下一轮权重更新。全章 **8/8 步易读 12/12**，平均 **24.00/24**，**0 内容洞、0 最终显示洞**。
- 本章改动与评分记录提交并推送；`build`、本章 `transcript`、全章 `readability`、中英三种宽度 `mobile`、`deep-check 06`、本章 `zh-check` 和 `git diff --check` 通过。主线程换视角逐张冷读 48 张中英桌面／手机／深入讲解终稿；独立冷读 subagent 因 API key 不可用未运行。最终图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch06-20261125-2253/final/`、`checks/`。本轮只跑本章检查，未跑或等待全站回归。本轮类型：**新书**；下一普通轮按交替规则修旧，下一章是 `07-weight-updates`。
- 22:52 完成 Learning SGLang Omni 第 7 章全部 6 步：DP9 比例求和、比例与 reserve 合并校验、KV 单次领取、权重共享与私有 KV、MPS 租约和 AuK 串行 offload。全章 **6/6 步易读 12/12**，平均 **24.00/24**，**0 内容洞、0 最终显示洞**。
- 教程提交 `f19518d` 已推送；本章 `build`、`transcript`、全章 `readability`、中英三种宽度 `mobile`、中文逐步字号、`deep-check 07`、`zh-check` 和 `git diff --check` 通过。主线程换视角逐张冷读 24 张中英桌面／手机终稿；独立冷读 subagent 因 API key 不可用未运行。最终图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-omni-ch07-20261125-2237/final/`、`checks/`。本轮只跑本章检查，未跑或等待全站回归。本轮类型：**新书**；下一普通轮按交替规则修旧。
- 22:12 修旧 Learning SGLang 第 7 章第 1、2、3、5、7 步：补齐显存与容量算式、两类分配浪费、page 回收和物理读写、完整接纳不等式与代入例。全章中文 **7/7 步易读 12/12**，原分平均 **23.57/24**，**0 中文内容洞、0 最终显示洞**。整步第 1、2、3、5、7 步为 11/12，第 4、6 步为 10/12；余下是受保护英文 R4，第 4、6 步另有英文 R2。
- 教程逐步提交并推送至 `c9e25e7`。`build`、本章 `transcript`、本章及整改步中文 `mobile`、`deep-check 07`、本章 `zh-check` 和 `git diff --check` 通过；全章 `readability` 中文 0 问题，保留 9 个受保护英文机械问题。七步英文桌面图均与改前逐像素一致。独立冷读 subagent 因 API key 不可用未运行，主线程换视角逐张冷读整改步中文桌面／手机终稿。材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch07-repair-20261125-2212/final/`、`checks/`。本轮只跑本章检查；后台全站回归最后通过的是 `633b1df`。本轮类型：**修旧**；下一普通轮做新书。
- 21:33 完成 Inside Voxt 第 5 章全部 5 步：请求的三项内容、本机与外部地址、模型设置与 Keychain 分管、请求体字段、Authorization 请求头与下一章交接。全章 **5/5 步易读 12/12**，平均 **24.00/24**，**0 内容洞、0 最终显示洞**。
- 逐步提交并推送；`build`、本章 `transcript`、全章 `readability`、中英三种宽度本章 `mobile`、逐步中文字号、`deep-check 05`、本章 `zh-check` 和 `git diff --check` 通过。独立冷读 subagent 因 API key 不可用未运行，最终由主线程换视角逐张冷读 20 张中英桌面／手机终稿。最终图与日志：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-voxt-ch05-20261125-1540/final/`、`checks/`。本轮只跑本章检查，未跑全站回归、真实模型请求、Keychain 读写或 Voxt 产品测试。本轮类型：**新书**；下一普通轮按交替规则修旧。
- 15:38 完成 Learning ML Systems 第 5 章全部 7 步：公开启动日志、双节点入口、8 个 TP worker、就绪检查、短请求、请求往返和客户端计时。全章 **7/7 步易读 12/12**，中英原分均 **24/24**，平均 **24.00/24**，**0 内容洞、0 最终显示洞**。
- 逐步提交并推送；主线程逐张冷读 42 张双语桌面、手机和深入讲解终稿。`build`、本章 `transcript`、全章 `readability`、中英三种宽度 `mobile`、`deep-check 05`、本章 `zh-check` 和 `git diff --check` 通过。材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-mlsys-ch05-20261125-1510/final/`、`checks/`。本轮只跑本章检查，未跑全站回归。本轮类型：**做新书**；下一章是 `06-slime-rollout-loop`。
- 15:01 修旧 Learning SGLang 第 6 章全部 9 步：统一 waiting 的新到、续块和撤回后重算，区分槽位／KV 接纳与本轮 token 预算，并补齐第 1–6、9 步中文手机大字图。全章中文 **9/9 步易读 12/12**，原分平均 **23.78/24**，**0 中文内容洞、0 最终显示洞**。第 1、7 步原 #1 各为 1；整步易读第 1–4 步为 11/12、第 5–9 步为 10/12，剩余是受保护英文 R4，第 7 步另有两个既有英文洞。
- 教程改动逐步提交并推送，最后教程提交 `290886b`。终验冷读发现第 2 步手机连接线形成白色块状残留，删除多余线后复查通过。`build`、本章 `transcript`、本章中文三种宽度 `mobile`、整改步字号、`deep-check 06`、本章 `zh-check` 和 `git diff --check` 通过；`readability` 中文 0 问题，保留 14 个受保护英文机械问题。独立冷读 subagent 因 API key 不可用未运行，主线程换视角逐张冷读 18 张中文桌面／手机图。材料：`/private/var/folders/f0/y3512xfn3vn334b7kcc6_hzw0000gn/T/opencode/ls-ch06-repair-20261125-1440/final/`、`checks/`。本轮只跑本章检查，未跑全站回归。本轮类型：**修旧**；下一普通轮做新书。
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
| 06 | 06-scheduler | 易读整改：中文 9/9 步满分、0 洞；整步第 1–4 步 11/12、第 5–9 步 10/12；受保护英文 R4 待主人定 | 23.78 |
| 07 | 07-kv-memory | 易读整改：中文 7/7 步满分、0 洞；整步第 1、2、3、5、7 步 11/12，第 4、6 步 10/12；受保护英文 R4，第 4、6 步英文 R2 待主人定 | 23.57 |
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

规划完成：`docs/plan-omni.md` 共 3 部分、13 章；第 1 章已制作 4 步并完成，第 2、3 章各已制作 3 步并完成，第 4 章已制作 4 步并完成，第 5 章已制作 5 步并完成，第 6 章已制作 8 步并完成，第 7 章已制作 6 步并完成，第 8 章已制作 8 步且内容验收完成，图像人工视觉验收待主人。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-config-to-runtime | 完成：4/4 步易读满分 | 24.00 |
| 02 | 02-spg-topology | 完成：3/3 步易读满分 | 24.00 |
| 03 | 03-request-binding | 完成：3/3 步易读满分 | 24.00 |
| 04 | 04-readiness-contracts | 完成：4/4 步易读满分 | 24.00 |
| 05 | 05-data-lifetime | 完成：5/5 步易读满分 | 24.00 |
| 06 | 06-batching-backpressure | 完成：8/8 步易读满分 | 24.00 |
| 07 | 07-shared-gpu-budgets | 完成：6/6 步易读满分 | 24.00 |
| 08 | 08-measure-streaming | 内容完成：8/8 步易读满分、0 内容洞和机械显示洞；图像人工视觉验收待主人 | 24.00 |
| 09 | 09-ar-stage-optimization | 规划 | — |
| 10 | 10-vocoder-optimization | 规划 | — |
| 11 | 11-fish-s2-pro | 规划 | — |
| 12 | 12-full-duplex-strategies | 规划 | — |
| 13 | 13-qwen3-omni-deployment | 规划 | — |

## Learning ML Systems

规划完成：`docs/plan-ml-sys.md` 共 3 部分、16 章；第 1 章已制作 7 步并完成，第 2 章已制作 2 步并完成，第 3 章已制作 6 步并完成，第 4 章已制作 7 步并完成，第 5 章已制作 7 步并完成，第 6 章已制作 8 步并完成，第 7 章已制作 8 步但尚未完成，R1–R5 与机械门槛已通过，R6 和视觉终检待主人。第 11 章须先补齐训推不一致的原始来源，缺源时先跳过。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | 01-measure-inference | 完成：7/7 步易读满分 | 24.00 |
| 02 | 02-inference-memory-budget | 完成：2/2 步易读满分 | 24.00 |
| 03 | 03-hybrid-state-cache | 完成：6/6 步易读满分 | 24.00 |
| 04 | 04-gpu-communication | 完成：7/7 步易读满分 | 24.00 |
| 05 | 05-distributed-serving | 完成：7/7 步易读满分 | 24.00 |
| 06 | 06-slime-rollout-loop | 完成：8/8 步易读满分 | 24.00 |
| 07 | 07-weight-updates | 完成：8/8 步静态场景易读 12/12、原分 24/24；R6／#4／#5 按组件与 transcript 复核 | 24.00 |
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

规划完成：`docs/plan-voxt.md` 共 3 部分、16 章；第 1 章已制作 4 步并完成，第 2 章已制作 3 步并完成，第 3 章已制作 8 步并完成，第 4 章已制作 7 步并完成，第 5 章已制作 5 步并完成，第 6 章已制作 8 步并完成，第 7 章已制作 5 步，待目视，第 8 章已制作 7 步、内容完成，待目视。事实来源只使用 `sglang-omni` 的 `origin/main` 公开代码和文档。

| 章 | slug | 状态 | 平均分 |
|---|---|---|---:|
| 01 | one-dictation | 完成：4/4 步易读满分 | 24.00 |
| 02 | helper-permissions-hotkeys | 完成：3/3 步易读满分 | 24.00 |
| 03 | microphone-to-voice-frames | 完成：8/8 步易读满分 | 23.75 |
| 04 | speech-recognition-routes | 完成：7/7 步易读满分 | 23.86 |
| 05 | language-model-connection | 完成：5/5 步易读满分 | 24.00 |
| 06 | compose-and-cleanup | 完成：8/8 步易读满分 | 23.88 |
| 07 | deliver-text-safely | 待目视：5 个源码级内容洞已修；R6/#4/#5 未评 | — |
| 08 | personal-dictionary | 内容完成：7/7 步文本 R1–R5、0 内容洞；R6/#4/#5 待目视 | — |
| 09 | history-retry-retention | 规划 | — |
| 10 | file-transcription | 规划 | — |
| 11 | models-and-app-updates | 规划 | — |
| 12 | meeting-capture-modes | 规划 | — |
| 13 | meeting-live-and-final | 规划 | — |
| 14 | meeting-speaker-labels | 规划 | — |
| 15 | meeting-summary-and-export | 规划 | — |
| 16 | logs-tests-and-evaluation | 规划 | — |
