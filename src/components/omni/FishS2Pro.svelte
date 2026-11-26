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
    FISH_FAST_INITIAL_CALLS,
    FISH_FAST_REMAINING_ROWS,
    FISH_FAST_CALLS_PER_FRAME,
    FISH_ENGINE_ROWS_PER_FRAME,
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
  }, {
    caption: 'Slow AR reads text and the reference codes. It chooses code 0 for one frame.',
    captionZh: 'Slow AR 读取文字和参考 codes。它为一帧选出 code 0。',
  }, {
    caption: 'Fast AR fills the other nine rows inside that frame. Ten rows go to the vocoder.',
    captionZh: 'Fast AR 在这一帧补齐另外九行。十行 codes 送进 vocoder。',
  }, {
    caption: 'Slow AR keeps earlier frames. Fast AR starts fresh for every frame.',
    captionZh: 'Slow AR 会记住之前的帧。Fast AR 每帧都重新开始。',
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
  const H = $derived(phone ? [710, 800, 790, 900, 790][step] : [540, 630, 600, 650, 600][step]);
  const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 0 });
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
      {:else if step === 2}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Slow AR reads the voice prompt', 'Slow AR 读取声音 prompt')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'Slow AR = outer loop · orange = new choice' : 'Slow AR = outer loop · blue = reference codes · orange = new choice', phone ? 'Slow AR = 外层循环 · 橙 = 新选择' : 'Slow AR = 外层循环 · 蓝 = 参考 codes · 橙 = 新选择')}</text>
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
          <text x="64" y="400" class="small">22 {t('marked positions', '个标记位置')}</text>
          <text x="64" y="428" class="small">1 code 0 token + 10 {t('rows', '行 codes')}</text>
          <text x="64" y="451" class="small">{t('at every reference position', '在每个参考位置')}</text>
          <line x1="334" y1="278" x2="370" y2="278" stroke="var(--gen)" stroke-width="2" marker-end="url(#fish-arrow-gen)" />
          <rect x="382" y="221" width="133" height="114" rx="11" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="448" y="264" text-anchor="middle" class="result" style="fill:var(--gen)">Slow AR</text>
          <text x="448" y="296" text-anchor="middle" class="small">{t('outer loop', '外层循环')}</text>
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
          <text x="45" y="368" class="small">22 {t('positions', '个位置')} · 1 + 10</text>
          <text x="45" y="397" class="small">code 0 token + 10 {t('rows', '行 codes')}</text>
          <line x1="150" y1="449" x2="150" y2="477" stroke="var(--gen)" stroke-width="2" marker-end="url(#fish-arrow-gen)" />
          <rect x="18" y="488" width="264" height="82" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="522" text-anchor="middle" class="result" style="fill:var(--gen)">Slow AR</text>
          <text x="150" y="550" text-anchor="middle" class="small">{t('outer loop', '外层循环')}</text>
          <line x1="150" y1="574" x2="150" y2="601" stroke="var(--gen)" stroke-width="2" marker-end="url(#fish-arrow-gen)" />
          <rect x="18" y="612" width="264" height="86" rx="10" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="644" text-anchor="middle" class="small strong">{t('frame 1', '第 1 帧')}</text>
          <text x="150" y="677" text-anchor="middle" class="result" style="fill:var(--gen)">code 0</text>
          <text x="150" y="735" text-anchor="middle" class="result">1 {t('frame', '帧')} → 1 code 0</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'All ten rows join each reference position' : 'Only code 0 becomes a token ID; all ten rows change the model input at that position.', phone ? '每个参考位置都会读入全部十行' : '只有 code 0 变成 token ID；十行 codes 都会改变该位置的模型输入。')}</text>
      {:else if step === 3}
        <text x={phone ? 18 : 30} y="30" class="title">{t('Fast AR fills one frame', 'Fast AR 补齐一帧')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'Fast AR = inner loop · blue = vocoder codes' : 'Fast AR = inner loop · orange = Slow token · blue = vocoder codes', phone ? 'Fast AR = 内层循环 · 蓝 = vocoder codes' : 'Fast AR = 内层循环 · 橙 = Slow token · 蓝 = vocoder codes')}</text>
        {#if !phone}
          <rect x="30" y="88" width="350" height="508" rx="12" fill="var(--bg)" stroke="var(--line)" />
          <rect x="52" y="113" width="306" height="76" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="205" y="143" text-anchor="middle" class="result" style="fill:var(--gen)">Slow AR → raw token</text>
          <text x="205" y="171" text-anchor="middle" class="small">{t('one choice on the time axis', '时间轴上的一个选择')}</text>
          <line x1="205" y1="193" x2="205" y2="227" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="52" y="239" width="306" height="302" rx="10" fill="white" stroke="var(--accent)" />
          <text x="70" y="267" class="result" style="fill:var(--accent)">Fast AR · {t('inner loop', '内层循环')}</text>
          <rect x="70" y="287" width="270" height="61" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="84" y="313" class="small strong">call 0 · {t('reads Slow’s numbers', '读取 Slow 算出的数')}</text>
          <text x="84" y="336" class="small">{t('adds no vocoder row', '不增加 vocoder 行')}</text>
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
          <text x="550" y="170" text-anchor="middle" class="small strong">row 0 · raw Slow token</text>
          <rect x="428" y="207" width="244" height="52" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="550" y="239" text-anchor="middle" class="small strong">row 1 · code 0</text>
          <rect x="428" y="276" width="244" height="82" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="550" y="310" text-anchor="middle" class="small strong">rows 2–10</text>
          <text x="550" y="339" text-anchor="middle" class="small">codes 1–9 · Fast AR</text>
          <text x="550" y="399" text-anchor="middle" class="result">1 + 1 + 9 = {FISH_ENGINE_ROWS_PER_FRAME} {t('rows', '行')}</text>
          <line x1="550" y1="416" x2="550" y2="450" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="428" y="462" width="244" height="93" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="550" y="491" text-anchor="middle" class="small strong">{t('drop the raw Slow token', '去掉 Slow 原始 token')}</text>
          <text x="550" y="529" text-anchor="middle" class="result">1 + 9 = {VOC_FISH_CODEBOOK_ROWS} → vocoder</text>
        {:else}
          <rect x="18" y="82" width="264" height="73" rx="9" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="112" text-anchor="middle" class="result" style="fill:var(--gen)">Slow AR → raw token</text>
          <text x="150" y="139" text-anchor="middle" class="small">{t('one time-axis choice', '时间轴上的一个选择')}</text>
          <line x1="150" y1="159" x2="150" y2="185" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="18" y="197" width="264" height="282" rx="10" fill="white" stroke="var(--accent)" />
          <text x="32" y="225" class="result" style="fill:var(--accent)">Fast AR · {t('inner loop', '内层循环')}</text>
          <rect x="32" y="244" width="236" height="60" rx="8" fill="var(--bg)" stroke="var(--line)" />
          <text x="44" y="270" class="small strong">call 0 · {t('reads Slow’s numbers', '读取 Slow 的数')}</text>
          <text x="44" y="293" class="small">{t('adds no vocoder row', '不增加 vocoder 行')}</text>
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
          <text x="150" y="583" text-anchor="middle" class="small strong">row 0 · raw Slow token</text>
          <rect x="32" y="615" width="236" height="45" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="643" text-anchor="middle" class="small strong">row 1 · code 0</text>
          <rect x="32" y="675" width="236" height="52" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="707" text-anchor="middle" class="small strong">rows 2–10 · codes 1–9</text>
          <text x="150" y="763" text-anchor="middle" class="result">1 + 1 + 9 = {FISH_ENGINE_ROWS_PER_FRAME} {t('rows', '行')}</text>
          <text x="150" y="798" text-anchor="middle" class="small strong">{t('drop raw token', '去掉原始 token')}</text>
          <text x="150" y="826" text-anchor="middle" class="result">1 + 9 = {VOC_FISH_CODEBOOK_ROWS} → vocoder</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Nonterminal frame · call 0 adds no code row' : 'Nonterminal frame. Fast call 0 supplies context; its output scores are not a vocoder choice.', phone ? '非结束帧 · 第 0 次调用不增加 code 行' : '非结束帧。Fast 第 0 次调用提供上下文，其输出分数不是 vocoder 选择。')}</text>
      {:else if step === 4}
        <text x={phone ? 18 : 30} y="30" class="title">{t('What the next frame reuses', '下一帧复用什么')}</text>
        <text x={phone ? 18 : 30} y="55" class="label">{t(phone ? 'KV = attention work · blue feedback · orange kept' : 'KV = saved attention work · blue = feedback codes · orange = retained KV', phone ? 'KV = 注意力工作 · 蓝反馈 · 橙保留' : 'KV = 已存注意力工作 · 蓝 = 反馈 codes · 橙 = 保留的 KV')}</text>
        {#if !phone}
          <rect x="30" y="86" width="660" height="86" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <rect x="48" y="106" width="185" height="47" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="140" y="135" text-anchor="middle" class="small strong">frame f · {VOC_FISH_CODEBOOK_ROWS} codes</text>
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
          <text x="48" y="455" class="small">{t('matching prefixes can share it', '匹配前缀可以共享')}</text>
          <text x="48" y="493" class="small">{t('prefix key = all 10 reference rows', '前缀 key = 全部十行参考 codes')}</text>
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
          <text x="82" y="150" text-anchor="middle" class="small">{VOC_FISH_CODEBOOK_ROWS} codes</text>
          <line x1="140" y1="131" x2="159" y2="131" stroke="var(--accent)" stroke-width="2" marker-end="url(#fish-arrow)" />
          <rect x="171" y="102" width="97" height="58" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="219" y="127" text-anchor="middle" class="small strong">frame f+1</text>
          <text x="219" y="150" text-anchor="middle" class="small">Slow input</text>
          <rect x="18" y="205" width="264" height="235" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="234" class="result" style="fill:var(--gen)">Slow AR · {t('outer KV', '外层 KV')}</text>
          <text x="32" y="267" class="small">frame f → frame f+1</text>
          <rect x="32" y="287" width="236" height="48" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
          <text x="150" y="317" text-anchor="middle" class="small strong">{t('KV kept across frames', 'KV 跨帧保留')}</text>
          <text x="32" y="369" class="small strong">{t('prompt + earlier frames', 'prompt + 之前的帧')}</text>
          <text x="32" y="400" class="small">{t('prefix key uses all 10 rows', '前缀 key 用全部十行')}</text>
          <rect x="18" y="462" width="264" height="246" rx="11" fill="var(--bg)" stroke="var(--line)" />
          <text x="32" y="491" class="result">Fast AR · {t('inner KV', '内层 KV')}</text>
          <text x="32" y="524" class="small">frame f → frame f+1</text>
          <rect x="32" y="544" width="236" height="48" rx="8" fill="var(--bg)" stroke="var(--faint)" stroke-dasharray="5 4" />
          <text x="150" y="574" text-anchor="middle" class="small strong">{t('old KV cleared · fresh 0–9', '旧 KV 清空 · 新的 0–9')}</text>
          <text x="32" y="626" class="small strong">{t('reset before every frame', '每帧前都重置')}</text>
          <text x="32" y="657" class="small">{t('no previous Fast positions', '不读之前的 Fast 位置')}</text>
          <text x="32" y="687" class="small">10 {t('positions only', '个位置仅限本帧')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Slow prefix reuse ≠ reference-code cache' : 'Slow prefix reuse and the Step 2 reference-code cache are different mechanisms.', phone ? 'Slow 前缀复用 ≠ 参考 code 缓存' : 'Slow 前缀复用与第 2 步的参考 code 缓存是不同机制。')}</text>
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
