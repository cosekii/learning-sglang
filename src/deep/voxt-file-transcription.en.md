## Step 1 · Two routes

> **In one line:** A dictation puts text at the cursor; a file transcription writes SRT or TXT. Both use Voxt and a speech model, but the file route does not open a dictation session.

### On the stage

- The left column is **dictation**: the microphone and helper send sound, one dictation session handles it, and the result appears at the cursor and may also be written to history.
- The right column is **file**: `meeting.m4a` on disk, marked "1-hour meeting · compressed M4A", goes through `Voxt transcribe` and becomes `meeting.srt` or `talk.txt`.
- The lines below derive the decoded size: 3,600 × 16,000 × 2 B = 115,200,000 B = 115.2 MB PCM, not the compressed M4A size; at 4 MB per photo, 115.2 ÷ 4 ≈ 29 photos. They also say both routes use Voxt and a speech model, and the file route has no dictation session or history row.

### Why this needs its own route

A one-hour meeting is 3,600 seconds. At Step 2's 16 kHz, 16-bit mono, its PCM is:

$$ 3{,}600 \times 16{,}000 \times 2 = 115{,}200{,}000\ \text{B} = 115.2\ \text{MB} $$

At 4 MB per phone photo, that is $115.2 / 4 \approx 29$ photos. A recording that long does not fit a hotkey dictation, and its output is not text at a cursor, so the file route exists on its own.

| Symbol | What it is | Where it comes from |
|---|---|---|
| 3,600 s | a one-hour meeting | constructed example |
| 16,000 | samples per second | `asr.SampleRate`, Step 2 |
| 2 B | bytes per sample | 16-bit PCM |
| 115.2 MB | the size of that PCM | this step's arithmetic |
| 4 MB | an estimated phone photo | a constructed comparison |

### The two routes in code

`runTranscribeCLI` passes the command's arguments, standard output, standard error, the socket path and a decode function to `transcribeCLI` (`Voxt/transcribe_cli.go:35-39`). The command itself does no dictation and touches no history. On the app side, `fileRecognizer` calls `asr.Recognize` directly (`Voxt/transcribe_socket.go:84-87`); it does not go through the session's cleanup, delivery or history writing.

### Next

The file first has to become sound the speech model can read. Step 2 covers decoding.

## Step 2 · Decode to PCM

> **In one line:** The command asks macOS `afconvert` to turn the file into 16 kHz mono 16-bit PCM and holds it as a temporary WAV.

### On the stage

- The orange box on the left is the input `talk.m4a`, marked 8 seconds.
- The blue box in the middle is `afconvert`, with `-f WAVE -d LEI16@16000 -c 1`.
- The blue box on the right is the temporary file `audio.wav`.
- The byte arithmetic is below it; the last line compares 256 KB to "smaller than one phone photo".

### The decode command and the bytes

`decodeAudio` checks the file, makes a temporary folder, and runs:

```sh
/usr/bin/afconvert -f WAVE -d LEI16@16000 -c 1 talk.m4a audio.wav
```

Then it reads the WAV back and takes the PCM with `asr.ReadWAV` (`Voxt/transcribe_cli.go:111-139`). `LEI16` is little-endian 16-bit integers, `@16000` is 16 kHz, and `-c 1` is mono. `asr.SampleRate` is 16000 (`Voxt/internal/asr/asr.go:32`).

$$ \text{PCM bytes} = T \times f_s \times b,\qquad \text{WAV bytes} = \text{PCM bytes} + 44 $$

| Symbol | What it is | Size | Where it comes from |
|---|---|---|---|
| $T$ | audio length | 8 s | constructed example |
| $f_s$ | sample rate | 16,000 per second | `asr.SampleRate`, `asr/asr.go:32` |
| $b$ | bytes per sample | 2 B | 16-bit PCM |
| 44 | WAV header | 44 B | WAV format |
| PCM bytes | decoded sound | 256,000 B | this step's arithmetic |
| WAV bytes | size of the temporary WAV | 256,044 B | this step's arithmetic |

### Plugging in the stage's numbers

| Quantity | Arithmetic | Result |
|---|---|---|
| PCM | $8 \times 16{,}000 \times 2$ | 256,000 B |
| WAV | $256{,}000 + 44$ | 256,044 B |
| duration | $8 \times 16{,}000 \times 2 \div 32{,}000$ | 8 s (back to the original) |

`afconvert` also reads the sound of mp4 and mov videos, so a video needs no separate audio extraction. The comment on `decodeAudio` says so (`transcribe_cli.go:111-112`).

### Next

The PCM can go to the model now, but the model lives inside the running Voxt. Step 3 sends it there.

## Step 3 · Handoff over a local socket

> **In one line:** The command sends one JSON request line and the PCM to the running Voxt through the local `transcribe.sock`; it writes the PCM while it reads replies, so a reply can arrive before the last PCM byte.

### On the stage

- The top row is the command, `transcribe.sock` and the running Voxt. The socket says "your account only".
- The line above the dashed box is the request: `{"op":"transcribe","bytes":256000,"lang":""}`.
- The upper lane is PCM still moving right, marked 256,000 bytes; the lower lane is replies coming back from the right.
- The line below says: a reply can arrive before the last PCM byte.

### Request and replies

The request is **one JSON line**, followed directly by the PCM:

```json
{"op":"transcribe","bytes":256000,"lang":""}
```

These are the three fields of `Request` (`Voxt/internal/fileasr/socket.go:34-39`). An empty `lang` tells the app to use dictation's language hint; when the command gives `--lang`, that value is filled in (`transcribe_socket.go:77-79`). One request line is at most 4 KiB (`socket.go:25-29`).

The reply is **one JSON line per cue**, ending with a `done` line:

```json
{"segment":{"start":0,"end":3350000000,"text":"Good morning."}}
{"segment":{"start":3400000000,"end":7850000000,"text":"See you at noon."}}
{"done":true,"count":2}
```

`Segment` times are integer nanoseconds, because Go's `time.Duration` marshals as an integer number of nanoseconds (`Voxt/internal/fileasr/fileasr.go:26-31`).

### Why it does not wait for the whole upload

`Transcribe` uses a goroutine to write the request line and the whole PCM, while the main goroutine reads replies (`socket.go:168-176`). On the server side, after reading the request line (`socket.go:131-146`), `transcribe` hands the PCM to `fileasr.Run` through an `io.LimitReader`; `Run` reads 64,000 bytes at a time (2 seconds, `fileasr.go:36-37`) and cuts and recognizes as it goes. A cue's reply can therefore come back while later PCM is still uploading. The two arrows on the stage point in opposite directions for that reason.

$$ \text{reply}_i \text{ can arrive while } \text{uploaded bytes} < \text{Request.Bytes} $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $\text{reply}_i$ | the reply for cue $i$ | `socket.go:41-46` |
| `Request.Bytes` | the PCM's total byte count | `socket.go:35-39`, 256,000 here |
| 64,000 | bytes read at a time | `fileasr.go:36-37` |

### Where the socket lives, and who can open it

The socket is named `transcribe.sock` and sits in the app's data folder (`socket.go:16-17`). `historyapi.Listen` binds it and chmods it to `0600` (`Voxt/internal/historyapi/server.go:101-114`). It has no network port, and only your account can open it. The command reads none of your folders; it reads only the file you name.

### Next

The app cuts cues while the PCM arrives. Step 4 covers how a pause ends a cue.

## Step 4 · A pause ends a cue

> **In one line:** The cutter looks at 10 ms frames, and 450 ms of quiet ends a cue.

### On the stage

- The two blue rules on top are the time ranges of cue 1 and cue 2: 0.00–3.35 s and 3.40–7.85 s.
- The waveform is blue for speech and grey for quiet.
- The small orange box marks the 450 ms of quiet at the end of cue 1.
- The two lines below say: each frame is 10 ms; the quiet at the end stays with the cue.

### The end condition and the frame

The constants are in `Voxt/internal/meeting/cutter.go:9-19`: `cutterFrame = 10 ms`, `cutterSilenceCut = 450 ms`. The end condition is `c.silence >= cutterSilenceCut` (`cutter.go:70-74`).

$$ \text{cue end} = \text{last speech} + 450\ \text{ms} $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| last speech | the last frame over the energy gate | `cutterSpeechRMS = 800`, `cutter.go:18` |
| 450 ms | quiet that ends a cue | `cutterSilenceCut`, `cutter.go:12` |
| 10 ms | one frame | `cutterFrame`, `cutter.go:11` |

### Plugging in the stage's numbers

| Quantity | Value | Arithmetic |
|---|---|---|
| cue 1 speech ends | 2.90 s | constructed |
| cue 1 ends | 3.35 s | $2.90 + 0.45$ |
| cue 2 speech ends | 7.40 s | constructed |
| cue 2 ends | 7.85 s | $7.40 + 0.45$ |

### Why the quiet at the end stays

The `End` from `finalize` is the frame that triggered the end, and the buffer already holds those 450 ms (`cutter.go:119-127`). This chapter does not remove them; the model usually ignores trailing silence. The SRT times on the stage use that `End`.

### Next

The start of a cue has one more rule. Step 5 covers the 300 ms lead-in.

## Step 5 · Starting 300 ms early

> **In one line:** A new cue starts 300 ms before its speech, so the first consonant is not cut off; a cue with less than 350 ms of speech is dropped.

### On the stage

- The waveform is the same as Step 4: cue 1 0.00–3.35 s and cue 2 3.40–7.85 s.
- The small blue box at the start of cue 2 marks the 300 ms lead-in.
- The two lines below say: speech starts at 3.70 s, the cue starts at 3.40 s, and that keeps the first consonant.

### The start and the minimum

`startUtterance` moves the start back by `cutterPreRoll = 300 ms`, but not below 0 (`cutter.go:95-105`). It keeps the ring buffer from before the speech (`appendRing`, `cutter.go:111-117`).

A short cue is refused in `finalize`: `voicedDur < cutterMinUtterance` (350 ms) returns `false` (`cutter.go:119-127`). The caller still clears the buffer, so the short cue does not stay.

$$ \text{cue start} = \max(0,\ \text{speech onset} - 300\ \text{ms}),\qquad \text{keep cue} \iff \text{voiced} \ge 350\ \text{ms} $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| speech onset | the first voiced frame | `cutterSpeechRMS = 800` |
| 300 ms | lead-in at the start | `cutterPreRoll`, `cutter.go:15` |
| voiced | total voiced time in the cue | `voicedDur`, `cutter.go:28` |
| 350 ms | the least speech a cue needs | `cutterMinUtterance`, `cutter.go:13` |

### Plugging in the stage's numbers

| Quantity | Value | Arithmetic |
|---|---|---|
| cue 2 speech starts | 3.70 s | constructed |
| cue 2 starts | 3.40 s | $3.70 - 0.30$ |
| a cue with 200 ms of speech | dropped | $200 < 350$ |

### Next

If someone keeps talking, the 450 ms rule never fires. Step 6 covers the 7-second cap.

## Step 6 · The 7-second cap

> **In one line:** When a cue reaches 7 s without a long pause, the cutter cuts inside the quietest 100 ms of the last second, and the rest continues as the next cue.

### On the stage

- The two blue rules are piece 1, 0–6.5 s, and piece 2, 6.5–9 s.
- The waveform is blue except for a small grey stretch at 6.45–6.55 s: a constructed quiet window.
- The orange box marks the 6.0–7.0 s search range, and the dashed line falls on the 6.5 s cut.
- The three lines below say: 7 s arrived without a pause, cut inside the quietest 100 ms, and the remaining 2.5 s becomes the next cue.

### Trigger and cut point

When `end - c.utterStart >= cutterMaxSegment` and the 450 ms rule did not fire, `pushFrame` calls `cutAtQuietest` (`cutter.go:75-78`). `cutterMaxSegment` is 7 seconds. `cutAtQuietest` searches `cutterQuietSearch = 1 s` with a `cutterQuietWindow = 100 ms` window (`cutter.go:16-17`, `cutter.go:130-147`).

$$ \text{search} = [\,7 - 1,\ 7\,]\ \text{s},\qquad \text{cut} = \arg\min_{w \subset \text{search}} \mathrm{RMS}(w) $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| 7 s | the length cap of one cue | `cutterMaxSegment`, `cutter.go:14` |
| search | the last second | `cutterQuietSearch`, `cutter.go:16` |
| $w$ | a 100 ms window | `cutterQuietWindow`, `cutter.go:17` |
| RMS | sound energy inside the window | `frameRMS`, `cutter.go:165` |

### Plugging in the stage's numbers

| Quantity | Value | Where it comes from |
|---|---|---|
| continuous speech | 9 s | constructed |
| search range | 6.0–7.0 s | $7 - 1$ to $7$ |
| quiet window | 6.45–6.55 s | constructed around 6.5 s |
| piece 1 | 0–6.5 s | the cut |
| piece 2 | 6.5–9 s | $9 - 6.5 = 2.5$ |

The cut is not fixed at 6.5 s. The 6.5 in this step is a constructed example, and the quiet window is placed there, so "the quietest 100 ms" and the cut agree. The real cut follows whichever 100 ms window is quietest in the last second. `cutAtQuietest` keeps the sound after the cut in `c.buf` and sets `utterStart` to the cut (`cutter.go:135-146`).

### Next

With the cues cut, the app sends each one to the model. Step 7 covers recognition.

## Step 7 · Recognize one cue at a time

> **In one line:** Voxt recognizes each cue with the speech model chosen for Transcribe, returns the cues in order, and drops a cue whose text is empty.

### On the stage

- The wide blue box on top is Transcribe's speech model, with a note that it is chosen in Settings → Speech models.
- Two rows follow: the orange box on the left is a cue's time range, and the arrow points to the text in the neutral box on the right.
- The footnotes say an empty answer is dropped, and a missing `--lang` uses dictation's language hint.

### Where the recognizer comes from

`fileRecognizer` reads the Transcribe feature model on the main thread: `a.featureModel(local.ASR, hotkey.Transcribe)` (`Voxt/transcribe_socket.go:64-67`). If no model is installed, it returns an error and the command exits with code 4. The language hint is chosen like this:

```go
if languageTag == "" {
    languageTag = p.lang
}
```

`p.lang` comes from `session.SpeechLang(a.prefs, i18n.Locale())` (`transcribe_socket.go:77-79`). Recognition itself is `asr.Recognize(ctx, prov, pcm, languageTag, nil, "", asr.Feed{})` (`transcribe_socket.go:84-87`).

$$ \text{segments} \le \text{cues},\qquad \text{segment} \text{ is emitted only if } \mathrm{trim}(\text{text}) \ne "" $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| cues | the cues handed out by the cutter | Steps 4–6 |
| `text` | the model's answer for one cue | `asr.Recognize` |
| `trim` | strips leading and trailing space | `fileasr.go:50` |
| segments | the cues sent back to the command | `fileasr.go:53-55` |

### Plugging in the stage's numbers

| Cue | Time | Model answer | Sent back? |
|---|---|---|---|
| 1 | 0.00–3.35 s | `Good morning.` | yes |
| 2 | 3.40–7.85 s | `See you at noon.` | yes |
| empty | — | `""` | no |

`fileasr.Run` calls `rec` once per `Utterance`, and `strings.TrimSpace` plus `continue` drops an empty answer (`fileasr.go:44-56`). It processes cues in cutter order, so replies come back in recording order; because the transfer is concurrent, cue 1's reply can arrive while cue 2's PCM is still uploading (Step 3).

### Next

Each cue now has its text and times. The command turns them into a file. Step 8 covers SRT and TXT.

## Step 8 · Write SRT or TXT

> **In one line:** The same cues can be numbered SRT with start and end times, or TXT with one line per cue; the command writes the file only after the last cue.

### On the stage

- The blue box on the left is SRT: each cue has a number, an `HH:MM:SS,mmm` start and end, and its text.
- The orange box on the right is TXT: only the text, one line per cue.
- The note below says the file is written after the last cue; without `-o`, the text prints in the terminal and progress prints separately.

### The two formats

The loop in `Write` is at `Voxt/internal/fileasr/fileasr.go:84-99`:

- `FormatText`: `fmt.Fprintln(&b, text)`, one line per cue.
- `FormatSRT`: `fmt.Fprintf(&b, "%d\n%s --> %s\n%s\n", i+1, srtTime(s.Start), srtTime(s.End), text)`.
- SRT writes one extra blank line between cue 1 and cue 2 (the `\n` when `i > 0`).

$$ \text{srtTime}(d) = \text{HH}:\text{MM}:\text{SS},\text{mmm} $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $d$ | a `time.Duration` | `Segment.Start` / `End` |
| `HH` | hours | `d / 3,600,000 ms` |
| `MM` | minutes | `d / 60,000 ms mod 60` |
| `SS` | seconds | `d / 1,000 ms mod 60` |
| `mmm` | milliseconds | `d mod 1,000 ms` |

`srtTime` clamps a negative value to 0 (`fileasr.go:102-104`).

### Plugging in the stage's numbers

| Cue | Start | End | Text |
|---|---|---|---|
| 1 | `00:00:00,000` | `00:00:03,350` | `Good morning.` |
| 2 | `00:00:03,400` | `00:00:07,850` | `See you at noon.` |

TXT has two lines: `Good morning.` and `See you at noon.`.

### Why a failed run has no partial file

The command builds the whole result in an in-memory `bytes.Buffer` and calls `os.WriteFile` only after everything succeeds (`Voxt/transcribe_cli.go:91-101`). If recognition fails midway, `err != nil` and the function returns early, so the buffer never reaches disk. With `-o -` or no `-o`, it writes the buffer to standard output and creates no file.

### Next

The output is done. Step 9 looks at what this route leaves on the Mac.

## Step 9 · No history, no recording

> **In one line:** The file route writes no history entry and keeps no recording; it writes one log line without text, and the audio goes to the on-device or remote model chosen for Transcribe.

### On the stage

- The left panel "NOT WRITTEN" lists three things: a history row, a recording, and the text in the log.
- The right panel "WRITTEN" is one log line: length and cue count, no text.
- The two boxes below are where the audio goes: the on-device speech model, or the remote speech service set for Transcribe.
- The last line asks: how do model files and app updates reach this Mac?

### How the code keeps it clean

`fileRecognizer` calls `asr.Recognize` directly (`transcribe_socket.go:84-87`); it never calls the session's `keep()`, so it writes no `store.Entry` and no WAV. The completion hook builds one `core.LogEntry`:

```go
Message: fmt.Sprintf("transcribed a file for the command line: %s of audio, %d segments", ...)
```

(`transcribe_socket.go:90-98`). That message contains no recognized text.

$$ \text{log} = \{\text{audio length},\ \text{segment count},\ \text{error?}\} $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| audio length | the duration computed from the PCM bytes | `req.Bytes/2/16000`, `socket.go:53-55` |
| segment count | the cues sent back to the command | `fileasr.go:53-55` |
| error | the failure text when there is one | `transcribe_socket.go:95-97` |

### Where the audio goes

`fileRecognizer` reads the Transcribe feature model (`transcribe_socket.go:64-67`) and gets that model's provider with `a.local.ASR(ctx, p.id)` (`transcribe_socket.go:80`). The model can be installed on this Mac or configured as a remote service. The Privacy section of `docs/transcribe.md` says the audio goes where Transcribe's audio goes, the on-device model or the remote service, and Voxt keeps nothing of it.

| Question | Answer | Source |
|---|---|---|
| Does it write history? | No | `transcribe_socket.go:84-87` recognizes directly, no `keep()` |
| Does it keep a recording? | No | same; `docs/transcribe.md` |
| Does the log hold text? | No | `transcribe_socket.go:90-98` |
| Where does the audio go? | the model chosen for Transcribe | `transcribe_socket.go:64-80` |

### The next question

The file route works, but it depends on an installed speech model and a running Voxt. How model files and app updates themselves reach this Mac is the next chapter's question.
