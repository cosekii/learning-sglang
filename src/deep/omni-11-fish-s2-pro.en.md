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

## Step 2 · Reference audio becomes ten rows

> **In one line:** The reference codec turns a voice example into the same ten-row code representation that the vocoder later reads.

### On the stage

- A reference is a recording of the voice the request should imitate.
- This constructed clip has one second at 16,000 samples per second.
- Resampling changes it to 44,100 samples without changing its one-second duration.
- The reference codec pads the final partial frame and emits a `[10,22]` code matrix.
- Blue cells are codebook entries. Grey boxes still describe audio samples.

### Formula

$$
F_{\text{ref}} = \left\lceil \frac{R \times T}{S} \right\rceil,\qquad
P = F_{\text{ref}}S - RT
$$

| Symbol | What it is | Value | Where it comes from |
|---|---|---:|---|
| $F_{\text{ref}}$ | Reference codec frames | 22 | This formula |
| $R$ | Codec sample rate | 44,100 Hz | Step 1 |
| $T$ | Constructed reference duration | 1 s | This teaching example |
| $S$ | Samples per codec frame | 2,048 | Step 1 |
| $P$ | Samples padded into the last frame | 956 | This formula |

### The numbers on the stage

$$
\left\lceil 44{,}100 \div 2{,}048 \right\rceil = 22\ \text{frames}
$$

$$
22 \times 2{,}048 = 45{,}056,\qquad 45{,}056 - 44{,}100 = 956\ \text{padding samples}
$$

The matrix shape is `[codebook rows, frames] = [10,22]`. The 16 kHz input is constructed; the resampling rate and frame geometry come from the shipped codec.

### Cache boundary

`ReferenceEncodeService` can reuse matching reference codes across requests. It stores CPU tensors and returns copies. This artifact cache does not store Slow AR or Fast AR KV.

### Next

Step 3 puts these codes beside the target text in the Slow AR prompt.

Sources: `models/fishaudio_s2_pro/stages.py:249-376,425-490`; `scheduling/reference_encoder.py:344-413`; `models/fishaudio_s2_pro/fish_speech/models/dac/modded_dac.py:885-913,964-988`.

## Step 3 · Slow AR reads the voice prompt

> **In one line:** Slow AR reads ordinary text and the reference codes, then starts the outer loop by choosing code 0.

### On the stage

- Slow AR is the outer loop: it moves through audio frames one at a time.
- Target text becomes ordinary tokens. The 22 reference frames occupy 22 marked positions.
- At each reference position, code 0 supplies the semantic token. All ten code rows supply the voice detail.
- The orange output is Slow AR's new `code 0` choice for the first generated frame.

### Formula

An embedding is the list of numbers the model reads for one token or code. At a marked reference position, the Slow input is

$$
x_j = \frac{e_{\text{text}}(c_{0,j}) + \sum_{r=0}^{9} e_r(c_{r,j})}{\sqrt{11}}
$$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $x_j$ | Slow AR input at reference frame $j$ | This step |
| $c_{r,j}$ | Codebook row $r$ at reference frame $j$ | Step 2's `[10,22]` matrix |
| $e_{\text{text}}(c_{0,j})$ | Text-token embedding for the semantic token made from code 0 | `tokenizer.py` |
| $e_r(c_{r,j})$ | Codec embedding for row $r$ | `audio_decoder.py` |
| $\sqrt{11}$ | Scale for one text embedding plus ten codec embeddings | `audio_decoder.py:597-612` |

### The numbers on the stage

The reference has $j=1\ldots22$ positions. Each position combines $1+10=11$ embeddings. Ordinary target-text positions do not use this codec sum.

The prompt places the reference transcript and semantic positions in the system block, the target text in the user block and `<|voice|>` in the assistant block. This step simplifies that structure into its two visible inputs.

### Next

Slow AR's choice starts one frame. Step 4 opens the inner Fast AR loop that fills the other nine vocoder rows.

Sources: `models/fishaudio_s2_pro/tokenizer.py:53-73,94-162`; `models/fishaudio_s2_pro/model_runner.py:288-356`; `models/fishaudio_s2_pro/fish_speech/models/text2semantic/audio_decoder.py:597-612`.
