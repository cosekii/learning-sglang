<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    FISH_FIRST_WINDOW_FRAMES,
    FISH_FIRST_WINDOW_CODE_CHOICES,
    FISH_FIRST_WINDOW_AUDIO_MS,
    FISH_SAMPLES_PER_FRAME,
    FISH_CODEC_SAMPLE_RATE,
    FISH_TEACHING_REFERENCE_SAMPLES,
    FISH_REFERENCE_FRAMES,
    FISH_REFERENCE_PADDED_SAMPLES,
    FISH_REFERENCE_PADDING_SAMPLES,
    FISH_FAST_INITIAL_CALLS,
    FISH_FAST_REMAINING_ROWS,
    FISH_FAST_CALLS_PER_FRAME,
    FISH_ENGINE_ROWS_PER_FRAME,
    FISH_STREAM_TOTAL_FRAMES,
    FISH_STREAM_NEXT_NEW_FRAMES,
    FISH_STREAM_LEFT_CONTEXT_FRAMES,
    FISH_STREAM_FINAL_NEW_FRAMES,
    FISH_STREAM_TAIL_SAMPLES,
    FISH_STREAM_SECOND_TOTAL_FRAMES,
    FISH_STREAM_NEXT_INPUT_FRAMES,
    FISH_STREAM_FINAL_INPUT_FRAMES,
    FISH_STREAM_TOTAL_INPUT_FRAMES,
    FISH_STREAM_REDECODED_FRAMES,
    FISH_NONSTREAM_BATCH_SIZE,
    FISH_NONSTREAM_A_FRAMES,
    FISH_NONSTREAM_B_FRAMES,
    FISH_NONSTREAM_PADDED_FRAMES,
    FISH_NONSTREAM_B_PADDING_FRAMES,
    FISH_NONSTREAM_A_SAMPLES,
    FISH_NONSTREAM_B_SAMPLES,
    FISH_NONSTREAM_MAX_BATCH,
    FISH_NONSTREAM_WAIT_MS,
    VOC_FISH_CODEBOOK_ROWS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'The first sound window opens at 40 frames, or earlier at the end. Each frame needs ten codes from codebooks.',
    captionZh: '首个窗口攒 40 帧打开，提前结束则直接解码。每帧要从 codebook 选出十个 code。',
  }, {
    caption: 'Reference audio becomes ten rows of codes before generation. One second makes 22 frames.',
    captionZh: '参考声音先变成十行 codes。1 秒会得到 22 帧。',
  }, {
    caption: 'Slow AR reads text and the reference codes. It chooses code 0 for one frame.',
    captionZh: 'Slow AR 读取文字和参考 codes。它为一帧选出 code 0。',
  }, {
    caption: 'Fast AR fills the other nine rows inside that frame. Ten rows go to the vocoder.',
    captionZh: 'Fast AR 在这一帧补齐另外九行。十行 codes 送进 vocoder。',
  }, {
    caption: 'Slow AR keeps earlier frames. Fast AR starts fresh for every frame.',
    captionZh: 'Slow AR 会记住之前的帧。Fast AR 每帧都重新开始。',
  }, {
    caption: 'Stopping has three exits: EOS, length and abort. Abort delivers no remaining sound.',
    captionZh: '停止有 EOS、长度用尽和中止三条路。中止不会交付剩余声音。',
  }, {
    caption: 'Streaming re-reads old frames and delays 512 samples. Old frames are not played again.',
    captionZh: '流式会重读旧帧，并延后 512 个采样点。旧帧不会再次播放。',
  }, {
    caption: 'Without streaming, Fish batches completed requests. Padding makes one shared call; trimming restores each length.',
    captionZh: '不用流式时，Fish 合并已完成请求。先补成同长，再各裁回长度。',
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const H = $derived(phone ? [710, 800, 790, 900, 790, 880, 990, 900][step] : [540, 630, 600, 650, 600, 630, 730, 660][step]);
  const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const streamEvents = [
    { title: 'FIRST · total 40', titleZh: '首次 · 累计 40', old: 0, added: FISH_FIRST_WINDOW_FRAMES, input: FISH_FIRST_WINDOW_FRAMES, emitted: `40F−${FISH_STREAM_TAIL_SAMPLES}` },
    { title: `NEXT · total ${FISH_STREAM_SECOND_TOTAL_FRAMES}`, titleZh: `下次 · 累计 ${FISH_STREAM_SECOND_TOTAL_FRAMES}`, old: FISH_STREAM_LEFT_CONTEXT_FRAMES, added: FISH_STREAM_NEXT_NEW_FRAMES, input: FISH_STREAM_NEXT_INPUT_FRAMES, emitted: '45F' },
    { title: `FINAL · total ${FISH_STREAM_TOTAL_FRAMES}`, titleZh: `最后 · 累计 ${FISH_STREAM_TOTAL_FRAMES}`, old: FISH_STREAM_LEFT_CONTEXT_FRAMES, added: FISH_STREAM_FINAL_NEW_FRAMES, input: FISH_STREAM_FINAL_INPUT_FRAMES, emitted: `5F+${FISH_STREAM_TAIL_SAMPLES}` },
  ];

  // Sequence steps: one walking highlight, and one moving tail badge on the vocoder step.
  const PHASE_COUNTS = [0, 4, 3, 11, 0, 0, 3, 4];
  const PHASE_MS = [0, 1100, 1100, 650, 0, 0, 1800, 1100];
  const REST_MS = 1800;
  type Frame = { x: number; y: number; w: number; h: number };
  const motionFrames = (isPhone: boolean, s: number): Frame[] => {
    if (s === 1) return isPhone ? [
      { x: 18, y: 82, w: 264, h: 62 }, { x: 18, y: 166, w: 264, h: 62 },
      { x: 18, y: 250, w: 264, h: 62 }, { x: 18, y: 425, w: 264, h: 302 },
    ] : [
      { x: 30, y: 91, w: 135, h: 86 }, { x: 195, y: 91, w: 135, h: 86 },
      { x: 360, y: 91, w: 135, h: 86 }, { x: 30, y: 214, w: 660, h: 342 },
    ];
    if (s === 2) return isPhone ? [
      { x: 18, y: 84, w: 264, h: 362 }, { x: 18, y: 488, w: 264, h: 82 }, { x: 18, y: 612, w: 264, h: 86 },
    ] : [
      { x: 30, y: 91, w: 300, h: 424 }, { x: 382, y: 221, w: 133, h: 114 }, { x: 562, y: 221, w: 128, h: 114 },
    ];
    if (s === 3) return isPhone ? [
      { x: 32, y: 244, w: 236, h: 60 },
      ...Array.from({ length: FISH_FAST_REMAINING_ROWS }, (_, i) => ({ x: 32 + i * 26, y: 355, w: 21, h: 44 })),
      { x: 18, y: 510, w: 264, h: 331 },
    ] : [
      { x: 70, y: 287, w: 270, h: 61 },
      ...Array.from({ length: FISH_FAST_REMAINING_ROWS }, (_, i) => ({ x: 70 + i * 29, y: 400, w: 24, h: 47 })),
      { x: 428, y: 462, w: 244, h: 93 },
    ];
    if (s === 7) return isPhone ? [
      { x: 18, y: 82, w: 264, h: 128 }, { x: 18, y: 249, w: 264, h: 212 },
      { x: 18, y: 500, w: 264, h: 58 }, { x: 18, y: 585, w: 264, h: 147 },
    ] : [
      { x: 30, y: 90, w: 160, h: 365 }, { x: 228, y: 90, w: 224, h: 365 },
      { x: 244, y: 373, w: 192, h: 55 }, { x: 488, y: 90, w: 202, h: 365 },
    ];
    return [];
  };
  const tailFrame = (isPhone: boolean, phase: number): Frame => isPhone
    ? { x: 180, y: 225 + phase * 220, w: 88, h: 42 }
    : { x: 600, y: 139 + phase * 140, w: 70, h: 40 };
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
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * PHASE_MS[s]));
      const ms = count * PHASE_MS[s] + REST_MS;
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
      <defs>
        <marker id="fish-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="fish-arrow-gen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Before the first sound window', '首个声音窗口之前')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'window = frames decoded at once · blue = codes' : 'window = frames decoded together · blue = codes chosen during generation', phone ? '窗口 = 一起解码的帧 · 蓝 = codes' : '窗口 = 一起解码的帧 · 蓝 = 生成时选出的 codes')}</text>
        {#if !phone}
          {#each [
            { x: 30, name: 'preprocessing', sub: 'reference + text', nameZh: 'preprocessing', subZh: '参考声音 + 文字' },
            { x: 270, name: 'tts_engine', sub: 'generation', nameZh: 'tts_engine', subZh: '生成' },
            { x: 510, name: 'vocoder', sub: 'codes → sound', nameZh: 'vocoder', subZh: 'codes → 声音' },
          ] as stage, i}
            <rect x={stage.x} y="86" width="180" height="76" rx="10" fill={i === 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 1 ? 'var(--accent)' : 'var(--line)'} />
            <text x={stage.x + 90} y="116" text-anchor="middle" class="small strong">{t(stage.name, stage.nameZh)}</text>
            <text x={stage.x + 90} y="142" text-anchor="middle" class="small">{t(stage.sub, stage.subZh)}</text>
            {#if i < 2}
              <line x1={stage.x + 184} y1="124" x2={stage.x + 230} y2="124" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
            {/if}
          {/each}
          <rect x="30" y="196" width="660" height="262" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="224" class="small strong">{t('THE WORK BEFORE THAT WINDOW CAN START', '这个窗口开始前要完成的工作')}</text>
          {#each Array(FISH_FIRST_WINDOW_FRAMES) as _, i}
            <rect x={49 + (i % 20) * 22} y={249 + Math.floor(i / 20) * 39} width="15" height="25" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
          {/each}
          <text x="49" y="343" class="small">{t('40 frames, drawn as 40 boxes', '40 个框 = 40 帧')}</text>
          <line x1="494" y1="277" x2="526" y2="277" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="539" y="238" width="127" height="139" rx="9" fill="white" stroke="var(--accent)" />
          <text x="602" y="260" text-anchor="middle" class="small strong">{t('one frame', '一帧')}</text>
          {#each Array(VOC_FISH_CODEBOOK_ROWS) as _, i}
            <rect x="554" y={271 + i * 9} width="48" height="6" rx="2" fill="var(--accent)" />
          {/each}
          <text x="602" y="374" text-anchor="middle" class="code">c0 … c9</text>
          <text x="360" y="407" text-anchor="middle" class="result">{FISH_FIRST_WINDOW_FRAMES} {t('frames', '帧')} × {VOC_FISH_CODEBOOK_ROWS} codes = {FISH_FIRST_WINDOW_CODE_CHOICES} codes</text>
          <text x="360" y="437" text-anchor="middle" class="small">{FISH_FIRST_WINDOW_FRAMES} × {fmt(FISH_SAMPLES_PER_FRAME)} ÷ {fmt(FISH_CODEC_SAMPLE_RATE)} ≈ {(FISH_FIRST_WINDOW_AUDIO_MS / 1000).toFixed(3)} s {t('of sound', '声音')}</text>
        {:else}
          {#each [
            { y: 84, name: 'preprocessing', sub: 'reference + text', subZh: '参考声音 + 文字' },
            { y: 177, name: 'tts_engine', sub: 'generation', subZh: '生成' },
            { y: 270, name: 'vocoder', sub: 'codes → sound', subZh: 'codes → 声音' },
          ] as stage, i}
            <rect x="18" y={stage.y} width="264" height="67" rx="9" fill={i === 1 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 1 ? 'var(--accent)' : 'var(--line)'} />
            <text x="150" y={stage.y + 27} text-anchor="middle" class="small strong">{stage.name}</text>
            <text x="150" y={stage.y + 51} text-anchor="middle" class="small">{t(stage.sub, stage.subZh)}</text>
            {#if i < 2}
              <line x1="150" y1={stage.y + 68} x2="150" y2={stage.y + 89} stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
            {/if}
          {/each}
          <rect x="18" y="365" width="264" height="264" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="391" class="small strong">{t('WORK BEFORE THE WINDOW', '窗口开始前的工作')}</text>
          {#each Array(FISH_FIRST_WINDOW_FRAMES) as _, i}
            <rect x={33 + (i % 10) * 18} y={410 + Math.floor(i / 10) * 28} width="12" height="18" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
          {/each}
          <text x="32" y="535" class="small">40 {t('frames', '帧')} × {VOC_FISH_CODEBOOK_ROWS} codes</text>
          <text x="32" y="566" class="result">= {FISH_FIRST_WINDOW_CODE_CHOICES} codes</text>
          <text x="32" y="600" class="small">40 × {fmt(FISH_SAMPLES_PER_FRAME)} ÷ {fmt(FISH_CODEC_SAMPLE_RATE)}</text>
          <text x="32" y="622" class="small">≈ {(FISH_FIRST_WINDOW_AUDIO_MS / 1000).toFixed(3)} s {t('of sound', '声音')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Shorter requests use the final flush' : 'Default non-final threshold is 40; shorter requests use the final flush. 1.858 s is sound, not latency.', phone ? '不足 40 帧时，最后直接解码' : '非最后窗口默认攒 40 帧；更短的请求最后直接解码。1.858 秒是声音，不是等待。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Reference → ten code rows' : 'Reference voice → ten rows of codes', '参考声音 → 十行 codes')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'reference = the voice to copy · blue = codes' : 'reference = a recording of the wanted voice · blue = codes', phone ? '参考声音 = 要模仿的录音 · 蓝 = codes' : '参考声音 = 要模仿的录音 · 蓝 = codes')}</text>
        {#if !phone}
          {#each [
            { x: 30, top: '1 s reference', bottom: `${fmt(FISH_TEACHING_REFERENCE_SAMPLES)} samples`, topZh: '1 秒参考声音', bottomZh: `${fmt(FISH_TEACHING_REFERENCE_SAMPLES)} 个采样点` },
            { x: 195, top: 'resample', bottom: `${fmt(FISH_CODEC_SAMPLE_RATE)} samples`, topZh: '重采样', bottomZh: `${fmt(FISH_CODEC_SAMPLE_RATE)} 个采样点` },
            { x: 360, top: 'reference codec', bottom: `pad to ${fmt(FISH_REFERENCE_PADDED_SAMPLES)}`, topZh: '参考 codec', bottomZh: `补到 ${fmt(FISH_REFERENCE_PADDED_SAMPLES)}` },
            { x: 525, top: '[10,22]', bottom: 'code matrix', topZh: '[10,22]', bottomZh: 'code 矩阵' },
          ] as box, i}
            <rect x={box.x} y="91" width="135" height="86" rx="10" fill={i === 3 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 3 ? 'var(--accent)' : 'var(--line)'} />
            <text x={box.x + 67.5} y="124" text-anchor="middle" class="small strong">{t(box.top, box.topZh)}</text>
            <text x={box.x + 67.5} y="151" text-anchor="middle" class="small">{t(box.bottom, box.bottomZh)}</text>
            {#if i === 1}
              <text x={box.x + 67.5} y="170" text-anchor="middle" class="small">{t('still 1 second', '仍是 1 秒')}</text>
            {/if}
            {#if i < 3}
              <line x1={box.x + 137} y1="134" x2={box.x + 158} y2="134" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
            {/if}
          {/each}
          <rect x="30" y="214" width="660" height="342" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="242" class="small strong">{t('OUTPUT · 10 ROWS × 22 FRAMES', '输出 · 10 行 × 22 帧')}</text>
          {#each Array(VOC_FISH_CODEBOOK_ROWS) as _, row}
            <text x="48" y={286 + row * 19} class="code">c{row}</text>
            {#each Array(FISH_REFERENCE_FRAMES) as _, col}
              <rect x={82 + col * 10} y={274 + row * 19} width="8" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
            {/each}
          {/each}
          <text x="82" y="481" class="small">22 {t('frames', '帧')}</text>
          <text x="350" y="303" class="result">round up({fmt(FISH_CODEC_SAMPLE_RATE)} ÷ {fmt(FISH_SAMPLES_PER_FRAME)})</text>
          <text x="350" y="337" class="result">= {FISH_REFERENCE_FRAMES} {t('frames', '帧')}</text>
          <text x="350" y="394" class="small">{FISH_REFERENCE_FRAMES} × {fmt(FISH_SAMPLES_PER_FRAME)} = {fmt(FISH_REFERENCE_PADDED_SAMPLES)}</text>
          <text x="350" y="427" class="small">{fmt(FISH_REFERENCE_PADDED_SAMPLES)} − {fmt(FISH_CODEC_SAMPLE_RATE)}</text>
          <text x="350" y="459" class="result">= {FISH_REFERENCE_PADDING_SAMPLES} {t('padding samples', '个补位采样点')}</text>
          <text x="350" y="493" class="small">{t('pad the partial last frame', '最后一帧不满也补满')}</text>
          <text x="350" y="527" class="small">{t('22 columns, 10 rows = [10,22]', '22 列、10 行 = [10,22]')}</text>
        {:else}
          {#each [
            { y: 82, top: '1 s reference', bottom: `${fmt(FISH_TEACHING_REFERENCE_SAMPLES)} samples`, topZh: '1 秒参考声音', bottomZh: `${fmt(FISH_TEACHING_REFERENCE_SAMPLES)} 个采样点` },
            { y: 166, top: 'resample', bottom: `${fmt(FISH_CODEC_SAMPLE_RATE)} samples · still 1 s`, topZh: '重采样', bottomZh: `${fmt(FISH_CODEC_SAMPLE_RATE)} 个采样点 · 仍是 1 秒` },
            { y: 250, top: 'reference codec', bottom: `pad to ${fmt(FISH_REFERENCE_PADDED_SAMPLES)}`, topZh: '参考 codec', bottomZh: `补到 ${fmt(FISH_REFERENCE_PADDED_SAMPLES)}` },
            { y: 334, top: '[10,22]', bottom: 'code matrix', topZh: '[10,22]', bottomZh: 'code 矩阵' },
          ] as box, i}
            <rect x="18" y={box.y} width="264" height="62" rx="9" fill={i === 3 ? 'var(--accent-soft)' : 'var(--bg)'} stroke={i === 3 ? 'var(--accent)' : 'var(--line)'} />
            <text x="150" y={box.y + 25} text-anchor="middle" class="small strong">{t(box.top, box.topZh)}</text>
            <text x="150" y={box.y + 48} text-anchor="middle" class="small">{t(box.bottom, box.bottomZh)}</text>
            {#if i < 3}
              <line x1="150" y1={box.y + 63} x2="150" y2={box.y + 80} stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
            {/if}
          {/each}
          <rect x="18" y="425" width="264" height="302" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="451" class="small strong">10 {t('rows', '行')} × 22 {t('frames', '帧')}</text>
          {#each Array(VOC_FISH_CODEBOOK_ROWS) as _, row}
            {#each Array(FISH_REFERENCE_FRAMES) as _, col}
              <rect x={48 + col * 9} y={465 + row * 15} width="7" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
            {/each}
          {/each}
          <text x="32" y="638" class="small">round up({fmt(FISH_CODEC_SAMPLE_RATE)} ÷ {fmt(FISH_SAMPLES_PER_FRAME)}) = {FISH_REFERENCE_FRAMES}</text>
          <text x="32" y="670" class="small">{fmt(FISH_REFERENCE_PADDED_SAMPLES)} − {fmt(FISH_CODEC_SAMPLE_RATE)}</text>
          <text x="32" y="701" class="result">= {FISH_REFERENCE_PADDING_SAMPLES} {t('padding samples', '个补位采样点')}</text>
          <text x="32" y="722" class="small">{t('pad the partial last frame', '最后一帧不满也补满')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed 16,000 samples/s input' : 'Constructed 16,000 samples/s input; resampling and 2,048-sample frames follow the shipped DAC.', phone ? '构造每秒 16,000 点的输入' : '每秒 16,000 点的输入是构造算例；重采样和 2,048 采样点帧来自默认 DAC。')}</text>
      {:else if step === 2}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Slow AR reads the voice prompt', 'Slow AR 读取声音 prompt')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'Slow AR = one frame at a time · orange = new' : 'Slow AR = one frame at a time · blue = reference codes · orange = new choice', phone ? 'Slow AR = 一次一帧 · 橙 = 新选择' : 'Slow AR = 一次走一帧 · 蓝 = 参考 codes · 橙 = 新选择')}</text>
        {#if !phone}
          <rect x="30" y="91" width="300" height="424" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="119" class="small strong">{t('THE PROMPT', 'PROMPT')}</text>
          <rect x="48" y="140" width="264" height="76" rx="9" fill="white" stroke="var(--line)" />
          <text x="64" y="169" class="small strong">{t('target text', '目标文字')}</text>
          <text x="64" y="196" class="small">“Read this sentence.” → {t('ordinary tokens', '普通 tokens')}</text>
          <rect x="48" y="238" width="264" height="227" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="64" y="265" class="small strong">{t('reference voice · [10,22]', '参考声音 · [10,22]')}</text>
          {#each Array(VOC_FISH_CODEBOOK_ROWS) as _, row}
            {#each Array(FISH_REFERENCE_FRAMES) as _, col}
              <rect x={65 + col * 9} y={280 + row * 10} width="7" height="7" rx="2" fill="var(--accent)" />
            {/each}
          {/each}
          <text x="64" y="400" class="small">22 {t('reference frames', '个参考帧')}</text>
          <text x="64" y="428" class="small">code 0 → {t('one model token', '一个模型 token')}</text>
          <text x="64" y="451" class="small">{t('all 10 rows add voice detail', '全部十行补充声音细节')}</text>
          <line x1="334" y1="278" x2="370" y2="278" stroke="var(--gen)" stroke-width="2" marker-end="url(#fish-arrow-gen)" />
          <rect x="382" y="221" width="133" height="114" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="448" y="264" text-anchor="middle" class="result" style="fill:var(--gen)">Slow AR</text>
          <text x="448" y="296" text-anchor="middle" class="small">{t('one frame at a time', '一次一帧')}</text>
          <line x1="519" y1="278" x2="550" y2="278" stroke="var(--gen)" stroke-width="2" marker-end="url(#fish-arrow-gen)" />
          <rect x="562" y="221" width="128" height="114" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="626" y="256" text-anchor="middle" class="small strong">{t('frame 1', '第 1 帧')}</text>
          <text x="626" y="295" text-anchor="middle" class="result" style="fill:var(--gen)">code 0</text>
          <text x="448" y="382" text-anchor="middle" class="small">{t('one time position', '一个时间位置')}</text>
          <text x="448" y="410" text-anchor="middle" class="small">{t('one new choice', '一个新选择')}</text>
          <text x="448" y="472" text-anchor="middle" class="result">1 {t('frame', '帧')} → 1 code 0</text>
        {:else}
          <rect x="18" y="84" width="264" height="362" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="110" class="small strong">{t('THE PROMPT', 'PROMPT')}</text>
          <rect x="32" y="127" width="236" height="73" rx="8" fill="white" stroke="var(--line)" />
          <text x="45" y="154" class="small strong">{t('target text', '目标文字')}</text>
          <text x="45" y="180" class="small">“Read this sentence.”</text>
          <rect x="32" y="218" width="236" height="202" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="45" y="244" class="small strong">{t('reference · [10,22]', '参考声音 · [10,22]')}</text>
          {#each Array(VOC_FISH_CODEBOOK_ROWS) as _, row}
            {#each Array(FISH_REFERENCE_FRAMES) as _, col}
              <rect x={49 + col * 8} y={258 + row * 9} width="6" height="6" rx="2" fill="var(--accent)" />
            {/each}
          {/each}
          <text x="45" y="368" class="small">22 {t('reference frames', '个参考帧')}</text>
          <text x="45" y="397" class="small">code 0 → token · 10 {t('rows add detail', '行补充细节')}</text>
          <line x1="150" y1="449" x2="150" y2="477" stroke="var(--gen)" stroke-width="2" marker-end="url(#fish-arrow-gen)" />
          <rect x="18" y="488" width="264" height="82" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="522" text-anchor="middle" class="result" style="fill:var(--gen)">Slow AR</text>
          <text x="150" y="550" text-anchor="middle" class="small">{t('one frame at a time', '一次一帧')}</text>
          <line x1="150" y1="574" x2="150" y2="601" stroke="var(--gen)" stroke-width="2" marker-end="url(#fish-arrow-gen)" />
          <rect x="18" y="612" width="264" height="86" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="644" text-anchor="middle" class="small strong">{t('frame 1', '第 1 帧')}</text>
          <text x="150" y="677" text-anchor="middle" class="result" style="fill:var(--gen)">code 0</text>
          <text x="150" y="735" text-anchor="middle" class="result">1 {t('frame', '帧')} → 1 code 0</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Code 0 becomes a token; all rows add voice detail' : 'Code 0 becomes a model token; all ten rows supply voice information at that reference frame.', phone ? 'code 0 变成 token，十行一起补充声音细节' : 'code 0 变成模型 token；十行 codes 一起提供这个参考帧的声音信息。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Fast AR fills one frame', 'Fast AR 补齐一帧')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'Fast AR = loop inside one frame · blue = codes' : 'Fast AR = loop inside one frame · orange = Slow choice · blue = vocoder codes', phone ? 'Fast AR = 一帧内的循环 · 蓝 = codes' : 'Fast AR = 一帧内的循环 · 橙 = Slow 选择 · 蓝 = vocoder codes')}</text>
        {#if !phone}
          <rect x="30" y="88" width="350" height="508" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <rect x="52" y="113" width="306" height="76" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="205" y="143" text-anchor="middle" class="result" style="fill:var(--gen)">Slow AR · {t('one choice', '一个选择')}</text>
          <text x="205" y="171" text-anchor="middle" class="small">{t('Slow raw semantic_token → sem_id (code 0)', 'Slow 原始 semantic_token → sem_id（code 0）')}</text>
          <line x1="205" y1="193" x2="205" y2="227" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="52" y="239" width="306" height="302" rx="10" fill="white" stroke="var(--accent)" />
          <text x="70" y="267" class="result" style="fill:var(--accent)">Fast AR · {t('inside one frame', '在一帧内')}</text>
          <rect x="70" y="287" width="270" height="61" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="84" y="313" class="small strong">call 0 · {t('passes Slow’s numbers to Fast', '把 Slow 的数交给 Fast')}</text>
          <text x="84" y="336" class="small">{t('chooses no code', '不选择 code')}</text>
          <text x="70" y="381" class="small strong">calls 1–9 · {t('one new code each', '每次选一个新 code')}</text>
          {#each Array(FISH_FAST_REMAINING_ROWS) as _, i}
            <rect x={70 + i * 29} y="400" width="24" height="47" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={82 + i * 29} y="429" text-anchor="middle" class="code">c{i + 1}</text>
          {/each}
          <text x="205" y="493" text-anchor="middle" class="result">{FISH_FAST_INITIAL_CALLS} + {FISH_FAST_REMAINING_ROWS} = {FISH_FAST_CALLS_PER_FRAME} Fast {t('calls', '次调用')}</text>
          <text x="205" y="523" text-anchor="middle" class="small">{t('no call after code 9', 'code 9 之后没有调用')}</text>
          <rect x="410" y="88" width="280" height="508" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="428" y="117" class="small strong">{t('ONE FRAME IN THE ENGINE', 'ENGINE 里的一帧')}</text>
          <rect x="428" y="138" width="244" height="52" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="550" y="170" text-anchor="middle" class="small strong">row 0 · {t('raw token for next Slow', 'raw token 留给下次 Slow')}</text>
          <rect x="428" y="207" width="244" height="52" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="550" y="239" text-anchor="middle" class="small strong">row 1 · code 0</text>
          <rect x="428" y="276" width="244" height="82" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="550" y="310" text-anchor="middle" class="small strong">rows 2–10</text>
          <text x="550" y="339" text-anchor="middle" class="small">codes 1–9 · Fast AR</text>
          <text x="550" y="399" text-anchor="middle" class="result">1 + 1 + 9 = {FISH_ENGINE_ROWS_PER_FRAME} {t('rows', '行')}</text>
          <line x1="550" y1="416" x2="550" y2="450" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="428" y="462" width="244" height="93" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="550" y="491" text-anchor="middle" class="small strong">{t('vocoder skips that raw row', 'vocoder 不读这个原始行')}</text>
          <text x="550" y="529" text-anchor="middle" class="result">1 + 9 = {VOC_FISH_CODEBOOK_ROWS} → vocoder</text>
        {:else}
          <rect x="18" y="82" width="264" height="73" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="112" text-anchor="middle" class="result" style="fill:var(--gen)">Slow AR · {t('one choice', '一个选择')}</text>
          <text x="150" y="139" text-anchor="middle" class="small">{t('Slow raw semantic_token → sem_id (code 0)', 'Slow 原始 semantic_token → sem_id（code 0）')}</text>
          <line x1="150" y1="159" x2="150" y2="185" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="18" y="197" width="264" height="282" rx="10" fill="white" stroke="var(--accent)" />
          <text x="32" y="225" class="result" style="fill:var(--accent)">Fast AR · {t('inside one frame', '在一帧内')}</text>
          <rect x="32" y="244" width="236" height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="44" y="270" class="small strong">call 0 · {t('passes Slow’s numbers to Fast', '把 Slow 的数交给 Fast')}</text>
          <text x="44" y="293" class="small">{t('chooses no code', '不选择 code')}</text>
          <text x="32" y="337" class="small strong">calls 1–9 · {t('one code each', '每次一个 code')}</text>
          {#each Array(FISH_FAST_REMAINING_ROWS) as _, i}
            <rect x={32 + i * 26} y="355" width="21" height="44" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={42.5 + i * 26} y="383" text-anchor="middle" class="code">c{i + 1}</text>
          {/each}
          <text x="150" y="438" text-anchor="middle" class="result">1 + 9 = {FISH_FAST_CALLS_PER_FRAME} Fast {t('calls', '次调用')}</text>
          <text x="150" y="463" text-anchor="middle" class="small">{t('no call after code 9', 'code 9 后无调用')}</text>
          <rect x="18" y="510" width="264" height="331" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="537" class="small strong">{t('ENGINE · ONE FRAME', 'ENGINE · 一帧')}</text>
          <rect x="32" y="555" width="236" height="45" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="583" text-anchor="middle" class="small strong">row 0 · {t('raw token for next Slow', 'raw token 留给下次 Slow')}</text>
          <rect x="32" y="615" width="236" height="45" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="643" text-anchor="middle" class="small strong">row 1 · code 0</text>
          <rect x="32" y="675" width="236" height="52" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="707" text-anchor="middle" class="small strong">rows 2–10 · codes 1–9</text>
          <text x="150" y="763" text-anchor="middle" class="result">1 + 1 + 9 = {FISH_ENGINE_ROWS_PER_FRAME} {t('rows', '行')}</text>
          <text x="150" y="798" text-anchor="middle" class="small strong">{t('vocoder skips raw row', 'vocoder 不读原始行')}</text>
          <text x="150" y="826" text-anchor="middle" class="result">1 + 9 = {VOC_FISH_CODEBOOK_ROWS} → vocoder</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Call 0 passes numbers; it chooses no code' : 'Fast call 0 passes Slow’s numbers into Fast AR. It does not choose a vocoder code.', phone ? '第 0 次调用只传数，不选 code' : 'Fast 第 0 次调用把 Slow 的数交给 Fast AR，不选择 vocoder code。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 30} y="30" class="title">{t('What the next frame reuses', '下一帧复用什么')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'KV = attention work · blue feedback · orange kept' : 'KV = saved attention work · blue = feedback codes · orange = retained KV', phone ? 'KV = 注意力工作 · 蓝反馈 · 橙保留' : 'KV = 已存注意力工作 · 蓝 = 反馈 codes · 橙 = 保留的 KV')}</text>
        {#if !phone}
          <rect x="30" y="86" width="660" height="86" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <rect x="48" y="106" width="185" height="47" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="140" y="135" text-anchor="middle" class="small strong">frame f · raw + {VOC_FISH_CODEBOOK_ROWS} codes</text>
          <line x1="240" y1="129" x2="421" y2="129" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <text x="330" y="116" text-anchor="middle" class="small">{t('feedback', '反馈')}</text>
          <rect x="435" y="106" width="237" height="47" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="553" y="135" text-anchor="middle" class="small strong">frame f+1 · Slow input</text>
          <rect x="30" y="198" width="315" height="329" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="48" y="227" class="result" style="fill:var(--gen)">Slow AR · {t('outer KV', '外层 KV')}</text>
          <rect x="48" y="250" width="112" height="58" rx="8" fill="white" stroke="var(--line)" />
          <text x="104" y="285" text-anchor="middle" class="small">frame f</text>
          <rect x="177" y="250" width="150" height="58" rx="8" fill="white" stroke="var(--line)" />
          <text x="252" y="285" text-anchor="middle" class="small">frame f+1</text>
          <rect x="48" y="331" width="279" height="59" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="187" y="367" text-anchor="middle" class="small strong">{t('KV kept across both frames', 'KV 横跨两帧保留')}</text>
          <text x="48" y="425" class="small strong">{t('keeps prompt + earlier frames', '保留 prompt + 之前的帧')}</text>
          <text x="48" y="455" class="small">{t('same cached prefix → can share KV', '相同缓存前缀 → 可以共享 KV')}</text>
          <text x="48" y="489" class="small">{t(phone ? 'extra_key: all 10 reference rows' : 'extra_key fingerprints all 10 reference rows', phone ? 'extra_key：十行参考 codes 的指纹' : 'extra_key 对全部十行参考 codes 做指纹')}</text>
          <text x="48" y="517" class="small">{t('cached KV may be gone', 'KV cache 可能已清除')}</text>
          <rect x="375" y="198" width="315" height="329" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="393" y="227" class="result">Fast AR · {t('inner KV', '内层 KV')}</text>
          <rect x="393" y="250" width="112" height="58" rx="8" fill="white" stroke="var(--line)" />
          <text x="449" y="285" text-anchor="middle" class="small">frame f</text>
          <rect x="522" y="250" width="150" height="58" rx="8" fill="white" stroke="var(--line)" />
          <text x="597" y="285" text-anchor="middle" class="small">frame f+1</text>
          <rect x="393" y="331" width="112" height="59" rx="8" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="5 4" />
          <text x="449" y="367" text-anchor="middle" class="small">KV 0–9</text>
          <line x1="512" y1="360" x2="515" y2="360" stroke="var(--muted)" stroke-width="2" />
          <rect x="522" y="331" width="150" height="59" rx="8" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="5 4" />
          <text x="597" y="367" text-anchor="middle" class="small">{t('fresh KV 0–9', '新的 KV 0–9')}</text>
          <text x="393" y="425" class="small strong">{t('reset before every Slow frame', '每个 Slow 帧前都重置')}</text>
          <text x="393" y="455" class="small">{t('no previous Fast positions', '不读之前的 Fast 位置')}</text>
          <text x="393" y="493" class="small">10 {t('positions inside this frame', '个位置只在本帧内')}</text>
        {:else}
          <rect x="18" y="82" width="264" height="101" rx="10" fill="var(--bg)" stroke="var(--line)" />
          <rect x="32" y="102" width="101" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="82" y="127" text-anchor="middle" class="small strong">frame f</text>
          <text x="82" y="150" text-anchor="middle" class="small">raw + {VOC_FISH_CODEBOOK_ROWS} codes</text>
          <line x1="140" y1="131" x2="159" y2="131" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="171" y="102" width="97" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="219" y="127" text-anchor="middle" class="small strong">frame f+1</text>
          <text x="219" y="150" text-anchor="middle" class="small">Slow input</text>
          <rect x="18" y="205" width="264" height="260" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="234" class="result" style="fill:var(--gen)">Slow AR · {t('outer KV', '外层 KV')}</text>
          <text x="32" y="267" class="small">frame f → frame f+1</text>
          <rect x="32" y="287" width="236" height="48" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="317" text-anchor="middle" class="small strong">{t('KV kept across frames', 'KV 跨帧保留')}</text>
          <text x="32" y="369" class="small strong">{t('prompt + earlier frames', 'prompt + 之前的帧')}</text>
          <text x="32" y="400" class="small">{t('same cached prefix → can share KV', '相同缓存前缀 → 可以共享 KV')}</text>
          <text x="32" y="425" class="small">{t(phone ? 'extra_key: all 10 reference rows' : 'extra_key fingerprints all 10 reference rows', phone ? 'extra_key：十行参考 codes 的指纹' : 'extra_key 对全部十行参考 codes 做指纹')}</text>
          <text x="32" y="450" class="small">{t('cached KV may be gone', 'KV cache 可能已清除')}</text>
          <rect x="18" y="487" width="264" height="246" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="516" class="result">Fast AR · {t('inner KV', '内层 KV')}</text>
          <text x="32" y="549" class="small">frame f → frame f+1</text>
          <rect x="32" y="569" width="236" height="48" rx="8" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="5 4" />
          <text x="150" y="599" text-anchor="middle" class="small strong">{t('old KV cleared · fresh 0–9', '旧 KV 清空 · 新的 0–9')}</text>
          <text x="32" y="651" class="small strong">{t('reset before every frame', '每帧前都重置')}</text>
          <text x="32" y="682" class="small">{t('no previous Fast positions', '不读之前的 Fast 位置')}</text>
          <text x="32" y="712" class="small">10 {t('positions only', '个位置仅限本帧')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Fast reset keeps other frames out' : 'Fast KV resets so one frame cannot read another frame’s inner positions.', phone ? 'Fast 重置，避免读到别帧的位置' : 'Fast KV 每帧重置，避免读到其他帧的内层位置。')}</text>
      {:else if step === 5}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Three exits from the same loops', '同一组循环的三个出口')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'blue = kept sound · orange = not delivered' : 'blue = kept sound · orange = terminal work or output not delivered', phone ? '蓝 = 留下的声音 · 橙 = 不交付' : '蓝 = 保留下来的声音 · 橙 = 不交付的结束工作或输出')}</text>
        {#if !phone}
          {#each [0, 1, 2] as kind}
            {@const x = 30 + kind * 225}
            <rect x={x} y="91" width="210" height="467" rx="12" fill="var(--bg)" stroke={kind === 0 ? 'var(--gen)' : kind === 1 ? 'var(--gen)' : 'var(--line)'} />
            <text x={x + 16} y="123" class="result" style={kind === 0 ? 'fill:var(--gen)' : kind === 1 ? 'fill:var(--gen)' : ''}>{kind === 0 ? 'EOS' : kind === 1 ? t('LENGTH', '长度用尽') : t('ABORT', '中止')}</text>
            {#if kind === 0}
              <rect x={x + 16} y="147" width="178" height="58" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={x + 105} y="182" text-anchor="middle" class="small strong">Slow → &lt;|im_end|&gt;</text>
              <text x={x + 16} y="241" class="small strong">{t('EOS = model says “done”', 'EOS = 模型说“结束了”')}</text>
              <text x={x + 16} y="278" class="small">{t('drop the terminal frame', '丢掉结束帧')}</text>
              <rect x={x + 16} y="308" width="178" height="67" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={x + 105} y="337" text-anchor="middle" class="small strong">{t('keep earlier frames', '保留之前的帧')}</text>
              <text x={x + 105} y="361" text-anchor="middle" class="small">finish_reason = stop</text>
              <text x={x + 16} y="422" class="small">{t('immediate EOS:', '立即遇到 EOS：')}</text>
              <text x={x + 16} y="451" class="small">0 {t('accepted frames', '个接受帧')}</text>
              <text x={x + 16} y="487" class="small strong">→ {t('error, not empty audio', '报错，不返回空声音')}</text>
            {:else if kind === 1}
              <rect x={x + 16} y="147" width="178" height="58" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={x + 105} y="182" text-anchor="middle" class="small strong">{t('generation limit reached', '达到生成上限')}</text>
              <rect x={x + 16} y="222" width="178" height="43" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={x + 105} y="249" text-anchor="middle" class="small strong">{t('keep earlier sound frames', '保留之前的声音帧')}</text>
              <text x={x + 16} y="293" class="small">finish_reason = length</text>
            {:else}
              <rect x={x + 16} y="147" width="178" height="58" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={x + 105} y="182" text-anchor="middle" class="small strong">{t('cancel request', '取消请求')}</text>
              <text x={x + 16} y="241" class="small strong">{t('stop the request', '停止这个请求')}</text>
              <text x={x + 16} y="278" class="small">{t('do not send waiting sound', '不送等待中的声音')}</text>
              <text x={x + 16} y="315" class="small">{t('do not send final success', '不送最终成功输出')}</text>
              <rect x={x + 16} y="347" width="178" height="73" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={x + 105} y="377" text-anchor="middle" class="small strong">{t('no remaining sound', '不交付剩余声音')}</text>
              <text x={x + 105} y="402" text-anchor="middle" class="small">{t('from this request', '来自这个请求')}</text>
              <text x={x + 16} y="468" class="small">{t('already delivered chunks', '已经交付的 chunks')}</text>
              <text x={x + 16} y="498" class="small">{t('cannot be recalled', '无法收回')}</text>
            {/if}
          {/each}
        {:else}
          {#each [0, 1, 2] as kind}
            {@const y = 82 + kind * 250}
            <rect x="18" y={y} width="264" height="230" rx="11" fill="var(--bg)" stroke={kind === 0 ? 'var(--gen)' : kind === 1 ? 'var(--gen)' : 'var(--line)'} />
            <text x="32" y={y + 29} class="result" style={kind === 0 ? 'fill:var(--gen)' : kind === 1 ? 'fill:var(--gen)' : ''}>{kind === 0 ? 'EOS' : kind === 1 ? t('LENGTH', '长度用尽') : t('ABORT', '中止')}</text>
            {#if kind === 0}
              <text x="32" y={y + 65} class="small strong">{t('EOS = model says “done”', 'EOS = 模型说“结束了”')}</text>
              <text x="32" y={y + 98} class="small">{t('drop terminal frame · keep earlier', '丢结束帧 · 保留之前帧')}</text>
              <rect x="32" y={y + 116} width="236" height="43" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="150" y={y + 144} text-anchor="middle" class="small strong">finish_reason = stop</text>
              <text x="32" y={y + 193} class="small strong">0 {t('accepted frames', '个接受帧')} → {t('error', '报错')}</text>
            {:else if kind === 1}
              <rect x="32" y={y + 52} width="236" height="43" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="150" y={y + 80} text-anchor="middle" class="small strong">{t('generation limit reached', '达到生成上限')}</text>
              <text x="32" y={y + 121} class="small">finish_reason = length</text>
              <rect x="32" y={y + 140} width="236" height="43" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x="150" y={y + 168} text-anchor="middle" class="small strong">{t('keep earlier sound frames', '保留之前的声音帧')}</text>
            {:else}
              <text x="32" y={y + 65} class="small strong">{t('stop the request', '停止这个请求')}</text>
              <text x="32" y={y + 98} class="small">{t('no waiting sound or final success', '不送等待声音和最终成功输出')}</text>
              <rect x="32" y={y + 116} width="236" height="43" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x="150" y={y + 144} text-anchor="middle" class="small strong">{t('no remaining sound', '不交付剩余声音')}</text>
              <text x="32" y={y + 193} class="small">{t('delivered chunks stay delivered', '已交付 chunks 不会收回')}</text>
            {/if}
          {/each}
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'EOS = <|im_end|> · delivered sound is not recalled' : 'EOS is the <|im_end|> token. Abort cannot recall sound already delivered.', phone ? 'EOS 是 <|im_end|> · 已交付声音不会收回' : 'EOS 是 <|im_end|> token。中止不能收回已经交付的声音。')}</text>
      {:else if step === 6}
        <text x={phone ? 18 : 30} y="30" class="title">{t('One constructed 90-frame stream', '构造的 90 帧流')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'blue=new · orange=old · grey=retained tail' : 'blue = new frames · orange = old frames read again · grey = held sound tail', phone ? '蓝=新 · 橙=重读 · 灰=保留的声音尾巴' : '蓝 = 新帧 · 橙 = 重读旧帧 · 灰 = 留下的声音尾巴')}</text>
        {#if !phone}
          {#each streamEvents as event, i}
            {@const y = 91 + i * 140}
            <rect x="30" y={y} width="660" height="121" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="48" y={y + 29} class="small strong">{t(event.title, event.titleZh)}</text>
            <text x="48" y={y + 65} class="small">input = {event.input}</text>
            <text x="48" y={y + 94} class="small">new = {event.added}</text>
            {#if event.old > 0}
              <rect x="190" y={y + 48} width={event.old * 4.5} height="47" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            {/if}
            <rect x={190 + event.old * 4.5} y={y + 48} width={event.added * 4.5} height="47" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="500" y={y + 60} class="small">{t('samples out', '输出采样点')}</text>
            <text x="500" y={y + 91} class="result">{event.emitted}</text>
          {/each}
          <text x="360" y="544" text-anchor="middle" class="result">{FISH_FIRST_WINDOW_FRAMES} + {FISH_STREAM_NEXT_INPUT_FRAMES} + {FISH_STREAM_FINAL_INPUT_FRAMES} = {FISH_STREAM_TOTAL_INPUT_FRAMES} {t('input frames', '帧输入')}</text>
          <text x="360" y="579" text-anchor="middle" class="small">20 + 20 = {FISH_STREAM_REDECODED_FRAMES} {t('old frames decoded again', '帧旧内容被再次解码')}</text>
          <text x="360" y="616" text-anchor="middle" class="result">(40F−512) + 45F + (5F+512) = 90F</text>
          <text x="360" y="650" text-anchor="middle" class="small">F = {fmt(FISH_SAMPLES_PER_FRAME)} {t('samples · 512 ÷ 44,100 ≈ 11.6 ms', '个采样点 · 512 ÷ 44,100 ≈ 11.6 ms')}</text>
          <text x="360" y="680" text-anchor="middle" class="small">{t('each non-final window holds a fresh tail; the next window uses the old one', '每个未结束窗口留下新尾巴；下个窗口用掉旧尾巴')}</text>
          <text x="360" y="700" text-anchor="middle" class="small">{t('the final flush releases the last tail', '最后一次释放最后的尾巴')}</text>
        {:else}
          {#each streamEvents as event, i}
            {@const y = 82 + i * 220}
            <rect x="18" y={y} width="264" height="200" rx="11" fill="var(--bg)" stroke="var(--line)" />
            <text x="32" y={y + 29} class="small strong">{t(event.title, event.titleZh)}</text>
            <text x="32" y={y + 57} class="small">input = {event.input} · new = {event.added}</text>
            {#if event.old > 0}
              <rect x="32" y={y + 77} width={event.old * 3.2} height="44" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            {/if}
            <rect x={32 + event.old * 3.2} y={y + 77} width={event.added * 3.2} height="44" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="32" y={y + 151} class="small">{t('samples out', '输出采样点')}</text>
            <text x="32" y={y + 181} class="result">{event.emitted}</text>
          {/each}
          <text x="150" y="766" text-anchor="middle" class="result">40 + 65 + 25 = {FISH_STREAM_TOTAL_INPUT_FRAMES} {t('inputs', '帧输入')}</text>
          <text x="150" y="801" text-anchor="middle" class="small">20 + 20 = {FISH_STREAM_REDECODED_FRAMES} {t('old frames repeated', '帧旧内容重算')}</text>
          <text x="150" y="839" text-anchor="middle" class="result">(40F−512)+45F+(5F+512)=90F</text>
          <text x="150" y="875" text-anchor="middle" class="small">F = {fmt(FISH_SAMPLES_PER_FRAME)} {t('samples', '个采样点')}</text>
          <text x="150" y="905" text-anchor="middle" class="small">512 ÷ 44,100 ≈ 11.6 ms</text>
          <text x="150" y="935" text-anchor="middle" class="small">{t('each non-final window holds a fresh tail', '每个未结束窗口留下新尾巴')}</text>
          <text x="150" y="962" text-anchor="middle" class="small">{t('next uses the old tail · final releases it', '下个用旧尾巴 · 最后释放它')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed 90 frames · shipped window defaults' : 'Constructed 90-frame stream; 40/45/20/512 are the shipped window defaults.', phone ? '构造 90 帧 · 默认窗口规则' : '90 帧是构造流；40/45/20/512 是默认窗口规则。')}</text>
      {:else if step === 7}
        <text x={phone ? 18 : 30} y="30" class="title">{t(phone ? 'Batch completed requests' : 'Completed requests share one vocoder call', '已完成请求共用一次 vocoder 调用')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'blue = real codes · grey = padding' : 'blue = real code frames · grey = padding removed afterward', '蓝 = 真实 code 帧 · 灰 = 随后裁掉的补位')}</text>
        {#if !phone}
          <rect x="30" y="90" width="160" height="365" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="46" y="119" class="small strong">{t('CONSTRUCTED · COMPLETED', '构造 · 已完成')}</text>
          <rect x="46" y="145" width="128" height="86" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="110" y="179" text-anchor="middle" class="small strong">A · [11,{FISH_NONSTREAM_A_FRAMES}]</text>
          <text x="110" y="207" text-anchor="middle" class="small">{FISH_NONSTREAM_A_FRAMES} {t('frames', '帧')}</text>
          <rect x="46" y="256" width="128" height="86" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="110" y="290" text-anchor="middle" class="small strong">B · [11,{FISH_NONSTREAM_B_FRAMES}]</text>
          <text x="110" y="318" text-anchor="middle" class="small">{FISH_NONSTREAM_B_FRAMES} {t('frames', '帧')}</text>
          <text x="110" y="387" text-anchor="middle" class="small">{t('Dual-AR is done', 'Dual-AR 已完成')}</text>
          <line x1="194" y1="249" x2="216" y2="249" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="228" y="90" width="224" height="365" rx="12" fill="var(--bg)" stroke="var(--accent)" />
          <text x="244" y="119" class="small strong">{t('PAD INTO ONE BATCH', '补位成一个 batch')}</text>
          <text x="244" y="151" class="result">[{FISH_NONSTREAM_BATCH_SIZE},10,{FISH_NONSTREAM_PADDED_FRAMES}]</text>
          <text x="244" y="195" class="small">A · 90 {t('real frames', '帧真实内容')}</text>
          <rect x="244" y="208" width="135" height="30" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="244" y="267" class="small">B · 40 + 50</text>
          <rect x="244" y="280" width="60" height="30" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="304" y="280" width="75" height="30" rx="5" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="5 4" />
          <text x="244" y="340" class="small">90 − 40 = {FISH_NONSTREAM_B_PADDING_FRAMES} {t('padding frames', '帧补位')}</text>
          <rect x="244" y="373" width="192" height="55" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="340" y="407" text-anchor="middle" class="small strong">1 vocoder {t('call', '次调用')}</text>
          <line x1="456" y1="249" x2="476" y2="249" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="488" y="90" width="202" height="365" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <text x="504" y="119" class="small strong">{t('TRIM EACH OUTPUT', '裁切每份输出')}</text>
          <rect x="504" y="145" width="170" height="108" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="589" y="175" text-anchor="middle" class="small strong">A · 90F</text>
          <text x="589" y="203" text-anchor="middle" class="small">90 × 2,048</text>
          <text x="589" y="231" text-anchor="middle" class="small">= {fmt(FISH_NONSTREAM_A_SAMPLES)} · ≈4.18 s</text>
          <rect x="504" y="278" width="170" height="108" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="589" y="308" text-anchor="middle" class="small strong">B · 40F</text>
          <text x="589" y="336" text-anchor="middle" class="small">40 × 2,048</text>
          <text x="589" y="364" text-anchor="middle" class="small">= {fmt(FISH_NONSTREAM_B_SAMPLES)} · ≈1.86 s</text>
          <text x="589" y="422" text-anchor="middle" class="small">{t('samples, after trimming', '裁切后的采样点')}</text>
          <text x="360" y="477" text-anchor="middle" class="small">11→10: {t('drop raw token', '去掉原始 token')} · [requests, code rows, frames]</text>
          <rect x="30" y="491" width="660" height="100" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="360" y="520" text-anchor="middle" class="small strong">{t('THIS ONE-WAY REQUEST IS DONE', '这条单向请求已完成')}</text>
          <text x="360" y="543" text-anchor="middle" class="small">{t('audio input is still arriving · sound output is playing', '输入声音仍在到达 · 输出声音正在播放')}</text>
          <text x="360" y="570" text-anchor="middle" class="result">{t('If audio keeps arriving, what must a session keep?', '如果声音持续到达，session 要保留什么？')}</text>
        {:else}
          <rect x="18" y="82" width="264" height="128" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="109" class="small strong">{t('CONSTRUCTED · COMPLETED', '构造 · 已完成')}</text>
          <rect x="32" y="126" width="110" height="62" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="87" y="152" text-anchor="middle" class="small strong">A · [11,{FISH_NONSTREAM_A_FRAMES}]</text>
          <text x="87" y="176" text-anchor="middle" class="small">{FISH_NONSTREAM_A_FRAMES} {t('frames', '帧')}</text>
          <rect x="158" y="126" width="110" height="62" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="213" y="152" text-anchor="middle" class="small strong">B · [11,{FISH_NONSTREAM_B_FRAMES}]</text>
          <text x="213" y="176" text-anchor="middle" class="small">{FISH_NONSTREAM_B_FRAMES} {t('frames', '帧')}</text>
          <line x1="150" y1="214" x2="150" y2="237" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="18" y="249" width="264" height="212" rx="11" fill="var(--bg)" stroke="var(--accent)" />
          <text x="32" y="277" class="small strong">{t('PAD INTO ONE BATCH', '补位成一个 batch')}</text>
          <text x="32" y="309" class="result">[{FISH_NONSTREAM_BATCH_SIZE},10,{FISH_NONSTREAM_PADDED_FRAMES}]</text>
          <text x="32" y="343" class="small">A · 90 {t('real frames', '帧真实内容')}</text>
          <rect x="32" y="356" width="216" height="25" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="32" y="410" class="small">B · 40 + 50 = 90</text>
          <rect x="32" y="422" width="96" height="25" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <rect x="128" y="422" width="120" height="25" rx="5" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="5 4" />
          <line x1="150" y1="465" x2="150" y2="488" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="18" y="500" width="264" height="58" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="536" text-anchor="middle" class="small strong">1 vocoder {t('call', '次调用')}</text>
          <rect x="18" y="585" width="264" height="147" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="613" class="small strong">{t('TRIM EACH OUTPUT', '裁切每份输出')}</text>
          <text x="32" y="649" class="small">A · 90F = {fmt(FISH_NONSTREAM_A_SAMPLES)} · ≈4.18 s</text>
          <text x="32" y="681" class="small">B · 40F = {fmt(FISH_NONSTREAM_B_SAMPLES)} · ≈1.86 s</text>
          <text x="32" y="713" class="small">{t('samples · B loses 50 pad frames', '采样点 · B 裁掉 50 帧补位')}</text>
          <text x="150" y="750" text-anchor="middle" class="small">11→10: {t('drop raw', '去原始行')} · [requests, rows, frames]</text>
          <rect x="18" y="763" width="264" height="108" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="790" text-anchor="middle" class="small strong">{t('ONE-WAY REQUEST DONE', '单向请求已完成')}</text>
          <text x="150" y="817" text-anchor="middle" class="small">{t('audio in: arriving · sound out: playing', '输入声音仍到达 · 输出声音正播放')}</text>
          <text x="150" y="848" text-anchor="middle" class="result">{t('What must a session remember?', '声音持续到达：session 保留什么？')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(`Completed: max ${FISH_NONSTREAM_MAX_BATCH} · wait up to ${FISH_NONSTREAM_WAIT_MS} ms`, `已完成：最多 ${FISH_NONSTREAM_MAX_BATCH} 个 · 最多等 ${FISH_NONSTREAM_WAIT_MS} ms`) : t(`Completed defaults: max ${FISH_NONSTREAM_MAX_BATCH}, wait up to ${FISH_NONSTREAM_WAIT_MS} ms for more. Streaming stays per request.`, `已完成请求默认最多 ${FISH_NONSTREAM_MAX_BATCH} 个，额外请求最多等 ${FISH_NONSTREAM_WAIT_MS} ms；流式 chunks 仍逐请求运行。`)}</text>
      {/if}
      {#if PHASE_COUNTS[step] > 0}
        <LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={68} label={step === 6 ? t('loops', '循环') : t('loops · red = current', '循环 · 红框 = 当前')} />
      {/if}
      {#if focus}
        <rect class="motion-focus" x={focus.x - 4} y={focus.y - 4} width={focus.w + 8} height={focus.h + 8} rx="12" fill="none" stroke="var(--eos)" stroke-width="3" />
      {/if}
      {#if step === 6}
        {@const tail = tailFrame(phone, phase)}
        <rect class="motion-tail" x={tail.x} y={tail.y} width={tail.w} height={tail.h} rx="8" fill="var(--bg)" stroke="var(--muted)" stroke-width="2" />
        <text class="motion-tail tag strong" x={tail.x + tail.w / 2} y={tail.y + 26} text-anchor="middle">{t(['512 held', 'old 512 used', '512 released'][phase], ['留下 512', '用掉旧 512', '释放 512'][phase])}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label { font-size: 13px; fill: var(--fg); }
  .small { font-size: 13px; fill: var(--fg); }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .code { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  .motion-focus { pointer-events: none; transition: x 240ms, y 240ms, width 240ms, height 240ms; }
  .motion-tail { transition: x 240ms, y 240ms; }
  @media (max-width: 900px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .result { font-size: 12px; }
    .code { font-size: 12px; }
  }
</style>
