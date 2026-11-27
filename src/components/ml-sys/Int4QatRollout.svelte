<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import * as N from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type Node = {
    title: string; titleZh: string; result: string; resultZh: string; body: string; bodyZh: string;
    tone: Tone; bar?: number; compact?: boolean; dashed?: boolean;
  };
  type MobileText = {
    title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; legend: string; legendZh: string;
    formulas?: { en: string; zh: string }[];
  };
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; legend: string; legendZh: string;
    nodes: Node[]; formulas: { en: string; zh: string }[]; flow?: boolean;
    compare?: { en: string; zh: string }[]; desktopH?: number; mobile?: MobileText;
  };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: 'INT4 cuts 32 weights from 64 bytes to 16 raw bytes. Rounding can change values.',
    captionZh: '32 个权重从 64 字节减到 16 字节。舍入可能改变数值。',
    title: 'INT4 quarters raw weight bytes', titleZh: 'INT4 把原始权重字节减到四分之一',
    subtitle: 'INT4 = 4 bits per weight · BF16 = 16 bits', subtitleZh: 'INT4 = 每个权重 4 位 · BF16 = 每个权重 16 位',
    foot: 'Constructed group; raw payload excludes other storage and runtime memory.',
    footZh: '构造的一组权重；原始负载不含其他存储和运行显存。',
    legend: 'Orange = BF16 · blue = raw INT4 · bars use one scale', legendZh: '橙 = BF16 · 蓝 = 原始 INT4 · 柱使用同一比例',
    flow: true,
    nodes: [
      { title: 'BF16 WEIGHTS', titleZh: 'BF16 权重', result: `${N.INT4_GROUP_BF16_BYTES} B`, resultZh: `${N.INT4_GROUP_BF16_BYTES} 字节`, body: `${N.INT4_GROUP_SIZE} values × 2 B`, bodyZh: `${N.INT4_GROUP_SIZE} 个数 × 2 字节`, tone: 'orange', bar: 1 },
      { title: 'RAW INT4', titleZh: '原始 INT4', result: `${N.INT4_GROUP_PACKED_BYTES} B`, resultZh: `${N.INT4_GROUP_PACKED_BYTES} 字节`, body: `${N.INT4_GROUP_SIZE} values × 0.5 B`, bodyZh: `${N.INT4_GROUP_SIZE} 个数 × 0.5 字节`, tone: 'blue', bar: N.INT4_GROUP_PACKED_BYTES / N.INT4_GROUP_BF16_BYTES },
    ],
    formulas: [
      { en: `${N.INT4_GROUP_SIZE} × 2 B = ${N.INT4_GROUP_BF16_BYTES} B · ${N.INT4_GROUP_SIZE} × 0.5 B = ${N.INT4_GROUP_PACKED_BYTES} B`, zh: `${N.INT4_GROUP_SIZE} × 2 字节 = ${N.INT4_GROUP_BF16_BYTES} 字节 · ${N.INT4_GROUP_SIZE} × 0.5 字节 = ${N.INT4_GROUP_PACKED_BYTES} 字节` },
      { en: `${N.INT4_GROUP_BF16_BYTES} − ${N.INT4_GROUP_PACKED_BYTES} = ${N.INT4_GROUP_SAVED_BYTES} B saved`, zh: `${N.INT4_GROUP_BF16_BYTES} − ${N.INT4_GROUP_PACKED_BYTES} = 省下 ${N.INT4_GROUP_SAVED_BYTES} 字节` },
      { en: `${N.INT4_GROUP_SAVED_BYTES} ÷ ${N.INT4_GROUP_BF16_BYTES} = 75% less raw payload`, zh: `${N.INT4_GROUP_SAVED_BYTES} ÷ ${N.INT4_GROUP_BF16_BYTES} = 原始负载少 75%` },
      { en: '4 bits give 2^4 = 16 choices; values use the nearest', zh: '4 位只有 2^4 = 16 种选择，数值使用最近的一种' },
      { en: 'Each choice is one value the format can represent', zh: '每种选择对应一种能表示的数值' },
      { en: 'How can training adapt to rounding?', zh: '训练怎样适应舍入？' },
    ],
    mobile: {
      title: 'INT4 quarters raw weight bytes', titleZh: 'INT4 把原始权重字节减到四分之一',
      subtitle: 'INT4 = 4 bits · BF16 = 16 bits', subtitleZh: 'INT4 = 4 位 · BF16 = 16 位',
      foot: 'Constructed raw payload; other storage is excluded.', footZh: '构造的原始负载；其他存储不计入。',
      legend: 'Orange = BF16 · blue = raw INT4 · shared scale', legendZh: '橙 = BF16 · 蓝 = 原始 INT4 · 同一比例',
      formulas: [
        { en: '32 × 2 B = 64 B', zh: '32 × 2 字节 = 64 字节' },
        { en: '32 × 0.5 B = 16 B', zh: '32 × 0.5 字节 = 16 字节' },
        { en: '64 − 16 = 48 B saved', zh: '64 − 16 = 省下 48 字节' },
        { en: '48 ÷ 64 = 75% less raw payload', zh: '48 ÷ 64 = 原始负载少 75%' },
        { en: '4 bits give 2^4 = 16 choices; use the nearest', zh: '4 位只有 2^4 = 16 种选择，使用最近的一种' },
        { en: 'Each choice represents one value', zh: '每种选择对应一个数值' },
        { en: 'How can training adapt?', zh: '训练怎样适应舍入？' },
      ],
    },
  }, {
    caption: 'One group shares a scale, its largest magnitude divided by 7. Rounding changes 0.35 to 0.40.',
    captionZh: '一组权重共用一个 scale。0.35 舍入后还原为 0.40。',
    title: 'One scale fits 32 weights onto integer levels', titleZh: '一个 scale 把 32 个权重放到整数等级上',
    subtitle: 'scale = one shared divisor for a group', subtitleZh: 'scale = 一组权重共用的除数',
    foot: 'Decimals are rounded for display; all 32 values have |x| ≤ 0.70.',
    footZh: '小数为展示而舍入；全组 32 个数都满足 |x| ≤ 0.70。',
    legend: 'Orange = BF16 · blue = integer codes · grey = scale', legendZh: '橙 = BF16 · 蓝 = 整数编码 · 灰 = scale',
    flow: true,
    nodes: [
      { title: 'ORIGINAL BF16', titleZh: '原始 BF16', result: '[0.10, 0.35, 0.70]', resultZh: '[0.10, 0.35, 0.70]', body: 'three values shown', bodyZh: '画出三个数', tone: 'orange', compact: true },
      { title: 'SHARED SCALE', titleZh: '共用 SCALE', result: '0.70 ÷ 7 = 0.10', resultZh: '0.70 ÷ 7 = 0.10', body: 'full group’s largest |value|', bodyZh: '全组最大绝对值 ÷ 7', tone: 'plain', compact: true },
      { title: 'INT4 CODES', titleZh: 'INT4 编码', result: '[1, 4, 7]', resultZh: '[1, 4, 7]', body: 'rounded integers', bodyZh: '舍入后的整数', tone: 'blue', compact: true },
      { title: 'RESTORED BF16', titleZh: '还原 BF16', result: '[0.10, 0.40, 0.70]', resultZh: '[0.10, 0.40, 0.70]', body: 'code × scale', bodyZh: '编码 × scale', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'scale = max(|0.10|, |0.35|, |0.70|) ÷ 7 = 0.10', zh: 'scale = max(|0.10|, |0.35|, |0.70|) ÷ 7 = 0.10' },
      { en: '0.35 ÷ 0.10 = 3.5 → round to 4', zh: '0.35 ÷ 0.10 = 3.5 → 舍入为 4' },
      { en: '4 × 0.10 = 0.40', zh: '4 × 0.10 = 0.40' },
      { en: 'absolute error = |0.35 − 0.40| = 0.05', zh: '绝对误差 = |0.35 − 0.40| = 0.05' },
      { en: 'This rule uses codes −7…7 · 7 is its positive limit', zh: '这条规则用 −7…7 编码 · 7 是正向上限' },
    ],
    mobile: {
      title: 'One scale fits 32 weights', titleZh: '一个 scale 对齐 32 个权重',
      subtitle: 'scale = shared divisor', subtitleZh: 'scale = 共用的除数',
      foot: 'Rounded display decimals; all 32 values have |x| ≤ 0.70.', footZh: '小数为展示而舍入；全组都满足 |x| ≤ 0.70。',
      legend: 'Orange = BF16 · blue = codes · grey = scale', legendZh: '橙 = BF16 · 蓝 = 编码 · 灰 = scale',
      formulas: [
        { en: 'scale = 0.70 ÷ 7 = 0.10', zh: 'scale = 0.70 ÷ 7 = 0.10' },
        { en: '0.35 ÷ 0.10 = 3.5 → 4', zh: '0.35 ÷ 0.10 = 3.5 → 4' },
        { en: '4 × 0.10 = 0.40', zh: '4 × 0.10 = 0.40' },
        { en: 'error = |0.35 − 0.40| = 0.05', zh: '误差 = |0.35 − 0.40| = 0.05' },
        { en: 'This rule uses −7…7 · 7 is the positive limit', zh: '这条规则用 −7…7 · 7 是正向上限' },
      ],
    },
  }, {
    caption: 'Fake quantization rounds, then returns to BF16. Training computes with the rounded value.',
    captionZh: '模拟量化先舍入，再还原成 BF16。训练用还原值计算。',
    title: 'Fake quantization keeps BF16 storage', titleZh: '模拟量化仍用 BF16 保存和计算',
    subtitle: 'QAT = training with this fake rounding', subtitleZh: 'QAT = 带着这种模拟舍入来训练',
    foot: 'Only selected groups of weight tables use this round trip.',
    footZh: '只有选定的权重表组使用这种舍入往返。',
    legend: 'Orange = BF16 storage or compute · blue = rounding operation', legendZh: '橙 = BF16 保存或计算 · 蓝 = 舍入操作',
    flow: true,
    nodes: [
      { title: 'STORED WEIGHT', titleZh: '保存的权重', result: 'BF16 · 0.35', resultZh: 'BF16 · 0.35', body: 'model parameter', bodyZh: '模型参数', tone: 'orange', compact: true },
      { title: 'FAKE ROUND TRIP', titleZh: '模拟舍入往返', result: '0.35 → 4 → 0.40', resultZh: '0.35 → 4 → 0.40', body: 'BF16 in and out', bodyZh: '进出都是 BF16', tone: 'blue', compact: true, dashed: true },
      { title: 'BF16 COMPUTE', titleZh: 'BF16 计算', result: 'uses 0.40', resultZh: '使用 0.40', body: 'forward pass', bodyZh: '前向计算', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'storage stays BF16 and trainable · no 4-bit stored weights yet', zh: 'BF16 权重继续保存和训练 · 还没有 4 位存储' },
      { en: 'the forward pass sees rounded 0.40, not original 0.35', zh: '前向看到舍入后的 0.40，不是原来的 0.35' },
      { en: 'QAT = quantization-aware training', zh: 'QAT = 量化感知训练' },
      { en: 'training adapts because every forward experiences rounding', zh: '每次前向都经历舍入，训练就能适应它' },
      { en: 'Next: how does a gradient cross rounding?', zh: '下一步：梯度怎样穿过舍入？' },
    ],
    mobile: {
      title: 'Fake quantization keeps BF16', titleZh: '模拟量化仍用 BF16',
      subtitle: 'QAT = train with fake rounding', subtitleZh: 'QAT = 带着模拟舍入训练',
      foot: 'Only selected weight-table groups use this round trip.', footZh: '只有选定的权重表组使用这种往返。',
      legend: 'Orange = BF16 · blue = rounding', legendZh: '橙 = BF16 · 蓝 = 舍入',
      formulas: [
        { en: 'BF16 stays trainable · no INT4 storage', zh: 'BF16 继续训练 · 还没有 INT4 存储' },
        { en: 'Forward sees 0.40, not 0.35', zh: '前向看到 0.40，不是 0.35' },
        { en: 'QAT = quantization-aware training', zh: 'QAT = 量化感知训练' },
        { en: 'Every forward experiences rounding', zh: '每次前向都经历舍入' },
        { en: 'Next: how does a gradient cross?', zh: '下一步：梯度怎样穿过？' },
      ],
    },
  }, {
    caption: 'Rounding gives no useful update direction. STE passes that direction unchanged to the BF16 weight.',
    captionZh: '舍入给不出有用的更新方向。STE 把更新方向原样传给 BF16 权重。',
    title: 'STE passes gradients around rounding', titleZh: 'STE 让梯度绕过舍入',
    subtitle: 'STE = straight-through estimator · gradient = weight-update direction', subtitleZh: 'STE = 直通估计器 · 梯度 = 权重的更新方向和幅度',
    foot: 'Backward returns grad_output unchanged. STE is an approximation.',
    footZh: '反向原样返回 grad_output。STE 是近似。',
    legend: 'Blue = gradient path · orange = BF16 model weight', legendZh: '蓝 = 梯度路径 · 橙 = BF16 模型权重',
    flow: true,
    nodes: [
      { title: 'INCOMING GRAD', titleZh: '收到的梯度', result: 'grad_output', resultZh: 'grad_output', body: 'weight-update direction', bodyZh: '权重的更新方向', tone: 'blue', compact: true },
      { title: 'STE SHORTCUT', titleZh: 'STE 捷径', result: 'same grad_output', resultZh: '同一个 grad_output', body: 'skip the round trip', bodyZh: '绕过舍入往返', tone: 'blue', compact: true, dashed: true },
      { title: 'BF16 WEIGHT', titleZh: 'BF16 权重', result: 'can update', resultZh: '可以更新', body: 'receives the gradient', bodyZh: '收到这份梯度', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'backward: grad_output → same grad_output', zh: '反向：grad_output → 同一个 grad_output' },
      { en: 'STE pretends the round trip changes nothing for gradients', zh: 'STE 假装舍入往返不改变梯度' },
      { en: 'forward error remains: 0.35 → 0.40', zh: '前向误差仍在：0.35 → 0.40' },
      { en: 'STE is an approximation, not rounding’s real rule', zh: 'STE 是近似，不是舍入的真实规则' },
    ],
    mobile: {
      title: 'STE skips rounding for gradients', titleZh: 'STE 让梯度绕过舍入',
      subtitle: 'STE = straight-through estimator', subtitleZh: 'STE = 直通估计器',
      foot: 'Backward returns grad_output. STE is approximate.', footZh: '反向原样返回 grad_output。STE 是近似。',
      legend: 'Blue = gradients · orange = BF16 weight', legendZh: '蓝 = 梯度 · 橙 = BF16 权重',
      formulas: [
        { en: 'Backward: grad_output → same grad_output', zh: '反向：grad_output → 同一个 grad_output' },
        { en: 'STE pretends rounding changes no gradient', zh: 'STE 假装舍入不改变梯度' },
        { en: 'Forward error remains: 0.35 → 0.40', zh: '前向误差仍在：0.35 → 0.40' },
        { en: 'STE is an approximation, not the real rule', zh: 'STE 是近似，不是真实规则' },
      ],
    },
  }, {
    caption: 'Real quantization stores integer codes and BF16 scales for rollout. Each update converts the weights again.',
    captionZh: '真实量化把权重存成整数编码和 BF16 scale。每轮更新都重新转换。',
    title: 'Real quantization makes rollout codes', titleZh: '真实量化生成 rollout 的整数编码',
    subtitle: 'code = one integer standing for a rounded weight', subtitleZh: '编码 = 用一个整数表示舍入后的权重',
    foot: 'Constructed 0.35 example · ignored and unsupported tensors stay unquantized.',
    footZh: '0.35 是构造算例；被忽略或形状不支持的张量不量化。',
    legend: 'Orange = BF16 weights and scales · blue = codes · grey = scale calculation', legendZh: '橙 = BF16 权重和 scale · 蓝 = 编码 · 灰 = scale 计算',
    flow: true,
    nodes: [
      { title: 'BF16 UPDATE', titleZh: 'BF16 更新', result: '0.35', resultZh: '0.35', body: 'one weight from training', bodyZh: '训练传来的一个权重', tone: 'orange', compact: true },
      { title: 'GROUP SCALE', titleZh: '组 SCALE', result: '0.70 ÷ 7 = 0.10', resultZh: '0.70 ÷ 7 = 0.10', body: 'same group rule', bodyZh: '同一分组规则', tone: 'plain', compact: true },
      { title: 'SIGNED CODES', titleZh: '有符号编码', result: '4 ∈ [−8, 7]', resultZh: '4 ∈ [−8, 7]', body: 'codes can be negative', bodyZh: '编码可正可负', tone: 'blue', compact: true },
      { title: 'BF16 SCALE', titleZh: 'BF16 SCALE', result: '0.10', resultZh: '0.10', body: 'travels with codes', bodyZh: '和编码一起保存', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: '0.35 ÷ 0.10 = 3.5 → round to code 4', zh: '0.35 ÷ 0.10 = 3.5 → 舍入成编码 4' },
      { en: 'every RL update converts weights again', zh: '每轮 RL 更新都重新转换权重' },
    ],
    mobile: {
      title: 'Real INT4 makes rollout codes', titleZh: '真实量化生成 rollout 编码',
      subtitle: 'code = an integer for a rounded weight', subtitleZh: '编码 = 表示舍入后权重的整数',
      foot: 'Constructed 0.35 · unsupported tensors stay unquantized.', footZh: '0.35 是构造值；形状不支持的张量不量化。',
      legend: 'Orange = BF16 · blue = codes · grey = math', legendZh: '橙 = BF16 · 蓝 = 编码 · 灰 = 计算',
      formulas: [
        { en: '0.35 ÷ 0.10 = 3.5 → code 4', zh: '0.35 ÷ 0.10 = 3.5 → 编码 4' },
        { en: 'Every RL update converts again', zh: '每轮 RL 更新都重新转换' },
      ],
    },
  }, {
    caption: 'Pack eight INT4 codes into one 32-bit word. A 32-value group takes 18 bytes with its scale.',
    captionZh: '八个 INT4 编码装进一个 32 位存储槽。32 个权重加 scale 共占 18 字节。',
    title: 'Pack eight codes into one 32-bit word', titleZh: '把八个编码装进一个 32 位存储槽',
    subtitle: 'packing = eight codes share one 32-bit storage slot', subtitleZh: '打包 = 八个编码共用一个 32 位存储槽',
    foot: 'Constructed group with one BF16 scale; other metadata and tensors are excluded.',
    footZh: '只算构造的 32 个权重和一个 BF16 scale，不算其他数据。',
    legend: 'Orange = BF16 · blue = codes and packed payload · grey = payload plus scale', legendZh: '橙 = BF16 · 蓝 = 编码和打包权重 · 灰 = 权重加 scale',
    flow: true,
    nodes: [
      { title: 'BF16 GROUP', titleZh: 'BF16 权重组', result: `${N.INT4_GROUP_BF16_BYTES} B`, resultZh: `${N.INT4_GROUP_BF16_BYTES} 字节`, body: '32 values × 2 B', bodyZh: '32 个数 × 2 字节', tone: 'orange', bar: 1 },
      { title: 'SIGNED CODES', titleZh: '有符号编码', result: '[−8, …, 7]', resultZh: '[−8, …, 7]', body: 'add 8 before packing', bodyZh: '打包前先加 8', tone: 'blue', compact: true },
      { title: 'PACKED WORD', titleZh: '打包后的存储槽', result: '8 × 4 = 32 bits', resultZh: '8 × 4 = 32 位', body: 'eight codes, 4 B', bodyZh: '八个编码，共 4 字节', tone: 'blue', compact: true },
      { title: 'GROUP + SCALE', titleZh: '权重组和 SCALE', result: `${N.INT4_GROUP_STORED_BYTES} B`, resultZh: `${N.INT4_GROUP_STORED_BYTES} 字节`, body: '16 B packed + 2 B scale', bodyZh: '16 字节打包 + 2 字节 scale', tone: 'plain', bar: N.INT4_GROUP_STORED_BYTES / N.INT4_GROUP_BF16_BYTES, compact: true },
    ],
    formulas: [
      { en: 'q = signed code; it can be negative', zh: 'q = 有符号编码，可正可负' },
      { en: 'q + 8 gives fields 0…15', zh: 'q + 8 得到 0…15 的非负字段' },
      { en: 'each field = one 4-bit slot · value ≥ 0', zh: '每个字段占 4 位，字段值不小于 0' },
      { en: '8 codes × 4 bits = 32 bits = 4 B', zh: '8 个编码 × 4 位 = 32 位 = 4 字节' },
      { en: 'BF16: 32 × 2 B = 64 B', zh: 'BF16：32 × 2 字节 = 64 字节' },
      { en: 'INT4: 32 × 4 ÷ 8 = 16 B · scale = 2 B', zh: 'INT4：32 × 4 ÷ 8 = 16 字节 · scale = 2 字节' },
      { en: '16 + 2 = 18 B', zh: '16 + 2 = 18 字节' },
      { en: '(18 × 8) ÷ 32 = 4.5 bits per weight', zh: '(18 × 8) ÷ 32 = 平均每个权重 4.5 位' },
      { en: 'with the 2 B scale: (64 − 18) ÷ 64 = 71.875% saved', zh: '计入 2 字节 scale：(64 − 18) ÷ 64 = 少占 71.875%' },
    ],
    mobile: {
      title: 'Pack eight codes into one word', titleZh: '把八个编码装进一个存储槽',
      subtitle: 'packing = eight codes per 32-bit slot', subtitleZh: '打包 = 每个 32 位存储槽装八个编码',
      foot: 'One constructed group and BF16 scale only.', footZh: '只算构造的 32 个权重和一个 BF16 scale。',
      legend: 'Orange = BF16 · blue = payload · grey = total', legendZh: '橙 = BF16 · 蓝 = 打包权重 · 灰 = 权重加 scale',
      formulas: [
        { en: 'q = signed code; it can be negative', zh: 'q = 有符号编码，可正可负' },
        { en: 'q + 8 gives fields 0…15', zh: 'q + 8 得到 0…15 的非负字段' },
        { en: 'each field = one 4-bit slot · value ≥ 0', zh: '每个字段占 4 位，字段值不小于 0' },
        { en: '8 × 4 bits = 32 bits = 4 B', zh: '8 × 4 位 = 32 位 = 4 字节' },
        { en: 'BF16: 32 × 2 B = 64 B', zh: 'BF16：32 × 2 字节 = 64 字节' },
        { en: 'INT4: 16 B · scale: 2 B', zh: 'INT4：16 字节 · scale：2 字节' },
        { en: '16 + 2 = 18 B', zh: '16 + 2 = 18 字节' },
        { en: '(18 × 8) ÷ 32 = 4.5 bits per weight', zh: '(18 × 8) ÷ 32 = 平均每个权重 4.5 位' },
        { en: 'With scale: (64 − 18) ÷ 64 = 71.875% saved', zh: '计入 scale：(64 − 18) ÷ 64 = 少占 71.875%' },
      ],
    },
  }, {
    caption: 'Each update pauses generation, loads new weights, then reorders them for Marlin.',
    captionZh: '每次更新先暂停生成，再装入新权重。最后按 Marlin 的顺序重排。',
    title: 'Each update reorders weights for Marlin', titleZh: '每次更新都按 Marlin 的顺序重排权重',
    subtitle: 'Marlin = a multiplication routine with its own weight order', subtitleZh: 'Marlin = 有专门权重顺序的乘法程序',
    foot: 'Resize changes memory shape only; old values are not restored.',
    footZh: '调整形状只改存储形状，不会找回旧权重数值。',
    legend: 'Orange = update work · blue = Marlin-ready state', legendZh: '橙 = 更新工作 · 蓝 = Marlin 可用状态',
    flow: true,
    nodes: [
      { title: 'PAUSE GENERATION', titleZh: '暂停生成', result: 'no partial weights read', resultZh: '不读残缺的新旧混合', body: 'stop using old weights', bodyZh: '先停用旧权重', tone: 'orange', compact: true },
      { title: 'RESIZE MEMORY', titleZh: '调整存储形状', result: 'original shape', resultZh: '原来的形状', body: 'reusable weight storage', bodyZh: '可复用的权重存储', tone: 'orange', compact: true },
      { title: 'LOAD + REORDER', titleZh: '装入 + 重排', result: 'new Marlin order', resultZh: '新的 Marlin 顺序', body: 'different from Step 6', bodyZh: '不同于第 6 步打包', tone: 'blue', compact: true },
      { title: 'CONTINUE', titleZh: '继续生成', result: 'new weights ready', resultZh: '新权重可用', body: 'generation resumes', bodyZh: '恢复生成', tone: 'blue', compact: true },
    ],
    formulas: [
      { en: 'resize changes shape only · new values overwrite it', zh: '调整形状只改外形 · 新值随后覆盖它' },
      { en: 'Step 6 packs 4-bit fields · Step 7 reorders them for Marlin', zh: '第 6 步打包 4 位字段 · 第 7 步按 Marlin 重排' },
      { en: '64 scales before: [s0, s1, …, s63]', zh: '64 个 scale 重排前：[s0, s1, …, s63]' },
      { en: 'Marlin after: [s0,s8,…,s56 | s1,s9,…,s57 | … | s7,s15,…,s63]', zh: 'Marlin 重排后：[s0,s8,…,s56 | s1,s9,…,s57 | … | s7,s15,…,s63]' },
      { en: 'Next: Marlin recovers signed codes before BF16 math', zh: '下一步：Marlin 先取回有符号编码，再做 BF16 计算' },
    ],
    mobile: {
      title: 'Reorder every update for Marlin', titleZh: '每次更新都按 Marlin 重排',
      subtitle: 'Marlin = a routine with its own weight order', subtitleZh: 'Marlin = 有专门权重顺序的程序',
      foot: 'Resize changes shape only; old values stay gone.', footZh: '调整形状只改外形，旧值不会回来。',
      legend: 'Orange = update · blue = Marlin-ready', legendZh: '橙 = 更新 · 蓝 = Marlin 可用',
      formulas: [
        { en: 'Resize changes shape · new values overwrite it', zh: '调整形状只改外形 · 新值覆盖它' },
        { en: 'Step 6 packs fields · Step 7 reorders for Marlin', zh: '第 6 步打包字段 · 第 7 步按 Marlin 重排' },
        { en: '64 scales before: s0, s1, …, s63', zh: '64 个 scale 重排前：s0, s1, …, s63' },
        { en: 'after: s0,s8,…,s56 | s1,s9,…,s57', zh: '重排后：s0,s8,…,s56 | s1,s9,…,s57' },
        { en: '… | s7,s15,…,s63', zh: '… | s7,s15,…,s63' },
        { en: 'Next: recover signed codes before BF16 math', zh: '下一步：取回有符号编码再做 BF16 计算' },
      ],
    },
  }, {
    caption: 'W4A16 pairs INT4 weights with BF16 activations. Separately, FP32 keeps a running sum of products inside multiplication.',
    captionZh: 'W4A16 让 INT4 权重配合 BF16 激活值。乘法内部另用 FP32 累加乘积。',
    title: 'W4A16 stores INT4 but computes in BF16', titleZh: 'W4A16 保存 INT4，计算用 BF16',
    subtitle: 'W4A16 = 4-bit weights, BF16 activations', subtitleZh: 'W4A16 = 4 位权重，BF16 激活值',
    foot: 'Exact Marlin path; dequantization cost is not measured here.',
    footZh: '这里画 Marlin 的实际路径，不测量反量化开销。',
    legend: 'Blue = INT4 codes · orange = BF16 values · grey = FP32 inner total', legendZh: '蓝 = INT4 编码 · 橙 = BF16 数值 · 灰 = FP32 内部总和',
    flow: true,
    nodes: [
      { title: 'UNPACK INT4', titleZh: '解开 INT4 打包', result: 'field − 8', resultZh: '字段 − 8', body: 'signed code · undo offset', bodyZh: '有符号编码 · 撤销加 8', tone: 'blue', compact: true },
      { title: 'BF16 WEIGHTS', titleZh: 'BF16 权重', result: 'signed × scale', resultZh: 'signed × scale', body: 'dequantize', bodyZh: '反量化', tone: 'orange', compact: true },
      { title: 'BF16 MULTIPLY', titleZh: 'BF16 乘法', result: 'weights × activations', resultZh: '权重 × 激活值', body: 'both inputs are BF16', bodyZh: '两个输入都是 BF16', tone: 'orange', compact: true },
      { title: 'FP32 RUNNING SUM', titleZh: 'FP32 累加', result: '32-bit product sum', resultZh: '32 位乘积总和', body: 'inside this matrix multiply', bodyZh: '这次矩阵乘法内部', tone: 'plain', compact: true },
    ],
    formulas: [
      { en: 'W4A16 path: packed field − 8 = signed code', zh: 'W4A16 路径：打包字段 − 8 = 有符号编码' },
      { en: 'signed code × scale = BF16 weight', zh: '有符号编码 × scale = BF16 权重' },
      { en: 'BF16 weights × BF16 activations', zh: 'BF16 权重 × BF16 激活值' },
      { en: 'separate detail: FP32 accumulate = running product sum in 32 bits', zh: '另一个细节：FP32 累加 = 用 32 位数值累加乘积' },
      { en: 'only inside this matrix instruction · later reductions and output are separate', zh: '只在这条指令内部 · 后续归约和输出另算' },
    ],
    mobile: {
      title: 'W4A16: INT4 storage, BF16 math', titleZh: 'W4A16：INT4 存储，BF16 计算',
      subtitle: '4-bit weights · BF16 activations', subtitleZh: '4 位权重 · BF16 激活值',
      foot: 'Marlin path; dequantization cost is not measured.', footZh: 'Marlin 路径；不测量反量化开销。',
      legend: 'Blue = codes · orange = BF16 · grey = FP32', legendZh: '蓝 = 编码 · 橙 = BF16 · 灰 = FP32',
      formulas: [
        { en: 'W4A16: field − 8 = signed code', zh: 'W4A16：字段 − 8 = 有符号编码' },
        { en: 'signed code × scale = BF16 weight', zh: '有符号编码 × scale = BF16 权重' },
        { en: 'BF16 weights × BF16 activations', zh: 'BF16 权重 × BF16 激活值' },
        { en: 'FP32 = running product sum in 32 bits', zh: 'FP32 = 用 32 位数值累加乘积' },
        { en: 'Only inside this instruction', zh: '只在这条指令内部' },
        { en: 'Later reductions and output are separate', zh: '后续归约和输出另算' },
      ],
    },
  }, {
    caption: 'Checkpoint tensors take 594.206 GB, too much for one 141 GB card. Eight cards offer 1,128 GB total.',
    captionZh: 'checkpoint 张量共 594.206 GB，超过单卡 141 GB。八卡共有 1,128 GB。',
    title: 'Eight cards hold checkpoint tensor bytes', titleZh: '八张卡的总容量装得下 checkpoint 张量字节',
    subtitle: 'Kimi-K2-Thinking checkpoint = saved model data · 141 GB per H200', subtitleZh: 'Kimi-K2-Thinking checkpoint = 保存的模型数据 · 每张 H200 141 GB',
    foot: 'Tensor-byte arithmetic only; full rollout fit and speed require measurements.',
    footZh: '这里只算张量字节；完整 rollout 能否放下和加速都要实测。',
    legend: 'Orange = checkpoint tensor bytes · blue = card memory · shared scale', legendZh: '橙 = checkpoint 张量字节 · 蓝 = 卡容量 · 同一比例',
    compare: [{ en: 'ONE H200', zh: '一张 H200' }, { en: 'EIGHT H200s', zh: '八张 H200' }],
    nodes: [
      { title: 'ONE · CHECKPOINT', titleZh: '单卡 · CHECKPOINT', result: `${N.KIMI_CHECKPOINT_GB.toFixed(3)} GB`, resultZh: `${N.KIMI_CHECKPOINT_GB.toFixed(3)} GB`, body: `${N.KIMI_CHECKPOINT_OVER_ONE_CARD.toFixed(2)} × one card`, bodyZh: `是单卡容量的 ${N.KIMI_CHECKPOINT_OVER_ONE_CARD.toFixed(2)} 倍`, tone: 'orange', bar: N.KIMI_CHECKPOINT_GB / N.INT4_H200_TOTAL_GB },
      { title: 'ONE · MEMORY', titleZh: '单卡 · 容量', result: `${N.INT4_H200_MEMORY_GB} GB`, resultZh: `${N.INT4_H200_MEMORY_GB} GB`, body: 'checkpoint too large', bodyZh: '装不下 checkpoint', tone: 'blue', bar: N.INT4_H200_MEMORY_GB / N.INT4_H200_TOTAL_GB },
      { title: 'EIGHT · CHECKPOINT', titleZh: '八卡 · CHECKPOINT', result: `${N.KIMI_CHECKPOINT_GB.toFixed(3)} GB`, resultZh: `${N.KIMI_CHECKPOINT_GB.toFixed(3)} GB`, body: `${N.KIMI_CHECKPOINT_PER_GPU_GB.toFixed(3)} GB per GPU average`, bodyZh: `平均每张 GPU ${N.KIMI_CHECKPOINT_PER_GPU_GB.toFixed(3)} GB`, tone: 'orange', bar: N.KIMI_CHECKPOINT_GB / N.INT4_H200_TOTAL_GB },
      { title: 'EIGHT · MEMORY', titleZh: '八卡 · 容量', result: `${N.INT4_H200_TOTAL_GB.toLocaleString('en-US')} GB`, resultZh: `${N.INT4_H200_TOTAL_GB.toLocaleString('en-US')} GB`, body: 'checkpoint bytes fit', bodyZh: 'checkpoint 字节能放下', tone: 'blue', bar: 1 },
    ],
    formulas: [
      { en: `metadata.total_size = ${N.KIMI_CHECKPOINT_BYTES.toLocaleString('en-US')} B = ${N.KIMI_CHECKPOINT_GB.toFixed(3)} GB`, zh: `metadata.total_size = ${N.KIMI_CHECKPOINT_BYTES.toLocaleString('en-US')} 字节 = ${N.KIMI_CHECKPOINT_GB.toFixed(3)} GB` },
      { en: 'index = tensor-to-file table · metadata = notes in that table', zh: 'index = 张量到文件的目录 · metadata = 目录里的说明' },
      { en: 'metadata.total_size = tensor bytes recorded in those notes', zh: 'metadata.total_size = 说明中记录的张量总字节' },
      { en: '8 × 141 = 1,128 GB total', zh: '8 × 141 = 共 1,128 GB' },
      { en: '594.206 ÷ 8 = 74.276 GB per GPU average', zh: '594.206 ÷ 8 = 平均每张 GPU 74.276 GB' },
      { en: '594.206 ÷ 141 = 4.21 × one card', zh: '594.206 ÷ 141 = 单卡容量的 4.21 倍' },
      { en: '594.206 < 1,128: checkpoint tensor bytes fit in total', zh: '594.206 < 1,128：checkpoint 张量总字节能放下' },
      { en: 'other runtime data still needs memory', zh: '其他运行数据仍需显存' },
      { en: 'TRAINING: fake BF16 round trip · ROLLOUT: real INT4 Marlin', zh: '训练：fake BF16 往返 · ROLLOUT：真实 INT4 Marlin' },
    ],
    mobile: {
      title: '8 GPUs hold tensor bytes', titleZh: '八卡装得下 checkpoint 张量字节',
      subtitle: 'Kimi-K2-Thinking checkpoint = saved model data', subtitleZh: 'Kimi-K2-Thinking checkpoint = 保存的模型数据',
      foot: 'Tensor-byte arithmetic only; rollout needs measurement.', footZh: '只算张量字节；完整 rollout 要实测。',
      legend: 'Orange = checkpoint tensors · blue = card memory', legendZh: '橙 = checkpoint 张量 · 蓝 = 卡容量',
      formulas: [
        { en: 'metadata.total_size', zh: 'metadata.total_size' },
        { en: `= ${N.KIMI_CHECKPOINT_BYTES.toLocaleString('en-US')} B = ${N.KIMI_CHECKPOINT_GB.toFixed(3)} GB`, zh: `= ${N.KIMI_CHECKPOINT_BYTES.toLocaleString('en-US')} 字节 = ${N.KIMI_CHECKPOINT_GB.toFixed(3)} GB` },
        { en: 'index = tensor → file table', zh: 'index = 张量 → 文件目录' },
        { en: 'metadata = notes in that table', zh: 'metadata = 目录里的说明' },
        { en: 'total_size = tensor bytes in those notes', zh: 'total_size = 说明里的张量字节数' },
        { en: '8 × 141 = 1,128 GB total', zh: '8 × 141 = 共 1,128 GB' },
        { en: '594.206 ÷ 8 = 74.276 GB per GPU', zh: '594.206 ÷ 8 = 每张 GPU 74.276 GB' },
        { en: '594.206 ÷ 141 = 4.21 × one card', zh: '594.206 ÷ 141 = 单卡的 4.21 倍' },
        { en: '594.206 < 1,128: tensor bytes fit', zh: '594.206 < 1,128：张量字节能放下' },
        { en: 'Other runtime data still needs memory', zh: '其他运行数据仍需显存' },
        { en: 'TRAIN: fake BF16 · ROLLOUT: real INT4 Marlin', zh: '训练：fake BF16 · ROLLOUT：真实 INT4 Marlin' },
      ],
    },
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  let reduceMotion = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => (phone = query.matches);
    const updateMotion = () => (reduceMotion = motion.matches);
    update();
    updateMotion();
    query.addEventListener('change', update);
    motion.addEventListener('change', updateMotion);
    return () => {
      query.removeEventListener('change', update);
      motion.removeEventListener('change', updateMotion);
    };
  });
  const PHASE_COUNTS = [3, 5, 4, 4, 5, 5, 5, 5, 3];
  const PHASE_MS = 1000, REST_MS = 2800;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    phase = 0;
    if (reduceMotion) { phase = count - 1; return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.length = 0;
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const start = $derived(80);
  const formulas = $derived(phone && cur.mobile?.formulas ? cur.mobile.formulas : cur.formulas);
  const formulaStart = $derived(cur.compare ? 300 : 290);
  const legendY = $derived(phone ? start + cur.nodes.length * 96 + 15 + formulas.length * 27 : formulaStart + (cur.formulas.length - 1) * 18 + 32);
  const H = $derived(phone ? legendY + 55 : Math.max(500, legendY + 24));
  const nodeW = (count: number) => count === 2 ? 260 : count === 3 ? 200 : 155;
  const nodeX = (i: number, count: number) => count === 2 ? 65 + i * 330 : count === 3 ? 35 + i * 225 : 25 + i * 175;
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if !reduceMotion}<LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} />{/if}
      <defs>
        <marker id="int4-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--line)" />
        </marker>
      </defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobile?.title ?? cur.title, cur.mobile?.titleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobile?.subtitle ?? cur.subtitle, cur.mobile?.subtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.nodes as node, i}
          {@const y = start + i * 96}
          <g opacity={phase >= i ? 1 : 0}>
            <rect x="25" y={y} width="250" height="80" rx="11" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.dashed ? '5 4' : '0'} />
            <text x="150" y={y + 20} text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x="150" y={y + 43} text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
            <text x="150" y={y + 64} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if node.bar !== undefined}
              <rect x="35" y={y + 72} width="230" height="5" rx="2" fill="var(--bg)" />
              <rect x="35" y={y + 72} width={230 * node.bar} height="5" rx="2" fill={stroke(node.tone)} />
            {/if}
            {#if cur.flow && i < cur.nodes.length - 1}
              <line x1="150" y1={y + 80} x2="150" y2={y + 92} stroke="var(--line)" stroke-width="2.5" marker-end="url(#int4-arrow)" opacity={phase > i ? 1 : 0} />
            {/if}
          </g>
        {/each}
        <g opacity={phase >= PHASE_COUNTS[step] - 1 ? 1 : 0}>
          {#each formulas as line, i}
            <text x="150" y={start + cur.nodes.length * 96 + 15 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
          {/each}
          <text x="150" y={legendY} text-anchor="middle" class="small">{t(cur.mobile?.legend ?? cur.legend, cur.mobile?.legendZh ?? cur.legendZh)}</text>
        </g>
      {:else if cur.compare}
        {#each [0, 1] as group}
          {@const x = group === 0 ? 35 : 375}
          <g opacity={phase >= group ? 1 : 0}>
            <rect x={x} y="90" width="310" height="195" rx="13" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 155} y="116" text-anchor="middle" class="section">{t(cur.compare[group].en, cur.compare[group].zh)}</text>
            {#each [0, 1] as offset}
              {@const node = cur.nodes[group * 2 + offset]}
              {@const y = 140 + offset * 78}
              <text x={x + 20} y={y} class="small strong">{t(node.title, node.titleZh)}</text>
              <rect x={x + 20} y={y + 12} width="270" height="27" rx="5" fill="var(--bg)" stroke="var(--line)" />
              <rect x={x + 20} y={y + 12} width={270 * (node.bar ?? 1)} height="27" rx="5" fill={fill(node.tone)} stroke={stroke(node.tone)} />
              <text x={x + 155} y={y + 32} text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
              <text x={x + 155} y={y + 57} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {/each}
          </g>
        {/each}
        <g opacity={phase >= PHASE_COUNTS[step] - 1 ? 1 : 0}>
          {#each cur.formulas as line, i}
            <text x="360" y={formulaStart + i * 18} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
          {/each}
          <text x="360" y={legendY} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
        </g>
      {:else}
        {#each cur.nodes as node, i}
          {@const w = nodeW(cur.nodes.length)}
          {@const x = nodeX(i, cur.nodes.length)}
          <g opacity={phase >= i ? 1 : 0}>
            <rect x={x} y="105" width={w} height="160" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.dashed ? '5 4' : '0'} />
            <text x={x + w / 2} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x={x + w / 2} y="180" text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
            <text x={x + w / 2} y={node.bar === undefined ? 222 : 211} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if node.bar !== undefined}
              <rect x={x + 10} y="237" width={w - 20} height="10" rx="3" fill="var(--bg)" />
              <rect x={x + 10} y="237" width={(w - 20) * node.bar} height="10" rx="3" fill={stroke(node.tone)} />
            {/if}
            {#if cur.flow && i < cur.nodes.length - 1}
              <line x1={x + w} y1="185" x2={nodeX(i + 1, cur.nodes.length)} y2="185" stroke="var(--line)" stroke-width="2.5" marker-end="url(#int4-arrow)" opacity={phase > i ? 1 : 0} />
            {/if}
          </g>
        {/each}
        <g opacity={phase >= PHASE_COUNTS[step] - 1 ? 1 : 0}>
          {#each cur.formulas as line, i}
            <text x="360" y={formulaStart + i * 18} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
          {/each}
          <text x="360" y={legendY} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
        </g>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(cur.mobile?.foot ?? cur.foot, cur.mobile?.footZh ?? cur.footZh) : t(cur.foot, cur.footZh)}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .section { font-family: var(--mono); font-size: 15px; font-weight: 700; fill: var(--fg); }
  .strong { font-weight: 650; }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .viz :global(.tag) { font-size: 11px; }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .result { font-size: 12px; }
  }
</style>
