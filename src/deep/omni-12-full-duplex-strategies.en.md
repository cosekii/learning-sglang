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

- The generated reply has 34 rows: three text rows and 31 complete 80 ms sound rows.
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
