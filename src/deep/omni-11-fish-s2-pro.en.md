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

## Step 4 · Fast AR fills the inner nine rows

> **In one line:** Fast AR starts inside one Slow frame and makes the nine remaining vocoder choices.

### On the stage

- Fast AR is the inner loop: it stays inside one audio frame.
- Slow AR first produces a raw semantic token. The engine derives vocoder `code 0` from that token.
- Fast call 0 receives Slow's computed numbers. Its output scores are not used as a vocoder choice.
- Fast calls 1–9 each choose one remaining code.
- Orange marks Slow's raw token. Blue marks the ten rows sent to the vocoder.

### Formula

For a nonterminal frame,

$$
raw = B + c_0,\qquad c_0 = raw - B
$$

$$
N_{\text{Fast}} = 1 + 9 = 10,\quad
N_{\text{engine}} = 1 + 1 + 9 = 11,\quad
N_{\text{DAC}} = 1 + 9 = 10
$$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $raw$ | Slow AR's semantic-vocabulary token | Slow output in `sglang_model.py` |
| $B$ | Added semantic-vocabulary base, 151,678 in this checkpoint | `fish_speech/tokenizer.py` |
| $c_0$ | Semantic DAC code derived from $raw$ | This formula |
| $N_{\text{Fast}}$ | Fast calls for this frame, including call 0 | Fast loop |
| $N_{\text{engine}}$ | Stored rows: one raw token plus ten DAC codes | `payload_types.py` |
| $N_{\text{DAC}}$ | Rows sent to the vocoder after dropping $raw$ | `streaming_vocoder.py` |

### The numbers on the stage

One Slow choice creates one derived code 0. Nine Fast choices create codes 1–9. The initial Fast call supplies context but no additional row, so there are ten Fast calls and eleven stored rows.

### Next

Step 5 follows these codes into the next Slow frame and compares what the two loops retain.

Sources: `models/fishaudio_s2_pro/sglang_model.py:294-300,418-510`; `models/fishaudio_s2_pro/payload_types.py:35-50`; `models/fishaudio_s2_pro/streaming_vocoder.py:88-106`; `models/fishaudio_s2_pro/fish_speech/tokenizer.py:19-37`.

## Step 5 · The two loops keep different state

> **In one line:** The next frame reuses Slow work and ten code values, while Fast AR clears its inner KV.

### On the stage

- The blue feedback arrow returns all ten previous DAC codes to the next Slow input.
- Orange Slow KV spans the prompt and every accepted frame. KV means attention's saved key and value work from Learning SGLang Ch. 3.
- Grey Fast KV ends at the frame boundary. A fresh inner loop starts for the next frame.
- A matching Slow prefix can reuse SGLang KV. Its fingerprint covers all ten reference rows, not just code 0.

### The numbers on the stage

One completed frame returns $1+9=10$ DAC codes. The next Slow position combines those ten codec embeddings with the raw semantic token embedding, using the same $1/\sqrt{11}$ rule as Step 3.

Fast call 0 resets its inner KV before positions 0–9 of the new frame. It does not read the previous frame's Fast positions.

### Three kinds of reuse

| Saved thing | Lifetime | Owner |
|---|---|---|
| Reference codes | Matching requests, as CPU copies | `ReferenceEncodeService` |
| Slow attention KV | Prompt and earlier frames; matching prefixes may share | SGLang |
| Fast attention KV | Positions inside one frame only | Fast AR |

The picture compares feedback with cache lifetime. It does not claim that Fish's streaming vocoder retains Qwen-style codec execution state.

### Next

Step 6 follows the same loop to its three exits: EOS, length exhaustion and abort.

Sources: `models/fishaudio_s2_pro/model_runner.py:62-100,148-191`; `models/fishaudio_s2_pro/sglang_model.py:365-382,484-488`; `models/fishaudio_s2_pro/request_builders.py:65-78,160-168`; `models/fishaudio_s2_pro/fish_speech/models/text2semantic/audio_decoder.py:394-411,505-526,547-595`.
