<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import * as N from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type Node = { title: string; titleZh: string; result: string; resultZh: string; body: string; bodyZh: string; tone: Tone; bar?: number; compact?: boolean; dashed?: boolean };
  type Line = { en: string; zh: string };
  type MobileText = { title: string; titleZh: string; subtitle: string; subtitleZh: string; foot: string; footZh: string; legend: string; legendZh: string; formulas?: Line[] };
  type Step = { caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string; foot: string; footZh: string; legend: string; legendZh: string; nodes: Node[]; formulas: Line[]; flow?: boolean; desktopH?: number; mobile?: MobileText };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: 'The target changes during RL. Online draft training reaches 1,667 tokens/s versus 1,464 frozen.',
    captionZh: 'RL 会更新 target，draft 也跟着学。在线版 1667 token/s，冻结版 1464。',
    title: 'Train the draft as the target changes', titleZh: 'target 改变时，draft 也学习',
    subtitle: 'online draft training = the draft learns from each RL batch', subtitleZh: '在线训练 = draft 也从每批 RL 数据学习',
    foot: 'Reported MiMo-7B-RL on an H200 cluster; not a local benchmark or whole-round speedup.',
    footZh: '文章报告的 MiMo-7B-RL H200 集群实验；不是本地实测或整轮加速。',
    legend: 'Orange = frozen draft · blue = online draft · bars share one scale', legendZh: '橙 = 冻结 draft · 蓝 = 在线 draft · 柱使用同一比例',
    nodes: [
      { title: 'FROZEN DRAFT', titleZh: '冻结 DRAFT', result: `${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} tokens/s`, resultZh: `${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} token/s`, body: 'MTP layer stays frozen', bodyZh: 'MTP 层保持冻结', tone: 'orange', bar: N.SPEC_FROZEN_ROLLOUT_TOKENS_S / N.SPEC_ONLINE_ROLLOUT_TOKENS_S },
      { title: 'ONLINE DRAFT', titleZh: '在线 DRAFT', result: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} tokens/s`, resultZh: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} token/s`, body: 'MTP layer updates too', bodyZh: 'MTP 层也更新', tone: 'blue', bar: 1 },
    ],
    formulas: [
      { en: 'RL round 1 → round 2: target weights change', zh: 'RL 第 1 轮 → 第 2 轮：target 权重改变' },
      { en: 'both: main RL updates target + shared tables', zh: '两种配置：主 RL 都更新 target 和共享表' },
      { en: 'Learning SGLang Ch. 15 Step 3: draft guesses; target verifies', zh: '第 1 本第 15 章第 3 步：draft 猜，target 验证' },
      { en: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} − ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} = ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S - N.SPEC_FROZEN_ROLLOUT_TOKENS_S} more tokens/s`, zh: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} − ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} = 每秒多 ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S - N.SPEC_FROZEN_ROLLOUT_TOKENS_S} token` },
      { en: `gain = ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_ONLINE_OVER_FROZEN * 100).toFixed(1)}%`, zh: `提升 = ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_ONLINE_OVER_FROZEN * 100).toFixed(1)}%` },
      { en: 'How can the draft learn the target’s next tokens?', zh: 'draft 怎样学习 target 的后续 token？' },
    ],
    mobile: {
      title: 'Train the draft too', titleZh: 'draft 也学习',
      subtitle: 'online training = draft learns during RL', subtitleZh: '在线训练 = draft 在 RL 中学习',
      foot: 'Reported H200 result; not a whole-round speedup.', footZh: '文章报告的 H200 结果；不是整轮加速。',
      legend: 'Orange = frozen · blue = online · one scale', legendZh: '橙 = 冻结 · 蓝 = 在线 · 同一比例',
      formulas: [
        { en: 'RL changes target weights', zh: 'RL 会改变 target 权重' },
        { en: 'Both: main RL updates shared target tables', zh: '两种配置：主 RL 都更新 target 共享表' },
        { en: 'Learning SGLang Ch. 15 Step 3', zh: '第 1 本第 15 章第 3 步' },
        { en: '1667 − 1464 = 203 more tokens/s', zh: '1667 − 1464 = 每秒多 203 token' },
        { en: '1667 ÷ 1464 − 1 = 13.9%', zh: '1667 ÷ 1464 − 1 = 13.9%' },
        { en: 'How does the draft learn?', zh: 'draft 怎样学习？' },
      ],
    },
  }, {
    caption: 'Each position has one hidden state. It holds the target’s internal notes at that position.',
    captionZh: '每个位置都有一个 hidden state。它是 target 的内部笔记。',
    title: 'The target leaves notes at every token', titleZh: 'target 在每个 token 位置留下笔记',
    subtitle: 'hidden state = computed notes at one token position', subtitleZh: 'hidden state = 一个 token 位置算出的内部笔记',
    foot: 'The five letters are example tokens; h(a) is computed notes, not another token.',
    footZh: '五个字母是示例 token；h(a) 是算出的笔记，不是新 token。',
    legend: 'Orange = target tokens and compute · blue = hidden states', legendZh: '橙 = target 的 token 和计算 · 蓝 = hidden state',
    flow: true,
    nodes: [
      { title: 'TARGET TOKENS', titleZh: 'TARGET 的 TOKEN', result: '[a, b, c, d, e]', resultZh: '[a, b, c, d, e]', body: 'one example sequence', bodyZh: '一条示例序列', tone: 'orange', compact: true },
      { title: 'TARGET FORWARD', titleZh: 'TARGET 前向', result: 'reads all five positions', resultZh: '读取全部五个位置', body: 'the usual model pass', bodyZh: '平常的模型计算', tone: 'orange', compact: true },
      { title: 'HIDDEN STATES', titleZh: 'HIDDEN STATE', result: '[h(a), h(b), …]', resultZh: '[h(a), h(b), …]', body: 'one note per position', bodyZh: '每个位置一份笔记', tone: 'blue', compact: true },
    ],
    formulas: [
      { en: 'h(a) = target notes after processing position a', zh: 'h(a) = target 处理位置 a 后留下的笔记' },
      { en: 'each h contains numbers computed by the target', zh: '每个 h 都装着 target 算出的数' },
      { en: 'Learning SGLang Ch. 15 Step 5: hidden states feed a drafter', zh: '第 1 本第 15 章第 5 步：hidden state 可交给 draft' },
      { en: 'Next: which token clue joins h(a)?', zh: '下一步：哪个 token 线索与 h(a) 合并？' },
    ],
    mobile: {
      title: 'Target notes at each token', titleZh: '每个 token 位置的笔记',
      subtitle: 'hidden state = notes at one position', subtitleZh: 'hidden state = 一个位置的内部笔记',
      foot: 'Letters are tokens; h(a) is computed notes.', footZh: '字母是 token；h(a) 是算出的笔记。',
      legend: 'Orange = target · blue = hidden states', legendZh: '橙 = target · 蓝 = hidden state',
      formulas: [
        { en: 'h(a) = notes for position a', zh: 'h(a) = 位置 a 的笔记' },
        { en: 'Each h holds computed numbers', zh: '每个 h 都装着算出的数' },
        { en: 'Learning SGLang Ch. 15 Step 5 uses them', zh: '第 1 本第 15 章第 5 步用过它们' },
        { en: 'Next: add a token clue', zh: '下一步：加入 token 线索' },
      ],
    },
  }, {
    caption: 'Shift the tokens left once. h(a) and e(b) form the input for predicting c.',
    captionZh: 'token 序列先左移一格。h(a) 与 e(b) 合并后预测 c。',
    title: 'Pair target notes with the next token', titleZh: '把 target 笔记与下一个 token 配对',
    subtitle: 'embedding = the model’s number list for a token', subtitleZh: 'embedding = 模型给一个 token 的数列',
    foot: 'join puts two number lists side by side · — means no token.',
    footZh: 'join 把两组数并排摆放 · — 表示没有 token。',
    legend: 'Orange = token lists · blue = embeddings and prediction task', legendZh: '橙 = token 序列 · 蓝 = embedding 与预测任务',
    flow: true,
    nodes: [
      { title: 'TOKENS', titleZh: 'TOKEN 序列', result: '[a, b, c, d, e]', resultZh: '[a, b, c, d, e]', body: 'the same five positions', bodyZh: '同样的五个位置', tone: 'orange', compact: true },
      { title: 'SHIFT LEFT ONCE', titleZh: '左移一格', result: '[b, c, d, e, —]', resultZh: '[b, c, d, e, —]', body: 'next token here', bodyZh: '这里看下一个 token', tone: 'orange', compact: true },
      { title: 'EMBEDDING', titleZh: 'EMBEDDING', result: '[e(b), e(c), …]', resultZh: '[e(b), e(c), …]', body: 'IDs to model numbers', bodyZh: '编号变成模型用的数', tone: 'blue', compact: true },
      { title: 'PREDICTION TASK', titleZh: '预测任务', result: 'predict c', resultZh: '预测 c', body: 'join h(a) with e(b)', bodyZh: '合并 h(a) 与 e(b)', tone: 'blue', compact: true },
    ],
    formulas: [
      { en: 'at position a: the next token is b', zh: '在位置 a：下一个 token 是 b' },
      { en: 'e(b) = embedding of token b', zh: 'e(b) = token b 的 embedding' },
      { en: 'join(h(a), e(b)) → predict c', zh: 'join(h(a), e(b)) → 预测 c' },
      { en: 'b is given; c is the next token to guess', zh: 'b 已交给 draft；c 才是要猜的下一个 token' },
      { en: 'c is two positions after a', zh: 'c 在 a 后面第二个位置' },
    ],
    mobile: {
      title: 'Pair notes with the next token', titleZh: '笔记与下一个 token 配对',
      subtitle: 'embedding = a token’s model number list', subtitleZh: 'embedding = 模型给一个 token 的数列',
      foot: 'join puts two number lists together · — = no token.', footZh: 'join 把两组数并排摆放 · — 表示没有 token。',
      legend: 'Orange = tokens · blue = embeddings and task', legendZh: '橙 = token · 蓝 = embedding 与任务',
      formulas: [
        { en: 'At a: the next token is b', zh: '位置 a 的下一个是 b' },
        { en: 'e(b) = embedding of b', zh: 'e(b) = b 的 embedding' },
        { en: 'join(h(a), e(b)) → predict c', zh: 'join(h(a), e(b)) → 预测 c' },
        { en: 'b is given; c is the next to guess', zh: 'b 已给出；c 才是要猜的下一个' },
        { en: 'c is two positions after a', zh: 'c 在 a 后面第二个位置' },
      ],
    },
  }, {
    caption: 'A second left shift makes labels [c,d,e,—,—]. CE penalizes low scores for those labels.',
    captionZh: '再左移一次就得到训练标签。CE 惩罚正确 token 得分太低。',
    title: 'The second shift makes training labels', titleZh: '第二次左移生成训练标签',
    subtitle: 'cross entropy (CE) = a penalty for scoring the right token too low', subtitleZh: 'cross entropy（CE）= 正确 token 得分太低就扣分',
    foot: 'Dashes have no label to score; lower CE means a better match to the labels.',
    footZh: '横线位置没有标签可评分；CE 越低，预测越符合标签。',
    legend: 'Orange = shifted tokens and labels · blue = draft scores and CE', legendZh: '橙 = 移位 token 与标签 · 蓝 = draft 分数与 CE',
    nodes: [
      { title: 'SHIFT ONCE', titleZh: '左移一次', result: '[b, c, d, e, —]', resultZh: '[b, c, d, e, —]', body: 'Step 3’s tokens', bodyZh: '第 3 步的序列', tone: 'orange', compact: true },
      { title: 'SHIFT TWICE', titleZh: '左移两次', result: '[c, d, e, —, —]', resultZh: '[c, d, e, —, —]', body: 'training labels', bodyZh: '训练标签', tone: 'orange', compact: true },
      { title: 'DRAFT SCORES', titleZh: 'DRAFT 分数', result: 'one row per position', resultZh: '每个位置一行', body: 'two-ahead candidates', bodyZh: '后面第二个位置的候选 token', tone: 'blue', compact: true },
      { title: 'CE LOSS', titleZh: 'CE 损失', result: 'smaller is better', resultZh: '越小越好', body: 'compare scores + labels', bodyZh: '比较分数与标签', tone: 'blue', compact: true },
    ],
    formulas: [
      { en: 'position a: label c · two positions ahead', zh: '位置 a：标签是后面第二个位置的 c' },
      { en: 'labels + draft scores → CE loss', zh: '标签 + draft 分数 → CE 损失' },
      { en: 'higher scores for correct tokens make CE smaller', zh: '正确 token 得分越高，CE 越小' },
      { en: 'CE compares each prediction with its own label', zh: 'CE 比较每个预测与对应标签' },
      { en: 'Next: how can CE teach only the draft?', zh: '下一步：CE 怎样只训练 draft？' },
    ],
    mobile: {
      title: 'The second shift makes labels', titleZh: '第二次左移生成标签',
      subtitle: 'CE = penalty for a low correct-token score', subtitleZh: 'CE = 正确 token 得分低就扣分',
      foot: 'Dashes have no labels; lower CE is better.', footZh: '横线没有标签；CE 越小越好。',
      legend: 'Orange = labels · blue = scores and CE', legendZh: '橙 = 标签 · 蓝 = 分数与 CE',
      formulas: [
        { en: 'At a: label c, two ahead', zh: '位置 a：标签是后面第二个位置的 c' },
        { en: 'labels + scores → CE', zh: '标签 + 分数 → CE' },
        { en: 'Higher correct scores lower CE', zh: '正确得分越高，CE 越小' },
        { en: 'CE compares predictions with labels', zh: 'CE 比较预测与标签' },
        { en: 'Next: teach only the draft', zh: '下一步：只训练 draft' },
      ],
    },
  }, {
    caption: 'Detach keeps values but stops weight-change instructions. Main RL learning still updates the target.',
    captionZh: 'detach 保留数值，挡住调整权重的信号。主 RL 学习仍更新 target。',
    title: 'Detach keeps the draft lesson on the draft', titleZh: 'detach 把 draft 的课程留在 draft',
    subtitle: 'gradient = weight-change instructions · detach stops them on this branch', subtitleZh: 'gradient = 调整权重的信号 · detach 在这条分支挡住它们',
    foot: 'Only this CE path is stopped; draft weights can still learn.',
    footZh: '这里只挡这条 CE 路径；draft 权重仍能学习。',
    legend: 'Blue = trainable draft · orange dashed = detached target', legendZh: '蓝 = 可训练的 draft · 橙色虚线 = detach 的 target',
    nodes: [
      { title: 'DRAFT CE', titleZh: 'DRAFT 的 CE', result: 'extra draft lesson', resultZh: '额外的 draft 课程', body: 'from Step 4', bodyZh: '来自第 4 步', tone: 'blue', compact: true },
      { title: 'DRAFT LAYER', titleZh: 'DRAFT 层', result: 'instructions pass', resultZh: '调整权重的信号通过', body: 'weights can learn', bodyZh: '权重可以学习', tone: 'blue', compact: true },
      { title: 'TARGET’S MAIN LAYERS', titleZh: 'TARGET 的主要层', result: 'detach', resultZh: 'detach', body: 'CE instructions stop', bodyZh: 'CE 的调整权重的信号停下', tone: 'orange', compact: true, dashed: true },
    ],
    formulas: [
      { en: 'CE → draft: weight-change instructions pass', zh: 'CE → draft：调整权重的信号通过' },
      { en: 'CE ✕→ target’s main layers', zh: 'CE ✕→ target 的主要层' },
      { en: 'dashed = detached', zh: '虚线 = 已 detach' },
      { en: 'main RL learning still updates the target', zh: '主 RL 学习仍更新 target' },
    ],
    mobile: {
      title: 'Keep the lesson on the draft', titleZh: '把课程留在 draft',
      subtitle: 'gradient = weight-change instructions', subtitleZh: 'gradient = 调整权重的信号',
      foot: 'Only this CE path stops; the draft still learns.', footZh: '只挡这条 CE 路径；draft 仍会学习。',
      legend: 'Blue = draft · orange dashed = detached target', legendZh: '蓝 = draft · 橙色虚线 = detach 的 target',
      formulas: [
      { en: 'CE → draft: instructions pass', zh: 'CE → draft：调整权重的信号通过' },
      { en: 'CE ✕→ target’s main layers', zh: 'CE ✕→ target 的主要层' },
      { en: 'dashed = detached', zh: '虚线 = 已 detach' },
      { en: 'Main RL learning still updates target', zh: '主 RL 学习仍更新 target' },
      ],
    },
  }, {
    caption: 'Shift the loss mask twice and multiply. Two valid future tokens keep a position.',
    captionZh: 'loss mask 左移两次后相乘。两个后续 token 都有效才计分。',
    title: 'Count only positions with two valid future tokens', titleZh: '只有两个后续 token 都有效才计分',
    subtitle: 'main-loss mask: 1 marks a valid token; 0 skips that token', subtitleZh: '主损失 mask：1 表示 token 有效，0 跳过该 token',
    foot: 'This only selects positions; it does not show how their CE values are averaged.',
    footZh: '这里只选择位置，不展示这些位置的 CE 怎样求平均。',
    legend: 'Orange = original and shifted masks · blue = kept for draft CE', legendZh: '橙 = 原始与移位 mask · 蓝 = 保留给 draft CE',
    flow: true,
    nodes: [
      { title: 'ORIGINAL MASK', titleZh: '原始 MASK', result: `[${N.SPEC_EXAMPLE_MASK.join(', ')}]`, resultZh: `[${N.SPEC_EXAMPLE_MASK.join(', ')}]`, body: 'constructed example', bodyZh: '构造示例', tone: 'orange', compact: true },
      { title: 'SHIFT ONCE', titleZh: '左移一次', result: `[${N.SPEC_MASK_SHIFT_ONCE.join(', ')}]`, resultZh: `[${N.SPEC_MASK_SHIFT_ONCE.join(', ')}]`, body: 'next token', bodyZh: '下一个 token', tone: 'orange', compact: true },
      { title: 'SHIFT TWICE', titleZh: '左移两次', result: `[${N.SPEC_MASK_SHIFT_TWICE.join(', ')}]`, resultZh: `[${N.SPEC_MASK_SHIFT_TWICE.join(', ')}]`, body: 'token after next', bodyZh: '再下一个 token', tone: 'orange', compact: true },
      { title: 'KEEP FOR CE', titleZh: '保留计分', result: `[${N.SPEC_MTP_MASK.join(', ')}]`, resultZh: `[${N.SPEC_MTP_MASK.join(', ')}]`, body: 'both must be 1', bodyZh: '两个都必须是 1', tone: 'blue', compact: true },
    ],
    formulas: [
      { en: 'keep = shift once × shift twice', zh: '保留 = 左移一次 × 左移两次' },
      { en: 'second position: 1 × 1 = 1 · original mask is 0', zh: '第二个位置：1 × 1 = 1 · 原始 mask 是 0' },
      { en: 't+1 supplies the input token; t+2 supplies the label', zh: 't+1 提供输入 token；t+2 提供标签' },
      { en: '1 counts for draft CE · 0 leaves it out', zh: '1 计入 draft CE · 0 跳过' },
      { en: 'Next: does faster rollout outweigh extra training?', zh: '下一步：rollout 加速能盖住额外训练吗？' },
    ],
    mobile: {
      title: 'Keep two valid future tokens', titleZh: '两个后续 token 都有效才计分',
      subtitle: 'main-loss mask: 1 valid; 0 skips that token', subtitleZh: '主损失 mask：1 有效，0 跳过该 token',
      foot: 'This selects positions, not how CE is averaged.', footZh: '只选择位置，不展示 CE 怎样求平均。',
      legend: 'Orange = original and shifted masks · blue = kept', legendZh: '橙 = 原始与移位 mask · 蓝 = 保留计分',
      formulas: [
        { en: 'keep = shift once × shift twice', zh: '保留 = 左移一次 × 左移两次' },
        { en: 'Second position: 1 × 1 = 1', zh: '第二个位置：1 × 1 = 1' },
        { en: 'Its original mask is 0', zh: '它的原始 mask 是 0' },
        { en: 't+1 gives input; t+2 gives the label', zh: 't+1 提供输入；t+2 提供标签' },
        { en: 'Next: compare speed and training cost', zh: '下一步：比较加速与训练成本' },
      ],
    },
  }, {
    caption: 'Online training gives the highest reported rollout throughput. It is 36.8% above no speculation.',
    captionZh: '在线训练的 rollout 吞吐最高。比不用投机高 36.8%。',
    title: 'Compare rollout throughput on one scale', titleZh: '用同一比例比较 rollout 吞吐',
    subtitle: 'same MiMo-7B-RL H200 experiment · tokens generated per second', subtitleZh: '同一 MiMo-7B-RL H200 实验 · 每秒生成 token 数',
    foot: 'Reported table; no whole-round time or exact tokens-per-target-pass values.',
    footZh: '文章汇总表；没有整轮时间或每次 target 计算接收的精确 token 数。',
    legend: 'Grey = no spec · orange = frozen · blue = online · one scale', legendZh: '灰 = 不用投机 · 橙 = 冻结 · 蓝 = 在线 · 同一比例',
    nodes: [
      { title: 'NO SPEC', titleZh: '不用投机', result: `${N.SPEC_NO_SPEC_ROLLOUT_TOKENS_S} tokens/s`, resultZh: `${N.SPEC_NO_SPEC_ROLLOUT_TOKENS_S} token/s`, body: 'target decodes normally', bodyZh: 'target 平常 decode', tone: 'plain', bar: N.SPEC_NO_SPEC_ROLLOUT_TOKENS_S / N.SPEC_ONLINE_ROLLOUT_TOKENS_S, compact: true },
      { title: 'FROZEN SPEC', titleZh: '冻结投机', result: `${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} tokens/s`, resultZh: `${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} token/s`, body: 'no auxiliary CE on MTP', bodyZh: 'MTP 层不受辅助 CE 训练', tone: 'orange', bar: N.SPEC_FROZEN_ROLLOUT_TOKENS_S / N.SPEC_ONLINE_ROLLOUT_TOKENS_S, compact: true },
      { title: 'ONLINE SPEC', titleZh: '在线投机', result: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} tokens/s`, resultZh: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} token/s`, body: 'auxiliary CE trains MTP', bodyZh: '辅助 CE 训练 MTP 层', tone: 'blue', bar: 1, compact: true },
    ],
    formulas: [
      { en: `frozen vs no: ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_NO_SPEC_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_FROZEN_OVER_NO_SPEC * 100).toFixed(1)}%`, zh: `冻结对不用：${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_NO_SPEC_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_FROZEN_OVER_NO_SPEC * 100).toFixed(1)}%` },
      { en: `online vs frozen: ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_ONLINE_OVER_FROZEN * 100).toFixed(1)}%`, zh: `在线对冻结：${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_ONLINE_OVER_FROZEN * 100).toFixed(1)}%` },
      { en: `online vs no: ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_NO_SPEC_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_ONLINE_OVER_NO_SPEC * 100).toFixed(1)}%`, zh: `在线对不用：${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_NO_SPEC_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_ONLINE_OVER_NO_SPEC * 100).toFixed(1)}%` },
      { en: 'target drift can widen the draft–target probability gap', zh: 'target 漂移可能扩大 draft 与 target 的概率差距' },
      { en: 'accepts can fall · online MTP training follows the target', zh: '接受数可能下降 · 在线 MTP 训练跟随 target' },
      { en: 'reported online: accept length ↑ and MTP loss ↓', zh: '在线实验报告：accept length ↑、MTP loss ↓' },
      { en: 'Learning SGLang Ch. 15 Step 8: more accepted tokens per target pass can raise throughput', zh: '第 1 本第 15 章第 8 步：每次 target 计算接受更多 token 可提高吞吐' },
      { en: 'Next: what training time does online learning add?', zh: '下一步：在线学习增加多少训练时间？' },
    ],
    mobile: {
      title: 'Rollout throughput, one scale', titleZh: '同一比例比较 rollout 吞吐',
      subtitle: 'Same H200 test · generated tokens/s', subtitleZh: '同一 H200 实验 · 每秒生成 token',
      foot: 'Reported table; no whole-round or exact per-pass counts.', footZh: '文章汇总表；没有整轮或每次计算的精确接收数。',
      legend: 'Grey = none · orange = frozen · blue = online', legendZh: '灰 = 不用 · 橙 = 冻结 · 蓝 = 在线',
      formulas: [
        { en: 'Frozen vs no: 20.1%', zh: '冻结对不用：20.1%' },
        { en: 'Online vs frozen: 13.9%', zh: '在线对冻结：13.9%' },
        { en: 'Online vs no: 36.8%', zh: '在线对不用：36.8%' },
        { en: 'target drift can widen the probability gap', zh: 'target 漂移可能扩大概率差距' },
        { en: 'accepts can fall · online MTP follows target', zh: '接受数可能下降 · 在线 MTP 跟随 target' },
        { en: 'reported online: accept length ↑, MTP loss ↓', zh: '在线实验：accept length ↑、MTP loss ↓' },
        { en: 'Ch. 15 Step 8: accepts share target-pass cost', zh: '第 15 章第 8 步：接受 token 分摊 target 计算成本' },
        { en: 'Next: the training-time cost', zh: '下一步：训练时间成本' },
      ],
    },
  }, {
    caption: 'The reported training metric is 7 seconds higher online. Its measurement window is unspecified.',
    captionZh: '报告的训练指标在线版高 7 秒。原文没说测量窗口。',
    title: 'The online draft’s reported metric is 7 seconds higher', titleZh: '在线 draft 的报告指标高 7 秒',
    subtitle: 'reported training metric in seconds · measurement window unspecified', subtitleZh: '报告的训练指标，单位为秒 · 测量窗口未说明',
    foot: 'Window unspecified; this is not a full RL-round timeline.',
    footZh: '测量窗口未说明；这不是完整 RL 轮次时间线。',
    legend: 'Grey = no spec · orange = frozen · blue = online · one scale', legendZh: '灰 = 不用投机 · 橙 = 冻结 · 蓝 = 在线 · 同一比例',
    nodes: [
      { title: 'NO SPEC', titleZh: '不用投机', result: `${N.SPEC_NO_SPEC_TRAIN_S} s`, resultZh: `${N.SPEC_NO_SPEC_TRAIN_S} 秒`, body: 'no draft training', bodyZh: '不训练 draft', tone: 'plain', bar: N.SPEC_NO_SPEC_TRAIN_S / N.SPEC_ONLINE_TRAIN_S, compact: true },
      { title: 'FROZEN SPEC', titleZh: '冻结投机', result: `${N.SPEC_FROZEN_TRAIN_S} s`, resultZh: `${N.SPEC_FROZEN_TRAIN_S} 秒`, body: 'no auxiliary CE on MTP', bodyZh: 'MTP 层不受辅助 CE 训练', tone: 'orange', bar: N.SPEC_FROZEN_TRAIN_S / N.SPEC_ONLINE_TRAIN_S, compact: true },
      { title: 'ONLINE SPEC', titleZh: '在线投机', result: `${N.SPEC_ONLINE_TRAIN_S} s`, resultZh: `${N.SPEC_ONLINE_TRAIN_S} 秒`, body: 'draft learns too', bodyZh: 'draft 也学习', tone: 'blue', bar: 1, compact: true },
    ],
    formulas: [
      { en: `online − no: ${N.SPEC_ONLINE_TRAIN_S} − ${N.SPEC_NO_SPEC_TRAIN_S} = ${N.SPEC_ONLINE_EXTRA_TRAIN_S} s`, zh: `在线 − 不用：${N.SPEC_ONLINE_TRAIN_S} − ${N.SPEC_NO_SPEC_TRAIN_S} = ${N.SPEC_ONLINE_EXTRA_TRAIN_S} 秒` },
      { en: `online − frozen: ${N.SPEC_ONLINE_TRAIN_S} − ${N.SPEC_FROZEN_TRAIN_S} = ${N.SPEC_ONLINE_EXTRA_FROZEN_TRAIN_S} s`, zh: `在线 − 冻结：${N.SPEC_ONLINE_TRAIN_S} − ${N.SPEC_FROZEN_TRAIN_S} = ${N.SPEC_ONLINE_EXTRA_FROZEN_TRAIN_S} 秒` },
      { en: `training increase: ${N.SPEC_ONLINE_TRAIN_S} ÷ ${N.SPEC_NO_SPEC_TRAIN_S} − 1 = ${(N.SPEC_ONLINE_TRAIN_OVER_NO_SPEC * 100).toFixed(1)}%`, zh: `训练增加：${N.SPEC_ONLINE_TRAIN_S} ÷ ${N.SPEC_NO_SPEC_TRAIN_S} − 1 = ${(N.SPEC_ONLINE_TRAIN_OVER_NO_SPEC * 100).toFixed(1)}%` },
      { en: 'tokens/s and training seconds measure different parts', zh: 'token/s 与训练秒数衡量不同部分' },
      { en: 'Next: model answer → program reply → model answer', zh: '下一章：模型回答 → 程序回复 → 模型回答' },
      { en: 'Which tokens get mask 1, and which pairs teach the draft?', zh: '哪些 token 的 mask 是 1，哪些相邻位置能教 draft？' },
    ],
    mobile: {
      title: 'Reported metric is 7 seconds higher', titleZh: '报告指标高 7 秒',
      subtitle: 'Training metric in seconds · window unspecified', subtitleZh: '训练指标，单位为秒 · 窗口未说明',
      foot: 'Window unspecified; not a full-round timeline.', footZh: '窗口未说明；不是整轮时间线。',
      legend: 'Grey = none · orange = frozen · blue = online', legendZh: '灰 = 不用 · 橙 = 冻结 · 蓝 = 在线',
      formulas: [
        { en: 'Online − no: 148 − 141 = 7 s', zh: '在线 − 不用：148 − 141 = 7 秒' },
        { en: 'Online − frozen: 148 − 143 = 5 s', zh: '在线 − 冻结：148 − 143 = 5 秒' },
        { en: 'Training increase: 5.0%', zh: '训练增加：5.0%' },
        { en: 'Throughput is not whole-round speed', zh: '吞吐不等于整轮速度' },
        { en: 'Next: answer → program reply → answer', zh: '下一章：回答 → 程序回复 → 回答' },
        { en: 'Mask 1 for which tokens? Which pairs teach draft?', zh: '哪些 token 的 mask 是 1？哪些位置教 draft？' },
      ],
    },
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const start = 80;
  const formulas = $derived(phone && cur.mobile?.formulas ? cur.mobile.formulas : cur.formulas);
  const formulaStart = 315;
  const legendY = $derived(phone ? start + cur.nodes.length * 96 + 15 + formulas.length * 27 : formulaStart + (cur.formulas.length - 1) * 29 + 45);
  const H = $derived(phone ? legendY + 55 : Math.max(cur.desktopH ?? 500, legendY + 55));
  const nodeW = (count: number) => count === 2 ? 260 : count === 3 ? 200 : 155;
  const nodeX = (i: number, count: number) => count === 2 ? 65 + i * 330 : count === 3 ? 35 + i * 225 : 25 + i * 175;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs><marker id="rl-spec-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--line)" /></marker></defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobile?.title ?? cur.title, cur.mobile?.titleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobile?.subtitle ?? cur.subtitle, cur.mobile?.subtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.nodes as node, i}
          {@const y = start + i * 96}
          <rect x="25" y={y} width="250" height="80" rx="11" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.dashed ? '5 4' : '0'} />
          <text x="150" y={y + 20} text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x="150" y={y + 43} text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
          <text x="150" y={y + 64} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if node.bar !== undefined}<rect x="35" y={y + 72} width="230" height="5" rx="2" fill="var(--bg)" /><rect x="35" y={y + 72} width={230 * node.bar} height="5" rx="2" fill={stroke(node.tone)} />{/if}
          {#if cur.flow && i < cur.nodes.length - 1}<line x1="150" y1={y + 80} x2="150" y2={y + 92} stroke="var(--line)" stroke-width="2.5" marker-end="url(#rl-spec-arrow)" />{/if}
        {/each}
        {#each formulas as line, i}<text x="150" y={start + cur.nodes.length * 96 + 15 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>{/each}
        <text x="150" y={legendY} text-anchor="middle" class="small">{t(cur.mobile?.legend ?? cur.legend, cur.mobile?.legendZh ?? cur.legendZh)}</text>
      {:else}
        {#each cur.nodes as node, i}
          {@const w = nodeW(cur.nodes.length)}
          {@const x = nodeX(i, cur.nodes.length)}
          <rect x={x} y="105" width={w} height="160" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.dashed ? '5 4' : '0'} />
          <text x={x + w / 2} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={x + w / 2} y="180" text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
          <text x={x + w / 2} y={node.bar === undefined ? 222 : 211} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if node.bar !== undefined}<rect x={x + 10} y="237" width={w - 20} height="10" rx="3" fill="var(--bg)" /><rect x={x + 10} y="237" width={(w - 20) * node.bar} height="10" rx="3" fill={stroke(node.tone)} />{/if}
          {#if cur.flow && i < cur.nodes.length - 1}<line x1={x + w} y1="185" x2={nodeX(i + 1, cur.nodes.length)} y2="185" stroke="var(--line)" stroke-width="2.5" marker-end="url(#rl-spec-arrow)" />{/if}
        {/each}
        {#each cur.formulas as line, i}<text x="360" y={formulaStart + i * 29} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>{/each}
        <text x="360" y={H - 55} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(cur.mobile?.foot ?? cur.foot, cur.mobile?.footZh ?? cur.footZh) : t(cur.foot, cur.footZh)}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label, .small { font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) { .title { font-size: 16px; } .label, .small { font-size: 12px; } .result { font-size: 12px; } }
</style>
