<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import {
    VOXT_CAPTURE_FRAME_BYTES,
    VOXT_CAPTURE_FRAME_COUNT,
    VOXT_CAPTURE_FRAME_MS,
    VOXT_CAPTURE_FRAME_SAMPLES,
    VOXT_BYTE_STATES,
    VOXT_DEMO_AUDIO_MS,
    VOXT_DEMO_FULL_FRAME_COUNT,
    VOXT_DEMO_HIGH_BYTE,
    VOXT_DEMO_LOW_BYTE,
    VOXT_DEMO_PCM_VALUE,
    VOXT_DEMO_TAIL_BYTES,
    VOXT_DEMO_TAIL_SAMPLES,
    VOXT_DEMO_TOTAL_SAMPLES,
    VOXT_HIGH_PASS_CLEAR_HZ,
    VOXT_HIGH_PASS_HUM_HZ,
    VOXT_HIGH_PASS_HUM_RATIO,
  } from '../../voxt/numbers';

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'Sound arrives continuously. The helper packs each 100 ms into one audio frame.',
    captionZh: '声音连续进来。helper 每攒够 100 ms 就装成一帧。',
  }, {
    caption: 'Each sound measurement is stored in two bytes. The remainder byte goes first.',
    captionZh: '每次声音测量存成 2 个字节。装余数的字节先放。',
  }, {
    caption: 'When sound stops, the remaining 100 samples still form a final frame.',
    captionZh: '声音停了，剩下的 100 个样本也装成最后一帧。',
  }, {
    caption: 'The kept history recording stays unchanged. Processing changes a separate copy for the speech model.',
    captionZh: '保留的历史录音不变。处理只改送给识别模型的副本。',
  }, {
    caption: 'A high-pass filter reduces slow hum in the model copy. The saved recording does not change.',
    captionZh: '高通滤波减弱副本里的低沉嗡声。保存的录音不变。',
  }];
  const ariaLabels = [{
    en: 'The helper cuts one second of continuous sound into ten ordered audio frames, each holding 100 milliseconds',
    zh: 'helper 把一秒连续声音按顺序切成十段音频帧，每段装 100 毫秒',
  }, {
    en: 'One sound measurement in whole-number form, 16383, is split into 63 groups of 256 and remainder 255. Remainder byte 255 is stored first, then group byte 63.',
    zh: '一次声音测量的整数形式 16383 拆成 63 组 256，余下 255。装余数的字节 255 先存，装组数的字节 63 后存。',
  }, {
    en: 'A total of 3300 samples fills two frames of 1600 samples. At stop, the remaining 100 samples form a final partial frame of 200 bytes.',
    zh: '共 3300 个样本，先装满两个各有 1600 个样本的帧。停止时，剩下的 100 个样本也装成最后一帧，占 200 个字节。',
  }, {
    en: 'One recording takes two paths. The kept history preserves the original sound. A separate copy changes during processing for the speech model.',
    zh: '同一段录音走两条路。保留的历史录音原样不动，另一份副本经过处理后送给识别模型。',
  }, {
    en: 'A high-pass filter reduces a slow 50 Hz hum in the model copy while a faster 200 Hz sound stays the same. Hz means vibrations each second.',
    zh: '高通滤波把模型副本里每秒振动 50 次的低沉嗡声减弱，每秒振动 200 次的声音保持不变。',
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
  const H = $derived(step === 0 ? (phone ? 590 : 380) : step === 2 ? (phone ? 450 : 340) : step === 3 ? (phone ? 475 : 370) : step === 4 ? (phone ? 480 : 420) : (phone ? 515 : 330));
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
  const sine = (width: number, base: number, amplitude: number, cycles: number) => Array.from({ length: 161 }, (_, i) => {
    const x = i / 160;
    const y = base + amplitude * Math.sin(x * Math.PI * 2 * cycles);
    return `${i ? 'L' : 'M'}${(x * width).toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const partialLayout = $derived(Array.from({ length: VOXT_DEMO_FULL_FRAME_COUNT + 1 }, (_, i) => {
    const full = i < VOXT_DEMO_FULL_FRAME_COUNT;
    const width = phone ? 220 : 240;
    return {
      full,
      seq: i,
      samples: full ? VOXT_CAPTURE_FRAME_SAMPLES : VOXT_DEMO_TAIL_SAMPLES,
      bytes: full ? VOXT_CAPTURE_FRAME_BYTES : VOXT_DEMO_TAIL_BYTES,
      x: phone ? 25 : 40 + i * 260,
      y: phone ? 95 + i * 80 : 115,
      width: full ? width : width * VOXT_DEMO_TAIL_SAMPLES / VOXT_CAPTURE_FRAME_SAMPLES,
      height: phone ? 60 : 90,
    };
  }));
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={t(ariaLabels[step].en, ariaLabels[step].zh)}>
      <defs>
        <marker id="frame-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--accent)" />
        </marker>
        <marker id="byte-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
        <marker id="original-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--gen)" />
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
      {:else if step === 1}
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
      {:else if step === 2}
      <text x={W / 2} y={phone ? 25 : 30} text-anchor="middle" class="title">{t('STOP KEEPS THE LAST PARTIAL FRAME', '停止时，末尾不足一帧也保留')}</text>
      <text x={W / 2} y={phone ? 48 : 55} text-anchor="middle" class="subtitle">{t(`${VOXT_DEMO_TOTAL_SAMPLES.toLocaleString('en-US')} samples · ${VOXT_CAPTURE_FRAME_SAMPLES.toLocaleString('en-US')} fill one frame`, `共 ${VOXT_DEMO_TOTAL_SAMPLES.toLocaleString('en-US')} 个样本 · 每 ${VOXT_CAPTURE_FRAME_SAMPLES.toLocaleString('en-US')} 个装满一帧`)}</text>
      <text x={W / 2} y={phone ? 76 : 88} text-anchor="middle" class="formula">{VOXT_DEMO_TOTAL_SAMPLES.toLocaleString('en-US')} = {VOXT_CAPTURE_FRAME_SAMPLES.toLocaleString('en-US')} + {VOXT_CAPTURE_FRAME_SAMPLES.toLocaleString('en-US')} + {VOXT_DEMO_TAIL_SAMPLES}</text>
      {#each partialLayout as frame}
        <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} rx="7" fill={frame.full ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={frame.full ? 'var(--accent)' : 'var(--gen)'} stroke-width={frame.full ? 1.5 : 2.5} />
        {#if frame.full}
          <text x={frame.x + frame.width / 2} y={frame.y + (phone ? 19 : 27)} text-anchor="middle" class="label">{t(`FULL FRAME ${frame.seq}`, `完整帧 ${frame.seq}`)}</text>
          <text x={frame.x + frame.width / 2} y={frame.y + (phone ? 39 : 52)} text-anchor="middle" class="detail">{frame.samples.toLocaleString('en-US')} {t('samples', '个样本')}</text>
          <text x={frame.x + frame.width / 2} y={frame.y + (phone ? 54 : 73)} text-anchor="middle" class="detail">{frame.bytes.toLocaleString('en-US')} {t('bytes', '个字节')}</text>
        {:else}
          <text x={frame.x + (phone ? 30 : 27)} y={frame.y + (phone ? 15 : 23)} class="label amber">{t(`FINAL FRAME ${frame.seq}`, `最后一帧 ${frame.seq}`)}</text>
          <text x={frame.x + (phone ? 30 : 27)} y={frame.y + (phone ? 35 : 48)} class="detail">{frame.samples} {t('samples', '个样本')}</text>
          <text x={frame.x + (phone ? 30 : 27)} y={frame.y + (phone ? 52 : 70)} class="detail">{frame.bytes} {t('bytes', '个字节')}</text>
        {/if}
      {/each}
      <text x={W / 2} y={phone ? 346 : 241} text-anchor="middle" class="cut amber">{t('STOP → flush sends the leftover', '停止 → flush 送出剩下的样本')}</text>
      <text x={W / 2} y={phone ? 378 : 272} text-anchor="middle" class="formula">{VOXT_DEMO_TAIL_SAMPLES} {t('samples', '个样本')} × 2 {t('bytes', '个字节')} = {VOXT_DEMO_TAIL_BYTES} {t('bytes', '个字节')}</text>
      <rect x={phone ? 36 : 191} y={phone ? 403 : 296} width="12" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x={phone ? 56 : 211} y={phone ? 414 : 307} class="detail">{t('full frames', '完整帧')}</text>
      <rect x={phone ? 165 : 414} y={phone ? 403 : 296} width="12" height="12" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
      <text x={phone ? 185 : 434} y={phone ? 414 : 307} class="detail">{t('final partial frame', '末尾不足帧')}</text>
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Public test example; the last frame is shorter, not padded.', '公开测试示例；最后一帧更短，不补齐。')}</text>
      {:else if step === 3}
      <text x={W / 2} y={phone ? 25 : 30} text-anchor="middle" class="title">{t('ONE RECORDING, TWO COPIES', '同一段录音，分成两份')}</text>
      <text x={W / 2} y={phone ? 49 : 55} text-anchor="middle" class="subtitle">{t('copy = the same sound in separate storage', '副本 = 同一段声音，另存一份')}</text>
      <rect x={phone ? 45 : 250} y={phone ? 70 : 80} width={phone ? 210 : 220} height={phone ? 60 : 70} rx="10" fill="var(--bg)" stroke="var(--line)" />
      <text x={W / 2} y={phone ? 96 : 108} text-anchor="middle" class="label">{t('AUDIO FRAMES FROM HELPER', 'helper 送来的音频帧')}</text>
      <text x={W / 2} y={phone ? 117 : 131} text-anchor="middle" class="detail">{t('one recording', '同一段录音')}</text>
      <line x1={phone ? 105 : 310} y1={phone ? 132 : 151} x2={phone ? 80 : 180} y2={phone ? 177 : 184} stroke="var(--gen)" stroke-width="2" marker-end="url(#original-arrow)" />
      <line x1={phone ? 195 : 410} y1={phone ? 132 : 151} x2={phone ? 220 : 540} y2={phone ? 177 : 184} stroke="var(--accent)" stroke-width="2" marker-end="url(#frame-arrow)" />
      <rect x={phone ? 15 : 40} y={phone ? 190 : 195} width={phone ? 130 : 290} height={phone ? 190 : 105} rx="10" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
      <text x={phone ? 80 : 185} y={phone ? 219 : 224} text-anchor="middle" class="label amber">{t('KEPT HISTORY', '保留的历史录音')}</text>
      <text x={phone ? 80 : 185} y={phone ? 246 : 252} text-anchor="middle" class="detail">{t('ORIGINAL SOUND', '原来的声音')}</text>
      <text x={phone ? 80 : 185} y={phone ? 270 : 275} text-anchor="middle" class="detail">{t('unchanged', '保持原样')}</text>
      <rect x={phone ? 155 : 390} y={phone ? 190 : 195} width={phone ? 130 : 290} height={phone ? 190 : 105} rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2" />
      <text x={phone ? 220 : 535} y={phone ? 219 : 224} text-anchor="middle" class="label">{t('MODEL COPY', '识别模型副本')}</text>
      <text x={phone ? 220 : 535} y={phone ? 246 : 252} text-anchor="middle" class="detail">{t('COPIED SOUND', '复制出的声音')}</text>
      <text x={phone ? 220 : 535} y={phone ? 270 : 275} text-anchor="middle" class="detail">{t('processing changes it', '处理只改这份')}</text>
      {#if phone}
        <text x="80" y="311" text-anchor="middle" class="detail">{t('same bytes', '同样的字节')}</text>
        <text x="80" y="345" text-anchor="middle" class="detail">{t('as received', '按收到的保存')}</text>
        <text x="220" y="311" text-anchor="middle" class="detail">{t('same sound', '同样的声音')}</text>
        <text x="220" y="337" text-anchor="middle" class="detail">{t('new storage', '另存一份')}</text>
        <text x="220" y="356" text-anchor="middle" class="detail">{t('for the model', '送给模型')}</text>
      {:else}
        <text x="185" y="294" text-anchor="middle" class="detail">{t('same bytes as received', '按收到的字节保存')}</text>
        <text x="535" y="294" text-anchor="middle" class="detail">{t('same sound, new storage', '同样的声音，另存一份')}</text>
      {/if}
      <text x={W / 2} y={phone ? 414 : 328} text-anchor="middle" class="formula">{t('ORIGINAL STAYS · COPY CHANGES', '原件不动 · 副本处理')}</text>
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Processing is on here; keeping audio is a separate setting.', '图中开启处理；是否保存录音由另一项设置决定。')}</text>
      {:else}
      <text x={W / 2} y={phone ? 25 : 30} text-anchor="middle" class="title">{t('HIGH-PASS REDUCES LOW HUM', '高通滤波减弱低沉嗡声')}</text>
      <text x={W / 2} y={phone ? 47 : 53} text-anchor="middle" class="subtitle">{t('high-pass = reduces slow vibrations', '高通 = 减弱振动慢的声音')}</text>
      <text x={W / 2} y={phone ? 68 : 75} text-anchor="middle" class="definition">{t('Hz = vibrations each second', 'Hz = 每秒振动多少次')}</text>
      <text x={W / 2} y={phone ? 96 : 103} text-anchor="middle" class="label">{VOXT_HIGH_PASS_HUM_HZ} Hz {t('hum', '低沉嗡声')}</text>
      <text x={phone ? 75 : 190} y={phone ? 119 : 126} text-anchor="middle" class="detail">{t('BEFORE', '处理前')}</text>
      <text x={phone ? 225 : 530} y={phone ? 119 : 126} text-anchor="middle" class="detail">{t('AFTER', '处理后')}</text>
      <line x1={phone ? 20 : 80} y1={phone ? 161 : 168} x2={phone ? 130 : 300} y2={phone ? 161 : 168} stroke="var(--line)" />
      <line x1={phone ? 170 : 420} y1={phone ? 161 : 168} x2={phone ? 280 : 640} y2={phone ? 161 : 168} stroke="var(--line)" />
      <g transform={`translate(${phone ? 20 : 80} 0)`}><path d={sine(phone ? 110 : 220, phone ? 161 : 168, 34, 3)} fill="none" stroke="var(--accent)" stroke-width="2.5" /></g>
      <g transform={`translate(${phone ? 170 : 420} 0)`}><path d={sine(phone ? 110 : 220, phone ? 161 : 168, 34 * VOXT_HIGH_PASS_HUM_RATIO, 3)} fill="none" stroke="var(--accent)" stroke-width="2.5" /></g>
      <line x1={phone ? 137 : 330} y1={phone ? 161 : 168} x2={phone ? 158 : 390} y2={phone ? 161 : 168} stroke="var(--muted)" stroke-width="2" marker-end="url(#byte-arrow)" />
      <text x={phone ? 225 : 530} y={phone ? 211 : 218} text-anchor="middle" class="cut">{t('hum becomes smaller', '嗡声变小')}</text>
      <text x={W / 2} y={phone ? 280 : 263} text-anchor="middle" class="label">{VOXT_HIGH_PASS_CLEAR_HZ} Hz {t('sound', '声音')}</text>
      <text x={phone ? 75 : 190} y={phone ? 303 : 286} text-anchor="middle" class="detail">{t('BEFORE', '处理前')}</text>
      <text x={phone ? 225 : 530} y={phone ? 303 : 286} text-anchor="middle" class="detail">{t('AFTER', '处理后')}</text>
      <line x1={phone ? 20 : 80} y1={phone ? 355 : 328} x2={phone ? 130 : 300} y2={phone ? 355 : 328} stroke="var(--line)" />
      <line x1={phone ? 170 : 420} y1={phone ? 355 : 328} x2={phone ? 280 : 640} y2={phone ? 355 : 328} stroke="var(--line)" />
      <g transform={`translate(${phone ? 20 : 80} 0)`}><path d={sine(phone ? 110 : 220, phone ? 355 : 328, 25, 10)} fill="none" stroke="var(--accent)" stroke-width="2.5" /></g>
      <g transform={`translate(${phone ? 170 : 420} 0)`}><path d={sine(phone ? 110 : 220, phone ? 355 : 328, 25, 10)} fill="none" stroke="var(--accent)" stroke-width="2.5" /></g>
      <line x1={phone ? 137 : 330} y1={phone ? 355 : 328} x2={phone ? 158 : 390} y2={phone ? 355 : 328} stroke="var(--muted)" stroke-width="2" marker-end="url(#byte-arrow)" />
      <text x={phone ? 225 : 530} y={phone ? 410 : 378} text-anchor="middle" class="cut">{t('same sound', '声音不变')}</text>
      <text x={W / 2} y={H - 14} text-anchor="middle" class="footnote">{t('Public response; both sides share one scale.', '按公开响应绘制；处理前后同一尺度。')}</text>
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
  .amber { fill: var(--gen); }
  .footnote { font-size: 10.5px; }
  @media (max-width: 600px) {
    .title { font-size: 13px; }
    .subtitle, .label, .detail, .cut, .formula, .frame-title, .frame-time, .order, .definition, .footnote { font-size: 11px; }
    .small-formula { font-size: 13px; }
    .number { font-size: 24px; }
  }
</style>
