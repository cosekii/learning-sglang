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

## Step 2 · Accessibility decides whether the key route can start

> **In one line:** Accessibility is a Mac setting. Without it, the helper cannot receive global keys. With permission and successful key reception, the same Right Option tap follows Step 1's route as one message.

### On the stage

- Both panels use the same `Right ⌥ Option` tap, and both Go apps start idle. Only Accessibility changes.
- Accessibility: the Mac permission that lets the helper see keys you press in other apps. It is not microphone permission.
- Left, `OFF`: without this permission, the helper's global key listener is not installed. It cannot see this tap, emits **0** `hotkey.event` messages, and leaves the Go app idle. The red cross marks the broken route.
- Right, `ON`: key reception works in this example. The helper sees the same tap, emits **1** `hotkey.event`, and the Go app starts Transcribe under Step 1's routing rule. The blue arrow shows message delivery.
- Both panels place the key, Mac setting and helper in matching positions. Grey is reserved for ordinary boxes and the key arrow.

### The relationship

$$
(M,G)=
\begin{cases}
(0,\mathrm{idle}), & A=\mathrm{off}\\
(1,\mathrm{start}), & A=\mathrm{on}
\end{cases}
$$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $A$ | Whether Accessibility is allowed | The only setting changed in this step |
| $M$ | Number of `hotkey.event` messages reaching Go | Whether the helper receives and recognizes this tap |
| $G$ | The Go app's routing result | Step 1's routing rule for an idle app |

### The numbers on the stage

| Accessibility | Same Right Option | $M$: messages reaching Go | $G$: Go result |
|---|---|---:|---|
| OFF | 1 tap | 0 | Stays idle |
| ON, with key reception working | 1 tap | 1 | Starts Transcribe |

These counts describe a constructed comparison, not permission success rates or performance. Turning the setting on does not start dictation; you still press the shortcut.

### The source checks and omissions

The helper reads Accessibility with `AXIsProcessTrusted()`. macOS checks it against the responsible process, `VoxtNew.app`, so System Settings names VoxtNew. Without permission, or if macOS strips keyboard events, the helper does not count the listener as installed and retries every 2 seconds. Granting permission does not require a helper restart.

Only Accessibility changes here, and the right panel assumes every other condition succeeds. Input Monitoring, other permissions, permission prompts and listener failures are not drawn. The picture does not claim that Accessibility alone guarantees success.

### Next

The hotkey message can now reach the Go app. The next step examines microphone permission: whether sound may enter is a separate setting from seeing keys.

### Source

Public baseline: `sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`. Paths are relative to that repository.

- Accessibility status and the responsible-process explanation: `Voxt/helper/Sources/VoxtNewHelper/Permissions.swift:7-9,40-46`.
- No installed listener without permission, a retry every 2 seconds, and no restart after granting it: `Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:6-19,76-89,155-169`.
- Listener creation and verification of the keyboard events actually granted: `Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:113-151`.
- Recognition and `hotkey.event` delivery: `Voxt/helper/Sources/VoxtNewHelper/Hotkey.swift:240-250,269-274`.
- `trigger` while idle returns `Start`: `Voxt/internal/hotkey/route.go:114-121`.

## Step 3 · Microphone permission decides whether sound can enter

> **In one line:** Both panels send the same `capture.start` after the hotkey. If Microphone permission is denied, the helper returns an error. With permission and a working input, sound returns to the Go app.

### On the stage

- Accessibility stays on in both panels, so the helper can see keys. Only Microphone permission changes here.
- `capture.start`: the request from the Go app to the helper, meaning "please start recording." The blue arrow shows that request.
- Left, Microphone permission is off: macOS blocks sound, the helper returns `permission_denied`, meaning "permission was refused," and recording does not start.
- Right, Microphone permission is on and the microphone works: sound passes through the helper to the Go app, and recording starts.
- Red marks only the permission block; blue marks a connected request or sound route. The panels measure no latency and record no real audio.

### The relationship

$$
R=\begin{cases}
\mathrm{permission\_denied}, & P=\mathrm{off}\\
\mathrm{recording}, & P=\mathrm{on}\ \land\ D=\mathrm{works}
\end{cases}
$$

| Symbol | What it is | Where it comes from |
|---|---|---|
| $P$ | Whether Microphone permission is allowed | The only permission changed in this step |
| $D$ | Whether the input device works | The right panel's explicit assumption |
| $R$ | Result of the same `capture.start` | The helper's permission check and capture route |

### The two cases on the stage

| Request after the hotkey | $P$: Microphone permission | $D$: input device | $R$: result |
|---|---|---|---|
| `capture.start` | Off | Device startup is not reached | `permission_denied`; no recording |
| `capture.start` | On | Working | Sound reaches the Go app; recording starts |

### The source checks and omissions

The helper reads Microphone permission with `AVCaptureDevice.authorizationStatus(for: .audio)`. If macOS has never asked, it shows the prompt and waits for an answer. The left panel constructs an already denied or restricted state; it does not treat "not determined" as an immediate failure.

After permission succeeds, the helper must still start an input. An unavailable device, missing audio callbacks or an existing capture of the same kind can produce other errors; this comparison omits them. After audio arrives, the helper sends `capture.started`, then ongoing sound data in `capture.pcm`. The stage calls these messages "sound"; the next chapter explains their format.

### Next

The hotkey and sound routes have separate permission gates. The next chapter divides continuous sound into data chunks that programs can carry.

### Source

Public baseline: `sglang-omni@52aab78e85f15da0e85d1dbdee3bfe6ffc7cbc84`. Paths are relative to that repository.

- Four Microphone permission states: `Voxt/helper/Sources/VoxtNewHelper/Permissions.swift:11-18`; the first permission request: lines 53-58.
- `capture.start` checks permission before creating its capture job and returns Microphone `permission_denied` on refusal: `Voxt/helper/Sources/VoxtNewHelper/Capture.swift:53-79`.
- The request method, permission error and wait when permission is undetermined: `Voxt/docs/helper-protocol.md:32-37,63,107`.
- A failed start sends no `capture.started`: `Voxt/internal/helper/proto/capture.go:20-25`; first audio and subsequent `capture.pcm`: lines 56-72 and 82-90.
- The Go session classifies this permission error as `ProblemMicrophone`: `Voxt/internal/session/session.go:464-483`.
