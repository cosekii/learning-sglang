<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { COMM_EXAMPLE_COMPUTE_BEFORE_MS, COMM_EXAMPLE_COMPUTE_AFTER_MS, COMM_EXAMPLE_WAIT_BEFORE_MS, COMM_EXAMPLE_WAIT_AFTER_MS, COMM_EXAMPLE_TOTAL_BEFORE_MS, COMM_EXAMPLE_TOTAL_AFTER_MS, COMM_EXAMPLE_COMPUTE_SAVED_MS, COMM_EXAMPLE_WAIT_ADDED_MS, COMM_EXAMPLE_TOTAL_ADDED_MS } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `Compute halves to ${COMM_EXAMPLE_COMPUTE_AFTER_MS} ms, but communication grows from ${COMM_EXAMPLE_WAIT_BEFORE_MS} ms to ${COMM_EXAMPLE_WAIT_AFTER_MS} ms. Total time rises by ${COMM_EXAMPLE_TOTAL_ADDED_MS} ms.`,
    captionZh: `计算从 ${COMM_EXAMPLE_COMPUTE_BEFORE_MS} ms 减到 ${COMM_EXAMPLE_COMPUTE_AFTER_MS} ms，通信却从 ${COMM_EXAMPLE_WAIT_BEFORE_MS} ms 增到 ${COMM_EXAMPLE_WAIT_AFTER_MS} ms。总时间多了 ${COMM_EXAMPLE_TOTAL_ADDED_MS} ms。`,
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 510 : 410);
  const barScale = 22;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('A constructed example where more GPUs reduce compute time but add more communication time.', '构造例子：更多 GPU 减少计算时间，却增加更多通信时间。')}>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t('More GPUs can still finish later', 'GPU 更多，总时间也可能更长')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t('constructed example · same work · same millisecond scale', '构造示例 · 同一份计算 · 同一把毫秒标尺')}</text>
        {#if !phone}
          {#each [{ x: 40, gpus: 4, compute: COMM_EXAMPLE_COMPUTE_BEFORE_MS, wait: COMM_EXAMPLE_WAIT_BEFORE_MS, total: COMM_EXAMPLE_TOTAL_BEFORE_MS }, { x: 380, gpus: 8, compute: COMM_EXAMPLE_COMPUTE_AFTER_MS, wait: COMM_EXAMPLE_WAIT_AFTER_MS, total: COMM_EXAMPLE_TOTAL_AFTER_MS }] as row}
            <rect x={row.x} y="82" width="300" height="196" rx="13" fill="var(--bg)" stroke="var(--line)" />
            <text x={row.x + 20} y="113" class="section">{row.gpus} GPUs</text>
            <text x={row.x + 20} y="145" class="small">{t('compute', '计算')} · {row.compute} ms</text>
            <rect x={row.x + 20} y="158" width={row.compute * barScale} height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={row.x + 20} y="215" class="small">{t('communication', '通信')} · {row.wait} ms</text>
            <rect x={row.x + 20} y="228" width={row.wait * barScale} height="32" rx="5" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={row.x + 280} y="113" text-anchor="end" class="total">{row.total} ms</text>
          {/each}
          <rect x="40" y="300" width="640" height="62" rx="11" fill="var(--panel)" stroke="var(--line)" />
          <text x="360" y="326" text-anchor="middle" class="result">4 → 8 GPUs: −{COMM_EXAMPLE_COMPUTE_SAVED_MS} ms {t('compute', '计算')} · +{COMM_EXAMPLE_WAIT_ADDED_MS} ms {t('communication', '通信')} · +{COMM_EXAMPLE_TOTAL_ADDED_MS} ms {t('total', '总时间')}</text>
          <text x="360" y="350" text-anchor="middle" class="small">{t('communication = moving tensors between GPUs and waiting', '通信 = 在 GPU 之间搬张量，并等它到齐')}</text>
          <text x="60" y="385" class="small"><tspan fill="var(--accent)">■</tspan> {t('compute', '计算')}   <tspan fill="var(--gen)">■</tspan> {t('communication', '通信')}</text>
        {:else}
          {#each [{ y: 76, gpus: 4, compute: COMM_EXAMPLE_COMPUTE_BEFORE_MS, wait: COMM_EXAMPLE_WAIT_BEFORE_MS, total: COMM_EXAMPLE_TOTAL_BEFORE_MS }, { y: 246, gpus: 8, compute: COMM_EXAMPLE_COMPUTE_AFTER_MS, wait: COMM_EXAMPLE_WAIT_AFTER_MS, total: COMM_EXAMPLE_TOTAL_AFTER_MS }] as row}
            <rect x="18" y={row.y} width="264" height="154" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={row.y + 27} class="section">{row.gpus} GPUs</text>
            <text x="266" y={row.y + 27} text-anchor="end" class="total">{row.total} ms</text>
            <text x="32" y={row.y + 55} class="small">{t('compute', '计算')} {row.compute} ms</text>
            <rect x="32" y={row.y + 65} width={row.compute * 13} height="22" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="32" y={row.y + 111} class="small">{t('communication', '通信')} {row.wait} ms</text>
            <rect x="32" y={row.y + 121} width={row.wait * 13} height="22" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
          {/each}
          <text x="150" y="427" text-anchor="middle" class="result">−{COMM_EXAMPLE_COMPUTE_SAVED_MS} ms {t('compute', '计算')} · +{COMM_EXAMPLE_WAIT_ADDED_MS} ms {t('communication', '通信')}</text>
          <text x="150" y="453" text-anchor="middle" class="result">{t('total', '总时间')} +{COMM_EXAMPLE_TOTAL_ADDED_MS} ms</text>
          <text x="150" y="479" text-anchor="middle" class="small">{t('communication moves tensors and waits', '通信要搬张量，也要等待')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Teaching values, not a local benchmark.', '构造的教学数值，不是本机实测。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .section { font-family: var(--mono); font-size: 17px; font-weight: 700; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .total { font-family: var(--mono); font-size: 18px; font-weight: 700; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section, .total { font-size: 15px; }
    .result { font-size: 13px; }
  }
</style>
