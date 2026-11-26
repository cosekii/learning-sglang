## 第 1 步 · start app 和 front app 是两个 app

> **一句话：** 文字去文字准备好时在前面的 app 的焦点，按快捷键的那个 app 只是一个记下来的例外。

### 图上是什么

- 左边的框是 **start app**，按快捷键那一刻在前面的 app，也就是 `Request.Target`。
- 右边的框是 **front app now**，文字准备好那一刻在前面的 app。它有焦点的元素才是打字会去的地方。
- 箭头表示 Voxt 在录音和思考时，你切了 app。
- 底部一行说明 start app 还管哪些事。那些规则在后面几步出现。

### 规则

`deliver` 读此刻在前面的 app 和它的焦点元素。这个元素能收文字时，结果就贴到那里，不管是哪个 app。start app 默认不是目的地。

| 符号 | 含义 | 出处 |
|---|---|---|
| start app | 按快捷键时的前台 app；`Request.Target` | `Voxt/internal/deliver/deliver.go:97-98` |
| front app now | 贴之前读到的焦点所属 app | `deliver.go:292-305` |
| start app 的三处作用 | 读不出按可信、替换选区、自动按键 | `deliver.go:10-18` |

### 为什么要分开

如果文字总回 start app，说到一半切了 app，文字就丢在你不再看的地方。读 front app 就跟着你走。start app 只保留在它身份会改变安全规则的地方。

### 边界

这一步还没说怎么检查 app，只先分清两个 app 的区别；检查在第 2、3 步加上。

## 第 2 步 · 密码框让整件事停下

> **一句话：** 动键盘之前 helper 先读焦点；焦点是密码框就不贴。

### 图上是什么

- front app 里有焦点的框带一个锁的标记，subrole 是 `AXSecureTextField`。
- 橙色结果是 STOP：一个字也不贴。
- 改为打开卡片，文字仍然拿得到。

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

密码框不是唯一的安全情况。别的 app 打开 **secure event input** 时，投递的按键也可能到不了；那一种要贴完才知道，在第 4 步说明。

## 第 3 步 · 焦点能收文字吗？

> **一句话：** start app 读不出也按能写处理，别的 app 必须说可编辑，选区只能在 start app 里替换。

### 图上是什么

- 三条规则：和 start app 一样、另一个 app、替换选区（或 Voxt 自己的窗口）。
- 按钮、列表、表格、正在阅读的网页从不收文字。
- 规则不满足时，什么都不贴，答案去卡片。

### 规则

`Writable(f)` 判断 start app 的元素能不能收文字：可编辑的、Accessibility 读不出的、或角色不在非文字表里的都算。别的 app 必须报 `Editable`。

$$\text{Writable} = f.\text{Editable} \lor f.\text{Error} \ne "" \lor f.\text{Role} \notin \text{nonText}$$

| 符号 | 含义 | 出处 |
|---|---|---|
| `f.Editable` | Accessibility 说这个元素能编辑文字 | `deliver.go:196` |
| `f.Error` | Accessibility 没给出答案 | `deliver.go:196` |
| `nonText` | 从不收文字的角色 | `deliver.go:184-189` |
| `Writable` | start app 的规则 | `deliver.go:195-203` |

### 为什么不对称

你在 start app 里按了快捷键，所以那里读不出的元素也按能写处理。另一个 app 里你没按任何东西，元素必须自己说能编辑文字，否则一个只读网页也可能收到粘贴。

### 边界

选区只在 start app 里替换，而且只在 Accessibility 说可编辑的元素里；在网页里选了字，却用一个到不了的粘贴去「替换」，字会丢。VoxtNew 自己的窗口也要求 `Editable`，因为 session 可能就从那里开始。

## 第 4 步 · 贴完再读一次焦点

> **一句话：** helper 在 ⌘V 之前和之后各读一次焦点，只有变了才算贴进去。

### 图上是什么

- 前、后两张卡都装四个可读部分：值的长度、值的摘要、选区、文本标记。
- 蓝色结果是比较：变了算贴入，一样的算没确认。
- 等待时间是 `DefaultVerifyMS`，1000 ms。

### 比较

`PasteCheck.compare` 报三种结果：

$$\text{compare} = \begin{cases}\text{changed} & \text{任何能比的部分不同}\\[2pt] \text{same} & \text{能比的部分都相同}\\[2pt] \text{unreadable} & \text{没有能比的部分}\end{cases}$$

四个部分是值的长度、值的摘要、选区范围、文本标记（网页编辑器的光标）。读到变化就确认贴入；读到一样就留下 `ReasonUnconfirmed`。

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
| 150 ms | 文字显示后放回 | `Voxt/helper/Sources/VoxtNewHelper/TextIO.swift:367` |
| 500 ms | 不确定时默认的 `RestoreDelayMS` | `TextIO.swift:367` |
| `changeCount` | 中间有没有别人写过 | `TextIO.swift:365-372` |

### 为什么放回

剪贴板是每个 app 共用的。把转写文字一直留在上面，就悄悄替掉了用户之前复制的东西。放回是把用户的剪贴板还给他；没贴进去时反而把文字留在剪贴板，卡片的 Copy 才用得上。

### 边界

这一步不负责救回快照到放回之间被别的 app 改掉的剪贴板，只避免覆盖那次更新的写入。下一章问的是人名和术语作为参考从哪里来。
