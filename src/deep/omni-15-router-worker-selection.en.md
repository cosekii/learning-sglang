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
