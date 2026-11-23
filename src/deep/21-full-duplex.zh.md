## 第 1 步 · 轮替式和全双工：谁决定模型何时开口

> **一句话：** 同样 11 s 的听众音频，轮替式靠 VAD 的两条规则切轮次，全双工让模型每秒自己决定听还是说。

### 图上是什么

- 上下两个面板，各两行：「听众」（琥珀色，`--gen`）和「模型」（蓝色，`--accent`）。两面板的听众音频完全相同。
- 听众说了三段：0–1.6 s「外面冷吗…」，2.8–4.3 s「…巴黎呢？」，6.6–7.5 s「mm-hm」。
- 上面板「轮替式 · 由 VAD 决定」：每段话之后的灰色小块「800 ms」是 VAD 等待的静音；红色竖线是被打断的回复；红字「只答了半个问题」「被“mm-hm”打断」。
- 下面板「全双工 · 由模型决定」：一行 11 个格子，每秒一个，前 5 个「听」，后 6 个「说」；蓝字「停顿期间一直在听」「听到“mm-hm”，继续说」。
- 半透明竖线是当前时刻，整步循环播放。

**VAD**（voice activity detector，语音活动检测器）每一刻只回答一个问题：现在有没有人在说话。它不听内容。

### 公式

轮替式的两条规则：一轮在静音满 0.8 s 时结束，模型开始回复；回复在听众下一次开口的时刻 $t_{\text{start}}'$ 被打断。

$$
t_{\text{turn}} = t_{\text{end}} + 0.8\ \text{s}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $t_{\text{end}}$ | 听众一段话结束的时刻 | | 本步，示意值 |
| $0.8\ \text{s}$ | VAD 判定一轮结束要等的静音 | 800 ms | Qwen3-Omni 的 VAD 设置（第二条脚注） |
| $t_{\text{turn}}$ | 这一轮结束、模型开始回复的时刻 | | 本步 |
| $t_{\text{start}}'$ | 听众下一段话开始的时刻 | | 本步，示意值 |

### 代入图上的数

| 听众这段话 | $t_{\text{end}}$ | $t_{\text{turn}}$ | 模型回复 | 被谁打断 |
|---|---|---|---|---|
| 外面冷吗… | 1.6 s | 1.6 + 0.8 = 2.4 s | 2.4–2.8 s，只答了半个问题 | 2.8 s 的「…巴黎呢？」 |
| …巴黎呢？ | 4.3 s | 4.3 + 0.8 = 5.1 s | 5.1–6.6 s，回答进行了 1.5 s | 6.6 s 的「mm-hm」 |
| mm-hm | 7.5 s | 7.5 + 0.8 = 8.3 s | 8.3 s 起，去回应「mm-hm」 | 没被打断 |

全双工面板：模型 0–5 s 一直「听」，停顿（1.6–2.8 s）期间也在听；5 s 起「说」，6.6 s 的「mm-hm」没有打断它。

### 为什么两种做法结果不同

- VAD 只知道有没有声音，所以停顿就等于说完，任何声音都等于打断。
- 全双工模型听的是词，边说边听，每过一秒自己决定听还是说。MiniCPM-o 4.5 每 1 s 决定一次，PersonaPlex 每 80 ms 一次。
- 时间是示意；800 ms 规则和每 1 s 一次的决定是真实设置。

### 接下来

第 2 步看「每秒一次」在服务器里是什么：每一秒音频都是一个 request。

## 第 2 步 · 每秒音频是一个 request

> **一句话：** 服务器把听众的音频切成 1 s 的单元，每个单元作为独立 request 走过 MiniCPM-o 的四个 stage；一分钟通话就是 60 个 request。

### 图上是什么

- 「听众」一行：单元 1 到单元 8，每个 1 s，琥珀色；正在处理的那个是实色。
- 中间四个 stage 框：`perception` → `thinker` → `talker` → `speech`，当前单元走到哪个就亮成蓝色。每个框下标着 Qwen3-Omni 里的对应者（各编码器、thinker、talker、code2wav，第 17 章第 4 步）。
- 「模型」一行：每个单元回来的结果，单元 1、2「听」（灰），单元 3、4「说」（蓝）。
- 粗体计数「至今已穿过每个 stage 的 request」：单元离开 `speech` 时加一。

### 公式

$$
N_{\text{req}} = \frac{T_{\text{call}}}{t_{\text{unit}}},\qquad
N_{\text{run}} = N_{\text{req}} \times N_{\text{stage}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $T_{\text{call}}$ | 通话时长 | 60 s | 本步 |
| $t_{\text{unit}}$ | 一个单元的音频时长 | 1 s | MiniCPM-o 的 `UNIT_MS = 1000` |
| $N_{\text{req}}$ | 整个通话的 request 数 | | 本步 |
| $N_{\text{stage}}$ | 每个 request 要走的 stage 数 | 4 | 本步 |
| $N_{\text{run}}$ | stage 一共运行多少次 | | 本步 |

### 代入图上的数

- $N_{\text{req}} = 60 \div 1 = 60$ 个 request，就是 caption 里的 60。
- $N_{\text{run}} = 60 \times 4 = 240$ 次 stage 运行。

### 四个 stage

| MiniCPM-o stage | 做什么 | Qwen3-Omni 里对应 |
|---|---|---|
| `perception` | 音频和图像编码器，把这一秒音频变成 embedding | 各编码器 |
| `thinker` | 读 embedding，决定说什么（或继续听） | thinker |
| `talker` | 把 thinker 的输出写成声音编码 | talker |
| `speech` | 声码器，把编码变成声音 | code2wav |

单元 $k$ 是听众从 $k-1$ 到 $k$ s 的音频。它在 stage 里时，听众还在说下一个单元（第二条图例），不会等。动画每个单元 2.6 s 只是为了看清，不是真实耗时；真实耗时是第 7 步的事。

### 接下来

第 3 步：一个 request 结束后，stage 还留下什么。

## 第 3 步 · request 结束，什么都不留下

> **一句话：** request 自带所需的一切，结束时每个 stage 释放为它建立的东西；所以单元 2 不知道单元 1 说过什么。

### 图上是什么

- 三列，单元 1、2、3 依次出现，每列三层：
  - 上：「单元 k：它的 1 s 音频」，这个 request 带来的数据。
  - 中：thinker 的 KV cache 框，琥珀色升起「单元 k 的 token」，然后变淡，红字「结束时释放」。
  - 下：「它知道什么」：单元 1「只有单元 1」；单元 2、3 下面红字说没有之前单元的内容。
- 两条脚注：talker 的 KV cache、perception 和声码器的状态也同样释放；前缀缓存帮不上（见下）。

### 规则从哪来

这是第 7 章第 5 步的规则：request 结束时，它的 KV page 回到空闲池。第 3 章讲过 KV cache 存的是每个位置的 k 和 v；单元的 token 进 thinker 后同样留下 k、v，结束就还回去。

### 代入第 1 步的通话

单元 $k$ 覆盖 $k-1$ 到 $k$ s：

| 听众的话 | 时间 | 落在哪些单元 |
|---|---|---|
| 外面冷吗… | 0–1.6 s | 单元 1、2 |
| …巴黎呢？ | 2.8–4.3 s | 单元 3、4、5 |

所以处理「…巴黎呢？」的单元已经不知道前面问的是「外面冷吗」。

### 为什么前缀缓存罩不住

- 第 8 章第 6 步的前缀缓存靠 radix tree 匹配 **token id**，复用重发的文本历史。
- 音频以 embedding 进入，挂在占位 id 下，id 不能标识音频本身。SGLang-Omni 因此不把这类单元插进 radix tree（`scheduling/sglang_backend/ar_session.py` 的 `skip_radix_cache_insert`）。
- 即使匹配上，前缀也可能被驱逐（第 8 章第 7 步）；perception 和声码器的状态本来就不归它管。

### 接下来

第 4 步：让这些状态跨单元留下来的东西，叫 session。

## 第 4 步 · session：服务器保持打开的一段对话

> **一句话：** 客户端 open 一次、每个单元 append 一次、最后 close；这期间每个 stage 为这个 session 保存状态，每次 append 只 prefill 自己的单元。

### 图上是什么

- 「客户端」一行五个胶囊：`open`、`append 1`、`append 2`、`append 3`、`close`，当前操作是黑底。
- 「各 stage」：四个 stage 框，下面各一个状态框。状态存在时是蓝色（`--accent`），每个单元加一条蓝色横条；不存在时是虚线框「无状态」。
- 状态框下写着保存的是什么：perception「音频编码器状态」，thinker 和 talker「KV cache」，speech「声码器状态」。
- 琥珀色小块「单元 n」：append 时单元逐个 stage 跳过去。
- 「现在：」一行说明当前在做什么，每条停 5 s。

### 时间线（动画自己的时间）

| 时刻 | 发生什么 |
|---|---|
| 2.5 s | open：perception 的状态先出现，之后每个 stage 晚 0.6 s，speech 最后 |
| 7.5、12.5、17.5 s | append 1、2、3：单元每 0.5 s 跳一个 stage，到达时那个 stage 加一条 |
| 22.5 s | close：speech 先释放，perception 最后，在 $22.5 + 3 \times 0.6 = 24.3$ s |

open 上游先行、close 下游先行，所以没有哪个 stage 会收到上游还没为它打开的单元（第二条脚注）。

### 公式

不用 session 时，每个 request 得带上到目前为止的整段通话，单元 $n$ 要 prefill $n$ 个单元：

$$
\text{prefill}_{\text{无 session}} = \sum_{n=1}^{N_{\text{req}}} n = \frac{N_{\text{req}}(N_{\text{req}}+1)}{2},\qquad
\text{prefill}_{\text{session}} = N_{\text{req}}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N_{\text{req}}$ | 通话的单元数，60 | 第 2 步 |
| $n$ | 第 $n$ 次 append | 本步 |

prefill 是第 4 章说的「一次读进整段输入、写出它的 KV」那一遍。

### 代入图上的数

- 无 session：$1 + 2 + \dots + 60 = 60 \times 61 \div 2 = 1{,}830$ 个单元的音频。
- 有 session：60 个，每次只有新单元。单元 1 到 $n-1$ 已经在 thinker 的 KV cache 里（第 3 步中间那个框，现在留下了）。

### 接下来

第 5 步：一个 session 单独跑是这样；很多 session、音频不停到达时，服务器要满足什么。

## 第 5 步 · session 需要的三件事

> **一句话：** 每个 stage 为每个 session 存一份状态；每个单元等前一个完成才进入；状态从 open 到 close 都占着 GPU。三条同时都要。

### 图上是什么

三列，不是三选一，每列一条要求、各有一步讲：

| 列 | 图上 | 要求 | 哪一步讲 |
|---|---|---|---|
| 1 · 在每个 stage 里 | thinker 里并排两份状态（session A、B），琥珀色「session A 的单元 2」指向 A 的那份 | 单元记入自己 session 的状态 | 第 6 步 |
| 2 · 在进入的路上 | thinker 在 A 的状态上跑单元 2；服务器里单元 3、4「等待中」 | 一个单元要等前一个完成才进入 | 第 7 步 |
| 3 · 在 GPU 上 | session A 的状态随单元 1 到 6 逐根增高；红色虚线「close：释放」 | 状态一直占着显存到 close | 第 8 步 |

### 为什么是这三条

- **1：** 第 4 步只有一个 session。服务器同时开着很多个，stage 必须知道一个 request 属于哪个 session、是哪种操作。
- **2：** 单元 3 要在单元 2 留下的状态上运行，单元 2 没做完它就没法开始。音频却按真实时间到达，于是会排队。
- **3：** 第 3 步的 request 做完就释放；session 的状态要留到 close，所以显存决定同时能开多少个 session。

### 接下来

第 6 步讲第 1 条：stage 怎么认出 session 操作。

## 第 6 步 · 1 / 3 · 每个 stage 里，每种操作一个 hook

> **一句话：** session 操作是一个元数据里带 `omni_session` 标记的普通 request；stage 读标记，调用同名的 hook。

### 图上是什么

- 左框「一个 request」：「数据：」append 时是琥珀色「单元 3」，open、close 时「无」；「元数据：」里 `omni_session` 写着操作和 session。
- 右框 `thinker`：「它的 hooks」三行 `open`（创建状态）、`append`（在其上运行单元）、`close`（释放状态），触发的那个变黑底；「它的状态，每个 session 一份」，每份状态里每个已有单元一根小蓝柱。
- 「现在：」一行，每个 request 停 5 s，到达 1.2 s 后 hook 触发。

### 三个 request 依次做了什么

| request | hook | 状态变化 |
|---|---|---|
| open，session C | `open` | 出现第三份状态，「空」 |
| append，session A，单元 3 | `append` | A 从单元 1–2 变成 1–3 |
| close，session B | `close` | B 的四个单元释放，变成红色虚线框「已释放」 |

### 在 SGLang-Omni 里

- 标记名是 `omni_session`（`proto/session.py`）。hook 是 `SessionHooks`（`scheduling/session.py`），除了 open、append、close，还有 `control`（中断等事件）和 `usage`（session 状态占多少字节），即第一条脚注。
- 读标记的是 `SessionScheduler`，它是第 17 章第 8 步一次 pass 的 `SimpleScheduler` 的子类。
- thinker 和 talker 跑的是 SGLang 自己的 scheduler 循环（第 17 章第 9 步）。在那里由 `ARSessionBridge` 把 open 变成 SGLang 的 `SessionController.open`，把 append 变成一个接在该 session KV cache 后面的 request。
- 每个 stage 为每个 session 记一个游标（cursor），一个 session 的操作按到达顺序执行。第 7 步依赖这一点。

### 接下来

第 7 步讲第 2 条：一次一个单元，要花多少时间。

## 第 7 步 · 2 / 3 · 进入时一次一个单元

> **一句话：** 单元按真实时间每秒到一个，却要等前一个做完才能开始；一个单元耗时超过 1 s，等待的音频就越积越多。

### 图上是什么

- 两个面板，上「每个单元耗时 0.8 S · 跟得上」，下「每个单元耗时 1.5 S · 跟不上」。
- 每个面板两行：「听众」一行，单元 1–12 随时间填入，浅琥珀是正在说或已送入，**实琥珀**是说完了还在等；「四个 stage」一行，深色块是单元在跑，虚线从单元说完处连到它开始跑的位置。
- 时间轴 0–12 s。这一步只播放一次就停。

### 公式

$$
r_k = k \cdot t_{\text{unit}},\qquad
s_k = \max\!\left(r_k,\ s_{k-1} + t_{\text{run}}\right),\qquad
s_1 = r_1
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $t_{\text{unit}}$ | 一个单元的音频时长 | 1 s | 第 2 步 |
| $t_{\text{run}}$ | 一个单元走完四个 stage 的时间 | 0.8 s / 1.5 s | 本步，示意值 |
| $r_k$ | 单元 $k$ 说完、可以送入的时刻 | | 本步 |
| $s_k$ | 单元 $k$ 开始跑的时刻 | | 本步 |

规则：就绪了、并且前一个做完了，单元才开始。这和第 20 章第 1 步的 $s_i = \max(a_i, e_{i-1})$ 是同一种「两件事都成立才开始」。

### 代入图上的数

| $k$ | $r_k$ | $t_{\text{run}} = 0.8$ 时 $s_k$ | $t_{\text{run}} = 1.5$ 时 $s_k$ |
|---|---|---|---|
| 1 | 1 | 1 | 1 |
| 2 | 2 | max(2, 1.8) = 2 | max(2, 2.5) = 2.5 |
| 3 | 3 | max(3, 2.8) = 3 | max(3, 4) = 4 |
| 8 | 8 | 8 | 11.5 |
| 9 | 9 | 9 | 13 |

- $t_{\text{run}} = 0.8$：每个单元一就绪就开始，在 $k + 0.8$ s 做完，没有等待。
- $t_{\text{run}} = 1.5$：$s_k = 1 + 1.5(k-1)$，单元 $k$ 就绪后要等 $0.5(k-1)$ s。动画停在 12 s 时开始了 8 个（单元 8 在 11.5 s），单元 9–12 实琥珀等待，共 4 s 音频。

### 多久开始拒收

- 每 $1.5 \div (1.5 - 1) = 3$ s 到达 3 个单元、做完 2 个，多积压 1 s（第一条图例）。
- 服务器保存已收到、未做完的音频，最多 60 s：`max_input_bytes` = 60 s × 16,000 采样/s × 2 字节 = 1,920,000 字节，超出时对 append 回 `buffer_overflow`（`serve/realtime/types.py`、`runtime.py`）。
- 第 179 s 时做完 118 个单元，积压 $179 - 118 = 61$ s，超过 60：约 3 分钟后开始拒收（第二条图例）。
- 跟得上的条件：$t_{\text{run}} \le t_{\text{unit}} = 1$ s。

### 接下来

第 8 步讲第 3 条：session 的状态占多少显存。

## 第 8 步 · 3 / 3 · 在 GPU 上，整个通话期间的 KV cache

> **一句话：** 半小时收听仅 thinker 的 KV cache 就是 2.2 GB，并且一直留到通话结束；GPU 0 放完权重后约放得下 7 个这样的通话。

### 图上是什么

- 「一次通话」：算式「收听 30 分钟 × 每秒 13 个位置 × 96 KB = 2.2 GB」，下面一行说明这只是 Qwen3-Omni thinker 的 KV cache。
- 「GPU 0，一块 H100」长条，80 GB：深色「权重 63.8 GB」，后面 7 个蓝色块各是一个通话。
- 括线：「默认布局下 GPU 0 的权重（第 19 章第 1 步）」和「7 次通话 × 2.2 GB 填满剩余空间」。

图上用的是 Qwen3-Omni 的 thinker，因为本书推导过它的数；不是 MiniCPM-o 的。

### 公式

$$
M_{\text{call}} = T_{\text{call}} \times p_{\text{aud}} \times b_{\text{kv}},\qquad
n_{\text{fit}} = \left\lfloor \frac{M - W_0}{M_{\text{call}}} \right\rfloor
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $T_{\text{call}}$ | 通话时长 | 30 min = 1,800 s | 本步 |
| $p_{\text{aud}}$ | 每秒音频的位置数 | 13 | 第 16 章第 2 步：每秒 100 个特征帧 × 每 100 帧 13 个位置 |
| $b_{\text{kv}}$ | thinker 一个位置的 k 和 v，所有层 | 96 KB | 第 19 章第 4 步 |
| $M_{\text{call}}$ | 一个通话的 thinker KV cache | | 本步 |
| $M$ | 一块 H100 的内存 | 80 GB | `src/numbers.ts` 的 `HBM_GB` |
| $W_0$ | 默认布局下 GPU 0 的权重 | 63.8 GB | 第 19 章第 1 步 |
| $n_{\text{fit}}$ | 放得下几个通话，向下取整 | | 本步 |

第 2 步的 $T_{\text{call}}$ 是 60 s 的例子；这一步换成半小时。

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| $b_{\text{kv}}$ | 48 层 × 4 个 KV head × 128 × 2 (k, v) × 2 B | 98,304 B = 96 KB |
| 位置数 | 1,800 × 13 | 23,400 |
| $M_{\text{call}}$ | 23,400 × 96 KB = 2,246,400 KB | **2.2 GB** |
| $W_0$ | (30.5 + 0.65 + 0.54 + 0.22) × 10⁹ 参数 × 2 B | 63.8 GB |
| 剩余 | 80 − 63.8 | 16.2 GB |
| $n_{\text{fit}}$ | ⌊16.2 ÷ 2.25⌋ = ⌊7.2⌋ | **7**（7 × 2.25 = 15.7 GB） |

2.2 GB 是按 1 GB = 10⁶ KB 换算的，和图一致；96 KB 本身是 98,304 B，按字节算是 $23{,}400 \times 98{,}304 \approx 2.30 \times 10^9$ B。两种算法都得 7 个。

### 说明

- 第 3 步的 request 做完就释放；session 把这 2.2 GB 一直留到 close。
- 7 是上界：工作内存会占去剩余的一部分（脚注）。默认布局下 talker 的 KV cache 在 GPU 1 上，不算在这里。
- MiniCPM-o 启动时就为满长度 session 预留空间，默认 2 个（`max_sessions`，`models/minicpm_o/native_config.py`），即第二条图例。它的 thinker 一个 session 最多 8,192 个 token 的历史。

这是本章最后一步。
