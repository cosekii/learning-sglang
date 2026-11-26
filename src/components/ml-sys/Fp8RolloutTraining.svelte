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
  type Step = {
    caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string;
    foot: string; footZh: string; legend: string; legendZh: string; map?: { en: string; zh: string };
    nodes: Node[]; formulas: { en: string; zh: string }[]; flow?: boolean; measure?: boolean; desktopH?: number;
  };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  const steps: Step[] = [{
    caption: `FP8 stores each weight in 8 bits, half of BF16. Eligible weights drop from ${N.FP8_BF16_WEIGHT_GB} GB to ${N.FP8_WEIGHT_GB} GB.`,
    captionZh: `FP8 每个数占 8 位，只有 BF16 的一半。本例权重从 ${N.FP8_BF16_WEIGHT_GB} GB 降到 ${N.FP8_WEIGHT_GB} GB。`,
    title: 'FP8 halves the eligible weight bytes', titleZh: 'FP8 让可转换权重的字节数减半',
    subtitle: 'FP8 = 8 bits per value · BF16 = 16 bits', subtitleZh: 'FP8 = 每个数 8 位 · BF16 = 每个数 16 位',
    map: { en: 'CHAPTER MAP · rollout → training → export → compare', zh: '本章路线 · rollout → 训练 → 导出 → 对照' },
    foot: 'Constructed eligible-weight example; scales and every other tensor are excluded.',
    footZh: '构造的可转换权重算例；不含 scale 和其他张量。',
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
  }, {
    caption: 'One group shares a scale, its largest magnitude divided by 448. Rounding changes 3.2 to 3.142857.',
    captionZh: '一组数共用一个缩放因子。3.2 舍入后还原为约 3.142857。',
    title: 'One scale fits a group into FP8', titleZh: '一个 scale 把一组数装进 FP8',
    subtitle: 'scale = one shared divisor for a group of values', subtitleZh: 'scale = 一组数共用的除数',
    foot: 'Constructed example; 448 is the largest finite value in this FP8 format.',
    footZh: '构造算例；448 是这种 FP8 格式能表示的最大有限值。',
    legend: 'Orange = high-precision values · blue = FP8 values · dashed = scale', legendZh: '橙 = 高精度数值 · 蓝 = FP8 数值 · 虚线 = scale',
    flow: true,
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
    ],
  }, {
    caption: 'Rollout converts weights beforehand and activations when they appear. Some layers keep BF16.',
    captionZh: 'Rollout 提前转换权重，激活值现算现转。有些层仍用 BF16。',
    title: 'Rollout · 1 of 4: two inputs become FP8', titleZh: 'Rollout · 1/4：两类输入变成 FP8',
    subtitle: 'dynamic quantization = activations are scaled as computation creates them',
    subtitleZh: '动态量化 = 计算产生激活值时，再把它们缩放成 FP8',
    foot: 'Implementation path, not a rollout latency measurement.', footZh: '实现路径，不是 rollout 延迟实测。',
    legend: 'Orange = BF16 sources · blue = FP8 matrix multiplication', legendZh: '橙 = BF16 输入来源 · 蓝 = FP8 矩阵乘法',
    nodes: [
      { title: 'WEIGHTS', titleZh: '权重', result: 'BF16 → FP8 + scale', resultZh: 'BF16 → FP8 + scale', body: 'converted before rollout', bodyZh: 'rollout 前提前转换', tone: 'orange', compact: true },
      { title: 'ACTIVATIONS', titleZh: '激活值', result: 'BF16 → FP8', resultZh: 'BF16 → FP8', body: 'converted when created', bodyZh: '计算产生时再转换', tone: 'orange' },
      { title: 'MATRIX MULTIPLY', titleZh: '矩阵乘法', result: 'FP8 inputs', resultZh: 'FP8 输入', body: 'some layers stay BF16', bodyZh: '有些层仍用 BF16', tone: 'blue' },
    ],
    formulas: [
      { en: 'weights: offline conversion · save their scales too', zh: '权重：提前转换 · 同时保存 scale' },
      { en: 'activations = values made during compute · convert dynamically', zh: '激活值 = 计算时产生的值 · 出现时再转换' },
      { en: 'eligible matrix multiplies receive both FP8 inputs', zh: '可转换的矩阵乘法接收两类 FP8 输入' },
    ],
  }, {
    caption: 'Training uses FP8 matrix multiplies in forward and backward. Optimizer tables keep higher precision.',
    captionZh: '训练的前向和反向矩阵乘法可用 FP8。优化器表仍用高精度。',
    title: 'Training · 2 of 4: FP8 inside a mixed-precision model', titleZh: '训练 · 2/4：混合精度模型里的 FP8',
    subtitle: 'matrix multiply = multiply two tables of numbers · these inputs are FP8',
    subtitleZh: '矩阵乘法 = 两表数相乘 · 这里的输入是 FP8',
    foot: 'Implementation path, not a training measurement; exact flags are in the deep dive.',
    footZh: '实现路径，不是训练实测；精确参数见深入讲解。',
    legend: 'Orange = higher-precision state · blue = FP8 matrix multiplication', legendZh: '橙 = 高精度状态 · 蓝 = FP8 矩阵乘法',
    nodes: [
      { title: 'MODEL STATE', titleZh: '模型状态', result: 'BF16 + FP32', resultZh: 'BF16 + FP32', body: 'kept for training', bodyZh: '训练时继续保存', tone: 'orange' },
      { title: 'FP8 MULTIPLY', titleZh: 'FP8 矩阵乘法', result: 'forward + backward', resultZh: '前向 + 反向', body: 'quantize inputs when needed', bodyZh: '需要时才量化输入', tone: 'blue', compact: true },
      { title: 'OPTIMIZER STATE', titleZh: '优化器状态', result: 'higher precision', resultZh: '保持高精度', body: 'not halved by FP8', bodyZh: '不会因 FP8 减半', tone: 'orange', compact: true },
    ],
    formulas: [
      { en: 'FP8 region: eligible matrix multiplies only', zh: 'FP8 区域：仅限可支持的矩阵乘法' },
      { en: 'forward computes outputs · backward computes gradients', zh: '前向算输出 · 反向算梯度' },
      { en: 'Chapter 8 example: optimizer tables stay 48 GB, not 24 GB', zh: '第 8 章算例：优化器表仍是 48 GB，不是 24 GB' },
    ],
  }, {
    caption: 'The update path expands FP8 weights to BF16, then quantizes them again for rollout. Transfer time is unmeasured.',
    captionZh: '更新通道先把 FP8 权重还原为 BF16，再为 rollout 转成 FP8。传输耗时未测。',
    title: 'Export · 3 of 4: FP8 → BF16 → FP8', titleZh: '导出 · 3/4：FP8 → BF16 → FP8',
    subtitle: 'dequantize = restore BF16 values from FP8 values and scales',
    subtitleZh: '反量化 = 用 FP8 数值和 scale 还原 BF16 数值',
    foot: 'Documented update path; scales, exclusions and transfer time are not measured here.',
    footZh: '文档中的更新路径；这里不测量 scale、排除项和传输时间。',
    legend: 'Orange = BF16 · blue = FP8', legendZh: '橙 = BF16 · 蓝 = FP8',
    flow: true,
    nodes: [
      { title: 'TRAINING FP8', titleZh: '训练端 FP8', result: 'weights', resultZh: '权重', body: 'start here', bodyZh: '从这里开始', tone: 'blue' },
      { title: 'BF16', titleZh: 'BF16', result: 'dequantize', resultZh: '反量化', body: 'expand to 16 bits', bodyZh: '还原成 16 位', tone: 'orange' },
      { title: 'ROLLOUT FP8', titleZh: 'ROLLOUT FP8', result: 'quantize again', resultZh: '再次量化', body: 'eligible weights only', bodyZh: '仅限可转换权重', tone: 'blue', compact: true },
    ],
    formulas: [
      { en: 'eligible values P: FP8 raw payload = P bytes', zh: '可转换数值 P：FP8 原始负载 = P 字节' },
      { en: 'the same P values in BF16 = 2P bytes', zh: '同样的 P 个数值，BF16 = 2P 字节' },
      { en: 'scales + excluded tensors are extra · transfer time unknown', zh: 'scale 和未转换张量另算 · 传输时间未知' },
    ],
  }, {
    caption: `One public non-RL run saved ${N.FP8_PUBLIC_TIME_SAVED_MS} ms and ${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} GB. Those gains are ${pct(N.FP8_PUBLIC_TIME_SAVED_SHARE)} and ${pct(N.FP8_PUBLIC_MEMORY_SAVED_SHARE)}, not half.`,
    captionZh: `一次公开非 RL 训练省下 ${N.FP8_PUBLIC_TIME_SAVED_MS} ms 和 ${N.FP8_PUBLIC_MEMORY_SAVED_GB.toFixed(1)} GB。收益是 ${pct(N.FP8_PUBLIC_TIME_SAVED_SHARE)} 和 ${pct(N.FP8_PUBLIC_MEMORY_SAVED_SHARE)}，不是减半。`,
    title: 'Compare · 4 of 4: measured gains are uneven', titleZh: '对照 · 4/4：实测收益并不一致',
    subtitle: 'public non-RL training measurement · same model and settings on both sides',
    subtitleZh: '公开非 RL 训练实测 · 两边使用同一模型和设置',
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
      { en: `forward: ${N.FP8_PUBLIC_FORWARD_BF16_MS} → ${N.FP8_PUBLIC_FORWARD_FP8_MS} ms`, zh: `前向：${N.FP8_PUBLIC_FORWARD_BF16_MS} → ${N.FP8_PUBLIC_FORWARD_FP8_MS} ms` },
      { en: `backward: ${N.FP8_PUBLIC_BACKWARD_BF16_MS.toLocaleString('en-US')} → ${N.FP8_PUBLIC_BACKWARD_FP8_MS.toLocaleString('en-US')} ms`, zh: `反向：${N.FP8_PUBLIC_BACKWARD_BF16_MS.toLocaleString('en-US')} → ${N.FP8_PUBLIC_BACKWARD_FP8_MS.toLocaleString('en-US')} ms` },
    ],
  }, {
    caption: 'Real and fake FP8 separate kernel effects from rounding loss. The source attributes most error to rounding.',
    captionZh: '真实与模拟 FP8 分开看 kernel 和舍入误差。误差主要来自舍入。',
    title: 'Compare: separate kernel effects from rounding loss', titleZh: '对照：分清 kernel 和舍入带来的误差',
    subtitle: 'fake quantization = BF16 → FP8 → BF16', subtitleZh: '模拟量化 = BF16 → FP8 → BF16',
    foot: 'Qwen3-4B, one H800, RL Steps 0 and 1; comparison claims follow the article.',
    footZh: 'Qwen3-4B，一张 H800，RL 第 0、1 步；对照结论来自文章。',
    legend: 'Orange = BF16 compute · blue = FP8 compute · dashed = round-trip', legendZh: '橙 = BF16 计算 · 蓝 = FP8 计算 · 虚线 = 往返转换',
    nodes: [
      { title: 'BF16 BASELINE', titleZh: 'BF16 基准', result: 'BF16 inputs', resultZh: 'BF16 输入', body: 'BF16 matrix multiply', bodyZh: 'BF16 矩阵乘法', tone: 'orange', compact: true },
      { title: 'REAL FP8', titleZh: '真实 FP8', result: 'FP8 inputs', resultZh: 'FP8 输入', body: 'FP8 matrix multiply', bodyZh: 'FP8 矩阵乘法', tone: 'blue', compact: true },
      { title: 'FAKE FP8', titleZh: '模拟 FP8', result: 'BF16 → FP8 → BF16', resultZh: 'BF16 → FP8 → BF16', body: 'then BF16 multiply', bodyZh: '再做 BF16 矩阵乘法', tone: 'plain', compact: true },
    ],
    formulas: [
      { en: 'REAL ↔ FAKE → FP8 kernel implementation', zh: '真实 ↔ 模拟 → FP8 kernel 实现差异' },
      { en: 'BASELINE ↔ FAKE → quantization round-trip loss', zh: '基准 ↔ 模拟 → 量化往返的舍入损失' },
      { en: 'reported: rounding loss dominates · kernel difference is small', zh: '文章结果：舍入损失为主 · kernel 差异较小' },
    ],
  }, {
    caption: 'Matching FP8 schemes narrows the log-probability gap in published RL curves. The gap is not proven zero.',
    captionZh: '统一 FP8 后，公开 RL 曲线的 log probability 差缩小。它没有变成已证明的零。',
    title: 'Unified FP8 narrows the gap', titleZh: '统一 FP8 缩小差距',
    subtitle: 'unified FP8 = training and rollout use the same FP8 scheme',
    subtitleZh: '统一 FP8 = 训练和 rollout 使用同一种 FP8 方案',
    foot: 'Published Qwen3 RL curves show narrower ranges, not exact reductions.',
    footZh: '公开 Qwen3 RL 曲线显示范围收窄，没有给出精确减少量。',
    legend: 'Orange = mixed schemes · blue = unified FP8', legendZh: '橙 = 混合方案 · 蓝 = 统一 FP8',
    desktopH: 540,
    nodes: [
      { title: 'MIXED SCHEMES', titleZh: '混合方案', result: 'BF16 train → FP8 rollout', resultZh: 'BF16 训练 → FP8 rollout', body: 'different quantization paths', bodyZh: '两边量化路径不同', tone: 'orange', compact: true },
      { title: 'UNIFIED FP8', titleZh: '统一 FP8', result: 'FP8 train → FP8 rollout', resultZh: 'FP8 训练 → FP8 rollout', body: 'same scheme on both sides', bodyZh: '两边使用同一方案', tone: 'blue', compact: true },
    ],
    formulas: [
      { en: 'published RL result: the log-probability gap becomes narrower', zh: '公开 RL 结果：log probability 差距缩小' },
      { en: 'the curves do not prove zero difference or bitwise equality', zh: '曲线没有证明差异为零或逐位相等' },
      { en: `Next · INT4 = 4 bits per weight · 2 B → ${N.INT4_WEIGHT_BYTES} B`, zh: `下一章 · INT4 = 每个权重 4 位 · 2 字节 → ${N.INT4_WEIGHT_BYTES} 字节` },
      { en: `${N.INT4_WEIGHT_BYTES} ÷ 2 = 25% of bytes · save ${(N.INT4_PAYLOAD_SAVING_SHARE * 100).toFixed(0)}%`, zh: `${N.INT4_WEIGHT_BYTES} ÷ 2 = 原字节的 25% · 省下 ${(N.INT4_PAYLOAD_SAVING_SHARE * 100).toFixed(0)}%` },
      { en: 'How does training learn around INT4 rounding?', zh: '训练怎样适应 INT4 舍入？' },
    ],
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
  const legendY = $derived(start + cur.nodes.length * 96 + 15 + cur.formulas.length * 27);
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
      <text x={phone ? 18 : 36} y="30" class="title">{t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{t(cur.subtitle, cur.subtitleZh)}</text>
      {#if cur.map}<text x={W / 2} y="80" text-anchor="middle" class="small">{t(cur.map.en, cur.map.zh)}</text>{/if}
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
        {#each cur.formulas as line, i}
          <text x="150" y={start + cur.nodes.length * 96 + 15 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
        {/each}
        <text x="150" y={legendY} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
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
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(cur.foot, cur.footZh)}</text>
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
