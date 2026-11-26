## Step 1 · The update call hides a wait

**One sentence.** A nominal 1B bf16 model holds about 2 GB of weights, and one debug run spent 7.047 seconds replacing them.

### On the stage

- Training has produced `weights v1`, the new number tables. Rollout waits for the update before using them, continuing Chapter 6 Step 8.
- The left card derives the weight size. The right card shows the full-model time from the debug log.
- The smaller timing pair compares one parameter's `ModelRunner` operation with the whole external call. It shows why timing only the inner operation misses part of the wait.

### Formula and symbols

$$B=P\times b$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | Number of parameters | Nominal 1B model: $10^9$ |
| $b$ | Bytes per parameter | bf16: 2 bytes |
| $B$ | Total weight bytes | Derived here |

### The numbers on the stage

$$B=1{,}000{,}000{,}000\times2=2{,}000{,}000{,}000\ \text{bytes}=2\ \text{GB}$$

The 7.047-second measurement covers the full distributed update in the author's setup. The 0.001- and 0.033-second values come from one `q_proj` example. They do not predict another model or machine.

### Next

The controller knows that rollout must receive `v1`, but not which route carries it. The next step compares three update channels.

Sources: `Awesome-ML-SYS-Tutorial/sglang/latency-accelerate-for-weight-updates/readme.md:556-558,980-1007`; Chapter 6 Step 8.

## Step 2 · Read one checkpoint through the disk channel

**One sentence.** Training can save `v1` as a checkpoint, and each rollout engine can load that same saved copy through `update_weights_from_disk`.

### On the stage

- The three cards form a map of alternative update channels: disk, distributed values and tensor handles. Only one channel carries a given update.
- Blue selects the disk route. Training writes one checkpoint, rollout engines read it, and the model loader replaces their old weights.
- A checkpoint is persistent saved output as well as an update handoff. A newly added rollout engine can read it without joining the direct routes' communication setup.

### Formula and symbols

$$v_{\text{train}}=v_{\text{checkpoint}}=v_{\text{rollout},r}$$

| Symbol | Meaning | Source |
|---|---|---|
| $v_{\text{train}}$ | Weight version written after training | Chapter 6 Step 8: `v1` |
| $v_{\text{checkpoint}}$ | Version stored in the checkpoint | The disk handoff |
| $v_{\text{rollout},r}$ | Version loaded by rollout engine $r$ | Same checkpoint |

### The numbers on the stage

This step adds no weight size, engine count or timing. The source says storage and loading determine the wait but supplies no disk measurement, so the figure leaves that duration blank.

### Next

The disk route crosses storage. The next route instead lets training and inference processes broadcast parameter values through a shared process group.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-1.md:400-409`; `python/sglang/srt/model_executor/model_runner.py:641-694` at `sgl-project/sglang@392e441ad17c78b68638f2d959fcf592d19b4834`.
