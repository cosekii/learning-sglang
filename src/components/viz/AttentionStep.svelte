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
  const introCounts = [PROMPT_N, PROMPT_N + 1, PROMPT_N + 2];
  const introFirst = [PROMPT_N, 1, 1];
  const introTotal = introCounts.reduce((sum, n) => sum + n, 0);
  const introFirstTotal = introFirst.reduce((sum, n) => sum + n, 0);
  const introRecomputed = introTotal - introFirstTotal;
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
    { n: 5, intro: true, caption: `Same five tokens, one forward pass. This time we watch what one attention layer does with them.`, captionZh: `上一章没存旧结果，18 格有 11 格是重算。打开模型里的 attention，找哪些不用再算。` },
    { n: 5, x: true, caption: `Each token comes in as a vector. Call it x.`, captionZh: `每个 token 都变成一排有顺序的数，叫向量，记作 x。` },
    { n: 5, rows: true, caption: `Every token multiplies its own x by three learned matrices and gets a <b>query</b>, a <b>key</b> and a <b>value</b>. No other token is involved yet.`, captionZh: `每个 token 用自己的 x 乘三个学好的矩阵，得到一个 <b>query</b>、一个 <b>key</b> 和一个 <b>value</b>。暂时不涉及其他 token。` },
    { n: 5, rows: true, attend: 4, scores: true, caption: `The last token's query gets dotted with every key. A big score means "this one matters to me".`, captionZh: `点积就是两排数对应相乘，再全部相加。下一步再讲这些分数怎么用。` },
    { n: 5, rows: true, attend: 4, scores: true, weights: true, caption: `Softmax turns the scores into weights that add up to one.`, captionZh: `Softmax 把分数换成权重。每列的权重表示它占多少，合起来是 1。` },
    { n: 5, rows: true, attend: 4, weights: true, mix: true, caption: `Its output is the values, blended by those weights. This is how "is" finds out it's sitting after "capital of France".`, captionZh: `每列 value 先乘自己的权重，再把五份相加。␣France 的权重最大，贡献也最大。` },
    { n: 5, rows: true, causal: true, caption: `Every position does the same thing with its own query, over the keys up to itself. One pass, all five outputs at once.`, captionZh: `每个位置都用自己的 query 对截至自身的 key 做同样的事。一遍前向，五个输出同时得到。` },
    // Decode step: the layer runs again, and it really does start over. Same three steps as above, on six tokens.
    { n: 6, flyIn: true, caption: `Decode step. "Paris" joins the sequence, and the layer runs again on all six. From the top.`, captionZh: `Decode 步。"Paris" 加入序列，这一层对全部六个 token 重新运行，从头开始。` },
    { n: 6, x: true, caption: `Six tokens come in as six vectors.`, captionZh: `六个 token 各变成一排数，得到 x₁ 到 x₆。前五个 x 没变，只有 x₆ 是新的。` },
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
  const zhTally = $derived(step === 11 && $lang === 'zh');
  const zhIntro = $derived(step === 0 && $lang === 'zh');
  const zhWeights = $derived(step === 4 && $lang === 'zh');
  const zhMix = $derived(step === 5 && $lang === 'zh');
  const zhSix = $derived(step === 8 && $lang === 'zh');
  const zhRecompute = $derived(step === 9 && $lang === 'zh');
  let phone = $state(false);
  $effect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const phoneIntro = $derived(phone && zhIntro);
  const phoneWeights = $derived(phone && zhWeights);
  const phoneMix = $derived(phone && zhMix);
  const phoneSix = $derived(phone && zhSix);
  const phoneRecompute = $derived(phone && zhRecompute);
  const expScores = $derived(cur.attend !== undefined ? scores[cur.attend].map((score) => Math.exp(score)) : []);
  const expTotal = $derived(expScores.reduce((sum, value) => sum + value, 0));
  const tallyDenominator = scores[5].reduce((sum, score) => sum + Math.exp(score), 0);
  const tallyParisExp = Math.exp(scores[5][5]);
  const tallyRoundedSum = $derived(w.reduce((sum, weight) => sum + Number(weight.toFixed(2)), 0));
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox={phoneIntro ? '0 0 360 450' : phoneRecompute ? '0 0 360 440' : phoneSix ? '0 0 360 430' : phoneMix ? '0 0 360 580' : phoneWeights ? '0 0 360 550' : `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Attention per decode step, step {step + 1}" class:phone-intro={phoneIntro} class:phone-weights={phoneWeights} class:phone-mix={phoneMix} class:phone-six={phoneSix} class:phone-recompute={phoneRecompute}>
      {#if phoneIntro}
        <defs>
          <marker id="phone-intro-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill={COLOR.x[1]} />
          </marker>
        </defs>
        <text x="180" y="26" text-anchor="middle" class="ph-title">没存旧结果：18 格里有 11 格重算</text>
        <text x="180" y="52" text-anchor="middle">第 1 章第 12 步的示例 · 1 格 = 算 1 个位置</text>
        {#each introCounts as n, r}
          {@const y = 86 + r * 34}
          <text x="14" y={y + 4}>第 {r + 1} 轮</text>
          {#each Array(n) as _, c}
            <rect x={72 + c * 24} y={y - 14} width="20" height="20" rx="3" fill={c < n - introFirst[r] ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={c < n - introFirst[r] ? 'var(--gen)' : 'var(--accent)'} />
          {/each}
          <text x="252" y={y + 4}>{n} 格</text>
        {/each}
        <rect x="18" y="178" width="14" height="14" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="40" y="190">第一次算 {introFirstTotal} 格</text>
        <rect x="190" y="178" width="14" height="14" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="212" y="190">重算 {introRecomputed} 格</text>
        <text x="180" y="224" text-anchor="middle" class="ph-strong">5 + 6 + 7 = {introTotal} = {introFirstTotal} + {introRecomputed}</text>
        <line x1="16" y1="246" x2="344" y2="246" stroke="var(--line)" />
        <text x="180" y="276" text-anchor="middle" class="ph-title">模型里一个叫 attention 的部分</text>
        {@const phoneTokens = [{ t: 'The', x: 12, w: 42 }, { t: '␣capital', x: 60, w: 78 }, { t: '␣of', x: 144, w: 48 }, { t: '␣France', x: 198, w: 80 }, { t: '␣is', x: 284, w: 64 }]}
        {#each phoneTokens as token}
          <rect x={token.x} y="296" width={token.w} height="30" rx="5" fill={COLOR.x[0]} stroke={COLOR.x[1]} />
          <text x={token.x + token.w / 2} y="316" text-anchor="middle">{token.t}</text>
        {/each}
        {#each phoneTokens.slice(0, -1) as token}
          <path d="M {token.x + token.w / 2} 331 C {token.x + token.w / 2} 366, 316 366, 316 334" fill="none" stroke={COLOR.x[1]} stroke-width="1.5" marker-end="url(#phone-intro-arrow)" />
        {/each}
        <rect x="34" y="386" width="14" height="14" rx="3" fill={COLOR.x[0]} stroke={COLOR.x[1]} />
        <text x="180" y="398" text-anchor="middle">灰色：前面的 token 把信息传给后面的 token</text>
        <text x="180" y="430" text-anchor="middle" class="ph-strong">接下来：找哪些旧结果不用再算</text>
      {:else if phoneRecompute}
        <text x="180" y="26" text-anchor="middle" class="ph-title">每个 x 都重新算 q、k、v</text>
        <text x="180" y="54" text-anchor="middle">矩阵 = 学好的数字表，三张表各算 q、k、v</text>
        <text x="53" y="82" text-anchor="middle" class="ph-faint">token</text>
        <text x="128" y="82" text-anchor="middle" class="ph-faint">x</text>
        <text x="200" y="82" text-anchor="middle" class="ph-faint">q</text>
        <text x="256" y="82" text-anchor="middle" class="ph-faint">k</text>
        <text x="312" y="82" text-anchor="middle" class="ph-faint">v</text>
        {#each cols as c, i}
          <rect x="12" y={94 + i * 42} width="82" height="30" rx="5" fill={i === PROMPT_N ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={i === PROMPT_N ? 'var(--gen)' : 'var(--accent)'} />
          <text x="53" y={114 + i * 42} text-anchor="middle">{c.t.replace(/^ /, '␣')}</text>
          <text x="103" y={114 + i * 42} text-anchor="middle">→</text>
          <rect x="112" y={94 + i * 42} width="32" height="30" rx="4" fill={COLOR.x[0]} stroke={COLOR.x[1]} />
          <text x="128" y={114 + i * 42} text-anchor="middle">x{sub(i + 1)}</text>
          <text x="160" y={114 + i * 42} text-anchor="middle">→</text>
          {#each (['q', 'k', 'v'] as Row[]) as r, ri}
            <rect x={178 + ri * 56} y={94 + i * 42} width="44" height="30" rx="4" fill={COLOR[r][0]} stroke={COLOR[r][1]} />
            <text x={200 + ri * 56} y={114 + i * 42} text-anchor="middle">{r}{sub(i + 1)}</text>
          {/each}
        {/each}
        <text x="180" y="362" text-anchor="middle" class="ph-title">{cur.n} 个位置 × 3 = {cur.n * 3} 个向量</text>
        <text x="180" y="392" text-anchor="middle">每一列都乘第 3 步同样的三个矩阵</text>
        <text x="180" y="422" text-anchor="middle" class="ph-faint">前 5 列重算；第 6 列第一次算</text>
      {:else if phoneSix}
        <text x="180" y="28" text-anchor="middle" class="ph-title">6 个 token → 6 个向量 x</text>
        <text x="180" y="58" text-anchor="middle">每个 x 都是一排有顺序的数</text>
        <text x="290" y="82" text-anchor="middle" class="ph-faint">与第 2 步比</text>
        {#each cols as c, i}
          <rect x="18" y={94 + i * 46} width="130" height="32" rx="5" fill={i === PROMPT_N ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={i === PROMPT_N ? 'var(--gen)' : 'var(--accent)'} stroke-width="1.5" />
          <text x="83" y={115 + i * 46} text-anchor="middle">{c.t.replace(/^ /, '␣')}</text>
          <text x="176" y={115 + i * 46} text-anchor="middle">→</text>
          <rect x="205" y={94 + i * 46} width="48" height="32" rx="5" fill={i === PROMPT_N ? 'var(--gen-soft)' : COLOR.x[0]} stroke={i === PROMPT_N ? 'var(--gen)' : COLOR.x[1]} stroke-width="1.5" />
          <text x="229" y={115 + i * 46} text-anchor="middle">x{sub(i + 1)}</text>
          <text x="290" y={115 + i * 46} text-anchor="middle" class:new-x={i === PROMPT_N}>{i === PROMPT_N ? '新' : '相同'}</text>
        {/each}
        <text x="180" y="394" text-anchor="middle">x₁—x₅ 没变；x₆ 是 ␣Paris 的向量</text>
        <text x="180" y="418" text-anchor="middle" class="ph-faint">一个 token 对应一个 x</text>
      {:else if phoneMix}
        <text x="180" y="26" text-anchor="middle" class="ph-title">每列先乘权重，再把五份相加</text>
        {#each cols as c, i}
          {@const x = 42 + i * 69}
          <rect x={x - 31} y="44" width="62" height="32" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x} y="65" text-anchor="middle">{c.t.replace(/^ /, '␣')}</text>
          <text x={x} y="112" text-anchor="middle">{w[i].toFixed(2)}</text>
          <text x={x} y="142" text-anchor="middle" class="ph-value">× v{sub(i + 1)}</text>
          {#if i < 4}<text x={x + 34.5} y="142" text-anchor="middle" class="ph-title">+</text>{/if}
          <path d="M {x} 158 C {x} 196, 180 184, 180 220" fill="none" stroke={COLOR.v[1]} stroke-width={1 + w[i] * 5} opacity="0.65" />
        {/each}
        <rect x="140" y="220" width="80" height="34" rx="6" fill="white" stroke={COLOR.v[1]} stroke-width="2" />
        <text x="180" y="242" text-anchor="middle" class="ph-value">out₅</text>
        <text x="180" y="286" text-anchor="middle">out₅ 是 ␣is 在这个 attention 层的输出</text>
        <text x="180" y="332" text-anchor="middle">out₅ = 0.06×v₁ + 0.26×v₂</text>
        <text x="180" y="360" text-anchor="middle">+ 0.05×v₃ + 0.53×v₄ + 0.10×v₅</text>
        <text x="18" y="408">Σ = 把 5 项相加；j = 第几列</text>
        <text x="18" y="446">绿线：value 先乘权重，再送入 out₅</text>
        <text x="18" y="484">␣France 的权重 0.53 最大</text>
        <text x="18" y="514">所以它的 value 贡献最多</text>
        <text x="180" y="560" text-anchor="middle" class="ph-foot">权重来自第 5 步；图中数已四舍五入</text>
      {:else if phoneWeights}
        <text x="180" y="26" text-anchor="middle" class="ph-title">Softmax：分数 → 权重</text>
        {#each cols as c, i}
          {@const x = 48 + i * 66}
          <rect x={x - 30} y="44" width="60" height="30" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={x} y="64" text-anchor="middle">{c.t.replace(/^ /, '␣')}</text>
          <text x={x} y="122" text-anchor="middle">{scores[4][i].toFixed(1)}</text>
          <text x={x} y="174" text-anchor="middle">{expScores[i].toFixed(2)}</text>
          {@const h = w[i] * 90}
          <rect x={x - 15} y={424 - h} width="30" height={h} rx="3" fill={COLOR.k[1]} opacity={0.35 + 0.65 * w[i]} />
          <text x={x} y={416 - h} text-anchor="middle">{w[i].toFixed(2)}</text>
        {/each}
        <text x="16" y="102">第 4 步的分数</text>
        <text x="16" y="154">先变成正数（e^分数）</text>
        <text x="16" y="204">e = 2.718…；^ 表示几次方</text>
        <text x="16" y="230">2^3 = 2×2×2；小数次方用计算工具</text>
        <text x="16" y="260">五个正数合计 = {expTotal.toFixed(2)}</text>
        <text x="16" y="288">权重 = 自己的正数 ÷ {expTotal.toFixed(2)}</text>
        <text x="16" y="318">权重表示每列占多少</text>
        <line x1="16" y1="424" x2="344" y2="424" stroke="var(--line)" />
        <text x="16" y="456">␣France：{expScores[3].toFixed(2)} ÷ {expTotal.toFixed(2)}，约为 {w[3].toFixed(2)}</text>
        <text x="16" y="482">图中数四舍五入</text>
        <text x="16" y="506">0.06 + 0.26 + 0.05 + 0.53 + 0.10 = 1.00</text>
        <text x="16" y="540">下一步：按这些权重混合五列 value</text>
      {:else}
      <defs>
        <marker id="intro-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill={zhIntro ? COLOR.x[1] : 'var(--accent)'} />
        </marker>
        <marker id="vector-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill={COLOR.x[1]} />
        </marker>
        <marker id="vector-arrow-new" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="var(--gen)" />
        </marker>
      </defs>
      <!-- Token row -->
      {#if zhIntro}
        <text x="20" y="26" class="boxtitle">第 1 章第 12 步：没存旧结果，3 轮共算 {introTotal} 格</text>
        <text x="20" y="50" class="legend">1 格 = 一个 token 位置在这一轮算 1 次</text>
        {#each introCounts as n, r}
          {@const y = 82 + r * 34}
          <text x="20" y={y + 4} class="legend">第 {r + 1} 轮</text>
          {#each Array(n) as _, c}
            <rect x={86 + c * 24} y={y - 14} width="20" height="20" rx="3" fill={c < n - introFirst[r] ? 'var(--gen-soft)' : 'var(--accent-soft)'} stroke={c < n - introFirst[r] ? 'var(--gen)' : 'var(--accent)'} />
          {/each}
          <text x="270" y={y + 4} class="legend">{n} 格</text>
        {/each}
        <rect x="380" y="65" width="14" height="14" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="404" y="77" class="legend">第一次算 {introFirst.join(' + ')} = {introFirstTotal} 格</text>
        <rect x="380" y="99" width="14" height="14" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="404" y="111" class="legend">重算 {introCounts[1] - introFirst[1]} + {introCounts[2] - introFirst[2]} = {introRecomputed} 格</text>
        <text x="380" y="151" class="sum">{introCounts.join(' + ')} = {introTotal} = {introFirstTotal} + {introRecomputed} 格</text>
        <line x1="20" y1="184" x2="700" y2="184" stroke="var(--line)" />
        <text x={W / 2} y="214" text-anchor="middle" class="boxtitle">模型里一个叫 attention 的部分，找哪些旧结果不用再算</text>
        {@const last = cols[cols.length - 1]}
        {#each cols as c}
          <rect x={c.x} y="234" width={c.w} height={tokH} rx="6" fill={COLOR.x[0]} stroke={COLOR.x[1]} stroke-width="1.5" />
          <text x={c.cx} y="252" text-anchor="middle" class="tok">{c.t.replace(/^ /, '␣')}</text>
        {/each}
        {#each cols.slice(0, -1) as c}
          <path d="M {c.cx} 267 C {c.cx} 318, {last.cx} 318, {last.cx} 270" fill="none" stroke={COLOR.x[1]} stroke-width="1.5" marker-end="url(#intro-arrow)" />
        {/each}
        <rect x="162" y="343" width="14" height="14" rx="3" fill={COLOR.x[0]} stroke={COLOR.x[1]} />
        <text x={W / 2} y="356" text-anchor="middle" class="slab">灰色：前面的 token 把信息传给后面的 token</text>
      {:else}
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
      {/if}
      {#if zhRecompute}
        <text x={(cols[0].cx + cols[PROMPT_N - 1].cx) / 2} y={ROW.x - 8} text-anchor="middle" class="tag">前 5 列：再算</text>
        <text x={cols[PROMPT_N].cx} y={ROW.x - 8} text-anchor="middle" class="tag new">第 6 列：第一次算</text>
      {:else if cur.markNew}
        <text x={cols[cur.n - 1].cx} y={ROW.x - 8} text-anchor="middle" class="tag new" in:fade>{t('new', '新')}</text>
      {/if}

      <!-- Token-to-vector mapping for the first vector explanation -->
      {#if cur.x && (cur.n === PROMPT_N || zhSix)}
        {#each cols as c, i (i)}
          <path d="M {c.cx} {seqY + tokH + 12} L {c.cx} {ROW.x - 10}"
                fill="none" stroke={zhSix && i === PROMPT_N ? 'var(--gen)' : COLOR.x[1]} stroke-width="1.5" marker-end={zhSix && i === PROMPT_N ? 'url(#vector-arrow-new)' : 'url(#vector-arrow)'}
                in:fade={{ delay: zhSix ? 0 : 250 + i * 50, duration: zhSix ? 0 : 250 }} />
        {/each}
        <text x={W / 2} y={ROW.x + 64} text-anchor="middle" class="slab" in:fade={{ delay: zhSix ? 0 : 500, duration: zhSix ? 0 : 250 }}>
          {t('each x is an ordered list of numbers', '每个 x 都是一排有顺序的数')}
        </text>
        {#if zhSix}
          <text x={(cols[0].cx + cols[PROMPT_N - 1].cx) / 2} y={ROW.x + 112} text-anchor="middle" class="slab">x₁—x₅：和第 2 步相同</text>
          <text x={cols[PROMPT_N].cx} y={ROW.x + 112} text-anchor="middle" class="slab new-x">x₆：新的</text>
          <text x={W / 2} y={ROW.x + 158} text-anchor="middle" class="legend">6 个 token → 6 个 x，一个 token 对应一个 x</text>
        {/if}
      {/if}

      <!-- x / q / k / v rows -->
      {#if cur.x || cur.rows}
        <g transition:fade={{ duration: 200 }}>
          <text x="16" y={ROW.x + 14} class="rowlabel">x</text>
          {#each cols as c, i (i)}
            <g in:fly={{ y: -8, delay: i * 50, duration: 250 }}>
              <rect x={c.cx - CW / 2} y={ROW.x} width={CW} height={CH} rx="4" fill={zhSix && i === PROMPT_N ? 'var(--gen-soft)' : COLOR.x[0]} stroke={zhSix && i === PROMPT_N ? 'var(--gen)' : COLOR.x[1]} />
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
                 style:opacity={unused(r, i) ? 0.3 : hotV(r, i) ? 0.35 + 0.65 * w[i] : 1} class="cellg" class:static={zhTally}>
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
        <g transition:fade={{ duration: zhTally || zhMix ? 0 : 250 }}>
          {#each cols.slice(0, cur.attend + 1) as c, i}
            <path d="M {c.cx} {ROW.v + CH} C {c.cx} {ROW.v + 46}, {outX - 6} {ROW.v + 46}, {outX} {ROW.v + CH}"
                  fill="none" stroke={COLOR.v[1]} stroke-width={0.8 + w[i] * 6} opacity="0.55" />
            {#if zhTally || zhMix}
              <text x={c.cx} y={ROW.v + CH + 14} text-anchor="middle" class="num" style:fill={COLOR.v[1]}>×w{sub(i + 1)}</text>
            {/if}
          {/each}
          <rect x={outX - 20} y={ROW.v} width="40" height={CH} rx="4" fill="white" stroke={COLOR.v[1]} stroke-width="2" />
          <text x={outX} y={ROW.v + 14} text-anchor="middle" class="cell">out{sub(cur.attend + 1)}</text>
          <text x={outX} y={ROW.v - 8} text-anchor="middle" class="tag">{zhMix ? '␣is 的输出' : 'Σ wⱼ vⱼ'}</text>
        </g>
      {/if}

      <!-- Lower panel: scores and weights for the attending token -->
      {#if cur.attend !== undefined && (cur.scores || cur.weights)}
        <g transition:fade={{ duration: zhTally || zhWeights || zhMix ? 0 : 250 }}>
          {#if zhTally}
            <text x="16" y={LOW + 16} class="rowlabel">分数：q₆ · kⱼ</text>
            {#each cols as c, i}
              <text x={c.cx} y={LOW + 16} text-anchor="middle" class="num">{scores[5][i].toFixed(1)}</text>
            {/each}
            <text x="16" y={LOW + 40} class="rowlabel">权重 wⱼ</text>
            {#each cols as c, i}
              <text x={c.cx} y={LOW + 40} text-anchor="middle" class="num">{w[i].toFixed(2)}</text>
            {/each}
            <text x="16" y={LOW + 64} class="legend">共同算法：wⱼ = e^分数 ÷ 六项合计 {tallyDenominator.toFixed(2)} · e = 2.718…；^ 是连乘，如 2^3 = 2×2×2</text>
            <text x="16" y={LOW + 84} class="legend">显示权重四舍五入，合计 {tallyRoundedSum.toFixed(2)}；未舍入权重合计 = 1</text>
            <text x="16" y={LOW + 108} class="num">Paris：q₆·k₆ = {scores[5][5].toFixed(1)} → e^{scores[5][5].toFixed(1)} ≈ {tallyParisExp.toFixed(2)}（小数次方不手算，用计算工具）→ w₆ = {tallyParisExp.toFixed(2)} ÷ {tallyDenominator.toFixed(2)} ≈ {w[5].toFixed(2)} → w₆v₆ ≈ {w[5].toFixed(2)} × v₆</text>
            <text x="16" y={LOW + 132} class="num">out₆ = w₁v₁ + w₂v₂ + w₃v₃ + w₄v₄ + w₅v₅ + w₆v₆</text>
            <text x="16" y={LOW + 154} class="legend">Σ 表示把 6 项相加；j = 1…6 · 每根绿线：vⱼ 先乘对应的 wⱼ</text>
          {:else if zhMix}
            <text x="16" y={LOW + 16} class="rowlabel">权重 wⱼ</text>
            {#each cols as c, i}
              <text x={c.cx} y={LOW + 16} text-anchor="middle" class="num">{w[i].toFixed(2)}</text>
              <text x={c.cx} y={LOW + 46} text-anchor="middle" class="num">{w[i].toFixed(2)}×v{sub(i + 1)}</text>
            {/each}
            <text x="16" y={LOW + 46} class="rowlabel">先乘</text>
            <text x="16" y={LOW + 76} class="rowlabel">再相加</text>
            <text x="96" y={LOW + 76} class="num">out₅ = 0.06×v₁ + 0.26×v₂ + 0.05×v₃ + 0.53×v₄ + 0.10×v₅</text>
            <text x="18" y={LOW + 104} class="pt">·</text>
            <text x="28" y={LOW + 104} class="legend">Σ wⱼvⱼ = 把 5 个 wⱼ×vⱼ 相加；j 表示第几列</text>
            <text x="18" y={LOW + 130} class="pt">·</text>
            <text x="28" y={LOW + 130} class="legend">绿线：这列 value 先乘对应权重，再送入 out₅</text>
            <text x="18" y={LOW + 156} class="pt">·</text>
            <text x="28" y={LOW + 156} class="legend">␣France 的权重 0.53 最大，所以它的 value 贡献最多</text>
          {:else}
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
              {#if zhWeights}
                <text x="16" y={LOW + 42} class="rowlabel">变正数 e^分数</text>
                {#each cols.slice(0, cur.attend + 1) as c, i}
                  <text x={c.cx} y={LOW + 42} text-anchor="middle" class="num">{expScores[i].toFixed(2)}</text>
                {/each}
                <text x="16" y={LOW + 66} class="legend">五个正数合计 = {expTotal.toFixed(2)} · 权重 = 自己的正数 ÷ {expTotal.toFixed(2)}</text>
                <text x="16" y={LOW + 86} class="legend">e = 2.718… · ^ 表示几次方，如 2^3 = 2×2×2 · 小数次方用计算工具</text>
              {/if}
              <text x="16" y={BAR_BASE - 4} class="rowlabel">{zhWeights ? '权重 wⱼ' : 'softmax'}</text>
              {#each cols.slice(0, cur.attend + 1) as c, i}
                {@const h = w[i] * (zhWeights ? 34 : BAR_MAX)}
                <g in:fly={zhWeights ? { duration: 0 } : { y: 10, delay: i * 60, duration: 300 }}>
                  <rect x={c.cx - BAR_W / 2} y={BAR_BASE - h} width={BAR_W} height={h} rx="3" fill={COLOR.k[1]} opacity={0.35 + 0.65 * w[i]} />
                  <text x={c.cx} y={BAR_BASE - h - 6} text-anchor="middle" class="num">{w[i].toFixed(2)}</text>
                </g>
              {/each}
              <line x1={cols[0].x} y1={BAR_BASE + 0.5} x2={cols[cur.attend].x + cols[cur.attend].w} y2={BAR_BASE + 0.5} stroke="var(--line)" />
              {#if zhWeights}
                <text x="16" y={H - 24} class="num">␣France：{expScores[3].toFixed(2)} ÷ {expTotal.toFixed(2)}，约为 {w[3].toFixed(2)}（图中数四舍五入）</text>
                <text x={W - 16} y={H - 24} text-anchor="end" class="num">0.06 + 0.26 + 0.05 + 0.53 + 0.10 = 1.00</text>
                <text x={W / 2} y={H - 6} text-anchor="middle" class="legend">下一步：按这些权重混合五列 value</text>
              {/if}
            {/if}
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

      {#if zhRecompute}
        <g in:fade={{ duration: 250 }}>
          <text x="16" y={LOW + 16} class="slab">拿第 6 列看：一个 x 算出 q、k、v</text>
          <text x="28" y={LOW + 52} class="num" style:fill={COLOR.q[1]}>q₆ = W_Q x₆</text>
          <text x="28" y={LOW + 82} class="num" style:fill={COLOR.k[1]}>k₆ = W_K x₆</text>
          <text x="28" y={LOW + 112} class="num" style:fill={COLOR.v[1]}>v₆ = W_V x₆</text>
          <text x="280" y={LOW + 40} class="legend">矩阵 = 一张学好的数字表</text>
          <text x="280" y={LOW + 64} class="legend">W_Q / W_K / W_V：三张表，分别算 q / k / v</text>
          <text x="280" y={LOW + 94} class="legend">每个位置只用自己的 x，六列都这样算</text>
          <text x="280" y={LOW + 130} class="slab">{cur.n} 个位置 × 3 = {cur.n * 3} 个向量</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">前 5 列重算；第 6 列第一次算 · 下一步检查哪些结果没变</text>
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
  .cellg.static { transition: none; }
  .example-hit { cursor: pointer; }
  .example-hit:focus { outline: 2px solid var(--accent); outline-offset: -2px; }
  .badge { font-family: var(--mono); font-size: 10px; font-weight: 700; }
  .num { font-family: var(--mono); font-size: 10.5px; fill: var(--fg); }
  .phone-intro text { font-family: var(--sans); font-size: 12px; fill: var(--fg); }
  .phone-intro .ph-title { font-size: 16px; font-weight: 650; }
  .phone-intro .ph-strong { font-weight: 650; }
  .phone-weights text { font-family: var(--mono); font-size: 12px; fill: var(--fg); }
  .phone-weights .ph-title { font-family: var(--sans); font-size: 16px; font-weight: 650; }
  .phone-mix text { font-family: var(--mono); font-size: 12px; fill: var(--fg); }
  .phone-mix .ph-title { font-family: var(--sans); font-size: 16px; font-weight: 650; }
  .phone-mix .ph-value { font-weight: 700; }
  .phone-mix .ph-foot { fill: var(--faint); }
  .phone-six text { font-family: var(--mono); font-size: 12px; fill: var(--fg); }
  .phone-six .ph-title { font-family: var(--sans); font-size: 16px; font-weight: 650; }
  .phone-six .ph-faint { fill: var(--faint); }
  .phone-recompute text { font-family: var(--mono); font-size: 12px; fill: var(--fg); }
  .phone-recompute .ph-title { font-family: var(--sans); font-size: 16px; font-weight: 650; }
  .phone-recompute .ph-faint { fill: var(--faint); }
  .new-x { fill: var(--gen) !important; }
  .tag.new { fill: var(--gen); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; font-size: 9px; }
  rect.pulse { animation: pulse 700ms ease-in-out 2; }
  @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
</style>
