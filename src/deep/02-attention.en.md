## Step 1 · Opening one layer of the model

> **In one line:** chapter 1 treated the model as a black box; this chapter opens one layer and watches what its attention does.

### On the stage

- Five blue boxes: the 5 tokens cut in Ch. 1 Step 2, `The`, `␣capital`, `␣of`, `␣France`, `␣is`.
- Only tokens so far. The next steps grow rows of x, q, k and v under them.

### Background

Llama-3-8B is a stack of 32 layers with identical structure. Each layer first does **attention** (each token gathers information from other tokens), then an MLP (each token transformed on its own). The "forward pass" of Ch. 1 Step 3 sends the 5 tokens through all 32 layers.

This chapter looks at **the attention inside one layer**, and at first only one of its heads (Step 14 says how many heads there are). The five positions are computed together, in parallel, not one after another.

### Next

Steps 2–6 follow the last token, `␣is`, through attention; Step 7 returns to all five positions at once.

## Step 2 · Each token is a vector x

> **In one line:** entering the layer, each token is a list of 4,096 numbers, written $x$.

### On the stage

- Grey cells $x_1 \dots x_5$: the input vector of each position; the subscript is the position.

### Where the vector comes from

- **Layer 1:** look up the token id from Ch. 1 Step 2 in a table (the embedding table, 128,256 rows × 4,096 columns) and take that row. `␣France` has id 9822, so it gets row 9822.
- **Layer 2 onwards:** $x$ is the previous layer's output. These 4,096 numbers are what passes from layer to layer.

The two numbers come from different places:

- **128,256 rows**: one per vocabulary token; Ch. 1 Step 2 explains the vocabulary size (128,000 ordinary tokens fixed when the tokenizer is trained, plus 256 special ones).
- **4,096 columns**: the model's width (hidden size), chosen when the model is designed, unrelated to the vocabulary or the training data. Every layer's $x$ and output have this width. The numbers in the table are trained along with the rest of the model's weights.

| Symbol | What it is | Size |
|---|---|---|
| $x_j$ | position $j$'s vector entering this layer | 4,096 numbers |

Strictly, a normalisation (RMSNorm) runs before attention to bring $x$ to a common scale. It does not change anything in this chapter, so the stage leaves it out.

### Next

Step 3 computes three new vectors from $x_j$.

## Step 3 · Each token computes q, k and v

> **In one line:** each position multiplies its own $x$ by three fixed matrices and gets a query, a key and a value.

### Formula

$$
q_j = W_Q\,x_j,\qquad k_j = W_K\,x_j,\qquad v_j = W_V\,x_j
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $x_j$ | position $j$'s input | 4,096 | Step 2 |
| $W_Q, W_K, W_V$ | trained weight matrices, one set shared by every position | 128 × 4,096 each | the model file |
| $q_j, k_j, v_j$ | position $j$'s query, key, value | 128 numbers each | this step |

The matrix product squeezes 4,096 numbers into 128: the first number of $q_j$ is row 1 of $W_Q$ multiplied entry by entry with $x_j$ and summed, and 128 rows give 128 numbers.

### What each vector is for

- **query $q$**: "what I am looking for". Used only in Step 4, compared against keys.
- **key $k$**: "what I hold, so others can find me". Other positions' queries compare against it.
- **value $v$**: "what I hand over if you attend to me". Blended in Step 6.

Each position uses **only its own** $x_j$ here; no other token is involved. Tokens start exchanging information in Step 4.

### Next

Step 4: `␣is`'s $q_5$ is compared with every $k_j$.

## Step 4 · The query is dotted with every key

> **In one line:** $q_5$ takes a dot product with each of $k_1 \dots k_5$, giving 5 scores; a bigger score means more relevant.

### On the stage

- Highlighted $q_5$: `␣is`'s query (from Step 3).
- Highlighted $k_1 \dots k_5$: the 5 keys it is compared with.
- The row of numbers below: the 5 scores 0.4, 1.9, 0.2, 2.6, 0.9.

### Formula

$$
\text{score}_j = q_5 \cdot k_j = \sum_{d=1}^{128} q_5[d]\; k_j[d]
$$

| Symbol | What it is | From |
|---|---|---|
| $q_5$ | `␣is`'s query, 128 numbers | Step 3 |
| $k_j$ | position $j$'s key, 128 numbers | Step 3 |
| $q_5[d]$ | the $d$-th number of $q_5$ | |
| $\text{score}_j$ | `␣is`'s score for position $j$, one number | this step |

A dot product multiplies two vectors entry by entry and adds everything up, giving one number. The more the two vectors point the same way, the bigger it is.

### The numbers on the stage

| $j$ | token | $\text{score}_j$ |
|---|---|---|
| 1 | `The` | 0.4 |
| 2 | `␣capital` | 1.9 |
| 3 | `␣of` | 0.2 |
| 4 | `␣France` | **2.6** (largest) |
| 5 | `␣is` | 0.9 |

These scores are illustrative. A real model also divides the dot product by $\sqrt{128} \approx 11.3$ so scores do not grow with the vector length; that is the $\sqrt{d_k}$ in this chapter's "The math, once".

Note that $\text{score}_j$ is an **attention score**, and there are 5 of them. It is not the $s_t$ of Ch. 1 Step 3, which are 128,256 vocabulary scores.

### Next

Scores can be negative and do not sum to 1, so they cannot be used as proportions. Step 5 turns them into weights with softmax.

## Step 5 · Softmax turns scores into weights

> **In one line:** softmax turns the 5 scores into 5 positive weights $w_j$ that sum to 1.

### Formula

$$
w_j = \frac{e^{\text{score}_j}}{\sum_{m=1}^{5} e^{\text{score}_m}}
$$

| Symbol | What it is | From |
|---|---|---|
| $\text{score}_j$ | position $j$'s score | Step 4 |
| $e^{x}$ | the exponential, $e \approx 2.718$; always positive | |
| $w_j$ | position $j$'s weight, between 0 and 1, the five summing to 1 | this step |

This is the same softmax that turned vocabulary scores into probabilities in Ch. 1 Step 4, applied here to 5 attention scores.

### The numbers on the stage

| $j$ | token | $\text{score}_j$ | $e^{\text{score}_j}$ | $w_j$ |
|---|---|---|---|---|
| 1 | `The` | 0.4 | 1.49 | 0.06 |
| 2 | `␣capital` | 1.9 | 6.69 | 0.26 |
| 3 | `␣of` | 0.2 | 1.22 | 0.05 |
| 4 | `␣France` | 2.6 | 13.46 | **0.53** |
| 5 | `␣is` | 0.9 | 2.46 | 0.10 |
| | | | total 25.32 | 1.00 |

Each $w_j$ is its row's $e^{\text{score}_j}$ ÷ 25.32. For example $w_4 = 13.46 / 25.32 \approx 0.53$, the tallest bar on the stage.

### Why the exponential

It widens gaps: scores 2.6 and 0.2 differ by 2.4, but their weights differ tenfold (0.53 against 0.05). That lets the model concentrate attention on a few positions.

### Next

Step 6 blends the values with these 5 weights.

## Step 6 · Blending the values gives the output

> **In one line:** `␣is`'s output is the 5 values added up with Step 5's weights.

### On the stage

- Green $v_1 \dots v_5$: the values from Step 3, shaded by weight.
- The curves into $\text{out}_5$: thickness proportional to $w_j$; `␣France`'s is thickest.
- $\Sigma\, w_j v_j$ above $\text{out}_5$: the formula below.

### Formula

$$
\text{out}_5 = \sum_{j=1}^{5} w_j\, v_j
$$

| Symbol | What it is | From |
|---|---|---|
| $w_j$ | position $j$'s weight, one number | Step 5 |
| $v_j$ | position $j$'s value, 128 numbers | Step 3, $v_j = W_V x_j$ |
| $\text{out}_5$ | `␣is`'s output from this head, 128 numbers | this step |

### The numbers on the stage

$$
\text{out}_5 = 0.06\,v_1 + 0.26\,v_2 + 0.05\,v_3 + 0.53\,v_4 + 0.10\,v_5
$$

The $v_j$ are vectors, so this runs per entry: the first number of $\text{out}_5$ is $0.06 \times v_1[1] + 0.26 \times v_2[1] + \dots + 0.10 \times v_5[1]$, and the same for all 128 entries. Over half of the result comes from `␣France`'s value, about a quarter from `␣capital`'s. This is how `␣is` learns it follows "capital of France".

### Score to output, the three steps together

| Step | In | Operation | Out |
|---|---|---|---|
| Step 4 | $q_5,\ k_1 \dots k_5$ | dot product | $\text{score}_1 \dots \text{score}_5$ |
| Step 5 | 5 scores | softmax | $w_1 \dots w_5$ |
| Step 6 | $w_1 \dots w_5,\ v_1 \dots v_5$ | weighted sum | $\text{out}_5$ |

The query and keys only decide the weights; only the values reach the output.

### Where the output goes

This is one head's output. The outputs of all 32 query heads are joined (32 × 128 = 4,096 numbers), multiplied by an output matrix $W_O$, added back to $x_5$, and passed through the MLP. The result is the next layer's $x_5$. Step 13 uses this.

## Step 7 · Every position does the same (causal)

> **In one line:** each of the five positions runs Steps 4–6 with its own query, over its own key and the ones before it; one forward pass gives all five outputs.

### On the stage

- The grid: each row is a query, $q_1$ to $q_5$; each column is a key, $k_1$ to $k_5$.
- A filled cell means that query reads that key. Only the lower-left triangle is filled.
- The dark bottom row: the $q_5$ row Steps 4–6 walked through.

### Formula

Replace the 5 of Steps 4–6 with any position $i$, and allow only $j \le i$:

$$
\text{score}_{ij} = q_i \cdot k_j,\qquad
w_{ij} = \frac{e^{\text{score}_{ij}}}{\sum_{m \le i} e^{\text{score}_{im}}},\qquad
\text{out}_i = \sum_{j \le i} w_{ij}\, v_j
$$

| Symbol | What it is |
|---|---|
| $i$ | the position whose output is computed (a row of the grid) |
| $j$ | the position looked at (a column), only $1 \dots i$ |
| $w_{ij}$ | position $i$'s weight on position $j$; each row's weights sum to 1 |

The weight gains the subscript $i$ because each row uses its own query, so its scores and weights differ. The $w_j$ of Steps 5 and 6 are the row $i = 5$.

### Why only earlier positions (causal)

During generation a position's output predicts the **next** token. If it could see later tokens, it would be reading the answer. So position $i$ sees only $1 \dots i$. $q_1$, for example, sees only $k_1$, and its weight can only be $w_{11} = 1$.

### Counting

The grid has 1 + 2 + 3 + 4 + 5 = 15 filled cells, so 15 dot products. The five rows do not depend on each other, so the GPU computes them in one parallel pass.

### Next

Step 8 starts generating: `␣Paris` joins the sequence, and we watch what this layer does again.

## Step 8 · A decode step: Paris joins, and the layer starts over

> **In one line:** with chapter 1's chosen `␣Paris` appended, this layer runs again on all 6 tokens from scratch.

### On the stage

- The orange sixth box: the new `␣Paris`.
- Every other row is gone, because the plain loop keeps no intermediate result from the last round.

### Where Paris came from

Nobody told the model the next word is `␣Paris`. The forward pass of Steps 1–7 computed it:

1. Step 7: this layer gives each of the 5 positions an output. Each layer's output becomes the next layer's $x$, by the path at the end of Step 6.
2. After all 32 layers, only the **last position**, `␣is`, is kept (4,096 numbers). It is the only position that predicts a token not yet in the sequence; the first 4 predict tokens already there.
3. That vector is multiplied by an output matrix (128,256 × 4,096), giving one score per vocabulary token: the $s_t$ of Ch. 1 Step 3.
4. Softmax turns the scores into probabilities $p(t)$ (Ch. 1 Step 4): `␣Paris` 0.82, `␣Lyon` 0.05, `␣a` 0.04, `␣the` 0.03. The largest wins: `␣Paris`, id 12366.

`␣is`'s output in Step 6 picked up `␣France`'s value, and information like that is what puts `␣Paris` on top at the end (the scores on the stage are illustrative, not the real model's).

### Matching chapter 1

This is Ch. 1 Steps 5–6: append `␣Paris`, then run another forward pass on all 6 ids. Chapter 1 said the first 5 positions are computed again; Steps 9–14 show exactly what this layer recomputes.

A "decode step" is the forward pass that produces each new token during generation. The pass over the whole prompt in Steps 1–7 is called prefill (chapter 4).

## Step 9 · Six tokens become six vectors

> **In one line:** as in Step 2, the 6 positions each get an input vector $x_1 \dots x_6$.

### What is new

- $x_1 \dots x_5$: the same tokens at the same positions look up the same embedding rows in layer 1, so they are **exactly** Step 2's. The same holds in later layers (Step 13 says why).
- $x_6$: the row for `␣Paris` (id 12366), the only new thing.

## Step 10 · All six positions recompute q, k and v

> **In one line:** each position multiplies by Step 3's three matrices again: 6 positions, 18 vectors.

### Formula

Exactly Step 3:

$$
q_j = W_Q\,x_j,\qquad k_j = W_K\,x_j,\qquad v_j = W_V\,x_j,\qquad j = 1 \dots 6
$$

The matrices have not changed (trained weights are fixed during inference), and neither have the first 5 $x_j$ (Step 9), so the first 5 columns must come out exactly as in Step 3. Step 11 marks this.

## Step 11 · The five old columns are identical

> **In one line:** the 5 old columns of k and v match last round entry for entry; this round computed them again.

### On the stage

- Old cells that blink: the recomputed ones.
- The `=` on the k and v cells: same result as last round.
- The sixth column, tagged "new" with a thick border: the only new result.

### Why they must be identical

$k_j = W_K x_j$ depends on two things only: $W_K$ (fixed) and $x_j$ (unchanged, Step 9). Same input, same multiplication, same output.

The footnote mentions RoPE: Llama also rotates $q$ and $k$ by the position number. `␣France` is always at position 4, so the rotation is the same and $k_4$ is still identical.

### How much is wasted

Per head, per layer: 5 old $k$ + 5 old $v$ = 10 vectors computed for nothing. Step 14 multiplies this out to the whole model.

## Step 12 · Paris's query needs every earlier k and v

> **In one line:** running Steps 4–6, the new token compares against all 6 keys and blends all 6 values.

### Formula

The same three steps as Step 6, with query $q_6$ and range 1…6:

$$
\text{score}_j = q_6 \cdot k_j,\quad
w_j = \frac{e^{\text{score}_j}}{\sum_{m=1}^{6} e^{\text{score}_m}},\quad
\text{out}_6 = \sum_{j=1}^{6} w_j\, v_j
$$

### The numbers on the stage

| $j$ | token | $\text{score}_j$ | $w_j$ |
|---|---|---|---|
| 1 | `The` | 0.3 | 0.06 |
| 2 | `␣capital` | 1.4 | 0.17 |
| 3 | `␣of` | 0.1 | 0.05 |
| 4 | `␣France` | 1.8 | 0.26 |
| 5 | `␣is` | 0.6 | 0.08 |
| 6 | `␣Paris` | 2.2 | **0.39** |

The $e^{\text{score}}$ total 23.41, so for example $w_6 = e^{2.2} / 23.41 = 9.03 / 23.41 \approx 0.39$.

### The point

$\text{out}_6$ uses $k_1 \dots k_5$ and $v_1 \dots v_5$, every one of them. The old positions' k and v are **required**; the only question is whether to recompute them each time.

## Step 13 · Nothing reads the old queries

> **In one line:** an old position's $q$ only computes that position's output, and that output only rebuilds the same old k and v; keep k and v, and the old q is useless.

### On the stage

- The struck-out pale purple cells: the old positions' $q_1 \dots q_5$.

### Following an old query

1. $q_1 \dots q_5$ are used only to compute $\text{out}_1 \dots \text{out}_5$ (Step 7's formula).
2. $\text{out}_1 \dots \text{out}_5$ become the **next layer's** $x_1 \dots x_5$, by the path at the end of Step 6.
3. The next layer turns those $x$ into its $k_1 \dots k_5$ and $v_1 \dots v_5$, identical to last round.

At the last layer, only the final position's output is used for the vocabulary scores (Ch. 1 Step 3). So once **every layer's** old k and v are stored, neither the old q nor the old outputs are needed.

## Step 14 · The conclusion: keep k and v

> **In one line:** each decode step the new token needs every earlier position's k and v, and only those; we recomputed them, identically, in every head of every layer.

### The legend on the stage

| Colour | Meaning |
|---|---|
| teal k + green v | **needed**: every earlier position's k and v, recomputed this step, identical |
| struck-out purple q | **not needed**: old queries, each used once on its own step |
| orange border | **new**: q, k, v of the token that just arrived |

### Across the whole model

| Quantity | Value |
|---|---|
| old vectors recomputed per head, per layer | 5 k + 5 v = 10 |
| Llama-3-8B's k, v heads | 8 |
| layers | 32 |
| recomputations per step | 8 × 32 = 256, or 2,560 vectors |

A "head" is one set of $W_Q, W_K, W_V$. Llama-3-8B has 32 query heads but only 8 sets of k, v, each shared by 4 query heads (chapter 14), so k and v count 8 heads.

### What storing them costs

A k or v is 128 numbers at 2 bytes each (bf16), 256 bytes. One token's k and v across every layer and head:

$$
32\ \text{layers} \times 8\ \text{heads} \times 2\ (k, v) \times 128 \times 2\ \text{B} = 131{,}072\ \text{B} = 128\ \text{KB}
$$

That is what chapter 3 stores: 128 KB per token, written once, read every step after.
