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
  }, {
    caption: 'Stable instructions stay in system. This run’s input stays in user.',
    captionZh: '固定说明放进 system。本次输入放进 user。',
  }];
  const ariaLabels = [{
    en: 'After recognition, one result can take one of three task routes. Transcribe treats words such as Good morning as text to tidy. Translate treats them as text to translate. Rewrite treats words such as Make it shorter as an instruction. Selected or typed text can supply the content to rewrite.',
    zh: '识别后，一份结果可以进入三种任务路线之一。整理听写把 Good morning 这类话当作要整理的文字，翻译把它当作要翻译的文字。改写把 Make it shorter 这类话当作指令。选区或框内输入可以提供要改写的内容。',
  }, {
    en: 'One request orders its messages as system, optional history, then user. System holds reusable role, task and output instructions. History can hold examples or earlier turns. User holds this run’s recognized text, selection, typed text or instruction.',
    zh: '一个请求的消息顺序是 system、可选的 history、user。system 保存可复用的角色、任务和输出说明。history 可以保存示例或前几轮对话。user 保存本次的识别文字、选区、框内输入或指令。',
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
  const H = $derived((phone ? [680, 620] : [480, 410])[step]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="compose-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {#if step === 0}
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
      {:else}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('ONE REQUEST · ORDERED MESSAGES', '一个请求 · 按顺序排列的消息')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('message = one labelled parcel for the model', '消息 = 交给模型的一份带标签内容')}</text>
        {#each [
          { name: '1 · SYSTEM', nameZh: '1 · SYSTEM', detail: 'reusable instructions', detailZh: '可复用的说明', lines: ['role · task · output rules'], linesZh: ['角色 · 任务 · 输出约定'], note: 'stays stable across runs', noteZh: '跨多次运行保持稳定' },
          { name: '2 · HISTORY · OPTIONAL', nameZh: '2 · HISTORY · 可选', detail: 'examples or earlier turns', detailZh: '示例或前几轮对话', lines: ['only when the task needs them'], linesZh: ['只有任务需要时才加入'], note: 'between system and user', noteZh: '位于 system 和 user 之间' },
          { name: '3 · USER', nameZh: '3 · USER', detail: 'this run’s input', detailZh: '本次运行的输入', lines: ['recognized text · selection'], linesZh: ['识别文字 · 选区'], note: 'typed text · instruction', noteZh: '框内输入 · 指令' },
        ] as role, i}
          {@const x = phone ? 25 : 25 + i * 230}
          {@const y = phone ? 78 + i * 155 : 88}
          {@const w = phone ? 250 : 210}
          {@const h = phone ? 125 : 190}
          <rect {x} {y} width={w} height={h} rx="10" fill={i === 2 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={i === 2 ? 2 : 1.5} stroke-dasharray={i === 1 ? '5 4' : undefined} />
          <text x={x + w / 2} y={y + 27} text-anchor="middle" class="label" fill={i === 2 ? 'var(--accent)' : 'var(--fg)'}>{t(role.name, role.nameZh)}</text>
          <text x={x + w / 2} y={y + 57} text-anchor="middle" class="value small">{t(role.detail, role.detailZh)}</text>
          <text x={x + w / 2} y={y + (phone ? 82 : 101)} text-anchor="middle" class="detail">{t(role.lines[0], role.linesZh[0])}</text>
          <text x={x + w / 2} y={y + (phone ? 105 : 137)} text-anchor="middle" class="detail">{t(role.note, role.noteZh)}</text>
          {#if !phone && i === 0}
            <text x={x + w / 2} y={y + 161} text-anchor="middle" class="detail">{t('cleanup rules when used', '需要时还有清理规则')}</text>
          {/if}
          {#if i < 2}
            {#if phone}
              <line x1="150" y1={y + h + 4} x2="150" y2={y + h + 25} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
            {:else}
              <line x1={x + w + 4} y1={y + h / 2} x2={x + w + 16} y2={y + h / 2} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
            {/if}
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 565 : 325} text-anchor="middle" class="cut">{t('REUSE THE INSTRUCTIONS · REPLACE THE INPUT', '复用说明 · 替换本次输入')}</text>
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('User text cannot literally close its wrapper.', '用户文本不能原样闭合自己的包裹标签。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Matching closing tags are escaped.', '同名闭合标签会被转义。')}</text>
      {/if}
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
