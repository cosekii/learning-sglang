<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { BW } from '../../numbers';
  import * as N from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type Node = {
    title: string; titleZh: string; result: string; resultZh: string; body: string; bodyZh: string;
    tone: Tone; bar?: number; compact?: boolean;
  };
  type MobileText = {
    title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; legend: string; legendZh: string;
    map?: { en: string; zh: string }; formulas?: { en: string; zh: string }[];
  };
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; legend: string; legendZh: string; map?: { en: string; zh: string };
    nodes: Node[]; formulas: { en: string; zh: string }[]; flow?: boolean; measure?: boolean; desktopH?: number;
    mobile?: MobileText;
  };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  const steps: Step[] = [{
    caption: `FP8 stores each weight in 8 bits, half of BF16. Supported weights drop from ${N.FP8_BF16_WEIGHT_GB} GB to ${N.FP8_WEIGHT_GB} GB.`,
    captionZh: `FP8 每个数占 8 位，只有 BF16 的一半。本例权重从 ${N.FP8_BF16_WEIGHT_GB} GB 降到 ${N.FP8_WEIGHT_GB} GB。`,
    title: 'FP8 halves supported weight bytes', titleZh: 'FP8 让支持的权重的字节数减半',
    subtitle: 'FP8 = 8 bits per value · BF16 = 16 bits', subtitleZh: 'FP8 = 每个数 8 位 · BF16 = 每个数 16 位',
    map: { en: 'CHAPTER MAP · rollout → training → export → compare', zh: '本章路线 · rollout → 训练 → 导出 → 对照' },
    foot: 'Constructed example; supported means this FP8 path handles these weights.',
    footZh: '构造算例；“支持”指这条 FP8 路径能处理这些权重。',
    legend: 'Orange = BF16 · blue = FP8 · bars use one scale', legendZh: '橙 = BF16 · 蓝 = FP8 · 柱使用同一比例',
    flow: true,
    nodes: [
      { title: 'BF16 WEIGHTS', titleZh: 'BF16 权重', result: `${N.FP8_BF16_WEIGHT_GB} GB`, resultZh: `${N.FP8_BF16_WEIGHT_GB} GB`, body: `${N.FP8_PARAMS_B}B values × 2 bytes`, bodyZh: `${N.FP8_PARAMS_B}B 个数 × 2 字节`, tone: 'orange', bar: 1 },
      { title: 'FP8 WEIGHTS', titleZh: 'FP8 权重', result: `${N.FP8_WEIGHT_GB} GB`, resultZh: `${N.FP8_WEIGHT_GB} GB`, body: `${N.FP8_PARAMS_B}B values × 1 byte`, bodyZh: `${N.FP8_PARAMS_B}B 个数 × 1 字节`, tone: 'blue', bar: N.FP8_WEIGHT_GB / N.FP8_BF16_WEIGHT_GB },
    ],
    formulas: [
      { en: `${N.FP8_PARAMS_B}B × 2 B = ${N.FP8_BF16_WEIGHT_GB} GB · ${N.FP8_PARAMS_B}B × 1 B = ${N.FP8_WEIGHT_GB} GB`, zh: `${N.FP8_PARAMS_B}B × 2 字节 = ${N.FP8_BF16_WEIGHT_GB} GB · ${N.FP8_PARAMS_B}B × 1 字节 = ${N.FP8_WEIGHT_GB} GB` },
      { en: `${N.FP8_BF16_WEIGHT_GB} − ${N.FP8_WEIGHT_GB} = ${N.FP8_WEIGHT_SAVED_GB} GB saved`, zh: `${N.FP8_BF16_WEIGHT_GB} − ${N.FP8_WEIGHT_GB} = 省下 ${N.FP8_WEIGHT_SAVED_GB} GB` },
      { en: `Ideal BF16 read: ${N.FP8_BF16_WEIGHT_GB} ÷ ${BW} = ${N.FP8_BF16_IDEAL_READ_MS.toFixed(2)} ms`, zh: `BF16 理想读取：${N.FP8_BF16_WEIGHT_GB} ÷ ${BW} = ${N.FP8_BF16_IDEAL_READ_MS.toFixed(2)} ms` },
      { en: `Ideal FP8 read: ${N.FP8_WEIGHT_GB} ÷ ${BW} = ${N.FP8_IDEAL_READ_MS.toFixed(2)} ms`, zh: `FP8 理想读取：${N.FP8_WEIGHT_GB} ÷ ${BW} = ${N.FP8_IDEAL_READ_MS.toFixed(2)} ms` },
    ],
    mobile: {
      title: 'FP8 halves supported weight bytes', titleZh: 'FP8 让支持的权重的字节数减半',
      subtitle: 'FP8 = 8 bits · BF16 = 16 bits', subtitleZh: 'FP8 = 8 位 · BF16 = 16 位',
      foot: 'Constructed supported-weight example.', footZh: '构造的支持的权重算例。',
      legend: 'Orange = BF16 · blue = FP8 · shared scale', legendZh: '橙 = BF16 · 蓝 = FP8 · 同一比例',
      map: { en: 'MAP · rollout → train → export → compare', zh: '路线 · rollout → 训练 → 导出 → 对照' },
    },
  }, {
    caption: 'One group shares a scale, its largest magnitude divided by 448. Rounding changes 3.2 to 3.142857.',
    captionZh: '一组数共用一个缩放因子。3.2 舍入后还原为约 3.142857。',
    title: 'One scale fits a group into FP8', titleZh: '一个 scale 把一组数装进 FP8',
    subtitle: 'scale = one shared divisor for a group of values', subtitleZh: 'scale = 一组数共用的除数',
    foot: 'FP8 holds a finite set of values; 176 is the nearest to 179.2.',
    footZh: 'FP8 只能保存一组离散数值；176 最接近 179.2。',
    legend: 'Orange = high-precision values · blue = FP8 values · dashed = scale', legendZh: '橙 = 高精度数值 · 蓝 = FP8 数值 · 虚线 = scale',
    flow: true, desktopH: 560,
    nodes: [
      { title: 'ORIGINAL', titleZh: '原数', result: '[1, 3.2, 8]', resultZh: '[1, 3.2, 8]', body: 'one group', bodyZh: '一组三个数', tone: 'orange', compact: true },
      { title: 'SCALE', titleZh: 'SCALE', result: '8 ÷ 448 = 1/56', resultZh: '8 ÷ 448 = 1/56', body: 'largest ÷ 448', bodyZh: '最大绝对值 ÷ 448', tone: 'plain', compact: true },
      { title: 'FP8 VALUES', titleZh: 'FP8 数值', result: '[56, 176, 448]', resultZh: '[56, 176, 448]', body: 'rounded', bodyZh: '舍入后的值', tone: 'blue', compact: true },
      { title: 'RESTORED', titleZh: '还原值', result: '[1, 3.142857, 8]', resultZh: '[1, 3.142857, 8]', body: 'scale × FP8 value', bodyZh: 'scale × FP8 数值', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'scale = max(|1|, |3.2|, |8|) ÷ 448 = 1/56', zh: 'scale = max(|1|, |3.2|, |8|) ÷ 448 = 1/56' },
      { en: `3.2 ÷ (1/56) = ${N.FP8_EXAMPLE_SCALED_MIDDLE.toFixed(1)} → FP8 176`, zh: `3.2 ÷ (1/56) = ${N.FP8_EXAMPLE_SCALED_MIDDLE.toFixed(1)} → FP8 176` },
      { en: `176 × (1/56) = ${N.FP8_EXAMPLE_RESTORED[1].toFixed(6)}`, zh: `176 × (1/56) = ${N.FP8_EXAMPLE_RESTORED[1].toFixed(6)}` },
      { en: `absolute error = |3.2 − 3.142857| = ${N.FP8_EXAMPLE_MIDDLE_ERROR.toFixed(6)}`, zh: `绝对误差 = |3.2 − 3.142857| = ${N.FP8_EXAMPLE_MIDDLE_ERROR.toFixed(6)}` },
      { en: 'FP8 chooses from a limited set of floating-point values · maximum = 448', zh: 'FP8 从有限的浮点数值中选择 · 最大值 = 448' },
      { en: '|x| = distance from zero · magnitude means absolute value', zh: '|x| = 到零的距离 · magnitude 就是绝对值' },
    ],
    mobile: {
      title: 'One scale fits a group into FP8', titleZh: '一个 scale 把一组数装进 FP8',
      subtitle: 'scale = shared divisor', subtitleZh: 'scale = 共用的除数',
      foot: '176 is the nearest FP8 value to 179.2.', footZh: '176 是最接近 179.2 的 FP8 值。',
      legend: 'Orange = high precision · blue = FP8 · dashed = scale', legendZh: '橙 = 高精度 · 蓝 = FP8 · 虚线 = scale',
      formulas: [
        { en: 'scale = max(|1|, |3.2|, |8|) ÷ 448 = 1/56', zh: 'scale = max(|1|, |3.2|, |8|) ÷ 448 = 1/56' },
        { en: `3.2 ÷ (1/56) = ${N.FP8_EXAMPLE_SCALED_MIDDLE.toFixed(1)} → FP8 176`, zh: `3.2 ÷ (1/56) = ${N.FP8_EXAMPLE_SCALED_MIDDLE.toFixed(1)} → FP8 176` },
        { en: `176 × (1/56) = ${N.FP8_EXAMPLE_RESTORED[1].toFixed(6)}`, zh: `176 × (1/56) = ${N.FP8_EXAMPLE_RESTORED[1].toFixed(6)}` },
        { en: `error = |3.2 − 3.142857| = ${N.FP8_EXAMPLE_MIDDLE_ERROR.toFixed(6)}`, zh: `误差 = |3.2 − 3.142857| = ${N.FP8_EXAMPLE_MIDDLE_ERROR.toFixed(6)}` },
        { en: 'FP8 has a limited value set · maximum = 448', zh: 'FP8 只有有限数值 · 最大值 = 448' },
        { en: '|x| = distance from zero', zh: '|x| = 到零的距离' },
      ],
    },
  }, {
    caption: 'Rollout converts weights beforehand and activations when they appear. Some layers keep BF16.',
    captionZh: 'Rollout 提前转换权重，激活值现算现转。有些层仍用 BF16。',
    title: 'Rollout · 1 of 4: two inputs become FP8', titleZh: 'Rollout · 1/4：两类输入变成 FP8',
    subtitle: 'matrix multiply = multiply two tables of numbers',
    subtitleZh: '矩阵乘法 = 两表数相乘',
    foot: 'Implementation path, not a rollout latency measurement.', footZh: '实现路径，不是 rollout 延迟实测。',
    legend: 'Orange = BF16 sources · blue = FP8 matrix multiplication', legendZh: '橙 = BF16 输入来源 · 蓝 = FP8 矩阵乘法',
    nodes: [
      { title: 'INITIAL WEIGHTS', titleZh: '初始权重', result: 'BF16 → FP8 + scale', resultZh: 'BF16 → FP8 + scale', body: 'converted before rollout', bodyZh: 'rollout 前提前转换', tone: 'orange', compact: true },
      { title: 'ACTIVATIONS', titleZh: '激活值', result: 'BF16 → FP8 + scale', resultZh: 'BF16 → FP8 + scale', body: 'converted when created', bodyZh: '计算产生时再转换', tone: 'orange', compact: true },
      { title: 'MATRIX MULTIPLY', titleZh: '矩阵乘法', result: 'FP8 inputs + scales', resultZh: 'FP8 输入 + scale', body: 'some layers stay BF16', bodyZh: '有些层仍用 BF16', tone: 'blue', compact: true },
    ],
    formulas: [
      { en: 'initial checkpoint: offline conversion + scales · updates in Step 5', zh: '初始 checkpoint：提前转换并保存 scale · 更新见第 5 步' },
      { en: 'activations = values made during compute · convert with scales', zh: '激活值 = 计算产生的值 · 转换时也带 scale' },
      { en: 'token-ID lookup + final-score layers stay BF16', zh: 'token ID 查表层和最终打分层仍用 BF16' },
    ],
    mobile: {
      title: 'Rollout · 1/4: two FP8 inputs', titleZh: 'Rollout · 1/4：两类 FP8 输入',
      subtitle: 'matrix multiply = multiply two number tables', subtitleZh: '矩阵乘法 = 两表数相乘',
      foot: 'Implementation path, not a latency measurement.', footZh: '实现路径，不是延迟实测。',
      legend: 'Orange = BF16 sources · blue = FP8 compute', legendZh: '橙 = BF16 来源 · 蓝 = FP8 计算',
      formulas: [
        { en: 'initial weights: convert offline + scales', zh: '初始权重：提前转换并保存 scale' },
        { en: 'activations: convert with scales when created', zh: '激活值：产生时转换并带 scale' },
        { en: 'lookup + final-score layers stay BF16', zh: '查表层和最终打分层仍用 BF16' },
      ],
    },
  }, {
    caption: 'Training uses FP8 matrix multiplies in forward and backward. Optimizer tables keep higher precision.',
    captionZh: '训练的前向和反向矩阵乘法可用 FP8。优化器表仍用高精度。',
    title: 'Training · 2 of 4: FP8 multiplies, precise state', titleZh: '训练 · 2/4：FP8 乘法与高精度状态',
    subtitle: 'FP8 multiply inputs are quantized when needed',
    subtitleZh: 'FP8 乘法输入在需要时才量化',
    foot: 'With --fp8-param-gather, training can store weights in FP8; without it, training stores BF16 weights.',
    footZh: '开启 --fp8-param-gather 时，训练可用 FP8 保存权重；否则用 BF16 保存。',
    legend: 'Orange = higher-precision state · blue = FP8 matrix multiplication', legendZh: '橙 = 高精度状态 · 蓝 = FP8 矩阵乘法',
    nodes: [
      { title: 'PRECISE REGIONS', titleZh: '高精度区域', result: 'BF16 + FP32', resultZh: 'BF16 + FP32', body: 'kept where required', bodyZh: '需要高精度的部分继续保存', tone: 'orange', compact: true },
      { title: 'FP8 MULTIPLY', titleZh: 'FP8 矩阵乘法', result: 'forward + backward', resultZh: '前向 + 反向', body: 'quantize inputs when needed', bodyZh: '需要时才量化输入', tone: 'blue', compact: true },
      { title: 'OPTIMIZER STATE', titleZh: '优化器状态', result: 'higher precision', resultZh: '保持高精度', body: 'not halved by FP8', bodyZh: '不会因 FP8 减半', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'FP32 = 32-bit floating point · FP8 inputs may be temporary', zh: 'FP32 = 32 位浮点数 · FP8 输入可以是临时的' },
      { en: 'forward computes outputs · backward computes gradients', zh: '前向算输出 · 反向算梯度' },
      { en: 'Chapter 8 example: optimizer tables stay 48 GB, not 24 GB', zh: '第 8 章算例：优化器表仍是 48 GB，不是 24 GB' },
    ],
    mobile: {
      title: 'Training · 2/4: FP8 in a mixed model', titleZh: '训练 · 2/4：混合模型里的 FP8',
      subtitle: 'FP8 inputs are quantized when needed', subtitleZh: 'FP8 输入在需要时才量化',
      foot: 'Implementation path, not a training measurement.', footZh: '实现路径，不是训练实测。',
      legend: 'Orange = precise state · blue = FP8 compute', legendZh: '橙 = 高精度状态 · 蓝 = FP8 计算',
      formulas: [
        { en: 'FP32 = 32-bit floating point', zh: 'FP32 = 32 位浮点数' },
        { en: 'forward: outputs · backward: gradients', zh: '前向算输出 · 反向算梯度' },
        { en: 'optimizer tables: 48 GB, not 24 GB', zh: '优化器表：48 GB，不是 24 GB' },
      ],
    },
  }, {
    caption: 'The update quantizes BF16 weights for rollout. Training with FP8-stored weights first expands them to BF16.',
    captionZh: '更新通道把 BF16 权重转成 rollout 的 FP8。若训练端存的是 FP8，先还原 BF16。',
    title: 'Export · 3 of 4: quantize for rollout', titleZh: '导出 · 3/4：为 rollout 量化',
    subtitle: 'dequantize = expand stored FP8 weights to BF16 when needed',
    subtitleZh: '反量化 = 需要时把保存的 FP8 权重还原成 BF16',
    foot: 'BF16 → FP8 is the common handoff; the first expansion is conditional.',
    footZh: '共同交接是 BF16 → FP8；前面的还原步骤只在需要时执行。',
    legend: 'Orange = BF16 · blue = FP8 · dashed = either stored form', legendZh: '橙 = BF16 · 蓝 = FP8 · 虚线 = 两种保存形式',
    flow: true,
    nodes: [
      { title: 'TRAINING WEIGHTS', titleZh: '训练端权重', result: 'FP8 or BF16', resultZh: 'FP8 或 BF16', body: 'depends on configuration', bodyZh: '取决于配置', tone: 'plain', compact: true },
      { title: 'BF16 UPDATE', titleZh: 'BF16 更新', result: 'dequantize if needed', resultZh: '需要时反量化', body: 'shared update form', bodyZh: '共同的更新形式', tone: 'orange', compact: true },
      { title: 'ROLLOUT FP8', titleZh: 'ROLLOUT FP8', result: 'quantize', resultZh: '量化', body: 'supported weights only', bodyZh: '仅限支持的权重', tone: 'blue' },
    ],
    formulas: [
      { en: 'P = count of supported weight values · raw payload excludes scales', zh: 'P = 支持的权重的数值个数 · 原始负载不含 scale' },
      { en: 'FP8 raw payload = P bytes · BF16 raw payload = 2P bytes', zh: 'FP8 原始负载 = P 字节 · BF16 原始负载 = 2P 字节' },
      { en: 'excluded tensors are extra · transfer time unknown', zh: '未转换张量另算 · 传输时间未知' },
    ],
    mobile: {
      title: 'Export · 3/4: quantize for rollout', titleZh: '导出 · 3/4：为 rollout 量化',
      subtitle: 'dequantize = expand FP8 back to BF16', subtitleZh: '反量化 = 把 FP8 还原成 BF16',
      foot: 'The first expansion is conditional.', footZh: '前面的还原步骤按需执行。',
      legend: 'Orange = BF16 · blue = FP8', legendZh: '橙 = BF16 · 蓝 = FP8',
      formulas: [
        { en: 'P = number of supported weight values', zh: 'P = 支持的权重的数值个数' },
        { en: 'FP8 = P B · BF16 = 2P B · scales extra', zh: 'FP8 = P 字节 · BF16 = 2P 字节 · scale 另算' },
        { en: 'transfer time unknown', zh: '传输时间未知' },
      ],
    },
  }, {
    caption: `One public non-RL forward-plus-backward pass saved ${N.FP8_PUBLIC_TIME_SAVED_MS} ms. Peak memory fell ${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} GB, gains of ${pct(N.FP8_PUBLIC_TIME_SAVED_SHARE)} and ${pct(N.FP8_PUBLIC_MEMORY_SAVED_SHARE)}.`,
    captionZh: `公开非 RL 的一趟前向加反向省下 ${N.FP8_PUBLIC_TIME_SAVED_MS} ms。峰值显存少 ${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} GB，收益是 ${pct(N.FP8_PUBLIC_TIME_SAVED_SHARE)} 和 ${pct(N.FP8_PUBLIC_MEMORY_SAVED_SHARE)}。`,
    title: 'Compare · 4 of 4: measured gains are uneven', titleZh: '对照 · 4/4：实测收益并不一致',
    subtitle: 'non-RL = not a reinforcement-learning run · same model and settings',
    subtitleZh: '非 RL = 不是强化学习训练 · 两边使用同一模型和设置',
    foot: 'InfiR2 public non-RL row; exact configuration is in the deep dive.',
    footZh: 'InfiR2 公开非 RL 一行；精确配置见深入讲解。',
    legend: 'Orange = BF16 · blue = FP8 · time and memory each use one shared scale', legendZh: '橙 = BF16 · 蓝 = FP8 · 时间和显存各自使用同一比例',
    measure: true, desktopH: 590,
    nodes: [
      { title: 'TIME · BF16', titleZh: '时间 · BF16', result: `${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} ms`, resultZh: `${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} ms`, body: `${N.FP8_PUBLIC_FORWARD_BF16_MS} + ${N.FP8_PUBLIC_BACKWARD_BF16_MS.toLocaleString('en-US')} ms`, bodyZh: `${N.FP8_PUBLIC_FORWARD_BF16_MS} + ${N.FP8_PUBLIC_BACKWARD_BF16_MS.toLocaleString('en-US')} ms`, tone: 'orange', bar: 1 },
      { title: 'TIME · FP8', titleZh: '时间 · FP8', result: `${N.FP8_PUBLIC_TOTAL_FP8_MS.toLocaleString('en-US')} ms`, resultZh: `${N.FP8_PUBLIC_TOTAL_FP8_MS.toLocaleString('en-US')} ms`, body: `${N.FP8_PUBLIC_FORWARD_FP8_MS} + ${N.FP8_PUBLIC_BACKWARD_FP8_MS.toLocaleString('en-US')} ms`, bodyZh: `${N.FP8_PUBLIC_FORWARD_FP8_MS} + ${N.FP8_PUBLIC_BACKWARD_FP8_MS.toLocaleString('en-US')} ms`, tone: 'blue', bar: N.FP8_PUBLIC_TOTAL_FP8_MS / N.FP8_PUBLIC_TOTAL_BF16_MS },
      { title: 'MEMORY · BF16', titleZh: '显存 · BF16', result: `${N.FP8_PUBLIC_MEMORY_BF16_GB} GB`, resultZh: `${N.FP8_PUBLIC_MEMORY_BF16_GB} GB`, body: 'peak', bodyZh: '峰值', tone: 'orange', bar: 1 },
      { title: 'MEMORY · FP8', titleZh: '显存 · FP8', result: `${N.FP8_PUBLIC_MEMORY_FP8_GB} GB`, resultZh: `${N.FP8_PUBLIC_MEMORY_FP8_GB} GB`, body: 'peak', bodyZh: '峰值', tone: 'blue', bar: N.FP8_PUBLIC_MEMORY_FP8_GB / N.FP8_PUBLIC_MEMORY_BF16_GB },
    ],
    formulas: [
      { en: `${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} − ${N.FP8_PUBLIC_TOTAL_FP8_MS.toLocaleString('en-US')} = ${N.FP8_PUBLIC_TIME_SAVED_MS} ms`, zh: `${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} − ${N.FP8_PUBLIC_TOTAL_FP8_MS.toLocaleString('en-US')} = ${N.FP8_PUBLIC_TIME_SAVED_MS} ms` },
      { en: `${N.FP8_PUBLIC_TIME_SAVED_MS} ÷ ${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} = ${pct(N.FP8_PUBLIC_TIME_SAVED_SHARE)}`, zh: `${N.FP8_PUBLIC_TIME_SAVED_MS} ÷ ${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} = ${pct(N.FP8_PUBLIC_TIME_SAVED_SHARE)}` },
      { en: `${N.FP8_PUBLIC_MEMORY_BF16_GB} − ${N.FP8_PUBLIC_MEMORY_FP8_GB} = ${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} GB`, zh: `${N.FP8_PUBLIC_MEMORY_BF16_GB} − ${N.FP8_PUBLIC_MEMORY_FP8_GB} = ${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} GB` },
      { en: `${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} ÷ ${N.FP8_PUBLIC_MEMORY_BF16_GB} = ${pct(N.FP8_PUBLIC_MEMORY_SAVED_SHARE)}`, zh: `${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} ÷ ${N.FP8_PUBLIC_MEMORY_BF16_GB} = ${pct(N.FP8_PUBLIC_MEMORY_SAVED_SHARE)}` },
      { en: `forward: ${N.FP8_PUBLIC_FORWARD_BF16_MS} → ${N.FP8_PUBLIC_FORWARD_FP8_MS} ms · extra conversion work`, zh: `前向：${N.FP8_PUBLIC_FORWARD_BF16_MS} → ${N.FP8_PUBLIC_FORWARD_FP8_MS} ms · 转换工作增加` },
      { en: `backward: ${N.FP8_PUBLIC_BACKWARD_BF16_MS.toLocaleString('en-US')} → ${N.FP8_PUBLIC_BACKWARD_FP8_MS.toLocaleString('en-US')} ms`, zh: `反向：${N.FP8_PUBLIC_BACKWARD_BF16_MS.toLocaleString('en-US')} → ${N.FP8_PUBLIC_BACKWARD_FP8_MS.toLocaleString('en-US')} ms` },
    ],
    mobile: {
      title: 'Compare · 4/4: uneven gains', titleZh: '对照 · 4/4：实测收益不一致',
      subtitle: 'non-RL = not reinforcement learning', subtitleZh: '非 RL = 不是强化学习',
      foot: 'InfiR2 public non-RL row; settings in the deep dive.', footZh: 'InfiR2 公开非 RL 一行；设置见深入讲解。',
      legend: 'Orange = BF16 · blue = FP8 · shared scales', legendZh: '橙 = BF16 · 蓝 = FP8 · 各自同一比例',
      formulas: [
        { en: `${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} − ${N.FP8_PUBLIC_TOTAL_FP8_MS.toLocaleString('en-US')} = ${N.FP8_PUBLIC_TIME_SAVED_MS} ms`, zh: `${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} − ${N.FP8_PUBLIC_TOTAL_FP8_MS.toLocaleString('en-US')} = ${N.FP8_PUBLIC_TIME_SAVED_MS} ms` },
        { en: `${N.FP8_PUBLIC_TIME_SAVED_MS} ÷ ${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} = ${pct(N.FP8_PUBLIC_TIME_SAVED_SHARE)}`, zh: `${N.FP8_PUBLIC_TIME_SAVED_MS} ÷ ${N.FP8_PUBLIC_TOTAL_BF16_MS.toLocaleString('en-US')} = ${pct(N.FP8_PUBLIC_TIME_SAVED_SHARE)}` },
        { en: `${N.FP8_PUBLIC_MEMORY_BF16_GB} − ${N.FP8_PUBLIC_MEMORY_FP8_GB} = ${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} GB`, zh: `${N.FP8_PUBLIC_MEMORY_BF16_GB} − ${N.FP8_PUBLIC_MEMORY_FP8_GB} = ${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} GB` },
        { en: `${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} ÷ ${N.FP8_PUBLIC_MEMORY_BF16_GB} = ${pct(N.FP8_PUBLIC_MEMORY_SAVED_SHARE)}`, zh: `${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} ÷ ${N.FP8_PUBLIC_MEMORY_BF16_GB} = ${pct(N.FP8_PUBLIC_MEMORY_SAVED_SHARE)}` },
        { en: `forward: ${N.FP8_PUBLIC_FORWARD_BF16_MS} → ${N.FP8_PUBLIC_FORWARD_FP8_MS} ms · conversions`, zh: `前向：${N.FP8_PUBLIC_FORWARD_BF16_MS} → ${N.FP8_PUBLIC_FORWARD_FP8_MS} ms · 转换增加` },
        { en: `backward: ${N.FP8_PUBLIC_BACKWARD_BF16_MS.toLocaleString('en-US')} → ${N.FP8_PUBLIC_BACKWARD_FP8_MS.toLocaleString('en-US')} ms`, zh: `反向：${N.FP8_PUBLIC_BACKWARD_BF16_MS.toLocaleString('en-US')} → ${N.FP8_PUBLIC_BACKWARD_FP8_MS.toLocaleString('en-US')} ms` },
      ],
    },
  }, {
    caption: 'Real and fake FP8 separate the compute path from rounding loss. The source attributes most error to rounding.',
    captionZh: '真实与模拟 FP8 分开看计算路径和舍入误差。误差主要来自舍入。',
    title: 'Compare: compute path versus rounding loss', titleZh: '对照：计算路径与舍入损失',
    subtitle: 'fake quantization = BF16 → FP8 → BF16', subtitleZh: '模拟量化 = BF16 → FP8 → BF16',
    foot: 'Qwen3-4B, one H800, RL Steps 0 and 1; comparison claims follow the article.',
    footZh: 'Qwen3-4B，一张 H800，RL 第 0、1 步；对照结论来自文章。',
    legend: 'Orange = BF16 compute · blue = FP8 compute · dashed = round-trip', legendZh: '橙 = BF16 计算 · 蓝 = FP8 计算 · 虚线 = 往返转换',
    desktopH: 540,
    nodes: [
      { title: 'BF16 BASELINE', titleZh: 'BF16 基准', result: 'BF16 inputs', resultZh: 'BF16 输入', body: 'BF16 matrix multiply', bodyZh: 'BF16 矩阵乘法', tone: 'orange', compact: true },
      { title: 'REAL FP8', titleZh: '真实 FP8', result: 'FP8 inputs', resultZh: 'FP8 输入', body: 'FP8 matrix multiply', bodyZh: 'FP8 矩阵乘法', tone: 'blue', compact: true },
      { title: 'FAKE FP8', titleZh: '模拟 FP8', result: 'BF16 → FP8 → BF16', resultZh: 'BF16 → FP8 → BF16', body: 'then BF16 multiply', bodyZh: '再做 BF16 矩阵乘法', tone: 'plain', compact: true },
    ],
    formulas: [
      { en: 'both paths round first · REAL ↔ FAKE = different multiplication paths', zh: '两条路都先舍入 · 真实 ↔ 模拟 = 矩阵乘法路径不同' },
      { en: 'BASELINE ↔ FAKE → quantization round-trip loss', zh: '基准 ↔ 模拟 → 量化往返的舍入损失' },
      { en: 'Diff = matrix-output difference · unit not specified', zh: 'Diff = 矩阵输出差异 · 单位未说明' },
      { en: 'reported: rounding loss dominates', zh: '文章结果：舍入损失为主' },
    ],
    mobile: {
      title: 'Compare: path versus rounding', titleZh: '对照：计算路径与舍入',
      subtitle: 'fake quantization = BF16 → FP8 → BF16', subtitleZh: '模拟量化 = BF16 → FP8 → BF16',
      foot: 'Qwen3-4B, one H800, RL Steps 0 and 1.', footZh: 'Qwen3-4B，一张 H800，RL 第 0、1 步。',
      legend: 'Orange = BF16 · blue = FP8 · dashed = round-trip', legendZh: '橙 = BF16 · 蓝 = FP8 · 虚线 = 往返',
      formulas: [
        { en: 'REAL ↔ FAKE: different paths', zh: '两条路都舍入 · 真实 ↔ 模拟：乘法路径不同' },
        { en: 'BASELINE ↔ FAKE → round-trip loss', zh: '基准 ↔ 模拟 → 往返舍入损失' },
        { en: 'Diff = output difference · unit unspecified', zh: 'Diff = 输出差异 · 单位未说明' },
        { en: 'reported: rounding loss dominates', zh: '文章结果：舍入损失为主' },
      ],
    },
  }, {
    caption: 'Matching FP8 schemes narrows the log-probability gap in published RL curves. The gap is not proven zero.',
    captionZh: '统一 FP8 后，公开 RL 曲线的 log probability 差距缩小。曲线不能证明差距为零。',
    title: 'Unified FP8 narrows the gap', titleZh: '统一 FP8 缩小差距',
    subtitle: 'unified FP8 = same format, scale type, and grouping on both sides',
    subtitleZh: '统一 FP8 = 两边使用相同格式、scale 类型和分组',
    foot: 'Published Qwen3 RL curves show narrower ranges, not exact reductions.',
    footZh: '公开 Qwen3 RL 曲线显示范围收窄，没有给出精确减少量。',
    legend: 'Orange = mixed schemes · blue = unified FP8 · bars show a constructed gap', legendZh: '橙 = 混合方案 · 蓝 = 统一 FP8 · 柱显示构造差距',
    desktopH: 540,
    nodes: [
      { title: 'MIXED SCHEMES', titleZh: '混合方案', result: 'BF16 train → FP8 rollout', resultZh: 'BF16 训练 → FP8 rollout', body: 'constructed gap = 0.08', bodyZh: '构造差距 = 0.08', tone: 'orange', compact: true, bar: 1 },
      { title: 'UNIFIED FP8', titleZh: '统一 FP8', result: 'FP8 train → FP8 rollout', resultZh: 'FP8 训练 → FP8 rollout', body: 'constructed gap = 0.04', bodyZh: '构造差距 = 0.04', tone: 'blue', compact: true, bar: 0.5 },
    ],
    formulas: [
      { en: 'log p = token likelihood score · gap = |train − rollout| for the same token', zh: 'log p = token 的可能性分数 · 差距 = 同一 token 的 |训练 − rollout|' },
      { en: 'constructed example: 0.08 → 0.04 · public direction: narrower', zh: '构造示例：0.08 → 0.04 · 公开曲线方向：收窄' },
      { en: 'the curves do not prove zero difference', zh: '曲线不能证明差距为零' },
      { en: `Next · INT4 = 4 bits · 2 B → ${N.INT4_WEIGHT_BYTES} B · save ${(N.INT4_PAYLOAD_SAVING_SHARE * 100).toFixed(0)}%`, zh: `下一章 · INT4 = 4 位 · 2 字节 → ${N.INT4_WEIGHT_BYTES} 字节 · 省 ${(N.INT4_PAYLOAD_SAVING_SHARE * 100).toFixed(0)}%` },
      { en: 'How does training learn around INT4 rounding?', zh: '训练怎样适应 INT4 舍入？' },
    ],
    mobile: {
      title: 'Unified FP8 narrows the gap', titleZh: '统一 FP8 缩小差距',
      subtitle: 'unified = same format, scale type, grouping', subtitleZh: '统一 = 相同格式、scale 类型和分组',
      foot: 'Published curves give direction, not exact reductions.', footZh: '公开曲线给出方向，没有精确减少量。',
      legend: 'Orange = mixed · blue = unified', legendZh: '橙 = 混合 · 蓝 = 统一 · 构造差距柱',
      formulas: [
        { en: 'log p = token likelihood score', zh: 'log p = token 的可能性分数' },
        { en: 'gap = |train − rollout| · same token', zh: '差距 = |训练 − rollout| · 同一 token' },
        { en: 'constructed: 0.08 → 0.04 · public: narrower', zh: '构造：0.08 → 0.04 · 公开：收窄' },
        { en: 'curves do not prove zero difference', zh: '曲线不能证明差距为零' },
        { en: `Next · INT4: 2 B → ${N.INT4_WEIGHT_BYTES} B · save ${(N.INT4_PAYLOAD_SAVING_SHARE * 100).toFixed(0)}%`, zh: `下一章 · INT4：2 字节 → ${N.INT4_WEIGHT_BYTES} 字节 · 省 ${(N.INT4_PAYLOAD_SAVING_SHARE * 100).toFixed(0)}%` },
        { en: 'How does training learn around INT4 rounding?', zh: '训练怎样适应 INT4 舍入？' },
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
  const start = $derived(cur.map ? 100 : 80);
  const formulas = $derived(phone && cur.mobile?.formulas ? cur.mobile.formulas : cur.formulas);
  const legendY = $derived(start + cur.nodes.length * 96 + 15 + formulas.length * 27);
  const H = $derived(phone ? legendY + 55 : (cur.desktopH ?? 500));
  const nodeW = (count: number) => count === 2 ? 260 : count === 3 ? 200 : 155;
  const nodeX = (i: number, count: number) => count === 2 ? 65 + i * 330 : count === 3 ? 35 + i * 225 : 25 + i * 175;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="fp8-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--line)" />
        </marker>
      </defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobile?.title ?? cur.title, cur.mobile?.titleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobile?.subtitle ?? cur.subtitle, cur.mobile?.subtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if cur.map}<text x={W / 2} y="80" text-anchor="middle" class="small">{phone ? t(cur.mobile?.map?.en ?? cur.map.en, cur.mobile?.map?.zh ?? cur.map.zh) : t(cur.map.en, cur.map.zh)}</text>{/if}
      {#if phone}
        {#each cur.nodes as node, i}
          {@const y = start + i * 96}
          <rect x="25" y={y} width="250" height="80" rx="11" fill={fill(node.tone)} stroke={stroke(node.tone)} />
          <text x="150" y={y + 20} text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x="150" y={y + 43} text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
          <text x="150" y={y + 64} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if node.bar !== undefined}
            <rect x="35" y={y + 72} width="230" height="5" rx="2" fill="var(--bg)" />
            <rect x="35" y={y + 72} width={230 * node.bar} height="5" rx="2" fill={stroke(node.tone)} />
          {/if}
          {#if cur.flow && i < cur.nodes.length - 1}
            <line x1="150" y1={y + 80} x2="150" y2={y + 92} stroke="var(--line)" stroke-width="2.5" marker-end="url(#fp8-arrow)" />
          {/if}
        {/each}
        {#each formulas as line, i}
          <text x="150" y={start + cur.nodes.length * 96 + 15 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
        <text x="150" y={legendY} text-anchor="middle" class="small">{t(cur.mobile?.legend ?? cur.legend, cur.mobile?.legendZh ?? cur.legendZh)}</text>
      {:else if cur.measure}
        {#each [0, 2] as group}
          {@const x = group === 0 ? 35 : 375}
          <rect x={x} y="90" width="310" height="240" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 155} y="122" text-anchor="middle" class="section">{group === 0 ? t('TOTAL TIME', '总时间') : t('PEAK MEMORY', '峰值显存')}</text>
          {#each [0, 1] as offset}
            {@const node = cur.nodes[group + offset]}
            {@const y = 151 + offset * 82}
            <text x={x + 20} y={y} class="small strong">{t(node.title, node.titleZh)}</text>
            <rect x={x + 20} y={y + 12} width="270" height="27" rx="5" fill="var(--bg)" stroke="var(--line)" />
            <rect x={x + 20} y={y + 12} width={270 * (node.bar ?? 1)} height="27" rx="5" fill={fill(node.tone)} stroke={stroke(node.tone)} />
            <text x={x + 155} y={y + 32} text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
          {/each}
        {/each}
        {#each cur.formulas as line, i}
          <text x="360" y={350 + i * 29} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
        <text x="360" y={H - 55} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
      {:else}
        {#each cur.nodes as node, i}
          {@const w = nodeW(cur.nodes.length)}
          {@const x = nodeX(i, cur.nodes.length)}
          <rect x={x} y="105" width={w} height="160" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.tone === 'plain' ? '5 4' : '0'} />
          <text x={x + w / 2} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={x + w / 2} y="180" text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
          <text x={x + w / 2} y={node.bar === undefined ? 222 : 211} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if node.bar !== undefined}
            <rect x={x + 10} y="237" width={w - 20} height="10" rx="3" fill="var(--bg)" />
            <rect x={x + 10} y="237" width={(w - 20) * node.bar} height="10" rx="3" fill={stroke(node.tone)} />
          {/if}
          {#if cur.flow && i < cur.nodes.length - 1}
            <line x1={x + w} y1="185" x2={nodeX(i + 1, cur.nodes.length)} y2="185" stroke="var(--line)" stroke-width="2.5" marker-end="url(#fp8-arrow)" />
          {/if}
        {/each}
        {#each cur.formulas as line, i}
          <text x="360" y={320 + i * 29} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
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
