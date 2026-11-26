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
