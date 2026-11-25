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

## Step 3 · Publication leaves a record waiting for acknowledgement

> **In one sentence:** After the relay write, the sender registers `PendingTransfer` by `object_id` and publishes the DataRef; `send_payload()` can return before the receiver reads.

### What the picture shows

- The first box contains the `RelayOperation` that wrote payload A. A completed write does not mean a completed operation because the transfer still uses the blue data.
- The second box is the sender's `pending[A]`. It shows `ops` and a waiting `ack`; key A matches the DataRef's `object_id`.
- The third box is the `DataReady` control message sent to `talker_ar`, carrying the serialized DataRef. Its arrow means that the notice was sent, not that the data was read.
- The bottom status separates “write + notice complete” from “receiver read.” The figure does not show a scheduler or application computation.

### The call sequence

| Order | Action | What remains |
|---|---|---|
| 1 | `stage_io.write_payload()` extracts and packs tensors, then calls the relay's put | A DataRef and a live `RelayOperation` |
| 2 | `publish_data_ready()` registers `PendingTransfer` by `object_id` | Operations, an ACK future and watcher state |
| 3 | Send `DataReadyMessage(data_ref=data_ref.to_dict())` | A DataRef the receiver can parse |
| 4 | Start `watch_pending()` after sending the control message | A background task waiting for ACK |
| 5 | The worker completes `job.ready` | The waiting `send_payload()` can return |

SHM uses `put_chunks_async()`, while other relays use `put_async()`. Both return an asynchronous operation and receiver metadata. Finishing the put does not mean that the receiver consumed the data.

### What PendingTransfer stores

The generic record holds `ops`, an `ack` future, an optional KV lease, a watcher task and terminal-state flags. The sender's record owns the ACK state; DataRef does not. On the normal path, the watcher advances cleanup after the ACK, as Step 5 explains.

Fan-out gives each target its own send and Pending/ACK lifecycle. The figure follows one send from A to one `talker_ar`.

### Source references

- `sglang_omni/comm/stage_io.py:496-534`: payload write, DataRef construction and returned operation.
- `sglang_omni/comm/relay/base.py:91-145`: relay put/get interface and asynchronous operation contract.
- `sglang_omni/comm/engine.py:68-75`: `PendingTransfer` fields; `222-270`: `send_payload()` waiting for `ready`; `1011-1038`: worker write; `1052-1061`: `job.ready` completion; `1125-1208`: pending registration, DataReady send and watcher start.

Line numbers refer to `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`.

### Next

Step 4 starts with DataReady at the receiver: it uses the DataRef to read and rebuild the payload, then sends an ACK.

## Step 4 · Acknowledge the read before scheduling

> **In one sentence:** The receiver selects a relay from the DataRef, reads and rebuilds the payload, then sends an ACK before handing the payload to its input handler.

### What the picture shows

- The first box parses the DataRef, selects a relay from `transport`, and uses `buffer.info` to locate backend data.
- The second box allocates a `uint8` receive buffer using `buffer.length`, calls `get_async()`, and waits for the read to complete.
- The third box uses `TensorMeta`'s `path/shape/dtype/device/offset/size` to reconstruct tensors and the payload. The figure shows the fields related to slicing, shape and device.
- The fourth box is a successful ACK with `object_id = A` and `success = true`. The ACK returns to the sender, while the rebuilt payload continues to the input handler and then the scheduler.
- The order is “read complete → ACK → input handler.” The ACK does not mean that `talker_ar` finished computing or that the whole request finished.

### The generic receive chain

| Order | Call or message | Result |
|---|---|---|
| 1 | Receive `DataReadyMessage` and deserialize DataRef | Object, transport and backend descriptor |
| 2 | `CommEngine.read_data()` | Relay selection and data read |
| 3 | `relay.get_async(buffer.info, dest_tensor)`, then wait | Bytes in the receive buffer |
| 4 | Slice using tensor metadata and restore the payload | A data object for this stage |
| 5 | `DataAckMessage(object_id=A, success=true)` | A read receipt the sender can match |
| 6 | The input handler receives the payload | Later scheduler input |

A failed read also produces an ACK, but with `success=False` and error information. Cleanup and stage-failure reporting follow. That ACK reports a terminated, failed read, not successful consumption.

### Cleanup is not universal sender-data release

The `relay.cleanup(request_id)` call after reconstruction is a request-level backend cleanup hook. Router invokes it across active relays. Its name does not imply deleting the sender's data or immediately freeing memory in every backend. The next step's ACK watcher and concrete `RelayOperation` still handle normal sender-resource completion.

### Source references

- `sglang_omni/pipeline/stage/runtime.py:794-801`: DataRef extraction, relay selection and `read_data()`; `802-812`: failure ACK, cleanup and failure reporting; `813-817`: successful ACK before the input handler.
- `sglang_omni/comm/stage_io.py:826-842`: receive-buffer allocation, get and wait; `537-568`: payload/tensor reconstruction and cleanup.
- `sglang_omni/proto/messages.py:235-273`: `DataAckMessage`'s `object_id`, `success` and error fields.
- `sglang_omni/comm/router.py:409-418`: request-level relay cleanup.

Line numbers refer to `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`.

### Next

Step 5 returns to the sender: match the ACK's `object_id` to pending, finish the operation, and remove the lifetime record.

## Step 5 · ACK completes operations before the record disappears

> **In one sentence:** The sender completes pending's ACK future by `object_id`, then its watcher notifies and awaits each operation before removing the record; each backend controls its own resource reclamation.

### What the picture shows

- The first box receives `DataAck(A)`. `ack_transfer()` uses A to find `pending[A]`; a successful ACK completes that record's ACK future.
- The second box is `watch_pending()` on its normal path. It calls `mark_receiver_done()` for every operation, then awaits `wait_for_completion()` for each one.
- In the third box, `pending: no A` means that the lifetime record has been removed. “Backend may reclaim” is not an animation of immediate universal deletion. Each concrete operation handles its SHM block, CUDA slot or other backend resource.
- The bottom line states that the generic layer has no universal `release()` method. Its interface provides put/get/cleanup/close and operation-completion notifications; concrete relays own resource semantics.

### The normal completion chain

| Order | Action | Result |
|---|---|---|
| 1 | `ack_transfer()` looks up pending by `ack.object_id` | Finds this transfer's waiting record |
| 2 | A successful ACK completes `pending.ack` | The watcher can continue |
| 3 | Each `op.mark_receiver_done()` | Tells the concrete operation that the receiver finished reading |
| 4 | Each `op.wait_for_completion()` | Waits for concrete backend completion |
| 5 | `pending.pop(object_id)` | Removes the sender's lifetime record |
| 6 | If a KV lease exists, `lease.release()` | Releases that additional lease |

A stale ACK whose pending record no longer exists is ignored. A failed ACK stores an exception in `pending.ack` instead of running the successful path.

### Failure and retention boundaries

The ordinary failure path calls `mark_receiver_failed()` and waits for operation completion. A KV transfer marked `retain_pending_on_failure` keeps its pending record if no receiver terminal has arrived, because the peer may still read and its resources cannot be released early.

The figure's “backend may reclaim” therefore describes normal completion permission. It does not promise immediate, identical memory release in every backend or failure case.

### Source references

- `sglang_omni/pipeline/stage/runtime.py:539-557`: `DataAckMessage` receipt and `ack_transfer()` entry.
- `sglang_omni/comm/engine.py:930-971`: pending lookup by `object_id`, stale-ACK handling and ACK-future completion or failure; `1210-1224`: normal operation completion; `1260-1268`: pending removal and optional lease release; `1225-1259` and `1290-1313`: failure and retention paths.
- `sglang_omni/comm/relay/base.py:91-153`: generic relay and operation interfaces, with no universal `release()`.

Line numbers refer to `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`.

### Next

The chapter's answer is now complete. DataRef locates data, pending tracks the read, and the ACK/operation chain postpones reclamation until after reading. A slow reader retains resources longer; the next chapter uses queues and backpressure to connect stages running at different speeds.
