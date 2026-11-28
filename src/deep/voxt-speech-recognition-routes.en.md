## Step 1 · One recording takes one recognition route

> **In one line:** The selected speech service turns Chapter 3's processed sound into text; the other two candidate routes do not also receive the recording.

### On the stage

- The blue box is the same processed recording. This constructed one-second example uses Chapter 3's 16 kHz, mono, PCM16 LE format and contains 32,000 bytes.
- `ASR` means automatic speech recognition: sound goes in and text comes out.
- The three routes are alternatives, not three consecutive stations: local Omni, macOS system dictation and a configured ASR API.
- This example selects route 1: its card is marked `selected in this example`, and the other two cards are marked `receives nothing`, because a session hands the recording to exactly one provider.
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

Public baseline: <code>sglang-omni@0e641996a0<wbr>c269601d03f1cb29<wbr>d3f46d7cb345a6</code>; paths are relative to that repository.

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

## Step 5 · Join piece text in recording order

> **In one line:** Pieces are recognised one at a time and non-empty results go to `JoinText` in order; English receives a space, while scripts such as Chinese do not gain a forced space.

### On the stage

- Piece one returns “Good” before piece two returns “morning.” The code waits for each result before starting the next, so recognition cannot reorder them.
- `JoinText` combines non-empty text in recording order. It does not reorder the words or recognise the audio again.
- English uses spaces between words, so this boundary receives one space and becomes “Good morning.”
- Orange marks the joined text. It is the file recognition's final text, not a replaceable streaming draft from Step 3.

### Formula

$$
J=p_1\mathbin{\oplus_s}p_2
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $J$ | Joined text | `JoinText`'s return value |
| $p_1$ | First piece's non-empty text | This example's “Good” |
| $p_2$ | Second piece's non-empty text | This example's “morning.” |
| $\oplus_s$ | Concatenate with a boundary-dependent separator | `JoinText`; here $s$ is one space |

The separator is not always a space. No extra space is inserted next to Chinese, Japanese, Korean or other listed scripts written without spaces, or full-width punctuation. Existing whitespace is not duplicated.

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Non-empty text parts | Step 4's two pieces each return one | 2 parts |
| English boundaries | $2-1$ | 1 boundary |
| Inserted spaces | One at this English boundary | 1 space |
| Joined text | $\text{Good}+\text{space}+\text{morning.}$ | Good morning. |

A piece whose trimmed result is empty never enters `texts`, so it creates no extra separator. The remaining non-empty results stay in recording order.

### Errors and scope

If any piece returns an error, `TranscribeInPieces` returns that error immediately rather than presenting earlier pieces as a complete success. On success it also accumulates duration and keeps language and model information; the stage only shows text joining.

This is the file-upload `TranscribeInPieces` route. Local Omni has separate `joinParts` and live-piece behavior, so this English-space example is not a universal text-processing rule.

### Next

The file route has now split and rejoined its recording. Next, return to local Omni from Step 1 and see why a full Final follows its live drafts.

### Sources

Public baseline: same as Step 1.

- Ordered recognition, blank omission, error return and joining: `Voxt/internal/asr/split.go:47-80`.
- English spaces and scripts without spaces: `Voxt/internal/asr/split.go:83-107`.

## Step 6 · Local Omni follows drafts with a Final

> **In one line:** Local Qwen3-ASR updates its preview about every second; with `LiveResult` off, the stop still triggers a Final over the whole recording rather than adopting the draft directly.

### On the stage

- This step covers only local Omni from Step 1, using Qwen3-ASR's default `LiveResult: false` route. It does not apply these details to every ASR provider.
- The first decode starts about 100 ms after audible sound, then updates about once per second. The starting point is detected audible sound, not the hotkey press.
- This constructed recording again says “Good morning.” for three seconds. Its three drafts appear at 0.1, 1.1 and 2.1 seconds; they are previews, not three final results.
- At the three-second stop, orange Final recognises the complete recording and supplies the result. Step 3 established that drafts can change; the new fact here is the default local route's final full listen.

### Formula

$$
t_i=t_0+0.1+i\times1\quad(i=0,1,2)
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $t_i$ | Time of preview $i+1$ in this example | Constructed from the public cadence |
| $t_0$ | First audible-sound time | Set to zero in this example |
| $0.1$ | Initial decode delay in seconds | `FirstDecode = 100 ms` |
| $1$ | Later decode interval in seconds | `DecodeInterval = 1 s` |
| $i$ | Zero-based preview index | This example's 0, 1 and 2 |

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| First draft | $0+0.1+0\times1$ | About 0.1 seconds |
| Second draft | $0+0.1+1\times1$ | About 1.1 seconds |
| Third draft | $0+0.1+2\times1$ | About 2.1 seconds |
| Final input | Stop time minus recording start | The whole 3 seconds |

These times describe scheduling, not measured recognition latency. Audible-sound detection, server queues and model speed all affect when real drafts appear.

### Why preview failure need not lose Final

`Send` queues audio for the preview and also appends PCM to `s.audio`. A late or failed preview can stop while the audio needed by Final remains. Default `Finish` starts `finalPass`, whose success emits `EventFinal` last.

For long recordings with pieces already finalised in the background, Final recognises only the remaining tail and joins it with those pieces. This short example has no such pieces, so its input is the whole three seconds. With `LiveResult` enabled, eligible realtime text can become the result directly, with fallback after failure; the main stage does not expand that optional switch.

### Next

Whether recognition used a file, a stream or local Final, the route must eventually deliver recognized speech. The next step shows where that raw text stops and which questions belong to the next chapter.

### Sources

Public baseline: same as Step 1.

- 100 ms first decode and one-second interval: `Voxt/internal/omni/models.go:157-166`.
- `Send` stores Final audio and queues the preview: `Voxt/internal/omni/live.go:221-265`.
- Default `Finish` starts Final: `Voxt/internal/omni/live.go:368-393`.
- Final tail, joining and final event: `Voxt/internal/omni/live_final.go:11-18,39-56,80-82`.
- `LiveResult` switch: `Voxt/internal/settings/settings.go:163-167`.

Public performance evidence (kept with its PR, measurement head, setup and boundary; not part of the pinned code baseline):

- [PR #2549](https://github.com/sgl-project/sglang-omni/pull/2549), landed on main by [PR #2576](https://github.com/sgl-project/sglang-omni/pull/2576): Apple M5/24 GB, Qwen3-ASR 0.6B 4bit, 392 clips. Final short p50/p95 194/279 → 111/145 ms, throughput 21.0 → 49.8 audio-s/s; first-preview p95 regressed 1207 → 2518 ms. The two rows are different comparisons: Final is the median of A0/C/C/A0 interleaved runs, while first preview compares live C round 1 against A0 rounds 14–16. The main table's measurement head is not recorded; the path is the real native service, not the full real app.
- [PR #3285](https://github.com/sgl-project/sglang-omni/pull/3285): DFlash speculative decoding on the native runtime, Apple M5/16 GiB, 392 clips (5,225 s), ABBA. Decode 57 → 189 tok/s for 1.7B 8bit and 244 → 402 tok/s for 0.6B 4bit. The benchmark tables are not bound to an exact measurement SHA; the path is the native CLI/server protocol, not the full Voxt app.

## Step 7 · Recognition hands over raw text

> **In one line:** The selected ASR route returns one recognized result, which the session stores in `Snapshot.Raw`; language-model connection and credentials are questions for the next chapter.

### On the stage

- Orange contains one final recognition result, this example's “Good morning.” It is not three drafts added together or two file pieces left separate.
- “Raw text” means recognized wording before language-model cleanup. It does not mean raw PCM audio.
- `Snapshot.Raw` is the session field that stores this text. The code also trims surrounding whitespace and removes a configured end word; this sentence has neither, so it remains unchanged.
- The dashed blue box asks the next chapter's questions: what else the language model receives and where its API key lives. A language model organises the wording; this chapter has not performed that cleanup.

### Formula

$$
R=\operatorname{withoutEndWord}(\operatorname{trim}(F),w)
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $R$ | Raw recognized text passed onward | `raw` in <code>run_<wbr>listen.go</code> |
| $F$ | Provider's final text | This example's “Good morning.” |
| $w$ | Configured end word | Session settings; absent in this example |
| `trim` | Remove surrounding whitespace | <code>strings.<wbr>TrimSpace</code> |
| <code>without<wbr>End<wbr>Word</code> | Remove the configured end word | The same call in <code>run_<wbr>listen.go</code> |

The actual code first applies `inScript` for text direction, then performs this pipeline. That representation handling does not call a language model to polish the text.

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---:|
| Candidate routes in Step 1 | Local, system and configured API | 3 routes |
| Active recognition route | Choose one per recording | 1 route |
| Raw-text result | One result for this recognition | 1 result |
| This example's raw text | $F$ has no extra whitespace and no $w$ | Good morning. |

If processing leaves `raw` empty, the session does not pass blank text onward as valid speech; ordinary dictation ends with the no-speech problem. This example is non-empty, so it stores `Raw` and continues.

### Chapter boundary

The chapter has now answered: choose one of three routes; file recognition waits for the whole recording while streaming supplies replaceable drafts; oversized files split at quiet places and join in order; default local Omni follows previews with a Final.

It has not covered language-model requests, wording cleanup, API-key storage or insertion into another app. The last stage deliberately stops at visible raw text rather than claiming that cleanup has already happened.

### Next

The next chapter starts from `Raw` and examines the context sent to the language-model service, plus its endpoint, model and API-key configuration.

### Sources

Public baseline: same as Step 1.

- Raw-text trimming, end-word removal and `Snapshot.Raw`: `Voxt/internal/session/run_listen.go:438-449`.
- Authorization in ASR requests belongs to the recognition connection: `Voxt/internal/asr/asr.go:9-20,59-76`.
