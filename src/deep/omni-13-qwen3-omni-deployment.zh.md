## 第 1 步 · 两份启动账单

> **一句话：** 同一个 Qwen3-Omni checkpoint，纯文字启动一卡一进程，默认语音启动两卡七进程。

### 图上是什么

- 左边一个虚线框是 `pipeline` 进程，里面装着纯文字部署的全部六个 stage。
- 右边每个语音 stage 各住一个进程。四个进程用 GPU 0，一个用 GPU 1，两个只用 CPU。
- 蓝色是 GPU stage，灰色是 CPU stage。图中画的是启动形态，不是实测占用率。
- 两种部署都能输入文字、图像、声音或视频。「纯文字」限制的是输出，不是输入。

### 代入图上的数

| 部署 | stage 数 | stage 进程数 | GPU 数 |
|---|---:|---:|---:|
| 纯文字 | 6 | 1 | 1 |
| 默认语音 | 7 | 4 + 1 + 2 = 7 | 2 |

语音的加法把四个 GPU 0 进程、一个 GPU 1 进程和两个 CPU 进程相加。纯文字的六个 stage 包含 `mm_aggregate`，它把 preprocessing 和实际用到的 encoder 分支汇合后交给 thinker。

### 边界与出处

数量来自 `sglang_omni/models/qwen3_omni/config.py:136-147,257-318,412-452`。纯文字仍接受多模态输入，见 `docs/cookbook/qwen3_omni.md:46-57`。进程数不含 HTTP server 和 coordinator。

### 接下来

下一步跟随请求穿过两种服务器模式，看语音 stage 什么时候才真正运行。

## 第 2 步 · 请求输出选择路线

> **一句话：** 语音服务器只在请求要声音时才使用 talker 和 code2wav。

### 图上是什么

- `modalities` 写客户端要哪些输出种类，公开请求的默认值是 `["text"]`。
- 纯文字服务器在 `mm_aggregate` 汇合 preprocessing 和实际用到的 encoders，再运行 thinker 和 decode。
- 语音服务器处理纯文字请求时，由 thinker 汇合这些输入，再运行 decode；talker 和 code2wav 不参与。
- 加入 `"audio"` 后，thinker 到 talker 再到 code2wav 的分支启用，decode 仍返回文字。
- 两种服务器都接受多模态输入。向纯文字服务器请求声音，不会得到声音。

### 图上的路线

| 服务器与请求输出 | 终点 stage |
|---|---|
| 纯文字，文字 | `decode` |
| 语音，文字 | `decode` |
| 语音，文字和声音 | `decode` 和 `code2wav` |

`mm_aggregate` 是汇合 stage，不是另一个模型。语音图没有单独的 `mm_aggregate`，而由 thinker 完成汇合。code predictor 仍在 `talker_ar` 内，不会增加第八个 stage。

### 出处

路线构造和终点：`sglang_omni/models/qwen3_omni/config.py:136-189,212-302`；`sglang_omni/models/qwen3_omni/request_builders.py:200-261`。请求行为：`docs/basic_usage/omni.md:154-170,199-200,386-395`；`docs/cookbook/qwen3_omni.md:206-208`。

### 接下来

声音启用 talker 后，它放在哪张 GPU 会改变首音等待。

## 第 3 步 · talker 独占，分别看两种等待

> **一句话：** 8 路并发时 talker 独占让 p90 首音几乎减半，单请求总耗时却增加。

### 图上是什么

- 两个摆卡图都把 code2wav 留在 thinker 旁边，只有 talker 从 GPU 0 移到 GPU 1。
- 两根深色柱使用同一比例。8 路并发时，p90 首音均值从 2.680 秒降至 1.439 秒。
- 红卡是另一种负载。每次只有一个请求时，独占后总耗时增加 14–17%。

### 公式

$$
\overline{T}=\frac{T_1+T_2}{2},\qquad R=\left(1-\frac{\overline{T}_{alone}}{\overline{T}_{shared}}\right)\times100\%
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---:|---|
| $T_1,T_2$ | 两次实测的 p90 首音 | 秒 | 公开摆卡实验 |
| $\overline{T}$ | 两次 p90 的算术平均值 | 秒 | 本步 |
| $R$ | 独占后首音等待降幅 | 百分比 | 本步 |

### 代入图上的数

$$
\overline{T}_{shared}=(2.697+2.663)\div2=2.680\ \text{s}
$$

$$
\overline{T}_{alone}=(1.463+1.415)\div2=1.439\ \text{s}
$$

$$
R=(1-1.439\div2.680)\times100\%\approx46\%
$$

单请求增加 14–17% 是来源给出的范围。这张表没有提供对应的两个绝对总耗时，所以本步不画同一比例的绝对时间柱。

### 边界与出处

这些是 `docs/cookbook/qwen3_omni/tuning.md:52-69` 的公开实验，不是本章 H100 同卡配置的实测。8 路实验固定 code2wav 的位置。单请求结果说明首音和总耗时必须分别判断。

### 接下来

下一步把五个 GPU stage 装进一张卡，并核算它们申报的显存份额。
