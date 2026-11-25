## Step 1 · A key becomes a message

> **In one line:** The Swift helper recognizes the default Right Option shortcut and emits one `hotkey.event` JSON message. With no dictation running, the Go app routes it to start Transcribe.

### On the stage

- You tap `Right ⌥`: Right Option, the default Transcribe shortcut. Left Option does not match this default binding.
- Swift helper: the companion program that listens for the key. It recognizes this tap and does not capture audio in this step.
- One JSON message: JSON gives each fact a name and a matching value. The stage reads three fields on separate rows with plain-language meanings, while the transport still uses one line. The blue box and arrows show the message moving from the helper to the Go app.
- `hotkey.event`: the value of `method`, identifying this as a hotkey message.
- `transcribe/0`: the value of `binding`, identifying Transcribe binding number 0, the default dictation key in this example. Binding IDs start at 0, so number 0 is the first.
- `trigger`: the value of `phase`, meaning the tap has fired rather than the down or up phase of a long press.
- Go app: the main program. `Transcribe` means dictation. No dictation was running in this example, so the route produces `Start Transcribe`.

### The mapping

$$
K \xrightarrow{H} M \xrightarrow{R} A
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $K$ | One Right Option tap | This step's constructed input |
| $H$ | Hotkey recognition in the Swift helper | `HotkeyTap.decide` |
| $M$ | One `hotkey.event` message | The notification written by the helper |
| $R$ | Hotkey routing in the Go app | `hotkey.Route` |
| $A$ | The action that starts Transcribe | The route result for `trigger` while idle |

### The numbers on the stage

One key press crosses two programs as one hotkey message and produces one start action. These counts describe this step's constructed route, not performance measurements. A key press does not start a dictation in every application state.

### What else the message carries

Each line the helper writes to stdout contains one JSON message. `hotkey.event` is a notification: it reports an event and needs no answer from the app. The stage extracts three fields to explain the route. A real event also carries `behavior` and `t` on the helper's monotonic clock, and can carry `heldMs`, the front app and the configuration `generation`. A public fixture contains the same three shown values and `behavior: tap`.

This step assumes the required permission already works and draws only the successful route. Permission retries, the Carbon fallback for plain key combinations and why another tap during recording stops rather than starts belong to later steps. After the Go app starts Transcribe, the session enters `Recording` and sends `capture.start` to the helper. Microphone audio therefore follows the start action; it is not inside this hotkey message.

### Next

The helper needs macOS permission before it can see global keys. The next step separates that permission check from the key route.

### Source

Public baseline: `sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`. Paths are relative to that repository.

- Default Transcribe shortcut `RightOption` with tap behavior: `Voxt/internal/settings/settings.go:357,379`; binding ID construction: `Voxt/internal/hotkey/hotkey.go:282,304`.
- The helper recognizes events and emits `hotkey.event`: `Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:240-250,269-274`.
- One JSON message per line, helper to app over stdout: `Voxt/docs/helper-protocol.md:9-13`; notifications have no `id`: lines 18-24; event fields: lines 88-97.
- Go event structure: `Voxt/internal/helper/proto/hotkey.go:113-127`; app notification receiver: `Voxt/helperlink.go:140-152`.
- `trigger` while idle returns `Start`: `Voxt/internal/hotkey/route.go:114-121`; its test: `Voxt/internal/hotkey/hotkey_test.go:419`.
- Transcribe starts in `Recording`: `Voxt/internal/session/run.go:192-202`; `capture.start` goes to the helper: `Voxt/internal/session/helperio.go:20-35`.
- A public fixture of the same event type: `Voxt/helper/Fixtures/hotkey.jsonl:3`.
