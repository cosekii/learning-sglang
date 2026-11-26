## 第 1 步 · 一次听写留一条记录

> **一句话：** 一次听写结束后写一条历史记录，记下功能、应用和最后的文字；它也可能留一段你的录音。

### 图上是什么

- 左边宽蓝色框是一条**历史记录**：`kind = transcribe`、`app = Mail`、`text = "send it to Priya."`。
- 橙色字段 `audio.wav` 是录音；只有你选择保留录音，或者识别失败、用户取消时才出现。
- 下面一行是构造的例子：一天 10 次听写，90 天就是 900 条记录。
- 虚线框说这一章还没加钟；记录和录音都先留着。

### 一条记录里有什么

`store.Entry` 是一次完成的会话；结构体从 `Voxt/internal/store/store.go:69` 开始。这一章用到的字段：

| 字段 | 含义 | 出处 |
|---|---|---|
| `Kind` | `transcribe`、`translate` 或 `rewrite` | `store.go:71` |
| `CreatedAt` | 快捷键时间；`keep()` 把 `s.StartedAt` 抄进来 | `store.go:72`、`run.go:512` |
| `Status` | `done`、`failed` 或 `cancelled` | `store.go:73` |
| `RawText`、`Result` | 识别听到的、最后交付的文字 | `store.go:90`、`store.go:94` |
| `Audio` | 录音在音频文件夹里的文件名；`""` 表示没有 | `store.go:133` |
| `AudioUntil` | 只为重试保留的录音到什么时候删 | `store.go:138` |

`session/run.go` 的 `keep()` 只在历史开着时写记录（`inHistory`，`run.go:572`）。它在 `KeepAudio` 开着、或识别失败、或会话被取消时写出 WAV（`keepsRecording`，`run.go:583`）。

$$ \text{row} = \{\text{kind},\ \text{app},\ \text{text},\ \text{audio}?\} $$

### 代入图上的数

| 符号 | 图上的值 | 从哪来 |
|---|---|---|
| 每天听写 | 10 | 构造的例子 |
| 保留天数 | 90 | 本章的默认钟，第 2 步 |
| 总记录 | $10 \times 90 = 900$ | 图上的算式 |

### 为什么从记录讲起

记录是会过期的那样东西；它的录音是第二样，有自己的一生。没有钟，两者会一直留在这台 Mac 上，直到数据文件夹被删。第 2 步把两个寿命画到一张图上。

### 接下来

记录和录音各走各的钟。第 2 步把两个钟都画出来。

## 第 2 步 · 两个钟

> **一句话：** 历史记录默认留 90 天，钟从按下快捷键开始；为重试保留的录音留 7 天，钟从重试录音保存开始。

### 图上是什么

- 上面蓝色条是**历史记录**。起点标着**按下快捷键**，终点是第 90 天。
- 下面橙色条是**重试录音**。起点标着**重试录音保存**，它画在同一条 90 天的尺上，所以 7 天显得很短：$90 - 7 = 83$ 天。
- 条件框写着重试录音什么时候存在：识别失败或用户取消，并且保存录音关着。

### 两个默认值和各自的起点

默认设置里 `KeepDays` 是 0（或不在选项里的数），`settings.History.Days()` 返回 90（`Voxt/internal/settings/history.go:39`）。`DefaultKeepDays = 90`（`history.go:28`）；其他选项是 365、180、90、30、7 天（`history.go:34`）。

只为重试保留的录音会拿到 `AudioUntil = now + Config.AudioRetention`，`AudioRetention` 默认是 `7 * 24h`（`Voxt/internal/session/session.go:355`；在 `manager.go:133` 应用默认值）。

两个钟不是从同一个事件开始。`keep()` 保存 `CreatedAt: s.StartedAt`（`Voxt/internal/session/run.go:512`），`StartedAt` 就是快捷键时间（`session.go:169`）。`keep()` 写出 WAV 并设置 `AudioUntil`（`run.go:550-554`）；`History.Put` 之后才写记录（`run.go:561-564`）。所以录音钟从重试副本保存时开始，不是从记录写下时开始。图把两条从同一条左边缘画起，方便比长度；标签写明两个起点事件不同。

$$ T_{\text{row}} = 90\ \text{days},\qquad T_{\text{retry}} = 7\ \text{days} = 7 \times 24 = 168\ \text{hours} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_{\text{row}}$ | 记录按年龄留多久 | `settings/history.go:28` |
| $T_{\text{retry}}$ | 只为重试留的录音留多久 | `session/session.go:355` |
| 记录钟起点 | `Entry.CreatedAt`，抄自 `s.StartedAt`（快捷键） | `run.go:512`、`session.go:169` |
| 录音钟起点 | 重试录音保存的时刻，早于记录写下 | `run.go:550-554`、`run.go:561-564` |

### 代入图上的数

| 条 | 同一条尺上的长度 | 为什么 |
|---|---|---|
| 历史记录 | 整条 600 px | 90 天 |
| 重试录音 | $600 \times 7 / 90 \approx 47$ px | 7 天 |
| 差 | $90 - 7 = 83$ 天 | 两条的长度差 |

### 为什么两个钟不一样

记录是能搜索的文字；重试副本是第二次识别机会。公开代码只给了两个默认值，没有说明为什么选 90 天和 7 天，所以本章不补这个理由。

### 接下来

第一个钟有两条规则。第 3 步先讲年龄。

## 第 3 步 · 钟 1：年龄

> **一句话：** 自动清理会删掉比「今天减去保留天数」更早的每一条记录，连同它的录音。

### 图上是什么

- 算式读作 `今天 2026-11-26 − 90 天 = 分界线 2026-08-28`。
- 红卡片是 2026-08-27 的记录，91 天前：比分界线早，删掉。
- 蓝卡片是 2026-08-29 的记录，89 天前：比分界线晚，留下。
- 下面一行说清理什么时候跑：启动时、每条新记录之后、设置改动时。

### 分界线和删除

`History.Cutoff(now)` 返回 `now.AddDate(0, 0, -h.Days())`；`CleanupOff` 开着时返回零时间（`Voxt/internal/settings/history.go:61`）。`pruneWhere` 把它变成 `created_at < cutoff`（`Voxt/internal/store/sqlitestore/history_retention.go:123`），`Prune` 用一条 `DELETE … RETURNING audio` 删行，然后删文件（`history_retention.go:135`）。

$$ \text{cutoff} = \text{now} - 90\ \text{days},\qquad \text{delete row} \iff \text{created\_at} < \text{cutoff} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| 今天 | 清理跑的那一刻 | `history_settings_ops.go:69` |
| 90 天 | `History.Days()` | `settings/history.go:39` |
| `created_at` | 记录里的 `CreatedAt`，也就是快捷键时间 | `store.go:72`、`run.go:512` |
| `Prune` | 删记录和录音 | `history_retention.go:135` |

### 代入图上的数

| 记录 | 年龄 | 和分界线比 | 结果 |
|---|---|---|---|
| 2026-08-27 | 91 天 | 更早 | 删掉，录音一起 |
| 2026-08-28 | 90 天 | 正在分界线上 | 下一次清理时删 |
| 2026-08-29 | 89 天 | 更晚 | 留下 |

图用 91 和 89，是为了两张卡都不正好压在边界上。分界线是门槛，不是定时器：过了线的记录要等下一次清理才删，而清理只在启动时、每条新记录后或设置改动时跑（`history_settings_ops.go:8-10`）。

### 什么时候跑

`history_settings_ops.go` 的注释说，清理在启动时、每次历史变化后（有新记录）和设置改动时跑（`history_settings_ops.go:7-10`）。`pruneHistory` 一次只跑一个任务，跑的时候又被要求就再跑一次（`history_settings_ops.go:69`）。

### 边界

关掉自动清理（`history.cleanupOff`）会让 `Cutoff` 返回零时间，这条规则就停。第 4 步的条数规则也一起停，因为清理关着时 `PerKind` 返回 0（`settings/history.go:70`）。

### 接下来

清理还会删掉「不老、但超过条数」的记录。第 4 步画这条规则。

## 第 4 步 · 钟 1：每种功能的条数

> **一句话：** 同一个清理给每种功能各留最多 N 条，听写、翻译、改写分开数；设 0 表示不限。

### 图上是什么

- 宽条是 `transcribe` 的构造例子：一共 102 条，按比例画。蓝色部分是最新的 100 条；细红色部分是最旧的 2 条。
- 标签写着 `102 − 100 = 2`，条下面的说明写着蓝色占 100/102、红色占 2/102。
- 下面两个框说 `translate` 和 `rewrite` 也是同一规则，各留自己的最新 N 条，不共用条数。
- 最下面给出 N 的选项，并说年龄和条数一起生效。

### 条数怎么执行

除非清理关着，`History.PerKind()` 返回 `Count()`（`Voxt/internal/settings/history.go:70`）。`Count()` 对不在选项里的值返回 0，也就是不限（`history.go:50`）。`pruneWhere` 加了一个窗口函数：

$$ \text{delete row} \iff \text{row} \in \{\, \text{rows with } \mathrm{rank}_{\text{kind}} > N \,\} $$

`ROW_NUMBER() OVER (PARTITION BY kind ORDER BY created_at DESC, id DESC)` 把每种功能的记录按从新到旧编号；编号 `n > N` 的行都删（`history_retention.go:129`）。

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| `kind` | transcribe、translate 或 rewrite | `store.go:71` |
| $N$ | 每种功能留几条 | `settings/history.go:50` |
| `n > N` | 超过该功能最新 N 条的行 | `history_retention.go:129` |
| 0 | 不限，默认值 | `settings/history.go:19` |

### 代入图上的数

| 量 | 值 | 从哪来 |
|---|---|---|
| 一种功能的记录 | 102 条 | 构造的例子 |
| N | 100 | 设置选项之一 |
| 删掉 | $102 - 100 = 2$ | 该功能最旧的两条 |
| 蓝色占整条 | $100 / 102 \approx 98\%$ | 图上的比例 |
| 红色占整条 | $2 / 102 \approx 2\%$ | 图上的比例 |

### 两条规则，一次删除

两条条件都设上时，`pruneWhere` 用 `OR` 连起来（`history_retention.go:119-132`）。记录太老**或者**超过它那一种的条数，就会被删；不需要两条同时成立。

### 边界

条数是每种功能各算，不是全历史一起算。100 条听写和 100 条翻译可以同时存在。默认是 0，所以新装的应用不会因为条数删任何东西。

### 接下来

第一个钟讲完。第 5 步看更短的那个钟和它留住的录音。

## 第 5 步 · 钟 2：重试录音

> **一句话：** 为重试保留的录音有 7 天寿命，由每小时一次的清扫检查，重试成功马上删。

### 图上是什么

- 橙色卡是 2026-11-26 写下的一条失败听写，带 `audio.wav`。
- 上面条是历史记录：90 天。下面条是重试录音：7 天，末端有一条第 7 天的线。
- 下面文字说，即使保存录音关着，这份副本也留着，因为重试还能拿它再跑。
- 最下面把两个数分开写：重试钟的寿命是 `7 × 24 = 168` 小时，清扫每 1 小时一次。

### 这份副本什么时候有

`keepsRecording` 在 `KeepAudio` 开着、或识别失败、或会话被取消时返回真（`Voxt/internal/session/run.go:583`）。录音只为重试保留时，`keep()` 设置 `AudioUntil = now + cfg.AudioRetention`（`run.go:552`）。`KeepAudio` 默认关着，所以失败或取消的听写会把 WAV 留 7 天，记录本身没有永久录音。

$$ \text{AudioUntil} = t_{\text{fail}} + 7\ \text{days} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t_{\text{fail}}$ | 重试录音保存的时间 | `run.go:553` |
| `AudioRetention` | 默认 7 天 | `session/session.go:355` |
| `AudioUntil` | 重试副本到期的时间 | `store.go:138` |

### 扫描和带守卫的删除

`expireRecordings` 在应用启动时开始，先立刻调一次 `History.ExpireAudio`，之后每次睡 1 小时再调，而且只在应用运行时调（`Voxt/history_retry.go:89`、`history_retry.go:91-107`）。到期不等于删除：`AudioUntil` 过后的第一次清扫才删。查询选 `audio != '' AND audio_until > 0 AND audio_until <= now` 的行；每条删除都带 `WHERE seq = ? AND audio = ? AND audio_until > 0`，所以期间被重试过的行不会被清掉（`Voxt/internal/store/sqlitestore/history.go` 的 `ExpireAudio`）。行更新完再删文件。

### 代入图上的数

| 量 | 值 | 从哪来 |
|---|---|---|
| 重试寿命 | 7 天 = $7 \times 24 = 168$ 小时 | `DefaultAudioRetention` |
| 清扫间隔 | 1 小时 | `recordingSweep` |
| 实际扫几次 | 不固定：启动一次，之后应用运行时每小时一次 | `history_retry.go:91-107` |

### 成功提前删，保存录音开着就跟着记录走

重试成功会清掉 `AudioUntil`；`KeepAudio` 关着时还会删文件并把 `Audio` 置空（`Voxt/internal/session/retry.go:82-88`）。`KeepAudio` 开着时，`AudioUntil` 根本没设过，录音就跟着记录走满 90 天。

### 边界

重试钟只在识别失败或取消、并且保存录音关着时开始。一次成功、又没选保留录音的听写，一点音频都不留。代码给了 7 天这个默认值，没有记录为什么选它。

### 接下来

第 6 步看这份重试副本用来做什么。

## 第 6 步 · 重试用那段录音

> **一句话：** 重试把留下的整段录音重新识别，原地更新同一条记录，不插入任何文字；只有该功能有语言模型、并且没走到提前返回时，才跑语言模型那一步。

### 图上是什么

- 橙色框是带 `audio.wav` 的那条记录。
- 箭头依次经过**读文件**、**重新识别整段录音**、**跑现在的设置**。
- 最后的蓝色框说改同一条记录：旧文字变成新文字。
- 下面几行说不插入文字；只有留着录音的记录能重试；文件没了就提示「录音已经不在」。

### 重试读什么、写什么

`Manager.Retry` 读记录的 WAV（`Voxt/internal/session/retry.go:54`），缺录音或不是 16 kHz 单声道就拒绝（`retry.go:52`、`retry.go:60`）。它把整份文件重新识别（`retry.go:157`、`retry.go:175`），再用现在的设置跑该功能对应的语言模型步骤：听写走清理，翻译用记录里的目标语言，改写用记录里的选中文字（`retry.go:38-39`）。最后用 `History.Put` 把同一条记录写回（`retry.go:93`）。

不是每次听写重试都会走到语言模型。识别完后，如果整段文字是一个快捷短语，它把 `e.Result` 设为该短语配置的替换或展开文字再返回（`retry.go:196-200`）；听写清理关着或没有语言模型时，`e.Result` 设为展开后的快捷短语再返回（`retry.go:201-204`）。其余情况后面的清理、翻译或改写步骤会覆盖 `e.Result`（`retry.go:210-225`）。翻译和改写则需要模型。

$$ \text{row}' = \mathrm{retry}(\text{audio.wav},\ \text{settings now}),\qquad \text{row}'.id = \text{row}.id $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| `audio.wav` | `Entry.Audio` 指的文件 | `store.go:133` |
| 现在的设置 | 当前的清理和模型选择，用到模型时 | `retry.go:37-38`、`retry.go:196-204` |
| 同一条记录 | ID 不变 | `retry.go:93` |
| 不插入 | 重试不走交付路径 | `retry.go:38-39` |

### 代入图上的数

| 项 | 图上的值 | 为什么 |
|---|---|---|
| 文件格式 | 16 kHz 单声道 WAV | `retry.go:60` |
| 之前的文字 | 失败，没有结果 | 第 5 步的失败记录 |
| 之后的文字 | 识别结果，之后可能被短语替换、清理或改写／翻译输出覆盖 | `retry.go:195-204`、`retry.go:210-225` |
| 插入的文字 | 没有 | `retry.go:38-39` |

### 为什么它不抢会话

`Retry` 的注释说它和任何进行中的会话并排跑，从不占用 Manager 的会话，而且只在自己的 goroutine 上阻塞（`retry.go:43-44`）。所以重试不会停掉一次新听写，新听写也不会覆盖被重试的记录。

### 边界

重试用现在的设置，不用失败那天的设置。录音没了的记录不能重试，应用提示「录音已经不在」（`retry.go:52`）。没留录音的记录，从来就没有重试这条路。

### 接下来

记录和录音都有自己的钟。第 7 步看别的程序导出历史时，哪些东西会离开这台 Mac。

## 第 7 步 · JSONL 导出：一行一个对象

> **一句话：** JSONL 导出每行写一个 JSON 对象，从旧到新；它支持整份 `Row` 结构，但空的可选字段不写。

### 图上是什么

- 表的每一行是 `historyapi.Row` 的一个字段；右列写着它什么时候会进对象。
- `id`、`created_at`、`kind`、`text`、`heard` 总是有。
- `app` 只在知道应用时有；`instruction` 只在带口述的改写里有；`target_lang` 只在翻译里有；`selection` 只在「包含选中文字」打开时有；`typed` 还要同时满足该设置、改写和口述。
- 下面两行说：结构里有十个字段，但空的可选字段不写。

### 对象和字段

`historyapi.Row` 是结构定义；结构体从 `Voxt/internal/historyapi/row.go:22` 开始。`omitempty` 标在 `app`、`instruction`、`target_lang`、`selection`、`typed` 上（`row.go:26`、`row.go:29-32`）。JSONL 渲染器把整行编码（`render.go:38-42`），所以空的可选字段连键都不出现。

$$ \text{object} = \{\text{id},\ \text{created\_at},\ \text{kind},\ \text{app}?,\ \text{text},\ \text{heard},\ \text{instruction}?,\ \text{target\_lang}?,\ \text{selection}?,\ \text{typed}?\} $$

| 字段 | 什么时候进对象 | 从哪来 |
|---|---|---|
| `id` | 总是 | `row.go:23` |
| `created_at` | 总是 | `row.go:24` |
| `kind` | 总是 | `row.go:25` |
| `app` | 知道应用时（`omitempty`） | `row.go:26` |
| `text` | 总是 | `row.go:27` |
| `heard` | 总是 | `row.go:28` |
| `instruction` | 带口述的改写（`omitempty`） | `row.go:29`、`row.go:44-49` |
| `target_lang` | 翻译（`omitempty`） | `row.go:30` |
| `selection` | 包含选中文字打开时（`omitempty`） | `row.go:31`、`row.go:44-45` |
| `typed` | 该设置 + 改写 + 口述（`omitempty`） | `row.go:32`、`row.go:46-48` |

### 代入图上的数

| 记录 | `app` | `instruction` | `target_lang` | 对象里的键 |
|---|---|---|---|---|
| 听写，应用未知 | 没有 | 没有 | 没有 | 10 个里的 8 个 |
| 听写，Mail | `Mail` | 没有 | 没有 | 10 个里的 9 个 |
| 翻译 | `Mail` | 没有 | 有 | 10 个 |
| 带口述的改写 | `Mail` | 有 | 没有 | 10 个 |

`selection` 和 `typed` 还要设置打开才加，所以键数可能更少。重点不是数键，而是上表哪几个字段可能缺席。

### 参数和范围

`--format jsonl` 一行写一个 JSON 对象（`render.go:38-42`）。`--day YYYY-MM-DD` 取本地日历日，时钟切换时那一天是 23 或 25 小时；`--since T` 和可选的 `--until T` 收 RFC 3339 时间或日期。范围含起点、不含终点（`Voxt/docs/history-access.md`）。`--kind` 取 `transcribe`、`translate` 或 `rewrite`。

### 边界

JSONL 支持整份 `Row` 结构，不代表每一行都有全部键。录音、网址、错误、规则／模型名和计时不在 `Row` 里，所以两种格式都不写。导出命令需要第 9 步的访问开关；历史页的「导出文字…」不需要。

### 接下来

另一种格式 Markdown 写的字段少得多。第 8 步看它的每行。

## 第 8 步 · Markdown 导出：一天一节

> **一句话：** Markdown 导出按本地日期分组，每行只写时间、知道时的应用和交付文字。

### 图上是什么

- 代码卡里是一个 `## 2026-11-26` 日标题和三行记录。
- 每行是 `- HH:MM · App: text`；应用未知时是 `- HH:MM ·: text`。
- 下面几行列出 Markdown 文件里没有的东西：`id`、`kind`、`heard`、`instruction`、`target_lang`、`selection`、`typed`。两种格式都没有录音、网址、错误、内部名字和计时。

### Markdown 的那一行

渲染器按记录自己的本地日期分组（`render.go:45-57`），再写一行（`render.go:59-65`）：

$$ \text{line} = \texttt{"- "} + \text{HH:MM} + (\text{" · "} + \text{app} + \text{":"})? + \text{" "} + \text{text} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| `## YYYY-MM-DD` | 每个本地日期一节 | `render.go:48-57` |
| `HH:MM` | 记录的本地时间 | `render.go:59` |
| `app` | 应用名，空时不写 | `render.go:60-64` |
| `text` | 交付的文字 | `render.go:65` |

### 代入图上的数

| 记录 | Markdown 行 | 丢掉的字段 |
|---|---|---|
| 听写，Mail，09:14 | `- 09:14 · Mail: send it to Priya.` | id、功能、识别原文、口述指令、目标语言、选中、输入 |
| 听写，应用未知 | `- 09:20 ·: no app name` | 同上，再加 app |
| 带口述的改写 | `- 09:31 · Notes: buy milk` | 口述指令和其余字段 |

### 参数和范围

`--format md` 一天一节 `## YYYY-MM-DD`，只带时间、应用和文字（`render.go:47-65`）。范围参数和第 7 步一样：`--day`、`--since` 加可选的 `--until`、`--kind`。导出的文件归你；自动清理和「清空历史」都不碰它。

### 边界

Markdown 有意丢掉字段：它适合阅读和做笔记，不是完整备份。需要 `id`、功能、识别原文、口述指令或选中文字时，用 JSONL。

### 接下来

两种格式的命令都要访问开关。第 9 步看开关做什么、不保护什么。

## 第 9 步 · 开关不保护数据库

> **一句话：** 开关给其他程序开一条会记账的命令；以同一用户身份运行的程序仍能直接读数据库文件，开关开不开都一样。

### 图上是什么

- 左边蓝色框是有文档的那条路：开关关，命令没有回答（退出码 3）；开关开，每次读取记时间、条数和程序名，新名字会提醒，日志里没有文字。
- 右边灰框是直接路径：`voxtnew.db`，装历史的那一个文件，以用户身份运行的程序能读，不记账，开关改不了这一点。
- 下面一行说其他账户打不开这条通道（权限 0600，在 `~/Library` 里），也没有网络端口。
- 虚线框把下一章的问题交给舞台。

### 开关做什么

`privacy.historyAccess` 默认关着，打开前会问一次。关着时 socket 不存在，`Voxt history` 以退出码 3 失败（`Voxt/docs/history-access.md`；`history_access_controller.go` 的 `syncHistoryAccess`）。开着时，合法的 export／status 请求会走到审计回调，记下 `At`、`Op`、`Count`、`Program` 和 `As`；格式错误或不支持的请求在 `server.go:151-159` 就返回，不记账。记录类型是 `Read`（`historyapi/server.go:63-70`），调用在 `server.go:167-169`。它不记任何历史文字。`Listen` 以 `0600` 权限建 socket（`server.go:101`，chmod 在 `server.go:111`），位置在 `~/Library` 里，不开任何端口。

$$ \text{answer} = \begin{cases} \text{logged read}, & \text{switch on} \\ \text{exit 3}, & \text{switch off} \end{cases} $$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| `historyAccess` | 开关，默认关 | `settings.md` 隐私表 |
| 退出码 3 | 没有回答：应用没跑或开关关 | `history_cli.go:27` |
| 审计行 | 时间、操作、条数、程序，无文字 | `historyapi/server.go:63-70` |
| 权限 0600 | 只有这个账户能打开 socket | `server.go:101`、`server.go:111` |

### 代入图上的数

| 路径 | 开关关 | 开关开 | 记账？ |
|---|---|---|---|
| `Voxt history` 命令 | 退出码 3 | 能用 | 开着时记 |
| 同一用户读 `voxtnew.db` | 能读 | 能读 | 不记 |
| 另一个 macOS 账户 | 到不了 socket | 到不了 socket | 不适用 |
| 网页或另一台设备 | 没有端口 | 没有端口 | 不适用 |

### 为什么它不保护数据库

Voxt 没有沙箱，数据放在 `~/Library/Application Support/VoxtNew`。同一账户下任何没有沙箱的程序都能直接打开 `voxtnew.db`，这种读取不记账（`Voxt/docs/history-access.md`）。开关让有文档的那条路变成要你打开、而且看得见；它不保护历史不被已经以你身份运行的软件读取。日志里的程序名只是尽力而为，可以伪造。

### 另一件清理

「清空历史」删掉所有记录和录音，然后压缩数据库（`sqlitestore/history.go:216-243` 的 `DeleteAll`）。压缩是为了让删掉的文字不留在空闲页里；压缩失败只记日志，不返回错误。它和两个钟不是一回事，只在用户主动要求时跑。

### 接下来

记录和录音都到期以后就没了。下一章问：一个现成的音频文件怎样变成 SRT 或 TXT。第 10 章的文件转写复用识别路线，把结果写进文件，而不是写进光标。
