## 第 1 步 · 凑批等待会把计算往后推

> **一句话：** A、B 已经能算时，零等待会立即收集它们；若专为凑满 batch 等 5 ms，而 C 又在 6 ms 才到，A、B 就白等 5 ms。

### 图上是什么

- 两幅图使用同一份输入：四个调度 batch 空位，A、B 在 0 ms 已入队，C 在 6 ms 到达。
- 上图或左图的 `max_batch_wait_ms=0`。scheduler 取出现成的 A、B，剩余两格空着，计算从 0 ms 开始。
- 下图或右图把等待预算改成教学用的 5 ms。scheduler 先等更多工作，5 ms 到期仍只有 A、B，于是计算从 5 ms 开始。
- 蓝色表示已经排队、可以执行的工作，橙色表示为了凑批额外等待。C 的刻度在 6 ms，两次收集都没有把它收进去。
- 这里只比较收集策略，不画 GPU 计算耗时、前一批占用、网络传输或其他队列。两幅图的差别只有主动收集等待。

### 代入图上的数

设主动等待预算为 $W=5\,\mathrm{ms}$，零等待预算为 $W_0=0\,\mathrm{ms}$。在其他时间都不画的教学例子里，A、B 开始计算的额外延迟为：

$$\Delta t=W-W_0=5-0=5\,\mathrm{ms}$$

batch 上限为 $B=4$，现成请求数为 $N=2$，未填的空位数为：

$$E=B-N=4-2=2$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $W$ | 对照面板的主动收集预算 | 教学构造的 5 ms |
| $W_0$ | 零等待面板的收集预算 | 0 ms |
| $\Delta t$ | 本例仅由收集预算带来的开始时间差 | 5 ms 减 0 ms |
| $B$ | 一次调度收集的容量上限 | 教学构造的四个位置 |
| $N$ | 收集开始时已经到达的请求数 | A、B 两条 |
| $E$ | 没有请求填入的位置数 | 四格减两条请求 |

这些数字只描述构造时间线。$5\,\mathrm{ms}$ 不是实测延迟，$B=4$ 也不是本章声称的模型默认值。实际请求的完成时间还包括计算和其他等待。

### 零等待究竟去掉了什么

`SimpleScheduler.collect_batch()` 先拿第一条消息。配置了 `batch_compute_fn` 且上限大于 1 时，它继续用 `get_nowait()` 取现成消息；队列为空且等待预算为 0，就立即停止收集。因此「上限为 4」不等于「必须凑够 4 条」。

当 `batch_wait_when_idle=true` 时，首条消息会建立一个等待截止时间。队列暂时为空时，代码用剩余预算做阻塞 `get(timeout=remaining)`。本例没有新请求在 5 ms 内到达，所以等待只推迟了 A、B，没有换来更大的 batch。

### 边界与出处

本步只讲 `SimpleScheduler` 的一次性 `new_request` 收集，不把它套到 AR 的持续运行 batch。`batch_wait_when_idle=false` 时，第一条消息不会建立空闲等待截止；收到第二条后才可能开始等待。图中没有展开这个分支，也没有展开按 `max_batch_cost` 拒绝超预算消息的逻辑。

- `sglang_omni/scheduling/simple_scheduler.py:45-80`：`batch_compute_fn`、`max_batch_size`、`max_batch_wait_ms` 和 `batch_wait_when_idle` 的构造参数。
- `sglang_omni/scheduling/simple_scheduler.py:148-197`：先取首项、按上限收集、空闲时按剩余预算等待，以及零等待退出。
- `sglang_omni/scheduling/simple_scheduler.py:248-280`：批量调用 `batch_fn`，再按消息顺序逐项返回结果。

行号对应 `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`。

### 接下来

第 2 步换成自回归生成：请求不会只计算一次就结束，running batch 会保留未完成请求，并在空位出现后补入等待者。
