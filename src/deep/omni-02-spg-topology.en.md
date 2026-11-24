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

Chapter 3 shows how a request chooses a replica, keeps that binding, and releases it.
