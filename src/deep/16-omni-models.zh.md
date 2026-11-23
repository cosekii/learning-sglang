## 第 1 步 · 文本 request 和 omni request 并排

> **一句话：** engine 不变；文本两侧各有一个转换器，omni request 两侧也各需要一个，图上标成 `?`。

### 图上是什么

- 中间的大方框「engine」：一个模型，一个循环，两行共用。
- 上面一行「文本 · 第 1–15 章」：`The capital of France is` → 蓝框 tokenizer（第 1 章第 2 步）→ token id → engine → token id → 蓝框 detokenizer（第 1 章第 11 步）→ `Paris`。
- 下面一行「omni · 本部分」：左边一张照片（6 × 6 的色块示意）和一段语音问题的波形，右边一段语音回答的波形。
- 两侧两个虚线框 `?`：还不知道是什么的转换器。
- 底部脚注：采样的定义和采样率的出处。

### 公式

三个输入输出都按「每个多少 × 有多少个」算数值个数：

$$
V_{\text{photo}} = L^2 \times 3,\qquad
V_q = T_q \times r_{\text{in}},\qquad
V_a = T_a \times r_{\text{out}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $L$ | 照片每边的像素数 | 896 | 本步，组件里的 `PHOTO` |
| 3 | 每个像素的红、绿、蓝三个数 | | 本步 |
| $T_q$ | 语音问题的长度 | 10 s | 本步 |
| $T_a$ | 语音回答的长度 | 20 s | 本步 |
| $r_{\text{in}}$ | 模型读入声音的采样率 | 每秒 16,000 个采样 | `src/numbers.ts` 的 `SPEECH_IN_HZ` |
| $r_{\text{out}}$ | 模型写出声音的采样率 | 每秒 24,000 个采样 | `src/numbers.ts` 的 `SPEECH_OUT_HZ` |
| $V_{\text{photo}}, V_q, V_a$ | 照片、问题、回答各有多少个数值 | | 本步 |

一个**采样**是声波高度的一次读数，一个数。采样率就是每秒读多少次。

### 代入图上的数

| 量 | 算式 | 图上 |
|---|---|---|
| 照片 | 896 × 896 × 3 | 2,408,448 个数值 |
| 问题 | 10 s × 16,000 | 160,000 个采样 |
| 回答 | 20 s × 24,000 | 480,000 个采样 |

### 为什么需要新的转换器

- 文本行的两个转换器都不是神经网络：tokenizer 按训练时定下的词表把字符串切开、查出 id（第 1 章第 2 步），detokenizer 反过来查表，都在 CPU 上做完。
- 照片和声音不是文本，没有词表能把 240 万个像素值或 16 万个采样直接查成 token id。回答也一样：engine 写出的是 token，播放器要的是采样。
- engine 本身不用改，所以问题只剩两个 `?` 里装什么。

### 接下来

第 2 步打开左边的 `?`，第 3 步打开右边的。

## 第 2 步 · 左边的 ?：每个输入一个 encoder

> **一句话：** 视觉 encoder 把照片变成 784 个 prompt 位置，音频 encoder 把问题变成 130 个；它们并进 prompt，engine 照旧一遍 prefill。

### 图上是什么

- 左上：照片的色块，框出的一格是**一个位置**，旁边放大成 2 × 2 个 patch。
- 左下：问题的波形，下面一排刻度表示特征帧。
- 中间两个蓝框：视觉 encoder、音频 encoder，各标「一个模型，在 GPU 上」。
- 右边：蓝色长条是 784 个 embedding，橙色短条是 130 个 embedding。
- 右下：拼起来的 prompt，几格灰色的模板 token，后面接蓝条和橙条，标「一遍 prefill，如 Ch. 4 Step 3」。
- 两条带点的说明：tokenizer 和 encoder 的区别；SGLang 现在已经这么做。

### encoder 交出的是什么

**encoder** 是一个在 GPU 上运行的模型，输出 **embedding**：每个 prompt 位置一个向量。它和 engine 用 token id 查表得到的向量是同一种东西，就是第 2 章第 2 步的 $x_j$。Qwen3-Omni 的 engine 里，一个这样的向量是 2,048 个数（`src/numbers.ts` 的 `OMNI_HIDDEN`；第 2 章的 Llama-3-8B 是 4,096）。

进了 engine 以后，一个位置来自文本 token 还是来自 encoder，层里的计算没有区别。

### 公式

$$
N_{\text{side}} = \frac{L}{p \cdot g},\qquad
N_{\text{img}} = N_{\text{side}}^2,\qquad
N_{\text{aud}} = \frac{T_q \cdot f_{\text{aud}}}{100} \times a
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $L$ | 照片每边像素 | 896 | 第 1 步 |
| $p$ | 一个 patch 每边的像素 | 16 | `src/numbers.ts` 的 `VISION_PATCH` |
| $g$ | 每 $g \times g$ 个 patch 合成一个位置 | 2 | `src/numbers.ts` 的 `VISION_MERGE` |
| $N_{\text{side}}$ | 照片一条边上的位置数 | | 本步 |
| $N_{\text{img}}$ | 照片的位置数 | | 本步 |
| $T_q$ | 问题长度 | 10 s | 第 1 步 |
| $f_{\text{aud}}$ | 音频 encoder 每秒读的特征帧 | 100 | `src/numbers.ts` 的 `AUDIO_FRAMES_PER_SEC` |
| $a$ | 每 100 个特征帧变成的位置数 | 13 | `src/numbers.ts` 的 `AUDIO_POS_PER_100` |
| $N_{\text{aud}}$ | 问题的位置数 | | 本步 |

**patch** 是照片切出的一个小方块，视觉 encoder 先按 patch 读图。**特征帧**是音频 encoder 从采样里每 10 ms 取出的一组数。

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| 一个位置每边 | $p \cdot g$ = 16 × 2 | 32 像素（框出的那一格） |
| $N_{\text{side}}$ | 896 ÷ 32 | 28 |
| $N_{\text{img}}$ | 28 × 28 | **784** |
| 特征帧 | 10 s × 100 | 1,000 |
| $N_{\text{aud}}$ | 1,000 ÷ 100 × 13 = 10 × 13 | **130** |
| prompt | 模板 token + 784 + 130 | 模板 token + 914 个位置 |

第 1 步的 240 万个像素值变成 784 个位置，16 万个采样变成 130 个位置。

### SGLang 已经做到的

- encoder 在 prefill 步里跑：模型的前向先算出图像和音频的 embedding，替换掉 prompt 里占位的位置，再走各层。
- 见过的照片不再算：SGLang 按图像数据的 hash 缓存 encoder 的输出，同一张图再来时直接取出。

所以左边的 `?` 在 SGLang 里已经有了。

### 接下来

第 3 步打开右边的 `?`：engine 写出的 token 怎么变成声音。

## 第 3 步 · 右边的 ?：talker、code predictor、code2wav

> **一句话：** 每个 token 还送给 talker；talker 写一帧的 code 0，code predictor 写 codes 1–15，再下一帧；每满 10 帧，code2wav 把它们变成 800 ms 的声音。

### 图上是什么

- 左边 engine，发出两路 tokens。
- 上路：蓝框 detokenizer，「一张表，在 CPU 上」，出来是文本形式的回答，和第 1–15 章一样。
- 下路，虚线框「语音」里三个模型：
  - 蓝框 talker，「每帧 1 步」，写出 code 0（网格第一行，蓝色）。
  - 橙框 code predictor，「每帧 15 步」，写出 codes 1–15（网格下面 15 行，橙色）。
  - 网格：一列是一帧，一行是一个 code，共 16 行、10 列。
  - 网格下面的 code2wav：等满 10 帧，变成一段波形。
- 动画：哪个模型在写，它的方框就加粗变色；网格一格一格填满，最后 code2wav 输出声音，然后重来。
- 右边：一个 code 的取值范围，和整个 20 s 回答的步数。

### 公式

$$
t_{\text{frame}} = \frac{S_{\text{frame}}}{r_{\text{out}}},\qquad
n_{\text{frame}} = \frac{T_a}{t_{\text{frame}}}
$$

$$
n_{\text{cp}} = n_{\text{frame}} \times (n_{\text{code}} - 1),\qquad
n_{\text{c2w}} = \frac{n_{\text{frame}}}{n_{\text{chunk}}}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $S_{\text{frame}}$ | codec 每帧写出的采样数 | 1,920 | `src/numbers.ts` 的 `SAMPLES_PER_FRAME` |
| $r_{\text{out}}$ | 写出的采样率 | 每秒 24,000 | 第 1 步 |
| $t_{\text{frame}}$ | 一帧的时长 | | 本步 |
| $T_a$ | 回答长度 | 20 s | 第 1 步 |
| $n_{\text{frame}}$ | 回答的帧数，也是 talker 的步数 | | 本步 |
| $n_{\text{code}}$ | 每帧的 code 数 | 16 | `src/numbers.ts` 的 `CODES_PER_FRAME` |
| $n_{\text{cp}}$ | code predictor 的总步数 | | 本步 |
| $n_{\text{chunk}}$ | code2wav 每遍拿的帧数 | 10 | SGLang-Omni 的 Qwen3-Omni 配置 `codec_coalesce_frames=10` |
| $n_{\text{c2w}}$ | code2wav 的遍数 | | 本步 |

**帧**是一小段声音；**code** 是描述它的一个整数，取 2,048 个值之一（`CODE_VALUES`），像第 1 章第 4 步 engine 选 token id 那样从概率里选出。**codec** 是规定 code 和声音怎么互换的那套编码，code2wav 是它的解码端。

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| $t_{\text{frame}}$ | 1,920 ÷ 24,000 | 0.08 s = **80 ms** |
| 一遍 code2wav 的声音 | 10 × 80 ms | **800 ms** |
| $n_{\text{frame}}$（talker 步数） | 20 s ÷ 80 ms | **250** |
| $n_{\text{cp}}$ | 250 × 15 | **3,750** |
| $n_{\text{c2w}}$ | 250 ÷ 10 | **25** 遍 |

### 为什么一帧一帧来

- talker 的每一步读两样东西：engine 的下一个 token，和刚写完的那一帧（底部脚注）。所以下一帧必须等这一帧的 16 个 code 全部写完。
- code predictor 的 15 步也一个接一个：code $i$ 要看 code $0 \dots i-1$。
- SGLang-Omni 把 code predictor 放在 talker 自己的那一步里跑，talker 一步结束时这一帧就齐了。
- 图上省略了一件事：code2wav 每遍除了 10 个新帧，还会重读最多 25 个更早的帧（SGLang-Omni code2wav scheduler 的 `left_context_size=25`），让段与段的接缝平滑。第 20 章讲原因。

### 接下来

第 4 步把第 2、3 步的六个模型放进一张图，按「一遍」和「循环」分类。

## 第 4 步 · 六个模型，两类

> **一句话：** 三个模型读完输入就结束；三个是循环，每一步都要等前一步写出的东西。

### 图上是什么

- 白框（一遍型）：视觉 encoder「1 遍」、音频 encoder「1 遍」、code2wav「25 遍」。
- 蓝底框（循环型）：engine「prefill 1 遍，之后每个文本 token 一步」、talker「250 步」、code predictor「3,750 步」。
- 箭头上的数：784、130（进 engine 的位置数），tokens（engine 到 talker），code 0 和「这一帧」（talker 与 code predictor 来回），10 帧（进 code2wav），「每遍 800 ms 声音」。
- 两条图例：白框和蓝底框各是什么意思。
- 底部脚注：计数来自第 2、3 步的照片、问题和回答。

### 两类的区别

| | 一遍型 | 循环型 |
|---|---|---|
| 做法 | 读完整个输入，写出输出，结束 | 第 1 章第 11 步的前向、挑选、追加，直到停止 |
| 和上一次的关系 | 不需要上一次的输出 | 需要上一步写出的东西 |
| 能不能并排跑 | 能 | 同一个 request 的各步不能 |
| 本 request 里 | 视觉 encoder、音频 encoder、code2wav | engine、talker、code predictor |

code2wav 跑 25 遍，但它是一遍型：每遍拿 10 个新帧，交出 800 ms 声音，不读上一遍交出的声音。它重读的 25 个旧帧是 talker 早已写好的 code，不是上一遍的输出。

### 代入图上的数

| 模型 | 类 | 工作量 | 来自 |
|---|---|---|---|
| 视觉 encoder | 一遍 | 1 遍，出 784 个 embedding | 第 2 步 |
| 音频 encoder | 一遍 | 1 遍，出 130 个 embedding | 第 2 步 |
| engine | 循环 | 1 遍 prefill，之后每个文本 token 1 步 | 第 4 章第 3 步 |
| talker | 循环 | 250 步 | 第 3 步，20 s ÷ 80 ms |
| code predictor | 循环 | 250 × 15 = 3,750 步 | 第 3 步 |
| code2wav | 一遍 | 250 ÷ 10 = 25 遍 | 第 3 步 |

### 循环之间也串着

- talker 要 engine 的 token。
- code predictor 要 talker 的 code 0。
- talker 的下一步要 code predictor 写完的这一帧（第 3 步）。

第 1–15 章的 SGLang 只服务一个循环；这个 request 有三个，而且一个等另一个。

### 接下来

第 5 步看其中最松的一环：talker 等 engine 的 token。

## 第 5 步 · talker 要等 engine 写出的 token

> **一句话：** talker 处理 token $k$ 的那一步，要等 engine 写出 $k$；engine 忙别的 request 时，talker 只能等。

### 图上是什么

- 横轴：迭代，1 到 15；一列是 engine 循环的一次迭代，第 0 列标「到达」，放着 prompt。
- engine 一行（橙色）：`P` 是 prefill，数字是这一步写出的 token；灰色虚线框「忙」是 engine 在跑别的 request。
- talker 一行（蓝色）：`P` 是 talker 的 prefill，数字是这一步读入的 token；红色虚线框「等」是 talker 没有输入可读。
- 动画：一列一列出现，到第 15 列停一会儿，再从头来。
- 蓝色的「需要：」一栏：缺的两样东西。
- 底部两条脚注：「忙」的意思；SGLang-Omni 在 `talker_scheduler.py` 里做这个等待。

### 公式

$$
c_{\text{talker}}(k) = \max\big(c_{\text{talker}}(k-1) + 1,\; c_{\text{engine}}(k) + 1\big)
$$

| 符号 | 是什么 | 从哪来 |
|---|---|---|
| $k$ | token 编号，1, 2, 3, … | 本步 |
| $c_{\text{engine}}(k)$ | engine 写出 token $k$ 的那次迭代 | 图上 engine 一行 |
| $c_{\text{talker}}(k)$ | talker 读 token $k$ 的那次迭代 | 本步 |
| $c_{\text{talker}}(0)$ | talker 的 prefill，在第 2 次迭代 | 图上 talker 一行的 `P` |

两项各管一件事：talker 一次迭代只走一步（第一项）；token 写出后，下一次迭代才能读（第二项）。没有被任何 $c_{\text{talker}}(k)$ 占到的迭代就是「等」。

### 代入图上的数

engine 第 1 次迭代的 prefill 同时写出 token 1（第 1 章第 4 步：一次前向的最后一个位置就给出下一个 token）。

| $k$ | $c_{\text{engine}}(k)$ | $c_{\text{talker}}(k-1)+1$ | $c_{\text{engine}}(k)+1$ | $c_{\text{talker}}(k)$ |
|---|---|---|---|---|
| 1 | 1 | 3 | 2 | 3 |
| 2 | 2 | 4 | 3 | 4 |
| 3 | 3 | 5 | 4 | 5 |
| 4 | 7 | 6 | 8 | **8** |
| 5 | 8 | 9 | 9 | 9 |
| 6 | 9 | 10 | 10 | 10 |
| 7 | 12 | 11 | 13 | **13** |
| 8 | 13 | 14 | 14 | 14 |
| 9 | 14 | 15 | 15 | 15 |

- engine 在第 4–6 次和第 10–11 次迭代「忙」：它的 scheduler 把这几次用在别的 request 上，比如一次 prefill（第 6 章第 4 步，prefill 优先）。
- 第 6、7 次迭代 talker 是「等」：token 4 第 7 次才写出，第 8 次才能读。
- 第 11、12 次迭代是「等」：token 7 第 12 次才写出。
- token 10 在第 15 次写出，talker 要到第 16 次才读，超出了图的范围。

忙和等的位置是示意，不是实测；talker 多久等一次取决于 engine 有多忙。

### 这个检查在哪里

- SGLang 的 scheduler 从不做这种检查：它的 request 只读自己的 prompt 和自己写出的 token，不依赖另一个模型的输出。
- SGLang-Omni 的 talker scheduler 加了这一步：拿到下一个 decode batch 后，先看 batch 里每个 request 的下一个输入（engine 的 token，以及上一帧的 code）是否都到了；有一个没到，就扣住整个 batch 不跑（`is_batch_ready_to_run`）。

### 接下来

「需要：」一栏写着缺的两样：每个 token 一写出就交接过去，和一个先检查 token 到没到再走的 talker 循环。SGLang 一个进程只跑一个循环，所以第 17 章先回答 talker 的循环跑在哪里，第 18 章回答 token 怎么送过去。
