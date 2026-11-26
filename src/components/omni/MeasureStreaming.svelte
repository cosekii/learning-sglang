<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    STREAM_P90_SHARED_S, STREAM_P90_ALONE_S, STREAM_P90_EXTRA_S,
    STREAM_P90_SOONER_PERCENT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: `The talker's own GPU gave p90 first sound in ${STREAM_P90_ALONE_S.toFixed(1)} seconds. Sharing the thinker's GPU took ${STREAM_P90_SHARED_S.toFixed(1)} seconds.`,
    captionZh: `talker 独占 GPU 时，首音 p90 是 ${STREAM_P90_ALONE_S.toFixed(1)} 秒。与 thinker 同卡时是 ${STREAM_P90_SHARED_S.toFixed(1)} 秒。`,
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [590][step] : [430][step]);
  const barMax = $derived(phone ? 185 : 400);
  const barScale = $derived(barMax / STREAM_P90_SHARED_S);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="measure-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Measure the first-sound wait' : 'One GPU move changed the first-sound wait', phone ? '测量首音等待' : '挪动 talker，首音等待就变了')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'first sound = first returned audio' : 'first sound = the first audio returned to the client', phone ? '首音 = 返回的第一段声音' : '首音 = 返回给客户端的第一段声音')}</text>
        <text x={phone ? 18 : 36} y="79" class="label">{t('p90 = 9 in 10 first sounds arrived within this time', 'p90 = 十个首音里九个在此时间内到达')}</text>
        {#if !phone}
          <rect x="36" y="105" width="648" height="215" rx="13" fill="var(--bg)" stroke="var(--line)" />
          <text x="58" y="136" class="small strong">{t('SAME MODEL · SAME 8-REQUEST LOAD', '同一模型 · 同样同时 8 个请求')}</text>
          <text x="58" y="177" class="small">{t('TALKER BESIDE THINKER', 'talker 与 thinker 同卡')}</text>
          <rect x="260" y="156" width={STREAM_P90_SHARED_S * barScale} height="33" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="648" y="179" text-anchor="end" class="result">{STREAM_P90_SHARED_S.toFixed(1)} s</text>
          <text x="58" y="236" class="small">{t('TALKER ON ITS OWN GPU', 'talker 独占一张 GPU')}</text>
          <rect x="260" y="215" width={STREAM_P90_ALONE_S * barScale} height="33" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={272 + STREAM_P90_ALONE_S * barScale} y="237" class="result">{STREAM_P90_ALONE_S.toFixed(1)} s</text>
          <text x="58" y="289" class="small">{t('blue = measured p90 wait, one scale', '蓝 = 实测 p90 等待，同一比例')}</text>
          <text x="648" y="289" text-anchor="end" class="result">+{STREAM_P90_EXTRA_S.toFixed(1)} s</text>
          <text x="360" y="356" text-anchor="middle" class="result">1 − {STREAM_P90_ALONE_S.toFixed(2)} ÷ {STREAM_P90_SHARED_S.toFixed(2)} ≈ {STREAM_P90_SOONER_PERCENT.toFixed(0)}% {t('sooner', '更早')}</text>
          <text x="360" y="392" text-anchor="middle" class="small strong">{t('Which part of the wait did the move remove?', '这次挪动省掉了哪段等待？')}</text>
        {:else}
          <rect x="18" y="104" width="264" height="251" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="134" class="small strong">{t('SAME 8-REQUEST LOAD', '同样同时 8 个请求')}</text>
          <text x="32" y="174" class="small">{t('BESIDE THINKER', '与 thinker 同卡')}</text>
          <rect x="32" y="188" width={STREAM_P90_SHARED_S * barScale} height="31" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="32" y="244" class="result">{STREAM_P90_SHARED_S.toFixed(1)} s</text>
          <text x="32" y="278" class="small">{t('OWN GPU', '独占 GPU')}</text>
          <rect x="32" y="292" width={STREAM_P90_ALONE_S * barScale} height="31" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="32" y="347" class="result">{STREAM_P90_ALONE_S.toFixed(1)} s · −{STREAM_P90_EXTRA_S.toFixed(1)} s</text>
          <text x="18" y="391" class="small">{t('blue = p90 wait · one scale', '蓝 = p90 等待 · 同一比例')}</text>
          <text x="150" y="435" text-anchor="middle" class="result">1 − {STREAM_P90_ALONE_S.toFixed(2)} ÷ {STREAM_P90_SHARED_S.toFixed(2)}</text>
          <text x="150" y="465" text-anchor="middle" class="result">≈ {STREAM_P90_SOONER_PERCENT.toFixed(0)}% {t('sooner', '更早')}</text>
          <text x="150" y="510" text-anchor="middle" class="small strong">{t('Which wait disappeared?', '省掉了哪段等待？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'PR #1235 · H200 · two runs each' : 'PR #1235 · H200 · 8 requests at once · two runs each', phone ? 'PR #1235 · H200 · 各跑两次' : 'PR #1235 · H200 · 同时 8 个请求 · 各跑两次')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .strong { font-weight: 650; }
  @media (max-width: 900px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .result { font-size: 12px; }
  }
</style>
