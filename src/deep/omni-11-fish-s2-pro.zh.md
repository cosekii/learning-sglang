## 第 1 步 · 首个非最后窗口需要 40 帧

> **一句话：** 默认首个非最后窗口在 40 帧打开；更短的请求最后直接解码。

### 图上是什么

- 请求依次经过 `preprocessing`、`tts_engine` 和 `vocoder`。
- 蓝色 `tts_engine` 是本章要打开的生成阶段。
- 40 个蓝框代表 40 帧。放大的一帧有 `c0` 到 `c9` 十个 codebook 条目。
- 算式数出首个窗口前的 400 个选择，不代表 400 次 Slow AR 调用。

### 公式

$$
N_{\text{choices}} = F_{\text{first}} \times C,\qquad
D = \frac{F_{\text{first}} \times S}{R}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $N_{\text{choices}}$ | 首个窗口需要的 codebook 条目数 | 400 | 本步 |
| $F_{\text{first}}$ | 首个非最后流式窗口需要的帧数 | 40 | Fish `streaming_vocoder.py` 默认值 |
| $C$ | 每帧送给 vocoder 的 codebook 行数 | 10 | 第 10 章第 8 步 |
| $D$ | 这些帧代表的声音时长 | 1.858 秒 | 本步公式 |
| $S$ | 一个 codec 帧代表的采样点数 | 2,048 | DAC 的 hop 和量化倍率 |
| $R$ | codec 采样率 | 44,100 Hz | 默认 DAC 配置 |

### 代入图上的数

$$
40 \times 10 = 400\ \text{个选择}
$$

$$
40 \times 2{,}048 = 81{,}920\ \text{个采样点}
$$

$$
81{,}920 \div 44{,}100 \approx 1.858\ \text{秒}
$$

窗口门槛和帧尺寸来自真实配置。乘法只是教学算例，不是延迟测量。

### 接下来

下一步先把参考声音也变成同样的十行表示，再开始生成。

出处：`models/fishaudio_s2_pro/config.py:23-67`；`models/fishaudio_s2_pro/streaming_vocoder.py:43-66`；`scheduling/audio_stream.py:86-148`；`models/fishaudio_s2_pro/sglang_model.py:418-510`；`models/fishaudio_s2_pro/fish_speech/models/dac/modded_dac.py:885-913,928-988`。

## 第 2 步 · 参考声音变成十行

> **一句话：** 参考 codec 把声音示例变成十行 codes，vocoder 以后也读取同样的表示。

### 图上是什么

- 参考声音是一段想让请求模仿的录音。
- 构造算例有 1 秒，每秒 16,000 个采样点。
- 重采样把它变成 44,100 个采样点，时长仍是 1 秒。
- 参考 codec 给最后一个不满的帧补位，输出 `[10,22]` code 矩阵。
- 蓝格是 codebook 条目，灰框仍表示声音采样点。

### 公式

$$
F_{\text{ref}} = \left\lceil \frac{R \times T}{S} \right\rceil,\qquad
P = F_{\text{ref}}S - RT
$$

向上取整符号表示：最后一个 codec 帧即使不满，也会补成一个完整帧。

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $F_{\text{ref}}$ | 参考声音的 codec 帧数 | 22 | 本步公式 |
| $R$ | codec 采样率 | 44,100 Hz | 第 1 步 |
| $T$ | 构造参考声音的时长 | 1 秒 | 本步算例 |
| $S$ | 每个 codec 帧的采样点数 | 2,048 | 第 1 步 |
| $P$ | 最后一帧补入的采样点数 | 956 | 本步公式 |

### 代入图上的数

$$
\left\lceil 44{,}100 \div 2{,}048 \right\rceil = 22\ \text{帧}
$$

$$
22 \times 2{,}048 = 45{,}056,\qquad 45{,}056 - 44{,}100 = 956\ \text{个补位采样点}
$$

矩阵形状是 `[codebook 行数, 帧数] = [10,22]`。16 kHz 输入是构造值，重采样率和帧尺寸来自默认 codec。

### 缓存边界

`ReferenceEncodeService` 可以跨请求复用相同参考声音的 codes。它保存 CPU tensor 并返回副本。这个成品缓存不保存 Slow AR 或 Fast AR KV。

### 接下来

第 3 步把这些 codes 和要朗读的文字一起放进 Slow AR prompt。

出处：`models/fishaudio_s2_pro/stages.py:249-376,425-490`；`scheduling/reference_encoder.py:344-413`；`models/fishaudio_s2_pro/fish_speech/models/dac/modded_dac.py:885-913,964-988`。

## 第 3 步 · Slow AR 读取声音 prompt

> **一句话：** Slow AR 读取普通文字和参考 codes，在外层循环里先选出 code 0。

### 图上是什么

- Slow AR 是外层循环，每次沿声音时间轴走一帧。
- 目标文字变成普通 tokens。22 个参考帧占 22 个标记位置。
- 每个参考位置由 code 0 提供语义 token，十行 codes 一起提供声音细节。
- 橙色输出是 Slow AR 为首个生成帧选出的 `code 0`。

### 公式

embedding 是模型读取一个 token 或 code 时使用的一串数。在标记的参考位置，Slow 输入是

$$
x_j = \frac{e_{\text{text}}(c_{0,j}) + \sum_{r=0}^{9} e_r(c_{r,j})}{\sqrt{11}}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $x_j$ | 参考帧 $j$ 的 Slow AR 输入 | 本步 |
| $c_{r,j}$ | 参考帧 $j$ 的第 $r$ 行 code | 第 2 步的 `[10,22]` 矩阵 |
| $e_{\text{text}}(c_{0,j})$ | code 0 形成的语义 token 的文字 embedding | `tokenizer.py` |
| $e_r(c_{r,j})$ | 第 $r$ 行 code 的 codec embedding | `audio_decoder.py` |
| $\sqrt{11}$ | 一份文字 embedding 加十份 codec embeddings 的缩放 | `audio_decoder.py:597-612` |

### 代入图上的数

参考声音有 $j=1\ldots22$ 个位置。每个位置合并 $1+10=11$ 份 embeddings。普通目标文字位置不做这份 codec 求和。

完整 prompt 把参考文字和语义位置放进 system 块，目标文字放进 user 块，`<|voice|>` 放进 assistant 块。本步图把它简化成两个看得见的输入。

### 接下来

Slow AR 的选择开启一帧。第 4 步打开内层 Fast AR 循环，补齐 vocoder 的另外九行。

出处：`models/fishaudio_s2_pro/tokenizer.py:53-73,94-162`；`models/fishaudio_s2_pro/model_runner.py:288-356`；`models/fishaudio_s2_pro/fish_speech/models/text2semantic/audio_decoder.py:597-612`。

## 第 4 步 · Fast AR 补齐内层九行

> **一句话：** Fast AR 在一个 Slow 帧里启动，做出 vocoder 还缺的九个选择。

### 图上是什么

- Fast AR 是内层循环，只在一个音频帧里工作。
- Slow AR 先产生原始语义 token，engine 再由它得到 vocoder 的 `code 0`。
- Fast 第 0 次调用接收 Slow 算出的数，其输出分数不当作 vocoder 选择。
- Fast 第 1–9 次调用各选一个剩余 code。
- 橙色是 Slow 原始 token，蓝色是送进 vocoder 的十行。

### 公式

对一个非结束帧：

$$
raw = B + c_0,\qquad c_0 = raw - B
$$

$$
N_{\text{Fast}} = 1 + 9 = 10,\quad
N_{\text{engine}} = 1 + 1 + 9 = 11,\quad
N_{\text{DAC}} = 1 + 9 = 10
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $raw$ | Slow AR 的语义词表 token | `sglang_model.py` 的 Slow 输出 |
| $B$ | 附加语义词表起点，这个 checkpoint 是 151,678 | `request_builders.py:133-137` |
| $c_0$ | 从 $raw$ 得到的语义 DAC code | 本步公式 |
| $N_{\text{Fast}}$ | 本帧 Fast 调用数，包含第 0 次 | Fast 循环 |
| $N_{\text{engine}}$ | 保存行数：一个原始 token 加十个 DAC codes | `payload_types.py` |
| $N_{\text{DAC}}$ | 去掉 $raw$ 后送入 vocoder 的行数 | `streaming_vocoder.py` |

### 代入图上的数

一次 Slow 选择得到一个 code 0，九次 Fast 选择得到 code 1–9。第 0 次 Fast 调用提供上下文，不增加一行，所以一共是十次 Fast 调用和十一行保存结果。

### 接下来

第 5 步跟着这些 codes 进入下一个 Slow 帧，比较两层循环分别记住什么。

出处：`models/fishaudio_s2_pro/sglang_model.py:294-300,418-510`；`models/fishaudio_s2_pro/payload_types.py:35-50`；`models/fishaudio_s2_pro/streaming_vocoder.py:88-106`；`models/fishaudio_s2_pro/fish_speech/tokenizer.py:19-37`；`models/fishaudio_s2_pro/request_builders.py:133-137`。

## 第 5 步 · 两层循环记住不同的状态

> **一句话：** 下一帧复用 Slow 工作和十个 code 值，Fast AR 则清空内层 KV。

### 图上是什么

- 蓝色反馈箭头把上一帧的全部十个 DAC codes 送回下一次 Slow 输入。
- 橙色 Slow KV 横跨 prompt 和每个 accepted 帧。KV 是第 1 本第 3 章讲过的注意力 key、value 工作。
- 灰色 Fast KV 在帧边界结束，下一帧重新开始内层循环。
- 相同的 Slow 前缀可以复用 SGLang KV。其指纹覆盖全部十行参考 codes，不只看 code 0。

### 代入图上的数

一个完成帧返回 $1+9=10$ 个 DAC codes。下一个 Slow 位置把这十份 codec embeddings 和原始语义 token embedding 合并，沿用第 3 步的 $1/\sqrt{11}$ 规则。

Fast 第 0 次调用先重置内层 KV，再处理新帧的 0–9 位置，不读上一帧的 Fast 位置。

### 三种复用

| 保存内容 | 保存多久 | 谁保存 |
|---|---|---|
| 参考 codes | 跨匹配请求，以 CPU 副本返回 | `ReferenceEncodeService` |
| Slow 注意力 KV | prompt 和之前的帧；匹配前缀可共享 | SGLang |
| Fast 注意力 KV | 只到本帧内部位置结束 | Fast AR |

这张图比较反馈和 cache 寿命，没有声称 Fish 流式 vocoder 保留 Qwen 式 codec 执行状态。

### 接下来

第 6 步跟随同一个循环走到 EOS、长度用尽和中止三个出口。

出处：`models/fishaudio_s2_pro/model_runner.py:62-100,148-191`；`models/fishaudio_s2_pro/sglang_model.py:365-382,484-488`；`models/fishaudio_s2_pro/request_builders.py:65-78,160-168`；`models/fishaudio_s2_pro/fish_speech/models/text2semantic/audio_decoder.py:394-411,505-526,547-595`。

## 第 6 步 · 三种停止方式

> **一句话：** EOS 和长度用尽可以返回已接受的帧，中止会拦截仍待交付的输出。

### 图上是什么

- EOS 是 `<|im_end|>` token。Fast AR 仍会为这次 Slow 输出执行内层工作。
- 收集器不追加也不发送 EOS 结束帧，但保留之前接受的帧。
- 长度用尽在生成预算处停止，返回接受的帧，并写 `finish_reason="length"`。
- 中止清理流状态，拦截待送 chunks 和最终成功 payload。
- 蓝框是接受的输出，橙框是收集器不交付的工作或输出。

### 公式

$$
M = \min(M_{\text{request}},2048,\max(4096-1-P,1))
$$

| 符号 | 是什么 | 算例大小 | 从哪来 |
|---|---|---:|---|
| $M$ | 有效生成预算 | 1,024 tokens | 本步公式 |
| $M_{\text{request}}$ | 请求上限 | 默认 1,024 | `payload_types.py:39` |
| $P$ | prompt token 数 | 构造值 1,000 | 本步算例 |
| $4096-1-P$ | 预留一个 token 后的上下文空间 | 3,095 | engine 预算规则 |

### 代入图上的数

$$
4096 - 1 - 1000 = 3095
$$

$$
M = \min(1024,2048,3095) = 1024\ \text{tokens}
$$

1,000-token prompt 是构造值，三项限制和请求默认上限来自源码。每个接受的生成 token 是一次 Slow 输出，最多产生一个音频帧。按每帧 2,048 ÷ 44,100 秒计算，1,024 个接受帧代表约 47.55 秒声音。这是声音时长上界，不是延迟测量。

立即遇到 EOS 会得到零个接受帧。结果适配会报「generated no audio codec tokens」，不返回空声音。中止不能收回已经交付的 chunks。

### 接下来

第 7 步跟随接受的帧进入流式 vocoder 的重叠窗口。

出处：`models/fishaudio_s2_pro/model_runner.py:48-76`；`models/fishaudio_s2_pro/request_builders.py:148-167,192-202,233-248`；`models/fishaudio_s2_pro/engine_builder.py:87-100`；`models/fishaudio_s2_pro/payload_types.py:35-50`；`tests/unit_test/fishaudio_s2_pro/test_tts.py:486-531,616-673`。

## 第 7 步 · 流式窗口有重叠

> **一句话：** 流式 vocoder 重读旧帧并保留一小段声音尾巴，用来连接每个新窗口。

### 图上是什么

- 构造请求一共生成 90 帧。
- 首个窗口读 40 帧新内容，下一次读 20 帧旧内容加 45 帧新内容，最后读 20 帧旧内容加 5 帧新内容。
- 蓝段是新帧，橙段是再次解码的旧帧。
- 每个未结束窗口留下新的灰色 512 采样点尾巴。下一窗口交叉混合旧尾巴并留下自己的，最后一次释放最后的尾巴。
- $F$ 是一个 codec 帧代表的 2,048 个声音采样点。

### 公式与代入图上的数

| 事件 | 输入帧数 | 新帧数 | 本次输出的采样点 |
|---|---:|---:|---:|
| 首次，累计 40 | 40 | 40 | $40F-512$ |
| 下次，累计 85 | $20+45=65$ | 45 | $45F$ |
| 最后，累计 90 | $20+5=25$ | 5 | $5F+512$ |

$$
40 + 65 + 25 = 130\ \text{帧输入}
$$

$$
20 + 20 = 40\ \text{帧旧内容被再次解码}
$$

$$
(40F-512)+45F+(5F+512)=90F
$$

多出的 40 帧输入是重复工作，不是额外输出。中间调用输出 $45F+512-512=45F$：它用掉首个尾巴，同时留下新的尾巴，最后一次再释放第二个尾巴。每段 512 采样点尾巴代表 512 ÷ 44,100 ≈ 11.6 ms 声音。旧帧会再次解码，不会再次播放。

### 接下来

第 8 步比较逐请求的流式窗口和已完成请求的非流式 batch 路径。

出处：`scheduling/audio_stream.py:65-148,151-239,242-333`；`scheduling/audio_vocoder.py:116-182`；`models/fishaudio_s2_pro/request_builders.py:276-298`。

## 第 8 步 · 合并已完成请求，再裁切

> **一句话：** 非流式 vocoder 把已完成请求补成一次调用，再恢复每份输出的长度。

### 图上是什么

- 请求 A 和 B 已完成第 3–5 步的同一组 Dual-AR 循环。
- A 有 90 帧，B 有 40 帧。engine 结果有十一行，vocoder 去掉 Slow 原始行后读取十行。
- 蓝条是真实 code 帧，灰条是给 B 补的 50 帧。
- 一次 `[2,10,90]` vocoder 调用返回两份输出，裁切去掉 B 的补位。
- 默认最多收集八个已完成请求，额外请求最多等待 2 ms。流式窗口仍逐请求运行。

### 公式与代入图上的数

$$
T_{\text{batch}} = \max(T_A,T_B) = \max(90,40) = 90
$$

$$
T_{\text{pad},B}=90-40=50\ \text{帧}
$$

$$
A:\ 90 \times 2{,}048 = 184{,}320\ \text{个采样点}
$$

$$
B:\ 40 \times 2{,}048 = 81{,}920\ \text{个采样点}
$$

$$
184{,}320 \div 44{,}100 \approx 4.18\ \text{秒},\qquad 81{,}920 \div 44{,}100 \approx 1.86\ \text{秒}
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $T_A,T_B$ | A 和 B 完成后的帧数 | 构造教学请求 |
| $T_{\text{batch}}$ | 共享的补位时间长度 | 本 batch 最长请求 |
| $T_{\text{pad},B}$ | 调用后从 B 裁掉的补位 | $T_{\text{batch}}-T_B$ |

两个帧数是构造值，batch 上限和收集等待是默认值。这些算式描述形状，不是耗时。

### 接下来

这条单向请求已经完成。第 12 章回答：输入声音在输出播放时仍持续到达，session 必须保留什么状态。

出处：`scheduling/audio_vocoder.py:194-224`；`scheduling/streaming_simple_scheduler.py:311-390,434-480`；`models/fishaudio_s2_pro/stages.py:522-552`。
