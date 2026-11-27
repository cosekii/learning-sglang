## Step 1 · Quarter the raw weight bytes

**One sentence.** The same 32 weights take 64 bytes in BF16 and 16 raw bytes in INT4, whose 16 choices can change original values.

### On the stage

- The orange card holds 32 BF16 weights. Each value uses 16 bits, or 2 bytes.
- The blue card holds the same count as raw INT4. Each weight uses 4 bits, or 0.5 byte.
- Both bars use one scale, so the blue bar is one quarter of the orange bar. This account covers only raw weight payload.

### Formula and symbols

$$M_{16}=P b_{16},\qquad M_4=P b_4,\qquad r=\frac{M_{16}-M_4}{M_{16}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | Number of values in one weight group | This step's constructed group of 32 |
| $b_{16},b_4$ | Bytes per value in BF16 and INT4 | 2 and 0.5 bytes |
| $M_{16},M_4$ | Raw weight bytes in the two formats | Derived here |
| $r$ | Fraction of raw payload removed | Derived here |

### The numbers on the stage

$$M_{16}=32\times2=64\ \text{B},\qquad M_4=32\times0.5=16\ \text{B}$$
$$r=(64-16)/64=75\%$$

Scales, unquantized tensors, KV cache, activations and runtime workspaces sit outside these 16 bytes. A complete model or rollout therefore need not shrink by 75%. Four-bit INT4 has only $2^4=16$ code choices, each representing one available value. A number outside those choices must move to the nearest one, so its value can change; a number already on the grid can stay unchanged.

### Next

The next step gives one group a shared scale and follows one original value through rounding.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:101-114`; constructed values in `src/ml-sys/numbers.ts`.

## Step 2 · Share one scale across 32 weights

**One sentence.** A group divides by one scale derived from its largest magnitude, rounds to integers in $[-7,7]$, then multiplies by that scale to restore approximate values.

### On the stage

- The original card shows three of the group's 32 BF16 weights: `[0.10, 0.35, 0.70]`.
- The scale card divides the largest absolute value, 0.70, by 7 to get 0.10.
- The integer-code card holds `[1, 4, 7]`. The middle calculation is $0.35/0.10=3.5$, which rounds to 4.
- The restored card multiplies each code by 0.10 and gets `[0.10, 0.40, 0.70]`. The middle absolute error is 0.05.

### Formula and symbols

$$s=\max(\max_i|x_i|/7,10^{-5}),\qquad q_i=\operatorname{clip}(\operatorname{round}(x_i/s),-7,7),\qquad \hat{x}_i=sq_i$$

| Symbol | Meaning | Source |
|---|---|---|
| $x_i$ | BF16 weight $i$ in the group | The three constructed values shown here |
| $s$ | Shared scale, meaning the group's divisor | Largest absolute value divided by 7 |
| $q_i$ | Rounded and clamped integer code | Calculated from $x_i/s$ |
| $\hat{x}_i$ | Approximate value restored from the code | $sq_i$ |
| $\operatorname{clip}$ | Limit values to the stated boundaries | Fake-quantization code at the pinned revision |

### The numbers on the stage

$$s=0.70/7=0.10,\qquad 0.35/0.10=3.5\rightarrow4$$
$$\hat{x}_2=4\times0.10=0.40,\qquad |0.35-0.40|=0.05$$

This fake-QAT rule makes 7 its largest positive code, so it divides the largest magnitude by 7 and uses codes in $[-7,7]$. That is not a universal definition of every INT4 format; Step 5's real export has a different literal clamp.

The pinned implementation finds the maximum and scale in FP32, clamps the scale to at least $10^{-5}$, and casts the restored values back to the input type. This nonzero example does not trigger the scale floor. The complete group has 32 values. The other 29 stay off the stage but have magnitudes at most 0.70, so the displayed 0.70 is the full group's maximum. Display decimals are rounded for readability, and the arithmetic uses those displayed decimals rather than claiming bitwise BF16 results.

### Next

Training repeats this quantize–restore round trip in its forward pass while storage and computation remain BF16. The next step names that path fake quantization.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:53-61`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `docker/patch/latest/megatron.patch:71-110`.

## Step 3 · Keep BF16 storage with fake quantization

**One sentence.** Fake quantization rounds and then restores BF16 in the forward pass, exposing training to quantization error without producing a real four-bit checkpoint.

### On the stage

- The stored model parameter remains trainable BF16's 0.35.
- The dashed blue card performs Step 2's round trip: 0.35 becomes code 4 and then BF16's 0.40.
- Forward computation uses 0.40. Every forward pass experiences rounding, so later updates to the stored BF16 weight can adapt to that error.

### Formula and symbols

$$\hat{w}=\mathcal{D}(\mathcal{Q}(w)),\qquad y=\operatorname{BF16\ compute}(\hat{w},a)$$

| Symbol | Meaning | Source |
|---|---|---|
| $w$ | Stored BF16 model parameter | This example's 0.35 |
| $\mathcal{Q}$ | Division by the scale and rounding to an integer code | Step 2 |
| $\mathcal{D}$ | Multiplication by the scale and conversion back to BF16 | Step 2 |
| $\hat{w}$ | Restored weight used by the forward pass | This example's 0.40 |
| $a$ | Activation, a value produced during computation | Chapter 9 Step 3 |
| $y$ | Output of the current forward computation | Defined here |

### The numbers on the stage

$$w=0.35\rightarrow q=4\rightarrow\hat{w}=0.40$$

“Fake” means storage and matrix computation do not become INT4. The parameter stays BF16, and rounding immediately returns to BF16. QAT means quantization-aware training: the training forward pass repeatedly experiences this rounding. The shipped recipe enables the processing with `OPEN_TRAINING_INT4_FAKE_QAT_FLAG=1` and sets `OPEN_TRAINING_INT4_GROUP_SIZE=32`. `TEGroupedLinear` groups several matrix multiplications in one layer; this code inserts rounding when it retrieves those weights rather than processing every model tensor.

The article's asymmetric comparisons explain why the two sides must pair. QAT with BF16 rollout removes the rounding that training adapted to. Training without QAT followed by INT4 rollout adds rounding that training never saw. These comparisons support fake INT4 training with real INT4 rollout; they do not prove BF16-level results for every model or configuration.

### Next

The forward pass works, but ordinary backpropagation stalls at rounding. The next step shows how STE creates an approximate gradient path.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-49,63-78`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `docker/patch/latest/megatron.patch:124-150` and `scripts/low_precision/run-kimi-k2-Thinking-int4.sh:158-170`.

## Step 4 · Pass gradients around rounding with STE

**One sentence.** A straight-through estimator (STE) treats the complete fake-quantization round trip as identity during backpropagation, so BF16 model parameters still receive gradients.

### On the stage

- The subtitle defines a gradient as the direction and amount for changing a weight. The left card receives that update direction as `grad_output` from later computation.
- The dashed blue STE card returns the same `grad_output` without using rounding's ordinary derivative. STE means straight-through estimator.
- The right BF16 model-weight card receives that gradient and can update. The forward error from 0.35 to 0.40 remains.

### Formula and symbols

The forward pass still computes $\hat w$ as in Step 3. Backpropagation uses an approximation:

$$\frac{\partial \hat w}{\partial w}\approx1,\qquad g_w=g_{\hat w}$$

| Symbol | Meaning | Source |
|---|---|---|
| $w$ | Stored BF16 model parameter | Step 3 |
| $\hat w$ | Rounded and restored forward weight | Step 3 |
| $\partial\hat w/\partial w$ | Derivative of the restored weight with respect to the stored weight | Approximated as 1 by STE |
| $g_{\hat w}$ | Gradient returned by later computation, called `grad_output` in code | Backward input |
| $g_w$ | Gradient passed to the stored weight | STE returns $g_{\hat w}$ unchanged |

### The numbers on the stage

The pinned backward implementation is exactly `return grad_output, None`. The first value belongs to the input weight; the second belongs to the non-trainable `group_size`. It computes neither a scale gradient nor a clipping mask.

Ordinary rounding has derivative zero almost everywhere and no derivative at its jumps. STE is a training approximation. It does not make rounding truly differentiable or remove forward error.

Slime's `set_default_megatron_args` selects BF16 with `args.bf16 = not args.fp16`, and Megatron then sets model parameters to BF16. The recipe also enables `--use-precision-aware-optimizer` without overriding `--main-params-dtype`, whose default is FP32. Chapter 8 already separated BF16 model weights from the optimizer's FP32 master-weight copy: forward uses the former and the optimizer updates the latter. The two stores must not share one “BF16 master weights” label.

### Next

After a training round, the update path must produce the integer codes and scales that rollout actually stores. The next step follows real quantization.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-39`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `docker/patch/latest/megatron.patch:112-122`, `slime/backends/megatron_utils/arguments.py:11-16` and the recipe; `NVIDIA/Megatron-LM@3714d81d418c9f1bca4594fc35f9e8289f652862`, `megatron/training/arguments.py:751-765,3475-3484`.

## Step 5 · Make rollout codes with real quantization

**One sentence.** Every RL weight update converts eligible BF16 weight tables into integer codes and scales that rollout actually stores.

### On the stage

- The BF16 update reuses 0.35, and the group scale remains $0.70/7=0.10$.
- The signed-code card produces 4. The code's literal clamp is $[-8,7]$, unlike fake QAT's $[-7,7]$ in Step 2.
- The scale travels with the codes and is cast to the source weight's BF16 type in this recipe.
- The converter handles non-ignored `.weight` tensors with at least two dimensions and a supported last dimension K. For higher-rank tensors, `view(-1, param.shape[-1])` folds every earlier dimension into rows. Ignored and unsupported tensors stay unquantized. Each update repeats the conversion; this is not only an offline export.

### Formula and symbols

$$s=\max(\max_i|x_i|/7,10^{-5}),\qquad q_i=\operatorname{clip}(\operatorname{round}(x_i/s),-8,7)$$

| Symbol | Meaning | Source |
|---|---|---|
| $x_i$ | One eligible BF16 value in the update | Weight table converted from training |
| $s$ | Scale for this group | `int4_block_quantize` |
| $q_i$ | Signed integer code stored for rollout | Rounded and clamped to $[-8,7]$ |
| $K$ | Last dimension, used as the number of input columns after flattening | `param.shape[-1]` |
| $\operatorname{clip}$ | Limit codes to the stated interval | Export code at the pinned revision |

### The numbers on the stage

$$0.35/0.10=3.5\rightarrow q=4$$

The scale divides the largest magnitude by 7, but the real export's literal clamp has a −8 lower bound while fake QAT uses −7. The chapter preserves that code difference instead of claiming bitwise identity. Export casts scales back to the source weight dtype, BF16 here; fake QAT computes with an FP32 scale. The two sides do not guarantee identical scale bits either.

The public checkpoint and slime's update converter have different scopes. In the public Kimi-K2-Thinking checkpoint, packed weights appear in routed experts; its config excludes `lm_head`, self-attention, shared experts and dense MLP projections. Slime's converter checks `ignore`, the `.weight` suffix, rank and K-dimension, but not `targets`. Embedding and router weights can therefore enter conversion when they are not ignored and have supported shapes. The update converter must not be described as experts-only.

The displayed 0.35 remains a constructed example, not a measured training update. MoE means mixture-of-experts: the model selects a subset of experts for each token. The public config and update converter's filtering rules come from their respective source files.

### Next

The integer codes still need compact storage. The next step packs eight four-bit codes into one 32-bit word and accounts for a whole group's bytes.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:94-103`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `quantizer_compressed_tensors.py:88-159,162-191`, `hf_weight_iterator_direct.py:24-41` and `megatron_to_hf/deepseekv3.py:6-10,106-108`; Kimi-K2-Thinking `config.json:79-110` and its public weight index.

## Step 6 · Pack eight codes into one 32-bit word

**One sentence.** Packing adds 8 to map signed codes into $[0,15]$, then places eight four-bit fields in one 32-bit word; one group with its scale takes 18 bytes.

### On the stage

- The BF16 group holds 32 values in $32\times2=64$ bytes.
- Adding 8 to each signed code maps $[-8,7]$ into unsigned $[0,15]$.
- Eight four-bit codes form one 32-bit word, or 4 bytes. INT32 is the 32-bit integer type that holds this word.
- The complete group has 16 packed-weight bytes and one 2-byte BF16 scale, totaling 18 bytes. The first and last bars both use 64 bytes as full width.

### Formula and symbols

$$u_i=q_i+8,\qquad P_{\mathrm{bit}}=\sum_{i=0}^{7}u_i2^{4i}$$

| Symbol | Meaning | Source |
|---|---|---|
| $q_i$ | Signed INT4 code at position $i$ | Step 5, range $[-8,7]$ |
| $u_i$ | Unsigned four-bit field after adding 8 | `pack_to_int32`, range $[0,15]$ |
| $P_{\mathrm{bit}}$ | The 32-bit pattern containing eight fields, not a signed decimal interpretation | Sum after bit shifts |
| $i$ | Code position within one word | 0 through 7 |
| $2^{4i}$ | Shift for field $i$ | Bit shifts in the packing code |

### The numbers on the stage

$q$ is the signed code. This packing format needs nonnegative fields from 0 to 15, so it adds 8. A word here means a 32-bit storage slot. The example codes `[-8,-7,-1,0,1,4,6,7]` become `[0,1,7,8,9,12,14,15]`, with bit pattern `0xFEC98710`. This is a bit pattern, not the signed decimal value of the INT32. Their total width is:

$$8\times4=32\ \text{bits}=4\ \text{B}$$

The complete 32-weight group has this storage bill:

$$32\times2=64\ \text{B},\qquad 32\times4/8=16\ \text{B}$$
$$16+2=18\ \text{B},\qquad 18\times8/32=4.5\ \text{bits/weight}$$
$$(64-18)/64=71.875\%$$

Step 1's 75% covers raw INT4 payload only. Adding one BF16 scale gives 71.875% for this group. Unquantized tensors, other metadata, KV cache and runtime workspaces remain outside the example, so this is not a whole-rollout memory saving.

### Next

The standard packed layout is not Marlin's working layout. The next step restores the buffer shape, loads new values and repacks them after every update.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:101-114`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `quantizer_compressed_tensors.py:47-85`.

## Step 7 · Rebuild the Marlin layout after every update

**One sentence.** After rollout pauses generation, it restores the buffer's original shape, receives new packed weights and scales, repacks them for the Marlin kernel and resumes generation.

### On the stage

- The pause card prevents generation from reading a mixture of old and new weights. The resize card only calls `resize_` to restore the reusable memory's cached original shape.
- The load card overwrites that memory with this round's packed weights and scales.
- The Marlin card changes Step 6's generic four-bit packing into the order required by this multiplication routine and arranges the corresponding scales.
- The continue card resumes generation with the new weights. The `is_marlin_converted` flag moves from true to false and back to true.

### Formula and symbols

$$B_{\mathrm{old}}\xrightarrow{\operatorname{resize}}B_{\mathrm{shape}}\xrightarrow{\operatorname{load}}B_{\mathrm{new}}\xrightarrow{\operatorname{repack}}B_{\mathrm{Marlin}}$$

| Symbol | Meaning | Source |
|---|---|---|
| $B_{\mathrm{old}}$ | Buffer in the previous round's Marlin layout | Current rollout state |
| $B_{\mathrm{shape}}$ | Same buffer after restoring its original shape | `_original_shapes` and `resize_` |
| $B_{\mathrm{new}}$ | Buffer after writing the new standard packed weights and scales | Training update path |
| $B_{\mathrm{Marlin}}$ | Repacked buffer ready for the kernel | `gptq_marlin_moe_repack` and scale permutation |
| $\operatorname{resize}$ | Shape change without an inverse transform of old values | `restore_weights_before_loading` |

### The numbers on the stage

This step adds no numerical example. A buffer is reusable memory, a kernel is a GPU routine that performs one operation, and a layout is the order of data in memory. This recipe enables `--colocate`, so it selects `UpdateWeightFromTensor`. The pinned order is `pause_generation`, `flush_cache`, shape restoration, new-tensor transfer, post-processing and `continue_generation`. Pausing prevents reads of mixed old and new weights.

“Restore” does not mean inverse permutation. The code only calls `param.resize_(orig_shape)` using `_original_shapes` and clears the converted flag. It does not dequantize or recover the previous weights. New values then overwrite the buffer, and post-processing calls `gptq_marlin_moe_repack` and `marlin_moe_permute_scales`. The converted flag records whether memory already has Marlin's order and prevents double repacking. Step 6 saves bits; this step chooses the multiplication routine's reading order.

### Next

The new layout is ready for Marlin. The next step opens its compute path: INT4 storage becomes BF16 matrix multiplication with FP32 accumulation.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:80-103`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `actor.py:126-133`, `update_weight_from_tensor.py:106-143` and `docker/patch/latest/sglang.patch:732-823`.

## Step 8 · Store INT4 and compute in BF16 with W4A16

**One sentence.** Marlin undoes the packing offset to recover signed codes, dequantizes weights to BF16 for matrix multiplication, and accumulates products in FP32 inside that instruction.

### On the stage

- The unpack card computes `field − 8`, undoing Step 6's offset to recover the signed code.
- The BF16 weight card multiplies the signed code by its scale. It does not multiply the nonnegative packed field directly by that scale.
- The BF16 multiplication card receives BF16 activations as its other input. Activations are values produced during computation.
- The FP32 inner-total card covers only this matrix instruction's product sum. It does not imply FP32 for every later reduction or the final output.

### Formula and symbols

$$q_j=u_j-8,\qquad w_j=sq_j,\qquad y_{\mathrm{inner}}=\operatorname{FP32\ accumulate}\left(\sum_j w_j a_j\right)$$

| Symbol | Meaning | Source |
|---|---|---|
| $u_j$ | Nonnegative four-bit field at position $j$ | Step 6, range $[0,15]$ |
| $q_j$ | Signed INT4 code after undoing the offset | $u_j-8$ |
| $s$ | Scale for this group | BF16 scale exported in Step 5 |
| $w_j$ | Dequantized BF16 weight | $sq_j$ |
| $a_j$ | Corresponding BF16 activation | Current rollout computation |
| $y_{\mathrm{inner}}$ | Accumulated result inside this MMA instruction, not the final MoE output | Marlin's MMA instruction |

### The numbers on the stage

Using Step 6's field $u=12$ and Step 5's scale $s=0.10$:

$$q=12-8=4,\qquad w=4\times0.10=0.40$$

The pinned kernel instruction is `mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32`: both inputs are BF16, while this MMA's accumulator is FP32. It does not perform matrix arithmetic directly on INT4 values or prove zero-cost dequantization. `marlin_template.h:178-187,1290-1311` shows multiplication by the group scale.

This MoE path has another cross-slice reduction level. The atomic path performs `atomicAdd` on `scalar_t2` at `marlin_template.h:1635-1648`, which means BF16 pairs in this configuration. Output intermediates also use `hidden_states.dtype`. The chapter therefore limits FP32 to the MMA accumulator rather than every reduction or the final BF16 output.

In W4A16, W4 means four-bit weights and A16 means BF16 activations in this path. KV cache is the old-k/v storage introduced in Learning SGLang Chapter 3; this label does not quantize it to INT4. Weight-read bytes and matrix-compute precision answer different questions.

The article reports similar per-step Qwen performance for INT4 and FP8, with only a slight INT4 advantage. Its Kimi two-node experiments also leave communication as a bottleneck. The article associates the larger Kimi gain with one-node deployment. These are article-reported results, not local measurements or proof that every RL round becomes faster.

### Next

The final step compares the public checkpoint's tensor bytes with eight H200s' aggregate capacity, separating “tensor bytes fit” from “the full rollout was measured faster.”

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:105-119,147-171`; `sgl-project/sglang@dce8b0606c06d3a191a24c7b8cbe8e238ab316c9`, `python/sglang/srt/layers/moe/fused_moe_triton/` `fused_marlin_moe.py:77-92,140-143`, `sgl-kernel/csrc/gemm/marlin/` `dequant.h:161-183` and `sgl-kernel/csrc/moe/marlin_moe_wna16/` `marlin_template.h:87-108,178-187,` `1290-1311,1635-1648`.

## Step 9 · Hold checkpoint tensor bytes across eight cards

**One sentence.** The public Kimi-K2-Thinking index records 594.206 GB of tensor payload, more than one 141 GB H200 but less than eight cards' 1,128 GB aggregate capacity.

### On the stage

- The left panel compares the 594.206 GB checkpoint tensors with one 141 GB H200. Since $594.206/141\approx4.21$, the tensor payload is about 4.21 times that card's capacity.
- The right panel compares the same tensor payload with eight cards' 1,128 GB aggregate capacity.
- All four bars use 1,128 GB as full width. Orange always means checkpoint tensor bytes and blue always means card memory.
- The 74.276 GB per-GPU average is division, not a measured per-rank allocation.

### Formula and symbols

$$C=nM,\qquad c=K/n,\qquad K<C$$

| Symbol | Meaning | Source |
|---|---|---|
| $K$ | Indexed tensor payload in the public checkpoint | `metadata.total_size` in `model.safetensors.index.json` |
| $n$ | GPUs in one rollout engine | The pinned recipe's `--rollout-num-gpus-per-engine 8` |
| $M$ | Capacity of one H200 used by the article | 141 GB |
| $C$ | Aggregate capacity of eight cards | $8\times141=1{,}128$ GB |
| $c$ | Checkpoint bytes divided across eight cards | Derived here, 74.276 GB |

### The numbers on the stage

$$K=594{,}205{,}920{,}512\ \text{B}=594.206\ \text{GB}$$
$$C=8\times141=1{,}128\ \text{GB},\qquad c=594.206/8=74.276\ \text{GB}$$

These are decimal GB, where $1\ \text{GB}=10^9$ bytes, rather than GiB. `metadata.total_size` records indexed tensor payload; safetensors headers, the index itself and auxiliary files sit outside it. The public checkpoint's packed weights belong to routed experts, and its unquantized tensors also count in this payload.

$K<C$ says only that these tensor bytes are smaller than aggregate card capacity. KV cache holds old k/v values, and workspaces hold temporary computation data. Those, activations, update buffers and uneven rank allocations need additional space, so this is not a complete rollout memory validation.

The article says “one node,” not one H200 card. The pinned recipe also assigns eight GPUs to one rollout engine. It reports less inter-node communication and faster Kimi rollout on one node, but supplies no raw timing table for this chapter to reproduce. The chapter therefore invents no speedup. QAT adds training work too, so a complete RL round needs its own measurement.

### Next

The final two lines place training's fake BF16 round trip beside rollout's real INT4 Marlin path. Following those visible paths, the next chapter asks whether the same checkpoint and token sequence must produce identical log probabilities in the two engines.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:19-23,160-182`; Kimi-K2-Thinking `model.safetensors.index.json`, revision `a51ccc050d73dab088bf7b0e2dd9b30ae85a4e55`, `metadata.total_size`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `run-kimi-k2-Thinking-int4.sh:119-139`.
