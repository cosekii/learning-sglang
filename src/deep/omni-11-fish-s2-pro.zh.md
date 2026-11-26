## 第 1 步 · 首个窗口需要 40 帧

> **一句话：** Fish 默认要先生成 40 帧，流式 vocoder 才打开首个窗口。

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
| $F_{\text{first}}$ | 首个流式窗口需要的帧数 | 40 | `audio_stream.py` 默认值 |
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

出处：`models/fishaudio_s2_pro/config.py:23-67`；`scheduling/audio_stream.py:65-148`；`models/fishaudio_s2_pro/sglang_model.py:418-510`；`models/fishaudio_s2_pro/fish_speech/models/dac/modded_dac.py:885-913,928-988`。

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
