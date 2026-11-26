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

## Step 2 · Separate stable instructions from this run's input

> **In one line:** A request orders messages as `system → history → user`, keeping stable instructions in `system` and this run's input in `user`.

### On the stage

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
