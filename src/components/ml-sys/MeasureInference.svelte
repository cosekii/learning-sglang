<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { DEMO_REQUEST_SENT_MS, DEMO_FIRST_TOKEN_MS, DEMO_TTFT_MS, DEMO_TTFT_SECONDS, DEMO_TTFT_FRACTION, DEMO_OUTPUT_TOKEN_TIMES_MS, DEMO_ITL_GAPS_MS, DEMO_POST_FIRST_GAP_COUNT, DEMO_ITL_TOTAL_MS, DEMO_TPOT_MS, DEMO_LAST_TOKEN_MS, DEMO_E2E_MS, DEMO_E2E_GROUPS, DEMO_COMPARISON_E2E_GROUPS, DEMO_SORTED_E2E_MS, DEMO_COMPARISON_SORTED_E2E_MS, DEMO_UNSORTED_ORDER, DEMO_PERCENTILE_REQUEST_COUNT, DEMO_P50_RANK, DEMO_P50_MS, DEMO_COMPARISON_P50_MS, DEMO_AT_MOST_P50_COUNT, DEMO_AT_MOST_COMPARISON_P50_COUNT, DEMO_P99_RANK, DEMO_P99_MS, DEMO_COMPARISON_P99_MS, DEMO_AT_MOST_P99_COUNT, DEMO_AT_MOST_COMPARISON_P99_COUNT, DEMO_SLOWEST_E2E_MS, DEMO_SLOWEST_OVER_P50, DEMO_COMPARISON_SLOWEST_OVER_P50, DEMO_SLOWEST_OVER_P99_MS, DEMO_COMPARISON_SLOWEST_OVER_P99_MS, DEMO_MEASUREMENT_WINDOW_SECONDS, DEMO_COMPARISON_WINDOW_SECONDS, DEMO_REQUEST_THROUGHPUT_PER_SECOND, DEMO_COMPARISON_THROUGHPUT_PER_SECOND, DEMO_THROUGHPUT_CLOCK_TICK_SECONDS } from '../../ml-sys/numbers';

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
    caption: `A's P50 is ${DEMO_P50_MS} ms; B's is ${DEMO_COMPARISON_P50_MS} ms. Both use the same 0–${DEMO_SLOWEST_E2E_MS} ms scale.`,
    captionZh: `A 的 P50 是 ${DEMO_P50_MS} ms，B 是 ${DEMO_COMPARISON_P50_MS} ms。两批共用 0–${DEMO_SLOWEST_E2E_MS} ms 刻度。`,
  }, {
    caption: `A's P99 is ${DEMO_P99_MS} ms; B's is ${DEMO_COMPARISON_P99_MS} ms. The slowest request is ${DEMO_SLOWEST_E2E_MS} ms in both.`,
    captionZh: `A 的 P99 是 ${DEMO_P99_MS} ms，B 是 ${DEMO_COMPARISON_P99_MS} ms。两批最慢请求都为 ${DEMO_SLOWEST_E2E_MS} ms。`,
  }, {
    caption: `A finishes ${DEMO_PERCENTILE_REQUEST_COUNT} requests in ${DEMO_MEASUREMENT_WINDOW_SECONDS} s; B needs ${DEMO_COMPARISON_WINDOW_SECONDS} s. Their throughput is ${DEMO_REQUEST_THROUGHPUT_PER_SECOND} versus ${DEMO_COMPARISON_THROUGHPUT_PER_SECOND} requests/s.`,
    captionZh: `A 用 ${DEMO_MEASUREMENT_WINDOW_SECONDS} 秒完成 ${DEMO_PERCENTILE_REQUEST_COUNT} 个请求，B 用 ${DEMO_COMPARISON_WINDOW_SECONDS} 秒。吞吐量分别为每秒 ${DEMO_REQUEST_THROUGHPUT_PER_SECOND} 和 ${DEMO_COMPARISON_THROUGHPUT_PER_SECOND} 个。`,
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

  type Batch = {
    id: string; groups: string; sorted: number[]; p50: number; atMostP50: number; p99: number; atMostP99: number;
    slowestOverP50: number; slowestOverP99: number; windowSeconds: number; throughput: number;
  };
  const groupText = (groups: { requests: number; latencyMs: number }[]) => groups.map(({ requests, latencyMs }) => `${requests}×${latencyMs}`).join(' + ');
  const batches: Batch[] = [
    { id: 'A', groups: groupText(DEMO_E2E_GROUPS), sorted: DEMO_SORTED_E2E_MS, p50: DEMO_P50_MS, atMostP50: DEMO_AT_MOST_P50_COUNT, p99: DEMO_P99_MS, atMostP99: DEMO_AT_MOST_P99_COUNT, slowestOverP50: DEMO_SLOWEST_OVER_P50, slowestOverP99: DEMO_SLOWEST_OVER_P99_MS, windowSeconds: DEMO_MEASUREMENT_WINDOW_SECONDS, throughput: DEMO_REQUEST_THROUGHPUT_PER_SECOND },
    { id: 'B', groups: groupText(DEMO_COMPARISON_E2E_GROUPS), sorted: DEMO_COMPARISON_SORTED_E2E_MS, p50: DEMO_COMPARISON_P50_MS, atMostP50: DEMO_AT_MOST_COMPARISON_P50_COUNT, p99: DEMO_COMPARISON_P99_MS, atMostP99: DEMO_AT_MOST_COMPARISON_P99_COUNT, slowestOverP50: DEMO_COMPARISON_SLOWEST_OVER_P50, slowestOverP99: DEMO_COMPARISON_SLOWEST_OVER_P99_MS, windowSeconds: DEMO_COMPARISON_WINDOW_SECONDS, throughput: DEMO_COMPARISON_THROUGHPUT_PER_SECOND },
  ];
  const PHASE_COUNTS = [3, 5, 5, 6, 6, 5, 12];
  const PHASE_MS = 900, REST_MS = 2500;
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
  const clockMs = $derived(step === 0 ? (phase === 0 ? DEMO_REQUEST_SENT_MS : DEMO_FIRST_TOKEN_MS) : step < 3 ? DEMO_OUTPUT_TOKEN_TIMES_MS[Math.min(phase, DEMO_OUTPUT_TOKEN_TIMES_MS.length - 1)] : step === 3 ? (phase === 0 ? DEMO_REQUEST_SENT_MS : DEMO_OUTPUT_TOKEN_TIMES_MS[Math.min(phase - 1, DEMO_OUTPUT_TOKEN_TIMES_MS.length - 1)]) : 0);
  const e2eDesktopX = $derived(phase === 0 ? 115 : 360 + 245 * (clockMs - DEMO_FIRST_TOKEN_MS) / DEMO_ITL_TOTAL_MS);
  const e2ePhoneY = $derived(phase === 0 ? 76 : 190 + 120 * (clockMs - DEMO_FIRST_TOKEN_MS) / DEMO_ITL_TOTAL_MS);
  const A_RESULT_PHASE = 5;
  const THROUGHPUT_AXIS_SECONDS = Math.max(...batches.map((batch) => batch.windowSeconds));
  const batchClock = (i: number) => {
    const maxTicks = batches[i].windowSeconds / DEMO_THROUGHPUT_CLOCK_TICK_SECONDS;
    const elapsedTicks = i === 0 ? Math.min(phase, maxTicks) : Math.min(Math.max(phase - A_RESULT_PHASE, 0), maxTicks);
    return elapsedTicks * DEMO_THROUGHPUT_CLOCK_TICK_SECONDS;
  };
  const batchComplete = (i: number) => Math.round(batchClock(i) / batches[i].windowSeconds * DEMO_PERCENTILE_REQUEST_COUNT);
  const throughputShown = (i: number) => i === 0 ? phase >= A_RESULT_PHASE : phase >= PHASE_COUNTS[6] - 1;
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [390, 500, 550, 500, 740, 740, 820][step] : [400, 400, 400, 400, 500, 500, 520][step]);
</script>

{#snippet distribution(batch: Batch, bi: number, percentile: 'P50' | 'P99')}
  {@const x = phone ? 20 : 30 + bi * 345}
  {@const y = phone ? 68 + bi * 310 : 82}
  {@const w = phone ? 260 : 310}
  {@const chartH = phone ? 145 : 180}
  {@const base = y + 45 + chartH}
  {@const innerW = w - 58}
  {@const barW = innerW / DEMO_PERCENTILE_REQUEST_COUNT - 0.6}
  {@const rank = percentile === 'P50' ? DEMO_P50_RANK : DEMO_P99_RANK}
  {@const rankMs = percentile === 'P50' ? batch.p50 : batch.p99}
  {@const atMost = percentile === 'P50' ? batch.atMostP50 : batch.atMostP99}
  {@const sorted = percentile === 'P99' || phase >= bi + 1}
  {@const showRank = percentile === 'P50' ? phase >= 3 + bi : phase >= 1 + bi * 2}
  {@const showDiff = percentile === 'P99' && phase >= 2 + bi * 2}
  {@const rankX = x + 40 + (rank - 1) * (innerW / DEMO_PERCENTILE_REQUEST_COUNT) + barW / 2}
  <text x={x} y={y} class="legend strong">{batch.id} · {DEMO_PERCENTILE_REQUEST_COUNT} {t('requests', '个请求')} · {sorted ? t('sorted', '已排序') : t('unsorted', '未排序')}</text>
  <text x={x + w} y={y} text-anchor="end" class="tag">{t('blue = E2E', '蓝 = 总延迟')}</text>
  <text x={x} y={y + 20} class="tag">{batch.groups} ms</text>
  {#each [DEMO_SLOWEST_E2E_MS, DEMO_SLOWEST_E2E_MS / 2, 0] as tick}
    {@const ty = base - (tick / DEMO_SLOWEST_E2E_MS) * chartH}
    <line x1={x + 40} y1={ty} x2={x + w} y2={ty} stroke="var(--line)" stroke-width="1" />
    <text x={x + 34} y={ty + 4} text-anchor="end" class="tag">{tick}</text>
  {/each}
  {#each Array.from({ length: DEMO_PERCENTILE_REQUEST_COUNT }, (_, id) => id) as id (id)}
    {@const position = sorted ? id : DEMO_UNSORTED_ORDER.indexOf(id)}
    {@const latency = batch.sorted[id]}
    {@const height = (latency / DEMO_SLOWEST_E2E_MS) * chartH}
    <rect x={x + 40 + position * (innerW / DEMO_PERCENTILE_REQUEST_COUNT)} y={base - height} width={barW} height={height} rx="0.5"
      fill="var(--accent)" opacity={showRank && id !== rank - 1 && id !== DEMO_PERCENTILE_REQUEST_COUNT - 1 ? 0.3 : 1}
      animate:flip={{ duration: 450 }} />
  {/each}
  {#if showRank}
    <line x1={rankX} y1={base + 4} x2={rankX} y2={base + 12} stroke="var(--fg)" stroke-width="1.5" />
    <text x={rankX} y={base + 25} text-anchor="middle" class="tag strong">#{rank}</text>
    <text x={x} y={base + 49} class="legend strong">{percentile} = {rankMs} ms</text>
    <text x={x} y={base + 71} class="legend">{t(`${atMost} of ${DEMO_PERCENTILE_REQUEST_COUNT} take at most ${rankMs} ms`, `${DEMO_PERCENTILE_REQUEST_COUNT} 个中有 ${atMost} 个不超过 ${rankMs} ms`)}</text>
  {/if}
  <text x={x} y={base + 96} class="legend">{t('slowest', '最慢')} = {DEMO_SLOWEST_E2E_MS} ms{percentile === 'P50' && showRank ? ` = ${batch.slowestOverP50} × P50` : percentile === 'P99' && showDiff ? ` = P99 + ${batch.slowestOverP99} ms` : ''}</text>
{/snippet}

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="ttft-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if !reduceMotion}<LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} />{/if}
      {#if step < 4 && !phone}<text x={W - 30} y="34" text-anchor="end" class="tag strong">clock = {clockMs} ms</text>{/if}
      {#if step === 0}
      {#if !phone}
        <text x="35" y="34" class="rowlabel">{t('TTFT · time to first token', 'TTFT · 首个 token 前的等待')}</text>
        <rect x="40" y="75" width="170" height="88" rx="12" fill="var(--bg)" stroke="var(--line)" />
        <text x="125" y="110" text-anchor="middle" class="legend strong">{t('request sent', '请求发出')}</text>
        <text x="125" y="140" text-anchor="middle" class="time">{DEMO_REQUEST_SENT_MS} ms</text>
        <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="510" y="75" width="170" height="88" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="595" y="105" text-anchor="middle" class="legend strong">{t('client gets token 1 delta', '客户端读到首个 token delta')}</text>
          <text x="595" y="140" text-anchor="middle" class="time">{DEMO_FIRST_TOKEN_MS} ms</text>
          <line x1="210" y1="119" x2="500" y2="119" stroke="var(--accent)" stroke-width="5" marker-end="url(#ttft-arrow)" />
          <text x="355" y="94" text-anchor="middle" class="tag strong">{t('waiting, including queue + prefill', '等待（含排队与 prefill）')}</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="180" y="202" width="360" height="108" rx="14" fill="var(--accent-soft)" />
          <text x="360" y="246" text-anchor="middle" class="formula">TTFT = {DEMO_FIRST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS} = {DEMO_TTFT_MS} ms</text>
          <text x="360" y="283" text-anchor="middle" class="legend strong">{DEMO_TTFT_MS} ms = {DEMO_TTFT_SECONDS.toFixed(3)} {t('seconds', '秒')} = {DEMO_TTFT_FRACTION} {t('second', '秒')}</text>
        </g>
        <line x1="245" y1="337" x2="295" y2="337" stroke="var(--accent)" stroke-width="5" />
        <text x="310" y="342" class="legend">{t('blue = the wait called TTFT', '蓝色 = 叫 TTFT 的这段等待')}</text>
      {:else}
        <text x="20" y="28" class="rowlabel">{t('TTFT · time to first token', 'TTFT · 首个 token 前的等待')}</text>
        <rect x="20" y="48" width="260" height="62" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="150" y="75" text-anchor="middle" class="legend strong">{t('request sent', '请求发出')}</text>
        <text x="150" y="99" text-anchor="middle" class="time">{DEMO_REQUEST_SENT_MS} ms</text>
        <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          <line x1="150" y1="112" x2="150" y2="174" stroke="var(--accent)" stroke-width="5" marker-end="url(#ttft-arrow)" />
          <text x="166" y="140" class="tag strong">TTFT</text>
          <text x="166" y="158" class="tag">{t('queue + prefill', '含排队与 prefill')}</text>
          <rect x="20" y="182" width="260" height="62" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="207" text-anchor="middle" class="legend strong">{t('client gets token 1 delta', '客户端读到首个 token delta')}</text>
          <text x="150" y="232" text-anchor="middle" class="time">{DEMO_FIRST_TOKEN_MS} ms</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="20" y="266" width="260" height="78" rx="12" fill="var(--accent-soft)" />
          <text x="150" y="295" text-anchor="middle" class="formula small">TTFT = {DEMO_FIRST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS}</text>
          <text x="150" y="321" text-anchor="middle" class="formula small">= {DEMO_TTFT_MS} ms = {DEMO_TTFT_FRACTION} {t('second', '秒')}</text>
        </g>
        <text x="150" y="365" text-anchor="middle" class="legend">{t('blue = wait for the first token', '蓝色 = 等首个 token 的时间')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('SSE arrivals · 1 token/delta · constructed', '构造 SSE 到达；每个 delta 一个 token')}</text>
      {:else if step < 3}
      {#if !phone}
        <text x="35" y="34" class="rowlabel">{step === 1 ? t('ITL = inter-token latency · from request sent', 'ITL = 相邻 token 的间隔 · 从请求发出计时') : t('TPOT = time per output token · from request sent', 'TPOT = 每个输出 token 的平均时间 · 从请求发出计时')}</text>
        {#each DEMO_OUTPUT_TOKEN_TIMES_MS as time, i}
          {@const x = 35 + i * 180}
          <g opacity={phase >= i ? 1 : 0} style="transition: opacity 300ms">
            <rect x={x} y="95" width="110" height="80" rx="11" fill="var(--bg)" stroke={phase === i ? 'var(--fg)' : 'var(--line)'} stroke-width={phase === i ? 3 : 1} />
            <text x={x + 55} y="123" text-anchor="middle" class="legend strong">token {i + 1}</text>
            <text x={x + 55} y="154" text-anchor="middle" class="time">{time} ms</text>
          </g>
          {#if i < DEMO_ITL_GAPS_MS.length}
            <g opacity={phase >= i + 1 ? 1 : 0} style="transition: opacity 300ms">
              <line x1={x + 110} y1="135" x2={x + 170} y2="135" stroke="var(--accent)" stroke-width="5" marker-end="url(#ttft-arrow)" />
              <text x={x + 145} y="75" text-anchor="middle" class="tag strong">{DEMO_ITL_GAPS_MS[i]} ms</text>
            </g>
          {/if}
        {/each}
        <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
        <rect x="110" y="215" width="500" height="108" rx="14" fill="var(--accent-soft)" />
        {#if step === 1}
          <text x="360" y="254" text-anchor="middle" class="formula small">{t('ITL = next token time − previous token time', 'ITL = 后一个时刻 − 前一个时刻')}</text>
          <text x="360" y="292" text-anchor="middle" class="legend strong">{t('Gap 3:', '第 3 段：')} {DEMO_OUTPUT_TOKEN_TIMES_MS[3]} − {DEMO_OUTPUT_TOKEN_TIMES_MS[2]} = {DEMO_ITL_GAPS_MS[2]} ms</text>
        {:else}
          <text x="360" y="254" text-anchor="middle" class="formula small">TPOT = ({DEMO_ITL_GAPS_MS.join(' + ')}) ÷ {DEMO_POST_FIRST_GAP_COUNT} = {DEMO_TPOT_MS} ms</text>
          <text x="360" y="292" text-anchor="middle" class="legend strong">({DEMO_OUTPUT_TOKEN_TIMES_MS[3]} − {DEMO_OUTPUT_TOKEN_TIMES_MS[0]}) ÷ ({DEMO_OUTPUT_TOKEN_TIMES_MS.length} − 1) = {DEMO_TPOT_MS} ms</text>
        {/if}
        </g>
        <line x1="190" y1="351" x2="240" y2="351" stroke="var(--accent)" stroke-width="5" />
        <text x="255" y="356" class="legend">{step === 1 ? t('blue = each gap called ITL', '蓝色 = 每段叫 ITL 的间隔') : t('blue = gaps after token 1; average does not mean equal', '蓝色 = 首个 token 后的间隔；平均不代表每段相同')}</text>
      {:else}
        <text x="20" y="25" class="rowlabel">{step === 1 ? t('ITL = inter-token latency · from sent', 'ITL = 相邻 token 间隔 · 从发出计时') : t('TPOT = time per output token', 'TPOT = 输出 token 平均间隔')}</text>
        {#each DEMO_OUTPUT_TOKEN_TIMES_MS as time, i}
          {@const y = 42 + i * 90}
          <g opacity={phase >= i ? 1 : 0} style="transition: opacity 300ms">
            <rect x="45" y={y} width="170" height="48" rx="10" fill="var(--bg)" stroke={phase === i ? 'var(--fg)' : 'var(--line)'} stroke-width={phase === i ? 3 : 1} />
            <text x="130" y={y + 20} text-anchor="middle" class="legend strong">token {i + 1}</text>
            <text x="130" y={y + 40} text-anchor="middle" class="time">{time} ms</text>
          </g>
          {#if i < DEMO_ITL_GAPS_MS.length}
            <g opacity={phase >= i + 1 ? 1 : 0} style="transition: opacity 300ms">
              <line x1="130" y1={y + 48} x2="130" y2={y + 82} stroke="var(--accent)" stroke-width="5" marker-end="url(#ttft-arrow)" />
              <text x="147" y={y + 71} class="tag strong">{DEMO_ITL_GAPS_MS[i]} ms</text>
            </g>
          {/if}
        {/each}
        <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
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
        </g>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('SSE arrivals · 1 token/delta · constructed', '构造 SSE 到达；每个 delta 一个 token')}</text>
      {:else if step === 3}
      {#if !phone}
        <text x="35" y="34" class="rowlabel">{t('E2E · end-to-end latency · whole request', 'E2E · 端到端总延迟 · 整个请求')}</text>
        <text x="360" y="55" text-anchor="middle" class="tag strong">E2E = {t('request sent → completion', '请求发出 → 全部完成')}{phase >= 4 ? ` = ${DEMO_E2E_MS} ms` : ''}</text>
        <line x1="115" y1="72" x2={e2eDesktopX} y2="72" stroke="var(--accent)" stroke-width="6" marker-end="url(#ttft-arrow)" opacity={phase > 0 ? 1 : 0} />
        <line x1="115" y1="72" x2="115" y2="100" stroke="var(--accent)" stroke-width="3" />
        <rect x="40" y="100" width="150" height="90" rx="11" fill="var(--bg)" stroke="var(--line)" />
        <text x="115" y="137" text-anchor="middle" class="legend strong">{t('request sent', '请求发出')}</text>
        <text x="115" y="169" text-anchor="middle" class="time">{DEMO_REQUEST_SENT_MS} ms</text>
        <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="285" y="100" width="150" height="90" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="137" text-anchor="middle" class="legend strong">token 1</text>
          <text x="360" y="169" text-anchor="middle" class="time">{DEMO_FIRST_TOKEN_MS} ms</text>
          <line x1="115" y1="190" x2="115" y2="220" stroke="var(--accent)" stroke-width="3" />
          <line x1="360" y1="190" x2="360" y2="220" stroke="var(--accent)" stroke-width="3" />
          <line x1="115" y1="220" x2="360" y2="220" stroke="var(--accent)" stroke-width="4" />
          <text x="237" y="249" text-anchor="middle" class="legend strong">TTFT = {DEMO_TTFT_MS} ms</text>
        </g>
        <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
          <line x1="605" y1="72" x2="605" y2="100" stroke="var(--accent)" stroke-width="3" />
          <rect x="530" y="100" width="150" height="90" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="605" y="126" text-anchor="middle" class="legend strong">{t('last token', '末个 token')}</text>
          <text x="605" y="148" text-anchor="middle" class="legend">{t('last delta = complete here', '最后 delta = 本例完成')}</text>
          <text x="605" y="176" text-anchor="middle" class="time">{DEMO_LAST_TOKEN_MS} ms</text>
          <line x1="605" y1="190" x2="605" y2="220" stroke="var(--accent)" stroke-width="3" />
        </g>
        {#if phase >= 2}
          <line x1="360" y1="220" x2={360 + 245 * (clockMs - DEMO_FIRST_TOKEN_MS) / DEMO_ITL_TOTAL_MS} y2="220" stroke="var(--accent)" stroke-width="4" />
          <text x="482" y="249" text-anchor="middle" class="legend strong">{t('after token 1', '首个 token 后')} = {clockMs - DEMO_FIRST_TOKEN_MS} ms</text>
        {/if}
        <g opacity={phase >= 5 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="100" y="278" width="520" height="78" rx="14" fill="var(--accent-soft)" />
          <text x="360" y="309" text-anchor="middle" class="formula small">E2E = {DEMO_LAST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS} = {DEMO_TTFT_MS} + {DEMO_ITL_TOTAL_MS} = {DEMO_E2E_MS} ms</text>
          <text x="360" y="339" text-anchor="middle" class="legend strong">{DEMO_ITL_TOTAL_MS} ms = {DEMO_ITL_GAPS_MS.join(' + ')} ({t('three ITL gaps', '三段 ITL')})</text>
        </g>
      {:else}
        <text x="20" y="14" class="rowlabel">{t('E2E = end-to-end', 'E2E = 端到端')}</text>
        <text x="20" y="35" class="rowlabel">E2E = {t('request sent → completion', '请求发出 → 全部完成')}</text>
        <line x1="30" y1="76" x2="30" y2={e2ePhoneY} stroke="var(--accent)" stroke-width="5" opacity={phase > 0 ? 1 : 0} />
        <line x1="30" y1="76" x2="45" y2="76" stroke="var(--accent)" stroke-width="3" />
        <line x1="30" y1="310" x2="45" y2="310" stroke="var(--accent)" stroke-width="3" opacity={phase >= 4 ? 1 : 0} />
        <rect x="55" y="45" width="190" height="62" rx="10" fill="var(--bg)" stroke="var(--line)" />
        <text x="150" y="70" text-anchor="middle" class="legend strong">{t('request sent', '请求发出')}</text>
        <text x="150" y="95" text-anchor="middle" class="time">{DEMO_REQUEST_SENT_MS} ms</text>
        <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 300ms">
          <line x1="150" y1="107" x2="150" y2="151" stroke="var(--accent)" stroke-width="4" marker-end="url(#ttft-arrow)" />
          <text x="166" y="135" class="tag strong">TTFT = {DEMO_TTFT_MS} ms</text>
          <rect x="55" y="159" width="190" height="62" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="184" text-anchor="middle" class="legend strong">token 1</text>
          <text x="150" y="209" text-anchor="middle" class="time">{DEMO_FIRST_TOKEN_MS} ms</text>
        </g>
        {#if phase >= 2}
          <line x1="150" y1="221" x2="150" y2={221 + 44 * (clockMs - DEMO_FIRST_TOKEN_MS) / DEMO_ITL_TOTAL_MS} stroke="var(--accent)" stroke-width="4" marker-end="url(#ttft-arrow)" />
          <text x="166" y="249" class="tag strong">{t('after token 1', '首个 token 后')} = {clockMs - DEMO_FIRST_TOKEN_MS} ms</text>
        {/if}
        <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="55" y="273" width="190" height="74" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y="298" text-anchor="middle" class="legend strong">{t('last token delta = complete here', '最后 token delta = 本例完成')}</text>
          <text x="150" y="328" text-anchor="middle" class="time">{DEMO_LAST_TOKEN_MS} ms</text>
        </g>
        <g opacity={phase >= 5 ? 1 : 0} style="transition: opacity 300ms">
          <rect x="20" y="365" width="260" height="82" rx="12" fill="var(--accent-soft)" />
          <text x="150" y="392" text-anchor="middle" class="formula small">E2E = {DEMO_LAST_TOKEN_MS} − {DEMO_REQUEST_SENT_MS} = {DEMO_E2E_MS} ms</text>
          <text x="150" y="417" text-anchor="middle" class="legend strong">= TTFT {DEMO_TTFT_MS} + {DEMO_ITL_TOTAL_MS}</text>
          <text x="150" y="438" text-anchor="middle" class="legend">{DEMO_ITL_TOTAL_MS} ms = {DEMO_ITL_GAPS_MS.join(' + ')} ({t('three ITL gaps', '三段 ITL')})</text>
        </g>
        <text x="150" y="470" text-anchor="middle" class="legend">{t('blue = measured time spans', '蓝色 = 量出的时间段')}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('SSE example · 1 token/delta · schematic cards', '构造 SSE · 每个 delta 一个 token · 卡片仅示意')}</text>
      {:else if step < 6}
        <text x={phone ? 20 : 35} y="26" class="rowlabel">{phone ? t('A/B · sorted E2E (ms)', 'A/B · 排序后的总延迟（ms）') : t('A/B · E2E shortest to longest (ms)', 'A/B · 总延迟从短到长（ms）')}</text>
        <text x={phone ? 20 : 35} y="50" class="legend strong">{step === 4 ? t('P50 = latency at request #50 after sorting', 'P50 = 排序后第 50 个请求的总延迟') : t('P99 = latency at request #99 after sorting', 'P99 = 排序后第 99 个请求的总延迟')}</text>
        {#each batches as batch, bi}
          {@render distribution(batch, bi, step === 4 ? 'P50' : 'P99')}
        {/each}
        {#if step === 4 && phase >= 5}
          <text x={W / 2} y={H - 55} text-anchor="middle" class="legend strong">B − A = {batches[1].p50 - batches[0].p50} ms {t('at P50', '（P50）')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Two constructed batches; no local benchmark.', '两批构造例，不是本机实测。')}</text>
      {:else}
        <text x={phone ? 20 : 35} y="28" class="rowlabel">{phone ? t('A/B · whole-test clocks', 'A/B · 整批时钟') : t('A/B · completions and whole-test time', 'A/B · 完成数与整批时间')}</text>
        <text x={phone ? 20 : 35} y="52" class="legend strong">{phone ? t('Throughput = completions ÷ seconds', '吞吐量 = 完成数 ÷ 秒数') : t('Throughput = completed requests ÷ whole-test seconds', '吞吐量 = 完成的请求数 ÷ 整批秒数')}</text>
        {#each batches as batch, bi}
          {@const x = phone ? 20 : 30 + bi * 345}
          {@const y = phone ? 68 + bi * 340 : 82}
          {@const w = phone ? 260 : 310}
          {@const clock = batchClock(bi)}
          {@const complete = batchComplete(bi)}
          <text x={x} y={y} class="legend strong">{batch.id} · {DEMO_PERCENTILE_REQUEST_COUNT} {t('requests', '个请求')}</text>
          <text x={x + w} y={y} text-anchor="end" class="tag strong">clock = {clock} / {batch.windowSeconds} s</text>
          {#each Array.from({ length: DEMO_PERCENTILE_REQUEST_COUNT }, (_, i) => i) as i}
            <rect x={x + 20 + (i % 10) * 18} y={y + 30 + Math.floor(i / 10) * 16} width="12" height="12" rx="2"
              fill={i < complete ? 'var(--accent)' : 'var(--bg)'} stroke={i < complete ? 'var(--accent)' : 'var(--line)'} />
          {/each}
          <line x1={x + 20} y1={y + 207} x2={x + w} y2={y + 207} stroke="var(--line)" stroke-width="3" />
          <line x1={x + 20} y1={y + 207} x2={x + 20 + (w - 20) * clock / THROUGHPUT_AXIS_SECONDS} y2={y + 207} stroke="var(--fg)" stroke-width="3" />
          <line x1={x + 20 + (w - 20) * batch.windowSeconds / THROUGHPUT_AXIS_SECONDS} y1={y + 201} x2={x + 20 + (w - 20) * batch.windowSeconds / THROUGHPUT_AXIS_SECONDS} y2={y + 213} stroke="var(--fg)" stroke-width="2" />
          <text x={x + 20} y={y + 226} class="tag">{t('0 = test start', '0 = 测试开始')}</text>
          <text x={x + w} y={y + 226} text-anchor="end" class="tag">{THROUGHPUT_AXIS_SECONDS} s</text>
          <text x={x} y={y + 251} class="legend">{complete} / {DEMO_PERCENTILE_REQUEST_COUNT} {t('complete', '已完成')}</text>
          {#if throughputShown(bi)}
            <text x={x} y={y + 282} class="legend strong">{t('Throughput', '吞吐量')} = {DEMO_PERCENTILE_REQUEST_COUNT} ÷ {batch.windowSeconds} = {batch.throughput} requests/s</text>
          {/if}
        {/each}
        <text x={W / 2} y={H - 95} text-anchor="middle" class="legend">{t(`blue = completed · shared 0–${THROUGHPUT_AXIS_SECONDS} s clock`, `蓝 = 完成 · 共用 0–${THROUGHPUT_AXIS_SECONDS} s 时钟`)}</text>
        <text x={W / 2} y={H - 70} text-anchor="middle" class="legend">{t('Even fills = average · completion gaps vary', '均匀填格 = 平均速率 · 完成间隔可变')}</text>
        <text x={W / 2} y={H - 45} text-anchor="middle" class="legend">{t('Requests overlap; E2E does not sum to the window.', '请求重叠执行；E2E 不能相加成整批窗口。')}</text>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Next: what fills the GPU before requests start?', '下一章：请求前，显卡里已经装了什么？')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Two constructed batches; no local benchmark.', '两批构造例，不是本机实测。')}</text>
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
