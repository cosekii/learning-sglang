## Step 1 · Communication can exceed the compute saved

**One sentence.** In this constructed example, moving from 4 to 8 GPUs saves 4 ms of compute but adds 5 ms of communication, so the total grows by 1 ms.

### On the stage

- The panels show constructed times for the same work on 4 and 8 GPUs. Blue is compute; orange is moving tensors between GPUs and waiting for results.
- Both bars use one scale. The 8-GPU compute bar is shorter, but its communication bar grows more. The totals in the corner add the two parts.
- These are teaching values, not measurements. They do not imply that 8 GPUs are generally slower than 4.

### Formula and symbols

$$T=C+W,\qquad \Delta T=(C_8-C_4)+(W_8-W_4)$$

| Symbol | Meaning | Source |
|---|---|---|
| $C_4,C_8$ | Compute time on 4 and 8 GPUs | Constructed here: 8 ms and 4 ms |
| $W_4,W_8$ | Communication time on 4 and 8 GPUs | Constructed here: 2 ms and 7 ms |
| $T$ | Total of the two parts | Calculated in this step |
| $\Delta T$ | Total-time change from 4 to 8 GPUs | Calculated in this step |

### The numbers on the stage

$$T_4=8+2=10\ \mathrm{ms},\qquad T_8=4+7=11\ \mathrm{ms}$$

$$\Delta T=(4-8)+(7-2)=-4+5=+1\ \mathrm{ms}$$

Zero-to-sglang Part III Chapter 4 §2.1 explains that TP repeatedly combines local results inside model layers. More GPUs help only when the compute saved covers the added communication and scheduling cost. This step turns that tradeoff into arithmetic without expanding TP matrix partitioning.

### Next

To locate the communication wait, first see which result every GPU must obtain.

Source: `zero-to-sglang/course-material/ch/part3/第4章_横向扩展.md:19-34`.
