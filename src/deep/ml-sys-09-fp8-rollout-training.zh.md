## 第 1 步 · 可转换权重的字节数减半

**一句话。** FP8 每个数用 8 位，BF16 用 16 位，所以本例的可转换权重从 8 GB 变成 4 GB。

### 图上是什么

- 橙色 BF16 卡沿用第 8 章的 4B 个权重数值。每个数占 2 字节，合计 8 GB。
- 蓝色 FP8 卡每个数占 1 字节，合计 4 GB。两条柱用同一比例，蓝柱是橙柱的一半。
- 路线图标出后面的 rollout、训练、导出和对照。这里只算可转换权重，不算完整 checkpoint，也不声称 RL 加速。

### 公式与符号

$$M_{16}=P b_{16},\qquad M_8=P b_8,\qquad T_b=M_b/B$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 可转换权重数值的个数 | 第 8 章沿用的 4B 构造示例 |
| $b_{16},b_8$ | BF16 和 FP8 每个数的字节数 | 分别为 2 和 1 字节 |
| $M_{16},M_8$ | 两种格式的权重表大小 | 本步算出 8 GB 和 4 GB |
| $b$ | 正在计算的一种格式 | BF16 或 FP8 |
| $T_b$ | 完整读取该权重表的理想时间 | 本步计算 |
| $B$ | H100 的 HBM 带宽 | `src/numbers.ts`，3.35 TB/s |

### 代入图上的数

$$M_{16}=4\times10^9\times2=8\ \text{GB},\qquad M_8=4\times10^9\times1=4\ \text{GB}$$
$$T_{16}=8/3.35=2.39\ \text{ms},\qquad T_8=4/3.35=1.19\ \text{ms}$$

这里使用十进制单位，GB 除以 TB/s 后恰好得到毫秒。它们只是理想带宽下限。scale、未转换张量、attention、调度和带宽利用率都不在算例中。文章还列出 H100 的理论峰值：BF16 为 989 TFLOP/s，FP8 为 1,979 TFLOP/s。硬件峰值不能直接当成 RL 吞吐。

### 接下来

FP8 能表示的数值更少，范围也更小。下一步看一组数怎样共用一个 scale 来适应这个格式。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:40-54`；`src/numbers.ts` 的 `BW`；`src/ml-sys/numbers.ts` 的构造数值。

## 第 2 步 · 一组数共用一个 scale

**一句话。** 一组数先除以同一个 scale，把结果舍入成 FP8 保存；读取时再乘回 scale，得到接近原数的值。

### 图上是什么

- 原始一组数是 `[1, 3.2, 8]`，最大绝对值为 8，所以 scale 是 $8/448=1/56$。
- FP8 卡保存 `[56, 176, 448]`。中间值先算 $3.2/(1/56)=179.2$，再按这种格式舍入为 176。
- 保存值乘回 $1/56$，还原为 `[1, 3.142857, 8]`。中间值与原数相差约 0.057143。

### 公式与符号

$$s=\frac{\max|X|}{448},\qquad q_i=\operatorname{E4M3}(x_i/s),\qquad \hat{x}_i=sq_i$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $X$ | 一组高精度数值 | 构造的 `[1, 3.2, 8]` |
| $x_i$ | 组内第 $i$ 个值 | 原数卡片 |
| $s$ | 这一组共用的 scale | 最大绝对值除以 448 |
| $q_i$ | 舍入后存入 FP8 的值 | E4M3 转换 |
| $\hat{x}_i$ | $x_i$ 的还原近似值 | $s q_i$ |
| $\operatorname{E4M3}$ | 4 位指数、3 位尾数的 FP8 格式 | rollout 转换配置；最大有限值为 448 |

### 代入图上的数

$$s=8/448=1/56,\qquad 3.2/(1/56)=179.2\rightarrow176$$
$$\hat{x}_2=176/56=22/7\approx3.142857,\qquad |3.2-22/7|=2/35\approx0.057143$$

rollout checkpoint 的一块有 $128\times128=16{,}384$ 个数，并保存一个 FP32 scale。只算这一块：

$$16{,}384+4=16{,}388\ \text{字节},\qquad 16{,}384\times2=32{,}768\ \text{字节}$$

这一块省下 $32{,}768-16{,}388=16{,}380$ 字节，即 49.9878%。其他张量和副本不计入。slime 使用 FP32 scale；其他方案可以采用不同格式和粒度。

### 接下来

scale 让一组数能存进 FP8。下一步看 rollout 的两类输入：提前转换的权重，以及计算出现时再转换的激活值。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:66-124`；`THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd` 的 `tools/convert_hf_to_fp8.py:31-71,142-146`；Qwen3-4B-FP8 的 `weight_block_size=[128,128]`。

## 第 3 步 · 转换 rollout 的两类输入

**一句话。** Rollout 提前转换可支持的权重，计算产生激活值时再动态量化，随后让支持的矩阵乘法使用两类 FP8 输入。

### 图上是什么

- 权重路从 BF16 checkpoint 开始。离线转换在 rollout 前写好 FP8 权重和对应 scale。
- 激活值是计算过程中产生的值。第二条路在使用当前激活值时才量化，不会预先把所有激活值都存进 checkpoint。
- 支持的矩阵乘法接收转换后的权重和当前激活值。embedding 和 `lm_head` 保留原精度。来源没有在这条路径中给出 FP8 KV cache。

### 公式与符号

$$(W_q,S_w)=\mathcal{Q}_w(W_{16}),\qquad (A_q,S_a)=\mathcal{Q}_a(A_{16})$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $W_{16}$ | 可转换的 BF16 checkpoint 权重 | 输入 checkpoint |
| $\mathcal{Q}_w$ | 带 scale 的离线权重量化 | `convert_hf_to_fp8.py` |
| $W_q,S_w$ | FP8 权重及对应 scale | 转换后的 checkpoint |
| $A_{16}$ | 当前高精度激活值 | rollout 计算产生 |
| $\mathcal{Q}_a$ | 动态激活量化 | rollout 支持的 FP8 矩阵乘法路径 |
| $A_q,S_a$ | 当前 FP8 激活值及 scale | 需要时生成 |

### 代入图上的数

本步没有新增实测数值。若有 $P$ 个可转换权重数值，第 1 步的原始权重仍是 BF16 的 $2P$ 字节对 FP8 的 $P$ 字节，另加 scale 和未转换部分。scale 算式见第 2 步。这些式子不含 KV cache，也不表示所有层都使用 FP8。

自带转换脚本跳过指定的 embedding 和 `lm_head` 张量。激活值支持属于矩阵乘法实现，不属于离线 checkpoint 转换器。

### 接下来

训练也需要 FP8 矩阵乘法，但它要在前向和反向中使用，同时保留高精度训练状态。下一步打开训练路径。

来源：`THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd` 的 `examples/low_precision/README.md:23-27` 和 `tools/convert_hf_to_fp8.py:179-188`；`Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:40-54`。

## 第 4 步 · 在训练内部使用 FP8 矩阵乘法

**一句话。** 训练为支持的前向和反向矩阵乘法在线量化权重与激活值，需要高精度的模型和优化器区域则保留高精度。

### 图上是什么

- 模型状态卡保留高精度数值。使用自带 `--fp8-param-gather` 配置时，驻留的 Transformer Engine 权重可以是 FP8；不开该参数时，驻留权重仍是 BF16，只在矩阵乘法前转换。
- FP8 卡覆盖支持的前向和反向矩阵乘法。前向算输出，反向算权重梯度和输入梯度，实现分别称为 FProp、Wgrad 和 Dgrad。
- 优化器卡在这本账里不会变成 FP8。因此第 8 章构造的 48 GB 优化器表仍是 48 GB，不是 24 GB。

### 公式与符号

$$Y=\operatorname{GEMM}_8(\mathcal{Q}(A),\mathcal{Q}(W))$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $A,W$ | 高精度激活值和权重输入 | 当前训练计算 |
| $\mathcal{Q}$ | 按配置的 scale 和粒度做量化 | 第 2 步的机制，这里在线执行 |
| $\operatorname{GEMM}_8$ | 使用 FP8 输入的支持矩阵乘法 | Transformer Engine 的 `Linear` 或 `GroupLinear` 路径 |
| $Y$ | 矩阵乘法输出 | 前向结果；反向使用对应的梯度矩阵乘法 |

### 代入图上的数

第 8 章的 4B 构造算例把 48 GB 分给三张 FP32 优化器表。本步没有给出 FP8 优化器格式，所以：

$$M_{\text{optimizer}}=48\ \text{GB}\rightarrow48\ \text{GB}$$

Qwen3-4B 脚本组合了 `--bf16`、`--fp8-format e4m3`、`--fp8-recipe blockwise`、`--fp8-param-gather` 和 `NVTE_FP8_BLOCK_SCALING_FP32_SCALES=1`。attention softmax 和梯度累加保持 FP32。文档路径中只有 `Linear` 和 `GroupLinear` 使用 FP8；embedding 和 `lm_head` 保留原精度。

### 接下来

Rollout 仍需拿到训练后的权重。下一步沿着更新通道，看 FP8 权重先还原为 BF16，再重新量化，而不是沿一条不变的 FP8 线路直接发送。

来源：`THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd` 的 `examples/low_precision/run-qwen3-4b-fp8.sh:117-143` 和 `examples/low_precision/README.md:21-23,51-54`；`Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:118-132`。
