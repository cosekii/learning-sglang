## Step 1 · Delivered is not heard

> **In one line:** The server has delivered 800 ms more reply audio than the client has played.

### On the stage

- One constructed reply contains 2.5 seconds of generated audio.
- Blue bars show three positions of that same reply on one scale.
- `D = 2.0 s` is the audio duration handed to the client connection.
- `H = 1.2 s` is the position the client later reports as played.
- The red outline marks the interval that was delivered but not played.

### Formula

$$
U = D - H
$$

| Symbol | Meaning | Value | Source |
|---|---|---:|---|
| $U$ | Delivered audio not yet played | 800 ms | This step |
| $D$ | Audio handed to the client connection | 2,000 ms | Constructed example |
| $H$ | Audio the client reports as played | 1,200 ms | Constructed example |

### The numbers on the stage

$$
2{,}000 - 1{,}200 = 800\ \text{ms}
$$

The default delivery lead is 1,000 ms. The constructed 800 ms interval therefore fits the default horizon, but it is not a measured run. Delivery means that the server connection took the audio. It does not prove that a speaker played it.

### Next

The next step maps the three designs that will repair their histories at these same positions.

Sources: `sglang_omni/pipeline/session_delivery.py:112-128`; `sglang_omni/proto/session.py:19-28`.

## Step 2 · Three strategies

> **In one line:** Turn-based Qwen, a streaming cascade and native MiniCPM-o are three alternative systems for the same interruption.

### On the stage

- Turn-based Qwen3-Omni uses VAD to find turn boundaries. Speech onset can interrupt its answer; the 800 ms silence rule ends the preceding user turn instead of delaying that interruption.
- The streaming cascade joins three services: ASR turns sound into text, an LLM writes reply text, and TTS turns that text into sound.
- Native MiniCPM-o 4.5 consumes one-second audio units. One model chooses whether to listen or speak.
- The orange card supplies the same correction to every design: “No, I meant London.”

### State each design owns

| Design | Conversation state |
|---|---|
| Qwen3-Omni | Session input state, thinker history and reply audio delivery |
| Streaming cascade | ASR state, dialog messages, current LLM reply and TTS progress |
| MiniCPM-o | One native session's listen/speak units, model history and delivered units |

This is a mechanism map, not a speed ranking. The systems differ in both model and implementation.

### Next

Before any design changes its history, the Session graph removes old reply work that has not reached the delivery ledger.

Sources: `docs/developer_reference/full_duplex_guide.md:391-397,1582-1591,1622-1645`; Learning SGLang Ch. 21 Steps 1–2.

## Step 3 · The interruption fence

> **In one line:** The Session graph deletes old work it still holds, blocks late old output and reports the delivered position.

### On the stage

- Blue boxes are copies of the interrupted reply at different positions.
- The target inbox and unsent appends lose matching old chunks. Already submitted appends are aborted when the interrupt preempts.
- Output still in the pacer or unread client queue is dropped. A late chunk from that reply cannot enter later output.
- The orange client correction stays. Interrupting a reply does not close the session or delete the new input.
- `reply.delivered` reports `D = 2.0 s`. The 800 ms between D and H is already beyond the graph's queues.

### What the fence does not mean

The fence is not global undo. It cannot erase audio that the connection already took or sound that the listener already played. It also does not prove that every owner stopped at one timestamp. Ch. 3 Step 3 showed why abort publication and stage acknowledgement are different events.

The graph retains interrupted reply IDs so late tools cannot attach old work to a new answer. This is separate from the model-specific history repair in the next three steps.

### Next

Qwen converts the delivered and client-played positions into a cut in its reply-token history.

Sources: `sglang_omni/pipeline/session_graph.py:108-232,581-619`; `sglang_omni/pipeline/sessions.py:167-210`; `sglang_omni/pipeline/session_delivery.py:92-128`.

## Step 4 · Qwen cuts reply rows

> **In one line:** Qwen keeps 18 reply rows at the client's 1.2-second playback report.

### On the stage

- A row is one token position saved in thinker history.
- The generated reply has 34 rows: three text rows and 31 complete 80 ms sound rows. The 2.5-second example gives `3 + floor(2,500 ÷ 80) = 34`; those sound rows cover `31 × 80 = 2,480 ms`, leaving a 20 ms tail that is not a complete row.
- D would permit 28 rows. H moves the cut back to 18 rows.
- Blue boxes are the rows that remain in thinker history. Grey boxes are removed.
- The cut counts token positions, not words and not exact acoustic word boundaries.

### Formula

$$
C = P + \left\lfloor\frac{\min(D,H)}{F}\right\rfloor
$$

| Symbol | Meaning | Value | Source |
|---|---|---:|---|
| $C$ | Reply rows retained after the cut | 18 | This step |
| $C_D$ | Reply rows allowed by delivered position D | 28 | This step |
| $C_H$ | Reply rows retained after playback position H | 18 | This step |
| $P$ | Text rows consumed by talker prefill | 3 | Qwen `PREFILL_TEXT_ROWS` |
| $D$ | Delivered audio position | 2,000 ms | Step 1 |
| $H$ | Client-reported playback position | 1,200 ms | Step 1 |
| $F$ | Duration of one codec frame | 80 ms | Qwen `CODEC_FRAME_MS` |

### The numbers on the stage

$$
C_D = 3 + \left\lfloor 2{,}000 \div 80 \right\rfloor = 28
$$

$$
C_H = 3 + \left\lfloor 1{,}200 \div 80 \right\rfloor = 18
$$

The normal graph sends `reply.delivered` as `qwen.truncate`. A later client truncate can only move the cut further back. If D is zero, Qwen does not retain an unheard answer: it carries the original utterance into the next unit and asks it again.

### Next

The streaming cascade stores text messages rather than Qwen's codec-row history, so it needs a text-to-audio alignment rule.

Sources: `sglang_omni/models/qwen3_omni/thinker_session.py:38-42,87-89,167-223`; `sglang_omni/models/qwen3_omni/session_input.py:184-205,253-260`; `tests/unit_test/qwen3_omni/test_session_input.py:87-138`.

## Step 5 · The cascade aligns sentences

> **In one line:** Default sentence alignment retains only sentence 1 at the 1.2-second cut.

### On the stage

- The same three constructed sentences end at 1.0, 2.0 and 2.5 seconds.
- Before client H arrives, D retains sentences 1 and 2.
- After client H arrives, the smaller 1.2-second cut retains only sentence 1.
- Blue sentence cards remain in dialog history. Grey cards are removed.

### Formula

$$
E = \max\{e_i \mid e_i \leq \min(D,H)\}
$$

| Symbol | Meaning | Value | Source |
|---|---|---:|---|
| $E$ | Last retained sentence-ending position | 1,000 ms | This step |
| $i$ | Sentence number | 1, 2, 3 | Constructed sentence list |
| $e_i$ | Audio-ending position of sentence $i$ | 1,000; 2,000; 2,500 ms | Constructed progress points |
| $D$ | Delivered position | 2,000 ms | Step 1 |
| $H$ | Client playback position | 1,200 ms | Step 1 |

### The numbers on the stage

- At D = 2,000 ms, eligible endings are 1,000 and 2,000 ms, so the dialog retains two sentences.
- At min(D,H) = 1,200 ms, only 1,000 ms qualifies, so the dialog retains sentence 1.
- The listener heard `1,200 − 1,000 = 200 ms` into sentence 2, but sentence mode cannot retain part of that sentence. The retained prefix is marked uncertain.

The default is `method: sentence`. `forced` adds word-ending information for completed sentences. `asr`, or `forced` with `heard_asr_url`, can transcribe the interrupted sentence prefix and retain a strict matching text prefix. ASR failure, timeout or a mismatched beginning adds no finer prefix for the interrupted sentence. Forced alignment still retains its sentence end and any word ends already reported. Those variants are not part of this stage's comparison.

### Next

Native MiniCPM-o does not cut text sentences or 80 ms rows. Its client truncate keeps complete one-second units.

Sources: `sglang_omni/models/streaming_cascade/dialog.py:66-78,857-917`; `sglang_omni/models/streaming_cascade/alignment.py:98-138,219-229,389-522`; `tests/unit_test/models/test_streaming_cascade.py:320-348`.

## Step 6 · MiniCPM-o keeps whole units

> **In one line:** The 1.2-second client cut retains only unit 0 in MiniCPM-o's repaired history.

### On the stage

- `response.cancel` initially keeps delivered units 0 and 1 because D = 2.0 seconds.
- Client truncate at H = 1.2 seconds moves the cut back to unit 0.
- Unit 2 was generated but not delivered, so it is dropped.
- The listener heard 200 ms inside unit 1, but this whole-unit cut cannot retain that fragment.

### Formula

$$
K = \left\lfloor\frac{\min(D,H)}{V}\right\rfloor - 1
$$

| Symbol | Meaning | Value | Source |
|---|---|---:|---|
| $K$ | Zero-based index of the last retained unit | 0 | This step |
| $K_D$ | Last retained zero-based unit index at delivered position D | 1 | This step |
| $K_H$ | Last retained zero-based unit index after playback position H | 0 | This step |
| $D$ | Delivered position | 2,000 ms | Step 1 |
| $H$ | Client playback position | 1,200 ms | Step 1 |
| $V$ | Native audio-unit duration | 1,000 ms | Ch. 21 Step 2 |

### The numbers on the stage

$$
K_D = \left\lfloor 2{,}000 \div 1{,}000 \right\rfloor - 1 = 1
$$

$$
K_H = \left\lfloor 1{,}200 \div 1{,}000 \right\rfloor - 1 = 0
$$

The heard fragment inside unit 1 is `1,200 − 1,000 = 200 ms`. The output converter remembers each delivered unit's reply-audio end. `played_through_unit` selects the last delivered unit whose end is at or before H. A position inside a unit rounds down. The thinker drops spoken units after the boundary, restores earlier generated history and refills later input as forced-listen units. It also holds listening until user speech arrives, so silence does not resume the cancelled answer.

### Next

The next step separates the server's Unit profiler clock from client playback and interruption measurements.

Sources: `sglang_omni/models/minicpm_o/session_adapters.py:118-179,219-236,469-516,553-640`.

## Step 7 · The profiler's server clock

> **In one line:** The profiler reports 200 ms to first output, which says nothing about client playback or audible stop.

### On the stage

- The profiler is the tool that records these server timings.
- A Unit is the work done for one append through the Session stages.
- Ready means every required input is present. Admitted means the coordinator accepted the append.
- The blue interval is 150 ms from ready to admitted. The orange interval is 50 ms from admitted to first output.
- First output enters the coordinator output buffer. It may be text, so it is not necessarily audio.

### Formula

$$
T = A + B
$$

| Symbol | Meaning | Value | Source |
|---|---|---:|---|
| $T$ | Ready-to-first-output duration | 200 ms | This step |
| $A$ | Ready-to-admitted duration | 150 ms | Fixed profiler test |
| $B$ | Admitted-to-first-output duration | 50 ms | Fixed profiler test |
| $start\_timestamp\_ns$ | Interval-start timestamp in nanoseconds | event-dependent | Profiler event |
| $end\_timestamp\_ns$ | Interval-end timestamp in nanoseconds | event-dependent | Profiler event |

### The numbers on the stage

$$
150 + 50 = 200\ \text{ms}
$$

The implementation obtains every duration from `(end_timestamp_ns − start_timestamp_ns) ÷ 1,000,000`. It computes A and B within one Unit before aggregating across Units. Missing endpoints produce null, not a zero-duration measurement.

### Measurement boundary

This clock explains server admission and output production. It has no endpoint for the client's first audible chunk or the last old-audio sample. Stage service time also includes observed execution boundaries; it is not pure GPU-compute time.

### Next

The listener-side evaluation measures the old reply's stop and the new reply's response from the recorded speech.

Sources: `sglang_omni/profiler/duplex_metrics.py:150-157,282-337`; `docs/developer_reference/profiler.md:144-196`; `tests/unit_test/profiler/test_duplex_metrics.py:318-344`.

## Step 8 · Two listener-side clocks

> **In one line:** The constructed recording gives a 1.3-second old-reply stop wait and a 1.1-second new-reply response wait.

### On the stage

- S = 3.0 seconds starts the user's correction. R = 4.0 seconds ends it.
- L = 4.3 seconds is the end of the old model-speech segment covering S.
- N = 5.1 seconds is the first new ASR word at or after R.
- The three small cards recall the same history cut: Qwen keeps 18 rows, the cascade keeps sentence 1 and MiniCPM-o keeps unit 0.

### Formula

$$
T_{stop} = L - S,\qquad T_{response} = N - R
$$

| Symbol | Meaning | Value | Source |
|---|---|---:|---|
| $T_{stop}$ | Old-reply stop wait | 1.3 s | This step |
| $T_{response}$ | New-reply response wait | 1.1 s | This step |
| $L$ | End of old model speech covering S | 4.3 s | Constructed recording |
| $S$ | Interruption onset | 3.0 s | Constructed recording |
| $N$ | First ASR word start at or after R | 5.1 s | Constructed recording |
| $R$ | Interruption end | 4.0 s | Constructed recording |

### The numbers on the stage

$$
T_{stop} = 4.3 - 3.0 = 1.3\ \text{s}
$$

$$
T_{response} = 5.1 - 4.0 = 1.1\ \text{s}
$$

These are FDB v1.0 definitions. N is an ASR word start at or after R, not necessarily an audio-arrival timestamp. If no model speech covers S, the interruption is `not_exercised`, not a successful stop. If speech covers both S and R, the outcome is `speaking_at_end` and response latency is absent. For exercised samples, missing responses and unobserved stops count as infinity for quantile summaries rather than disappearing from the denominator. `not_exercised` and ineligible samples are not in those latency denominators.

### Next

Chapter 13 chooses a Qwen3-Omni deployment. Its configuration, memory budget and concurrency should be checked with explicit server and listener clocks rather than one combined number.

Sources: `benchmarks/duplex/unified_v10.py:165-174,193-225,423-442,473-507`.
