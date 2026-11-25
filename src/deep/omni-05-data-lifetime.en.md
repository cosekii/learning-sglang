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

## Step 2 · DataRef is a descriptor for finding data

> **In one sentence:** DataRef uses `object_id`, `transport` and `buffer` to describe how to find data, while the tensor bytes remain in the backend.

### What the picture shows

- The left box is the sender backend. Its large blue block holds payload A's tensor bytes. The white card in the middle is the DataRef, and `talker_ar` is the receiver on the right.
- This example shows four rows. `version = 1` selects the wire format, `object_id = A` names the data object, `transport = SHM` selects the backend, and `buffer = info + length` carries the backend's read information and byte length.
- The arrow between the payload and card means that the card describes the data. It does not copy tensor bytes into the card. The arrow to the receiver means that the descriptor lets the reader locate A.
- The figure keeps only the fields needed to find data. `kind`, `layout`, `header`, `tensors` and other fields describe the data kind, layout and tensor reconstruction.

### How the fields connect

| Field | This example | What the reader uses it for |
|---|---|---|
| `version` | 1 | Parse version 1 of the wire format |
| `object_id` | A | Identify the requested data object |
| `transport` | SHM | Select the SHM relay |
| `buffer.info` | Backend-returned information | Locate data in the backend |
| `buffer.length` | Byte length | Allocate enough receive space |

`BackendRef` obtains `length` from the relay operation's `op.metadata["transfer_info"]["size"]`. It is a byte count reported by the backend, not a tensor count or an invented capacity for this example.

### What DataRef does not contain

DataRef has no reader count, reference count or ACK state. It is a serializable descriptor, not a smart pointer that tracks every reader. The sender creates a separate lifetime record during publication, which the next step introduces.

Fan-out calls the send path once per target. Each target has its own send and Pending/ACK lifecycle; one DataRef does not maintain a multi-reader reference count.

### Where transport comes from

Before creating the DataRef, Router selects a path from the two stages' locations and the payload's devices. Ordinary payloads can use `LOCAL_OBJECT`, `MOONCAKE`, `CUDA_IPC` or `SHM`. Full-payload routing also scans tensor devices: CPU-only data uses SHM, while unsupported combinations fail. This example fixes the choice to SHM and does not repeat the four data planes.

`LOCAL_OBJECT` is a same-process bypass without a relay. Direct PyTorch CUDA IPC also bypasses the generic get/ACK chain. Later steps therefore cover the generic relay path.

### Source references

- `sglang_omni/comm/data_ref.py:117-133`: DataRef fields; `40-67`: `TensorMeta`; `70-99`: `BackendRef` and byte length; `135-216`: wire format, version 1 and field validation.
- `sglang_omni/comm/router.py:215-252`: ordinary payload routing; `263-299`: relay creation and the relay-free `LOCAL_OBJECT` path; `301-320`: tensor-device scan.
- `sglang_omni/pipeline/stage/runtime.py:774-790`: direct PyTorch CUDA IPC bypass; `1939-1954`: per-target sends.

All line numbers refer to `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`.

### Next

Step 3 publishes this descriptor and creates a `PendingTransfer` record that waits for the receiver's ACK.
