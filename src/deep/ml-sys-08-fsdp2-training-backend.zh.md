## 第 1 步 · 算清完整训练副本的账

**一句话。** 完整复制让每张 GPU 都保存同样的权重、梯度和优化器状态，本例每张占 64 GB，8 张合计 512 GB。

### 图上是什么

- 橙卡把 8 GB 的 16 位权重、8 GB 的 16 位梯度和 48 GB 的优化器相关表分开。三者组成一张 GPU 上 64 GB 的训练保存状态。
- 蓝卡把同一份 64 GB 复制到 8 张 GPU。512 GB 是重复副本的总和，不是 8 个不同模型。
- 80% 对照沿用前面章节的 H100 80 GB 容量。本例只算保存的表，不是完整显存预算。

### 公式与符号

$$M=P(b_w+b_g+b_o),\qquad C=N M,\qquad f=M/80\ \text{GB}$$

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

优化器约定是 FP32 master 权重、momentum 和 variance。它只属于这个算例，不代表所有 FSDP2 配置。激活、聚合缓冲和运行时分配尚未计入。

### 接下来

代价来自重复保存同样的表。下一步把同样的表分给 8 个 rank，不再每张卡都留完整副本。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:21-31`；`src/numbers.ts` 的共享 `HBM_GB`。

## 第 2 步 · 每个 rank 只留一片

**一句话。** FSDP2 把参数、梯度和优化器状态分给 DP 组，每个 rank 留下对应的分片，不再保存完整副本。

### 图上是什么

- 左图沿用第 1 步：每张 GPU 都有 64 GB 完整副本，8 张合计 512 GB。
- 右图用同样的柱子比例画一个 rank 的 8 GB 分片：权重 1 GB、梯度 1 GB、优化器相关表 6 GB。
- 8 个 rank 拥有同一套逻辑表的不同部分，所以合计保存状态仍是 64 GB。等分只是教学简化，不保证真实张量都能整除。

### 公式与符号

$$M_i=M/N,\qquad C_{\text{shard}}=N M_i$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $M$ | 一份完整训练状态的字节数 | 第 1 步，64 GB |
| $N$ | DP 分片组的大小 | 本例 8 个 rank |
| $i$ | 一个 rank 的编号 | rank 0 到 7 |
| $M_i$ | rank $i$ 拥有并保存的表 | 本步计算，8 GB |
| $C_{\text{shard}}$ | DP 组所有分片的合计 | 本步计算，64 GB |

### 代入图上的数

$$M_i=64\ \text{GB}/8=8\ \text{GB},\qquad C_{\text{shard}}=8\times8\ \text{GB}=64\ \text{GB}$$

每个 rank 的拆分为：权重 $8/8=1$ GB、梯度 $8/8=1$ GB、优化器相关表 $48/8=6$ GB。250 px 与 31.25 px 的柱宽比是 8:1，对应 64:8 GB。

### FSDP2 与 DTensor

FSDP2 把每个参数表示为 DTensor：逻辑张量、分布信息和本地分片一起记录，不需要 FSDP1 的模块级 `FlatParameter`。slime 计算 `dp_size = world_size // cp_size`，并把 DP mesh 传给 `fully_shard`。启用 CP 时，物理 GPU 数和 DP 分片数可以不同；本例取 CP 1。

### 接下来

分片能减少长期保存的显存，但计算一层时仍需要这一层的完整参数。下一步临时聚齐这一层。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16-23`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:43-47,62-82`；`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `slime/backends/fsdp_utils/actor.py:94-98,158-186`。

## 第 3 步 · 前向计算先借来完整一层

**一句话。** 前向计算先 all-gather 当前 unit 的参数分片，用完整一层计算，再释放临时副本。

### 图上是什么

- 橙色 8 GB 是第 2 步中一个 rank 长期保存的状态。
- `All-gather` 表示每个 rank 都拿出自己的分片，共同重建一个 FSDP unit 的完整参数。unit 是一起聚合的层或参数组。
- 蓝色完整一层的临时大小记作 $U$。计算使用完整层，随后 `RELEASE` 删除临时副本，长期保存的 8 GB 仍在。

### 公式与符号

$$M_{\text{forward}}\approx M_i+U,\qquad M_{\text{after}}=M_i$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $M_i$ | 这个 rank 长期保存的状态 | 第 2 步，8 GB |
| $U$ | 当前计算 unit 的完整参数临时字节数 | unit 大小，来源未给数值 |
| $M_{\text{forward}}$ | 计算这个 unit 时的占用 | 长期状态加临时 unit |
| $M_{\text{after}}$ | 释放这个 unit 后的占用 | 回到长期状态 |

### 代入图上的数

已给出的数只有 $M_i=8$ GB。图中不给 $U$ 填值，因此无法算出数值化的前向峰值。这里只画 $8\ \text{GB}+U\rightarrow8\ \text{GB}$ 的边界，不声称实测总量。

All-gather 重建的是参数。梯度要到反向计算才产生，所以不在这次聚合里。

### 接下来

反向计算也需要参数值，但它新产生的是梯度。下一步看梯度为什么用 reduce-scatter，并回到各 rank 的分片。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:18`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:53-56,101-105`。

## 第 4 步 · 梯度归约后各留一片

**一句话。** 反向计算对完整梯度执行 reduce-scatter，随后每个 rank 的优化器用自己拥有的梯度片更新对应的参数片。

### 图上是什么

- 蓝色完整梯度是反向计算的临时输出。参数会按需聚合，但梯度不使用同一个集合操作。
- `Reduce-scatter` 汇总各 rank 对应的梯度值，再把归约后的一片交给对应 rank。本例每个 rank 拥有 1 GB 梯度。
- 优化器使用这片梯度和自己保存的优化器状态表，更新这个 rank 的权重片，不保留完整梯度。

### 公式与符号

$$g_i=S_i\!\left(\sum_{r=1}^{N}g^{(r)}\right)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | DP 分片组大小 | 第 2 步，8 个 rank |
| $r$ | 提供梯度的 rank | DP 组的一个成员 |
| $g^{(r)}$ | rank $r$ 提供的梯度值 | 反向计算 |
| $S_i$ | 选出 rank $i$ 拥有的一片 | FSDP 分片位置 |
| $g_i$ | rank $i$ 留下的归约梯度片 | reduce-scatter 的结果，本例 1 GB |

### 代入图上的数

本例完整逻辑梯度表为 8 GB，等分后每个 rank 为 $8/8=1$ GB。图中没有给临时完整梯度一个实测峰值，也不声称真实张量都能整除。

slime 在 actor 中调用 `loss.backward()` 和 `optimizer.step()`。参数聚合和梯度 reduce-scatter 由 FSDP 包装层处理，actor 没有在这些方法旁另写集合通信调用。

### 接下来

长期分片变小了，完整 unit 和其他临时结果仍要占空间。下一步区分长期保存状态与峰值显存。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:19`；`Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:47-58`；`THUDM/slime@55e41ffef7193fdd4c8bc14720233e446446b1d7` 的 `slime/backends/fsdp_utils/actor.py:687-702,1000-1039`。
