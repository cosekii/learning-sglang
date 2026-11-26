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

## 第 5 步 · 真实量化生成 rollout 编码

**一句话。** 每次 RL 权重更新都把选定 BF16 权重转成整数编码和对应 scale，这次编码要真正交给 rollout 保存。

### 图上是什么

- BF16 更新卡沿用 0.35，组 scale 仍是 $0.70/7=0.10$。
- 有符号编码卡得到 4，代码的字面截断范围是 $[-8,7]$。第 2 步 fake QAT 的代码范围是 $[-7,7]$。
- scale 卡与编码一起导出，并在本配置中转成源权重的 BF16 类型。
- 公开配置只处理选定的专家权重，其他张量保留原形式。每轮更新都会再次转换，不是只做一次离线导出。

### 公式与符号

$$s=\max(\max_i|x_i|/7,10^{-5}),\qquad q_i=\operatorname{clip}(\operatorname{round}(x_i/s),-8,7)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $x_i$ | 更新中一个 eligible BF16 权重值 | 训练端转出的权重表 |
| $s$ | 这一组的 scale | `int4_block_quantize` |
| $q_i$ | rollout 保存的有符号整数编码 | 舍入后截断到 $[-8,7]$ |
| $\operatorname{clip}$ | 把编码限制在给定区间 | 固定版本的导出代码 |

### 代入图上的数

$$0.35/0.10=3.5\rightarrow q=4$$

虽然 scale 用最大绝对值除以 7，真实导出代码的字面 clamp 下界是 −8，而 fake QAT 是 −7。本章保留这个代码差异，不把两条路写成逐位相同。导出时 scale 转回源权重类型，本例是 BF16；fake QAT 计算时使用 FP32 scale，因此两边也不保证 scale 的每个位相同。

公开 Kimi-K2-Thinking 配置的排除项包括 `lm_head`、self-attention、shared experts 和 dense MLP projections。MoE 是 mixture-of-experts，模型按 token 选择一部分专家计算；本步只量化配置选中的专家权重。维度不足的权重和不以 `.weight` 结尾的参数也不会进入这条转换。

### 接下来

整数编码还需压紧存储。下一步把八个 4 位编码放进一个 32 位字，并算清一组的总字节。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:94-103`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `quantizer_compressed_tensors.py:88-159,162-191` 和 `update_weight_from_distributed.py:93-154`；Kimi-K2-Thinking `config.json:79-110`。

## 第 6 步 · 把八个编码装进一个 32 位字

**一句话。** 打包先把有符号编码加 8 映射到 $[0,15]$，再把八个 4 位字段装进一个 32 位字；一组权重连 scale 共占 18 字节。

### 图上是什么

- BF16 权重组有 32 个数，占 $32\times2=64$ 字节。
- 有符号编码先加 8，使 $[-8,7]$ 映射到无符号的 $[0,15]$。
- 八个编码各占 4 位，合成一个 32 位字，即 4 字节。INT32 是保存这个字的 32 位整数类型。
- 完整一组有 16 字节打包权重和 2 字节 BF16 scale，合计 18 字节。首尾两条柱都用 64 字节作满宽。

### 公式与符号

$$u_i=q_i+8,\qquad P=\sum_{i=0}^{7}u_i2^{4i}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $q_i$ | 第 $i$ 个有符号 INT4 编码 | 第 5 步，范围 $[-8,7]$ |
| $u_i$ | 加 8 后的 4 位无符号字段 | `pack_to_int32`，范围 $[0,15]$ |
| $P$ | 八个字段合成的一个 32 位字 | 位移后求和 |
| $i$ | 一个字内的编码位置 | 0 到 7 |
| $2^{4i}$ | 把第 $i$ 个 4 位字段移到它的位置 | 打包代码的 bit shifts |

### 代入图上的数

示例编码 `[-8,-7,-1,0,1,4,6,7]` 加 8 后成为 `[0,1,7,8,9,12,14,15]`。八个字段的总宽度是：

$$8\times4=32\ \text{bits}=4\ \text{B}$$

完整 32 权重组的存储账为：

$$32\times2=64\ \text{B},\qquad 32\times4/8=16\ \text{B}$$
$$16+2=18\ \text{B},\qquad 18\times8/32=4.5\ \text{bits/weight}$$
$$(64-18)/64=71.875\%$$

第 1 步的 75% 只算原始 INT4 负载；本步加入一个 BF16 scale 后是 71.875%。未量化张量、其他元数据、KV cache 和运行工作区仍不在算例中，不能把这个比例当成完整 rollout 的显存收益。

### 接下来

打包后的标准排列还不能直接当成 Marlin 的工作布局。下一步看每次更新怎样恢复 buffer 形状、装入新值并重排。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:101-114`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `quantizer_compressed_tensors.py:47-85`。
