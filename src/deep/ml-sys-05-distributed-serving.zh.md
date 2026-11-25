## 第 1 步 · 先看服务启动付出的等待

**一句话。** 公开日志从等待 SGLang 到收到 ready 相隔 21.600474 秒，HTTP 服务又过 0.847491 秒才启动。

### 图上是什么

- 三个时间戳依次是开始等待 `sglang0`、`sglang0 is ready` 和 HTTP 在 `:8080` 启动。
- 蓝色两段属于 worker 启动，橙色表示 HTTP 服务。`ready` 在这里指 worker 完成启动、可以参加计算。
- 所有时间差都由相邻时间戳相减得到；最后一个数从第一条日志算到 HTTP 启动。

### 公式与符号

$$W_{\mathrm{ready}}=t_{\mathrm{ready}}-t_{\mathrm{wait}},\qquad W_{\mathrm{http}}=t_{\mathrm{http}}-t_{\mathrm{ready}}$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $t_{\mathrm{wait}}$ | 第一条等待日志的时刻 | 公开日志，20:32:52.029318 |
| $t_{\mathrm{ready}}$ | worker 就绪日志的时刻 | 公开日志，20:33:13.629792 |
| $t_{\mathrm{http}}$ | HTTP 启动日志的时刻 | 公开日志，20:33:14.477283 |
| $W_{\mathrm{ready}}$ | 等到 worker 就绪的时间 | 本步相减 |
| $W_{\mathrm{http}}$ | ready 到 HTTP 启动的时间 | 本步相减 |
| $W_{\mathrm{total}}$ | 第一条日志到 HTTP 启动的总等待 | 本步相加 |

### 代入图上的数

$$W_{\mathrm{ready}}=21.600474\ \mathrm{s},\qquad W_{\mathrm{http}}=0.847491\ \mathrm{s}$$

$$W_{\mathrm{total}}=21.600474+0.847491=22.447965\ \mathrm{s}$$

`src/ml-sys/numbers.ts` 保存相对第一条日志的微秒数，组件再除以 $1{,}000{,}000$ 转成秒。caption 保留两位小数，图上和本节保留六位小数。

这是文章记录的一次单节点启动，不代表每次启动都要这么久，也不提供多节点加速比。本章先借它分清「worker 就绪」和「HTTP 开始监听」两个事件。

### 接下来

启动命令怎样把两台机器组成同一个服务？下一步先看两节点的分工。

来源：`Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:69-88`；`ai-dynamo/dynamo@670661f6` 的 `lib/llm/src/engines/sglang/worker.rs:341-343`、`launch/dynamo-run/src/lib.rs:407-410`。
