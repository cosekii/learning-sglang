<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
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
    VOC_FISH_CODEBOOK_ROWS,
  } from '../../omni/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'The first sound window needs 40 frames. Each frame needs ten codebook choices.',
    captionZh: '首个声音窗口要 40 帧。每帧需要十个 codebook 选择。',
  }, {
    caption: 'Reference audio becomes ten codebook rows before generation. One second makes 22 frames.',
    captionZh: '参考声音先变成十行 codebook。1 秒会得到 22 帧。',
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
  const H = $derived(phone ? [710, 800][step] : [540, 630][step]);
  const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs>
        <marker id="fish-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
      {#if step === 0}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Before the first sound window', '首个声音窗口之前')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'blue = choices made during generation' : 'blue = codebook choices made during generation', phone ? '蓝 = 生成时做出的选择' : '蓝 = 生成阶段做出的 codebook 选择')}</text>
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
          <text x="360" y="407" text-anchor="middle" class="result">{FISH_FIRST_WINDOW_FRAMES} {t('frames', '帧')} × {VOC_FISH_CODEBOOK_ROWS} {t('choices', '个选择')} = {FISH_FIRST_WINDOW_CODE_CHOICES} {t('choices', '个选择')}</text>
          <text x="360" y="437" text-anchor="middle" class="small">{FISH_FIRST_WINDOW_FRAMES} × {fmt(FISH_SAMPLES_PER_FRAME)} {t('samples', '个采样点')} ≈ {(FISH_FIRST_WINDOW_AUDIO_MS / 1000).toFixed(3)} s {t('of sound', '声音')}</text>
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
          <text x="32" y="535" class="small">40 {t('frames', '帧')} × {VOC_FISH_CODEBOOK_ROWS} {t('choices', '选择')}</text>
          <text x="32" y="566" class="result">= {FISH_FIRST_WINDOW_CODE_CHOICES} {t('choices', '个选择')}</text>
          <text x="32" y="600" class="small">40 × {fmt(FISH_SAMPLES_PER_FRAME)} {t('samples', '采样点')}</text>
          <text x="32" y="622" class="small">≈ {(FISH_FIRST_WINDOW_AUDIO_MS / 1000).toFixed(3)} s {t('of sound', '声音')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? '40 frames = 1.858 s of sound, not latency' : 'Shipped first-window threshold; 1.858 s is represented sound, not first-audio latency.', phone ? '40 帧 = 1.858 秒声音，不是等待时间' : '默认首个窗口门槛；1.858 秒是声音时长，不是首音等待。')}</text>
      {:else if step === 1}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Reference voice → ten codebook rows', '参考声音 → 十行 codebook')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'reference = the voice to copy · blue = codes' : 'reference = a recording of the wanted voice · blue = codebook entries', phone ? '参考声音 = 要模仿的录音 · 蓝 = codes' : '参考声音 = 要模仿的录音 · 蓝 = codebook 条目')}</text>
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
          <text x="350" y="303" class="result">ceil({fmt(FISH_CODEC_SAMPLE_RATE)} ÷ {fmt(FISH_SAMPLES_PER_FRAME)})</text>
          <text x="350" y="337" class="result">= {FISH_REFERENCE_FRAMES} {t('frames', '帧')}</text>
          <text x="350" y="394" class="small">{FISH_REFERENCE_FRAMES} × {fmt(FISH_SAMPLES_PER_FRAME)} = {fmt(FISH_REFERENCE_PADDED_SAMPLES)}</text>
          <text x="350" y="427" class="small">{fmt(FISH_REFERENCE_PADDED_SAMPLES)} − {fmt(FISH_CODEC_SAMPLE_RATE)}</text>
          <text x="350" y="459" class="result">= {FISH_REFERENCE_PADDING_SAMPLES} {t('padding samples', '个补位采样点')}</text>
          <text x="350" y="510" class="small">{t('22 columns, 10 rows = [10,22]', '22 列、10 行 = [10,22]')}</text>
        {:else}
          {#each [
            { y: 82, top: '1 s reference', bottom: `${fmt(FISH_TEACHING_REFERENCE_SAMPLES)} samples`, topZh: '1 秒参考声音', bottomZh: `${fmt(FISH_TEACHING_REFERENCE_SAMPLES)} 个采样点` },
            { y: 166, top: 'resample', bottom: `${fmt(FISH_CODEC_SAMPLE_RATE)} samples`, topZh: '重采样', bottomZh: `${fmt(FISH_CODEC_SAMPLE_RATE)} 个采样点` },
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
          <text x="32" y="638" class="small">ceil({fmt(FISH_CODEC_SAMPLE_RATE)} ÷ {fmt(FISH_SAMPLES_PER_FRAME)}) = {FISH_REFERENCE_FRAMES}</text>
          <text x="32" y="670" class="small">{fmt(FISH_REFERENCE_PADDED_SAMPLES)} − {fmt(FISH_CODEC_SAMPLE_RATE)}</text>
          <text x="32" y="701" class="result">= {FISH_REFERENCE_PADDING_SAMPLES} {t('padding samples', '个补位采样点')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed 16 kHz clip · real DAC frame size' : 'Constructed 16 kHz input; resampling and 2,048-sample frames follow the shipped DAC.', phone ? '构造 16 kHz 声音 · 真实 DAC 帧尺寸' : '16 kHz 输入是构造算例；重采样和 2,048 采样点帧来自默认 DAC。')}</text>
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
  @media (max-width: 900px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .result { font-size: 12px; }
    .code { font-size: 12px; }
  }
</style>
