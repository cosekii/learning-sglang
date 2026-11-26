<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    QWEN_TEXT_STAGES,
    QWEN_TEXT_STAGE_COUNT,
    QWEN_TEXT_PROCESS_COUNT,
    QWEN_TEXT_GPU_COUNT,
    QWEN_SPEECH_DEFAULT_STAGE_PROCESSES,
    QWEN_SPEECH_DEFAULT_COPY_COUNT,
    QWEN_SPEECH_DEFAULT_GPU_COUNT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Text output starts one GPU and one process. Default speech starts two GPUs and seven processes.',
    captionZh: '文字输出启动 1 张卡、1 个进程。默认语音启动 2 张卡、7 个进程。',
  }, {
    caption: 'A speech server skips the talker for text-only requests. Adding audio to modalities sends the request through code2wav.',
    captionZh: '语音服务器做纯文字请求时，会跳过 talker。要声音才继续走 talker 和 code2wav。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [870, 820][step] : [560, 600][step]);
  const isCpuStage = (name: string) => name === 'preprocessing' || name === 'decode';
  const speechGpu0 = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter((stage) => stage.gpu === 0);
  const speechGpu1 = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter((stage) => stage.gpu === 1);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('ONE CHECKPOINT, TWO STARTUP BILLS', '同一个 CHECKPOINT，两份启动账单')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">{t('deployment = the stages, processes and cards you start', 'deployment = 你启动的 stage、进程和卡')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('blue = GPU stage · grey = CPU stage · one dashed box = one process', '蓝 = GPU stage · 灰 = CPU stage · 一个虚线框 = 一个进程')}</text>
        {#each phone ? [
          { x: 15, y: 100, w: 270, h: 330, speech: false },
          { x: 15, y: 450, w: 270, h: 370, speech: true },
        ] : [
          { x: 20, y: 102, w: 320, h: 405, speech: false },
          { x: 380, y: 102, w: 320, h: 405, speech: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 15} y={panel.y + 28} class="rowlabel">{panel.speech ? t('DEFAULT SPEECH', '默认语音部署') : t('TEXT-ONLY DEPLOYMENT', '纯文字部署')}</text>
          <text x={panel.x + 15} y={panel.y + 52} class="tag strong">{panel.speech ? `${QWEN_SPEECH_DEFAULT_GPU_COUNT} GPUs · ${QWEN_SPEECH_DEFAULT_COPY_COUNT} processes` : `${QWEN_TEXT_GPU_COUNT} GPU · ${QWEN_TEXT_PROCESS_COUNT} process`}</text>
          {#if !panel.speech}
            <rect x={panel.x + 15} y={panel.y + 70} width={panel.w - 30} height={phone ? 192 : 255} rx="9" fill="var(--accent-soft)" fill-opacity="0.25" stroke="var(--accent)" stroke-dasharray="5 4" />
            <text x={panel.x + 27} y={panel.y + 91} class="tag strong">process: pipeline</text>
            {#each QWEN_TEXT_STAGES as stage, i}
              {@const col = phone ? 0 : i % 2}
              {@const row = phone ? i : Math.floor(i / 2)}
              <rect x={panel.x + 27 + col * 132} y={panel.y + 105 + row * (phone ? 25 : 67)} width={phone ? 216 : 122} height={phone ? 21 : 54} rx="5" fill={isCpuStage(stage) ? 'var(--bg)' : 'var(--accent-soft)'} stroke={isCpuStage(stage) ? 'var(--faint)' : 'var(--accent)'} />
              <text x={panel.x + 35 + col * 132} y={panel.y + 120 + row * (phone ? 25 : 67)} class="mono">{stage}</text>
              {#if !phone}
                <text x={panel.x + 35 + col * 132} y={panel.y + 143 + row * 67} class="tag">{isCpuStage(stage) ? 'CPU' : 'GPU 0'}</text>
              {/if}
            {/each}
            <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 295 : 354)} text-anchor="middle" class="formula">{QWEN_TEXT_STAGE_COUNT} stages · {QWEN_TEXT_PROCESS_COUNT} process</text>
            <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 318 : 382)} text-anchor="middle" class="tag">{t('multimodal input → text output', '文字、图像或声音输入 → 文字输出')}</text>
          {:else}
            <text x={panel.x + 15} y={panel.y + 76} class="tag strong">GPU 0</text>
            {#each speechGpu0 as stage, i}
              <rect x={panel.x + 15} y={panel.y + 88 + i * 34} width={panel.w - 30} height="27" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={panel.x + 25} y={panel.y + 107 + i * 34} class="mono">{stage.stage}</text>
            {/each}
            <text x={panel.x + 15} y={panel.y + 238} class="tag strong">GPU 1</text>
            {#each speechGpu1 as stage}
              <rect x={panel.x + 15} y={panel.y + 250} width={panel.w - 30} height="27" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={panel.x + 25} y={panel.y + 269} class="mono">{stage.stage}</text>
            {/each}
            <text x={panel.x + 15} y={panel.y + 302} class="tag strong">CPU</text>
            <text x={panel.x + 62} y={panel.y + 302} class="mono">preprocessing · decode</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 337} text-anchor="middle" class="formula">4 + 1 + 2 = {QWEN_SPEECH_DEFAULT_COPY_COUNT} processes</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 360} text-anchor="middle" class="tag">{t('text or text + sound output', '文字，或文字 + 声音输出')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('speech: 7 boxes/processes · text: 6 boxes, 1 process', '语音：七框七进程 · 文字：六框一进程') : t('Each speech box is one process. Text-only keeps all six stages in one process.', '语音部署每个 stage 框是一个进程；纯文字部署的六个 stage 同住一个进程。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Stage processes only; the HTTP server and coordinator are not counted.', '只数 stage 进程，不数 HTTP server 和 coordinator。')}</text>
      {:else if step === 1}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('THE REQUEST CHOOSES ITS OUTPUT ROUTE', '请求选择自己的输出路线')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">modalities = {t('the output kinds you ask for', '你要求的输出种类')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('blue = active route · grey = skipped speech stages', '蓝 = 实际路线 · 灰 = 跳过的语音 stage')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">mm_aggregate = {t('joins the input branches', '汇合输入分支')}</text>
        {#each phone ? [
          { y: 120, h: 190, title: 'TEXT-ONLY SERVER · ["text"]', titleZh: '纯文字服务器 · ["text"]', lines: ['preprocessing + active encoders', '→ mm_aggregate → thinker → decode → text', 'talker_ar and code2wav are not loaded'], linesZh: ['preprocessing + 实际用到的 encoders', '→ mm_aggregate → thinker → decode → 文字', '不加载 talker_ar 和 code2wav'], speech: false },
          { y: 325, h: 190, title: 'SPEECH SERVER · ["text"]', titleZh: '语音服务器 · ["text"]', lines: ['preprocessing + active encoders', '→ thinker → decode → text', 'SKIP talker_ar and code2wav'], linesZh: ['preprocessing + 实际用到的 encoders', '→ thinker → decode → 文字', '跳过 talker_ar 和 code2wav'], speech: false },
          { y: 530, h: 220, title: 'SPEECH SERVER · ["text", "audio"]', titleZh: '语音服务器 · ["text", "audio"]', lines: ['preprocessing + active encoders → thinker', 'thinker → decode → text', 'thinker → talker_ar → code2wav → sound'], linesZh: ['preprocessing + 实际用到的 encoders → thinker', 'thinker → decode → 文字', 'thinker → talker_ar → code2wav → 声音'], speech: true },
        ] : [
          { y: 122, h: 125, title: 'TEXT-ONLY SERVER · modalities=["text"]', titleZh: '纯文字服务器 · modalities=["text"]', lines: ['preprocessing + active encoders → mm_aggregate → thinker → decode → text', 'talker_ar and code2wav are not loaded'], linesZh: ['preprocessing + 实际用到的 encoders → mm_aggregate → thinker → decode → 文字', '不加载 talker_ar 和 code2wav'], speech: false },
          { y: 262, h: 125, title: 'SPEECH SERVER · modalities=["text"]', titleZh: '语音服务器 · modalities=["text"]', lines: ['preprocessing + active encoders → thinker → decode → text', 'SKIP talker_ar and code2wav'], linesZh: ['preprocessing + 实际用到的 encoders → thinker → decode → 文字', '跳过 talker_ar 和 code2wav'], speech: false },
          { y: 402, h: 145, title: 'SPEECH SERVER · modalities=["text", "audio"]', titleZh: '语音服务器 · modalities=["text", "audio"]', lines: ['preprocessing + active encoders → thinker', 'thinker → decode → text  ·  thinker → talker_ar → code2wav → sound'], linesZh: ['preprocessing + 实际用到的 encoders → thinker', 'thinker → decode → 文字 · thinker → talker_ar → code2wav → 声音'], speech: true },
        ] as panel}
          <rect x={phone ? 15 : 20} y={panel.y} width={phone ? 270 : 680} height={panel.h} rx="11" fill={panel.speech ? 'var(--accent-soft)' : 'var(--bg)'} stroke={panel.speech ? 'var(--accent)' : 'var(--line)'} />
          <text x={phone ? 28 : 34} y={panel.y + 27} class="tag strong">{t(panel.title, panel.titleZh)}</text>
          {#each panel.lines as line, i}
            <text x={phone ? 28 : 34} y={panel.y + 62 + i * (phone ? 36 : 34)} class={i === panel.lines.length - 1 && !panel.speech ? 'tag' : 'mono'} fill={i === panel.lines.length - 1 && !panel.speech ? 'var(--muted)' : 'var(--text)'}>{t(line, panel.linesZh[i])}</text>
          {/each}
        {/each}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('Default: ["text"] · text-only audio request: no audio', '默认 ["text"] · 纯文字服务器不返回声音') : t('The public request default is ["text"]. A text-only server returns no audio for an audio request.', '公开请求默认 ["text"]；向纯文字服务器请求声音，也不会返回声音。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Both server modes accept text, image, audio and video input.', '两种服务器都能输入文字、图像、声音和视频。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>
