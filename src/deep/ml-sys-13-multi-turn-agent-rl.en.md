## Step 1 · Keep one Sample for the whole interaction

**One sentence.** The second model call needs the first action and tool observation, so one `Sample` keeps all twelve response tokens in order.

### On the stage

- `P` holds two prompt tokens. `A` holds four tokens in the model's first action, and `B` holds five in its later action.
- `O` holds three tokens in the encoded tool observation. An action is the model's instruction to a tool. `O` is the complete observation delta, including any generation marker within those three tokens.
- The dashed left card deliberately gives the second call only two `P` squares. Its seven dashed orange squares mark the missing `A + O` context. This contrasts missing context, not a claim that separate storage must discard `A` or `O`.
- The blue right card follows this implementation's ordered `Sample`. `A` and `O` squares join `P` before the second call; five `B` squares then append the new action.

### Formula and symbols

$$C_2=p+a+o$$

$$N_{\text{response}}=a+o+b$$

$$N_{\text{missing}}=a+o$$

| Symbol | Meaning | Source |
|---|---|---|
| $P,A,O,B$ | Prompt, first-action, observation and later-action token spans | Constructed spans on the stage |
| $p,a,o,b$ | Token counts for those four spans | Constructed values: 2, 4, 3 and 5 |
| $C_2$ | Tokens supplied to the second model call | Sum in this step |
| $N_{\text{response}}$ | Response tokens in the final `Sample` | Sum in this step |
| $N_{\text{missing}}$ | Earlier response tokens missing when the second call receives only `P` | Sum in this step |

### The numbers on the stage

$$C_2=2+4+3=9$$

$$N_{\text{response}}=4+3+5=12$$

$$N_{\text{missing}}=4+3=7$$

The nine second-call inputs include the two prompt tokens. The seven missing tokens count response context only, so they exclude the prompt. The twelve response tokens also exclude the prompt.

### Derived · not drawn

`Sample.tokens` also holds the two prompt tokens, so this constructed record has $2+12=14$ tokens. This total is not drawn on the stage.

### Next

The record now preserves order. The next step marks which response tokens the model wrote and should learn from.

Sources: <code>THUDM/<wbr>slime@<wbr>cd4a8efc6f8e33364a474cfa70875779ed0a673f</code>, `examples/search-r1/generate_with_search.py:145-158,180-200,209-232`; <code>THUDM/<wbr>slime@<wbr>f68dc4a25f362fc0335165a17ff976f5b6f675e1</code>, `examples/geo3k_vlm_multi_turn/rollout.py:309-350`.

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
- The first card encodes fixed dummy messages and yields six orange prefix cells. Dummy messages are template messages without this turn's observation.
- The second card encodes those messages plus the new observation and the `assistant generation prompt`. That prompt is the template's request for the next assistant reply, and it sits after the observation. This constructed example has nine tokens.
- The third card slices from index 6. The six prefix cells stay behind and only the three blue `Δ` cells join `Sample.tokens`.
- `Δ` is the complete observation delta: observation content plus the assistant generation prompt. Earlier and later steps call this complete delta `O`.

### Formula and symbols

$$\Delta=F[\ell:],\qquad \ell=|\operatorname{enc}(U)|$$

| Symbol | Meaning | Source |
|---|---|---|
| $U$ | Dummy messages without this turn's observation or assistant generation prompt | This step |
| $\operatorname{enc}(U)$ | Token sequence for the dummy messages | Constructed here as six tokens |
| $\ell$ | Prefix tokens to remove | Length of $\operatorname{enc}(U)$ |
| $F$ | Full token sequence for dummy messages, observation content and assistant generation prompt | Constructed here as nine tokens |
| $\Delta$ | Complete observation delta that joins the sample | Slice $F$ from index $\ell$ |

### The numbers on the stage

$$\ell=|\operatorname{enc}(U)|=6,\qquad \Delta=F[6:],\qquad 9-6=3$$

The slice keeps the three `Δ` tokens at indices 6, 7 and 8. They cover observation content and the assistant generation prompt, so the prompt is part of `O`, not an extra fourth token. The implementation computes $\ell$ and slices without fixing it at six or checking that the dummy encoding is a prefix of the full encoding. This picture constructs them with that shared prefix.

### Next

An observation can also carry an image. The next step separates that image's rollout input from its training input.

Source: `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:54-107`.

## Step 4 · Send an image down two record paths

**One sentence.** One observation image joins the rollout image list and produces a separate processor tensor bundle for training.

### On the stage

- This step extends the earlier example: the initial VLM input now has one image, and this observation adds one more `O` image icon.
- The rollout fork copies the initial and observation images onto the rollout path. The next model call receives both encoded images in `image_data`.
- The second fork copies the observation onto the training path. Buffer `Q` holds two processor dictionaries, `D0` for the initial input and `D1` for the observation.
- The `processor` prepares images and text as model inputs. Each bundle is a dictionary: a field name points to a `tensor`, which is a grid of model numbers.
- Both `D0` and `D1` exclude the processor's `input_ids` and `attention_mask` fields. `input_ids` holds token IDs, and `attention_mask` marks real positions instead of padding. Step 3 already saved `O` in the separate ordered token record, so `Q` keeps only the other multimodal tensors.

### Formula and symbols

$I=I_0+I_1,\qquad Q=[D_0,D_1]$

| Symbol | Meaning | Source |
|---|---|---|
| $I_0$ | Initial image count | Constructed value: 1 |
| $I_1$ | Image count in this observation | Constructed value: 1 |
| $I$ | Images visible to the next rollout call | Sum in this step |
| $D_0$ | Processor tensor dictionary for the initial input | This step |
| $D_1$ | Processor tensor dictionary for the observation | This step |
| $Q$ | Training tensor buffer awaiting a merge | Appended once per turn |

### The numbers on the stage

$$I=1+1=2,\qquad Q=[D_0,D_1]$$

Rollout keeps both images for the next call. The training buffer keeps two tensor dictionaries. These serve two consumers, so neither representation replaces the other.

### Next

Training wants merged tensors. The next step groups values by dictionary key and concatenates each group once.

Source: `THUDM/slime@f68dc4a25f362fc0335165a17ff976f5b6f675e1`, `examples/geo3k_vlm_multi_turn/rollout.py:90-112,250-280,341-359`.

## Step 5 · Buffer chunks, then concatenate once

**One sentence.** Buffer each turn's tensors and concatenate each key once to avoid recopying old rows. This does not prove lower peak memory.

### On the stage

- The initial tensor `T0` and observation tensor `T1` share key `k`, the field name that points to the same kind of tensor in dictionaries `D0` and `D1`.
- The first two cards use the same scale. Each starts with two orange input rows and one orange input row, then adds a three-row blue output.
- The left card is a comparison: concatenating every turn copies three rows now and recopies those three old rows when another turn arrives. The next turn and its new chunk are not drawn.
- The middle card is the pinned implementation: buffer the chunks, then copy the three rows into the output once.
- The right card applies to both approaches. While `torch.cat` writes the output, the two input chunks and the output coexist: $2+1+3=6$ rows. These are constructed row counts, not byte measurements.
- Non-tensor fields do not join. A key also gets no merged value when not all its values are tensors.

### Formula and symbols

$$X_k=\operatorname{cat}([T_{0,k},T_{1,k}],\ dim=0),\qquad r_k=r_{0,k}+r_{1,k}$$

| Symbol | Meaning | Source |
|---|---|---|
| $k$ | Constructed field name shared by both dictionaries | Step 4's bundles |
| $T_{0,k}$ | Tensor under key $k$ in the initial dictionary | Step 4's $D_0$ |
| $T_{1,k}$ | Tensor under key $k$ in the observation dictionary | Step 4's $D_1$ |
| $X_k$ | Merged tensor | One `torch.cat` in this step |
| $r_{0,k},r_{1,k}$ | Row counts along dimension 0 | Constructed values: 2 and 1 |
| $r_k$ | Merged row count along dimension 0 | Sum in this step |

### The numbers on the stage

$$r_k=2+1=3$$

Concatenating every turn copies three rows now and recopies those three old rows next turn. Buffering first copies three rows once. Both approaches keep $2+1+3=6$ input and output rows alive during this concat.

The implementation builds `k → [T0, T1]`, then runs `torch.cat([T0, T1], dim=0)` once. The article motivates this choice with fewer repeated allocations and copies. The final input chunks still coexist with the output, and this step has no byte or peak-memory measurement. It claims fewer repeated copies, not a lower peak.

### Next

The context and multimodal inputs are ready. The next step checks the conditions that end this interaction trajectory.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/vlm-multi-turn/readme.md`, the appendix on handling `multimodal_train_inputs`; <code>THUDM/<wbr>slime@<wbr>f68dc4a25f362fc0335165a17ff976f5b6f675e1</code>, `examples/geo3k_vlm_multi_turn/rollout.py:115-138,300-306`.

## Step 6 · Three stop exits

**One sentence.** Maximum turns and environment completion produce `COMPLETED`; an exhausted token budget produces `TRUNCATED`.

### On the stage

- The three cards are separate constructed runs, not three states that one run passes through in sequence. The red outline says which example is playing; it is not a cursor in one trajectory.
- The maximum-turn example gains a blue `COMPLETED` pill after turn 2.
- The budget example subtracts all twelve tokens and gains an orange `TRUNCATED` pill, meaning a length limit cut that trajectory off.
- The environment example returns `done=True` and gains a blue `COMPLETED` pill without appending that observation.
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

## Step 7 · ToolAgentLoop owns interaction; the server generates

**One sentence.** This step switches to verl: `ToolAgentLoop` decides when to call the model and tools, while `server_manager.generate` only accepts tokens and returns action tokens.

### On the stage

- The blue `ToolAgentLoop` sends accumulated `prompt_ids` `P` and the same `request_id` `u` to the server manager.
- The orange server manager returns four `A` cells without parsing or selecting tools.
- Control returns to `ToolAgentLoop`. When action `A` contains a valid tool call, four blue mask-1 cells appear and `ToolAgentLoop` calls the tool.
- The tool or environment returns three orange `O` cells without assigning their mask. The return arrow goes back to `ToolAgentLoop`, not directly to the server.
- The pictured repeat needs three conditions: a valid tool call, room for `O`, and a remaining turn. In that case `ToolAgentLoop` appends `O` with mask 0, and the first card shows `P+A+O` entering the next model call with the same `u`. Any stop rule ends the loop instead.

### Formula and symbols

$$A=G(u,P),\qquad O=\operatorname{tool}(A),\qquad P'=P+A+O$$

| Symbol | Meaning | Source |
|---|---|---|
| $u$ | Shared `request_id` for this interaction | `ToolAgentLoop.run` in this step |
| $P$ | Accumulated `prompt_ids` for the current model call | Step 1's prompt sequence, with prior spans appended |
| $G$ | Server manager's token-generation call | This step |
| $A$ | Action tokens returned by the model | Step 1: four tokens |
| $\operatorname{tool}$ | Environment path that parses the action and executes the tool | This step |
| $O$ | Complete tool-observation delta | Step 3: three tokens |
| $P'$ | Accumulated input for the next model call | Sum in this step |

### The numbers on the stage

$$P'=P+A+O,\qquad |A|=4,\quad |O|=3$$

The server receives input tokens and sampling parameters. `ToolAgentLoop` owns tool state, stop rules and the mask. The picture follows a valid tool call with room to append `O` and a remaining turn; verl stops when no tool call exists, a tool returns an error, or a limit is reached. The second model call uses the same `request_id`.

### Next

Different tasks need different turn counts and response lengths. The next step aligns those responses in a training batch.

Sources: `verl-project/verl@c5b189a1af496d0bc68320cd1d5bd7a1f1e3638a`, `verl/experimental/agent_loop/tool_agent_loop.py:59-133` and `agent_loop.py:43-105`.

## Step 8 · Right-pad responses into a training batch

**One sentence.** The configured `response_length` is twelve, so Sample S2 gains five empty cells after seven response tokens, and both masks exclude padding.

### On the stage

- This example configures `actor_rollout_ref.rollout.response_length` as twelve. It does not choose the width from the longest response in the current batch.
- In the first card, Sample S1's row has twelve blue real-response cells and already matches the configured width.
- Sample S2's row starts with four blue `A` cells and three blue `O` cells. Five orange right-side padding cells then bring it to twelve cells.
- The response-mask card assigns 1 to the four actions and 0 to the three observations and five padding cells. Observations and padding do not teach the model.
- The response `attention_mask` card assigns 1 to all seven real responses and 0 to padding. Other batch fields stay outside this step.

### Formula and symbols

$$M=M_{\text{raw}}\odot Z$$

| Symbol | Meaning | Source |
|---|---|---|
| $M_{\text{raw}}$ | Right-padded raw response mask | Step 2: 1 for actions, 0 for observations |
| $Z$ | Twelve-cell response attention mask: 1 for real responses, 0 for padding | This step |
| $M$ | Final response mask | Elementwise product |
| $\odot$ | Multiplication at each matching position | Defined in this step |

### The numbers on the stage

This worked example assumes that the tokenizer's pad ID is 0. The pinned implementation pads the raw response mask with that ID before the elementwise product. With a nonzero pad ID, the raw padding entries would contain that ID instead; $Z=0$ still makes the final padding mask 0.

S2's raw response mask is `[1,1,1,1,0,0,0,0,0,0,0,0]`, and its response attention mask is `[1,1,1,1,1,1,1,0,0,0,0,0]`. Their elementwise product leaves response mask 0 on observations and padding.

Sample S2's width comes from the configuration: $7+5=12$. A longer response cannot exceed that configuration; the pinned implementation truncates to `response_length` before padding. Padding aligns tensor shapes without adding interaction content.

### Next

One batch can now hold different-length trajectories. This chapter does not measure the waits for model generation, tool execution, or training.

Sources: <code>verl-project/<wbr>verl@<wbr>c5b189a1af496d0bc68320cd1d5bd7a1f1e3638a</code>, <code>verl/<wbr>experimental/<wbr>agent_loop/<wbr>agent_loop.py:321-385</code> and `tool_agent_loop.py:124-131`.
