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

## Step 3 · Stop emits the partial final frame

> **In one line:** Three thousand three hundred samples fill two 1,600-sample frames; at stop, `flush()` emits the remaining 100 samples as a 200-byte final frame without dropping or padding them.

### On the stage

- This example uses the public test's 3,300 samples. Each blue box holds 1,600 samples, or the 3,200 bytes derived in Step 2.
- The narrow amber box is the partial final frame. It uses the same horizontal scale as the full frames: 100 is one sixteenth of 1,600, so its width is one sixteenth of a blue box.
- Here, `flush` means emitting leftover samples when capture stops before they fill a frame. The final frame still has sequence number `seq = 2` and starts at sample offset `offset = 3200`, after the samples in the two full frames.
- The final frame holds only the 100 remaining samples. It adds no blank samples, so it occupies 200 bytes and lasts 6.25 ms rather than a full frame's 100 ms.

### Formula

$$
F=\left\lfloor\frac{N}{S}\right\rfloor,\qquad R=N-F\times S,\qquad B=2R
$$

| Symbol | Meaning | Source |
|---|---|---|
| $N$ | Total input samples | The public test's 3,300 |
| $S$ | Samples in a full frame | Default 16,000 Hz × 100 ms = 1,600 |
| $F$ | Number of full frames | Calculated in this step |
| $R$ | Samples left at stop | Calculated in this step |
| $B$ | Bytes in the final frame | Two bytes per sample from Step 2 |

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Full frames | $\lfloor3{,}300/1{,}600\rfloor$ | 2 frames |
| Remaining samples | $3{,}300-2\times1{,}600$ | 100 samples |
| Final-frame bytes | $100\times2$ | 200 bytes |
| Final-frame start | $2\times1{,}600$ | Sample offset 3,200 |
| Final-frame duration | $100/16{,}000$ seconds | 0.00625 seconds = 6.25 ms |

The public test checks these two full frames and the final 200 bytes. If no samples remain at stop, `flush()` does not invent an empty frame.

### Next

Every sample has now joined an ordered frame. Next, see how the same recording can stay unchanged for history while a separate copy changes for the speech model.

### Sources

Public baseline: `sglang-omni@6d8ed2dcf70da1b021bb14b62239a3add428636c`; paths are relative to that repository.

- Full frames form at 1,600 samples: `Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift:33-37,59-61`.
- `flush()` emits only the leftovers; sequence numbers, sample offsets and byte generation: `Voxt/helper/Sources/VoxtNewHelperKit/PCMFramer.swift:70-87`.
- Stop sends converted buffers and the partial final frame first: `Voxt/helper/Sources/VoxtNewHelper/Capture.swift:552-568`.
- Public test for 3,300 samples, two full frames, a 200-byte tail and offset 3,200: `Voxt/helper/Tests/VoxtNewHelperKitTests/HotkeyRecognizerTests.swift:474-488`.

## Step 4 · Separate the original recording from the model copy

> **In one line:** With sound processing enabled, history keeps the incoming PCM unchanged while the speech model uses a separate copy that filtering, voice detection and level processing can change.

### On the stage

- The helper supplies ordered PCM frames at the top. The session appends these bytes to its `pcmBuffer`, which later supplies the kept history recording.
- The amber path preserves the original recording. History writes a WAV only when audio keeping is enabled; this stage does not claim that every dictation keeps audio forever.
- The blue path supplies the speech model's copy. Streaming first names the current bytes `raw`, then the high-pass and level stages return new slices. The original `pcm` used by history does not change with them.
- “Same bytes as received” reuses Step 2's byte concept to stress that the original data stays unchanged. The stage introduces no new encoding format.

### Scope

The stage shows processing enabled. Settings can turn off individual processing stages, so the picture does not imply that every configuration creates a different sound. Audio keeping is a separate setting, and its retention period is outside this chapter.

File and streaming recognition both preserve the original recording. Their send timing and silence removal differ; the voice-detection step and next chapter distinguish those routes.

### Next

The original recording stays on the amber path. Next, follow the blue copy to its first processing stage: a high-pass filter that reduces low hum.

### Sources

Public baseline: `sglang-omni@6d8ed2dcf70da1b021bb14b62239a3add428636c`; paths are relative to that repository.

- Helper PCM appends to the session's original buffer: `Voxt/internal/session/run_audio.go:66-72`; buffer append: `Voxt/internal/session/pcm.go:8-28`.
- The streaming path preserves `raw`, sends processed copies: `Voxt/internal/session/run_audio.go:122-150`.
- File processing leaves input `pcm` unchanged for history: `Voxt/internal/session/run_audio.go:261-269`; implementation: `Voxt/internal/dsp/level.go:125-169`.
- History WAV writes `r.pcm.bytes()`: `Voxt/internal/session/run.go:545-554`.
- The public documentation describes the recording as the microphone signal before high-pass, gain and silence trimming: `Voxt/docs/dictation-collection.md:37-40`.

## Step 5 · High-pass reduces low hum

> **In one line:** The default high-pass reduces a 50 Hz hum in the model copy by about 16.4 dB while a 200 Hz sound stays almost unchanged; the original recording in history bypasses this change.

### On the stage

- `Hz` counts vibrations each second. A 50 Hz wave vibrates slowly and can represent mains hum. A 200 Hz wave vibrates faster.
- A high-pass does not delete every frequency below a hard boundary. It reduces slower vibrations by a frequency-dependent response. The default corner is 80 Hz, where the response is about −3 dB.
- Before and after waves share the same time and amplitude scales. The 50 Hz output uses the public response of about −16.4 dB. The 200 Hz response is close to 1, so the stage draws the same wave.
- Both blue waves belong to Step 4's model copy. The amber history recording does not enter this processing path.

### Formula

The public test reports the amplitude change in decibels. Convert that change to an amplitude ratio:

$$
G=10^{D/20}
$$

| Symbol | Meaning | Source |
|---|---|---|
| $D$ | Response at one frequency, in decibels | Public `TestHighPassResponse` |
| $G$ | Output amplitude divided by input amplitude | Decibel conversion; the code's `Response` returns 1 for 0 dB |

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Amplitude ratio at 50 Hz | $10^{-16.4/20}$ | About 0.151 |
| Relative output height | $1\times0.151$ | About 15.1% of the input |
| Response at 200 Hz | Public test range −0.05 to 0.01 dB | Close to 1; drawn unchanged |

At the default 80 Hz corner, the response is about −3 dB, so $10^{-3/20}\approx0.708$. The filter changes gradually rather than deleting everything below 80 Hz.

### Scope

The sine waves illustrate amplitude response. This step does not expand the fourth-order Butterworth design, biquads or initial 20 ms state. The implementation keeps filter state across streaming chunks so chunked output matches whole-recording processing.

### Next

After the low hum falls, VAD checks which 20 ms slices contain speech. Detection runs before gain so that gain cannot move its thresholds.

### Sources

Public baseline: `sglang-omni@6d8ed2dcf70da1b021bb14b62239a3add428636c`; paths are relative to that repository.

- High-pass before detection, the default 80 Hz corner and frequency responses: `Voxt/internal/dsp/doc.go:6-24`.
- Default corner: `Voxt/internal/dsp/params.go:5-10,41-50`.
- Fourth-order filter, response function and new-slice output: `Voxt/internal/dsp/highpass.go:65-106`.
- Public test for about −16.4 dB at 50 Hz, −3 dB at 80 Hz and nearly unchanged 200 Hz audio: `Voxt/internal/dsp/dsp_test.go:12-44`.

## Step 6 · Speech starts after 60 ms in a row

> **In one line:** The default energy VAD examines the copy in 20 ms slices and waits for three consecutive slices above its onset thresholds, so one 20 ms key click is not enough.

### On the stage

- These 20 ms analysis slices differ from the helper's 100 ms audio frames in Step 1. One 100 ms audio frame yields five consecutive 20 ms analysis slices.
- The dashed grey line is the room-noise estimate, which follows quiet slices. A blue bar rises above it to represent a sufficiently loud slice. The stage focuses on the time condition; the real onset also requires an absolute minimum level.
- At left, one louder 20 ms slice does not reach 60 ms in a row, so it says “not yet.” At right, three sufficiently loud slices arrive consecutively, and speech starts when the third arrives.
- The segment start moves back to the first of those three slices rather than the end of the third. Waiting for confirmation does not cut off the beginning of the speech.

### Formula

The defaults give the samples per analysis frame and the consecutive frames needed for onset:

$$
S=r\times\frac{F}{1000},\qquad N=\frac{O}{F}
$$

| Symbol | Meaning | Source |
|---|---|---|
| $r$ | Samples per second | This chapter's 16,000 Hz |
| $F$ | VAD analysis-frame duration | Default 20 ms |
| $O$ | Consecutive duration needed to start speech | Default 60 ms |
| $S$ | Samples per analysis frame | Calculated in this step |
| $N$ | Consecutive frames needed to start speech | Calculated in this step |

The detector also converts each analysis frame to a level:

$$
L=10\log_{10}(\operatorname{mean}(x^2)),\qquad x\in[-1,1]
$$

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Samples per analysis frame | $16{,}000\times20/1{,}000$ | 320 samples |
| Consecutive onset frames | $60/20$ | 3 frames |
| Analysis frames per helper frame | $100/20$ | 5 frames |

By default, every onset frame must satisfy both $L>\text{noise floor}+10\,\mathrm{dB}$ and $L>-60\,\mathrm{dBFS}$. The implementation uses strict comparisons; the documentation summarizes both as “above.”

### Scope

This stage covers only the default energy detector's onset condition. It does not expand model-assisted detection, noise-floor updates or the complete file-versus-stream sending routes. After onset, the continuation threshold falls to 6 dB above the noise floor. Speech ends after 300 ms below that threshold, with the segment end returning to the last frame that met it.

With high-pass enabled, detection also listens to the original recording. The file route merges speech found in either version, and the streaming gate can open from either one. This conservative rule keeps speech found on either side instead of letting the filter cut an onset.

### Next

Detection finds the speech before level processing measures its strength. Gain follows speech frames rather than room noise, so silence does not drive the volume upward.

### Sources

Public baseline: `sglang-omni@6d8ed2dcf70da1b021bb14b62239a3add428636c`; paths are relative to that repository.

- Twenty-millisecond analysis frames, the 60 ms onset, thresholds and 300 ms hangover: `Voxt/internal/vad/vad.go:21-57`.
- Consecutive onset thresholds and segment start at the first qualifying frame: `Voxt/internal/vad/vad.go:239-278`.
- Level formula and conservative detection rationale: `Voxt/internal/vad/doc.go:1-31`.
- Speech found in either original or filtered audio is kept: `Voxt/internal/vad/doc.go:54-62`; streaming wiring: `Voxt/internal/session/run_audio.go:128-145`; file merge: `Voxt/internal/dsp/level.go:144-148`.
