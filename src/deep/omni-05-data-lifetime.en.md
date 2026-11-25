## Step 1 · Do not reuse space while its reader is active

> **In one sentence:** This example has one storage space, so `talker_ar` must finish reading A before B can safely replace it.

### What the picture shows

- The example follows the earlier `thinker → talker_ar` handoff and constructs two results, A then B. It assumes one reusable storage space so that the conflict is visible.
- The left panel shows the unsafe order. B takes the space while A is still being read. The location that held A now holds B, so a reader asking for A reads B instead.
- The right panel shows the safe order. A remains in the space and B waits outside. B can enter only after the reader finishes A.
- Blue marks the result being read and therefore retained. Orange marks the next result. The letter inside the space tells you which result a reader would obtain there.
- This step does not choose a data plane, CPU or GPU memory, shared memory or a network transport. The issue is simpler: new data cannot take a location while old data still uses it.

### Work through the numbers

Let $N=2$ be the number of results and $S=1$ the number of illustrative spaces. The number that cannot fit and must wait is:

$$W=N-S=2-1=1$$

| Symbol | Meaning | Source |
|---|---|---|
| $N$ | Total results in this example | The constructed results A and B |
| $S$ | Spaces available at once | The one-space teaching assumption |
| $W$ | Results waiting for space | Two results minus one space |

Both 2 and 1 belong to the teaching example. They are not a default pool size, memory budget, request limit or measured concurrency. $W=1$ does not claim that a real system always has one waiting result.

### Why waiting preserves the correct read

The reader needs more than evidence that A once existed. A must remain at its location throughout the read. If the owner reuses that location first, its contents no longer match the A that the reader requested. Making B wait postpones reuse until A's read has finished.

Two implementation questions remain. The reader must find A's location, and the owner must learn that the read has finished. The next step introduces DataRef as the handle for the result's location and metadata. A later step adds the completion acknowledgement.

### Boundaries and sources

This teaching construction does not claim that SGLang-Omni has one slot. Waiting here does not mean that the entire pipeline stops. An implementation can place B in another space or queue; this example removes that choice to expose unsafe reuse.

Chapter 18 Steps 2–8 of the first book introduced separate data and notification paths, acknowledgement after reading, and several data planes. This chapter follows the handle and lifetime records instead of repeating those routes. The source revision is `sglang-omni origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`; the next step begins the exact DataRef field and call-chain references.

### Next

Step 2 explains how a DataRef lets a reader find data in another process or on another device.
