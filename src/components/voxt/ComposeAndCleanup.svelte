<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { VOXT_COMPOSE_CLEANED_PIECE_COUNT, VOXT_COMPOSE_FAILED_PIECE_COUNT, VOXT_COMPOSE_ORDERED_RESULT_COUNT, VOXT_COMPOSE_PIECE_COUNT, VOXT_COMPOSE_PROMPT_PART_COUNT, VOXT_COMPOSE_TASK_COUNT, VOXT_COMPOSE_TRUNCATED_ANSWER_COUNT, VOXT_COMPOSE_UNSEEN_INSERT_COUNT, VOXT_REWRITE_SPEECH_FALLBACK_COUNT, VOXT_TRANSLATE_STRICT_RETRY_COUNT } from '../../voxt/numbers';

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
    caption: 'Translate retries an echoed answer once. Rewrite never inserts its spoken instruction.',
    captionZh: '翻译发现回答照抄原文时会重试一次。改写不会插入口述指令。',
  }, {
    caption: 'A cut-off Translate or Rewrite answer waits in the answer card. It never inserts unseen.',
    captionZh: '截断的翻译或改写回答留在答案卡。它不会在你没看到时插入。',
  }];
  const ariaLabels = [{
    en: 'The picture builds in order: one recognized result appears first, then the three task cards arrive one at a time. Transcribe treats words such as Good morning as text to tidy, Translate treats them as text to translate, and Rewrite treats words such as Make it shorter as an instruction. Finally the count one times three equals three route choices appears.',
    zh: '画面按顺序形成：先出现一份识别结果，随后三张任务卡逐一到达。整理听写把 Good morning 这类话当作要整理的文字，翻译把它当作要翻译的文字，改写把 Make it shorter 这类话当作指令。最后出现 1 乘 3 等于 3 条路线选择。',
  }, {
    en: 'The picture builds in order: the system card with reusable instructions appears first, then the dashed optional history card, then the user card with this run’s input, and finally the line reuse the instructions, replace the input.',
    zh: '画面按顺序形成：先出现装着可复用说明的 system 卡，再出现虚线的可选 history 卡，再出现装着本次输入的 user 卡，最后出现「复用说明、替换本次输入」一行。',
  }, {
    en: 'The picture builds in order: an empty system box appears, then the role, cleanup, task and output layers stack into it one at a time, then the user card joins with the recognized text inside an input wrapper, and finally the count four plus one equals five parts in one prompt.',
    zh: '画面按顺序形成：先出现空的 system 框，角色、清理规则、任务、输出约定四层说明逐层落入，再是 user 卡带着 input 包裹里的识别文字加入，最后出现 4 加 1 等于一份 prompt 的 5 个部分。',
  }, {
    en: 'The picture builds in order: three empty contract cards appear, then each task plays its own cleaning. Transcribe’s model answer with output tags appears and becomes only the inner text. Translate’s answer keeps tags that belong to the text. Rewrite’s first new document gains a title Note and content Hi. Finally the count three tasks, three answer contracts appears.',
    zh: '画面按顺序形成：先出现三张空的约定卡，随后每种任务各演一遍自己的清理。整理听写的模型回答带着 output 标签出现，再变成标签内的文字；翻译的回答保留正文本身的 output 标签；改写的首个新文档得到标题 Note 和正文 Hi。最后出现 3 种任务、3 种输出约定。',
  }, {
    en: 'The picture builds in order: one long dictation appears, then three requests form one at a time inside a dashed box, each with the same system and a different user piece, then their answers join into one ordered result one arrow two arrow three, and finally the count three pieces into one ordered dictation.',
    zh: '画面按顺序形成：先出现一段长听写，虚线框里的三个请求逐一形成，每个请求用相同的 system 和不同的 user 分片，随后三份答案按 1、2、3 的顺序合成一份有序结果，最后出现 3 个分片合成 1 段有序听写。',
  }, {
    en: 'The picture builds in order: three neutral piece cards appear, then piece one turns cleaned and keeps cleaned one, piece two fails, turns orange and keeps its recognized words, piece three turns cleaned and keeps cleaned three. Then the count two cleaned plus one recognized joins into one ordered result, and the session ends Done with ProblemLLM and Degraded true.',
    zh: '画面按顺序形成：先出现三张中性的分片卡，第一片变为清理成功并保留清理结果 1，第二片失败、变为橙色并保留识别原话 2，第三片变为清理成功并保留清理结果 3。随后出现 2 片清理加 1 片原话合成 1 段有序结果，会话以 Done、ProblemLLM 和 Degraded 为 true 结束。',
  }, {
    en: 'The picture builds in order: two job cards appear with their inputs. On the Translate card the answer repeats the selection, a retry with a do-not-echo instruction appears, the answer is still an echo with evidence of the wrong language, and the session ends failed with no insert. On the Rewrite card the request fails, and the session ends failed with no insert and zero instructions used as results.',
    zh: '画面按顺序形成：先出现两张任务卡和各自的输入。翻译卡上回答重复了选区原文，出现一次不要照抄原文的重试，回答仍是回显并有语言不正确的证据，会话失败且不插入。改写卡上请求失败，会话失败且不插入，被当作结果的指令为 0 个。',
  }, {
    en: 'The picture builds in order: a model answer card appears, then the incomplete text with finish reason length fills it, then the answer moves into one answer card for review, the session ends Done with ProblemTruncated and Degraded true, and finally the count one partial answer, one answer card and zero unseen inserts appears.',
    zh: '画面按顺序形成：先出现模型回答卡，随后不完整的文字和 length 结束原因填入，回答再进入一张答案卡供检查，会话以 Done、ProblemTruncated 和 Degraded 为 true 结束，最后出现 1 份不完整回答、1 张答案卡和 0 次未查看就插入。',
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
  const H = $derived((phone ? [680, 620, 700, 660, 650, 650, 710, 610] : [480, 410, 460, 420, 430, 430, 460, 440])[step]);
  // Every step builds its state instead of showing a finished picture:
  // Step 1: one result, then the three task cards one at a time, then the count.
  // Step 2: the system card, then the optional history card, then the user card.
  // Step 3: an empty system box, the four layers stack in one at a time, then the
  //   user card joins, then the 4 + 1 count.
  // Step 4: three empty contract cards; each task then plays its own cleaning:
  //   the model answer appears, then what Voxt keeps.
  // Step 5: one long dictation, the three piece requests form one at a time,
  //   then the answers join in order.
  // Step 6: three neutral pieces; piece 1 is cleaned, piece 2 fails and keeps
  //   its recognized words, piece 3 is cleaned, then the join and Done.
  // Step 7: two job cards; the Translate echo, the retry, the final echo and
  //   the failed exit, then the Rewrite failure and its failed exit.
  // Step 8: the answer card frame, the truncated answer, the move into the
  //   answer card, then Done and the zero unseen inserts.
  const PHASE_COUNTS = [5, 5, 7, 8, 6, 6, 7, 5];
  const PHASE_MS = 900;
  const REST_MS = 2200;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0), reduced = $state(false);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { phase = PHASE_COUNTS[s] - 1; return; }
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
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="compose-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {#if !reduced}
        {#if phone}<LoopProgress ms={lapMs} {lap} x={228} y={60} />{:else}<LoopProgress ms={lapMs} {lap} />{/if}
      {/if}
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
        {#if phase >= i + 1}
          <g in:fly={{ y: 40, duration: 500 }}>
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
          </g>
        {/if}
      {/each}
      {#if phase >= 4}
        <text x={W / 2} y={phone ? 595 : 425} text-anchor="middle" class="cut" transition:fade>1 × {VOXT_COMPOSE_TASK_COUNT} = {VOXT_COMPOSE_TASK_COUNT} {t('ROUTE CHOICES · CHOOSE 1', '条路线选择 · 选 1 条')}</text>
      {/if}
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
          {#if phase >= i + 1}
            <g in:fly={{ y: 40, duration: 500 }}>
              {#if i > 0}
                {#if phone}
                  <line x1="150" y1={y - 26} x2="150" y2={y - 5} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
                {:else}
                  <line x1={x - 20} y1={y + h / 2} x2={x - 8} y2={y + h / 2} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
                {/if}
              {/if}
              <rect {x} {y} width={w} height={h} rx="10" fill={i === 2 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 2 ? 'var(--accent)' : 'var(--line)'} stroke-width={i === 2 ? 2 : 1.5} stroke-dasharray={i === 1 ? '5 4' : undefined} />
              <text x={x + w / 2} y={y + 27} text-anchor="middle" class="label" fill={i === 2 ? 'var(--accent)' : 'var(--fg)'}>{t(role.name, role.nameZh)}</text>
              <text x={x + w / 2} y={y + 57} text-anchor="middle" class="value small">{t(role.detail, role.detailZh)}</text>
              <text x={x + w / 2} y={y + (phone ? 82 : 101)} text-anchor="middle" class="detail">{t(role.lines[0], role.linesZh[0])}</text>
              <text x={x + w / 2} y={y + (phone ? 105 : 137)} text-anchor="middle" class="detail">{t(role.note, role.noteZh)}</text>
              {#if !phone && i === 0}
                <text x={x + w / 2} y={y + 161} text-anchor="middle" class="detail">{t('cleanup rules when used', '需要时还有清理规则')}</text>
              {/if}
            </g>
          {/if}
        {/each}
        {#if phase >= 4}
          <text x={W / 2} y={phone ? 565 : 325} text-anchor="middle" class="cut" transition:fade>{t('REUSE THE INSTRUCTIONS · REPLACE THE INPUT', '复用说明 · 替换本次输入')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('History can be empty when there are no earlier turns.', '没有前几轮对话时，history 可以为空。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Each run supplies a new user input.', '每次运行都会提供新的 user 输入。')}</text>
      {:else if step === 2}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('TRANSCRIBE + CLEANUP · ONE PROMPT', '整理听写 + 清理 · 一份 prompt')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('prompt = the complete instructions and input', 'prompt = 完整的说明和输入')}</text>
        <rect x={phone ? 20 : 30} y={phone ? 72 : 75} width={phone ? 260 : 400} height={phone ? 350 : 290} rx="11" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5" />
        <text x={phone ? 150 : 230} y={phone ? 98 : 102} text-anchor="middle" class="label">SYSTEM · 4 {t('INSTRUCTION LAYERS', '层说明')}</text>
        {#each [
          { name: '1 · ROLE', nameZh: '1 · 角色', detail: 'who should do the work', detailZh: '谁来做这项工作' },
          { name: '2 · CLEANUP', nameZh: '2 · 清理规则', detail: 'remove fillers such as “um”', detailZh: '去掉“嗯”这类口头填充' },
          { name: '3 · TASK', nameZh: '3 · 任务', detail: 'tidy this dictation', detailZh: '整理这段听写' },
          { name: '4 · OUTPUT', nameZh: '4 · 输出约定', detail: 'tags around the answer', detailZh: '答案前后的标签' },
        ] as layer, i}
          {@const x = phone ? 35 : 50}
          {@const y = phone ? 112 + i * 73 : 115 + i * 60}
          {@const w = phone ? 230 : 360}
          {#if phase >= i + 1}
            <g in:fly={{ y: -30, duration: 450 }}>
              <rect {x} {y} width={w} height={phone ? 62 : 50} rx="8" fill="white" stroke="var(--line)" />
              <text x={x + 14} y={y + (phone ? 23 : 20)} class="label">{t(layer.name, layer.nameZh)}</text>
              <text x={x + 14} y={y + (phone ? 47 : 39)} class="detail">{t(layer.detail, layer.detailZh)}</text>
            </g>
          {/if}
        {/each}
        {#if phase >= 5}
          <g in:fly={{ y: 40, duration: 500 }}>
            {#if phone}
              <line x1="150" y1="426" x2="150" y2="445" stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
            {:else}
              <line x1="435" y1="220" x2="475" y2="220" stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
            {/if}
            <rect x={phone ? 35 : 485} y={phone ? 450 : 145} width={phone ? 230 : 200} height={phone ? 120 : 150} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
            <text x={phone ? 150 : 585} y={phone ? 475 : 174} text-anchor="middle" class="label" fill="var(--accent)">USER · 1 {t('INPUT', '份输入')}</text>
            <text x={phone ? 150 : 585} y={phone ? 500 : 213} text-anchor="middle" class="mono">&lt;input&gt;</text>
            <text x={phone ? 150 : 585} y={phone ? 526 : 244} text-anchor="middle" class="value small">“Good morning.”</text>
            <text x={phone ? 150 : 585} y={phone ? 552 : 272} text-anchor="middle" class="mono">&lt;/input&gt;</text>
          </g>
        {/if}
        {#if phase >= 6}
          <text x={W / 2} y={phone ? 610 : 390} text-anchor="middle" class="cut" transition:fade>4 + 1 = {VOXT_COMPOSE_PROMPT_PART_COUNT} {t('PARTS · ONE PROMPT', '个部分 · 一份 prompt')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Tags mark where text starts and ends.', '标签标出文字从哪里开始、到哪里结束。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Simplified map · constructed input.', '简化图 · 构造的输入。')}</text>
      {:else if step === 3}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('THREE TASKS · THREE ANSWER CONTRACTS', '三种任务 · 三种输出约定')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('answer contract = the shape Voxt expects back', '输出约定 = Voxt 期望收到的回答形状')}</text>
        {#each [
          { name: 'TRANSCRIBE', nameZh: '整理听写', scope: 'BUILT-IN CLEANUP', scopeZh: '内置清理', answer: '<output>Hi.</output>', answer2: '', kept: 'Hi.' },
          { name: 'TRANSLATE', nameZh: '翻译', scope: 'TAGS IN THE TEXT', scopeZh: '正文里的标签', answer: '“<output>”', answer2: '', kept: '“<output>”' },
          { name: 'REWRITE', nameZh: '改写', scope: 'FIRST NEW DOCUMENT', scopeZh: '首次写新文档', answer: 'title: “Note”', answer2: 'content: “Hi.”', kept: '“Note” + “Hi.”' },
        ] as contract, i}
          {@const x = phone ? 25 : 25 + i * 230}
          {@const y = phone ? 70 + i * 145 : 75}
          {@const w = phone ? 250 : 210}
          <rect {x} {y} width={w} height={phone ? 125 : 230} rx="10" fill="var(--bg)" stroke="var(--line)" stroke-width="1.5" />
          <text x={x + w / 2} y={y + 22} text-anchor="middle" class="label">{t(contract.name, contract.nameZh)}</text>
          <text x={x + w / 2} y={y + 42} text-anchor="middle" class="detail">{t(contract.scope, contract.scopeZh)}</text>
          {#if phase >= i * 2 + 1}
            {#if phone && contract.answer2}
              <text x={x + w / 2} y={y + 59} text-anchor="middle" class="detail" transition:fade>{t('MODEL ANSWER', '模型回答')}</text>
              <text x={x + w / 2} y={y + 79} text-anchor="middle" class="mono" transition:fade>{contract.answer}</text>
              <text x={x + w / 2} y={y + 98} text-anchor="middle" class="mono" transition:fade>{contract.answer2}</text>
            {:else if phone}
              <text x={x + 14} y={y + 68} class="detail" transition:fade>{t('MODEL ANSWER', '模型回答')}</text>
              <text x={x + w - 14} y={y + 68} text-anchor="end" class="mono" transition:fade>{contract.answer}</text>
            {:else}
              <text x={x + w / 2} y={y + 69} text-anchor="middle" class="detail" transition:fade>{t('MODEL ANSWER', '模型回答')}</text>
              <text x={x + w / 2} y={y + 94} text-anchor="middle" class="mono" transition:fade>{contract.answer}</text>
              {#if contract.answer2}<text x={x + w / 2} y={y + 113} text-anchor="middle" class="mono" transition:fade>{contract.answer2}</text>{/if}
            {/if}
          {/if}
          {#if phase >= i * 2 + 2}
            {#if phone && contract.answer2}
              <text x={x + w / 2} y={y + 119} text-anchor="middle" class="detail" fill="var(--accent)" transition:fade>{t('KEEP', '保留')} {contract.kept}</text>
            {:else if phone}
              <text x={x + 14} y={y + 103} class="detail" fill="var(--accent)" transition:fade>{t('VOXT KEEPS', 'VOXT 保留')}</text>
              <text x={x + w - 14} y={y + 103} text-anchor="end" class="value small" fill="var(--accent)" transition:fade>{contract.kept}</text>
            {:else}
              <line x1={x + w / 2} y1={y + (contract.answer2 ? 124 : 105)} x2={x + w / 2} y2={y + (contract.answer2 ? 140 : 121)} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" transition:fade />
              <text x={x + w / 2} y={y + (contract.answer2 ? 161 : 142)} text-anchor="middle" class="detail" fill="var(--accent)" transition:fade>{t('VOXT KEEPS', 'VOXT 保留')}</text>
              <text x={x + w / 2} y={y + (contract.answer2 ? 184 : 165)} text-anchor="middle" class="value small" fill="var(--accent)" transition:fade>{contract.kept}</text>
            {/if}
          {/if}
        {/each}
        {#if phase >= 7}
          <text x={W / 2} y={phone ? 535 : 340} text-anchor="middle" class="cut" transition:fade>{VOXT_COMPOSE_TASK_COUNT} {t('TASKS', '种任务')} = {VOXT_COMPOSE_TASK_COUNT} {t('ANSWER CONTRACTS', '种输出约定')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed answers · later Rewrite turns use plain text.', '构造的回答 · 后续改写轮次使用纯文本。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Only built-in Transcribe removes output tags.', '只有内置整理听写会去掉 output 标签。')}</text>
      {:else if step === 4}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('LONG DICTATION · SPLIT · REJOIN IN ORDER', '长听写 · 分片 · 按顺序合回')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('piece = one shorter request from the dictation', '分片 = 长听写拆出的一份较短请求')}</text>
        <rect x={phone ? 35 : 30} y={phone ? 75 : 150} width={phone ? 230 : 160} height={phone ? 90 : 140} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
        <text x={phone ? 150 : 110} y={phone ? 104 : 185} text-anchor="middle" class="label" fill="var(--accent)">1 {t('LONG DICTATION', '段长听写')}</text>
        <text x={phone ? 150 : 110} y={phone ? 137 : 222} text-anchor="middle" class="value">{t('spoken words', '识别出的原话')}</text>
        {#if !phone}<text x="110" y="254" text-anchor="middle" class="detail">{t('from Ch. 4', '来自第 4 章')}</text>{/if}
        {#if phase >= 1}
          <line x1={phone ? 150 : 195} y1={phone ? 170 : 220} x2={phone ? 150 : 240} y2={phone ? 195 : 220} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" transition:fade />
          <rect x={phone ? 15 : 250} y={phone ? 205 : 65} width={phone ? 270 : 230} height={phone ? 145 : 275} rx="10" fill="none" stroke="var(--line)" stroke-dasharray="5 4" transition:fade />
          <text x={phone ? 150 : 365} y={phone ? 226 : 89} text-anchor="middle" class="label" transition:fade>{VOXT_COMPOSE_PIECE_COUNT} {t('REQUESTS', '个请求')}</text>
        {/if}
        {#each Array(VOXT_COMPOSE_PIECE_COUNT) as _, i}
          {@const x = phone ? 25 + i * 87 : 270}
          {@const y = phone ? 240 : 105 + i * 80}
          {@const w = phone ? 80 : 190}
          {#if phase >= i + 1}
            <g in:fly={{ y: 30, duration: 450 }}>
              <rect {x} {y} width={w} height={phone ? 90 : 65} rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x={x + w / 2} y={y + 21} text-anchor="middle" class="label">{t('PIECE', '分片')} {i + 1}</text>
              <text x={x + w / 2} y={y + 43} text-anchor="middle" class="detail">{t('same system', '相同 system')}</text>
              <text x={x + w / 2} y={y + 65} text-anchor="middle" class="detail">user {i + 1}</text>
            </g>
          {/if}
        {/each}
        {#if phase >= 4}
          <g in:fly={{ y: 30, duration: 500 }}>
            <line x1={phone ? 150 : 485} y1={phone ? 355 : 220} x2={phone ? 150 : 530} y2={phone ? 390 : 220} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
            <rect x={phone ? 35 : 540} y={phone ? 400 : 150} width={phone ? 230 : 150} height={phone ? 110 : 140} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
            <text x={phone ? 150 : 615} y={phone ? 429 : 183} text-anchor="middle" class="label" fill="var(--accent)">{VOXT_COMPOSE_ORDERED_RESULT_COUNT} {t('ORDERED RESULT', '份有序结果')}</text>
            <text x={phone ? 150 : 615} y={phone ? 461 : 220} text-anchor="middle" class="value">1 → 2 → 3</text>
            <text x={phone ? 150 : 615} y={phone ? 486 : 249} text-anchor="middle" class="detail">{t('answers in speech order', '答案按原话顺序')}</text>
          </g>
        {/if}
        {#if phase >= 5}
          <text x={W / 2} y={phone ? 555 : 370} text-anchor="middle" class="cut" transition:fade>{VOXT_COMPOSE_PIECE_COUNT} {t('PIECES', '个分片')} → {VOXT_COMPOSE_ORDERED_RESULT_COUNT} {t('ORDERED DICTATION', '段有序听写')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed three-piece example.', '构造的三片示例。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Translate and Rewrite each use one request.', '翻译和改写各用一个请求。')}</text>
      {:else if step === 5}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('TRANSCRIBE · ONE PIECE FAILS', '整理听写 · 一片失败')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('degraded = finished with some recognized words left', 'degraded = 完成，但仍有原话分片')}</text>
        {#each Array(VOXT_COMPOSE_PIECE_COUNT) as _, i}
          {@const failed = i === 1}
          {@const settled = phase >= i + 1}
          {@const x = phone ? 25 : 25 + i * 230}
          {@const y = phone ? 70 + i * 130 : 80}
          {@const w = phone ? 250 : 210}
          <rect {x} {y} width={w} height={phone ? 110 : 190} rx="10" fill={settled ? (failed ? 'var(--gen-soft)' : 'var(--accent-soft)') : 'var(--bg)'} stroke={settled ? (failed ? 'var(--gen)' : 'var(--accent)') : 'var(--line)'} stroke-width="1.5" />
          <text x={x + w / 2} y={y + 23} text-anchor="middle" class="label">{t('PIECE', '分片')} {i + 1}</text>
          {#if settled}
            <text x={x + w / 2} y={y + 46} text-anchor="middle" class="detail" transition:fade>{failed ? t('CLEANUP FAILED', '清理失败') : t('CLEANUP OK', '清理成功')}</text>
            {#if phone}
              <text x={x + 14} y={y + 83} class="detail" transition:fade>{t('KEEPS', '保留')}</text>
              <text x={x + w - 14} y={y + 83} text-anchor="end" class="value small" fill={failed ? 'var(--gen)' : 'var(--accent)'} transition:fade>{failed ? t('RECOGNIZED 2', '识别原话 2') : t(`CLEANED ${i + 1}`, `清理结果 ${i + 1}`)}</text>
            {:else}
              <line x1={x + w / 2} y1={y + 61} x2={x + w / 2} y2={y + 88} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" transition:fade />
              <text x={x + w / 2} y={y + 113} text-anchor="middle" class="detail" transition:fade>{t('KEEPS', '保留')}</text>
              <text x={x + w / 2} y={y + 146} text-anchor="middle" class="value small" fill={failed ? 'var(--gen)' : 'var(--accent)'} transition:fade>{failed ? t('RECOGNIZED 2', '识别原话 2') : t(`CLEANED ${i + 1}`, `清理结果 ${i + 1}`)}</text>
            {/if}
          {/if}
        {/each}
        {#if phase >= 4}
          <text x={W / 2} y={phone ? 490 : 320} text-anchor="middle" class="cut" transition:fade>{VOXT_COMPOSE_CLEANED_PIECE_COUNT} {t('CLEANED', '片清理')} + {VOXT_COMPOSE_FAILED_PIECE_COUNT} {t('RECOGNIZED', '片原话')} → {VOXT_COMPOSE_ORDERED_RESULT_COUNT} {t('ORDERED RESULT', '段有序结果')}</text>
        {/if}
        {#if phase >= 5}
          {#if phone}
            <text x={W / 2} y="540" text-anchor="middle" class="label" transition:fade>DONE · ProblemLLM</text>
            <text x={W / 2} y="563" text-anchor="middle" class="label" transition:fade>Degraded = true</text>
          {:else}
            <text x={W / 2} y="365" text-anchor="middle" class="label" transition:fade>DONE · ProblemLLM · Degraded = true</text>
          {/if}
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed failure in piece 2.', '构造第二片失败的情形。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">ProblemLLM = {t('model cleanup failed', '模型清理失败')}</text>
      {:else if step === 6}
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
          {#if i === 0}
            {#if phase >= 1}
              <line x1={x + w / 2} y1={y + 94} x2={x + w / 2} y2={y + 115} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" transition:fade />
              <text x={x + w / 2} y={y + 141} text-anchor="middle" class="value small" fill="var(--accent)" transition:fade>{t('RETRY: DO NOT ECHO', '重试：不要照抄原文')} × {VOXT_TRANSLATE_STRICT_RETRY_COUNT}</text>
            {/if}
            {#if phase >= 2}
              <text x={x + w / 2} y={y + 166} text-anchor="middle" class="detail" transition:fade>{t('STILL AN ECHO', '仍然是回显')}</text>
              <text x={x + w / 2} y={y + 186} text-anchor="middle" class="detail" transition:fade>+ {t('EVIDENCE OF WRONG LANGUAGE', '语言不正确的证据')}</text>
            {/if}
            {#if phase >= 3}
              <text x={x + w / 2} y={y + 222} text-anchor="middle" class="value small" fill="var(--gen)" transition:fade>FAILED · {t('NO INSERT', '不插入')}</text>
            {/if}
          {:else}
            {#if phase >= 4}
              <text x={x + w / 2} y={y + 141} text-anchor="middle" class="value small" fill="var(--gen)" transition:fade>{t('REQUEST FAILED', '请求失败')}</text>
              <text x={x + w / 2} y={y + 166} text-anchor="middle" class="detail" transition:fade>{t('THE REQUEST DID NOT FINISH', '请求没有完成')}</text>
              <text x={x + w / 2} y={y + 186} text-anchor="middle" class="detail" transition:fade>{t('SPEECH IS NOT RESULT TEXT', '口述不是结果正文')}</text>
            {/if}
            {#if phase >= 5}
              <text x={x + w / 2} y={y + 222} text-anchor="middle" class="value small" fill="var(--gen)" transition:fade>FAILED · {t('NO INSERT', '不插入')}</text>
              <text x={x + w / 2} y={y + (phone ? 246 : 270)} text-anchor="middle" class="detail" fill="var(--gen)" transition:fade>{VOXT_REWRITE_SPEECH_FALLBACK_COUNT} {t('INSTRUCTIONS USED AS RESULTS', '个指令被当作结果')}</text>
            {/if}
          {/if}
        {/each}
        {#if phase >= 6}
          <text x={W / 2} y={phone ? 655 : 415} text-anchor="middle" class="cut" transition:fade>{VOXT_TRANSLATE_STRICT_RETRY_COUNT} {t('RETRY', '次重试')} · {VOXT_REWRITE_SPEECH_FALLBACK_COUNT} {t('INSTRUCTIONS INSERTED', '个指令被插入')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed failures · no real model was called.', '构造的失败路径 · 没有调用真实模型。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Examples: selected Translate and spoken Rewrite.', '示例分别是选区翻译和口述改写。')}</text>
      {:else}
        <text x={W / 2} y="27" text-anchor="middle" class="title">{t('LENGTH LIMIT · SHOW, DO NOT INSERT', '长度上限 · 先展示，不直接插入')}</text>
        <text x={W / 2} y="50" text-anchor="middle" class="subtitle">{t('truncated = the model stopped at its length limit', '截断 = 模型在长度上限处停止')}</text>
        <rect x={phone ? 25 : 35} y={phone ? 70 : 105} width={phone ? 250 : 245} height={phone ? 145 : 175} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5" />
        <text x={phone ? 150 : 157} y={phone ? 96 : 132} text-anchor="middle" class="label">{t('MODEL ANSWER', '模型回答')}</text>
        {#if phase >= 1}
          <text x={phone ? 150 : 157} y={phone ? 133 : 174} text-anchor="middle" class="value" transition:fade>“大家早上…”</text>
          <text x={phone ? 150 : 157} y={phone ? 164 : 211} text-anchor="middle" class="detail" transition:fade>{t('INCOMPLETE TEXT', '不完整的文字')}</text>
          <text x={phone ? 150 : 157} y={phone ? 190 : 249} text-anchor="middle" class="mono" transition:fade>finish_reason = “length”</text>
        {/if}
        {#if phase >= 2}
          <g in:fly={{ y: 30, duration: 500 }}>
            <line x1={phone ? 150 : 285} y1={phone ? 220 : 192} x2={phone ? 150 : 330} y2={phone ? 250 : 192} stroke="var(--muted)" stroke-width="2" marker-end="url(#compose-arrow)" />
            <rect x={phone ? 25 : 345} y={phone ? 260 : 75} width={phone ? 250 : 335} height={phone ? 240 : 240} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
            <text x={phone ? 150 : 512} y={phone ? 289 : 105} text-anchor="middle" class="label" fill="var(--accent)">{VOXT_COMPOSE_TRUNCATED_ANSWER_COUNT} {t('ANSWER CARD', '张答案卡')}</text>
            <text x={phone ? 150 : 512} y={phone ? 314 : 130} text-anchor="middle" class="detail">{t('REVIEW BEFORE INSERTING', '检查后再插入')}</text>
            <text x={phone ? 150 : 512} y={phone ? 357 : 177} text-anchor="middle" class="value">“大家早上…”</text>
          </g>
        {/if}
        {#if phase >= 3}
          <text x={phone ? 150 : 512} y={phone ? 393 : 219} text-anchor="middle" class="label" transition:fade>DONE · ProblemTruncated</text>
          <text x={phone ? 150 : 512} y={phone ? 418 : 244} text-anchor="middle" class="label" transition:fade>Degraded = true</text>
        {/if}
        {#if phase >= 4}
          <text x={phone ? 150 : 512} y={phone ? 465 : 291} text-anchor="middle" class="value small" fill="var(--gen)" transition:fade>{VOXT_COMPOSE_UNSEEN_INSERT_COUNT} {t('UNSEEN INSERTS', '次未查看就插入')}</text>
          <text x={W / 2} y={phone ? 535 : 355} text-anchor="middle" class="cut" transition:fade>{VOXT_COMPOSE_TRUNCATED_ANSWER_COUNT} {t('PARTIAL ANSWER', '份不完整回答')} → {VOXT_COMPOSE_TRUNCATED_ANSWER_COUNT} {t('ANSWER CARD', '张答案卡')}</text>
        {/if}
        <text x={W / 2} y={H - 28} text-anchor="middle" class="footnote">{t('Constructed response · no real model call.', '构造的翻译回答 · 没有调用真实模型。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('This is degraded Done, not Failed.', '这是降级的 Done，不是 Failed。')}</text>
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
  .mono { font-family: var(--mono); font-size: 12px; fill: var(--fg); }
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .mono, .footnote { font-size: 11px; }
    .value { font-size: 14px; }
  }
</style>
