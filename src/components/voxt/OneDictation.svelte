<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
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
    caption: 'One key press starts session A. A travels with the sentence to text and history.',
    captionZh: '按一下键启动 session A。A 跟着这句话，一路到屏幕文字和保存记录。',
  }, {
    caption: 'Same session? Late A: A ≠ B, no, keeps its own window; B: B = B, yes, written.',
    captionZh: '同一个 session 吗？A ≠ B，不是，晚到的 A 回自己的小窗；B = B，是，写进 B。',
  }, {
    caption: 'Cancel A: it is marked cancelled first. A late result — recognized or tidied — is checked and not delivered.',
    captionZh: '取消 A：先把 A 标成已取消。晚到的结果——识别的或整理的——都被检查，都不交付。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: dictation 1 appears, then its new session ID A, then its results; dictation 2, session ID B and results 2 follow; A and B are different, so the two results stay apart.',
    zh: '画面按顺序形成：先出现第 1 次听写，再出现它的新 session ID A，再出现它的结果；随后是第 2 次听写、session ID B 和第 2 次的结果；A 和 B 不同，两次结果因此分开。',
  }, {
    en: 'One key press starts session A, and the blue A tag walks the six stops in order: key press, helper, sound to words, tidy words, you see text, save text. Each stop, with its name and product, appears as the tag arrives and stays; no stop gets a new tag.',
    zh: '按一下键启动 session A，蓝色的 A 标签按顺序走过六站：按键、helper、声音变文字、整理文字、看到文字、保存文字。标签走到哪一站，哪一站才带着名字和产物出现并留下；没有一站换新标签。',
  }, {
    en: 'A starts first and B later. Late A arrives, the check asks “same session?” — A ≠ B, no — and A is kept out of B, going to A’s own result window and saved results; B’s own result — B = B, yes — is written into B.',
    zh: 'A 先开始，B 后开始。晚到的 A 到达后，检查问「同一个 session 吗？」——A ≠ B，不是——A 被挡在 B 外，回到 A 自己的结果小窗和保存记录；B 自己的结果——B = B，是——写进 B。',
  }, {
    en: 'You press cancel while A recognizes or tidies. A is marked cancelled first. Only one of the two late results arrives — the recognized words or the tidied words — and the two cases appear one at a time; each meets the cancelled check and is not delivered, so the screen shows nothing; the saved record says cancelled with an empty result.',
    zh: '你在 A 识别或整理时按取消。A 先被标记为已取消。晚到的只是其中一种结果——识别出的文字或整理后的文字——两种情形一个一个上演；各自遇到取消检查，都不交付，屏幕上什么都没有；保存记录写着已取消、结果为空。',
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
  const gateRows = [{ id: 'A', ok: false }, { id: 'B', ok: true }];
  const cancelSources = [
    { name: 'SOUND → WORDS', nameZh: '声音 → 文字', detail: 'late “um, hi”', detailZh: '晚到的“嗯，你好”' },
    { name: 'TIDY WORDS', nameZh: '整理文字', detail: 'late “Hi!”', detailZh: '晚到的“你好！”' },
  ];
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 0 ? 440 : 640) : 390);

  // All four steps build as a process: Step 1 adds dictation → tag → results
  // for A then B, then A ≠ B; Step 2 walks one A tag through the six stops;
  // Step 3 plays late A through the same-session check, then B through B = B;
  // Step 4 plays cancel → cancelled state → two separate late-result checks
  // → nothing on screen → record.
  const ANIMATED = [true, true, true, true];
  const PHASE_COUNTS = [7, 6, 8, 6];
  // Phone LoopProgress spot per step, kept clear of each step's titles.
  const LP_PHONE: [number, number][] = [[227, 14], [220, 46], [220, 46], [230, 52]];
  const PHASE_MS = 900;
  const REST_MS = 2200;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0), reduced = $state(false);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ANIMATED[s] || reduced) { phase = PHASE_COUNTS[s] - 1; return; }
    phase = 0;
    const count = PHASE_COUNTS[s];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS));
      const ms = count * PHASE_MS + REST_MS;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  // The travelling A badge's top-left corner on the current stop.
  const badgePos = $derived(phone
    ? { x: 35 + 230 - 29, y: 90 + phase * 78 + 7 }
    : { x: 20 + phase * 116 + 71, y: 127 });
</script>

<figure class="viz" data-animation-step={ANIMATED[step] ? step : undefined} data-animation-phase={ANIMATED[step] ? phase : undefined} data-animation-final-phase={ANIMATED[step] ? PHASE_COUNTS[step] - 1 : undefined}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="session-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="accept-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
        <marker id="cancel-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--eos)" />
        </marker>
      </defs>
      {#if ANIMATED[step] && !reduced}
        {#if phone}<LoopProgress ms={lapMs} {lap} x={LP_PHONE[step][0]} y={LP_PHONE[step][1]} />{:else}<LoopProgress ms={lapMs} {lap} />{/if}
      {/if}
      {#if step === 0}
        {#if !phone}
          <text x="360" y="34" text-anchor="middle" class="title">{t(`How do ${DEMO_DICTATION_COUNT} dictations keep their results apart?`, `${DEMO_DICTATION_COUNT} 次听写怎样分开各自的结果？`)}</text>
          <text x="120" y="75" text-anchor="middle" class="rowlabel">{t('YOU SPEAK', '你说一句话')}</text>
          <text x="360" y="75" text-anchor="middle" class="rowlabel">{t(`${DEMO_SESSION_COUNT} DIFFERENT TAGS`, `${DEMO_SESSION_COUNT} 个不同标签`)}</text>
          <text x="600" y="75" text-anchor="middle" class="rowlabel">{t('RESULTS STAY HERE', '结果跟对标签')}</text>
          {#each demoDictations as n, i}
            {@const y = 105 + i * 115}
            {@const tag = i === 0 ? 'A' : 'B'}
            {@const base = i * 3}
            {#if phase >= base}
              <g in:fade={{ duration: 250 }}>
                <rect x="35" y={y} width="170" height="72" rx="12" fill="var(--bg)" stroke={phase === base ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base ? 2.5 : 1} />
                <text x="120" y={y + 43} text-anchor="middle" class="label">{t(`dictation ${n}`, `第 ${n} 次听写`)}</text>
              </g>
            {/if}
            {#if phase >= base + 1}
              <g in:fade={{ duration: 250 }}>
                <line x1="205" y1={y + 36} x2="272" y2={y + 36} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
                <rect x="282" y={y} width="156" height="72" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width={phase === base + 1 ? 2.5 : 2} />
                <text x="360" y={y + 29} text-anchor="middle" class="tag session">session ID</text>
                <text x="360" y={y + 53} text-anchor="middle" class="session-id">{tag}</text>
              </g>
            {/if}
            {#if phase >= base + 2}
              <g in:fade={{ duration: 250 }}>
                <line x1="438" y1={y + 36} x2="505" y2={y + 36} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
                <rect x="515" y={y} width="170" height="72" rx="12" fill="var(--bg)" stroke={phase === base + 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base + 2 ? 2.5 : 1} />
                <text x="600" y={y + 43} text-anchor="middle" class="label">{t(`results ${n}`, `第 ${n} 次的结果`)}</text>
              </g>
            {/if}
          {/each}
          {#if phase >= 6}
            <g in:fade={{ duration: 250 }}>
              <rect x="265" y="324" width="190" height="38" rx="19" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width={phase === 6 ? 2 : 0} />
              <text x="360" y="349" text-anchor="middle" class="formula">A ≠ B</text>
            </g>
          {/if}
        {:else}
          <text x="150" y="28" text-anchor="middle" class="title">{t(`${DEMO_DICTATION_COUNT} dictations`, `${DEMO_DICTATION_COUNT} 次听写`)}</text>
          <text x="150" y="50" text-anchor="middle" class="title">{t('keep their results apart', '怎样分开结果？')}</text>
          {#each demoDictations as n, i}
            {@const y = 72 + i * 145}
            {@const tag = i === 0 ? 'A' : 'B'}
            {@const base = i * 3}
            {#if phase >= base}
              <g in:fade={{ duration: 250 }}>
                <rect x="20" y={y} width="260" height="112" rx="12" fill="var(--bg)" stroke={phase === base ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base ? 2.5 : 1} />
                <text x="150" y={y + 26} text-anchor="middle" class="label">{t(`dictation ${n}`, `第 ${n} 次听写`)}</text>
              </g>
            {/if}
            {#if phase >= base + 1}
              <g in:fade={{ duration: 250 }}>
                <rect x="64" y={y + 38} width="172" height="38" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
                <text x="150" y={y + 63} text-anchor="middle" class="session">session ID = {tag}</text>
              </g>
            {/if}
            {#if phase >= base + 2}
              <text x="150" y={y + 98} text-anchor="middle" class="label" in:fade={{ duration: 250 }}>↓ {t(`results ${n}`, `第 ${n} 次的结果`)}</text>
            {/if}
          {/each}
          {#if phase >= 6}
            <g in:fade={{ duration: 250 }}>
              <rect x="75" y="366" width="150" height="38" rx="19" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width={phase === 6 ? 2 : 0} />
              <text x="150" y="391" text-anchor="middle" class="formula">A ≠ B</text>
            </g>
          {/if}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('A and B stand for two different real session IDs.', 'A、B 代表两个不同的真实 session ID。')}</text>
      {:else if step === 1}
        <text x={W / 2} y={phone ? 28 : 34} text-anchor="middle" class="title">{t('ONE SENTENCE · ONE TAG', '一句话 · 一个标签')}</text>
        <rect x={W / 2 - 66} y={phone ? 44 : 52} width="132" height="32" rx="16" fill="var(--accent-soft)" />
        <text x={W / 2} y={phone ? 65 : 74} text-anchor="middle" class="session">session ID = A</text>
        {#each route as stop, i}
          {@const x = phone ? 35 : 20 + i * 116}
          {@const y = phone ? 90 + i * 78 : 120}
          {@const w = phone ? 230 : 100}
          {@const h = phone ? 64 : 126}
          {@const cx = x + w / 2}
          {#if phase >= i}
            <g in:fade={{ duration: 250 }}>
              <rect {x} {y} width={w} height={h} rx="12" fill={phase === i ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === i ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === i ? 2.5 : 1} />
              <text x={cx} y={y + (phone ? 22 : 52)} text-anchor="middle" class="route-name">{t(stop.name, stop.nameZh)}</text>
              <text x={cx} y={y + (phone ? 42 : 72)} text-anchor="middle" class="route-detail">{t(stop.detail, stop.detailZh)}</text>
              {#if i === 4}
                <text x={cx} y={y + (phone ? 58 : 94)} text-anchor="middle" class="route-detail">{t('or result window', '或结果小窗')}</text>
              {/if}
            </g>
          {/if}
          {#if i < route.length - 1 && phase > i}
            {#if phone}
              <line x1={cx} y1={y + h} x2={cx} y2={y + h + 12} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
            {:else}
              <line x1={x + w} y1={y + h / 2} x2={x + w + 14} y2={y + h / 2} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
            {/if}
          {/if}
        {/each}
        <g style="transform: translate({badgePos.x}px, {badgePos.y}px); transition: transform 0.45s ease;">
          <rect width="22" height="22" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
          <text x="11" y="16" text-anchor="middle" class="route-tag">A</text>
        </g>
        <rect x={phone ? 37 : 176} y={phone ? 562 : 291} width="22" height="22" rx="6" fill="var(--accent-soft)" />
        <text x={phone ? 48 : 187} y={phone ? 578 : 307} text-anchor="middle" class="route-tag">A</text>
        <text x={phone ? 70 : 207} y={phone ? 578 : 307} class="route-detail">{t("= this sentence's session ID", '= 这句话的 session ID')}</text>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(phone ? 'Result window: your pick or a stuck spot.' : 'Text stays in the result window by choice or if it cannot go where you type.', phone ? '结果小窗：你选的，或文字贴不进去时的去处。' : '你选结果小窗，或贴不到打字位置时，文字留在结果小窗。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'It succeeded; tidying and saving are on.' : 'This dictation succeeded; tidying and saving are on.', '这次听写成功；整理和保存都开着。')}</text>
      {:else if step === 2}
        <text x={W / 2} y={phone ? 24 : 28} text-anchor="middle" class="title">{t(phone ? 'LATE A STAYS WITH A' : 'LATE A STAYS WITH A, NOT B', phone ? '晚到的 A 留在 A' : '晚到的 A 留在 A，不写进 B')}</text>
        {#if phone}
          <text x="150" y="46" text-anchor="middle" class="title">{t('NOT B', '不写进 B')}</text>
        {/if}
        <text x={W / 2} y={phone ? 69 : 55} text-anchor="middle" class="route-detail">{t('A starts first → B starts later', 'A 先开始 → B 后开始')}</text>
        <text x={W / 2} y={phone ? 89 : 75} text-anchor="middle" class="route-detail">{t('A is tidying text; its result arrives late', 'A 正在整理文字，结果稍后才到')}</text>
        {#each gateRows as row, i}
          {@const base = i * 3 + 1}
          {#if !phone}
            {@const y = 100 + i * 125}
            {#if phase >= base}
              <g in:fade={{ duration: 250 }}>
                <rect x="20" {y} width="180" height="88" rx="12" fill={row.ok ? 'var(--gen-soft)' : phase === base ? 'var(--accent-soft)' : 'var(--bg)'} stroke={row.ok ? 'var(--gen)' : phase === base ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base ? 2.5 : 1} />
                <text x="110" y={y + 28} text-anchor="middle" class={row.ok ? 'session ok' : 'label'}>session {row.id}</text>
                <text x="110" y={y + 52} text-anchor="middle" class="route-detail">{row.ok ? t('current result', '当前结果') : t('late result', '晚到的结果')}</text>
              </g>
            {/if}
            {#if phase >= base + 1}
              <g in:fade={{ duration: 250 }}>
                <line x1="200" y1={y + 44} x2="245" y2={y + 44} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
                <rect x="255" {y} width="210" height="88" rx="12" fill={phase === base + 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === base + 1 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base + 1 ? 2.5 : 1} />
                <text x="360" y={y + 23} text-anchor="middle" class="route-name">{t('SAME SESSION?', '同一个 session 吗？')}</text>
                <text x="360" y={y + 50} text-anchor="middle" class={row.ok ? 'check yes' : 'check no'}>{row.id} {row.ok ? '=' : '≠'} B</text>
              </g>
            {/if}
            {#if phase >= base + 2}
              <g in:fade={{ duration: 250 }}>
                <text x="360" y={y + 73} text-anchor="middle" class={row.ok ? 'check yes' : 'check no'}>{row.ok ? t('write into B', '写进 B') : t('keep out of B', '不写进 B')}</text>
                {#if row.ok}
                  <line x1="465" y1={y + 44} x2="515" y2={y + 44} stroke="var(--gen)" stroke-width="3" marker-end="url(#accept-arrow)" />
                {:else}
                  <line x1="465" y1={y + 44} x2="495" y2={y + 44} stroke="var(--muted)" stroke-width="2" />
                  <path d="M500 {y + 36} l16 16 M516 {y + 36} l-16 16" stroke="var(--eos)" stroke-width="3" />
                {/if}
                <rect x="525" {y} width="170" height="88" rx="12" fill={row.ok ? 'var(--gen-soft)' : phase === base + 2 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={row.ok ? 'var(--gen)' : phase === base + 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base + 2 ? 2.5 : 1} stroke-dasharray={row.ok ? undefined : '5 4'} />
                <text x="610" y={y + 23} text-anchor="middle" class="route-name">{t("B'S RESULT", 'B 这次的结果')}</text>
                <text x="610" y={y + 47} text-anchor="middle" class="route-detail">{t('typing spot or result window', '打字位置或结果小窗')}</text>
                <text x="610" y={y + 70} text-anchor="middle" class="route-detail">{row.ok ? t('B’s text appears', '显示 B 的文字') : t('no A here', 'A 写不进来')}</text>
                {#if !row.ok}
                  <text x="110" y={y + 75} text-anchor="middle" class="route-detail">{t("→ A's window + saved results", '→ A 的结果小窗 + 保存记录')}</text>
                {/if}
              </g>
            {/if}
          {:else}
            {@const y = 105 + i * 245}
            {#if phase >= base}
              <g in:fade={{ duration: 250 }}>
                <rect x="35" {y} width="230" height="46" rx="11" fill={row.ok ? 'var(--gen-soft)' : phase === base ? 'var(--accent-soft)' : 'var(--bg)'} stroke={row.ok ? 'var(--gen)' : phase === base ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base ? 2.5 : 1} />
                <text x="150" y={y + 18} text-anchor="middle" class={row.ok ? 'session ok' : 'label'}>session {row.id}</text>
                <text x="150" y={y + 37} text-anchor="middle" class="route-detail">{row.ok ? t('current result', '当前结果') : phase >= base + 2 ? t('late → result window + saved results', '晚到 → 结果小窗 + 保存记录') : t('late result', '晚到的结果')}</text>
              </g>
            {/if}
            {#if phase >= base + 1}
              <g in:fade={{ duration: 250 }}>
                <line x1="150" y1={y + 46} x2="150" y2={y + 58} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
                <rect x="35" y={y + 62} width="230" height="64" rx="11" fill={phase === base + 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === base + 1 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base + 1 ? 2.5 : 1} />
                <text x="150" y={y + 84} text-anchor="middle" class="route-name">{t('SAME SESSION?', '同一个 session 吗？')}</text>
                <text x="150" y={y + 101} text-anchor="middle" class={row.ok ? 'check yes' : 'check no'}>{row.id} {row.ok ? '=' : '≠'} B</text>
              </g>
            {/if}
            {#if phase >= base + 2}
              <g in:fade={{ duration: 250 }}>
                <text x="150" y={y + 118} text-anchor="middle" class={row.ok ? 'check yes' : 'check no'}>{row.ok ? t('write into B', '写进 B') : t('keep out of B', '不写进 B')}</text>
                {#if row.ok}
                  <line x1="150" y1={y + 126} x2="150" y2={y + 146} stroke="var(--gen)" stroke-width="3" marker-end="url(#accept-arrow)" />
                {:else}
                  <line x1="150" y1={y + 126} x2="150" y2={y + 134} stroke="var(--muted)" stroke-width="2" />
                  <path d="M142 {y + 134} l16 16 M158 {y + 134} l-16 16" stroke="var(--eos)" stroke-width="3" />
                {/if}
                <rect x="35" y={y + 150} width="230" height="60" rx="11" fill={row.ok ? 'var(--gen-soft)' : phase === base + 2 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={row.ok ? 'var(--gen)' : phase === base + 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === base + 2 ? 2.5 : 1} stroke-dasharray={row.ok ? undefined : '5 4'} />
                <text x="150" y={y + 169} text-anchor="middle" class="route-name">{t("B'S RESULT", 'B 这次的结果')}</text>
                <text x="150" y={y + 187} text-anchor="middle" class="route-detail">{t('typing spot or result window', '打字位置或结果小窗')}</text>
                <text x="150" y={y + 203} text-anchor="middle" class="route-detail">{row.ok ? t('B’s text appears', '显示 B 的文字') : t('no A here', 'A 写不进来')}</text>
              </g>
            {/if}
          {/if}
        {/each}
        {#if phase >= 7}
          {#if !phone}
            <text x="360" y="338" text-anchor="middle" class="route-detail" in:fade={{ duration: 250 }}><tspan fill="var(--eos)">× {t('A keeps out of B', 'A 不写进 B')}</tspan><tspan dx="24" fill="var(--gen)">✓ {t('B writes into B', 'B 写进 B')}</tspan></text>
          {:else}
            <text x="150" y="574" text-anchor="middle" class="route-detail" in:fade={{ duration: 250 }}><tspan fill="var(--eos)">× {t('A keeps out of B', 'A 不写进 B')}</tspan><tspan dx="18" fill="var(--gen)">✓ {t('B writes into B', 'B 写进 B')}</tspan></text>
          {/if}
        {/if}
        {#if !phone}
          <text x="360" y="352" text-anchor="middle" class="footnote">{t("Both rows show B's result. You can choose the result window.", '两行都是 B 这次的结果；你可选结果小窗。')}</text>
          <text x="360" y="368" text-anchor="middle" class="footnote">{t('If insertion fails, text stays in the window.', '能贴就到打字位置，贴不进去就留在结果小窗。')}</text>
          <text x="360" y="384" text-anchor="middle" class="footnote">{t('Clean-up succeeds and saving is on in this example.', '本例整理成功，并开启保存记录。')}</text>
        {:else}
          <text x="150" y="594" text-anchor="middle" class="footnote">{t("Both rows are B's result; the window is optional.", '两行都是 B 这次的结果；你可选结果小窗。')}</text>
          <text x="150" y="612" text-anchor="middle" class="footnote">{t('If insertion fails, text stays in the window.', '能贴就到打字位置，贴不进去就留在结果小窗。')}</text>
          <text x="150" y="630" text-anchor="middle" class="footnote">{t('Clean-up succeeds and saving is on in this example.', '本例整理成功，并开启保存记录。')}</text>
        {/if}
      {:else}
        {#if !phone}
          <text x="360" y="28" text-anchor="middle" class="title">{t('CANCEL A · LATE RESULTS NOT DELIVERED', '取消 A · 晚到的结果不交付')}</text>
          <g in:fade={{ duration: 250 }}>
            <rect x="270" y="44" width="180" height="42" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-width={phase === 0 ? 3 : 2} />
            <text x="360" y="65" text-anchor="middle" class="cancel-title">{t('YOU PRESS CANCEL', '你按取消键')}</text>
            <text x="360" y="81" text-anchor="middle" class="route-detail">{t('while recognizing or tidying', '识别或整理时')}</text>
          </g>
          {#if phase >= 1}
            <g in:fade={{ duration: 250 }}>
              <line x1="360" y1="86" x2="360" y2="100" stroke="var(--eos)" stroke-width="2" marker-end="url(#cancel-arrow)" />
              <rect x="270" y="104" width="180" height="58" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-width={phase === 1 ? 3 : 2} />
              <text x="360" y="127" text-anchor="middle" class="cancel-title">{t('A = CANCELLED', 'A = 已取消')}</text>
              <text x="360" y="147" text-anchor="middle" class="route-detail">{t('every late result checks this', '每个晚到结果都先查它')}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <text x="115" y="172" text-anchor="middle" class="route-detail" in:fade={{ duration: 250 }}>{t('only one of these two arrives late', '晚到的只是其中一种')}</text>
          {/if}
          {#each cancelSources as source, i}
            {@const y = 186 + i * 66}
            {#if phase >= 2 + i}
              <g in:fade={{ duration: 250 }}>
                <rect x="20" {y} width="190" height="54" rx="12" fill={phase === 2 + i ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === 2 + i ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 2 + i ? 2.5 : 1} />
                <text x="115" y={y + 22} text-anchor="middle" class="route-name">{t(source.name, source.nameZh)}</text>
                <text x="115" y={y + 41} text-anchor="middle" class="route-detail">{t(source.detail, source.detailZh)}</text>
                <line x1="210" y1={y + 27} x2="244" y2={y + 27} stroke="var(--muted)" stroke-width="2" />
                <path d="M248 {y + 19} l14 14 M262 {y + 19} l-14 14" stroke="var(--eos)" stroke-width="3" />
                <text x="272" y={y + 31} class="route-detail" fill="var(--eos)">{t('cancelled', '已取消')}</text>
              </g>
            {/if}
          {/each}
          {#if phase >= 4}
            <g in:fade={{ duration: 250 }}>
              <line x1="326" y1="213" x2="348" y2="226" stroke="var(--muted)" stroke-width="2" />
              <line x1="326" y1="279" x2="348" y2="266" stroke="var(--muted)" stroke-width="2" />
              <rect x="350" y="204" width="200" height="88" rx="12" fill={phase === 4 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === 4 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 4 ? 2.5 : 1} />
              <text x="450" y="228" text-anchor="middle" class="route-name">{t('YOU SEE TEXT', '看到文字')}</text>
              <text x="450" y="250" text-anchor="middle" class="route-detail">{t('typing spot or result window', '打字位置或结果小窗')}</text>
              <text x="450" y="274" text-anchor="middle" class="check no">{t('× no late A result', '× 没有晚到的 A 结果')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g in:fade={{ duration: 250 }}>
              <path d="M450 129 H585 V329 H574" fill="none" stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
              <text x="517" y="121" text-anchor="middle" class="route-detail">{t('save cancellation', '保存取消状态')}</text>
              <rect x="350" y="306" width="220" height="46" rx="12" fill={phase === 5 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === 5 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 5 ? 2.5 : 1} />
              <text x="460" y="325" text-anchor="middle" class="route-name">{t('SAVED RECORD', '保存记录')}</text>
              <text x="460" y="342" text-anchor="middle" class="route-detail">{t('A · cancelled · result: empty', 'A · 已取消 · 结果文字：空')}</text>
            </g>
          {/if}
          <text x="360" y="364" text-anchor="middle" class="footnote">{t('Next: which program receives the cancel key?', '接下来：哪个程序接收取消键？')}</text>
          <text x="360" y="380" text-anchor="middle" class="footnote">{t('This example has a saved record.', '本例有这条保存记录。')}</text>
        {:else}
          <text x="150" y="24" text-anchor="middle" class="title">{t('CANCEL A', '取消 A')}</text>
          <text x="150" y="44" text-anchor="middle" class="title">{t('LATE RESULTS NOT DELIVERED', '晚到的结果不交付')}</text>
          <g in:fade={{ duration: 250 }}>
            <rect x="60" y="56" width="180" height="42" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-width={phase === 0 ? 3 : 2} />
            <text x="150" y="77" text-anchor="middle" class="cancel-title">{t('YOU PRESS CANCEL', '你按取消键')}</text>
            <text x="150" y="93" text-anchor="middle" class="route-detail">{t('while recognizing or tidying', '识别或整理时')}</text>
          </g>
          {#if phase >= 1}
            <g in:fade={{ duration: 250 }}>
              <line x1="150" y1="98" x2="150" y2="112" stroke="var(--eos)" stroke-width="2" marker-end="url(#cancel-arrow)" />
              <rect x="50" y="116" width="200" height="64" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-width={phase === 1 ? 3 : 2} />
              <text x="150" y="139" text-anchor="middle" class="cancel-title">{t('A = CANCELLED', 'A = 已取消')}</text>
              <text x="150" y="162" text-anchor="middle" class="route-detail">{t('every late result checks this', '每个晚到结果都先查它')}</text>
            </g>
          {/if}
          {#if phase >= 2}
            <text x="150" y="196" text-anchor="middle" class="route-detail" in:fade={{ duration: 250 }}>{t('only one of these two arrives late', '晚到的只是其中一种')}</text>
          {/if}
          {#each cancelSources as source, i}
            {@const y = 206 + i * 90}
            {#if phase >= 2 + i}
              <g in:fade={{ duration: 250 }}>
                <rect x="60" {y} width="180" height="54" rx="12" fill={phase === 2 + i ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === 2 + i ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 2 + i ? 2.5 : 1} />
                <text x="150" y={y + 22} text-anchor="middle" class="route-name">{t(source.name, source.nameZh)}</text>
                <text x="150" y={y + 41} text-anchor="middle" class="route-detail">{t(source.detail, source.detailZh)}</text>
                <line x1="150" y1={y + 54} x2="150" y2={y + 68} stroke="var(--muted)" stroke-width="2" />
                <path d="M143 {y + 72} l14 14 M157 {y + 72} l-14 14" stroke="var(--eos)" stroke-width="3" />
                <text x="170" y={y + 82} class="route-detail" fill="var(--eos)">{t('cancelled', '已取消')}</text>
              </g>
            {/if}
          {/each}
          {#if phase >= 4}
            <g in:fade={{ duration: 250 }}>
              <line x1="150" y1="388" x2="150" y2="400" stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
              <rect x="60" y="404" width="180" height="80" rx="12" fill={phase === 4 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === 4 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 4 ? 2.5 : 1} />
              <text x="150" y="428" text-anchor="middle" class="route-name">{t('YOU SEE TEXT', '看到文字')}</text>
              <text x="150" y="448" text-anchor="middle" class="route-detail">{t('typing spot or window', '打字位置或小窗')}</text>
              <text x="150" y="472" text-anchor="middle" class="check no">{t('× no late result', '× 没有晚到的结果')}</text>
            </g>
          {/if}
          {#if phase >= 5}
            <g in:fade={{ duration: 250 }}>
              <text x="150" y="510" text-anchor="middle" class="route-detail">{t('A ends → saved record', 'A 结束 → 保存记录')}</text>
              <rect x="60" y="524" width="180" height="72" rx="12" fill={phase === 5 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={phase === 5 ? 'var(--accent)' : 'var(--line)'} stroke-width={phase === 5 ? 2.5 : 1} />
              <text x="150" y="546" text-anchor="middle" class="route-name">{t('SAVED RECORD', '保存记录')}</text>
              <text x="150" y="566" text-anchor="middle" class="route-detail">{t('A: cancelled', 'A：已取消')}</text>
              <text x="150" y="584" text-anchor="middle" class="route-detail">{t('result: empty', '结果文字：空')}</text>
            </g>
          {/if}
          <text x="150" y="614" text-anchor="middle" class="footnote">{t('Next: which program receives the cancel key?', '接下来：哪个程序接收取消键？')}</text>
          <text x="150" y="630" text-anchor="middle" class="footnote">{t('This example has a saved record.', '本例有这条保存记录。')}</text>
        {/if}
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
  .session.ok { fill: var(--gen); }
  .session-id { font-family: var(--mono); font-size: 19px; font-weight: 700; fill: var(--accent); }
  .formula { font-family: var(--mono); font-size: 18px; font-weight: 650; fill: var(--accent); }
  .route-name { font-size: 11px; font-weight: 700; fill: var(--fg); }
  .route-detail { font-size: 11px; fill: var(--fg); }
  .route-tag { font-family: var(--mono); font-size: 13px; font-weight: 700; fill: var(--accent); }
  .cancel-title { font-size: 12px; font-weight: 700; fill: var(--eos); }
  .check { font-family: var(--mono); font-size: 14px; font-weight: 700; }
  .check.yes { fill: var(--gen); }
  .check.no { fill: var(--eos); }
  @media (max-width: 600px) {
    .title { font-size: 14px; }
    .label, .session, .rowlabel, .footnote, .route-name, .route-detail, .check { font-size: 12px; }
  }
</style>
