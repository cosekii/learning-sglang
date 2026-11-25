<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { KB_PER_TOKEN, LAYERS, KV_HEADS, HEAD_DIM, BYTES } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  // ---- Data --------------------------------------------------------------------------------
  const tokens = ['The', ' capital', ' of', ' France', ' is', ' Paris', '.'];
  const PROMPT_N = 5, MAX_N = tokens.length;
  const scores: Record<number, number[]> = {
    5: [0.3, 1.4, 0.1, 1.8, 0.6, 2.2],
    6: [0.2, 1.1, 0.1, 1.5, 0.5, 1.9, 0.8],
  };
  const softmax = (a: number[]) => {
    const m = Math.max(...a); const e = a.map((v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0);
    return e.map((v) => v / s);
  };
  // Llama-3-8B-ish: 32 layers, 8 kv heads, head dim 128, bf16, k and v.

  // ---- Script -------------------------------------------------------------------------------
  interface Step {
    caption: string; captionZh: string; n: number; cached: number;
    compute?: number[]; flyIn?: boolean; store?: boolean; dropQ?: boolean;
    attend?: number; whyNotQ?: boolean; cost?: boolean; contrast?: boolean;
  }
  const all5 = [0, 1, 2, 3, 4];
  const steps: Step[] = [
    { n: 5, cached: 0, caption: `Same sequence, same layer. This time we keep what we compute.`, captionZh: `上章为 ␣Paris 重算了 5 个旧 k 和 5 个旧 v。KV cache 是存旧 k、v 的仓库。` },
    { n: 5, cached: 0, compute: all5, caption: `First step: all five tokens at once. Each gets its q, k and v, exactly as before.`, captionZh: `第一次：5 个 token 各得到 q、k、v，cache 仍为空。` },
    { n: 5, cached: 5, compute: all5, store: true, dropQ: true, caption: `Attention runs as before. Then, instead of throwing k and v away, we file them. Five slots. The queries were used, so they go.`, captionZh: `5 个 k、v 存进 cache；q 用完就丢。` },
    { n: 6, cached: 5, compute: [5], flyIn: true, caption: `Decode step. Paris arrives. Only Paris gets an x, a q, a k and a v. One column of work, not six.`, captionZh: `␣Paris 到了，只算它的 1 列；旧 5 列不重算。` },
    { n: 6, cached: 6, compute: [5], store: true, caption: `Its k and v go into the cache. Slot six.`, captionZh: `它的 k 和 v 进入 cache。第六个槽位。` },
    { n: 6, cached: 6, compute: [5], attend: 5, caption: `Its query reads every key in the cache and blends every value in the cache. Same result as recomputing, because the cache holds exactly what recomputing would have produced.`, captionZh: `它的 query 读取 cache 里的每个 key，混合每个 value。结果和重算一样，因为 cache 存的正是重算会产生的东西。` },
    { n: 7, cached: 7, compute: [6], flyIn: true, store: true, attend: 6, caption: `Next token, same routine. One column of compute, one more slot, one read of the whole cache.`, captionZh: `下一个 token，同样的流程。一列计算，多一个槽位，读一遍整个 cache。` },
    { n: 7, cached: 7, compute: [6], whyNotQ: true, caption: `Why not keep q too? Nobody asks for it later. A query is used on the step it's made, and its output is consumed right there.`, captionZh: `为什么不把 q 也留下来？之后没人再要它。query 只在生成它的那一步被使用，输出当场就被消耗掉。` },
    { n: 7, cached: 7, compute: [6], cost: true, caption: `The cache isn't free. Every token keeps a k and a v in each of Llama-3-8B's ${KV_HEADS}&nbsp;k,&nbsp;v&nbsp;heads (Ch. 2 Step 14), in every layer. That's ${KB_PER_TOKEN} KB per token, per sequence.`, captionZh: `cache 不是免费的。每个 token 在 Llama-3-8B 每一层的 ${KV_HEADS} 个 k、v head 里各存一个 k 和 v（Ch. 2 Step 14）。也就是每个 token、每个序列 ${KB_PER_TOKEN} KB。` },
    { n: 7, cached: 7, compute: [6], cost: true, contrast: true, caption: `Look at the two kinds of step. The first crunched five tokens and wrote five slots. Every step since computes one token and reads the whole cache. Two very different jobs.`, captionZh: `看这两种步。第一步算了五个 token、写了五个槽位。之后每一步只算一个 token，却要读整个 cache。两种很不一样的工作。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);

  // ---- Geometry (viewBox units) --------------------------------------------------------------
  const W = 720, H = 400;
  const X0 = 100, charW = 8.2, padX = 10, gap = 6, tokH = 28, seqY = 36;
  const boxW = (t: string) => Math.round(t.length * charW + padX * 2);
  // all MAX_N columns are laid out up front so cache slots have a home before their token exists
  const allCols = (() => {
    let x = X0;
    return tokens.map((t) => { const w = boxW(t); const c = { t, x, w, cx: x + w / 2 }; x += w + gap; return c; });
  })();
  const cols = $derived(allCols.slice(0, cur.n));

  const CW = 32, CH = 20;
  const ROW = { x: 92, q: 120, k: 148, v: 176 } as const;
  type Row = keyof typeof ROW;
  const COLOR: Record<Row, [string, string]> = {
    x: ['#eeece6', '#8a8780'], q: ['#ede9fe', '#7c3aed'], k: ['#cffafe', '#0891b2'], v: ['#dcfce7', '#16a34a'],
  };
  const CACHE = { y: 222, h: 118 };
  const CK = 242, CV = 278, CQ = 312;      // cache rows: k, v, and the ghost q row
  const outX = allCols[MAX_N - 1].x + allCols[MAX_N - 1].w + 48;
  const sub = (i: number) => String(i).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d]);

  const computed = (c: number) => (cur.compute ?? []).includes(c);
  const isDecode = $derived(cur.n > PROMPT_N);
  const w = $derived(cur.attend !== undefined ? softmax(scores[cur.attend]) : []);
  const cacheKB = $derived(cur.cached * KB_PER_TOKEN);
  let phone = $state(false);
  $effect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const phoneCustom = $derived(phone && $lang === 'zh' && step <= 3);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox={phoneCustom ? '0 0 360 620' : `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="The KV cache, step {step + 1}" class:phone-custom={phoneCustom}>
      {#snippet phoneTokens(n: number, y: number)}
        {@const start = 180 - (n * 46 - 8) / 2}
        {#each Array(n) as _, i}
          <rect x={start + i * 46} y={y} width="38" height="32" rx="6" fill={i < PROMPT_N ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={i < PROMPT_N ? 'var(--accent)' : 'var(--gen)'} />
          <text x={start + i * 46 + 19} y={y + 21} text-anchor="middle">#{i + 1}</text>
        {/each}
      {/snippet}
      {#snippet phoneCompute(indices: number[], y: number)}
        {@const start = 180 - (indices.length * 46 - 8) / 2}
        {#each (['x', 'q', 'k', 'v'] as Row[]) as r, ri}
          <text x={start - 16} y={y + ri * 38 + 21} text-anchor="end">{r}</text>
          {#each indices as idx, i}
            <g opacity={r === 'q' && cur.dropQ ? 0.25 : 1}>
              <rect x={start + i * 46} y={y + ri * 38} width="38" height="32" rx="5" fill={COLOR[r][0]} stroke={COLOR[r][1]} />
              <text x={start + i * 46 + 19} y={y + ri * 38 + 21} text-anchor="middle">{r}{sub(idx + 1)}</text>
            </g>
          {/each}
        {/each}
      {/snippet}
      {#snippet phoneCache(count: number, y: number, attend: number, ghost: boolean)}
        {@const start = 180 - (count * 38 - 6) / 2}
        <text x={start - 14} y={y + 21} text-anchor="end">k</text>
        <text x={start - 14} y={y + 58} text-anchor="end">v</text>
        {#each Array(count) as _, i}
          {@const x = start + i * 38}
          {#if attend >= 0}<text x={x + 16} y={y - 8} text-anchor="middle">{w[i].toFixed(2)}</text>{/if}
          <rect x={x} y={y} width="32" height="32" rx="5" fill={COLOR.k[0]} stroke={COLOR.k[1]} />
          <text x={x + 16} y={y + 21} text-anchor="middle">k{sub(i + 1)}</text>
          <rect x={x} y={y + 38} width="32" height="32" rx="5" fill={COLOR.v[0]} stroke={COLOR.v[1]} opacity={attend >= 0 ? 0.35 + 0.65 * w[i] : 1} />
          <text x={x + 16} y={y + 59} text-anchor="middle">v{sub(i + 1)}</text>
          {#if attend >= 0}<path d="M {x + 16} {y + 70} Q {x + 16} {y + 104}, 180 {y + 126}" fill="none" stroke={COLOR.v[1]} stroke-width={1 + w[i] * 5} opacity="0.65" />{/if}
          {#if ghost}
            <rect x={x} y={y + 96} width="32" height="32" rx="5" fill={COLOR.q[0]} stroke={COLOR.q[1]} stroke-dasharray="3 3" opacity="0.55" />
            <text x={x + 16} y={y + 117} text-anchor="middle" opacity="0.55">q{sub(i + 1)}</text>
            <line x1={x + 4} y1={y + 124} x2={x + 28} y2={y + 100} stroke={COLOR.q[1]} opacity="0.7" />
          {/if}
        {/each}
        {#if attend >= 0}
          <rect x="158" y={y + 116} width="44" height="34" rx="6" fill="var(--bg)" stroke={COLOR.v[1]} stroke-width="2" />
          <text x="180" y={y + 138} text-anchor="middle">out{sub(attend + 1)}</text>
        {/if}
      {/snippet}
      {#if phoneCustom && step === 0}
        <text x="180" y="30" text-anchor="middle" class="ph-title">为什么要有 KV cache？</text>
        <text x="180" y="55" text-anchor="middle">KV cache = 存旧 k、v 的仓库</text>
        <rect x="20" y="80" width="320" height="94" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="180" y="110" text-anchor="middle" class="ph-strong">上章：5 个旧 k + 5 个旧 v</text>
        <text x="180" y="137" text-anchor="middle">10 个旧向量，每次都重算</text>
        <text x="180" y="161" text-anchor="middle">本章：算一次，留下以后用</text>
        <text x="180" y="207" text-anchor="middle" class="ph-strong">上章的 5 个旧位置</text>
        {#each Array(5) as _, i}
          <rect x={55 + i * 51} y="225" width="42" height="34" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x={76 + i * 51} y="247" text-anchor="middle">#{i + 1}</text>
        {/each}
        <text x="20" y="297" class="ph-strong">一层、一个 head 的空仓库</text>
        <rect x="20" y="312" width="320" height="134" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x="30" y="349">k</text>
        <text x="30" y="405">v</text>
        {#each Array(5) as _, i}
          <rect x={65 + i * 51} y="328" width="38" height="34" rx="5" fill="none" stroke="var(--line)" stroke-dasharray="3 3" />
          <rect x={65 + i * 51} y="384" width="38" height="34" rx="5" fill="none" stroke="var(--line)" stroke-dasharray="3 3" />
        {/each}
        <text x="180" y="486" text-anchor="middle">下一步：算出 5 组 k、v，装进仓库</text>
        <text x="180" y="520" text-anchor="middle" class="ph-foot">空槽是预留位置，还没有旧结果</text>
      {:else if phoneCustom && step === 1}
        <text x="180" y="30" text-anchor="middle" class="ph-title">第一次：5 个 token 一起算</text>
        <text x="180" y="55" text-anchor="middle">每个位置各得到 x、q、k、v</text>
        {@render phoneTokens(5, 80)}
        {@render phoneCompute(all5, 140)}
        <text x="180" y="329" text-anchor="middle" class="ph-strong">5 组结果算好了，仓库还空着</text>
        <rect x="55" y="355" width="250" height="100" rx="10" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x="180" y="412" text-anchor="middle">KV cache：0 格</text>
        <text x="180" y="510" text-anchor="middle">下一步：k、v 入仓，q 丢掉</text>
        <text x="180" y="590" text-anchor="middle" class="ph-foot">#1–#5 对应上方 5 个 prompt token</text>
      {:else if phoneCustom && step === 2}
        <text x="180" y="30" text-anchor="middle" class="ph-title">留下 k、v，丢掉 q</text>
        <text x="180" y="55" text-anchor="middle">5 个 k + 5 个 v 写入 cache</text>
        {@render phoneTokens(5, 80)}
        {@render phoneCompute(all5, 135)}
        <text x="180" y="323" text-anchor="middle" class="ph-strong">仓库现在有 5 组旧结果</text>
        {@render phoneCache(5, 355, -1, false)}
        <text x="180" y="480" text-anchor="middle">紫色 q 变淡：用完，不占格子</text>
        <text x="180" y="525" text-anchor="middle">下一步：新 token 只算 1 列</text>
        <text x="180" y="570" text-anchor="middle" class="ph-foot">主图展示逻辑顺序</text>
        <text x="180" y="592" text-anchor="middle" class="ph-foot">实现可先写 cache，再算 attention</text>
      {:else if phoneCustom && step === 3}
        <text x="180" y="30" text-anchor="middle" class="ph-title">新 token 只算 1 列</text>
        <text x="180" y="55" text-anchor="middle">␣Paris 是第 6 个位置</text>
        {@render phoneTokens(6, 80)}
        <text x="180" y="137" text-anchor="middle" class="ph-strong">只计算橙色的 #6</text>
        {@render phoneCompute([5], 160)}
        <text x="180" y="329" text-anchor="middle">旧 5 列不重算，旧 k、v 还在仓库</text>
        {@render phoneCache(5, 360, -1, false)}
        <text x="180" y="490" text-anchor="middle">不保存：算 6 列　用 cache：算 1 列</text>
        <text x="180" y="540" text-anchor="middle">下一步：把第 6 组 k、v 也存进去</text>
      {:else}
      <!-- Contrast brackets: first step vs every step after -->
      {#if cur.contrast}
        {@const a = allCols[0].x} {@const b = allCols[PROMPT_N - 1].x + allCols[PROMPT_N - 1].w}
        {@const c = allCols[PROMPT_N].x} {@const d = allCols[cur.n - 1].x + allCols[cur.n - 1].w}
        <g in:fade>
          <path d="M {a} 26 V 20 H {b} V 26" fill="none" stroke="var(--accent)" stroke-width="1.5" />
          <text x={(a + b) / 2} y="14" text-anchor="middle" class="tag strong">{t('first step · five tokens, one pass, writes the cache', '第一步 · 五个 token，一遍算完，写入 cache')}</text>
          <path d="M {c} 26 V 20 H {d} V 26" fill="none" stroke="var(--gen)" stroke-width="1.5" />
          <text x={c} y="14" class="tag strong gen">{t('every step after · one token, reads the whole cache', '之后每步 · 一个 token，读取整个 cache')}</text>
        </g>
      {/if}

      {#if step === 0 && $lang === 'zh'}
        <text x={W / 2} y="112" text-anchor="middle" class="slab">不保存：5 个旧 k + 5 个旧 v，每次都重算</text>
        <text x={W / 2} y="140" text-anchor="middle" class="slab">本章：这 10 个旧向量只算一次，留下以后用</text>
      {/if}

      <!-- Token row -->
      <text x="16" y={seqY + 18} class="rowlabel">tokens</text>
      {#each cols as c, i (i)}
        <g in:fly={cur.flyIn && i === cols.length - 1 ? { y: -30, duration: 450, easing: cubicOut } : { duration: 0 }}>
          <rect x={c.x} y={seqY} width={c.w} height={tokH} rx="6" fill={i < PROMPT_N ? 'var(--accent-soft)' : 'var(--gen-soft)'} stroke={i < PROMPT_N ? 'var(--accent)' : 'var(--gen)'} stroke-width="1.5" />
          <text x={c.cx} y={seqY + 18} text-anchor="middle" class="tok">{c.t.replace(/^ /, '␣')}</text>
        </g>
      {/each}

      <!-- This step: x / q / k / v for the columns actually computed -->
      {#if cur.compute}
        <g transition:fade={{ duration: 200 }}>
          <text x="16" y={ROW.x - 10} class="tag">{t('computed this step', '本步计算')}</text>
          {#each (['x', 'q', 'k', 'v'] as Row[]) as r, ri}
            <text x="16" y={ROW[r] + 14} class="rowlabel">{r}</text>
            {#each cols as c, i (i)}
              {#if computed(i)}
                <g in:fly={{ y: -8, delay: (ri * 2 + i) * 45, duration: 250 }} class="cellg"
                   style:opacity={r === 'q' && cur.dropQ ? 0.25 : 1}>
                  <rect x={c.cx - CW / 2} y={ROW[r]} width={CW} height={CH} rx="4" fill={COLOR[r][0]} stroke={COLOR[r][1]}
                        stroke-width={r === 'q' && cur.attend === i ? 2.5 : 1} />
                  <text x={c.cx} y={ROW[r] + 14} text-anchor="middle" class="cell">{r}{sub(i + 1)}</text>
                </g>
              {:else if isDecode}
                <rect x={c.cx - CW / 2} y={ROW[r]} width={CW} height={CH} rx="4" fill="none" stroke="var(--line)" stroke-dasharray="3 3" in:fade />
              {/if}
            {/each}
          {/each}
        </g>
      {/if}

      <!-- The cache -->
      <text x="16" y={CACHE.y - 8} class="rowlabel">KV cache <tspan class="eq">{t('· one layer, one head', '· 一层、一个 head')}</tspan></text>
      <rect x="10" y={CACHE.y} width={W - 20} height={CACHE.h} rx="10" fill="#fbfaf7" stroke="var(--line)" stroke-dasharray="5 4" />
      <text x="24" y={CK + 14} class="rowlabel">k</text>
      <text x="24" y={CV + 14} class="rowlabel">v</text>
      {#each allCols as c, s}
        {#if s >= cur.cached}
          <rect x={c.cx - CW / 2} y={CK} width={CW} height={CH} rx="4" fill="none" stroke="var(--line)" stroke-dasharray="3 3" />
          <rect x={c.cx - CW / 2} y={CV} width={CW} height={CH} rx="4" fill="none" stroke="var(--line)" stroke-dasharray="3 3" />
        {/if}
      {/each}
      {#each Array(cur.cached) as _, s (s)}
        {@const c = allCols[s]}
        <g in:fly={{ y: ROW.k - CK, delay: s * 40, duration: 500, easing: cubicOut }}>
          {#if cur.attend !== undefined && w[s] !== undefined}
            <text x={c.cx} y={CK - 5} text-anchor="middle" class="num" in:fade={{ delay: s * 60 }}>{w[s].toFixed(2)}</text>
          {/if}
          <rect x={c.cx - CW / 2} y={CK} width={CW} height={CH} rx="4" fill={COLOR.k[0]} stroke={COLOR.k[1]} stroke-width={cur.attend !== undefined ? 2 : 1} />
          <text x={c.cx} y={CK + 14} text-anchor="middle" class="cell">k{sub(s + 1)}</text>
        </g>
        <g in:fly={{ y: ROW.v - CV, delay: s * 40 + 60, duration: 500, easing: cubicOut }} class="cellg"
           style:opacity={cur.attend !== undefined && w[s] !== undefined ? 0.35 + 0.65 * w[s] : 1}>
          <rect x={c.cx - CW / 2} y={CV} width={CW} height={CH} rx="4" fill={COLOR.v[0]} stroke={COLOR.v[1]} />
          <text x={c.cx} y={CV + 14} text-anchor="middle" class="cell">v{sub(s + 1)}</text>
        </g>
      {/each}

      <!-- Blend: cached values -> output for the attending token -->
      {#if cur.attend !== undefined}
        <g transition:fade={{ duration: 250 }}>
          {#each allCols.slice(0, cur.cached) as c, s}
            <path d="M {c.cx} {CV + CH} C {c.cx} {CV + 40}, {outX - 6} {CV + 40}, {outX} {CV + CH}"
                  fill="none" stroke={COLOR.v[1]} stroke-width={0.8 + w[s] * 6} opacity="0.55" />
          {/each}
          <rect x={outX - 20} y={CV} width="40" height={CH} rx="4" fill="white" stroke={COLOR.v[1]} stroke-width="2" />
          <text x={outX} y={CV + 14} text-anchor="middle" class="cell">out{sub(cur.attend + 1)}</text>
          <text x={outX} y={CK + 14} text-anchor="middle" class="tag">{t(`q${sub(cur.attend + 1)} reads all ${cur.cached}`, `q${sub(cur.attend + 1)} 读取全部 ${cur.cached} 个`)}</text>
        </g>
      {/if}

      <!-- Why not q: a ghost row that would never be read -->
      {#if cur.whyNotQ}
        <g transition:fade={{ duration: 250 }}>
          <text x="24" y={CQ + 14} class="rowlabel" opacity="0.6">q</text>
          {#each allCols.slice(0, cur.cached) as c, s}
            <g in:fade={{ delay: s * 40 }} opacity="0.5">
              <rect x={c.cx - CW / 2} y={CQ} width={CW} height={CH} rx="4" fill={COLOR.q[0]} stroke={COLOR.q[1]} stroke-dasharray="3 3" />
              <text x={c.cx} y={CQ + 14} text-anchor="middle" class="cell">q{sub(s + 1)}</text>
              <line x1={c.cx - CW / 2 + 3} y1={CQ + CH - 3} x2={c.cx + CW / 2 - 3} y2={CQ + 3} stroke={COLOR.q[1]} stroke-width="1.5" />
            </g>
          {/each}
          <text x={outX - 20} y={CQ + 14} class="tag" in:fade={{ delay: 400 }}>{t('used once, never read again', '只用一次，不再读取')}</text>
        </g>
      {/if}

      <!-- Cost readout -->
      {#if cur.cost}
        <g in:fade>
          <text x="18" y={CACHE.y + CACHE.h + 24} class="pt">·</text><text x="28" y={CACHE.y + CACHE.h + 24} class="legend">
            <tspan class="strong">{cur.cached} tokens × {KB_PER_TOKEN} KB</tspan> = {cacheKB.toLocaleString()} KB
            <tspan class="muted">{t(`   (${LAYERS} layers · ${KV_HEADS} k, v heads · ${HEAD_DIM} dims · k and v · ${BYTES} bytes)`, `   （${LAYERS} 层 · ${KV_HEADS} 个 k、v head · ${HEAD_DIM} 维 · k 和 v · ${BYTES} 字节）`)}</tspan>
          </text>
          <text x="18" y={CACHE.y + CACHE.h + 44} class="pt">·</text><text x="28" y={CACHE.y + CACHE.h + 44} class="legend" in:fade={{ delay: 500 }}>
            {t('at 8k tokens: ', '8k token 时：')}<tspan class="strong">{((8192 * KB_PER_TOKEN) / 1024 / 1024).toFixed(0)} GB</tspan>{t(', for one sequence. Keep that number in mind.', '，一个序列。记住这个数。')}
          </text>
        </g>
      {/if}
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .rowlabel .eq { fill: var(--faint); }
  .tok { font-family: var(--mono); font-size: 12.5px; fill: var(--fg); }
  .cell { font-family: var(--mono); font-size: 10.5px; fill: var(--fg); }
  .cellg { transition: opacity 300ms; }
  .num { font-family: var(--mono); font-size: 10px; fill: var(--fg); }
  .tag.strong { fill: var(--accent); font-weight: 600; }
  .tag.strong.gen { fill: var(--gen); }
  .legend .muted, .legend.muted { fill: var(--muted); }
  .phone-custom text { font-family: var(--sans); font-size: 12px; fill: var(--fg); }
  .phone-custom .ph-title { font-size: 16px; font-weight: 650; }
  .phone-custom .ph-strong { font-weight: 650; }
  .phone-custom .ph-foot { fill: var(--faint); }
</style>
