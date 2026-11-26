## 第 1 步 · 共用一个网址不等于能力相同

**一句话。** 两个 worker 可以共用同一个 router 网址，但只有一个能接收请求里的输入形式。

### 图上是什么

- `worker` 是 router 可以调用的一个 Omni server。`router` 持有共用网址，为每个请求选择 worker。
- 请求指定 model M，带一张图片。worker A 只接收文字，不能接收这个请求；worker B 接收图片输入，可以接收。
- 指向 A 的虚线不是实际 dispatch，而是兼容性过滤必须排除的选择。
- 数字是两个已配置 worker、一个图片请求、一个兼容 worker。它们是构造值，不是 benchmark。

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
- direct 面板要求整组 worker 有同一个具体默认模型和等价 generation profiles。router 已知每个候选 worker 接收同一契约，所以先选择，再流式发送请求体。
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
