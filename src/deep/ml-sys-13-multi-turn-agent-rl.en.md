## Step 1 · Keep one Sample for the whole interaction

**One sentence.** The second model call needs the first action and tool observation, so one `Sample` keeps all twelve response tokens in order.

### On the stage

- `P` holds two prompt tokens. `A` holds four tokens in the model's first action, and `B` holds five in its later action.
- `O` holds three tokens in the encoded tool observation. An action is the model's instruction to a tool. `O` is the complete observation delta, including any generation marker within those three tokens.
- The dashed left card deliberately gives the second call only two `P` squares. Its seven dashed orange squares mark the missing `A + O` context. This contrasts missing context, not a claim that separate storage must discard `A` or `O`.
- The blue right card follows this implementation's ordered `Sample`. `A` and `O` squares join `P` before the second call; five `B` squares then append the new action.

### Formula and symbols

$$C_2=p+a+o,\qquad N_{\text{response}}=a+o+b,\qquad N_{\text{missing}}=a+o$$

| Symbol | Meaning | Source |
|---|---|---|
| $P,A,O,B$ | Prompt, first-action, observation and later-action token spans | Constructed spans on the stage |
| $p,a,o,b$ | Token counts for those four spans | Constructed values: 2, 4, 3 and 5 |
| $C_2$ | Tokens supplied to the second model call | Sum in this step |
| $N_{\text{response}}$ | Response tokens in the final `Sample` | Sum in this step |
| $N_{\text{missing}}$ | Earlier response tokens missing when the second call receives only `P` | Sum in this step |

### The numbers on the stage

$$C_2=2+4+3=9,\qquad N_{\text{response}}=4+3+5=12,\qquad N_{\text{missing}}=4+3=7$$

The nine second-call inputs include the two prompt tokens. The seven missing tokens count response context only, so they exclude the prompt. The twelve response tokens also exclude the prompt; `Sample.tokens` contains $2+12=14$ tokens in this constructed example.

### Next

The record now preserves order. The next step marks which response tokens the model wrote and should learn from.

Sources: `THUDM/slime@cd4a8efc6f8e33364a474cfa70875779ed0a673f`, `examples/search-r1/generate_with_search.py:145-158,180-200,209-232`; `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:309-350`.

## Step 2 · Mark response tokens with a loss mask

**One sentence.** Model actions receive mask 1 and tool observations receive mask 0, so nine of twelve response tokens teach the model.

### On the stage

- The response keeps Step 1's `A → O → B` order.
- The blue action cells `A` and `B` receive a second row of blue mask-1 cells, giving $4+5=9$ tokens.
- The orange observation cells `O` then receive orange mask-0 cells on all three tokens.
- The final training card assembles all twelve mask cells in response order. Mask 0 does not delete `O`: the next model call still reads it, but training computes no learning loss for those positions.

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

**One sentence.** Trim the full encoding by the dummy template's length, then append only the three observation-delta tokens to `Sample.tokens`.

### On the stage

- A `chat template` turns role-labelled messages into model tokens, adding role and generation markers.
- The first card encodes fixed dummy messages and yields six prefix tokens. Dummy messages are template messages without this turn's observation.
- The second card encodes those messages plus the new observation. This constructed example has nine tokens.
- The third card slices from index 6 and keeps only `Δ Δ Δ`.
- `Δ` is the complete observation delta. It can include the generation marker as well as observation content, so it is not necessarily only the tool's text without template markers.

### Formula and symbols

$$\Delta=F[\ell:],\qquad \ell=|E(D)|$$

| Symbol | Meaning | Source |
|---|---|---|
| $D$ | Dummy messages without this turn's observation | This step |
| $E(D)$ | Token sequence for the dummy messages | Constructed here as six tokens |
| $\ell$ | Prefix tokens to remove | Length of $E(D)$ |
| $F$ | Full token sequence for dummy messages plus the observation | Constructed here as nine tokens |
| $\Delta$ | Complete observation delta that joins the sample | Slice $F$ from index $\ell$ |

### The numbers on the stage

$$\ell=6,\qquad \Delta=F[6:],\qquad 9-6=3$$

The slice keeps the three `Δ` tokens at indices 6, 7 and 8. This example calls those three tokens `O`; any generation marker occupies one of those positions rather than adding another token. The implementation computes $\ell$ and slices without fixing it at six or checking that the dummy encoding is a prefix of the full encoding. This picture constructs them with that shared prefix.

### Next

An observation can also carry an image. The next step separates that image's rollout input from its training input.

Source: `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:54-107`.

## Step 4 · Send an image down two record paths

**One sentence.** One observation image joins the rollout image list and produces a separate processor tensor bundle for training.

### On the stage

- This step extends the earlier example: the initial VLM input now has one image, and this observation adds one more.
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
| $n$ | Action and observation tokens consumed since the budget was initialized | Step 1: 12 total |
| $b_{\text{next}}$ | Budget left after the append | Subtraction in this step |
| `max_turns` | Maximum allowed interaction turns | Constructed value: 2 |
| `done` | Boolean through which the environment requests an exit | Environment interface in this step |

### The numbers on the stage

$$b_{\text{next}}=12-(4+3+5)=0\Rightarrow\text{TRUNCATED}$$

This is the constructed budget exit. The maximum-turn exit instead finishes after turn 2 with `COMPLETED`. If the environment returns `done=True` first, the loop also stops with `COMPLETED` and does not append that observation. One run cannot take all three alternatives.

### Next

Stop rules belong to interaction management, not one token-generation call. The next step switches to verl's `ToolAgentLoop`, which has its own length, turn-limit, no-tool-call and tool-error stops rather than this slime example's statuses.

Source: `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:283-290,320-366`.

## Step 7 · AgentLoop owns interaction; the server generates

**One sentence.** This step switches to verl: `ToolAgentLoop` decides when to call the model and tools, while `server_manager.generate` only accepts tokens and returns action tokens.

### On the stage

- The blue `ToolAgentLoop` sends accumulated `prompt_ids` and one shared `request_id` to the server manager.
- The orange server manager returns `response_ids` without parsing or selecting tools.
- Control returns to `ToolAgentLoop`. When action `A` contains a valid tool call, it appends the action with mask 1 and calls the tool.
- The tool or environment returns observation `O` to `ToolAgentLoop` without assigning its mask. `ToolAgentLoop` appends it with mask 0 before the next model call.
- While `request_id` remains in the LRU cache, the same ID reuses the earlier server choice to enable prefix-cache reuse. An evicted ID is assigned again.

### Formula and symbols

$$A=G(r,P),\qquad O=E(A),\qquad P'=P+A+O$$

| Symbol | Meaning | Source |
|---|---|---|
| $r$ | Shared `request_id` for this interaction | `ToolAgentLoop.run` in this step |
| $P$ | Accumulated `prompt_ids` | Step 1 |
| $G$ | Server manager's token-generation call | This step |
| $A$ | Action tokens returned by the model | Step 1: four tokens |
| $E$ | Environment path that parses the action and executes the tool | This step |
| $O$ | Tool-observation tokens | Step 1: three tokens |
| $P'$ | Accumulated input for the next model call | Sum in this step |

### The numbers on the stage

$$P'=P+A+O,\qquad |A|=4,\quad |O|=3$$

The server receives input tokens and sampling parameters. `ToolAgentLoop` owns tool state, stop rules and the mask. The picture follows only the valid-tool-call path; verl stops when no tool call exists or a tool returns an error. The second model call uses the same `request_id`.

### Next

Different tasks need different turn counts and response lengths. The next step aligns those responses in a training batch.

Sources: `verl-project/verl@c5b189a1af496d0bc68320cd1d5bd7a1f1e3638a`, `verl/experimental/agent_loop/tool_agent_loop.py:59-133` and `agent_loop.py:43-105`.

## Step 8 · Right-pad responses into a training batch

**One sentence.** The configured `response_length` is twelve, so Sample B gains five empty cells after seven response tokens, and both masks exclude padding.

### On the stage

- This example configures `actor_rollout_ref.rollout.response_length` as twelve. It does not choose the width from the longest response in the current batch.
- Sample A has twelve real response tokens and already matches the configured width.
- Sample B has seven real response tokens in `A+O`. Five right-side padding cells bring it to twelve cells.
- B's `response_mask` turns zero after four action tokens. The three observation tokens and five padding cells do not teach the model.
- B's response `attention_mask` is one only on the seven real responses and zero on padding. Other batch fields stay outside this step.

### Formula and symbols

$$M=M_{\text{raw}}\odot Z$$

| Symbol | Meaning | Source |
|---|---|---|
| $M_{\text{raw}}$ | Right-padded raw response mask | Step 2: 1 for actions, 0 for observations |
| $Z$ | Twelve-cell response attention mask: 1 for real responses, 0 for padding | This step |
| $M$ | Final response mask | Elementwise product |
| $\odot$ | Multiplication at each matching position | Defined in this step |

### The numbers on the stage

B's raw response mask is `[1,1,1,1,0,0,0,0,0,0,0,0]`, and its response attention mask is `[1,1,1,1,1,1,1,0,0,0,0,0]`. Their elementwise product leaves response mask 0 on observations and padding.

Sample B's width comes from the configuration: $7+5=12$. A longer response cannot exceed that configuration; the pinned implementation truncates to `response_length` before padding. Padding aligns tensor shapes without adding interaction content.

### Next

One batch can now hold different-length trajectories. The next chapter places model generation, tool execution and training on one timeline to find the longest wait.

Sources: `verl-project/verl@c5b189a1af496d0bc68320cd1d5bd7a1f1e3638a`, `verl/experimental/agent_loop/agent_loop.py:321-385` and `tool_agent_loop.py:124-131`.
