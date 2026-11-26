## Step 1 · Keep one Sample for the whole interaction

**One sentence.** The second model call needs the first action and tool observation, so one `Sample` keeps all twelve response tokens in order.

### On the stage

- `P` holds two prompt tokens. `A` holds four tokens in the model's first action, and `B` holds five in its later action.
- `O` holds three observation tokens returned by the tool. An action is the model's instruction to a tool; an observation is the tool's reply.
- The dashed left card splits these spans into separate records. Its second model call cannot read `A` or `O`.
- The blue right card keeps one `Sample`. Its second call reads `P + A + O`, while `B` is the new action written by that call.

### Formula and symbols

$$C_2=P+A_1+O_1,\qquad R=A_1+O_1+A_2,\qquad D=A_1+O_1$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | Prompt token count | Constructed value: 2 |
| $A_1$ | First model-action span length | Constructed value: 4 |
| $O_1$ | Tool-observation span length | Constructed value: 3 |
| $A_2$ | Later model-action span length | Constructed value: 5 |
| $C_2$ | Tokens supplied to the second model call | Sum in this step |
| $R$ | Response tokens in the final `Sample` | Sum in this step |
| $D$ | Earlier response tokens lost by splitting the records | Sum in this step |

### The numbers on the stage

$$C_2=2+4+3=9,\qquad R=4+3+5=12,\qquad D=4+3=7$$

The nine second-call inputs include the two prompt tokens. The seven missing tokens count response context only, so they exclude the prompt. The twelve response tokens also exclude the prompt; `Sample.tokens` contains $2+12=14$ tokens in this constructed example.

### Next

The record now preserves order. The next step marks which response tokens the model wrote and should learn from.

Sources: `THUDM/slime@cd4a8efc6f8e33364a474cfa70875779ed0a673f`, `examples/search-r1/generate_with_search.py:145-158,180-200,209-232`; `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:309-350`.

## Step 2 · Mark response tokens with a loss mask

**One sentence.** Model actions receive mask 1 and tool observations receive mask 0, so nine of twelve response tokens teach the model.

### On the stage

- The response keeps Step 1's `A → O → B` order.
- The blue action spans `A` and `B` have mask 1, giving $4+5=9$ tokens.
- The orange observation span `O` has mask 0 on all three tokens.
- Mask 0 does not delete `O`. The next model call still reads it, but training does not compute a learning loss for those positions.

### Formula and symbols

$$N_{\text{learn}}=\sum_i m_i,\qquad N_{\text{response}}=N_{\text{learn}}+N_{\text{skip}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $i$ | One position in the response sequence | Step 1's `A → O → B` |
| $m_i$ | Loss mask at position $i$: 1 for actions, 0 for observations | This step |
| $N_{\text{learn}}$ | Response tokens with mask 1 | Sum in this step |
| $N_{\text{skip}}$ | Observation tokens with mask 0 | Sum in this step |
| $N_{\text{response}}$ | Tokens in the complete response | Step 1: 12 |

### The numbers on the stage

$$N_{\text{learn}}=4+5=9,\qquad N_{\text{skip}}=3,\qquad N_{\text{response}}=9+3=12$$

The mask aligns with every response position: `[1,1,1,1, 0,0,0, 1,1,1,1,1]`. Observation log probabilities can be zero because mask 0 excludes them from the learning loss.

### Next

The text observation joins the existing tokens. The next step removes the prefix that a chat template would otherwise repeat.

Sources: `THUDM/slime@cd4a8efc6f8e33364a474cfa70875779ed0a673f`, `examples/search-r1/generate_with_search.py:180-200,209-232`; `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:309-350`.
