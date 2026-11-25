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
