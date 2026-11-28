## 第 1 步 · 三样东西要分清

> **一句话：** 这个构造的请求把组好的文字、一个模型名和一把 API key 发给地址选定的同一家服务。

### 图上是什么

- 画面按顺序形成：先出现空的服务框，三张卡再逐一到达，箭头和 `1 + 1 + 1` 的算式最后出现。
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

## 第 2 步 · 地址决定目的地

> **一句话：** 只换请求地址，同样三部分可以留在这台 Mac，也可以发到另一台电脑。

### 图上是什么

- 画面按顺序形成：先是顶卡，再是两个带主机名的地址面板、各自的目的地结果，然后地址 B 被选定，最后是 `2 · 1` 的数量行。
- 顶卡重复第 1 步的文字、模型名和钥匙。两个面板只换地址。
- 主机名是地址里点名的电脑。面板只画主机名，让本步只看目的地。
- 地址 A 画出 `127.0.0.1`，它是 loopback 地址，指向本机。公开的 Ollama 预设是 `http://localhost:11434/v1`，也是本机地址。这个构造的面板使用 `127.0.0.1`，并省略协议、端口和路径。
- 地址 B 画出 `api.example.com`，指向构造的另一台电脑。图中假设两个服务都能连通。
- 箭头表示两个候选方向。一套配置选定一个地址，所以请求只有一个目的地，不会把两份都发出去。
- 两个例子都带钥匙，保持其他条件不变。允许空钥匙的本机服务也可以不带钥匙。

### 代入图上的数

| 要算的量 | 从哪来 | 结果 |
|---|---|---:|
| 候选地址 | 两个构造的面板 | 2 个 |
| 一套配置的目的地 | 选定一个地址 | 1 个 |

这些数字只描述图，不是 Voxt 的上限。Voxt 可以保存更多服务配置。

### 地址边界

外部地址意味着文字和已配置的钥匙离开这台 Mac。loopback 地址让 HTTP 交换留在本机，但不表示模型在 Voxt 进程里运行。本机模型服务是另一个程序。

Voxt 还会区分互联网目的地、私有网络和本机名称目的地，这项分类不会查询 DNS。这些额外类别不放进两格对照。私有网络地址也可能在这台 Mac 之外。

### 接下来

地址决定了目的地。下一步打开一套配置，看 Voxt 从哪里读出完整钥匙。

### 源码出处

公开基线：`sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`，路径均相对该仓库。

- 地址解析和允许的 URL 形式：`Voxt/internal/llm/presets.go:92-138`。
- 不查 DNS 的 loopback、私有网络和本机名称分类：`Voxt/internal/providers/providers.go:92-117`。
- 聊天请求使用解析后的地址：`Voxt/internal/llm/openai.go:177-211`。
- HTTP 请求发往这个 URL：`Voxt/internal/llm/openai_http.go:22-38,63-71`。
- Ollama 的公开本机预设和可选钥匙：`Voxt/internal/llm/presets.json:6`。

## 第 3 步 · 设置与钥匙串

> **一句话：** Voxt 把配置的地址、模型名和完整 API key 分开保存。

### 图上是什么

- 画面按顺序形成：先是两个空框，配置名、地址、模型名逐一进入设置框，随后出现「这里没有 API key」一行，最后钥匙串项目得到名字和完整钥匙。
- `demo` 是构造的配置 ID。保存的设置包含构造的地址和模型名，不包含 API key。
- 钥匙串是 Mac 的密码存放处。Voxt 在登录钥匙串里使用 generic-password 项目，服务名为 `VoxtNew`。
- 项目的 account 名是 `llm.demo`。其中 `llm` 表示语言模型配置，`demo` 是配置 ID。真实项目保存完整钥匙，只有教学图会打码。
- 最后几行写明访问边界：以这个用户身份运行的任何进程都能读取钥匙，不会再弹窗询问。这个项目并非只允许 Voxt 读取。

### 项目名怎么来

语言模型配置把类型和 ID 用一个点连起来：

`Account(LLM, "demo") = "llm." + "demo" = "llm.demo"`

语音识别配置使用 `asr.<id>`，不在本章的请求里。

### 设置存在哪里

设置是版本化的 JSON 文档，存在 store 的 `documents` 表里，键为 `settings:app`，不是单独的 `settings.json` 文件。provider 条目包含 `id`、可选的 `endpoint`、可选的 `model` 和生成设置，没有 API key 字段。

在对话框里保存新输入的钥匙时，Voxt 先写钥匙串项目，再更新配置。`Set` 通过标准输入把秘密交给 `/usr/bin/security`，不把它放进进程参数。

### 读取和访问边界

打开语言模型连接时，Voxt 在后台读取 `llm.<id>`，再把完整钥匙交给 provider 客户端。项目不存在时读到空钥匙。后面的步骤会继续跟踪这把钥匙进入请求的位置。

钥匙串项目没有应用访问列表。`/usr/bin/security` 工具以及同一用户的其他进程都能读取它，不会弹窗。因此，钥匙串不能防止已经以这个用户身份运行的其他进程读到钥匙。

### 接下来

保存的配置提供地址和模型名，钥匙串提供钥匙。下一步把文字和模型名放进请求正文。

### 源码出处

公开基线：`sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`，路径均相对该仓库。

- 设置文档和存储边界：`Voxt/internal/settings/settings.go:1-5`；`Voxt/internal/settings/service.go:16`。
- provider 字段和不保存的钥匙：`Voxt/internal/settings/providers.go:17-28,39-43`。
- 钥匙串 account 命名：`Voxt/internal/providers/providers.go:35-37`。
- 钥匙串服务、访问边界和后台调用要求：`Voxt/internal/secrets/secrets.go:1-19,34-49`。
- 读取钥匙，以及通过标准输入保存：`Voxt/internal/secrets/secrets.go:85-117`。
- 保存顺序和配置更新：`Voxt/remote_dialog_controller.go:229-274`。
- session 打开连接时读取钥匙：`Voxt/remote_link.go:189-200`。

## 第 4 步 · 文字和模型名进入正文

> **一句话：** 请求正文指定模型，并在消息列表里装入文字。

### 图上是什么

- 画面按顺序形成：先是两张来源卡和一个空正文，模型名进入 `model` 字段，文字再进入 `messages` 字段，最后出现没有钥匙的一行。
- 深色的模型名卡和蓝色文字卡重复第 1 步的值。箭头指向接收它们的字段。
- 正文是请求的主要内容。`model` 是 `demo-model`；`messages` 的简略消息列表里有 “Good morning.”。
- 橙色一行说明 API key 不在这个正文里。下一步画出它单独的位置。
- 方括号和省略号表示构造的简略正文，不是完整 JSON。生成参数和其他请求设置都省略了。

### 请求怎样组成

`partRequest` 提供已经组装好的 `llm.Request.Messages` 列表。本章不组装这个列表；第 6 章讲其中的角色、指令和清理输入。

在普通的 OpenAI 兼容 Chat Completions 路线上，`chat` 使用请求里的模型名；为空时用配置的默认模型。`body` 复制每条消息的 `role` 和 `content`，再把 `model` 和 `messages` 写进一个 map。其他请求设置可以向这个 map 添加字段。

`send` 把这个 map 序列化成 JSON，使用 HTTP `POST`，并设置 `Content-Type: application/json`。目的地是解析后的基础地址加 `/chat/completions`。API key 不在这个 map 里。

### 范围

图中只讲 Chat Completions。Voxt 的 Responses API 会转换出不同正文，登录路线另有规则。这些替代路线和所有生成字段都不在本步展开。

### 接下来

文字和模型名已经进入正文字段。下一步附上钥匙串里的钥匙，但不把它放进消息内容。

### 源码出处

公开基线：`sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`，路径均相对该仓库。

- 交给后端的已组装消息：`Voxt/internal/session/headstart.go:349-352`。
- 消息角色和内容、模型名回退和正文字段：`Voxt/internal/llm/openai.go:73-85,103-104,177-211`。
- Chat Completions 路径选择：`Voxt/internal/llm/responses.go:33-39`。
- JSON 序列化、POST 和内容类型：`Voxt/internal/llm/openai_http.go:22-50`。
- 钥匙单独进入请求头：`Voxt/internal/llm/openai_http.go:51-65`。

## 第 5 步 · 钥匙进入请求头

> **一句话：** Voxt 把完整钥匙放在 `Authorization` 请求头的 `Bearer` 后面，不放进请求正文。

### 图上是什么

- 画面按顺序形成：左边是钥匙串项目，右边是正文已完成、请求头空着的一次请求；先出现 `Authorization` 标签和 `Bearer` 一词，最后钥匙从钥匙串飞进请求头。任何相位里正文都没有钥匙。
- 左卡重复第 3 步构造的钥匙串项目 `llm.demo`。打开语言模型连接时，Voxt 从这个项目读出完整钥匙。
- `Authorization` 是请求头的名字。`Bearer` 指明认证方案。一个空格分开 `Bearer` 和钥匙。
- 教学图给钥匙打码。真实的请求头值包含完整钥匙，没有省略号，也不是缩短的钥匙。
- 同一次请求还有第 4 步的正文。模型名和消息留在正文里，与这个请求头分开。两部分都发往第 2 步选定的同一个地址。

### 请求头怎么写，空钥匙怎么办

Voxt 用 `"Bearer " + token` 拼出请求头值，再调用 `req.Header.Set`。保存的钥匙本身不含 `Bearer` 和分隔空格。

钥匙为空时不写 `Authorization` 请求头。要求钥匙的预设会在传输前拒绝请求。允许空钥匙的预设可以不带这个请求头发送。登录令牌路线另有规则，不在本章展开。

### 传输和错误边界

Voxt 向外部服务发出请求后，钥匙串保存并不能把这次发出的钥匙留在 Mac 上。选定的服务收到请求头，请求文字则随正文发出。

Voxt 的公开配置指南允许 API key 服务使用 HTTP，同时警告 HTTP 会明文传输 API key 和文字。外部服务应使用 HTTPS。把钥匙放进请求头以及给错误打码，都不能让 HTTP 加密。

服务可能在错误响应里复述钥匙。`Chat` 调用 `scrub`，把结构化错误参数里的已知秘密替换成 `[key]`。这样，Voxt 把错误记进 session 历史时，可以减少留下的秘密。

### 接下来：第 6 章

连接已经有了目的地、正文和授权信息。本章停在已经组装好的 `messages` 列表，没有展开列表内部。第 6 章《文字加工厂》讲这个列表里的角色、指令、清理输入和输出约定。

### 源码出处

公开基线：`sglang-omni@14046fc02c5268df8b7d4a9a3094b15e1150060e`，路径均相对该仓库。

- session 打开连接时读取钥匙：`Voxt/remote_link.go:189-200`。
- 传输前检查必需钥匙和可选钥匙：`Voxt/internal/llm/openai.go:177-190`。
- `Bearer` 前缀、空钥匙行为和请求头位置：`Voxt/internal/llm/openai_http.go:22-25,51-66`。
- HTTP 明文警告：`docs/get_started/voxt-tutorials/byok.md:17-19`；英文：`docs/get_started/voxt-tutorials/en/byok.md:17-19`。
- 错误打码：`Voxt/internal/llm/openai.go:154-174`；拒绝、错误正文和流式情形：`Voxt/internal/llm/openai_test.go:241-269`。
- 留给第 6 章的消息组装：`Voxt/internal/session/headstart.go:349-352`。
