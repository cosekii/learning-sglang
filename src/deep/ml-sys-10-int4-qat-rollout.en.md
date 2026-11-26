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
