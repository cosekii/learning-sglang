## Step 1 · Measure the first-sound wait

**One sentence.** PR #1235 changed only the talker's placement, moving p90 first sound from about 2.7 seconds beside the thinker to about 1.4 seconds on its own GPU.

### On the stage

- `First sound` is the first audio the client receives. Learning SGLang Ch. 20 Step 1 already separated this first chunk from later gaps.
- `P90` means that 9 in 10 requests received their first sound within this time. The blue bars share one scale; they do not show individual requests inside either run.
- The two shared-placement results are 2.697 and 2.663 seconds. Their mean is 2.68 seconds, displayed as 2.7 seconds.
- The two own-GPU results are 1.463 and 1.415 seconds. Their mean is 1.439 seconds, rounded to 1.44 seconds in the arithmetic and 1.4 seconds on the bar.
- `+1.3 s` subtracts the displayed one-decimal values. The unrounded means differ by about 1.24 seconds, and the roughly 46% improvement uses two-decimal means.

### Formula and symbols

$$\bar t=\frac{t_1+t_2}{2},\qquad s=\left(1-\frac{\bar t_{\mathrm{alone}}}{\bar t_{\mathrm{shared}}}\right)\times100\%$$

| Symbol | Meaning | Source |
|---|---|---|
| $t_1,t_2$ | Two p90 results for one placement | PR #1235 |
| $\bar t_{\mathrm{shared}}$ | Mean p90 with the talker beside the thinker | 2.697 and 2.663 seconds |
| $\bar t_{\mathrm{alone}}$ | Mean p90 with the talker on its own GPU | 1.463 and 1.415 seconds |
| $s$ | Percentage by which the own-GPU wait is shorter | Calculated in this step |

### The numbers on the stage

$$\bar t_{\mathrm{shared}}=(2.697+2.663)\div2=2.68\ \text{s}$$

$$\bar t_{\mathrm{alone}}=(1.463+1.415)\div2=1.439\ \text{s}\approx1.44\ \text{s}$$

$$s=(1-1.44\div2.68)\times100\%\approx46\%$$

The test used H200s and 8 concurrent requests, with the thinker split across two GPUs. The shared case placed the talker beside one thinker half, not every stage on one card. These results describe that public experiment only.

### Next

The numbers show a changed wait without locating it. The next step fixes when the timer starts and which event stops it.

Sources: Learning SGLang Ch. 19 Step 5; the PR #1235 measurement notes in `src/pages/ch/19-sharing-gpus.mdx`.
