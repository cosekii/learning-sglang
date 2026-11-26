<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
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
    QWEN_EXAMPLE_UNALLOCATED_TALKER_SLOTS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Text-only deployment starts one GPU and one process. Default speech deployment starts two GPUs and seven processes.',
    captionZh: '纯文字部署启动 1 张卡、1 个进程。默认语音部署启动 2 张卡、7 个进程。',
  }, {
    caption: 'A speech server skips the talker for text-only requests. Adding audio to output modalities sends the request through talker and code2wav.',
    captionZh: '语音服务器做纯文字请求时，会跳过 talker。要声音才继续走 talker 和 code2wav。',
  }, {
    caption: 'Eight concurrent requests: mean p90 first audio fell from 2.68 to 1.44 seconds. Single-stream total time rose 14–17% instead.',
    captionZh: '8 路并发时，p90 首音几乎减半。单请求总耗时却增加 14–17%。',
  }, {
    caption: 'This config has no explicit AR fraction. Its thinker declares 78%, subtracts 5 percentage points, and keeps 73% for AR.',
    captionZh: '这份配置没有显式 AR 比例。78% 减 5 个百分点，AR 得 73%。',
  }, {
    caption: 'Precision is the number of bits used to store each weight. INT4 roughly halves the BF16 estimate; talker and code2wav stay BF16.',
    captionZh: '精度是保存每个权重所用的 bit 数。INT4 约省一半，talker 和 code2wav 仍用 BF16。',
  }, {
    caption: 'Default code2wav configures 32 slots. In Replica2, each code2wav process configures 64 slots, not double throughput.',
    captionZh: '默认 code2wav 配 32 个状态位。replica2 每个 code2wav 配 64 个，不等于吞吐翻倍。',
  }, {
    caption: 'Readiness uses small inputs and at most eight tokens per generating stage. Measure real traffic with fixed settings and separate clocks.',
    captionZh: '就绪检查用小输入，每个生成 stage 最多 8 token。再用真实流量测量，服务器和听者分别计时。',
  }, {
    caption: 'One decision sheet records the route, placement, precision, capacity and evidence. Keep the choice after your measurements confirm it.',
    captionZh: '一张决策表记录路线、摆卡、精度、容量和证据。用自己的测量确认更合适后，再保留它。',
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
  const H = $derived(phone ? [870, 820, 900, 850, 850, 930, 910, 1080][step] : [560, 600, 650, 580, 600, 630, 600, 740][step]);
  const budgetSegments = [
    ...COLOCATED_STAGE_SHARES.flatMap((stage) => stage.name === 'thinker' ? [
      { name: 'thinker AR', percent: QWEN_THINKER_EFFECTIVE_AR_PERCENT, kind: 'stage' },
      { name: 'encoder reserve', percent: QWEN_THINKER_ENCODER_RESERVE_PERCENT, kind: 'reserve' },
    ] : [{ name: stage.name, percent: stage.percent, kind: 'stage' }]),
    { name: 'outside fractions', percent: COLOCATED_FREE_PERCENT, kind: 'outside' },
  ];
  const budgetX = (index: number, width: number) => budgetSegments.slice(0, index).reduce((sum, segment) => sum + segment.percent, 0) * width / 100;
  const precisionOptions = [
    { name: 'BF16', bits: QWEN_BF16_BITS_PER_WEIGHT, memory: QWEN_BF16_ESTIMATED_MEMORY_GB, ratio: 100, stageA: 'thinker: BF16', stageAZh: 'thinker：BF16', stageB: 'talker AR: BF16 · code2wav: BF16 default', stageBZh: 'talker AR：BF16 · code2wav：默认 BF16' },
    { name: 'FP8', bits: QWEN_FP8_BITS_PER_WEIGHT, memory: QWEN_FP8_ESTIMATED_MEMORY_GB, ratio: QWEN_FP8_MEMORY_OF_BF16_PERCENT, stageA: 'thinker: FP8', stageAZh: 'thinker：FP8', stageB: 'talker AR: FP8 · code2wav: BF16 default', stageBZh: 'talker AR：FP8 · code2wav：默认 BF16' },
    { name: 'INT4', bits: QWEN_INT4_BITS_PER_WEIGHT, memory: QWEN_INT4_ESTIMATED_MEMORY_GB, ratio: QWEN_INT4_MEMORY_OF_BF16_PERCENT, stageA: 'thinker: INT4', stageAZh: 'thinker：INT4', stageB: 'talker AR + code2wav: BF16', stageBZh: 'talker AR + code2wav：BF16' },
  ];
  const isCpuStage = (name: string) => name === 'preprocessing' || name === 'decode';
  const speechGpu0 = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter((stage) => stage.gpu === 0);
  const speechGpu1 = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter((stage) => stage.gpu === 1);

  // One walking outline shows each scene in reading order.
  const PHASE_COUNTS = [3, 0, 0, 0, 0, 0, 0, 0];
  const PHASE_MS = 1500;
  const REST_MS = 1800;
  type Frame = { x: number; y: number; w: number; h: number };
  const motionFrames = (isPhone: boolean, s: number): Frame[] => {
    if (s === 0) return isPhone ? [
      { x: 30, y: 170, w: 240, h: 192 },
      { x: 30, y: 522, w: 240, h: 153 },
      { x: 30, y: 684, w: 240, h: 116 },
    ] : [
      { x: 35, y: 172, w: 290, h: 255 },
      { x: 395, y: 174, w: 290, h: 154 },
      { x: 395, y: 330, w: 290, h: 117 },
    ];
    return [];
  };
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    phase = 0;
    const count = PHASE_COUNTS[s];
    if (!count) return;
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
  const focus = $derived(motionFrames(phone, step)[phase]);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('ONE MODEL, TWO STARTUP SHAPES', '同一个模型，两种启动形态')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">{t('deployment = the stages, processes and cards you start', 'deployment = 你启动的 stage、进程和卡')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{phone ? t('blue = GPU · white = CPU · dashed = shared process', '蓝 = GPU · 白框 = CPU · 虚线 = 共用进程') : t('blue = GPU stage · white box = CPU stage · dashed = shared process', '蓝 = GPU stage · 白框 = CPU stage · 虚线 = 共用进程')}</text>
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
              <text x={panel.x + 35 + col * 132} y={panel.y + 120 + row * (phone ? 25 : 67)} class="mono">{stage === 'mm_aggregate' ? (phone ? t('mm_aggregate · joins', 'mm_aggregate · 汇合') : stage) : stage}</text>
              {#if !phone}
                <text x={panel.x + 35 + col * 132} y={panel.y + 143 + row * 67} class="tag">{stage === 'mm_aggregate' ? t('join inputs · GPU 0', '汇合输入 · GPU 0') : isCpuStage(stage) ? 'CPU' : 'GPU 0'}</text>
              {/if}
            {/each}
            <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 295 : 354)} text-anchor="middle" class="formula">{QWEN_TEXT_STAGE_COUNT} stages · {QWEN_TEXT_PROCESS_COUNT} process</text>
            <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 318 : 382)} text-anchor="middle" class="tag">{t('text, image, audio, video → text', '文字、图像、声音、视频 → 文字')}</text>
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
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Stage processes only; no HTTP server or coordinator.', '只数 stage 进程，不数 HTTP server 和 coordinator。') : t('Stage processes only; the HTTP server and coordinator are not counted.', '只数 stage 进程，不数 HTTP server 和 coordinator。')}</text>
      {:else if step === 1}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('THE REQUEST CHOOSES ITS OUTPUT ROUTE', '请求选择自己的输出路线')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">modalities = {t('the output kinds you ask for', '你要求的输出种类')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('blue = active route · grey text = skipped speech stages', '蓝 = 实际路线 · 灰字 = 跳过的语音 stage')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{phone ? t('text-only: mm_aggregate joins · speech: thinker joins', '纯文字由 mm_aggregate 汇合 · 语音由 thinker 汇合') : t('text-only: mm_aggregate joins inputs · speech: the thinker joins them', '纯文字由 mm_aggregate 汇合输入 · 语音由 thinker 汇合输入')}</text>
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
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Both accept text, image, audio and video input.', '两种服务器都能输入文字、图像、声音和视频。') : t('Both server modes accept text, image, audio and video input.', '两种服务器都能输入文字、图像、声音和视频。')}</text>
      {:else if step === 2}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('ONE MOVE, TWO DIFFERENT RESULTS', '同一次移卡，两种不同结果')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">{t('talker isolation = move talker off the thinker/code2wav GPU', 'talker 独占 = 把 talker 移出 thinker/code2wav 所在 GPU')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{phone ? t('blue=talker · white=others · dark=p90 · red=increase', '蓝=talker · 白框=其他 · 深=p90 · 红=增加') : t('blue = talker · white boxes = other stages · dark = p90 wait · red = increase', '蓝 = talker · 白框 = 其他 stage · 深 = p90 等待 · 红 = 增加')}</text>
        {#each phone ? [
          { x: 15, y: 102, w: 270, isolated: false },
          { x: 15, y: 287, w: 270, isolated: true },
        ] : [
          { x: 20, y: 105, w: 320, isolated: false },
          { x: 380, y: 105, w: 320, isolated: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={phone ? 175 : 165} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 14} y={panel.y + 25} class="tag strong">{panel.isolated ? t('TALKER ALONE', 'TALKER 独占') : t('TALKER SHARES GPU 0', 'TALKER 共用 GPU 0')}</text>
          <rect x={panel.x + 14} y={panel.y + 42} width={panel.w - 28} height="32" rx="6" fill="var(--bg)" stroke="var(--faint)" />
          <text x={panel.x + 24} y={panel.y + 63} class="tag">GPU 0 · thinker TP process + code2wav</text>
          <rect x={panel.x + 14} y={panel.y + 81} width={panel.w - 28} height="32" rx="6" fill="var(--bg)" stroke="var(--faint)" />
          <text x={panel.x + 24} y={panel.y + 102} class="tag">GPU 1 · thinker TP process</text>
          <rect x={panel.x + 14} y={panel.y + 120} width={panel.w - 28} height="32" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={panel.x + 24} y={panel.y + 141} class="tag strong">{panel.isolated ? 'GPU 2 · talker_ar' : 'GPU 0 · talker_ar'}</text>
        {/each}
        <text x={phone ? 15 : 20} y={phone ? 493 : 285} class="rowlabel">{QWEN_PLACEMENT_CONCURRENCY} {t('CONCURRENT REQUESTS · P90 FIRST AUDIO', '路并发 · P90 首音')}</text>
        <text x={phone ? 15 : 20} y={phone ? 517 : 309} class="tag">{phone ? t('p90 = 90% at/below · mean of two', 'p90 = 90% 请求不超过 · 两次均值') : t('same scale · p90 = 90% at or below · mean of two measured values', '同一比例 · p90 = 90% 请求不超过 · 两次实测均值')}</text>
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
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('PR #1235 · H200 · thinker TP2 · code2wav fixed', 'PR #1235 · H200 · thinker TP2 · code2wav 位置不变') : t('PR #1235 · H200 · thinker TP2 · code2wav stayed on the same thinker GPU.', 'PR #1235 · H200 · thinker TP2 · code2wav 留在同一个 thinker GPU 上。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Public TP2 evidence · final TP1 plan needs A/B', '公开 TP2 证据 · 最终 TP1 方案仍需 A/B') : t('Public TP2 evidence; the final TP1 starting plan needs its own A/B comparison.', '公开 TP2 证据；最后的 TP1 起步方案仍需自己的 A/B 比较。')}</text>
      {:else if step === 3}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('ONE H100 · THE THINKER SHARE IS SPLIT', '一张 H100 · THINKER 份额还要再分')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">encoder reserve = {phone ? t('encoder headroom outside thinker AR', 'thinker AR 之外的 encoder 余量') : t('headroom for encoder work outside thinker AR', 'thinker AR 之外的 encoder 工作余量')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('not the separate 2% + 2% encoder stage shares', '不是另外两个 encoder stage 各占的 2%')}</text>
        <text x={W / 2} y="103" text-anchor="middle" class="formula">{phone ? `78%−5 points=${QWEN_THINKER_EFFECTIVE_AR_PERCENT}% AR · total=${COLOCATED_USED_PERCENT}%` : `78% − 5 percentage points = ${QWEN_THINKER_EFFECTIVE_AR_PERCENT}% AR · 2 + 2 + 78 + 10 + 2 = ${COLOCATED_USED_PERCENT}%`}</text>
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
          <text x="28" y="661" class="tag">{t('no in-worker process replicas', 'worker 内不能复制进程')}</text>
          <text x="28" y="689" class="tag">{t('every GPU stage declares a budget', '每个 GPU stage 都要申报预算')}</text>
        {:else}
          <text x="360" y="512" text-anchor="middle" class="tag strong">{t('one GPU · TP = 1 only · no in-worker process replicas · every GPU stage declares a budget', '五个 GPU stage 同卡 · 只能 TP = 1 · worker 内不能复制进程 · 每个 GPU stage 都要申报预算')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('6% is undeclared, not measured free memory.', '灰色 6% 在申报比例之外，不是实测空闲显存。') : t('The 6% grey segment is outside declarations, not measured free memory.', '灰色 6% 在申报比例之外，不是实测空闲显存。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('Next: choose how many bits each weight uses.', '下一步：每个权重用多少 bit。')}</text>
      {:else if step === 4}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('PRECISION AND MEMORY', '精度与显存估计')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">precision = {t('bits used to store each weight', '保存每个权重所用的 bit 数')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{phone ? t('weight = saved model number · bit = 0 or 1', '权重 = 模型保存的数 · bit = 0 或 1') : t('weight = one saved model number · bit = one 0-or-1 digit', '权重 = 模型保存的一个数 · bit = 一个 0 或 1')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{phone ? t('blue = single-GPU-section estimate · quantity unstated', '蓝柱 = 单卡章节估计 · 数量范围未说明') : t('blue bars = estimates in a single-GPU H100/H20 section · exact quantity unstated · same scale', '蓝柱 = 单卡 H100/H20 章节估计 · 具体数量范围未说明 · 同一比例')}</text>
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
        <text x={W / 2} y={phone ? 758 : 514} text-anchor="middle" class="formula">{phone ? t('60→40→30 GB · estimates', '60→40→30 GB · 仅估计') : t('60 → 40 → 30 GB · documentation estimates only', '60 → 40 → 30 GB · 仅为文档估计')}</text>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('BF16 default · INT4 code2wav stays BF16', 'BF16 是默认 · INT4 的 code2wav 仍用 BF16') : t('BF16 is the default. INT4 also keeps code2wav BF16.', 'BF16 是默认值。INT4 的 code2wav 也仍是 BF16。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Not a per-card budget or quality measurement', '不是单卡预算或质量实测') : t('The source does not make these values a per-card budget; no local quality measurement.', '来源没有把这些数值定义为单卡预算；本地也没有质量实测。')}</text>
      {:else if step === 5}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('MORE SPEECH COPIES, EXPLICIT CAPACITY', '更多语音副本，明确算容量')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">running cap = {t('most requests one stage works on at once', '一个 stage 同时最多处理的请求数')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">codec state slot = {t('saved decoder state for one stream', '一路声音保存的 decoder 状态')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{t('blue = talker · orange = codec capacity · white box = thinker', '蓝 = talker · 橙 = codec 容量 · 白框 = thinker')}</text>
        {#each phone ? [
          { x: 15, y: 125, w: 270, h: 340, replica2: false },
          { x: 15, y: 485, w: 270, h: 390, replica2: true },
        ] : [
          { x: 20, y: 125, w: 320, h: 420, replica2: false },
          { x: 380, y: 125, w: 320, h: 420, replica2: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 14} y={panel.y + 27} class="rowlabel">{panel.replica2 ? 'REPLICA2' : 'DEFAULT SPEECH'}</text>
          <text x={panel.x + 14} y={panel.y + 51} class="tag strong">{panel.replica2 ? `5 + 2 + 2 = ${QWEN_SPEECH_REPLICA2_COPY_COUNT} processes · ${QWEN_SPEECH_REPLICA2_GPU_COUNT} GPUs` : `${QWEN_SPEECH_DEFAULT_COPY_COUNT} processes · ${QWEN_SPEECH_DEFAULT_GPU_COUNT} GPUs`}</text>
          <rect x={panel.x + 14} y={panel.y + 72} width={panel.w - 28} height="65" rx="7" fill="var(--bg)" stroke="var(--faint)" />
          <text x={panel.x + 25} y={panel.y + 98} class="tag strong">{panel.replica2 ? 'GPU 0 · thinker' : 'GPU 0 · thinker + code2wav'}</text>
          <text x={panel.x + 25} y={panel.y + 123} class="formula">thinker cap = {QWEN_THINKER_MAX_RUNNING_REQUESTS}</text>
          {#if !panel.replica2}
            <rect x={panel.x + 14} y={panel.y + 155} width={panel.w - 28} height="70" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={panel.x + 25} y={panel.y + 181} class="tag strong">GPU 1 · talker_ar × 1</text>
            <text x={panel.x + 25} y={panel.y + 207} class="formula">talker cap = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
            <rect x={panel.x + 14} y={panel.y + 244} width={panel.w - 28} height="62" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + panel.w / 2} y={panel.y + 264} text-anchor="middle" class="tag strong">{t('PER CODE2WAV PROCESS', '每个 CODE2WAV 进程')}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 290} text-anchor="middle" class="formula">codec_state_slots = {QWEN_TALKER_MAX_RUNNING_REQUESTS} × 1 = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 326} text-anchor="middle" class="tag">{t('one talker and one code2wav process', '一个 talker 和一个 code2wav 进程')}</text>
          {:else}
            {#each [0, 1] as replica}
              <rect x={panel.x + 14} y={panel.y + 150 + replica * 68} width={panel.w - 28} height="58" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={panel.x + 25} y={panel.y + 175 + replica * 68} class="tag strong">GPU {replica + 1} · talker_ar@r{replica} + code2wav@r{replica}</text>
              <text x={panel.x + 25} y={panel.y + 198 + replica * 68} class="formula">talker cap = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
            {/each}
            <rect x={panel.x + 14} y={panel.y + 292} width={panel.w - 28} height="62" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + panel.w / 2} y={panel.y + 314} text-anchor="middle" class="tag strong">{t('PER CODE2WAV PROCESS', '每个 CODE2WAV 进程')}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 340} text-anchor="middle" class="formula">codec_state_slots = {QWEN_TALKER_MAX_RUNNING_REQUESTS} × {QWEN_SPEECH_REPLICA2_COUNT} = {QWEN_REPLICA2_CODEC_STATE_SLOTS}</text>
            <text x={panel.x + 14} y={panel.y + 374} class="tag">{QWEN_REPLICA2_TALKER_GPU_PERCENT}% + {QWEN_REPLICA2_CODE2WAV_GPU_PERCENT}% = {QWEN_REPLICA2_GPU_PERCENT.toFixed(1)}% {t('per replica GPU', '每个副本 GPU')}</text>
          {/if}
        {/each}
        {#if !phone}
          <text x="360" y="579" text-anchor="middle" class="tag strong">{t('Caps configure room; they do not measure completed requests per second.', '上限配置容量，不测量每秒完成多少请求。')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('unchanged: preprocessing · 2 encoders · thinker · decode', '不变：preprocessing · 2 encoders · thinker · decode') : t('Unchanged: preprocessing · image_encoder · audio_encoder · thinker · decode', '不变：preprocessing · image_encoder · audio_encoder · thinker · decode')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Pairing keeps codec on one GPU; custom policies differ', '配对让 codec 留在一卡；自定义策略可能不同') : t('Default pairing keeps each codec stream on one GPU; a custom policy need not preserve it.', '默认配对让每路 codec 留在一卡；自定义策略不保证这种配对。')}</text>
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
          <text x={panel.x + 15} y={panel.y + 53} class="tag strong">{panel.measure ? t('arm = one deployment choice being compared', 'arm = 正在比较的一种部署选择') : t('Can one small request finish?', '一个小请求能跑完吗？')}</text>
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
            <text x={panel.x + panel.w / 2} y={panel.y + 188} text-anchor="middle" class="tag strong">{phone ? t(`${QWEN_BENCH_CONCURRENCIES.length} levels × ${QWEN_BENCH_REPEATS} repeats = ${QWEN_BENCH_RUNS_PER_ARM} runs / arm`, `${QWEN_BENCH_CONCURRENCIES.length} 档并发 × ${QWEN_BENCH_REPEATS} 次 = ${QWEN_BENCH_RUNS_PER_ARM} 次 / 组`) : t(`${QWEN_BENCH_CONCURRENCIES.length} concurrency levels × ${QWEN_BENCH_REPEATS} repeats = ${QWEN_BENCH_RUNS_PER_ARM} runs / arm`, `${QWEN_BENCH_CONCURRENCIES.length} 档并发 × 每档 ${QWEN_BENCH_REPEATS} 次 = ${QWEN_BENCH_RUNS_PER_ARM} 次 / 组`)}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 233} text-anchor="middle" class="tag">{phone ? t(`c = ${QWEN_BENCH_CONCURRENCIES.join(', ')} · ${QWEN_BENCH_REPEATS} repeats each`, `c = ${QWEN_BENCH_CONCURRENCIES.join('、')} · 每档 ${QWEN_BENCH_REPEATS} 次`) : t(`levels: c = ${QWEN_BENCH_CONCURRENCIES.join(', ')} · ${QWEN_BENCH_REPEATS} repeats at each level`, `并发档：c = ${QWEN_BENCH_CONCURRENCIES.join('、')} · 每档重复 ${QWEN_BENCH_REPEATS} 次`)}</text>
            <rect x={panel.x + 15} y={panel.y + 254} width={panel.w - 30} height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x={panel.x + 26} y={panel.y + 279} class="tag strong">{t('SERVER RECORD', '服务器记录')}</text>
            <text x={panel.x + 26} y={panel.y + 302} class="tag">{t('first audio · total · throughput · failures', '首音 · 总耗时 · 吞吐 · 失败')}</text>
            <rect x={panel.x + 15} y={panel.y + 326} width={panel.w - 30} height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
            <text x={panel.x + 26} y={panel.y + 351} class="tag strong">{t('LISTENER RECORD', '听者记录')}</text>
            <text x={panel.x + 26} y={panel.y + 374} class="tag">{t('stalls · stop L−S · response N−R', '卡顿 · 停答 L−S · 回应 N−R')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('Readiness skips larger inputs and batches.', 'readiness 可能没有预热更大的输入和 batch。') : t('Readiness can leave video, large batches and other input sizes unwarmed.', 'readiness 可能没有预热视频、大 batch 和其他输入大小。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(`p99: 99% at/below · ≥${QWEN_P99_MIN_SAMPLES} requests · runs vary`, `p99：99% 请求不超过 · 至少 ${QWEN_P99_MIN_SAMPLES} 个请求 · 运行次数不定`) : t(`p99 = 99% at or below · require ≥${QWEN_P99_MIN_SAMPLES} requests; ten runs may or may not contain them`, `p99 = 99% 请求不超过 · 至少 ${QWEN_P99_MIN_SAMPLES} 个请求；十次运行可能够，也可能不够`)}</text>
      {:else if step === 7}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t('ONE DEPLOYMENT DECISION SHEET', '一张部署决策表')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">{t('blue = starting choice · orange = evidence still required', '蓝 = 起步选择 · 橙 = 还需要的证据')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag strong">{phone ? t('EXAMPLE: 8 requests at once · earlier first audio', '算例：8 路并发 · 首音更早') : t('EXAMPLE: 8 concurrent spoken requests, earlier first audio', '算例：8 路并发语音请求，希望首音更早')}</text>
        {#each [
          { label: 'GOAL', labelZh: '目标', a: '8 concurrent spoken requests', aZh: '8 路并发语音请求', b: 'target: earlier first audio', bZh: '目标：首音更早', evidence: false },
          { label: 'ROUTE', labelZh: '路线', a: 'modalities=["text", "audio"]', aZh: 'modalities=["text", "audio"]', b: 'default speech graph · text + sound', bZh: '默认语音图 · 文字 + 声音', evidence: false },
          { label: 'PRECISION', labelZh: '精度', a: 'BF16 checkpoint first', aZh: '先用 BF16 checkpoint', b: 'FP8 or INT4 needs memory + quality evidence', bZh: '换 FP8 或 INT4 要有显存和质量证据', evidence: false },
          { label: 'PLACEMENT', labelZh: '摆卡', a: 'GPU 0: encoders + thinker + code2wav', aZh: 'GPU 0：encoders + thinker + code2wav', b: 'GPU 1: talker · 2 GPUs · 7 processes', bZh: 'GPU 1：talker · 2 张卡 · 7 个进程', evidence: false },
          { label: 'CAPACITY', labelZh: '容量', a: `8 ≤ ${QWEN_TALKER_MAX_RUNNING_REQUESTS} talker running cap`, aZh: `8 ≤ talker 运行上限 ${QWEN_TALKER_MAX_RUNNING_REQUESTS}`, b: `32 − 8 = ${QWEN_EXAMPLE_UNALLOCATED_TALKER_SLOTS} unallocated cap slots · no replica yet`, bZh: `32 − 8 = ${QWEN_EXAMPLE_UNALLOCATED_TALKER_SLOTS} 个未占上限 · 先不加副本`, evidence: false },
          { label: 'EVIDENCE', labelZh: '证据', a: 'c=8 · server: first audio median/p90 · total · failures · memory', aZh: 'c=8 · 服务器：首音中位数/p90 · 总耗时 · 失败 · 显存', b: 'listener: stalls · L−S · N−R · quality · raw repeats', bZh: '听者：卡顿 · L−S · N−R · 质量 · 原始重复', evidence: true },
        ] as row, i}
          {@const y = phone ? 105 + i * 100 : 105 + i * 75}
          <rect x={phone ? 15 : 20} {y} width={phone ? 270 : 680} height={phone ? (row.evidence ? 106 : 88) : 65} rx="8" fill={row.evidence ? 'var(--gen-soft)' : 'var(--accent-soft)'} fill-opacity="0.25" stroke={row.evidence ? 'var(--gen)' : 'var(--accent)'} />
          <text x={phone ? 29 : 34} y={y + 24} class="tag strong" fill={row.evidence ? 'var(--gen)' : 'var(--accent)'}>{t(row.label, row.labelZh)}</text>
          <text x={phone ? 29 : 170} y={y + (phone ? 49 : 25)} class="tag strong">{phone && row.evidence ? t('c=8 · first audio median/p90 · total', 'c=8 · 首音中位数/p90 · 总耗时') : t(row.a, row.aZh)}</text>
          <text x={phone ? 29 : 170} y={y + (phone ? 73 : 49)} class="tag">{phone && row.evidence ? t('memory · failures · stalls · L−S · N−R', '显存 · 失败 · 卡顿 · L−S · N−R') : t(row.b, row.bZh)}</text>
          {#if phone && row.evidence}
            <text x="29" y={y + 97} class="tag">{t('quality · raw repeats', '质量 · 原始重复')}</text>
          {/if}
        {/each}
        <text x={W / 2} y={phone ? 738 : 593} text-anchor="middle" class="rowlabel">{t('THE WHOLE-BOOK CHECK', '全书检查')}</text>
        {#each [
          { ref: 'Ch. 1–3', refZh: '第 1–3 章', text: 'config · route · binding', textZh: '配置 · 路线 · 绑定' },
          { ref: 'Ch. 4–6', refZh: '第 4–6 章', text: 'waiting rules · data · queues', textZh: '等待规则 · 数据 · 队列' },
          { ref: 'Ch. 7–8', refZh: '第 7–8 章', text: 'memory · measurement', textZh: '显存 · 测量' },
          { ref: 'Ch. 9–12', refZh: '第 9–12 章', text: 'optimization · model strategies', textZh: '优化 · 模型策略' },
        ] as card, i}
          {@const x = phone ? 15 : 20 + i * 172}
          {@const y = phone ? 765 + i * 58 : 620}
          <rect {x} {y} width={phone ? 270 : 160} height={phone ? 48 : 60} rx="7" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 12} y={y + 21} class="tag strong">{t(card.ref, card.refZh)}</text>
          <text x={x + 12} y={y + (phone ? 39 : 43)} class="tag">{t(card.text, card.textZh)}</text>
        {/each}
        <text x={W / 2} y={phone ? 1038 : 709} text-anchor="middle" class="tag strong">{phone ? t('Change one choice after records name the problem.', '记录指出问题后，再改一个选择。') : t('Change one choice only after these records identify the problem to solve.', '只有记录指出要解决什么问题，才改一个选择。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Constructed TP1 hypothesis · local A/B required', '构造的 TP1 假设 · 仍需本地 A/B') : t('Constructed TP1 hypothesis from H200/TP2 evidence; local A/B required. No local model run.', '由 H200/TP2 证据构造的 TP1 假设，仍需本地 A/B；未运行模型。')}</text>
      {/if}
      {#if PHASE_COUNTS[step] > 0}
        <LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} label={t('loops · red = current', '循环 · 红框 = 当前')} />
      {/if}
      {#if focus}
        <rect class="motion-focus" x={focus.x - 4} y={focus.y - 4} width={focus.w + 8} height={focus.h + 8} rx="12" fill="none" stroke="var(--eos)" stroke-width="3" />
      {/if}
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>

<style>
  .motion-focus { pointer-events: none; transition: x 240ms, y 240ms, width 240ms, height 240ms; }
</style>
