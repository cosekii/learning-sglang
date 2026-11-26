<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
    caption: 'INT4 cuts 32 weights from 64 bytes to 16 raw bytes. Rounding is the cost.',
    captionZh: '32 个权重从 64 字节减到 16 字节。代价是舍入。',
    title: 'INT4 quarters raw weight bytes', titleZh: 'INT4 把原始权重字节减到四分之一',
    subtitle: 'INT4 = 4 bits per weight · BF16 = 16 bits', subtitleZh: 'INT4 = 每个权重 4 位 · BF16 = 每个权重 16 位',
    foot: 'Constructed group; raw payload excludes scales, other tensors and runtime memory.',
    footZh: '构造的一组权重；原始负载不含 scale、其他张量和运行显存。',
    legend: 'Orange = BF16 · blue = packed INT4 · bars use one scale', legendZh: '橙 = BF16 · 蓝 = 打包后的 INT4 · 柱使用同一比例',
    flow: true,
    nodes: [
      { title: 'BF16 WEIGHTS', titleZh: 'BF16 权重', result: `${N.INT4_GROUP_BF16_BYTES} B`, resultZh: `${N.INT4_GROUP_BF16_BYTES} 字节`, body: `${N.INT4_GROUP_SIZE} values × 2 B`, bodyZh: `${N.INT4_GROUP_SIZE} 个数 × 2 字节`, tone: 'orange', bar: 1 },
      { title: 'RAW INT4', titleZh: '原始 INT4', result: `${N.INT4_GROUP_PACKED_BYTES} B`, resultZh: `${N.INT4_GROUP_PACKED_BYTES} 字节`, body: `${N.INT4_GROUP_SIZE} values × 0.5 B`, bodyZh: `${N.INT4_GROUP_SIZE} 个数 × 0.5 字节`, tone: 'blue', bar: N.INT4_GROUP_PACKED_BYTES / N.INT4_GROUP_BF16_BYTES },
    ],
    formulas: [
      { en: `${N.INT4_GROUP_SIZE} × 2 B = ${N.INT4_GROUP_BF16_BYTES} B · ${N.INT4_GROUP_SIZE} × 0.5 B = ${N.INT4_GROUP_PACKED_BYTES} B`, zh: `${N.INT4_GROUP_SIZE} × 2 字节 = ${N.INT4_GROUP_BF16_BYTES} 字节 · ${N.INT4_GROUP_SIZE} × 0.5 字节 = ${N.INT4_GROUP_PACKED_BYTES} 字节` },
      { en: `${N.INT4_GROUP_BF16_BYTES} − ${N.INT4_GROUP_PACKED_BYTES} = ${N.INT4_GROUP_SAVED_BYTES} B saved`, zh: `${N.INT4_GROUP_BF16_BYTES} − ${N.INT4_GROUP_PACKED_BYTES} = 省下 ${N.INT4_GROUP_SAVED_BYTES} 字节` },
      { en: `${N.INT4_GROUP_SAVED_BYTES} ÷ ${N.INT4_GROUP_BF16_BYTES} = 75% less raw payload`, zh: `${N.INT4_GROUP_SAVED_BYTES} ÷ ${N.INT4_GROUP_BF16_BYTES} = 原始负载少 75%` },
      { en: 'Fewer bits mean fewer numeric levels', zh: '位数更少，能表示的数值等级也更少' },
      { en: 'How can training adapt to rounding?', zh: '训练怎样适应舍入？' },
    ],
    mobile: {
      title: 'INT4 quarters raw weight bytes', titleZh: 'INT4 把原始权重字节减到四分之一',
      subtitle: 'INT4 = 4 bits · BF16 = 16 bits', subtitleZh: 'INT4 = 4 位 · BF16 = 16 位',
      foot: 'Constructed raw payload; other storage is excluded.', footZh: '构造的原始负载；其他存储不计入。',
      legend: 'Orange = BF16 · blue = INT4 · shared scale', legendZh: '橙 = BF16 · 蓝 = INT4 · 同一比例',
      formulas: [
        { en: '32 × 2 B = 64 B', zh: '32 × 2 字节 = 64 字节' },
        { en: '32 × 0.5 B = 16 B', zh: '32 × 0.5 字节 = 16 字节' },
        { en: '64 − 16 = 48 B saved', zh: '64 − 16 = 省下 48 字节' },
        { en: '48 ÷ 64 = 75% less raw payload', zh: '48 ÷ 64 = 原始负载少 75%' },
        { en: 'Fewer bits mean fewer levels', zh: '位数更少，数值等级更少' },
        { en: 'How can training adapt?', zh: '训练怎样适应舍入？' },
      ],
    },
  }, {
    caption: 'One group shares a scale, its largest magnitude divided by 7. Rounding changes 0.35 to 0.40.',
    captionZh: '一组权重共用一个 scale。0.35 舍入后还原为 0.40。',
    title: 'One scale fits 32 weights onto integer levels', titleZh: '一个 scale 把 32 个权重放到整数等级上',
    subtitle: 'scale = one shared divisor for a group', subtitleZh: 'scale = 一组权重共用的除数',
    foot: 'Constructed nonzero group; three of its 32 values are shown.',
    footZh: '构造的非零权重组；画出 32 个数中的三个。',
    legend: 'Orange = BF16 · blue = integer codes · grey = scale', legendZh: '橙 = BF16 · 蓝 = 整数编码 · 灰 = scale',
    flow: true,
    nodes: [
      { title: 'ORIGINAL BF16', titleZh: '原始 BF16', result: '[0.10, 0.35, 0.70]', resultZh: '[0.10, 0.35, 0.70]', body: 'three values shown', bodyZh: '画出三个数', tone: 'orange', compact: true },
      { title: 'SHARED SCALE', titleZh: '共用 SCALE', result: '0.70 ÷ 7 = 0.10', resultZh: '0.70 ÷ 7 = 0.10', body: 'largest |value| ÷ 7', bodyZh: '最大绝对值 ÷ 7', tone: 'plain', compact: true },
      { title: 'INT4 CODES', titleZh: 'INT4 编码', result: '[1, 4, 7]', resultZh: '[1, 4, 7]', body: 'rounded integers', bodyZh: '舍入后的整数', tone: 'blue', compact: true },
      { title: 'RESTORED BF16', titleZh: '还原 BF16', result: '[0.10, 0.40, 0.70]', resultZh: '[0.10, 0.40, 0.70]', body: 'code × scale', bodyZh: '编码 × scale', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'scale = max(|0.10|, |0.35|, |0.70|) ÷ 7 = 0.10', zh: 'scale = max(|0.10|, |0.35|, |0.70|) ÷ 7 = 0.10' },
      { en: '0.35 ÷ 0.10 = 3.5 → round to 4', zh: '0.35 ÷ 0.10 = 3.5 → 舍入为 4' },
      { en: '4 × 0.10 = 0.40', zh: '4 × 0.10 = 0.40' },
      { en: 'absolute error = |0.35 − 0.40| = 0.05', zh: '绝对误差 = |0.35 − 0.40| = 0.05' },
      { en: '32 values share one scale · codes stay between −7 and 7', zh: '32 个数共用一个 scale · 编码限制在 −7 到 7' },
    ],
    mobile: {
      title: 'One scale fits 32 weights', titleZh: '一个 scale 对齐 32 个权重',
      subtitle: 'scale = shared divisor', subtitleZh: 'scale = 共用的除数',
      foot: 'Constructed group; three of 32 values shown.', footZh: '构造算例；画出 32 个数中的三个。',
      legend: 'Orange = BF16 · blue = codes · grey = scale', legendZh: '橙 = BF16 · 蓝 = 编码 · 灰 = scale',
      formulas: [
        { en: 'scale = 0.70 ÷ 7 = 0.10', zh: 'scale = 0.70 ÷ 7 = 0.10' },
        { en: '0.35 ÷ 0.10 = 3.5 → 4', zh: '0.35 ÷ 0.10 = 3.5 → 4' },
        { en: '4 × 0.10 = 0.40', zh: '4 × 0.10 = 0.40' },
        { en: 'error = |0.35 − 0.40| = 0.05', zh: '误差 = |0.35 − 0.40| = 0.05' },
        { en: '32 values share one scale · codes: −7…7', zh: '32 个数共用一个 scale · 编码：−7…7' },
      ],
    },
  }, {
    caption: 'Fake quantization rounds, then returns to BF16. Training computes with the rounded value.',
    captionZh: '模拟量化先舍入，再还原成 BF16。训练用还原值计算。',
    title: 'Fake quantization keeps BF16 storage', titleZh: '模拟量化仍用 BF16 保存和计算',
    subtitle: 'QAT = training with this fake rounding', subtitleZh: 'QAT = 带着这种模拟舍入来训练',
    foot: 'The recipe applies this hook to selected grouped-linear weights.',
    footZh: '这个配置只给选定的 grouped-linear 权重加模拟量化。',
    legend: 'Orange = BF16 storage or compute · blue = rounding operation', legendZh: '橙 = BF16 保存或计算 · 蓝 = 舍入操作',
    flow: true,
    nodes: [
      { title: 'STORED WEIGHT', titleZh: '保存的权重', result: 'BF16 · 0.35', resultZh: 'BF16 · 0.35', body: 'model parameter', bodyZh: '模型参数', tone: 'orange', compact: true },
      { title: 'FAKE ROUND TRIP', titleZh: '模拟舍入往返', result: '0.35 → 4 → 0.40', resultZh: '0.35 → 4 → 0.40', body: 'BF16 in and out', bodyZh: '进出都是 BF16', tone: 'blue', compact: true, dashed: true },
      { title: 'BF16 COMPUTE', titleZh: 'BF16 计算', result: 'uses 0.40', resultZh: '使用 0.40', body: 'forward pass', bodyZh: '前向计算', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'storage stays BF16 · no packed INT4 checkpoint here', zh: '保存值仍是 BF16 · 这里还没有打包的 INT4 checkpoint' },
      { en: 'the forward pass sees rounded 0.40, not original 0.35', zh: '前向看到舍入后的 0.40，不是原来的 0.35' },
      { en: 'QAT = quantization-aware training', zh: 'QAT = 量化感知训练' },
      { en: 'fake is not real export: no 4-bit storage yet', zh: '模拟不是真实导出：还没有 4 位存储' },
      { en: 'Next: how does a gradient cross rounding?', zh: '下一步：梯度怎样穿过舍入？' },
    ],
    mobile: {
      title: 'Fake quantization keeps BF16', titleZh: '模拟量化仍用 BF16',
      subtitle: 'QAT = train with fake rounding', subtitleZh: 'QAT = 带着模拟舍入训练',
      foot: 'Only selected grouped-linear weights use this hook.', footZh: '只有选定的 grouped-linear 权重用它。',
      legend: 'Orange = BF16 · blue = rounding', legendZh: '橙 = BF16 · 蓝 = 舍入',
      formulas: [
        { en: 'Storage stays BF16 · no packed INT4 yet', zh: '保存值仍是 BF16 · 还没有 INT4 打包' },
        { en: 'Forward sees 0.40, not 0.35', zh: '前向看到 0.40，不是 0.35' },
        { en: 'QAT = quantization-aware training', zh: 'QAT = 量化感知训练' },
        { en: 'Fake is not real 4-bit export', zh: '模拟不是真实 4 位导出' },
        { en: 'Next: how does a gradient cross?', zh: '下一步：梯度怎样穿过？' },
      ],
    },
  }, {
    caption: 'Rounding blocks the usual gradient. STE passes the incoming gradient straight to the BF16 weight.',
    captionZh: '普通梯度过不了舍入。STE 把梯度原样传给 BF16 权重。',
    title: 'STE passes gradients around rounding', titleZh: 'STE 让梯度绕过舍入',
    subtitle: 'STE = straight-through estimator, a gradient shortcut', subtitleZh: 'STE = 直通估计器，一条梯度捷径',
    foot: 'Pinned backward: return grad_output, None. STE is an approximation.',
    footZh: '固定版本的反向：return grad_output, None。STE 是近似。',
    legend: 'Blue = gradient path · orange = BF16 model weight', legendZh: '蓝 = 梯度路径 · 橙 = BF16 模型权重',
    flow: true,
    nodes: [
      { title: 'INCOMING GRAD', titleZh: '收到的梯度', result: 'grad_output', resultZh: 'grad_output', body: 'from later compute', bodyZh: '来自后面的计算', tone: 'blue', compact: true },
      { title: 'STE SHORTCUT', titleZh: 'STE 捷径', result: 'same grad_output', resultZh: '同一个 grad_output', body: 'skip the round trip', bodyZh: '绕过舍入往返', tone: 'blue', compact: true, dashed: true },
      { title: 'BF16 WEIGHT', titleZh: 'BF16 权重', result: 'can update', resultZh: '可以更新', body: 'receives the gradient', bodyZh: '收到这份梯度', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'backward: grad_output → same grad_output', zh: '反向：grad_output → 同一个 grad_output' },
      { en: 'STE treats the whole round trip as identity for gradients', zh: 'STE 算梯度时把整个往返当成原样传递' },
      { en: 'forward error remains: 0.35 → 0.40', zh: '前向误差仍在：0.35 → 0.40' },
      { en: 'model parameters: BF16 · optimizer main parameters: FP32 by default', zh: '模型参数：BF16 · 优化器主参数默认：FP32' },
      { en: 'STE is not the true derivative of rounding', zh: 'STE 不是舍入的真实导数' },
    ],
    mobile: {
      title: 'STE skips rounding for gradients', titleZh: 'STE 让梯度绕过舍入',
      subtitle: 'STE = a gradient shortcut', subtitleZh: 'STE = 一条梯度捷径',
      foot: 'Backward returns grad_output. STE is approximate.', footZh: '反向原样返回 grad_output。STE 是近似。',
      legend: 'Blue = gradients · orange = BF16 weight', legendZh: '蓝 = 梯度 · 橙 = BF16 权重',
      formulas: [
        { en: 'Backward: grad_output → same grad_output', zh: '反向：grad_output → 同一个 grad_output' },
        { en: 'STE treats the round trip as identity', zh: 'STE 把往返当成原样传递' },
        { en: 'Forward error remains: 0.35 → 0.40', zh: '前向误差仍在：0.35 → 0.40' },
        { en: 'Model: BF16 · optimizer main: FP32 default', zh: '模型：BF16 · 优化器主参数默认：FP32' },
        { en: 'STE is not rounding’s true derivative', zh: 'STE 不是舍入的真实导数' },
      ],
    },
  }, {
    caption: 'Real quantization stores integer codes and BF16 scales. Only selected weights take this path.',
    captionZh: '真实量化保存整数编码和 BF16 scale。只有选定的权重走这条路。',
    title: 'Real quantization makes rollout codes', titleZh: '真实量化生成 rollout 的整数编码',
    subtitle: 'real = integer codes stored for rollout', subtitleZh: '真实 = 为 rollout 保存整数编码',
    foot: 'The public config quantizes selected expert weights, not every tensor.',
    footZh: '公开配置只量化选定的专家权重，不是所有张量。',
    legend: 'Orange = BF16 values · blue = integer codes · grey = scale calculation', legendZh: '橙 = BF16 数值 · 蓝 = 整数编码 · 灰 = scale 计算',
    flow: true,
    nodes: [
      { title: 'BF16 UPDATE', titleZh: 'BF16 更新', result: '0.35', resultZh: '0.35', body: 'eligible weight', bodyZh: '选定的权重', tone: 'orange', compact: true },
      { title: 'GROUP SCALE', titleZh: '组 SCALE', result: '0.70 ÷ 7 = 0.10', resultZh: '0.70 ÷ 7 = 0.10', body: 'same group rule', bodyZh: '同一分组规则', tone: 'plain', compact: true },
      { title: 'SIGNED CODES', titleZh: '有符号编码', result: '4 ∈ [−8, 7]', resultZh: '4 ∈ [−8, 7]', body: 'integer storage codes', bodyZh: '整数存储编码', tone: 'blue', compact: true },
      { title: 'BF16 SCALE', titleZh: 'BF16 SCALE', result: '0.10', resultZh: '0.10', body: 'travels with codes', bodyZh: '和编码一起保存', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'real code = round(0.35 ÷ 0.10) = 4', zh: '真实编码 = round(0.35 ÷ 0.10) = 4' },
      { en: `export clamp: [${N.INT4_REAL_QMIN}, 7] · fake clamp: [−7, 7]`, zh: `导出截断：[${N.INT4_REAL_QMIN}, 7] · 模拟截断：[−7, 7]` },
      { en: 'the exported scale is cast to BF16 in this recipe', zh: '这个配置把导出的 scale 转成 BF16' },
      { en: 'other tensors keep their original form', zh: '其他张量保留原来的形式' },
      { en: 'every RL update converts weights again', zh: '每轮 RL 更新都重新转换权重' },
    ],
    mobile: {
      title: 'Real INT4 makes rollout codes', titleZh: '真实量化生成 rollout 编码',
      subtitle: 'real = codes stored for rollout', subtitleZh: '真实 = 为 rollout 保存编码',
      foot: 'Selected expert weights only, not every tensor.', footZh: '只量化选定的专家权重，不是所有张量。',
      legend: 'Orange = BF16 · blue = codes · grey = scale', legendZh: '橙 = BF16 · 蓝 = 编码 · 灰 = scale',
      formulas: [
        { en: 'Real code = round(0.35 ÷ 0.10) = 4', zh: '真实编码 = round(0.35 ÷ 0.10) = 4' },
        { en: 'Export: [−8, 7] · fake: [−7, 7]', zh: '导出：[−8, 7] · 模拟：[−7, 7]' },
        { en: 'Exported scale becomes BF16 here', zh: '这里的导出 scale 转成 BF16' },
        { en: 'Other tensors keep their original form', zh: '其他张量保留原形式' },
        { en: 'Every RL update converts again', zh: '每轮 RL 更新都重新转换' },
      ],
    },
  }, {
    caption: 'Pack eight INT4 codes into one 32-bit word. A 32-value group takes 18 bytes with its scale.',
    captionZh: '八个 INT4 编码装进一个 32 位字。一组权重加 scale 共占 18 字节。',
    title: 'Pack eight codes into one 32-bit word', titleZh: '把八个编码装进一个 32 位字',
    subtitle: 'packing = eight 4-bit codes share one word', subtitleZh: '打包 = 八个 4 位编码共用一个字',
    foot: 'Constructed group with one BF16 scale; other metadata and tensors are excluded.',
    footZh: '构造的一组权重和一个 BF16 scale；其他元数据与张量不计入。',
    legend: 'Orange = BF16 · blue = INT4 · grey = packed weights plus scale', legendZh: '橙 = BF16 · 蓝 = INT4 · 灰 = 打包权重加 scale',
    flow: true,
    nodes: [
      { title: 'BF16 GROUP', titleZh: 'BF16 权重组', result: `${N.INT4_GROUP_BF16_BYTES} B`, resultZh: `${N.INT4_GROUP_BF16_BYTES} 字节`, body: '32 values × 2 B', bodyZh: '32 个数 × 2 字节', tone: 'orange', bar: 1 },
      { title: 'SIGNED CODES', titleZh: '有符号编码', result: '[−8, …, 7]', resultZh: '[−8, …, 7]', body: 'add 8 before packing', bodyZh: '打包前先加 8', tone: 'blue', compact: true },
      { title: 'PACKED WORD', titleZh: '打包后的字', result: '8 × 4 = 32 bits', resultZh: '8 × 4 = 32 位', body: 'eight codes, 4 B', bodyZh: '八个编码，共 4 字节', tone: 'blue', compact: true },
      { title: 'GROUP + SCALE', titleZh: '权重组 + SCALE', result: `${N.INT4_GROUP_STORED_BYTES} B`, resultZh: `${N.INT4_GROUP_STORED_BYTES} 字节`, body: '16 B packed + 2 B scale', bodyZh: '16 字节打包 + 2 字节 scale', tone: 'plain', bar: N.INT4_GROUP_STORED_BYTES / N.INT4_GROUP_BF16_BYTES, compact: true },
    ],
    formulas: [
      { en: 'q + 8 maps [−8, 7] to unsigned [0, 15]', zh: 'q + 8 把 [−8, 7] 映射为无符号的 [0, 15]' },
      { en: '8 codes × 4 bits = 32 bits = 4 B', zh: '8 个编码 × 4 位 = 32 位 = 4 字节' },
      { en: 'BF16: 32 × 2 B = 64 B', zh: 'BF16：32 × 2 字节 = 64 字节' },
      { en: 'INT4: 32 × 4 ÷ 8 = 16 B · scale = 2 B', zh: 'INT4：32 × 4 ÷ 8 = 16 字节 · scale = 2 字节' },
      { en: '16 + 2 = 18 B = 4.5 bits per weight', zh: '16 + 2 = 18 字节 = 每个权重 4.5 位' },
      { en: '(64 − 18) ÷ 64 = 71.875% saved', zh: '(64 − 18) ÷ 64 = 省下 71.875%' },
    ],
    mobile: {
      title: 'Pack eight codes into one word', titleZh: '把八个编码装进一个字',
      subtitle: 'packing = eight 4-bit codes per word', subtitleZh: '打包 = 每字装八个 4 位编码',
      foot: 'One constructed group and BF16 scale only.', footZh: '只算构造的一组权重和 BF16 scale。',
      legend: 'Orange = BF16 · blue = INT4 · grey = total', legendZh: '橙 = BF16 · 蓝 = INT4 · 灰 = 总存储',
      formulas: [
        { en: 'q + 8 maps [−8, 7] to [0, 15]', zh: 'q + 8 把 [−8, 7] 映射为 [0, 15]' },
        { en: '8 × 4 bits = 32 bits = 4 B', zh: '8 × 4 位 = 32 位 = 4 字节' },
        { en: 'BF16: 32 × 2 B = 64 B', zh: 'BF16：32 × 2 字节 = 64 字节' },
        { en: 'INT4: 16 B · scale: 2 B', zh: 'INT4：16 字节 · scale：2 字节' },
        { en: '16 + 2 = 18 B = 4.5 bits per weight', zh: '16 + 2 = 18 字节 = 每个权重 4.5 位' },
        { en: '(64 − 18) ÷ 64 = 71.875% saved', zh: '(64 − 18) ÷ 64 = 省下 71.875%' },
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
  const start = $derived(80);
  const formulas = $derived(phone && cur.mobile?.formulas ? cur.mobile.formulas : cur.formulas);
  const formulaStart = $derived(cur.compare ? 350 : 320);
  const legendY = $derived(phone ? start + cur.nodes.length * 96 + 15 + formulas.length * 27 : formulaStart + (cur.formulas.length - 1) * 29 + 45);
  const H = $derived(phone ? legendY + 55 : Math.max(cur.desktopH ?? 500, legendY + 55));
  const nodeW = (count: number) => count === 2 ? 260 : count === 3 ? 200 : 155;
  const nodeX = (i: number, count: number) => count === 2 ? 65 + i * 330 : count === 3 ? 35 + i * 225 : 25 + i * 175;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
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
          <rect x="25" y={y} width="250" height="80" rx="11" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.dashed ? '5 4' : '0'} />
          <text x="150" y={y + 20} text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x="150" y={y + 43} text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
          <text x="150" y={y + 64} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if node.bar !== undefined}
            <rect x="35" y={y + 72} width="230" height="5" rx="2" fill="var(--bg)" />
            <rect x="35" y={y + 72} width={230 * node.bar} height="5" rx="2" fill={stroke(node.tone)} />
          {/if}
          {#if cur.flow && i < cur.nodes.length - 1}
            <line x1="150" y1={y + 80} x2="150" y2={y + 92} stroke="var(--line)" stroke-width="2.5" marker-end="url(#int4-arrow)" />
          {/if}
        {/each}
        {#each formulas as line, i}
          <text x="150" y={start + cur.nodes.length * 96 + 15 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
        <text x="150" y={legendY} text-anchor="middle" class="small">{t(cur.mobile?.legend ?? cur.legend, cur.mobile?.legendZh ?? cur.legendZh)}</text>
      {:else if cur.compare}
        {#each [0, 1] as group}
          {@const x = group === 0 ? 35 : 375}
          <rect x={x} y="90" width="310" height="240" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 155} y="122" text-anchor="middle" class="section">{t(cur.compare[group].en, cur.compare[group].zh)}</text>
          {#each [0, 1] as offset}
            {@const node = cur.nodes[group * 2 + offset]}
            {@const y = 151 + offset * 82}
            <text x={x + 20} y={y} class="small strong">{t(node.title, node.titleZh)}</text>
            <rect x={x + 20} y={y + 12} width="270" height="27" rx="5" fill="var(--bg)" stroke="var(--line)" />
            <rect x={x + 20} y={y + 12} width={270 * (node.bar ?? 1)} height="27" rx="5" fill={fill(node.tone)} stroke={stroke(node.tone)} />
            <text x={x + 155} y={y + 32} text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
            <text x={x + 155} y={y + 57} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {/each}
        {/each}
        {#each cur.formulas as line, i}
          <text x="360" y={formulaStart + i * 29} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
        <text x="360" y={H - 55} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
      {:else}
        {#each cur.nodes as node, i}
          {@const w = nodeW(cur.nodes.length)}
          {@const x = nodeX(i, cur.nodes.length)}
          <rect x={x} y="105" width={w} height="160" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.dashed ? '5 4' : '0'} />
          <text x={x + w / 2} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={x + w / 2} y="180" text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
          <text x={x + w / 2} y={node.bar === undefined ? 222 : 211} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if node.bar !== undefined}
            <rect x={x + 10} y="237" width={w - 20} height="10" rx="3" fill="var(--bg)" />
            <rect x={x + 10} y="237" width={(w - 20) * node.bar} height="10" rx="3" fill={stroke(node.tone)} />
          {/if}
          {#if cur.flow && i < cur.nodes.length - 1}
            <line x1={x + w} y1="185" x2={nodeX(i + 1, cur.nodes.length)} y2="185" stroke="var(--line)" stroke-width="2.5" marker-end="url(#int4-arrow)" />
          {/if}
        {/each}
        {#each cur.formulas as line, i}
          <text x="360" y={formulaStart + i * 29} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
        <text x="360" y={H - 55} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
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
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .result { font-size: 12px; }
  }
</style>
