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
