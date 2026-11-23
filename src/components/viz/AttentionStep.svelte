<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { LAYERS, HEADS, KV_HEADS, HEAD_DIM, D_MODEL } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  // ---- Data --------------------------------------------------------------------------------
  const tokens = ['The', ' capital', ' of', ' France', ' is', ' Paris'];
  const PROMPT_N = 5;
  // Made-up but plausible attention scores (q · k) for the attending token against each key.
  const scores: Record<number, number[]> = {
    4: [0.4, 1.9, 0.2, 2.6, 0.9],
    5: [0.3, 1.4, 0.1, 1.8, 0.6, 2.2],
  };
  // Two illustrative numbers per vector make each displayed score checkable; real q and k have 128.
  const dotQ = [1, 2];
  const dotK: [number, number][] = [[0.2, 0.1], [0.5, 0.7], [0.1, 0.05], [0.8, 0.9], [0.3, 0.3]];
  const softmax = (a: number[]) => {
    const m = Math.max(...a); const e = a.map((v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0);
    return e.map((v) => v / s);
  };

  // ---- Script: each step is a complete description of what is on screen ---------------------
  interface Step {
    caption: string; captionZh: string; n: number;
    x?: boolean; rows?: boolean; rowsFor?: number; flyIn?: boolean; intro?: boolean;
    attend?: number; scores?: boolean; weights?: boolean; mix?: boolean;
    causal?: boolean; recompute?: boolean; unusedQ?: boolean; tally?: boolean;
    markNew?: boolean;        // highlight the latest token's column as "new"
  }
  const steps: Step[] = [
    { n: 5, intro: true, caption: `Same five tokens, one forward pass. This time we watch what one attention layer does with them.`, captionZh: `还是这五个 token，一起走进模型。打开一个 attention 层：前面的 token 把信息传给后面。` },
    { n: 5, x: true, caption: `Each token comes in as a vector. Call it x.`, captionZh: `每个 token 都变成一排有顺序的数，叫向量，记作 x。` },
    { n: 5, rows: true, caption: `Every token multiplies its own x by three learned matrices and gets a <b>query</b>, a <b>key</b> and a <b>value</b>. No other token is involved yet.`, captionZh: `每个 token 用自己的 x 乘三个学好的矩阵，得到一个 <b>query</b>、一个 <b>key</b> 和一个 <b>value</b>。暂时不涉及其他 token。` },
    { n: 5, rows: true, attend: 4, scores: true, caption: `The last token's query gets dotted with every key. A big score means "this one matters to me".`, captionZh: `点积就是两排数对应相乘，再全部相加。下一步再讲这些分数怎么用。` },
    { n: 5, rows: true, attend: 4, scores: true, weights: true, caption: `Softmax turns the scores into weights that add up to one.`, captionZh: `Softmax 把分数变成权重，加起来等于一。` },
    { n: 5, rows: true, attend: 4, weights: true, mix: true, caption: `Its output is the values, blended by those weights. This is how "is" finds out it's sitting after "capital of France".`, captionZh: `它的输出就是这些 value 按权重混合的结果。"is" 就是这样知道自己跟在 "capital of France" 后面。` },
    { n: 5, rows: true, causal: true, caption: `Every position does the same thing with its own query, over the keys up to itself. One pass, all five outputs at once.`, captionZh: `每个位置都用自己的 query 对截至自身的 key 做同样的事。一遍前向，五个输出同时得到。` },
    // Decode step: the layer runs again, and it really does start over. Same three steps as above, on six tokens.
    { n: 6, flyIn: true, caption: `Decode step. "Paris" joins the sequence, and the layer runs again on all six. From the top.`, captionZh: `Decode 步。"Paris" 加入序列，这一层对全部六个 token 重新运行，从头开始。` },
    { n: 6, x: true, caption: `Six tokens come in as six vectors.`, captionZh: `六个 token 以六个向量的形式输入。` },
    { n: 6, rows: true, caption: `Every token multiplies its x by the same three matrices. All six of them, from scratch.`, captionZh: `每个 token 都用自己的 x 乘同样的三个矩阵。全部六个，从头算起。` },
    { n: 6, rows: true, recompute: true, markNew: true, caption: `Look at the five old columns. Same x, same matrices, same vectors as last time. Nothing changed, we just computed them again.`, captionZh: `看那五个旧列。同样的 x、同样的矩阵、和上次一样的向量。什么都没变，只是又算了一遍。` },
    { n: 6, rows: true, markNew: true, attend: 5, weights: true, mix: true, caption: `Paris's query looks at all six keys and blends all six values. It needs every earlier key and value.`, captionZh: `Paris 的 query 看全部六个 key，混合全部六个 value。它需要之前每一个 key 和 value。` },
    { n: 6, rows: true, markNew: true, unusedQ: true, caption: `The old queries? Their outputs only go on to rebuild the next layer's old x, and from it the same old k and v. Keep every layer's k and v, and nothing reads them.`, captionZh: `旧的 query 呢？它们的输出只会重建下一层的旧 x，再由它算出同样的旧 k 和 v。只要留住每层的 k 和 v，就没人再读它们。` },
    { n: 6, rows: true, markNew: true, tally: true, caption: `So each decode step, the new token needs every earlier k and v, and nothing else from the past. We recomputed them all, identically, in every head of every layer. Why not just keep them?`, captionZh: `所以每个 decode 步，新 token 只需要之前所有的 k 和 v，不需要过去的其他东西。我们却在每层每个 head 里把它们原样重算了一遍。为什么不直接留住它们？` },
  ];


  let step = $state(0);
  let example = $state(0);
  function exampleKey(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); example = i; }
  }
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);

  // ---- Geometry (viewBox units) --------------------------------------------------------------
  const W = 720, H = 400;
  const X0 = 100, charW = 8.2, padX = 10, gap = 6, tokH = 28, seqY = 36;
  const boxW = (t: string) => Math.round(t.length * charW + padX * 2);
  const cols = $derived.by(() => {
    let x = X0;
    return tokens.slice(0, cur.n).map((t) => { const w = boxW(t); const c = { t, x, w, cx: x + w / 2 }; x += w + gap; return c; });
  });
  const seqEndX = $derived(cols[cols.length - 1].x + cols[cols.length - 1].w);

  const CW = 32, CH = 20;
  const ROW = { x: 96, q: 128, k: 156, v: 184 } as const;
  type Row = keyof typeof ROW;
  const COLOR: Record<Row, [string, string]> = {
    x: ['#eeece6', '#8a8780'], q: ['#ede9fe', '#7c3aed'], k: ['#cffafe', '#0891b2'], v: ['#dcfce7', '#16a34a'],
  };
  const LOW = 226;                  // top of the lower panel
  const BAR_BASE = LOW + 128, BAR_MAX = 78, BAR_W = 26;
  const sub = (i: number) => String(i).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d]);

  const rowsFor = $derived(cur.rows ? (cur.rowsFor ?? cur.n) : 0);
  const w = $derived(cur.attend !== undefined ? softmax(scores[cur.attend]) : []);
  const isNewCol = (c: number) => !!cur.markNew && c >= PROMPT_N;
  const isOld = (c: number) => cur.n > PROMPT_N && c < PROMPT_N;
  const sameBadge = (r: Row, c: number) => (cur.recompute || cur.tally) && (r === 'k' || r === 'v') && isOld(c);
  const unused = (r: Row, c: number) => (cur.unusedQ || cur.tally) && r === 'q' && isOld(c);
  const hotQ = (r: Row, c: number) => r === 'q' && cur.attend === c;
  const hotK = (r: Row, c: number) => r === 'k' && cur.attend !== undefined && (cur.scores || cur.weights) && c <= cur.attend;
  const hotV = (r: Row, c: number) => r === 'v' && cur.mix && cur.attend !== undefined && c <= cur.attend;
  const outX = $derived(seqEndX + 44);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Attention per decode step, step {step + 1}">
      <defs>
        <marker id="intro-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="var(--accent)" />
        </marker>
        <marker id="vector-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill={COLOR.x[1]} />
        </marker>
      </defs>
      <!-- Token row -->
      <text x="16" y={seqY + 18} class="rowlabel">tokens</text>
      {#each cols as c, i (i)}
        <g in:fly={cur.flyIn && i === cols.length - 1 ? { y: -30, duration: 450, easing: cubicOut } : { duration: 0 }}>
          <rect x={c.x} y={seqY} width={c.w} height={tokH} rx="6" fill={i < PROMPT_N ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={i < PROMPT_N ? 'var(--accent)' : 'var(--gen)'} stroke-width="1.5" />
          <text x={c.cx} y={seqY + 18} text-anchor="middle" class="tok">{c.t.replace(/^ /, '␣')}</text>
        </g>
      {/each}
      {#if cur.intro}
        {@const last = cols[cols.length - 1]}
        <g transition:fade={{ duration: 700 }}>
          {#each cols.slice(0, -1) as c}
            <path d="M {c.cx} {seqY + tokH + 5} C {c.cx} 105, {last.cx} 105, {last.cx} {seqY + tokH + 8}"
                  fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#intro-arrow)" />
          {/each}
          <text x={W / 2} y="138" text-anchor="middle" class="boxtitle">{t('one attention layer', '一个 attention 层')}</text>
          <text x={W / 2} y="164" text-anchor="middle" class="slab">{t('earlier tokens pass information to later ones', '前面的 token 把信息传给后面的 token')}</text>
        </g>
      {/if}
      {#if cur.markNew}
        <text x={cols[cur.n - 1].cx} y={ROW.x - 8} text-anchor="middle" class="tag new" in:fade>{t('new', '新')}</text>
      {/if}

      <!-- Token-to-vector mapping for the first vector explanation -->
      {#if cur.x && cur.n === PROMPT_N}
        {#each cols as c, i (i)}
          <path d="M {c.cx} {seqY + tokH + 12} L {c.cx} {ROW.x - 10}"
                fill="none" stroke={COLOR.x[1]} stroke-width="1.5" marker-end="url(#vector-arrow)"
                in:fade={{ delay: 250 + i * 50, duration: 250 }} />
        {/each}
        <text x={W / 2} y={ROW.x + 64} text-anchor="middle" class="slab" in:fade={{ delay: 500 }}>
          {t('each x is an ordered list of numbers', '每个 x 都是一排有顺序的数')}
        </text>
      {/if}

      <!-- x / q / k / v rows -->
      {#if cur.x || cur.rows}
        <g transition:fade={{ duration: 200 }}>
          <text x="16" y={ROW.x + 14} class="rowlabel">x</text>
          {#each cols as c, i (i)}
            <g in:fly={{ y: -8, delay: i * 50, duration: 250 }}>
              <rect x={c.cx - CW / 2} y={ROW.x} width={CW} height={CH} rx="4" fill={COLOR.x[0]} stroke={COLOR.x[1]} />
              <text x={c.cx} y={ROW.x + 14} text-anchor="middle" class="cell">x{sub(i + 1)}</text>
            </g>
          {/each}
        </g>
      {/if}
      {#if cur.rows}
        <g transition:fade={{ duration: 200 }}>
          {#each (['q', 'k', 'v'] as Row[]) as r, ri}
            <text x="16" y={ROW[r] + 14} class="rowlabel">{r} <tspan class="eq">= W<tspan class="sub">{r.toUpperCase()}</tspan> x</tspan></text>
            {#each cols.slice(0, rowsFor) as c, i (i)}
              {@const hot = hotQ(r, i) || hotK(r, i) || hotV(r, i)}
              <g in:fly={{ y: -8, delay: (ri * 2 + i) * 45, duration: 250 }}
                 style:opacity={unused(r, i) ? 0.3 : hotV(r, i) ? 0.35 + 0.65 * w[i] : 1} class="cellg">
                <rect x={c.cx - CW / 2} y={ROW[r]} width={CW} height={CH} rx="4" fill={COLOR[r][0]} stroke={COLOR[r][1]}
                      stroke-width={hot || isNewCol(i) ? 2.5 : 1} class:pulse={cur.recompute && !isNewCol(i)} style="animation-delay: {i * 60}ms" />
                <text x={c.cx} y={ROW[r] + 14} text-anchor="middle" class="cell">{r}{sub(i + 1)}</text>
                {#if sameBadge(r, i)}
                  <g in:fade={{ delay: 400 + i * 60 }}>
                    <circle cx={c.cx + CW / 2} cy={ROW[r]} r="6.5" fill="white" stroke={COLOR[r][1]} />
                    <text x={c.cx + CW / 2} y={ROW[r] + 3.5} text-anchor="middle" class="badge" fill={COLOR[r][1]}>=</text>
                  </g>
                {/if}
                {#if unused(r, i)}
                  <line x1={c.cx - CW / 2 + 3} y1={ROW[r] + CH - 3} x2={c.cx + CW / 2 - 3} y2={ROW[r] + 3} stroke={COLOR.q[1]} stroke-width="2" in:fade />
                {/if}
              </g>
            {/each}
          {/each}
        </g>
      {/if}

      <!-- Blend lines from values to the output cell -->
      {#if cur.mix && cur.attend !== undefined}
        <g transition:fade={{ duration: 250 }}>
          {#each cols.slice(0, cur.attend + 1) as c, i}
            <path d="M {c.cx} {ROW.v + CH} C {c.cx} {ROW.v + 46}, {outX - 6} {ROW.v + 46}, {outX} {ROW.v + CH}"
                  fill="none" stroke={COLOR.v[1]} stroke-width={0.8 + w[i] * 6} opacity="0.55" />
          {/each}
          <rect x={outX - 20} y={ROW.v} width="40" height={CH} rx="4" fill="white" stroke={COLOR.v[1]} stroke-width="2" />
          <text x={outX} y={ROW.v + 14} text-anchor="middle" class="cell">out{sub(cur.attend + 1)}</text>
          <text x={outX} y={ROW.v - 8} text-anchor="middle" class="tag">Σ wⱼ vⱼ</text>
        </g>
      {/if}

      <!-- Lower panel: scores and weights for the attending token -->
      {#if cur.attend !== undefined && (cur.scores || cur.weights)}
        <g transition:fade={{ duration: 250 }}>
          {#if cur.scores}
            <text x="16" y={LOW + 16} class="rowlabel">q{sub(cur.attend + 1)} · k<tspan class="sub">j</tspan></text>
            {#each cols.slice(0, cur.attend + 1) as c, i}
              {#if step === 3 && $lang === 'zh' && example === i}
                <rect x={c.x - 3} y={LOW - 1} width={c.w + 6} height="25" rx="4" fill={COLOR.k[0]} />
              {/if}
              <text x={c.cx} y={LOW + 16} text-anchor="middle" class="num" in:fade={{ delay: i * 60 }}>{scores[cur.attend][i].toFixed(1)}</text>
            {/each}
          {/if}
          {#if cur.weights}
            <text x="16" y={BAR_BASE - 4} class="rowlabel">softmax</text>
            {#each cols.slice(0, cur.attend + 1) as c, i}
              {@const h = w[i] * BAR_MAX}
              <g in:fly={{ y: 10, delay: i * 60, duration: 300 }}>
                <rect x={c.cx - BAR_W / 2} y={BAR_BASE - h} width={BAR_W} height={h} rx="3" fill={COLOR.k[1]} opacity={0.35 + 0.65 * w[i]} />
                <text x={c.cx} y={BAR_BASE - h - 6} text-anchor="middle" class="num">{w[i].toFixed(2)}</text>
              </g>
            {/each}
            <line x1={cols[0].x} y1={BAR_BASE + 0.5} x2={cols[cur.attend].x + cols[cur.attend].w} y2={BAR_BASE + 0.5} stroke="var(--line)" />
          {/if}
        </g>
      {/if}

      <!-- Chinese concrete view: pick any column to expand its dot product. -->
      {#if step === 3 && $lang === 'zh'}
        <g in:fade>
          <text x="28" y="272" class="slab">点积 = 对应相乘再相加 · 点一列看计算</text>
          <text x="18" y="294" class="pt">·</text>
          <text x="28" y="294" class="legend">q₅ 属于最后的 ␣is · 先拿它看一遍，其他位置后面也算</text>
          <text x="18" y="314" class="pt">·</text>
          <text x="28" y="314" class="legend">j 表示第几个 key · 自己也算，保留自己的信息</text>
          <text x="28" y="340" class="num">示意 q₅ = [{dotQ.join(', ')}]　k{sub(example + 1)} = [{dotK[example].map((n) => n.toFixed(1)).join(', ')}]</text>
          <text x="28" y="366" class="num">{dotQ[0]}×{dotK[example][0].toFixed(1)} + {dotQ[1]}×{dotK[example][1].toFixed(1)} = {(dotQ[0] * dotK[example][0]).toFixed(1)} + {(dotQ[1] * dotK[example][1]).toFixed(1)} = {scores[4][example].toFixed(1)}</text>
        </g>
        {#each cols.slice(0, 5) as c, i}
          <rect x={c.x - 3} y={seqY} width={c.w + 6} height={LOW + 25 - seqY} fill="transparent" class="example-hit"
                role="button" tabindex="0" aria-label={`看第 ${i + 1} 列的点积计算`}
                onclick={() => (example = i)} onkeydown={(e) => exampleKey(e, i)} />
        {/each}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">用 2 个示意数演示 · 真实 q、k 的更多数也照这个算法算</text>
      {/if}

      <!-- Causal matrix: who attends to whom in one forward pass -->
      {#if cur.causal}
        {@const G = 22}
        {@const gx = 330}
        {@const gy = LOW + 30}
        <g transition:fade={{ duration: 250 }}>
          <text x={gx - 14} y={gy - 12} text-anchor="end" class="tag">query ↓</text>
          <text x={gx + (PROMPT_N * G) / 2} y={gy - 12} text-anchor="middle" class="tag">key →</text>
          {#each Array(PROMPT_N) as _, i}
            <text x={gx - 8} y={gy + i * G + 15} text-anchor="end" class="cell">q{sub(i + 1)}</text>
            {#each Array(PROMPT_N) as _, j}
              {#if j <= i}
                <rect x={gx + j * G} y={gy + i * G} width={G - 3} height={G - 3} rx="3"
                      fill={i === PROMPT_N - 1 ? COLOR.k[1] : COLOR.k[0]} stroke={COLOR.k[1]} stroke-width="0.8"
                      in:fly={{ y: -6, delay: (i * PROMPT_N + j) * 30, duration: 200 }} />
              {/if}
            {/each}
          {/each}
          <text x={gx + PROMPT_N * G + 14} y={gy + (PROMPT_N - 1) * G + 15} class="tag" in:fade={{ delay: 900 }}>{t('← the row we just watched', '← 刚才看的那一行')}</text>
        </g>
      {/if}

      {#if cur.recompute}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>{t(`Llama also rotates q and k by each token's position (RoPE) · a token's position never changes, so its k is still identical`, `Llama 还会按每个 token 的位置旋转 q 和 k（RoPE）· token 的位置不变，所以它的 k 仍然相同`)}</text>
      {/if}

      <!-- Tally legend -->
      {#if cur.tally}
        {@const ly = LOW + 24}
        <g in:fade={{ duration: 300 }}>
          <rect x="16" y={ly - 10} width="14" height="14" rx="3" fill={COLOR.k[0]} stroke={COLOR.k[1]} />
          <rect x="34" y={ly - 10} width="14" height="14" rx="3" fill={COLOR.v[0]} stroke={COLOR.v[1]} />
          <text x="58" y={ly + 1} class="legend"><tspan class="strong">{t('needed', '需要')}</tspan> {t('by every future token: k and v of every earlier position. Recomputed this step, identical.', '每个未来 token 都要用：之前每个位置的 k 和 v。这一步重算了一遍，完全相同。')}</text>
          <rect x="16" y={ly + 20} width="14" height="14" rx="3" fill={COLOR.q[0]} stroke={COLOR.q[1]} opacity="0.5" />
          <line x1="18" y1={ly + 32} x2="28" y2={ly + 22} stroke={COLOR.q[1]} stroke-width="1.5" />
          <text x="58" y={ly + 31} class="legend"><tspan class="strong">{t('not needed', '不需要')}</tspan>{t(': the old queries. Each one was used once, on its own step.', '：旧的 query。每个只在自己的那一步用过一次。')}</text>
          <rect x="16" y={ly + 50} width="14" height="14" rx="3" fill="white" stroke="var(--gen)" stroke-width="2" />
          <text x="58" y={ly + 61} class="legend"><tspan class="strong">{t('new', '新')}</tspan>{t(': q, k, v for the token that just arrived.', '：刚到的那个 token 的 q、k、v。')}</text>
          <text x="16" y={ly + 100} class="legend" in:fade={{ delay: 700 }}>{t(`per head, per layer: ${PROMPT_N * 2} known vectors recomputed · Llama-3-8B has ${KV_HEADS} k, v heads × ${LAYERS} layers: ${KV_HEADS * LAYERS} times a step`, `每个 head、每层：重算 ${PROMPT_N * 2} 个已知向量 · Llama-3-8B 有 ${KV_HEADS} 个 k, v head × ${LAYERS} 层：每步 ${KV_HEADS * LAYERS} 次`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`a head is one set of the three matrices, drawn here once · Llama-3-8B's ${HEADS} query heads share ${KV_HEADS} sets of k, v, ${HEADS / KV_HEADS} each (chapter 14)`, `一个 head 就是这三个矩阵的一组，这里只画一次 · Llama-3-8B 的 ${HEADS} 个 query head 共享 ${KV_HEADS} 组 k, v，每组 ${HEADS / KV_HEADS} 个（第 14 章）`)}</text>
        </g>
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .rowlabel .eq { fill: var(--faint); }
  .sub { font-size: 8px; baseline-shift: sub; }
  .tok { font-family: var(--mono); font-size: 12.5px; fill: var(--fg); }
  .cell { font-family: var(--mono); font-size: 10.5px; fill: var(--fg); }
  .cellg { transition: opacity 300ms; }
  .example-hit { cursor: pointer; }
  .example-hit:focus { outline: 2px solid var(--accent); outline-offset: -2px; }
  .badge { font-family: var(--mono); font-size: 10px; font-weight: 700; }
  .num { font-family: var(--mono); font-size: 10.5px; fill: var(--fg); }
  .tag.new { fill: var(--gen); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; font-size: 9px; }
  rect.pulse { animation: pulse 700ms ease-in-out 2; }
  @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
</style>
