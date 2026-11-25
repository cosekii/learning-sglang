## 第 1 步 · 读者没读完，空间不能复用

> **一句话：** 本例只有一格空间，`talker_ar` 还在读 A 时不能改放 B；等 A 读完，B 才能安全使用这一格。

### 图上是什么

- 本例沿用前面的 `thinker → talker_ar` 交接，构造 A、B 两份先后产生的结果。为让冲突看得见，假设只有一格可复用空间。
- 左边是错误顺序：A 仍在被读取，B 就占了这格。原来保存 A 的位置现在保存 B，读者想读 A 却会读到 B。
- 右边是安全顺序：A 一直留在格里，B 在格外等待。读者读完 A 后，B 才可以进入。
- 蓝色表示正在读取且必须保留的结果，橙色表示下一份结果。格子里写哪个字母，就表示读者此刻会从那里读到哪份结果。
- 本步不画实际数据平面，也不指定 CPU、GPU、共享内存或网络传输。问题只在于旧数据仍在使用，同一位置不能提前交给新数据。

### 代入图上的数

设本例结果数为 $N=2$，示意空间数为 $S=1$。不能同时放下、需要等待的结果数为：

$$W=N-S=2-1=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 本例的结果总数 | 构造的 A、B 两份结果 |
| $S$ | 本例可同时容纳的空间数 | 教学例子假定的一格 |
| $W$ | 必须等待空间的结果数 | 本例的两份结果减一格空间 |

这里的 2 和 1 都只属于教学例子。它们不是默认池子大小、显存预算、请求上限或实测并发数；$W=1$ 也不表示真实系统总会有一份结果等待。

### 为什么等待能保住正确读取

读者需要的不只是「曾经有过 A」，而是「我读取期间，A 仍在原来的位置」。若主人在读取结束前复用位置，旧位置的内容就不再等于读者要读的 A。让 B 等待，就是把「位置可以改写」推迟到「A 的读取已经结束」之后。

这还不能回答两个实现问题：读者怎样找到 A 的位置，主人又怎样知道读取已经结束。下一步先引入 DataRef，把结果的位置和元数据装进一个句柄；之后再讲读取完成的回执。

### 边界与出处

本步是生命周期问题的教学构造，不声称 SGLang-Omni 只有一个槽位，也不把等待等同于整个 pipeline 停止。实际实现可以用其他空间或队列容纳 B；本例故意只留一格，让提前复用的风险可以直接看见。

第 1 本 Ch.18 Steps 2–8 已介绍数据与通知分开传输、读取后发送 ack，以及不同数据平面。本章不重复传输路线，转而跟踪句柄和生命周期记录。源码核对版本为 `sglang-omni origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`；DataRef 的具体字段与调用链从下一步开始列出。

### 接下来

第 2 步回答：数据在另一个进程或设备时，一个 DataRef 怎样让读者找到它。

## 第 2 步 · DataRef 是找数据的小卡片

> **一句话：** DataRef 用 `object_id`、`transport` 和 `buffer` 描述怎样找到数据，tensor 字节仍留在后端，不装进这张卡片。

### 图上是什么

- 左框是发送方后端，蓝色大块是数据 A 的 tensor 字节。中间白框是 DataRef，右框是接收方 `talker_ar`。
- 本例的卡片有四行：`version = 1` 是线格式版本，`object_id = A` 是数据对象的名字，`transport = SHM` 指定传输后端，`buffer = info + length` 保存后端返回的读取信息和字节长度。
- 卡片和数据之间的箭头表示「描述这份数据」，不是把 tensor 字节复制进卡片。卡片到接收方的箭头表示读者拿到描述后可以找到 A。
- 图只列出找数据最需要看的字段。`kind`、`layout`、`header`、`tensors` 等字段继续描述数据种类、布局和 tensor 还原方式，不在这张简图里展开。

### 卡片字段怎样接起来

| 字段 | 本例 | 读者用它做什么 |
|---|---|---|
| `version` | 1 | 按第 1 版线格式解析卡片 |
| `object_id` | A | 确认要读的数据对象 |
| `transport` | SHM | 选择 SHM relay |
| `buffer.info` | 后端返回的信息 | 找到后端里的数据 |
| `buffer.length` | 数据的字节长度 | 准备足够的接收空间 |

`BackendRef` 的 `length` 来自 relay 操作的 `op.metadata["transfer_info"]["size"]`。所以 `length` 是后端报告的字节数，不是 tensor 个数，也不是本例另造的容量。

### DataRef 没有什么

DataRef 的字段里没有 reader 数、引用计数或 ACK 状态。它只是一个可序列化的数据描述符，不应被画成会自动跟踪所有读者的智能指针。发送方在发布时另建生命周期记录，下一步专门讲这张记录。

同一数据要发给多个 target 时，发送路径逐 target 调用，每个 target 有自己的发送与 Pending/ACK 生命周期；这不是一个 DataRef 自带的多读者引用计数。

### transport 从哪里来

Router 在创建 DataRef 之前按两端位置和数据设备选路。普通 payload 可以使用 `LOCAL_OBJECT`、`MOONCAKE`、`CUDA_IPC` 或 `SHM`；完整 payload 还会扫描 tensor 设备，纯 CPU 走 SHM，不支持的组合会报错。本例固定画 SHM，只讲卡片如何记录选择结果，不展开四种数据平面。

`LOCAL_OBJECT` 是同进程旁路，没有 relay。直接 PyTorch CUDA IPC 也不进入后面的通用 get/ACK 链，因此本章的后续图只针对通用 relay 路径。

### 源码出处

- `sglang_omni/comm/data_ref.py:117-133`：DataRef 字段；`40-67`：`TensorMeta`；`70-99`：`BackendRef` 和字节长度；`135-216`：线格式、版本 1 与字段校验。
- `sglang_omni/comm/router.py:215-252`：普通 payload 选路；`263-299`：relay 创建与 `LOCAL_OBJECT` 无 relay；`301-320`：tensor 设备扫描。
- `sglang_omni/pipeline/stage/runtime.py:774-790`：直接 PyTorch CUDA IPC 旁路；`1939-1954`：逐 target 发送。

以上行号对应 `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`。

### 接下来

第 3 步把这张卡片发布给读者，同时在发送方建立一张等待 ACK 的 `PendingTransfer` 记录。

## 第 3 步 · 发布时另留一张等待回执的记录

> **一句话：** 数据写入 relay 后，发送方按 `object_id` 登记 `PendingTransfer`，再发布 DataRef；`send_payload()` 返回仍不表示接收方已经读取。

### 图上是什么

- 第 1 格是已经写入数据 A 的 `RelayOperation`。写入完成不等于操作已经收尾，蓝色数据仍由这次传输使用。
- 第 2 格是发送方的 `pending[A]`。本图列出 `ops` 和仍在等待的 `ack`，键 `A` 对应 DataRef 的 `object_id`。
- 第 3 格是发给 `talker_ar` 的 `DataReady` 控制消息，里面带序列化后的 DataRef。箭头只表示通知发出，不表示数据已被读取。
- 最下面的 `send_payload()` 状态把「写入 + 通知完成」与「接收方已读取」分开。图中没有画 scheduler 或业务计算。

### 实际调用顺序

| 顺序 | 做什么 | 留下什么 |
|---|---|---|
| 1 | `stage_io.write_payload()` 抽取并打包 tensor，调用 relay 的 put | DataRef 和仍存活的 `RelayOperation` |
| 2 | `publish_data_ready()` 以 `object_id` 为键登记 `PendingTransfer` | operations、ACK future 及 watcher 所需状态 |
| 3 | 发送 `DataReadyMessage(data_ref=data_ref.to_dict())` | 接收方可解析的 DataRef |
| 4 | 控制消息发出后启动 `watch_pending()` | 等待 ACK 的后台任务 |
| 5 | worker 完成 `job.ready` | 等待中的 `send_payload()` 可以返回 |

SHM 使用 `put_chunks_async()`，其他 relay 使用 `put_async()`。两种 put 都返回异步操作及接收端所需元数据；put 完成不是接收方消费完成。

### PendingTransfer 记什么

通用记录保存 `ops`、`ack` future、可选的 KV lease、watcher task 和终态标志。ACK 状态在这张发送方记录里，不在 DataRef 里。正常路径的后续清理由 watcher 等待 ACK 后推动，第 5 步展开。

如果同一数据发给多个 target，每个 target 走自己的发送与 Pending/ACK 生命周期。本图只画 A 发给一个 `talker_ar` 的路径。

### 源码出处

- `sglang_omni/comm/stage_io.py:496-534`：写入 payload、构造 DataRef、返回 operation。
- `sglang_omni/comm/relay/base.py:91-145`：relay 的 put/get 接口和异步操作契约。
- `sglang_omni/comm/engine.py:68-75`：`PendingTransfer` 字段；`222-270`：`send_payload()` 等待 `ready`；`1011-1038`：worker 写入；`1052-1061`：完成 `job.ready`；`1125-1208`：登记 pending、发送 DataReady、启动 watcher。

行号对应 `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`。

### 接下来

第 4 步从接收方收到 DataReady 开始：按 DataRef 读取、重建 payload，读完后发送 ACK。

## 第 4 步 · 读完先回 ACK，再交给 scheduler

> **一句话：** 接收方按 DataRef 选择 relay，取回字节并重建 payload；读取结束后发送 ACK，随后才把 payload 交给 input handler。

### 图上是什么

- 第 1 格解析 DataRef，按 `transport` 选择 relay，并使用 `buffer.info` 找到后端数据。
- 第 2 格按 `buffer.length` 准备 `uint8` 接收空间，调用 `get_async()`，再等待读取完成。
- 第 3 格按 `TensorMeta` 的 `path/shape/dtype/device/offset/size` 还原 tensor 和 payload。图中只写出与切片、形状和设备直接相关的几项。
- 第 4 格是成功 ACK：`object_id = A`、`success = true`。ACK 回发送方，还原的数据则继续交给 input handler，之后才轮到 scheduler。
- 图的顺序是「读取完成 → ACK → input handler」。ACK 不表示 `talker_ar` 已完成计算，更不表示整个请求已结束。

### 一条通用接收链

| 顺序 | 调用或消息 | 本步得到什么 |
|---|---|---|
| 1 | 收到 `DataReadyMessage`，反序列化 DataRef | 对象、传输方式和后端描述 |
| 2 | `CommEngine.read_data()` | 按 transport 选择 relay 并读取 |
| 3 | `relay.get_async(buffer.info, dest_tensor)` 后等待完成 | 接收空间里的字节 |
| 4 | 按 tensor 元数据切片并恢复 payload | 可交给本 stage 的数据对象 |
| 5 | `DataAckMessage(object_id=A, success=true)` | 发送方可匹配的读完回执 |
| 6 | input handler 接收 payload | 后续 scheduler 输入 |

失败读取也会回 ACK，但 `success=False` 并带错误信息；随后执行 cleanup 并上报 stage failure。这样的 ACK 表示读取已经终止且失败，不能被理解为成功消费。

### cleanup 不等于统一释放发送方数据

重建后调用的 `relay.cleanup(request_id)` 是 request 级后端清理钩子，Router 对 active relays 逐个调用它。不能把这个名字统一解释为「删除 sender 数据」或「所有后端立即释放内存」。正常发送方资源的收尾仍由下一步的 ACK watcher 和具体 `RelayOperation` 完成。

### 源码出处

- `sglang_omni/pipeline/stage/runtime.py:794-801`：取出 DataRef、选择 relay、调用 `read_data()`；`802-812`：失败 ACK、cleanup 和 failure；`813-817`：成功 ACK 后交给 input handler。
- `sglang_omni/comm/stage_io.py:826-842`：按字节长度分配接收空间、get 并等待；`537-568`：重建 payload 和 tensor、调用 cleanup。
- `sglang_omni/proto/messages.py:235-273`：`DataAckMessage` 的 `object_id`、`success` 和错误字段。
- `sglang_omni/comm/router.py:409-418`：request 级 relay cleanup。

行号对应 `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`。

### 接下来

第 5 步回到发送方：按 ACK 的 `object_id` 找到 pending，完成 operation，再删除生命周期记录。

## 第 5 步 · ACK 让 operation 收尾，记录才可删除

> **一句话：** 发送方按 `object_id` 完成 pending 的 ACK future，watcher 再通知并等待各个 operation 收尾，最后删除记录；具体后端决定怎样回收资源。

### 图上是什么

- 第 1 格收到 `DataAck(A)`。`ack_transfer()` 用 A 找到 `pending[A]`，成功 ACK 会把这张记录里的 ACK future 置为完成。
- 第 2 格是 `watch_pending()` 的正常路径：先对每个 operation 调 `mark_receiver_done()`，再逐个 `wait_for_completion()`。
- 第 3 格的 `pending: no A` 表示生命周期记录已删除。「后端可以回收」不是统一的立即释放动画；SHM block、CUDA slot 或其他资源由具体后端 operation 处理。
- 最下面强调通用层没有统一 `release()` 方法。通用接口提供 put/get/cleanup/close 和 operation 完成通知，具体资源语义留在 relay 实现里。

### 正常完成链

| 顺序 | 动作 | 结果 |
|---|---|---|
| 1 | `ack_transfer()` 按 `ack.object_id` 查 pending | 找到这次传输的等待记录 |
| 2 | 成功 ACK 完成 `pending.ack` | watcher 可以继续 |
| 3 | 每个 `op.mark_receiver_done()` | 通知具体 operation：接收方已读完 |
| 4 | 每个 `op.wait_for_completion()` | 等待具体后端收尾 |
| 5 | `pending.pop(object_id)` | 删除发送方生命周期记录 |
| 6 | 若有 KV lease，执行 `lease.release()` | 释放这项额外租约 |

收到找不到 pending 的 stale ACK 时直接忽略。失败 ACK 则把异常写入 `pending.ack`，不会让正常成功链假装通过。

### 失败与保留边界

普通失败路径调用 `mark_receiver_failed()` 并等待 operation 收尾。若 KV 传输标记了 `retain_pending_on_failure`，且尚未收到 receiver terminal，watcher 会保留 pending，因为对端仍可能读取，不能过早释放资源。

因此，本章图的「后端可以回收」只描述正常通用路径允许收尾，不承诺所有后端、所有失败场景都立即释放同一块内存。

### 源码出处

- `sglang_omni/pipeline/stage/runtime.py:539-557`：接收 `DataAckMessage` 并进入 `ack_transfer()`。
- `sglang_omni/comm/engine.py:930-971`：按 `object_id` 匹配 pending、忽略 stale ACK、完成或失败 ACK future；`1210-1224`：正常 operation 完成链；`1260-1268`：删除 pending 和释放可选 lease；`1225-1259`、`1290-1313`：失败与保留路径。
- `sglang_omni/comm/relay/base.py:91-153`：relay 与 operation 的通用接口，没有统一 `release()`。

行号对应 `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`。

### 接下来

现在可以回答章首问题：DataRef 帮读者找数据，pending 帮发送方等读取结束，ACK 和 operation 完成链把可回收时间推迟到读取之后。若读者比发送方慢，资源会被占用更久；下一章用队列和背压解释怎样连接快慢不同的 stage。
