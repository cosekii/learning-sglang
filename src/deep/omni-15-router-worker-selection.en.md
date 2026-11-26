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
