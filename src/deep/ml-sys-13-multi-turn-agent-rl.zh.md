## 第 1 步 · 用一个 Sample 保存完整交互

**一句话。** 第二次模型调用需要第一个动作和工具观察，所以一个 `Sample` 按顺序保存全部 12 个响应 token。

### 图上是什么

- `P` 是 2 个 prompt token。`A` 是模型第一个动作的 4 个 token，`B` 是后续动作的 5 个 token。
- `O` 是工具返回的 3 个观察 token。动作是模型发给工具的指令，观察是工具的回复。
- 左侧虚线卡把片段拆成独立记录，第二次模型调用因此读不到 `A` 和 `O`。
- 右侧蓝卡只保留一个 `Sample`。第二次调用读取 `P + A + O`，再写入新动作 `B`。

### 公式与符号

$$C_2=P+A_1+O_1,\qquad R=A_1+O_1+A_2,\qquad D=A_1+O_1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | prompt token 数 | 本步构造值，2 |
| $A_1$ | 第一个模型动作的片段长度 | 本步构造值，4 |
| $O_1$ | 工具观察的片段长度 | 本步构造值，3 |
| $A_2$ | 后续模型动作的片段长度 | 本步构造值，5 |
| $C_2$ | 第二次模型调用收到的 token 数 | 本步相加 |
| $R$ | 最终 `Sample` 的响应 token 数 | 本步相加 |
| $D$ | 拆开记录会丢失的早期响应 token 数 | 本步相加 |

### 代入图上的数

$$C_2=2+4+3=9,\qquad R=4+3+5=12,\qquad D=4+3=7$$

第二次调用的 9 个输入包含 2 个 prompt token。丢失的 7 个只计算响应上下文，不含 prompt。12 个响应 token 也不含 prompt，所以这个构造例的 `Sample.tokens` 共有 $2+12=14$ 个 token。

### 接下来

记录已经保住先后顺序。下一步标出哪些响应 token 是模型写的、应该用于学习。

来源：`THUDM/slime@cd4a8efc6f8e33364a474cfa70875779ed0a673f` 的 `examples/search-r1/generate_with_search.py:145-158,180-200,209-232`；`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:309-350`。

## 第 2 步 · 给响应 token 标 loss mask

**一句话。** 模型动作标 1，工具观察标 0，所以 12 个响应 token 中只有 9 个参与训练。

### 图上是什么

- 响应仍按第 1 步的 `A → O → B` 排列。
- 蓝色动作片段 `A` 和 `B` 的 mask 都是 1，共 $4+5=9$ 个。
- 橙色观察片段 `O` 的 mask 都是 0，共 3 个。
- mask 为 0 不会删除 `O`。下次模型调用仍读到它，只是训练不为这些位置计算学习损失。

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

**一句话。** 用空观察模板的长度裁掉完整编码的前缀，只把 3 个新观察 token 加进 `Sample.tokens`。

### 图上是什么

- 第一张卡编码固定的 dummy messages，得到 6 个前缀 token。dummy messages 是不含本轮观察的模板消息。
- 第二张卡编码同样的消息和本轮观察，本构造例共有 9 个 token。
- 第三张卡从下标 6 开始切片，只保留 `O O O`。
- 这样不会每轮都重复追加 system 或工具说明前缀。

### 公式与符号

$$\Delta=F[\ell:],\qquad \ell=|E(D)|$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $D$ | 不含本轮观察的 dummy messages | 本步 |
| $E(D)$ | dummy messages 的 token 序列 | 本步构造为 6 个 |
| $\ell$ | 要裁掉的前缀 token 数 | $E(D)$ 的长度 |
| $F$ | dummy messages 加本轮观察的完整 token 序列 | 本步构造为 9 个 |
| $\Delta$ | 实际追加的观察 token | 从 $F$ 的第 $\ell$ 个下标开始切片 |

### 代入图上的数

$$\ell=6,\qquad \Delta=F[6:],\qquad 9-6=3$$

切片保留下标 6、7、8 的三个 `O`。真实实现当场计算 $\ell$，不把 6 写成固定值；这里的 6 和 9 只是便于检查切片的位置例。

### 接下来

观察也可以带图片。下一步把同一图片的 rollout 输入与训练输入分开跟踪。

来源：`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:54-107`。

## 第 4 步 · 图片沿两条路径进入记录

**一句话。** 同一张观察图片既追加到 rollout 的图片列表，也让 processor 产生一份训练张量。

### 图上是什么

- 初始输入已有 1 张图片，本轮观察再带来 1 张。
- rollout 路径把两张图片都编码进 `image_data`，下一次模型调用可以读取。
- 训练路径把初始与观察的 processor 输出分别放进 buffer，每份是一个字典。
- `processor` 把图片和文字整理成模型输入；`tensor` 是模型使用的一格一格数字。训练字典不保留 `input_ids` 和 `attention_mask`，token 已沿第 3 步的路径保存。

### 公式与符号

$$I=I_0+I_1,\qquad B=[T_0,T_1]$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $I_0$ | 初始图片数 | 本步构造值，1 |
| $I_1$ | 本轮观察图片数 | 本步构造值，1 |
| $I$ | 下一次 rollout 调用可见的图片数 | 本步相加 |
| $T_0$ | 初始输入的 processor 张量字典 | 本步 |
| $T_1$ | 观察输入的 processor 张量字典 | 本步 |
| $B$ | 等待合并的训练张量 buffer | 本步按轮追加 |

### 代入图上的数

$$I=1+1=2,\qquad B=[T_0,T_1]$$

rollout 保留下一次调用要读的两张图片；训练 buffer 保留两份张量字典。它们服务两个消费者，不能用其中一份替代另一份。

### 接下来

训练希望得到合并后的张量。下一步按字典 key 收集，再做一次拼接。

来源：`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:90-112,250-280,341-359`。

## 第 5 步 · 每个 key 拼接一次

**一句话。** 先按 key 收集各轮张量，再对每个 key 做一次 `torch.cat`，本例得到 3 行。

### 图上是什么

- 初始片段 `T0` 和观察片段 `T1` 都有构造 key `k`。
- `k` 下的两张表分别有 2 行和 1 行。
- 合并时沿第 0 维拼接，也就是把第二段接到第一段后面。
- 最终训练输入的 `k` 有 3 行。非张量字段不参与合并；同一个 key 的值不全是张量时也不生成合并值。

### 公式与符号

$$C_k=\operatorname{cat}([T_{0,k},T_{1,k}],\ dim=0),\qquad R_k=R_{0,k}+R_{1,k}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $k$ | 两个字典共有的构造 key | 本步 |
| $T_{0,k}$ | 初始字典中 key $k$ 的张量 | 第 4 步的 $T_0$ |
| $T_{1,k}$ | 观察字典中 key $k$ 的张量 | 第 4 步的 $T_1$ |
| $C_k$ | 合并后的张量 | 本步一次 `torch.cat` |
| $R_{0,k},R_{1,k}$ | 两段张量第 0 维的行数 | 本步构造值，2 和 1 |
| $R_k$ | 合并后第 0 维的行数 | 本步相加 |

### 代入图上的数

$$R_k=2+1=3$$

先形成 `k → [T0, T1]`，再执行一次 `torch.cat([T0, T1], dim=0)`。两个输入片段仍按初始、观察的先后顺序排列。

### 接下来

所有上下文与多模态输入都已收好。下一步检查哪些条件会结束这条交互轨迹。

来源：`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:115-138,300-306`。

## 第 6 步 · 三个停止出口

**一句话。** 最大轮数和环境完成标记为 `COMPLETED`，token 预算耗尽标记为 `TRUNCATED`。

### 图上是什么

- 三张卡是备选出口，不是同一次运行连续经过的三个状态。
- 达到 `max_turns` 时，本轮收尾后停止，状态为 `COMPLETED`。
- 剩余 token 预算不大于 0 时停止，状态为 `TRUNCATED`，表示被长度限制截断。
- 环境返回 `done=True` 时停止，状态为 `COMPLETED`，不再追加这次观察。
- 推理返回 `finish=length` 也会截断；`abort` 表示被取消。这两个出口没有在卡片上展开。

### 公式与符号

$$b_{\text{next}}=b-n,\qquad b_{\text{next}}\le 0\Rightarrow \text{TRUNCATED}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $b$ | 当前剩余 token 预算 | 本步构造值，12 |
| $n$ | 刚追加的动作或观察 token 数 | 第 1 步，合计 12 |
| $b_{\text{next}}$ | 追加后的剩余预算 | 本步相减 |
| `max_turns` | 允许的最大交互轮数 | 本步构造值，2 |
| `done` | 环境决定是否结束的布尔值 | 本步环境接口 |

### 代入图上的数

$$b_{\text{next}}=12-(4+3+5)=0\Rightarrow\text{TRUNCATED}$$

这是预算出口的构造例。若走最大轮数出口，则第 2 轮结束后为 `COMPLETED`；若环境先返回 `done=True`，也在追加观察前以 `COMPLETED` 停止。三种情形不能混成同一次运行的结果。

### 接下来

停止规则属于交互管理，不属于单次 token 生成。下一步看 AgentLoop 怎样把这两件事拆开。

来源：`THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1` 的 `examples/geo3k_vlm_multi_turn/rollout.py:283-290,320-366`。

## 第 7 步 · AgentLoop 管交互，server 管生成

**一句话。** `ToolAgentLoop` 决定何时调用模型和工具，`server_manager.generate` 只接收 token 并返回动作 token。

### 图上是什么

- 蓝色 `ToolAgentLoop` 把累积 `prompt_ids` 和同一个 `request_id` 交给 server manager。
- 橙色 server manager 返回 `response_ids`，不解析或选择工具。
- 控制权回到 `ToolAgentLoop`：它解析动作 `A`，把动作追加到上下文并标 mask 1，然后调用工具。
- 工具或环境返回观察 `O`，由 `ToolAgentLoop` 追加并标 mask 0，再开始下一次模型调用。
- 相同 `request_id` 会复用之前的 server 选择，这叫 sticky session。

### 公式与符号

$$A=G(r,P),\qquad O=E(A),\qquad P'=P+A+O$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $r$ | 本次交互共用的 `request_id` | 本步 `ToolAgentLoop.run` |
| $P$ | 当前累积的 `prompt_ids` | 第 1 步 |
| $G$ | server manager 的 token 生成调用 | 本步 |
| $A$ | 模型返回的动作 token | 第 1 步，4 个 |
| $E$ | 解析动作并执行工具的环境路径 | 本步 |
| $O$ | 工具观察 token | 第 1 步，3 个 |
| $P'$ | 下一次模型调用的累积输入 | 本步相加 |

### 代入图上的数

$$P'=P+A+O,\qquad |A|=4,\quad |O|=3$$

server 只看到输入 token 和采样参数。`ToolAgentLoop` 保有工具状态、停止规则和 mask，第二次模型调用仍使用同一个 `request_id`。

### 接下来

不同任务的交互轮数不同，响应长度也不同。下一步把这些响应对齐成训练 batch。

来源：`verl-project/verl@c5b189a1af496d0bc68320cd1d5bd7a1f1e3638a` 的 `verl/experimental/agent_loop/tool_agent_loop.py:59-133` 和 `agent_loop.py:43-105`。
