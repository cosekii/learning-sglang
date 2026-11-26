## Step 1 · Forty frames before the first window

> **In one line:** Fish must generate 40 frames before the default streaming vocoder opens its first window.

### On the stage

- The request crosses `preprocessing`, `tts_engine` and `vocoder`.
- The blue `tts_engine` box is the generation work opened by this chapter.
- Forty blue boxes stand for 40 frames. The enlarged frame has ten codebook entries, `c0` through `c9`.
- The arithmetic counts 400 choices before the first window. It does not claim 400 Slow AR calls.

### Formula

$$
N_{\text{choices}} = F_{\text{first}} \times C,\qquad
D = \frac{F_{\text{first}} \times S}{R}
$$

| Symbol | What it is | Value | Where it comes from |
|---|---|---:|---|
| $N_{\text{choices}}$ | Codebook entries needed by the first window | 400 | This step |
| $F_{\text{first}}$ | Frames required by the first streaming window | 40 | Shipped `audio_stream.py` default |
| $C$ | Vocoder codebook rows per frame | 10 | Ch. 10 Step 8 |
| $D$ | Sound duration represented by those frames | 1.858 s | This formula |
| $S$ | Samples represented by one codec frame | 2,048 | DAC hop and quantizer factors |
| $R$ | Codec sample rate | 44,100 Hz | Shipped DAC configuration |

### The numbers on the stage

$$
40 \times 10 = 400\ \text{choices}
$$

$$
40 \times 2{,}048 = 81{,}920\ \text{samples}
$$

$$
81{,}920 \div 44{,}100 \approx 1.858\ \text{s}
$$

The default threshold and frame dimensions are real configuration values. The multiplication is a teaching example, not a latency measurement.

### Next

The next step creates the same ten-row representation from a reference voice before generation starts.

Sources: `models/fishaudio_s2_pro/config.py:23-67`; `scheduling/audio_stream.py:65-148`; `models/fishaudio_s2_pro/sglang_model.py:418-510`; `models/fishaudio_s2_pro/fish_speech/models/dac/modded_dac.py:885-913,928-988`.
