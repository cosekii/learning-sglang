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
