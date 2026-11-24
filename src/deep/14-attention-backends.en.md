## Step 1 · How much attention reads per step

> **In one line:** in a decode step, attention reads every request's whole KV cache once; at batch 256 that read passes the 16 GB of weights at about 480 tokens of context.

### On the stage

- Five groups of bars, each one decode step at batch 256 for one context length: 256, 512, 1k, 2k, 4k tokens.
- Amber bars: the weight read, 16 GB in every group; the amber dashed line is its time, 4.8 ms.
- Red bars: the KV cache read, labelled in GB, with "… of reading" under each group.
- Title line: `cache read = batch × context × 128 KB`.

### Formula

$$
\begin{gathered}
M_{KV} = B \cdot c \cdot 128\ \text{KB}\\[4pt]
t_{KV} = \frac{M_{KV}}{BW}\\[4pt]
c^{*} = \frac{M_W}{B \cdot 128\ \text{KB}}
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $B$ | batch, the number of requests running together | 256 | Ch. 13 Step 9's batch |
| $c$ | context length: tokens already in each request's KV cache | x axis | Ch. 4 Step 6 |
| 128 KB | one token's k and v across 32 layers | 131,072 B | Ch. 3 Step 9 |
| $M_{KV}$ | cache bytes read this step | red bars | Ch. 4 Step 6's $M_{KV}$, times $B$ |
| $M_W$ | weight bytes | 16 GB | Ch. 4 Step 2 |
| $BW$ | HBM bandwidth | 3.35 TB/s | `BW` in `src/numbers.ts` |
| $c^{*}$ | the context where red and amber are equal | | this step |

Where 128 KB comes from: per layer, 8 K/V heads × 128 numbers × 2 (k and v) × 2 B = 4,096 B, × 32 layers = 131,072 B.

### The numbers on the stage

| $c$ | $M_{KV}$ | $t_{KV}$ |
|---|---|---|
| 256 | 256 × 256 × 131,072 B = 8.6 GB | 2.6 ms |
| 512 | 17 GB | 5.1 ms |
| 1,024 | 34 GB | 10 ms |
| 2,048 | 69 GB | 21 ms |
| 4,096 | 137 GB | 41 ms |

$c^{*} = 16 \times 10^9 \div (256 \times 131{,}072) \approx 477$, rounded to 480 in the caption. Above it, attention's read is the larger part of the step.

### Why this chapter is about attention

Chapters 11 to 13 recorded, cut and fused everything in the layer except attention (the `attn` in Ch. 13 Step 11's red box was never touched). This chapter is about the kernel that does this read.

### Next

Step 2 starts from the most direct way to write attention: three kernels.

## Step 2 · Written as three kernels

> **In one line:** written directly, attention is three kernels: score to get S, softmax to get P, P times V to get out; every entry of P needs a whole row of S, so S must be written to HBM in full first.

### On the stage

- Top row, three kernels: dark `S = Q · Kᵀ`, blue `P = softmax(S)`, dark `out = P · V`. Red arrows up are reads from HBM, down are writes (the last one, writing out, is green).
- The big `HBM` box below: Q, K, S, P, V, out, drawn with n = 6. S and P are 6 × 6 grids; Q, K, V and out are n × 128 strips.
- Red is what token $i$'s output touches: row $i$ of Q, all of K, row $i$ of S and P, all of V, row $i$ of out. One cell in row $i$ of P is outlined and labelled $P_{ij}$.
- Bottom left, three typeset formulas, each with a note beside it.

### Formula

$$
\begin{gathered}
S_{ij} = q_i \cdot k_j\\[4pt]
P_{ij} = \frac{e^{\,S_{ij} - m_i}}{\sum_k e^{\,S_{ik} - m_i}}\\[4pt]
m_i = \max_k S_{ik}\\[4pt]
\text{out}_i = \sum_j P_{ij}\, v_j
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n$ | tokens in this prefill | 6 on the stage | this step |
| $q_i, k_j, v_j$ | token $i$'s query, token $j$'s key and value, in one head | 128 numbers each | Ch. 2 Step 3 |
| Q, K, V | the $n$ queries, keys, values stacked as rows | $n \times 128$ each | this step |
| $S_{ij}$ | token $i$'s score on token $j$ | S is $n \times n$ | Ch. 2 Step 4's $\text{score}_j$, for every $i$ |
| $m_i$ | the largest score in row $i$ of S | one number | this step |
| $k$ (sum index) | runs over every column of row $i$ | | this step |
| $P_{ij}$ | token $i$'s weight on token $j$ | P is $n \times n$ | Ch. 2 Step 7's $w_{ij}$ |
| $\text{out}_i$ | token $i$'s output in this head | 128 numbers | Ch. 2 Step 7 |

As in Ch. 2 Step 4, the formula leaves out the $\div\sqrt{128}$. This $m_i$ is a maximum score and has nothing to do with Ch. 13's byte count $m_h$.

### Why subtract $m_i$

Top and bottom are both multiplied by $e^{-m_i}$, so the ratio is unchanged, and the largest exponent becomes $e^0 = 1$, so nothing overflows. With Ch. 2 Step 4's five scores:

| $j$ | $S_{ij}$ | $S_{ij} - m_i$ | $e^{S_{ij} - m_i}$ | $P_{ij}$ |
|---|---|---|---|---|
| 1 | 0.4 | −2.2 | 0.11 | 0.06 |
| 2 | 1.9 | −0.7 | 0.50 | 0.26 |
| 3 | 0.2 | −2.4 | 0.09 | 0.05 |
| 4 | 2.6 | 0 | 1 | 0.53 |
| 5 | 0.9 | −1.7 | 0.18 | 0.10 |
| | $m_i = 2.6$ | | sum 1.88 | 1.00 |

The weights are exactly Ch. 2 Step 5's.

### Why S has to reach HBM

The outlined $P_{ij}$ needs $m_i$ and the bottom sum, and both come from the whole of row $i$ of S. Written as three kernels, each one finishes and writes its result to HBM before the next starts, so S sits complete in HBM, then P.

### Next

Step 3 prices these writes and reads at a real size.

## Step 3 · What the three kernels move

> **In one line:** for a 2,000-token prompt the three kernels move 34 MB per head, 32 MB of it S and P, written once, read once and thrown away; 35 GB over the model, about 10 ms.

### On the stage

- Step 2's picture with a size under each matrix: Q, K, V, out 0.5 MB each, S and P 8 MB each.
- Four lines at the bottom: the matrix sizes, what each kernel moves, the totals per head and per prompt, and how much of it is S and P.

### Formula

$$
\begin{gathered}
M_{Q} = n \cdot 128 \cdot b\\[4pt]
M_{S} = n^2 \cdot b\\[4pt]
M_{\text{head}} = \underbrace{(2M_Q + M_S)}_{\text{kernel 1}} + \underbrace{2M_S}_{\text{kernel 2}} + \underbrace{(M_S + 2M_Q)}_{\text{kernel 3}}
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n$ | tokens in the prompt | 2,000 | this step |
| $b$ | bytes per bf16 number | 2 B | `BYTES` in `src/numbers.ts` |
| $M_Q$ | any one of Q, K, V, out, one head | 0.512 MB | this step |
| $M_S$ | S or P, one head | 8 MB | this step |
| $M_{\text{head}}$ | bytes read plus written by the three kernels, one head | 34 MB | this step |

Each kernel's bytes are what it reads plus what it writes. Here 1 MB = 10⁶ B.

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| $M_Q$ | 2,000 × 128 × 2 B | 512,000 B ≈ 0.5 MB |
| $M_S$ | 2,000² × 2 B | 8 MB |
| kernel 1: read Q, K, write S | 0.512 + 0.512 + 8 | ≈ 9 MB |
| kernel 2: read S, write P | 8 + 8 | 16 MB |
| kernel 3: read P, V, write out | 8 + 0.512 + 0.512 | ≈ 9 MB |
| $M_{\text{head}}$ | 9.024 + 16 + 9.024 | 34.048 ≈ 34 MB |
| one prompt | 34.048 MB × 32 heads × 32 layers | 34.9 ≈ 35 GB |
| time | 34.9 GB ÷ 3.35 TB/s | ≈ 10 ms |

10 ms is about twice the 4.8 ms weight read. The count uses the 32 query heads, because there is one S and one P per query head.

### Which bytes are needed

- S and P: 2 × (8 + 8) = 32 MB, each written once and read once, then never used again.
- Reading Q, K, V once and writing out once: 4 × 0.512 ≈ 2 MB. That is all the output needs.

### Next

Step 4 removes the 32 MB.

## Step 4 · FlashAttention: one kernel, K and V in chunks

> **In one line:** fuse the three kernels into one: read K and V a chunk at a time, keep only three running values per row (max, sum, output), and drop each chunk's scores; S and P never reach HBM, and 34 MB per head becomes 2 MB.

### On the stage

- A green box at the top: `attention · fused · online softmax`, noting that each row carries $m_i$, $\ell_i$, $\text{out}_i$.
- In HBM: Q (row $i$ red), K and V each cut into 4 chunks, S and P as dashed outlines marked "never written" (0 MB), and out.
- A looping animation: chunks 1, 2, 3, 4 darken in turn as they are read, and fade once done; after all four, row $i$ of out turns red and the green arrow writes it back.
- A bold line says what is happening now; top right of the HBM box: 2 MB moved for this head, against step 3's 34 MB.
- At the bottom, the rescaling identity, typeset.

### Formula

When a new chunk raises row $i$'s max from $m$ to $m'$:

$$
\begin{gathered}
e^{\,s - m'} = e^{\,s - m}\, e^{\,m - m'}
\\[2pt] \Downarrow \\[2pt]
\ell \leftarrow \ell\, e^{\,m - m'} + \sum_{\text{chunk}} e^{\,s - m'}\\[4pt]
\text{out} \leftarrow \text{out}\, e^{\,m - m'} + \sum_{\text{chunk}} e^{\,s - m'}\, v
\end{gathered}
$$

| Symbol | What it is | From |
|---|---|---|
| $s$ | one score $S_{ij}$, computed in registers and dropped after use | Step 2 |
| $m_i$ ($m$ on the stage) | the largest score seen so far | Step 2's $m_i$, before the whole row is seen |
| $m'$ | the max after the new chunk | this step |
| $\ell_i$ ($\ell$ on the stage) | the running sum of $e^{S_{ij} - m_i}$, step 2's bottom of $P_{ij}$ | this step |
| $\text{out}_i$ | the running sum of $e^{S_{ij} - m_i}\, v_j$, the top | this step |
| $v$ | the values of the keys in this chunk | Step 2's V |

At the end $\text{out}_i \div \ell_i$ is step 2's $\text{out}_i$. The three running values live in registers (Ch. 13 Step 4).

### The numbers on the stage

Ch. 2 Step 4's five scores, two per chunk (the stage has 4 chunks; 3 keep the arithmetic short):

| chunk | scores | $m$ | factor $e^{m - m'}$ | $\ell$ | out |
|---|---|---|---|---|---|
| 1 | 0.4, 1.9 | 1.9 | | $e^{-1.5} + e^0 = 0.22 + 1 = 1.22$ | $0.22\,v_1 + 1\,v_2$ |
| 2 | 0.2, 2.6 | 2.6 | $e^{-0.7} = 0.50$ | $1.22 \times 0.50 + 0.09 + 1 = 1.70$ | $0.11\,v_1 + 0.50\,v_2 + 0.09\,v_3 + 1\,v_4$ |
| 3 | 0.9 | 2.6 | 1 | $1.70 + e^{-1.7} = 1.88$ | plus $0.18\,v_5$ |

$\text{out} \div \ell = 0.06\,v_1 + 0.26\,v_2 + 0.05\,v_3 + 0.53\,v_4 + 0.10\,v_5$, matching step 2's table.

### The bytes

Q, K and V read once, out written once: 4 × 0.512 ≈ 2 MB; S and P are 0 MB. Against step 3's 34 MB.

### What is not covered

This step shows only the identity. The rest of FlashAttention's design (tile sizes, the backward pass used in training) is outside this chapter, as the prose says. A real kernel uses 64 keys per chunk (Step 7).

### Next

Step 5: this loop is the same in every attention kernel, so why are there so many kernels?

## Step 5 · Four things that change how the loop is written

> **In one line:** the loop stays the same; four things force it to be written differently. Two are handled inside every backend (how many queries, where K/V sit), and two decide which backend runs (head layout, GPU).

### On the stage

- Green bar at the top: step 4's loop, a query row against K and V, a chunk at a time.
- Four numbered rows, each with a name and two lines on the left, a pictogram in the middle, and on the right the column it falls in and the step that covers it.
- Two shaded columns on the right: "inside every backend" and "picks the backend".

### The four

| Row | What it is | Pictogram | Column | Covered in |
|---|---|---|---|---|
| 1 | the model's head layout: how many query heads (blue) share one cached K/V head (orange) | MHA one each, GQA several to one, MLA all to one wide vector | picks the backend | Step 6 |
| 2 | how many queries: in prefill one per prompt token, in decode one per request | prefill a triangle (each token sees only up to itself, Ch. 2 Step 7), decode one row | inside every backend | Steps 7–8 |
| 3 | where K and V sit: one tensor per request, or pages anywhere in a pool (Ch. 7 Step 4) | one contiguous strip against scattered cells in a pool | inside every backend | Step 9 |
| 4 | which GPU: each generation adds hardware | A100 / FA2, H100 / FA3, B200 / TRT-LLM, MI300 / aiter | picks the backend | Step 10 |

### How the four relate

They are not alternatives; every request meets all four at once. This book's setup is GQA (row 1), runs both prefill and decode (row 2), uses pages (row 3), on an H100 (row 4).

- Rows 2 and 3 are **inside every backend**: every backend ships a prefill kernel and a decode kernel, and reads K/V through a page table.
- Rows 1 and 4 **pick the backend**: a backend is written for some head layouts and some GPUs.

Heads come first because step 7 uses step 6's uses-per-byte count.

### Next

Step 6: row 1, the head layout.

## Step 6 · 1 of 4: the head layout

> **In one line:** the model fixes how many query heads share a K/V head (1, 4 or 128) and how wide k and v are; a kernel is compiled for one width, so MHA and GQA, both 128 wide, share one kernel, and MLA's 576 and 512 need their own.

### On the stage

- Three rows: MHA (Llama-2-7B), GQA (Llama-3-8B), MLA (DeepSeek-V3). In each, the top strip is query heads in blue and the bottom strip is the cached K/V in orange.
  - MHA: 32 blue cells over 32 orange cells.
  - GQA: 32 blue cells over 8 wide orange cells, each spanning 4 blue ones.
  - MLA: 128 thin blue lines over one orange bar.
- Column "uses per byte": 1, 4, 128. Column "k, v width": 128, 128, k 576 / v 512.
- Shaded boxes on the right: "one 128-wide kernel, group size is a setting" for the first two, "kernels of its own, no 128-wide kernel fits" for MLA.
- Three dotted statements and two footnotes (the definition of uses per byte; what MLA's k is made of).

### Formula

$$
\begin{gathered}
g = \frac{H_q}{H_{kv}}\\[4pt]
M_{\text{tile}} = T_k \cdot (d_k + d_v) \cdot b
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $H_q$ | query heads | 32 for Llama-3-8B | `HEADS` in `src/numbers.ts` |
| $H_{kv}$ | K/V heads | 8 for Llama-3-8B | Ch. 2 Step 14, `KV_HEADS` |
| $g$ | uses per byte: query heads one loaded K/V byte serves, for one token | 1, 4, 128 | this step |
| $T_k$ | keys in one tile | 64 | `TILE_K` in the component |
| $d_k, d_v$ | k and v width per head | 128, 128; MLA 576, 512 | this step |
| $b$ | bytes per number | 2 B | Step 3 |
| $M_{\text{tile}}$ | on-chip memory one tile of K and V takes | | this step |

### The numbers on the stage

| Layout | $g$ | $M_{\text{tile}}$ | share of an H100 SM's 228 KB |
|---|---|---|---|
| MHA | 32 ÷ 32 = 1 | 64 × (128 + 128) × 2 B = 32,768 B = 32 KB | 14% |
| GQA | 32 ÷ 8 = 4 | the same, 32 KB | 14% |
| MLA | 128 ÷ 1 = 128 | 64 × (576 + 512) × 2 B = 139,264 B = 136 KB | 60%, 4.25 times as much |

### Why the width picks the kernel and the group size does not

- A kernel loads K and V in tiles into the SM's on-chip shared memory (SMs: Ch. 13 Step 8), and the tile sizes are fixed when it is compiled. A different width means a different tile and a different memory plan.
- How many query heads share a K/V head is only a count: the same kernel loads each K/V head once and runs that many query heads against it.

### MLA's 576 and 512

DeepSeek-V3 caches one vector per token: 512 numbers of compressed content plus 64 of position (RoPE, Ch. 2 Step 11). k uses all 576 and v only the 512, because position only helps pick the tokens and does not go into the output. All 128 query heads compute against that one vector.

### Model configuration sources

- **MHA · Llama-2-7B:** [Table 1 of the Llama 2 paper](https://arxiv.org/html/2307.09288#S2.T1) marks 7B as not using GQA. Meta's reference code has [defaults](https://github.com/meta-llama/llama/blob/689c7f261b9c5514636ecc3c5fefefcbb3e6eed7/llama/model.py#L20-L24) of `dim = 4096`, `n_heads = 32`, and `n_kv_heads = None`; [Attention](https://github.com/meta-llama/llama/blob/689c7f261b9c5514636ecc3c5fefefcbb3e6eed7/llama/model.py#L200-L205) then uses `n_heads` for K/V too. That gives 32 query heads, 32 K/V heads, and width 4096 ÷ 32 = 128.
- **GQA · Llama-3-8B:** [Table 3 of the Llama 3 paper](https://arxiv.org/html/2407.21783#S3.T3) lists `Model Dimension = 4096`, `Attention Heads = 32`, and `Key/Value Heads = 8`. Thus 4 query heads share one K/V head, and the width is 4096 ÷ 32 = 128.
- **MLA · DeepSeek-V3:** the [official config](https://huggingface.co/deepseek-ai/DeepSeek-V3/blob/e815299b0bcbac849fa540c768ef21845365c9eb/config.json) gives `num_attention_heads = 128`, `kv_lora_rank = 512`, and `qk_rope_head_dim = 64`. The [official MLA implementation](https://github.com/deepseek-ai/DeepSeek-V3/blob/9b4e9788e4a3a731f7567338ed15d3ec549ce03b/inference/model.py#L439-L444) caches a 512-wide `kv_cache` and a 64-wide `pe_cache`; [scoring uses both, while the output reads only `kv_cache`](https://github.com/deepseek-ai/DeepSeek-V3/blob/9b4e9788e4a3a731f7567338ed15d3ec549ce03b/inference/model.py#L480-L495). Thus 128 query heads share one cache, k is 512 + 64 = 576 wide, and v is 512 wide.

### Next

Step 7 multiplies $g$ by the number of queries.

## Step 7 · 2 of 4: prefill and decode

> **In one line:** a prefill tile has 128 queries, and with GQA's 4 each K/V byte is used 512 times, so the math outlasts the read; decode has 1 query and 4 uses, so the read sets the time. So every backend has two kernels.

### On the stage

- Top left, the prefill grid (8 × 8, rows are queries, columns keys): light cells top right are keys after the query, skipped (Ch. 2 Step 7); dark grey cells are scored in other tiles; the red 4 × 4 is one thread block's tile (thread blocks: Ch. 13 Step 7). One outlined column: one key's K/V, loaded once and used 4 times.
- Top right, decode: a single row; the red 4 cells are one tile, and the outlined cell is loaded once and used once.
- Both sides give the real numbers: prefill 128 queries × 4 heads = 512 uses; decode 1 query × 4 heads = 4.
- Bottom half: for one chunk (64 keys of one K/V head, 32 KB), the read time (red) against the math time (green), one pair for decode and one for prefill.
- A line naming `forward_extend` and `forward_decode`; a footnote with the balance point.

### Formula

$$
\begin{gathered}
u = q_{\text{tile}} \cdot g\\[4pt]
t_{\text{read}} = \frac{M_{\text{chunk}}}{BW}\\[4pt]
t_{\text{math}} = \frac{u \cdot M_{\text{chunk}}\ \text{flop}}{F}
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $q_{\text{tile}}$ | queries in one tile | prefill 128, decode 1 | this step |
| $g$ | query heads per K/V head | 4 | Step 6 |
| $u$ | uses of each K/V byte | 512 or 4 | this step |
| $M_{\text{chunk}}$ | one chunk: K and V for 64 keys of one K/V head | 64 × 128 × 2 × 2 B = 32,768 B | Step 6's $M_{\text{tile}}$ |
| $BW$ | HBM bandwidth | 3.35 TB/s | Step 1 |
| $F$ | bf16 peak | 989 TFLOP/s | `TFLOPS` in `src/numbers.ts` |

A use is one multiply-add on a 2-byte number, 2 flops per 2 bytes, so 1 flop per byte: $u$ uses of 32 KB are $u \times 32{,}768$ flops.

### The numbers on the stage

| | $u$ | $t_{\text{read}}$ | $t_{\text{math}}$ | what sets the time |
|---|---|---|---|---|
| decode | 1 × 4 = 4 | 32,768 B ÷ 3.35 TB/s = 9.8 ns | 4 × 32,768 ÷ 989 TFLOP/s = 0.13 ns | the read |
| prefill | 128 × 4 = 512 | 9.8 ns | 512 × 32,768 ÷ 989 TFLOP/s = 17 ns | the math |

The bars are equal at $u = F / BW = 989 \div 3.35 \approx 295$, Ch. 4 Step 8's balance point of about 300 tokens. 4 is far below it, 512 above.

### Why two kernels

A kernel built for one side wastes the other: a decode kernel wants as many SMs pulling bandwidth as it can get (Step 8), a prefill kernel wants big tiles to keep the math units full. So every backend has:

- `forward_extend` for prefill. Extend, because a prefill may add to a prefix already cached (Ch. 8 Step 2).
- `forward_decode` for decode.

The base class's `AttentionBackend.forward` sends each batch to one of the two by its forward mode (Step 11).

### Next

Step 8: decode is one row, so how does batch 1 get more SMs reading?

## Step 8 · 2 of 4, continued: decode's split-KV

> **In one line:** batch-1 decode runs one block per K/V head, so only 8 SMs read; cut each head's keys into 16 pieces and 128 blocks read at once, 16 times sooner, and step 4's rescaling merges the pieces.

### On the stage

- A line at the top: one request, 8,192 tokens of context; its one query reads 8,192 keys in each of 8 K/V heads.
- Left "without the split", right "with the split", in the same layout and scale. Each side has 8 bars, one per K/V head's K and V in this layer.
- A looping animation: red fills left to right as K and V are read. On the right each bar is 16 pieces filling at once, and a small green block (the merge) lights when they finish; on the left one block per bar fills slowly.
- Under each side a 132-cell SM grid, busy SMs dark (8 or 128), with the bandwidth and time arithmetic beside it.
- Three dotted statements; footnote: each busy SM pulls an even 1/132 of the bandwidth, a simplification.

### Formula

$$
\begin{gathered}
M_{\text{head}} = c \cdot 128 \cdot 2 \cdot b\\[4pt]
BW_{\text{busy}} = \frac{N_{\text{blk}}}{132}\, BW\\[4pt]
t_{\text{layer}} = \frac{8\, M_{\text{head}}}{BW_{\text{busy}}}
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $c$ | context length | 8,192 | this step |
| $M_{\text{head}}$ | one K/V head's K and V in one layer | 4.2 MB | this step |
| block | one piece of a kernel, running on one SM | | Ch. 13 Steps 7 and 8 |
| 132 | SMs on an H100 | | `SMS` in `src/numbers.ts` |
| $N_{\text{blk}}$ | blocks running at once | 8 or 128 | this step |
| $BW_{\text{busy}}$ | bandwidth the busy SMs pull, under the even-share assumption | | this step |
| $t_{\text{layer}}$ | time to read one layer's attention | | this step |

Step 7 showed decode is memory-bound, so time = bytes ÷ the bandwidth pulled.

### The numbers on the stage

| Quantity | without the split | with the split |
|---|---|---|
| $M_{\text{head}}$ | 8,192 × 128 × 2 × 2 B = 4,194,304 B ≈ 4.2 MB | the same |
| keys per block | 8,192 | 8,192 ÷ 16 = 512 |
| $N_{\text{blk}}$ | 8 | 8 × 16 = 128 |
| $BW_{\text{busy}}$ | 8/132 × 3.35 = 0.20 TB/s | 128/132 × 3.35 = 3.25 TB/s |
| $t_{\text{layer}}$ | 8 × 4.2 MB ÷ 0.20 TB/s ≈ 0.17 ms | 0.010 ms |
| × 32 layers | 5.3 ms | 0.33 ms |

16 is the most that fits: 8 × 16 = 128 ≤ 132, while 8 × 17 = 136 > 132. Without the split the 5.3 ms is longer than the 4.8 ms weight read.

### How the merge combines

Each piece ends with its own $m$, $\ell$ and out over its 512 keys (step 4's three values). Two pieces $a$ and $b$ combine as:

$$
\begin{gathered}
m = \max(m_a, m_b)\\[4pt]
\ell = \ell_a\, e^{\,m_a - m} + \ell_b\, e^{\,m_b - m}\\[4pt]
\text{out} = \text{out}_a\, e^{\,m_a - m} + \text{out}_b\, e^{\,m_b - m}
\end{gathered}
$$

All 16 are folded in this way, then out ÷ $\ell$. It is the same identity step 4 uses between chunks.

### Where the simplification is

On a real GPU fewer than all SMs can saturate HBM, so the unsplit 5.3 ms is an upper bound, as the prose says.

### Next

Step 9: row 3, where K and V sit in memory.

## Step 9 · 3 of 4: pages

> **In one line:** without pages a request's K and V are consecutive rows and the kernel computes each address; with pages the rows sit anywhere in a pool and the kernel reads a table of page numbers first, which makes it a different kernel.

### On the stage

- Top, "without pages": one tensor with A0–A4 (blue) and B0–B2 (green) back to back. B's token $t$ is row 5 + $t$.
- Bottom, "with pages": a KV pool of 10 pages. A holds 3, 9, 1, 7, 2, B holds 4, 8, 6, and 0 and 5 are free.
- Two arrays: `kv_indices` (8 cells, A's pale blue, B's solid green) and `kv_indptr` (3 cells). Green arrows run from B's three cells in `kv_indices` to its pages in the pool; grey lines run from each `kv_indptr` cell to a boundary in `kv_indices`.
- Two dotted statements; footnote: the CPU rebuilds both arrays every batch in `init_forward_metadata`.

### Formula

$$
\text{row}(r, t) = \texttt{kv\_indices}\big[\,\texttt{kv\_indptr}[r] + t\,\big]
$$

| Symbol | What it is | From |
|---|---|---|
| $r$ | which request in the batch (A is 0, B is 1) | this step |
| $t$ | which token of that request | this step |
| `kv_indptr` | where each request's slice of `kv_indices` starts, plus the total length at the end | this step |
| `kv_indices` | each token's page, request after request | Ch. 7 Step 4's page tables, concatenated |
| $\text{row}(r, t)$ | the pool row holding that token's k and v | this step |

Here a page holds one row, SGLang's default page size of 1.

### The numbers on the stage

| Quantity | Value |
|---|---|
| `kv_indices` | [3, 9, 1, 7, 2, 4, 8, 6] |
| `kv_indptr` | [0, 5, 8] |
| A's slice | `kv_indices[0:5]` = 3, 9, 1, 7, 2 |
| B's slice | `kv_indices[5:8]` = 4, 8, 6, length 8 − 5 = 3 |
| B's token 2 | `kv_indices[5 + 2]` = `kv_indices[7]` = 6 |

Without pages B's token 2 is row 5 + 2 = 7, one addition; with pages it is in page 6, found by one extra read of the table.

### Why it is a different kernel

- Every row costs one read of the table first. A kernel that computes 5 + $t$ would read the wrong row from the pool.
- Without pages a 64-key chunk is 64 neighbouring rows, one contiguous read. Kernels written for pages of 16 to 128 rows look up once per page, and the rows inside a page are consecutive (step 12's page-size column).

### Rebuilt every step

Which requests are in the batch, and how long each is, change every step, so the CPU rebuilds both arrays for every batch. `kv_indptr` holds Ch. 12 Step 4's sequence boundaries.

The array names depend on the backend: flashinfer and triton use `kv_indptr` / `kv_indices`; fa3, this book's default, keeps the same information as `cu_seqlens_k` (where each request starts) and `page_table` (one row of page numbers per request).

### Next

Step 10: row 4, the GPU.

## Step 10 · 4 of 4: the GPU

> **In one line:** each GPU generation adds units a kernel has to be written to use; on the same H100, FlashAttention-2 (written for the A100) reaches 35% of peak and FlashAttention-3 (written for the H100) 75%.

### On the stage

- A table of four rows: the GPU, what it added, and the attention kernels written for it.
- Two green bars below: FlashAttention-2 ≈ 350 TFLOP/s · 35%, FlashAttention-3 ≈ 740 TFLOP/s · 75%, over a grey track for the 989 TFLOP/s peak.
- Footnote: Triton compiles one source for all of these GPUs, portable and usually slower.

### What each generation added

| GPU | Added | Attention kernels |
|---|---|---|
| A100 (Ampere, 2020) | copies from HBM that run while the SM computes | FlashAttention-2, FlashInfer |
| H100 (Hopper, 2022) | TMA, a unit that copies whole tiles by itself; matmuls that run while the SM does other work; 8-bit numbers | FlashAttention-3 |
| B200 (Blackwell, 2024) | a separate memory for matmul results; 4-bit numbers | TensorRT-LLM's kernels, FlashAttention-4 |
| MI300 (AMD, 2023) | not NVIDIA: a different instruction set, no CUDA | aiter, AMD's library |

### Formula

$$
\text{achieved} = f \times F
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $f$ | fraction of peak | 0.35, 0.75 | the FlashAttention-3 paper (2024) |
| $F$ | the H100's bf16 peak | 989 TFLOP/s | Step 7 |

### The numbers on the stage

| Kernel | Arithmetic | Result |
|---|---|---|
| FlashAttention-2 | 0.35 × 989 | ≈ 346, shown as 350 TFLOP/s |
| FlashAttention-3 | 0.75 × 989 | ≈ 742, shown as 740 TFLOP/s |
| ratio | 0.75 ÷ 0.35 | about 2.1× |

### Why this shows a rewrite per generation

- The measurement is a long prefill, which step 7 showed is compute-bound (512 uses per byte, above ~300), so speed is math done per second.
- Both kernels keep all 132 SMs busy on the same chip; the difference is only whether the kernel uses the H100's new units.

### Next

Step 11: with this many kernels, how does one model use them?

## Step 11 · One interface, many backends

> **In one line:** the model calls one interface, `AttentionBackend`; every backend is a subclass that fills the same slots with its own kernels: the plan, a prefill and a decode kernel, and CUDA graph buffers.

### On the stage

- Left, "the model": 32 layers, each with an attention layer, `RadixAttention.forward`, which never names a kernel. A "calls" arrow points to the middle.
- Middle, the red-outlined `AttentionBackend` (the base class in `sglang/srt/layers/attention/`), with its slots:
  - blue `init_forward_metadata(batch)`, circle 3: once per batch, builds step 9's arrays.
  - dark-outlined `forward(q, k, v, layer, batch)`, circle 2: goes to the two dark boxes below, `forward_extend` (prefill, Step 7) and `forward_decode` (decode, Steps 7–8).
  - orange `init_cuda_graph_state(max_bs)`: the graph buffers.
- Right, "each fills them": fa3, flashinfer, trtllm_mha, aiter, triton, "…about two dozen in all"; which one is decided by map rows 1 and 4.
- Two dotted statements; the footnote says the numbered circles are map rows.

### What each slot does

| Slot | When it runs | What it does | Map |
|---|---|---|---|
| `init_forward_metadata` | once per batch, before the layers | builds step 9's page arrays, shared by every layer | row 3, Step 9 |
| `forward` | once per layer | sends the batch to `forward_decode` or `forward_extend` by forward mode | row 2, Steps 7–8 |
| `init_cuda_graph_state` | once at startup | allocates the plan arrays once, sized for the largest batch | Ch. 11 Step 13 |

In the source `init_cuda_graph_state` takes `(max_bs, max_num_tokens)`; the stage shows only `max_bs`.

### Why graph buffers

Ch. 11 Step 13 showed a recorded graph replays at fixed addresses, so the plan arrays cannot be new tensors each step. The backend allocates them once, for the largest batch, and each step writes its new page arrays into them.

### Two more things

- Both kernels also write the new token's k and v into the pool (the `save_kv_cache` argument of `forward`), since only the backend knows where the pages are.
- Map rows 1 (heads) and 4 (GPU) have no slot: they decide which subclass is used. `--attention-backend` swaps that subclass without changing the model's code.

### Next

Step 12 lists the backends.

## Step 12 · The backends

> **In one line:** each backend covers some head layouts, page sizes and GPUs; with none named, SGLang picks by GPU and model: fa3 on Hopper, trtllm_mha on Blackwell, aiter on AMD, flashinfer on other NVIDIA, triton when nothing else fits.

### On the stage

- Header: backend, kernels from, ① heads, ③ page size, ④ GPU, default for. The numbers are map rows (Step 5).
- Six rows: fa3 (highlighted), trtllm_mha, aiter, flashinfer, triton, torch_native.
- Below, "MLA only": flashmla page 64, cutlass_mla page 128, trtllm_mla page 32 · 64 · Blackwell.
- Two dotted statements; a footnote with the sources.

### Reading the table

- ① is Step 6, ③ is Step 9, ④ is Step 10. Map row 2 has no column because every backend has both a prefill and a decode kernel (Step 7).
- Page size "1" means one row per page, so the kernel looks up every token; "16–128" means it is written for pages of that many rows.
- "Default for" is what `get_default_attn_backend` picks when no `--attention-backend` is given.

### This book's setup, column by column

| Column | This book | fa3 | Fits? |
|---|---|---|---|
| ① heads | Llama-3-8B is GQA (Step 6) | MHA · GQA · MLA | yes |
| ③ page | size 1 (Step 9) | any | yes |
| ④ GPU | an H100 is Hopper | Hopper | yes |

All three fit, and fa3 is the H100's default. trtllm_mha would not be picked: it is written for Blackwell and pages of 16–128 rows.

### Checked against the source

- `get_default_attn_backend`: for non-MLA models, fa3 on Hopper (unless speculative decoding runs with topk > 1), trtllm_mha on Blackwell (SM100), aiter on AMD, flashinfer on other NVIDIA GPUs that have FlashInfer, otherwise triton. torch_native is the default on Apple's MPS and is named by hand elsewhere.
- The page-size limits are in SGLang's argument checks: trtllm_mha accepts 16, 32, 64 or 128; trtllm_mla 32 or 64; flashmla only 64.
- `attention_registry.py` registers about two dozen names; the table shows the main ones.
- SGLang main's backend list no longer has `cutlass_mla` (the closest is `cutedsl_mla`, pages of 32 or 64), and the triton backend now also specialises on page sizes above 1. These two cells on the stage may be behind the source.

### Next

Step 13: after all these kernels, what does one request's decode still cost?

## Step 13 · One request decoding alone

> **In one line:** after chapters 11–14, decoding alone still costs a 16 GB weight read per token, because each pass's input is the token the pass before wrote; one pass could take 5 positions, as prefill does, but where would the other 4 inputs come from?

### On the stage

- Top row, "decode · one pass per token": `is` → reads 16 GB → `Paris` → reads 16 GB → `.` → … → `is`, 4 passes, 4 reads.
- Bottom row, "one pass over 5 positions": the first cell `is` (blue), then four `?` in red dashed boxes, over one long box "reads 16 GB once", 1 read. Dashed lines join each output above to its `?` below.
- A line in the middle: each `?` is a token the chain above writes one pass at a time, so it is not known yet.
- Footnote: batch 1; a pass is the 16 GB weight read, 4.8 ms.

### Formula

$$
\begin{gathered}
t_{\text{chain}} \approx k \cdot t_{\text{mem}}\\[4pt]
t_{\text{one pass}} \approx t_{\text{mem}} + (k + 1)\, t_{\text{tok}}
\end{gathered}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $k$ | tokens to produce | 4 (the bottom row has 1 + 4 = 5 positions) | this step |
| $t_{\text{mem}}$ | one weight read | 16 GB ÷ 3.35 TB/s = 4.8 ms | Ch. 4 Step 5 |
| $t_{\text{tok}}$ | one position's math | 0.016 ms | Ch. 4 Step 5 |

### The numbers on the stage

| | weight reads | math | total |
|---|---|---|---|
| top: 4 passes | 4 × 4.8 ms | small | ≈ 19 ms |
| bottom: 1 pass, 5 positions | 4.8 ms | 5 × 0.016 = 0.08 ms | ≈ 4.9 ms |

Five positions use each weight byte 5 times, far below step 7's balance point of about 300, so the bottom row is still read-bound and the 4 extra positions add almost no time (Ch. 4 Step 3: the weights are loaded once and used for every position).

### Where it is stuck

Chapters 11–14 removed launch overhead, intermediates and extra attention traffic, but not this: one pass, one weight read, one new token. Position 1 of the bottom row is `is`; positions 2–5 need `Paris`, `.`, `It`, `is`, which are exactly what the top row writes one pass at a time.

### Next

Chapter 15 is about where those 4 inputs could come from.
