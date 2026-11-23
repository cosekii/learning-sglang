# 每步深入讲解（Deep dive）撰写手册 · 第二版

给 learning-sglang 每一章、每一步 slide 写双语「深入讲解」。第二版把内容从组件里的 HTML 字符串搬到 Markdown，
并要求逐条核实、按固定结构写。**标杆是第 2 章**：`src/deep/02-attention.zh.md` 和 `.en.md`。动笔前先通读它。

## 机制（已建好，照第 2 章接线）

- 内容在 `src/deep/<slug>.zh.md` 和 `src/deep/<slug>.en.md`。**每一步一个 `## ` 小节，按步顺序**，小节数必须等于步数。
  构建时编译（KaTeX、表格都支持），由 `src/deep.ts` 的 `deepFor(slug)` 切成每步一段 HTML。
- MDX 接线（看 `src/pages/ch/02-attention.mdx`）：
  ```mdx
  import { deepFor } from '../../deep';
  export const deep = await deepFor('<slug>');
  <Viz client:load {...neighbors('<slug>')} deep={deep} />
  ```
  MDX 里必须写 `deep={deep}`，不能写 `{deep}`（构建会报错）。
- 组件接线（看 `AttentionStep.svelte`）：`import type { Deep } from '../../deep';`，props 加 `deep?: Deep`，
  删掉内联的 `deepDives` 数组、zip 那一行、`Step` 接口里的 `deep?/deepZh?` 字段，
  StepControls 改传 `deep={deep?.en[step]} deepZh={deep?.zh[step]}`。
- 界面在 `StepControls.svelte`：右侧抽屉，`D` 开关，`Esc` 关闭。不用改。

## 每一步的结构

每步一个 `## ` 标题，下面按这个顺序，没有的部分整节省略（不要写空节、不要硬凑）：

```markdown
## 第 N 步 · 这一步的短标题            （英文：## Step N · Short title）

> **一句话：** 这一步做了什么，一句话。   （英文：> **In one line:** …）

### 图上是什么          （On the stage）     逐个列出图上的元素，用列表；只写图上真有的
### 公式                （Formula）          KaTeX 公式块 $$…$$，紧跟符号表
### 代入图上的数        （The numbers on the stage）  用图上的实际数字把公式算一遍，常用表格
### 为什么 / 背景 等    按需要起名的说明节
### 接下来              （Next）             这一步的结果下一步怎么用，一两句
```

**符号表**是这次改版的核心，列固定为：`| 符号 | 是什么 | 大小 | 从哪来 |`（大小可省）。每个公式里的符号都要进表，
「从哪来」写到具体步：「第 5 步」「第 3 步，$v_j = W_V x_j$」「Ch. 1 Step 4」「`src/numbers.ts` 的 HBM 带宽」「本步」。

## 质量契约（用户亲定，逐条要做到）

1. **每个符号首次出现就定义，并说清从哪一步来。** 用户原话：不确定 `out₅ = Σ wⱼ vⱼ` 里的 `w` 是什么。不能让符号凭空出现。
2. **符号链贯穿全章，跨章也不撞名。** 第 1 章用 $s_t$ 表示词表分数，第 2 章因此把注意力分数叫 $\text{score}_j$。
   新章节动笔前读前一章的 `src/deep/*.zh.md`，沿用已有记号；同一字母不要换意思。
   **结果的来路要接上。** 一步用到的东西如果是前面没展开的过程产生的（例如第 2 章第 8 步的 `␣Paris` 是上一次前向算出来的），
   用几行把来路写出来，并指到具体的章和步。用户读到第 2 章第 8 步时问过「为什么我们知道加进来的是 Paris」。
3. **讲清怎么算。** 公式一定配「代入图上的数」，数字和组件画出来的一致。
4. **深入浅出。** 从读者已经看过的东西出发；行话（SM、warp、kernel、bf16、GQA 等）第一次出现就用一句话解释，
   或指向解释过它的那一步（`Ch. 4 Step 3`）。
5. **结构化、好读。** 多用列表和表格，少用大段文字；一段不超过 4 行；每步通常 150–450 字（中文），公式步可以更长。
6. **平实、无修辞。** 每句都带信息；不要钩子、口号、感叹（本站硬规则，见 AGENTS.md「No rhetoric」）。
7. **双语一致。** 中英两份结构相同、内容相同。中文里技术名词保留英文（token、query、key、value、KV cache、prefill、decode、
   head、layer、softmax、kernel、CUDA graph、scheduler 等）。章节引用：中文「第 3 章第 2 步」，英文「Ch. 3 Step 2」。
8. **紧扣图。** 先读该步的 scene 数据和 SVG markup，「图上是什么」只写画出来的元素；颜色名要对（读 CSS 变量：
   `--gen` 是橙色，`--accent` 是蓝色，不要猜）。

## 核实（这次改版的另一半）

旧版讲解是前几轮 agent 写的，**不要默认它是对的**。搬进 Markdown 时逐条核实：

- **数字：** 每个数字在组件里找到来源（scene 数据、`src/numbers.ts` 常量、组件里的计算），自己重算一遍。
  对不上的以组件为准改讲解；觉得组件本身错了，不要改组件，写进本轮结论让主 session 处理。
- **SGLang / SGLang-Omni 的说法：** 函数名、参数名、默认值、行为，到源码里核对。
  SGLang-Omni 在本机 `~/code/sglang-omni`；SGLang 主仓库没有本地副本，需要时浅克隆到 `/tmp/sglang`
  （`git clone --depth 1 https://github.com/sgl-project/sglang /tmp/sglang`，已存在就 `git -C /tmp/sglang pull`）。
  核实不了的说法删掉或改成不依赖具体实现的说法，不要保留猜测。
- **章节正文：** 读该章 MDX 里的 prose 和组件 caption，讲解不能和它们矛盾。

## 怎么挑下一章

读 `docs/deep-dive-progress.md`，做表里第一个状态不是 `done` 的章节。一次只做一章。

## 做完前必须全过

1. `npm run build` 无错。
2. `node scripts/deep-check.mjs NN` 输出 `ok`（NN 为两位章号）。它检查小节数 == 步数、组件和 MDX 接线、旧数组已删、下标没丢。
3. dev server 在跑（`npx astro dev status`，没跑就 `npx astro dev --background`），
   `node scripts/deep-shot.mjs /tmp/deep-NN zh <slug> <步号...>`，挑 3 步（含公式最多的一步和最后一步）截图，
   **用 Read 打开每张图看**：公式渲染正常、表格不溢出、没有残留 `$`、没有乱码。英文挑 1 步同样看。
4. `ONLY=N node scripts/zh-check.mjs` 输出 ok（确认没碰坏 caption 和图）。

全过后把进度表该章改为 `done`。任何一项没过就不要改 `done`，在结论里如实写哪里没过。

## 约束

- **不改英文原文**：caption、captionZh、prose、SVG 和图内文字、几何，一律不动。只动：该章的组件（仅接线和删旧数组）、
  该章的 MDX（仅接线）、`src/deep/<slug>.*.md`、进度表。
- 不 git commit。不跑 `npm run transcript`。
- 组件本身看起来有错时只报告，不修。
