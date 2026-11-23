## 第 1 步 · 三个模型没有进程可跑

> **一句话：** SGLang 只有一个进程里有模型；第 16 章的六个模型里，talker、code predictor 和 code2wav 在 SGLang 里没有地方跑。

### 图上是什么

- 上面一行「如今的 SGLang · 第 9 章第 5 步」：三个进程，用两条「队列」连起来。
  - 白框「服务器 + 分词器」和「反分词器」：在 CPU 上，没有模型。
  - 蓝框「scheduler + 模型」：在 GPU 上，只跑一个循环。
- 下面一行「Qwen3-Omni 的六个模型 · 第 16 章第 4 步」：白色是一次 pass 的模型，蓝色是循环的模型（第 16 章第 4 步的两类）。
  - 视觉 encoder、音频 encoder、engine：实线框，三条蓝色箭头指向 scheduler 进程，「encoder 在它的 prefill 里」（第 16 章第 2 步）。
  - talker、code predictor、code2wav：红色虚线框，下面标红字「没有进程跑这些」。
- 底部蓝色胶囊「需要：」：本章要补的东西。

### 为什么不能直接塞进 scheduler 进程

- scheduler 进程只跑一个循环：选 batch、跑前向、选 token（第 10 章第 1 步）。这个循环服务的是 engine。
- talker 和 code predictor 自己也是循环（蓝色），每帧要跑自己的步，不能和 engine 共用同一个循环。
- code2wav 是一次 pass 的模型（白色），但它要攒够 10 帧才跑一次（第 16 章第 3 步），和 engine 的节奏也不同。

### 接下来

第 2 步定义 SGLang-Omni 给每块工作的「家」：stage。

## 第 2 步 · stage 是什么

> **一句话：** 一个 stage = 一个负责收发的 runtime + 一个在自己线程里干活的 scheduler，两者之间是 inbox 和 outbox 两条队列。

### 图上是什么

- 两个大框：「一个 stage」和「下一个 stage」，结构相同。
- 每个大框上方的 runtime：「从各 stage 收，向各 stage 发」。
- 中间两叠小方块：左边 inbox（向下进 scheduler），右边 outbox（向上回 runtime）。
- 下方蓝框 scheduler：「自己的线程」，它的循环是「从 inbox 取，干活，放进 outbox」。
- 两个大框之间的箭头「去下一个 stage」，标「怎么传：第 18 章第 2 步」。
- 动画：一个 request 胶囊从左边进来，落进 inbox，在 scheduler 里停住，进度条走满（「正在干活」）；颜色从橙色 `req` 变成蓝色 `req′`，经 outbox 回到 runtime，被发到下一个 stage，再走一遍，变成绿色 `req″`。右上角的「循环」进度条每圈走满一次。

### 各部分管什么

| 部分 | 做什么 | 在 SGLang-Omni 里 |
|---|---|---|
| runtime | stage 的 I/O：从别的 stage 收数据，向别的 stage 发 | `Stage` 类，一个事件循环 |
| scheduler | 干这个 stage 的活 | 在名为 `scheduler-<stage 名>` 的线程里启动（`pipeline/stage/runtime.py`） |
| inbox / outbox | runtime 和 scheduler 之间的两条队列 | scheduler 对外只暴露这两个 |

`req′`、`req″` 是同一个 request，带上了前面 stage 产出的东西（token、embedding、code 等）。

### 为什么这样分

- scheduler 只碰自己的 inbox 和 outbox，从不调用下一个 stage，也不等它，所以每个 stage 的循环按自己的节奏跑。
- 这和第 9 章第 6 步一样：那里 scheduler 进程在每步开头取走已到达的一切，tokenizer 放下消息就走。区别是这里每个 stage 都有自己的一对队列。

### 接下来

第 3 步说明 stage 和进程不是一回事。

## 第 3 步 · stage 不是进程

> **一句话：** 同样的 stage 可以每个独占一个进程、几个共用一个进程，或者一个跨多个进程；stage 本身不变，变的只是交接方式。

### 图上是什么

三列，每个虚线框是一个**进程**（第 9 章第 4 步：一个跑着的程序，有自己的 Python 解释器）。

| 列 | 画了什么 | 交接方式 | 图下说明 |
|---|---|---|---|
| 左「每个 stage 一个进程」 | `thinker`、`talker_ar`、`code2wav` 各在一个虚线框里 | 「一条消息」 | Qwen3-Omni 的语音默认布局；一个 stage 的 CPU 工作不会卡住另一个 |
| 中「多个共用一个进程」 | `preprocessing`、`thinker`、`decode` 在同一个虚线框里 | 「一次直接调用」 | Qwen3-Omni 的纯文本流水线；一个解释器，一起出错 |
| 右「一个 stage，多个进程」 | 一个 `thinker` 横跨「进程 · GPU 0」和「进程 · GPU 1」 | | 张量并行，一个模型拆到两个 GPU（第 24 章） |

底部蓝色胶囊：三种布局里 stage 都一样，变的只是交接。

### 核对 SGLang-Omni 的配置

- 语音默认布局（`config.py` 的 `SPEECH_DEFAULT_PROCESSES`）：七个 stage 各有自己的进程名，即每个 stage 一个进程。
- 纯文本布局（`text_stages()`）：所有 stage 都写 `process="pipeline"`，同一个进程。实际有六个 stage（`preprocessing`、两个 encoder、`mm_aggregate`、`thinker`、`decode`），图上只画了其中三个。

### 两种交接的取舍

- **同一进程：** 交接是一次函数调用，最便宜；但共用一个 Python 解释器，一个 stage 的 CPU 工作会挡住别的，一个出错全部一起停。
- **不同进程：** 交接是一条进程间消息，要多花时间；换来互不阻塞、各自出错。

### 接下来

第 4 步画出 Qwen3-Omni 语音流水线的七个 stage。选哪种布局是第 19 章的问题。

## 第 4 步 · Qwen3-Omni 的七个 stage

> **一句话：** 六个模型减一个共用、加两个不跑模型的，正好七个 stage；七个进程分在 CPU、GPU 0 和 GPU 1 三处。

### 图上是什么

- 七个实心框，每个外面一个虚线「进程」框。框里写 stage 名、它装的东西、在哪跑。
  - 灰色（无模型）：`preprocessing`、`decode`，都在 CPU。
  - 白色（一次 pass）：`image_encoder`、`audio_encoder`、`code2wav`，都在 GPU 0。
  - 蓝色（循环）：`thinker`（engine，GPU 0）、`talker_ar`（talker + code predictor，GPU 1）。
- 箭头：`preprocessing` → 两个 encoder 和 `thinker`；两个 encoder → `thinker`；`thinker` →「token id」→ `decode` →「文本输出」；`thinker` →「每个 token」→ `talker_ar` →「code」→ `code2wav` →「声音输出」。
- 三条带点的说明和两条脚注（talker 也读 prompt；设计笔记里的第八个 stage）。

### 公式

$$
N_{\text{stage}} = N_{\text{model}} - 1 + 2,\qquad
N_{\text{proc}} = N_{\text{CPU}} + N_{\text{GPU0}} + N_{\text{GPU1}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $N_{\text{model}}$ | Qwen3-Omni 的模型数 | 6 | 第 16 章第 4 步 |
| $-1$ | talker 和 code predictor 共用 `talker_ar` | | 第 5、6 步说原因 |
| $+2$ | 不跑模型的 `preprocessing` 和 `decode` | | 本步 |
| $N_{\text{stage}}$ | stage 数 | | 本步 |
| $N_{\text{CPU}}, N_{\text{GPU0}}, N_{\text{GPU1}}$ | 各处的进程数 | | 每个框下标的设备 |
| $N_{\text{proc}}$ | 进程数 | | 本步 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| $N_{\text{stage}}$ | 6 − 1 + 2 | **7** |
| $N_{\text{proc}}$ | 2（`preprocessing`、`decode`）+ 4（两个 encoder、`thinker`、`code2wav`）+ 1（`talker_ar`） | **7** |

### 两个不跑模型的 stage

- `preprocessing`：把 request 变成 token、照片 patch 和音频帧，交给 encoder 和 `thinker`。
- `decode`：反分词器，把 token id 变回文本（第 1 章第 11 步）。

### 没画出的

- `talker_ar` 也收 `preprocessing` 和两个 encoder 的输出，自己组 prompt（SGLang-Omni 配置里 `preprocessing` 的下游包括 `talker_ar`）。第 18 章第 1 步讲。
- 设计笔记 `docs/design/refactor_rfc.md` 里还有第八个 stage `mm_aggregate`；语音流水线现在让 `thinker` 和 `talker_ar` 自己做这个汇合。
- 默认配置里 `thinker_gpu=0`、`talker_gpu=1`。为什么 talker 独占一个 GPU 是第 19 章的内容。

### 接下来

第 5 步说明 code predictor 为什么没有自己的 stage。

## 第 5 步 · code predictor 读写的都是 talker 的

> **一句话：** 一个 talker 步里，code predictor 从 talker 读 hidden state 和 code 0，写出 code 1–15；凑齐的帧又成为 talker 的下一个输入。

### 图上是什么

- 虚线大框「一个 talker 步 · 一帧」。
- 左边两个输入：灰色「一个 token，来自 thinker」，橙色「上一帧」。
- 蓝框 talker：「一次前向 · code 0」。
- 蓝色箭头向下，标「从 talker 读：它的 hidden state 和 code 0」。
- 橙框 code predictor：「code 1–15，一个接一个」。
- 橙色「这一帧 · 16 个 code」：一路「去 code2wav」，一路沿橙色箭头绕回左边，标「为 talker 而写：它的下一个输入」。

### 公式

$$
n_{\text{code}} = 1 + (n_{\text{code}} - 1)
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n_{\text{code}}$ | 每帧的 code 数 | 16 | 第 16 章第 3 步，`src/numbers.ts` 的 `CODES_PER_FRAME` |
| 1 | talker 写的 code 0 | | 本步 |
| $n_{\text{code}} - 1$ | code predictor 写的 code 1–15 | 15 | 本步 |
| $t_{\text{frame}}$ | 一帧的时长 | 80 ms | 第 16 章第 3 步 |

代入：16 = 1 + 15。一帧是 80 ms 声音。

### hidden state 是什么

talker 最后一层为当前位置算出的向量，即第 2 章第 2 步那种 $x$ 在最后一层的输出。talker 用它选出 code 0；code predictor 再拿它和 code 0 往下写。

### 为什么这说明它该在 talker 里

- 输入来自 talker（hidden state、code 0）。
- 输出回到 talker（这一帧是 talker 下一步的输入）。
- 在 SGLang-Omni 里，code predictor 在 `talker_ar` 的前向里跑，在 talker 自己的层之后（底部脚注）。

### 接下来

第 6 步算一下如果 code predictor 单独成 stage，要多出多少次交接。

## 第 6 步 · 单独成 stage 的代价

> **一句话：** 单独成 stage 每帧要 2 次交接，20 s 的回答共 500 次，talker 每次都得等；放在 talker 步内是 0 次。

### 图上是什么

- 颜色说明：蓝块是一次 talker pass，橙块是 code predictor 的各次 pass，红色虚线块是 stage 间的一次交接（未按比例）。
- 上一条时间线「若 code predictor 单独成一个 stage」：5 帧，每帧是 蓝 → 红 → 橙 → 红。红字「每帧 2 次交接」。
- 下一条时间线「在 talker 步内 · SGLang-Omni 的做法」：8 帧，蓝橙紧挨，「0 次交接」。
- 底部脚注：SGLang-Omni 放置检查的原话。

### 公式

$$
n_{\text{frame}} = \frac{T_a}{t_{\text{frame}}},\qquad
n_{\text{hand}} = 2 \times n_{\text{frame}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $T_a$ | 回答长度 | 20 s | 第 16 章第 1 步 |
| $t_{\text{frame}}$ | 一帧的时长 | 80 ms | 第 16 章第 3 步 |
| $n_{\text{frame}}$ | 回答的帧数 | | 第 16 章第 3 步 |
| 2 | 每帧的交接次数：去 code predictor 一次（带 hidden state 和 code 0），回来一次（带写完的帧） | | 第 5 步 |
| $n_{\text{hand}}$ | 整个回答的交接次数 | | 本步 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| $n_{\text{frame}}$ | 20 s ÷ 80 ms | **250** |
| $n_{\text{hand}}$（单独成 stage） | 2 × 250 | **500** |
| $n_{\text{hand}}$（在 talker 步内） | | **0** |

### 为什么 talker 每次都得等

talker 的下一次 pass 要用这一帧（第 5 步），帧没回来就不能开始。所以 500 次交接全落在 talker 的关键路径上。放在步内时，hidden state 和帧都留在 GPU 上原来的地方，不用搬。

一次交接多贵见第 18 章第 3 步。SGLang-Omni 直接禁止这种配置：`models/qwen3_omni/placement.py` 会以「Qwen code predictor is part of talker_ar and must not be a stage」拒绝。

### 接下来

第 7 步问：七个 stage 能不能共用一个 scheduler。

## 第 7 步 · 三种 scheduler

> **一句话：** 按 stage 在两次调用之间要保留什么，七个 stage 分成三类：什么都不留、留 KV cache、留还在到达的碎片。

### 图上是什么

三列，每列标「k / 3」、类名、右上角的 scheduler：

| | 1 / 3 一次 pass | 2 / 3 循环 | 3 / 3 流式 |
|---|---|---|---|
| 小图 | 输入 → 运行 → 结果 | 第 1–4 步，每步下面多一个蓝色小块 | 编号碎片 1、2、3 进一个虚线框，再输出 |
| 调用之间保留 | 什么都不留：request 整个到达，跑一次就结束 | 每个 request 的 KV cache，每步增长，还有运行中的 batch | 每个 request 已到的碎片，直到够一次使用 |
| 用于 | `preprocessing`、`image_encoder`、`audio_encoder` | `thinker`、`talker_ar` | `decode`、`code2wav` |
| scheduler | `SimpleScheduler` | SGLang 自己的 scheduler | 各 stage 自己的 |

图下一行：围着 KV cache 建的 scheduler 对 encoder 无事可做，也没法等碎片。脚注给出 SGLang-Omni 里的类名。

### 「循环」那一列的小块

每个小块是 KV cache 里的一个位置。decode 每步给每个 request 的 cache 加一个位置（第 3 章第 7 步），所以第 1 步一个块，第 4 步四个块。

### 为什么要三种

- 一次 pass 的 stage 没有 KV cache，SGLang 的 page 池和 radix tree 对它没用。
- 流式 stage 要扣住碎片等凑够，SGLang 的循环没有这个动作。
- 只有循环类和 SGLang 原本的 scheduler 对得上。

### 接下来

第 8–11 步逐类对照 SGLang 的循环：第 8 步一次 pass，第 9、10 步循环，第 11 步流式。

## 第 8 步 · 1 / 3 一次 pass：SimpleScheduler

> **一句话：** 和 SGLang 的六行循环逐行对照，`SimpleScheduler` 留下四行的简化版，去掉选 batch 和 Sampler 两行，什么都不保留。

### 图上是什么

- 左列蓝框「SGLang 的循环 · 第 10 章第 1 步」：六行，下标「保留：waiting 和 running 列表、KV pages、radix tree」。
- 右列「一次 pass · SimpleScheduler」：「保留：无」。实线箭头 + 白框 = 这一行有对应；虚线 + 虚线框「不需要」= 这一行去掉。
- 两条脚注：batch 的上限；encoder 的 hash 缓存在哪。

### 逐行对照

| SGLang 的行 | `SimpleScheduler` |
|---|---|
| `recv_requests`：inbox → Req 对象 | 取走 inbox 里等待的，最多 32 个 |
| `get_next_batch_to_run` | **不需要**：每个 request 都是新的，跑完就结束 |
| `ScheduleBatch → tensors` | 堆叠输入：没有位置，没有 page |
| `ModelRunner.forward` | encoder 跑一次 |
| `Sampler` | **不需要**：encoder 交出 embedding，没什么可选 |
| `process_batch_result` | 每个结果放进 outbox：全部完成 |

### 核对源码

- `scheduling/simple_scheduler.py` 开头写的就是这个循环：inbox.get() → 运行函数 → outbox.put()，不留 KV cache。
- 两个 encoder 的 `SimpleScheduler` 都设 `max_batch_size=32`（`models/qwen3_omni/stages.py`）。
- 等待时间 `max_batch_wait_ms` 取自环境变量 `SGLANG_OMNI_ENCODER_BATCH_WAIT_MS`，不设时为 0，所以默认不等更多 request。
- 第 16 章第 2 步的 hash 缓存（见过的照片直接取结果）在 encoder 自己的代码里，scheduler 仍然什么都不留。

### 行名说明

左列第一行写的是 `recv_requests`。第 10 章第 1 步把这一行叫 `ingest_requests`，那是 SGLang 主循环里调用的方法，它内部再调用 `recv_requests` 收消息。SGLang-Omni 重写的是 `recv_requests`。第三行在第 10 章叫 `ScheduleBatch → ForwardBatch`，这里写成 `ScheduleBatch → tensors`，是同一件事：把 batch 变成张量。

### 接下来

第 9 步是第 2 类：每一行都保留的循环。

## 第 9 步 · 2 / 3 循环：OmniScheduler

> **一句话：** thinker 和 talker 就是第 10 章的循环，所以六行都保留；中间三行原样用 SGLang 的代码，只改碰外部的三行。

### 图上是什么

- 左列同第 8 步：SGLang 的六行。
- 右列「循环 · SGLang-Omni 的 OmniScheduler」：「保留：同样的列表、page 和树」。六条实线箭头，每行都有对应。
  - 蓝框「SGLang 自己的代码」：第 2、3、6 行。
  - 白框「有改动」：第 1、4、5 行。
- 两条脚注：OmniScheduler 怎么复用 SGLang；没要 SGLang 的哪些部分。

### 逐行对照

| SGLang 的行 | `OmniScheduler` | |
|---|---|---|
| `recv_requests` | 读 stage 的 inbox（第 2 步），不是 socket | 有改动 |
| `get_next_batch_to_run` | 同样的 prefill / decode 选择，同样的 page 池 | SGLang 自己的 |
| `ScheduleBatch → tensors` | 同样的张量，同样的 page | SGLang 自己的 |
| `ModelRunner.forward` | 模型自己的 runner：接收 embedding（第 4 步 encoder 的输出），每个 token 一选出就发出 | 有改动 |
| `Sampler` | 在模型的 runner 里选 | 有改动 |
| `process_batch_result` | 追加和结束照旧；send 被关掉，因为 runner 已经发过 | SGLang 自己的 |

### 核对源码

`scheduling/omni_scheduler.py` 的类说明：`get_next_batch_to_run`、`process_batch_result` 等方法在 SGLang 的 `Scheduler` **类**上查找，用 `OmniScheduler` 自己作 `self` 调用（`__getattr__`），不复制也不继承；直接定义在类上、优先生效的是 `recv_requests`、`process_input_requests`、`run_batch`、`send_to_tokenizer`。

没要的部分（设计笔记）：socket、分词器、grammar、LoRA 和 speculative decoding。

### 接下来

第 10 步给 talker 的这个循环再加一行。

## 第 10 步 · talker 的就绪检查

> **一句话：** talker 的 scheduler 在第 9 步的循环里加一行：每个 decode 步之前检查 batch 里每个 request 的下一个 token 都到了，缺一个整个 batch 就等。

### 图上是什么

- 左边「talker 的循环」：第 9 步的六行（标「有改动」或「SGLang 自己的」）。动画里橙色新行「就绪检查 · 下一个 token 到了？」滑进第 2 行 `get_next_batch_to_run` 之后，下面几行往下挪。
- 右边一个三 request 的 batch A、B、C，上面三格「第 1 / 2 / 3 轮」：
  1. A、B 的下一个 token「已到」（橙），C 的是红色虚线空格。
  2. 第 1 轮：检查中 → 等待（红），「循环回到开头再查一次」。
  3. 第 2 轮：仍然等待。
  4. C 的 token「来自 thinker」，滑进 C 的格子，「经 inbox 到达，归到 C 名下」。
  5. 第 3 轮：「已跑」（蓝），A、B、C 一起跑一次前向。
- 两条带点的说明（关掉的两项及原因）和两条脚注。右上角是「循环」进度条。

### 为什么整个 batch 一起等

一个 decode 步同时跑 batch 里所有 request，共用一次权重读取（第 5 章第 2 步）。不能只跑 A 和 B 而让 C 留在原地，所以缺一个就整批不跑。这就是第 16 章第 5 步说的 talker 要等 engine 写出 token。

### 核对源码（`models/qwen3_omni/talker_scheduler.py`）

- `QwenTalkerScheduler` 继承 `OmniScheduler`，重写 `get_next_batch_to_run`：先调父类选出 batch，再用 `is_batch_ready_to_run` 检查；是 decode batch 且 runner 说输入没齐（talker 的上一帧或 thinker 的 token），就调 `rollback_decode_prep_after_skip` 回滚准备、返回空。图上把它画成插在第 2 行之后，和代码一致。
- `configure_talker_server_args` 设 `disable_radix_cache=True`、`chunked_prefill_size=0`，并在 `feedback_enabled`（默认开）时设 `disable_overlap_schedule=True`。

### 关掉的三项

| 功能 | 讲过的地方 | 为什么关 |
|---|---|---|
| overlap scheduling | 第 10 章第 9 步 | 每步的输入是上一步写的帧，下一步不能提前排 |
| radix cache | 第 8 章第 4 步 | 树按 token id 匹配，talker 的 prompt 以向量到达 |
| chunked prefill | 第 6 章第 6 步 | 代码没写原因，舞台只注明它被关掉 |

前两项的原因是本书对代码的解读（见本章正文）。thinker 写完最后一个 token 之后，每个 request 读一个 pad token，它总是在，所以不会再被挡住（脚注）。

### 接下来

第 11 步是第 3 类：流式。

## 第 11 步 · 3 / 3 流式：decode 和 code2wav

> **一句话：** decode 扣住还没凑成整字符的 token，code2wav 扣住帧直到攒够 10 个新帧；两者都不需要 Sampler。

### 图上是什么

- 左列：SGLang 的六行，「保留：列表、KV pages、树」。
- 中列 `decode`「保留：还没凑成整字符的 token」，右列 `code2wav`「保留：已到的帧」。每行白框「有改动」或虚线框「不需要」，下面一行说明。
- 两条脚注：「半个字符」的意思；两个 scheduler 的类名和重读旧帧的原因。

### 逐行对照

| SGLang 的行 | `decode` | `code2wav` |
|---|---|---|
| `recv_requests` | 一次一个 token，按 request 归档 | 帧逐片到达，按 request 归档 |
| `get_next_batch_to_run` | 不需要：每个 token 一到就处理 | 凑齐 10 个新帧的 request，组 batch |
| `ScheduleBatch → tensors` | 不需要：无模型，不用 GPU | 最多 25 个旧帧 + 10 个新帧 |
| `ModelRunner.forward` | 待处理 token → 文本，在 CPU 上 | code2wav，每个窗口跑一次 |
| `Sampler` | 不需要：没什么可选 | 不需要：它写声音 |
| `process_batch_result` | 发出文本；留半个字符 | 发出 10 个新帧的声音 |

### 半个字符

tokenizer 按字节工作，一个字符（例如 emoji）的几个字节可能分在两个 token 里。只发第一个 token 就会发出半个字符，所以 decode 留着它，等下一个 token 补齐。

### 公式

$$
n_{\text{win}} = n_{\text{ctx}} + n_{\text{chunk}},\qquad
t_{\text{chunk}} = n_{\text{chunk}} \times t_{\text{frame}},\qquad
n_{\text{c2w}} = \frac{n_{\text{frame}}}{n_{\text{chunk}}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n_{\text{chunk}}$ | 每次的新帧数 | 10 | 第 16 章第 3 步；`Code2WavScheduler` 的 `stream_chunk_size=10` |
| $n_{\text{ctx}}$ | 最多重读的旧帧数 | 25 | `Code2WavScheduler` 的 `left_context_size=25` |
| $n_{\text{win}}$ | 一次最多读的帧数 | | 本步 |
| $t_{\text{frame}}$ | 一帧的时长 | 80 ms | 第 16 章第 3 步 |
| $t_{\text{chunk}}$ | 一次发出的声音长度 | | 本步 |
| $n_{\text{frame}}$ | 回答的帧数 | 250 | 第 6 步 |
| $n_{\text{c2w}}$ | code2wav 跑的次数 | | 第 16 章第 3 步 |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| $n_{\text{win}}$ | 25 + 10 | **35** 帧 |
| $t_{\text{chunk}}$ | 10 × 80 ms | **800 ms** |
| $n_{\text{c2w}}$ | 250 ÷ 10 | **25** 次 |

旧帧最多 25 个：前几次之前还没有那么多帧，窗口就短一些（`min(25, 已发出的帧数) + 10`）。重读旧帧是为了让两段声音之间的接缝平滑，第 20 章讲。

### 接下来

第 12 步把各 stage 的 scheduler 标回第 4 步的图上。

## 第 12 步 · 八条边，每条怎么交接

> **一句话：** 七个 stage 由八条边连接；它们传得多频繁、两端在哪各不相同，下一章讲每条怎么完成。

### 图上是什么

- 第 4 步的七个框，每个框里多了一行 scheduler 名（第 7–11 步），下面是设备。
- 八条边都画成红色，带红圈编号：

| 边 | 从 → 到 | 两端在哪 | 多频繁 |
|---|---|---|---|
| 1 | `preprocessing` → `image_encoder` | CPU → GPU 0 | 一次 |
| 2 | `preprocessing` → `audio_encoder` | CPU → GPU 0 | 一次 |
| 3 | `preprocessing` → `thinker` | CPU → GPU 0 | 一次 |
| 4 | `image_encoder` → `thinker` | GPU 0 → GPU 0 | 一次 |
| 5 | `audio_encoder` → `thinker` | GPU 0 → GPU 0 | 一次 |
| 6 | `thinker` → `decode` | GPU 0 → CPU | 每个 token |
| 7 | `thinker` → `talker_ar` | GPU 0 → GPU 1 | 每个 token |
| 8 | `talker_ar` → `code2wav` | GPU 1 → GPU 0 | 每 10 帧 |

- 两条带点的说明（频率、两端）和两条脚注（框里写什么；还有三条没画的边送到 `talker_ar`，第 18 章第 1 步）。

### 各 stage 的 scheduler

| stage | scheduler | 类别 |
|---|---|---|
| `preprocessing`、`image_encoder`、`audio_encoder` | `SimpleScheduler` | 一次 pass（第 8 步） |
| `thinker` | `OmniScheduler` | 循环（第 9 步） |
| `talker_ar` | `QwenTalkerScheduler` | 循环 + 就绪检查（第 10 步） |
| `decode` | `StreamingDetokenizeScheduler` | 流式（第 11 步） |
| `code2wav` | `Code2WavScheduler` | 流式（第 11 步） |

### 边 8 的频率

SGLang-Omni 的 talker 配置设 `codec_coalesce_frames=10`、`codec_coalesce_early_frames=10`：开头 10 帧逐帧发，之后每 10 帧打成一条消息发。图上「每 10 帧」说的是之后的常态。

### 接下来

第 2 步没画 runtime 之间怎么交接。有了这八条边，第 18 章回答：每条边的数据怎么从一个进程到另一个，例如每个 token 怎么从 GPU 0 的 thinker 到 GPU 1 的 talker。
