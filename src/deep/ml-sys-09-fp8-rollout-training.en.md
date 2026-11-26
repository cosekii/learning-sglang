## Step 1 · Halve the supported weight bytes

**One sentence.** FP8 uses 8 bits for a value instead of BF16's 16, so this constructed example cuts supported weights from 8 GB to 4 GB.

### On the stage

- The orange BF16 card holds the same 4B-value weight example used in Chapter 8. Two bytes per value make 8 GB. Supported means the documented FP8 path handles these weights; Step 3 names the layers that stay in their original precision.
- The blue FP8 card uses one byte per value, making 4 GB. Its bar is half the BF16 bar on the same scale.
- The map names the four stops that follow: rollout, training, export, and comparison. This step measures only supported weight bytes, not a complete checkpoint or an RL speedup.

### Formula and symbols

$$M_{16}=P b_{16},\qquad M_8=P b_8,\qquad T_b=M_b/B$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | Number of supported weight values | Constructed 4B example from Chapter 8 |
| $b_{16},b_8$ | Bytes per value in BF16 and FP8 | 2 bytes and 1 byte |
| $M_{16},M_8$ | Weight-table bytes in the two formats | Derived here, 8 GB and 4 GB |
| $b$ | One format, BF16 or FP8 | The row being computed |
| $T_b$ | Ideal time to read that weight table once | Derived here |
| $B$ | H100 HBM bandwidth | `src/numbers.ts`, 3.35 TB/s |

### The numbers on the stage

$$M_{16}=4\times10^9\times2=8\ \text{GB},\qquad M_8=4\times10^9\times1=4\ \text{GB}$$
$$T_{16}=8/3.35=2.39\ \text{ms},\qquad T_8=4/3.35=1.19\ \text{ms}$$

GB divided by TB/s gives milliseconds here because decimal units cancel to $10^{-3}$ seconds. These are ideal bandwidth lower bounds. Scales, unconverted tensors, attention, scheduling, and imperfect bandwidth use are outside the example. The article also lists H100 dense ceilings of 989 TFLOP/s for BF16 and 1,979 TFLOP/s for FP8. Those hardware ceilings do not predict RL throughput.

### Next

FP8 has fewer values and a smaller range than BF16. The next step shows how a shared scale fits one group of numbers into that format.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:40-54`; shared `BW` in `src/numbers.ts`; constructed values in `src/ml-sys/numbers.ts`.

## Step 2 · Share one scale across a group

**One sentence.** A group divides its values by one scale derived from its largest magnitude, stores the rounded FP8 results, and multiplies by that scale to restore approximate values.

### On the stage

- The original group is `[1, 3.2, 8]`. Its largest absolute value is 8, so its scale is $8/448=1/56$.
- The FP8 card stores `[56, 176, 448]`. The middle input becomes $3.2/(1/56)=179.2$ before rounding, then 176 in this format.
- Multiplying the stored values by $1/56$ restores `[1, 3.142857, 8]`. The middle value differs from its input by about 0.057143.

### Formula and symbols

$$s=\frac{\max|X|}{448},\qquad q_i=\operatorname{E4M3}(x_i/s),\qquad \hat{x}_i=sq_i$$

| Symbol | Meaning | Source |
|---|---|---|
| $X$ | One group of high-precision values | Constructed `[1, 3.2, 8]` |
| $x_i$ | Value $i$ in that group | The original card |
| $s$ | Shared scale for the group | Largest magnitude divided by 448 |
| $q_i$ | Rounded value stored in FP8 | The E4M3 conversion |
| $\hat{x}_i$ | Restored approximation of $x_i$ | $s q_i$ |
| $\operatorname{E4M3}$ | The FP8 format with 4 exponent bits and 3 mantissa bits | Rollout conversion configuration; 448 is its largest finite magnitude |

### The numbers on the stage

$$s=8/448=1/56,\qquad 3.2/(1/56)=179.2\rightarrow176$$
$$\hat{x}_2=176/56=22/7\approx3.142857,\qquad |3.2-22/7|=2/35\approx0.057143$$

The rollout checkpoint uses blocks with $128\times128=16{,}384$ values. One FP32 scale per block changes the byte bill for that block only:

$$16{,}384+4=16{,}388\ \text{bytes},\qquad 16{,}384\times2=32{,}768\ \text{bytes}$$

The block saves $32{,}768-16{,}388=16{,}380$ bytes, or 49.9878%. This does not include other tensors or copies. The shown converter and H-card training configuration use FP32 scales. Other slime update paths and external recipes can use different scale formats and granularities.

FP8 stores a finite set of floating-point values rather than every decimal. E4M3 uses exponent and mantissa bits, so 448 can be representable even though the format has only 8 bits. It stores 176 as the nearest available value to 179.2, not as an ordinary integer rounded to 179. The notation $|x|$ means absolute value, the distance from zero; magnitude means the same thing.

### Next

The scale makes storage possible. The next step follows the two kinds of FP8 inputs that rollout needs: weights converted beforehand and activations converted as they appear.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:66-124`; `THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd`, `tools/convert_hf_to_fp8.py:31-71,142-146` and `megatron_to_hf/processors/quantizer.py:96-108`; Qwen3-4B-FP8 `weight_block_size=[128,128]`.

## Step 3 · Convert rollout's two input kinds

**One sentence.** Rollout converts the initial checkpoint's supported weights before serving and quantizes activations with scales when computation creates them, then runs supported matrix multiplications with FP8 inputs.

### On the stage

- A matrix multiply multiplies two tables of numbers. The weights path starts with the initial BF16 checkpoint. Offline conversion writes FP8 weights and their scales before rollout begins. Later RL updates follow Step 5 instead of repeating this initial-checkpoint claim.
- An activation is a value produced during computation. The second path quantizes each new activation when it is needed instead of storing all activations as FP8 in the checkpoint.
- Supported matrix multiplications consume the converted weights and current activations. Embedding and `lm_head` keep their original precision. The source does not establish an FP8 KV cache in this path.

### Formula and symbols

$$(W_q,S_w)=\mathcal{Q}_w(W_{16}),\qquad (A_q,S_a)=\mathcal{Q}_a(A_{16})$$

| Symbol | Meaning | Source |
|---|---|---|
| $W_{16}$ | BF16 checkpoint weights supported for conversion | Input checkpoint |
| $\mathcal{Q}_w$ | Offline weight quantization with scales | `convert_hf_to_fp8.py` |
| $W_q,S_w$ | FP8 weights and their scales | Converted checkpoint |
| $A_{16}$ | Current higher-precision activation | Produced during rollout computation |
| $\mathcal{Q}_a$ | Dynamic activation quantization | Rollout's supported FP8 matrix-multiplication path |
| $A_q,S_a$ | Current FP8 activation and scale | Produced when needed |

### The numbers on the stage

This step adds no new measured number. For $P$ supported weight values, Step 1's raw payload remains $2P$ bytes in BF16 and $P$ bytes in FP8, plus scales and exclusions. Step 2 supplies the scale arithmetic. Neither formula includes KV cache or claims that every layer uses FP8.

The shipped conversion skips named embedding and `lm_head` tensors. Its activation support belongs to the matrix-multiplication implementation, not to the offline checkpoint converter.

### Next

Training also needs FP8 matrix multiplications, but it must run them in forward and backward while retaining higher-precision training state. The next step opens that path.

Sources: `THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd`, `examples/low_precision/README.md:23-27` and `tools/convert_hf_to_fp8.py:179-188`; `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:40-54`.

## Step 4 · Use FP8 matrix multiplies inside training

**One sentence.** Training quantizes weights and activations for supported FP8 matrix multiplications in forward and backward, while model and optimizer regions that need higher precision remain there.

### On the stage

- The precise-region card retains values that need higher precision. FP32 means 32-bit floating point. With the shipped `--fp8-param-gather` configuration, stored Transformer Engine weights can use FP8; without it, stored weights remain BF16 and are cast for the multiplication.
- The FP8 card covers supported forward and backward matrix multiplications. Forward computes outputs; backward computes weight and input gradients. The implementation names these FProp, Wgrad, and Dgrad.
- The optimizer card does not become FP8 in this account. Chapter 8's constructed 48 GB of optimizer tables therefore stays 48 GB, not 24 GB.

### Formula and symbols

$$Y=\operatorname{GEMM}_8(\mathcal{Q}(A),\mathcal{Q}(W))$$

| Symbol | Meaning | Source |
|---|---|---|
| $A,W$ | Current activation and weight values before multiplication; inputs may be quantized online | Current training computation and stored-weight configuration |
| $\mathcal{Q}$ | Quantization with the configured scale and granularity | Step 2's mechanism, applied online here |
| $\operatorname{GEMM}_8$ | Supported matrix multiplication with FP8 inputs | Transformer Engine `Linear` or `GroupLinear` path |
| $Y$ | Matrix-multiplication output | Forward result; backward uses the corresponding gradient multiplies |

### The numbers on the stage

Chapter 8 assigned 48 GB to three FP32 optimizer tables in its constructed 4B-value example. This step supplies no FP8 optimizer format, so the example remains:

$$M_{\text{optimizer}}=48\ \text{GB}\rightarrow48\ \text{GB}$$

The Qwen3-4B script combines `--bf16`, `--fp8-format e4m3`, `--fp8-recipe blockwise`, `--fp8-param-gather`, and `NVTE_FP8_BLOCK_SCALING_FP32_SCALES=1`. Attention softmax and gradient accumulation remain FP32. Only `Linear` and `GroupLinear` use FP8 in the documented path; embedding and `lm_head` keep their original precision.

### Next

Rollout still needs the trained weights. The next step follows the update path, which uses a BF16 handoff before rollout quantization and expands weights first only when training stores them in FP8.

Sources: `THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd`, `examples/low_precision/run-qwen3-4b-fp8.sh:117-143` and `examples/low_precision/README.md:21-23,51-54`; `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:118-132`.

## Step 5 · Export through a BF16 handoff

**One sentence.** The documented RL update hands BF16 weights to slime for FP8 rollout quantization; training with FP8-stored weights first dequantizes them, while training with BF16-stored weights starts directly at that BF16 handoff.

### On the stage

- The training card can start with FP8 or BF16 weights, depending on `--fp8-param-gather`. Megatron dequantizes only the case with FP8-stored weights.
- The middle card is the shared BF16 update form. Dequantization restores 16-bit values from FP8 values and scales when that conversion is needed.
- Slime quantizes the BF16 handoff to rollout's own FP8 values and scales. The documented interface does not directly copy training-side FP8 or guarantee identical scales.

### Formula and symbols

$$W_8\xrightarrow{\mathcal{D}}W_{16}\xrightarrow{\mathcal{Q}}W'_8,\qquad W_{16}\xrightarrow{\mathcal{Q}}W'_8$$

The first chain applies to training with FP8-stored weights. The second starts when stored weights are already BF16.

| Symbol | Meaning | Source |
|---|---|---|
| $W_8$ | Training-side FP8 weights | FP8 training configuration |
| $\mathcal{D}$ | Dequantization using FP8 values and scales | Megatron update path |
| $W_{16}$ | BF16 weights handed to the update | Intermediate representation |
| $\mathcal{Q}$ | Quantization for SGLang rollout | Slime's FP8 update support |
| $W'_8$ | Rollout-side FP8 weights | Result of the second conversion |

### The numbers on the stage

$P$ is the count of supported weight values. Raw payload means weight bytes before scales and excluded tensors. For those $P$ values, the raw FP8 payload is $P$ bytes and the raw BF16 payload is $2P$ bytes. Reusing Step 1's constructed $P=4\times10^9$ gives 4 GB and 8 GB before scales and exclusions. The source supplies no update latency, so this arithmetic does not predict transfer time.

Checkpoints use BF16 `torch_dist`, with dequantization only when the source weights are FP8. FP8 evaluation requires conversion back through Hugging Face format. Resident FP8 weights through `--fp8-param-gather` require TE FusedAdam and conflict with Adam CPU offload, so the memory result depends on the enabled configuration.

### Next

Byte arithmetic gives an upper bound, not the measured result. The next step compares one public training run whose time and memory savings were smaller than half.

Sources: `THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd`, `examples/low_precision/README.md:42-64`; `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:182`.

## Step 6 · Measure the gains instead of halving everything

**One sentence.** One public non-RL forward-plus-backward row reports 21.7% less time and 14.4% less peak memory, while forward alone becomes slower; the 440 ms belongs to that measured pass, not an entire training run.

### On the stage

- The time panel adds forward and backward on each side. BF16 takes 463 + 1,567 = 2,030 ms; FP8 takes 529 + 1,061 = 1,590 ms. Both time bars use the 2,030 ms BF16 bar as full width.
- The memory panel compares 68.1 GB with 58.3 GB. Both memory bars use the 68.1 GB BF16 bar as full width.
- The bottom line separates the total: forward rises from 463 to 529 ms, while backward falls from 1,567 to 1,061 ms. The net saving is smaller than the backward saving alone.

### Formula and symbols

$$\Delta T=T_{16}-T_8,\qquad r_T=\Delta T/T_{16}$$
$$r_M=(M_{16}-M_8)/M_{16}$$

| Symbol | Meaning | Source |
|---|---|---|
| $T_{16},T_8$ | Forward-plus-backward time | InfiR2 Table 6, 2,030 and 1,590 ms |
| $\Delta T$ | Time saved | Derived here, 440 ms |
| $r_T$ | Fraction of total time saved | Derived here, 21.7% |
| $M_{16},M_8$ | Peak training memory | InfiR2 Table 6, 68.1 and 58.3 GB |
| $r_M$ | Fraction of peak memory saved | Derived here, 14.4% |

### The numbers on the stage

$$2{,}030-1{,}590=440\ \text{ms}$$
$$440/2{,}030=21.7\%$$
$$68.1-58.3=9.8\ \text{GB}$$
$$9.8/68.1=14.4\%$$

Throughput rises from 340 to 376 TFLOP/s, a 376 / 340 − 1 = 10.6% increase. This is Qwen2.5-1.5B with 8k context, TP 1, CP 1, and micro-batch 2 in InfiR2's non-RL experiment. A micro-batch is a smaller slice of a training batch processed before the next slice. The paper's efficiency section does not identify the GPU. Its recipe uses UE8M0 scales, which store only an exponent and therefore represent powers of two. This row is not a measurement of slime's FP32-scale RL configuration.

Extra transposed FP8 outputs and higher-precision saved tensors prevent memory from halving. Quantization work can also make forward slower even while backward matrix multiplications accelerate.

### Next

Measurements show that benefits vary. The next step isolates numerical error with real and fake quantization instead of attributing every difference to the FP8 kernel.

Sources: [InfiR2 arXiv:2509.22536v4](https://arxiv.org/html/2509.22536v4), §5.1.1 and §5.4 Table 6; `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:140-182`; [TransformerEngine@8ef8285c](https://github.com/NVIDIA/TransformerEngine/tree/8ef8285c40542c8c3724f9b3eadbb006793958f0), [`quantize_transpose_square_blockwise.cu:462-485,513-524`](https://github.com/NVIDIA/TransformerEngine/blob/8ef8285c40542c8c3724f9b3eadbb006793958f0/transformer_engine/common/transpose/quantize_transpose_square_blockwise.cu#L462-L485).

## Step 7 · Isolate rounding loss with fake quantization

**One sentence.** Real FP8, fake FP8, and a BF16 baseline form two comparisons that separate quantization round-trip loss from the residual FP8 compute-path difference.

### On the stage

- The baseline keeps weights and inputs in BF16 and runs BF16 matrix multiplications.
- Real FP8 quantizes weights and inputs and runs an FP8 matrix multiplication.
- Fake FP8 quantizes to FP8, immediately dequantizes to BF16, and runs a BF16 matrix multiplication. It keeps the rounding loss without using the FP8 kernel.
- Real and fake both include the FP8 rounding step. Their remaining output difference comes from running the multiplication through different compute paths, which can include arithmetic and accumulation-path differences as well as kernel implementation. Baseline versus fake isolates the quantize–dequantize round trip. The article attributes the larger error to the round trip, not to an error-free kernel. A kernel is a GPU routine that performs one operation.

### Formula and symbols

$$D_{rf}=Y_r-Y_f,\qquad D_{bf}=Y_b-Y_f$$

| Symbol | Meaning | Source |
|---|---|---|
| $Y_b$ | BF16 baseline matrix-multiplication output | Baseline path |
| $Y_r$ | Real FP8 matrix-multiplication output | Real FP8 path |
| $Y_f$ | Fake-quantized BF16 matrix-multiplication output | FP8 round trip followed by BF16 multiplication |
| $D_{rf}$ | Residual output difference between real FP8 and fake BF16 paths, including arithmetic and accumulation paths | Real versus fake |
| $D_{bf}$ | Output difference associated with quantization round-trip loss | Baseline versus fake |

### The numbers on the stage

This experiment ran Qwen3-4B on one H800 during RL Steps 0 and 1. The article does not define a norm or unit for its plotted Diff, so this chapter does not turn it into a percentage, log probability, or KL value. It follows the article's textual high/low assignment and does not quote Figure 6's conflicting printed means.

A separate kernel check compared two FP8 implementations against BF16. For $(M,K,N)=(128,128,128)$, the reported Diff was 0.00068 for cuBLAS and 0.00036 for DeepGEMM. For $(1024,4096,1024)$, it was 0.000681 and 0.00065. These values are the same order, so changing the FP8 implementation did not explain the initial KL increase. $M,K,N$ are matrix dimensions, and their Diff unit is also unspecified.

### Next

The round trip explains why BF16 training and FP8 rollout can diverge. The next step aligns those schemes and examines the published change in the log-probability gap.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:204-261`, especially the experiment definitions at `225-243` and implementation table at `208-219`.

## Step 8 · Align the schemes and narrow the gap

**One sentence.** Using the same FP8 scheme for training and rollout narrows the published train–rollout log-probability difference, but the curves do not prove zero difference or bitwise equality.

### On the stage

- The mixed card uses BF16 training and FP8 rollout, so the two evaluations cross different quantization paths. This is the case with BF16-stored weights from Step 5.
- The unified card uses the same FP8 format, scale type, and grouping for training and rollout. Its constructed 0.04 gap bar is half the mixed 0.08 bar on one scale; these values illustrate the comparison and are not public measurements. Published Qwen3 RL curves show a narrower `train_rollout_logprob_abs_diff` range and less TIS clipping without giving exact reductions.
- The closing card moves to INT4: four bits per weight give 0.5 byte instead of BF16's 2 bytes, a theoretical 75% payload reduction before scales. The question asks how training can learn around that stronger rounding.

### Formula and symbols

For one token, a teaching-only distance can be written:

$$d_t=|\ell^{\text{train}}_t-\ell^{\text{rollout}}_t|$$

| Symbol | Meaning | Source |
|---|---|---|
| $t$ | Token position in an answer | Chapter 6's rollout record |
| $\ell^{\text{train}}_t$ | Training-side log probability for that token in context | Training recomputation |
| $\ell^{\text{rollout}}_t$ | Rollout-side log probability recorded during generation | Chapter 6 Step 3 |
| $d_t$ | Absolute distance between those two values | Constructed illustration, not the article's aggregation formula |

### The numbers on the stage

Log probability is the logarithm of the probability assigned to a token in its context. The constructed mixed pair $\ell^{\text{train}}_t=-1.92$ and $\ell^{\text{rollout}}_t=-2.00$ gives $d_t=0.08$. The constructed unified pair $-1.96$ and $-2.00$ gives $d_t=0.04$. Both gap bars use the mixed 0.08 value as full width. The article does not specify token weighting, masking, or averaging for `train_rollout_logprob_abs_diff`, so these examples do not define that logged metric.

On Qwen3-4B, forward-only fake quantization, forward-and-backward fake quantization, and unified FP8 have similar Step-1 KL loss, all above the mixed baseline. Their TIS-clipfrac values are lower. The similar forward-only and forward-and-backward results lead the authors to identify forward quantization as the larger contributor. TIS-clipfrac is the fraction of masked response-token positions clipped by truncated importance sampling, combined with the configured sample-mean reduction. It is not a fraction of optimizer updates; lower values indicate fewer clipped response-token positions in these experiments.

Qwen3-30B-A3B on two H20 servers and Qwen3-235B-A22B on 16 H20 servers also show narrower log-probability-difference ranges under unified FP8. Only curves are published, so this chapter gives no exact reduction and no claim of higher reward, accuracy, or convergence speed. Bitwise equality would mean every stored bit is identical.

INT4's raw ratio is $0.5/2=25\%$ of BF16 bytes, or 75% less. The next chapter keeps BF16 master weights, inserts fake quantization during training, uses a straight-through estimator (STE) to pass gradients through rounding, and exports real INT4 for W4A16 rollout. STE is a training approximation that replaces the missing rounding derivative with a pass-through derivative.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:275-369`; `Awesome-ML-SYS-Tutorial/rlhf/slime/int4/readme.md:37-43,59-61`; `THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd`, `slime/backends/megatron_utils/loss.py:445-448,533` for the response-token clipping indicator and reduction.
