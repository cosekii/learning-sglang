<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_CAPTURE_FRAME_COUNT,
    VOXT_CAPTURE_FRAME_MS,
    VOXT_BYTE_STATES,
    VOXT_DEMO_AUDIO_MS,
    VOXT_DEMO_HIGH_BYTE,
    VOXT_DEMO_LOW_BYTE,
    VOXT_DEMO_PCM_VALUE,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Sound arrives continuously. The helper packs each 100 ms into one audio frame.',
    captionZh: '声音连续进来。helper 每攒够 100 ms 就装成一帧。',
  }, {
    caption: 'Each sound measurement is stored in two bytes. The remainder byte goes first.',
    captionZh: '每次声音测量存成 2 个字节。装余数的字节先放。',
  }];
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
  const H = $derived(step === 0 ? (phone ? 590 : 380) : (phone ? 515 : 330));
  const frames = Array.from({ length: VOXT_CAPTURE_FRAME_COUNT }, (_, i) => ({
    seq: i,
    start: i * VOXT_CAPTURE_FRAME_MS,
    end: (i + 1) * VOXT_CAPTURE_FRAME_MS,
  }));
  const wave = (width: number, base: number) => Array.from({ length: 121 }, (_, i) => {
    const x = i / 120;
    const envelope = 0.3 + 0.7 * Math.sin(Math.PI * x) ** 2;
    const y = base + envelope * (27 * Math.sin(x * Math.PI * 14) + 13 * Math.sin(x * Math.PI * 34));
    return `${i ? 'L' : 'M'}${(x * width).toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={step === 0
      ? t('The helper cuts one second of continuous sound into ten ordered audio frames, each holding 100 milliseconds', 'helper 把一秒连续声音按顺序切成十段音频帧，每段装 100 毫秒')
      : t('One sound measurement in whole-number form, 16383, is split into 63 groups of 256 and remainder 255. Remainder byte 255 is stored first, then group byte 63.', '一次声音测量的整数形式 16383 拆成 63 组 256，余下 255。装余数的字节 255 先存，装组数的字节 63 后存。')}>
      <defs>
        <marker id="frame-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="byte-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {#if step === 0}
      <text x={W / 2} y={phone ? 25 : 30} text-anchor="middle" class="title">{t(`${VOXT_DEMO_AUDIO_MS / 1000} SECOND OF SOUND → ${VOXT_CAPTURE_FRAME_COUNT} SHORT PIECES`, `${VOXT_DEMO_AUDIO_MS / 1000} 秒连续声音 → ${VOXT_CAPTURE_FRAME_COUNT} 小段声音`)}</text>
      <text x={W / 2} y={phone ? 47 : 52} text-anchor="middle" class="subtitle">{t('audio frame = a short sound slice · ms = milliseconds', '音频帧 = 一小段声音 · ms = 毫秒')}</text>

      <rect x={phone ? 15 : 30} y={phone ? 65 : 75} width={phone ? 270 : 660} height={phone ? 172 : 150} rx="12" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 360} y={phone ? 86 : 97} text-anchor="middle" class="label">{t('MICROPHONE · SOUND KEEPS COMING', '麦克风 · 声音连续进来')}</text>
      <text x={phone ? 150 : 360} y={phone ? 106 : 117} text-anchor="middle" class="detail">{t('blue line = sound strength changing over time', '蓝线 = 声音强弱随时间变化')}</text>
      <g transform={`translate(${phone ? 30 : 50} 0)`}>
        <line x1="0" y1={phone ? 157 : 160} x2={phone ? 240 : 620} y2={phone ? 157 : 160} stroke="var(--line)" />
        <path d={wave(phone ? 240 : 620, phone ? 157 : 160)} fill="none" stroke="var(--accent)" stroke-width="2.5" />
        {#each Array.from({ length: VOXT_CAPTURE_FRAME_COUNT + 1 }, (_, i) => i) as tick}
          {@const x = tick * (phone ? 24 : 62)}
          <line x1={x} y1={phone ? 120 : 123} x2={x} y2={phone ? 194 : 197} stroke="var(--line)" stroke-dasharray="3 4" />
        {/each}
        <text x="0" y={phone ? 214 : 214} text-anchor="middle" class="detail">0 ms</text>
        <text x={phone ? 120 : 310} y={phone ? 214 : 214} text-anchor="middle" class="detail">500 ms</text>
        <text x={phone ? 240 : 620} y={phone ? 214 : 214} text-anchor="middle" class="detail">1000 ms</text>
      </g>
      <line x1={W / 2} y1={phone ? 239 : 228} x2={W / 2} y2={phone ? 259 : 248} stroke="var(--accent)" stroke-width="2" marker-end="url(#frame-arrow)" />
      <text x={W / 2 + 10} y={phone ? 254 : 244} class="cut">{t(`helper cuts every ${VOXT_CAPTURE_FRAME_MS} ms`, `helper 每 ${VOXT_CAPTURE_FRAME_MS} ms 切一段`)}</text>

      <text x={W / 2} y={phone ? 281 : 273} text-anchor="middle" class="formula">{VOXT_DEMO_AUDIO_MS / 1000} {t('s', '秒')} ÷ {VOXT_CAPTURE_FRAME_MS / 1000} {t('s', '秒')} = {VOXT_CAPTURE_FRAME_COUNT} {t('frames', '帧')}</text>
      {#each frames as frame, i}
        {@const x = phone ? 15 + (i % 2) * 140 : 30 + i * 66}
        {@const y = phone ? 296 + Math.floor(i / 2) * 50 : 292}
        <rect {x} {y} width={phone ? 130 : 60} height={phone ? 40 : 52} rx="7" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x={x + (phone ? 65 : 30)} y={y + (phone ? 16 : 20)} text-anchor="middle" class="frame-title">{t(`frame ${frame.seq}`, `第 ${frame.seq} 帧`)}</text>
        <text x={x + (phone ? 65 : 30)} y={y + (phone ? 32 : 40)} text-anchor="middle" class="frame-time">{frame.start}–{frame.end} ms</text>
      {/each}
      <text x={W / 2} y={H - (phone ? 14 : 16)} text-anchor="middle" class="footnote">{t(`Constructed waveform; the default frame lasts ${VOXT_CAPTURE_FRAME_MS} ms.`, `波形是示意图；默认每帧 ${VOXT_CAPTURE_FRAME_MS} ms。`)}</text>
      {:else}
      <text x={W / 2} y={phone ? 25 : 30} text-anchor="middle" class="title">{t('ONE SOUND MEASUREMENT = TWO BYTES', '一次声音测量 = 两个字节')}</text>
      <text x={W / 2} y={phone ? 50 : 54} text-anchor="middle" class="definition">{t('byte = a box holding 0–255 · 0 through 255 = 256 values', '字节 = 能存 0–255 的格子 · 共 256 种数')}</text>

      <rect x={phone ? 85 : 30} y={phone ? 82 : 85} width="130" height={phone ? 75 : 145} rx="10" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 95} y={phone ? 103 : 110} text-anchor="middle" class="label">{t('EXAMPLE', '例子')}</text>
      <text x={phone ? 150 : 95} y={phone ? 137 : 153} text-anchor="middle" class="number">{VOXT_DEMO_PCM_VALUE.toLocaleString('en-US')}</text>
      {#if !phone}<text x="95" y="190" text-anchor="middle" class="detail">{t('whole-number form', '整数形式')}</text>{/if}
      <line x1={phone ? 150 : 163} y1={phone ? 161 : 150} x2={phone ? 150 : 220} y2={phone ? 180 : 150} stroke="var(--muted)" stroke-width="2" marker-end="url(#byte-arrow)" />

      <rect x={phone ? 85 : 225} y={phone ? 185 : 85} width="130" height={phone ? 75 : 145} rx="10" fill="var(--bg)" stroke="var(--line)" />
      <text x={phone ? 150 : 290} y={phone ? 206 : 110} text-anchor="middle" class="label">{t('SPLIT BY 256', '按 256 分组')}</text>
      <text x={phone ? 150 : 290} y={phone ? 232 : 148} text-anchor="middle" class="small-formula">{VOXT_DEMO_PCM_VALUE.toLocaleString('en-US')} ÷ {VOXT_BYTE_STATES}</text>
      <text x={phone ? 150 : 290} y={phone ? 250 : 181} text-anchor="middle" class="detail">{t('= 63 remainder 255', '= 63 余 255')}</text>
      <line x1={phone ? 150 : 358} y1={phone ? 264 : 150} x2={phone ? 150 : 420} y2={phone ? 283 : 150} stroke="var(--muted)" stroke-width="2" marker-end="url(#byte-arrow)" />

      <rect x={phone ? 35 : 445} y={phone ? 292 : 85} width={phone ? 95 : 105} height={phone ? 120 : 145} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
      <text x={phone ? 82.5 : 497.5} y={phone ? 314 : 110} text-anchor="middle" class="label">{t('BYTE 1', '第 1 个字节')}</text>
      <text x={phone ? 82.5 : 497.5} y={phone ? 350 : 153} text-anchor="middle" class="number">{VOXT_DEMO_LOW_BYTE}</text>
      <text x={phone ? 82.5 : 497.5} y={phone ? 374 : 184} text-anchor="middle" class="detail">{t('remainder', '余下的数')}</text>
      <text x={phone ? 82.5 : 497.5} y={phone ? 398 : 208} text-anchor="middle" class="order">{t('1st', '先放')}</text>

      <rect x={phone ? 170 : 575} y={phone ? 292 : 85} width={phone ? 95 : 105} height={phone ? 120 : 145} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
      <text x={phone ? 217.5 : 627.5} y={phone ? 314 : 110} text-anchor="middle" class="label">{t('BYTE 2', '第 2 个字节')}</text>
      <text x={phone ? 217.5 : 627.5} y={phone ? 350 : 153} text-anchor="middle" class="number">{VOXT_DEMO_HIGH_BYTE}</text>
      <text x={phone ? 217.5 : 627.5} y={phone ? 374 : 184} text-anchor="middle" class="detail">{t('groups of 256', '有几个 256')}</text>
      <text x={phone ? 217.5 : 627.5} y={phone ? 398 : 208} text-anchor="middle" class="order">{t('2nd', '后放')}</text>

      <text x={W / 2} y={phone ? 438 : 256} text-anchor="middle" class="formula">{VOXT_DEMO_PCM_VALUE.toLocaleString('en-US')} &gt; 255 · {t('one byte cannot hold it', '一个字节装不下')}</text>
      <text x={W / 2} y={phone ? 464 : 281} text-anchor="middle" class="label">{t('BYTE ORDER IN THE FRAME: 255 → 63', '这次测量在帧里的字节顺序：255 → 63')}</text>
      <rect x={W / 2 - 80} y={phone ? 482 : 299} width="12" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={W / 2 - 60} y={phone ? 493 : 310} class="detail">{t('blue = stored bytes', '蓝色 = 存好的字节')}</text>
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
  .formula { font-family: var(--mono); font-size: 12px; font-weight: 650; fill: var(--fg); }
  .frame-title { font-size: 11px; font-weight: 650; fill: var(--fg); }
  .frame-time { font-family: var(--mono); font-size: 9px; fill: var(--fg); }
  .definition { font-size: 13px; font-weight: 600; fill: var(--muted); }
  .small-formula { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  .number { font-family: var(--mono); font-size: 27px; font-weight: 700; fill: var(--fg); }
  .order { font-size: 12px; font-weight: 700; fill: var(--fg); }
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .frame-title, .frame-time, .order, .definition, .footnote { font-size: 11px; }
    .small-formula { font-size: 13px; }
    .number { font-size: 24px; }
  }
</style>
