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
