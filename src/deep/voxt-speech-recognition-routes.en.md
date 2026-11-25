## Step 1 · One recording takes one recognition route

> **In one line:** The selected speech service turns Chapter 3's processed sound into text; the other two candidate routes do not also receive the recording.

### On the stage

- The blue box is the same processed recording. This constructed one-second example uses Chapter 3's 16 kHz, mono, PCM16 LE format and contains 32,000 bytes.
- `ASR` means automatic speech recognition: sound goes in and text comes out.
- The three routes are alternatives, not three consecutive stations: local Omni, macOS system dictation and a configured ASR API.
- Local Omni starts a model server on this Mac and talks to it through `127.0.0.1`, an address that refers to this machine.
- System dictation uses macOS's built-in `SFSpeechRecognizer` through Chapter 2's helper. It is not another download in Voxt's model catalogue.
- A configured ASR API can be remote. This example places it outside the Mac; an API at `127.0.0.1` is local too.

### Formula

$$
B=R\times C\times T
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $B$ | Bytes in this PCM recording | Calculated in this step |
| $R$ | Samples per second | Chapter 3 and `asr.SampleRate`, 16,000 |
| $C$ | Bytes per sample | Chapter 3's PCM16 LE, 2 bytes |
| $T$ | Recording duration | This step's constructed 1 second |

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| PCM bytes per second | $16{,}000\times2$ | 32,000 bytes |
| One-second recording | $32{,}000\times1$ | 32,000 bytes |

The 32,000 bytes exclude a WAV header. They show how much sound data must move, not measured recognition time or network traffic.

### Selection and data boundaries

After the session resolves the selected ASR provider, it gives this recording only to that provider. Local Omni and system dictation use a model server on this Mac and the helper respectively. A remote service uses its configured endpoint, model and authorization. Remote endpoints require `https://` or `wss://`; loopback is the exception.

This step does not compare recognition quality or claim system dictation supports every language. Opening a stream fails when macOS lacks an on-device model for the language or Speech Recognition permission.

### Next

The route decides who receives the sound. Next, a service that only accepts a whole recording receives one WAV after speaking stops and returns final text.

### Sources

Public baseline: `sglang-omni@0e641996a0c269601d03f1cb29d3f46d7cb345a6`; paths are relative to that repository.

- ASR input format and local or remote providers: `Voxt/internal/asr/asr.go:1-20,31-76`.
- Local Omni's loopback server and startup: `Voxt/internal/omni/doc.go:1-5,29-48`.
- System dictation and language or permission failures: `Voxt/internal/dictation/dictation.go:1-12,31-58`.
- Remote service setups and presets: `Voxt/internal/providers/speech.go:27-75,158-193`.

## Step 2 · File recognition waits for the stop

> **In one line:** A file transcriber receives the whole recording after the stop; this OpenAI-compatible example wraps PCM as WAV, uploads it and returns final text.

### On the stage

- The blue bars are a constructed speech waveform from 0 to 3 seconds. The orange line at 3 seconds is the stop; no final text appears before it.
- A `FileTranscriber` receives one complete recording and returns a `Result`, rather than emitting drafts while the speaker talks.
- The WAV example contains PCM sound and a 44-byte header. The header describes the format; it is not 44 extra bytes of sound.
- `final` is the text that counts as the recognition result. Orange marks the stop and final result.
- This example makes one upload and returns “Good morning.” The model determines real text; this sentence is constructed.

### Formula

$$
W=T\times R\times C+H
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $W$ | Total WAV bytes | Calculated in this step |
| $T$ | Recording seconds | This step's constructed 3 seconds |
| $R$ | Samples per second | Step 1, 16,000 |
| $C$ | Bytes per sample | Step 1, 2 |
| $H$ | WAV header | `asr.WAV`, 44 bytes |

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| PCM sound | $3\times16{,}000\times2$ | 96,000 bytes |
| Total WAV size | $96{,}000+44$ | 96,044 bytes |

The 96,044 bytes cover only the WAV file. The actual upload also contains multipart boundaries and fields such as the model name, so the file size is not the whole HTTP request size.

### Selection rule and scope

The session first checks whether the selected provider implements `Streamer` with `Caps().Stream`. If not, it uses this step's `FileTranscriber` branch. `prepare` supplies processed PCM; the request also carries the language, dictionary hints, context and upload limit.

The OpenAI-compatible client wraps PCM with `asr.WAV`, then makes one multipart upload to `/audio/transcriptions`. Other file providers can use their own formats; the 44-byte calculation applies only to this WAV example. Steps 4 and 5 cover recordings above an upload limit.

### Next

A whole-file upload is simple but produces no text until the stop. Next, a streaming service supplies changeable drafts during speech and a final result afterwards.

### Sources

Public baseline: same as Step 1.

- File interface and request: `Voxt/internal/asr/asr.go:59-76,101-105`.
- Session's streaming-first and file-fallback branches: `Voxt/internal/session/run_audio.go:18-22`; `Voxt/internal/session/run_listen.go:399-418`.
- WAV's 44-byte header and PCM wrapping: `Voxt/internal/asr/audio.go:27-49`.
- OpenAI-compatible upload and PCM-to-WAV conversion: `Voxt/internal/asr/openai/openai.go:1-5,101-129`.

## Step 3 · Streaming drafts are replaced

> **In one line:** A streaming recogniser supplies the whole current draft during recording; each draft replaces the last, and final text is the result that counts.

### On the stage

- A `Streamer` accepts sound and returns text before recording has finished.
- The three boxes correspond to this example's three `Send` calls. After some audio, the recogniser can emit `EventPartial`, shortened to “draft” on the stage.
- “Good” → “Good mor” → “Good morning” are three successive whole drafts, not three parts to concatenate. Each contains or revises the previous hypothesis.
- This example only adds characters; a real model can also change words already shown, so a draft is not final.
- `Finish` follows the stop. `EventFinal` supplies the result in orange, replacing the draft.

### Formula

$$
N=S+1
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $N$ | Calls to the stream in this example | Calculated in this step |
| $S$ | `Send` calls during recording | This step's constructed 3 |
| $1$ | One `Finish` at the stop | The ending branch in `run_audio.go` |

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Total calls in this example | $3+1$ | 4 calls |
| Drafts in this example | One after each `Send` | 3 drafts |

Real send counts depend on recording length and frame size, and a provider need not emit a draft after every send. Three fixed sends make replacement visible; they are not a performance measurement.

### Protocol and scope

The session uses this route only when the provider implements `Streamer` and declares `Caps().Stream`. Its writer sends audio during recording and calls `Finish` afterwards. Its event reader stores each `EventPartial` in the current snapshot; `EventFinal` or `EventError` terminates the stream.

A partial is the whole current hypothesis, not a delta. Draft timing and content vary by provider. This step explains the shared protocol, not a one-second cadence or every local Omni detail.

### Next

Streaming can revise drafts while listening. An oversized file upload must first be split; the next step shows how the cut avoids the middle of a word.

### Sources

Public baseline: same as Step 1.

- Streaming capability check: `Voxt/internal/session/run_audio.go:18-22`.
- `Finish` and partial, final or error events: `Voxt/internal/session/run_audio.go:176-225`.
- Stream interface and event contract: `Voxt/internal/asr/asr.go:107-177`.

## Step 4 · Split oversized audio at a quiet place

> **In one line:** When a file upload exceeds its limit, `SplitPCM` finds the quietest 100 ms in the current piece's last quarter and cuts inside a pause.

### On the stage

- This example comes from a public test: ten seconds of sound, a nine-second per-piece limit and a 300 ms pause at 8.5 seconds.
- The blue region is the last quarter of the nine-second budget, from 6.75 through 9 seconds. Restricting the search to this region prevents a very short first piece.
- “Quietest 100 ms” means the interval with the lowest sound energy. The code sums squared PCM samples; a smaller sum is quieter.
- Orange marks the pause and cut. The test requires a cut inside the pause, not one fixed timestamp for every recording.
- Two pieces result. The remainder starts at the cut, so no sound is copied or lost; both pieces fit the nine-second limit.

### Formula

$$
L=\frac{M}{4},\qquad S=M-L=\frac{3M}{4}
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $L$ | Search-range duration | Last quarter of the current piece's limit |
| $M$ | Maximum current-piece duration | Test's nine-second PCM allowance |
| $S$ | Search-range start | $M-L$ |

The implementation works in bytes, not seconds. This test's PCM has a fixed byte rate, so the stage shows equivalent times. Its quiet window is $R/10\times2$ bytes; at 16 kHz and PCM16, that is exactly 100 ms.

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Search-range length | $9/4$ | 2.25 seconds |
| Search-range start | $9-2.25$ | 6.75 seconds |
| Pause range | $8.5$ through $8.5+0.3$ | 8.5–8.8 seconds |
| Resulting pieces | Public test assertion | 2 pieces |

Without a pause, the code still cuts at an allowed boundary rather than extending a piece indefinitely. Once the remainder fits, the loop stops and that remainder becomes the final piece.

### Actual uploads and scope

`TranscribeInPieces` compares the 44-byte WAV header plus PCM against the upload limit. When splitting is needed, it subtracts those 44 bytes from the PCM allowance. A smaller user limit wins. Step 2's WAV calculation therefore affects how much sound fits here.

These are file-upload pieces created after the stop, not the streaming frames in Step 3 or a universal provider policy. Other formats and recordings already within the limit go through as one request.

### Next

The split preserves all sound and makes each piece uploadable. Next, the pieces are recognised in order and their text is joined in the same order.

### Sources

Public baseline: same as Step 1.

- Last-quarter search, 100 ms quiet window and split loop: `Voxt/internal/asr/split.go:12-45`.
- Ten-second, nine-second-limit and 8.5-second-pause test: `Voxt/internal/asr/split_test.go:13-33`.
- WAV-header allowance and piece-transcription entry: `Voxt/internal/asr/split.go:47-65`.
