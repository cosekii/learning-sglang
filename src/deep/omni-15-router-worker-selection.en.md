## Step 1 · One URL does not make workers interchangeable

**One sentence.** Two workers can share one router URL while only one accepts the request's input form.

### On the stage

- A `worker` is one Omni server the router can call. The `router` owns the shared URL and chooses a worker for each request.
- The request names model M and carries one image. Worker A accepts only text, so it cannot take this request. Worker B accepts image input and can take it.
- The dashed path to A is not a dispatch. It marks the choice that compatibility filtering must remove.
- The counts are two configured workers, one image request and one compatible worker. They are constructed, not a benchmark.

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
- The direct panel requires one concrete default model and equivalent generation profiles across the cohort. The router already knows that every eligible worker accepts the same contract, so it selects and then streams the body.
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

- A `health probe` is an HTTP GET to the worker's configured health URL. Any 2xx status counts as success. Another status, a transport error or a timeout counts as failure.
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
