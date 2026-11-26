## Step 1 · The word recognition heard wrong

> **In one line:** Recognition writes Priya as Preeya, and one dictionary row pairs the wanted term with the alias recognition writes.

### On the stage

- The grey box on the left is **your voice**, saying "call Priya".
- The **speech model** in the middle turns sound into words; the orange box is its recognized text, `call Preeya.`
- Below it, you meant `call Priya.`, and the stage says you fix the name by hand every time.
- The blue box at the bottom is one dictionary row: term `Priya`, alias `Preeya`, note "on the design team".

### The three parts

| Part | Meaning | Example |
|---|---|---|
| term | the correct spelling you want | `Priya` |
| alias | what recognition tends to write instead; one term can have several | `Preeya` |
| note | free text you write once, optional | on the design team |

`store.Term` also has `Enabled` and two timestamps; the app uses them to decide whether the row is active now (`Voxt/internal/dict/dict.go`). `Check` refuses an empty term, a newline, or more than `MaxTermChars = 80` runes (`dict.go:70`); `Clean` keeps at most `MaxAliases = 10` aliases (`dict.go:50`).

### Why the cost comes first

Without this product name, recognition writes it wrong every time and you fix it by hand every time. The dictionary does that work once: fill one row, and every later dictation uses it. Step 2 splits the row into four destinations.

### Next

One row has three parts, and they do not travel together; the next step shows where each part goes.

## Step 2 · One row, four destinations

> **In one line:** The term goes to the speech model, the alias goes into transcript replacement, and only the term and aliases enter the glossary; the row note stays private, while separate dictionary-wide `settings.Dictionary.Notes` enters the language-model prompt.

### On the stage

- The blue box on the left is the dictionary row: term, alias and row note. The row note is marked private and is not sent.
- The four boxes on the right are the destinations, each with its switches. The fourth comes from separate `settings.Dictionary.Notes`.
- Three thin lines run from the term and aliases to the first three boxes; the row note has no arrow.

### The four destinations and their switches

| Destination | Gets | Switch | Source |
|---|---|---|---|
| speech model · hints | only enabled terms | dictionary on + speech hints on | `session/run_audio.go:36` |
| transcript · replace | aliases become the term | dictionary on | `session/cleanup.go:69` |
| language model · glossary | copies only terms + aliases, never row notes | dictionary on + glossary on | `session/run_transcribe.go:110-120` |
| language model · dictionary notes | separate `settings.Dictionary.Notes` | dictionary on, notes not off | `session/text.go:120-126` |

The source marks a row's `store.Term.Note` as “not sent anywhere” (`internal/store/store.go:215-230`). `glossary()` constructs each `compose.Term` with only `Term` and `Aliases`, so a row note cannot ride along in the glossary either.

The switches live in `settings.Dictionary`: `Enabled`, `ASRHints`, `Glossary`, `NotesOff` (`Voxt/internal/settings/settings.go:285-306`). By default `Enabled`, `ASRHints` and `Glossary` are on (`settings.go:393`).

### Why the split

The four places take different input. The recognizer reads a word list, replacement reads aliases, the glossary copies only terms and aliases, and dictionary-wide notes come from separate settings. The row note belongs to none of these sending routes.

### Next

The next four steps walk this map one destination at a time, each marked "k of 4".

## Step 3 · Terms become speech hints

> **In one line:** Enabled terms are ordered most-recently-changed first and sent to the speech model as hints; aliases stay out.

### On the stage

- The blue box on the left lists two enabled terms: `Priya` and `MOSS-Transcribe`.
- An arrow points to the speech model on the right, which lists the same two words.
- The orange box below, `Preeya ✗`, says the alias is not sent.
- The bottom line says a service with fewer hint slots drops hints from the end, keeping the newest-first prefix.

### How the list is ordered

`dict.Hints` clones the terms and sorts them stably by `UpdatedAt`, newest first (`Voxt/internal/dict/dict.go:95`). It then keeps them in order when they are enabled, non-empty, and not seen before ignoring case (`dict.go:100-103`). So two terms in give two hints out.

$$\text{hints} = [\text{enabled terms, sorted by } UpdatedAt \text{ newest first}]$$

| Symbol | Meaning | Source |
|---|---|---|
| term `Priya` | the spelling the user wants | Step 1 |
| alias `Preeya` | what recognition tends to write | Step 1 |
| `UpdatedAt` | when the term last changed | this step, `dict.go:95` |
| `ASRHints` | whether terms go to the speech model | dictionary settings |

### Why the alias stays out

An alias is exactly what recognition gets wrong. Sending it as a hint tells the recognizer to lean toward that spelling and pins the error in place. The hint list carries correct terms only.

### Boundary

Some recognition services take only tens of hints; the `dict.Hints` comment says they cut the list from the end. Truncating the tail preserves the prefix, so newest-changed terms survive at the front.

### Next

The next step takes the recognized text and swaps the alias back to the term.

## Step 4 · Aliases become the term before cleanup

> **In one line:** After recognition, enabled aliases are replaced by their term before any cleanup, so this path does not need the language model.

### On the stage

- The orange box is the recognized text `call Preeya.`
- An arrow points to the blue box with `call Priya.` after replacement.
- Further right is the **language-model cleanup**: the text it receives is already right.
- Two lower boxes: matching rules on the left; a dashed box on the right says with the model off or failing, the result is still `call Priya.`

### Matching rules

`dict.Replace` looks only at enabled terms (`Voxt/internal/dict/alias.go:25`):

- A Latin alias matches **whole words**, ignoring case; it counts as a word only when both ends are letters or digits (`wordRune`, `alias.go:192`).
- Chinese, Japanese and Korean aliases match anywhere, because those scripts do not write spaces between words.
- When several patterns match at one place, the **longest** wins (patterns are sorted by size descending, `alias.go:73`).
- A term already written as itself is left alone, so running this twice does not break it (`alias.go:90`).

$$\text{replace}(\text{Preeya}) = \text{Priya}\quad\text{when the dictionary and the term are enabled}$$

| Symbol | Meaning | Source |
|---|---|---|
| recognized text | what the speech model wrote | the speech model from Step 3 |
| alias | the spelling being replaced | Step 1 |
| term | the correct spelling it becomes | Step 1 |

### Why this does not depend on the model

This is the one path that still works when the language model is missing or errors. `spoken()` calls `dict.Replace(raw, r.terms)` at `session/cleanup.go:68`; `session/run.go:301` hands it the recognized text first, and `run.go:312` enters cleanup only after that. The order is what guarantees it.

### Next

Replacement only fixes aliases. If recognition writes a wrong form that is neither the term nor any alias, the next step's glossary reminds the language model.

## Step 5 · Which message holds the glossary

> **In one line:** A small dictionary puts the glossary in system; a large one puts only selected terms at the start of user, before this request's input.

### On the stage

- Left panel, at most 30 distinct terms: system holds general rules and `- Priya (heard as: Preeya)`, while user holds `call Priya.`.
- Right panel, more than 30 distinct terms: system holds only generic rules; user opens with `<glossary>`, then contains `call Priya.`.
- Both user panels use `call Priya.` because Step 4 has already replaced `Preeya` with `Priya`; the language model receives the replaced text (`session/run.go:301-312`).
- The bottom lines cover candidates, both caps and the cache boundary: select candidates first, then take the longest prefix. A provider may reuse unchanged system, with no guaranteed time or token saving.

### Candidates and message placement

`compose.Build` de-duplicates terms, then selects candidates by the distinct-term count (`Voxt/internal/compose/compose.go:366-377`, `585-599`):

| Distinct terms | Candidates | System | User |
|---|---|---|---|
| $n \le 30$ | all distinct terms in dictionary order | generic rules + the rendered glossary | the replaced input |
| $n > 30$ | only terms or aliases mentioned in the replaced text | generic rules only | `<glossary>` first when matches exist, then the replaced input |

With no matches from a large dictionary, user has no `<glossary>` block, while system's generic instruction remains (`compose.go:411-416`).

### Formula

$$C = \begin{cases}\text{all distinct terms} & n \le 30 \\\text{terms mentioned by the text} & n > 30\end{cases}$$

$$G = \text{the longest prefix of } C \text{ with } |G| \le 60 \text{ and } B(G) \le 2000$$

$$B(G) = \sum_{g \in G}(\operatorname{bytes}(g) + 1)$$

| Symbol | Meaning | Source |
|---|---|---|
| $n$ | number of enabled terms after de-duplication | `distinctTerms`, `compose.go:585-599` |
| $C$ | candidate lines in dictionary order | this step's selection rule |
| $G$ | the consecutive prefix actually sent | `compose.go:576-580` |
| $g$ | one complete glossary line | `- Term (heard as: alias)` |
| $\operatorname{bytes}(g)$ | the line's UTF-8 byte count | Go's `len(string)` |
| $B(G)$ | line bytes plus newline separators, excluding `<glossary>` tags | `compose.go:576-580` |
| 30 / 60 / 2000 | all-candidates threshold / line cap / byte cap | `compose.go:244-250` |

The loop breaks at the first line that does not fit. It does not skip that line to seek a shorter later one, and it never truncates a line.

### Plugging in the stage's numbers

This constructed example has three candidate lines of 900 bytes each:

| Candidate | Bytes after adding it | Result |
|---|---|---|
| line 1 | $900 + 1 = 901$ | kept |
| line 2 | $901 + 900 + 1 = 1802$ | kept |
| line 3 | $1802 + 900 + 1 = 2703$ | over 2000, stop |

So $G$ contains only the first two complete lines. If line 61 crosses the line cap instead, output stops after line 60.

### What the cache can promise

For a small dictionary, the glossary lives in system, and system does not vary with this dictation's text. With other settings unchanged, the provider **may** reuse the prompt cache for that unchanged prefix; the tests prove only that the system string is independent of the input (`compose_test.go:574-577`, `595-630`). They do not guarantee a cache hit, retention, time savings or token savings.

### Boundary

The glossary only shapes the language model's output; it does not change recognition and does not force the model to comply. With the glossary switch off, `glossary()` returns empty (`run_transcribe.go:110-112`).

### Next

Terms and aliases are covered. The next step covers separate dictionary-wide notes and the full system, history, user sequence.

## Step 6 · The note enters the language-model prompt

> **In one line:** The note is free text you write once; it enters the system prompt as its own layer and never reaches the recognizer or the transcript replacement.

### On the stage

- The blue box on the left is **your note**: a Markdown passage such as "Priya is on the design team; heard as Preeya".
- An arrow points to the system prompt on the right, labelled as its own layer and placed before this request's input.
- The orange box below lists the two places the note **never** goes: the speech model and the transcript replacement.
- The bottom line says notes-off keeps the note out of the prompt even while the dictionary is on.

### Which layer the note takes

`PromptDictionary` returns the note only when `Dictionary.Enabled && !NotesOff` (`Voxt/internal/session/text.go:122`). `addDictionary` trims it and adds it as the `dictionary` layer after the task instructions and before scene, glossary and input (`Voxt/internal/compose/dictionary.go:11`). Layers are joined with a blank line.

$$\text{system} = [\text{role},\ \text{task rules},\ \text{dictionary}] \oplus [\text{scene},\ \text{glossary},\ \text{input}]$$

| Symbol | Meaning | Source |
|---|---|---|
| `Notes` | the note as written | dictionary settings |
| `NotesOff` | whether the note is kept out of the prompt | dictionary settings |
| `Dictionary` layer | where the note sits in the system prompt | `compose/dictionary.go:11` |

### Why the note differs from the glossary

The glossary is structured "term to aliases" that the program picks by rule; the note is free text, and the model reads whatever you write. The note can carry what the glossary cannot, such as "this team says Priya as Preeya, do not change their wording". It is shown only to the language model, so it changes neither recognition nor the transcript replacement.

### Boundary

Turning notes off only keeps the note out of the prompt; it does not delete the text you wrote. An empty note adds no layer, so the system prompt matches one with no note at all.

### Next

The four destinations are covered. The final step asks what survives when the language model is away.

## Step 7 · What survives without the language model

> **In one line:** Speech hints and alias replacement run outside the language model and survive its failure; the glossary and the note vanish with it.

### On the stage

- Four rows list speech hints, alias replacement, glossary and note, each with where it goes.
- The orange column on the right is the model-off state: the first two are ✓, the last two are ✗.
- The two lower lines say the first two run outside the language model, and the master dictionary switch turns all four off.
- The dashed box at the bottom hands the topic to the next chapter: how long the recording and its history last.

### Why the first two survive

`SpeechHints` calls `dict.Hints` only when a recognition request is sent (`session/run_audio.go:36`); `spoken()` calls `dict.Replace` only right before cleanup (`session/cleanup.go:68`). Neither needs the language model. The glossary is assembled by `glossary()` and the note is added by `addDictionary`, both only while a cleanup request is built; without the model there is no such request.

| Destination | With model off | Reason |
|---|---|---|
| speech hints | still works | sent to the recognizer, not through the language model |
| alias replacement | still works | runs right after recognition, before cleanup |
| glossary | gone | sent with the language-model prompt |
| note | gone | sent with the language-model prompt |

### The master switch

With `Dictionary.Enabled` off, `SpeechHints`, `spoken()`, `glossary()` and `PromptDictionary` all return empty, so all four stop together. The other three switches (speech hints, glossary, notes off) each control one destination.

### Next

The dictionary only fixes the words. The recording and its history are still there; the next chapter asks how long they last and how they expire.
