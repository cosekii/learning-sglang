## Step 1 · One user: chapter 4's decode step

> **In one line:** With one user, a step reads 16 GB of weights in 4.8 ms, produces 1 token, and the compute units are busy 0.3% of it.

### On the stage

- Left box, "memory": the blue "weights 16 GB".
- A thick arrow, "read 16 GB", "once per step", into the middle box, "compute".
- The compute box: `1 × 16 GFLOP`, and under it a red busy bar, almost empty, "busy 0.3% of the step".
- On the right, 1 orange `tok` chip, titled "1 user, one token each".
- Four tiles below: tokens per step 1, step time 4.8 ms, GPU busy 0.3%, tokens per second 209.

### Formula

Ch. 4 Step 5's formulas, with the step's token count $n$ renamed to the number of users $B$:

$$
t_{\text{mem}} = \frac{M_W}{BW},\qquad
t_{\text{comp}} = \frac{B\,f}{F},\qquad
t_{\text{step}} = \max(t_{\text{mem}},\ t_{\text{comp}})
$$

$$
R = \frac{B}{t_{\text{step}}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $B$ | users in the batch; in decode each adds 1 token per step, so it is also the step's token count $n$ | 1 here | this step; $n$ from Ch. 4 Step 3 |
| $M_W$ | weight bytes read per step | 16 GB | Ch. 4 Step 2; `W_GB` |
| $BW$ | HBM bandwidth | 3.35 TB/s | Ch. 4 Step 5; `BW` |
| $f$ | operations for one token | 16 GFLOP | Ch. 4 Step 3; `GFLOP_PER_TOKEN` |
| $F$ | operations per second (bf16) | 989 TFLOP/s | Ch. 4 Step 5; `TFLOPS` |
| $t_{\text{mem}}, t_{\text{comp}}, t_{\text{step}}$ | read time, math time, step time | | Ch. 4 Step 5 |
| $R$ | tokens per second (throughput) | | this step |

### The numbers on the stage

| Tile | Calculation | Result | On the stage |
|---|---|---|---|
| step time $t_{\text{step}}$ | max(16 ÷ 3.35, 1 × 16 ÷ 989) = max(4.78, 0.016) | 4.78 ms | 4.8 ms |
| busy $t_{\text{comp}} / t_{\text{step}}$ | 0.0162 ÷ 4.78 | 0.34% | 0.3% |
| tokens per second $R$ | 1 ÷ 4.78 ms | 209 /s | 209 |

### Next

Step 2 adds a second user.

## Step 2 · A second user rides the same read

> **In one line:** $B = 2$: two tokens multiply the same weights, the read does not change, the step is still 4.8 ms, and throughput doubles.

### On the stage

- 2 orange `tok` chips, titled "2 users, one token each"; the compute box says `2 × 16 GFLOP`.
- Tiles: 2, 4.8 ms, 0.7%, 419.
- Legend line: "2 tokens share one 4.8 ms read of the weights. Per-user latency: unchanged."
- Grey footnote: counts only the weight read; each user's own KV cache is read too (Ch. 4 Step 6), and that grows with every user added (chapter 14).

### The numbers on the stage

| Quantity | Calculation | Result | On the stage |
|---|---|---|---|
| $t_{\text{comp}}$ | 2 × 16 ÷ 989 | 0.032 ms | |
| $t_{\text{step}}$ | max(4.78, 0.032) | 4.78 ms | 4.8 ms |
| busy | 0.032 ÷ 4.78 | 0.68% | 0.7% |
| $R$ | 2 ÷ 4.78 ms | 419 /s | 419, twice step 1 |

### Why the read stays the same

Each weight comes from HBM into the compute units once and is multiplied against both users' vectors, as the 5 prompt tokens shared one read in Ch. 4 Step 3. Each user still gets one token every 4.8 ms.

### What the footnote leaves out

The weights are shared; the KV cache is not. A user with $c$ tokens of context has its own $c \times 128$ KB of cache (Ch. 4 Step 6), read every step as well. So the true $t_{\text{mem}}$ grows with $B$; this chapter's picture does not count it.

### Next

Step 3 keeps adding, up to 64 users.

## Step 3 · 64 users: 64× the throughput

> **In one line:** At $B = 64$ the math takes 1.04 ms, still shorter than the 4.8 ms read; the step time does not move, and tokens per second is 64×.

### On the stage

- 6 `tok` chips, the last one `…` (the picture draws at most 6); the title and the compute box carry the real count, 64 and `64 × 16 GFLOP`.
- The busy bar grows to about a fifth, still red.
- Tiles: 64, 4.8 ms, 22%, 13,400.
- Legend line and footnote as in step 2.

### The numbers on the stage

| Quantity | Calculation | Result | On the stage |
|---|---|---|---|
| math $B f$ | 64 × 16 GFLOP | 1,024 GFLOP | |
| $t_{\text{comp}}$ | 1,024 ÷ 989 | 1.04 ms | |
| $t_{\text{step}}$ | max(4.78, 1.04) | 4.78 ms | 4.8 ms |
| busy | 1.04 ÷ 4.78 | 21.7% | 22% |
| $R$ | 64 ÷ 4.78 ms | 13,400 /s | 13,400 |

13,400 = 64 × 209.4 (step 1's $R$ before rounding). While $t_{\text{step}}$ stays put, $R = B / t_{\text{mem}}$ is proportional to $B$.

### Next

Step 4 takes $B$ past chapter 4's balance point.

## Step 4 · 512 users: past the balance point

> **In one line:** At $B = 512$ the math takes 8.3 ms, longer than the read, so the step stretches; throughput stops at 61,813 tokens/s, and more users only add latency.

### On the stage

- The compute box says `512 × 16 GFLOP`; the busy bar is full and turns blue.
- Tiles: 512, 8.3 ms, 100%, 61,813.
- Legend line: "512 tokens of math take 8.3 ms, longer than the 4.8 ms read. Every extra token now costs time."

### Formula

The balance point is the $B$ where $t_{\text{comp}} = t_{\text{mem}}$, Ch. 4 Step 8's $n^*$:

$$
\frac{B^* f}{F} = \frac{M_W}{BW}
\;\Longrightarrow\;
B^* = \frac{F}{BW} \times \frac{M_W}{f} = \frac{F}{BW}
$$

Past it, $t_{\text{step}} = t_{\text{comp}}$, so

$$
R = \frac{B}{B f / F} = \frac{F}{f}
$$

| Symbol | What it is | From |
|---|---|---|
| $B^*$ | users at the balance point | this step; Ch. 4 Step 8's $n^*$ |
| $M_W / f$ | 16 GB ÷ 16 GFLOP = 1 byte per operation | Ch. 4 Step 8 |

### The numbers on the stage

| Quantity | Calculation | Result | On the stage |
|---|---|---|---|
| $t_{\text{comp}}$ | 512 × 16 ÷ 989 | 8.28 ms | 8.3 ms |
| $B^*$ | 989 ÷ 3.35 | 295 | rounded to 300 in the caption |
| $R$ | 989 TFLOP/s ÷ 16 GFLOP | 61,813 /s | 61,813 |

$R$ has no $B$ in it: above about 300 users throughput stops growing, and each user's time per token goes from 4.8 ms to 8.3 ms. That is why the caption calls about 300 tokens per step the sweet spot.

### Next

Step 5 asks what requests it takes to fill 300 tokens a step.

## Step 5 · Real requests are ragged

> **In one line:** 300 tokens per step needs about 300 requests decoding at once, and requests differ in when they arrive, how long the prompt is, and how long the answer is.

### On the stage

- Time ticks along the top: 0, 25, 50, 75, 100 ms.
- Six rows, `req 1`–`req 6`, each starting at its arrival (a thin vertical line): 0, 4, 7, 15, 18, 26 ms.
- Each row is a blue bar (prompt) then an orange bar (answer), labelled like "prompt 1,200 · answer ~100 tokens".
- Legend at the bottom: blue "prompt: one prefill, all its tokens at once"; orange "then the answer: one decode step per token".

### The numbers on the stage

| Request | Arrives | Prompt | Answer | Prefill math $n f / F$ |
|---|---|---|---|---|
| req 1 | 0 ms | 1,200 | ~100 | 19.4 ms |
| req 2 | 4 ms | 300 | ~40 | 4.85 ms |
| req 3 | 7 ms | 2,600 | ~150 | 42.1 ms |
| req 4 | 15 ms | 800 | ~70 | 12.9 ms |
| req 5 | 18 ms | 150 | ~30 | 2.43 ms |
| req 6 | 26 ms | 2,000 | ~90 | 32.4 ms |

The prefill column uses Ch. 4 Step 7's arithmetic, with $n$ = the prompt length. Req 5's 2.43 ms is under the 4.78 ms read, so its step still takes 4.78 ms; req 3's 42.1 ms is far over it. Each answer token is one decode step: req 1's ~100 tokens are ~100 steps.

### The two bars use different scales

A blue bar is 0.05 px per token, an orange bar 0.7 px per token, 14× apart. Bars of the same colour compare; a blue bar and an orange bar do not. The ms axis only places the arrivals; bar length is not time.

### Next

Step 6 puts these six into one batch the simplest way.

## Step 6 · Static batching

> **In one line:** Take six requests, prefill them together, decode in lockstep until the last answer ends, then take the next six; membership does not change while the batch runs.

### On the stage

- Left, a blue dashed box, "batch 1 · six requests": step 5's req 1–6, each with its blue (prompt) and orange (answer) bar; under it, "fixed until all six finish".
- Middle box, "the GPU, step by step", four numbered rows:
  1. Blue dot, "prefill all six prompts": one forward pass, so they finish together.
  2. Orange dot, "decode, in lockstep": one token for each, per step.
  3. Orange dot, "repeat until the last is done": short answers sit idle meanwhile.
  4. Blue dot, "then admit the next six", and prefill them together.
- Right, a dashed "queue" box: req 7–11, each "waiting"; under it, "admitted after batch 1 ends, even if most of it finished early".

### Why an empty place is lost

Row 2 is the decode step of steps 1–4 with $B = 6$. The batch lasts as long as its longest answer, req 3's ~150 tokens, while req 5 is done after ~30. A finished request's place is not given to anyone, so $B$ shrinks as answers end, and each step still spends $t_{\text{mem}} = 4.78$ ms reading the weights (step 1). One user fewer is one share of $R$ fewer.

### Next

Step 7 draws this as a grid of slots × steps and counts the empty cells.

## Step 7 · Static batching on a grid

> **In one line:** 6 slots over 20 steps are 120 cells: 66 tokens, 42 idle cells, and req 7 waits until step 16.

### On the stage

- Title: "6 slots · 20 engine steps · static batching".
- Rows are **slots**, the 6 places in the batch; slot $k$ starts with req $k$. Columns are engine steps 0–19, one forward pass each.
- Cell colours: blue prefill, orange decode (one token per cell), pale grey idle.
- Columns with a prefill are drawn a little wider and headed with a blue `⫽`; legend "prefill step ⫽ drawn short · 2,000 tokens: 7× a decode step".
- Legend lines: tokens produced 66 · idle slot-steps 42 of 120; request 7 can't start until step 16, after request 3 finishes at step 15, and slot 5 sat idle for 12 of those steps.

### The numbers on the stage

To fit 20 columns, the answers are a tenth of step 5's lengths: req 1–6 decode 10, 4, 15, 7, 3, 9 steps. Each request prefills at step 0, then fills one decode cell per step.

| Quantity | Calculation | Result |
|---|---|---|
| batch 1 ends | req 3 decodes in steps 1–15 | step 15 |
| req 7–12 | prefill at step 16, decode in steps 17–19 | 3 tokens each |
| tokens produced | (10 + 4 + 15 + 7 + 3 + 9) + 6 × 3 = 48 + 18 | 66 |
| prefill cells | 6 at step 0 + 6 at step 16 | 12 |
| idle | 120 − 66 − 12 | 42 |
| slot 5 idle | req 5 finishes at step 3, empty for steps 4–15: 16 − 3 − 1 | 12 steps |
| prefill column ratio | $t_{\text{comp}}(2{,}000) / t_{\text{mem}}$ = 32.4 ÷ 4.78 | 6.8, shown as 7× |

32.4 ms is Ch. 4 Step 7's 2,000-token prefill. The two prefill columns are drawn only a little wider than a decode column; they are about 7× longer.

### Next

Step 8 changes the rule: a slot is refilled as soon as it frees.

## Step 8 · Continuous batching

> **In one line:** The batch is rebuilt every step, so the next request prefills on the step after a slot frees; the same 20 steps produce 102 tokens, 55% more.

### On the stage

- The same grid, 6 slots, 20 steps, titled "continuous batching".
- Prefill cells are scattered; 10 columns hold a prefill (steps 0, 4, 5, 8, 10, 11, 13, 15, 16, 17).
- Legend lines: tokens produced 102 · idle slot-steps 2 of 120; 55% more tokens than static, and request 7 started at step 4 instead of 16.
- Grey footnote: this is Orca's design (2022); SGLang by default runs a prefill as a step of its own while the others wait (chapter 6).

### The order of refills

The queue's req 7–16 decode 6, 9, 4, 7, 5, 8, 6, 5, 7, 4 steps. The rule: if a slot's request finishes at step $t-1$, the head of the queue prefills there at step $t$.

| Step | Slot freed | Takes |
|---|---|---|
| 4 | slot 5 (req 5 finished at step 3) | req 7 |
| 5 | slot 2 | req 8 |
| 8 | slot 4 | req 9 |
| 10 | slot 6 | req 10 |
| 11 | slots 1 and 5 | req 11, req 12 |
| 13, 15, 16, 17 | slots 4, 2, 3, 1 | req 13–16 |

The queue is then empty, so slot 6 is idle for steps 18–19.

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---|
| prefill cells | 6 + 10 | 16 |
| tokens produced | 120 − 16 − 2 | 102 |
| more than static | (102 − 66) ÷ 66 | 54.5%, shown as 55% |

### One step mixes prefill and decode

A prefill column also holds the other slots' decode cells: one forward pass carries the newcomer's whole prompt and 1 token from every other slot, so the step's token count is the prompt length plus the decoding slots.

### In SGLang

The footnote was checked against the source: mixing prefill and decode is turned on by `--enable-mixed-chunk`, default `False` (`srt/arg_groups/fields/schedule.py`). By default SGLang runs a prefill as a step of its own.

### Next

Step 9 shows what those mixed steps cost.

## Step 9 · A prefill column stretches everyone's step

> **In one line:** A step holding a 2,000-token prompt takes about 32 ms, so the users decoding in that step wait about 7× longer for one token.

### On the stage

- Step 8's grid; columns without a prefill are dimmed.
- Decode cells inside prefill columns are redrawn as a pale orange cell with a solid orange strip at its right end: the token comes out only when the whole pass ends.
- One more legend row: "a decode slot in a prefill step: same one token, but its step is stretched to the length of the prompt's math".
- Legend line: "10 of 20 steps carry a prefill. In each one, every other slot's token only comes out when the whole pass, prompt included, is done."

### The numbers on the stage

Take a step that prefills a 2,000-token prompt while 5 other slots decode: 2,005 tokens in the step.

| Quantity | Calculation | Result | Stage / caption |
|---|---|---|---|
| $t_{\text{comp}}$ | 2,005 × 16 ÷ 989 | 32.4 ms | |
| $t_{\text{step}}$ | max(4.78, 32.4) | 32.4 ms | caption: 32 ms, not 4.8 ms |
| a decoding user's wait per token | 32.4 ÷ 4.78 | about 6.8× | 7× |

The 5 decode tokens add only 0.08 ms; almost all the time is the prompt's math.

### The two kinds of batching side by side

| | Static (step 7) | Continuous (step 8) |
|---|---|---|
| tokens in 20 steps | 66 | 102 |
| idle cells | 42 | 2 |
| steps with a prefill | 2 | 10 |

Continuous batching fills the idle slots, and in exchange there are more prefills, each slowing the other users in its step.

### Next

Whether to admit a newcomer each step, and how many, is the scheduler's decision, covered in chapter 6.
