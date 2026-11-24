<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { DEMO_REQUEST_SENT_MS, DEMO_FIRST_TOKEN_MS, DEMO_TTFT_MS, DEMO_TTFT_SECONDS, DEMO_TTFT_FRACTION } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `One request waits ${DEMO_TTFT_MS} ms for its first token. That wait is called TTFT.`,
    captionZh: `一个请求等 ${DEMO_TTFT_MS} ms 才看到首个 token。这段等待叫 TTFT。`,
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 390 : 400);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="TTFT is the 250 millisecond wait from sending a request to seeing its first token">
      <defs>
        <marker id="ttft-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if !phone}
        <text x="35" y="34" class="rowlabel">{t('One request · one wait to measure', '一个请求 · 先量第一段等待')}</text>
        <rect x="40" y="75" width="170" height="88" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="125" y="110" text-anchor="middle" class="legend strong">{t('request sent', '请求发出')}</text>
        <text x="125" y="140" text-anchor="middle" class="time">{DEMO_REQUEST_SENT_MS} ms</text>
        <rect x="510" y="75" width="170" height="88" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="595" y="105" text-anchor="middle" class="legend strong">{t('first token appears', '首个 token 出现')}</text>
        <text x="595" y="140" text-anchor="middle" class="time">{DEMO_FIRST_TOKEN_MS} ms</text>
        <line x1="210" y1="119" x2="500" y2="119" stroke="var(--accent)" stroke-width="5" marker-end="url(#ttft-arrow)" />
        <text x="355" y="94" text-anchor="middle" class="tag strong">{t('waiting, including queue + prefill', '等待（含排队与 prefill）')}</text>
        <rect x="180" y="202" width="360" height="108" rx="14" fill="var(--accent-soft)" />
        <text x="360" y="246" text-anchor="middle" class="formula">TTFT = {DEMO_FIRST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS} = {DEMO_TTFT_MS} ms</text>
        <text x="360" y="283" text-anchor="middle" class="legend strong">{DEMO_TTFT_MS} ms = {DEMO_TTFT_SECONDS.toFixed(3)} {t('seconds', '秒')} = {DEMO_TTFT_FRACTION} {t('second', '秒')}</text>
        <line x1="245" y1="337" x2="295" y2="337" stroke="var(--accent)" stroke-width="5" />
        <text x="310" y="342" class="legend">{t('blue = the wait called TTFT', '蓝色 = 叫 TTFT 的这段等待')}</text>
      {:else}
        <text x="20" y="28" class="rowlabel">{t('One request · first-token wait', '一个请求 · 首 token 等待')}</text>
        <rect x="20" y="48" width="260" height="62" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="150" y="75" text-anchor="middle" class="legend strong">{t('request sent', '请求发出')}</text>
        <text x="150" y="99" text-anchor="middle" class="time">{DEMO_REQUEST_SENT_MS} ms</text>
        <line x1="150" y1="112" x2="150" y2="174" stroke="var(--accent)" stroke-width="5" marker-end="url(#ttft-arrow)" />
        <text x="166" y="140" class="tag strong">TTFT</text>
        <text x="166" y="158" class="tag">{t('queue + prefill', '含排队与 prefill')}</text>
        <rect x="20" y="182" width="260" height="62" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="150" y="207" text-anchor="middle" class="legend strong">{t('first token appears', '首个 token 出现')}</text>
        <text x="150" y="232" text-anchor="middle" class="time">{DEMO_FIRST_TOKEN_MS} ms</text>
        <rect x="20" y="266" width="260" height="78" rx="12" fill="var(--accent-soft)" />
        <text x="150" y="295" text-anchor="middle" class="formula small">TTFT = {DEMO_FIRST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS}</text>
        <text x="150" y="321" text-anchor="middle" class="formula small">= {DEMO_TTFT_MS} ms = {DEMO_TTFT_FRACTION} {t('second', '秒')}</text>
        <text x="150" y="365" text-anchor="middle" class="legend">{t('blue = wait for the first token', '蓝色 = 等首个 token 的时间')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed teaching example, not a local benchmark.', '构造的教学例子，不是本机实测。')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .time { font-family: var(--mono); font-size: 18px; font-weight: 650; fill: var(--fg); }
  .formula { font-family: var(--mono); font-size: 20px; font-weight: 650; fill: var(--accent); }
  .formula.small { font-size: 16px; }
  .legend.strong { font-weight: 650; }
  @media (max-width: 600px) {
    .time { font-size: 16px; }
    .rowlabel, .tag, .legend, .footnote { font-size: 12px; }
  }
</style>
