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
    STREAM_P90_SHARED_RUNS_S,
    STREAM_P90_ALONE_RUNS_S,
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
    QWEN_VIDEO_TEST_CARD_GB,
    QWEN_VIDEO_TEST_THINKER_PARAMS_B,
    QWEN_VIDEO_TEST_THINKER_WEIGHT_GB,
    QWEN_VIDEO_TEST_MAX_TOKENS,
    QWEN_VIDEO_TEST_KV_KB_PER_TOKEN,
    QWEN_VIDEO_TEST_KV_GB,
    QWEN_VIDEO_TEST_ENCODER_RESERVE_GB,
    QWEN_VIDEO_TEST_OTHER_STAGES_GB,
    QWEN_VIDEO_TEST_HELD_BACK_GB,
    QWEN_VIDEO_TEST_TALKER_GB,
    QWEN_VIDEO_TEST_TOTAL_GB,
    QWEN_VIDEO_TEST_OVERFLOW_GB,
    QWEN_VIDEO_TEST_WITHOUT_TALKER_GB,
    QWEN_STREAM_CHUNK_FRAMES,
    QWEN_STREAM_FRAME_MS,
    QWEN_STREAM_CHUNK_MS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Text-only deployment starts one GPU and one process. Default speech deployment starts two GPUs and seven processes.',
    captionZh: '纯文字部署启动 1 张卡、1 个进程。默认语音部署启动 2 张卡、7 个进程。',
  }, {
    caption: 'A speech server skips the talker for text-only requests. Adding audio to output modalities sends the request through talker and code2wav.',
    captionZh: '语音服务器处理纯文字请求时，会跳过 talker。要声音才继续走 talker 和 code2wav。',
  }, {
    caption: 'Eight concurrent requests: mean p90 first audio fell from 2.68 to 1.44 seconds. Single-stream total time rose 14–17% instead.',
    captionZh: '8 路并发时，p90 首音几乎减半。单请求总耗时却增加 14–17%。',
  }, {
    caption: 'This config has no explicit AR fraction. Its thinker declares 78%, subtracts 5 percentage points, and keeps 73% for AR.',
    captionZh: '这份配置没有显式 AR 比例。78% 减 5 个百分点，AR 得 73%。',
  }, {
    caption: 'The video test needs 85.7 GB on an 80 GB card. Moving the 8 GB talker leaves 77.7 GB.',
    captionZh: '视频测试需要 85.7 GB，显卡只有 80 GB。移走 8 GB 的 talker 后，剩 77.7 GB。',
  }, {
    caption: "Precision is the bits used to store each weight. INT4's estimate is half BF16's: 30 versus 60 GB.",
    captionZh: '精度是保存每个权重所用的 bit 数。INT4 的估计是 30 GB，约为 BF16 60 GB 的一半。',
  }, {
    caption: 'Both panels keep 2 encoders + thinker on GPU 0; default adds code2wav there. Each code2wav process gets 32 slots by default, 64 with Replica2, not double throughput.',
    captionZh: '两图的 GPU 0 都有 2 encoders + thinker；默认还有 code2wav。code2wav 每进程默认 32 个状态位，replica2 每进程 64，吞吐未必翻倍。',
  }, {
    caption: 'Readiness uses small inputs and at most eight tokens per generating stage. Measure real traffic with fixed settings and separate clocks.',
    captionZh: '就绪检查用小输入，每个生成 stage 最多 8 token。再用真实流量测量，基准客户端和听者分别计时。',
  }, {
    caption: 'One decision sheet records the route, placement, precision, capacity and evidence. Next: client ← queued audio (API process); what happens when the client reads too slowly?',
    captionZh: '一张决策表记录路线、摆卡、精度、容量和证据。client ← queued audio (API process)：客户端读得太慢会怎样？',
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
  const H = $derived(phone ? [870, 820, 900, 560, 650, 850, 930, 1050, 1130][step] : [560, 600, 650, 480, 560, 600, 630, 650, 680][step]);
  const budgetSegments = [
    ...COLOCATED_STAGE_SHARES.flatMap((stage) => stage.name === 'thinker' ? [
      { name: 'thinker AR', percent: QWEN_THINKER_EFFECTIVE_AR_PERCENT, kind: 'stage' },
      { name: 'encoder reserve', percent: QWEN_THINKER_ENCODER_RESERVE_PERCENT, kind: 'reserve' },
    ] : [{ name: stage.name, percent: stage.percent, kind: 'stage' }]),
    { name: 'outside fractions', percent: COLOCATED_FREE_PERCENT, kind: 'outside' },
  ];
  const declaredBudgetSegments = [
    ...COLOCATED_STAGE_SHARES.map((stage) => ({ name: stage.name, percent: stage.percent, kind: 'stage' })),
    { name: 'outside fractions', percent: COLOCATED_FREE_PERCENT, kind: 'outside' },
  ];
  const budgetX = (index: number, width: number, segments = budgetSegments) => segments.slice(0, index).reduce((sum, segment) => sum + segment.percent, 0) * width / 100;
  const precisionOptions = [
    { name: 'BF16', bits: QWEN_BF16_BITS_PER_WEIGHT, memory: QWEN_BF16_ESTIMATED_MEMORY_GB, ratio: 100 },
    { name: 'FP8', bits: QWEN_FP8_BITS_PER_WEIGHT, memory: QWEN_FP8_ESTIMATED_MEMORY_GB, ratio: QWEN_FP8_MEMORY_OF_BF16_PERCENT },
    { name: 'INT4', bits: QWEN_INT4_BITS_PER_WEIGHT, memory: QWEN_INT4_ESTIMATED_MEMORY_GB, ratio: QWEN_INT4_MEMORY_OF_BF16_PERCENT },
  ];
  const isCpuStage = (name: string) => name === 'preprocessing' || name === 'decode';
  const speechGpu0 = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter((stage) => stage.gpu === 0);
  const speechGpu1 = QWEN_SPEECH_DEFAULT_STAGE_PROCESSES.filter((stage) => stage.gpu === 1);

  const axes = [
    { label: '1 of 5 · route', labelZh: '1/5 · 输出路线', steps: 'Step 2', stepsZh: '第 2 步', detail: 'text or text + sound', detailZh: '文字，或文字 + 声音' },
    { label: '2 of 5 · placement', labelZh: '2/5 · 摆卡', steps: 'Steps 3–5', stepsZh: '第 3–5 步', detail: 'talker GPU · one-card shares', detailZh: 'talker 摆卡 · 单卡份额' },
    { label: '3 of 5 · precision', labelZh: '3/5 · 精度', steps: 'Step 6', stepsZh: '第 6 步', detail: 'BF16 · FP8 · INT4', detailZh: 'BF16 · FP8 · INT4' },
    { label: '4 of 5 · capacity', labelZh: '4/5 · 容量', steps: 'Step 7', stepsZh: '第 7 步', detail: 'running caps · codec slots', detailZh: '运行上限 · codec 状态位' },
    { label: '5 of 5 · evidence', labelZh: '5/5 · 证据', steps: 'Steps 8–9', stepsZh: '第 8–9 步', detail: 'readiness · A/B records', detailZh: 'readiness · A/B 记录' },
  ];

  // Each scene builds its own objects and numbers, then holds the finished state.
  const PHASE_COUNTS = [3, 5, 6, 3, 3, 3, 4, 6, 6];
  const PHASE_MS = 1100, REST_MS = 2500;
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const count = PHASE_COUNTS[step];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { phase = count - 1; return; }
    const ms = count * PHASE_MS + REST_MS;
    let raf = 0, t0 = 0;
    const tick = (now: number) => {
      if (!t0 || now - t0 >= ms) { t0 = now; nextLap(ms); }
      phase = Math.min(count - 1, Math.floor((now - t0) / PHASE_MS));
      raf = requestAnimationFrame(tick);
    };
    phase = 0;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<figure class="viz" data-animation-step={step} data-animation-phase={phase} data-animation-final-phase={PHASE_COUNTS[step] - 1}>
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption} style:--small-desktop={H > 600 ? '13px' : '12px'}>
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
          <text x={panel.x + 15} y={panel.y + 52} class="tag strong" opacity={phase >= 2 ? 1 : 0.15} style="transition: opacity 350ms">{panel.speech ? `${QWEN_SPEECH_DEFAULT_GPU_COUNT} GPUs · ${QWEN_SPEECH_DEFAULT_COPY_COUNT} processes` : `${QWEN_TEXT_GPU_COUNT} GPU · ${QWEN_TEXT_PROCESS_COUNT} process`}</text>
          <g opacity={panel.speech && phase < 1 ? 0 : 1} style="transition: opacity 450ms">
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
            <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 295 : 354)} text-anchor="middle" class="formula" opacity={phase >= 2 ? 1 : 0.12} style="transition: opacity 350ms">{QWEN_TEXT_STAGE_COUNT} stages · {QWEN_TEXT_PROCESS_COUNT} process</text>
            <text x={panel.x + panel.w / 2} y={panel.y + (phone ? 318 : 382)} text-anchor="middle" class="tag" opacity={phase >= 2 ? 1 : 0.12} style="transition: opacity 350ms">{t('text, image, audio, video input', '文字、图像、声音、视频输入')}</text>
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
            <text x={panel.x + panel.w / 2} y={panel.y + 337} text-anchor="middle" class="formula" opacity={phase >= 2 ? 1 : 0.12} style="transition: opacity 350ms">4 + 1 + 2 = {QWEN_SPEECH_DEFAULT_COPY_COUNT} processes</text>
          {/if}
          </g>
        {/each}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('speech: 7 boxes/processes · text: 6 boxes, 1 process', '语音：七框七进程 · 文字：六框一进程') : t('Each speech box is one process. Text-only keeps all six stages in one process.', '语音部署每个 stage 框是一个进程；纯文字部署的六个 stage 同住一个进程。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Stage processes only; no HTTP server or coordinator.', '只数 stage 进程，不数 HTTP server 和 coordinator。') : t('Stage processes only; the HTTP server and coordinator are not counted.', '只数 stage 进程，不数 HTTP server 和 coordinator。')}</text>
      {:else if step === 1}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t(phase < 2 ? '1 of 5 · MAP THE FIVE DEPLOYMENT CHOICES' : phone ? '1/5 · ROUTE · REQUEST OUTPUT' : '1 of 5 · ROUTE · THE REQUEST CHOOSES ITS OUTPUT ROUTE', phase < 2 ? '1/5 · 五个部署选择' : phone ? '1/5 · 输出路线 · 请求的输出' : '1/5 · 输出路线 · 请求选择自己的输出路线')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">modalities = {t('the output kinds you ask for', '你要求的输出种类')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{phone ? t('blue = route · grey = not loaded or skipped', '蓝 = 路线 · 灰字 = 未加载或跳过') : t('blue = active route · grey text = speech stages not loaded or skipped', '蓝 = 实际路线 · 灰字 = 未加载或跳过的语音 stage')}</text>
        {#if phase < 2}
          <text x={phone ? 15 : 20} y="95" class="tag strong">{phone ? t('Five choices; the next steps follow in order.', '先看五个选择，后面按顺序逐项选择。') : t('The map names five choices; the next steps take them in order.', '先看五个选择的地图，后面按顺序逐项选择。')}</text>
          {#each axes as axis, i}
            {@const x = phone ? 15 : 20}
            {@const y = (phone ? 120 : 120) + i * (phone ? 105 : 75)}
            {@const w = phone ? 270 : 680}
            <rect {x} {y} width={w} height={phone ? 90 : 62} rx="9" fill={i === 0 && phase >= 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 0 && phase >= 1 ? 'var(--accent)' : 'var(--line)'} opacity={phase === 0 || i === 0 ? 1 : 0.25} style="transition: opacity 350ms, fill 350ms" />
            <text x={x + 14} y={y + 26} class="tag strong" opacity={phase === 0 || i === 0 ? 1 : 0.25}>{t(axis.label, axis.labelZh)}</text>
            <text x={x + w - 14} y={y + 26} text-anchor="end" class="tag" opacity={phase === 0 || i === 0 ? 1 : 0.25}>{t(axis.steps, axis.stepsZh)}</text>
            <text x={x + 14} y={y + (phone ? 61 : 49)} class="tag" opacity={phase === 0 || i === 0 ? 1 : 0.25}>{t(axis.detail, axis.detailZh)}</text>
          {/each}
        {:else}
          <text x={phone ? 15 : 20} y="95" class="tag">{phone ? t('text-only: mm_aggregate joins · speech: thinker joins', '纯文字由 mm_aggregate 汇合 · 语音由 thinker 汇合') : t('text-only: mm_aggregate joins inputs · speech: the thinker joins them', '纯文字由 mm_aggregate 汇合输入 · 语音由 thinker 汇合输入')}</text>
        {/if}
        {#if phase >= 2}
        {#each phone ? [
          { y: 120, h: 190, title: 'TEXT-ONLY SERVER · ["text"]', titleZh: '纯文字服务器 · ["text"]', lines: ['preprocessing + active encoders', '→ mm_aggregate → thinker → decode → text', 'talker_ar and code2wav are not loaded'], linesZh: ['preprocessing + 实际用到的 encoders', '→ mm_aggregate → thinker → decode → 文字', '不加载 talker_ar 和 code2wav'], speech: false },
          { y: 325, h: 190, title: 'SPEECH SERVER · ["text"]', titleZh: '语音服务器 · ["text"]', lines: ['preprocessing + active encoders', '→ thinker → decode → text', 'SKIP talker_ar and code2wav'], linesZh: ['preprocessing + 实际用到的 encoders', '→ thinker → decode → 文字', '跳过 talker_ar 和 code2wav'], speech: false },
          { y: 530, h: 220, title: 'SPEECH SERVER · ["text", "audio"]', titleZh: '语音服务器 · ["text", "audio"]', lines: ['preprocessing + active encoders → thinker', 'thinker → decode → text', 'thinker → talker_ar → code2wav → sound'], linesZh: ['preprocessing + 实际用到的 encoders → thinker', 'thinker → decode → 文字', 'thinker → talker_ar → code2wav → 声音'], speech: true },
        ] : [
          { y: 122, h: 125, title: 'TEXT-ONLY SERVER · modalities=["text"]', titleZh: '纯文字服务器 · modalities=["text"]', lines: ['preprocessing + active encoders → mm_aggregate → thinker → decode → text', 'talker_ar and code2wav are not loaded'], linesZh: ['preprocessing + 实际用到的 encoders → mm_aggregate → thinker → decode → 文字', '不加载 talker_ar 和 code2wav'], speech: false },
          { y: 262, h: 125, title: 'SPEECH SERVER · modalities=["text"]', titleZh: '语音服务器 · modalities=["text"]', lines: ['preprocessing + active encoders → thinker → decode → text', 'SKIP talker_ar and code2wav'], linesZh: ['preprocessing + 实际用到的 encoders → thinker → decode → 文字', '跳过 talker_ar 和 code2wav'], speech: false },
          { y: 402, h: 145, title: 'SPEECH SERVER · modalities=["text", "audio"]', titleZh: '语音服务器 · modalities=["text", "audio"]', lines: ['preprocessing + active encoders → thinker', 'thinker → decode → text  ·  thinker → talker_ar → code2wav → sound'], linesZh: ['preprocessing + 实际用到的 encoders → thinker', 'thinker → decode → 文字 · thinker → talker_ar → code2wav → 声音'], speech: true },
        ] as panel, panelIndex}
          <g opacity={phase >= panelIndex + 2 ? 1 : 0} style="transition: opacity 450ms">
            <rect x={phone ? 15 : 20} y={panel.y} width={phone ? 270 : 680} height={panel.h} rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={phone ? 28 : 34} y={panel.y + 27} class="tag strong">{t(panel.title, panel.titleZh)}</text>
            {#each panel.lines as line, i}
              <text x={phone ? 28 : 34} y={panel.y + 62 + i * (phone ? 36 : 34)} class={i === panel.lines.length - 1 && !panel.speech ? 'tag' : 'mono'} fill={i === panel.lines.length - 1 && !panel.speech ? 'var(--muted)' : 'var(--text)'}>{t(line, panel.linesZh[i])}</text>
            {/each}
          </g>
        {/each}
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('Default: ["text"] · text-only audio request: no audio', '默认 ["text"] · 纯文字服务器不返回声音') : t('The public request default is ["text"]. A text-only server returns no audio for an audio request.', '公开请求默认 ["text"]；向纯文字服务器请求声音，也不会返回声音。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Both accept text, image, audio and video input.', '两种服务器都能输入文字、图像、声音和视频。') : t('Both server modes accept text, image, audio and video input.', '两种服务器都能输入文字、图像、声音和视频。')}</text>
      {:else if step === 2}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t(phone ? '2/5 · PLACEMENT · ONE MOVE, TWO RESULTS' : '2 of 5 · PLACEMENT · ONE MOVE, TWO DIFFERENT RESULTS', phone ? '2/5 · 摆卡 · 同一次移卡，两种结果' : '2/5 · 摆卡 · 同一次移卡，两种不同结果')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">{phone ? t('talker isolation = talker uses its own GPU', 'talker 独占 = talker 自己用一张 GPU') : t('talker isolation = move talker off the thinker GPU it shares', 'talker 独占 = 把 talker 移出它共用的 thinker GPU')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{phone ? t('blue=talker · amber=thinker turn · red=wait', '蓝=talker · 橙=thinker 轮次 · 红=等待') : t('blue = talker · amber = thinker turn · red dashes = ready talker waiting', '蓝 = talker · 橙 = thinker 轮次 · 红虚线 = talker 就绪后在等')}</text>
        {#each phone ? [
          { x: 15, y: 102, w: 270, isolated: false },
          { x: 15, y: 287, w: 270, isolated: true },
        ] : [
          { x: 20, y: 105, w: 320, isolated: false },
          { x: 380, y: 105, w: 320, isolated: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={phone ? 175 : 165} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 14} y={panel.y + 25} class="tag strong">{panel.isolated ? t(phase >= 3 ? 'TALKER ALONE' : 'COMPARE: START SHARED', phase >= 3 ? 'TALKER 独占' : '对照：先从共用开始') : t('TALKER SHARES GPU 4', 'TALKER 共用 GPU 4')}</text>
          <rect x={panel.x + 14} y={panel.y + 42} width={panel.w - 28} height="32" rx="6" fill={!panel.isolated && phase === 1 ? 'var(--gen-soft)' : 'var(--bg)'} stroke={!panel.isolated && phase === 1 ? 'var(--gen)' : 'var(--faint)'} style="transition: fill 350ms, stroke 350ms" />
          <text x={panel.x + 24} y={panel.y + 63} class="tag">{!panel.isolated && phase === 1 ? t("GPU 4 · thinker's turn", 'GPU 4 · thinker 的轮次') : 'GPU 4 · thinker TP process'}</text>
          <rect x={panel.x + 14} y={panel.y + 81} width={panel.w - 28} height="32" rx="6" fill="var(--bg)" stroke="var(--faint)" />
          <text x={panel.x + 24} y={panel.y + 102} class="tag">GPU 5 · thinker TP process + code2wav</text>
          <rect x={panel.x + 14} y={panel.y + 120} width={panel.w - 28} height="32" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={panel.x + 24} y={panel.y + 141} class="tag strong">{panel.isolated && phase >= 3 ? 'GPU 2 · talker_ar' : 'GPU 4 · talker_ar'}</text>
          {#if !panel.isolated && phase < 3}
            <text x={panel.x + panel.w - 24} y={panel.y + 141} text-anchor="end" class="tag strong" fill={phase === 1 ? 'var(--eos)' : 'var(--accent)'}>{t(phase === 0 ? 'ready' : phase === 1 ? 'waits' : 'turn', phase === 0 ? '就绪' : phase === 1 ? '等待' : '轮次')}</text>
            {#if phase === 1}
              <line x1={panel.x + panel.w - 35} y1={panel.y + 119} x2={panel.x + panel.w - 35} y2={panel.y + 75} stroke="var(--eos)" stroke-width="1.5" stroke-dasharray="4 3" />
            {/if}
          {/if}
        {/each}
        <text x={phone ? 15 : 20} y={phone ? 493 : 285} class="rowlabel">{QWEN_PLACEMENT_CONCURRENCY} {t('CONCURRENT REQUESTS · P90 FIRST AUDIO', '路并发 · P90 首音')}</text>
        <text x={phone ? 15 : 20} y={phone ? 517 : 309} class="tag">{phone ? t('p90 = 90% at/below · mean of two', 'p90 = 90% 请求不超过 · 两次均值') : t('same scale · p90 = 90% at or below · mean of two measured values', '同一比例 · p90 = 90% 请求不超过 · 两次实测均值')}</text>
        {#each [
          { name: 'shared', nameZh: '共用', value: STREAM_P90_SHARED_S, runs: STREAM_P90_SHARED_RUNS_S },
          { name: 'alone', nameZh: '独占', value: STREAM_P90_ALONE_S, runs: STREAM_P90_ALONE_RUNS_S },
        ] as bar, i}
          {@const y = (phone ? 545 : 340) + i * (phone ? 65 : 55)}
          <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 450ms">
            <text x={phone ? 15 : 20} y={y + 22} class="tag strong">{t(bar.name, bar.nameZh)}</text>
            <rect x={phone ? 70 : 100} y={y} width={bar.value / 3 * (phone ? 165 : 430)} height="34" rx="5" fill="var(--muted)" style="transition: width 700ms" />
            <text x={phone ? 282 : 690} y={y + 23} text-anchor="end" class="formula">{bar.value.toFixed(2)} s</text>
            <text x={phone ? 70 : 100} y={y + 49} class="tag">({bar.runs[0].toFixed(3)} + {bar.runs[1].toFixed(3)}) ÷ 2 = {bar.value.toFixed(3)} s</text>
          </g>
        {/each}
        <text x={W / 2} y={phone ? 690 : 463} text-anchor="middle" class="formula" opacity={phase >= 5 ? 1 : 0.12} style="transition: opacity 350ms">{STREAM_P90_SHARED_S.toFixed(2)} → {STREAM_P90_ALONE_S.toFixed(2)} s · {phone ? t(`${STREAM_P90_SOONER_PERCENT.toFixed(0)}% less wait`, `首音等待减少 ${STREAM_P90_SOONER_PERCENT.toFixed(0)}%`) : t(`${STREAM_P90_SOONER_PERCENT.toFixed(0)}% less first-audio wait`, `首音等待减少 ${STREAM_P90_SOONER_PERCENT.toFixed(0)}%`)}</text>
        <g opacity={phase >= 5 ? 1 : 0.12} style="transition: opacity 350ms">
          <rect x={phone ? 15 : 20} y={phone ? 725 : 495} width={phone ? 270 : 680} height={phone ? 125 : 90} rx="10" fill="var(--bg)" stroke="var(--gen)" />
          <text x={W / 2} y={phone ? 757 : 524} text-anchor="middle" class="tag strong" fill="var(--gen)">{t('ONE REQUEST AT A TIME · TOTAL TIME', '每次一个请求 · 总耗时')}</text>
          <text x={W / 2} y={phone ? 791 : 552} text-anchor="middle" class="formula" fill="var(--gen)">+{QWEN_SINGLE_STREAM_ISOLATION_E2E_INCREASE_PERCENT[0]}–{QWEN_SINGLE_STREAM_ISOLATION_E2E_INCREASE_PERCENT[1]}% {t('with talker isolation', 'talker 独占后增加')}</text>
          <text x={W / 2} y={phone ? 821 : 578} text-anchor="middle" class="tag">{t('relative change only · no absolute total-time pair published', '只有相对增幅 · 来源未给两个绝对总耗时')}</text>
        </g>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('PR #1235 · H200 · thinker TP2 · code2wav fixed', 'PR #1235 · H200 · thinker TP2 · code2wav 位置不变') : t('PR #1235 · H200 · thinker TP2 · code2wav stayed on the same thinker GPU.', 'PR #1235 · H200 · thinker TP2 · code2wav 留在同一个 thinker GPU 上。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Public TP2 evidence · final TP1 plan needs A/B', '公开 TP2 证据 · 最终 TP1 方案仍需 A/B') : t('Public TP2 evidence; the final TP1 starting plan needs its own A/B comparison.', '公开 TP2 证据；最后的 TP1 起步方案仍需自己的 A/B 比较。')}</text>
      {:else if step === 3}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t(phone ? '2/5 · PLACEMENT · SPLIT THE THINKER SHARE' : '2 of 5 · PLACEMENT · ONE H100 SPLITS THE THINKER SHARE', phone ? '2/5 · 摆卡 · 拆分 THINKER 份额' : '2/5 · 摆卡 · 一张 H100 拆分 THINKER 份额')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">encoder reserve = {phone ? t('encoder headroom outside thinker AR', 'thinker AR 之外的 encoder 余量') : t('headroom for encoder work outside thinker AR', 'thinker AR 之外的 encoder 工作余量')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{phone ? t('explicit AR fraction = direct share · unset', '显式 AR 比例 = 直接份额 · 未指定') : t('explicit AR fraction = direct AR card share · unset in this config', '显式 AR 比例 = 直接指定 AR 整卡份额 · 这份配置未指定')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{t('5 percentage points = 5 whole-card points, not 5% of 78%', '5 个百分点 = 整卡 100 份中的 5 份，不是 78% 的 5%')}</text>
        <text x={W / 2} y="126" text-anchor="middle" class="formula">{phase === 0 ? `2 + 2 + 78 + 10 + 2 = ${COLOCATED_USED_PERCENT}%` : phone ? `78%−5 points=${QWEN_THINKER_EFFECTIVE_AR_PERCENT}% AR · total=${COLOCATED_USED_PERCENT}%` : `78% − 5 percentage points = ${QWEN_THINKER_EFFECTIVE_AR_PERCENT}% AR · 2 + 2 + 78 + 10 + 2 = ${COLOCATED_USED_PERCENT}%`}</text>
        <rect x={phone ? 15 : 20} y="148" width={phone ? 270 : 680} height="65" rx="8" fill="var(--bg)" stroke="var(--line)" />
        {#each (phase === 0 ? declaredBudgetSegments : budgetSegments) as segment, i (segment.name)}
          <rect x={(phone ? 15 : 20) + budgetX(i, phone ? 270 : 680, phase === 0 ? declaredBudgetSegments : budgetSegments)} y="148" width={segment.percent * (phone ? 270 : 680) / 100} height="65" fill={segment.kind === 'reserve' ? 'var(--gen)' : segment.kind === 'outside' ? 'var(--bg)' : 'var(--accent)'} stroke={segment.kind === 'outside' ? 'var(--faint)' : 'none'} stroke-dasharray={segment.kind === 'outside' ? '4 3' : 'none'} style="transition: x 700ms, width 700ms, fill 350ms" />
        {/each}
        <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 450ms">
          <text x={phone ? 15 : 20} y="245" class="tag strong">{t('SEGMENT', '分段')}</text>
          <text x={phone ? 282 : 700} y="245" text-anchor="end" class="tag strong">{t('CARD SHARE', '整卡比例')}</text>
          {#each budgetSegments as segment, i}
            {@const y = 275 + i * (phone ? 42 : 28)}
            <rect x={phone ? 15 : 20} y={y - 12} width="12" height="12" rx="2" fill={segment.kind === 'reserve' ? 'var(--gen)' : segment.kind === 'outside' ? 'var(--bg)' : 'var(--accent)'} stroke={segment.kind === 'outside' ? 'var(--faint)' : 'none'} />
            <text x={phone ? 36 : 41} y={y} class={segment.name.includes('thinker') || segment.name.includes('encoder') ? 'mono strong' : 'mono'}>{segment.name}</text>
            <text x={phone ? 282 : 700} y={y} text-anchor="end" class="formula">{segment.percent}%</text>
          {/each}
        </g>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('6% is undeclared, not measured free memory.', '6% 在申报比例之外，不是实测空闲显存。') : t('The 6% grey segment is outside declarations, not measured free memory.', '灰色 6% 在申报比例之外，不是实测空闲显存。')}</text>
      {:else if step === 4}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t(phone ? '2/5 · PLACEMENT · WHY TALKER MOVES' : '2 of 5 · PLACEMENT · WHY THE TALKER MOVES', phone ? '2/5 · 摆卡 · TALKER 为什么移卡' : '2/5 · 摆卡 · TALKER 为什么移卡')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">{t('video-test minimum = the least this example needs', '视频测试最低需求 = 这个算例至少需要多少显存')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('blue = stays on GPU 0 · orange = talker · red = overflow', '蓝 = 留在 GPU 0 · 橙 = talker · 红 = 超出显卡')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{t('both bars: 0–90 GB · dashed line = 80 GB card', '两根柱共用 0–90 GB · 虚线 = 80 GB 显卡')}</text>
        {#if phone}
          <text x="28" y="130" class="tag">{QWEN_VIDEO_TEST_THINKER_WEIGHT_GB.toFixed(1)} = {QWEN_VIDEO_TEST_THINKER_PARAMS_B}B × 2 B · {t('thinker weights', 'thinker 权重')}</text>
          <text x="28" y="157" class="tag">{QWEN_VIDEO_TEST_ENCODER_RESERVE_GB.toFixed(1)} = 5% × {QWEN_VIDEO_TEST_CARD_GB} · {t('video reserve', '视频预留')}</text>
          <text x="28" y="184" class="tag">{QWEN_VIDEO_TEST_KV_GB.toFixed(1)} ≈ {QWEN_VIDEO_TEST_MAX_TOKENS.toLocaleString('en-US')} × {QWEN_VIDEO_TEST_KV_KB_PER_TOKEN} KB · KV</text>
          <text x="28" y="211" class="tag">{QWEN_VIDEO_TEST_OTHER_STAGES_GB.toFixed(1)} = 6% × {QWEN_VIDEO_TEST_CARD_GB} · {t('encoders + code2wav', 'encoders + code2wav')}</text>
          <text x="28" y="238" class="tag">{QWEN_VIDEO_TEST_HELD_BACK_GB.toFixed(1)} = 6% × {QWEN_VIDEO_TEST_CARD_GB} · {t('held back', '预留')}</text>
          <text x="28" y="265" class="tag">{QWEN_VIDEO_TEST_TALKER_GB.toFixed(1)} = 10% × {QWEN_VIDEO_TEST_CARD_GB} · talker</text>
        {:else}
          <text x="34" y="130" class="tag">{QWEN_VIDEO_TEST_THINKER_WEIGHT_GB.toFixed(1)} {t('weights', '权重')} ({QWEN_VIDEO_TEST_THINKER_PARAMS_B}B × 2 B) + {QWEN_VIDEO_TEST_ENCODER_RESERVE_GB.toFixed(1)} {t('video reserve', '视频预留')} (5% × {QWEN_VIDEO_TEST_CARD_GB}) + {QWEN_VIDEO_TEST_KV_GB.toFixed(1)} KV ({QWEN_VIDEO_TEST_MAX_TOKENS.toLocaleString('en-US')} × {QWEN_VIDEO_TEST_KV_KB_PER_TOKEN} KB)</text>
          <text x="34" y="155" class="tag">+ {QWEN_VIDEO_TEST_OTHER_STAGES_GB.toFixed(1)} {t('encoders + code2wav', 'encoders + code2wav')} (6% × {QWEN_VIDEO_TEST_CARD_GB}) + {QWEN_VIDEO_TEST_HELD_BACK_GB.toFixed(1)} {t('held back', '预留')} (6% × {QWEN_VIDEO_TEST_CARD_GB}) + {QWEN_VIDEO_TEST_TALKER_GB.toFixed(1)} talker (10% × {QWEN_VIDEO_TEST_CARD_GB})</text>
        {/if}
        <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 450ms">
          <text x={phone ? 30 : 60} y={phone ? 310 : 200} class="tag strong">{t('BEFORE · EVERYTHING ON GPU 0', '移卡前 · 全部放在 GPU 0')}</text>
          <rect x={phone ? 30 : 60} y={phone ? 325 : 215} width={QWEN_VIDEO_TEST_WITHOUT_TALKER_GB / 90 * (phone ? 230 : 600)} height={phone ? 32 : 36} rx="5" fill="var(--accent)" />
          <rect x={(phone ? 30 : 60) + QWEN_VIDEO_TEST_WITHOUT_TALKER_GB / 90 * (phone ? 230 : 600)} y={phone ? 325 : 215} width={QWEN_VIDEO_TEST_TALKER_GB / 90 * (phone ? 230 : 600)} height={phone ? 32 : 36} rx="5" fill="var(--gen)" />
          <rect x={(phone ? 30 : 60) + QWEN_VIDEO_TEST_CARD_GB / 90 * (phone ? 230 : 600)} y={phone ? 325 : 215} width={QWEN_VIDEO_TEST_OVERFLOW_GB / 90 * (phone ? 230 : 600)} height={phone ? 32 : 36} fill="var(--eos)" fill-opacity="0.65" />
          <line x1={(phone ? 30 : 60) + QWEN_VIDEO_TEST_CARD_GB / 90 * (phone ? 230 : 600)} y1={phone ? 315 : 205} x2={(phone ? 30 : 60) + QWEN_VIDEO_TEST_CARD_GB / 90 * (phone ? 230 : 600)} y2={phone ? 390 : 290} stroke="var(--text)" stroke-dasharray="4 3" />
          <text x={phone ? 30 : 60} y={phone ? 380 : 275} class="formula">{QWEN_VIDEO_TEST_TOTAL_GB.toFixed(1)} GB · {QWEN_VIDEO_TEST_TOTAL_GB.toFixed(1)} − {QWEN_VIDEO_TEST_CARD_GB} = {QWEN_VIDEO_TEST_OVERFLOW_GB.toFixed(1)} GB {t('too much', '超出')}</text>
          <text x={(phone ? 30 : 60) + QWEN_VIDEO_TEST_CARD_GB / 90 * (phone ? 230 : 600)} y={phone ? 407 : 307} text-anchor="middle" class="tag">{QWEN_VIDEO_TEST_CARD_GB} GB {t('card', '显卡')}</text>
        </g>
        <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 450ms">
          <text x={phone ? 30 : 60} y={phone ? 440 : 350} class="tag strong">{t('AFTER · TALKER MOVES TO GPU 1', '移卡后 · TALKER 移到 GPU 1')}</text>
          <rect x={phone ? 30 : 60} y={phone ? 455 : 365} width={QWEN_VIDEO_TEST_WITHOUT_TALKER_GB / 90 * (phone ? 230 : 600)} height={phone ? 32 : 36} rx="5" fill="var(--accent)" />
          <line x1={(phone ? 30 : 60) + QWEN_VIDEO_TEST_CARD_GB / 90 * (phone ? 230 : 600)} y1={phone ? 445 : 355} x2={(phone ? 30 : 60) + QWEN_VIDEO_TEST_CARD_GB / 90 * (phone ? 230 : 600)} y2={phone ? 520 : 420} stroke="var(--text)" stroke-dasharray="4 3" />
          <text x={phone ? 30 : 60} y={phone ? 510 : 425} class="formula">{QWEN_VIDEO_TEST_TOTAL_GB.toFixed(1)} − {QWEN_VIDEO_TEST_TALKER_GB.toFixed(1)} = {QWEN_VIDEO_TEST_WITHOUT_TALKER_GB.toFixed(1)} GB {t('fits', '放得下')}</text>
          <text x={(phone ? 30 : 60) + QWEN_VIDEO_TEST_CARD_GB / 90 * (phone ? 230 : 600)} y={phone ? 537 : 437} text-anchor="middle" class="tag">{QWEN_VIDEO_TEST_CARD_GB} GB {t('card', '显卡')}</text>
          <text x={phone ? 30 : 60} y={phone ? 575 : 480} class="tag strong" fill="var(--gen)">talker {QWEN_VIDEO_TEST_TALKER_GB.toFixed(1)} GB → GPU 1</text>
        </g>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('Constructed lower bound, not measured memory.', '构造下限，不是实测显存。') : t('Constructed video-test lower bound, not measured memory occupancy.', '视频测试的构造下限，不是实测显存占用。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Ch. 19 Step 4: old 32,768 · new 65,536 needs more.', '第 19 章第 4 步：旧 32,768；新 65,536 默认需要更多。') : t('Ch. 19 Step 4: old 32,768-token bound · current 65,536 needs more.', '第 19 章第 4 步：旧 32,768 token 下限；当前 65,536 默认值需要更多。')}</text>
      {:else if step === 5}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t(phone ? '3/5 · PRECISION AND MEMORY' : '3 of 5 · PRECISION AND MEMORY', '3/5 · 精度与显存估计')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">precision = {t('bits used to store each weight', '保存每个权重所用的 bit 数')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{phone ? t('weight = saved model number · bit = 0 or 1', '权重 = 模型保存的数 · bit = 0 或 1') : t('weight = one saved model number · bit = one 0-or-1 digit', '权重 = 模型保存的一个数 · bit = 一个 0 或 1')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{phone ? t('blue = single-GPU-section estimate · quantity unstated', '蓝柱 = 单卡章节估计 · 数量范围未说明') : t('blue bars = estimates in a single-GPU H100/H20 section · exact quantity unstated · same scale', '蓝柱 = 单卡 H100/H20 章节估计 · 具体数量范围未说明 · 同一比例')}</text>
        {#each precisionOptions as option, i}
          {@const x = phone ? 15 : 20 + i * 235}
          {@const y = phone ? 120 + i * 205 : 130}
          {@const w = phone ? 270 : 210}
          <g opacity={phase >= i ? 1 : 0.12} style="transition: opacity 450ms">
            <rect {x} {y} width={w} height={phone ? 165 : 240} rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x={x + 15} y={y + 30} class="rowlabel">{option.name}</text>
            <text x={x + 15} y={y + (phone ? 51 : 58)} class="tag">{option.bits} bits / weight</text>
            <rect x={x + 15} y={y + (phone ? 67 : 85)} width={phase >= i ? option.memory / QWEN_BF16_ESTIMATED_MEMORY_GB * (w - 30) : 0} height={phone ? 32 : 42} rx="5" fill="var(--accent)" style="transition: width 700ms" />
            <text x={x + 15} y={y + (phone ? 123 : 157)} class="formula">≈ {option.memory} GB</text>
            <text x={x + 15} y={y + (phone ? 148 : 207)} class="formula">{option.ratio.toFixed(0)}% {t('of BF16', 'BF16 的比例')}</text>
          </g>
        {/each}
        <g opacity={phase >= 2 ? 1 : 0.12} style="transition: opacity 350ms">
          <text x={W / 2} y={phone ? 735 : 480} text-anchor="middle" class="formula">40 ÷ 60 ≈ 67% · 30 ÷ 60 = 50%</text>
          <text x={W / 2} y={phone ? 760 : 505} text-anchor="middle" class="tag">{phone ? t('bits ≠ GB: other data also uses memory', 'bit 数不等于 GB：其他数据也占显存') : t('bits do not make GB: other data and unquantized parts also use memory', 'bit 数不能直接算出 GB：其他数据和未量化部分也占显存')}</text>
          <text x={W / 2} y={phone ? 790 : 535} text-anchor="middle" class="formula">{phone ? t('60→40→30 GB · estimates', '60→40→30 GB · 仅估计') : t('60 → 40 → 30 GB · documentation estimates only', '60 → 40 → 30 GB · 仅为文档估计')}</text>
        </g>

        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Not a per-card budget or quality measurement', '不是单卡预算或质量实测') : t('The source does not make these values a per-card budget; no local quality measurement.', '来源没有把这些数值定义为单卡预算；本地也没有质量实测。')}</text>
      {:else if step === 6}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t(phone ? '4/5 · CAPACITY · MORE SPEECH COPIES' : '4 of 5 · CAPACITY · MORE SPEECH COPIES, EXPLICIT CAPACITY', phone ? '4/5 · 容量 · 更多语音副本' : '4/5 · 容量 · 更多语音副本，明确算容量')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">running cap = {t('most requests one stage works on at once', '一个 stage 同时最多处理的请求数')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">codec state slot = {t('saved decoder state for one stream', '一路声音保存的 decoder 状态')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag">{phone ? t('blue=talker · orange=codec · white=GPU 0', '蓝=talker · 橙=codec · 白=GPU 0') : t('blue = talker · orange = codec capacity · white box = GPU 0 stages', '蓝 = talker · 橙 = codec 容量 · 白框 = GPU 0 stages')}</text>
        {#each phone ? [
          { x: 15, y: 125, w: 270, h: 340, replica2: false },
          { x: 15, y: 485, w: 270, h: 390, replica2: true },
        ] : [
          { x: 20, y: 125, w: 320, h: 420, replica2: false },
          { x: 380, y: 125, w: 320, h: 420, replica2: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x={panel.x + 14} y={panel.y + 27} class="rowlabel">{panel.replica2 ? 'REPLICA2' : 'DEFAULT SPEECH'}</text>
          <text x={panel.x + 14} y={panel.y + 51} class="tag strong" opacity={!panel.replica2 || phase >= 1 ? 1 : 0.12} style="transition: opacity 350ms">{panel.replica2 ? `5 + 2 + 2 = ${QWEN_SPEECH_REPLICA2_COPY_COUNT} processes · ${QWEN_SPEECH_REPLICA2_GPU_COUNT} GPUs` : `${QWEN_SPEECH_DEFAULT_COPY_COUNT} processes · ${QWEN_SPEECH_DEFAULT_GPU_COUNT} GPUs`}</text>
          <rect x={panel.x + 14} y={panel.y + 72} width={panel.w - 28} height="65" rx="7" fill="var(--bg)" stroke="var(--faint)" />
          <text x={panel.x + 25} y={panel.y + 98} class="tag strong">{panel.replica2 ? 'GPU 0 · 2 encoders + thinker' : 'GPU 0 · 2 encoders + thinker + code2wav'}</text>
          <text x={panel.x + 25} y={panel.y + 123} class="formula">thinker cap = {QWEN_THINKER_MAX_RUNNING_REQUESTS}</text>
          {#if !panel.replica2}
            <rect x={panel.x + 14} y={panel.y + 155} width={panel.w - 28} height="70" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={panel.x + 25} y={panel.y + 181} class="tag strong">GPU 1 · talker_ar × 1</text>
            <text x={panel.x + 25} y={panel.y + 207} class="formula">talker cap = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
            <rect x={panel.x + 14} y={panel.y + 244} width={panel.w - 28} height="62" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={panel.x + panel.w / 2} y={panel.y + 264} text-anchor="middle" class="tag strong">{t('EACH CODE2WAV PROCESS · ITS OWN SLOTS', '每个 CODE2WAV 进程 · 自己的状态位')}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 290} text-anchor="middle" class="formula">codec_state_slots = {QWEN_TALKER_MAX_RUNNING_REQUESTS} × 1 = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
            <text x={panel.x + panel.w / 2} y={panel.y + 326} text-anchor="middle" class="tag">{t('one talker and one code2wav process', '一个 talker 和一个 code2wav 进程')}</text>
          {:else}
            {#each [0, 1] as replica}
              <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 450ms">
                <rect x={panel.x + 14} y={panel.y + 150 + replica * 68} width={panel.w - 28} height="58" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
                <text x={panel.x + 25} y={panel.y + 175 + replica * 68} class="tag strong">GPU {replica + 1} · talker_ar@r{replica} + code2wav@r{replica}</text>
                <text x={panel.x + 25} y={panel.y + 198 + replica * 68} class="formula">talker cap = {QWEN_TALKER_MAX_RUNNING_REQUESTS}</text>
              </g>
            {/each}
            {@const poolW = (panel.w - 35) / 2}
            {#each [0, 1] as replica}
              <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 450ms">
                <rect x={panel.x + 14 + replica * (poolW + 7)} y={panel.y + 292} width={poolW} height="62" rx="7" fill="var(--gen-soft)" stroke="var(--gen)" />
                <text x={panel.x + 14 + replica * (poolW + 7) + poolW / 2} y={panel.y + 316} text-anchor="middle" class="tag strong">r{replica} · {phone ? t(`own ${QWEN_REPLICA2_CODEC_STATE_SLOTS} slots`, `独立 ${QWEN_REPLICA2_CODEC_STATE_SLOTS} 位`) : t('own codec slots', '独立 codec 状态位')}</text>
                <text x={panel.x + 14 + replica * (poolW + 7) + poolW / 2} y={panel.y + 342} text-anchor="middle" class="formula">{phone ? `${QWEN_SPEECH_REPLICA2_COUNT} × ${QWEN_TALKER_MAX_RUNNING_REQUESTS}/talker` : `${QWEN_TALKER_MAX_RUNNING_REQUESTS} × ${QWEN_SPEECH_REPLICA2_COUNT} talkers = ${QWEN_REPLICA2_CODEC_STATE_SLOTS}`}</text>
              </g>
            {/each}
            <g opacity={phase >= 3 ? 1 : 0.12} style="transition: opacity 350ms">
              <text x={panel.x + 14} y={panel.y + (phone ? 367 : 368)} class="tag">{t('declared GPU memory per replica', '每个副本 GPU 申报显存')}</text>
              <text x={panel.x + 14} y={panel.y + (phone ? 387 : 392)} class="tag">{`${QWEN_REPLICA2_TALKER_GPU_PERCENT}% talker + ${QWEN_REPLICA2_CODE2WAV_GPU_PERCENT}% code2wav = ${QWEN_REPLICA2_GPU_PERCENT.toFixed(1)}%`}</text>
            </g>
          {/if}
        {/each}
        {#if !phone}
          <text x="360" y="579" text-anchor="middle" class="tag strong" opacity={phase >= 3 ? 1 : 0.12} style="transition: opacity 350ms">{t('Caps configure room; they do not measure completed requests per second.', '上限配置容量，不测量每秒完成多少请求。')}</text>
        {/if}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('unchanged: preprocessing · 2 encoders · thinker · decode', '不变：preprocessing · 2 encoders · thinker · decode') : t('Unchanged: preprocessing · image_encoder · audio_encoder · thinker · decode', '不变：preprocessing · image_encoder · audio_encoder · thinker · decode')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Pairing keeps codec on one GPU; custom policies differ', '配对让 codec 留在一卡；自定义策略可能不同') : t('Default pairing keeps each codec stream on one GPU; a custom policy need not preserve it.', '默认配对让每路 codec 留在一卡；自定义策略不保证这种配对。')}</text>
      {:else if step === 7}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t(phone ? '5/5 · EVIDENCE · TWO CHECKS' : '5 of 5 · EVIDENCE · TWO CHECKS ANSWER TWO QUESTIONS', phone ? '5/5 · 证据 · 两种检查' : '5/5 · 证据 · 两种检查回答两个问题')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">readiness = {t('a startup health check, not a speed result', '启动健康检查，不是速度结果')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag">{t('blue = startup request · orange = measurement plan', '蓝 = 启动请求 · 橙 = 测量计划')}</text>
        <text x={phone ? 15 : 20} y="95" class="tag strong">{phone ? t('resolve config → readiness → controlled A/B', '解析 config → readiness → 受控 A/B') : t('config resolve = check parsed settings → readiness → controlled A/B', 'config resolve = 核对解析后的配置 → readiness → 受控 A/B')}</text>
        {#each phone ? [
          { x: 15, y: 105, w: 270, h: 340, measure: false },
          { x: 15, y: 465, w: 270, h: 400, measure: true },
        ] : [
          { x: 20, y: 105, w: 320, h: 400, measure: false },
          { x: 380, y: 105, w: 320, h: 400, measure: true },
        ] as panel}
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx="11" fill={panel.measure ? 'var(--gen-soft)' : 'var(--accent-soft)'} fill-opacity="0.25" stroke={panel.measure ? 'var(--gen)' : 'var(--accent)'} />
          <text x={panel.x + 15} y={panel.y + 29} class="rowlabel">{panel.measure ? t('A/B MEASUREMENT', 'A/B 测量') : t('STARTUP READINESS', '启动就绪检查')}</text>
          <text x={panel.x + 15} y={panel.y + 53} class="tag strong">{panel.measure ? t('arm = one deployment choice being compared', 'arm = 正在比较的一种部署选择') : t('Can one small request finish?', '一个小请求能跑完吗？')}</text>
          {#if !panel.measure}
            <rect x={panel.x + 15} y={panel.y + 75} width={panel.w - 30} height="112" rx="8" fill="var(--bg)" stroke="var(--accent)" />
            <text x={panel.x + 27} y={panel.y + 101} class="tag">{t('small image', '一张小图')}</text>
            <text x={panel.x + 27} y={panel.y + 130} class="tag">{QWEN_WARMUP_AUDIO_SECONDS} {t('second of audio + short instruction', '秒声音 + 一条短指令')}</text>
            <text x={panel.x + 27} y={panel.y + 159} class="tag">{t('text output; speech adds audio output', '文字输出；语音模式再加声音输出')}</text>
            <g opacity={phase >= 1 ? 1 : 0} style="transition: opacity 450ms">
              <text x={panel.x + panel.w / 2} y={panel.y + 215} text-anchor="middle" class="formula">↓ {t('every required stage', '每个需要的 stage')}</text>
              <rect x={panel.x + 15} y={panel.y + 235} width={panel.w - 30} height="64" rx="8" fill="var(--bg)" stroke="var(--accent)" />
              <text x={panel.x + panel.w / 2} y={panel.y + 273} text-anchor="middle" class="formula">≤ {QWEN_WARMUP_MAX_NEW_TOKENS} tokens / {t('generating stage', '生成 stage')}</text>
              <text x={panel.x + panel.w / 2} y={panel.y + 315} text-anchor="middle" class="tag">{t('8 text tokens ≈ 6 English words', '8 个文字 token 约 6 个英文单词')}</text>
              <text x={panel.x + panel.w / 2} y={panel.y + 333} text-anchor="middle" class="tag strong">{t('health only · audio tokens carry sound', '只查健康 · 声音 token 不是单词')}</text>
            </g>
          {:else}
            <g opacity={phase >= 2 ? 1 : 0} style="transition: opacity 450ms">
              <text x={panel.x + 15} y={panel.y + 84} class="tag strong">{t('KEEP FIXED', '保持不变')}</text>
              <text x={panel.x + 15} y={panel.y + 109} class="tag">{t('inputs · sampling · hardware · warmup', '输入 · 采样 · 硬件 · 预热')}</text>
              <text x={panel.x + 15} y={panel.y + 134} class="tag">{t('change one deployment choice', '只改一个部署选择')}</text>
              <rect x={panel.x + 15} y={panel.y + 153} width={panel.w - 30} height="58" rx="8" fill="var(--bg)" stroke="var(--gen)" />
              <text x={panel.x + panel.w / 2} y={panel.y + 188} text-anchor="middle" class="tag strong">{phone ? t(`example: ${QWEN_BENCH_CONCURRENCIES.length} levels × ${QWEN_BENCH_REPEATS} = ${QWEN_BENCH_RUNS_PER_ARM} runs / arm`, `文档算例：${QWEN_BENCH_CONCURRENCIES.length} 档 × ${QWEN_BENCH_REPEATS} 次 = ${QWEN_BENCH_RUNS_PER_ARM} 次 / 组`) : t(`documented: ${QWEN_BENCH_CONCURRENCIES.length} levels × ${QWEN_BENCH_REPEATS} repeats = ${QWEN_BENCH_RUNS_PER_ARM} runs / arm`, `文档算例：${QWEN_BENCH_CONCURRENCIES.length} 档 × 每档 ${QWEN_BENCH_REPEATS} 次 = ${QWEN_BENCH_RUNS_PER_ARM} 次 / 组`)}</text>
              {#each QWEN_BENCH_CONCURRENCIES as concurrency, level}
                <text x={panel.x + 25 + level * 120} y={panel.y + 205} class="tag">c={concurrency}</text>
                {#each Array(QWEN_BENCH_REPEATS) as _, run}
                  <rect x={panel.x + 55 + level * 130 + run * 12} y={panel.y + 196} width="8" height="8" rx="2" fill="var(--gen)" />
                {/each}
              {/each}
              <text x={panel.x + panel.w / 2} y={panel.y + 233} text-anchor="middle" class="tag">{phone ? t(`c = concurrency: ${QWEN_BENCH_CONCURRENCIES.join(' or ')} · ${QWEN_BENCH_REPEATS} runs each`, `c = 并发请求数：${QWEN_BENCH_CONCURRENCIES.join(' 或 ')} · 各 ${QWEN_BENCH_REPEATS} 次`) : t(`c = concurrency: ${QWEN_BENCH_CONCURRENCIES.join(' or ')} · ${QWEN_BENCH_REPEATS} repeats each`, `c = 并发请求数：${QWEN_BENCH_CONCURRENCIES.join(' 或 ')} · 每档 ${QWEN_BENCH_REPEATS} 次`)}</text>
            </g>
            <g opacity={phase >= 3 ? 1 : 0} style="transition: opacity 450ms">
              <rect x={panel.x + 15} y={panel.y + 254} width={panel.w - 30} height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x={panel.x + 26} y={panel.y + 279} class="tag strong">{t('BENCHMARK CLIENT RECORD', '基准客户端记录')}</text>
              <text x={panel.x + 26} y={panel.y + 302} class="tag">{t('first audio · total · throughput · failures', '首音 · 总耗时 · 吞吐 · 失败')}</text>
              <rect x={panel.x + 15} y={panel.y + 326} width={panel.w - 30} height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
              <text x={panel.x + 26} y={panel.y + 351} class="tag strong">{t('LISTENER RECORD', '听者记录')}</text>
              <text x={panel.x + 26} y={panel.y + 374} class="tag">{t('stalls · stop wait · response wait', '卡顿 · 停答等待 · 回应等待')}</text>
            </g>
          {/if}
        {/each}
        <g opacity={phase >= 4 ? 1 : 0} style="transition: opacity 450ms">
          <text x={phone ? 15 : 20} y={phone ? 890 : 535} class="rowlabel">{phone ? t(`${QWEN_STREAM_CHUNK_FRAMES} × ${QWEN_STREAM_FRAME_MS} ms = ${QWEN_STREAM_CHUNK_MS} ms · late chunk = stall`, `${QWEN_STREAM_CHUNK_FRAMES} × ${QWEN_STREAM_FRAME_MS} ms = ${QWEN_STREAM_CHUNK_MS} ms · 迟到就卡顿`) : t(`WHY THE LISTENER RECORDS STALLS · ${QWEN_STREAM_CHUNK_FRAMES} frames × ${QWEN_STREAM_FRAME_MS} ms = ${QWEN_STREAM_CHUNK_MS} ms`, `听者为什么记录卡顿 · ${QWEN_STREAM_CHUNK_FRAMES} 帧 × ${QWEN_STREAM_FRAME_MS} ms = ${QWEN_STREAM_CHUNK_MS} ms`)}</text>
          {#if phone}
            <rect x="15" y="915" width="125" height="45" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="77" y="935" text-anchor="middle" class="tag strong">chunk 1</text>
            <text x="77" y="954" text-anchor="middle" class="tag">{QWEN_STREAM_CHUNK_MS} ms {t('playing', '播放')}</text>
            <rect x="160" y="915" width="125" height="45" rx="6" fill={phase >= 5 ? 'var(--gen-soft)' : 'var(--bg)'} stroke="var(--gen)" stroke-dasharray={phase >= 5 ? 'none' : '4 3'} />
            <text x="222" y="935" text-anchor="middle" class="tag strong">chunk 2</text>
            <text x="222" y="954" text-anchor="middle" class="tag">{t(phase >= 5 ? 'ready' : 'pending', phase >= 5 ? '就绪' : '未就绪')}</text>
            <line x1="150" y1="905" x2="150" y2="970" stroke="var(--eos)" stroke-width="1.5" stroke-dasharray="4 3" />
            <text x="150" y="990" text-anchor="middle" class="tag strong" fill="var(--eos)">{t('chunk 1 ends · chunk 2 must be ready', 'chunk 1 结束 · chunk 2 必须就绪')}</text>
          {:else}
            <rect x="20" y="550" width="250" height="34" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="145" y="572" text-anchor="middle" class="tag strong">chunk 1 · {QWEN_STREAM_CHUNK_MS} ms {t('playing', '播放')}</text>
            <rect x="290" y="550" width="190" height="34" rx="6" fill={phase >= 5 ? 'var(--gen-soft)' : 'var(--bg)'} stroke="var(--gen)" stroke-dasharray={phase >= 5 ? 'none' : '4 3'} />
            <text x="385" y="572" text-anchor="middle" class="tag strong">chunk 2 · {t(phase >= 5 ? 'ready' : 'pending', phase >= 5 ? '就绪' : '未就绪')}</text>
            <line x1="510" y1="540" x2="510" y2="594" stroke="var(--eos)" stroke-width="1.5" stroke-dasharray="4 3" />
            <text x="525" y="562" class="tag strong" fill="var(--eos)">{t('chunk 1 ends', 'chunk 1 结束')}</text>
            <text x="525" y="585" class="tag">{t('chunk 2 must be ready', 'chunk 2 必须就绪')}</text>
          {/if}
        </g>
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{phone ? t('Readiness skips larger inputs and batches.', 'readiness 可能没有预热更大的输入和 batch。') : t('Readiness can leave video, large batches and other input sizes unwarmed.', 'readiness 可能没有预热视频、大 batch 和其他输入大小。')}</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(`p99: 99% at/below · ≥${QWEN_P99_MIN_SAMPLES} requests · runs vary`, `p99：99% 请求不超过 · 至少 ${QWEN_P99_MIN_SAMPLES} 个请求 · 运行次数不定`) : t(`p99 = 99% at or below · require ≥${QWEN_P99_MIN_SAMPLES} requests; ten runs may or may not contain them`, `p99 = 99% 请求不超过 · 至少 ${QWEN_P99_MIN_SAMPLES} 个请求；十次运行可能够，也可能不够`)}</text>
      {:else if step === 8}
        <text x={phone ? 15 : 20} y="24" class="rowlabel">{t(phone ? '5/5 · EVIDENCE · DECISION SHEET' : '5 of 5 · EVIDENCE · ONE DEPLOYMENT DECISION SHEET', phone ? '5/5 · 证据 · 决策表' : '5/5 · 证据 · 一张部署决策表')}</text>
        <text x={phone ? 15 : 20} y="49" class="tag">{t('blue = starting choice · orange = evidence still required', '蓝 = 起步选择 · 橙 = 还需要的证据')}</text>
        <text x={phone ? 15 : 20} y="72" class="tag strong">{phone ? t('EXAMPLE: 8 requests at once · earlier first audio', '算例：8 路并发 · 首音更早') : t('EXAMPLE: 8 concurrent spoken requests, earlier first audio', '算例：8 路并发语音请求，希望首音更早')}</text>
        {#each [
          { label: 'GOAL', labelZh: '目标', a: '8 concurrent spoken requests', aZh: '8 路并发语音请求', b: 'target: earlier first audio', bZh: '目标：首音更早', evidence: false },
          { label: 'ROUTE', labelZh: '路线', a: 'modalities=["text", "audio"]', aZh: 'modalities=["text", "audio"]', b: 'default speech graph · text + sound', bZh: '默认语音图 · 文字 + 声音', evidence: false },
          { label: 'PRECISION', labelZh: '精度', a: 'BF16 checkpoint first', aZh: '先用 BF16 checkpoint', b: 'test FP8 first · INT4 needs separate memory + quality evidence', bZh: '先测 FP8 · INT4 另需显存和质量证据', evidence: false },
          { label: 'PLACEMENT', labelZh: '摆卡', a: 'GPU 0: encoders + thinker + code2wav', aZh: 'GPU 0：encoders + thinker + code2wav', b: 'GPU 1: talker · 2 GPUs · 7 processes', bZh: 'GPU 1：talker · 2 张卡 · 7 个进程', evidence: false },
          { label: 'CAPACITY', labelZh: '容量', a: `8 ≤ ${QWEN_TALKER_MAX_RUNNING_REQUESTS} talker running cap`, aZh: `8 ≤ talker 运行上限 ${QWEN_TALKER_MAX_RUNNING_REQUESTS}`, b: `32 − 8 = ${QWEN_EXAMPLE_UNALLOCATED_TALKER_SLOTS} requests of headroom · no replica yet`, bZh: `32 − 8 = ${QWEN_EXAMPLE_UNALLOCATED_TALKER_SLOTS} 个请求余量 · 先不加副本`, evidence: false },
          { label: 'EVIDENCE', labelZh: '证据', a: 'BF16 vs FP8 only · same TP1 layout · c=8 · total/memory/raw', aZh: '只比 BF16/FP8 · 同一 TP1 摆卡 · c=8 · 总耗时/显存/原始结果', b: 'median = middle result · custom p90 = our 90% cutoff', bZh: '中位数 = 中间结果 · 自定义 p90 = 我们的 90% 上限', evidence: true },
        ] as row, i}
          {@const y = phone ? 105 + i * 100 : 105 + i * 62}
          <g opacity={phase >= i ? 1 : 0.12} style="transition: opacity 450ms">
            <rect x={phone ? 15 : 20} {y} width={phone ? 270 : 680} height={phone ? (row.evidence ? 106 : 88) : 52} rx="8" fill={row.evidence ? 'var(--gen-soft)' : 'var(--accent-soft)'} fill-opacity="0.25" stroke={row.evidence ? 'var(--gen)' : 'var(--accent)'} />
            <text x={phone ? 29 : 34} y={y + (phone ? 24 : 22)} class="tag strong" fill={row.evidence ? 'var(--gen)' : 'var(--accent)'}>{t(row.label, row.labelZh)}</text>
            <text x={phone ? 29 : 170} y={y + (phone ? 49 : 22)} class="tag strong">{phone && row.evidence ? t('BF16 vs FP8 only · same TP1 · c=8', '只比 BF16/FP8 · 同一 TP1 · c=8') : t(row.a, row.aZh)}</text>
            <text x={phone ? 29 : 170} y={y + (phone ? 73 : 42)} class="tag">{phone && row.label === 'PRECISION' ? t('FP8 first · INT4: separate evidence', '先测 FP8 · INT4 另需证据') : phone && row.label === 'CAPACITY' ? t(`32 − 8 = ${QWEN_EXAMPLE_UNALLOCATED_TALKER_SLOTS} requests of headroom`, `32 − 8 = ${QWEN_EXAMPLE_UNALLOCATED_TALKER_SLOTS} 个请求余量`) : phone && row.evidence ? t('median = middle · custom p90 = my 90% cutoff', '中位数 = 中间值 · 自定义 p90 = 90% 上限') : t(row.b, row.bZh)}</text>
            {#if phone && row.evidence}
              <text x="29" y={y + 97} class="tag">{t('total · memory · failures · raw results', '总耗时 · 显存 · 失败 · 原始结果')}</text>
            {/if}
          </g>
        {/each}
        <g opacity={phase >= 5 ? 1 : 0.12} style="transition: opacity 450ms">
        <text x={W / 2} y={phone ? 738 : 498} text-anchor="middle" class="rowlabel">{t('CHAPTERS 1–12 REVIEW', '第 1–12 章回顾')}</text>
        {#each [
          { ref: 'Ch. 1–3', refZh: '第 1–3 章', text: 'config · route · binding', textZh: '配置 · 路线 · 绑定' },
          { ref: 'Ch. 4–6', refZh: '第 4–6 章', text: 'waiting rules · data · queues', textZh: '等待规则 · 数据 · 队列' },
          { ref: 'Ch. 7–8', refZh: '第 7–8 章', text: 'memory · measurement', textZh: '显存 · 测量' },
          { ref: 'Ch. 9–12', refZh: '第 9–12 章', text: 'optimization · models', textZh: '优化 · 模型' },
        ] as card, i}
          {@const x = phone ? 15 : 20 + i * 172}
          {@const y = phone ? 765 + i * 58 : 522}
          <rect {x} {y} width={phone ? 270 : 160} height={phone ? 48 : 60} rx="7" fill="var(--bg)" stroke="var(--line)" />
          <text x={x + 12} y={y + 21} class="tag strong">{t(card.ref, card.refZh)}</text>
          <text x={x + 12} y={y + (phone ? 39 : 43)} class="tag">{t(card.text, card.textZh)}</text>
        {/each}
        </g>
        <g opacity={phase >= 5 ? 1 : 0.12} style="transition: opacity 450ms">
        {#if phone}
          <text x={W / 2} y="1005" text-anchor="middle" class="tag">{t('queued audio = unread sound in the API process', 'queued audio = API 进程里等客户端读取的声音')}</text>
          <text x={W / 2} y="1030" text-anchor="middle" class="tag strong">client ← queued audio (API process)</text>
          <text x={W / 2} y="1055" text-anchor="middle" class="tag strong">{t('What if the client reads too slowly?', '客户端读得太慢会怎样？')}</text>
        {:else}
          <text x={W / 2} y="610" text-anchor="middle" class="tag">{t('queued audio = sound waiting in the API process for the client to read', 'queued audio = API 进程里等客户端读取的声音')}</text>
          <text x={W / 2} y="635" text-anchor="middle" class="tag strong">{t('client ← queued audio (API process) · What happens when the client reads too slowly?', 'client ← queued audio (API process) · 客户端读得太慢会怎样？')}</text>
        {/if}
        </g>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t('Constructed TP1 hypothesis · local A/B required', '构造的 TP1 假设 · 仍需本地 A/B') : t('Constructed TP1 hypothesis from H200/TP2 evidence; local A/B required. No local model run.', '由 H200/TP2 证据构造的 TP1 假设，仍需本地 A/B；未运行模型。')}</text>
      {/if}
      {#if PHASE_COUNTS[step] > 0}
        <LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} label="loops" />
      {/if}
    </svg>
  </div>
  <StepControls bind:step total={steps.length} caption={cur.caption} captionZh={cur.captionZh} {prev} {next} deep={deep?.en[step]} deepZh={deep?.zh[step]} />
</figure>

<style>
  @media (min-width: 901px) {
    .canvas :global(.tag), .canvas :global(.mono), .canvas :global(.rowlabel), .canvas :global(.footnote) { font-size: var(--small-desktop); }
  }
</style>
