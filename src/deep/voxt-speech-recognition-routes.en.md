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
