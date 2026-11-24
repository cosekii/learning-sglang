## Step 1 · A new tag for each dictation

> **In one line:** Each successfully started dictation gets a new session ID, giving its work a shared identity.

### On the stage

- Two dictations: the first and the second.
- Two blue tags: `session ID = A` and `session ID = B`.
- Two result boxes: results 1 follow A, and results 2 follow B.
- `A ≠ B`: a new dictation does not reuse the previous dictation's session ID.
- A and B are teaching stand-ins; the app generates string session IDs.

### The mapping

$$
D_1 \rightarrow S_A,\qquad D_2 \rightarrow S_B,\qquad S_A \neq S_B
$$

| Symbol | Meaning | Where it comes from |
|---|---|---|
| $D_1$ | The first dictation | This step's constructed example |
| $D_2$ | The second dictation | This step's constructed example |
| $S_A$ | The first dictation's session ID, shortened to A | Generated when this dictation starts |
| $S_B$ | The second dictation's session ID, shortened to B | Generated when this dictation starts |

### The numbers on the stage

Two dictations map to two different session IDs. The picture therefore has two tags, not one tag shared by both dictations. Two is a constructed teaching count, not an app limit.

### How the tag works in the source

The teaching picture draws identity as a tag. The source uses two routing mechanisms:

- Recording jobs use the session ID.
- ASR and LLM streaming callbacks bind to their own `run`, the object for one dictation. `Manager.update` checks that this run is still current or registered in the background, and has not ended. It does not merely compare a string attached to a result.

An old session that is composing can register in the background and keep writing its own card and history, not the new session's current card. “Every old result is discarded” would therefore be wrong. Later steps will draw the late-result gate; this step only establishes that each successful start gets a new tag.

### Next

Put one tagged dictation on the full route: hotkey, helper, speech recognition, cleanup, delivery and history.

### Source

Public baseline: `sglang-omni@34961b7df8fbd050d8e1e1bc9d82fbd165eb8566`. Paths are relative to that repository.

- Every successful `Manager.Start` calls `NewID()` and creates a new run: `Voxt/internal/session/manager.go:193-215`.
- Production uses `core.NewID(time.Now())`: `Voxt/session_link.go:232-237`; real IDs are ULID strings: `Voxt/internal/core/ids.go:12-21`.
- ASR callbacks bind to a run: `Voxt/internal/session/run_audio.go:190-201`; LLM callbacks: `Voxt/internal/session/cleanup.go:133-139,194-203`.
- `Manager.update` checks identity and completion: `Voxt/internal/session/manager.go:341-367`; the background exception: `Voxt/internal/session/manager.go:238-253`.
