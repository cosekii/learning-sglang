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
