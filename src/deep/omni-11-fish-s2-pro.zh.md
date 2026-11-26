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
