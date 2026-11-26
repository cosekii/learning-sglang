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
