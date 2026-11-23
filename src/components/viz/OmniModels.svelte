<script lang="ts">
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { SPEECH_IN_HZ, SPEECH_OUT_HZ, VISION_PATCH, VISION_MERGE, AUDIO_FRAMES_PER_SEC, AUDIO_POS_PER_100, CODES_PER_FRAME, CODE_VALUES, SAMPLES_PER_FRAME } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  // ---- The request every Omni chapter follows: a photo and a spoken question in, a spoken answer out ----------
  const PHOTO = 896;                                 // pixels a side
  const PHOTO_VALUES = PHOTO * PHOTO * 3;            // red, green, blue per pixel
  const Q_SEC = 10, A_SEC = 20;                      // the spoken question and the spoken answer
  const Q_VALUES = Q_SEC * SPEECH_IN_HZ;
  const A_VALUES = A_SEC * SPEECH_OUT_HZ;
  const fmt = (n: number) => n.toLocaleString('en-US');
  const PX_POS = VISION_PATCH * VISION_MERGE;        // 32 pixels a side per prompt position
  const IMG_POS = (PHOTO / PX_POS) ** 2;             // 784
  const AUD_POS = (Q_SEC * AUDIO_FRAMES_PER_SEC / 100) * AUDIO_POS_PER_100;   // 130
  const FRAME_MS = (SAMPLES_PER_FRAME / SPEECH_OUT_HZ) * 1000;                 // 80
  const FRAMES = (A_SEC * 1000) / FRAME_MS;                                    // 250 in the answer
  const CHUNK = 10;                                  // frames code2wav turns into sound per pass (SGLang-Omni's default)

  type Scene = 'request' | 'encoders' | 'speech' | 'map' | 'waits';
  const steps: { scene: Scene; caption: string; captionZh: string }[] = [
    { scene: 'request', caption: `Text gets a tokenizer in front of the engine and a detokenizer after it (Ch. 1 Steps 2 and 11). An omni request needs a converter on each side too: a photo and a spoken question in, a spoken answer out.`, captionZh: `文本在 engine 前有 tokenizer，后有 detokenizer（Ch. 1 Steps 2 and 11）。omni request 两侧也各需一个转换器：输入照片和语音问题，输出语音回答。` },
    { scene: 'encoders', caption: `The left box is an encoder per input: a vision model turns the photo into ${fmt(IMG_POS)} prompt positions, an audio model turns the question into ${AUD_POS}. They join the prompt, and the engine prefills it as before.`, captionZh: `左边的框是每个输入一个 encoder：视觉模型把照片变成 ${fmt(IMG_POS)} 个 prompt 位置，音频模型把问题变成 ${AUD_POS} 个。它们并入 prompt，engine 照旧 prefill。` },
    { scene: 'speech', caption: `Each token also goes to three more models. The talker writes a frame's code 0, the code predictor its codes 1–${CODES_PER_FRAME - 1}, then the next frame; every ${CHUNK} frames, code2wav turns them into sound.`, captionZh: `每个 token 还会送到另外三个模型。talker 写一帧的 code 0，code predictor 写 codes 1–${CODES_PER_FRAME - 1}，然后下一帧；每 ${CHUNK} 帧，code2wav 把它们变成声音。` },
    { scene: 'map', caption: `The whole request is six models of two kinds. Three read their input and are done; three are loops like the one in Ch. 1 Step 11, where each step waits for the one before it.`, captionZh: `整个 request 是六个模型，分两类。三个读完输入就结束；三个是循环，像 Ch. 1 Step 11 那样，每一步都等前一步。` },
    { scene: 'waits', caption: `The talker waits for each token the engine writes, a check SGLang never makes. And SGLang runs one loop per process. Where does the talker's loop run, and how does each token reach it?`, captionZh: `talker 要等 engine 写出的每个 token，这是 SGLang 从不做的检查。SGLang 每个进程只跑一个循环。talker 的循环在哪里跑，每个 token 又怎么送到它那里？` },
  ];


  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  // step 3's loop: frame by frame, code 0 from the talker, then codes 1–15 from the code predictor;
  // after the 10th frame code2wav turns the chunk into sound
  let lap = $state(0), lapMs = $state(0);           // the looping step's laps, for LoopProgress
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });   // untracked, so starting a lap does not re-run the effect
  let written = $state(0);                        // codes written so far, frame by frame
  let writer = $state<'' | 'talker' | 'predictor'>('');
  let c2w = $state(0);                            // 0 waiting, 1 running, 2 sound out
  $effect(() => {
    if (cur.scene !== 'speech') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      written = 0; writer = ''; c2w = 0;
      let ms = 0;
      const at = (dt: number, f: () => void) => { ms += dt; timers.push(setTimeout(f, ms)); };
      at(900, () => (writer = 'talker'));
      for (let f = 0; f < CHUNK; f++) {
        const [t0, tc] = f === 0 ? [900, 140] : [160, 22];
        at(t0, () => { written++; writer = 'predictor'; });
        for (let c = 1; c < CODES_PER_FRAME; c++) at(tc, () => { written++; if (c === CODES_PER_FRAME - 1) writer = f < CHUNK - 1 ? 'talker' : ''; });
      }
      at(300, () => (c2w = 1));
      at(1200, () => (c2w = 2));
      at(3000, run);
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  // step 5's loop: the two requests' iterations appear one at a time, then hold and start again
  const ITERS = 16;
  let iter = $state(ITERS - 1);
  $effect(() => {
    if (cur.scene !== 'waits') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      iter = -1;
      for (let i = 0; i < ITERS; i++) timers.push(setTimeout(() => (iter = i), 700 + i * 450));
      timers.push(setTimeout(run, 700 + ITERS * 450 + 2600));
      nextLap(700 + ITERS * 450 + 2600);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const W = 720, H = 400;
  const RED = 'var(--eos)';

  // a speech-like waveform: bursts of oscillation, deterministic so the server and the browser draw the same thing
  const wave = (x0: number, x1: number, cy: number, amp: number, seed: number) => {
    let d = '';
    for (let x = x0; x <= x1; x += 1.5) {
      const u = (x - x0) / 6;
      const env = 0.15 + 0.85 * Math.abs(Math.sin(u * 0.21 + seed)) * (0.6 + 0.4 * Math.sin(u * 0.047 + seed * 2));
      const y = cy + amp * env * Math.sin(u * 2.3 + seed) * Math.cos(u * 0.9 + seed * 3);
      d += `${d ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return d;
  };
  // the photo as a 6 × 6 mosaic: sky, a sun, hills
  const tile = (r: number, c: number) =>
    r === 1 && c === 4 ? ['var(--gen)', 0.95] : r < 3 ? ['var(--accent)', 0.25 + 0.08 * r] : ['#16a34a', r + c > 7 ? 0.75 : 0.5];
  const pill = (s: string) => 10 + s.length * 6;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Omni models, step {step + 1}">
      <defs>
        <marker id="om-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
        </marker>
        <marker id="om-arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--eos)" />
        </marker>
      </defs>

      <!-- 1: the request, next to the text request chapters 1–15 served: the same engine, a converter needed on each side -->
      {#if cur.scene === 'request'}
        {@const TK = 238}
        {@const TKW = 68}
        {@const EX = 358}
        {@const EW = 100}
        {@const DT = 510}
        {@const DTW = 78}
        {@const OUT = 606}
        {@const CX = EX + EW / 2}
        {@const YA = 110}
        {@const YB = 270}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('one omni request, next to the text request chapters 1–15 served', '一个 omni request，旁边是第 1–15 章处理的文本 request')}</text>
          <text x="30" y="80" class="boxtitle">{t('text · chapters 1–15', '文本 · 第 1–15 章')}</text>
          <text x="30" y="222" class="boxtitle">{t('omni · this part', 'omni · 本部分')}</text>

          <!-- the engine, one for both -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            <rect x={EX} y="92" width={EW} height="206" rx="12" fill="#fbfaf7" stroke="var(--fg)" />
            <text x={CX} y="180" text-anchor="middle" class="slab strong small">{t('the engine', 'engine')}</text>
            <text x={CX} y="196" text-anchor="middle" class="tag">{t('one model', '一个模型')}</text>
            <text x={CX} y="210" text-anchor="middle" class="tag">{t('one loop', '一个循环')}</text>
          </g>

          <!-- text: a converter on each side -->
          <g in:fade={{ delay: 400, duration: 250 }}>
            <rect x="24" y={YA - 13} width="166" height="26" rx="6" fill="white" stroke="var(--line)" />
            <text x="107" y={YA + 4} text-anchor="middle" class="mono">The capital of France is</text>
            <path d="M 194 {YA} H {TK - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <rect x={TK} y={YA - 16} width={TKW} height="32" rx="8" fill="white" stroke="var(--accent)" />
            <text x={TK + TKW / 2} y={YA + 4} text-anchor="middle" class="tag strong">tokenizer</text>
            <path d="M {TK + TKW + 4} {YA} H {EX - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={(TK + TKW + EX) / 2} y={YA - 8} text-anchor="middle" class="tag">{t('token ids', 'token id')}</text>
            <path d="M {EX + EW + 4} {YA} H {DT - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={(EX + EW + DT) / 2} y={YA - 8} text-anchor="middle" class="tag">{t('token ids', 'token id')}</text>
            <rect x={DT} y={YA - 16} width={DTW} height="32" rx="8" fill="white" stroke="var(--accent)" />
            <text x={DT + DTW / 2} y={YA + 4} text-anchor="middle" class="tag strong">detokenizer</text>
            <path d="M {DT + DTW + 4} {YA} H {OUT - 6}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={OUT} y={YA + 4} class="mono">Paris</text>
            <text x={TK + TKW / 2} y={YA + 32} text-anchor="middle" class="tag">Ch. 1 Step 2</text>
            <text x={DT + DTW / 2} y={YA + 32} text-anchor="middle" class="tag">Ch. 1 Step 11</text>
          </g>

          <!-- omni: the same engine, and a box on each side still to be filled -->
          <g in:fade={{ delay: 800, duration: 250 }}>
            {#each Array(6) as _, r}{#each Array(6) as _, c}
              {@const [fill, op] = tile(r, c)}
              <rect x={30 + c * 8} y={232 + r * 8} width="7" height="7" fill={fill} opacity={op} />
            {/each}{/each}
            <text x="88" y="244" class="slab strong small">{t('a photo', '一张照片')}</text>
            <text x="88" y="258" class="tag">{t(`${PHOTO} × ${PHOTO} × 3 colours`, `${PHOTO} × ${PHOTO} × 3 种颜色`)}</text>
            <text x="88" y="272" class="tag strong">{t(`= ${fmt(PHOTO_VALUES)} values`, `= ${fmt(PHOTO_VALUES)} 个数值`)}</text>
            <path d={wave(30, 150, 300, 9, 1.3)} fill="none" stroke="var(--fg)" stroke-width="1.2" opacity="0.8" />
            <text x="30" y="324" class="slab strong small">{t('a spoken question', '一个语音问题')}</text>
            <text x="30" y="338" class="tag">{Q_SEC} s × {fmt(SPEECH_IN_HZ)} = <tspan class="strong">{t(`${fmt(Q_VALUES)} samples`, `${fmt(Q_VALUES)} 个采样`)}</tspan></text>

            <path d="M 200 264 C 216 264, 218 {YB - 8}, {TK - 4} {YB - 8}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <path d="M 156 300 C 200 300, 204 {YB + 8}, {TK - 4} {YB + 8}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            {#each [TK, DT] as bx, i}
              {@const bw = i ? DTW : TKW}
              <rect x={bx} y={YB - 20} width={bw} height="40" rx="8" fill="white" stroke="var(--faint)" stroke-width="1.5" stroke-dasharray="4 3" />
              <text x={bx + bw / 2} y={YB + 6} text-anchor="middle" class="slab strong" style:fill="var(--muted)">?</text>
            {/each}
            <path d="M {TK + TKW + 4} {YB} H {EX - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <path d="M {EX + EW + 4} {YB} H {DT - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <path d="M {DT + DTW + 4} {YB} H {OUT - 6}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <path d={wave(OUT, 690, YB, 9, 4.1)} fill="none" stroke="var(--fg)" stroke-width="1.2" opacity="0.8" />
            <text x="690" y={YB + 36} text-anchor="end" class="slab strong small">{t('a spoken answer', '一个语音回答')}</text>
            <text x="690" y={YB + 50} text-anchor="end" class="tag">{A_SEC} s × {fmt(SPEECH_OUT_HZ)} = <tspan class="strong">{t(`${fmt(A_VALUES)} samples`, `${fmt(A_VALUES)} 个采样`)}</tspan></text>
          </g>

          <text x="16" y="368" class="legend" in:fade={{ delay: 1300 }}>{t('text has a converter on each side of the engine; the omni request needs one on each side too, marked ?', '文本在 engine 两侧各有一个转换器；omni request 两侧也各需一个，标为 ?')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`a sample is one reading of the sound wave's height · rates as SGLang-Omni serves Qwen3-Omni: ${fmt(SPEECH_IN_HZ)} a second in, ${fmt(SPEECH_OUT_HZ)} out`, `一个采样是声波高度的一次读数 · 采样率按 SGLang-Omni 运行 Qwen3-Omni 的配置：输入每秒 ${fmt(SPEECH_IN_HZ)} 个，输出 ${fmt(SPEECH_OUT_HZ)} 个`)}</text>
        </g>
      {/if}

      <!-- 2: the left ? opened up · an encoder per input turns it into prompt positions -->
      {#if cur.scene === 'encoders'}
        {@const PS = 3}
        {@const SIDE = PHOTO / PX_POS}
        {@const EB = 352}
        {@const EBW = 100}
        {@const S = 150 / IMG_POS}
        {@const IX = 506}
        {@const AX = IX + IMG_POS * S + 2}
        {@const HR = 4}
        {@const HC = 24}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('the left ? of step 1, opened up · each input has its own encoder, a model that runs on the GPU', '第 1 步左边的 ?，打开来看 · 每个输入各有一个 encoder，是在 GPU 上运行的模型')}</text>

          <!-- the photo: one prompt position per 32 × 32 pixels -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            {#each Array(SIDE) as _, r}{#each Array(SIDE) as _, c}
              {@const [fill, op] = tile(Math.floor((r * 6) / SIDE), Math.floor((c * 6) / SIDE))}
              <rect x={30 + c * PS} y={66 + r * PS} width={PS - 0.4} height={PS - 0.4} fill={fill} opacity={op} />
            {/each}{/each}
            <rect x={30 + HC * PS - 0.5} y={66 + HR * PS - 0.5} width={PS + 0.6} height={PS + 0.6} fill="none" stroke="var(--fg)" stroke-width="1" />
            <path d="M {30 + HC * PS + PS + 1} {66 + HR * PS + 1} L 128 76" fill="none" stroke="var(--fg)" stroke-width="0.8" />
            {#each [[0, 0], [0, 1], [1, 0], [1, 1]] as [r, c]}
              <rect x={128 + c * 18} y={76 + r * 18} width="17" height="17" fill="var(--accent)" opacity="0.3" stroke="var(--fg)" stroke-width="0.8" />
            {/each}
            <text x="172" y="84" class="tag strong">{t('one position', '一个位置')}</text>
            <text x="172" y="98" class="tag">{t(`= ${PX_POS} × ${PX_POS} pixels`, `= ${PX_POS} × ${PX_POS} 像素`)}</text>
            <text x="172" y="112" class="tag">{t(`= ${VISION_MERGE} × ${VISION_MERGE} patches of ${VISION_PATCH}`, `= ${VISION_MERGE} × ${VISION_MERGE} 个 ${VISION_PATCH} 像素的 patch`)}</text>
            <text x="30" y="168" class="tag">{t(`${PHOTO} ÷ ${PX_POS} = ${SIDE} positions a side`, `${PHOTO} ÷ ${PX_POS} = 每边 ${SIDE} 个位置`)}</text>
            <text x="30" y="182" class="tag strong">{t(`${SIDE} × ${SIDE} = ${fmt(IMG_POS)} positions`, `${SIDE} × ${SIDE} = ${fmt(IMG_POS)} 个位置`)}</text>
          </g>

          <!-- the voice: 13 prompt positions per second -->
          <g in:fade={{ delay: 400, duration: 250 }}>
            <path d={wave(30, 230, 214, 10, 1.3)} fill="none" stroke="var(--fg)" stroke-width="1.2" opacity="0.8" />
            {#each Array(Q_SEC + 1) as _, i}
              <line x1={30 + i * 20} y1="228" x2={30 + i * 20} y2="233" stroke="var(--faint)" />
            {/each}
            <text x="30" y="250" class="tag">{t(`${Q_SEC} s × ${AUDIO_FRAMES_PER_SEC} feature frames a second`, `${Q_SEC} s × 每秒 ${AUDIO_FRAMES_PER_SEC} 个特征帧`)}</text>
            <text x="30" y="264" class="tag strong">{t(`${AUDIO_POS_PER_100} positions per 100 frames: ${Q_SEC} × ${AUDIO_POS_PER_100} = ${AUD_POS}`, `每 100 帧 ${AUDIO_POS_PER_100} 个位置：${Q_SEC} × ${AUDIO_POS_PER_100} = ${AUD_POS}`)}</text>
          </g>

          <!-- the two encoders -->
          <g in:fade={{ delay: 700, duration: 250 }}>
            {#each [{ y: 92, n: 'vision encoder', nz: '视觉 encoder', from: 290, fy: 106, to: IX - 4, ty: 113 }, { y: 196, n: 'audio encoder', nz: '音频 encoder', from: 240, fy: 214, to: AX - 4, ty: 217 }] as e}
              <path d="M {e.from} {e.fy} H {EB - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
              <rect x={EB} y={e.y} width={EBW} height="36" rx="8" fill="white" stroke="var(--accent)" />
              <text x={EB + EBW / 2} y={e.y + 22} text-anchor="middle" class="tag strong">{t(e.n, e.nz)}</text>
              <text x={EB + EBW / 2} y={e.y + 50} text-anchor="middle" class="tag">{t('a model, on the GPU', '一个模型，在 GPU 上')}</text>
              <path d="M {EB + EBW + 4} {e.ty} H {e.to}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            {/each}
          </g>

          <!-- what they hand over, and where it goes: the prompt, at one scale -->
          <g in:fade={{ delay: 1000, duration: 250 }}>
            <text x={IX} y="100" class="tag strong">{t(`${fmt(IMG_POS)} embeddings`, `${fmt(IMG_POS)} 个 embedding`)}</text>
            {#each Array(SIDE) as _, i}
              <rect x={IX + (i * IMG_POS * S) / SIDE} y="106" width={(IMG_POS * S) / SIDE - 1} height="14" fill="var(--accent)" opacity="0.7" />
            {/each}
            <text x="690" y="204" text-anchor="end" class="tag strong">{t(`${AUD_POS} embeddings`, `${AUD_POS} 个 embedding`)}</text>
            <rect x={AX} y="210" width={AUD_POS * S} height="14" fill="var(--gen)" opacity="0.8" />
          </g>
          <g in:fade={{ delay: 1300, duration: 250 }}>
            {#each Array(6) as _, i}<rect x={480 + i * 4} y="272" width="3" height="14" fill="#d9d5cb" />{/each}
            <rect x={IX} y="272" width={IMG_POS * S} height="14" fill="var(--accent)" opacity="0.7" />
            <rect x={AX} y="272" width={AUD_POS * S} height="14" fill="var(--gen)" opacity="0.8" />
            <text x="480" y="302" class="tag strong">{t(`the prompt: template tokens + ${fmt(IMG_POS)} + ${AUD_POS}`, `prompt：模板 token + ${fmt(IMG_POS)} + ${AUD_POS}`)}</text>
            <text x="480" y="316" class="tag">{t('prefilled in one pass, as in Ch. 4 Step 3', '一遍 prefill，如 Ch. 4 Step 3')}</text>
          </g>

          <g in:fade={{ delay: 1700 }}>
            <text x="18" y="346" class="pt">·</text><text x="28" y="346" class="legend">{t('a tokenizer looks each id up in a table; an encoder is a model that runs on the GPU and hands over embeddings', 'tokenizer 在表里查每个 id；encoder 是在 GPU 上运行的模型，交出 embedding')}</text>
            <text x="18" y="364" class="pt">·</text><text x="28" y="364" class="legend">{t('SGLang does this today: the encoders run inside the prefill step, and a photo seen before is found by its hash', 'SGLang 现在就这样做：encoder 在 prefill 步内运行，见过的照片按 hash 找到')}</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`Qwen3-Omni: ${VISION_PATCH}-pixel patches, merged ${VISION_MERGE} × ${VISION_MERGE} · audio: ${AUDIO_FRAMES_PER_SEC} feature frames a second, ${AUDIO_POS_PER_100} positions per 100`, `Qwen3-Omni：${VISION_PATCH} 像素的 patch，按 ${VISION_MERGE} × ${VISION_MERGE} 合并 · 音频：每秒 ${AUDIO_FRAMES_PER_SEC} 个特征帧，每 100 帧 ${AUDIO_POS_PER_100} 个位置`)}</text>
        </g>
      {/if}
      <!-- 3: the right ? opened up · each token goes to the detokenizer and to three more models, which write codes frame by frame -->
      {#if cur.scene === 'speech'}
        {@const NF = CHUNK}
        {@const GX = 312}
        {@const GY = 140}
        {@const CW = 16}
        {@const RH = 7}
        {@const R1 = GY + 11}
        {@const GB = R1 + (CODES_PER_FRAME - 1) * RH}
        {@const BX = 160}
        {@const BW = 88}
        {@const RX = 556}
        {@const SB = 136}
        {@const CY = GB + 20}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('the right ? of step 1, opened up · each token the engine picks now goes two ways', '第 1 步右边的 ?，打开来看 · engine 选出的每个 token 现在走两条路')}</text>

          <!-- the engine; each token goes to the detokenizer and to the talker, down arrows of one length -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            <rect x="16" y="55" width="72" height="189" rx="10" fill="#fbfaf7" stroke="var(--fg)" />
            <text x="52" y="170" text-anchor="middle" class="slab strong small">{t('the engine', 'engine')}</text>
            <text x="52" y="186" text-anchor="middle" class="tag">{t('one model', '一个模型')}</text>
            <text x="52" y="200" text-anchor="middle" class="tag">{t('one loop', '一个循环')}</text>
            {#each [72, 144] as y}
              <path d="M 92 {y} H {BX - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
              <text x="112" y={y - 7} text-anchor="middle" class="tag">tokens</text>
            {/each}
            <rect x={BX} y="55" width="112" height="34" rx="8" fill="white" stroke="var(--accent)" />
            <text x={BX + 56} y="69" text-anchor="middle" class="tag strong">detokenizer</text>
            <text x={BX + 56} y="82" text-anchor="middle" class="tag">{t('a table, on the CPU', '一张表，在 CPU 上')}</text>
            <path d="M {BX + 116} 72 H {BX + 140}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={BX + 146} y="76" class="tag">{t('the answer as text, as in chapters 1–15', '文本形式的回答，如第 1–15 章')}</text>

            <rect x={SB} y="100" width={704 - SB} height="256" rx="10" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
            <text x={SB + 12} y="115" class="tag strong">{t('speech · beside the detokenizer, three more models, on the GPU', '语音 · detokenizer 旁边还有三个模型，在 GPU 上')}</text>
          </g>

          <!-- the two models that write codes: each box lights while it is the one writing -->
          <g in:fade={{ delay: 300, duration: 250 }}>
            <rect x={BX} y="122" width={BW} height="44" rx="8" fill={writer === 'talker' ? 'var(--accent-soft)' : 'white'} stroke="var(--accent)" stroke-width={writer === 'talker' ? 2 : 1} />
            <text x={BX + BW / 2} y="136" text-anchor="middle" class="tag strong">talker</text>
            <text x={BX + BW / 2} y="149" text-anchor="middle" class="tag">{t('a model', '一个模型')}</text>
            <text x={BX + BW / 2} y="161" text-anchor="middle" class="tag">{t('1 step a frame', '每帧 1 步')}</text>
            <path d="M {BX + BW + 4} {GY + 3} H {GX - 4}" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={(BX + BW + GX) / 2} y={GY - 4} text-anchor="middle" class="tag">code 0</text>
            <path d="M {BX + BW / 2} 170 V 184" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <rect x={BX} y="188" width={BW} height="44" rx="8" fill={writer === 'predictor' ? 'var(--gen-soft)' : 'white'} stroke="var(--gen)" stroke-width={writer === 'predictor' ? 2 : 1} />
            <text x={BX + BW / 2} y="202" text-anchor="middle" class="tag strong">code predictor</text>
            <text x={BX + BW / 2} y="215" text-anchor="middle" class="tag">{t('a model', '一个模型')}</text>
            <text x={BX + BW / 2} y="227" text-anchor="middle" class="tag">{t(`${CODES_PER_FRAME - 1} steps a frame`, `每帧 ${CODES_PER_FRAME - 1} 步`)}</text>
            <path d="M {BX + BW + 4} 206 H {GX - 4}" fill="none" stroke="var(--gen)" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={(BX + BW + GX) / 2} y="199" text-anchor="middle" class="tag">codes 1–{CODES_PER_FRAME - 1}</text>
          </g>

          <!-- the codes, a column per frame, filled in the order they are written; the next one outlined -->
          <g in:fade={{ delay: 500, duration: 250 }}>
            <text x={GX} y={GY - 10} class="tag">{t(`frames →, ${fmt(SAMPLES_PER_FRAME)} samples ÷ ${fmt(SPEECH_OUT_HZ)} = ${FRAME_MS} ms each`, `帧 →，${fmt(SAMPLES_PER_FRAME)} 个采样 ÷ ${fmt(SPEECH_OUT_HZ)} = 每帧 ${FRAME_MS} ms`)}</text>
            {#each Array(NF) as _, c}
              {#each Array(CODES_PER_FRAME) as _, r}
                {@const i = c * CODES_PER_FRAME + r}
                {@const y = r ? R1 + (r - 1) * RH : GY}
                <rect x={GX + c * CW} y={y} width={CW - 2} height={RH - 1}
                  fill={i < written ? (r ? 'var(--gen)' : 'var(--accent)') : 'none'}
                  opacity={i < written ? (r ? 0.3 + 0.3 * Math.abs(Math.sin(c * 2.3 + r * 1.1)) : 0.6 + 0.25 * Math.abs(Math.sin(c * 1.7))) : 1}
                  stroke={i < written ? 'none' : 'var(--line)'} stroke-width="0.8" />
              {/each}
            {/each}
            {#if writer}
              {@const c = Math.floor(written / CODES_PER_FRAME)}
              {@const r = written % CODES_PER_FRAME}
              <rect x={GX + c * CW - 1} y={(r ? R1 + (r - 1) * RH : GY) - 1} width={CW} height={RH + 1} fill="none" stroke="var(--fg)" stroke-width="1.2" />
            {/if}
            <path d="M {GX + NF * CW + 2} {GY} h 4 V {GB - 1} h -4" fill="none" stroke="var(--faint)" />
            <text x={GX + NF * CW + 12} y={(GY + GB) / 2 - 2} class="tag strong">{t(`${CODES_PER_FRAME} codes`, `${CODES_PER_FRAME} 个 code`)}</text>
            <text x={GX + NF * CW + 12} y={(GY + GB) / 2 + 12} class="tag">{t('a frame', '一帧')}</text>
          </g>

          <!-- code2wav: one pass over each 10 frames, running while the talker writes the next frame -->
          <g in:fade={{ delay: 700, duration: 250 }}>
            <path d="M {GX + (CHUNK * CW) / 2} {GB + 4} V {CY - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <rect x={GX} y={CY} width={CHUNK * CW - 2} height="24" rx="6" fill={c2w === 1 ? 'var(--panel)' : 'white'} stroke="var(--fg)" stroke-width={c2w === 1 ? 2 : 1} />
            <text x={GX + (CHUNK * CW) / 2} y={CY + 16} text-anchor="middle" class="tag strong">{t('code2wav · a model', 'code2wav · 一个模型')}</text>
            <path d="M {GX + (CHUNK * CW) / 2} {CY + 28} V {CY + 40}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            {#if c2w === 2}
              <path d={wave(GX, GX + CHUNK * CW - 2, CY + 54, 9, 4.1)} fill="none" stroke="var(--fg)" stroke-width="1.2" opacity="0.8" transition:fade={{ duration: 400 }} />
            {:else}
              <text x={GX + (CHUNK * CW) / 2} y={CY + 58} text-anchor="middle" class="tag" transition:fade={{ duration: 250 }}>{t(`waiting for ${CHUNK} frames`, `等 ${CHUNK} 帧`)}</text>
            {/if}
            <text x={GX + CHUNK * CW + 10} y={CY + 58} class="tag">{t(`${CHUNK} × ${FRAME_MS} ms = ${CHUNK * FRAME_MS} ms of sound`, `${CHUNK} × ${FRAME_MS} ms = ${CHUNK * FRAME_MS} ms 的声音`)}</text>
          </g>

          <!-- what a code is, and the 20 s answer counted -->
          <g in:fade={{ delay: 900, duration: 250 }}>
            <text x={RX} y={GY + 4} class="tag strong">{t(`a code: one of ${fmt(CODE_VALUES)} values,`, `一个 code：${fmt(CODE_VALUES)} 个取值之一，`)}</text>
            <text x={RX} y={GY + 18} class="tag">{t('picked the way a token id is', '像 token id 一样选出')}</text>
            <text x={RX} y="190" class="slab strong small">{t(`the ${A_SEC} s answer`, `${A_SEC} s 的回答`)}</text>
            <text x={RX} y="206" class="tag">{A_SEC} s ÷ {FRAME_MS} ms = <tspan class="strong">{t(`${FRAMES} frames`, `${FRAMES} 帧`)}</tspan></text>
            <text x={RX} y="226" class="tag strong">talker</text>
            <text x={RX} y="239" class="tag">{t(`${FRAMES} steps`, `${FRAMES} 步`)}</text>
            <text x={RX} y="257" class="tag strong">code predictor</text>
            <text x={RX} y="270" class="tag">{t(`${FRAMES} × ${CODES_PER_FRAME - 1} = ${fmt(FRAMES * (CODES_PER_FRAME - 1))} steps`, `${FRAMES} × ${CODES_PER_FRAME - 1} = ${fmt(FRAMES * (CODES_PER_FRAME - 1))} 步`)}</text>
            <text x={RX} y="288" class="tag strong">code2wav</text>
            <text x={RX} y="301" class="tag">{t(`${FRAMES} ÷ ${CHUNK} = ${FRAMES / CHUNK} passes`, `${FRAMES} ÷ ${CHUNK} = ${FRAMES / CHUNK} 遍`)}</text>
          </g>

          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('each talker step reads the next token and the frame just written, so the next frame waits for it', 'talker 每步读下一个 token 和刚写好的帧，所以下一帧要等它')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`SGLang-Omni's settings for Qwen3-Omni: ${CHUNK} frames per code2wav pass, each pass rereading up to 25 earlier frames`, `SGLang-Omni 对 Qwen3-Omni 的设置：code2wav 每遍 ${CHUNK} 帧，每遍最多重读之前 25 帧`)}</text>
        </g>
      {/if}
      <!-- 4: the map · every model the request runs, of two kinds, and what passes between them -->
      {#if cur.scene === 'map'}
        {@const VY = 112}
        {@const AY = 232}
        {@const BH = 44}
        {@const EX = 212}
        {@const TX = 352}
        {@const CX = 500}
        {@const BW = 90}
        {@const one = { fill: 'white', stroke: 'var(--fg)' }}
        {@const loop = { fill: 'var(--accent-soft)', stroke: 'var(--accent)' }}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('the whole request, as the models it runs · six, of two kinds', '整个 request，按它运行的模型来看 · 六个，分两类')}</text>
          <g in:fade={{ delay: 1500, duration: 250 }}>
            <rect x="18" y="300" width="16" height="11" rx="3" fill={one.fill} stroke={one.stroke} />
            <text x="42" y="310" class="legend"><tspan class="strong">{t('one pass:', '一遍：')}</tspan> {t('reads its input, writes its output, and is done', '读完输入，写出输出，就结束')}</text>
            <rect x="18" y="322" width="16" height="11" rx="3" fill={loop.fill} stroke={loop.stroke} />
            <text x="42" y="332" class="legend"><tspan class="strong">{t('a loop:', '一个循环：')}</tspan> {t('forward, pick, append, as in Ch. 1 Step 11, each step waiting for the one before', '前向、挑选、追加，如 Ch. 1 Step 11，每步等前一步')}</text>
          </g>

          <!-- the inputs and the encoders -->
          <g in:fade={{ delay: 300, duration: 250 }}>
            {#each Array(6) as _, r}{#each Array(6) as _, c}
              {@const [fill, op] = tile(r, c)}
              <rect x={18 + c * 7} y={VY - 21 + r * 7} width="6" height="6" fill={fill} opacity={op} />
            {/each}{/each}
            <path d={wave(16, 60, AY, 8, 1.3)} fill="none" stroke="var(--fg)" stroke-width="1.2" opacity="0.8" />
            {#each [{ y: VY, n: 'vision encoder', nz: '视觉 encoder', out: fmt(IMG_POS) }, { y: AY, n: 'audio encoder', nz: '音频 encoder', out: AUD_POS }] as e}
              <path d="M 64 {e.y} H 76" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
              <rect x="80" y={e.y - BH / 2} width={BW} height={BH} rx="8" fill={one.fill} stroke={one.stroke} />
              <text x={80 + BW / 2} y={e.y - 3} text-anchor="middle" class="tag strong">{t(e.n, e.nz)}</text>
              <text x={80 + BW / 2} y={e.y + 11} text-anchor="middle" class="tag">{t('1 pass', '1 遍')}</text>
              <path d="M 174 {e.y} H {EX - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
              <text x={(170 + EX) / 2} y={e.y - 7} text-anchor="middle" class="tag">{e.out}</text>
            {/each}
          </g>

          <!-- the engine -->
          <g in:fade={{ delay: 600, duration: 250 }}>
            <rect x={EX} y={VY - BH / 2} width={BW} height={AY - VY + BH} rx="10" fill={loop.fill} stroke={loop.stroke} />
            <text x={EX + BW / 2} y={(VY + AY) / 2 - 18} text-anchor="middle" class="tag strong">{t('the engine', 'engine')}</text>
            <text x={EX + BW / 2} y={(VY + AY) / 2 - 2} text-anchor="middle" class="tag">{t('prefill: 1 pass,', 'prefill：1 遍，')}</text>
            <text x={EX + BW / 2} y={(VY + AY) / 2 + 12} text-anchor="middle" class="tag">{t('then a step', '之后每个文本')}</text>
            <text x={EX + BW / 2} y={(VY + AY) / 2 + 26} text-anchor="middle" class="tag">{t('per text token', 'token 一步')}</text>
            <path d="M {EX + BW + 4} {VY} H {TX - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={(EX + BW + TX) / 2} y={VY - 7} text-anchor="middle" class="tag">tokens</text>
          </g>

          <!-- talker and code predictor: a frame goes down as code 0 and comes back as 16 codes -->
          <g in:fade={{ delay: 900, duration: 250 }}>
            <rect x={TX} y={VY - BH / 2} width={BW} height={BH} rx="8" fill={loop.fill} stroke={loop.stroke} />
            <text x={TX + BW / 2} y={VY - 3} text-anchor="middle" class="tag strong">talker</text>
            <text x={TX + BW / 2} y={VY + 11} text-anchor="middle" class="tag">{t(`${FRAMES} steps`, `${FRAMES} 步`)}</text>
            <rect x={TX} y={AY - BH / 2} width={BW} height={BH} rx="8" fill={loop.fill} stroke={loop.stroke} />
            <text x={TX + BW / 2} y={AY - 3} text-anchor="middle" class="tag strong">code predictor</text>
            <text x={TX + BW / 2} y={AY + 11} text-anchor="middle" class="tag">{t(`${fmt(FRAMES * (CODES_PER_FRAME - 1))} steps`, `${fmt(FRAMES * (CODES_PER_FRAME - 1))} 步`)}</text>
            <path d="M {TX + 30} {VY + BH / 2 + 4} V {AY - BH / 2 - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={TX + 24} y={(VY + AY) / 2 + 4} text-anchor="end" class="tag">code 0</text>
            <path d="M {TX + 60} {AY - BH / 2 - 4} V {VY + BH / 2 + 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={TX + 66} y={(VY + AY) / 2 - 3} class="tag">{t('the', '这一')}</text>
            <text x={TX + 66} y={(VY + AY) / 2 + 11} class="tag">{t('frame', '帧')}</text>
          </g>

          <!-- code2wav, and the sound -->
          <g in:fade={{ delay: 1200, duration: 250 }}>
            <path d="M {TX + BW + 4} {AY} H {CX - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <text x={(TX + BW + CX) / 2} y={AY - 7} text-anchor="middle" class="tag">{t(`${CHUNK} frames`, `${CHUNK} 帧`)}</text>
            <rect x={CX} y={AY - BH / 2} width={BW} height={BH} rx="8" fill={one.fill} stroke={one.stroke} />
            <text x={CX + BW / 2} y={AY - 3} text-anchor="middle" class="tag strong">code2wav</text>
            <text x={CX + BW / 2} y={AY + 11} text-anchor="middle" class="tag">{t(`${FRAMES / CHUNK} passes`, `${FRAMES / CHUNK} 遍`)}</text>
            <path d="M {CX + BW + 4} {AY} H {CX + BW + 16}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#om-arrow)" />
            <path d={wave(CX + BW + 20, 702, AY, 8, 4.1)} fill="none" stroke="var(--fg)" stroke-width="1.2" opacity="0.8" />
            <text x={CX + BW + 16} y={AY - 16} class="tag">{t(`${CHUNK * FRAME_MS} ms of sound each`, `每遍 ${CHUNK * FRAME_MS} ms 声音`)}</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`counts for this request: the ${PHOTO} × ${PHOTO} photo, the ${Q_SEC} s question and the ${A_SEC} s answer (steps 2 and 3)`, `本 request 的计数：${PHOTO} × ${PHOTO} 的照片、${Q_SEC} s 的问题和 ${A_SEC} s 的回答（第 2、3 步）`)}</text>
        </g>
      {/if}
      <!-- 5: inside the talker box · the engine's row as in chapters 1–15, the talker's row reading what it writes -->
      {#if cur.scene === 'waits'}
        {@const C0 = 150}
        {@const CW = 34}
        {@const cx = (c: number) => C0 + c * CW}
        {@const mid = (c: number) => cx(c) + (CW - 4) / 2}
        {@const EY = 96}
        {@const TY = 180}
        {@const ENGINE = [null, 'P', '2', '3', null, null, null, '4', '5', '6', null, null, '7', '8', '9', '10']}
        {@const writes = (k: number) => (k === 1 ? 1 : ENGINE.indexOf(String(k)))}
        {@const talker = (() => { const out = [{ c: 2, label: 'P' }]; let c = 2; for (let k = 1; ; k++) { const w = writes(k); if (w < 0) break; c = Math.max(c + 1, w + 1); if (c >= ITERS) break; out.push({ c, label: String(k) }); } return out; })()}
        {@const waits = Array.from({ length: ITERS }, (_, c) => c).filter((c) => c > 2 && !talker.some((tk) => tk.c === c))}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('can the talker take its next step? · only once the engine has written its token', 'talker 能走下一步吗？· 要等 engine 写出它的 token')}</text>

          <g in:fade={{ delay: 100, duration: 250 }}>
            <text x="16" y={EY + 12} class="tag strong">engine</text>
            <text x="16" y={EY + 25} class="tag">{t('a request as in', '一个 request，如')}</text>
            <text x="16" y={EY + 37} class="tag">{t('chapters 1–15', '第 1–15 章')}</text>
            <text x="16" y={TY + 12} class="tag strong">talker</text>
            <text x="16" y={TY + 25} class="tag">{t('reads what the', '读 engine')}</text>
            <text x="16" y={TY + 37} class="tag">{t('engine writes', '写出的东西')}</text>
            <rect x={cx(0) - 16} y={EY} width={CW + 12} height="28" rx="4" fill="#ece9e1" stroke="var(--faint)" />
            <text x={cx(0) + 7} y={EY + 18} text-anchor="middle" class="tag strong">prompt</text>
          </g>

          <!-- the engine: its prefill writes token 1, then a token per step; busy where its scheduler runs other requests -->
          {#each ENGINE as e, c}
            {#if c >= 1 && c <= iter}
              {#if e}
                <rect x={cx(c)} y={EY} width={CW - 4} height="28" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" transition:fade={{ duration: 150 }} />
                <text x={mid(c)} y={EY + 18} text-anchor="middle" class="tag strong" transition:fade={{ duration: 150 }}>{e}</text>
              {:else}
                <rect x={cx(c)} y={EY} width={CW - 4} height="28" rx="4" fill="#f3f1eb" stroke="var(--faint)" stroke-dasharray="3 2" transition:fade={{ duration: 150 }} />
                <text x={mid(c)} y={EY + 18} text-anchor="middle" class="tag" transition:fade={{ duration: 150 }}>{t('busy', '忙')}</text>
              {/if}
            {/if}
          {/each}

          <!-- the talker: each step runs the iteration after the engine step that wrote its input -->
          {#each talker as tk}
            {#if tk.c <= iter}
              <rect x={cx(tk.c)} y={TY} width={CW - 4} height="28" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" transition:fade={{ duration: 150 }} />
              <text x={mid(tk.c)} y={TY + 18} text-anchor="middle" class="tag strong" transition:fade={{ duration: 150 }}>{tk.label}</text>
            {/if}
          {/each}
          {#each waits as c}
            {#if c <= iter}
              <rect x={cx(c)} y={TY} width={CW - 4} height="28" rx="4" fill="var(--eos-soft)" stroke={RED} stroke-dasharray="3 2" transition:fade={{ duration: 150 }} />
              <text x={mid(c)} y={TY + 18} text-anchor="middle" class="tag strong" style:fill={RED} transition:fade={{ duration: 150 }}>{t('wait', '等')}</text>
            {/if}
          {/each}

          <!-- one axis: iterations, with a dashed line between each so the two rows line up -->
          <g in:fade={{ delay: 300, duration: 250 }}>
            {#each Array(ITERS) as _, c}
              <line x1={cx(c + 1) - 2} y1={EY - 8} x2={cx(c + 1) - 2} y2="258" stroke="var(--line)" stroke-dasharray="3 3" />
            {/each}
            <line x1={cx(0) - 16} y1="258" x2={cx(ITERS)} y2="258" stroke="var(--faint)" />
            {#each Array(ITERS) as _, c}
              <text x={c ? mid(c) : cx(0) + 7} y="272" text-anchor="middle" class="tag">{c ? c : t('arrives', '到达')}</text>
            {/each}
            <text x={cx(0) - 16} y="290" class="tag">{t('iterations →', '迭代 →')}</text>
            <text x={cx(ITERS)} y="290" text-anchor="end" class="tag">{t("P = prefill · the engine's prefill also writes token 1 (Ch. 1 Step 4)", 'P = prefill · engine 的 prefill 也写出 token 1（Ch. 1 Step 4）')}</text>
            <text x={cx(ITERS)} y="304" text-anchor="end" class="tag">{t('a number: the token that step writes (engine) or reads (talker)', '数字：该步写出（engine）或读入（talker）的 token')}</text>
          </g>
          <g in:fade={{ delay: 700 }}>
            <rect x="30" y="321" width="660" height="28" rx="14" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={W / 2} y="340" text-anchor="middle" class="need"><tspan class="strong">{t('needed:', '需要：')}</tspan> {t('each token handed over as it is written, and a talker loop that checks it has arrived', '每个 token 写出时就交接，talker 的循环检查它已到达')}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t("busy: the engine runs other requests that iteration, such as a prefill (Ch. 6 Step 4) · the talker's frame comes from its own step", '忙：engine 该迭代在跑其他 request，比如一次 prefill（Ch. 6 Step 4）· talker 的帧来自它自己的步')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("SGLang-Omni adds the talker's wait: talker_scheduler.py holds a decode batch until every request in it has its next token", 'SGLang-Omni 加上了 talker 的等待：talker_scheduler.py 扣住一个 decode batch，直到其中每个 request 都拿到下一个 token')}</text>
        </g>
      {/if}
      <!-- 6: where the talker runs · alone it barely uses a GPU; shared, it and the engine can want the GPU at the same moment -->
      {#if cur.scene === 'speech' || cur.scene === 'waits'}<LoopProgress ms={lapMs} {lap} />{/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>
