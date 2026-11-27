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
- 底框只指向下一步的共同动作：需要完整数值时，把这些部分拼回去。第 4 步的 all-gather 拼出计算用的完整一层。第 7 步通过 `Replicate()` 重新分布，拼出导出的一个完整权重张量。
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

分片能减少长期保存的显存，但计算一层时仍需要这一层的完整参数。下一步先准备打包记录。第 4 步临时聚齐这一层，第 7 步回到同一个 DTensor，通过 `Replicate()` 导出一个完整张量。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16-23`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:43-47,62-82`；`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `slime/backends/fsdp_utils/actor.py:94-98,158-186` 和 `update_weight_utils.py:45-74`；`pytorch/pytorch@v2.8.0` 的 `torch/distributed/fsdp/_fully_shard/_fully_shard.py` 中 `fully_shard`，以及 `torch/distributed/tensor/placement_types.py` 中 `Shard` 和 `Replicate`。

## 第 3 步 · 按总 token 数打包

**一句话。** 一次统一的 `train` 调用先把归一化分数复制到回答 token，再用构造的 4 token 上限形成两包，并记下总 token 边界。

### 图上是什么

- 定位行进入 `train`，由 `process_rollout_data` 选出这个 rank 的记录，再按 `response_lengths[i]` 重复归一化 `rewards[i]`，形成该记录的 `advantages`。`Returns` 重复同样的值，但不放进这张紧凑舞台。
- A、B、C 的总长度是 2、2、4，回答长度是 1、1、2。归一化分数用 $+u$、$-u$、$+u$ 表示，其中 $u=0.9354$ 来自第 6 章第 6 步。这些是构造记录，不是第 6 章的前三条记录。
- `FIRST FIT · 只决定包数` 把 A、B 放进一个容量桶，C 需要另一桶，所以包数为 2。本例 DP1 的 `MAX` 仍为 2。first fit 只提供包数，不决定最终成员。
- `pack_sequences(num_packs=2)` 给出均衡成员 A+B 和 C。每包把局部 `flat_tokens` 拼接结果存为 `tokens`。`cu_seqlens` 从 0 开始，依次加上每条完整记录的总 token 数。
- 第 1 包保存 `[pA,a1,pB,b1]`，`cu_seqlens=[0,2,4]`；第 2 包保存 `[pC,c1,c2,c3]`，`cu_seqlens=[0,4]`。`grad_accum=[2]` 把唯一的优化器边界放在第 2 包后。

### 公式与符号

$$a_{i,j}=r_i\quad(1\leq j\leq L_i),\qquad c_0=0,\qquad c_{k+1}=c_k+\ell_k$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $r_i$ | 第 $i$ 条记录的归一化分数 | 第 6 章第 6 步；这里用符号表示 |
| $L_i$ | 第 $i$ 条记录的回答 token 数 | 构造的回答长度 1、1、2 |
| $a_{i,j}$ | 第 $i$ 条记录第 $j$ 个回答位置的 advantage | `_train_core` 重复 $r_i$ |
| $\ell_k$ | 本包第 $k$ 条记录的总 token 数 | `tokens.length`，包括 prompt 和回答 |
| $c_k$ | `cu_seqlens` 中的总 token 边界 | `pack_sequences` 累加得到 |

### 代入图上的数

构造 cap 为 4。first fit 得到 `A+B=4`，C 需要另一桶，所以本地包数和 DP1 的 `MAX` 都是 2。均衡打包分配 A+B 和 C。第 1 包有 `2+2=4` 个 token，边界为 `[0,2,4]`；第 2 包有 4 个 token，边界为 `[0,4]`。包数累计得到 `grad_accum=[2]`。

本例使用 DP1 和 CP1，不涉及 DP 包数变化、CP 容量倍乘或 CP padding。自带 Qwen3-4B FSDP 脚本使用 `--max-tokens-per-gpu 9216`；cap 4 只属于教学例子。这里的预算用于决定包数，不表示每个均衡分区都有硬上限断言。

### 接下来

第 4 步让第 1 包进入带梯度的 forward，保留已有的 7 GB、all-gather、临时完整层和释放过程。

来源：`THUDM/slime@55e41ffe` 的 <code>slime/backends/<wbr>fsdp_utils/<wbr>actor.py</code>（`train`、`_train_core`、`_packed_data`）、<code>slime/utils/<wbr>data.py</code>（`process_rollout_data`、<code>get_minimum_<wbr>num_<wbr>micro_<wbr>batch_<wbr>size</code>）、<code>slime/backends/<wbr>fsdp_utils/<wbr>data_packing.py</code>（`pack_sequences`），以及 <code>scripts/<wbr>run-qwen3-4B-fsdp.sh</code>（`--use-dynamic-batch-size`、`--max-tokens-per-gpu 9216`）。

## 第 4 步 · 把两包数据变成一次 actor 更新

**一句话。** 第 1 包算出裁剪并加 mask 的 actor loss，第 2 包完成 backward，随后进行一次优化器更新，并按配置 offload 训练端。

### 图上是什么

- `FORWARD` 把两个构造视角分开：打包算式用 DP1，显存账用 DP8。`zero_grad(set_to_none=True)` 清掉旧梯度分片后，DP8 例子保存 7 GB 权重和优化器分片。`All-gather` 拼出大小未知的临时完整层 $U$，再由 `release` 释放。7 GB 只算参数表，不是全部训练显存或峰值。
- `拆包` 用第 1 包的 `cu_seqlens=[0,2,4]` 还原 A、B 两条记录。每条有一个回答 token，response mask 都是 `[1]`。mask 1 表示这个 token 计入该记录的均值。
- `RATIO` 是当前 token 概率除以旧概率。ratio 大于 1，表示当前模型给这个 token 的概率更高。旧评分和当前训练两次计算分别产生两个 log probability。构造差值为 A 的 $+0.3365$ 和 B 的 $-0.3567$，得到 ratio 1.40 和 0.70。
- `ADVANTAGE + 裁剪` 沿用第 3 步的 advantage：A 为 $+u$，B 为 $-u$。裁剪把 ratio 限制在自带脚本的 0.80 到 1.28 之间，所以两个 ratio 分别变成 1.28 和 0.80。
- `裁剪后的 LOSS` 把未裁剪和裁剪后的乘积都取负，再取较大的值。A 得到 $-1.1973$，B 得到 $+0.7483$。
- `MASKED MEAN` 先在每条记录内对计入的回答 token 取均值，再把各记录的均值相加。这里两个分母都是 1，所以 `pg_loss = -1.1973 + 0.7483 = -0.4490`。
- `BACKWARD` 把 loss 变成权重变化方向。它依次处理第 1、2 包，才执行 `grad_accum=[2]` 允许的唯一一次 `optimizer.step()`。橙色 `SLEEP` 行随后在 `offload_train` 路径把模型和优化器移到 CPU。之后的 `update_weights` 交接属于第 7 章。

### 公式与符号

$$\rho_i=\exp(\operatorname{log\_probs}_i-\operatorname{old\_log\_probs}_i)$$

$$\hat\rho_i=\operatorname{clip}(\rho_i,0.80,1.28)$$

$$\ell_i=\max(-\rho_i a_i,-\hat\rho_i a_i)$$

$$\bar\ell_i=\frac{\sum_j\ell_{i,j}m_{i,j}}{\max(\sum_jm_{i,j},1)}$$

$$L_{pg}=\sum_i\bar\ell_i$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $\rho_i$ | 记录 $i$ 的当前 token 概率除以旧概率 | 当前和旧 log probability；这里用构造差值 |
| $\hat\rho_i$ | 裁剪后的 ratio | 自带脚本 `eps_clip=0.2`、`eps_clip_high=0.28` |
| $a_i$ | 记录 $i$ 的 advantage | 第 3 步：A 为 $+u$，B 为 $-u$ |
| $\ell_{i,j}$ | 回答位置 $j$ 取负后的 PPO policy loss | <code>compute_<wbr>policy_<wbr>loss</code> 取两个负乘积中的较大值 |
| $m_{i,j}$ | response mask | 1 计入，0 排除；图中两个 mask 都是 1 |
| $\bar\ell_i$ | 记录 $i$ 内的 masked mean | <code>sum_of_<wbr>sample_<wbr>mean</code>；分母至少为 1 |
| $L_{pg}$ | 各记录 policy loss 均值之和 | 本步第 1 包的构造例 |

### 代入图上的数

计算沿用第 3 步未四舍五入的 $u$，图上显示为 0.9354。A 的 $\exp(0.3365)\approx1.40$ 被裁剪为 1.28：

$$\ell_A=\max(-1.40u,-1.28u)$$

$$\ell_A=\max(-1.3096,-1.1973)=-1.1973$$

B 的 $\exp(-0.3567)\approx0.70$ 被裁剪为 0.80，advantage 是 $-u$：

$$\ell_B=\max(-0.70(-u),-0.80(-u))$$

$$\ell_B=\max(+0.6548,+0.7483)=+0.7483$$

两条 response mask 都是 `[1]`，所以每个单 token 均值的分母都是 1。第 1 包的合计为 $-1.1973+0.7483=-0.4490$。如果一条记录的 response mask 全为 0 或为空，分子是 0，分母被钳为 1，所以这条记录贡献 0。自带脚本把 `entropy_coef` 和 `kl_loss_coef` 都设为 0，所以这些可选项不改变本例的 loss。分数差和 mask 是教学构造值，不是训练实测。

### 实现边界

实现保存 `ppo_kl = old_log_probs - log_probs`，所以 `(-ppo_kl).exp()` 就是图上的 $\exp(\operatorname{log\_probs}-\operatorname{old\_log\_probs})$。本例关闭 `use_rollout_logprobs`：较早的 no-grad actor 计算只评分并写入 `log_probs`，随后作为 `old_log_probs`；带梯度的训练计算写入 `cur_log_probs`，让 backward 能求出权重变化方向。启用这个 flag 时，旧分数改用 `rollout_log_probs`，图上没有画这条替代路径。<code>compute_<wbr>policy_<wbr>loss</code> 把两个乘积取负后用 `maximum` 取大值；恢复符号后，与常见 PPO 公式取小值相同。

<code>sum_of_<wbr>sample_<wbr>mean</code> 先在每条记录内计算 masked mean，再把记录相加，不是对整包所有回答 token 只取一个均值。第 5 步再讲 $R/B$ 缩放和 FP32 梯度平均。TIS、GSPO 序列 ratio 和非零 entropy／KL 系数都是本构造例不展开的可选路径。

`train.py` 等待训练结束，按配置 offload 训练端，恢复 rollout，然后才调用 `update_weights`。图上写「随后交接」，不表示紧接着发生。未启用 `offload_train` 时，训练组清理显存，而不是把模型和优化器移到 CPU。reference model 的 offload 和另一种 `fsdp_cpu_offload` 策略不在此展开。

### 接下来

actor loss 已有具体数值。下一步跟随它的 $R/B$ 缩放，经过 backward 和 FP32 reduce-scatter，得到这个 rank 拥有的梯度分片。

来源：<code>THUDM/<wbr>slime@<wbr>55e41ffef7193fdd4c8bc14720233e446446b1d7</code> 的 <code>slime/backends/<wbr>fsdp_utils/<wbr>actor.py</code>（`_train_step`、<code>sum_of_<wbr>sample_<wbr>mean</code>、`sleep`）、<code>slime/utils/<wbr>ppo_utils.py</code>（<code>compute_<wbr>policy_<wbr>loss</code>）、<code>slime/backends/<wbr>fsdp_utils/<wbr>data_packing.py</code>（`unpack_sequences`）、`train.py:73-79,92-94`，以及 `scripts/run-qwen3-4B-fsdp.sh` 的 GRPO 参数。

## 第 5 步 · 先乘 R/B，再平均梯度

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

## 第 6 步 · 训练状态账只是峰值的一部分

**一句话。** 完整训练状态账是 8 GB，最大聚合 unit、激活和其他临时结果还会把峰值推高。

### 图上是什么

- 橙色底格是第 2 步的完整 8 GB 训练状态账。它包括梯度分片，是逻辑账和峰值状态账，不是 forward 的永久常驻下限。第 4 步中，`zero_grad` 清掉梯度分片后，forward 从 7 GB 开始。
- 蓝格是第 4 步借来的最大完整层，来源没有给出它的大小。
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

## 第 7 步 · 把完整权重张量装桶导出

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
