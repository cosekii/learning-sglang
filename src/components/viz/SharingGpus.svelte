<script lang="ts">
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import { chapterNumber as chNum, type NavLink } from '../../chapters';
  import { HBM_GB, BYTES, HEAD_DIM, OMNI_PARAMS_B as P, OMNI_LAYERS, OMNI_KV_HEADS, OMNI_KB_PER_TOKEN as KV_KB, SAMPLES_PER_FRAME, SPEECH_OUT_HZ } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  const CH_KV = chNum('07-kv-memory'), CH_OMNI = chNum('16-omni-models'), CH_STAGES = chNum('17-stages-and-schedulers');
  const CH_BETWEEN = chNum('18-between-stages'), CH_AUDIO = chNum('20-streaming-audio');

  // bf16 weights, GB
  const WGT = { thinker: P.thinker * BYTES, talker: P.talker * BYTES, audio: P.audio * BYTES, vision: P.vision * BYTES, code2wav: P.code2wav * BYTES };
  const GPU0_W = WGT.thinker + WGT.audio + WGT.vision + WGT.code2wav;   // 63.8
  const f1 = (n: number) => n.toFixed(1);
  const fmt = (n: number) => n.toLocaleString('en-US');
  const nb = (s: string) => `<span style="white-space:nowrap">${s}</span>`;   // keeps a hyphenated name on one caption line

  // SGLang-Omni's one-GPU config for an H100 in bf16 (qwen3_omni_colocated_h100_bf16.yaml)
  const SHARES = [
    { n: 'image_encoder', s: 0.02 }, { n: 'audio_encoder', s: 0.02 }, { n: 'thinker', s: 0.78 },
    { n: 'talker_ar', s: 0.1 }, { n: 'code2wav', s: 0.02 },
  ];
  const pct = (s: number) => Math.round(s * 100);
  const ASSIGNED = SHARES.reduce((a, b) => a + b.s, 0);                 // 0.94

  // the 'why' step: the least the video test can run with on one H100, part by part. Parts 2, 4, 5 and 6 are fractions
  // of the card from step 3's one-GPU H100 config; part 3 is the longest request the thinker accepts.
  const THINKER_MAX_TOK = 32768;
  const MIN_PARTS: { n: string; nZh: string; gb: number; solid: number; c: string; soft: string; kind?: string; moved?: boolean; why: string; whyZh: string }[] = [
    { n: "thinker's weights", nZh: 'thinker 的权重', gb: WGT.thinker, solid: WGT.thinker, c: 'var(--gen)', soft: 'var(--gen-soft)', why: `${P.thinker}B parameters × ${BYTES} bytes; only a smaller format shrinks it`, whyZh: `${P.thinker}B 参数 × ${BYTES} 字节；只有更小的格式才能压缩` },
    { n: 'held for the video encoder', nZh: '给视频 encoder 预留', gb: 0.05 * HBM_GB, solid: 0, c: '', soft: '', kind: 'hatch', why: 'encoding 128 frames needs room; the thinker sets 5% aside', whyZh: '编码 128 帧需要空间；thinker 留出 5%' },
    { n: "thinker's KV cache", nZh: 'thinker 的 KV cache', gb: (THINKER_MAX_TOK * KV_KB) / 1e6, solid: 0, c: 'var(--gen)', soft: 'var(--gen-soft)', why: `its longest request, ${fmt(THINKER_MAX_TOK)} tokens × ${KV_KB} KB`, whyZh: `最长的 request，${fmt(THINKER_MAX_TOK)} token × ${KV_KB} KB` },
    { n: 'encoders and code2wav', nZh: 'encoder 和 code2wav', gb: 0.06 * HBM_GB, solid: WGT.vision + WGT.audio + WGT.code2wav, c: 'var(--muted)', soft: 'white', why: `${f1(WGT.vision + WGT.audio + WGT.code2wav)} GB of weights, plus working memory (2% each)`, whyZh: `${f1(WGT.vision + WGT.audio + WGT.code2wav)} GB 权重，加工作内存（各 2%）` },
    { n: 'held back', nZh: '预留', gb: 0.06 * HBM_GB, solid: 0, c: '', soft: '', kind: 'held', why: 'CUDA graphs, workspaces and peaks, 6% of the card', whyZh: 'CUDA graphs、工作区和峰值，占显卡 6%' },
    { n: 'talker', nZh: 'talker', gb: 0.1 * HBM_GB, solid: WGT.talker, c: 'var(--accent)', soft: 'var(--accent-soft)', moved: true, why: `${f1(WGT.talker)} GB of weights, plus its KV cache (10%)`, whyZh: `${f1(WGT.talker)} GB 权重，加它的 KV cache（10%）` },
  ];

  const MIN_TOTAL = MIN_PARTS.reduce((a, q) => a + q.gb, 0);              // 85.7

  // PR #1235: first sound, p90, two runs each, the talker sharing one of the thinker's GPUs against on its own
  const P90 = { shared: (2.697 + 2.663) / 2, alone: (1.463 + 1.415) / 2 };

  // chapter 16's sound: 10 frames of 80 ms go to code2wav at once
  const CHUNK = 10;
  const FRAME_MS = (SAMPLES_PER_FRAME / SPEECH_OUT_HZ) * 1000;           // 80
  const CHUNK_MS = CHUNK * FRAME_MS;                                    // 800

  type Scene = 'cost' | 'config' | 'memory' | 'time' | 'why' | 'deadline';
  const steps: { scene: Scene; caption: string; captionZh: string }[] = [
    { scene: 'cost', caption: `Qwen3-Omni's default layout takes two GPUs. GPU 1 holds only the talker, ${f1(WGT.talker)} GB of weights on an ${HBM_GB} GB card. Why not move the talker onto GPU 0 and serve from one?`, captionZh: `Qwen3-Omni 默认布局要两块 GPU。GPU 1 只放 talker，${f1(WGT.talker)} GB 权重放在 ${HBM_GB} GB 的卡上。为什么不把 talker 挪到 GPU 0，用一块卡服务？` },
    { scene: 'config', caption: `It can be moved. The layout is set in the config, which names a GPU for each stage, and SGLang-Omni ships both layouts for Qwen3-Omni. The only stage that moves is the talker.`, captionZh: `可以挪。布局写在 config 里，为每个 stage 指定 GPU；SGLang-Omni 为 Qwen3-Omni 附带两种布局。唯一移动的 stage 是 talker。` },
    { scene: 'memory', caption: `On one GPU, each stage gets a fixed share of the memory, set in the config. On its own, SGLang gives its KV cache whatever is free when it starts (Ch. ${CH_KV} Step 1); here that would depend on which stage started first.`, captionZh: `单 GPU 时，每个 stage 的内存份额在 config 里固定。SGLang 单独跑时，KV cache 拿走启动时剩余的全部内存（Ch. ${CH_KV} Step 1）；这里则取决于哪个 stage 先启动。` },
    { scene: 'why', caption: `So why two GPUs by default? First, memory. Cut every part to the least the video test can run with, and one H100 is still ${f1(MIN_TOTAL - HBM_GB)} GB short, so the talker moves to a second GPU.`, captionZh: `那为什么默认两块 GPU？第一，内存。把每部分压到视频测试能跑的最低，一块 H100 仍差 ${f1(MIN_TOTAL - HBM_GB)} GB，talker 只好挪到第二块 GPU。` },
    { scene: 'time', caption: `Second, time. The talker keeps its GPU 86% busy, and on the thinker's GPU its steps wait for turns. Measured, 9 in 10 first sounds came within ${f1(P90.alone)} s alone and ${f1(P90.shared)} s shared.`, captionZh: `第二，时间。talker 让自己的 GPU 忙碌 86%；放到 thinker 的 GPU 上，它的步就要等轮次。实测十个里九个的首个声音：独占在 ${f1(P90.alone)} s 内，共享在 ${f1(P90.shared)} s 内。` },
    { scene: 'deadline', caption: `Either way, the sound has a deadline. While chunk 1 plays, the talker writes the next ${CHUNK} frames and code2wav turns them into the next ${fmtMs(CHUNK_MS)}. What happens when chunk 2 misses the dashed line?`, captionZh: `无论哪种，声音都有截止线。chunk 1 播放时，talker 写下后 ${CHUNK} 帧，code2wav 把它们变成下 ${fmtMs(CHUNK_MS)} 的声音。chunk 2 错过虚线会怎样？` },
  ];
  function fmtMs(ms: number) { return `${ms} ms`; }

  const at = (sc: Scene) => steps.findIndex((s) => s.scene === sc) + 1;

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);

  // step 4's loop: the thinker's turns, and two talker steps that wait for one to end
  const PH = 7, PH_MS = 1100, REST = 2800;
  let lap = $state(0), lapMs = $state(0);           // the looping step's laps, for LoopProgress
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });   // untracked, so starting a lap does not re-run the effect
  let ph = $state(0);
  $effect(() => {
    if (cur.scene !== 'time') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      ph = 0;
      for (let i = 1; i <= PH; i++) timers.push(setTimeout(() => (ph = i), 600 + (i - 1) * PH_MS));
      const ms = 600 + (PH - 1) * PH_MS + REST;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });

  const W = 720, H = 400;
  const RED = 'var(--eos)';
  const NOMODEL = '#ece9e1';
  const THK = 'var(--gen)', TLK = 'var(--accent)', C2W = '#57534e';
  const REST_FILL = '#f6f4ee';

  // step 1: the default layout
  const PANELS = [
    { x: 16, n: 'GPU 0', st: ['image_encoder', 'audio_encoder', 'thinker', 'code2wav'], w: GPU0_W, busy: '', busyZh: '' },
    { x: 368, n: 'GPU 1', st: ['talker_ar'], w: WGT.talker, busy: `86%, with 8 requests at once (PR #1235)`, busyZh: `86%，同时 8 个 request（PR #1235）` },
  ];
  const PW = 336, BARW = 312, GBPX = BARW / HBM_GB;
  // GPU 0's work, as blocks along time; GPU 1's, a few ticks
  const busyRun = (x0: number, x1: number) => { const out: { x: number; w: number }[] = []; let x = x0, i = 0; while (x < x1) { const w = Math.min(14 + ((i * 37 + 5) % 19), x1 - x); out.push({ x, w }); x += w + 2 + (i % 4 === 3 ? 4 : 0); i++; } return out; };

  // step 2: each stage's device in the two layouts
  const LAYOUT = [
    { n: 'preprocessing', a: 'CPU', b: 'CPU' }, { n: 'image_encoder', a: 'GPU 0', b: 'GPU 0' }, { n: 'audio_encoder', a: 'GPU 0', b: 'GPU 0' },
    { n: 'thinker', a: 'GPU 0', b: 'GPU 0' }, { n: 'decode', a: 'CPU', b: 'CPU' }, { n: 'talker_ar', a: 'GPU 1', b: 'GPU 0' },
    { n: 'code2wav', a: 'GPU 0', b: 'GPU 0' },
  ];
  const cell = (d: string) => d === 'CPU' ? { f: NOMODEL, s: 'var(--faint)', t: 'var(--muted)' } : d === 'GPU 1' ? { f: 'var(--accent-soft)', s: 'var(--accent)', t: 'var(--fg)' } : { f: 'white', s: 'var(--fg)', t: 'var(--fg)' };

  // step 3: one bar for the card
  const MX = 30, MW = 660, MY = 124, MH = 46;
  const segs = (() => { let x = MX; return SHARES.map((s) => { const w = s.s * MW; const r = { ...s, x, w }; x += w; return r; }); })();
  const segOf = (n: string) => segs.find((s) => s.n === n)!;
  const shareFill = (n: string) => n === 'thinker' ? 'var(--gen-soft)' : n === 'talker_ar' ? 'var(--accent-soft)' : 'white';
  const shareStroke = (n: string) => n === 'thinker' ? 'var(--gen)' : n === 'talker_ar' ? 'var(--accent)' : 'var(--fg)';

  // step 4: whose turn it is on GPU 0, and the talker's two waits
  const TX0 = 150, TX1 = 690;
  const TURNS = [
    { p: 'thinker', a: 150, b: 330, at: 1 }, { p: 'talker', a: 334, b: 364, at: 3 }, { p: 'thinker', a: 368, b: 548, at: 4 },
    { p: 'talker', a: 552, b: 582, at: 6 }, { p: 'thinker', a: 586, b: 690, at: 7 },
  ];
  const WAITS = [{ r: 226, a: 334, at: 2 }, { r: 430, a: 552, at: 5 }];
  const TY = 112, GY = 178;

  // step 5: ten talker steps and one code2wav call before the line
  const DX = 604;
  const tlkSteps = Array.from({ length: CHUNK }, (_, i) => 168 + i * 36);
  const C2 = { a: 538, b: 568 };
  const thinkerBits = (() => { const out: { a: number; b: number }[] = []; let a = 150; for (const x of [...tlkSteps, C2.a]) { if (x - 2 > a) out.push({ a, b: x - 2 }); a = x + (x === C2.a ? C2.b - C2.a : 4) + 2; } out.push({ a, b: 690 }); return out; })();

</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Sharing GPUs, step {step + 1}">
      <defs>
        <pattern id="sg-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="white" /><line x1="0" y1="0" x2="0" y2="5" stroke="var(--faint)" stroke-width="2" />
        </pattern>
        {#each [['sg-arrow', '#b8b4aa'], ['sg-arrow-fg', 'var(--fg)'], ['sg-arrow-c2w', C2W]] as [id, c]}
          <marker {id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
          </marker>
        {/each}
      </defs>

      {#if cur.scene === 'cost'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`the default layout · Ch. ${CH_STAGES} Step 4's stages that run on a GPU`, `默认布局 · Ch. ${CH_STAGES} Step 4 中在 GPU 上运行的 stage`)}</text>
          {#each PANELS as g, i}
            <g in:fade={{ delay: 100 + i * 300, duration: 250 }}>
              <rect x={g.x} y="58" width={PW} height="204" rx="12" fill="#fbfaf7" stroke="var(--fg)" />
              <text x={g.x + 14} y="78" class="boxtitle">{g.n}</text>
              {#each g.st as n, j}
                <rect x={g.x + 14 + (j % 2) * 158} y={88 + Math.floor(j / 2) * 28} width="150" height="22" rx="6" fill="white" stroke="var(--fg)" />
                <text x={g.x + 89 + (j % 2) * 158} y={103 + Math.floor(j / 2) * 28} text-anchor="middle" class="mono strong">{n}</text>
              {/each}
              <!-- memory, to scale -->
              <text x={g.x + 14} y="160" class="tag strong">{t(`memory · ${HBM_GB} GB`, `内存 · ${HBM_GB} GB`)}</text>
              <rect x={g.x + 14} y="166" width={BARW} height="22" rx="4" fill={REST_FILL} stroke="var(--line)" />
              <rect x={g.x + 14} y="166" width={g.w * GBPX} height="22" rx="4" fill="var(--fg)" opacity="0.72" />
              {#if g.w * GBPX > 120}
                <text x={g.x + 22} y="181" class="steplabel">{t(`weights ${f1(g.w)} GB`, `权重 ${f1(g.w)} GB`)}</text>
              {:else}
                <text x={g.x + 20 + g.w * GBPX} y="181" class="tag strong">{t(`weights ${f1(g.w)} GB`, `权重 ${f1(g.w)} GB`)}</text>
              {/if}
              <text x={g.x + 14 + BARW} y="202" text-anchor="end" class="tag">{t('the rest · KV cache and working memory', '其余 · KV cache 和工作内存')}</text>
              <!-- busy, over time -->
              <text x={g.x + 14} y="224" class="tag strong">{t('busy, over time', '忙碌程度随时间')}</text>
              <rect x={g.x + 14} y="230" width={BARW} height="14" rx="3" fill={REST_FILL} stroke="var(--line)" />
              {#if i === 0}
                {#each busyRun(g.x + 14, g.x + 14 + BARW) as b}<rect x={b.x} y="230" width={b.w} height="14" rx="2" fill={THK} opacity="0.6" />{/each}
              {:else}
                {#each busyRun(g.x + 14, g.x + 14 + BARW) as b, j}{#if j % 7 !== 3}<rect x={b.x} y="230" width={b.w} height="14" rx="2" fill={TLK} opacity="0.75" />{/if}{/each}
              {/if}
              <text x={g.x + 14 + BARW} y="224" text-anchor="end" class="tag">{t(g.busy, g.busyZh)}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 800 }}>
            <text x="18" y="296" class="legend">{t('the other four stages that need a GPU share GPU 0, so serving Qwen3-Omni this way takes two GPUs', '另外四个需要 GPU 的 stage 共享 GPU 0，所以这样部署 Qwen3-Omni 要两块 GPU')}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`weights in bf16, 2 bytes per parameter · thinker ${P.thinker}B, talker and code predictor ${P.talker}B, encoders ${P.audio}B and ${P.vision}B, code2wav ${P.code2wav}B`, `权重为 bf16，每参数 2 字节 · thinker ${P.thinker}B，talker 和 code predictor ${P.talker}B，encoder ${P.audio}B 和 ${P.vision}B，code2wav ${P.code2wav}B`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`dark: weights · amber: GPU 0's stages at work · blue: the talker at work · time runs left to right, not to scale`, `深色：权重 · 琥珀色：GPU 0 的 stage 在工作 · 蓝色：talker 在工作 · 时间从左到右，非等比`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'config'}
        {@const C1 = 410}
        {@const C2X = 580}
        {@const RY = (i: number) => 92 + i * 27}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('who decides · the config names a GPU for each stage', '谁来定 · config 为每个 stage 指定 GPU')}</text>
          <text x="60" y="78" class="boxtitle">stage</text>
          <text x={C1} y="72" text-anchor="middle" class="mono strong">speech</text>
          <text x={C1} y="85" text-anchor="middle" class="tag">{t('the default', '默认')}</text>
          <text x={C2X} y="72" text-anchor="middle" class="mono strong">speech-colocated</text>
          <text x={C2X} y="85" text-anchor="middle" class="tag">{t('the one-GPU layout', '单 GPU 布局')}</text>
          {#each LAYOUT as r, i}
            {@const moved = r.a !== r.b}
            <g in:fade={{ delay: 100 + i * 60, duration: 200 }}>
              {#if moved}<rect x="44" y={RY(i) - 1} width="632" height="25" rx="6" fill="#fbfaf7" stroke="var(--fg)" />{/if}
              <text x="60" y={RY(i) + 16} class="mono strong">{r.n}</text>
              {#each [[C1, r.a], [C2X, r.b]] as [cx, d]}
                {@const c = cell(d as string)}
                <rect x={(cx as number) - 38} y={RY(i) + 2} width="76" height="19" rx="9.5" fill={c.f} stroke={c.s} />
                <text x={cx} y={RY(i) + 15} text-anchor="middle" class="tag strong" style:fill={c.t}>{d}</text>
              {/each}
              {#if moved}
                <line x1={C1 + 44} y1={RY(i) + 11.5} x2={C2X - 48} y2={RY(i) + 11.5} stroke="var(--fg)" stroke-width="1.2" marker-end="url(#sg-arrow-fg)" />
                <text x="630" y={RY(i) + 15} class="tag strong">{t('moves', '移动')}</text>
              {/if}
            </g>
          {/each}
          <g in:fade={{ delay: 700 }}>
            <text x="18" y="310" class="pt">·</text><text x="28" y="310" class="legend">{t('only talker_ar changes GPU: GPU 1 in the default, GPU 0 in speech-colocated', '只有 talker_ar 换 GPU：默认在 GPU 1，speech-colocated 在 GPU 0')}</text>
            <text x="18" y="327" class="pt">·</text><text x="28" y="327" class="legend">{t(`speech-colocated's config file also gives each stage on GPU 0 a share of its memory (step ${at('memory')})`, `speech-colocated 的 config 还为 GPU 0 上每个 stage 指定内存份额（第 ${at('memory')} 步）`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('SGLang-Omni checks the layout before any process starts · for Qwen3-Omni, thinker and talker may share a GPU only in speech-colocated', 'SGLang-Omni 在任何进程启动前检查布局 · Qwen3-Omni 的 thinker 和 talker 只有在 speech-colocated 里才能共享 GPU')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`SGLang-Omni's design notes: earlier versions refused to put the thinker and talker on one GPU, which kept the talker on a GPU of its own`, `SGLang-Omni 设计说明：早期版本不允许 thinker 和 talker 同在一块 GPU，talker 因此独占一块 GPU`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'memory'}
        {@const enc = [segOf('image_encoder'), segOf('audio_encoder')]}
        {@const thk = segOf('thinker')}
        {@const tlk = segOf('talker_ar')}
        {@const c2w = segOf('code2wav')}
        {@const freeX = MX + ASSIGNED * MW}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`memory · SGLang-Omni's one-H100 config, written for its speech-synthesis tests`, `内存 · SGLang-Omni 的单 H100 config，为其语音合成测试而写`)}</text>
          <!-- what is assigned, and what is not -->
          <path d="M {MX} 112 V 106 H {freeX - 3} V 112" fill="none" stroke="var(--fg)" />
          <text x={(MX + freeX) / 2} y="98" text-anchor="middle" class="tag strong">{t(`assigned · ${SHARES.map((s) => pct(s.s)).join(' + ')} = ${pct(ASSIGNED)}%`, `已分配 · ${SHARES.map((s) => pct(s.s)).join(' + ')} = ${pct(ASSIGNED)}%`)}</text>
          <path d="M {freeX + 3} 112 V 106 H {MX + MW} V 112" fill="none" stroke="var(--faint)" />
          <text x={MX + MW} y="98" text-anchor="end" class="tag">{t(`${pct(1 - ASSIGNED)}% held back`, `${pct(1 - ASSIGNED)}% 预留`)}</text>

          {#each segs as s, i}
            <rect x={s.x} y={MY} width={s.w} height={MH} fill={shareFill(s.n)} stroke={shareStroke(s.n)} in:fade={{ delay: 150 + i * 120, duration: 250 }} />
          {/each}
          <rect x={freeX} y={MY} width={MX + MW - freeX} height={MH} fill={REST_FILL} stroke="var(--faint)" stroke-dasharray="3 2" />
          <text x={thk.x + thk.w / 2} y={MY + 20} text-anchor="middle" class="slab strong small">thinker · {pct(thk.s)}% · {f1(thk.s * HBM_GB)} GB</text>
          <text x={thk.x + thk.w / 2} y={MY + 36} text-anchor="middle" class="tag">{t('its weights, its working memory, and a KV cache in what is left', '它的权重、工作内存，剩余部分作 KV cache')}</text>
          <text x={tlk.x + tlk.w / 2} y={MY + 20} text-anchor="middle" class="mono strong">talker_ar</text>
          <text x={tlk.x + tlk.w / 2} y={MY + 35} text-anchor="middle" class="tag">{pct(tlk.s)}% · {f1(tlk.s * HBM_GB)} GB</text>

          <!-- the small shares, labelled below -->
          <path d="M {enc[0].x} {MY + MH + 6} V {MY + MH + 12} H {enc[1].x + enc[1].w} V {MY + MH + 6}" fill="none" stroke="var(--fg)" />
          <text x={MX} y={MY + MH + 28} class="tag strong">{t(`image_encoder, audio_encoder · ${pct(enc[0].s)}% each, ${f1(enc[0].s * HBM_GB)} GB`, `image_encoder、audio_encoder · 各 ${pct(enc[0].s)}%，${f1(enc[0].s * HBM_GB)} GB`)}</text>
          <line x1={c2w.x + c2w.w / 2} y1={MY + MH + 4} x2={c2w.x + c2w.w / 2} y2={MY + MH + 16} stroke="var(--fg)" />
          <text x={c2w.x + c2w.w / 2} y={MY + MH + 28} text-anchor="end" class="tag strong">{t(`code2wav · ${pct(c2w.s)}%, ${f1(c2w.s * HBM_GB)} GB`, `code2wav · ${pct(c2w.s)}%，${f1(c2w.s * HBM_GB)} GB`)}</text>

          <g in:fade={{ delay: 900 }}>
            <text x="18" y="270" class="pt">·</text><text x="28" y="270" class="legend">{t(`each share holds its stage's weights and working memory; for the thinker and talker, what is left of it is KV cache`, `每份份额放该 stage 的权重和工作内存；thinker 和 talker 份额里剩下的作 KV cache`)}</text>
            <text x="18" y="287" class="pt">·</text><text x="28" y="287" class="legend">{t('before any process starts, the shares on each GPU are added up, and past 100% the server refuses to start', '任何进程启动前，先加总每块 GPU 上的份额，超过 100% 服务器拒绝启动')}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`the ${pct(1 - ASSIGNED)}% held back covers CUDA graphs, workspaces and memory peaks, per the notes in SGLang-Omni's H20 config`, `预留的 ${pct(1 - ASSIGNED)}% 用于 CUDA graphs、工作区和内存峰值，见 SGLang-Omni H20 config 的说明`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`shares from SGLang-Omni's config for one H100 in bf16 (qwen3_omni_colocated_h100_bf16.yaml) · 1% of ${HBM_GB} GB is ${HBM_GB / 100} GB`, `份额来自 SGLang-Omni 单块 H100 bf16 的 config（qwen3_omni_colocated_h100_bf16.yaml）· ${HBM_GB} GB 的 1% 是 ${HBM_GB / 100} GB`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'time'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('why two GPUs by default · 2 of 2, time · on one GPU, the thinker and the talker take turns', '为什么默认两块 GPU · 2/2，时间 · 单 GPU 上 thinker 和 talker 轮流运行')}</text>
          <text x="16" y={TY + 4} class="mono strong">talker_ar</text>
          <text x="16" y={TY + 18} class="tag">{t('its next step', '它的下一步')}</text>
          <line x1={TX0} y1={TY} x2={TX1} y2={TY} stroke="var(--line)" />
          <text x="16" y={GY + 14} class="mono strong">{t('GPU 0 runs', 'GPU 0 运行')}</text>
          <rect x={TX0} y={GY} width={TX1 - TX0} height="26" rx="4" fill={REST_FILL} stroke="var(--line)" />
          <line x1={TX0} y1={GY + 46} x2={TX1} y2={GY + 46} stroke="var(--faint)" marker-end="url(#sg-arrow)" />
          <text x={TX1} y={GY + 60} text-anchor="end" class="tag">{t('time', '时间')}</text>

          {#each TURNS as turn}
            {#if ph >= turn.at}
              <g transition:fade={{ duration: 300 }}>
                <rect x={turn.a} y={GY} width={turn.b - turn.a} height="26" rx="4" fill={turn.p === 'thinker' ? THK : TLK} opacity={turn.p === 'thinker' ? 0.75 : 0.95} />
                {#if turn.p === 'thinker'}
                  <text x={(turn.a + turn.b) / 2} y={GY + 17} text-anchor="middle" class="steplabel">{t(`thinker's turn`, 'thinker 的轮次')}</text>
                {:else}
                  <text x={(turn.a + turn.b) / 2} y={GY + 40} text-anchor="middle" class="tag strong" style:fill={TLK}>talker</text>
                  <line x1={turn.a + 0.5} y1={TY + 4} x2={turn.a + 0.5} y2={GY - 3} stroke={TLK} stroke-dasharray="2 2" />
                {/if}
              </g>
            {/if}
          {/each}
          {#each WAITS as w}
            {#if ph >= w.at}
              <g transition:fade={{ duration: 300 }}>
                <rect x={w.r - 1.5} y={TY - 9} width="3" height="18" fill={TLK} />
                <text x={w.r} y={TY - 14} text-anchor="middle" class="tag strong">{t('ready', '就绪')}</text>
                <line x1={w.r + 4} y1={TY} x2={w.a - 2} y2={TY} stroke={RED} stroke-width="1.6" stroke-dasharray="4 3" />
                <text x={(w.r + w.a) / 2} y={TY - 6} text-anchor="middle" class="tag strong" style:fill={RED}>{t('waits', '等待')}</text>
              </g>
            {/if}
          {/each}

          <!-- what the turns cost, measured: the time 9 in 10 requests got their first sound within -->
          <g in:fade={{ delay: 400 }}>
            <text x="16" y="276" class="boxtitle">{t('measured · first sound, p90: the time 9 in 10 requests beat', '实测 · 首个声音 p90：十个里九个在此时间内')}</text>
            {#each [{ n: "talker on the thinker's GPU", nZh: 'talker 在 thinker 的 GPU 上', v: P90.shared, f: 'var(--eos-soft)', c: RED }, { n: 'talker on its own GPU', nZh: 'talker 独占一块 GPU', v: P90.alone, f: 'var(--accent-soft)', c: TLK }] as r, i}
              <text x="16" y={300 + i * 24} class="tag strong">{t(r.n, r.nZh)}</text>
              <rect x="180" y={289 + i * 24} width={r.v * 120} height="16" rx="3" fill={r.f} stroke={r.c} />
              <text x={188 + r.v * 120} y={301 + i * 24} class="tag strong">{f1(r.v)} s{i === 1 ? t(`, ${Math.round((1 - P90.alone / P90.shared) * 100)}% sooner`, `，快 ${Math.round((1 - P90.alone / P90.shared) * 100)}%`) : ''}</text>
            {/each}
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`amber: the thinker's turn · blue: the talker's · red dashes: a ready step waiting · the timeline is not to scale`, `琥珀色：thinker 的轮次 · 蓝色：talker 的 · 红色虚线：就绪的步在等待 · 时间轴非等比`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('PR #1235: H200, 8 requests at once, two runs each (2.70 and 2.66 s shared, 1.46 and 1.42 s alone), the thinker on two GPUs', 'PR #1235：H200，同时 8 个 request，各跑两次（共享 2.70 和 2.66 s，独占 1.46 和 1.42 s），thinker 用两块 GPU')}</text>
        </g>
      {/if}

      {#if cur.scene === 'why'}
        {@const BX = 110}
        {@const px = 6.4}
        {@const X = (gb: number) => BX + gb * px}
        {@const EDGE = X(HBM_GB)}
        {@const upto = (k: number) => MIN_PARTS.slice(0, k).reduce((a, q) => a + q.gb, 0)}
        {@const TOTAL = upto(MIN_PARTS.length)}
        {@const RY = (k: number) => 221 + k * 21}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('why two GPUs by default · 1 of 2, memory · the least the video test can run with', '为什么默认两块 GPU · 1/2，内存 · 视频测试能跑的最低配置')}</text>

          <!-- GPU 0: parts 1–5, and the talker's part, dotted, where it would sit and spill past the card -->
          <text x="16" y="82" class="mono strong">GPU 0</text>
          <text x="16" y="96" class="tag">{t(`an H100, ${HBM_GB} GB`, `一块 H100，${HBM_GB} GB`)}</text>
          <rect x={BX - 4} y="64" width={HBM_GB * px + 8} height="34" rx="6" fill="#fbfaf7" stroke="var(--fg)" />
          {#each MIN_PARTS as m, k}
            {@const x0 = X(upto(k))}
            {@const w = m.gb * px}
            {#if m.moved}
              <rect x={x0} y="70" width={w} height="22" fill="var(--accent-soft)" fill-opacity="0.5" stroke={TLK} stroke-width="1.5" stroke-dasharray="3 2" />
            {:else if m.kind === 'hatch'}
              <rect x={x0} y="70" width={w} height="22" fill="url(#sg-hatch)" stroke="var(--muted)" />
            {:else if m.kind === 'held'}
              <rect x={x0} y="70" width={w} height="22" fill={REST_FILL} stroke="var(--faint)" stroke-dasharray="3 2" />
            {:else}
              <rect x={x0} y="70" width={w} height="22" fill={m.soft} stroke={m.c} />
              <rect x={x0} y="70" width={m.solid * px} height="22" fill={m.c} opacity="0.85" />
            {/if}
            <text x={x0 + w / 2} y="58" text-anchor="middle" class="tag strong" style:fill={m.moved ? TLK : 'var(--fg)'}>{k + 1}</text>
          {/each}
          <text x={BX + 8} y="85" class="steplabel">{t(`thinker's weights ${f1(WGT.thinker)} GB`, `thinker 权重 ${f1(WGT.thinker)} GB`)}</text>
          <!-- what spills past the card -->
          <path d="M {EDGE + 4} 102 V 108 H {X(TOTAL)} V 102" fill="none" stroke={RED} />
          <text x={X(TOTAL)} y="122" text-anchor="end" class="tag strong" style:fill={RED}>{t(`${f1(TOTAL - HBM_GB)} GB past the card`, `超出显卡 ${f1(TOTAL - HBM_GB)} GB`)}</text>

          <!-- GPU 1: the talker, moved -->
          <text x="16" y="150" class="mono strong">GPU 1</text>
          <text x="16" y="164" class="tag">{t(`an H100, ${HBM_GB} GB`, `一块 H100，${HBM_GB} GB`)}</text>
          <rect x={BX - 4} y="132" width={HBM_GB * px + 8} height="34" rx="6" fill="#fbfaf7" stroke="var(--fg)" />
          <rect x={BX} y="138" width={MIN_PARTS[5].gb * px} height="22" fill="var(--accent-soft)" stroke={TLK} />
          <rect x={BX} y="138" width={WGT.talker * px} height="22" fill={TLK} opacity="0.85" />
          <text x={BX + MIN_PARTS[5].gb * px + 10} y="153" class="tag strong" style:fill={TLK}>{t('6 · the talker, moved here', '6 · talker，挪到这里')}</text>

          <!-- the parts, and why none of them can shrink: one row each, ruled, with the bar's swatch beside its name -->
          <g in:fade={{ delay: 400, duration: 250 }}>
            <rect x="24" y="185" width="680" height="20" rx="4" fill="var(--panel)" />
            <text x="36" y="199" text-anchor="middle" class="boxtitle">#</text>
            <text x="56" y="199" class="boxtitle">{t('on one H100, at the least', '单块 H100，压到最低')}</text>
            <text x="268" y="199" text-anchor="end" class="boxtitle">GB</text>
            <text x="290" y="199" class="boxtitle">{t('why it cannot be smaller', '为什么不能再小')}</text>
            {#each MIN_PARTS as m, k}
              <text x="36" y={RY(k)} text-anchor="middle" class="legend strong" style:fill={m.moved ? TLK : 'var(--fg)'}>{k + 1}</text>
              {#if m.kind === 'hatch'}
                <rect x="56" y={RY(k) - 10} width="11" height="11" fill="url(#sg-hatch)" stroke="var(--muted)" />
              {:else if m.kind === 'held'}
                <rect x="56" y={RY(k) - 10} width="11" height="11" fill={REST_FILL} stroke="var(--faint)" stroke-dasharray="2 1.5" />
              {:else if m.moved}
                <rect x="56" y={RY(k) - 10} width="11" height="11" fill="var(--accent-soft)" stroke={TLK} stroke-dasharray="2 1.5" />
              {:else}
                <rect x="56" y={RY(k) - 10} width="11" height="11" fill={m.solid ? m.c : m.soft} stroke={m.c} opacity={m.solid ? 0.85 : 1} />
              {/if}
              <text x="74" y={RY(k)} class="legend">{t(m.n, m.nZh)}</text>
              <text x="268" y={RY(k)} text-anchor="end" class="legend strong">{f1(m.gb)}</text>
              <text x="290" y={RY(k)} class="legend">{t(m.why, m.whyZh)}</text>
              {#if k < MIN_PARTS.length - 1}<line x1="24" y1={RY(k) + 8} x2="704" y2={RY(k) + 8} stroke="var(--line)" />{/if}
            {/each}
            <line x1="24" y1={RY(MIN_PARTS.length) - 13} x2="704" y2={RY(MIN_PARTS.length) - 13} stroke="var(--fg)" />
            <text x="74" y={RY(MIN_PARTS.length) + 2} class="legend strong">{t('total', '合计')}</text>
            <text x="268" y={RY(MIN_PARTS.length) + 2} text-anchor="end" class="legend strong">{f1(TOTAL)}</text>
            <text x="290" y={RY(MIN_PARTS.length) + 2} class="legend strong" style:fill={RED}>{t(`an H100 has ${HBM_GB} GB, so ${f1(TOTAL - HBM_GB)} GB too many`, `H100 只有 ${HBM_GB} GB，多出 ${f1(TOTAL - HBM_GB)} GB`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`3: SGLang will not start a request its KV cache cannot hold whole · ${KV_KB} KB = ${OMNI_LAYERS} layers × ${OMNI_KV_HEADS} K/V heads × ${HEAD_DIM} × k, v × ${BYTES} B`, `3：KV cache 装不下整个 request，SGLang 就不会启动它 · ${KV_KB} KB = ${OMNI_LAYERS} 层 × ${OMNI_KV_HEADS} 个 K/V head × ${HEAD_DIM} × k, v × ${BYTES} B`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`2, 4, 5, 6: SGLang-Omni's one-GPU H100 config (step ${at('memory')}) · counted as the 85 GB the card reports, still 2.1 GB too many`, `2、4、5、6：SGLang-Omni 的单 GPU H100 config（第 ${at('memory')} 步）· 按显卡报告的 85 GB 算，仍多出 2.1 GB`)}</text>
        </g>
      {/if}

      {#if cur.scene === 'deadline'}
        {@const GY5 = 104}
        {@const SY = 202}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`the deadline · ${CHUNK} frames × ${FRAME_MS} ms = ${CHUNK_MS} ms of sound (Ch. ${CH_OMNI} Step 3) · drawn on one GPU`, `截止线 · ${CHUNK} 帧 × ${FRAME_MS} ms = ${CHUNK_MS} ms 声音（Ch. ${CH_OMNI} Step 3）· 按单 GPU 绘制`)}</text>
          <text x="16" y={GY5 + 16} class="mono strong">{t('GPU 0 runs', 'GPU 0 运行')}</text>
          <text x="16" y={SY + 16} class="mono strong">{t('speaker', '扬声器')}</text>
          {#each thinkerBits as b}<rect x={b.a} y={GY5} width={b.b - b.a} height="24" rx="3" fill={THK} opacity="0.6" />{/each}
          {#each tlkSteps as x}<rect {x} y={GY5} width="4" height="24" fill={TLK} />{/each}
          <rect x={C2.a} y={GY5} width={C2.b - C2.a} height="24" rx="3" fill={C2W} />
          <!-- what feeds the next chunk -->
          <path d="M {tlkSteps[0]} {GY5 - 6} V {GY5 - 12} H {tlkSteps[CHUNK - 1] + 4} V {GY5 - 6}" fill="none" stroke={TLK} />
          <text x={(tlkSteps[0] + tlkSteps[CHUNK - 1]) / 2} y={GY5 - 18} text-anchor="middle" class="tag strong">{t(`talker_ar · ${CHUNK} steps, one frame each`, `talker_ar · ${CHUNK} 步，每步一帧`)}</text>
          <text x={(C2.a + C2.b) / 2} y={GY5 - 18} text-anchor="middle" class="tag strong">code2wav</text>
          <line x1={C2.b - 4} y1={GY5 + 28} x2={C2.b - 4} y2={SY - 5} stroke={C2W} stroke-width="1.4" marker-end="url(#sg-arrow-c2w)" />
          <text x={C2.b - 12} y={(GY5 + SY) / 2 + 8} text-anchor="end" class="tag strong">{t('chunk 2 ready, before the line', 'chunk 2 就绪，赶在虚线前')}</text>

          <rect x="150" y={SY} width={DX - 150} height="26" rx="4" fill="white" stroke="var(--fg)" />
          <text x={(150 + DX) / 2} y={SY + 17} text-anchor="middle" class="mono strong">{t(`chunk 1 · ${CHUNK_MS} ms playing`, `chunk 1 · 播放 ${CHUNK_MS} ms`)}</text>
          <rect x={DX} y={SY} width={TX1 - DX} height="26" rx="4" fill="white" stroke="var(--fg)" stroke-dasharray="4 3" />
          <text x={(DX + TX1) / 2} y={SY + 17} text-anchor="middle" class="mono">chunk 2</text>
          <line x1={DX} y1={GY5 - 8} x2={DX} y2={SY + 40} stroke={RED} stroke-width="1.4" stroke-dasharray="5 3" />
          <text x={DX} y={SY + 54} text-anchor="middle" class="tag strong" style:fill={RED}>{t('chunk 1 ends', 'chunk 1 结束')}</text>

          <g in:fade={{ delay: 400 }}>
            <text x="18" y="292" class="pt">·</text><text x="28" y="292" class="legend">{t(`while chunk 1 plays, the talker writes the next ${CHUNK} frames and code2wav turns them into chunk 2`, `chunk 1 播放时，talker 写下后 ${CHUNK} 帧，code2wav 把它们变成 chunk 2`)}</text>
            <text x="18" y="309" class="pt">·</text><text x="28" y="309" class="legend">{t(`on one GPU, every one of those steps also waits for its turn behind the thinker (step ${at('time')})`, `单 GPU 上，这些步每一步都要排在 thinker 后面等轮次（第 ${at('time')} 步）`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('amber: the thinker · blue: the talker · dark: code2wav · time runs left to right, not to scale', '琥珀色：thinker · 蓝色：talker · 深色：code2wav · 时间从左到右，非等比')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`what happens when a chunk is late, and how SGLang-Omni streams sound against this line: chapter ${CH_AUDIO}`, `chunk 迟到会怎样，SGLang-Omni 如何对着这条线流式输出声音：第 ${CH_AUDIO} 章`)}</text>
        </g>
      {/if}
      {#if cur.scene === 'time'}<LoopProgress ms={lapMs} {lap} label={t('loops', '循环')} />{/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>
