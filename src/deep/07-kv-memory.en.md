## Step 1 · How much of the card is left for the KV cache

> **In one line:** 80 GB of memory minus 16 GB of weights leaves 64 GB, all the KV cache can use; 8 running requests already hold 31 GB, and 33 GB is empty.

### On the stage

- The white bar: one H100's 80 GB of HBM (GPU memory).
- The blue part on the left, "weights 16 GB": Llama-3-8B's weights, read once per step (Ch. 4 Step 2).
- Right after it, 8 teal blocks: the KV cache of 8 running requests, each as wide as its context. The 4 wide enough carry their length (36k, 48k, 32k, 40k); the other 4 (24k, 12k, 20k, 16k) are too narrow for a label.
- The black bracket below, "room for KV cache · 64 GB": everything after the weights.
- The teal bracket above, "in use · 31 GB, 8 requests", and the orange one, "empty right now · 33 GB".
- One line: each running request grows 128 KB per step; the empty part is what newcomers can be admitted into.
- The grey footnote: the roughly 55 GB SGLang actually gives its pool (see "Why" below).

### Formula

$$
M_{\text{room}} = M_{\text{HBM}} - M_W,\qquad
M_{\text{seq}}(c) = c \times m_{kv}
$$

$$
M_{\text{used}} = \sum_{r} M_{\text{seq}}(c_r),\qquad
M_{\text{empty}} = M_{\text{room}} - M_{\text{used}}
$$

| Symbol | What it is | Size | Where from |
|---|---|---|---|
| $M_{\text{HBM}}$ | one H100's memory | 80 GB | `HBM_GB` in `src/numbers.ts` |
| $M_W$ | bytes of weights | 16 GB | Ch. 4 Step 2; `W_GB` |
| $M_{\text{room}}$ | the space after the weights, for the KV cache | | this step |
| $m_{kv}$ | one token's k and v across all layers | 128 KB | Ch. 3 Step 9; `KB_PER_TOKEN` |
| $c$ | one request's context length, in tokens | | Ch. 4 Step 6 |
| $M_{\text{seq}}(c)$ | the cache of a request with context $c$ | | this step |
| $c_r$ | the context of running request $r$ | 8 on the stage | this step |
| $M_{\text{used}}, M_{\text{empty}}$ | in use, empty | | this step |

Units: 128 KB counts 1 KB = 1,024 B (131,072 B), and GB counts 10⁹ B, as the component does.

### The numbers on the stage

| Quantity | Arithmetic | Result | On the stage |
|---|---|---|---|
| $M_{\text{room}}$ | 80 − 16 | 64 GB | 64 GB |
| the 8 contexts together | 24 + 36 + 12 + 48 + 20 + 32 + 40 + 16 | 228k tokens | |
| $M_{\text{used}}$ | 228 × 1,024 × 131,072 B | 30.6 GB | 31 GB |
| $M_{\text{empty}}$ | 64 − 30.6 | 33.4 GB | 33 GB |
| growth per step | 8 × 128 KB | 1 MB | |

Every decode step, each running request gains one token and its cache 128 KB. So the empty part shrinks step by step even if no newcomer arrives.

### Why SGLang's pool is about 55 GB

- SGLang's `--mem-fraction-static` (call it $f$) caps "weights + KV cache pool" as a share of memory; the rest is kept for the intermediate results of the computation (activations) and for CUDA graphs (chapter 11).
- Left unset, SGLang estimates $f$ from the card: an 80 GB card keeps at least 10 GiB back, more with a chunk size of 8,192, which gives about 0.83.
- The stage's 80 GB is the nominal size; the card really has about 79.6 GiB ≈ 85.5 GB (10⁹ B). So the pool ≈ 0.83 × 85.5 − 16 ≈ 55 GB. With the nominal size, 0.83 × 80 − 16 is only 50 GB; the gap is GiB against GB.
- The stage leaves $f$ out and works with 64 GB; none of the chapter's conclusions depend on it.

### Next

Step 2 asks how many requests these 64 GB hold.

## Step 2 · How many requests fit

> **In one line:** with every request at the same context, 64 GB holds 238 at 2k, 119 at 4k and 59 at 8k, all under the roughly 300 that compute could serve.

### On the stage

- Three bars like step 1's, one per context length: 2k, 4k, 8k. Blue on the left of each is the weights.
- On each bar, a row of thin teal blocks, one block per request; the row title gives each request's size (268 MB, 537 MB, 1,074 MB).
- Below the right end of each bar: "238 requests fit", "119", "59".
- Two lines below: Ch. 5 Step 4's sweet spot was 300 requests decoding at once; even at a short 2k context, this card holds 238.
- The footnote is step 1's.

### Formula

$$
B_{\max}(c) = \left\lfloor \frac{M_{\text{room}}}{M_{\text{seq}}(c)} \right\rfloor
= \left\lfloor \frac{M_{\text{HBM}} - M_W}{c \times m_{kv}} \right\rfloor
$$

| Symbol | What it is | Where from |
|---|---|---|
| $M_{\text{room}}$ | 64 GB | step 1 |
| $M_{\text{seq}}(c)$ | one request's cache, $c \times m_{kv}$ | step 1 |
| $B_{\max}(c)$ | how many requests fit at once, the cap on the decode batch | this step; $B$ from Ch. 5 Step 1 |
| $\lfloor\ \rfloor$ | round down: half a request does not fit | |

### The numbers on the stage

| $c$ | $M_{\text{seq}}(c)$ | $64 \div M_{\text{seq}}$ | $B_{\max}$ |
|---|---|---|---|
| 2,048 | 2,048 × 131,072 B = 268 MB | 238.4 | **238** |
| 4,096 | 537 MB | 119.2 | **119** |
| 8,192 | 1,074 MB ≈ 1 GB | 59.6 | **59** |

Doubling the context doubles each request's cache and halves the count.

### Where 300 comes from

Ch. 4 Step 8's balance point: reading the weights takes $t_{\text{mem}} = 16 \div 3.35 = 4.78$ ms, one token's math $t_{\text{comp}}(1) = 16\ \text{GFLOP} \div 989\ \text{TFLOP/s} = 0.0162$ ms, and their ratio ≈ 295, rounded to 300. With fewer tokens than that in the batch, a step costs that one weight read whatever its size (Ch. 5 Step 4).

At 2k the card holds only 238, short of 300: the batch is capped by memory, not by compute.

### Next

So none of the 64 GB can be wasted. Step 3 shows how much the most direct allocator wastes.

## Step 3 · The naive way: reserve the maximum in one block

> **In one line:** reserving one contiguous 8k-token block per request leaves 64% of it never written on average, and the holes finished requests leave are too small for a newcomer.

### On the stage

- Top row title: reserve the maximum for everyone · 8k tokens = 1 GB per request.
- Top row, 5 blocks (req 1–5), each one request's reservation:
  - solid teal: what it has written;
  - hatched teal: reserved, not written yet.
  - Tags under the blocks: using 2.8k, 4.8k, 1.6k, 4.0k, 1.2k (each of 8k).
- Top legend: hatched = reserved, never written, 64% of the cache budget.
- Bottom row, "a while later": a strip of memory where teal is blocks still running and dashed white is holes left by finished requests, labelled 0.4, 0.6, 0.3, 0.2 GB. It is not on the top row's scale.
- Below it, a red dashed "1 GB" box and the line: a newcomer needs 1 GB in one piece · 1.5 GB free, no hole big enough. Fragmentation.

### Formula

$$
\text{wasted share} = 1 - \frac{1}{N}\sum_{r=1}^{N} u_r
$$

| Symbol | What it is | Where from |
|---|---|---|
| $N$ | requests in the top row, 5 | this step |
| $u_r$ | the share of request $r$'s reservation it has written | this step |
| reservation size | $M_{\text{seq}}(8{,}192) = 1{,}074$ MB ≈ 1 GB | step 2 |

### The numbers on the stage

| Request | $u_r$ | used = $u_r$ × 8k |
|---|---|---|
| req 1 | 0.35 | 2.8k |
| req 2 | 0.60 | 4.8k |
| req 3 | 0.20 | 1.6k |
| req 4 | 0.50 | 4.0k |
| req 5 | 0.15 | 1.2k |

Average $u = (0.35 + 0.6 + 0.2 + 0.5 + 0.15) \div 5 = 0.36$, so the wasted share $= 1 - 0.36 = 64\%$.

Bottom row: the holes add up to 0.4 + 0.6 + 0.3 + 0.2 = 1.5 GB, more than the newcomer's 1 GB; but the largest is 0.6 GB, so it still does not fit.

### Two kinds of waste

- **Reserved and unused:** a request does not know at the start how long its answer will be, so it reserves the maximum, and the part it never writes stays held until it finishes.
- **Fragmentation:** free memory split into separate small pieces, enough in total, too small one by one. Moving the running blocks together would close the holes, but means copying gigabytes while they are in use.

### Next

Step 4 cuts the memory differently: a request's cache no longer has to be one contiguous block.

## Step 4 · Paging: cut it into fixed-size pages

> **In one line:** cut the 64 GB into equal pages; the newcomer req 6 needs 5, takes one from each of any 5 free places, and writes the page numbers, in order, into its page table.

### On the stage

- Row title: the 64 GB after the weights, cut into pages · 120 shown of many thousands.
- A 20-column × 6-row grid, one page per cell. Coloured cells belong to req 1–5 (the legend on the right gives the colours); dashed white cells are free.
- The animation, in four parts:
  1. "req 6 arrives · needs 5 pages", first shown as one pink block, the shape step 3's allocator would need;
  2. it splits into 5 pages, with "split into 5 pages, not one block";
  3. the 5 pages fly into free cells across the grid, "→ any 5 free pages, wherever they are";
  4. two lines below: req 6's page table 13, 35, 60, 82, 104; attention reads the cache through this list; nothing needs to be next to anything.

### How pages are numbered

Row by row from the top left: the first row is 0–19, the second 20–39, and so on.

$$
\text{page number} = 20 \times \text{row} + \text{column}\qquad(\text{both counted from 0})
$$

| Page | Row | Column |
|---|---|---|
| 13 | 0 | 13 |
| 35 | 1 | 15 |
| 60 | 3 | 0 |
| 82 | 4 | 2 |
| 104 | 5 | 4 |

### The page table

- **Page table**: a request's list of pages, in order. Entry 1 is where its first page of K/V lives, entry 2 the second, and so on.
- Attention reads the cache through the table: in Ch. 3 Step 6, $q$ read $k_1, v_1, k_2, v_2, \dots$; now that becomes "look up entry $i$ to find the page holding $k_i, v_i$". So the pages need not be adjacent.

### The numbers on the stage

| Quantity | Value |
|---|---|
| pages drawn | 20 × 6 = 120 |
| free before req 6 | 32 |
| taken by req 6 | 5 |
| free after req 6 | 32 − 5 = 27 |

### Both of step 3's losses go

- **Nothing reserved:** a request takes another page only when it has another token, so nothing is held for tokens it has not produced.
- **No fragmentation:** any free page fits any request, so there is no hole too small.

### Next

Step 5 shows how a finished request gives its pages back.

## Step 5 · A request finishes, its pages go back

> **In one line:** req 5 finishes and its 14 pages are marked free where they are; nothing is copied, no other page table changes, and free pages go from 27 to 41.

### On the stage

- The same grid, continuing from step 4 (req 6's pink pages are in it).
- "req 5 finished · its 14 pages go back to the pool": req 5's amber cells fade and become free cells with an orange dashed outline; in the legend on the right, req 5 dims and reads "· done".
- Then one line: 41 free pages now, scattered · nobody else moved.
- The grey footnote: this is with prefix caching off; SGLang keeps a finished request's pages in its prefix cache until it needs them (chapter 8).

### The numbers on the stage

| Quantity | Value |
|---|---|
| req 5's pages | 1, 12, 17, 28, 29, 33, 44, 45, 50, 61, 66, 77, 110, 114: 14 in all |
| free before | 27 (step 4) |
| free after | 27 + 14 = 41 |

### Why freeing is this simple

- Freeing only marks those page numbers free again; no data moves.
- Every other request's table lists only its own pages, and none of those moved, so no table changes.
- In step 3 the same event left holes of fixed sizes that only a smaller request could reuse; here each free page is a whole unit the next request can take on its own, so scattered pages are as useful as adjacent ones.

### The exception in the footnote

SGLang has prefix caching on by default: a finished request's pages stay as a cache, reused when a request with the same prompt start arrives, and the least recently used are pushed out only when the pool runs short. This step shows the simple case with it off; chapter 8 covers it on.

### Next

Step 6: the next newcomer takes from these free pages.

## Step 6 · The next newcomer, and how big a page is

> **In one line:** req 7 needs 8 pages, and all 8 it gets happen to be ones req 5 just gave back; page size is how many tokens one page holds, 16 by default in vLLM and 1 in SGLang.

### On the stage

- The same grid, starting from where step 5 ended (41 free).
- "req 7 arrives · needs 8 pages", one dark teal block, split into 8 pages that fly into the grid.
- Two lines below: req 7's page table 1, 17, 29, 44, 45, 61, 77, 114; attention reads the cache through this list.
- The legend on the right: req 1–7, with req 5 still marked "· done".

### The numbers on the stage

| Quantity | Value |
|---|---|
| taken by req 7 | 8, all among the 14 freed in step 5 |
| free after | 41 − 8 = 33 |

The attention kernel (a program that runs on the GPU) reads req 7's K/V from page 1 first, then page 17, and so on.

### Page size

Page size $p$ = how many tokens' K/V one page holds.

$$
\text{bytes per page} = p \times m_{kv},\qquad
\text{pages in the pool} = \frac{M_{\text{room}}}{p \times m_{kv}}
$$

| | $p$ | one page | pages in 64 GB |
|---|---|---|---|
| vLLM default | 16 | 16 × 128 KB = 2 MB | about 30,500 |
| SGLang default | 1 | 128 KB | 64 × 10⁹ ÷ 131,072 ≈ 488,000 |

The grid's 120 cells are a small part of that. On CUDA, SGLang sets `--page-size` to 1 when it is left unset (`_page_size_default` in the source).

### Big pages and small pages

- **Big pages:** shorter tables, and the kernel reads longer runs at a time.
- **Small pages:** a request's last page is never partly empty. With $p = 16$ the last page can leave up to 15 tokens unused, 15 × 128 KB = 1,920 KB; with $p = 1$, none.
- **Small pages also** let two requests in chapter 8 share down to a single token.

### Next

Step 7 puts the chapter together: what admitting a newcomer checks, and what a request actually holds.

## Step 7 · Admission is a count; a request holds a page table

> **In one line:** if the free pages cover a newcomer's prompt plus the answer it is expected to write, admit it and write its table; if not, wait; if the running requests themselves do not fit, retract one.

### On the stage

On the left, admission:

- The decision box "free pages ≥ pages needed?", with "needed: its prompt, plus every answer still to come".
- "yes" (green) → "admit: take any free pages, write the page table".
- "no" (red) → "wait: until a running request finishes and frees its pages"; inside, one more line: running requests out of pages, nobody finishing? retract the one with least output, re-prefill it later.

On the right, "what req 7 holds":

- A row of 8 dark teal cells: page numbers 1, 17, 29, 44, 45, 61, 77, 114, with positions 1–8 under them.
- "the same pages, where they actually sit in the pool": a small 120-cell grid, req 7's cells numbered by position, grey for other requests', white outlined for free.
- Two lines: attention walks the list in order; the pages never need to be adjacent.
- Two lines in light grey: same page in two lists → chapter 8; a list sent to another GPU → chapter 28.
- The footnote: SGLang's five names for these parts (table below).

### In SGLang

| On the stage | SGLang | What it does |
|---|---|---|
| the page pool | `MHATokenToKVPool` | holds every page's K and V |
| handing out free pages | `TokenToKVPoolAllocator` | tracks which pages are free, hands them out and takes them back |
| the page tables | `req_to_token` | one row per request; column $i$ is where its token $i$'s K/V sits in the pool (the page number, at page size 1) |
| the decision box | `PrefillAdder` | does the admission check each time a prefill batch is built |
| retraction | `ScheduleBatch.retract_decode` | sends requests back when decode does not fit |

### What "needed" counts

`PrefillAdder` counts more than the pages this step writes; it also keeps room for answers:

| Kept for | How much (tokens) |
|---|---|
| the newcomer | prompt length + $\min(\text{max\_new\_tokens},\ 4096)$ |
| each running request | $\min(\text{max\_new\_tokens} - \text{written},\ 4096) \times r$ |

- $\text{max\_new\_tokens}$: the most tokens this request may generate (a request parameter).
- 4,096: the cap used for the estimate (`SGLANG_CLIP_MAX_NEW_TOKENS_ESTIMATION`).
- $r$: the share expected to actually be written. It starts at 0.7, drops a little on every decode step without a retraction, and reaches 0.7 × 0.14 ≈ 0.1 after 600 steps; a retraction re-estimates it from how many tokens the batch has written.

The check is an estimate: an answer can run longer than expected.

### Retraction

- When: the running batch's next decode step needs more pages than are free (one token each no longer fits).
- Who: requests are ordered by output tokens so far, and **the one with the fewest goes first** (on a tie, the longer prompt); at least one is kept.
- Then: its pages are freed, the request goes back on the waiting list (Ch. 6 Step 2), and it is prefilled again later, rebuilding its cache.

### What the page table means

- req 7 holds no region of memory, only step 6's 8 page numbers. The kernel finds pages through the table, and nothing in it requires them to be adjacent.
- If the same page number appears in two tables, two requests use that K/V without a copy: chapter 8.
- A page table is a list of numbers, so it can be sent to another GPU for it to read from: chapter 28.

### Next

Chapter 8: when two requests' prompts start the same way, point both tables at the same pages.
