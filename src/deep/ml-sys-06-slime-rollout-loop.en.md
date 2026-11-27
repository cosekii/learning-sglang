## Step 1 · Prepare 256 answers before training

**One sentence.** The shipped config generates eight answers for each of 32 questions and collects all 256 answers and scores before calling training.

### On the stage

- `Weights v0` are the model's current number tables; Step 7 produces `v1` through training.
- Blue boxes hold questions, answers and scores, while orange marks training. Eight answers per question give $32\times8=256$ answers in the middle.
- This step uses answer count to describe one round's workload. It gives no runtime and claims no training improvement.

### Formula and symbols

$$N=n_q\times n_s$$

| Symbol | Meaning | Source |
|---|---|---|
| $n_q$ | Questions selected in one round | Config `rollout-batch-size`: 32 |
| $n_s$ | Answers generated per question | Config `n-samples-per-prompt`: 8 |
| $N$ | Total answers generated in one round | Multiplied in this step |

### The numbers on the stage

$$N=32\times8=256$$

The config also sets `global-batch-size 256`, so the generated count matches the training global batch. That equality does not say how many smaller batches or weight updates happen inside training; Step 7 states this boundary.

### Next

The 256 answers do not start with 256 different questions. The next step shows how the data source copies each question into a group of eight.

Sources: `scripts/run-qwen3-4B.sh:38-53` and `train.py:51-62` at pinned commit `261ecee`.

## Step 2 · Copy each prompt eight times

**One sentence.** `RolloutDataSource` takes 32 prompts and deep-copies each one into a group of eight.

### On the stage

- A `prompt` is the question text sent to the model. The left side takes 32 question cards, and the right side expands one group.
- All eight answer sheets initially contain the same input. `Copy 0` through `copy 7` name positions within the group, not the global sample identifiers omitted from the picture.
- Copying only prepares inputs; it generates no answers. The source gives each copy a distinct `sample.index` for later tracking.

### Formula and symbols

$$N_g=g\times n_s$$

| Symbol | Meaning | Source |
|---|---|---|
| $g$ | Prompt groups in this round | Step 1: 32 |
| $n_s$ | Prompt copies per group | Step 1: 8 |
| $N_g$ | Answer sheets awaiting generation | Multiplied in this step |

### The numbers on the stage

$$N_g=32\times8=256$$

`get_samples` slices the prompts and calls `copy.deepcopy`. If the buffer contains unfinished earlier groups, `RolloutDataSourceWithBuffer` reads them first. This picture starts with an empty buffer on the ordinary path.

### Next

The identical inputs must become eight trainable answer records. The next step lets SGLang write answers with the current weights.

Source: `slime/ray/rollout_data_source.py:46-81,133-167`.

## Step 3 · Rollout writes answer records

**One sentence.** SGLang uses `v0` to answer all eight copies and stores tokens, response length and per-token log probabilities in each rollout record.

### On the stage

- Orange `SGLANG ROLLOUT` marks generation; the eight blue boxes on the right are answer records for the same prompt.
- `tokens` stores prompt token IDs followed by newly generated answer token IDs. `response_length` counts answer tokens only.
- `rollout_log_probs` stores the model's log probability for writing each answer token. It contains generation scores for individual tokens, not a score for the whole answer.
- `reward = ?` marks the separate whole-answer score that is still unassigned. The answer checker adds that reward in Step 4; SGLang does not derive it from `rollout_log_probs`.
- The group's generation tasks run asynchronously; the figure does not claim completion in index order.

### Formula and symbols

$$T_s=T_{q,s}\mathbin{+\!+}T_{a,s},\qquad \ell_s=|T_{a,s}|,\qquad |P_s|=\ell_s$$

| Symbol | Meaning | Source |
|---|---|---|
| $T_{q,s}$ | Prompt token IDs for sample $s$ | Prompt after tokenization |
| $T_{a,s}$ | New answer token IDs for sample $s$ | Returned by SGLang |
| $T_s$ | Complete token list, prompt then answer | `Sample.tokens` |
| $\ell_s$ | Number of answer tokens | <code>Sample.<wbr>response_<wbr>length</code> |
| $P_s$ | List of the model's log probabilities, one per answer token | <code>Sample.<wbr>rollout_<wbr>log_<wbr>probs</code> |
| $\mathbin{+\!+}$ | Concatenate lists in order | Notation introduced here |

### The numbers on the stage

Each group has eight records, so 32 groups contain $32\times8=256$ records. The figure assigns no made-up response lengths; the source increments each $\ell_s$ by the actual number of new tokens.

### Next

The records already contain per-token log probabilities, but those are not rewards. The next step adds a separate whole-answer reward by checking each answer against its expected answer with deepscaler.

Sources: `slime/rollout/sglang_rollout.py:65-131,178-194`; `slime/utils/types.py:8-31`.

## Step 4 · deepscaler assigns raw rewards

**One sentence.** deepscaler checks each model answer against the dataset's expected answer, returning 1 for a verified match and 0 otherwise.

### On the stage

- `Label` is the expected answer stored in the dataset. The left side passes it and the model response to the checker.
- `DEEPSCALER` is the math-answer checker selected by `--rm-type deepscaler`.
- The eight raw rewards on the right are four 1s followed by four 0s. A 1 marks a verified match; a 0 can also mean missing required response structure or an empty label.
- These scores form a constructed teaching example, not measured Qwen3-4B training outputs.

### Formula and symbols

$$r_s\in\{0,1\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $r_s$ | Raw reward for answer $s$ | deepscaler score returned by `async_rm` |

### The numbers on the stage

$$r=[1,1,1,1,0,0,0,0]$$

By default, the eight tasks call `async_rm` separately. Enabling `group_rm` selects the whole-group reward path instead. The shipped script leaves that switch off, so this chapter does not expand it.

### Next

The 0s and 1s do not yet show how an answer compares with its own group. The next step subtracts the prompt group's mean.

Sources: `run-qwen3-4B.sh:44`; `slime/rollout/rm_hub/__init__.py:29-68`; `deepscaler.py:4-42`; `sglang_rollout.py:156-194`.

## Step 5 · GRPO subtracts the group mean

**One sentence.** GRPO uses the mean of the prompt's eight raw rewards as a reference, turning 1 and 0 into $+0.5$ and $-0.5$.

### On the stage

- The top row reuses Step 4's raw rewards; the bottom row subtracts their prompt-group mean.
- `Mean 0.5` uses only the eight rewards for this prompt, never another group's answers.
- `GRPO` here means relative comparison within a group of answers to the same prompt. Positive values sit above the group mean and negative values below it.
- The raw rewards remain available. The controller later stores both `raw_reward` and the processed `rewards`.

### Formula and symbols

$$\bar r=\frac{1}{n_s}\sum_{i=1}^{n_s}r_i,\qquad c_i=r_i-\bar r$$

| Symbol | Meaning | Source |
|---|---|---|
| $r_i$ | Raw reward at position $i$ in the group | Step 4 |
| $n_s$ | Answers per group | Step 1: 8 |
| $\bar r$ | Mean raw reward for this group | Calculated here |
| $c_i$ | Centered reward at position $i$ | Subtracted here |

### The numbers on the stage

$$\bar r=\frac{1+1+1+1+0+0+0+0}{8}=\frac48=0.5$$

$$c(1)=1-0.5=+0.5,\qquad c(0)=0-0.5=-0.5$$

This config selects GRPO and leaves reward normalization enabled, so it performs this subtraction.

### Next

The centered rewards still need scaling by the group's spread. The next step computes the standard deviation and normalized values.

Sources: `run-qwen3-4B.sh:80-88`; `slime/utils/arguments.py:546-550,579-584`; `slime/ray/buffer.py:82-103`.

## Step 6 · Divide by the standard deviation

**One sentence.** This config also divides each centered reward by the group standard deviation plus $10^{-6}$, producing approximately $+0.9354$ and $-0.9354$.

### On the stage

- The top row contains Step 5's $c_i$ values and the bottom row their normalized forms $u_i$; the orange arrow marks division by `std + ε`.
- `Std` means standard deviation, which describes how spread out scores are around their mean. All eight centered magnitudes match here, so the standard deviation is slightly above $0.5$.
- `ε` is a small division guard fixed at $0.000001$. The denominator 7 comes from the unbiased `torch.std` default, $8-1$.
- Cards round to four decimals; the formula uses the unrounded standard deviation.

### Formula and symbols

$$s=\sqrt{\frac{\sum_{i=1}^{n_s}c_i^2}{n_s-1}},\qquad u_i=\frac{c_i}{s+\epsilon}$$

| Symbol | Meaning | Source |
|---|---|---|
| $c_i$ | Centered reward at position $i$ | Step 5 |
| $n_s$ | Answers per group | Step 1: 8 |
| $s$ | Standard deviation of the group's centered rewards | `torch.std`, unbiased default |
| $\epsilon$ | Division guard | Hard-coded $10^{-6}$ in the source |
| $u_i$ | Normalized reward at position $i$ | Divided here |

### The numbers on the stage

$$s=\sqrt{\frac{4\times0.5^2+4\times(-0.5)^2}{7}}=\sqrt{\frac27}=0.5345224838\ldots$$

$$u(1)=\frac{0.5}{0.5345224838\ldots+0.000001}=0.9354125967\ldots\approx+0.9354$$

$$u(0)=-u(1)\approx-0.9354$$

### Next

Each answer now has raw and normalized rewards. The next step flattens 32 groups into training data and calls training.

Sources: `slime/ray/buffer.py:86-103`; `run-qwen3-4B.sh:80-88`; `slime/utils/arguments.py:573-584`.

## Step 7 · Flatten the groups and train

**One sentence.** The controller flattens 32 groups into a 256-record global batch, the main loop waits for one Megatron training call to turn those records into weight updates, and this shared-GPU configuration then offloads the training model.

### On the stage

- The left side retains the 32 groups, the middle `CONTROLLER` flattens them and builds `train_data`, and the right side holds 256 training records.
- `Train_data` is summarized on the slide as tokens, response lengths and normalized `rewards`. The `global batch` is the 256 records supplied to this training call, not a pack count or an optimizer-update count.
- The orange box represents one `actor_model.async_train(0, data)` call while the main loop waits. `MEGATRON` names this chapter's training code; `backend = training code` appears in the footnote. Its five jobs are the four operations inside the call and the offload that follows it.
- The call reveals its path one operation at a time: `PACK` forms smaller batches of whole records, `ACTOR LOSS` is the number guiding the model being trained, `BACKWARD` finds the weight-change directions, and `OPTIMIZER UPDATE(S)` applies those changes to produce `v1`. Here `actor` means the model being trained.
- `AFTER RETURN` shows this shared-GPU configuration offloading the training model from GPU to CPU. The last words say Step 8 copies `v1` to rollout, distinguishing that transfer from the optimizer update.
- The footnote points to Ch. 8 Steps 3 and 4 for the FSDP2 version of this call. That chapter uses a separate constructed example, so its two packs and one optimizer update are not counts for this 256-record round.

### Off-stage fields · not drawn

The source also assembles `raw_reward`, truncation flags, sample indices, loss masks and available rollout log probabilities. If the first sample's metadata contains `raw_reward`, the source replaces the post-processed list with the samples' metadata values. The slide omits these additional fields and the conditional replacement.

### Formula and symbols

$$N=g\times n_s=B,\qquad W_1=\operatorname{Train}(W_0,D)$$

| Symbol | Meaning | Source |
|---|---|---|
| $g$ | Prompt groups | Step 2: 32 |
| $n_s$ | Answers per group | Step 1: 8 |
| $N$ | Training records after flattening | Multiplied here |
| $B$ | Configured global batch size | <code>global-<wbr>batch-<wbr>size</code>: 256 |
| $D$ | `Train_data` built by the controller | <code>buffer.py:<wbr>118-154</code> |
| $W_0,W_1$ | Model weights before and after training | This training call |
| $\operatorname{Train}$ | Training call awaited by the main loop | <code>actor_model.<wbr>async_<wbr>train</code> |

### The numbers on the stage

$$N=32\times8=256=B$$

`Train.py` waits for this call with `ray.get` before starting the weight update. The default loss mask assigns 1 to every answer token; a supplied mask must match the actual response length.

### Backend and offload boundary

At `261ecee`, `actor_group.py:9,77-80` instantiates `MegatronTrainRayActor`. Its `get_data_iterator` forms micro-batches (`megatron_utils/data.py:68-150`), `policy_loss_function` computes the actor loss (`megatron_utils/loss.py:228-330`), and `train_one_step` runs the forward-backward schedule before `optimizer.step()` (`megatron_utils/model.py:258-345`). The stage's chain is therefore this chapter's Megatron path. Ch. 8 Steps 3 and 4 later open the FSDP2 version at `55e41ffe` with separate constructed packing and actor-loss arithmetic.

The shipped script sets `--colocate`, so `arguments.py:968-970` sets `args.offload = True`. After training, `actor_model.async_offload()` calls `sleep(("model"))` (`actor_group.py:64-80,135-136`; `megatron_utils/actor.py:134-153`) with CPU backup enabled. The stage therefore says this shared-GPU configuration offloads the training model. Ch. 8's FSDP2 `sleep` explicitly moves the model and optimizer to CPU, so this chapter does not reuse that narrower wording. The main loop then restores rollout weights and calls `async_update_weights()`; rollout restoration stays off the stage.

### Next

The optimizer changed the training weights inside the call. Step 8's `async_update_weights()` is the later transfer of `v1` to rollout, not another optimizer update.

Sources: `slime/ray/buffer.py:42-72,105-154`; `train.py:51-75`, <code>slime/ray/<wbr>actor_group.py:<wbr>9,64-80,135-136</code>, <code>slime/backends/<wbr>megatron_utils/<wbr>{actor,data,loss,model}.py</code>, and `slime/utils/arguments.py:968-970` at `261ecee`; `run-qwen3-4B.sh:51,75-78,141`; Ch. 8 Steps 3 and 4 and `train.py:73-94` at `55e41ffe`.

## Step 8 · Finish updating before the next rollout

**One sentence.** `Train.py` waits for the post-training weight update before SGLang starts rollout 1 with `v1`.

### On the stage

- The left side holds `weights v1` from Step 7, the orange middle box marks weight update, and SGLang receives `v1` on the right.
- `Ray.get(...)` waits for completion here. An `async` function name does not let this main loop skip that wait.
- `ROLLOUT 1` below takes the next prompt groups and generates with `v1`; the completed round above was rollout 0.
- This chapter shows hand-off order only. It leaves transfer media, parallel groups and weight sharding outside the picture.

### Formula and symbols

$$G_0\rightarrow T_0\rightarrow U_0\rightarrow G_1$$

| Symbol | Meaning | Source |
|---|---|---|
| $G_0$ | Generation in rollout 0 | `rollout_manager.async_generate(0)` |
| $T_0$ | Training on rollout 0's data | `actor_model.async_train(0, data)` |
| $U_0$ | Weight update after training | `actor_model.async_update_weights()` |
| $G_1$ | Generation in rollout 1 | Next loop's `async_generate(1)` |

### The numbers on the stage

Lines 51–61 wait for $G_0$ and $T_0$, and line 75 waits for $U_0$. The loop then increments `rollout_id` to 1. Lines 43–44 also perform an initial weight synchronization before entering the loop.

### Next

The orange update box says where `v1` must go. Chapter 7 opens that box to show how weights reach SGLang and when replacement is safe.

Sources: `train.py:43-44,49-78`; `Awesome-ML-SYS-Tutorial/rlhf/slime/code-walk-through/readme.md:71-81`.
