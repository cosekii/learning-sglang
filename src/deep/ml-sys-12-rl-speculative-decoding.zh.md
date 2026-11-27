## 第 1 步 · target 改变时，draft 也学习

**一句话。** 每种配置的主 RL 都更新 target；“冻结”只指辅助 CE 不训练 MTP 层，“在线”则指辅助 CE 训练 MTP 层。

### 图上是什么

- 第一行算式表示第 6 章的 RL 循环：下一轮使用更新后的 target 权重。
- 橙色卡不让辅助 CE 训练 MTP 层；辅助 CE 是教 draft 给 token 打分的额外惩罚。蓝色卡用这个惩罚训练 MTP 层。两种配置的主 RL 都更新 target 主干和共享的 embedding／LM head。
- 两条柱使用同一比例，分别表示 1464 和 1667 token/s。draft 先猜、target 再验证的流程见第 1 本第 15 章第 3 步。

### 公式与符号

$$g=\frac{T_o-T_f}{T_f}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_f$ | 冻结 draft 的 rollout 吞吐 | 公开实验，1464 token/s |
| $T_o$ | 在线训练 draft 的 rollout 吞吐 | 公开实验，1667 token/s |
| $g$ | 在线版相对冻结版的吞吐提升 | 本步计算 |

### 代入图上的数

$$T_o-T_f=1667-1464=203\ \text{token/s}$$
$$g=(1667-1464)/1464=13.9\%$$

在线训练 draft 指 RL 训练 target 的同时，用辅助 CE 训练 checkpoint 自带的 multi-token prediction（MTP）层，不是另外离线做一次训练。“冻结”只排除这条辅助 CE 路径；两种配置的主 RL 损失都仍更新 target 主干以及与 draft 共享的 embedding／LM head。外部独立 draft model 的训练在该固定版本尚未实现。

### 接下来

下一步从 target 的一次前向中取出每个 token 位置的 hidden state，看 draft 能拿到什么线索。

来源：`Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:66-94`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docs/zh/advanced/speculative-decoding.md:24-38`。

## 第 2 步 · target 在每个 token 位置留下笔记

**一句话。** target 前向为每个位置留下一个 hidden state，draft 训练直接复用这些已经算出的内部笔记。

### 图上是什么

- 橙色序列卡是构造的五个 token：`[a,b,c,d,e]`。
- 中间卡是 target 的平常前向，不是另跑一次 rollout。
- 蓝色卡是 `[h(a),h(b),…]`，每个位置一份 hidden state。第 1 本第 15 章第 5 步已经把 hidden state 交给 drafter，本步沿用这条路径。

### 公式与符号

$$h_t=H(x_{\le t})$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $x_t$ | 位置 $t$ 的输入 token | 本步构造的 `[a,b,c,d,e]` |
| $x_{\le t}$ | 从开头到位置 $t$ 的 token | 同一序列 |
| $H$ | target 根据已给前缀进行的计算 | target 前向 |
| $h_t$ | 位置 $t$ 的 hidden state，即内部笔记 | 前向输出 |

### 代入图上的数

第一个位置写作 $h(a)=H(a)$；第二个位置写作 $h(b)=H(a,b)$。五个位置共有五份笔记。$h(a)$ 不是 token `a` 的另一种写法，而是 target 处理到该位置后算出的一组数。

### 接下来

draft 还需要知道下一个输入 token。下一步把 token 序列左移，再转成 embedding，与这些笔记对齐。

来源：`Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:25-30`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docker/patch/latest/megatron.patch:152-179`。

## 第 3 步 · 把 target 笔记与下一个 token 配对

**一句话。** token 左移一次并转成 embedding，位置 $t$ 就能把 $h_t$ 与 $e_{t+1}$ 拼起来，学习预测 $x_{t+2}$。

### 图上是什么

- 原序列仍是 `[a,b,c,d,e]`。左移后变成 `[b,c,d,e,—]`，所以位置 `a` 对应下一个 token `b`。
- embedding 卡把移位后的 token 编号转成模型用的数，写成 `[e(b),e(c),…]`。
- 最后的预测任务把 $h(a)$ 与 $e(b)$ 拼接，目标是 `c`。这是希望 draft 学会的对应关系，不是保证它当前已经猜对。

### 公式与符号

$$u_t=\operatorname{concat}(h_t,e_{t+1})$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $h_t$ | 位置 $t$ 的 target 内部笔记 | 第 2 步 |
| $e_{t+1}$ | 下一个 token 的 embedding，即模型用的数 | 本步左移后查 embedding 表 |
| $\operatorname{concat}$ | 把两组数并排拼接，不是相加 | 本步定义为 join |
| $u_t$ | draft 在位置 $t$ 收到的配对输入 | 本步计算 |

### 代入图上的数

$$u_a=\operatorname{concat}(h(a),e(b))$$

在位置 `a`，下一个 token 是 `b`，再下一个就是 `c`，所以训练任务是从 $u_a$ 预测 `c`。一层 MTP 每次调用在每个位置预测一个后续 token；EAGLE 是反复调用这层来提出多个 token 的 draft 方法。横线只表示序列外没有真实 token，固定实现用 0 补齐，不会多出一个叫“—”的 token。

本图画的是原始 MiMo checkpoint 的顺序：`concat(h_t,e_{t+1})`，即 hidden state 在前、embedding 在后。固定 Megatron 前向实际执行 `concat(e_{t+1},h_t)`；`MimoBridge` 在 checkpoint 转换时交换 `eh_proj` 的输入半块。两种写法都把同一对 $(h_t,e_{t+1})$ 送给 draft 学习 $x_{t+2}$，不能把“join”理解成算术相加。

### 接下来

下一步把移位后的 token 再左移一次，得到每个位置的训练标签，并计算 cross entropy。

来源：`Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:31-46,236-240`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docker/patch/latest/megatron.patch:152-190`、`slime_plugins/mbridge/mimo.py:106-120`；`NVIDIA/Megatron-LM@23e00ed0963c35382dfe8a5a94fb3cda4d21e133` 的 `megatron/core/transformer/multi_token_prediction.py:511-522`。

## 第 4 步 · 第二次左移生成训练标签

**一句话。** 把已经左移的 token 再移一次，得到 draft 应预测的标签，再用 cross entropy 给不符合标签的分数扣分。

### 图上是什么

- 第一卡是第 3 步的 `[b,c,d,e,—]`，第二卡再左移成 `[c,d,e,—,—]`，后一列就是训练标签。
- draft 为每个位置给候选 token 打分。CE 卡比较这些分数与同一位置的标签，正确 token 得分越高，CE 越小。
- 横线位置没有真实标签，不参与这里的评分。

### 公式与符号

$$\mathcal L_{\mathrm{MTP}}=-\log p_{\mathrm{draft}}(x_{t+2}\mid u_t)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $u_t$ | $h_t$ 与 $e_{t+1}$ 拼成的 draft 输入 | 第 3 步 |
| $x_{t+2}$ | 位置 $t$ 后面第二个位置的 token，即训练标签 | 本步第二次左移 |
| $p_{\mathrm{draft}}$ | draft 给正确标签分配的概率 | draft 分数经 softmax |
| $\mathcal L_{\mathrm{MTP}}$ | 这一位置的 cross entropy | 本步计算 |

### 代入图上的数

位置 `a` 的输入是 $u_a=\operatorname{concat}(h(a),e(b))$，标签是 `c`，所以这一项是 $-\log p_{\mathrm{draft}}(c\mid u_a)$。如果正确 token 的概率上升，负对数就下降。图上没有编造概率或 CE 数值。

上式是一项逐位置 CE，不是整份归一化损失。固定的一层 MTP recipe 设置 `--mtp-loss-scaling-factor 0.2`，即五分之一。Megatron 先应用 mask；关闭 per-token loss 时，还除以实现从 `new_loss_mask` 得到的 `num_tokens`，再把这个系数用于辅助分支。主模型输出的反向节点随后触发该分支，不需要另写一次 `mtp_loss.backward()`。这里的 `num_tokens` 不能直接当成第 6 步交集后的位置数。

### 接下来

下一步看 `detach` 怎样让这份辅助 CE 更新 draft，同时不把它的梯度送进 target 主干和共享表。

来源：`Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:46-60`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docs/zh/advanced/speculative-decoding.md:24-38`、`docker/patch/latest/megatron.patch:152-191`；`NVIDIA/Megatron-LM@23e00ed0963c35382dfe8a5a94fb3cda4d21e133` 的 `megatron/core/models/gpt/gpt_model.py:500-508`、`megatron/core/transformer/multi_token_prediction.py:349-382`。

## 第 5 步 · detach 把 draft 的课程留在 draft

**一句话。** detach 让前向继续使用 target 和共享表的数值，却只切断辅助 CE 的梯度；主 RL 损失不受影响。

### 图上是什么

- 蓝色 CE 和 draft 层卡片保持可训练。CE 一行说明第 4 步标签产生的调整权重信号能到达 draft 层。
- 共享表卡片列出 embedding 和 LM head。第一条前向路线用 embedding 把 token ID 变成模型数列，第二条用 LM head 把 hidden state 变成 token 分数。两者都使用当前参数值。
- 橙色虚线卡片和两条 CE 路线分别挡住辅助 CE 通向 target 主干与共享表的梯度。这是两组不同的参数。
- 最后一行说明主 RL 学习仍训练 target 和共享表。挡住辅助 CE 不等于冻结这些权重。

### 公式与符号

gradient 是训练时调整权重的信号，指明权重改变的方向和幅度。

$$g^{\mathrm{CE}}_{\theta_{\mathrm{detached}}}=0$$

$$g^{\mathrm{CE}}_{\theta_{\mathrm{shared}}}=0$$

$$g^{\mathrm{CE}}_{\theta_{\mathrm{MTP}}}\ \text{正常计算}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $\theta_{\mathrm{detached}}$ | 这条辅助 CE 分支上被 detach 的 target 主干参数 | 第 2、5 步的 target 主干 |
| $\theta_{\mathrm{shared}}$ | 与 draft 共享的 embedding 和 LM head 参数，只在这条辅助 CE 调用中 detach | 本步共享表卡片 |
| $\theta_{\mathrm{MTP}}$ | draft 自带 MTP 层的参数 | 第 1 步 |
| $g^{\mathrm{CE}}_{\theta}$ | 辅助 CE 对参数 $\theta$ 的梯度 | 本步反向路径 |

### 代入图上的数

本步不构造梯度数值。前两式把辅助 CE 对被 detach 的 target 主干及共享 embedding／LM head 的梯度贡献设为 0；右式保留 MTP 参数的梯度路径，并不保证每个位置都得到非零值。主 RL 损失的梯度是另一条路径，不在这些等式里。

### 图外实现

实现对 embedding 输出做 detach。target hidden state 经过 <code>make_viewless_tensor(...,<wbr> requires_grad=True,<wbr> keep_graph=False)</code>，再通过 `functional_call` 调用共享 LM head，并传入 detach 后的参数视图。这些视图不修改原参数或它们的 `requires_grad` 标志。MTP 自己的 hidden 输出没有 detach，所以 CE 仍能回到 MTP 层；主 RL 损失仍训练 target 主干和共享表。

### 接下来

下一步用 loss mask 决定哪些位置计入 CE，避免没有两个有效后续 token 的位置教错 draft。

来源：<code>Awesome-ML-SYS-Tutorial@<wbr>d1f309b46f81a23e8b6ca0718c05bc897fafacf7</code>, `rlhf/slime/spec/readme.md:58-60,184-234`；<code>THUDM/<wbr>slime@<wbr>1278475ef4757ac8b03b1836dc1dc20fcc2dd56a</code> 的 `docker/patch/latest/megatron.patch:164-180,596-603`。

## 第 6 步 · 两个后续 token 都有效才计分

**一句话。** loss mask 左移两次后相乘，位置 $t$ 只有在 $t+1$ 和 $t+2$ 都有效时才计入 draft 的 CE。

### 图上是什么

- 原始 mask 是 `[1,0,1,1,0]`，1 表示这个 token 有效，0 表示跳过。
- 左移一次得到 `[0,1,1,0,0]`，检查中间 token $t+1$；左移两次得到 `[1,1,0,0,0]`，检查目标 token $t+2$。
- 两列相乘得到 `[0,1,0,0,0]`。第二个位置保留，尽管它的原始 mask 是 0，因为这里检查的是后两个 token。

### 公式与符号

$$m^{\mathrm{MTP}}_t=m_{t+1}m_{t+2}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $m_t$ | 位置 $t$ 的原始 loss mask | 本步构造序列 |
| $m_{t+1}$ | 中间 token 是否有效 | 左移一次 |
| $m_{t+2}$ | 目标 token 是否有效 | 左移两次 |
| $m^{\mathrm{MTP}}_t$ | 这个位置是否计入一层 MTP 的 CE | 本步相乘 |

### 代入图上的数

从 0 开始编号，$t=1$ 是第二个位置：$m_2=1$ 且 $m_3=1$，所以 $m^{\mathrm{MTP}}_1=1\times1=1$。原始 $m_1=0$ 不进入这条公式，因为当前位置不是本步要检查的中间 token 或目标 token。

slime 在移位前先把 prompt 部分补成 0，再按 context parallelism 的规则切分并对齐 mask。这里只展示一层 MTP 的位置交集；实现的 CE 归一化分母和多层 MTP 的掩码推进需要另看代码，不能从这张图推断。

### 接下来

下一步回到公开实验，比较三种配置的 rollout 吞吐，看在线训练 draft 的收益有多大。

来源：`Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:144-176`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `slime/backends/megatron_utils/model.py:408-467`、`docker/patch/latest/megatron.patch:158-191`。

## 第 7 步 · 用同一比例比较 rollout 吞吐

**一句话。** 公开汇总表中，在线训练 draft 的 rollout 吞吐最高，比冻结 draft 高 13.9%，比不用投机高 36.8%。

### 图上是什么

- 灰柱不用投机，吞吐为 1219 token/s；橙柱使用冻结 draft，为 1464；蓝柱在线训练 draft，为 1667。
- 三柱使用同一比例，数值都是文章报告的每秒生成 token 数，不是本章实测。
- “冻结”和“在线”只描述辅助 CE 是否训练 MTP 层。两种配置的主 RL 都更新 target 主干和共享的 embedding／LM head。
- target 漂移可能扩大 draft 与 target 的概率差距，减少接受的 token。在线辅助 CE 训练 MTP 跟随这些更新。文章报告的 accept length 上升与 MTP loss 下降符合这个方向，但没有单独证明因果关系，也不能证明其他负载有同样收益。
- 第 1 本第 15 章第 8 步说明每次 target 计算正式接收更多 token，可以摊薄每次计算的成本。本步只使用这个机制，不搬用别章的模型数字。

### 公式与符号

$$g_{a:b}=\frac{T_a-T_b}{T_b}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_a,T_b$ | 两种配置的 rollout 吞吐 | 公开汇总表 |
| $g_{a:b}$ | 配置 $a$ 相对配置 $b$ 的提升 | 本步计算 |
| $a,b$ | no、frozen、online 中的两个配置 | 图上三柱 |

### 代入图上的数

$$g_{frozen:no}=1464/1219-1=20.1\%$$
$$g_{online:frozen}=1667/1464-1=13.9\%,\qquad g_{online:no}=1667/1219-1=36.8\%$$

文章还报告长尾阶段吞吐：不用投机 47、冻结 57、在线 65 token/s。对应在线相对冻结为 $65/57-1=14.0\%$，长尾指多数请求已结束、少数慢请求仍在生成的阶段。它与整批 rollout 吞吐是两个指标。

文章还描述 draft 接受表现改善和 MTP loss 下降；本步没有从曲线读取精确数值，也没有把每次 target 计算接收的 token 数换算成时间。汇总表也没有统一的 rollout token 数与整轮时间线，因此 36.8% 不是端到端 RL 加速比，也不能证明所有负载的 reward 都不变。

### 接下来

下一步看在线训练额外付出的训练秒数，并标明为什么不能把吞吐提升直接当成整轮收益。

来源：`Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:66-114`。

## 第 8 步 · 在线训练 draft 多付 7 秒

**一句话。** 同一公开表把训练指标列为 141、143、148 秒。在线版高 7 秒，但原文没说这些秒数覆盖哪些训练步，现有数据也算不出整轮加速。

### 图上是什么

- 灰柱不用投机，训练时间 141 秒；橙柱冻结 draft 为 143 秒；蓝柱在线训练为 148 秒。三柱仍用同一比例。
- 两个差值分别是 $148-141=7$ 秒和 $148-143=5$ 秒。
- 最后两行离开这张已报告的 rollout 汇总表，画出 `模型回答 → 程序回复 → 模型回答`，引出下一章的多轮序列和 mask 问题。

### 公式与符号

$$\Delta T_{a:b}=T^{train}_a-T^{train}_b,\qquad c_{a:b}=\frac{T^{train}_a}{T^{train}_b}-1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T^{train}_a,T^{train}_b$ | 两种配置的报告训练时间 | 公开汇总表 |
| $\Delta T_{a:b}$ | 配置 $a$ 多付的训练秒数 | 本步计算 |
| $c_{a:b}$ | 训练时间的相对增幅 | 本步计算 |

### 代入图上的数

$$\Delta T_{online:no}=148-141=7\ \text{s},\qquad c_{online:no}=148/141-1=5.0\%$$
$$\Delta T_{online:frozen}=148-143=5\ \text{s},\qquad c_{online:frozen}=148/143-1=3.5\%$$

第 7 步给的是 token/s，本步给的是以秒表示的训练指标。原文没有说明 141、143、148 秒各自覆盖哪些训练步，也没有统一的 rollout token 数和完整轮次时间线，因此不能把二者合成端到端收益。这里的 5.0% 是这个报告指标的增幅，不是整轮变慢 5.0%。

### 接下来

固定版本的 ReTool 示例把 assistant 生成的 token 标为训练有效，又把解释器返回的观察追加到同一 response，并使用不同 mask。下一章沿着这条可见序列问：哪些 token 进入策略训练，哪些相邻位置还能教 draft？

来源：`Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:66-104`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `examples/retool/generate_with_retool.py:267-303`。
