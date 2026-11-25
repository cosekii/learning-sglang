## 第 1 步 · 先看服务启动付出的等待

**一句话。** 公开日志从等待 SGLang 到收到 ready 相隔 21.600474 秒，HTTP 服务又过 0.847491 秒才启动。

### 图上是什么

- 三个时间戳依次是开始等待 `sglang0`、`sglang0 is ready` 和 HTTP 在 `:8080` 启动。
- 蓝色两段属于 worker 启动，橙色表示 HTTP 服务。`ready` 在这里指 worker 完成启动、可以参加计算。
- 所有时间差都由相邻时间戳相减得到；最后一个数从第一条日志算到 HTTP 启动。

### 公式与符号

$$W_{\mathrm{ready}}=t_{\mathrm{ready}}-t_{\mathrm{wait}},\qquad W_{\mathrm{http}}=t_{\mathrm{http}}-t_{\mathrm{ready}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t_{\mathrm{wait}}$ | 第一条等待日志的时刻 | 公开日志，20:32:52.029318 |
| $t_{\mathrm{ready}}$ | worker 就绪日志的时刻 | 公开日志，20:33:13.629792 |
| $t_{\mathrm{http}}$ | HTTP 启动日志的时刻 | 公开日志，20:33:14.477283 |
| $W_{\mathrm{ready}}$ | 等到 worker 就绪的时间 | 本步相减 |
| $W_{\mathrm{http}}$ | ready 到 HTTP 启动的时间 | 本步相减 |
| $W_{\mathrm{total}}$ | 第一条日志到 HTTP 启动的总等待 | 本步相加 |

### 代入图上的数

$$W_{\mathrm{ready}}=21.600474\ \mathrm{s},\qquad W_{\mathrm{http}}=0.847491\ \mathrm{s}$$

$$W_{\mathrm{total}}=21.600474+0.847491=22.447965\ \mathrm{s}$$

`src/ml-sys/numbers.ts` 保存相对第一条日志的微秒数，组件再除以 $1{,}000{,}000$ 转成秒。caption 保留两位小数，图上和本节保留六位小数。

这是文章记录的一次单节点启动，不代表每次启动都要这么久，也不提供多节点加速比。本章先借它分清「worker 就绪」和「HTTP 开始监听」两个事件。

### 接下来

启动命令怎样把两台机器组成同一个服务？下一步先看两节点的分工。

来源：`Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:69-88`；`ai-dynamo/dynamo@670661f6` 的 `lib/llm/src/engines/sglang/worker.rs:341-343`、`launch/dynamo-run/src/lib.rs:407-410`。

## 第 2 步 · 两个节点使用不同请求入口

**一句话。** 公开配置让两个节点共用模型与 `dist-init-addr`，node 0 用 `in=http` 接请求，node 1 用 `in=none`。

### 图上是什么

- `node` 是参与实验的一台机器；`node-rank 0` 和 `node-rank 1` 是两台机器在配置里的编号。
- `--num-nodes 2` 声明节点总数。两边还要使用同一个模型目录和 `dist-init-addr`，后者是分布式初始化时共同会合的地址。
- 上方两条命令都以 `out=sglang` 选择 SGLang 后端。node 0 的 `in=http` 开启 HTTP 输入；node 1 的 `in=none` 不再开第二个 HTTP 入口，但 worker 进程仍然运行。
- 图中的 `<model>` 和 `<node0-ip>` 是占位符，不是文章里的本机路径和 IP。

### 公式与符号

$$N_{\mathrm{node}}=2,\qquad r_{\mathrm{node}}\in\{0,1\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N_{\mathrm{node}}$ | 本实验的节点数 | 公开配置的 `--num-nodes 2` |
| $r_{\mathrm{node}}$ | 当前节点的编号 | 公开配置的 `--node-rank 0` 或 `1` |

### 代入图上的数

node 0 使用 `in=http`、`node-rank 0`，node 1 使用 `in=none`、`node-rank 1`。两条命令的 `num-nodes` 都是 2，模型路径与会合地址也必须指向同一次实验。

固定版本源码把 `num_nodes`、`node_rank` 和 `leader_addr` 组成 `MultiNodeConfig`，再传进 SGLang 的 `nnodes`、`node_rank` 和 `dist_init_addr`。`Input::Http` 运行 HTTP 服务；`Input::None` 只等待，不再创建另一个用户输入。非 0 节点还会被代码强制改成 `Input::None`，因此客户端不应把第二个节点当成另一个独立 HTTP 服务。

### 接下来

两台机器已经分工，公开配置里的 `--tensor-parallel-size 8` 又怎样安排 worker？下一步展开这 8 个 worker。

来源：`Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:97-106`；`ai-dynamo/dynamo@670661f6` 的 `launch/dynamo-run/src/lib.rs:235-250,407-443`、`lib/llm/src/engines/sglang/subprocess.rs:59-65`、`lib/llm/src/engines/sglang/sglang_inc.py:43-48`。

## 第 3 步 · 8 个 TP worker 分到两个节点

**一句话。** `--tensor-parallel-size 8` 让 8 个 worker 分担同一模型的计算，这份配置在每个节点启动 4 个。

### 图上是什么

- `tensor parallel` 缩写为 TP，意思是把同一模型的计算分给多个 worker；每个蓝框是一个 TP worker。
- node 0 里是 TP rank 0–3，node 1 里是 TP rank 4–7。这里的 TP rank 是 worker 的全局编号，不要与第 2 步的节点编号 `node-rank` 混为一谈。
- 两个节点都写 `--tensor-parallel-size 8`，它表示整个 TP 组的 worker 总数，不是每节点 8 个。
- 底部用 $8÷2=4$ 得到每节点 worker 数。本章不展开 TP 的矩阵切法，第 4 章已经讲过这些 worker 为什么需要交换张量。

### 公式与符号

$$W_{\mathrm{node}}=\frac{N_{\mathrm{TP}}}{N_{\mathrm{node}}},\qquad R_r=\{rW_{\mathrm{node}},\ldots,(r+1)W_{\mathrm{node}}-1\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N_{\mathrm{TP}}$ | 整个 TP 组的 worker 总数 | `--tensor-parallel-size 8` |
| $N_{\mathrm{node}}$ | 节点数 | 第 2 步，2 |
| $W_{\mathrm{node}}$ | 每个节点启动的 worker 数 | 本步计算 |
| $r$ | 当前节点编号 | 第 2 步，0 或 1 |
| $R_r$ | 节点 $r$ 上的全局 TP rank 集合 | 本步按源码公式展开 |

### 代入图上的数

$$W_{\mathrm{node}}=8÷2=4$$

$$R_0=\{0,1,2,3\},\qquad R_1=\{4,5,6,7\}$$

固定版本 `worker.rs` 先算 `tp_size_per_node = tp_size / num_nodes`，再用它求 `tp_rank_start` 和 `tp_rank_end`，为区间内每个 TP rank 启动一个 SGLang 子进程。`sglang_inc.py` 另注明 TP rank 必须跨节点全局唯一。

两条完整公开命令可写成下面的占位形式。两边的模型、TP 总数、节点数和会合地址相同，只有输入方式与 `node-rank` 不同。

```bash
# node 0
dynamo-run in=http out=sglang --model-path <model> \
  --tensor-parallel-size 8 --num-nodes 2 --node-rank 0 \
  --dist-init-addr <node0-ip>:9876

# node 1
dynamo-run in=none out=sglang --model-path <model> \
  --tensor-parallel-size 8 --num-nodes 2 --node-rank 1 \
  --dist-init-addr <node0-ip>:9876
```

### 接下来

8 个 worker 启动时，HTTP 入口在哪一步才出现？下一步把本机就绪检查和日志排障放在一起。

来源：`Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:97-106`；`ai-dynamo/dynamo@670661f6` 的 `lib/llm/src/engines/sglang/worker.rs:283-343`、`lib/llm/src/engines/sglang/sglang_inc.py:79-89`；`zero-to-sglang/course-material/ch/part3/第4章_横向扩展.md:19-34`。

## 第 4 步 · 启动前检查与本机就绪

**一句话。** 先核对模型、版本和会合地址；每个节点再等待本机 4 个 worker 就绪，异常时检查 worker 进程和日志。

### 图上是什么

- 顶部三项是 `preflight`，即启动前检查：两边使用同一模型，软件版本兼容，并且能连到共同的 `dist-init-addr`。这是实验核对单，不是 Dynamo 自动完成的检查。
- 两台节点各保留第 3 步的 4 个 TP worker。`r0 ✓` 到 `r7 ✓` 表示对应 worker 已发出就绪信号。
- node 0 在本机 worker 就绪后进入 HTTP 输入；node 1 保持 `in=none`，其 worker 加入同一个 TP 组。
- 底部提醒旧版指南的限制：SGLang worker 初始化失败时，`dynamo-run` 可能静默退出。因此没有 ready 时要检查 worker 进程与日志，不能只看 HTTP 端口。

### 公式与符号

$$N_{\mathrm{ready},0}=|R_0|=4,\qquad N_{\mathrm{ready},1}=|R_1|=4$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $R_0,R_1$ | 两个节点上的 TP rank 集合 | 第 3 步 |
| $N_{\mathrm{ready},0}$ | node 0 已就绪的本机 worker 数 | 本步就绪检查 |
| $N_{\mathrm{ready},1}$ | node 1 已就绪的本机 worker 数 | 本步就绪检查 |
| $|R_r|$ | 集合 $R_r$ 中的 rank 数 | 第 3 步，每集合 4 个 |

### 代入图上的数

$$N_{\mathrm{TP}}=N_{\mathrm{ready},0}+N_{\mathrm{ready},1}=4+4=8$$

固定版本源码注明这些 SGLang worker 必须一起启动。每个节点的 `SgLangWorker::start` 逐一等待本机 `process_group` 的 ready 通知；node 0 的 `make_engine` 返回后才运行 `Input::Http`。因此，node 0 的 HTTP 日志说明它的本地启动路径已经走到 HTTP，不能单独证明另一个节点能正确回答请求。

zero-to-sglang 的部署章节建议先核对模型、硬件与版本，再检查服务进程、日志和最小请求。本章把这套顺序用于多节点实验，但不把单节点 recipe 当成多节点验证结果。

### 接下来

进程和就绪日志检查完后，下一步发出最小 HTTP 请求，验证整条路径真的可用。

来源：`Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:130-132`；`ai-dynamo/dynamo@670661f6` 的 `lib/llm/src/engines/sglang/worker.rs:305-343`、`launch/dynamo-run/src/lib.rs:253-270,407-443`；`zero-to-sglang/course-material/ch/part4/第1章_用Cookbook部署SGLang.md:17-24,48-98`。

## 第 5 步 · 用一个短请求检查回答

**一句话。** 向 node 0 发一个最多生成 8 个 token 的请求，返回回答文本就说明这条路径能完成一次服务。

### 图上是什么

- 左侧是另一个终端里的客户端。请求包含模型名、一个用户问题和 `max_completion_tokens 8`；这个参数把生成量限制为最多 8 个新 token。
- 请求只发给 node 0 的 `HTTP :8080`。它沿用第 2 步的 `in=http out=sglang`，不是另开 node 1 的入口。
- 橙色返回箭头代表 HTTP 回答。底部检查 `choices[0].message.content` 是否有回答文本。
- `<model>` 是占位符。8 是本章为短请求选的教学上限，不是 Dynamo 默认值，也不是原文公开回答的 token 数。

### 公式与符号

$$N_{\mathrm{req}}=1,\qquad N_{\mathrm{new}}\le C_{\mathrm{smoke}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N_{\mathrm{req}}$ | 本次检查发送的请求数 | 本步，1 |
| $N_{\mathrm{new}}$ | 服务实际生成的新 token 数 | 请求完成后统计 |
| $C_{\mathrm{smoke}}$ | 本次短请求的生成上限 | `numbers.ts`，8 |

### 代入图上的数

$$N_{\mathrm{req}}=1,\qquad N_{\mathrm{new}}\le8$$

适配公开例子的请求如下。把 `<node0-ip>` 和 `<model>` 换成本次实验值；模型名必须与启动时注册的名字一致。

```bash
curl --fail-with-body http://<node0-ip>:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "<model>",
    "messages": [{"role": "user", "content": "What is the capital of South Africa?"}],
    "max_completion_tokens": 8
  }'
```

公开指南给出了同一路径的请求和 JSON 回答；zero-to-sglang 建议检查回答字段，并明确一次成功不能证明高并发性能或模型质量。本步另外缩短生成长度，只检查连通性；公开例子的 token 计数不是这次多节点实验结果。

### 接下来

回答已经返回。下一步打开这条路径，看文本怎样变成 token，怎样到达 8 个 worker，再怎样回到客户端。

来源：`Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:85-95`；`ai-dynamo/dynamo@670661f6` 的 `launch/dynamo-run/src/input/http.rs:43-47,95-108`；`zero-to-sglang/course-material/ch/part4/第1章_用Cookbook部署SGLang.md:64-83`。

## 第 6 步 · 同一请求的输入与返回

**一句话。** node 0 把文本转成 token ID，客户端请求经 rank 0 进入 TP 组，8 个 worker 计算后再把回答送回客户端。

### 图上是什么

- 上排是蓝色输入路：客户端问题先到 node 0 的 HTTP 入口，再把文本转成 token ID，交给 rank 0 的 scheduler，最后进入 8 个 worker 组成的 TP 组。
- 下排是橙色输出路：TP 组产生新 token ID，经 rank 0 的输出返回，再组成文本和 HTTP 回答，交还客户端。
- `rank 0` 是 TP worker 的全局编号，不是 node-rank。第 3 步已把 r0–r3 放在 node 0，把 r4–r7 放在 node 1。
- 手机图把 node 0 画两次，分别表示同一节点的输入和输出阶段。两排共用同一个客户端入口和同一组 worker。

### 公式与符号

$$r_{\mathrm{in}}=0,\qquad R_{\mathrm{compute}}=R_0\cup R_1=\{0,1,\ldots,7\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $r_{\mathrm{in}}$ | 接收本次客户端输入的 TP rank | 固定版本配置，0 |
| $R_{\mathrm{compute}}$ | 参加本次 TP 计算的 rank 集合 | 第 3 步 |
| $R_0,R_1$ | 两台节点上的 rank 集合 | 第 3 步，各 4 个 |

### 代入图上的数

$$r_{\mathrm{in}}=0,\qquad R_{\mathrm{compute}}=\{0,1,2,3\}\cup\{4,5,6,7\}$$

固定版本的 HTTP 管线把 preprocessor、backend 和 SGLang engine 串联。engine 的 input loop 取出 token ID，构造请求并通过本地 ZMQ socket 发给 rank 0 scheduler；output loop 读取 rank 0 scheduler 的输出，把新增 token ID 送回响应管线。ZMQ 是进程间传消息的 socket，第 1 本 Ch. 9 Steps 6–9 已画过这种输入和输出通道。

多节点配置还明确写道：非 0 节点从 leader 的 PyTorch distributed 路径接收工作，不直接从用户接收。8 个 TP worker 共同计算时交换张量，第 4 章第 4、6 步已经解释通信后端和 Ring 教学例。本图不展开序列化、socket 缓冲和 HTTP 流式分块。

### 接下来

现在能跟踪请求的位置了。下一步沿同一条路放计时点，核对首 token 前、后续生成和全程各等多久。

来源：`ai-dynamo/dynamo@670661f6` 的 `launch/dynamo-run/src/input/http.rs:85-104`、`launch/dynamo-run/src/lib.rs:235-250`、`lib/llm/src/engines/sglang/worker.rs:425-443,588-758`；第 1 本 Ch. 9 Steps 6–9；本书第 4 章第 4、6 步。

## 第 7 步 · 在客户端核对各段等待

**一句话。** 客户端从请求发出计时，到第 1 个 token 得到 TTFT，再加后续 3 段间隔得到 E2E。

### 图上是什么

- 请求发出时是 0 ms，客户端在 250 ms 收到第 1 个 token，在 325 ms 收到末个 token。橙色标 token 到达，蓝色标测到的时间段。
- 第一段是 TTFT，为 250 ms。第 1 个 token 后还有 3 段 ITL，分别是 25、20、30 ms，合计 75 ms。
- 4 个输出 token 没超过第 5 步的上限 8。这里的 4 个 token 和全部时刻都沿用第 1 章的构造教学例，不是 Dynamo 返回这条请求时的实测。
- 计时点都在客户端。它能核对首 token 前、后续生成和全程各等多久，但不能把 250 ms 再拆成网络、排队、prefill 和 TP 通信的各自耗时。

### 公式与符号

$$\mathrm{E2E}=t_4-t_0=\mathrm{TTFT}+\sum_{i=2}^{4}\mathrm{ITL}_i$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t_0$ | 客户端发出请求的时刻 | 第 1 章构造例，0 ms |
| $t_4$ | 客户端收到第 4 个、也是末个 token 的时刻 | 第 1 章构造例，325 ms |
| $\mathrm{TTFT}$ | 请求发出到收到第 1 个 token 的等待 | 第 1 章第 1 步，250 ms |
| $\mathrm{ITL}_i$ | 相邻两个输出 token 到达客户端的间隔 | 第 1 章第 2 步，25、20、30 ms |
| $\mathrm{E2E}$ | 请求发出到收到末个 token 的全程耗时 | 第 1 章第 4 步 |

### 代入图上的数

$$\mathrm{TTFT}=250-0=250\ \mathrm{ms}$$

$$\sum_{i=2}^{4}\mathrm{ITL}_i=25+20+30=75\ \mathrm{ms}$$

$$\mathrm{E2E}=325-0=250+75=325\ \mathrm{ms}$$

若要定位等待落在服务内部的哪一段，需要在相应边界另加时间戳或 tracing；本图没有这些测量，不能从客户端总时长反推各段耗时。本步也不把最后一个 token 之后的处理时间计入 E2E，边界与第 1 章相同。

### 接下来

这条服务路径已经能启动、回答并计时。下一章在服务旁边加入训练进程，看回答、训练和新权重怎样组成 slime 的一轮循环。

来源：本书第 1 章第 1、2、4 步；`src/ml-sys/numbers.ts` 的 `DEMO_*` 与 `DYNAMO_SMOKE_MAX_TOKENS`；zero-to-sglang 第 1 部分第 5 章 §3.1 的计时边界；`Awesome-ML-SYS-Tutorial/rlhf/slime/code-walk-through/readme.md:71-81` 的生成、训练和权重更新顺序。
