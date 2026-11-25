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
