## Step 1 · The deadline: two player timelines

> **In one line:** the player plays 800 ms chunks one after another in the order they arrive; if the next has not arrived, the sound stops, and how long it stops is the gap.

### On the stage

- Two timelines; the black tick `request` at the left is when the request was sent. The top row is ON TIME, the bottom ONE CHUNK LATE.
- The "chunk arrives" row: numbered black ticks, the moment chunk $i$ arrives.
- The "the player plays" row: a white box per chunk, 800 ms wide, filling light from left to right as it plays.
- Grey dotted lines: from an arrival tick to where that chunk starts playing, a chunk that is in and waiting for the one before to finish.
- The red hatched block "gap · 300 ms of silence": only on the bottom row.
- The blue bracket "time to first audio": top row, from `request` to chunk 1's arrival.
- The faint vertical line is now; the step loops.

### Formula

$$
\begin{gathered}
t_{\text{chunk}} = N \times t_{\text{frame}},\qquad
s_i = \max(a_i,\ e_{i-1}),\\
e_i = s_i + t_{\text{chunk}},\qquad
\text{gap}_i = \max(0,\ a_i - e_{i-1})
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{frame}}$ | the length of one frame of sound | 80 ms | Ch. 19 Step 6: 1,920 samples ÷ 24,000 a second |
| $N$ | frames per chunk | 10 | Ch. 19 Step 6; `stream_chunk_size=10` |
| $t_{\text{chunk}}$ | how long a chunk plays, and the width of each white box | 800 ms | this step |
| $a_i$ | when chunk $i$ reaches the player (the numbered tick) | | this step, illustrative |
| $s_i$ | when chunk $i$ starts playing | | this step |
| $e_i$ | when chunk $i$ finishes; chunk 1 has nothing before it and plays on arrival | | this step |
| $\text{gap}_i$ | the silence before chunk $i$ | | this step |

The rule says a chunk starts only when both hold: it has arrived, and the one before has finished.

### The numbers on the stage

Times in ms from `request`.

| Row | $i$ | $a_i$ | $s_i = \max(a_i, e_{i-1})$ | $e_i$ | $\text{gap}_i$ |
|---|---|---|---|---|---|
| on time | 1 | 450 | 450 | 1,250 | 0 |
| on time | 2 | 1,000 | max(1,000, 1,250) = 1,250 | 2,050 | 0 |
| on time | 3 | 1,700 | max(1,700, 2,050) = 2,050 | 2,850 | 0 |
| one late | 1 | 450 | 450 | 1,250 | 0 |
| one late | 2 | 1,550 | max(1,550, 1,250) = 1,550 | 2,350 | **300** |
| one late | 3 | 2,150 | max(2,150, 2,350) = 2,350 | 3,150 | 0 |

- On the top row chunks 2 and 3 arrive early and wait (grey dotted lines), and the sound never stops.
- On the bottom row chunk 2 arrives $1{,}550 - 1{,}250 = 300$ ms after chunk 1 ends; those 300 ms are silence, and every later chunk shifts by 300 ms.
- Time to first audio is $a_1 = 450$ ms. The arrival times are made up; the rule is not.

### How SGLang-Omni measures gaps

`benchmarks/metrics/playback_continuity.py` uses this rule: it replays each request by arrival time, records its longest gap, and counts how many requests keep that within 50, 100 and 200 ms (`CONTINUITY_THRESHOLDS_MS = (50, 100, 200)`). That is the second footnote.

### Next

Steps 2 and 3 compute $a_i$ for two decoders: one that waits for every frame, one that decodes every 10.

## Step 2 · Without streaming: code2wav waits for the whole answer

> **In one line:** code2wav is called once, at the end, so the first sound waits for the last frame: 10.24 s at the pace drawn.

### On the stage

- Three rows, the path a frame of sound takes: "talker writes frames" (blue, ten to a group, alternating shades), "code2wav decodes" (middle, empty, reading "waits for all 250 frames"), "the player plays" (bottom).
- The player row is red hatch from the request on, with "silence, from the request on" in red below; when the animation reaches 4 s, "first sound at 10.24 s →" appears at the right.
- A 0–4 s time axis; "frames 1–10" and "11–20" above the talker row mark the first two groups.
- Two footnotes: the illustrative pace and where 250 frames comes from; a request that asks for its sound whole gets this.

### Formula

$$
n_{\text{frame}} = \frac{T_a}{t_{\text{frame}}},\qquad
a_1 = t_0 + n_{\text{frame}} \times t_{\text{gen}} + t_{\text{dec}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $T_a$ | the length of the spoken answer | 20 s | Ch. 16 Step 1 |
| $t_{\text{frame}}$ | the length of a frame | 80 ms | Step 1 |
| $n_{\text{frame}}$ | frames in the answer | 250 | Ch. 16 Step 3 |
| $t_0$ | time before the talker's first frame | 200 ms | this step, illustrative |
| $t_{\text{gen}}$ | time for the talker to write a frame | 40 ms | this step, illustrative: twice real time |
| $t_{\text{dec}}$ | time for one code2wav call | 40 ms | this step, illustrative |
| $a_1$ | when the first (and only) sound arrives | | Step 1's notation |

Frame $n$ is written at $t_0 + n \times t_{\text{gen}}$.

### The numbers on the stage

- $n_{\text{frame}} = 20{,}000 \div 80 = 250$ frames.
- Frame 250 is written at $200 + 250 \times 40 = 10{,}200$ ms, the stage's "10.2 s".
- Add one call: $a_1 = 10{,}200 + 40 = 10{,}240$ ms = 10.24 s, far past the right edge of the 4 s drawn.
- At the real pace of 80 ms a frame: $200 + 250 \times 80 = 20{,}200$ ms, about the answer's own 20 s. Time to first audio grows with the length of the answer.

### This case in the source

The second footnote: SGLang-Omni itself always decodes window by window as frames arrive; when a request does not stream, code2wav keeps each window's sound in its state (`Code2WavStreamState.audio_parts`) and sends it all at the end. The listener hears what this step shows; only code2wav's work is not piled up at the end.

### Next

Step 3 changes one thing: code2wav runs every 10 frames.

## Step 3 · Streaming: decode every 10 frames

> **In one line:** code2wav decodes and sends 800 ms of sound every 10 frames; while chunk 1 plays, the next 10 frames are written and decoded, so chunk 2 is ready 400 ms early.

### On the stage

- The same three rows, pace and 0–4 s as Step 2.
- The "code2wav decodes" row: a small dark block after each group of 10 frames, one 40 ms call; the first three are numbered 1, 2, 3.
- Grey dotted lines and small triangles: a call ends and its chunk goes to the player.
- The player row: chunk 1, chunk 2, … back to back, filling light as they play.
- The blue bracket "chunk 2 ready 400 ms before chunk 1 ends".
- Two lines: the next group is written while one plays; 16 steps a frame, so under 5 ms a step keeps up.
- Footnotes: what each colour means; the measured real-time factor of 0.38.

### Formula

$$
\begin{gathered}
a_i = t_0 + i \times N \times t_{\text{gen}} + t_{\text{dec}}\\
N \times t_{\text{gen}} + t_{\text{dec}} < t_{\text{chunk}}
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $a_i$ | when chunk $i$ reaches the player | | Step 1 |
| $t_0,\ t_{\text{gen}},\ t_{\text{dec}}$ | start-up time, time per frame, time per call | 200, 40, 40 ms | Step 2 |
| $N$ | frames per chunk | 10 | Step 1 |
| $t_{\text{chunk}}$ | how long a chunk plays | 800 ms | Step 1 |

The inequality on the right is the condition for keeping up: writing 10 frames plus one call must take less than playing one chunk.

### The numbers on the stage

- $a_1 = 200 + 1 \times 400 + 40 = 640$ ms, $a_2 = 1{,}040$, $a_3 = 1{,}440$.
- Step 1's rule: $s_1 = 640$, $e_1 = 1{,}440$; $s_2 = \max(1{,}040,\ 1{,}440) = 1{,}440$.
- Chunk 2 is ready $1{,}440 - 1{,}040 = 400$ ms early, the blue bracket.
- Time to first audio falls from Step 2's 10,240 ms to 640 ms.
- Keeping up: $10 \times 40 + 40 = 440 < 800$ ms.

### At the real pace

| Quantity | Arithmetic | Result |
|---|---|---|
| steps per frame | 1 talker step + 15 code predictor steps (Ch. 16 Step 3) | 16 |
| steps per chunk | $10 \times 16$ | 160 |
| the most a step may take | $800\ \text{ms} \div 160$ | **5 ms** |

Each of the 16 steps waits for the one before, so they cannot run in parallel; 5 ms is the limit for one step of the whole batch.

### Real-time factor

Real-time factor (RTF) = the time to make the sound ÷ the sound's length; below 1 keeps up. The footnote's 0.38 means an 800 ms chunk took about $0.38 \times 800 \approx 304$ ms to make on average. It is a mean over whole requests, so it shows the average pace is enough, not that no chunk was ever late.

SGLang-Omni's current source no longer has 0.38: the reference for Qwen3-Omni's speech-synthesis test (`QWEN3_OMNI_TTS_P95` in `tests/test_model/omni_ci_config.py`, 16 at once) is now `rtf_mean: 0.2743`.

### Next

Step 4 opens code2wav's stage to show what happens inside the dark blocks.

## Step 4 · Inside code2wav's stage

> **In one line:** code2wav keeps two counts per request, frames received and frames sent; at 10 new frames it decodes a window, and when the talker is done it sends what is left, even if fewer than 10.

### On the stage

- The blue box `talker_ar` at the left, "edge 8, Ch. 18 Step 1": codes come in over that edge.
- "this request's state": 34 small cells, one per frame. White is not yet in, blue is received but not yet sound, dark is sent as sound.
- Two brackets above the cells: grey dashed "earlier $k$" and blue "new $m$", the window being decoded (Step 5 says why the earlier frames go in).
- Under the cells, "$x$ received · $y$ sent as sound".
- The `code2wav` box at the right, filled dark while decoding.
- The "now:" line says what is happening; each phase holds 5 s.
- "sound sent out": one more piece after each decode, labelled in ms; the line below gives the route: outbox → coordinator (Ch. 18 Step 10) → the client, as stream events (Ch. 9 Step 9).
- At the end the state fades: "the request is finished: its state is cleared".

### The rule

$$
\begin{gathered}
\text{decode when}\ n_{\text{recv}} - n_{\text{sent}} \ge N
\\ \text{or}\ \ (\text{the talker is done and}\ n_{\text{recv}} - n_{\text{sent}} > 0)
\end{gathered}
$$

$$
\begin{gathered}
\text{window} = \min(n_{\text{ctx}},\ n_{\text{sent}}) + (n_{\text{recv}} - n_{\text{sent}}),\\
\text{sent} = (n_{\text{recv}} - n_{\text{sent}}) \times t_{\text{frame}}
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n_{\text{recv}}$ | frames received (blue + dark cells) | 0–34 | this step; `len(state.chunks)` in the source |
| $n_{\text{sent}}$ | frames already sent as sound (dark cells) | 0–34 | this step; `state.emitted` in the source |
| $N$ | frames per chunk | 10 | Step 1 |
| $n_{\text{ctx}}$ | the most earlier frames a window takes | 25 | Ch. 17 Step 11; `left_context_size=25` |
| $t_{\text{frame}}$ | the length of a frame | 80 ms | Step 1 |

### The numbers on the stage

The 34 frames make four windows, the lines that appear in turn after "now:":

| Window | $n_{\text{sent}}$ | earlier + new | why it decodes | sent |
|---|---|---|---|---|
| 1 | 0 | $\min(25, 0) + 10 = 0 + 10$ | 10 new frames | 800 ms |
| 2 | 10 | $\min(25, 10) + 10 = 10 + 10$ | 10 new frames | 800 ms |
| 3 | 20 | $\min(25, 20) + 10 = 20 + 10$ | 10 new frames | 800 ms |
| 4 | 30 | $\min(25, 30) + 4 = 25 + 4$ | only 4, so it waits for the talker to finish | 320 ms |

Together $800 + 800 + 800 + 320 = 2{,}720$ ms $= 34 \times 80$ ms, every frame.

### In the source

- The scheduler is `Code2WavScheduler` (`sglang_omni/models/qwen3_omni/components/code2wav_scheduler.py`), built on `StreamingVocoderBase`, the streaming kind of Ch. 17 Step 7.
- One `Code2WavStreamState` per request: `chunks` holds the frames received, `emitted` counts the frames sent.
- Whether a window is ready: `ready(state) = len(chunks) - emitted`, compared with `window_new_frames` (10 by default).
- When the talker's stream ends, `on_stream_done` → `finish_stream` calls `decode_delta(..., is_final=True)` to send the remaining frames, then sends the final result and clears the state.
- The state is kept per request, so many requests sit in code2wav at once, each at its own point (the first line on the stage).

### Next

Step 5 answers why window 2 decodes frames 1–10 again.

## Step 5 · Joining chunks: take the frames before

> **In one line:** each moment of code2wav's sound depends on the frames before it, and when it decodes by windows it keeps nothing from the last window, so each window takes up to 25 earlier frames again and sends only the new frames' sound.

### On the stage

- A scale at the top: frame 0, 10, 20.
- DECODED ALONE: the input is two dark blocks, window 1 and "window 2: frames 11–20 only"; the sound sent below jumps at frame 10 (the red circle), with "chunk 2's start misses chunk 1's end" in red.
- WITH THE FRAMES BEFORE IT: the input is a dashed box "frames 1–10 again" plus dark "frames 11–20, new"; the wave joins at frame 10 and its second half is blue, "chunk 2 carries on from chunk 1".
- EACH WINDOW: five small bars, dashed for earlier frames and dark for the 10 new ones, labelled `1: 0 + 10 = 10` to `5: 25 + 10 = 35`.
- The waves are drawn, not real output (footnote).

### Formula

$$
w_k = \min\bigl(n_{\text{ctx}},\ N \times (k-1)\bigr) + N,\qquad
\text{kept} = N \times n_{\text{samp}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $k$ | the window's number | 1, 2, 3… | this step |
| $N$ | new frames per window | 10 | Step 1 |
| $n_{\text{ctx}}$ | the most earlier frames taken | 25 | Step 4 |
| $w_k$ | frames window $k$ decodes in all | | this step |
| $n_{\text{samp}}$ | samples of sound per frame | 1,920 | Ch. 19 Step 6; `SAMPLES_PER_FRAME` in `src/numbers.ts` |

$N \times (k-1)$ is the number of frames before window $k$, Step 4's $n_{\text{sent}}$.

### The numbers on the stage

| $k$ | earlier frames | $w_k$ | samples decoded | samples thrown away |
|---|---|---|---|---|
| 1 | $\min(25, 0) = 0$ | 10 | 19,200 | 0 |
| 2 | $\min(25, 10) = 10$ | 20 | 38,400 | 19,200 |
| 3 | $\min(25, 20) = 20$ | 30 | 57,600 | 38,400 |
| 4 | $\min(25, 30) = 25$ | 35 | 67,200 | 48,000 |
| 5 | $\min(25, 40) = 25$ | 35 | 67,200 | 48,000 |

- Each window keeps only the last $10 \times 1{,}920 = 19{,}200$ samples, which at 24,000 a second is $19{,}200 \div 24{,}000 = 0.8$ s, Step 1's chunk (the second footnote).
- From window 4 on there are at least 25 frames before it, and the cap holds $w_k$ at 35.

### Why it depends on earlier frames

code2wav is eight transformer layers that each look back over up to 72 frames, followed by convolutions that turn each frame into 1,920 samples. Both use earlier frames. Decoding by windows, each call runs the whole model on its window and keeps nothing afterwards; the thinker is different, since its KV cache carries a request's past from step to step (chapter 3).

### The source now

SGLang-Omni's PR #2909 (merged 2026-10-19) added a second path: each stream gets a codec state slot (`CodecStatePool`) holding its convolution history and k/v, and the next window decodes only the new frames. `context_frames` in `code2wav_scheduler.py` says it directly: with a slot, 0 frames are reread; without one, $\min(25, n_{\text{sent}})$. Qwen3-Omni's default speech pipeline gives code2wav one slot per request the talker can run (`codec_state_slots` in `config.py`), so on a GPU where the model supports it, the default no longer rereads. This step draws the window path used without a slot, which still runs when the slots are used up or the model does not support them.

### Next

Step 6 counts what the rereading costs: the smaller the chunk, the more times each frame is decoded.

## Step 6 · How big a chunk

> **In one line:** smaller chunks bring the first sound sooner but reread each frame more times; 4 frames first and 10 after gets both.

### On the stage

- Five rows: chunks of 2, 4, 10 (grey background, "SGLang-Omni's default"), 20, and "4 first, then 10" ("proposed, PR #2800").
- Left, "the first sound waits for": blue bars by frame count, labelled "$N$ frames · $16N$ steps".
- Right, "times each frame is decoded": dark bars with the count; the grey dashed vertical "once" is the decoder that does not stream.
- Two lines: where $(25 + 10) \div 10 = 3.5$ comes from; PR #2800's measurement.
- Footnotes: 16 steps a frame; the counts hold once 25 earlier frames exist; what p95 means.

### Formula

$$
\text{first wait} = N \times 16\ \text{steps},\qquad
\text{times decoded} = 1 + \frac{n_{\text{ctx}}}{N} = \frac{n_{\text{ctx}} + N}{N}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $N$ | frames per chunk | 2, 4, 10, 20 | Step 1; this step varies it |
| 16 | steps per frame | 16 | Step 3 |
| $n_{\text{ctx}}$ | earlier frames each window takes | 25 | Step 5 |

Where the count comes from: a frame is decoded once as new; after that, each window takes the 25 frames before it and moves on by $N$, so on average the frame appears in $25 \div N$ later windows. The formula holds only once 25 earlier frames exist (from Step 5's window 4).

### The numbers on the stage

| Chunk | First wait | At most (5 ms a step, Step 3) | Times decoded |
|---|---|---|---|
| 2 frames | $2 \times 16 = 32$ steps | 160 ms | $(25 + 2) \div 2 = 13.5$ |
| 4 frames | $4 \times 16 = 64$ steps | 320 ms | $(25 + 4) \div 4 = 7.25$ |
| **10 frames (default)** | $10 \times 16 = 160$ steps | 800 ms | $(25 + 10) \div 10 = 3.5$ |
| 20 frames | $20 \times 16 = 320$ steps | 1,600 ms | $(25 + 20) \div 20 = 2.25$ |
| 4 first, then 10 | $4 \times 16 = 64$ steps | 320 ms | 3.5 (all later windows are 10) |

- From 10 to 4: the first wait drops from 160 to 64 steps and the count rises from 3.5 to 7.25, more than double.
- 4 first, then 10: only the first window is 4 frames, so the wait is 4 frames' 64 steps and the steady count is 10 frames' 3.5.

### PR #2800's measurement

One H200 running every stage, 16 SeedTTS requests at once, only the first window changed:

| Quantity | Before | After |
|---|---|---|
| first sound p95 | 0.61 s | 0.48 s |
| requests per second | 12.79 | 12.64 (about 1.2% fewer) |

p95: 19 in 20 first sounds come sooner than it. The parameter in the source is `Code2WavScheduler`'s `initial_codec_chunk_frames`, 0 by default, meaning the first window is 10 frames like the rest; `window_new_frames` reads it while `emitted == 0`. The PR proposes setting it to 4.

### How this relates to Step 5's "the source now"

The right column's counts hold only on the window path. With a codec state slot each frame is decoded once, so every right-hand bar would sit on the "once" line; chunk size then mainly sets the first wait and the fixed cost of each call.

### Next

This chapter ends here. The next chapter covers MiniCPM-o 4.5's full-duplex sessions.
