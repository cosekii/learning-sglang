## Step 1 · Inside one pass: the weights arrive a layer at a time

> **In one line:** a pass takes as long as its weight read; each layer's math finishes while the next layer is read, so a pass over 1 position and a pass over 5 take the same time.

### On the stage

- Two panels: on top "1 position" (normal decoding, only the newest token), below "5 positions" (5 tokens in one pass, as prefill does).
- Each panel's "memory" lane: dark grey boxes "layer 1" to "layer 6", the first 6 of the model's 32 layers.
- Each panel's "compute" lane: a short blue burst at the end of each layer box, that layer's math; the lower panel's bursts are 5 times wider.
- On the right, $x \times W$: $x$ is 1 row or 5 rows of 4,096 numbers; $W$ is 4,096 × 14,336 = 117 MB.
- The note on the top panel: layer 1's math runs while layer 2 is read, then waits.

A **position** is one token the pass works on; inside each layer it is one row of $x$ (4,096 numbers, the $x_j$ of Ch. 2 Step 2).

### Formula

$$
t_{\text{pass}} = \max\!\left(t_{\text{mem}},\; n \cdot t_{\text{tok}}\right),\qquad
t_{\text{mem}} = \frac{M_W}{BW},\qquad
t_{\text{tok}} = \frac{f}{F}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $n$ | positions in this pass | 1 or 5 | this step |
| $M_W$ | all the weights | 16 GB | Ch. 4 Step 2 |
| $BW$ | HBM bandwidth | 3.35 TB/s | `src/numbers.ts` |
| $t_{\text{mem}}$ | time to read the weights once | 4.8 ms | Ch. 4 Step 5 |
| $f$ | math for one position through the whole model | 16 GFLOP | Ch. 4 Step 3 |
| $F$ | the GPU's bf16 math rate | 989 TFLOP/s | `src/numbers.ts` |
| $t_{\text{tok}}$ | math time for one position | 0.016 ms | Ch. 4 Step 5 |
| $t_{\text{pass}}$ | time for one pass | | this step |

It is a max and not a sum because reading and math run at the same time: while layer $\ell+1$ is read, layer $\ell$'s weights are already on chip and in use.

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| one $W$ (the MLP's gate) | 4,096 × 14,336 × 2 B | 117 MB |
| one row times $W$ | 2 × 4,096 × 14,336 (a multiply and an add per weight) | 117 MFLOP |
| reading one layer | 4.8 ms ÷ 32 | 0.15 ms |
| one position's math per layer | 0.016 ms ÷ 32 | about 0.5 µs |
| 5 positions' math per layer | 5 × 0.5 µs | about 2.5 µs, still far below 0.15 ms |
| $t_{\text{pass}}$, $n = 1$ | max(4.8, 0.016) | 4.8 ms |
| $t_{\text{pass}}$, $n = 5$ | max(4.8, 5 × 0.016 = 0.08) | 4.8 ms |

At true scale a blue burst would be about 0.2 px wide, so it is drawn about 22× wider (the second footnote).

### Next

Step 2 uses this rule to compare two ways of writing tokens: one pass per token, and one pass over 5 positions.

## Step 2 · 4 tokens: 4 reads, or 1

> **In one line:** normal decoding writes 4 tokens in 4 passes, 19.1 ms; if those 4 tokens were known in advance, one pass over 5 positions would take 4.8 ms.

### On the stage

- Top row, "normal autoregressive decoding": 4 blue tokens `Paris`, `.`, `It`, `is`, each over a dark grey pass "reads 16 GB", ending at "4 tokens · 19.1 ms".
- Bottom row, "one pass over 5 positions": one pass, its blue bursts 5 times wider, ending at "one read · 4.8 ms".
- A time axis from 0 to 20 ms; the legend: dark grey is reading 16 GB of weights, blue is math done layer by layer.

### Formula

$$
t_{\text{chain}} = k \cdot t_{\text{pass}}(n{=}1),\qquad
t_{\text{one pass}} = t_{\text{pass}}(n{=}k{+}1)
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $k$ | tokens to write | 4 | this step (the same $k$ as Ch. 14 Step 13) |
| $t_{\text{pass}}(n)$ | time for a pass over $n$ positions | | Step 1 |

The bottom row has $k + 1 = 5$ positions: the last written token `is`, plus the 4 new tokens.

### The numbers on the stage

| | Arithmetic | Result |
|---|---|---|
| top row | 4 × 4.776 ms | 19.1 ms |
| bottom row | max(4.8, 5 × 0.016 = 0.08) | 4.8 ms |

### Why the top row cannot be merged

Each pass's input is the token the pass before picked (Ch. 1 Step 5): there is no `.` without `Paris`. In the bottom row, each position's output is the model's pick for the token after it, the same pick the top row makes one pass at a time (Ch. 2 Step 7: one forward pass gives every position an output).

### What is left out

- The KV cache read: the context here is at most 8 positions, 8 × 128 KB = 1 MB, against 16 GB of weights (Ch. 4 Step 6).
- The math is drawn about 46× wider than scale (the footnote).

### Next

The next 4 tokens are not known in advance. Step 3 guesses them, then checks the guesses with a pass like the bottom row.

## Step 3 · Guess, then check in one pass

> **In one line:** a draft model guesses 4 tokens and the target checks them in one pass over 5 positions: it keeps the right ones, puts its own token at the first miss, and the round writes 3.

### On the stage

The animation plays once ("plays once", top right):

- The top row is step 2's: normal decoding, 19.1 ms.
- The bottom row, "speculative decoding": 4 orange segments are the draft's 4 passes (drawn at a nominal length), then the dark grey "verify · 5 positions" pass.
- Three rows of tokens:
  - "the draft guesses": `Paris`, `.`, `The`, `city` (orange).
  - "the target's picks": `Paris` ✓, `.` ✓, `It` ✗, the 4th slot "not used".
  - "kept": `Paris`, `.` (green), `It` (blue, the target's own), the 4th slot "thrown away".
- The pill at the bottom: time per token = (the draft's small reads + the target's one read) ÷ tokens kept.

The **target** is the model being served (here Llama-3-8B); the **draft model** is a much smaller model whose only job is guessing.

### How the check works

The verify pass's 5 positions are `is`, `Paris`, `.`, `The`, `city`. Each position outputs the target's pick for the next token:

| token at the position | the target's next | the draft's next | result |
|---|---|---|---|
| `is` | `Paris` | `Paris` | ✓ |
| `Paris` | `.` | `.` | ✓ |
| `.` | `It` | `The` | ✗, use `It` |
| `The` | `is` | `city` | dropped |

The comparison runs left to right and stops at the first mismatch. `It` is the target's pick after a correct prefix, so it is right by definition. Row 4's `is` and `city` both have `The` as the token before, and `The` has been replaced, so both are void.

If all 4 guesses were right, the 5th position's (`city`'s) output would count too, and the round would write 5.

### Formula

$$
\tau = \frac{t_{\text{draft}} + t_{\text{mem}}}{a + 1}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $a$ | guesses accepted, 0 to $k$ | 2 | this step |
| $a + 1$ | tokens the round writes (plus the target's own) | 3 | this step |
| $t_{\text{draft}}$ | time for the draft to make $k$ guesses | drawn at a nominal length | Steps 5–7 |
| $t_{\text{mem}}$ | the target's verify pass; 5 positions still cost one read | 4.8 ms | Step 1 |
| $\tau$ | average time per written token | | this step |

### The numbers on the stage

| Case | Arithmetic | Per token |
|---|---|---|
| normal decoding | 3 tokens take 3 × 4.776 = 14.3 ms | 4.8 ms |
| this round, if the draft were free | 4.8 ÷ 3 | 1.6 ms |
| every guess wrong ($a = 0$) | ($t_{\text{draft}}$ + 4.8) ÷ 1 | at most $t_{\text{draft}}$ slower |

### With sampling

The stage is greedy: a guess is kept when it equals the token the target would pick. With sampling an acceptance test is used instead: each guess is kept with probability $\min(1, p_{\text{target}} / p_{\text{draft}})$ and the rejected position is resampled from a corrected distribution, so the output follows exactly the distribution the target would sample on its own (this chapter's prose, Leviathan et al., 2023).

### Next

$\tau$ depends on $t_{\text{draft}}$ and $a$. Step 4 lays out three drafters that trade these two differently.

## Step 4 · Three drafters: the same 4 guesses, made three ways

> **In one line:** EAGLE makes one guess per pass, DFlash makes all of them in one pass, and DSpark adds a short chain after DFlash's pass that links each guess to the one before.

### On the stage

Three cards, each read bottom to top: the input at the bottom, the draft's passes (orange) in the middle, the 4 guesses `Paris`, `.`, `The`, `city` on top.

| Card | Input | Pass | Between guesses |
|---|---|---|---|
| 1 · EAGLE | `is` | passes 1–4, dashed arrows feeding each guess into the next pass | each guess sees the one before (green) |
| 2 · DFlash | `is` + 3 blanks | one pass | each guess made on its own (red) |
| 3 · DSpark | `is` + 3 blanks | DFlash's one pass, green arrows between guesses | each guess sees the one before (green) |

A **drafter** is step 3's draft model; all three are small models trained for one particular target.

### In step 3's formula

$\tau = (t_{\text{draft}} + t_{\text{mem}}) / (a + 1)$:

| Drafter | $t_{\text{draft}}$ | $a$ |
|---|---|---|
| EAGLE | $k$ passes in a row, grows with $k$ | high: each guess knows the one before |
| DFlash | one pass, independent of $k$ (Step 1: more positions add no read) | later guesses miss more |
| DSpark | one pass plus a very short sequential chain | the links win back later guesses |

### Turning them on in SGLang

| Drafter | Flag | Default |
|---|---|---|
| EAGLE-3 | `--speculative-algorithm EAGLE3` | Llama models: 5 draft steps, 4 branches per step, 8 tokens verified |
| DFlash | `--speculative-algorithm DFLASH` | a block of 16 positions (when the draft model's config does not set one) |
| DSpark | `--speculative-algorithm DSPARK` | its own `--speculative-dspark-block-size` |

The cards draw 4 guesses each only so they line up. The table was checked against SGLang main's argument handling. The stage's footnote says DSpark runs under DFLASH's block flags; in current SGLang DSpark is an algorithm of its own with its own block flag.

### Next

Steps 5–7 take one drafter each, in card order.

## Step 5 · EAGLE: one small layer, one guess per pass

> **In one line:** EAGLE's drafter is one transformer layer (the head) that reads the target's own hidden states; 4 guesses take 4 passes in a row.

### On the stage

- ① The target's 32 layers as 32 bars, left to right; 3 lit bars labelled "low", "middle", "high", with arrows into pass 1: "its hidden states at 3 depths, into pass 1".
- ② The chain: `is` → head pass 1 → `Paris` → head pass 2 → `.` → head pass 3 → `The` → head pass 4 → `city`.
- ③ 4 orange time bars in a row: "4 passes, one after another: each waits for the guess before it".
- The line below: then the target checks all 4 guesses in one pass (step 3).

### Hidden states

A **hidden state** is a row of step 1's $x$ after a layer has worked on it: 4,096 numbers per position. The target computes them in its own pass anyway, so EAGLE uses them without adding to the target's time. EAGLE-3 fuses those from a low, a middle and a high layer into pass 1's input; the three bars' positions are illustrative.

### Formula

$$
t_{\text{draft}} = k \cdot t_{\text{head}}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $k$ | guesses | 4 | Step 2 |
| $t_{\text{head}}$ | one head pass | drawn at a nominal length | this step |
| $t_{\text{draft}}$ | the draft's total time | | Step 3 |

Pass $j$'s input is pass $j-1$'s guess, so the passes cannot run in parallel and $t_{\text{draft}}$ grows linearly with $k$. The head is one layer (the target has 32), so a pass is short; but by Step 1's rule it costs at least the read of its own weights, and $k$ of them sit before the target's verify pass.

### Why $a$ is high

Each guess is made knowing the guess before it (`city` after `The`), the same way the target writes one token after another, so the guesses often agree with the target.

### SGLang's branching

SGLang also branches (the footnote, `--speculative-eagle-topk 4`): 4 candidates kept per step, and the 8 likeliest sent to verification together as a tree. The stage draws a single chain.

### Next

Step 6: DFlash replaces the $k$ sequential passes with one.

## Step 6 · DFlash: all 4 guesses in one pass

> **In one line:** DFlash's drafter is 5 small layers of its own, fed the target's hidden states as context; `is` and 3 blanks go through once and 4 guesses come out together.

### On the stage

- ① The target's 32 layers with 5 lit bars (illustrative positions) and arrows down.
- ② A blue box, "context: 5 of the target's hidden states, joined", with an arrow into each drafter layer ("into every drafter layer").
- ③ The input, 4 rows: `is` and 3 dashed "blank" slots.
- ④ The drafter's own 5 layers (light orange columns numbered 1–5), "run once".
- ⑤ The 4 guesses `Paris`, `.`, `The`, `city`, "together".
- The line below: on chat 72% of first guesses survive, 63% of 7th.

In the paper the context is projected and added to the keys and values of every drafter layer (this chapter's prose).

### Formula: how survival rates become $a$

$$
P_j = r_1 \, r_2 \cdots r_j,\qquad
\mathbb{E}[a] = \sum_{j=1}^{k} P_j
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $r_j$ | chance guess $j$ is accepted, given guesses 1 to $j-1$ were | on chat $r_1 = 0.72$, $r_7 = 0.63$ | this step, the line on the stage |
| $P_j$ | chance guess $j$ counts: guesses 1 to $j$ all accepted | | this step |
| $a$ | guesses accepted in a round | | Step 3 |
| $k$ | guesses per round | | Step 2 |

Step 3's rule compares left to right and stops at the first miss, so guess $j$ counts only if every guess before it was right; $a$ is the number of guesses that count, and its average is the sum of the $P_j$.

### Plugging in

Suppose all 7 positions had $r_j = 0.72$ (only to show how the product decays; these are not the paper's numbers):

| $j$ | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| $P_j = 0.72^j$ | 0.72 | 0.52 | 0.37 | 0.27 | 0.19 | 0.14 | 0.10 |

$\mathbb{E}[a] = 2.31$, about 3.3 tokens a round. The real later $r_j$ are lower (0.63 at the 7th), so the product falls faster.

### Where the cost is

- $t_{\text{draft}}$: one drafter pass. By Step 1, filling 4 positions or the default 16 is still one pass.
- $a$: row 3 is filled without knowing that row 2 became `.`, so later rows guess more blindly and $r_j$ falls.

The survival rates are from the DSpark paper; the footnote gives the target as Qwen3-4B.

### Next

Step 7: DSpark adds the link between guesses that DFlash lacks.

## Step 7 · DSpark: DFlash's one pass, then a small head that links the guesses

> **In one line:** DSpark runs DFlash's one pass, then a small head makes each guess depend on the one before, estimates each guess's chance to survive, and sends the target only the ones worth checking.

### On the stage

Five columns, left to right:

- ① Input: `is` and 3 blanks.
- ② "DFlash's one pass" ("as in step 6").
- ③ "linked guesses" `Paris`, `.`, `The`, `city`, with a green arrow between neighbours, labelled "small head".
- ④ "chance to survive": 0.95, 0.85, 0.68 (green bars), 0.21 (red bar); a red dashed "cut" line between the 3rd and the 4th.
- ⑤ "the target checks 3": `Paris` ✓, `.` ✓, `It` ("its own"), the 4th row "not sent".
- Two lines: the link makes each next guess based on the one before; the cut, because in a full batch checking a likely miss takes room from other requests.

The small head is a rank-256 bias from the guess above (the footnote): the previous token shifts the next guess's scores through a small matrix, in sequence, but each link is cheap.

### Formula

$$
\hat P_j = \hat r_1 \, \hat r_2 \cdots \hat r_j
$$

| Symbol | What it is | From |
|---|---|---|
| $\hat r_j$ | DSpark's estimate of Step 6's $r_j$: guess $j$'s own score | this step |
| $\hat P_j$ | the stage's "chance to survive", an estimate of Step 6's $P_j$ | this step |

Same reasoning as Step 6: guess $j$ survives only if every guess above it does.

### The numbers on the stage

| $j$ | Guess | $\hat r_j$ | $\hat P_j$ |
|---|---|---|---|
| 1 | `Paris` | 0.95 | 0.95 |
| 2 | `.` | 0.89 | 0.95 × 0.89 ≈ 0.85 |
| 3 | `The` | 0.80 | 0.85 × 0.80 = 0.68 |
| 4 | `city` | 0.31 | 0.68 × 0.31 ≈ 0.21 |

The $\hat r_j$ come from dividing the stage's $\hat P_j$ (0.85 ÷ 0.95 ≈ 0.89, and so on). The numbers are illustrative.

By Step 6, the estimated $\mathbb{E}[a]$ is 0.95 + 0.85 + 0.68 + 0.21 = 2.69 when 4 are sent and 2.48 when 3 are: dropping `city` costs 0.21 expected tokens and saves one position.

### The result matches Step 3

The target checks `Paris`, `.`, `The`: `Paris` ✓, `.` ✓, `The` replaced by `It`. $a = 2$, the round writes 3 tokens, and the verify pass has one position fewer.

### Why cut

For one request an extra position is almost free (Step 1). But a batch's verify pass carries every request's positions, and past about 300 positions per step the math, not the read, sets the time (Ch. 4 Step 8). Then a 0.21 guess takes a slot that another request's likelier guess could use.

### Next

Step 8 shows how many tokens per target pass the three drafters actually write.

## Step 8 · Does it work: tokens per target pass

> **In one line:** normal decoding writes 1 token per target pass; with the same training data and 7 guesses a round, the three drafters write 2.7 to 6.2, and DSpark writes the most in all three domains.

### On the stage

- Three groups of bars: GSM8K (math), HumanEval (code), MT-Bench (chat).
- Four bars per group: the dashed 1 (normal decoding), slate EAGLE-3, orange DFlash, green DSpark.
- A vertical axis at 0, 2, 4, 6; higher is better.
- Two lines: tokens per pass is how many times fewer passes the answer needs; the draft's own time comes off that.

### Formula

$$
L = \mathbb{E}[a] + 1,\qquad L \le k + 1
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $a$ | guesses accepted in a round | | Step 3 |
| $\mathbb{E}[a]$ | $a$ averaged over all rounds | | Step 6 |
| $k$ | guesses per round | 7 | this step (the footnote) |
| $L$ | tokens written per target pass, the bar height | at most 8 | this step |

### The numbers on the stage

| Domain | EAGLE-3 | DFlash | DSpark | DSpark ÷ EAGLE-3 |
|---|---|---|---|---|
| GSM8K · math | 5.30 | 5.33 | 6.17 | 1.16× |
| HumanEval · code | 4.33 | 4.64 | 5.52 | 1.27× |
| MT-Bench · chat | 2.66 | 3.11 | 3.72 | 1.40× |

The gap is largest on chat, where guesses miss most.

### In time

- 100 tokens of chat: 100 passes with normal decoding, about 100 ÷ 3.72 ≈ 27 with DSpark.
- If a target pass costs Step 1's $t_{\text{mem}} = 4.8$ ms, the target's share per token falls from 4.8 ms to 4.8 ÷ 3.72 ≈ 1.3 ms.
- Step 3's $\tau$ then adds $t_{\text{draft}} / L$, which the chart does not show.

### The setup behind the numbers

DSpark's Table 1, Qwen3-8B target; all three drafters retrained on the same data, chain drafting, sampled at temperature 1 (with Step 3's acceptance test), the count including the target's own token. The DFlash paper's own comparison with EAGLE-3 uses a different setup (tree drafting, temperature 0), so the numbers do not mix (this chapter's prose).

### Next

This ends chapters 11–15, "Making one GPU fast". Chapter 16 starts on models whose inputs and outputs are not only text.
