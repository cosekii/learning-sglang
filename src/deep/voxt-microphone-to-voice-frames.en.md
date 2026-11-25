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

## Step 2 · One sample becomes two bytes

> **In one line:** PCM16 converts each sound sample into an integer and stores it as two bytes, low byte first; a default full frame holds 1,600 samples, or 3,200 bytes.

### On the stage

- A **sample** is what the stage calls one sound measurement. The stage starts with its whole-number form, `16,383`, and focuses only on splitting it into two bytes. The public test produced this integer from input `0.5`; the formula below explains that conversion.
- A **byte** is a basic storage unit. This stage displays each byte as an unsigned value, so one box shows 0–255. Counting both endpoints gives 256 possible values, so the split uses groups of 256.
- The stage writes `16,383 ÷ 256 = 63 remainder 255`. Byte 1 holds remainder `255` and is called the **low byte** in this format; byte 2 holds `63` groups of 256 and is called the **high byte**. A separate line gives this measurement's byte order in the frame: `255` first, then `63`.
- This format is called `PCM16 LE`. `16` means 16 binary digits per sample, or two bytes. `LE` means little-endian: store the low byte first. Low and high name the byte jobs, not their number sizes; this example has `255 > 63`.
- To convert `0.5` into `16,383`, the framer uses the code's fixed multiplier `32,767`. `Int16(...)` discards the fraction toward zero, so `16,383.5` becomes `16,383` here. Input `0.5` is neither a volume percentage nor a height measured from the Step 1 waveform.
- A default full frame covers 100 ms and holds 1,600 samples. At two bytes per sample, its PCM data occupies 3,200 bytes. These derived frame numbers stay in the deep dive so the stage can focus on one sample's byte split.

### Formula

$$
N=\operatorname{trunc}(c\times32{,}767)
$$

For this example, $N\ge0$. Split the integer into two bytes:

$$
N=H\times256+L,\qquad 0\le L<256
$$

| Symbol | Meaning | Source |
|---|---|---|
| $c$ | Input sample clamped to $[-1,1]$ | `max(-1, min(1, v))` in `PCMFramer.push` |
| $N$ | Integer stored as PCM16 | `Int16(c * 32767)` in the code |
| $\operatorname{trunc}$ | Discard the fraction toward zero | Swift's `Int16` floating-point conversion |
| $L$ | Low byte: remainder after division by 256 | Integer split in this example |
| $H$ | High byte: groups of 256 | Integer split in this example |

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Converted integer | $\operatorname{trunc}(0.5\times32{,}767)$ | $16{,}383$ |
| Low byte | $16{,}383-63\times256$ | $255$, or `FF` in hexadecimal |
| High byte | $(16{,}383-255)/256$ | $63$, or `3F` in hexadecimal |
| Storage order | Low byte, then high byte | `FF 3F` |
| Bytes in one full frame | $1{,}600\times2$ | $3{,}200$ bytes |

The public test checks these exact results. After input `0.5`, byte zero is `0xFF`, byte one is `0x3F`, and one full frame contains 3,200 bytes.

### Scope

The stage expands one non-negative sample, `0.5`. The code also accepts negative samples and first clamps every input to $[-1,1]$. Signed negative representation, partial final frames, sample offsets and network delivery come later. A frame here still means the helper's 100 ms `capture.pcm` data, not the separate 20 ms voice-detection analysis frame.

### Next

Each sample now has an ordered pair of bytes. Next, see what happens to the final slice when sound stops before it collects 1,600 samples.

### Sources

Public baseline: `sglang-omni@f6827ed1907e392fd67d5f13fa315c016e2056e8`; paths are relative to that repository.

- Default sample rate and samples per frame: `Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift:33-37`.
- Input clamp, multiplication by 32,767 and `Int16` conversion: `Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift:40-47`.
- Per-sample little-endian byte conversion: `Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift:77-87`.
- Public test for `0.5 → 16383`, bytes `FF 3F` and 3,200 bytes per full frame: `Voxt/helper/Tests/VoxtNewHelperKitTests/HotkeyRecognizerTests.swift:474-488`.
