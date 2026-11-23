## Step 1 · What crosses each edge, how big, how often

> **In one line:** What crosses Ch. 17 Step 12's eight edges ranges from one token id to 3,136 KB of embeddings, sent once per request or once per token.

### On the stage

- Top: Ch. 17 Step 12's seven stages, with the eight edges drawn in red and their numbers in red circles.
- Bottom: a table with one row per edge and the columns "edge, what crosses, size, how often". The repeating edges, 6–8, have their "how often" in dark text.
- The last row, "9–11": `talker_ar` builds its own prompt from the same inputs as rows 3–5. Those three edges are not drawn in the graph (second footnote).

### Formula

Every size starts from the size of one vector:

$$
b_{\text{vec}} = D \times B,\qquad
S_4 = N_{\text{img}} \times b_{\text{vec}},\qquad
S_5 = N_{\text{aud}} \times b_{\text{vec}}
$$

| Symbol | What it is | Size | Where it comes from |
|---|---|---|---|
| $D$ | the thinker's width, numbers in one vector | 2,048 | `OMNI_HIDDEN` in `src/numbers.ts` |
| $B$ | bytes per number, bf16 (a 16-bit float) | 2 B | `BYTES` in `src/numbers.ts` |
| $b_{\text{vec}}$ | the size of one vector or one encoder embedding | 4 KB | this step |
| $N_{\text{img}}$ | positions the photo takes in the prompt | 784 | Ch. 16 Step 2 |
| $N_{\text{aud}}$ | positions the question takes in the prompt | 130 | Ch. 16 Step 2 |
| $S_4, S_5$ | bytes edges 4 and 5 carry | | this step |

An encoder embedding takes one position in the thinker's prompt, so it has the thinker's width, $D$, too.

### The numbers on the stage

| Edge | Arithmetic | Result |
|---|---|---|
| 7 | $2{,}048 \times 2\ \text{B} = 4{,}096\ \text{B}$ | 4 KB |
| 4 | $896 \div 32 = 28$, $28 \times 28 = 784$; $784 \times 4\ \text{KB}$ | 3,136 KB |
| 5 | $10\ \text{s} \times 100 = 1{,}000$ frames, 13 positions per 100 frames → 130; $130 \times 4\ \text{KB}$ | 520 KB |
| 1 | $896 \times 896 \times 3$ (red, green, blue) | 2,408,448 values |
| 2 | $10\ \text{s} \times 100$ | 1,000 feature frames |
| 8 | $10\ \text{frames} \times 16$ codes | 160 numbers |

The 32 on edge 4: each patch is 16 pixels a side, merged 2 × 2, so one position covers 32 pixels a side. Edge 8's 10 frames are $10 \times 80\ \text{ms} = 800\ \text{ms}$ of sound (each frame is $1{,}920 \div 24{,}000\ \text{s} = 80\ \text{ms}$, Ch. 16 Step 3).

### The two halves of the cost

- **Size:** the largest message is edge 4's 3,136 KB, sent once.
- **Frequency:** edges 6 and 7 are sent every token and edge 8 every 10 frames, and each is a few KB or less.

### Next

Step 2 zooms in on edge 7 and follows one hand-off hop by hop.

## Step 2 · One hand-off: the data and the notice go separately

> **In one line:** A hand-off has two parts: the data goes where the receiver can read it, and a small notice over ZMQ says where; when the receiver has read it, an ack lets the sender free the space.

### On the stage

- Left box: `thinker` on GPU 0; right box: `talker_ar` on GPU 1. Both are drawn as in Ch. 17 Step 2: the runtime on top (talks to other stages), the outbox / inbox in the middle, the scheduler at the bottom (its own loop).
- Between them, at the top, the control plane, one ZMQ socket: the solid line to the right is the notice, the dashed line to the left the ack.
- Between them, at the bottom, the blue data-plane box: space the receiver can read.
- The orange pill `vector`: this token's 4 KB vector (step 1, edge 7). The line under the picture names the current hop.
- The "loops" bar in the top right: the animation repeats.

### The seven hops

| Hop | Where | What happens |
|---|---|---|
| 1 | in the thinker | the scheduler puts the vector in the outbox |
| 2 | in the thinker | the runtime takes it and looks up the next stage, `talker_ar` |
| 3 | data plane | the runtime writes the vector where `talker_ar` can read it |
| 4 | control plane | a notice over ZMQ says where the vector is |
| 5 | in talker_ar | the runtime wakes on the notice and reads the vector |
| 6 | control plane | an ack goes back; the data-plane box turns white and dashed, freed |
| 7 | in talker_ar | the vector goes into the inbox; the scheduler takes it at its own pace |

ZMQ is the queue between processes from Ch. 9 Step 6.

### SGLang-Omni's names

- The notice is a `DataReadyMessage`: it names the request, the two stages and where the data is.
- The ack is a `DataAckMessage`: the sender reuses the space only after it arrives.
- How the data plane works depends on the edge (step 4).

### Next

Step 3 answers why the data itself does not go inside the ZMQ message.

## Step 3 · Why the notice and the data travel apart

> **In one line:** A ZMQ message is bytes in CPU memory, so a vector on a GPU sent through ZMQ moves 4 times; sent on its own, GPU to GPU, it moves once.

### On the stage

- Top row, "everything through ZMQ": five boxes, `GPU 0 memory → CPU memory → ZMQ socket → CPU memory → GPU 1 memory`, four red arrows labelled "out of the GPU, into the socket, out of the socket, back to a GPU", and "4 trips" in red below.
- Bottom row, "notice through ZMQ, data on its own path": a thick blue arrow between two blue boxes, GPU 0 and GPU 1, "1 trip, GPU to GPU"; below it a grey dashed line through a `ZMQ socket` box carries only the notice.
- Two dotted statements and a footnote (trips count whole moves of the data; boxes not to scale).

### Formula

$$
\text{bytes moved} = n_{\text{trip}} \times S
$$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $n_{\text{trip}}$ | times the whole payload moves from one memory to another | this step: 4 on top, 1 below |
| $S$ | size of the data to deliver | step 1 |

### The numbers on the stage

| Data | $S$ | All through ZMQ ($n_{\text{trip}} = 4$) | Apart ($n_{\text{trip}} = 1$) |
|---|---|---|---|
| edge 7, every token | 4 KB | $4 \times 4 = 16$ KB | 4 KB |
| edge 4, the encoder's embeddings | 3,136 KB | $4 \times 3{,}136 = 12{,}544$ KB | 3,136 KB |

### Why the split lets each edge choose

- A notice is a few fields, which suits ZMQ.
- The notice looks the same whatever path the data takes, so each edge can pick its own data path.

### Next

Step 4 lists the four paths the data can take; the GPU-to-GPU path in the bottom row is step 6.

## Step 4 · Four paths, picked by where the two stages sit

> **In one line:** SGLang-Omni picks each edge's data path from where its two stages sit; there are four cases, from one process to two machines.

### On the stage

A four-row table, one path per row, with the columns "where the two stages sit (small picture), the data goes by, what happens, in Qwen3-Omni":

- Legend for the pictures (footnote): a dashed outline is a process, a solid outline a machine, blue boxes are stages on a GPU, the grey box a stage on the CPU.
- In the "goes by" column, CUDA IPC is in blue and shared memory in orange, the edge colours of step 9.

| Row | Where the stages sit | Data goes by | What happens | Qwen3-Omni default |
|---|---|---|---|---|
| 1 of 4 | one process | a reference | nothing moves; the receiver gets the same object | none |
| 2 of 4 | one machine, both on GPUs | CUDA IPC | the receiver opens the sender's GPU memory | edges 4, 5, 7, 8 |
| 3 of 4 | one machine, one end on the CPU | shared memory | both processes map the same CPU memory | edges 1, 2, 3, 6 |
| 4 of 4 | two machines | Mooncake | network cards copy machine to machine | none |

### The rule, in the source

SGLang-Omni's `CommRouter` (`comm/router.py`) checks in this order:

1. The target stage is in the same process → `LOCAL_OBJECT`.
2. The target is on another machine → `MOONCAKE`.
3. The data is on a GPU and both ends are GPU stages → `CUDA_IPC`; if the two GPUs cannot read each other's memory, it falls back to `SHM`.
4. Otherwise → `SHM`.

### The numbers on the stage

Eight edges: $4 + 4 = 8$. Path 1 is unused because Ch. 17 Step 4 gave every stage its own process; path 4 is unused because both GPUs are in one machine.

### Next

Steps 5–8 take the rows one per step, in this order.

## Step 5 · 1 of 4: one process, the object itself

> **In one line:** When two stages share a process, the sender hands over a reference to the Python object: no copy, no notice; the cost is that the receiver must not change it.

### On the stage

- The grey dashed outline: one process, one Python interpreter and one memory (Ch. 17 Step 3).
- Two blue boxes: stage A (sender) and stage B (receiver), joined by a black arrow, "a direct call, with a reference".
- The orange box `the payload`: the single copy in memory. Two orange arrows from A and B point at it: "A still holds it", "B now holds it too".
- Three dotted statements and a footnote.

### What it skips from step 2

It skips hops 3–6, because the call is the hand-off:

- Hop 3: no write to a data plane.
- Hop 4: no notice over ZMQ.
- Hop 5: no separate read; B already has the reference.
- Hop 6: no ack, since there is no space to free.

### The cost, and the measurement

- **Sharing:** A and B hold the same object; if B changed it, A would see the change, so B only reads it.
- **33%:** SGLang-Omni's design notes (PR #496) report that its text-only pipeline, with every stage in one process, cut mean latency by 33% when it switched to passing references.
- SGLang-Omni calls this path `LOCAL_OBJECT`.

### Next

Step 6: the two ends are in different processes and the data is on a GPU.

## Step 6 · 2 of 4: CUDA IPC, a handle to GPU memory

> **In one line:** When the data is on a GPU and both ends are GPU stages in one machine, the notice carries a handle, and the receiver uses it to open the sender's GPU memory and read.

### On the stage

Still edge 7, with step 2's 4 KB vector.

- Left box, GPU 0 (the thinker): "a pool of slots, set aside at start", drawn as 6 slots with slot 2 in orange. ① The vector, in slot 2.
- The white box in the middle, ② a handle, `GPU 0, slot 2`, "in the notice, over ZMQ", with a black arrow to the right box.
- The blue curve ③: `talker_ar` reads it over the link between the GPUs; an orange copy of the vector appears on GPU 1.
- The dashed line at the bottom ④: the ack, so slot 2 can take the next vector.
- Three dotted statements and a footnote (CUDA IPC is NVIDIA's way for one process to open another's GPU memory; the link is NVLink, or PCIe without it).

### The numbers against step 2's hops

| On the stage | Step 2 |
|---|---|
| ① written into slot 2 | hop 3; the slot is that step's data-plane box |
| ② the handle rides the notice | hop 4 |
| ③ read across the link, a copy on GPU 1 | hop 5, and step 3's bottom row, 1 trip |
| ④ the ack frees the slot | hop 6 |

### How big the pool is, in the source

The 6 slots are a drawing. SGLang-Omni's CUDA IPC relay defaults to a pool of $512\ \text{MB} \times 2 = 1{,}024\ \text{MB}$ in 64 KB slots, $1{,}024 \times 1{,}024 \div 64 = 16{,}384$ of them. One 4 KB vector fits in one slot. The slot count is fixed, so a sender that runs ahead waits for acks to free a slot instead of filling GPU memory.

### Edges on one GPU

Edges 4 and 5 have both ends on GPU 0, so their data does not cross the link. The source differs in detail: `image_encoder` → `thinker` takes the same-GPU direct path, sharing the tensor's own handle without the pool; `audio_encoder`'s config turns that path off, so it goes through the pool and the receiver copies out of the slot within GPU 0.

### The fallback

If the two GPUs cannot read each other's memory, `CommRouter` sends the edge over shared memory instead (step 7).

### Next

Step 7: edges with one end on the CPU.

## Step 7 · 3 of 4: shared memory, written once, read in place

> **In one line:** When the data is in CPU memory, or one end is a CPU stage, the sender writes it into shared memory that both processes map, and the receiver reads it in place.

### On the stage

Edge 1 from step 1: `preprocessing` on the CPU sends the photo to `image_encoder` on GPU 0.

- Two grey dashed outlines: separate processes, which share no memory by default. The grey box on the left is `preprocessing · CPU`, the white box on the right `image_encoder · GPU 0`.
- The orange box in the middle, `shared memory`: CPU memory both processes map.
- Orange arrows ① written once and ③ read in place; a black arrow between the boxes, ② the notice over ZMQ; "then copied to GPU 0" at the right.
- Two dotted statements and a footnote.

### The numbers on the stage

- Edge 1 writes $896 \times 896 \times 3 = 2{,}408{,}448$ values (step 1).
- Counted as in step 3: one write and one read in place, against 4 trips through ZMQ. After reading, `image_encoder` still copies the photo onto GPU 0 to compute on it.

### Which edges take it

| Edge | Why |
|---|---|
| 1, 2, 3 | they start at `preprocessing` on the CPU, with data in CPU memory |
| 6 | the target, `decode`, is a CPU stage; token ids go to it |
| GPU edges that fall back | the case step 6 described, where CUDA IPC is not possible |

SGLang-Omni calls this path `SHM`.

### Next

Step 8: the receiver is on another machine, out of reach of both shared memory and a handle.

## Step 8 · 4 of 4: Mooncake, across machines

> **In one line:** When the receiver is on another machine, Mooncake moves the data: the network cards read the sender's memory and write the receiver's directly, with no copy through either CPU.

### On the stage

- Two solid outlines: machine 1 and machine 2. Each holds a stage, its memory (orange box) and a network card (white box).
- An orange line from machine 1's memory through both network cards to machine 2's memory, labelled "the network (RDMA)".
- Two dotted statements and two footnotes (RDMA is remote direct memory access; Mooncake is the transfer engine SGLang-Omni uses; setups across machines are left to the multi-GPU part).

### Against step 2

- Only the data path of hops 3 and 5 changes.
- The notice and the ack still go over ZMQ, now between machines.
- SGLang-Omni calls this path `MOONCAKE`; `CommRouter` picks it whenever the target stage is on another machine, whether the data is on a GPU or the CPU.

### Why the default layout does not use it

Step 4 found that Qwen3-Omni's two default GPUs are in one machine. SGLang's multi-GPU part uses the same Mooncake to move KV cache between servers (chapter 28).

### Next

Step 9 applies step 4's rules to the default layout's eight edges.

## Step 9 · The default layout, edge by edge

> **In one line:** In Qwen3-Omni's default layout, the four GPU-to-GPU edges take CUDA IPC, the four edges with a CPU end take shared memory, and no two stages share a process.

### On the stage

- Step 1's graph with each edge coloured by its path: blue (`--accent`) is CUDA IPC, orange (`--gen`) is shared memory.
- Four legend lines below, each with a swatch; the two unused paths say why.
- One line: the edges that run every token, 6 and 7, never send their data through ZMQ.
- Two footnotes: edges 9–11 follow the same rules; this follows `CommRouter`'s rules and was not traced on a running server.

### The numbers on the stage

| Path | Edges | Why |
|---|---|---|
| CUDA IPC (2 of 4) | 4, 5 | encoders → thinker, all on GPU 0, no link crossed |
| CUDA IPC (2 of 4) | 7 | thinker on GPU 0 → `talker_ar` on GPU 1, across the link |
| CUDA IPC (2 of 4) | 8 | `talker_ar` on GPU 1 → `code2wav` on GPU 0, across the link |
| shared memory (3 of 4) | 1, 2, 3 | they start at `preprocessing` on the CPU |
| shared memory (3 of 4) | 6 | it ends at `decode` on the CPU |
| a reference (1 of 4) | none | every stage has its own process (Ch. 17 Step 4) |
| Mooncake (4 of 4) | none | both GPUs are in one machine |

In all, $4 + 4 = 8$ edges.

### Tied back to step 1's last column

The two edges sent every token are edge 6, one token id, and edge 7, a 4 KB vector. Neither puts its data through ZMQ, so neither pays step 3's 4 trips.

### The assumption

The picture assumes each tensor stays on the device that made it (`CommRouter` routes by where the data actually is). Edges 9–11: 9 starts at `preprocessing` and takes shared memory; 10 and 11 start at the encoders and take CUDA IPC.

### Next

Step 10 looks at one process outside the graph: the coordinator.

## Step 10 · The coordinator, one process outside the graph

> **In one line:** The coordinator sits outside the seven stages: it hands each request to the first stage, merges the text and sound that come out into one response, and on cancel sends an abort to every stage at once.

### On the stage

- `the client` at the top left, connected over HTTP (Ch. 9 Step 2) to the blue `coordinator` box, a process of its own.
- A row of the seven stages below.
- Black arrow ①: submit to the first stage, `preprocessing`.
- Two orange arrows ②: text from `decode` and sound from `code2wav` come back to the coordinator and are merged into one response.
- Red dashed line ③: abort, one message fanned out to every stage.
- Two dotted statements and a footnote (the abort uses ZMQ publish/subscribe).

### The three jobs, in the source

| Number | What it does | In SGLang-Omni |
|---|---|---|
| ① submit | hands a new request to the entry stage | `Coordinator`'s `entry_stage` |
| ② merge | with several terminal stages, the request ends only when all have finished | `terminal_stages` |
| ③ abort | one sender, every subscriber receives it | a `PubSocket` (`zmq.PUB`) sends an `AbortMessage`; each stage receives it on a `SubSocket` |

On an abort, each stage drops the request wherever it is in that stage's loop.

### What it does not touch

The coordinator handles requests, not their data: step 1's vectors, embeddings and codes pass directly between stages, never through it.

### Next

Step 11 returns to the layout: the paths follow from where the stages sit, so who decides where they sit?

## Step 11 · The paths follow the layout

> **In one line:** Which path an edge takes depends on where its two stages sit; Ch. 17 Step 4 put four stages on GPU 0 and `talker_ar` alone on GPU 1, and who decides that, and how one GPU's memory is split, is chapter 19's question.

### On the stage

- Left box, GPU 0: four stages, `image_encoder`, `audio_encoder`, `thinker`, `code2wav`; the memory box beside them is split into four red dashed shares, each marked `?`.
- Right box, GPU 1: only `talker_ar`; its memory box has one red dashed share and one `?`.
- Three dotted statements and a footnote.

### What the `?` marks

- Each red share is one stage's part of the memory; no step so far has said how big it is.
- Each of the four stages on GPU 0 needs room for its weights and working memory, and the thinker also for its KV cache.
- GPU 1 holds only `talker_ar`, which keeps that GPU busy 86% of the time with 8 requests at once (measured in PR #1235, Ch. 19 Step 1).

### Move a stage and the paths change

For example, put `talker_ar` on GPU 0: edges 7 and 8 then have both ends on GPU 0 and no longer cross the link. The paths change by step 4's rules.

### Next

Chapter 19 answers the footnote's two questions: who decides the layout, and how one GPU's memory is divided among the stages on it.
