<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import { chapterNumber as chNum, chapters, type NavLink } from '../../chapters';
  import { W_GB, BW } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const CH_CUDA = chNum('11-cuda-graphs'), CH_DISAGG = chNum('28-disaggregation');
  const tStep = W_GB / BW;
  const fmt = (ms: number) => (ms < 10 ? ms.toFixed(1) : ms.toFixed(0)) + ' ms';

  type Scene = 'process' | 'overlap' | 'future' | 'map';
  interface Step { caption: string; captionZh: string; scene: Scene; v?: number }
  const steps: Step[] = [
    { scene: 'process', v: 0, caption: `Inside process 2. Ch. 6 Step 9's choice of batch is one of this loop's six stages. Around them: two lists of <b>Req</b> objects, the page pool and radix tree (Ch. 7 Step 4, Ch. 8 Step 4), and a model runner that owns the GPU.`, captionZh: `进程 2 内部。Ch. 6 Step 9 选 batch 是这个循环六个 stage 之一。周围：<b>Req</b> 双列表、page 池、radix tree（Ch. 7 Step 4、Ch. 8 Step 4）和持有 GPU 的 model runner。` },
    { scene: 'process', v: 1, caption: `Top of the loop: drain the inbox. Each message becomes a Req, with its ids and sampling params, and takes a place at the end of the waiting list. Ours arrives now.`, captionZh: `循环开头：清空 inbox。每条消息变成一个 Req，带上它的 id 和采样参数，排到 waiting 列表末尾。我们的 request 此刻到达。` },
    { scene: 'process', v: 2, caption: `Ch. 6 Step 9's decision. Matched against the tree, 3 of our 5 tokens are cached. Is there room for the other 2, and for the answer to come (Ch. 7 Step 7)? Yes, so it joins this step's prefill batch.`, captionZh: `Ch. 6 Step 9 的决策。对照 radix tree，5 个 token 里 3 个已缓存。其余 2 个和后续回答有空间吗（Ch. 7 Step 7）？有，于是加入本步 prefill batch。` },
    { scene: 'process', v: 3, caption: `A batch becomes tensors: every token id in one flat array, each request's positions, and each request's page table so attention can find its cache. Its 2 pages were taken as the batch was chosen.`, captionZh: `batch 变张量：全部 token id 一个扁平数组、各 request 的位置、各 request 的 page table（供 attention 找 cache）。它的 2 个 page 在选 batch 时已取。` },
    { scene: 'process', v: 4, caption: `The model runner runs chapters 2 to 4: embeddings, 32 layers of attention over the paged cache and MLP, logits for the last position of every request. New k and v land in the pages just allocated.`, captionZh: `model runner 跑第 2–4 章的内容：embedding、32 层在分页 cache 上的 attention 和 MLP、每个 request 最后位置的 logits。新的 k、v 写入刚分配的 page。` },
    { scene: 'process', v: 5, caption: `Logits become one token per request: temperature, top-p, penalties, whatever each asked for. Our Req's is 12366, " Paris".`, captionZh: `logits 变成每个 request 一个 token：temperature、top-p、惩罚项，各取所需。我们的 Req 得到 12366，" Paris"。` },
    { scene: 'process', v: 6, caption: `Bookkeeping. Each Req appends its id and checks itself: EOS? max tokens? Finished Reqs hand their pages to the tree. One message with every new token goes to the detokenizer. Back to the top.`, captionZh: `收尾记账。每个 Req 追加自己的 id 并自查：EOS？到 max tokens 了？完成的 Req 把 page 交给 radix tree。一条带全部新 token 的消息发给 detokenizer。回到循环开头。` },
    { scene: 'process', v: 7, caption: `Where each stage runs. Planning and processing are Python on the CPU; forward and sampling run on the GPU. In this loop they take turns: the GPU idles while the CPU works, and the CPU waits for the GPU's tokens.`, captionZh: `各 stage 在哪运行。计划和结果处理是 CPU 上的 Python；前向和采样在 GPU 上。这个循环里它们轮流来：CPU 干活时 GPU 闲置，CPU 等 GPU 的 token。` },
    { scene: 'overlap', caption: `<b>Overlap scheduling.</b> Kernel launches return at once: right after launching step t, the CPU plans t+1, then processes t's results while the GPU runs t+1. SGLang's event_loop_overlap; vLLM v1 calls it async scheduling.`, captionZh: `<b>重叠调度。</b>kernel 启动立即返回：发起第 t 步后，CPU 马上计划 t+1，再在 GPU 跑 t+1 时处理 t 的结果。SGLang 叫 event_loop_overlap；vLLM v1 叫 async scheduling。` },
    { scene: 'future', caption: `The catch: step t+1's decode input is step t's sampled token, and the CPU planned t+1 before that token existed. So the plan carries a placeholder, a slot in a GPU buffer. Step t's sampler fills it; step t+1's first kernel reads it. No round trip.`, captionZh: `难点：t+1 的 decode 输入是第 t 步采出的 token，但 CPU 在它出现前就计划了 t+1。计划便带一个占位符：GPU buffer 的一个槽位。第 t 步 sampler 填入，t+1 第一个 kernel 读取。无需往返。` },
    { scene: 'map', caption: `The whole site as a file tree. Every chapter is a module in sglang/srt, and the loop you just watched is scheduler.py. Next: how the model runner launches a thousand kernels as one.`, captionZh: `整个网站是一棵文件树。每一章都是 sglang/srt 里的一个模块，刚看的循环就是 scheduler.py。接下来：model runner 如何把上千个 kernel 一次发起。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const v = $derived(cur.v ?? 0);
  const W = 720, H = 400;

  // ---- process layout --------------------------------------------------------------------------------
  const L = { x: 24, w: 180 };
  const M = { x: 228, w: 250 };
  const R = { x: 502, w: 194 };
  const pipe = [
    { k: 'recv', t: 'ingest_requests', s: 'inbox → Req objects', sz: 'inbox → Req 对象', y: 64 },
    { k: 'schedule', t: 'get_next_batch_to_run', s: 'prefill or decode batch', sz: 'prefill 或 decode batch', y: 118 },
    { k: 'prepare', t: 'ScheduleBatch → ForwardBatch', s: 'ids · positions · pages', sz: 'ids · 位置 · pages', y: 172 },
    { k: 'forward', t: 'ModelRunner.forward', s: 'embed → 32 layers → logits', sz: 'embed → 32 层 → logits', y: 226 },
    { k: 'sample', t: 'Sampler', s: 'logits → tokens', sz: 'logits → token', y: 280 },
    { k: 'results', t: 'process_batch_result', s: 'append · finish · send', sz: '追加 · 结束 · 发送', y: 334 },
  ];
  const BOXH = 44;
  const hot = (i: number) => v === i + 1;
  // where each stage runs (step 8), in the overlap step's colours: plan, run on the GPU, results
  const GROUPS = [
    { from: 0, to: 2, c: 'var(--accent)', title: 'plan · CPU', titleZh: '计划 · CPU', lines: ['ingest, choose, build tensors', 'the GPU has nothing to run yet'], linesZh: ['接收、挑选、组张量', 'GPU 还没有可跑的任务'] },
    { from: 3, to: 4, c: 'var(--gen)', title: 'run · GPU', titleZh: '运行 · GPU', lines: ['forward pass and sampling', 'the CPU waits for the tokens'], linesZh: ['前向传播和采样', 'CPU 在等 token'] },
    { from: 5, to: 5, c: '#0891b2', title: 'process · CPU', titleZh: '处理 · CPU', lines: ['append, finish, send', 'the GPU sits idle again'], linesZh: ['追加、结束、发送', 'GPU 再次闲置'] },
  ];
  const groupOf = (i: number) => GROUPS.find((g) => i >= g.from && i <= g.to)!;
  // side panels lit up by each stage
  const lit = (name: string) => ({
    inbox: v === 1, waiting: v === 1 || v === 2, running: v === 2 || v === 6, outbox: v === 6,
    tree: v === 2 || v === 6, pool: v === 2 || v === 3 || v === 4, gpu: v === 4 || v === 5,
  } as Record<string, boolean>)[name];
  // where our Req sits at each stage
  const reqPos = $derived([
    { x: -100, y: -100 },                    // rest: not yet arrived
    { x: L.x + 12, y: 150 },                 // in the waiting list (108 wide)
    { x: M.x + M.w - 116, y: 118 + 24 },     // inside the schedule box, as this step's prefill batch
    { x: M.x + M.w - 116, y: 172 + 24 },
    { x: R.x + 80, y: 336 },                 // on the GPU
    { x: M.x + M.w - 116, y: 280 + 24 },
    { x: L.x + 12, y: 276 },                 // in the running list
  ][v]);
  const reqTag = $derived(['', 'Req a1f3', 'prefill batch', 'ids · pos · pages', t('forward', '前向'), t('sample → 12366', '采样 → 12366'), 'Req a1f3 · +1 token'][v]);

  // ---- overlap timeline ------------------------------------------------------------------------------
  const OL = { x: 150, pxPerMs: 26 };
  const badgeW = (s: string) => 18 + [...s].reduce((a, c) => a + (c === ' ' ? 3 : c === '·' ? 4 : 6.2), 0);
  const gpuMs = tStep - 0.3;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="The engine, step {step + 1}">
      <defs>
        {#each [['grey', '#b8b4aa'], ['accent', '#2f5bea'], ['gen', '#d97706']] as [n, c]}
          <marker id="en-{n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
          </marker>
        {/each}
      </defs>

      {#if cur.scene === 'process'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('process 2 · the scheduler · one step of the loop', '进程 2 · scheduler · 循环的一步')}{v === 7 ? t(' · where each stage runs', ' · 各 stage 在哪运行') : v > 0 ? ` · ${pipe[v - 1].t}` : ''}</text>

          {#if v === 7}
          <!-- left: what runs where, and who waits -->
          {#each GROUPS as g, k}
            {@const top = pipe[g.from].y + 4}
            {@const bot = pipe[g.to].y + BOXH - 4}
            {@const mid = (top + bot) / 2}
            <g in:fade={{ delay: 200 + k * 250 }}>
              <path d="M 222 {top} H 214 V {bot} H 222" fill="none" stroke={g.c} stroke-width="1.5" />
              <text x="202" y={mid - 10} text-anchor="end" class="tag strong" style:fill={g.c}>{t(g.title, g.titleZh)}</text>
              <text x="202" y={mid + 6} text-anchor="end" class="tag">{t(g.lines[0], g.linesZh[0])}</text>
              <text x="202" y={mid + 20} text-anchor="end" class="tag">{t(g.lines[1], g.linesZh[1])}</text>
            </g>
          {/each}
          {:else}
          <!-- left: lists and wires -->
          <rect x={L.x} y="64" width={L.w} height="30" rx="8" fill="#fbfaf7" stroke={lit('inbox') ? 'var(--accent)' : 'var(--line)'} stroke-width={lit('inbox') ? 2 : 1} />
          <text x={L.x + 10} y="83" class="tag strong">inbox · zmq PULL</text>
          {#if v === 1}
            <rect x={L.x + 120} y="72" width="44" height="14" rx="3" fill="var(--accent)" in:fly={{ x: -30, duration: 300 }} />
            <text x={L.x + 142} y="82" text-anchor="middle" class="tiny">{t('msg', '消息')}</text>
          {/if}

          <rect x={L.x} y="104" width={L.w} height="88" rx="8" fill="#fbfaf7" stroke={lit('waiting') ? 'var(--accent)' : 'var(--line)'} stroke-width={lit('waiting') ? 2 : 1} />
          <text x={L.x + 10} y="122" class="tag strong">waiting_queue</text>
          <text x={L.x + 10} y="136" class="tag">{t('Reqs not yet prefilled · policy order', '尚未 prefill 的 Req · 按策略排序')}</text>
          {#if v === 0}<text x={L.x + 12} y="160" class="tag muted">{t('empty', '空')}</text>{/if}

          <rect x={L.x} y="202" width={L.w} height="100" rx="8" fill="#fbfaf7" stroke={lit('running') ? 'var(--gen)' : 'var(--line)'} stroke-width={lit('running') ? 2 : 1} />
          <text x={L.x + 10} y="220" class="tag strong">running_batch</text>
          <text x={L.x + 10} y="234" class="tag">{t('mid-answer · one token per step', '回答中 · 每步一个 token')}</text>
          {#each [0, 1] as i}
            <rect x={L.x + 12} y={244 + i * 16} width="120" height="12" rx="3" fill="white" stroke="var(--gen)" stroke-opacity="0.7" />
            <text x={L.x + 18} y={253 + i * 16} class="tiny dark">{t('Req · decoding', 'Req · decode 中')}</text>
          {/each}

          <rect x={L.x} y="312" width={L.w} height="30" rx="8" fill="#fbfaf7" stroke={lit('outbox') ? '#0891b2' : 'var(--line)'} stroke-width={lit('outbox') ? 2 : 1} />
          <text x={L.x + 10} y="331" class="tag strong">outbox · zmq PUSH</text>
          {#if v === 6}
            <rect x={L.x + 120} y="320" width="44" height="14" rx="3" fill="#0891b2" in:fly={{ x: 30, duration: 300 }} />
            <text x={L.x + 142} y="330" text-anchor="middle" class="tiny">ids</text>
          {/if}
          {/if}

          <!-- middle: the pipeline -->
          {#each pipe as p, i}
            <rect x={M.x} y={p.y} width={M.w} height={BOXH} rx="8" fill={hot(i) ? 'white' : '#fbfaf7'} stroke={v === 7 ? groupOf(i).c : hot(i) ? 'var(--fg)' : 'var(--line)'} stroke-width={hot(i) || v === 7 ? 2 : 1} />
            <text x={M.x + 12} y={p.y + 18} class="mono" font-weight={hot(i) ? 700 : 400}>{p.t}</text>
            <text x={M.x + 12} y={p.y + 34} class="tag">{t(p.s, p.sz)}{v === 0 && p.k === 'schedule' ? ' · Ch. 6 Step 9' : ''}</text>
            {#if v === 7}
              <g in:fade={{ delay: 100 + i * 80 }}>
                <rect x={M.x + M.w - 42} y={p.y + 14} width="32" height="16" rx="4" fill={groupOf(i).c} />
                <text x={M.x + M.w - 26} y={p.y + 25} text-anchor="middle" class="tiny">{i === 3 || i === 4 ? 'GPU' : 'CPU'}</text>
              </g>
            {/if}
            {#if i < pipe.length - 1}
              <path d="M {M.x + 40} {p.y + BOXH} V {pipe[i + 1].y - 1}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#en-grey)" />
            {/if}
          {/each}
          <path d="M {M.x + M.w} 356 H {M.x + M.w + 12} V 86 H {M.x + M.w + 1}" fill="none" stroke="#b8b4aa" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#en-grey)" />

          <!-- right: memory and GPU (faded on step 8, where blue means the CPU's plan) -->
          <g opacity={v === 7 ? 0.3 : 1} style="transition: opacity 250ms">
          <rect x={R.x} y="64" width={R.w} height="90" rx="8" fill="#fbfaf7" stroke={lit('tree') ? 'var(--accent)' : 'var(--line)'} stroke-width={lit('tree') ? 2 : 1} />
          <text x={R.x + 10} y="82" class="tag strong">RadixCache</text>
          <text x={R.x + 10} y="96" class="tag">{t('shared prefixes · Ch. 8 Step 4', '共享前缀 · Ch. 8 Step 4')}</text>
          <circle cx={R.x + 62} cy="118" r="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <circle cx={R.x + 37} cy="140" r="6" fill="var(--accent-soft)" stroke="var(--accent)" /><circle cx={R.x + 87} cy="140" r="6" fill="var(--accent-soft)" stroke="var(--accent)" />
          <line x1={R.x + 58} y1="123" x2={R.x + 41} y2="135" stroke="var(--faint)" /><line x1={R.x + 66} y1="123" x2={R.x + 83} y2="135" stroke="var(--faint)" />
          {#if v === 2}
            <g in:fade>
              <text x={R.x + 108} y="112" class="tag" fill="var(--accent)">{t('match 3 of 5', '匹配 3 / 5')}</text>
              <text x={R.x + 108} y="126" class="tag" fill="var(--accent)">{t('→ 2 to prefill', '→ 2 个待 prefill')}</text>
              <text x={R.x + 108} y="140" class="tag" fill="var(--accent)">{t('→ 2 pages', '→ 2 个 page')}</text>
            </g>
          {/if}
          {#if v === 6}
            <g in:fade>
              <text x={R.x + 108} y="118" class="tag" fill="var(--accent)">{t("finished Reqs'", '完成的 Req')}</text>
              <text x={R.x + 108} y="132" class="tag" fill="var(--accent)">{t('pages stay here', 'page 留在这里')}</text>
            </g>
          {/if}

          <rect x={R.x} y="164" width={R.w} height="90" rx="8" fill="#fbfaf7" stroke={lit('pool') ? '#0891b2' : 'var(--line)'} stroke-width={lit('pool') ? 2 : 1} />
          <text x={R.x + 10} y="182" class="tag strong">{t('KV pool', 'KV 池')}</text>
          <text x={R.x + 10} y="196" class="tag">{t('pages · Ch. 7 Step 4', 'page · Ch. 7 Step 4')}</text>
          {#each Array(24) as _, i}
            {@const own = [1, 3, 4, 6, 9, 10, 13, 15, 18, 20, 21].includes(i)}
            {@const mine = v >= 2 && [7, 12].includes(i)}
            <rect x={R.x + 10 + (i % 12) * 14} y={206 + Math.floor(i / 12) * 14} width="11" height="11" rx="2" fill={mine ? 'var(--accent)' : own ? '#0891b2' : 'white'} stroke={own || mine ? 'none' : 'var(--line)'} opacity={own ? 0.5 : 1} />
          {/each}
          {#if v === 2}<text x={R.x + 10} y="246" class="tag" fill="var(--accent)" in:fade>{t('room ✓ · 2 pages taken now', '有空间 ✓ · 已取 2 个 page')}</text>{/if}
          {#if v === 3}<text x={R.x + 10} y="246" class="tag" fill="var(--accent)" in:fade>{t('its 2 pages, in its page table', '它的 2 个 page，在 page table 里')}</text>{/if}
          {#if v === 4}<text x={R.x + 10} y="246" class="tag" fill="#0891b2" in:fade>{t('read all pages · write 2 new', '读全部 page · 写 2 个新的')}</text>{/if}

          <rect x={R.x} y="264" width={R.w} height="114" rx="8" fill="#fbfaf7" stroke={lit('gpu') ? 'var(--gen)' : 'var(--line)'} stroke-width={lit('gpu') ? 2 : 1} />
          <text x={R.x + 10} y="282" class="tag strong">GPU · ModelRunner</text>
          <text x={R.x + 10} y="296" class="tag">{t('weights + kernels · chapters 2–4', '权重 + kernel · 第 2–4 章')}</text>
          <rect x={R.x + 10} y="306" width={R.w - 20} height="20" rx="4" fill="var(--accent)" opacity="0.9" />
          <text x={R.x + R.w / 2} y="320" text-anchor="middle" class="steplabel">{t(`forward pass · ${fmt(tStep)}`, `前向传播 · ${fmt(tStep)}`)}</text>
          {#if v === 4}<text x={R.x + 10} y="362" class="tag" fill="var(--gen)" in:fade>{t('2 new tokens (+ other prefills) in', '写入 2 个新 token（及其他 prefill）')}</text>{/if}
          {#if v === 5}<text x={R.x + 10} y="346" class="tag" fill="var(--gen)" in:fade>{t('argmax / sample per request', '每个 request 做 argmax / 采样')}</text>{/if}
          {#if v === 5}<text x={R.x + 10} y="362" class="tag" in:fade>{t('our Req: 12366 → " Paris"', '我们的 Req：12366 → " Paris"')}</text>{/if}
          </g>

          <!-- our Req, travelling -->
          {#if v >= 1 && v <= 6}
            <g class="req" style:transform="translate({reqPos.x}px, {reqPos.y}px)">
              <rect width="108" height="14" rx="4" fill="var(--eos)" />
              <text x="54" y="10" text-anchor="middle" class="tiny">{reqTag}</text>
            </g>
          {/if}
          {#if v === 6}
            <text x={L.x + 126} y="286" class="tag" fill="var(--eos)" in:fade>{t('← joined', '← 已加入')}</text>
          {/if}
        </g>
      {/if}

      {#if cur.scene === 'overlap'}
        {@const plan = 1.5}
        {@const res = 0.8}
        {@const g = gpuMs}
        <g transition:fade={{ duration: 250 }}>
          <!-- row 1: take turns -->
          <text x="16" y="56" class="rowlabel">{t('without overlap · plan, run, wait, process, repeat', '无重叠 · 计划、运行、等待、处理，循环')}</text>
          <text x={OL.x - 10} y="88" text-anchor="end" class="rowlabel">CPU · scheduler</text>
          <text x={OL.x - 10} y="128" text-anchor="end" class="rowlabel">GPU</text>
          {#each Array(3) as _, ti}
            {@const start = ti * (plan + g + res)}
            <rect x={OL.x + start * OL.pxPerMs} y="70" width={plan * OL.pxPerMs - 1} height="28" rx="3" fill="var(--accent)" opacity="0.85" in:fade={{ delay: ti * 120 }} />
            <text x={OL.x + (start + plan / 2) * OL.pxPerMs} y="88" text-anchor="middle" class="steplabel">{t(`plan ${ti + 1}`, `计划 ${ti + 1}`)}</text>
            <rect x={OL.x + (start + plan) * OL.pxPerMs} y="110" width={g * OL.pxPerMs - 1} height="28" rx="3" fill="var(--gen)" opacity="0.85" in:fade={{ delay: ti * 120 + 60 }} />
            <text x={OL.x + (start + plan + g / 2) * OL.pxPerMs} y="128" text-anchor="middle" class="steplabel">{t(`step ${ti + 1}`, `第 ${ti + 1} 步`)}</text>
            <rect x={OL.x + (start + plan + g) * OL.pxPerMs} y="70" width={res * OL.pxPerMs - 1} height="28" rx="3" fill="#0891b2" opacity="0.9" in:fade={{ delay: ti * 120 + 90 }} />
            <text x={OL.x + (start + plan / 2) * OL.pxPerMs} y="128" text-anchor="middle" class="tag">{t('idle', '闲置')}</text>
          {/each}
          <line x1={OL.x} y1="150" x2={OL.x + 21 * OL.pxPerMs} y2="150" stroke="var(--line)" />
          {#each [0, 5, 10, 15, 20] as ms}<text x={OL.x + ms * OL.pxPerMs} y="164" text-anchor="middle" class="tag">{ms} ms</text>{/each}

          <!-- row 2: overlap -->
          <text x="16" y="200" class="rowlabel">{t("with overlap · launch t, plan t+1 right away, process t's results while the GPU runs t+1", '有重叠 · 发起 t，立刻计划 t+1，GPU 跑 t+1 时处理 t 的结果')}</text>
          <text x={OL.x - 10} y="232" text-anchor="end" class="rowlabel">CPU · scheduler</text>
          <text x={OL.x - 10} y="272" text-anchor="end" class="rowlabel">GPU</text>
          {#each Array(3) as _, ti}
            {@const gs = ti * g}
            {@const planStart = ti === 0 ? 0.1 : gs + 0.1 + res + 0.1}
            <rect x={OL.x + gs * OL.pxPerMs} y="254" width={g * OL.pxPerMs - 1} height="28" rx="3" fill="var(--gen)" opacity="0.85" in:fade={{ delay: 500 + ti * 120 }} />
            <text x={OL.x + (gs + g / 2) * OL.pxPerMs} y="272" text-anchor="middle" class="steplabel">{t(`step ${ti + 1}`, `第 ${ti + 1} 步`)}</text>
            {#if ti >= 1}
              <rect x={OL.x + (gs + 0.1) * OL.pxPerMs} y="214" width={res * OL.pxPerMs - 1} height="28" rx="3" fill="#0891b2" opacity="0.9" in:fade={{ delay: 500 + ti * 120 + 40 }} />
              <text x={OL.x + (gs + 0.1 + res / 2) * OL.pxPerMs} y="232" text-anchor="middle" class="steplabel">r{ti}</text>
            {/if}
            <rect x={OL.x + planStart * OL.pxPerMs} y="214" width={plan * OL.pxPerMs - 1} height="28" rx="3" fill="var(--accent)" opacity="0.85" in:fade={{ delay: 500 + ti * 120 + 80 }} />
            <text x={OL.x + (planStart + plan / 2) * OL.pxPerMs} y="232" text-anchor="middle" class="steplabel">{t(`plan ${ti + 2}`, `计划 ${ti + 2}`)}</text>
          {/each}
          <line x1={OL.x} y1="294" x2={OL.x + 21 * OL.pxPerMs} y2="294" stroke="var(--line)" />
          {#each [0, 5, 10, 15, 20] as ms}<text x={OL.x + ms * OL.pxPerMs} y="308" text-anchor="middle" class="tag">{ms} ms</text>{/each}

          <rect x={OL.x} y="318" width="12" height="12" rx="2" fill="var(--accent)" opacity="0.85" /><text x={OL.x + 18} y="328" class="tag">{t('plan: ingest · schedule · tensors · launch kernels', '计划：接收 · 调度 · 张量 · 发起 kernel')}</text>
          <rect x={OL.x + 290} y="318" width="12" height="12" rx="2" fill="#0891b2" opacity="0.9" /><text x={OL.x + 308} y="328" class="tag">{t('results: append tokens · finish Reqs · send', '结果：追加 token · 结束 Req · 发送')}</text>
          <g in:fade={{ delay: 1400 }}>
            <text x="16" y="348" class="legend">{t(`the GPU lane is solid: ${fmt(plan + res)} of Python per step comes off the critical path,`, `GPU 泳道连续不停：每步 ${fmt(plan + res)} 的 Python 时间移出关键路径，`)}</text>
            <text x="16" y="366" class="legend">{t(`a step of ${fmt(plan + tStep + res)} becomes ${fmt(tStep)}: about ${Math.round(((plan + tStep + res) / tStep - 1) * 100)}% more tokens per second on the same GPU`, `一步从 ${fmt(plan + tStep + res)} 变为 ${fmt(tStep)}：同一 GPU 上每秒 token 数约多 ${Math.round(((plan + tStep + res) / tStep - 1) * 100)}%`)}</text>
            <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`the CPU times are illustrative · launching a step's kernels inside the plan assumes chapter ${CH_CUDA}'s CUDA graphs`, `CPU 时间为示意 · 在计划内发起一步的 kernel，假设已用第 ${CH_CUDA} 章的 CUDA graphs`)}</text>
          </g>
        </g>
      {/if}

      {#if cur.scene === 'future'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="52" class="rowlabel">{t('step t+1 is planned before step t has sampled · the placeholder', '第 t 步还没采样，就计划了 t+1 · 占位符')}</text>
          {#each [
            { x: 30, y: 90, w: 200, h: 96, c: 'var(--accent)', title: 'CPU · plan step t+1', titleZh: 'CPU · 计划第 t+1 步', lines: ['decode input for our Req:', 'not a token id yet, but', 'buf[7]'], linesZh: ['我们 Req 的 decode 输入：', '还不是 token id，而是', 'buf[7]'] },
            { x: 260, y: 90, w: 200, h: 96, c: 'var(--gen)', title: 'GPU · step t · sampler', titleZh: 'GPU · 第 t 步 · sampler', lines: ['samples 12366 for our Req', 'writes it straight into', 'buf[7] = 12366'], linesZh: ['为我们的 Req 采出 12366', '直接写入', 'buf[7] = 12366'] },
            { x: 490, y: 90, w: 200, h: 96, c: 'var(--gen)', title: 'GPU · step t+1 · first kernel', titleZh: 'GPU · t+1 步 · 首个 kernel', lines: ['reads buf[7] → 12366', 'looks up its embedding', 'the step runs as normal'], linesZh: ['读 buf[7] → 12366', '查它的 embedding', '该步照常运行'] },
          ] as b, i}
            <g in:fly={{ y: 8, delay: i * 350, duration: 300 }}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="12" fill="#fbfaf7" stroke={b.c} />
              <text x={b.x + 14} y={b.y + 22} class="slab strong small">{t(b.title, b.titleZh)}</text>
              {#each b.lines as l, k}<text x={b.x + 14} y={b.y + 44 + k * 17} class={k === 2 ? 'mono' : 'tag'}>{t(l, b.linesZh[k])}</text>{/each}
            </g>
          {/each}
          <path d="M 232 138 H 254" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#en-grey)" />
          <path d="M 462 138 H 484" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#en-grey)" />
          <!-- the buffer -->
          <g in:fade={{ delay: 1100 }}>
            <text x="30" y="226" class="rowlabel">{t('buf · a small buffer in GPU memory, one slot per request', 'buf · GPU 显存里的小缓冲区，每个 request 一个槽位')}</text>
            {#each Array(12) as _, k}
              <rect x={30 + k * 40} y="236" width="36" height="26" rx="4" fill={k === 7 ? 'var(--gen-soft)' : 'white'} stroke={k === 7 ? 'var(--gen)' : 'var(--line)'} />
              <text x={48 + k * 40} y="253" text-anchor="middle" class="mono">{k === 7 ? '12366' : k < 7 ? '·' : ''}</text>
              <text x={48 + k * 40} y="276" text-anchor="middle" class="tag">{k}</text>
            {/each}
          </g>
          <g in:fade={{ delay: 1700 }}>
            <text x="20" y="316" class="pt">·</text><text x="30" y="316" class="legend">{t("the CPU never waits for the token and never copies it back; each request's slot is the same every step", 'CPU 从不等 token，也不把它拷回；每个 request 的槽位每步都相同')}</text>
            <text x="20" y="338" class="pt">·</text><text x="30" y="338" class="legend">{t('only the bookkeeping waits for a copy: appending the id to the Req and checking for EOS,', '只有记账在等拷贝：把 id 追加到 Req、检查 EOS，')}</text>
            <text x="30" y="356" class="legend">{t('and that happens in the results phase, one step behind the GPU', '这发生在结果处理阶段，比 GPU 晚一步')}</text>
            <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('SGLang: buf is', 'SGLang：buf 是')} <tspan class="mono">FutureMap.output_tokens_buf</tspan> · {t('read by', '由')} <tspan class="mono">resolve_forward_inputs</tspan> {t('(managers/overlap_utils.py)', '读取（managers/overlap_utils.py）')}</text>
          </g>
        </g>
      {/if}

      {#if cur.scene === 'map'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">python/sglang/srt/</text>
          {#each [
            ['entrypoints/http_server.py', 'the HTTP server · process 1', '9', 'HTTP 服务器 · 进程 1'],
            ['managers/tokenizer_manager.py', 'tokenize, own the streams', '9', 'tokenize，持有流'],
            ['managers/scheduler.py', 'the loop you just watched', '6 · 9 · 10', '刚看过的循环'],
            ['managers/schedule_batch.py', 'Req and ScheduleBatch', '10', 'Req 和 ScheduleBatch'],
            ['managers/schedule_policy.py', 'FCFS, LPM, the chunk cap', '6 · 8', 'FCFS、LPM、chunk 上限'],
            ['managers/detokenizer_manager.py', 'ids → text · process 3', '9', 'ids → 文本 · 进程 3'],
            ['mem_cache/memory_pool.py', 'KV pages and page tables', '7', 'KV page 和 page table'],
            ['mem_cache/radix_cache.py', 'the tree', '8', 'radix tree'],
            ['model_executor/model_runner.py', 'the forward pass', '4 · 10', '前向传播'],
            ['model_executor/runner/decode_cuda_graph_runner.py', 'a thousand kernels as one', String(CH_CUDA), '上千 kernel 一次发起'],
            ['layers/attention/', 'paged attention kernels', '2 · 3', '分页 attention kernel'],
            ['layers/sampler.py', 'logits → tokens', '10', 'logits → token'],
            ['disaggregation/', 'prefill and decode apart', String(CH_DISAGG), 'prefill 与 decode 分离'],
          ] as [f, d, ch, dz], i}
            <g in:fly={{ x: -6, delay: i * 60, duration: 200 }}>
              <text x="32" y={68 + i * 23} class="mono">{f}</text>
              <text x="372" y={68 + i * 23} class="tag">{t(d, dz)}</text>
              <rect x="600" y={56 + i * 23} width={badgeW('ch ' + ch)} height="16" rx="8" fill="var(--accent-soft)" />
              <text x="609" y={68 + i * 23} class="tag strong" fill="var(--accent)">ch {ch}</text>
            </g>
          {/each}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade={{ delay: 1000 }}>{t("every chapter so far is one file. The rest of the site is what those files do when the model doesn't fit on one GPU, or one machine.", '到目前为止每章都是一个文件。其余部分讲的是：模型放不进一块 GPU、一台机器时，这些文件怎么办。')}</text>
        </g>
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .mono { font-family: var(--mono); font-size: 10.5px; fill: var(--fg); }
  .tiny { font-size: 8.5px; fill: white; font-weight: 600; }
  .tag.muted { fill: var(--faint); }
  .tiny.dark { fill: var(--fg); font-weight: 400; font-family: var(--mono); }
  .slab.strong { font-weight: 650; font-size: 14px; }
  .slab.strong.small { font-size: 12px; }
  .req { transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1); }
</style>
