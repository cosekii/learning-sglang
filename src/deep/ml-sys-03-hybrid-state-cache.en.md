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
