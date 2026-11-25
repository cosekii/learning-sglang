## 第 1 步 · 按键变成一条消息

> **一句话：** 默认右 Option 被 Swift helper 认出后，变成一行 `hotkey.event` JSON 消息；Go app 在没有听写运行时把它路由为开始 Transcribe。

### 图上是什么

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
