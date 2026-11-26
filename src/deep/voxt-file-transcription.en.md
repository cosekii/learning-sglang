## Step 1 · Two routes

> **In one line:** A dictation puts text at the cursor; a file transcription writes SRT or TXT. Both use Voxt and a speech model, but the file route does not open a dictation session.

### On the stage

- The left column is **dictation**: the microphone and helper send sound, one dictation session handles it, and the result appears at the cursor and may also be written to history.
- The right column is **file**: `meeting.m4a` on disk goes through `Voxt transcribe` and becomes `meeting.srt` or `talk.txt`.
- The two lines at the bottom name the shared parts and the difference: Voxt and a speech model are shared; the dictation session is not.

### What each route does

| Route | Input | Middle | Output |
|---|---|---|---|
| Dictation | 16 kHz mono frames from the microphone (Ch. 3) | one dictation session | text at the cursor, maybe history |
| File | an audio or video file on disk | none | an SRT or TXT file |

`runTranscribeCLI` passes the command's arguments, standard output, standard error, the socket path and a decode function to `transcribeCLI` (`Voxt/transcribe_cli.go:35-39`). The command itself does no dictation and touches no history. On the app side, `fileRecognizer` calls `asr.Recognize` directly (`Voxt/transcribe_socket.go:84-87`); it does not go through the session's cleanup, delivery or history writing.

### Why this route gets its own picture

Chapter 9 ends with the question: besides speaking live, how does an existing audio file become subtitles or text? The file route answers it, but its output is not text at a cursor, so the dictation picture from Chapter 1 does not fit. The orange path on the stage is the one the rest of the chapter follows.

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

> **In one line:** The command sends one JSON request line and the PCM to the running Voxt through the local `transcribe.sock`; the app answers with one line per cue.

### On the stage

- The orange box on the left is the command: `Voxt transcribe` and the file name.
- The blue pill in the middle is `transcribe.sock`, marked `0600 · local only`.
- On the right is the running Voxt, which picks Transcribe's model.
- The request JSON is below, then 256,000 PCM bytes, then three reply lines.

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

`Segment` times are integer nanoseconds, because Go's `time.Duration` marshals as an integer number of nanoseconds (`Voxt/internal/fileasr/fileasr.go:26-31`). The stage shows the request and abbreviated replies to keep the lines readable; the exact fields are above.

### Where the socket lives, and who can open it

The socket is named `transcribe.sock` and sits in the app's data folder (`socket.go:16-17`). `historyapi.Listen` binds it and chmods it to `0600` (`Voxt/internal/historyapi/server.go:101-114`). It has no network port, and only your account can open it. The command reads none of your folders; it reads only the file you name.

### Plugging in the stage's numbers

| Quantity | Value | Where it comes from |
|---|---|---|
| PCM bytes | 256,000 | Step 2 |
| socket mode | `0600` | `historyapi/server.go:111` |
| request-line cap | 4,096 B | `socket.go:25-29` |
| reply lines | 2 segments + 1 `done` | this step's example |

### Next

After the app has the whole PCM stream, it has to decide where to break it into cues. Step 4 covers pauses.

## Step 4 · A pause ends a cue

> **In one line:** The cutter looks at 10 ms frames, ends a cue after 450 ms of quiet, starts the next cue 300 ms before its speech, and drops a cue with too little speech.

### On the stage

- The two blue rules on top are the time ranges of cue 1 and cue 2: 0.00–3.35 s and 3.40–7.85 s.
- The waveform is blue for speech and grey for quiet.
- The small orange box marks the 450 ms of quiet at the end of cue 1; the small blue box marks the 300 ms that cue 2 starts early.
- The three lines below are the three rules.

### The three rules

The constants are in `Voxt/internal/meeting/cutter.go:9-19`:

| Constant | Value | Job |
|---|---|---|
| `cutterFrame` | 10 ms | how much sound each check sees |
| `cutterSilenceCut` | 450 ms | quiet this long ends a cue |
| `cutterPreRoll` | 300 ms | the next cue keeps this much before its speech |
| `cutterMinUtterance` | 350 ms | a cue with less speech is dropped |

The end condition is `c.silence >= cutterSilenceCut` (`cutter.go:70-74`). `startUtterance` moves the start back 300 ms (`cutter.go:95-105`), so the first consonant is not cut off. A short cue is refused in `finalize` (`cutter.go:119-127`); the caller still clears the buffer, so the short cue does not stay.

$$ \text{cue end} = \text{last speech} + 450\ \text{ms},\qquad \text{cue start} = \text{speech onset} - 300\ \text{ms} $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| last speech | the last voiced frame | this step's 10 ms frames |
| 450 ms | quiet that ends a cue | `cutterSilenceCut` |
| speech onset | the first frame over the energy gate | `cutterSpeechRMS = 800` |
| 300 ms | pre-roll at the start | `cutterPreRoll` |

### Plugging in the stage's numbers

| Quantity | Value | Arithmetic |
|---|---|---|
| cue 1 speech ends | 2.90 s | constructed |
| cue 1 ends | 3.35 s | $2.90 + 0.45$ |
| cue 2 speech starts | 3.70 s | constructed |
| cue 2 starts | 3.40 s | $3.70 - 0.30$ |
| cue 2 speech ends | 7.40 s | constructed |
| cue 2 ends | 7.85 s | $7.40 + 0.45$ |

### Why the quiet at the end stays

The `End` from `finalize` is the frame that triggered the end, and the buffer already holds those 450 ms (`cutter.go:119-127`). This chapter does not remove them; the model usually ignores trailing silence. The SRT times on the stage use that `End`.

### Next

If someone keeps talking, the 450 ms rule never fires. Step 5 covers the 7-second cap.

## Step 5 · The 7-second cap

> **In one line:** When a cue reaches 7 s without a long pause, the cutter cuts inside the quietest 100 ms of the last second, and the rest continues as the next cue.

### On the stage

- The two blue rules are piece 1, 0–6.5 s, and piece 2, 6.5–9 s.
- The whole waveform is blue, meaning no 450 ms pause.
- The orange box and dashed line mark the 6.0–7.0 s search range; the cut is at 6.5 s.
- The three lines below say: 7 s arrived without a pause, cut inside the quietest 100 ms, the rest becomes the next cue.

### Trigger and cut point

When `end - c.utterStart >= cutterMaxSegment` and the 450 ms rule did not fire, `pushFrame` calls `cutAtQuietest` (`cutter.go:75-78`). `cutterMaxSegment` is 7 seconds. `cutAtQuietest` searches `cutterQuietSearch = 1 s` with a `cutterQuietWindow = 100 ms` window (`cutter.go:16-17`, `cutter.go:130-147`).

$$ \text{search} = [\,7 - 1,\ 7\,]\ \text{s},\qquad \text{cut} = \arg\min_{w \subset \text{search}} \mathrm{RMS}(w) $$

| Symbol | What it is | Where it comes from |
|---|---|---|
| 7 s | the length cap of one cue | `cutterMaxSegment` |
| search | the last second | `cutterQuietSearch` |
| $w$ | a 100 ms window | `cutterQuietWindow` |
| RMS | sound energy inside the window | `frameRMS`, `cutter.go:165` |

### Plugging in the stage's numbers

| Quantity | Value | Where it comes from |
|---|---|---|
| continuous speech | 9 s | constructed |
| piece 1 | 0–6.5 s | constructed cut |
| piece 2 | 6.5–9 s | $9 - 6.5$ |
| search range | 6.0–7.0 s | $7 - 1$ to $7$ |

The cut is not fixed at 6.5 s. The 6.5 in this step is a constructed example; the real cut follows whichever 100 ms window is quietest in the last second. `cutAtQuietest` keeps the sound after the cut in `c.buf` and sets `utterStart` to the cut, so the rest forms the next cue (`cutter.go:135-146`).

### Next

With the cues cut, the app sends each one to the model. Step 6 covers recognition.

## Step 6 · Recognize one cue at a time

> **In one line:** Voxt recognizes each cue with the speech model chosen for Transcribe, returns the cues in order, and drops a cue whose text is empty.

### On the stage

- The wide blue box on top is Transcribe's speech model, with a note that it is chosen in Settings → Speech models.
- Two rows follow: the orange box on the left is a cue's time range, and the arrow points to the text in the blue box on the right.
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
| cues | the cues handed out by the cutter | Steps 4–5 |
| `text` | the model's answer for one cue | `asr.Recognize` |
| `trim` | strips leading and trailing space | `fileasr.go:50` |
| segments | the cues sent back to the command | `fileasr.go:53-55` |

### Plugging in the stage's numbers

| Cue | Time | Model answer | Sent back? |
|---|---|---|---|
| 1 | 0.00–3.35 s | `Good morning.` | yes |
| 2 | 3.40–7.85 s | `See you at noon.` | yes |
| empty | — | `""` | no |

`fileasr.Run` calls `rec` once per `Utterance`, and `strings.TrimSpace` plus `continue` drops an empty answer (`fileasr.go:44-56`). It processes cues in cutter order, so the replies come back in recording order.

### Next

Each cue now has its text and times. The command turns them into a file. Step 7 covers SRT and TXT.

## Step 7 · Write SRT or TXT

> **In one line:** The same cues can be numbered SRT with start and end times, or TXT with one line per cue; the command writes the file only after the last cue.

### On the stage

- The blue box on the left is SRT: each cue has a number, an `HH:MM:SS,mmm` start and end, and its text.
- The orange box on the right is TXT: only the text, one line per cue.
- The note below says the file is written after the last cue; without `-o`, or with `-o -`, the result goes to stdout and progress goes to stderr.

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

The command builds the whole result in an in-memory `bytes.Buffer` and calls `os.WriteFile` only after everything succeeds (`Voxt/transcribe_cli.go:91-101`). If recognition fails midway, `err != nil` and the function returns early, so the buffer never reaches disk. With `-o -` or no `-o`, it writes the buffer to stdout and creates no file.

### Next

The output is done. Step 8 looks at what this route leaves on the Mac.

## Step 8 · No history, no recording

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
| audio length | the duration computed from the PCM bytes | `req.Bytes/2/16000` in `socket.go:53-55` |
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
