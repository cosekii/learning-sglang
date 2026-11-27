## Step 1 · A new tag for each dictation

> **In one line:** Each successfully started dictation gets a new session ID, giving its work a shared identity.

### On the stage

- The picture builds in order: dictation 1 appears, then its tag `session ID = A`, then its results; dictation 2, `session ID = B` and results 2 follow, and `A ≠ B` closes the lap.
- Two dictations: the first and the second.
- Two blue tags: `session ID = A` and `session ID = B`.
- Two result boxes: results 1 follow A, and results 2 follow B.
- `A ≠ B`: a new dictation does not reuse the previous dictation's session ID.
- A and B are teaching stand-ins; the app generates string session IDs.

### The mapping

$$
D_1 \rightarrow S_A,\qquad D_2 \rightarrow S_B,\qquad S_A \neq S_B
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $D_1$ | The first dictation | This step's constructed example |
| $D_2$ | The second dictation | This step's constructed example |
| $S_A$ | The first dictation's session ID, shortened to A | Generated when this dictation starts |
| $S_B$ | The second dictation's session ID, shortened to B | Generated when this dictation starts |

### The numbers on the stage

Two dictations map to two different session IDs. The picture therefore has two tags, not one tag shared by both dictations. Two is a constructed teaching count, not an app limit.

### How the tag works in the source

The teaching picture draws identity as a tag. The source uses two routing mechanisms:

- Recording jobs use the session ID.
- ASR (speech recognition) and LLM (language model) streaming callbacks bind to their own `run`, the object for one dictation. `Manager.update` checks that this run is still current or registered in the background, and has not ended. It does not merely compare a string attached to a result.

An old session that is composing can register in the background and keep writing its own card and history, not the new session's current card. “Every old result is discarded” would therefore be wrong. Later steps will draw the late-result gate; this step only establishes that each successful start gets a new tag.

### Next

Put one tagged dictation on the full route: hotkey, helper, speech recognition, cleanup, delivery and history.

### Source

Public baseline: `sglang-omni@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`. Paths are relative to that repository.

- Every successful `Manager.Start` calls `NewID()` and creates a new run: `Voxt/internal/session/manager.go:193-215`.
- Production uses `core.NewID(time.Now())`: `Voxt/session_link.go:232-237`; real IDs are ULID strings: `Voxt/internal/core/ids.go:12-21`.
- ASR callbacks bind to a run: `Voxt/internal/session/run_audio.go:190-201`; LLM callbacks: `Voxt/internal/session/cleanup.go:133-139,194-203`.
- `Manager.update` checks identity and completion: `Voxt/internal/session/manager.go:341-367`; the background exception: `Voxt/internal/session/manager.go:238-253`.

## Step 2 · Put the tag on the full route

> **In one line:** For one successful Transcribe with clean-up and history enabled, the hotkey starts session A, then the sentence passes through the helper, recognition, clean-up, delivery and history.

### On the stage

- The blue A tag walks the six stops in order; each stop, with its name and product, appears as the tag arrives and stays. No stop gets a new tag.
- You press: one key press starts this dictation through the hotkey route.
- Helper: the program that brings the key event and microphone sound into the app, so it comes before sound becomes words.
- Sound → words: recognition produces the original words, such as “um, hi”.
- Tidy words: the constructed example `um, hi → Hi!` shows removal of a spoken hesitation. The actual output depends on the language and clean-up settings; these exact words are not guaranteed.
- You see text: the result can appear at the cursor or wait on the answer card, called the “result window” on this stage. You can choose the card, and Voxt also uses it when insertion fails.
- Save text: the history entry stores both the recognized `RawText` and the cleaned `Result`. This picture does not expand recordings or the other fields.
- Blue A: the session ID from Step 1. Every stop after the start uses the same identity; no stop gets a new tag.

### The route and its symbols

$$
K \rightarrow P \rightarrow R \rightarrow C \rightarrow D \rightarrow S
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $K$ | One hotkey input | This step's constructed dictation |
| $P$ | The helper stop | The public architecture's Swift helper |
| $R$ | The recognition stop | `run.listen` returns recognized text |
| $C$ | The clean-up stop | The Transcribe clean-up path |
| $D$ | The delivery stop | Cursor insertion or the answer card |
| $S$ | The history stop | One entry written by `keep`, containing the original and cleaned text |

### The numbers on the stage

This picture has no timing or performance numbers, and it does not give the stops equal durations. A remains the teaching stand-in from Step 1; the real session ID is a string generated by the app.

### What this step leaves out

This step shows one successful Transcribe with clean-up and history enabled. When clean-up is off, skipped or fails, Transcribe can continue with the recognized text. When delivery fails, the text can stay on the answer card. Permissions, microphone internals, recognition services and late-result checks belong to later steps.

### Next

Follow this route to the late-result gate: which check stops an old session from writing into the new session's current card?

### Source

Public baseline: `sglang-omni@14014b833299c6158a5daa88e1e0740cf7efe606`. Paths are relative to that repository.

- The helper process and its hotkey, capture and text-I/O duties: `Voxt/docs/architecture.md:226-239`.
- The full route from hotkey through recognition, clean-up, delivery and history: `Voxt/docs/architecture.md:245-277`.
- Starting creates a run with a new ID: `Voxt/internal/session/manager.go:193-235`.
- `run.main` joins recording, recognition, clean-up and delivery: `Voxt/internal/session/run.go:174-176,235-258`.
- The history entry uses this run's ID, and its delivery field distinguishes insertion from the answer card: `Voxt/internal/session/run.go:446-460,476-484`.

## Step 3 · Late A does not write into B

> **In one line:** Late A appears in its own result window and is saved; it does not write into B's result.

### On the stage

- The picture builds in order: the setup (A starts first, B later; A's result arrives late), late A's box, the same-session check answered `A ≠ B` (no), the block with A's own route, then B's result, the same check answered `B = B` (yes) and the write into B.
- Time order: A starts first, B starts later; A is tidying text, and its result arrives late.
- Amber marks the accepted result: session B's boxes, `B = B` and the write into B. Blue only highlights the box that appears in the current phase.
- First row: `A ≠ B`, so A does not write into B. A appears in its own result window and its saved results.
- Second row: `B = B`, so B writes into its own result.
- Both rows show B's result on the right. You can choose the result window. Text also stays there if insertion where you type fails.
- In this example, clean-up succeeds and saving is on. “Saved results” are the history you can view later.

### The check

$$
\operatorname{write}(r,c) \iff r=c \ \land\ \lnot\operatorname{ended}(r)
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $r$ | The `run` carrying this result, the object for one dictation | The result's session |
| $c$ | The `run` that owns this dictation's result now | B in this step |
| $\operatorname{ended}(r)$ | The result's `run` has already ended | The current path's completion check |
| $\operatorname{write}(r,c)$ | Whether the result can update B's result | The current path's identity check |

Equality means the same `run`, not merely the same string attached to a result, and that `run` must not have ended.

### The numbers on the stage

| Result's $r$ | Current $c$ | Same? | B's result |
|---|---|---|---|
| A | B | No | Do not write A |
| B | B | Yes | Write B |

A and B remain teaching stand-ins. The picture has no timing or performance numbers; its arrows show only a constructed arrival order.

### The check in the source

“B's result” is the teaching name for the current session's result, represented by the foreground snapshot. `Manager.update` receives the result's `run`. The current path requires `m.cur == r` and an unfinished run before updating and publishing the foreground snapshot. Otherwise it returns `false` without changing B's result. `Manager.end` performs the corresponding current-or-background identity check.

A can register through `Background` while it composes text. It then updates its own `r.own` and publishes through `backgroundPub`, not B's foreground snapshot. Its history also uses A's own run ID. This example keeps Step 2's premises: clean-up succeeds and history is on. Late A therefore appears in its own result window and is saved rather than discarded.

### Next

Add cancellation to the same route: after A is cancelled, where do its late recognition or clean-up results stop?

### Source

Public baseline: `sglang-omni@48ee40b2563492de95efc952a0c7470db087d8a9`. Paths are relative to that repository.

- A new session becomes the current run: `Voxt/internal/session/manager.go:193-235`.
- Registering current and background runs: `Voxt/internal/session/manager.go:238-253`.
- `Manager.update` identity checks, completion checks and publication paths: `Voxt/internal/session/manager.go:341-375`.
- The corresponding checks in `Manager.end`: `Voxt/internal/session/manager.go:378-417`.
- History uses this run's ID: `Voxt/internal/session/run.go:446-460`.

## Step 4 · Cancellation keeps late results undelivered

> **In one line:** If you cancel A during recognition or clean-up, its late result does not appear where you type or in the result window. In this example, A's saved record says cancelled and its `Result` is empty.

### On the stage

- The picture builds in order: you press cancel, A is marked cancelled, then each possible late result arrives in turn — the recognized words, then the cleaned words — meets the cancelled check and is not delivered; the screen shows nothing, and the saved record writes `cancelled` with an empty result.
- You cancel A: this step covers cancellation only during recognition or clean-up.
- The two late results are alternatives, staged one at a time: a late recognition result, then a late clean-up result. Each meets its own check — two separate checks, not one shared one.
- The red box marks A cancelled before any late result arrives; every late result checks this flag first.
- Not delivered means no insertion and nothing in the result window; the late result is still checked, and the cancellation is still recorded.
- On the right, no late A result appears where you type or in the result window.
- The saved record marks A cancelled and leaves `Result`, the final-result field, empty. This example has history on and a recording long enough to keep.

### The result after cancellation

$$
C_A=\mathrm{true}\quad\Longrightarrow\quad D_A=\mathrm{undelivered},\qquad R_A=\mathrm{empty}
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $C_A$ | A's cancellation flag | `Manager.Cancel` sets `r.cancelled` |
| $D_A$ | Delivery of the late result | The cancellation check after recognition or clean-up returns |
| $R_A$ | `Result` in the saved record | The snapshot when cancellation ends the run |
| $\mathrm{undelivered}$ | No insertion and no final result in the result window | The outcome this step explains |
| $\mathrm{empty}$ | The empty string; it says nothing about the recognized original text | No final result has been delivered in this example |

### The two cases on the stage

| What arrives late | What the code checks after it returns | Show A's final result | Saved `Result` |
|---|---|---|---|
| Recognized “um, hi” | `r.cancelled` | No | Empty |
| Cleaned “Hi!” | `r.cancelled` | No | Empty |

The picture has no timing or performance numbers. Both texts are constructed examples showing that recognition and clean-up check the cancellation flag after they return.

### The two checks in the source

`Manager.Cancel` finds the live A, sets `r.cancelled`, and cancels its context. After recognition returns, `run.listen` checks that flag. A cancelled run calls `endCancelled` and returns before storing the recognized text or entering clean-up. After clean-up returns, `transcribe` checks the same flag. A cancelled run ends before passing the cleaned result to `finish` for delivery.

`endCancelled` uses `Manager.end` to set the state to `Cancelled`. With history on and a recording that meets the minimum length, `keep` writes an entry with status `cancelled`. Its `Result` comes from the snapshot at cancellation and is empty in this example. If cancellation happens during clean-up, `RawText` can retain the previously recognized original. Empty result text therefore does not mean empty recognized text. This step does not cover whether the recording is retained or for how long.

### Next

Step 2's helper receives key events. How does the cancel key reach the helper, and where do permission checks happen?

### Source

Public baseline: `sglang-omni@48ee40b2563492de95efc952a0c7470db087d8a9`. Paths are relative to that repository.

- Cancelling a live current or background session: `Voxt/internal/session/manager.go:256-289`.
- The post-recognition cancellation check before storing recognized text: `Voxt/internal/session/run_listen.go:397-417`.
- The post-clean-up cancellation check before delivery: `Voxt/internal/session/cleanup.go:35-77`.
- Cancellation, minimum recording length and history writes: `Voxt/internal/session/run.go:398-414,446-460,510-529`.
- Tests cover cancellation while recording, recognizing and composing. Nothing is pasted; a long enough recording leaves a cancelled entry, while a shorter one leaves none: `Voxt/internal/session/session_test.go:294-344`.
