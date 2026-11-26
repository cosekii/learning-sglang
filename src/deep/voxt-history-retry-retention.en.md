## Step 1 · One dictation leaves one row

> **In one line:** A finished dictation writes one history row with its kind, app and final text, and it may also keep a recording of the voice.

### On the stage

- The wide blue box is one **history row**: `kind = transcribe`, `app = Mail`, `text = "send it to Priya."`.
- The orange field `audio.wav` is the recording; it is there only when you keep recordings, or when recognition failed or the user cancelled.
- The lower line is a constructed example: ten dictations a day for 90 days make 900 rows.
- The dashed box says the chapter has not added a clock yet; both the row and the recording stay.

### What is inside a row

`store.Entry` is one finished session; the struct starts at `Voxt/internal/store/store.go:69`. The fields this chapter needs:

| Field | Meaning | Source |
|---|---|---|
| `Kind` | `transcribe`, `translate` or `rewrite` | `store.go:71` |
| `CreatedAt` | the shortcut time; `keep()` copies `s.StartedAt` into it | `store.go:72`, `run.go:512` |
| `Status` | `done`, `failed` or `cancelled` | `store.go:73` |
| `RawText`, `Result` | what recognition heard, what was delivered | `store.go:90`, `store.go:94` |
| `Audio` | the recording's file name in the history's audio folder; `""` for none | `store.go:133` |
| `AudioUntil` | for a recording kept only for a retry, the time it goes | `store.go:138` |

`session/run.go`'s `keep()` writes the row only when history is on (`inHistory`, `run.go:572`). It writes the WAV when `KeepAudio` is on, or when the recognition failed or the session was cancelled (`keepsRecording`, `run.go:583`).

$$ \text{row} = \{\text{kind},\ \text{app},\ \text{text},\ \text{audio}?\} $$

### Plugging in the stage's numbers

| Symbol | Value on the stage | Where it comes from |
|---|---|---|
| dictations a day | 10 | constructed example |
| keep days | 90 | this chapter's default clock, Step 2 |
| rows | $10 \times 90 = 900$ | the stage's own arithmetic |

### Why start here

The row is the thing that has to expire, and its recording is a second thing with its own lifetime. Without a clock, both stay on this Mac for as long as the data folder exists. Step 2 puts the two lifetimes on one picture.

### Next

The row and the recording expire on separate clocks. Step 2 draws both.

## Step 2 · Two clocks

> **In one line:** The history row lasts 90 days by default and its clock starts at the shortcut; a recording kept for a retry lasts 7 days and its clock starts when the retry recording is saved.

### On the stage

- The upper blue bar is the **history row**. Its start is labelled **shortcut**; its end is day 90.
- The lower orange bar is the **retry recording**. Its start is labelled **retry recording saved**, and it is drawn on the same 90-day ruler, so its 7 days look short: $90 - 7 = 83$ days shorter.
- The condition box says when a retry recording exists: recognition failed or the user cancelled, and keep recordings is off.

### The two defaults and their start events

`settings.History.Days()` returns 90 for the default document, where `KeepDays` is 0 or a value outside the choices (`Voxt/internal/settings/history.go:39`). `DefaultKeepDays = 90` (`history.go:28`); the other choices are 365, 180, 90, 30 and 7 days (`history.go:34`).

A recording kept only for a retry gets `AudioUntil = now + Config.AudioRetention`, and `AudioRetention` defaults to `7 * 24h` (`Voxt/internal/session/session.go:355`; applied in `manager.go:133`).

The two clocks do not start at the same event. `keep()` stores `CreatedAt: s.StartedAt` (`Voxt/internal/session/run.go:512`), and `StartedAt` is the shortcut (`session.go:169`). `keep()` writes the WAV and sets `AudioUntil` (`run.go:550-554`); `History.Put` writes the row afterwards (`run.go:561-564`). So the recording clock starts when the retry copy is saved, not when the row is written. The chart draws both bars from the same left edge so their lengths compare; the labels name the different start events.

$$ T_{\text{row}} = 90\ \text{days},\qquad T_{\text{retry}} = 7\ \text{days} = 7 \times 24 = 168\ \text{hours} $$

| Symbol | Meaning | Source |
|---|---|---|
| $T_{\text{row}}$ | how long a row is kept by age | `settings/history.go:28` |
| $T_{\text{retry}}$ | how long a retry-only recording is kept | `session/session.go:355` |
| start of the row clock | `Entry.CreatedAt`, copied from `s.StartedAt` (the shortcut) | `run.go:512`, `session.go:169` |
| start of the recording clock | when the retry recording is saved, before the row is written | `run.go:550-554`, `run.go:561-564` |

### Plugging in the stage's numbers

| Bar | Length on the same ruler | Why |
|---|---|---|
| history row | the full 600 px bar | 90 days |
| retry recording | $600 \times 7 / 90 \approx 47$ px | 7 days |
| difference | $90 - 7 = 83$ days | the two bars' lengths |

### Why the clocks differ

The row is searchable text; the retry copy is a second chance at recognition. The public code sets both defaults but does not state why 90 and 7 days were chosen, so this chapter does not supply that rationale.

### Next

Clock 1 has two rules. Step 3 takes the age rule.

## Step 3 · Clock 1: age

> **In one line:** The automatic clean-up deletes every row older than today minus the keep days, together with its recording.

### On the stage

- The equation reads `today 2026-11-26 − 90 days = cutoff 2026-08-28`.
- The red card is a row from 2026-08-27, 91 days old: it is older than the cutoff, so it goes.
- The blue card is a row from 2026-08-29, 89 days old: it is newer, so it stays.
- The lower line says when the clean-up runs: at start, after each new row, and when the setting changes.

### The cutoff and the delete

`History.Cutoff(now)` returns `now.AddDate(0, 0, -h.Days())`, or the zero time when `CleanupOff` is set (`Voxt/internal/settings/history.go:61`). `pruneWhere` turns that into `created_at < cutoff` (`Voxt/internal/store/sqlitestore/history_retention.go:123`), and `Prune` runs one `DELETE … RETURNING audio` and then removes the files (`history_retention.go:135`).

$$ \text{cutoff} = \text{now} - 90\ \text{days},\qquad \text{delete row} \iff \text{created\_at} < \text{cutoff} $$

| Symbol | Meaning | Source |
|---|---|---|
| `now` | the moment the clean-up runs | `history_settings_ops.go:69` |
| 90 days | `History.Days()` | `settings/history.go:39` |
| `created_at` | the row's `CreatedAt`, the shortcut time | `store.go:72`, `run.go:512` |
| `Prune` | deletes the rows and their audio | `history_retention.go:135` |

### Plugging in the stage's numbers

| Row | Age | Compared with the cutoff | Result |
|---|---|---|---|
| 2026-08-27 | 91 days | older | deleted, with its recording |
| 2026-08-28 | 90 days | at the cutoff | deleted at the next cleanup run |
| 2026-08-29 | 89 days | newer | stays |

The stage uses 91 and 89 so neither card sits exactly on the boundary. The cutoff is a threshold, not a timer: a row past it is deleted at the next cleanup run, which happens at start, after each new row, or when the setting changes (`history_settings_ops.go:8-10`).

### When it runs

`history_settings_ops.go` says the clean-up runs at the start, after each change of the history (a new entry), and when its setting changes (`history_settings_ops.go:7-10`). `pruneHistory` runs one job at a time and once more if asked while it runs (`history_settings_ops.go:69`).

### Boundary

Turning automatic clean-up off (`history.cleanupOff`) makes `Cutoff` return the zero time, so this rule stops. The count rule in Step 4 stops too, because `PerKind` returns 0 when the clean-up is off (`settings/history.go:70`).

### Next

The clean-up can also delete rows that are young but past a count. Step 4 draws that rule.

## Step 4 · Clock 1: count per kind

> **In one line:** The same clean-up keeps at most N rows of each kind, counting transcribe, translate and rewrite separately; zero means no limit.

### On the stage

- The wide bar is the constructed example for `transcribe`: 102 rows in all, drawn to scale. The blue part is the newest 100 rows; the thin red part is the oldest 2.
- The label says `102 − 100 = 2`, and the bar's note says blue is 100/102 and red is 2/102.
- The two lower boxes say `translate` and `rewrite` follow the same rule with their own newest N; they do not share a count.
- The bottom lines give N's choices and say the age and count rules run together.

### How the count is applied

`History.PerKind()` returns `Count()` unless the clean-up is off (`Voxt/internal/settings/history.go:70`). `Count()` returns 0 for a value outside the choices, which means no limit (`history.go:50`). `pruneWhere` adds a window function:

$$ \text{delete row} \iff \text{row} \in \{\, \text{rows with } \mathrm{rank}_{\text{kind}} > N \,\} $$

`ROW_NUMBER() OVER (PARTITION BY kind ORDER BY created_at DESC, id DESC)` numbers each kind's rows newest first; every row with `n > N` is deleted (`history_retention.go:129`).

| Symbol | Meaning | Source |
|---|---|---|
| `kind` | transcribe, translate or rewrite | `store.go:71` |
| $N$ | rows to keep per kind | `settings/history.go:50` |
| `n > N` | rows past the newest N of their kind | `history_retention.go:129` |
| 0 | no limit, the default | `settings/history.go:19` |

### Plugging in the stage's numbers

| Quantity | Value | Where it comes from |
|---|---|---|
| rows of one kind | 102 | constructed example |
| N | 100 | one of the settings choices |
| deleted | $102 - 100 = 2$ | the oldest two of that kind |
| blue share of the bar | $100 / 102 \approx 98\%$ | the stage's scale |
| red share of the bar | $2 / 102 \approx 2\%$ | the stage's scale |

### Both rules, one delete

`pruneWhere` joins the two conditions with `OR` when both are set (`history_retention.go:119-132`). A row goes if it is too old **or** past its kind's count. The clean-up does not need both to fail.

### Boundary

Count is per kind, not across all history. 100 transcribe rows and 100 translate rows can coexist. The default is 0, so a fresh install deletes nothing by count.

### Next

Clock 1 is done. Step 5 takes the shorter clock and the recording it holds.

## Step 5 · Clock 2: the retry recording

> **In one line:** A recording kept for a retry has a 7-day lifetime, is checked by an hourly sweep, and a successful retry deletes it at once.

### On the stage

- The orange card is a failed transcribe row written on 2026-11-26, with `audio.wav`.
- The upper bar is the history row: 90 days. The lower bar is the retry recording: 7 days, with a line at day 7.
- The lower text says the copy is kept even when keep recordings is off, because a retry can still run from it.
- The bottom lines separate two numbers: the retry clock lasts `7 × 24 = 168` hours, and the sweep checks every 1 hour.

### When the copy exists

`keepsRecording` returns true when `KeepAudio` is on, or the recognition failed, or the session was cancelled (`Voxt/internal/session/run.go:583`). When the recording is kept only for a retry, `keep()` sets `AudioUntil = now + cfg.AudioRetention` (`run.go:552`). `KeepAudio` defaults to off, so a failed or cancelled dictation leaves the WAV for 7 days and the row has no permanent audio.

$$ \text{AudioUntil} = t_{\text{fail}} + 7\ \text{days} $$

| Symbol | Meaning | Source |
|---|---|---|
| $t_{\text{fail}}$ | when the retry recording is saved | `run.go:553` |
| `AudioRetention` | 7 days by default | `session/session.go:355` |
| `AudioUntil` | the time the retry copy goes | `store.go:138` |

### The sweep and the guarded delete

`expireRecordings` starts at app launch and calls `History.ExpireAudio` once immediately, then sleeps one hour before each later call, only while the app runs (`Voxt/history_retry.go:89`, `history_retry.go:91-107`). Expiry is not deletion: the recording goes at the first sweep after `AudioUntil`. The query selects rows with `audio != '' AND audio_until > 0 AND audio_until <= now`; each delete is guarded by `WHERE seq = ? AND audio = ? AND audio_until > 0`, so a row retried meanwhile is not cleared (`Voxt/internal/store/sqlitestore/history.go`, `ExpireAudio`). The files are removed after the rows are updated.

### Plugging in the stage's numbers

| Quantity | Value | Where it comes from |
|---|---|---|
| retry lifetime | 7 days = $7 \times 24 = 168$ hours | `DefaultAudioRetention` |
| sweep interval | 1 hour | `recordingSweep` |
| actual number of sweeps | not fixed: one at launch, then one per hour while the app runs | `history_retry.go:91-107` |

### A success deletes it early, recordings on ties it to the row

A successful retry clears `AudioUntil`; when `KeepAudio` is off it also removes the file and sets `Audio = ""` (`Voxt/internal/session/retry.go:82-88`). With `KeepAudio` on, `AudioUntil` was never set, so the recording lives with the row for the row's 90 days.

### Boundary

The retry clock only starts for a failed or cancelled recognition with recordings off. A successful dictation whose recording is off keeps no audio at all. The code defines the 7-day default; it does not record why that value was chosen.

### Next

Step 6 shows what the retry copy is for.

## Step 6 · Retry uses the recording

> **In one line:** Retry recognizes the whole kept recording again, updates the same row without inserting anything, and runs the language-model step only when the feature has one and the early exits do not apply.

### On the stage

- The orange box is the row with `audio.wav`.
- The arrows go through **read the file**, **recognize the whole recording**, and **run the current settings**.
- The blue box at the end says the same row is updated: old text becomes new text.
- The lower lines say nothing is inserted, only rows with a kept recording can retry, and a missing file gives "the recording is gone".

### What Retry reads and writes

`Manager.Retry` reads the entry's WAV (`Voxt/internal/session/retry.go:54`) and rejects a missing recording or a file that is not 16 kHz mono (`retry.go:52`, `retry.go:60`). It recognizes the whole file (`retry.go:157`, `retry.go:175`), then runs the feature's language-model step with the settings as they are now: cleanup for Transcribe, the entry's target for Translate, the entry's selection for Rewrite (`retry.go:38-39`). It writes the same entry back with `History.Put` (`retry.go:93`).

Not every Transcribe retry reaches a language model. After recognition, a whole-text snippet sets `e.Result` to the snippet's configured replacement or expanded text and returns (`retry.go:196-200`). With Transcribe cleanup off or no LLM, it sets `e.Result` to the expanded snippets and returns (`retry.go:201-204`). Otherwise the later cleanup, Translate or Rewrite step can overwrite `e.Result` (`retry.go:210-225`). Translate and Rewrite do need a model.

$$ \text{row}' = \mathrm{retry}(\text{audio.wav},\ \text{settings now}),\qquad \text{row}'.id = \text{row}.id $$

| Symbol | Meaning | Source |
|---|---|---|
| `audio.wav` | the kept recording named in `Entry.Audio` | `store.go:133` |
| settings now | the current cleanup and model choices, when a model is used | `retry.go:37-38`, `retry.go:196-204` |
| same row | the entry's ID is unchanged | `retry.go:93` |
| no insert | Retry never calls the delivery path | `retry.go:38-39` |

### Plugging in the stage's numbers

| Item | Value on the stage | Why |
|---|---|---|
| file format | 16 kHz mono WAV | `retry.go:60` |
| text before | failed, no result | the failed row from Step 5 |
| text after | the recognition result, then a snippet replacement, cleanup, or rewrite/translate output | `retry.go:195-204`, `retry.go:210-225` |
| inserted text | none | `retry.go:38-39` |

### Why it runs beside a session

The Retry comment says it runs beside any live session and never takes the Manager's session, and that it blocks on its own goroutine (`retry.go:43-44`). So a retry does not stop a new dictation, and the new dictation does not overwrite the retried row.

### Boundary

Retry uses the current settings, not the settings from the day of the failure. A row whose recording is gone cannot be retried; the app says "the recording is gone" (`retry.go:52`). A row with no kept recording never had a retry path.

### Next

The row and the recording have their clocks. Step 7 shows what leaves the Mac when a program exports the history.

## Step 7 · Export: what leaves the row

> **In one line:** Export writes only finished rows, oldest first; JSONL carries every exported field, Markdown only time, app and the delivered text; recordings, addresses, errors, internal names and timings never leave.

### On the stage

- The table's rows are the exported fields; the two columns are the two formats.
- JSONL keeps every row of the table; Markdown keeps only `created_at`, `app` and `text`.
- The `*` on `selection` and `typed` means those two appear only when include selected text is on.
- The lower lines list what neither format writes: the recording, the web address, errors and internal names, and timings. Finished rows only; failed and cancelled rows stay out.

### The exported row

`historyapi.Row` is the complete list of exported fields; the struct starts at `Voxt/internal/historyapi/row.go:22`. The JSONL renderer encodes the whole row (`render.go:38-42`). The package comment says a new `store.Entry` field does not come along by itself. The Markdown renderer writes only a `## YYYY-MM-DD` section per day and a `- HH:MM · App: text` line per row (`render.go:47-65`), so `id`, `kind`, `heard`, `instruction`, `target_lang`, `selection` and `typed` are not in a Markdown file. `Walk` sets `Finished` and `Oldest`, so failed and cancelled rows stay out and rows come oldest first (`row.go:56-57`). `FromEntry` fills the row and adds `selection` only when the setting is on; `typed` needs the setting and a Rewrite with a spoken instruction (`row.go:44-49`).

$$ \text{export} = \{\text{id},\ \text{created\_at},\ \text{kind},\ \text{app}?,\ \text{text},\ \text{heard},\ \text{instruction}?,\ \text{target\_lang}?,\ \text{selection}?,\ \text{typed}?\} $$

| Symbol | Meaning | Source |
|---|---|---|
| `id` | the entry's id | `row.go:23` |
| `created_at` | the row's local time | `row.go:24` |
| `kind` | transcribe, translate or rewrite | `row.go:25` |
| `app` | the app in front, when known | `row.go:26` |
| `text` | the delivered result | `row.go:27` |
| `heard` | the recognition text before cleanup | `row.go:28` |
| `instruction` | Rewrite's spoken instruction | `row.go:29` |
| `target_lang` | Translate's target | `row.go:30` |
| `selection` | selected text, only with the setting | `row.go:31`, `row.go:44-45` |
| `typed` | Rewrite's typed text, under the same setting | `row.go:32`, `row.go:46-48` |

### Plugging in the stage's numbers

| Field | Present on the stage? | Condition |
|---|---|---|
| `selection` | starred; JSONL only | include selected text on |
| `typed` | starred; JSONL only | include selected text on, and a Rewrite instruction exists |
| `created_at`, `app`, `text` | both formats | always |
| `id`, `kind`, `heard`, `instruction`, `target_lang` | JSONL only | always |
| recording, URL, error, rule, model, timings | never | `history-access.md` |

### Formats and ranges

`--day YYYY-MM-DD` takes the local calendar day, 23 or 25 hours long when the clocks change; `--since T` and an optional `--until T` take RFC 3339 times or dates. A range includes its start and excludes its end (`Voxt/docs/history-access.md`). `--kind` takes `transcribe`, `translate` or `rewrite`. `--format jsonl` writes one JSON object a line with every field above (`render.go:38-42`); `--format md` writes a `## YYYY-MM-DD` section a day with only time, app and text (`render.go:47-65`). Export text from the History page uses the same row and the same selected-text setting.

### Boundary

The export command needs the access switch from Step 8, but the History page's **Export text…** does not: you are the one running it. A file exported by hand is yours; the automatic clean-up and Clear the history do not touch it.

### Next

Export can be turned on and off. Step 8 shows the switch and what it does not protect.

## Step 8 · The switch does not protect the database

> **In one line:** The switch opens one logged command for other programs; a program running as the same user can still read the database file directly, whether the switch is on or off.

### On the stage

- The left blue box is the documented way: switch off, the command gets no answer (exit 3); switch on, each read logs time, count and program name, a new name raises a notice, and the log holds no text.
- The right grey box is the direct path: `voxtnew.db`, the one file that holds the history, read by a program running as the user, not logged, and the switch does not change it.
- The bottom line says other accounts cannot open the channel (mode 0600 inside `~/Library`) and there is no network port.
- The dashed box hands the next-chapter question to the stage.

### What the switch does

`privacy.historyAccess` is off by default and asks once before it turns on. With it off the socket does not exist, so `Voxt history` fails with exit 3 (`Voxt/docs/history-access.md`; `history_access_controller.go:78`, `syncHistoryAccess`). With it on, a valid export or status request reaches the audit hook and logs `At`, `Op`, `Count`, `Program` and `As`; malformed or unsupported requests return before it (`server.go:151-159`), so they are not logged. The record type is `Read` (`historyapi/server.go:63-70`), and the call is at `server.go:167-169`. It keeps no history text. `Listen` creates the socket with mode `0600` (`server.go:101`, the chmod at `server.go:111`), inside `~/Library`, and no port is opened.

$$ \text{answer} = \begin{cases} \text{logged read}, & \text{switch on} \\ \text{exit 3}, & \text{switch off} \end{cases} $$

| Symbol | Meaning | Source |
|---|---|---|
| `historyAccess` | the switch, default off | `settings.md` Privacy table |
| exit 3 | no answer: app not running or switch off | `history_cli.go:27` |
| audit row | time, op, count, program, no text | `historyapi/server.go:63-70` |
| mode 0600 | only this account can open the socket | `server.go:101`, `server.go:111` |

### Plugging in the stage's numbers

| Path | Switch off | Switch on | Logged? |
|---|---|---|---|
| `Voxt history` command | exit 3 | works | yes, when on |
| `voxtnew.db` by the same user | readable | readable | no |
| another macOS account | cannot reach the socket | cannot reach the socket | n/a |
| a web page or another device | no port | no port | n/a |

### Why it does not protect the database

Voxt is not sandboxed and keeps its data in `~/Library/Application Support/VoxtNew`. Any non-sandboxed program running under the same account can open `voxtnew.db` directly, and that read is not logged (`Voxt/docs/history-access.md`). The switch makes the documented way opt-in and visible; it does not protect the history from software already running as you. Program names in the log are best effort and can be forged.

### Parallel cleanup

Clear the history removes every row and its recording, then compacts the database (`sqlitestore/history.go:216-243`, `DeleteAll`). The compaction is there so the deleted text does not stay in free pages; a failed compaction is logged, not returned. That is a different action from the two clocks and runs only when the user asks.

### Next

The row and its recording are gone after their clocks. The next chapter asks how an audio file you already have becomes SRT or TXT. Chapter 10's file transcription reuses the recognition route and writes a file instead of text at a cursor.
