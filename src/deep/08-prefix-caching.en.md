## Step 1 · One system prompt, stored twice

> **In one line:** req A and req B share their first 512 tokens; paged as in chapter 7, each stores its own copy, so the same 64 MB of k and v is written twice.

### On the stage

- Row title: two prompts · page = 128 tokens here.
- Two prompt bars: the light-blue "system prompt · 512 tokens", then each request's question, A's blue qA · 140 and B's purple qB · 90.
- Right of the bars: A "= 4 + 2 pages", B "= 4 + 1 pages".
- The 20 × 4 page grid below: blue cells are A's, purple cells are B's, cells marked `S` hold the system prompt; white dashed cells are free.
- A red dashed line joins A's last S page to B's first S page, with the red label: S = the same 512 tokens' k and v, stored twice.
- Two page tables under the grid: A: 3, 9, 16, 22 | 31, 37; B: 46, 52, 59, 65 | 73. Left of the bar are the system prompt's pages, right of it the question's.

### Why the two copies are identical

Ch. 2 Step 3: position $i$'s key and value are $k_i = W_K x_i$ and $v_i = W_V x_i$. $W_K, W_V$ are the same weights for every request. In layer 1, $x_i$ is looked up from the token id (Ch. 2 Step 2), and $k_i$ is then rotated by position $i$ (Llama's position encoding, called RoPE). So the same token id at the same position gives the same $k_i, v_i$. Layers 2 and up are step 3's question.

### Formula

$$
\text{pages}(n) = \left\lceil \frac{n}{p} \right\rceil,\qquad
M(n) = n \times m_{kv}
$$

| Symbol | What it is | Size | Where from |
|---|---|---|---|
| $n$ | a number of tokens | | this step |
| $p$ | page size: tokens per page | 128 on the stage | Ch. 7 Step 6 |
| $\lceil\ \rceil$ | round up: a part-filled page still takes a whole page | | |
| $\text{pages}(n)$ | pages needed for $n$ tokens | | this step |
| $m_{kv}$ | one token's k and v across all layers | 128 KB | Ch. 3 Step 9; `KB_PER_TOKEN` |
| $M(n)$ | bytes of k and v for $n$ tokens | | this step |

The stage's $p = 128$ only keeps the grid small; SGLang's default is $p = 1$ (Ch. 7 Step 6). The system prompt and the question are rounded up separately, so A gets $4 + 2$ rather than $\lceil 652 / 128 \rceil = 6$, which is how the stage draws it.

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---|
| A's pages | $\lceil 512/128 \rceil + \lceil 140/128 \rceil = 4 + 2$ | 6 |
| B's pages | $\lceil 512/128 \rceil + \lceil 90/128 \rceil = 4 + 1$ | 5 |
| pages used in the pool | 6 + 5 | 11 |
| duplicate S pages | 2 × 4 | 4 of the 8 are redundant |
| the system prompt's k and v | $512 \times 128$ KB = 65,536 KB | 64 MB, stored twice |

On top of the extra 64 MB, B's prefill computed those 512 tokens all over again.

### Next

Step 2 lets B's page table name A's page numbers directly.

## Step 2 · B's page table points at A's pages

> **In one line:** B's first 4 entries become A's S pages, the pool uses 4 fewer pages, and B prefills only its 90-token tail; the shared pages now have a reference count of 2.

### On the stage

- The same two prompt bars and grid.
- A's 4 S pages turn blue-and-purple striped: shared by both requests. B's own 4 purple S pages disappear.
- Page tables: A unchanged; B now reads **3, 9, 16, 22** (in blue: A's page numbers) | 73, followed in grey by: shared pages: 2 owners · B prefilled 90 tokens, not 602.

### Why this is allowed

A page table is just a list of page numbers that the attention kernel follows into the pool (Ch. 7 Step 7). Nothing says a page number may appear in only one table. When two tables name the same page, two requests read the same data, with no copy.

### The numbers on the stage

| Quantity | Calculation | Result |
|---|---|---|
| pages used in the pool | 11 − 4 | 7 |
| memory saved | step 1's second copy | 64 MB |
| B's prompt | 512 + 90 | 602 tokens |
| B's actual prefill | 602 − 512 | 90 tokens |

When those 90 tokens do attention, the k and v of the first 512 positions are read straight from pages 3, 9, 16 and 22, just like any KV cache (Ch. 3 Step 6).

### Reference count

- **Reference count**: how many running requests use a page right now. The 4 S pages have count 2, one for A and one for B.
- In Ch. 7 Step 5 a page had one owner and went back to the pool when that owner finished. Now a request finishing only lowers the count by 1.
- When the count reaches 0 (A and B both done), what the caption calls "freed" means **reclaimable** in SGLang: by default the pages stay in the prefix cache and are only taken back when the pool runs short. Step 7 covers this.

### Next

Step 3 answers how B knows which pages it can share with A.

## Step 3 · Only a prefix can be reused

> **In one line:** compare token ids from token 1; the $m = d - 1$ positions before the first difference $d$ can be reused, and nothing from $d$ on can, even where the tokens match.

### On the stage

- A row of green ✓ under A's prompt bar, all along the system prompt: these positions have the same token id. (Only 13 ✓ are drawn, standing for all 512 positions.)
- A red ✕ at the end of the system prompt, with the red label: first difference: everything after is new. It is qA's first token against qB's first token.
- Grid and page tables as in step 2.
- Bottom line: this is why it's a prefix cache and not a substring cache: the match has to start at token 1.

### Formula

$$
m = d - 1
$$

| Symbol | What it is | Where from |
|---|---|---|
| $d$ | the first position where the two prompts' token ids differ | this step, the ✕ |
| $m$ | match length: positions whose k and v can be reused, positions $1 \dots m$ | this step |

On the stage $d = 513$, so $m = 512$, exactly the system prompt.

### Why nothing from $d$ on can be reused

- **Layer 1**: $k_i, v_i$ depend only on token $i$ and position $i$ (step 1).
- **Layer 2 and up**: layer 2's $x_i$ is layer 1's output at position $i$. By Ch. 2 Step 6, attention's output is $\text{out}_i = \sum_{j \le i} w_j v_j$, summed over every $j \le i$, with $w_j$ the softmax weights of Ch. 2 Step 5. So layer 2's $k_i, v_i$ depend on tokens $1 \dots i$.
- Change token $d$ and positions $d, d+1, \dots$ get different k and v in layers 2–32, even where their own token id is the same.
- The sums for positions $1 \dots d-1$ never include $d$ (Ch. 2 Step 7's causal rule: a position looks only at itself and earlier ones), so they are unchanged.

So a run of identical tokens in the middle of two prompts cannot be reused. The cache can only be looked up by prefix.

### Next

Step 4: with many requests, prefixes nest inside each other and are stored as a tree.

## Step 4 · Prefixes stored as a radix tree

> **In one line:** the system prompt is the root, the few-shot sets the second level, each request's question a leaf; each node is stored once, so 4 requests' 3,558 tokens take 1,472 tokens of cache.

### On the stage

- Row title: cached prefixes as a radix tree · each node owns the pages for its tokens.
- Root: blue box "system prompt · 512 tokens".
- Two blue boxes on the second level: few-shot set A · 300, few-shot set B · 250.
- Four orange leaves: q1 · 90 and q2 · 140 (under set A), q3 · 60 and q5 · 120 (under set B).
- Bottom line: 4 conversations, one copy of the system prompt: 512 tokens of cache instead of 2048 · a leaf is a live request.

### How to read the tree

- A node holds one run of consecutive tokens and owns the pages holding their k and v.
- A request's prompt = the nodes on the path from the root to its leaf, joined in order. q1's prompt is system prompt + set A + q1.
- It is a **radix tree** because a node holds a whole run rather than one token per node; it is split into two children only where two prompts diverge (step 3's $d$).
- In SGLang the tree is `RadixCache`, and reusing the KV cache through it is called RadixAttention.

### Formula

$$
\text{unshared} = \sum_{\text{leaves}} L,\qquad
\text{tree} = \sum_{\text{nodes}} \ell
$$

| Symbol | What it is | Where from |
|---|---|---|
| $\ell$ | tokens a node holds itself: the number in its box | this step |
| $L$ | a leaf's full prompt length = the sum of $\ell$ along its path from the root | this step |

### The numbers on the stage

| Leaf | $L$ |
|---|---|
| q1 | 512 + 300 + 90 = 902 |
| q2 | 512 + 300 + 140 = 952 |
| q3 | 512 + 250 + 60 = 822 |
| q5 | 512 + 250 + 120 = 882 |
| total (one copy each, as in step 1) | 3,558 |

The tree stores each node once: 512 + 300 + 250 + 90 + 140 + 60 + 120 = 1,472 tokens.

The bottom line counts just the root: 4 conversations share one 512, instead of 4 × 512 = 2,048.

In step 2's terms: the system prompt node has count 4 (all 4 running requests pass through it), sets A and B have 2 each, every leaf 1.

### Next

Step 5 brings a new request that matches its way down the tree.

## Step 5 · A newcomer walks the tree

> **In one line:** q4 has 992 tokens, matches the system prompt and set A for 812, and prefills only 180; first token in 4.8 ms instead of 16 ms, and 2 pages at admission instead of 8.

### On the stage

- Step 4's tree; the edge from the root to set A turns thick blue and both boxes fill light blue: the matched path.
- A new thick orange box "q4 (new) · 180" appears under set A, joined by an orange line.
- Two lines on the right: matched 812 of 992 tokens → prefill only 180; first token: 4.8 ms instead of 16 ms.
- Bottom line: pages needed at admission: 2 for the tail, not 8.
- Grey footnote: SGLang matches whole pages, so with 128-token pages this match would stop at 768; its default page is 1 token, where 812 is exact.

### Formula

$$
t_{\text{step}}(n) = \max\!\left(t_{\text{mem}},\ t_{\text{comp}}(n)\right)
$$

$$
t_{\text{mem}} = \frac{M_W}{BW},\qquad
t_{\text{comp}}(n) = \frac{n\,f}{F}
$$

| Symbol | What it is | Size | Where from |
|---|---|---|---|
| $n$ | tokens prefilled in this step | | this step |
| $m$ | match length | | step 3 |
| $M_W$ | bytes of weights | 16 GB | Ch. 4 Step 2; `W_GB` |
| $BW$ | HBM bandwidth | 3.35 TB/s | `BW` in `src/numbers.ts` |
| $f$ | math per token | 16 GFLOP | Ch. 4 Step 5; `GFLOP_PER_TOKEN` |
| $F$ | GPU math rate | 989 TFLOP/s | `TFLOPS` |
| $t_{\text{step}}(n)$ | time of a prefill step over $n$ tokens: the slower of reading the weights and the math | | Ch. 4 Steps 5 and 8 |

The first token waits for this prefill, so time to first token ≈ $t_{\text{step}}(\text{prompt length} - m)$.

### The numbers on the stage

| Quantity | Calculation | Result | On stage |
|---|---|---|---|
| q4's prompt | 512 + 300 + 180 | 992 | 992 |
| $m$ | 512 + 300 | 812 | 812 |
| to prefill | 992 − 812 | 180 | 180 |
| $t_{\text{mem}}$ | 16 ÷ 3.35 | 4.78 ms | |
| $t_{\text{comp}}(180)$ | 180 × 16 ÷ 989 | 2.91 ms, under the read | |
| $t_{\text{step}}(180)$ | max(4.78, 2.91) | 4.78 ms | 4.8 ms |
| $t_{\text{comp}}(992)$ | 992 × 16 ÷ 989 | 16.05 ms, over the read | |
| $t_{\text{step}}(992)$ | max(4.78, 16.05) | 16.05 ms | 16 ms |
| new pages at admission | $\lceil 180/128 \rceil$ | 2 | 2 |
| without a match | $\lceil 992/128 \rceil$ | 8 | 8 |

The admission check (Ch. 7 Step 7) counts only new pages; the 812 matched tokens already sit on the tree's pages.

### The footnote: whole-page matching

The tree stores whole pages. With page size $p$ the match length is rounded down to a multiple of $p$:

| $p$ | matched | to prefill |
|---|---|---|
| 128 (as drawn) | $\lfloor 812/128 \rfloor \times 128 = 6 \times 128 = 768$ | 992 − 768 = 224 |
| 1 (SGLang default) | 812 | 180 |

### Next

Step 6 turns to where this pays most: the next turn of the same conversation.

## Step 6 · Chat: each turn prefills only its new question

> **In one line:** turn $i$'s prompt is the whole conversation so far plus a new question; without the tree three turns prefill 2,410 tokens, with it 740.

### On the stage

- Row title: one conversation, three turns · what prefill has to compute for each turn.
- One row per turn, left to right:
  - the light-blue bar "turn 1 · 720 tokens · cached", "turns 1–2 · 950 tokens · cached": everything said before; turn 1 has none.
  - the blue bar: this turn's question, "system + q1 · 600" in turn 1, then q2 · 80 and q3 · 60.
  - the orange bar: this turn's answer, 120 and 150; turn 3 has no answer yet.
  - a line under each row: tokens prefilled without the tree · with it.
- Two lines at the bottom: the three-turn totals; the answer gets cached too, all but its last token: it's the prefix of the next turn.
- Grey footnote: plus one token a turn, explained below.

### Formula

$$
c(i) = \sum_{u < i} (q_u + a_u)
$$

$$
\text{without} = \sum_i \big(c(i) + q_i\big),\qquad
\text{with} = \sum_i q_i
$$

| Symbol | What it is | Where from |
|---|---|---|
| $q_i$ | tokens in turn $i$'s new question (turn 1 includes the system prompt) | this step, the blue bar |
| $a_i$ | tokens in turn $i$'s answer | this step, the orange bar |
| $c(i)$ | the whole conversation before turn $i$: the light-blue bar | this step |

Here $q_i$ is a question's length, not chapter 2's query vector. Turn $i$'s prompt = $c(i) + q_i$, and $c(i)$ is step 3's matched prefix: the earlier turns' tokens, in the same order.

### The numbers on the stage

| Turn | $c(i)$ | $q_i$ | without: $c(i) + q_i$ | with: $q_i$ |
|---|---|---|---|---|
| 1 | 0 | 600 | 600 | 600 |
| 2 | 600 + 120 = 720 | 80 | 800 | 80 |
| 3 | 720 + 80 + 150 = 950 | 60 | 1,010 | 60 |
| total | | | **2,410** | **740** |

Without the tree the total grows with the conversation; with it, it depends only on the questions.

### Why the answer is in the tree

Each answer token decode produces is fed back into the model on the next step, and that is when its k and v are written (Ch. 3 Step 5). So the answer is cached too.

**The footnote's one token:** after the answer's last token is sampled the request ends; it is never fed back, so its k and v do not exist. The next turn computes from it, so turns 2 and 3 really prefill 81 and 61 tokens.

### Next

Step 7: the tree keeps growing, memory runs out, and some nodes have to go first.

## Step 7 · Eviction: least recently used first, running requests pinned

> **In one line:** once q3 and q5 finish, set B's branch drops to reference count 0; when the pool needs pages it is the least recently used branch and is taken back, while the nodes q1 and q2 run through stay pinned.

### On the stage

The animation has three phases:

1. Step 4's tree, with the green "📌 pinned" beside the root.
2. q3 and q5 turn grey with a green ✓ at their corner and the green label "finished · nobody using it".
3. q3 and q5 drop away; set B becomes a grey dashed box under a red "evicted" tag. Red lines below: the pool needs pages · set B is the least recently used branch → its 250 tokens of k and v return to the pool.

Bottom line: a node's pages are reclaimable when its reference count is zero; running requests keep their whole path pinned.

### The rules

- A finished request's nodes are **not deleted**: a later request with the same prefix can still match them.
- Step 2's reference count, on the tree, is "the number of running requests whose path passes through this node". When a request starts using a path, every node on it goes up by 1; when it finishes, down by 1.
- Nodes with count > 0 are **pinned**: those requests read the pages every decode step, so they cannot be taken back.
- When the pool needs pages, the **leaf** at count 0 that was used least recently goes first (LRU). A parent whose children are all gone and whose own count is 0 becomes a leaf and joins the candidates.

### The numbers on the stage

| Node | Count before | Count after |
|---|---|---|
| system prompt | 4 | 2 (q1, q2) → pinned |
| set A | 2 | 2 → pinned |
| set B | 2 | 0 |
| q3, q5 | 1 | 0 |

Memory taken back:

| Node | Tokens | Bytes (× 128 KB) |
|---|---|---|
| set B | 250 | 31.25 MB |
| q3 + q5 | 60 + 120 = 180 | 22.5 MB |
| total | 430 | 53.75 MB |

The red lines on the stage count only set B's 250; q3's and q5's 180 go back to the pool with it.

### In SGLang

- `RadixCache` nodes carry `lock_ref`, the reference count here; `inc_lock_ref` / `dec_lock_ref` walk the path to the root, adjusting each node.
- `evict` picks only from leaves at count 0, ordered by `--radix-eviction-policy`, default `lru`. So the actual order is q3 and q5 first, then set B once it has become a leaf.

### Eviction never breaks correctness

Only cache is evicted. A later request with the same prompt gets a smaller step-5 $m$ and prefills more; the result is the same.

### Next

Step 8: can the scheduler use "who matches most" to choose the order?

## Step 8 · The scheduler orders by match length

> **In one line:** for the same three waiting requests, first come, first served runs X, Y, Z in arrival order; longest prefix match sorts by $m$, largest first, into X, Z, Y. SGLang defaults to the first.

### On the stage

- Row title: the same three waiting requests · which one gets the next prefill batch?
- A grey panel above, "first come, first served · SGLang default", and a blue one below, "longest prefix match · opt-in". A downward "time" arrow on the left of each: higher runs first.
- One bar per request: light blue is the part already in the tree ($m$), dark blue the part that must be prefilled; on the right, "prefill N of total · time".
- Legend at the bottom: light blue = already in the tree, dark blue = must be prefilled.
- Grey footnote: SGLang: `--schedule-policy lpm` (default `fcfs`) · lpm falls back to fcfs past 128 waiting requests.

### The numbers on the stage

Each time is step 5's $t_{\text{step}}(n - m)$, with $n$ the prompt length:

| Request | $n$ | $m$ | $n - m$ | $t_{\text{comp}}$ | $t_{\text{step}}$ | On stage |
|---|---|---|---|---|---|---|
| req X | 992 | 812 | 180 | 2.91 ms | max(4.78, 2.91) = 4.78 ms | 4.8 ms |
| req Y | 700 | 0 | 700 | 11.32 ms | 11.32 ms | 11 ms |
| req Z | 900 | 512 | 388 | 6.28 ms | 6.28 ms | 6.3 ms |

- req X is step 5's q4: it matches the system prompt + set A.
- req Z matches only the 512-token system prompt.
- req Y matches nothing.

### The two orders

| Policy | How it sorts | Order on stage |
|---|---|---|
| first come, first served (fcfs) | arrival | X, Y, Z |
| longest prefix match (lpm) | by $m$, largest first | X (812), Z (512), Y (0) |

- Total prefill is the same either way: 180 + 700 + 388 = 1,268 tokens.
- What the order changes: a waiting request's prefix can be evicted by step 7 before it is admitted. lpm runs the best-matched requests first, while their prefixes are still in the tree.
- Under either policy a request's prefix is matched when it is admitted, so reuse happens anyway; lpm only changes the order.

### In SGLang

- `--schedule-policy` defaults to `fcfs`.
- With `lpm`, more than 128 waiting requests (`WAITING_QUEUE_PREFIX_MATCH_MAX`) switch it back to fcfs for that round: matching every waiting request against the tree and sorting them on every step costs CPU time.

### Next

Who receives these requests, and how the generated tokens get back to the user: chapter 9.
