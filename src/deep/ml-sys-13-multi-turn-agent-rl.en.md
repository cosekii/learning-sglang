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
