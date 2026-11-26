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
