## 第 1 步 · 每次听写换一个新标签

> **一句话：** 每次成功开始的听写都有新的 session ID，这次的工作因此有了共同的身份标记。

### 图上是什么

- 画面按顺序形成：先出现第 1 次听写，再出现它的标签 `session ID = A`，再出现它的结果；随后是第 2 次听写、`session ID = B` 和第 2 次的结果，最后出现 `A ≠ B`。
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

- 蓝色的 A 标签按顺序走过六站；标签走到哪一站，哪一站才带着名字和产物出现并留下，没有一站换新标签。
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

## 第 3 步 · 晚到的 A 不写进 B

> **一句话：** 晚到的 A 显示在自己的结果小窗并保存下来，不写进 B 这次的结果。

### 图上是什么

- 时间顺序：A 先开始，B 后开始；A 正在整理文字，结果稍后才到。
- 第一行：`A ≠ B`，A 不写进 B。A 显示在自己的结果小窗，并存进保存记录。
- 第二行：`B = B`，B 写进自己这次的结果。
- 两行右侧都是 B 这次的结果。你可选结果小窗；打字位置贴不进去时，文字也留在结果小窗。
- 本例整理成功，并开启保存记录。「保存记录」就是以后能查看的历史。

### 检查规则

$$
\operatorname{write}(r,c) \iff r=c
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $r$ | 带来这次结果的 `run`，也就是一次听写的运行对象 | 结果所属的 session |
| $c$ | 此刻掌管这次结果的 `run` | 本步中是 B |
| $\operatorname{write}(r,c)$ | 结果能否更新 B 这次的结果 | 当前路径的身份检查 |

这里的等号表示「同一个 `run`」，不是只比较结果上附着的字符串。

### 代入图上的数

| 结果的 $r$ | 当前的 $c$ | 是否相同 | B 这次的结果 |
|---|---|---|---|
| A | B | 否 | 不写入 A |
| B | B | 是 | 写入 B |

A、B 仍是教学代称。图中没有耗时或性能数字，先后箭头只表示构造的到达顺序。

### 源码里的检查

「B 这次的结果」是当前 session 结果的教学叫法，对应前台 snapshot。`Manager.update` 收到结果所属的 `run` 后，当前路径要求 `m.cur == r` 且这个 `run` 尚未结束，才更新并发布前台 snapshot；否则返回 `false`，不改 B 这次的结果。`Manager.end` 也做当前或后台身份检查。

正在整理文字的 A 可以通过 `Background` 登记为后台运行。此后它更新自己的 `r.own` 并走 `backgroundPub`，不是 B 的前台 snapshot；历史也使用 A 自己的 `run` ID。图中 A 沿用第 2 步的成功、整理和历史前提，所以晚到的 A 显示在自己的结果小窗并保存下来，并非被丢弃。

### 接下来

把取消放进同一条路线：A 被取消后，迟到的识别或整理结果在哪里停下？

### 源码出处

公开基线：`sglang-omni@48ee40b2563492de95efc952a0c7470db087d8a9`，路径均相对该仓库。

- 新 session 成为当前 `run`：`Voxt/internal/session/manager.go:193-235`。
- 当前与后台运行的登记：`Voxt/internal/session/manager.go:238-253`。
- `Manager.update` 的身份、结束检查和两条发布路径：`Voxt/internal/session/manager.go:341-375`。
- `Manager.end` 的同类检查：`Voxt/internal/session/manager.go:378-417`。
- 历史使用本次 `run` 的 ID：`Voxt/internal/session/run.go:446-460`。

## 第 4 步 · 取消后，晚到的结果停下

> **一句话：** A 识别或整理时被取消，晚到的结果不会显示在打字位置或结果小窗；本例保存记录中的 A 是已取消，结果文字为空。

### 图上是什么

- 你取消 A：本步只讲识别或整理时的取消。
- 左边两个框是两种可分别发生的情况，不要求同时发生：识别结果晚到，或整理结果晚到。
- 中间红框：A 已取消，晚到的结果在这里停下。
- 右侧：打字位置和结果小窗都没有晚到的 A 结果。
- 保存记录：A 的状态是已取消，`Result`（最终结果字段）为空。本例开启历史，录音长度也达到保存条件。

### 取消后的结果

$$
C_A=\mathrm{true}\quad\Longrightarrow\quad D_A=\mathrm{stopped},\qquad R_A=\mathrm{empty}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $C_A$ | A 的取消标记 | `Manager.Cancel` 设置 `r.cancelled` |
| $D_A$ | 晚到结果的交付 | 识别或整理返回后的取消检查 |
| $R_A$ | 保存记录里的 `Result` | 取消结束时的 snapshot |
| $\mathrm{stopped}$ | 不插入文字，也不把结果显示在结果小窗 | 本步要说明的去向 |
| $\mathrm{empty}$ | 空字符串，不是识别原话也为空 | 本例尚未交付最终结果 |

### 代入图上的两种情况

| 晚到的是什么 | 返回后先检查什么 | 显示 A 的最终结果 | 保存的 `Result` |
|---|---|---|---|
| 识别出的「嗯，你好」 | `r.cancelled` | 否 | 空 |
| 整理出的「你好！」 | `r.cancelled` | 否 | 空 |

图中没有耗时或性能数字。两种文字都是构造例子，用来说明识别和整理两条路都先检查取消状态。

### 源码里的两道检查

`Manager.Cancel` 找到仍在运行的 A 后，设置 `r.cancelled`，再取消它的 context。识别返回后，`run.listen` 先检查这个标记；已取消就调用 `endCancelled` 并返回，不继续写入识别原话或进入整理。整理返回后，`transcribe` 也先检查同一标记；已取消就结束，不把整理结果交给 `finish` 交付。

`endCancelled` 通过 `Manager.end` 把状态设为 `Cancelled`。开启历史且录音达到最小长度时，`keep` 写入状态为 `cancelled` 的记录。记录里的 `Result` 来自取消时的 snapshot，本例为空；如果取消发生在整理阶段，`RawText` 可以保留此前识别出的原话，所以「结果文字为空」不等于「识别原话也为空」。录音是否保留及其期限不在这步展开。

### 接下来

第 2 步的 helper 接收按键。取消键怎样到达 helper，权限又在哪些地方检查？

### 源码出处

公开基线：`sglang-omni@48ee40b2563492de95efc952a0c7470db087d8a9`，路径均相对该仓库。

- 取消仍在运行的当前或后台 session：`Voxt/internal/session/manager.go:256-289`。
- 识别返回后的取消检查，位于写入识别原话之前：`Voxt/internal/session/run_listen.go:397-417`。
- 整理返回后的取消检查，位于交付之前：`Voxt/internal/session/cleanup.go:35-77`。
- 取消结束、最小录音长度与历史写入：`Voxt/internal/session/run.go:398-414,446-460,510-529`。
- 测试覆盖录音、识别和整理时取消，不粘贴文字；够长的录音留下已取消记录，过短则不留：`Voxt/internal/session/session_test.go:294-344`。
