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

## 第 2 步 · 把标签放上完整路线

> **一句话：** 在开启整理和历史的一次成功 Transcribe（把说话整理成文字）中，快捷键启动 session A，这句话再经过 helper、识别、整理、交付和历史。

### 图上是什么

- 你按一下：一次按键启动这次听写，对应源码里的 hotkey。
- helper：把按键事件和麦克风声音送进 app 的辅助程序，所以它在「声音 → 文字」之前。
- 声音 → 文字：语音识别把声音变成原话，例如「嗯，你好」。
- 整理文字：图中的「嗯，你好 → 你好」是一个构造例子，表示去掉口头停顿；实际输出由语言和整理设置决定，不保证固定删成这几个字。
- 看到文字：结果可以出现在你输入文字的光标处，也可以留在答案卡，也就是图上的「结果小窗」。你可以选择答案卡；无法插入时也会使用它。
- 保存文字：历史记录同时保存识别原话 `RawText` 和整理结果 `Result`；图中没有展开录音等其他字段。
- 蓝色 A：第 1 步的 session ID。快捷键启动后，同一次听写的各站都使用这个身份；不是每站换一个新标签。

### 路线与符号

$$
K \rightarrow P \rightarrow R \rightarrow C \rightarrow D \rightarrow S
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $K$ | 一次快捷键输入 | 本步构造的一次听写 |
| $P$ | helper 这一站 | 公开架构中的 Swift helper |
| $R$ | 语音识别这一站 | `run.listen` 返回识别文字 |
| $C$ | 整理这一站 | Transcribe 的文字整理路径 |
| $D$ | 交付这一站 | 光标处插入或答案卡 |
| $S$ | 历史这一站 | 结束时由 `keep` 写入的一条记录，含原话和整理结果 |

### 代入图上的数

这张图没有耗时或性能数字，也不表示各站耗时相同。A 沿用第 1 步的教学代称；真实 session ID 仍是程序生成的字符串。

### 本步省略了什么

本步只画开启整理和历史的成功 Transcribe。整理关闭、被跳过或失败时，Transcribe 可以沿用识别原文；交付失败时，文字可以留在答案卡。权限、麦克风内部、识别服务和迟到结果的检查留给后续步骤。

### 接下来

沿着这条路线检查：旧 session 的结果迟到时，哪道检查阻止它写进新 session 的当前卡片？

### 源码出处

公开基线：`sglang-omni@14014b833299c6158a5daa88e1e0740cf7efe606`，路径均相对该仓库。

- helper 进程及按键、采集、文字输入职责：`Voxt/docs/architecture.md:226-239`。
- 从快捷键到识别、整理、交付和历史的完整路线：`Voxt/docs/architecture.md:245-277`。
- 快捷键启动后创建带新 ID 的 `run`：`Voxt/internal/session/manager.go:193-235`。
- `run.main` 串起录音、识别、整理与交付：`Voxt/internal/session/run.go:174-176,235-258`。
- 历史记录使用本次 `run` 的 ID，交付记录区分插入和答案卡：`Voxt/internal/session/run.go:446-460,476-484`。
