## Step 1 · start app and front app are two different apps

> **In one line:** The text goes to the focused element of the app in front when it is ready, while the app you started in is only a remembered exception.

### On the stage

- Left box: the **start app**, the app in front when you pressed the shortcut. It is `Request.Target`.
- Right box: the **front app now**, the app in front when the text is ready. Its focused element is where typing would go.
- The arrow is you switching apps while Voxt records and thinks.
- The bottom line names what the start app still controls. Those rules appear in the next steps.

### The rule

`deliver` reads the app in front now and its focused element. When that element takes text, the result is pasted there, whichever app it is. The start app is not the destination by default.

| Symbol | Meaning | Source |
|---|---|---|
| start app | app in front at the shortcut; `Request.Target` | `Voxt/internal/deliver/deliver.go:97-98` |
| front app now | app of the focused element read before pasting | `deliver.go:292-305` |
| three start-app roles | benefit of the doubt, selection replace, auto key | `deliver.go:10-18` |

### Why it matters

If the text always went back to the start app, switching apps mid-dictation would drop the text somewhere you are no longer looking. Reading the front app follows you. The start app is kept only where its identity changes the safety rules.

### Boundaries

This step does not yet say how the app is checked. It only fixes the difference between the two apps; Steps 2 and 3 add the checks.

## Step 2 · A password field stops everything

> **In one line:** Before typing, the helper reads the focused element; a password field stops the insert.

### On the stage

- The front app's focused field is drawn with a lock-like marker and the subrole `AXSecureTextField`.
- The orange result is STOP: nothing is typed.
- The card opens instead, so the text is still reachable.

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

A secure field is not the only secure case. The helper also notices when another app holds **secure event input** on, which can keep posted keys from arriving; that case is reported after a paste, in Step 4.

## Step 3 · Can the focused element take text?

> **In one line:** The start app gets the benefit of the doubt, another app must say it is editable, and a selection can only be replaced in the start app.

### On the stage

- Three rules: same as the start app, another app, and a selection replace (or Voxt's own window).
- A button, a list, a table or a web page being read never takes text.
- When the rule fails, nothing is typed and the answer goes to the card.

### The rules

`Writable(f)` says whether the start app's element takes text: an editable one, an element Accessibility could not read, or any role not in the non-text table. For another app, the element must report `Editable`.

$$\text{Writable} = f.\text{Editable} \lor f.\text{Error} \ne "" \lor f.\text{Role} \notin \text{nonText}$$

| Symbol | Meaning | Source |
|---|---|---|
| `f.Editable` | Accessibility says the element edits text | `deliver.go:196` |
| `f.Error` | Accessibility gave no answer | `deliver.go:196` |
| `nonText` | roles that never take text | `deliver.go:184-189` |
| `Writable` | start-app rule | `deliver.go:195-203` |

### Why the asymmetry

You pressed the shortcut in the start app, so an element there it cannot read still gets the benefit of the doubt. In another app you did not press anything; the element must say it edits text, or a read-only page could receive a paste.

### Boundaries

A selection is replaced only in the start app and only in an element Accessibility calls editable; replacing text selected in a web page with a paste that goes nowhere would lose it. VoxtNew's own window also requires `Editable`, because the session may have started there.

## Step 4 · Paste, then read the field again

> **In one line:** The helper reads the focused element before and after ⌘V, and only a change counts as inserted.

### On the stage

- Before and after cards hold the four readable parts: value length, value digest, selection and text marker.
- The blue result is the comparison: changed means inserted, same means unconfirmed.
- The wait is `DefaultVerifyMS`, 1000 ms.

### The comparison

`PasteCheck.compare` reports:

$$\text{compare} = \begin{cases}\text{changed} & \text{any comparable part differs}\\[2pt] \text{same} & \text{parts compared and equal}\\[2pt] \text{unreadable} & \text{nothing comparable}\end{cases}$$

The four parts are the value's length, a digest of the value, the selection range, and the text marker (a caret for web editors). A changed reading confirms the paste; a same reading leaves `ReasonUnconfirmed`.

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

> **In one line:** The old clipboard is saved before the paste and restored after it, unless another program wrote to it meanwhile.

### On the stage

- The blue box is the saved old clipboard.
- The orange box is the prepared text, written over the clipboard just before ⌘V.
- The last blue box is the restore: the old clipboard comes back.

### The timing

The paste restores the old clipboard after the text showed, or after a delay when the result is unknown:

$$t_{\text{restore}} = \begin{cases}150\text{ ms} & \text{confirmed insert}\\[2pt] 500\text{ ms} & \text{unknown outcome}\end{cases}$$

Before restoring, the helper compares the pasteboard's change count. If another program wrote meanwhile, it leaves that write alone.

| Symbol | Meaning | Source |
|---|---|---|
| 150 ms | restore after the text showed | `Voxt/helper/Sources/VoxtNewHelper/TextIO.swift:367` |
| 500 ms | default `RestoreDelayMS` for unknown | `TextIO.swift:367` |
| `changeCount` | did someone else write meanwhile | `TextIO.swift:365-372` |

### Why restore

The clipboard is shared by every app. Leaving the transcribed text there quietly replaces whatever the user copied earlier. Restoring returns the user's clipboard, while a failed paste keeps the text on the clipboard so the card's Copy still works.

### Boundaries

This step does not recover a clipboard that another app changed between the snapshot and the restore; it only avoids overwriting that newer change. The next chapter asks where names and terms come from as references.
