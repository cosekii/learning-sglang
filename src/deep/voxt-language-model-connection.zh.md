## 第 1 步 · 三样东西要分清

> **一句话：** 这个构造的请求把组好的文字、一个模型名和一把 API key 发给地址选定的同一家服务。

### 图上是什么

- 蓝卡是第 4 章交出的原话 “Good morning.”。本章一直用蓝色表示文字内容。
- 中间的卡是构造的模型 ID `demo-model`。模型名让服务挑选模型；这次请求不会把模型权重上传过去。
- 橙卡是打码的教学 API key。API key 是客户端访问配置服务时出示的密钥。真实请求使用完整钥匙，不是图上的打码形式。
- 三个箭头汇到同一家配置的服务。它们是一次请求的组成部分，不是三次请求。
- `api.example.com` 是构造的外部主机。副标题写明本例的后果：文字和秘密离开这台 Mac。本例假设这套配置有钥匙；一些本机和自定义服务允许钥匙为空。

### 公式

$$
N=T+M+K
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $N$ | 这里要分清的请求内容种数 | 本步计算 |
| $T$ | 组好的文字内容 | 一个构造的输入 |
| $M$ | 模型名 | 一个构造的 `demo-model` |
| $K$ | API key | 本例配置的一把钥匙 |

### 代入图上的数

| 要算的量 | 算式 | 结果 |
|---|---|---:|
| 要分清的请求内容 | $1+1+1$ | 3 种 |

这里数的是内容种类，不是字节数、费用或耗时。endpoint 决定目的地，不是请求里的第 4 种内容。

### 请求边界

`partRequest` 把消息列表交给后端。`OpenAI.body` 把消息列表和模型名写进 JSON 正文，`OpenAI.send` 把非空钥匙写进 HTTP `Authorization` 请求头。后面几步逐一展开。

本章先走普通的 OpenAI 兼容 Chat Completions 路线。Voxt 也支持 Responses API 和登录 ChatGPT 的路线；它们的不同字段不放进这个开场例子。

### 接下来

三样东西有一个目的地。下一步比较本机地址和另一台电脑上的地址。

### 源码出处

公开基线：`sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`，路径均相对该仓库。

- session 把消息交给语言模型：`Voxt/internal/session/headstart.go:349-352`。
- 模型名和消息进入请求正文：`Voxt/internal/llm/openai.go:73-85,103-104`。
- 请求目的地和授权请求头：`Voxt/internal/llm/openai.go:177-211`；`Voxt/internal/llm/openai_http.go:22-25,38-66`。
- session 打开 provider 时读取钥匙：`Voxt/remote_link.go:189-200`。
- 允许空钥匙的预设，包括本机和自定义服务：`Voxt/internal/llm/presets.json:6-7,14,20`。
