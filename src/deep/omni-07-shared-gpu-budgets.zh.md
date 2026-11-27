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
- 蓝条是 `total_gpu_memory_fraction × card_bytes`，橙条是 reserve。黑色虚线固定在 80 GiB 物理上限。
- 左或上面的 50% 对应 40 GiB，再加 20 GiB 得 60 GiB，离物理上限还有 20 GiB。
- 右或下面的 90% 对应 72 GiB，再加 20 GiB 得 92 GiB，长条越过物理上限 12 GiB，启动前拒绝。
- 测试里的 stage 同时声明 2 GiB KV 池和 20 GiB 整体 reserve。KV 已属于该 stage 的 footprint，不再与这份 reserve 重复相加；代码另做「所有 KV 池单独也必须装下」的检查。

### 代入图上的数

设物理卡容量为 $C=80\,\mathrm{GiB}$，总 reserve 为 $R=20\,\mathrm{GiB}$。合并申报量为：

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

- `tests/unit_test/pipeline/test_placement.py:125-177`：80 GiB 卡上 0.90 与 0.50 两例、20 GiB reserve 和 2 GiB KV。
- `sglang_omni/config/placement.py:124-174`：合并字节申报、物理超卡错误和 KV 独立下限检查。
- `sglang_omni/config/placement.py:252-286`：同卡 reserve 与 KV 的求和。
- `docs/basic_usage/mps_dp.md:62-69`：字节预算在 spawn 前校验，以及 KV bytes 与 token 上限互斥。

行号对应 `origin/main@db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6`。

### 接下来

第 3 步跟随一份 KV 字节申报进入 stage 工厂：它必须恰好交给一个 engine，不能被忽略，也不能被领取两次。

## 第 3 步 · 一份 KV 字节预算只能领取一次

> **一句话：** stage 声明 2 GiB KV 池后，零个或两个 engine 消费都会报错，只有恰好一个消费才兑现这份预算。

### 图上是什么

- 三幅面板都从同一个教学 stage 开始：`engine.kv_cache_bytes=2 GiB`。KV cache 是保存已算 token 的 key 和 value 的池。
- 第一幅没有 engine 消费。预算在作用域退出时仍未被标记为 consumed，因此报错。
- 第二幅恰好一个 engine 消费 2 GiB，标记成功后启动。蓝框表示预算已被正确领取。
- 第三幅尝试让两个 engine 各拿 2 GiB。第二次消费会报错，因为一份 stage 预算只覆盖一个 engine 的完整 KV 池。
- 三幅图讲的是启动配置传递，不是请求运行时把同一份 KV 给多个 engine 共用。

### 代入图上的数

设声明字节数为 $B=2\,\mathrm{GiB}$，实际消费的 engine 数为 $n$。合法条件是：

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

本步不展开 engine 怎样把字节数换算为 token 数，也不把第 1 步的 `max_total_tokens` 与 `kv_cache_bytes` 同时设置；文档明确二者在同一 stage 互斥。作用域不可嵌套，图中也未画这个额外错误分支。

- `sglang_omni/scheduling/stage_kv_budget.py:20-31`：预算记录、consumed 标记和 thread-local。
- `sglang_omni/scheduling/stage_kv_budget.py:34-64`：单次工厂作用域、禁止嵌套、finally 清理和零消费错误。
- `sglang_omni/scheduling/stage_kv_budget.py:67-88`：首次消费与第二次消费错误。
- `docs/basic_usage/mps_dp.md:62-69`：每 stage KV 字节预算与 `max_total_tokens` 的互斥规则。

行号对应 `origin/main@db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6`。

### 接下来

第 4 步复制的是同卡 serving replica。权重可以通过 CUDA IPC 共享，但每个 replica 的 KV 池仍要单独预算。

## 第 4 步 · 共用权重不等于共用 KV 池

> **一句话：** 两个同卡副本可以映射一份 checkpoint 权重，同时保留两个私有 KV 池，每池明确上限 30000 token。

### 图上是什么

- 两个面板都画同样的两个 replica 和同样大小的符号方框。W 表示一份 checkpoint 权重，KV 表示一个 replica 私有的 token 池。
- 左侧 `weight_share=off` 作为对照，有两份 W 和两个 KV。它不是本例声称的唯一可选部署，只用于数清共享减少的对象。
- 右侧 `weight_share=on` 使用 MOSS 同卡 DP2 示例：replica 0 是 leader，replica 1 是 follower。二者通过 CUDA IPC 映射同一 W，所以只画一份 W。
- 右侧仍有两个橙色 KV，各写 30000。CUDA Graph 和请求状态也保持私有，但没有另画成新的预算方块。
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

### leader 与 follower 共享什么

规划器只把同一 logical Process、同一物理 GPU 上的多个 replica 组成 sharing group。最低 replica index 成为 leader，其余成为 follower；TP process 被跳过。

leader 加载 checkpoint 并发布每个 parameter 和 buffer 的 CUDA IPC handle。follower 先构造 dummy module tree，再把这些 parameter 和 buffer 赋值为 leader 的存储，而不是复制一份。KV cache、CUDA Graph 和 sampler state 保持私有；按策略标记为 replica-private 的 tensor 也不能共享。

weight sharing 要求 process 中恰好一个 SGLang engine stage，并要求显式正整数 `max_total_tokens`。follower 在 KV profiling 前释放 dummy 权重，若再靠 profiler 推导 KV 上限，会把预算算得不稳定，所以启动前就拒绝缺少该上限的配置。

### 边界与出处

本步不声称权重共享提高吞吐或改善调度；官方文档明确它节省显存，本身不改进调度。leader 必须比 follower 活得久，重启应成组进行。架构 allowlist、私有 tensor 审计、handle 生命周期和 graph capture 验证不在图中展开。

- `docs/basic_usage/process_topology.md:234-276`：MOSS 同卡 DP2、30000 token、`--weight-share on` 和 leader/follower 的私有状态。
- `sglang_omni/pipeline/weight_share.py:93-133`：同卡组、最低 index leader 和 follower 角色分配。
- `sglang_omni/pipeline/weight_share.py:182-230`：candidate group 的收集与 TP 跳过。
- `sglang_omni/pipeline/weight_share.py:233-287`：恰好一个 engine stage 和显式正 token 上限校验。
- `sglang_omni/utils/ipc_weights.py:1-35`：CUDA IPC alias、私有 KV/graph/sampler 和生命周期约束。

行号对应 `origin/main@db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6`。

### 接下来

第 5 步打开 MPS。它管理同卡进程的执行附着，不改变前几步已经算出的显存申报。

## 第 5 步 · MPS 管执行附着，不改显存加法

> **一句话：** 两个合格的单卡非 TP 进程在同一物理 GPU 上可加入一份 pipeline MPS 租约，TP 进程不加入。

### 图上是什么

- MPS 是让多个进程共享 GPU 执行的 CUDA 服务。本例用 `mps=auto`，两个 process 都只解析到 GPU 0、使用 worker 本地的 `cuda:0`，且没有 TP。
- 运行时先把逻辑 GPU ordinal 解析成物理 UUID，再按 UUID 收集 client。两个蓝色 process 因此进入同一个 physical plan。
- pipeline 对这张物理 GPU 持有一份 MPS lease。租约是本次 pipeline 对 daemon 所有权的记录，不是一块显存，也不是每个 client 各一份。
- 启动服务前，运行时还会验证两个预期的 client 都出现在 daemon 名单中，防止进程悄悄退回普通 time slicing。
- 右侧 TP process 的 `tp_size>1`，不作为合格 client。一个 process 若解析到多张物理 GPU，也会被 native MPS 拒绝。

### 代入图上的数

设同一物理 UUID 上的合格 client 数为 $N_c=2$，auto 的最小 client 数为 $N_{min}=2$：

$$N_c=2\geq N_{min}=2\Rightarrow\text{create one physical MPS plan}$$

每张被管理的物理 GPU 对应一份 pipeline lease：

$$N_{lease}=1$$

本例 TP client 数为：

$$N_{TP}=0$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N_c$ | 同一张物理 GPU 上的合格 client 数 | 教学构造的两个 process |
| $N_{min}$ | `mps=auto` 启用所需的 client 下限 | runtime 的 2 |
| $N_{lease}$ | 此 pipeline 在这张卡上的 MPS 租约数 | 每 UUID acquire 一次 |
| $N_{TP}$ | 本例允许加入的 TP client 数 | TP process 在候选收集时排除 |

这里 $N_{lease}=1$ 不表示整台机器只能有一个 pipeline。文档说明多个 serve 可加入同一物理 GPU 的 daemon，各自持有所有权，最后一个离开时才退出 daemon。本图只画一个 pipeline。

### auto 与 on 的差别

`auto` 要求同一物理 GPU 至少两个合格 process；只有一个 client 时不启用 MPS。`on` 对一个合格 process 也可启用，但没有合格 physical plan、平台不支持或物理映射不完整时会硬报错。

启动过程逐 GPU acquire，若中途失败则按相反顺序 rollback 已取得的 lease。运行时的 `verify()` 再核对 lease 和 client 身份。关闭时的 client 清理和 daemon 生命周期不属于本图。

### 边界与出处

MPS 是否更快取决于进程之间是否有可重叠的 GPU 工作，本步没有性能测量。pipeline edge 的传输路由不参与 MPS 资格判断。`CUDA_VISIBLE_DEVICES`、外部 MPS pipe 和手写 weight-share 环境变量等冲突配置也未展开。

- `docs/basic_usage/mps_dp.md:11-49`：on/auto 规则、单物理 GPU 限制和按 UUID 共享 daemon。
- `docs/basic_usage/mps_dp.md:71-97`：client 验证、watchdog、关闭与 dirty state。
- `sglang_omni/mps/runtime.py:81-178`：TP 排除、物理 UUID 解析和多卡 process 拒绝。
- `sglang_omni/mps/runtime.py:182-279`：按 UUID 分组、auto 的至少两个 client 和 physical plan。
- `sglang_omni/mps/runtime.py:390-492`：事务式 acquire、回滚、client token 与 verify 所面对的对象。

行号对应 `origin/main@db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6`。

### 接下来

第 6 步换一种省显存方法：不再同卡增加 replica，而让 AuK 的三个组件依次唤醒，只保留当前需要的一份在 GPU 上。

## 第 6 步 · AuK 用串行换入换出减少同时常驻

> **一句话：** 同一请求依次使用 conditioning、DiT、VAE，每次一件组件常驻、两件休眠，终态交付后才让下一请求开始。

### 图上是什么

- AuK serial offload 把 conditioning、DiT 和 VAE 三件组件的权重放在主机侧，需要时恢复到 GPU。这里 offload 指「换出再换入」，不是把计算交给 CPU。
- 请求 A 从 conditioning 开始持有 owner。三帧分别表示三个 GPU stage：当前组件为蓝色常驻，另外两件为灰色休眠。
- 每次切换先对旧组件 `sleep()`，再对新组件 `wake()`。sleep 释放 GPU 物理页，wake 从主机副本恢复权重值；虚拟存储地址保持稳定。
- B 在 A 持有期间等待。A 的 decode 终态结果交付后，coordinator 才释放 owner，B 才能从 conditioning 开始。
- 最后 VAE 可保持常驻，文档明确 decode 后 VAE 留下。图中第三帧只强调计算时的一件常驻，不推断下一切换何时发生。

### 代入图上的数

组件数为 $C=3$，每次切换后常驻数为 $R=1$，休眠数为：

$$S=C-R=3-1=2$$

请求所有权数量为 $O=1$，配置还固定：

$$B_{max}=1,\qquad N_{process}=1,\qquad TP=1$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $C$ | 参与 serial offload 的组件数 | conditioning、DiT、VAE 三件 |
| $R$ | 每次切换后的 GPU 常驻组件数 | coordinator 的一个 `resident_component` |
| $S$ | 当前休眠组件数 | 3 减 1 |
| $O$ | 同时持有整条 AuK 路线的请求数 | coordinator 的一个 owner |
| $B_{max}$ | offload 模式的 batch 上限 | 配置强制为 1 |
| $N_{process},TP$ | 进程副本数与张量并行度 | 配置强制都为 1 |

两件休眠只表示组件个数为 2。三件组件权重字节数不同，所以不能从 $S/C=2/3$ 推出节省三分之二的显存；本图没有这个结论。

### 为什么所有权要留到结果交付

`begin()` 让 conditioning 在已有 owner 时等待，并检查后续 stage 是否属于同一个 request 和预期 phase。`finish()` 推进 conditioning → auk_engine → decode → result，失败、取消或关闭则释放 owner。

scheduler 在计算返回后同步 CUDA stream，再调用 finish，避免计算仍在写显存时就换出或释放。`claim_result()` 确认请求仍有所有权；只有 terminal 且 delivered 时，`release_result()` 释放 owner。这样 B 不会在 A 的结果尚未交付时抢进同一条串行路线。

### 边界与出处

serial offload 要求标准线性 pipeline、同一 CUDA GPU、同一 process、一个 process replica、TP1 和 batch size 1，并同时启用三个 GPU stage。权重源默认 `mmap`，也可配置 host RAM 或可写 cache。换入换出耗时和性能收益需要测量，本章不给出。

- `docs/cookbook/auk.md:138-149`：serial offload 启动方式、单请求限制、VAE 常驻和权重来源。
- `sglang_omni/models/auk/config.py:112-185`：共同启用、单卡同进程、单副本、TP1、batch1 和线性图校验。
- `sglang_omni/models/auk/serial_offload.py:27-100`：owner、phase、等待、begin/finish 和阶段推进。
- `sglang_omni/models/auk/serial_offload.py:115-172`：结果交付释放、owner 清理和先 sleep 后 wake。
- `sglang_omni/models/auk/offload_scheduler.py:37-69`：计算后同步，再 finish。
- `sglang_omni/scheduling/stage_residency.py:78-168`：稳定地址、物理页暂停与主机副本恢复。

行号对应 `origin/main@db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6`。

### 接下来

本章已经给出比例、reserve、KV、共享权重、MPS 和串行 offload 的预算边界。下一章把这些配置变化放回时间线，测量首音与卡顿究竟改变在哪一段。
