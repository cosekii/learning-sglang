## Step 1 · Slow AR chooses first, Fast AR fills next

> **In one line:** Slow AR chooses `c0` before Fast AR fills `c1–c9` in the same frame.

### On the stage

- Ch. 10 Step 8 supplied the frame's ten codebook entries, `c0` through `c9`.
- `1 · Slow AR` moves one frame at a time. Phase 1 fills only `c0`; the other nine entries still wait.
- `2 · Fast AR` works inside that same frame. Phase 2 passes the work to Fast AR without adding a code. Phase 3 fills `c1–c9`.
- Blue entries are chosen codes. Faded entries still wait. The final count is one Slow choice plus nine Fast choices.

### Formula

$$
N_{\text{frame}} = N_{\text{Slow}} + N_{\text{Fast}}
$$

| Symbol | What it is | Value | Where it comes from |
|---|---|---:|---|
| $N_{\text{frame}}$ | Codebook entries in one frame | 10 | Ch. 10 Step 8 |
| $N_{\text{Slow}}$ | Entries chosen by Slow AR: `c0` | 1 | This step |
| $N_{\text{Fast}}$ | Entries chosen by Fast AR: `c1–c9` | 9 | This step |

### The numbers on the stage

$$
1 + 9 = 10\ \text{codes in this frame}
$$

### Next

The next step creates the same ten-row representation from a reference voice before generation starts.

Source shorthand: `fish/` = `sglang_omni/models/fishaudio_s2_pro/`.

Sources: `fish/sglang_model.py:418-510`; `fish/payload_types.py:35-50`.

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

The ceiling brackets mean “round up”: a partial final codec frame still becomes one padded frame.

| Symbol | What it is | Value | Where it comes from |
|---|---|---:|---|
| $F_{\text{ref}}$ | Reference codec frames | 22 | This formula |
| $R$ | Codec sample rate | 44,100 Hz | Shipped DAC configuration |
| $T$ | Constructed reference duration | 1 s | This teaching example |
| $S$ | Samples per codec frame | 2,048 | DAC hop and quantizer factors |
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

Source shorthand: `fish/` = `sglang_omni/models/fishaudio_s2_pro/`; other paths start at `sglang_omni/`.

Sources: `fish/stages.py:249-376,425-490`; `scheduling/reference_encoder.py:344-413`; `fish/fish_speech/models/dac/modded_dac.py:885-913,964-988`.

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

Source shorthand: `fish/` = `sglang_omni/models/fishaudio_s2_pro/`; other paths start at `sglang_omni/`.

Sources: `fish/tokenizer.py:53-73,94-162`; `fish/model_runner.py:288-356`; `fish/fish_speech/models/text2semantic/audio_decoder.py:597-612`.

## Step 4 · Fast AR fills the inner nine rows

> **In one line:** Fast AR starts inside one Slow frame and makes the nine remaining vocoder choices.

### On the stage

- Fast AR is the inner loop: it stays inside one audio frame.
- Slow AR first produces raw `semantic_token`. The engine derives `sem_id`, the vocoder's `code 0`, from that token and saves both.
- Fast call 0 receives Slow's computed numbers. Its output scores are not used as a vocoder choice.
- Fast calls 1–9 each choose one remaining code.
- Orange marks Slow's raw token. Blue marks the ten rows sent to the vocoder.

### Formula

For a nonterminal frame,

$$
raw = B + c_0,\qquad c_0 = raw - B
$$

$$
N_{\text{Fast}} = 1 + 9 = 10
$$

$$
N_{\text{engine}} = 1 + 1 + 9 = 11
$$

$$
N_{\text{DAC}} = 1 + 9 = 10
$$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $raw$ | Slow AR's raw `semantic_token` in the semantic vocabulary | Slow output in `sglang_model.py` |
| $B$ | Added semantic-vocabulary base, 151,678 in this checkpoint | `request_builders.py:133-137` |
| $c_0$ | `sem_id`, the semantic DAC code derived from $raw$ | This formula |
| $N_{\text{Fast}}$ | Fast calls for this frame, including call 0 | Fast loop |
| $N_{\text{engine}}$ | Stored rows: one raw token plus ten DAC codes | `payload_types.py` |
| $N_{\text{DAC}}$ | Rows sent to the vocoder after dropping $raw$ | `streaming_vocoder.py` |

### The numbers on the stage

One Slow choice creates one derived code 0. Nine Fast choices create codes 1–9. The initial Fast call supplies context but no additional row, so there are ten Fast calls and eleven stored rows. Both the raw `semantic_token` and derived `sem_id` rows are saved.

### Next

Step 5 follows these codes into the next Slow frame and compares what the two loops retain.

Source shorthand: `fish/` = `sglang_omni/models/fishaudio_s2_pro/`; other paths start at `sglang_omni/`.

Sources: `fish/sglang_model.py:294-300,418-510`; `fish/payload_types.py:35-50`; `fish/streaming_vocoder.py:88-106`; `fish/fish_speech/tokenizer.py:19-37`; `fish/request_builders.py:133-137`.

## Step 5 · The two loops keep different state

> **In one line:** The next frame reuses Slow work and ten code values, while Fast AR clears its inner KV.

### On the stage

- The blue feedback arrow returns all ten previous DAC codes to the next Slow input.
- Orange Slow KV spans the prompt and every accepted frame. KV means attention's saved key and value work from Learning SGLang Ch. 3.
- Grey Fast KV ends at the frame boundary. A fresh inner loop starts for the next frame.
- The same cached prefix can reuse SGLang KV while that prefix remains cached. A match does not guarantee a hit.
- `extra_key` fingerprints all ten reference code rows, so different reference voices cannot share radix KV merely because code 0 matches (`request_builders.py:65-78,160-168`). Requests with the same references and prefix can reuse their common prefix even when their target suffixes differ; `model_runner.py:324-344` applies `req.prefix_len`.

### Formula and the numbers on the stage

$$
x_{f+1}=\frac{e_{\text{text}}(raw_f)+\sum_{r=0}^{9}e_r(c_{r,f})}{\sqrt{11}}
$$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $x_{f+1}$ | Input embedding for the next Slow position | This feedback construction |
| $f$ | Completed frame index | This step |
| $raw_f$ | Previous frame's saved raw `semantic_token` | Step 4; `sglang_model.py` |
| $c_{r,f}$ | Previous frame's DAC code in row $r$, with `sem_id` in row 0 | Step 4 |
| $e_{\text{text}}$ | Raw semantic-token embedding | Tokenizer and model runner |
| $e_r$ | Codec embedding for row $r$ | `audio_decoder.py` |
| $\sqrt{11}$ | Scale for one text plus ten codec embeddings | `audio_decoder.py:597-612` |

One completed frame returns $1+9=10$ DAC codes. The next Slow position combines those ten codec embeddings with the raw semantic token embedding, using the same $1/\sqrt{11}$ rule as Step 3.

Fast call 0 resets its inner KV before positions 0–9 of the new frame. It does not read the previous frame's Fast positions.

### Three kinds of reuse

| Saved thing | Lifetime | Owner |
|---|---|---|
| Reference codes | Matching requests, as CPU copies | `ReferenceEncodeService` |
| Slow attention KV | Prompt and earlier frames; the same cached prefix may share while cached | SGLang |
| Fast attention KV | Positions inside one frame only | Fast AR |

The picture compares feedback with cache lifetime. It does not claim that Fish's streaming vocoder retains Qwen-style codec execution state.

### Next

Step 6 follows the same loop to its three exits: EOS, length exhaustion and abort.

Source shorthand: `fish/` = `sglang_omni/models/fishaudio_s2_pro/`; other paths start at `sglang_omni/`.

Sources: `fish/model_runner.py:62-100,148-191`; `fish/sglang_model.py:365-382,484-488`; `fish/request_builders.py:65-78,160-168`; `fish/fish_speech/models/text2semantic/audio_decoder.py:394-411,505-526,547-595`.

## Step 6 · Three ways to stop

> **In one line:** EOS and length can return accepted frames, while abort suppresses output that is still pending.

### On the stage

- EOS is the `<|im_end|>` token. Fast AR still performs its inner work for that Slow output.
- The collector does not append or stream the terminal EOS frame. Earlier accepted frames remain.
- Length stops at the generation budget and returns accepted frames with `finish_reason="length"`.
- Abort clears stream state and suppresses pending chunks and the final success payload.
- Blue boxes are accepted output. Orange boxes mark work or output that the collector does not deliver.

### Formula

$$
M = \min(M_{\text{request}},2048,\max(4096-1-P,1))
$$

| Symbol | What it is | Value in the example | Where it comes from |
|---|---|---:|---|
| $M$ | Effective generation budget | 1,024 tokens | This formula |
| $M_{\text{request}}$ | Request's maximum | 1,024, the default | `payload_types.py:39` |
| $P$ | Prompt token count | 1,000, constructed | This teaching example |
| $4096-1-P$ | Context room after reserving one token | 3,095 | Engine budget rule |

### The numbers on the stage

$$
4096 - 1 - 1000 = 3095
$$

$$
M = \min(1024,2048,3095) = 1024\ \text{tokens}
$$

The 1,000-token prompt is constructed. The three limits and the default request cap come from source. Each accepted generation token is one Slow output and yields at most one audio frame. At 2,048 ÷ 44,100 seconds per frame, 1,024 accepted frames represent about 47.55 seconds of sound. This is a content-duration bound, not a latency measurement.

An immediate EOS produces zero accepted frames. Result adaptation raises “generated no audio codec tokens” rather than returning empty audio. Abort does not recall chunks already delivered.

### Next

Step 7 follows accepted frames into the streaming vocoder's overlapping windows.

Source shorthand: `fish/` = `sglang_omni/models/fishaudio_s2_pro/`; other paths start at `sglang_omni/`.

Sources: `fish/model_runner.py:48-76`; `fish/request_builders.py:148-167,192-202,233-248`; `fish/engine_builder.py:87-100`; `fish/payload_types.py:35-50`; `tests/unit_test/fishaudio_s2_pro/test_tts.py:486-531,616-673`.

## Step 7 · Streaming windows overlap

> **In one line:** The streaming vocoder re-reads old frames and holds a short sound tail to join each new window.

### On the stage

- This constructed request generates 90 frames in total.
- The first window reads 40 new frames. The next reads 20 old plus 45 new. The final flush reads 20 old plus five new.
- Blue segments are new frames. Orange segments are old frames decoded again.
- Each non-final window holds a fresh grey 512-sample tail. The next window crossfades the previous tail and holds its own; the final flush releases the last tail.
- $F$ means the 2,048 audio samples represented by one codec frame.

### Formula and the numbers on the stage

| Event | Input frames | New frames | Samples emitted by this event |
|---|---:|---:|---:|
| First, total 40 | 40 | 40 | $40F-512$ |
| Next, total 85 | $20+45=65$ | 45 | $45F$ |
| Final, total 90 | $20+5=25$ | 5 | $5F+512$ |

$$
40 + 65 + 25 = 130\ \text{input frames}
$$

$$
20 + 20 = 40\ \text{old frames decoded again}
$$

$$
(40F-512)+45F+(5F+512)=90F
$$

| Symbol | What it is | Value in this example | Where it comes from |
|---|---|---:|---|
| $F$ | Audio samples represented by one codec frame | 2,048 | Step 2's shipped DAC geometry |
| $N_{\text{in}}$ | Frames read by one window | 40, 65, 25 | Constructed 90-frame stream and shipped window rules |
| $N_{\text{new}}$ | New frames arriving in that window | 40, 45, 5 | Constructed arrivals under the 45-new maximum |
| $N_{\text{out}}$ | Samples emitted by that window | $40F-512$, $45F$, $5F+512$ | Emission and crossfade rules |
| $512$ | Sound-tail samples held for the next window | 512 | Shipped streaming-window default |

The 40 extra input frames are repeated work, not extra output. The middle call emits $45F+512-512=45F$: it uses the first tail and holds a fresh one. The final flush releases that second tail. Each 512-sample tail represents 512 ÷ 44,100 ≈ 11.6 ms of sound. Old frames are decoded again but not played again.

Smaller later windows can deliver each new piece earlier, but they reread the 20-frame context more often. This is a mechanism trade-off, not a measured Fish latency result.

### Next

Step 8 compares these per-request streaming windows with the non-streaming batch path for completed requests.

Source shorthand: `fish/` = `sglang_omni/models/fishaudio_s2_pro/`; other paths start at `sglang_omni/`.

Sources: `scheduling/audio_stream.py:65-148,151-239,242-333`; `scheduling/audio_vocoder.py:116-182`; `fish/request_builders.py:276-298`.

## Step 8 · Batch completed requests, then trim

> **In one line:** The non-streaming vocoder pads completed requests into one call and restores each output length afterward.

### On the stage

- Requests A and B have already finished the same Dual-AR loops from Steps 3–5.
- A has 90 frames and B has 40. The engine result includes eleven rows; the vocoder reads ten after dropping the raw Slow token.
- Blue bars are real code frames. Grey bars are 50 padding frames added to B.
- One `[2,10,90]` vocoder call returns two outputs. Trimming removes B's padding.
- The factory collects at most eight completed requests and waits up to 2 ms for additional requests. Streaming windows remain per request.
- The closing card moves to an interrupted old reply. Old work may still be queued, `D` marks delivered audio, and `H` marks audio the client heard.

### Formula and the numbers on the stage

$$
T_{\text{batch}} = \max(T_A,T_B) = \max(90,40) = 90
$$

$$
T_{\text{pad},B}=90-40=50\ \text{frames}
$$

$$
A:\ 90 \times 2{,}048 = 184{,}320\ \text{samples}
$$

$$
B:\ 40 \times 2{,}048 = 81{,}920\ \text{samples}
$$

$$
184{,}320 \div 44{,}100 \approx 4.18\ \text{s},\qquad 81{,}920 \div 44{,}100 \approx 1.86\ \text{s}
$$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $T_A,T_B$ | Completed frame counts for A and B | Constructed teaching requests |
| $T_{\text{batch}}$ | Shared padded time length | Longest request in this batch |
| $T_{\text{pad},B}$ | Padding removed from B after the call | $T_{\text{batch}}-T_B$ |

The two frame counts are constructed. The batch limit and collection wait are shipped defaults. This arithmetic describes shapes, not latency.

### Next

Chapter 12 Step 1 takes that same old reply. It compares `D = 2.0 s` delivered with `H = 1.2 s` heard, leaving 800 ms outside the server queues.

Source shorthand: `fish/` = `sglang_omni/models/fishaudio_s2_pro/`; other paths start at `sglang_omni/`.

Sources: `scheduling/audio_vocoder.py:194-224`; `scheduling/streaming_simple_scheduler.py:311-390,434-480`; `fish/stages.py:522-552`.
