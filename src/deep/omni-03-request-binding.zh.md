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

下一步看请求完成或取消时，协调器怎样释放这个 request id 的所有权。
