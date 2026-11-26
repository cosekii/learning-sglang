## Step 1 · Count the full training copies

**One sentence.** Full replication puts the same weights, gradients and optimizer state on every GPU, so this constructed example costs 64 GB per GPU and 512 GB across eight GPUs.

### On the stage

- The orange card separates 8 GB of 16-bit weights, 8 GB of 16-bit gradients and 48 GB of optimizer-related tables. Together they are the 64 GB saved training state on one GPU.
- The blue card repeats that full 64 GB copy on all eight GPUs. The 512 GB total counts repeated copies, not eight different models.
- The 80% comparison uses the shared 80 GB H100 capacity from earlier chapters. This example covers saved tables only, not the whole memory budget.

### Formula and symbols

$$M=P(b_w+b_g+b_o),\qquad C=N M,\qquad f=M/80\ \text{GB}$$

| Symbol | Meaning | Source |
|---|---|---|
| $P$ | Number of model weight values | Constructed 4B example, $4\times10^9$ |
| $b_w,b_g$ | Bytes per stored weight and gradient | 2 bytes each in this example |
| $b_o$ | Optimizer-related bytes per weight value | Three FP32 tables: $3\times4=12$ bytes |
| $M$ | Saved training tables on one fully replicated GPU | Derived here |
| $N$ | Number of full copies | Eight GPUs |
| $C$ | Saved tables across all copies | Derived here |
| $f$ | Fraction of one 80 GB H100 occupied by $M$ | Shared H100 capacity |

### The numbers on the stage

$$M=4{,}000{,}000{,}000\times(2+2+12)=64{,}000{,}000{,}000\ \text{bytes}=64\ \text{GB}$$
$$C=8\times64\ \text{GB}=512\ \text{GB},\qquad f=64/80=0.8=80\%$$

The optimizer convention is FP32 master weights, momentum and variance. It belongs to this worked example, not to every possible FSDP2 configuration. No activation, gather buffer or runtime allocation is included yet.

### Next

The bill comes from repeating the same tables. The next step divides those tables across the same eight ranks instead of copying them.

Sources: `Awesome-ML-SYS-Tutorial/rlhf/slime/fsdp/readme.md:16`; `Awesome-ML-SYS-Tutorial/rlhf/sys-design/readme-2-en.md:21-31`; shared `HBM_GB` in `src/numbers.ts`.
