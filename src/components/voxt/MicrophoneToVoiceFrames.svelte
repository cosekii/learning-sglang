<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import { VOXT_CAPTURE_FRAME_COUNT, VOXT_CAPTURE_FRAME_MS, VOXT_DEMO_AUDIO_MS } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Sound arrives continuously. The helper packs each 100 ms into one audio frame.',
    captionZh: '声音连续进来。helper 每攒够 100 ms 就装成一帧。',
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
  const W = $derived(phone ? 300 : 720), H = $derived(phone ? 590 : 380);
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
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t('The helper cuts one second of continuous sound into ten ordered audio frames, each holding 100 milliseconds', 'helper 把一秒连续声音按顺序切成十段音频帧，每段装 100 毫秒')}>
      <defs>
        <marker id="frame-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
      </defs>
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
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .frame-title, .frame-time, .footnote { font-size: 11px; }
  }
</style>
