## 第 1 步 · 交付不等于听过

> **一句话：** 服务器交付的回答声音，比客户端实际播放的多 800 ms。

### 图上是什么

- 构造的一段回答共生成了 2.5 秒声音。
- 三条蓝柱用同一比例表示这段回答的三个位置。
- `D = 2.0 s` 是已经交给客户端连接的声音长度。
- `H = 1.2 s` 是客户端后来报告已经播放的位置。
- 红框圈出已交付但还没播放的部分。

### 公式

$$
U = D - H
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $U$ | 已交付但还没播放的声音 | 800 ms | 本步 |
| $D$ | 已交给客户端连接的声音 | 2,000 ms | 构造算例 |
| $H$ | 客户端报告已播放的声音 | 1,200 ms | 构造算例 |

### 代入图上的数

$$
2{,}000 - 1{,}200 = 800\ \text{ms}
$$

默认最多提前交付 1,000 ms，所以这段 800 ms 构造间隔符合默认范围。它不是一次实测。交付只表示服务器连接取走了声音，不能证明扬声器已经播放。

### 接下来

下一步画出三种设计的地图，看它们在同一组位置上怎样修改对话记录。

出处：`sglang_omni/pipeline/session_delivery.py:112-128`；`sglang_omni/proto/session.py:19-28`。

## 第 2 步 · 三种策略

> **一句话：** turn-based Qwen、streaming cascade 和 native MiniCPM-o 是处理同一次打断的三种替代系统。

### 图上是什么

- turn-based Qwen3-Omni 用 VAD 找到说话轮次边界。回答时一开口就能打断；800 ms 静音规则用来结束前一段用户说话，不会让打断多等 800 ms。
- streaming cascade 把三个服务接起来：ASR 把声音变成文字，LLM 写回答文字，TTS 把回答文字变成声音。
- native MiniCPM-o 4.5 每次读取一秒声音，由同一个模型选择听或说。
- 橙色卡片给三种设计同一句纠正：「不对，我说的是伦敦。」

### 每种设计保管什么

| 设计 | 对话状态 |
|---|---|
| Qwen3-Omni | Session 输入状态、thinker 对话记录和回答交付位置 |
| Streaming cascade | ASR 状态、对话消息、当前 LLM 回答和 TTS 进度 |
| MiniCPM-o | 同一个 native session 的听／说单元、模型记录和已交付单元 |

这是一张机制地图，不是速度排名。三种系统的模型和实现都不同。

### 接下来

三种设计修改对话记录以前，Session graph 先删掉尚未进入交付记录的旧回答工作。

出处：`docs/developer_reference/full_duplex_guide.md:391-397,1582-1591,1622-1645`；Learning SGLang 第 21 章第 1–2 步。

## 第 3 步 · 删除边界

> **一句话：** Session graph 删掉仍由它保管的旧工作，挡住迟到的旧输出，并报告交付位置。

### 图上是什么

- 蓝框是被打断回答在不同位置的副本。
- 目标 inbox 和未送出的 append 中，匹配的旧 chunk 会被删除。带 preempt 的 interrupt 还会中止已提交的 append。
- 仍在 pacer 或未读客户端队列里的输出会被删除。这个回答之后迟到的 chunk 不能进入后续输出。
- 橙色的客户端纠正会保留。打断回答不会关闭 session，也不会删除新输入。
- `reply.delivered` 报告 `D = 2.0 s`。D 与 H 之间的 800 ms 已经在图的队列之外。

### 这条边界不代表什么

边界不是全局撤销。它不能抹掉连接已经取走的声音，也不能抹掉听者已经播放的声音。它还不能证明所有 owner 在同一时刻停下。第 3 章第 3 步已经区分了取消发布和 stage 确认。

图会保留被打断的回答 ID，防止迟到的工具输出混入新回答。这与接下来三步各自的对话记录修复是两件事。

### 接下来

Qwen 把交付位置和客户端播放位置换算成回答 token 记录里的切点。

出处：`sglang_omni/pipeline/session_graph.py:108-232,581-619`；`sglang_omni/pipeline/sessions.py:167-210`；`sglang_omni/pipeline/session_delivery.py:92-128`。

## 第 4 步 · Qwen 裁切回答行

> **一句话：** 客户端报告播放到 1.2 秒时，Qwen 保留 18 行回答。

### 图上是什么

- 一行是 thinker 记录里保存的一个 token 位置。
- 生成的回答有 34 行：三行文字和 31 行完整的 80 ms 声音。2.5 秒算例得到 `3 + floor(2,500 ÷ 80) = 34`；这些声音行覆盖 `31 × 80 = 2,480 ms`，其余 20 ms 不足一行。
- D 允许保留 28 行，H 把切点往前挪到 18 行。
- 蓝格是留在 thinker 记录里的行，灰格会被删除。
- 切点数的是 token 位置，不是词数，也不是逐词的声音边界。

### 公式

$$
C = P + \left\lfloor\frac{\min(D,H)}{F}\right\rfloor
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $C$ | 切点后保留的回答行数 | 18 | 本步 |
| $C_D$ | 交付位置 D 允许的回答行数 | 28 | 本步 |
| $C_H$ | 播放位置 H 报告后保留的回答行数 | 18 | 本步 |
| $P$ | talker prefill 读取的文字行数 | 3 | Qwen `PREFILL_TEXT_ROWS` |
| $D$ | 已交付声音的位置 | 2,000 ms | 第 1 步 |
| $H$ | 客户端报告的播放位置 | 1,200 ms | 第 1 步 |
| $F$ | 一个 codec 帧的时长 | 80 ms | Qwen `CODEC_FRAME_MS` |

### 代入图上的数

$$
C_D = 3 + \left\lfloor 2{,}000 \div 80 \right\rfloor = 28
$$

$$
C_H = 3 + \left\lfloor 1{,}200 \div 80 \right\rfloor = 18
$$

正常 graph 会把 `reply.delivered` 转成 `qwen.truncate`。客户端之后发来的 truncate 只能把切点继续往前挪。如果 D 是零，Qwen 不保留没听过的回答，而把原来的说话内容带入下一单元重新提问。

### 接下来

streaming cascade 保存文字消息，不保存 Qwen 的 codec 行记录，因此需要一套文字与声音的对齐规则。

出处：`sglang_omni/models/qwen3_omni/thinker_session.py:38-42,87-89,167-223`；`sglang_omni/models/qwen3_omni/session_input.py:184-205,253-260`；`tests/unit_test/qwen3_omni/test_session_input.py:87-138`。

## 第 5 步 · cascade 对齐句子

> **一句话：** 默认句子对齐在 1.2 秒切点只保留第 1 句。

### 图上是什么

- 同样三句构造回答分别在 1.0、2.0、2.5 秒结束。
- 客户端 H 到达以前，D 保留第 1、2 句。
- 客户端 H 到达以后，较小的 1.2 秒切点只保留第 1 句。
- 蓝色句子卡留在 dialog 记录里，灰色句子卡被删除。

### 公式

$$
E = \max\{e_i \mid e_i \leq \min(D,H)\}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $E$ | 最后保留句的声音结束位置 | 1,000 ms | 本步 |
| $i$ | 句子编号 | 1、2、3 | 构造句子列表 |
| $e_i$ | 第 $i$ 句的声音结束位置 | 1,000；2,000；2,500 ms | 构造进度点 |
| $D$ | 已交付位置 | 2,000 ms | 第 1 步 |
| $H$ | 客户端播放位置 | 1,200 ms | 第 1 步 |

### 代入图上的数

- D = 2,000 ms 时，1,000 和 2,000 ms 都符合，所以 dialog 保留两句。
- min(D,H) = 1,200 ms 时，只有 1,000 ms 符合，所以 dialog 保留第 1 句。
- 听者已经听到第 2 句的 `1,200 − 1,000 = 200 ms`，但句子模式不能保留这句的一部分，因此保留前缀会标成不确定。

默认是 `method: sentence`。`forced` 为完整句子增加词结束位置。`asr`，或配置 `heard_asr_url` 的 `forced`，可以转写被打断句子的声音前缀，再保留严格匹配的文字前缀。ASR 失败、超时或开头不匹配不会给被打断的句子增加更细前缀。forced 对齐仍保留句子结束位置和已经报告的词结束位置。这些变体不进入本步对照图。

### 接下来

native MiniCPM-o 不裁切文字句子或 80 ms 行。客户端 truncate 保留完整的一秒单元。

出处：`sglang_omni/models/streaming_cascade/dialog.py:66-78,857-917`；`sglang_omni/models/streaming_cascade/alignment.py:98-138,219-229,389-522`；`tests/unit_test/models/test_streaming_cascade.py:320-348`。

## 第 6 步 · MiniCPM-o 保留完整单元

> **一句话：** 客户端在 1.2 秒裁切时，MiniCPM-o 的修复记录只保留 unit 0。

### 图上是什么

- D = 2.0 秒，所以 `response.cancel` 先保留已交付的 unit 0 和 unit 1。
- 客户端在 H = 1.2 秒 truncate，把切点往前挪到 unit 0。
- unit 2 已生成但未交付，因此会被删除。
- 听者已经听到 unit 1 里的 200 ms，但整单元裁切无法保留这一小段。

### 公式

$$
K = \left\lfloor\frac{\min(D,H)}{V}\right\rfloor - 1
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $K$ | 最后保留单元的零基编号 | 0 | 本步 |
| $K_D$ | 交付位置 D 下最后保留单元的零基编号 | 1 | 本步 |
| $K_H$ | 播放位置 H 报告后最后保留单元的零基编号 | 0 | 本步 |
| $D$ | 已交付位置 | 2,000 ms | 第 1 步 |
| $H$ | 客户端播放位置 | 1,200 ms | 第 1 步 |
| $V$ | native 声音单元时长 | 1,000 ms | 第 21 章第 2 步 |

### 代入图上的数

$$
K_D = \left\lfloor 2{,}000 \div 1{,}000 \right\rfloor - 1 = 1
$$

$$
K_H = \left\lfloor 1{,}200 \div 1{,}000 \right\rfloor - 1 = 0
$$

unit 1 里被听过的片段是 `1,200 − 1,000 = 200 ms`。output converter 记录每个已交付单元的回答声音结束位置。`played_through_unit` 选择最后一个在 H 前已经全部结束的已交付单元。位于单元内部的位置会向下取整。thinker 删除边界后的 spoken units，恢复较早的生成记录，并把后续输入作为强制 listening 单元补回。它还会保持 listening，直到用户声音到达，避免静音让已取消回答继续。

### 接下来

下一步区分服务器的 Unit profiler 时钟、客户端播放和打断测量。

出处：`sglang_omni/models/minicpm_o/session_adapters.py:118-179,219-236,469-516,553-640`。

## 第 7 步 · profiler 的服务器时钟

> **一句话：** profiler 报告到首个输出共 200 ms，它不说明客户端播放或旧声音停止的情况。

### 图上是什么

- profiler 是记录这些服务器耗时的工具。
- 一个 Unit 是一个 append 经过各个 Session stage 时完成的工作。
- 就绪表示需要的输入到齐，接纳表示 coordinator 接受这个 append。
- 蓝色间隔是就绪到接纳的 150 ms，橙色间隔是接纳到首个输出的 50 ms。
- 首个输出进入 coordinator 输出缓冲。它可能是文字，所以不一定是声音。

### 公式

$$
T = A + B
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $T$ | 就绪到首个输出的时长 | 200 ms | 本步 |
| $A$ | 就绪到接纳的时长 | 150 ms | profiler 固定测试 |
| $B$ | 接纳到首个输出的时长 | 50 ms | profiler 固定测试 |
| $start\_timestamp\_ns$ | 间隔开始的时间戳，单位纳秒 | 随事件而定 | profiler 事件 |
| $end\_timestamp\_ns$ | 间隔结束的时间戳，单位纳秒 | 随事件而定 | profiler 事件 |

### 代入图上的数

$$
150 + 50 = 200\ \text{ms}
$$

实现用 `(end_timestamp_ns − start_timestamp_ns) ÷ 1,000,000` 得到每段时长。它先在同一个 Unit 内计算 A 和 B，再跨 Unit 汇总。缺少端点会得到 null，不会当成零时长。

### 测量边界

这个时钟解释服务器接纳和输出生成。它没有客户端第一段可听声音的端点，也没有旧声音最后一个采样点的端点。stage service time 也包含观察到的执行边界，不是纯 GPU 计算时间。

### 接下来

听者侧评测根据录下的语音，测量旧回答何时停止和新回答何时开始。

出处：`sglang_omni/profiler/duplex_metrics.py:150-157,282-337`；`docs/developer_reference/profiler.md:144-196`；`tests/unit_test/profiler/test_duplex_metrics.py:318-344`。

## 第 8 步 · 两个听者侧时钟

> **一句话：** 构造录音给出 1.3 秒的旧回答停止等待和 1.1 秒的新回答回应等待。

### 图上是什么

- S = 3.0 秒，用户开始纠正；R = 4.0 秒，用户说完。
- L = 4.3 秒，覆盖 S 的旧模型语音段结束。
- N = 5.1 秒，不早于 R 的新回答首个 ASR 词出现。
- 三张小卡回顾同一个历史切点：Qwen 留 18 行，cascade 留第 1 句，MiniCPM-o 留 unit 0。

### 公式

$$
T_{stop} = L - S,\qquad T_{response} = N - R
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $T_{stop}$ | 旧回答停止等待 | 1.3 秒 | 本步 |
| $T_{response}$ | 新回答回应等待 | 1.1 秒 | 本步 |
| $L$ | 覆盖 S 的旧模型语音结束时刻 | 4.3 秒 | 构造录音 |
| $S$ | 打断开始时刻 | 3.0 秒 | 构造录音 |
| $N$ | 不早于 R 的首个 ASR 词开始时刻 | 5.1 秒 | 构造录音 |
| $R$ | 打断结束时刻 | 4.0 秒 | 构造录音 |

### 代入图上的数

$$
T_{stop} = 4.3 - 3.0 = 1.3\ \text{秒}
$$

$$
T_{response} = 5.1 - 4.0 = 1.1\ \text{秒}
$$

这些是 FDB v1.0 的定义。N 是不早于 R 的 ASR 词开始时刻，不一定是声音到达时刻。如果 S 时没有模型语音，打断记为 `not_exercised`，不算成功停答。如果 S 和 R 都被语音覆盖，结果是 `speaking_at_end`，没有回应延迟。对于已实际触发打断的样本，没有回应和没观察到停止的记录在分位数汇总中记为无穷大，不会从分母里删掉。`not_exercised` 和不符合条件的样本不进入这些延迟分母。

### 接下来

第 13 章选择 Qwen3-Omni 部署。检查配置、显存预算和并发时，要分别写清服务器时钟与听者时钟，不能合并成一个数。

出处：`benchmarks/duplex/unified_v10.py:165-174,193-225,423-442,473-507`。
