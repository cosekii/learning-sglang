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
