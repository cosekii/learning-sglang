<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import { chapterNumber as chNum, type NavLink } from '../../chapters';
  import { W_GB, BW, TFLOPS as FLOPS, GFLOP_PER_TOKEN as GFLOP, KB_PER_TOKEN as KB_TOK } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const CH_NEXT = chNum('09-one-request');

  // ---- Numbers ----------------------------------------------------------------------------------
  const tMem = W_GB / BW;
  const tComp = (n: number) => (n * GFLOP) / FLOPS;
  const stepMs = (n: number) => Math.max(tMem, tComp(n));
  const fmt = (ms: number) => (ms < 10 ? ms.toFixed(1) : ms.toFixed(0)) + ' ms';
  const PAGE = 128;                                      // tokens per page, for the drawings
  const SHARED = 512, TAIL_A = 140, TAIL_B = 90;
  const pagesFor = (n: number) => Math.ceil(n / PAGE);

  // ---- Pair scene: two requests, one prefix ---------------------------------------------------------
  const TOK = 0.5;                                       // px per token in the prompt bars
  const PB = { x: 110, yA: 66, yB: 104, h: 24 };
  const COLS = 20, ROWS = 4, CELL = 22, GAP = 3;
  const PG = { x: 60, y: 168 };
  const A_SHARED = [3, 9, 16, 22], A_TAIL = [31, 37], B_SHARED = [46, 52, 59, 65], B_TAIL = [73];
  const colA = '#2f5bea', colB = '#7c3aed';

  // ---- Tree scene ---------------------------------------------------------------------------------------
  const tree = {
    root: { label: 'system prompt', tokens: 512, x: 360, y: 84 },
    kids: [
      { label: 'few-shot set A', labelZh: 'few-shot 集 A', tokens: 300, x: 200, y: 160, leaves: [{ label: 'q1', tokens: 90, x: 110, y: 236 }, { label: 'q2', tokens: 140, x: 250, y: 236 }] },
      { label: 'few-shot set B', labelZh: 'few-shot 集 B', tokens: 250, x: 520, y: 160, leaves: [{ label: 'q3', tokens: 60, x: 470, y: 236 }, { label: 'q5', tokens: 120, x: 600, y: 236 }] },
    ],
  };
  const NEW = { label: 'q4 (new)', labelZh: 'q4（新）', tokens: 180, x: 250, y: 312 };
  const matched = tree.root.tokens + tree.kids[0].tokens;
  const newTotal = matched + NEW.tokens;

  // ---- Chat scene ---------------------------------------------------------------------------------------
  const turns = [
    { q: 600, a: 120 },
    { q: 80, a: 150 },
    { q: 60, a: 0 },
  ];
  const cumBefore = (i: number) => turns.slice(0, i).reduce((s, turn) => s + turn.q + turn.a, 0);
  const noTreeTotal = turns.reduce((s, turn, i) => s + cumBefore(i) + turn.q, 0);
  const treeTotal = turns.reduce((s, turn) => s + turn.q, 0);

  // ---- Closing: waiting list ordered by match ----------------------------------------------------------
  const waiting = [
    { id: 'req X', total: 992, matched: 812 },
    { id: 'req Y', total: 700, matched: 0 },
    { id: 'req Z', total: 900, matched: 512 },
  ];
  const lpm = [...waiting].sort((a, b) => b.matched - a.matched);

  // ---- Script ---------------------------------------------------------------------------------------------
  type Scene = 'pair' | 'tree' | 'chat' | 'closing';
  interface Step { caption: string; captionZh: string; scene: Scene; variant?: number; foot?: string; footZh?: string }
  const steps: Step[] = [
    { scene: 'pair', variant: 0, caption: `Two requests arrive with the same first ${SHARED} tokens: the same system prompt. Same tokens at the same positions give exactly the same k and v. Paged as before, each gets its own copy: the same numbers written twice.`, captionZh: `两个 request 的前 ${SHARED} 个 token 相同：同一个 system prompt。相同位置的相同 token，k 和 v 完全相同。照旧分页，各存一份：同样的数字写两遍。` },
    { scene: 'pair', variant: 1, caption: `Let B's page table point at A's pages instead. B prefills only its ${TAIL_B}-token tail and reads the shared ${SHARED}. Those pages now have two owners, so they're freed only when both are done.`, captionZh: `让 B 的 page table 指向 A 的 page。B 只 prefill 尾部 ${TAIL_B} 个 token，共享的 ${SHARED} 个直接读。这些 page 有两个主人，都结束才释放。` },
    { scene: 'pair', variant: 2, caption: `How do we know they share? Compare token ids from the start. Position i's k and v depend on every token before it, so only a matching <b>prefix</b> can be reused: one different token, and everything after it is new.`, captionZh: `怎么知道能共享？从头比较 token id。位置 i 的 k 和 v 依赖它之前的每个 token，所以只有相同的<b>前缀</b>能复用：一个 token 不同，后面的全是新的。` },
    { scene: 'tree', variant: 0, caption: `Hundreds of requests share in nests: the same system prompt, then one of a few templates, then the chat so far. That's a tree of prefixes. SGLang keeps it as a radix tree, each node owning the pages for its tokens: <b>RadixAttention</b>.`, captionZh: `数百 request 层层共享：system prompt、模板、已有对话，构成前缀树。SGLang 用 radix tree 存，节点持有其 token 的 page：<b>RadixAttention</b>。` },
    { scene: 'tree', variant: 1, caption: `A newcomer walks the tree: ${matched} of its ${newTotal} tokens are already there, so it prefills ${NEW.tokens}. First token in ${fmt(stepMs(NEW.tokens))} instead of ${fmt(stepMs(newTotal))}, and ${matched} tokens of cache it never had to allocate.`, captionZh: `新 request 沿树走：${newTotal} 个 token 已有 ${matched} 个，只 prefill ${NEW.tokens} 个。首 token 用时 ${fmt(stepMs(NEW.tokens))} 而非 ${fmt(stepMs(newTotal))}，且无需分配 ${matched} 个 token 的缓存。`, foot: `SGLang matches whole pages, so with ${PAGE}-token pages this match would stop at ${Math.floor(matched / PAGE) * PAGE} · its default page is 1 token, where ${matched} is exact`, footZh: `SGLang 按整 page 匹配，page 为 ${PAGE} 个 token 时匹配会停在 ${Math.floor(matched / PAGE) * PAGE} · 其默认 page 是 1 个 token，此时 ${matched} 精确匹配` },
    { scene: 'chat', caption: `Chat is the big win. Every turn's prompt is the previous turn plus a question. Without the tree, turn 3 re-prefills the whole conversation, ${(cumBefore(2) + turns[2].q).toLocaleString()} tokens. With it, ${turns[2].q}.`, captionZh: `对话收益最大。每轮的 prompt 是上一轮加一个问题。没有树，第 3 轮要重新 prefill 整段对话，共 ${(cumBefore(2) + turns[2].q).toLocaleString()} 个 token；有树只需 ${turns[2].q} 个。`, foot: `plus one token a turn: the answer's last token was never fed back in, so its k and v were never written`, footZh: `每轮还要加一个 token：回答的最后一个 token 从未被送回，所以它的 k 和 v 从未写入` },
    { scene: 'tree', variant: 2, caption: `Nodes nobody is running stay as long as memory allows. When the pool needs pages, the least recently used branch goes first. Pages of running requests are pinned and never evicted.`, captionZh: `没人运行的节点，只要内存够就留着。池子需要 page 时，先回收最久未用的分支。运行中 request 的 page 被钉住，永不驱逐。` },
    { scene: 'closing', caption: `The scheduler can use this: longest-prefix-match puts the most-cached requests first. SGLang defaults to first come, first served, and reuse works under both. Next: where requests come from and where tokens go.`, captionZh: `scheduler 能用它：最长前缀匹配把缓存最多的 request 排前面。SGLang 默认先来先服务，两者下都能复用。接下来：request 从哪来，token 到哪去。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const v = $derived(cur.variant ?? 0);
  // within-step phases for the eviction step, replayed on every step change
  let phase = $state(0);
  $effect(() => {
    const st = steps[step];
    phase = 0;
    const plan = st.scene === 'tree' && st.variant === 2 ? [700, 1800] : [];
    const timers = plan.map((ms, i) => setTimeout(() => (phase = i + 1), ms));
    return () => timers.forEach(clearTimeout);
  });
  const cellXY = (i: number) => ({ x: PG.x + (i % COLS) * (CELL + GAP), y: PG.y + Math.floor(i / COLS) * (CELL + GAP) });
  const W = 720, H = 400;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Prefix caching, step {step + 1}">
      <defs>
        <pattern id="shared2" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill={colA} />
          <rect width="4" height="8" fill={colB} />
        </pattern>
      </defs>

      <!-- Pair: two requests, one prefix -->
      {#if cur.scene === 'pair'}
        {@const sw = SHARED * TOK}
        {@const ty = PG.y + ROWS * (CELL + GAP) + 26}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t(`two prompts · page = ${PAGE} tokens here`, `两个 prompt · 这里 page = ${PAGE} 个 token`)}</text>
          {#each [{ id: 'A', y: PB.yA, tail: TAIL_A, c: colA }, { id: 'B', y: PB.yB, tail: TAIL_B, c: colB }] as r}
            <text x={PB.x - 12} y={r.y + 16} text-anchor="end" class="rowlabel">{t(`req ${r.id}`, `request ${r.id}`)}</text>
            <rect x={PB.x} y={r.y} width={sw} height={PB.h} rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={PB.x + sw / 2} y={r.y + 16} text-anchor="middle" class="cell">{t(`system prompt · ${SHARED} tokens`, `system prompt · ${SHARED} 个 token`)}</text>
            <rect x={PB.x + sw + 3} y={r.y} width={r.tail * TOK} height={PB.h} rx="5" fill={r.c} opacity="0.9" />
            <text x={PB.x + sw + 3 + (r.tail * TOK) / 2} y={r.y + 16} text-anchor="middle" class="steplabel">q{r.id} · {r.tail}</text>
          {/each}
          {#if v === 0}
            <text x={PB.x + sw + 90} y={PB.yA + 16} class="tag" in:fade={{ delay: 400 }}>{t(`= ${pagesFor(SHARED)} + ${pagesFor(TAIL_A)} pages`, `= ${pagesFor(SHARED)} + ${pagesFor(TAIL_A)} 个 page`)}</text>
            <text x={PB.x + sw + 90} y={PB.yB + 16} class="tag" in:fade={{ delay: 400 }}>{t(`= ${pagesFor(SHARED)} + ${pagesFor(TAIL_B)} pages`, `= ${pagesFor(SHARED)} + ${pagesFor(TAIL_B)} 个 page`)}</text>
          {/if}
          {#if v === 2}
            <!-- token-by-token match along the two bars -->
            {#each Array(13) as _, k}
              {@const x = PB.x + 10 + k * (sw / 13)}
              <text {x} y={PB.yA + PB.h + 12} text-anchor="middle" class="tag" fill="#16a34a" in:fade={{ delay: k * 70 }}>✓</text>
            {/each}
            <text x={PB.x + sw + 10} y={PB.yA + PB.h + 12} text-anchor="middle" class="tag strong" fill="var(--eos)" in:fade={{ delay: 1000 }}>✕</text>
            <text x={PB.x + sw + 22} y={PB.yA + PB.h + 12} class="tag" fill="var(--eos)" in:fade={{ delay: 1000 }}>{t('first difference: everything after is new', '第一个不同处：后面全是新的')}</text>
          {/if}

          <!-- the page pool -->
          {#each Array(COLS * ROWS) as _, i}
            {@const { x, y } = cellXY(i)}
            {@const aS = A_SHARED.includes(i)}
            {@const aT = A_TAIL.includes(i)}
            {@const bS = B_SHARED.includes(i)}
            {@const bT = B_TAIL.includes(i)}
            <rect {x} {y} width={CELL} height={CELL} rx="4" fill="white" stroke="var(--line)" stroke-dasharray="3 2" />
            {#if aS}
              <rect {x} {y} width={CELL} height={CELL} rx="4" fill={v >= 1 ? 'url(#shared2)' : colA} opacity="0.9" />
              <text x={x + CELL / 2} y={y + 15} text-anchor="middle" class="tiny">S</text>
            {:else if aT}
              <rect {x} {y} width={CELL} height={CELL} rx="4" fill={colA} opacity="0.9" />
            {:else if bS}
              {#if v === 0}
                <rect {x} {y} width={CELL} height={CELL} rx="4" fill={colB} opacity="0.9" out:fade={{ duration: 500 }} />
                <text x={x + CELL / 2} y={y + 15} text-anchor="middle" class="tiny" out:fade={{ duration: 500 }}>S</text>
              {/if}
            {:else if bT}
              <rect {x} {y} width={CELL} height={CELL} rx="4" fill={colB} opacity="0.9" />
            {/if}
          {/each}
          {#if v === 0}
            <g in:fade={{ delay: 800 }}>
              <path d="M {cellXY(A_SHARED[3]).x + CELL} {cellXY(A_SHARED[3]).y + CELL / 2} C {cellXY(A_SHARED[3]).x + 60} {cellXY(A_SHARED[3]).y + CELL / 2}, {cellXY(B_SHARED[0]).x - 60} {cellXY(B_SHARED[0]).y + CELL / 2}, {cellXY(B_SHARED[0]).x} {cellXY(B_SHARED[0]).y + CELL / 2}" fill="none" stroke="var(--eos)" stroke-width="1.5" stroke-dasharray="4 3" />
              <text x="586" y={PG.y + 1 * (CELL + GAP) + 10} class="tag" fill="var(--eos)">{t(`S = the same ${SHARED} tokens'`, `S = 同样 ${SHARED} 个 token 的`)}</text>
              <text x="586" y={PG.y + 1 * (CELL + GAP) + 24} class="tag" fill="var(--eos)">{t('k and v, stored twice', 'k 和 v，存了两遍')}</text>
            </g>
          {/if}

          <!-- page tables -->
          <text x={PG.x} y={ty} class="legend"><tspan class="strong" fill={colA}>A</tspan>: {A_SHARED.join(', ')} <tspan class="muted">|</tspan> {A_TAIL.join(', ')}</text>
          {#if v === 0}
            <text x={PG.x} y={ty + 22} class="legend"><tspan class="strong" fill={colB}>B</tspan>: {B_SHARED.join(', ')} <tspan class="muted">|</tspan> {B_TAIL.join(', ')}</text>
          {:else}
            <text x={PG.x} y={ty + 22} class="legend" in:fade><tspan class="strong" fill={colB}>B</tspan>: <tspan fill={colA} font-weight="600">{A_SHARED.join(', ')}</tspan> <tspan class="muted">|</tspan> {B_TAIL.join(', ')} <tspan class="muted">{t(`· shared pages: 2 owners · B prefilled ${TAIL_B} tokens, not ${SHARED + TAIL_B}`, `· 共享 page：2 个主人 · B 只 prefill 了 ${TAIL_B} 个 token，不是 ${SHARED + TAIL_B} 个`)}</tspan></text>
          {/if}
          {#if v === 2}
            <text x={PG.x} y={ty + 46} class="legend" in:fade={{ delay: 1300 }}>{t(`this is why it's a prefix cache and not a substring cache: the match has to start at token 1`, `这就是为什么叫前缀缓存而不是子串缓存：匹配必须从第 1 个 token 开始`)}</text>
          {/if}
        </g>
      {/if}

      <!-- Radix tree -->
      {#if cur.scene === 'tree'}
        {@const hot = v === 1}
        {@const evict = v === 2}
        {@const gone = evict && phase >= 2}
        {@const nConv = tree.kids.reduce((a, k) => a + k.leaves.length, 0)}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('cached prefixes as a radix tree · each node owns the pages for its tokens', '缓存的前缀构成 radix tree · 每个节点持有其 token 的 page')}</text>
          {#each tree.kids as k, i}
            <line x1={tree.root.x} y1={tree.root.y + 16} x2={k.x} y2={k.y - 16} stroke={hot && i === 0 ? 'var(--accent)' : 'var(--faint)'} stroke-width={hot && i === 0 ? 2.5 : 1.5} opacity={gone && i === 1 ? 0.25 : 1} class="fadeable" />
            {#each k.leaves as l}
              {#if !(gone && i === 1)}
                <line x1={k.x} y1={k.y + 16} x2={l.x} y2={l.y - 14} stroke="var(--faint)" stroke-width="1.5" out:fade={{ duration: 400 }} />
              {/if}
            {/each}
          {/each}
          {#if hot}
            <line x1={tree.kids[0].x} y1={tree.kids[0].y + 16} x2={NEW.x} y2={NEW.y - 14} stroke="var(--gen)" stroke-width="2.5" in:fade={{ delay: 600 }} />
          {/if}
          <g in:fly={{ y: -6, duration: 300 }}>
            <rect x={tree.root.x - 110} y={tree.root.y - 16} width="220" height="32" rx="8" fill={hot ? 'var(--accent-soft)' : '#fbfaf7'} stroke="var(--accent)" stroke-width={hot ? 2 : 1} />
            <text x={tree.root.x} y={tree.root.y + 4} text-anchor="middle" class="slab strong small">{tree.root.label} · {tree.root.tokens} {t('tokens', '个 token')}</text>
            {#if evict}<text x={tree.root.x + 118} y={tree.root.y + 4} class="tag" fill="#16a34a">{t('📌 pinned', '📌 已钉住')}</text>{/if}
          </g>
          {#each tree.kids as k, i}
            {@const nodeGone = gone && i === 1}
            <g in:fly={{ y: -6, delay: 200 + i * 100, duration: 300 }} opacity={nodeGone ? 0.3 : 1} class="fadeable">
              <rect x={k.x - 90} y={k.y - 16} width="180" height="32" rx="8" fill={hot && i === 0 ? 'var(--accent-soft)' : '#fbfaf7'} stroke={nodeGone ? 'var(--faint)' : 'var(--accent)'} stroke-width={hot && i === 0 ? 2 : 1} stroke-dasharray={nodeGone ? '4 3' : 'none'} />
              <text x={k.x} y={k.y + 4} text-anchor="middle" class="slab small">{t(k.label, k.labelZh)} · {k.tokens}</text>
            </g>
            {#if nodeGone}
              <g in:fade>
                <rect x={k.x - 40} y={k.y - 30} width="80" height="18" rx="9" fill="var(--eos)" />
                <text x={k.x} y={k.y - 17} text-anchor="middle" class="steplabel">{t('evicted', '已驱逐')}</text>
              </g>
            {/if}
            {#each k.leaves as l, j}
              {@const finished = evict && i === 1 && phase >= 1}
              {#if !(gone && i === 1)}
                <g in:fly={{ y: -6, delay: 450 + (i * 2 + j) * 80, duration: 300 }} out:fly={{ y: 40, duration: 500 }}>
                  <rect x={l.x - 44} y={l.y - 14} width="88" height="28" rx="8" fill={finished ? '#f3f1eb' : 'white'} stroke={finished ? 'var(--faint)' : 'var(--gen)'} />
                  <text x={l.x} y={l.y + 4} text-anchor="middle" class="cell" opacity={finished ? 0.5 : 1}>{l.label} · {l.tokens}</text>
                  {#if finished}
                    <g in:fly={{ y: 6, duration: 250 }}>
                      <circle cx={l.x + 44} cy={l.y - 14} r="9" fill="#16a34a" />
                      <text x={l.x + 44} y={l.y - 10.5} text-anchor="middle" class="steplabel">✓</text>
                      <text x={l.x} y={l.y + 28} text-anchor="middle" class="tag" fill="#16a34a">{t('finished · nobody using it', '已完成 · 无人使用')}</text>
                    </g>
                  {/if}
                </g>
              {/if}
            {/each}
          {/each}
          {#if v === 0}
            <text x="16" y="372" class="legend" in:fade={{ delay: 1100 }}>{t(`${nConv} conversations, one copy of the system prompt: `, `${nConv} 段对话，system prompt 只存一份：`)}<tspan class="strong">{tree.root.tokens} {t('tokens', '个 token')}</tspan>{t(` of cache instead of ${tree.root.tokens * nConv} · a leaf is a live request`, ` 的缓存，而不是 ${tree.root.tokens * nConv} 个 · 叶子是运行中的 request`)}</text>
          {:else if hot}
            <g in:fly={{ y: 8, delay: 600, duration: 300 }}>
              <rect x={NEW.x - 70} y={NEW.y - 14} width="140" height="28" rx="8" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="2" />
              <text x={NEW.x} y={NEW.y + 4} text-anchor="middle" class="cell">{t(NEW.label, NEW.labelZh)} · {NEW.tokens}</text>
            </g>
            <g in:fade={{ delay: 1100 }}>
              <text x="400" y={NEW.y - 4} class="legend"><tspan class="strong">{t(`matched ${matched}`, `已匹配 ${matched}`)}</tspan>{t(` of ${newTotal} tokens → prefill only `, ` / ${newTotal} 个 token → 只 prefill `)}<tspan class="strong">{NEW.tokens}</tspan></text>
              <text x="400" y={NEW.y + 16} class="legend">{t('first token: ', '首 token：')}<tspan class="strong">{fmt(stepMs(NEW.tokens))}</tspan>{t(` instead of ${fmt(stepMs(newTotal))}`, ` 而不是 ${fmt(stepMs(newTotal))}`)}</text>
              <text x="16" y="372" class="legend">{t(`pages needed at admission: ${pagesFor(NEW.tokens)} for the tail, not ${pagesFor(newTotal)}. The tree pays twice: less prefill and less memory.`, `准入时需要的 page：尾部 ${pagesFor(NEW.tokens)} 个，而非 ${pagesFor(newTotal)} 个 · 树双重受益：prefill 更少，内存更省`)}</text>
            </g>
          {:else}
            {#if phase >= 2}
              <g in:fade>
                <text x={tree.kids[1].x} y={tree.kids[1].y + 96} text-anchor="middle" class="tag" fill="var(--eos)">{t('the pool needs pages · set B is the least recently used branch', '池子需要 page · 集 B 是最久未用的分支')}</text>
                <text x={tree.kids[1].x} y={tree.kids[1].y + 112} text-anchor="middle" class="tag" fill="var(--eos)">{t(`→ its ${tree.kids[1].tokens} tokens of k and v return to the pool`, `→ 其 ${tree.kids[1].tokens} 个 token 的 k 和 v 归还池子`)}</text>
              </g>
            {/if}
            <g in:fade={{ delay: 2400 }}>
              <text x="16" y="372" class="legend">{t(`a node's pages are reclaimable when its reference count is zero; running requests keep their whole path pinned`, `节点引用计数为零时，其 page 可回收；运行中的 request 整条路径都被钉住`)}</text>
            </g>
          {/if}
        </g>
      {/if}

      <!-- Chat: each turn is the previous turn plus a question -->
      {#if cur.scene === 'chat'}
        {@const tk = 0.5}
        {@const bx = 110}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('one conversation, three turns · what prefill has to compute for each turn', '一段对话，三轮 · 每轮 prefill 要计算什么')}</text>
          {#each turns as turn, i}
            {@const y = 70 + i * 74}
            {@const before = cumBefore(i)}
            {@const qx = bx + before * tk + (before > 0 ? 3 : 0)}
            {@const qw = turn.q * tk}
            <g in:fly={{ x: -8, delay: i * 300, duration: 300 }}>
              <text x={bx - 12} y={y + 16} text-anchor="end" class="rowlabel">{t(`turn ${i + 1}`, `第 ${i + 1} 轮`)}</text>
              {#if before > 0}
                <rect x={bx} y={y} width={before * tk} height="24" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
                <text x={bx + (before * tk) / 2} y={y + 16} text-anchor="middle" class="cell">{t(`${i === 1 ? 'turn 1' : `turns 1–${i}`} · ${before.toLocaleString()} tokens · cached`, `${i === 1 ? '第 1 轮' : `第 1–${i} 轮`} · ${before.toLocaleString()} 个 token · 已缓存`)}</text>
              {/if}
              <rect x={qx} y={y} width={qw} height="24" rx="5" fill="var(--accent)" opacity="0.9" />
              {#if qw >= 70}
                <text x={qx + qw / 2} y={y + 16} text-anchor="middle" class="steplabel">{i === 0 ? `system + q1 · ${turn.q}` : `q${i + 1} · ${turn.q}`}</text>
              {:else}
                <text x={qx + qw / 2} y={y - 5} text-anchor="middle" class="tag strong" fill="var(--accent)">q{i + 1} · {turn.q}</text>
              {/if}
              {#if turn.a > 0}
                {@const ax = bx + (before + turn.q) * tk + 6}
                {@const aw = turn.a * tk}
                <rect x={ax} y={y} width={aw} height="24" rx="5" fill="var(--gen)" opacity="0.85" />
                {#if aw >= 70}
                  <text x={ax + aw / 2} y={y + 16} text-anchor="middle" class="steplabel">{t('answer', '回答')} · {turn.a}</text>
                {:else}
                  <text x={ax + aw / 2} y={y - 5} text-anchor="middle" class="tag strong" fill="var(--gen)">{t('answer', '回答')} · {turn.a}</text>
                {/if}
              {/if}
              <text x={bx} y={y + 44} class="tag">{t('prefill without the tree: ', '无树时 prefill：')}<tspan class="strong">{(before + turn.q).toLocaleString()}</tspan>{t(' tokens · with it: ', ' 个 token · 有树时：')}<tspan class="strong" fill="var(--accent)">{turn.q}</tspan></text>
            </g>
          {/each}
          <g in:fade={{ delay: 1200 }}>
            <text x={bx - 10} y="306" class="pt">·</text><text x={bx} y="306" class="legend">{t('three turns: ', '三轮：')}<tspan class="strong">{noTreeTotal.toLocaleString()}</tspan>{t(' prompt tokens prefilled without the tree, ', ' 个 prompt token 无树时要 prefill，有树时 ')}<tspan class="strong" fill="var(--accent)">{treeTotal}</tspan>{t(' with it', ' 个')}</text>
            <text x={bx - 10} y="328" class="pt">·</text><text x={bx} y="328" class="legend">{t(`the answer gets cached too, all but its last token: it's the prefix of the next turn`, `回答也会被缓存，只差最后一个 token：它是下一轮的前缀`)}</text>
          </g>
        </g>
      {/if}

      <!-- Closing: the same waiting list, ordered two ways -->
      {#if cur.scene === 'closing'}
        <g transition:fade={{ duration: 250 }}>
          <defs>
            <marker id="pfarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
            </marker>
          </defs>
          <text x="16" y="44" class="rowlabel">{t('the same three waiting requests · which one gets the next prefill batch?', '同样三个等待的 request · 下一个 prefill batch 给谁？')}</text>
          {#each [{ title: 'first come, first served · SGLang default', titleZh: '先来先服务 · SGLang 默认', list: waiting, y: 60, c: 'var(--faint)' }, { title: 'longest prefix match · opt-in', titleZh: '最长前缀匹配 · 可选启用', list: lpm, y: 212, c: 'var(--accent)' }] as row, r}
            {@const ph = 24 + row.list.length * 34 + 10}
            <g in:fade={{ delay: r * 600 }}>
              <rect x="24" y={row.y} width="680" height={ph} rx="12" fill="#fbfaf7" stroke={row.c} />
              <text x="40" y={row.y + 18} class="tag strong">{t(row.title, row.titleZh)}</text>
              <text x="64" y={row.y + 36} text-anchor="middle" class="tag">{t('time', '时间')}</text>
              <path d="M 64 {row.y + 42} V {row.y + ph - 12}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#pfarrow)" />
              {#each row.list as q, i}
                {@const y = row.y + 30 + i * 34}
                {@const tk = 0.36}
                <g in:fly={{ x: -8, delay: r * 600 + 200 + i * 120, duration: 250 }}>
                  <text x="88" y={y + 15} class="tag strong">{t(['1st', '2nd', '3rd'][i], ['第 1', '第 2', '第 3'][i])}</text>
                  <text x="150" y={y + 15} text-anchor="end" class="rowlabel">{q.id}</text>
                  <rect x="162" y={y} width={q.matched * tk} height="22" rx="4" fill="var(--accent-soft)" stroke="var(--accent)" />
                  <rect x={162 + q.matched * tk + (q.matched ? 3 : 0)} y={y} width={(q.total - q.matched) * tk} height="22" rx="4" fill="var(--accent)" opacity="0.9" />
                  <text x={162 + q.total * tk + 14} y={y + 15} class="tag">prefill <tspan class="strong">{q.total - q.matched}</tspan>{t(` of ${q.total} · ${fmt(stepMs(q.total - q.matched))}`, ` / ${q.total} 个 · ${fmt(stepMs(q.total - q.matched))}`)}</text>
                </g>
              {/each}
            </g>
          {/each}
          <g in:fade={{ delay: 1400 }}>
            <rect x="162" y="366" width="12" height="12" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" /><text x="180" y="376" class="tag">{t('already in the tree', '已在树中')}</text>
            <rect x="296" y="366" width="12" height="12" rx="2" fill="var(--accent)" opacity="0.9" /><text x="314" y="376" class="tag">{t('must be prefilled', '必须 prefill')}</text>
            <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">SGLang: <tspan class="mono">--schedule-policy lpm</tspan>{t(' (default ', '（默认 ')}<tspan class="mono">fcfs</tspan>{t(') · lpm falls back to fcfs past 128 waiting requests', '）· 等待的 request 超过 128 个时，lpm 退回 fcfs')}</text>
          </g>
        </g>
      {/if}
      {#if cur.foot}
        {#key cur.foot}<text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>{t(cur.foot, cur.footZh ?? cur.foot)}</text>{/key}
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .cell { font-family: var(--mono); font-size: 10px; fill: var(--fg); }
  .mono { font-family: var(--mono); font-size: 10px; }
  .tiny { font-size: 9px; fill: white; font-weight: 700; }
  .slab.strong { font-weight: 650; font-size: 14px; }
  .slab.strong.small { font-size: 12px; }
  .legend.muted, .legend .muted { fill: var(--muted); font-weight: 400; }
  .tag.muted { fill: var(--faint); }
  .fadeable { transition: opacity 500ms; }
</style>
