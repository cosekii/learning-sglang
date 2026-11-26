## 第 1 步 · 目的地是焦点的所属进程

> **一句话：** 文字去拥有焦点元素的那个进程；它可以是 start app、别的 app，或一个不在最前面的浮窗。

### 图上是什么

- 左边的框是 **start app**，按快捷键那一刻在前面的 app，也就是 `Request.Target`。
- 右边的框是 **focus owner**，拥有焦点元素的进程。这个所属进程就是目的地。
- `focus` 是打字会落下的框。一个浮窗可以在别的 app 在前时仍然拿着焦点。
- 底部两行说所属进程可以是 start app、别的 app，或一个浮窗；start app 不一定是目的地。

### 规则

`textio.focus` 返回焦点元素自己的进程 PID，不是最前面 app 的 PID。`deliver` 往那个进程贴。`PasteCheck.targetReached` 接受「在前面的 app」或「拥有焦点的 app」，所以非激活浮窗也能收到文字。

| 符号 | 含义 | 出处 |
|---|---|---|
| start app | 按快捷键时的前台 app；`Request.Target` | `Voxt/internal/deliver/deliver.go:97-98` |
| focus owner | 焦点元素自己进程的 PID | `Voxt/helper/Sources/VoxtNewHelper/TextIO.swift:63-82` |
| frontmost app | 不一定是焦点所属进程 | `TextIO.swift:63-65, 78-79` |
| `targetReached` | 目标在前面，或目标拥有焦点 | `Voxt/helper/Sources/VoxtNewHelperKit/PasteCheck.swift:84-88` |

### 为什么要分开

如果目的地只看最前面的 app，一个拿着焦点的浮窗就什么都收不到。读元素自己的进程，文字就跟焦点走，不跟窗口顺序走。

### 边界

start app 仍管三件事：读不出按可信、替换选区、自动按键。检查在第 2、3 步加上。

## 第 2 步 · 密码框让整件事停下

> **一句话：** 动键盘之前 helper 先读焦点；焦点是密码框就不贴。

### 图上是什么

- 焦点所属进程里有焦点的框画成密码圆点，旁边标着 subrole `AXSecureTextField`。
- 橙色结果是 STOP：一个字也不贴。
- 什么都不贴。该功能的卡片开着就打开答案卡；关着就由 app 复制结果，并显示一行提示。

### 检查

焦点元素的 subrole 是 `AXSecureTextField` 时，`Secure(f)` 为真。`check()` 里密码框检查排在可编辑检查前面：

$$\text{secure} \Rightarrow \text{ReasonSecure} \Rightarrow \text{不粘贴}$$

| 符号 | 含义 | 出处 |
|---|---|---|
| `AXSecureTextField` | 密码框的 subrole | `deliver.go:206` |
| `ReasonSecure` | 什么都没贴的原因 | `deliver.go:68` |
| 密码框先查 | `check()` 里的顺序 | `deliver.go:311-312` |

### 为什么停下

密码框天生要把键入的内容挡在别的程序之外。往里面发 ⌘V，要么没反应，要么把用户不想写在那里的文字暴露出去。停下是安全的答法。

### 边界

卡片不是唯一出口。只有该功能的 `ShowCard` 开着，session 才打开答案卡；`session/deliver_test.go` 的 `TestCardSwitch` 两种设置都测。卡片关着时，`session_link.go:375-379` 复制结果并显示「Not inserted. Copied: press ⌘V to paste.」。`CopyResult` 设置也可能把带卡片的结果复制一份（`session_link.go:321-323`），卡片的 Copy 自己写的是答案文字（`session_overlay_actions.go:20-25`）。所以密码框或不可编辑的出口虽然让 helper 在写剪贴板前停下，app 之后的代码仍可能改剪贴板。

密码框不是唯一的安全情况。别的 app 打开 **secure event input** 时，投递的按键也可能到不了；那一种要贴完才知道，在第 4 步说明。

## 第 3 步 · 焦点能收文字吗？

> **一句话：** start app 读不出也按能写处理，别的 app 必须说可编辑，选区只能在 start app 里替换。

### 图上是什么

- 三条规则：和 start app 一样、另一个 app、替换选区（或 Voxt 自己的窗口）。
- 按钮或列表从不收文字。start app 里网页区域仍算能写；别的 app 里正在阅读的网页不算。
- 规则不满足时，什么都不贴，答案去卡片。

### 规则

`Writable(f)` 判断 start app 的元素能不能收文字：可编辑的、Accessibility 读不出的、或角色不在非文字表里的都算。别的 app 必须报 `Editable`。

$$\text{Writable} = f.\text{Editable} \lor f.\text{Error} \ne "" \lor f.\text{Role} \notin \text{nonText}$$

| 符号 | 含义 | 出处 |
|---|---|---|
| `f.Editable` | Accessibility 说这个元素能编辑文字 | `deliver.go:196` |
| `f.Error` | Accessibility 没给出答案 | `deliver.go:196` |
| `f.Role` | 元素的角色；`AXWebArea` 不在 `nonText` 里 | `deliver.go:199-202` |
| `nonText` | 从不收文字的角色 | `deliver.go:184-189` |
| `Writable` | start app 的规则 | `deliver.go:195-203` |

### 为什么不对称

你在 start app 里按了快捷键，所以那里读不出的元素也按能写处理。另一个 app 里你没按任何东西，元素必须自己说能编辑文字，否则一个只读网页也可能收到粘贴。

### 边界

选区只在 start app 里替换，而且只在 Accessibility 说可编辑的元素里；在网页里选了字，却用一个到不了的粘贴去「替换」，字会丢。VoxtNew 自己的窗口也要求 `Editable`，因为 session 可能就从那里开始。start app 里网页区域的角色是 `AXWebArea`，不在 `nonText` 里，所以 `Writable` 返回真；「正在阅读的网页不算」这条只适用于别的 app。

## 第 4 步 · 贴完再读一次焦点

> **一句话：** helper 在 ⌘V 之前和之后各读一次焦点。读到变化是贴进去的证据；读得出却一样，只算没确认。

### 图上是什么

- 前、后两张卡装的是 helper 从焦点读到的东西：框里的文字和光标。
- 比较有四个出口：不同 → 贴进去；一样且是普通框 → 没确认；一样且是网页区域或可编辑网页部分 → 贴进去；读不出 → 按贴入。
- 等待时间是 `DefaultVerifyMS`，1000 ms。

### 比较

`PasteCheck.compare` 报三种结果：

$$\text{compare} = \begin{cases}\text{changed} & \text{任何能比的部分不同}\\[2pt] \text{same} & \text{能比的部分都相同}\\[2pt] \text{unreadable} & \text{没有能比的部分}\end{cases}$$

内部比较的是值的长度、值的摘要、选区范围、文本标记（网页编辑器的光标）。读到变化是贴入的证据，别的编辑也可能造成它；读得出来、又是**普通**框、且读到一样，就留下 `ReasonUnconfirmed`。焦点是 `AXWebArea` 或可编辑的网页部分时不一样：`TextIO.swift` 把这个 unchanged 结果改成 unknown，`insert()` 把 unknown 当作已贴入。`deliver_test.go` 就有这一例：读得出但没变的网页区域按已贴入处理。

| 符号 | 含义 | 出处 |
|---|---|---|
| `DefaultVerifyMS` | 等多久就放弃 | `Voxt/internal/deliver/deliver.go:92` |
| `compare` | changed / same / unreadable | `Voxt/helper/Sources/VoxtNewHelperKit/PasteCheck.swift:46-66` |
| `outcome` | inserted / unknown / unchanged | `PasteCheck.swift:71-75` |
| 网页容器按贴入处理 | `AXWebArea` 且没有 secure input | `deliver.go:263-268` |

### 为什么再读

发 ⌘V 只是往系统里放一个按键事件。app 可能不理它（焦点不对、密码框、页面忙），什么都没打出来。再读一次焦点，调用方才能分清「发出去了」和「落进去了」。

### 边界

有些元素什么都读不出；网页容器常常在 ⌘V 后不更新 value，于是没有证据也按贴入处理。别的 app 开着 secure event input 时，原因记成 `ReasonSecureInput`，而不是普通没确认。

## 第 5 步 · 给剪贴板拍快照，再放回去

> **一句话：** 贴之前先记住旧剪贴板，贴完放回去；这中间别的程序写过，就不覆盖。

### 图上是什么

- 蓝色框是记住的旧剪贴板。
- 橙色框是准备好的文字，在 ⌘V 前一刻写上去，暂时占用剪贴板。
- 最后一个蓝色框是放回：旧剪贴板回来。

### 时间

文字显示了就放回，结果不确定就等一个默认时间：

$$t_{\text{restore}} = \begin{cases}150\text{ ms} & \text{确认贴入}\\[2pt] 500\text{ ms} & \text{结果不确定}\end{cases}$$

放回之前，helper 比较剪贴板的 change count。这中间别的程序写过，就留着那次写入。

| 符号 | 含义 | 出处 |
|---|---|---|
| $t_{\text{restore}}$ | 旧剪贴板什么时候回来 | 下面两种情况的结果 |
| 150 ms | 文字显示后放回 | `Voxt/helper/Sources/VoxtNewHelper/TextIO.swift:367` |
| 500 ms | 不确定时默认的 `RestoreDelayMS` | `TextIO.swift:367` |
| `changeCount` | 中间有没有别人写过 | `TextIO.swift:365-372` |

### 为什么放回

剪贴板是每个 app 共用的。把转写文字一直留在上面，就悄悄替掉了用户之前复制的东西。放回是把用户的剪贴板还给他。只有发出粘贴但没确认时，才把文字留在剪贴板，卡片的 Copy 才用得上；密码框和不可编辑的检查在写剪贴板之前就返回，不动剪贴板。`KeepClipboard` 是另一个开关，故意把文字留下。

### 边界

这一步不负责救回快照到放回之间被别的 app 改掉的剪贴板，只避免覆盖那次更新的写入。下一章问的是人名和术语作为参考从哪里来。
