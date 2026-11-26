## Step 1 · Generation finished, audio still waits

> **In one line:** Six seconds of unread audio leaves 576,000 bytes waiting in the API process.

### On the stage

- The generator made ten seconds of audio and has finished. The reader takes audio at playback speed, while generation can be faster than real time. Once the socket buffer fills, unread audio accumulates in this coordinator queue.
- The API process is the server process that hands audio to the reader. The reader is the client taking that audio.
- The delivery backlog is audio made but not yet taken by the reader. The reader took four seconds, leaving six seconds in blue. Grey marks audio already read.
- The formula uses the coordinator's internal 24 kHz float32 payload. HTTP output is mono 16-bit, so the byte count is not a raw PCM delivery count.
- This is a constructed example, not a latency measurement. Ch. 8 Step 3 showed playback timing. Socket buffering means bytes already handed to the operating system or HTTP runtime; those bytes wait outside the coordinator's ledger.

### Formula

$$
Q_{audio}=r_{audio}\times b_{sample}\times(G_{audio}-R_{audio})
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $Q_{audio}$ | Queued audio bytes | 576,000 B | This step |
| $r_{audio}$ | Internal coordinator audio samples per second | 24,000 | Qwen3-TTS tuning guide |
| $b_{sample}$ | Bytes per internal float32 sample | 4 B | Same guide |
| $G_{audio}$ | Generated audio duration | 10 s | Constructed example |
| $R_{audio}$ | Audio duration the reader took | 4 s | Constructed example |

float32 is the format that stores one internal audio sample in the coordinator queue. Each float32 sample occupies 4 B in this example. HTTP sends mono 16-bit audio instead, so do not apply the 96,000 B/s figure to raw HTTP delivery.

### The numbers on the stage

$$
Q_{audio}=24{,}000\times4\times(10-4)=576{,}000\ \text{B}
$$

One second contains $24{,}000\times4=96{,}000\ \text{B}$. Six queued seconds contain six copies of that amount.

### Boundary and sources

A finished request releases generation capacity, while unread streamed audio can remain in the API process (`docs/cookbook/qwen3_tts/tuning.md:22-26`). The coordinator records undelivered bytes for each stream (`sglang_omni/pipeline/coordinator.py:103-109,213-223`). Bytes already handed to the operating system or HTTP runtime are socket-buffered and stay outside that ledger.

### Next

The next step puts one shared byte cap on all waiting payloads in this API process.

## Step 2 · All streams share one payload-byte total

> **In one line:** One API process caps all top-level `bytes` payload values together, excluding text and socket buffers.

### On the stage

- `stream_delivery.max_total_backlog_bytes` is the most queued payload bytes all streams in this process may hold together. Its default is 1 GiB; `none` disables the cap.
- Stream A carries 6 B of audio and 100 text characters. Blue marks counted binary payload and grey marks excluded text, so this stream contributes 6 B.
- Stream B carries 10 B of audio. Together they hold `6 + 10 = 16 B`.
- The default cap corresponds to about 3.1 hours of the coordinator's internal 24 kHz float32 payload. HTTP output is mono 16-bit, so this is not a raw-delivery duration. The comparison conveys size only; it does not predict request length.

### Formula

$$
T_{queue}=\sum_{s=1}^{N_{streams}}Q_{queue,s},\qquad H_{cap}=\frac{C_{cap}}{r_{audio}\times b_{sample}\times3600}
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $T_{queue}$ | Total queued payload bytes | 16 B | Constructed example |
| $s$ | Stream index from 1 to $N_{streams}$ | 1 or 2 | This step |
| $N_{streams}$ | Stream count | 2 | This step |
| $Q_{queue,s}$ | Queued payload bytes in stream $s$ | 6 B or 10 B | Constructed example |
| $H_{cap}$ | Default cap as audio hours | About 3.1 h | This step |
| $C_{cap}$ | Default shared cap | 1,073,741,824 B | Config default |
| $r_{audio},b_{sample}$ | Sample rate and bytes per sample | 24,000 and 4 B | Step 1 |

The sum adds each stream's queued payload bytes. “Top-level” means directly inside the message, not inside a nested value. The implementation sums every top-level `bytes` value, including non-audio binary payloads; it does not check for an audio key.

### The numbers on the stage

$$
T_{queue}=6+10=16\ \text{B},\qquad H_{cap}=\frac{1{,}073{,}741{,}824}{24{,}000\times4\times3600}\approx3.1\ \text{hours}
$$

This is not a total-process-memory measurement. Socket buffers contain bytes already handed to the operating system or HTTP runtime; those bytes also wait for the client but do not belong to this coordinator ledger. Another API process has its own cap.

### Boundary and sources

The default and config type are in `sglang_omni/config/schema.py:641-648,793-796`. The per-process boundary and `none` behavior are in `docs/cookbook/qwen3_tts/tuning.md:24-28`. The accounting function is in `sglang_omni/pipeline/coordinator.py:91-100`.

### Next

When the total crosses the cap, the coordinator needs a rule for choosing a stream. The next step defines its reader-idle clock.

## Step 3 · Only reading resets the idle clock

> **In one line:** The idle clock tracks how long the reader has not taken queue messages; producing another chunk does not reset it.

### On the stage

- Both panels start with 8 B queued, a last read at time 0 and a current time of 2 seconds.
- On the left, the reader takes 4 B. The queue falls to 4 B, the last-read time becomes 2 and idle time becomes 0.
- On the right, the generator adds 4 B. The queue rises to 12 B, the last-read time stays 0 and idle time stays 2 seconds.
- This clock observes queue reads only. It does not observe the playback position.

### Formula

$$
I_{idle}=t_{now}-t_{last}
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $I_{idle}$ | Reader-idle duration | 0 or 2 s | This step |
| $t_{now}$ | Current monotonic time | 2 s | Constructed time |
| $t_{last}$ | Last queue-read time | 0 or 2 s | Constructed time |

A monotonic clock moves forward and measures intervals. It is not calendar time.

### The numbers on the stage

- Before reading: $I_{idle}=2-0=2\ \text{s}$.
- After reading: $I_{idle}=2-2=0\ \text{s}$.
- After producing only: $I_{idle}=2-0=2\ \text{s}$, with no clock reset.

When an empty backlog receives its first message, the producer sets the clock's starting point. A new backlog therefore has an idle timestamp even without an earlier read.

### Boundary and sources

Read-side accounting and clock resets are in `sglang_omni/pipeline/coordinator.py:497-520`. Producer behavior and the empty-backlog start are in the same file at `1088-1096`. The unit test is `tests/unit_test/pipeline/test_coordinator.py:1599-1620`.

### Next

The next step gives two streams different idle durations and backlog sizes to show which one the coordinator chooses.

## Step 4 · The longest-idle reader fails first

> **In one line:** Over the cap, the coordinator picks the stream with the longest idle time rather than the largest backlog.

### On the stage

- The cap is 12 B. Initially `req-idle` holds 4 B with 100 idle seconds, while `req-behind` holds 8 B with 2 idle seconds. They total exactly 12 B.
- `req-behind` adds 4 B, making `12 + 4 = 16 B` and crossing the cap.
- Orange marks `req-idle` failing and its 4 B leaving the shared total. Blue marks `req-behind` staying.
- Removing 4 B returns the total to 12 B. The larger backlog survives because its reader is fresher. Step 8 covers the remaining queue and ID cleanup.

### Formula

$$
T_{queue,after}=T_{queue,before}+A_{added}-Q_{failed}
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $T_{queue,before}$ | Shared backlog before the new message | 12 B | Unit test |
| $A_{added}$ | Added audio | 4 B | Unit test |
| $Q_{failed}$ | Backlog removed with the failed stream | 4 B | Longest-idle `req-idle` |
| $T_{queue,after}$ | Shared backlog after removal | 12 B | This step |
| $C_{cap}$ | Shared cap in this example | 12 B | Unit test |

### The numbers on the stage

$$
T_{queue,after}=12+4-4=12\ \text{B}\leq C_{cap}=12\ \text{B}
$$

Selection runs only while $T_{queue}>C_{cap}$, so equality does not trigger it. Candidates must hold positive undelivered bytes. The oldest last-read timestamp identifies the stream with the longest current idle time.

### Boundary and sources

The selection and accounting loop is in `sglang_omni/pipeline/coordinator.py:1102-1131`. The values reproduce `tests/unit_test/pipeline/test_coordinator.py:1516-1539`, whose test adjusts the idle timestamps.

### Next

If removing the longest-idle stream still leaves too many bytes, the coordinator repeats the same choice on the remaining streams.

## Step 5 · Fail another stream until the total fits

> **In one line:** The coordinator repeats the longest-idle rule until the shared total no longer exceeds the cap.

### On the stage

- All three panels keep the same order: `req-oldest`, `req-older`, `req-fresh`.
- Initially the first two hold 2 B and 4 B. `req-fresh` grows from 4 B by 6 B to 10 B, making 16 B in total.
- The first eviction removes `req-oldest` and its 2 B. `req-fresh` still holds 10 B, so 14 B remains and still exceeds 12 B.
- The second removes `req-older` and its 4 B. Only the fresh stream's 10 B remains, so the loop stops with two failed streams.

### Formula

$$
T_{queue,0}=16\ \text{B},\qquad T_{queue,1}=T_{queue,0}-Q_{oldest},\qquad T_{queue,2}=T_{queue,1}-Q_{older}
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $T_{queue,0}$ | Total after the new message | 16 B | Unit test |
| $Q_{oldest}$ | Longest-idle stream's backlog | 2 B | `req-oldest` |
| $T_{queue,1}$ | Total after the first eviction | 14 B | This step |
| $Q_{older}$ | Next longest-idle stream's backlog | 4 B | `req-older` |
| $T_{queue,2}$ | Total after the second eviction | 10 B | This step |

### The numbers on the stage

$$
16-2=14\ \text{B}>12\ \text{B},\qquad14-4=10\ \text{B}\leq12\ \text{B}
$$

Each iteration finds the longest-idle stream among the remaining streams with at least 1 B waiting. The loop neither assumes one eviction is enough nor sorts streams by size.

### Boundary and sources

The `while` loop and failure count are in `sglang_omni/pipeline/coordinator.py:1102-1131`. The values and two-abort order reproduce `tests/unit_test/pipeline/test_coordinator.py:1544-1569`.

### Next

The next step separates what failure stops in the generator from what it stops in delivery.

## Step 6 · Fail the whole stream, abort only running work

> **In one line:** A cap failure ends the whole stream; generation needs an abort only while it is still running.

### On the stage

- Both panels hold the same 12 B of queued audio. This step's cap is 10 B, so `12 B > 10 B` and both panels cross the cap.
- On the left, generation is still running. The coordinator broadcasts abort so unfinished stages stop this request, then reports the failure to the reader.
- On the right, generation has finished. No running generator remains to abort, but the reader still receives the delivery failure.
- The coordinator does not drop an arbitrary chunk. A missing middle piece breaks the ordered sound.

### The two states

| State | Generator | Reader |
|---|---|---|
| Generation running | Abort broadcast | Stream failure |
| Generation finished | No work left to abort | Stream failure |

A terminal message containing audio passes through the same accounting function. Finished generation therefore does not rule out a later delivery-cap failure. A successful abort releases request ownership; the ownership-retention path after an abort-transport failure is outside this chapter.

### Boundary and sources

The failure-completion path is in `sglang_omni/pipeline/coordinator.py:940-967`. Whole-stream failure and conditional abort are in `1098-1144`. The running/finished test with its 10 B cap is `tests/unit_test/pipeline/test_coordinator.py:1465-1505`; terminal-waveform accounting is in `1691-1715`, and terminal-waveform self-failure is in `1738-1762`.

### Next

The reader now has a failed stream. The next step shows how each connection type reports that failure.

## Step 7 · Different connections report the same failure

> **In one line:** Event connections send an error event; samples-only connections must close early.

### On the stage

- An event envelope is a named message wrapped around data. The left event connection can send an `error` beside audio and report `The request queue is full.`
- Partial audio may already have gone out before that error.
- The right panel carries only audio samples. With no event envelope for the error, its connection closes early.
- Orange marks failure output. Both panels show the same shared-cap failure, not two experiments.

### Protocol examples

The left panel's examples are SSE and WebSocket. The right panel's example is raw PCM. These protocol names do not appear on the main stage.

### The three exits

| Connection | How the reader sees the end |
|---|---|
| Speech SSE | `error` event |
| Speech WebSocket | `error` event |
| Raw PCM | Early stream close |

After emitting audio, SSE also writes `partial_audio=true` and `action=discard`, telling the client to discard the incomplete audio. Realtime-session output budgets and close codes use a separate protocol and sit outside this step.

### Boundary and sources

The three behaviors and the rule that this cap does not refuse new requests are in `docs/cookbook/qwen3_tts/tuning.md:24-28`. The SSE error frame and partial-audio markers are in `sglang_omni/serve/speech_streaming.py:202-228`. This is not a pre-response HTTP 503.

### Next

After the failure goes out, taking the error or closing the reader releases the remaining stream queue and ID.

## Step 8 · Two close cases, two different leftovers

> **In one line:** Early close subtracts unread bytes; cap failure already removed them, leaving only the error queue and stream ID to release.

### On the stage

- The left panel is an early close with no cap failure. It still has 12 B unread. Closing aborts work if its work record remains, then removes the queue, backlog and stream ID.
- “Owned” means the request's work record remains in the coordinator's `requests` map. Ch. 3 Step 2 showed that record and the request's taken name.
- The right panel follows a cap failure. Eviction already removed all counted audio bytes, leaving 0 B. The error remains queued and the stream ID, the stream's name, remains taken.
- Taking the error or closing the reader releases that queue and ID. The right panel must not subtract another 12 B.

### Formula

$$
T_{queue,after}=T_{queue,before}-Q_{close}
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $T_{queue,before}$ | Shared backlog before early close | 12 B | Left constructed example |
| $Q_{close}$ | Unread bytes left by this reader | 12 B | Left constructed example |
| $T_{queue,after}$ | Shared backlog after early-close cleanup | 0 B | This step |

### The numbers on the stage

This formula belongs only to the early-close panel:

$$
T_{queue,after}=12-12=0\ \text{B}
$$

The cap-failure panel already reached 0 B during eviction. Finished generation is not aborted again when the reader closes. Closing the stream and aborting earlier stage work are separate actions.

### Boundary and sources

Conditional abort, queue removal and accounting on close are in `sglang_omni/pipeline/coordinator.py:497-553`. The early-close test is `tests/unit_test/pipeline/test_coordinator.py:1625-1638`. Audio draining during cap failure and the remaining error queue and ID are in `sglang_omni/pipeline/coordinator.py:1116-1144` and `tests/unit_test/pipeline/test_coordinator.py:1491-1505`.

### Next

A public URL is the address clients use for requests. The planned Chapter 15 puts two API processes behind one public URL and follows the router as it chooses a process for the next request.
