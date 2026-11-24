## 第 1 步 · 每次听写换一个新标签

> **一句话：** 每次成功开始的听写都有新的 session ID，这次的工作因此有了共同的身份标记。

### 图上是什么

- 两次听写：第 1 次和第 2 次。
- 两个蓝色标签：`session ID = A` 与 `session ID = B`。
- 两个结果框：第 1 次的结果跟 A，第 2 次的结果跟 B。
- `A ≠ B`：开始新一次听写时，不沿用上一次听写的 session ID。
- A、B 只是教学代称；真实 session ID 是程序生成的字符串。

### 对应关系

$$
D_1 \rightarrow S_A,\qquad D_2 \rightarrow S_B,\qquad S_A \neq S_B
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $D_1$ | 第 1 次听写 | 本步的构造例子 |
| $D_2$ | 第 2 次听写 | 本步的构造例子 |
| $S_A$ | 第 1 次听写的 session ID，图上简写为 A | 程序在这次听写开始时生成 |
| $S_B$ | 第 2 次听写的 session ID，图上简写为 B | 程序在这次听写开始时生成 |

### 代入图上的数

2 次听写对应 2 个不同的 session ID，所以图中有 2 个标签，不是 2 次共用一个标签。这里的 2 是为了看清对应关系而构造的教学数量，不是 app 的限制。

### 标签在源码里怎样工作

教学图把归属画成标签。源码还分两种传递方式：

- 录音 job 使用 session ID。
- ASR（语音识别）和 LLM（语言模型）的流式回调绑定各自的 `run`，也就是一次听写的运行对象。`Manager.update` 再检查这个 `run` 是否仍是当前的、或已登记的后台运行，并且尚未结束；不是只比较结果上的一个字符串。

正在整理文字的旧 session 可以登记为后台运行，继续写自己的卡片和历史，不写新 session 的当前卡片。因此，“旧结果一律丢弃”并不准确。后续步骤再画迟到结果的闸门，本步只建立“每次成功开始都换标签”这条规则。

### 接下来

把一次带标签的听写放上完整路线：按键、helper、语音识别、文字整理、交付和历史。

### 源码出处

公开基线：`sglang-omni@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`，路径均相对该仓库。

- 每次成功的 `Manager.Start` 调用 `NewID()` 并创建新 `run`：`Voxt/internal/session/manager.go:193-215`。
- 生产环境使用 `core.NewID(time.Now())`：`Voxt/session_link.go:232-237`；真实 ID 是 ULID 字符串：`Voxt/internal/core/ids.go:12-21`。
- ASR 回调与 `run` 的绑定：`Voxt/internal/session/run_audio.go:190-201`；LLM 回调：`Voxt/internal/session/cleanup.go:133-139,194-203`。
- `Manager.update` 的身份与结束检查：`Voxt/internal/session/manager.go:341-367`；后台运行的例外：`Voxt/internal/session/manager.go:238-253`。
