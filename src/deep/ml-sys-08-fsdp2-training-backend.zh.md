## 第 1 步 · 算清完整训练副本的账

**一句话。** 完整复制让每张 GPU 都保存同样的权重、梯度和优化器状态，本例每张占 64 GB，8 张合计 512 GB。

### 图上是什么

- 橙卡把 8 GB 的 16 位权重、8 GB 的 16 位梯度和 48 GB 的优化器相关表分开。三者组成一张 GPU 上 64 GB 的训练保存状态。
- 蓝卡把同一份 64 GB 复制到 8 张 GPU。512 GB 是重复副本的总和，不是 8 个不同模型。
- 80% 对照沿用前面章节的 H100 80 GB 容量。本例只算保存的表，不是完整显存预算。

### 公式与符号

$$M=P(b_w+b_g+b_o),\qquad C=N M,\qquad f=M/(80\ \text{GB})$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 模型权重数值的个数 | 构造的 4B 示例，$4\times10^9$ |
| $b_w,b_g$ | 每个权重和梯度的存储字节数 | 本例都取 2 字节 |
| $b_o$ | 每个权重数值对应的优化器字节数 | 3 张 FP32 表，$3\times4=12$ 字节 |
| $M$ | 一张完整复制 GPU 保存的训练表 | 本步计算 |
| $N$ | 完整副本数量 | 8 张 GPU |
| $C$ | 所有副本保存的表总量 | 本步计算 |
| $f$ | $M$ 占一张 80 GB H100 的比例 | 共享 H100 容量 |

### 代入图上的数

$$M=4{,}000{,}000{,}000\times(2+2+12)=64{,}000{,}000{,}000\ \text{字节}=64\ \text{GB}$$
$$C=8\times64\ \text{GB}=512\ \text{GB},\qquad f=64/80=0.8=80\%$$

优化器约定有 3 张 FP32 表：master 权重是用于更新的全精度权重副本，momentum 是梯度的滑动平均值，variance 是梯度平方的滑动平均值。它只属于这个算例，不代表所有 FSDP2 配置。激活、聚合缓冲和运行时分配尚未计入。

### 接下来

代价来自重复保存同样的表。下一步把同样的表分给 8 个 rank，不再每张卡都留完整副本。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:21-31`；`src/numbers.ts` 的共享 `HBM_GB`。

## 第 2 步 · 每个 rank 只留一片

**一句话。** FSDP2 把参数、梯度和优化器状态分给 data parallel（DP）组；组内各 rank 使用不同训练样本，每个 rank 留下对应的分片，不再保存完整副本。

### 图上是什么

- 橙色逻辑张量 `W` 是一个完整参数。图中用 8 行编号的小例子让拆分过程看得见。
- `Shard(0)` 是 DTensor 的 placement：把第 0 维，也就是本例的行，分给 8 个 DP rank。蓝格展示每个 rank 保存的本地分片。本例中，rank `r` 在第 `r` 张 GPU 上保存第 `r` 行。
- `所有保存的表` 标出整体显存账，与上方一个参数的一行分片分开。橙柱和蓝柱用同一比例，250 px = 512 GB：8 份完整副本占 512 GB，8 个拥有分片合计占 64 GB。算式推出每个 rank 的训练状态为 `64 ÷ 8 = 8` GB，并拆成 `1 + 1 + 6` GB。
- 底框只指向下一步的共同动作：需要完整数值时，把这些部分拼回去。第 3 步的 all-gather 拼出计算用的完整一层。第 6 步通过 `Replicate()` 重新分布，拼出导出的一个完整权重张量。
- 手机用卡片展示同样的逻辑张量、placement、本地分片和显存算式。行和显存都等分只是教学简化，不保证真实张量都能整除。

### 公式与符号

$$M_i=M/R,\qquad C_{\text{shard}}=R M_i$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $M$ | 一份完整训练状态的字节数 | 第 1 步，64 GB |
| $R$ | DP 分片组的 rank 数 | 本例 8 个 rank |
| $i$ | 一个 rank 的编号 | rank 0 到 7 |
| $M_i$ | rank $i$ 拥有并保存的表 | 本步计算，8 GB |
| $C_{\text{shard}}$ | DP 组所有分片的合计 | 本步计算，64 GB |

### 代入图上的数

$$M_i=64\ \text{GB}/8=8\ \text{GB},\qquad C_{\text{shard}}=8\times8\ \text{GB}=64\ \text{GB}$$

每个 rank 的拆分为：权重 $8/8=1$ GB、梯度 $8/8=1$ GB、优化器相关表 $48/8=6$ GB。图中把这些整体显存数字与上方的 8 行参数小例子分开，不把一行当成整个训练状态。

### FSDP2 与 DTensor

FSDP2 把每个参数表示为 DTensor：逻辑张量、它在 device mesh 上的 placement，以及每个 rank 保存的本地分片。在一维 mesh 上，`fully_shard` 用 `Shard(0)` placement 把参数表示为按第 0 维分片的 DTensor。`Shard(0)` 遵循 `torch.chunk(..., dim=0)` 的语义，把第 0 维分到 DP mesh 上。图中取 8 行和 8 个 rank，让每个本地分片都是看得见的一行；真实参数可以有其他形状，分片也可以不等分。

FSDP1 可以把模块的参数拼成一张扁平表，称为 `FlatParameter`。slime 的 `world_size` 是所有 rank 的数量。context parallelism（CP）把序列分给 `cp_size` 个 rank，`dp_size = world_size // cp_size` 则是分片组里的 rank 数。rank 的排列布局称为 mesh，slime 把 DP mesh 传给 `fully_shard`。启用 CP 时，物理 GPU 数和 DP 分片数可以不同；本例取 CP 1。

placement 也解释了后面的两条路径。forward 为计算 all-gather 当前 unit 的参数分片。导出时，slime 对每个参数 DTensor 调用带 `Replicate()` 的 `redistribute`，再使用得到的本地完整张量。

### 接下来

分片能减少长期保存的显存，但计算一层时仍需要这一层的完整参数。下一步临时聚齐这一层。第 6 步会回到同一个 DTensor，通过 `Replicate()` 导出一个完整张量。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16-23`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:43-47,62-82`；`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `slime/backends/fsdp_utils/actor.py:94-98,158-186` 和 `update_weight_utils.py:45-74`；`pytorch/pytorch@v2.8.0` 的 `torch/distributed/fsdp/_fully_shard/_fully_shard.py` 中 `fully_shard`，以及 `torch/distributed/tensor/placement_types.py` 中 `Shard` 和 `Replicate`。

## 第 3 步 · 前向计算先借来完整一层

**一句话。** `zero_grad` 清掉旧梯度分片后，初始 forward 保留 7 GB，再临时聚齐完整一层。

### 图上是什么

- 橙格保存第 2 步的 1 GB 权重分片和 6 GB 优化器相关表。slime 在初始 forward 前调用 `optimizer.zero_grad(set_to_none=True)`，所以这里没有 1 GB 梯度分片。
- `All-gather` 表示每个 rank 都拿出自己的分片，共同重建完整一层。实现把一起聚合的层或参数组称为 unit。
- 蓝色完整一层的临时大小记作 $U$。计算使用完整层，随后 `RELEASE` 删除临时副本，7 GB 权重和优化器表仍在。
- 最后一行恢复第 2 步的完整训练状态账：backward 加入 1 GB 梯度分片，得到 `7 + 1 = 8 GB`。

### 公式与符号

$$M_0=W_i+O_i,\qquad M_{\text{forward}}\approx M_0+U,\qquad M_{\text{after}}=M_0$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $W_i$ | 这个 rank 拥有的权重分片 | 第 2 步，1 GB |
| $O_i$ | 这个 rank 拥有的优化器相关表 | 第 2 步，6 GB |
| $M_0$ | `zero_grad` 后初始 forward 的常驻量 | $W_i+O_i=7$ GB |
| $U$ | 当前计算 unit 的完整参数临时字节数 | unit 大小，来源未给数值 |
| $M_{\text{forward}}$ | 计算这个 unit 时的占用 | 起始表加临时 unit |
| $M_{\text{after}}$ | 释放这个 unit 后的占用 | backward 保存梯度前回到 $M_0$ |

### 代入图上的数

初始 forward 的边界是 $1+6=7$ GB，所以图中画 $7\ \text{GB}+U\rightarrow7\ \text{GB}$。图中不给 $U$ 填值，也不声称实测峰值。只有同时保存梯度分片时，完整训练状态账才是 $7+1=8$ GB。

这次 all-gather 重建的是参数；前向计算不对梯度执行 all-gather。

### 接下来

反向计算也需要参数值，但它新产生的是梯度。下一步看梯度为什么用 reduce-scatter，并回到各 rank 的分片。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:18`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:53-56,101-105`；`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `slime/backends/fsdp_utils/actor.py:522-535`。

## 第 4 步 · 先乘 R/B，再平均梯度

**一句话。** slime 先把每个 rank 的 loss 乘以 $R/B$，FP32 FSDP2 再平均预缩放梯度，并各留对应分片。

### 图上是什么

- 每个 rank 使用不同的训练样本。backward 前，slime 执行 `loss = loss * dp_size / global_batch_size`，让每个 rank 的 loss 带上 $R/B$ 缩放。
- 蓝色临时梯度属于当前一层，由预缩放后的 loss 算出。这条 FP32 归约路径上，FSDP2 的 reduce-scatter 默认用 AVG：对应值先求和，再除以 $R$，最后每个 rank 留一个分片。
- AVG 补上剩下的 $1/R$。$R/B$ 预缩放和 AVG 合起来得到全批均值，不会把更新放大八倍。
- 橙格是这个 rank 为本层留下的平均分片。标签写的是所有层的梯度合计：8 GB ÷ 8 = 每个 rank 1 GB，不是本层临时梯度的大小。
- 所有层算完后，优化器才更新拥有的权重分片，不是图中每流过一个框就更新一次。

### 公式与符号

$$\mathcal L'_r=\mathcal L_r\frac{R}{B},\qquad g_\ell^{(r)}=\frac{R}{B}\tilde g_\ell^{(r)}$$

$$g_{\ell,i}=S_{\ell,i}\!\left(\frac1R\sum_{r=1}^{R}g_\ell^{(r)}\right)=S_{\ell,i}\!\left(\frac1B\sum_{r=1}^{R}\tilde g_\ell^{(r)}\right)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $R$ | DP 分片组的 rank 数，即 `dp_size` | 第 2 步，8 个 rank |
| $B$ | 一次优化器更新使用的 global batch size | 运行配置的 `global_batch_size`；显存算例未填数值 |
| $\mathcal L_r$ | rank $r$ 未经 DP 缩放的 loss | 当前 microbatch |
| $\mathcal L'_r$ | 交给 backward 的预缩放 loss | $\mathcal L_rR/B$ |
| $\ell$ | 正在汇总的层编号 | 图上当前一层 |
| $r$ | 提供梯度的 rank | DP 组的一个成员 |
| $\tilde g_\ell^{(r)}$ | rank $r$ 未经 DP 缩放的梯度 | 对 $\mathcal L_r$ 做 backward |
| $g_\ell^{(r)}$ | rank $r$ 为第 $\ell$ 层算出的**预缩放梯度** | 对 $\mathcal L'_r$ 做 backward，等于 $\tilde g_\ell^{(r)}R/B$ |
| $S_{\ell,i}$ | 选出第 $\ell$ 层梯度中 rank $i$ 拥有的一片 | FSDP 分片位置 |
| $g_{\ell,i}$ | rank $i$ 为第 $\ell$ 层留下的平均梯度片 | FP32 FSDP2 的 AVG reduce-scatter；大小未给出 |

### 代入图上的数

本例有 $R=8$ 个 rank，$B$ 保留符号。另用两个 rank 验算：取 $R=2$、$B=8$，未缩放的标量梯度为 $\tilde g^{(1)}=2$ 和 $\tilde g^{(2)}=6$。预缩放后得到 $g^{(1)}=2\times2/8=0.5$ 和 $g^{(2)}=6\times2/8=1.5$。AVG 算出 $(0.5+1.5)\div2=1$，与全批均值 $(2+6)\div8=1$ 相同。

这条默认 FP32 路径上，FSDP2 把额外的归约前、归约后除数都设为 `None`，由 NCCL 的 AVG 完成 $1/R$ 除法。图上写的是所有层的梯度合计：8 GB ÷ 8 = 每个 rank 1 GB。这里只算梯度表的分片；第 2 步中每个 rank 的完整训练状态账是 8 GB。临时本层梯度和平均后的本层分片都没有给定大小。

slime 设置 `reduce_dtype=torch.float32`，在 `loss.backward()` 的上一行缩放 loss，之后调用 `optimizer.step()`。参数聚合和逐层梯度 reduce-scatter 由 FSDP 包装层处理，actor 没有在这些方法旁另写集合通信调用。

### 接下来

训练状态账变小了，完整 unit 和其他临时结果仍要占空间。下一步区分训练状态账与峰值显存。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:19`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:47-58`；`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `slime/backends/fsdp_utils/actor.py:687-702,1000-1034`；`pytorch/pytorch@v2.8.0` 的 `_fsdp_collectives.py:605-641`。

## 第 5 步 · 训练状态账只是峰值的一部分

**一句话。** 完整训练状态账是 8 GB，最大聚合 unit、激活和其他临时结果还会把峰值推高。

### 图上是什么

- 橙色底格是第 2 步的完整 8 GB 训练状态账。它包括梯度分片，是逻辑账和峰值状态账，不是 forward 的永久常驻下限。第 3 步中，`zero_grad` 清掉梯度分片后，forward 从 7 GB 开始。
- 蓝格是第 3 步借来的最大完整层，来源没有给出它的大小。
- 灰格包含训练中间结果和其他临时结果。激活是训练需要的中间值，随 batch 大小变化。来源没有给出总量，所以图中不填精确总显存。

### 公式与符号

$$M_{\text{state}}=W_i+G_i+O_i,\qquad M_{\text{peak}}>M_{\text{state}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $W_i$ | 这个 rank 拥有的权重分片 | 第 2 步，1 GB |
| $G_i$ | 保存梯度时，这个 rank 拥有的梯度分片 | 第 2 步，1 GB |
| $O_i$ | 这个 rank 拥有的优化器相关表 | 第 2 步，6 GB |
| $M_{\text{state}}$ | 完整训练状态账 | 第 2 步，$1+1+6=8$ GB |
| $M_{\text{peak}}$ | 最忙时需要的显存 | 大于 8 GB 训练账，精确总量未知 |

### 代入图上的数

完整训练状态账是 $M_{\text{state}}=1+1+6=8$ GB。临时层和中间结果使 $M_{\text{peak}}>8$ GB，但大小未知。`zero_grad` 后的初始 forward 则从 $W_i+O_i=7$ GB 开始，再加临时层。

链接来源在 FSDP1 Stage 3 小节给出最大完整 FSDP unit 的公式。本章只借用类别区分，不把该公式当成 FSDP2/slime 的精确峰值测量，也不假设所有分配都能简单相加且没有重叠。

### 接下来

训练结束后，rollout 需要完整的新参数值，不需要梯度和优化器状态。下一步把完整权重张量装进桶，交给已有更新路径。

来源：`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:31,93-107`；`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:18-19`；`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `slime/backends/fsdp_utils/actor.py:522-535`。

## 第 6 步 · 把完整权重张量装桶导出

**一句话。** slime 把每个权重分片重新分布成完整张量，再将完整张量装桶；梯度和优化器状态留在训练端。

### 图上是什么

- 导出只取权重分片，梯度和优化器状态表留在训练框。
- `Replicate()` 把一个 DTensor 的各分片重建为完整逻辑权重张量，不会一次重建所有参数。
- 完整张量加入一个桶。异步结果准备好后，按第 7 章第 5 步每次交接一桶。第 7 章第 6 步会等到完整版本更新完并拒绝旧 KV，所以 rollout 收到的是完整的 `v1`。
- 结尾回到前面步骤的 16 位和 32 位保存表：分片改变的是副本数量，不是每个数占用的位数。

### 公式与符号

$$W_j=\mathcal{R}(D_j),\qquad B_k=\{W_j\mid j\in J_k\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $D_j$ | 参数 $j$ 在整个 DP 组上分片保存的 DTensor | FSDP2 模型状态 |
| $\mathcal{R}$ | 把 $D_j$ 的所有分片重新分布为 `Replicate()` | slime 更新器 |
| $W_j$ | 参数 $j$ 的完整逻辑权重张量 | 重新分布的结果 |
| $J_k$ | 装入第 $k$ 桶的参数索引 | 按大小限制的更新循环 |
| $B_k$ | 一桶完整权重张量 | 交给更新器的桶 |

### 代入图上的数

保存的权重和梯度每个数占 $16/8=2$ 字节。优化器表每个数占 $32/8=4$ 字节，是 $4/2=2$ 倍。

### 自带脚本的装桶阈值

自带 Qwen3-4B FSDP 脚本把 `update_weight_buffer_size` 设为 $536{,}870{,}912$ 字节：

$$536{,}870{,}912/(1024\times1024)=512\ \text{MiB}$$

这是桶的冲刷阈值，不是严格显存上限。来源没有给出临时显存总量，所以图中不声称一个总量。

更新器在重新分布前调用 `param.cuda()`。因此图中从本地或恢复的分片开始，不声称所有 FSDP2 部署都把整套训练权重先放在 CPU。调用 `update_bucket_weights` 前会等待异步张量。

### 接下来

保存表中的数仍占 16 或 32 位。第 9 章看 rollout 和训练的哪些部分可以改用 FP8；本章不对 FP8 的精度或速度作结论。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:134-140`；`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `slime/backends/fsdp_utils/update_weight_utils.py:45-74` 和 `scripts/run-qwen3-4B-fsdp.sh:93-108`；`docs/plan-ml-sys.md:28-29`。
