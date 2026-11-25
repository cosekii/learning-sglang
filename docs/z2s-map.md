# zero-to-sglang 对照表

## 口径

- 课程基线：`datawhalechina/zero-to-sglang@bcf0cd82b9d1a058e5211d56431f14efd99eaf12`；教程基线：`learning-sglang@07933b89ec60f149c3ae1dfda4a9755ff8edbd8d`。课程文件在 `~/code/zero-to-sglang/course-material/ch/`。
- 共 25 章：Part 0 两章、Part I 五章、Part II 十章、Part III 五章、Part IV 三章。Part II 第 2–6、8–10 章的 `_代码.md` 与正文一起核对；其余章没有独立代码篇。
- 「已覆盖」只算已经制作的教程。Learning ML Systems 和第 1 本 Ch. 22–29 的内容一律标为「仅规划」，不把标题或 hook 当成已经讲过。
- 「不一致」先记录双方口径。实现名、默认值和调用顺序没有核到固定版本源码时标「待核」，不判谁错。制作时仍须回到 SGLang 或 mini-sglang 源码核实。
- 课程采用 CC BY-NC-SA 4.0；这里只学习讲法和知识点，图、caption、深入讲解都重新写。改进编号对应 `docs/ideas.md`，按「效果大、改动小」排列；第 1 本的改动默认只落中文层，英文原文要改时另标「待主人定」。

## 逐章对照

| 课程章 | 对应教程 | 已覆盖 | 课程更清楚的地方与我们的缺口 | 不一致或边界 | 改进 |
|---|---|---|---|---|---|
| **P0.1 编码伦理与开源精神** | ML Sys 16 | 仅规划复现、源码定位、最小修改、测试、评审和记录。 | §Coding ethics 1–4 把 motivation、影响面、函数级理解和实验回复变成提交前问题；§Open-source spirit 还承认文档、翻译、复现和定位问题。规划缺这些检查及非代码贡献。 | 与现有规划无冲突；具体社区硬规范待核，不能直接把课程建议写成官方要求。 | Z01、Z25 |
| **P0.2 部署你的第一个 SGLang 服务** | Ch. 9；ML Sys 5、16 | Ch. 9 Steps 1–2、9 已讲启动、HTTP 请求和流式返回；ML Sys 仅规划多节点实验与复现。 | §环境要求、§启动 server、§发请求、§常见问题给出 preflight、`/health`、最小请求和分类排障；ML Sys 5 缺“先证明单服务可用，再测分布式”的顺序。 | 课程用 `python3 -m sglang.launch_server`，Ch. 9 用 `sglang serve` 并称前者为旧形式；当前 alias 与安装约束待核。 | Z02、Z23 |
| **P1.1 LLM 入门** | Ch. 1、2 | token/id、logits、softmax、采样、自回归、EOS、Q/K/V、mask、RoPE 脚注和 GQA 头数已讲。 | §4.2.2–4.2.4 清楚串起多头切分、逐头 attention、concat 和 `W^O`；Ch. 2 从单头公式跳到 GQA，缺 `d_model → h×d_k → concat → W^O` 的形状桥。Norm、FFN 由 Z10 补入 forward 边界；RAG、Agent 等应用层词汇不属于这段推理主线，暂不搬入。 | 课程 §2 的“预测下一个字符”与同章 §5.7 及 Ch. 1 的 token/id 机制不一致，应按 token 理解。 | Z03、Z10 |
| **P1.2 推理入门** | Ch. 1、2、4、8 | 生成循环、attention、prefill/decode、`2Pn`、权重/KV 读取和 H100 交点已讲。 | §4.2–5.2 从 FLOPs/Bytes 推到 arithmetic intensity、Roofline 和 ridge point；Ch. 4 有交点却未给可迁移到其他 GEMM 的通用定义。训练 `6ND` 不搬进本章。 | 课程 §6 容易读成每轮必重算全部历史；Ch. 8 Step 6 已说明前缀命中时只 prefill 新尾部，课程需补“无缓存或未命中”条件。 | Z04 |
| **P1.3 GPU 入门** | Ch. 11–13；ML Sys 4 | kernel launch、register/shared memory、HBM/L2、SM、tiling 和融合已按需要出现；ML Sys 4 仅规划跨卡通信。 | §3.1–3.3 集中解释 block/warp/thread、SIMT、分支发散和内存可见性/生命周期；Ch. 13 缺一张直接服务 tiling/fusion 的最小硬件词汇表。 | 课程 §4.3 把 prefill 概括为算力受限；Ch. 12 Steps 1–2 已证明短 prefill 也可受 launch 限制，应加“足够长/大”的条件。 | Z05 |
| **P1.4 KV Cache** | Ch. 2、3、7、8 | 留 K/V 丢 Q、decode 追加、每 token 成本、paging、准入、retract、共享与驱逐已讲。 | §3 的单层单头完整数值例和 §4 的不等长请求求和，把 prefill 总量、decode 新增和最终总量连起来；Ch. 7 缺任意 `T_b/l_b` 的统一显存账。 | 课程部分 MB/GB 实际按二进制换算；教程也有十进制与二进制混用处。新算式须写 bytes、MiB/GiB 或明确十进制。 | Z06 |
| **P1.5 Benchmark 入门** | ML Sys 1、14；关联 Ch. 5、6、20 | ML Sys 1 Steps 1–6 已讲 TTFT、ITL、TPOT、E2E、P50、P99 与构造时间线和排队图，吞吐、Goodput 和单变量对照仍仅规划；Ch. 5/6 有吞吐与 TTFT，Ch. 20 有 p95 和达标比例。 | §3–5 把 TTFT/TPOT/ITL/E2E、Goodput、请求集、warmup、百分位和误区放进一套实验口径；ML Sys 1 缺统一记录表、SLA 和输入输出分布。 | 课程把并发增加与延迟变差写得过于同步；Ch. 5 已展示权重读取主导区间内吞吐升而单请求延迟可不变，应限定为开始排队或资源饱和后。 | Z07 |
| **P2.1 mini-sglang：推理引擎长什么样** | Ch. 9、10 | 请求路径、进程、ZMQ、rid、Req、六阶段循环、CPU/GPU overlap 和文件树已讲。 | §2.2、§3.2–3.3 用“职责→对象→文件→控制/数据路径”组织总图；Ch. 10 文件树还缺这样的源码走读入口。课程教学状态机的 `ABORTED` 提示成功路径之外还有取消，不代表 mini 源码存在同名状态。 | mini 与 SGLang 的对象和进程名不能互换；Ch. 9 的“scheduler 不等待”需限定为理想 GPU 泳道，Ch. 10 已有普通交替与 overlap 条件。 | Z08、Z12b |
| **P2.2 一个请求的旅程（正文＋代码）** | Ch. 9、10 | HTTP→分词→Req→反分词→SSE 和 scheduler 内部路径已讲。 | 正文 §2.4 与代码 §§2–4 把增量解码状态、函数链、uid 分发和取消入口连起来；Ch. 9 尚缺跨 token 字节缓冲和可照做的源码顺序。 | uid/rid 与消息名属于不同实现；mini@`9a91cfa` 的具体行为待核，不能套成当前 SGLang 事实。 | Z08、Z09、Z12b |
| **P2.3 前向与生成（正文＋代码）** | Ch. 1、2、4、10 | 生成、attention、prefill/decode、最后位置与采样已讲，但分散在不同章。 | §§2.2–2.6、§3.2 及代码 §§3–4 串起完整 Block、LM Head、采样方法和 Qwen3 函数链；Ch. 2 收束处缺一张完整 forward 边界表及 top-k/top-p 对照。 | Qwen3 的 QK norm 等结构不能移植成 Llama-3-8B 的必然结构；mini 实现待核。 | Z10 |
| **P2.4 KV Cache 优化（正文＋代码）** | Ch. 2、3、7、8、10 | KV 重算、缓存读写、字节公式、paging、页表、准入和前缀锁定已讲。 | §2.4、§§4.1–4.5 区分 K/V 投影与 attention 的复杂度；代码 §§3–5 串起物理池、空闲槽、`out_loc`、先写后读和尾部回收。Ch. 3 缺复杂度表，Ch. 7 缺物理读写导读。 | mini 的 token slot 与教程页号是不同实现；前缀保留与 Ch. 7 的“关闭 prefix caching”示例不冲突，代码路径待核。 | Z11a、Z11b |
| **P2.5 HTTP 服务与并发（正文＋代码）** | Ch. 5、9、10 | 连续批处理、JSON、rid、SSE 回程和正常结束已讲。 | §§5–7 与代码 §§3–5 讲清请求隔离、非流式/流式、取消、慢客户端和清理；Ch. 9/10 主要只有成功路径，缺交错回复、断连、错误和背压。 | Ch. 9 把 SSE 写成每 token 一条且固定相隔 4.8 ms；这只是教学示例，解码与网络缓冲都能改变事件粒度和到达节奏。mini 的清理缺口不能推定 SGLang 也有。 | Z09、Z12a、Z12b |
| **P2.6 连续批处理与调度（正文＋代码）** | Ch. 5、6、7、10 | 槽位补位、双列表、prefill-first、chunk、交替、mixed、正常结束和 KV 预留已讲。 | §5、§6.2 与代码 §4 并列请求槽、prefill token 预算和 KV 预留，也说明续块仍等待、切 chunk 不自动交替；这些状态与约束在教程中分散。 | Ch. 6 Step 7 写 mixed“完全没有冻结”，Step 8 却显示最长间隔 4.9 ms，高于深入讲解的 4.78 ms 权重读取下限；应区分“没有 prefill-only 停顿”和“decode 间隔完全不变”。 | Z13a、Z13b、Z12b |
| **P2.7 分页 KV Cache 与显存管理** | Ch. 3、7、14 | KV 增长、分页、分配、释放、retract、在线 softmax 和 `kv_indices/kv_indptr` 已讲。 | §3.1–3.2 当场展开逻辑页号、页内偏移和物理地址；Ch. 7 到 Ch. 14 的 kernel 地址翻译之间缺一条回指和算式。 | Ch. 7 Prose 同时写“never fragments”和尾页最多浪费 `p−1` token；准确说法是消除外部碎片、仍有尾页内部碎片，SGLang 默认 `p=1` 时后者为零。 | Z14a、Z14b |
| **P2.8 RadixAttention 与前缀缓存（正文＋代码）** | Ch. 8 | 共享页、radix tree、最长前缀、引用钉住、LRU 和 LPM 调度已讲。 | §4.2 与代码 §4.2–4.4 展开命中保护、复查、只分配后缀、归档、解除引用及竞争重复页回收；主流程缺并发保护和 prefill/decode 归档边界。 | Ch. 8 Step 2 中文“两个主人都结束才释放”易理解为立即物理回池；Step 7 与深入讲解实际是可回收后仍驻留、LRU 再淘汰。 | Z15a、Z15b |
| **P2.9 多进程与张量并行（正文＋代码）** | Ch. 9；Ch. 24 | Ch. 9 有三类进程、GIL、ZMQ 和 TP 进程脚注；Ch. 24 未制作。 | §3 与代码 §§3.2–3.4 区分控制面/GPU 数据面、Column/Row/Vocab 切分、rank0、Gloo 和 NCCL；这些应进入 Ch. 24，而不是扩建 Ch. 9。 | mini 的 rank0＋Gloo＋ZMQ 协议不能直接当成当前 SGLang 实现，精确映射待核。 | Z16 |
| **P2.10 投机解码（正文＋代码）** | Ch. 15 | draft–verify、连续接受、首次拒绝、target 纠正、三类 drafter 和收益已讲；深入讲解已有接受概率与 bonus token。 | §3.3–3.5、代码 §§4–5 把正残差、分布自检、首次拒绝/全接受提交、EOS、长度上限和下一轮 KV 连在一起；教程缺可验算修正分布和完整提交边界。 | 主图是 greedy，采样脚注另列，不算算法冲突；`a+1` 必须带“未触发停止条件”，被拒后缀 KV 不能沿用。 | Z17a、Z17b |
| **P3.1 注意力后端** | Ch. 14 | 中间矩阵、online softmax、四类选择、split-KV、接口和默认后端已讲。 | §2.1 区分机制/kernel/backend；§4.2 分 Plan/Run；§5.1–5.2 给兼容筛选、预热、正确性和服务指标闭环。Ch. 14 缺版本锚点和公平比较清单。 | 课程固定版本写 `cutedsl_mla`，教程写 `cutlass_mla`，版本/名称待核；“每 backend 两个 kernel”若指专属实现也待核，不能直接合并。 | Z18a、Z18b |
| **P3.2 量化与低精度推理** | Ch. 22；ML Sys 9、10 | Ch. 22 未制作；ML Sys 9/10 仅规划 FP8 RL 与 INT4 QAT，通用量化未覆盖。 | §2.2–2.3 把位宽、scale、未量化层和元数据放进真实 checkpoint 账；§4–5 连到精度复测和模型标签→配置核验。Ch. 22 缺自包含算例与评测练习。 | 课程“W4A16 精度最稳”超出其后展示的横向证据；GB/GiB 口径也需统一。通用推理量化与 RL/QAT 范围不同，不能互记覆盖。 | Z19a、Z19b |
| **P3.3 分层缓存** | Ch. 27；关联 Ch. 3、7、8 | Ch. 27 未制作；已有 KV 成本、paging、radix、pin/LRU，Host/L3、恢复和预取未覆盖。 | §3–6 把“索引命中→所在层→数据就绪”、备份/恢复、恢复/重算成本、预取完成度和逐层依赖串成生命周期。Ch. 27 缺可计算的成本例。 | 课程的 256-token 页是教学假设，与教程的 SGLang page-size-1 示例不冲突；实际粒度、`best_effort` 策略和控制流待核。 | Z20 |
| **P3.4 横向扩展** | Ch. 24–26、29；ML Sys 4、5 | 这些章均未制作；已有通用 IPC/SHM/RDMA 不等于 TP/EP/PP、NCCL 或服务 router 已覆盖。 | §2–6 讲 TP 切分上限、DP Attention 后仍需激活通信、EP dispatch/combine、PP 气泡及组合边界；ML Sys 可借“为何多卡仍慢”作通信动机。 | MoE token router≠Ch. 29 服务 router；PP layer stage≠Omni runtime stage。DP Attention 的容量例只在原方案重复保存 KV 时成立。 | Z21a、Z21b |
| **P3.5 Prefill-Decode 分离** | Ch. 28；关联 Ch. 4–6、18 | Ch. 28 未制作；已有两阶段负载、单机调度基线和通用 Mooncake/RDMA，不等于 PD 协议已覆盖。 | §3–5 串起首 token/KV/请求信息交接、有效带宽、双端副本、排队位置和固定资源归因；Ch. 28 缺交接单元、成本式和公平对照。 | chunk 只限制单次工作量，是否插入 decode 取决于调度；不能把 chunking 本身当成干扰已解决。bootstrap、buffer 所有权和失败恢复待核。 | Z22a、Z22b |
| **P4.1 用 Cookbook 部署 SGLang** | ML Sys 5、16 | 仅规划启动 worker、请求路径、复现和记录；recipe 选型、smoke test 与 serving benchmark 未覆盖。 | §2–5 把 recipe 适用条件、启动参数、日志/进程/显存/warmup、成功请求数和小 benchmark 连成服务验证记录；现有规划缺可复用模板。 | 单卡 recipe 不能替代多节点 Dynamo 实验；随机文本和 BF16/FP8 性能对照不能证明输出质量。启动入口代际差异待核。 | Z02、Z23 |
| **P4.2 Profiling 与 Trace 分析** | ML Sys 14 | 仅规划统一时间线、定点 trace 和单变量对照；没有已制作正文。 | §2–3 区分 benchmark/profiler/trace/viewer，并要求同 rank、同阶段、同工作段比较，关闭 profiler 后再测端到端和正确性；规划缺这张对照表。 | profiler 的事件 trace≠Ch. 12/13 Dynamo tracing。小性能差异未给波动，不能写成稳定收益；GPU、commit、原始 trace 等待核。 | Z07、Z24 |
| **P4.3 SGLang PR 工作流** | ML Sys 16 | 仅规划公开工程案例、复现、最小修改、测试、评审和记录。 | §2–4 把 PR scope、问题/变化/验证、受限 GPU CI、失败日志、push 后重验和回归测试变成证据清单；规划缺具体字段和真实案例要求。 | 本地测试与远端 CI 是两层；文档构建不能冒充部署验证。`run-ci` 标签、权限与触发方式待核，课程假设场景不能冒充公开案例。 | Z01、Z25 |

## 使用顺序

1. 做第 1 本或 Learning ML Systems 的任何一步前，先读本表对应课程正文和代码篇，再核固定版本源码；本表不是事实来源的替代品。
2. 先处理会误导现有读者的口径，再补关键机制，最后把未制作章节的条目留在对应规划中。每项仍是一轮一个小单元。
3. 课程测试题可以改成冷读问题；图形、caption、公式示例和代码走读都自行设计，不复制课程句子、段落、图或文件。
