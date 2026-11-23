## Step 1 · Same sequence, and a place to keep things

> **In one line:** chapter 2's 5 tokens, layer and head again; this time a KV cache sits underneath to hold the k and v already computed.

### On the stage

- Five blue boxes: the prompt's 5 tokens, `The`, `␣capital`, `␣of`, `␣France`, `␣is` (Ch. 2 Step 1).
- The large dashed box at the bottom: the **KV cache**, drawn for one layer and one head only.
- Two rows of dashed slots inside it: keys (`k`) on top, values (`v`) below, one slot per position.

### Background

Ch. 2 Step 14 ended on this: on every decode step the new token needs every earlier $k_j$ and $v_j$, and only those, yet the naive loop recomputes them identically each step. This chapter keeps them instead.

Seven slots are drawn because the sequence grows to 7 tokens in this chapter: the 5 of the prompt, then `␣Paris` and `.`. Every slot is empty now. Subscripts follow chapter 2: $k_j$ and $v_j$ belong to position $j$.

### Next

Step 2 runs the first forward pass, computing the prompt's 5 positions together.

## Step 2 · The first forward pass: five positions at once

> **In one line:** exactly as in Ch. 2 Step 3, each of the five positions computes its $x$, $q$, $k$ and $v$.

### On the stage

- Four rows of cells under "computed this step": grey $x_1 \dots x_5$, purple $q_1 \dots q_5$, cyan $k_1 \dots k_5$, green $v_1 \dots v_5$.
- The cache is still empty.

### Formula

$$
q_j = W_Q\,x_j,\qquad k_j = W_K\,x_j,\qquad v_j = W_V\,x_j,\qquad j = 1 \dots 5
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $x_j$ | position $j$'s vector entering this layer | 4,096 numbers | Ch. 2 Step 2 |
| $W_Q, W_K, W_V$ | the layer's three trained matrices, shared by every position | 128 × 4,096 each | Ch. 2 Step 3 |
| $q_j, k_j, v_j$ | position $j$'s query, key, value | 128 numbers each | this step |

### What differs from chapter 2

Nothing yet. The difference comes in Step 3: what happens to $k$ and $v$ after attention has used them.

## Step 3 · Attention as before, then k and v go into the cache

> **In one line:** the prompt's attention is Ch. 2 Step 7's; afterwards the 5 keys and 5 values are filed in slots 1–5 and the 5 queries are dropped.

### On the stage

- $k_1 \dots k_5$ and $v_1 \dots v_5$ fly down into the cache's k and v rows, slots 1–5.
- $q_1 \dots q_5$ fade: used, and not kept.

### Formula

The prompt's attention is the causal version from Ch. 2 Step 7:

$$
\begin{gathered}
\text{score}_{ij} = q_i \cdot k_j\\
w_{ij} = \frac{e^{\text{score}_{ij}}}{\sum_{m \le i} e^{\text{score}_{im}}}\\
\text{out}_i = \sum_{j \le i} w_{ij}\, v_j
\end{gathered}
$$

| Symbol | What it is | From |
|---|---|---|
| $i$ | the position whose output is computed, $1 \dots 5$ | Ch. 2 Step 7 |
| $j$ | the position looked at, only $1 \dots i$ | Ch. 2 Step 7 |
| $\text{score}_{ij}$ | position $i$'s attention score for position $j$ | Ch. 2 Step 4 |
| $w_{ij}$ | the weight after softmax; each row sums to 1 | Ch. 2 Step 5 |
| $\text{out}_i$ | position $i$'s output for this head | Ch. 2 Step 6 |

### The numbers on the stage

5 positions give 1 + 2 + 3 + 4 + 5 = 15 dot products in the triangle, all in one forward pass.

### Why q can go

Each $q_i$ is used only in its own row, to compute $\text{out}_i$. Ch. 2 Step 13 showed that no later step reads it. Only $k$ and $v$ are kept: after this step the cache holds 5 keys and 5 values for this layer and head.

### Next

Step 4 generates `␣Paris` and shows how much less the next forward pass computes.

## Step 4 · A decode step computes only the new column

> **In one line:** `␣Paris` arrives and only it computes $x_6$, $q_6$, $k_6$, $v_6$; the 5 old columns are not computed again.

### On the stage

- The orange sixth box: the new token `␣Paris`.
- Under "computed this step", only column 6 has cells: $x_6, q_6, k_6, v_6$.
- The 5 earlier columns show dashed outlines where their cells were: those vectors are not produced this step.
- The cache still holds Step 3's 5 keys and 5 values.

### Formula

$$
q_6 = W_Q\,x_6,\qquad k_6 = W_K\,x_6,\qquad v_6 = W_V\,x_6
$$

$x_6$ is `␣Paris`'s input vector (Ch. 2 Step 9); the matrices are Step 2's three.

### The numbers on the stage

| Approach | Columns computed in this layer this step | Why |
|---|---|---|
| No cache (Ch. 2 Steps 9–11) | 6 | every column recomputed |
| With the cache (this step) | 1 | only the new token |

With $n$ tokens already in the sequence, recomputing costs $n + 1$ columns; the cache always costs 1.

The old $k_1 \dots k_5$ and $v_1 \dots v_5$ are still needed (Ch. 2 Step 12); they now come from the cache.

### Next

Step 5 files $k_6$ and $v_6$ first.

## Step 5 · The new k and v go into slot 6

> **In one line:** $k_6$ and $v_6$ are written to the cache's sixth slot, so the cache now holds every key and value the sequence has.

### On the stage

- The cache's k and v rows now have 6 cells each: $k_1 \dots k_6$ and $v_1 \dots v_6$.
- $q_6$ is not written anywhere.

### Why write before attention

`␣Paris` also attends to itself: in the causal triangle, row $i$ includes column $i$ (Ch. 2 Step 7). So Step 6 needs $\text{score}_{66} = q_6 \cdot k_6$ and the term $w_{66} v_6$, and $k_6$ and $v_6$ have to be in the cache first.

### Counting

Each decode step appends exactly 1 key and 1 value per head per layer. With $n$ tokens in the sequence, the cache holds $n$ of each.

### Next

Step 6 reads the cache with $q_6$.

## Step 6 · q₆ reads the whole cache, and gets what recomputing got

> **In one line:** `␣Paris` scores $q_6$ against the 6 cached keys and blends the 6 cached values by weight; the numbers are identical to Ch. 2 Step 12's recomputation.

### On the stage

- The numbers above the cached keys: the weights $w_{6j}$, 0.06, 0.17, 0.05, 0.26, 0.08, 0.39.
- The shade of each green value cell and the thickness of each curve into $\text{out}_6$: both follow $w_{6j}$.
- The tag "q₆ reads all 6": how many keys are read.
- $q_6$'s cell has a thicker border: it is the query in use.

### Formula

The same three steps as Ch. 2 Step 12, with every $k_j$ and $v_j$ read from the cache:

$$
\begin{gathered}
\text{score}_{6j} = q_6 \cdot k_j\\
w_{6j} = \frac{e^{\text{score}_{6j}}}{\sum_{m=1}^{6} e^{\text{score}_{6m}}}\\
\text{out}_6 = \sum_{j=1}^{6} w_{6j}\, v_j
\end{gathered}
$$

| Symbol | What it is | From |
|---|---|---|
| $q_6$ | `␣Paris`'s query | Step 4 |
| $k_j, v_j$ | position $j$'s key and value, $j = 1 \dots 6$ | the cache: Step 3 (1–5) and Step 5 (6) |
| $\text{score}_{6j}$ | `␣Paris`'s score for position $j$ | this step |
| $w_{6j}$ | the weights; the 6 sum to 1 | this step |
| $\text{out}_6$ | `␣Paris`'s output for this head | this step |

### The numbers on the stage

The scores are illustrative and the same as Ch. 2 Step 12's:

| $j$ | token | $\text{score}_{6j}$ | $e^{\text{score}_{6j}}$ | $w_{6j}$ |
|---|---|---|---|---|
| 1 | `The` | 0.3 | 1.35 | 0.06 |
| 2 | `␣capital` | 1.4 | 4.06 | 0.17 |
| 3 | `␣of` | 0.1 | 1.11 | 0.05 |
| 4 | `␣France` | 1.8 | 6.05 | 0.26 |
| 5 | `␣is` | 0.6 | 1.82 | 0.08 |
| 6 | `␣Paris` | 2.2 | 9.03 | **0.39** |
| | | | total 23.41 | 1.00 |

For example $w_{66} = 9.03 / 23.41 \approx 0.39$. The output:

$$
\text{out}_6 = 0.06\,v_1 + 0.17\,v_2 + 0.05\,v_3 + 0.26\,v_4 + 0.08\,v_5 + 0.39\,v_6
$$

### Why it matches recomputing

Each cached $k_j$ and $v_j$ was computed with the same matrices from the same $x_j$, and $x_j$ depends only on the tokens at positions $1 \dots j$, which have not changed (Ch. 2 Step 11). The cache holds exactly what recomputing would produce.

What is saved is the matrix multiplies, not the read: $q_6$ still reads all 6 keys and 6 values.

### Next

Step 7 generates one more token and runs Steps 4–6 in one picture.

## Step 7 · The next token: one column, one new slot, one read of the cache

> **In one line:** `.` arrives: one column $x_7, q_7, k_7, v_7$ is computed, $k_7$ and $v_7$ go into slot 7, and $q_7$ reads all 7 keys and values.

### On the stage

- The seventh, orange box `.`; only its column has computed cells.
- The cache's two rows have 7 cells each, with the weights $w_{7j}$ above the keys.
- The tag "q₇ reads all 7".

### Formula

Step 6 with 6 replaced by 7:

$$
\begin{gathered}
\text{score}_{7j} = q_7 \cdot k_j\\
w_{7j} = \frac{e^{\text{score}_{7j}}}{\sum_{m=1}^{7} e^{\text{score}_{7m}}}\\
\text{out}_7 = \sum_{j=1}^{7} w_{7j}\, v_j
\end{gathered}
$$

### The numbers on the stage

| $j$ | token | $\text{score}_{7j}$ | $e^{\text{score}_{7j}}$ | $w_{7j}$ |
|---|---|---|---|---|
| 1 | `The` | 0.2 | 1.22 | 0.06 |
| 2 | `␣capital` | 1.1 | 3.00 | 0.15 |
| 3 | `␣of` | 0.1 | 1.11 | 0.05 |
| 4 | `␣France` | 1.5 | 4.48 | 0.22 |
| 5 | `␣is` | 0.5 | 1.65 | 0.08 |
| 6 | `␣Paris` | 1.9 | 6.69 | **0.33** |
| 7 | `.` | 0.8 | 2.23 | 0.11 |
| | | | total 20.37 | 1.00 |

The scores are illustrative. For example $w_{76} = 6.69 / 20.37 \approx 0.33$.

### How the two quantities move

| Quantity | `␣Paris` (Step 6) | `.` (this step) | Each further token |
|---|---|---|---|
| Compute | 1 column | 1 column | unchanged |
| Read | 6 k + 6 v | 7 k + 7 v | one more of each |

### Next

Step 8 answers why $q$ is not kept too.

## Step 8 · Why q is not kept

> **In one line:** the formulas of Steps 6 and 7 contain only the current query; old queries, if stored, would never be read.

### On the stage

- A ghost row under the cache: $q_1 \dots q_7$, purple dashed outlines, struck through.
- The tag "used once, never read again".

### Read the formula

Step 7's $\text{score}_{7j} = q_7 \cdot k_j$ and $\text{out}_7 = \sum_j w_{7j} v_j$ use:

| Used | From |
|---|---|
| the current $q_7$ | computed this step |
| $k_1 \dots k_7$ | the cache |
| $v_1 \dots v_7$ | the cache |

No $q_i$ with $i < 7$ appears.

### Follow an old query

- $q_i$ is used once, on the step where position $i$ is computed, to produce $\text{out}_i$.
- $\text{out}_i$ goes straight on to the rest of the layer (end of Ch. 2 Step 6).
- Ch. 2 Step 13 showed that the only later use of $\text{out}_i$ was rebuilding the next layer's old $k$ and $v$, which the cache now replaces.

So a q row would be written and never read. The cache holds only k and v, which is where the name KV cache comes from.

## Step 9 · How big the cache is

> **In one line:** the stage draws one layer and one head; across all of Llama-3-8B, each token needs 128 KB.

### On the stage

- First legend line: `7 tokens × 128 KB = 896 KB`, with the 5 factors in grey brackets: 32 layers · 8 k, v heads · 128 dims · k and v · 2 bytes.
- Second line: at 8k tokens, 1 GB, for one sequence.

### Formula

$$
\text{cache per token} = L \times H_{kv} \times d_{head} \times 2 \times b
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $L$ | layers | 32 | `LAYERS` in `src/numbers.ts` |
| $H_{kv}$ | k, v heads per layer | 8 | Ch. 2 Step 14 (32 query heads share 8 sets of k, v, 4 each) |
| $d_{head}$ | length of one k or v | 128 numbers | Ch. 2 Step 3 |
| 2 | one k and one v | | Step 8: only k and v are kept |
| $b$ | bytes per number | 2 (bf16) | `BYTES` in `src/numbers.ts` |

bf16 is a 16-bit, 2-byte number format; the model's weights and the cache are both stored in it.

### The numbers on the stage

| Up to | Arithmetic | Result |
|---|---|---|
| one k | 128 × 2 B | 256 B |
| one k and one v | 256 B × 2 | 512 B |
| one layer (8 heads) | 512 B × 8 | 4,096 B = 4 KB |
| all 32 layers | 4 KB × 32 | **128 KB** |
| the stage's 7 tokens | 7 × 128 KB | 896 KB |
| 8k = 8,192 tokens | 8,192 × 128 KB = 1,048,576 KB | **1 GB** |

That is for **one sequence**. Ten sequences of that length hold 10 GB; the cost grows linearly with length and is paid per sequence.

### Next

Chapter 4 sets these bytes against the 16 GB of weights every step reads, and chapter 7 against the GPU's memory.

## Step 10 · Two very different kinds of step

> **In one line:** the first step computes 5 tokens and writes 5 slots; every step after computes 1 token but reads the whole cache.

### On the stage

- Blue bracket over the prompt: "first step · five tokens, one pass, writes the cache".
- Orange bracket over `␣Paris` and `.`: "every step after · one token, reads the whole cache".
- Step 9's two size lines are still there.

### The two kinds side by side

| | First step (Steps 2–3) | Every step after (Steps 4–7) |
|---|---|---|
| Tokens | 5 | 1 |
| Columns of $x, q, k, v$ | 5 | 1 |
| Dot products | 15 (the causal triangle) | $n$ (the new query against every cached key) |
| Cache written | 5 slots | 1 slot |
| Cache read | none | all $n$ keys and $n$ values, $n \times 128$ KB across all layers (Step 9) |

$n$ is the sequence's current length: $n = 6$ on `␣Paris`'s step, $n = 7$ on `.`'s.

### Why they differ so much

- The first step: many columns share one set of matrices, so each byte of weights read feeds many multiplies.
- Every step after: one column of multiplies, yet the whole cache is still read and, as chapter 4 shows, so are all of the model's weights.

### Next

Chapter 4 names the two jobs **prefill** and **decode** and measures what limits each.
