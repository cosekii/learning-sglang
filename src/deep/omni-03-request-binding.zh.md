## 第 1 步 · 请求记住选中的副本

> **一句话：** 两个 `talker_ar` 副本从第 0 份开始轮流接收 A、B、C，所以分别选中第 0、1、0 份；A 的计算记录留在第 0 份，下次照绑定才能找到它。

### 图上是什么

- 上一章第 1 步已经把 `talker_ar` 复制成两份。本步只画这一个多副本进程，避免把多个进程各自的计数混在一起。
- 图中箭头表示请求去了哪一份。A、B、C 是三个请求的名字，按这个顺序进入。**协调器负责给每个到来的请求分副本**。它从第 0 份开始，让第 0、1 份轮流接收，所以 A 去第 0 份，B 去第 1 份，C 又去第 0 份。
- **binding（绑定）**：这是请求记住的副本选择。图里的 `A → talker_ar: 0` 表示请求 A 对应 `talker_ar` 的第 0 份；编号从 0 开始。
- 最下面用同一布局对照两种去向。A 算到一半的记录留在第 0 份：照绑定去第 0 份能找到记录；假如改去第 1 份，那里没有 A 的记录。本步不展开具体报错或恢复方式。

### 公式

设请求按 A、B、C 到达，分别取到达序号 $i=0,1,2$。副本数 $N=2$，选中的副本编号为：

$$r_i=i\bmod N$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $i$ | 从 0 开始的到达序号 | 本步构造的 A、B、C 顺序 |
| $N$ | 这个进程的副本数 | 本步构造的 2 份 |
| $r_i$ | 请求绑定的副本编号 | 默认 round-robin 策略的余数 |

### 代入图上的数

$$r_0=0\bmod2=0,\qquad r_1=1\bmod2=1,\qquad r_2=2\bmod2=0$$

所以三个请求的 `talker_ar` 绑定依次是 0、1、0。这些数字来自教学构造和源码规则，不是流量实测。

### 源码怎样保存并使用

协调器在请求进入时调用 `assign_replica_bindings`。默认策略为每个多副本进程各留一个计数器，从 0 开始，每次加 1，再对副本数取余。一个进程含有多个 stage 时，同一次选择会写到这些 stage 上；不同多副本进程分别选择，不能把它们想成一个全局大副本组。

每份副本各自保存请求状态，例如 KV cache 和 sampler state；另一份副本不会自动持有同一份记录。本图把这些算到一半的记录简写为「A 的记录」，用来解释为什么后续交接要沿用旧副本。

协调器把 `{stage名: 副本编号}` 放进 `SubmitMessage`。stage 收到后按 request id 保存这份字典；以后解析目标实例和发送交接时读取同一字典，并把它继续交给下游。因此“固定”指运行时用请求已经携带的绑定，不是每次交接重新轮流。

### 边界与出处

本步只讲单个多副本进程的绑定与复用，不讲完成、取消、释放、并发到达的实际排序或负载均衡效果。并发程序里“轮流”按进入选择代码的先后计数，不等于按请求名字母排序。

以下来源位于 `sglang-omni origin/main@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`：

- [绑定覆盖请求生命周期、默认按进程轮流及每份副本各自保存请求状态：`docs/basic_usage/process_topology.md:55-66,144-151`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/docs/basic_usage/process_topology.md#L55-L66)。
- [默认使用 round-robin：`sglang_omni/pipeline/coordinator.py:131-143,193`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L131-L143)。
- [进入时分配并随提交消息发送：`sglang_omni/pipeline/coordinator.py:560-674`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L560-L674)。
- [按进程计数、取余并写到成员 stage：`sglang_omni/pipeline/replicas.py:304-356`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/replicas.py#L304-L356)。
- [stage 按 request id 保存绑定并解析目标：`sglang_omni/pipeline/stage/runtime.py:232-271`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage/runtime.py#L232-L271)。
- [后续交接继续使用并传递同一绑定：`sglang_omni/pipeline/stage/runtime.py:2027-2088`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage/runtime.py#L2027-L2088)。

### 接下来

下一步先看正常完成：结果已经出来以后，名字 A 为什么还不能马上给新请求用。主动取消放在再下一步。

## 第 2 步 · 正常完成后，请求名字何时可复用

> **一句话：** A 做完只删掉工作记录；调用方取走结果并清掉剩下的登记后，名字 A 才能给新请求用。

### 图上是什么

- **request id** 是请求的名字，本例用 A。图只画协调器以这个名字保存的登记，不画副本里的 KV cache 或显存。
- 「工作记录」对应 `requests[A]`；「等结果记录」对应 `completion_futures[A]`。蓝色边框表示记录还在，灰色虚线和 — 表示记录已清空。
- 第 1 格正在算：两张记录都在，名字 A 被占用。第 2 格结果已出：工作记录删掉，等结果记录还在，所以名字 A 仍被占用。第 3 格结果取走：两张记录都清空，新请求才能使用名字 A。
- 本例走非流式 `submit()`；`stream_queues` 和 `abort_tasks` 始终为空。本步不画主动取消、多个终端或 GPU 内存清理。

### 公式

协调器用四张表判断 request id 是否仍被占用：

$$
\operatorname{occupied}(A) \iff A \in R \lor A \in F \lor A \in Q \lor A \in T
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $A$ | 本例的 request id | 第 1 步的请求 A |
| $R$ | `requests`，仍在跟踪的工作记录 | 协调器 |
| $F$ | `completion_futures`，等待结果的记录 | 协调器 |
| $Q$ | `stream_queues`，流式结果的队列 | 协调器；本例为空 |
| $T$ | `abort_tasks`，仍在执行的取消任务 | 协调器；本例为空 |

### 代入图上的数

| 图上的状态 | $R$ | $F$ | $Q$ | $T$ | 名字 A 被占用？ |
|---|---|---|---|---|---|
| 正在算 | $\{A\}$ | $\{A\}$ | $\varnothing$ | $\varnothing$ | 是 |
| 结果已出 | $\varnothing$ | $\{A\}$ | $\varnothing$ | $\varnothing$ | 是 |
| 结果取走 | $\varnothing$ | $\varnothing$ | $\varnothing$ | $\varnothing$ | 否 |

结果已出时，删除 `requests[A]` 已经释放这个请求的准入槽；但 `completion_futures[A]` 还在，所以同名新请求仍不能进入。准入槽和 request id 可复用是两件事。

### 源码里的删除顺序

终端 stage 发出 `CompleteMessage`。协调器的 `handle_completion` 先把结果交给 future，再删除 `requests[request_id]`。因此图的第 2 格表示完成处理已经结束，而不是结果刚算出来的一瞬间。

非流式 `submit()` 的调用方取到结果后，在 `finally` 里运行 `release_submission`，删除 future、流式队列和积压记录。正常完成时，`requests[request_id]` 已经不存在，收尾里的 `abort()` 会直接返回，不会向 stage 广播取消。

### 边界与出处

本步只说明正常非流式请求何时能复用 request id，不声称结果一出就释放全部资源，也不说明副本内部或网络传输已经清理。

以下来源位于 `sglang-omni origin/main@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`：

- [四张表共同决定 request id 是否被占用：`sglang_omni/pipeline/coordinator.py:733-740`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L733-L740)。
- [正常完成先交付结果，再删除工作记录：`sglang_omni/pipeline/coordinator.py:984-1001`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L984-L1001)。
- [`submit()` 取到结果后在 `finally` 收尾：`sglang_omni/pipeline/coordinator.py:485-495`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L485-L495)。
- [剩余登记的删除，以及正常完成时取消直接返回：`sglang_omni/pipeline/coordinator.py:703-727,776-778`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L703-L727)。
- [准入计数只看 `requests`：`sglang_omni/pipeline/coordinator.py:589-593`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/coordinator.py#L589-L593)。

### 接下来

下一步看 A 没做完就被取消时，协调器会多发什么消息，哪些记录仍需等收尾。

## 第 3 步 · 取消后，同名请求不能直接进入

> **一句话：** 取消会清掉 A 的工作记录，但每个 stage 都留下 A 的取消标记；同名 A 再来会被拒绝，要换新的 request id。

### 图上是什么

- **abort（主动取消）**：请求还没正常做完就让它停止。**取消标记**是 stage 记下的「这个 request id 已取消」，对应源码里的 `aborted` 集合。
- 第 1 格接着前两步：协调器有 A 的工作记录 `requests[A]`，A 的副本记录在第 0 份；两个副本都还没有 A 的取消标记。
- 第 2 格是两份都处理完广播消息后的快照，不是只处理绑定的第 0 份。工作记录清掉，两份都记下 A 已取消。这不表示 stage 回了确认，也不表示协调器等待确认。
- 第 3 格再用名字 A，stage 查到取消标记并拒绝。D 是没有用过的新 request id，能通过这项名字检查；图中不表示 D 已开始运行。同名请求可能轮到任一份，所以两份都拒绝旧名字，旧活晚到也不会算给新 A。
- 蓝框表示对应记录还在，灰色虚线和 — 表示没有这条记录。图中只画工作记录和取消标记，不画临时取消任务、流式队列或显存清理。

### 公式

单个 stage 收到提交时，先用取消标记做这项检查：

$$\mathrm{reject}(id)\iff id\in\mathrm{aborted}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $id$ | 待检查的 request id | 本步的 A 或 D |
| $\mathrm{aborted}$ | 这个 stage 保存的已取消 request id 集合 | stage runtime |
| $\mathrm{reject}(id)$ | 是否因取消标记拒绝这个 id | 本步定义 |

### 代入图上的数

取消后，$A\in\mathrm{aborted}$，所以 $\mathrm{reject}(A)$ 成立。$D\notin\mathrm{aborted}$，所以 D 不会被这项检查拒绝；本例的其他准入检查也通过。

### 源码里的广播与清理

`AbortMessage` 只带 `request_id`，不带第 1 步的副本绑定。协调器通过 PUB/SUB 把它广播给所有 stage，因此两个副本都会收到。等待消息发布不等于等待每个 stage 回复「已经停完」。

协调器随后把请求标成 `ABORTED`，让等待结果的 future 收到取消错误，并删除 `requests[A]` 和部分结果。等待结果的调用方收尾时，会删除 `completion_futures[A]` 这张等结果记录。取消运行期间，`abort_tasks[A]` 仍会暂时占住这个名字；任务结束后才删除。本图没有画这项短暂状态，因为后面的 stage 取消标记仍会拒绝 A。

每个 stage 收到消息后，把 A 加入 `aborted`，清理请求状态和副本绑定，再调用 scheduler 的取消逻辑。之后同名 A 提交时，`on_submit` 会返回「use a fresh request ID」。这就是第 3 格的拒绝。

### 边界与出处

取消标记不是永久记录：集合超过 10,000 个 id 时会裁剪到 5,000 个。这两个阈值是实现里选定的常数，不是从本例数字算出来的。裁剪按集合迭代顺序删除，不按 id 新旧选择。如果 A 的标记被删掉，这项检查就不再拒绝 A，靠标记防止新旧混淆的保护也随之结束。主图只讲标记还在时的行为。TP 拆分的工作可能仍跑完本次集合通信；显存和传输数据的释放也不在图中展开。

以下来源位于 `sglang-omni origin/main@91d06c70b00746c0b2b84db12a318240db360f1d`：

- [取消消息只带 request id：`sglang_omni/proto/messages.py:300-311`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/proto/messages.py#L300-L311)。
- [协调器通过 PUB/SUB 广播取消：`sglang_omni/pipeline/control_plane.py:425-491`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/control_plane.py#L425-L491)。
- [取消任务、协调器清理及任务记录删除：`sglang_omni/pipeline/coordinator.py:761-843`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/coordinator.py#L761-L843)。
- [调用方收尾时删除等结果记录：`sglang_omni/pipeline/coordinator.py:703-740`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/coordinator.py#L703-L740)。
- [stage 记录取消、清理状态及有界集合：`sglang_omni/pipeline/stage/runtime.py:2603-2687`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage/runtime.py#L2603-L2687)。
- [同名提交被明确拒绝：`sglang_omni/pipeline/stage/runtime.py:732-743`](https://github.com/sgl-project/sglang-omni/blob/91d06c70b00746c0b2b84db12a318240db360f1d/sglang_omni/pipeline/stage/runtime.py#L732-L743)。

### 接下来

请求已经绑定到副本，也知道怎样退出。下一章问下游什么时候可以开始算，上游什么时候必须等结果。
