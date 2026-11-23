## 第 1 步 · 每条边传什么、多大、多频繁

> **一句话：** 第 17 章第 12 步的八条边，传的东西从一个 token id 到 3,136 KB 的 embedding 不等，有的每个 request 发一次，有的每个 token 发一次。

### 图上是什么

- 上半部分：第 17 章第 12 步的七个 stage，八条边画成红色，红圈里是边号。
- 下半部分：一张表，每条边一行，列是「边、传什么、大小、频率」。会重复发的边 6–8，频率一栏用深色字。
- 最后一行「9–11」：`talker_ar` 用和第 3–5 行相同的输入拼自己的 prompt。这三条边在上面的图里没画（第二条脚注）。

### 公式

所有大小都从「一个向量多大」算起：

$$
b_{\text{vec}} = D \times B,\qquad
S_4 = N_{\text{img}} \times b_{\text{vec}},\qquad
S_5 = N_{\text{aud}} \times b_{\text{vec}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $D$ | thinker 的宽度，一个向量里有几个数 | 2,048 | `src/numbers.ts` 的 `OMNI_HIDDEN` |
| $B$ | 每个数的字节数，bf16（16 位浮点数） | 2 B | `src/numbers.ts` 的 `BYTES` |
| $b_{\text{vec}}$ | 一个向量或一个 encoder embedding 的大小 | 4 KB | 本步 |
| $N_{\text{img}}$ | 照片在 prompt 里占的位置数 | 784 | 第 16 章第 2 步 |
| $N_{\text{aud}}$ | 问题在 prompt 里占的位置数 | 130 | 第 16 章第 2 步 |
| $S_4, S_5$ | 边 4、边 5 传的字节数 | | 本步 |

encoder 的 embedding 要占 thinker prompt 里的一个位置，所以宽度和 thinker 一样，也是 $D$。

### 代入图上的数

| 边 | 算式 | 结果 |
|---|---|---|
| 7 | $2{,}048 \times 2\ \text{B} = 4{,}096\ \text{B}$ | 4 KB |
| 4 | $896 \div 32 = 28$，$28 \times 28 = 784$；$784 \times 4\ \text{KB}$ | 3,136 KB |
| 5 | $10\ \text{s} \times 100 = 1{,}000$ 帧，每 100 帧 13 个位置 → 130；$130 \times 4\ \text{KB}$ | 520 KB |
| 1 | $896 \times 896 \times 3$（红、绿、蓝） | 2,408,448 个值 |
| 2 | $10\ \text{s} \times 100$ | 1,000 个特征帧 |
| 8 | $10\ \text{帧} \times 16$ 个 code | 160 个数 |

边 4 里的 32：每个 patch 16 像素见方，再 2 × 2 合并，一个位置盖住 32 像素见方。边 8 的 10 帧是 $10 \times 80\ \text{ms} = 800\ \text{ms}$ 的声音（每帧 $1{,}920 \div 24{,}000\ \text{s} = 80\ \text{ms}$，第 16 章第 3 步）。

### 两半代价

- **大小：** 最大的消息是边 4 的 3,136 KB，但只发一次。
- **频率：** 边 6、7 每个 token 都发，边 8 每 10 帧发一次，它们都只有几 KB 或更小。

### 接下来

第 2 步放大边 7，看一次交接具体走哪几跳。

## 第 2 步 · 一次交接：数据和通知分开走

> **一句话：** 交接分两部分：数据写到接收方读得到的地方，一条 ZMQ 小通知说在哪；接收方读完回一个 ack，发送方就能释放那块空间。

### 图上是什么

- 左框：GPU 0 上的 `thinker`；右框：GPU 1 上的 `talker_ar`。两框都按第 17 章第 2 步画：上面 runtime（和别的 stage 打交道），中间 outbox / inbox，下面 scheduler（自己的循环）。
- 两框之间上方是控制平面，一个 ZMQ socket：实线向右是通知，虚线向左是 ack。
- 两框之间下方是蓝色的数据平面框：接收方能读到的一块空间。
- 橙色胶囊 `vector`：这个 token 的 4 KB 向量（第 1 步边 7）。图下一行写当前这一跳。
- 右上角「loops」进度条：动画循环播放。

### 七跳

| 跳 | 在哪 | 做什么 |
|---|---|---|
| 1 | thinker 内 | scheduler 把向量放进 outbox |
| 2 | thinker 内 | runtime 取出，查下一个 stage：`talker_ar` |
| 3 | 数据平面 | runtime 把向量写到 `talker_ar` 读得到的地方 |
| 4 | 控制平面 | 经 ZMQ 发一条通知，说向量在哪 |
| 5 | talker_ar 内 | runtime 被通知唤醒，读取向量 |
| 6 | 控制平面 | 回一个 ack；数据平面框变成白色虚线，表示空出来了 |
| 7 | talker_ar 内 | 向量放进 inbox，scheduler 按自己的节奏取 |

ZMQ 就是第 9 章第 6 步那种进程间的消息队列。

### SGLang-Omni 里的名字

- 通知是 `DataReadyMessage`：写明 request、两端 stage 和数据在哪。
- 回执是 `DataAckMessage`：发送方收到后才复用那块空间。
- 数据平面具体怎么实现，取决于这条边（第 4 步）。

### 接下来

第 3 步回答：为什么不把数据本身也塞进 ZMQ 消息里。

## 第 3 步 · 为什么通知和数据分开走

> **一句话：** ZMQ 消息是 CPU 内存里的字节，GPU 上的向量走 ZMQ 要搬 4 趟；数据单独走，GPU 到 GPU 只要 1 趟。

### 图上是什么

- 上一行「everything through ZMQ」：五个框 `GPU 0 memory → CPU memory → ZMQ socket → CPU memory → GPU 1 memory`，四个红箭头分别标「离开 GPU、进入 socket、离开 socket、回到 GPU」，下面红字「4 趟」。
- 下一行「notice through ZMQ, data on its own path」：两个蓝框 GPU 0、GPU 1 之间一条蓝色粗箭头，「1 趟，GPU 到 GPU」；下面灰色虚线穿过一个 `ZMQ socket` 框，只带通知。
- 两条带点的说明、一条脚注（趟数按整份数据的移动计，方框不按比例）。

### 公式

$$
\text{搬的字节} = n_{\text{trip}} \times S
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $n_{\text{trip}}$ | 整份数据从一块内存搬到另一块的次数 | 本步：上行 4，下行 1 |
| $S$ | 要送达的数据大小 | 第 1 步 |

### 代入图上的数

| 数据 | $S$ | 全走 ZMQ（$n_{\text{trip}} = 4$） | 分开走（$n_{\text{trip}} = 1$） |
|---|---|---|---|
| 边 7，每个 token | 4 KB | $4 \times 4 = 16$ KB | 4 KB |
| 边 4，encoder 的 embedding | 3,136 KB | $4 \times 3{,}136 = 12{,}544$ KB | 3,136 KB |

### 为什么分开就能选路

- 通知只有几个字段，正适合 ZMQ。
- 不管数据走哪条路，通知长得都一样，所以每条边可以各选各的数据路径。

### 接下来

第 4 步列出数据可以走的四条路；下一行这条 GPU 到 GPU 的路是第 6 步。

## 第 4 步 · 四条路径：看两端 stage 在哪

> **一句话：** SGLang-Omni 按每条边两端 stage 的位置给数据选路，共四种，从同一进程到不同机器。

### 图上是什么

四行表，每行一条路径，列是「两端在哪（小图）、数据走什么、发生什么、在 Qwen3-Omni 里」：

- 小图图例（脚注）：虚线框是进程，实线框是机器，蓝框是 GPU 上的 stage，灰框是 CPU 上的 stage。
- 「数据走什么」一栏：CUDA IPC 用蓝字，shared memory 用橙字，和第 9 步的边色一致。

| 行 | 两端在哪 | 数据走 | 发生什么 | Qwen3-Omni 默认 |
|---|---|---|---|---|
| 1 / 4 | 同一进程 | 引用 | 什么都不搬，接收方拿到同一个对象 | 无 |
| 2 / 4 | 同一台机器，两端都在 GPU | CUDA IPC | 接收方打开发送方的 GPU 内存 | 边 4、5、7、8 |
| 3 / 4 | 同一台机器，一端在 CPU | shared memory | 两个进程映射同一段 CPU 内存 | 边 1、2、3、6 |
| 4 / 4 | 不同机器 | Mooncake | 网卡在机器之间复制 | 无 |

### 选路规则（源码）

SGLang-Omni 的 `CommRouter`（`comm/router.py`）按这个顺序判断：

1. 目标 stage 在同一进程 → `LOCAL_OBJECT`。
2. 目标在别的机器 → `MOONCAKE`。
3. 数据在 GPU 上、两端都是 GPU stage → `CUDA_IPC`；两块 GPU 互相读不到对方内存时退回 `SHM`。
4. 其余 → `SHM`。

### 代入图上的数

八条边：$4 + 4 = 8$。路径 1 用不上，因为第 17 章第 4 步让每个 stage 各占一个进程；路径 4 用不上，因为两块 GPU 在同一台机器。

### 接下来

第 5–8 步按表的顺序一行讲一步。

## 第 5 步 · 1 / 4：同一进程，交出对象本身

> **一句话：** 两个 stage 在同一进程时，发送方直接把 Python 对象的引用交过去，不复制、不发通知；代价是接收方不能改它。

### 图上是什么

- 灰色虚线大框：一个进程，一个 Python 解释器、一块内存（第 17 章第 3 步）。
- 两个蓝框：stage A（发送方）、stage B（接收方），之间一条黑箭头「直接调用，带一个引用」。
- 橙框 `the payload`：内存里唯一一份。两条橙色箭头从 A、B 指向它：「A 仍持有它」「B 现在也持有它」。
- 三条带点的说明、一条脚注。

### 和第 2 步比，省了哪几跳

省掉第 3–6 跳，因为调用本身就是交接：

- 第 3 跳：不写数据平面。
- 第 4 跳：不经 ZMQ 发通知。
- 第 5 跳：不用另外读，B 已经拿到引用。
- 第 6 跳：没有 ack，没有要释放的空间。

### 代价和实测

- **共享：** A、B 拿着同一个对象，B 若修改，A 会看到，所以 B 只能读。
- **33%：** SGLang-Omni 的设计说明（PR #496）里，纯文本流水线把所有 stage 放在一个进程，改成传引用后平均延迟降了 33%。
- SGLang-Omni 把这条路径叫 `LOCAL_OBJECT`。

### 接下来

第 6 步：两端在不同进程，数据在 GPU 上。

## 第 6 步 · 2 / 4：CUDA IPC，传一个指向 GPU 内存的句柄

> **一句话：** 数据在 GPU 上、两端都是同一台机器的 GPU stage 时，通知里带一个句柄，接收方凭它打开发送方的 GPU 内存来读。

### 图上是什么

仍是边 7，数据是第 2 步那个 4 KB 向量。

- 左框 GPU 0（thinker）：「启动时划好的槽池」，画了 6 个槽，第 2 号是橙色。① 向量在 slot 2。
- 中间白框 ② 句柄 `GPU 0, slot 2`，「放在通知里，经 ZMQ」，黑箭头指向右框。
- 蓝色弧线 ③：`talker_ar` 经 GPU 之间的链路读取；右框 GPU 1 里出现一份橙色的向量。
- 底部虚线 ④：ack，slot 2 可以放下一个向量。
- 三条带点的说明，一条脚注（CUDA IPC 是 NVIDIA 让一个进程打开另一个进程 GPU 内存的机制；链路是 NVLink，没有就是 PCIe）。

### 四个编号对应第 2 步哪一跳

| 图上 | 第 2 步 |
|---|---|
| ① 写进 slot 2 | 第 3 跳，slot 就是那时的数据平面框 |
| ② 句柄随通知走 | 第 4 跳 |
| ③ 跨链路读，在 GPU 1 得到副本 | 第 5 跳，也是第 3 步下一行的 1 趟 |
| ④ ack 释放 slot | 第 6 跳 |

### 槽池有多大（源码）

图上画 6 个槽是示意。SGLang-Omni 的 CUDA IPC relay 默认池子是 $512\ \text{MB} \times 2 = 1{,}024\ \text{MB}$，切成 64 KB 的槽，即 $1{,}024 \times 1{,}024 \div 64 = 16{,}384$ 个。一个 4 KB 向量占一个槽。槽数固定，所以跑在前面的发送方要等 ack 才有空槽，不会把 GPU 内存占满。

### 同一块 GPU 上的边

边 4、5 两端都在 GPU 0，数据不过链路。源码里细节不同：`image_encoder` → `thinker` 走同卡直传，直接共享张量本身的句柄，不经槽池；`audio_encoder` 的配置关掉了直传，走槽池，接收方在 GPU 0 内从槽里拷一份出来。

### 退路

两块 GPU 读不到对方内存时，`CommRouter` 让这条边退回 shared memory（第 7 步）。

### 接下来

第 7 步：一端在 CPU 的边。

## 第 7 步 · 3 / 4：shared memory，写一次、原地读

> **一句话：** 数据在 CPU 内存里、或一端是 CPU stage 时，发送方把数据写进一段两个进程都映射了的共享内存，接收方原地读。

### 图上是什么

用第 1 步的边 1：CPU 上的 `preprocessing` 把照片发给 GPU 0 上的 `image_encoder`。

- 两个灰色虚线框：各自的进程，默认不共享内存。左边灰框 `preprocessing · CPU`，右边白框 `image_encoder · GPU 0`。
- 中间橙框 `shared memory`：两个进程都映射进来的一段 CPU 内存。
- 橙箭头 ① 写一次，③ 原地读；两框之间黑箭头 ② 经 ZMQ 发通知；右下角「然后拷到 GPU 0」。
- 两条带点的说明、一条脚注。

### 代入图上的数

- 边 1 写进去的是 $896 \times 896 \times 3 = 2{,}408{,}448$ 个值（第 1 步）。
- 按第 3 步的数法：一次写、一次原地读，对比全走 ZMQ 的 4 趟。读出来以后，`image_encoder` 还要把它拷上 GPU 0 才能算。

### 哪些边走这条

| 边 | 为什么 |
|---|---|
| 1、2、3 | 从 CPU 上的 `preprocessing` 出发，数据在 CPU 内存 |
| 6 | 目标 `decode` 是 CPU stage，token id 送过去 |
| 退回来的 GPU 边 | 第 6 步说的 CUDA IPC 用不了的情况 |

SGLang-Omni 把这条路径叫 `SHM`。

### 接下来

第 8 步：接收方在另一台机器上，共享内存和句柄都够不着。

## 第 8 步 · 4 / 4：Mooncake，跨机器

> **一句话：** 接收方在另一台机器上时，由 Mooncake 搬数据：网卡直接读发送方的内存、写接收方的内存，不经过任何一方的 CPU 复制。

### 图上是什么

- 两个实线大框：machine 1、machine 2。各有一个 stage、它的内存（橙框）和一块网卡（白框）。
- 橙线从 machine 1 的内存经两块网卡到 machine 2 的内存，标「the network (RDMA)」。
- 两条带点的说明、两条脚注（RDMA 是远程直接内存访问；Mooncake 是 SGLang-Omni 用的传输引擎；跨机器的部署留到多 GPU 部分）。

### 和第 2 步比

- 变的只有第 3 跳和第 5 跳的数据路径。
- 通知和 ack 仍走 ZMQ，只是现在跨机器。
- SGLang-Omni 把这条路径叫 `MOONCAKE`；`CommRouter` 只要发现目标 stage 在别的机器上就选它，不看数据在 GPU 还是 CPU。

### 默认布局为什么不用

第 4 步已经看到，Qwen3-Omni 默认的两块 GPU 在同一台机器上。SGLang 在多 GPU 部分也用同一个 Mooncake 在服务器之间搬 KV cache（第 28 章）。

### 接下来

第 9 步把第 4 步的规则套到默认布局的八条边上。

## 第 9 步 · 默认布局，逐边看

> **一句话：** Qwen3-Omni 的默认布局里，四条 GPU 到 GPU 的边走 CUDA IPC，一端在 CPU 的四条边走 shared memory，没有两个 stage 共享进程。

### 图上是什么

- 第 1 步的图，每条边按路径上色：蓝色（`--accent`）是 CUDA IPC，橙色（`--gen`）是 shared memory。
- 下方四行图例，各配一个色块；两种用不上的路径写明原因。
- 一行说明：每个 token 都跑的边 6、7 从不让数据走 ZMQ。
- 两条脚注：边 9–11 也按这些规则；这是按 `CommRouter` 规则推的，没在运行中的服务器上追踪。

### 代入图上的数

| 路径 | 边 | 为什么 |
|---|---|---|
| CUDA IPC（2 / 4） | 4、5 | encoder → thinker，都在 GPU 0，不过链路 |
| CUDA IPC（2 / 4） | 7 | GPU 0 的 thinker → GPU 1 的 `talker_ar`，过链路 |
| CUDA IPC（2 / 4） | 8 | GPU 1 的 `talker_ar` → GPU 0 的 `code2wav`，过链路 |
| shared memory（3 / 4） | 1、2、3 | 从 CPU 上的 `preprocessing` 出发 |
| shared memory（3 / 4） | 6 | 送到 CPU 上的 `decode` |
| 引用（1 / 4） | 无 | 每个 stage 各占一个进程（第 17 章第 4 步） |
| Mooncake（4 / 4） | 无 | 两块 GPU 在同一台机器 |

合计 $4 + 4 = 8$ 条。

### 和第 1 步最后一列连起来

每个 token 都发的两条边：边 6 是一个 token id，边 7 是 4 KB 向量。两条的数据都不进 ZMQ，所以都不用付第 3 步的 4 趟。

### 前提

推这张图假设每个张量留在产生它的设备上（`CommRouter` 选路时看的是数据实际在哪）。边 9–11：9 从 `preprocessing` 出发走 shared memory，10、11 从 encoder 出发走 CUDA IPC。

### 接下来

第 10 步看图外的一个进程：coordinator。

## 第 10 步 · coordinator：图外的一个进程

> **一句话：** coordinator 在七个 stage 之外：把 request 交给第一个 stage，把出来的文本和声音合成一个响应，取消时向所有 stage 同时发 abort。

### 图上是什么

- 左上 `the client`，经 HTTP（第 9 章第 2 步）连到中间的蓝框 `coordinator`，它自己是一个进程。
- 下方一排七个 stage 框。
- 黑箭头 ①：提交给第一个 stage `preprocessing`。
- 两条橙箭头 ②：文本从 `decode`、声音从 `code2wav` 回到 coordinator，合成一个响应。
- 红色虚线 ③：abort，一条消息分到每个 stage。
- 两条带点的说明、一条脚注（abort 用 ZMQ 发布/订阅）。

### 三件事（源码）

| 编号 | 做什么 | SGLang-Omni 里 |
|---|---|---|
| ① 提交 | 新 request 交给入口 stage | `Coordinator` 的 `entry_stage` |
| ② 合并 | 有多个终点 stage 时，等它们都完成才算 request 结束 | `terminal_stages` |
| ③ abort | 一个发送方、所有订阅者都收到 | `PubSocket`（`zmq.PUB`）发 `AbortMessage`，各 stage 用 `SubSocket` 收 |

每个 stage 收到 abort，不管这个 request 在自己循环的哪一步，都丢掉它。

### 它不碰什么

coordinator 管 request，不管数据：第 1 步的向量、embedding 和 code 都在 stage 之间直接传，不经过它。

### 接下来

第 11 步回到布局本身：路径由两端位置决定，那位置由谁决定。

## 第 11 步 · 路径跟着布局走

> **一句话：** 一条边走哪条路取决于两端 stage 在哪；第 17 章第 4 步把四个 stage 放在 GPU 0、`talker_ar` 独占 GPU 1，这由谁决定、同一块 GPU 的内存怎么分，是第 19 章的问题。

### 图上是什么

- 左框 GPU 0：`image_encoder`、`audio_encoder`、`thinker`、`code2wav` 四个 stage；旁边内存框分成四个红色虚线格，每格一个 `?`。
- 右框 GPU 1：只有 `talker_ar`；内存框一个红色虚线格，一个 `?`。
- 三条带点的说明、一条脚注。

### `?` 是什么

- 每个红格是一个 stage 的内存份额，目前没有任何一步说过它多大。
- GPU 0 上的四个 stage 各要放权重和工作内存，thinker 还要放 KV cache。
- GPU 1 只有 `talker_ar`，同时跑 8 个 request 时让这块 GPU 86% 的时间在忙（PR #1235 实测，第 19 章第 1 步）。

### 布局一变，路径就变

例如把 `talker_ar` 挪到 GPU 0：边 7、8 两端都在 GPU 0，不再过链路。路径按第 4 步的规则跟着变。

### 接下来

第 19 章回答脚注里的两个问题：布局由谁决定，一块 GPU 的内存怎么分给上面的 stage。
