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
