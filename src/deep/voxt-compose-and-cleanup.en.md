## Step 1 · Choose a task after recognition

> **In one line:** Recognition can feed Transcribe, Translate or Rewrite; in Rewrite, the spoken words are an instruction rather than the content to rewrite.

### On the stage

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
