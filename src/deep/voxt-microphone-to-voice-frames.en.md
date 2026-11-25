## Step 1 · Continuous sound becomes audio frames

> **In one line:** By default, the helper cuts converted sound every 100 ms; this constructed one-second example produces ten frames in order.

### On the stage

- The microphone supplies continuous sound. The helper, introduced in Ch. 2, is the actor doing the cutting.
- The blue waveform shows sound strength changing over time. The horizontal axis is time; movement away from the quiet centre line represents a stronger positive or negative measurement, not steadily increasing loudness.
- `ms` means milliseconds: 1,000 ms = 1 second, so 100 ms = 0.1 seconds.
- An audio frame is one short time slice of sound. Blue dashed lines mark the cuts; blue boxes show the ten resulting frames in order.
- `frame 0` through `frame 9` are sequence numbers, starting at zero. Frame 0 holds 0–100 ms, frame 1 holds 100–200 ms, and the last holds 900–1000 ms.
- The equation divides total duration by frame duration: one second contains ten 0.1-second slices, so it produces ten frames.

### Formula

$$
K=\frac{D}{F}
$$

| Symbol | Meaning | Source |
|---|---|---|
| $K$ | Complete frames in this example | Calculated here from $D$ and $F$ |
| $D$ | Total sound duration | This step's constructed one-second example |
| $F$ | Duration of one frame | Helper default `frameMs = 100`, or 0.1 seconds |

$D$ and $F$ must use the same time unit. Here both use seconds, so the units cancel and $K$ is a count of frames.

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| 100 ms in seconds | $100/1000$ | 0.1 seconds |
| Complete frames in one second | $1/0.1$ | 10 |
| Start of frame 1 | $1\times100$ | 100 ms |
| End of the last frame | $10\times100$ | 1,000 ms = 1 second |

### Measurements and frames

The main stage introduces time slicing without adding a second group of large numbers. Before framing, the code also combines input channels into mono and resamples to 16,000 measurements per second. One measurement records sound strength at an instant. Mono combines all input channels into one track; resampling changes how often those measurements occur.

A default frame therefore holds $16{,}000\times0.1=1{,}600$ measurements. The blue line sketches the shape rather than plotting every value. A public test pushes 3,300 measurements through the same framer settings. It emits two complete frames of 1,600 values each; `flush()` emits the remaining 100 values at stop, so input need not end on a frame boundary.

### What this step leaves out

`PCM16 LE` describes how each measurement is stored as two bytes. It, frame IDs and sample offsets are left for later steps. Here, an audio frame means the helper's 100 ms `capture.pcm` message, not the separate 20 ms analysis frame used later by voice detection.

### Next

The ten slices are packed in order. Next, look at how the measurements inside each slice become bytes that can be transmitted.

### Sources

Public baseline: `sglang-omni@91d06c70b00746c0b2b84db12a318240db360f1d`; paths are relative to that repository.

- Defaults of 16,000 Hz and 100 ms: `Voxt/helper/Sources/VoxtNewHelper/Capture.swift:150-160`.
- Downmixing and resampling before the framer: `Voxt/helper/Sources/VoxtNewHelperKit/CaptureSource.swift:4-12,58-74`; `framer.push` receives the converted samples at `Voxt/helper/Sources/VoxtNewHelper/Capture.swift:480-487`.
- Frame-size calculation, zero-based sequence and sample offset: `Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift:18-23,33-37,77-87`.
- Complete frames and a partial final frame at stop: `Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift:59-72`; the public 3,300-value test: `Voxt/helper/Tests/VoxtNewHelperKitTests/HotkeyRecognizerTests.swift:474-488`.
- Frames emitted as `capture.pcm`: `Voxt/helper/Sources/VoxtNewHelper/Capture.swift:506-515`; protocol defaults: `Voxt/docs/helper-protocol.md:105-107`.
- The separate 20 ms voice-detection analysis frame: `Voxt/internal/vad/doc.go:7-10`.
