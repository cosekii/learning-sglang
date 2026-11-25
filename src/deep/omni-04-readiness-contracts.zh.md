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
