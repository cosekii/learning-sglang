## Step 1 · Halve the eligible weight bytes

**One sentence.** FP8 uses 8 bits for a value instead of BF16's 16, so this constructed example cuts eligible weights from 8 GB to 4 GB.

### On the stage

- The orange BF16 card holds the same 4B-value weight example used in Chapter 8. Two bytes per value make 8 GB.
- The blue FP8 card uses one byte per value, making 4 GB. Its bar is half the BF16 bar on the same scale.
- The map names the four stops that follow: rollout, training, export, and comparison. This step measures only eligible weight bytes, not a complete checkpoint or an RL speedup.

### Formula and symbols

$$M_{16}=P b_{16},\qquad M_8=P b_8,\qquad T_b=M_b/B$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | Number of eligible weight values | Constructed 4B example from Chapter 8 |
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

The block saves $32{,}768-16{,}388=16{,}380$ bytes, or 49.9878%. This does not include other tensors or copies. Slime uses FP32 scales; other recipes can use different formats and granularities.

### Next

The scale makes storage possible. The next step follows the two kinds of FP8 inputs that rollout needs: weights converted beforehand and activations converted as they appear.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fp8/readme.md:66-124`; `THUDM/slime@15fbd2ef82c765fe22f78e288db2bb79ebf582bd`, `tools/convert_hf_to_fp8.py:31-71,142-146`; Qwen3-4B-FP8 `weight_block_size=[128,128]`.
