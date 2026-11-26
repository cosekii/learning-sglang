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
