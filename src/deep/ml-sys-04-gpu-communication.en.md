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

## Step 2 · All-reduce gives every GPU the same total

**One sentence.** Four GPUs hold different two-number tensors; SUM all-reduce adds matching positions and returns `[16, 20]` to every GPU.

### On the stage

- The four blue boxes are different local tensors, not four copies of one input.
- The center adds by position: $1+3+5+7=16$ in the first column and $2+4+6+8=20$ in the second.
- The orange panel shows GPU 0–3 holding the same complete result afterward. Color separates local inputs from reduced outputs.

### Formula and symbols

$$y_j=\sum_{r=0}^{N-1}x_{r,j}$$

| Symbol | Meaning | Source |
|---|---|---|
| $N$ | Number of participating GPUs | Constructed here: 4 |
| $r$ | GPU index | 0–3 in this step |
| $j$ | Tensor column | 0 or 1 here |
| $x_{r,j}$ | Column $j$ on GPU $r$ | Local tensors on the stage |
| $y_j$ | Sum of column $j$ across all GPUs | Calculated in this step |

### The numbers on the stage

$$y_0=1+3+5+7=16,\qquad y_1=2+4+6+8=20$$

Every GPU therefore receives $y=[16,20]$. `Reduce` returns the total to one destination; `all-reduce` returns it to every participant. Other reductions exist, including MAX, but this chapter uses SUM and does not expand them.

### Next

Which processes represent these GPUs, and how does the program know the participant count? The next step draws the process group.

Sources: `Awesome-ML-SYS-Tutorial/torch/torch-distributed/readme.md:510-526`; `zero-to-sglang/course-material/ch/part2/第9章_多进程与张量并行.md:82-105`.

## Step 3 · The process group numbers four participants

**One sentence.** This example uses four processes to drive four GPUs, with `rank` identifying each process and `world size` counting them.

### On the stage

- The dashed box is a process group, which organizes existing processes so they can exchange data.
- Each row connects a process to its GPU. `rank 0` through `rank 3` are their identifiers within the group.
- All four rows join the same all-reduce, so `world size = 4`. The tensors from Step 2 show that each process still owns a separate input.
- One process per GPU is this example's mapping, not a requirement for every framework or deployment.

### Formula and symbols

$$N=\texttt{world\_size},\qquad r=\texttt{rank}\in\{0,1,\ldots,N-1\}$$

| Symbol | Meaning | Source |
|---|---|---|
| $N$ | Total processes in the group | This example: `world size = 4` |
| $r$ | Process identifier within the group | 0–3 here |
| $\texttt{world\_size}$ | Participant count passed to initialization | `torch.distributed` example |
| $\texttt{rank}$ | Process identifier passed to initialization | Same example |

### The numbers on the stage

The sample selects a device with `torch.cuda.set_device(rank)` and starts `world_size` processes. Here $N=4$, giving ranks 0, 1, 2 and 3. These are the four owners of Step 2's separate inputs, not one process copied into four outputs.

A process group is the communication boundary. This chapter does not expand `new_group`, child groups or control-plane request routing.

### Next

Every process calls the same collective. The next step follows that call into the GPU communication software.

Source: `Awesome-ML-SYS-Tutorial/torch/torch-distributed/readme.md:13-24,57-89,118-141`.

## Step 4 · The interface hands the collective to NCCL

**One sentence.** All four ranks call SUM all-reduce through `torch.distributed`, and the selected NCCL backend communicates the GPU tensors.

### On the stage

- Ranks 0–3 on the left all participate in the collective; rank 0 is not doing the operation alone.
- The code applies SUM all-reduce to each process's local tensor.
- `torch.distributed` is the interface the program calls. The `NCCL backend` below it implements GPU collective communication.
- Blue marks the participants; orange marks the two software layers. Physical links are not drawn yet.

### Formula and symbols

$$y=\operatorname{all\_reduce}_{\mathrm{SUM}}(x_0,x_1,x_2,x_3)$$

| Symbol | Meaning | Source |
|---|---|---|
| $x_r$ | Input tensor on rank $r$ | Steps 2 and 3 |
| $y$ | Sum returned to every rank | Step 2: $[16,20]$ |
| $\operatorname{all\_reduce}_{\mathrm{SUM}}$ | Collective that adds matching positions and returns the result to every participant | Step 2 |

### The numbers on the stage

The four ranks input $[1,2]$, $[3,4]$, $[5,6]$ and $[7,8]$, so every rank receives $y=[16,20]$. `tensor` in the code is the current process's local input, not four inputs inside one process.

Initialization selects this backend with `backend="nccl"`. NCCL is NVIDIA's GPU collective-communication library. Other backends are outside this chapter, and Ring is not presented as the choice for every run.

### Next

Which hardware path carries the tensor below this interface? The next step draws the links.

Sources: `Awesome-ML-SYS-Tutorial/torch/nccl/readme.md:3-10,41-53`; `Awesome-ML-SYS-Tutorial/torch/torch-distributed/readme.md:160-175,286-292`.

## Step 5 · Topology labels describe the tensor's path

**One sentence.** `NV18` denotes a bonded set of 18 NVLinks, while `SYS` traverses PCIe and the interconnect between NUMA nodes.

### On the stage

- The panels come from two reported `nvidia-smi topo -m` outputs. They are not two options to toggle on one machine.
- On the left, an `NV18` connection joins two GPUs. NVLink is a GPU-to-GPU link, and 18 is the bonded-link count in this output.
- On the right, `SYS` is expanded into GPU, PCIe, the interconnect between NUMA nodes, PCIe and the other GPU.
- PCIe is a GPU-to-host channel. NUMA nodes are host CPU and memory partitions. Blue boxes remain GPUs and orange marks communication paths.

### Formula and symbols

$$\mathrm{NV}\#=\#\times\mathrm{NVLink}$$

$$P_{\mathrm{SYS}}=\mathrm{GPU}\leftrightarrow\mathrm{PCIe}\leftrightarrow I_{\mathrm{NUMA}}\leftrightarrow\mathrm{PCIe}\leftrightarrow\mathrm{GPU}$$

| Symbol | Meaning | Source |
|---|---|---|
| $\#$ | Number of NVLinks in a bonded connection | `nvidia-smi topo -m` legend |
| $P_{\mathrm{SYS}}$ | SYS example path expanded here | Same legend |
| $I_{\mathrm{NUMA}}$ | Interconnect between NUMA nodes | Same legend |

### The numbers on the stage

The left panel sets $\#=18$, producing the label `NV18`. This describes one reported output, not a link count for every GPU.

The right panel has no bandwidth or time measurement. A route label names the interconnects crossed; it does not determine an application speedup. NVSwitch, InfiniBand and specific link rates are outside this chapter.

### Next

The next step splits the tensor into chunks and follows those chunks through one all-reduce algorithm.

Sources: `Awesome-ML-SYS-Tutorial/torch/nccl/readme.md:99-145`; `zero-to-sglang/course-material/ch/part1/第3章_GPU入门.md:97-108,300-312`; `Inference Engineering §3.3.1`.
