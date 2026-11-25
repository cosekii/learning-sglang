## Step 1 · Split first, then copy two speech processes

> **In one sentence:** First separate Chapter 1's shared `talker_ar` and `code2wav` stages into two processes, giving the default speech configuration seven total processes and GPU ids 0 and 1. Then add one copy of each, making nine total processes and GPU ids 0, 1, and 2; the copies can serve queued requests in parallel.

### What the picture shows

- The order is split first, then copy. Chapter 1 put `talker_ar` and `code2wav` in one shared process, giving six processes. The left panel first gives them separate processes: seven total processes and GPU ids 0 and 1 in the default speech configuration. The right panel then adds one copy of each: nine total processes and GPU ids 0, 1, and 2. This compares two configurations; it does not split a running process from Chapter 1.
- Each white box lists the same five stages with unchanged devices: `preprocessing` and `decode` use CPU; `image_encoder`, `audio_encoder`, and `thinker` use GPU 0.
- In this example every stage has its own logical process and `tp_size = 1`. One stage copy therefore also means one worker OS process. This is not a general rule for shared processes or tensor parallelism.
- Blue marks stages unchanged from the preceding layout; orange marks every change. The left panel gives both speech stages their own processes. The right panel highlights the two added copies and the GPU move for `code2wav` copy 1. The default has one `talker_ar` process and one `code2wav` process. The replica configuration has two of each.
- The left panel marks `talker_ar` with `GPU 0 → GPU 1`: it moves from Chapter 1's shared process on GPU 0 to the default speech configuration's GPU 1. In the right panel, `code2wav` copy 1 moves from the default GPU 0 to GPU 1; its added copy uses GPU 2. The added `talker_ar` copy also uses GPU 2. The GPU ids visible in the two layouts are therefore `0, 1` and `0, 1, 2`.

A **replica** copies a whole logical process. Here that process contains one stage. At admission, the coordinator chooses one copy of each replicated process for a request. The default round-robin policy can assign different requests to different copies.

The official topology guide says replicas mainly help under queueing and higher concurrency: the copies can serve queued requests in parallel instead of leaving every request to one process. At low concurrency they can be slightly slower because the parallelism gain does not cover routing and process overhead. This is why the step uses a queueing scenario; it does not claim that replication always speeds up this Qwen configuration.

### The numbers on the stage

The logical stage list never changes:

$$S=7$$

One one-stage process per stage gives the default count:

$$N_{\text{default}}=5+1+1=7$$

The replica configuration adds one process for each of the two named stages:

$$N_{\text{replica2}}=5+2+2=9$$

The configured GPU ids, excluding CPU-only stages, are:

$$G_{\text{default}}=\{0,1\},\qquad |G_{\text{default}}|=2$$

$$G_{\text{replica2}}=\{0,1,2\},\qquad |G_{\text{replica2}}|=3$$

$S$ counts logical stage types. $N$ counts worker processes, equal to stage copies only in this one-stage-per-process example. $G$ is the set of configured GPU ids, and $|G|$ counts distinct ids. All values come from expanding the default model configuration and the replica2 YAML, not from a performance run.

### How the configuration expands

The YAML sets `num_replicas: 2` for the `talker_ar` and `code2wav` process groups and gives each group `replica_devices: [1, 2]`. Two is the total copy count. Expansion clones each whole logical process, names the instances `@r0` and `@r1`, and preserves the logical routes.

`replica_devices` overrides every GPU stage in the process, including copy 1 (`@r0`). This is why `code2wav` copy 1 moves from its default GPU 0 to GPU 1. Copy 2 (`@r1`) uses GPU 2. The other five stages are not in those process groups, so their devices stay unchanged.

### Scope and sources

This step does not explain the request-binding lifecycle, process grouping, tensor parallelism, or a speedup. The next chapter follows how a request chooses and releases a copy. This is also the non-colocated speech pipeline, not Chapter 1's one-GPU colocated configuration.

Sources on `sglang-omni origin/main@48ee40b2563492de95efc952a0c7470db087d8a9`:

- [Seven stages and their default one-stage process names: `sglang_omni/models/qwen3_omni/config.py:268-313`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/models/qwen3_omni/config.py#L268-L313).
- [Default speech GPU 0 and GPU 1 placement: `sglang_omni/models/qwen3_omni/config.py:425-452`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/models/qwen3_omni/config.py#L425-L452).
- [The two process replicas and their devices: `examples/configs/qwen3_omni_speech_replica2.yaml:24-42`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/examples/configs/qwen3_omni_speech_replica2.yaml#L24-L42).
- [Whole-process replicas, request selection, GPU overrides, and the resolved layout: `docs/basic_usage/process_topology.md:55-84,200-228`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/docs/basic_usage/process_topology.md#L55-L84).
- [When replicas help and their low-concurrency cost: `docs/basic_usage/process_topology.md:278-288`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/docs/basic_usage/process_topology.md#L278-L288).
- [Process cloning, replica names, and GPU overrides: `sglang_omni/pipeline/replicas.py:153-268`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/pipeline/replicas.py#L153-L268).
- [Default `tp_size = 1`: `sglang_omni/config/schema.py:430-438`](https://github.com/sgl-project/sglang-omni/blob/48ee40b2563492de95efc952a0c7470db087d8a9/sglang_omni/config/schema.py#L430-L438).

### Next

The next step puts two speech stages in one process to distinguish grouping from copying. Chapter 3 then shows how a request chooses a replica, keeps that binding, and releases it.

## Step 2 · Two stages share one process

> **In one line:** `talker_ar` and `code2wav` each keep one stage and one scheduler, but move from two separate processes into one process named `talker_ar`. Their hand-off can use the in-process path.

### What the picture shows

- Both panels show the same `talker_ar → code2wav` route, drawing only these two of the seven stages. The stage and scheduler inside each blue box remain.
- Orange outlines mark process boundaries. The left panel has two, labeled `process: talker_ar` and `process: code2wav`. The hand-off crosses processes.
- The right panel has one orange outline labeled `process: talker_ar`. Each blue box keeps its own stage name, with no stage merged or copied. The hand-off can use the in-process path.
- Both panels end with `2 stages · 2 schedulers`, while the process count changes from two to one. GPU positions are omitted because grouping alone does not assign them.

### Formula

$$S=2,\qquad C=2$$

$$P=|\{\text{distinct process names}\}|$$

| Symbol | Meaning | Source |
|---|---|---|
| $S$ | Number of stages drawn | This step's `talker_ar` and `code2wav` |
| $C$ | Number of schedulers, one constructed per stage | Per-stage construction in `stage_workers.py` |
| $P$ | Number of OS processes for these non-TP stages | Count of distinct `StageConfig.process` names |

### The numbers on the stage

The left panel has two distinct process names, while the right has one:

$$P_{\text{separate}}=|\{\texttt{talker\_ar},\texttt{code2wav}\}|=2$$

$$P_{\text{shared}}=|\{\texttt{talker\_ar}\}|=1$$

Thus $S:2\to2$, $C:2\to2$, and $P:2\to1$. These are counts from configuration expansion, not performance measurements.

### How this differs from copying

Step 1 copied a whole process, adding stage copies. This step assigns the same process name to two existing stages, changing only their process membership. The stage list, one scheduler per stage, and the route remain.

Non-TP stages in one process share a Python heap, an asyncio event loop, and a local dispatch path. The picture says the path is available because the source selects `local_object` only when its conditions hold. This step does not claim that every payload uses one transport or that grouping improves speed.

### Scope and sources

This step covers only non-TP process grouping, not tensor parallelism or GPU placement. The real default and colocated speech configurations also change GPU positions, so this picture intentionally omits GPUs instead of attributing those changes to grouping.

Sources on `sglang-omni origin/main@92d72512197f9a0a4ef0583f8ea789cf50f316be`:

- [Same-name non-TP stages share an OS process and local path: `docs/basic_usage/process_topology.md:30-42`](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/docs/basic_usage/process_topology.md#L30-L42).
- [The two default process names and colocated `code2wav` joining `talker_ar`: `sglang_omni/models/qwen3_omni/config.py:305-318`](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/models/qwen3_omni/config.py#L305-L318).
- [Grouping by process name: `sglang_omni/config/topology.py:365-382`](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/config/topology.py#L365-L382).
- [One worker spec per group containing all member stages: `sglang_omni/pipeline/mp_runner.py:253-270`](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/pipeline/mp_runner.py#L253-L270).
- [One scheduler constructed for each stage: `sglang_omni/pipeline/stage_workers.py:1043-1051`](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/pipeline/stage_workers.py#L1043-L1051).
- [Conditions for same-process `local_object` hand-off: `sglang_omni/pipeline/stage/runtime.py:2000-2034`](https://github.com/sgl-project/sglang-omni/blob/92d72512197f9a0a4ef0583f8ea789cf50f316be/sglang_omni/pipeline/stage/runtime.py#L2000-L2034).

### Next

The next step shows how tensor parallelism lets one stage use multiple GPUs. Chapter 3 then follows how a request chooses and releases a replica.

## Step 3 · One stage uses two GPUs

> **In one line:** `thinker` remains one logical stage. With `tp_size = 2` and `gpu = [0, 1]`, it expands into two rank processes, each using one GPU to work on the same request.

### What the picture shows

- Both panels contain one logical `thinker` stage and request A. On the left, `tp_size = 1` gives one process on GPU 0. On the right, `tp_size = 2` gives two processes on GPUs 0 and 1. Behind this topology, each rank holds part of the model's weights: the learned numbers used during computation.
- Orange outlines are OS processes; each blue box keeps a stage and scheduler. The scheduler arranges the process's computation work. The right panel writes `thinker` twice because it shows two ranks of one logical stage, not two stages or two independent Step 1 replicas. A **rank** is a process number within the TP group.
- Request A first reaches process 1, rank 0. Process 1 distributes the same work to the other rank. Both ranks compute their local parts over the same input and exchange partial results during model execution. The arrow below the cards represents work distribution and cooperation, not a single exchange at the end.
- Each rank has its own OS process, scheduler and model runner. This minimal example has one TP process group, one replica and a distinct GPU per rank.

### Formula

$$S=1,\qquad P=C=T,\qquad |G|=T,\qquad T=\texttt{tp\_size}$$

| Symbol | Meaning | Source |
|---|---|---|
| $S$ | Number of logical stages | This step has only `thinker` |
| $T$ | Number of ranks in one TP group | `stages.thinker.tp_size` |
| $P$ | OS processes in this TP group | One expanded process per rank |
| $C$ | Number of schedulers | One constructed per rank |
| $G$ | GPU ids used by this TP group | `stages.thinker.gpu` |

These equalities describe only this single-group, single-replica example. $P$ does not count every model process, and $|G|$ does not count every GPU used by the complete service.

### The numbers on the stage

Left panel:

$$T=1,\qquad S=1,\qquad P=C=1,\qquad G=\{0\}$$

Right panel:

$$T=2,\qquad S=1,\qquad P=C=2,\qquad G=\{0,1\}$$

The logical stage count stays at one. Processes and schedulers change from one to two, while the GPU ids change from `{0}` to `{0, 1}`. Configuration expansion produces these counts; no performance run produced them.

### How this differs from copying

Step 1 copied whole independent processes so different replicas could handle different requests. This step divides one TP stage's weights and computation across ranks that handle the same request together. Both layouts add processes, so process count alone cannot distinguish them.

The picture does not claim exactly half the memory or twice the speed. Model structure constrains weight partitioning, other state and buffers need not divide evenly, and TP adds cross-rank communication. This step covers topology without measuring memory or latency.

### Scope and sources

The configuration first gives a TP stage its own logical process, then expands that logical process into $T$ OS processes. With `tp_size > 1`, `gpu` must list $T$ distinct GPU ids. The topology accepts a TP declaration only when the stage's model implementation also supports it. This example uses Qwen3-Omni's `thinker`, which exposes a TP path; it does not assume every stage supports TP.

The following sources use `sglang-omni origin/main@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`, plus its pinned SGLang version:

- [`tp_size` default and range: `sglang_omni/config/schema.py:405-438`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/config/schema.py#L405-L438); [TP GPU-list validation: `:511-529`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/config/schema.py#L511-L529).
- [A TP stage owns its logical process: `sglang_omni/config/schema.py:1294-1305`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/config/schema.py#L1294-L1305); [per-rank process names: `sglang_omni/config/topology.py:365-397`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/config/topology.py#L365-L397).
- [Rank, GPU and leader expansion: `sglang_omni/pipeline/mp_runner.py:449-530`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/mp_runner.py#L449-L530); [an independent process starts per rank: `stage_workers.py:422-477`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage_workers.py#L422-L477).
- [Per-rank stage construction: `stage_workers.py:886-903`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage_workers.py#L886-L903) and [scheduler construction: `:1043-1052`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/pipeline/stage_workers.py#L1043-L1052); [rank 0 handles external hand-offs and distributes work: `docs/developer_reference/config.md:369-381`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/docs/developer_reference/config.md#L369-L381).
- [`thinker` accepts and forwards `tp_size`: `sglang_omni/models/qwen3_omni/stages.py:1230-1237,1287-1288`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/sglang_omni/models/qwen3_omni/stages.py#L1230-L1237); [the `sglang==0.5.23` pin: `pyproject.toml:23-36`](https://github.com/sgl-project/sglang-omni/blob/52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84/pyproject.toml#L23-L36).
- In SGLang `v0.5.23` (commit `297e54fd105e974cdf401e5b4d20253a22c16f90`), [ColumnParallelLinear divides weights by `tp_size`: `python/sglang/srt/layers/linear.py:469-499`](https://github.com/sgl-project/sglang/blob/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/linear.py#L469-L499), and [RowParallelLinear performs local computation and all-reduce: `:1751-1756,1784-1811`](https://github.com/sgl-project/sglang/blob/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/linear.py#L1751-L1811). This step does not expand each layer's partitioning rule.

### Next

Chapter 3 returns to Step 1's independent replicas: how a request selects one, remains bound to it, and releases that binding after completion or cancellation.
