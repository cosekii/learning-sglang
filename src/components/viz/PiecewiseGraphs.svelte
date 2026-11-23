<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import { chapterNumber as chNum, chapters, type NavLink } from '../../chapters';
  import { W_GB, BW, LAYERS } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const CH_NEXT = chNum('13-torch-compile');
  const CH_TP = chNum('24-tensor-parallel');

  // ---- Numbers: Llama-3-8B bf16 on one H100, continuing chapters 4 and 11 ------------------------------
  const tMem = W_GB / BW;                          // 4.8 ms: the weight read, the floor under any step
  const KERNELS = 1000, LAUNCH_US = 9;
  const launchMs = (KERNELS * LAUNCH_US) / 1000;   // 9 ms of CPU to launch a step kernel by kernel
  const US_PER_TOKEN = 16;                         // 2·8e9 FLOPs per token at ~1 PFLOP/s, as in chapter 4
  const BALANCE = Math.round((tMem * 1000) / US_PER_TOKEN / 10) * 10; // 300: compute catches memory
  const LAUNCH_BOUND = Math.round((launchMs * 1000) / US_PER_TOKEN / 10) * 10; // 560: GPU time catches the launches
  const fmt = (ms: number) => (ms < 10 ? ms.toFixed(1) : ms.toFixed(0)) + ' ms';

  // piecewise cost: one replay per piece, plus attention launched the old way
  const PIECES = LAYERS + 1;
  const REPLAY_PIECE_US = 10, ATTN_LAUNCHES = 3;
  const pieceMs = (PIECES * REPLAY_PIECE_US) / 1000;
  const attnMs = (LAYERS * ATTN_LAUNCHES * LAUNCH_US) / 1000;
  const pieceTotal = pieceMs + attnMs;             // ~1.2 ms

  const SEQ_A = [18, 27, 11];        // same token total, different sequence boundaries
  const SEQ_B = [40, 9, 7];
  const TOTAL = SEQ_A.reduce((a, b) => a + b, 0);
  const SEQC = ['var(--accent)', 'var(--gen)', '#0891b2'];

  // one layer, run on batch 1 and batch 2. Llama-3-8B: hidden 4096, qkv 6144 with GQA, ffn 14336.
  const D = 4096, QKV = 6144, FFN = 14336;
  const tri = (seq: number[]) => seq.map((x) => `${x}×${x}`).join('  ');
  const kernelRows = [
    { n: 'norm', a: `[${TOTAL}, ${D}]` },
    { n: 'qkv', a: `[${TOTAL}, ${D}] × [${D}, ${QKV}]` },
    { n: 'rope', a: `[${TOTAL}, ${D}]` },
    { n: 'attn', a: tri(SEQ_A), b: tri(SEQ_B), seam: true },
    { n: 'o', a: `[${TOTAL}, ${D}] × [${D}, ${D}]` },
    { n: 'add', a: `[${TOTAL}, ${D}]` },
    { n: 'norm', a: `[${TOTAL}, ${D}]` },
    { n: 'gate·up', a: `[${TOTAL}, ${D}] × [${D}, ${2 * FFN}]` },
    { n: 'silu', a: `[${TOTAL}, ${FFN}]` },
    { n: 'down', a: `[${TOTAL}, ${FFN}] × [${FFN}, ${D}]` },
    { n: 'add', a: `[${TOTAL}, ${D}]` },
  ];
  const SAME = kernelRows.filter((r) => !r.seam).length;

  type Scene = 'shapes' | 'bound' | 'bucket' | 'bounds' | 'tokenwise' | 'cut' | 'run' | 'arith' | 'ladder' | 'seams' | 'tracer' | 'closing';
  interface Step { caption: string; captionZh: string; scene: Scene; v?: number }
  const steps: Step[] = [
    { scene: 'shapes', caption: `Ch. 11 Step 12 left it here. Decode gets a graph because its batch is always [B, 1]; prefill is ragged, so it runs eagerly — <b>and that was fine, because prefill is compute-bound anyway</b>. That last part deserves a second look.`, captionZh: `Ch. 11 Step 12 到此：decode 的 batch 恒为 [B, 1]，录 graph；prefill 长短不齐，eager 跑——<b>反正 prefill 是 compute-bound，没关系</b>。这点值得再看。` },
    { scene: 'bound', caption: `Only above about ${LAUNCH_BOUND} tokens. Below that, the GPU finishes a prefill step in less time than the CPU needs to launch it — prefill is <b>launch-bound</b>, exactly like decode was in Ch. 11 Step 4.`, captionZh: `这话只在约 ${LAUNCH_BOUND} 个 token 以上成立。再少，GPU 算完一个 prefill 步比 CPU 发起它还快——prefill 是 <b>launch-bound</b>，正如 Ch. 11 Step 4 的 decode。` },
    { scene: 'bucket', caption: `So record prefill too. The token count changes every batch, but Ch. 11 Step 10 already solved that: a ladder of sizes and pad up to the next rung. Same trick, a different axis — tokens instead of requests.`, captionZh: `那 prefill 也录成 graph。token 数每个 batch 都变，但 Ch. 11 Step 10 已解决：一架尺寸梯子，向上补齐到下一梯级。同一招，换个轴——数 token 而非 request。` },
    { scene: 'bounds', caption: `Except padding fixes the <b>total</b>, not the <b>boundaries</b>. These two batches are both ${TOTAL} tokens, and attention has to do completely different work in each: every token attends only back to the start of its own sequence.`, captionZh: `但补齐只固定<b>总数</b>，不固定<b>边界</b>。这两个 batch 都是 ${TOTAL} 个 token，attention 要做的活却完全不同：每个 token 只回看到自己序列的开头。` },
    { scene: 'tokenwise', caption: `So run both batches through a layer and compare. ${SAME} of the ${kernelRows.length} kernels do the identical thing, because all they ever see is a row count. Only attention changes — and only attention reads the boundaries.`, captionZh: `把两个 batch 各过一层再比较。${kernelRows.length} 个 kernel 里 ${SAME} 个做的事完全相同，因为它们只看到行数。只有 attention 变了——也只有 attention 读边界。` },
    { scene: 'cut', caption: `So cut there. ${LAYERS} attentions means ${LAYERS} cuts and ${PIECES} pieces, roughly one layer each. Every piece is token-wise, so every piece can be recorded at a padded token count. Attention is left out.`, captionZh: `那就在那里切。${LAYERS} 个 attention 就是 ${LAYERS} 刀、${PIECES} 段，大约每层一段。每段都逐 token，所以都能按补齐后的 token 数录制。attention 除外。` },
    { scene: 'run', caption: `A step is now an alternation: replay a piece, run attention eagerly, replay the next piece. The CPU wakes up ${LAYERS} times instead of once — and stays asleep for the ${KERNELS - LAYERS * ATTN_LAUNCHES} kernels in between.`, captionZh: `一步现在是交替：replay 一段、eager 跑 attention、再 replay 下一段。CPU 醒来 ${LAYERS} 次而不是一次——中间的 ${KERNELS - LAYERS * ATTN_LAUNCHES} 个 kernel 它都在睡。` },
    { scene: 'arith', caption: `${fmt(launchMs)} of CPU becomes about ${fmt(pieceTotal)}: ${PIECES} replays plus the attention launches. That is ${Math.round(pieceTotal / 0.02)}× more CPU than one whole-model graph, and it does not matter. <b>You don't need one graph. You need the CPU under the GPU.</b>`, captionZh: `${fmt(launchMs)} 的 CPU 变成约 ${fmt(pieceTotal)}：${PIECES} 次 replay 加 attention 启动。是一个整模型 graph 的 ${Math.round(pieceTotal / 0.02)} 倍 CPU，但无所谓。<b>不必一个 graph，只要 CPU 用时低于 GPU。</b>` },
    { scene: 'ladder', caption: `The rungs are token counts now, and the gap grows with the count: 4 apart at the bottom, 256 at the top. Every band holds it near a sixteenth of the batch, so what padding wastes is a share of the work rather than a fixed number of tokens.`, captionZh: `梯级现在是 token 数，间隔随数量增大：底部隔 4，顶部隔 256。每个区间都把间隔保持在 batch 的约十六分之一，所以补齐浪费的是固定比例的工作量，而非固定 token 数。` },
    { scene: 'seams', caption: `Attention isn't the only seam. All-reduce waits on other GPUs (chapter ${CH_TP}); MoE dispatch sends a data-dependent number of tokens to each expert. The rule is the same: if its work depends on the data rather than the token count, cut there.`, captionZh: `attention 不是唯一的接缝。all-reduce 要等其他 GPU（第 ${CH_TP} 章）；MoE dispatch 发给每个 expert 的 token 数由数据决定。规则相同：工作若依赖数据而非 token 数，就在那里切。` },
    { scene: 'tracer', caption: `Nobody writes ${PIECES} capture regions by hand. <b>torch.compile</b> traces the model into a graph of operations; you name the ops to split on, it cuts there and hands back the subgraphs. Each one is recorded as in Ch. 11 Step 6.`, captionZh: `没人手写 ${PIECES} 个捕获区。<b>torch.compile</b> 把模型 trace 成一张操作图；你指定要切的 op，它就在那里切，交回子图。每个子图按 Ch. 11 Step 6 那样录制。` },
    { scene: 'closing', caption: `The matmuls have to touch memory: that's where the weights are. The two in the middle touch it only because of how they were called — and the tracer handed them back untouched. Chapter ${CH_NEXT}.`, captionZh: `矩阵乘必须碰内存：权重在那里。中间两个碰内存只是因为调用方式——而 tracer 把它们原样交回。第 ${CH_NEXT} 章。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const W = 720, H = 400;

  // ---- scene data -----------------------------------------------------------------------------------
  // SGLang's default capture schedule for prefill: finer where a step is cheapest
  const SCHED = [
    { from: 4, to: 32, by: 4 }, { from: 48, to: 256, by: 16 }, { from: 288, to: 512, by: 32 },
    { from: 576, to: 1024, by: 64 }, { from: 1280, to: 4096, by: 256 },
  ];
  const rungs = SCHED.flatMap((s) => { const out: number[] = []; for (let v = s.from; v <= s.to; v += s.by) out.push(v); return out; });
  const padTo = (n: number) => rungs.find((r) => r >= n) ?? n;

  // the flat op list the tracer hands back, laid out on its own widths
  const tracedOps = (() => {
    const names = ['norm', 'qkv', 'rope', '*attn', 'o', 'add', 'norm', 'gate·up', 'silu', 'down', 'add', '*attn', '…'];
    let x = 40;
    return names.map((raw) => {
      const seam = raw.startsWith('*');
      const n = seam ? raw.slice(1) : raw;
      const o = { n, x, seam };
      x += n.length * 6.2 + (seam ? 38 : 18);   // seams need room for the scissors
      return o;
    });
  })();

  // roofline plot
  const PL = { x0: 92, x1: 664, y0: 300, y1: 78, nMax: 800, tMax: 12 };
  const px = (n: number) => PL.x0 + (n / PL.nMax) * (PL.x1 - PL.x0);
  const py = (ms: number) => PL.y0 - (ms / PL.tMax) * (PL.y0 - PL.y1);
  const gpuMs = (n: number) => Math.max(tMem, (n * US_PER_TOKEN) / 1000);

</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Piecewise CUDA graphs, step {step + 1}">
      <defs>
        <marker id="pw-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
        </marker>
        <marker id="pw-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
      </defs>

      <!-- 1: chapter 11's two shapes, with the prefill verdict questioned -->
      {#if cur.scene === 'shapes'}
        <g transition:fade={{ duration: 250 }}>
          <rect x="24" y="64" width="330" height="200" rx="12" fill="#fbfaf7" stroke="var(--gen)" />
          <text x="40" y="86" class="boxtitle">{t('a decode batch', '一个 decode batch')}</text>
          {#each Array(5) as _, i}
            <text x="40" y={114 + i * 18} class="cell">req {i + 1}</text>
            <rect x="82" y={103 + i * 18} width="10" height="14" rx="2" fill="var(--gen)" opacity="0.85" in:fade={{ delay: i * 60 }} />
          {/each}
          <text x="40" y="214" class="slab small">{t('shape [B, 1] · only B changes', 'shape [B, 1] · 只有 B 变')}</text>
          <text x="40" y="240" class="tag">{t('a rung per B · ', '每个 B 一个梯级 · ')}<tspan class="strong" fill="#16a34a">{t('one graph for the whole step', '整步一个 graph')}</tspan></text>

          <rect x="366" y="64" width="330" height="200" rx="12" fill="#fbfaf7" stroke="var(--accent)" />
          <text x="382" y="86" class="boxtitle">{t('a prefill batch', '一个 prefill batch')}</text>
          {#each SEQ_A as n, i}
            <text x="382" y={116 + i * 26} class="cell">seq {i + 1}</text>
            {#each Array(n) as _, ci}
              <rect x={424 + ci * 9.5} y={105 + i * 26} width="8" height="14" rx="2" fill="var(--accent)" opacity="0.85" in:fade={{ delay: (i * 20 + ci) * 10, duration: 100 }} />
            {/each}
          {/each}
          <text x="382" y="214" class="slab small">{t('shape [Σ tokens, …] · ragged', 'shape [Σ tokens, …] · 长短不齐')}</text>
          <text x="382" y="240" class="tag">{t('no two alike · ', '个个不同 · ')}<tspan class="strong" fill="var(--eos)">{t('eager, kernel by kernel', 'eager 跑，逐个 kernel')}</tspan></text>

          <g in:fade={{ delay: 900 }}>
            <text x="24" y="306" class="legend">{t('Ch. 11 Step 12 signed off on that with "prefill is compute-bound anyway, so the launches are hidden"', 'Ch. 11 Step 12 当时认可了："反正 prefill 是 compute-bound，启动开销被藏住了"')}</text>
            <text x="24" y="330" class="legend">{t('which is true of a big prefill. It is not true of a small one.', '大 prefill 确实如此。小 prefill 不是。')}</text>
          </g>
        </g>
      {/if}

      <!-- 2: when prefill is launch-bound -->
      {#if cur.scene === 'bound'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('one prefill step · time against the number of tokens in it', '一个 prefill 步 · 用时随其中 token 数变化')}</text>
          <line x1={PL.x0} y1={PL.y0} x2={PL.x1} y2={PL.y0} stroke="var(--line)" />
          <line x1={PL.x0} y1={PL.y0} x2={PL.x0} y2={PL.y1} stroke="var(--line)" />
          {#each [0, 200, 400, 600, 800] as n}
            <text x={px(n)} y={PL.y0 + 16} text-anchor="middle" class="tag">{n}</text>
          {/each}
          <text x={(PL.x0 + PL.x1) / 2} y={PL.y0 + 34} text-anchor="middle" class="tag">{t('tokens in the batch', 'batch 中的 token 数')}</text>
          {#each [0, 4, 8, 12] as ms}
            <text x={PL.x0 - 8} y={py(ms) + 3.5} text-anchor="end" class="tag">{ms} ms</text>
          {/each}

          <!-- the launch-bound region -->
          <g in:fade={{ delay: 900 }}>
            <rect x={PL.x0} y={PL.y1} width={px(LAUNCH_BOUND) - PL.x0} height={PL.y0 - PL.y1} fill="var(--eos)" opacity="0.06" />
            <line x1={px(LAUNCH_BOUND)} y1={PL.y0} x2={px(LAUNCH_BOUND)} y2={PL.y1} stroke="var(--eos)" stroke-dasharray="4 3" />
            <text x={px(LAUNCH_BOUND) / 2 + PL.x0 / 2} y={PL.y1 + 18} text-anchor="middle" class="tag strong" fill="var(--eos)">launch-bound</text>
            <text x="502" y="160" class="tag">{t('the launches are hidden', '启动开销被藏住')}</text>
          </g>

          <!-- the two costs the GPU curve is the larger of -->
          <g in:fade={{ delay: 200 }}>
            <path d="M {px(0)} {py(tMem)} H {px(PL.nMax)}" fill="none" stroke="var(--gen)" stroke-width="1" stroke-dasharray="3 3" opacity="0.55" />
            <path d="M {px(0)} {py(0)} L {px(PL.nMax)} {py((PL.nMax * US_PER_TOKEN) / 1000)}" fill="none" stroke="var(--gen)" stroke-width="1" stroke-dasharray="3 3" opacity="0.55" />
          </g>
          <!-- CPU launch cost: flat, indifferent to how many tokens ride along -->
          <path d="M {px(0)} {py(launchMs)} H {px(PL.nMax)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 3" in:fade={{ delay: 350 }} />
          <!-- GPU time: whichever of the two is larger -->
          <path d="M {px(0)} {py(tMem)} H {px(BALANCE)} L {px(PL.nMax)} {py(gpuMs(PL.nMax))}" fill="none" stroke="var(--gen)" stroke-width="2.5" in:fade={{ delay: 500 }} />
          <g in:fade={{ delay: 800 }}>
            <circle cx={px(BALANCE)} cy={py(tMem)} r="3.5" fill="var(--gen)" />
            <text x={px(BALANCE) - 10} y={py(tMem) - 10} text-anchor="end" class="tag"><tspan class="strong">{BALANCE}</tspan>{t(" · Ch. 4 Step 8's balance point", ' · Ch. 4 Step 8 的平衡点')}</text>
            <text x={px(LAUNCH_BOUND)} y={PL.y0 + 16} text-anchor="middle" class="tag strong" fill="var(--eos)">{LAUNCH_BOUND}</text>
          </g>

          <!-- a real legend, so no label has to sit on the line it names -->
          <g in:fade={{ delay: 1100 }}>
            <rect x="500" y="220" width="152" height="64" rx="7" fill="white" stroke="var(--line)" />
            {#each [
              { l: t('GPU · the larger of these', 'GPU · 两者取大'), c: 'var(--gen)', w: 2.5, d: '', diag: false },
              { l: t('the weight read · 4.8 ms', '权重读取 · 4.8 ms'), c: 'var(--gen)', w: 1, d: '3 3', diag: false },
              { l: t('compute · 16 µs a token', '计算 · 每 token 16 µs'), c: 'var(--gen)', w: 1, d: '3 3', diag: true },
              { l: t('the launches · 9.0 ms', '启动 · 9.0 ms'), c: 'var(--accent)', w: 2, d: '6 3', diag: false },
            ] as e, i}
              {@const y = 232 + i * 14}
              <path d={e.diag ? `M 508 ${y + 3} L 526 ${y - 3}` : `M 508 ${y} H 526`} fill="none" stroke={e.c} stroke-width={e.w} stroke-dasharray={e.d} opacity={e.w === 1 ? 0.7 : 1} />
              <text x="532" y={y + 3} class="legendkey">{e.l}</text>
            {/each}
          </g>

          <g in:fade={{ delay: 1400 }}>
            <text x="18" y="348" class="pt">·</text><text x="28" y="348" class="legend">{t('below ', '低于 ')}<tspan class="strong">{t(`${LAUNCH_BOUND} tokens`, `${LAUNCH_BOUND} 个 token`)}</tspan>{t(' the step costs what the CPU takes to launch it — the same wall decode hit in Ch. 11 Step 4', '，这一步的用时就是 CPU 发起它的用时——正是 Ch. 11 Step 4 里 decode 撞上的那堵墙')}</text>
            <text x="18" y="370" class="pt">·</text><text x="28" y="370" class="legend">{t('a short prompt, the tail chunk of a chunked prefill, a vision encoder: all of them live down there', '短 prompt、chunked prefill 的最后一个 chunk、视觉编码器：都落在这里')}</text>
          </g>
        </g>
      {/if}

      <!-- 3: pad the token count to a rung -->
      {#if cur.scene === 'bucket'}
        {@const batches = [56, 131, 92]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('three prefill batches in a row · the token count is different every time', '连续三个 prefill batch · 每次 token 数都不同')}</text>
          {#each batches as n, i}
            {@const y = 76 + i * 74}
            {@const TP = 3.5}
            {@const rung = padTo(n)}
            <g in:fade={{ delay: i * 500, duration: 250 }}>
              <text x="16" y={y + 20} class="rowlabel">batch {i + 1}</text>
              {#each Array(rung) as _, ci}
                <rect x={90 + ci * TP} y={y} width={TP - 1} height="26" rx="1"
                      fill={ci < n ? 'var(--accent)' : 'white'} stroke={ci < n ? 'none' : 'var(--line)'}
                      opacity={ci < n ? 0.85 : 1} in:fade={{ delay: i * 500 + ci * 3, duration: 80 }} />
              {/each}
              <text x={90 + (n * TP) / 2} y={y + 44} text-anchor="middle" class="tag"><tspan class="strong">{n}</tspan>{t(' real', ' 真实')}</text>
              <text x={90 + n * TP + ((rung - n) * TP) / 2} y={y + 44} text-anchor="middle" class="tag">+{rung - n}</text>
              <text x={90 + rung * TP + 12} y={y + 20} class="tag strong">{t(`→ the ${rung} graph`, `→ ${rung} 的 graph`)}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 1700 }}>
            <text x="18" y="330" class="pt">·</text><text x="28" y="330" class="legend">{t("Ch. 11 Step 10's ladder was ", 'Ch. 11 Step 10 的梯子数的是 ')}<tspan class="strong">{t('requests', 'request')}</tspan>{t('; this one is ', '；这架数的是 ')}<tspan class="strong">{t('tokens', 'token')}</tspan>{t(". Pad up, replay the rung, drop the padding's output.", '。向上补齐，replay 该梯级，丢掉补齐部分的输出。')}</text>
            <text x="18" y="352" class="pt">·</text><text x="28" y="352" class="legend">{t('so far so good — and this is not enough', '到这里都对——但还不够')}</text>
          </g>
        </g>
      {/if}

      <!-- 4: same total, different boundaries -->
      {#if cur.scene === 'bounds'}
        {@const C = 3.4}
        {@const MY = 104}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t(`two prefill batches · both ${TOTAL} tokens · what attention has to compute in each`, `两个 prefill batch · 都是 ${TOTAL} 个 token · attention 在两边各要算什么`)}</text>
          {#each [{ seq: SEQ_A, x: 108 }, { seq: SEQ_B, x: 448 }] as p, b}
            <g in:fade={{ delay: b * 650, duration: 300 }}>
              <text x={p.x} y="70" class="slab strong small">batch {b + 1} · {p.seq.join(' + ')}</text>
              <text x={p.x} y="86" class="tag">{t('keys, in order →', 'keys，按顺序 →')}</text>
              <text x={p.x - 16} y={MY - 6} text-anchor="end" class="tag">queries</text>
              <text x={p.x - 16} y={MY + 6} text-anchor="end" class="tag">↓</text>

              {#each p.seq as n, i}
                {@const o = p.seq.slice(0, i).reduce((a, v) => a + v, 0)}
                <rect x={p.x + o * C} y={MY - 14} width={n * C - 1} height="8" rx="2" fill={SEQC[i]} opacity="0.85" />
                <rect x={p.x - 14} y={MY + o * C} width="8" height={n * C - 1} rx="2" fill={SEQC[i]} opacity="0.85" />
              {/each}

              <rect x={p.x} y={MY} width={TOTAL * C} height={TOTAL * C} fill="#f4f2ec" stroke="var(--line)" />
              {#each p.seq as n, i}
                {@const o = p.seq.slice(0, i).reduce((a, v) => a + v, 0)}
                <path d="M {p.x + o * C} {MY + o * C} L {p.x + o * C} {MY + (o + n) * C} L {p.x + (o + n) * C} {MY + (o + n) * C} Z"
                      fill={SEQC[i]} opacity="0.8" in:fade={{ delay: b * 650 + 300 + i * 220, duration: 350 }} />
              {/each}
              <text x={p.x + (TOTAL * C) / 2} y={MY + TOTAL * C + 20} text-anchor="middle" class="tag">{t(`${p.seq.length} triangles · `, `${p.seq.length} 个三角形 · `)}<tspan class="strong">{p.seq.map((n) => `${n}×${n}`).join(' · ')}</tspan></text>
            </g>
          {/each}
          <g in:fade={{ delay: 1900 }}>
            <text x="18" y="348" class="pt">·</text><text x="28" y="348" class="legend">{t('every token attends back only to the start of ', '每个 token 只回看到')}<tspan class="strong">{t('its own', '自己')}</tspan>{t(' sequence, so the boundaries are part of the work', '序列的开头，所以边界也是工作的一部分')}</text>
            <text x="18" y="370" class="pt">·</text><text x="28" y="370" class="legend">{t('padding gave both batches the same shape. It could not give them the same attention.', '补齐让两个 batch 形状相同，却没法让它们的 attention 相同。')}</text>
          </g>
        </g>
      {/if}

      <!-- 5: everything but attention is token-wise -->
      {#if cur.scene === 'tokenwise'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('one layer, run on each of them · what actually changes between the two?', '一层，分别在两个 batch 上跑 · 两者之间到底什么变了？')}</text>
          <text x="262" y="74" text-anchor="middle" class="slab strong small">batch 1 · {SEQ_A.join('+')}</text>
          <text x="470" y="74" text-anchor="middle" class="slab strong small">batch 2 · {SEQ_B.join('+')}</text>
          <text x="640" y="74" text-anchor="middle" class="tag">{t('same?', '相同？')}</text>
          <line x1="24" y1="82" x2="684" y2="82" stroke="var(--line)" />
          {#each kernelRows as r, i}
            {@const y = 102 + i * 20}
            <g in:fade={{ delay: i * 90, duration: 180 }}>
              {#if r.seam}<rect x="24" y={y - 14} width="660" height="20" rx="4" fill="var(--eos)" opacity="0.09" />{/if}
              <text x="34" y={y} class={r.seam ? 'mono strong' : 'mono'} fill={r.seam ? 'var(--eos)' : undefined}>{r.n}</text>
              <text x="262" y={y} text-anchor="middle" class={r.seam ? 'mono strong' : 'mono muted'} fill={r.seam ? 'var(--eos)' : undefined}>{r.a}</text>
              <text x="470" y={y} text-anchor="middle" class={r.seam ? 'mono strong' : 'mono muted'} fill={r.seam ? 'var(--eos)' : undefined}>{r.b ?? r.a}</text>
              <text x="640" y={y + 1} text-anchor="middle" class="verdict" fill={r.seam ? 'var(--eos)' : '#16a34a'}>{r.seam ? '✗' : '✓'}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 1200 }}>
            <text x="18" y="352" class="pt">·</text><text x="28" y="352" class="legend"><tspan class="strong">{t(`${SAME} rows of ${kernelRows.length} are identical`, `${kernelRows.length} 行里 ${SAME} 行完全相同`)}</tspan>{t(': same kernel, same shapes, same addresses — one recording replays for both batches', '：同样的 kernel、同样的形状、同样的地址——录一次，两个 batch 都能 replay')}</text>
            <text x="18" y="374" class="pt">·</text><text x="28" y="374" class="legend">{t('the row that differs is the only one that has to know where the sequences start', '不同的那行是唯一需要知道序列从哪里开始的')}</text>
          </g>
        </g>
      {/if}

      <!-- 6: cut at every attention -->
      {#if cur.scene === 'cut'}
        {@const BX = 40}
        {@const BW2 = 640}
        {@const BY = 96}
        {@const BH = 44}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t(`one prefill step · ${LAYERS} layers · cut at every attention`, `一个 prefill 步 · ${LAYERS} 层 · 每个 attention 处切一刀`)}</text>
          <rect x={BX} y={BY} width={BW2} height={BH} rx="4" fill="var(--accent)" opacity="0.8" />
          {#each Array(LAYERS) as _, l}
            {@const x = BX + ((l + 0.5) / LAYERS) * BW2}
            <rect x={x - 2} y={BY} width="4" height={BH} fill="var(--eos)" in:fade={{ delay: 120 + l * 10 }} />
            <line x1={x} y1={BY - 8} x2={x} y2={BY + BH + 8} stroke="var(--eos)" stroke-width="1" stroke-dasharray="2 2" in:fade={{ delay: 300 + l * 10 }} />
          {/each}
          <text x={BX} y={BY - 16} class="tag">embed</text>
          <text x={BX + BW2} y={BY - 16} text-anchor="end" class="tag">lm_head</text>
          <text x={BX + BW2 / 2} y={BY + BH + 30} text-anchor="middle" class="tag strong" fill="var(--eos)">{t(`${LAYERS} attentions · ${LAYERS} cuts`, `${LAYERS} 个 attention · ${LAYERS} 刀`)}</text>

          <g in:fade={{ delay: 680 }}>
            <text x="16" y="190" class="rowlabel">{t("what's left between the cuts", '切口之间剩下的')}</text>
            {#each Array(9) as _, i}
              {@const x = 40 + i * 72}
              <rect {x} y="204" width="62" height="34" rx="6" fill="white" stroke="var(--accent)" in:fly={{ y: -6, delay: 680 + i * 35, duration: 180 }} />
              <text x={x + 31} y="225" text-anchor="middle" class="cell">{i < 8 ? t(`piece ${i + 1}`, `第 ${i + 1} 段`) : '…'}</text>
            {/each}
            <text x="40" y="262" class="tag"><tspan class="strong">{t(`${PIECES} pieces`, `${PIECES} 段`)}</tspan>{t(', roughly one layer each · every one of them token-wise, so every one can be recorded at a padded token count', '，大约每层一段 · 每段都逐 token，所以都能按补齐后的 token 数录制')}</text>
          </g>
          <text x="16" y="322" class="legend" in:fade={{ delay: 1050 }}>{t(`${PIECES} recordings per rung instead of one — `, `每个梯级录 ${PIECES} 次而不是一次——`)}<tspan class="strong">{t('that is the whole idea', '这就是全部要点')}</tspan></text>
        </g>
      {/if}

      <!-- 7: the run-time alternation -->
      {#if cur.scene === 'run'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('one prefill step, replayed piecewise · time runs left to right', '一个 prefill 步，分段 replay · 时间从左到右')}</text>
          <text x="80" y="104" text-anchor="end" class="rowlabel">CPU</text>
          <text x="80" y="176" text-anchor="end" class="rowlabel">GPU</text>
          {#each Array(5) as _, i}
            {@const x = 92 + i * 118}
            <g in:fade={{ delay: i * 230, duration: 200 }}>
              <rect {x} y="86" width="18" height="24" rx="4" fill="var(--accent)" opacity="0.9" />
              <text x={x + 9} y="78" text-anchor="middle" class="tag" fill="var(--accent)">replay</text>
              <rect x={x} y="156" width="74" height="26" rx="4" fill="var(--gen)" opacity="0.85" />
              <text x={x + 37} y="174" text-anchor="middle" class="steplabel">{t(`piece ${i + 1}`, `第 ${i + 1} 段`)}</text>

              <rect x={x + 78} y="86" width="30" height="24" rx="4" fill="var(--eos)" opacity="0.85" />
              <text x={x + 93} y="78" text-anchor="middle" class="tag" fill="var(--eos)">eager</text>
              <rect x={x + 78} y="156" width="30" height="26" rx="4" fill="var(--eos)" opacity="0.6" />
              <text x={x + 93} y="174" text-anchor="middle" class="steplabel">attn</text>
            </g>
          {/each}
          <text x="682" y="104" text-anchor="end" class="tag">…</text>
          <text x="682" y="176" text-anchor="end" class="tag">…</text>

          <g in:fade={{ delay: 1250 }}>
            <path d="M 92 212 H 682" fill="none" stroke="var(--line)" />
            <text x="92" y="234" class="tag">{t('the CPU is idle inside every orange block and busy only at the seams', '每个橙色块里 CPU 都空闲，只在接缝处忙')}</text>
            <text x="18" y="284" class="pt">·</text><text x="28" y="284" class="legend">{t(`${PIECES} replays and ${LAYERS} eager attentions: `, `${PIECES} 次 replay 加 ${LAYERS} 次 eager attention：`)}<tspan class="strong">{t(`${PIECES + LAYERS * ATTN_LAUNCHES} things for the CPU to do`, `CPU 要做 ${PIECES + LAYERS * ATTN_LAUNCHES} 件事`)}</tspan>{t(`, not ${KERNELS.toLocaleString()}`, `，而不是 ${KERNELS.toLocaleString()} 件`)}</text>
            <text x="18" y="306" class="pt">·</text><text x="28" y="306" class="legend">{t('attention is still launched the old way, and it is the one kernel big enough not to care', 'attention 仍按老方式启动，而它是唯一大到不在乎启动开销的 kernel')}</text>
          </g>
        </g>
      {/if}

      <!-- 8: the arithmetic -->
      {#if cur.scene === 'arith'}
        {@const X = 160}
        {@const SC = 52}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t(`CPU time for one prefill step · the GPU needs ${fmt(tMem)} of it at small token counts`, `一个 prefill 步的 CPU 用时 · token 数小时 GPU 只需要其中 ${fmt(tMem)}`)}</text>
          {#each [
            { t: 'eager', ms: launchMs, c: 'var(--eos)', sub: t(`${KERNELS.toLocaleString()} launches × ${LAUNCH_US} µs`, `${KERNELS.toLocaleString()} 次启动 × ${LAUNCH_US} µs`) },
            { t: t('piecewise', '分段'), ms: pieceTotal, c: '#16a34a', sub: t(`${PIECES} replays (${(pieceMs * 1000).toFixed(0)} µs) + ${LAYERS} eager attentions (${(attnMs * 1000).toFixed(0)} µs)`, `${PIECES} 次 replay (${(pieceMs * 1000).toFixed(0)} µs) + ${LAYERS} 次 eager attention (${(attnMs * 1000).toFixed(0)} µs)`) },
            { t: t('one whole-model graph', '一个整模型 graph'), ms: 0.02, c: 'var(--faint)', sub: t('not available here: the shape changes every batch', '这里用不了：形状每个 batch 都变') },
          ] as row, i}
            {@const y = 90 + i * 68}
            <g in:fade={{ delay: i * 230, duration: 200 }}>
              <text x={X - 12} y={y + 18} text-anchor="end" class="rowlabel">{row.t}</text>
              <rect x={X} y={y} width={Math.max(3, row.ms * SC)} height="26" rx="4" fill={row.c} opacity="0.85" />
              <text x={X + Math.max(3, row.ms * SC) + 10} y={y + 18} class="tag strong">{row.ms < 0.1 ? '20 µs' : fmt(row.ms)}</text>
              <text x={X} y={y + 44} class="tag">{row.sub}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 780 }}>
            <line x1={X + tMem * SC} y1="78" x2={X + tMem * SC} y2="300" stroke="var(--gen)" stroke-width="1.5" stroke-dasharray="4 3" />
            <text x={X + tMem * SC + 8} y="296" class="tag strong" fill="var(--gen)">{t(`the GPU's ${fmt(tMem)}`, `GPU 的 ${fmt(tMem)}`)}</text>
            <text x={X + tMem * SC - 8} y="296" text-anchor="end" class="tag" fill="#16a34a">{t('anything left of this line is free', '这条线左边的部分都免费')}</text>
          </g>
          <g in:fade={{ delay: 1080 }}>
            <text x="18" y="342" class="pt">·</text><text x="28" y="342" class="legend"><tspan class="strong">{t("You don't need one graph. You need the CPU under the GPU.", '不必一个 graph，只要 CPU 用时低于 GPU。')}</tspan></text>
            <text x="18" y="364" class="pt">·</text><text x="28" y="364" class="legend">{t(`piecewise costs ${Math.round(pieceTotal / 0.02)}× what a whole-model graph costs and buys the same thing, because both are under ${fmt(tMem)}`, `分段的花费是整模型 graph 的 ${Math.round(pieceTotal / 0.02)} 倍，买到的却一样，因为两者都低于 ${fmt(tMem)}`)}</text>
          </g>
        </g>
      {/if}

      <!-- 9: the rung schedule, as the gap between rungs -->
      {#if cur.scene === 'ladder'}
        {@const lx = (n: number) => 90 + (Math.log(n / 4) / Math.log(1024)) * 570}
        {@const ly = (v: number) => 270 - (Math.log(v / 4) / Math.log(128)) * 160}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t("the gap between rungs, against the size of the batch · SGLang's default schedule", '梯级间隔随 batch 大小变化 · SGLang 的默认调度')}</text>

          <line x1="90" y1="290" x2="660" y2="290" stroke="var(--line)" />
          {#each [4, 32, 256, 1024, 4096] as n}
            <line x1={lx(n)} y1="290" x2={lx(n)} y2="296" stroke="var(--faint)" />
            <text x={lx(n)} y="310" text-anchor="middle" class="tag">{n}</text>
          {/each}
          <text x="375" y="330" text-anchor="middle" class="tag">{t('tokens in the batch', 'batch 中的 token 数')}</text>
          <line x1="90" y1="290" x2="90" y2="100" stroke="var(--line)" />
          {#each [4, 16, 64, 256] as v}
            <line x1="84" y1={ly(v)} x2="90" y2={ly(v)} stroke="var(--faint)" />
            <text x="78" y={ly(v) + 3.5} text-anchor="end" class="tag">{v}</text>
          {/each}
          <text x="44" y="98" class="tag">{t('gap', '间隔')}</text>

          {#each SCHED as b, i}
            <g in:fade={{ delay: i * 320, duration: 250 }}>
              {#if i > 0}
                <line x1={lx(b.from)} y1={ly(SCHED[i - 1].by)} x2={lx(b.from)} y2={ly(b.by)} stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 2" opacity="0.5" />
              {/if}
              <line x1={lx(b.from)} y1={ly(b.by)} x2={lx(b.to)} y2={ly(b.by)} stroke="var(--accent)" stroke-width="3" />
              {#each Array(Math.round((b.to - b.from) / b.by) + 1) as _, k}
                <line x1={lx(b.from + k * b.by)} y1={ly(b.by) - 4} x2={lx(b.from + k * b.by)} y2={ly(b.by) + 4} stroke="var(--accent)" stroke-width="1" opacity="0.7" />
              {/each}
              <text x={(lx(b.from) + lx(b.to)) / 2} y={ly(b.by) - 22} text-anchor="middle" class="tag strong">{t(`every ${b.by}`, `每隔 ${b.by}`)}</text>
              <text x={(lx(b.from) + lx(b.to)) / 2} y={ly(b.by) - 10} text-anchor="middle" class="tag">{b.from}–{b.to}</text>
            </g>
          {/each}

          <g in:fade={{ delay: 1500 }}>
            <text x="18" y="358" class="pt">·</text><text x="28" y="358" class="legend">{t('above 32 tokens the gap stays under ', '超过 32 个 token 后，间隔保持在')}<tspan class="strong">{t('a sixteenth of the batch', 'batch 的十六分之一以下')}</tspan></text>
            <text x="18" y="380" class="pt">·</text><text x="28" y="380" class="legend">{t('so padding costs a fixed share of the work, never a fixed number of tokens', '所以补齐花的是固定比例的工作量，而非固定 token 数')}</text>
            <text x="112" y="150" class="tag strong">{t(`${rungs.length} rungs in all`, `共 ${rungs.length} 个梯级`)}</text>
            <text x="112" y="166" class="tag">{t(`${PIECES} recordings each`, `每个录 ${PIECES} 次`)}</text>
            <text x="112" y="182" class="tag">{t('built once at startup', '启动时建一次')}</text>
          </g>
        </g>
      {/if}

      <!-- 10: the other seams -->
      {#if cur.scene === 'seams'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="48" class="rowlabel">{t('what gets cut out · and the one question behind all of it', '哪些被切出去 · 以及背后的同一个问题')}</text>
          {#each [
            { t: 'attention', s: t('needs the sequence boundaries, which change every batch', '需要序列边界，而边界每个 batch 都变'), c: 'var(--eos)' },
            { t: 'all-reduce', s: t(`waits on the other GPUs in the group · chapter ${CH_TP}`, `要等组里其他 GPU · 第 ${CH_TP} 章`), c: '#0891b2' },
            { t: 'MoE dispatch', s: t('how many tokens go to each expert is decided by the tokens', '发给每个 expert 多少 token 由 token 本身决定'), c: 'var(--gen)' },
          ] as row, i}
            {@const y = 68 + i * 46}
            <g in:fly={{ x: -8, delay: i * 150, duration: 250 }}>
              <rect x="30" y={y} width="660" height="36" rx="8" fill="#fbfaf7" stroke={row.c} />
              <text x="48" y={y + 23} class="slab strong small">{row.t}</text>
              <text x="230" y={y + 23} class="tag">{row.s}</text>
            </g>
          {/each}

          <g in:fade={{ delay: 550, duration: 300 }}>
            <rect x="150" y="228" width="420" height="34" rx="17" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="360" y="250" text-anchor="middle" class="slab small">{t('does its work depend on the ', '它的工作依赖')}<tspan class="strong">{t('data', '数据')}</tspan>{t(', or only on the ', '，还是只依赖')}<tspan class="strong">{t('token count', 'token 数')}</tspan>{t('?', '？')}</text>
          </g>
          <g in:fade={{ delay: 800, duration: 300 }}>
            <path d="M 260 264 L 190 292" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#pw-arrow)" />
            <path d="M 460 264 L 530 292" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#pw-arrow)" />

            <rect x="60" y="296" width="250" height="56" rx="10" fill="#fbfaf7" stroke="#16a34a" />
            <text x="185" y="318" text-anchor="middle" class="slab strong small" fill="#16a34a">{t('only the token count', '只看 token 数')}</text>
            <text x="185" y="338" text-anchor="middle" class="tag">{t('pad it, record it, put it in a piece', '补齐、录制、放进一段里')}</text>

            <rect x="410" y="296" width="250" height="56" rx="10" fill="#fbfaf7" stroke="var(--eos)" />
            <text x="535" y="318" text-anchor="middle" class="slab strong small" fill="var(--eos)">{t('the data', '数据')}</text>
            <text x="535" y="338" text-anchor="middle" class="tag">{t('leave it out; it becomes a seam', '留在外面，成为接缝')}</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade={{ delay: 1150 }}>{t('the seam list is configuration, not a law: an engine names the ops it wants to cut at', '接缝清单是配置，不是定律：引擎自己指定要在哪些 op 处切')}</text>
        </g>
      {/if}

      <!-- 11: who finds the seams -->
      {#if cur.scene === 'tracer'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t(`how ${PIECES} capture regions get found without anyone writing them down`, `${PIECES} 个捕获区如何被找到，而不用任何人手写`)}</text>
          {#each [
            { t: t('1 · the model', '1 · 模型'), l: [t('a Python class,', '一个 Python 类，'), t('a forward() that', '一个 forward()，'), t('calls other modules', '调用其他模块')], c: 'var(--muted)' },
            { t: t('2 · trace it', '2 · trace'), l: [t('run it once with', '跑一遍，让'), t('Dynamo watching;', 'Dynamo 看着；'), t('record every op', '记下每个 op')], c: 'var(--accent)' },
            { t: t('3 · cut', '3 · 切'), l: [t('at the named ops:', '在指定的 op 处：'), t('attention, all-reduce,', 'attention、all-reduce、'), t('MoE dispatch', 'MoE dispatch')], c: 'var(--eos)' },
            { t: t('4 · capture', '4 · 录制'), l: [t(`${PIECES} subgraphs,`, `${PIECES} 个子图，`), t('each recorded per', '每个按梯级录制'), t('rung — Ch. 11 Step 10', '——Ch. 11 Step 10')], c: '#16a34a' },
          ] as b, i}
            {@const x = 22 + i * 172}
            <g in:fly={{ y: 8, delay: i * 320, duration: 300 }}>
              <rect {x} y="76" width="152" height="112" rx="12" fill="#fbfaf7" stroke={b.c} />
              <text x={x + 14} y="100" class="slab strong small">{b.t}</text>
              {#each b.l as line, k}<text x={x + 14} y={124 + k * 17} class="tag">{line}</text>{/each}
            </g>
            {#if i < 3}
              <path d="M {x + 156} 132 H {x + 170}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#pw-arrow)" in:fade={{ delay: i * 320 + 250 }} />
            {/if}
          {/each}
          <g in:fade={{ delay: 1400 }}>
            <text x="22" y="226" class="rowlabel">{t('what the tracer hands back', 'tracer 交回的东西')}</text>
            <rect x="22" y="238" width="668" height="46" rx="8" fill="white" stroke="var(--line)" />
            {#each tracedOps as op, i}
              {#if op.seam}
                <text x={op.x} y="270" class="scissors" fill="var(--eos)" in:fade={{ delay: 1400 + i * 60 }}>✂</text>
                <text x={op.x + 20} y="266" class="mono strong" fill="var(--eos)" in:fade={{ delay: 1400 + i * 60 }}>{op.n}</text>
              {:else}
                <text x={op.x} y="266" class="mono muted" in:fade={{ delay: 1400 + i * 60 }}>{op.n}</text>
              {/if}
            {/each}
            <text x="18" y="322" class="pt">·</text><text x="28" y="322" class="legend">{t('a flat list of operations, in order, with the seams marked — ', '一张按顺序排开的操作清单，接缝已标出——')}<tspan class="strong">{t('the graph was always there; nobody had written it down', '图一直都在，只是没人写下来过')}</tspan></text>
            <text x="18" y="344" class="pt">·</text><text x="28" y="344" class="legend">{t('SGLang wraps the model in ', 'SGLang 正是为此把模型包进 ')}<tspan class="mono">torch.compile</tspan>{t(' for exactly this, then replaces each subgraph with a replayable piece', '，再把每个子图换成可 replay 的一段')}</text>
          </g>
        </g>
      {/if}

      <!-- 12: the tracer has a second half -->
      {#if cur.scene === 'closing'}
        {@const chain = [{ n: 'gate·up', mm: true }, { n: 'silu', mm: false }, { n: 'mul', mm: false }, { n: 'down', mm: true }]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="36" class="rowlabel">{t('one piece, up close · the token-wise chain the tracer handed back unchanged', '放大看一段 · tracer 原样交回的逐 token 链')}</text>

          <!-- the CPU's whole involvement, for scale -->
          <rect x="16" y="94" width="68" height="52" rx="8" fill="white" stroke="var(--faint)" stroke-dasharray="3 3" />
          <text x="50" y="116" text-anchor="middle" class="boxtitle">CPU</text>
          <text x="50" y="134" text-anchor="middle" class="tag">{t('asleep', '在睡')}</text>
          <path d="M 88 120 H 104" fill="none" stroke="var(--faint)" stroke-width="1.2" marker-end="url(#pw-arrow)" />

          <rect x="108" y="48" width="584" height="214" rx="12" fill="#fbfaf7" stroke="var(--gen)" />
          <text x="122" y="68" class="boxtitle">GPU</text>
          <text x="404" y="72" text-anchor="middle" class="tag">{t('the arithmetic happens up here, in registers on the SM', '算术在上面发生，在 SM 的寄存器里')}</text>

          {#each chain as k, i}
            {@const cx = 175 + i * 150}
            <g in:fade={{ delay: i * 200, duration: 220 }}>
              <path d="M {cx - 30} 222 V 132" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#pw-arrow-hot)" />
              <rect x={cx - 55} y="84" width="110" height="42" rx="8" fill={k.mm ? 'var(--fg)' : 'var(--accent)'} opacity={k.mm ? 0.75 : 0.9} />
              <text x={cx} y="110" text-anchor="middle" class="kname">{k.n}</text>
              <path d="M {cx + 30} 132 V 218" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#pw-arrow-hot)" />
              {#if i === 0}
                <text x={cx - 36} y="176" text-anchor="end" class="tag">{t('read', '读')}</text>
                <text x={cx + 36} y="176" class="tag">{t('write', '写')}</text>
              {/if}
            </g>
          {/each}

          <g in:fade={{ delay: 1000 }}>
            <rect x="262" y="78" width="276" height="54" rx="10" fill="none" stroke="var(--eos)" stroke-dasharray="4 3" />
          </g>
          <rect x="120" y="222" width="560" height="32" rx="8" fill="#f4f2ec" stroke="var(--line)" />
          <text x="136" y="242" class="boxtitle">HBM</text>
          <text x="184" y="242" class="tag">{t("the GPU's own 80 GB — the weights and the KV cache are in here too", 'GPU 自己的 80 GB——权重和 KV cache 也在这里面')}</text>

          <g in:fade={{ delay: 900 }}>
            <text x="18" y="290" class="pt">·</text><text x="28" y="290" class="legend"><tspan class="strong">{t(`${chain.length} kernels, ${chain.length * 2} trips`, `${chain.length} 个 kernel，${chain.length * 2} 趟`)}</tspan>{t(' — and every arrow is inside the GPU. The CPU sent one replay and went back to sleep.', '——每个箭头都在 GPU 内部。CPU 发了一次 replay 就回去睡了。')}</text>
            <text x="18" y="312" class="pt">·</text><text x="28" y="312" class="legend">{t("a kernel's registers are gone the moment it ends, so whatever the next one needs has to go out to memory and come back", 'kernel 一结束寄存器就没了，下一个要用的东西必须先写进内存再读回来')}</text>
            <text x="18" y="334" class="pt">·</text><text x="28" y="334" class="legend">{t(`×${LAYERS} layers, and again for every token in the batch`, `×${LAYERS} 层，batch 里每个 token 再来一遍`)}</text>
          </g>
          <text x="16" y="374" class="legend" in:fade={{ delay: 1400 }}>{t('Nothing but ', '只有 ')}<tspan class="mono strong">mul</tspan>{t(' ever reads what ', ' 读 ')}<tspan class="mono strong">silu</tspan>{t(' wrote, and it wants it immediately. ', ' 写的东西，而且要立刻就要。')}<tspan class="strong">{t('So why are they two kernels?', '那为什么它们是两个 kernel？')}</tspan></text>
        </g>
      {/if}

    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .cell { font-family: var(--mono); font-size: 10px; fill: var(--fg); }
  .legendkey { font-size: 8.5px; fill: var(--muted); }
  .scissors { font-size: 17px; }
  .tag.strong, .tag .strong, .mono .strong { fill: var(--fg); font-weight: 600; }
  .verdict { font-size: 15px; font-weight: 700; }
</style>
