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

## Step 4 · Measure the first and later windows

**One sentence.** In PR #2909's eight-row H200 test, retained state made the later window 60.5% faster and the first window 9.2% slower.

### On the stage

- Every timing uses Qwen3-Omni colocated BF16 on one H200, eight rows and one CUDA graph replay. The displayed value is the median, the middle result, of 20 timings.
- Both sides use graph replay, so this comparison isolates stateless windows against slot-backed windows. It does not measure graphs against eager execution.
- The first window has 10 input frames on both paths. The slot-backed path also writes K/V, convolution histories and overlaps, so its time rises from 3,656.3 to 3,992.0 µs.
- The later window falls from 35 input frames to 10. Its time falls from 10,777.5 to 4,255.3 µs. All four bars use the same microsecond scale.
- Blue means stateless and orange means slot-backed. The percentages describe these window GPU timings, not whole-request latency or a universal speedup.

### Formula and symbols

$$\Delta_{\mathrm{first}}=\left(\frac{t_{\mathrm{first,slot}}}{t_{\mathrm{first,main}}}-1\right)100,\qquad R_{\mathrm{later}}=\left(1-\frac{t_{\mathrm{later,slot}}}{t_{\mathrm{later,main}}}\right)100$$

| Symbol | Meaning | Source |
|---|---|---|
| $t_{\mathrm{first,main}}$ | Stateless first-window time | PR #2909, 3,656.3 µs |
| $t_{\mathrm{first,slot}}$ | Slot-backed first-window time | PR #2909, 3,992.0 µs |
| $t_{\mathrm{later,main}}$ | Stateless later-window time | PR #2909, 10,777.5 µs |
| $t_{\mathrm{later,slot}}$ | Slot-backed later-window time | PR #2909, 4,255.3 µs |
| $\Delta_{\mathrm{first}}$ | First-window time increase | Calculated here |
| $R_{\mathrm{later}}$ | Later-window time reduction | Calculated here |

### The numbers on the stage

$$\Delta_{\mathrm{first}}=\left(\frac{3992.0}{3656.3}-1\right)100\approx9.2\%$$

$$R_{\mathrm{later}}=\left(1-\frac{4255.3}{10777.5}\right)100\approx60.5\%$$

PR #2909 also reports end-to-end c64 QPS rising 2.8%, not 60.5%. The window win pays back the first-window cost over later windows; it does not multiply into the same end-to-end gain.

### Next

Retained state changes how many frames a window reads. The next mechanism records a window's kernel launches and replays them only for an exact graph key.

Sources: [public PR #2909, mechanism and results](https://github.com/sgl-project/sglang-omni/pull/2909); `sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:999-1011`.

## Step 5 · Replay only an exact graph key

**One sentence.** Qwen3-Omni's Code2Wav graph key contains row count, frame count and window kind, so only an exact match replays a captured graph.

### On the stage

- Learning SGLang Ch. 11 Step 1 introduced `CUDA graph`: record kernel launches, then replay them. This step shows how Code2Wav chooses a recorded graph.
- `B` is the number of request rows, `T` is the frame count, and `kind` is the window path. `window` means stateless, `first` means a slot-backed first window, and `next` means a slot-backed later window.
- The example catalogue contains one key, `(3,10,first)`. Call A has that exact key and replays. Call B changes `B` to 2, so this catalogue has no matching key and runs eagerly.
- The one-key catalogue is constructed to make matching visible. The real runner holds many keys. A different incoming key can use another captured graph; it runs eagerly only if no published graph has that key.
- Orange marks the captured graph and replay, while blue marks eager execution. The graph changes kernel submission, not the model's mathematical function.

### Formula and symbols

$$K=(B,T,k)$$

| Symbol | Meaning | Source |
|---|---|---|
| $B$ | Request rows in the call | `GraphKey.batch_size` |
| $T$ | Frames in each row | `GraphKey.frames` |
| $k$ | `window`, `first` or `next` path | `GraphKey.kind` |
| $K$ | Exact identity required for replay | `code2wav_cuda_graph.py` |

### The numbers on the stage

$$K_A=(3,10,\mathrm{first}),\qquad K_B=(2,10,\mathrm{first})$$

$K_A$ equals the catalogue key, but $K_B$ differs in its first field. Replay copies codes and slot indices into static buffers and reuses static output. Capture checks exact equality against eager output before publishing a graph.

A missing or ineligible key uses eager execution. A runtime replay failure is different: it disables the graphs and re-raises the error instead of silently replaying that call eagerly.

### Next

Exact keys make replay possible, but do not measure its value. The next step uses one historical H200 comparison to measure end-to-end throughput with and without Code2Wav graphs.

Sources: `sglang_omni/models/qwen3_omni/components/code2wav_cuda_graph.py:85-117,264-282,673-723,804-888`; `sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py:112-143,1307-1345`.

## Step 6 · Measure graph replay at c16

**One sentence.** PR #1101's historical H200 c16 comparison reports mean throughput of 0.575 requests/s without graphs and 0.635 requests/s with graphs, a 10.4% ratio between the displayed means.

### On the stage

- `c16` means 16 client requests running concurrently. `QPS` means completed requests per second. The two bars use one axis from 0 to 0.7 requests/s.
- The eager control completes 0.575 requests/s; graph replay completes 0.635 requests/s. Blue is the eager control and orange is graph replay.
- The H200 BF16 protocol used a fresh server per arm, temperature 0, seed 777 and an 800-token Talker cap. Each arm measured 128 requests after 16 warmups, with two alternating A/B pairs.
- All measured requests and warmups succeeded. Matched total audio work stayed within 0.076%, so the comparison did not simply produce much less audio in one arm.
- This is a historical result on ancestor `b4159d2a`, not a new measurement of the pinned current source or a promise for another model, GPU or concurrency.

### Formula and symbols

$$G_{\mathrm{mean}}=\left(\frac{q_{\mathrm{graph}}}{q_{\mathrm{eager}}}-1\right)100$$

| Symbol | Meaning | Source |
|---|---|---|
| $q_{\mathrm{eager}}$ | Mean throughput without Code2Wav graphs | PR #1101, 0.575 requests/s |
| $q_{\mathrm{graph}}$ | Mean throughput with Code2Wav graphs | PR #1101, 0.635 requests/s |
| $G_{\mathrm{mean}}$ | Ratio between the two displayed mean QPS values | Calculated here |

### The numbers on the stage

$$G_{\mathrm{mean}}=\left(\frac{0.635}{0.575}-1\right)100\approx10.4\%$$

PR #1101 separately reports a paired delta of 10.55%. That metric averages the two per-pair percent changes; it is not the ratio of the two displayed means. The stage labels its 10.4% calculation to keep those quantities distinct.

The same historical table reports p50 first-audio time falling 6.27% at c16. A separate H100 c8 experiment had mean first-audio change of only +0.02%, so these results do not establish a universal first-audio improvement.

### Next

The Qwen examples now cover all three mechanisms. The next step compares them with MiniCPM-o and Fish S2 Pro so similarly named optimizations do not blur different implementations.

Sources: [public PR #1101 and its H200 protocol](https://github.com/sgl-project/sglang-omni/pull/1101#issuecomment-5040716545).
