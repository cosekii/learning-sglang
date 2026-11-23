<script lang="ts">
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import { chapterNumber as chNum, type NavLink } from '../../chapters';
  import { SAMPLES_PER_FRAME, SPEECH_OUT_HZ, CODES_PER_FRAME } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  const CH_PROC = chNum('09-one-request'), CH_OMNI = chNum('16-omni-models'), CH_STAGES = chNum('17-stages-and-schedulers'), CH_BETWEEN = chNum('18-between-stages');
  const fmt = (n: number) => n.toLocaleString('en-US');

  // chapter 16's sound: frames of 80 ms, 16 codes each, turned into sound 10 frames at a time
  const FRAME_MS = (SAMPLES_PER_FRAME / SPEECH_OUT_HZ) * 1000;     // 80
  const CHUNK = 10;                                                // frames per code2wav window (stream_chunk_size)
  const CHUNK_MS = CHUNK * FRAME_MS;                               // 800
  const LEFT = 25;                                                 // earlier frames each window rereads (left_context_size)
  const STEPS = CODES_PER_FRAME;                                   // a frame: 1 talker step + 15 code predictor steps
  const STEP_MS = FRAME_MS / STEPS;                                // 5
  const ANSWER_FRAMES = (20 * 1000) / FRAME_MS;                    // chapter 16's 20 s answer: 250 frames
  const SMALL_FIRST_N = 4;                                         // the first window proposed in PR #2800

  type Scene = 'gap' | 'whole' | 'stream' | 'inside' | 'seam' | 'size';
  const steps: { scene: Scene; caption: string; captionZh: string }[] = [
    { scene: 'gap', caption: `The player plays each chunk the moment the one before it ends. If the next has not arrived, the sound stops. Two things matter: how soon the first sound comes, and whether a gap ever opens.`, captionZh: `播放器在前一个 chunk 结束的瞬间播放下一个。若下一个还没到，声音就停了。关键有两点：第一段声音来得多快，以及是否会出现空档。` },
    { scene: 'whole', caption: `The simplest decoder waits for the whole answer: all ${ANSWER_FRAMES} frames, then one call to code2wav. Nothing can play before that, so the listener sits through the whole generation in silence.`, captionZh: `最简单的解码器等整个回答：全部 ${ANSWER_FRAMES} 帧，然后调用一次 code2wav。在那之前无法播放，听者在整个生成过程中只能沉默。` },
    { scene: 'stream', caption: `A streaming decoder runs as frames come in. Every ${CHUNK} frames, code2wav sends ${CHUNK_MS} ms of sound. While chunk 1 plays, the talker writes the next ${CHUNK}, so chunk 2 is ready before chunk 1 ends.`, captionZh: `流式解码器随帧到达而运行。每 ${CHUNK} 帧，code2wav 送出 ${CHUNK_MS} ms 的声音。播放 chunk 1 时，talker 写接下来的 ${CHUNK} 帧，chunk 2 在 chunk 1 结束前就绪。` },
    { scene: 'inside', caption: `code2wav runs the streaming scheduler of Ch. ${CH_STAGES} Step 11. For each request it keeps the frames so far and how many it has sent. At ${CHUNK} new frames it decodes and sends; when the talker is done, it sends the rest.`, captionZh: `code2wav 运行 Ch. ${CH_STAGES} Step 11 的流式 scheduler。每个 request 保留已收到的帧和已送出的数量。攒够 ${CHUNK} 个新帧就解码并送出；talker 结束后送出剩余部分。` },
    { scene: 'seam', caption: `Each moment of code2wav's sound depends on the frames before it, and code2wav keeps nothing between windows. So each window takes the frames before it again, up to ${LEFT}, and keeps only the new sound.`, captionZh: `code2wav 输出的每一刻声音都依赖它前面的帧，而它在窗口之间不保留任何东西。所以每个窗口重新读入前面的帧，最多 ${LEFT} 个，只保留新产生的声音。` },
    { scene: 'size', caption: `Smaller chunks bring the first sound sooner, but each frame then gets decoded more times, since every window rereads the ${LEFT} before it. SGLang-Omni uses ${CHUNK}; a smaller first window gets both.`, captionZh: `更小的 chunk 让第一段声音更早到来，但每帧被解码的次数更多，因为每个窗口都要重读前面的 ${LEFT} 帧。SGLang-Omni 用 ${CHUNK}；更小的首窗口两者兼得。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const W = 720, H = 400;
  const RED = 'var(--eos)';
  const TLK = 'var(--accent)', C2W = '#57534e';
  const REST_FILL = '#f6f4ee', PLAYED = '#e3ded3';

  // step 1: one timeline per case, chunks played back to back from when each arrives
  const TX0 = 150, MSPX = 0.165;
  const tx = (ms: number) => TX0 + ms * MSPX;
  const play = (ready: number[]) => { let end = 0; return ready.map((a, i) => { const s = i === 0 ? a : Math.max(a, end); const gap = i === 0 ? 0 : Math.max(0, a - end); end = s + CHUNK_MS; return { a, s, e: end, gap }; }); };
  const CASES = [
    { en: 'ON TIME', zh: '准时', y: 84, chunks: play([450, 1000, 1700]) },
    { en: 'ONE CHUNK LATE', zh: '晚了一个 chunk', y: 212, chunks: play([450, 1550, 2150]) },
  ];

  // steps 2 and 3: the same three rows over the same 4 s. The talker writes a frame every 40 ms here
  // (twice real time) after 200 ms of getting going; code2wav's call is drawn as 40 ms.
  const SPAN = 4000, PX2 = 540 / SPAN, GEN_MS = 40, T0 = 200, DEC_MS = 40;
  const sx = (ms: number) => 150 + ms * PX2;
  const GROUPS = Math.ceil((SPAN - T0) / (CHUNK * GEN_MS));
  const group = (g: number) => ({ a: T0 + g * CHUNK * GEN_MS, b: T0 + (g + 1) * CHUNK * GEN_MS });
  const decodes = Array.from({ length: GROUPS }, (_, g) => ({ a: group(g).b, b: group(g).b + DEC_MS })).filter((d) => d.a < SPAN);
  const streamChunks = play(decodes.map((d) => d.b)).filter((c) => c.s < SPAN);
  const WHOLE_FIRST = T0 + ANSWER_FRAMES * GEN_MS + DEC_MS;       // when the first sound would come without streaming
  const RY = { talker: 96, c2w: 156, player: 216 };

  // step 4: a stand-in for code2wav's sound, so a seam can be seen. Decoded alone, chunk 2's first frames miss
  // the frames before them, drawn as an offset that fades over its first frames.
  const wave = (f: number) => 0.55 * Math.sin(f * 1.9) + 0.3 * Math.sin(f * 4.7 + 1) + 0.15 * Math.sin(f * 9.3 + 2);
  const alone = (f: number) => 1.1 * Math.exp(-(f - CHUNK) / 1.3);
  const FX0 = 150, FPX = 18;
  const fx = (f: number) => FX0 + f * FPX;
  const wavePath = (f0: number, f1: number, mid: number, off: (f: number) => number = () => 0) => {
    const pts: string[] = [];
    for (let f = f0; f <= f1 + 1e-9; f += 0.1) pts.push(`${fx(f).toFixed(1)},${(mid - 11 * (wave(f) + off(f))).toFixed(1)}`);
    return pts.length > 1 ? 'M ' + pts.join(' L ') : '';
  };
  // the inside step: one request of 34 frames through code2wav's streaming scheduler. The first 10 frames arrive
  // one at a time, then tens, then the last 4 with the talker's done signal (times illustrative)
  const IN_FRAMES = 34;
  // after the first ten frames count in, every status line holds for HOLD ms
  const HOLD = 5000, FIRST10 = 1800 + CHUNK * 300;
  const at = (k: number) => FIRST10 + k * HOLD;              // the start of the k-th held phase
  const IN_ARRIVE = [...Array.from({ length: CHUNK }, (_, i) => 1800 + (i + 1) * 300 - 300), ...Array(CHUNK).fill(at(3)), ...Array(CHUNK).fill(at(6)), ...Array(4).fill(at(9))];
  const IN_DONE = at(10), IN_CLEAR = at(13), IN_SPAN = at(14);
  const IN_DECODES = [{ a: at(1), b: at(2), from: 0, to: 10 }, { a: at(4), b: at(5), from: 10, to: 20 }, { a: at(7), b: at(8), from: 20, to: 30 }, { a: at(11), b: at(12), from: 30, to: 34 }];
  // the animated steps play a stretch of time (span, in ms of the timeline) at half speed, rest, and loop
  const ANIM: Partial<Record<Scene, [number, number]>> = { gap: [3300, 2], whole: [4000, 2], stream: [4000, 2], inside: [IN_SPAN, 1] };
  const REST = 2500;
  let clock = $state(0);
  let lap = $state(0), lapMs = $state(0);           // the looping step's laps, for LoopProgress
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });   // untracked, so starting a lap does not re-run the effect
  $effect(() => {
    const anim = ANIM[cur.scene];
    if (!anim) return;
    const [span, SLOW] = anim;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { clock = span; return; }
    const lapLen = span * SLOW + REST;
    let raf = 0, t0 = 0;
    const tick = (now: number) => {
      if (!t0 || now - t0 >= lapLen) { t0 = now; nextLap(lapLen); }
      clock = Math.min(span, (now - t0) / SLOW);
      raf = requestAnimationFrame(tick);
    };
    clock = 0;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
  const inStatus = (ms: number) => {
    const rec = IN_ARRIVE.filter((a) => a <= ms).length;
    const sent = IN_DECODES.filter((d) => d.b <= ms).reduce((m, d) => Math.max(m, d.to), 0);
    const k = IN_DECODES.findIndex((d) => ms >= d.a && ms < d.b);
    if (ms >= IN_CLEAR) return t('the request is finished: its state is cleared', 'request 已结束：状态被清空');
    if (k >= 0) { const d = IN_DECODES[k]; return t(`window ${k + 1}: decode ${Math.min(LEFT, d.from)} earlier + ${d.to - d.from} new frames, then send the new ${(d.to - d.from) * FRAME_MS} ms`, `窗口 ${k + 1}：解码 ${Math.min(LEFT, d.from)} 个更早的帧 + ${d.to - d.from} 个新帧，然后送出新的 ${(d.to - d.from) * FRAME_MS} ms`); }
    if (ms >= IN_DONE && sent < IN_FRAMES) return t(`the talker is done: decode the last ${IN_FRAMES - sent}, though fewer than ${CHUNK}`, `talker 已结束：解码最后 ${IN_FRAMES - sent} 帧，虽然不足 ${CHUNK} 帧`);
    if (rec === 0) return t("waiting for the talker's first frame", '等待 talker 的第一帧');
    if (sent === IN_FRAMES) return t(`all ${IN_FRAMES} frames sent as sound, in ${IN_DECODES.length} pieces`, `全部 ${IN_FRAMES} 帧已作为声音送出，共 ${IN_DECODES.length} 段`);
    if (rec === sent) return t(`sent ${sent * FRAME_MS} ms of sound so far; waiting for the talker's next frames`, `已送出 ${sent * FRAME_MS} ms 的声音；等待 talker 的后续帧`);
    if (rec - sent >= CHUNK) return t(`${rec - sent} new frames are in: enough for a window`, `已收到 ${rec - sent} 个新帧：够一个窗口了`);
    return t(`holding ${rec - sent} new frame${rec - sent === 1 ? '' : 's'}, waiting for ${CHUNK}`, `攒着 ${rec - sent} 个新帧，等待凑满 ${CHUNK}`);
  };

  // step 5: the first sound waits for one chunk; each window decodes up to 25 earlier frames plus the chunk
  const SIZES = [{ n: 2 }, { n: 4 }, { n: CHUNK, def: true }, { n: 20 }, { n: 4, then: CHUNK }].map((r) => ({ ...r, work: (LEFT + (r.then ?? r.n)) / (r.then ?? r.n) }));



</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Streaming audio decode, step {step + 1}">
      <defs>
        {#each [['sa-arrow', '#b8b4aa'], ['sa-arrow-fg', 'var(--fg)']] as [id, c]}
          <marker {id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
          </marker>
        {/each}
        <pattern id="sa-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="var(--eos-soft)" /><line x1="0" y1="0" x2="0" y2="5" stroke={RED} stroke-width="1.5" />
        </pattern>
      </defs>

      {#if cur.scene === 'gap'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`the deadline · the player plays chunk after chunk, ${CHUNK_MS} ms each`, `截止时间 · 播放器一个接一个地播放 chunk，每个 ${CHUNK_MS} ms`)}</text>
          {#each CASES as c, ci}
            <g>
              <text x="16" y={c.y} class="boxtitle">{t(c.en, c.zh)}</text>
              <text x="16" y={c.y + 30} class="tag strong">{t('chunk arrives', 'chunk 到达')}</text>
              <text x="16" y={c.y + 66} class="tag strong">{t('the player plays', '播放器播放')}</text>
              <line x1={TX0} y1={c.y + 26} x2={tx(3300)} y2={c.y + 26} stroke="var(--line)" />
              <line x1={TX0} y1={c.y + 18} x2={TX0} y2={c.y + 34} stroke="var(--fg)" />
              <text x={TX0} y={c.y + 12} text-anchor="middle" class="tag">request</text>
              {#each c.chunks as k, i}
                <g style:opacity={clock >= k.a ? 1 : 0} style="transition: opacity 200ms">
                  <path d="M {tx(k.a)} {c.y + 19} V {c.y + 32}" stroke="var(--fg)" stroke-width="2" />
                  <text x={tx(k.a)} y={c.y + 14} text-anchor="middle" class="tag strong">{i + 1}</text>
                  {#if k.s > k.a}<line x1={tx(k.a)} y1={c.y + 26} x2={tx(k.s)} y2={c.y + 50} stroke="var(--faint)" stroke-dasharray="2 2" />{/if}
                  <rect x={tx(k.s) + 1} y={c.y + 50} width={CHUNK_MS * MSPX - 2} height="24" rx="4" fill="white" />
                </g>
                <!-- how much of the chunk has played -->
                <rect x={tx(k.s) + 1} y={c.y + 50} width={clamp(clock - k.s, 0, CHUNK_MS) * MSPX - 2 > 0 ? clamp(clock - k.s, 0, CHUNK_MS) * MSPX - 2 : 0} height="24" rx="4" fill={PLAYED} />
                <rect x={tx(k.s) + 1} y={c.y + 50} width={CHUNK_MS * MSPX - 2} height="24" rx="4" fill="none" stroke="var(--fg)" style:opacity={clock >= k.a ? 1 : 0} style="transition: opacity 200ms" />
                <text x={tx(k.s) + (CHUNK_MS * MSPX) / 2} y={c.y + 66} text-anchor="middle" class="mono strong" style:opacity={clock >= k.a ? 1 : 0}>chunk {i + 1}</text>
                {#if k.gap > 0}
                  <rect x={tx(k.s - k.gap)} y={c.y + 50} width={clamp(clock - (k.s - k.gap), 0, k.gap) * MSPX} height="24" fill="url(#sa-hatch)" stroke={RED} stroke-width={clock > k.s - k.gap ? 1 : 0} />
                  <text x={tx(k.s - k.gap / 2)} y={c.y + 90} text-anchor="middle" class="tag strong" style:fill={RED} style:opacity={clock >= k.s ? 1 : 0} style="transition: opacity 200ms">{t(`gap · ${k.gap} ms of silence`, `空档 · ${k.gap} ms 的静音`)}</text>
                {/if}
              {/each}
              {#if ci === 0}
                <!-- how long the listener waits for any sound -->
                <path d="M {TX0} {c.y + 40} V {c.y + 44} H {tx(clamp(clock, 0, c.chunks[0].a))} V {c.y + 40}" fill="none" stroke={TLK} />
                <text x={TX0 - 4} y={c.y + 90} class="tag strong" style:fill={TLK} style:opacity={clock >= c.chunks[0].a ? 1 : 0} style="transition: opacity 200ms">{t('time to first audio', '到第一段声音的时间')}</text>
              {/if}
              <!-- now -->
              <line x1={tx(clock)} y1={c.y + 16} x2={tx(clock)} y2={c.y + 78} stroke="var(--fg)" stroke-width="1" opacity="0.35" />
            </g>
          {/each}
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`${CHUNK_MS} ms: ${CHUNK} frames × ${FRAME_MS} ms (Ch. ${CH_OMNI} Step 3) · arrival times illustrative · dotted: a chunk waiting to play`, `${CHUNK_MS} ms：${CHUNK} 帧 × ${FRAME_MS} ms（Ch. ${CH_OMNI} Step 3）· 到达时间仅为示意 · 虚线：等待播放的 chunk`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`SGLang-Omni's benchmark scores each request by its longest gap and counts how many stay within 50, 100 and 200 ms`, 'SGLang-Omni 的基准测试按每个 request 的最长空档评分，并统计落在 50、100、200 ms 以内的数量')}</text>
        </g>
      {/if}

      {#if cur.scene === 'whole' || cur.scene === 'stream'}
        {@const streaming = cur.scene === 'stream'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{streaming ? t(`streaming · code2wav decodes every ${CHUNK} frames, as they come`, `流式 · code2wav 每收到 ${CHUNK} 帧就解码`) : t('without streaming · code2wav waits for the whole answer', '非流式 · code2wav 等待整个回答')}</text>
          <text x="16" y={RY.talker + 17} class="tag strong">{t('talker writes frames', 'talker 写帧')}</text>
          <text x="16" y={RY.c2w + 17} class="tag strong">{t('code2wav decodes', 'code2wav 解码')}</text>
          <text x="16" y={RY.player + 17} class="tag strong">{t('the player plays', '播放器播放')}</text>
          {#each Object.values(RY) as y}<rect x="150" y={y} width="540" height="26" rx="4" fill="#fbfaf7" stroke="var(--line)" />{/each}
          <!-- the time axis -->
          <line x1="150" y1="282" x2="690" y2="282" stroke="var(--faint)" marker-end="url(#sa-arrow)" />
          {#each [0, 1, 2, 3, 4] as s}<text x={sx(s * 1000)} y="296" text-anchor="middle" class="tag">{s} s</text>{/each}
          <!-- now, drawn first so labels sit over it -->
          <line x1={sx(clock)} y1={RY.talker - 2} x2={sx(clock)} y2={RY.player + 28} stroke="var(--fg)" opacity="0.35" />

          <!-- the talker: frames appear as they are written, ten to a group -->
          {#each Array.from({ length: GROUPS }) as _, g}
            {@const gr = group(g)}
            {#if gr.a < SPAN}
              <rect x={sx(gr.a)} y={RY.talker + 3} width={clamp(clock - gr.a, 0, Math.min(gr.b, SPAN) - gr.a) * PX2} height="20" fill={TLK} opacity={g % 2 ? 0.55 : 0.85} />
            {/if}
          {/each}
          <text x={sx(group(0).a) + (CHUNK * GEN_MS * PX2) / 2} y={RY.talker - 6} text-anchor="middle" class="tag" style:opacity={clock >= group(0).b ? 1 : 0}>{t(`frames 1–${CHUNK}`, `帧 1–${CHUNK}`)}</text>
          <text x={sx(group(1).a) + (CHUNK * GEN_MS * PX2) / 2} y={RY.talker - 6} text-anchor="middle" class="tag" style:opacity={clock >= group(1).b ? 1 : 0}>{CHUNK + 1}–{2 * CHUNK}</text>

          {#if !streaming}
            <rect x={sx(SPAN / 2) - 228} y={RY.c2w + 4} width="456" height="18" fill="#fbfaf7" />
            <text x={sx(SPAN / 2)} y={RY.c2w + 17} text-anchor="middle" class="tag strong">{t(`waits for all ${ANSWER_FRAMES} frames: at this pace, frame ${ANSWER_FRAMES} comes at ${fmt((T0 + ANSWER_FRAMES * GEN_MS) / 1000)} s`, `等待全部 ${ANSWER_FRAMES} 帧：按此速度，第 ${ANSWER_FRAMES} 帧在 ${fmt((T0 + ANSWER_FRAMES * GEN_MS) / 1000)} s 才到`)}</text>
            <rect x="151" y={RY.player + 1} width={clamp(clock, 0, SPAN) * PX2 - 2 > 0 ? clamp(clock, 0, SPAN) * PX2 - 2 : 0} height="24" rx="3" fill="url(#sa-hatch)" />
            <text x="150" y={RY.player + 46} class="tag strong" style:fill={RED}>{t('silence, from the request on', '从 request 开始一直是静音')}</text>
            <text x="690" y={RY.player + 46} text-anchor="end" class="tag strong" style:fill={RED} style:opacity={clock >= SPAN ? 1 : 0} style="transition: opacity 300ms">{t(`first sound at ${fmt(WHOLE_FIRST / 1000)} s →`, `第一段声音在 ${fmt(WHOLE_FIRST / 1000)} s →`)}</text>
          {:else}
            {#each decodes as d, j}
              <rect x={sx(d.a)} y={RY.c2w + 3} width={clamp(clock - d.a, 0, DEC_MS) * PX2 + (clock >= d.a ? 2 : 0)} height="20" fill={C2W} />
              {#if j < 3}<text x={sx(d.a) + 3} y={RY.c2w - 6} text-anchor="middle" class="tag" style:opacity={clock >= d.a ? 1 : 0}>{j + 1}</text>{/if}
            {/each}
            {#each streamChunks as k, i}
              {@const w = Math.min(k.e, SPAN) - k.s}
              <g style:opacity={clock >= k.a ? 1 : 0} style="transition: opacity 200ms">
                <line x1={sx(k.a)} y1={RY.c2w + 24} x2={sx(k.a)} y2={RY.player - 7} stroke="var(--faint)" stroke-dasharray="2 2" />
                <path d="M {sx(k.a) - 4} {RY.player - 7} L {sx(k.a) + 4} {RY.player - 7} L {sx(k.a)} {RY.player - 1} Z" fill="var(--muted)" />
                <rect x={sx(k.s) + 1} y={RY.player + 1} width={w * PX2 - 2} height="24" rx="3" fill="white" />
              </g>
              <rect x={sx(k.s) + 1} y={RY.player + 1} width={Math.max(0, clamp(clock - k.s, 0, w) * PX2 - 2)} height="24" rx="3" fill={PLAYED} />
              <rect x={sx(k.s) + 1} y={RY.player + 1} width={w * PX2 - 2} height="24" rx="3" fill="none" stroke="var(--fg)" style:opacity={clock >= k.a ? 1 : 0} style="transition: opacity 200ms" />
              {#if w * PX2 > 60}<text x={sx(k.s) + Math.min(w, CHUNK_MS) * PX2 / 2} y={RY.player + 17} text-anchor="middle" class="mono strong" style:opacity={clock >= k.a ? 1 : 0}>chunk {i + 1}</text>{/if}
            {/each}
            <!-- chunk 2 is ready before chunk 1 ends -->
            <g style:opacity={clock >= streamChunks[1].a ? 1 : 0} style="transition: opacity 300ms">
              <path d="M {sx(streamChunks[1].a)} {RY.player + 31} V {RY.player + 37} H {sx(streamChunks[1].s)} V {RY.player + 31}" fill="none" stroke={TLK} />
              <text x={sx(streamChunks[1].a)} y={RY.player + 51} class="tag strong" style:fill={TLK}>{t(`chunk 2 ready ${streamChunks[1].s - streamChunks[1].a} ms before chunk 1 ends`, `chunk 2 提前 ${streamChunks[1].s - streamChunks[1].a} ms 就绪，早于 chunk 1 结束`)}</text>
            </g>
          {/if}

          <g in:fade={{ delay: 300 }}>
            {#if streaming}
              <text x="18" y="328" class="pt">·</text><text x="28" y="328" class="legend">{t(`while one chunk plays, the talker writes the next ${CHUNK} frames and code2wav decodes them`, `一个 chunk 播放时，talker 写接下来的 ${CHUNK} 帧，code2wav 解码它们`)}</text>
              <text x="18" y="345" class="pt">·</text><text x="28" y="345" class="legend">{t(`that keeps up while ${CHUNK} frames take under ${CHUNK_MS} ms: ${STEPS} steps a frame, so under ${STEP_MS} ms a step`, `只要 ${CHUNK} 帧用时不到 ${CHUNK_MS} ms 就跟得上：每帧 ${STEPS} 步，即每步不到 ${STEP_MS} ms`)}</text>
            {:else}
              <text x="16" y="328" class="legend">{t('the listener hears nothing until the last frame is written and decoded', '最后一帧写完并解码之前，听者什么也听不到')}</text>
            {/if}
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{streaming ? t(`illustrative pace: a frame every ${GEN_MS} ms, twice real time · blue: frames, ten to a group · dark: a code2wav call · light: played`, `示意速度：每 ${GEN_MS} ms 一帧，为实际的两倍 · 蓝：帧，十个一组 · 深色：一次 code2wav 调用 · 浅色：已播放`) : t(`illustrative pace: a frame every ${GEN_MS} ms, twice real time · ${ANSWER_FRAMES} frames: Ch. ${CH_OMNI} Step 4's 20 s answer ÷ ${FRAME_MS} ms`, `示意速度：每 ${GEN_MS} ms 一帧，为实际的两倍 · ${ANSWER_FRAMES} 帧：Ch. ${CH_OMNI} Step 4 的 20 s 回答 ÷ ${FRAME_MS} ms`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{streaming ? t('measured: SGLang-Omni made sound in 38% of its playing time (real-time factor 0.38, 16 requests on one H100)', '实测：SGLang-Omni 生成声音只用了播放时长的 38%（real-time factor 0.38，一张 H100 上 16 个 request）') : t('a request that asks for its sound whole gets this: SGLang-Omni decodes as it goes but sends the sound once, at the end', '要求一次性拿到全部声音的 request 得到的是这个：SGLang-Omni 边生成边解码，但声音只在最后一次性送出')}</text>
        </g>
      {/if}

      {#if cur.scene === 'inside'}
        {@const SX = 176}
        {@const sw = 11}
        {@const rec = IN_ARRIVE.filter((a) => a <= clock).length}
        {@const sent = IN_DECODES.filter((d) => d.b <= clock).reduce((m, d) => Math.max(m, d.to), 0)}
        {@const act = IN_DECODES.find((d) => clock >= d.a && clock < d.b)}
        {@const out = IN_DECODES.filter((d) => d.b <= clock)}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`inside code2wav's stage · one request through its streaming scheduler (Ch. ${CH_STAGES} Steps 7 and 11)`, `code2wav 的 stage 内部 · 一个 request 走过它的流式 scheduler（Ch. ${CH_STAGES} Steps 7 and 11）`)}</text>
          <!-- the talker hands codes in, a frame at a time at first -->
          <rect x="16" y="100" width="96" height="26" rx="6" fill="var(--accent-soft)" stroke={TLK} />
          <text x="64" y="117" text-anchor="middle" class="mono strong">talker_ar</text>
          <text x="64" y="142" text-anchor="middle" class="tag">{t(`edge 8, Ch. ${CH_BETWEEN} Step 1`, `边 8，Ch. ${CH_BETWEEN} Step 1`)}</text>
          <line x1="116" y1="113" x2={SX - 8} y2="113" stroke="var(--faint)" stroke-width="1.5" marker-end="url(#sa-arrow)" />
          <text x={(116 + SX - 8) / 2} y="106" text-anchor="middle" class="tag">{t('codes', 'code')}</text>

          <!-- the request's state: its frames so far, and how many have been sent -->
          <text x={SX} y="64" class="boxtitle">{t("this request's state", '该 request 的状态')}</text>
          <g style:opacity={clock >= IN_CLEAR ? 0.25 : 1} style="transition: opacity 300ms">
            {#each Array.from({ length: IN_FRAMES }) as _, i}
              <rect x={SX + i * sw} y="102" width={sw - 2} height="22" rx="2" fill={i < sent ? C2W : i < rec ? TLK : '#fbfaf7'} stroke={i < rec ? 'none' : 'var(--line)'} opacity={i < sent ? 0.85 : 1} />
            {/each}
          </g>
          {#if act}
            {@const r0 = act.from - Math.min(LEFT, act.from)}
            {#if act.from > r0}
              <path d="M {SX + r0 * sw} 96 V 90 H {SX + act.from * sw - 3} V 96" fill="none" stroke="var(--muted)" stroke-dasharray="3 2" />
              <text x={SX + ((r0 + act.from) / 2) * sw} y="85" text-anchor="middle" class="tag">{t(`earlier ${act.from - r0}`, `更早 ${act.from - r0} 帧`)}</text>
            {/if}
            <path d="M {SX + act.from * sw} 96 V 90 H {SX + act.to * sw - 2} V 96" fill="none" stroke={TLK} />
            <text x={SX + ((act.from + act.to) / 2) * sw} y="85" text-anchor="middle" class="tag strong" style:fill={TLK}>{t(`new ${act.to - act.from}`, `新 ${act.to - act.from} 帧`)}</text>
          {/if}
          <text x={SX} y="144" class="tag strong">{t(`${rec} received · ${sent} sent as sound`, `已收到 ${rec} 帧 · 已送出 ${sent} 帧声音`)}</text>

          <!-- code2wav, busy while a window decodes -->
          <line x1={SX + IN_FRAMES * sw + 4} y1="113" x2="586" y2="113" stroke="var(--faint)" stroke-width="1.5" marker-end="url(#sa-arrow)" />
          <rect x="590" y="100" width="114" height="26" rx="6" fill={act ? C2W : 'white'} stroke={C2W} />
          <text x="647" y="117" text-anchor="middle" class="mono strong" style:fill={act ? 'white' : 'var(--fg)'}>code2wav</text>

          <!-- what it is doing now -->
          <rect x="16" y="166" width="688" height="30" rx="6" fill="#fbfaf7" stroke="var(--line)" />
          <text x="30" y="186" class="legend strong">{t('now: ', '现在：')}{inStatus(clock)}</text>

          <!-- the sound it sends, chunk by chunk -->
          <text x="16" y="242" class="tag strong">{t('sound sent out', '送出的声音')}</text>
          <path d="M 647 128 V 239 H 562" fill="none" stroke="var(--faint)" stroke-width="1.5" stroke-dasharray="3 2" marker-end="url(#sa-arrow)" />
          {#each out as d, k}
            {@const pw = (q: { from: number; to: number }) => Math.max((q.to - q.from) * 9, 50)}
            {@const x0 = SX + IN_DECODES.slice(0, k).reduce((a, q) => a + pw(q) + 4, 0)}
            <g transition:fade={{ duration: 200 }}>
              <rect x={x0} y="228" width={pw(d)} height="22" rx="4" fill="white" stroke="var(--fg)" />
              <text x={x0 + pw(d) / 2} y="243" text-anchor="middle" class="tag strong">{(d.to - d.from) * FRAME_MS} ms</text>
            </g>
          {/each}
          <text x={SX} y="270" class="tag">{t(`outbox → coordinator (Ch. ${CH_BETWEEN} Step 10) → the client, as stream events (Ch. ${CH_PROC} Step 9)`, `outbox → coordinator（Ch. ${CH_BETWEEN} Step 10）→ 客户端，以流事件形式（Ch. ${CH_PROC} Step 9）`)}</text>

          <g in:fade={{ delay: 400 }}>
            <text x="18" y="312" class="pt">·</text><text x="28" y="312" class="legend">{t('the state is per request, so many requests sit in code2wav at once, each at its own point', '状态按 request 保存，因此多个 request 可同时处于 code2wav 中，各在自己的进度上')}</text>
            <text x="18" y="329" class="pt">·</text><text x="28" y="329" class="legend">{t(`a decode needs ${CHUNK} new frames, except the last, which goes out when the talker says it is done`, `一次解码需要 ${CHUNK} 个新帧，最后一次除外：talker 说结束时即送出`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('blue: received, not yet sound · dark: sent as sound · bracket: the window being decoded (step 5) · times illustrative', '蓝：已收到、尚未成声 · 深色：已作为声音送出 · 括线：正在解码的窗口（第 5 步）· 时间仅为示意')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`SGLang-Omni's Code2WavScheduler, on StreamingVocoderBase: keep frames, decode the new part, send it, flush the rest at the end`, 'SGLang-Omni 的 Code2WavScheduler，基于 StreamingVocoderBase：保留帧，解码新部分并送出，结束时送出剩余')}</text>
        </g>
      {/if}

      {#if cur.scene === 'seam'}
        {@const MID = { a: 136, b: 236 }}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`joining chunks · each window adds the frames before it, up to ${LEFT}`, `拼接 chunk · 每个窗口加入它前面的帧，最多 ${LEFT} 个`)}</text>
          {#each [0, 10, 20] as f}<text x={fx(f)} y="64" text-anchor="middle" class="tag">{t(`frame ${f}`, `帧 ${f}`)}</text>{/each}

          <!-- decoded alone: chunk 2 jumps at the seam -->
          <text x="16" y="88" class="boxtitle">{t('DECODED ALONE', '单独解码')}</text>
          <text x="16" y="105" class="tag strong">{t("code2wav's input", 'code2wav 的输入')}</text>
          <rect x={fx(0) + 1} y="92" width={CHUNK * FPX - 2} height="20" fill={C2W} opacity="0.85" />
          <text x={fx(CHUNK / 2)} y="106" text-anchor="middle" class="steplabel">{t('window 1', '窗口 1')}</text>
          <rect x={fx(CHUNK) + 1} y="92" width={CHUNK * FPX - 2} height="20" fill={C2W} opacity="0.85" />
          <text x={fx(CHUNK * 1.5)} y="106" text-anchor="middle" class="steplabel">{t('window 2: frames 11–20 only', '窗口 2：仅帧 11–20')}</text>
          <text x="16" y={MID.a + 4} class="tag strong">{t('sound sent', '送出的声音')}</text>
          <path d={wavePath(0, CHUNK, MID.a)} fill="none" stroke="var(--fg)" stroke-width="1.6" />
          <path d={wavePath(CHUNK, 2 * CHUNK, MID.a, alone)} fill="none" stroke="var(--fg)" stroke-width="1.6" />
          <circle cx={fx(CHUNK)} cy={MID.a - 11 * (wave(CHUNK) + 0.55)} r="13" fill="none" stroke={RED} stroke-width="1.5" />
          <text x={fx(2 * CHUNK) + 14} y={MID.a + 4} class="tag strong" style:fill={RED}>{t("chunk 2's start", 'chunk 2 的开头')}</text>
          <text x={fx(2 * CHUNK) + 14} y={MID.a + 17} class="tag strong" style:fill={RED}>{t("misses chunk 1's end", '缺了 chunk 1 的结尾')}</text>

          <!-- with the frames before it: decode both, send only the new part -->
          <text x="16" y="188" class="boxtitle">{t('WITH THE FRAMES BEFORE IT', '带上前面的帧')}</text>
          <text x="16" y="205" class="tag strong">{t("code2wav's input", 'code2wav 的输入')}</text>
          <rect x={fx(0) + 1} y="192" width={CHUNK * FPX - 2} height="20" fill={REST_FILL} stroke="var(--muted)" stroke-dasharray="3 2" />
          <text x={fx(CHUNK / 2)} y="206" text-anchor="middle" class="tag">{t('frames 1–10 again', '帧 1–10 再来一次')}</text>
          <rect x={fx(CHUNK) + 1} y="192" width={CHUNK * FPX - 2} height="20" fill={C2W} opacity="0.85" />
          <text x={fx(CHUNK * 1.5)} y="206" text-anchor="middle" class="steplabel">{t('frames 11–20, new', '帧 11–20，新')}</text>
          <text x="16" y={MID.b + 4} class="tag strong">{t('sound sent', '送出的声音')}</text>
          <path d={wavePath(0, CHUNK, MID.b)} fill="none" stroke="var(--fg)" stroke-width="1.6" />
          <path d={wavePath(CHUNK, 2 * CHUNK, MID.b)} fill="none" stroke={TLK} stroke-width="1.8" />
          <text x={fx(2 * CHUNK) + 14} y={MID.b + 4} class="tag strong" style:fill={TLK}>{t('chunk 2 carries on', 'chunk 2 接续')}</text>
          <text x={fx(2 * CHUNK) + 14} y={MID.b + 17} class="tag strong" style:fill={TLK}>{t('from chunk 1', '自 chunk 1')}</text>

          <!-- how many frames before: all there are, up to 25 -->
          <text x="16" y="282" class="boxtitle">{t('EACH WINDOW', '每个窗口')}</text>
          <text x="150" y="282" class="tag">{t(`window: frames before it, up to ${LEFT}, + ${CHUNK} new = frames decoded`, `窗口：前面的帧，最多 ${LEFT} 个，+ ${CHUNK} 个新帧 = 解码的帧数`)}</text>
          {#each [1, 2, 3, 4, 5] as k, i}
            {@const earlier = Math.min(LEFT, (k - 1) * CHUNK)}
            {@const x0 = 150 + i * 112}
            <rect x={x0} y="292" width={earlier * 2.4} height="18" fill={REST_FILL} stroke="var(--muted)" stroke-dasharray="3 2" />
            <rect x={x0 + earlier * 2.4} y="292" width={CHUNK * 2.4} height="18" fill={C2W} opacity="0.85" />
            <text x={x0} y="326" class="tag strong">{k}: {earlier} + {CHUNK} = {earlier + CHUNK}</text>
          {/each}
          <text x="16" y="352" class="legend">{t('code2wav keeps nothing from one window to the next, so the frames before have to go in again', 'code2wav 在窗口之间不保留任何东西，所以前面的帧必须重新输入')}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`earlier frames, dashed, up to ${LEFT}: decoded again, their sound thrown away · dark: new frames, whose sound is sent · waves illustrative`, `虚线为更早的帧，最多 ${LEFT} 个：再次解码，声音丢弃 · 深色：新帧，其声音送出 · 波形仅为示意`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`code2wav keeps the last ${CHUNK} × ${fmt(SAMPLES_PER_FRAME)} samples of each window (left_context_size = ${LEFT})`, `code2wav 保留每个窗口最后 ${CHUNK} × ${fmt(SAMPLES_PER_FRAME)} 个采样（left_context_size = ${LEFT}）`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'size'}
        {@const LX = 150}
        {@const RX = 450}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('how big a chunk · a sooner first sound against more work', 'chunk 多大 · 更早的第一段声音，代价是更多计算')}</text>
          <text x={LX} y="78" class="boxtitle">{t('the first sound waits for', '第一段声音需等待')}</text>
          <text x={RX} y="72" class="boxtitle">{t('times each frame is decoded', '每帧被解码的次数')}</text>
          <text x={RX} y="85" class="tag">{t('lower is less GPU work · without streaming, once', '越低 GPU 工作越少 · 非流式为一次')}</text>
          <line x1={RX + 13} y1="90" x2={RX + 13} y2="296" stroke="var(--muted)" stroke-dasharray="3 3" />
          <text x={RX + 13} y="306" text-anchor="middle" class="tag">{t('once', '一次')}</text>
          {#each SIZES as r, i}
            {@const y = 92 + i * 40}
            {@const n = r.then ?? r.n}
            <g in:fade={{ delay: 100 + i * 150, duration: 250 }}>
              {#if r.def}<rect x="8" y={y - 6} width="704" height="36" rx="6" fill="#fbfaf7" stroke="var(--line)" />{/if}
              <text x="16" y={y + 13} class="tag strong">{r.then ? t(`${r.n} first, then ${r.then}`, `先 ${r.n} 后 ${r.then}`) : t(`chunks of ${r.n}`, `每 chunk ${r.n} 帧`)}</text>
              {#if r.def}<text x="16" y={y + 26} class="tag">{t("SGLang-Omni's default", 'SGLang-Omni 默认')}</text>{/if}
              {#if r.then}<text x="16" y={y + 26} class="tag">{t('proposed, PR #2800', '提议方案，PR #2800')}</text>{/if}
              <rect x={LX} y={y} width={r.n * 8} height="18" rx="3" fill={TLK} opacity="0.8" />
              <text x={LX + r.n * 8 + 8} y={y + 13} class="tag strong">{t(`${r.n} frames · ${r.n * STEPS} steps`, `${r.n} 帧 · ${r.n * STEPS} 步`)}</text>
              <rect x={RX} y={y} width={r.work * 13} height="18" rx="3" fill={C2W} opacity="0.8" />
              <text x={RX + r.work * 13 + 8} y={y + 13} class="tag strong">{t(`${+r.work.toFixed(2)} times`, `${+r.work.toFixed(2)} 次`)}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 900 }}>
            <text x="18" y="322" class="pt">·</text><text x="28" y="322" class="legend">{t(`each frame is decoded once as new, then again as context for the next windows (step 5): (${LEFT} + ${CHUNK}) ÷ ${CHUNK} = ${(LEFT + CHUNK) / CHUNK}`, `每帧作为新帧解码一次，之后又作为后续窗口的上下文再次解码（第 5 步）：(${LEFT} + ${CHUNK}) ÷ ${CHUNK} = ${(LEFT + CHUNK) / CHUNK}`)}</text>
            <text x="18" y="339" class="pt">·</text><text x="28" y="339" class="legend">{t(`measured, ${SMALL_FIRST_N} first then ${CHUNK}: first sound p95 0.61 → 0.48 s on one H200, requests per second 12.79 → 12.64`, `实测，先 ${SMALL_FIRST_N} 后 ${CHUNK}：一张 H200 上首声 p95 0.61 → 0.48 s，每秒 request 数 12.79 → 12.64`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`${STEPS} steps a frame (step 3) · times decoded: once ${LEFT} earlier frames exist (step 5) · chunks of N: (${LEFT} + N) ÷ N`, `每帧 ${STEPS} 步（第 3 步）· 解码次数：存在 ${LEFT} 个更早的帧时（第 5 步）· 每 chunk N 帧：(${LEFT} + N) ÷ N`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('p95: the time 19 in 20 first sounds beat · 16 requests at once, the window change alone (PR #2800, still open)', 'p95：20 个首段声音中有 19 个快于该时间 · 同时 16 个 request，仅改变窗口（PR #2800，仍未合并）')}</text>
        </g>
      {/if}

      {#if ANIM[cur.scene]}<LoopProgress ms={lapMs} {lap} />{/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>
