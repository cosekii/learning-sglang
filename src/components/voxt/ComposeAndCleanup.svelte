<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { VOXT_COMPOSE_CLEANED_PIECE_COUNT, VOXT_COMPOSE_FAILED_PIECE_COUNT, VOXT_COMPOSE_ORDERED_RESULT_COUNT, VOXT_COMPOSE_PIECE_COUNT, VOXT_COMPOSE_PROMPT_PART_COUNT, VOXT_COMPOSE_TASK_COUNT, VOXT_REWRITE_SPEECH_FALLBACK_COUNT, VOXT_TRANSLATE_STRICT_RETRY_COUNT } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Recognition can feed three tasks. Rewrite treats speech as an instruction.',
    captionZh: '识别结果可以进入三种任务。改写任务把口述当作指令。',
  }, {
    caption: 'Stable instructions stay in system. This run’s input stays in user.',
    captionZh: '固定说明放进 system。本次输入放进 user。',
  }, {
    caption: 'Four instruction layers join one input. They form one Transcribe cleanup prompt.',
    captionZh: '四层说明加入一份输入，组成整理听写的 prompt。',
  }, {
    caption: 'Each task has its own answer contract. Built-in Transcribe extracts &lt;output&gt;.',
    captionZh: '三种任务各有输出约定。内置整理听写会取出 &lt;output&gt; 内容。',
  }, {
    caption: 'Long dictation is split into pieces. Their answers rejoin in speech order.',
    captionZh: '长听写会分成几片。各片答案按原话顺序合回来。',
  }, {
    caption: 'A failed piece keeps its recognized words. Other pieces can still be cleaned.',
    captionZh: '失败的分片保留识别原话。其他分片仍能使用清理结果。',
  }, {
    caption: 'Translate retries a suspected echo once. Rewrite cannot fall back to its spoken instruction.',
    captionZh: '翻译发现疑似回显会重试一次。改写不会把口述指令当结果。',
  }];
  const ariaLabels = [{
    en: 'After recognition, one result can take one of three task routes. Transcribe treats words such as Good morning as text to tidy. Translate treats them as text to translate. Rewrite treats words such as Make it shorter as an instruction. Selected or typed text can supply the content to rewrite.',
    zh: '识别后，一份结果可以进入三种任务路线之一。整理听写把 Good morning 这类话当作要整理的文字，翻译把它当作要翻译的文字。改写把 Make it shorter 这类话当作指令。选区或框内输入可以提供要改写的内容。',
  }, {
    en: 'One request orders its messages as system, optional history, then user. System holds reusable role, task and output instructions. History can hold examples or earlier turns. User holds this run’s recognized text, selection, typed text or instruction.',
    zh: '一个请求的消息顺序是 system、可选的 history、user。system 保存可复用的角色、任务和输出说明。history 可以保存示例或前几轮对话。user 保存本次的识别文字、选区、框内输入或指令。',
  }, {
    en: 'A simplified Transcribe cleanup prompt has five functional parts. Four system instruction layers cover the role, cleanup rules, task and output contract. One user message supplies the recognized text inside an input wrapper. Four plus one makes five parts in one prompt.',
    zh: '一个简化的整理听写 prompt 有五个功能部分。system 的四层说明分别是角色、清理规则、任务和输出约定。一条 user 消息把识别文字放进 input 包裹。四加一组成一个 prompt 的五个部分。',
  }, {
    en: 'Three tasks have three answer contracts. Built-in Transcribe changes an answer containing output tags into only the inner text. Translate preserves output tags that belong to the text. A first Rewrite from scratch reads title and content fields. The answers are constructed examples.',
    zh: '三种任务有三种输出约定。内置整理听写把带 output 标签的回答处理成标签内的文字。翻译保留正文本身的 output 标签。首次从零改写读取 title 和 content 字段。回答是构造示例。',
  }, {
    en: 'One constructed long dictation becomes three requests. Every request has the same system instructions and a different user piece. The three answers join in their original order as one dictation. Translate and Rewrite do not split this way.',
    zh: '一段构造的长听写变成三个请求。每个请求使用相同的 system 说明和不同的 user 分片。三份答案按原顺序合成一段听写。翻译和改写不按这种方式分片。',
  }, {
    en: 'In the same three-piece dictation, pieces one and three have cleaned answers. Piece two fails and keeps its recognized words. The three outputs still join in order. The session ends Done with ProblemLLM and Degraded true because one piece was not cleaned.',
    zh: '同一段三片听写中，第一片和第三片得到清理结果。第二片失败并保留识别原话。三份输出仍按顺序合回。因为有一片没有清理，会话以 Done、ProblemLLM 和 Degraded 为 true 结束。',
  }, {
    en: 'A constructed selected Translate answer repeats Good morning. Voxt makes one strict retry. If the final answer is still an echo and language mismatch gives positive evidence, the session fails without insertion. A constructed Rewrite request fails. Its speech, Make it shorter, is an instruction, so there are zero raw-speech fallbacks.',
    zh: '构造的选区翻译回答重复 Good morning。Voxt 追加一次 strict 重试。如果最终回答仍是回显，并且有明确的语言不匹配证据，会话失败且不插入。构造的改写请求失败。Make it shorter 这段口述是指令，所以没有口述原文回退。',
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
  const H = $derived((phone ? [680, 620, 670, 660, 650, 650, 710] : [480, 410, 460, 420, 430, 430, 460])[step]);
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
      {:else if step === 1}
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
      {:else if step === 2}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('TRANSCRIBE + CLEANUP · ONE PROMPT', '整理听写 + 清理 · 一份 prompt')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('prompt = the complete instructions and input', 'prompt = 完整的说明和输入')}</text>
        <rect x={phone ? 20 : 30} y={phone ? 72 : 75} width={phone ? 260 : 400} height={phone ? 350 : 290} rx="11" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
        <text x={phone ? 150 : 230} y={phone ? 98 : 102} text-anchor="middle" class="label">SYSTEM · 4 {t('INSTRUCTION LAYERS', '层说明')}</text>
        {#each [
          { name: '1 · ROLE', nameZh: '1 · 角色', detail: 'who should do the work', detailZh: '谁来做这项工作' },
          { name: '2 · CLEANUP', nameZh: '2 · 清理规则', detail: 'which fillers and repeats to remove', detailZh: '去掉哪些口头填充和重复' },
          { name: '3 · TASK', nameZh: '3 · 任务', detail: 'tidy this dictation', detailZh: '整理这段听写' },
          { name: '4 · OUTPUT', nameZh: '4 · 输出约定', detail: 'put the answer in <output>', detailZh: '把答案放进 <output>' },
        ] as layer, i}
          {@const x = phone ? 35 : 50}
          {@const y = phone ? 112 + i * 73 : 115 + i * 60}
          {@const w = phone ? 230 : 360}
          <rect {x} {y} width={w} height={phone ? 62 : 50} rx="8" fill="white" stroke="var(--line)" />
          <text x={x + 14} y={y + (phone ? 23 : 20)} class="label">{t(layer.name, layer.nameZh)}</text>
          <text x={x + 14} y={y + (phone ? 47 : 39)} class="detail">{t(layer.detail, layer.detailZh)}</text>
        {/each}
        {#if phone}
          <line x1="150" y1="426" x2="150" y2="450" stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
        {:else}
          <line x1="435" y1="220" x2="475" y2="220" stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
        {/if}
        <rect x={phone ? 35 : 485} y={phone ? 460 : 145} width={phone ? 230 : 200} height={phone ? 100 : 150} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
        <text x={phone ? 150 : 585} y={phone ? 487 : 174} text-anchor="middle" class="label" fill="var(--accent)">USER · 1 {t('INPUT', '份输入')}</text>
        <text x={phone ? 150 : 585} y={phone ? 516 : 213} text-anchor="middle" class="mono">&lt;input&gt;</text>
        <text x={phone ? 150 : 585} y={phone ? 541 : 244} text-anchor="middle" class="value small">“Good morning.”</text>
        {#if !phone}<text x="585" y="272" text-anchor="middle" class="mono">&lt;/input&gt;</text>{/if}
        <text x={W / 2} y={phone ? 595 : 390} text-anchor="middle" class="cut">4 + 1 = {VOXT_COMPOSE_PROMPT_PART_COUNT} {t('PARTS · ONE PROMPT', '个部分 · 一份 prompt')}</text>
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Simplified map · form and example layers omitted.', '简化图 · 省略格式和示例层。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('The input value is constructed.', '输入值是构造的。')}</text>
      {:else if step === 3}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('THREE TASKS · THREE ANSWER CONTRACTS', '三种任务 · 三种输出约定')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('answer contract = the shape Voxt expects back', '输出约定 = Voxt 期望收到的回答形状')}</text>
        {#each [
          { name: 'TRANSCRIBE', nameZh: '整理听写', scope: 'BUILT-IN CLEANUP', scopeZh: '内置清理', answer: '<output>Hi.</output>', kept: 'Hi.' },
          { name: 'TRANSLATE', nameZh: '翻译', scope: 'TAGS IN THE TEXT', scopeZh: '正文里的标签', answer: '“<output>”', kept: '“<output>”' },
          { name: 'REWRITE', nameZh: '改写', scope: 'FIRST FROM SCRATCH', scopeZh: '首次从零写作', answer: '{title, content}', kept: 'title + content' },
        ] as contract, i}
          {@const x = phone ? 25 : 25 + i * 230}
          {@const y = phone ? 70 + i * 145 : 75}
          {@const w = phone ? 250 : 210}
          <rect {x} {y} width={w} height={phone ? 125 : 230} rx="10" fill="var(--bg)" stroke="var(--line)" stroke-width="1.5" />
          <text x={x + w / 2} y={y + 22} text-anchor="middle" class="label">{t(contract.name, contract.nameZh)}</text>
          <text x={x + w / 2} y={y + 42} text-anchor="middle" class="detail">{t(contract.scope, contract.scopeZh)}</text>
          {#if phone}
            <text x={x + 14} y={y + 68} class="detail">{t('MODEL ANSWER', '模型回答')}</text>
            <text x={x + w - 14} y={y + 68} text-anchor="end" class="mono">{contract.answer}</text>
            <text x={x + 14} y={y + 103} class="detail" fill="var(--accent)">{t('VOXT KEEPS', 'VOXT 保留')}</text>
            <text x={x + w - 14} y={y + 103} text-anchor="end" class="value small" fill="var(--accent)">{contract.kept}</text>
          {:else}
            <text x={x + w / 2} y={y + 69} text-anchor="middle" class="detail">{t('MODEL ANSWER', '模型回答')}</text>
            <text x={x + w / 2} y={y + 94} text-anchor="middle" class="mono">{contract.answer}</text>
            <line x1={x + w / 2} y1={y + 105} x2={x + w / 2} y2={y + 121} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
            <text x={x + w / 2} y={y + 142} text-anchor="middle" class="detail" fill="var(--accent)">{t('VOXT KEEPS', 'VOXT 保留')}</text>
            <text x={x + w / 2} y={y + 165} text-anchor="middle" class="value small" fill="var(--accent)">{contract.kept}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 535 : 340} text-anchor="middle" class="cut">{VOXT_COMPOSE_TASK_COUNT} {t('TASKS', '种任务')} = {VOXT_COMPOSE_TASK_COUNT} {t('ANSWER CONTRACTS', '种输出约定')}</text>
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed answers · later Rewrite turns use plain text.', '构造的回答 · 后续改写轮次使用纯文本。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Invalid first-write JSON becomes cleaned plain text.', '首次写作的 JSON 无效时，按清理后的纯文本处理。')}</text>
      {:else if step === 4}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('LONG DICTATION · SPLIT · REJOIN IN ORDER', '长听写 · 分片 · 按顺序合回')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('piece = one shorter request from the dictation', '分片 = 长听写拆出的一份较短请求')}</text>
        <rect x={phone ? 35 : 30} y={phone ? 75 : 150} width={phone ? 230 : 160} height={phone ? 90 : 140} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
        <text x={phone ? 150 : 110} y={phone ? 104 : 185} text-anchor="middle" class="label" fill="var(--accent)">1 {t('LONG DICTATION', '段长听写')}</text>
        <text x={phone ? 150 : 110} y={phone ? 137 : 222} text-anchor="middle" class="value">{t('spoken words', '识别出的原话')}</text>
        {#if !phone}<text x="110" y="254" text-anchor="middle" class="detail">{t('from Ch. 4', '来自第 4 章')}</text>{/if}
        <line x1={phone ? 150 : 195} y1={phone ? 170 : 220} x2={phone ? 150 : 240} y2={phone ? 195 : 220} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
        <rect x={phone ? 15 : 250} y={phone ? 205 : 65} width={phone ? 270 : 230} height={phone ? 145 : 275} rx="10" fill="none" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x={phone ? 150 : 365} y={phone ? 226 : 89} text-anchor="middle" class="label">{VOXT_COMPOSE_PIECE_COUNT} {t('REQUESTS', '个请求')}</text>
        {#each Array(VOXT_COMPOSE_PIECE_COUNT) as _, i}
          {@const x = phone ? 25 + i * 87 : 270}
          {@const y = phone ? 240 : 105 + i * 80}
          {@const w = phone ? 80 : 190}
          <rect {x} {y} width={w} height={phone ? 90 : 65} rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + w / 2} y={y + 21} text-anchor="middle" class="label">{t('PIECE', '分片')} {i + 1}</text>
          <text x={x + w / 2} y={y + 43} text-anchor="middle" class="detail">{t('same system', '相同 system')}</text>
          <text x={x + w / 2} y={y + 65} text-anchor="middle" class="detail">user {i + 1}</text>
        {/each}
        <line x1={phone ? 150 : 485} y1={phone ? 355 : 220} x2={phone ? 150 : 530} y2={phone ? 390 : 220} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
        <rect x={phone ? 35 : 540} y={phone ? 400 : 150} width={phone ? 230 : 150} height={phone ? 110 : 140} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
        <text x={phone ? 150 : 615} y={phone ? 429 : 183} text-anchor="middle" class="label" fill="var(--accent)">{VOXT_COMPOSE_ORDERED_RESULT_COUNT} {t('ORDERED RESULT', '份有序结果')}</text>
        <text x={phone ? 150 : 615} y={phone ? 461 : 220} text-anchor="middle" class="value">1 → 2 → 3</text>
        <text x={phone ? 150 : 615} y={phone ? 486 : 249} text-anchor="middle" class="detail">{t('answers in speech order', '答案按原话顺序')}</text>
        <text x={W / 2} y={phone ? 555 : 370} text-anchor="middle" class="cut">{VOXT_COMPOSE_PIECE_COUNT} {t('PIECES', '个分片')} → {VOXT_COMPOSE_ORDERED_RESULT_COUNT} {t('ORDERED DICTATION', '段有序听写')}</text>
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed three-piece example.', '构造的三片示例。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Translate and Rewrite each use one request.', '翻译和改写各用一个请求。')}</text>
      {:else if step === 5}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('TRANSCRIBE · ONE PIECE FAILS', '整理听写 · 一片失败')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('degraded = finished with some recognized words left', 'degraded = 完成，但仍有原话分片')}</text>
        {#each Array(VOXT_COMPOSE_PIECE_COUNT) as _, i}
          {@const failed = i === 1}
          {@const x = phone ? 25 : 25 + i * 230}
          {@const y = phone ? 70 + i * 130 : 80}
          {@const w = phone ? 250 : 210}
          <rect {x} {y} width={w} height={phone ? 110 : 190} rx="10" fill={failed ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={failed ? 'var(--gen)' : 'var(--accent)'} stroke-width="1.5" />
          <text x={x + w / 2} y={y + 23} text-anchor="middle" class="label">{t('PIECE', '分片')} {i + 1}</text>
          <text x={x + w / 2} y={y + 46} text-anchor="middle" class="detail">{failed ? t('CLEANUP FAILED', '清理失败') : t('CLEANUP OK', '清理成功')}</text>
          {#if phone}
            <text x={x + 14} y={y + 83} class="detail">{t('KEEPS', '保留')}</text>
            <text x={x + w - 14} y={y + 83} text-anchor="end" class="value small" fill={failed ? 'var(--gen)' : 'var(--accent)'}>{failed ? t('RECOGNIZED 2', '识别原话 2') : t(`CLEANED ${i + 1}`, `清理结果 ${i + 1}`)}</text>
          {:else}
            <line x1={x + w / 2} y1={y + 61} x2={x + w / 2} y2={y + 88} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
            <text x={x + w / 2} y={y + 113} text-anchor="middle" class="detail">{t('KEEPS', '保留')}</text>
            <text x={x + w / 2} y={y + 146} text-anchor="middle" class="value small" fill={failed ? 'var(--gen)' : 'var(--accent)'}>{failed ? t('RECOGNIZED 2', '识别原话 2') : t(`CLEANED ${i + 1}`, `清理结果 ${i + 1}`)}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 490 : 320} text-anchor="middle" class="cut">{VOXT_COMPOSE_CLEANED_PIECE_COUNT} {t('CLEANED', '片清理')} + {VOXT_COMPOSE_FAILED_PIECE_COUNT} {t('RECOGNIZED', '片原话')} → {VOXT_COMPOSE_ORDERED_RESULT_COUNT} {t('ORDERED RESULT', '段有序结果')}</text>
        {#if phone}
          <text x={W / 2} y="540" text-anchor="middle" class="label">DONE · ProblemLLM</text>
          <text x={W / 2} y="563" text-anchor="middle" class="label">Degraded = true</text>
        {:else}
          <text x={W / 2} y="365" text-anchor="middle" class="label">DONE · ProblemLLM · Degraded = true</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed failure in piece 2.', '构造第二片失败的情形。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Late answers cannot replace the chosen result.', '迟到的答案不能替换已选定的结果。')}</text>
      {:else}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('TRANSLATE AND REWRITE · DIFFERENT EXITS', '翻译和改写 · 不同出口')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('echo = the answer repeats the source', '回显 = 答案照抄原文')}</text>
        {#each [
          { name: 'TRANSLATE · SELECTION', nameZh: '翻译 · 选区', input: '“Good morning.”', role: 'ANSWER REPEATS THE SELECTION', roleZh: '回答重复选区原文' },
          { name: 'REWRITE · SPEECH', nameZh: '改写 · 口述', input: '“Make it shorter.”', role: 'SPEECH IS AN INSTRUCTION', roleZh: '口述内容是指令' },
        ] as job, i}
          {@const x = phone ? 25 : 40 + i * 340}
          {@const y = phone ? 70 + i * 285 : 75}
          {@const w = phone ? 250 : 300}
          <rect {x} {y} width={w} height={phone ? 260 : 300} rx="10" fill="var(--bg)" stroke="var(--line)" stroke-width="1.5" />
          <text x={x + w / 2} y={y + 24} text-anchor="middle" class="label">{t(job.name, job.nameZh)}</text>
          <text x={x + w / 2} y={y + 58} text-anchor="middle" class="value">{job.input}</text>
          <text x={x + w / 2} y={y + 82} text-anchor="middle" class="detail">{t(job.role, job.roleZh)}</text>
          <line x1={x + w / 2} y1={y + 94} x2={x + w / 2} y2={y + 115} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
          {#if i === 0}
            <text x={x + w / 2} y={y + 141} text-anchor="middle" class="value small" fill="var(--accent)">{t('STRICT RETRY', 'STRICT 重试')} × {VOXT_TRANSLATE_STRICT_RETRY_COUNT}</text>
            <text x={x + w / 2} y={y + 166} text-anchor="middle" class="detail">{t('STILL AN ECHO', '仍然是回显')}</text>
            <text x={x + w / 2} y={y + 186} text-anchor="middle" class="detail">+ {t('LANGUAGE MISMATCH', '语言不匹配证据')}</text>
          {:else}
            <text x={x + w / 2} y={y + 141} text-anchor="middle" class="value small" fill="var(--gen)">{t('REQUEST FAILED', '请求失败')}</text>
            <text x={x + w / 2} y={y + 166} text-anchor="middle" class="detail">{t('THE REQUEST DID NOT FINISH', '请求没有完成')}</text>
            <text x={x + w / 2} y={y + 186} text-anchor="middle" class="detail">{t('SPEECH IS NOT RESULT TEXT', '口述不是结果正文')}</text>
          {/if}
          <text x={x + w / 2} y={y + 222} text-anchor="middle" class="value small" fill="var(--gen)">FAILED · {t('NO INSERT', '不插入')}</text>
          {#if i === 1}
            <text x={x + w / 2} y={y + (phone ? 246 : 270)} text-anchor="middle" class="detail" fill="var(--gen)">{VOXT_REWRITE_SPEECH_FALLBACK_COUNT} {t('RAW-SPEECH FALLBACKS', '个口述原文回退')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 655 : 415} text-anchor="middle" class="cut">{VOXT_TRANSLATE_STRICT_RETRY_COUNT} {t('STRICT RETRY', '次 STRICT 重试')} · {VOXT_REWRITE_SPEECH_FALLBACK_COUNT} {t('REWRITE SPEECH FALLBACKS', '个改写口述回退')}</text>
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed failures · no real model was called.', '构造的失败路径 · 没有调用真实模型。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Spoken Translate has separate skip and timeout exits.', '语音翻译另有跳过和超时出口。')}</text>
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
