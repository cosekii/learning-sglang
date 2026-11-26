<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { VOXT_COMPOSE_TASK_COUNT } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Recognition can feed three tasks. Rewrite treats speech as an instruction.',
    captionZh: '识别结果可以进入三种任务。改写任务把口述当作指令。',
  }];
  const ariaLabels = [{
    en: 'After recognition, one result can take one of three task routes. Transcribe treats words such as Good morning as text to tidy. Translate treats them as text to translate. Rewrite treats words such as Make it shorter as an instruction. Selected or typed text can supply the content to rewrite.',
    zh: '识别后，一份结果可以进入三种任务路线之一。整理听写把 Good morning 这类话当作要整理的文字，翻译把它当作要翻译的文字。改写把 Make it shorter 这类话当作指令。选区或框内输入可以提供要改写的内容。',
  }];
  const tasks = [
    { name: 'TRANSCRIBE', nameZh: '整理听写', output: '“Good morning.”', note: 'words to tidy', noteZh: '要整理的文字' },
    { name: 'TRANSLATE', nameZh: '翻译', output: '“Good morning.”', note: 'words to translate', noteZh: '要翻译的文字' },
    { name: 'REWRITE', nameZh: '改写', output: '“Make it shorter.”', note: 'an instruction, not the result', noteZh: '这是指令，不是改写结果' },
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
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? 680 : 480);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="compose-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      <text x={W / 2} y="27" text-anchor="middle" class="title">{t('AFTER RECOGNITION · THREE TASK ROUTES', '识别之后 · 三条任务路线')}</text>
      <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('task = the job you ask the model to do', '任务 = 你请语言模型做的工作')}</text>
      <rect x={phone ? 35 : 30} y={phone ? 72 : 150} width={phone ? 230 : 190} height={phone ? 100 : 135} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
      <text x={phone ? 150 : 125} y={phone ? 99 : 180} text-anchor="middle" class="label" fill="var(--accent)">{t('RECOGNIZED WORDS', '识别出的文字')}</text>
      <text x={phone ? 150 : 125} y={phone ? 130 : 217} text-anchor="middle" class="value">1 {t('RESULT', '份结果')}</text>
      <text x={phone ? 150 : 125} y={phone ? 153 : 254} text-anchor="middle" class="detail">{t('from Ch. 4 Step 7', '来自第 4 章第 7 步')}</text>
      {#each tasks as task, i}
        {@const x = phone ? 20 : 315}
        {@const y = phone ? 205 + i * 125 : 75 + i * 115}
        {@const w = phone ? 260 : 370}
        {@const h = phone ? 100 : 90}
        {#if phone}
          {#if i === 0}
            <line x1="150" y1="176" x2="150" y2={y - 5} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
          {:else}
            <text x="150" y={y - 8} text-anchor="middle" class="detail">{t('OR', '或')}</text>
          {/if}
        {:else}
          <line x1="225" y1="217" x2={x - 8} y2={y + h / 2} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
        {/if}
        <rect {x} {y} width={w} height={h} rx="10" fill="var(--bg)" stroke="var(--line)" stroke-width="1.5" />
        <text x={x + w / 2} y={y + 24} text-anchor="middle" class="label">{i + 1} · {t(task.name, task.nameZh)}</text>
        <text x={x + w / 2} y={y + 52} text-anchor="middle" class="value">{task.output}</text>
        <text x={x + w / 2} y={y + 76} text-anchor="middle" class="detail">{t(task.note, task.noteZh)}</text>
      {/each}
      <text x={W / 2} y={phone ? 595 : 425} text-anchor="middle" class="cut">1 × {VOXT_COMPOSE_TASK_COUNT} = {VOXT_COMPOSE_TASK_COUNT} {t('ROUTE CHOICES · CHOOSE 1', '条路线选择 · 选 1 条')}</text>
      <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Rewrite can also use selected or typed text.', '改写还可以使用选区或框内输入。')}</text>
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Constructed inputs · each run chooses one route.', '构造的输入 · 每次运行选择一条路线。')}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 16px; font-weight: 650; fill: var(--fg); }
  .subtitle { font-size: 13px; font-weight: 600; fill: var(--accent); }
  .label { font-size: 12px; font-weight: 700; fill: var(--fg); }
  .detail { font-size: 11px; fill: var(--fg); }
  .cut { font-size: 12px; font-weight: 650; fill: var(--accent); }
  .value { font-size: 16px; font-weight: 650; fill: var(--fg); }
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .footnote { font-size: 11px; }
    .value { font-size: 14px; }
  }
</style>
