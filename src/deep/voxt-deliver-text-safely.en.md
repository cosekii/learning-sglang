## Step 1 · The destination is the focus's owner

> **In one line:** The text goes to the process that owns the focused element; that can be the start app, another app, or a floating window that is not in front.

### On the stage

- The stage builds in order: the start app, the switch arrow, the focus owner with an empty focused field, the answer text `send the deck to Priya` landing in that field, then the two bottom lines.
- Left box: the **start app**, the app in front when you pressed the shortcut. It is `Request.Target`.
- Right box: the **focus owner**, the process that owns the focused element. That owner is the destination.
- `focus` is the field where typing goes. A floating window can keep the focus while another app is in front.
- The bottom lines say the owner can be the start app, another app, or a floating window, and that the start app is not automatically the destination.

### The rule

`textio.focus` returns the focused element's own process PID, not the frontmost app's. `deliver` pastes into that process. `PasteCheck.targetReached` accepts a target that is either the app in front or the owner of the focused element, which is how a non-activating panel receives text.

| Symbol | Meaning | Source |
|---|---|---|
| start app | app in front at the shortcut; `Request.Target` | `Voxt/internal/deliver/deliver.go:97-98` |
| focus owner | PID of the focused element's own process | `Voxt/helper/Sources/VoxtNewHelper/TextIO.swift:63-82` |
| frontmost app | not always the focus owner | `TextIO.swift:63-65, 78-79` |
| `targetReached` | target in front, or target owns the focus | `Voxt/helper/Sources/VoxtNewHelperKit/PasteCheck.swift:84-88` |

### Why it matters

If the destination were only the frontmost app, a floating panel with the focus would receive nothing. Reading the element's own process lets the text follow the focus, not the window order.

### Boundaries

The start app still controls three things: the benefit of the doubt, a selection replace, and the auto key. Steps 2 and 3 add the checks.

## Step 2 · A password field stops everything

> **In one line:** Before typing, the helper reads the focused element; a password field stops the insert.

### On the stage

- The stage builds in order: the password field, the warning line, the STOP with reason secure, then the two exits one at a time (card on, card off).
- The focus owner's focused field is drawn as password dots, with the subrole `AXSecureTextField` beside them.
- The orange result is STOP: nothing is typed.
- Nothing is typed. With that feature's card on, the answer card opens; with it off, the app copies the result and shows a one-line notice.

### The check

`Secure(f)` is true when the focused element's subrole is `AXSecureTextField`. In `check()`, the secure test runs before any editable test:

$$\text{secure} \Rightarrow \text{ReasonSecure} \Rightarrow \text{no paste}$$

| Symbol | Meaning | Source |
|---|---|---|
| `AXSecureTextField` | the password-field subrole | `deliver.go:206` |
| `ReasonSecure` | why nothing was typed | `deliver.go:68` |
| secure before editable | order in `check()` | `deliver.go:311-312` |

### Why stop

A password field is built to keep typed content away from other programs. Posting ⌘V into it can either do nothing or expose text the user did not want typed there. Stopping is the safe answer.

### Boundaries

The card is not a universal exit. The session opens it only when that feature's `ShowCard` is on; `session/deliver_test.go` `TestCardSwitch` checks both settings. With the card off, `session_link.go:375-379` copies the result and shows "Not inserted. Copied: press ⌘V to paste." A `CopyResult` setting can also copy a carded result (`session_link.go:321-323`), and the card's Copy writes the answer text itself (`session_overlay_actions.go:20-25`). So application code can change the clipboard after a secure or not-editable exit, even though the helper stops before its own clipboard write.

A secure field is not the only secure case. The helper also notices when another app holds **secure event input** on, which can keep posted keys from arriving; that case is reported after a paste, in Step 4.

## Step 3 · Can the focused element take text?

> **In one line:** The start app gets the benefit of the doubt, another app must say it is editable, and a selection can only be replaced in the start app.

### On the stage

- The stage builds in order: the three rule cards one at a time, then the ordinary-delivery and card Insert lines, then the not-writable exit line.
- Three rules: same as the start app, another app, and a selection replace (or Voxt's own window).
- For ordinary delivery, a button or a list is not writable. In the start app a web area still counts as writable; in another app a page being read is not enough.
- When the rule fails, nothing is typed and the exit is Step 2's: card when on, copy and notice when off.

### The rules

`Writable(f)` says whether the start app's element takes text: an editable one, an element Accessibility could not read, or any role not in the non-text table. `Editable` is tested first, so an element Accessibility marks editable passes even if its role is a button. For another app, the element must report `Editable`.

$$\text{Writable} = f.\text{Editable} \lor f.\text{Error} \ne "" \lor f.\text{Role} \notin \text{nonText}$$

| Symbol | Meaning | Source |
|---|---|---|
| `f.Editable` | Accessibility says the element edits text | `deliver.go:196` |
| `f.Error` | Accessibility gave no answer | `deliver.go:196` |
| `f.Role` | the element's role; `AXWebArea` is not in `nonText` | `deliver.go:199-202` |
| `nonText` | roles that never take text | `deliver.go:184-189` |
| `Writable` | start-app rule | `deliver.go:195-203` |

### Why the asymmetry

You pressed the shortcut in the start app, so an element there it cannot read still gets the benefit of the doubt. In another app you did not press anything; the element must say it edits text, or a read-only page could receive a paste.

### Boundaries

The answer card's Insert is a user choice: `AnyEditable` skips the start-app `Writable` check, so a chosen button can receive the paste (`deliver.go:319-326`; `deliver_test.go:68` tests an `AXButton` that is inserted after that choice). It does not skip the password check, and in another app the element must still report `Editable` (`deliver_test.go:62`).

A selection is replaced only in the start app and only in an element Accessibility calls editable; replacing text selected in a web page with a paste that goes nowhere would lose it. VoxtNew's own window also requires `Editable`, because the session may have started there. In the start app, a web area's role is `AXWebArea`, which is absent from `nonText`, so `Writable` returns true; the rule that a page being read is not enough applies only to another app.

## Step 4 · Paste, then read the field again

> **In one line:** The helper reads the focused element before and after ⌘V. A change is evidence the text landed; a same readable reading leaves it unconfirmed.

### On the stage

- The stage builds in order: the before card with the real field text `send the deck to ` and its cursor, the ⌘V arrow, the after card with `send the deck to Priya` and the cursor at the new end, the compare card with its evidence, the other three exits, then the wait line.
- Before and after cards hold what the helper reads of the field: its text and its cursor. The compare card's evidence line says the text grew and the cursor moved.
- The comparison has four exits: different → inserted; same ordinary field → unconfirmed; same web area or editable web region → inserted; cannot read → inserted.
- The wait is `DefaultVerifyMS`, 1000 ms.

### The comparison

`PasteCheck.compare` reports:

$$\text{compare} = \begin{cases}\text{changed} & \text{any comparable part differs}\\[2pt] \text{same} & \text{parts compared and equal}\\[2pt] \text{unreadable} & \text{nothing comparable}\end{cases}$$

Internally the reading compares the value's length, a digest of the value, the selection range, and the text marker (a caret for web editors). A changed reading is evidence the paste landed; another edit could also change it. A same readable **ordinary** field leaves `ReasonUnconfirmed`. A same readable `AXWebArea` or editable web region is different: `TextIO.swift` changes that unchanged result to unknown, and `insert()` treats unknown as inserted. `deliver_test.go` has a case for exactly this: an unchanged readable web area is inserted.

| Symbol | Meaning | Source |
|---|---|---|
| `DefaultVerifyMS` | wait before giving up | `Voxt/internal/deliver/deliver.go:92` |
| `compare` | changed / same / unreadable | `Voxt/helper/Sources/VoxtNewHelperKit/PasteCheck.swift:46-66` |
| `outcome` | inserted / unknown / unchanged | `PasteCheck.swift:71-75` |
| web area trust | `AXWebArea` with no secure input is trusted | `deliver.go:263-268` |

### Why re-read

Posting ⌘V only puts a key event in the system. The app may ignore it (wrong focus, a secure field, a busy page) and nothing types. Reading the field again is how the caller tells "sent" from "landed".

### Boundaries

Some elements tell nothing; a web area container often does not update its value after ⌘V, so it is trusted without proof. When another app holds secure event input, the reason is `ReasonSecureInput` instead of a plain unconfirmed paste.

## Step 5 · Snapshot the clipboard and put it back

> **In one line:** The old clipboard is saved before ⌘V and put back on a 150 ms budget counted from ⌘V, unless another program wrote to it meanwhile.

### On the stage

- The stage builds in order: the snapshot with the old clipboard `grocery list`, the prepared text over the clipboard, the restore with `grocery list` back, the timing lines, the other-writer case where `someone else's note` stays, the unconfirmed exit, then the answer text and the closing question.
- The blue box is the saved old clipboard, `grocery list`.
- The orange box is the prepared text, written over the clipboard just before ⌘V.
- The last blue box is the restore: the old clipboard comes back. The orange `someone else's note` line is the other-writer case: `changeCount` differs, so the restore is skipped.
- The stage says the 150 ms budget starts at ⌘V and checking time is subtracted; the unknown case waits 500 ms after the check.

### The timing

The confirmed restore counts from the moment ⌘V is posted, not from the moment a change is seen. Time already spent verifying and sending post-paste keys is subtracted; if the budget is gone, the restore happens immediately. The unknown case waits the default `RestoreDelayMS` after the check.

$$t_{\text{restore}}=\begin{cases}\max(0,\;150\text{ ms}-(\text{now}-\text{posted})) & \text{confirmed}\\[2pt] 500\text{ ms} & \text{unknown}\end{cases}$$

| Symbol | Meaning | Source |
|---|---|---|
| $t_{\text{restore}}$ | time left before the restore runs | the two cases below |
| `posted` | when ⌘V was posted | `Voxt/helper/Sources/VoxtNewHelper/TextIO.swift:309-310` |
| `now` | when the restore runs | `TextIO.swift:367-378` |
| 150 ms | confirmed budget counted from `posted` | `TextIO.swift:367` |
| 500 ms | default `RestoreDelayMS`, unknown, after the check | `TextIO.swift:367` |
| `changeCount` | did someone else write meanwhile | `TextIO.swift:365-372` |

### Why restore

The clipboard is shared by every app. Leaving the transcribed text there quietly replaces whatever the user copied earlier. Restoring returns the user's clipboard. The helper reports the text as kept only when the result is unchanged and `changeCount` is still ours (`TextIO.swift:364-365`); another program's newer write stays instead. The card's Copy does not depend on that paste: it writes the answer text itself (`session_overlay_actions.go:20-25`). When the card is off, the app copies the result and shows the notice (`session_link.go:375-379`); `CopyResult` can copy a carded result too (`session_link.go:321-323`). `KeepClipboard` is the separate switch that leaves the text there on purpose.

### Boundaries

This step does not recover a clipboard that another app changed between the snapshot and the restore; it only avoids overwriting that newer change. Application code can still copy the result after a secure or not-editable exit, so the helper's "stops before the clipboard write" is not a whole-app guarantee. The next chapter asks where names and terms come from as references.
