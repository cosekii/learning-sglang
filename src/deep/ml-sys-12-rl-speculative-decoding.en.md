## Step 1 · Train the draft as the target changes

**One sentence.** RL updates the target while a frozen draft keeps old weights; the public experiment reports 1,667 tokens/s with online draft training versus 1,464 frozen.

### On the stage

- The first line recalls Chapter 6's RL loop: the next round uses updated target weights.
- The orange card is the frozen draft, whose guesses still use old weights. The blue card is the online draft, which learns from each RL batch too.
- Both bars use one scale for 1,464 and 1,667 tokens/s. Ch. 15 Step 3 supplies the existing draft–verify rule: the draft guesses and the target verifies.

### Formula and symbols

$$g=\frac{T_o-T_f}{T_f}$$

| Symbol | Meaning | Source |
|---|---|---|
| $T_f$ | Rollout throughput with a frozen draft | Public experiment, 1,464 tokens/s |
| $T_o$ | Rollout throughput with online draft training | Public experiment, 1,667 tokens/s |
| $g$ | Online throughput gain over frozen | Computed in this step |

### The numbers on the stage

$$T_o-T_f=1667-1464=203\ \text{tokens/s}$$
$$g=(1667-1464)/1464=13.9\%$$

Online SFT means training the draft while RL trains the target, rather than running a separate offline training job. This configuration trains the checkpoint's built-in MTP layer, the layer that guesses future tokens. Training an external standalone draft model remains WIP at the pinned revision.

### Next

The next step takes one hidden state from each token position in the target's forward pass and asks what clue it gives the draft.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:66-94`; `THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a`, `docs/zh/advanced/speculative-decoding.md:24-38`.

## Step 2 · Target notes at every token

**One sentence.** The target forward leaves one hidden state at each position, and draft training reuses these computed internal notes.

### On the stage

- The orange sequence card holds the constructed tokens `[a,b,c,d,e]`.
- The middle card is the target's ordinary forward pass, not another rollout.
- The blue card holds `[h(a),h(b),…]`, one hidden state per position. Ch. 15 Step 5 already supplied target hidden states to a drafter; this step uses the same path.

### Formula and symbols

$$h_t=H(x_{\le t})$$

| Symbol | Meaning | Source |
|---|---|---|
| $x_t$ | Input token at position $t$ | Constructed `[a,b,c,d,e]` |
| $x_{\le t}$ | Tokens from the start through position $t$ | Same sequence |
| $H$ | The target's computation over the supplied prefix | Target forward |
| $h_t$ | Hidden state at position $t$, its internal notes | Forward output |

### The numbers on the stage

The first position gives $h(a)=H(a)$ and the second gives $h(b)=H(a,b)$. Five positions produce five notes. $h(a)$ is not another spelling of token `a`; it is a collection of numbers computed after the target processes that position.

### Next

The draft also needs the next input token. The next step shifts the token sequence left and turns the shifted tokens into embeddings aligned with these notes.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:25-30`; `THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a`, `docker/patch/latest/megatron.patch:152-179`.

## Step 3 · Pair target notes with the next token

**One sentence.** Shift and embed the tokens once so position $t$ can combine $h_t$ with $e_{t+1}$ and learn to predict $x_{t+2}$.

### On the stage

- The original sequence remains `[a,b,c,d,e]`. One left shift gives `[b,c,d,e,—]`, aligning token `b` with position `a`.
- The embedding card turns shifted token IDs into model numbers, written `[e(b),e(c),…]`.
- The prediction task joins $h(a)$ with $e(b)$ and uses `c` as its desired output. This is the training task, not a guarantee that the current draft already predicts correctly.

### Formula and symbols

$$u_t=\operatorname{concat}(h_t,e_{t+1})$$

| Symbol | Meaning | Source |
|---|---|---|
| $h_t$ | Target internal notes at position $t$ | Step 2 |
| $e_{t+1}$ | The next token's embedding, its model-number form | Shift and embedding lookup in this step |
| $\operatorname{concat}$ | Place two collections of numbers side by side, not add them | Defined as join in this step |
| $u_t$ | Paired draft input at position $t$ | Computed here |

### The numbers on the stage

$$u_a=\operatorname{concat}(h(a),e(b))$$

At position `a`, the next token is `b` and the token after that is `c`. The training task therefore maps $u_a$ to `c`. The dash marks no real token beyond the sequence. The implementation pads with zero instead of creating a token named “—”.

The diagram follows the public MiMo experiment's order: hidden state first, embedding second. Other models can arrange their projection halves differently, so join does not define a universal half order.

### Next

The next step shifts the tokens again to make the training labels and computes cross entropy.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:31-46`; `THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a`, `docker/patch/latest/megatron.patch:152-190` and `slime_plugins/mbridge/mimo.py:106-120`.
