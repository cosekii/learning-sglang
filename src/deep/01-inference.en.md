## Step 1 · A prompt is a string

> **In one line:** inference starts from a string of 24 characters; the model does not take characters, so the first job is to turn it into numbers.

### On the stage

- The label `PROMPT` and one white box: the string `"The capital of France is"`, 24 characters (4 of them spaces).

### Background

The model is a function: it takes a list of integers (token ids) and returns scores for what the next token should be. The string cannot go in as it is; Step 2 turns it into ids first.

### Plug in the numbers

The five words contain 3, 7, 2, 6, and 2 letters, for $3+7+2+6+2=20$ letters in total. The four spaces between them bring the count to $20+4=24$ characters. The two quotation marks only delimit the string; they are not part of it and do not count toward 24.

Source: `tokenizer.encode("The capital of France is")` in this page's "same loop, in code" section uses the same string. Check the count with `len("The capital of France is") == 24`.

The rest of the chapter uses one notation, and each step works on what the step before produced:

| Symbol | What it is | From |
|---|---|---|
| id | a token's number in the vocabulary, an integer | Step 2 |
| $s_t$ | the score the forward pass gives vocabulary token $t$ | Step 3 |
| $p(t)$ | the probability computed from $s_t$ | Step 4 |

### Next

Step 2: the tokenizer cuts the string into tokens and swaps each for an id.

## Step 2 · Split into tokens, each an integer id

> **In one line:** the tokenizer cuts the string into 5 tokens and looks up 5 ids in its vocabulary.

### On the stage

- Five blue boxes: the 5 tokens `The`, `␣capital`, `␣of`, `␣France`, `␣is`. `␣` marks a leading space, which belongs to the token.
- The numbers under the boxes: each token's id.
- The footnote: Llama-3 also puts `<|begin_of_text|>` (id 128000) in front, left out here to keep the count at 5.

### The numbers on the stage

| Position | Token | id |
|---|---|---|
| 1 | `The` | 791 |
| 2 | `␣capital` | 6864 |
| 3 | `␣of` | 315 |
| 4 | `␣France` | 9822 |
| 5 | `␣is` | 374 |

Llama-3's vocabulary has 128,256 entries, so every id is an integer from 0 to 128,255.

### How it splits

- The split follows the vocabulary the tokenizer learned in training, not the spaces. A common word is one token; a rare word is cut into several pieces.
- The same string always gives the same ids. That is why, in Steps 6 and 9, the first 5 columns get the same input every round.

### Why the vocabulary has 128,256 entries

It is not the number of distinct words in the training data. It is a **target size chosen in advance** when the tokenizer is trained:

1. Start from the 256 bytes (every value one UTF-8 byte can take). Any text can be written as a sequence of these 256 bytes.
2. Over a large body of text, find the pair of adjacent pieces that occurs together most often and add their merge to the vocabulary as a new token. For example `t`+`h` → `th`, then `th`+`e` → `the`, then `␣`+`the` → `␣the`.
3. Repeat until the vocabulary reaches the target size. Llama-3's target is 128,000 ordinary tokens.

This method is BPE (byte pair encoding). The training data decides **which** tokens get merged (common words, word pieces, common Chinese characters), not **how many**.

The other 256 are special tokens, numbered from 128,000: `<|begin_of_text|>` is 128000 (the footnote above), Step 10's `<EOS>` is 128001, and most of the rest are reserved. So 128,000 + 256 = 128,256.

### What about a word it never saw

Nothing is ever missing. A word not in the vocabulary is split into smaller pieces that are; at worst into single bytes, and all 256 bytes are in the vocabulary. So any string becomes ids, and there is no "unknown word".

The cost is length: a made-up word or a rarely seen language becomes many tokens, so the sequence is longer, and every later step's computation and KV cache (chapter 3) grows with it.

### Next

Step 3 sends these 5 ids into the model.

## Step 3 · Forward pass: one score per vocabulary token

> **In one line:** the 5 ids go into the transformer together, in one forward pass, and 128,256 scores $s_t$ come out.

### On the stage

- The sequence boxes pulse and the wire turns into a moving blue dashed line: the 5 ids are going in.
- The `transformer` box in the middle, with `processing 5 tokens…` under it.

### The output

| Symbol | What it is | Size | From |
|---|---|---|---|
| $t$ | one token of the vocabulary, written as its id | 0 to 128,255 | Step 2's vocabulary |
| $s_t$ | the model's score for $t$; higher means more likely to come next | one real number | this step |

There are 128,256 scores: $s_0, s_1, \dots, s_{128255}$. For example, $s_{12366}$ is the score of `␣Paris` (id 12366).

### Points

- The model computes something at all 5 positions, but only the scores at the **last position** (`␣is`) are used to pick the next token.
- $s_t$ is not a probability yet: it can be any real number, positive or negative, and the scores do not add up to 1.
- A "forward pass" is one computation that flows from the model's first layer to its last; chapter 2 opens one layer to see what happens inside.

### Next

Step 4 turns the scores into probabilities with softmax.

## Step 4 · Softmax turns scores into probabilities; pick one

> **In one line:** softmax turns the 128,256 scores into probabilities that add up to 1; `␣Paris` is the largest and is picked.

### On the stage

- The label `p(next token | sequence)`: the probability of the next token given the current sequence, which is $p(t)$ in the formula below.
- Four bars: the 4 most likely tokens; the picked `␣Paris` is orange, the others grey. Bar length is proportional to probability.
- `← pick`: marks the one chosen.

### Formula

$$
p(t) = \frac{e^{s_t}}{\sum_{u=0}^{128255} e^{s_u}}
$$

| Symbol | What it is | From |
|---|---|---|
| $s_t$ | token $t$'s score | Step 3 |
| $u$ | the summation variable, running over all 128,256 vocabulary tokens | |
| $e^{x}$ | the exponential, $e \approx 2.718$; always positive | |
| $p(t)$ | the probability that $t$ is the next token | this step |

Every $e^{s_t}$ is positive and they are divided by their own total, so every $p(t)$ is between 0 and 1 and they add up to 1.

### The numbers on the stage

| Token | $p(t)$ |
|---|---|
| `␣Paris` | **0.82** |
| `␣Lyon` | 0.05 |
| `␣a` | 0.04 |
| `␣the` | 0.03 |
| the other 128,252 | 0.06 together |

The ratio of two probabilities depends only on their score gap, because the denominator cancels:

$$
\frac{p(\text{Paris})}{p(\text{Lyon})} = e^{\,s_{\text{Paris}} - s_{\text{Lyon}}} = \frac{0.82}{0.05} = 16.4
$$

So $s_{\text{Paris}}$ is $\ln 16.4 \approx 2.8$ above $s_{\text{Lyon}}$.

### How to pick

- **Greedy:** take the largest, which picks `␣Paris`.
- **Sampling:** draw one by probability; `␣Paris` comes up with chance 0.82. SGLang's default sampling parameters (temperature 1.0, top_p 1.0) draw from exactly this distribution.

### Next

Step 5 appends the picked token to the sequence.

## Step 5 · Append: the output becomes input

> **In one line:** `␣Paris` (id 12366) is added to the end of the sequence, which is now 6 ids.

### On the stage

- The orange sixth box `␣Paris` flies up into the sequence; orange marks tokens the model generated, blue the prompt's.
- The label changes to `sequence (6 tokens)`.

### The numbers on the stage

The sequence is now 791, 6864, 315, 9822, 374, 12366.

### Autoregressive

This is all "autoregressive" means: each new token is predicted from a sequence that includes every token generated before it.

The loop as drawn keeps nothing from Step 3 except the ids. So the next forward pass (Step 6) takes all 6 ids, and the first 5 positions are computed again.

### Next

Step 6 runs the forward pass again on 6 ids.

## Step 6 · Forward pass again, on all 6

> **In one line:** round 2 takes 6 ids; the first 5 positions have the same input and weights as in Step 3, so they compute the same results.

### On the stage

- All 6 boxes pulse and the `transformer` box reads `processing 6 tokens…`: all 6 positions are being computed.

### What is repeated

| Position | Input id | Against Step 3 |
|---|---|---|
| 1–5 | 791, 6864, 315, 9822, 374 | same ids, same weights, same results |
| 6 | 12366 | new |

This round produces a new set of $s_t$, taken at the last position, `␣Paris`.

Round 1 computed 5 positions and round 2 computes 6, so 5 of the 6 redo work Step 3 already did. Ch. 2 Step 11 shows inside one layer why those 5 results cannot change.

### Next

Step 7 picks again from the new scores.

## Step 7 · Pick again

> **In one line:** the same softmax on round 2's scores; `.` is the largest and is picked.

### On the stage

- Four new bars; `.` is orange (picked), the others grey.

### The numbers on the stage

The formula is Step 4's, $p(t) = e^{s_t} / \sum_u e^{s_u}$, with $s_t$ now Step 6's new scores.

| Token | $p(t)$ |
|---|---|
| `.` | **0.71** |
| `,` | 0.15 |
| `␣and` | 0.06 |
| `!` | 0.02 |
| top 4 together | 0.94 |

Greedy picks `.`, id 13.

### Why the distribution changed

The input changed: the sequence now ends in `␣Paris`. The list of ids is the model's only input, and it keeps no state from round 1, which is why the whole list goes in again every round.

### Next

Step 8 appends `.` to the sequence.

## Step 8 · Append

> **In one line:** `.` (id 13) is added to the end, and the sequence is 7 ids.

### On the stage

- The orange seventh box `.` flies into the sequence; the label changes to `sequence (7 tokens)`.

### The numbers on the stage

The sequence is now 791, 6864, 315, 9822, 374, 12366, 13.

### Source and teaching boundary

The page's "same loop, in code" section uses `ids.append(next_id)` to add the picked id. The no-KV-cache teaching loop in [zero-to-sglang Part II Chapter 3, code walkthrough §4.2](https://github.com/datawhalechina/zero-to-sglang/blob/bcf0cd82b9d1a058e5211d56431f14efd99eaf12/course-material/eng/part2/Chapter3_Forward-Pass-and-Generation_code.md) likewise appends with `torch.cat` before passing the whole prefix to the next round. That is the model behind this stage's "read all 7 next".

SGLang also appends the output first, but its cache avoids recomputing the whole prefix. In pinned revision [`sgl-project/sglang@ba76f34`](https://github.com/sgl-project/sglang/commit/ba76f34b85a4b77d765ab96a82e3cc6eb804cb96), the decode commit path extends `req.output_ids` with `next_token_id` ([`batch_result_processor.py:1230-1249`](https://github.com/sgl-project/sglang/blob/ba76f34b85a4b77d765ab96a82e3cc6eb804cb96/python/sglang/srt/managers/scheduler_components/batch_result_processor.py#L1230-L1249)), and `Req.refresh_fill_ids` maintains `origin_input_ids + output_ids` ([`schedule_batch.py:1150-1171`](https://github.com/sgl-project/sglang/blob/ba76f34b85a4b77d765ab96a82e3cc6eb804cb96/python/sglang/srt/managers/schedule_batch.py#L1150-L1171)). A real batch takes only the input after `prefix_len` ([`schedule_batch.py:2414-2417`](https://github.com/sgl-project/sglang/blob/ba76f34b85a4b77d765ab96a82e3cc6eb804cb96/python/sglang/srt/managers/schedule_batch.py#L2414-L2417)); this chapter's whole-prefix loop is the no-cache teaching simplification.

### The same three steps every round

| Round | Forward | Pick | Append | Sequence length |
|---|---|---|---|---|
| 1 | Step 3 | Step 4 | Step 5 | 5 → 6 |
| 2 | Step 6 | Step 7 | Step 8 | 6 → 7 |
| 3 | Step 9 | Step 10 | Step 11 (stop) | 7 |

These three rounds repeat the same forward, pick, and append loop, with one more input id each round. Round 3 stops after picking EOS instead of appending it.

### Next

Step 9 runs round 3's forward pass.

## Step 9 · Round 3's forward pass, 7 positions

> **In one line:** round 3 takes 7 ids; the first 5 positions are computed for the third time and `␣Paris` for the second.

### On the stage

- All 7 boxes pulse and the `transformer` box reads `processing 7 tokens…`.

### Formula

With a prompt of $P$ tokens, round $r$ takes $P + r - 1$ ids and computes that many positions. Over $N$ rounds:

$$
\sum_{r=1}^{N} (P + r - 1) = N P + \frac{N(N-1)}{2}
$$

| Symbol | What it is | On the stage | From |
|---|---|---|---|
| $P$ | the prompt's token count | 5 | Step 2 |
| $r$ | the round number (one token generated per round) | 1, 2, 3 | |
| $N$ | the number of rounds = tokens generated | 3 | Steps 3–11 |

### The numbers on the stage

| Round $r$ | $P + r - 1$ |
|---|---|
| 1 | 5 |
| 2 | 6 |
| 3 | 7 |
| total | $3 \times 5 + \frac{3 \times 2}{2} = 15 + 3 = 18$ |

### How fast it grows

- The $NP$ part grows with prompt length times output length.
- The $N(N-1)/2$ part grows with the square of the output length.

### Next

Step 10: this round's top pick is `<EOS>`.

## Step 10 · This time EOS is picked

> **In one line:** after round 3's softmax the largest probability is `<EOS>` (id 128001), an ordinary entry in the vocabulary.

### On the stage

- Four bars; `<EOS>` is red (picked), the others grey. Red marks EOS in this chapter.

### The numbers on the stage

| Token | $p(t)$ |
|---|---|
| `<EOS>` | **0.88** |
| `␣It` | 0.05 |
| `␣The` | 0.03 |
| `\n` | 0.02 |
| top 4 together | 0.98 |

### What EOS is

- `<EOS>` = end of sequence, written `<|end_of_text|>` in Llama-3, id 128001.
- The model learned in training to give it a high score when an answer is complete.
- It is picked the same way as `␣Paris` and `.`: it has the largest $p(t)$. The loop treats it differently only after the pick.

### Next

Step 11: picking EOS stops the loop.

## Step 11 · Stop, and decode the ids back to text

> **In one line:** picking id 128001 ends the loop; the tokenizer turns the ids back into text, and the generated part is `" Paris."`.

### On the stage

- The red eighth box `<EOS>` at the end of the sequence.
- `output: " Paris."` in a red-bordered box: the generated part decoded, without `<EOS>`.
- The footnote: the other conditions on which SGLang stops a request.

### The numbers on the stage

The generated ids are 12366, 13, 128001. Decoding drops `<EOS>`, so 12366, 13 → `" Paris."`. SGLang's `skip_special_tokens` defaults to `True`, so special tokens such as `<EOS>` do not appear in the output text.

### When a request stops

SGLang checks after every generated token and stops at whichever condition comes first:

| Condition | SGLang parameter | Default |
|---|---|---|
| the model outputs EOS | (turned off by `ignore_eos=True`) | on |
| the generated token count reaches a limit | `max_new_tokens` | 128 |
| a given string appears in the output | `stop` | none |
| a given token id is generated | `stop_token_ids` | none |

That is all of inference: tokenize, then forward, pick, append, until it stops.

### Next

Step 12 adds up the work of the three rounds.

## Step 12 · The bill

> **In one line:** 18 positions were computed for 3 new tokens, and 11 of them recomputed a column already computed with the same input.

### On the stage

- Three rows of cells, one per round; each cell sits under the token column it computed. Blue cells are prompt columns, orange cells generated tokens.
- To the right of each row: `round 1 · 5 positions`, `round 2 · 6 positions`, `round 3 · 7 positions`.
- Below: `5 + 6 + 7 = 18 positions computed`, `3 tokens produced`, and "the 5 prompt columns: same input, same output, computed 3×".

### The numbers on the stage

The total is Step 9's $NP + N(N-1)/2$ with $P = 5$, $N = 3$, which is 18.

| | Positions | Which |
|---|---|---|
| computed for the first time | 7 | the 5 prompt columns in round 1, `␣Paris` in round 2, `.` in round 3 |
| recomputed | 11 | the 5 prompt columns in each of rounds 2 and 3, `␣Paris` in round 3 |
| total | 18 | |

If each column's result were kept after its first computation, the three rounds would compute $5 + 1 + 1 = 7$ positions.

### Next

The question on the stage: what part of a column's computation does a later position need? Chapter 2 opens one layer to find it.

### Further reading

- [zero-to-sglang Part I Chapter 1: Introduction to LLM](https://zero-to-sglang.datawhale.cc/eng/part1/Chapter1_Introduction_to_LLM.html)
- [zero-to-sglang Part I Chapter 2: Introduction to Inference](https://zero-to-sglang.datawhale.cc/eng/part1/Chapter2_Introduction%20to%20Inference.html)
- [zero-to-sglang Part II Chapter 3: Forward Pass and Generation](https://zero-to-sglang.datawhale.cc/eng/part2/Chapter3_Forward-Pass-and-Generation.html)
- [zero-to-sglang Part II Chapter 3: Forward Pass and Generation (Code Walkthrough)](https://zero-to-sglang.datawhale.cc/eng/part2/Chapter3_Forward-Pass-and-Generation_code.html)
