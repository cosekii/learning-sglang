## Step 1 · Generation finished, audio still waits

> **In one line:** Six seconds of unread audio leaves 576,000 bytes waiting in the API process.

### On the stage

- The generator made ten seconds of audio and released its generation slot.
- The API process hands audio to the reader. The delivery backlog is audio made but not yet taken by that reader.
- The reader took four seconds, leaving six seconds in blue. Grey marks audio already read.
- This is a constructed example, not a latency measurement. It excludes socket buffering.

### Formula

$$
Q=r\times b\times(G-R)
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $Q$ | Queued audio bytes | 576,000 B | This step |
| $r$ | Audio samples per second | 24,000 | Qwen3-TTS tuning guide |
| $b$ | Bytes per float32 sample | 4 B | Same guide |
| $G$ | Generated audio duration | 10 s | Constructed example |
| $R$ | Audio duration the reader took | 4 s | Constructed example |

### The numbers on the stage

$$
Q=24{,}000\times4\times(10-4)=576{,}000\ \text{B}
$$

One second contains $24{,}000\times4=96{,}000\ \text{B}$. Six queued seconds contain six copies of that amount.

### Boundary and sources

A finished request releases generation capacity, while unread streamed audio can remain in the API process (`docs/cookbook/qwen3_tts/tuning.md:22-26`). The coordinator records undelivered bytes for each stream (`sglang_omni/pipeline/coordinator.py:103-109,213-223`).

### Next

The next step puts one shared byte cap on all waiting audio in this API process.

## Step 2 · All streams share one audio-byte ledger

> **In one line:** One API process caps all its streams together, counting audio bytes rather than text or socket buffers.

### On the stage

- `stream_delivery.max_total_backlog_bytes` is the most queued audio bytes all streams in this process may hold together. Its default is 1 GiB; `none` disables the cap.
- Stream A carries 6 B of audio and 100 text characters. Blue marks counted audio and grey marks excluded text, so this stream contributes 6 B.
- Stream B carries 10 B of audio. Together they hold `6 + 10 = 16 B`.
- The default cap corresponds to about 3.1 hours of this audio. That comparison conveys size only; it does not predict request length.

### Formula

$$
T=\sum_{s=1}^{N}Q_s,\qquad H=\frac{C}{r\times b\times3600}
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $T$ | Total queued audio | 16 B | Constructed example |
| $Q_s$ | Queued audio in stream $s$ | 6 B or 10 B | Constructed example |
| $N$ | Stream count | 2 | This step |
| $H$ | Default cap as audio hours | About 3.1 h | This step |
| $C$ | Default shared cap | 1,073,741,824 B | Config default |
| $r,b$ | Sample rate and bytes per sample | 24,000 and 4 B | Step 1 |

### The numbers on the stage

$$
T=6+10=16\ \text{B},\qquad H=\frac{1{,}073{,}741{,}824}{24{,}000\times4\times3600}\approx3.1\ \text{hours}
$$

The implementation sums only top-level `bytes` values in the payload. It does not measure total process memory or socket buffers. Another API process has its own cap.

### Boundary and sources

The default and config type are in `sglang_omni/config/schema.py:641-648,793-796`. The per-process boundary and `none` behavior are in `docs/cookbook/qwen3_tts/tuning.md:24-28`. The accounting function is in `sglang_omni/pipeline/coordinator.py:91-100`.

### Next

When the total crosses the cap, the coordinator needs a fair way to choose a stream. The next step defines its reader-idle clock.

## Step 3 · Only reading resets the idle clock

> **In one line:** The idle clock tracks how long the reader has not taken queue messages; producing another chunk does not reset it.

### On the stage

- Both panels start with 8 B queued, a last read at time 0 and a current time of 2 seconds.
- On the left, the reader takes 4 B. The queue falls to 4 B, the last-read time becomes 2 and idle time becomes 0.
- On the right, the generator adds 4 B. The queue rises to 12 B, the last-read time stays 0 and idle time stays 2 seconds.
- This clock observes queue reads only. It does not observe the playback position.

### Formula

$$
I=N-L
$$

| Symbol | Meaning | Size | Source |
|---|---|---:|---|
| $I$ | Reader-idle duration | 0 or 2 s | This step |
| $N$ | Current monotonic time | 2 s | Constructed time |
| $L$ | Last queue-read time | 0 or 2 s | Constructed time |

A monotonic clock moves forward and measures intervals. It is not calendar time.

### The numbers on the stage

- Before reading: $I=2-0=2\ \text{s}$.
- After reading: $I=2-2=0\ \text{s}$.
- After producing only: $I=2-0=2\ \text{s}$, with no clock reset.

When an empty backlog receives its first message, the producer sets the clock's starting point. A new backlog therefore has an idle timestamp even without an earlier read.

### Boundary and sources

Read-side accounting and clock resets are in `sglang_omni/pipeline/coordinator.py:497-520`. Producer behavior and the empty-backlog start are in the same file at `1088-1096`. The unit test is `tests/unit_test/pipeline/test_coordinator.py:1599-1620`.

### Next

The next step gives two streams different idle times and backlog sizes to show which one the coordinator chooses.
