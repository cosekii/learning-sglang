## 第 1 步 · 启动服务器

> **一句话：** `sglang serve` 把 16 GB 权重放上 GPU，剩下的显存大部分划成 KV pool，打开 HTTP 端口 30000，然后等。

### 图上是什么

- 顶部一行命令：`sglang serve --model-path … --port 30000`。
- 左边「HTTP 服务器」方框：监听 :30000 · 异步 · 数千个连接；下面「分词器」：文本 ↔ id。
- 右边「scheduler 循环」方框，里面是「GPU · 80 GB」一根条：
  - 左边蓝色实心段「权重」，宽度是整根的 16 ÷ 80 = 20%。
  - 右边青色虚线框「KV pool · 64 GB，空」：还没有任何 request 的 k、v。
- 方框底部两行：等待列表：空 · 运行：无；轮询收件箱，还没有 GPU 工作。
- 底部灰色脚注：权重只加载一次；KV pool 占第 7 章第 1 步那 64 GB 的大部分；第 6 章第 9 步的循环已经在转。

### 公式

$$
M_{\text{room}} = M_{\text{HBM}} - M_W,\qquad
N_{\text{tok}} = \frac{M_{\text{room}}}{m_{kv}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $M_{\text{HBM}}$ | 一块 H100 的显存 | 80 GB | `src/numbers.ts` 的 `HBM_GB` |
| $M_W$ | Llama-3-8B 的权重 | 16 GB | 第 4 章第 2 步；`W_GB` |
| $M_{\text{room}}$ | 权重之外能给 KV cache 的空间 | | 第 7 章第 1 步 |
| $m_{kv}$ | 一个 token 在全部层的 k 和 v | 128 KB = 131,072 B | 第 3 章第 9 步；`KB_PER_TOKEN` |
| $N_{\text{tok}}$ | 这片空间最多能存几个 token 的 k、v | | 本步 |

单位和第 7 章一样：GB 按 10⁹ B，KB 按 1,024 B。

### 代入图上的数

| 量 | 计算 | 结果 | 图上 |
|---|---|---|---|
| 权重占条宽 | 16 ÷ 80 | 20% | 蓝色段 |
| $M_{\text{room}}$ | 80 − 16 | 64 GB | KV pool · 64 GB |
| $N_{\text{tok}}$ | 64 × 10⁹ ÷ 131,072 | 约 488,000 个 token | |

对照第 7 章第 2 步：上下文 2k 时装 238 个 request，238 × 2,048 ≈ 487,000 个 token，是同一个数。

### 脚注里的「大部分」

SGLang 用 `--mem-fraction-static` 规定权重加 KV pool 最多占显存的比例，不设时一张 80 GB 的卡约 0.83；剩下约 17% 留给计算时的中间结果和 CUDA graph（第 11 章）。所以实际的 pool 约 55 GB，第 7 章第 1 步算过。图上按 64 GB 画。

### 启动时还做了什么

- `sglang serve` 是新的命令行入口，旧写法是 `python -m sglang.launch_server`；`--port` 不写时就是 30000。
- 模型只加载一次，之后每个 request 都用这同一份权重。
- 启动后 scheduler 的循环（第 6 章第 9 步）立刻开始转：每一圈先查收件箱，等待列表为空，就没有 GPU 工作可做。
- 这里画了两个方框；它们其实是几个进程、为什么要分开，第 4、5 步讲。

### 接下来

第 2 步：一个客户端发来 request。

## 第 2 步 · 客户端发来一个 request

> **一句话：** 客户端 POST 一段 JSON，服务器解析它、套上聊天模板，得到一个字符串；GPU 要的是 id，所以还得转换。

### 图上是什么

- 左边新出现「客户端」方框：`POST /v1/chat/completions`、`stream: true`。
- 一根蓝色箭头，标 JSON，从客户端指向 HTTP 服务器。
- HTTP 服务器方框的边框变成蓝色粗线：现在是它在干活。
- scheduler 方框和第 1 步一样：还没有东西到它那里。

### 这个 request 长什么样

- `POST /v1/chat/completions` 是 OpenAI 兼容的接口；SGLang 实现了同样的格式，现成的 OpenAI 客户端可以直接连。
- JSON body 里有聊天消息（一组 `role` 和 `content`）和 `stream: true`。
- `stream: true` 要求答案一个 token 一个 token 地发回，不要等全部生成完再一次给；发回来的样子见第 9 步。

### 服务器做的两件事

1. **解析 JSON**：把请求体变成 Python 对象。
2. **套聊天模板**：每个模型训练时用的对话格式不同。模板把各条消息拼成一个字符串，在每条前后加上这个模型认得的角色标记（谁是 system、谁是 user、哪里轮到 assistant 说话）。

得到的是文本。模型的输入是一串整数 id（第 1 章第 2 步），所以下一步要把它切成 token。

### 接下来

第 3 步：分词，得到 id，然后问这些 id 怎么送到 scheduler。

## 第 3 步 · 分词，然后 id 要送到 scheduler

> **一句话：** 分词器把文本变成 5 个 id；这是 CPU 上的 Python 工作，而 scheduler 循环在 GPU 步之间也要用 CPU。

### 图上是什么

- 服务器方框里：`"The capital of France is"` → `791 6864 315 9822 374`。
- 一根灰色虚线箭头，标 `ids → ?`，从服务器指向 scheduler：还不知道怎么送过去。
- 左下「服务器 · 客户端随时发来」：6 段蓝色短条，间距和宽度都不规则。下面两行：解析 JSON、分词：µs 到 2 ms；每个 token：id → 文本，写出去。
- 右下「scheduler 循环 · 有 request 在跑时每步一次」：3 组「黑色窄条 + 橙色 GPU 步」。下面两行：GPU 步每次 4.8 ms，第 4 章第 5 步的权重读取；黑条是步之间在 CPU 上选下一个 batch。
- 底部两行带点的说明：两边都是 Python 代码、都在 CPU 上运行；最简单的交接是放一个进程里、用函数调用传 id。

### 公式

$$
t_{\text{step}} = \frac{M_W}{BW}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $M_W$ | 权重字节数 | 16 GB | 第 1 步 |
| $BW$ | HBM 带宽 | 3.35 TB/s | `src/numbers.ts` 的 `BW` |
| $t_{\text{step}}$ | 一个 decode 步的耗时：读一遍权重 | | 第 4 章第 5 步 |

### 代入图上的数

| 量 | 计算 | 结果 | 图上 |
|---|---|---|---|
| $t_{\text{step}}$ | 16 ÷ 3.35 | 4.78 ms | GPU 步：每次 4.8 ms |

GB ÷ TB/s 正好是 ms。下面几步都用 $t_{\text{step}} = 4.78$ ms。

### 这 5 个 id

和第 1 章第 2 步是同一句话、同一个分词器（Llama-3 的），所以是同样的 5 个 id；第 2 章第 2 步用 9822 去查 `␣France` 的那一行。分词耗时随 prompt 长度增长：5 个 token 是几微秒，长 prompt 要几毫秒。

### 两边的节奏

- **服务器：** 客户端什么时候发来、发多长，它不能决定，所以蓝条的出现没有规律。
- **scheduler：** 有 request 在跑时，它一圈接一圈：CPU 上选 batch（黑条），然后 GPU 跑一步（橙条，4.78 ms），再回到顶部。

两边都要 CPU。问题是放在一起会不会互相拖慢，第 4 步试最简单的做法。

### 接下来

第 4 步：都放一个进程里，看 GPU 空了多少。

## 第 4 步 · 全放一个进程：GPU 空转 25%

> **一句话：** 一个进程只有一个线程能跑 Python，其他工作只能挤在 GPU 步之间；图上 31.9 ms 里 GPU 空了 8.0 ms。

### 图上是什么

- 行标题：一个进程 · 所有工作共用一个 Python 解释器（GIL）和一个核。
- 「唯一的线程」一行：16 段首尾相接。橙色是 GPU 步（标「步」），其余按颜色区分：紫色解析 JSON、蓝色分词、青色反分词、绿色写响应。
- 「GPU」一行：线程在步里时是橙色，其余时间是浅灰；两段较长的灰色标了「空闲」。
- 时间轴 0、10、20、30 ms，下面是 5 种颜色的图例。
- 两行带点的说明：GPU 空闲 25% 的时间，空隙是随机的；4.8 ms 的一步不能和花毫秒的工作共用解释器。

### GIL 是什么

CPython（官方的 Python 解释器）有一把 **GIL**（global interpreter lock，全局解释器锁）：一个进程里同一时刻只有一个线程在执行 Python 代码。所以多开线程也没用，所有工作排成一行。scheduler 发起一步后要等结果才能接着做别的，别的工作只能放在步与步之间，这段时间 GPU 没活。

### 公式

$$
T_{\text{busy}} = N_{\text{step}} \times t_{\text{step}},\qquad
T_1 = T_{\text{busy}} + T_{\text{idle}}
$$

$$
\text{空闲比例} = \frac{T_{\text{idle}}}{T_1}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $N_{\text{step}}$ | 图上的 GPU 步数 | 5 | 本步 |
| $t_{\text{step}}$ | 一步的耗时 | 4.78 ms | 第 3 步 |
| $T_{\text{busy}}$ | GPU 在工作的时间 | | 本步 |
| $T_{\text{idle}}$ | 其他工作的时间之和，这时 GPU 空着 | | 本步 |
| $T_1$ | 一个进程时整行的长度 | | 本步 |

### 代入图上的数

| 工作 | 次数 × 单次 | 合计 |
|---|---|---|
| GPU 步 | 5 × 4.78 | 23.9 ms |
| 反分词 | 4 × 0.4 | 1.6 ms |
| 写响应 | 4 × 0.6 | 2.4 ms |
| 解析 JSON | 1 × 0.3 | 0.3 ms |
| 分词 | 2.1 + 1.6 | 3.7 ms |
| $T_{\text{idle}}$ | 1.6 + 2.4 + 0.3 + 3.7 | **8.0 ms** |
| $T_1$ | 23.9 + 8.0 | **31.9 ms** |
| 空闲比例 | 8.0 ÷ 31.9 | **25%** |

四个空隙依次是 1.0、3.4、1.0、2.6 ms：每步之后都有反分词 0.4 + 写响应 0.6；第 2 步后多一个新 prompt 的 0.3 + 2.1；第 4 步后多一次 1.6 的分词。客户端平均每 31.9 ÷ 5 = 6.4 ms 收到一个 token，而不是每 4.78 ms。

这些 CPU 耗时是为演示选的样例值；真实的大小取决于客户端发来什么，所以说明里说空隙是随机的。

### 接下来

第 5 步把同样的 16 段分到三个进程里。

## 第 5 步 · 拆成三个进程：24 ms 而不是 32

> **一句话：** 同样的工作分到三个进程、三个解释器、三个核上，scheduler 那一行只剩 5 个首尾相接的步，24 ms 跑完。

### 图上是什么

- 行标题：三个进程 · 三个解释器 · 三个核 · 同样的工作，24 ms 而不是 32。
- 三条泳道：「服务器 + 分词器」「scheduler + GPU」「反分词器」。第 4 步的 16 段滑进各自的泳道。
- scheduler 泳道：5 个橙色步连成一条，中间没有空隙。
- 其他段落在别的泳道上，和步同时进行。
- 时间轴 0、5、10、15、20 ms。
- 说明：GPU 泳道是满的，给下一个 prompt 分词、反分词上一步的 token，与当前这一步同时进行。
- 底部灰色脚注：张量并行下每个 GPU 一个 scheduler 进程（第 24 章）；服务器和反分词器仍各一个。

### 公式

$$
T_3 = N_{\text{step}} \times t_{\text{step}},\qquad
T_1 - T_3 = T_{\text{idle}}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_3$ | 三个进程时 scheduler 泳道的长度 | 本步 |
| $T_1, T_{\text{idle}}, N_{\text{step}}$ | 一个进程时的总长、空闲时间、步数 | 第 4 步 |

### 代入图上的数

| 量 | 计算 | 结果 | 图上 |
|---|---|---|---|
| 5 步的开始时间 | $0, t_{\text{step}}, 2t_{\text{step}}, 3t_{\text{step}}, 4t_{\text{step}}$ | 0、4.78、9.55、14.33、19.10 ms | |
| $T_3$ | 5 × 4.78 | 23.9 ms | 24 ms |
| $T_1$ | 第 4 步 | 31.9 ms | 32 |
| 省下 | 31.9 − 23.9 | 8.0 ms | 正好是第 4 步的 $T_{\text{idle}}$ |

### 其他段落在哪

| 段 | 时间 | 落在 |
|---|---|---|
| 解析 JSON | 0.4–0.7 ms | 第 1 步里 |
| 第一次分词 | 0.9–3.0 ms | 第 1 步里 |
| 第 k 步的反分词 | 第 k 步结束后 0.1 ms 开始，花 0.4 ms | 第 k + 1 步里 |
| 第 k 步的写响应 | 第 k 步结束后 0.7 ms 开始，花 0.6 ms | 第 k + 1 步里 |
| 第二次分词 | 2 × 4.78 + 1.6 = 11.2 ms 开始 | 第 3 步里 |

### 为什么能重叠

- 每个进程有自己的解释器和自己的 GIL，可以在不同的 CPU 核上同时跑。
- scheduler 构建第 k + 1 步只需要第 k 步的 id；把 id 变成文本、写到 socket，都不在它的路径上。

图上省掉了 scheduler 自己在步之间的 CPU 工作（第 3 步的黑条），那是第 10 章的内容。

### 接下来

三个进程之间要传东西。第 6 步讲用什么传。

## 第 6 步 · ZeroMQ：进程之间的队列

> **一句话：** 进程 1 把消息放进队列就回去接活；进程 2 只在每步开头取走所有已到的消息；谁也不等谁。

### 图上是什么

- 左边蓝框「服务器 + 分词器」，进程 1 · 自己的循环：接收 → 分词 → 放入。
- 右边橙框「scheduler」，进程 2 · 自己的循环：取走 → 跑一步 → 放入。框里一根橙色进度条：一步正在跑。
- 中间「zmq socket · 一个队列」，6 个虚线空格。左边箭头「放入」，右边箭头「取走」。
- 动画（每次进入这一步播放一次）：
  1. request 1、2、3 依次分好词放进队列，左下写「request N 分词完 → 放入 → 继续接收」。
  2. 进度条走满，右下写「步完成 → 一次取走全部 3 个」，3 个蓝块飞到右边。
  3. 「下一步：3 个新来的进等待列表」，scheduler 框里出现 3 个蓝色小块。
- 下方一行：进程 1 放入就继续 · 进程 2 在下一步开头取走全部。
- 最后两行带点的说明：每条线都是同样的形状；底下是 Unix socket，几十微秒，消息在接收方的队列里等到它来取。

### ZeroMQ 是什么

ZeroMQ（zmq）是一个消息库。两个进程各拿 socket 的一端：一端发消息，消息在库里排队，另一端想读时再读。发送方不用等接收方准备好。

SGLang 里 scheduler 读收件箱的方式（`managers/scheduler_components/request_receiver.py`）：

- 循环调用 `sock_recv(socket, zmq.NOBLOCK)`。NOBLOCK 表示队列空了就立刻返回（抛 `zmq.Again`），不会停下来等。
- `sock_recv` 默认就是 `recv_pyobj`：收到的是用 pickle 打包的 Python 对象（由环境变量 `SGLANG_USE_PICKLE_IPC` 控制，默认开）。
- 每圈取几个默认不限（`SGLANG_SCHEDULER_MAX_RECV_PER_POLL = -1`），一直取到队列空。
- 这一步发生在 scheduler 主循环每圈的最前面，然后才是选 batch 和跑一步。

### 公式

$$
t_{\text{wait}} < t_{\text{step}},\qquad
\text{传输占比} = \frac{t_{\text{ipc}}}{t_{\text{step}}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $t_{\text{wait}}$ | 一步中途到达的消息在队列里等多久 | | 本步 |
| $t_{\text{step}}$ | 一步的耗时 | 4.78 ms | 第 3 步 |
| $t_{\text{ipc}}$ | 一次 Unix socket 传输 | 几十微秒，按 50 µs 算 | 图上说明 |

### 代入图上的数

| 量 | 计算 | 结果 |
|---|---|---|
| 最长排队 | 刚开步就到达，要等满一步 | 不到 4.78 ms |
| 传输占比 | 0.05 ÷ 4.78 | 约 1% |

动画放慢了约 900 倍：进度条走一步用 4.4 s，真实的一步是 4.78 ms。

### 接下来

第 7 步：三个进程、三条线上各传什么。

## 第 7 步 · 三条线、三个队列，request 沿外圈走

> **一句话：** 每条线是一个 zmq 队列，由一个进程写、另一个读；同一个 request 每跳换一种消息格式，rid 不变。

### 图上是什么

- 三角形外圈三个进程：左上蓝框进程 1（服务器 + 分词器），右上橙框进程 2（scheduler），下方青框进程 3（反分词器）。
- 内圈三个队列，各两格有消息。颜色表示谁写：蓝色 1 → 2，橙色 2 → 3，青色 3 → 1。
- 灰色箭头：写的进程 → 队列 → 读的进程。
- 三张消息卡片，按传递顺序：
  - 顶部蓝色 `TokenizedGenerateReqInput`：rid a1f3 · ids […]
  - 右下橙色 `BatchTokenIDOutput`：rids […] · ids [12366, …]
  - 左下青色 `BatchStrOutput`：rids […] · [" Paris", …]
- 底部一行：任何传输 · 这里用 ipc://；data-parallel attention 用 tcp://（第 26 章），代码相同。

### 三种消息

它们都定义在 SGLang 的 `managers/io_struct.py`。

| 线 | 消息 | 粒度 | 主要内容 |
|---|---|---|---|
| 1 → 2 | `TokenizedGenerateReqInput` | 每个 request 一条 | `rid`、`input_ids`（第 3 步的 5 个 id）、`sampling_params`、`stream` |
| 2 → 3 | `BatchTokenIDOutput` | 每步一条，覆盖整个 batch | `rids` 列表、每个 rid 这一步新出的 id、`finished_reasons` |
| 3 → 1 | `BatchStrOutput` | 每步一条 | 同样的 `rids`、`output_strs`（新的文本片段） |

这个 request 这一步新出的 id 是 12366，反分词后是 `" Paris"`（带前导空格的 Paris）。

### rid 的作用

rid 是 request 的名字，三种消息里都带着它。进程 1 持有每个打开的响应流（源码里是 `TokenizerManager.rid_to_state`），收到 `BatchStrOutput` 后按 rid 找到对应的客户端连接，把文本写给它。

### ipc:// 和 tcp://

队列的地址是一个 URL。

- `ipc://`：同一台机器上的 Unix socket 文件。SGLang 默认给每条线建一个临时文件。
- `tcp://`：走网络。开了 data-parallel attention 时，SGLang 改用 tcp://，单机和多机都这样（源码 `PortArgs.init_new` 的注释）。
- 发送和接收的代码对两者是一样的，只换地址。

### 接下来

第 8 步：进程 2 收到消息后，在里面变成什么。

## 第 8 步 · 在 scheduler 里变成 Req

> **一句话：** 进程 2 把消息变成 `Req` 对象，它进等待列表、做一次 prefill，然后每步出一个 id，每步约 4.8 ms。

### 图上是什么

- 行标题：一个 request 走完全程。三个方框都改名为「进程 1 · 服务器」「进程 2 · scheduler」「进程 3 · 反分词器」；scheduler 方框是橙色粗边框。
- 服务器到 scheduler 的蓝色箭头，标 ids；其余箭头灰色：scheduler → 反分词器（token ids · zmq），反分词器 → 服务器（文本 · zmq），服务器 → 客户端。
- GPU 条的 KV pool 改标「64 GB，pages」。
- scheduler 方框里：等待 → **prefill** → 运行 → **decode**；下面 7 个小方块，第 1 个蓝色，后 6 个橙色，依次飞入；右边「→ 每 4.8 ms 出一个 id」。
- 最下一行：`Req` · rid · 输入 id · 输出 id · pages · 采样。
- 反分词器方框里：12366 → " Paris" · 13 → "."。

### Req 的字段

`Req` 是 scheduler 表示一个 request 的对象（SGLang `managers/schedule_batch.py`）。

| 图上 | 源码字段 | 是什么 | 从哪来 |
|---|---|---|---|
| rid | `rid` | request 的名字 | 第 7 步 |
| 输入 id | `origin_input_ids` | prompt 的 5 个 id | 第 3 步 |
| 输出 id | `output_ids` | 已生成的 id，每步多一个 | 第 1 章第 4 步 |
| pages | `req_pool_idx` | 它在 `req_to_token_pool` 里的一行，记着每个位置的 k、v 在 KV pool 的哪一格 | 第 7 章第 4 步 |
| 采样 | `sampling_params` | 温度等挑 token 的参数 | 第 1 章第 4 步 |

开头的 pages 可能直接指向别的 request 已经算好的共享前缀（第 8 章第 2 步）。

### 那排方块

- 先在等待列表里等，直到 scheduler 选中它（第 6 章第 2 步）。
- 蓝色：一次 prefill，处理 5 个 prompt token。
- 橙色：decode 步，每步出 1 个 id。

### 代入图上的数

| 方块 | token 数 | 耗时 |
|---|---|---|
| prefill | 5 | 约 $t_{\text{step}}$：5 远低于第 4 章第 8 步约 300 的分界点，耗时还是读一遍权重 |
| decode | 1 | $t_{\text{step}} = 4.78$ ms（第 3 步） |

所以每个方块约 4.8 ms，就是标签上的「每 4.8 ms 出一个 id」。这里假设 batch 里的 token 总数也低于约 300；batch 怎么组是第 6 章的事。

### 结束以后

Req 生成到结束 token 或长度上限后离开运行列表。它的 page 默认不会立刻清空：SGLang 默认开着 prefix caching，page 留在 cache 里，等有相同开头的 request 来复用，不够用时才按最久未用驱逐（第 7 章第 5 步的脚注、第 8 章第 7 步）。

### 接下来

第 9 步：新出的 id 怎么回到客户端。

## 第 9 步 · 回程：id → 文本 → 推送事件

> **一句话：** 每步之后新 id 送到反分词器变成文本，再回到服务器，按 rid 找到连接，作为一条 server-sent event 发给客户端；相邻两条间隔一步，4.8 ms。

### 图上是什么

- 服务器方框（蓝色粗边框）和反分词器方框（青色粗边框）被高亮。
- 青色箭头：scheduler → 反分词器（token ids · zmq）、反分词器 → 服务器（文本 · zmq）。
- 绿色箭头：服务器 → 客户端。
- 左下绿框里两行：
  - `data: {"choices":[{"delta":{"content":" Paris"}}]}`
  - `data: {"choices":[{"delta":{"content":"."}}]}`
- 右边：← 每 token 一条推送事件，间隔 4.8 ms。

### 回程的每一跳

| 跳 | 消息 | 内容 |
|---|---|---|
| 进程 2 → 进程 3 | `BatchTokenIDOutput` | 12366、13 等新 id |
| 进程 3 里 | | `12366 → " Paris"`、`13 → "."` |
| 进程 3 → 进程 1 | `BatchStrOutput` | 文本片段，带 rid |
| 进程 1 → 客户端 | server-sent event | 一行 `data:` 开头的 JSON |

**server-sent event（SSE）**：服务器在一个一直开着的 HTTP 响应里，一次写一行 `data: …`，客户端收到一行处理一行。新文本放在 `choices[0].delta.content`，这是 OpenAI 流式接口的格式。这就是第 2 步 `stream: true` 要的东西。

### 公式

$$
\Delta t_{\text{event}} = t_{\text{step}},\qquad
\text{滞后} = 0.7 + 0.6\ \text{ms}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $\Delta t_{\text{event}}$ | 相邻两条事件的间隔 | 本步 |
| $t_{\text{step}}$ | 一步的耗时，4.78 ms | 第 3 步 |
| 0.7、0.6 | 写响应在步结束后的开始时刻和时长 | 第 5 步 |

### 代入图上的数

| 量 | 计算 | 结果 |
|---|---|---|
| 事件间隔 | 每步一条 | 4.78 ms，图上 4.8 ms |
| 每条比它那一步晚 | 0.7 + 0.6 | 步结束后 1.3 ms 内写完，这时下一步已在跑 |

### 整条链

字符串（第 2 步）→ id（第 3 步）→ `TokenizedGenerateReqInput`（第 7 步）→ `Req`（第 8 步）→ 新 id → 文本 → 事件。

### 接下来

每步选哪些 request 进 batch，是第 6 章第 9 步的循环。进程 2 每 4.8 ms 出一个 id，除了选 batch 和跑 GPU 还要做什么，是第 10 章。
