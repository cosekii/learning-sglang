## Step 1 · Quarter the raw weight bytes

**One sentence.** The same 32 weights take 64 bytes in BF16 and 16 raw bytes in INT4, whose fewer numeric levels introduce rounding.

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

Scales, unquantized tensors, KV cache, activations and runtime workspaces sit outside these 16 bytes. A complete model or rollout therefore need not shrink by 75%. Four-bit INT4 distinguishes fewer numeric levels, so rounding changes weights.

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

$$s=\max_i|x_i|/7,\qquad q_i=\operatorname{clip}(\operatorname{round}(x_i/s),-7,7),\qquad \hat{x}_i=sq_i$$

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

The pinned implementation finds the maximum and scale in FP32, clamps the scale to at least $10^{-5}$, and casts the restored values back to the input type. This nonzero example does not trigger the scale floor. The complete group has 32 values; the other 29 stay off the stage.

### Next

Training repeats this quantize–restore round trip in its forward pass while storage and computation remain BF16. The next step names that path fake quantization.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:53-61`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `docker/patch/latest/megatron.patch:71-110`.

## Step 3 · Keep BF16 storage with fake quantization

**One sentence.** Fake quantization rounds and then restores BF16 in the forward pass, exposing training to quantization error without producing a real four-bit checkpoint.

### On the stage

- The stored model parameter remains BF16's 0.35.
- The dashed blue card performs Step 2's round trip: 0.35 becomes code 4 and then BF16's 0.40.
- Forward computation uses 0.40. The quantization error remains visible, so training can adapt to it.

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

“Fake” means storage and matrix computation do not become INT4. The parameter stays BF16, and rounding immediately returns to BF16. QAT means quantization-aware training: the training forward pass repeatedly experiences this rounding. The shipped recipe enables the hook with `OPEN_TRAINING_INT4_FAKE_QAT_FLAG=1` and sets `OPEN_TRAINING_INT4_GROUP_SIZE=32`. The hook wraps `TEGroupedLinear` weights rather than every model tensor.

The article's asymmetric comparisons explain why the two sides must pair. QAT with BF16 rollout removes the rounding that training adapted to. Training without QAT followed by INT4 rollout adds rounding that training never saw. These comparisons support fake INT4 training with real INT4 rollout; they do not prove BF16-level results for every model or configuration.

### Next

The forward pass works, but ordinary backpropagation stalls at rounding. The next step shows how STE creates an approximate gradient path.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-49,63-78`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `docker/patch/latest/megatron.patch:124-150` and `scripts/low_precision/run-kimi-k2-Thinking-int4.sh:158-170`.

## Step 4 · Pass gradients around rounding with STE

**One sentence.** A straight-through estimator (STE) treats the complete fake-quantization round trip as identity during backpropagation, so BF16 model parameters still receive gradients.

### On the stage

- The left card receives `grad_output` from later computation.
- The dashed blue STE card returns the same `grad_output` without using rounding's ordinary derivative.
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

The recipe's `--bf16` configuration sets model parameters to BF16. It also enables `--use-precision-aware-optimizer` without overriding `--main-params-dtype`, whose default is FP32. Model parameters and optimizer main parameters therefore must not share one “BF16 master weights” label.

### Next

After a training round, the update path must produce the integer codes and scales that rollout actually stores. The next step follows real quantization.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-39`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `docker/patch/latest/megatron.patch:112-122` and the recipe; `NVIDIA/Megatron-LM@3714d81d418c9f1bca4594fc35f9e8289f652862`, `megatron/training/arguments.py:751-765,3475-3484`.

## Step 5 · Make rollout codes with real quantization

**One sentence.** Every RL weight update converts selected BF16 weights into integer codes and scales that rollout actually stores.

### On the stage

- The BF16 update reuses 0.35, and the group scale remains $0.70/7=0.10$.
- The signed-code card produces 4. The code's literal clamp is $[-8,7]$, unlike fake QAT's $[-7,7]$ in Step 2.
- The scale travels with the codes and is cast to the source weight's BF16 type in this recipe.
- The public config converts selected expert weights rather than every tensor. Each update repeats the conversion; this is not only an offline export.

### Formula and symbols

$$s=\max(\max_i|x_i|/7,10^{-5}),\qquad q_i=\operatorname{clip}(\operatorname{round}(x_i/s),-8,7)$$

| Symbol | Meaning | Source |
|---|---|---|
| $x_i$ | One eligible BF16 value in the update | Weight table converted from training |
| $s$ | Scale for this group | `int4_block_quantize` |
| $q_i$ | Signed integer code stored for rollout | Rounded and clamped to $[-8,7]$ |
| $\operatorname{clip}$ | Limit codes to the stated interval | Export code at the pinned revision |

### The numbers on the stage

$$0.35/0.10=3.5\rightarrow q=4$$

The scale divides the largest magnitude by 7, but the real export's literal clamp has a −8 lower bound while fake QAT uses −7. The chapter preserves that code difference instead of claiming bitwise identity. Export casts scales back to the source weight dtype, BF16 here; fake QAT computes with an FP32 scale. The two sides do not guarantee identical scale bits either.

The public Kimi-K2-Thinking config excludes `lm_head`, self-attention, shared experts and dense MLP projections. MoE means mixture-of-experts: the model selects a subset of experts for each token. This step quantizes only the selected expert weights from that config. Parameters without a `.weight` suffix and weights with unsupported dimensions also stay outside this conversion.

### Next

The integer codes still need compact storage. The next step packs eight four-bit codes into one 32-bit word and accounts for a whole group's bytes.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:94-103`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `quantizer_compressed_tensors.py:88-159,162-191` and `update_weight_from_distributed.py:93-154`; Kimi-K2-Thinking `config.json:79-110`.

## Step 6 · Pack eight codes into one 32-bit word

**One sentence.** Packing adds 8 to map signed codes into $[0,15]$, then places eight four-bit fields in one 32-bit word; one group with its scale takes 18 bytes.

### On the stage

- The BF16 group holds 32 values in $32\times2=64$ bytes.
- Adding 8 to each signed code maps $[-8,7]$ into unsigned $[0,15]$.
- Eight four-bit codes form one 32-bit word, or 4 bytes. INT32 is the 32-bit integer type that holds this word.
- The complete group has 16 packed-weight bytes and one 2-byte BF16 scale, totaling 18 bytes. The first and last bars both use 64 bytes as full width.

### Formula and symbols

$$u_i=q_i+8,\qquad P=\sum_{i=0}^{7}u_i2^{4i}$$

| Symbol | Meaning | Source |
|---|---|---|
| $q_i$ | Signed INT4 code at position $i$ | Step 5, range $[-8,7]$ |
| $u_i$ | Unsigned four-bit field after adding 8 | `pack_to_int32`, range $[0,15]$ |
| $P$ | One 32-bit word containing eight fields | Sum after bit shifts |
| $i$ | Code position within one word | 0 through 7 |
| $2^{4i}$ | Shift for field $i$ | Bit shifts in the packing code |

### The numbers on the stage

The example codes `[-8,-7,-1,0,1,4,6,7]` become `[0,1,7,8,9,12,14,15]` after adding 8. Their total width is:

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

- The pause-and-resize card only calls `resize_` to restore the buffer's cached original shape.
- The load card overwrites that buffer with this round's packed weights and scales.
- The Marlin card repacks weights and permutes scales into the layout required by the kernel.
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

This step adds no numerical example. The pinned order is `pause_generation`, `flush_cache`, shape restoration, new-tensor transfer, post-processing and `continue_generation`. Generation stays paused so it cannot use a mixture of old and new weights.

“Restore” does not mean inverse permutation. The code only calls `param.resize_(orig_shape)` using `_original_shapes` and clears the converted flag. It does not dequantize or recover the previous weights. New values then overwrite the buffer, and post-processing calls `gptq_marlin_moe_repack` and `marlin_moe_permute_scales`. The converted flag also prevents double repacking.

### Next

The new layout is ready for Marlin. The next step opens its compute path: INT4 storage becomes BF16 matrix multiplication with FP32 accumulation.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:80-103`; `THUDM/slime@58525eb986c66a271aa31077e17b8afebe704b4f`, `update_weight_from_distributed.py:73-132` and `docker/patch/latest/sglang.patch:732-823`.

## Step 8 · Store INT4 and compute in BF16 with W4A16

**One sentence.** Marlin dequantizes INT4 weights to BF16, multiplies them by BF16 activations and accumulates the products in FP32.

### On the stage

- The blue INT4 card holds packed four-bit weights in memory.
- The dequantize card multiplies codes by their scale to produce BF16 weights.
- The BF16 multiplication card receives BF16 activations as its other input. Activations are values produced during computation, not values loaded from the packed-weight checkpoint.
- The FP32 card holds the running sum of products. Accumulation adds each product into one total.
- W4A16 describes weight and activation precision only. It does not set KV-cache precision.

### Formula and symbols

$$w_j=sq_j,\qquad y=\operatorname{FP32\ accumulate}\left(\sum_j w_j a_j\right)$$

| Symbol | Meaning | Source |
|---|---|---|
| $q_j$ | INT4 weight code at position $j$ | Step 5 |
| $s$ | Scale for this group | BF16 scale exported in Step 5 |
| $w_j$ | Dequantized BF16 weight | $sq_j$ |
| $a_j$ | Corresponding BF16 activation | Current rollout computation |
| $y$ | One matrix-multiplication output | Products of BF16 inputs, accumulated |
| $\operatorname{FP32\ accumulate}$ | Running sum of products held in FP32 | Marlin's MMA instruction |

### The numbers on the stage

The pinned kernel instruction is `mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32`: both inputs are BF16, while output and accumulation are FP32. It does not perform matrix arithmetic directly on INT4 values and does not prove zero-cost dequantization.

In W4A16, W4 means four-bit weights and A16 means BF16 activations in this path. KV cache is separate storage, and this label does not quantize it to INT4. Weight-read bytes and matrix-compute precision answer different questions.

The article reports similar per-step Qwen performance for INT4 and FP8, with only a slight INT4 advantage. Its Kimi two-node experiments also leave communication as a bottleneck. The article associates the larger Kimi gain with one-node deployment. These are article-reported results, not local measurements or proof that every RL round becomes faster.

### Next

The final step compares the public checkpoint's bytes with eight H200s' aggregate capacity, separating “checkpoint bytes fit” from “the full rollout was measured faster.”

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:105-119,147-171`; `sgl-project/sglang@dce8b0606c06d3a191a24c7b8cbe8e238ab316c9`, `fused_marlin_moe.py:77-92`, `dequant.h:161-183` and `marlin_template.h:87-108`.
