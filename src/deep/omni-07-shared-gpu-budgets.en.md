## Step 1 · Build memory fractions from one card

> **In one sentence:** On a constructed 80-GiB card, 60 GiB of weights leave 20 GiB for KV, giving fractions of 75% and 25%.

### What the picture shows

- This is a constructed example, not a model configuration or a memory measurement. One outlined bar represents the same 80-GiB card throughout.
- The first held phase shows only the 80-GiB total. The second fills 60 GiB with blue weights. The third fills the remaining 20 GiB with the orange KV budget. The last phase divides both parts by the same total.
- KV stores previously computed token keys and values. `gpu_memory_fraction` means the bytes assigned to one purpose divided by total card bytes.
- The bar grows in place; these are not before-and-after result cards. Blue always means weights and orange always means the KV budget.

### Work through the numbers

Let card capacity be $C=80\,\mathrm{GiB}$ and weights be $W=60\,\mathrm{GiB}$. The remaining KV budget is:

$$K=C-W=80-60=20\,\mathrm{GiB}$$

The two fractions are:

$$f_W=\frac{W}{C}=\frac{60}{80}=0.75=75\%$$

$$f_K=\frac{K}{C}=\frac{20}{80}=0.25=25\%$$

They account for the whole constructed card:

$$f_W+f_K=75\%+25\%=100\%$$

| Symbol | Meaning | Source |
|---|---|---|
| $C$ | Total memory on the teaching card | Constructed value: 80 GiB |
| $W$ | Memory occupied by model weights | Constructed value: 60 GiB |
| $K$ | KV budget left after weights in this example | 80 GiB minus 60 GiB |
| $f_W$ | Weight bytes divided by card bytes | 60 divided by 80 |
| $f_K$ | KV-budget bytes divided by card bytes | 20 divided by 80 |

The subtraction is a teaching simplification with only weights and KV. A real card can have reserves and other consumers, so its unallocated bytes are not automatically one engine's KV pool.

### How this relates to placement

A real configuration declares `gpu_memory_fraction` for GPU-resident stages. `StagePlacementPlanner` collects the entries for each GPU, and `build_gpu_placement()` sums their fractions separately from KV bytes and reserve bytes. This constructed example explains what a fraction means; it does not claim that placement derives weights or KV by subtracting 60 from 80.

### Boundaries and sources

The 80, 60 and 20 GiB values are constructed for readable arithmetic. No B200, model checkpoint, token cap, `nvidia-smi` reading or runtime allocator is measured here. The example also leaves out reserves and other GPU consumers; Step 2 adds a reserve explicitly.

- `sglang_omni/config/placement.py:73-104`: per-stage GPU entries and plan construction.
- `sglang_omni/config/placement.py:111-119`: the configured fraction-limit check.
- `sglang_omni/config/placement.py:252-286`: separate same-GPU sums for fractions, KV bytes and reserves.

Line numbers refer to <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>.

### Next

Step 2 adds `total_reserve_bytes`. Fractions and bytes must meet in the byte domain; separate sums can look safe while their combination exceeds the card.

## Step 2 · Combine fractions and byte reserves before checking capacity

> **In one sentence:** On an 80-GiB teaching card, 50% plus 20 GiB fits, while 90% plus the same reserve declares 92 GiB and overflows by 12 GiB.

### What the picture shows

- Both panels use the same teaching card, scale and 20-GiB `total_reserve_bytes`. These are paired unit-test values, not B200 measurements.
- A neutral track with a solid outline spans 0–92 GiB, the larger combined declaration, so both panels share one scale. It is comparison space, not another memory allocation. The black dashed line marks the 80-GiB physical limit.
- The first held phase shows the fraction and reserve inputs, the declaration formula and that physical limit. The second converts the fractions into blue byte segments: 40 and 72 GiB. The third adds the same orange 20-GiB reserve to each panel and forms totals of 60 and 92 GiB. The last compares those totals with the limit and reveals the pass and reject outcomes.
- Blue is `total_gpu_memory_fraction × card_bytes`; orange is reserve. Panel borders stay neutral until the comparison phase, so they do not reveal the outcome early.
- The passing panel leaves $80-60=20$ GiB of headroom. The failing panel crosses the physical limit by $92-80=12$ GiB before startup.
- The test stage also declares a two-GiB KV pool inside its 20-GiB whole-stage reserve. That pool is not added to its own reserve again. A separate check ensures that summed KV pools alone fit.

### Work through the numbers

Let physical capacity be $C=80\,\mathrm{GiB}$. The total reserve is $R=20\,\mathrm{GiB}$.

Combined declared bytes are:

$$D=fC+R$$

For the passing fraction $f_p=0.50$:

$$D_p=0.50\times80+20=40+20=60\,\mathrm{GiB}$$

$$H=C-D_p=80-60=20\,\mathrm{GiB}$$

For the failing fraction $f_f=0.90$:

$$D_f=0.90\times80+20=72+20=92\,\mathrm{GiB}$$

$$O=D_f-C=92-80=12\,\mathrm{GiB}$$

| Symbol | Meaning | Source |
|---|---|---|
| $C$ | Teaching card's physical capacity | The test's monkeypatched 80 GiB |
| $R$ | Sum of same-GPU `total_reserve_bytes` | The test's 20 GiB |
| $f_p,f_f$ | Passing and failing total fractions | 0.50 and 0.90 in the tests |
| $D$ | Combined declaration in the byte domain | Fraction times card bytes, plus reserve |
| $H$ | Passing example's headroom | 80 minus 60 |
| $O$ | Failing example's overflow | 92 minus 80 |

The reserve represents the stage's whole footprint, not another copy of its KV pool. The separate two-GiB KV check passes because $2\leq80$, but that cannot cancel $D_f>C$.

### What the two checks do

When physical device bytes are available, `validate_gpu_capacity()` computes `declared = total_fraction × total_memory_bytes + total_reserve_bytes`. If a reserve exists and this sum exceeds the card, it raises before spawn.

It then checks whether `total_kv_cache_bytes` alone exceeds physical memory. This lower-bound check applies even when no stage declares a total reserve. If device metadata is unavailable, physical-capacity validation is skipped rather than inventing a capacity.

### Boundaries and sources

This step validates declared budgets before startup; it does not prove that runtime allocation can never OOM or measure a streaming buffer's peak. A useful `total_reserve_bytes` must cover the stage's real footprint. TP per-rank accounting and replica expansion are outside this figure.

- <code>tests/unit_test/<wbr>pipeline/<wbr>test_placement.py:125-177</code>: the 80-GiB card, fractions 0.90 and 0.50, 20-GiB reserve and two-GiB KV pool.
- `sglang_omni/config/placement.py:124-174`: combined-byte rejection and the independent KV lower-bound check.
- `sglang_omni/config/placement.py:252-286`: same-GPU reserve and KV summation.
- `docs/basic_usage/mps_dp.md:62-69`: pre-spawn byte validation and mutual exclusion of KV bytes and token caps.

Line numbers refer to <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>.

### Next

Step 3 follows one KV byte declaration into the stage factory. Exactly one engine must consume it: neither zero nor two consumers is valid.

## Step 3 · A KV byte budget has exactly one consumer

> **In one sentence:** After a stage declares a two-GiB KV pool, zero or two consuming engines fail, while exactly one consumer honors the declaration.

### What the picture shows

- The three panels are independent alternatives, not three moments in one run and not three engines sharing one scope. Each has its own scope with the same teaching declaration: `engine.kv_cache_bytes=2 GiB`. A KV cache stores previously computed token keys and values.
- The first held phase shows `consumed=false` and dashed unconsumed boxes. The second phase lets the first engine in the one-engine and two-engine panels claim the blue two-GiB pool, changing their flags to `consumed=true`. The zero-engine panel stays unclaimed.
- The third phase tests the two failure branches: the empty case reaches its cleanup check, and a second orange engine attempts to claim the same declaration in the two-engine panel. The last phase shows the zero-consumer error, the one-consumer startup and the second-consumer error.
- The orange second card is a rejected attempt, not another funded pool. In the two-engine panel, `consumed=true` records the first claim even though the second call raises.
- This is startup configuration delivery, not request-time sharing of one KV pool among engines.

### Work through the numbers

Let declared bytes be $B=2\,\mathrm{GiB}$. The number of consuming engines is $n$.

The valid condition is:

$$n=1$$

The valid delivered budget is:

$$D=nB=1\times2=2\,\mathrm{GiB}$$

The two teaching failures are:

$$n=0\Rightarrow\text{unconsumed budget error}$$

$$n=2\Rightarrow\text{second consumption error}$$

| Symbol | Meaning | Source |
|---|---|---|
| $B$ | One engine KV pool declared by the stage | Teaching value of two GiB |
| $n$ | Engines attempting consumption in one scope | Zero, one and two across the panels |
| $D$ | KV bytes delivered in the valid case | One engine times two GiB |
| consumed | Whether engine construction claimed the budget | `StageKvBudget.consumed` |

Rejecting $n=2$ does not wait to compute $2B=4\,\mathrm{GiB}$ and compare it with the card. It fails at the second claim, preventing one declaration from funding two full pools.

### How the scoped handoff works

`stage_kv_cache_budget()` stores a `StageKvBudget` in thread-local state around one stage-factory invocation. Its `finally` clears the active budget, then scope exit checks `consumed`; an unconsumed declaration raises.

`consume_stage_kv_cache_bytes()` reads the budget at the SGLang infrastructure engine-construction choke point. The first call marks it consumed and returns the bytes; a second call raises. This avoids adding another keyword argument through every model factory.

### Boundaries and sources

This step does not expand byte-to-token conversion. It also does not combine `max_total_tokens` with `kv_cache_bytes`: the documentation makes them mutually exclusive on one stage. Scopes cannot nest, an additional error branch not drawn here.

- <code>sglang_omni/scheduling/<wbr>stage_kv_budget.py:20-31</code>: the budget record, consumed flag and thread-local storage.
- <code>sglang_omni/scheduling/<wbr>stage_kv_budget.py:34-64</code>: one factory scope, nesting rejection, cleanup and zero-consumer failure.
- <code>sglang_omni/scheduling/<wbr>stage_kv_budget.py:67-88</code>: first consumption and second-consumer failure.
- `docs/basic_usage/mps_dp.md:62-69`: per-stage KV bytes and mutual exclusion with `max_total_tokens`.

Line numbers refer to <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>.

### Next

Step 4 replicates a serving process on one GPU. Weights can be aliased through CUDA IPC, but each replica still needs its own KV budget.

## Step 4 · Shared weights do not mean shared KV pools

> **In one sentence:** Two same-GPU replicas can alias one checkpoint while retaining two private KV pools, each capped explicitly at 30,000 tokens.

### What the picture shows

- Both panels show the same two replicas with identical symbolic boxes. W means saved model weights from one checkpoint; KV is one replica-private token pool. The left `weight_share=off` panel stays as the two-W, two-KV counting baseline.
- On the right, the first held phase assigns replica 0 as leader and replica 1 as follower. Dashed slots mean that neither has loaded W yet. The shipped MOSS config uses `max_total_tokens=30000`, not Step 3's `engine.kv_cache_bytes`; the two settings are mutually exclusive. The first `now` line compares 30,000 with 30 × 1,000-token prompts only to give the number a size. It does not promise 30 concurrent prompts.
- The second phase fills the leader's slot with one blue W. The third draws the blue CUDA IPC arrow: handles let the follower open the leader's GPU storage. The fourth replaces the follower's dashed slot with `alias · follower`, meaning the same W without a second copy.
- The fifth phase builds two separate orange KV pools, each labeled 30,000. It does not reveal the arithmetic yet. These pools are not aliased.
- The sixth phase only reveals the counts and arithmetic: `1 W + 2 KV`, `2 W → 1 W` and the combined 60,000-token cap.
- The blue swatch means weights and their CUDA IPC handoff, the orange swatch means private KV, and a dashed slot means no W has appeared there yet. CUDA graphs and request state also remain private, but are named only in the footnote rather than drawn as extra budget boxes.
- W is symbolic and has no claimed GB value. The figure therefore shows one fewer checkpoint copy, not a fixed byte or percentage saving.

### Work through the numbers

Let replica count be $N=2$, independent checkpoint copies be $W_{off}=2$, and shared checkpoint copies be $W_{on}=1$:

$$S_W=W_{off}-W_{on}=2-1=1$$

The private KV-pool count remains:

$$N_{KV}=N=2$$

With $T=30000$ tokens per pool, the combined cap is:

$$T_{all}=NT=2\times30000=60000\ \mathrm{tokens}$$

| Symbol | Meaning | Source |
|---|---|---|
| $N$ | Same-GPU serving replicas | DP2 in the MOSS example |
| $W_{off}$ | Symbolic independent checkpoint copies | One for each of two replicas |
| $W_{on}$ | Shared checkpoint storage copies | One leader export and one follower attachment |
| $S_W$ | Checkpoint copies removed | Two minus one |
| $N_{KV}$ | Private KV pools | One for each replica |
| $T,T_{all}$ | Per-pool and combined token caps | 30,000, and two times 30,000 |

The combined 60,000-token cap is arithmetic across independent pools, not one shared pool that gives a single request 60,000 consecutive tokens.

### Implementation details · not drawn

The planner groups replicas of one logical Process that resolve to one physical GPU. The lowest replica index leads, the others follow, and TP processes are skipped. These planning rules are not separate stage objects.

The leader publishes CUDA IPC handles for every parameter and buffer. The follower aliases those parameters and buffers onto leader storage by assignment, not by copying them. KV caches, CUDA graphs and sampler state remain private. Tensors classified as replica-private are also excluded from aliasing. The figure uses one symbolic W instead of drawing individual tensors.

The follower builds the same module tree with dummy weights before attachment, and assignment releases that dummy storage. These operations are not separate objects or phases on the stage.

Weight sharing requires exactly one SGLang engine stage in the process and an explicit positive `max_total_tokens`. A follower frees dummy weights before KV profiling, so deriving its pool cap from available memory would be unstable. The planner rejects a missing cap before the leader loads a full checkpoint.

### Boundaries and sources

This step does not claim higher throughput or better scheduling; the documentation says weight sharing saves memory and does not itself improve scheduling. The leader must outlive its followers, and replicas should restart together. Architecture allowlists, private-tensor auditing, handle lifetime and graph-capture verification are outside the figure.

- <code>docs/basic_usage/<wbr>process_topology.md:234-276</code>: MOSS same-GPU DP2, the 30,000-token cap, `--weight-share on` and private follower state.
- <code>sglang_omni/pipeline/<wbr>weight_share.py:93-133</code>: same-GPU groups and leader/follower assignment.
- <code>sglang_omni/pipeline/<wbr>weight_share.py:182-230</code>: candidate-group collection and TP exclusion.
- <code>sglang_omni/pipeline/<wbr>weight_share.py:233-287</code>: exactly-one-engine and explicit-positive-token-cap validation.
- <code>sglang_omni/utils/<wbr>ipc_weights.py:1-35</code>: CUDA IPC aliases, private KV/graphs/sampler state and lifetime constraints.
- <code>sglang_omni/utils/<wbr>ipc_weights.py:658-746</code>: the leader's per-tensor handle publication and atomic export.
- <code>sglang_omni/utils/<wbr>ipc_weights.py:939-997,1079-1265</code>: follower attachment, assignment instead of copy and private-tensor handling.

Line numbers refer to <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>.

### Next

Step 5 enables MPS. It manages process attachment for execution and leaves the earlier memory declarations unchanged.

## Step 5 · MPS manages process execution, not memory arithmetic

> **In one sentence:** Two eligible single-GPU, non-TP processes can join one pipeline MPS lease on a physical GPU; a TP process does not join.

### What the picture shows

- MPS is a CUDA service that shares GPU execution among processes. The initial phase reads each process's GPU placement and TP setting. Two constructed processes use GPU 0, worker-local `cuda:0`, and no TP. The other two inputs are a TP process and a process placed on GPU 0 plus GPU 1.
- The second phase keeps GPU-placed, non-TP candidates and removes the orange TP process, leaving zero eligible TP clients. TP means tensor parallel. Blue marks the objects in this pipeline's MPS path: eligible processes, their GPU group, the lease, and the joining arrows. Orange marks an excluded process, and a dashed outline means that an object or result has not arrived yet.
- The third phase resolves physical GPU IDs. Both eligible processes resolve to `GPU-A`, a teaching label for one physical card. The code calls this physical ID a UUID. The multi-GPU input resolves to two physical IDs, so the stage rejects it before any lease. This is the same resolution order as the implementation.
- The fourth phase groups the two eligible processes on `GPU-A`. The code calls this object a `PhysicalMpsPlan`. The visible `2 ≥ 2` check meets this example's two-process minimum.
- The fifth phase creates one blue lease for this pipeline on `GPU-A`. The lease is this pipeline's key for later MPS checks and cleanup. It records this pipeline's ownership of its MPS runtime, not ownership of the whole GPU. It neither allocates memory nor creates one lease per client.
- The sixth phase draws both joining arrows and reveals name tags `t0` and `t1`. The code calls these unique per-process values tokens. The service now has two joined processes, but startup has not checked them yet.
- The seventh phase matches `t0 → process 0` and `t1 → process 1` on the stage. The runtime compares each expected process token with the daemon's current clients. Both matches must exist before attachment verification succeeds. This check prevents a process from silently falling back to ordinary time slicing.
- The bottom line carries process 0's two-GiB KV declaration from Step 3 through the lease and the final check. The final `2 GiB before → 2 GiB after` uses the same declaration on both sides. MPS changes execution sharing, not that declaration. The two-GiB value remains a teaching value and is not added to a reserve again.

### Work through the numbers

This example uses `mps=auto`; that setting name stays off the stage. Let eligible clients on `GPU-A` be $N_c=2$, and auto's minimum be $N_{min}=2$:

$$N_c=2\geq N_{min}=2\Rightarrow\text{create one physical MPS plan}$$

Each managed physical GPU has one lease for this pipeline:

$$N_{lease}=1$$

The eligible TP-client count in this example is:

$$N_{TP}=0$$

Process 0 keeps the same teaching KV declaration before and after MPS:

$$K_{before}=K_{after}=2\ \mathrm{GiB}$$

| Symbol | Meaning | Source |
|---|---|---|
| $N_c$ | Eligible clients on this physical GPU | Two constructed processes |
| $N_{min}$ | Minimum clients for `mps=auto` | Two in the runtime |
| $N_{lease}$ | This pipeline's leases on the card | One acquire per UUID |
| $N_{TP}$ | Eligible TP clients in this example | TP is excluded during candidate collection |
| $K_{before},K_{after}$ | Process 0's KV declaration before and after MPS | The same two-GiB teaching value as Step 3 |

One lease here does not mean only one pipeline can use the machine. Separate serve commands can join the same physical GPU's daemon with their own ownership records; the last owner leaving drains it. This figure shows one pipeline.

### Mode boundary · not drawn

`auto` requires at least two eligible processes on a physical GPU; one client runs without MPS. `on` can enable a single eligible process, but no eligible physical plan, an unsupported platform, or incomplete physical mapping is a hard error. The stage plays only the two-process `auto` example and does not compare these modes visually.

### Implementation details · not drawn

Startup acquires each GPU transactionally and rolls back earlier leases in reverse order after a failure. The figure plays the name-tag match inside `verify()`, but not its live-lease check, polling, or PID-level snapshot. It does not play rollback, shutdown draining, or daemon cleanup.

### Boundaries and sources

Whether MPS is faster depends on overlappable GPU work; no performance measurement is made here. Pipeline-edge transport does not participate in eligibility. Conflicting `CUDA_VISIBLE_DEVICES`, external MPS pipe, and manually supplied weight-share environment settings are not expanded.

- <code>docs/basic_usage/<wbr>mps_dp.md:11-49</code>: on/auto rules, one-physical-GPU restriction, and UUID-keyed daemon sharing.
- <code>docs/basic_usage/<wbr>mps_dp.md:71-97</code>: client verification, watchdog, shutdown, and dirty-state behavior.
- <code>sglang_omni/mps/<wbr>runtime.py:81-178</code>: TP exclusion, physical UUID resolution, and multi-GPU-process rejection.
- <code>sglang_omni/mps/<wbr>runtime.py:182-279</code>: UUID grouping, auto's two-client minimum, and physical plans.
- <code>sglang_omni/mps/<wbr>runtime.py:390-492</code>: transactional acquisition, rollback, client tokens, and verification inputs.
- <code>sglang_omni/mps/<wbr>manager.py:125-255</code>: daemon creation or joining and the pipeline's owner lease.
- <code>sglang_omni/mps/<wbr>manager.py:440-478,784-802</code>: current-client snapshots, per-process token matching, and successful attachment verification.

Line numbers refer to <code>origin/main@<wbr>db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6</code>.

### Next

Step 6 uses a different memory strategy: instead of adding replicas, AuK wakes its three components in sequence and keeps only the current one resident.

## Step 6 · AuK serial offload reduces simultaneous residency

> **In one sentence:** One request moves through conditioning, DiT and VAE with one component resident and two sleeping, releasing ownership only after terminal delivery.

### What the picture shows

- AuK serial offload keeps component weights on the host and restores them to the GPU when needed. Offload means moving weights out and back, not moving the computation onto the CPU.
- Request A acquires ownership at conditioning. The three frames represent the GPU stages: blue marks the resident component and grey marks the two sleeping components.
- Every transition calls `sleep()` on the old component before `wake()` on the next. Sleeping releases physical GPU pages; waking restores weight values from the host copy while virtual storage addresses remain stable.
- B waits while A owns the path. Only after A's terminal decode result is delivered does the coordinator release ownership, allowing B to begin conditioning.
- The VAE can remain resident after decoding, as the documentation specifies. The third frame depicts residency during that computation and does not predict a later transition.

### Work through the numbers

There are $C=3$ components and $R=1$ resident component after each transition, so the sleeping count is:

$$S=C-R=3-1=2$$

Request ownership is $O=1$, and the configuration fixes:

$$B_{max}=1,\qquad N_{process}=1,\qquad TP=1$$

| Symbol | Meaning | Source |
|---|---|---|
| $C$ | Components participating in serial offload | Conditioning, DiT and VAE |
| $R$ | GPU-resident components after a switch | One `resident_component` in the coordinator |
| $S$ | Currently sleeping components | Three minus one |
| $O$ | Requests owning the AuK path | One coordinator owner |
| $B_{max}$ | Offload-mode batch cap | Forced to one by configuration |
| $N_{process},TP$ | Process replicas and tensor-parallel size | Both forced to one |

Two sleeping components is a count, not a byte ratio. Their weight sizes differ, so $S/C=2/3$ does not prove a two-thirds memory saving.

### Why ownership lasts through result delivery

`begin()` makes conditioning wait for an existing owner and checks that later stages belong to the same request and expected phase. `finish()` advances conditioning → auk_engine → decode → result, or releases ownership after failure, cancellation or shutdown.

The scheduler synchronizes its CUDA stream after compute and before `finish()`, preventing a transition or release while computation still writes memory. `claim_result()` verifies continuing ownership. `release_result()` releases it only for a delivered terminal result, so B cannot enter while A's result is still undelivered.

### Boundaries and sources

Serial offload requires the standard linear pipeline, one shared CUDA GPU, one process, one process replica, TP1 and batch size one, with all three GPU stages enabled together. Weights default to `mmap`; host RAM or a writable cache can be configured. Transition delays and performance gains require measurement and are not claimed here.

- `docs/cookbook/auk.md:138-149`: launch flags, single-request restrictions, resident VAE and weight sources.
- `sglang_omni/models/auk/config.py:112-185`: joint enablement, one GPU and process, one replica, TP1, batch1 and linear-graph validation.
- `sglang_omni/models/auk/serial_offload.py:27-100`: owner, phase, waiting, begin/finish and stage advancement.
- `sglang_omni/models/auk/serial_offload.py:115-172`: delivery-triggered release, owner cleanup and sleep-before-wake.
- `sglang_omni/models/auk/offload_scheduler.py:37-69`: synchronization after compute and before finish.
- `sglang_omni/scheduling/stage_residency.py:78-168`: stable addresses, physical-page pause and host-copy restoration.

Line numbers refer to `origin/main@db7cbf39ccffde7f95b81c2dcc7da1b52a5c0bb6`.

### Next

This chapter has established the budget boundaries for fractions, reserves, KV, shared weights, MPS and serial offload. The next chapter puts configuration changes back on a timeline to measure where first sound and stalls actually change.
