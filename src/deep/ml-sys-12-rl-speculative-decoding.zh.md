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
