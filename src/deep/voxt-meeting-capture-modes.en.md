## Step 1 · Three modes, three track sets

> **In one line:** The capture mode decides how many tracks a meeting records: a full meeting records the microphone and the system audio, subtitles records only the system audio, and recording records only the microphone; one hour of a full meeting writes 230.4 MB.

### On the stage

- The dashed strip at the top is the question Ch. 11 Step 6 left open: "microphone ? · system audio ?". This step answers it.
- Three cards fill in one by one: **FULL MEETING** (the default) → a mic chip and a system-audio chip, 2 tracks; **SUBTITLES** → system audio only, 1 track; **RECORDING** → mic only, 1 track.
- Legend: blue is the microphone track, amber the system-audio track, for the whole chapter.
- Two formulas at the bottom: one track-hour is 115.2 MB; a full-meeting hour is 2 × 115.2 MB = 230.4 MB.

### Formula

$$ \text{one track-hour} = 32{,}000\ \text{B/s} \times 3{,}600\ \text{s}, \qquad \text{full-meeting hour} = 2 \times \text{one track-hour} $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| 32,000 B/s | one track's byte rate, 16,000 Hz × 2 B | 32,000 B | Ch. 3 Step 2's PCM16 format; `asr/asr.go:31-32` |
| 3,600 s | one hour | 3,600 | this step |
| 2 | a full meeting's track count | 2 tracks | `mode.go:6-16` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| one track-hour | $32{,}000 \times 3{,}600$ | 115,200,000 B = 115.2 MB |
| full-meeting hour | $2 \times 115.2$ MB | 230.4 MB |

### The modes are the three Settings options

The three names are exactly the "Capture mode" options in Settings: "Full meeting (microphone and system audio)", "Subtitles (system audio only)", "Recording (microphone only)" (`settings_meeting_view_state.go:42-46`). An unset mode is a full meeting (`types.go:18-24`, `manager.go:76-78`). The mode-to-tracks mapping lives in one place, `Sources()`: subtitles `[system]`, recording `[mic]`, default `[mic, system]` (`mode.go:6-16`). A "track" in this chapter is one independent sound stream, one file each (Step 3). The 115.2 MB is the same one-hour size as Ch. 10 Step 1's meeting.

### Next

Step 2 shows where each track's sound comes from.

## Step 2 · Two sounds, two paths

> **In one line:** The microphone track rides `capture.start`, the same helper path as dictation; the system track rides `capture.system`, which mixes the sound the Mac plays into one mono stream.

### On the stage

- Left blue box: **MICROPHONE**, your voice; its permission gate appeared in Chapter 2.
- Right amber box: **THE MAC PLAYS**, the sound of a call or a video from other apps.
- The **HELPER** sits in the middle (Chapter 2).
- A blue arrow `capture.start` runs from the microphone into the helper; an amber arrow `capture.system` runs from the Mac's output into the helper. Each lands on its own track: mic track, system-audio track.
- Two lines: `capture.system` mixes every other app's sound into one mono stream; you still hear it, and the helper holds a private copy.

### One capture method, two switches

Both tracks are `session.HelperAudio`; the system one just carries `Method: proto.MethodCaptureSystem` (`meeting_link.go:43-46`). `capture.system` taps the default output through a Core Audio process tap: every process but the helper and its parent feeds one mono mixdown; the user hears the sound as usual, and the copy inside the tap is private to the helper (`docs/helper-protocol.md:111`). `capture.started` is sent only after the tap starts, so a quiet output can still start a meeting. Only one capture of each kind runs at a time (`docs/helper-protocol.md:34`). `capture.start` is the microphone path dictation used in Chapters 2 and 3.

### Next

Step 3 shows where on disk these sounds land.

## Step 3 · One folder, two files

> **In one line:** Start first checks "one meeting at a time" and "at least 1.5 GiB free", then creates `meetings/<id>/` and writes one WAV per track, each growing 32,000 bytes a second.

### On the stage

- Two check cards: **one meeting at a time** (a second Start is refused); **at least 1.5 GiB free** (less, and the meeting does not start).
- Inside the folder `meetings/<id>/`, two files: `mic.wav` (blue) and `system.wav` (amber), both 16 kHz mono PCM16; the small squares are arriving audio frames, each file marked `+32,000 B/s`.
- Two lines: each file starts with a 44-byte header whose lengths are written when the file closes; below 0.9 GiB free, recording stops itself.
- The formula at the bottom: 1 s × 32,000 B/s = 32,000 B per track.

### Formula

$$ \text{WAV bytes}(t) = 44 + 32{,}000 \times t $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t$ | recording time | seconds | this step |
| 44 | the WAV header's size | 44 B | `archive.go:75-90` |
| 32,000 | one track's bytes per second | 32,000 B/s | Step 1 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| 1 second | $44 + 32{,}000 \times 1$ | 32,044 B |
| one hour | $44 + 32{,}000 \times 3{,}600$ | 115,200,044 B ≈ 115.2 MB (Step 1) |

### The checks all live in Start

A second concurrent meeting gets `ErrBusy` (`manager.go:86-89`); the disk floor is 1.5 GiB (`manager.go:79-84`, `disk.go:5-9`). The folder is created under the app's data folder in `meetings/` (`manager.go:117-131`, `meeting_link.go:37-38`), with one track per source (`manager.go:155-159`). The archive names each file `<source>.wav` (`archive.go:26-28`), writes a placeholder header first, and patches its lengths when the file closes (`archive.go:92-103`). Every PCM chunk goes to both `archive.Write` and the track's recognizer (`track.go:62-74`), so the WAV holds the same sound the model hears. A watcher checks free space every 2 seconds and interrupts the meeting below 0.9 GiB (`disk_watch.go:8-30`, `disk.go:5-9`).

### Next

The system track has one more gate inside Start; Step 4 draws both outcomes.

## Step 4 · The system-audio gate

> **In one line:** macOS asks for System Audio Recording the first time a system tap starts; allow it and both tracks record, fail the tap and the meeting does not begin.

### On the stage

- The red dashed strip at the top is macOS asking "record the Mac's sound?", only the first time a system tap starts.
- Left panel **ALLOW**: the system tap runs, chips mic ✓ and system ✓, and the result reads "the meeting records".
- Right panel **CANNOT START**: the tap fails to start, Start fails with no folder and no files, and the result reads "no meeting".
- Two lines: the microphone has its own permission (Ch. 2 Step 3) and this gate is only for the Mac's sound; either track failing to start stops the whole meeting.
- A footnote: how a refusal reaches the app has not been observed on a real Mac.

### Why both panels are real

macOS asks the first time a tap starts (`docs/helper-protocol.md:111`). When the tap cannot be built, the capture start fails and the track returns a `StartError` (`types.go:156-168`, `track.go:22-28`); in `startTracks` any failing track stops the others and Start fails as a whole (`manager.go:175-183`), and the failure path removes the folder and the meeting row it just made (`manager.go:118-130`). The documentation also says the exact refusal status has not been observed on a real Mac, so this chapter says only "a tap that cannot start fails Start" and does not guess an error class (`docs/helper-protocol.md:111`).

### Next

A chosen mode can still change mid-meeting; Step 5 shows what each track does then.

## Step 5 · Switching modes mid-meeting

> **In one line:** Switching from full meeting to subtitles stops the microphone track and leaves a gap; the system track never drops a frame. Switching back restarts the microphone first, and only then does the mode flip.

### On the stage

- The mode pill at the top flips FULL MEETING → SUBTITLES → FULL MEETING; the two dashed lines t1 and t2 are the two switches.
- The mic row: 6 blue frames before t1, 4 grey dashed frames between t1 and t2 (a gap: nothing recorded), 4 blue frames after t2.
- The system row: 14 amber frames in one unbroken run, labeled "no gap".
- Two lines: new tracks start before old ones stop; a new track that cannot start leaves the meeting in its old mode.

### Formula

$$ \text{mic} = [t_0, t_1)\ \text{on} + [t_1, t_2)\ \text{off} + [t_2, t_3)\ \text{on}, \qquad \text{system} = [t_0, t_3)\ \text{continuous} $$

| Symbol | What it is | From |
|---|---|---|
| $t_0$ | the meeting starts | this step |
| $t_1$ | the switch to subtitles | this step |
| $t_2$ | the switch back to full meeting | this step |
| $t_3$ | the meeting ends | this step |

### SetMode fixes the order

`SetMode` computes the difference between the two modes' sources: tracks both modes record keep running, the new mode's extra tracks start first, and only after they all start do the old mode's own tracks stop (`manager_mode.go:36-41`, `71-73`). So the system track has no time break, while mic.wav simply has no content for t1–t2. If a new track cannot start, the added tracks are dropped and the meeting keeps recording in its old mode (`manager_mode.go:38-44`). Switching while paused starts no tracks; resume then starts the new mode's set (`manager_mode.go:24-31`), a branch this step does not draw.

### Next

Whether the written WAVs stay, and for how long, is Step 6.

## Step 6 · Record first, decide at the end

> **In one line:** The WAVs are always written first. A normally ended meeting with keep-audio off deletes them right away; recording mode always keeps them; a failed or interrupted meeting keeps them 7 days, and the hourly sweep deletes them then.

### On the stage

- The condition sits in the subtitle: here "keep audio" is off (the default).
- Three cards: **FULL MEETING · ended normally** → the folder is deleted right away, 0 B kept; **RECORDING MODE · ended** → mic.wav is kept; **FAILED OR INTERRUPTED** → kept 7 days = 168 h, then the hourly sweep deletes it (the same sweep as Ch. 9 Step 5).
- The formula at the bottom: 7 days × 24 h = 168 h · sweep every 1 h.
- One line: with keep audio on, a finished meeting's WAVs stay too.

### Formula

$$ \text{AudioUntil} = t_{\text{end}} + 7 \times 24\ \text{h} $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{end}}$ | when the meeting failed or was interrupted | — | this step |
| 7 × 24 h | a failed meeting's audio retention | 168 h | `finalize.go:474` |
| 1 h | the sweep's period | 1 h | `history_retry.go:89` |

### Writing and keeping are two decisions

When a meeting finishes, its folder stays only if `Privacy.KeepAudio` is on or the mode itself keeps audio; otherwise it is deleted right away (`finalize.go:480-497`), and recording is the only mode that keeps audio (`mode.go:22-23`). A failed or interrupted meeting with keep-audio off gets `AudioUntil = now + 7 days` (`finalize.go:467-478`); the sweep runs once an hour, deletes every due meeting recording, and clears its fields (`meeting_audio.go:44-58`). That sweep is the same `recordingSweep = time.Hour` as Ch. 9 Step 5's retry recordings (`meeting_audio.go:17-19`, `history_retry.go:89`). Keep-audio defaults to off (`settings/settings.go:104-107`; Ch. 9's 7-day retry recordings come from the same default).

### Next

Step 7 shows who each track's words belong to.

## Step 7 · The track already knows who spoke

> **In one line:** The microphone track is all you, so every line is labeled me; the system track mixes several voices, so the after-meeting pass splits it into Speaker 1 and Speaker 2; only the full meeting has both tracks, so only it gets speaker labels.

### On the stage

- Left blue panel **MIC TRACK**: three lines, each carrying a me tag; below, "the whole track is you — every line: me, no model".
- Right amber panel **SYSTEM TRACK**: three lines first carry "?", and the after-meeting pass turns them into Speaker 1, Speaker 2, Speaker 1; below, "several voices in one track — the after-meeting pass splits it".
- One line in the middle: speaker labels need the MOSS-Transcribe-Diarize model.
- The mode map at the bottom: **FULL MEETING** → mic = me, system = split, a labeled transcript ✓; **SUBTITLES** → no mic track, no me to set apart; **RECORDING** → no system track, nothing to split.
- The closing line: live words now, final words after the meeting.

### Me is free; splitting takes a model

Every mic segment is stamped `Speaker = "me"` the moment it is produced, with no model involved (`track_transcribe.go:145`, `195`). `Diarize()` is true only in full meeting mode (`mode.go:19-20`), and the after-meeting pass calls the diarizer on the system track only (`finalize.go:51-57`, `147-152`); the README names the labels Speaker 1–4 with MOSS-Transcribe-Diarize installed, while your side stays Me (`README.md:64`). The code itself sets no hard cap on the speaker count. The same pass re-reads both WAVs with file-mode recognition and replaces what the live pass wrote (`finalize.go:30-46`). Speech from the speakers also reaches the microphone, and the after-meeting pass drops the mic lines that repeat the system track (`finalize.go:77-80`); that deduplication belongs to the after-meeting pass, and this chapter only marks that it exists.

### Next

The chapter ends here: each sound lands in its own track and file, and every line already knows who said it.
