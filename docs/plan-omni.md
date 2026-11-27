# Learning SGLang Omni 规划

## 读法与边界

- 读者已读完第 1 本，尤其 Ch. 16–21。本书只往深处走：配置怎样变成部署、请求怎样绑定与退出、数据何时就绪与释放、资源怎样验证、性能怎样测量，以及具体模型怎样落地。
- `Omni/` 指 `~/code/sglang-omni`，本规划核对本地 `origin/main@5c23e73838`；`Awesome/` 指 `~/code/Awesome-ML-SYS-Tutorial`。写章时以代码和官方文档为准，Awesome 文章只作导读。深入讲解为每个结论写 `文件:行号`，数字先重新核对。
- 第 1 本已经展示的模型组件、stage 类型、四种传输路径、GPU 分配、流式窗口和 MiniCPM-o session 只引用对应 `Ch. X Step Y`，不重新讲一遍。
- 每章先用一张总图标出本章在请求链路中的位置。除全书最后一章外，章末问题由下一章回答；最后一章收束全书。

## 部分

- `runtime`（第 1–5 章）：从配置生成部署图，跟随请求和数据走完生命周期。
- `performance`（第 6–10 章）：控制排队与显存，测量等待，再优化 AR、encoder 和 vocoder。
- `models`（第 11–13 章）：把前面的机制用到 Fish S2 Pro、全双工和 Qwen3-Omni 部署。
- `serving`（第 14–15 章）：部署开始服务后，限制交付积压，再选择 worker；最后分清一次响应的清理和后续健康资格。

## 章节表

| 章 | part | slug | 标题 | 一句 hook | 回答的问题 | 前置 | 事实来源 | 章末引出 |
|---|---|---|---|---|---|---|---|---|
| 01 | `runtime` | `config-to-runtime` | 从配置到运行图 | 把 YAML 字段逐项接到 stage、进程、设备和路由。 | 一份配置怎样变成正在运行的请求路线？ | 第 1 本 Ch. 17 Steps 2–4 | `Omni/sglang_omni/config/{schema,topology,runtime}.py`；`Omni/sglang_omni/pipeline/mp_runner.py`；`Awesome/sglang/sglang-omni/README.md` | 同一模型图还能换哪些部署方式？ |
| 02 | `runtime` | `spg-topology` | Stage–Process–GPU 拓扑 | 同一 stage 图变成进程分组、多副本和 TP 三张部署图。 | 模型不变时，哪些部署旋钮可以独立调整？ | 第 1 章；第 1 本 Ch. 17 Step 3、Ch. 19 Step 2 | `Omni/sglang_omni/config/{topology,placement}.py`；`Omni/sglang_omni/pipeline/replicas.py`；`Omni/examples/configs/qwen3_omni_speech_replica2.yaml`；`Awesome/sglang/sglang-omni/spg-topology.md` | 请求进入多副本后，固定去哪一组？ |
| 03 | `runtime` | `request-binding` | 请求绑定与退出 | 跟着一个 request id 走过选副本、双终态和 abort。 | 请求怎样固定到一组副本，完成或取消时怎样释放所有权？ | 第 2 章；第 1 本 Ch. 18 Step 10 | `Omni/sglang_omni/pipeline/{coordinator,replicas,control_plane,sessions}.py`；`Omni/sglang_omni/comm/engine.py` | 绑定完成后，下游什么时候才能开始算？ |
| 04 | `runtime` | `readiness-contracts` | 三种就绪规则 | 把一次交接、可缓冲流和逐步反馈画成三种等待线。 | 下游何时能继续，上游何时必须等结果？ | 第 3 章；第 1 本 Ch. 17 Steps 5–11 | `Omni/sglang_omni/pipeline/stage/{input,runtime,stream_queue}.py`；`Omni/sglang_omni/scheduling/pipeline_state.py`；`Omni/sglang_omni/models/qwen3_omni/talker_scheduler.py`；`Awesome/sglang/sglang-omni/spg-topology.md` | 可以开始算以后，数据在哪里，何时释放？ |
| 05 | `runtime` | `data-lifetime` | 数据引用与回收 | 跟着 DataRef 看发布、读取、ack 和释放。 | 数据放在另一个进程或设备时，怎样保证读完才回收？ | 第 4 章；第 1 本 Ch. 18 Steps 2–8 | `Omni/sglang_omni/comm/{data_ref,engine,router}.py`；`Omni/sglang_omni/relay/base.py`；`Awesome/sglang/sglang-omni/spg-topology.md` | 数据有快有慢，队列怎样避免拖住整条链路？ |
| 06 | `performance` | `batching-backpressure` | 排队、batch 与背压 | 比较 AR、encoder、vocoder 的队列，看 batch 和背压怎样改变等待。 | 什么时候 batch 能填上 GPU，什么时候只增加排队？ | 第 5 章；第 1 本 Ch. 17 Step 7 | `Omni/sglang_omni/scheduling/{generation_batch_policy,reference_encoder,streaming_vocoder}.py`；`Omni/sglang_omni/admission.py`；`Omni/docs/basic_usage/omni_router.md`；`Awesome/sglang/sglang-omni/{batch,cpu-first-class-citizen-zh}.md` | 更多 batch 和副本需要多少显存？ |
| 07 | `performance` | `shared-gpu-budgets` | 同卡显存预算 | 把权重、KV、流缓冲和副本逐格装进一张卡。 | 同卡分组、副本、权重共享和 offload 怎样通过显存校验？ | 第 2、6 章；第 1 本 Ch. 19 Steps 2–5 | `Omni/sglang_omni/config/placement.py`；`Omni/sglang_omni/pipeline/weight_share.py`；`Omni/sglang_omni/mps/runtime.py`；`Omni/sglang_omni/scheduling/stage_kv_budget.py`；`Omni/sglang_omni/models/auk/offload_scheduler.py`；`Awesome/sglang/sglang-omni/spg-topology.md` | 换配置以后，怎样知道它真的变快了？ |
| 08 | `performance` | `measure-streaming` | 测量首音与卡顿 | 在同一条时间线上标出首音、chunk 间隔、CPU 和 GPU 等待。 | 一次优化缩短了哪段等待，实验有没有混入别的变化？ | 第 6、7 章；第 1 本 Ch. 20 Steps 1–3 | `Omni/benchmarks/eval/benchmark_omni_streaming_ttft.py`；`Omni/sglang_omni/profiler/comm_trace.py`；`Omni/docs/developer_reference/omni_offline_bench.md`；`Awesome/sglang/sglang-omni/batch.md` | 找到等待后，AR 和 encoder 先省掉哪段工作？ |
| 09 | `performance` | `ar-stage-optimization` | AR 与编码器优化 | 逐项开关 cache、async decode 和 CUDA Graph，看省掉哪段工作。 | encoder cache、single-flight、异步 decode 和 CUDA Graph 各自优化什么？ | 第 8 章 | `Omni/sglang_omni/scheduling/{reference_encoder,speaker_cache}.py`；`Omni/sglang_omni/scheduling/sglang_backend/output_processor.py`；`Omni/sglang_omni/models/qwen3_omni/components/audio_layer_graph.py`；`Awesome/sglang/sglang-omni/tts-optimization-zh.md`；`Awesome/sglang/sglang-omni/moss-tts-local-v15-blog-zh.md` | AR 已交出 frames，vocoder 怎样不拖住播放？ |
| 10 | `performance` | `vocoder-optimization` | 流式 vocoder 优化 | 把跨请求 batch、保留的 codec 状态和 CUDA Graph 放到同一条音频播放线。 | 跨请求 batching、保留 codec 状态和 CUDA Graph 分别省掉哪段工作？ | 第 9 章；第 1 本 Ch. 20 Steps 4–6 只回指 window 权衡 | `Omni/sglang_omni/scheduling/{audio_vocoder,streaming_vocoder}.py`；`Omni/sglang_omni/models/qwen3_omni/components/{code2wav_scheduler,code2wav_cuda_graph,incremental_codec}.py`；`Omni/sglang_omni/models/fishaudio_s2_pro/streaming_vocoder.py`；`Awesome/sglang/sglang-omni/tts-optimization-zh.md` | 这些机制在 Fish S2 Pro 的 Dual-AR 里怎样组合？ |
| 11 | `models` | `fish-s2-pro` | Fish S2 Pro：Dual-AR 落地 | 把 Slow AR 与 Fast AR 的两层循环画进一次语音请求。 | Dual-AR 怎样复用 SGLang 的 KV cache，又怎样接参考音频和流式 vocoder？ | 第 9、10 章 | `Omni/docs/cookbook/fishaudio_s2_pro.md`；`Omni/sglang_omni/models/fishaudio_s2_pro/{README.md,config.py,model_runner.py,streaming_vocoder.py}`；`Omni/examples/configs/s2pro_tts.yaml`；`Awesome/transformers/omni/readme.md` | 输入也持续到达时，session 怎样保留上下文并处理打断？ |
| 12 | `models` | `full-duplex-strategies` | 全双工策略与测量 | 用同一次打断比较 turn-based、streaming cascade 和 native full-duplex。 | 三种策略各自保留什么状态，打断与回话怎样测量？ | 第 3、6 章；第 1 本 Ch. 21 Steps 1–8 | `Omni/docs/developer_reference/full_duplex_guide.md`；`Omni/docs/basic_usage/omni.md`；`Omni/sglang_omni/pipeline/{session_graph,sessions}.py`；`Omni/sglang_omni/serve/realtime/manager.py`；`Omni/sglang_omni/profiler/duplex_metrics.py` | 怎样把部署、预算和测量一起用到完整的 Qwen3-Omni？ |
| 13 | `models` | `qwen3-omni-deployment` | Qwen3-Omni 部署调优 | 从官方配置生成一条可检查的 Qwen3-Omni 部署方案。 | 文本或语音、单卡或多卡、精度和并发应该怎样一起选？ | 第 1、2、7、8 章；第 1 本 Ch. 16 Steps 1–5 | `Omni/docs/cookbook/qwen3_omni.md`；`Omni/sglang_omni/models/qwen3_omni/{config,placement}.py`；`Omni/examples/configs/qwen3_omni_colocated_h100_bf16.yaml`；`Omni/examples/configs/qwen3_omni_speech_replica2.yaml` | 部署开始服务后，客户端读得太慢会发生什么？ |
| 14 | `serving` | `slow-reader-backpressure` | 客户端读得太慢 | 生成结束后，声音仍可能排在 API 进程里；共享字节上限决定哪些流失败。 | 为什么完成的请求仍占内存，慢读者攒满共享积压后谁先失败？ | 第 3 章第 3 步、第 6 章第 7–8 步、第 8 章第 3 步、第 13 章第 8 步 | `Omni/docs/cookbook/qwen3_tts/tuning.md`；`Omni/sglang_omni/pipeline/coordinator.py`；`Omni/sglang_omni/serve/speech_streaming.py`；`Omni/tests/unit_test/pipeline/test_coordinator.py` | 一个 API 进程能管自己的积压；两个 worker 共用一个网址时，下一个请求给谁？ |
| 15 | `serving` | `router-worker-selection` | 给请求选 worker | 把 worker 能力、健康检查、服务类别和当前请求数画成路由地图。 | router 怎样过滤不兼容或不健康的 worker，再按服务类别和容量选择？ | 第 2、6、14 章 | `Omni/docs/basic_usage/omni_router.md`；`Omni/sglang_omni_router/src/worker_pool/{mod,profile,health}.rs` | 收束：RESET 释放本次凭证，health probe 决定后续资格。 |

## 制作顺序

按 01 → 15 做，每轮一整章。第 1 章先画「配置字段 → 运行对象 → 请求路线」的总图，再拆每一步；后续章都回指这张图。具体模型章只使用已讲过的概念，新术语首次出现仍须按 `~/.orca/bots/learning-sglang/EVAL.md` 第 0 节解释。
