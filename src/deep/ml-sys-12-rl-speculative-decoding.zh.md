## 第 1 步 · target 改变时，draft 也学习

**一句话。** RL 每轮更新 target，冻结 draft 仍用旧权重；公开实验中，让 draft 在线学习把 rollout 吞吐从 1464 提到 1667 token/s。

### 图上是什么

- 第一行算式表示第 6 章的 RL 循环：下一轮使用更新后的 target 权重。
- 橙色卡是冻结 draft：生成候选时仍读旧权重。蓝色卡是在线 draft：也从每批 RL 数据学习。
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

Online SFT 在这里指 RL 训练 target 的同时也训练 draft，不是另外离线做一次训练。这个配置实际训练 checkpoint 自带的 MTP 层，也就是模型里负责提前猜后续 token 的一层；外部独立 draft model 的训练在该固定版本仍是 WIP。

### 接下来

下一步从 target 的一次前向中取出每个 token 位置的 hidden state，看 draft 能拿到什么线索。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:66-94`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docs/zh/advanced/speculative-decoding.md:24-38`。

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

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:25-30`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docker/patch/latest/megatron.patch:152-179`。

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

在位置 `a`，下一个 token 是 `b`，再下一个就是 `c`，所以训练任务是从 $u_a$ 预测 `c`。横线只表示序列外没有真实 token，固定实现用 0 补齐，不会多出一个叫“—”的 token。

本图按公开实验的 MiMo 排列画 `hidden state` 在前、embedding 在后。其他模型的 projection 排列可以不同，不能把“join”理解成跨模型统一的半块顺序。

### 接下来

下一步把移位后的 token 再左移一次，得到每个位置的训练标签，并计算 cross entropy。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:31-46`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docker/patch/latest/megatron.patch:152-190` 和 `slime_plugins/mbridge/mimo.py:106-120`。

## 第 4 步 · 第二次左移生成训练标签

**一句话。** 把已经左移的 token 再移一次，得到 draft 应预测的标签，再用 cross entropy 给不符合标签的分数扣分。

### 图上是什么

- 第一卡是第 3 步的 `[b,c,d,e,—]`，第二卡再左移成 `[c,d,e,—,—]`，后一列就是训练标签。
- draft 为每个位置给候选 token 打分。CE 卡比较这些分数与同一位置的标签，正确 token 得分越高，CE 越小。
- 横线位置没有真实标签，不参与这里的评分。公开配置把辅助 CE 乘 0.2 后加入训练反向过程。

### 公式与符号

$$\mathcal L_{\mathrm{MTP}}=-\log p_{\mathrm{draft}}(x_{t+2}\mid u_t)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $u_t$ | $h_t$ 与 $e_{t+1}$ 拼成的 draft 输入 | 第 3 步 |
| $x_{t+2}$ | 位置 $t$ 后两个 token，即训练标签 | 本步第二次左移 |
| $p_{\mathrm{draft}}$ | draft 给正确标签分配的概率 | draft 分数经 softmax |
| $\mathcal L_{\mathrm{MTP}}$ | 这一位置的 cross entropy | 本步计算 |

### 代入图上的数

位置 `a` 的输入是 $u_a=\operatorname{concat}(h(a),e(b))$，标签是 `c`，所以这一项是 $-\log p_{\mathrm{draft}}(c\mid u_a)$。如果正确 token 的概率上升，负对数就下降。图上没有编造概率或 CE 数值。

固定 recipe 设置 `--mtp-loss-scaling-factor 0.2`，所以进入反向过程的辅助项为 $0.2\mathcal L_{\mathrm{MTP}}$。实现把它接到主模型输出的反向节点，不需要另写一次 `mtp_loss.backward()`。

### 接下来

下一步看 `detach` 怎样让这份辅助 CE 更新 draft，同时不把它的梯度送进 target 主干和共享表。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:46-60`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docs/zh/advanced/speculative-decoding.md:24-38`、`docker/patch/latest/megatron.patch:581-603`。

## 第 5 步 · detach 把 draft 的课程留在 draft

**一句话。** detach 让前向继续使用 target 和共享表的数值，却只切断辅助 CE 的梯度；主 RL 损失不受影响。

### 图上是什么

- 蓝色 CE 和 draft 层之间的梯度路径畅通，所以 draft 参数能从第 4 步的标签学习。
- 橙色 target 主干被 detach，辅助 CE 不能继续向 target hidden state 回传。
- 共享表包含 embedding 与共享打分表。打分表就是 LM head，把 hidden state 变成 token 分数；这条 CE 分支使用 detach 后的参数副本。
- 最后一行单独说明主 RL 损失仍训练 target、embedding 和 LM head，不能把“CE 被挡住”误读成这些表完全不训练。

### 公式与符号

$$g^{\mathrm{CE}}_{\theta_{\mathrm{shared}}}=0,\qquad g^{\mathrm{CE}}_{\theta_{\mathrm{MTP}}}\ \text{正常计算}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $\theta_{\mathrm{shared}}$ | target 主干、embedding 和 LM head 的共享参数 | 第 2、3、5 步 |
| $\theta_{\mathrm{MTP}}$ | draft 自带 MTP 层的参数 | 第 1 步 |
| $g^{\mathrm{CE}}_{\theta}$ | 辅助 CE 对参数 $\theta$ 的梯度 | 本步反向路径 |

### 代入图上的数

本步不构造梯度数值。左式表示辅助 CE 对共享参数的梯度被这条分支切为 0；右式表示 MTP 参数的梯度路径保留，并不保证每个位置都得到非零值。主 RL 损失的梯度是另一条路径，不在左式里。

实现先对 embedding 输出和 target hidden state 做 detach，再用 `functional_call` 调用共享 LM head，并传入 detach 后的参数。MTP 自己的 hidden 输出没有 detach，所以 CE 仍能回到 MTP 层。

### 接下来

下一步用 loss mask 决定哪些位置计入 CE，避免没有两个有效后续 token 的位置教错 draft。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:58-60,184-234`；`THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a` 的 `docker/patch/latest/megatron.patch:170-179,596-603`。
