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
    COLOCATED_STAGE_SHARES,
    COLOCATED_USED_PERCENT,
    COLOCATED_FREE_PERCENT,
    QWEN_THINKER_ENCODER_RESERVE_PERCENT,
    QWEN_THINKER_EFFECTIVE_AR_PERCENT,
    QWEN_BF16_BITS_PER_WEIGHT,
    QWEN_FP8_BITS_PER_WEIGHT,
    QWEN_INT4_BITS_PER_WEIGHT,
    QWEN_BF16_ESTIMATED_MEMORY_GB,
    QWEN_FP8_ESTIMATED_MEMORY_GB,
    QWEN_INT4_ESTIMATED_MEMORY_GB,
    QWEN_FP8_MEMORY_OF_BF16_PERCENT,
    QWEN_INT4_MEMORY_OF_BF16_PERCENT,
    QWEN_SPEECH_REPLICA2_COUNT,
    QWEN_SPEECH_REPLICA2_COPY_COUNT,
    QWEN_SPEECH_REPLICA2_GPU_COUNT,
    QWEN_THINKER_MAX_RUNNING_REQUESTS,
    QWEN_TALKER_MAX_RUNNING_REQUESTS,
    QWEN_REPLICA2_CODEC_STATE_SLOTS,
    QWEN_REPLICA2_TALKER_GPU_PERCENT,
    QWEN_REPLICA2_CODE2WAV_GPU_PERCENT,
    QWEN_REPLICA2_GPU_PERCENT,
    QWEN_WARMUP_AUDIO_SECONDS,
    QWEN_WARMUP_MAX_NEW_TOKENS,
    QWEN_BENCH_CONCURRENCIES,
    QWEN_BENCH_REPEATS,
    QWEN_BENCH_RUNS_PER_ARM,
    QWEN_P99_MIN_SAMPLES,
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
  }, {
    caption: 'The thinker declares 78%, then subtracts a 5% encoder reserve. Its effective AR budget is 73%.',
    captionZh: 'thinker 申报 78%，再减 5% 预留。AR 实际预算为 73%。',
  }, {
    caption: 'Precision stores each weight with fewer bits. INT4 roughly halves BF16 memory, while its talker stays BF16.',
    captionZh: '精度决定权重占多少 bit。INT4 约省一半，talker 仍用 BF16。',
  }, {
    caption: 'Each talker replica admits 32 running requests. Two replicas configure 64 codec states, not double throughput.',
    captionZh: '每个 talker 副本同时运行至多 32 个请求。两个副本配 64 个状态位，不等于吞吐翻倍。',
  }, {
    caption: 'Readiness uses small inputs and eight tokens per generating stage. Measure real traffic with fixed settings and separate clocks.',
    captionZh: '就绪检查用小输入，每个生成 stage 限 8 token。再用真实流量和不同时钟测量。',
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
  const H = $derived(phone ? [870, 820, 900, 850, 850, 930, 910][step] : [560, 600, 650, 580, 600, 630, 600][step]);
  const budgetSegments = [
    ...COLOCATED_STAGE_SHARES.flatMap((stage) => stage.name === 'thinker' ? [
      { name: 'thinker AR', percent: QWEN_THINKER_EFFECTIVE_AR_PERCENT, kind: 'stage' },
      { name: 'encoder reserve', percent: QWEN_THINKER_ENCODER_RESERVE_PERCENT, kind: 'reserve' },
    ] : [{ name: stage.name, percent: stage.percent, kind: 'stage' }]),
    { name: 'outside fractions', percent: COLOCATED_FREE_PERCENT, kind: 'outside' },
  ];
  const budgetX = (index: number, width: number) => budgetSegments.slice(0, index).reduce((sum, segment) => sum + segment.percent, 0) * width / 100;
  const precisionOptions = [
    { name: 'BF16', bits: QWEN_BF16_BITS_PER_WEIGHT, memory: QWEN_BF16_ESTIMATED_MEMORY_GB, ratio: 100, stageA: 'thinker + talker AR', stageAZh: 'thinker + talker AR', stageB: 'BF16', stageBZh: 'BF16' },
    { name: 'FP8', bits: QWEN_FP8_BITS_PER_WEIGHT, memory: QWEN_FP8_ESTIMATED_MEMORY_GB, ratio: QWEN_FP8_MEMORY_OF_BF16_PERCENT, stageA: 'thinker + talker AR', stageAZh: 'thinker + talker AR', stageB: 'FP8', stageBZh: 'FP8' },
    { name: 'INT4', bits: QWEN_INT4_BITS_PER_WEIGHT, memory: QWEN_INT4_ESTIMATED_MEMORY_GB, ratio: QWEN_INT4_MEMORY_OF_BF16_PERCENT, stageA: 'thinker: INT4', stageAZh: 'thinker：INT4', stageB: 'talker + code2wav: BF16', stageBZh: 'talker + code2wav：BF16' },
  ];
  const isCpuStage = (name: string) => name === 'preprocessing' || name === 'decode';
  const speechGpu0 = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter((stage) => stage.gpu === 0);
  const speechGpu1 = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter((stage) => stage.gpu === 1);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('ONE MODEL, TWO STARTUP BILLS', '同一个模型，两份启动账单')}</text>
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
      {:else if step === 3}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('ONE H100 · THE THINKER SHARE IS SPLIT', '一张 H100 · THINKER 份额还要再分')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">encoder reserve = {phone ? t('5% off the thinker AR budget', 'thinker AR 预算先减 5%') : t('5% subtracted before sizing the thinker AR engine', '给 thinker AR engine 定预算前先减去的 5%')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('blue = stage fraction · orange = reserve · grey = outside fractions', '蓝 = stage 比例 · 橙 = 预留 · 灰 = 比例之外')}</text>
        <text x={W / 2} y="103" text-anchor="middle" class="formula">{phone ? `78−5=${QWEN_THINKER_EFFECTIVE_AR_PERCENT}% AR · declared=${COLOCATED_USED_PERCENT}%` : `78% − 5% = ${QWEN_THINKER_EFFECTIVE_AR_PERCENT}% AR · 2 + 2 + 78 + 10 + 2 = ${COLOCATED_USED_PERCENT}%`}</text>
        <rect x={phone ? 15 : 20} y="125" width={phone ? 270 : 680} height="65" rx="8" fill="var(--bg)" stroke="var(--line)" />
        {#each budgetSegments as segment, i}
          <rect x={(phone ? 15 : 20) + budgetX(i, phone ? 270 : 680)} y="125" width={segment.percent * (phone ? 270 : 680) / 100} height="65" fill={segment.kind === 'reserve' ? 'var(--gen)' : segment.kind === 'outside' ? 'var(--bg)' : 'var(--accent)'} stroke={segment.kind === 'outside' ? 'var(--faint)' : 'none'} stroke-dasharray={segment.kind === 'outside' ? '4 3' : 'none'} />
        {/each}
        <text x={phone ? 15 : 20} y="222" class="tag strong">{t('SEGMENT', '分段')}</text>
        <text x={phone ? 282 : 700} y="222" text-anchor="end" class="tag strong">{t('CARD SHARE', '整卡比例')}</text>
        {#each budgetSegments as segment, i}
          {@const y = 254 + i * (phone ? 42 : 32)}
          <rect x={phone ? 15 : 20} y={y - 12} width="12" height="12" rx="2" fill={segment.kind === 'reserve' ? 'var(--gen)' : segment.kind === 'outside' ? 'var(--bg)' : 'var(--accent)'} stroke={segment.kind === 'outside' ? 'var(--faint)' : 'none'} />
          <text x={phone ? 36 : 41} y={y} class={segment.name.includes('thinker') || segment.name.includes('encoder') ? 'mono strong' : 'mono'}>{segment.name}</text>
          <text x={phone ? 282 : 700} y={y} text-anchor="end" class="formula">{segment.percent}%</text>
        {/each}
        <rect x={phone ? 15 : 20} y={phone ? 575 : 480} width={phone ? 270 : 680} height={phone ? 150 : 52} rx="9" fill="var(--bg)" stroke="var(--line)" />
        {#if phone}
          <text x="28" y="604" class="tag strong">{t('COLOCATED RULES', '同卡规则')}</text>
          <text x="28" y="633" class="tag">{t('one common GPU · TP = 1 only', '五个 GPU stage 同卡 · 只能 TP = 1')}</text>
          <text x="28" y="661" class="tag">{t('no talker or code2wav process replicas', 'talker 和 code2wav 不能复制进程')}</text>
          <text x="28" y="689" class="tag">{t('every GPU stage declares a budget', '每个 GPU stage 都要申报预算')}</text>
        {:else}
          <text x="360" y="512" text-anchor="middle" class="tag strong">{t('one GPU · TP = 1 only · no AR process replicas · every GPU stage declares a budget', '五个 GPU stage 同卡 · 只能 TP = 1 · AR 不能复制进程 · 每个 GPU stage 都要申报预算')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('The 6% grey segment is outside declarations, not measured free memory.', '灰色 6% 在申报比例之外，不是实测空闲显存。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: choose how many bits each weight uses.', '下一步：每个权重用多少 bit。')}</text>
      {:else if step === 4}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('PRECISION COMES FROM THE CHECKPOINT', '精度来自 CHECKPOINT')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">quantization = {t('store each weight with fewer bits', '每个权重用更少 bit 保存')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{phone ? t('bit = 0 or 1 · checkpoint = saved model files', 'bit = 0 或 1 · checkpoint = 模型文件') : t('bit = one 0-or-1 digit · checkpoint = saved model files; their config selects precision', 'bit = 一个 0 或 1 · checkpoint = 保存的模型文件；文件配置选择精度')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{t('blue bars = cookbook memory estimates · same scale', '蓝柱 = 教程文档的显存估计 · 同一比例')}</text>
        {#each precisionOptions as option, i}
          {@const x = phone ? 15 : 20 + i * 235}
          {@const y = phone ? 120 + i * 205 : 130}
          {@const w = phone ? 270 : 210}
          <rect {x} {y} width={w} height={phone ? 180 : 320} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 15} y={y + 30} class="rowlabel">{option.name}</text>
          <text x={x + 15} y={y + (phone ? 51 : 58)} class="tag">{option.bits} bits / weight</text>
          <rect x={x + 15} y={y + (phone ? 67 : 85)} width={option.memory / QWEN_BF16_ESTIMATED_MEMORY_GB * (w - 30)} height={phone ? 32 : 42} rx="5" fill="var(--accent)" />
          <text x={x + 15} y={y + (phone ? 123 : 157)} class="formula">≈ {option.memory} GB</text>
          <text x={x + 15} y={y + (phone ? 148 : 207)} class="tag strong">{t(option.stageA, option.stageAZh)}</text>
          <text x={x + 15} y={y + (phone ? 171 : 233)} class="tag">{t(option.stageB, option.stageBZh)}</text>
          {#if !phone}
            <text x={x + 15} y={y + 282} class="formula">{option.ratio.toFixed(0)}% {t('of BF16', 'BF16 的比例')}</text>
          {/if}
        {/each}
        {#if phone}
          <text x="150" y="747" text-anchor="middle" class="tag strong">{t('ALL THREE SUPPORT', '三种精度都支持')}</text>
          <text x="150" y="773" text-anchor="middle" class="tag">text-only · TP1/TP2 · colocated TP1</text>
        {:else}
          <text x="360" y="503" text-anchor="middle" class="tag strong">{t('ALL THREE: text-only · disaggregated TP1 or TP2 · colocated TP1', '三种精度都支持：纯文字 · 分卡 TP1 或 TP2 · 同卡 TP1')}</text>
          <text x="360" y="537" text-anchor="middle" class="formula">60 → 40 → 30 GB · {t('smaller bars are documentation estimates', '较短的柱来自文档估计')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('BF16 is the default; native FP8 is not selected by --dtype fp8.', 'BF16 是默认值；native FP8 不是用 --dtype fp8 选择。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Approximate cookbook memory values, not local footprint or quality measurements.', '文档中的近似显存值，不是本地显存或质量实测。')}</text>
      {:else if step === 5}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('MORE SPEECH COPIES, EXPLICIT CAPACITY', '更多语音副本，明确算容量')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">running cap = {t('most requests one stage works on at once', '一个 stage 同时最多处理的请求数')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">codec state slot = {t('saved decoder state for one stream', '一路声音保存的 decoder 状态')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{t('blue = talker · orange = codec capacity · grey = thinker', '蓝 = talker · 橙 = codec 容量 · 灰 = thinker')}</text>
        {#each phone ? [
          { x: 15, y: 125, w: 270, h: 340, replica2: false },
          { x: 15, y: 485, w: 270, h: 390, replica2: true },
        ] : [
          { x: 20, y: 125, w: 320, h: 420, replica2: false },
          { x: 380, y: 125, w: 320, h: 420, replica2: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 14} y={panel.y + 27} class="rowlabel">{panel.replica2 ? 'REPLICA2' : 'DEFAULT SPEECH'}</text>
          <text x={panel.x + 14} y={panel.y + 51} class="tag strong">{panel.replica2 ? `${QWEN_SPEECH_REPLICA2_COPY_COUNT} processes · ${QWEN_SPEECH_REPLICA2_GPU_COUNT} GPUs` : `${QWEN_SPEECH_DEFAULT_COPY_COUNT} processes · ${QWEN_SPEECH_DEFAULT_GPU_COUNT} GPUs`}</text>
          <rect x={panel.x + 14} y={panel.y + 72} width={panel.w - 28} height="65" rx="7" fill="var(--bg)" stroke="var(--faint)" />
          <text x={panel.x + 25} y={panel.y + 98} class="tag strong">GPU 0 · thinker + code2wav</text>
          <text x={panel.x + 25} y={panel.y + 123} class="formula">thinker cap = {QWEN_THINKER_MAX_RUNNING_REQUESTS}</text>
          {#if !panel.replica2}
            <rect x={panel.x + 14} y={panel.y + 155} width={panel.w - 28} height="70" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={panel.x + 25} y={panel.y + 181} class="tag strong">GPU 1 · talker_ar × 1</text>
            <text x={panel.x + 25} y={panel.y + 207} class="formula">talker cap = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
            <rect x={panel.x + 14} y={panel.y + 244} width={panel.w - 28} height="62" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + panel.w / 2} y={panel.y + 281} text-anchor="middle" class="formula">codec_state_slots = {QWEN_TALKER_MAX_RUNNING_REQUESTS} × 1 = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 326} text-anchor="middle" class="tag">{t('one talker and one code2wav process', '一个 talker 和一个 code2wav 进程')}</text>
          {:else}
            {#each [0, 1] as replica}
              <rect x={panel.x + 14} y={panel.y + 150 + replica * 68} width={panel.w - 28} height="58" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={panel.x + 25} y={panel.y + 175 + replica * 68} class="tag strong">GPU {replica + 1} · talker_ar@r{replica} + code2wav@r{replica}</text>
              <text x={panel.x + 25} y={panel.y + 198 + replica * 68} class="formula">talker cap = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
            {/each}
            <rect x={panel.x + 14} y={panel.y + 292} width={panel.w - 28} height="62" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + panel.w / 2} y={panel.y + 329} text-anchor="middle" class="formula">codec_state_slots = {QWEN_TALKER_MAX_RUNNING_REQUESTS} × {QWEN_SPEECH_REPLICA2_COUNT} = {QWEN_REPLICA2_CODEC_STATE_SLOTS}</text>
            <text x={panel.x + 14} y={panel.y + 374} class="tag">{QWEN_REPLICA2_TALKER_GPU_PERCENT}% + {QWEN_REPLICA2_CODE2WAV_GPU_PERCENT}% = {QWEN_REPLICA2_GPU_PERCENT}% {t('per replica GPU', '每个副本 GPU')}</text>
          {/if}
        {/each}
        {#if !phone}
          <text x="360" y="579" text-anchor="middle" class="tag strong">{t('Caps configure room; they do not measure completed requests per second.', '上限配置容量，不测量每秒完成多少请求。')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Input encoders and CPU stages stay unchanged.', '输入 encoders 和 CPU stages 保持不变。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Default round-robin pairs r0/r0; custom policies may differ', '默认轮询配对 r0/r0；自定义策略可能不同') : t('Default round-robin pairs matching replicas; a custom policy need not preserve that pairing.', '默认轮询配对相同编号副本；自定义策略不保证这种配对。')}</text>
      {:else if step === 6}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('TWO CHECKS ANSWER TWO QUESTIONS', '两种检查回答两个问题')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">readiness = {t('a startup health check, not a speed result', '启动健康检查，不是速度结果')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('blue = startup request · orange = measurement plan', '蓝 = 启动请求 · 橙 = 测量计划')}</text>
        {#each phone ? [
          { x: 15, y: 105, w: 270, h: 340, measure: false },
          { x: 15, y: 465, w: 270, h: 400, measure: true },
        ] : [
          { x: 20, y: 105, w: 320, h: 420, measure: false },
          { x: 380, y: 105, w: 320, h: 420, measure: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="11" fill={panel.measure ? 'var(--gen-soft)' : 'var(--accent-soft)'} fill-opacity="0.25" stroke={panel.measure ? 'var(--gen)' : 'var(--accent)'} />
          <text x={panel.x + 15} y={panel.y + 29} class="rowlabel">{panel.measure ? t('A/B MEASUREMENT', 'A/B 测量') : t('STARTUP READINESS', '启动就绪检查')}</text>
          <text x={panel.x + 15} y={panel.y + 53} class="tag strong">{panel.measure ? t('Is this deployment better?', '这套部署更好吗？') : t('Can one small request finish?', '一个小请求能跑完吗？')}</text>
          {#if !panel.measure}
            <rect x={panel.x + 15} y={panel.y + 75} width={panel.w - 30} height="112" rx="8" fill="var(--bg)" stroke="var(--accent)" />
            <text x={panel.x + 27} y={panel.y + 101} class="tag">{t('small image', '一张小图')}</text>
            <text x={panel.x + 27} y={panel.y + 130} class="tag">{QWEN_WARMUP_AUDIO_SECONDS} {t('second of audio + short instruction', '秒声音 + 一条短指令')}</text>
            <text x={panel.x + 27} y={panel.y + 159} class="tag">{t('text output; speech adds audio output', '文字输出；语音模式再加声音输出')}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 215} text-anchor="middle" class="formula">↓ {t('every required stage', '每个需要的 stage')}</text>
            <rect x={panel.x + 15} y={panel.y + 235} width={panel.w - 30} height="64" rx="8" fill="var(--bg)" stroke="var(--accent)" />
            <text x={panel.x + panel.w / 2} y={panel.y + 273} text-anchor="middle" class="formula">≤ {QWEN_WARMUP_MAX_NEW_TOKENS} tokens / {t('generating stage', '生成 stage')}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 333} text-anchor="middle" class="tag strong">{t('health evidence only', '只作为健康证据')}</text>
          {:else}
            <text x={panel.x + 15} y={panel.y + 84} class="tag strong">{t('KEEP FIXED', '保持不变')}</text>
            <text x={panel.x + 15} y={panel.y + 109} class="tag">{t('inputs · sampling · hardware · warmup', '输入 · 采样 · 硬件 · 预热')}</text>
            <text x={panel.x + 15} y={panel.y + 134} class="tag">{t('change one deployment choice', '只改一个部署选择')}</text>
            <rect x={panel.x + 15} y={panel.y + 153} width={panel.w - 30} height="58" rx="8" fill="var(--bg)" stroke="var(--gen)" />
            <text x={panel.x + panel.w / 2} y={panel.y + 188} text-anchor="middle" class="formula">{QWEN_BENCH_CONCURRENCIES.length} × {QWEN_BENCH_REPEATS} = {QWEN_BENCH_RUNS_PER_ARM} {t('runs / arm', '次 / 组')}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 233} text-anchor="middle" class="tag">c = {QWEN_BENCH_CONCURRENCIES.join(', ')} · repeats = {QWEN_BENCH_REPEATS}</text>
            <rect x={panel.x + 15} y={panel.y + 254} width={panel.w - 30} height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x={panel.x + 26} y={panel.y + 279} class="tag strong">{t('SERVER CLOCK', '服务器时钟')}</text>
            <text x={panel.x + 26} y={panel.y + 302} class="tag">{t('first audio · total · throughput · failures', '首音 · 总耗时 · 吞吐 · 失败')}</text>
            <rect x={panel.x + 15} y={panel.y + 326} width={panel.w - 30} height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x={panel.x + 26} y={panel.y + 351} class="tag strong">{t('LISTENER CLOCK', '听者时钟')}</text>
            <text x={panel.x + 26} y={panel.y + 374} class="tag">{t('stalls · stop L−S · response N−R', '卡顿 · 停答 L−S · 回应 N−R')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('Readiness can leave video, large batches and other shapes unwarmed.', 'readiness 可能没有预热视频、大 batch 和其他形状。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">p99 {t('needs at least', '至少需要')} {QWEN_P99_MIN_SAMPLES} {t('measured samples; keep raw repeats.', '个测量样本；保留每次原始结果。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>
