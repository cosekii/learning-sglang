## Step 1 · After the meeting: the chain

> **In one line:** The labeled transcript is stored; with the auto switch on, correct and summarize run by themselves in that order, while ask and export wait for a click — and a failed correction still leads to a summary on the recognised text.

### On the stage

- The top panel is **the stored transcript** from Ch. 14: five lines, each with a time and a speaker tag — `Me` (grey, you on the mic) and `Speaker 1` (amber, the other side).
- Two boxes appear one at a time: **CORRECT · runs by itself** (fixes misheard words) and **SUMMARIZE · runs by itself** (writes a title and to-dos).
- Two more appear below, marked **you click**: **ASK** (questions about the meeting) and **EXPORT** (clipboard or file).
- The chain line: `transcript → correct → summary · runs by itself`, and the boundary: a failed correction still leads to a summary — it reads the recognised text.
- Two lines: a switch in settings turns the auto chain off; the chapter map — the chain (1), correct (2), summarize (3), ask (4), export (5), the evidence question (6).

### The chain, in code

When the final pass finishes and `NoAutoSummary` is off, `runFinalize` launches `correctAndSummarize` in the background (`manager_finalize.go:53-99`). That helper corrects the transcript first and summarizes second (`manager_finalize.go:121-133`). Each step only logs a warning on failure: a correction that fails leaves the summary to run on the text as recognised — the same per-part fallback dictation uses (behavior.md 5.31a, Ch. 6). The switch is a meeting setting (`settings/meeting.go:14`); both jobs can also be re-run by hand from the meeting page (`meeting_link.go:247`, `meetings_detail_controller.go:214`).

Not expanded in this deep dive: the speculative overlap that corrects the first track while the second track is still transcribing (`manager_finalize.go:63-75`, `correct_overlap.go`). Its finished batches are reused by the correction in Step 2; it changes no outcome this chapter shows.

### Next

Correction first: Step 2 shows how the lines reach the language model, and what happens to a line the answer skips.

## Step 2 · Correct: in batches

> **In one line:** The lines go to the language model as a JSON list, at most 250 lines or 20,000 runes a request; a line the answer skips keeps its recognised text, and only words ever change.

### On the stage

- **The stored transcript** (constructed): five lines, line 1 with the mishearing `can Preeya join Thursday`.
- **One batch holds** at most 250 lines and 20,000 runes: `5 ≤ 250 lines · 106 ≤ 20,000 runes → 1 request`.
- **The request · one JSON list**: `[{"i":1,"text":"can Preeya join Thursday"}, …]`, with the dictionary riding along (Ch. 8): Preeya → Priya.
- **The answer → stored**: line 1 comes back as `can Priya join Thursday` (fixed); line 4 is missing from the answer and stays as recognised; times, speakers and order never change — only words.
- One boundary line: a failed batch keeps its lines; the rest land in one save (Ch. 6's per-part fallback).

### Formula

$$ \text{batches} = \text{split at } 250\ \text{lines or } 20{,}000\ \text{runes, whichever comes first} $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| 250 lines | the most lines one correction request carries | 250 | `correct.go:31-34` (`correctBatchLines`) |
| 20,000 runes | the most text one request carries | 20,000 | `correct.go:31-34` (`correctBatchRunes`) |
| 106 runes | the five lines' text, labels excluded | 24 + 28 + 21 + 12 + 21 | counted on the stage's lines, as `correctionBatches` counts |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| lines in the batch | the five stored lines | 5 ≤ 250 ✓ |
| runes in the batch | 24 + 28 + 21 + 12 + 21 | 106 ≤ 20,000 ✓ |
| requests for this meeting | one batch | 1 |

### What lands and what stays

`CorrectTranscript` walks the batches; the answer is a JSON array of `{"i", "text"}` pairs, parsed between its first `[` and last `]`, and a pair whose `i` was not asked or whose text is empty corrects nothing (`correct.go:160-183`). A line the answer leaves out stays as recognised; a batch whose request fails keeps all its lines, and the other batches still land — in one atomic `UpdateSegmentTexts` save, so a failed save lands nothing (`correct.go:60-105`). Times, speakers and order are not part of the request at all. The system prompt carries the rules (fix mishearings, drop stutters, change nothing else), the speech context, the dictionary terms that match this text and the dictionary notes (`correct.go:36-58`, `138-158`) — Ch. 8's `Preeya = Priya` pair is how the stage's fix is spelled right.

### Next

The corrected transcript is stored. Step 3 shows what the summary reads — and what it reads when correction failed.

## Step 3 · Summarize: what it reads

> **In one line:** The summary re-reads the stored transcript — corrected text if correction landed, recognised text if it failed — in windows of 12,000 runes, and answers with one JSON object: a title, a body and to-dos.

### On the stage

- **The summary re-reads the store**: the transcript as `Speaker：text` record lines — `Me：can Priya join Thursday`, `Speaker 1：she reviews the budget first`, and three more.
- `145 ≤ 12,000 runes → 1 window`.
- **The answer · one JSON object**: `title · "Thursday plan"`, `content · "Priya joins Thursday; budget first, then the file…"`, `todo_list · ["Speaker 1 sends the file Friday"]` — stored on the meeting row as title + summary.
- **The same call at full length** (constructed, about three hours): `100,000 runes → 9 windows → 9 short summaries → 3 → 1`; every round cuts each answer to 4,000 runes and groups again.
- One line: the summary is written in your main language.

### Formula

$$ \text{rounds:}\quad 100{,}000 \to \left\lceil \tfrac{100{,}000}{12{,}000} \right\rceil = 9 \to 9 \times 4{,}000 = 36{,}000 \to 3 \to 1 $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| 12,000 runes | one summary window | 12,000 | `summary.go:15-17` (`summaryWindowMax`) |
| 4,000 runes | the cap on each intermediate summary | 4,000 | `summary.go` (`GenerateSummary`) |
| 145 runes | the five record lines plus newlines | 26 + 38 + 31 + 15 + 31 + 4 | counted on the stage's lines |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| windows for the five-line meeting | 145 ≤ 12,000 | 1 |
| windows for the full-length call | ⌈100,000 / 12,000⌉ | 9 |
| second round | 9 answers ≤ 4,000 runes each, grouped at 12,000 | 3 |
| third round | 3 answers ≤ 4,000 runes, one group | 1 |

### The re-read, in code

`GenerateMeetingSummary` loads the meeting and its segments from the store *after* correction, so it sees whatever text is stored — corrected when correction landed, recognised when it failed (`manager_summary.go:23-31`). The record is one `Speaker：text` line per segment with a fullwidth colon (`summary.go:111-125`); labels come from `SpeakerLabel`: `me` is Me, `s1` is Speaker 1 or the name the user gave it (`summary.go:96-109`). A transcript longer than one window is summarised hierarchically: each window's answer is trimmed to 4,000 runes and the answers are grouped and summarised again until one remains (`summary.go:15-17`, `GenerateSummary`). The final answer is one JSON object with `transcript_summary` (title, content) and `todo_list`; the title and the encoded summary are written on the meeting row (`summary.go:20-90`, `manager_summary.go:55-66`). Everything is written in the user's main language, or the transcript's majority language when that is unset (`manager_summary.go:84-92`, `summary.go:148-152`).

### Next

The summary is one compressed reading of the transcript. Step 4 shows what a question about the meeting reads.

## Step 4 · Ask: picking windows

> **In one line:** A question picks the transcript windows that mention its words — at most three, within 6,000 runes — and the answer is saved to the meeting's chat; the transcript outranks the summary.

### On the stage

- **The full-length call · 17 windows** (constructed): one window is up to 6,000 runes of transcript.
- **The question** `who will send the file?`: its words — who · will · send · the · file — and window 12 lights up: it mentions "send" and "file".
- `6,000 ≤ 6,000 runes · one window fills the budget`; at most 3 windows are picked.
- **The request carries** the question, the earlier Q&A, the summary and window 12; **the transcript outranks the summary**.
- Two lines: the answer "Speaker 1, on Friday" is saved to the meeting's chat; a whole-meeting question takes the first + last window, and if the transcript does not mention it, the model says so.

### Formula

$$ \text{context} = \text{top-}3\ \text{windows by term count, within } 6{,}000\ \text{runes} $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| 6,000 runes | one follow-up window, and the whole context budget | 6,000 | `followup.go:11-14` (`FollowUpWindowMax`) |
| 3 | the most windows one question carries | 3 | `followup.go:12-13` (`followUpMaxWindows`) |
| 17 windows | the constructed 100,000-rune call | ⌈100,000 / 6,000⌉ | `SummaryWindows` at 6,000 |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| windows in the full-length call | ⌈100,000 / 6,000⌉ | 17 |
| window 12 in the budget | 6,000 ≤ 6,000 | fits alone |
| a second window after it | 6,000 + 2 + 6,000 > 6,000 | no room |

### The picking, in code

`RelevantFollowUpContext` first checks the cheap case: three or fewer windows that together fit 6,000 runes go in whole (`followup.go:67-77`). Otherwise the question is split into terms — every word of two letters or more, plus CJK bigrams (`followup.go:184-212`); the stage shows only the deciding words. A whole-meeting question ("overall", "entire", "总结", …) skips scoring and takes the first and last window (`followup.go:214-226`). Scored windows are ranked by term count, best first, and joined in that order until the 6,000-rune budget runs out (`followup.go:79-105`, `joinFollowUpSelectedWindows`). The system prompt names the transcript the primary source and the summary and chat only compressed context, and asks the model to say when the transcript does not answer (`followup.go:22-38`). The question and answer are appended to the meeting's stored chat, so the next question sees them (`manager_followup.go:38-63`).

### Next

Everything so far stays inside the app. Step 5 takes the transcript out: copy and export.

## Step 5 · Export: txt or Markdown

> **In one line:** Copy puts the plain-text version on the clipboard; Save… writes a .txt or .md file through a file dialog — both from the same stored lines.

### On the stage

- **The stored lines · two buttons**: `00:05 · Me · can Priya join Thursday`, `00:40 · Speaker 1 · she reviews the budget first · +3 more`, with **Copy** and **Save…**.
- **Copy → the clipboard · plain text**: `00:05 Me can Priya join Thursday`, `00:40 Speaker 1 she reviews the budget first`, `01:10 Speaker 1 then we send the file` — time · name · text, one line each.
- **Save… → a file dialog writes** `Thursday plan.txt`.
- **The .md variant**: `# Thursday plan`, then `**00:05** Me can Priya join Thursday`.
- One line: labels — `me → Me`, `s1 → Speaker 1`; a translated line rides as `-> ` (txt) or `> ` (md).

### Formula

$$ \text{txt line} = \texttt{mm:ss}\ \text{Name}\ \text{text} \qquad \text{md line} = \texttt{**mm:ss**}\ \text{Name}\ \text{text} $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| `mm:ss` | the line's start, rounded to the second; hours appear past 1 h | 00:05 | `export.go:62-75` (`formatExportTime`) |
| Name | the stored speaker as a label | Me, Speaker 1 | `summary.go:96-109` (`SpeakerLabel`) |
| `-> ` / `> ` | where a translated line rides | per line | `export.go:44-52`, `33-42` |

### The two buttons, in code

Copy builds the plain-text export from the stored segments and writes it to the clipboard (`meetings_detail_controller.go:246-254`, `export.go:17-31`). Save… builds the same lines as `.txt` or the Markdown variant as `.md`, names the file from the meeting's title with `/` and `:` replaced, and writes it where the file dialog says (`meetings_detail_controller.go:256-289`, `export.go:33-42`). Empty lines are skipped in both formats (`export.go:17-52`). The export reads the same stored rows the summary read — corrected text when correction landed — and labels each line from its stored speaker (`summary.go:96-109`).

### Next

Four jobs, one stored meeting. Step 6 lines them up: what each reads, what each writes.

## Step 6 · One meeting row, four jobs

> **In one line:** Correct, summarize, ask and export all read the same meeting row; the chain is done — which of these claims have tests or evaluation evidence?

### On the stage

- Four rows appear one at a time:
  - **correct** — reads: stored lines + your dictionary; writes: rewrites words only — times, speakers, order stay.
  - **summarize** — reads: the stored transcript, corrected or not; writes: title + summary + to-dos.
  - **ask** — reads: picked windows + summary + earlier Q&A; writes: appends the answer to the chat.
  - **export** — reads: the stored lines; writes: the clipboard or a file.
- The closing question: the chain is done — which of these claims have tests or evaluation evidence?

### The map, in code

Every job in this chapter starts from the same place: `Store.Meeting`, the stored row and its segments (`correct.go:60-66`, `manager_summary.go:23-31`, `manager_followup.go:16-24`, `meetings_detail_controller.go:246-289`). Correction writes segment texts back (`correct.go:99-105`), the summary writes the title and summary columns (`manager_summary.go:55-66`), a follow-up appends to the chat column (`manager_followup.go:52-63`), and export writes nothing — it reads. Three of the four jobs call the language model; export is the only one that cannot fail for lack of one.

### Next

Chapter 16 puts a magnifying glass on the whole book: which claims carry code tests, sample evaluations or real-device checks, and what stays unproven.
