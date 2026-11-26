## 第 1 步 · 更新调用里藏着等待

**一句话。** 一个按 1B 估算的 bf16 模型约有 2 GB 权重，一次调试花了 7.047 秒替换这些权重。

### 图上是什么

- 训练端已经得到 `weights v1`，也就是新的数字表。接着第 6 章第 8 步，rollout 要等更新完成才使用 v1。
- 左卡推算权重大小，右卡给出调试记录里的完整更新耗时。
- 下方这组小时间对照一个张量内部的权重装入操作和整个外部调用，说明只测内部会漏掉部分等待。

### 公式与符号

$$B=P\times b$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 保存的权重数值个数 | 按 1B 估算，即 $10^9$ |
| $b$ | 每个权重数值的字节数 | bf16 占 2 字节 |
| $B$ | 权重总字节数 | 本步计算 |

### 代入图上的数

$$B=1{,}000{,}000{,}000\times2=2{,}000{,}000{,}000\ \text{字节}=2\ \text{GB}$$

7.047 秒是作者在这套 distributed 更新环境中的完整测量。0.001 秒和 0.033 秒来自一个权重张量示例，两者舍入后的比值是 $0.033/0.001\approx33$ 倍，不能用来预测另一台机器或另一个模型。

### 接下来

控制器知道 rollout 要拿到 v1，还不知道哪条路把 v1 送过去。下一步比较三条更新通道。

来源：`Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:556-558,980-1007`；第 6 章第 8 步。

## 第 2 步 · 三条更新通道的地图

**一句话。** Checkpoint 文件、process group 和 GPU 位置便签是三条备选路线，都能交付同一套 v1 权重。

### 图上是什么

- 磁盘卡把 `checkpoint` 定义为存好的权重：先写文件，再读文件。`update_weights_from_disk` 走这条路。
- Distributed 卡把 `process group` 定义为一起传权的成员：一个发送方把数值交给多个接收方。
- Tensor 卡把 `handle` 定义为 GPU 位置便签：先发送便签，再找到张量。第 4 步展开这个机制。
- 三张卡都是蓝色，因为它们都是备选权重交接路线。一次更新只选一条。

### 公式与符号

$$c\in\{\text{disk},\text{distributed},\text{tensor}\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $c$ | 一次交接选用的更新通道 | 三张卡中的一张 |
| $v1$ | 这条通道交付的权重版本 | 第 6 章第 8 步 |

### 代入图上的数

地图上的 3 来自接口对比中的三条路线。本步不新增引擎数量、字节总数或计时，尤其不虚构磁盘耗时。

### 接下来

下一步展开 distributed 卡：训练 rank 0 在 process group 里广播完整权重张量。

来源：`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:400-409`；`sgl-project/sglang@392e441ad17c78b68638f2d959fcf592d19b4834` 的 `python/sglang/srt/model_executor/model_runner.py:641-694`。

## 第 3 步 · 在 process group 里广播数值

**一句话。** Distributed 通道把 1 个训练 rank 和推理端的 TP rank 放进同一个 process group，再从训练 rank 0 逐个广播完整权重张量。

### 图上是什么

- Process group 是参与这次传输的一组 rank。Rank 是成员编号，不一定对应一个独立的顶层进程。
- `broadcast` 把相同的权重张量数值发给每个成员。橙色是训练发送方，蓝色是推理接收方。TP 1 有一个推理接收方，TP 2 有两个。
- 下方顺序对每个权重张量重复：先分配接收空间，从 rank 0 广播完整张量，留下本推理 rank 负责的部分，再装入。

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

这条通道通过通信组传递权重张量的数值。Tensor 通道改为传句柄，让推理端找到已经拼好的 GPU 张量。

来源：`Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:232-262,399-412,931-950`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:407`；`sgl-project/sglang@392e441ad17c78b68638f2d959fcf592d19b4834` 的 `model_runner.py:696-772`。

## 第 4 步 · 发送指向完整张量的句柄

**一句话。** Tensor 通道先拼好完整参数，把重建句柄交给 SGLang，再由每个推理 rank 重建并装入张量。

### 图上是什么

- 一个 parameter 就是一张权重表。四个橙色训练分片各有 256 行、1024 列，记作 `[256,1024]`。`full_tensor()` 把它们拼成一个 `[1024,1024]` 张量。
- `MultiprocessingSerializer.serialize` 把位置便签打包成 handle tuple，里面有形状、大小和存储位置，没有权重数据本体。
- 灰色箭头表示便签交接。`gather_object` 把便签收拢到 rank 0。每个 SGLang rank 用 `tensor.get(tp_rank)` 选自己的句柄并重建完整张量，`load_weights` 再留下该 rank 负责的部分。蓝色表示这些推理端工作。

### 公式与符号

$$E=r\times c,\qquad E=T\times r_s\times c$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $r,c$ | 完整张量的行数与列数 | 都是 1024 |
| $T$ | 训练分片数 | 本例有 4 块训练分片 |
| $r_s$ | 一个训练分片的行数 | $1024\div4=256$ |
| $E$ | 拼好后的元素总数 | 本步计算 |

### 代入图上的数

$$E=4\times256\times1024=1024\times1024=1{,}048{,}576$$

也就是约 105 万个数。加载器选出本地部分后，来源中的 SGLang TP 2 布局让每个推理 rank 持有 `[512,1024]`。这个例子没有指定数据类型，所以图中只数元素，不编字节数。

### 接下来

一次只拼一个参数，临时占用有边界。若把整套训练模型恢复到 SGLang 旁边，显存仍可能不够，所以 slime 分桶处理权重。

来源：`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:51-60,132-204`；`volcengine/verl@0508af25b66e839772fba8e79d97896bf0d843d3` 的 `verl/workers/sharding_manager/fsdp_sglang.py:160-188`；固定 SGLang 版本的 `model_runner.py:774-792,1464-1479`。

## 第 5 步 · 用 bucket 限制临时占用

**一句话。** 训练权重在训练后先移出 GPU，slime 每次恢复、转换并传输一桶，等完成后清空，再复用空间。

### 图上是什么

- 两幅面板使用相同的 SGLang 和 KV 框，对照旁边放整套训练模型或只放一桶。图形只示关系，不按字节比例绘制。
- 右图只有 `bucket 1` 被恢复到 GPU，后面的桶在 GPU 外等待。
- 下方顺序以 `ray.get` 和 `clear` 收尾。发送方等 SGLang 更新完成后才释放这桶的转换结果。

### 公式与符号

$$R_{\text{all}}=S+M,\qquad R_{\text{bucket}}=S+b,\qquad b<M$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $S$ | SGLang 权重、KV 等驻留状态 | 已有 rollout 分配 |
| $M$ | 同时恢复的整套训练模型 | 左图 |
| $b$ | 恢复的一组 bucket 参数 | 右图 |
| $R$ | 两边合计的临时驻留 | 各图相加 |

### 代入图上的数

来源没有给出 $S$、$M$ 或 $b$ 的数值。这里只能说明一次恢复的参数更少，不能编造节省百分比或字节数。面板形状不表示比例。

### 接下来

分桶限制了显存，但参数仍逐个变化。下一步画出更新边界，防止生成过程读到一半旧、一半新的模型。

来源：`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:254-272,280-296,329-395`。

## 第 6 步 · 关闭版本边界后再开始 rollout

**一句话。** 等当前请求结束、每个参数更新完、旧 KV 失效并且更新调用结束后，才能恢复 rollout。

### 图上是什么

- 蓝色是完整的 v0 和 v1，红色虚线框里的新旧混合不能用于生成。
- 四个框依次执行：等当前请求结束、更新每个参数、等待完成，再开始第 1 轮。
- v0 产生的缓存属于旧权重。slime 在分桶前重置 prefix cache，另一个 RL 框架 verl 在最后一个参数时请求 flush。

### 公式与符号

$$U=\bigwedge_{i=1}^{n}u_i,\qquad \text{开始 rollout}\Rightarrow U$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $u_i$ | 第 $i$ 个参数已经更新完 | 每个参数的装入边界 |
| $n$ | 需要更新的参数总数 | 被替换的模型 |
| $U$ | 所有必需参数都已更新 | 全部 $u_i$ 的 AND |
| $\bigwedge$ | 对所有参数做逻辑 AND | 本步记号 |

### 代入图上的数

图中不指定参数总数。只要一个 $u_i$ 失败，模型就可能只更新了一部分，必须弃用，不能继续 rollout。这条规则不表示图中的实现已经提供崩溃安全事务。

### 接下来

这个边界保证生成不会读到混合版本，却没有说明等待在哪里。下一步给外部调用计时，找出 `ModelRunner` 外面固定的 CPU sleep。

来源：`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:268-287`；`verl/workers/sharding_manager/fsdp_sglang.py:98-135,164-188`；`Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:451-458,1011-1058`。

## 第 7 步 · 找出 ModelRunner 外面的固定等待

**一句话。** `ModelRunner` 外面的三次 10 ms sleep 解释了 33 ms 外部调用的大部分等待，去掉后这次完整更新从 7.047 秒降到 2.202 秒。

### 图上是什么

- 两条完整更新柱使用同一比例。去掉 sleep 后的 2.202 秒柱与原来的 7.047 秒柱并排。
- 下方长条把舍入后的 33 ms 外部调用拆成：`ModelRunner` 内部 1 ms、三次 10 ms sleep、其他舍入时间 2 ms。
- `ModelRunner` 是每个推理 rank 上持有模型的代码，`sleep` 是编程设定的暂停。只测内部会漏掉这些暂停。调试记录还在 GPU 计时区域前后同步 CUDA，避免 CPU 计时器越过排队的工作。

### 公式与符号

$$T_{\text{outer}}\approx T_{\text{inner}}+n\,t_s+T_{\text{other}},\qquad S=T_0-T_1,\qquad Q=T_0/T_1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_{\text{inner}}$ | `ModelRunner` 操作耗时 | 舍入为 1 ms |
| $n,t_s$ | sleep 次数与每次时长 | $3\times10$ ms |
| $T_{\text{other}}$ | 剩余的外部耗时 | 舍入为 2 ms |
| $T_0,T_1$ | 去掉 sleep 前后的完整更新耗时 | 7.047 和 2.202 秒 |
| $S,Q$ | 少等秒数与前后时间比 | 本步计算 |

### 代入图上的数

$$1+3\times10+2=33\ \text{ms}$$
$$S=7.047-2.202=4.845\ \text{s},\qquad Q=7.047/2.202\approx3.20$$

这些数字是一位作者在同一调试过程中的舍入测量，不能据此宣称普遍有 3.20 倍改善。

### 接下来

去掉固定等待并不会缩小训练保存的表。最后一步留下显存问题：这些表装不下时，怎样让每个训练进程只保存一部分？

来源：`Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:584-605,980-1007,1023-1030,1061-1065`。

## 第 8 步 · 把训练保存的表留给下一章

**一句话。** 权重更新只交付模型参数，训练还要保存梯度和优化器状态；一张 GPU 装不下这些表时，下一章要把它们分开保存。

### 图上是什么

- `weights v1` 是本章传输的模型数字，`gradients` 是修改这些数字的方向。
- 优化器是训练时负责更新权重的部件，优化器状态是它为了后续更新而额外保存的一组表。
- 这三类需要保存的表组成橙框。激活和临时分配也占显存，但本步明确不展开它们，只看 FSDP2 要切分的这些表。
- 三个蓝色虚线 GPU 卡上都只有问号。本图不回答每份份额怎样选择。

### 公式与符号

$$\mathcal{T}_{\text{saved}}=\{W,G,O\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $W$ | 模型权重 | 本章的 v1 |
| $G$ | 梯度，即修改权重的方向 | 训练过程 |
| $O$ | 优化器状态，即权重更新器保存的表 | 训练过程 |
| $\mathcal{T}_{\text{saved}}$ | 这三类保存的表，不含激活 | 三者的集合 |

### 代入图上的数

本步不引入新的大小。来源没有为这三类表提供一致的数据类型和大小，所以无法计算总量。

### 接下来

第 8 章用 FSDP2 回答图上的问题：训练时把参数、梯度和优化器状态分到多张 GPU，rollout 前再收齐权重。本章停在这个机制之前。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16`；`docs/plan-ml-sys.md:27-28`。
