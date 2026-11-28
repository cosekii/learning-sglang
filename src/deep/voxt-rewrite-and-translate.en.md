## Step 1 · Two routes, one connection

> **In one line:** Transcribe starts from your voice; Rewrite and Translate start from text you point at on the screen — and both plug into the language-model connection from Ch. 5.

### On the stage

- The left panel is the route from Ch. 1–6: you speak, the microphone, recognition and clean-up run, and text lands at the cursor.
- The right panel appears: you select text in any app, an answer card opens, and text goes back into that app. This chapter opens it.
- The shared box below: both routes send their requests through one language-model connection (Ch. 5).
- Two pills say what each feature does: **REWRITE** changes what you wrote; **TRANSLATE** says it in another language.
- The chapter map: the map (1), reading the selection (2), the card (3), one request (4), the answer back (5), Translate (6).

### In code

Rewrite and Translate are session kinds of their own, next to Transcribe (`internal/session/write.go:35`, `write.go:46`, with `store.KindRewrite` and `store.KindTranslate`). The card that the Rewrite shortcut opens is documented at the top of `rewrite_box.go:3-15`: the shortcut starts the microphone and opens the card together, the text selected at the press shows in it as the input, and an insert activates the app the user was in first (`rewrite_box.go:17-25`). Both features build their requests with the same compose pipeline (`internal/compose/compose.go`) and the same configured model connection Ch. 5 draws.

### Next

Before any request can be sent, Voxt needs the text you pointed at. Step 2 shows the two ways it reads the selection.

## Step 2 · Reading the selection

> **In one line:** Voxt asks the system for the selected text first; a blank or placeholder read counts as nothing, and when the app allows it, a carefully wrapped ⌘C copy is the fallback.

### On the stage

- An app window with a selected sentence (constructed): `i might be able to come friday, not sure yet`.
- **Path 1 · Accessibility read**: the system lets apps share their text (the permission from Ch. 2), and the read returns the sentence.
- The guard strip: a read of blanks or one placeholder counts as nothing — `""`, `"   "`, or `U+FFFC`, the marker editors put in a selection to stand for a picture.
- The settle box: a selection made with ⌘A in the same motion as the shortcut can lag its reading, so a caret-only read waits out a settle — 600 ms, checking every 60 ms.
- **Path 2 · copy with ⌘C**, in four beats: held shortcut keys lift first (up to 800 ms), the clipboard is snapshotted, ⌘C waits up to 300 ms for a change, the text is read and the snapshot is put back.
- Two lines: while the shortcut's keys stay down the helper skips ⌘C and Voxt reads again every 100 ms, the last time when the recording ends; a long selection's copy gets 1,500 ms.

### In code

`readSelection` reads the selected text of the app in front and puts it in the session's snapshot, returning "" for none or when it could not be read (`internal/session/run_selection.go:32-104`). The budgets are constants: 600 ms settle at 60 ms polls, 800 ms modifier wait, 300 ms copy budget (`run_selection.go:15-27`); Rewrite replaces the copy budget with 1,500 ms for long selections (`internal/session/session.go:366-370`). While the shortcut's keys stay down the helper reports `copy: skipped`, and Voxt re-reads every 100 ms until they lift, the last time once the recording ends (`run_selection.go:47-66`, `run_selection.go:107-109`). The helper's side — the U+FFFC and all-whitespace guard, the clipboard snapshot and restore — is the documented protocol (`docs/helper-protocol.md:125`) and its implementation (`helper/Sources/VoxtNewHelperKit/SelectionRead.swift:15-19`). Whether ⌘C is allowed at all depends on the app (`AllowCopy`, `run_selection.go:41`; an app that copies a whole line on an empty selection forbids it).

### Next

The selection is read. Step 3 opens the card it lands in.

## Step 3 · The card

> **In one line:** One press of the Rewrite shortcut starts the microphone and opens the card together; the selection lands as a block, you can type more and paste up to 4 pictures, and Esc closes without sending.

### On the stage

- Two boxes appear from one press: **you press the Rewrite shortcut**, and **the microphone starts**.
- The card panel: the selection lands as a labelled block, `SELECTED TEXT`.
- Below it: a `TYPED` line you can add to, and a row of picture slots — paste or drop up to 4.
- The send strip: the shortcut again or Enter sends; Esc closes without sending.
- The failure strip: a send that fails comes back with the error, everything kept; Enter sends again.

### In code

The card's behaviour is the header comment of `rewrite_box.go:3-15`: the Rewrite shortcut starts the microphone and opens the card together, the selected text shows in it as the input, and while the card records the user can type more text and paste or drop up to `boxMaxImages` = 4 pictures (`rewrite_box.go:49-51`). The shortcut again (or Enter) finishes the recording and sends; Esc closes the card without sending (`rewrite_box.go:12-15`). A send that fails brings the card back with the error and everything kept, so Enter sends the same instruction again (`rewrite_box.go:28-30`). Not drawn: a clipboard picture or a window screenshot can ride along as an automatic image, with privacy switches and per-app rules (`write.go:105-160`).

### Next

Step 4 packs what the card holds into one request.

## Step 4 · One request, a fixed order

> **In one line:** The selection, the typed text and the spoken instruction travel in one request, always in that order; typed text alone takes the source's place, and with neither, the request is the speech alone.

### On the stage

- Three tagged blocks: `<selected_text>` (the sentence), `<typed_text>` (what you added), `<instruction>` (what you said).
- They merge into **ONE REQUEST** to the language model; the formula fixes the order: selection → typed → instruction.
- Two cases: nothing selected — the typed text takes the source's place, the order stays; nothing selected or typed — the request is the speech alone.
- Two lines: the card's latest text and pictures are read when the answer is asked for, and they win over the clipboard's picture; a window that will not be sent is never shot.

### In code

Rewrite's compose input keeps the fixed order — the source, the typed text, the spoken instruction — and when the source is empty the typed text takes its place (`internal/session/write.go:46-57`). The user message wraps the parts in that order: `<selected_text>`, then `<typed_text>`, then `<instruction>` (`internal/compose/compose.go:419-436`, `RewriteMessage`). The box's own text and pictures are read when the answer is asked for, as they are at that moment, and win over the clipboard's picture and the window's; the window is shot only now, so one that will not be sent is never taken (`write.go:71-140`). With nothing selected or typed, the request is the speech alone (`rewrite_box.go:12-15`).

### Next

The request is away. Step 5 brings the answer back — into the card first, then into the app you came from.

## Step 5 · The answer comes back

> **In one line:** The answer streams into the card; writing from scratch gets a titled card, a follow-up gets plain text, and inserting activates the original app first — with the Ch. 7 checks run again.

### On the stage

- The card with the streaming answer (constructed): `I can come Friday, at 3 pm.` — published at most every 40 ms.
- Two shapes: writing from scratch → a JSON answer `{title, content}`, a card with a title; a follow-up → plain text, as a conversation does.
- A follow-up replays the earlier turns as the conversation: user → assistant → user.
- **INSERT**: activate the original app first (the Ch. 7 checks), then paste the answer there.
- Three lines: over a full-screen app the card is a panel; the checks run again before inserting, and a refused insert keeps the answer in the card; a failed request stays in the card, to try again.

### In code

A streaming answer is published at most every 40 ms (`internal/session/write.go:17-18`, `draftEvery`). Writing from scratch — no source and no earlier turns — asks for a JSON answer `{title, content}` (`write.go:20-25`, `write.go:53-56`); a follow-up answers in plain text and replays the earlier turns as user/assistant history (`internal/compose/compose.go:395-400`). Before inserting, the deliver checks run with Replace; a refused insert sends the answer to the card with the reason (`write.go:199-208`). An insert activates the app the user was in first (`rewrite_box.go:17-25`). Over another app's full screen, where macOS shows no ordinary window, the card is a panel (`rewrite_box.go:22-25`). A failed request ends the session in the card, to try again (`write.go:62-66`; the card's buttons — reopen, retry, follow-up, copy, insert, close — are `session_answer.go:3-5`).

### Next

Step 6 walks the same route with one word changed: the instruction is a language.

## Step 6 · Translate

> **In one line:** Translate sends speech or a selection with a target language; an answer that looks untranslated is asked again, more firmly, and a failed retry keeps the first answer.

### On the stage

- Two entries: you speak → translate what you said (`明天见 → See you tomorrow.`); you select → the selection translates directly, no speech needed.
- The rule: no language picked for this text — the answer comes back in your main language (`see you tomorrow → 明天见`).
- **Looks untranslated? Three signs**: the answer is the source again; the whole source sits beside its translation; it is mostly in the wrong script. 〈指令〉tags around a real translation are ignored.
- The retry: ask again, more firmly (Strict); the retry fails → keep the first answer.
- The closing question: text can be rewritten and translated — how does one spoken trigger type a whole saved passage?

### In code

Translate's compose input carries the target language; with none picked for this text, the back language is the user's main language (`internal/session/write.go:35-44`). A selection translates directly — the text is the material, not speech (`internal/compose/compose.go:139-141`). After the answer, `Untranslated` judges three signs: the source again ignoring case, spaces and punctuation; the whole source unparenthesized beside its translation; or mostly outside the target's script while the source is too — with 〈指令〉tags stripped first (`internal/compose/translate.go:40-75`). Such an answer is asked again with the Strict layer, and a failed retry keeps the first answer (`write.go:215-231`). A source already in the target's script is never judged untranslated (`translate.go:46-50`).

### Next

The closing question belongs to Ch. 18: snippets — a spoken trigger that types a whole saved passage, and why the language model never changes its words.
