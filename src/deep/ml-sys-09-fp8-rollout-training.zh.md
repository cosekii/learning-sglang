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

## 第 5 步 · 导出时先反量化，再重新量化

**一句话。** 文档中的 RL 更新先把训练端 FP8 权重反量化为 BF16，再为 SGLang rollout 量化成 FP8，不是直接发送同一份不变的 FP8 表示。

### 图上是什么

- 训练卡从 FP8 权重开始。Megatron 把它们反量化为 BF16，交给更新路径。
- 中间卡用 FP8 数值和 scale 还原 16 位数值，这就是反量化。
- slime 再把这些 BF16 权重量化为 rollout 使用的 FP8。新的 FP8 表示和 scale 不必与训练端完全相同。

### 公式与符号

$$W_8\xrightarrow{\mathcal{D}}W_{16}\xrightarrow{\mathcal{Q}}W'_8$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $W_8$ | 训练端 FP8 权重 | FP8 训练配置 |
| $\mathcal{D}$ | 用 FP8 数值和 scale 反量化 | Megatron 更新路径 |
| $W_{16}$ | 交给更新路径的 BF16 权重 | 中间表示 |
| $\mathcal{Q}$ | 为 SGLang rollout 做量化 | slime 的 FP8 更新支持 |
| $W'_8$ | rollout 端 FP8 权重 | 第二次转换的结果 |

### 代入图上的数

若有 $P$ 个可转换数值，FP8 原始负载为 $P$ 字节，BF16 为 $2P$ 字节。沿用第 1 步构造的 $P=4\times10^9$，分别是 4 GB 和 8 GB，另加 scale 和未转换部分。来源没有给出更新延迟，所以这些字节不能推出传输时间。

checkpoint 路径也会反量化为 BF16 `torch_dist`。FP8 评估需要经过 Hugging Face 格式转换回去。通过 `--fp8-param-gather` 驻留 FP8 权重需要 TE FusedAdam，并与 Adam CPU offload 冲突，所以显存结果取决于启用的配置。

### 接下来

字节算式只给理论上限，不等于实测结果。下一步对照一次公开训练，它的时间和显存收益都没有达到减半。

来源：`THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd` 的 `examples/low_precision/README.md:42-64`；`Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:182`。

## 第 6 步 · 看实测收益，不把一切都减半

**一句话。** 一行公开非 RL 训练结果中，前向加反向时间减少 21.7%，峰值显存减少 14.4%，但前向单独看反而更慢。

### 图上是什么

- 时间栏分别把前向和反向相加。BF16 为 $463+1{,}567=2{,}030$ ms，FP8 为 $529+1{,}061=1{,}590$ ms。两条时间柱都把 BF16 的 2,030 ms 作为满宽。
- 显存栏对照 68.1 GB 和 58.3 GB。两条显存柱都把 BF16 的 68.1 GB 作为满宽。
- 底部拆开总时间：前向从 463 升到 529 ms，反向从 1,567 降到 1,061 ms。净收益小于反向单项收益。

### 公式与符号

$$\Delta T=T_{16}-T_8,\qquad r_T=\Delta T/T_{16},\qquad r_M=(M_{16}-M_8)/M_{16}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_{16},T_8$ | 前向加反向的时间 | InfiR2 表 6，2,030 和 1,590 ms |
| $\Delta T$ | 省下的时间 | 本步计算，440 ms |
| $r_T$ | 总时间减少比例 | 本步计算，21.7% |
| $M_{16},M_8$ | 峰值训练显存 | InfiR2 表 6，68.1 和 58.3 GB |
| $r_M$ | 峰值显存减少比例 | 本步计算，14.4% |

### 代入图上的数

$$2{,}030-1{,}590=440\ \text{ms},\qquad 440/2{,}030=21.7\%$$
$$68.1-58.3=9.8\ \text{GB},\qquad 9.8/68.1=14.4\%$$

吞吐量从 340 升到 376 TFLOP/s，增幅为 $376/340-1=10.6\%$。这是 InfiR2 非 RL 实验中的 Qwen2.5-1.5B，8k 上下文，TP 1、CP 1、micro-batch 2。论文的效率小节没有注明 GPU。其方案使用 UE8M0 scale，所以该行不是 slime FP32-scale RL 配置的实测。

额外的转置 FP8 输出和高精度保存张量使显存不能简单减半。量化工作也可能让前向变慢，即使反向矩阵乘法加速。

### 接下来

实测收益并不一致。下一步用真实和模拟量化分离数值误差，不把所有差异都归到 FP8 kernel。

来源：`InfiR2 arXiv:2509.22536v4` §5.1.1、§5.4 表 6；`Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:140-182`；`NVIDIA/TransformerEngine@8ef8285c40542c8c3724f9b3eadbb006793958f0` 的 `transformer_engine/common/transpose/quantize_transpose_square_blockwise.cu:462-485,513-524`。

## 第 7 步 · 用模拟量化分离舍入损失

**一句话。** 真实 FP8、模拟 FP8 和 BF16 基准组成两组对照，分别看 kernel 实现差异和量化往返的舍入损失。

### 图上是什么

- 基准路的权重和输入都用 BF16，并运行 BF16 矩阵乘法。
- 真实 FP8 路量化权重和输入，并运行 FP8 矩阵乘法。
- 模拟 FP8 路先量化成 FP8，马上反量化回 BF16，再运行 BF16 矩阵乘法。它保留舍入损失，但不使用 FP8 kernel。
- 真实与模拟之差隔离 kernel 实现，基准与模拟之差隔离量化往返。文章把较大的误差归于往返过程，不表示 kernel 没有误差。

### 公式与符号

$$D_{rf}=Y_r-Y_f,\qquad D_{bf}=Y_b-Y_f$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $Y_b$ | BF16 基准的矩阵乘法输出 | 基准路径 |
| $Y_r$ | 真实 FP8 的矩阵乘法输出 | 真实 FP8 路径 |
| $Y_f$ | 模拟量化后的 BF16 矩阵乘法输出 | FP8 往返后做 BF16 矩阵乘法 |
| $D_{rf}$ | 与 FP8 kernel 实现相关的输出差 | 真实对模拟 |
| $D_{bf}$ | 与量化往返损失相关的输出差 | 基准对模拟 |

### 代入图上的数

实验使用 Qwen3-4B、一张 H800，统计 RL 第 0 和 1 步。文章没有定义图中 Diff 的范数或单位，所以本章不把它改写成百分比、log probability 或 KL。这里按文章正文的高低系列解释，不引用图 6 中相互矛盾的打印均值。

另一项 kernel 检查把两种 FP8 实现分别与 BF16 对照。$(M,K,N)=(128,128,128)$ 时，cuBLAS 的 Diff 为 0.00068，DeepGEMM 为 0.00036；$(1024,4096,1024)$ 时为 0.000681 和 0.00065。两者处于同一数量级，因此换 FP8 实现不能解释初始 KL 上升。$M,K,N$ 是矩阵维度，这里的 Diff 单位同样未说明。

### 接下来

量化往返解释了 BF16 训练和 FP8 rollout 为什么可能分叉。下一步对齐两边的方案，看公开实验中的 log probability 差距怎样变化。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:204-261`，实验定义见 `225-243`，实现对照表见 `208-219`。

## 第 8 步 · 对齐方案，缩小两边差距

**一句话。** 训练和 rollout 使用同一种 FP8 方案后，公开实验的训推 log probability 差距收窄，但曲线没有证明差异为零或逐位相等。

### 图上是什么

- 混合卡使用 BF16 训练和 FP8 rollout，两次评估跨过不同的量化路径。
- 统一卡在训练和 rollout 中使用同一种 FP8 方案。公开 Qwen3 RL 曲线显示 `train_rollout_logprob_abs_diff` 范围收窄，TIS 裁剪减少。
- 结尾转向 INT4：每个权重 4 位，即 0.5 字节，相对 BF16 的 2 字节理论减少 75%，另算 scale。问题是训练怎样适应更强的舍入。

### 公式与符号

单个 token 的教学距离可以写成：

$$d_t=|\ell^{\text{train}}_t-\ell^{\text{rollout}}_t|$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t$ | 回答中的 token 位置 | 第 6 章的 rollout 记录 |
| $\ell^{\text{train}}_t$ | 训练端在当前上下文中为该 token 重算的 log probability | 训练重算 |
| $\ell^{\text{rollout}}_t$ | 生成时记录的 rollout 端 log probability | 第 6 章第 3 步 |
| $d_t$ | 两个数值的绝对距离 | 构造示意，不是文章的聚合公式 |

### 代入图上的数

构造一对 $\ell^{\text{train}}_t=-1.96$ 和 $\ell^{\text{rollout}}_t=-2.00$，得到 $d_t=0.04$。文章没有说明 `train_rollout_logprob_abs_diff` 的 token 权重、mask 或平均方式，所以这个例子不定义该日志指标。

Qwen3-4B 实验中，仅前向模拟量化、前向加反向模拟量化、统一 FP8 的第 1 步 KL loss 接近，且都高于混合基准；它们的 TIS-clipfrac 更低。仅前向与前向加反向结果相近，作者据此认为前向量化影响更大。TIS-clipfrac 是截断重要性采样中被裁剪的更新比例，在这些实验中越低表示裁剪越少。

Qwen3-30B-A3B 的两台 H20 服务器实验和 Qwen3-235B-A22B 的 16 台 H20 服务器实验，也在统一 FP8 后显示更窄的 log probability 差异范围。公开材料只有曲线，所以本章不写精确减少量，也不声称 reward、准确率或收敛速度提高。

INT4 的原始比例是 $0.5/2=25\%$，即比 BF16 少 75% 字节。下一章保留 BF16 master 权重，在训练时插入模拟量化，用 straight-through estimator（STE）让梯度穿过舍入，再导出真正的 INT4 做 W4A16 rollout。STE 是一种训练近似，把舍入处没有的导数替换为直通导数。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:275-369`；`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-43,59-61`。
