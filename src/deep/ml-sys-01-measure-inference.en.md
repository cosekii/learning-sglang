## Step 1 · Measure the wait to the first token

**One sentence.** TTFT tells you how long a user waits before any answer token appears.

**What the picture shows.** The animation first shows the request leaving at 0 ms, then the first token at 250 ms, then the subtraction. Blue marks only the wait between those two events. Here `stream: true` turns streaming on: the server sends deltas instead of one whole answer. Each SSE delta carries exactly one output token in this constructed example, and 250 ms is when the client reads the first delta. The example includes queueing and prefill in that wait, but does not claim how many milliseconds each part costs.

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

**What the picture shows.** The animation reveals tokens 2, 3 and 4 one at a time, with the gap before each token. Measured from when the request was sent, the four tokens appear at 250, 275, 295 and 325 ms. Each timestamp records when the client reads that token's SSE delta. Three blue arrows mark gaps of 25, 20 and 30 ms. Blue represents only ITL, not the TTFT before the first token.

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

**What the picture shows.** The same clock again reveals the four token times of 250, 275, 295 and 325 ms, and the three blue ITL gaps of 25, 20 and 30 ms. The average appears after all three gaps are present. The first and last token times give the same result. TPOT excludes Step 1's TTFT, and averaging does not make the three gaps equal.

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

**What the picture shows.** The upper blue line advances through 250, 275, 295 and 325 ms on the same clock. The request starts at 0 ms, token 1 appears at 250 ms, and the client reads the final SSE delta, carrying token 4, at 325 ms. The lower spans show 250 ms of TTFT and 75 ms after token 1. Card spacing is schematic rather than a second time scale. The full E2E calculation appears only after completion. That 75 ms is still the sum of Step 2's three ITL gaps, not one gap or one average TPOT added once.

**Formula and symbols.**

$$\mathrm{E2E}=t_{\mathrm{complete}}-t_{\mathrm{request\ sent}}=\mathrm{TTFT}+\sum_{i=2}^{N}\mathrm{ITL}_i$$

- $\mathrm{E2E}$: end-to-end latency, the total delay from sending a request until it completes.
- $t_{\mathrm{request\ sent}}$: the request-sent time, 0 ms in the picture.
- $t_{\mathrm{complete}}$: the completion time; this example treats the arrival of the SSE delta carrying the last token at 325 ms as completion.
- $\mathrm{TTFT}$: the wait before token 1 measured in Step 1, 250 ms here.
- $\sum_{i=2}^{N}\mathrm{ITL}_i$: add every neighboring-token gap from token 2 through token $N$; here $N=4$.

**Substitute the picture's numbers.**

$$\mathrm{E2E}=325-0=325\ \mathrm{ms}$$

$$\mathrm{E2E}=250+(25+20+30)=250+75=325\ \mathrm{ms}$$

Zero-to-sglang Part I Chapter 5 §3.1 defines E2E as the total time from request sent to completion and calculates $\mathrm{E2E}=\mathrm{TTFT}+\text{remaining generation time}$. This example uses the same boundary. The 0, 250 and 325 ms values are constructed teaching values, not local measurements; no processing time after the last token is separately included.

**Next.** One request's whole time is now measured. The next step puts several requests together to find the slower ones.

## Step 5 · Sort two batches and compare P50

**One sentence.** Sort two 100-request batches on the same latency scale, then compare the E2E latency at each batch's middle position.

**What the picture shows.** Each blue bar is one request's E2E latency. Both panels start unsorted; A sorts first, then B. A has 51 requests at 200 ms, 48 at 300 ms and one at 2000 ms. B has 50 at 250 ms, 49 at 400 ms and one at 2000 ms. The P50 labels then appear at request 50: 200 ms for A and 250 ms for B. Both panels use the same 0–2000 ms axis, and the last line calculates B − A = 50 ms.

**Formula and symbols.** For either batch $b\in\{A,B\}$, this step calls the latency at the 50% position P50:

$$L^b_{(1)}\le L^b_{(2)}\le\cdots\le L^b_{(N)},\qquad r=\lceil0.50N\rceil,\qquad \mathrm{P50}^b=L^b_{(r)}$$

- $b$: the batch label, A or B.
- $L^b_{(i)}$: the E2E latency of request $i$ in batch $b$ after sorting; Step 4 defines the measurement.
- $N$: the number of requests in each batch, 100.
- $r$: the position halfway through the queue; $\lceil\ \rceil$ rounds up to an integer.
- $\mathrm{P50}^b$: the latency at position $r$ in batch $b$, not an average across its requests.

**Substitute the picture's numbers.**

$$\mathrm{P50}^A=L^A_{(\lceil0.50\times100\rceil)}=L^A_{(50)}=200\ \mathrm{ms}$$

$$\mathrm{P50}^B=L^B_{(50)}=250\ \mathrm{ms},\qquad \mathrm{P50}^B-\mathrm{P50}^A=250-200=50\ \mathrm{ms}$$

$$L^A_{(100)}=2000=10\times200\ \mathrm{ms},\qquad L^B_{(100)}=2000=8\times250\ \mathrm{ms}$$

Batch A follows the constructed scenario in zero-to-sglang Part I Chapter 5 §5.2: 99 faster requests and one 2 s request. Batch B is another constructed distribution for a same-scale comparison. Neither is a local measurement. Course §5.1 and *Inference Engineering* §1.4.1 both place P50 halfway through sorted requests. As an off-stage comparison, averaging positions 50 and 51 gives 200 ms for A but $(250+400)\div2=325$ ms for B. The stage uses the stated rank method for both batches. Other datasets and tools may interpolate P50, which this step does not cover.

**Next.** The two middle positions are visible. The next step compares request 99 in the same two sorted batches.

## Step 6 · Compare P99 in the same two batches

**One sentence.** P99 takes the E2E latency at request 99: 300 ms in A and 400 ms in B, while each batch's slowest request is 2000 ms.

**What the picture shows.** The sorted A and B panels keep the same bars and 0–2000 ms axis from Step 5. The animation first marks request 99 in A and its 300 ms P99, then the 1700 ms gap to A's slowest request. It repeats those measurements for B: P99 is 400 ms and the gap is 1600 ms. In each panel, 99 requests take at most the marked P99 value.

**Formula and symbols.** Using Step 5's rank method for batch $b\in\{A,B\}$:

$$L^b_{(1)}\le L^b_{(2)}\le\cdots\le L^b_{(N)},\qquad r=\lceil0.99N\rceil,\qquad \mathrm{P99}^b=L^b_{(r)}$$

- $b$: the batch label, A or B.
- $L^b_{(i)}$: the E2E latency of request $i$ in batch $b$ after sorting.
- $N$: the number of requests in each batch, 100.
- $r$: the position at 99% of the queue; $\lceil\ \rceil$ rounds up to an integer.
- $\mathrm{P99}^b$: the latency at position $r$, not an average and not necessarily the slowest request.

**Substitute the picture's numbers.**

$$\mathrm{P99}^A=L^A_{(\lceil0.99\times100\rceil)}=L^A_{(99)}=300\ \mathrm{ms}$$

$$\mathrm{P99}^B=L^B_{(99)}=400\ \mathrm{ms}$$

$$L^A_{(100)}-\mathrm{P99}^A=2000-300=1700\ \mathrm{ms}$$

$$L^B_{(100)}-\mathrm{P99}^B=2000-400=1600\ \mathrm{ms}$$

Zero-to-sglang Part I Chapter 5 §5.1 asks readers to observe P50 and P99 together, using P99 to examine slower requests. Section 5.2 uses 99 faster requests and one 2 s request to show how an average can hide that single slow request. Both distributions are constructed teaching examples, not local measurements. The course does not prescribe this rank formula; both panels round up as in Step 5. Other tools may interpolate, which this step does not cover.

**Next.** Both batches now show their middle and slower waits. The next step counts how many requests each batch completes during its whole test.

## Step 7 · Compare throughput from completed work

**One sentence.** Throughput divides completed requests by the whole-test duration, so A reaches 5 requests/s and B reaches 4 requests/s.

**What the picture shows.** Each panel has 100 request cells and a whole-test clock on the same 0–25 s axis. The client starts each test window at 0 s. A's cells turn blue in groups of 25 as its clock advances through 5, 10, 15 and 20 s. B then fills in groups of 20 through 5, 10, 15, 20 and 25 s. The shared axis leaves A's endpoint at 20 s and B's at 25 s. Even fills are a drawing simplification, not fixed completion gaps. A request completes when the client reads its final SSE delta. Requests overlap, so their E2E values from Steps 5 and 6 do not add up to either window. At 20 s, A has 100 completions and a throughput of $100\div20=5$ requests/s. At 25 s, B has 100 completions and $100\div25=4$ requests/s. Neither test window is one request's E2E latency.

**Formula and symbols.** For batch $b\in\{A,B\}$:

$$Q_b=\frac{N_{\mathrm{done},b}}{T_b}$$

- $b$: the batch label, A or B.
- $Q_b$: request throughput for batch $b$, the number of requests completed per unit time.
- $N_{\mathrm{done},b}$: completed requests during batch $b$'s whole test, 100 in both panels.
- $T_b$: whole-test duration from the client's test start to the last completion, 20 s for A and 25 s for B.
- $\mathrm{requests/s}$: completed requests per second; a `request` is one request from Steps 5 and 6.

**Substitute the picture's numbers.**

$$Q_A=\frac{100\ \mathrm{requests}}{20\ \mathrm{s}}=5\ \mathrm{requests/s}$$

$$Q_B=\frac{100\ \mathrm{requests}}{25\ \mathrm{s}}=4\ \mathrm{requests/s}$$

Zero-to-sglang Part I Chapter 5 §3.2 defines Throughput as output per unit time, allows `request/s` as its unit, and asks readers to observe it alongside latency. The 20 s and 25 s windows in `src/ml-sys/numbers.ts` are constructed teaching values. The same file derives both results from 100 completed requests. These are not local measurements and make no claim about actual SGLang performance. Each throughput is an average over its full window. This step covers request throughput only; `token/s`, Goodput, SLA, workload selection, warm-up and changing concurrency are left out. Chapter 14 addresses controlled profiling.

**Next.** The chapter has measured individual waits and completed work in two batches. The next chapter returns to the time before requests start to inspect what already occupies the GPU and how much space each part uses.
