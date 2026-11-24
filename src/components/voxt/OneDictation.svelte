<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { DEMO_DICTATION_COUNT, DEMO_SESSION_COUNT } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Each dictation gets a new session ID, a tag for its results.',
    captionZh: '每次听写都有新的 session ID，也就是结果的标签。',
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
  const demoDictations = Array.from({ length: DEMO_DICTATION_COUNT }, (_, i) => i + 1);
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 440 : 390);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Two dictations get two different session IDs so their results stay with the right dictation">
      <defs>
        <marker id="session-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {#if !phone}
        <text x="360" y="34" text-anchor="middle" class="title">{t(`How do ${DEMO_DICTATION_COUNT} dictations keep their results apart?`, `${DEMO_DICTATION_COUNT} 次听写怎样分开各自的结果？`)}</text>
        <text x="120" y="75" text-anchor="middle" class="rowlabel">{t('YOU SPEAK', '你说一句话')}</text>
        <text x="360" y="75" text-anchor="middle" class="rowlabel">{t(`${DEMO_SESSION_COUNT} DIFFERENT TAGS`, `${DEMO_SESSION_COUNT} 个不同标签`)}</text>
        <text x="600" y="75" text-anchor="middle" class="rowlabel">{t('RESULTS STAY HERE', '结果跟对标签')}</text>
        {#each demoDictations as n, i}
          {@const y = 105 + i * 115}
          {@const tag = i === 0 ? 'A' : 'B'}
          <rect x="35" y={y} width="170" height="72" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="120" y={y + 43} text-anchor="middle" class="label">{t(`dictation ${n}`, `第 ${n} 次听写`)}</text>
          <line x1="205" y1={y + 36} x2="272" y2={y + 36} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
          <rect x="282" y={y} width="156" height="72" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
          <text x="360" y={y + 29} text-anchor="middle" class="tag session">session ID</text>
          <text x="360" y={y + 53} text-anchor="middle" class="session-id">{tag}</text>
          <line x1="438" y1={y + 36} x2="505" y2={y + 36} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
          <rect x="515" y={y} width="170" height="72" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="600" y={y + 43} text-anchor="middle" class="label">{t(`results ${n}`, `第 ${n} 次的结果`)}</text>
        {/each}
        <rect x="265" y="324" width="190" height="38" rx="19" fill="var(--accent-soft)" />
        <text x="360" y="349" text-anchor="middle" class="formula">A ≠ B</text>
      {:else}
        <text x="150" y="28" text-anchor="middle" class="title">{t(`${DEMO_DICTATION_COUNT} dictations`, `${DEMO_DICTATION_COUNT} 次听写`)}</text>
        <text x="150" y="50" text-anchor="middle" class="title">{t('keep their results apart', '怎样分开结果？')}</text>
        {#each demoDictations as n, i}
          {@const y = 72 + i * 145}
          {@const tag = i === 0 ? 'A' : 'B'}
          <rect x="20" y={y} width="260" height="112" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="150" y={y + 26} text-anchor="middle" class="label">{t(`dictation ${n}`, `第 ${n} 次听写`)}</text>
          <rect x="64" y={y + 38} width="172" height="38" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
          <text x="150" y={y + 63} text-anchor="middle" class="session">session ID = {tag}</text>
          <text x="150" y={y + 98} text-anchor="middle" class="label">↓ {t(`results ${n}`, `第 ${n} 次的结果`)}</text>
        {/each}
        <rect x="75" y="366" width="150" height="38" rx="19" fill="var(--accent-soft)" />
        <text x="150" y="391" text-anchor="middle" class="formula">A ≠ B</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('A and B stand for two different real session IDs.', 'A、B 代表两个不同的真实 session ID。')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 16px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 14px; font-weight: 600; fill: var(--fg); }
  .session { font-family: var(--mono); font-size: 12px; font-weight: 650; fill: var(--accent); }
  .session-id { font-family: var(--mono); font-size: 19px; font-weight: 700; fill: var(--accent); }
  .formula { font-family: var(--mono); font-size: 18px; font-weight: 650; fill: var(--accent); }
  @media (max-width: 600px) {
    .title { font-size: 14px; }
    .label, .session, .rowlabel, .footnote { font-size: 12px; }
  }
</style>
