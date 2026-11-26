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
          <text x="360" y={366 + i * 31} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>
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
