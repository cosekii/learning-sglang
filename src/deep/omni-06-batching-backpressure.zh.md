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

## 第 3 步 · encoder 只收集已经就绪的请求

> **一句话：** 上限允许且 hook 支持批处理时，A、B、C 可以一次算完；D 尚未入队，就不会被这次调用等到或带走。

### 图上是什么

- 出厂默认是 `max_batch_size=1`、`max_batch_wait_ms=0`，所以默认服务一次只编码一条。图中为了看见 batch，把上限改成教学值 4，并假定 `hook.can_encode_batch()` 为真。
- 收集前，`batch_queue` 已有 A、B、C。橙色队列框表示请求的到达侧，蓝色大框表示这一次实际的编码计算。
- `get_nowait()` 连续取走三条现成请求。队列随后为空，零等待预算让收集立即结束，第四个位置保持空白。
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

- `sglang_omni/scheduling/reference_encoder.py:139-196`：默认上限、零等待、hook 能力检查，以及批量队列和 worker 的创建条件。
- `sglang_omni/scheduling/reference_encoder.py:231-290`：首条获取、非阻塞收集、可选剩余时间等待、单批计算和逐项写回 `Future`。
- `sglang_omni/scheduling/reference_encoder.py:317-342`：调用批量 hook，并在普通异常时退回逐条编码。

行号对应 `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`。

### 接下来

第 4 步给请求加上 mel 帧成本：即使条数还没达到上限，下一项若会超出成本预算，也要留到下一批。

## 第 4 步 · 条数没满，声音帧预算也可能先满

> **一句话：** A、B 合计 21000 帧，再加 C 会变成 27000 帧；虽然三条少于八条上限，C 仍要留到下一批。

### 图上是什么

- 顶部是 MiniCPM-o `audio_encoder` 的真实配置：最多 8 条请求、零主动收集等待、每批最多 24000 个计费 mel 帧。
- 一个 mel 帧可以想成声音特征矩阵里的一小列。这里用帧数限制一批的工作量，而不只数请求有几条。
- 教学例子让 A 计 5 个完整窗口，B、C 各计 2 个。每个完整窗口按 3000 帧计，所以三条分别是 15000、6000、6000 帧。
- 左图收集 A、B，共 21000 帧，还剩 3000 帧。右图试着加入 C，总成本变成 27000 帧，虚线的 24000 帧上限被越过。
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

- `sglang_omni/models/minicpm_o/config.py:57-70`：当前 audio encoder 的 8 条、零等待和 24000 帧配置。
- `sglang_omni/models/minicpm_o/stages.py:166-202`：完整窗口成本函数，以及它与 `SimpleScheduler` 的接线。
- `sglang_omni/scheduling/simple_scheduler.py:148-197`：条数与成本双上限、超预算时 `appendleft()` 并停止收集。
- `sglang_omni/models/minicpm_o/audio_encoder_batching.py:85-112`：跨请求 padding 和一次批量 encoder 调用。

行号对应 `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`。

### 接下来

第 5 步看 Code2Wav 的一次性 batch 与流式 vocoder 的跨请求合步。两者都能让多条请求一起计算，但消息路径并不相同。

## 第 5 步 · 一次性 batch 与流式合步不是同一条路

> **一句话：** MiniCPM-o Code2Wav 收集完整请求做一次批量调用；可选的流式 vocoder 路径先把 chunk 放进各自状态，再让就绪请求合做一步。

### 图上是什么

- 左边是当前 MiniCPM-o `code2wav` 工厂：上限 16 条、零收集等待、`batch_wait_when_idle=false`。输入是两条完整的 `new_request`。
- `SimpleScheduler.collect_batch()` 收好现成请求后，调用 `vocode_and_release([A, B])`。结果仍按 A、B 分开返回。
- 右边是 `StreamingVocoderBase` 的可选跨请求 coalescing。输入是陆续到达的 `stream_chunk`，本例假设 A、B 都已满足本步子类的就绪条件。
- 右侧先把 A、B 的 chunk 分别 ingest 到各自 stream state，再选出参与者、构造计划，并调用一次 `run_step([A, B])`。返回的 waveform 仍按 request id 对应到各自输出。
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

- `sglang_omni/models/minicpm_o/config.py:144-176`：MiniCPM-o Code2Wav 的 16 条、零等待和 idle=false 配置。
- `sglang_omni/models/minicpm_o/stages.py:397-465`：Code2Wav 工厂返回 `SimpleScheduler`，批量调用并逐条释放 reference。
- `sglang_omni/scheduling/streaming_vocoder.py:347-369`：先 ingest 所有 chunk，再在锁内 pump，锁外执行 abort 清理。
- `sglang_omni/scheduling/streaming_vocoder.py:776-796`：选择参与者、执行一次 `run_step`，再按 request id 发 waveform。
- `sglang_omni/models/dots_tts/vocoder.py:166-222`：一个实际启用跨请求流式合步的子类。

行号对应 `origin/main@21a6d229c3d2075da5e97848f94e0d2ac8a2781a`。

### 接下来

第 6 步加入历史 H200 对照数字：batch 可能提高吞吐，但结果只属于当时的代码、模型和实验条件，不能当成当前主线的普遍承诺。
