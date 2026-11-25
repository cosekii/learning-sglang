<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import { chapterNumber as chNum, type NavLink } from '../../chapters';
  import { W_GB, HBM_GB, KB_PER_TOKEN as KB_TOK, BW, TFLOPS as FLOPS, GFLOP_PER_TOKEN as GFLOP, VLLM_PAGE_TOKENS, SGLANG_PAGE_TOKENS } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const CH_PREFIX = chNum('08-prefix-caching'), CH_DISAGG = chNum('28-disaggregation');

  // ---- Numbers, same as before: Llama-3-8B bf16 on one H100 ------------------------------------
  const tMem = W_GB / BW;
  const tComp = (n: number) => (n * GFLOP) / FLOPS;
  const BALANCE = Math.round(tMem / tComp(1) / 50) * 50;
  const seqGB = (ctx: number) => (ctx * KB_TOK * 1024) / 1e9;   // KB_TOK is KiB: 128 × 1,024 bytes
  const capAt = (ctx: number) => Math.floor((HBM_GB - W_GB) / seqGB(ctx));
  const BAR = { x: 40, y: 120, w: 640, h: 44 };
  const pxPerGB = BAR.w / HBM_GB;
  const running = [24, 36, 12, 48, 20, 32, 40, 16];          // context length in k tokens
  const usedGB = running.reduce((a, c) => a + seqGB(c * 1024), 0);

  // ---- Reservation scene ---------------------------------------------------------------------------------
  const MAXCTX = 8192;
  const reserved = [0.35, 0.6, 0.2, 0.5, 0.15];
  const wasted = 1 - reserved.reduce((a, b) => a + b, 0) / reserved.length;
  const churn: { gb: number; kind: 'live' | 'hole' }[] = [
    { gb: 0.6, kind: 'live' }, { gb: 0.4, kind: 'hole' }, { gb: 1.0, kind: 'live' }, { gb: 0.6, kind: 'hole' },
    { gb: 0.8, kind: 'live' }, { gb: 0.3, kind: 'hole' }, { gb: 1.0, kind: 'live' }, { gb: 0.2, kind: 'hole' }, { gb: 0.9, kind: 'live' },
  ];
  const churnFree = churn.filter((c) => c.kind === 'hole').reduce((a, c) => a + c.gb, 0);

  // ---- Page pool ------------------------------------------------------------------------------------------
  const COLS = 20, ROWS = 6, CELL = 24, GAP = 3;
  const PG = { x: 60, y: 108 };
  const STRIP = { x: 300, y: 60 };                              // where a newcomer's pages appear before they land
  const owners = ['#2f5bea', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#db2777', '#0f766e'];
  const pageOwner = (i: number) => { const h = (i * 2654435761) >>> 0; return h % 100 < 26 ? -1 : (h >>> 8) % 5; };
  const pages0 = Array.from({ length: COLS * ROWS }, (_, i) => pageOwner(i));
  const freeOf = (arr: number[]) => arr.map((o, i) => (o < 0 ? i : -1)).filter((i) => i >= 0);
  const pick = (idx: number[], n: number) => Array.from({ length: n }, (_, k) => idx[Math.floor(((k + 0.5) * idx.length) / n)]);
  const allocA = pick(freeOf(pages0), 5);                                             // req 6 takes 5 pages
  const pages1 = pages0.map((o, i) => (allocA.includes(i) ? 5 : o));
  const FINISHED = 4;                                                                 // req 5 finishes
  const freed = pages1.map((o, i) => (o === FINISHED ? i : -1)).filter((i) => i >= 0);
  const pages2 = pages1.map((o) => (o === FINISHED ? -1 : o));
  const allocB = pick(freed, 8);                                                      // req 7 takes 8 of the freed pages
  const pages3 = pages2.map((o, i) => (allocB.includes(i) ? 6 : o));
  const cellXY = (i: number) => ({ x: PG.x + (i % COLS) * (CELL + GAP), y: PG.y + Math.floor(i / COLS) * (CELL + GAP) });

  // ---- Script ----------------------------------------------------------------------------------------------
  type Scene = 'room' | 'caps' | 'reserve' | 'alloc' | 'free' | 'closing';
  interface Step { caption: string; captionZh: string; scene: Scene; base?: number[]; alloc?: number[]; owner?: number; name?: string; foot?: string; footZh?: string }
  const POOL_FOOT = `SGLang keeps about 17% of the card for activations and CUDA graphs (--mem-fraction-static, 0.83 here), so its pool is nearer 55 GB`;
  const POOL_FOOT_ZH = `SGLang 为激活值和 CUDA graphs 保留约 17% 的显存（--mem-fraction-static，此处 0.83），所以池更接近 55 GB`;
  const steps: Step[] = [
    { scene: 'room', caption: `The scheduler checks for room for KV cache before admitting a new request. ${HBM_GB} GB on the card, ${W_GB} GB of weights, and everything else is room for KV cache. Running requests fill it a token per step.`, captionZh: `scheduler 接纳新 request 前查空间：${HBM_GB} GB 减去权重 ${W_GB} GB，其余归 KV cache。运行中的 request 每步多占一个 token。`, foot: POOL_FOOT, footZh: POOL_FOOT_ZH },
    { scene: 'caps', caption: `How many fit? Same card, three context lengths. At 2k tokens each, ${capAt(2048)} requests. At 4k, ${capAt(4096)}. At 8k, ${capAt(8192)}. Compute could take ${BALANCE} per step; at these lengths memory never lets it get there.`, captionZh: `能装多少？同一张卡，三种上下文长度：每个 2k token 装 ${capAt(2048)} 个，4k 装 ${capAt(4096)} 个，8k 装 ${capAt(8192)} 个。算力每步可跑 ${BALANCE} 个，但这些长度下内存到不了。`, foot: POOL_FOOT, footZh: POOL_FOOT_ZH },
    { scene: 'reserve', caption: `The naive way: reserve each request's maximum length up front, in one contiguous block. Most never use it, and finished requests leave holes no newcomer fits into. Most of the card, wasted.`, captionZh: `朴素做法：预先给每个 request 按最大长度预留一整块连续内存。大多用不满，结束的 request 留下新来者放不进的洞。卡上大部分被浪费。` },
    { scene: 'alloc', base: pages0, alloc: allocA, owner: 5, name: 'req 6', caption: `<b>Paging</b>: cut the room into fixed-size pages. A newcomer's cache isn't one block; it's however many pages it needs, taken from anywhere that's free, with the page numbers written in its table. No holes, no pages held in advance.`, captionZh: `<b>Paging</b>：把空间切成固定大小的 page。req 6 取 5 个 page，页号写进页表。` },
    { scene: 'free', caption: `When a request finishes, its pages go straight back to the pool. No compaction, nobody else moves. The pool just has more free pages, wherever they happen to be.`, captionZh: `request 结束时，它的 page 直接回到池里。不做整理，谁也不移动。池里只是多了些空闲 page，位置随意。`, foot: `with prefix caching off · SGLang keeps a finished request's pages in its prefix cache until it needs them (chapter ${CH_PREFIX})`, footZh: `关闭 prefix caching · SGLang 把已结束 request 的 page 留在 prefix cache 里，直到需要它们（第 ${CH_PREFIX} 章）` },
    { scene: 'alloc', base: pages2, alloc: allocB, owner: 6, name: 'req 7', caption: `The next newcomer takes what it needs from those, or any other free pages. Its table lists them, and the attention kernel follows the table. vLLM pages ${VLLM_PAGE_TOKENS} tokens at a time; SGLang, ${SGLANG_PAGE_TOKENS}.`, captionZh: `req 7 从空闲 page 取走 8 个，页号写进页表。attention 照表读；对照取 vLLM v0.10.1（CUDA）的每页 ${VLLM_PAGE_TOKENS} token 与 SGLang 的 ${SGLANG_PAGE_TOKENS}。` },
    { scene: 'closing', caption: `Admission is a count: free pages against pages needed. Yes: admit and write the table. No: wait for a finish. If the running requests themselves run out, one is retracted. Sharing pages: next chapter.`, captionZh: `接纳是计数：空闲 page 对所需 page。够：接纳并写表。不够：等一个 request 结束。运行中的 request 耗尽 page 时，撤回一个。共享 page：下一章。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);

  // within-step animation phases, replayed whenever the step changes
  let phase = $state(0);
  $effect(() => {
    const sc = steps[step].scene;
    phase = 0;
    const plan = sc === 'alloc' ? (step === 5 ? [300, 700, 1000, 3400] : [500, 1200, 1900, 2800]) : sc === 'free' ? [700, 1800] : [];
    const timers = plan.map((ms, i) => setTimeout(() => (phase = i + 1), ms));
    return () => timers.forEach(clearTimeout);
  });
  const W = 720, H = 400;
</script>

<figure class="viz">
  <div class="canvas">
    <svg class:step-four={step === 3 && $lang === 'zh'} class:step-six={step === 5} viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="KV memory, step {step + 1}">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#e0f2fe" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#0891b2" stroke-width="1.2" opacity="0.5" />
        </pattern>
      </defs>

      <!-- Room: the card, total room, and what's empty now -->
      {#if cur.scene === 'room'}
        {@const x0 = BAR.x + W_GB * pxPerGB}
        {@const xUsed = x0 + usedGB * pxPerGB}
        {@const xEnd = BAR.x + BAR.w}
        <g transition:fade={{ duration: 250 }}>
          <text x={BAR.x} y={BAR.y - 56} class="rowlabel">{t(`one H100 · ${HBM_GB} GB of HBM`, `一块 H100 · ${HBM_GB} GB HBM`)}</text>
          <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx="8" fill="white" stroke="var(--line)" />
          <rect x={BAR.x} y={BAR.y} width={W_GB * pxPerGB} height={BAR.h} rx="8" fill="var(--accent)" opacity="0.9" />
          <text x={BAR.x + (W_GB * pxPerGB) / 2} y={BAR.y + 27} text-anchor="middle" class="steplabel">{t(`weights ${W_GB} GB`, `权重 ${W_GB} GB`)}</text>
          {#each running as ctxK, i}
            {@const xs = x0 + running.slice(0, i).reduce((a, c) => a + seqGB(c * 1024), 0) * pxPerGB}
            {@const w = seqGB(ctxK * 1024) * pxPerGB - 1}
            <rect x={xs} y={BAR.y + 1} width={w} height={BAR.h - 2} rx="2" fill="#0891b2" opacity={0.5 + 0.3 * (i % 2)} in:fly={{ x: -6, delay: 150 + i * 90, duration: 250 }} />
            {#if w > 26}<text x={xs + w / 2} y={BAR.y + 27} text-anchor="middle" class="steplabel">{ctxK}k</text>{/if}
          {/each}
          <!-- brackets -->
          <g in:fade={{ delay: 1100 }}>
            <path d="M {x0} {BAR.y + BAR.h + 8} V {BAR.y + BAR.h + 16} H {xEnd} V {BAR.y + BAR.h + 8}" fill="none" stroke="var(--fg)" stroke-width="1.5" />
            <text x={(x0 + xEnd) / 2} y={BAR.y + BAR.h + 32} text-anchor="middle" class="tag strong">{t(`room for KV cache · ${HBM_GB - W_GB} GB`, `KV cache 的空间 · ${HBM_GB - W_GB} GB`)}</text>
          </g>
          <g in:fade={{ delay: 1600 }}>
            <path d="M {x0} {BAR.y - 8} V {BAR.y - 16} H {xUsed - 2} V {BAR.y - 8}" fill="none" stroke="#0891b2" stroke-width="1.5" />
            <text x={(x0 + xUsed) / 2} y={BAR.y - 22} text-anchor="middle" class="tag" fill="#0891b2">{t(`in use · ${usedGB.toFixed(0)} GB, ${running.length} requests`, `已用 · ${usedGB.toFixed(0)} GB，${running.length} 个 request`)}</text>
            <path d="M {xUsed + 2} {BAR.y - 8} V {BAR.y - 16} H {xEnd} V {BAR.y - 8}" fill="none" stroke="var(--gen)" stroke-width="1.5" />
            <text x={(xUsed + xEnd) / 2} y={BAR.y - 22} text-anchor="middle" class="tag strong" fill="var(--gen)">{t(`empty right now · ${(HBM_GB - W_GB - usedGB).toFixed(0)} GB`, `当前空闲 · ${(HBM_GB - W_GB - usedGB).toFixed(0)} GB`)}</text>
          </g>
          <text x={BAR.x} y={BAR.y + 110} class="legend" in:fade={{ delay: 2100 }}>{t(`each running request grows ${KB_TOK} KB per step; the empty part is what newcomers can be admitted into`, `每个运行中的 request 每步增长 ${KB_TOK} KB；空闲部分用来接纳新 request`)}</text>
        </g>
      {/if}

      <!-- Caps: the same card at three context lengths -->
      {#if cur.scene === 'caps'}
        <g transition:fade={{ duration: 250 }}>
          {#each [2048, 4096, 8192] as ctx, r}
            {@const y = 70 + r * 98}
            {@const n = capAt(ctx)}
            {@const h = 34}
            <g in:fade={{ delay: r * 300 }}>
              <text x={BAR.x} y={y - 10} class="rowlabel">{t(`every request at ${ctx / 1024}k tokens of context · ${Math.round(seqGB(ctx) * 1000).toLocaleString()} MB each`, `每个 request 上下文 ${ctx / 1024}k token · 各占 ${Math.round(seqGB(ctx) * 1000).toLocaleString()} MB`)}</text>
              <rect x={BAR.x} {y} width={BAR.w} height={h} rx="7" fill="white" stroke="var(--line)" />
              <rect x={BAR.x} {y} width={W_GB * pxPerGB} height={h} rx="7" fill="var(--accent)" opacity="0.9" />
              <text x={BAR.x + (W_GB * pxPerGB) / 2} y={y + 22} text-anchor="middle" class="steplabel">{t('weights', '权重')}</text>
              {#each Array(n) as _, i}
                {@const x = BAR.x + W_GB * pxPerGB + i * seqGB(ctx) * pxPerGB}
                <rect {x} y={y + 1} width={Math.max(0.8, seqGB(ctx) * pxPerGB - 1)} height={h - 2} fill="#0891b2" opacity={0.55 + 0.35 * (i % 2)} in:fly={{ x: -5, delay: r * 300 + 100 + i * (ctx > 4096 ? 20 : 6), duration: 200 }} />
              {/each}
              <text x={BAR.x + BAR.w} y={y + h + 16} text-anchor="end" class="legend"><tspan class="strong">{t(`${n} requests`, `${n} 个 request`)}</tspan> {t('fit', '装得下')}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 1400 }}>
            <text x={BAR.x} y="340" class="legend">{t(`Ch. 5 Step 4's sweet spot was ${BALANCE} requests decoding at once;`, `Ch. 5 Step 4 的最佳点是 ${BALANCE} 个 request 同时 decode；`)}</text>
            <text x={BAR.x} y="358" class="legend">{t(`even at a short 2k context, this card holds ${capAt(2048)}`, `即使上下文短到 2k，这张卡也只装得下 ${capAt(2048)} 个`)}</text>
          </g>
        </g>
      {/if}

      <!-- Naive reservation: contiguous max-length blocks, then fragmentation -->
      {#if cur.scene === 'reserve'}
        {@const R = { x: 40, y: 92, w: 640, h: 40 }}
        {@const perReq = R.w / reserved.length}
        {@const C = { x: 40, y: 220, w: 640, h: 40 }}
        {@const cpx = C.w / churn.reduce((a, c) => a + c.gb, 0)}
        <g transition:fade={{ duration: 250 }}>
          <text x={R.x} y={R.y - 14} class="rowlabel">{t(`reserve the maximum for everyone · ${MAXCTX / 1024}k tokens = ${(seqGB(MAXCTX)).toFixed(0)} GB per request`, `给每个 request 预留最大长度 · ${MAXCTX / 1024}k token = ${(seqGB(MAXCTX)).toFixed(0)} GB`)}</text>
          {#each reserved as used, i}
            {@const x = R.x + i * perReq}
            <g in:fly={{ x: -6, delay: i * 120, duration: 250 }}>
              <rect x={x + 1} y={R.y} width={perReq - 2} height={R.h} rx="5" fill="url(#hatch)" stroke="#0891b2" stroke-opacity="0.5" />
              <rect x={x + 1} y={R.y} width={(perReq - 2) * used} height={R.h} rx="5" fill="#0891b2" opacity="0.85" />
              <text x={x + 4} y={R.y + R.h + 14} class="tag">req {i + 1} · {t(`using ${(used * MAXCTX / 1024).toFixed(1)}k of ${MAXCTX / 1024}k`, `已用 ${(used * MAXCTX / 1024).toFixed(1)}k / ${MAXCTX / 1024}k`)}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 800 }}>
            <rect x={R.x} y={R.y + R.h + 26} width="12" height="12" rx="2" fill="url(#hatch)" stroke="#0891b2" stroke-opacity="0.5" /><text x={R.x + 18} y={R.y + R.h + 36} class="tag">{t('reserved, never written: ', '预留却从未写入：')}<tspan class="strong">{Math.round(wasted * 100)}%</tspan> {t('of the cache budget', '的 cache 预算')}</text>
          </g>
          <text x={C.x} y={C.y - 14} class="rowlabel" in:fade={{ delay: 1300 }}>{t('a while later · requests finished at different times', '一段时间后 · request 在不同时间结束')}</text>
          {#each churn as seg, i}
            {@const x = C.x + churn.slice(0, i).reduce((a, c) => a + c.gb, 0) * cpx}
            <g in:fade={{ delay: 1300 + i * 80 }}>
              {#if seg.kind === 'live'}
                <rect x={x + 1} y={C.y} width={seg.gb * cpx - 2} height={C.h} rx="5" fill="#0891b2" opacity="0.85" />
              {:else}
                <rect x={x + 1} y={C.y} width={seg.gb * cpx - 2} height={C.h} rx="5" fill="white" stroke="var(--line)" stroke-dasharray="4 3" />
                <text x={x + (seg.gb * cpx) / 2} y={C.y + 24} text-anchor="middle" class="tag">{seg.gb} GB</text>
              {/if}
            </g>
          {/each}
          <g in:fade={{ delay: 2300 }}>
            <rect x={C.x} y={C.y + C.h + 16} width={1.0 * cpx} height="22" rx="5" fill="none" stroke="var(--eos)" stroke-width="1.5" stroke-dasharray="5 3" />
            <text x={C.x + (1.0 * cpx) / 2} y={C.y + C.h + 31} text-anchor="middle" class="tag" fill="var(--eos)">1 GB</text>
            <text x={C.x + 1.0 * cpx + 12} y={C.y + C.h + 31} class="legend">{t('← a newcomer needs 1 GB in one piece ·', '← 新 request 需要一整块 1 GB ·')} <tspan class="strong">{t(`${churnFree.toFixed(1)} GB free`, `空闲 ${churnFree.toFixed(1)} GB`)}</tspan>{t(', no hole big enough. Fragmentation.', '，没有足够大的洞。这就是碎片。')}</text>
          </g>
        </g>
      {/if}

      <!-- Page pool: allocate a newcomer (animated), or free a finished request (animated) -->
      {#if cur.scene === 'alloc' || cur.scene === 'free'}
        {@const base = cur.scene === 'alloc' ? cur.base! : pages1}
        {@const alloc = cur.scene === 'alloc' ? cur.alloc! : []}
        {@const owner = cur.owner ?? 0}
        {@const need = alloc.length}
        {@const tokenCount = need * SGLANG_PAGE_TOKENS}
        {@const vllmPages = Math.ceil(tokenCount / VLLM_PAGE_TOKENS)}
        {@const vllmSlots = vllmPages * VLLM_PAGE_TOKENS}
        <g transition:fade={{ duration: 250 }}>
          <text x={PG.x} y="40" class="rowlabel desktop-only">{t(`the ${HBM_GB - W_GB} GB after the weights, cut into pages · ${COLS * ROWS} shown of many thousands`, step === 5 ? `权重之外的 ${HBM_GB - W_GB} GB 教学容量 · 画出 ${COLS * ROWS} 个 page` : `${HBM_GB - W_GB} GB ÷ ${KB_TOK} KB ≈ 49 万个 page · 画出 ${COLS * ROWS} 个`)}</text>
          {#if step === 3 && $lang === 'zh'}<text x={PG.x} y="40" class="rowlabel phone-only">{HBM_GB - W_GB} GB ÷ {KB_TOK} KB ≈ 49 万个 page · 画出 {COLS * ROWS} 个</text>{/if}
          {#if step === 5}<text x={PG.x} y="40" class="rowlabel phone-only">{t(`${HBM_GB - W_GB} GB in pages · ${COLS * ROWS} shown`, `${HBM_GB - W_GB} GB 切成 page · 画出 ${COLS * ROWS} 个`)}</text>{/if}

          <!-- the grid (fades in once; steps 4 → 5 → 6 keep it mounted so nothing replays) -->
          {#each base as o, i}
            {@const { x, y } = cellXY(i)}
            {@const landing = alloc.includes(i)}
            {@const leaving = cur.scene === 'free' && o === FINISHED}
            {#if o < 0 || landing}
              <rect {x} {y} width={CELL} height={CELL} rx="4" fill="white" stroke="var(--line)" stroke-dasharray="3 2" />
            {/if}
            {#if o >= 0 && !landing && !leaving}
              <rect {x} {y} width={CELL} height={CELL} rx="4" fill={owners[o]} opacity="0.85" />
            {/if}
            {#if leaving}
              <rect {x} {y} width={CELL} height={CELL} rx="4" fill="white" stroke={phase >= 1 ? 'var(--gen)' : 'var(--line)'} stroke-dasharray="3 2" />
              {#if phase < 1}
                <rect {x} {y} width={CELL} height={CELL} rx="4" fill={owners[o]} opacity="0.85" out:fade={{ duration: 700 }} />
              {/if}
            {/if}
            {#if landing && phase >= 3}
              {@const k = alloc.indexOf(i)}
              <rect {x} {y} width={CELL} height={CELL} rx="4" fill={owners[owner]} opacity="0.9"
                    in:fly={{ x: STRIP.x + k * (CELL + GAP) - x, y: STRIP.y - y, delay: k * (step === 5 ? 300 : 90), duration: step === 5 ? 300 : 650 }} />
            {/if}
          {/each}

          <!-- legend -->
          {#each owners.slice(0, cur.scene === 'alloc' && owner === 6 ? 7 : cur.scene === 'alloc' ? 6 : 6) as c, r}
            {@const gone = (cur.scene === 'free' && r === FINISHED && phase >= 1) || (cur.scene === 'alloc' && owner === 6 && r === FINISHED)}
            <rect class:past-key={r < 6} x="608" y={PG.y + r * 20} width="12" height="12" rx="2" fill={c} opacity={gone ? 0.25 : 0.85} />
            <text class:past-key={r < 6} x="626" y={PG.y + r * 20 + 10} class="tag" opacity={gone ? 0.5 : 1}>req {r + 1}{gone ? t(' · done', ' · 结束') : ''}</text>
          {/each}
          <rect x="608" y={PG.y + 7 * 20} width="12" height="12" rx="2" fill="white" stroke="var(--line)" stroke-dasharray="3 2" /><text x="626" y={PG.y + 7 * 20 + 10} class="tag">{t('free', '空闲')}</text>

          {#if cur.scene === 'alloc'}
            <!-- the newcomer: one block, then pages, then gone into the grid -->
            {#if phase >= 1}
              <text x={PG.x} y={STRIP.y + 16} class="legend desktop-only" in:fade><tspan class="strong">{cur.name}</tspan> {t(`arrives · needs ${need} pages`, `到达 · 需要 ${need} 个 page`)}</text>
              {#if step === 3 && $lang === 'zh'}<text x={PG.x} y={STRIP.y + 16} class="legend phone-only" in:fade><tspan class="strong">{cur.name}</tspan>：{need} 个 page</text>{/if}
              {#if step === 5}<text x={PG.x} y={STRIP.y + 16} class="legend phone-only" in:fade><tspan class="strong">{cur.name}</tspan>{t(`: ${need} pages`, `：${need} 个 page`)}</text>{/if}
            {/if}
            {#if phase === 1}
              <rect x={STRIP.x} y={STRIP.y} width={need * (CELL + GAP) - GAP} height={CELL} rx="5" fill={owners[owner]} opacity="0.9" transition:fade={{ duration: 250 }} />
            {/if}
            {#if phase === 2}
              {#each Array(need) as _, k}
                <rect x={STRIP.x + k * (CELL + GAP)} y={STRIP.y} width={CELL} height={CELL} rx="4" fill={owners[owner]} opacity="0.9" in:fly={{ x: -k * 4, duration: 300 }} out:fade={{ duration: 100 }} />
              {/each}
            {/if}
            {#if phase === 2}
              <text x={STRIP.x + need * (CELL + GAP) + 10} y={STRIP.y + 16} class="tag desktop-only" in:fade>{t(`split into ${need} pages, not one block`, `拆成 ${need} 个 page，不是一整块`)}</text>
              {#if step === 3 && $lang === 'zh'}<text x={STRIP.x + need * (CELL + GAP) + 10} y={STRIP.y + 16} class="tag phone-only" in:fade>拆成 {need} 个 page</text>{/if}
            {/if}
            {#if phase >= 3}
              <text x={STRIP.x} y={STRIP.y + 16} class="tag desktop-only" in:fade={{ delay: 400 }}>{t(`→ any ${need} free pages, wherever they are`, `→ 任取 ${need} 个空闲 page，位置不限`)}</text>
              {#if step === 3 && $lang === 'zh'}<text x={STRIP.x} y={STRIP.y + 16} class="tag phone-only" in:fade={{ delay: 400 }}>→ 任取 {need} 个空闲 page</text>{/if}
              {#if step === 5}<text x={STRIP.x} y={STRIP.y + 16} class="tag phone-only" in:fade={{ delay: 400 }}>{t(`→ any ${need} free pages`, `→ 任取 ${need} 个空闲 page`)}</text>{/if}
            {/if}
            {#if phase >= 4}
              <g in:fade>
                <text x={PG.x - 10} y={PG.y + ROWS * (CELL + GAP) + (step === 5 ? 24 : 26)} class="pt">·</text><text x={PG.x} y={PG.y + ROWS * (CELL + GAP) + (step === 5 ? 24 : 26)} class="legend"><tspan class="strong">{t(`${cur.name}'s page table:`, `${cur.name} 的页表：`)}</tspan> {alloc.join(', ')}</text>
                <text x={PG.x - 10} y={PG.y + ROWS * (CELL + GAP) + 48} class="pt desktop-only">·</text><text x={PG.x} y={PG.y + ROWS * (CELL + GAP) + 48} class="legend desktop-only">{t('attention reads the cache through this list; nothing needs to be next to anything', 'attention 照这个列表读 cache；谁也不必挨着谁')}</text>
                {#if step === 3 && $lang === 'zh'}
                  <text x={PG.x - 10} y={PG.y + ROWS * (CELL + GAP) + 54} class="pt phone-only">·</text><text x={PG.x} y={PG.y + ROWS * (CELL + GAP) + 54} class="legend phone-only">attention 照表读；page 不必相邻</text>
                  <text x={PG.x} y={PG.y + ROWS * (CELL + GAP) + 82} class="legend">从左上起，页号 = 20 × 行 + 列（行、列从 0 数）</text>
                  <text x={PG.x} y={PG.y + ROWS * (CELL + GAP) + 110} class="legend">req 6 有 5 token；1 page 装 1 token，所以要 5 page</text>
                {/if}
                {#if step === 5}<text x={PG.x - 10} y={PG.y + ROWS * (CELL + GAP) + 48} class="pt phone-only">·</text><text x={PG.x} y={PG.y + ROWS * (CELL + GAP) + 48} class="legend phone-only">{t('attention reads the table; pages need not touch', 'attention 照表读；page 不必相邻')}</text>{/if}
                {#if step === 5}
                  <text x={PG.x} y="342" class="legend">{t(`${tokenCount} tokens → vLLM 0.10.1: ${vllmPages} page`, `${tokenCount} token → vLLM 0.10.1：${vllmPages} page`)}</text>
                  <rect x={PG.x - 4} y="352" width={vllmSlots * 12 + 4} height="28" rx="3" fill="none" stroke={owners[owner]} />
                  {#each Array(vllmSlots) as _, k}
                    <rect x={PG.x + k * 12} y="356" width="10" height="20" rx="1" fill={k < tokenCount ? owners[owner] : 'url(#hatch)'} stroke={owners[owner]} />
                  {/each}
                  <text x={PG.x} y="392" class="legend">{t(`${vllmSlots} slots: ${tokenCount} used, ${vllmSlots - tokenCount} empty · CUDA`, `${vllmSlots} 格：装 ${tokenCount}，空 ${vllmSlots - tokenCount} · CUDA`)}</text>
                  <text x="430" y="342" class="legend">{t(`SGLang: ${need} pages`, `SGLang：${need} page`)}</text>
                  {#each Array(need) as _, k}
                    <rect x={430 + k * 12} y="356" width="10" height="20" rx="1" fill={owners[owner]} stroke={owners[owner]} />
                  {/each}
                  <text x="430" y="392" class="legend">{t(`${need} pages · 0 empty`, `${need} page · 0 空格`)}</text>
                {/if}
              </g>
            {/if}
          {:else}
            {#if phase >= 1}
              <text x={PG.x} y={STRIP.y + 16} class="legend" in:fade><tspan class="strong">req {FINISHED + 1}</tspan> {t(`finished · its ${freed.length} pages go back to the pool`, `结束 · 它的 ${freed.length} 个 page 回到池里`)}</text>
            {/if}
            {#if phase >= 2}
              <text x={PG.x} y={PG.y + ROWS * (CELL + GAP) + 26} class="legend" in:fade>{t(`${freeOf(pages2).length} free pages now, scattered · nobody else moved`, `现在有 ${freeOf(pages2).length} 个空闲 page，散落各处 · 谁也没移动`)}</text>
            {/if}
          {/if}
        </g>
      {/if}

      <!-- Closing: admission as a decision, and what a request actually holds -->
      {#if cur.scene === 'closing'}
        {@const MC = 13}
        {@const MG = 2}
        {@const MX = 372}
        {@const MY = 214}
        <g transition:fade={{ duration: 250 }}>
          <defs>
            <marker id="kvarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
            </marker>
          </defs>
          <!-- everything above the footnote, lifted to leave it clear space -->
          <g transform="translate(0 -8)">
          <text x="40" y="52" class="rowlabel">{t('admitting a newcomer', '接纳新 request')}</text>
          <g in:fly={{ y: 8, duration: 300 }}>
            <rect x="40" y="70" width="290" height="56" rx="12" fill="white" stroke="var(--fg)" stroke-width="1.5" />
            <text x="185" y="94" text-anchor="middle" class="slab strong small">{t('free pages ≥ pages needed?', '空闲 page ≥ 所需 page？')}</text>
            <text x="185" y="114" text-anchor="middle" class="tag">{t('needed: its prompt, plus every answer still to come', '所需：它的 prompt，加上还没生成的回答')}</text>
          </g>
          <g in:fly={{ y: 8, delay: 300, duration: 300 }}>
            <path d="M 110 126 V 168" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#kvarrow)" />
            <text x="118" y="152" class="tag strong" fill="#16a34a">{t('yes', '是')}</text>
            <rect x="40" y="172" width="290" height="62" rx="12" fill="#fbfaf7" stroke="#16a34a" />
            <text x="56" y="196" class="slab strong small">{t('admit', '接纳')}</text>
            <text x="56" y="216" class="tag">{t('take any free pages, write the page table', '任取空闲 page，写页表')}</text>
          </g>
          <g in:fly={{ y: 8, delay: 600, duration: 300 }}>
            <path d="M 250 126 V 148 H 280 V 262" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#kvarrow)" />
            <text x="258" y="144" class="tag strong" fill="var(--eos)">{t('no', '否')}</text>
            <rect x="40" y="266" width="290" height="112" rx="12" fill="#fbfaf7" stroke="var(--eos)" />
            <text x="56" y="290" class="slab strong small">{t('wait', '等待')}</text>
            <text x="56" y="310" class="tag">{t('until a running request finishes', '直到某个运行中的 request 结束')}</text>
            <text x="56" y="326" class="tag">{t('and frees its pages', '并释放它的 page')}</text>
            <text x="56" y="346" class="tag">{t('running requests out of pages, nobody finishing?', '运行中的 request 没了 page，又没人结束？')}</text>
            <text x="56" y="362" class="tag"><tspan class="strong">{t('retract', '撤回')}</tspan> {t('the one with least output, re-prefill it later', '输出最少的那个，之后重新 prefill')}</text>
          </g>

          <!-- what a request holds: a list of page numbers -->
          <g in:fade={{ delay: 900 }}>
            <rect x="350" y="70" width="350" height="306" rx="12" fill="#fbfaf7" stroke={owners[6]} />
            <text x="366" y="94" class="boxtitle">{t('what req 7 holds', 'req 7 持有什么')}</text>
            <text x="366" y="118" class="slab small">{t('not a region of memory, a ', '不是一块内存区域，而是一张')}<tspan class="strong">{t('page table', '页表')}</tspan>{t(':', '：')}</text>
            {#each allocB as pg, k}
              {@const cx = 366 + k * 38}
              <rect x={cx} y="132" width="32" height="22" rx="5" fill={owners[6]} opacity="0.9" />
              <text x={cx + 16} y="147" text-anchor="middle" class="steplabel">{pg}</text>
              <text x={cx + 16} y="168" text-anchor="middle" class="tag">{k + 1}</text>
            {/each}
            <text x="366" y="196" class="tag">{t('the same pages, where they actually sit in the pool:', '同样的 page 在池中的实际位置：')}</text>
            {#each pages3 as o, i}
              {@const x = MX + (i % COLS) * (MC + MG)}
              {@const y = MY + Math.floor(i / COLS) * (MC + MG)}
              {@const mine = o === 6}
              <rect {x} {y} width={MC} height={MC} rx="2" fill={mine ? owners[6] : o < 0 ? 'white' : '#e6e3db'} stroke={mine ? 'none' : o < 0 ? 'var(--line)' : 'none'} opacity={mine ? 0.95 : 1} />
              {#if mine}<text x={x + MC / 2} y={y + MC - 3.5} text-anchor="middle" class="tiny">{allocB.indexOf(i) + 1}</text>{/if}
            {/each}
            <text x="366" y="318" class="tag">{t('attention walks the list in order;', 'attention 按顺序走列表；')}</text>
            <text x="366" y="332" class="tag">{t('the pages never need to be adjacent', 'page 从来不需要相邻')}</text>
            <text x="366" y="352" class="tag muted">{t(`same page in two lists → chapter ${CH_PREFIX}`, `同一个 page 在两个列表里 → 第 ${CH_PREFIX} 章`)}</text>
            <text x="366" y="366" class="tag muted">{t(`a list sent to another GPU → chapter ${CH_DISAGG}`, `列表发给另一块 GPU → 第 ${CH_DISAGG} 章`)}</text>
          </g>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade={{ delay: 1500 }}>SGLang: <tspan class="mono">MHATokenToKVPool</tspan> · <tspan class="mono">TokenToKVPoolAllocator</tspan> · <tspan class="mono">req_to_token</tspan> · <tspan class="mono">PrefillAdder</tspan> · <tspan class="mono">retract_decode</tspan></text>
        </g>
      {/if}
      {#if cur.foot}
        {#key cur.foot}<text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>{t(cur.foot ?? '', cur.footZh ?? '')}</text>{/key}
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .mono { font-family: var(--mono); font-size: 10px; }
  .tiny { font-size: 8px; fill: white; font-weight: 700; }
  .tag.muted { fill: var(--faint); }
  .slab.strong { font-weight: 650; font-size: 14px; }
  .slab.strong.small { font-size: 12px; }
  .legend.muted, .legend .muted { fill: var(--muted); font-weight: 400; }
  .phone-only { display: none; }
  @media (max-width: 900px) {
    .step-four .desktop-only, .step-four .past-key, .step-six .desktop-only, .step-six .past-key { display: none; }
    .step-four .phone-only, .step-six .phone-only { display: inline; }
    .step-four .rowlabel, .step-four .legend, .step-four .tag, .step-four .pt,
    .step-six .rowlabel, .step-six .legend, .step-six .tag, .step-six .pt { font-size: 23px; }
  }
</style>
