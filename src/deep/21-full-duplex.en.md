## Step 1 · Turn-based or full duplex: who decides when the model talks

> **In one line:** on the same 11 s of the listener, a turn-based server cuts turns by a VAD's two rules; in full duplex the model decides every second whether to listen or speak.

### On the stage

- Two panels, two rows each: "the listener" (amber, `--gen`) and "the model" (blue, `--accent`). The listener's audio is identical in both.
- The listener says three things: "is it cold…" at 0–1.6 s, "…in Paris?" at 2.8–4.3 s, "mm-hm" at 6.6–7.5 s.
- Top panel, "TURN-BASED · A VAD DECIDES": the grey "800 ms" block after each stretch of speech is the silence the VAD waits out; red vertical lines are replies stopped; red labels "half the question" and "stopped by “mm-hm”".
- Bottom panel, "FULL DUPLEX · THE MODEL DECIDES": a row of 11 boxes, one per second, the first 5 "listen", the last 6 "speak"; blue labels "listens through the pause" and "hears “mm-hm”, keeps talking".
- The faint vertical line is now; the step loops.

A **VAD** (voice activity detector) answers one question at every moment: is someone speaking right now. It does not hear the words.

### Formula

The turn-based server's two rules: a turn ends once the silence reaches 0.8 s, and the model starts replying; a reply is stopped when the listener next starts speaking, at $t_{\text{start}}'$.

$$
t_{\text{turn}} = t_{\text{end}} + 0.8\ \text{s}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{end}}$ | when one stretch of the listener's speech ends | | this step, illustrative |
| $0.8\ \text{s}$ | the silence the VAD waits for before ending a turn | 800 ms | Qwen3-Omni's VAD setting (second footnote) |
| $t_{\text{turn}}$ | when the turn ends and the model starts replying | | this step |
| $t_{\text{start}}'$ | when the listener's next stretch begins | | this step, illustrative |

### The numbers on the stage

| What the listener said | $t_{\text{end}}$ | $t_{\text{turn}}$ | The model's reply | Stopped by |
|---|---|---|---|---|
| is it cold… | 1.6 s | 1.6 + 0.8 = 2.4 s | 2.4–2.8 s, half the question | "…in Paris?" at 2.8 s |
| …in Paris? | 4.3 s | 4.3 + 0.8 = 5.1 s | 5.1–6.6 s, the answer runs 1.5 s | "mm-hm" at 6.6 s |
| mm-hm | 7.5 s | 7.5 + 0.8 = 8.3 s | from 8.3 s, a reply to "mm-hm" | not stopped |

Full-duplex panel: the model listens from 0 to 5 s, through the pause (1.6–2.8 s), speaks from 5 s, and the "mm-hm" at 6.6 s does not stop it.

### Why the two differ

- The VAD only knows whether there is sound, so a pause means done and any sound means stop.
- A full-duplex model hears the words while it speaks and decides every second whether to listen or speak. MiniCPM-o 4.5 decides every 1 s, PersonaPlex every 80 ms.
- The times are illustrative; the 800 ms rule and the decision every 1 s are real settings.

### Next

Step 2 shows what "every second" means inside the server: each second of audio is a request.

## Step 2 · Each second of audio is a request

> **In one line:** the server cuts the listener's audio into 1 s units, and each unit goes through MiniCPM-o's four stages as a request of its own; a one-minute call is 60 requests.

### On the stage

- "the listener" row: unit 1 to unit 8, 1 s each, amber; the one being processed is solid.
- Four stage boxes in the middle: `perception` → `thinker` → `talker` → `speech`, lit blue where the current unit is. Under each is its counterpart in Qwen3-Omni (the encoders, thinker, talker, code2wav; Ch. 17 Step 4).
- "the model" row: what comes back for each unit, units 1 and 2 "listens" (grey), units 3 and 4 "speaks" (blue).
- The bold counter "requests so far, through every stage" adds one when a unit leaves `speech`.

### Formula

$$
N_{\text{req}} = \frac{T_{\text{call}}}{t_{\text{unit}}},\qquad
N_{\text{run}} = N_{\text{req}} \times N_{\text{stage}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $T_{\text{call}}$ | the call's length | 60 s | this step |
| $t_{\text{unit}}$ | one unit's audio | 1 s | MiniCPM-o's `UNIT_MS = 1000` |
| $N_{\text{req}}$ | requests in the whole call | | this step |
| $N_{\text{stage}}$ | stages each request goes through | 4 | this step |
| $N_{\text{run}}$ | stage runs in total | | this step |

### The numbers on the stage

- $N_{\text{req}} = 60 \div 1 = 60$ requests, the caption's 60.
- $N_{\text{run}} = 60 \times 4 = 240$ stage runs.

### The four stages

| MiniCPM-o stage | What it does | Counterpart in Qwen3-Omni |
|---|---|---|
| `perception` | audio and image encoders; turns this second of audio into embeddings | the encoders |
| `thinker` | reads the embeddings and decides what to say (or to keep listening) | thinker |
| `talker` | writes the thinker's output as sound codes | talker |
| `speech` | the vocoder; turns the codes into sound | code2wav |

Unit $k$ is the listener's audio from $k-1$ to $k$ s. While it is in the stages, the listener is already saying the next unit (second legend line) and does not wait. The animation spends 2.6 s per unit to be readable; that is not the real time a unit takes, which is Step 7's subject.

### Next

Step 3: what a stage keeps once a request is done.

## Step 3 · A request ends and nothing is kept

> **In one line:** a request brings everything it needs, and each stage frees what it built for it when it ends; so unit 2 knows nothing of what unit 1 said.

### On the stage

- Three columns, units 1, 2 and 3 in turn, each in three layers:
  - Top: "unit k: its 1 s of audio", the data the request brings.
  - Middle: the thinker's KV cache box; amber "unit k's tokens" rises, then fades, red "freed at the end".
  - Bottom: "what it knows": unit 1 "unit 1 only"; under units 2 and 3, red text says nothing of the earlier units.
- Two footnotes: the talker's KV cache and the state of perception and of the vocoder are freed the same way; the prefix cache does not help (below).

### Where the rule comes from

It is the rule of Ch. 7 Step 5: when a request ends, its KV pages go back to the free pool. Chapter 3 showed the KV cache holds each position's k and v; a unit's tokens leave their k and v in the thinker the same way, and give them back at the end.

### Applied to Step 1's call

Unit $k$ covers $k-1$ to $k$ s:

| What the listener said | When | Which units |
|---|---|---|
| is it cold… | 0–1.6 s | units 1, 2 |
| …in Paris? | 2.8–4.3 s | units 3, 4, 5 |

So the units that hear "…in Paris?" no longer know the question was "is it cold".

### Why the prefix cache does not cover it

- Ch. 8 Step 6's prefix cache matches **token ids** in a radix tree, reusing a resent text history.
- Audio enters as embeddings under placeholder ids, and the ids do not identify the audio. So SGLang-Omni keeps such units out of the radix tree (`skip_radix_cache_insert` in `scheduling/sglang_backend/ar_session.py`).
- Even a matched prefix can be evicted (Ch. 8 Step 7), and perception and vocoder state are not covered by it at all.

### Next

Step 4: what keeps that state across units is called a session.

## Step 4 · A session: one conversation the server keeps open

> **In one line:** the client opens once, appends once per unit and closes at the end; in between each stage keeps the session's state, and each append prefills only its own unit.

### On the stage

- "the client" row, five pills: `open`, `append 1`, `append 2`, `append 3`, `close`; the current one is filled black.
- "the stages": four stage boxes, each with a state box under it. A state that exists is blue (`--accent`), with one blue stripe per unit; one that does not is a dashed box, "no state".
- Under each state box, what it holds: perception "audio encoder state", thinker and talker "KV cache", speech "vocoder state".
- The small amber "unit n" block: during an append the unit hops stage to stage.
- The "now:" line says what is happening, each line held 5 s.

### The timeline (the animation's own time)

| When | What happens |
|---|---|
| 2.5 s | open: perception's state appears first, each next stage 0.6 s later, speech last |
| 7.5, 12.5, 17.5 s | appends 1, 2, 3: the unit hops a stage every 0.5 s, and the stage it reaches adds a stripe |
| 22.5 s | close: speech is freed first, perception last, at $22.5 + 3 \times 0.6 = 24.3$ s |

Open runs upstream first and close downstream first, so no stage receives a unit its upstream has not opened for (second footnote).

### Formula

Without sessions each request would have to carry the whole call so far, and unit $n$ would prefill $n$ units:

$$
\text{prefill}_{\text{no session}} = \sum_{n=1}^{N_{\text{req}}} n = \frac{N_{\text{req}}(N_{\text{req}}+1)}{2},\qquad
\text{prefill}_{\text{session}} = N_{\text{req}}
$$

| Symbol | What it is | From |
|---|---|---|
| $N_{\text{req}}$ | units in the call, 60 | Step 2 |
| $n$ | the $n$-th append | this step |

Prefill is chapter 4's pass that reads a whole input at once and writes its KV.

### The numbers on the stage

- No session: $1 + 2 + \dots + 60 = 60 \times 61 \div 2 = 1{,}830$ units of audio.
- With a session: 60, only the new unit each time. Units 1 to $n-1$ are already in the thinker's KV cache (Step 3's middle box, now kept).

### Next

Step 5: that is one session alone; with many sessions and audio arriving all the time, what must the server provide?

## Step 5 · Three things a session needs

> **In one line:** each stage keeps a state per session; each unit goes in only after the one before is done; the state stays on the GPU from open to close. All three at once.

### On the stage

Three columns, not alternatives; each is one requirement with its own step:

| Column | On the stage | Requirement | Step |
|---|---|---|---|
| 1 · IN EACH STAGE | the thinker holds two states side by side (sessions A and B); amber "unit 2 of session A" points at A's | a unit goes into its own session's state | Step 6 |
| 2 · ON THE WAY IN | the thinker runs unit 2 on A's state; units 3 and 4 "waiting" in the server | a unit goes in only after the one before is done | Step 7 |
| 3 · ON THE GPU | session A's state grows a bar per unit, units 1 to 6; red dashed line "close: freed" | the state holds memory until close | Step 8 |

### Why these three

- **1:** Step 4 had one session. A server has many open, so a stage must know which session a request belongs to and which operation it is.
- **2:** unit 3 runs on the state unit 2 leaves, so it cannot start before unit 2 is done. Audio arrives in real time regardless, so units queue.
- **3:** Step 3's request was freed when done; a session's state stays until close, so memory decides how many sessions can be open at once.

### Next

Step 6 takes requirement 1: how a stage recognises a session operation.

## Step 6 · 1 of 3 · In each stage, a hook per operation

> **In one line:** a session operation is an ordinary request whose metadata carries an `omni_session` tag; the stage reads the tag and calls the hook of that name.

### On the stage

- Left box, "A REQUEST": "data:" is amber "unit 3" for an append and "none" for open and close; "metadata:" holds `omni_session` with the operation and the session.
- Right box, `thinker`: "ITS HOOKS", three rows `open` (create the state), `append` (run the unit on it), `close` (free the state), the one firing filled black; "ITS STATE, PER SESSION", with a small blue bar per unit already in each state.
- The "now:" line; each request is held 5 s, and its hook fires 1.2 s after it arrives.

### What the three requests do

| Request | Hook | What changes |
|---|---|---|
| open, session C | `open` | a third state appears, "empty" |
| append, session A, unit 3 | `append` | A goes from units 1–2 to 1–3 |
| close, session B | `close` | B's four units are freed; a red dashed box, "freed" |

### In SGLang-Omni

- The tag is `omni_session` (`proto/session.py`). The hooks are `SessionHooks` (`scheduling/session.py`); besides open, append and close there are `control` (an event such as an interrupt) and `usage` (the bytes a session's state holds), the first footnote.
- What reads the tag is `SessionScheduler`, a subclass of Ch. 17 Step 8's one-pass `SimpleScheduler`.
- The thinker and talker run SGLang's own scheduler loop instead (Ch. 17 Step 9). There `ARSessionBridge` turns open into SGLang's `SessionController.open` and an append into a request that continues the session's KV cache.
- Each stage keeps a cursor per session, so a session's operations run in the order they arrived. Step 7 relies on this.

### Next

Step 7 takes requirement 2: what one unit at a time costs.

## Step 7 · 2 of 3 · On the way in, one unit at a time

> **In one line:** units arrive one a second in real time but each waits for the one before to finish; if a unit takes longer than 1 s, the audio left waiting keeps growing.

### On the stage

- Two panels: top "EACH UNIT TAKES 0.8 S · IT KEEPS UP", bottom "EACH UNIT TAKES 1.5 S · IT FALLS BEHIND".
- Two rows each: "the listener", units 1–12 filling in over time, light amber while being said or already sent in, **solid amber** when said and still waiting; "the four stages", dark blocks where a unit runs, a dashed line from where the unit was finished being said to where it starts running.
- Time axis 0–12 s. This step plays once and stops.

### Formula

$$
r_k = k \cdot t_{\text{unit}},\qquad
s_k = \max\!\left(r_k,\ s_{k-1} + t_{\text{run}}\right),\qquad
s_1 = r_1
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t_{\text{unit}}$ | one unit's audio | 1 s | Step 2 |
| $t_{\text{run}}$ | time for one unit through all four stages | 0.8 s / 1.5 s | this step, illustrative |
| $r_k$ | when unit $k$ has been said and can be sent in | | this step |
| $s_k$ | when unit $k$ starts running | | this step |

The rule: a unit starts once it is ready and the one before is done. It is the same "both must hold" as Ch. 20 Step 1's $s_i = \max(a_i, e_{i-1})$.

### The numbers on the stage

| $k$ | $r_k$ | $s_k$ at $t_{\text{run}} = 0.8$ | $s_k$ at $t_{\text{run}} = 1.5$ |
|---|---|---|---|
| 1 | 1 | 1 | 1 |
| 2 | 2 | max(2, 1.8) = 2 | max(2, 2.5) = 2.5 |
| 3 | 3 | max(3, 2.8) = 3 | max(3, 4) = 4 |
| 8 | 8 | 8 | 11.5 |
| 9 | 9 | 9 | 13 |

- $t_{\text{run}} = 0.8$: each unit starts the moment it is ready and is done at $k + 0.8$ s; nothing waits.
- $t_{\text{run}} = 1.5$: $s_k = 1 + 1.5(k-1)$, so unit $k$ waits $0.5(k-1)$ s after it is ready. When the animation stops at 12 s, 8 units have started (unit 8 at 11.5 s) and units 9–12 wait in solid amber, 4 s of audio.

### When new audio is rejected

- Every $1.5 \div (1.5 - 1) = 3$ s, 3 units arrive and 2 finish, so one more second is left waiting (first legend line).
- The server holds audio received and not yet finished, at most 60 s: `max_input_bytes` = 60 s × 16,000 samples/s × 2 bytes = 1,920,000 bytes, and a further append gets `buffer_overflow` (`serve/realtime/types.py`, `runtime.py`).
- At 179 s, 118 units are done, so $179 - 118 = 61$ s are held, over 60: about 3 minutes in, new audio is rejected (second legend line).
- The condition for keeping up: $t_{\text{run}} \le t_{\text{unit}} = 1$ s.

### Next

Step 8 takes requirement 3: how much memory a session's state holds.

## Step 8 · 3 of 3 · On the GPU, its KV cache for the whole call

> **In one line:** half an hour of listening is 2.2 GB of the thinker's KV cache alone, held until the call ends; after GPU 0's weights, about 7 such calls fit.

### On the stage

- "one call": the line "30 min of listening × 13 positions a second × 96 KB = 2.2 GB", and under it that this is Qwen3-Omni's thinker's KV cache alone.
- The "GPU 0, an H100" bar, 80 GB: dark "weights 63.8 GB", then 7 blue blocks, one per call.
- Brackets: "GPU 0's weights in the default layout (Ch. 19 Step 1)" and "7 calls × 2.2 GB fill the rest".

The stage uses Qwen3-Omni's thinker because the book has derived its numbers; these are not MiniCPM-o's.

### Formula

$$
M_{\text{call}} = T_{\text{call}} \times p_{\text{aud}} \times b_{\text{kv}},\qquad
n_{\text{fit}} = \left\lfloor \frac{M - W_0}{M_{\text{call}}} \right\rfloor
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $T_{\text{call}}$ | the call's length | 30 min = 1,800 s | this step |
| $p_{\text{aud}}$ | positions per second of audio | 13 | Ch. 16 Step 2: 100 feature frames a second × 13 positions per 100 frames |
| $b_{\text{kv}}$ | one position's k and v in the thinker, all layers | 96 KB | Ch. 19 Step 4 |
| $M_{\text{call}}$ | one call's thinker KV cache | | this step |
| $M$ | one H100's memory | 80 GB | `HBM_GB` in `src/numbers.ts` |
| $W_0$ | GPU 0's weights in the default layout | 63.8 GB | Ch. 19 Step 1 |
| $n_{\text{fit}}$ | calls that fit, rounded down | | this step |

Step 2's $T_{\text{call}}$ was a 60 s example; this step uses half an hour.

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| $b_{\text{kv}}$ | 48 layers × 4 KV heads × 128 × 2 (k, v) × 2 B | 98,304 B = 96 KB |
| positions | 1,800 × 13 | 23,400 |
| $M_{\text{call}}$ | 23,400 × 96 KB = 2,246,400 KB | **2.2 GB** |
| $W_0$ | (30.5 + 0.65 + 0.54 + 0.22) × 10⁹ params × 2 B | 63.8 GB |
| left over | 80 − 63.8 | 16.2 GB |
| $n_{\text{fit}}$ | ⌊16.2 ÷ 2.25⌋ = ⌊7.2⌋ | **7** (7 × 2.25 = 15.7 GB) |

The 2.2 GB converts at 1 GB = 10⁶ KB, as the stage does; 96 KB itself is 98,304 B, so in bytes it is $23{,}400 \times 98{,}304 \approx 2.30 \times 10^9$ B. Both give 7.

### Notes

- Step 3's request was freed when done; a session holds these 2.2 GB until close.
- 7 is an upper bound: working memory takes part of the rest (footnote). In the default layout the talker's KV cache sits on GPU 1 and is not counted here.
- MiniCPM-o reserves room for full-length sessions when it starts, 2 by default (`max_sessions` in `models/minicpm_o/native_config.py`), the second legend line. Its thinker caps a session at 8,192 tokens of history.

This is the chapter's last step.
