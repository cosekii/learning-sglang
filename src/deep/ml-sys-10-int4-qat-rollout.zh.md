## 第 1 步 · 原始权重字节减到四分之一

**一句话。** 同样 32 个权重，BF16 占 64 字节，原始 INT4 只占 16 字节；省位的代价是舍入。

### 图上是什么

- 橙色卡是 32 个 BF16 权重，每个数 16 位，即 2 字节。
- 蓝色卡是同样数量的原始 INT4 权重，每个数 4 位，即 0.5 字节。
- 两条柱使用同一比例，蓝柱是橙柱的四分之一。这里只算权重原始负载。

### 公式与符号

$$M_{16}=P b_{16},\qquad M_4=P b_4,\qquad r=\frac{M_{16}-M_4}{M_{16}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 一组权重的数值个数 | 本步构造的 32 个 |
| $b_{16},b_4$ | BF16 和 INT4 每个数的字节数 | 2 和 0.5 字节 |
| $M_{16},M_4$ | 两种格式的原始权重字节数 | 本步计算 |
| $r$ | 原始负载减少的比例 | 本步计算 |

### 代入图上的数

$$M_{16}=32\times2=64\ \text{B},\qquad M_4=32\times0.5=16\ \text{B}$$
$$r=(64-16)/64=75\%$$

scale、未量化张量、KV cache、激活值和运行工作区都不在这 16 字节里，所以完整模型或完整 rollout 不会因此必然减少 75%。INT4 只有 4 位，能区分的数值等级更少，舍入会改变权重。

### 接下来

下一步看一组权重怎样共用一个 scale，以及一个原数经过舍入后变成什么。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:101-114`；构造数值在 `src/ml-sys/numbers.ts`。

## 第 2 步 · 一组权重共用一个 scale

**一句话。** 一组权重先除以最大绝对值算出的 scale，舍入到 $[-7,7]$ 的整数，再乘回 scale 还原。

### 图上是什么

- 原数卡展示 32 个 BF16 权重中的三个：`[0.10, 0.35, 0.70]`。
- scale 卡用最大绝对值 0.70 除以 7，得到 0.10。
- 整数编码卡保存 `[1, 4, 7]`。中间值 $0.35/0.10=3.5$，舍入为 4。
- 还原卡把编码乘回 0.10，得到 `[0.10, 0.40, 0.70]`。中间值产生 0.05 的绝对误差。

### 公式与符号

$$s=\max_i|x_i|/7,\qquad q_i=\operatorname{clip}(\operatorname{round}(x_i/s),-7,7),\qquad \hat{x}_i=sq_i$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $x_i$ | 组内第 $i$ 个 BF16 权重 | 本步构造的三个展示值 |
| $s$ | 全组共用的 scale，也就是除数 | 最大绝对值除以 7 |
| $q_i$ | 舍入并截断后的整数编码 | $x_i/s$ 的计算结果 |
| $\hat{x}_i$ | 编码乘回 scale 后的还原值 | $sq_i$ |
| $\operatorname{clip}$ | 把超出边界的数截到边界内 | 固定版本的伪量化代码 |

### 代入图上的数

$$s=0.70/7=0.10,\qquad 0.35/0.10=3.5\rightarrow4$$
$$\hat{x}_2=4\times0.10=0.40,\qquad |0.35-0.40|=0.05$$

固定版本的代码用 FP32 求最大绝对值和 scale，把 scale 下限设为 $10^{-5}$，最后把还原值转回输入类型。本例非零，所以没有触发 scale 下限。完整组有 32 个值，其余 29 个没有画出。

### 接下来

训练前向反复做这次“量化再还原”，但保存和计算仍是 BF16。下一步给这条训练路径一个名字：fake quantization。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:53-61`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `docker/patch/latest/megatron.patch:71-110`。

## 第 3 步 · 模拟量化仍用 BF16 保存和计算

**一句话。** Fake quantization 在前向中先舍入再还原成 BF16，让训练看见量化误差，但还没有生成真正的 4 位权重文件。

### 图上是什么

- 保存的模型参数仍是 BF16 的 0.35。
- 蓝色虚线卡执行第 2 步的往返：0.35 变成编码 4，再还原为 BF16 的 0.40。
- 前向计算使用 0.40。量化误差没有被消掉，模型可以在训练中适应它。

### 公式与符号

$$\hat{w}=\mathcal{D}(\mathcal{Q}(w)),\qquad y=\operatorname{BF16\ compute}(\hat{w},a)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $w$ | 保存的 BF16 模型参数 | 本例的 0.35 |
| $\mathcal{Q}$ | 除以 scale 并舍入成整数编码 | 第 2 步 |
| $\mathcal{D}$ | 编码乘回 scale 并转回 BF16 | 第 2 步 |
| $\hat{w}$ | 前向实际使用的还原权重 | 本例的 0.40 |
| $a$ | 前向的激活值，即计算产生的数值 | 第 9 章第 3 步 |
| $y$ | 当前前向计算的输出 | 本步定义 |

### 代入图上的数

$$w=0.35\rightarrow q=4\rightarrow\hat{w}=0.40$$

“Fake”指存储和矩阵计算没有变成 INT4：参数仍以 BF16 保存，舍入后立即还原成 BF16。QAT 是 quantization-aware training，也就是让训练前向反复经历这种舍入。固定配置通过 `OPEN_TRAINING_INT4_FAKE_QAT_FLAG=1` 开启钩子，并设置 `OPEN_TRAINING_INT4_GROUP_SIZE=32`；钩子包住 `TEGroupedLinear` 的权重，不是整个模型的每个张量。

文章的两组非对称实验用于说明配对的重要性：开 QAT 却用 BF16 rollout，会移除训练已经适应的舍入；不开 QAT 却直接用 INT4 rollout，会在训练未见过的位置加入舍入。它们支持训练 fake INT4 与 rollout real INT4 配对，不证明任意模型或配置都能达到 BF16。

### 接下来

前向可以计算，但普通反向传播会卡在舍入处。下一步看 STE 怎样给梯度一条近似通道。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-49,63-78`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `docker/patch/latest/megatron.patch:124-150` 和 `scripts/low_precision/run-kimi-k2-Thinking-int4.sh:158-170`。

## 第 4 步 · STE 让梯度绕过舍入

**一句话。** Straight-through estimator（STE）在反向时把整段模拟量化当成恒等映射，让 BF16 模型参数继续收到梯度。

### 图上是什么

- 左卡是后续计算传回的 `grad_output`。
- 中间蓝色虚线卡是 STE 捷径，输出同一个 `grad_output`，不经过舍入的真实导数。
- 右卡是收到梯度的 BF16 模型参数，因此仍能更新。前向的 $0.35\rightarrow0.40$ 误差保持不变。

### 公式与符号

前向仍按第 3 步计算 $\hat w$。反向改用近似：

$$\frac{\partial \hat w}{\partial w}\approx1,\qquad g_w=g_{\hat w}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $w$ | 保存的 BF16 模型参数 | 第 3 步 |
| $\hat w$ | 舍入再还原后的前向权重 | 第 3 步 |
| $\partial\hat w/\partial w$ | 前向还原权重对保存权重的导数 | STE 在这里近似为 1 |
| $g_{\hat w}$ | 后续计算传回的梯度，即代码的 `grad_output` | 反向输入 |
| $g_w$ | 传给保存权重的梯度 | STE 原样返回 $g_{\hat w}$ |

### 代入图上的数

固定代码只有一句 `return grad_output, None`：第一个返回值对应输入权重，第二个对应不可训练的 `group_size`。它不计算 scale 梯度，也不加 clipping mask。

普通 `round` 的导数在几乎所有位置为 0，在跳变处不可导。STE 是训练近似，不会让舍入变得真正可导，也不会修复前向误差。

模型参数由配置的 `--bf16` 设为 BF16。这个 recipe 还开启 `--use-precision-aware-optimizer`，但没有覆盖 `--main-params-dtype`，其默认值是 FP32。因此不能把模型参数和优化器主参数都叫作“BF16 master weights”。

### 接下来

训练完成一轮后，更新通道要生成 rollout 真正保存的整数编码和 scale。下一步看 real quantization。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-39`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `docker/patch/latest/megatron.patch:112-122` 和 recipe；`NVIDIA/Megatron-LM@3714d81d418c9f1bca4594fc35f9e8289f652862` 的 `megatron/training/arguments.py:751-765,3475-3484`。
