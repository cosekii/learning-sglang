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
    STREAM_P90_SHARED_S,
    STREAM_P90_ALONE_S,
    STREAM_P90_SOONER_PERCENT,
    QWEN_PLACEMENT_CONCURRENCY,
    QWEN_SINGLE_STREAM_ISOLATION_E2E_INCREASE_PERCENT,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Text output starts one GPU and one process. Default speech starts two GPUs and seven processes.',
    captionZh: '文字输出启动 1 张卡、1 个进程。默认语音启动 2 张卡、7 个进程。',
  }, {
    caption: 'A speech server skips the talker for text-only requests. Adding audio to modalities sends the request through code2wav.',
    captionZh: '语音服务器做纯文字请求时，会跳过 talker。要声音才继续走 talker 和 code2wav。',
  }, {
    caption: 'At eight requests, isolation cut p90 first sound from 2.68 to 1.44 seconds. Single-stream total time rose 14–17% instead.',
    captionZh: '8 路并发时，p90 首音几乎减半。单请求总耗时却增加 14–17%。',
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
  const H = $derived(phone ? [870, 820, 900][step] : [560, 600, 650][step]);
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
      {:else if step === 2}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('ONE MOVE, TWO DIFFERENT RESULTS', '同一次移卡，两种不同结果')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">{t('talker isolation = move talker off the thinker GPU', 'talker 独占 = 把 talker 移出 thinker 所在 GPU')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('blue = talker · grey = other stages · dark bars = first-sound wait', '蓝 = talker · 灰 = 其他 stage · 深色柱 = 首音等待')}</text>
        {#each phone ? [
          { x: 15, y: 102, w: 270, isolated: false },
          { x: 15, y: 287, w: 270, isolated: true },
        ] : [
          { x: 20, y: 105, w: 320, isolated: false },
          { x: 380, y: 105, w: 320, isolated: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={phone ? 165 : 140} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 14} y={panel.y + 25} class="tag strong">{panel.isolated ? t('TALKER ALONE', 'TALKER 独占') : t('TALKER SHARES GPU 0', 'TALKER 共用 GPU 0')}</text>
          <rect x={panel.x + 14} y={panel.y + 42} width={panel.w - 28} height="42" rx="7" fill="var(--bg)" stroke="var(--faint)" />
          <text x={panel.x + 24} y={panel.y + 68} class="tag">GPU 0 · thinker + code2wav</text>
          {#if !panel.isolated}
            <rect x={panel.x + 14} y={panel.y + 94} width={panel.w - 28} height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={panel.x + 24} y={panel.y + 120} class="tag strong">GPU 0 · talker_ar</text>
          {:else}
            <rect x={panel.x + 14} y={panel.y + 94} width={panel.w - 28} height="42" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={panel.x + 24} y={panel.y + 120} class="tag strong">GPU 1 · talker_ar</text>
          {/if}
        {/each}
        <text x={phone ? 15 : 20} y={phone ? 493 : 285} class="rowlabel">{QWEN_PLACEMENT_CONCURRENCY} {t('CONCURRENT REQUESTS · P90 FIRST SOUND', '路并发 · P90 首音')}</text>
        <text x={phone ? 15 : 20} y={phone ? 517 : 309} class="tag">{t('same scale · mean of two measured p90 values', '同一比例 · 两次实测 p90 的均值')}</text>
        {#each [
          { name: 'shared', nameZh: '共用', value: STREAM_P90_SHARED_S },
          { name: 'alone', nameZh: '独占', value: STREAM_P90_ALONE_S },
        ] as bar, i}
          {@const y = (phone ? 545 : 340) + i * (phone ? 65 : 55)}
          <text x={phone ? 15 : 20} y={y + 22} class="tag strong">{t(bar.name, bar.nameZh)}</text>
          <rect x={phone ? 70 : 100} y={y} width={bar.value / 3 * (phone ? 165 : 430)} height="34" rx="5" fill="var(--muted)" />
          <text x={phone ? 282 : 690} y={y + 23} text-anchor="end" class="formula">{bar.value.toFixed(2)} s</text>
        {/each}
        <text x={W / 2} y={phone ? 690 : 463} text-anchor="middle" class="formula">{STREAM_P90_SHARED_S.toFixed(2)} → {STREAM_P90_ALONE_S.toFixed(2)} s · {STREAM_P90_SOONER_PERCENT.toFixed(0)}% {t('less wait', '等待减少')}</text>
        <rect x={phone ? 15 : 20} y={phone ? 725 : 495} width={phone ? 270 : 680} height={phone ? 100 : 70} rx="10" fill="var(--bg)" stroke="var(--eos)" />
        <text x={W / 2} y={phone ? 757 : 524} text-anchor="middle" class="tag strong" fill="var(--eos)">{t('ONE REQUEST AT A TIME · TOTAL TIME', '每次一个请求 · 总耗时')}</text>
        <text x={W / 2} y={phone ? 791 : 552} text-anchor="middle" class="formula" fill="var(--eos)">+{QWEN_SINGLE_STREAM_ISOLATION_E2E_INCREASE_PERCENT[0]}–{QWEN_SINGLE_STREAM_ISOLATION_E2E_INCREASE_PERCENT[1]}% {t('with talker isolation', 'talker 独占后增加')}</text>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Code2wav stayed beside the thinker in both arms.', '两组实验的 code2wav 都留在 thinker 旁边。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Public experiments · not this H100 profile', '公开实验 · 不是这份 H100 配置实测') : t('Public placement experiments, not measurements of the H100 colocated profile.', '公开摆卡实验，不是这份 H100 同卡配置的实测。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>
