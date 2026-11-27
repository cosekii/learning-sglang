## 第 1 步 · 凑批等待会把计算往后推

> **一句话：** A、B 已经能算时，零等待会立即收集它们；若专为凑满 batch 等 5 ms，而 C 又在 6 ms 才到，A、B 就白等 5 ms。

### 图上是什么

- 两幅图使用同一份输入：四个调度 batch 空位，A、B 在 0 ms 已入队，C 在 6 ms 到达。
- 上图或左图的 `max_batch_wait_ms=0`。scheduler 取出现成的 A、B，剩余两格空着，计算从 0 ms 开始。
- 下图或右图把等待预算改成教学用的 5 ms。scheduler 先等更多工作，5 ms 到期仍只有 A、B，于是计算从 5 ms 开始。
- 动画先让零等待面板收集 A、B，再把另一根的游标推进到 5 ms 截止点并收集，最后让 C 在 6 ms 到达，两次都没赶上。
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

- <code>sglang_omni/scheduling/<wbr>simple_scheduler.py:45-80</code>：`batch_compute_fn`、`max_batch_size`、`max_batch_wait_ms` 和 `batch_wait_when_idle` 的构造参数。
- <code>sglang_omni/scheduling/<wbr>simple_scheduler.py:148-197</code>：先取首项、按上限收集、空闲时按剩余预算等待，以及零等待退出。
- <code>sglang_omni/scheduling/<wbr>simple_scheduler.py:248-280</code>：批量调用 `batch_fn`，再按消息顺序逐项返回结果。

行号对应 <code>origin/main@<wbr>21a6d229c3d2075da5e97848f94e0d2ac8a2781a</code>。

### 接下来

第 2 步换成自回归生成：请求不会只计算一次就结束，running batch 会保留未完成请求，并在空位出现后补入等待者。

## 第 2 步 · running batch 会跨轮保留请求

> **一句话：** A、B 未完成时会一起进入下一轮；A 结束后，等待中的 C 才能在请求行数和 token 预算都允许时补入。

### 图上是什么

- 本例把 `max_running_requests` 设为 2，方便看清补位。第 1 轮的 `running_batch` 有 A、B，`waiting_queue` 有 C。
- A、B 各产生下一个 token 后仍未结束，就会继续参与后续轮次。图中让 A 在第 1 轮后结束，B 仍未结束。
- 第 2 轮保留 B，并把 C 从等待队列补进 A 空出的行。两条蓝色请求再次一起前进一步。
- 动画先让 A 结束，再让 C 补进空行，最后让 B、C 一起前进。灰色 A 卡片就是已结束对象，不在下一轮的 running batch 里。
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

- <code>sglang_omni/scheduling/<wbr>omni_scheduler.py:566-617</code>：从 model runner 读取运行上限，初始化 `waiting_queue` 和 `running_batch`。
- <code>sglang_omni/scheduling/<wbr>omni_scheduler.py:2764-2805</code>：判断 running batch 是否接受 prefill，并同时检查可分配请求数。
- <code>sglang_omni/scheduling/<wbr>generation_batch_policy.py:229-290</code>：构造运行、CUDA Graph 和 torch.compile 的 batch 配置；`363-461`：校验这些限制。
- <code>sglang_omni/models/minicpm_o/<wbr>stages.py:251-307</code>：MiniCPM-o talker 使用 32 的默认运行上限并调用配置校验。

行号对应 <code>origin/main@<wbr>21a6d229c3d2075da5e97848f94e0d2ac8a2781a</code>。

### 接下来

第 3 步回到一次性工作，看 `ReferenceEncodeService` 怎样只取队列里已经存在的编码请求，以及为什么只调大上限还不足以启用 batch。

## 第 3 步 · encoder 只收集已经就绪的请求

> **一句话：** 上限允许且 hook 支持批处理时，A、B、C 可以一次算完；D 尚未入队，就不会被这次调用等到或带走。

### 图上是什么

- 出厂默认是 `max_batch_size=1`、`max_batch_wait_ms=0`，所以默认服务一次只编码一条。图中为了看见 batch，把上限改成教学值 4，并假定 `hook.can_encode_batch()` 为真。
- 收集前，`batch_queue` 已有 A、B、C。橙色队列框表示请求的到达侧，蓝色大框表示这一次实际的编码计算。
- `get_nowait()` 连续取走三条现成请求。队列随后为空，零等待预算让收集立即结束，第四个位置保持空白。
- 动画先把三条请求从队列取进三个位置，再执行一次调用、返回三份结果，最后让 D 到达并等下一次收集。
- 一次 `encode_batch([A, B, C])` 产生三份结果，服务再按各自请求返回。D 在收集结束后才到，只能进入下一次收集。
- 这张图没有 running batch。每条参考编码在这次调用中得到完整结果，不像 AR 请求那样跨很多 decode 轮留在运行集合里。

### 代入图上的数

设教学上限为 $B=4$，已就绪请求数为 $N=3$。本批实际取走：

$$K=\min(B,N)=\min(4,3)=3$$

剩余空位为：

$$E=B-K=4-3=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $B$ | 一次编码收集的请求数上限 | 教学构造的 4 |
| $N$ | 收集时队列里的请求数 | A、B、C 三条 |
| $K$ | 本次实际编码的请求数 | 上限与就绪数取较小值 |
| $E$ | 本批没有使用的位置 | 四格减三条，得到一格 |

若保持出厂上限 $B_0=1$，三条就绪请求需要三次收集和三次 encode 调用，而不是一次三条。调大上限只是必要条件之一；hook 不支持批处理时，服务仍走单条路径。

### 默认路径与可选批处理

`ReferenceEncodeService` 的构造函数把默认上限设为 1、默认等待设为 0。只有 `max_batch_size > 1` 且 `hook.can_encode_batch()` 返回真，才创建批量编码函数和 `queue.Queue`；否则保持原来的逐条 `encode()` 路径。

批量 worker 先用阻塞 `get()` 取得第一条。首条到来前没有工作，因此这条等待不是「为了凑大批而推迟已有工作」。拿到首条后，代码先按剩余容量做 `get_nowait()`；只有配置了正等待预算，才可能在队列暂时为空时继续等到截止时间。本步保持等待为 0，所以只取现成三条。

计算返回 `list[ArtifactT | BaseException]`。worker 逐项把产物或异常写进该请求自己的 `Future`。批量 hook 抛出普通异常时，`encode_batch()` 还会退回逐条编码，因此一条失败不必拖垮同批其他请求。

### 边界与出处

本步不声称某个 MiniCPM-o 模型已默认启用这个参考编码 batch，也不把 4 当成推荐值。它只解释当前服务提供的可选机制。请求取消、底层 hook 的具体并发实现和算子内部怎样 padding 都不在图中。

- <code>sglang_omni/scheduling/<wbr>reference_encoder.py:139-196</code>：默认上限、零等待、hook 能力检查，以及批量队列和 worker 的创建条件。
- <code>sglang_omni/scheduling/<wbr>reference_encoder.py:231-290</code>：首条获取、非阻塞收集、可选剩余时间等待、单批计算和逐项写回 `Future`。
- <code>sglang_omni/scheduling/<wbr>reference_encoder.py:317-342</code>：调用批量 hook，并在普通异常时退回逐条编码。

行号对应 <code>origin/main@<wbr>21a6d229c3d2075da5e97848f94e0d2ac8a2781a</code>。

### 接下来

第 4 步给请求加上 mel 帧成本：即使条数还没达到上限，下一项若会超出成本预算，也要留到下一批。

## 第 4 步 · 条数没满，声音帧预算也可能先满

> **一句话：** A、B 合计 21000 帧，再加 C 会变成 27000 帧；虽然三条少于八条上限，C 仍要留到下一批。

### 图上是什么

- 顶部是 MiniCPM-o `audio_encoder` 的真实配置：最多 8 条请求、零主动收集等待、每批最多 24000 个计费 mel 帧。
- 一个 mel 帧可以想成声音特征矩阵里的一小列。这里用帧数限制一批的工作量，而不只数请求有几条。
- 教学例子让 A 计 5 个完整窗口，B、C 各计 2 个。每个完整窗口按 3000 帧计，所以三条分别是 15000、6000、6000 帧。
- 两幅图从同一原点起，共用 0–27000 帧的比例尺。24000 帧虚线上限的位置相同，所以同样的 A、B 在两图里一样宽。
- 左图收集 A、B，共 21000 帧，还剩 3000 帧。右图试着加入 C，总成本变成 27000 帧，虚线的 24000 帧上限被越过。
- 动画先让 C 在 `pending_messages` 等待，再显示等宽的试算段和 27000 帧总数，最后把被拒绝的 C 改成虚线，并用 `appendleft()` 放回队首。试算段留在图上，27000 的算式才有看得见的来源。
- scheduler 不把 C 塞进这批，而是把它放回 `pending_messages` 的队首并结束本次收集。请求条数上限和帧成本上限必须同时通过。

### 代入图上的数

设完整窗口的计费帧数为 $F=3000$。A、B、C 的窗口数分别为 5、2、2，因此：

$$C_A=5F=15000,\qquad C_B=2F=6000,\qquad C_C=2F=6000$$

只收集 A、B 时：

$$C_{AB}=C_A+C_B=15000+6000=21000\leq24000$$

再加入 C 时：

$$C_{ABC}=C_{AB}+C_C=21000+6000=27000>24000$$

超出量为：

$$O=C_{ABC}-24000=27000-24000=3000$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $F$ | 一个完整音频窗口的计费帧数 | 当前配置注释中的 3000 帧 |
| $C_A,C_B,C_C$ | 三条教学请求的调度成本 | 5、2、2 个完整窗口乘 3000 |
| $C_{AB}$ | A、B 同批的总成本 | 15000 加 6000 |
| $C_{ABC}$ | 假设三条同批的总成本 | 21000 加 6000 |
| $O$ | 三条同批会超出的帧数 | 27000 减 24000 |

这里的 5、2、2 个窗口是教学构造。真实上限的确等价于 $8\times3000=24000$ 个完整窗口，但不代表任何八条短请求都一定占满预算，也不代表帧数与延迟严格成正比。

### 成本从哪里来

`request_mel_frame_cost()` 从请求构造出 encoder 输入。可跳过编码的请求成本为 0；其余请求按「窗口数乘最大窗口帧数」收费。代码刻意按完整窗口计费，用来约束跨请求 padding 后的工作量，而不是只按有效声音长度求和。

`create_encoder_executor()` 把这个函数作为 `request_cost_fn` 交给 `SimpleScheduler`，并把 `max_batch_mel_frames` 交给 `max_batch_cost`。真正批量计算时，不同长度的输入还会 pad 到本批最大帧数，再做一次 encoder 调用。

收集循环同时检查两个条件：`len(batch) < max_batch_size`，以及加入下一项后 `batch_cost + msg_cost <= max_batch_cost`。条数通过而成本不通过时，下一项通过 `appendleft()` 留回 pending，不会在这批后面继续寻找更小的请求。

### 边界与出处

首条消息先进入 batch，后续消息才做超预算检查。因此一条自身就超过预算的请求仍可单独执行，不会被成本检查永久卡住。本步没有展开这个分支，也不把成本预算说成精确的显存或 FLOP 测量。

- <code>sglang_omni/models/minicpm_o/<wbr>config.py:57-70</code>：当前 audio encoder 的 8 条、零等待和 24000 帧配置。
- <code>sglang_omni/models/minicpm_o/<wbr>stages.py:166-202</code>：完整窗口成本函数，以及它与 `SimpleScheduler` 的接线。
- <code>sglang_omni/scheduling/<wbr>simple_scheduler.py:148-197</code>：条数与成本双上限、超预算时 `appendleft()` 并停止收集。
- <code>sglang_omni/models/minicpm_o/<wbr>audio_encoder_batching.py:85-112</code>：跨请求 padding 和一次批量 encoder 调用。

行号对应 <code>origin/main@<wbr>21a6d229c3d2075da5e97848f94e0d2ac8a2781a</code>。

### 接下来

第 5 步看 Code2Wav 的一次性 batch 与流式 vocoder 的跨请求合步。两者都能让多条请求一起计算，但消息路径并不相同。

## 第 5 步 · 一次性 batch 与流式合步不是同一条路

> **一句话：** MiniCPM-o Code2Wav 收集完整请求做一次批量调用；可选的流式 vocoder 路径先把 chunk 放进各自状态，再让就绪请求合做一步。

### 图上是什么

- 左边是当前 MiniCPM-o `code2wav` 工厂：上限 16 条、零收集等待、`batch_wait_when_idle=false`。输入是两条完整的 `new_request`。
- `SimpleScheduler.collect_batch()` 收好现成请求后，调用 `vocode_and_release([A, B])`。结果仍按 A、B 分开返回。
- 右边是 `StreamingVocoderBase` 的可选跨请求 coalescing。输入是陆续到达的 `stream_chunk`，本例假设 A、B 都已满足本步子类的就绪条件。
- 右侧先把 A、B 的 chunk 分别 ingest 到各自 stream state，再选出参与者并调用一次 `run_step([A, B])`。构造计划发生在选择与调用之间，图中没有单独的计划卡片。返回的 waveform 仍按 request id 对应到各自输出。
- 动画先播放左侧收集与批量调用，再播放右侧 ingest、选择参与者和共享一步。每相只有一幅图变化。
- 橙色都表示共享计算，但两边入口、状态和函数不同。不能把右图的 `run_step()` 标到 MiniCPM-o 左边的工厂里。

### 代入图上的数

设输入请求数为 $N=2$，本例共享计算次数为 $S=1$。两条路径都得到 $N=2$ 份独立输出：

$$N=2,\qquad S=1,\qquad \text{outputs}=N=2$$

若完全不共享调度计算，两条请求会对应两次调用；本例把调用次数从 $N=2$ 合为 $S=1$：

$$N-S=2-1=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 参与本例的请求数 | A、B 两条 |
| $S$ | 本例的一次共享计算 | 左侧一次 batch 调用，或右侧一次 `run_step` |
| outputs | 保留请求身份的输出数 | A、B 各一份，共两份 |
| $N-S$ | 相对两次独立调用少的一次调度调用 | 2 减 1，得到 1 |

$N-S=1$ 只数调用次数，不等于延迟降低一半，也不证明吞吐翻倍。共享 kernel 的工作量、padding、流就绪条件和硬件都会改变结果。

### 左边的完整请求路径

`create_code2wav_executor()` 返回的是 `SimpleScheduler`。它把 `vocode_and_release` 同时用于单条和批量路径，并传入请求上限、等待配置和可选 codec token 成本。当前模型配置为零等待，所以这里只收集已经到达的完整请求，不主动等空位填满。

`vocode_and_release()` 调用 `vocode_code2wav_payloads()`，并在 `finally` 中逐条释放 reference。批量执行与资源释放属于这条工厂路径，和右侧的流式状态机不是同一套函数。

### 右边的流式合步路径

`StreamingVocoderBase` 默认并不保证跨请求合步；子类要启用 `can_batch_stream_chunks`，并实现参与者、计划和 `run_step` 等钩子。比如 DotsTTS 的子类显式打开这个开关。

启用后，`on_stream_chunk_batch()` 在 `state_lock` 下先 ingest 本批所有 chunk，再执行 pump。`pump_one_step()` 选择本轮参与者、构造计划并调用一次 `run_step()`，然后把返回字典里的 waveform 发到对应请求。没有就绪参与者时，本步不运行。

本例假设 A、B 同时就绪，所以它们共享一步。真实系统可以只有 A 就绪，也可以让某条流暂时不产生 waveform；不能把「收到两条 chunk」直接等同于「两条一定进入同一次计算」。

### 边界与出处

右侧某次共享计算抛出异常时，默认 `on_step_failure()` 会向所有参与者发错并清理它们的状态，外部 abort 清理由锁外代码执行。左侧批量结果与错误的处理不能直接套到这条流式路径上。

- <code>sglang_omni/models/minicpm_o/<wbr>config.py:144-176</code>：MiniCPM-o Code2Wav 的 16 条、零等待和 idle=false 配置。
- <code>sglang_omni/models/minicpm_o/<wbr>stages.py:397-465</code>：Code2Wav 工厂返回 `SimpleScheduler`，批量调用并逐条释放 reference。
- <code>sglang_omni/scheduling/<wbr>streaming_vocoder.py:347-369</code>：先 ingest 所有 chunk，再在锁内 pump，锁外执行 abort 清理。
- <code>sglang_omni/scheduling/<wbr>streaming_vocoder.py:776-796</code>：选择参与者、执行一次 `run_step`，再按 request id 发 waveform。
- <code>sglang_omni/models/dots_tts/<wbr>vocoder.py:166-222</code>：一个实际启用跨请求流式合步的子类。

行号对应 <code>origin/main@<wbr>21a6d229c3d2075da5e97848f94e0d2ac8a2781a</code>。

### 接下来

第 6 步加入历史 H200 对照数字：batch 可能提高吞吐，但结果只属于当时的代码、模型和实验条件，不能当成当前主线的普遍承诺。

## 第 6 步 · 历史实验里的收益有适用边界

> **一句话：** 在那组 H200、200 条请求、并发 16、零等待的 FIFO 对照里，B8 吞吐比 B1 高约 37.9%；这不是当前主线或任意负载的保证。

### 图上是什么

- 本步引用历史文章和 PR #2271 的受控实验，没有在本机重新跑模型。吞吐表示每秒完成多少条请求，柱越高表示同样一秒完成越多。
- 两根柱只改变 FIFO 的 Code2Wav 收集上限：B1 为 4.100 requests/s，B8 为 5.652 requests/s。本例的 B 是 batch 上限，不是某条请求的名字。
- 动画先显示 B1，再在同一根 0–6 轴上显示 B8，最后计算差值和百分比。它只是重现两个历史平均值，不是新的请求轨迹或 benchmark。
- 实验使用单张 H200、SeedTTS 完整 EN 前 200 条、客户端并发 16、零主动等待。每次启动另做 50 条预热并剔除，混合参考音频配置重复三次，并固定 CPU 核区、检查争用。
- 右侧 scope 卡把结论限制在这份旧代码和这组负载。它不把 B8 说成所有 GPU、所有请求分布或当前主线的最优配置。
- 历史代码的 Code2Wav 上限为 8；本章固定的当前主线配置为 16，且实现已经改变。两个数字不能直接拼成一次新的性能对比。

### 代入图上的数

设 B1 吞吐为 $T_1=4.100\,\mathrm{requests/s}$，B8 吞吐为 $T_8=5.652\,\mathrm{requests/s}$。每秒多完成的请求数为：

$$\Delta T=T_8-T_1=5.652-4.100=1.552\,\mathrm{requests/s}$$

相对 B1 的提升比例为：

$$G=\frac{T_8-T_1}{T_1}\times100\%=\frac{5.652-4.100}{4.100}\times100\%\approx37.9\%$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_1$ | 历史 FIFO B1 平均吞吐 | H200 对照表中的 4.100 requests/s |
| $T_8$ | 历史 FIFO B8 平均吞吐 | 同一对照表中的 5.652 requests/s |
| $\Delta T$ | 每秒多完成的请求数 | 5.652 减 4.100，得到 1.552 |
| $G$ | B8 相对 B1 的吞吐提升 | 差值除以 B1，约 37.9% |

37.9% 的比较对象明确是同一表的 FIFO B1，不是 reference-aware、A800 或当前主线。不同表格和不同实验轮的数字不能混用分母。

### 为什么还需要看实验条件

客户端并发 16 不表示 Code2Wav 队列始终有 16 条。请求可能在网络、预处理、Thinker 或 Talker 中，真正到达本 stage 的现成工作决定了实际 batch。调度上限 8 也不表示模型内部一定有一次八条请求的 GPU kernel；历史实现还会按 reference 等条件分组。

零主动等待只去掉「为了更多请求而空等」的窗口。前一批计算、组内串行、整批统一返回和上游供给不足的等待仍可能存在。因此，B8 在这组实验中胜出是测量结果，不是从零等待配置逻辑推出的定理。

历史记录还包含 A800 上不同现象的观察。文章明确指出硬件、host 和流程没有完全对齐，不能仅凭卡名把差异归因于 GPU 架构。本步不把两组异环境数字放到同一根轴上。

### 边界与出处

本步没有重跑实验，也不评价历史 reference-aware 或 early-emit 方案。当前主线 `code2wav` 的上限已是 16；旧实现的参考分组、返回路径与当前代码不能混为一谈。要做当前配置决策，必须用当前代码、目标负载和受控环境重新测量。

- <code>Awesome-ML-SYS-Tutorial/sglang/<wbr>sglang-omni/batch.md:5-16</code>：开篇 FIFO B1/B8 数字与 H200、200 条、并发 16、零等待、预热和重复条件。
- <code>Awesome-ML-SYS-Tutorial/sglang/<wbr>sglang-omni/batch.md:27-35</code>：客户端并发、调度 batch、模型内部计算 batch 与零等待的区别。
- <code>Awesome-ML-SYS-Tutorial/sglang/<wbr>sglang-omni/batch.md:119-139</code>：样本、CPU 控制、日志解释和调用数边界。
- <code>Awesome-ML-SYS-Tutorial/sglang/<wbr>sglang-omni/batch.md:143-164</code>：另一轮 batch-size 实验的独立条件，以及不能宣布普遍最优的限制。
- 历史实验代码参考：`89e60d0bf216bacd0e072d79f969550469614662`；讨论记录：PR #2271。
- 当前主线对照：<code>sglang_omni/models/minicpm_o/<wbr>config.py:144-176</code> 的上限 16。

当前主线行号对应 <code>origin/main@<wbr>21a6d229c3d2075da5e97848f94e0d2ac8a2781a</code>。

### 接下来

第 7 步从「怎样算得更多」转到「满了怎样拒绝」：router、worker 和 coordinator 各有容量边界，背压让等待和错误显式返回客户端。

## 第 7 步 · 两层准入满了，错误路径不同

> **一句话：** 教学例子的两条请求已经占满容量，C 到达时 router 准入返回 429，coordinator 的 pipeline 入口返回 503。

### 图上是什么

- 背压在这里表示：容量边界把「已经满了」明确告诉调用方，而不是继续接受无限多的新请求。两幅图是独立例子，不表示同一个 C 会先收 429 再收 503。
- 左图把 router 的全局与每服务许可都设成教学值 2。A、B 仍在处理，许可没有空余；C 的非阻塞获取失败，直接返回 `RouterOverloaded` 对应的 HTTP 429，不发给 worker。
- 右图把 coordinator 的 `max_in_flight` 设为教学值 2。A、B 都计入准入，C 调用 `submit_request()` 时在 pipeline submit 之前触发 `QueueFullError`，OpenAI 错误映射为 HTTP 503。
- 动画按顺序播放两个独立例子：router 的 C 获取许可失败并返回 429，再由 coordinator 的 C 触发 `QueueFullError` 并返回 503。两个 C 都没有越过各自边界。
- 蓝色表示处理中的请求，橙色表示被边界拒绝的 C。两处颜色含义相同，但错误来源不同，不能把 429 和 503 当成可互换的同义词。
- router 的许可与 worker load guard 会持有到响应 EOF、上游错误或下游取消。响应头发出并不代表可以提早释放；coordinator 只累加 `counts_toward_admission` 为真的请求。

### 代入图上的数

设教学准入上限为 $L=2$，仍在处理的请求数为 $U=2$，新到请求数为 $N=1$。剩余许可为：

$$F=L-U=2-2=0$$

若再接受 C，处理中请求数将变成：

$$U+N=2+1=3>L=2$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $L$ | 每幅图各自的教学准入上限 | 构造的 2，不是部署默认值 |
| $U$ | 当前仍占容量的请求数 | A、B 两条 |
| $N$ | 本次新到请求数 | 只有 C 一条 |
| $F$ | 新请求到达前的剩余许可 | 上限 2 减占用 2，得到 0 |
| $U+N$ | 假设接受 C 后的占用数 | 2 加 1，得到 3，超过上限 |

$F=0$ 解释本例为什么拒绝，不表示真实部署应把上限设为 2。router 还有按服务类别加权的 credits；coordinator 也可配置为不设 `max_in_flight`，本图不展开这些配置分支。

### Router 的 fail-fast 准入

`AdmissionController.try_admit_envelope()` 使用 `try_acquire_owned()` 获取全局许可，`try_admit_class()` 再获取服务类别许可。没有许可时返回 `AdmissionError::Overloaded`，HTTP 错误表把 `RouterOverloaded` 映射为 429。这是立即失败，不是把 C 放进一个等待许可的 router 队列。

准入成功后，`RequestLease` 同时持有 admission、可选 worker capacity 与 worker load guard。`DirectResponseBody` 持有这个 lease，并在完成、上游错误或 body 被丢弃时释放。正常流式响应因此会一直占许可，直到响应真正终止。

### Coordinator 的 pipeline 入口检查

`submit_request()` 在构造 pipeline 输入之前，累加现有请求里 `counts_toward_admission` 的值。若结果已经大于或等于 `max_in_flight`，且本次没有显式绕过准入，就抛出 `QueueFullError`。图中 $U=2$ 已达到上限，所以 C 不会进入 pipeline。

`generation_error_status_code()` 识别 `QueueFullError` 后返回 503。这个状态来自 worker 内部的容量边界；左图的 429 来自 Rust router。真实请求也可能遇到其他 stage 的容量错误，本步只画这两条已经核对的路径。

### 边界与出处

教学上限不是配置建议，也不是实测容量。router 的 worker 选择另有健康、兼容性与 session capacity 检查；coordinator 也另有保留 request id、session 和 stage 级拒绝。本步不展开这些分支。

coordinator 对可选 `stream_queue` 另有一条容易混淆的要求：若调用方传入该队列，它必须是无界队列，避免一条请求塞满队列后卡住共享 completion loop。这不取消前面的请求数准入，也不表示所有响应路径都有无界应用队列。第 8 步只讲 Rust router 的直接响应 body。

- <code>docs/basic_usage/<wbr>omni_router.md:240-251</code>：fail-fast、许可持有到响应终止，以及 worker 仍负责自己的执行与队列容量。
- <code>sglang_omni_router/src/worker_pool/<wbr>admission.rs:143-188</code>：全局和分类许可的非阻塞获取，以及无许可时的 `Overloaded`。
- <code>sglang_omni_router/src/worker_pool/<wbr>admission.rs:49-103</code>：worker load guard 与 `RequestLease` 的持有关系。
- <code>sglang_omni_router/src/<wbr>error.rs:181-199</code>：`RouterOverloaded` 映射为 HTTP 429。
- <code>sglang_omni/pipeline/<wbr>coordinator.py:560-601</code>：pipeline submit 前的 `max_in_flight` 检查与 `QueueFullError`。
- <code>sglang_omni/serve/<wbr>openai_errors.py:104-111</code>：`QueueFullError` 映射为 HTTP 503。
- <code>sglang_omni/<wbr>admission.py:9-32</code>：队列满错误及其跨 IPC 文本匹配。

行号对应 <code>origin/main@<wbr>21a6d229c3d2075da5e97848f94e0d2ac8a2781a</code>。

### 接下来

第 8 步看已接收请求的响应：router 的 `DirectResponseBody` 由下游逐帧拉取，不另建 body pump 或应用队列。

## 第 8 步 · 响应帧由下游逐次拉取

> **一句话：** 传输尚未终止时，下游每调用一次 `poll_frame()`，router 的响应 adapter（转接框）就向上游调用一次；一次最多交出一帧，自己不另建应用队列。

### 图上是什么

- `poll_frame()` 可以读成「来取下一帧」。橙色箭头从 client 指向 router、再指向 worker，表示读取请求向上游传；蓝色箭头反向表示响应数据向下游返回。
- 教学例子共有三帧，第 1 帧已交给 client，另外两帧仍在上游。这里的帧是 HTTP body data frame，不是第 4 步的 mel 音频帧。
- 中间的 `DirectResponseBody` 包装 worker 的 `reqwest::Body`，再装进下游 `axum::Body`。它持有第 7 步的 request lease，但不启动额外 body pump、应用队列或 relay task。
- 下游调用 router 的 `poll_frame()` 时，adapter 直接调用内部 body 的 `poll_frame()`。返回值可以是 `Pending`、一个数据帧、EOF 或错误；一次调用不会由这个循环主动聚集多帧。
- 动画先发出一次 client poll，再发出一次内部 poll，把第 2 帧交回 router，最后交给 client。计数从「交付 1 帧、上游 2 帧」变成「交付 2 帧、上游 1 帧」，adapter 队列始终为 0。
- 如果下游此刻不 poll，这个 adapter 也不会自行向内部 body 再 poll 一次。读取需求因此沿相反方向传回上游，形成响应路径的背压。

### 代入图上的数

设下游调用次数为 $P=1$，本 adapter 对应的上游调用次数也是 $P=1$。一次返回的数据帧数 $F$ 满足：

$$P=1\quad\Longrightarrow\quad 0\leq F\leq1$$

图中 adapter 自己维护的应用队列数记为 $Q$：

$$Q=0$$

教学例子的总帧数为 $T=3$，已交付帧数为 $D=1$，仍在上游的帧数为 $U$：

$$U=T-D=3-1=2$$

动画中的 poll 交出第 2 帧后，$D'=2$，仍在上游的帧数为：

$$U'=T-D'=3-2=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 本例的一次下游 poll | 教学构造的一次调用 |
| $F$ | 这次 poll 返回的数据帧数 | `Pending` 为 0，一个就绪数据帧为 1 |
| $Q$ | 这个响应 adapter 自己增加的应用队列数 | 直接 body 结构没有该队列，记为 0 |
| $T$ | 教学例子的总数据帧数 | 构造的三帧 |
| $D$ | 本次 poll 前已交给下游的帧数 | 初态交付第 1 帧，随后 $D'=2$ |
| $U$ | 本次 poll 前仍在上游的帧数 | 3 减 1 得到 2，随后 $U'=1$ |

$Q=0$ 是对这个 adapter 结构的描述，不是测量出来的延迟，也不表示整个网络栈没有任何缓冲。$0\leq F\leq1$ 只约束一次 `poll_frame()` 调用，不限制一条完整响应有多少帧。

### 代码怎样直接转发 poll

router 收到上游响应后，保留状态码和清理后的 headers，用 `DirectResponseBody::new(body, lease, metrics)` 包装上游 body，再构造下游 `Response<axum::Body>`。这条路径没有另开任务先把全部响应读进内存。

`DirectResponseBody.poll_frame()` 在尚未终止时，对 `inner` 调用一次 `Pin::new(inner).poll_frame(cx)`。若内部返回 `Pending`，它也返回 `Pending`；若返回一个数据 frame，它把这个 frame 交给下游；若返回 EOF 或上游错误，就进入终止处理。

终止处理会 drop 内部 body 和 request lease。正常 EOF、上游错误与下游取消因此都能释放第 7 步的准入资源，同时记录相应的 body termination。

### 背压不等于所有缓冲消失

HTTP 框架、TCP socket、操作系统和 worker 内部仍可能缓冲数据。本步只保证这个 router 响应 adapter 没再添加一套 body pump、应用队列和 relay task，不能把 $Q=0$ 扩大成「系统零拷贝」或「worker 立刻停产」。

这条路径也不描述分类上传。需要按 body 内容分类的请求仍有独立的有界缓冲预算；第 7 步提到的 coordinator `stream_queue` 又属于另一层。本图只对应 Rust router 的响应 body 转发。

### 边界与出处

本步用三帧解释调用关系，不是实测吞吐，也不承诺每次 poll 都有数据。上游尚未就绪时，`Pending` 是正常结果；出现 trailers 时，这个 adapter 按上游协议错误处理。backpressure 的传播粒度和实际等待还取决于 HTTP 运行时与网络。

- <code>docs/basic_usage/<wbr>omni_router.md:240-251</code>：许可生命周期，以及 request/response body 不使用 body pump、应用队列或额外 relay task 的直接背压。
- <code>sglang_omni_router/src/http_relay/<wbr>mod.rs:219-233</code>：把上游 body 包装成 `DirectResponseBody`，再构造下游响应。
- <code>sglang_omni_router/src/http_relay/<wbr>response_body.rs:16-35</code>：adapter 持有内部 body、request lease 和终止状态。
- <code>sglang_omni_router/src/http_relay/<wbr>response_body.rs:38-72</code>：终止时释放内部 body 与 lease，以及 drop 时的处理。
- <code>sglang_omni_router/src/http_relay/<wbr>response_body.rs:75-101</code>：一次下游 poll 对应一次内部 poll，以及数据、`Pending`、EOF 和错误分支。

行号对应 <code>origin/main@<wbr>21a6d229c3d2075da5e97848f94e0d2ac8a2781a</code>。

### 接下来

本章把两类容量控制连起来：新请求在 router 或 worker 边界受到准入限制，已接收的 HTTP 响应由下游逐帧拉取。部署时仍需按目标负载测量各层容量，并分别监控 429、503、响应终止和 worker 队列。
