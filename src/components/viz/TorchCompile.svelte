<script lang="ts">
  import { untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import { chapterNumber as chNum, chapters, type NavLink } from '../../chapters';
  import { D_MODEL as D, D_FF as F, LAYERS, BYTES, W_GB, BW, SMS } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const CH_NEXT = chNum('14-attention-backends');
  const CH_QUANT = chNum('22-quantization');

  // ---- Numbers: Llama-3-8B bf16 on one H100, continuing chapters 4, 11 and 12 --------------------------
  const tMem = W_GB / BW;                                   // 4.8 ms, the weight read
  const inter = F * BYTES;                                  // 28 KB: one token's silu output, one layer
  const savedPerTokLayer = 2 * inter;                       // written then read back, for nothing
  const savedPerTok = (savedPerTokLayer * LAYERS) / 1e6;    // 1.8 MB a token, whole model
  const B_EX = 256;
  const savedMB = savedPerTok * B_EX;                       // 470 MB at batch 256
  const savedMs = savedMB / 1e3 / BW;                       // and what that is in time
  const actMB = savedPerTok * B_EX * 3;                     // ~1.4 GB of activations all told
  const totalMB = W_GB * 1e3 + actMB;                       // what one decode step moves
  const pctTraffic = (savedMB / (W_GB * 1e3)) * 100;              // against the weight read, as chapter 4 measures a step
  const kb = (b: number) => `${Math.round(b / 1024)} KB`;
  const launchMsEager = 9;                                  // chapter 11's eager step: the launches, not the GPU
  const launchSaved = launchMsEager - tMem;                 // 4.2 ms, what chapters 11 and 12 took off
  const ratio = Math.round(launchSaved / savedMs);          // and how much bigger that was than this
  const fmtMs = (ms: number) => (ms < 10 ? ms.toFixed(1) : ms.toFixed(0)) + ' ms';
  const B_SM = 16;                                          // the batch where autotuning is worth the most

  type Scene = 'chain' | 'waste' | 'why' | 'fuse' | 'triton' | 'whatfuses' | 'tiles' | 'autotune' | 'worth' | 'cost' | 'closing';
  interface Step { caption: string; captionZh: string; scene: Scene }
  const steps: Step[] = [
    { scene: 'chain', caption: `Ch. 12 Step 12 left a piece looking like this: a chain of kernels between two matmuls, each one reading its input from memory and writing its output back. Take the two in the middle.`, captionZh: `Ch. 12 Step 12 留下的一块长这样：两个 matmul 之间一串 kernel，每个都从内存读输入、把输出写回。看中间这两个。` },
    { scene: 'waste', caption: `<b>SiLU</b> writes ${kb(inter)} per token per layer into HBM, and <b>multiply</b> reads it back a microsecond later. Nothing else ever reads it. Across ${LAYERS} layers that is ${savedPerTok.toFixed(1)} MB per token, out to memory and straight back.`, captionZh: `<b>SiLU</b> 每 token 每层写 ${kb(inter)} 进 HBM，<b>multiply</b> 一微秒后又读回。没有别人读它。${LAYERS} 层合计每 token ${savedPerTok.toFixed(1)} MB，写出去又立刻读回。` },
    { scene: 'why', caption: `It exists because eager PyTorch runs one line at a time. <code>silu(gate)</code> is a call, a call returns a tensor, and a tensor lives in HBM. Line 2 has not been read yet, so nothing knows the result is consumed next.`, captionZh: `它存在，因为 eager PyTorch 逐行执行。<code>silu(gate)</code> 是调用，调用返回 tensor，tensor 在 HBM 里。第 2 行还没读，没人知道结果马上被用。` },
    { scene: 'fuse', caption: `<b>Fuse them.</b> One kernel: load gate and up once, compute the SiLU and the multiply in registers, store the answer once. Identical arithmetic, two fewer trips through memory.`, captionZh: `<b>融合。</b>一个 kernel：gate 和 up 只读一次，SiLU 和乘法在寄存器里算，结果只写一次。算术完全相同，少跑两趟内存。` },
    { scene: 'triton', caption: `And you can, because Ch. 12 Step 11 already traced the model. <b>Inductor</b> takes that graph, walks the chain of pointwise ops, and writes a <b>Triton</b> kernel that does all of them in one pass.`, captionZh: `能做到，因为 Ch. 12 Step 11 已 trace 过模型。<b>Inductor</b> 拿这张图，走 pointwise 算子链，写出一个 <b>Triton</b> kernel 一趟做完。` },
    { scene: 'whatfuses', caption: `<b>Pointwise</b> ops (output i needs only input i: silu, mul, add) and <b>reductions</b> (a row to one number: norm) fuse into one kernel. A matmul needs whole rows and columns, so Inductor <b>picks</b> a library kernel for it and folds the pointwise edges in.`, captionZh: `<b>Pointwise</b>（输出 i 只需输入 i：silu、mul、add）和<b>归约</b>（一行变一个数：norm）融成一个 kernel。matmul 需整行整列，Inductor 为它<b>挑</b>库 kernel，折入相邻 pointwise。` },
    { scene: 'tiles', caption: `One idea first. A matmul's output C is carved into <b>tiles</b>, one per thread block. Whatever the tile's shape, its block loads its rows of A and its columns of B in full, so a bigger tile makes more outputs from each load.`, captionZh: `先讲一个概念。matmul 的输出 C 切成<b>tile</b>，一个 thread block 一个。不论形状，block 都完整读入对应的 A 行和 B 列，tile 越大，每次读入产出越多。` },
    { scene: 'autotune', caption: `At batch ${B_SM}, C has ${B_SM} rows. A square 128 × 128 tile pads 112 of them with zeros, and ${F.toLocaleString()} / 128 is only ${F / 128} tiles for ${SMS} SMs. A ${B_SM} × 64 tile pads nothing and makes ${F / 64}. So benchmark a few shapes on the real C and keep the fastest.`, captionZh: `batch ${B_SM} 时 C 只有 ${B_SM} 行：128 × 128 方 tile 要补零 112 行，${F.toLocaleString()} / 128 仅 ${F / 128} 个 tile，少于 ${SMS} 个 SM。${B_SM} × 64 不补零，有 ${F / 64} 个。所以在真实 C 上实测几种形状，留最快的。` },
    { scene: 'worth', caption: `Fusing that chain removes ${savedMB.toFixed(0)} MB from a decode step at batch ${B_EX}. Against the ${W_GB} GB weight read that is about ${pctTraffic.toFixed(0)}%, which on a memory-bound step is about ${(savedMs * 1000).toFixed(0)} µs of ${fmtMs(tMem)}.`, captionZh: `融合这条链，batch ${B_EX} 的 decode 步少搬 ${savedMB.toFixed(0)} MB。相对 ${W_GB} GB 的权重读取约 ${pctTraffic.toFixed(0)}%；这一步受内存带宽限制，约合 ${fmtMs(tMem)} 里的 ${(savedMs * 1000).toFixed(0)} µs。` },
    { scene: 'cost', caption: `Startup gains jobs, each once per captured shape: compile a kernel per fused group, benchmark tile shapes per matmul (<code>max-autotune</code> only), then record. Recording goes last: it freezes whichever kernels exist when it is taken.`, captionZh: `启动新增几件事，每个捕获形状各一次：每融合组编译一个 kernel，每 matmul 实测 tile 形状（仅 <code>max-autotune</code>），最后 record：它冻结录制时已有的 kernel。` },
    { scene: 'closing', caption: `The layer has been cut, fused and recorded — except for one kernel. Attention was cut out in Ch. 12 Step 6 and has run eagerly ever since. So what can be done with attention itself? Chapter ${CH_NEXT}.`, captionZh: `这一层已切开、融合、录制——只有一个 kernel 例外。attention 在 Ch. 12 Step 6 被切出，此后一直 eager 运行。attention 本身还能做什么？第 ${CH_NEXT} 章。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const W = 720, H = 400;

  // within-step phases, looping, for the worth step: 0 the bars whole with the piece fusing removes in red, 1 that piece gone
  let lap = $state(0), lapMs = $state(0);           // the looping step's laps, for LoopProgress
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });   // untracked, so starting a lap does not re-run the effect
  let phase = $state(0);
  $effect(() => {
    const s = step;
    phase = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (steps[s].scene === 'worth') {
      const cycle: [number, number][] = [[1, 3200], [0, 3200]];
      let i = 0;
      nextLap(cycle.reduce((a, [, w]) => a + w, 0));
      const tick = () => { const [ph, wait] = cycle[i]; timers.push(setTimeout(() => { phase = ph; i = (i + 1) % cycle.length; if (i === 0) nextLap(lapMs); tick(); }, wait)); };
      tick();
    }
    return () => timers.forEach(clearTimeout);
  });

  // the layer's kernels, as chapter 12 listed them, with what Inductor does to each
  const layerK = [
    { n: 'norm', g: 0, mm: false }, { n: 'qkv', g: 1, mm: true }, { n: 'rope', g: 1, mm: false },
    { n: 'attn', g: 2, mm: false, seam: true }, { n: 'o', g: 3, mm: true }, { n: 'add', g: 3, mm: false },
    { n: 'norm', g: 4, mm: false }, { n: 'gate·up', g: 5, mm: true }, { n: 'silu', g: 6, mm: false },
    { n: 'down', g: 7, mm: true }, { n: 'add', g: 7, mm: false },
  ];
  const GROUPS = 8;

  // record / cut / fuse keep the colours they had in chapters 11, 12 and 13
  const OPS = {
    record: { n: 'record', z: '录制', ch: 11, c: 'var(--gen)' },
    cut: { n: 'cut', z: '切开', ch: 12, c: 'var(--eos)' },
    fuse: { n: 'fuse', z: '融合', ch: 13, c: '#16a34a' },
  };

  // candidate matmul tilings for a batch-16 decode matmul, as an autotune sweep would rank them
  const cands = [
    { n: 'BLOCK 128×128', t: 1.00 }, { n: 'BLOCK 64×128', t: 0.82 }, { n: 'BLOCK 32×128', t: 0.66 },
    { n: 'BLOCK 16×256', t: 0.55 }, { n: 'BLOCK 16×64', t: 0.47 },
  ];
  const best = cands.reduce((a, c) => (c.t < a.t ? c : a));

  // the startup bill, drawn as a grid: one cell per job, one row per captured shape
  // --torch-compile-max-bs 16 fixes the rungs at 1, 2, 4, 8, 16
  const RUNGS = [1, 2, 4, 8, 16];
  const DISTINCT_K = 8;      // fused groups in one layer, from the "what fuses" step
  const MATMULS = 4;         // of those 8
  const jobs = [
    { t: 'compile', tz: '编译', s: `${DISTINCT_K} fused kernels`, sz: `${DISTINCT_K} 个融合 kernel`, n: DISTINCT_K, c: 'var(--accent)', op: 0.85 },
    { t: 'benchmark', tz: '实测', s: `${MATMULS} matmuls × ${cands.length} tile shapes · max-autotune only`, sz: `${MATMULS} 个 matmul × ${cands.length} 种 tile 形状 · 仅 max-autotune`, n: MATMULS * cands.length, c: 'var(--fg)', op: 0.55 },
    { t: 'record', tz: '录制', s: 'Ch. 11 Step 6', sz: 'Ch. 11 Step 6', n: 1, c: 'var(--gen)', op: 0.85 },
  ];
  const JX0 = 128, JPITCH = 15, JGAP = 16;
  const jobX = jobs.map((_, i) => JX0 + jobs.slice(0, i).reduce((a, j) => a + j.n * JPITCH + JGAP, 0));

</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="torch.compile, step {step + 1}">
      <defs>
        <marker id="tc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
        </marker>
        <marker id="tc-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
        <marker id="tc-arrow-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--eos)" />
        </marker>
        <marker id="tc-arrow-good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
        </marker>
      </defs>

      <!-- 1: the chain, from chapter 12 -->
      {#if cur.scene === 'chain'}
        {@const chain = [{ n: 'gate·up', mm: true }, { n: 'silu', mm: false }, { n: 'mul', mm: false }, { n: 'down', mm: true }]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('one piece from Ch. 12 Step 12 · the MLP end of a layer', 'Ch. 12 Step 12 的一块 · 一层的 MLP 末端')}</text>
          <rect x="40" y="212" width="650" height="34" rx="8" fill="#f4f2ec" stroke="var(--line)" />
          <text x="56" y="234" class="boxtitle">HBM</text>
          {#each chain as k, i}
            {@const cx = 150 + i * 150}
            <g in:fade={{ delay: i * 160, duration: 200 }}>
              <path d="M {cx - 34} 212 V 140" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#tc-arrow-hot)" />
              <rect x={cx - 58} y="94" width="116" height="42" rx="8" fill={k.mm ? 'var(--fg)' : 'var(--accent)'} opacity={k.mm ? 0.75 : 0.9} />
              <text x={cx} y="120" text-anchor="middle" class="kname">{k.n}</text>
              <path d="M {cx + 34} 140 V 208" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#tc-arrow-hot)" />
            </g>
          {/each}
          <g in:fade={{ delay: 800 }}>
            <rect x="234" y="82" width="280" height="66" rx="10" fill="none" stroke="var(--eos)" stroke-dasharray="4 3" />
            <text x="374" y="74" text-anchor="middle" class="tag strong" fill="var(--eos)">{t('these two', '这两个')}</text>
          </g>
          <text x="18" y="286" class="pt">·</text><text x="28" y="286" class="legend" in:fade={{ delay: 1000 }}>{t('the two matmuls have to touch memory: that is where the weights are', '两个 matmul 必须碰内存：权重就在那里')}</text>
          <text x="18" y="308" class="pt">·</text><text x="28" y="308" class="legend" in:fade={{ delay: 1000 }}>{t('the two in the middle touch it only because of how they were called', '中间两个碰内存，只是因为被这样调用')}</text>
        </g>
      {/if}

      <!-- 2: the intermediate that never needed to exist -->
      {#if cur.scene === 'waste'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('the value between them · one token, one layer', '它们之间的值 · 一个 token、一层')}</text>
          <rect x="60" y="88" width="130" height="44" rx="8" fill="var(--accent)" opacity="0.9" />
          <text x="125" y="115" text-anchor="middle" class="kname">silu</text>
          <rect x="530" y="88" width="130" height="44" rx="8" fill="var(--accent)" opacity="0.9" />
          <text x="595" y="115" text-anchor="middle" class="kname">mul</text>

          <rect x="40" y="248" width="650" height="34" rx="8" fill="#f4f2ec" stroke="var(--line)" />
          <text x="56" y="270" class="boxtitle">HBM</text>

          <g in:fade={{ delay: 300, duration: 300 }}>
            <path d="M 125 136 V 244" fill="none" stroke="var(--eos)" stroke-width="2" marker-end="url(#tc-arrow-bad)" />
            <text x="136" y="176" class="tag" fill="var(--eos)">{t('write', '写入')}</text>
            <text x="136" y="190" class="tag strong" fill="var(--eos)">{kb(inter)}</text>
          </g>
          <g in:fade={{ delay: 700, duration: 300 }}>
            <rect x="280" y="252" width="160" height="26" rx="4" fill="var(--eos)" opacity="0.25" stroke="var(--eos)" />
            <text x="360" y="269" text-anchor="middle" class="tag strong" fill="var(--eos)">[1 × {F.toLocaleString()}]</text>
          </g>
          <g in:fade={{ delay: 1100, duration: 300 }}>
            <path d="M 595 244 V 140" fill="none" stroke="var(--eos)" stroke-width="2" marker-end="url(#tc-arrow-bad)" />
            <text x="522" y="176" text-anchor="end" class="tag" fill="var(--eos)">{t('read back', '读回')}</text>
            <text x="522" y="190" text-anchor="end" class="tag strong" fill="var(--eos)">{kb(inter)}</text>
          </g>
          <g in:fade={{ delay: 1500 }}>
            <text x="360" y="314" text-anchor="middle" class="tag">{t('nothing else ever reads it', '没有别人读它')}</text>
            <text x="18" y="352" class="pt">·</text><text x="28" y="352" class="legend"><tspan class="strong">{t(`${kb(savedPerTokLayer)} of traffic per token per layer`, `每 token 每层 ${kb(savedPerTokLayer)} 读写量`)}</tspan>{t(', written and read back within about a microsecond', '，写出后约一微秒内读回')}</text>
            <text x="18" y="374" class="pt">·</text><text x="28" y="374" class="legend">{t(`across ${LAYERS} layers, ${savedPerTok.toFixed(1)} MB per token`, `${LAYERS} 层合计，每 token ${savedPerTok.toFixed(1)} MB`)}</text>
          </g>
        </g>
      {/if}

      <!-- 3: why it is a separate kernel at all -->
      {#if cur.scene === 'why'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('why the value is written down · eager runs one line at a time', '这个值为什么被写下 · eager 逐行执行')}</text>
          <rect x="40" y="64" width="300" height="118" rx="10" fill="#fbfaf7" stroke="var(--accent)" />
          <text x="56" y="86" class="boxtitle">{t('what you wrote', '你写的代码')}</text>
          {#each ['h = silu(gate)', 'h = h * up', 'y = down(h)'] as line, i}
            {@const y = 114 + i * 26}
            {@const now = i === 0}
            {#if now}
              <rect x="50" y={y - 17} width="280" height="24" rx="5" fill="var(--accent-soft)" />
              <path d="M 58 {y - 10} L 66 {y - 5} L 58 {y} z" fill="var(--accent)" />
            {/if}
            <text x="74" y={y} class="mono {now ? 'strong' : 'faint'}">{line}</text>
            {#if !now}<text x="318" y={y} text-anchor="end" class="tag" fill="var(--faint)">{t('not read yet', '还没读')}</text>{/if}
          {/each}

          <g in:fade={{ delay: 600 }}>
            <rect x="380" y="64" width="300" height="118" rx="10" fill="#fbfaf7" stroke="var(--eos)" />
            <text x="396" y="86" class="boxtitle">{t('what the interpreter knows', '解释器知道的')}</text>
            <text x="396" y="114" class="tag">{t('line 1 is a call, and a call has to ', '第 1 行是调用，调用必须')}<tspan class="strong">{t('return', '返回')}</tspan></text>
            <text x="396" y="140" class="tag">{t('it returns a tensor, and a tensor lives in HBM', '返回一个 tensor，tensor 在 HBM 里')}</text>
            <text x="396" y="166" class="tag">{t('line 2 is unread: nothing knows ', '第 2 行还没读：没人知道')}<tspan class="strong">h</tspan>{t(' is used next', ' 马上被用')}</text>
          </g>

          <rect x="40" y="248" width="650" height="34" rx="8" fill="#f4f2ec" stroke="var(--line)" />
          <text x="56" y="270" class="boxtitle">HBM</text>
          <g in:fade={{ delay: 300, duration: 300 }}>
            <path d="M 190 186 V 244" fill="none" stroke="var(--eos)" stroke-width="2" marker-end="url(#tc-arrow-bad)" />
            <text x="202" y="210" class="tag" fill="var(--eos)">{t('silu returns h', 'silu 返回 h')}</text>
            <text x="202" y="224" class="tag strong" fill="var(--eos)">{kb(inter)}</text>
          </g>
          <g in:fade={{ delay: 700, duration: 300 }}>
            <rect x="110" y="252" width="160" height="26" rx="4" fill="var(--eos)" opacity="0.25" stroke="var(--eos)" />
            <text x="190" y="269" text-anchor="middle" class="tag strong" fill="var(--eos)">h · [1 × {F.toLocaleString()}]</text>
          </g>
          <text x="16" y="322" class="legend" in:fade={{ delay: 1000 }}>{t('fusing needs both lines at once; when line 1 runs, the interpreter has only ever seen line 1', '融合需要同时看到两行；执行第 1 行时，解释器只见过第 1 行')}</text>
        </g>
      {/if}

      <!-- 4: fuse them -->
      {#if cur.scene === 'fuse'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('the same arithmetic, in one kernel', '同样的算术，一个 kernel')}</text>
          <rect x="40" y="246" width="650" height="34" rx="8" fill="#f4f2ec" stroke="var(--line)" />
          <text x="56" y="268" class="boxtitle">HBM</text>

          <text x="176" y="76" text-anchor="middle" class="rowlabel">{t('before', '之前')}</text>
          <text x="176" y="92" text-anchor="middle" class="tag strong" fill="var(--eos)">{t('4 trips', '4 趟')}</text>
          {#each [{ n: 'silu', x: 108 }, { n: 'mul', x: 244 }] as k}
            <rect x={k.x - 48} y="102" width="96" height="34" rx="6" fill="var(--accent)" opacity="0.45" />
            <text x={k.x} y="124" text-anchor="middle" class="kname">{k.n}</text>
            <path d="M {k.x - 24} 242 V 140" fill="none" stroke="var(--eos)" stroke-width="1.2" marker-end="url(#tc-arrow-bad)" opacity="0.6" />
            <path d="M {k.x + 24} 140 V 242" fill="none" stroke="var(--eos)" stroke-width="1.2" marker-end="url(#tc-arrow-bad)" opacity="0.6" />
          {/each}

          <g in:fade={{ delay: 500, duration: 350 }}>
            <text x="530" y="76" text-anchor="middle" class="rowlabel">{t('after', '之后')}</text>
            <text x="530" y="92" text-anchor="middle" class="tag strong" fill="#16a34a">{t('2 trips', '2 趟')}</text>
            <rect x="380" y="102" width="300" height="34" rx="6" fill="#16a34a" opacity="0.9" />
            <text x="530" y="124" text-anchor="middle" class="kname">{t('silu · mul, fused', 'silu · mul，已融合')}</text>
            <path d="M 404 242 V 140" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#tc-arrow-good)" />
            <path d="M 656 140 V 242" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#tc-arrow-good)" />
            {#each ['load gate and up once', 'do both operations in registers', 'store the answer once'] as line, k}
              <text x="530" y={176 + k * 18} text-anchor="middle" class="tag">{t(line, ['gate 和 up 只读一次', '两个运算都在寄存器里做', '结果只写一次'][k])}</text>
            {/each}
          </g>
          <g in:fade={{ delay: 1100 }}>
            <text x="18" y="316" class="pt">·</text><text x="28" y="316" class="legend">{t('the intermediate never leaves the chip — it lives in a register for the two instructions that need it', '中间值从不出芯片——它待在寄存器里，供需要它的两条指令使用')}</text>
            <text x="18" y="338" class="pt">·</text><text x="28" y="338" class="legend">{t(`same maths, same answer, ${kb(savedPerTokLayer)} less traffic per token per layer`, `算术相同、结果相同，每 token 每层少 ${kb(savedPerTokLayer)} 读写量`)}</text>
          </g>
        </g>
      {/if}

      <!-- 5: where the fused kernel comes from -->
      {#if cur.scene === 'triton'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('who writes that kernel', '谁来写这个 kernel')}</text>
          {#each [
            { t: 'the traced graph', zhT: 'trace 出的图', l: ['Ch. 12 Step 11 already', 'has it: a flat list', 'of tensor ops'], zhL: ['Ch. 12 Step 11 已有：', '一张 tensor 算子', '的扁平列表'], c: 'var(--muted)' },
            { t: 'Inductor', zhT: 'Inductor', l: ['walk the list, group', 'the pointwise ops', 'that touch the same rows'], zhL: ['遍历列表，把碰同一', '行的 pointwise 算子', '归成组'], c: 'var(--accent)' },
            { t: 'Triton, generated', zhT: '生成的 Triton', l: ['one kernel per group,', 'compiled at startup,', 'cached on disk'], zhL: ['每组一个 kernel，', '启动时编译，', '缓存在磁盘上'], c: '#16a34a' },
          ] as b, i}
            {@const x = 38 + i * 226}
            <g in:fly={{ y: 8, delay: i * 280, duration: 300 }}>
              <rect {x} y="64" width="190" height="94" rx="12" fill="#fbfaf7" stroke={b.c} />
              <text x={x + 14} y="88" class="slab strong small">{t(b.t, b.zhT)}</text>
              {#each b.l as line, k}<text x={x + 14} y={110 + k * 16} class="tag">{t(line, b.zhL[k])}</text>{/each}
            </g>
            {#if i < 2}
              <path d="M {x + 196} 111 H {x + 222}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#tc-arrow)" in:fade={{ delay: i * 280 + 240 }} />
            {/if}
          {/each}
          <g in:fade={{ delay: 900 }}>
            <rect x="22" y="180" width="676" height="128" rx="10" fill="white" stroke="var(--line)" />
            {#each [
              '@triton.jit',
              'def fused_silu_mul(gate, up, out, n):',
              '    i = tl.program_id(0) * BLOCK + tl.arange(0, BLOCK)',
              t('    g = tl.load(gate + i)                 # one read', '    g = tl.load(gate + i)                 # 只读一次'),
              t('    u = tl.load(up + i)                   # one read', '    u = tl.load(up + i)                   # 只读一次'),
              t('    tl.store(out + i, g * tl.sigmoid(g) * u)   # one write', '    tl.store(out + i, g * tl.sigmoid(g) * u)   # 只写一次'),
            ] as line, i}
              <text x="38" y={204 + i * 17} class="mono code" in:fade={{ delay: 900 + i * 90 }}>{line}</text>
            {/each}
          </g>
          <text x="16" y="336" class="legend" in:fade={{ delay: 1600 }}>{t('two loads and one store: ', '两次读、一次写：')}<tspan class="mono">g * sigmoid(g)</tspan>{t(' never leaves the register it was computed in', ' 从没离开算它的那个寄存器')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade={{ delay: 1900 }}>SGLang: <tspan class="mono">--cuda-graph-tc-compiler inductor</tspan>{t(" · Ch. 12 Step 11's default was ", ' · Ch. 12 Step 11 的默认是 ')}<tspan class="strong">eager</tspan>{t(': trace, cut, and stop there', '：trace、切开，到此为止')}</text>
        </g>
      {/if}

      <!-- 6: what fuses and what does not -->
      {#if cur.scene === 'whatfuses'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`one layer · ${layerK.length} kernels before, ${GROUPS} after`, `一层 · 之前 ${layerK.length} 个 kernel，之后 ${GROUPS} 个`)}</text>
          {#each layerK as k, i}
            {@const x = 30 + i * 60}
            <rect {x} y="70" width="52" height="34" rx="5" fill={k.seam ? 'var(--eos)' : k.mm ? 'var(--fg)' : 'var(--accent)'} opacity={k.seam ? 0.85 : k.mm ? 0.75 : 0.9} />
            <text x={x + 26} y="92" text-anchor="middle" class="kname">{k.n}</text>
          {/each}
          {#each Array(GROUPS) as _, g}
            {@const ks = layerK.map((k, i) => ({ k, i })).filter((o) => o.k.g === g)}
            {@const x0 = 30 + ks[0].i * 60}
            {@const x1 = 30 + ks[ks.length - 1].i * 60 + 52}
            <g in:fade={{ delay: 400 + g * 100, duration: 250 }}>
              {#if ks.length > 1}
                <path d="M {x0} 112 V 120 H {x1} V 112" fill="none" stroke="#16a34a" stroke-width="1.8" />
              {/if}
              <rect x={x0} y="132" width={x1 - x0} height="30" rx="5" fill={ks[0].k.seam ? 'var(--eos)' : ks.some((o) => o.k.mm) ? 'var(--fg)' : '#16a34a'} opacity="0.85" />
              <text x={(x0 + x1) / 2} y="152" text-anchor="middle" class="kname">{ks.map((o) => o.k.n).join('·')}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 1300 }}>
            <text x="30" y="190" class="tag"><tspan class="strong">pointwise</tspan>{t(' · out[i] depends only on in[i] · silu, mul, add, rope · a chain of them is one pass over the data, so one kernel', ' · out[i] 只依赖 in[i] · silu、mul、add、rope · 一串这样的算子对数据只走一遍，所以一个 kernel')}</text>
            <text x="30" y="206" class="tag"><tspan class="strong">{t('reduction', '归约')}</tspan>{t(" · a row collapses to one number · norm's mean of squares · also one pass, with an accumulator", ' · 一行变一个数 · norm 的平方均值 · 也只走一遍，带一个累加器')}</text>
            <text x="30" y="222" class="tag"><tspan class="strong">matmul</tspan>{t(' · out[i, j] needs all of row i of A and column j of B · not one pass over anything', ' · out[i, j] 需要 A 的第 i 整行和 B 的第 j 整列 · 对什么都不能只走一遍')}</text>
          </g>
          <g in:fade={{ delay: 1700 }}>
            {#each [
              { c: '#16a34a', t: 'written', zhT: '新写', s: 'by Inductor: one new Triton kernel per pointwise or reduction chain', zhS: '由 Inductor 写：每条 pointwise 或归约链一个新 Triton kernel', n: 3 },
              { c: 'var(--fg)', t: 'picked', zhT: '挑选', s: 'from a library: cuBLAS, a Triton template or CUTLASS; its pointwise neighbours fold into it', zhS: '从库里挑：cuBLAS、Triton 模板或 CUTLASS；相邻 pointwise 折进去', n: 4 },
              { c: 'var(--eos)', t: 'left eager', zhT: '保持 eager', s: 'the attention seam from Ch. 12 Step 6', zhS: 'Ch. 12 Step 6 切出的 attention 接缝', n: 1 },
            ] as k, i}
              {@const y = 256 + i * 26}
              <rect x="30" y={y - 12} width="16" height="16" rx="4" fill={k.c} opacity="0.85" />
              <text x="58" y={y} class="slab strong small">{t(k.t, k.zhT)}</text>
              <text x="150" y={y} class="tag">{t(k.s, k.zhS)}</text>
              <text x="690" y={y} text-anchor="end" class="slab strong small">{t(`${k.n} of ${GROUPS}`, `${GROUPS} 个里的 ${k.n} 个`)}</text>
            {/each}
          </g>
          <text x="16" y="348" class="legend" in:fade={{ delay: 2100 }}>{t('the 3 kernels that went away were pointwise neighbours of matmuls: ', '消失的 3 个 kernel 都是 matmul 的 pointwise 邻居：')}<tspan class="mono">rope</tspan>{t(' into ', ' 折进 ')}<tspan class="mono">qkv</tspan>{t(', each ', '，每个 ')}<tspan class="mono">add</tspan>{t(' into the matmul before it', ' 折进它前面的 matmul')}</text>
        </g>
      {/if}

      <!-- 7: what a tile is -->
      {#if cur.scene === 'tiles'}
        {@const CELL = 11}
        {@const M = 8}
        {@const N = 12}
        {@const K = 6}
        {@const tilings = [{ x: 60, bm: 4, bn: 4 }, { x: 400, bm: 8, bn: 6 }]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">C = A × B · [{M} × {N}] = [{M} × {K}] × [{K} × {N}]{t(' · one tile of C and what its block loads, two ways', ' · C 的一个 tile 及其 block 的读入，两种切法')}</text>
          {#each tilings as v, p}
            {@const ax = v.x}
            {@const cx = v.x + K * CELL + 14}
            {@const by = 68}
            {@const cy = 68 + K * CELL + 14}
            {@const nT = (M / v.bm) * (N / v.bn)}
            {@const loads = (v.bm + v.bn) * K}
            {@const mats = [
              { n: 'B', x: cx, y: by, rows: K, cols: N, hl: (r: number, c: number) => c < v.bn },
              { n: 'A', x: ax, y: cy, rows: M, cols: K, hl: (r: number, c: number) => r < v.bm },
              { n: 'C', x: cx, y: cy, rows: M, cols: N, hl: (r: number, c: number) => r < v.bm && c < v.bn },
            ]}
            <g in:fade={{ delay: p * 450, duration: 250 }}>
              {#each mats as m}
                {#each Array(m.rows) as _, r}
                  {#each Array(m.cols) as _, c}
                    <rect x={m.x + c * CELL} y={m.y + r * CELL} width={CELL - 1} height={CELL - 1} fill={m.hl(r, c) ? 'var(--accent)' : '#e8e5dd'} opacity={m.hl(r, c) ? 0.85 : 1} />
                  {/each}
                {/each}
                <text x={m.x} y={m.y - 5} class="mono strong">{m.n}</text>
              {/each}
              {#each Array(N / v.bn - 1) as _, c}
                <line x1={cx + (c + 1) * v.bn * CELL - 0.5} y1={cy} x2={cx + (c + 1) * v.bn * CELL - 0.5} y2={cy + M * CELL} stroke="var(--fg)" stroke-width="1.5" />
              {/each}
              {#each Array(M / v.bm - 1) as _, r}
                <line x1={cx} y1={cy + (r + 1) * v.bm * CELL - 0.5} x2={cx + N * CELL} y2={cy + (r + 1) * v.bm * CELL - 0.5} stroke="var(--fg)" stroke-width="1.5" />
              {/each}
              <text x={cx + (v.bn * CELL) / 2} y={cy + (v.bm * CELL) / 2 + 3} text-anchor="middle" class="tag strong" fill="white">tile</text>
              <text x={ax + 105} y="248" text-anchor="middle" class="slab strong small">{t(`BLOCK ${v.bm} × ${v.bn} · ${nT} tiles, ${nT} thread blocks`, `BLOCK ${v.bm} × ${v.bn} · ${nT} 个 tile，${nT} 个 thread block`)}</text>
              <text x={ax + 105} y="266" text-anchor="middle" class="tag">{t(`each block loads ${v.bm} rows of A and ${v.bn} columns of B`, `每个 block 读 A 的 ${v.bm} 行、B 的 ${v.bn} 列`)}</text>
              <text x={ax + 105} y="282" text-anchor="middle" class="tag"><tspan class="strong">{t(`${loads} cells loaded`, `读入 ${loads} 格`)}</tspan>{t(` for ${v.bm * v.bn} outputs · ${(loads / (v.bm * v.bn)).toFixed(1)} per output`, `，得到 ${v.bm * v.bn} 个输出 · 每个输出 ${(loads / (v.bm * v.bn)).toFixed(1)} 格`)}</text>
              <text x={ax + 105} y="298" text-anchor="middle" class="tag">{t('whole C: ', '整个 C：')}<tspan class="strong">{t(`${nT * loads} loads`, `${nT * loads} 次读入`)}</tspan>{t(` for ${M * N} outputs`, `，得到 ${M * N} 个输出`)}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 1200 }}>
            <text x="18" y="334" class="pt">·</text><text x="28" y="334" class="legend">{t("a tile's block loads its rows of A and its columns of B in full, whatever the tile's shape", '不论 tile 什么形状，它的 block 都完整读入对应的 A 行和 B 列')}</text>
            <text x="18" y="356" class="pt">·</text><text x="28" y="356" class="legend">{t(`${tilings[1].bm} × ${tilings[1].bn} makes the same ${M * N} outputs from ${(tilings[1].bm + tilings[1].bn) * K * ((M / tilings[1].bm) * (N / tilings[1].bn))} loads instead of ${(tilings[0].bm + tilings[0].bn) * K * ((M / tilings[0].bm) * (N / tilings[0].bn))}, holding ${tilings[1].bm * tilings[1].bn} accumulators per block instead of ${tilings[0].bm * tilings[0].bn}`, `${tilings[1].bm} × ${tilings[1].bn} 同样得到 ${M * N} 个输出，读入 ${(tilings[1].bm + tilings[1].bn) * K * ((M / tilings[1].bm) * (N / tilings[1].bn))} 次而不是 ${(tilings[0].bm + tilings[0].bn) * K * ((M / tilings[0].bm) * (N / tilings[0].bn))} 次，每个 block 持 ${tilings[1].bm * tilings[1].bn} 个累加器而不是 ${tilings[0].bm * tilings[0].bn} 个`)}</text>
            <text x="18" y="378" class="pt">·</text><text x="28" y="378" class="legend">{t(`but it makes ${(M / tilings[1].bm) * (N / tilings[1].bn)} blocks, and an H100 has ${SMS} SMs to keep busy: the right shape depends on C`, `但它产生 ${(M / tilings[1].bm) * (N / tilings[1].bn)} 个 block，H100 有 ${SMS} 个 SM 要保持忙碌：合适的形状取决于 C`)}</text>
          </g>
        </g>
      {/if}

      <!-- 8: the shape you actually have -->
      {#if cur.scene === 'autotune'}
        {@const PXC = 0.5}
        {@const SHOW = 1024}
        {@const CX0 = 100}
        {@const CY0 = 72}
        {@const SQ = 128}
        {@const WIDE = 64}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`a decode matmul at batch ${B_SM} · C = [${B_SM} × ${F.toLocaleString()}] · the first ${SHOW.toLocaleString()} columns, one pixel per row`, `batch ${B_SM} 的 decode matmul · C = [${B_SM} × ${F.toLocaleString()}] · 前 ${SHOW.toLocaleString()} 列，每行一个像素`)}</text>
          <text x={CX0 - 8} y={CY0 + 12} text-anchor="end" class="tag">{t(`C · ${B_SM} rows`, `C · ${B_SM} 行`)}</text>
          <rect x={CX0} y={CY0} width={SHOW * PXC} height={B_SM} fill="var(--accent)" opacity="0.8" />
          <text x={CX0 + SHOW * PXC + 8} y={CY0 + 12} class="tag">{t(`… to column ${F.toLocaleString()}`, `… 到第 ${F.toLocaleString()} 列`)}</text>

          <g in:fade={{ delay: 400, duration: 250 }}>
            <rect x={CX0} y={CY0 + B_SM} width={SQ * PXC} height={SQ - B_SM} fill="var(--eos)" opacity="0.12" />
            <rect x={CX0} y={CY0} width={SQ * PXC} height={SQ} fill="none" stroke="var(--eos)" stroke-width="1.5" stroke-dasharray="4 3" />
            <text x={CX0 + SQ * PXC + 12} y={CY0 + 44} class="slab strong small" fill="var(--eos)">BLOCK {SQ} × {SQ}</text>
            <text x={CX0 + SQ * PXC + 12} y={CY0 + 62} class="tag">{t(`${B_SM} of its ${SQ} rows exist; ${SQ - B_SM} are zero padding`, `${SQ} 行里只有 ${B_SM} 行是真的；${SQ - B_SM} 行是补零`)}</text>
            <text x={CX0 + SQ * PXC + 12} y={CY0 + 78} class="tag">{t(`${(SQ - B_SM) / SQ * 8}/8 of the tile's arithmetic is on zeros`, `tile 的算力有 ${(SQ - B_SM) / SQ * 8}/8 花在零上`)}</text>
            <text x={CX0 + SQ * PXC + 12} y={CY0 + 94} class="tag">{t(`${F.toLocaleString()} / ${SQ} = ${F / SQ} tiles for ${SMS} SMs: ${SMS - F / SQ} sit idle`, `${F.toLocaleString()} / ${SQ} = ${F / SQ} 个 tile，${SMS} 个 SM 有 ${SMS - F / SQ} 个闲着`)}</text>
          </g>
          <g in:fade={{ delay: 900, duration: 250 }}>
            <rect x={CX0 + 400} y={CY0} width={WIDE * PXC} height={B_SM} fill="none" stroke="#16a34a" stroke-width="2" />
            <text x={CX0 + 400} y={CY0 + 44} class="slab strong small" fill="#16a34a">BLOCK {B_SM} × {WIDE}</text>
            <text x={CX0 + 400} y={CY0 + 62} class="tag">{t('every row it covers is real', '覆盖的每一行都是真的')}</text>
            <text x={CX0 + 400} y={CY0 + 78} class="tag">{t(`${F.toLocaleString()} / ${WIDE} = ${F / WIDE} tiles: every SM busy`, `${F.toLocaleString()} / ${WIDE} = ${F / WIDE} 个 tile：每个 SM 都忙`)}</text>
          </g>

          <text x="16" y="224" class="rowlabel">{t('candidate tile shapes · time on that C, shorter is better', '候选 tile 形状 · 在这个 C 上的耗时，越短越好')}</text>
          {#each cands as c, i}
            {@const y = 236 + i * 24}
            {@const win = c.n === best.n}
            <g in:fade={{ delay: 1100 + i * 150, duration: 200 }}>
              <text x="30" y={y + 13} class={win ? 'mono strong' : 'mono muted'}>{c.n}</text>
              <rect x="150" y={y} width={c.t * 400} height="16" rx="4" fill={win ? '#16a34a' : 'var(--faint)'} opacity={win ? 0.9 : 0.5} />
              <text x={150 + c.t * 400 + 8} y={y + 13} class="tag">{(c.t * 100).toFixed(0)}%</text>
              {#if win}<text x={150 + c.t * 400 + 44} y={y + 13} class="tag strong" fill="#16a34a">{t('keep this one', '留这个')}</text>{/if}
            </g>
          {/each}
          <text x="16" y="378" class="legend" in:fade={{ delay: 2000 }}>{t(`a library's default tile is tuned for a square C; below ${SQ} rows it is mostly padding, and a short, wide tile wins`, `库的默认 tile 为方形 C 调优；不到 ${SQ} 行时大部分是补零，矮宽的 tile 胜出`)}</text>
        </g>
      {/if}

      <!-- 9: what it is worth -->
      {#if cur.scene === 'worth'}
        {@const BX = 62}
        {@const BW2 = 590}
        {@const END = BX + BW2}
        {@const perGB = BW2 / (totalMB / 1e3)}
        {@const perMs = BW2 / launchMsEager}
        {@const sliverB = END - (savedMB / 1e3) * perGB}
        {@const sliverT = BX + (tMem - savedMs) * perMs}
        {@const wB = (savedMB / 1e3) * perGB}
        {@const wT = Math.max(3, savedMs * perMs)}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`one decode step at batch ${B_EX} · weights and activations, then time · Ch. 4 Step 6's KV cache read not shown`, `batch ${B_EX} 的一个 decode 步 · 权重与激活的字节，再看时间 · Ch. 4 Step 6 的 KV cache 读取未画出`)}</text>

          <g in:fade={{ delay: 100, duration: 250 }}>
            <text x="16" y="90" class="rowlabel">{t('bytes', '字节')}</text>
            <text x={BX} y="64" class="tag">{t(`weights · ${W_GB.toFixed(1)} GB`, `权重 · ${W_GB.toFixed(1)} GB`)}</text>
            <text x={END} y="64" text-anchor="end" class="tag">{t(`activations · ${(actMB / 1e3).toFixed(1)} GB`, `激活 · ${(actMB / 1e3).toFixed(1)} GB`)}</text>
            <rect x={BX} y="70" width={W_GB * perGB} height="28" rx="4" fill="var(--gen)" opacity="0.85" />
            <rect x={BX + W_GB * perGB} y="70" width={(actMB / 1e3) * perGB} height="28" rx="4" fill="var(--accent)" opacity="0.85" />
            <text x={END + 10} y="90" class="tag strong">{((phase === 0 ? totalMB : totalMB - savedMB) / 1e3).toFixed(1)} GB</text>
            {#each [0, 4, 8, 12, 16] as tk}
              <line x1={BX + tk * perGB} y1="98" x2={BX + tk * perGB} y2="103" stroke="var(--faint)" />
              <text x={BX + tk * perGB} y="114" text-anchor="middle" class="tick">{tk} GB</text>
            {/each}
          </g>
          <g in:fade={{ delay: 500, duration: 250 }}>
            {#if phase === 0}
              <rect x={sliverB} y="70" width={wB} height="28" rx="4" fill="var(--eos)" transition:fade={{ duration: 500 }} />
            {:else}
              <rect x={sliverB + 1} y="71" width={wB - 2} height="26" rx="3" fill="white" stroke="var(--eos)" stroke-width="1.5" stroke-dasharray="3 2" transition:fade={{ duration: 500 }} />
            {/if}
            <path d="M {sliverB + wB / 2} 102 V 126" fill="none" stroke="var(--eos)" stroke-width="1" />
            <text x={END} y="138" text-anchor="end" class="tag strong" style:fill="var(--eos)">{phase === 0 ? t(`fusing removes this ${savedMB.toFixed(0)} MB · ${pctTraffic.toFixed(0)}% of the weight read`, `融合去掉这 ${savedMB.toFixed(0)} MB · 权重读取的 ${pctTraffic.toFixed(0)}%`) : t(`removed · the step now moves ${((totalMB - savedMB) / 1e3).toFixed(1)} GB`, `已去掉 · 这一步现在搬 ${((totalMB - savedMB) / 1e3).toFixed(1)} GB`)}</text>
          </g>

          <text x={BX + BW2 / 2} y="168" text-anchor="middle" class="tag" in:fade={{ delay: 900 }}>{t(`the step is memory-bound, so bytes ÷ ${BW} TB/s of HBM bandwidth = time`, `这一步受内存带宽限制，所以字节 ÷ HBM 带宽 ${BW} TB/s = 时间`)}</text>

          <g in:fade={{ delay: 1100, duration: 250 }}>
            <text x="16" y="214" class="rowlabel">{t('time', '时间')}</text>
            <text x={BX} y="190" class="tag">{t(`GPU · ${fmtMs(tMem)} reading the weights`, `GPU · ${fmtMs(tMem)} 读权重`)}</text>
            <text x={END} y="190" text-anchor="end" class="tag">{t(`CPU · ${fmtMs(launchSaved)} launching · gone since chapters 11 and 12`, `CPU · ${fmtMs(launchSaved)} 发射 · 第 11、12 章后已消失`)}</text>
            <rect x={BX} y="196" width={tMem * perMs} height="28" rx="4" fill="var(--fg)" opacity="0.7" />
            <rect x={BX + tMem * perMs} y="196" width={launchSaved * perMs} height="28" rx="4" fill="var(--accent)" fill-opacity="0.12" stroke="var(--accent)" stroke-dasharray="4 3" />
            <text x={END + 10} y="214" class="tag strong">{fmtMs(launchMsEager - (phase === 0 ? 0 : savedMs))}</text>
            {#each [0, 2, 4, 6, 8] as tk}
              <line x1={BX + tk * perMs} y1="224" x2={BX + tk * perMs} y2="229" stroke="var(--faint)" />
              <text x={BX + tk * perMs} y="240" text-anchor="middle" class="tick">{tk} ms</text>
            {/each}
          </g>
          <g in:fade={{ delay: 1500, duration: 250 }}>
            {#if phase === 0}
              <rect x={sliverT} y="196" width={wT} height="28" rx="3" fill="var(--eos)" transition:fade={{ duration: 500 }} />
            {:else}
              <rect x={sliverT + 1} y="197" width={wT - 2} height="26" rx="2.5" fill="white" stroke="var(--eos)" stroke-width="1.5" stroke-dasharray="3 2" transition:fade={{ duration: 500 }} />
            {/if}
            <path d="M {sliverT + wT / 2} 228 V 252" fill="none" stroke="var(--eos)" stroke-width="1" />
            <text x={sliverT + wT / 2} y="264" text-anchor="middle" class="tag strong" style:fill="var(--eos)">{phase === 0 ? t(`fusing removes ${(savedMs * 1000).toFixed(0)} µs`, `融合省掉 ${(savedMs * 1000).toFixed(0)} µs`) : t(`removed · the GPU's ${fmtMs(tMem)} becomes ${fmtMs(tMem - savedMs)}`, `已去掉 · GPU 的 ${fmtMs(tMem)} 变成 ${fmtMs(tMem - savedMs)}`)}</text>
          </g>
          <g in:fade={{ delay: 1900 }}>
            <text x="18" y="310" class="pt">·</text><text x="28" y="310" class="legend">{savedMB.toFixed(0)} MB ÷ {BW} TB/s = <tspan class="strong">{(savedMs * 1000).toFixed(0)} µs</tspan>{t(` of a ${fmtMs(tMem)} weight read: ${pctTraffic.toFixed(0)}% of the weight read, ${pctTraffic.toFixed(0)}% of its time`, `，在 ${fmtMs(tMem)} 的权重读取里：字节占 ${pctTraffic.toFixed(0)}%，时间占 ${pctTraffic.toFixed(0)}%`)}</text>
            <text x="18" y="332" class="pt">·</text><text x="28" y="332" class="legend">{t(`chapters 11 and 12 removed ${fmtMs(launchSaved)}; this removes about ${ratio}× less`, `第 11、12 章省掉 ${fmtMs(launchSaved)}；这里省掉的约小 ${ratio} 倍`)}</text>
          </g>
        </g>
      {/if}

      <!-- 10: what it costs -->
      {#if cur.scene === 'cost'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('startup, before the first request · one row per captured shape, left to right in order', '启动时，第一个 request 之前 · 每个捕获形状一行，从左到右按顺序')}</text>
          {#each jobs as j, i}
            <g in:fade={{ delay: i * 150, duration: 200 }}>
              <text x={jobX[i]} y="70" class="slab strong small">{t(j.t, j.tz)}</text>
              <text x={jobX[i]} y="84" class="tag">{t(j.s, j.sz)}</text>
            </g>
          {/each}
          {#each RUNGS as bs, r}
            {@const y = 100 + r * 26}
            <g in:fade={{ delay: 450 + r * 160, duration: 220 }}>
              <text x="30" y={y + 13} class="mono muted">batch {bs}</text>
              {#each jobs as j, i}
                {#each Array(j.n) as _, k}
                  <rect x={jobX[i] + k * JPITCH} {y} width={JPITCH - 2} height="18" rx="3" fill={j.c} opacity={j.op} />
                {/each}
              {/each}
            </g>
          {/each}
          <g in:fade={{ delay: 1350 }}>
            {#each jobs as j, i}
              <text x={jobX[i]} y="246" class="slab strong small">= {j.n * RUNGS.length}</text>
            {/each}
            <text x="30" y="270" class="tag">{t(`not ×${LAYERS} for the layers: they are identical, so one compile per shape serves all of them`, `不是 ×${LAYERS} 层：每层相同，每个形状编译一次就够所有层用`)}</text>
          </g>

          <g in:fade={{ delay: 1700 }}>
            <text x="16" y="306" class="mono strong">--torch-compile-max-bs {RUNGS[RUNGS.length - 1]}</text>
            <text x="182" y="306" class="tag">{t('sets the rows · larger batches run with none of this', '设定这些行 · 更大的 batch 不走这些')}</text>
            <text x="16" y="328" class="mono strong">max-autotune</text>
            <text x="182" y="328" class="tag">{t('turns the benchmark column on · off by default, and that column is empty', '打开实测那一列 · 默认关闭，该列为空')}</text>
            <text x="16" y="362" class="legend">{t('measured in SGLang: ', 'SGLang 实测：')}<tspan class="strong">90 s</tspan>{t(' on a 235B MoE, ', '（235B MoE），')}<tspan class="strong">158 s</tspan>{t(' on GLM-5.2, before the first request', '（GLM-5.2），都在第一个 request 之前')}</text>
          </g>
        </g>
      {/if}

      <!-- 11: the one kernel none of this touched -->
      {#if cur.scene === 'closing'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('one layer, after three chapters of work', '一层，经过三章的工作')}</text>
          {#each layerK as k, i}
            {@const x = 30 + i * 60}
            <g in:fade={{ delay: i * 50, duration: 180 }}>
              <rect {x} y="60" width="52" height="38" rx="5" fill={k.seam ? 'var(--eos)' : k.mm ? 'var(--fg)' : '#16a34a'} opacity={k.seam ? 0.9 : 0.8} />
              <text x={x + 26} y="84" text-anchor="middle" class="kname">{k.n}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 700 }}>
            <path d="M 236 100 V 118" fill="none" stroke="var(--eos)" stroke-width="1.5" marker-end="url(#tc-arrow-bad)" />
            <text x="236" y="134" text-anchor="middle" class="tag strong" fill="var(--eos)">{t('still eager, still untouched', '仍是 eager，仍未动过')}</text>
          </g>

          {#each [
            { t: 'the order you met them', tz: '你遇到它们的顺序', y: 168, badges: true, ops: [OPS.record, OPS.cut, OPS.fuse] },
            { t: 'the order they happen', tz: '它们发生的顺序', y: 224, badges: false, ops: [OPS.cut, OPS.fuse, OPS.record] },
          ] as row, r}
            <g in:fly={{ x: -10, delay: 900 + r * 280, duration: 280 }}>
              <text x="30" y={row.y + 21} class="slab small" fill="var(--muted)">{t(row.t, row.tz)}</text>
              {#each row.ops as op, i}
                {@const x = 240 + i * 152}
                {#if row.badges}
                  <text x={x + 65} y={row.y - 8} text-anchor="middle" class="badge">{t(`chapter ${op.ch}`, `第 ${op.ch} 章`)}</text>
                {/if}
                <rect {x} y={row.y} width="130" height="32" rx="16" fill={op.c} fill-opacity="0.13" stroke={op.c} stroke-width="1.5" />
                <text x={x + 65} y={row.y + 21} text-anchor="middle" class="slab strong small" fill={op.c}>{t(op.n, op.z)}</text>
                {#if i < 2}
                  <path d="M {x + 142} {row.y + 11} L {x + 148} {row.y + 16} L {x + 142} {row.y + 21}" fill="none" stroke="var(--faint)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                {/if}
              {/each}
            </g>
          {/each}

          <g in:fade={{ delay: 1500 }}>
            <text x="18" y="286" class="pt">·</text><text x="28" y="286" class="legend">{t('cut before recording: attention would not capture', '录制前先切开：attention 无法被捕获')}</text>
            <text x="18" y="306" class="pt">·</text><text x="28" y="306" class="legend">{t('fuse before recording: a recording freezes whichever kernels exist when it is taken', '录制前先融合：录制会冻结录制时已有的 kernel')}</text>
            <text x="16" y="344" class="legend"><tspan class="strong">{t('Attention sat outside all three.', 'Attention 在这三步之外。')}</tspan>{t(' So what can be done with the attention kernel itself?', ' 那 attention kernel 本身还能做什么？')}</text>
          </g>
        </g>
      {/if}

      {#if cur.scene === 'worth'}<LoopProgress ms={lapMs} {lap} />{/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .mono.faint { fill: var(--faint); }
  .legend .mono, .tag .mono { font-size: 10px; }
  .code { white-space: pre; }
  .tag.strong, .tag .strong, .mono .strong { fill: var(--fg); font-weight: 600; }
  .badge { font-family: var(--mono); font-size: 9px; fill: var(--faint); letter-spacing: 0.04em; }
  .tick { font-family: var(--mono); font-size: 9px; fill: var(--faint); }
</style>
