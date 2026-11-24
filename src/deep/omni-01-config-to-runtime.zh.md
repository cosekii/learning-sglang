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
