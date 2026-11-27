## Step 1 · Do not reuse space while its reader is active

> **In one sentence:** This example has one storage space, so `talker_ar` must finish reading A before B can safely replace it.

### What the picture shows

- The example follows the earlier `thinker → talker_ar` handoff and constructs two results, A then B. It assumes one reusable storage space so that the conflict is visible.
- Both panels start with A in the space, `talker_ar` reading A, and B waiting outside. The left panel then shows the unsafe order: B takes the space while A is still being read, so a reader asking for A reads B instead.
- The right panel shows the safe order in two later phases. First `talker_ar` finishes reading A while B still waits. Only then does B enter the space; the final panel does not claim that B has been read.
- Blue marks A, the first result. Orange marks B, the next result. The letter inside the space tells you which result a reader would obtain there.
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

- The left box is the sender backend. Its large blue block holds payload A's tensor bytes. The animation starts with no descriptor, then builds the white DataRef card in the middle. SHM means shared memory.
- The constructed card shows four rows. `version = 1` selects the wire format, `object_id = A` names the data object, `transport = SHM` selects the backend, and `buffer = info + length` carries the backend's read information and byte length.
- The arrow between the payload and card means that the card describes the data. It does not copy tensor bytes into the card. In the last phase, `talker_ar` uses those fields to locate A, choose SHM and use the buffer information. This is a field-use preview, not a DataReady arrival or publication; Step 3 performs that send.
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

- The first box starts with payload A still writing. The relay write then returns DataRef(A) and a live `RelayOperation`; a completed write does not mean a completed operation because the transfer still uses the blue data.
- The second box starts with `pending: no A`. Only after the write returns does the sender create `pending[A]` with `ops`, a waiting `ack`, and key A matching the DataRef's `object_id`.
- The third box starts with `DataReady · not sent`. After pending registration, the `DataReady` control message goes to `talker_ar` with the serialized DataRef. Its arrow means that the notice was sent, not that the data was read or acknowledged.
- The bottom status then starts `watch_pending`, a background task waiting for the ACK. Only in the last phase does the worker complete `job.ready`, so `send_payload()` can return. The figure separates “write + notice complete” from “receiver read” and does not show a scheduler or application computation.

### The call sequence

| Order | Action | What remains |
|---|---|---|
| 1 | `stage_io.write_payload()` extracts and packs tensors, then calls the relay's put | A DataRef and a live `RelayOperation` |
| 2 | `publish_data_ready()` registers `PendingTransfer` by `object_id` | Operations, an ACK future and watcher state |
| 3 | Send `DataReadyMessage(data_ref=data_ref.to_dict())` | A DataRef the receiver can parse |
| 4 | Start `watch_pending()` after sending the control message | A background task waiting for ACK |
| 5 | The worker completes `job.ready` | The waiting `send_payload()` can return |

SHM uses `put_chunks_async()`, while other relays use `put_async()`. Both return an asynchronous operation and receiver metadata. Finishing the put does not mean that the receiver consumed the data. Tensor extraction and packing inside `stage_io.write_payload()` are implementation detail, not drawn on this slide.

### What PendingTransfer stores

The generic record holds `ops`, an `ack` future and a watcher task, all visible on this slide. It can also hold an optional KV lease and terminal-state flags, which are not drawn. The sender's record owns the ACK state; DataRef does not. On the normal path, the watcher advances cleanup after the ACK, as Step 5 explains.

Fan-out gives each target its own send and Pending/ACK lifecycle. The figure follows one send from A to one `talker_ar`.

### Source references

- `sglang_omni/comm/stage_io.py:496-534`: payload write, DataRef construction and returned operation.
- `sglang_omni/comm/relay/base.py:91-145`: relay put/get interface and asynchronous operation contract.
- `sglang_omni/comm/engine.py:68-75`: `PendingTransfer` fields; `222-270`: `send_payload()` waiting for `ready`; `1011-1038`: worker write; `1052-1061`: `job.ready` completion; `1125-1208`: pending registration, DataReady send and watcher start.

Line numbers refer to `origin/main@0e641996a0c269601d03f1cb29d3f46d7cb345a6`.

### Next

Step 4 starts with DataReady at the receiver: it uses the DataRef to read and rebuild the payload, then sends an ACK.

## Step 4 · Acknowledge the read before scheduling

> **In one sentence:** For SHM, the receiver copies the bytes, closes and unlinks the shared block, rebuilds the payload, then sends an ACK before handing the payload to its input handler.

### What the picture shows

- The first box parses the DataRef, selects a relay from `transport`, and uses `buffer.info` to locate backend data.
- The second box allocates a `uint8` receive buffer using `buffer.length` and calls `get_async()` to create a `ShmGetOperation`. The animation then awaits that operation's `wait_for_completion()`: it copies into the buffer, closes the receiver's handle and unlinks the block's name before returning the copied buffer.
- The third box uses `TensorMeta`'s `path/shape/dtype/device/offset/size` to reconstruct tensors and the payload. The figure shows the fields related to slicing, shape and device.
- The fourth box is a successful ACK with `object_id = A` and `success = true`. The ACK returns to the sender, while the rebuilt payload continues to the input handler and then the scheduler.
- The order is “copy → close + unlink → rebuild → ACK → input handler.” The ACK does not mean that `talker_ar` finished computing or that the whole request finished.

### The SHM receive chain

1. Receive `DataReadyMessage` and deserialize DataRef: object, transport and backend descriptor.
2. `CommEngine.read_data()`: relay selection and data read.
3. <code>relay.get_async(<wbr>buffer.info,<wbr> dest_tensor)</code>: a receiver-side `ShmGetOperation`.
4. `await op.wait_for_completion()`: starts waiting on that operation; the copy and cleanup happen inside this wait.
5. <code>dest_view[:size].<wbr>copy_(<wbr>src_tensor[:size])</code>: bytes in the receive buffer.
6. In the same wait's `finally`, <code>existing_shm.<wbr>close()</code> then <code>existing_shm.<wbr>unlink()</code>: the receiver closes its handle and removes the shared block's name.
7. <code>read_transfer_<wbr>buffer()</code> returns the copied buffer, then slicing restores the payload for this stage.
8. `DataAckMessage(object_id=A, success=true)`: a read receipt the sender can match.
9. The input handler receives the payload for later scheduler input.

A failed read also produces an ACK, but with `success=False` and error information. Cleanup and stage-failure reporting follow. That ACK reports a terminated, failed read, not successful consumption.

### Cleanup is not universal sender-data release

The `relay.cleanup(request_id)` call after reconstruction is a request-level backend cleanup hook. `ShmRelay.cleanup()` is a no-op: the concrete close and unlink already happened inside `ShmGetOperation.wait_for_completion()`. Router invokes the generic hook across active relays, but its name does not imply another sender-data deletion. The next step's ACK watcher and `ShmPutOperation` handle normal sender completion.

### Source references

- <code>sglang_omni/pipeline/stage/<wbr>runtime.py:794-801</code>: DataRef extraction, relay selection and `read_data()`; `802-812`: failure ACK, cleanup and failure reporting; `813-817`: successful ACK before the input handler.
- `sglang_omni/comm/stage_io.py:826-842`: receive-buffer allocation, get and wait; `537-568`: payload/tensor reconstruction and cleanup.
- `sglang_omni/relay/shm.py:142-189`: SHM copy followed by close and unlink; `261-275`: `ShmRelay.cleanup()` is a no-op.
- `sglang_omni/proto/messages.py:235-273`: `DataAckMessage`'s `object_id`, `success` and error fields.
- `sglang_omni/comm/router.py:409-418`: request-level relay cleanup.

Line numbers refer to `origin/main@0e641996a0c2`.

### Next

Step 5 returns to the sender: match the ACK's `object_id` to pending, finish the SHM put, return its write permit, then remove the lifetime record.

## Step 5 · ACK completes operations before the record disappears

> **In one sentence:** The sender completes pending's ACK future by `object_id`, finishes the SHM put, returns one write permit, then removes the record.

### What the picture shows

- The first box receives `DataAck(A)`. `ack_transfer()` uses A to find `pending[A]`; a successful ACK completes that record's ACK future.
- The first box also shows `ack_transfer()` resolving `pending.ack`, which releases `watch_pending()` to continue.
- The second box is `watch_pending()` on its normal SHM path. It calls `mark_receiver_done()`, then awaits `wait_for_completion()`. Inside that wait's `finally`, `ShmPutOperation` calls `sem.release` to return one write permit before the await returns.
- In the third box, `pending: no A` and `pending.pop(A)` mean that only the lifetime record has been removed. Step 4 already closed the receiver's handle and unlinked the block's name after copying; this pop does not free the copied buffer.
- The bottom line fixes the order: `sem.release` runs inside `wait_for_completion()`'s `finally`, before `pending.pop(A)`. Other relays keep their own resource semantics.

### The normal completion chain

1. `ack_transfer()` looks up pending by `ack.object_id` and finds this transfer's waiting record.
2. A successful ACK completes `pending.ack`, so the watcher can continue.
3. Each `op.mark_receiver_done()` tells the concrete operation that the receiver finished reading.
4. Each `op.wait_for_completion()` waits for concrete backend completion. Inside that wait's `finally`, <code>ShmPutOperation.<wbr>release_cb()</code> invokes `sem.release`, returning one SHM write permit before the await returns.
5. After the await returns, <code>pending.pop(<wbr>object_id)</code> removes the sender's lifetime record.
6. If a KV lease exists, `lease.release()` releases that additional lease.

A stale ACK whose pending record no longer exists is ignored. A failed ACK stores an exception in `pending.ack` instead of running the successful path.

### What a write permit limits

`ShmRelay` creates `sem = asyncio.Semaphore(credits)`, with constructor default `credits = 2`. Each `put_async()` or `put_chunks_async()` acquires one permit before creating a block. The source calls these permits “credits”; the stage calls them write permits. They limit in-flight SHM puts, not readers, bytes or the illustrative storage space in Step 1.

On the normal path, `ShmPutOperation.wait_for_completion()` reaches `finally`, marks the operation completed and calls `release_cb=self.sem.release`. Only after that await returns does `watch_pending()` enter its own `finally` and pop pending. Removing the record is bookkeeping, not the permit return.

### Failure and retention boundaries

The ordinary failure path calls `mark_receiver_failed()` and waits for operation completion. A KV transfer marked `retain_pending_on_failure` keeps its pending record if no receiver terminal has arrived, because the peer may still read and its resources cannot be released early.

The figure covers the normal SHM path. It does not give other backends the same close/unlink or semaphore rules, and it does not cover the failure paths above.

### Source references

- <code>sglang_omni/pipeline/stage/<wbr>runtime.py:539-557</code>: `DataAckMessage` receipt and `ack_transfer()` entry.
- `sglang_omni/comm/engine.py:930-971`: pending lookup by `object_id`, stale-ACK handling and ACK-future completion or failure; `1210-1224`: normal operation completion; `1260-1268`: pending removal and optional lease release; `1225-1259` and `1290-1313`: failure and retention paths.
- `sglang_omni/relay/base.py:91-153`: generic relay and operation interfaces.
- `sglang_omni/relay/shm.py:100-117`: operation completion invokes `release_cb`; `119-123`: `mark_receiver_done`; `193-237`: the semaphore and one acquisition per put; `239-259`: `release_cb=self.sem.release`.

Line numbers refer to `origin/main@0e641996a0c2`.

### Next

The chapter's answer is now complete. DataRef locates data, pending tracks the read, and the ACK/operation chain postpones sender completion until after reading. For SHM, the receiver closes and unlinks before its ACK; the sender then returns a write permit and removes pending. A slow reader retains resources longer; the next chapter uses queues and backpressure to connect stages running at different speeds.
