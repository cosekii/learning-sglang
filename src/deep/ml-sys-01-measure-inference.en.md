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

## Step 3 · Average the gaps after the first token

**One sentence.** TPOT combines the ITL gaps after the first token into one average.

**What the picture shows.** The same request keeps its four token times of 250, 275, 295 and 325 ms, and its three blue ITL gaps of 25, 20 and 30 ms. This step averages all three gaps; the first and last token times give the same result. TPOT excludes Step 1's TTFT, and averaging does not make the three gaps equal.

**Formula and symbols.**

$$\mathrm{TPOT}=\frac{\sum_{i=2}^{N}\mathrm{ITL}_i}{N-1}=\frac{t_N-t_1}{N-1}\quad(N\ge2)$$

- $\mathrm{TPOT}$: time per output token; in this example, the average gap between neighboring outputs after the first token.
- $N$: the total number of output tokens, 4 here; $N-1$ is the number of gaps after the first token.
- $\mathrm{ITL}_i$: the gap between output token $i$ and its predecessor, measured in Step 2.
- $t_1$ and $t_N$: the first and last output token times, 250 and 325 ms here.
- $\sum_{i=2}^{N}$: add the ITL gaps from token 2 through token $N$.

**Substitute the picture's numbers.**

$$\mathrm{TPOT}=\frac{25+20+30}{4-1}=\frac{75}{3}=25\ \mathrm{ms}$$

$$\mathrm{TPOT}=\frac{325-250}{4-1}=\frac{75}{3}=25\ \mathrm{ms}$$

Zero-to-sglang Part I Chapter 5 §3.1 uses the same boundary: with 200 output tokens, it divides the post-first-token generation time by 199 and writes the unit as ms/token. This example's 25 ms average happens to equal the first ITL gap, but the other gaps remain 20 and 30 ms. The 250 ms TTFT from request sent to first token is not in the numerator.

**Next.** The wait before the first token and the later average gap are both measured. The next step can measure the whole answer from start to finish.

## Step 4 · Measure the whole request

**One sentence.** E2E latency runs from request sent to request complete, including the time before and after the first token.

**What the picture shows.** The request is sent at 0 ms, token 1 appears at 250 ms, and token 4, the last token, appears at 325 ms. The request then completes. The upper blue line measures the whole route; the lower two spans show 250 ms of TTFT and 75 ms after token 1. That 75 ms is still the sum of Step 2's three ITL gaps, not one gap or one average TPOT added once.

**Formula and symbols.**

$$\mathrm{E2E}=t_{\mathrm{complete}}-t_{\mathrm{request\ sent}}=\mathrm{TTFT}+\sum_{i=2}^{N}\mathrm{ITL}_i$$

- $\mathrm{E2E}$: end-to-end latency, the total delay from sending a request until it completes.
- $t_{\mathrm{request\ sent}}$: the request-sent time, 0 ms in the picture.
- $t_{\mathrm{complete}}$: the completion time; this example treats the last token's arrival at 325 ms as completion.
- $\mathrm{TTFT}$: the wait before token 1 measured in Step 1, 250 ms here.
- $\sum_{i=2}^{N}\mathrm{ITL}_i$: add every neighboring-token gap from token 2 through token $N$; here $N=4$.

**Substitute the picture's numbers.**

$$\mathrm{E2E}=325-0=325\ \mathrm{ms}$$

$$\mathrm{E2E}=250+(25+20+30)=250+75=325\ \mathrm{ms}$$

Zero-to-sglang Part I Chapter 5 §3.1 defines E2E as the total time from request sent to completion and calculates $\mathrm{E2E}=\mathrm{TTFT}+\text{remaining generation time}$. This example uses the same boundary. The 0, 250 and 325 ms values are constructed teaching values, not local measurements; no processing time after the last token is separately included.

**Next.** One request's whole time is now measured. The next step puts several requests together to find the slower ones.

## Step 5 · Sort requests to find P50 and the slowest

**One sentence.** Sort 100 requests by E2E latency to read P50 at the middle position while keeping the slowest request visible.

**What the picture shows.** Each blue bar is one request's E2E latency: the first 51 bars are 200 ms, the next 48 are 300 ms, and the last is 2000 ms. The cards below identify requests 50 and 100. The slowest request's 2000 ms is ten times P50.

**Formula and symbols.** This step calls the latency at the 50% position P50:

$$L_{(1)}\le L_{(2)}\le\cdots\le L_{(N)},\qquad r=\lceil0.50N\rceil,\qquad \mathrm{P50}=L_{(r)}$$

- $L_{(i)}$: the E2E latency of request $i$ after sorting; Step 4 defines each request's measurement.
- $N$: the number of requests, $51+48+1=100$ here.
- $r$: the position halfway through the queue; $\lceil\ \rceil$ rounds up to an integer.
- $\mathrm{P50}$: the latency at position $r$, not an average across the requests.

**Substitute the picture's numbers.**

$$\mathrm{P50}=L_{(\lceil0.50\times100\rceil)}=L_{(50)}=200\ \mathrm{ms}$$

$$L_{(100)}=2000\ \mathrm{ms}=10\times200\ \mathrm{ms}=10\times\mathrm{P50}$$

Another common method averages the waits at positions 50 and 51. Both are 200 ms here, so that method also gives 200 ms. The groups of 51, 48 and 1 form a constructed distribution based on the scenario in zero-to-sglang Part I Chapter 5 §5.2: 99 requests within 100–300 ms and one request taking 2 s. These are not local measurements. Course §5.1 and *Inference Engineering* §1.4.1 both place P50 halfway through sorted requests. Other datasets and tools may interpolate P50; this step does not cover those methods.

**Next.** The middle position is now visible. The next step inspects request 99 to examine a longer wait.
