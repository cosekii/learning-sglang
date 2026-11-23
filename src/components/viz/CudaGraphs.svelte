<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import { chapterNumber as chNum, chapters, type NavLink } from '../../chapters';
  import { W_GB, BW, LAYERS } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const CH_NEXT = chNum('12-piecewise-cuda-graph');

  // ---- Numbers: Llama-3-8B bf16 on one H100, as in chapters 4 to 10 ----------------------------------
  const tMem = W_GB / BW;                                  // 4.8 ms: the GPU work of a decode step at small batch
  const KERNELS = 1000;
  const LAUNCH_US = 9;
  const launchMs = (KERNELS * LAUNCH_US) / 1000;           // 9 ms of CPU per step
  const REPLAY_US = 20;
  const kernelUs = (tMem * 1000 / KERNELS).toFixed(0);   // ~5 µs: the average kernel at batch 1
  const fmt = (ms: number) => (ms < 10 ? ms.toFixed(1) : ms.toFixed(0)) + ' ms';
  const CAPTURED = [1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 160, 256];

  type Scene = 'zoom' | 'layer' | 'lanes' | 'eager' | 'record' | 'replay' | 'shape' | 'ladder' | 'pad' | 'shapes' | 'buffers' | 'closing';
  interface Step { caption: string; captionZh: string; scene: Scene; v?: number }
  const steps: Step[] = [
    { scene: 'zoom', v: 0, caption: `Back to Ch. 9 Step 5's three lanes. The scheduler's lane is a row of decode steps, ${fmt(tMem)} each. Pick one and zoom in.`, captionZh: `回到 Ch. 9 Step 5 的三条泳道。scheduler 那条是一排 decode 步，每步 ${fmt(tMem)}。选一个放大。` },
    { scene: 'zoom', v: 1, caption: `One step is one forward pass through the whole model. Our example throughout is <b>Llama-3-8B</b>: an embedding, ${LAYERS} identical layers, a final projection to logits, then sampling. Almost all of the ${fmt(tMem)} is the ${LAYERS} layers.`, captionZh: `一步就是对整个模型做一次前向。全书的例子是 <b>Llama-3-8B</b>：embedding、${LAYERS} 个相同的层、投影到 logits，再采样。${fmt(tMem)} 几乎全花在这 ${LAYERS} 层上。` },
    { scene: 'layer', caption: `Zoom into a layer and it isn't one thing either. The GPU runs it as 11 kernels: norm, QKV matmul, RoPE, attention, output matmul, add, norm, gate-up matmul, SiLU, down matmul, add. Times ${LAYERS}, plus the ends: about a thousand kernels a step.`, captionZh: `一层也由 11 个 kernel 组成：norm、qkv、rope、attn、o、add、norm、gate·up、silu、down、add。× ${LAYERS} 加首尾，一步约一千个。` },
    { scene: 'lanes', v: 0, caption: `Each kernel is launched by the CPU: Python, PyTorch's dispatcher, the CUDA driver, about ${LAUNCH_US} µs each. A thousand of them is ${fmt(launchMs)} of CPU work for a step whose GPU work is ${fmt(tMem)}. At small batch the GPU waits on its launcher.`, captionZh: `每个 kernel 由 CPU 启动：Python、dispatcher、CUDA driver，约 ${LAUNCH_US} µs 一次。一千次共 ${fmt(launchMs)} CPU 时间，GPU 工作却只有 ${fmt(tMem)}。小 batch 时 GPU 在等 CPU。` },
    { scene: 'eager', caption: `Closer still. <b>Eager mode</b> is a conversation, one kernel at a time: Python calls PyTorch, the dispatcher picks a kernel, the driver hands it over. About ${LAUNCH_US} µs to ask, ${kernelUs} µs to run, then the GPU waits.`, captionZh: `再放大。<b>Eager 模式</b>像对话，一次一个 kernel：Python 调 PyTorch，dispatcher 选 kernel，driver 递交。问 ${LAUNCH_US} µs，跑 ${kernelUs} µs，然后 GPU 等。` },
    { scene: 'record', caption: `<b>Recording.</b> Run the step once with capture on and nothing executes. Each launch is written down instead: which kernel, which addresses it reads and writes, how many rows. Built once at startup, not once per step.`, captionZh: `<b>录制。</b>开着 capture 跑一遍这一步，什么都不执行。每次启动被记下来：哪个 kernel、读写哪些地址、多少行。启动时建一次，不是每步一次。` },
    { scene: 'replay', caption: `<b>Replay.</b> One call hands the GPU the finished list, and it walks the entries itself, back to back. A thousand round trips became one, and the CPU is out of the loop for the rest of the step.`, captionZh: `<b>回放。</b>一次调用把整张清单交给 GPU，它自己一个接一个执行。一千次往返变成一次，这一步剩下的时间 CPU 不再参与。` },
    { scene: 'lanes', v: 1, caption: `Back to the two lanes. The CPU spends ${REPLAY_US} µs, the GPU runs the thousand kernels back to back: ${fmt(tMem)}. The CPU is free for the whole step, which is exactly what Ch. 10 Step 9's overlap needed.`, captionZh: `回到两条泳道。CPU 只花 ${REPLAY_US} µs，GPU 一个接一个跑完一千个 kernel：${fmt(tMem)}。整步 CPU 都空闲，这正是 Ch. 10 Step 9 的 overlap 需要的。` },
    { scene: 'shape', caption: `A recording is literal: this kernel, these addresses, this many rows. Give it more rows than it saw and the extra ones are never touched — including the output buffer the CPU reads afterwards. Nothing below the engine will stop you.`, captionZh: `录制是字面的：这个 kernel、这些地址、这么多行。给它更多行，多出的永远不会被碰，包括 CPU 之后要读的输出缓冲区。engine 以下没有任何东西会拦你。` },
    { scene: 'ladder', caption: `But the running batch changes size every few steps as requests finish and join. So at startup the engine records a ladder of graphs, one per size: ${CAPTURED.slice(0, 4).join(', ')} … ${CAPTURED[CAPTURED.length - 1]}. A few seconds, once.`, captionZh: `但 batch 大小每隔几步就变，request 有完成有加入。所以 engine 启动时录一架 graph 梯子，每尺寸一个：${CAPTURED.slice(0, 4).join(', ')} … ${CAPTURED[CAPTURED.length - 1]}。几秒，一次。` },
    { scene: 'pad', caption: `So a batch of 37 is padded up to the next rung, 48. The 11 dummy rows go through the whole step and their logits are thrown away, which still costs far less than a thousand launches.`, captionZh: `所以 37 的 batch 补到下一档 48。11 行 dummy 走完整个步骤，logits 被丢弃，代价仍远低于一千次启动。` },
    { scene: 'shapes', caption: `Only decode gets graphs: its batches are [B, 1], so the ladder covers them. Prefill is ragged, different every batch, and runs eagerly, which is fine because prefill is compute-bound anyway. Ch. 6 Step 3's two shapes, again.`, captionZh: `只有 decode 录 graph：batch 是 [B, 1]，梯子罩得住。prefill 长短不齐，每个 batch 都不同，eager 跑；反正 prefill 是 compute-bound。即 Ch. 6 Step 3 的两种形状。` },
    { scene: 'buffers', caption: `The addresses are frozen, so nothing can be passed in as an argument. Instead each request's sampled token is written back into its own slot in the same buffer, and the same recording is replayed. Ch. 1 Step 11's loop, in place.`, captionZh: `地址冻结，无法传参。每个 request 采出的 token 写回同一 buffer 中自己的槽位，回放同一份录制。Ch. 1 Step 11 的循环，原地跑。` },
    { scene: 'closing', caption: `What a graph can't hold: anything data-dependent. MoE routing, speculative verification, attention plans that change shape, a .item() that syncs with the CPU. Cut the graph there and replay the pieces: chapter ${CH_NEXT}.`, captionZh: `graph 装不下依赖数据的东西：MoE 路由、投机验证、变形状的 attention 计划、同步 CPU 的 .item()。在那里切开，分段回放：第 ${CH_NEXT} 章。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  const v = $derived(cur.v ?? 0);
  const W = 720, H = 400;

  // ---- zoom: chapter 9's lanes, then one step fills the width ------------------------------------------
  const TL = { x: 150, pxPerMs: 13 };
  const LANE = { server: 70, sched: 122, detok: 174 };
  const PICK = 2;                                           // which decode step we zoom into
  const BAR = { x: 60, y: 70, w: 600, h: 34 };
  const small = { x: TL.x + PICK * tMem * TL.pxPerMs, y: LANE.sched, w: tMem * TL.pxPerMs - 1, h: 28 };
  const zoomT = $derived(v === 0
    ? `translate(${small.x - BAR.x}px, ${small.y - BAR.y}px) scale(${small.w / BAR.w}, ${small.h / BAR.h})`
    : 'translate(0px, 0px) scale(1, 1)');

  // one layer's kernels, widths ∝ rough time share at small batch
  const layerOps = [
    { n: 'norm', w: 3, c: '#8a8780' }, { n: 'qkv', w: 10, c: 'var(--accent)' }, { n: 'rope', w: 2, c: '#8a8780' }, { n: 'attn', w: 8, c: 'var(--gen)' },
    { n: 'o', w: 6, c: 'var(--accent)' }, { n: 'add', w: 1.5, c: '#8a8780' }, { n: 'norm', w: 3, c: '#8a8780' }, { n: 'gate·up', w: 18, c: 'var(--accent)' },
    { n: 'silu', w: 2, c: '#8a8780' }, { n: 'down', w: 12, c: 'var(--accent)' }, { n: 'add', w: 1.5, c: '#8a8780' },
  ];
  const layerTotal = layerOps.reduce((a, o) => a + o.w, 0);
  // the step bar, as segments: embed, 32 layers, lm_head, sample (share of the 600px)
  const ENDS = { embed: 8, head: 22, sample: 10 };
  const layersW = BAR.w - ENDS.embed - ENDS.head - ENDS.sample;

  // ---- recording scene -----------------------------------------------------------------------------------
  const recorded = [
    { k: 'norm', a: '0x7f10', b: '0x7f11' }, { k: 'qkv', a: '0x7f11', b: '0x7f12' }, { k: 'rope', a: '0x7f12', b: '0x7f12' },
    { k: 'attn', a: '0x7f12', b: '0x7f13' }, { k: 'o', a: '0x7f13', b: '0x7f14' }, { k: 'add', a: '0x7f14', b: '0x7f10' },
  ];
  // one frame for the eager / record / replay trio: the boxes hold still, only their contents change
  const FR = { cpu: 40, cpuW: 190, graph: 258, graphW: 300, gpu: 580, gpuW: 116, y: 64, h: 252 };
  // Three decode steps in a row. A decode step feeds ONE new token per request, so ids is [B]:
  // the rows are requests, not positions in a sequence. stepIds[c] is step c's ids; stepIds[c+1] is
  // what it samples, which is why the sampled column and the next step's ids column are the same list.
  const B_EX = 48;
  const OURS = 1;                                   // the request we follow, with chapter 1's tokens
  const stepIds = [[92, 374, 1120], [41, 12366, 887], [5, 13, 62], [77, 128001, 300]];
  const decode: Record<number, string> = { 374: '" is"', 12366: '" Paris"', 13: '"."', 128001: '<EOS>' };
  const trip = recorded.slice(0, 4);      // the round trips drawn in the eager ladder
  const listed = recorded.slice(0, 5);    // the entries drawn in the graph list

  // ---- ladder scene: running batch size over steps --------------------------------------------------------
  const sizes = [37, 37, 38, 38, 36, 36, 36, 41, 41, 40, 44, 44, 43, 43, 43, 51, 51, 50, 50, 48, 48, 61, 61, 60, 59, 59, 59, 58, 66, 66, 65, 65, 70, 70, 69, 69, 68, 72, 72, 71];
  const padTo = (n: number) => CAPTURED.find((c) => c >= n) ?? CAPTURED[CAPTURED.length - 1];

</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="CUDA graphs, step {step + 1}">
      <defs>
        <marker id="cg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
        </marker>
        <marker id="cg-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
        <marker id="cg-arrow-back" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
        </marker>
      </defs>

      <!-- 1–2: from chapter 9's lanes into one step -->
      {#if cur.scene === 'zoom'}
        <g transition:fade={{ duration: 250 }}>
          {#if v === 0}
            <g out:fade={{ duration: 300 }}>
              <text x="16" y="44" class="rowlabel">{t("Ch. 9 Step 5 · three processes · the scheduler's lane is decode steps", 'Ch. 9 Step 5 · 三个进程 · scheduler 那条泳道是 decode 步')}</text>
              {#each [['server + tokenizer', LANE.server], ['scheduler + GPU', LANE.sched], ['detokenizer', LANE.detok]] as [name, y]}
                <text x={TL.x - 10} y={(y as number) + 18} text-anchor="end" class="rowlabel">{name}</text>
                <line x1={TL.x} y1={(y as number) + 14} x2={TL.x + 25 * TL.pxPerMs} y2={(y as number) + 14} stroke="var(--line)" />
              {/each}
              {#each [{ t: 0.9, ms: 2.1 }, { t: 5.5, ms: 0.6 }, { t: 10.3, ms: 0.6 }, { t: 11, ms: 1.6 }, { t: 15.1, ms: 0.6 }, { t: 19.9, ms: 0.6 }] as sg}
                <rect x={TL.x + sg.t * TL.pxPerMs} y={LANE.server} width={Math.max(3, sg.ms * TL.pxPerMs - 1)} height="28" rx="3" fill="var(--accent)" opacity="0.85" />
              {/each}
              {#each Array(5) as _, i}
                {#if i !== PICK}
                  <rect x={TL.x + i * tMem * TL.pxPerMs} y={LANE.sched} width={tMem * TL.pxPerMs - 1} height="28" rx="3" fill="var(--gen)" opacity="0.85" />
                  <text x={TL.x + (i + 0.5) * tMem * TL.pxPerMs} y={LANE.sched + 18} text-anchor="middle" class="steplabel">{t('step', '步')}</text>
                {/if}
              {/each}
              {#each Array(4) as _, i}
                <rect x={TL.x + ((i + 1) * tMem + 0.1) * TL.pxPerMs} y={LANE.detok} width="5" height="28" rx="2" fill="#0891b2" opacity="0.9" />
              {/each}
              <line x1={TL.x} y1="220" x2={TL.x + 25 * TL.pxPerMs} y2="220" stroke="var(--line)" />
              {#each [0, 5, 10, 15, 20] as ms}<text x={TL.x + ms * TL.pxPerMs} y="234" text-anchor="middle" class="tag">{ms} ms</text>{/each}
              <g in:fade={{ delay: 800 }}>
                <rect x={small.x - 4} y={small.y - 4} width={small.w + 8} height={small.h + 8} rx="5" fill="none" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="4 3" />
                <text x={small.x + small.w / 2} y={small.y - 10} text-anchor="middle" class="tag strong">{t('this one', '这一个')}</text>
              </g>
            </g>
          {:else}
            <g in:fade={{ delay: 500 }}>
              <text x="16" y="44" class="rowlabel">{t(`one decode step · Llama-3-8B · ${fmt(tMem)} of GPU time`, `一个 decode 步 · Llama-3-8B · GPU 时间 ${fmt(tMem)}`)}</text>
              <!-- segment separators drawn over the zoomed bar -->
              <text x={BAR.x + ENDS.embed / 2} y={BAR.y + BAR.h + 16} text-anchor="middle" class="tag">embed</text>
              {#each Array(LAYERS) as _, l}
                <line x1={BAR.x + ENDS.embed + (l / LAYERS) * layersW} y1={BAR.y} x2={BAR.x + ENDS.embed + (l / LAYERS) * layersW} y2={BAR.y + BAR.h} stroke="white" stroke-width="1.5" in:fade={{ delay: 500 + l * 25 }} />
              {/each}
              <line x1={BAR.x + ENDS.embed + layersW} y1={BAR.y} x2={BAR.x + ENDS.embed + layersW} y2={BAR.y + BAR.h} stroke="white" stroke-width="1.5" />
              <line x1={BAR.x + ENDS.embed + layersW + ENDS.head} y1={BAR.y} x2={BAR.x + ENDS.embed + layersW + ENDS.head} y2={BAR.y + BAR.h} stroke="white" stroke-width="1.5" />
              <text x={BAR.x + ENDS.embed + layersW / 2} y={BAR.y + BAR.h + 16} text-anchor="middle" class="tag strong">{t(`${LAYERS} layers, identical in shape, different weights`, `${LAYERS} 层，形状相同，权重不同`)}</text>
              <text x={BAR.x + BAR.w} y={BAR.y + BAR.h + 16} text-anchor="end" class="tag">lm_head · sample</text>
              <g in:fade={{ delay: 1400 }}>
                <text x={BAR.x - 10} y="180" class="pt">·</text><text x={BAR.x} y="180" class="legend">{t('the model, once: ', '模型跑一遍：')}<tspan class="strong">{t(`ids → embedding → layer 1 → layer 2 → … → layer ${LAYERS} → logits → one token`, `ids → embedding → 层 1 → 层 2 → … → 层 ${LAYERS} → logits → 一个 token`)}</tspan></text>
                <text x={BAR.x - 10} y="204" class="pt">·</text><text x={BAR.x} y="204" class="legend">{t('every layer reads its slice of the 16 GB of weights (Ch. 4 Step 2) and its slice of the KV cache (Ch. 3 Step 3)', '每层读自己那份 16 GB 权重（Ch. 4 Step 2）和自己那份 KV cache（Ch. 3 Step 3）')}</text>
                <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('each layer is a few hundred microseconds; the picture is about to get finer', '每层几百微秒；接下来画面会更细')}</text>
              </g>
            </g>
          {/if}
          <!-- the picked step: the same rect in both views, transformed -->
          <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx="4" fill="var(--gen)" opacity="0.9" class="zoomrect" style:transform={zoomT} />
          {#if v === 0}<text x={small.x + small.w / 2} y={small.y + 18} text-anchor="middle" class="steplabel">{t('step', '步')}</text>{/if}
        </g>
      {/if}

      <!-- 3: one layer, 11 kernels -->
      {#if cur.scene === 'layer'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t(`one decode step · ${LAYERS} layers · one of them zoomed`, `一个 decode 步 · ${LAYERS} 层 · 放大其中一层`)}</text>
          <rect x={BAR.x} y={BAR.y} width={BAR.w} height={BAR.h} rx="4" fill="var(--gen)" opacity="0.35" />
          {#each Array(LAYERS) as _, l}
            <line x1={BAR.x + ENDS.embed + (l / LAYERS) * layersW} y1={BAR.y} x2={BAR.x + ENDS.embed + (l / LAYERS) * layersW} y2={BAR.y + BAR.h} stroke="white" stroke-width="1.5" />
          {/each}
          <rect x={BAR.x + ENDS.embed + (5 / LAYERS) * layersW} y={BAR.y} width={layersW / LAYERS} height={BAR.h} fill="var(--gen)" />
          <text x={BAR.x + ENDS.embed + (5.5 / LAYERS) * layersW} y={BAR.y - 6} text-anchor="middle" class="tag strong">{t('layer 6', '第 6 层')}</text>
          <g in:fade={{ delay: 400 }}>
            <path d="M {BAR.x + ENDS.embed + (5 / LAYERS) * layersW} {BAR.y + BAR.h} L 100 172 M {BAR.x + ENDS.embed + (6 / LAYERS) * layersW} {BAR.y + BAR.h} L 660 172" fill="none" stroke="var(--faint)" stroke-dasharray="3 3" />
            <text x="126" y="164" class="rowlabel">{t(`one layer · ${layerOps.length} kernels · ~${(tMem * 1000 / LAYERS).toFixed(0)} µs`, `一层 · ${layerOps.length} 个 kernel · ~${(tMem * 1000 / LAYERS).toFixed(0)} µs`)}</text>
            {#each layerOps as o, k}
              {@const x0 = 100 + (layerOps.slice(0, k).reduce((a, p) => a + p.w, 0) / layerTotal) * 560}
              {@const w = (o.w / layerTotal) * 560}
              <rect x={x0 + 1} y="176" width={w - 2} height="40" rx="4" fill={o.c} opacity="0.9" in:fly={{ y: 6, delay: 500 + k * 70, duration: 200 }} />
              {#if w > 26}<text x={x0 + w / 2} y="200" text-anchor="middle" class="steplabel">{o.n}</text>{/if}
            {/each}
            <rect x="100" y="234" width="12" height="12" rx="2" fill="var(--accent)" /><text x="118" y="244" class="tag">{t('matmul against the weights', '权重 matmul')}</text>
            <rect x="330" y="234" width="12" height="12" rx="2" fill="var(--gen)" /><text x="348" y="244" class="tag">{t('attention over the KV cache', 'KV cache 上的 attention')}</text>
            <rect x="530" y="234" width="12" height="12" rx="2" fill="#8a8780" /><text x="548" y="244" class="tag">{t('everything else', '其余')}</text>
          </g>
          <g in:fade={{ delay: 1600 }}>
            <text x="18" y="296" class="pt">·</text><text x="28" y="296" class="legend">{t(`${layerOps.length} × ${LAYERS} = ${layerOps.length * LAYERS}, plus the ends and every small PyTorch op between them: `, `${layerOps.length} × ${LAYERS} = ${layerOps.length * LAYERS}，加上首尾和中间每个 PyTorch 小算子：`)}<tspan class="strong">{t(`about ${KERNELS.toLocaleString()} kernels a step`, `一步约 ${KERNELS.toLocaleString()} 个 kernel`)}</tspan></text>
            <text x="18" y="320" class="pt">·</text><text x="28" y="320" class="legend">{t(`at batch size 1 the average one runs for about ${(tMem * 1000 / KERNELS).toFixed(0)} µs. Keep that number in mind.`, `batch size 为 1 时，平均每个跑约 ${(tMem * 1000 / KERNELS).toFixed(0)} µs。记住这个数。`)}</text>
          </g>
        </g>
      {/if}

      <!-- 4 and 8: CPU launch lane vs GPU lane -->
      {#if cur.scene === 'lanes'}
        {@const graph = v === 1}
        {@const px = 52}
        {@const X0 = 150}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="52" class="rowlabel">{graph ? t('the same step, replayed from a CUDA graph', '同一步，从 CUDA graph 回放') : t('the same step, launched kernel by kernel (eager mode)', '同一步，逐个 kernel 启动（eager 模式）')} · {t('batch size 1', 'batch 大小 1')}</text>
          <text x={X0 - 10} y="112" text-anchor="end" class="rowlabel">{t('CPU · launches', 'CPU · 启动')}</text>
          {#if !graph}<text x={X0 - 10} y="126" text-anchor="end" class="tag">{KERNELS.toLocaleString()} × {LAUNCH_US} µs = {fmt(launchMs)}</text>{/if}
          <text x={X0 - 10} y="172" text-anchor="end" class="rowlabel">{t('GPU · runs', 'GPU · 执行')}</text>
          <text x={X0 - 10} y="186" text-anchor="end" class="tag">{t(`${fmt(tMem)} of work`, `${fmt(tMem)} 的工作`)}</text>
          {#if !graph}
            {#each Array(40) as _, i}
              {@const tm = (i / 40) * launchMs}
              <rect x={X0 + tm * px} y="100" width={(launchMs / 40) * px - 1.5} height="28" rx="2" fill="var(--accent)" opacity="0.85" in:fade={{ delay: i * 20, duration: 80 }} />
              <rect x={X0 + tm * px + 2} y="160" width={((tMem / 40) * px) - 1.5} height="28" rx="2" fill="var(--gen)" opacity="0.85" in:fade={{ delay: i * 20 + 30, duration: 80 }} />
            {/each}
            <g in:fade={{ delay: 1100 }}>
              <path d="M {X0} 214 H {X0 + launchMs * px}" fill="none" stroke="var(--eos)" stroke-width="1.5" />
              <text x={X0 + (launchMs * px) / 2} y="232" text-anchor="middle" class="tag" fill="var(--eos)">{t(`step = ${fmt(launchMs)} · GPU busy ${Math.round((tMem / launchMs) * 100)}% of it`, `一步 = ${fmt(launchMs)} · GPU 忙碌占 ${Math.round((tMem / launchMs) * 100)}%`)}</text>
            </g>
          {:else}
            <rect x={X0} y="100" width="4" height="28" rx="1" fill="var(--accent)" in:fade />
            <text x={X0 + 10} y="118" class="tag">{t(`one launch · ${REPLAY_US} µs · then the CPU is free`, `一次启动 · ${REPLAY_US} µs · 之后 CPU 空闲`)}</text>
            <rect x={X0} y="160" width={tMem * px} height="28" rx="3" fill="var(--gen)" opacity="0.85" in:fly={{ x: -20, duration: 400 }} />
            <text x={X0 + (tMem * px) / 2} y="178" text-anchor="middle" class="steplabel">{t(`${KERNELS.toLocaleString()} kernels, back to back`, `${KERNELS.toLocaleString()} 个 kernel，一个接一个`)}</text>
            <g in:fade={{ delay: 700 }}>
              <path d="M {X0} 214 H {X0 + tMem * px}" fill="none" stroke="#16a34a" stroke-width="1.5" />
              <text x={X0 + (tMem * px) / 2} y="232" text-anchor="middle" class="tag" fill="#16a34a">{t(`step = ${fmt(tMem)} · GPU busy ~100%`, `一步 = ${fmt(tMem)} · GPU 忙碌 ~100%`)}</text>
            </g>
          {/if}
          <line x1={X0} y1="256" x2={X0 + 10 * px} y2="256" stroke="var(--line)" />
          {#each [0, 2, 4, 6, 8, 10] as ms}<text x={X0 + ms * px} y="270" text-anchor="middle" class="tag">{ms} ms</text>{/each}
          <g in:fade={{ delay: 1500 }}>
            {#if !graph}
              <text x="18" y="318" class="pt">·</text><text x="28" y="318" class="legend">{t(`the GPU finishes each ${(tMem * 1000 / KERNELS).toFixed(0)} µs kernel before the CPU has launched the next one, and idles in between`, `GPU 跑完每个 ${(tMem * 1000 / KERNELS).toFixed(0)} µs 的 kernel 时，CPU 还没启动下一个，中间空闲`)}</text>
              <text x="18" y="340" class="pt">·</text><text x="28" y="340" class="legend">{t('this is why batch-1 decode in plain PyTorch runs at roughly half the speed the memory bandwidth allows', '所以纯 PyTorch 的 batch-1 decode 只有内存带宽允许速度的一半左右')}</text>
            {:else}
              <text x="16" y="318" class="legend">{t('the recording played back: ', '回放录制：')}<tspan class="mono">graph.replay()</tspan>{t(', one driver call, no Python in the loop', '，一次 driver 调用，循环里没有 Python')}</text>
            {/if}
          </g>
        </g>
      {/if}

      <!-- 5: eager, one launch at a time -->
      {#if cur.scene === 'eager'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t(`eager · one launch per kernel · the first ${trip.length} of about ${KERNELS.toLocaleString()} in this step`, `eager · 每个 kernel 一次启动 · 这一步约 ${KERNELS.toLocaleString()} 个中的前 ${trip.length} 个`)}</text>

          <line x1="22" y1="96" x2="22" y2="296" stroke="var(--line)" marker-end="url(#cg-arrow)" />
          <text x="13" y="196" text-anchor="middle" transform="rotate(-90 13 196)" class="tag">{t('time', '时间')}</text>

          <rect x={FR.cpu} y={FR.y} width={FR.cpuW} height={FR.h} rx="12" fill="#fbfaf7" stroke="var(--accent)" />
          <text x="54" y="86" class="boxtitle">CPU · Python</text>
          <rect x={FR.gpu} y={FR.y} width={FR.gpuW} height={FR.h} rx="12" fill="#fbfaf7" stroke="var(--gen)" />
          <text x="594" y="86" class="boxtitle">GPU</text>
          <text x="404" y="86" text-anchor="middle" class="tag">driver · PCIe</text>

          {#each trip as r, i}
            {@const yc = 104 + i * 48}
            <g in:fade={{ delay: i * 520, duration: 200 }}>
              <rect x="54" y={yc - 11} width="162" height="22" rx="4" fill="var(--accent)" opacity="0.9" />
              <text x="64" y={yc + 4} class="kname">{t('launch', '启动')} {r.k}</text>
              <text x="206" y={yc + 4} text-anchor="end" class="steplabel">{LAUNCH_US} µs</text>
            </g>
            <path d="M 238 {yc} L 574 {yc + 13}" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#cg-arrow-hot)" in:fly={{ x: -330, delay: i * 520 + 180, duration: 300 }} />
            <g in:fade={{ delay: i * 520 + 400, duration: 200 }}>
              <rect x="592" y={yc + 3} width="92" height="22" rx="4" fill="var(--gen)" opacity="0.9" />
              <text x="600" y={yc + 18} class="kname">{t('run', '执行')} {r.k}</text>
              <text x="678" y={yc + 18} text-anchor="end" class="steplabel">{kernelUs} µs</text>
            </g>
            {#if i < trip.length - 1}
              <g in:fade={{ delay: i * 520 + 580, duration: 200 }}>
                <rect x="592" y={yc + 29} width="92" height="16" rx="4" fill="none" stroke="var(--eos)" stroke-dasharray="3 3" opacity="0.6" />
                <text x="638" y={yc + 41} text-anchor="middle" class="tag" fill="var(--eos)">{t('idle', '空闲')}</text>
              </g>
            {/if}
          {/each}
          <text x="54" y="288" class="mono muted">… ×{KERNELS.toLocaleString()}</text>
          <text x="592" y="288" class="tag">{t('… and waiting', '… 继续等')}</text>

          <g in:fade={{ delay: 2400, duration: 300 }}>
            <path d="M 574 310 H 238" fill="none" stroke="var(--faint)" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#cg-arrow-back)" />
            <text x="404" y="302" text-anchor="middle" class="tag">{t('one sync at the end of the step · the CPU reads the logits', '步末一次同步 · CPU 读 logits')}</text>
          </g>

          <text x="18" y="342" class="pt">·</text><text x="28" y="342" class="legend">{t('nothing comes back per kernel — the launches go one way, a thousand of them: ', '每个 kernel 都没有回音——启动是单向的，共一千次：')}<tspan class="strong">{t(`${LAUNCH_US} µs to ask, ${kernelUs} µs to run`, `问 ${LAUNCH_US} µs，跑 ${kernelUs} µs`)}</tspan></text>
          <text x="18" y="364" class="pt">·</text><text x="28" y="364" class="legend">{t(`so the GPU's ${fmt(tMem)} of real work is stretched over ${fmt(launchMs)} of launching, idle in every gap`, `于是 GPU ${fmt(tMem)} 的实际工作被拖成 ${fmt(launchMs)} 的启动，每个间隙都空闲`)}</text>
        </g>
      {/if}

      <!-- 6: recording -->
      {#if cur.scene === 'record'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('recording · the same launches, with capture on · nothing executes', '录制 · 同样的启动，开着 capture · 什么都不执行')}</text>

          <rect x={FR.cpu} y={FR.y} width={FR.cpuW} height={FR.h} rx="12" fill="#fbfaf7" stroke="var(--accent)" />
          <text x="54" y="86" class="boxtitle">CPU · Python</text>
          <rect x={FR.gpu} y={FR.y} width={FR.gpuW} height={FR.h} rx="12" fill="#fbfaf7" stroke="var(--gen)" />
          <text x="594" y="86" class="boxtitle">GPU</text>

          <rect x={FR.graph} y="88" width={FR.graphW} height="228" rx="10" fill="white" stroke="var(--fg)" stroke-dasharray="4 3" />
          <text x="272" y="112" class="tag strong">{t('the graph · a list of launches', 'graph · 一张启动清单')}</text>

          {#each listed as r, i}
            {@const yc = 134 + i * 34}
            <g in:fade={{ delay: i * 420, duration: 200 }}>
              <rect x="54" y={yc - 11} width="162" height="22" rx="4" fill="var(--accent)" opacity="0.9" />
              <text x="64" y={yc + 4} class="kname">{t('launch', '启动')} {r.k}</text>
            </g>
            <path d="M 236 {yc} H 254" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#cg-arrow-hot)" in:fade={{ delay: i * 420 + 160, duration: 200 }} />
            <g in:fly={{ x: -16, delay: i * 420 + 260, duration: 250 }}>
              <text x="272" y={yc + 4} class="mono">{i + 1}. {r.k}</text>
              <text x="340" y={yc + 4} class="mono muted">{t('in', '入')} {r.a}</text>
              <text x="404" y={yc + 4} class="mono muted">{t('out', '出')} {r.b}</text>
              <text x="472" y={yc + 4} class="mono muted">{t('[64 rows]', '[64 行]')}</text>
            </g>
          {/each}
          <text x="54" y="302" class="mono muted">… ×{KERNELS.toLocaleString()}</text>
          <text x="272" y="302" class="tag">{t(`… ${KERNELS.toLocaleString()} entries · every address fixed`, `… ${KERNELS.toLocaleString()} 条 · 地址全部固定`)}</text>

          <g in:fade={{ delay: 2200, duration: 300 }}>
            <rect x="594" y="150" width="88" height="80" rx="8" fill="none" stroke="var(--faint)" stroke-dasharray="3 3" />
            <text x="638" y="184" text-anchor="middle" class="tag">{t('nothing', '什么都')}</text>
            <text x="638" y="200" text-anchor="middle" class="tag">{t('runs yet', '没执行')}</text>
          </g>

          <text x="18" y="342" class="pt">·</text><text x="28" y="342" class="legend">{t('an entry pins the kernel, the addresses it reads and writes, and the row count — ', '一条记录钉死 kernel、它读写的地址和行数——')}<tspan class="strong">{t('no Python left in it', '里面没有 Python')}</tspan></text>
          <text x="18" y="364" class="pt">·</text><text x="28" y="364" class="legend">{t('the engine records once per rung at startup, not once per step', 'engine 启动时每档录一次，不是每步一次')}</text>
        </g>
      {/if}

      <!-- 7: replay -->
      {#if cur.scene === 'replay'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('replay · one message, then the GPU walks the list by itself', '回放 · 一条消息，然后 GPU 自己走完清单')}</text>

          <rect x={FR.cpu} y={FR.y} width={FR.cpuW} height={FR.h} rx="12" fill="#fbfaf7" stroke="var(--accent)" />
          <text x="54" y="86" class="boxtitle">CPU · Python</text>
          <rect x={FR.gpu} y={FR.y} width={FR.gpuW} height={FR.h} rx="12" fill="#fbfaf7" stroke="var(--gen)" />
          <text x="594" y="86" class="boxtitle">GPU</text>

          <rect x={FR.graph} y="88" width={FR.graphW} height="228" rx="10" fill="white" stroke="var(--fg)" stroke-dasharray="4 3" />
          <text x="272" y="112" class="tag strong">{t('the graph, recorded last step', '上一步录好的 graph')}</text>

          <text x="54" y="112" class="tag strong">{t(`one message · ${REPLAY_US} µs`, `一条消息 · ${REPLAY_US} µs`)}</text>
          <rect x="54" y="123" width="162" height="22" rx="4" fill="var(--accent)" opacity="0.9" />
          <text x="64" y="138" class="kname">graph.replay()</text>
          <path d="M 236 134 H 254" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#cg-arrow-hot)" />
          <g in:fade={{ delay: 900, duration: 300 }}>
            <text x="54" y="180" class="tag">{t('then nothing. The CPU is free', '然后没有别的。CPU 空闲')}</text>
            <text x="54" y="196" class="tag">{t('for the rest of the step —', '这一步剩下的时间——')}</text>
            <text x="54" y="212" class="tag">{t("Ch. 10 Step 9's overlap, paid for.", 'Ch. 10 Step 9 的 overlap 兑现了。')}</text>
          </g>

          {#each listed as r, i}
            {@const yc = 134 + i * 34}
            <text x="272" y={yc + 4} class="mono">{i + 1}. {r.k}</text>
            <text x="340" y={yc + 4} class="mono">@ {r.a}</text>
            <text x="412" y={yc + 4} class="mono muted">{t('[64 rows]', '[64 行]')}</text>
            <path d="M 562 {yc} H 576" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#cg-arrow-hot)" in:fade={{ delay: 400 + i * 260, duration: 180 }} />
            <g in:fade={{ delay: 500 + i * 260, duration: 200 }}>
              <rect x="592" y={yc - 11} width="92" height="22" rx="4" fill="var(--gen)" opacity="0.9" />
              <text x="600" y={yc + 4} class="kname">{t('run', '执行')} {r.k}</text>
            </g>
          {/each}
          <text x="272" y="302" class="tag">{t(`… ${KERNELS.toLocaleString()} entries`, `… ${KERNELS.toLocaleString()} 条`)}</text>
          <text x="592" y="302" class="tag">{t('… back to back', '… 一个接一个')}</text>

          <text x="18" y="342" class="pt">·</text><text x="28" y="342" class="legend">{t('every address was baked in at record time, so there is ', '每个地址在录制时就定死了，所以')}<tspan class="strong">{t('nothing to pass and nothing to decide', '无需传参，无需决策')}</tspan></text>
          <text x="18" y="364" class="pt">·</text><text x="28" y="364" class="legend">{t(`${fmt(launchMs)} of CPU became ${REPLAY_US} µs. The GPU's ${fmt(tMem)} is unchanged — and now it is the whole step.`, `${fmt(launchMs)} 的 CPU 变成 ${REPLAY_US} µs。GPU 的 ${fmt(tMem)} 不变——现在它就是整步。`)}</text>
        </g>
      {/if}

      <!-- 9: the recording is literal about shape -->
      {#if cur.scene === 'shape'}
        {@const CW = 9}
        {@const IN = 30}
        {@const OUT = 400}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('one entry from a graph recorded at batch size 64', 'batch size 64 录制的 graph 中的一条')}</text>
          <rect x="30" y="60" width="660" height="52" rx="10" fill="white" stroke="var(--fg)" stroke-dasharray="4 3" />
          <text x="46" y="82" class="mono">2. qkv matmul · {t('reads', '读')} 0x7f11 <tspan class="strong">[64 × 4096]</tspan> · {t('writes', '写')} 0x7f12 <tspan class="strong">[64 × 12288]</tspan></text>
          <text x="46" y="100" class="tag">{t('the row count and the addresses are part of the entry, not arguments', '行数和地址是记录的一部分，不是参数')}</text>

          <text x={IN} y="136" class="boxtitle">{t('rows handed to the replay', '交给回放的行')}</text>
          <text x={OUT} y="136" class="boxtitle">{t('the buffer the CPU reads afterwards', 'CPU 之后读的缓冲区')}</text>

          <g in:fade={{ delay: 400 }}>
            <text x={IN} y="164" class="slab strong small">{t('a batch of 64', 'batch 为 64')}</text>
            {#each Array(16) as _, i}<rect x={IN + i * CW} y="172" width={CW - 2} height="22" rx="2" fill="var(--gen)" opacity="0.85" />{/each}
            <path d="M 300 183 H 386" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#cg-arrow)" />
            <text x="343" y="177" text-anchor="middle" class="tag">{t('replay', '回放')}</text>
            {#each Array(16) as _, i}<rect x={OUT + i * CW} y="172" width={CW - 2} height="22" rx="2" fill="#16a34a" opacity="0.85" />{/each}
            <text x="556" y="190" class="verdict" fill="#16a34a">✓</text>
            <text x={IN} y="212" class="tag">{t('64 rows in · exactly what the entry expects', '入 64 行 · 正是记录期望的')}</text>
            <text x={OUT} y="212" class="tag">{t('64 rows written · ', '写出 64 行 · ')}<tspan fill="#16a34a">{t("every one is this step's", '每一行都是这一步的')}</tspan></text>
          </g>

          <g in:fade={{ delay: 1200 }}>
            <text x={IN} y="252" class="slab strong small">{t('a batch of 96', 'batch 为 96')}</text>
            {#each Array(24) as _, i}<rect x={IN + i * CW} y="260" width={CW - 2} height="22" rx="2" fill={i < 16 ? 'var(--gen)' : 'var(--eos)'} opacity="0.85" />{/each}
            <path d="M 300 271 H 386" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#cg-arrow)" />
            <text x="343" y="265" text-anchor="middle" class="tag">{t('replay', '回放')}</text>
            {#each Array(24) as _, i}
              {#if i < 16}
                <rect x={OUT + i * CW} y="260" width={CW - 2} height="22" rx="2" fill="#16a34a" opacity="0.85" />
              {:else}
                <rect x={OUT + i * CW} y="260" width={CW - 2} height="22" rx="2" fill="none" stroke="var(--eos)" stroke-dasharray="2 2" />
              {/if}
            {/each}
            <text x={OUT + 20 * CW} y="254" text-anchor="middle" class="tag" fill="var(--eos)">{t('never written', '从未写入')}</text>
            <text x="628" y="278" class="verdict" fill="var(--eos)">✗</text>
            <text x={IN} y="300" class="tag">{t('96 rows in · ', '入 96 行 · ')}<tspan fill="var(--eos)">{t('rows 65–96 were never in the recording', '第 65–96 行不在录制里')}</tspan></text>
            <text x={OUT} y="300" class="tag">{t('still 64 written · ', '仍只写 64 行 · ')}<tspan fill="var(--eos)">{t("the CPU reads last step's logits for 32 requests", 'CPU 读到 32 个 request 上一步的 logits')}</tspan></text>
          </g>

          <g in:fade={{ delay: 2000 }}>
            <text x="20" y="332" class="pt">·</text><text x="30" y="332" class="legend">{t("no error, no crash: shapes aren't arguments to ", '不报错，不崩溃：形状不是 ')}<tspan class="mono">replay()</tspan>{t(", they're inside the recording, so ", ' 的参数，它们在录制里，所以')}<tspan class="strong">{t('CUDA has nothing to check', 'CUDA 无从检查')}</tspan></text>
            <text x="20" y="354" class="pt">·</text><text x="30" y="354" class="legend">{t('the guard has to sit above it, in the engine — which is what the next two steps are', '防护必须在它上面，在 engine 里——接下来两步讲的就是这个')}</text>
          </g>
        </g>
      {/if}

      <!-- 10: batch size varies, so record a ladder -->
      {#if cur.scene === 'ladder'}
        {@const X = 60}
        {@const Y = 200}
        {@const px = 14}
        {@const py = 1.3}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('the running batch over 40 decode steps · requests finish, newcomers join', '40 个 decode 步中运行的 batch · request 有完成，有新的加入')}</text>
          <line x1={X} y1={Y} x2={X + 40 * px} y2={Y} stroke="var(--line)" />
          {#each [0, 20, 40, 60, 80] as b}
            <line x1={X - 3} y1={Y - b * py} x2={X} y2={Y - b * py} stroke="var(--line)" />
            <text x={X - 7} y={Y - b * py + 3.5} text-anchor="end" class="tag">{b}</text>
          {/each}

          {#each sizes as n, i}
            <rect x={X + i * px} y={Y - n * py} width={px - 2} height={n * py} fill="var(--gen)" opacity="0.6" in:fade={{ delay: i * 30, duration: 120 }} />
            <rect x={X + i * px} y={Y - padTo(n) * py} width={px - 2} height="2" fill="var(--accent)" in:fade={{ delay: 1400 + i * 20, duration: 120 }} />
          {/each}
          <text x={X} y={Y + 18} class="tag" in:fade={{ delay: 1400 }}>{t('bars: requests running · ', '柱：运行中的 request · ')}<tspan fill="var(--accent)" font-weight="600">{t('dashes', '横线')}</tspan>{t(': the rung it replays on', '：回放所用的档位')}</text>
          <g in:fade={{ delay: 2000 }}>
            <text x="16" y="250" class="rowlabel">{t('so, at startup: one graph per rung', '于是启动时：每档一个 graph')}</text>
            {#each CAPTURED as B, i}
              {@const x = 40 + i * 49}
              <rect {x} y="262" width="42" height="30" rx="6" fill="white" stroke="var(--accent)" in:fly={{ y: -6, delay: 2000 + i * 50, duration: 200 }} />
              <text x={x + 21} y="282" text-anchor="middle" class="cell">{B}</text>
            {/each}
            <text x="40" y="316" class="tag"><tspan class="mono">Capture cuda graph bs [{CAPTURED.join(', ')}]</tspan> · {t('a few seconds, once', '几秒，一次')}</text>
            <text x="40" y="352" class="legend">{t('rungs are closer together at small sizes, where a step is cheapest and padding would waste the most', '小尺寸处档位更密：那里一步最便宜，padding 浪费最大')}</text>
          </g>
        </g>
      {/if}

      <!-- 11: padding -->
      {#if cur.scene === 'pad'}
        {@const RUN = 37}
        {@const RUNG = padTo(RUN)}
        {@const CW = 624 / RUNG}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t(`a step arrives with ${RUN} running requests · the ladder has 32 and ${RUNG}`, `一步到来，有 ${RUN} 个运行中的 request · 梯子上有 32 和 ${RUNG}`)}</text>
          {#each CAPTURED as B, i}
            {@const x = 40 + i * 49}
            <rect {x} y="60" width="42" height="30" rx="6" fill={B === RUNG ? 'var(--accent)' : 'white'} stroke="var(--accent)" opacity={B === 32 || B === RUNG ? 1 : 0.4} />
            <text x={x + 21} y="80" text-anchor="middle" class={B === RUNG ? 'steplabel' : 'cell'} fill={B === RUNG ? 'white' : 'var(--fg)'}>{B}</text>
          {/each}
          <text x={40 + CAPTURED.indexOf(RUNG) * 49 + 21} y="108" text-anchor="middle" class="tag"><tspan class="strong">32</tspan>{t(' is too small → pad up to ', ' 太小 → 补到 ')}<tspan class="strong">{RUNG}</tspan>{t(', the next rung', '，下一档')}</text>

          <g in:fade={{ delay: 500 }}>
            <text x="40" y="142" class="boxtitle">{t('rows in', '输入行')}</text>
            {#each Array(RUNG) as _, i}
              <rect x={40 + i * CW} y="150" width={CW - 2} height="26" rx="2" fill={i < RUN ? 'var(--gen)' : 'white'} stroke={i < RUN ? 'none' : 'var(--line)'} stroke-dasharray={i < RUN ? 'none' : '2 2'} opacity={i < RUN ? 0.85 : 1} in:fade={{ delay: 500 + i * 16, duration: 100 }} />
            {/each}
            <text x={40 + (RUN * CW) / 2} y="194" text-anchor="middle" class="tag"><tspan class="strong">{t(`${RUN} real`, `${RUN} 真实`)}</tspan></text>
            <text x={40 + RUN * CW + ((RUNG - RUN) * CW) / 2} y="194" text-anchor="middle" class="tag">{t(`${RUNG - RUN} dummy`, `${RUNG - RUN} 占位`)}</text>
          </g>

          <g in:fade={{ delay: 1300 }}>
            <path d="M 360 200 V 214" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#cg-arrow)" />
            <rect x="256" y="220" width="208" height="28" rx="14" fill="var(--gen)" opacity="0.9" />
            <text x="360" y="239" text-anchor="middle" class="kname">{t(`replay the ${RUNG} graph · ${fmt(tMem)}`, `回放 ${RUNG} 的 graph · ${fmt(tMem)}`)}</text>
            <path d="M 360 254 V 268" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#cg-arrow)" />
          </g>

          <g in:fade={{ delay: 1900 }}>
            <text x="40" y="288" class="boxtitle">{t('logits out', '输出 logits')}</text>
            {#each Array(RUNG) as _, i}
              <rect x={40 + i * CW} y="296" width={CW - 2} height="26" rx="2" fill={i < RUN ? '#16a34a' : 'none'} stroke={i < RUN ? 'none' : 'var(--eos)'} stroke-dasharray={i < RUN ? 'none' : '2 2'} opacity={i < RUN ? 0.85 : 1} />
            {/each}
            <text x={40 + (RUN * CW) / 2} y="340" text-anchor="middle" class="tag" fill="#16a34a">{t(`${RUN} → the sampler`, `${RUN} → 采样器`)}</text>
            <text x={40 + RUN * CW + ((RUNG - RUN) * CW) / 2} y="340" text-anchor="middle" class="tag" fill="var(--eos)">{t(`${RUNG - RUN} dropped`, `${RUNG - RUN} 丢弃`)}</text>
            <text x="40" y="368" class="legend">{t(`${RUNG - RUN} wasted rows of a memory-bound step cost almost nothing; a thousand launches would have cost ${fmt(launchMs)}`, `memory-bound 的一步里，${RUNG - RUN} 行浪费几乎无代价；一千次启动要花 ${fmt(launchMs)}`)}</text>
          </g>
        </g>
      {/if}

      <!-- 12: decode only -->
      {#if cur.scene === 'shapes'}
        <g transition:fade={{ duration: 250 }}>
          <rect x="24" y="64" width="330" height="240" rx="12" fill="#fbfaf7" stroke="var(--gen)" />
          <text x="40" y="86" class="boxtitle">{t('a decode batch', '一个 decode batch')}</text>
          {#each Array(6) as _, i}
            <text x="40" y={116 + i * 18} class="cell">req {i + 1}</text>
            <rect x="82" y={105 + i * 18} width="10" height="14" rx="2" fill="var(--gen)" opacity="0.85" in:fade={{ delay: i * 60 }} />
          {/each}
          <text x="40" y="228" class="cell">… ×B</text>
          <text x="40" y="256" class="slab small">{t('shape [B, 1] · only B changes', '形状 [B, 1] · 只有 B 变')}</text>
          <text x="40" y="276" class="tag">{t('a rung per B, padded up · ', '每个 B 一档，向上补 · ')}<tspan class="strong" fill="#16a34a">{t('replayable', '可回放')}</tspan></text>

          <rect x="366" y="64" width="330" height="240" rx="12" fill="#fbfaf7" stroke="var(--accent)" />
          <text x="382" y="86" class="boxtitle">{t('a prefill batch', '一个 prefill batch')}</text>
          {#each [18, 27, 11] as n, i}
            <text x="382" y={116 + i * 26} class="cell">seq {i + 1}</text>
            {#each Array(n) as _, ti}
              <rect x={424 + ti * 9.5} y={105 + i * 26} width="8" height="14" rx="2" fill="var(--accent)" opacity="0.85" in:fade={{ delay: (i * 20 + ti) * 10, duration: 100 }} />
            {/each}
          {/each}
          <text x="382" y="228" class="cell">{t('different lengths every batch', '每个 batch 长度都不同')}</text>
          <text x="382" y="256" class="slab small">{t('shape [Σ tokens, …] · ragged', '形状 [Σ tokens, …] · 长短不齐')}</text>
          <text x="382" y="276" class="tag">{t('no two alike · ', '没有两个相同 · ')}<tspan class="strong" fill="var(--eos)">eager</tspan>{t(', and fine: compute-bound anyway', '，没关系：反正 compute-bound')}</text>
        </g>
      {/if}

      <!-- 13: the addresses are frozen, so how do the next tokens get in? -->
      {#if cur.scene === 'buffers'}
        {@const CX = [130, 330, 530]}
        {@const SLOT = [0, 1, 2]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="44" class="rowlabel">{t('three decode steps in a row · each row is a request, each column is a step', '连续的三个 decode 步 · 每行一个 request，每列一步')}</text>
          <text x="16" y="58" class="tag">{t(`${B_EX} = the rung this graph was recorded for · 128256 = tokens in Llama-3's vocabulary`, `${B_EX} = 这份 graph 录制的档位 · 128256 = Llama-3 词表的 token 数`)}</text>

          <!-- one band per fixed address: the three boxes inside it are the same memory at three moments -->
          <rect x="120" y="80" width="562" height="92" rx="14" fill="#f4f2ec" stroke="var(--line)" />
          <rect x="120" y="214" width="562" height="40" rx="14" fill="#f4f2ec" stroke="var(--line)" />

          <text x="16" y="82" class="tag strong">ids @ 0x7f00</text>
          <text x="16" y="94" class="tag muted">{t('one buffer', '一个缓冲区')}</text>
          {#each SLOT as r}<text x="16" y={106 + r * 22} class="mono" fill={r === OURS ? 'var(--accent)' : 'var(--muted)'}>req {r}</text>{/each}
          <text x="16" y="168" class="mono muted">{t(`… ${B_EX - 3} more`, `… 还有 ${B_EX - 3} 个`)}</text>
          <text x="16" y="232" class="tag strong">logits @ 0x7f20</text>
          <text x="16" y="244" class="tag muted">{t('one buffer', '一个缓冲区')}</text>
          <text x="16" y="270" class="tag strong">{t('sampled', '采样结果')}</text>
          {#each SLOT as r}<text x="16" y={282 + r * 22} class="mono" fill={r === OURS ? 'var(--accent)' : 'var(--muted)'}>req {r}</text>{/each}

          {#each CX as X, c}
            {@const cx = X + 70}
            <g in:fade={{ delay: c * 650, duration: 300 }}>
              <text x={cx} y="72" text-anchor="middle" class="rowlabel">{t('step', '步')} {c === 0 ? 't' : `t+${c}`}</text>

              <rect x={X} y="88" width="140" height="76" rx="8" fill="white" stroke="var(--accent)" />
              {#each SLOT as r}
                {@const id = stepIds[c][r]}
                <rect x={X + 10} y={93 + r * 22} width="120" height="18" rx="3" fill={r === OURS ? 'var(--accent-soft)' : 'none'} />
                <text x={X + 20} y={106 + r * 22} class={r === OURS ? 'mono ours' : 'mono'}>{id}</text>
                {#if r === OURS}<text x={X + 66} y={106 + r * 22} class="mono ours">{decode[id]}</text>{/if}
              {/each}

              <path d="M {cx} 168 V 178" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#cg-arrow)" />
              <rect x={X + 10} y="182" width="120" height="22" rx="11" fill="var(--gen)" opacity="0.9" />
              <text x={cx} y="197" text-anchor="middle" class="kname">{t('replay', '回放')}</text>
              <path d="M {cx} 208 V 218" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#cg-arrow)" />

              <rect x={X} y="222" width="140" height="24" rx="6" fill="white" stroke="#16a34a" />
              <text x={cx} y="238" text-anchor="middle" class="mono">[ {B_EX} × 128256 ]</text>
              <path d="M {cx} 250 V 260" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#cg-arrow)" />

              <rect x={X} y="264" width="140" height="76" rx="8" fill="#fbfaf7" stroke="var(--accent)" />
              {#each SLOT as r}
                {@const id = stepIds[c + 1][r]}
                <rect x={X + 10} y={269 + r * 22} width="120" height="18" rx="3" fill={r === OURS ? 'var(--accent-soft)' : 'none'} />
                <text x={X + 20} y={282 + r * 22} class={r === OURS ? 'mono ours' : 'mono'}>{id}</text>
                {#if r === OURS}<text x={X + 66} y={282 + r * 22} class="mono ours">{decode[id]}</text>{/if}
              {/each}
            </g>

            {#if c < CX.length - 1}
              {@const gx = X + 165}
              <g in:fade={{ delay: c * 650 + 450, duration: 300 }}>
                <path d="M {X + 140} 300 H {gx} V 124 H {CX[c + 1] + 6}" fill="none" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#cg-arrow-hot)" />
                <text x={gx - 6} y="213" text-anchor="middle" transform="rotate(-90 {gx - 6} 212)" class="tag">{t('written back', '写回')}</text>
              </g>
            {/if}
          {/each}

          <g in:fade={{ delay: 2100 }}>
            <text x="18" y="360" class="pt">·</text><text x="28" y="360" class="legend">{t('each shaded band is ', '每条阴影带是')}<tspan class="strong">{t('one buffer', '一个缓冲区')}</tspan>{t(' — the same memory at three moments, not three different places', '——同一块内存在三个时刻，不是三个地方')}</text>
            <text x="18" y="380" class="pt">·</text><text x="28" y="380" class="legend">{t(`step t's sampled column is step t+1's ids column: the same ${B_EX} slots overwritten in place, one request followed in blue`, `步 t 的采样列就是步 t+1 的 ids 列：同一批 ${B_EX} 个槽位原地覆盖，蓝色跟踪一个 request`)}</text>
          </g>
        </g>
      {/if}

      <!-- 14: what breaks a graph -->
      {#if cur.scene === 'closing'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="52" class="rowlabel">{t("a graph is a fixed recording · these aren't fixed", 'graph 是固定的录制 · 这些不固定')}</text>
          {#each [
            { t: 'MoE routing', tz: 'MoE 路由', s: 'which experts run depends on the tokens', sz: '跑哪些 expert 由 token 决定', c: 'var(--accent)' },
            { t: 'speculative verification', tz: '投机验证', s: 'how many drafts survive is data', sz: '有几个 draft 活下来取决于数据', c: 'var(--gen)' },
            { t: 'attention plans', tz: 'attention 计划', s: 'some backends build per-batch shapes on the CPU', sz: '有些后端在 CPU 上为每个 batch 构建形状', c: '#0891b2' },
            { t: 'a .item() anywhere', tz: '任何一处 .item()', s: 'a sync with the CPU; a recording can\'t contain one', sz: '与 CPU 同步；录制装不下它', c: 'var(--eos)' },
          ] as row, i}
            {@const y = 74 + i * 52}
            <g in:fly={{ x: -8, delay: i * 200, duration: 300 }}>
              <rect x="30" y={y} width="660" height="40" rx="10" fill="#fbfaf7" stroke={row.c} />
              <text x="46" y={y + 25} class="slab strong small">{t(row.t, row.tz)}</text>
              <text x="250" y={y + 25} class="tag">{t(row.s, row.sz)}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 1100 }}>
            <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">SGLang: <tspan class="mono">--enable-piecewise-cuda-graph</tspan> · <tspan class="mono">--enable-torch-compile</tspan></text>
          </g>
        </g>
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .cell { font-family: var(--mono); font-size: 10px; fill: var(--fg); }
  .tag.strong, .tag .strong, .mono .strong { fill: var(--fg); font-weight: 600; }
  .verdict { font-size: 20px; font-weight: 700; }
  .ours { fill: var(--accent); font-weight: 700; }
  .zoomrect { transform-box: fill-box; transform-origin: 0 0; transition: transform 800ms cubic-bezier(0.2, 0.8, 0.2, 1); }
</style>
