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

## Step 3 · Append only the observation delta

**One sentence.** Trim the full encoding by the dummy template's length, then append only the three new observation tokens to `Sample.tokens`.

### On the stage

- The first card encodes fixed dummy messages and yields six prefix tokens. Dummy messages are template messages without this turn's observation.
- The second card encodes those messages plus the new observation. This constructed example has nine tokens.
- The third card slices from index 6 and keeps only `O O O`.
- The system or tool preamble does not join the context again on every turn.

### Formula and symbols

$$\Delta=F[\ell:],\qquad \ell=|E(D)|$$

| Symbol | Meaning | Source |
|---|---|---|
| $D$ | Dummy messages without this turn's observation | This step |
| $E(D)$ | Token sequence for the dummy messages | Constructed here as six tokens |
| $\ell$ | Prefix tokens to remove | Length of $E(D)$ |
| $F$ | Full token sequence for dummy messages plus the observation | Constructed here as nine tokens |
| $\Delta$ | Observation tokens that actually join the sample | Slice $F$ from index $\ell$ |

### The numbers on the stage

$$\ell=6,\qquad \Delta=F[6:],\qquad 9-6=3$$

The slice keeps the three `O` tokens at indices 6, 7 and 8. The implementation computes $\ell$ each time instead of fixing it at six. Six and nine only make this positional example easy to check.

### Next

An observation can also carry an image. The next step separates that image's rollout input from its training input.

Source: `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:54-107`.

## Step 4 · Send an image down two record paths

**One sentence.** One observation image joins the rollout image list and produces a separate processor tensor bundle for training.

### On the stage

- The initial input already has one image, and this observation adds one more.
- The rollout path encodes both images into `image_data` for the next model call.
- The training path buffers the initial and observation processor outputs as two dictionaries.
- The `processor` prepares images and text as model inputs. A `tensor` is a grid of model numbers. The training dictionaries exclude `input_ids` and `attention_mask`; Step 3 already stores tokens on their own path.

### Formula and symbols

$$I=I_0+I_1,\qquad B=[T_0,T_1]$$

| Symbol | Meaning | Source |
|---|---|---|
| $I_0$ | Initial image count | Constructed value: 1 |
| $I_1$ | Image count in this observation | Constructed value: 1 |
| $I$ | Images visible to the next rollout call | Sum in this step |
| $T_0$ | Processor tensor dictionary for the initial input | This step |
| $T_1$ | Processor tensor dictionary for the observation | This step |
| $B$ | Training tensor buffer awaiting a merge | Appended once per turn |

### The numbers on the stage

$$I=1+1=2,\qquad B=[T_0,T_1]$$

Rollout keeps both images for the next call. The training buffer keeps two tensor dictionaries. These serve two consumers, so neither representation replaces the other.

### Next

Training wants merged tensors. The next step groups values by dictionary key and concatenates each group once.

Source: `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:90-112,250-280,341-359`.

## Step 5 · Concatenate each key once

**One sentence.** Gather each turn's tensors by key, then run one `torch.cat` per key, producing three rows in this example.

### On the stage

- The initial chunk `T0` and observation chunk `T1` share the constructed key `k`.
- Their tables have two rows and one row under `k`.
- The merge concatenates along dimension 0, placing the second chunk after the first.
- The final training input has three rows under `k`. Non-tensor fields do not join. A key also gets no merged value when not all its values are tensors.

### Formula and symbols

$$C_k=\operatorname{cat}([T_{0,k},T_{1,k}],\ dim=0),\qquad R_k=R_{0,k}+R_{1,k}$$

| Symbol | Meaning | Source |
|---|---|---|
| $k$ | Constructed key shared by both dictionaries | This step |
| $T_{0,k}$ | Tensor under key $k$ in the initial dictionary | Step 4's $T_0$ |
| $T_{1,k}$ | Tensor under key $k$ in the observation dictionary | Step 4's $T_1$ |
| $C_k$ | Merged tensor | One `torch.cat` in this step |
| $R_{0,k},R_{1,k}$ | Row counts along dimension 0 | Constructed values: 2 and 1 |
| $R_k$ | Merged row count along dimension 0 | Sum in this step |

### The numbers on the stage

$$R_k=2+1=3$$

The implementation first builds `k → [T0, T1]`, then runs `torch.cat([T0, T1], dim=0)` once. The chunks retain their initial-then-observation order.

### Next

The context and multimodal inputs are ready. The next step checks the conditions that end this interaction trajectory.

Source: `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:115-138,300-306`.

## Step 6 · Three stop exits

**One sentence.** Maximum turns and environment completion produce `COMPLETED`; an exhausted token budget produces `TRUNCATED`.

### On the stage

- The three cards are alternative exits, not three states that one run passes through in sequence.
- Reaching `max_turns` stops after this turn with `COMPLETED`.
- A remaining token budget at or below zero stops with `TRUNCATED`, meaning a length limit cut the trajectory off.
- An environment result of `done=True` stops with `COMPLETED` before appending that observation.
- An inference result of `finish=length` also truncates. `abort` means cancelled. The cards do not expand those two exits.

### Formula and symbols

$$b_{\text{next}}=b-n,\qquad b_{\text{next}}\le 0\Rightarrow \text{TRUNCATED}$$

| Symbol | Meaning | Source |
|---|---|---|
| $b$ | Remaining token budget | Constructed value: 12 |
| $n$ | Action or observation tokens just appended | Step 1: 12 total |
| $b_{\text{next}}$ | Budget left after the append | Subtraction in this step |
| `max_turns` | Maximum allowed interaction turns | Constructed value: 2 |
| `done` | Boolean through which the environment requests an exit | Environment interface in this step |

### The numbers on the stage

$$b_{\text{next}}=12-(4+3+5)=0\Rightarrow\text{TRUNCATED}$$

This is the constructed budget exit. The maximum-turn exit instead finishes after turn 2 with `COMPLETED`. If the environment returns `done=True` first, the loop also stops before the observation with `COMPLETED`. One run cannot take all three alternatives.

### Next

Stop rules belong to interaction management, not one token-generation call. The next step shows how AgentLoop separates those jobs.

Source: `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:283-290,320-366`.
