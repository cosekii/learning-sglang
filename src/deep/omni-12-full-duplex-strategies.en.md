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
