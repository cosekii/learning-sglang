## Step 1 · Measure the wait before serving starts

**One sentence.** The public log waits 21.600474 seconds for SGLang readiness, then starts HTTP another 0.847491 seconds later.

### On the stage

- The timestamps mark the first wait for `sglang0`, the `sglang0 is ready` message, and HTTP startup on `:8080`.
- Blue marks worker startup and orange marks the HTTP service. Here, `ready` means that the worker has finished startup and can participate in computation.
- Adjacent timestamps give both time differences. The final value runs from the first log line to HTTP startup.

### Formula and symbols

$$W_{\mathrm{ready}}=t_{\mathrm{ready}}-t_{\mathrm{wait}},\qquad W_{\mathrm{http}}=t_{\mathrm{http}}-t_{\mathrm{ready}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $t_{\mathrm{wait}}$ | Time of the first waiting log | Public log, 20:32:52.029318 |
| $t_{\mathrm{ready}}$ | Time of the worker-ready log | Public log, 20:33:13.629792 |
| $t_{\mathrm{http}}$ | Time of the HTTP-start log | Public log, 20:33:14.477283 |
| $W_{\mathrm{ready}}$ | Wait for worker readiness | Subtracted in this step |
| $W_{\mathrm{http}}$ | Wait from readiness to HTTP startup | Subtracted in this step |
| $W_{\mathrm{total}}$ | Total wait from the first log to HTTP startup | Added in this step |

### The numbers on the stage

$$W_{\mathrm{ready}}=21.600474\ \mathrm{s},\qquad W_{\mathrm{http}}=0.847491\ \mathrm{s}$$

$$W_{\mathrm{total}}=21.600474+0.847491=22.447965\ \mathrm{s}$$

`src/ml-sys/numbers.ts` stores microseconds relative to the first log line. The component divides by $1{,}000{,}000$ to obtain seconds. The caption rounds to two decimal places, while the stage and this section retain six.

The article records one single-node startup. It does not establish a normal startup time or a multi-node speedup. This step uses the log only to separate worker readiness from HTTP listening.

### Next

How does the launch configuration join two machines into one service? The next step draws their roles.

Sources: `Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:69-88`; `lib/llm/src/engines/sglang/worker.rs:341-343` and `launch/dynamo-run/src/lib.rs:407-410` at `ai-dynamo/dynamo@670661f6`.

## Step 2 · Two nodes use different request inputs

**One sentence.** The public config shares one model and `dist-init-addr` across two nodes, with `in=http` on node 0 and `in=none` on node 1.

### On the stage

- A `node` is one machine in this experiment. `node-rank 0` and `node-rank 1` identify the two machines in the configuration.
- `--num-nodes 2` declares the node count. Both sides also use one model directory and one `dist-init-addr`, the shared meeting address for distributed initialization.
- Both commands select the SGLang backend with `out=sglang`. Node 0 opens HTTP input with `in=http`. Node 1 uses `in=none`, so it has no second HTTP input while its worker process keeps running.
- `<model>` and `<node0-ip>` are placeholders, not the article's local path and IP address.

### Formula and symbols

$$N_{\mathrm{node}}=2,\qquad r_{\mathrm{node}}\in\{0,1\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $N_{\mathrm{node}}$ | Nodes in this experiment | Public `--num-nodes 2` setting |
| $r_{\mathrm{node}}$ | Identifier of the current node | Public `--node-rank 0` or `1` setting |

### The numbers on the stage

Node 0 uses `in=http` and `node-rank 0`; node 1 uses `in=none` and `node-rank 1`. Both commands set `num-nodes` to 2 and must refer to the same model and meeting address for this experiment.

At the fixed commit, Dynamo assembles `num_nodes`, `node_rank` and `leader_addr` into `MultiNodeConfig`, then passes them to SGLang as `nnodes`, `node_rank` and `dist_init_addr`. `Input::Http` runs the HTTP service, while `Input::None` only waits. The code also forces nonzero ranks to `Input::None`, so the second node is not a separate HTTP service for clients.

### Next

The two machines have distinct input roles. The next step opens `--tensor-parallel-size 8` to show where its eight workers run.

Sources: `Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:97-106`; `launch/dynamo-run/src/lib.rs:235-250,407-443`, `lib/llm/src/engines/sglang/subprocess.rs:59-65` and `lib/llm/src/engines/sglang/sglang_inc.py:43-48` at `ai-dynamo/dynamo@670661f6`.

## Step 3 · Eight TP workers span two nodes

**One sentence.** `--tensor-parallel-size 8` assigns eight workers to one model's computation, with four workers launched on each node in this config.

### On the stage

- `Tensor parallel`, abbreviated TP, splits one model's computation across workers. Each blue box is one TP worker.
- Node 0 holds TP ranks 0–3 and node 1 holds TP ranks 4–7. These global worker identifiers differ from Step 2's `node-rank` values.
- Both nodes use `--tensor-parallel-size 8`. The flag counts the whole TP group, not eight workers per node.
- The bottom derives four workers per node with $8÷2=4$. This chapter does not repeat TP matrix partitioning; Chapter 4 showed why these workers exchange tensors.

### Formula and symbols

$$W_{\mathrm{node}}=\frac{N_{\mathrm{TP}}}{N_{\mathrm{node}}},\qquad R_r=\{rW_{\mathrm{node}},\ldots,(r+1)W_{\mathrm{node}}-1\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $N_{\mathrm{TP}}$ | Workers in the whole TP group | `--tensor-parallel-size 8` |
| $N_{\mathrm{node}}$ | Number of nodes | Step 2: 2 |
| $W_{\mathrm{node}}$ | Workers launched on each node | Calculated in this step |
| $r$ | Current node identifier | Step 2: 0 or 1 |
| $R_r$ | Global TP ranks on node $r$ | Expanded from the source formula here |

### The numbers on the stage

$$W_{\mathrm{node}}=8÷2=4$$

$$R_0=\{0,1,2,3\},\qquad R_1=\{4,5,6,7\}$$

At the fixed commit, `worker.rs` computes `tp_size_per_node = tp_size / num_nodes`, uses it to derive `tp_rank_start` and `tp_rank_end`, and starts one SGLang subprocess for every TP rank in that range. `sglang_inc.py` also requires TP ranks to be globally unique across nodes.

The two complete public commands can be written with placeholders as follows. Model, TP size, node count and meeting address match; only the input mode and `node-rank` differ.

```bash
# node 0
dynamo-run in=http out=sglang --model-path <model> \
  --tensor-parallel-size 8 --num-nodes 2 --node-rank 0 \
  --dist-init-addr <node0-ip>:9876

# node 1
dynamo-run in=none out=sglang --model-path <model> \
  --tensor-parallel-size 8 --num-nodes 2 --node-rank 1 \
  --dist-init-addr <node0-ip>:9876
```

### Next

Where does the HTTP input appear while all eight workers start? The next step combines local readiness checks with log-based debugging.

Sources: `Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:97-106`; `lib/llm/src/engines/sglang/worker.rs:283-343` and `lib/llm/src/engines/sglang/sglang_inc.py:79-89` at `ai-dynamo/dynamo@670661f6`; `zero-to-sglang/course-material/ch/part3/第4章_横向扩展.md:19-34`.

## Step 4 · Preflight checks and local readiness

**One sentence.** Check the model, versions and meeting address first; each node then waits for four local workers, with worker processes and logs guiding failures.

### On the stage

- The top row is the `preflight`, checks before startup: use one model, keep software versions compatible and reach the shared `dist-init-addr`. This is an experiment checklist, not a check that Dynamo performs automatically.
- Each node retains Step 3's four TP workers. Labels `r0 ✓` through `r7 ✓` mark workers that have signaled readiness.
- Node 0 enters HTTP input after local readiness. Node 1 stays at `in=none` while its workers join the same TP group.
- The bottom records the old guide's limitation: if an SGLang worker fails during initialization, `dynamo-run` may exit silently. Without readiness, inspect worker processes and logs instead of watching only the HTTP port.

### Formula and symbols

$$N_{\mathrm{ready},0}=|R_0|=4,\qquad N_{\mathrm{ready},1}=|R_1|=4$$

| Symbol | Meaning | Source |
|---|---|---|
| $R_0,R_1$ | TP rank sets on the two nodes | Step 3 |
| $N_{\mathrm{ready},0}$ | Ready local workers on node 0 | Readiness check in this step |
| $N_{\mathrm{ready},1}$ | Ready local workers on node 1 | Readiness check in this step |
| $|R_r|$ | Number of ranks in set $R_r$ | Step 3: four in each set |

### The numbers on the stage

$$N_{\mathrm{TP}}=N_{\mathrm{ready},0}+N_{\mathrm{ready},1}=4+4=8$$

At the fixed commit, the source says that these SGLang workers must all start together. Each node's `SgLangWorker::start` waits for every ready notification in its local `process_group`; node 0 runs `Input::Http` only after `make_engine` returns. Its HTTP log therefore proves that its local startup path reached HTTP, but it does not prove that the other node can answer a request correctly.

Zero-to-sglang's deployment chapters check the model, hardware and version before inspecting processes, logs and a minimal request. This chapter applies that order to the multi-node experiment without treating a single-node recipe as multi-node validation.

### Next

After checking processes and readiness logs, send a minimal HTTP request to test the whole path.

Sources: `Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:130-132`; `lib/llm/src/engines/sglang/worker.rs:305-343` and `launch/dynamo-run/src/lib.rs:253-270,407-443` at `ai-dynamo/dynamo@670661f6`; `zero-to-sglang/course-material/ch/part4/第1章_用Cookbook部署SGLang.md:17-24,48-98`.

## Step 5 · Check one answer with a short request

**One sentence.** Send node 0 a request capped at eight new tokens; returned answer text shows that the path can complete one service round trip.

### On the stage

- The client on the left runs in another terminal. Its request contains a model name, one user question and `max_completion_tokens 8`, which limits generation to at most eight new tokens.
- The request goes only to node 0 at `HTTP :8080`. This is Step 2's `in=http out=sglang` entrance, not another entrance on node 1.
- The orange return arrow is the HTTP response. The bottom checks `choices[0].message.content` for answer text.
- `<model>` is a placeholder. Eight is this chapter's teaching cap for a short request, not a Dynamo default or the public example's output length.

### Formula and symbols

$$N_{\mathrm{req}}=1,\qquad N_{\mathrm{new}}\le C_{\mathrm{smoke}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $N_{\mathrm{req}}$ | Requests sent for this check | This step: 1 |
| $N_{\mathrm{new}}$ | New tokens actually generated by the service | Counted after the request completes |
| $C_{\mathrm{smoke}}$ | Generation cap for this short request | `numbers.ts`: 8 |

### The numbers on the stage

$$N_{\mathrm{req}}=1,\qquad N_{\mathrm{new}}\le8$$

The following request adapts the public example. Replace `<node0-ip>` and `<model>` with the experiment's values; the model name must match the name registered at startup.

```bash
curl --fail-with-body http://<node0-ip>:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "<model>",
    "messages": [{"role": "user", "content": "What is the capital of South Africa?"}],
    "max_completion_tokens": 8
  }'
```

The public guide shows a request and JSON response on this path. Zero-to-sglang recommends checking the answer field and states that one success proves neither high-concurrency performance nor model quality. This step only shortens generation for a connectivity check; the public example's token counts are not results from this multi-node experiment.

### Next

The answer has returned. The next step opens the path to show how text becomes tokens, reaches all eight workers and returns to the client.

Sources: `Awesome-ML-SYS-Tutorial/sglang/nvidia-dynamo/dynamo.md:85-95`; `launch/dynamo-run/src/input/http.rs:43-47,95-108` at `ai-dynamo/dynamo@670661f6`; `zero-to-sglang/course-material/ch/part4/第1章_用Cookbook部署SGLang.md:64-83`.

## Step 6 · Input and output for one request

**One sentence.** Node 0 turns text into token IDs, the client request enters the TP group through rank 0, and all eight workers compute before the answer returns.

### On the stage

- The top row is the blue input path: the client question reaches node 0's HTTP entrance, text becomes token IDs, rank 0's scheduler receives them, and the eight-worker TP group computes.
- The bottom row is the orange output path: the TP group produces new token IDs, rank 0 returns them to the response pipeline, and the client receives text in an HTTP response.
- `Rank 0` is a global TP worker identifier, not a node-rank. Step 3 placed r0–r3 on node 0 and r4–r7 on node 1.
- The phone layout draws node 0 twice for its input and output stages. Both rows use the same client entrance and worker group.

### Formula and symbols

$$r_{\mathrm{in}}=0,\qquad R_{\mathrm{compute}}=R_0\cup R_1=\{0,1,\ldots,7\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $r_{\mathrm{in}}$ | TP rank receiving this client input | Fixed-version configuration: 0 |
| $R_{\mathrm{compute}}$ | Ranks participating in this TP computation | Step 3 |
| $R_0,R_1$ | Rank sets on the two nodes | Step 3: four each |

### The numbers on the stage

$$r_{\mathrm{in}}=0,\qquad R_{\mathrm{compute}}=\{0,1,2,3\}\cup\{4,5,6,7\}$$

At the fixed commit, the HTTP pipeline links the preprocessor, backend and SGLang engine. The engine's input loop takes token IDs, constructs a request and sends it through a local ZMQ socket to rank 0's scheduler. Its output loop reads rank 0's scheduler output and forwards new token IDs to the response pipeline. ZMQ is a socket for messages between processes; Ch. 9 Steps 6–9 in the first book showed these input and output channels.

The multi-node configuration also says that nonzero nodes receive work from the leader through PyTorch distributed rather than directly from the user. All eight TP workers exchange tensors as they compute; Chapter 4 Steps 4 and 6 covered the communication backend and a Ring teaching example. This picture omits serialization, socket buffering and HTTP stream chunking.

### Next

The request's location can now be followed. The next step places timers on this path to check the wait before token one, later generation and the whole request.

Sources: `launch/dynamo-run/src/input/http.rs:85-104`, `launch/dynamo-run/src/lib.rs:235-250` and `lib/llm/src/engines/sglang/worker.rs:425-443,588-758` at `ai-dynamo/dynamo@670661f6`; Ch. 9 Steps 6–9 in the first book; Chapter 4 Steps 4 and 6 in this book.

## Step 7 · Check the waits at the client

**One sentence.** The client measures TTFT from request submission to token 1, then adds three later gaps to get E2E.

### On the stage

- The client sends the request at 0 ms, receives token 1 at 250 ms and receives the last token at 325 ms. Orange marks token arrivals; blue marks measured time spans.
- The first span is TTFT: 250 ms. Three ITL gaps follow token 1: 25, 20 and 30 ms, totaling 75 ms.
- Four output tokens fit Step 5's cap of eight. The token count and every timestamp reuse Chapter 1's constructed teaching example; they are not measurements from Dynamo serving this request.
- Both timers sit at the client. They check the wait before token 1, later generation and the whole request, but cannot split 250 ms into network, queue, prefill and TP communication time.

### Formula and symbols

$$\mathrm{E2E}=t_4-t_0=\mathrm{TTFT}+\sum_{i=2}^{4}\mathrm{ITL}_i$$

| Symbol | Meaning | Source |
|---|---|---|
| $t_0$ | Time when the client sends the request | Chapter 1 constructed example: 0 ms |
| $t_4$ | Time when the client receives token 4, the last token | Chapter 1 constructed example: 325 ms |
| $\mathrm{TTFT}$ | Wait from request submission to token 1 at the client | Chapter 1 Step 1: 250 ms |
| $\mathrm{ITL}_i$ | Gap between adjacent output tokens at the client | Chapter 1 Step 2: 25, 20 and 30 ms |
| $\mathrm{E2E}$ | Whole wait from request submission to the last token | Chapter 1 Step 4 |

### The numbers on the stage

$$\mathrm{TTFT}=250-0=250\ \mathrm{ms}$$

$$\sum_{i=2}^{4}\mathrm{ITL}_i=25+20+30=75\ \mathrm{ms}$$

$$\mathrm{E2E}=325-0=250+75=325\ \mathrm{ms}$$

Locating a wait inside the service requires timestamps or tracing at the relevant boundaries. This figure has no such measurements, so the client total cannot reveal each internal span. The E2E boundary also excludes work after the last token, as in Chapter 1.

### Next

The service can now start, answer and report client-side waits. The next chapter adds a training process beside it to show how answers, training and new weights form one slime loop.

Sources: Chapter 1 Steps 1, 2 and 4 in this book; `DEMO_*` and `DYNAMO_SMOKE_MAX_TOKENS` in `src/ml-sys/numbers.ts`; the timing boundaries in zero-to-sglang Part I Chapter 5 §3.1.
