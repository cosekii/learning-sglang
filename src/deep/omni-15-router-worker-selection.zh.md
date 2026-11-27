## 第 1 步 · 共用一个网址不等于能力相同

**一句话。** 两个 worker 可以共用同一个 router 网址，但只有一个能接收请求里的输入形式。

### 图上是什么

- `worker` 是 router 可以调用的一个 Omni server。`router` 持有共用网址，为每个请求选择 worker。
- 请求指定 model M，带一张图片。worker A 只接收文字，不能接收这个请求；worker B 接收图片输入，可以接收。
- 两个 worker 起初都是候选。图片检查先排除 A，留下一个候选。确认 B 能接收图片后，才出现蓝色的 dispatch 路径。指向 A 的虚线不是实际 dispatch。
- 数字是两个已配置 worker、一个图片请求、最后留下的一个兼容 worker。它们是构造值，不是 benchmark。

### 这里的兼容是什么意思

兼容先看 worker 配置的 service profile，不看它当前有多快。后面步骤才加入 health 和活跃请求数。一个 worker 即使很快，不能接收这种输入形式，仍然不是候选。

router 的 typed-image 集成测试使用同样边界：图片请求只会到 profile 支持 typed image 输入的 worker。

### 接下来

router 需要请求事实才能过滤 profile。下一步看它什么时候能沿用已知契约，什么时候必须分类请求体。

来源：`sglang_omni_router/tests/chat_http.rs:1075-1098`；`sglang_omni_router/src/worker_pool/mod.rs:338-373,544-578`。

## 第 2 步 · 选择前先确定路由事实

**一句话。** 同构 worker 可以共用 direct 路由契约；异构 worker 需要 router 先分类每个请求体。

### 图上是什么

- `classify` 是从请求体读取路由事实：模型、内容形式、输入和输出模态、响应格式、流式模式。它不是完整应用校验。
- direct 面板要求整组 worker 有同一个具体默认模型和等价 generation profiles。`generation profile` 是一种受支持的请求能力组合。router 已知每个候选 worker 接收相同请求，所以先选择，再流式发送请求体。
- classified 面板的 worker 契约不同。router 把请求体读一次，完成分类并选择 worker，然后转发原始字节。
- 两条路都在路由事实确定后选择。classified 路径分类时不占上游连接。

### 为什么有两条路

请求体分类要占内存和 CPU。同构组可以在启动时证明请求内容不会改变兼容 worker 集合，因此省去每个请求的分类工作。worker 数量本身不能决定走哪条路。

direct 不会跳过兼容性或 health。它复用已证明的共同契约，然后执行相同的 health 检查、选择策略和 worker 负载计数。

### 接下来

分类得到的事实必须匹配 worker 的 profile。下一步看为什么 worker 不能把不同 profile 行里的能力拼起来。

来源：`sglang_omni_router/src/http_generation/mod.rs:82-153`；`sglang_omni_router/src/http_generation/classify.rs:48-120`；`sglang_omni_router/src/worker_pool/mod.rs:804-840`。

## 第 3 步 · 要求一整行 profile 匹配

**一句话。** 只有 worker 的同一个 profile 行满足请求的所有路由事实，这个 worker 才兼容。

### 图上是什么

- `profile 行` 是模型、模态、响应格式和流式模式的一种受支持组合。router 不能从不同格子里各挑一项。
- 请求需要 model M、图片输入、WAV 输出和流式模式。model N 是另一个模型。
- A 的第 1 行有 M，但接收文字且不支持流式。第 2 行有所需媒体和流式模式，却使用 N。两行都不匹配，所以 A 有 $0+0=0$ 行匹配。
- B 的一行包含全部四项事实，所以 B 有一行匹配。匹配行多支持一些能力也可以，缺少要求的能力则不行。

### 代入图上的数

| worker | 第 1 行 | 第 2 行 | 匹配行数 |
|---|---|---|---:|
| A | 输入、输出和流式事实不符 | model M 不符 | $0+0=0$ |
| B | 每项都匹配 | 不需要 | $1$ |

router 使用“任意一整行匹配即可”的检查。它不会对多行取并集，因为 worker 没有声明拼起来的执行路径。

### 接下来

兼容 profile 是静态配置。下一步加入会变化的 health 信号，它能让兼容 worker 暂时退出候选。

来源：`sglang_omni_router/src/worker_pool/profile.rs:754-904,1129-1131,1311-1334`。

## 第 4 步 · 按 health 过滤

**一句话。** 兼容 worker 连续通过足够多次 health probe 后，才能进入选择。

### 图上是什么

- `health probe` 是向 worker 配置的健康网址发送 HTTP GET。任意 2xx 状态算成功，也就是 HTTP 状态 200 到 299。其他状态、传输错误或 timeout 算失败。timeout 指超过探测期限仍没有回应。
- 每个 worker 从不可选择的 `UNKNOWN` 开始。左图连续两次 200 后成为 `HEALTHY`，右图连续三次失败后成为 `UNHEALTHY`。
- 只有 `HEALTHY` 能进入选择，`UNKNOWN` 和 `UNHEALTHY` 都被排除。
- 两次成功和三次失败是随仓库发布的默认值，不是固定协议规则。部署者可以配置两个门槛。

### 代入图上的数

| 探测结果 | 成功连击 | 失败连击 | 状态 |
|---|---:|---:|---|
| 起点 | 0 | 0 | UNKNOWN |
| 200 | 1 | 0 | UNKNOWN |
| 200 | 2 | 0 | HEALTHY |
| 另一次起点后的 503 | 0 | 1 | UNKNOWN |
| timeout | 0 | 2 | UNKNOWN |
| 503 | 0 | 3 | UNHEALTHY |

成功会把失败连击清零，失败会把成功连击清零。worker 成为 unhealthy 后，单独一次成功仍保持 unhealthy，直到成功次数达到门槛。成为 healthy 后，单独一次失败也仍保持 healthy，直到失败次数达到门槛。

应用响应不会直接设置这些状态。传输或协议失败可以请求立即探测，但 health 仍由普通探测门槛决定。

### 接下来

剩下的 worker 既兼容又 healthy。下一步用 round robin 在它们之间轮换，不比较活跃请求数。

来源：`sglang_omni_router/src/worker_pool/health.rs:10-17,211-308`；`sglang_omni_router/src/worker_pool/mod.rs:124-126`；`sglang_omni_router/src/config.rs:290-325`；`sglang_omni_router/src/http_relay/mod.rs:188-226`。

## 第 5 步 · 用 round robin 轮换

**一句话。** round robin 在一个共享最近使用顺序里取第一个候选 worker，再把它移到队尾。

### 图上是什么

- A、B、C 都兼容且 healthy。前三行展示每次选择前后的顺序：$[A,B,C]\rightarrow[B,C,A]\rightarrow[C,A,B]\rightarrow[A,B,C]$。
- 选中的 worker 移到所有其他 worker 后面，包括当前请求不能选的 worker。其他 worker 保持相对顺序。
- 六个请求依次选 A、B、C、A、B、C。构造例里六个请求都未结束，说明未结束的请求不会改变 round-robin 轮换顺序。

### 图上的顺序

$$\text{selections}=(A,B,C,A,B,C)$$

整个 worker pool 共用一个最近使用列表，不为每种请求类型各设一个游标。候选 worker 很少时也使用同一列表，跳过的 worker 保持相对顺序。如果扫描后没有候选 worker，就返回无选择，不轮换列表。

round robin 是默认路由策略。经过第 3、4 步过滤后，它只在兼容且 healthy 的 worker 之间轮换。

### 接下来

轮换可能把请求交给活跃请求更多的 worker。下一种策略 least requests 会比较这些数量，只在并列最少的 worker 之间轮换。

来源：`sglang_omni_router/src/worker_pool/selection.rs:14-23,49-60`；`sglang_omni_router/src/worker_pool/mod.rs:1263-1356`；`sglang_omni_router/src/config.rs:262-276`。

## 第 6 步 · 选择活跃工作最少的 worker

**一句话。** least requests 在活跃数最少的候选 worker 中选择，并列时沿用共享的最近使用顺序。

### 图上是什么

- `active requests` 是已选择但响应还没结束的工作。它们是 router 持有的 admission credits，不是 GPU 利用率或 worker 内部队列。
- 这是一个新例子，初始 recency（轮换顺序）为 $[A,B,C]$，不是第 5 步的延续。每个请求停留两个状态。先读取 A、B、C 的数量，找出最小值并按顺序扫描。再写出被选 worker 的选择前 $\rightarrow$ 后数量，并把它移到队尾。下一行使用更新后的值。
- 起初 B、C 并列 0，所以按顺序选 B。随后 C 以 0 成为唯一最少。第三行 B、C 并列 1，又按顺序先选 B。
- 独立的轮换并列卡片使用活跃数 $[2,1,1]$ 和 recency $[A,C,B]$。B、C 并列 1，所以选 C。它不是上面四个请求之后的第五个请求。
- A 始终有两个活跃请求，这几行里从未进入最少集合。在同样的初始顺序 $[A,B,C]$ 和负载 $[2,0,0]$ 下，round robin 会选 A，least requests 会选 B。

### 公式与符号

$$m=\min(L_A,L_B,L_C),\qquad \mathcal C=\{w\mid L_w=m\}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $L_w$ | worker $w$ 的活跃 admission credits | 图上当前行 |
| $m$ | 候选 worker 的最小活跃数 | 每行计算 |
| $\mathcal C$ | 并列最少的 worker 集合 | 每行计算 |

### 代入图上的数

| 请求 | 选择前 A、B、C 负载 | 最少集合 | 选择 | 选择后负载 |
|---:|---|---|---|---|
| 1 | 2、0、0 | B 和 C | B | 2、1、0 |
| 2 | 2、1、0 | C | C | 2、1、1 |
| 3 | 2、1、1 | B 和 C | B | 2、2、1 |
| 4 | 2、2、1 | C | C | 2、2、2 |
| 独立轮换例 | 2、1、1 | B 和 C | C | 图上不更新 |

selector 的锁覆盖最近使用顺序、负载观察和预留，避免两个并发选择者使用同一组旧计数。speech batch 按条目数加权，不是一个 envelope 固定加一；图上使用普通的加一请求。

### 接下来

计数在 dispatch 前增加。下一步跟随凭证，看它怎样一直持有到响应头之后，并只在终止事件发生时释放。

来源：`sglang_omni_router/src/worker_pool/mod.rs:565-605,1358-1439`；`sglang_omni_router/src/worker_pool/selection.rs:7-12`；`sglang_omni_router/src/worker_pool/admission.rs:49-88`。

## 第 7 步 · 凭证持有活跃数 +1 到响应结束

**一句话。** `RequestLease` 是持有被选 worker 活跃数 +1 的凭证；响应结束、出错或取消时收回。

### 图上是什么

- 这是一个新的单请求例子。选择后、dispatch 前，被选 worker 的活跃数从 0 变成 1。dispatch 是把请求发送给这个 worker。
- 上传和响应头到达时，计数都保持 1。响应头开始下游响应，不代表上游工作结束，也不会释放凭证。
- 收回卡片包括响应 EOF、上游错误、下游取消或其他提前丢弃。EOF 是响应结束。每条路径都只收回一次凭证，计数回到 0。
- 一个普通请求持有 1 credit。speech batch 按条目加权，三个条目会增加 3，之后减去 3。

### 代入图上的数

| 边界 | 活跃数 | 原因 |
|---|---:|---|
| 选择前 | 0 | 还没有 worker 凭证 |
| 选择后、dispatch 前 | 1 | `RequestLease::new` 增加 1 credit |
| 响应头到达 | 1 | 凭证移入 `DirectResponseBody` |
| EOF、出错或取消 | 0 | 丢弃响应体时恰好丢弃一次凭证 |

同一个凭证还持有 admission permits 和可选的 WebSocket session permit，丢弃时也会释放它们。累计 dispatch 计数不会减少，只有活跃负载减少。

对 HTTP 来说，活跃数不是每个 worker 的请求上限。它供 least-requests 选择使用，worker 仍负责自己的执行和队列容量。

### 接下来

普通 HTTP 计数只是路由的一项输入。下一步先看服务类别、session 容量和固定目标，再进入故障边界。

来源：`sglang_omni_router/src/worker_pool/admission.rs:49-88`；`sglang_omni_router/src/http_relay/mod.rs:151-233`；`sglang_omni_router/src/http_relay/response_body.rs:16-101`；`sglang_omni_router/tests/chat_http.rs:901-939,1282-1336,1419-1432`。

## 第 8 步 · 服务类别、session 槽位和固定目标

**一句话。** `ServiceClass` 决定 admission 桶，WebSocket session 还需要 worker 有空槽位，固定目标则不经过选择策略。

### 图上是什么

- `ServiceClass` 是请求的服务类型。它对应同名的 `CapacityClass`，后者持有这类服务的 admission permits。六种类型是 `generation_http`、`speech_http`、`speech_batch`、`transcription_http`、`speech_websocket` 和 `realtime_websocket`。
- 前四种使用普通 HTTP dispatch。profile 和 health 过滤后，round robin 或 least requests 选择 worker。活跃负载供策略比较，不是每个 worker 的请求上限。
- 两种 WebSocket 类型使用 session dispatch。兼容且 healthy 的 worker 还要有空 session permit，才能进入策略的候选集合。session 占用数和活跃请求数是两本账。
- 构造例中，A 的活跃工作更少，但唯一 session 槽位已满，所以 router 跳过 A。B 有 3 个活跃请求，两个 session 槽位已用 1 个，因此 B 可以入选并被选中。选择后，B 变成 4 个活跃请求、2 个 session 槽位已用。`RequestLease` 持有第二个槽位。
- uploaded-voice 请求交给配置的 voice owner，不经过策略。指定 worker 的后续请求交给这个 pinned worker。voice owner 仍要匹配 profile 且 healthy；session 还要有空槽位。pinned worker 也必须 healthy。

### 公式与符号

$$F_w=C_w-U_w$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $C_w$ | worker $w$ 配置的 session 容量 | 图上分母 |
| $U_w$ | 已经占用容量的 session 数 | 图上分子 |
| $F_w$ | 空 session 槽位数 | $C_w-U_w$ |

通过 profile 和 health 检查后，只有 $F_w>0$ 的 worker 才能进入 session 选择。least requests 使用的活跃数不能代替 $F_w$。

### 代入图上的数

| worker | 选择前活跃数 | session 已用 / 上限 | 空槽位 | 能否入选 | 选择后活跃数 | 选择后 session |
|---|---:|---:|---:|---|---:|---:|
| A | 0 | 1 / 1 | $1-1=0$ | 不能 | 0 | 1 / 1 |
| B | 3 | 1 / 2 | $2-1=1$ | 能，被选中 | 4 | 2 / 2 |

B 的凭证同时持有普通活跃数 +1 和额外的 session permit。凭证丢弃时一起释放。图上的数量是构造的，用来说明活跃数更少也不能越过已满的 session 池。

### 接下来

这张地图最后回到一次普通 HTTP 响应选中的 worker。最后一步跟随这个 worker 经历提交后的 reset。

来源：`sglang_omni_router/src/worker_pool/profile.rs:15-82,133-139`；`sglang_omni_router/src/worker_pool/mod.rs:338-463,499-541,635-644,792-801,942-977`；`sglang_omni_router/src/worker_pool/admission.rs:66-87`。

## 第 9 步 · 选中之后仍可能故障

**一句话。** router 选中一个兼容且 healthy 的 worker 后，如果它中途故障，router 不会把这个请求转到另一个 worker。

### 图上是什么

- 这是一个使用构造负载的新例子，不接着第 6 步最后的 2、2、2，也不接着第 7 步的新单个请求。
- A 的 profile 不匹配，不是候选。B、C 兼容且 healthy，活跃数分别是 2 和 1。least requests 选择 C，并在 dispatch 前把 C 增加到 2。
- 随后 C 发送 `200 OK` 和 `data: one`，再发生构造的 reset，也就是连接断开。B 仍是 healthy，但没有路径让这个响应转到 B 继续。
- reset 丢弃响应体凭证。图上 C 的活跃数从 2 降到 1；这次清理不会把截断的响应补完。
- C 被选中时的 health 不能保证整个响应完成。传输或 body 错误可以请求立即 health probe，后续能否入选仍要等配置门槛。
- 收尾分开两个边界：RESET 释放这次响应的凭证，后续选择仍看 health probe。两个边界都不会让响应转到 B 继续。

### 代入图上的数

| worker | profile | 选择时 health | 选择前活跃数 | 选择后活跃数 | RESET 后活跃数 |
|---|---|---|---:|---:|---:|
| A | 不匹配 | 不使用 | 不使用 | 未选择 | 未选择 |
| B | 匹配 | HEALTHY | 2 | 2 | 2 |
| C | 匹配 | HEALTHY | 1 | 2 | 1 |

上游 HTTP 客户端禁用重试，relay 只向选中目标发送一次，没有备选 dispatch 循环。响应体凭证仍会终止并释放计数，如最后的 $2\rightarrow1$ 所示，但清理不会把部分响应变成完整响应。

### 全书边界

这是本书最后一章。选择决定一个目标，终止清理释放凭证，health probe 决定后续选择。图上已经回答 RESET 后凭证怎样释放，但不承诺响应完整完成。

来源：`sglang_omni_router/src/worker_pool/resolver.rs:108-125`；`sglang_omni_router/src/http_relay/mod.rs:151-209`；`sglang_omni_router/src/http_relay/response_body.rs:38-72`；`sglang_omni_router/tests/chat_http.rs:1419-1432`。
