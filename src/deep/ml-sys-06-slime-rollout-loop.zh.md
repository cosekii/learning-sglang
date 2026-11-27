## 第 1 步 · 一轮先准备 256 个回答

**一句话。** 自带配置让模型给 32 道题各写 8 个回答，收齐 256 个回答和分数后才调用训练。

### 图上是什么

- `weights v0` 是模型当前的数字表；第 7 步训练后得到 `v1`。
- 蓝色框装问题、回答和分数，橙色框表示训练。每道题要写 8 个回答，所以中间共有 $32\times8=256$ 个回答。
- 这一步用回答数量说明一轮的工作量，没有给出运行时间，也没有宣称训练效果。

### 公式与符号

$$N=n_q\times n_s$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $n_q$ | 一轮取出的问题数 | 配置的 `rollout-batch-size`，32 |
| $n_s$ | 每道问题生成的回答数 | 配置的 `n-samples-per-prompt`，8 |
| $N$ | 一轮生成的回答总数 | 本步相乘 |

### 代入图上的数

$$N=32\times8=256$$

配置另写 `global-batch-size 256`，所以这份生成数量与训练全局批大小相等。两者相等并不说明训练内部有多少个小批次、更新多少次权重，第 7 步再说明这个边界。

### 接下来

256 个回答并非从 256 道不同问题开始。下一步先看数据源怎样把每道问题复制成一组 8 份。

来源：`scripts/run-qwen3-4B.sh:38-53`；`train.py:51-62`，固定提交 `261ecee`。

## 第 2 步 · 每道 prompt 复制成 8 份

**一句话。** `RolloutDataSource` 取出 32 个 prompt，把每个 prompt 深复制成同组 8 份。

### 图上是什么

- `prompt` 是交给模型的问题文本。左侧取出 32 张问题卡，右侧展开其中一组。
- 组内 8 张答题纸起初内容相同，`copy 0` 到 `copy 7` 是组内位置，不是图上省略的全局样本编号。
- 复制只准备输入，还没有生成回答。源码会给每份副本分配不同的 `sample.index`，供后面跟踪。

### 公式与符号

$$N_g=g\times n_s$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $g$ | 本轮 prompt 组数 | 第 1 步，32 |
| $n_s$ | 每组的 prompt 副本数 | 第 1 步，8 |
| $N_g$ | 本轮待写回答的答题纸总数 | 本步相乘 |

### 代入图上的数

$$N_g=32\times8=256$$

`get_samples` 先切出 prompt，再执行 `copy.deepcopy`。若 buffer 里有早前未完成的组，`RolloutDataSourceWithBuffer` 会先取 buffer；本图从空 buffer 的普通路径开始。

### 接下来

相同输入还要变成 8 份可训练的回答记录。下一步让 SGLang 用当前权重写回答。

来源：`slime/ray/rollout_data_source.py:46-81,133-167`。

## 第 3 步 · Rollout 写出回答记录

**一句话。** SGLang 用 `v0` 给同组 8 个 prompt 写回答，并把 token、回答长度和逐 token 的 log probability 留在每份 rollout 记录里。

### 图上是什么

- 橙色 `SGLANG ROLLOUT` 表示生成过程；右侧 8 个蓝框是同一 prompt 的 8 份回答记录。
- `tokens` 依次保存问题 token ID 和新生成的回答 token ID。`response_length` 只数回答 token，不把问题长度算进去。
- `rollout_log_probs` 保存模型写每个回答 token 时的 log probability。它给每个 token 各记一个生成分数，不是给整个回答打分。
- `reward = ?` 表示整个回答的另一种分数还没填写。第 4 步由回答检查器给出 reward；它不是从 `rollout_log_probs` 算出来的。
- 同组生成任务异步执行；图中不表示它们按编号顺序完成。

### 公式与符号

$$T_s=T_{q,s}\mathbin{+\!+}T_{a,s},\qquad \ell_s=|T_{a,s}|,\qquad |P_s|=\ell_s$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_{q,s}$ | 样本 $s$ 的问题 token ID 列表 | prompt 经 tokenizer 转换 |
| $T_{a,s}$ | 样本 $s$ 新生成的回答 token ID 列表 | SGLang 返回 |
| $T_s$ | 问题与回答拼接后的完整 token 列表 | `Sample.tokens` |
| $\ell_s$ | 回答 token 数 | <code>Sample.<wbr>response_<wbr>length</code> |
| $P_s$ | 模型的 log probability 列表，每个回答 token 各一项 | <code>Sample.<wbr>rollout_<wbr>log_<wbr>probs</code> |
| $\mathbin{+\!+}$ | 按先后顺序拼接列表 | 本步记号 |

### 代入图上的数

每组有 8 份记录，32 组共有 $32\times8=256$ 份。图没有指定各份回答长度，因此不为 $\ell_s$ 填教学假值；源码按实际新增 token 数逐个累加。

### 接下来

记录里已有逐 token 的 log probability，但那不是 reward。下一步用 deepscaler 对照标准答案，另给整个回答一个 reward。

来源：`slime/rollout/sglang_rollout.py:65-131,178-194`；`slime/utils/types.py:8-31`。

## 第 4 步 · deepscaler 给出原始分数

**一句话。** deepscaler 把模型答案与数据里的标准答案核对，核对成功给 1，其余情况给 0。

### 图上是什么

- `label` 是数据集保存的标准答案。左侧把它与模型回答一起交给检查器。
- `DEEPSCALER` 是这份配置选择的数学答案检查器，对应 `--rm-type deepscaler`。
- 右侧 8 个原始分数依次是四个 1、四个 0。1 表示核对成功；0 表示没有核对成功，也可能是缺少所需文本结构或标准答案。
- 这些分数是为下一步构造的教学例，不是 Qwen3-4B 的真实训练输出。

### 公式与符号

$$r_s\in\{0,1\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $r_s$ | 第 $s$ 份回答的原始 reward | `async_rm` 返回的 deepscaler 分数 |

### 代入图上的数

$$r=[1,1,1,1,0,0,0,0]$$

同组 8 个任务默认分别调用 `async_rm`。只有启用 `group_rm` 时才改走整组奖励路径；自带脚本没有打开这个开关，本章不展开。

### 接下来

仅有 0 和 1 还不能看出一个回答比同组其他回答好多少。下一步先减去组内平均分。

来源：`run-qwen3-4B.sh:44`；`slime/rollout/rm_hub/__init__.py:29-68`；`deepscaler.py:4-42`；`sglang_rollout.py:156-194`。

## 第 5 步 · GRPO 先减组内平均分

**一句话。** GRPO 把同题 8 个原始分的平均值作为比较点，1 和 0 分别变成 $+0.5$ 和 $-0.5$。

### 图上是什么

- 上排沿用第 4 步的 8 个原始分，下排是减去同组平均分后的居中分数。
- `mean 0.5` 只使用同一 prompt 的 8 个分数，不把别组回答混进来。
- `GRPO` 在这里表示按同题回答组进行相对比较。正数高于组平均，负数低于组平均。
- 原始分没有丢弃，控制器后面会同时保留 `raw_reward` 和处理后的 `rewards`。

### 公式与符号

$$\bar r=\frac{1}{n_s}\sum_{i=1}^{n_s}r_i,\qquad c_i=r_i-\bar r$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $r_i$ | 组内第 $i$ 个原始分 | 第 4 步 |
| $n_s$ | 每组回答数 | 第 1 步，8 |
| $\bar r$ | 本组原始分的平均值 | 本步计算 |
| $c_i$ | 第 $i$ 个居中分数 | 本步相减 |

### 代入图上的数

$$\bar r=\frac{1+1+1+1+0+0+0+0}{8}=\frac48=0.5$$

$$c(1)=1-0.5=+0.5,\qquad c(0)=0-0.5=-0.5$$

这份配置使用 GRPO，且没有关闭 reward normalization，所以会执行上述相减。

### 接下来

居中后还要按组内离散程度缩放。下一步计算标准差和最后的归一化分数。

来源：`run-qwen3-4B.sh:80-88`；`slime/utils/arguments.py:546-550,579-584`；`slime/ray/buffer.py:82-103`。

## 第 6 步 · 再除以标准差

**一句话。** 这份配置还把居中分数除以同组标准差加 $10^{-6}$，得到约 $+0.9354$ 和 $-0.9354$。

### 图上是什么

- 上排是第 5 步的 $c_i$，下排是归一化分数 $u_i$；橙色箭头表示除以 `std + ε`。
- `std` 是 standard deviation，用来描述分数离平均值有多散。这里的 8 个居中分绝对值都相同，所以标准差略大于 $0.5$。
- `ε` 是防止除以 0 的小量，固定为 $0.000001$。分母中的 7 来自 `torch.std` 默认的无偏估计 $8-1$。
- 卡片保留 4 位小数；公式使用未四舍五入的标准差再计算。

### 公式与符号

$$s=\sqrt{\frac{\sum_{i=1}^{n_s}c_i^2}{n_s-1}},\qquad u_i=\frac{c_i}{s+\epsilon}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $c_i$ | 组内第 $i$ 个居中分数 | 第 5 步 |
| $n_s$ | 每组回答数 | 第 1 步，8 |
| $s$ | 本组居中分数的标准差 | `torch.std`，默认无偏估计 |
| $\epsilon$ | 除法保护小量 | 源码写死 $10^{-6}$ |
| $u_i$ | 第 $i$ 个归一化分数 | 本步相除 |

### 代入图上的数

$$s=\sqrt{\frac{4\times0.5^2+4\times(-0.5)^2}{7}}=\sqrt{\frac27}=0.5345224838\ldots$$

$$u(1)=\frac{0.5}{0.5345224838\ldots+0.000001}=0.9354125967\ldots\approx+0.9354$$

$$u(0)=-u(1)\approx-0.9354$$

### 接下来

现在每份回答都有原始分和归一化分数。下一步把 32 组展开成训练数据并调用训练。

来源：`slime/ray/buffer.py:86-103`；`run-qwen3-4B.sh:80-88`；`slime/utils/arguments.py:573-584`。

## 第 7 步 · 展开成训练数据并训练

**一句话。** 控制器把 32 组展开为 256 份记录，组成 `train_data`，训练调用据此把 `v0` 更新为 `v1`。

### 图上是什么

- 左侧仍按 32 组排列，中间 `CONTROLLER` 负责展开和转换，右侧成为 256 份训练记录。
- 舞台上的 `train_data` 只概括了 token、回答长度和归一化 `rewards`。
- `global batch size 256` 与本轮记录数相等。橙色训练框表示一次 `actor_model.async_train(0, data)` 调用。
- 训练后端可以把这次调用拆成更小批次，也可能多次更新权重；这些内部步骤不在图中。

### 图外字段 · 未画出

源码还打包 `raw_reward`、截断标记、样本编号、loss mask 与已有的 rollout log probability。如果首份样本的 metadata 含有 `raw_reward`，源码就用各样本 metadata 中的值替换后处理得到的原始分列表。舞台没有画这些额外字段或这次条件替换。

### 公式与符号

$$N=g\times n_s=B,\qquad W_1=\operatorname{Train}(W_0,D)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $g$ | prompt 组数 | 第 2 步，32 |
| $n_s$ | 每组回答数 | 第 1 步，8 |
| $N$ | 展开后的训练记录数 | 本步相乘 |
| $B$ | 配置的全局批大小 | <code>global-<wbr>batch-<wbr>size</code>，256 |
| $D$ | 控制器生成的 `train_data` | <code>buffer.py:<wbr>118-154</code> |
| $W_0,W_1$ | 训练前、后的模型权重 | 本步训练调用 |
| $\operatorname{Train}$ | 等待完成的训练调用 | <code>actor_model.<wbr>async_<wbr>train</code> |

### 代入图上的数

$$N=32\times8=256=B$$

`train.py` 用 `ray.get` 等待这次训练结束，然后才进入权重更新。loss mask 默认在每个回答 token 上填 1，已有自定义 mask 则必须与实际回答长度一致。

### 接下来

新权重还在训练侧。下一步等待更新完成，让下一轮 SGLang 也使用 `v1`。

来源：`slime/ray/buffer.py:42-72,105-154`；`train.py:51-75`；`run-qwen3-4B.sh:51,75-78`。

## 第 8 步 · 更新完成后才进入下一轮

**一句话。** `train.py` 等待训练后的权重更新完成，再让 SGLang 用 `v1` 开始第 1 轮生成。

### 图上是什么

- 左侧是第 7 步刚得到的 `weights v1`，中间橙色框表示权重更新，右侧 SGLang 收到 `v1`。
- `ray.get(...)` 在这里表示等待操作完成。函数名里的 `async` 不等于主循环可以不等它。
- 底部 `ROLLOUT 1` 是下一轮，会取下一批 prompt 组并用 `v1` 生成；上方一轮则记为 rollout 0。
- 本章只画交接顺序，不画传输介质、并行分组或权重分片。

### 公式与符号

$$G_0\rightarrow T_0\rightarrow U_0\rightarrow G_1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $G_0$ | 第 0 轮生成 | `rollout_manager.async_generate(0)` |
| $T_0$ | 第 0 轮生成数据上的训练 | `actor_model.async_train(0, data)` |
| $U_0$ | 训练后的权重更新 | `actor_model.async_update_weights()` |
| $G_1$ | 第 1 轮生成 | 下一次循环的 `async_generate(1)` |

### 代入图上的数

第 51–61 行先等待 $G_0$ 和 $T_0$，第 75 行等待 $U_0$，循环随后才把 `rollout_id` 增为 1。第 43–44 行还在训练循环开始前做过一次初始权重同步。

### 接下来

图上橙色更新框只说明「要送到」。下一章打开这个框，看权重怎样从训练后端传到 SGLang，以及何时可以安全替换。

来源：`train.py:43-44,49-78`；`Awesome-ML-SYS-Tutorial/rlhf/slime/code-walk-through/readme.md:71-81`。
