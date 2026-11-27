# Learning ML Systems 规划

## 读法与边界

- 读者已读完第 1 本 Ch. 1–15。本书从一次请求的等待和显存开始，走到分布式服务、RL 训练和智能体基础设施；RL 从 rollout 循环开始讲，不假设读者学过 RL。
- `Awesome/` 指 `~/code/Awesome-ML-SYS-Tutorial`，本规划核对 `d1f309b46f81a23e8b6ca0718c05bc897fafacf7`。每章以表中的 Awesome 文章为主线，文章里的数字和结论须回到原文、原始代码或论文核对；找不到来源就不写。
- `Inference Engineering` 只用来补充指标、硬件、测量和生产环境的主题及事实，标记为 `IE §x.y`。图、caption 和深入讲解都重新写，不复制原文或原图。
- 第 1 本已经讲过的 prefill、decode、KV cache、paging、调度、CUDA Graph 和投机解码只引用对应 `Ch. X Step Y`。本书改讲完整显存账、hybrid state、跨卡通信、RL 权重流和实验方法。Ch. 22–29 仍是规划，不作本书前置；后续完成后要去重，本书不换标题重讲通用量化、TP、PP、EP、DP attention、分层 KV、P/D 分离或 router。
- 每章先用一张总图标出数据、权重或请求的位置，再用来源中可复核的数字说明代价。除最后一章外，章末问题由下一章回答。新数字进入本书的 numbers 文件，组件从同一份数据推导。

## 部分

- `inference`（第 1–5 章）：测量请求，算清显存，跟踪 cache 状态，再扩展到多卡服务。
- `rl`（第 6–12 章）：跟随权重走过 rollout、训练、更新和低精度路径，最后检查两个引擎是否算出同一个结果。
- `practice`（第 13–16 章）：把链路扩展到多轮智能体，再用 profiling、显存快照和公开工程记录完成一次可复核的修改。

## 章节表

| 章 | part | slug | 标题 | 一句 hook | 回答的问题 | 前置 | 事实来源 | 章末引出 |
|---|---|---|---|---|---|---|---|---|
| 01 | `inference` | `measure-inference` | 测量一次推理 | 把同一批请求画成首 token 等待、后续 token 间隔、延迟百分位和吞吐量。 | 怎样比较两次推理实验，而不让一个平均数遮住慢请求？ | 第 1 本 Ch. 4 Steps 1–4、Ch. 9 Steps 2–4 | `Awesome/sglang/sglang-omni/batch.md`；`Awesome/sglang/sglang-omni/cpu-first-class-citizen-zh.md`；`IE §1.4, §4.5` | 延迟可以测量了，请求还没开始时，显存先被谁占走？ |
| 02 | `inference` | `inference-memory-budget` | 启动与运行时显存账 | 跟着模型装入、KV 尺寸、graph 缓冲和激活走完一张卡的预算。 | `mem-fraction-static` 改变哪几格，为什么剩下的显存仍可能不够？ | 第 1 章；第 1 本 Ch. 7 Step 1、Ch. 11 Steps 2–4 | `Awesome/sglang/kvcache-code-walk-through/mem-fraction-static.md` | 共同前缀相同，hybrid 模型能从共同前缀的末尾继续算吗？ |
| 03 | `inference` | `hybrid-state-cache` | Hybrid 模型的前缀状态 | 对照全注意力的逐 token KV 与 recurrent state 的快照、重放。 | 为什么共同前缀相同，不等于能从共同前缀的末尾继续算？ | 第 2 章；第 1 本 Ch. 3 Steps 1–3、Ch. 8 Steps 1–5 | `Awesome/engineer/hybrid-prefix-cache/readme.md`；文内链接的固定版本源码 | 状态分到多张卡以后，卡与卡怎样交换张量？ |
| 04 | `inference` | `gpu-communication` | GPU 之间的张量路 | 沿着一份张量看进程、通信库、链路和 all-reduce。 | 多张 GPU 怎样集齐同一份结果，拓扑为什么会改变等待？ | 第 1 章 | `Awesome/torch/nccl/readme.md`；`Awesome/torch/torch-distributed/readme.md`；`IE §3.3, §5.4` | 能交换张量以后，服务怎样把请求分给不同 worker？ |
| 05 | `inference` | `distributed-serving` | 多节点推理服务实验 | 按公开配置启动 worker，跟着一个请求走过提交、计算和返回路径。 | 多节点服务怎样启动、接收请求并核对各段等待？ | 第 1、4 章；第 1 本 Ch. 4 Steps 1–4 | `Awesome/sglang/nvidia-dynamo/dynamo.md`；`IE §4.4, §5.5, §7.2, §7.5` | 推理服务旁边再加训练进程，权重怎样形成一轮循环？ |
| 06 | `rl` | `slime-rollout-loop` | slime 的一轮 RL | 把 prompt、rollout、reward、训练和下一版权重画成一个闭环。 | 训练框架、推理引擎和数据各自在哪一步交接？ | 第 5 章；第 1 本 Ch. 1 Steps 1–6 | `Awesome/rlhf/slime/code-walk-through/readme.md`；`Awesome/rlhf/OpenRLHF/readme.md` | 训练得到新权重后，rollout 进程怎样拿到它？ |
| 07 | `rl` | `weight-updates` | 权重更新通道 | 对照从磁盘重读与进程间直接传输，并标出每份权重何时可被替换。 | 新权重怎样从训练端安全到达推理端，等待花在哪里？ | 第 4、6 章 | `Awesome/rlhf/sys-design/readme-1.md`；`Awesome/sglang/latency-accelerate-for-weight-updates/readme.md` | 权重传得再快，训练端装不下完整状态时怎么办？ |
| 08 | `rl` | `fsdp2-training-backend` | FSDP2 训练后端 | 把参数、梯度和优化器状态分片，再看 rollout 前怎样收齐权重。 | FSDP2 怎样省训练显存，又怎样与 slime 的 rollout 接口接上？ | 第 6、7 章 | `Awesome/rlhf/slime/fsdp/readme.md`；`Awesome/rlhf/sys-design/readme-2.md` | 分片省下状态显存后，每个数本身还能占更少位吗？ |
| 09 | `rl` | `fp8-rollout-training` | FP8 采样与训练 | 把 FP8 张量放在 rollout 和训练两条路上，标出精度转换与反量化位置。 | 两边都用 FP8 时，哪些计算省空间或时间，哪些差异仍要测量？ | 第 6、8 章 | `Awesome/rlhf/slime/fp8/readme.md` | FP8 之外继续压到 INT4，怎样让训练知道量化带来的变化？ |
| 10 | `rl` | `int4-qat-rollout` | INT4 QAT 与 rollout | 把量化感知训练、INT4 权重和 rollout 显存放进同一轮 RL。 | 低精度 rollout 怎样把超大模型装进单机，训练又怎样补偿量化误差？ | 第 2、9 章 | `Awesome/rlhf/slime/int4/readme.md` | 即使权重相同，两个引擎算出的 log probability 也一定相同吗？ |
| 11 | `rl` | `train-inference-mismatch` | 训练与推理的数值差 | 给同一权重和同一 token 序列画上两条计算路，再比较 log probability。 | 差异从哪些算子和归约顺序产生，后端对齐与算法修正各自改变什么？ | 第 6、9 章；第 1 本 Ch. 4 Steps 1–4 | `Awesome/rlhf/slime/mismatch/blog-cn.md` 已完成小节；`Awesome/rlhf/slime/fp8/readme.md`；文内链接的原始代码与算法出处 | 数值路径查清以后，rollout 本身还能少做哪些生成工作？ |
| 12 | `rl` | `rl-speculative-decoding` | RL 中的投机解码 | 让 draft 随训练更新，对照 rollout 吞吐与新增训练秒数。 | draft model 也更新时，投机解码怎样影响采样速度和接受长度？ | 第 6、11 章；第 1 本 Ch. 15 Steps 3–8 只回指 draft–verify | `Awesome/rlhf/slime/spec/readme.md` | 一次生成变成多轮工具调用后，哪些状态要跨轮保留？ |
| 13 | `practice` | `multi-turn-agent-rl` | 多轮智能体 RL | 跟着一个任务走过模型、工具、再进模型，并标出每轮的训练归属。 | 多轮消息、工具结果和图像怎样进入同一条 rollout，训练时又怎样区分？ | 第 6、12 章 | `Awesome/rlhf/slime/vlm-multi-turn/readme.md`；`Awesome/rlhf/verl/multi-turn/code-walk-through/readme-6.md`；`Awesome/rlhf/verl/server-based/veRL-server-based-rollout.md` | 多轮链路变长后，等待究竟落在哪一段？ |
| 14 | `practice` | `profile-rl-systems` | 测量多轮训练链路 | 把排队、生成、工具调用、训练和通信画到同一条时间线，再抓取定点 trace。 | 一次优化省掉了哪段等待，对照实验是否只改了一个变量？ | 第 1、13 章 | `Awesome/rlhf/verl/multi-turn/tool_examples/profile.md`；`Awesome/sglang/interactive-profiling/Interactive_Profiling_cn.md`；`IE §4.5` | 时间线找到了等待，没释放的显存又该怎样定位？ |
| 15 | `practice` | `memory-snapshot-debugging` | 用快照寻找显存泄漏 | 对比两个时间点的张量、调用栈和仍在持有的引用。 | 显存增长来自正常缓存、临时峰值，还是没有释放的张量？ | 第 2、14 章 | `Awesome/torch/mem-snapshot/readme.md` | 找到原因以后，怎样把修改交给别人复现和评审？ |
| 16 | `practice` | `engineering-practice` | 从源码阅读到公开贡献 | 用一个公开工程案例串起复现、源码定位、最小修改、测试、评审和记录。 | 怎样把一个系统问题变成别人能检查的贡献，并建立自己的知识地图？ | 第 1、6、14、15 章 | `Awesome/rlhf/OpenRLHF/develop-log.md`；`Awesome/sglang/latency-accelerate-for-weight-updates/readme.md`；`Awesome/engineer/uv/readme.md`；`Awesome/README.md` | 回到全书地图，用数据、权重、等待和显存四条线复查同一个系统。 |

## 来源限制

- `Awesome/rlhf/slime/mismatch/blog-cn.md` 仍有实质 TODO，部分实验配置和结果也未对齐。制作第 11 章前必须另核原始代码、配置和算法出处；补齐前不使用该文的实验数字支撑 TIS、MIS 或 bitwise 对齐结论，也不把该章标成可制作。缺源时可以跳过本章，先做后续章节。
- `Awesome/sglang/nvidia-dynamo/dynamo.md` 主要支撑启动、请求和 debug 操作。第 5 章不从这篇操作记录推出架构性能结论，分布式概念另核 `IE` 列出的章节。
- 规划表中的 `Pending Review` 文章只列已经公开、可回查的内容。写章时若找不到支撑某一结论的原文或代码，就删掉该结论，不补写猜测。
- `Awesome/engineer/hybrid-prefix-cache/learn-plan.md` 是写作草稿，不作事实来源。第 3 章只从公开成文文章和文章链接的固定版本源码取事实，不使用本机配置、日志或个人信息。

## 制作顺序

按 01 → 16 制作，每轮一步；来源闸门未解除的章节跳过并后补。第 1 章先建立全书共用的请求时间线，第 6 章再建立权重循环；后续章节都在这两张图上增加一条路径。每一步先过易读性检查，再核对原 12 项评分和冷读洞。
