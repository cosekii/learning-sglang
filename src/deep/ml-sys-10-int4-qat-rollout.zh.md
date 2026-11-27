## 第 1 步 · 原始权重字节减到四分之一

**一句话。** 同样 32 个权重，BF16 占 64 字节，原始 INT4 只占 16 字节；省位可能让原数舍入成别的数值。

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

scale、未量化张量、KV cache、激活值和运行工作区都不在这 16 字节里，所以完整模型或完整 rollout 不会因此必然减少 75%。INT4 只有 4 位，只有 $2^4=16$ 种编码选择，每种选择对应一个能表示的数值。不在这些选择上的原数必须靠到最近的选择，因此数值可能变化；已经落在选择上的数可以保持不变。

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

$$s=\max(\max_i|x_i|/7,10^{-5}),\qquad q_i=\operatorname{clip}(\operatorname{round}(x_i/s),-7,7),\qquad \hat{x}_i=sq_i$$

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

这条 fake QAT 规则把最大正编码设为 7，所以 scale 用最大绝对值除以 7，编码落在 $[-7,7]$。它不是所有 INT4 格式的通用定义；第 5 步的真实导出代码会使用不同的字面截断下界。

固定版本的代码用 FP32 求最大绝对值和 scale，把 scale 下限设为 $10^{-5}$，最后把还原值转回输入类型。本例非零，所以没有触发 scale 下限。完整组有 32 个值，其余 29 个没有画出，但它们的绝对值都不超过 0.70，所以展示值中的 0.70 就是全组最大值。图中小数为便于展示而舍入，算式按展示值计算，不是 BF16 的逐位结果。

### 接下来

训练前向反复做这次“量化再还原”，但保存和计算仍是 BF16。下一步给这条训练路径一个名字：fake quantization。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:53-61`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `docker/patch/latest/megatron.patch:71-110`。

## 第 3 步 · 模拟量化仍用 BF16 保存和计算

**一句话。** Fake quantization 在前向中先舍入再还原成 BF16，让训练看见量化误差，但还没有生成真正的 4 位权重文件。

### 图上是什么

- 保存的模型参数仍是可训练的 BF16 数值 0.35。
- 蓝色虚线卡执行第 2 步的往返：0.35 变成编码 4，再还原为 BF16 的 0.40。
- 前向计算使用 0.40。每次前向都经历舍入，保存的 BF16 权重就能在后续更新中适应这种误差。

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

“Fake”指存储和矩阵计算没有变成 INT4：参数仍以 BF16 保存，舍入后立即还原成 BF16。QAT 是 quantization-aware training，也就是让训练前向反复经历这种舍入。固定配置通过 `OPEN_TRAINING_INT4_FAKE_QAT_FLAG=1` 开启处理，并设置 `OPEN_TRAINING_INT4_GROUP_SIZE=32`。`TEGroupedLinear` 是把多组矩阵乘法放在一起的层；这段代码在取出它的权重时插入舍入，不是处理整个模型的每个张量。

文章的两组非对称实验用于说明配对的重要性：开 QAT 却用 BF16 rollout，会移除训练已经适应的舍入；不开 QAT 却直接用 INT4 rollout，会在训练未见过的位置加入舍入。它们支持训练 fake INT4 与 rollout real INT4 配对，不证明任意模型或配置都能达到 BF16。

### 接下来

前向可以计算，但普通反向传播会卡在舍入处。下一步看 STE 怎样给梯度一条近似通道。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-49,63-78`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `docker/patch/latest/megatron.patch:124-150` 和 `scripts/low_precision/run-kimi-k2-Thinking-int4.sh:158-170`。

## 第 4 步 · STE 让梯度绕过舍入

**一句话。** Straight-through estimator（STE）在反向时把整段模拟量化当成恒等映射，让 BF16 模型参数继续收到梯度。

### 图上是什么

- 标题下先解释：梯度就是权重该往哪个方向改、改多少。左卡的 `grad_output` 是后续计算传回的这份更新方向。
- 中间蓝色虚线卡是 STE 捷径，输出同一个 `grad_output`，不经过舍入的真实导数。STE 全称 straight-through estimator。
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

slime 在 `set_default_megatron_args` 中用 `args.bf16 = not args.fp16` 选择 BF16，Megatron 随后把模型参数设为 BF16。这个 recipe 还开启 `--use-precision-aware-optimizer`，但没有覆盖 `--main-params-dtype`，其默认值是 FP32。第 8 章已经区分 BF16 模型权重与 FP32 优化器主权重副本：前向使用前者，优化器更新后者。二者不能都叫作“BF16 master weights”。

### 接下来

训练完成一轮后，更新通道要生成 rollout 真正保存的整数编码和 scale。下一步看 real quantization。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-39`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `docker/patch/latest/megatron.patch:112-122`、`slime/backends/megatron_utils/arguments.py:11-16` 和 recipe；`NVIDIA/Megatron-LM@3714d81d418c9f1bca4594fc35f9e8289f652862` 的 `megatron/training/arguments.py:751-765,3475-3484`。

## 第 5 步 · 真实量化生成 rollout 编码

**一句话。** 每次 RL 权重更新都把符合条件的 BF16 权重表转成整数编码和对应 scale，这次编码要真正交给 rollout 保存。

### 图上是什么

- 标题下先解释：编码是用一个整数表示舍入后的权重。BF16 更新卡沿用训练传来的 0.35，组 scale 仍是 $0.70/7=0.10$。
- 有符号编码卡得到 4，范围是 $[-8,7]$；负数、零和正数都可以作为编码。
- scale 卡与编码一起导出，并在本配置中转成源权重的 BF16 类型。
- 图下只保留一个算式：$0.35/0.10=3.5$，舍入成编码 4。每轮 RL 更新都重新转换，不是只做一次离线导出。

### 公式与符号

$$s=\max(\max_i|x_i|/7,10^{-5}),\qquad q_i=\operatorname{clip}(\operatorname{round}(x_i/s),-8,7)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $x_i$ | 更新中一个符合条件的 BF16 权重值 | 训练端转出的权重表 |
| $s$ | 这一组的 scale | `int4_block_quantize` |
| $q_i$ | rollout 保存的有符号整数编码 | 舍入后截断到 $[-8,7]$ |
| $K$ | 最后一维，展平后作为输入列数 | `param.shape[-1]` |
| $\operatorname{clip}$ | 把编码限制在给定区间 | 固定版本的导出代码 |

### 代入图上的数

$$0.35/0.10=3.5\rightarrow q=4$$

### 转换范围与导出细节

虽然 scale 用最大绝对值除以 7，真实导出代码的字面 clamp 下界是 −8，而 fake QAT 是 −7。本章保留这个代码差异，不把两条路写成逐位相同。导出时 scale 转回源权重类型，本例是 BF16；fake QAT 计算时使用 FP32 scale，因此两边也不保证 scale 的每个位相同。

转换器处理未被忽略、至少二维且最后一维 K 受支持的 `.weight` 张量。高于二维时，`view(-1, param.shape[-1])` 把前面的维度全部展平成行。被忽略或不支持的张量保持未量化。

要区分公开 checkpoint 和 slime 更新转换器。公开 Kimi-K2-Thinking checkpoint 的打包权重都在 routed experts 中；其配置排除 `lm_head`、self-attention、shared experts 和 dense MLP projections。slime 转换器则只检查 `ignore`、`.weight` 后缀、维度和 K 维大小，并不读取 `targets`，所以 embedding 和 router 等未被忽略且形状支持的权重也可能进入转换。不能据此写成“更新转换器只量化专家权重”。

本例的 0.35 仍是构造展示值，不是一次测得的训练更新。MoE 是 mixture-of-experts，模型按 token 选择一部分专家计算。公开配置和更新转换器的过滤规则分别来自各自源码。

### 接下来

整数编码还需压紧存储。下一步把八个 4 位编码放进一个 32 位字，并算清一组的总字节。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:94-103`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `quantizer_compressed_tensors.py:88-159,162-191`、`hf_weight_iterator_direct.py:24-41` 和 `megatron_to_hf/deepseekv3.py:6-10,106-108`；Kimi-K2-Thinking `config.json:79-110` 及其公开权重索引。

## 第 6 步 · 把八个编码装进一个 32 位存储槽

**一句话。** 打包先把有符号编码加 8 映射到 $[0,15]$，再把八个 4 位字段装进一个 32 位存储槽；一组权重连 scale 共占 18 字节。

### 图上是什么

- BF16 权重组有 32 个数，占 $32\times2=64$ 字节。
- 有符号编码先加 8，使 $[-8,7]$ 映射到无符号的 $[0,15]$。
- 八个编码各占 4 位，合成一个 32 位存储槽，即 4 字节。INT32 是保存这个存储槽的 32 位整数类型。
- 完整一组有 16 字节打包权重和 2 字节 BF16 scale，合计 18 字节。首尾两条柱都用 64 字节作满宽。

### 公式与符号

$$u_i=q_i+8,\qquad P_{\mathrm{bit}}=\sum_{i=0}^{7}u_i2^{4i}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $q_i$ | 第 $i$ 个有符号 INT4 编码 | 第 5 步，范围 $[-8,7]$ |
| $u_i$ | 加 8 后的 4 位无符号字段 | `pack_to_int32`，范围 $[0,15]$ |
| $P_{\mathrm{bit}}$ | 八个字段合成的 32 位位型，不按有符号十进制数解读 | 位移后求和 |
| $i$ | 一个字内的编码位置 | 0 到 7 |
| $2^{4i}$ | 把第 $i$ 个 4 位字段移到它的位置 | 打包代码的 bit shifts |

### 代入图上的数

$q$ 是有符号编码。这个打包格式需要 0 到 15 的非负字段，所以先加 8。这里的存储槽有 32 位。示例编码 `[-8,-7,-1,0,1,4,6,7]` 加 8 后成为 `[0,1,7,8,9,12,14,15]`，位型为 `0xFEC98710`。这里说的是位型，不是 INT32 的有符号十进制值。八个字段的总宽度是：

$$8\times4=32\ \text{bits}=4\ \text{B}$$

完整 32 权重组的存储账为：

$$32\times2=64\ \text{B},\qquad 32\times4/8=16\ \text{B}$$
$$16+2=18\ \text{B},\qquad 18\times8/32=4.5\ \text{bits/weight}$$
$$(64-18)/64=71.875\%$$

第 1 步的 75% 只算原始 INT4 负载；本步加入一个 BF16 scale 后是 71.875%。未量化张量、其他元数据、KV cache 和运行工作区仍不在算例中，不能把这个比例当成完整 rollout 的显存收益。

### 接下来

打包后的标准排列还不能直接当成 Marlin 的工作布局。下一步看每次更新怎样恢复 buffer 形状、装入新值并重排。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:101-114`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `quantizer_compressed_tensors.py:47-85`。

## 第 7 步 · 每次更新都重建 Marlin 布局

**一句话。** Rollout 暂停生成后，先把 buffer 恢复原形状，再接收新打包权重和 scale，最后重排成 Marlin kernel 的布局并继续生成。

### 图上是什么

- 暂停卡阻止生成读取半旧半新的权重；调整形状卡只把可复用内存 `resize_` 到缓存的原形状。
- 组合 `LOAD + REORDER` 卡先用本轮的新打包权重和 scale 覆盖这份内存，再把第 6 步的通用 4 位打包改为 Marlin 乘法程序需要的顺序，并排列对应 scale。
- 继续卡表示新权重可用后恢复生成。`is_marlin_converted` 标记从 true 变 false，重排完成后再变 true。
- 图下用 64 个 scale 给出具体映射：重排后先取 `s0, s8, …, s56`，再取 `s1, s9, …, s57`，最后一段是 `s7, s15, …, s63`。

### 公式与符号

$$B_{\mathrm{old}}\xrightarrow{\operatorname{resize}}B_{\mathrm{shape}}\xrightarrow{\operatorname{load}}B_{\mathrm{new}}\xrightarrow{\operatorname{repack}}B_{\mathrm{Marlin}}$$

分组 scale 的排列规则是：

$$s'_{8i+j}=s_{i+8j},\qquad 0\le i,j\le7$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $B_{\mathrm{old}}$ | 上一轮 Marlin 布局的 buffer | rollout 当前状态 |
| $B_{\mathrm{shape}}$ | 恢复原形状后的同一个 buffer | `_original_shapes` 与 `resize_` |
| $B_{\mathrm{new}}$ | 写入本轮标准打包权重和 scale 的 buffer | 训练端更新通道 |
| $B_{\mathrm{Marlin}}$ | 重排后供 kernel 使用的新 buffer | `gptq_marlin_moe_repack` 和 scale permutation |
| $\operatorname{resize}$ | 只调整存储形状，不计算旧值的逆变换 | `restore_weights_before_loading` |
| $s_j$ | 重排前第 $j$ 个 scale | 本步构造的 64 个 scale |
| $s'_j$ | 重排后第 $j$ 个 scale | `marlin_permute_scales` |
| $i,j$ | 排列规则中的下标，均取 0 到 7 | `get_scale_perms` |

### 代入图上的数

本步用 64 个 scale 构造排列算例。输出前 8 个位置依次是 `s0, s8, s16, s24, s32, s40, s48, s56`；最后 8 个位置依次是 `s7, s15, s23, s31, s39, s47, s55, s63`。固定代码先 reshape 成每行 64 个，再按 `scale_perm` 取列，与图上的顺序一致。

buffer 是一份可复用内存，kernel 是在 GPU 上完成一项操作的程序，layout 是数据在内存里的排列顺序。这个 recipe 开启 `--colocate`，所以选择 `UpdateWeightFromTensor`。固定顺序是 `pause_generation`、`flush_cache`、恢复形状、传输新 tensor、post-process 和 `continue_generation`。暂停可避免生成读取新旧混合的权重。

“Restore”容易误读。代码只按 `_original_shapes` 调整 `param.resize_(orig_shape)` 并清除 converted 标记；它不做 inverse permutation，不反量化，也不恢复上一轮权重。随后写入的新值覆盖这个 buffer，post-process 再做 `gptq_marlin_moe_repack` 和 `marlin_moe_permute_scales`。converted 标记表示当前内存是否已是 Marlin 顺序，并防止重复 repack。第 6 步解决“怎样省位”，本步解决“乘法程序按什么顺序读”。

### 接下来

新布局已经可供 Marlin 使用。下一步打开计算路径，看 INT4 存储怎样变成 BF16 矩阵乘法，并在哪里使用 FP32 累加。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:80-103`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `actor.py:126-133`、`update_weight_from_tensor.py:106-143` 和 `docker/patch/latest/sglang.patch:732-823`；`sgl-project/sglang@dce8b0606c06d3a191a24c7b8cbe8e238ab316c9` 的 `python/sglang/srt/layers/quantization/marlin_utils.py:301-347`。

## 第 8 步 · W4A16 保存 INT4，计算用 BF16

**一句话。** Marlin 先撤销打包偏移并取回有符号编码，再把权重反量化成 BF16 做矩阵乘法；另一个细节是这条指令内部用 FP32 累加乘积。

### 图上是什么

- 解开 INT4 打包卡先计算 `字段 − 8`，撤销第 6 步的偏移，取回有符号编码。
- BF16 权重卡用有符号编码乘 scale 完成反量化，不是直接拿打包后的非负字段乘 scale。
- BF16 乘法卡的另一个输入是 BF16 激活值。激活值是计算过程中产生的数。
- 随后单独出现 FP32 累加卡：用 32 位数值保存不断累加的乘积总和。它只表示这条矩阵乘法指令内部的总和，不表示后续每种归约或最终输出都用 FP32。
- 图下前三行讲 W4A16 路径，后两行再讲 FP32 累加的范围，把两个概念分开。

### 公式与符号

$$q_j=u_j-8,\qquad w_j=sq_j,\qquad y_{\mathrm{inner}}=\operatorname{FP32\ accumulate}\left(\sum_j w_j a_j\right)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $u_j$ | 第 $j$ 个 4 位非负字段 | 第 6 步，范围 $[0,15]$ |
| $q_j$ | 撤销偏移后的有符号 INT4 编码 | $u_j-8$ |
| $s$ | 该组的 scale | 第 5 步导出的 BF16 scale |
| $w_j$ | 反量化后的 BF16 权重 | $sq_j$ |
| $a_j$ | 对应的 BF16 激活值 | 当前 rollout 计算 |
| $y_{\mathrm{inner}}$ | 这条 MMA 指令内部的累加结果，不是整个 MoE 的最终输出 | Marlin 的 MMA 指令 |

### 代入图上的数

代入第 6 步的字段 $u=12$ 和第 5 步的 scale $s=0.10$：

$$q=12-8=4,\qquad w=4\times0.10=0.40$$

固定 kernel 的指令是 `mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32`：两个输入是 BF16，这条 MMA 的累加器是 FP32。它不是在 INT4 数值上直接做矩阵乘法，也没有证明反量化零开销。`marlin_template.h:178-187,1290-1311` 还展示了组 scale 乘法。

这条 MoE 路径另有跨 slice 归约。支持原子加的路径在 `marlin_template.h:1635-1648` 对 `scalar_t2` 做 `atomicAdd`，本配置就是 BF16 对；输出中间张量也使用 `hidden_states.dtype`。因此本章只说 MMA 内部累加器是 FP32，不把每次归约或最终 BF16 输出都称为 FP32。

W4A16 的 W4 指 4 位权重，A16 在这里指 BF16 激活值。KV cache 是第 1 本第 3 章保存旧 k、v 的显存，这个标签没有把它量化成 INT4。权重读取字节减少与矩阵计算精度是两个独立问题。

文章报告的 Qwen 结果中，INT4 与 FP8 的单步推理表现接近，INT4 只有小幅优势；Kimi 双节点实验也没有显示 INT4 单独消除通信瓶颈。文章把更大的 Kimi 收益与单机部署联系起来。这些都是文章报告，不是本章实测，也不能推出任意 RL round 都加速。

### 接下来

最后看公开 checkpoint 的张量字节数与八张 H200 的总容量，区分“张量字节能放下”和“完整 rollout 已测得更快”。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:105-119,147-171`；`sgl-project/sglang@dce8b0606c06d3a191a24c7b8cbe8e238ab316c9` 的 `python/sglang/srt/layers/moe/fused_moe_triton/` `fused_marlin_moe.py:77-92,140-143`、`sgl-kernel/csrc/gemm/marlin/` `dequant.h:161-183` 和 `sgl-kernel/csrc/moe/marlin_moe_wna16/` `marlin_template.h:87-108,178-187,` `1290-1311,1635-1648`。

## 第 9 步 · 八张卡的总容量装得下 checkpoint 张量字节

**一句话。** 公开 Kimi-K2-Thinking 索引记录的张量负载是 594.206 GB，超过一张 141 GB H200，但小于八张卡合计的 1,128 GB。

### 图上是什么

- 左栏把 594.206 GB checkpoint 张量与一张 141 GB H200 对照，$594.206/141\approx4.21$，即单卡容量的约 4.21 倍。
- 右栏把同一份张量负载与八张卡的 1,128 GB 总容量对照。
- 四条柱都以 1,128 GB 为满宽。橙色始终是 checkpoint 张量字节，蓝色始终是卡容量。
- 图下把 index 解释成“每个张量放在哪个文件”的目录，把 metadata 解释成目录里的说明；`metadata.total_size` 就是这些说明记录的张量总字节。
- 八卡平均每张 74.276 GB 只是除法，不是测得的每个 rank 分配。

### 公式与符号

$$C=nM,\qquad c=K/n,\qquad K<C$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $K$ | 公开 checkpoint 索引记录的张量负载 | `model.safetensors.index.json` 的 `metadata.total_size` |
| $n$ | 一个 rollout engine 的 GPU 数 | 固定 recipe 的 `--rollout-num-gpus-per-engine 8` |
| $M$ | 文章使用的一张 H200 容量 | 141 GB |
| $C$ | 八张卡的总容量 | $8\times141=1{,}128$ GB |
| $c$ | checkpoint 字节除以八卡的平均值 | 本步计算，74.276 GB |

### 代入图上的数

$$K=594{,}205{,}920{,}512\ \text{B}=594.206\ \text{GB}$$
$$C=8\times141=1{,}128\ \text{GB},\qquad c=594.206/8=74.276\ \text{GB}$$

这里使用十进制 GB，$1\ \text{GB}=10^9$ 字节，不是 GiB。`metadata.total_size` 是索引记录的张量负载，不含 safetensors 头、索引文件和其他辅助文件。公开 checkpoint 的打包权重在 routed experts 中，其他未量化张量也计入这份负载。

$K<C$ 只说明这些张量字节小于八卡总容量。KV cache 是保存旧 k、v 的显存，工作区是计算临时使用的内存；它们和激活值、更新 buffer、各 rank 不均匀分配都需要额外空间，所以这不是完整 rollout 的显存验收。

文章把 1TB 级模型放进“单机”，不是一张 H200。固定 recipe 也明确给一个 rollout engine 八张 GPU。文章报告单机布局减少跨机通信并缩短 Kimi rollout，但没有提供本章可复算的原始时间表，因此本章不把部署收益写成测得的加速倍数。QAT 训练本身还有额外开销，完整 RL round 也要单独测量。

### 接下来

本章在两条可见路径处收尾：训练使用 fake BF16 往返，rollout 使用真实 INT4 Marlin。后续第 13 章第 1 步把 rollout 扩展到一次工具调用：第二次模型调用需要 prompt、第一个动作和工具观察，共 $2+4+3=9$ 个上下文 token。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:19-23,160-182`；Kimi-K2-Thinking `model.safetensors.index.json`（revision `a51ccc050d73dab088bf7b0e2dd9b30ae85a4e55`）的 `metadata.total_size`；`THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f` 的 `run-kimi-k2-Thinking-int4.sh:119-139`。
