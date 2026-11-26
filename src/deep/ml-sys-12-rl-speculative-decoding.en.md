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
