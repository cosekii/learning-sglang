## Step 1 · One meeting, read twice

> **In one line:** While a meeting records, each track's live pass puts words on screen as you talk; after it ends, the final pass re-reads both WAVs and writes the transcript that stays.

### On the stage

- The dashed strip at the top is the question Ch. 12 Step 7 closed with: "live words ? · the final transcript ?". This step answers it.
- The grey bar is one recording meeting with its two files from Ch. 12: `mic.wav` (blue) and `system.wav` (amber).
- Two panels fill in: **LIVE PASS · WHILE RECORDING** — words on screen as you talk, Chapter 4's streaming route; **FINAL PASS · AFTER THE END** — both WAVs re-read from the files, the whole file, no hurry, Chapter 4's file route.
- Two lines: live answers now, the final pass writes the transcript that stays; the chapter's order is live (Step 2), then the final pass's replace, failure and echo (Steps 3–6).

### Why two passes at all

The live pass cannot wait: its words should land while the sentence is still being said, so it uses a streaming model that answers on partial sound (Ch. 4 Step 5). That speed is exactly why a second read helps: after the meeting, the whole WAV is on disk (Ch. 12 Step 3), and a file-mode read can hear each sentence with its full context. Every PCM chunk already went to both the archive and the recognizer during recording (`track.go:62-74`), so the two passes read the same sound. While a meeting records, each track runs its live recognition (`track_transcribe.go:52-72`, `101-113`); when it ends, `FinalizePass` re-reads the archived WAVs and replaces the live segments (`finalize.go:28-46`).

### Next

Step 2 zooms into the live pass: how one line rewrites itself and then commits.

## Step 2 · The live line: rewrite, then commit

> **In one line:** The streaming model's working line rewrites itself as you speak; 0.75 s of quiet commits it into the stored list with its timestamps, and one line never exceeds 8 s.

### On the stage

- Blue squares at the top: PCM frames arriving (Ch. 3).
- The dashed blue box is the **WORKING LINE**: empty at first ("listening"), then the partial grows — "the next" → "the next release" → "the next release is Friday".
- The amber **quiet 0.75 s** tag appears; the line moves into the solid **STORED** box as `00:02–00:05 · the next release is Friday`, and the working line starts empty again.
- The formula: quiet 0.75 s → commit · one line is cut at 8 s at most.
- A footnote: a live stream also restarts after 10 min, or 30 s without updates.

### Formula

$$ \text{commit when}\ \text{silence} \ge 0.75\ \text{s} \quad (\ge 0.3\ \text{s once the phrase passes}\ 4\ \text{s}), \qquad \text{segment} \le 8\ \text{s} $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| silence | quiet since the last sound | seconds | the track's speech detector |
| 0.75 s | the pause that commits a phrase | 750 ms | `committer.go:11` |
| 4 s | a long phrase, which commits at a shorter 0.3 s pause | 4 s | `committer.go:13` |
| 8 s | the longest one live segment runs | 8 s | `committer.go:15` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| commit pause | $750\ \text{ms} \div 1000$ | 0.75 s |
| longest segment | given | 8 s |

### Committer turns partials into sentences

The streaming model sends a cumulative hypothesis that keeps rewriting itself; the `Committer` keeps the uncommitted tail as the working line (`committer.go:28-38`, `91-107`). `Tick` commits the tail at a 750 ms pause, at a 300 ms pause once the phrase passes 4 s, or when the phrase hits 8 s — mid-sentence commits drop the model's full stop (`committer.go:40-66`, `10-15`). Each committed segment carries its start and end on the meeting timeline and is stored right away (`track_transcribe.go:141-149`, `221-267`). A stream rotates at 10 minutes of age or after 30 s without partials, reopening with the language the last Final heard (`live.go:12-13`, `105`, `150-169`, `194-206`); rotation is a reliability detail this step only footnotes. The live text on screen is the overlay the working line feeds (`track_transcribe.go:106-108`, `209-220`).

### Next

The meeting ends; Step 3 runs the final pass over both WAVs.

## Step 3 · The final pass, one track at a time

> **In one line:** After the meeting ends, the final pass reads `mic.wav`, then `system.wav`: read the file, find speech, cut chunks, transcribe each chunk in file mode; progress is done tracks ÷ 2.

### On the stage

- The pill at the top starts at "the meeting has ended", then walks "FINAL PASS · track 1 of 2" and "track 2 of 2".
- **mic.wav** (blue) gets its three chunk boxes first, with its recipe: read → find speech → chunks → transcribe. **system.wav** (amber) follows, same recipe.
- Two lines: both tracks re-read, the same sound by a second reader; the live lines stay on screen the whole time.
- The formula: progress = tracks done ÷ 2.

### Formula

$$ \text{progress} = \frac{i + p}{2}, \quad i = \text{tracks already done},\ p = \text{this track's own progress} $$

| Symbol | What it is | From |
|---|---|---|
| $i$ | tracks already finished (0, then 1) | `finalize.go:50-62` |
| $p$ | the current track's chunk progress, 0 → 1 | `finalize.go:58-61` |
| 2 | a full meeting's track count | `mode.go:6-16` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| start of track 1 | $(0 + 0) \div 2$ | 0 |
| start of track 2 | $(1 + 0) \div 2$ | 0.5 |
| all done | $(1 + 1) \div 2$ | 1 |

### One track at a time, in the mode's order

`FinalizePass` walks the mode's sources — mic, then system for a full meeting — and reports progress as `base + p/trackN` (`finalize.go:47-76`). Each track reads its WAV, finds speech regions, plans chunks and transcribes them in file mode (`finalize.go:113-168`). A track with no file or no audio returns "nothing to replace" (`finalize.go:115-131`); a track with audio but no words still replaces — with an empty set (`finalize.go:158`, `168`). The re-read happens because the meeting kept its WAVs, or is still holding them until the pass decides (Ch. 12 Step 6).

### Next

Step 4 shows what a successfully re-read track does to its live lines.

## Step 4 · Replace, not append

> **In one line:** A track that re-reads well deletes its stored live lines and inserts the final ones in one transaction — the example goes from four live lines to three final lines, and a track with no words re-read replaces with an empty set too.

### On the stage

- **BEFORE · the store**: the four lines from the live pass — `hi`, `everyone`, `sounds good`, `the next release is Friday` (Step 2's commit rule split "hi" and "everyone" at your pause).
- The **REPLACE** arrow: delete these, insert the re-read.
- **AFTER · the store**: the three final lines — the file read hears "hi everyone" as one sentence.
- The count: 4 lines out · 3 lines in. Two lines: live split at your pause, the file read hears them together; a track with no words re-read replaces with an empty set too.

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| lines deleted | given on stage | 4 (live) |
| lines inserted | given on stage | 3 (final) |

The counts differ because the two passes segment differently (Step 2's pause rule against whole speech regions), not because lines were lost: replace is delete-then-insert, and any count is a valid result.

### One transaction per track

`ReplaceSegments` deletes every stored line of that meeting and source, then inserts the new set, in one transaction (`sqlitestore/meetings.go:165-194`). The replacement rows are marked `Final: true`, and the mic ones keep their `me` speaker (`finalize.go:396-406`). The new set is whatever the re-read heard — including nothing, so a silent track's live text still goes (`finalize.go:168`). Only tracks that finished the pass reach this point; Step 5 covers a track that did not.

### Next

Step 5 shows the failure path: a track whose re-read stops mid-way.

## Step 5 · A failed re-read keeps the live lines

> **In one line:** If a track's re-read fails mid-track, the pass stops for that track, its live lines stay in the store, the meeting is marked interrupted, and the recording waits seven days for a reprocess; a meeting that kept no recording cannot be reprocessed.

### On the stage

- **THE STORE** already holds the mic track's final lines ✓ — the mic was track 1 of 2 (Step 3) and was replaced first.
- **SYSTEM TRACK · re-reading**: chunk 1 ✓, chunk 2 ✗ in red, chunk 3 greyed as "never ran"; the pass stops mid-track.
- The meeting pill turns red: **INTERRUPTED**.
- Lines: the mic track was replaced first, so it keeps its final lines; the failed track keeps its live lines — nothing is lost; the recording waits 7 days for a reprocess (Ch. 12 Step 6's clock); no recording kept → no reprocess, the transcript stays.

### Failure skips the track, keeps the live text

Inside the pass, a failing track is skipped — its error is remembered and the loop continues, so other tracks still replace (`finalize.go:60-67`). Because the failed track never reaches `ReplaceSegments`, its live lines stay exactly as they were; the first error then marks the meeting interrupted and, with keep-audio off, sets the recording's deadline to now + 7 days (`finalize.go:92-104`, `467-478`), the same clock and hourly sweep as Ch. 12 Step 6. `ErrFinalizeRetry` names this state: the final pass stopped mid-track, live segments stay (`finalize.go:24-25`). `Reprocess` reruns the whole pass on the kept recording (`manager_finalize.go:15-53`); a done meeting that kept no recording returns `ErrNoRecording` and its transcript stays as it is (`manager_finalize.go:11-12`, `26`).

### Next

One more cleanup belongs to both passes: the microphone also heard the speakers. Step 6 drops those echo lines.

## Step 6 · The mic heard the speakers too

> **In one line:** A mic line that shares 3-word runs with the system speech within ±2 s, over at least half its words, is an echo: the whole line is dropped, never rewritten — checked live, and again after the final pass.

### On the stage

- **SYSTEM TRACK** (amber): `00:20–00:25 · we should ship Friday`, with its ±2 s window.
- **MIC TRACK** (blue): `00:14 · sounds good` and `00:21 · we should ship Friday` — the speakers' words, picked up by your microphone.
- The shared 3-word runs are marked: "we should ship" and "should ship Friday"; the count reads 4 of 4 words ≥ 50% → **ECHO · dropped whole**, the mic copy struck through.
- Lines: the check is 3 words in a row, over half the line, within ±2 s; `sounds good` shares no run, so it stays, and a dropped line is never rewritten; the check runs live (an echo never lands) and again after the final pass.
- The closing line: the words are final — but which system lines are Speaker 1, which Speaker 2?

### Formula

$$ \text{echo}(m) \iff \frac{\#\{\text{words of } m \text{ in shared 3-word runs}\}}{\#\text{words}(m)} \ge \tfrac{1}{2}, \qquad \text{system speech within} \pm 2\ \text{s} $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| 3-word run | consecutive words shared with the system text | 3 words | `echo.go:18` |
| ½ | the share of the line that must be in such runs | 0.5 | `echo.go:23` |
| ±2 s | how far around the mic line to gather system text | 2 s | `echo.go:15` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| mic echo line | "we should ship Friday" | 4 words |
| shared runs | "we should ship", "should ship Friday" | 4 of 4 words |
| verdict | $4 \ge 0.5 \times 4$ | echo → dropped |
| sounds good | 2 words, no shared run | $0 < 0.5 \times 2$ → stays |

### The check runs twice

Speech from the speakers reaches the microphone, so the mic track can hold the other side's words (#3982). `isEcho` splits both texts into words, collects the system side's 3-word runs within ±2 s, and calls the mic line an echo when at least half its words sit in shared runs (`echo.go:15-46`, `84-93`). Lines shorter than 3 words are never called echoes (`echo.go:30-32`). Live, a mic echo is never committed — checked against what the system track has said so far, including its working line (`track_transcribe.go:235-241`). After the final pass, the two final texts are compared and whole mic lines are dropped (`finalize.go:77-81`, `echo.go:96-102`). The check only ever drops whole lines; it never edits a line's words. In the 20-minute call of #3982, 180 of 274 mic lines reached the threshold against their own time's system speech, and 0–8 against system speech moved one to three minutes away (`echo.go:19-22`).

### Next

The transcript's words are final. What it still does not say is who said each system line — Chapter 14 attaches Speaker 1 / Speaker 2 to the finished transcript.
