## Step 1 · A later window repeats earlier work

**One sentence.** Qwen3-Omni's stateless later window reads 25 old frames and 10 new frames, but emits only the 10 new frames as the next sound chunk.

### On the stage

- A `vocoder` turns codec frames into sound. Chapter 9 Step 7 established this hand-off, and Learning SGLang Ch. 20 Steps 1–3 established the 10-frame, 800 ms chunk.
- The grey input box holds 25 frames that an earlier window already decoded. The blue box holds 10 frames that have not been decoded. This window reads all 35 frames.
- Only the 10 blue frames leave as the new chunk. The 25 old frames supply earlier context; they do not become a second copy of old sound.
- The three map entries preview the chapter: combine ready windows, retain earlier decoder work, and replay recorded kernels for an exact shape. They are separate mechanisms, not three names for one trick.
- Blue marks new frames and their sound. Grey marks old input. The map uses neutral outlines because this step has not removed the repeated work.

### Formula and symbols

$$I=c+n$$

| Symbol | Meaning | Source |
|---|---|---|
| $c$ | Earlier frames read again | Qwen3-Omni default left context, 25 |
| $n$ | New frames decoded and emitted | Default stream chunk, 10 |
| $I$ | Total frames read by this stateless later window | Calculated here |

### The numbers on the stage

$$I=25+10=35\ \text{frames}$$

The output contains 10 new frames, representing $10\times80=800$ ms of playback. Neither 35 nor 800 ms measures this window's compute time.

### Next

The first map entry changes how independent requests share a model call. The next step combines three ready first windows without merging their outputs.

Sources: `sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:79-109,999-1011`; Learning SGLang Ch. 20 Steps 1–3.

## Step 2 · Batch matching windows

**One sentence.** Three requests with matching first windows enter one three-row model call, and each row still produces its own request's sound.

### On the stage

- `B` counts requests decoded together. `T` counts frames in each request's window. The left panel has three `[B=1,T=10]` calls; the right has one `[B=3,T=10]` call.
- These are first windows, so every request has 10 new frames and no earlier context. A, B and C are independent requests, not three pieces of one request.
- `Matching` means more than equal `T`. The scheduler also requires the same first/later kind and the same slot-backed or stateless mode. A first window does not share a group with a later window.
- Blue boxes are model calls and their sound outputs. The shared box has three rows, one per request. Batching does not mix the rows into one output or repeat one request's sound for the others.
- The comparison counts three model calls before and one after. It does not assign milliseconds or claim that every group has three requests.

### Formula and symbols

$$C_{\mathrm{separate}}=n,\qquad C_{\mathrm{batch}}=1$$

| Symbol | Meaning | Source |
|---|---|---|
| $n$ | Ready matching requests | Constructed example, 3 |
| $C_{\mathrm{separate}}$ | Model calls without cross-request batching | Left panel, 3 |
| $C_{\mathrm{batch}}$ | Model calls for the shared three-row group | Right panel, 1 |

### The numbers on the stage

$$C_{\mathrm{separate}}=3,\qquad C_{\mathrm{batch}}=1$$

The group still returns three sound chunks. The scheduler can replay at most eight rows and chooses a published graph batch size that the group fills. It does not pad different frame lengths into one replay.

### Next

Batching shares a call across requests. The next mechanism reduces repeated frames inside one request by keeping its decoder work between windows.

Sources: `sglang_omni/scheduling/streaming_vocoder.py:819-842`; `sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:999-1079`; `tests/unit_test/qwen3_omni/test_code2wav_batching.py:111-191`.

## Step 3 · Keep decoder work between windows

**One sentence.** A codec-state slot retains one stream's decoder state, so its later window decodes only 10 new frames instead of reading 25 old frames again.

### On the stage

- A `codec-state slot` is storage for one request's saved decoder work. It holds transformer K/V rings, causal-convolution histories, transposed-convolution overlap samples and the stream's frame position.
- The left panel repeats Step 1: 25 old frames and 10 new frames enter the vocoder. The right panel reads earlier work from the slot and gives the vocoder only the 10 new frames.
- Both panels emit the same number of new frames. Orange is saved work, grey is old input decoded again, and blue is new input and output.
- The first window creates the state and writes it into the slot. Only later windows can reuse it. A stream claims its slot when its first codes arrive and releases it on completion or abort.
- Slots are finite. If none is free, that request keeps the stateless left-context path for its lifetime. A stream ending before its first full window also decodes without slot state.

### Formula and symbols

$$I_{\mathrm{stateless}}=c+n,\qquad I_{\mathrm{slot}}=n$$

| Symbol | Meaning | Source |
|---|---|---|
| $c$ | Old frames decoded again without a slot | Step 1, 25 |
| $n$ | New frames in the later window | Step 1, 10 |
| $I_{\mathrm{stateless}}$ | Input frames without retained state | Calculated here, 35 |
| $I_{\mathrm{slot}}$ | Input frames with retained state | Calculated here, 10 |

### The numbers on the stage

$$I_{\mathrm{stateless}}=25+10=35,\qquad I_{\mathrm{slot}}=10$$

The slot avoids 25 input frames in this later window. This is a frame-count comparison, not a 3.5× latency claim. The slot also consumes memory, and writing the first state adds work.

### Next

The next step puts public first-window and later-window timings on one scale, including the first window's extra state-writing cost.

Sources: `sglang_omni/models/qwen3_omni/components/codec_state_pool.py:13-24,63-115`; `sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:296-327,999-1011,1230-1246,1283-1300`; `sglang_omni/models/qwen3_omni/components/code2wav.py:380-402,419-462`.
