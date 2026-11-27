## 第 1 步 · 两种启动形态

> **一句话：** 同一个 Qwen3-Omni checkpoint，纯文字启动一卡一进程，默认语音启动两卡七进程。

### 图上是什么

- checkpoint 是服务器加载的一组已保存模型文件。
- 左边一个虚线框是 `pipeline` 进程，里面装着纯文字部署的全部六个 stage。
- 右边每个语音 stage 各住一个进程。四个进程用 GPU 0，一个用 GPU 1，两个只用 CPU。
- 蓝色是 GPU stage，白框灰边是 CPU stage。图中画的是启动形态，不是实测占用率。
- 两种部署都能输入文字、图像、声音或视频。「纯文字」限制的是输出，不是输入。

### 代入图上的数

| 部署 | stage 数 | stage 进程数 | GPU 数 |
|---|---:|---:|---:|
| 纯文字 | 6 | 1 | 1 |
| 默认语音 | 7 | 4 + 1 + 2 = 7 | 2 |

语音的加法把四个 GPU 0 进程、一个 GPU 1 进程和两个 CPU 进程相加。纯文字的六个 stage 包含一个汇合 stage，它把 preprocessing 和实际用到的 encoder 分支汇合后交给 thinker。

### 边界与出处

数量来自 `sglang_omni/models/qwen3_omni/config.py:136-147,257-318,412-452`。纯文字仍接受文字、图像、声音和视频输入，见 `docs/cookbook/qwen3_omni.md:46-57,206-208`。进程数不含 HTTP server 和 coordinator。

### 接下来

下一步先给出路线、摆卡、精度、容量和证据的五轴地图，再跟随请求穿过两种服务器模式，看语音 stage 什么时候才真正运行。

## 第 2 步 · 请求输出选择路线

> **一句话：** 语音服务器只在请求要声音时才使用 talker 和 code2wav。

### 图上是什么

- 开场地图把本步标为 `1/5 · 输出路线`。后面依次是第 3–4 步的摆卡、第 5 步的精度、第 6 步的容量，以及第 7–8 步的证据。
- `modalities` 写客户端要哪些输出种类，公开请求的默认值是 `["text"]`。
- 纯文字服务器在 `mm_aggregate` 汇合 preprocessing 和实际用到的 encoders，再运行 thinker 和 decode。
- 语音服务器处理纯文字请求时，由 thinker 汇合这些输入，再运行 decode；talker 和 code2wav 不参与。
- 加入 `"audio"` 后，thinker 到 talker 再到 code2wav 的分支启用，decode 仍返回文字。
- 两种服务器都接受多模态输入。向纯文字服务器请求声音，不会得到声音。

### 图上的路线

| 服务器与请求输出 | 终点 stage |
|---|---|
| 纯文字，文字 | `decode` |
| 语音，文字 | `decode` |
| 语音，文字和声音 | `decode` 和 `code2wav` |

`mm_aggregate` 是汇合 stage，不是另一个模型。语音图没有单独的 `mm_aggregate`，而由 thinker 完成汇合。code predictor 仍在 `talker_ar` 内，不会增加第八个 stage。

### 出处

路线构造和终点：`sglang_omni/models/qwen3_omni/config.py:136-189,212-302`；`sglang_omni/models/qwen3_omni/request_builders.py:200-261`。code predictor 的位置见 `sglang_omni/models/qwen3_omni/placement.py:37-40`。请求行为：`docs/basic_usage/omni.md:22,154-170,199-200,359,386-395`；`docs/cookbook/qwen3_omni.md:206-208`。

### 接下来

声音启用 talker 后，它放在哪张 GPU 会改变首音等待。

## 第 3 步 · talker 独占，分别看两种等待

> **一句话：** 8 路并发时 talker 独占让 p90 首音均值几乎减半，单请求总耗时却增加。

### 图上是什么

- 公开 H200 实验把 thinker 分在 GPU 4 和 GPU 5，code2wav 始终与 GPU 5 上的 thinker 进程同卡。
- 共用图里 talker 也在 GPU 4。它的下一步先就绪，等 thinker 当前轮次结束后才运行。红虚线标出这段等待。
- 独占图把 talker 移到 GPU 2，保留实验的 TP2 拓扑。前两根测量柱等最终拓扑出现后才显示，不会把共用的 2.68 秒错放在独占标签下。
- 首音指首个返回的声音 chunk，不证明扬声器已经播放。p90 表示 90% 的实测首音等待不超过这条线。
- 两根深色柱使用同一比例，两次 p90 的均值从 2.680 秒降至 1.439 秒。
- 橙卡是另一种负载。每次只有一个请求时，独占后总耗时增加 14–17%。最后一行说明这里只有相对增幅，因为来源没有给出两个绝对总耗时。

### 公式

$$
\overline{T}=\frac{T_1+T_2}{2},\qquad \rho=\left(1-\frac{\overline{T}_{alone}}{\overline{T}_{shared}}\right)\times100\%
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $T_1,T_2$ | 两次实测的 p90 首音 | 秒 | PR #1235 摆卡实验 |
| $\overline{T}$ | 两次 p90 的算术平均值 | 秒 | 本步 |
| $\overline{T}_{shared}$ | talker 与 GPU 4 上的 thinker 同卡时的均值 | 2.680 秒 | 本步 |
| $\overline{T}_{alone}$ | talker 独占一卡时的均值 | 1.439 秒 | 本步 |
| $\rho$ | 首音等待降幅 | 百分比 | 本步 |

### 代入图上的数

$$
\overline{T}_{shared}=(2.697+2.663)\div2=2.680\ \text{s}
$$

$$
\overline{T}_{alone}=(1.463+1.415)\div2=1.439\ \text{s}
$$

$$
\rho=(1-1.439\div2.680)\times100\%\approx46\%
$$

单请求增加 14–17% 是来源给出的范围。舞台在数字旁标明只有相对增幅。这张表没有提供对应的两个绝对总耗时，所以本章不编造绝对时间柱。

### 边界与出处

四个精确原始值来自第 8 章第 1 步的 PR #1235 数据。固定版本 tuning 指南给出共用范围 2.66–2.70 秒、独占范围 1.42–1.46 秒，以及单请求比较（`docs/cookbook/qwen3_omni/tuning.md:52-69`）。这些是 H200、thinker TP2 的公开实验。第 8 步的 TP1 方案拓扑不同，需要自己的 A/B 比较。

### 接下来

下一步把五个 GPU stage 装进一张卡，并核算它们申报的显存份额。

## 第 4 步 · thinker 的 78% 变成 73% AR

> **一句话：** 这份配置没有显式 thinker AR 比例，因此先留出整卡的 5 个百分点给 encoder 余量，再把 73% 给 AR。

### 图上是什么

- 堆叠条把一张 H100 分成各 stage 的申报比例、thinker 的 encoder 预留，以及比例之外的 6%。
- `encoder_mem_reserve` 是 thinker AR engine 之外的 encoder 工作余量，不是 image 和 audio encoder stage 自己申报的 2% + 2%。
- thinker 原来的 78% 拆成两段：73% 是有效 AR 预算，整卡的 5 个百分点是预留。
- 显式 AR 比例是直接指定 AR 占整卡的份额。这份配置没有指定，所以由工厂推导。5 个百分点是整卡 100 等份中的 5 份，不是 78% 的 5%。
- 其他 stage 份额仍是 2%、2%、10% 和 2%。
- 底部面板把视频测试最低需求逐项相加：61.0 GB thinker 权重、4.0 GB 视频预留、3.1 GB KV cache、4.8 GB encoder 和 code2wav、4.8 GB 预留，以及 8.0 GB talker。合计 85.7 GB，比 80 GB 显卡多 5.7 GB。去掉 talker 的 8.0 GB 后只剩 77.7 GB，所以 talker 移到 GPU 1。

### 公式

$$
A=F-E
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $A$ | thinker 的有效 AR 比例 | 0.73 | 本步 |
| $F$ | thinker 申报的 stage 比例 | 0.78 | H100 BF16 配置 |
| $E$ | AR 定预算前减去的 encoder 预留 | 0.05 | thinker 工厂默认值 |

### 代入图上的数

$$
A=0.78-0.05=0.73=73\%
$$

这里减去的是整卡的 5 个百分点，不是 78% 的 5%。申报的 stage 总和仍是 `2 + 2 + 78 + 10 + 2 = 94%`。把 78% 拆成 73% 和 5%，不会给整卡多加 5%。其余 `100 − 94 = 6%` 在申报比例之外，不是实测空闲显存。

### 图上的视频测试算式

| 部分 | 算式 | GB |
|---|---|---:|
| thinker 权重 | `30.5B × 2 B` | 61.0 |
| 视频 encoder 预留 | `5% × 80 GB` | 4.0 |
| 构造最长请求的 KV cache | `32,768 × 96 KB` | 约 3.1 |
| 两个 encoder 和 code2wav | `(2% + 2% + 2%) × 80 GB` | 4.8 |
| 申报比例之外的预留 | `6% × 80 GB` | 4.8 |
| talker | `10% × 80 GB` | 8.0 |
| 合计 | 六行相加 | 约 85.7 |

溢出量是 `85.7 − 80 = 5.7 GB`。只去掉 talker 后是 `85.7 − 8.0 = 77.7 GB`，放得下。数值由 `src/omni/numbers.ts` 推导，复现 Learning SGLang 第 19 章第 4 步的构造下限。其中 32,768 token 的 KV 项使用旧上限。checkpoint 当前的 65,536 token 默认值会让这一项更大，所以这不是当前峰值显存实测，溢出结论仍然成立。

### 边界与出处

配置数值来自 `examples/configs/qwen3_omni_colocated_h100_bf16.yaml:7-20`。预留机制见 `sglang_omni/models/qwen3_omni/stages.py:155-215,1230-1243,1358-1373`；encoder 余量说明见 `backend/server_args_builder.py:176-210`，其中 `backend/` 是 sglang_omni/scheduling/sglang_backend/ 的缩写。没有显式 `thinker.engine.mem_fraction_static` 时，工厂推导 73%；显式匹配时跳过预留，冲突时拒绝（`tests/unit_test/qwen3_omni/test_sglang_ar_budget.py:491-511,540-562`）。按字节申报 KV 会跳过比例调整（`stages.py:1384-1402`）。图外规则：这套同卡布局只能 TP 1。worker 是运行这套部署的一组进程，一个同卡 worker 不能给 stage 增加进程副本；更多副本要作为 router 后面的独立 workers 运行。每个 GPU stage 都要申报预算（`sglang_omni/models/qwen3_omni/placement.py:55-60,84-108,122-187`）。

### 接下来

显存也取决于 checkpoint 的精度，下一步对照 BF16、FP8 和 INT4。

## 第 5 步 · bit 变少，各 stage 精度不同

> **一句话：** 三种 checkpoint 的文档估计约为 60、40、30 GB，而 INT4 的 talker AR 和 code2wav 仍用 BF16。

### 图上是什么

- 精度是保存一个权重所用的 bit 数。权重是模型保存的一个数，一个 bit 是一个 0 或 1。
- 三根蓝柱用同一比例画单卡 H100/H20 章节里约 60、40、30 GB 的估计。来源没有定义它量的是权重本身、加载的 stages、运行峰值还是整个服务器，因此不能当成实测单卡预算。
- 底部的算式写出 `40 ÷ 60 ≈ 67%` 和 `30 ÷ 60 = 50%`。另一行说明其他数据和未量化部分也占显存，所以不能只按 bit 数算出这些 GB。
- BF16 把 thinker 和 talker AR 加载为 BF16。FP8 checkpoint 把这两个 AR stage 加载为 FP8。INT4 checkpoint 对 thinker 的 transformer 层做 4 bit 量化；talker AR 和 code2wav 仍用 BF16。
- 教程文档在 INT4 行明确写出 code2wav 使用 BF16；实现也在省略 code2wav `dtype` 时默认使用 BF16，所以三栏都标出这个默认值。

### 公式

$$
M_r=\frac{M_p}{M_{BF16}}\times100\%
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $M_r$ | 相对 BF16 的估计显存 | 百分比 | 本步 |
| $M_p$ | 一种精度的估计显存 | 60、40 或 30 GB | Qwen 教程文档 |
| $M_{BF16}$ | BF16 的估计显存 | 60 GB | Qwen 教程文档 |

### 代入图上的数

- FP8：`40 ÷ 60 × 100% ≈ 67%`，约比 BF16 少三分之一。
- INT4：`30 ÷ 60 × 100% = 50%`，约比 BF16 少一半。

这些比值来自近似值。

### 边界与出处

图外的细节：INT4 每 128 个权重分成一组。它的估计值相对 FP8 是 `30 ÷ 40 × 100% = 75%`，即少 25%。这些内容没有画在本步舞台上。

BF16 是默认值。FP8 checkpoint 自带精度配置，`--dtype fp8` 不是选择机制（`docs/cookbook/qwen3_omni.md:153-169`；`sglang_omni/models/weight_loader.py:19-42`）。INT4 的 stage 边界与估计见 `docs/cookbook/qwen3_omni.md:181-200`。code2wav 的默认 dtype 见 `components/code2wav_scheduler.py:146-154,1230-1260` 和 `sglang_omni/models/weight_loader.py:19-26`。本步和下一步用 `components/` 缩写 sglang_omni/models/qwen3_omni/components/。兼容矩阵允许三种精度用于纯文字输出、thinker/talker 分卡的 TP1 或 TP2，以及同卡 TP1（`docs/cookbook/qwen3_omni.md:25-44`）。本章不声称本地显存、速度或准确率测量。

### 接下来

选好 checkpoint 和布局后，更多同时到来的语音请求可能需要另一对 talker 和 code2wav，而不是换精度。

## 第 6 步 · 两个 talker，64 个 codec 状态位

> **一句话：** replica2 保留一个 64 请求 thinker，增加第二个 32 请求 talker，并给每个 code2wav 进程配置 64 个 codec 状态位。

### 图上是什么

- 运行上限是一个 stage 同时最多处理多少请求。它是 scheduler 限制，不是实测完成速度。
- 默认语音把 `image_encoder`、`audio_encoder`、上限 64 的 thinker 和 code2wav 留在 GPU 0。它的一个 talker 上限为 32。
- replica2 把两个 encoder 和 thinker 留在 GPU 0，再增加第二对 talker 和 code2wav。GPU 1 放 `r0`，GPU 2 放 `r1`。
- 一个 codec 状态位保存一路声音的 decoder 状态。每个 code2wav 进程都用 talker 上限乘副本数得到 64 个状态位，并各有一个独立状态池。
- 每个副本 GPU 给 talker 申报 12.3%，给 code2wav 申报 1.4%。

### 公式

$$
Z=X\times Y,\qquad B=P_T+P_C
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $Z$ | 配置的 codec 状态位 | 64 | 本步 |
| $X$ | 每个 talker 的运行请求上限 | 32 | Qwen 语音默认值 |
| $Y$ | talker 进程副本数 | 2 | replica2 配置 |
| $B$ | 每个副本 GPU 的申报比例 | 13.7% | 本步 |
| $P_T$ | talker 比例 | 12.3% | replica2 配置 |
| $P_C$ | code2wav 比例 | 1.4% | replica2 配置 |

### 代入图上的数

$$
Z=32\times2=64\ \text{个状态位}
$$

$$
B=12.3\%+1.4\%=13.7\%
$$

进程总数是 `5 个不变 + 2 个 talker_ar + 2 个 code2wav = 9`。不变的五个是 preprocessing、image encoder、audio encoder、thinker 和 decode。64 个状态位是每个 code2wav 进程的工厂配置，用来覆盖 talker 副本可运行的流。每个 codec 副本各有一个包含 64 个状态位的独立状态池；这个算式不是全部署共享一个池，也不证明有 128 路可持续流。状态池满了不会拒绝请求，而会退回看左侧上下文的无状态解码（`components/code2wav_scheduler.py:296-314`）。状态位不证明 64 路可持续运行或吞吐翻倍。

### 边界与出处

上限和状态位计算：`sglang_omni/models/qwen3_omni/stages.py:1276-1286`；`sglang_omni/models/qwen3_omni/config.py:37,454-496`；`tests/unit_test/qwen3_omni/test_colocation_config.py:177-203`。每个展开后的 stage 实例独立解析工厂参数（`sglang_omni/pipeline/mp_runner.py:160-177`；`sglang_omni/config/runtime.py:44-61`），每个 scheduler 各建一个状态池（`code2wav_scheduler.py:1284-1299`）。位置和比例：`examples/configs/qwen3_omni_speech_replica2.yaml:1-42`。默认配对让每路 codec 留在一卡，自定义策略不保证 `r0/r0` 和 `r1/r1` 配对。

### 接下来

下一步核对解析后的配置，再用真实流量测量，不把这些上限当成结果。

## 第 7 步 · 就绪不是 benchmark

> **一句话：** readiness 证明一个小请求能跑完；部署比较需要受控流量，以及分开的基准客户端和听者时钟。

### 图上是什么

- 顶部链条先用 `config resolve` 核对解析后的配置，再做 readiness，最后开始受控 A/B 比较。
- readiness 发送一张小图、一秒声音和一条短指令，每个生成 token 的 stage 最多生成 8 个新 token。单看文字，8 个 token 约为 6 个英文单词。声音 token 承载声音，不是单词。这里只证明健康，不证明速度或质量。
- arm 是 A/B 比较中的一种部署选择。测量计划固定输入、采样、硬件和预热，只改这一种选择。`c` 是 concurrency，即同时运行的请求数。
- 示例 sweep 在并发 1 和 16 各重复 5 次，每组共十次测量。
- 基准客户端测量首音和整个请求的墙钟时间、吞吐和失败。听者记录另行保存播放卡顿，以及第 12 章第 8 步的停答 `L−S` 和回应 `N−R`。
- 底部时间线解释卡顿。10 个 80 ms 的帧组成一个 800 ms chunk。chunk 2 先显示未就绪，再赶在 chunk 1 结束前就绪。错过这条边界，听者就会听到空档。

### 公式

$$
J=K\times Q,\qquad D=N\times F
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $J$ | 每组比较测量的次数 | 10 | 本步 |
| $K$ | 并发档数 | 2：1 和 16 | 文档中的 sweep |
| $Q$ | 每档重复次数 | 5 | 文档中的 sweep |
| $D$ | 一个声音 chunk 的播放时长 | 800 ms | 本步 |
| $N$ | 一个 chunk 的帧数 | 10 | Learning SGLang 第 20 章第 1–3 步 |
| $F$ | 每帧的播放时长 | 80 ms | Learning SGLang 第 20 章第 1–3 步 |

### 代入图上的数

$$
J=2\times5=10\ \text{次测量 / 组},\qquad D=10\times80=800\ \text{ms}
$$

十次只属于 `c = 1,16` 的两档示例。预热另算。按照第 8 章第 8 步，同一次运行里的多个请求不能算作独立的实验重复。p99 表示 99% 的测量请求不超过这条线。只有测量样本包含至少 100 个请求的结果时才报告 p99；十次运行本身既不能保证也不排除这个样本数。800 ms 截止线是播放时长，不是实测的 code2wav 计算预算。未就绪与就绪两个状态是构造的计时例。

### 做法与出处

先用 `sgl-omni config resolve --config <config.yaml> --show config` 解析配置（`docs/basic_usage/process_topology.md:52-53`）。readiness 的定义见 `docs/cookbook/qwen3_omni.md:202-204` 和 `sglang_omni/models/qwen3_omni/config.py:328-366`；有限的预热覆盖见 `docs/basic_usage/omni.md:345-349`。SeedTTS sweep 和百分位指导见 `benchmarks/README.md:249-288`。基准客户端记录请求墙钟时间（`benchmarks/metrics/performance.py:27-31`；`benchmarks/eval/benchmark_omni_seedtts.py:371,398,408`）。实现按请求数而不是运行次数检查 p99 样本量（`benchmarks/eval/benchmark_omni_seedtts.py:504-505,552-561`；`benchmarks/benchmarker/conditions.py:19-20,95-100`）。 `--generate-only` 保存声音和生成速度记录，包括成功与失败数量，但不转写声音，也不计算 WER 或说话人相似度（`benchmarks/README.md:215-220,659`）。保留这些完成情况记录，再按负载另行检查转写、WER，以及适用时基于参考音频的音色匹配。

### 接下来

最后一步把配置、等待、数据和显存放进回顾第 1–12 章的一张决策表。

## 第 8 步 · 一张部署决策表

> **一句话：** 8 请求算例从默认 BF16 语音和 talker 独占用卡开始，再根据记录的证据保留或修改选择。

### 图上是什么

- 目标是 8 路并发语音请求，希望首音更早。
- 起步路线从默认语音图请求文字和声音。先用 BF16 是因为它是默认值，不是本章测出它最好。
- GPU 0 放输入 encoders、thinker 和 code2wav，GPU 1 放 talker。这个 TP1 起步假设来自第 3 步不同的 H200/TP2 实验，仍需固定这套摆卡做本地精度 A/B。
- talker 上限减去算例的 8 个请求，还留有 24 个请求的余量。测量到排队以前不增加第二对副本。
- 两组证据保持相同的两卡 TP1 硬件、请求路线、code2wav 位置和 talker 独占摆卡。A 组使用默认 BF16 checkpoint，B 组使用原生 FP8 checkpoint，只改 checkpoint 精度。在 `c = 8` 比较首音中位数和自定义 p90、总耗时、失败、显存和听者指标，并保留每次运行的原始结果。第 8 章第 8 步给出输出质量检查：完成情况、词错误，以及适用时的声音匹配；这些检查在 generate-only sweep 之外另做。结果数为奇数时，中位数是正中的首音值；为偶数时，是中间两个值的平均数。第 3 步解释了 p90，下面的决策边界把自定义算法列为图外做法。
- 底部地图回顾第 1–12 章：第 1–3 章是配置、路线和绑定；第 4–6 章是等待规则、数据和队列；第 7–8 章是显存和测量；第 9–12 章是优化和模型策略。

### 公式

$$
V=X-I
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $V$ | talker 运行上限还能接收的请求数 | 24 | 本步 |
| $X$ | 每个 talker 的运行请求上限 | 32 | 第 6 步 |
| $I$ | 本算例预期的并发请求数 | 8 | 构造目标 |

### 代入图上的数

$$
V=32-8=24\ \text{个请求的余量}
$$

这些只是配置上限以下的请求余量，不是实测剩余吞吐或空闲显存。要先观察到真实排队、首音尾部变长或其他瓶颈，才增加副本。

### 决策边界

这是由 H200/TP2 证据构造的 TP1 起步假设，不是实测得出的最优方案。先解析配置并运行 readiness，再固定起步摆卡和第 7 步的其他控制条件，以目标并发 8 比较 BF16 与原生 FP8。只测 `c = 8` 时，重复五次就是每组五次运行。图外做法：随仓库脚本汇总首音中位数、p95 和 p99。本步图上另列了自定义 p90，分别在每组的 `c = 8` 结果里，对成功流式请求中非空的 `per_request.audio_ttfp_s` 调用 `numpy.percentile(..., 90)`（`benchmarks/metrics/performance.py:219-223,480`）。首音、总耗时和听者结果分别保留；输出质量检查在 generate-only sweep 之外另做。只有记录指出要解决的问题才改选择，这个问题也可能是显存或质量，而不只是等待。

### 接下来

下一部分进入运行中的服务。图末提示是 `client ← queued audio (API process)`。第 14 章先回答图末的问题：生成已经结束，客户端却读得太慢时，API 进程里留下的声音会怎样占用内存，又会先让哪一路流失败。
