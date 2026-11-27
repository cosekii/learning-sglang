## 第 1 步 · 用一个 Sample 保存完整交互

**一句话。** 第二次模型调用需要第一个动作和工具观察，所以一个 `Sample` 按顺序保存全部 12 个响应 token。

### 图上是什么

- `P` 是 2 个 prompt token。`A` 是模型第一个动作的 4 个 token，`B` 是后续动作的 5 个 token。
- `O` 是工具观察编码后的 3 个 token。动作是模型发给工具的指令；`O` 包含完整观察增量，若有生成标记也计在这 3 个里面。
- 左侧虚线卡故意只给第二次调用 2 个 `P` 方块，7 个橙色虚线方块标出缺少的 `A + O` 上下文。它不表示拆开存储必然丢失上下文。
- 右侧蓝卡按本实现把完整交互保存在一个 `Sample`。`A` 和 `O` 方块先在第二次调用前加入 `P`，随后再追加 5 个 `B` 方块，写入新动作。

### 公式与符号

$$C_2=p+a+o,\qquad N_{\text{response}}=a+o+b,\qquad N_{\text{missing}}=a+o$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P,A,O,B$ | prompt、第一个动作、观察和后续动作的 token 片段 | 图上的构造片段 |
| $p,a,o,b$ | 这四个片段各自的 token 数 | 本步构造值，依次为 2、4、3、5 |
| $C_2$ | 第二次模型调用收到的 token 数 | 本步相加 |
| $N_{\text{response}}$ | 最终 `Sample` 的响应 token 数 | 本步相加 |
| $N_{\text{missing}}$ | 第二次调用只收到 `P` 时缺少的早期响应 token 数 | 本步相加 |

### 代入图上的数

$$C_2=2+4+3=9,\qquad N_{\text{response}}=4+3+5=12,\qquad N_{\text{missing}}=4+3=7$$

第二次调用的 9 个输入包含 2 个 prompt token。丢失的 7 个只计算响应上下文，不含 prompt。12 个响应 token 也不含 prompt，所以这个构造例的 `Sample.tokens` 共有 $2+12=14$ 个 token。

### 接下来

记录已经保住先后顺序。下一步标出哪些响应 token 是模型写的、应该用于学习。

来源：`THUDM/slime@cd4a8efc6f8e33364a474cfa70875779ed0a673f` 的 `examples/search-r1/generate_with_search.py:145-158,180-200,209-232`；`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:309-350`。

## 第 2 步 · 给响应 token 标 loss mask

**一句话。** 模型动作标 1，工具观察标 0，所以 12 个响应 token 中只有 9 个参与训练。

### 图上是什么

- 响应仍按第 1 步的 `A → O → B` 排列。
- 蓝色动作方块 `A` 和 `B` 下方出现第二排蓝色 mask 1 方块，共 $4+5=9$ 个。
- 随后，3 个橙色观察方块 `O` 下方出现橙色 mask 0 方块。
- 最后的训练卡按响应顺序集齐 12 个 mask 方块。mask 为 0 不会删除 `O`：下次模型调用仍读到它，只是训练不为这些位置计算学习损失。

### 公式与符号

$$N_{\text{learn}}=\sum_i m_i,\qquad N_{\text{response}}=N_{\text{learn}}+N_{\text{skip}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $i$ | 响应序列中的一个位置 | 第 1 步的 `A → O → B` |
| $m_i$ | 位置 $i$ 的 loss mask；动作是 1，观察是 0 | 本步 |
| $N_{\text{learn}}$ | mask 为 1 的响应 token 数 | 本步求和 |
| $N_{\text{skip}}$ | mask 为 0 的观察 token 数 | 本步求和 |
| $N_{\text{response}}$ | 完整响应的 token 数 | 第 1 步，12 |

### 代入图上的数

$$N_{\text{learn}}=4+5=9,\qquad N_{\text{skip}}=3,\qquad N_{\text{response}}=9+3=12$$

mask 与响应位置一一对齐：`[1,1,1,1, 0,0,0, 1,1,1,1,1]`。观察位置的 log probability 可填 0，因为 mask 为 0 时不使用它。

### 接下来

文本观察要追加到已有 token 后面。下一步处理 chat template 自动重复添加的前缀。

来源：`THUDM/slime@cd4a8efc6f8e33364a474cfa70875779ed0a673f` 的 `examples/search-r1/generate_with_search.py:180-200,209-232`；`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:309-350`。

## 第 3 步 · 只追加观察 delta

**一句话。** 用空观察模板的长度裁掉完整编码的前缀，只把 3 个观察 delta token 加进 `Sample.tokens`。

### 图上是什么

- `chat template` 把带角色的消息变成模型使用的 token，会添加角色和生成标记。
- 第一张卡编码固定的 dummy messages，得到 6 个橙色前缀方块。dummy messages 是不含本轮观察的模板消息。
- 第二张卡编码同样的消息、本轮观察和 `assistant generation prompt`。这个提示是模板加在观察后、要求模型生成下一条助手回复的 token。本构造例共有 9 个 token。
- 第三张卡从下标 6 开始切片。6 个前缀方块留下，只有 3 个蓝色 `Δ` 方块加入 `Sample.tokens`。
- `Δ` 是完整的观察增量，包含观察内容和 assistant generation prompt。前后步骤把这个完整 `Δ` 叫作 `O`。

### 公式与符号

$$\Delta=F[\ell:],\qquad \ell=|\operatorname{enc}(U)|$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $U$ | 不含本轮观察和 assistant generation prompt 的 dummy messages | 本步 |
| $\operatorname{enc}(U)$ | dummy messages 的 token 序列 | 本步构造为 6 个 |
| $\ell$ | 要裁掉的前缀 token 数 | $\operatorname{enc}(U)$ 的长度 |
| $F$ | dummy messages、观察内容和 assistant generation prompt 的完整 token 序列 | 本步构造为 9 个 |
| $\Delta$ | 实际追加的完整观察 delta | 从 $F$ 的第 $\ell$ 个下标开始切片 |

### 代入图上的数

$$\ell=|\operatorname{enc}(U)|=6,\qquad \Delta=F[6:],\qquad 9-6=3$$

切片保留下标 6、7、8 的三个 `Δ`，覆盖观察内容和 assistant generation prompt。这个提示是 `O` 的一部分，不是额外第 4 个 token。真实实现当场计算 $\ell$ 并切片，不把 6 写成固定值，也不额外检查 dummy 编码是否真的是完整编码的前缀。本图按它们的共同前缀构造例子。

### 接下来

观察也可以带图片。下一步把同一图片的 rollout 输入与训练输入分开跟踪。

来源：`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:54-107`。

## 第 4 步 · 图片沿两条路径进入记录

**一句话。** 同一张观察图片既追加到 rollout 的图片列表，也让 processor 产生一份训练张量。

### 图上是什么

- 本步扩展前面的例子：初始 VLM 输入带 1 张图片，本轮观察再带来 1 张 `O` 图片图标。
- rollout 分叉把初始图片和观察图片复制到 rollout 路径，下一次模型调用收到 `image_data` 里的两张编码图片。
- 第二个分叉把观察复制到训练路径。buffer `Q` 保存两本 processor 张量字典：`D0` 对应初始输入，`D1` 对应观察。
- `processor` 把图片和文字整理成模型输入。每份输入包是一个字典：字段名指向 `tensor`，也就是模型使用的数字网格。
- `D0` 和 `D1` 都排除 processor 的 `input_ids` 和 `attention_mask` 字段。`input_ids` 保存 token ID，`attention_mask` 标出真实位置而不是 padding。第 3 步已把 `O` 单独存入有序 token 记录，所以 `Q` 只保留其他多模态张量。

### 公式与符号

$I=I_0+I_1,\qquad Q=[D_0,D_1]$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $I_0$ | 初始图片数 | 本步构造值，1 |
| $I_1$ | 本轮观察图片数 | 本步构造值，1 |
| $I$ | 下一次 rollout 调用可见的图片数 | 本步相加 |
| $D_0$ | 初始输入的 processor 张量字典 | 本步 |
| $D_1$ | 观察输入的 processor 张量字典 | 本步 |
| $Q$ | 等待合并的训练张量 buffer | 本步按轮追加 |

### 代入图上的数

$$I=1+1=2,\qquad Q=[D_0,D_1]$$

rollout 保留下一次调用要读的两张图片；训练 buffer 保留两份张量字典。它们服务两个消费者，不能用其中一份替代另一份。

### 接下来

训练希望得到合并后的张量。下一步按字典 key 收集，再做一次拼接。

来源：`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:90-112,250-280,341-359`。

## 第 5 步 · 先存片段，再拼接一次

**一句话。** 先保存各轮张量，再对每个 key 拼接一次，避免重复复制旧行。这不能证明峰值显存更低。

### 图上是什么

- 初始张量 `T0` 和观察张量 `T1` 共有 key `k`，也就是字典 `D0` 和 `D1` 里指向同类张量的字段名。
- 前两张卡使用同一刻度。每张先有 2 行和 1 行橙色输入，再出现 3 行蓝色输出。
- 左卡是对照做法：每轮都拼接，现在复制 3 行，下一轮又复制这 3 行旧数据。下一轮和它的新片段没有画出。
- 中卡是 pinned 实现：先存片段，再把 3 行复制到输出一次。
- 右卡适用于两种做法。`torch.cat` 写输出时，两个输入片段和输出同时保留，共 $2+1+3=6$ 行。这里数的是构造行数，不是字节测量。
- 非张量字段不参与合并；同一个 key 的值不全是张量时也不生成合并值。

### 公式与符号

$$X_k=\operatorname{cat}([T_{0,k},T_{1,k}],\ dim=0),\qquad r_k=r_{0,k}+r_{1,k}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $k$ | 两个字典共有的构造字段名 | 第 4 步的输入包 |
| $T_{0,k}$ | 初始字典中 key $k$ 的张量 | 第 4 步的 $D_0$ |
| $T_{1,k}$ | 观察字典中 key $k$ 的张量 | 第 4 步的 $D_1$ |
| $X_k$ | 合并后的张量 | 本步一次 `torch.cat` |
| $r_{0,k},r_{1,k}$ | 两段张量第 0 维的行数 | 本步构造值，2 和 1 |
| $r_k$ | 合并后第 0 维的行数 | 本步相加 |

### 代入图上的数

$$r_k=2+1=3$$

每轮都拼接，现在复制 3 行，下一轮又复制这 3 行旧数据。先存片段只复制 3 行一次。两种做法在这次拼接时都保留 $2+1+3=6$ 行输入和输出。

实现先形成 `k → [T0, T1]`，再执行一次 `torch.cat([T0, T1], dim=0)`。文章用减少重复分配和复制解释这个选择。最终输入片段仍与输出同时保留，本步也没有字节或峰值显存测量，所以只说减少重复复制，不说峰值下降。

### 接下来

所有上下文与多模态输入都已收好。下一步检查哪些条件会结束这条交互轨迹。

来源：`Awesome-ML-SYS-Tutorial/rlhf/slime/vlm-multi-turn/readme.md` 附录「多轮 `multimodal_train_inputs` 的处理」；<code>THUDM/<wbr>slime@<wbr>f68dc4a25f362fc0335165a17ff976f5b6f675e1</code> 的 `examples/geo3k_vlm_multi_turn/rollout.py:115-138,300-306`。

## 第 6 步 · 三个停止出口

**一句话。** 最大轮数和环境完成标记为 `COMPLETED`，token 预算耗尽标记为 `TRUNCATED`。

### 图上是什么

- 三张卡是三个独立的构造运行，不是同一次运行连续经过的三个状态。红框标出正在播放的示例，不是同一条轨迹的游标。
- 最大轮数示例在第 2 轮后出现蓝色 `COMPLETED` 标签。
- 预算示例减去全部 12 个 token，出现橙色 `TRUNCATED` 标签，表示这条轨迹被长度限制截断。
- 环境示例返回 `done=True`，出现蓝色 `COMPLETED` 标签，不再追加这次观察。
- 推理返回 `finish=length` 也会截断；`abort` 表示被取消。这两个出口没有在卡片上展开。

### 公式与符号

$$b_{\text{next}}=b-n,\qquad b_{\text{next}}\le 0\Rightarrow \text{TRUNCATED}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $b$ | 当前剩余 token 预算 | 本步构造值，12 |
| $n$ | 从预算初始化后累计消耗的动作和观察 token 数 | 第 1 步，合计 12 |
| $b_{\text{next}}$ | 追加后的剩余预算 | 本步相减 |
| `max_turns` | 允许的最大交互轮数 | 本步构造值，2 |
| `done` | 环境决定是否结束的布尔值 | 本步环境接口 |

### 代入图上的数

$$b_{\text{next}}=12-(4+3+5)=0\Rightarrow\text{TRUNCATED}$$

这是预算出口的构造例。若走最大轮数出口，则第 2 轮结束后为 `COMPLETED`；若环境先返回 `done=True`，也在追加观察前以 `COMPLETED` 停止。三种情形不能混成同一次运行的结果。

### 接下来

停止规则属于交互管理，不属于单次 token 生成。下一步改用 verl 的 `ToolAgentLoop`；它有自己的长度、轮数、无工具调用和工具错误停止规则，不沿用本步 slime 的状态名。

来源：`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:283-290,320-366`。

## 第 7 步 · ToolAgentLoop 管交互，server 管生成

**一句话。** 本步改用 verl：`ToolAgentLoop` 决定何时调用模型和工具，`server_manager.generate` 只接收 token 并返回动作 token。

### 图上是什么

- 蓝色 `ToolAgentLoop` 把累积 `prompt_ids` `P` 和同一个 `request_id` `u` 交给 server manager。
- 橙色 server manager 返回 4 个 `A` 方块，不解析或选择工具。
- 控制权回到 `ToolAgentLoop`：当动作 `A` 含有效工具调用时，出现 4 个蓝色 mask 1 方块，`ToolAgentLoop` 调用工具。
- 工具或环境返回 3 个橙色 `O` 方块，此时还没标 mask。返回箭头先回到 `ToolAgentLoop`，不是直接回到 server。
- 图中再次循环需要三个条件：工具调用有效、`O` 有余量、轮数未满。满足时，`ToolAgentLoop` 追加 `O` 并标 mask 0，第一张卡显示 `P+A+O` 带着同一个 `u` 进入下一次模型调用。任一停止条件成立都会改为结束循环。

### 公式与符号

$$A=G(u,P),\qquad O=\operatorname{tool}(A),\qquad P'=P+A+O$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $u$ | 本次交互共用的 `request_id` | 本步 `ToolAgentLoop.run` |
| $P$ | 当前模型调用累积的 `prompt_ids` | 第 1 步的 prompt 序列，再追加先前片段 |
| $G$ | server manager 的 token 生成调用 | 本步 |
| $A$ | 模型返回的动作 token | 第 1 步，4 个 |
| $\operatorname{tool}$ | 解析动作并执行工具的环境路径 | 本步 |
| $O$ | 完整的工具观察 delta | 第 3 步，3 个 |
| $P'$ | 下一次模型调用的累积输入 | 本步相加 |

### 代入图上的数

$$P'=P+A+O,\qquad |A|=4,\quad |O|=3$$

server 只看到输入 token 和采样参数。`ToolAgentLoop` 保有工具状态、停止规则和 mask。图中走的是工具有效、有余量追加 `O` 且轮数未满的路径；没有工具调用、工具返回错误或达到限制时，verl 会停止。第二次模型调用仍使用同一个 `request_id`。

### 接下来

不同任务的交互轮数不同，响应长度也不同。下一步把这些响应对齐成训练 batch。

来源：`verl-project/verl@c5b189a1af496d0bc68320cd1d5bd7a1f1e3638a` 的 `verl/experimental/agent_loop/tool_agent_loop.py:59-133` 和 `agent_loop.py:43-105`。

## 第 8 步 · 右侧 padding 对齐训练 batch

**一句话。** 配置的 `response_length` 是 12，样本 S2 的 7 个响应 token 右侧补 5 格，两种 mask 都排除 padding。

### 图上是什么

- 本例把 `actor_rollout_ref.rollout.response_length` 配置为 12，不是从当前 batch 的最长响应临时决定。
- 第一张卡里，样本 S1 这一行有 12 个蓝色真实响应方块，已经符合配置宽度。
- 样本 S2 这一行先有 4 个蓝色 `A` 方块和 3 个蓝色 `O` 方块，随后右侧补进 5 个橙色 padding 方块，凑成 12 格。
- response mask 卡给 4 个动作标 1，给 3 个观察和 5 个 padding 标 0。观察和 padding 都不参与学习。
- 响应 `attention_mask` 卡给 7 个真实响应标 1，给 padding 标 0。本步不展开其他 batch 字段。

### 公式与符号

$$M=M_{\text{raw}}\odot Z$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $M_{\text{raw}}$ | 右侧 padding 后的原始 response mask | 第 2 步的动作 1、观察 0 |
| $Z$ | 12 格响应 attention mask；真实响应为 1，padding 为 0 | 本步 |
| $M$ | 最终 response mask | 逐元素相乘 |
| $\odot$ | 对应位置逐元素相乘 | 本步定义 |

### 代入图上的数

这个代入例假设 tokenizer 的 pad ID 是 0。pinned 实现先用这个 ID 填充原始 response mask，再逐元素相乘。如果 pad ID 不是 0，原始 mask 的 padding 格就是这个 ID；因为这里 $Z=0$，最终 padding 的 mask 仍然是 0。

S2 的原始 response mask 为 `[1,1,1,1,0,0,0,0,0,0,0,0]`，响应 attention mask 为 `[1,1,1,1,1,1,1,0,0,0,0,0]`。逐元素相乘后，观察与 padding 的 response mask 都是 0。

样本 S2 的宽度来自配置：$7+5=12$。如果换一条更长的响应，也不能超出这个配置；pinned 实现先按 `response_length` 截断，再 padding。padding 只让张量形状对齐，不增加交互内容。

### 接下来

一个 batch 现在能装下不同长度的轨迹。本章不测量模型生成、工具执行和训练的等待。

来源：<code>verl-project/<wbr>verl@<wbr>c5b189a1af496d0bc68320cd1d5bd7a1f1e3638a</code> 的 <code>verl/<wbr>experimental/<wbr>agent_loop/<wbr>agent_loop.py:321-385</code> 和 `tool_agent_loop.py:124-131`。
