## Step 1 · Choose a task after recognition

> **In one line:** Recognition can feed Transcribe, Translate or Rewrite; in Rewrite, the spoken words are an instruction rather than the content to rewrite.

### On the stage

- The stage builds in order: the recognition result appears first, the three task cards arrive one at a time, and the route count closes the step.
- The blue card holds one recognition result from Ch. 4 Step 7. Each run selects one of three task routes rather than executing all three.
- The `Transcribe` route treats words such as “Good morning.” as content to tidy. This chapter calls that job “tidy one dictation”.
- The `Translate` route treats recognized words as content to translate.
- The `Rewrite` route treats speech such as “Make it shorter.” as an instruction. Selected or typed text can supply the content to rewrite; writing from scratch has no such source text.
- These routes need different task instructions and input arrangements, so Voxt cannot send the same fixed prompt for every job.

### Formula

$$
C=R\times T
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $C$ | Number of route choices for one recognition result | Calculated in this step |
| $R$ | Number of results handed off by recognition | One result from Ch. 4 Step 7 |
| $T$ | Number of task routes listed here | `Transcribe`, `Translate` and `Rewrite`: 3 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---:|
| Candidate task routes | $1\times3$ | 3 |

This counts alternative routes. Each run selects one. The constructed inputs differ across the cards to show what the words mean in each task.

### Input boundary

`Transcribe` and spoken `Translate` receive recognized text. In `Rewrite`, speech is an instruction, optionally followed by selected and typed text. Dictionary aliases are replaced before task routing, while history retains the recognized wording. The dictionary chapter will expand that detail.

### Next

The route is selected. The next step separates stable instructions from this run's changing input across `system`, `history` and `user` messages.

### Sources

Public baseline: `sglang-omni@3a31bd72e034db37ce5115a03dd4827b449683be`; paths are relative to that repository.

- Task values: `Voxt/internal/compose/compose.go:58-65`.
- Recognition passes through `spoken(raw)` before task routing: `Voxt/internal/session/run.go:250-327`.
- Translate and Rewrite input arrangements: `Voxt/internal/session/write.go:27-61`.
- Dictionary replacement versus history's recognized wording: `Voxt/internal/session/cleanup.go:64-77`.

## Step 2 · Separate stable instructions from this run's input

> **In one line:** A request orders messages as `system → history → user`, keeping stable instructions in `system` and this run's input in `user`.

### On the stage

- The stage builds in order: the `system` card, then the optional `history` card, then the `user` card, and finally the reuse line.
- `system` carries reusable instructions for the model: role, task and output contract, plus cleanup rules when used. Its content stays stable across runs.
- The dashed `history` card is optional. It can hold examples or earlier conversation turns; a request omits it when none are needed.
- The blue `user` card holds this run's input: recognized text, a selection, typed text or a Rewrite instruction. Each task chooses its own fields.
- These labelled parcels form an ordered message list for Chapter 5's request route. “Stable” describes the content, not a latency or cache measurement.

### Why keep input out of the stable instructions

`compose.Build` validates the task and selects templates before constructing the system prefix, optional history and user message. A new dictation replaces its own input without rewriting the role and task instructions.

A small dictionary can remain in the stable system prefix. Above the public threshold, only matching terms enter a `<glossary>` block at the start of the user message, so each dictation does not change the system prompt. The main picture leaves the threshold and alias rules to the dictionary chapter.

### The input-wrapper boundary

Voxt wraps inputs in XML-shaped tags such as `<input>…</input>`. If user text contains the matching closing tag, the composer escapes it so the text cannot literally close its own wrapper. These tags are prompt conventions, not executable input.

### Next

The message positions are separated. The next step opens one Transcribe cleanup request and stacks its role, cleanup, task, input and output contract into a complete prompt.

### Sources

Public baseline: same as Step 1.

- Message order and system/user responsibilities: `Voxt/internal/compose/compose.go:260-309,394-444`.
- Stable dictionary prefix and the large-dictionary user block: `Voxt/internal/compose/compose.go:517-599`; `Voxt/internal/compose/dictionary.go:5-17`.
- Escaping matching closing tags: `Voxt/internal/compose/compose.go:361-378`.

## Step 3 · Five parts form a cleanup request

> **In one line:** A Transcribe prompt can be simplified into four system instruction layers and one user input: five functional parts in one prompt.

### On the stage

- The stage builds in order: the four layers stack into the system box one at a time, then the `USER` card joins, and the `4 + 1` count closes the step.
- `ROLE` tells the model which role should perform the work.
- `CLEANUP` describes fillers, repetitions and recognition artifacts to address. It guides the model rather than running a fixed text replacement.
- `TASK` names this job as tidying one dictation.
- `OUTPUT` asks the model to place its answer inside `<output>`, so the response cleaner knows which span to extract.
- The blue `USER` card wraps this run's recognized text, “Good morning.”, in `<input>`. The input value is constructed.
- This functional map omits input-form, `structure` or `form`, example, dictionary and scene layers. It is not the complete source `Layers` list.

### Formula

$$
L=I+U
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $L$ | Number of prompt parts drawn in this step | Calculated here |
| $I$ | Number of system instruction layers | Role, cleanup, task and output contract: 4 |
| $U$ | Number of user inputs | One constructed recognition result |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---:|
| Prompt parts in this picture | $4+1$ | 5 |

This counts parts in the teaching picture, not tokens, bytes or requests. All five parts belong to one model request.

### What full assembly can add

The public `Layers` list can include input form, optional `before`, basic cleanup, `structure` or `form`, task, shared dictionary material and the output contract. With cleanup enabled, the example is appended inside the system prompt rather than added as a history turn.

A nonblank `TaskPrompt` selects the full custom-prompt branch. It does not append one sentence to the built-in role and output contract; that branch explicitly decides which cleanup behavior to retain.

### Next

The Transcribe request is assembled. The next step compares all three tasks' input and output contracts to show why they cannot share one response-cleaning rule.

### Sources

Public baseline: same as Step 1.

- Transcribe layer assembly and output contract: `Voxt/internal/compose/compose.go:307-408`.
- Cleanup example inside the system prompt: `Voxt/internal/compose/example.go:9-45`.
- Full custom-prompt branch: `Voxt/internal/compose/compose_full.go:8-79`.
- Representative layer lists: `Voxt/internal/compose/compose_test.go:146-185`.

## Step 4 · Clean each answer by its contract

> **In one line:** The three tasks have different answer contracts: built-in Transcribe extracts `<output>`, Translate preserves tags in the text, and a first Rewrite from scratch reads a title and content.

### On the stage

- The stage builds in order: each card first shows its model answer, then what Voxt keeps, one task at a time.
- Each card shows the model answer above and the content Voxt keeps below. Every answer value is constructed.
- Built-in `Transcribe` turns `<output>Hi.</output>` into `Hi.` without delivering the wrapper.
- `Translate` preserves `“<output>”` when those characters belong to the text, as they can in HTML.
- A first `Rewrite` from scratch reads the title and content from `{title, content}`. Follow-ups use plain text. Invalid or absent first-write JSON falls back to cleaned plain text.
- This picture shows built-in contracts. A custom `TaskPrompt` can define another output shape, so the built-in `<output>` rule does not apply.

### Formula

$$
A=T
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $A$ | Number of answer contracts shown | One for each of 3 tasks |
| $T$ | Number of tasks shown | The 3 routes from Step 1 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---:|
| Tasks and answer contracts | $3\\rightarrow3$ | 3 tasks map to 3 contracts |

This compares cleaning rules, not model quality. The prompt asks for a shape and the cleaner processes the actual answer. A prompt cannot guarantee that every model answer follows it.

### Cleaning boundaries

Under the built-in contract, `Transcribe` extracts `<output>` and removes echoed control markup. Without tags, it can also look for the cleaned text span. `Translate` and ordinary `Rewrite` remove echoed input wrappers, outer quotes and control markup, but they do not treat `<output>` in the user's content as their own contract tag.

### Next

A short input fits one request. A long dictation needs pieces, and their answers must return in the original speech order.

### Sources

Public baseline: same as Step 1.

- Built-in `<output>` extraction and preservation of tags in content: `Voxt/internal/compose/answer.go:372-449`.
- First-write JSON parsing and plain-text fallback: `Voxt/internal/compose/answer.go:463-483`; `Voxt/internal/session/write.go:341-415`.
- Transcribe pieces call `CleanOutput`: `Voxt/internal/session/cleanup.go:399-431`.

## Step 5 · Split long dictation and rejoin it in order

> **In one line:** Long dictation can become several requests that share system instructions, then their answers join in speech order as one result.

### On the stage

- The stage builds in order: the three requests form one at a time, then the ordered result joins them.
- The first blue card holds one constructed long dictation from Ch. 4 recognition.
- The dashed box contains three requests. Each piece has the same system instructions, while `user 1`, `user 2` and `user 3` hold different spans of speech.
- The last blue card joins the three answers as `1 → 2 → 3`. Three pieces are a teaching example, not a fixed product value.
- The footnote limits the scope: `Translate` and `Rewrite` each use one request rather than this splitting route.

### Formula

$$
D=J(p_1,p_2,p_3)
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $D$ | One dictation joined in speech order | The result on this stage |
| $p_i$ | Cleaned answer for piece $i$ | The three constructed requests |
| $J$ | Function that joins answers in piece order | `compose.JoinParts` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---:|
| Piece requests | $1\\rightarrow3$ | 3 |
| Ordered results | $J(p_1,p_2,p_3)$ | 1 |

The join skips empty answers and uses the original spaces, line breaks or paragraph boundaries. Parallel work can change completion order, but it cannot change delivery order.

### Splitting and draft boundaries

Only `Transcribe` takes this route. A whole-sentence language change can create a piece at any length. Text over `LongWords = 300` also splits. `PieceWords = 300` is a soft limit, so an unavoidable long unit can exceed it.

An eligible remote path works on at most 4 pieces concurrently. Drafts publish only through the first unfinished piece, at most once every `40ms`. A later piece cannot appear before an earlier unfinished piece.

### Next

Splitting limits a failure to one piece. The next step shows how the other pieces and the full result continue when one request fails.

### Sources

Public baseline: same as Step 1.

- Only Transcribe splits, with a shared system prompt: `Voxt/internal/compose/pieces.go:72-100`.
- Thresholds, language boundaries and ordered joins: `Voxt/internal/compose/pieces.go:18-27,102-190`.
- Up to four concurrent remote pieces and ordered drafts: `Voxt/internal/session/cleanup_together.go:14-21,42-103`.
- Streaming publication interval: `Voxt/internal/session/write.go:17-18`; `Voxt/internal/session/cleanup_together.go:67-74`.

Public performance evidence (kept with its PR, measurement head, setup and boundary; not part of the pinned code baseline):

- [PR #4295](https://github.com/sgl-project/sglang-omni/pull/4295) (closed; integrated through [PR #4324](https://github.com/sgl-project/sglang-omni/pull/4324)): long dictations are cleaned up while recording continues. Apple M5 Max, Qwen3-ASR 0.6B 4bit, a scripted fake LLM answering in 3 s, a 4 min 13 s English input: 19 cleanups before the stop and 1 after, with the result bar showing Clean-up 4.0 s. The comments disagree about the real-app measurement head, so it cannot be bound without dispute; this proves early scheduling only, not a remote-provider gain. The behaviour shipped with release 2.1.2 ([PR #4338](https://github.com/sgl-project/sglang-omni/pull/4338)).

Public stop-to-text evidence (after the stop, the session waits for ASR Final, then cleanup, then delivery, in series; each entry keeps its PR, measurement setup and boundary):

- Baseline [PR #2214](https://github.com/sgl-project/sglang-omni/pull/2214): the first desktop path with local streaming ASR and LLM cleanup. Public smoke on Apple M4/16 GB, Qwen3-ASR 0.6B 4bit plus a separate local MLX-LM `default_model`: one synthetic voice reached its first non-empty live hypothesis in 2.573 s; a separate API smoke measured batch ASR including startup at 12.531 s and English cleanup at 1.386 s. The measurement head is not recorded and the values are single shots, evidence level C.
- [PR #3720](https://github.com/sgl-project/sglang-omni/pull/3720) (merged `a8625fffd20e` / `ad39fc4f8408`): removes the first-token deadline; the answer card grows as the answer arrives and can be dragged.
- [PR #3822](https://github.com/sgl-project/sglang-omni/pull/3822) (closed, not merged): a Raw fallback for a slow language model. Kept as an unlanded branch, not a current path.
- The dictionary half of this wait — a large dictionary no longer holds up cleanup for alias replacement ([PR #3795](https://github.com/sgl-project/sglang-omni/pull/3795), landed through [PR #3826](https://github.com/sgl-project/sglang-omni/pull/3826)) — is covered with its numbers in Chapter 8's deep dive.
- [PR #4728](https://github.com/sgl-project/sglang-omni/pull/4728) (open, review required): the HTTP Final request is built without copying the PCM. M5 Pro, Go 1.27.4, `BenchmarkFinalMultipart`, 250 ms, 3 runs median: 60 s PCM 3,861,533 → 9,881 B/op, 120 s PCM 7,695,096 → 9,877 B/op; 52 s and 156 s inputs transcribe byte-identically on the same Qwen3-ASR 0.6B 4-bit runtime. Neither the measurement head nor the baseline SHA of the before numbers is given, so the allocations cannot be bound to a specific commit. The evidence covers request-construction allocations and text equality only: not full-app peak RSS, GUI end-to-end, upload time or Stop-to-text.
- [PR #4727](https://github.com/sgl-project/sglang-omni/pull/4727) (open, review required): one shared PCM WAV decode. Measurement head `cd6a3afb5bc7`, baseline `0f70d9c7c41c`; Apple M5 arm64, macOS 26.5, Python 3.12.16, NumPy 2.2.6, single thread, matching rates; 666 distinct reference paths, 10 alternating AB/BA runs, median of the 10 cohort means: 24 kHz 45.60 → 32.91 µs/clip, offline conversion to 16 kHz 31.30 → 22.57 µs/clip, 60 s concatenated clips 369.54 → 264.44 µs/clip; peak traced bytes 9,600,706 → 3,874,819; waveforms and fingerprints bit-identical. These numbers cover only the `load_audio` CPU microbenchmark — not serving throughput, WER, GPU, full-app latency or RSS — and the float32 branch still copies explicitly.
- Still open: same-head verification of #4727 and #4728, a real-app run and human review. Both PRs remain open, so none of these numbers is a shipped result.

Public streaming-cleanup evidence (cleanup once waited for the whole dictation, so a long recording piled all of it after the stop; each entry keeps its PR, measurement setup and boundary; the gains along the chain are not additive):

- The chain starts from the #4295 entry above. [PR #4324](https://github.com/sgl-project/sglang-omni/pull/4324) (merged `779ca5d740af` / `822266d2a19d`) then reworked the early-cleanup backlog and the tail drain.
- [PR #4551](https://github.com/sgl-project/sglang-omni/pull/4551) (merged `4e79a66a4ed8` / `34961b7df8fb`): ASR finalization no longer blocks on an Early Cleanup result it cannot use.
- [PR #4552](https://github.com/sgl-project/sglang-omni/pull/4552) (merged `5fe39451a4ec` / `2659ce5b5f9d`): an opt-in stop-relative soft deadline bounds the wait; numbers with a real provider are still open.
- [PR #4592](https://github.com/sgl-project/sglang-omni/pull/4592) (merged `76822d084505` / `52aab78e85f1`): Transcribe is cleaned up while the user speaks; real-model numbers after the change are still open.
- [PR #4612](https://github.com/sgl-project/sglang-omni/pull/4612) (merged `9675a7963a34` / `31808c318bb7`): speculative cleanup streams show an early cleaned presentation. Candidate `4f675f06eab5`, baseline `09dc7839e93c`; fake ASR and LLM with a fake clock, 6 scenarios 10 times each, metric Stop → first cleaned presentation in the session snapshot: 1000 → 300, 1000 → 400, 400 → 300 ms. Not wall-clock, not a real provider, not the UI and not Stop-to-paste; the final head was not re-measured.
- [PR #4618](https://github.com/sgl-project/sglang-omni/pull/4618) (merged `f1a4ab43bef4` / `65d2b58193e2`): a whole-dictation HeadStart asks the language model while the user speaks. Candidate `2fabbaa86add`, earlier than the final head: M4 Air, 150 AASR-Bench clips × 4 = 600 sessions, 8 concurrent, replayed ASR plus the real Claude Haiku 5.5 with thinking off: Stop-to-insert p50/p90 1199/2425 → 804/1543 ms, paired median −395 ms, 95% interval [−515, −288], 94/150 faster. Not the full real app; the final head was not re-measured.
- [PR #4643](https://github.com/sgl-project/sglang-omni/pull/4643) (open, off by default): clean-up-while-you-speak can run with a language model on this Mac. Measurement head `1468412f5530`: M1 Pro/16 GB, Qwen3-ASR 0.6B 4bit Faster plus llama.cpp Qwen3-4B Q4_0, 5 replayed Chinese clips of 7–39 s, two batches of 30 sessions per arm: Stop → text median 1.69 → 0.94 s, P90 4.04 → 3.14 s; the shared-resource cost is measured alongside — ASR Final median 0.44 → 0.48 s, first preview 0.45 → 0.51 s.
- [PR #4655](https://github.com/sgl-project/sglang-omni/pull/4655) (merged `ae0ab9500644` / `6f68205867bb`): HeadStart candidates survive the ASR Final handoff. Still open: the late-candidate rate, the reuse rate, the extra request cost and Stop-to-text/insert.
- [PR #4709](https://github.com/sgl-project/sglang-omni/pull/4709) (merged `9e0504c830f6` / `84ba2fa96f15`, approved; 25 SUCCESS / 19 SKIPPED / 2 FAILURE, the two early mac-ci-gate failures kept on record): when at least two Early Cleanup jobs are unpublished, it stops waiting on the finalized worker's join. Real backlog, cancellation and stop-to-TTLC workloads are unmeasured; merged is not performance acceptance.
- [PR #4063](https://github.com/sgl-project/sglang-omni/pull/4063) (merged `b6517f081313` / `c49c4328241c`): Transcribe and Translate answers stream into the card as they arrive.
- Fallback: [PR #4722](https://github.com/sgl-project/sglang-omni/pull/4722) (open, review required; current head `9f5c7edc72c8`) cleans the whole dictation in smaller pieces after the live cleanup fails. A = main `84ba2fa96f`, B = main plus the change, both arms Remote and concurrent with max in flight 4; the same 95 s Chinese dictation with the first live cleanup failure injected, an idle M1 8 GB MacBook Air, ABABAB, 3 pairs, median, stop-button reference: Stop → first cleaned text 11.41 → 1.90 s, Stop → cleanup done 27.13 → 15.84 s, requests 5 → 12; full-text similarity 0.980–0.986, evaluation diff 0.91%–2.46%, and the third pair saved only 1.75 s in total. B's exact measurement SHA, provider and model are not given, so this is not a same-head benchmark on the current head.
- Still open: real-model numbers for #4592, a real provider for #4552, a real backlog for #4709, and same-head and real-app runs for #4722; #4643 remains open and off by default.

## Step 6 · Keep recognized words when one piece fails

> **In one line:** If cleanup fails for one Transcribe piece, that piece keeps its recognized words while the other pieces can still be cleaned, and the dictation finishes degraded.

### On the stage

- The stage builds in order: each piece settles one at a time — piece 1 cleaned, piece 2 failed, piece 3 cleaned — then the join count and the end state.
- Blue pieces 1 and 3 succeed and keep `CLEANED 1` and `CLEANED 3`.
- Orange piece 2 fails and keeps `RECOGNIZED 2`. All three outputs still join in Step 5's order.
- `DONE` ends the session. `ProblemLLM` records the language-model failure, and `Degraded = true` says that recognized words remain in the result.
- The failure is constructed; no real model was called. A late answer cannot replace the chosen result.

### Formula

$$
D=J(c_1,r_2,c_3)
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $D$ | One result joined in order | This step's ordered result |
| $c_i$ | Cleaned answer for piece $i$ | Pieces 1 and 3 on this stage |
| $r_2$ | Recognized words retained for piece 2 | This step's constructed failure |
| $J$ | Function that joins answers in piece order | `compose.JoinParts` from Step 5 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---:|
| Pieces joined | $2+1$ | 3 |
| Ordered results | $J(c_1,r_2,c_3)$ | 1 |

One failed piece does not turn successful pieces back into recognized text. The error still reaches the session, so the result is degraded `Done` with `ProblemLLM`, rather than success without a warning.

### Other recognized-text exits

Manual Skip or a configured soft deadline can select the whole recognized input. Those branches do not assign `ProblemLLM`. The soft deadline starts at Stop. A cleanup candidate wins only when both completion and publication happen strictly before that deadline. After Voxt chooses recognized text, a late candidate cannot replace it.

“Recognized text” here means the input to cleanup after applicable dictionary alias replacement. It can differ from the original `Raw` retained in history. Cancellation is a separate end state and does not deliver a late result.

### Next

Transcribe can finish with recognized pieces. Translate and Rewrite give their speech different roles, so the next step compares their retry and failure exits.

### Sources

Public baseline: same as Step 1.

- A failed piece retains its recognized text: `Voxt/internal/session/cleanup.go:399-431`; `Voxt/internal/session/cleanup_together.go:77-103`.
- Formation of `Done + ProblemLLM + Degraded`: `Voxt/internal/session/cleanup.go:204-224`.
- Skip, soft deadlines and the single choice point: `Voxt/internal/session/cleanup.go:162-224`; `Voxt/internal/session/cleanup_manager.go:29-45,47-132`.
- Recognized input versus dictionary replacement: `Voxt/internal/session/cleanup.go:64-77`.

## Step 7 · Retry Translate, never deliver a Rewrite instruction

> **In one line:** A suspected translation echo triggers one strict request, while an ordinary Rewrite failure never delivers the spoken instruction as the result.

### On the stage

- The stage builds in order: the Translate echo, the strict retry, the final echo with its evidence and the `FAILED` exit, then the Rewrite failure and its `FAILED` exit.
- The left card covers selected `Translate`. The answer repeats “Good morning.”, so Voxt makes one `STRICT` retry. In this example, the final answer remains an echo and positive language-mismatch evidence exists, so the session ends `FAILED` without insertion.
- The right card covers an ordinary `Rewrite` request failure. “Make it shorter.” is an instruction rather than deliverable content, so the raw-speech fallback count is 0 and Voxt inserts nothing.
- Both paths are constructed. Spoken `Translate` has separate skip and timeout exits, so the left card does not describe every translation failure.

### Formula

$$
S=1,\qquad B=0
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $S$ | Strict requests added after one suspected echo | The Translate echo branch in `write`: 1 |
| $B$ | Ordinary Rewrite failures that deliver speech as the result | `keepSpeech` allows only spoken Translate: 0 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---:|
| Strict retry for selected Translate | $S$ | 1 |
| Rewrite raw-speech fallbacks | $B$ | 0 |

These counts describe different mechanisms. Adding them would not produce a meaningful shared retry count.

### Echo detection is not a quality evaluation

`Untranslated` checks normalized source repetition, an unparenthesized whole source beside a translation, and script evidence. Parenthesized original names, language-neutral names, numbers and ambiguous Latin text have exceptions or insufficient evidence.

If the strict request itself fails, Voxt keeps the first answer. A hard `ErrNotTranslated` failure requires both a final suspected echo and positive evidence from `LanguageMismatch`. This heuristic does not measure overall translation quality.

### Other failure exits

Manual Skip for spoken `Translate` finishes `Done` with recognized speech and no problem. A timeout also delivers recognized speech, but with degraded `ProblemLLM`. Selected Translate timeouts and other ordinary Translate failures end `Failed`, offer answer-card retry and insert nothing.

`Rewrite` uses `ProblemNoLLM` when no model is ready and `ProblemLLM` for an ordinary request failure. If the user stops a card-streaming answer, the draft remains in the card without insertion. That path does not deliver the instruction either.

### Next

A failure blocks delivery, but a successful response can still be incomplete. The next step shows why length truncation forces the answer card.

### Sources

Public baseline: same as Step 1.

- Strict echo retry, retention of the first answer and the final failure condition: `Voxt/internal/session/write.go:219-265`.
- Echo and language-mismatch heuristics: `Voxt/internal/compose/translate.go:40-79,136-187`.
- Spoken Translate skip, timeout and other write failures: `Voxt/internal/session/write.go:156-164,184-187,239-286,418-430`.

## Step 8 · A truncated answer goes only to the answer card

> **In one line:** When Translate or Rewrite reaches the model's length limit, the available text goes to the answer card for review instead of inserting or replacing unseen.

### On the stage

- The stage builds in order: the truncated answer fills the model card, moves into the answer card, and the end state and zero unseen inserts close the step.
- The left card holds the constructed Translate answer “大家早上…”. `finish_reason = “length”` means the model stopped at its length limit. The ellipsis marks possible incompleteness; it is not three literal dots in the answer.
- The right card is one answer card. It keeps the received text so the user can review it before choosing how to use it.
- The session is `Done` with `ProblemTruncated` and `Degraded = true`. It is not Step 7's request-failure state, `Failed`.
- There are zero unseen inserts. An incomplete answer can neither go straight into the app nor replace the original selection.

### Formula

$$
C=1,\qquad U=0
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $C$ | Answer cards receiving this incomplete answer | The truncation branch in `write` forces `ReasonCard`: 1 |
| $U$ | Unseen inserts or replacements of this truncated answer | The truncation branch blocks direct delivery: 0 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---:|
| Destination of the incomplete answer | $C$ | 1 answer card |
| Unseen inserts | $U$ | 0 |

These are not word counts or a token limit. This chapter invents no model length setting. `length` is the finish reason returned by the model, and the code uses it to choose the safe exit.

### Why this is neither failure nor direct delivery

The request returned partial content successfully, so the final state is degraded `Done`, not `Failed`. But the model did not report normal completion, and a sentence can stop halfway. Direct insertion would put incomplete text into the active app; replacing a selection could also remove the complete source.

This rule lives in `write` and covers `Translate` and `Rewrite`. A disabled card preference or a directly replaceable selection cannot bypass the forced answer card after truncation. Step 7's failed request and this step's truncated response are different exits.

### Next

The answer card blocks unseen delivery. Chapter 7 follows focus, password fields, paste confirmation and clipboard restoration to show when text can land safely.

### Sources

Public baseline: same as Step 1.

- Meaning of `length` and the truncation check: `Voxt/internal/llm/llm.go:130-136`; `Voxt/internal/session/write.go:341-345,397-415`.
- Forced answer card and `Done + ProblemTruncated + Degraded`: `Voxt/internal/session/write.go:276-286`; `Voxt/internal/session/session.go:119-122`.
- Public tests confirm no insertion or replacement and answer-card delivery: `Voxt/internal/session/write_test.go:123-134`.
