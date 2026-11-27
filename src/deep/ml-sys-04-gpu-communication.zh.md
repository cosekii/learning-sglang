## 第 1 步 · 省下的计算可能被通信吃掉

**一句话。** 这个构造例子里，4 卡变 8 卡省下 4 ms 计算，却多花 5 ms 通信，所以总时间增加 1 ms。

### 图上是什么

- 左右分别是 4 卡和 8 卡完成同一份工作的构造时间。蓝条是计算，橙条是跨卡搬张量与等到结果所需的通信时间。
- 两条横条使用同一比例。8 卡的蓝条更短，但橙条增加得更多；右上角的 10 ms 和 11 ms 是两项之和。
- 数字只用于说明怎样比较收益和代价，不是某台机器的实测，也不表示 8 卡通常更慢。

### 公式与符号

$$T=C+W,\qquad \Delta T=(C_8-C_4)+(W_8-W_4)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $C_4,C_8$ | 4 卡、8 卡的计算时间 | 本步构造值：8 ms、4 ms |
| $W_4,W_8$ | 4 卡、8 卡的通信时间 | 本步构造值：2 ms、7 ms |
| $T$ | 两部分相加的总时间 | 本步计算 |
| $\Delta T$ | 8 卡相对 4 卡的总时间变化 | 本步计算 |

### 代入图上的数

$$T_4=8+2=10\ \mathrm{ms},\qquad T_8=4+7=11\ \mathrm{ms}$$

$$\Delta T=(4-8)+(7-2)=-4+5=+1\ \mathrm{ms}$$

zero-to-sglang 第 3 部分第 4 章 §2.1 指出，TP 会在层内反复合并局部结果；增加卡数能否加速，要看省下的计算能否覆盖新增的通信与调度开销。本步把这句话变成可复算的数，不展开 TP 的矩阵切法。

### 接下来

要找到通信时间花在哪里，先看多张 GPU 要共同得到什么结果。

来源：`zero-to-sglang/course-material/ch/part3/第4章_横向扩展.md:19-34`。

## 第 2 步 · all-reduce 让每卡拿到同一个总和

**一句话。** 四张卡各有一份四格张量，SUM all-reduce 把对应格相加，再把完整的 `[10,10,10,10]` 交给每张卡。

### 图上是什么

- 上方四个蓝框是各卡自己的局部张量，不是把一张卡的数据复制四份。
- 中间按位置相加：每一格都是 $1+2+3+4=10$，四格都得到 10。
- 下方橙框表示操作完成后，GPU 0–3 都持有同一个完整结果。颜色只区分「局部输入」和「归约输出」。

### 公式与符号

$$y_j=\sum_{r=0}^{N-1}x_{r,j}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 参与的 GPU 数 | 本步构造例，4 |
| $r$ | GPU 的序号 | 本步为 0–3 |
| $j$ | 张量里的格子序号 | 本步为 0–3 |
| $x_{r,j}$ | 第 $r$ 张卡的第 $j$ 格 | 图上四个局部张量 |
| $y_j$ | 所有卡第 $j$ 格的总和 | 本步计算 |

### 代入图上的数

$$y_j=1+2+3+4=10,\qquad j\in\{0,1,2,3\}$$

因此每张卡都得到 $y=[10,10,10,10]$。`Reduce` 只让一个目标拿到总和，`all-reduce` 则让所有参与者都拿到结果；本章只讲后者。归约也可以是 MAX 等操作，但图中明确选用 SUM，不展开其他操作。

### 接下来

这些 GPU 由谁代表、程序怎样知道一共有多少参与者？下一步看进程组。

来源：`Awesome-ML-SYS-Tutorial/torch/torch-distributed/readme.md:510-526`；`zero-to-sglang/course-material/ch/part2/第9章_多进程与张量并行.md:82-105`。

## 第 3 步 · 进程组给四个参与者编号

**一句话。** 本例让四个进程分别驱动四张 GPU，`rank` 标识进程，`world size` 记录参与者总数。

### 图上是什么

- 虚线框是一个进程组，负责组织这些已有进程交换数据。
- 每一行从进程指向它使用的 GPU；进程旁的 `rank 0` 到 `rank 3` 是组内编号。
- 四行都参与同一个 all-reduce，所以 `world size = 4`。张量沿用第 2 步，表示每个进程仍持有自己的输入。
- 一进程一卡是这份示例代码的安排，不是所有框架和所有部署的硬性要求。

### 公式与符号

$$N=\texttt{world\_size},\qquad r=\texttt{rank}\in\{0,1,\ldots,N-1\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 进程组里的进程总数 | 本例 `world size = 4` |
| $r$ | 当前进程在组内的编号 | 本例 0–3 |
| $\texttt{world\_size}$ | 示例代码传给初始化接口的总数 | `torch.distributed` 示例 |
| $\texttt{rank}$ | 示例代码传给初始化接口的编号 | 同上 |

### 代入图上的数

示例代码用 `torch.cuda.set_device(rank)` 选择 GPU，再以 `world_size` 启动相应数量的进程。本例 $N=4$，因此有 rank 0、1、2、3 四行；它们对应第 2 步的四份输入，而不是一个进程复制成四份输出。

进程组是通信的组织边界。这里只画默认组，不展开 `new_group` 创建子组，也不展开控制面的请求分发。

### 接下来

每个进程都调用同一个集合操作时，调用怎样落到 GPU 通信？下一步跟进软件栈。

来源：`Awesome-ML-SYS-Tutorial/torch/torch-distributed/readme.md:13-24,57-89,118-141`。

## 第 4 步 · 接口把集合调用交给 NCCL

**一句话。** 四个 rank 都调用 `torch.distributed` 的 SUM all-reduce，选择 NCCL 后端后，由它执行 GPU 张量通信。

### 图上是什么

- 左侧 rank 0–3 表示四个进程都参与这次集合调用，不是只有 rank 0 工作。
- 中间代码是各进程对自己的张量执行求和 all-reduce。
- `torch.distributed` 是程序调用的接口；`NCCL backend` 是它下面的 GPU 集合通信实现。
- 蓝色表示参与者，橙色表示这次调用经过的两层软件；本步没有画物理链路。

### 公式与符号

$$y=\operatorname{all\_reduce}_{\mathrm{SUM}}(x_0,x_1,x_2,x_3)$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $x_r$ | rank $r$ 的输入张量 | 第 2、3 步 |
| $y$ | 每个 rank 都拿到的求和结果 | 第 2 步，$[10,10,10,10]$ |
| $\operatorname{all\_reduce}_{\mathrm{SUM}}$ | 对所有输入逐格求和并发回每个参与者的集合操作 | 第 2 步 |

### 代入图上的数

四个 rank 分别输入 $[1,1,1,1]$、$[2,2,2,2]$、$[3,3,3,3]$、$[4,4,4,4]$，所以每个 rank 的 $y$ 都是 $[10,10,10,10]$。代码里的 `tensor` 是当前进程的本地输入，不是四份输入同时塞进一个进程。

初始化时写 `backend="nccl"` 选择这个后端。NCCL 是 NVIDIA 的 GPU 集合通信库；本章不展开其他后端，也不把 Ring 说成每次运行的固定选择。

### 接下来

接口下面，张量究竟走哪条硬件路径？下一步看 GPU 之间的链路。

来源：`Awesome-ML-SYS-Tutorial/torch/nccl/readme.md:3-10,41-53`；`Awesome-ML-SYS-Tutorial/torch/torch-distributed/readme.md:160-175,286-292`。

## 第 5 步 · 拓扑标签描述张量走的路

**一句话。** `NV18` 表示 18 条 NVLink 组成的连接，`SYS` 表示路径还穿过 PCIe 和 NUMA 节点间互连。

### 图上是什么

- 左右是文章里两份 `nvidia-smi topo -m` 输出中的路径示例，不是同一台机器可随便切换的选项。
- 左图两个 GPU 由标为 `NV18` 的连接相通。`NVLink` 是 GPU 间链路，`18` 是这份输出里捆绑的链路数。
- 右图展开 `SYS`：从 GPU 经 PCIe、NUMA 节点间连线，再经 PCIe 到另一张 GPU。
- `PCIe` 是 GPU 与主机通信的通道；`NUMA 节点` 是主机里的 CPU／内存分区。蓝框仍是 GPU，橙色仍是通信路径。

### 公式与符号

$$\mathrm{NV}\#=\#\times\mathrm{NVLink}$$

$$P_{\mathrm{SYS}}=\mathrm{GPU}\leftrightarrow\mathrm{PCIe}\leftrightarrow I_{\mathrm{NUMA}}\leftrightarrow\mathrm{PCIe}\leftrightarrow\mathrm{GPU}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $\#$ | 组成一条捆绑连接的 NVLink 数 | `nvidia-smi topo -m` 图例 |
| $P_{\mathrm{SYS}}$ | 本步展开的 SYS 示例路径 | 同一份图例 |
| $I_{\mathrm{NUMA}}$ | NUMA 节点之间的互连 | 同一份图例 |

### 代入图上的数

左图标 $\#=18$，所以标签是 `NV18`。这个数字只描述那份输出，不是所有 GPU 都有 18 条 NVLink。

右图没有带宽或毫秒数。路径标签说明经过哪些互连，不能单独推出应用一定快多少；本章也不展开 NVSwitch、InfiniBand 或具体链路速率。

### 接下来

知道链路的名称后，还要看一次 all-reduce 怎样把张量分块送过这些链路。

来源：`Awesome-ML-SYS-Tutorial/torch/nccl/readme.md:99-145`；`zero-to-sglang/course-material/ch/part1/第3章_GPU入门.md:97-108,300-312`；`Inference Engineering §3.3.1`。

## 第 6 步 · Ring 用两段各三轮完成 all-reduce

**一句话。** 教学 Ring 先用 3 轮 reduce-scatter 让每卡得到一个归约分块，再用 3 轮 all-gather 让每卡集齐 4 块。

### 图上是什么

- 四张卡按 GPU 0 → 1 → 2 → 3 → 0 组成环，每轮只向邻居发送一个分块。
- 每份输入张量有 $S$ 字节，分成 A、B、C、D 四块，每块 $S/4$ 字节。
- 左图是 reduce-scatter 完成后的状态：对应位置已经求和，每卡留一个值为 10 的归约分块。
- 右图是 all-gather 完成后的状态：四块沿环继续转发，每卡都有完整的 `[10,10,10,10]`。
- 动画从四份输入开始，逐轮播放 Reduce-Scatter 的 1–3 轮：每张 GPU 都向下一张 GPU 发送一个 S/4 分块。完成后，左图每卡留下一个含 10 的归约分块。随后播放 All-Gather 的 1–3 轮，完成后右图每卡都有 `[10,10,10,10]`。橙色表示已经归约或正在分享的结果分块。

### 公式与符号

$$R=2(N-1),\qquad B_{\mathrm{rank}}=R\times\frac{S}{N}=\frac{2(N-1)S}{N}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 环里的 GPU 数 | 第 3 步，4 |
| $S$ | 一份输入张量的载荷字节数 | 本步定义 |
| $R$ | 两个阶段的传送轮数总和 | Ring 每段 $N-1$ 轮 |
| $B_{\mathrm{rank}}$ | 一张卡在两段中发送的总载荷 | 每轮发送一块 $S/N$ |

### 代入图上的数

$$R=2\times(4-1)=6,\qquad B_{\mathrm{rank}}=6\times\frac{S}{4}=1.5S$$

对称地，每卡也接收 $1.5S$ 载荷；四卡合计发送 $4\times1.5S=6S$。这些只数张量载荷，不含协议头、重传或实现细节，也不等于耗时。

第 2 步的四格输入在本步对应四个分块，所以每格求和都是 $1+2+3+4=10$。本章只展开 Ring，不展开 Tree、SHARP 或 NCCL 的实际算法选择。

### 接下来

轮数和发送量固定以后，路径快慢还会怎样改变等待？下一步固定 Ring，只看链路。

来源：`Awesome-ML-SYS-Tutorial/torch/nccl/readme.md:55-64`；`Awesome-ML-SYS-Tutorial/torch/torch-distributed/readme.md:926-950`；`Awesome-ML-SYS-Tutorial/torch/torch-distributed/complete-allreduce.svg:5-45`。

## 第 7 步 · 路径变慢会推迟相关轮次

**一句话。** 固定 Ring、张量和 6 轮，只让第 2 轮多花 $d$，这条相关链的后续轮次就跟着推迟 $d$。

### 图上是什么

- 拓扑是 GPU 之间链路的连接图。上下两行保持第 6 步的 Ring、张量 $S$ 和 6 轮不变。
- 每格是一段相关传送，后一格必须等前一格到达。对照行每格花 $t$，链上总时间是 $6t$。
- 下行只改变一条链路：第 2 轮从 $t$ 变为 $t+d$，橙色加宽表示多出的 $d$；第 3–6 格整体向右移。
- 这是单条相关链的简化图，不把 NCCL 的所有并行传输画成一条串行线，也不声称某种标签必然慢多少。

### 公式与符号

$$C_0=6t,\qquad C_1=5t+(t+d)=6t+d,\qquad \Delta C=C_1-C_0=d$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t$ | 对照路径中一段相关轮次的时间 | 本步设定的变量 |
| $d$ | 改变链路后，第 2 轮增加的时间 | 本步设定的变量，$d>0$ |
| $C_0$ | 对照相关链的时间 | 6 段，每段 $t$ |
| $C_1$ | 第 2 轮变慢后的相关链时间 | 5 段 $t$ 加一段 $t+d$ |
| $\Delta C$ | 这条链增加的等待 | 本步计算 |

### 代入图上的数

第 6 步给出 6 轮，所以对照链是 $t+t+t+t+t+t=6t$。下行只有第 2 项变为 $t+d$，于是 $C_1=5t+(t+d)=6t+d$，后续相关轮次多等 $d$。

这里故意不代入毫秒：第 5 步的 `NV18` 和 `SYS` 标签不能提供 $t$ 或 $d$。真实 NCCL 还可能重叠传输或选择别的算法，因此本式只解释依赖等待，不预测完整 all-reduce 的墙钟时间。

### 接下来

本章的回答是：Ring 让每卡集齐同一份结果，链路上的延迟会推迟相关轮次。下一章先启动 worker，把一组 GPU 组成服务，再跟着一条流式请求走过这些 worker。

来源：`Awesome-ML-SYS-Tutorial/torch/nccl/readme.md:114-145`；`Awesome-ML-SYS-Tutorial/torch/torch-distributed/readme.md:935-950`；`zero-to-sglang/course-material/ch/part3/第4章_横向扩展.md:21-34`；`Inference Engineering §3.3.1, §5.4`。
