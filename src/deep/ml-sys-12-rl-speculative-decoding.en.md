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

## Step 4 · The second shift makes labels

**One sentence.** Shift the already shifted tokens again to make the draft's labels, then use cross entropy to penalize scores that disagree with those labels.

### On the stage

- The first card repeats Step 3's `[b,c,d,e,—]`. The second shifts it into `[c,d,e,—,—]`, the training labels.
- The draft scores candidate tokens at every position. The CE card compares those scores with the matching label; higher scores for correct tokens reduce CE.
- Dashes have no real label to score. The public recipe scales this auxiliary CE by 0.2 before it joins the training backward pass.

### Formula and symbols

$$\mathcal L_{\mathrm{MTP}}=-\log p_{\mathrm{draft}}(x_{t+2}\mid u_t)$$

| Symbol | Meaning | Source |
|---|---|---|
| $u_t$ | Draft input joining $h_t$ and $e_{t+1}$ | Step 3 |
| $x_{t+2}$ | Token two positions after $t$, the training label | Second shift in this step |
| $p_{\mathrm{draft}}$ | Probability the draft assigns to the correct label | Draft scores after softmax |
| $\mathcal L_{\mathrm{MTP}}$ | Cross entropy at this position | Computed here |

### The numbers on the stage

At position `a`, the input is $u_a=\operatorname{concat}(h(a),e(b))$ and the label is `c`. This term is $-\log p_{\mathrm{draft}}(c\mid u_a)$. Raising the correct token's probability lowers its negative logarithm. The stage invents no probability or CE value.

The pinned recipe sets `--mtp-loss-scaling-factor 0.2`, so the auxiliary term entering backward is $0.2\mathcal L_{\mathrm{MTP}}$. The implementation attaches it to the main output's backward node rather than calling `mtp_loss.backward()` separately.

### Next

The next step shows how detach lets this auxiliary CE train the draft without sending its gradients into the target trunk and shared tables.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:46-60`; `THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a`, `docs/zh/advanced/speculative-decoding.md:24-38` and `docker/patch/latest/megatron.patch:581-603`.

## Step 5 · Keep the draft lesson on the draft

**One sentence.** Detach reuses target and shared-table values in the forward pass but cuts auxiliary CE gradients; the main RL loss is unaffected.

### On the stage

- The blue path between CE and the draft layer stays open, so draft parameters learn from Step 4's labels.
- The orange target trunk is detached. Auxiliary CE cannot propagate into target hidden states.
- The shared tables are the embedding and shared score table. The score table is the LM head, which turns hidden states into token scores; this CE branch uses detached parameter copies.
- The final line says the main RL loss still trains the target, embedding and LM head. Blocking CE does not leave those tables untrained.

### Formula and symbols

$$g^{\mathrm{CE}}_{\theta_{\mathrm{shared}}}=0,\qquad g^{\mathrm{CE}}_{\theta_{\mathrm{MTP}}}\ \text{is computed normally}$$

| Symbol | Meaning | Source |
|---|---|---|
| $\theta_{\mathrm{shared}}$ | Shared parameters in the target trunk, embedding and LM head | Steps 2, 3 and 5 |
| $\theta_{\mathrm{MTP}}$ | Parameters of the draft's built-in MTP layer | Step 1 |
| $g^{\mathrm{CE}}_{\theta}$ | Auxiliary CE gradient with respect to parameters $\theta$ | Backward path in this step |

### The numbers on the stage

This step constructs no gradient values. The left equation sets the shared-parameter gradient from auxiliary CE to zero on this branch. The right side leaves the MTP path open; it does not guarantee a nonzero value at every position. Main-loss gradients use a separate path and are outside the left equation.

The implementation detaches the embedding output and target hidden state, then calls the shared LM head with `functional_call` and detached parameters. It does not detach the MTP hidden output, so CE can still reach the MTP layer.

### Next

The next step uses a loss mask to select CE positions, excluding positions without two valid future tokens.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/spec/readme.md:58-60,184-234`; `THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a`, `docker/patch/latest/megatron.patch:170-179,596-603`.
