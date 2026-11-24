## Step 1 · Measure the wait to the first token

**One sentence.** TTFT tells you how long a user waits before any answer token appears.

**What the picture shows.** The left clock reads 0 ms when the request leaves. The right clock reads 250 ms when its first token appears. Blue marks only the wait between those two events. The example includes queueing and prefill in that wait, but does not claim how many milliseconds each part costs.

**Formula and symbols.**

$$\mathrm{TTFT}=t_{\mathrm{first\ token}}-t_{\mathrm{request\ sent}}$$

- $\mathrm{TTFT}$: time to first token, the waiting time being measured.
- $t_{\mathrm{request\ sent}}$: the clock reading when this request is sent, 0 ms here.
- $t_{\mathrm{first\ token}}$: the clock reading when its first output token appears, 250 ms here.
- $\mathrm{ms}$: milliseconds; $1{,}000\ \mathrm{ms}=1$ second.

**Substitute the picture's numbers.**

$$\mathrm{TTFT}=250-0=250\ \mathrm{ms}=0.250\ \mathrm{s}=\frac14\ \mathrm{s}$$

The 250 ms is a constructed teaching value from zero-to-sglang Part I Chapter 5 §3.1, not a local benchmark. *Inference Engineering* §1.4 gives the same measurement boundary: request sent to first output token. Queueing, prefill and the rest of the response are not separately measured in this step.

**Next.** The first token has arrived. The next wait to measure is the gap between adjacent output tokens.

## Step 2 · Measure gaps between neighboring tokens

**One sentence.** ITL is the difference between the times when two neighboring output tokens appear, measured separately for each gap.

**What the picture shows.** Measured from when the request was sent, output tokens 1 through 4 of the same request appear at 250, 275, 295 and 325 ms. Three blue arrows mark gaps of 25, 20 and 30 ms. Blue represents only ITL, not the TTFT before the first token.

**Formula and symbols.**

$$\mathrm{ITL}_i=t_i-t_{i-1}\quad(i=2,3,4)$$

- $\mathrm{ITL}_i$: inter-token latency, the gap between output token $i$ and the preceding output token.
- $t_i$: the time when output token $i$ appears; $t_1$ is the first token's 250 ms from Step 1.
- $i$: the output token number, starting at 1; this step measures the three gaps before tokens 2, 3 and 4.
- $\mathrm{ms}$: milliseconds, the same unit as in Step 1.

**Substitute the picture's numbers.**

$$\mathrm{ITL}_2=275-250=25\ \mathrm{ms}$$

$$\mathrm{ITL}_3=295-275=20\ \mathrm{ms}$$

$$\mathrm{ITL}_4=325-295=30\ \mathrm{ms}$$

Zero-to-sglang Part I Chapter 5 §3.1 and *Inference Engineering* §1.4 both define ITL as the time gap between adjacent output tokens. The second through fourth times are constructed additions to the same teaching request, not local measurements. The gaps do not have to be equal.

**Next.** The three gaps are now measured separately. The next step combines them into one average.
