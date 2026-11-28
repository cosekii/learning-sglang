## Step 1 · The route and three kinds of proof

> **In one line:** Chapter 15 closed by asking which of its claims carry evidence; this chapter answers by hanging three kinds of proof — code tests, fixed-sample evaluations and real-device checks — on the book's six-station route.

### On the stage

- The question bar quotes Ch. 15 Step 6's closing question: which claims have tests or evaluation evidence?
- The six-station route returns with the names from Ch. 1 Step 2: YOU PRESS → HELPER → SOUND → WORDS → TIDY WORDS → YOU SEE TEXT → SAVE TEXT.
- Three tag cards appear one at a time, each with its colour and a one-line gloss: **CODE TEST** (blue) — the app checks itself and can re-run any time; **SAMPLE EVAL** (amber) — fixed recordings, scored, the same ones every run; **REAL CHECK** (dark) — a person on a real Mac, which cannot be faked.
- The chapter map: tests (2), samples (3), a real Mac (4), the diary (5), the whole map (6).

### The map, in this book

Each kind gets one step, then the diary answers the chapter's other question — how logs help locate a problem — and the last step tags the route. The tags are this chapter's legend, not a coverage audit: a tag on a station means this book showed pinned evidence there, not that everything at that station is proven.

Not expanded in this deep dive: the perf lineage (which change made which station faster) — the book tracks it separately, and every performance number quoted in earlier chapters carries its own sample, machine and status where it appears.

### Next

The first kind: 515 test files, and what three of them pin down.

## Step 2 · Code tests: 515 self-checks

> **In one line:** The pinned source tree holds 515 Go test files; each pins a behavior the app must keep, and three of them pin behaviors this book has already shown.

### On the stage

- The left panel counts test files by home: root package 258, session 53, meeting 36, then asr 16, omni 13, llm 10, compose 8 and everywhere else 121.
- The sum panel: 258 + 53 + 36 + 16 + 13 + 10 + 8 + 121 = 515 test files, each pinning one behavior and re-run after each change.
- Three pinned examples: the 9 s limit and 300 ms pause from Ch. 4 Step 4 are one test's fixture; a fake helper crashes and restarts on cue (Ch. 2); a test watches that keys never reach the log (Step 5).

### The counts, in the tree

The count was taken with `git ls-tree` on the pinned revision: 515 `Voxt/**` files ending in `_test.go` — 258 in the root package, 256 under `internal/`, 1 under `scripts/`. The `internal/` breakdown includes session 53, meeting 36, asr 16, omni 13, llm 10, compose 8 and archtest 7. One file can hold many checks, so the count is of files, not of assertions.

The three examples are real tests. Ch. 4 Step 4's 9-second limit, 300 ms pause and 10-second recording come from the public `SplitPCM` fixture (`Voxt/internal/asr/split_test.go`). The supervisor tests drive a fake helper (`VOXTNEW_FAKE_HELPER`) through handshake, PCM capture, cancel, a stuck cancel, crash and restart, protocol mismatch and garble (`Voxt/internal/helper/supervisor_test.go`; the coverage list is in `Voxt/docs/helper-protocol.md`). The log tests cover rotation, the dropped-line warning and the redaction path (`Voxt/internal/logs/logs_test.go`).

Not on the stage: the architecture guards (`internal/archtest`), which parse the Go sources to enforce import rules and file sizes — they check the code's shape, not a user-facing behavior.

### Next

The second kind: 31 fixed recordings, scored the same way every run.

## Step 3 · Sample evaluations: 31 fixed recordings

> **In one line:** The eval doc defines 31 synthetic-voice recordings that get scored on every run — and warns, in its own text, that real dictation scores worse.

### On the stage

- 29 short clips (169 s in all) and 2 long ones (95 s and 104 s): 29 + 2 = 31 fixed recordings, the same ones every run. The voices are synthetic — a model reading lines, not a person.
- One score as an example: the dictionary test (Ch. 8). Of 10 dictated terms, 7 land with the dictionary as context, 4 without.
- Three warnings: the eval doc itself says real dictation scores worse; the speaker 11 / 11 was the old scoring (Ch. 14 Step 6); the cleanup evaluations are a kept record and no longer run.

### The set, in the doc

The set lives in `testdata/eval/`: 29 short clips plus 2 long, grouped zh-filler / zh-plain / en / mix / dict / dict2 / long, all Qwen3-TTS synthetic voices — "studio-clean synthetic speech: no noise, no accents, no real hesitation. Real dictation will score worse." (`Voxt/docs/eval.md`, eval-set section). Scores are normalised error rates (CER on Chinese, WER on English) plus term and fault checks. The runs are `TestEvalASR`, `TestEvalLongASR` and `TestEvalDictASR` behind `VOXTNEW_EVAL=1`; the dictionary number on the stage is the doc's context-bias result, 7/10 terms with the dictionary against 4/10 without.

Two boundaries the stage states. The multi-speaker 11/11 was measured under the old scoring rule — majority-voice per label, last round only — and never re-run under the PR's 1:1 matching rule (`Voxt/docs/MTDEvaluation.zh-CN.md`, the 2026-11-17 note). And the doc's large LLM sections are marked history: those evals ran the retired `voxtnew-llm` and were removed with it (`eval.md`, running-it section), so a "cleanup score" from them is a record, not a current guarantee.

Not on the stage: the doc's other results (language hints, fillers, long-dictation decisions, cache limits). They share the same synthetic-voice boundary.

### Next

The third kind: what only a person on a real Mac can check.

## Step 4 · Real-Mac checks: a person's list

> **In one line:** An about-80-minute checklist walks a real Mac through the parts automation cannot fake — permissions, the key listener, real Accessibility reads and the real microphone.

### On the stage

- One person, one real Mac, about 80 minutes.
- Four checklist cards: REAL MICROPHONE (your voice, your room), PERMISSION DIALOGS (the Mac asks, you answer), THE KEY LISTENER (a real finger presses), READING OTHER APPS (the real front window) — automation cannot fake these.
- Why a fake is not enough: Step 2's fake helper crashes on cue, but a real key press exists only on a real Mac.
- `mac-e2e.sh` and `mac-regress.sh` run parts of the list — still on a real Mac.

### The list, in the doc

The public manual-test doc orders a full pass: first launch and model download, dictation, translation, rewrite, app enhance, the dictionary, then model processes, errors and offline behavior, and finally home, history and settings (`Voxt/docs/manual-test.md`). Its own header lists what automated tests cannot reach: permissions, the event tap, real Accessibility, the browser, the floating panel's appearance and the local model under a real microphone. The required part is about 80 minutes, excluding model downloads. Section 10 covers the unattended real-Mac scripts: `mac-e2e.sh` (a real helper, a file standing in for the microphone, read-only Accessibility reads, text measurement) and `mac-regress.sh` (two real recognition models, Silero, a quick eval pass, the packaged app launched with `--smoke`).

The same doc tells a reporter what to collect when something looks wrong: the step number, the time, an exported diagnostics bundle and a screenshot — which is Step 5.

### Next

Where the app writes down what it did — and what it never writes down.

## Step 5 · Logs: the app's diary

> **In one line:** The app keeps the newest 2,000 lines of what it did, rotated into capped files — with keys, tokens and your words kept out — and a bug report packs a diagnostics zip that holds no words you said.

### On the stage

- Three diary lines arrive, newest first: a session saved, a slow helper answer, a session started (constructed; the format is the code's).
- The newest 2,000 lines stay in memory; older ones roll off.
- Three files — `voxtnew.log`, `.1`, `.2` — each capped at 5 MB, two old ones kept.
- A struck-through Authorization line: keys, tokens and passwords never reach the diary; your words are off by default.
- REPORT A BUG packs a diagnostics .zip: diagnostics.txt + settings + the logs, no words you said; the issue text is cut to 5,000 runes.

### The diary, in code

The log service is an in-memory ring of the newest 2,000 lines, written to `voxtnew.log` plus two rotated files by a dedicated goroutine so appending never blocks on the disk (`Voxt/internal/logs/logs.go:28-37,64-74`). Files rotate at 5 MB and two old ones are kept (`logs.go:32-33,67-70,224-230`); when the writer falls behind, lines miss the file but not the ring, and a later warning line says how many (`logs.go:85-88,200-201`). Every line passes a redaction filter before it reaches the panel, a file or a bundle — keys, tokens and proxy passwords never arrive (`logs.go:13,93-95`). Speech content is off by default; a privacy switch turns it on (`Voxt/docs/manual-test.md`). Levels are inferred from each line's text (`logs.go:267-276`), and the line format on the stage follows `logs.go:167`. Beside `voxtnew.log`, the same folder holds `helper.log` (the helper's side) and `crash.log` with Go panic stacks (manual-test.md, where-to-look table); the logs panel opens with ⇧⌘L.

The bundle zips `diagnostics.txt` — version, helper state, machine, self-check results, with a comment noting it holds nothing the user said or wrote — plus `settings.json` and every log file (`Voxt/settings_about_controller.go:61-92,174-216`). Report bug opens a prefilled issue whose body truncates the diagnostics to 5,000 runes (`settings_about_controller.go:265-304`). The About page also runs self-checks — library, helper, data folder, models, microphone and Accessibility permissions (`settings_about_controller.go:109-171`).

Not on the stage: the slow-call traces — the app logs helper calls slower than 500 ms, the helper its own slower than 250 ms, so two lines tell where a call waited (`Voxt/docs/helper-protocol.md`).

### Next

The whole map: which stations carry which tags, and what stays open.

## Step 6 · The whole book: what each proves

> **In one line:** Every station carries code tests, recognition carries the sample evaluations, the human parts carry the real-Mac checks — and the open band keeps what none of them proves on the map.

### On the stage

- The six-station route. Blue TEST tags land on every station; an amber SAMPLE tag lands on SOUND → WORDS; dark REAL tags land on YOU PRESS, HELPER and YOU SEE TEXT. The legend ties each colour to its step.
- The dashed STILL OPEN band: noisy rooms, real voices and accents (the eval doc's own not-measured list); meetings with more than 4 speakers (Ch. 14 Step 6); your Mac, your apps and your way of talking, together.
- The closing lines: code says what it does; samples say how well on those recordings; real-Mac checks cover the human parts — the open parts stay on the map.

### The tags, station by station

A tag means this book showed pinned evidence at that station, not complete coverage. TEST sits on every station because each station's package holds test files at the pinned tree: hotkey (`internal/hotkey`), helper (`internal/helper`), recognition (`internal/asr`, `internal/omni`), tidy words (`internal/llm`, `internal/compose`), delivery (`internal/deliver`) and saving (`internal/store`, `internal/session`). SAMPLE sits on recognition: the ASR eval set (Step 3) and the multi-speaker samples (Ch. 14 Step 6) both score it; the tidy-words evaluations are the retired record from Step 3, so that station keeps no sample tag. REAL sits where the manual list is the only instrument: the key listener and permission dialogs (YOU PRESS, HELPER) and the real front window (YOU SEE TEXT).

The open band quotes sources, not guesses: the eval doc's not-measured list names noise, real voices, accents, microphone recordings and sessions through the helper's real capture (`Voxt/docs/eval.md`, last section); the multi-speaker doc leaves more than 4 speakers, real meeting audio, live paths and long audio unproven (`Voxt/docs/MTDEvaluation.zh-CN.md`). One layer the stage does not draw: merge, beta and stable are release states, not evidence — a merged change still owes its real-app acceptance, which is why every performance number in this book carries its measurement status where it appears.

This is the book's last chapter; the map is the close.
