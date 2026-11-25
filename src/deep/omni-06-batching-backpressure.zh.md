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

## 第 2 步 · running batch 会跨轮保留请求

> **一句话：** A、B 未完成时会一起进入下一轮；A 结束后，等待中的 C 才能在请求行数和 token 预算都允许时补入。

### 图上是什么

- 本例把 `max_running_requests` 设为 2，方便看清补位。第 1 轮的 `running_batch` 有 A、B，`waiting_queue` 有 C。
- A、B 各产生下一个 token 后仍未结束，就会继续参与后续轮次。图中让 A 在第 1 轮后结束，B 仍未结束。
- 第 2 轮保留 B，并把 C 从等待队列补进 A 空出的行。两条蓝色请求再次一起前进一步。
- 蓝色始终表示 running row，橙色表示 waiting request，灰色表示 finished。C 从橙色变为蓝色，表示所属集合改变，不是请求内容改变。
- 最下面的 `generation_batch_policy.py` 只负责构造和校验配置。真正的队列状态与补位循环属于 `OmniScheduler`。

### 代入图上的数

设请求行数上限为 $R=2$。第 1 轮运行数为 $U_1=2$，因此可补入的空行数为：

$$F_1=R-U_1=2-2=0$$

A 结束后、C 补入前，运行数变为 $U_2=1$：

$$F_2=R-U_2=2-1=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $R$ | running batch 的请求行数上限 | 教学构造的 2 行 |
| $U_1$ | 第 1 轮的运行请求数 | A、B 两条 |
| $F_1$ | 第 1 轮可供 C 使用的空行 | 2 减 2，得到 0 |
| $U_2$ | A 结束后剩余的运行请求数 | 只剩 B |
| $F_2$ | A 结束后的空行数 | 2 减 1，得到 1 |

$F_2=1$ 只说明请求行数不再挡住 C。实际准入还要检查 token/KV 预算和其他调度条件，所以图写「显存允许时补入」，不把空行当作充分条件。

### 与一次性收集的差别

第 1 步的 `SimpleScheduler` 对一批输入调用一次 `batch_fn`，逐项返回结果。AR 请求则要在多轮 prefill/decode 中前进。`OmniScheduler` 因此同时保存 `waiting_queue` 和 `running_batch`，并在每轮重新判断可否接纳 prefill。

这种让未完成请求留在运行集合、结束请求释放位置、等待请求补位的做法叫 continuous batching。这里的「continuous」描述调度集合跨轮延续，不表示 GPU 永不空闲，也不表示每条请求同时只执行一个 kernel。

### 配置助手不执行排队

`build_generation_batch_overrides()` 归一化 `max_running_requests`，在未显式给出时让 `cuda_graph_max_bs` 和 `torch_compile_max_bs` 跟随它，并构造 CUDA Graph batch ladder。`validate_generation_batch_policy()` 再检查正值、graph 上限和 model buffer 是否覆盖运行上限。

这些函数创建并校验 `ServerArgs`。它们没有 `waiting_queue.append`、`running_batch.reqs` 或逐轮调度循环，不能把配置助手画成实际排队者。MiniCPM-o talker 工厂当前传入的运行上限为 32，并另设 `max_total_tokens = 32 * max_seq_len`；本图的两行不是这份默认值。

### 边界与出处

本步只画正常的完成与补位，不展开 priority、preemption、session 行复用、chunked prefill 或可选 prefill coalescing。当前 `OmniScheduler` 确实还有按配置启用的 prefill 等待窗口，不能从本图推出「AR 永远不会主动等待」。

- `sglang_omni/scheduling/omni_scheduler.py:566-617`：从 model runner 读取运行上限，初始化 `waiting_queue` 和 `running_batch`。
- `sglang_omni/scheduling/omni_scheduler.py:2764-2805`：判断 running batch 是否接受 prefill，并同时检查可分配请求数。
- `sglang_omni/scheduling/generation_batch_policy.py:229-290`：构造运行、CUDA Graph 和 torch.compile 的 batch 配置；`363-461`：校验这些限制。
- `sglang_omni/models/minicpm_o/stages.py:251-307`：MiniCPM-o talker 使用 32 的默认运行上限并调用配置校验。

行号对应 `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`。

### 接下来

第 3 步回到一次性工作，看 `ReferenceEncodeService` 怎样只取队列里已经存在的编码请求，以及为什么只调大上限还不足以启用 batch。
