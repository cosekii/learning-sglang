<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { DEMO_REQUEST_SENT_MS, DEMO_FIRST_TOKEN_MS, DEMO_TTFT_MS, DEMO_TTFT_SECONDS, DEMO_TTFT_FRACTION, DEMO_OUTPUT_TOKEN_TIMES_MS, DEMO_ITL_GAPS_MS, DEMO_POST_FIRST_GAP_COUNT, DEMO_ITL_TOTAL_MS, DEMO_TPOT_MS, DEMO_LAST_TOKEN_MS, DEMO_E2E_MS, DEMO_SORTED_E2E_MS, DEMO_PERCENTILE_REQUEST_COUNT, DEMO_P50_RANK, DEMO_P50_MS, DEMO_AT_MOST_P50_COUNT, DEMO_P99_RANK, DEMO_P99_MS, DEMO_AT_MOST_P99_COUNT, DEMO_SLOWEST_E2E_MS, DEMO_SLOWEST_OVER_P50, DEMO_SLOWEST_OVER_P99_MS } from '../../ml-sys/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `One request waits ${DEMO_TTFT_MS} ms for its first token. That wait is called TTFT.`,
    captionZh: `一个请求等 ${DEMO_TTFT_MS} ms 才看到首个 token。这段等待叫 TTFT。`,
  }, {
    caption: `After the first token, measure each gap between neighboring tokens. Each gap is called ITL.`,
    captionZh: `首个 token 后，量相邻两个 token 的间隔。每段间隔叫 ITL。`,
  }, {
    caption: `TPOT averages the gaps after the first token. It excludes TTFT.`,
    captionZh: `TPOT 是首个 token 后的平均间隔。它不含首个 token 前的 TTFT。`,
  }, {
    caption: `E2E latency runs from request sent to completion. Here, ${DEMO_TTFT_MS} ms TTFT plus ${DEMO_ITL_TOTAL_MS} ms afterward gives ${DEMO_E2E_MS} ms.`,
    captionZh: `E2E 总延迟从发出算到完成。这里共 ${DEMO_TTFT_MS} + ${DEMO_ITL_TOTAL_MS} = ${DEMO_E2E_MS} ms。`,
  }, {
    caption: `Sort ${DEMO_PERCENTILE_REQUEST_COUNT} requests by E2E latency. P50 is ${DEMO_P50_MS} ms; the slowest waits ${DEMO_SLOWEST_E2E_MS} ms.`,
    captionZh: `把 ${DEMO_PERCENTILE_REQUEST_COUNT} 个请求按总延迟排队。P50 是 ${DEMO_P50_MS} ms，最慢要等 ${DEMO_SLOWEST_E2E_MS} ms。`,
  }, {
    caption: `In the same queue, P99 is request #${DEMO_P99_RANK}'s latency: ${DEMO_P99_MS} ms. The slowest request takes ${DEMO_SLOWEST_E2E_MS} ms.`,
    captionZh: `同一排请求中，P99 取第 ${DEMO_P99_RANK} 个的总延迟：${DEMO_P99_MS} ms。最慢的第 ${DEMO_PERCENTILE_REQUEST_COUNT} 个要等 ${DEMO_SLOWEST_E2E_MS} ms。`,
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
  const percentileName = $derived(step === 4 ? 'P50' : 'P99');
  const percentileRank = $derived(step === 4 ? DEMO_P50_RANK : DEMO_P99_RANK);
  const percentileMs = $derived(step === 4 ? DEMO_P50_MS : DEMO_P99_MS);
  const atMostPercentileCount = $derived(step === 4 ? DEMO_AT_MOST_P50_COUNT : DEMO_AT_MOST_P99_COUNT);
  const percentileBarX = $derived((phone ? 40 : 60) + (percentileRank - 1) * (phone ? 2.4 : 6) + (phone ? 0.8 : 2));
  const percentileLabelX = $derived(step === 4 ? percentileBarX : phone ? 235 : 620);
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 0 ? 390 : step === 2 ? 550 : step >= 4 ? 490 : 500) : (step >= 4 ? 470 : 400));
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? 'TTFT is the 250 millisecond wait from sending a request to seeing its first token' : step === 1 ? 'ITL is each time gap between neighboring output tokens' : step === 2 ? `TPOT is the ${DEMO_TPOT_MS} millisecond average gap after the first token` : step === 3 ? `E2E latency is ${DEMO_E2E_MS} milliseconds from request sent to completion` : step === 4 ? `Across ${DEMO_PERCENTILE_REQUEST_COUNT} sorted requests, P50 is ${DEMO_P50_MS} milliseconds and the slowest is ${DEMO_SLOWEST_E2E_MS} milliseconds` : `Across ${DEMO_PERCENTILE_REQUEST_COUNT} sorted requests, P99 is request ${DEMO_P99_RANK} at ${DEMO_P99_MS} milliseconds and the slowest is ${DEMO_SLOWEST_E2E_MS} milliseconds`}>
      <defs>
        <marker id="ttft-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
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
      {:else if step < 3}
      {#if !phone}
        <text x="35" y="34" class="rowlabel">{t('Same request · time since request sent', '同一个请求 · 从请求发出计时')}</text>
        {#each DEMO_OUTPUT_TOKEN_TIMES_MS as time, i}
          {@const x = 35 + i * 180}
          <rect x={x} y="95" width="110" height="80" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 55} y="123" text-anchor="middle" class="legend strong">token {i + 1}</text>
          <text x={x + 55} y="154" text-anchor="middle" class="time">{time} ms</text>
          {#if i < DEMO_ITL_GAPS_MS.length}
            <line x1={x + 110} y1="135" x2={x + 170} y2="135" stroke="var(--accent)" stroke-width="5" marker-end="url(#ttft-arrow)" />
            <text x={x + 145} y="75" text-anchor="middle" class="tag strong">{DEMO_ITL_GAPS_MS[i]} ms</text>
          {/if}
        {/each}
        <rect x="110" y="215" width="500" height="108" rx="14" fill="var(--accent-soft)" />
        {#if step === 1}
          <text x="360" y="254" text-anchor="middle" class="formula small">{t('ITL = next token time − previous token time', 'ITL = 后一个时刻 − 前一个时刻')}</text>
          <text x="360" y="292" text-anchor="middle" class="legend strong">{t('Gap 3:', '第 3 段：')} {DEMO_OUTPUT_TOKEN_TIMES_MS[3]} − {DEMO_OUTPUT_TOKEN_TIMES_MS[2]} = {DEMO_ITL_GAPS_MS[2]} ms</text>
        {:else}
          <text x="360" y="254" text-anchor="middle" class="formula small">TPOT = ({DEMO_ITL_GAPS_MS.join(' + ')}) ÷ {DEMO_POST_FIRST_GAP_COUNT} = {DEMO_TPOT_MS} ms</text>
          <text x="360" y="292" text-anchor="middle" class="legend strong">({DEMO_OUTPUT_TOKEN_TIMES_MS[3]} − {DEMO_OUTPUT_TOKEN_TIMES_MS[0]}) ÷ ({DEMO_OUTPUT_TOKEN_TIMES_MS.length} − 1) = {DEMO_TPOT_MS} ms</text>
        {/if}
        <line x1="190" y1="351" x2="240" y2="351" stroke="var(--accent)" stroke-width="5" />
        <text x="255" y="356" class="legend">{step === 1 ? t('blue = each gap called ITL', '蓝色 = 每段叫 ITL 的间隔') : t('blue = gaps after token 1; average does not mean equal', '蓝色 = 首个 token 后的间隔；平均不代表每段相同')}</text>
      {:else}
        <text x="20" y="25" class="rowlabel">{t('Time since request sent', '从请求发出计时')}</text>
        {#each DEMO_OUTPUT_TOKEN_TIMES_MS as time, i}
          {@const y = 42 + i * 90}
          <rect x="45" y={y} width="170" height="48" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="130" y={y + 20} text-anchor="middle" class="legend strong">token {i + 1}</text>
          <text x="130" y={y + 40} text-anchor="middle" class="time">{time} ms</text>
          {#if i < DEMO_ITL_GAPS_MS.length}
            <line x1="130" y1={y + 48} x2="130" y2={y + 82} stroke="var(--accent)" stroke-width="5" marker-end="url(#ttft-arrow)" />
            <text x="147" y={y + 71} class="tag strong">{DEMO_ITL_GAPS_MS[i]} ms</text>
          {/if}
        {/each}
        {#if step === 1}
          <text x="150" y="405" text-anchor="middle" class="legend strong">{t('ITL = next time − previous time', 'ITL = 后一个时刻 − 前一个时刻')}</text>
          <text x="150" y="435" text-anchor="middle" class="legend">{t('Gap 3:', '第 3 段：')} {DEMO_OUTPUT_TOKEN_TIMES_MS[3]} − {DEMO_OUTPUT_TOKEN_TIMES_MS[2]} = {DEMO_ITL_GAPS_MS[2]} ms</text>
          <text x="150" y="465" text-anchor="middle" class="legend">{t('blue = each gap called ITL', '蓝色 = 每段叫 ITL 的间隔')}</text>
        {:else}
          <text x="150" y="400" text-anchor="middle" class="legend strong">{t('TPOT = average gap after token 1', 'TPOT = 首个 token 后的平均间隔')}</text>
          <text x="150" y="432" text-anchor="middle" class="legend">({DEMO_ITL_GAPS_MS.join(' + ')}) ÷ {DEMO_POST_FIRST_GAP_COUNT} = {DEMO_TPOT_MS} ms</text>
          <text x="150" y="464" text-anchor="middle" class="legend">({DEMO_OUTPUT_TOKEN_TIMES_MS[3]} − {DEMO_OUTPUT_TOKEN_TIMES_MS[0]}) ÷ ({DEMO_OUTPUT_TOKEN_TIMES_MS.length} − 1) = {DEMO_TPOT_MS} ms</text>
          <text x="150" y="505" text-anchor="middle" class="legend">{t(`blue = ${DEMO_POST_FIRST_GAP_COUNT} gaps; average does not mean equal`, `蓝色 = ${DEMO_POST_FIRST_GAP_COUNT} 段；平均不代表每段相同`)}</text>
        {/if}
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed teaching example, not a local benchmark.', '构造的教学例子，不是本机实测。')}</text>
      {:else if step === 3}
      {#if !phone}
        <text x="35" y="34" class="rowlabel">{t('Same request · how long is the whole wait?', '同一个请求 · 全程要等多久？')}</text>
        <text x="360" y="55" text-anchor="middle" class="tag strong">E2E = {t('request sent → completion', '请求发出 → 全部完成')} = {DEMO_E2E_MS} ms</text>
        <line x1="115" y1="72" x2="595" y2="72" stroke="var(--accent)" stroke-width="6" marker-end="url(#ttft-arrow)" />
        <line x1="115" y1="72" x2="115" y2="100" stroke="var(--accent)" stroke-width="3" />
        <rect x="40" y="100" width="150" height="90" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="115" y="137" text-anchor="middle" class="legend strong">{t('request sent', '请求发出')}</text>
        <text x="115" y="169" text-anchor="middle" class="time">{DEMO_REQUEST_SENT_MS} ms</text>
        <rect x="285" y="100" width="150" height="90" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="360" y="137" text-anchor="middle" class="legend strong">token 1</text>
        <text x="360" y="169" text-anchor="middle" class="time">{DEMO_FIRST_TOKEN_MS} ms</text>
        <line x1="605" y1="72" x2="605" y2="100" stroke="var(--accent)" stroke-width="3" />
        <rect x="530" y="100" width="150" height="90" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="605" y="126" text-anchor="middle" class="legend strong">{t('last token', '末个 token')}</text>
        <text x="605" y="148" text-anchor="middle" class="legend">{t('request complete', '请求完成')}</text>
        <text x="605" y="176" text-anchor="middle" class="time">{DEMO_LAST_TOKEN_MS} ms</text>
        <line x1="115" y1="190" x2="115" y2="220" stroke="var(--accent)" stroke-width="3" />
        <line x1="360" y1="190" x2="360" y2="220" stroke="var(--accent)" stroke-width="3" />
        <line x1="605" y1="190" x2="605" y2="220" stroke="var(--accent)" stroke-width="3" />
        <line x1="115" y1="220" x2="360" y2="220" stroke="var(--accent)" stroke-width="4" />
        <line x1="360" y1="220" x2="605" y2="220" stroke="var(--accent)" stroke-width="4" />
        <text x="237" y="249" text-anchor="middle" class="legend strong">TTFT = {DEMO_TTFT_MS} ms</text>
        <text x="482" y="249" text-anchor="middle" class="legend strong">{t('after token 1', '首个 token 后')} = {DEMO_ITL_TOTAL_MS} ms</text>
        <rect x="100" y="278" width="520" height="78" rx="14" fill="var(--accent-soft)" />
        <text x="360" y="309" text-anchor="middle" class="formula small">E2E = {DEMO_LAST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS} = {DEMO_TTFT_MS} + {DEMO_ITL_TOTAL_MS} = {DEMO_E2E_MS} ms</text>
        <text x="360" y="339" text-anchor="middle" class="legend strong">{DEMO_ITL_TOTAL_MS} ms = {DEMO_ITL_GAPS_MS.join(' + ')} ({t('three ITL gaps', '三段 ITL')})</text>
      {:else}
        <text x="20" y="14" class="rowlabel">{t('Same request · how long in total?', '同一个请求 · 全程要等多久？')}</text>
        <text x="20" y="35" class="rowlabel">E2E = {t('request sent → completion', '请求发出 → 全部完成')}</text>
        <line x1="30" y1="76" x2="30" y2="310" stroke="var(--accent)" stroke-width="5" />
        <line x1="30" y1="76" x2="45" y2="76" stroke="var(--accent)" stroke-width="3" />
        <line x1="30" y1="310" x2="45" y2="310" stroke="var(--accent)" stroke-width="3" />
        <rect x="55" y="45" width="190" height="62" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="150" y="70" text-anchor="middle" class="legend strong">{t('request sent', '请求发出')}</text>
        <text x="150" y="95" text-anchor="middle" class="time">{DEMO_REQUEST_SENT_MS} ms</text>
        <line x1="150" y1="107" x2="150" y2="151" stroke="var(--accent)" stroke-width="4" marker-end="url(#ttft-arrow)" />
        <text x="166" y="135" class="tag strong">TTFT = {DEMO_TTFT_MS} ms</text>
        <rect x="55" y="159" width="190" height="62" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="150" y="184" text-anchor="middle" class="legend strong">token 1</text>
        <text x="150" y="209" text-anchor="middle" class="time">{DEMO_FIRST_TOKEN_MS} ms</text>
        <line x1="150" y1="221" x2="150" y2="265" stroke="var(--accent)" stroke-width="4" marker-end="url(#ttft-arrow)" />
        <text x="166" y="249" class="tag strong">{t('after token 1', '首个 token 后')} = {DEMO_ITL_TOTAL_MS} ms</text>
        <rect x="55" y="273" width="190" height="74" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="150" y="298" text-anchor="middle" class="legend strong">{t('last token · complete', '末个 token · 完成')}</text>
        <text x="150" y="328" text-anchor="middle" class="time">{DEMO_LAST_TOKEN_MS} ms</text>
        <rect x="20" y="365" width="260" height="82" rx="12" fill="var(--accent-soft)" />
        <text x="150" y="392" text-anchor="middle" class="formula small">E2E = {DEMO_LAST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS} = {DEMO_E2E_MS} ms</text>
        <text x="150" y="417" text-anchor="middle" class="legend strong">= TTFT {DEMO_TTFT_MS} + {DEMO_ITL_TOTAL_MS}</text>
        <text x="150" y="438" text-anchor="middle" class="legend">{DEMO_ITL_TOTAL_MS} ms = {DEMO_ITL_GAPS_MS.join(' + ')} ({t('three ITL gaps', '三段 ITL')})</text>
        <text x="150" y="470" text-anchor="middle" class="legend">{t('blue = measured time spans', '蓝色 = 量出的时间段')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed teaching example, not a local benchmark.', '构造的教学例子，不是本机实测。')}</text>
      {:else}
      {#if !phone}
        <text x="35" y="26" class="rowlabel">{t(`${DEMO_PERCENTILE_REQUEST_COUNT} requests · E2E shortest to longest (ms)`, `${DEMO_PERCENTILE_REQUEST_COUNT} 个请求 · 总延迟从短到长（ms）`)}</text>
        <text x="35" y="50" class="legend strong">{t(`${percentileName} = request #${percentileRank}'s E2E latency here`, `${percentileName} = 本图第 ${percentileRank} 个请求的总延迟`)}</text>
        <text x="360" y="76" text-anchor="middle" class="legend">{t('blue = one request’s E2E latency', '蓝色 = 一个请求的总延迟')}</text>
        {#each [DEMO_SLOWEST_E2E_MS, DEMO_SLOWEST_E2E_MS / 2, 0] as tick}
          {@const y = 290 - (tick / DEMO_SLOWEST_E2E_MS) * 195}
          <line x1="60" y1={y} x2="660" y2={y} stroke="var(--line)" stroke-width="1" />
          <text x="50" y={y + 4} text-anchor="end" class="tag">{tick}</text>
        {/each}
        {#each DEMO_SORTED_E2E_MS as latency, i}
          {@const height = (latency / DEMO_SLOWEST_E2E_MS) * 195}
          <rect x={60 + i * 6} y={290 - height} width="4" height={height} rx="1" fill="var(--accent)" />
        {/each}
        <line x1={percentileBarX} y1="290" x2={percentileLabelX} y2="299" stroke="var(--fg)" stroke-width="1.5" />
        <text x={percentileLabelX} y="312" text-anchor="middle" class="tag strong">#{percentileRank}</text>
        <line x1="656" y1="290" x2="676" y2="299" stroke="var(--fg)" stroke-width="1.5" />
        <text x="680" y="312" text-anchor="middle" class="tag strong">#{DEMO_PERCENTILE_REQUEST_COUNT}</text>
        <rect x="125" y="335" width="220" height="85" rx="12" fill="var(--accent-soft)" />
        <text x="235" y="359" text-anchor="middle" class="legend strong">{percentileName} · {t(`request #${percentileRank}`, `第 ${percentileRank} 个请求`)}</text>
        <text x="235" y="386" text-anchor="middle" class="formula small">{percentileMs} ms</text>
        <text x="235" y="409" text-anchor="middle" class="legend">{t(`${atMostPercentileCount} of ${DEMO_PERCENTILE_REQUEST_COUNT} take at most ${percentileMs} ms`, `${DEMO_PERCENTILE_REQUEST_COUNT} 个中有 ${atMostPercentileCount} 个不超过 ${percentileMs} ms`)}</text>
        <rect x="375" y="335" width="220" height="85" rx="12" fill="var(--accent-soft)" />
        <text x="485" y="359" text-anchor="middle" class="legend strong">{t(`Slowest · request #${DEMO_PERCENTILE_REQUEST_COUNT}`, `最慢 · 第 ${DEMO_PERCENTILE_REQUEST_COUNT} 个请求`)}</text>
        <text x="485" y="386" text-anchor="middle" class="formula small">{DEMO_SLOWEST_E2E_MS} ms{step === 4 ? ` = ${DEMO_SLOWEST_OVER_P50} × P50` : ''}</text>
        <text x="485" y="409" text-anchor="middle" class="legend">{step === 4 ? t(`1 of ${DEMO_PERCENTILE_REQUEST_COUNT} requests`, `${DEMO_PERCENTILE_REQUEST_COUNT} 个中有 1 个`) : t(`${DEMO_SLOWEST_OVER_P99_MS} ms more than P99`, `比 P99 多 ${DEMO_SLOWEST_OVER_P99_MS} ms`)}</text>
      {:else}
        <text x="20" y="20" class="rowlabel">{t(`${DEMO_PERCENTILE_REQUEST_COUNT} requests · E2E shortest to longest (ms)`, `${DEMO_PERCENTILE_REQUEST_COUNT} 个请求 · 总延迟从短到长（ms）`)}</text>
        <text x="20" y="42" class="legend strong">{t(`${percentileName} = request #${percentileRank}'s E2E latency here`, `${percentileName} = 本图第 ${percentileRank} 个请求的总延迟`)}</text>
        <text x="150" y="65" text-anchor="middle" class="legend">{t('blue = one request’s E2E latency', '蓝色 = 一个请求的总延迟')}</text>
        {#each [DEMO_SLOWEST_E2E_MS, DEMO_SLOWEST_E2E_MS / 2, 0] as tick}
          {@const y = 260 - (tick / DEMO_SLOWEST_E2E_MS) * 170}
          <line x1="40" y1={y} x2="285" y2={y} stroke="var(--line)" stroke-width="1" />
          <text x="35" y={y + 4} text-anchor="end" class="tag">{tick}</text>
        {/each}
        {#each DEMO_SORTED_E2E_MS as latency, i}
          {@const height = (latency / DEMO_SLOWEST_E2E_MS) * 170}
          <rect x={40 + i * 2.4} y={260 - height} width="1.6" height={height} rx="0.5" fill="var(--accent)" />
        {/each}
        <line x1={percentileBarX} y1="260" x2={percentileLabelX} y2="268" stroke="var(--fg)" stroke-width="1.5" />
        <text x={percentileLabelX} y="281" text-anchor="middle" class="tag strong">#{percentileRank}</text>
        <line x1="278" y1="260" x2="278" y2="268" stroke="var(--fg)" stroke-width="1.5" />
        <text x="278" y="281" text-anchor="middle" class="tag strong">#{DEMO_PERCENTILE_REQUEST_COUNT}</text>
        <rect x="20" y="290" width="260" height="76" rx="11" fill="var(--accent-soft)" />
        <text x="35" y="312" class="legend strong">{percentileName} · {t(`request #${percentileRank}`, `第 ${percentileRank} 个请求`)}</text>
        <text x="35" y="335" class="legend strong">{percentileMs} ms</text>
        <text x="35" y="355" class="legend">{t(`${atMostPercentileCount} of ${DEMO_PERCENTILE_REQUEST_COUNT} take at most ${percentileMs} ms`, `${DEMO_PERCENTILE_REQUEST_COUNT} 个中有 ${atMostPercentileCount} 个不超过 ${percentileMs} ms`)}</text>
        <rect x="20" y="376" width="260" height="76" rx="11" fill="var(--accent-soft)" />
        <text x="35" y="398" class="legend strong">{t(`Slowest · request #${DEMO_PERCENTILE_REQUEST_COUNT}`, `最慢 · 第 ${DEMO_PERCENTILE_REQUEST_COUNT} 个请求`)}</text>
        <text x="35" y="421" class="legend strong">{DEMO_SLOWEST_E2E_MS} ms{step === 4 ? ` = ${DEMO_SLOWEST_OVER_P50} × P50` : ''}</text>
        <text x="35" y="441" class="legend">{step === 4 ? t(`1 of ${DEMO_PERCENTILE_REQUEST_COUNT} requests`, `${DEMO_PERCENTILE_REQUEST_COUNT} 个中有 1 个`) : t(`${DEMO_SLOWEST_OVER_P99_MS} ms more than P99`, `比 P99 多 ${DEMO_SLOWEST_OVER_P99_MS} ms`)}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed teaching example, not a local benchmark.', '构造的教学例子，不是本机实测。')}</text>
      {/if}
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
