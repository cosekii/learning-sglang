## 第 1 步 · 更新调用里藏着等待

**一句话。** 一个按 1B 估算的 bf16 模型约有 2 GB 权重，一次调试花了 7.047 秒替换这些权重。

### 图上是什么

- 训练端已经得到 `weights v1`，也就是新的数字表。接着第 6 章第 8 步，rollout 要等更新完成才使用 v1。
- 左卡推算权重大小，右卡给出调试记录里的完整更新耗时。
- 下方这组小时间对照一个参数在 `ModelRunner` 内部的操作和整个外部调用，说明只测内部会漏掉部分等待。

### 公式与符号

$$B=P\times b$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 参数数量 | 按 1B 估算，即 $10^9$ |
| $b$ | 每个参数的字节数 | bf16 占 2 字节 |
| $B$ | 权重总字节数 | 本步计算 |

### 代入图上的数

$$B=1{,}000{,}000{,}000\times2=2{,}000{,}000{,}000\ \text{字节}=2\ \text{GB}$$

7.047 秒是作者在这套 distributed 更新环境中的完整测量。0.001 秒和 0.033 秒来自一个 `q_proj` 示例，不能用来预测另一台机器或另一个模型。

### 接下来

控制器知道 rollout 要拿到 v1，还不知道哪条路把 v1 送过去。下一步比较三条更新通道。

来源：`Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:556-558,980-1007`；第 6 章第 8 步。

## 第 2 步 · 磁盘通道读取同一份 checkpoint

**一句话。** 训练端可以把 v1 存成 checkpoint，每个 rollout 再通过 `update_weights_from_disk` 装入这份相同的副本。

### 图上是什么

- 上方三张卡是三条备选更新通道：磁盘、distributed 数值和 tensor 句柄。一次更新选择其中一条。
- 蓝色标出磁盘路线。训练端写入 checkpoint，各 rollout 读取它，模型加载器再替换旧权重。
- Checkpoint 既是持久保存的训练输出，也是更新交接物。新加入的 rollout 可以直接读取，不必加入另外两条路线的通信组。

### 公式与符号

$$v_{\text{train}}=v_{\text{checkpoint}}=v_{\text{rollout},r}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $v_{\text{train}}$ | 训练后写出的权重版本 | 第 6 章第 8 步的 v1 |
| $v_{\text{checkpoint}}$ | checkpoint 保存的版本 | 磁盘交接物 |
| $v_{\text{rollout},r}$ | 第 $r$ 个 rollout 装入的版本 | 同一份 checkpoint |

### 代入图上的数

本步不新增权重大小、引擎数量或计时。来源只说等待取决于存储和加载过程，没有给出磁盘测量，所以图中不填时长。

### 接下来

磁盘路线会经过存储。下一条路线不经过 checkpoint，而是让训练和推理进程加入同一个通信组，直接广播参数数值。

来源：`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:400-409`；`sgl-project/sglang@392e441ad17c78b68638f2d959fcf592d19b4834` 的 `python/sglang/srt/model_executor/model_runner.py:641-694`。

## 第 3 步 · 在 process group 里广播数值

**一句话。** Distributed 通道把 1 个训练 rank 和推理端的 TP rank 放进同一个 process group，再从训练 rank 0 逐个广播参数。

### 图上是什么

- Process group 是参与这次传输的一组 rank。Rank 是成员编号，不一定对应一个独立的顶层进程。
- 橙色是训练发送方，蓝色是推理接收方。TP 1 有一个推理接收方，TP 2 有两个。
- 下方顺序对每个参数重复：先分配接收空间，再从 rank 0 广播，最后装入收到的数值。

### 公式与符号

$$W=R_{\text{train}}+T$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $R_{\text{train}}$ | 本例提供数值的训练 rank 数 | 1 |
| $T$ | 推理端张量并行 rank 数 | `tp_size` |
| $W$ | 更新 process group 的 `world_size` | 两侧相加 |

### 代入图上的数

$$T=1\Rightarrow W=1+1=2,\qquad T=2\Rightarrow W=1+2=3$$

图中只标通信组的成员数，不表示顶层只有两个或三个进程。

### 接下来

这条通道通过通信组传递参数数值。Tensor 通道改为传句柄，让推理端找到已经拼好的 GPU 张量。

来源：`Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:232-262,399-412,931-950`；`sgl-project/sglang@392e441ad17c78b68638f2d959fcf592d19b4834` 的 `model_runner.py:696-772`。
