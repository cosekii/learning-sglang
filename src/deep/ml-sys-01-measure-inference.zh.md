## 第 1 步 · 量首个 token 前的等待

**一句话。** TTFT 告诉你：用户要等多久，才能看到回答的第一个 token。

**图上是什么。** 左边时钟在请求发出时是 0 ms；右边时钟在首个 token 出现时是 250 ms。蓝色只标这两个时刻之间的等待。这个例子的等待包含排队与 prefill，但图中没有把两者分别测成多少毫秒。

**公式与符号。**

$$\mathrm{TTFT}=t_{\mathrm{first\ token}}-t_{\mathrm{request\ sent}}$$

- $\mathrm{TTFT}$：time to first token，也就是首个 token 前的等待。
- $t_{\mathrm{request\ sent}}$：请求发出的时刻，图中是 0 ms。
- $t_{\mathrm{first\ token}}$：首个输出 token 出现的时刻，图中是 250 ms。
- $\mathrm{ms}$：毫秒；$1{,}000\ \mathrm{ms}=1$ 秒。

**代入图上的数。**

$$\mathrm{TTFT}=250-0=250\ \mathrm{ms}=0.250\ \mathrm{s}=\frac14\ \mathrm{s}$$

250 ms 是 zero-to-sglang 第 1 部分第 5 章 §3.1 的构造教学值，不是本机实测。《Inference Engineering》§1.4 使用同样的测量边界：从请求发出到首个输出 token 出现。本步没有分别测量排队、prefill 和后续回答各花多久。

**接下来。** 首个 token 已经出现；下一把尺子要量相邻输出 token 之间的间隔。

## 第 2 步 · 量相邻 token 的间隔

**一句话。** ITL 是相邻两个输出 token 出现时刻的差，每一段都可以单独测量。

**图上是什么。** 从请求发出开始计时，同一个请求的第 1 至第 4 个输出 token 分别在 250、275、295、325 ms 出现。三段蓝色箭头分别标出 25、20、30 ms；蓝色只表示 ITL，不包括首个 token 前的 TTFT。

**公式与符号。**

$$\mathrm{ITL}_i=t_i-t_{i-1}\quad(i=2,3,4)$$

- $\mathrm{ITL}_i$：inter-token latency，第 $i$ 个输出 token 与前一个输出 token 的间隔。
- $t_i$：第 $i$ 个输出 token 出现的时刻；$t_1$ 是第 1 步首个 token 的 250 ms。
- $i$：输出 token 的编号，从 1 开始；本步量第 2、3、4 个 token 前的三段间隔。
- $\mathrm{ms}$：毫秒，沿用上一步的单位。

**代入图上的数。**

$$\mathrm{ITL}_2=275-250=25\ \mathrm{ms}$$

$$\mathrm{ITL}_3=295-275=20\ \mathrm{ms}$$

$$\mathrm{ITL}_4=325-295=30\ \mathrm{ms}$$

zero-to-sglang 第 1 部分第 5 章 §3.1 与《Inference Engineering》§1.4 都把 ITL 定义为相邻输出 token 的时间间隔。第 2 至第 4 个时刻是在同一构造请求上补写的教学值，不是本机实测；三段间隔不必一样长。

**接下来。** 三段间隔已经分别量出；下一步把它们合成一个平均值。

## 第 3 步 · 求首个 token 后的平均间隔

**一句话。** TPOT 把首个 token 后的各段 ITL 合成一个平均值。

**图上是什么。** 同一个请求仍有 250、275、295、325 ms 四个时刻，以及 25、20、30 ms 三段蓝色 ITL。本步把三段间隔一起取平均；首末时刻也算出同一个结果。TPOT 不含第 1 步的 TTFT，平均也不表示三段间隔变得一样长。

**公式与符号。**

$$\mathrm{TPOT}=\frac{\sum_{i=2}^{N}\mathrm{ITL}_i}{N-1}=\frac{t_N-t_1}{N-1}\quad(N\ge2)$$

- $\mathrm{TPOT}$：time per output token；本例是首个 token 之后，每段相邻输出间隔的平均值。
- $N$：输出 token 的总数，本例为 4；$N-1$ 才是首个 token 后的间隔数。
- $\mathrm{ITL}_i$：第 2 步量出的第 $i$ 个 token 与前一个 token 的间隔。
- $t_1$、$t_N$：第 1 个和最后一个输出 token 的时刻，本例分别为 250、325 ms。
- $\sum_{i=2}^{N}$：从第 2 个 token 到第 $N$ 个 token，把各段 ITL 加起来。

**代入图上的数。**

$$\mathrm{TPOT}=\frac{25+20+30}{4-1}=\frac{75}{3}=25\ \mathrm{ms}$$

$$\mathrm{TPOT}=\frac{325-250}{4-1}=\frac{75}{3}=25\ \mathrm{ms}$$

zero-to-sglang 第 1 部分第 5 章 §3.1 用同样的边界：输出 200 个 token 时，扣除首个 token 后按 199 段计算，课程常把单位写成 ms/token。本例的 25 ms 恰好等于第一段 ITL，但另外两段仍是 20、30 ms；请求发出到首个 token 的 250 ms TTFT 没有进入分子。

**接下来。** 首个 token 前的等待和后续平均间隔都已量出；下一步可以量整个回答从头到尾的总时间。
