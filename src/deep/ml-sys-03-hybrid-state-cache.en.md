## Step 1 · One short request, two waits

**One sentence.** Changing only `num_batch` reduced the article's short request from 3.95 s to 0.91 s, while cold startup rose from 16.9 s to 28.4 s.

### On the stage

- Both rows use the same machine, 5,500-token system and short users. The experiment changes only `num_batch`.
- Blue bars show total short-request time on one 3.95-second scale. The right column reports the range of prefilled tokens, not the user's own length.
- The bottom panel includes both the 3.04-second saving per request and the 11.5-second cold-start penalty.

### Formula and symbols

$$W_{\mathrm{saved}}=W_{1024}-W_{64},\qquad r=\frac{W_{1024}}{W_{64}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $W_{1024}$ | Total short-request time at `num_batch = 1024` | Article lines 572–579: 3.95 s |
| $W_{64}$ | Total short-request time at `num_batch = 64` | Same table: 0.91 s |
| $W_{\mathrm{saved}}$ | Time saved per short request | Calculated in this step |
| $r$ | Default wait divided by the tuned wait | Calculated in this step |

### The numbers on the stage

$$W_{\mathrm{saved}}=3.95-0.91=3.04\ \mathrm{s}$$

$$r=\frac{3.95}{0.91}\approx4.3,\qquad \Delta W_{\mathrm{cold}}=28.4-16.9=11.5\ \mathrm{s}$$

The 4.3 figure compares total request times, not throughput. For each setting, the article unloaded the model, performed a separate cold start, warmed up once and sent three short users. Cache did not cross settings, while reuse inside each setting matched the real workload. The article chose 64 under a 200-requests-per-day assumption; this step does not generalize that choice to other request rates or hardware.

### Next

The measurements expose a large change in recomputation. The next step shows why full attention can compute only the new user tail.

Source: `Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:566-599`.

## Step 2 · Full attention keeps one slot per token

**One sentence.** Full attention stores each token's K/V independently, so a new request can release the old tail after the shared prefix.

### On the stage

- Both requests contain a 5,500-token system and a 40-token user. Blue marks the reusable prefix, orange marks the new user to compute and hatching marks old slots to release.
- The third row isolates the new request's KV cache: read 5,500 existing slots, then write 40 new ones. Each block represents a range of slots; its width is not proportional to token count.
- Ch. 8 Steps 2–3 established that reuse must start at token 1. The first different token and everything after it form the new tail.

### Formula and symbols

$$C_{\mathrm{KV}}=E-M$$

| Symbol | Meaning | Source |
|---|---|---|
| $C_{\mathrm{KV}}$ | Tokens the full-attention request must prefill | Calculated in this step |
| $E$ | End position of the new prompt | $5{,}500+40=5{,}540$ |
| $M$ | Common prefix length, matched from token 1 | Article's simplified example: 5,500 |

### The numbers on the stage

$$E=5{,}500+40=5{,}540,\qquad C_{\mathrm{KV}}=5{,}540-5{,}500=40$$

The K/V at position $i$ depends on tokens $1$ through $i$. Later tokens append new slots without changing earlier ones, so both requests have identical K/V throughout their shared prefix. Releasing the tail moves the cursor and free markers back to slot 5,500; it does not recompute the prefix.

### Next

This result relies on a separate saved value for every position. The next step replaces that history with one recurrent summary.

Sources: `Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:71-89`; Ch. 3 Steps 1–3 and Ch. 8 Steps 2–3.

## Step 3 · Recurrent state keeps the current summary

**One sentence.** A recurrent state compresses prior tokens into one fixed-size summary; after the old user updates it, the cache has no separate summary for token 5,500.

### On the stage

- The blue 5,500-token system and hatched 40-token old user update the same orange state. They do not write separate slots.
- The orange box holds the current summary after 5,540 tokens. The dashed box marks the summary the new request needs at 5,500. That version was not saved, and the current summary cannot subtract only the old user.
- This step concerns saved state. Token matching still works; the missing piece is a historical state at the matched position.

### Formula and symbols

$$S_t=U(S_{t-1},x_t)$$

| Symbol | Meaning | Source |
|---|---|---|
| $S_t$ | Recurrent state after token $t$ | Abstract notation introduced here |
| $S_{t-1}$ | State after the preceding token | Same recurrence |
| $x_t$ | Model input representation for token $t$ | Per-token computation in Ch. 2 |
| $U$ | The current recurrent layer's update | Treated as one operation; its internals are outside this step |

### The numbers on the stage

After 5,540 tokens, the cache holds $S_{5{,}540}$. The new request needs $S_{5{,}500}$ to compute only 40 new tokens, but this example keeps only the current state. State shape does not grow with token count. This saves per-position storage and removes direct positional access to earlier states.

Gated DeltaNet also erases and gates information during its update. This chapter omits those formulas because the caching issue depends only on history being folded into one state. llama.cpp has a bounded per-token snapshot ring controlled by `n_rs_seq`; that exception stores extra copies for short rollbacks and does not match this diagram's no-saved-copy premise.

### Next

The engine can explicitly copy the state at selected positions. The next step calls each copy a checkpoint and replays from the newest usable one.

Sources: `Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:93-165`; llama.cpp `7e4c0a96880dae4fc4268ad441f8a6446bd5460a`, `src/llama-memory-recurrent.cpp:170-189` and `common/common.h:970-975`.

## Step 4 · Replay from the newest usable checkpoint

**One sentence.** A checkpoint saves the whole state at one position; a new request restores the newest copy that does not pass the match, then computes to the new prompt end.

### On the stage

- The blue line marks 5,514 matching tokens. Orange marks replay to the new prompt end. The red old-tail checkpoint passes the match and cannot be used.
- Position 5,514 would be the ideal resume point, but no state copy exists there. The newest usable copy is at 4,536, so processing resumes there and continues to 5,558.
- Distances are schematic. Subtracting positions gives 1,022, while the article's log says about 1,020 recomputed tokens. This step keeps the logged value approximate.

### Formula and symbols

$$D=E-M,\qquad C\approx E-P,\qquad P\le M$$

| Symbol | Meaning | Source |
|---|---|---|
| $E$ | End position of the new prompt | Logged example: 5,558 |
| $M$ | End of the common prefix | Logged example: 5,514 |
| $P$ | Newest usable checkpoint position | Logged example: 4,536 |
| $D$ | Tokens in the new tail | $E-M$ |
| $C$ | Approximate recomputation from checkpoint to end | Approximation of $E-P$ |

### The numbers on the stage

$$D=5{,}558-5{,}514=44$$

$$5{,}558-4{,}536=1{,}022\ \text{positions}\quad\Longrightarrow\quad C\approx1{,}020\ \text{tokens}$$

Only 44 of the roughly 1,020 recomputed tokens belong to the new tail. About $1{,}020-44=976$ revisit earlier positions. During restore, llama.cpp searches checkpoints in reverse and rejects any with `cur.pos_max > pos_next`, which rules out the old-tail copy.

The article documents two unresolved gaps in its exact `num_batch` reconstruction. This step uses only the log, position subtraction and the verified restore condition; it does not turn “about one batch” into a universal law.

### Next

Full attention could truncate at 5,514, while recurrent state must restore at 4,536. The next step aligns both layer kinds in one hybrid model.

Sources: `Awesome-ML-SYS-Tutorial/engineer/hybrid-prefix-cache/readme.md:139-165,202-221,385-458`; llama.cpp `7e4c0a96880dae4fc4268ad441f8a6446bd5460a`, `tools/server/server-context.cpp:3253-3288`.
