## 第 1 步 · 按键变成一条消息

> **一句话：** 默认右 Option 被 Swift helper 认出后，变成一行 `hotkey.event` JSON 消息；Go app 在没有听写运行时把它路由为开始 Transcribe。

### 图上是什么

- 画面分相形成：先出现按键，再是 helper，再是消息框；三个字段逐行到达，最后 Go app 开始。
- 你按一下 `Right ⌥`：右 Option，默认的 Transcribe 快捷键。左 Option 不匹配这个默认绑定。
- Swift helper：听按键的辅助程序。它认出这次点击，不在这步采集声音。
- 一条 JSON 消息：JSON 给每项信息附上名字和对应内容。图里分三行读出三个字段，右边配上大白话，实际传输仍是一行；蓝色框和箭头表示消息从 helper 到 Go app。
- `hotkey.event`：`method` 字段的值，说明这是一条快捷键消息。
- `transcribe/0`：`binding` 字段的值，表示 Transcribe 的第 1 个绑定，编号是 0，也就是本例的默认听写键；程序从 0 开始给绑定编号。
- `trigger`：`phase` 字段的值，表示按一下这个动作已经发生，不是长按过程中的按下或松开。
- Go app：主程序。`Transcribe` 就是听写；本例此前没有听写运行，所以路由结果是 `Start Transcribe`。

### 对应关系

$$
K \xrightarrow{H} M \xrightarrow{R} A
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $K$ | 一次右 Option 点击 | 本步构造的输入 |
| $H$ | Swift helper 识别快捷键 | `HotkeyTap.decide` |
| $M$ | 一条 `hotkey.event` 消息 | helper 写往 app 的通知 |
| $R$ | Go app 的热键路由 | `hotkey.Route` |
| $A$ | 开始 Transcribe 的动作 | 空闲状态收到 `trigger` 后的路由结果 |

### 代入图上的数

1 次按键经过 2 个程序，形成 1 条快捷键消息，得到 1 个开始动作。这些数量来自本步构造的一次路线，不是性能测量，也不表示每次按键在任何状态下都会开始听写。

### 消息里还有什么

helper 每写一行 stdout，就发送一个 JSON 消息。`hotkey.event` 是通知：它报告一件事，不需要 app 回答。图上只抽出三个字段来讲路线；真实事件还带 `behavior`、helper 单调时钟里的 `t`，并可带 `heldMs`、前台 app 和配置 `generation`。公开 fixture 的一条同类型消息包含 `binding: transcribe/0`、`phase: trigger` 和 `behavior: tap`。

本步把权限视为已经可用，只画成功路线。没有权限时怎样重试、普通组合键怎样走 Carbon 备用路线，以及录音中再按一下为什么变成停止，都留给后续步骤。Go app 开始 Transcribe 后，session 进入 `Recording`，再向 helper 发 `capture.start` 采集麦克风。因此声音在开始动作之后进入，不在这行快捷键消息里。

### 接下来

helper 要能看见全局按键，需要 macOS 允许。下一步把权限检查和按键路线分开画。

### 源码出处

公开基线：`sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`，路径均相对该仓库。

- 默认 Transcribe 快捷键为 `RightOption`、触发方式为 tap：`Voxt/internal/settings/settings.go:357,379`；绑定 ID 的组成：`Voxt/internal/hotkey/hotkey.go:282,304`。
- helper 识别事件并发出 `hotkey.event`：`Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:240-250,269-274`。
- 一行一个 JSON、helper 到 app 走 stdout：`Voxt/docs/helper-protocol.md:9-13`；通知没有 `id`：同文件 `18-24`；事件字段：同文件 `88-97`。
- Go 事件结构：`Voxt/internal/helper/proto/hotkey.go:113-127`；app 接收通知：`Voxt/helperlink.go:140-152`。
- 空闲状态收到 `trigger` 后返回 `Start`：`Voxt/internal/hotkey/route.go:114-121`；对应测试：`Voxt/internal/hotkey/hotkey_test.go:419`。
- Transcribe 初始状态为 `Recording`：`Voxt/internal/session/run.go:192-202`；向 helper 发 `capture.start`：`Voxt/internal/session/helperio.go:20-35`。
- 同类型公开 fixture：`Voxt/helper/Fixtures/hotkey.jsonl:3`。

## 第 2 步 · Accessibility 决定按键路线能否开始

> **一句话：** Accessibility 是 Mac 的一项设置；未开启时 helper 收不到全局按键，开启并成功接收后，同一个右 Option 才能沿第 1 步的路线变成一条消息。

### 图上是什么

- 两幅图先只出现标题；左图再分相演示被拦下的路线：按键、Mac 设置、红叉、零条消息，随后右图演示消息送达的路线。
- 两幅图使用同一个 `Right ⌥ Option`，Go app 起初都空闲；只改变 Accessibility。
- Accessibility：Mac 的「辅助功能」权限。它允许 helper 看见你在其他 app 里按的键，不是麦克风权限。
- 左图 `OFF`：没有这项权限，helper 的全局按键监听没有装上，所以它看不见这次按键，发出 **0 条** `hotkey.event`，Go app 仍空闲。红色叉号表示这条路线断开。
- 右图 `ON`：本例中监听成功，helper 看见同一个按键，发出 **1 条** `hotkey.event`，Go app 按第 1 步的规则开始 Transcribe。蓝色箭头表示消息到达。
- 两幅图里的按键、Mac 设置和 helper 使用相同位置；灰色只用于普通框和按键箭头。

### 对应关系

$$
(M,G)=
\begin{cases}
(0,\mathrm{idle}), & A=\mathrm{off}\\
(1,\mathrm{start}), & A=\mathrm{on}
\end{cases}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $A$ | Accessibility 是否允许 | 本步唯一改变的设置 |
| $M$ | Go app 收到的 `hotkey.event` 数量 | helper 是否成功接收并识别这次按键 |
| $G$ | Go app 的路由结果 | 第 1 步的空闲状态路由规则 |

### 代入图上的数

| Accessibility | 同一个右 Option | $M$：到达 Go 的消息 | $G$：Go 的结果 |
|---|---|---:|---|
| OFF | 按 1 次 | 0 条 | 仍空闲 |
| ON，且监听成功 | 按 1 次 | 1 条 | 开始 Transcribe |

这些是本步构造的对照，不是权限申请成功率或性能测量。打开设置本身不会开始听写；仍要按一下快捷键。

### 源码里的检查与省略

helper 用 `AXIsProcessTrusted()` 读取 Accessibility 状态。macOS 把它归到 responsible process，也就是 `VoxtNew.app`，所以系统设置里显示的是 VoxtNew。没有权限或键盘事件被系统剔除时，helper 不认为监听已安装，会每 2 秒重试；允许后不用重启 helper。

本步只改变 Accessibility，并假设右图的其他条件都成功。Input Monitoring、其他权限、权限申请窗口和监听故障没有画。它们不能被这张图解释成「只要打开 Accessibility 就必然成功」。

### 接下来

快捷键消息已经能到达 Go app。下一步要看麦克风权限：它决定声音能否进入，与看见按键是另一项设置。

### 源码出处

公开基线：`sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`，路径均相对该仓库。

- Accessibility 状态读取及 responsible process 说明：`Voxt/helper/Sources/VoxtNewHelper/Permissions.swift:7-9,40-46`。
- 没有权限时不安装监听、每 2 秒重试，以及允许后无需重启：`Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:6-19,76-89,155-169`。
- 创建监听并核对实际收到的键盘事件：`Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:113-151`。
- 识别后发送 `hotkey.event`：`Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:240-250,269-274`。
- 空闲状态收到 `trigger` 后返回 `Start`：`Voxt/internal/hotkey/route.go:114-121`。

## 第 3 步 · 麦克风权限决定声音能否进入

> **一句话：** 两边在按键后发出同一个 `capture.start`；麦克风权限拒绝时 helper 返回错误，允许且输入设备正常时声音才送回 Go app。

### 图上是什么

- 两幅图先只出现标题；左图再分相演示被拒绝的请求，随后右图演示声音送回 Go app。
- 两幅图都保持 Accessibility 开启，所以 helper 能看见按键；这一步只改变麦克风权限。
- `capture.start`：Go app 发给 helper 的请求，意思是「请开始录音」。蓝色箭头表示请求从 Go app 到 helper。
- 左图麦克风权限未开启：Mac 挡住声音，helper 返回 `permission_denied`，意思是「权限被拒绝」；录音没有开始。
- 右图麦克风权限已开启，并假设麦克风能正常工作：声音经过 helper 送回 Go app，录音开始。
- 红色只表示权限阻断，蓝色只表示请求或声音路线接通。两图没有测量耗时，也没有采集真实声音。

### 对应关系

$$
R=\begin{cases}
\mathrm{permission\_denied}, & P=\mathrm{off}\\
\mathrm{recording}, & P=\mathrm{on}\ \land\ D=\mathrm{works}
\end{cases}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $P$ | 麦克风权限是否允许 | 本步唯一改变的权限设置 |
| $D$ | 输入设备能否正常工作 | 右图明确假设的条件 |
| $R$ | 同一个 `capture.start` 的结果 | helper 的权限检查与采集路线 |

### 代入图上的两种情况

| 按键后的请求 | $P$：麦克风权限 | $D$：输入设备 | $R$：结果 |
|---|---|---|---|
| `capture.start` | 未开启 | 不进入设备启动 | `permission_denied`，录音未开始 |
| `capture.start` | 已开启 | 正常工作 | 声音送到 Go app，录音开始 |

### 源码里的检查与省略

helper 用 `AVCaptureDevice.authorizationStatus(for: .audio)` 读取麦克风权限。若从未询问，系统先弹出选择并等待回答；本步左图构造的是已经拒绝或受限的情况，不把「尚未询问」画成立即失败。

权限通过后，helper 还要启动输入设备。设备不可用、没有声音回调或已有同类录音，可能产生别的错误；这些不在本步对照里。成功采集后，helper 用 `capture.started` 报告首个音频已到达，再用 `capture.pcm` 持续发送声音数据。主图把这些消息概括成「声音」，下一章再展开数据格式。

### 接下来

按键和声音分别通过两道权限门。下一章把连续的声音切成能搬运的数据块。

### 源码出处

公开基线：`sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`，路径均相对该仓库。

- 麦克风权限的四种状态：`Voxt/helper/Sources/VoxtNewHelper/Permissions.swift:11-18`；首次请求权限：同文件 `53-58`。
- `capture.start` 在创建采集任务前检查权限，拒绝时返回麦克风 `permission_denied`：`Voxt/helper/Sources/VoxtNewHelper/Capture.swift:53-79`。
- 请求方法、权限错误和未询问时等待回答：`Voxt/docs/helper-protocol.md:32-37,63,107`。
- 启动失败不会发送 `capture.started`：`Voxt/internal/helper/proto/capture.go:20-25`；首个音频与后续 `capture.pcm`：同文件 `56-72,82-90`。
- Go session 把麦克风权限错误归类为 `ProblemMicrophone`：`Voxt/internal/session/session.go:464-483`。
