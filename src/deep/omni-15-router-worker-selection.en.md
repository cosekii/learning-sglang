## Step 1 · One URL does not make workers interchangeable

**One sentence.** Two workers can share one router URL while only one accepts the request's input form.

### On the stage

- A `worker` is one Omni server the router can call. The `router` owns the shared URL and chooses a worker for each request.
- The request names model M and carries one image. Worker A accepts only text, so it cannot take this request. Worker B accepts image input and can take it.
- Both workers begin as candidates. The image check removes A and leaves one candidate. It then confirms B before the blue dispatch path appears. The dashed path to A is not a dispatch.
- The counts are two configured workers, one image request and one remaining compatible worker. They are constructed, not a benchmark.

### What compatibility means here

Compatibility starts with the worker's configured service profile, not its current speed. Later steps add health and active-request counts. A worker that is fast but cannot accept the input form is still not a candidate.

The router's typed-image integration test uses the same boundary: the image request reaches only the worker whose profile supports typed image input.

### Next

The router needs request facts before it can filter profiles. The next step shows when it can reuse a known contract and when it must classify the body.

Sources: `sglang_omni_router/tests/chat_http.rs:1075-1098`; `sglang_omni_router/src/worker_pool/mod.rs:338-373,544-578`.

## Step 2 · Learn routing facts before selection

**One sentence.** Homogeneous workers can share a direct routing contract; heterogeneous workers need the router to classify each request body first.

### On the stage

- `Classify` means reading the body for routing facts: model, content forms, input and output modalities, response format and stream mode. It does not mean full application validation.
- The direct panel requires one concrete default model and equivalent generation profiles across the worker group. A `generation profile` is a supported combination of request abilities. The router already knows that every eligible worker accepts the same requests, so it selects and then streams the body.
- The classified panel has different worker contracts. The router reads the body once, finishes classification, selects a worker, then forwards the original bytes.
- Both paths choose only after their routing facts are settled. The classified path does not hold an upstream connection while it classifies.

### Why two paths exist

Body classification has a memory and CPU cost. A homogeneous cohort can prove at startup that request content cannot change its compatible worker set, so it avoids that per-request work. Worker count alone does not decide the path.

The direct path does not skip compatibility or health. It reuses a proven shared contract, then applies the same health checks, selection policy and worker-load accounting.

### Next

The classified facts must match one worker profile. The next step shows why a worker cannot combine pieces from different profile rows.

Sources: `sglang_omni_router/src/http_generation/mod.rs:82-153`; `sglang_omni_router/src/http_generation/classify.rs:48-120`; `sglang_omni_router/src/worker_pool/mod.rs:804-840`.

## Step 3 · Require one complete profile row

**One sentence.** A worker is compatible only when one profile row satisfies every routing fact in the request.

### On the stage

- A `profile row` is one supported combination of model, modalities, response format and stream mode. It is not a menu from which the router may choose separate cells.
- The request needs model M, image input, WAV output and streaming. Model N is a different model.
- A's first row has M but accepts text and does not stream. A's second row has the requested media and stream mode but uses N. Neither row matches, so A has $0+0=0$ matching rows.
- B's single row contains all four facts, so B has one matching row. Extra capabilities on that row would also be allowed; missing required capabilities would not.

### The numbers on the stage

| Worker | Row 1 | Row 2 | Matching rows |
|---|---|---|---:|
| A | Misses input, output and stream facts | Misses model M | $0+0=0$ |
| B | Matches every fact | Not needed | $1$ |

The router uses an any-row check: one complete matching row is enough. It never takes a union across rows, because the worker did not advertise that combined execution path.

### Next

A compatible profile is static configuration. The next step adds the changing health signal that can temporarily remove a compatible worker.

Sources: `sglang_omni_router/src/worker_pool/profile.rs:754-904,1129-1131,1311-1334`.

## Step 4 · Filter by health

**One sentence.** A compatible worker enters selection only after enough consecutive successful health probes.

### On the stage

- A `health probe` is an HTTP GET to the worker's configured health URL. Any 2xx status, meaning every HTTP status from 200 through 299, counts as success. Another status, a transport error or a timeout counts as failure. A timeout means the worker has not replied by the probe deadline.
- Every worker starts `UNKNOWN`, which is not selectable. The left panel reaches `HEALTHY` after two consecutive 200 responses. The right panel reaches `UNHEALTHY` after three consecutive failures.
- Only `HEALTHY` enters selection. `UNKNOWN` and `UNHEALTHY` are both excluded.
- Two successes and three failures are shipped defaults, not fixed protocol rules. Operators can configure both thresholds.

### The numbers on the stage

| Probe result | Success streak | Failure streak | State |
|---|---:|---:|---|
| Start | 0 | 0 | UNKNOWN |
| 200 | 1 | 0 | UNKNOWN |
| 200 | 2 | 0 | HEALTHY |
| 503 after a separate start | 0 | 1 | UNKNOWN |
| Timeout | 0 | 2 | UNKNOWN |
| 503 | 0 | 3 | UNHEALTHY |

A success resets the failure streak to zero. A failure resets the success streak to zero. After a worker becomes unhealthy, one success leaves it unhealthy until the success threshold is reached. After it becomes healthy, one failure leaves it healthy until the failure threshold is reached.

Application responses do not directly set these states. A transport or protocol failure can request an immediate probe, but the ordinary probe thresholds decide health.

### Next

The remaining workers are compatible and healthy. The next step uses round robin to rotate through them without comparing active-request counts.

Sources: `sglang_omni_router/src/worker_pool/health.rs:10-17,211-308`; `sglang_omni_router/src/worker_pool/mod.rs:124-126`; `sglang_omni_router/src/config.rs:290-325`; `sglang_omni_router/src/http_relay/mod.rs:188-226`.

## Step 5 · Rotate with round robin

**One sentence.** Round robin selects the first eligible worker in one shared recency list and moves that worker to the back.

### On the stage

- A, B and C are compatible and healthy. The first three rows show the recency list before and after each selection: $[A,B,C]\rightarrow[B,C,A]\rightarrow[C,A,B]\rightarrow[A,B,C]$.
- The selected worker moves behind every other worker, including workers that are not eligible for the current request. The others keep their relative order.
- Six requests select A, B, C, A, B and C. None of the six has finished in this constructed example, proving that unfinished requests do not change round-robin turns.

### The sequence on the stage

$$\text{selections}=(A,B,C,A,B,C)$$

There is one recency list for the whole worker pool, not an independent cursor for each request type. A sparse set of eligible workers uses the same list, and skipped workers keep their relative order. If a scan finds no eligible worker, it returns no selection and does not rotate the list.

Round robin is the default routing policy. It rotates only among compatible healthy workers after the filters from Steps 3 and 4.

### Next

Rotation can send work to a worker with more active requests. The next policy, least requests, compares those counts and rotates only through workers tied at the minimum.

Sources: `sglang_omni_router/src/worker_pool/selection.rs:14-23,49-60`; `sglang_omni_router/src/worker_pool/mod.rs:1263-1356`; `sglang_omni_router/src/config.rs:262-276`.

## Step 6 · Choose the least active work

**One sentence.** Least requests selects among eligible workers with the smallest active count and rotates ties with the shared recency list.

### On the stage

- `Active requests` are selected responses that have not finished. These are the router's held admission credits, not GPU utilization or the worker's internal queue.
- This is a fresh example with initial recency (the turn order) $[A,B,C]$, not a continuation of Step 5. Each request holds two states. The row first reads A, B and C, finds the minimum and scans recency. It then writes the selected worker's before $\rightarrow$ after count and moves that worker to the back. The next row uses those updated values.
- B and C initially tie at zero, so recency selects B. C is then the unique minimum at zero. They tie at one in row 3, so B goes before C again.
- The separate rotated-tie card uses active counts $[2,1,1]$ with recency $[A,C,B]$. B and C tie at one, so C wins. This is not a fifth request in the sequence above.
- A has two active requests throughout and never enters the minimum set in these rows. With the same initial recency $[A,B,C]$ and loads $[2,0,0]$, round robin selects A, while least requests selects B.

### Formula and symbols

$$m=\min(L_A,L_B,L_C),\qquad \mathcal C=\{w\mid L_w=m\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $L_w$ | Active admission credits on worker $w$ | The row on the stage |
| $m$ | Smallest eligible active count | Calculated for each row |
| $\mathcal C$ | Workers tied at that minimum | Calculated for each row |

### The numbers on the stage

| Request | Loads A, B, C before | Minimum set | Choice | Loads after |
|---:|---|---|---|---|
| 1 | 2, 0, 0 | B and C | B | 2, 1, 0 |
| 2 | 2, 1, 0 | C | C | 2, 1, 1 |
| 3 | 2, 1, 1 | B and C | B | 2, 2, 1 |
| 4 | 2, 2, 1 | C | C | 2, 2, 2 |
| Separate rotated example | 2, 1, 1 | B and C | C | Not changed on the stage |

The selector lock covers recency, load observation and reservation, preventing two concurrent choosers from using the same stale counts. A speech batch uses item-weighted credits instead of one credit per envelope; the stage uses ordinary one-credit requests.

### Next

The count rises before dispatch. The next step follows the lease that keeps it held through response headers and releases it only at a terminal event.

Sources: `sglang_omni_router/src/worker_pool/mod.rs:565-605,1358-1439`; `sglang_omni_router/src/worker_pool/selection.rs:7-12`; `sglang_omni_router/src/worker_pool/admission.rs:49-88`.

## Step 7 · Hold active +1 until the response ends

**One sentence.** A `RequestLease` is a token that holds the chosen worker's active +1; response end, error, or cancellation releases it.

### On the stage

- This is a fresh single-request example. Selection changes the chosen worker's active count from 0 to 1 before dispatch, which means sending the request to that worker.
- Upload and response headers leave the count at 1. Headers begin the downstream response; they do not end the upstream work or release the lease.
- The release card covers response EOF, meaning the end of the response, an upstream error and downstream cancellation or another dropped response. Each path drops the lease once and returns the count to 0.
- One ordinary request holds one credit. A speech batch holds item-weighted credits, so three items add and later subtract 3.

### The numbers on the stage

| Boundary | Active count | Why |
|---|---:|---|
| Before selection | 0 | No worker lease exists |
| After selection, before dispatch | 1 | `RequestLease::new` adds one credit |
| Response headers arrive | 1 | The lease moves into `DirectResponseBody` |
| EOF, error or cancellation | 0 | Dropping the body drops the lease once |

The same lease owns admission permits and any optional WebSocket session permit. Dropping it releases those too. Cumulative dispatch counters remain unchanged; only active load decreases.

For HTTP, this active count is not a per-worker request cap. It feeds least-requests selection, while the worker still owns its execution and queue capacity.

### Next

The worker was healthy when its lease began, but a later failure can still truncate the response. The last step follows that boundary to the next chapter.

Sources: `sglang_omni_router/src/worker_pool/admission.rs:49-88`; `sglang_omni_router/src/http_relay/mod.rs:151-233`; `sglang_omni_router/src/http_relay/response_body.rs:16-101`; `sglang_omni_router/tests/chat_http.rs:901-939,1282-1336,1419-1432`.

## Step 8 · Selection does not prevent a later failure

**One sentence.** The router selects one compatible healthy worker, but it does not move that request to another worker if the selected worker fails mid-response.

### On the stage

- This is a new example with constructed loads, not a continuation of Step 6's final 2, 2, 2 or Step 7's fresh single request.
- A has the wrong profile, so it is not a candidate. B and C are compatible and healthy with active counts 2 and 1. Least requests selects C and increments C to 2 before dispatch.
- C then sends `200 OK` and `data: one` before a constructed reset, meaning the connection breaks. B remains healthy, but no path continues this response on B.
- C's selection-time health does not guarantee the whole response. A transport or body error can request an immediate health probe; later eligibility still waits for the configured thresholds.
- The question points at two separate boundaries: what this client receives, and when later selections can exclude C.

### The numbers on the stage

| Worker | Profile | Health at selection | Active before | Active after selection |
|---|---|---|---:|---:|
| A | Does not match | Not used | Not used | Not selected |
| B | Matches | HEALTHY | 2 | 2 |
| C | Matches | HEALTHY | 1 | 2 |

The upstream HTTP client disables retries, and the relay performs one send to the selected target. There is no alternate-dispatch loop. The response-body lease still terminates and releases its count, but that cleanup does not turn the partial response into a complete one.

### Next

The next chapter separates pre-commit errors from post-commit truncation, follows lease cleanup and health probes, and explains how a worker finishes existing work and exits.

Sources: `sglang_omni_router/src/worker_pool/resolver.rs:108-125`; `sglang_omni_router/src/http_relay/mod.rs:151-209`; `sglang_omni_router/src/http_relay/response_body.rs:38-72`; `sglang_omni_router/tests/chat_http.rs:1419-1432`.
