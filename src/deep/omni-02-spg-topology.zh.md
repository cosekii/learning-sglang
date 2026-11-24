## 第 1 步 · 先拆开，再复制两个语音进程

> **一句话：** 先把上一章共用的 `talker_ar` 和 `code2wav` 拆成两个进程，得到默认语音配置的 7 个进程，GPU 编号为 0、1；再各复制一份，得到 9 个进程，GPU 编号为 0、1、2。多份可以并行处理排队请求。

### 图上是什么

- 顺序是「先拆、再复制」：上一章的 `talker_ar` 和 `code2wav` 共用一个进程，合计 6 个进程；本章左图先让它们各占一个进程，得到默认语音配置的 7 个进程，GPU 编号为 `0、1`；右图才各添一份，得到 9 个进程，GPU 编号为 `0、1、2`。这里对照两种配置，不是把上一章正在运行的进程直接拆开。
- 两个白框列出相同的五个 stage，设备位置不变：`preprocessing` 和 `decode` 用 CPU；`image_encoder`、`audio_encoder` 和 `thinker` 用 GPU 0。
- 本例每个 stage 都独占一个逻辑进程，并且 `tp_size = 1`。所以一份 stage 同时就是一个工作 OS 进程。共用进程或张量并行时不一定能这样画等号。
- 蓝色表示相对前一幅不变，橙色表示有变化。左图的两个语音 stage 都拆成独立进程；右图标出两个新增份和 `code2wav` 第 1 份的换卡。默认配置有一个 `talker_ar` 进程和一个 `code2wav` 进程，多副本配置把它们都从一份变成两份。
- 左图的 `talker_ar` 标出 `GPU 0 → GPU 1`：它从上一章共用进程的 GPU 0 挪到默认语音配置的 GPU 1。右图的 `code2wav` 第 1 份从默认配置的 GPU 0 挪到 GPU 1，新增份用 GPU 2；`talker_ar` 新增份也用 GPU 2。因此两种布局的 GPU 编号分别是 `0、1` 和 `0、1、2`。

**replica（副本）** 复制的是整个逻辑进程，本例这个进程里只有一个 stage。请求进来时，协调器会为它从每个多副本进程里选一份。默认的轮流分配策略可以把不同请求分给不同份。

官方拓扑文档说，副本主要在排队和高并发时有帮助：多份可以并行处理排队请求，不必都交给一个进程依次处理。低并发时反而可能略慢，因为并行收益盖不住路由和进程开销。所以本步只讲排队场景，不声称这份 Qwen 配置一定提速。

### 代入图上的数

逻辑 stage 名单没有改变：

$$S=7$$

默认每个 stage 各有一个单 stage 进程：

$$N_{\text{default}}=5+1+1=7$$

多副本配置给两个指定 stage 各添一个进程：

$$N_{\text{replica2}}=5+2+2=9$$

去掉只用 CPU 的 stage，配置用的 GPU 编号集合是：

$$G_{\text{default}}=\{0,1\},\qquad |G_{\text{default}}|=2$$

$$G_{\text{replica2}}=\{0,1,2\},\qquad |G_{\text{replica2}}|=3$$

$S$ 数逻辑 stage 的种类，$N$ 数工作进程；只有在本例这种一个进程一个 stage 的情况下，$N$ 才等于 stage 份数。$G$ 是配置使用的 GPU 编号集合，$|G|$ 数不同编号的个数。这些数都来自默认模型配置和 replica2 YAML 的展开，不是性能实测。

### 配置怎样展开

YAML 给 `talker_ar` 和 `code2wav` 两个进程组都设置 `num_replicas: 2`，并给每组设置 `replica_devices: [1, 2]`。这里的 2 是总份数。程序复制整个逻辑进程，把实例命名为 `@r0` 和 `@r1`，保留原来的逻辑连线。

`replica_devices` 会覆盖进程里每个 GPU stage 的位置，第 1 份（`@r0`）也包括在内。所以 `code2wav` 第 1 份会从默认的 GPU 0 挪到 GPU 1，第 2 份（`@r1`）用 GPU 2。另外五个 stage 不在这两个进程组里，设备位置不变。

### 边界与出处

本步不讲请求绑定的完整过程、进程分组、张量并行，也不声称速度提升。下一章讲请求怎样选定并释放一份。这里讲的是非 colocated 语音流水线，不是第 1 章的单 GPU 同卡配置。

以下来源位于 `sglang-omni origin/main@48ee40b2563492de95efc952a0c7470db087d8a9`：

- [七个 stage 和默认的单 stage 进程名：`sglang_omni/models/qwen3_omni/config.py:268-313`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/models/qwen3_omni/config.py#L268-L313)。
- [默认语音配置的 GPU 0 和 GPU 1：`sglang_omni/models/qwen3_omni/config.py:425-452`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/models/qwen3_omni/config.py#L425-L452)。
- [两个进程副本及设备：`examples/configs/qwen3_omni_speech_replica2.yaml:24-42`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/examples/configs/qwen3_omni_speech_replica2.yaml#L24-L42)。
- [整进程副本、请求选择、GPU 覆盖和最终布局：`docs/basic_usage/process_topology.md:55-84,200-228`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/docs/basic_usage/process_topology.md#L55-L84)。
- [副本何时有帮助及低并发代价：`docs/basic_usage/process_topology.md:278-288`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/docs/basic_usage/process_topology.md#L278-L288)。
- [复制进程、副本命名和 GPU 覆盖：`sglang_omni/pipeline/replicas.py:153-268`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/pipeline/replicas.py#L153-L268)。
- [默认 `tp_size = 1`：`sglang_omni/config/schema.py:430-438`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/config/schema.py#L430-L438)。

### 接下来

第 3 章讲请求怎样选定一个副本、一直使用它，最后释放绑定。
