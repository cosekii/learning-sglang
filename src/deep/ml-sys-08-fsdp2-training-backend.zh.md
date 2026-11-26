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
