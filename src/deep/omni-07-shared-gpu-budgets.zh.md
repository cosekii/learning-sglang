## 第 1 步 · 从一张卡算出显存比例

> **一句话：** 构造的 80 GiB 卡放进 60 GiB 权重，剩下 20 GiB 给 KV，所以两者分别占 75% 和 25%。

### 图上是什么

- 这是构造例，不是模型配置或显存实测。同一个描边长条始终表示这张 80 GiB 卡。
- 第一相只显示 80 GiB 总显存。第二相把 60 GiB 蓝色权重填进去。第三相把剩余 20 GiB 填成橙色 KV 预算。最后一相用同一个总显存分别算出两项比例。
- KV 保存已经算过的 token key 和 value。`gpu_memory_fraction` 表示一种用途的字节数除以整卡字节数。
- 长条在原位逐段形成，不是 before／after 结果卡。蓝色始终表示权重，橙色始终表示 KV 预算。

### 代入图上的数

设整卡容量为 $C=80\,\mathrm{GiB}$，权重占用为 $W=60\,\mathrm{GiB}$。剩余 KV 预算为：

$$K=C-W=80-60=20\,\mathrm{GiB}$$

两项比例为：

$$f_W=\frac{W}{C}=\frac{60}{80}=0.75=75\%$$

$$f_K=\frac{K}{C}=\frac{20}{80}=0.25=25\%$$

它们合起来正好是这张构造卡：

$$f_W+f_K=75\%+25\%=100\%$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $C$ | 教学卡的总显存 | 构造值：80 GiB |
| $W$ | 模型权重占用的显存 | 构造值：60 GiB |
| $K$ | 本例扣除权重后的 KV 预算 | 80 GiB 减 60 GiB |
| $f_W$ | 权重字节除以整卡字节 | 60 除以 80 |
| $f_K$ | KV 预算字节除以整卡字节 | 20 除以 80 |

这里的减法只有权重和 KV 两项，是教学简化。真实显卡还可能有 reserve 和其他占用，所以未分配字节不会自动成为某个 engine 的 KV 池。

### 与 placement 的关系

真实配置为 GPU 上的 stage 声明 `gpu_memory_fraction`。`StagePlacementPlanner` 收集每张 GPU 的 entry，`build_gpu_placement()` 把比例、KV 字节和 reserve 字节分别求和。本构造例只解释比例的含义，不声称 placement 会用 80 减 60 推导权重或 KV。

### 边界与出处

80、60 和 20 GiB 都是为方便口算而构造的数值。本步没有测量 B200、模型 checkpoint、token 上限、`nvidia-smi` 读数或运行时 allocator，也暂未画出 reserve 和其他 GPU 占用；第 2 步会明确加入 reserve。

- `sglang_omni/config/placement.py:73-104`：逐 stage 建立 GPU entry 并构造 placement plan。
- `sglang_omni/config/placement.py:111-119`：按配置上限拒绝比例超额的 GPU。
- `sglang_omni/config/placement.py:252-286`：同卡 entry 的比例、KV 字节和 reserve 字节分别求和。

行号对应 <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>。

### 接下来

第 2 步加入 `total_reserve_bytes`。比例与字节要换算到同一个字节域后再检查，不能只让两项分别看起来没超。

## 第 2 步 · 比例和字节预留合并后才知是否超卡

> **一句话：** 80 GiB 教学卡上，50% 加 20 GiB 能通过，90% 加同一预留却申报 92 GiB，超出 12 GiB。

### 图上是什么

- 两幅面板使用同一张教学卡、同一刻度、同一份 20 GiB `total_reserve_bytes`。这不是 B200 实测，而是源码单元测试里的配对数值。
- 实线描边的中性长条覆盖 0–92 GiB，也就是较大的合并申报量，所以两幅面板共用一把尺。它只是比较空间，不是另一份显存占用。黑色虚线标出 80 GiB 物理上限。
- 第一相显示比例和 reserve 输入、申报公式以及这条物理上限。第二相把比例换成蓝色字节段：40 和 72 GiB。第三相给两边加上同样的橙色 20 GiB reserve，得到 60 和 92 GiB。最后一相把两个总量与上限比较，再显示通过和拒绝。
- 蓝条是 `total_gpu_memory_fraction × card_bytes`，橙条是 reserve。面板边框到比较相才变色，不会提前给出结果。
- 通过例还剩 $80-60=20$ GiB。拒绝例在启动前超过物理上限 $92-80=12$ GiB。
- 测试里的 stage 同时声明 2 GiB KV 池和 20 GiB 整体 reserve。KV 已属于该 stage 的 footprint，不再与这份 reserve 重复相加；代码另做「所有 KV 池单独也必须装下」的检查。

### 代入图上的数

设物理卡容量为 $C=80\,\mathrm{GiB}$。总 reserve 为 $R=20\,\mathrm{GiB}$。

合并申报量为：

$$D=fC+R$$

通过例使用 $f_p=0.50$：

$$D_p=0.50\times80+20=40+20=60\,\mathrm{GiB}$$

$$H=C-D_p=80-60=20\,\mathrm{GiB}$$

拒绝例使用 $f_f=0.90$：

$$D_f=0.90\times80+20=72+20=92\,\mathrm{GiB}$$

$$O=D_f-C=92-80=12\,\mathrm{GiB}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $C$ | 教学卡的物理容量 | 测试 monkeypatch 的 80 GiB |
| $R$ | 同卡 stage 的 `total_reserve_bytes` 之和 | 测试的 20 GiB |
| $f_p,f_f$ | 通过例和拒绝例的总比例 | 测试的 0.50 和 0.90 |
| $D$ | 换算到字节域后的总申报量 | 比例乘卡容量，再加 reserve |
| $H$ | 通过例距物理上限的余量 | 80 减 60 |
| $O$ | 拒绝例超过物理上限的量 | 92 减 80 |

$R$ 是 stage 整体预留，不是「在权重和 KV 之外再加一份同名 KV」。测试里的 2 GiB KV 单独满足 $2\leq80$，但它不会抵消 $D_f>C$。

### 两道检查分别做什么

`validate_gpu_capacity()` 在能取得设备物理字节数时，先计算 `declared = total_fraction × total_memory_bytes + total_reserve_bytes`。存在 reserve 且 `declared` 超卡就抛错。

随后代码检查 `total_kv_cache_bytes` 本身是否超过整卡。即使没有 stage 声明总 reserve，KV 池之和仍有这个下限检查。若设备元数据不可用，物理容量检查会跳过；它不伪称已知卡容量。

### 边界与出处

本步只覆盖声明预算的启动前检查，不证明运行时 allocator 永不 OOM，也不测量 stream buffer 的实际峰值。`total_reserve_bytes` 需要部署者真实覆盖 stage footprint；图中没有展开 TP 每 rank 记账和 replica 展开的实现。

- <code>tests/unit_test/<wbr>pipeline/<wbr>test_placement.py:125-177</code>：80 GiB 卡上 0.90 与 0.50 两例、20 GiB reserve 和 2 GiB KV。
- `sglang_omni/config/placement.py:124-174`：合并字节申报、物理超卡错误和 KV 独立下限检查。
- `sglang_omni/config/placement.py:252-286`：同卡 reserve 与 KV 的求和。
- `docs/basic_usage/mps_dp.md:62-69`：字节预算在 spawn 前校验，以及 KV bytes 与 token 上限互斥。

行号对应 <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>。

### 接下来

第 3 步跟随一份 KV 字节申报进入 stage 工厂：它必须恰好交给一个 engine，不能被忽略，也不能被领取两次。

## 第 3 步 · 一份 KV 字节预算只能领取一次

> **一句话：** stage 声明 2 GiB KV 池后，零个或两个 engine 消费都会报错，只有恰好一个消费才兑现这份预算。

### 图上是什么

- 三幅面板是三种独立情况，不是同一次执行的三步，也不是共用一个作用域。每幅都有自己的作用域和同样的教学声明：`engine.kv_cache_bytes=2 GiB`。KV cache 是保存已算 token 的 key 和 value 的池。
- 第一相显示 `consumed=false` 和虚线未领取框。第二相让一个-engine 和两个-engine 面板里的第一个 engine 领取蓝色 2 GiB 池，标记变为 `consumed=true`。零-engine 面板仍未领取。
- 第三相检查两条失败分支：没有 engine 的情况走到清理检查，两个-engine 面板里的第二个橙色 engine 尝试领取同一份预算。最后一相显示零领取报错、一次领取启动和第二次领取报错。
- 橙色第二张卡是被拒绝的尝试，不是又一份真正分配的 KV 池。在两个-engine 面板里，`consumed=true` 记录第一次领取，第二次调用仍会报错。
- 三幅图讲的是启动配置传递，不是请求运行时把同一份 KV 给多个 engine 共用。

### 代入图上的数

设声明字节数为 $B=2\,\mathrm{GiB}$。实际消费的 engine 数为 $n$。

合法条件是：

$$n=1$$

合法消费量为：

$$D=nB=1\times2=2\,\mathrm{GiB}$$

两个教学错误分别是：

$$n=0\Rightarrow\text{unconsumed budget error}$$

$$n=2\Rightarrow\text{second consumption error}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $B$ | stage 声明的一个 engine KV 池字节数 | 教学构造的 2 GiB |
| $n$ | 同一作用域中尝试消费预算的 engine 数 | 三幅面板的 0、1、2 |
| $D$ | 合法时兑现的 KV 字节预算 | 一个 engine 乘 2 GiB |
| consumed | 预算是否已被 engine 构造点领取 | `StageKvBudget.consumed` |

图中拒绝 $n=2$ 不是在计算 $2B=4\,\mathrm{GiB}$ 后再比较物理卡，而是在第二次领取时立即阻止「一份声明、两份完整池」。

### 作用域怎样传递预算

`stage_kv_cache_budget()` 把 `StageKvBudget` 放进 thread-local，包住一次 stage 工厂调用。`finally` 清除当前预算，随后检查 consumed；没被消费就抛错。

`consume_stage_kv_cache_bytes()` 在 SGLang infrastructure 的 engine 构造 choke point 读取预算。第一次调用把 consumed 设为真并返回字节数，第二次调用直接抛错。这个协议让各模型工厂不必新增一条逐层传递的关键字参数。

### 边界与出处

本步不展开 engine 怎样把字节数换算为 token 数，也不同时设置 `max_total_tokens` 与 `kv_cache_bytes`；文档明确二者在同一 stage 互斥。作用域不可嵌套，图中也未画这个额外错误分支。

- <code>sglang_omni/scheduling/<wbr>stage_kv_budget.py:20-31</code>：预算记录、consumed 标记和 thread-local。
- <code>sglang_omni/scheduling/<wbr>stage_kv_budget.py:34-64</code>：单次工厂作用域、禁止嵌套、finally 清理和零消费错误。
- <code>sglang_omni/scheduling/<wbr>stage_kv_budget.py:67-88</code>：首次消费与第二次消费错误。
- `docs/basic_usage/mps_dp.md:62-69`：每 stage KV 字节预算与 `max_total_tokens` 的互斥规则。

行号对应 <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>。

### 接下来

第 4 步复制的是同卡 serving replica。权重可以通过 CUDA IPC 共享，但每个 replica 的 KV 池仍要单独预算。

## 第 4 步 · 共用权重不等于共用 KV 池

> **一句话：** 两个同卡副本可以映射一份 checkpoint 权重，同时保留两个私有 KV 池，每池明确上限 30000 token。

### 图上是什么

- 两个面板都画同样的两个 replica 和同样大小的符号方框。W 表示 checkpoint 里已保存的模型权重，KV 表示一个 replica 私有的 token 池。左侧 `weight_share=off` 始终保持两份 W、两个 KV，作为计数对照。
- 右侧第一相指定 replica 0 为 leader、replica 1 为 follower。虚线槽表示两边都还没有加载 W。MOSS 示例配置用 `max_total_tokens=30000`，不用第 3 步的 `engine.kv_cache_bytes`，两种设置互斥。第一行 `now` 把 30000 与 30 份 1000-token prompt 作大小比较，不保证能同时放下 30 份 prompt。
- 第二相在 leader 槽里放入一份蓝色 W。第三相画出蓝色 CUDA IPC 箭头：handle 让 follower 能打开 leader 的 GPU 存储。第四相把 follower 的虚线槽换成 `alias · follower`，表示同一个 W，不再复制。
- 第五相只建立两个独立的橙色 KV 池，各写 30000，还不显示算式。两个 KV 池不做 alias。
- 第六相只显示计数和算式：`1 W + 2 KV`、`2 W → 1 W` 和合计 60000 token 上限。
- 蓝色色块表示权重及其 CUDA IPC 交接，橙色色块表示私有 KV，虚线槽表示这里还没有 W。CUDA Graph 和请求状态也保持私有，但只在脚注说明，没有另画成新的预算方块。
- W 是符号，不对应某个声称的 GB 数。因此图只得出「少一份 checkpoint 副本」，不声称节省固定字节或百分比。

### 代入图上的数

设副本数 $N=2$，共享前权重副本数 $W_{off}=2$，共享后权重副本数 $W_{on}=1$：

$$S_W=W_{off}-W_{on}=2-1=1$$

私有 KV 池数仍为：

$$N_{KV}=N=2$$

每池 token 上限为 $T=30000$，两池合计上限为：

$$T_{all}=NT=2\times30000=60000\ \mathrm{tokens}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 同卡 serving replica 数 | MOSS 示例的 DP2 |
| $W_{off}$ | 不共享时的符号化权重副本数 | 两个 replica 各一份 |
| $W_{on}$ | 开启共享后的 checkpoint 存储份数 | 一个 leader 发布，一个 follower 映射 |
| $S_W$ | 少掉的 checkpoint 副本数 | 2 减 1 |
| $N_{KV}$ | 私有 KV 池数 | 两个 replica 各一个 |
| $T,T_{all}$ | 每池与两池合计 token 上限 | 30000，以及 2 乘 30000 |

$T_{all}=60000$ 是两个独立池上限的算术和，不是一个可让单请求连续使用 60000 token 的共享池。

### 实现细节 · 未画出

规划器只把同一 logical Process、同一物理 GPU 上的多个 replica 组成 sharing group。最低 replica index 成为 leader，其余成为 follower；TP process 被跳过。这些规划规则没有画成额外对象。

leader 发布每个 parameter 和 buffer 的 CUDA IPC handle。follower 通过赋值把这些 parameter 和 buffer 指向 leader 的存储，而不是复制一份。KV cache、CUDA Graph 和 sampler state 保持私有；按策略标记为 replica-private 的 tensor 也不能共享。图中用一份符号化 W 代表权重，没有逐个画出 tensor。

follower 在附着前构造带 dummy 权重的同类 module tree，赋值时释放这些 dummy 存储。这两个操作没有画成额外对象或相位。

weight sharing 要求 process 中恰好一个 SGLang engine stage，并要求显式正整数 `max_total_tokens`。follower 在 KV profiling 前释放 dummy 权重，若再靠 profiler 推导 KV 上限，会把预算算得不稳定，所以启动前就拒绝缺少该上限的配置。

### 边界与出处

本步不声称权重共享提高吞吐或改善调度；官方文档明确它节省显存，本身不改进调度。leader 必须比 follower 活得久，重启应成组进行。架构 allowlist、私有 tensor 审计、handle 生命周期和 graph capture 验证不在图中展开。

- <code>docs/basic_usage/<wbr>process_topology.md:234-276</code>：MOSS 同卡 DP2、30000 token、`--weight-share on` 和 leader/follower 的私有状态。
- <code>sglang_omni/pipeline/<wbr>weight_share.py:93-133</code>：同卡组、最低 index leader 和 follower 角色分配。
- <code>sglang_omni/pipeline/<wbr>weight_share.py:182-230</code>：candidate group 的收集与 TP 跳过。
- <code>sglang_omni/pipeline/<wbr>weight_share.py:233-287</code>：恰好一个 engine stage 和显式正 token 上限校验。
- <code>sglang_omni/utils/<wbr>ipc_weights.py:1-35</code>：CUDA IPC alias、私有 KV/graph/sampler 和生命周期约束。
- <code>sglang_omni/utils/<wbr>ipc_weights.py:658-746</code>：leader 逐 tensor 发布 handle 并原子导出。
- <code>sglang_omni/utils/<wbr>ipc_weights.py:939-997,1079-1265</code>：follower 附着、赋值代替复制和私有 tensor 处理。

行号对应 <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>。

### 接下来

第 5 步打开 MPS。它管理同卡进程的执行附着，不改变前几步已经算出的显存申报。

## 第 5 步 · MPS 管进程执行，不改显存加法

> **一句话：** 两个合格的单卡非 TP 进程加入同一物理 GPU 的 MPS 服务，所在 pipeline 持有一份租约；TP 进程不加入。

### 图上是什么

- MPS 是让多个进程共享 GPU 执行的 CUDA 服务。第一相读取每个 process 的 GPU 放置和 TP 设置。两个构造 process 使用 GPU 0、worker 本地的 `cuda:0`，且没有 TP。另外两个输入分别是一个 TP process 和一个放在 GPU 0 加 GPU 1 上的 process。
- 第二相保留有 GPU 放置的非 TP 候选，移除橙色 TP process，合格 TP client 数为零。TP 表示张量并行。蓝色标出此 pipeline 的 MPS 对象：合格 process、它们的 GPU 组、租约和加入箭头。橙色表示被排除的 process，虚线表示对象或结果尚未出现。
- 第三相解析物理 GPU ID。两个合格 process 都解析到 `GPU-A`，它是一张物理卡的教学代号。代码把这个物理 ID 叫作 UUID。跨卡输入解析成两个物理 ID，所以在任何租约之前拒绝它。这与实现的解析顺序一致。
- 第四相把两个合格 process 归入 `GPU-A` 上的一个 GPU 组。代码把这个对象叫作 `PhysicalMpsPlan`。图上的 `2 ≥ 2` 达到本例的两个进程下限。
- 第五相为这个 pipeline 在 `GPU-A` 上创建一份蓝色租约。租约是这个 pipeline 后续做 MPS 检查和清理的钥匙。它记录此 pipeline 对自己 MPS runtime 的所有权，不表示独占整张 GPU；既不分配显存，也不是每个 client 各一份。
- 第六相画出两条加入箭头，显示名牌 `t0` 和 `t1`。代码把这两个每进程唯一的值叫作 token。MPS 服务现有两个已加入的 process，但启动前还没有核对它们。
- 第七相在舞台上把 `t0 → process 0`、`t1 → process 1` 分别对上。运行时把每个预期 process 的 token 与 daemon 当前 client 对照。两个都找到，接入验证才成功。这个检查防止 process 悄悄退回普通 time slicing。
- 底部把 process 0 在第 3 步的 2 GiB KV 申报带过租约和最后检查。末相 `2 GiB 租约前 → 2 GiB 验证后` 两边用的是同一份申报。MPS 改变执行共享，不改变这份申报。2 GiB 仍是教学值，不再加到 reserve 上。

### 代入图上的数

本例使用 `mps=auto`，这个设置名不画在舞台上。设 `GPU-A` 上的合格 client 数为 $N_c=2$，auto 的最小 client 数为 $N_{min}=2$：

$$N_c=2\geq N_{min}=2\Rightarrow\text{create one physical MPS plan}$$

每张被管理的物理 GPU 对应一份 pipeline lease：

$$N_{lease}=1$$

本例 TP client 数为：

$$N_{TP}=0$$

process 0 的 KV 申报在 MPS 前后不变：

$$K_{before}=K_{after}=2\ \mathrm{GiB}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N_c$ | 同一张物理 GPU 上的合格 client 数 | 教学构造的两个 process |
| $N_{min}$ | `mps=auto` 启用所需的 client 下限 | runtime 的 2 |
| $N_{lease}$ | 此 pipeline 在这张卡上的 MPS 租约数 | 每 UUID acquire 一次 |
| $N_{TP}$ | 本例允许加入的 TP client 数 | TP process 在候选收集时排除 |
| $K_{before},K_{after}$ | process 0 在 MPS 前后的 KV 申报 | 与第 3 步相同的 2 GiB 教学值 |

这里 $N_{lease}=1$ 不表示整台机器只能有一个 pipeline。文档说明多个 serve 可加入同一物理 GPU 的 daemon，各自持有所有权，最后一个离开时才退出 daemon。本图只画一个 pipeline。

### 模式边界 · 未画出

`auto` 要求同一物理 GPU 至少两个合格 process；只有一个 client 时不启用 MPS。`on` 对一个合格 process 也可启用，但没有合格 physical plan、平台不支持或物理映射不完整时会硬报错。舞台只播放两个进程的 `auto` 示例，不在图上比较这两种模式。

### 实现细节 · 未画出

启动过程逐 GPU acquire，若中途失败则按相反顺序 rollback 已取得的 lease。本图播放 `verify()` 里的名牌对照，但不播放 live-lease 检查、轮询或 PID 级快照，也不播放 rollback、关闭时的 client 清理或 daemon 生命周期。

### 边界与出处

MPS 是否更快取决于进程之间是否有可重叠的 GPU 工作，本步没有性能测量。pipeline edge 的传输路由不参与 MPS 资格判断。`CUDA_VISIBLE_DEVICES`、外部 MPS pipe 和手写 weight-share 环境变量等冲突配置也未展开。

- <code>docs/basic_usage/<wbr>mps_dp.md:11-49</code>：on/auto 规则、单物理 GPU 限制和按 UUID 共享 daemon。
- <code>docs/basic_usage/<wbr>mps_dp.md:71-97</code>：client 验证、watchdog、关闭与 dirty state。
- <code>sglang_omni/mps/<wbr>runtime.py:81-178</code>：TP 排除、物理 UUID 解析和多卡 process 拒绝。
- <code>sglang_omni/mps/<wbr>runtime.py:182-279</code>：按 UUID 分组、auto 的至少两个 client 和 physical plan。
- <code>sglang_omni/mps/<wbr>runtime.py:390-492</code>：事务式 acquire、回滚、client token 与 verify 所面对的对象。
- <code>sglang_omni/mps/<wbr>manager.py:125-255</code>：创建或加入 daemon，以及 pipeline 的 owner lease。
- <code>sglang_omni/mps/<wbr>manager.py:440-478,784-802</code>：当前 client 快照、逐 process token 对照和接入验证成功条件。

行号对应 <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>。

### 接下来

第 6 步换一种省显存方法：不再同卡增加 replica，而让 AuK 的三个组件依次唤醒，只保留当前需要的一份在 GPU 上。

## 第 6 步 · AuK 用串行换入换出减少同时常驻

> **一句话：** 一个请求持有这条 AuK offload 路线，coordinator 每次只唤醒一件组件，终态交付后才释放路线。

### 图上是什么

- AuK 是本例文字生成语音的模型。conditioning 准备请求，DiT 生成 latent 声音数据，也就是尚未变成音频的数据，VAE 再把这些数据变成音频。
- serial offload 把组件权重放在 host 内存，也就是 GPU 外的计算机内存，需要时再恢复到 GPU。offload 指换出再换入，不是把计算交给 CPU。
- 图中分开四层。底行声明 batch、replica 和 TP 限制。coordinator 面板管理一个请求对这条 AuK offload 路线的所有权。GPU 行标出当前执行，三行组件标出各自常驻状态。
- 前两相先让 A 请求开始，再由 coordinator 把这条 AuK offload 路线交给 A。B 等待时保持橙色。所有权不包括物理 GPU。
- 接着五相依次执行 `conditioning.wake()` → `conditioning.sleep()` → `DiT.wake()` → `DiT.sleep()` → `VAE.wake()`。蓝色表示一件组件常驻 GPU，灰色表示组件休眠并把副本留在 GPU 外。每次 sleep 和下一次 wake 之间，三件组件都在休眠。
- A 的终态结果交付后释放路线所有权，VAE 保持常驻。随后 B 取得同一路线。B 的 conditioning 唤醒前，VAE 先休眠。最后一相显示 B 的 conditioning 常驻。

### 代入图上的数

组件数为 $C=3$。任意相位的常驻数为 $R_t\in\{0,1\}$，所以休眠数为：

$$S_t=C-R_t$$

wake 后 $R_t=1$，所以 $S_t=3-1=2$。sleep 和下一次 wake 之间 $R_t=0$，所以 $S_t=3-0=3$。

路线 owner 数为 $O_t\in\{0,1\}$。A 或 B 持有路线时为 1，A 的终态结果交付后为 0。配置还固定：

$$B_{max}=1,\qquad N_{process}=1,\qquad TP=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $C$ | 参与 serial offload 的组件数 | conditioning、DiT、VAE 三件 |
| $R_t$ | 第 $t$ 相的 GPU 常驻组件数 | coordinator 的 <code>resident_<wbr>component</code> |
| $S_t$ | 第 $t$ 相的休眠组件数 | 3 减当前常驻数 |
| $O_t$ | 第 $t$ 相持有这条 AuK 路线的请求数 | coordinator 的 <code>owner_<wbr>request_id</code> |
| $B_{max}$ | offload 模式的 batch 上限 | 配置强制为 1 |
| $N_{process},TP$ | 进程副本数与张量并行度 | 配置强制都为 1 |

两件休眠只表示组件个数为 2。三件组件权重字节数不同，所以不能从 $S_t/C=2/3$ 推出节省三分之二的显存；本图没有这个结论。

### 为什么所有权要留到结果交付

`begin()` 让 conditioning 在已有 owner 时等待，并检查后续 stage 是否属于同一个 request 和预期 phase。`finish()` 推进 conditioning → auk_engine → decode → result，失败、取消或关闭则释放 owner。

scheduler 在计算返回后同步 CUDA stream，再调用 finish，避免计算仍在写显存时就换出或释放。`switch()` 先让旧组件 sleep，清空 `resident_component`，再让下一组件 wake。`claim_result()` 确认请求仍有所有权；只有 terminal 且 delivered 时，`release_result()` 释放 owner。这样 B 不会在 A 的结果尚未交付时抢进同一条串行路线。

### 边界与出处

serial offload 要求标准线性 pipeline、同一 CUDA GPU、同一 process、一个 process replica、TP1 和 batch size 1，并同时启用三个 GPU stage。权重源默认 `mmap`，也可配置 host RAM 或可写 cache。换入换出耗时和性能收益需要测量，本章不给出。

舞台固定为没有参考音频的文字生成语音请求。有参考音频时，conditioning 可以先唤醒 VAE 来编码参考音频，再唤醒 conditioning。图中没有画这次额外切换。

- <code>docs/cookbook/<wbr>auk.md:1-21</code>：AuK 语音生成，以及 conditioning → DiT sampling → VAE decoding 流程。
- <code>sglang_omni/models/auk/<wbr>batch_compute.py:78-104,131-170</code>：可选的参考音频 VAE 切换、DiT sampling 和 VAE 音频解码。
- `docs/cookbook/auk.md:138-149`：serial offload 启动方式、单请求限制、VAE 常驻和权重来源。
- <code>sglang_omni/models/auk/<wbr>config.py:112-185</code>：共同启用、单卡同进程、单副本、TP1、batch1 和线性图校验。
- <code>sglang_omni/models/auk/<wbr>serial_offload.py:27-100</code>：owner、phase、等待、begin/finish 和阶段推进。
- <code>sglang_omni/models/auk/<wbr>serial_offload.py:115-172</code>：结果交付释放、owner 清理和先 sleep 后 wake。
- <code>sglang_omni/models/auk/<wbr>offload_scheduler.py:37-69</code>：计算后同步，再 finish。
- <code>sglang_omni/scheduling/<wbr>stage_residency.py:78-168</code>：稳定地址、物理页暂停与主机副本恢复。

行号对应 <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>。

### 接下来

本章已经给出比例、reserve、KV、共享权重、MPS 和串行 offload 的预算边界。下一章把这些配置变化放回时间线，测量首音与卡顿究竟改变在哪一段。
