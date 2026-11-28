## Step 1 · Train the draft as the target changes

**One sentence.** RL updates the target in every configuration; frozen means auxiliary CE does not train the MTP layer, while online means it does.

### On the stage

- The first line recalls Chapter 6's RL loop: the next round uses updated target weights.
- The orange card leaves the MTP layer without auxiliary CE, an extra penalty that teaches draft token scores. The blue card trains the MTP layer with that penalty. Main RL updates the target trunk and shared embedding/LM head in both configurations.
- Both bars use one scale for 1,464 and 1,667 tokens/s. Learning SGLang Ch. 15 Step 3 supplies the existing draft–verify rule: the draft guesses and the target verifies.

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

Online draft training means training the checkpoint's built-in multi-token prediction (MTP) layer with auxiliary CE while RL trains the target, rather than running a separate offline job. “Frozen” excludes only that auxiliary CE path. The main RL loss still updates the target trunk and the embedding/LM head shared with the draft in both configurations. Training an external standalone draft model is not yet implemented at the pinned revision.

### Next

The next step takes one hidden state from each token position in the target's forward pass and asks what clue it gives the draft.

Sources: `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:66-94`; `THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a`, `docs/zh/advanced/speculative-decoding.md:24-38`.

## Step 2 · Target notes at every token

**One sentence.** The target forward leaves one hidden state at each position, and draft training reuses these computed internal notes.

### On the stage

- The orange sequence card holds the constructed tokens `[a,b,c,d,e]`.
- The middle card is the target's ordinary forward pass, not another rollout.
- The blue card holds `[h(a),h(b),…]`, one hidden state per position. Learning SGLang Ch. 15 Step 5 already supplied target hidden states to a drafter; this step uses the same path.

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

Sources: `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:25-30`; `THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a`, `docker/patch/latest/megatron.patch:152-179`.

## Step 3 · Pair target notes with the next token

**One sentence.** Shift and embed the tokens once so the MTP layer can turn $h_t$ and $e_{t+1}$ into `draft_hidden_state` for learning to predict $x_{t+2}$.

### On the stage

- The original sequence remains `[a,b,c,d,e]`. One left shift gives `[b,c,d,e,—]`, aligning token `b` with position `a`.
- The embedding card turns shifted token IDs into model numbers, written `[e(b),e(c),…]`.
- The MTP layer joins $h(a)$ with $e(b)$ and produces `draft_hidden_state`, the draft's new notes for predicting `c`. The token `c` is the desired output, not a guarantee that the current draft already predicts correctly.

### Formula and symbols

$$u_t=\operatorname{concat}(h_t,e_{t+1})$$

$$d_t=\operatorname{MTP}(u_t)$$

| Symbol | Meaning | Source |
|---|---|---|
| $h_t$ | Target internal notes at position $t$ | Step 2 |
| $e_{t+1}$ | The next token's embedding, its model-number form | Shift and embedding lookup in this step |
| $\operatorname{concat}$ | Place two collections of numbers side by side, not add them | Defined as join in this step |
| $u_t$ | Paired draft input at position $t$ | Computed here |
| $\operatorname{MTP}$ | The draft's built-in MTP layer | Step 1, applied in this step |
| $d_t$ | Draft hidden state at position $t$, labelled `draft_hidden_state` on the stage | MTP-layer output in this step |

### The numbers on the stage

$$u_a=\operatorname{concat}(h(a),e(b))$$

$$d_a=\operatorname{MTP}(u_a)$$

At position `a`, the next token is `b` and the token after that is `c`. The MTP layer produces one `draft_hidden_state` per position. The next step's shared LM head turns these notes into token scores for predicting `c`. EAGLE, the draft method that reuses this layer, calls it repeatedly to propose several tokens. The dash marks no real token beyond the sequence. The implementation pads with zero instead of creating a token named “—”.

The diagram shows the original MiMo checkpoint order, `concat(h_t,e_{t+1})`. The pinned Megatron forward executes `concat(e_{t+1},h_t)` instead; `MimoBridge` swaps the `eh_proj` input halves during checkpoint conversion. Both forms give the MTP layer the same pair $(h_t,e_{t+1})$ for learning $x_{t+2}$. Join never means arithmetic addition.

### Next

The next step shifts the tokens again to make the training labels, sends `draft_hidden_state` through the shared LM head, and computes cross entropy.

Sources: <code>Awesome-ML-SYS-Tutorial@<wbr>d1f309b46f81a23e8b6ca0718c05bc897fafacf7</code>, `rlhf/slime/spec/readme.md:31-46,236-240`; <code>THUDM/<wbr>slime@<wbr>1278475ef4757ac8b03b1836dc1dc20fcc2dd56a</code>, `docker/patch/latest/megatron.patch:152-190` and `slime_plugins/mbridge/mimo.py:106-120`; <code>NVIDIA/<wbr>Megatron-LM@<wbr>23e00ed0963c35382dfe8a5a94fb3cda4d21e133</code>, <code>megatron/core/transformer/<wbr>multi_token_prediction.py:511-522,<wbr>566-604,<wbr>688-727</code>.

## Step 4 · The second shift makes labels

**One sentence.** The shared LM head turns `draft_hidden_state` into scores, and another left shift makes the labels that cross entropy compares with those scores.

### On the stage

- The first card repeats Step 3's `[b,c,d,e,—]`. The second shifts it into `[c,d,e,—,—]`, the training labels.
- The shared LM head is the token scorer used by both target and draft. It reads Step 3's `draft_hidden_state` and produces draft scores at every position.
- The CE card compares those scores with the matching label. Higher scores for correct tokens reduce CE. Dashes have no real label to score.

### Formula and symbols

$$\mathcal L_{\mathrm{MTP}}=-\log p_{\mathrm{draft}}(x_{t+2}\mid u_t)$$

| Symbol | Meaning | Source |
|---|---|---|
| $u_t$ | Draft input joining $h_t$ and $e_{t+1}$ | Step 3 |
| $x_{t+2}$ | Token two positions after $t$, the training label | Second shift in this step |
| $p_{\mathrm{draft}}$ | Probability the draft assigns to the correct label | Draft scores after softmax |
| $\mathcal L_{\mathrm{MTP}}$ | Cross entropy at this position | Computed here |

### The numbers on the stage

At position `a`, the input is $u_a=\operatorname{concat}(h(a),e(b))$. Step 3's MTP layer produces `draft_hidden_state`, then the shared LM head produces draft scores. The label is `c`, so this term is $-\log p_{\mathrm{draft}}(c\mid u_a)$. Raising the correct token's probability lowers its negative logarithm. The stage invents no probability or CE value.

The formula above is one per-position CE term, not the whole normalized loss. The documented one-layer recipe sets `--mtp-loss-scaling-factor 0.2`, or one-fifth. Megatron applies the mask and, unless per-token loss is enabled, also divides by the implementation's `num_tokens` count from `new_loss_mask` before applying this factor. The main output's backward then triggers the auxiliary branch; there is no separate `mtp_loss.backward()` call. Do not equate `num_tokens` with Step 6's post-intersection position count.

### Next

The next step shows how detach lets this auxiliary CE train the draft without sending its gradients into the target trunk and shared tables.

Sources: <code>Awesome-ML-SYS-Tutorial@<wbr>d1f309b46f81a23e8b6ca0718c05bc897fafacf7</code>, `rlhf/slime/spec/readme.md:46-60`; <code>THUDM/<wbr>slime@<wbr>1278475ef4757ac8b03b1836dc1dc20fcc2dd56a</code>, `docs/zh/advanced/speculative-decoding.md:24-38` and `docker/patch/latest/megatron.patch:152-191`; <code>NVIDIA/<wbr>Megatron-LM@<wbr>23e00ed0963c35382dfe8a5a94fb3cda4d21e133</code>, <code>megatron/core/models/gpt/<wbr>gpt_model.py:449-488,<wbr>500-508</code> and <code>megatron/core/transformer/<wbr>multi_token_prediction.py:349-382</code>.

## Step 5 · Keep the draft lesson on the draft

**One sentence.** Detach reuses target and shared-table values in the forward pass but cuts auxiliary CE gradients; the main RL loss is unaffected.

### On the stage

- The blue CE and MTP-layer cards stay trainable. The CE line says weight-change instructions reach the MTP layer from Step 4's labels.
- The shared-tables card names the embedding and LM head. The first forward line turns token IDs into model numbers through the embedding. The second turns `draft_hidden_state` into draft scores through the shared LM head. Both use current parameter values.
- Separate orange dashed cards and CE lines block auxiliary CE gradients into the target trunk and the shared tables. These are two distinct parameter sets.
- The final line says main RL learning still trains the target and shared tables. Blocking auxiliary CE does not freeze their weights.

### Formula and symbols

A gradient tells each weight which direction and how far to change during learning. The stage calls it weight-change instructions.

$$g^{\mathrm{CE}}_{\theta_{\mathrm{detached}}}=0$$

$$g^{\mathrm{CE}}_{\theta_{\mathrm{shared}}}=0$$

$$g^{\mathrm{CE}}_{\theta_{\mathrm{MTP}}}\ \text{is computed normally}$$

| Symbol | Meaning | Source |
|---|---|---|
| $\theta_{\mathrm{detached}}$ | Target-trunk parameters detached on this auxiliary CE branch | Target trunk in Steps 2 and 5 |
| $\theta_{\mathrm{shared}}$ | Embedding and LM-head parameters shared with the draft, detached only for this auxiliary CE call | Shared-tables card in this step |
| $\theta_{\mathrm{MTP}}$ | Parameters of the draft's built-in MTP layer | Step 1 |
| $g^{\mathrm{CE}}_{\theta}$ | Auxiliary CE gradient with respect to parameters $\theta$ | Backward path in this step |

### The numbers on the stage

This step constructs no gradient values. The first two equations set auxiliary CE's gradient contribution to zero for the detached target trunk and the shared embedding/LM head. The right side leaves the MTP path open; it does not guarantee a nonzero value at every position. Main-loss gradients use a separate path and are outside these equations.

### Implementation behind the stage

The implementation detaches the embedding output. It passes the target hidden state through <code>make_viewless_tensor(...,<wbr> requires_grad=True,<wbr> keep_graph=False)</code>, then calls the shared LM head through `functional_call` with detached parameter views. Those views do not mutate the original parameters or their `requires_grad` flags. The MTP hidden output, `draft_hidden_state`, is not detached, so CE can still reach the MTP layer. The main RL loss still trains the target trunk and shared tables.

### Next

The next step uses a loss mask to select CE positions, excluding positions without two valid future tokens.

Sources: <code>Awesome-ML-SYS-Tutorial@<wbr>d1f309b46f81a23e8b6ca0718c05bc897fafacf7</code>, `rlhf/slime/spec/readme.md:58-60,184-234`; <code>THUDM/<wbr>slime@<wbr>1278475ef4757ac8b03b1836dc1dc20fcc2dd56a</code>, `docker/patch/latest/megatron.patch:164-180,596-603`.

## Step 6 · Keep positions with two valid future tokens

**One sentence.** Shift the loss mask twice and multiply the results, counting position $t$ only when both $t+1$ and $t+2$ are valid.

### On the stage

- The original mask is `[1,0,1,1,0]`: 1 marks a valid token and 0 skips it.
- One left shift gives `[0,1,1,0,0]`, checking intermediate token $t+1$. Two shifts give `[1,1,0,0,0]`, checking target token $t+2$.
- Their product is `[0,1,0,0,0]`. The second position survives even though its original mask is 0 because this rule checks the next two tokens.

### Formula and symbols

$$m^{\mathrm{MTP}}_t=m_{t+1}m_{t+2}$$

| Symbol | Meaning | Source |
|---|---|---|
| $m_t$ | Original loss mask at position $t$ | Constructed sequence in this step |
| $m_{t+1}$ | Whether the intermediate token is valid | First shift |
| $m_{t+2}$ | Whether the target token is valid | Second shift |
| $m^{\mathrm{MTP}}_t$ | Whether this position counts for one-layer MTP CE | Product in this step |

### The numbers on the stage

With zero-based indexing, $t=1$ is the second position. $m_2=1$ and $m_3=1$, so $m^{\mathrm{MTP}}_1=1\times1=1$. Original $m_1=0$ is absent from this formula because the current position is neither the intermediate nor the target token being checked.

Before shifting, slime pads the prompt portion with zeros, then slices and aligns the mask under context parallelism. This diagram covers only the one-layer intersection. The implementation's CE normalization denominator and deeper-stack mask progression require separate code reading and do not follow from this picture.

### Next

The next step returns to the public experiment and compares rollout throughput for all three configurations.

Sources: `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:144-176`; `THUDM/slime@1278475ef4757ac8b03b1836dc1dc20fcc2dd56a`, `slime/backends/megatron_utils/model.py:408-467` and `docker/patch/latest/megatron.patch:158-191`.

## Step 7 · Compare rollout throughput on one scale

**One sentence.** The public summary table gives online draft training the highest rollout throughput: 13.9% over frozen and 36.8% over no speculation.

### On the stage

- The grey bar has no speculation and reaches 1,219 tokens/s. The orange frozen-draft bar reaches 1,464 and the blue online-draft bar reaches 1,667.
- All three bars use one scale. The values are reported generated tokens per second, not local measurements.
- Frozen and online describe only auxiliary CE on the MTP layer. Main RL updates the target trunk and shared embedding/LM head in both configurations.
- Target drift can widen the draft–target probability gap and reduce accepted tokens. Online auxiliary CE trains MTP to follow those updates. The article's reported accept-length increase and MTP-loss decrease match that direction, without proving causation or gains on other workloads.
- Learning SGLang Ch. 15 Step 8 explains how committing more tokens per target pass can spread the pass's cost over more output. This step uses that mechanism without importing another chapter's model numbers.

### Formula and symbols

$$g_{a:b}=\frac{T_a-T_b}{T_b}$$

| Symbol | Meaning | Source |
|---|---|---|
| $T_a,T_b$ | Rollout throughput for two configurations | Public summary table |
| $g_{a:b}$ | Gain of configuration $a$ over configuration $b$ | Computed here |
| $a,b$ | Two of no, frozen and online | The three stage bars |

### The numbers on the stage

$$g_{frozen:no}=1464/1219-1=20.1\%$$
$$g_{online:frozen}=1667/1464-1=13.9\%,\qquad g_{online:no}=1667/1219-1=36.8\%$$

The article also reports long-tail throughput of 47, 57 and 65 tokens/s for no, frozen and online. Online is $65/57-1=14.0\%$ above frozen there. Long tail means most requests have finished while a few slow responses are still generating. It is a separate metric from whole-batch rollout throughput.

The article describes improved draft acceptance and falling MTP loss in plots. This step extracts no exact values from those images and does not convert tokens committed per target pass into time. The summary table lacks a common rollout token count and whole-round timeline. Its 36.8% figure is not an end-to-end RL speedup and does not prove unchanged rewards for every workload.

### Next

The next step measures the added training seconds and explains why throughput gain alone cannot establish a whole-round win.

Source: `Awesome-ML-SYS-Tutorial@d1f309b46f81a23e8b6ca0718c05bc897fafacf7`, `rlhf/slime/spec/readme.md:66-114`.

## Step 8 · Online draft training adds 7 seconds

**One sentence.** The same public table lists a training metric of 141, 143 and 148 seconds. Online is 7 seconds higher, but the article does not say which training steps those seconds cover, so the values cannot establish a whole-round speedup.

### On the stage

- The grey no-speculation bar reports 141 seconds, the orange frozen bar 143 and the blue online bar 148. All three bars share one scale.
- The two differences are $148-141=7$ seconds and $148-143=5$ seconds.
- The final two lines leave the reported rollout table and draw `model answer → program reply → model answer`, introducing the next chapter's multi-turn context question.

### Formula and symbols

$$\Delta T_{a:b}=T^{train}_a-T^{train}_b$$

$$c_{a:b}=\frac{T^{train}_a}{T^{train}_b}-1$$

| Symbol | Meaning | Source |
|---|---|---|
| $T^{train}_a,T^{train}_b$ | Reported training time for two configurations | Public summary table |
| $\Delta T_{a:b}$ | Additional training seconds for configuration $a$ | Computed here |
| $c_{a:b}$ | Relative increase in training time | Computed here |

### The numbers on the stage

$$\Delta T_{online:no}=148-141=7\ \text{s}$$

$$c_{online:no}=148/141-1=5.0\%$$

$$\Delta T_{online:frozen}=148-143=5\ \text{s}$$

Step 7 reports tokens/s, while this step reports a training metric in seconds. The article does not say which training steps the 141, 143 and 148 seconds cover. It also omits a common rollout token count and complete round timeline, so these values cannot produce an end-to-end gain. The 5.0% figure is an increase in this reported metric, not a claim that the whole round becomes 5.0% slower.

### Derived · not drawn

$$c_{online:frozen}=148/143-1=3.5\%$$

This relative increase uses the same reported values, but the stage does not draw it.

### Next

The pinned ReTool example appends interpreter observations to the same response. The next chapter first shows which tokens the second model call receives, then assigns the policy loss mask in Step 2. Multi-turn draft-pair selection is outside this chapter's scope.

Sources: <code>Awesome-ML-SYS-Tutorial@<wbr>d1f309b46f81a23e8b6ca0718c05bc897fafacf7</code>, `rlhf/slime/spec/readme.md:66-104`; <code>THUDM/<wbr>slime@<wbr>1278475ef4757ac8b03b1836dc1dc20fcc2dd56a</code>, `examples/retool/generate_with_retool.py:267-303`.
