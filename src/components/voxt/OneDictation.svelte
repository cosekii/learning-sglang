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
  }, {
    caption: "Late A appears in A's result window and is saved. B appears where you type or in B's result window.",
    captionZh: '晚到的 A 显示在自己的结果小窗，也保存下来。B 显示在打字位置或自己的结果小窗。',
  }, {
    caption: 'Cancel A while it recognizes or tidies. Late results stay off screen; its saved result is empty.',
    captionZh: '取消 A，晚到结果不显示。保存记录写着已取消，结果为空。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? (step === 0 ? 440 : step === 3 ? 560 : 640) : 390);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0 ? 'Two dictations get two different session IDs so their results stay with the right dictation' : step === 1 ? 'A hotkey starts session A, then the sentence passes through helper, recognition, cleanup, delivery and history' : step === 2 ? "Late session A goes to its own result window and saved results, while B goes where you type or to B's result window" : 'Cancelling session A stops late text, and its saved record has no result text'}>
      <defs>
        <marker id="session-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="current-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="cancel-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--eos)" />
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
      {:else if step === 2}
        <text x={W / 2} y={phone ? 24 : 28} text-anchor="middle" class="title">{t(phone ? 'LATE A STAYS WITH A' : 'LATE A STAYS WITH A, NOT B', phone ? '晚到的 A 留在 A' : '晚到的 A 留在 A，不写进 B')}</text>
        {#if phone}
          <text x="150" y="46" text-anchor="middle" class="title">{t('NOT B', '不写进 B')}</text>
        {/if}
        <text x={W / 2} y={phone ? 69 : 55} text-anchor="middle" class="route-detail">{t('A starts first → B starts later', 'A 先开始 → B 后开始')}</text>
        <text x={W / 2} y={phone ? 89 : 75} text-anchor="middle" class="route-detail">{t('A is tidying text; its result arrives late', 'A 正在整理文字，结果稍后才到')}</text>
        {#each gateRows as row, i}
          {#if !phone}
            {@const y = 100 + i * 125}
            <rect x="20" {y} width="180" height="88" rx="12" fill={row.ok ? 'var(--accent-soft)' : 'var(--bg)'} stroke={row.ok ? 'var(--accent)' : 'var(--line)'} />
            <text x="110" y={y + 28} text-anchor="middle" class={row.ok ? 'session' : 'label'}>session {row.id}</text>
            <text x="110" y={y + 52} text-anchor="middle" class="route-detail">{row.ok ? t('current result', '当前结果') : t('late result', '晚到的结果')}</text>
            {#if !row.ok}
              <text x="110" y={y + 75} text-anchor="middle" class="route-detail">{t("→ A's window + saved results", '→ A 的结果小窗 + 保存记录')}</text>
            {/if}
            <line x1="200" y1={y + 44} x2="245" y2={y + 44} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
            <rect x="255" {y} width="210" height="88" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="360" y={y + 23} text-anchor="middle" class="route-name">{t('SAME SESSION?', '同一个 session 吗？')}</text>
            <text x="360" y={y + 50} text-anchor="middle" class={row.ok ? 'check yes' : 'check no'}>{row.id} {row.ok ? '=' : '≠'} B</text>
            <text x="360" y={y + 73} text-anchor="middle" class={row.ok ? 'check yes' : 'check no'}>{row.ok ? t('write into B', '写进 B') : t('keep out of B', '不写进 B')}</text>
            {#if row.ok}
              <line x1="465" y1={y + 44} x2="515" y2={y + 44} stroke="var(--accent)" stroke-width="3" marker-end="url(#current-arrow)" />
            {:else}
              <line x1="465" y1={y + 44} x2="495" y2={y + 44} stroke="var(--muted)" stroke-width="2" />
              <path d="M500 {y + 36} l16 16 M516 {y + 36} l-16 16" stroke="var(--eos)" stroke-width="3" />
            {/if}
            <rect x="525" {y} width="170" height="88" rx="12" fill={row.ok ? 'var(--accent-soft)' : 'var(--bg)'} stroke={row.ok ? 'var(--accent)' : 'var(--line)'} stroke-dasharray={row.ok ? undefined : '5 4'} />
            <text x="610" y={y + 23} text-anchor="middle" class="route-name">{t("B'S RESULT", 'B 这次的结果')}</text>
            <text x="610" y={y + 47} text-anchor="middle" class="route-detail">{t('typing spot or result window', '打字位置或结果小窗')}</text>
            <text x="610" y={y + 70} text-anchor="middle" class="route-detail">{row.ok ? t('B’s text appears', '显示 B 的文字') : t('no A here', 'A 写不进来')}</text>
          {:else}
            {@const y = 105 + i * 245}
            <rect x="35" {y} width="230" height="46" rx="11" fill={row.ok ? 'var(--accent-soft)' : 'var(--bg)'} stroke={row.ok ? 'var(--accent)' : 'var(--line)'} />
            <text x="150" y={y + 18} text-anchor="middle" class={row.ok ? 'session' : 'label'}>session {row.id}</text>
            <text x="150" y={y + 37} text-anchor="middle" class="route-detail">{row.ok ? t('current result', '当前结果') : t('late → result window + saved results', '晚到 → 结果小窗 + 保存记录')}</text>
            <line x1="150" y1={y + 46} x2="150" y2={y + 58} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
            <rect x="35" y={y + 62} width="230" height="64" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="150" y={y + 84} text-anchor="middle" class="route-name">{t('SAME SESSION?', '同一个 session 吗？')}</text>
            <text x="150" y={y + 110} text-anchor="middle" class={row.ok ? 'check yes' : 'check no'}>{row.id} {row.ok ? '=' : '≠'} B · {row.ok ? t('write into B', '写进 B') : t('keep out of B', '不写进 B')}</text>
            {#if row.ok}
              <line x1="150" y1={y + 126} x2="150" y2={y + 146} stroke="var(--accent)" stroke-width="3" marker-end="url(#current-arrow)" />
            {:else}
              <line x1="150" y1={y + 126} x2="150" y2={y + 134} stroke="var(--muted)" stroke-width="2" />
              <path d="M142 {y + 134} l16 16 M158 {y + 134} l-16 16" stroke="var(--eos)" stroke-width="3" />
            {/if}
            <rect x="35" y={y + 150} width="230" height="60" rx="11" fill={row.ok ? 'var(--accent-soft)' : 'var(--bg)'} stroke={row.ok ? 'var(--accent)' : 'var(--line)'} stroke-dasharray={row.ok ? undefined : '5 4'} />
            <text x="150" y={y + 169} text-anchor="middle" class="route-name">{t("B'S RESULT", 'B 这次的结果')}</text>
            <text x="150" y={y + 187} text-anchor="middle" class="route-detail">{t('typing spot or result window', '打字位置或结果小窗')}</text>
            <text x="150" y={y + 203} text-anchor="middle" class="route-detail">{row.ok ? t('B’s text appears', '显示 B 的文字') : t('no A here', 'A 写不进来')}</text>
          {/if}
        {/each}
        {#if !phone}
          <text x="360" y="338" text-anchor="middle" class="route-detail"><tspan fill="var(--eos)">× {t('A keeps out of B', 'A 不写进 B')}</tspan><tspan dx="24" fill="var(--accent)">✓ {t('B writes into B', 'B 写进 B')}</tspan></text>
          <text x="360" y="352" text-anchor="middle" class="footnote">{t("Both rows show B's result. You can choose the result window.", '两行都是 B 这次的结果；你可选结果小窗。')}</text>
          <text x="360" y="368" text-anchor="middle" class="footnote">{t('If insertion fails, text stays in the window.', '能贴就到打字位置，贴不进去就留在结果小窗。')}</text>
          <text x="360" y="384" text-anchor="middle" class="footnote">{t('Clean-up succeeds and saving is on in this example.', '本例整理成功，并开启保存记录。')}</text>
        {:else}
          <text x="150" y="574" text-anchor="middle" class="route-detail"><tspan fill="var(--eos)">× {t('A keeps out of B', 'A 不写进 B')}</tspan><tspan dx="18" fill="var(--accent)">✓ {t('B writes into B', 'B 写进 B')}</tspan></text>
          <text x="150" y="594" text-anchor="middle" class="footnote">{t("Both rows show B's result. You can choose the window.", '两行都是 B 这次的结果；你可选结果小窗。')}</text>
          <text x="150" y="612" text-anchor="middle" class="footnote">{t('If insertion fails, text stays in the window.', '能贴就到打字位置，贴不进去就留在结果小窗。')}</text>
          <text x="150" y="630" text-anchor="middle" class="footnote">{t('Clean-up succeeds and saving is on in this example.', '本例整理成功，并开启保存记录。')}</text>
        {/if}
      {:else}
        {#if !phone}
          <text x="360" y="28" text-anchor="middle" class="title">{t('CANCEL A · LATE RESULTS STOP', '取消 A · 晚到的结果停下')}</text>
          <rect x="270" y="46" width="180" height="44" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-width="2" />
          <text x="360" y="67" text-anchor="middle" class="cancel-title">{t('YOU PRESS CANCEL', '你按取消键')}</text>
          <text x="360" y="84" text-anchor="middle" class="route-detail">{t('while recognizing or tidying', '识别或整理时')}</text>
          <line x1="360" y1="90" x2="360" y2="116" stroke="var(--eos)" stroke-width="2" marker-end="url(#cancel-arrow)" />
          {#each cancelSources as source, i}
            {@const y = 126 + i * 86}
            <rect x="20" {y} width="190" height="68" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x="115" y={y + 25} text-anchor="middle" class="route-name">{t(source.name, source.nameZh)}</text>
            <text x="115" y={y + 50} text-anchor="middle" class="route-detail">{t(source.detail, source.detailZh)}</text>
            <line x1="210" y1={y + 34} x2="260" y2={y + 34} stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
          {/each}
          <rect x="270" y="126" width="180" height="146" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-width="2" />
          <text x="360" y="154" text-anchor="middle" class="cancel-title">{t('A = CANCELLED', 'A = 已取消')}</text>
          <text x="360" y="202" text-anchor="middle" class="cancel-x">×</text>
          <text x="360" y="235" text-anchor="middle" class="route-name">{t('late results stop', '晚到的结果停下')}</text>
          <line x1="450" y1="194" x2="480" y2="194" stroke="var(--eos)" stroke-width="2" />
          <path d="M489 186 l16 16 M505 186 l-16 16" stroke="var(--eos)" stroke-width="3" />
          <rect x="525" y="150" width="170" height="88" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="610" y="174" text-anchor="middle" class="route-name">{t('YOU SEE TEXT', '看到文字')}</text>
          <text x="610" y="197" text-anchor="middle" class="route-detail">{t('typing spot or result window', '打字位置或结果小窗')}</text>
          <text x="610" y="222" text-anchor="middle" class="check no">{t('× no late A result', '× 没有晚到的 A 结果')}</text>
          <line x1="360" y1="272" x2="360" y2="288" stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
          <text x="375" y="287" class="route-detail">{t('save cancellation', '保存取消状态')}</text>
          <rect x="250" y="296" width="220" height="50" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="360" y="316" text-anchor="middle" class="route-name">{t('SAVED RECORD', '保存记录')}</text>
          <text x="360" y="336" text-anchor="middle" class="route-detail">{t('A · cancelled · result: empty', 'A · 已取消 · 结果文字：空')}</text>
          <text x="360" y="364" text-anchor="middle" class="footnote">{t('Next: which program receives the cancel key?', '接下来：哪个程序接收取消键？')}</text>
          <text x="360" y="380" text-anchor="middle" class="footnote">{t('This example has a saved record.', '本例有这条保存记录。')}</text>
        {:else}
          <text x="150" y="24" text-anchor="middle" class="title">{t('CANCEL A', '取消 A')}</text>
          <text x="150" y="44" text-anchor="middle" class="title">{t('LATE RESULTS STOP', '晚到的结果停下')}</text>
          <rect x="60" y="60" width="180" height="44" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-width="2" />
          <text x="150" y="81" text-anchor="middle" class="cancel-title">{t('YOU PRESS CANCEL', '你按取消键')}</text>
          <text x="150" y="98" text-anchor="middle" class="route-detail">{t('while recognizing or tidying', '识别或整理时')}</text>
          {#each cancelSources as source, i}
            {@const x = 15 + i * 140}
            <rect {x} y="128" width="130" height="72" rx="12" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 65} y="153" text-anchor="middle" class="route-name">{t(source.name, source.nameZh)}</text>
            <text x={x + 65} y="178" text-anchor="middle" class="route-detail">{t(source.detail, source.detailZh)}</text>
            <line x1={x + 65} y1="200" x2={100 + i * 100} y2="226" stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
          {/each}
          <rect x="50" y="236" width="200" height="96" rx="12" fill="var(--bg)" stroke="var(--eos)" stroke-width="2" />
          <text x="150" y="260" text-anchor="middle" class="cancel-title">{t('A = CANCELLED', 'A = 已取消')}</text>
          <text x="150" y="294" text-anchor="middle" class="cancel-x">×</text>
          <text x="150" y="319" text-anchor="middle" class="route-name">{t('late results stop', '晚到的结果停下')}</text>
          <line x1="110" y1="332" x2="86" y2="356" stroke="var(--eos)" stroke-width="2" />
          <path d="M72 358 l16 16 M88 358 l-16 16" stroke="var(--eos)" stroke-width="3" />
          <line x1="190" y1="332" x2="220" y2="380" stroke="var(--muted)" stroke-width="2" marker-end="url(#session-arrow)" />
          <text x="220" y="366" text-anchor="middle" class="route-detail">{t('save cancellation', '保存取消状态')}</text>
          <rect x="15" y="390" width="130" height="100" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="80" y="416" text-anchor="middle" class="route-name">{t('YOU SEE TEXT', '看到文字')}</text>
          <text x="80" y="440" text-anchor="middle" class="route-detail">{t('typing spot or window', '打字位置或小窗')}</text>
          <text x="80" y="468" text-anchor="middle" class="check no">{t('× no late result', '× 没有晚到的结果')}</text>
          <rect x="155" y="390" width="130" height="100" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="220" y="416" text-anchor="middle" class="route-name">{t('SAVED RECORD', '保存记录')}</text>
          <text x="220" y="442" text-anchor="middle" class="route-detail">{t('A: cancelled', 'A：已取消')}</text>
          <text x="220" y="468" text-anchor="middle" class="route-detail">{t('result: empty', '结果文字：空')}</text>
          <text x="150" y="534" text-anchor="middle" class="footnote">{t('Next: which program receives the cancel key?', '接下来：哪个程序接收取消键？')}</text>
          <text x="150" y="550" text-anchor="middle" class="footnote">{t('This example has a saved record.', '本例有这条保存记录。')}</text>
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
  .session-id { font-family: var(--mono); font-size: 19px; font-weight: 700; fill: var(--accent); }
  .formula { font-family: var(--mono); font-size: 18px; font-weight: 650; fill: var(--accent); }
  .route-name { font-size: 11px; font-weight: 700; fill: var(--fg); }
  .route-detail { font-size: 11px; fill: var(--fg); }
  .route-tag { font-family: var(--mono); font-size: 13px; font-weight: 700; fill: var(--accent); }
  .cancel-title { font-size: 12px; font-weight: 700; fill: var(--eos); }
  .cancel-x { font-size: 34px; font-weight: 600; fill: var(--eos); }
  .check { font-family: var(--mono); font-size: 14px; font-weight: 700; }
  .check.yes { fill: var(--accent); }
  .check.no { fill: var(--eos); }
  @media (max-width: 600px) {
    .title { font-size: 14px; }
    .label, .session, .rowlabel, .footnote, .route-name, .route-detail, .check { font-size: 12px; }
  }
</style>
