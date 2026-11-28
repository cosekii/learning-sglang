## Step 1 · Name tags: the gate

> **In one line:** Chapter 13's final lines have words and times but no names; the system track gets name tags only in a full meeting, with MTD installed, and a zh or en language — the mic track is always `me`.

### On the stage

- The top panel is the **system track's final lines** from Ch. 13: `00:05 · let's review the budget`, `00:40 · sure, starting with March`, `01:59 · sounds right` — each with a dashed `?` where a name would go.
- Three checks appear one at a time: **1 · a full meeting** (subtitles and recording modes get no tags), **2 · the name-tag model installed** (MOSS-Transcribe-Diarize, MTD), **3 · the meeting language is zh or en** (the two MTD knows).
- The `?` marks become tags: `s1`, `s2`, `s2`. The **mic track** line `00:14 · sounds good` gets `me`.
- The legend: blue `s1` one voice, amber `s2` another voice, grey `me` you, on the mic track.
- Two lines: a failed check keeps Ch. 13's plain transcript; the chapter map — the gate (1), the hand-off (2), two-minute requests (3), the carry (4), the anchor (5), the evidence (6).

### Why three checks

`Mode.Diarize()` is true only for a full meeting (`mode.go:17-19`): subtitles mode records only the system track and recording mode only the mic, and neither diarizes. The diarizer itself exists only when MTD is installed (`meeting_asr.go:33-48`) and the meeting's language — its own setting, else the main language's hint — matches MTD's language list, `zh` and `en` (`meeting_asr.go:51-60`; `models.go:267-268`). An empty hint means the language is unknown, and an unknown language also gets no diarizer: a wrong-language transcription would be worse than none. Any failed check leaves the track on Chapter 13's plain file route.

Only the system track is diarized (`finalize.go:147-156`). The mic track holds one voice — yours — so a mic line with no speaker is stored as `me` (`finalize.go:396-401`); no model is needed for that.

### Next

MTD is a second speech model, and only one speech-model server runs at a time. Step 2 shows the hand-off.

## Step 2 · One speech model at a time

> **In one line:** The final pass reads the mic track with your selected model, releases that model's hold so its server can stop, then starts MTD in the same slot and reads the system track with it.

### On the stage

- Left: **the final pass** (Ch. 13) with its two tracks in order: `mic.wav` reading with the selected model, then `system.wav` waiting its turn.
- Right: **the single server slot**. It first holds `Qwen3-ASR`, your selected model, marked *held*; then the hold releases and the slot empties; then `MOSS-Transcribe-Diarize` starts in the same slot, and the system track enters it.
- Two lines: MTD cannot start while the selected model's server lives, so the pass lets it go after the mic track. The formula: mic (selected model) → release → system (MTD).

### The hold release, in code

The final pass holds the selected speech model for the whole pass so its server stays loaded (`finalize.go:37-46`). It walks the mode's sources in order — mic, then system — and just before the system track's diarize it releases the hold (`finalize.go:50-56`): the code's own note says MTD cannot start until the selected speech model's hold lets its server stop. One speech-model server runs at a time on the runtime, so the hand-off is: finish the mic track, release, start MTD, read the system track.

The `Qwen3-ASR` on the stage is one example of the selected model; whichever model the meeting uses, the order is the same.

### Next

MTD reads the system track in pieces. Step 3 shows how big one piece is and what one request answers.

## Step 3 · Two minutes a request

> **In one line:** The system track is cut at two minutes a request, a cut at the cap restarts one second early, and every request answers with lines that start with a timestamp and a speaker label, stored as `s1`, `s2`.

### On the stage

- A three-minute `system.wav` timeline (constructed). **Request 1** brackets 0:00–2:00; **request 2** brackets 1:59–3:00, and the one-second overlap 1:59–2:00 is shaded: a cut at the cap restarts 1 s early.
- The shared instruction, shortened: "start each segment with a timestamp and a speaker label ([S01], [S02], …)".
- Request 1's answer: `[S01] 00:05 · let's review the budget`, `[S02] 00:40 · sure, starting with March`, `[S02] 01:59 · sounds right`.
- The stored form: S01 → `s1`, S02 → `s2` (the leading zero drops), and the reason for two minutes: a dictation waits at most one request, and the model's own split is 20 min.

### Formula

$$ \text{request}_i \le 2\ \text{min}, \qquad \text{start}_{i+1} = \text{cut}_i - 1\ \text{s} \quad (\text{hard cut}) $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| 2 min | the most one MTD request covers | 120 s | `finalize.go:175-178` (`diarizeChunkMax`) |
| 1 s | how far before a hard cut the next chunk restarts | 1 s | `chunks.go:26-38` (`HardOverlap`) |
| 20 min | the native decoder's own split | 20 min | `finalize.go:175-177` (comment) |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| requests over a 3-minute track | 0:00–2:00, then 1:59–3:00 | 2 requests |
| overlap | 2:00 − 1:59 | 1 s |

### Why two minutes, and why the overlap

Every request carries a fixed cost, so a larger cap would mean fewer requests — but the runtime lets a dictation in between requests, and the code's comment picks two minutes so a dictation waits at most one request; it is also far from the native decoder's own 20-minute split (`finalize.go:175-178`). The pause rule is set to the same two minutes, so cuts land at the cap instead of at every pause — the fixed per-request cost would dominate a pause-rich track (`finalize.go:189-196`). A hard cut restarts one second early (`chunks.go:26-38`), which is why Step 5 has a twice-heard line to work with. Every request carries MOSS's own instruction asking for a timestamp and a speaker label per segment (`finalize.go:179-183`), and a stored label drops the S and the leading zero: S02 → `s2` (`finalize.go:282-297`).

### Next

The model numbers the voices it hears from S01 every request. Step 4 shows how the numbers still continue across requests.

## Step 4 · The carry

> **In one line:** Every request numbers voices from scratch, so each request after the first carries the last labeled lines — "the same voices keep their labels" — and the answer continues the earlier numbers.

### On the stage

- **Request 2** (audio 1:59–3:00 + the instruction): it hears "sounds right" first, the voice request 1 called S02 — but every request numbers voices from S01.
- **The carry** appears inside request 2: the last labeled lines — `[S01] let's review the budget`, `[S02] sure, starting with March`, `[S02] sounds right` — with the note "the same voices keep their labels".
- Request 2's answer continues the numbers: `[S02] sounds right` (heard before) and `[S02] 02:30 · I'll send the file`.
- Three lines: the twice-heard line is dropped (request 1 already stored it), the new line stores as `s2 02:30 · I'll send the file`, and the carry is the last labeled lines, at most a 300-rune screen.

### Formula

$$ \text{carry} = \text{the last labeled lines, trimmed to} \le 300\ \text{runes} $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| carry | the labeled lines riding in the next request's prompt | ≤ 300 runes | `finalize.go:215-222`, `270-272` |
| 300 runes | about a screen of the most recent lines | 300 | `finalize.go:270-272` |

### The carry, in code

The model's own decoder starts its labels over per chunk, so `diarizeTrack` builds each request after the first with an extra prompt part: "This recording's earlier part ended with these labeled segments; the same voices keep their labels", followed by the carry (`finalize.go:215-222`). The carry collects the lines as they are emitted, in the prompt's own format (`s2` is written back as `S02`, `finalize.go:299-313`), and is trimmed to the last 300 runes (`finalize.go:258-272`). A line the previous chunk already returned — ending at or before the covered point — is skipped, so "sounds right" is stored once (`finalize.go:233-240`).

### Next

The carry asks nicely; Step 5 shows the safety net for when the model renumbers anyway.

## Step 5 · The anchor

> **In one line:** If a request still numbers a twice-heard voice from scratch, matching words fold this request's number back to the earlier tag — and every line of that voice in this chunk follows.

### On the stage

- Request 2's answer comes back **numbered from scratch**: `[S01] sounds right`, `[S01] 02:30 · I'll send the file` — the same voice request 1 called S02.
- **The overlap check**: "sounds right" was heard twice — request 1 already stored it as `s2`; the words match: "sounds right" = "sounds right" (2 ≥ 2).
- **The anchor**: this request's S01 = the earlier s2. Both lines fold back: `s2 sounds right` dropped as heard before, `s2 02:30 · I'll send the file` stored.
- Two lines: only a twice-heard line can anchor — a voice missing from the overlap keeps the model's number, so the carry (Step 4) does the main work; a one-word line anchors nothing.

### Formula

$$ \text{anchor}(c) = s \quad \text{if a repeated line labeled}\ c\ \text{matches an earlier line of}\ s,\quad \text{words} \ge 2 $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $c$ | a label this chunk gave a voice | S01, S02, … | the chunk's answer |
| $s$ | a speaker the earlier chunks stored | s1, s2 | the earlier chunks |
| repeated line | a line ending at or before the covered point | ≤ 2:00 here | `finalize.go:321-332` |
| 2 | the fewest words that anchor anything | 2 words | `finalize.go:333-336` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| words in "sounds right" | "sounds", "right" | 2 |
| anchor threshold | at least 2 words | 2 ≥ 2 ✓ |

### What the anchor can and cannot fix

`anchorSpeakers` looks only at lines the model repeated from audio the previous chunk already returned (ending at or before the covered point). A repeated line whose words match one of the last eight labeled lines — equal, or the shorter a prefix of the longer, since a cut can clip the repeated line — pins this chunk's label for that voice to the earlier speaker (`finalize.go:321-357`). The mapping then applies to every line this chunk gave that label, so the voice's new lines follow. A one-word line anchors nothing: too many voices say it (`finalize.go:333-336`). A voice that does not appear in the overlap keeps whatever number the model gave it — the stage's boundary line — which is why the carry (Step 4) does the main work; the anchor repairs only what the overlap proves.

### Next

Steps 1–5 are the mechanism. Step 6 asks what the public sample proves about how well it works.

## Step 6 · What the public sample proves

> **In one line:** On clean synthetic voices the public sample labels 11 of 11 segments — scored under the old rule, with real noise, overlap, far-field and five or more speakers untested: an upper bound, not a promise.

### On the stage

- **The sample** (public, 2026-11-16): synthetic voices — a model reading lines, not real people — spliced with 1.5 s of quiet, the layout (who speaks when) known; 2 / 3 / 4 speakers. A segment is a transcript line.
- The result: **11 / 11 segment labels correct · 3 rounds identical**.
- Text errors on one 0–20% scale: the name-tag task 1.1–2.9%, the plain-text instruction 17.9%.
- Three caveats: scored under the old rule (a label counted right if its lines mostly matched one voice; the rule is stricter now, the rerun is pending); clean voices taking turns, no overlap — noise, overlap and far-field are untested; the code sets no four-person cap, five or more is simply unproven.
- The closing question: every line has a name — how do you correct, summarize, ask and export this transcript?

### Formula

$$ \text{labels correct} = \frac{11}{11} \quad (2/3/4\ \text{speakers, synthetic, old scoring rule}) $$

| Symbol | What it is | Size | From |
|---|---|---|---|
| 11 | the segments across the 2-, 3- and 4-speaker clips | 2 + 4 + 5 | `MTDEvaluation.zh-CN.md`, multi-speaker table |
| 1.5 s | the quiet spliced between voices | 1.5 s | `MTDEvaluation.zh-CN.md` |
| 3 | the timing rounds, all identical | 3 | `MTDEvaluation.zh-CN.md` |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| segment labels | 2/2 + 4/4 + 5/5 | 11/11 |
| text error, name-tag task | three clips | 1.1–2.9% |
| text error, plain-text instruction | the same model, plain task | 17.9% |

### Reading the evidence

The sample is `Voxt/docs/MTDEvaluation.zh-CN.md` (2026-11-16, Apple M5 Max): clips of synthetic voices (Qwen3-TTS) spliced with 1.5 s of quiet, so the layout is known exactly. The document itself flags that the perfect score used the old scoring rule — each predicted label attributed to its majority voice, counting only the last round — and that the rule was tightened the same day to best one-to-one label-to-voice matching over all three rounds, with the rerun still pending. So 11/11 is not a confirmed result under the stricter rule. The voices are clean and take turns: noise, overlapping speech and far-field audio are untested, and nothing in the code caps diarization at four speakers — five or more is unproven, not forbidden. The text-error pair shows the name-tag task is the model's native one: 1.1–2.9% against 17.9% when the same model is asked for plain text.

### Next

Chapter 15 works on the labeled transcript: correct, summarize, ask and export, in order.
