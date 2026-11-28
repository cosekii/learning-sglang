## 第 1 步 · 先拆开，再复制两个语音进程

> **一句话：** 先把上一章共用的 `talker_ar` 和 `code2wav` 拆成两个进程，得到默认语音配置的 7 个进程，GPU 编号为 0、1；再各复制一份，得到 9 个进程，GPU 编号为 0、1、2。多份可以并行处理排队请求。

### 图上是什么

- 六个停驻相位依次展示「先拆、再复制」。第 1 章先有 5 个其他进程和 1 个语音共用进程，共 6 个，其中 GPU stage 使用 GPU 0。左图把语音共用进程拆成 `talker_ar` 和 `code2wav`，得到 7 个进程，GPU 编号为 0、1。右图先显示同样的 5 个其他 stage，再显示两个 stage 各自的第 1 份；加入 `talker_ar` 第 2 份后共有 8 个，加入 `code2wav` 第 2 份后共有 9 个。两个新增份都用 GPU 2。这些相位解释配置怎样展开，不表示拆开或复制正在运行的进程。
- 两个白框列出相同的五个 stage，设备位置不变：`preprocessing` 和 `decode` 用 CPU；`image_encoder`、`audio_encoder` 和 `thinker` 用 GPU 0。
- 本例每个 stage 都独占一个逻辑进程，并且 `tp_size = 1`。所以一份 stage 同时就是一个工作 OS 进程。共用进程或张量并行时不一定能这样画等号。
- 蓝色表示相对前一幅不变，橙色表示有变化。左图的两个语音 stage 都拆成独立进程；右图标出两个新增份和 `code2wav` 第 1 份的换卡。默认配置有一个 `talker_ar` 进程和一个 `code2wav` 进程，多副本配置把它们都从一份变成两份。
- 左图的 `talker_ar` 标出 `GPU 0 → GPU 1`：它从上一章共用进程的 GPU 0 挪到默认语音配置的 GPU 1。右图的 `code2wav` 第 1 份从默认配置的 GPU 0 挪到 GPU 1，新增份用 GPU 2；`talker_ar` 新增份也用 GPU 2。因此两种布局的 GPU 编号分别是 `0、1` 和 `0、1、2`。

**replica（副本）** 复制的是整个逻辑进程，本例这个进程里只有一个 stage。请求进来时，协调器会为它从每个多副本进程里选一份。默认的轮流分配策略可以把不同请求分给不同份。

只有 `talker_ar` 和 `code2wav` 有两份，包括 `thinker` 在内的另外 5 个 stage 仍各有一份。舞台脚注只说这两个有副本的 stage 可以并行处理两个请求，不表示复制整条请求流水线，也不承诺端到端耗时收益。

官方拓扑文档说，副本主要在排队和高并发时有帮助：多份可以并行处理排队请求，不必都交给一个进程依次处理。低并发时反而可能略慢，因为并行收益盖不住路由和进程开销。所以本步只讲排队场景，不声称这份 Qwen 配置一定提速。

### 代入图上的数

逻辑 stage 名单没有改变：

$$S=7$$

第 1 章的语音共用进程给出起始数量：

$$N_{\text{shared}}=5+1=6$$

默认每个 stage 各有一个单 stage 进程：

$$N_{\text{default}}=5+1+1=7$$

只加入 `talker_ar` 第 2 份时，中间数量为：

$$N_{\text{after talker copy}}=5+2+1=8$$

多副本配置给两个指定 stage 各添一个进程：

$$N_{\text{replica2}}=5+2+2=9$$

去掉只用 CPU 的 stage，配置用的 GPU 编号集合是：

$$G_{\text{default}}=\{0,1\},\qquad |G_{\text{default}}|=2$$

$$G_{\text{replica2}}=\{0,1,2\},\qquad |G_{\text{replica2}}|=3$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $S$ | 逻辑 stage 的种类 | 两种布局都是同样的 7 个 |
| $N$ | 工作进程数 | 停驻相位依次为 6、7、8、9 |
| $G,|G|$ | 配置的 GPU 编号集合及大小 | 不计只用 CPU 的 stage |

只有在本例这种一个进程一个 stage 的情况下，$N$ 才等于 stage 份数。这些数都来自默认模型配置和 replica2 YAML 的展开，不是性能实测。

### 配置怎样展开

YAML 给 `talker_ar` 和 `code2wav` 两个进程组都设置 `num_replicas: 2`，并给每组设置 `replica_devices: [1, 2]`。这里的 2 是总份数。程序复制整个逻辑进程，把实例命名为 `@r0` 和 `@r1`，保留原来的逻辑连线。

`replica_devices` 会覆盖进程里每个 GPU stage 的位置，第 1 份（`@r0`）也包括在内。所以 `code2wav` 第 1 份会从默认的 GPU 0 挪到 GPU 1，第 2 份（`@r1`）用 GPU 2。另外五个 stage 不在这两个进程组里，设备位置不变。

### 边界与出处

本步不讲请求绑定的完整过程、进程分组、张量并行，也不声称速度提升。下一章讲请求怎样选定并释放一份。这里讲的是非 colocated 语音流水线，不是第 1 章的单 GPU 同卡配置。

以下来源位于 sglang-omni<br><code>origin/<wbr>main@<wbr>48ee40b2563492de95<wbr>efc952a0c7470db087d8a9</code>：

- [七个 stage 和默认的单 stage 进程名：<code>sglang_omni/models/qwen3_omni/<wbr>config.py:268-313</code>](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/models/qwen3_omni/config.py#L268-L313)。
- [默认语音配置的 GPU 0 和 GPU 1：<code>sglang_omni/models/qwen3_omni/<wbr>config.py:425-452</code>](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/models/qwen3_omni/config.py#L425-L452)。
- [两个进程副本及设备：<code>examples/configs/<wbr>qwen3_omni_speech_replica2.yaml:24-42</code>](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/examples/configs/qwen3_omni_speech_replica2.yaml#L24-L42)。
- [整进程副本、请求选择、GPU 覆盖和最终布局：<code>docs/basic_usage/<wbr>process_topology.md:55-84,200-228</code>](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/docs/basic_usage/process_topology.md#L55-L84)。
- [副本何时有帮助及低并发代价：<code>docs/basic_usage/<wbr>process_topology.md:278-288</code>](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/docs/basic_usage/process_topology.md#L278-L288)。
- [复制进程、副本命名和 GPU 覆盖：<code>sglang_omni/pipeline/<wbr>replicas.py:153-268</code>](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/pipeline/replicas.py#L153-L268)。
- [默认 `tp_size = 1`：<code>sglang_omni/config/<wbr>schema.py:430-438</code>](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/config/schema.py#L430-L438)。

### 接下来

下一步把两个语音 stage 放进同一个进程，看共用进程和复制进程有什么区别。第 3 章再讲请求怎样选定一个副本、一直使用它，最后释放绑定。

## 第 2 步 · 两个 stage 共用一个进程

> **一句话：** `talker_ar` 和 `code2wav` 仍各有一个 stage 和一个 scheduler，只是从两个独立进程改到同一个名为 `talker_ar` 的进程，交接可以使用进程内路径。

### 图上是什么

- 左右两边是同一条 `talker_ar → code2wav` 路线。舞台写明只画 7 个中的 2 个 stage。scheduler 安排本 stage 的计算工作，每个蓝框仍各有一个 stage 和一个 scheduler。
- 动画先显示左图的交接和两个进程数，再在右图用一个共用边界装下同样的两个蓝框。最后一相才显示进程内路径和一个进程数。这些是对照配置的状态，不表示正在运行的进程现场合并。
- 橙框是进程边界。左图有两个橙框，分别写 `process: talker_ar` 和 `process: code2wav`；两个 stage 之间是跨进程交接。
- 右图只有一个橙框，里面写 `process: talker_ar`。两个蓝框仍各写自己的 stage 名，没有合并或复制 stage；交接可以使用进程内路径。
- 两边底部都是 `2 stages · 2 schedulers`，进程数从 2 变成 1。本图不画 GPU 位置；进程分组本身不决定 GPU 编号。

### 公式

$$S=2,\qquad C=2$$

$$P=|\{\text{不同的 process 名}\}|$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $S$ | 本图画出的 stage 数 | 本步的 `talker_ar`、`code2wav` |
| $C$ | scheduler 数；每个 stage 各构造一个 | `stage_workers.py` 的逐 stage 构造 |
| $P$ | 非 TP stage 的 OS 进程数 | 不同 `StageConfig.process` 名的数量 |

### 代入图上的数

左图有两个不同的进程名，右图只剩一个：

$$P_{\text{separate}}=|\{\texttt{talker\_ar},\texttt{code2wav}\}|=2$$

$$P_{\text{shared}}=|\{\texttt{talker\_ar}\}|=1$$

所以 $S:2\to2$，$C:2\to2$，$P:2\to1$。这些只是配置展开后的数量，不是性能实测。

### 这和复制有什么不同

第 1 步复制整个进程，会增加 stage 份数；本步给两个已有 stage 填相同的进程名，只改变它们的进程归属。stage 名单、每个 stage 的一份 scheduler 和二者的路线都保留。

同进程的非 TP stage 共用 Python heap、asyncio event loop 和 local dispatch path。图里写「可用」，是因为源码还会在满足条件时选择 `local_object`；这里不声称每次 payload 交接都走同一种传输，也不声称分组一定提速。

### 边界与出处

本步只讲非 TP 进程分组，不讲张量并行或 GPU placement。真实的默认语音配置和 colocated 配置还改变了 GPU 位置，所以本图有意不画 GPU，避免把设备变化算到进程分组头上。

以下来源位于 sglang-omni<br><code>origin/<wbr>main@<wbr>92d72512197f9a0a4<wbr>ef0583f8ea789cf50f316be</code>：

- [同名非 TP stage 共用 OS 进程和本地路径：<code>docs/basic_usage/<wbr>process_topology.md:30-42</code>](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/docs/basic_usage/process_topology.md#L30-L42)。
- [两个默认进程名，以及 colocated 配置把 `code2wav` 改到 `talker_ar`：<code>sglang_omni/models/qwen3_omni/<wbr>config.py:305-318</code>](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/models/qwen3_omni/config.py#L305-L318)。
- [按进程名分组：<code>sglang_omni/config/<wbr>topology.py:365-382</code>](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/config/topology.py#L365-L382)。
- [每组生成一个包含全部成员 stage 的 worker spec：<code>sglang_omni/pipeline/<wbr>mp_runner.py:253-270</code>](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/pipeline/mp_runner.py#L253-L270)。
- [每个 stage 分别构造 scheduler：<code>sglang_omni/pipeline/<wbr>stage_workers.py:1043-1051</code>](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/pipeline/stage_workers.py#L1043-L1051)。
- [`local_object` 的同进程交接条件：<code>sglang_omni/pipeline/stage/<wbr>runtime.py:2000-2034</code>](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/pipeline/stage/runtime.py#L2000-L2034)。

### 接下来

下一步看一个 stage 怎样通过张量并行使用多张 GPU；第 3 章再讲请求怎样选定并释放一个副本。

## 第 3 步 · 一个 stage 用上两张 GPU

> **一句话：** `thinker` 仍是一个逻辑 stage；`tp_size = 2`、`gpu = [0, 1]` 把它展开成两个 TP 进程，各用一张 GPU，一起处理同一个请求。

### 图上是什么

- 左右两边都只有 `thinker` 一个逻辑 stage 和请求 A。左图 `tp_size = 1`，一个进程使用 GPU 0；右图 `tp_size = 2`，两个进程分别使用 GPU 0、1。这个拓扑背后，每个 TP 进程各存一部分模型权重；权重是模型已经学好、计算时要用的数字。
- 橙框是 OS 进程，蓝框里的 stage 和 scheduler 都保留。scheduler 负责安排这个进程的计算工作。右边蓝框写了两次 `thinker`，但它们是同一个逻辑 stage 的两个 TP 进程，不是两个 stage，也不是第 1 步的两个独立副本。
- 动画先让请求 A 经过 TP1 进程。右图先形成 GPU 0 上的进程 1，再形成 GPU 1 上的进程 2，此时请求尚未进入。两个进程都形成后，请求 A 才进入进程 1，由进程 1 分活，让两个进程一起处理同一个请求。单向箭头只表示这次分活。两个 TP 进程在模型计算中还会交换部分结果，图中没有画这些后续交换。
- 每个 TP 进程各有一个 OS 进程、一个 scheduler 和一套 model runner。这个最小例子只有一个 TP 进程组、一个副本，并且每个 TP 进程使用一张不同的 GPU。

### 公式

$$S=1,\qquad P=C=T$$

$$|G|=T,\qquad T=\texttt{tp\_size}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $S$ | 逻辑 stage 数 | 本步只有 `thinker` |
| $T$ | 一个 TP 组的 TP 进程数 | 配置 `stages.thinker.tp_size` |
| $P$ | 这个 TP 组的 OS 进程数 | 每个 TP 进程展开一个 OS 进程 |
| $C$ | scheduler 数 | 每个 TP 进程各构造一个 |
| $G$ | 这个 TP 组使用的 GPU 编号集合 | 配置 `stages.thinker.gpu` |

这些等式只描述本步的单组、单副本例子。$P$ 不是完整模型所有进程的总数，$|G|$ 也不是完整服务使用的全部 GPU 数。

### 代入图上的数

左图：

$$T=1,\qquad S=1,\qquad P=C=1$$

$$G=\{0\}$$

右图：

$$T=2,\qquad S=1,\qquad P=C=2$$

$$G=\{0,1\}$$

所以逻辑 stage 仍是 1，进程和 scheduler 都从 1 变 2，GPU 编号从 `{0}` 变 `{0, 1}`。这些数由配置展开得到，不是性能实测。

### 这和复制有什么不同

第 1 步复制整个独立进程，不同副本可以处理不同请求。本步把一个 TP stage 的权重和计算分到多个 TP 进程，它们共同处理同一个请求。两种配置都会增加进程，不能只看进程数判断用了哪一种。

本图不声称显存恰好减半或速度翻倍。权重切分有模型结构约束，其他状态和缓冲区也不一定平分；TP 还需要在组内进程之间通信。这里只讲拓扑，不测量显存或延迟。

### 边界与出处

配置先让一个 TP stage 独占一个逻辑进程，再把这个逻辑进程展开成 $T$ 个 OS 进程；`tp_size > 1` 时，`gpu` 必须给出 $T$ 个不同的 GPU 编号。拓扑层允许声明 TP，但具体 stage 的模型实现也必须支持它。本例选用有 TP 入口的 Qwen3-Omni `thinker`，不把同一个例子套到所有 stage。

以下来源位于 sglang-omni<br><code>origin/<wbr>main@<wbr>52aab78e85f15da0e<wbr>85d1dbdee3bfe6ffc7cbc84</code>，另有其固定的 SGLang 版本：

- [`tp_size` 默认值与范围：<code>sglang_omni/config/<wbr>schema.py:405-438</code>](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/config/schema.py#L405-L438)；[TP 的 GPU 列表校验：同文件 `:511-529`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/config/schema.py#L511-L529)。
- [TP stage 独占 logical process：<code>sglang_omni/config/<wbr>schema.py:1294-1305</code>](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/config/schema.py#L1294-L1305)；[TP 进程名：<code>sglang_omni/config/<wbr>topology.py:365-397</code>](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/config/topology.py#L365-L397)。
- [TP 进程、GPU 和 leader 的展开：<code>sglang_omni/pipeline/<wbr>mp_runner.py:449-530</code>](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/mp_runner.py#L449-L530)；[每个 TP 进程启动独立 OS 进程：`stage_workers.py:422-477`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage_workers.py#L422-L477)。
- [每个 TP 进程构造 stage：`stage_workers.py:886-903`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage_workers.py#L886-L903) 和 [scheduler：同文件 `:1043-1052`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage_workers.py#L1043-L1052)；[进程 1 对外交接并分发工作：<code>docs/developer_reference/<wbr>config.md:369-381</code>](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/docs/developer_reference/config.md#L369-L381)。
- [`thinker` 接收并传递 `tp_size`：<code>sglang_omni/models/qwen3_omni/<wbr>stages.py:1230-1237,1287-1288</code>](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/models/qwen3_omni/stages.py#L1230-L1237)；[固定的 `sglang==0.5.23`：`pyproject.toml:23-36`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/pyproject.toml#L23-L36)。
- SGLang `v0.5.23`（commit <code>297e54fd105e974cdf40<wbr>1e5b4d20253a22c16f90</code>）的 [ColumnParallelLinear 按 `tp_size` 分权重：<code>python/sglang/srt/layers/<wbr>linear.py:469-499</code>](https://github.com/sgl-project/sglang/blob/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/linear.py#L469-L499) 和 [RowParallelLinear 的局部计算与 all-reduce：同文件 `:1751-1756,1784-1811`](https://github.com/sgl-project/sglang/blob/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/linear.py#L1751-L1811)。本步不展开各层具体切法。

### 接下来

第 3 章回到第 1 步的多个独立副本：请求怎样选定一份、一直绑定它，并在完成或取消后释放绑定。
