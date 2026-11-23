## 第 1 步 · 进程 2 内部

> **一句话：** 第 9 章第 5 步的进程 2，也就是 scheduler，打开来看：中间是一个转个不停的六 stage 循环，左边是它读写的列表，右边是内存和 GPU。

### 图上是什么

- **中间一列：** 六个方框，循环的六个 stage，从上往下执行；右边的灰色虚线箭头把最后一个接回第一个。转一圈 = 模型走一步（第 1 章第 3、4 步的一次前向加挑一个 token）。
- 第二个方框 `get_next_batch_to_run` 标着 `Ch. 6 Step 9`：它就是第 6 章第 9 步画的那个决策。
- **左列：** `inbox · zmq PULL` 和 `outbox · zmq PUSH`（第 9 章第 6 步的队列）；`waiting_queue`，此刻写着「空」；`running_batch`，里面两条橙色描边的「Req · decode 中」。
- **右列：**
  - `RadixCache`：三个蓝色圆点画的一棵小树（第 8 章第 4 步）。
  - `KV 池`：24 个小方块（第 7 章第 4 步的 page），11 个浅青色的已被占用，13 个白色的空闲。
  - `GPU · ModelRunner`：一根蓝色条，「前向传播 · 4.8 ms」。

### 公式

$$
t_{\text{step}} = \frac{M_W}{BW}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $M_W$ | 模型权重的字节数 | 16 GB | 第 4 章第 2 步；`src/numbers.ts` 的 `W_GB` |
| $BW$ | HBM 带宽 | 3.35 TB/s | 第 4 章第 5 步；`BW` |
| $t_{\text{step}}$ | 一次前向传播的时间 | | 第 4 章第 5 步 |

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| $t_{\text{step}}$ | 16 ÷ 3.35 | 4.78 ms | 4.8 ms |
| 空闲 page | 24 − 11 | 13 | 13 个白色方块 |

### 接下来

第 2–7 步跟着一个 Req（第 9 章第 7 步的 rid a1f3，红色小条）依次走过这六个 stage。

## 第 2 步 · ingest_requests：清空 inbox

> **一句话：** 循环一开头把 inbox 里的消息全部取走，每条变成一个 `Req`，排到 `waiting_queue` 末尾。

### 图上是什么

- inbox 方框亮成蓝色描边，里面一个蓝色小块「消息」。
- `waiting_queue` 也亮起，里面出现红色小条 `Req a1f3`。
- 中间第一个方框加粗：`ingest_requests` · inbox → Req 对象。

### 这条消息里有什么

它是进程 1 沿第 9 章第 7 步那根蓝线发来的 `TokenizedGenerateReqInput`：

| 字段 | 值 | 从哪来 |
|---|---|---|
| rid | a1f3 | 第 9 章第 7 步 |
| input ids | `791 6864 315 9822 374`（"The capital of France is"） | 第 9 章第 3 步 |
| 采样参数 | temperature、top-p 等 | 第 9 章第 2 步的请求 |

变成的 `Req` 就是第 9 章第 8 步讲的对象：rid、输入 id、还空着的输出 id、还没有 page。

### 为什么是「清空」

读 inbox 不阻塞（第 9 章第 6 步）：有几条取几条，没有就往下走。所以上一圈期间到的消息此刻都被取走，一个 request 最多等一圈循环就会被看到。一圈至少是 4.8 ms 的前向，再加 CPU 上的工作（第 9 步给它标了示意时间）。

GPU 和 cache 都还没动；这个 Req 跑不跑，第 3 步决定。

### 接下来

第 3 步：查 radix tree，看有空间没有。

## 第 3 步 · get_next_batch_to_run：匹配前缀，检查空间

> **一句话：** 5 个 token 里前 3 个已在 radix tree 里，只需 prefill 2 个；空闲 page 够，于是取 2 个 page，Req 进入本步的 prefill batch。

### 图上是什么

- `RadixCache` 亮起，旁边三行蓝字：「匹配 3 / 5」「→ 2 个待 prefill」「→ 2 个 page」。
- `KV 池` 里两个方块变成实心蓝色（第 7、12 号），下面「有空间 ✓ · 已取 2 个 page」。
- 红色小条移进中间第二个方框，写着 `prefill batch`。
- `running_batch` 也亮起：这一步要决定它跑不跑。

### 公式

$$
n_{\text{new}} = n_{\text{prompt}} - n_{\text{hit}},\qquad
\text{page 数} = \left\lceil \frac{n_{\text{new}}}{\text{page size}} \right\rceil
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n_{\text{prompt}}$ | prompt 的 token 数 | 5 | 第 2 步 |
| $n_{\text{hit}}$ | 从头匹配上 radix tree 的 token 数 | 3 | 本步；匹配规则见第 8 章第 5 步 |
| $n_{\text{new}}$ | 要真正 prefill 的 token 数 | | 本步 |
| page size | 一个 page 装几个 token | 1 | 第 7 章第 6 步；SGLang 在 CUDA 上不设时取 1 |

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| 匹配上的 | `791 6864 315` | 3 | 匹配 3 / 5 |
| $n_{\text{new}}$ | 5 − 3 | 2（`9822 374`） | → 2 个待 prefill |
| page 数 | 2 ÷ 1 | 2 | → 2 个 page，两个蓝色方块 |

### 空间检查

这是第 7 章第 7 步的判断：空闲 page ≥ 所需 page？「所需」不只是这 2 个 token，还包括回答要写的长度（$\min(\text{max\_new\_tokens}, 4096)$，第 7 章第 7 步的表）。13 个空闲方块够用，于是通过。

page 就在这个 stage 取走（SGLang 在这里调 `ScheduleBatch.prepare_for_extend`），不是在下一步。

### running_batch 这一步做什么

SGLang 默认不把 prefill 和 decode 混在一个 batch 里（`--enable-mixed-chunk` 默认关，第 6 章第 7 步）。有 prefill 要跑时，`running_batch` 里那两个 decode 中的 Req 这一步等着。

### 接下来

第 4 步把这个 batch 变成 GPU 能读的张量。

## 第 4 步 · ScheduleBatch → ForwardBatch：变成张量

> **一句话：** 一串 Req 对象变成三样张量：所有要算的 token id 拼成一个数组、每个 token 的位置、每个 request 的 page table。

### 图上是什么

- 中间第三个方框加粗：`ScheduleBatch → ForwardBatch` · ids · 位置 · pages。
- 红色小条移到这里，写着 `ids · pos · pages`。
- `KV 池` 下方：「它的 2 个 page，在 page table 里」。

### 三样东西

| 部分 | 是什么 | 我们的 Req 贡献 |
|---|---|---|
| ids | batch 里每个 request 本步要算的 token，拼成一个扁平数组 | `9822 374`，第 3 步那 2 个没缓存的 |
| 位置 | 每个 token 在自己序列里排第几 | 第 4、5 个（前 3 个是缓存的前缀） |
| pages | 每个 request 的 page table（第 7 章第 7 步）：按位置列出它的 k、v 在 pool 里的哪一格 | 5 项：tree 已有的 3 个 page，加第 3 步取的 2 个 |

- **位置**给 RoPE 用：Llama 按位置号旋转 q 和 k（第 2 章第 11 步）。SGLang 里位置从 0 数，所以实际是 3 和 4。
- **pages**：第 4、5 个位置的 attention 通过这张表读全部 5 个位置的 k、v；新算出的 k、v 写进最后 2 项指向的 page。

### 名字

`ScheduleBatch` 是 scheduler 的对象（在 `schedule_batch.py`）；`ForwardBatch` 是 model runner 读的张量包（在 `model_executor/forward_batch_info.py`，由 `tp_worker.py` 调 `ForwardBatch.init_new` 生成）。这里不再分配任何 page。

### 接下来

第 5 步：GPU 拿这些张量跑前向。

## 第 5 步 · ModelRunner.forward：跑第 2–4 章

> **一句话：** GPU 上查 embedding、跑 32 层 attention 和 MLP、给每个 request 的最后一个位置算 logits；新的 k、v 写进第 3 步取的 2 个 page。

### 图上是什么

- 中间第四个方框加粗：`ModelRunner.forward` · embed → 32 层 → logits。
- 红色小条到了右下的 GPU 方框，写着「前向」；GPU 方框橙色描边。
- `KV 池` 下方青色字：「读全部 page · 写 2 个新的」。
- GPU 方框下方橙色字：「写入 2 个新 token（及其他 prefill）」。

### 前向里发生什么

1. ids 查 embedding 表，每个 token 得到向量 $x$（第 2 章第 2 步）。
2. 32 层，每层：attention 给第 4、5 个位置算 $q, k, v$（第 2 章第 3 步），把新 $k, v$ 写进 2 个新 page，再通过 page table 读 5 个位置的 $k, v$；然后 MLP。
3. 只有每个 request 的最后一个位置要 logits，因为只有它预测下一个 token。我们的是第 5 个位置（`␣is`）之后的向量，变成 128,256 个分数（第 1 章第 3 步的 $s_t$）。

### 公式

$$
\text{写入} = n_{\text{new}} \times m_{kv},\qquad
\text{读取} = n_{\text{prompt}} \times m_{kv}
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $n_{\text{new}}$ | 本步新算的 token | 2 | 第 3 步 |
| $n_{\text{prompt}}$ | 这个 request 的全部位置 | 5 | 第 2 步 |
| $m_{kv}$ | 一个 token 在全部 32 层的 k 和 v | 128 KB | 第 3 章第 9 步；`KB_PER_TOKEN` |

### 代入图上的数

| 量 | 算式 | 结果 |
|---|---|---|
| 写入 KV | 2 × 128 KB | 256 KB |
| 读取 KV（我们这个 request） | 5 × 128 KB | 640 KB |
| logits | 词表大小 | 128,256 个（`VOCAB`） |
| 前向时间 | $t_{\text{step}}$ | 4.8 ms，GPU 条上的数 |

这几百 KB 和 16 GB 权重比可以忽略。一次前向的时间按权重读取算，前提是整个 batch 的 token 数低于第 4 章第 8 步约 300 的平衡点；我们的 Req 只贡献 2 个，其他 prefill 有多少图上没说。

### 接下来

第 6 步把 logits 变成一个 token。

## 第 6 步 · Sampler：logits 变 token

> **一句话：** 每个 request 用自己的采样参数从 128,256 个 logits 里挑出一个 id；我们的是 12366，`" Paris"`。

### 图上是什么

- 中间第五个方框加粗：`Sampler` · logits → token。
- 红色小条回到中间，写着「采样 → 12366」。
- GPU 方框下：「每个 request 做 argmax / 采样」「我们的 Req：12366 → " Paris"」。

### 每个参数做什么

| 参数 | 做什么 |
|---|---|
| temperature $T$ | softmax 前把 logits 除以 $T$；$T<1$ 分布更尖，$T>1$ 更平 |
| top-p $p$ | 按概率从高到低取，加够 $p$ 就停，只在这几个里采样 |
| 惩罚项 | 按已出现过的 token 调低它们的 logits（SGLang 里有 repetition、frequency、presence 等） |
| 贪心 | 所有 request 都是贪心时直接取 argmax，即第 1 章第 4 步的「取最高的」 |

SGLang 默认 temperature 1.0、top-p 1.0，就是按第 1 章第 4 步的原始分布采样。

### 结果

- 整个 batch 一起处理，各用各的参数，每个 request 出一个 id。
- 我们的是 `12366`，第 9 章第 7 步橙线上传的那个 id，解码成 `" Paris"`（前面带空格）。
- 它此刻还在 GPU 显存里；第 7 步把它拷到 CPU 上记账。

### 接下来

第 7 步：记账，发出去，回到循环开头。

## 第 7 步 · process_batch_result：记账、发送

> **一句话：** 每个 Req 追加新 id 并检查是否结束；完成的 Req 把 page 交给 radix tree；一条带所有新 id 的消息发给 detokenizer；然后回到 stage 1。

### 图上是什么

- 中间第六个方框加粗：`process_batch_result` · 追加 · 结束 · 发送。
- 红色小条移进 `running_batch`，写着 `Req a1f3 · +1 token`，旁边红字「← 已加入」。
- `outbox` 青色描边，里面一个青色小块 `ids`。
- `RadixCache` 旁：「完成的 Req 的 page 留在这里」。

### 依次做的事

1. **追加：** 每个 Req 把新 id 放进输出 id；我们的加上第 6 步的 12366。
2. **检查结束：** 这个 id 是 EOS（第 1 章第 10 步，id 128001），或输出到了 max_new_tokens。我们的都不是。
3. **结束的 Req：** page 不直接放回空闲，而是插进 radix tree（第 8 章），之后有相同前缀的 request 能复用，就像第 3 步我们复用了 3 个。
4. **发送：** 一条 `BatchTokenIDOutput`，带本步所有 request 的新 id，进 outbox 发给进程 3（第 9 章第 7 步的橙线）。

### 什么时候进 running_batch

图上在这一步把我们的 Req 画进 `running_batch`。代码里的合并发生在下一圈 `get_next_batch_to_run` 的开头：它把上一步的 prefill batch 并入 `running_batch`（本章正文代码块里 `get_next_batch_to_run` 那一行的注释）。从下一步起，它是 decode request，每步一个新 token。

### 接下来

第 8 步：这六个 stage 各在 CPU 还是 GPU 上跑。

## 第 8 步 · 各 stage 在哪运行

> **一句话：** stage 1–3 和 6 是 CPU 上的 Python，stage 4–5 是 GPU 上的 kernel；在这个循环里两边轮流干活，从不同时。

### 图上是什么

- 六个方框按颜色描边，每个右侧一个小标签 CPU 或 GPU。
- 左边三个括号：
  - 蓝色「计划 · CPU」，括住 stage 1–3：接收、挑选、组张量；GPU 还没有可跑的任务。
  - 橙色「运行 · GPU」，括住 stage 4–5：前向传播和采样；CPU 在等 token。
  - 青色「处理 · CPU」，括住 stage 6：追加、结束、发送；GPU 再次闲置。
- 右列淡掉，因为这一步蓝色表示 CPU 的计划，不是 pool 里的 page。

### 对应前面哪步

| 颜色 | stage | 本章的步 |
|---|---|---|
| 蓝 · 计划 | 1–3 | 第 2–4 步 |
| 橙 · 运行 | 4–5 | 第 5–6 步 |
| 青 · 处理 | 6 | 第 7 步 |

### 为什么轮流

- 计划没做完，GPU 不知道跑什么。
- 处理要用 CPU 上的采样 id，所以得等 GPU 跑完、id 拷回来。
- 结果：每一毫秒的 Python 都加在每一步上，叠在 4.8 ms 前向之外。

### 接下来

第 9 步给三种颜色标上时间，并画出 SGLang 怎么把它们叠起来。

## 第 9 步 · 重叠调度

> **一句话：** kernel 一发起就返回，CPU 可以在 GPU 跑第 t 步时计划 t+1、处理 t−1 的结果；GPU 泳道不再有空隙，一步从 7.1 ms 变成 4.8 ms。

### 图上是什么

- 两行，每行一条 CPU · scheduler 泳道、一条 GPU 泳道，共用 0–20 ms 的时间轴；颜色同第 8 步。
- **上一行，无重叠：** 「计划 1」→「第 1 步」→ 青色结果块，依次重复三遍；每次计划时 GPU 泳道上写着灰色「闲置」。
- **下一行，有重叠：** GPU 泳道的「第 1 步」「第 2 步」「第 3 步」首尾相接；CPU 在第 1 步期间做「计划 2」，在第 2 步期间先做 r1（第 1 步的结果）再做「计划 3」，以此类推。
- 两行图例、一句脚注：CPU 时间为示意；在计划内发起一步的 kernel，假设已用第 11 章的 CUDA graphs。

### 公式

$$
t_{\text{无重叠}} = t_{\text{plan}} + t_{\text{step}} + t_{\text{res}}
$$

$$
t_{\text{重叠}} = \max\!\left(t_{\text{step}},\ t_{\text{plan}} + t_{\text{res}}\right)
$$

| 符号 | 是什么 | 大小 | 从哪来 |
|---|---|---|---|
| $t_{\text{plan}}$ | 计划：stage 1–3 加发起 kernel | 1.5 ms（示意） | 本步 |
| $t_{\text{res}}$ | 结果处理：stage 6 | 0.8 ms（示意） | 本步 |
| $t_{\text{step}}$ | GPU 一步 | 4.78 ms | 第 1 步 |

### 代入图上的数

| 量 | 算式 | 结果 | 图上 |
|---|---|---|---|
| $t_{\text{无重叠}}$ | 1.5 + 4.78 + 0.8 | 7.08 ms | 7.1 ms |
| $t_{\text{plan}} + t_{\text{res}}$ | 1.5 + 0.8 | 2.3 ms | 2.3 ms 的 Python |
| $t_{\text{重叠}}$ | max(4.78, 2.3) | 4.78 ms | 4.8 ms |
| 提速 | 7.08 ÷ 4.78 | 1.48 | 约多 48% token/秒 |

$\max$ 说明了前提：CPU 那 2.3 ms 必须塞进一个 GPU 步。要是 CPU 更慢，瓶颈就换成 CPU。

### 在 SGLang 里

这是 `Scheduler.event_loop_overlap`（`managers/scheduler.py`），默认开启，`--disable-overlap-schedule` 可以关掉。它把每步的结果放进一个队列，发起下一步之后再处理上一步的结果。vLLM v1 把同样的做法叫 async scheduling。

### 接下来

下一行有个漏洞：第 t+1 步的输入是第 t 步采出的 token，而 CPU 计划 t+1 时它还不存在。第 10 步解决它。

## 第 10 步 · 占位符：GPU 上的一格

> **一句话：** CPU 计划 t+1 时在输入里放一个槽位 `buf[7]`；第 t 步的 sampler 把 token 写进去，第 t+1 步的第一个 kernel 读出来，token 不用回 CPU。

### 图上是什么

- 三个方框，从左到右依次出现：
  - 蓝色「CPU · 计划第 t+1 步」：我们 Req 的 decode 输入还不是 token id，而是 `buf[7]`。
  - 橙色「GPU · 第 t 步 · sampler」：为我们的 Req 采出 12366，直接写入 `buf[7] = 12366`。
  - 橙色「GPU · t+1 步 · 首个 kernel」：读 `buf[7]` → 12366，查它的 embedding，该步照常运行。
- 下面一排 12 格：`buf`，GPU 显存里的小缓冲区，每个 request 一个槽位；第 7 格浅橙色，写着 12366。
- 两条说明和一句脚注（SGLang 里的名字）。

### 为什么需要它

第 9 步的下一行里，CPU 在第 t 步还在跑时就计划 t+1。如果等第 t 步的 token 拷回来再计划，每次发起前都要先拷回、先处理，又回到了上一行。

### 顺序为什么对

GPU 按发起顺序执行 kernel。第 t 步的 sampler 先发起，第 t+1 步的首个 kernel 后发起，所以读的时候 `buf[7]` 一定已经写好。

### 在 SGLang 里

| 图上 | SGLang |
|---|---|
| `buf` | `FutureMap.output_tokens_buf`（`managers/overlap_utils.py`） |
| 槽位编号 | 按 request 在 `req_to_token` 里的行号（第 7 章第 7 步的 page table 那张表）索引，所以同一 request 每步都是同一格 |
| t+1 首个 kernel 读取 | `resolve_forward_inputs`：decode 时从这个缓冲区按行号取上一步的 token |

CPU 仍然会拿到一份拷贝，用于第 7 步的记账（追加、查 EOS），但那发生在结果处理阶段，即第 9 步的 r1、r2，比 GPU 晚一步。

### 接下来

第 11 步把本章和前面各章对到 SGLang 的文件上。

## 第 11 步 · 整个网站是一棵文件树

> **一句话：** `python/sglang/srt/` 下的 13 个文件或文件夹，每个标着讲它的章；刚看的循环是 `managers/scheduler.py`。

### 图上是什么

13 行，每行左边是路径，中间是一句说明，右边一个蓝色徽章写着章号：

- `entrypoints/http_server.py`：HTTP 服务器 · 进程 1 · 第 9 章
- `managers/tokenizer_manager.py`：tokenize，持有流 · 第 9 章
- `managers/scheduler.py`：刚看过的循环 · 第 6、9、10 章（本章全部）
- `managers/schedule_batch.py`：Req 和 ScheduleBatch · 第 10 章（本章第 2–4 步）
- `managers/schedule_policy.py`：FCFS、LPM、chunk 上限 · 第 6、8 章（本章第 3 步）
- `managers/detokenizer_manager.py`：ids → 文本 · 进程 3 · 第 9 章（本章第 7 步的收件方）
- `mem_cache/memory_pool.py`：KV page 和 page table · 第 7 章（本章第 3、4 步）
- `mem_cache/radix_cache.py`：radix tree · 第 8 章（本章第 3、7 步）
- `model_executor/model_runner.py`：前向传播 · 第 4、10 章（本章第 5 步）
- `model_executor/runner/decode_cuda_graph_runner.py`：上千 kernel 一次发起 · 第 11 章
- `layers/attention/`：分页 attention kernel · 第 2、3 章（本章第 5 步）
- `layers/sampler.py`：logits → token · 第 10 章（本章第 6 步）
- `disaggregation/`：prefill 与 decode 分离 · 第 28 章

- 脚注：到目前为止每章都是一个文件；其余部分讲模型放不进一块 GPU、一台机器时这些文件怎么办。
- 这些路径都在 SGLang 主仓库当前版本里核对过存在。

### 两行指向后面

- **`decode_cuda_graph_runner.py`，第 11 章：** 第 5 步的一次前向要发起上千个 kernel；第 9 步的脚注假设发起它们很便宜，第 11 章说怎么做到。
- **`disaggregation/`，第 28 章：** prefill 和 decode 放到不同 GPU 上跑。

### 接下来

第 11 章：model runner 怎么把上千个 kernel 一次发起。
