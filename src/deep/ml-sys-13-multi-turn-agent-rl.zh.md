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
