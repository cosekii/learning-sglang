## 第 1 步 · 两份完整输入到齐才交接

> **一句话：** speech 路线里，只有图的请求 A 等 `image_encoder` 和 `preprocessing` 两份完整结果都到 `thinker`，才把合并后的请求交给 scheduler。

### 图上是什么

- 本例使用 speech 路线，抽出 `image_encoder → thinker` 和 `preprocessing → thinker` 两条交接。请求 A 只有图，所以需要这两个来源；image 的完整结果先到，preprocessing 随后到达。
- **one-shot handoff**：每个来源各自把完整结果一次交给 `thinker`，不是把结果分成一串 chunk。两个来源可以先后到达，「一次」不表示同时到达。
- 三张快照数这个例子已经到达 `thinker` 的完整结果：0/2 和 1/2 时等待；2/2 时合并并交给 scheduler。先到的 image 结果留在 `thinker` 的收件格。
- 蓝框和「到 thinker」表示这个来源的整份结果已经到达，灰虚线和「未到」表示还没到达。`thinker → scheduler` 只表示请求交给 scheduler，不表示 GPU 或 prefill 已开始。
- 0、1、2 是本例构造的到达顺序，不是延迟或吞吐量。分母 2 是读者已知的本例来源数，不是实现里始终存在的数字进度条。

### 公式

设 $E_A$ 是请求 A 应等的来源集合，$P_A$ 是已经收到完整结果的来源集合。能否交接为 $D_A$，已到的份数为 $n_A$：

$$D_A\iff P_A=E_A,\qquad n_A=|P_A|$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $A$ | 本例只有图的请求 | 第 3 章沿用下来的 request id |
| $E_A$ | 本例应等的两个来源 | speech 路线的 image-only 来源规则 |
| $P_A$ | 已经收到完整结果的来源 | `AggregatedInput` 为 A 保存的 `pending` 记录 |
| $D_A$ | 是否把合并后的请求交给 scheduler | 本步定义 |
| $n_A$ | 已到完整结果的份数 | 本例对 $P_A$ 计数 |

### 代入图上的数

本例的 $E_A=\{\mathrm{image\_encoder},\mathrm{preprocessing}\}$。

| 快照 | $P_A$ | $n_A$ | $P_A=E_A$？ | 图上结果 |
|---|---|---:|---|---|
| 1 | $\varnothing$ | 0 | 否 | 等待 |
| 2 | $\{\mathrm{image\_encoder}\}$ | 1 | 否 | 等待 |
| 3 | $\{\mathrm{image\_encoder},\mathrm{preprocessing}\}$ | 2 | 是 | 交给 scheduler |

image 先到时，实现还没有解析出应等来源；preprocessing 到达后，动态规则才把 $E_A$ 定为这两个来源。因此图中的 0/2 和 1/2 是教学展示，不表示源码此时已经存下分母 2。

### 源码怎样等到两份结果

speech 路线的 `thinker` 配置了 `wait_for`、动态 `wait_for_fn` 和 `merge_for_thinker`，stage factory 据此创建 `AggregatedInput`。只有图的请求会解析出 `preprocessing` 和 `image_encoder` 两个来源。

`AggregatedInput.receive()` 按 request id 和来源保存到达结果。来源集合尚未确定或尚未收齐时，它返回 `None`，stage 不会提交请求。已到来源与应等来源完全一致时，它删除等待记录，用 `merge_for_thinker` 合并成 `thinker_inputs`，返回一个 `StagePayload`。

`Stage.receive_payload_from_stage()` 只在收到非空 `StagePayload` 后调用 `execute()`。普通请求随后形成 `new_request` 消息，进入这个 stage 的 scheduler inbox。因此图中的等待是「保存状态、暂不提交」，不是一个请求协程睡着不动；「交出」也不等于 prefill 或 GPU 计算已经开始。

### 边界与出处

本步只讲 speech 路线里两路 one-shot 输入的汇聚和提交，不讲动态来源检查的其他分支、chunk 缓冲、逐步反馈、传输方式、数据释放或 scheduler 后续排队。非 speech 的 `text_stages` 路线把汇聚放在 `mm_aggregate`，不在本图展开。

以下来源位于 `sglang-omni origin/main@91d06c70b00746c0b2b84db12a318240db360f1d`：

- [speech `thinker` 的汇聚配置，以及非 speech 的 `mm_aggregate`：`sglang_omni/models/qwen3_omni/config.py:136-175,257-265`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/models/qwen3_omni/config.py#L136-L175)。
- [stage factory 根据配置创建 `AggregatedInput`：`sglang_omni/pipeline/stage_workers.py:1157-1178`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage_workers.py#L1157-L1178)。
- [image-only 请求解析两个来源，preprocessing 到达时确定集合：`sglang_omni/models/qwen3_omni/request_builders.py:264-275,566-586`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/models/qwen3_omni/request_builders.py#L264-L275)。
- [来源未确定或未到齐时返回 `None`，完全相等后合并：`sglang_omni/pipeline/stage/input.py:44-117`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage/input.py#L44-L117)。
- [`merge_for_thinker` 生成 `thinker_inputs`：`sglang_omni/models/qwen3_omni/merge.py:47-78`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/models/qwen3_omni/merge.py#L47-L78)。
- [非空输入才执行，普通请求进入 scheduler inbox：`sglang_omni/pipeline/stage/runtime.py:872-905,1260-1300`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage/runtime.py#L872-L905)。
- [image-only 的两来源测试及到达顺序：`tests/unit_test/qwen3_omni/test_pipeline.py:982-1020`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/tests/unit_test/qwen3_omni/test_pipeline.py#L982-L1020)。

### 接下来

下一步看 bufferable stream：结果分成 chunk 后，先到的 chunk 存在哪里，是否仍要等全部到齐。

## 第 2 步 · 早到的 chunk 按顺序存下

> **一句话：** 整份结果还没到，`talker_ar` 也能把 `thinker` 的 chunk 按到达顺序存好。

### 图上是什么

- **chunk** 是一小段结果。交接路线是 `thinker → talker_ar`；0、1、2 是本例的 chunk 编号。
- 三张图分别收到 1、2、3 个 chunk。蓝框表示已收到，橙框标出每张新到的 chunk；灰虚线表示整份结果还没到。
- 第 1、2 张的整份结果还未到，第 3 张已到；早到的 chunk 保持到达顺序。
- 这个 stage 允许整份结果还没到就先收流数据。是否允许由 stage 配置决定，不是所有 stage 都通用。
- 本图只画接收和保存，不表示请求已开始构建或计算。

### 公式

设 $C_A$ 是请求 A 已存下的 chunk 序列，$c_i$ 是编号为 $i$ 的 chunk，$n_A$ 是已存数量：

$$C_A=[c_0,c_1,\ldots,c_{n_A-1}],\qquad n_A=|C_A|$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $A$ | 第 3 章一路跟踪的请求 | 第 3 章第 1 步 |
| $C_A$ | A 的 chunk 按到达顺序形成的序列 | scheduler 保存的 chunk 列表 |
| $c_i$ | 图上标为 $i$ 的 chunk | `StreamItem.chunk_id` |
| $n_A$ | 已存 chunk 的数量 | 本步对 $C_A$ 计数 |

### 代入图上的数

| 快照 | $C_A$ | $n_A$ | 整份结果 |
|---|---|---:|---|
| 1 | $[c_0]$ | 1 | 还未到 |
| 2 | $[c_0,c_1]$ | 2 | 还未到 |
| 3 | $[c_0,c_1,c_2]$ | 3 | 已到 |

### chunk 存在哪里

`talker_stage` 配置了 `can_accept_stream_before_payload=True`。chunk 比请求 payload 早到时，`Stage.route_stream_item_or_fail()` 只给允许这样做的 stage 打开 pre-payload 流路径；不允许时会中止这个请求。发送方按每个请求和目标分别递增 chunk 编号。

如果 `OmniScheduler` 还不认识这个请求，`on_stream_chunk()` 会把每个 `StreamItem` 依次追加到 `pending_stream_ingress[request_id].chunks`。整份 `StagePayload` 到达后，scheduler 把这个列表移到 `payload.prefetched_chunks`，不重排。顺序保证属于同一 request/source receive lane；chunk 编号不是跨请求或跨来源的全局排序。这里的「整份结果」是普通的终止 payload，不是把所有 chunk 拼成一个大对象。

存下 chunk 不代表请求已开始构建，也不代表 GPU 已开始计算；能否构建请求另有检查。

### 边界与出处

本步不讲背压、传输、chunk 消费、完成、数据释放和请求构建阈值。3 个 chunk 是教学例子，不是固定的流长度。

以下来源位于 `sglang-omni origin/main@f6827ed1907e392fd67d5f13fa315c016e2056e8`：

- [`thinker` 向 `talker_ar` 发流：`sglang_omni/models/qwen3_omni/config.py:170-185`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/models/qwen3_omni/config.py#L170-L185)。
- [`talker_ar` 允许 pre-payload 流数据：`sglang_omni/models/qwen3_omni/config.py:212-242`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/models/qwen3_omni/config.py#L212-L242)。
- [stage 接收或拒绝早到的 chunk：`sglang_omni/pipeline/stage/runtime.py:1024-1046,1238-1257`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/pipeline/stage/runtime.py#L1024-L1046)。
- [接收任务按 request/source lane 串接：`sglang_omni/pipeline/stage/runtime.py:571-648,700-730`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/pipeline/stage/runtime.py#L571-L648)。
- [chunk 编号按请求和目标递增：`sglang_omni/pipeline/stage/runtime.py:2215-2229`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/pipeline/stage/runtime.py#L2215-L2229)。
- [未知请求按到达顺序积累 chunk：`sglang_omni/scheduling/omni_scheduler.py:3639-3653`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/scheduling/omni_scheduler.py#L3639-L3653)。
- [payload 接过已缓冲的 chunk 列表：`sglang_omni/scheduling/omni_scheduler.py:1565-1582`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/sglang_omni/scheduling/omni_scheduler.py#L1565-L1582)。
- [同进程流式测试保持 chunk 顺序：`tests/unit_test/pipeline/test_stage_streaming.py:1309-1342`](https://github.com/sgl-project/sglang-omni/blob/f6827ed1907e392fd67d5f13fa315c016e2056e8/tests/unit_test/pipeline/test_stage_streaming.py#L1309-L1342)。

### 接下来

下一步看存下多少 chunk 才够构建并启动请求。

## 第 3 步 · 默认五段可提前构建

> **一句话：** 默认配置下，流还没结束时有 5 段可用 chunk 就能开始构建请求；流已经结束则不受这个数量限制。

### 图上是什么

- **build-ready** 表示可以通过构建检查，把 payload 交给请求构建器，由它把已存数据整理成请求；不表示请求已准入，也不表示 GPU 已开始计算。
- **可用 chunk** 是计入构建阈值的已存 chunk。若最后一段是 `im_end` 结束标记，这一段不计入；本例没有末尾结束标记，所以存下几段就有几段可用。
- 前两张的流都未结束：4 段可用时继续等，到默认的 5 段就进入请求构建器。第三张只有 2 段可用，但流已结束，也能通过检查。
- 蓝框表示条件满足，灰虚线表示条件未满足或没有存下。第三张的三个空位不表示仍要等满 5 段，因为「流已结束」已经让检查通过。

### 公式

设 $U_A$ 是请求 A 的可用 chunk 集合，$u_A=|U_A|$ 是可用数量，$d_A$ 表示流是否结束，$p$ 表示是否允许提前构建，$m$ 是配置的提前构建阈值，$B_A$ 表示能否开始构建：

$$B_A\iff d_A\lor\left(p\land u_A\ge m\right)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $A$ | 前两步跟踪的请求 | 第 3 章的请求 A |
| $U_A$ | 可用于构建检查的 chunk | `payload.prefetched_chunks` 去掉末尾 `im_end` 后的列表 |
| $u_A$ | 可用 chunk 数量 | `count_usable_prefetched_chunks()` |
| $d_A$ | 流是否已经结束 | `pending_stream_done` |
| $p$ | 是否允许流未结束就构建 | `enable_partial_start`；本例为真 |
| $m$ | 提前构建所需的最少可用段数 | `partial_start_min_chunks`；默认配置为 5 |
| $B_A$ | 是否通过请求构建检查 | `is_request_build_ready()` 的返回值 |

### 代入图上的数

本例 $p=\mathrm{true}$，$m=5$，且没有末尾 `im_end`，所以 $u_A$ 等于已存段数。

| 快照 | $u_A$ | $d_A$ | $u_A\ge5$？ | $B_A$ | 图上结果 |
|---|---:|---|---|---|---|
| 1 | 4 | 否 | 否 | 否 | 等待 |
| 2 | 5 | 否 | 是 | 是 | 进入请求构建器 |
| 3 | 2 | 是 | 否 | 是 | 进入请求构建器 |

默认配置确实是 $m=5$，但 5 不是不可修改的硬下限。当前实现允许配置的硬下限是 1；本图只展示默认配置，不声称每个部署都等 5 段。

### 源码怎样通过检查

`talker_stage` 默认打开 `enable_partial_start`，并把 `partial_start_min_chunks` 交给 `QwenTalkerScheduler`。speech pipeline 的默认配置把这个值设为 5。调度器拒绝低于 `TALKER_START_MIN_CHUNKS=1` 的配置。

`count_usable_prefetched_chunks()` 通常返回已存列表的长度。只有最后一段的 `metadata.token_id` 等于 `im_end_token_id` 时才减 1；列表中间的相同标记不额外扣除。`is_request_build_ready()` 先看 `pending_stream_done`：已结束就直接通过；未结束且允许提前构建时，再比较可用数量和配置阈值。

未通过时，payload 存入 `deferred_request_payloads`。后续每个 chunk 或流结束事件会把它标为待复查。通过后，普通请求会同步或异步进入 `run_request_builder()`；构建结果之后还要经过准入和调度。因此图中的箭头只到请求构建器。极短且没有可发声 token 的完成回复可走 `complete_without_generation()`，本例的可用段都是普通内容，不走这条无音频分支。

### 边界与出处

本步只讲 Qwen3-Omni speech 默认配置下的请求构建检查，不讲背压、构建细节、准入、batch、GPU 开始时间、decode 的逐步输入或数据释放。5 是默认值，不是所有 stage 的通用规则。

以下来源位于 `sglang-omni origin/main@6d8ed2dcf70da1b021bb14b62239a3add428636c`：

- [默认阈值为 5，配置硬下限为 1：`sglang_omni/models/qwen3_omni/config.py:33-35,445-451`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/config.py#L33-L35)。
- [`talker_stage` 打开提前构建并传入阈值：`sglang_omni/models/qwen3_omni/config.py:225-242`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/config.py#L225-L242)。
- [可用段计数、流结束优先及阈值检查：`sglang_omni/models/qwen3_omni/talker_scheduler.py:62-112`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_scheduler.py#L62-L112)。
- [极短完成回复可不走生成：`sglang_omni/models/qwen3_omni/talker_scheduler.py:114-128`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_scheduler.py#L114-L128)。
- [未就绪则暂存，就绪后进入请求构建器：`sglang_omni/scheduling/omni_scheduler.py:1565-1652`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/scheduling/omni_scheduler.py#L1565-L1652)。
- [后续 chunk 和流结束会触发复查：`sglang_omni/scheduling/omni_scheduler.py:3639-3679`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/scheduling/omni_scheduler.py#L3639-L3679)。
- [关闭提前构建、低于阈值和达到阈值的测试：`tests/unit_test/qwen3_omni/test_talker.py:981-1007`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/tests/unit_test/qwen3_omni/test_talker.py#L981-L1007)。
- [末尾结束标记的计数测试：`tests/unit_test/qwen3_omni/test_talker.py:1023-1050`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/tests/unit_test/qwen3_omni/test_talker.py#L1023-L1050)。

### 接下来

请求可以构建后，每一步 decode 还要等自己的输入。下一步看为什么当前一步的 feedback 没到，下一步就不能算。

## 第 4 步 · 当前步的反馈是下一步的输入

> **一句话：** 当前 talker 步留下的 feedback 是下一步输入的一部分；文字流未结束时，feedback 和下一段 thinker 文字都到齐，这个请求的下一步 decode 才能运行。

### 图上是什么

- **feedback** 是当前步为同一个请求的下一步准备的输入。code predictor 在当前 `talker_ar` 步内算出声音 codes，同时给出反馈向量；反馈向量进入 `pending_feedback_queue`。它不是发给 `code2wav` 的 code 编号，也不是整条请求已经完成的信号。
- 顶行只标两份输入从哪里来：feedback 来自当前 talker 步，下一段文字来自 thinker 流。三张快照都跟踪请求 A，且文字流未结束。
- 第 1 张缺 feedback，第 2 张缺下一段文字，下一步都等待；第 3 张两份都到，合成下一步输入。
- 蓝框表示这份输入已到，灰虚线表示还没到。「下一步」是这个请求的下一行 decode，不表示其他请求的 decode 也必须一起停住。
- 文字流结束后，若没有下一段文字，实现可用固定的 `tts_pad_embed` 代替文字，但仍必须有 feedback。本图只画流未结束的情况。

### 公式

对请求 A 的第 $k+1$ 个 decode 输入，设 $F_k$ 是当前步留下的 feedback，$T_{k+1}$ 是下一段 thinker 文字，$d$ 表示文字流是否结束，$P$ 是结束后的 pad 输入，$R_{k+1}$ 表示下一步是否就绪：

$$R_{k+1}\iff \exists F_k\land\left(\exists T_{k+1}\lor\left(d\land \exists P\right)\right)$$

就绪时，下一步输入 $X_{k+1}$ 是两份向量相加，而不是拼接：

$$X_{k+1}=F_k+\begin{cases}T_{k+1},&\exists T_{k+1}\\P,&d\land \exists P\end{cases}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $A$ | 本步跟踪的同一个请求 | 第 3 章的请求 A |
| $k$ | 当前 talker 步的编号 | 本步用来区分相邻两步 |
| $F_k$ | 当前步留给下一步的反馈向量 | `pending_feedback_queue` 的队首 |
| $T_{k+1}$ | 下一段 thinker 文字向量 | `pending_text_queue` 的队首 |
| $d$ | thinker 文字流是否结束 | `thinker_chunks_done` |
| $P$ | 文字流结束后代替文字的固定输入 | `tts_pad_embed` |
| $R_{k+1}$ | 请求的下一步 decode 是否可运行 | `data_has_next_decode_input()` |
| $X_{k+1}$ | 下一步实际使用的输入向量 | `take_next_decode_input_embed()` |

### 代入图上的数

本例 $d=\mathrm{false}$，所以公式化简为 $R_{k+1}\iff \exists F_k\land \exists T_{k+1}$。

| 快照 | $F_k$ | $T_{k+1}$ | $R_{k+1}$ | 图上结果 |
|---|---|---|---|---|
| 1 | 未到 | 已到 | 否 | 下一步等待 |
| 2 | 已到 | 未到 | 否 | 下一步等待 |
| 3 | 已到 | 已到 | 是 | 相加后进入下一步 |

### 源码怎样产生并消费 feedback

decode 时，talker 模型在自己的 forward 里调用 `code_predictor_forward()`；prefill 后也由 runner 调用同一预测路径。code predictor 返回结果 codes 与 summed embeddings。runner 克隆本 batch 的 codes 和 embeds，把 code chunk 发往 `code2wav`，并把每个请求对应的 `feedback_row` 追加到自己的 `pending_feedback_queue`。因此 codes 与 feedback 是同一次预测的两种输出，不是两次 stage 交接。codes 发往 `code2wav`，不进入下一 talker 步，所以主图省略 codes。

thinker 的文字 chunk 进入 `pending_text_queue`。每次准备 decode 时，`peek_next_decode_inputs()` 先看 feedback 队首；没有 feedback 就返回空。有 feedback 但没有文字时，若文字流尚未结束也返回空；只有文字流已结束且有 `tts_pad_embed`，才用 pad 补上。`combine_feedback_with_next_text()` 将两份向量相加，取用时才弹出两队队首。

`ready_decode_rows()` 用同一检查挑出就绪行。未就绪请求会被排除在本次 decode 外并保留 KV，不就绪不等于请求失败，也不要求整个 batch 的其他请求一起等待。speech 配置默认打开 `feedback_enabled`，并在启用反馈时关闭 SGLang overlap schedule；这些调度细节不改变图里的数据依赖。

### 边界与出处

本步只讲 Qwen3-Omni 默认 speech 路径里单个请求的逐步输入就绪，不讲 code predictor 内部 15 次选择、codec 如何转声音、batch 排除行的完整实现、完成、传输和内存释放。feedback 是 summed embeddings，不把它简化成 code id 或文本。第 1 本第 17 章第 5 步已经解释 code predictor 为何放在 talker 内，本步只复用这一结论。

以下来源位于 `sglang-omni origin/main@6d8ed2dcf70da1b021bb14b62239a3add428636c`：

- [decode forward 内调用 code predictor：`sglang_omni/models/qwen3_omni/components/talker.py:1362-1383`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/components/talker.py#L1362-L1383)。
- [code predictor 输出 codes 与 summed embeddings：`sglang_omni/models/qwen3_omni/components/talker.py:1677-1719,1968-1979`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/components/talker.py#L1677-L1719)。
- [prefill 和 decode 后产生反馈：`sglang_omni/models/qwen3_omni/talker_model_runner.py:117-171`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_model_runner.py#L117-L171)。
- [codes 发往 code2wav，反馈进入逐请求队列：`sglang_omni/models/qwen3_omni/talker_model_runner.py:173-229`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_model_runner.py#L173-L229)。
- [就绪检查需要 feedback，以及文字或结束后的 pad：`sglang_omni/models/qwen3_omni/talker_model_runner.py:558-588,656-726`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_model_runner.py#L558-L588)。
- [未就绪行被排除，其他行可继续：`sglang_omni/models/qwen3_omni/talker_scheduler.py:142-183,329-339`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_scheduler.py#L142-L183)。
- [默认启用 feedback：`sglang_omni/models/qwen3_omni/config.py:454-464`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/config.py#L454-L464)。
- [启用 feedback 时关闭 overlap schedule：`sglang_omni/models/qwen3_omni/talker_scheduler.py:35-52`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/sglang_omni/models/qwen3_omni/talker_scheduler.py#L35-L52)。
- [文字、pad、缺文字和三种就绪状态测试：`tests/unit_test/qwen3_omni/test_talker.py:144-168,203-249`](https://github.com/sgl-project/sglang-omni/blob/6d8ed2dcf70da1b021bb14b62239a3add428636c/tests/unit_test/qwen3_omni/test_talker.py#L144-L168)。

### 接下来

现在已经知道请求何时能构建、下一步何时能算。下一章沿着这些数据看 DataRef：数据实际放在哪里，另一个进程或设备怎样读取，又何时释放。
