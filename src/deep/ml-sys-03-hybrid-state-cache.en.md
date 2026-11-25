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
