<script lang="ts">
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import type { Deep } from '../../deep';
  import LoopProgress from '../LoopProgress.svelte';
  import { chapterNumber as chNum, type NavLink } from '../../chapters';
  import { HBM_GB, BYTES, OMNI_PARAMS_B as P, OMNI_KB_PER_TOKEN as KV_KB, AUDIO_FRAMES_PER_SEC, AUDIO_POS_PER_100 } from '../../numbers';
  import { lang } from '../../i18n';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  const CH_KV = chNum('07-kv-memory'), CH_PREFIX = chNum('08-prefix-caching'), CH_OMNI = chNum('16-omni-models'), CH_STAGES = chNum('17-stages-and-schedulers'), CH_BETWEEN = chNum('18-between-stages'), CH_GPUS = chNum('19-sharing-gpus');
  const fmt = (n: number) => n.toLocaleString('en-US');
  const f1 = (n: number) => n.toFixed(1);

  // MiniCPM-o 4.5, the native full-duplex model SGLang-Omni serves: it takes the listener's audio a second at a time
  const CALL_S = 60;                                                     // a one-minute call
  const CALL_UNITS = CALL_S;
  const UNIT_S = 1;                                                      // a unit's length, in seconds
  const UNITS_SHOWN = 4;                                                 // units step 2 plays through the stages

  // the closing: Qwen3-Omni's thinker keeps 13 positions of KV per second of listening (Ch. 16 Step 2), 96 KB each
  const POS_PER_S = (AUDIO_FRAMES_PER_SEC * AUDIO_POS_PER_100) / 100;     // 13
  const CALL_MIN = 30;
  const CALL_KV_GB = (CALL_MIN * 60 * POS_PER_S * KV_KB) / 1e6;          // 2.2
  const GPU0_W = (P.thinker + P.audio + P.vision + P.code2wav) * BYTES;   // 63.8, GPU 0 of the default layout (Ch. 19 Step 1)
  const CALLS_FIT = Math.floor((HBM_GB - GPU0_W) / CALL_KV_GB);          // 7

  // step 1: the same eleven seconds of the listener, served turn-based behind a VAD and full duplex. Times in seconds.
  const DX0 = 150, DPX = 50, DUPLEX_S = 11;
  const dx = (s: number) => DX0 + s * DPX;
  const VAD_MS = 800;                                                    // Qwen3-Omni's VAD: this much silence ends a turn
  const LISTENER = [{ a: 0, b: 1.6, n: 'is it cold…', nZh: '外面冷吗…' }, { a: 2.8, b: 4.3, n: '…in Paris?', nZh: '…巴黎呢？' }, { a: 6.6, b: 7.5, n: 'mm-hm', nZh: 'mm-hm' }];
  const SILENT = [1.6, 4.3, 7.5].map((a) => ({ a, b: a + VAD_MS / 1000 }));   // the silence the VAD waits out after each stretch of speech
  const TURNS = [{ a: 2.4, b: 2.8, n: '', nZh: '', cut: true }, { a: 5.1, b: 6.6, n: 'the answer', nZh: '回答', cut: true }, { a: 8.3, b: DUPLEX_S, n: 'a reply to “mm-hm”', nZh: '对“mm-hm”的回应', cut: false }];
  const SPEAK_FROM = 5;                                                  // the full-duplex model listens through units 1–5, then speaks
  const DUPLEX = [{ a: SPEAK_FROM, b: DUPLEX_S, n: 'the answer', nZh: '回答', cut: false }];

  type Scene = 'duplex' | 'units' | 'forget' | 'session' | 'needs' | 'hooks' | 'queue' | 'closing';
  const steps: { scene: Scene; caption: string; captionZh: string }[] = [
    { scene: 'duplex', caption: `A turn-based server finds turns with a voice detector (VAD): ${VAD_MS} ms of silence ends a turn, and any speech stops the reply. In full duplex the model hears while it speaks and decides itself.`, captionZh: `轮替式服务器靠语音检测器（VAD）找轮次：${VAD_MS} ms 静音结束一轮，任何语音都打断回复。全双工下模型边说边听，自己决定。` },
    { scene: 'units', caption: `So the server cuts the incoming audio into units, a second each for MiniCPM-o, and each unit goes through the stages as a request of its own. A one-minute call is ${CALL_UNITS} requests through every stage.`, captionZh: `于是服务器把进来的音频切成单元，MiniCPM-o 每个一秒，每个单元作为独立 request 走过各 stage。一分钟通话就是 ${CALL_UNITS} 个 request 穿过每个 stage。` },
    { scene: 'forget', caption: `A request carries everything it needs, and each stage forgets it once it ends (Ch. ${CH_KV} Step 5). In a full-duplex model every unit is a request, so between units the model forgets everything it heard and said.`, captionZh: `request 自带所需的一切，结束时每个 stage 就忘掉它（Ch. ${CH_KV} Step 5）。全双工模型里每个单元都是 request，单元之间模型会忘掉听到和说过的一切。` },
    { scene: 'session', caption: `A session is one conversation the server keeps open. The client opens it, appends a unit at a time for as long as it lasts, and closes it. In between, each stage keeps that session's state.`, captionZh: `session 是服务器保持打开的一段对话。客户端打开它，通话期间一次追加一个单元，最后关闭它。这期间每个 stage 都保存该 session 的状态。` },
    { scene: 'needs', caption: `Sessions need three things at once. Each stage keeps a state per session, each unit goes in only after the one before it, and every state stays on the GPU until close.`, captionZh: `session 同时需要三件事。每个 stage 为每个 session 保存一份状态，每个单元在前一个之后才进入，所有状态留在 GPU 上直到关闭。` },
    { scene: 'hooks', caption: `Session operations reach each stage as requests tagged omni_session. The stage calls the matching hook: open creates the session's state, append runs a unit on it, close frees it.`, captionZh: `session 操作以带 omni_session 标记的 request 到达各 stage。stage 调用对应的 hook：open 创建该 session 的状态，append 在其上运行一个单元，close 释放它。` },
    { scene: 'queue', caption: `The server holds the listener's audio as it arrives and sends one unit through all four stages before the next. So each unit must finish within its own ${UNIT_S} s, or the audio left waiting keeps growing.`, captionZh: `服务器边收边存听众的音频，一个单元走完全部四个 stage 才送下一个。所以每个单元必须在自己的 ${UNIT_S} s 内完成，否则等待的音频越积越多。` },
    { scene: 'closing', caption: `Every open session keeps its KV cache on the GPU for the whole call: half an hour of listening is ${f1(CALL_KV_GB)} GB of the thinker's alone, so about ${CALLS_FIT} fit beside its weights.`, captionZh: `每个打开的 session 整个通话期间都把 KV cache 留在 GPU 上：半小时收听仅 thinker 就占 ${f1(CALL_KV_GB)} GB，所以权重旁约放得下 ${CALLS_FIT} 个。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);

  // step 2: units through MiniCPM-o's four stages, each the counterpart of a Qwen3-Omni stage (Ch. 17 Step 4)
  const STAGES = [
    { n: 'perception', q: 'the encoders', qZh: '各编码器', keeps: 'audio encoder state', keepsZh: '音频编码器状态' }, { n: 'thinker', q: 'thinker', qZh: 'thinker', keeps: 'KV cache', keepsZh: 'KV cache' },
    { n: 'talker', q: 'talker', qZh: 'talker', keeps: 'KV cache', keepsZh: 'KV cache' }, { n: 'speech', q: 'code2wav', qZh: 'code2wav', keeps: 'vocoder state', keepsZh: '声码器状态' },
  ];
  const SPEAKS = [false, false, true, true];                             // the model listens through units 1–2 and speaks from unit 3
  const UNIT_MS = 2600, HOP_MS = 450;

  // step 3: three units, each a request that is forgotten when it ends
  const FORGET_MS = 3600, RUN_MS = 2200;

  // step 4: a session's life, in ms: open (upstream first), three appends, close (downstream first).
  // Each `now:` line holds HOLD; within an append the unit hops a stage every HOP.
  const HOLD = 5000, OPEN_AT = 2500, STAGGER = 600, HOP = 500;
  const APPEND_AT = OPEN_AT + HOLD, CLOSE_AT = APPEND_AT + 3 * HOLD;
  const SESSION_SPAN = CLOSE_AT + HOLD + 2500;                            // 'closed' shows for the last 2.5 s, then the rest
  const sessionStatus = (ms: number) => {
    if (ms < OPEN_AT) return t('the client asks to open a session', '客户端请求打开一个 session');
    if (ms < APPEND_AT) return t('open: each stage creates the session\'s state, upstream first', 'open：每个 stage 创建该 session 的状态，上游先行');
    if (ms < CLOSE_AT) { const k = Math.floor((ms - APPEND_AT) / HOLD); return t(`append: unit ${k + 1} through every stage; each adds to its state`, `append：单元 ${k + 1} 穿过每个 stage，各自累加到自己的状态`); }
    if (ms < CLOSE_AT + HOLD) return t('close: each stage frees the session\'s state, downstream first', 'close：每个 stage 释放该 session 的状态，下游先行');
    return t('closed: nothing is kept', 'closed：什么都不保留');
  };

  // step 6: three tagged requests reach the thinker, each held HOOK_MS; its hook fires HOOK_FIRE in
  const HOOKS = [
    { op: 'open', s: 'C', does: 'create the state', doesZh: '创建状态', now: 'open for session C creates its state, empty for now', nowZh: '为 session C 执行 open：创建它的状态，暂时为空' },
    { op: 'append', s: 'A', does: 'run the unit on it', doesZh: '在其上运行单元', now: 'append for session A runs unit 3 on A\'s state and adds it', nowZh: '为 session A 执行 append：在 A 的状态上运行单元 3 并累加进去' },
    { op: 'close', s: 'B', does: 'free the state', doesZh: '释放状态', now: 'close for session B frees B\'s state', nowZh: '为 session B 执行 close：释放 B 的状态' },
  ];
  const HOOK_MS = 5000, HOOK_FIRE = 1200;
  const hookDone = (ms: number, k: number) => ms >= k * HOOK_MS + HOOK_FIRE;
  const sessionsAt = (ms: number) => [
    { s: 'A', units: hookDone(ms, 1) ? 3 : 2, on: true },
    { s: 'B', units: 4, on: !hookDone(ms, 2) },
    { s: 'C', units: 0, on: hookDone(ms, 0) },
  ];

  // step 7: a unit arrives every UNIT_S and goes through the stages one at a time. Unit k (1-based) is the audio
  // from k − 1 to k, ready at k; it starts once it is ready and the unit before it is done.
  const QUEUE_S = 12, MAX_WAITING_S = 60;                                // the server holds at most 60 s of audio (max_input_bytes)
  const PACES = [{ d: 0.8, t: 'EACH UNIT TAKES 0.8 S · IT KEEPS UP', tZh: '每个单元耗时 0.8 S · 跟得上' }, { d: 1.5, t: 'EACH UNIT TAKES 1.5 S · IT FALLS BEHIND', tZh: '每个单元耗时 1.5 S · 跟不上' }];
  const startOf = (k: number, d: number) => { let s = 0; for (let j = 1; j <= k; j++) s = Math.max(j * UNIT_S, s + (j > 1 ? d : 0)); return s; };
  // the first second at which more than MAX_WAITING_S of audio is held at the slow pace: about 3 minutes
  const REJECT_S = (() => { const d = PACES[1].d; for (let sec = 1; ; sec++) { let done = 0; while (startOf(done + 1, d) + d <= sec) done++; if (sec - done * UNIT_S > MAX_WAITING_S) return sec; } })();


  // the animated steps play a stretch of time (span, in ms) at a speed, rest, and loop; `once` plays it once and stops
  const ANIM: Partial<Record<Scene, [number, number, once?: boolean]>> = {
    duplex: [DUPLEX_S * 1000, 1], units: [UNITS_SHOWN * UNIT_MS + 400, 1], forget: [3 * FORGET_MS, 1], session: [SESSION_SPAN, 1],
    hooks: [HOOKS.length * HOOK_MS, 1], queue: [QUEUE_S * 1000, 1, true],
  };
  const REST = 2500;
  let clock = $state(0);
  let lap = $state(0), lapMs = $state(0);           // the looping step's laps, for LoopProgress
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });   // untracked, so starting a lap does not re-run the effect
  $effect(() => {
    const anim = ANIM[cur.scene];
    if (!anim) return;
    const [span, slow, once] = anim;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { clock = span; return; }
    const lapLen = span * slow + REST;
    let raf = 0, t0 = 0;
    const tick = (now: number) => {
      if (!t0 || (!once && now - t0 >= lapLen)) { t0 = now; if (!once) nextLap(lapLen); }
      clock = Math.min(span, (now - t0) / slow);
      if (!once || clock < span) raf = requestAnimationFrame(tick);
    };
    clock = 0;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const W = 720, H = 400;
  const RED = 'var(--eos)';
  const LIS = 'var(--gen)', MOD = 'var(--accent)';
  const REST_FILL = '#f6f4ee';

</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Full duplex, step {step + 1}">
      <defs>
        {#each [['fd-arrow', '#b8b4aa'], ['fd-arrow-fg', 'var(--fg)'], ['fd-arrow-mod', 'var(--accent)'], ['fd-arrow-gen', 'var(--gen)']] as [id, c]}
          <marker {id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
          </marker>
        {/each}
      </defs>

      {#if cur.scene === 'duplex'}
        {@const ts = clock / 1000}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('turn-based or full duplex · who decides when the model talks', '轮替式还是全双工 · 谁决定模型何时开口')}</text>
          {#each [
            { t: t('TURN-BASED · A VAD DECIDES', '轮替式 · 由 VAD 决定'), rule: t(`by rule: ${VAD_MS} ms of silence ends a turn, and any speech stops a reply`, `按规则：${VAD_MS} ms 静音结束一轮，任何语音都打断回复`), y: 70, model: TURNS, full: false },
            { t: t('FULL DUPLEX · THE MODEL DECIDES', '全双工 · 由模型决定'), rule: t('MiniCPM-o 4.5, once a second, from what it has heard', 'MiniCPM-o 4.5，每秒一次，依据听到的内容'), y: 178, model: DUPLEX, full: true },
          ] as p}
            <text x="16" y={p.y} class="boxtitle">{p.t}</text>
            <text x={p.full ? 262 : 214} y={p.y} class="tag">{p.rule}</text>
            {#each [{ n: t('the listener', '听众'), y: p.y + 10, segs: LISTENER, c: LIS }, { n: t('the model', '模型'), y: p.y + 38, segs: p.model, c: MOD }] as r}
              <text x="16" y={r.y + 15} class="tag strong">{r.n}</text>
              <rect x={DX0} y={r.y} width={DUPLEX_S * DPX} height="22" rx="4" fill="#fbfaf7" stroke="var(--line)" />
              {#each r.segs as sg}
                {@const w = clamp(ts - sg.a, 0, sg.b - sg.a) * DPX}
                {#if w > 0}<rect x={dx(sg.a)} y={r.y} width={w} height="22" rx="4" fill={r.c} opacity="0.8" />{/if}
                {#if sg.n}<text x={dx((sg.a + sg.b) / 2)} y={r.y + 15} text-anchor="middle" class="steplabel" style:opacity={ts >= Math.min(sg.b - 0.2, (sg.a + sg.b) / 2 + 0.8) ? 1 : 0} style="transition: opacity 200ms">{t(sg.n, sg.nZh)}</text>{/if}
              {/each}
            {/each}
            {#if !p.full}
              <!-- the VAD: each stretch of silence it waits out, and the replies it stops -->
              {#each SILENT as s}
                <g style:opacity={ts >= s.a ? 1 : 0} style="transition: opacity 200ms">
                  <rect x={dx(s.a) + 1} y={p.y + 12} width={(s.b - s.a) * DPX - 2} height="18" rx="3" fill="#ebe8e0" />
                  <text x={dx((s.a + s.b) / 2)} y={p.y + 25} text-anchor="middle" class="tag">{VAD_MS} ms</text>
                </g>
              {/each}
              {#each TURNS.filter((r) => r.cut) as r}
                <line x1={dx(r.b)} y1={p.y + 34} x2={dx(r.b)} y2={p.y + 64} stroke={RED} stroke-width="2" style:opacity={ts >= r.b ? 1 : 0} />
              {/each}
              <text x={dx(TURNS[0].a)} y={p.y + 76} class="tag strong" style:fill={RED} style:opacity={ts >= TURNS[0].b ? 1 : 0} style="transition: opacity 250ms">{t('half the question', '只答了半个问题')}</text>
              <text x={dx(TURNS[1].a)} y={p.y + 76} class="tag strong" style:fill={RED} style:opacity={ts >= TURNS[1].b ? 1 : 0} style="transition: opacity 250ms">{t('stopped by “mm-hm”', '被“mm-hm”打断')}</text>
            {:else}
              <!-- one decision a second: listen or speak -->
              <text x="16" y={p.y + 79} class="tag strong">{t('decides, each second', '每秒决定一次')}</text>
              {#each Array.from({ length: DUPLEX_S }) as _, k}
                {@const sp = k >= SPEAK_FROM}
                <g style:opacity={ts >= k ? 1 : 0} style="transition: opacity 200ms">
                  <rect x={dx(k) + 2} y={p.y + 66} width={DPX - 4} height="18" rx="3" fill={sp ? 'var(--accent-soft)' : REST_FILL} stroke={sp ? MOD : 'var(--line)'} />
                  <text x={dx(k) + DPX / 2} y={p.y + 79} text-anchor="middle" class="tag strong" style:fill={sp ? MOD : 'var(--muted)'}>{sp ? t('speak', '说') : t('listen', '听')}</text>
                </g>
              {/each}
              <text x={dx(1.4)} y={p.y + 100} class="tag strong" style:fill={MOD} style:opacity={ts >= 3 ? 1 : 0} style="transition: opacity 250ms">{t('listens through the pause', '停顿期间一直在听')}</text>
              <text x={dx(LISTENER[2].a)} y={p.y + 100} class="tag strong" style:fill={MOD} style:opacity={ts >= LISTENER[2].b ? 1 : 0} style="transition: opacity 250ms">{t('hears “mm-hm”, keeps talking', '听到“mm-hm”，继续说')}</text>
            {/if}
            <!-- now -->
            <line x1={dx(ts)} y1={p.y + 6} x2={dx(ts)} y2={p.y + (p.full ? 86 : 64)} stroke="var(--fg)" opacity="0.35" />
          {/each}
          {#each [0, 2, 4, 6, 8, 10] as s}<text x={dx(s)} y="306" text-anchor="middle" class="tag">{s} s</text>{/each}
          <line x1={DX0} y1="294" x2={dx(DUPLEX_S)} y2="294" stroke="var(--faint)" marker-end="url(#fd-arrow)" />
          <g in:fade={{ delay: 300 }}>
            <text x="18" y="330" class="pt">·</text><text x="28" y="330" class="legend">{t('a VAD hears only whether someone is speaking: a pause ends the turn, and “mm-hm” stops the reply', 'VAD 只听是否有人在说话：停顿结束一轮，“mm-hm”打断回复')}</text>
            <text x="18" y="347" class="pt">·</text><text x="28" y="347" class="legend">{t('a full-duplex model hears the words while it speaks, and decides from them whether to listen or speak', '全双工模型边说边听词语，并据此决定是听还是说')}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`amber: the listener · blue: the model · grey: the ${VAD_MS} ms of silence the VAD waits for · red: a reply stopped · times illustrative`, `琥珀色：听众 · 蓝色：模型 · 灰色：VAD 等待的 ${VAD_MS} ms 静音 · 红色：被打断的回复 · 时间为示意`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('SGLang-Omni serves Qwen3-Omni turn-based with a Silero VAD in front; MiniCPM-o 4.5 decides every 1 s, PersonaPlex every 80 ms', 'SGLang-Omni 用前置 Silero VAD 轮替式服务 Qwen3-Omni；MiniCPM-o 4.5 每 1 s 决定一次，PersonaPlex 每 80 ms')}</text>
        </g>
      {/if}

      {#if cur.scene === 'units'}
        {@const k = Math.min(UNITS_SHOWN - 1, Math.floor(clock / UNIT_MS))}
        {@const local = clock - k * UNIT_MS}
        {@const hop = clamp(Math.floor((local - 300) / HOP_MS), -1, STAGES.length)}
        {@const UX0 = 150}
        {@const UPX = 64}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('a conversation as units · the listener\'s audio, a second at a time', '对话切成单元 · 听众的音频，一次一秒')}</text>
          <!-- the incoming audio, cut into units -->
          <text x="16" y="88" class="tag strong">{t('the listener', '听众')}</text>
          {#each Array.from({ length: 8 }) as _, u}
            <rect x={UX0 + u * UPX + 1} y="74" width={UPX - 2} height="22" rx="3" fill={u === k ? LIS : 'var(--gen-soft)'} stroke="var(--gen)" opacity={u <= k ? 1 : 0.4} />
            <text x={UX0 + u * UPX + UPX / 2} y="89" text-anchor="middle" class="tag strong" style:fill={u === k ? 'white' : 'var(--fg)'}>{t(`unit ${u + 1}`, `单元 ${u + 1}`)}</text>
          {/each}
          <text x={UX0 + 8 * UPX + 6} y="89" class="tag">{t('1 s each', '每个 1 s')}</text>

          <!-- the four stages; the current unit hops through them -->
          {#each STAGES as sg, i}
            {@const x0 = 150 + i * 140}
            <rect x={x0} y="140" width="112" height="34" rx="7" fill={hop === i ? 'var(--accent-soft)' : 'white'} stroke={hop === i ? MOD : 'var(--fg)'} stroke-width={hop === i ? 2 : 1} />
            <text x={x0 + 56} y="161" text-anchor="middle" class="mono strong">{sg.n}</text>
            <text x={x0 + 56} y="190" text-anchor="middle" class="tag">Qwen3-Omni: {t(sg.q, sg.qZh)}</text>
            {#if i < STAGES.length - 1}<line x1={x0 + 114} y1="157" x2={x0 + 138} y2="157" stroke="var(--faint)" marker-end="url(#fd-arrow)" />{/if}
          {/each}
          <path d="M {UX0 + k * UPX + UPX / 2} 98 V 116 H 206 V 137" fill="none" stroke="var(--gen)" stroke-dasharray="3 2" marker-end="url(#fd-arrow-gen)" />
          <text x="16" y="161" class="tag strong">{t(`unit ${k + 1}, as a request`, `单元 ${k + 1}，作为 request`)}</text>

          <!-- what comes back for each unit: sound or silence -->
          <text x="16" y="246" class="tag strong">{t('the model', '模型')}</text>
          {#each Array.from({ length: 8 }) as _, u}
            {@const done = u < k || (u === k && hop >= STAGES.length)}
            <rect x={UX0 + u * UPX + 1} y="232" width={UPX - 2} height="22" rx="3" fill={done && SPEAKS[u] ? MOD : REST_FILL} stroke={done ? (SPEAKS[u] ? MOD : 'var(--line)') : 'var(--line)'} opacity={done ? 0.85 : 0.35} />
            {#if done}<text x={UX0 + u * UPX + UPX / 2} y="247" text-anchor="middle" class="tag strong" style:fill={SPEAKS[u] ? 'white' : 'var(--muted)'}>{SPEAKS[u] ? t('speaks', '说') : t('listens', '听')}</text>{/if}
          {/each}
          <path d="M 684 157 H 702 V 212 H {UX0 + k * UPX + UPX / 2} V 229" fill="none" stroke={MOD} stroke-dasharray="3 2" marker-end="url(#fd-arrow-mod)" style:opacity={hop >= STAGES.length ? 1 : 0} />
          <text x="16" y="292" class="legend strong">{t(`requests so far, through every stage: ${k + (hop >= STAGES.length ? 1 : 0)}`, `至今已穿过每个 stage 的 request：${k + (hop >= STAGES.length ? 1 : 0)}`)}</text>

          <g in:fade={{ delay: 300 }}>
            <text x="18" y="322" class="pt">·</text><text x="28" y="322" class="legend">{t('each unit goes through all four stages, and what comes back is a second of sound or of silence', '每个单元走过全部四个 stage，回来的是一秒声音或一秒沉默')}</text>
            <text x="18" y="339" class="pt">·</text><text x="28" y="339" class="legend">{t(`the listener keeps talking while it does: unit ${k + 2} is already arriving`, `这期间听众一直在说：单元 ${k + 2} 已经在到达`)}</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`MiniCPM-o 4.5's stages beside Qwen3-Omni's (Ch. ${CH_STAGES} Step 4): perception holds its audio and image encoders, speech its vocoder`, `MiniCPM-o 4.5 与 Qwen3-Omni 的 stage 对照（Ch. ${CH_STAGES} Step 4）：perception 含音频和图像编码器，speech 含声码器`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'forget'}
        {@const k = Math.min(2, Math.floor(clock / FORGET_MS))}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('what a request is · everything it needs comes with it, and it is forgotten at its end', 'request 是什么 · 所需的一切都随它而来，结束时即被忘掉')}</text>
          <text x="16" y="92" class="tag strong">{t('the request', '该 request')}</text>
          <text x="16" y="160" class="tag strong">{t('the thinker\'s', 'thinker 的')}</text>
          <text x="16" y="174" class="tag strong">KV cache</text>
          <text x="16" y="226" class="tag strong">{t('what it knows', '它知道什么')}</text>
          {#each [0, 1, 2] as i}
            {@const x0 = 150 + i * 186}
            {@const local = clock - i * FORGET_MS}
            {@const on = local >= 0}
            {@const fill = clamp(local / RUN_MS, 0, 1)}
            {@const freed = local >= RUN_MS}
            <g style:opacity={on ? (i < k ? 0.55 : 1) : 0} style="transition: opacity 250ms">
              <rect x={x0} y="76" width="166" height="26" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={x0 + 83} y="93" text-anchor="middle" class="tag strong">{t(`unit ${i + 1}: its 1 s of audio`, `单元 ${i + 1}：它的 1 s 音频`)}</text>
              <line x1={x0 + 83} y1="104" x2={x0 + 83} y2="122" stroke="var(--faint)" marker-end="url(#fd-arrow)" />
              <rect x={x0} y="126" width="166" height="62" rx="6" fill="white" stroke="var(--fg)" />
              <rect x={x0 + 6} y={182 - fill * 50} width="154" height={fill * 50} rx="3" fill={LIS} opacity={freed ? 0.12 : 0.75} style="transition: opacity 400ms" />
              <text x={x0 + 83} y="162" text-anchor="middle" class="tag strong" style:fill={freed ? RED : 'white'} style:opacity={fill > 0.5 ? 1 : 0}>{freed ? t('freed at the end', '结束时释放') : t(`unit ${i + 1}'s tokens`, `单元 ${i + 1} 的 token`)}</text>
              <text x={x0 + 83} y="226" text-anchor="middle" class="tag strong">{i === 0 ? t('unit 1 only', '只有单元 1') : t(`unit ${i + 1} only: nothing`, `只有单元 ${i + 1}：没有`)}</text>
              {#if i > 0}<text x={x0 + 83} y="240" text-anchor="middle" class="tag strong" style:fill={RED}>{t(`of unit ${i === 1 ? '1' : '1 or 2'}`, `单元 ${i === 1 ? '1' : '1 或 2'} 的内容`)}</text>{/if}
            </g>
          {/each}
          <g in:fade={{ delay: 300 }}>
            <text x="18" y="290" class="pt">·</text><text x="28" y="290" class="legend">{t('a request carries everything it needs, and each stage frees what it built for it when it ends', 'request 自带所需的一切，结束时每个 stage 释放为它建立的东西')}</text>
            <text x="18" y="307" class="pt">·</text><text x="28" y="307" class="legend">{t('a full-duplex model\'s request is one unit: 1 s of audio for MiniCPM-o, 80 ms for PersonaPlex', '全双工模型的 request 就是一个单元：MiniCPM-o 为 1 s 音频，PersonaPlex 为 80 ms')}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('the talker\'s KV cache and the running state of perception and of the vocoder are freed the same way', 'talker 的 KV cache、perception 和声码器的运行状态也以同样方式释放')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`Ch. ${CH_PREFIX} Step 6's prefix cache reuses a resent text history; audio enters as embeddings it cannot match, and it can evict (Ch. ${CH_PREFIX} Step 7)`, `Ch. ${CH_PREFIX} Step 6 的前缀缓存复用重发的文本历史；音频以它无法匹配的 embedding 进入，且可被驱逐（Ch. ${CH_PREFIX} Step 7）`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'session'}
        {@const OPS = ['open', 'append 1', 'append 2', 'append 3', 'close']}
        {@const opIdx = clock < APPEND_AT ? 0 : clock < CLOSE_AT ? 1 + Math.floor((clock - APPEND_AT) / HOLD) : 4}
        {@const appended = clock < APPEND_AT ? 0 : Math.min(3, Math.floor((clock - APPEND_AT) / HOLD) + 1)}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('a session · one conversation the server keeps open', 'session · 服务器保持打开的一段对话')}</text>
          <text x="16" y="88" class="tag strong">{t('the client', '客户端')}</text>
          {#each OPS as o, i}
            <rect x={150 + i * 108} y="74" width="98" height="22" rx="11" fill={i === opIdx ? 'var(--fg)' : 'white'} stroke="var(--fg)" opacity={i <= opIdx ? 1 : 0.35} />
            <text x={199 + i * 108} y="89" text-anchor="middle" class="tag strong" style:fill={i === opIdx ? 'white' : 'var(--fg)'}>{o}</text>
          {/each}
          <text x="16" y="141" class="tag strong">{t('the stages', '各 stage')}</text>
          <text x="16" y="194" class="tag strong">{t('the session\'s', '该 session 的')}</text>
          <text x="16" y="208" class="tag strong">{t('state, per stage', '状态，每 stage 一份')}</text>
          {#each STAGES as sg, i}
            {@const x0 = 150 + i * 140}
            {@const exists = clock >= OPEN_AT + i * STAGGER && clock < CLOSE_AT + (3 - i) * STAGGER}
            {@const unitAt = APPEND_AT + (appended - 1) * HOLD}
            {@const levels = appended === 0 ? 0 : appended - 1 + (clock >= unitAt + i * HOP ? 1 : 0)}
            <rect x={x0} y="124" width="112" height="28" rx="6" fill="white" stroke="var(--fg)" />
            <text x={x0 + 56} y="142" text-anchor="middle" class="mono strong">{sg.n}</text>
            <rect x={x0} y="168" width="112" height="50" rx="6" fill={exists ? 'var(--accent-soft)' : 'white'} stroke={exists ? MOD : 'var(--faint)'} stroke-dasharray={exists ? '' : '3 3'} style="transition: fill 250ms" />
            {#if exists}
              {#each Array.from({ length: levels }) as _, l}<rect x={x0 + 8} y={193 - (levels * 11 - 2) / 2 + l * 11} width="96" height="9" rx="2" fill={MOD} opacity="0.55" />{/each}
            {/if}
            <text x={x0 + 56} y="232" text-anchor="middle" class={exists ? 'tag strong' : 'tag'} style:fill={exists ? MOD : 'var(--muted)'}>{exists ? t(sg.keeps, sg.keepsZh) : t('no state', '无状态')}</text>
            {#if i < STAGES.length - 1}<line x1={x0 + 114} y1="138" x2={x0 + 138} y2="138" stroke="var(--faint)" marker-end="url(#fd-arrow)" />{/if}
          {/each}
          {#if clock >= APPEND_AT && clock < CLOSE_AT && (clock - APPEND_AT) % HOLD < 4 * HOP}
            {@const at = Math.floor(((clock - APPEND_AT) % HOLD) / HOP)}
            <rect x={150 + at * 140 + 36} y="114" width="40" height="14" rx="3" fill={LIS} />
            <text x={150 + at * 140 + 56} y="125" text-anchor="middle" class="steplabel">{t(`unit ${appended}`, `单元 ${appended}`)}</text>
          {/if}
          <rect x="16" y="252" width="688" height="30" rx="6" fill="#fbfaf7" stroke="var(--line)" />
          <text x="30" y="272" class="legend strong">{t('now:', '现在：')} {sessionStatus(clock)}</text>
          <text x="16" y="314" class="legend" in:fade={{ delay: 400 }}>{t('each append prefills only its own unit; the units before it are already in the thinker\'s KV cache', '每次 append 只 prefill 自己的单元；之前的单元已在 thinker 的 KV cache 里')}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('blue: a stage\'s state for this session, a stripe per unit, named under it', '蓝色：stage 为该 session 保存的状态，每个单元一条，名称标在下方')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('open runs upstream first and close downstream first, so no stage gets a unit its upstream has not opened for', 'open 上游先行、close 下游先行，stage 不会收到上游尚未为其打开的单元')}</text>
        </g>
      {/if}

      {#if cur.scene === 'needs'}
        {@const PW = 220}
        {@const px = (k: number) => 16 + k * (PW + 14)}
        {@const bx = px(2) + 22}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('what a session needs from the server · three parts, all needed at once', 'session 需要服务器提供什么 · 三部分，同时都要满足')}</text>
          {#each [
            { h: t('1 · IN EACH STAGE', '1 · 在每个 stage 里'), say: ['one state per open session, and', 'each unit\'s work goes into its', 'own session\'s state'], sayZh: ['每个打开的 session 一份状态，', '每个单元的工作记入', '它自己 session 的状态'], link: t('session hooks · step 6', 'session hooks · 第 6 步') },
            { h: t('2 · ON THE WAY IN', '2 · 在进入的路上'), say: ['units keep arriving while earlier', 'ones run; each goes in only after', 'the unit before it is done'], sayZh: ['前面的单元还在运行，', '新的单元不断到达；每个单元', '要等前一个完成才进入'], link: t('one at a time · step 7', '一次一个 · 第 7 步') },
            { h: t('3 · ON THE GPU', '3 · 在 GPU 上'), say: ['a session\'s state stays on the GPU', 'from open to close, so memory caps', 'how many sessions run at once'], sayZh: ['session 的状态从 open 到 close', '一直留在 GPU 上，显存上限', '决定同时能跑多少 session'], link: t('memory · step 8', '内存 · 第 8 步') },
          ] as c, k}
            {@const x0 = px(k)}
            <g in:fade={{ delay: 150 + k * 350, duration: 300 }}>
              <rect x={x0} y="58" width={PW} height="252" rx="10" fill="#fbfaf7" stroke="var(--line)" />
              <text x={x0 + 12} y="78" class="boxtitle">{c.h}</text>
              {#each c.say as line, l}<text x={x0 + 12} y={234 + l * 15} class="tag strong">{t(line, c.sayZh[l])}</text>{/each}
              <text x={x0 + 12} y="292" class="tag strong" style:fill={MOD}>{c.link}</text>
            </g>
          {/each}

          <!-- 1: one stage, a state per session; a unit goes into its own session's -->
          <g in:fade={{ delay: 150, duration: 300 }}>
            <rect x={px(0) + 50} y="88" width="120" height="18" rx="3" fill={LIS} />
            <text x={px(0) + 110} y="101" text-anchor="middle" class="steplabel">{t('unit 2 of session A', 'session A 的单元 2')}</text>
            <rect x={px(0) + 12} y="116" width={PW - 24} height="92" rx="7" fill="white" stroke="var(--fg)" />
            <text x={px(0) + 22} y="132" class="mono strong">thinker</text>
            {#each ['session A', 'session B'] as v, j}
              <rect x={px(0) + 22} y={140 + j * 32} width={PW - 44} height="26" rx="4" fill="var(--accent-soft)" stroke={MOD} />
              <text x={px(0) + PW / 2} y={157 + j * 32} text-anchor="middle" class="tag strong" style:fill={MOD}>{t(`${v}'s state`, `${v} 的状态`)}</text>
            {/each}
            <line x1={px(0) + 170} y1="97" x2={px(0) + 176} y2="97" stroke="var(--gen)" />
            <path d="M {px(0) + 176} 97 V 136" fill="none" stroke="var(--gen)" marker-end="url(#fd-arrow)" />
          </g>

          <!-- 2: the coordinator holds session A's later units until the one before is done -->
          <g in:fade={{ delay: 500, duration: 300 }}>
            <rect x={px(1) + 12} y="86" width={PW - 24} height="50" rx="6" fill="white" stroke="var(--fg)" />
            <text x={px(1) + 22} y="102" class="tag strong">{t('the server', '服务器')}</text>
            {#each [3, 4] as u, j}
              <rect x={px(1) + 22 + j * 52} y="110" width="46" height="18" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={px(1) + 45 + j * 52} y="123" text-anchor="middle" class="tag strong">{t(`unit ${u}`, `单元 ${u}`)}</text>
            {/each}
            <text x={px(1) + 128} y="123" class="tag">{t('waiting', '等待中')}</text>
            <line x1={px(1) + 45} y1="138" x2={px(1) + 45} y2="154" stroke="var(--gen)" marker-end="url(#fd-arrow)" />
            <rect x={px(1) + 12} y="158" width={PW - 24} height="50" rx="6" fill="white" stroke="var(--fg)" />
            <text x={px(1) + 22} y="174" class="mono strong">thinker</text>
            <rect x={px(1) + 22} y="182" width="46" height="18" rx="3" fill={LIS} />
            <text x={px(1) + 45} y="195" text-anchor="middle" class="steplabel">{t('unit 2', '单元 2')}</text>
            <line x1={px(1) + 72} y1="191" x2={px(1) + 92} y2="191" stroke="var(--gen)" marker-end="url(#fd-arrow)" />
            <rect x={px(1) + 96} y="182" width="100" height="18" rx="3" fill="var(--accent-soft)" stroke={MOD} />
            <text x={px(1) + 146} y="195" text-anchor="middle" class="tag strong" style:fill={MOD}>{t('A\'s state', 'A 的状态')}</text>
          </g>

          <!-- 3: a session's state grows with every unit and is held until close -->
          <g in:fade={{ delay: 850, duration: 300 }}>
            <text x={bx} y="100" class="tag strong">{t('session A\'s state on the GPU', 'session A 在 GPU 上的状态')}</text>
            <line x1={bx} y1="200" x2={bx + 172} y2="200" stroke="var(--faint)" marker-end="url(#fd-arrow)" />
            {#each Array.from({ length: 6 }) as _, u}
              <rect x={bx + 4 + u * 20} y={198 - (u + 1) * 13} width="16" height={(u + 1) * 13} rx="2" fill="var(--accent-soft)" stroke={MOD} />
            {/each}
            <line x1={bx + 130} y1="108" x2={bx + 130} y2="198" stroke={RED} stroke-dasharray="3 2" />
            <text x={bx + 136} y="150" class="tag strong" style:fill={RED}>close:</text>
            <text x={bx + 136} y="164" class="tag strong" style:fill={RED}>{t('freed', '释放')}</text>
            <text x={bx} y="214" class="tag">{t('units 1 to 6 of the call →', '通话的单元 1 到 6 →')}</text>
          </g>
        </g>
      {/if}

      {#if cur.scene === 'hooks'}
        {@const h = Math.min(HOOKS.length - 1, Math.floor(clock / HOOK_MS))}
        {@const op = HOOKS[h]}
        {@const fired = hookDone(clock, h)}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('what a session needs · 1 of 3 · in each stage, a hook per operation', 'session 需要什么 · 1 / 3 · 每个 stage 里，每种操作一个 hook')}</text>
          <!-- the request: an ordinary one, with the session's operation in its metadata -->
          {#key h}
            <g in:fade={{ duration: 400 }}>
              <rect x="16" y="74" width="190" height="190" rx="8" fill="#fbfaf7" stroke="var(--fg)" />
              <text x="28" y="94" class="boxtitle">{t('A REQUEST', '一个 request')}</text>
              <text x="28" y="120" class="tag strong">{t('data:', '数据：')}</text>
              {#if op.op === 'append'}
                <rect x="60" y="108" width="46" height="18" rx="3" fill={LIS} />
                <text x="83" y="121" text-anchor="middle" class="steplabel">{t('unit 3', '单元 3')}</text>
              {:else}
                <text x="60" y="120" class="tag">{t('none', '无')}</text>
              {/if}
              <text x="28" y="148" class="tag strong">{t('metadata:', '元数据：')}</text>
              <rect x="28" y="156" width="166" height="58" rx="6" fill="white" stroke="var(--fg)" />
              <text x="38" y="178" class="mono strong">omni_session</text>
              <text x="38" y="198" class="tag strong">{t(`${op.op}, session ${op.s}`, `${op.op}，session ${op.s}`)}</text>
            </g>
          {/key}
          <line x1="208" y1="169" x2="222" y2="169" stroke="var(--fg)" marker-end="url(#fd-arrow-fg)" />
          <!-- the stage: a hook per operation, a state per open session -->
          <rect x="226" y="74" width="478" height="190" rx="8" fill="white" stroke="var(--fg)" />
          <text x="240" y="94" class="mono strong">thinker</text>
          <text x="300" y="94" class="tag">{t('reads the tag and calls that hook', '读取标记并调用对应的 hook')}</text>
          <text x="240" y="118" class="boxtitle">{t('ITS HOOKS', '它的 hooks')}</text>
          <text x="420" y="118" class="boxtitle">{t('ITS STATE, PER SESSION', '它的状态，每个 session 一份')}</text>
          {#each HOOKS as o, i}
            {@const live = i === h && fired}
            <rect x="240" y={128 + i * 44} width="164" height="32" rx="5" fill={live ? 'var(--fg)' : 'white'} stroke={live ? 'var(--fg)' : 'var(--line)'} style="transition: fill 250ms" />
            <text x="250" y={148 + i * 44} class="mono strong" style:fill={live ? 'white' : 'var(--fg)'}>{o.op}</text>
            <text x="310" y={148 + i * 44} class="tag strong" style:fill={live ? 'white' : 'var(--fg)'}>{t(o.does, o.doesZh)}</text>
          {/each}
          {#each sessionsAt(clock) as st, j}
            {@const y = 128 + j * 44}
            {@const hit = fired && op.s === st.s}
            {#if st.on}
              <rect x="420" y={y} width="270" height="32" rx="5" fill="var(--accent-soft)" stroke={MOD} stroke-width={hit ? 2.4 : 1} />
              <text x="430" y={y + 20} class="tag strong" style:fill={MOD}>{t(`session ${st.s}'s state`, `session ${st.s} 的状态`)}</text>
              {#each Array.from({ length: st.units }) as _, k}<rect x={540 + k * 14} y={y + 8} width="10" height="16" rx="2" fill={MOD} opacity="0.55" />{/each}
              <text x="680" y={y + 20} text-anchor="end" class="tag strong" style:fill={MOD}>{st.units ? t(`units 1–${st.units}`, `单元 1–${st.units}`) : t('empty', '空')}</text>
            {:else if st.s === 'B'}
              <rect x="420" y={y} width="270" height="32" rx="5" fill="white" stroke={RED} stroke-dasharray="3 3" />
              <text x="430" y={y + 20} class="tag strong" style:fill={RED}>{t('session B\'s state: freed', 'session B 的状态：已释放')}</text>
            {/if}
          {/each}
          <rect x="16" y="286" width="688" height="30" rx="6" fill="#fbfaf7" stroke="var(--line)" />
          <text x="30" y="306" class="legend strong">{t('now:', '现在：')} {fired ? t(op.now, op.nowZh) : t(`a request tagged ${op.op}, session ${op.s} arrives`, `带 ${op.op}、session ${op.s} 标记的 request 到达`)}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('two more hooks: control, for an event such as an interrupt, and usage, the bytes a session\'s state holds', '还有两个 hook：control 处理中断等事件，usage 记录 session 状态占用的字节数')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`SGLang-Omni: SessionHooks (scheduling/session.py); the thinker and talker run theirs inside SGLang's own loop (Ch. ${CH_STAGES} Step 9)`, `SGLang-Omni：SessionHooks（scheduling/session.py）；thinker 和 talker 在 SGLang 自己的循环里运行各自的 hook（Ch. ${CH_STAGES} Step 9）`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'queue'}
        {@const ts = clock / 1000}
        {@const QX0 = 150}
        {@const QPX = 46}
        {@const qx = (s: number) => QX0 + s * QPX}
        {@const units = Array.from({ length: QUEUE_S }, (_, i) => i + 1)}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('what a session needs · 2 of 3 · on the way in, one unit at a time', 'session 需要什么 · 2 / 3 · 进入时一次一个单元')}</text>
          {#each PACES as p, pi}
            {@const y0 = 74 + pi * 104}
            <text x="16" y={y0} class="boxtitle">{t(p.t, p.tZh)}</text>
            <text x="16" y={y0 + 25} class="tag strong">{t('the listener', '听众')}</text>
            <text x="16" y={y0 + 67} class="tag strong">{t('the four stages', '四个 stage')}</text>
            <rect x={QX0} y={y0 + 10} width={QUEUE_S * QPX} height="22" rx="4" fill="#fbfaf7" stroke="var(--line)" />
            <rect x={QX0} y={y0 + 52} width={QUEUE_S * QPX} height="22" rx="4" fill="#fbfaf7" stroke="var(--line)" />
            {#each units as k}
              {@const heard = clamp(ts - (k - 1) * UNIT_S, 0, UNIT_S)}
              {@const s0 = startOf(k, p.d)}
              {@const ran = clamp(ts - s0, 0, p.d)}
              {#if heard > 0}
                {@const held = heard >= UNIT_S && ts < s0}
                <rect x={qx(k - 1) + 1} y={y0 + 10} width={heard * QPX - 2} height="22" rx="3" fill={held ? LIS : 'var(--gen-soft)'} stroke="var(--gen)" />
                {#if heard >= UNIT_S}<text x={qx(k - 0.5)} y={y0 + 25} text-anchor="middle" class={held ? 'steplabel' : 'tag strong'}>{k}</text>{/if}
              {/if}
              {#if ran > 0}
                <line x1={qx(k)} y1={y0 + 33} x2={qx(s0)} y2={y0 + 51} stroke="var(--gen)" stroke-dasharray="2 2" />
                <rect x={qx(s0) + 1} y={y0 + 52} width={Math.max(0, ran * QPX - 2)} height="22" rx="3" fill="var(--fg)" opacity="0.72" />
                {#if ran * QPX >= 14}<text x={qx(s0 + ran / 2)} y={y0 + 67} text-anchor="middle" class="steplabel">{k}</text>{/if}
              {/if}
            {/each}
          {/each}
          {#each [0, 2, 4, 6, 8, 10, 12] as s}<text x={qx(s)} y="286" text-anchor="middle" class="tag">{s} s</text>{/each}
          <line x1={QX0} y1="272" x2={qx(QUEUE_S) + 6} y2="272" stroke="var(--faint)" marker-end="url(#fd-arrow)" />
          <g in:fade={{ delay: 300 }}>
            <text x="18" y="318" class="pt">·</text><text x="28" y="318" class="legend">{t(`at ${PACES[1].d} s a unit, one more second of audio is left waiting every ${PACES[1].d / (PACES[1].d - UNIT_S)} s, and each unit starts later than the last`, `每个单元 ${PACES[1].d} s，每 ${PACES[1].d / (PACES[1].d - UNIT_S)} s 就多积压一秒音频，每个单元开始得越来越晚`)}</text>
            <text x="18" y="335" class="pt">·</text><text x="28" y="335" class="legend">{t(`after about ${Math.round(REJECT_S / 60)} minutes, ${MAX_WAITING_S} s of audio is waiting, the most the server holds, and it rejects new audio`, `约 ${Math.round(REJECT_S / 60)} 分钟后，积压音频达 ${MAX_WAITING_S} s，即服务器的保存上限，开始拒收新音频`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('light amber: audio being said or already sent in · solid amber: a unit still waiting · dark: a unit in the four stages', '浅琥珀：正在说或已送入的音频 · 实琥珀：仍在等待的单元 · 深色：在四个 stage 中的单元')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`times illustrative · SGLang-Omni: the realtime session's pump (serve/realtime/runtime.py), then the coordinator's (Ch. ${CH_BETWEEN} Step 10)`, `时间为示意 · SGLang-Omni：realtime session 的 pump（serve/realtime/runtime.py），然后是 coordinator 的（Ch. ${CH_BETWEEN} Step 10）`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'closing'}
        {@const BX = 150}
        {@const px = 540 / HBM_GB}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('what a session needs · 3 of 3 · on the GPU, its KV cache for the whole call', 'session 需要什么 · 3 / 3 · 在 GPU 上，整个通话期间的 KV cache')}</text>
          <text x="16" y="88" class="tag strong">{t('one call', '一次通话')}</text>
          <text x="150" y="80" class="tag strong">{t(`${CALL_MIN} min of listening × ${POS_PER_S} positions a second × ${KV_KB} KB = ${f1(CALL_KV_GB)} GB`, `收听 ${CALL_MIN} 分钟 × 每秒 ${POS_PER_S} 个位置 × ${KV_KB} KB = ${f1(CALL_KV_GB)} GB`)}</text>
          <text x="150" y="95" class="tag">{t('in Qwen3-Omni\'s thinker\'s KV cache alone, held until the call ends', '仅 Qwen3-Omni 的 thinker 的 KV cache，保存到通话结束')}</text>
          <text x="16" y="146" class="tag strong">{t('GPU 0, an H100', 'GPU 0，一块 H100')}</text>
          <text x="16" y="160" class="tag">{HBM_GB} GB</text>
          <rect x={BX - 3} y="131" width={HBM_GB * px + 6} height="34" rx="6" fill="#fbfaf7" stroke="var(--fg)" />
          <rect x={BX} y="136" width={GPU0_W * px} height="24" rx="3" fill="var(--fg)" opacity="0.72" />
          <text x={BX + 8} y="152" class="steplabel">{t(`weights ${f1(GPU0_W)} GB`, `权重 ${f1(GPU0_W)} GB`)}</text>
          {#each Array.from({ length: CALLS_FIT }) as _, c}
            <rect x={BX + (GPU0_W + c * CALL_KV_GB) * px + 1} y="136" width={CALL_KV_GB * px - 2} height="24" rx="2" fill={MOD} opacity="0.7" />
          {/each}
          <path d="M {BX + GPU0_W * px} 172 V 178 H {BX + (GPU0_W + CALLS_FIT * CALL_KV_GB) * px} V 172" fill="none" stroke={MOD} />
          <text x={BX + (GPU0_W + CALLS_FIT * CALL_KV_GB) * px} y="194" text-anchor="end" class="tag strong" style:fill={MOD}>{t(`${CALLS_FIT} calls × ${f1(CALL_KV_GB)} GB fill the rest`, `${CALLS_FIT} 次通话 × ${f1(CALL_KV_GB)} GB 填满剩余空间`)}</text>
          <path d="M {BX} 172 V 178 H {BX + GPU0_W * px - 4} V 172" fill="none" stroke="var(--fg)" />
          <text x={BX} y="194" class="tag strong">{t(`GPU 0's weights in the default layout (Ch. ${CH_GPUS} Step 1)`, `默认布局下 GPU 0 的权重（Ch. ${CH_GPUS} Step 1）`)}</text>
          <g in:fade={{ delay: 400 }}>
            <text x="18" y="244" class="pt">·</text><text x="28" y="244" class="legend">{t('a session\'s KV cache grows with every unit and is freed only when the session closes', 'session 的 KV cache 随每个单元增长，只在 session 关闭时释放')}</text>
            <text x="18" y="261" class="pt">·</text><text x="28" y="261" class="legend">{t('MiniCPM-o reserves room for full-length sessions up front: 2 by default (max_sessions)', 'MiniCPM-o 预先为整段通话长度的 session 留好空间：默认 2 个（max_sessions）')}</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`${POS_PER_S} positions a second of audio (Ch. ${CH_OMNI} Step 2) · ${KV_KB} KB a token (Ch. ${CH_GPUS} Step 4) · fewer in practice, as working memory takes part of the rest`, `每秒音频 ${POS_PER_S} 个位置（Ch. ${CH_OMNI} Step 2）· 每个 token ${KV_KB} KB（Ch. ${CH_GPUS} Step 4）· 实际更少，工作内存占去剩余的一部分`)}</text>
        </g>
      {/if}
      {#if ANIM[cur.scene] && !ANIM[cur.scene]?.[2]}<LoopProgress ms={lapMs} {lap} />{/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>
