## Step 1 · The two kinds of step get names

> **In one line:** chapter 3's first forward pass is called **prefill**, and every forward pass after it is called **decode**.

### On the stage

- The token row: 5 blue prompt tokens (`The`, `␣capital`, `␣of`, `␣France`, `␣is`) and 2 amber tokens the model added, `␣Paris` and `.` (chapter 1).
- The steps row: a long blue bar "step 1 · prefill" under the 5 prompt tokens, labelled "5 tokens, one pass, fills the cache".
- Two small amber blocks, "step 2" and "step 3", each marked decode, with the tag "1 token each, reads the cache".

### The two kinds side by side

| | prefill | decode |
|---|---|---|
| tokens in one step | the whole prompt (5 here) | 1 (the one the step before generated) |
| writes to the KV cache | one slot per prompt token | 1 slot |
| reads from the KV cache | nothing | every stored k and v |
| in chapter 3 | Steps 2–3 | Steps 4–7 |

### What SGLang calls them

In SGLang's source, prefill is called **extend**: `ForwardMode.EXTEND`, whose comment says it "is also called prefill". The name is extend because the start of a sequence may already be in the cache (prefix caching, chapter 8), so the step only appends the rest. Decode is `ForwardMode.DECODE`. This book uses the common names, prefill and decode.

### Next

Steps 2–4 take one step apart to see what spends the time on the GPU.

## Step 2 · Every step reads all 16 GB of weights

> **In one line:** a forward pass uses every matrix in the model, and each must travel from HBM into the compute units; for an 8B model that is 16 GB, however many tokens the step has.

### On the stage

- Left box, "memory (HBM)": the GPU's main memory, with the blue "weights 16 GB" pulsing.
- Middle box, "compute": the units that do the multiplies, showing `5 × 16 GFLOP = 80 GFLOP` (Step 3 explains it).
- The thick arrow between them is moving, with "read 16 GB" above and "every step" below.
- The 5 `tok` chips on the right: this step's input tokens.
- The grey footnote: 16 GB is all the parameters; the 1 GB embedding table is only looked up, so a step streams about 15 GB.

### Formula

$$
M_W = \text{parameters} \times b = 8 \times 10^9 \times 2\ \text{B} = 16\ \text{GB}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $M_W$ | bytes of weights a step reads from HBM | 16 GB | this step; `W_GB` in `src/numbers.ts` |
| $b$ | bytes per number (bf16) | 2 B | Ch. 3 Step 9; `BYTES` |

HBM (High Bandwidth Memory) is the GPU's large memory, 80 GB on an H100. The storage next to the compute units is a few tens of MB and cannot hold 16 GB, so every forward pass reads each matrix (the $W_Q, W_K, W_V$ of Ch. 2 Step 3 and all the others) from HBM again.

### The numbers on the stage: the footnote's 15 GB

| Quantity | Arithmetic | Result |
|---|---|---|
| embedding table | 128,256 rows × 4,096 numbers × 2 B | 1.05 GB |
| weights a step actually streams | 16 − 1.05 | about 15 GB |

The embedding table turns token ids into the $x$ of Ch. 2 Step 2. A step takes only its own tokens' rows, not the whole table. The book still counts 16 GB; Step 8 explains why the rounding barely changes the result.

### Next

Step 3 puts 5 tokens on the right and counts how many times this one read is used.

## Step 3 · Prefill: five tokens share one read

> **In one line:** a weight arrives from HBM once and is multiplied against all 5 tokens' vectors while it is in the compute units; the bytes read stay the same and the math is 5 times larger.

### On the stage

- 5 blue `tok` chips on the right, pulsing, titled "5 tokens in", with the arrow from them moving.
- The compute box: `5 × 16 GFLOP = 80 GFLOP`.
- The read arrow still says "read 16 GB".

### Formula

$$
\text{math} = n \times f
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n$ | tokens fed into this step | 5 here | this step |
| $f$ | operations for one token through the model | 16 GFLOP | `GFLOP_PER_TOKEN` in `src/numbers.ts` |

Note: Ch. 3 Step 10 used $n$ for the current length of the sequence. In this chapter $n$ is **the number of tokens in one step**, and the sequence length is written $c$ (Step 6).

A GFLOP is a billion floating-point operations. Where $f$ comes from: a matrix times a vector does one multiply and one add per weight, so 8B parameters cost $2 \times 8 \times 10^9 = 16 \times 10^9$ operations. The query–key dot products of attention (Ch. 2 Step 4) are not in the 16 GFLOP; they are small next to the matrix multiplies.

### The numbers on the stage

$$
5 \times 16\ \text{GFLOP} = 80\ \text{GFLOP}
$$

The read is still $M_W = 16$ GB. Per byte read, that is $80\ \text{GFLOP} / 16\ \text{GB} = 5$ operations per byte.

### Why they run in parallel

The five tokens' matrix multiplies do not depend on each other: they use the same weights on different vectors. The dependencies inside attention are handled by the causal triangle of Ch. 2 Step 7, computed in the same pass.

### Next

Step 4 switches to decode, with 1 token.

## Step 4 · Decode: the same read, one token of math

> **In one line:** decode has $n = 1$; for that one token the whole 16 GB is still read, and the math is only 16 GFLOP.

### On the stage

- One amber `tok` chip on the right, titled "1 token in". Amber, like the decode blocks of Step 1.
- The compute box: `1 × 16 GFLOP = 16 GFLOP`.
- The read arrow: "read 16 GB", unchanged.

### The numbers on the stage

| | prefill (Step 3) | decode (this step) |
|---|---|---|
| $n$ | 5 | 1 |
| math $n \times f$ | 80 GFLOP | 16 GFLOP |
| read $M_W$ | 16 GB | 16 GB |
| operations per byte | 5 | 1 |

The token's vector has to pass through every matrix, and leaving any one out means no output, so decode cannot read only part of the weights.

### Next

Step 5 turns bytes and operations into time.

## Step 5 · As time: 4.8 ms to read, 0.016 ms to compute

> **In one line:** on an H100, reading 16 GB takes 4.8 ms and one token's math takes 0.016 ms; a step takes the slower of the two, so the compute units wait 99.7% of the time.

### On the stage

- Two bars under "time per step": cyan "memory" 4.8 ms, blue "compute" 0.016 ms (too short to see).
- The legend line: "step ≈ 4.8 ms, waiting on memory".
- The busy bar in the compute box: almost empty, a sliver of red, with "busy 0.3% of the step".
- The footnote: 3.35 TB/s and 989 TFLOP/s are the H100 SXM's datasheet peaks, which real kernels do not reach.

### Formula

$$
t_{\text{mem}} = \frac{M_W}{BW},\qquad
t_{\text{comp}} = \frac{n\,f}{F},\qquad
t_{\text{step}} = \max(t_{\text{mem}},\ t_{\text{comp}})
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $M_W$ | bytes of weights | 16 GB | Step 2 |
| $BW$ | HBM bandwidth: bytes read per second | 3.35 TB/s | `BW` in `src/numbers.ts` |
| $n$ | tokens in this step | 1 | Step 3 |
| $f$ | operations per token | 16 GFLOP | Step 3 |
| $F$ | floating-point operations per second (bf16) | 989 TFLOP/s | `TFLOPS` in `src/numbers.ts` |
| $t_{\text{mem}}, t_{\text{comp}}$ | read time, math time | | this step |
| $t_{\text{step}}$ | the time one step takes | | this step |

Units: GB ÷ TB/s comes out in ms, and so does GFLOP ÷ TFLOP/s.

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $t_{\text{mem}}$ | 16 ÷ 3.35 | 4.78 ms | 4.8 ms |
| $t_{\text{comp}}$ | 16 ÷ 989 | 0.0162 ms | 0.016 ms |
| $t_{\text{step}}$ | max(4.78, 0.0162) | 4.78 ms | step ≈ 4.8 ms |
| busy share $t_{\text{comp}} / t_{\text{step}}$ | 0.0162 ÷ 4.78 | 0.34% | 0.3% |

### Why the max

The compute units start multiplying as soon as weights arrive, so reading and math happen at the same time. The step waits for whichever is slower. Here memory is about 300 times slower.

### Next

Step 6: besides the weights, decode also reads the KV cache.

## Step 6 · Decode also reads the KV cache

> **In one line:** decode's query reads every k and v in the cache (Ch. 3 Step 6); at 8k of context the cache is 1 GB, read again on every step.

### On the stage

- A cyan "kv cache · 1.0 GB at 8k" inside the HBM box, with the tag "at 7 tokens it was 0.9 MB (Ch. 3 Step 9)" under the box.
- The read arrow now says "read 16 + 1 GB".
- The memory bar grows to 5.1 ms, legend "step ≈ 5.1 ms, waiting on memory"; compute is still 0.016 ms and busy still shows 0.3%.

### Formula

$$
M_{KV} = c \times 128\ \text{KB},\qquad
t_{\text{mem}} = \frac{M_W + M_{KV}}{BW}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $c$ | tokens already in the sequence (the context length) | 7 or 8,192 | this step |
| 128 KB | one token's k and v across all layers | | Ch. 3 Step 9; `KB_PER_TOKEN` |
| $M_{KV}$ | bytes of cache this step reads | | this step |
| $M_W, BW$ | weight bytes, HBM bandwidth | 16 GB, 3.35 TB/s | Steps 2 and 5 |

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $M_{KV}$, $c = 7$ | 7 × 128 KB | 896 KB | 0.9 MB |
| $M_{KV}$, $c = 8{,}192$ | 8,192 × 128 KB | 1,048,576 KB ≈ 1.05 GB | 1.0 GB |
| $t_{\text{mem}}$ | (16 + 1.05) ÷ 3.35 | 5.09 ms | 5.1 ms |
| busy share | 0.0162 ÷ 5.09 | 0.32% | 0.3% |

Without the cache it was 4.78 ms (Step 5), so 8k of context adds about 0.3 ms per step. The math barely changes: the dot products against the cache are small next to the weight multiplies.

### Why it keeps slowing down

Each generated token adds 1 to $c$ and 128 KB to the cache. The later in a reply, the more every step reads.

### Next

Step 7 goes to the other end: a 2,000-token prefill.

## Step 7 · A 2,000-token prefill waits on compute instead

> **In one line:** at $n = 2{,}000$ the math takes 32 ms and the read still 4.8 ms; the step waits on compute, and the compute units are fully busy.

### On the stage

- 5 blue chips on the right, the last one `…`, titled "2,000 tokens in" (the stage draws at most 5).
- The compute box: `2,000 × 16 GFLOP = 32 TFLOP`, the busy bar full and blue, "busy 100% of the step".
- Two bars: memory 4.8 ms, compute 32 ms; legend "step ≈ 32 ms, waiting on compute".

### The numbers on the stage

The formulas of Step 5:

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| math $n f$ | 2,000 × 16 GFLOP | 32,000 GFLOP = 32 TFLOP | 32 TFLOP |
| $t_{\text{comp}}$ | 32 TFLOP ÷ 989 TFLOP/s | 32.4 ms | 32 ms |
| $t_{\text{mem}}$ | 16 ÷ 3.35 | 4.78 ms | 4.8 ms |
| $t_{\text{step}}$ | max(4.78, 32.4) | 32.4 ms | 32 ms |
| busy share | 32.4 ÷ 32.4 | 100% | 100% |

$M_W$ does not depend on $n$, so the read time is unchanged. The compute bar is about 7 times the memory bar (32.4 ÷ 4.78 ≈ 6.8).

The 2,000 × 128 KB = 0.26 GB of cache this prefill writes is left off the bars; it would add about 0.08 ms.

### Two terms

- **Compute-bound**: $t_{\text{comp}} > t_{\text{mem}}$, the step waits on math. A long prefill is this kind.
- **Memory-bound**: $t_{\text{mem}} > t_{\text{comp}}$, the step waits on the read. Decode (Steps 5–6) is this kind.

### Next

Step 8 sweeps $n$ from 1 to 4,096 to find where one turns into the other.

## Step 8 · The balance point: about 300 tokens per step

> **In one line:** the math takes as long as the read at $n^* = F / BW \approx 295$; below it every step is 4.8 ms, above it each extra token adds 0.016 ms.

### On the stage

- x axis "tokens per step" from 1 to 4k, y axis "time per step" from 0.01 to 100 ms, **both on a log scale** (each tick is 10 times the last).
- Cyan dashed line, "memory read alone": $t_{\text{mem}} = 4.8$ ms, flat.
- Blue dashed line, "math alone": $t_{\text{comp}}$, rising from 0.016 ms at $n = 1$.
- Thick black line, "actual step time · the slower of the two": flat, then rising.
- The open circle and vertical dashed line at the corner, labelled "≈300 tokens per step" and "989 TFLOP/s ÷ 3.35 TB/s = 295".
- Three dots: amber decode ($n = 1$), blue "prefill, 5", blue "prefill, 2000 tokens".
- Along the bottom: "← memory-bound · decode lives here" and "compute-bound · long prefill →".

### Formula

Set $t_{\text{comp}} = t_{\text{mem}}$ (leaving the cache out):

$$
\frac{n^* f}{F} = \frac{M_W}{BW}
\quad\Longrightarrow\quad
n^* = \frac{F}{BW} \times \frac{M_W}{f}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n^*$ | the balance point: tokens per step where the two are equal | about 295 | this step |
| $F / BW$ | operations the GPU can do in the time it reads 1 byte | 295 per byte | Step 5 |
| $M_W / f$ | weight bytes read per operation | 16 GB ÷ 16 GFLOP = 1 byte | Steps 2 and 3 |

$M_W / f = 1$ is no accident: each parameter is 2 bytes ($b = 2$) and costs 2 operations (Step 3). So for a bf16 model, $n^*$ is just $F / BW$.

### The numbers on the stage

$$
n^* = \frac{989 \times 10^{12}}{3.35 \times 10^{12}} \times 1 = 295.2 \approx 300
$$

| Point | $n$ | $t_{\text{mem}}$ | $t_{\text{comp}}$ | $t_{\text{step}}$ |
|---|---|---|---|---|
| decode | 1 | 4.78 ms | 0.016 ms | 4.78 ms |
| prefill, 5 | 5 | 4.78 ms | 0.081 ms | 4.78 ms |
| the corner | 295 | 4.78 ms | 4.78 ms | 4.78 ms |
| prefill, 2000 | 2,000 | 4.78 ms | 32.4 ms | 32.4 ms |

Decode and the 5-token prefill sit on the same flat line: they take the same time.

### How this matches "The arithmetic, once"

The prose writes $P$ for the parameter count, so the weights are $2P$ bytes, the $M_W$ here; that $P$ is not chapter 1's prompt length $P$. The prose also notes that reading only 15 GB of weights and running the output layer only at the last position shrink the read and the math together, so the balance point barely moves.

### Next

Step 9 shows which part a user feels in a chat.

## Step 9 · Two parts of a chat: the wait for the first word, and the typing speed

> **In one line:** a reply starts with 32 ms of prefill, up to the first token; after that a token arrives every 4.9 ms, each one a decode step.

### On the stage

- A time axis from 0 to 90 ms, to scale.
- The long blue block "prefill · 32 ms of math": Step 7's 2,000-token prefill.
- The vertical dashed line "first token", where prefill ends.
- A row of amber blocks after it: one decode step and one token each, 11 in all.
- The legend line: "then a token every 4.9 ms: the weights and the prompt's cache, read again".

### Formula

A decode block uses Step 6's formula with $c = 2{,}000$:

$$
t_{\text{mem}} = \frac{M_W + c \times 128\ \text{KB}}{BW}
$$

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| prefill | Step 7 | 32.4 ms | 32 ms |
| $M_{KV}$, $c = 2{,}000$ | 2,000 × 128 KB | 0.256 GB | |
| one decode step | (16 + 0.256) ÷ 3.35 | 4.85 ms | 4.9 ms |
| tokens per second | 1,000 ÷ 4.85 | about 206 | |
| time left after prefill | 90 − 32.4 | 57.6 ms | |
| blocks that fit | 57.6 ÷ 4.85 = 11.9, rounded down | 11 | 11 |

### Two common measures

- **Time to first token (TTFT)**: from sending the request to the first token. Here it is set by prefill's math.
- **Time between tokens**: the gap between consecutive tokens after that, the typing speed. Here it is set by decode's read.

The decode blocks are drawn equal. Really each is slightly longer than the last: every new token adds 1 to $c$ and 128 KB to the cache, about 0.00004 ms per step.

### Next

Step 10 returns to decode's 0.3%.

## Step 10 · During decode the GPU is almost always idle

> **In one line:** in a decode step the compute units are busy 0.3% of the time and produce one token for one user; what if the step carried tokens from several users?

### On the stage

- The same picture as Step 5: 1 amber token, read 16 GB, memory bar 4.8 ms, compute bar 0.016 ms.
- The compute box now has a thick red outline, and the busy tag is bold red: "busy 0.3% of the step".

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| busy | 0.0162 ÷ 4.78 | 0.3% |
| idle | 100% − 0.3% | 99.7% |
| what the step produces | | 1 token for 1 sequence |

### How the idle time could be used

Step 8's chart: below $n = 295$, $t_{\text{step}}$ stays at 4.8 ms. In Step 3, 5 prompt tokens shared one read. If a step's $n$ tokens came from $n$ different users, each decoding its own next token, they could share the same 16 GB read.

Each user has their own cache, so each $M_{KV}$ is still read separately. Chapter 5's pictures count only the weight read; how the cache read grows with the number of users is worked out in chapter 14.

### Next

Chapter 5 puts several users' decode into one step. This is called batching.
