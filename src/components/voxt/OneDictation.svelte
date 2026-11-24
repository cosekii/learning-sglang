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
  }, {
    caption: 'One key press starts session A; its sentence becomes text on screen and in history.',
    captionZh: '按一下键启动 session A，这句话变成文字，显示并保存。',
  }];
  const route = [
    { name: 'YOU PRESS', nameZh: '你按一下', detail: 'one key', detailZh: '一个键' },
    { name: 'HELPER', nameZh: 'helper', detail: 'brings sound in', detailZh: '把声音送进来' },
    { name: 'SOUND → WORDS', nameZh: '声音 → 文字', detail: '“um, hi”', detailZh: '“嗯，你好”' },
    { name: 'TIDY WORDS', nameZh: '整理文字', detail: 'um, hi → Hi!', detailZh: '嗯，你好 → 你好' },
    { name: 'YOU SEE TEXT', nameZh: '看到文字', detail: 'at cursor', detailZh: '光标处' },
    { name: 'SAVE TEXT', nameZh: '保存文字', detail: 'original + tidy', detailZh: '原话 + 整理结果' },
  ];
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 0 ? 440 : 640) : 390);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? 'Two dictations get two different session IDs so their results stay with the right dictation' : 'A hotkey starts session A, then the sentence passes through helper, recognition, cleanup, delivery and history'}>
      <defs>
        <marker id="session-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {#if step === 0}
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
      {:else}
        <text x={W / 2} y={phone ? 28 : 34} text-anchor="middle" class="title">{t('ONE SENTENCE · ONE TAG', '一句话 · 一个标签')}</text>
        <rect x={W / 2 - 66} y={phone ? 44 : 52} width="132" height="32" rx="16" fill="var(--accent-soft)" />
        <text x={W / 2} y={phone ? 65 : 74} text-anchor="middle" class="session">session ID = A</text>
        {#each route as stop, i}
          {@const x = phone ? 35 : 20 + i * 116}
          {@const y = phone ? 90 + i * 78 : 120}
          {@const w = phone ? 230 : 100}
          {@const h = phone ? 64 : 126}
          {@const cx = x + w / 2}
          <rect {x} {y} width={w} height={h} rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x={cx} y={y + (phone ? 22 : 52)} text-anchor="middle" class="route-name">{t(stop.name, stop.nameZh)}</text>
          <text x={cx} y={y + (phone ? 42 : 72)} text-anchor="middle" class="route-detail">{t(stop.detail, stop.detailZh)}</text>
          {#if i === 4}
            <text x={cx} y={y + (phone ? 58 : 94)} text-anchor="middle" class="route-detail">{t('or result window', '或结果小窗')}</text>
          {/if}
          {#if i > 0}
            <rect x={x + w - 29} y={y + 7} width="22" height="22" rx="6" fill="var(--accent-soft)" />
            <text x={x + w - 18} y={y + 23} text-anchor="middle" class="route-tag">A</text>
          {/if}
          {#if i < route.length - 1}
            {#if phone}
              <line x1={cx} y1={y + h} x2={cx} y2={y + h + 12} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
            {:else}
              <line x1={x + w} y1={y + h / 2} x2={x + w + 14} y2={y + h / 2} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
            {/if}
          {/if}
        {/each}
        <rect x={phone ? 37 : 176} y={phone ? 562 : 291} width="22" height="22" rx="6" fill="var(--accent-soft)" />
        <text x={phone ? 48 : 187} y={phone ? 578 : 307} text-anchor="middle" class="route-tag">A</text>
        <text x={phone ? 70 : 207} y={phone ? 578 : 307} class="route-detail">{t("= this sentence's session ID", '= 这句话的 session ID')}</text>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Text stays here by choice or if insertion fails.', '你选小窗，或贴不进去时，文字留在这里。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('This succeeded; clean-up and history are on.', '这次听写成功，并开启了整理和历史。')}</text>
      {/if}
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
  .route-name { font-size: 11px; font-weight: 700; fill: var(--fg); }
  .route-detail { font-size: 11px; fill: var(--fg); }
  .route-tag { font-family: var(--mono); font-size: 13px; font-weight: 700; fill: var(--accent); }
  @media (max-width: 600px) {
    .title { font-size: 14px; }
    .label, .session, .rowlabel, .footnote, .route-name, .route-detail { font-size: 12px; }
  }
</style>
