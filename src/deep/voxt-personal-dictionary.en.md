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

`store.Term` also has `Enabled` and two timestamps. `Enabled` controls whether the row is active, while `UpdatedAt` controls hint order in Step 3 (`Voxt/internal/dict/dict.go`). `Check` refuses an empty term, a newline, or more than `MaxTermChars = 80` runes (`dict.go:70`); `Clean` keeps at most `MaxAliases = 10` aliases (`dict.go:50`).

### Formula

`replace(word)` returns the term when the whole word matches an alias, and keeps the word otherwise. This row has one alias:

$$\text{replace}(\text{Preeya}) = \text{Priya}, \qquad \text{replace}(\text{Priya}) = \text{Priya}$$

| Symbol | Meaning | This row |
|---|---|---|
| $T$ | term, the spelling you want | `Priya` (5 runes) |
| $A$ | alias, what recognition writes | `Preeya` (6 runes) |
| $\text{replace}$ | whole-word, case-insensitive alias swap; the boundary rules are Step 4 | `call Preeya.` → `call Priya.` |
| $\lvert T\rvert \le 80$ | term length limit | `dict.go:70` |
| $\lvert \text{Aliases}\rvert \le 10$ | alias count limit | `dict.go:50` |

Substitution: $T$ is `Priya`, $A$ is `Preeya`. The spoken `call Priya` reaches the model as `call Preeya.`, and `replace` turns it back into `call Priya.`.

### Why the cost comes first

When recognition does not know this person's name, it writes the name wrong and you fix it by hand each time. The dictionary does that work once: fill one row, and every later dictation uses it. Step 2 shows the row's three routes and separate dictionary-wide notes.

### Next

One row has three parts. The next step shows where the term and aliases go, and why the row note stays behind.

## Step 2 · Three row routes and one settings route

> **In one line:** The term goes to the speech model, the alias goes into transcript replacement, and only the term and aliases enter the glossary; the row note stays private, while separate dictionary-wide `settings.Dictionary.Notes` enters the language-model prompt.

### On the stage

- The blue box on the left is the dictionary row: term, alias and row note. The row note is marked private and is not sent.
- The four boxes on the right are the destinations, each with its switches. The fourth comes from separate `settings.Dictionary.Notes`.
- Three thin lines run from the term and aliases to the first three boxes; the row note has no arrow.

### The four destinations and their switches

| Destination | Gets | Switch |
|---|---|---|
| speech model · hints | only enabled terms | dictionary on + speech hints on |
| transcript · replace | aliases become the term | dictionary on |
| language model · glossary | copies only terms + aliases, never row notes | dictionary on + glossary on |
| language model · dictionary notes | separate `settings.Dictionary.Notes` | dictionary on, notes not off |

Sources: `run_audio.go:36`, `cleanup.go:69`, `run_transcribe.go:110-120`, `text.go:120-126`.

The source marks a row's `store.Term.Note` as “not sent anywhere” (`internal/store/store.go:215-230`). `glossary()` constructs each `compose.Term` with only `Term` and `Aliases`, so a row note cannot ride along in the glossary either.

The switches live in `settings.Dictionary`: `Enabled`, `ASRHints`, `Glossary`, `NotesOff` (`Voxt/internal/settings/settings.go:285-306`). By default `Enabled`, `ASRHints` and `Glossary` are on (`settings.go:393`).

### Why the split

The four places take different input. The recognizer reads a word list, replacement reads aliases, the glossary copies only terms and aliases, and dictionary-wide notes come from separate settings. The row note belongs to none of these sending routes.

### Next

The next four steps walk this map one destination at a time, each marked "k of 4".

## Step 3 · Terms become speech hints

> **In one line:** Enabled terms are ordered most-recently-changed first and sent to the speech model as hints; aliases stay out.

### On the stage

- The blue box on the left lists two enabled terms: `Priya` and `MOSS-Transcribe`. `MOSS-Transcribe` is the dictionary's other term; the first two steps drew only `Priya`.
- An arrow points to the speech model on the right, which lists the same two words.
- The orange box below, `Preeya ✗`, says the alias is not sent.
- The bottom line says a service with fewer hint slots drops hints from the end, so the newest-changed terms stay at the front.

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

Some recognition services accept a limited number of hints; the `dict.Hints` comment says they cut the list from the end. Truncating the tail keeps the front of the list, so newest-changed terms survive.

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

- A Latin alias is checked at each end only when that end of the alias is itself a letter or digit outside Han, Hiragana, Katakana and Hangul (`wordRune`, `alias.go:140-147`, `190-197`). `Preeya` starts and ends with letters, so neither side may touch another letter or digit outside those four scripts; a Han, Hiragana, Katakana or Hangul character next to it does not block the match. An alias that ends in punctuation skips the check on that side, so `Priya!` can match inside `Priya!next`.
- Han, Hiragana, Katakana and Hangul are not word runes, so aliases written in those scripts match anywhere.
- When several patterns match at one place, the **longest** wins (patterns are sorted by size descending, `alias.go:73`).
- A term already written as itself is left alone, so running this twice does not break it (`alias.go:90`).

$$\text{replace}(\text{Preeya}) = \text{Priya}\quad\text{when the dictionary and the term are enabled}$$

| Symbol | Meaning | Source |
|---|---|---|
| recognized text | what the speech model wrote | the speech model from Step 3 |
| alias | the spelling being replaced | Step 1 |
| term | the correct spelling it becomes | Step 1 |

### Why this does not depend on the model

This replacement still works when the language model is missing or errors. `spoken()` calls `dict.Replace(raw, r.terms)` at `session/cleanup.go:68`; `session/run.go:301` hands it the recognized text first, and `run.go:312` enters cleanup only after that. The order is what guarantees it.

### Next

Replacement only fixes aliases. If recognition writes a wrong form that is neither the term nor any alias, the next step's glossary reminds the language model.

## Step 5 · Which message holds the glossary

> **In one line:** A small dictionary puts the glossary in system; a large one puts matched terms at the start of user, before this request's input, only when the rendered glossary is not empty.

### On the stage

- Left panel, at most 30 distinct terms: system holds general rules, `- Priya (heard as: Preeya)` and `- MOSS-Transcribe`, while user holds `call Priya.`. Both terms from Step 3 are here.
- Right panel, more than 30 distinct terms: system holds only generic rules; user opens with `<glossary>`, then contains `call Priya.`. A term appears when the text mentions it or any of its aliases, so `MOSS-Transcribe` is there only if this text names it or one of its aliases.
- Both user panels use `call Priya.` because Step 4 has already replaced `Preeya` with `Priya`; the language model receives the replaced text (`session/run.go:301-312`).
- The bottom line states the selection rule: at most 30 terms puts all of them in; more than 30 keeps only the terms the text mentions by name or alias. The 60-line and 2000-byte caps belong to the formula below.

### Candidates and message placement

`compose.Build` de-duplicates terms, then selects candidates by the distinct-term count (`Voxt/internal/compose/compose.go:366-377`, `585-599`):

| Distinct terms | Candidates | System | User |
|---|---|---|---|
| $n \le 30$ | all distinct terms in dictionary order | generic rules + the rendered glossary | the replaced input |
| $n > 30$ | only terms the text names, or whose alias it names | generic rules only | `<glossary>` first when it is non-empty, then the replaced input |

If no term matches from a large dictionary, or no matched term's line fits the caps, the rendered glossary is empty, so user has no `<glossary>` block while system's generic instruction remains (`compose.go:411-416`, `576-582`).

### Formula

$$C = \begin{cases}\text{all distinct terms} & n \le 30 \\\text{terms whose term or alias the text contains} & n > 30\end{cases}$$

$$G = \text{the longest prefix of } C \text{ with } |G| \le 60 \text{ and } B(G) \le 2000$$

$$B(G) = \sum_{g \in G}\operatorname{bytes}(g) + \max(|G| - 1, 0)$$

| Symbol | Meaning | Source |
|---|---|---|
| $n$ | number of enabled terms after de-duplication | `distinctTerms`, `compose.go:585-599` |
| $C$ | candidate terms in dictionary order; a term enters when the text contains its term or any alias | this step's selection rule |
| $G$ | the consecutive prefix actually sent | `compose.go:576-580` |
| $\lvert G\rvert$ | number of complete lines sent | this step |
| $g \in G$ | one complete glossary line in $G$ | `- Term (heard as: alias)` |
| $\sum_{g \in G}$ | add the byte count of every line in $G$ | this step |
| $\operatorname{bytes}(g)$ | the line's UTF-8 byte count | Go's `len(string)` |
| $\max(\lvert G\rvert-1, 0)$ | newline separators between lines, or 0 for no lines | `strings.Join(lines, "\n")` |
| $B(G)$ | line bytes plus newline separators, excluding `<glossary>` tags | `compose.go:576-582` |
| 30 / 60 / 2000 | all-candidates threshold / line cap / byte cap | `compose.go:244-250` |

The loop breaks at the first line that does not fit. It does not skip that line to seek a shorter later one, and it never truncates a line. Newlines appear only between lines, so $N$ lines have $N-1$ separators.

The “longest prefix” here is just the first N candidate lines, kept in order. 2000 bytes is about one page of plain text; a common Chinese character usually takes 3 bytes, and some take 4, so the same cap holds fewer Chinese characters than ASCII letters.

### A constructed example (not drawn on the stage)

This example is not on the stage; it has three candidate lines of 900 bytes each:

| Candidate | Output bytes if added | Result |
|---|---|---|
| line 1 | $900$ | kept |
| line 2 | $900 + 1 + 900 = 1801$ | kept |
| line 3 | $1801 + 1 + 900 = 2702$ | over 2000, stop |

So $G$ contains only the first two complete lines. If line 61 crosses the line cap instead, output stops after line 60.

### What the cache can promise

For a small dictionary, the glossary lives in system, and system does not vary with this dictation's text. With other settings unchanged, the provider **may** reuse the prompt cache for that unchanged prefix; the tests prove only that the system string is independent of the input (`compose_test.go:574-577`, `595-630`). In plain terms, the model service may already hold that unchanged opening text and skip re-reading it, which could save time and tokens; nothing here promises it.

### Boundary

The glossary only shapes the language model's output; it does not change recognition and does not force the model to comply. With the glossary switch off, `glossary()` returns empty (`run_transcribe.go:110-112`).

### Next

Terms and aliases are covered. The next step covers separate dictionary-wide notes and the full system, history, user sequence.

## Step 6 · Dictionary notes and the complete message order

> **In one line:** Dictionary-wide `settings.Dictionary.Notes` enters system as its own layer; this request's input sits only in user, and each row note stays private.

### On the stage

- The blue box on the left is **dictionary-wide notes**, sourced from `settings.Dictionary.Notes`, such as "Priya is on the design team; heard as Preeya".
- An arrow points to the notes layer in system on the right, which explicitly says this request's input is not in system.
- The orange box below lists the two places the notes **never** go: the speech model and transcript replacement.
- The bottom lines give `system → history → user`, then say notes-off keeps dictionary notes out of the prompt.

### The two kinds of note

A row's `store.Term.Note` is private; the source says “not sent anywhere” (`internal/store/store.go:215-230`). This step concerns separate `settings.Dictionary.Notes`: one Markdown passage shared by the whole dictionary and shown only to the language model.

`PromptDictionary` returns those dictionary notes only when `Dictionary.Enabled && !NotesOff` (`Voxt/internal/session/text.go:120-126`). `addDictionary` trims them and adds the `dictionary` layer after the task instructions and before scene and glossary (`Voxt/internal/compose/dictionary.go:11-17`). Layers are joined with a blank line.

### Formula

$$\text{system} = [\text{task layers},\ \text{dictionary notes},\ \text{scene},\ \text{small-dictionary glossary (if any)},\ \text{output rules},\ \text{cleanup example (if any)}]$$

$$\text{messages} = [\text{system},\ \ldots\text{history},\ \text{user}]$$

$$\text{user} = [\text{large-dictionary } \langle glossary\rangle\text{ (if any)}] \oplus [\langle input\rangle\text{call Priya.}\langle /input\rangle]$$

| Symbol | Meaning | Source |
|---|---|---|
| dictionary notes | `settings.Dictionary.Notes` shared by the dictionary | `session/text.go:120-126` |
| scene | the other context layer for this task | placement in `compose/dictionary.go:11-17` |
| small-dictionary glossary | Step 5's system content with at most 30 terms | Step 5 |
| output rules | the layer that tells the model how to write its answer | `compose.go:379-392` |
| cleanup example | Transcribe's example in system; other tasks can omit it | `compose.go:387-392` |
| $\oplus$ | join two parts in order | this step |
| messages | the complete sequence sent to the language model | `compose.go:253-258` |
| history | messages between system and user; empty in this Transcribe example | `compose.go:253-258`, `387-392` |
| user | the final user message | `compose.go:253-258` |
| $\langle input\rangle$ | tags around this request's replaced input | `compose/before.go:13-17` |
| `call Priya.` | the request input after Step 4's replacement | Steps 4 and 5 |

### Why dictionary notes differ from the glossary

The glossary is structured term-to-alias data selected by rules; dictionary notes are free text, and the model reads whatever you write. Notes can carry what the glossary cannot, such as "Priya may be recognized as Preeya; do not change this team's wording". They are shown only to the language model, so they change neither recognition nor transcript replacement.

### Boundary

Turning notes off only keeps the notes out of the prompt; it does not delete the text you wrote. Empty dictionary notes add no layer, so system matches one with no notes. Other tasks can have history; this Transcribe example has none, and its cleanup example lives in system rather than history (`compose.go:387-392`).

### Next

The four destinations are covered. The final step asks what survives when the language model is away.

## Step 7 · What survives without the language model

> **In one line:** Speech hints and alias replacement run outside the language model and survive its failure; the glossary and dictionary notes vanish with it.

### On the stage

- Four rows list speech hints, alias replacement, glossary and dictionary notes, each with where it goes.
- The orange column on the right is the model-off state: the first two are ✓, the last two are ✗.
- The two lower lines say the first two run outside the language model, and the master dictionary switch turns all four off.
- The dashed box at the bottom hands the topic to the next chapter: how long the recording and its history last.

### Why the first two survive

`SpeechHints` calls `dict.Hints` only when a recognition request is sent (`session/run_audio.go:36`); `spoken()` calls `dict.Replace` only right before cleanup (`session/cleanup.go:68`). Neither needs the language model. The glossary is assembled by `glossary()` and dictionary notes are added by `addDictionary`, both only while a cleanup request is built; without the model there is no such request.

| Destination | With model off | Reason |
|---|---|---|
| speech hints | still works | sent to the recognizer, not through the language model |
| alias replacement | still works | runs right after recognition, before cleanup |
| glossary | gone | sent with the language-model prompt |
| dictionary notes | gone | sent with the language-model messages |

### The master switch

With `Dictionary.Enabled` off, `SpeechHints`, `spoken()`, `glossary()` and `PromptDictionary` all return empty, so all four stop together. The other three switches (speech hints, glossary, notes off) each control one destination.

### Next

The dictionary only fixes the words. The recording and its history are still there; the next chapter asks how long they last and how they expire.
