## Step 1 · The piece chapter 12 left

> **In one line:** a piece of the piecewise graph is two matmuls with a chain of small kernels between them, each reading its input from HBM and writing its output back; this chapter looks at the two in the middle.

### On the stage

- A row of 4 kernels, left to right: dark `gate·up`, blue `silu`, blue `mul`, dark `down`.
- Two blue arrows per kernel: up is reading its input from HBM, down is writing its output back. 4 kernels, 8 trips.
- The grey band at the bottom, `HBM`: the GPU's 80 GB of on-board memory (Ch. 12 Step 12).
- A red dashed box around `silu` and `mul`, labelled "these two".
- Two lines: the matmuls have to touch memory because the weights are there; the two in the middle touch it only because of how they were called.

### What the four kernels do

This is the back half of one layer's MLP (the `gate·up`, `silu` and `down` of Ch. 12 Step 5's 11 kernels, with `silu` split here into silu and mul):

| kernel | input | output | kind |
|---|---|---|---|
| `gate·up` | each token's hidden vector, 4,096 numbers | two vectors, gate and up, 14,336 numbers each | matmul |
| `silu` | gate | $h = \text{silu}(\text{gate})$, 14,336 numbers | pointwise |
| `mul` | $h$ and up | $h \times \text{up}$, 14,336 numbers | pointwise |
| `down` | 14,336 numbers | 4,096 numbers | matmul |

**Pointwise**: output number $i$ depends only on input number $i$. **Matmul**: a multiplication by a weight matrix.

### Which trips cannot be avoided

- The two matmuls' weights live only in HBM; reading them is part of Ch. 4 Step 5's 16 GB, 4.8 ms weight read.
- silu and mul read and write only the value passed between them, $h$. Step 2 measures it.

### Next

Step 2: how many bytes $h$ is per token per layer, and across the model.

## Step 2 · How big the value between silu and mul is

> **In one line:** $h$ is 28 KB per token per layer, written once and read once; across 32 layers that is 1.8 MB per token.

### On the stage

- Blue `silu` top left, blue `mul` top right, `HBM` at the bottom.
- A red arrow down from silu, "write 28 KB"; a red box in HBM, `[1 × 14,336]`, which is $h$; a red arrow up from HBM to mul, "read back 28 KB".
- "nothing else ever reads it".
- Two lines: 56 KB of traffic per token per layer, written and read back within about a microsecond; across 32 layers, 1.8 MB per token.

### Formula

$$
m_h = d_{\text{ff}}\cdot b,\qquad
m_{\text{tok}} = 2\,m_h\,L
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $d_{\text{ff}}$ | the MLP's middle width, the length of $h$ | 14,336 | Ch. 12 Step 12, `D_FF` |
| $b$ | bytes per bf16 number | 2 B | Ch. 4 Step 2, `BYTES` |
| $m_h$ | one token's $h$ in one layer | 28,672 B | this step |
| $L$ | layers | 32 | chapter 3, `LAYERS` |
| $m_{\text{tok}}$ | $h$ written plus read, for one token through the whole model | | this step |

Ch. 12 Step 12's $M_{\text{silu}} = n \cdot d_{\text{ff}} \cdot b$ is what $n$ tokens write; $m_h$ is its value at $n = 1$.

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $m_h$ | 14,336 × 2 B | 28,672 B ÷ 1,024 = 28 KB | write 28 KB, read back 28 KB |
| write + read | 2 × 28,672 B | 57,344 B = 56 KB | 56 KB per token per layer |
| $m_{\text{tok}}$ | 57,344 B × 32 | 1,835,008 B ≈ 1.8 MB | 1.8 MB per token |

### Next

Step 9 multiplies this 1.8 MB by the batch and sets it against the weight read. Step 3 first asks why $h$ is written to HBM at all when nothing else reads it.

## Step 3 · Eager runs one line at a time

> **In one line:** when eager PyTorch runs line 1 it has not read line 2, so it cannot know $h$ is used right away, and it has to write $h$ to HBM.

### On the stage

- Left box, "what you wrote": three lines, `h = silu(gate)`, `h = h * up`, `y = down(h)`. Line 1 is highlighted with an arrow; the other two are grey, marked "not read yet".
- Right box, "what the interpreter knows": line 1 is a call, and a call has to return; it returns a tensor, and a tensor lives in HBM; line 2 is unread, so nothing knows $h$ is used next.
- `HBM` at the bottom, a red arrow "silu returns h 28 KB", a red box `h · [1 × 14,336]`.
- The line: fusing needs both lines at once; when line 1 runs, the interpreter has only ever seen line 1.

### Which kernel each line is

| Line | Code | Kernel |
|---|---|---|
| 1 | `h = silu(gate)` | `silu`, computing step 2's $h$ |
| 2 | `h = h * up` | `mul` |
| 3 | `y = down(h)` | `down` |

### Why it has to go to HBM

- **Eager**: Python runs one line at a time; each line is a function call that launches one kernel and returns a tensor.
- A tensor is a block of data in HBM. Registers are cleared when a kernel ends (Ch. 12 Step 12), so the returned value can only live in HBM.
- Keeping $h$ in registers needs to know "line 2 is the only reader, and reads right away". That fact is in line 2, which has not run yet.

### Next

Step 4 draws the kernel that becomes possible with both lines in view; step 5 says where that view comes from.

## Step 4 · Fuse them into one kernel

> **In one line:** one kernel reads gate and up once each, computes silu and the multiply in registers, and writes the result once; the arithmetic is the same, with 56 KB less traffic per token per layer.

### On the stage

- Left, "before", red "4 trips": light blue `silu` and `mul` boxes, each with one red read arrow and one red write arrow.
- Right, "after", green "2 trips": one long green box, "silu · mul, fused", with one green read arrow and one green write arrow; under it three lines: load gate and up once; do both operations in registers; store the answer once.
- Two lines: the intermediate never leaves the chip; same maths, same answer, 56 KB less traffic per token per layer.

The stage draws one read and one write per kernel, standing for "reads HBM" and "writes HBM"; the table below counts the actual bytes.

### The numbers on the stage

Per token per layer, 28 KB per item (step 2's $m_h$; gate, up and the result are each 14,336 bf16 numbers):

| | reads | writes | total |
|---|---|---|---|
| before · silu | gate | $h$ | 56 KB |
| before · mul | $h$, up | result | 84 KB |
| **before, total** | | | **140 KB** |
| **after · fused** | gate, up | result | **84 KB** |
| difference | | | 140 − 84 = **56 KB** |

The 56 KB difference is exactly step 2's write and read of $h$.

### Registers

- **SM**: one of the H100's 132 processors (`SMS`). **Registers** are the small storage inside an SM where the arithmetic happens; they are cleared when a kernel ends.
- In the fused kernel each number of $h$ is computed in a register and used there by the next instruction, the multiply, so it never goes to HBM.
- The operations are the same. The one numerical difference: eager rounds $h$ to bf16 when it stores it in HBM, while the fused kernel can keep more precision in the register.

### Next

Step 5: who writes this kernel.

## Step 5 · Inductor writes a Triton kernel

> **In one line:** the op list traced in Ch. 12 Step 11 is what puts both lines in view; Inductor walks it, groups neighbouring pointwise ops, and generates one Triton kernel per group.

### On the stage

- Three boxes joined by arrows, left to right:
  1. Grey, "the traced graph": Ch. 12 Step 11 already has it, a flat list of tensor ops.
  2. Blue, "Inductor": walk the list, group the pointwise ops that touch the same rows.
  3. Green, "Triton, generated": one kernel per group, compiled at startup, cached on disk.
- Six lines of code in a white box: `fused_silu_mul`, two `tl.load`s (commented "one read") and one `tl.store` ("one write").
- The line: two loads and one store; `g * sigmoid(g)` never leaves the register it was computed in.
- Footnote: `SGLang: --cuda-graph-tc-compiler inductor`; Ch. 12 Step 11's default was eager: trace, cut, and stop there.

### Terms

- **torch.compile**: PyTorch's compiler, in two halves. The front end, **Dynamo**, traces (Ch. 12 Step 11); the back end, **Inductor**, generates code from the traced graph.
- **Triton**: a GPU programming language written like Python, compiled to GPU code.

### Reading the code line by line

| Code | Meaning |
|---|---|
| `@triton.jit` | this is a Triton kernel |
| `i = tl.program_id(0) * BLOCK + tl.arange(0, BLOCK)` | many copies of the kernel run at once; `program_id(0)` is which copy, and `i` is the `BLOCK` consecutive positions it handles. Together the copies cover all 14,336 positions |
| `g = tl.load(gate + i)` | read gate from HBM into registers (one read in step 4's table) |
| `u = tl.load(up + i)` | read up (the other read) |
| `tl.store(out + i, g * tl.sigmoid(g) * u)` | compute silu, multiply by up, write once |

$$
\text{silu}(x) = x\cdot\sigma(x),\qquad \sigma(x) = \frac{1}{1+e^{-x}}
$$

| Symbol | What it is | From |
|---|---|---|
| $x$ | one number of gate | Step 1 |
| $\sigma(x)$ | the sigmoid function, `tl.sigmoid` in the code | this step |

So `g * tl.sigmoid(g)` is step 3's line 1 and `* u` is line 2.

### In SGLang

The footnote's `--cuda-graph-tc-compiler inductor` belongs to the `tc_piecewise` path described in Ch. 12 Step 11. Current SGLang main has removed it: a `tc_compiler` key in the config raises "tc_compiler was removed with tc_piecewise" (`model_executor/cuda_graph_config.py`). What turns Inductor on now is `--enable-torch-compile`, which compiles only the decode CUDA graph batch sizes up to `--torch-compile-max-bs` (`base_cuda_graph_runner.py`). Inductor caches what it compiles in `TORCHINDUCTOR_CACHE_DIR`, by default `/tmp/torchinductor_<username>`.

### Next

Step 6: which of a layer's 11 kernels Inductor can fuse.

## Step 6 · What fuses and what does not

> **In one line:** pointwise chains and reduction chains each become one newly written kernel; matmuls are not rewritten but picked from a library; attention stays eager. One layer goes from 11 kernels to 8.

### On the stage

- Top row, 11 boxes: Ch. 12 Step 5's layer, `norm qkv rope attn o add norm gate·up silu down add`. Blue pointwise or reduction, dark matmul, red attn. `silu` here stands for step 4's silu·mul.
- Bottom row, 8 boxes: what Inductor makes of them, with green brackets joining kernels that became one: `qkv·rope`, `o·add`, `down·add`.
- Three lines defining pointwise, reduction and matmul.
- Legend: green "written", 3; dark "picked", 4; red "left eager", 1.
- The line: the 3 kernels that went away were pointwise neighbours of matmuls.

### Three kinds of op

| Kind | Rule | Examples | How it fuses |
|---|---|---|---|
| pointwise | `out[i]` depends only on `in[i]` | silu, mul, add, rope | a chain is one pass over the data, one kernel |
| reduction | a row collapses to one number | norm's mean of squares | also one pass, with an accumulator |
| matmul | `out[i, j]` needs all of row i of A and column j of B | qkv, o, gate·up, down | not rewritten; picked from a library |

**norm** (RMSNorm): compute the mean of the squares of a token's 4,096 numbers, then divide each number by its square root. **rope**: rotate q and k by position (Ch. 2 Step 11).

### The numbers on the stage

| Bottom row | From the top row | How |
|---|---|---|
| `norm` | norm | written |
| `qkv·rope` | qkv + rope | picked, rope folded in |
| `attn` | attn | left eager (Ch. 12 Step 6's seam) |
| `o·add` | o + add | picked, add folded in |
| `norm` | norm | written |
| `gate·up` | gate·up | picked |
| `silu` | silu·mul | written (step 4) |
| `down·add` | down + add | picked, add folded in |

3 written + 4 picked + 1 eager = 8; three folds: 11 − 3 = 8.

**Picked**: Inductor chooses an implementation from cuBLAS (NVIDIA's matrix library), a Triton template, or CUTLASS (NVIDIA's matmul template library). Steps 7 and 8 explain how.

### The stage's grouping is one possibility

Folding a pointwise neighbour into a matmul's last stage (its epilogue) works only when the picked matmul is one Inductor generates itself, such as a Triton template. When cuBLAS is picked, the matmul is an external call and cannot carry an epilogue; then `add` usually fuses with the `norm` after it instead. Either way the layer ends up with about 8 kernels.

### Next

Step 7 explains tiles first; step 8 explains how a matmul's implementation is picked.

## Step 7 · A matmul's tiles

> **In one line:** a matmul's output C is cut into tiles, one per thread block; each block loads the rows of A and columns of B its tile touches in full, so a bigger tile makes more outputs per load.

### On the stage

- Title: `C = A × B · [8 × 12] = [8 × 6] × [6 × 12]`.
- Two tilings side by side, each drawing A (bottom left), B (top) and C (bottom right), one square per number. Blue is one tile and the rows of A and columns of B it loads; thick lines on C are tile boundaries.
- Left: `BLOCK 4 × 4 · 6 tiles`, 48 cells loaded for 16 outputs, 3.0 per output; whole C 288 loads.
- Right: `BLOCK 8 × 6 · 2 tiles`, 84 cells loaded for 48 outputs, 1.8 per output; whole C 168 loads.
- Three lines: a block loads its rows of A and columns of B in full; 8 × 6 loads less but holds 48 accumulators per block instead of 16; it makes only 2 blocks, and an H100 has 132 SMs.

### Terms

- **Tile**: a rectangle of C computed by one thread block.
- **Thread block**: a group of GPU threads that runs on one SM.
- **Accumulator**: the running sum kept for each output in registers (step 4).

### Formula

C is $M_C \times N_C$, the inner dimension is $K$, and the tile is $m_t \times n_t$:

$$
\begin{aligned}
\text{tiles} &= \frac{M_C}{m_t}\cdot\frac{N_C}{n_t}\\
\text{loads per block} &= (m_t + n_t)\,K\\
\text{loads for all of C} &= \text{tiles}\times(m_t + n_t)\,K
\end{aligned}
$$

| Symbol | What it is | On the stage |
|---|---|---|
| $M_C, N_C$ | C's rows and columns | 8, 12 |
| $K$ | A's columns = B's rows, the length of each row and column | 6 |
| $m_t, n_t$ | the tile's rows and columns | 4 × 4 or 8 × 6 |

$m_t$ rows of A at $K$ numbers each and $n_t$ columns of B at $K$ each, so a block loads $(m_t + n_t)K$ numbers; it computes $m_t n_t$ outputs.

### The numbers on the stage

| | 4 × 4 | 8 × 6 |
|---|---|---|
| tiles | (8 ÷ 4) × (12 ÷ 4) = 6 | (8 ÷ 8) × (12 ÷ 6) = 2 |
| loads per block | (4 + 4) × 6 = 48 | (8 + 6) × 6 = 84 |
| outputs / accumulators per block | 16 | 48 |
| loads per output | 48 ÷ 16 = 3.0 | 84 ÷ 48 = 1.75, 1.8 on the stage |
| loads for all of C | 6 × 48 = 288 | 2 × 84 = 168 |

### The tradeoff

A bigger tile loads less in total, but each block needs more registers for accumulators, and there are fewer blocks: 2 blocks use only 2 of 132 SMs. The best shape depends on C's shape.

### Next

Step 8: the same tradeoff on a real decode matmul.

## Step 8 · At batch 16, a square tile is mostly padding

> **In one line:** at batch 16 a decode matmul's C has only 16 rows; a 128 × 128 tile is 7/8 zero padding and makes only 112 tiles, while 16 × 64 pads nothing and makes 224. So benchmark a few shapes on the real C and keep the fastest.

### On the stage

- A thin blue strip: C's first 1,024 columns, 16 rows, one pixel per row, "… to column 14,336".
- A red dashed square, `BLOCK 128 × 128`, with the padded part shaded light red below; three lines beside it: 16 of its 128 rows exist; 7/8 of the tile's arithmetic is on zeros; 14,336 / 128 = 112 tiles for 132 SMs, 20 sit idle.
- A green box, `BLOCK 16 × 64`: every row it covers is real; 14,336 / 64 = 224 tiles, every SM busy.
- Five bars below: candidate tile shapes' time on this C, relative to 128 × 128; the shortest, green `BLOCK 16×64`, is marked "keep this one".
- The line: a library's default tile is tuned for a square C; below 128 rows it is mostly padding, and a short, wide tile wins.

### C's shape

Taking the gate half of gate·up (Ch. 12 Step 5: gate and up together are 28,672 wide):

| Matrix | Shape | What it is |
|---|---|---|
| A | [16 × 4,096] | 16 tokens' hidden vectors; decode adds one token per request per step, so rows = batch |
| B | [4,096 × 14,336] | gate's weights |
| C | [16 × 14,336] | the output |

### The numbers on the stage

| Quantity | Arithmetic | Result |
|---|---|---|
| 128 × 128 padded rows | 128 − 16 | 112 |
| share of arithmetic on padding | 112 ÷ 128 | 7/8 |
| 128 × 128 tiles | 14,336 ÷ 128 | 112 (one row of tiles) |
| idle SMs | 132 − 112 | 20 |
| 16 × 64 tiles | 14,336 ÷ 64 | 224, more than 132 |

### The benchmark (autotuning)

| Candidate | Relative time |
|---|---|
| 128×128 | 100% |
| 64×128 | 82% |
| 32×128 | 66% |
| 16×256 | 55% |
| 16×64 | **47%** |

The chapter draws these bars to show how such a sweep ranks the shapes; they are not measurements. **Autotuning**: run every candidate on a C of this shape and keep the fastest. The fastest shape depends on C's shape, so each batch size is benchmarked separately (step 10).

### Next

Step 9: what fusing silu·mul is worth in total.

## Step 9 · What it is worth: 140 µs, 3% of 4.8 ms

> **In one line:** at batch 256, fusing removes 470 MB from a decode step, about 3% of the 16 GB weight read, or about 140 µs; the launch overhead chapters 11 and 12 removed is about 30 times larger.

### On the stage

Two bars for the same step, first in bytes, then in time. The loop has two phases: first a red piece (what fusing removes), then the piece gone, leaving a red dashed outline.

- **Bytes**: orange "weights · 16.0 GB", blue "activations · 1.4 GB", 17.4 GB at the end (16.9 GB in the second phase); the red piece, "fusing removes this 470 MB · 3% of the weight read".
- Middle line: the step is memory-bound, so bytes ÷ 3.35 TB/s of HBM bandwidth = time.
- **Time**: dark "GPU · 4.8 ms reading the weights", a blue dashed box "CPU · 4.2 ms launching · gone since chapters 11 and 12", 9.0 ms at the end; the red piece, "fusing removes 140 µs", and in the second phase "the GPU's 4.8 ms becomes 4.6 ms".
- Two lines: 470 MB ÷ 3.35 TB/s = 140 µs, 3% of the bytes and of the time; chapters 11 and 12 removed 4.2 ms, this removes about 30× less.
- The title notes that Ch. 4 Step 6's KV cache read is not shown.

### Formula

$$
M_{\text{save}} = B\,m_{\text{tok}},\qquad
t_{\text{save}} = \frac{M_{\text{save}}}{BW},\qquad
t_{\text{mem}} = \frac{M_W}{BW}
$$

| Symbol | What it is | Size | From |
|---|---|---|---|
| $B$ | batch size, which in decode is also the step's token count | 256 | Ch. 5 Step 1 |
| $m_{\text{tok}}$ | $h$ written plus read, per token | 1,835,008 B | Step 2 |
| $M_{\text{save}}$ | bytes fusing removes | | this step |
| $BW$ | HBM bandwidth | 3.35 TB/s | Ch. 4 Step 5, `BW` |
| $M_W$ | weight bytes | 16 GB | Ch. 4 Step 2, `W_GB` |
| $t_{\text{mem}}$ | one weight read | 4.78 ms | Ch. 4 Step 5 |
| $t_{\text{save}}$ | time fusing saves | | this step |
| $T_{\text{cpu}}$ | launch time of an eager step | 9.0 ms | Ch. 11 Step 4 |

Memory-bound: the step's time is set by the bytes it moves (Ch. 4 Step 5), so time = bytes ÷ $BW$.

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $M_{\text{save}}$ | 1,835,008 B × 256 | 469.8 MB | 470 MB |
| share of the weight read | 469.8 MB ÷ 16,000 MB | 2.94% | 3% |
| activations | 470 MB × 3 | 1.4 GB | 1.4 GB |
| total | 16 + 1.4 | 17.4 GB | 17.4 GB |
| after removal | 17.41 − 0.47 | 16.9 GB | 16.9 GB |
| $t_{\text{mem}}$ | 16 GB ÷ 3.35 TB/s | 4.78 ms | 4.8 ms |
| $t_{\text{save}}$ | 0.4698 GB ÷ 3.35 TB/s | 0.140 ms | 140 µs |
| GPU after fusing | 4.78 − 0.14 | 4.64 ms | 4.6 ms |
| launches already removed | $T_{\text{cpu}} - t_{\text{mem}}$ = 9.0 − 4.78 | 4.22 ms | 4.2 ms |
| ratio | 4.22 ÷ 0.140 | 30 | about 30× less |

The 1.4 GB of activations is the chapter's assumption: about 3 times the silu traffic, used only to draw the part of the bar beyond the weights.

### Next

Step 10: what fusing and autotuning cost at startup.

## Step 10 · The extra work at startup

> **In one line:** for each captured batch size, startup compiles 8 fused kernels, benchmarks 5 tile shapes for each of 4 matmuls, and records once; one layer is compiled once and all 32 share it.

### On the stage

- A grid: one row per captured shape, `batch 1`, `2`, `4`, `8`, `16`; each cell is one job done at startup, left to right in order.
  - Blue "compile": 8 cells, 8 fused kernels.
  - Dark "benchmark": 20 cells, 4 matmuls × 5 tile shapes, max-autotune only.
  - Orange "record": 1 cell, Ch. 11 Step 6.
- Totals under each column: = 40, = 100, = 5.
- "not ×32 for the layers: they are identical, so one compile per shape serves all of them".
- `--torch-compile-max-bs 16` sets the rows, and larger batches run with none of this; `max-autotune` turns the benchmark column on, off by default, and that column is empty.
- Bottom line: measured in SGLang, 90 s on a 235B MoE, 158 s on GLM-5.2, before the first request.

### The numbers on the stage

| Column | Cells per row | From | × 5 rows |
|---|---|---|---|
| compile | 8 | step 6's 8 bottom-row kernels | 40 |
| benchmark | 4 × 5 = 20 | step 6's 4 picked matmuls × step 8's 5 candidates | 100 |
| record | 1 | Ch. 11 Step 6 | 5 |

- **Not × 32**: every layer runs the same kernels with different weights, so a compiled kernel serves all 32 layers.
- **Record goes last**: a recording freezes the kernels that exist when it is taken (Ch. 11 Step 6); recording before compiling would freeze the unfused ones.

### In SGLang

Current SGLang main differs from the stage in three places:

- **Rows**: `--torch-compile-max-bs` defaults to 32. The compiled batch sizes are the decode ladder's sizes up to it (`compile_bs` in `base_cuda_graph_runner.py`). The stage's 1, 2, 4, 8, 16 use Ch. 11 Step 10's illustrative ladder; SGLang's default ladder starts `[1, 2, 4, 8, 12]`, so 16 would give six rows, 1, 2, 4, 8, 12, 16.
- **Benchmark column**: PyTorch's own default mode does not benchmark, but SGLang's `--enable-torch-compile` defaults to `max-autotune-no-cudagraphs` (`compilation/torch_compile_decoration.py`, changeable with the `SGLANG_TORCH_COMPILE_MODE` environment variable). So SGLang runs the benchmark column by default.
- **90 s and 158 s**: this pass did not find the source of these two numbers in the SGLang repository.

### Next

Step 11: with record, cut and fuse done, which kernel in the layer is still untouched.

## Step 11 · Only attention is untouched

> **In one line:** of a layer's 11 kernels, every one except attention has been fused or picked and recorded into a graph; attention was cut out and has run eagerly ever since, and chapters 11 to 13 did not change it.

### On the stage

- A row of 11 boxes coloured by what was done: green, fused into Inductor's kernels (`norm rope add norm silu add`); dark, matmuls picked from a library (`qkv o gate·up down`); red, `attn`.
- A red arrow to attn: "still eager, still untouched".
- Two rows of pills:
  - "the order you met them": record (chapter 11) → cut (chapter 12) → fuse (chapter 13).
  - "the order they happen": cut → fuse → record.
- Two lines: cut before recording, because attention would not capture; fuse before recording, because a recording freezes whichever kernels exist when it is taken.
- Last line: Attention sat outside all three. So what can be done with the attention kernel itself?

### What each chapter did

| Operation | Chapter | Applied to | Result |
|---|---|---|---|
| record | Ch. 11 Steps 6 and 7 | the launches of a run of kernels | the CPU no longer launches them one by one |
| cut | Ch. 12 Step 6 | at every attention | attention runs eagerly between pieces |
| fuse | this chapter, Steps 4–6 | pointwise and reduction chains | less HBM traffic, a few fewer kernels |

### Why startup runs them in this order

1. **Cut first**: attention's work changes with the sequence boundaries (Ch. 12 Step 4), so it cannot be recorded.
2. **Fuse next**: as step 10 said, a recording freezes the kernels that exist at the time.
3. **Record last**.

### Next

Attention is the one kernel none of the three chapters touched. Chapter 14 looks at the attention kernel itself: what it reads, and the ways it is written.
