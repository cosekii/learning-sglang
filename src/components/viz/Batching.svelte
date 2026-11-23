<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { W_GB, BW, TFLOPS as FLOPS, GFLOP_PER_TOKEN } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  // ---- Numbers, same as chapter 4: Llama-3-8B bf16 on one H100 -----------------------------
  const tMem = W_GB / BW;                                   // ms per step just to read the weights
  const tComp = (n: number) => (n * GFLOP_PER_TOKEN) / FLOPS;
  const stepMs = (B: number) => Math.max(tMem, tComp(B));
  const busy = (B: number) => tComp(B) / stepMs(B);
  const tput = (B: number) => (B / stepMs(B)) * 1000;      // tokens per second
  const balance = Math.round(tMem / tComp(1) / 50) * 50;
  const fmt = (ms: number) => (ms < 10 ? ms.toFixed(1) : ms.toFixed(0)) + ' ms';

  // ---- Requests: what a real queue looks like -------------------------------------------------
  // answer = decode steps in the grid; prompt in tokens; arrival in ms (for the ragged view only)
  const requests = [
    { id: 1, arrival: 0, prompt: 1200, answer: 10 },
    { id: 2, arrival: 4, prompt: 300, answer: 4 },
    { id: 3, arrival: 7, prompt: 2600, answer: 15 },
    { id: 4, arrival: 15, prompt: 800, answer: 7 },
    { id: 5, arrival: 18, prompt: 150, answer: 3 },
    { id: 6, arrival: 26, prompt: 2000, answer: 9 },
  ];
  const queueAnswers = [6, 9, 4, 7, 5, 8, 6, 5, 7, 4];      // requests 7, 8, 9 … waiting behind them

  // ---- Script -------------------------------------------------------------------------------
  type Scene = 'batch' | 'ragged' | 'static' | 'grid';
  interface Step { caption: string; captionZh: string; scene: Scene; B?: number; mode?: 'static' | 'continuous'; highlight?: boolean; foot?: string }
  const KV_FOOT = `counts only the weight read · each user's own KV cache is read too (Ch. 4 Step 6), and that grows with every user added (chapter 14)`;
  const KV_FOOT_ZH = `只计权重读取 · 每个用户自己的 KV cache 也要读（第 4 章第 6 步），而且每加一个用户都会增长（第 14 章）`;
  const MIX_FOOT = `this is Orca's design (2022) · SGLang by default runs a prefill as a step of its own while the others wait (chapter 6)`;
  const MIX_FOOT_ZH = `这是 Orca 的设计（2022）· SGLang 默认把 prefill 单独作为一步运行，其余等待（第 6 章）`;
  const steps: Step[] = [
    { scene: 'batch', B: 1, caption: `One user. One token per step, ${fmt(tMem)} per step, and the GPU mostly waiting.`, captionZh: `一个用户。每步一个 token，每步 ${fmt(tMem)}，GPU 大部分时间在等待。` },
    { scene: 'batch', B: 2, caption: `A second user's token rides the same read. Two tokens per step, still ${fmt(tMem)}.`, captionZh: `第二个用户的 token 搭上同一次读取。每步两个 token，仍是 ${fmt(tMem)}。`, foot: KV_FOOT },
    { scene: 'batch', B: 64, caption: `Keep adding. 64 users, 64 tokens per step, still ${fmt(stepMs(64))}. Throughput went up 64×, and nobody got slower.`, captionZh: `继续加。64 个用户，每步 64 个 token，仍是 ${fmt(stepMs(64))}。吞吐量提高 64×，没有人变慢。`, foot: KV_FOOT },
    { scene: 'batch', B: 512, caption: `Past the balance point the math outlasts the read and the step stretches. Around ${balance} tokens per step is the sweet spot for this GPU and model.`, captionZh: `过了平衡点，计算时间超过读取时间，每步变长。对这个 GPU 和模型，每步约 ${balance} 个 token 最合适。`, foot: KV_FOOT },
    { scene: 'ragged', caption: `${balance} tokens per step means ${balance} requests in flight. Real requests don't cooperate: they arrive whenever, prompts run from a line to a document, and answers from a word to a page.`, captionZh: `每步 ${balance} 个 token 意味着同时有 ${balance} 个 request。真实 request 不会配合：随时到达，prompt 从一行到一篇文档，回答从一个词到一页。` },
    { scene: 'static', caption: `The simplest way to batch: take the next six requests, prefill them together, decode them in lockstep until the last one finishes, then take the next six. Membership never changes while the batch runs. That's what <b>static</b> means.`, captionZh: `最简单的批处理：取接下来六个 request，一起 prefill，齐步 decode 直到最后一个完成，再取下一批六个。批运行期间成员从不变化。这就是<b>静态</b>的含义。` },
    { scene: 'grid', mode: 'static', caption: `Slots go idle as short answers finish, and request 7 waits until the longest answer is done. The two prefill columns are drawn short; they take many decode steps' worth of time.`, captionZh: `短回答完成后槽位空闲，request 7 要等最长的回答结束。图中两个 prefill 列画得短；实际要花许多 decode 步的时间。` },
    { scene: 'grid', mode: 'continuous', caption: `<b>Continuous batching</b>: rebuild the batch every step. When a sequence finishes, the next request takes its slot on the very next step. Its prefill runs in the same forward pass as everyone else's decode token.`, captionZh: `<b>连续批处理</b>：每步重组批。一个序列完成，下一个 request 在下一步就接管它的槽位。它的 prefill 和其他人的 decode token 在同一次前向中运行。`, foot: MIX_FOOT },
    { scene: 'grid', mode: 'continuous', highlight: true, caption: `But a prefill column stretches everyone's step: a 2,000-token prompt makes it ${fmt(tComp(2000))}, not ${fmt(tMem)}. Can a newcomer join without slowing everyone else down? That's the scheduler's problem.`, captionZh: `但一个 prefill 列会拉长所有人的步：2,000 token 的 prompt 让这一步变成 ${fmt(tComp(2000))}，而不是 ${fmt(tMem)}。新来的能否不拖慢其他人？这是调度器的问题。`, foot: MIX_FOOT },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const B = $derived(cur.B ?? 1);

  // ---- Batch scene ------------------------------------------------------------------------------
  const W = 720, H = 400;
  const HBM = { x: 40, y: 70, w: 150, h: 120 };
  const CU = { x: 260, y: 70, w: 180, h: 120 };
  const MID = HBM.y + HBM.h / 2;
  const CHIP = { w: 34, h: 16, x: 560 };
  const chipCount = $derived(Math.min(B, 6));
  const tiles = $derived([
    { label: 'tokens per step', labelZh: '每步 token 数', value: B.toLocaleString() },
    { label: 'step time', labelZh: '每步耗时', value: fmt(stepMs(B)) },
    { label: 'GPU busy', labelZh: 'GPU 忙碌占比', value: `${(busy(B) * 100).toFixed(busy(B) < 0.1 ? 1 : 0)}%` },
    { label: 'tokens per second', labelZh: '每秒 token 数', value: Math.round(tput(B)).toLocaleString() },
  ]);

  // ---- Ragged scene: arrival timeline with prompt and answer bars -------------------------------
  const RG = { x: 130, y: 84, rowH: 36, msW: 5.2, promptScale: 0.05, answerScale: 7 };

  // ---- Grid scene: six slots over T engine steps, static vs continuous --------------------------
  const T = 20, SLOTS = 6;
  type Cell = 'prefill' | 'decode' | 'idle';
  function simulate(mode: 'static' | 'continuous') {
    const grid: Cell[][] = Array.from({ length: SLOTS }, () => Array(T).fill('idle'));
    const q = [...queueAnswers];
    const place = (s: number, t0: number, len: number) => {
      if (t0 < T) grid[s][t0] = 'prefill';
      for (let t = t0 + 1; t <= t0 + len && t < T; t++) grid[s][t] = 'decode';
      return t0 + len + 1;
    };
    const free = requests.map((r, s) => place(s, 0, r.answer));
    if (mode === 'static') {
      const batchEnd = Math.max(...free);
      for (let s = 0; s < SLOTS; s++) if (q.length) place(s, batchEnd, q.shift()!);
    } else {
      for (let t = 0; t < T; t++) for (let s = 0; s < SLOTS; s++) if (free[s] === t && q.length) free[s] = place(s, t, q.shift()!);
    }
    // a column with any prefill in it is a long step; draw it wider
    const wide = Array.from({ length: T }, (_, t) => grid.some((row) => row[t] === 'prefill'));
    const NORMAL = 20, WIDE = 36, GAP = 3;
    let x = 0; const colX: number[] = []; const colW: number[] = [];
    for (let t = 0; t < T; t++) { colX.push(x); colW.push(wide[t] ? WIDE : NORMAL); x += colW[t] + GAP; }
    const flat = grid.flat();
    return { grid, wide, colX, colW, width: x - GAP, tokens: flat.filter((c) => c === 'decode').length, idle: flat.filter((c) => c === 'idle').length };
  }
  const sims = { static: simulate('static'), continuous: simulate('continuous') };
  const G = { x: 96, y: 92, ch: 20, gap: 3 };
  const cellColor: Record<Cell, string> = { prefill: 'var(--accent)', decode: 'var(--gen)', idle: '#ece9e2' };
  const batchEnd = Math.max(...requests.map((r) => r.answer)) + 1;

</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Batching, step {step + 1}">

      <!-- Batch: B users share one weight read -->
      {#if cur.scene === 'batch'}
        <g transition:fade={{ duration: 250 }}>
          <rect x={HBM.x} y={HBM.y} width={HBM.w} height={HBM.h} rx="10" fill="#fbfaf7" stroke="var(--line)" />
          <text x={HBM.x + 12} y={HBM.y + 18} class="boxtitle">{t('memory', '内存')}</text>
          <rect x={HBM.x + 14} y={HBM.y + 32} width={HBM.w - 28} height="64" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={HBM.x + HBM.w / 2} y={HBM.y + 58} text-anchor="middle" class="slab">{t('weights', '权重')}</text>
          <text x={HBM.x + HBM.w / 2} y={HBM.y + 78} text-anchor="middle" class="slab strong">{W_GB} GB</text>
          <line x1={HBM.x + HBM.w + 4} y1={MID} x2={CU.x - 12} y2={MID} class="wire" />
          <polygon points="{CU.x - 12},{MID - 7} {CU.x - 12},{MID + 7} {CU.x - 2},{MID}" fill="var(--faint)" />
          <text x={(HBM.x + HBM.w + CU.x) / 2} y={MID - 14} text-anchor="middle" class="tag strong">{t(`read ${W_GB} GB`, `读取 ${W_GB} GB`)}</text>
          <text x={(HBM.x + HBM.w + CU.x) / 2} y={MID + 22} text-anchor="middle" class="tag">{t('once per step', '每步一次')}</text>

          <rect x={CU.x} y={CU.y} width={CU.w} height={CU.h} rx="10" fill="#fbfaf7" stroke="var(--line)" />
          <text x={CU.x + 12} y={CU.y + 18} class="boxtitle">{t('compute', '计算')}</text>
          <text x={CU.x + CU.w / 2} y={CU.y + 52} text-anchor="middle" class="slab">{B.toLocaleString()} × {GFLOP_PER_TOKEN} GFLOP</text>
          <rect x={CU.x + 25} y={CU.y + 74} width="130" height="12" rx="3" fill="var(--line)" />
          <rect x={CU.x + 25} y={CU.y + 74} width="130" height="12" rx="3" fill={busy(B) > 0.5 ? 'var(--accent)' : 'var(--eos)'} class="bar" style:transform="scaleX({Math.max(2 / 130, busy(B))})" />
          <text x={CU.x + CU.w / 2} y={CU.y + 104} text-anchor="middle" class="tag">{t(`busy ${(busy(B) * 100).toFixed(busy(B) < 0.1 ? 1 : 0)}% of the step`, `忙碌占该步的 ${(busy(B) * 100).toFixed(busy(B) < 0.1 ? 1 : 0)}%`)}</text>

          <text x={CHIP.x + CHIP.w / 2} y={HBM.y - 12} text-anchor="middle" class="boxtitle">{t(`${B.toLocaleString()} user${B === 1 ? '' : 's'}, one token each`, `${B.toLocaleString()} 个用户，各一个 token`)}</text>
          {#each Array(chipCount) as _, i (i)}
            {@const y = MID - (chipCount * (CHIP.h + 3)) / 2 + i * (CHIP.h + 3)}
            <g in:fly={{ x: 30, delay: i * 60, duration: 250 }} out:fade={{ duration: 150 }}>
              <rect x={CHIP.x} y={y} width={CHIP.w} height={CHIP.h} rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
              <text x={CHIP.x + CHIP.w / 2} y={y + 12} text-anchor="middle" class="cell">{B > 6 && i === chipCount - 1 ? '…' : 'tok'}</text>
            </g>
          {/each}
          <line x1={CHIP.x - 6} y1={MID} x2={CU.x + CU.w + 12} y2={MID} class="wire" />
          <polygon points="{CU.x + CU.w + 12},{MID - 6} {CU.x + CU.w + 12},{MID + 6} {CU.x + CU.w + 2},{MID}" fill="var(--faint)" />

          {#each tiles as tile, i}
            {@const x = 40 + i * 165}
            <rect {x} y="236" width="150" height="66" rx="10" fill="#fbfaf7" stroke="var(--line)" />
            <text x={x + 14} y="262" class="tile-value">{tile.value}</text>
            <text x={x + 14} y="286" class="tile-label">{t(tile.label, tile.labelZh)}</text>
          {/each}
          {#if B > balance}
            <text x="40" y="332" class="legend" in:fade>{t(`${B} tokens of math take ${fmt(tComp(B))}, longer than the ${fmt(tMem)} read. Every extra token now costs time.`, `${B} 个 token 的计算要 ${fmt(tComp(B))}，超过 ${fmt(tMem)} 的读取。现在每多一个 token 都要花时间。`)}</text>
          {:else if B > 1}
            <text x="40" y="332" class="legend" in:fade>{t(`${B} tokens share one ${fmt(tMem)} read of the weights. Per-user latency: unchanged.`, `${B} 个 token 共享一次 ${fmt(tMem)} 的权重读取。每个用户的延迟不变。`)}</text>
          {/if}
        </g>
      {/if}

      <!-- Ragged: six real-looking requests on an arrival timeline -->
      {#if cur.scene === 'ragged'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y={RG.y - 34} class="rowlabel">{t('six requests, as they arrive', '六个 request，按到达顺序')}</text>
          <line x1={RG.x} y1={RG.y - 14} x2={RG.x + 100 * RG.msW} y2={RG.y - 14} stroke="var(--line)" />
          {#each [0, 25, 50, 75, 100] as ms}
            <text x={RG.x + ms * RG.msW} y={RG.y - 20} text-anchor="middle" class="tag">{ms} ms</text>
          {/each}
          {#each requests as r, i}
            {@const y = RG.y + i * RG.rowH}
            {@const x = RG.x + r.arrival * RG.msW}
            {@const pw = r.prompt * RG.promptScale}
            {@const aw = r.answer * RG.answerScale}
            <g in:fly={{ x: -10, delay: i * 60, duration: 250 }}>
              <text x={RG.x - 12} y={y + 12} text-anchor="end" class="rowlabel">req {r.id}</text>
              <line x1={x} y1={y - 4} x2={x} y2={y + 20} stroke="var(--faint)" />
              <rect {x} y={y} width={pw} height="16" rx="3" fill="var(--accent)" opacity="0.85" />
              <rect x={x + pw + 2} y={y} width={aw} height="16" rx="3" fill="var(--gen)" opacity="0.85" />
              <text x={x + pw + aw + 10} y={y + 12} class="tag">{t(`prompt ${r.prompt.toLocaleString()} · answer ~${r.answer * 10} tokens`, `prompt ${r.prompt.toLocaleString()} · 回答 ~${r.answer * 10} 个 token`)}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 400 }}>
            <rect x="16" y={RG.y + 6 * RG.rowH + 4} width="12" height="12" rx="2" fill="var(--accent)" opacity="0.85" /><text x="34" y={RG.y + 6 * RG.rowH + 14} class="tag">{t('prompt: one prefill, all its tokens at once', 'prompt：一次 prefill，所有 token 一起算')}</text>
            <rect x="260" y={RG.y + 6 * RG.rowH + 4} width="12" height="12" rx="2" fill="var(--gen)" opacity="0.85" /><text x="278" y={RG.y + 6 * RG.rowH + 14} class="tag">{t('then the answer: one decode step per token', '然后是回答：每个 token 一个 decode 步')}</text>
          </g>
        </g>
      {/if}

      <!-- Static batching, defined -->
      {#if cur.scene === 'static'}
        <g transition:fade={{ duration: 250 }}>
          <rect x="24" y="70" width="196" height="220" rx="12" fill="#fbfaf7" stroke="var(--accent)" stroke-dasharray="5 4" />
          <text x="40" y="92" class="boxtitle">{t('batch 1 · six requests', 'batch 1 · 六个 request')}</text>
          {#each requests as r, i}
            <g in:fly={{ y: -6, delay: i * 50, duration: 220 }}>
              <rect x="40" y={106 + i * 27} width="164" height="21" rx="5" fill="white" stroke="var(--line)" />
              <text x="50" y={106 + i * 27 + 14} class="cell">req {r.id}</text>
              <rect x={94} y={106 + i * 27 + 5} width={Math.max(4, r.prompt * 0.02)} height="11" rx="2" fill="var(--accent)" opacity="0.85" />
              <rect x={94 + Math.max(4, r.prompt * 0.02) + 3} y={106 + i * 27 + 5} width={r.answer * 2.6} height="11" rx="2" fill="var(--gen)" opacity="0.85" />
            </g>
          {/each}
          <text x="40" y="279" class="tag">{t('fixed until all six finish', '固定不变，直到六个都完成')}</text>

          <line x1="226" y1="180" x2="240" y2="180" class="wire" />
          <polygon points="238,174 238,186 248,180" fill="var(--faint)" />

          <rect x="252" y="70" width="244" height="220" rx="12" fill="#fbfaf7" stroke="var(--line)" />
          <text x="268" y="92" class="boxtitle">{t('the GPU, step by step', 'GPU，一步一步')}</text>
          {#each [
            { n: '1', t: t('prefill all six prompts', 'prefill 全部六个 prompt'), s: t('one forward pass, so they finish together', '一次前向，所以同时完成'), c: 'var(--accent)' },
            { n: '2', t: t('decode, in lockstep', 'decode，齐步走'), s: t('one token for each, per step', '每步每个各一个 token'), c: 'var(--gen)' },
            { n: '3', t: t('repeat until the last is done', '重复直到最后一个完成'), s: t('short answers sit idle meanwhile', '短回答在此期间空闲'), c: 'var(--gen)' },
            { n: '4', t: t('then admit the next six', '然后接纳下六个'), s: t('and prefill them together', '并一起 prefill'), c: 'var(--accent)' },
          ] as row, i}
            <g in:fade={{ delay: 300 + i * 150 }}>
              <circle cx="278" cy={118 + i * 44} r="8" fill={row.c} />
              <text x="278" y={118 + i * 44 + 3.5} text-anchor="middle" class="steplabel">{row.n}</text>
              <text x="296" y={118 + i * 44 + 1} class="slab">{row.t}</text>
              <text x="296" y={118 + i * 44 + 15} class="tag">{row.s}</text>
            </g>
          {/each}

          <g in:fade={{ delay: 900 }}>
            <rect x="512" y="70" width="192" height="220" rx="12" fill="white" stroke="var(--line)" stroke-dasharray="5 4" />
            <text x="528" y="92" class="boxtitle">{t('queue', '队列')}</text>
            {#each queueAnswers.slice(0, 5) as _, i}
              <rect x="528" y={106 + i * 27} width="160" height="21" rx="5" fill="#fbfaf7" stroke="var(--line)" />
              <text x="538" y={106 + i * 27 + 14} class="cell">req {7 + i}</text>
              <text x="678" y={106 + i * 27 + 14} text-anchor="end" class="tag">{t('waiting', '等待中')}</text>
            {/each}
            <text x="528" y="265" class="tag">{t('admitted after batch 1 ends,', 'batch 1 结束后才接纳，')}</text>
            <text x="528" y="279" class="tag">{t('even if most of it finished early', '即使大部分早已完成')}</text>
          </g>
        </g>
      {/if}

      <!-- Grid: slots × engine steps -->
      {#if cur.scene === 'grid'}
        {@const sim = sims[cur.mode === 'continuous' ? 'continuous' : 'static']}
        {@const ly = G.y + SLOTS * (G.ch + G.gap) + 22}
        {@const sy = ly + (cur.highlight ? 58 : 40)}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y={G.y - 34} class="rowlabel">{t(`${SLOTS} slots · ${T} engine steps · `, `${SLOTS} 个槽位 · ${T} 个引擎步 · `)}{cur.mode === 'continuous' ? t('continuous batching', '连续批处理') : t('static batching', '静态批处理')}</text>
          {#each Array(T) as _, t}
            {#if t % 5 === 0 && !sim.wide[t]}
              <text x={G.x + sim.colX[t] + sim.colW[t] / 2} y={G.y - 8} text-anchor="middle" class="tag">{t}</text>
            {/if}
            {#if sim.wide[t]}
              <text x={G.x + sim.colX[t] + sim.colW[t] / 2} y={G.y - 8} text-anchor="middle" class="tag strong" fill="var(--accent)">⫽</text>
            {/if}
          {/each}
          {#each sim.grid as row, s}
            <text x={G.x - 10} y={G.y + s * (G.ch + G.gap) + 14} text-anchor="end" class="rowlabel">{t(`slot ${s + 1}`, `槽位 ${s + 1}`)}</text>
            {#each row as c, t}
              {@const cx = G.x + sim.colX[t]}
              {@const cy = G.y + s * (G.ch + G.gap)}
              {#if cur.highlight && sim.wide[t] && c === 'decode'}
                <!-- a decode slot in a prefill step: its step is stretched to the prompt's math; the token comes out at the end -->
                <rect x={cx + 0.5} y={cy + 0.5} width={sim.colW[t] - 1} height={G.ch - 1} rx="3" fill="var(--gen-soft)" stroke="var(--gen)" stroke-opacity="0.5" class="cellg" in:fade={{ duration: 300 }} />
                <rect x={cx + sim.colW[t] - 9} y={cy} width="9" height={G.ch} rx="3" fill={cellColor.decode} class="cellg" in:fade={{ duration: 300 }} />
              {:else}
                <rect x={cx} y={cy} width={sim.colW[t]} height={G.ch} rx="3" fill={cellColor[c]}
                      opacity={cur.highlight && !sim.wide[t] ? 0.25 : 1} class="cellg" in:fade={{ delay: t * 35, duration: 150 }} />
              {/if}
            {/each}
          {/each}
          <rect x={G.x} y={ly - 10} width="12" height="12" rx="2" fill={cellColor.prefill} /><text x={G.x + 18} y={ly} class="tag">{t(`prefill step ⫽ drawn short · 2,000 tokens: ${Math.round(tComp(2000) / tMem)}× a decode step`, `prefill 步 ⫽ 画短了 · 2,000 token：${Math.round(tComp(2000) / tMem)}× 一个 decode 步`)}</text>
          <rect x={G.x + 316} y={ly - 10} width="12" height="12" rx="2" fill={cellColor.decode} /><text x={G.x + 334} y={ly} class="tag">{t('decode step, one token', 'decode 步，一个 token')}</text>
          <rect x={G.x + 466} y={ly - 10} width="12" height="12" rx="2" fill={cellColor.idle} /><text x={G.x + 484} y={ly} class="tag">{t('idle slot', '空闲槽位')}</text>
          {#if cur.highlight}
            <g in:fade>
              <rect x={G.x + 0.5} y={ly + 8.5} width="35" height="11" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" stroke-opacity="0.5" /><rect x={G.x + 28} y={ly + 8} width="8" height="12" rx="2" fill={cellColor.decode} />
              <text x={G.x + 42} y={ly + 18} class="tag">{t(`a decode slot in a prefill step: same one token, but its step is stretched to the length of the prompt's math`, `prefill 步里的 decode 槽位：还是那一个 token，但该步被拉长到 prompt 计算所需的时间`)}</text>
            </g>
          {/if}
          <g in:fade={{ delay: 900 }}>
            <text x={G.x - 10} y={sy} class="pt">·</text><text x={G.x} y={sy} class="legend">{t('tokens produced: ', '产出 token：')}<tspan class="strong">{sim.tokens}</tspan>{t(' · idle slot-steps: ', ' · 空闲槽位步：')}<tspan class="strong">{sim.idle}</tspan>{t(` of ${SLOTS * T}`, ` / ${SLOTS * T}`)}</text>
            {#if cur.highlight}
              <text x={G.x - 10} y={sy + 22} class="pt">·</text><text x={G.x} y={sy + 22} class="legend">{t(`${sim.wide.filter(Boolean).length} of ${T} steps carry a prefill. In each one, every other slot's token only comes out`, `${sim.wide.filter(Boolean).length} / ${T} 步带有 prefill。这些步里，其他槽位的 token`)}</text>
              <text x={G.x} y={sy + 40} class="legend">{t('when the whole pass, prompt included, is done.', '要等整个前向（含 prompt）结束才出来。')}</text>
            {:else if cur.mode === 'continuous'}
              <text x={G.x - 10} y={sy + 22} class="pt">·</text><text x={G.x} y={sy + 22} class="legend">{t(`same ${T} steps: ${Math.round(((sim.tokens - sims.static.tokens) / sims.static.tokens) * 100)}% more tokens than static, and request 7 started at step ${sims.continuous.grid.flat().length ? requests.reduce((m, r) => Math.min(m, r.answer), 99) + 1 : 0} instead of ${batchEnd}.`, `同样 ${T} 步：比静态多 ${Math.round(((sim.tokens - sims.static.tokens) / sims.static.tokens) * 100)}% 的 token，request 7 在第 ${sims.continuous.grid.flat().length ? requests.reduce((m, r) => Math.min(m, r.answer), 99) + 1 : 0} 步就开始，而不是第 ${batchEnd} 步。`)}</text>
            {:else}
              <text x={G.x - 10} y={sy + 22} class="pt">·</text><text x={G.x} y={sy + 22} class="legend">{t(`request 7 can't start until step ${batchEnd}, after request 3 finishes at step ${batchEnd - 1}. Slot 5 sat idle for ${batchEnd - requests[4].answer - 1} of those steps.`, `request 7 要到第 ${batchEnd} 步才能开始，因为 request 3 在第 ${batchEnd - 1} 步才完成。槽位 5 在其中空闲了 ${batchEnd - requests[4].answer - 1} 步。`)}</text>
            {/if}
          </g>
        </g>
      {/if}
      {#if cur.foot}
        {#key cur.foot}<text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>{cur.foot === KV_FOOT ? t(KV_FOOT, KV_FOOT_ZH) : t(MIX_FOOT, MIX_FOOT_ZH)}</text>{/key}
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .cell { font-family: var(--mono); font-size: 10px; fill: var(--fg); }
  .cellg { transition: opacity 300ms; }
  .tag.strong { fill: var(--fg); font-weight: 600; }
  .slab.strong { font-weight: 650; font-size: 14px; }
  .tile-value { font-size: 20px; font-weight: 650; fill: var(--fg); letter-spacing: -0.02em; }
  .tile-label { font-size: 10.5px; fill: var(--muted); }
  .bar { transform-box: fill-box; transform-origin: left center; transition: transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1), fill 300ms; }
  .wire { stroke: var(--line); stroke-width: 6; stroke-linecap: round; }
</style>
