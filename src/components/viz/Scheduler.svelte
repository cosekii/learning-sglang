<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import { chapterNumber as chNum, chapters, type NavLink } from '../../chapters';
  import { W_GB, BW, TFLOPS as FLOPS, GFLOP_PER_TOKEN as GFLOP } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const CH_DISAGG = chNum('28-disaggregation'), CH_CUDA = chNum('11-cuda-graphs');

  // ---- Numbers, same as chapters 4 and 5: Llama-3-8B bf16 on one H100 -------------------------
  const tMem = W_GB / BW;
  const tComp = (n: number) => (n * GFLOP) / FLOPS;
  const stepMs = (n: number) => Math.max(tMem, tComp(n));
  const fmt = (ms: number) => (ms < 10 ? ms.toFixed(1) : ms.toFixed(0)) + ' ms';
  const BALANCE = Math.round(tMem / tComp(1) / 50) * 50;      // ≈300 tokens per step
  const DECODERS = 64, PROMPT = 2000, CHUNK = 512;
  const MIX_CHUNK = BALANCE - DECODERS;                          // what fits beside the decodes without stretching the step
  const WAITING = [1200, 2600, 800];                             // three prompts in the queue for the "batched" step
  const waitingTotal = WAITING.reduce((a, b) => a + b, 0);

  // ---- Timelines: 3 decode steps, then the newcomer(s), then 3 more --------------------------------
  type Mode = 'prefill-first' | 'batched' | 'chunked' | 'mixed';
  interface Seg { ms: number; decode: boolean; prefill: number; first?: boolean; label?: string }
  function timeline(mode: Mode): Seg[] {
    const plain = (): Seg => ({ ms: tMem, decode: true, prefill: 0 });
    let mid: Seg[] = [];
    if (mode === 'prefill-first') mid = [{ ms: stepMs(PROMPT), decode: false, prefill: PROMPT, first: true, label: `prefill · ${PROMPT.toLocaleString()} tokens` }];
    else if (mode === 'batched') mid = [{ ms: stepMs(waitingTotal), decode: false, prefill: waitingTotal, first: true, label: `prefill · 3 prompts · ${waitingTotal.toLocaleString()} tokens` }];
    else if (mode === 'chunked') {
      const n = Math.ceil(PROMPT / CHUNK);
      for (let i = 0; i < n; i++) {
        const c = i < n - 1 ? CHUNK : PROMPT - CHUNK * (n - 1);
        mid.push({ ms: stepMs(c), decode: false, prefill: c, first: i === n - 1, label: String(c) });
        if (i < n - 1) mid.push(plain());
      }
    } else {
      const n = Math.ceil(PROMPT / MIX_CHUNK);
      mid = Array.from({ length: n }, (_, i) => { const c = i < n - 1 ? MIX_CHUNK : PROMPT - MIX_CHUNK * (n - 1); return { ms: stepMs(DECODERS + c), decode: true, prefill: c, first: i === n - 1, label: String(c) }; });
    }
    return [plain(), plain(), plain(), ...mid, plain(), plain(), plain()];
  }
  function metrics(segs: Seg[]) {
    let t = 0, last = 0, worst = 0, ws = 0, we = 0, ttft = 0, arrival = 0;
    segs.forEach((s, i) => {
      if (i === 3) arrival = t;
      t += s.ms;
      if (s.decode) { if (t - last > worst + 1e-6) { worst = t - last; ws = last; we = t; } last = t; }   // first occurrence of the worst gap
      if (s.first) ttft = t - arrival;
    });
    return { worst, ws, we, ttft, total: t, arrival };
  }
  const TL = { x: 104, y: 110, rowH: 26, gapY: 58, pxPerMs: 5.6 };
  const policies = $derived([
    { mode: 'prefill-first', name: t('prefill first', 'prefill 优先'), note: t('one prompt, its own step', '一个 prompt，单独一步') },
    { mode: 'chunked', name: t(`chunked, not mixed · ${CHUNK} per chunk`, `切 chunk，不混合 · 每 chunk ${CHUNK} token`), note: t('chunk step, decode step, chunk step…', 'chunk 步、decode 步、chunk 步…') },
    { mode: 'mixed', name: t(`chunked, mixed · ${MIX_CHUNK} per chunk`, `切 chunk，混合 · 每 chunk ${MIX_CHUNK} token`), note: t('every step carries a chunk and all the decodes', '每步带一个 chunk 和全部 decode') },
  ] as { mode: Mode; name: string; note: string }[]);

  // ---- Script ------------------------------------------------------------------------------------------
  type Scene = 'recap' | 'lists' | 'why' | 'timeline' | 'compare' | 'loop';
  interface Step { caption: string; captionZh: string; scene: Scene; mode?: Mode; foot?: string; footZh?: string }
  const CHUNK_FOOT = `SGLang chunks by default (8,192 tokens on an H100) but runs a prompt's chunks back to back · this takes --prefill-decode-interval 1`;
  const CHUNK_FOOT_ZH = `SGLang 默认切 chunk（H100 上 8,192 token），但一个 prompt 的 chunk 连着跑 · 这需要 --prefill-decode-interval 1`;
  const M = Object.fromEntries((['prefill-first', 'batched', 'chunked', 'mixed'] as Mode[]).map((m) => [m, metrics(timeline(m))])) as Record<Mode, ReturnType<typeof metrics>>;
  const steps: Step[] = [
    { scene: 'recap', caption: `Ch. 5 Step 9 ended here: a newcomer's prefill stretching everyone's decode step. SGLang doesn't run the two together by default. They split the work into two kinds of batch and pick one each step. That's the scheduler.`, captionZh: `Ch. 5 Step 9 的新来者拉长了 decode 步。SGLang 默认每步只选 prefill 或 decode batch。` },
    { scene: 'lists', caption: `The engine keeps two lists. <b>Waiting</b>: new requests that need a prefill. <b>Running</b>: conversations mid-answer that need one more token. Each step runs one batch, from one list.`, captionZh: `<b>Waiting</b> 放等待 prefill 的 request；<b>Running</b> 放继续出 token 的 request。每步只从一个列表组 batch。` },
    { scene: 'why', caption: `Same model, two shapes. Prefill: a few sequences, hundreds of tokens each, ragged. Decode: many sequences, one token each, every step. Two shapes, two batches; chapters ${CH_DISAGG} and ${CH_CUDA} show what that unlocks.`, captionZh: `两种形状：prefill 算几条长序列；decode 让许多序列每步各出一个 token。两种 batch 各有快路径，第 ${CH_DISAGG}、${CH_CUDA} 章再讲。` },
    { scene: 'timeline', mode: 'prefill-first', caption: `The default policy: if anyone is waiting, run a prefill batch first. The newcomer's first token comes in ${fmt(M['prefill-first'].ttft)}, but nobody decodes during those ${fmt(M['prefill-first'].ttft)}. An 8k-token prompt, the longest Llama-3-8B takes, freezes everyone for ${fmt(stepMs(8192))}.`, captionZh: `有人等待就先跑 prefill：新来者 ${fmt(M['prefill-first'].ttft)} 拿到首个 token，其他人暂停 decode。8k prompt 会把最长间隔拉到 ${fmt(stepMs(8192))}。` },
    { scene: 'timeline', mode: 'batched', caption: `It gets worse. Waiting prompts are batched into one prefill step, efficient for the GPU and awful for the decoders: three prompts, ${waitingTotal.toLocaleString()} tokens, one ${fmt(M.batched.ttft)} step. Every running conversation freezes for all of it.`, captionZh: `三个等待的 prompt 合成一个 ${waitingTotal.toLocaleString()} token 的 prefill 步。GPU 更省，但三个新来者都要等 ${fmt(M.batched.ttft)}；其他人的最长间隔达 ${fmt(M.batched.worst)}。` },
    { scene: 'timeline', mode: 'chunked', caption: `Cap the prefill batch. Split prompts into chunks and alternate: a chunk, a decode step, a chunk, a decode step. The freeze is now one chunk long, whatever the prompt's size. The first token arrives a little later.`, captionZh: `把 prompt 切成 ${CHUNK} token 的 chunk，并与 decode 步交替。最长间隔从 ${fmt(M['prefill-first'].worst)} 降到 ${fmt(M.chunked.worst)}，首个 token 从 ${fmt(M['prefill-first'].ttft)} 推迟到 ${fmt(M.chunked.ttft)}。`, foot: CHUNK_FOOT, footZh: CHUNK_FOOT_ZH },
    { scene: 'timeline', mode: 'mixed', caption: `Once prefill comes in chunks, a chunk is small enough to ride inside a decode step, on compute the decodes leave idle. No freeze at all, first token in ${fmt(M.mixed.ttft)}. Sarathi-Serve's idea, vLLM v1's default, SGLang's mixed-chunk option.`, captionZh: `chunk 搭进 decode 步，其他人每步都出 token。最长间隔由 ${fmt(tMem)} 增至 ${fmt(M.mixed.worst)}，新来者的首个 token 要 ${fmt(M.mixed.ttft)}。` },
    { scene: 'compare', caption: `Same GPU, same prompt, three policies. Prefill-first: fastest first token, worst freeze. Chunked: a bounded freeze. Mixed: none. The chunk size is the knob between the two clocks, and it belongs to the scheduler, not the model.`, captionZh: `同一 GPU、同一 prompt，三种策略并排。Mixed 每步出 token，间隔只多 ${fmt(M.mixed.worst - tMem)}。`, foot: CHUNK_FOOT, footZh: CHUNK_FOOT_ZH },
    { scene: 'loop', caption: `Each step the scheduler asks: anyone waiting, and room in the cache? If so, a prefill batch up to the chunk size, plus the decodes if mixing is on. If not, the decode batch. What counts as room is chapter ${chNum('07-kv-memory')}.`, captionZh: `waiting 有人时，要同时看槽位、KV 预留和本轮 token 预算。组不出 prefill 就跑 decode；算不完的 prompt 回 waiting 续块。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const mode = $derived(cur.mode ?? 'prefill-first');
  const segs = $derived(timeline(mode));
  const met = $derived(M[mode]);
  const segX = $derived(segs.reduce<number[]>((acc, s, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + segs[i - 1].ms); return acc; }, []));
  const W = 720, H = 400;
  let phone = $state(false);
  $effect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const phoneRecap = $derived(phone && step === 0 && $lang === 'zh');
  const phoneLists = $derived(phone && step === 1 && $lang === 'zh');
  const phoneWhy = $derived(phone && step === 2 && $lang === 'zh');
  const phoneTimeline = $derived(phone && step >= 3 && step <= 5 && $lang === 'zh');
  const phoneMixed = $derived(phone && step === 6 && $lang === 'zh');
  const phoneCompare = $derived(phone && step === 7 && $lang === 'zh');
  const phoneLoop = $derived(phone && step === 8 && $lang === 'zh');
  const phoneCustom = $derived(phoneRecap || phoneLists || phoneWhy || phoneTimeline || phoneMixed || phoneCompare || phoneLoop);
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox={phoneRecap ? '0 0 360 400' : phoneLists ? '0 0 360 570' : phoneWhy ? '0 0 360 500' : phoneTimeline ? (mode === 'chunked' ? '0 0 360 560' : '0 0 360 360') : phoneMixed ? '0 0 360 550' : phoneCompare ? '0 0 360 500' : phoneLoop ? '0 0 360 680' : `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="The scheduler, step {step + 1}" class:phone-custom={phoneCustom}>

      {#if phoneRecap}
        <text x="180" y="28" text-anchor="middle" class="ph-title">新来者让这一步变长</text>
        <text x="180" y="52" text-anchor="middle">Ch. 5 Step 9 的同一例</text>
        <text x="20" y="92">普通 decode 步</text>
        <rect x="20" y="106" width="66" height="30" rx="5" fill="var(--gen)" />
        <text x="102" y="126">每人出 token</text>
        <text x="20" y="174">新 prompt 挤进同一步</text>
        <rect x="20" y="188" width="244" height="30" rx="5" fill="var(--accent)" />
        <rect x="264" y="188" width="52" height="30" rx="5" fill="var(--gen)" />
        <text x="20" y="240" class="ph-strong">同一步变长，其他人也更晚出 token</text>
        <line x1="180" y1="258" x2="180" y2="280" stroke="var(--line)" stroke-width="2" />
        <polygon points="174,278 186,278 180,288" fill="var(--faint)" />
        <rect x="20" y="294" width="146" height="66" rx="9" fill="#fbfaf7" stroke="var(--accent)" />
        <text x="93" y="321" text-anchor="middle" class="ph-strong">prefill batch</text>
        <text x="93" y="345" text-anchor="middle">处理新 prompt</text>
        <rect x="194" y="294" width="146" height="66" rx="9" fill="#fbfaf7" stroke="var(--gen)" />
        <text x="267" y="321" text-anchor="middle" class="ph-strong">decode batch</text>
        <text x="267" y="345" text-anchor="middle">每人出 token</text>
        <text x="180" y="386" text-anchor="middle" class="ph-strong">SGLang 默认每步二选一</text>
      {/if}

      {#if phoneLists}
        <text x="180" y="28" text-anchor="middle" class="ph-title">两个列表，每步选一个</text>
        <rect x="16" y="52" width="328" height="174" rx="10" fill="#fbfaf7" stroke="var(--accent)" stroke-dasharray="5 4" />
        <text x="32" y="80" class="ph-strong">waiting · 等待 prefill</text>
        {#each [7, 8, 9] as req, i}
          <rect x={32 + i * 100} y="98" width="88" height="34" rx="6" fill="white" stroke="var(--line)" />
          <text x={76 + i * 100} y="120" text-anchor="middle">req {req}</text>
        {/each}
        <text x="32" y="158">新 prompt 或后续 prefill</text>
        <text x="32" y="184">蓝条：还要处理的 prompt token</text>
        <rect x="32" y="198" width="180" height="10" rx="3" fill="var(--accent)" />
        <rect x="16" y="246" width="328" height="174" rx="10" fill="#fbfaf7" stroke="var(--gen)" stroke-dasharray="5 4" />
        <text x="32" y="274" class="ph-strong">running · 继续出 token</text>
        {#each [1, 2, 3, 4, 5, 6] as req, i}
          <rect x={28 + i * 51} y="292" width="45" height="34" rx="6" fill="white" stroke="var(--line)" />
          <text x={50 + i * 51} y="314" text-anchor="middle">{req}</text>
        {/each}
        <text x="32" y="352">prompt 已处理，回答还没结束</text>
        <text x="32" y="378">每个 decode 步各出一个 token</text>
        <rect x="32" y="392" width="180" height="10" rx="3" fill="var(--gen)" />
        <!-- The batch labels already name their source lists; outer wires look like stray boxes on phones. -->
        <rect x="36" y="452" width="136" height="76" rx="9" fill="white" stroke="var(--accent)" />
        <text x="104" y="482" text-anchor="middle" class="ph-strong">prefill batch</text>
        <text x="104" y="508" text-anchor="middle">从 waiting 选</text>
        <rect x="188" y="452" width="136" height="76" rx="9" fill="white" stroke="var(--gen)" />
        <text x="256" y="482" text-anchor="middle" class="ph-strong">decode batch</text>
        <text x="256" y="508" text-anchor="middle">从 running 选</text>
        <text x="180" y="556" text-anchor="middle" class="ph-strong">本步二选一，跑完再回来选</text>
      {/if}

      {#if phoneWhy}
        <text x="180" y="28" text-anchor="middle" class="ph-title">同一模型，两种计算形状</text>
        <rect x="16" y="52" width="328" height="184" rx="10" fill="#fbfaf7" stroke="var(--accent)" />
        <text x="32" y="80" class="ph-strong">prefill batch · 处理 prompt</text>
        <text x="32" y="110">几条序列，每条几百 token</text>
        {#each [140, 220, 92] as w, i}
          <text x="32" y={140 + i * 24}>seq {i + 1}</text>
          <rect x="82" y={128 + i * 24} width={w} height="15" rx="3" fill="var(--accent)" opacity="0.85" />
        {/each}
        <text x="32" y="216">长短不齐 · 受计算限制 · 形状常变</text>
        <rect x="16" y="256" width="328" height="164" rx="10" fill="#fbfaf7" stroke="var(--gen)" />
        <text x="32" y="284" class="ph-strong">decode batch · 继续回答</text>
        <text x="32" y="314">许多序列，每步各出一个 token</text>
        {#each Array(8) as _, i}
          <rect x={32 + i * 36} y="332" width="24" height="24" rx="4" fill="var(--gen)" opacity="0.85" />
        {/each}
        <text x="32" y="386">受内存限制 · 只有 batch 大小变化</text>
        <text x="180" y="450" text-anchor="middle" class="ph-strong">两种形状 → 两个 batch → 两条快路径</text>
        <text x="180" y="478" text-anchor="middle">独立机器见第 {CH_DISAGG} 章；录制回放见第 {CH_CUDA} 章</text>
      {/if}

      {#if phoneTimeline}
        {@const mid = segs.filter((s) => s.prefill > 0)}
        {@const summaryY = 190 + (mid.length - 1) * 56}
        <text x="180" y="28" text-anchor="middle" class="ph-title">{mode === 'prefill-first' ? 'prefill 优先：先算新 prompt' : mode === 'batched' ? '三个 prompt 合成一个 prefill 步' : '切 chunk，并与 decode 交替'}</text>
        <text x="180" y="52" text-anchor="middle">64 个用户在 decode · {mode === 'batched' ? '三个 prompt 共 4,600 token' : '新 prompt 有 2,000 token'}</text>
        <rect x="16" y="66" width="16" height="12" rx="2" fill="var(--accent)" />
        <text x="40" y="77">prefill：其他人等待</text>
        <rect x="190" y="66" width="16" height="12" rx="2" fill="var(--gen)" />
        <text x="214" y="77">decode：出 token</text>
        <text x="140" y="110" text-anchor="middle" class="ph-strong">prefill token</text>
        <text x="272" y="110" text-anchor="middle" class="ph-strong">decode</text>
        {#each mid as s, i}
          {@const y = 126 + i * 56}
          <text x="16" y={y + 21}>{mode === 'chunked' ? `第 ${i + 1} 块` : mode === 'batched' ? '3 prompts' : '新 prompt'}</text>
          <rect x="80" y={y} width="120" height="32" rx="5" fill="var(--accent)" />
          <text x="140" y={y + 21} text-anchor="middle" class="ph-onblue">{mode === 'prefill-first' ? '2,000' : mode === 'batched' ? '4,600' : s.label}</text>
          <rect x="216" y={y} width="112" height="32" rx="5" fill="var(--gen)" opacity="0.85" />
          <text x="272" y={y + 21} text-anchor="middle">各出 token</text>
          {#if i === mid.length - 1}<circle cx="200" cy={y + 16} r="6" fill="white" stroke="var(--fg)" stroke-width="2" />{/if}
        {/each}
        <text x="180" y={summaryY} text-anchor="middle">白圈：{mode === 'batched' ? '新来者们' : '新来者'}的首个 token</text>
        <rect x="16" y={summaryY + 14} width="328" height={mode === 'chunked' ? 108 : 134} rx="9" fill="#fbfaf7" stroke="var(--line)" />
        <text x="30" y={summaryY + 42} class="ph-strong">其他人最长间隔 {fmt(met.worst)}</text>
        <text x="30" y={summaryY + 68}>= prefill {fmt(mid[0].ms)} + decode {fmt(tMem)}</text>
        <text x="30" y={summaryY + 94}>{mode === 'batched' ? '新来者们' : '新来者'}首个 token {fmt(met.ttft)}</text>
        {#if mode === 'prefill-first'}<text x="30" y={summaryY + 122}>8k prompt：最长间隔 {fmt(stepMs(8192))}</text>{/if}
        {#if mode === 'chunked'}
          <text x="180" y="520" text-anchor="middle">SGLang 默认连续跑同一 prompt 的 chunk</text>
          <text x="180" y="546" text-anchor="middle">交替需 --prefill-decode-interval 1</text>
        {/if}
      {/if}

      {#if phoneMixed}
        <text x="180" y="26" text-anchor="middle" class="ph-title">混合：每步都有 decode token</text>
        <text x="180" y="50" text-anchor="middle">Ch. 4 Step 8 的约 300：300 − 64 = 236</text>
        <rect x="28" y="68" width="16" height="12" rx="2" fill="var(--accent)" />
        <text x="52" y="79">chunk</text>
        <rect x="120" y="68" width="16" height="12" rx="2" fill="var(--gen)" />
        <text x="144" y="79">64 个 decode</text>
        <text x="180" y="105" text-anchor="middle" class="ph-strong">蓝块算新 prompt，橙块让其他人出 token</text>
        {#each segs.filter((s) => s.prefill > 0) as s, i}
          {@const y = 126 + i * 31}
          <text x="12" y={y + 16}>第 {i + 1} 步</text>
          <rect x="62" y={y} width="100" height="23" rx="4" fill="var(--accent)" />
          <text x="112" y={y + 16} text-anchor="middle" class="ph-onblue">{s.label}</text>
          <rect x="170" y={y} width="100" height="23" rx="4" fill="var(--gen)" opacity="0.8" />
          <text x="220" y={y + 16} text-anchor="middle">出 token</text>
          <text x="280" y={y + 16}>{fmt(s.ms)}</text>
        {/each}
        <text x="180" y="418" text-anchor="middle">第 9 步末：新来者的首个 token</text>
        <rect x="16" y="438" width="328" height="88" rx="9" fill="#fbfaf7" stroke="var(--line)" />
        <text x="30" y="462" class="ph-strong">其他人每步都出 token，没有整步停住</text>
        <text x="30" y="488">最长间隔 {fmt(met.worst)} = 纯 decode {fmt(tMem)} + {fmt(met.worst - tMem)}</text>
        <text x="30" y="514">新来者：首个 token {fmt(met.ttft)}</text>
      {/if}

      {#if phoneCompare}
        {@const maxMs = Math.max(...policies.map((p) => Math.max(M[p.mode].ttft, M[p.mode].worst)))}
        <text x="180" y="26" text-anchor="middle" class="ph-title">同一 prompt，三种策略</text>
        <text x="180" y="50" text-anchor="middle">2,000 token · 64 个用户在 decode</text>
        <rect x="16" y="66" width="16" height="12" rx="2" fill="var(--accent)" />
        <text x="40" y="77">首个 token</text>
        <rect x="128" y="66" width="16" height="12" rx="2" fill="var(--gen)" />
        <text x="152" y="77">最长间隔</text>
        <rect x="246" y="66" width="16" height="12" rx="2" fill="var(--eos)" />
        <text x="270" y="77">&gt; 2 步</text>
        {#each policies as p, i}
          {@const y = 126 + i * 96}
          {@const m = M[p.mode]}
          <text x="16" y={y} class="ph-strong">{p.name.split(' · ')[0]}</text>
          <text x="16" y={y + 29}>首个 token</text>
          <rect x="104" y={y + 16} width={(m.ttft / maxMs) * 160} height="18" rx="3" fill="var(--accent)" />
          <text x="272" y={y + 30}>{fmt(m.ttft)}</text>
          <text x="16" y={y + 57}>最长间隔</text>
          <rect x="104" y={y + 44} width={Math.max(3, (m.worst / maxMs) * 160)} height="18" rx="3" fill={m.worst > 2 * tMem ? 'var(--eos)' : 'var(--gen)'} />
          <text x="272" y={y + 58}>{fmt(m.worst)}</text>
        {/each}
        <rect x="16" y="410" width="328" height="74" rx="9" fill="#fbfaf7" stroke="var(--line)" />
        <text x="30" y="437" class="ph-strong">Mixed 每步出 token，没有整步停住</text>
        <text x="30" y="467">最长 4.9 ms = 纯 decode 4.8 ms + 0.1 ms</text>
      {/if}

      {#if phoneLoop}
        <text x="180" y="28" text-anchor="middle" class="ph-title">waiting 有人，还要过三项检查</text>
        <text x="180" y="52" text-anchor="middle">新 prompt、续块、撤回后重算都在 waiting</text>
        <rect x="16" y="70" width="328" height="88" rx="10" fill="#fbfaf7" stroke="var(--line)" />
        <text x="32" y="98" class="ph-strong">① 请求槽位</text>
        <text x="32" y="124">一条活动 request 占一行</text>
        <text x="32" y="146">新 request 要有空行；续块已有槽位</text>
        <rect x="16" y="174" width="328" height="106" rx="10" fill="#fbfaf7" stroke="var(--line)" />
        <text x="32" y="202" class="ph-strong">② KV 预留</text>
        <text x="32" y="228">未缓存 prompt + 还要生成的回答</text>
        <text x="32" y="252">加上运行中请求的预留，够用才接纳</text>
        <text x="32" y="272">续块沿用已有预留 · 细节见第 {chNum('07-kv-memory')} 章</text>
        <rect x="16" y="296" width="328" height="106" rx="10" fill="#fbfaf7" stroke="var(--line)" />
        <text x="32" y="324" class="ph-strong">③ 本轮 prefill token 预算</text>
        <text x="32" y="350">决定这条本轮算多少 token</text>
        <text x="32" y="374">算不完回 waiting，下一步续 prefill</text>
        <text x="32" y="394">预算用完后，后面的 request 继续等</text>
        <rect x="16" y="424" width="328" height="72" rx="10" fill="#fbfaf7" stroke="var(--accent)" />
        <text x="32" y="452" class="ph-strong">能组 → prefill batch</text>
        <text x="32" y="478">按策略和本轮预算选 request</text>
        <rect x="16" y="512" width="328" height="72" rx="10" fill="#fbfaf7" stroke="var(--gen)" />
        <text x="32" y="540" class="ph-strong">组不出 → decode batch</text>
        <text x="32" y="566">运行中的 request 各出一个 token</text>
        <text x="180" y="616" text-anchor="middle">开了 mixing 可在 prefill 同一步带 decode</text>
        <text x="180" y="652" text-anchor="middle" class="ph-strong">一次前向后，回来重新检查</text>
      {/if}

      <!-- Two lists, one batch per step -->
      {#if !phoneCustom && cur.scene === 'lists'}
        <g transition:fade={{ duration: 250 }}>
          <rect x="24" y="70" width="200" height="220" rx="12" fill="#fbfaf7" stroke="var(--accent)" stroke-dasharray="5 4" />
          <text x="40" y="92" class="boxtitle">{t('waiting · need a prefill', 'waiting · 等待 prefill')}</text>
          {#each WAITING as p, i}
            <g in:fly={{ y: -6, delay: i * 80, duration: 220 }}>
              <rect x="40" y={106 + i * 30} width="168" height="22" rx="5" fill="white" stroke="var(--line)" />
              <text x="50" y={106 + i * 30 + 15} class="cell">req {7 + i}</text>
              <rect x="96" y={106 + i * 30 + 6} width={p * 0.04} height="10" rx="2" fill="var(--accent)" opacity="0.85" />
            </g>
          {/each}
          <text x="40" y="216" class="tag">{t('prompt tokens, none processed yet', '新 prompt，或还没算完的 prompt')}</text>
          <text x="40" y="266" class="tag">{t('a prefill batch: some of these,', 'scheduler 从这里选 prefill batch，')}</text>
          <text x="40" y="280" class="tag">{t('all their prompt tokens at once', '新的来这里，后续 prefill 回来')}</text>

          <rect x="496" y="70" width="200" height="220" rx="12" fill="#fbfaf7" stroke="var(--gen)" stroke-dasharray="5 4" />
          <text x="512" y="92" class="boxtitle">{t('running · need one token', 'running · 还差一个 token')}</text>
          {#each [10, 4, 15, 7, 3, 9] as a, i}
            <g in:fly={{ y: -6, delay: i * 60, duration: 220 }}>
              <rect x="512" y={106 + i * 24} width="168" height="18" rx="4" fill="white" stroke="var(--line)" />
              <text x="520" y={106 + i * 24 + 13} class="cell">req {i + 1}</text>
              <rect x="566" y={106 + i * 24 + 4} width={a * 6} height="10" rx="2" fill="var(--gen)" opacity="0.85" />
              <rect x={566 + a * 6 + 2} y={106 + i * 24 + 4} width="6" height="10" rx="2" fill="var(--gen)" />
            </g>
          {/each}
          <text x="512" y="266" class="tag">{t('a decode batch: all of these,', '一个 decode batch：所有这些，')}</text>
          <text x="512" y="280" class="tag">{t('one token each', '各一个 token')}</text>

          <g in:fade={{ delay: 600 }}>
            <rect x="290" y="130" width="140" height="100" rx="12" fill="white" stroke="var(--fg)" stroke-width="1.5" />
            <text x="360" y="156" text-anchor="middle" class="slab strong">{t('this step', '本步')}</text>
            <text x="360" y="178" text-anchor="middle" class="tag">{t('a prefill batch', '一个 prefill batch')}</text>
            <text x="360" y="192" text-anchor="middle" class="tag strong">{t('or', '或')}</text>
            <text x="360" y="206" text-anchor="middle" class="tag">{t('the decode batch', 'decode batch')}</text>
            <line x1="230" y1="180" x2="282" y2="180" class="wire" />
            <polygon points="282,174 282,186 290,180" fill="var(--faint)" />
            <line x1="490" y1="180" x2="438" y2="180" class="wire" />
            <polygon points="438,174 438,186 430,180" fill="var(--faint)" />
            <text x="360" y="262" text-anchor="middle" class="tag">{t('one forward pass, then back here', '一次前向，然后回到这里')}</text>
          </g>
          <text x="360" y="330" text-anchor="middle" class="legend" in:fade={{ delay: 1200 }}>{t('never both at once, by default. The next step says why.', '默认从不同时跑两种。下一步讲为什么。')}</text>
        </g>
      {/if}

      <!-- Recap: where chapter 5 left off -->
      {#if !phoneCustom && cur.scene === 'recap'}
        {@const cols = [{ w: 44, wide: false }, { w: 44, wide: false }, { w: 150, wide: true }, { w: 44, wide: false }, { w: 44, wide: false }]}
        {@const xs = cols.reduce<number[]>((a, c, i) => { a.push(i === 0 ? 0 : a[i - 1] + cols[i - 1].w + 4); return a; }, [])}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="54" class="rowlabel">{t('Ch. 5 Step 9 · continuous batching, one newcomer joins', 'Ch. 5 Step 9 · 连续批处理，一个新来者加入')}</text>
          {#each Array(6) as _, sIdx}
            <text x="120" y={104 + sIdx * 26 + 15} text-anchor="end" class="rowlabel">slot {sIdx + 1}</text>
            {#each cols as c, ci}
              {@const x = 132 + xs[ci]}
              {@const y = 104 + sIdx * 26}
              {#if c.wide && sIdx === 2}
                <rect {x} {y} width={c.w} height="22" rx="3" fill="var(--accent)" in:fade={{ delay: 300 }} />
                <text x={x + c.w / 2} y={y + 15} text-anchor="middle" class="steplabel">{t("newcomer's prefill", '新来者的 prefill')}</text>
              {:else if c.wide}
                <rect x={x + 0.5} y={y + 0.5} width={c.w - 1} height="21" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" stroke-opacity="0.5" in:fade={{ delay: 300 }} />
                <rect x={x + c.w - 9} {y} width="9" height="22" rx="3" fill="var(--gen)" in:fade={{ delay: 300 }} />
              {:else}
                <rect {x} {y} width={c.w} height="22" rx="3" fill="var(--gen)" opacity="0.85" in:fade={{ delay: ci * 60 }} />
              {/if}
            {/each}
          {/each}
          <g in:fade={{ delay: 800 }}>
            <path d="M {132 + xs[2]} 94 V 88 H {132 + xs[2] + 150} V 94" fill="none" stroke="var(--eos)" stroke-width="1.5" />
            <text x={132 + xs[2] + 75} y="82" text-anchor="middle" class="tag" fill="var(--eos)">{t("one step, stretched to a prompt's worth of math", '一步被拉长到一个 prompt 的计算量')}</text>
          </g>
          <g in:fade={{ delay: 1400 }}>
            <line x1="500" y1="170" x2="560" y2="170" class="wire" />
            <polygon points="560,163 560,177 572,170" fill="var(--faint)" />
            <rect x="584" y="120" width="116" height="100" rx="12" fill="white" stroke="var(--fg)" stroke-width="1.5" />
            <text x="642" y="150" text-anchor="middle" class="slab strong small">{t("don't mix", '不混合')}</text>
            <text x="642" y="172" text-anchor="middle" class="tag">prefill batch</text>
            <text x="642" y="186" text-anchor="middle" class="tag strong">{t('or', '或')}</text>
            <text x="642" y="200" text-anchor="middle" class="tag">decode batch</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade={{ delay: 1800 }}>{t("SGLang's default: each step is one kind of batch (vLLM v1 mixes by default) · mixing comes back in step 7, on purpose and bounded", 'SGLang 默认：每步只跑一种 batch（vLLM v1 默认混合）· 混合在第 7 步回来，有意且有界')}</text>
        </g>
      {/if}

      <!-- Why two batch types: the shapes -->
      {#if !phoneCustom && cur.scene === 'why'}
        <g transition:fade={{ duration: 250 }}>
          <rect x="24" y="64" width="330" height="232" rx="12" fill="#fbfaf7" stroke="var(--accent)" />
          <text x="40" y="86" class="boxtitle">{t('a prefill batch', '一个 prefill batch')}</text>
          {#each [18, 27, 11] as n, i}
            <text x="40" y={116 + i * 26} class="cell">seq {i + 1}</text>
            {#each Array(n) as _, t}
              <rect x={82 + t * 9.5} y={105 + i * 26} width="8" height="14" rx="2" fill="var(--accent)" opacity="0.85" in:fade={{ delay: (i * 20 + t) * 10, duration: 100 }} />
            {/each}
          {/each}
          <text x="40" y="204" class="slab">{t('few sequences · hundreds of tokens each', '序列少 · 各几百 token')}</text>
          <text x="40" y="222" class="slab">{t('ragged lengths', '长短不齐')}</text>
          <text x="40" y="254" class="tag">{t('its own attention kernel · compute-bound', '专属 attention kernel · 受计算限制')}</text>
          <text x="40" y="274" class="tag">{t('shapes differ every batch', '每个 batch 形状都不同')}</text>

          <rect x="366" y="64" width="330" height="232" rx="12" fill="#fbfaf7" stroke="var(--gen)" />
          <text x="382" y="86" class="boxtitle">{t('the decode batch', 'decode batch')}</text>
          {#each Array(4) as _, col}
            {#each Array(4) as _, row}
              {@const k = col * 4 + row}
              <text x={382 + col * 78} y={116 + row * 18} class="cell">seq {k + 1}</text>
              <rect x={424 + col * 78} y={105 + row * 18} width="8" height="14" rx="2" fill="var(--gen)" opacity="0.85" in:fade={{ delay: k * 40 }} />
            {/each}
          {/each}
          <text x="382" y="204" class="slab">{t('many sequences · one token each', '序列多 · 各一个 token')}</text>
          <text x="382" y="222" class="slab">{t('only the batch size changes', '只有 batch 大小变化')}</text>
          <text x="382" y="254" class="tag">{t('a different attention kernel · memory-bound', '另一个 attention kernel · 受内存限制')}</text>
          <text x="382" y="274" class="tag">{t(`one recording per batch size → CUDA graph replay, chapter ${CH_CUDA}`, `每个 batch 大小一份录制 → 回放，第 ${CH_CUDA} 章`)}</text>

          <g in:fade={{ delay: 900 }}>
            <text x="360" y="330" text-anchor="middle" class="legend">{t('two shapes → two batches → two fast paths', '两种形状 → 两个 batch → 两条快路径')}</text>
            <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`what the split unlocks: separate machines (chapter ${CH_DISAGG}), CUDA graphs for decode (chapter ${CH_CUDA})`, `拆分解锁：独立机器（第 ${CH_DISAGG} 章）、decode 的录制回放（第 ${CH_CUDA} 章）`)}</text>
          </g>
        </g>
      {/if}

      <!-- Timeline: 64 decoders and the newcomer(s), time on the x axis -->
      {#if !phoneCustom && cur.scene === 'timeline'}
        {@const rowA = TL.y}
        {@const rowN = TL.y + TL.gapY}
        {@const arrX = TL.x + met.arrival * TL.pxPerMs}
        {@const gx0 = TL.x + met.ws * TL.pxPerMs}
        {@const gx1 = TL.x + met.we * TL.pxPerMs - 2}
        {@const firstIdx = segs.findIndex((z) => z.first)}
        {@const ly = rowN + TL.rowH + 66}
        {@const fx = TL.x + (segX[firstIdx] + segs[firstIdx].ms) * TL.pxPerMs - 1}
        <g transition:fade={{ duration: mode === 'mixed' ? 0 : 250 }}>
          <text x="16" y={TL.y - 52} class="rowlabel">{t(`${DECODERS} users decoding · ${mode === 'batched' ? `${WAITING.length} prompts waiting` : `a ${PROMPT.toLocaleString()}-token prompt arrives`}`, `${DECODERS} 个用户在 decode · ${mode === 'batched' ? `${WAITING.length} 个 prompt 在等待` : `一个 ${PROMPT.toLocaleString()} token 的 prompt 到达`}`)}</text>
          <text x="16" y={TL.y - 36} class="rowlabel strong">{t(mode === 'prefill-first' ? 'prefill first · the prompt gets its own step' : mode === 'batched' ? 'prefill first · three prompts in one prefill step' : mode === 'chunked' ? `chunked prefill, not mixed · chunk step, decode step, chunk step…` : `chunked prefill, mixed · every step carries a chunk and all the decodes`, mode === 'prefill-first' ? 'prefill 优先 · prompt 单独一步' : mode === 'batched' ? 'prefill 优先 · 三个 prompt 合一个 prefill 步' : mode === 'chunked' ? '切 chunk 的 prefill，不混合 · chunk 步、decode 步、chunk 步…' : '切 chunk 的 prefill，混合 · 每步带一个 chunk 和全部 decode')}</text>
          <text x={TL.x - 10} y={rowN + TL.rowH + 18} text-anchor="end" class="rowlabel">{t('step type', '步类型')}</text>
          <line x1={TL.x} y1={rowN + TL.rowH + 34} x2={TL.x + 104 * TL.pxPerMs} y2={rowN + TL.rowH + 34} stroke="var(--line)" />
          {#each [0, 25, 50, 75, 100] as ms}
            <text x={TL.x + ms * TL.pxPerMs} y={rowN + TL.rowH + 48} text-anchor="middle" class="tag">{ms} ms</text>
          {/each}
          <text x={TL.x - 10} y={rowA + 17} text-anchor="end" class="rowlabel">{t('everyone else', '其他人')}</text>
          <text x={TL.x - 10} y={rowN + 17} text-anchor="end" class="rowlabel">{t(mode === 'batched' ? 'newcomers' : 'newcomer', mode === 'batched' ? '新来者们' : '新来者')}</text>
          {#each segs as s, i (mode === 'mixed' ? 'mixed-' + i : i)}
            {@const x = TL.x + segX[i] * TL.pxPerMs}
            {@const w = Math.max(3, s.ms * TL.pxPerMs - 2)}
            {@const sy = rowN + TL.rowH + 8}
            <g in:fade={{ delay: mode === 'mixed' ? 250 + i * 220 : i * 40, duration: 200 }}>
              {#if s.decode}
                <rect {x} y={rowA} width={w} height={TL.rowH} rx="4" fill="var(--gen)" opacity={s.prefill > 0 ? 0.45 : 0.85} />
                <rect x={x + w - 5} y={rowA} width="5" height={TL.rowH} rx="2" fill="var(--gen)" />
              {:else}
                <rect {x} y={rowA} width={w} height={TL.rowH} rx="4" fill="#ece9e2" />
                {#if w > 40}<text x={x + w / 2} y={rowA + 17} text-anchor="middle" class="tag">{t('frozen', '冻结')}</text>{/if}
              {/if}
              {#if s.prefill > 0}
                <rect {x} y={rowN} width={w} height={TL.rowH} rx="4" fill="var(--accent)" opacity="0.9" />
                {#if w > 22}<text x={x + w / 2} y={rowN + 17} text-anchor="middle" class="steplabel">{s.label}</text>{/if}
              {:else if i > firstIdx}
                <rect {x} y={rowN} width={w} height={TL.rowH} rx="4" fill="var(--gen)" opacity="0.85" />
                <rect x={x + w - 5} y={rowN} width="5" height={TL.rowH} rx="2" fill="var(--gen)" />
              {/if}
              <!-- step type strip: what kind of batch this step was -->
              {#if s.prefill > 0 && s.decode}
                <rect {x} y={sy} width={w} height="6" rx="1.5" fill="var(--accent)" />
                <rect {x} y={sy + 6} width={w} height="6" rx="1.5" fill="var(--gen)" />
              {:else if s.prefill > 0}
                <rect {x} y={sy} width={w} height="12" rx="2" fill="var(--accent)" />
              {:else}
                <rect {x} y={sy} width={w} height="12" rx="2" fill="var(--gen)" opacity="0.85" />
              {/if}
            </g>
          {/each}
          {#key mode === 'mixed' ? 'mixed' : 'static'}
            <g in:fade={{ delay: mode === 'mixed' ? 250 + segs.length * 220 : firstIdx * 40 + 100, duration: mode === 'mixed' ? 200 : 400 }}>
              <circle cx={fx} cy={rowN + TL.rowH / 2} r="6" fill="white" stroke="var(--fg)" stroke-width="2" />
              <text x={fx} y={rowN - 8} text-anchor="middle" class="tag strong">{t('first token', '首个 token')}</text>
            </g>
          {/key}
          <line x1={arrX} y1={rowA - 14} x2={arrX} y2={rowN + TL.rowH + 36} stroke="var(--fg)" stroke-dasharray="3 3" />
          <text x={arrX} y={rowN + TL.rowH + 48} text-anchor="middle" class="tag strong">{t(mode === 'batched' ? 'arrive' : 'arrives', '到达')}</text>
          {#key mode === 'mixed' ? 'mixed' : 'static'}
            <g in:fade={{ delay: mode === 'mixed' ? 250 + segs.length * 220 + 220 : 300, duration: mode === 'mixed' ? 200 : 250 }}>
              <rect x={TL.x} y={ly - 9} width="26" height="10" rx="2" fill="var(--accent)" /><text x={TL.x + 32} y={ly} class="tag">prefill batch</text>
              <rect x={TL.x + 110} y={ly - 9} width="26" height="10" rx="2" fill="var(--gen)" opacity="0.85" /><text x={TL.x + 142} y={ly} class="tag">decode batch</text>
              <rect x={TL.x + 230} y={ly - 9} width="26" height="5" rx="1.5" fill="var(--accent)" /><rect x={TL.x + 230} y={ly - 4} width="26" height="5" rx="1.5" fill="var(--gen)" /><text x={TL.x + 262} y={ly} class="tag">{t('mixed batch: a chunk plus every decode, one forward pass', '混合 batch：一个 chunk 加全部 decode，一次前向')}</text>
            </g>
          {/key}
          {#if mode === 'mixed' && $lang === 'zh'}
            <text x={W / 2} y="282" text-anchor="middle" class="tag strong">每步约 300 token（Ch. 4 Step 8）：300 − 64 个 decode = 236 个 prompt token；间隔多 {fmt(met.worst - tMem)}</text>
          {/if}
          {#if met.worst > 1.5 * tMem}
            <path d="M {gx0} {rowA - 6} V {rowA - 12} H {gx1} V {rowA - 6}" fill="none" stroke="var(--eos)" stroke-width="1.5" in:fade={{ delay: 500 }} />
            <text x={(gx0 + gx1) / 2} y={rowA - 18} text-anchor="middle" class="tag" fill="var(--eos)" in:fade={{ delay: 500 }}>{t(`no token for ${fmt(met.worst)}`, `${fmt(met.worst)} 没有 token`)}</text>
          {/if}
          {#key mode === 'mixed' ? 'mixed' : 'static'}
            <g in:fade={{ delay: mode === 'mixed' ? 250 + segs.length * 220 + 440 : 700, duration: mode === 'mixed' ? 200 : 250 }}>
              {#each [
                { v: fmt(met.worst), l: t('everyone else · longest gap between tokens', '其他人 · token 间最长间隔'), bad: met.worst > 2 * tMem },
                { v: fmt(met.ttft), l: t((mode === 'batched' ? 'newcomers' : 'newcomer') + ' · time to first token', (mode === 'batched' ? '新来者们' : '新来者') + ' · 首个 token 用时'), bad: false },
              ] as tile, i}
                {@const x = 90 + i * 300}
                <rect {x} y="296" width="280" height="64" rx="10" fill="#fbfaf7" stroke={tile.bad ? 'var(--eos)' : 'var(--line)'} />
                <text x={x + 16} y="324" class="tile-value" fill={tile.bad ? 'var(--eos)' : 'var(--fg)'}>{tile.v}</text>
                <text x={x + 16} y="346" class="tile-label">{tile.l}</text>
              {/each}
            </g>
          {/key}
        </g>
      {/if}

      <!-- Compare the policies -->
      {#if !phoneCustom && cur.scene === 'compare'}
        {@const maxMs = Math.max(...policies.map((p) => Math.max(M[p.mode].ttft, M[p.mode].worst)))}
        {@const bx = 180}
        {@const bw = 460}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="64" class="rowlabel">{t(`same ${PROMPT.toLocaleString()}-token prompt, ${DECODERS} users decoding`, `同一个 ${PROMPT.toLocaleString()} token 的 prompt，${DECODERS} 个用户在 decode`)}</text>

          {#each policies as p, i}
            {@const y = 92 + i * 86}
            {@const m = M[p.mode]}
            <g in:fly={{ x: -8, delay: i * 200, duration: 300 }}>
              <text x="16" y={y} class="slab strong small">{p.name}</text>
              <text x="272" y={y} class="tag">{p.note}</text>
              <text x={bx - 8} y={y + 27} text-anchor="end" class="tag">{t('newcomer · first token', '新来者 · 首个 token')}</text>
              <rect x={bx} y={y + 14} width={(m.ttft / maxMs) * bw} height="18" rx="3" fill="var(--accent)" opacity="0.9" />
              <text x={bx + (m.ttft / maxMs) * bw + 6} y={y + 27} class="num">{fmt(m.ttft)}</text>
              <text x={bx - 8} y={y + 51} text-anchor="end" class="tag">{t('everyone else · longest gap', '其他人 · 最长间隔')}</text>
              <rect x={bx} y={y + 38} width={Math.max(3, (m.worst / maxMs) * bw)} height="18" rx="3" fill={m.worst > 2 * tMem ? 'var(--eos)' : 'var(--gen)'} opacity="0.9" />
              <text x={bx + Math.max(3, (m.worst / maxMs) * bw) + 6} y={y + 51} class="num">{fmt(m.worst)}</text>
            </g>
          {/each}
          <text x="16" y="352" class="legend" in:fade={{ delay: 900 }}>{t(`the decode step floor is ${fmt(tMem)}: a gap of ${fmt(tMem)} means nobody noticed the newcomer at all`, `decode 步下限是 ${fmt(tMem)}；Mixed 每步出 token，但 ${fmt(M.mixed.worst)} 比下限多 ${fmt(M.mixed.worst - tMem)}`)}</text>
        </g>
      {/if}

      <!-- The scheduler's loop -->
      {#if !phoneCustom && cur.scene === 'loop'}
        <g transition:fade={{ duration: 250 }}>
          <defs>
            <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
            </marker>
          </defs>
          <text x="16" y="52" class="rowlabel">{t('one scheduler step', 'scheduler 的一步')}</text>
          <g in:fly={{ y: 8, duration: 300 }}>
            <rect x="190" y="62" width="340" height="60" rx="12" fill="white" stroke="var(--fg)" stroke-width="1.5" />
            <text x="360" y="84" text-anchor="middle" class="slab strong small">{t('anyone waiting, and room in the cache?', 'waiting 有人，能组 prefill 吗？')}</text>
            <text x="360" y="101" text-anchor="middle" class="tag">{t(`the cache question is chapter ${chNum('07-kv-memory')}`, '槽位：一条 request 一行 · KV 预留')}</text>
            <text x="360" y="115" text-anchor="middle" class="tag">{t('with an interval N, also: N decode steps since the last prefill', 'token 预算：本轮 prefill 最多算多少')}</text>
          </g>
          <g in:fly={{ y: 8, delay: 300, duration: 300 }}>
            <path d="M 270 122 V 146" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#arrowhead)" />
            <text x="278" y="140" class="tag strong">{t('yes', '是')}</text>
            <rect x="20" y="150" width="436" height="152" rx="12" fill="#fbfaf7" stroke="var(--accent)" />
            <text x="36" y="172" class="slab strong small">{t('a prefill batch', '一个 prefill batch')}</text>
            <text x="36" y="190" class="tag">{t('from the waiting list, in policy order:', '从 waiting 列表，按策略顺序：')}</text>
            <text x="36" y="204" class="tag">{t('first come · shortest first · longest cached prefix, up to the chunk size', '先来先服务 · 最短优先 · 最长缓存前缀，不超过 chunk 大小')}</text>
            <!-- mixing off: the prefill batch alone -->
            <rect x="34" y="216" width="198" height="78" rx="8" fill="white" stroke="var(--line)" />
            <rect x="46" y="227" width="18" height="10" rx="2" fill="var(--accent)" />
            <text x="72" y="236" class="tag strong">{t('mixing off · the default', '关闭混合 · 默认')}</text>
            <text x="46" y="256" class="tag">{t('the prefill runs alone', 'prefill 单独跑')}</text>
            <text x="46" y="270" class="tag">{t('the running ones wait a step', '运行中的等一步')}</text>
            <!-- mixing on: every running request's next token rides along -->
            <rect x="244" y="216" width="198" height="78" rx="8" fill="white" stroke="var(--line)" />
            <rect x="256" y="227" width="18" height="5" rx="1.5" fill="var(--accent)" /><rect x="256" y="232" width="18" height="5" rx="1.5" fill="var(--gen)" />
            <text x="282" y="236" class="tag strong">{t('mixing on · step 7', '开启混合 · 第 7 步')}</text>
            <text x="256" y="256" class="tag">{t("every running request's next token", '每个运行中 request 的下一个 token')}</text>
            <text x="256" y="270" class="tag">{t('rides in the same pass', '在同一次前向中跑')}</text>
            <text x="256" y="284" class="tag">{t('the two share the chunk size', '两者共享 chunk 大小')}</text>
          </g>
          <g in:fly={{ y: 8, delay: 600, duration: 300 }}>
            <path d="M 530 92 H 582 V 146" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#arrowhead)" />
            <text x="590" y="124" class="tag strong">{t('no', '否')}</text>
            <rect x="472" y="150" width="220" height="152" rx="12" fill="#fbfaf7" stroke="var(--gen)" />
            <text x="488" y="172" class="slab strong small">{t('the decode batch', 'decode batch')}</text>
            <text x="488" y="190" class="tag">{t('everyone running, one token each', '所有运行中，各一个 token')}</text>
            <text x="488" y="204" class="tag">{t('finished sequences leave,', '完成的序列离开，')}</text>
            <text x="488" y="218" class="tag">{t('freeing their cache', '释放它们的 cache')}</text>
            <text x="488" y="256" class="tag">{t('one recording per batch size →', '每个 batch 大小一份录制 →')}</text>
            <text x="488" y="270" class="tag">{t(`CUDA graph replay, chapter ${CH_CUDA}`, `CUDA graph 回放，第 ${CH_CUDA} 章`)}</text>
          </g>
          <g in:fade={{ delay: 1000 }}>
            <path d="M 120 302 V 329 H 218" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#arrowhead)" />
            <path d="M 582 302 V 329 H 502" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#arrowhead)" />
            <rect x="222" y="314" width="276" height="30" rx="10" fill="var(--fg)" />
            <text x="360" y="333" text-anchor="middle" class="steplabel big">{t('one forward pass · then back to the top', '一次前向 · 然后回到顶部')}</text>
            <path d="M 360 344 V 356 H 708 V 40 H 360 V 58" fill="none" stroke="#b8b4aa" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrowhead)" />
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote" in:fade={{ delay: 1400 }}>SGLang: <tspan class="mono">schedule_policy</tspan>, <tspan class="mono">chunked_prefill_size</tspan>, <tspan class="mono">prefill_decode_interval</tspan>, <tspan class="mono">enable_mixed_chunk</tspan></text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade={{ delay: 1400 }}>{t('this loop is', '这个循环就是')} <tspan class="mono">Scheduler.get_next_batch_to_run()</tspan></text>
        </g>
      {/if}
      {#if cur.foot && !phoneCustom}
        {#key cur.foot}<text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>{t(cur.foot ?? '', cur.footZh ?? '')}</text>{/key}
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .rowlabel.strong { fill: var(--fg); }
  .cell { font-family: var(--mono); font-size: 10px; fill: var(--fg); }
  .num { font-family: var(--mono); font-size: 10.5px; fill: var(--fg); }
  .mono { font-family: var(--mono); font-size: 10px; }
  .tag.strong { fill: var(--fg); font-weight: 600; }
  .steplabel.big { font-size: 11.5px; }
  .slab.strong { font-weight: 650; font-size: 14px; }
  .slab.strong.small { font-size: 12.5px; }
  .tile-value { font-size: 20px; font-weight: 650; letter-spacing: -0.02em; }
  .tile-label { font-size: 10.5px; fill: var(--muted); }
  .wire { stroke: var(--line); stroke-width: 6; stroke-linecap: round; }
  .phone-custom text { font-family: var(--sans); font-size: 13px; fill: var(--fg); }
  .phone-custom .ph-title { font-size: 16px; font-weight: 650; }
  .phone-custom .ph-strong { font-weight: 650; }
  .phone-custom .ph-onblue { fill: white; }
</style>
