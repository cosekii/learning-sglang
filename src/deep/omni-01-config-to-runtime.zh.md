## 第 1 步 · 五个 GPU stage，一份显存预算

> **一句话：** 配置把一块 GPU 声明预算的 94% 分给五个 stage，还有 6% 未分配。

### 图上是什么

本步复习第 1 本 Ch.17 的 stage 名字和 Ch.19 Step 3 的五份显存份额，不再介绍这些模型部件的职责。

- 左框照录 YAML 文件里的五个 `gpu_memory_fraction` 字段。
- 右边 100 个格子，每格代表这块 GPU 声明预算的 1%。蓝格分给这五个 stage，白格尚未分配。
- 同一张七 stage 拓扑里还有 `preprocessing` 和 `decode` 两个 CPU stage。它们不是漏画，而是这里没有声明 GPU 比例。

### 代入图上的数

| stage | YAML 比例 | 百分比 |
|---|---:|---:|
| `image_encoder` | 0.02 | 2% |
| `audio_encoder` | 0.02 | 2% |
| `thinker` | 0.78 | 78% |
| `talker_ar` | 0.10 | 10% |
| `code2wav` | 0.02 | 2% |

小数换成百分比要乘 100：`0.02 × 100 = 2%`。然后 `2 + 2 + 78 + 10 + 2 = 94%`，所以 `100 - 94 = 6%` 尚未分配。placement 按每块 GPU 累加并检查这些比例；它们不是实测占用。

### 配置接下来怎样运行

`serve --config` 把 YAML 读成 patches，解析出经过校验的 pipeline 配置，再交给多进程 runner。runner 生成进程计划；每个子进程拿到 `gpu_id` 和 `total_gpu_memory_fraction`，创建自己的 scheduler。

### 边界与出处

这里只静态核算一个 colocated worker，不是 H100 实测。CI 可以在外部 router 后启动两个独立 worker；本图只画其中一个 worker 看到的 GPU 0。为了只讲 GPU 预算，本步也省略两个 CPU stage。

以下来源位于 `sglang-omni origin/main@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`：

- 五个比例：`examples/configs/qwen3_omni_colocated_h100_bf16.yaml:7-20`。
- 默认 GPU 位置与七 stage 拓扑：`sglang_omni/models/qwen3_omni/config.py:192-199`、`sglang_omni/models/qwen3_omni/config.py:268-318`、`sglang_omni/models/qwen3_omni/config.py:499-521`。
- 同卡 placement 与逐卡预算检查：`sglang_omni/models/qwen3_omni/placement.py:122-144`、`sglang_omni/config/placement.py:252-285`。
- YAML 加载与运行对象创建：`sglang_omni/config/sources.py:407-460`、`sglang_omni/config/resolver.py:54-91`、`sglang_omni/pipeline/runtime_config.py:123-172`、`sglang_omni/pipeline/stage_workers.py:1298-1326`。

### 接下来

后面几步把更多配置字段接到 stage、进程、设备和请求路线图。

## 第 2 步 · 七个 stage，六个进程

> **一句话：** 这份配置把 `talker_ar` 和 `code2wav` 放进同一个进程，所以七个 stage 只启动六个 stage 进程。

### 图上是什么

- 左边是模型拓扑里的七个 stage，顺序与源码构造顺序相同。
- 右边每框是一个 stage 进程。前五个进程各装一个 stage；蓝框里的 `talker_ar` 进程装两个 stage。
- `CPU` 表示该进程没有 stage 分到 GPU；`GPU 0` 表示框里的 stage 都使用第 1 步的同一块 GPU。
- 这里只数 stage 进程，不把启动它们的父进程算进去，也没有在本机启动模型。

### 代入图上的数

前五个进程各装一个 stage，最后一个进程装两个：

$$1 + 1 + 1 + 1 + 1 + 2 = 7\ \text{个 stage}$$

$$5 + 1 = 6\ \text{个 stage 进程}$$

这里减少的一个进程来自两 stage 合住，不是少了一个 stage。第 1 步的五份 GPU 显存预算仍然都在：`code2wav` 只是改与 `talker_ar` 同住的进程，仍留在 GPU 0。

### 配置怎样变成进程

`COLOCATED_SPEECH_PROCESSES` 先给每个 stage 指定 `process` 名字；其中 `code2wav` 与 `talker_ar` 都写成 `talker_ar`。topology 按这个名字分组，同组 stage 进入一个 `StageWorkerProcessSpec`，runner 为每组创建一个 stage 进程。

### 边界与出处

以下来源位于 `sglang-omni origin/main@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`：

- 七 stage 及其构造顺序：`sglang_omni/models/qwen3_omni/config.py:268-302`。
- 默认进程名单与 `code2wav` 合入 `talker_ar`：`sglang_omni/models/qwen3_omni/config.py:305-318`。
- 同卡配置把 `thinker_gpu` 和 `talker_gpu` 都设为 0：`sglang_omni/models/qwen3_omni/config.py:499-521`；`preprocessing`、`decode` 的构造函数没有 `gpu` 参数，见 `sglang_omni/models/qwen3_omni/config.py:57-87`、`sglang_omni/models/qwen3_omni/config.py:192-199`。
- 按 `process` 名字组成进程组：`sglang_omni/config/topology.py:365-382`。
- 每组生成一个进程规格：`sglang_omni/pipeline/mp_runner.py:244-260`；每个规格启动一个子进程：`sglang_omni/pipeline/stage_workers.py:422-456`。

### 接下来

下一张图把第 2 步的六个进程按 GPU 和 CPU 分组。

## 第 3 步 · 四个进程用 GPU，两个只用 CPU

> **一句话：** 第 2 步的六个进程按设备分组后，四个使用 GPU 0，两个只用 CPU，合计仍是六个。

### 图上是什么

- 这里的「设备」指 GPU 或 CPU；本步只按这一件事把第 2 步的六个进程分组。
- 蓝框中有四个进程，都使用第 1 步的同一块 GPU 0；`GPU 0` 是这块卡的编号，不是四块卡。
- 灰框中的 `preprocessing` 和 `decode` 没有 GPU 设置，只在 CPU 上运行。
- 一框仍是一个进程。`talker_ar` 框里虽然列了 `talker_ar` 和 `code2wav` 两个 stage，也只算一个进程。
- 蓝色只标出使用 GPU 0 的组和进程；灰色标出只用 CPU 的组和进程。

### 代入图上的数

| 设备 | 进程 | 进程数 |
|---|---|---:|
| GPU 0 | `image_encoder`、`audio_encoder`、`thinker`、`talker_ar` | 4 |
| 只用 CPU | `preprocessing`、`decode` | 2 |

$$4 + 2 = 6\ \text{个进程}$$

这里数的是进程，不是 stage。四个 GPU 进程共装五个 GPU stage，因为 `talker_ar` 进程装两个；两个 CPU 进程各装一个 stage。

### 配置怎样决定设备

同一份 colocated 配置把 `thinker_gpu` 和 `talker_gpu` 都设为 0。`image_encoder`、`audio_encoder`、`thinker` 和 `code2wav` 使用 `thinker_gpu`，`talker_ar` 使用 `talker_gpu`，所以它们都落到 GPU 0。`preprocessing` 和 `decode` 的构造函数没有 `gpu` 参数。topology 再按第 2 步的进程分组，为每组解析设备。

### 边界与出处

本步仍只读一份 colocated 配置，没有在本机启动模型或测量 CPU、GPU 占用。以下来源位于 `sglang-omni origin/main@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`：

- 七个 stage 的设备参数：`sglang_omni/models/qwen3_omni/config.py:268-302`。
- 两个 GPU 参数都设为 0：`sglang_omni/models/qwen3_omni/config.py:499-521`。
- 两个 CPU stage 的构造函数没有 `gpu` 参数：`sglang_omni/models/qwen3_omni/config.py:57-87`、`sglang_omni/models/qwen3_omni/config.py:192-199`。
- 按进程分组并解析整组 GPU：`sglang_omni/config/topology.py:365-382`。

### 接下来

下一步沿 stage 之间的连接跟一条请求，看这些进程怎样组成请求路线。
