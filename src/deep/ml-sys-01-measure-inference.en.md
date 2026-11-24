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
