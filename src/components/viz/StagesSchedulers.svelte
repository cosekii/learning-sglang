<script lang="ts">
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import { chapterNumber as chNum, type NavLink } from '../../chapters';
  import { SPEECH_OUT_HZ, CODES_PER_FRAME, SAMPLES_PER_FRAME } from '../../numbers';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  const CH_ENGINE = chNum('10-engine'), CH_PROC = chNum('09-one-request'), CH_OMNI = chNum('16-omni-models'), CH_EDGES = chNum('18-between-stages');
  const CH_PLACE = chNum('19-sharing-gpus'), CH_TP = chNum('24-tensor-parallel');
  // chapter 16's 20 s spoken answer, in frames
  const A_SEC = 20;
  const FRAMES = (A_SEC * SPEECH_OUT_HZ) / SAMPLES_PER_FRAME;   // 250
  const FRAME_MS = (SAMPLES_PER_FRAME / SPEECH_OUT_HZ) * 1000;  // 80
  const CHUNK = 10, CONTEXT = 25;                                // code2wav's frames per pass, and earlier frames it rereads (SGLang-Omni's defaults)

  type Scene = 'gap' | 'stage' | 'process' | 'stages' | 'predictor' | 'handoffs' | 'kinds' | 'onepass' | 'loop' | 'talker' | 'streaming' | 'closing';
  const steps: { scene: Scene; caption: string; captionZh: string }[] = [
    { scene: 'gap', caption: `Today, SGLang runs one model in one process: the scheduler, which also runs the encoders inside its prefill. The talker, code predictor and code2wav have no process to run in.`, captionZh: `如今 SGLang 在一个进程里跑一个模型：scheduler，encoder 也在它的 prefill 里跑。talker、code predictor 和 code2wav 没有进程可跑。` },
    { scene: 'stage', caption: `A stage is the home SGLang-Omni gives each piece of work: a runtime that trades with other stages, and a scheduler thread that runs the work, joined by an inbox and an outbox.`, captionZh: `stage 是 SGLang-Omni 给每块工作的家：一个与其他 stage 交换数据的 runtime，一个执行工作的 scheduler 线程，用 inbox 和 outbox 连接。` },
    { scene: 'process', caption: `A stage is not a process. By default each stage gets its own, as Ch. ${CH_PROC} Step 5's three did; but several can share one, and one can span several. Only the hand-off changes.`, captionZh: `stage 不是进程。默认每个 stage 独占一个，如 Ch. ${CH_PROC} Step 5 的三个；但多个 stage 可共享一个，一个也可跨多个。变的只是交接方式。` },
    { scene: 'stages', caption: `SGLang-Omni runs Qwen3-Omni as seven stages, each in its own process: one per model, except that the talker and code predictor share one, plus preprocessing and the detokenizer.`, captionZh: `SGLang-Omni 把 Qwen3-Omni 跑成七个 stage，各占一个进程：每个模型一个，talker 和 code predictor 共用一个，再加 preprocessing 和 detokenizer。` },
    { scene: 'predictor', caption: `Each talker step, the code predictor takes the talker's hidden state and code 0 and writes codes 1–15. The finished frame becomes the talker's next input, so what the code predictor reads and writes both belong to the talker.`, captionZh: `每个 talker 步，code predictor 拿 talker 的 hidden state 和 code 0，写出 code 1–15。完成的帧成为 talker 的下一个输入，所以它读写的都是 talker 的。` },
    { scene: 'handoffs', caption: `As a separate stage, every frame would go to the code predictor and back, which is ${FRAMES * 2} hand-offs for the ${A_SEC} s answer. The talker waits through each one. Inside the talker's step there are none.`, captionZh: `若单独成 stage，每帧都要去 code predictor 再回来，${A_SEC} s 的回答共 ${FRAMES * 2} 次交接。talker 每次都得等。放在 talker 步内则一次也没有。` },
    { scene: 'kinds', caption: `Why not one scheduler for all seven stages? Because stages keep different things between calls. Some keep nothing, some keep a KV cache that grows every step, and some keep the pieces of a request still arriving.`, captionZh: `为什么七个 stage 不用同一个 scheduler？因为各 stage 在调用之间保留的东西不同：有的什么都不留，有的留每步增长的 KV cache，有的留还在到达的 request 碎片。` },
    { scene: 'onepass', caption: `One pass needs only part of SGLang's loop. No request is ever halfway through an answer, so there are no lists, no pages and no token to pick. The scheduler takes what is waiting, runs it once and sends each result on.`, captionZh: `一次 pass 只需 SGLang 循环的一部分。没有 request 会答到一半，所以不需要列表、page，也没有 token 可选。scheduler 取走等待的，跑一次，把每个结果发出去。` },
    { scene: 'loop', caption: `The thinker and the talker loop like the engine in Ch. ${CH_ENGINE} Step 1, so SGLang-Omni keeps the middle of its scheduler unchanged. Requests now arrive in the stage's inbox, and each token is sent on as soon as it is picked.`, captionZh: `thinker 和 talker 像 Ch. ${CH_ENGINE} Step 1 的引擎那样循环，所以 SGLang-Omni 保留其 scheduler 的中段不变。request 现在到达 stage 的 inbox，每个 token 一选出就发出。` },
    { scene: 'talker', caption: `The talker's scheduler adds one row to step 9's loop. Before each decode step, it checks that every request in the batch has its next token. If one is missing, the whole batch waits.`, captionZh: `talker 的 scheduler 在第 9 步的循环上加一行。每个 decode 步之前，检查 batch 里每个 request 的下一个 token 是否已到。缺一个，整个 batch 就等。` },
    { scene: 'streaming', caption: `decode and code2wav get each request in pieces from a stage that is still running. Each keeps what has arrived until a whole character or ${CHUNK} new frames are ready to go out.`, captionZh: `decode 和 code2wav 从仍在运行的 stage 逐片收到 request。各自保留已到达的部分，直到凑齐一个完整字符或 ${CHUNK} 个新帧再发出。` },
    { scene: 'closing', caption: `Eight edges join the seven stages. Some carry a request's inputs once and some a piece every token, between processes that may share a GPU, sit on two, or have the CPU at one end. How is each hand-off made?`, captionZh: `八条边连接七个 stage。有的只传一次 request 的输入，有的每个 token 传一片；两端的进程可能共享一个 GPU、分处两个 GPU，或一端是 CPU。每次交接如何完成？` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  // step 2's loop: one request walks through a stage and into the next; each scheduler holds it while it works on it
  const HOPS = 10;
  const WORK = [3, 8];                               // the hops spent inside a scheduler
  const GLIDE = 850;                                 // ms the request takes to move between spots (the CSS transition below)
  let lap = $state(0), lapMs = $state(0);           // the looping step's laps, for LoopProgress
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });   // untracked, so starting a lap does not re-run the effect
  let hop = $state(0);
  let working = $state(false);                       // on only once the request has arrived inside a scheduler
  $effect(() => {
    if (cur.scene !== 'stage') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      hop = 0; working = false;
      let ms = 600;
      for (let i = 1; i < HOPS; i++) {
        ms += WORK.includes(i - 1) ? 3000 : 1150;
        const h = i;
        timers.push(setTimeout(() => { hop = h; working = false; }, ms));
        if (WORK.includes(h)) timers.push(setTimeout(() => (working = true), ms + GLIDE));
      }
      timers.push(setTimeout(run, ms + 2400));
      nextLap(ms + 2400);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  // step 10's loop: step 9's rows, the new row slides in, the batch is held twice, C's token arrives, the batch runs
  let tp = $state(0);
  $effect(() => {
    if (cur.scene !== 'talker') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      tp = 0;
      [1000, 2800, 4800, 7000, 9200, 10600].forEach((ms, i) => timers.push(setTimeout(() => (tp = i + 1), ms)));
      timers.push(setTimeout(run, 14600));
      nextLap(14600);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const W = 720, H = 400;
  const RED = 'var(--eos)';

  // chapter 16's six models, in its map's two kinds: one pass (white) and a loop (blue)
  const MODELS = [
    { n: 'vision encoder', nz: '视觉 encoder', loop: false, home: true },
    { n: 'audio encoder', nz: '音频 encoder', loop: false, home: true },
    { n: 'the engine', nz: 'engine', loop: true, home: true },
    { n: 'talker', nz: 'talker', loop: true, home: false },
    { n: 'code predictor', nz: 'code predictor', loop: true, home: false },
    { n: 'code2wav', nz: 'code2wav', loop: false, home: false },
  ];
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Stages and schedulers, step {step + 1}">
      <defs>
        <marker id="ss-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8b4aa" />
        </marker>
        <marker id="ss-arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--eos)" />
        </marker>
        <marker id="ss-arrow-gen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--gen)" />
        </marker>
        <marker id="ss-arrow-accent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
      </defs>

      <!-- 1: SGLang's three processes from chapter 9, and chapter 16's six models: three have a home, three have none -->
      {#if cur.scene === 'gap'}
        {@const PW = 160}
        {@const PX = [30, 280, 530]}
        {@const PY = 76}
        {@const MW = 100}
        {@const mx = (i: number) => 20 + i * 116}
        {@const MY = 214}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`where do Ch. ${CH_OMNI} Step 4's models run? · SGLang has one process with a model in it`, `Ch. ${CH_OMNI} Step 4 的模型在哪跑？· SGLang 只有一个进程，里面一个模型`)}</text>

          <!-- SGLang today: three processes, one model -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            <text x="16" y="66" class="boxtitle">{t(`SGLang today · Ch. ${CH_PROC} Step 5`, `如今的 SGLang · Ch. ${CH_PROC} Step 5`)}</text>
            {#each [{ n: 'server + tokenizer', nz: '服务器 + 分词器', sub: 'CPU · no model', subZ: 'CPU · 无模型' }, { n: 'scheduler + model', nz: 'scheduler + 模型', sub: 'GPU · one loop', subZ: 'GPU · 一个循环' }, { n: 'detokenizer', nz: '反分词器', sub: 'CPU · no model', subZ: 'CPU · 无模型' }] as p, i}
              <rect x={PX[i]} y={PY} width={PW} height="44" rx="8" fill={i === 1 ? 'var(--accent-soft)' : 'white'} stroke={i === 1 ? 'var(--accent)' : 'var(--fg)'} />
              <text x={PX[i] + PW / 2} y={PY + 19} text-anchor="middle" class="tag strong">{t(p.n, p.nz)}</text>
              <text x={PX[i] + PW / 2} y={PY + 33} text-anchor="middle" class="tag">{t(p.sub, p.subZ)}</text>
            {/each}
            {#each [0, 1] as i}
              <path d="M {PX[i] + PW + 4} {PY + 22} H {PX[i + 1] - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.5" marker-end="url(#ss-arrow)" />
              <text x={(PX[i] + PW + PX[i + 1]) / 2} y={PY + 15} text-anchor="middle" class="tag">{t('queue', '队列')}</text>
            {/each}
          </g>

          <!-- chapter 16's models: the encoders and the engine run in the scheduler process; the speech models have no process -->
          <g in:fade={{ delay: 500, duration: 250 }}>
            <text x="704" y={MY - 14} text-anchor="end" class="boxtitle">{t(`Qwen3-Omni's six models · Ch. ${CH_OMNI} Step 4`, `Qwen3-Omni 的六个模型 · Ch. ${CH_OMNI} Step 4`)}</text>
            {#each MODELS as m, i}
              <rect x={mx(i)} y={MY} width={MW} height="36" rx="8" fill={m.loop ? 'var(--accent-soft)' : 'white'} stroke={m.home ? (m.loop ? 'var(--accent)' : 'var(--fg)') : RED} stroke-dasharray={m.home ? 'none' : '4 3'} />
              <text x={mx(i) + MW / 2} y={MY + 22} text-anchor="middle" class="tag strong">{t(m.n, m.nz)}</text>
            {/each}
          </g>
          <g in:fade={{ delay: 900, duration: 250 }}>
            {#each [0, 1, 2] as i}
              <path d="M {mx(i) + MW / 2} {MY - 4} C {mx(i) + MW / 2} {MY - 40}, {PX[1] + 50 + i * 30} {PY + 90}, {PX[1] + 50 + i * 30} {PY + 60} L {PX[1] + 50 + i * 30} {PY + 48}" fill="none" stroke="var(--accent)" stroke-width="1.2" marker-end="url(#ss-arrow-accent)" />
            {/each}
            <text x={mx(0)} y={MY + 56} class="tag">{t('run inside the scheduler process:', '在 scheduler 进程里跑：')}</text>
            <text x={mx(0)} y={MY + 70} class="tag">{t(`the encoders in its prefill (Ch. ${CH_OMNI} Step 2)`, `encoder 在它的 prefill 里（Ch. ${CH_OMNI} Step 2）`)}</text>
            <path d="M {mx(3)} {MY + 44} v 6 H {mx(5) + MW} v -6" fill="none" stroke={RED} />
            <text x={(mx(3) + mx(5) + MW) / 2} y={MY + 66} text-anchor="middle" class="tag strong" style:fill={RED}>{t('no process runs these', '没有进程跑这些')}</text>
          </g>

          <g in:fade={{ delay: 1300, duration: 250 }}>
            <rect x="30" y="321" width="660" height="28" rx="14" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={W / 2} y="340" text-anchor="middle" class="need"><tspan class="strong">{t('needed:', '需要：')}</tspan> {t('somewhere for every model to run, each in the right kind of loop, joined by queues', '每个模型都有地方跑，各用合适的循环，用队列连接')}</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`white: one pass · blue: a loop (Ch. ${CH_OMNI} Step 4) · a red dashed outline: no process runs it in SGLang`, `白色：一次 pass · 蓝色：循环（Ch. ${CH_OMNI} Step 4）· 红色虚线框：SGLang 里没有进程跑它`)}</text>
        </g>
      {/if}
      <!-- 2: what a stage is · a runtime and a scheduler thread, joined by an inbox and an outbox; one request walks through two -->
      {#if cur.scene === 'stage'}
        {@const SX = [40, 420]}
        {@const SW = 260}
        {@const IN = 70}
        {@const OUT = 190}
        {@const at = [
          [16, 128], [SX[0] + IN, 128], [SX[0] + IN, 177], [SX[0] + 100, 236], [SX[0] + OUT, 177], [SX[0] + OUT, 128],
          [SX[1] + IN, 128], [SX[1] + IN, 177], [SX[1] + 100, 236], [SX[1] + 100, 236],
        ]}
        {@const done = hop > 8 ? 2 : hop > 3 ? 1 : 0}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('what a stage is · a runtime that trades with other stages, a scheduler that does the work', 'stage 是什么 · 与其他 stage 交换数据的 runtime，干活的 scheduler')}</text>
          {#each SX as x, k}
            <g in:fade={{ delay: 100 + k * 300, duration: 250 }}>
              <rect {x} y="58" width={SW} height="256" rx="12" fill="#fbfaf7" stroke="var(--fg)" />
              <text x={x + 12} y="75" class="boxtitle">{k ? t('the next stage', '下一个 stage') : t('a stage', '一个 stage')}</text>
              <!-- the runtime: the stage's I/O -->
              <rect x={x + 14} y="82" width={SW - 28} height="60" rx="8" fill="white" stroke="var(--faint)" />
              <text x={x + SW / 2} y="98" text-anchor="middle" class="tag strong">runtime</text>
              <text x={x + SW / 2} y="111" text-anchor="middle" class="tag">{t('receives from stages, sends to stages', '从各 stage 收，向各 stage 发')}</text>
              <!-- the two queues between them -->
              {#each [{ qx: x + IN, n: 'inbox', down: true }, { qx: x + OUT, n: 'outbox', down: false }] as q}
                {#each [0, 1, 2] as j}
                  <rect x={q.qx - 14} y={160 + j * 12} width="28" height="10" rx="2" fill="white" stroke="var(--faint)" />
                {/each}
                <text x={q.down ? q.qx - 22 : q.qx + 22} y="181" text-anchor={q.down ? 'end' : 'start'} class="tag strong">{q.n}</text>
                <path d={q.down ? `M ${q.qx} 146 V 156` : `M ${q.qx} 156 V 146`} fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
                <path d={q.down ? `M ${q.qx} 198 V 212` : `M ${q.qx} 212 V 198`} fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
              {/each}
              <!-- the scheduler: its own thread, its own loop -->
              <rect x={x + 14} y="216" width={SW - 28} height="86" rx="8" fill={working && hop === WORK[k] ? 'var(--accent-soft)' : 'white'} stroke="var(--accent)" stroke-width={working && hop === WORK[k] ? 2 : 1} />
              <text x={x + SW / 2} y="268" text-anchor="middle" class="tag strong">{t('scheduler · a thread of its own', 'scheduler · 自己的线程')}</text>
              <text x={x + SW / 2} y="282" text-anchor="middle" class="tag">{t('its loop: take from the inbox,', '它的循环：从 inbox 取，')}</text>
              <text x={x + SW / 2} y="295" text-anchor="middle" class="tag">{t('run the work, put into the outbox', '干活，放进 outbox')}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 600, duration: 250 }}>
            <path d="M 18 128 H {SX[0] + 10}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
            <path d="M {SX[0] + SW + 4} 128 H {SX[1] - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
            <text x={(SX[0] + SW + SX[1]) / 2} y="120" text-anchor="middle" class="tag">{t('to the next stage', '去下一个 stage')}</text>
            <text x={(SX[0] + SW + SX[1]) / 2} y="144" text-anchor="middle" class="tag">{t(`how: Ch. ${CH_EDGES} Step 2`, `怎么传：Ch. ${CH_EDGES} Step 2`)}</text>
          </g>
          <!-- the request, hop by hop -->
          <!-- the request: each scheduler works on it (a bar fills) and hands on something new (a new colour, a new mark) -->
          <g style="transform: translate({at[hop][0]}px, {at[hop][1]}px); transition: transform {GLIDE}ms ease-in-out;">
            <rect x="-17" y="-8" width="34" height="16" rx="8" fill={['var(--gen)', 'var(--accent)', '#16a34a'][done]} style="transition: fill 0.4s;" />
            <text x="0" y="4" text-anchor="middle" class="tag onbox">{['req', 'req′', 'req″'][done]}</text>
            {#if working}
              {#key hop}
                <rect x="-17" y="12" width="34" height="4" rx="2" fill="var(--line)" />
                <rect x="-17" y="12" width="34" height="4" rx="2" fill="var(--fg)" class="work" />
              {/key}
              <text x="24" y="4" class="tag strong">{t('running the work', '正在干活')}</text>
            {/if}
          </g>

          <g in:fade={{ delay: 1000 }}>
            <text x="18" y="336" class="pt">·</text><text x="28" y="336" class="legend">{t('the scheduler only sees its inbox and outbox: it never calls the next stage, and never waits for it', 'scheduler 只看自己的 inbox 和 outbox：从不调用下一个 stage，也从不等它')}</text>
            <text x="18" y="353" class="pt">·</text><text x="28" y="353" class="legend">{t(`Ch. ${CH_PROC} Step 6's scheduler process worked the same way: at the top of every step it took whatever had arrived`, `Ch. ${CH_PROC} Step 6 的 scheduler 进程也是这样：每步开头取走已到达的一切`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`req′, req″: the same request, as each stage's work leaves it (tokens, embeddings, codes …)`, `req′、req″：同一个 request，经各 stage 加工后的样子（token、embedding、code……）`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`SGLang-Omni's Stage is the runtime: an event loop for I/O, which starts the scheduler in a thread named scheduler-<stage>`, `SGLang-Omni 的 Stage 就是 runtime：一个做 I/O 的事件循环，在名为 scheduler-<stage> 的线程里启动 scheduler`)}</text>
        </g>
      {/if}

      <!-- 3: a stage is not a process · three layouts of the same stages; only the hand-off between them changes -->
      {#if cur.scene === 'process'}
        {@const CX = [16, 252, 488]}
        {@const CW = 216}
        {@const proc = (x: number, y: number, w: number, h: number, label: string) => ({ x, y, w, h, label })}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('a stage is a unit of work · a process is where it runs', 'stage 是工作单元 · 进程是它跑的地方')}</text>

          <!-- one process per stage: the speech default -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            <text x={CX[0]} y="70" class="boxtitle">{t('one process per stage', '每个 stage 一个进程')}</text>
            {#each ['thinker', 'talker_ar', 'code2wav'] as n, i}
              {@const y = 82 + i * 74}
              <rect x={CX[0]} {y} width={CW - 30} height="52" rx="8" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
              <text x={CX[0] + 8} y={y + 13} class="tag">{t('process', '进程')}</text>
              <rect x={CX[0] + 30} y={y + 18} width={CW - 90} height="26" rx="6" fill={n === 'code2wav' ? 'white' : 'var(--accent-soft)'} stroke={n === 'code2wav' ? 'var(--fg)' : 'var(--accent)'} />
              <text x={CX[0] + 30 + (CW - 90) / 2} y={y + 35} text-anchor="middle" class="mono strong">{n}</text>
              {#if i < 2}
                <path d="M {CX[0] + 93} {y + 56} V {y + 70}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
                <text x={CX[0] + 102} y={y + 67} class="tag">{t('a message', '一条消息')}</text>
              {/if}
            {/each}
          </g>

          <!-- several stages in one process -->
          <g in:fade={{ delay: 500, duration: 250 }}>
            <text x={CX[1]} y="70" class="boxtitle">{t('several in one process', '多个共用一个进程')}</text>
            <rect x={CX[1]} y="82" width={CW - 30} height="200" rx="8" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
            <text x={CX[1] + 8} y="95" class="tag">{t('process', '进程')}</text>
            {#each ['preprocessing', 'thinker', 'decode'] as n, i}
              {@const y = 104 + i * 60}
              <rect x={CX[1] + 30} {y} width={CW - 90} height="26" rx="6" fill={n === 'thinker' ? 'var(--accent-soft)' : '#ece9e1'} stroke={n === 'thinker' ? 'var(--accent)' : 'var(--faint)'} />
              <text x={CX[1] + 30 + (CW - 90) / 2} y={y + 17} text-anchor="middle" class="mono strong">{n}</text>
              {#if i < 2}
                <path d="M {CX[1] + 93} {y + 30} V {y + 56}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
                <text x={CX[1] + 102} y={y + 47} class="tag">{t('a direct call', '一次直接调用')}</text>
              {/if}
            {/each}
          </g>

          <!-- one stage across several processes -->
          <g in:fade={{ delay: 900, duration: 250 }}>
            <text x={CX[2]} y="70" class="boxtitle">{t('one stage, several processes', '一个 stage，多个进程')}</text>
            {#each [0, 1] as r}
              <rect x={CX[2] + r * 108} y="82" width="100" height="88" rx="8" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
              <text x={CX[2] + r * 108 + 8} y="95" class="tag">{t(`process · GPU ${r}`, `进程 · GPU ${r}`)}</text>
            {/each}
            <rect x={CX[2] + 14} y="116" width="180" height="30" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={CX[2] + 104} y="135" text-anchor="middle" class="mono strong">thinker</text>
          </g>

          <!-- what each layout is for -->
          <g in:fade={{ delay: 1300, duration: 250 }}>
            <text x={CX[0]} y="304" class="tag strong">{t("Qwen3-Omni's speech default", 'Qwen3-Omni 的语音默认布局')}</text>
            <text x={CX[0]} y="318" class="tag">{t("one stage's CPU work can't stall another", '一个 stage 的 CPU 工作不会卡住另一个')}</text>
            <text x={CX[1]} y="304" class="tag strong">{t("Qwen3-Omni's text-only pipeline", 'Qwen3-Omni 的纯文本流水线')}</text>
            <text x={CX[1]} y="318" class="tag">{t('one interpreter, and they fail together', '一个解释器，一起出错')}</text>
            <text x={CX[2]} y="190" class="tag strong">{t('tensor parallelism', '张量并行')}</text>
            <text x={CX[2]} y="204" class="tag">{t(`one model split over two GPUs (chapter ${CH_TP})`, `一个模型拆到两个 GPU（第 ${CH_TP} 章）`)}</text>
          </g>

          <g in:fade={{ delay: 1700, duration: 250 }}>
            <rect x="30" y="332" width="660" height="28" rx="14" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={W / 2} y="351" text-anchor="middle" class="need">{t('the stage is the same in all three; only the hand-off changes: a direct call, or a message', '三种布局里 stage 都一样；变的只是交接：直接调用，或一条消息')}</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`a process: one running program with its own Python interpreter (Ch. ${CH_PROC} Step 4) · which layout to use is chapter ${CH_PLACE}'s question`, `进程：一个跑着的程序，有自己的 Python 解释器（Ch. ${CH_PROC} Step 4）· 用哪种布局是第 ${CH_PLACE} 章的问题`)}</text>
        </g>
      {/if}

      <!-- 4: Qwen3-Omni as SGLang-Omni runs it · seven stages, each named with the model it holds -->
      {#if cur.scene === 'stages' || cur.scene === 'closing'}
        {@const END = cur.scene === 'closing'}
        {@const BW = 100}
        {@const X = [16, 162, 308, 454, 602]}
        {@const NOMODEL = '#ece9e1'}
        {@const box = (x: number, y: number, h: number, fill: string, stroke: string) => ({ x, y, h, fill, stroke })}
        {@const S = {
          pre: box(X[0], 140, 52, NOMODEL, 'var(--faint)'),
          img: box(X[1], 84, 52, 'white', 'var(--fg)'),
          aud: box(X[1], END ? 210 : 196, 52, 'white', 'var(--fg)'),
          thk: box(X[2], 140, 52, 'var(--accent-soft)', 'var(--accent)'),
          dec: box(X[3], 72, END ? 76 : 52, NOMODEL, 'var(--faint)'),
          tlk: box(X[3], END ? 210 : 192, END ? 64 : 56, 'var(--accent-soft)', 'var(--accent)'),
          c2w: box(X[4], END ? 210 : 192, END ? 64 : 56, 'white', 'var(--fg)'),
        }}
        {@const right = (b: { x: number }) => b.x + BW}
        {@const midY = (b: { y: number; h: number }) => b.y + b.h / 2}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{END ? t('seven stages, each with the scheduler its work needs · and each in its own process', '七个 stage，各配工作所需的 scheduler · 各占一个进程') : t('Qwen3-Omni as SGLang-Omni runs it · seven stages, each in its own process', 'SGLang-Omni 跑的 Qwen3-Omni · 七个 stage，各占一个进程')}</text>

          <!-- the edges first, so the boxes sit on top -->
          <g in:fade={{ delay: 600, duration: 250 }}>
            {#each [[S.pre, S.img], [S.pre, S.aud], [S.pre, S.thk], [S.img, S.thk], [S.aud, S.thk], [S.thk, S.dec], [S.thk, S.tlk], [S.tlk, S.c2w]] as [a, b], e}
              <path d="M {right(a) + 9} {midY(a)} C {right(a) + 18} {midY(a)}, {b.x - 30} {midY(b)}, {b.x - 24} {midY(b)} L {b.x - 10} {midY(b)}" fill="none" stroke={END ? RED : '#b8b4aa'} stroke-width="1.4" marker-end={END ? 'url(#ss-arrow-red)' : 'url(#ss-arrow)'} />
              {#if END}
                {@const mx = (right(a) + b.x) / 2}
                {@const my = (midY(a) + midY(b)) / 2}
                <circle cx={mx} cy={my} r="8" fill="white" stroke={RED} />
                <text x={mx} y={my + 3.5} text-anchor="middle" class="tag strong" style:fill={RED}>{e + 1}</text>
              {/if}
            {/each}
            {#if !END}<text x={S.dec.x - 13} y={midY(S.dec) - 8} text-anchor="end" class="tag">{t('token ids', 'token id')}</text>{/if}
            {#if !END}<text x={S.tlk.x - 13} y={midY(S.tlk) + 16} text-anchor="end" class="tag">{t('each token', '每个 token')}</text>{/if}
            {#if !END}<text x={(right(S.tlk) + S.c2w.x) / 2} y={midY(S.c2w) - 8} text-anchor="middle" class="tag">{t('codes', 'code')}</text>{/if}
            <path d="M {right(S.dec) + 9} {midY(S.dec)} H {right(S.dec) + 32}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
            <text x={right(S.dec) + 38} y={midY(S.dec) + 4} class="tag strong">{t('text out', '文本输出')}</text>
            <path d="M {S.c2w.x + BW / 2} {S.c2w.y + S.c2w.h + 11} V {S.c2w.y + S.c2w.h + 24}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
            <text x={S.c2w.x + BW / 2} y={S.c2w.y + S.c2w.h + 38} text-anchor="middle" class="tag strong">{t('sound out', '声音输出')}</text>
          </g>

          <!-- the stages: stage name, what it holds, where it runs -->
          {#each [
            { b: S.pre, n: 'preprocessing', sc: ['SimpleScheduler'], l: END ? ['CPU'] : ['no model', 'CPU'], lz: ['无模型', 'CPU'], d: 100 },
            { b: S.img, n: 'image_encoder', sc: ['SimpleScheduler'], l: END ? ['GPU 0'] : ['vision encoder', 'GPU 0'], lz: ['视觉 encoder', 'GPU 0'], d: 250 },
            { b: S.aud, n: 'audio_encoder', sc: ['SimpleScheduler'], l: END ? ['GPU 0'] : ['audio encoder', 'GPU 0'], lz: ['音频 encoder', 'GPU 0'], d: 250 },
            { b: S.thk, n: 'thinker', sc: ['OmniScheduler'], l: END ? ['GPU 0'] : ['the engine', 'GPU 0'], lz: ['engine', 'GPU 0'], d: 400 },
            { b: S.dec, n: 'decode', sc: ['Streaming', 'Detokenize', 'Scheduler'], l: END ? ['CPU'] : ['no model', 'CPU'], lz: ['无模型', 'CPU'], d: 500 },
            { b: S.tlk, n: 'talker_ar', sc: ['QwenTalker', 'Scheduler'], l: END ? ['GPU 1'] : ['talker + code', 'predictor · GPU 1'], lz: ['talker + code', 'predictor · GPU 1'], d: 500 },
            { b: S.c2w, n: 'code2wav', sc: ['Code2Wav', 'Scheduler'], l: END ? ['GPU 0'] : ['code2wav', 'GPU 0'], lz: ['code2wav', 'GPU 0'], d: 500 },
          ] as st}
            <g in:fade={{ delay: st.d, duration: 250 }}>
              <rect x={st.b.x - 6} y={st.b.y - 19} width={BW + 12} height={st.b.h + 27} rx="11" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
              <text x={st.b.x - 1} y={st.b.y - 7} class="tag">{t('process', '进程')}</text>
              <rect x={st.b.x} y={st.b.y} width={BW} height={st.b.h} rx="8" fill={st.b.fill} stroke={st.b.stroke} />
              <text x={st.b.x + BW / 2} y={st.b.y + 17} text-anchor="middle" class="mono strong">{st.n}</text>
              {#each [...(END ? st.sc.map((s) => [s, s]) : []), ...st.l.map((s, j) => [s, st.lz[j]])] as [line, lineZh], i}
                <text x={st.b.x + BW / 2} y={st.b.y + 31 + i * 12} text-anchor="middle" class={END && i < st.sc.length ? 'tag strong' : 'tag'}>{t(line, lineZh)}</text>
              {/each}
            </g>
          {/each}

          {#if END}
            <g in:fade={{ delay: 1000, duration: 250 }}>
              <text x="18" y="322" class="pt">·</text><text x="28" y="322" class="legend">{t("edges 1–5 carry a request's inputs once; edges 6–8 carry a piece every token or every 10 frames", '边 1–5 只传一次 request 的输入；边 6–8 每个 token 或每 10 帧传一片')}</text>
              <text x="18" y="339" class="pt">·</text><text x="28" y="339" class="legend">{t('each edge joins two processes, which may share a GPU (4, 5), sit on two GPUs (7, 8), or have the CPU at one end (1–3, 6)', '每条边连两个进程，可能共享一个 GPU（4、5），分处两个 GPU（7、8），或一端是 CPU（1–3、6）')}</text>
            </g>
            <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('each box: the stage, its scheduler (steps 7–11), and where it runs · dashed: a process · both GPUs in one machine', '每个框：stage、它的 scheduler（第 7–11 步）、在哪跑 · 虚线：进程 · 两个 GPU 在同一台机器')}</text>
            <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`not drawn: three more edges carry the same inputs to talker_ar, which builds its own prompt (Ch. ${CH_EDGES} Step 1)`, `未画出：还有三条边把同样的输入送给 talker_ar，它自己组 prompt（Ch. ${CH_EDGES} Step 1）`)}</text>
          {:else}
          <!-- the count: chapter 16's six models, one stage they share, two stages with none -->
          <g in:fade={{ delay: 1000, duration: 250 }}>
            <text x="18" y="304" class="pt">·</text><text x="28" y="304" class="legend"><tspan class="strong">{t('7 stages', '7 个 stage')}</tspan> {t(`= Ch. ${CH_OMNI} Step 4's 6 models, − 1 because the talker and code predictor share one, + 2 that run no model`, `= Ch. ${CH_OMNI} Step 4 的 6 个模型，− 1 因为 talker 和 code predictor 共用一个，+ 2 个不跑模型`)}</text>
            <text x="18" y="321" class="pt">·</text><text x="28" y="321" class="legend">{t('preprocessing turns the request into tokens, photo patches and audio frames; decode is the detokenizer', 'preprocessing 把 request 变成 token、照片 patch 和音频帧；decode 就是反分词器')}</text>
            <text x="18" y="338" class="pt">·</text><text x="28" y="338" class="legend"><tspan class="strong">{t('7 processes', '7 个进程')}</tspan>{t(`: 2 on the CPU, 4 sharing GPU 0, the talker alone on GPU 1 (why this layout: chapter ${CH_PLACE})`, `：2 个在 CPU，4 个共享 GPU 0，talker 独占 GPU 1（为何这样布局：第 ${CH_PLACE} 章）`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`white: one pass · blue: a loop (Ch. ${CH_OMNI} Step 4) · grey: no model · dashed: a process · the talker also reads the prompt (Ch. ${CH_EDGES} Step 1)`, `白色：一次 pass · 蓝色：循环（Ch. ${CH_OMNI} Step 4）· 灰色：无模型 · 虚线：进程 · talker 也读 prompt（Ch. ${CH_EDGES} Step 1）`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`SGLang-Omni's speech pipeline; its design notes add an eighth stage, mm_aggregate, a join the thinker and talker now do themselves`, `SGLang-Omni 的语音流水线；其设计笔记还加了第八个 stage mm_aggregate，一个 thinker 和 talker 现在自己做的汇合`)}</text>
          {/if}
        </g>
      {/if}
      <!-- 5: why the code predictor has no stage · what it reads and what it writes are both the talker's -->
      {#if cur.scene === 'predictor'}
        {@const TB = { x: 270, y: 104, w: 170, h: 56 }}
        {@const PB = { x: 270, y: 222, w: 170, h: 56 }}
        {@const CHIP = { x: 40, w: 150 }}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t("why the code predictor has no stage · what it reads and what it writes are both the talker's", 'code predictor 为何没有 stage · 它读的和写的都是 talker 的')}</text>

          <!-- one talker step, drawn as the loop it is: inputs in, talker, code predictor, the frame, and back -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            <text x="16" y="70" class="boxtitle">{t('one talker step · one frame', '一个 talker 步 · 一帧')}</text>
            <rect x="16" y="78" width="688" height="262" rx="12" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />

            <rect x={CHIP.x} y="112" width={CHIP.w} height="26" rx="6" fill="#ece9e1" stroke="var(--faint)" />
            <text x={CHIP.x + CHIP.w / 2} y="129" text-anchor="middle" class="tag strong">{t('a token, from the thinker', '一个 token，来自 thinker')}</text>
            <rect x={CHIP.x} y="176" width={CHIP.w} height="26" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={CHIP.x + CHIP.w / 2} y="193" text-anchor="middle" class="tag strong">{t('the last frame', '上一帧')}</text>
            <path d="M {CHIP.x + CHIP.w + 4} 125 C 230 125, 236 126, {TB.x - 12} 126 L {TB.x - 4} 126" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
            <path d="M {CHIP.x + CHIP.w + 4} 189 C 232 189, 232 140, {TB.x - 12} 140 L {TB.x - 4} 140" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />

            <rect x={TB.x} y={TB.y} width={TB.w} height={TB.h} rx="8" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x={TB.x + TB.w / 2} y={TB.y + 24} text-anchor="middle" class="slab strong small">talker</text>
            <text x={TB.x + TB.w / 2} y={TB.y + 40} text-anchor="middle" class="tag">{t('one forward pass · code 0', '一次前向 · code 0')}</text>
          </g>

          <g in:fade={{ delay: 500, duration: 250 }}>
            <path d="M {TB.x + TB.w / 2} {TB.y + TB.h + 4} V {PB.y - 4}" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#ss-arrow-accent)" />
            <text x={TB.x + TB.w / 2 + 12} y="186" class="tag strong" style:fill="var(--accent)">{t('read from the talker:', '从 talker 读：')}</text>
            <text x={TB.x + TB.w / 2 + 12} y="200" class="tag">{t('its hidden state and code 0', '它的 hidden state 和 code 0')}</text>
            <rect x={PB.x} y={PB.y} width={PB.w} height={PB.h} rx="8" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={PB.x + PB.w / 2} y={PB.y + 24} text-anchor="middle" class="slab strong small">code predictor</text>
            <text x={PB.x + PB.w / 2} y={PB.y + 40} text-anchor="middle" class="tag">{t(`codes 1–${CODES_PER_FRAME - 1}, one after another`, `code 1–${CODES_PER_FRAME - 1}，一个接一个`)}</text>
          </g>

          <g in:fade={{ delay: 900, duration: 250 }}>
            <path d="M {PB.x + PB.w + 4} {PB.y + PB.h / 2} H 482" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
            <rect x="486" y={PB.y + PB.h / 2 - 14} width="128" height="28" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="550" y={PB.y + PB.h / 2 + 4} text-anchor="middle" class="tag strong">{t(`the frame · ${CODES_PER_FRAME} codes`, `这一帧 · ${CODES_PER_FRAME} 个 code`)}</text>
            <path d="M 618 {PB.y + PB.h / 2} H 684" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
            <text x="650" y={PB.y + PB.h / 2 - 8} text-anchor="middle" class="tag">{t('to code2wav', '去 code2wav')}</text>
            <!-- the frame goes back to the start of the loop -->
            <path d="M 550 {PB.y + PB.h / 2 + 18} V 312 H {CHIP.x + CHIP.w / 2} V 206" fill="none" stroke="var(--gen)" stroke-width="1.5" marker-end="url(#ss-arrow-gen)" />
            <text x={(CHIP.x + CHIP.w / 2 + 550) / 2} y="304" text-anchor="middle" class="tag strong" style:fill="var(--gen)">{t('written for the talker: its next input', '为 talker 而写：它的下一个输入')}</text>
          </g>

          <text x={W / 2} y="366" text-anchor="middle" class="legend" in:fade={{ delay: 1300 }}>{t("so as a stage of its own, every frame would leave the talker's stage and come back (next step)", '所以若单独成 stage，每帧都要离开 talker 的 stage 再回来（下一步）')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("in SGLang-Omni the code predictor runs inside talker_ar's forward pass, after the talker's own layers", '在 SGLang-Omni 里，code predictor 在 talker_ar 的前向里跑，在 talker 自己的层之后')}</text>
        </g>
      {/if}

      <!-- 6: what a stage of its own would cost · two hand-offs a frame, on the talker's path -->
      {#if cur.scene === 'handoffs'}
        {@const T = 26}
        {@const P = 56}
        {@const HO = 26}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('what a stage of its own would cost · two hand-offs every frame', '单独成 stage 的代价 · 每帧两次交接')}</text>
          <g transform="translate(0, -86)">
          <!-- the same frames, two ways: a stage of its own pays two hand-offs a frame on the talker's path -->
            <g in:fade={{ delay: 700, duration: 250 }}>
              <text x="16" y="208" class="boxtitle">{t('if the code predictor were a stage of its own', '若 code predictor 单独成一个 stage')}</text>
              {#each Array(5) as _, f}
                {@const x = 16 + f * (T + HO + P + HO)}
                <rect {x} y="216" width={T - 2} height="18" rx="3" fill="var(--accent)" opacity="0.75" />
                <rect x={x + T} y="216" width={HO - 2} height="18" rx="3" fill="var(--eos-soft)" stroke={RED} stroke-dasharray="3 2" />
                <rect x={x + T + HO} y="216" width={P - 2} height="18" rx="3" fill="var(--gen)" opacity="0.75" />
                <rect x={x + T + HO + P} y="216" width={HO - 2} height="18" rx="3" fill="var(--eos-soft)" stroke={RED} stroke-dasharray="3 2" />
              {/each}
              <text x="16" y="250" class="tag"><tspan class="strong" style:fill={RED}>{t('2 hand-offs a frame', '每帧 2 次交接')}</tspan>{t(`, and the talker waits through both: ${FRAMES} frames × 2 = ${FRAMES * 2} for the ${A_SEC} s answer`, `，talker 两次都得等：${A_SEC} s 的回答共 ${FRAMES} 帧 × 2 = ${FRAMES * 2} 次`)}</text>
            </g>
            <g in:fade={{ delay: 1100, duration: 250 }}>
              <text x="16" y="280" class="boxtitle">{t("inside the talker's step · as SGLang-Omni runs it", '在 talker 步内 · SGLang-Omni 的做法')}</text>
              {#each Array(8) as _, f}
                {@const x = 16 + f * (T + P)}
                <rect {x} y="288" width={T - 2} height="18" rx="3" fill="var(--accent)" opacity="0.75" />
                <rect x={x + T} y="288" width={P - 2} height="18" rx="3" fill="var(--gen)" opacity="0.75" />
              {/each}
              <text x="16" y="322" class="tag"><tspan class="strong">{t('0 hand-offs', '0 次交接')}</tspan>{t(': the hidden state and the frame stay where the step left them, on the GPU', '：hidden state 和帧留在步内原来的地方，在 GPU 上')}</text>
            </g>

          </g>
          <!-- the colour key, next to what it explains -->
          <g in:fade={{ delay: 300, duration: 250 }}>
            {#each [{ f: 'var(--accent)', o: 0.75, n: 'a talker pass', nz: '一次 talker pass' }, { f: 'var(--gen)', o: 0.75, n: "the code predictor's passes", nz: 'code predictor 的各次 pass' }] as k, i}
              <rect x={16 + i * 114} y="268" width="16" height="11" rx="2" fill={k.f} opacity={k.o} />
              <text x={38 + i * 114} y="278" class="tag">{t(k.n, k.nz)}</text>
            {/each}
            <rect x="302" y="268" width="16" height="11" rx="2" fill="var(--eos-soft)" stroke={RED} stroke-dasharray="3 2" />
            <text x="324" y="278" class="tag">{t(`a hand-off between stages, not to scale (what one costs: Ch. ${CH_EDGES} Step 3)`, `stage 间的一次交接，未按比例（一次多贵：Ch. ${CH_EDGES} Step 3）`)}</text>
          </g>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`SGLang-Omni's placement check: "Qwen code predictor is part of talker_ar and must not be a stage"`, `SGLang-Omni 的放置检查："Qwen code predictor is part of talker_ar and must not be a stage"`)}</text>
        </g>
      {/if}
      <!-- 7: the map · three kinds of scheduler, sorted by what a stage keeps between calls -->
      {#if cur.scene === 'kinds'}
        {@const CW = 220}
        {@const CX = [16, 250, 484]}
        {@const NOMODEL = '#ece9e1'}
        {@const kinds = [
          { n: 'one pass', nz: '一次 pass', keep: ['nothing: each request arrives whole,', 'runs once, and is gone'], keepZ: ['什么都不留：request 整个到达，', '跑一次就结束'], sched: 'SimpleScheduler', schedZ: 'SimpleScheduler',
            stages: [{ n: 'preprocessing', f: NOMODEL, s: 'var(--faint)' }, { n: 'image_encoder', f: 'white', s: 'var(--fg)' }, { n: 'audio_encoder', f: 'white', s: 'var(--fg)' }] },
          { n: 'a loop', nz: '循环', keep: ["each request's KV cache, growing", 'every step, and the running batch'], keepZ: ['每个 request 的 KV cache，', '每步增长，还有运行中的 batch'], sched: "SGLang's own scheduler", schedZ: 'SGLang 自己的 scheduler',
            stages: [{ n: 'thinker', f: 'var(--accent-soft)', s: 'var(--accent)' }, { n: 'talker_ar', f: 'var(--accent-soft)', s: 'var(--accent)' }] },
          { n: 'streaming', nz: '流式', keep: ["each request's pieces so far,", 'until there are enough to use'], keepZ: ['每个 request 已到的碎片，', '直到够一次使用'], sched: 'its own, per stage', schedZ: '各 stage 自己的',
            stages: [{ n: 'decode', f: NOMODEL, s: 'var(--faint)' }, { n: 'code2wav', f: 'white', s: 'var(--fg)' }] },
        ]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('three kinds of scheduler · sorted by what a stage keeps between calls', '三种 scheduler · 按 stage 在调用间保留什么分类')}</text>
          {#each kinds as k, i}
            {@const x = CX[i]}
            <g in:fade={{ delay: 100 + i * 400, duration: 250 }}>
              <rect {x} y="56" width={CW} height="276" rx="12" fill="#fbfaf7" stroke="var(--line)" />
              <text x={x + 14} y="76" class="boxtitle">{t(`${i + 1} of 3`, `${i + 1} / 3`)}</text>
              <text x={x + 14} y="94" class="slab strong small">{t(k.n, k.nz)}</text>

              <!-- what the work looks like -->
              {#if i === 0}
                <rect x={x + 14} y="112" width="56" height="28" rx="5" fill="white" stroke="var(--faint)" />
                <text x={x + 42} y="130" text-anchor="middle" class="tag strong">{t('input', '输入')}</text>
                <path d="M {x + 74} 126 H {x + 84}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
                <rect x={x + 88} y="112" width="44" height="28" rx="5" fill="white" stroke="var(--fg)" />
                <text x={x + 110} y="130" text-anchor="middle" class="tag strong">{t('run', '运行')}</text>
                <path d="M {x + 136} 126 H {x + 146}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
                <rect x={x + 150} y="112" width="56" height="28" rx="5" fill="white" stroke="var(--faint)" />
                <text x={x + 178} y="130" text-anchor="middle" class="tag strong">{t('result', '结果')}</text>
                <text x={x + 14} y="162" class="tag">{t('the whole input at once, one run', '整个输入一次到位，跑一次')}</text>
              {:else if i === 1}
                {#each [0, 1, 2, 3] as j}
                  <rect x={x + 14 + j * 48} y="108" width="40" height="22" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" />
                  <text x={x + 34 + j * 48} y="123" text-anchor="middle" class="tag strong">{t(`step ${j + 1}`, `第 ${j + 1} 步`)}</text>
                  {#each Array(j + 1) as _, c}
                    <rect x={x + 14 + j * 48 + c * 10} y="136" width="8" height="10" rx="1.5" fill="var(--accent)" opacity="0.6" />
                  {/each}
                {/each}
                <text x={x + 14} y="162" class="tag">{t('a step at a time, its KV cache growing', '一步步跑，KV cache 每步增长')}</text>
              {:else}
                {#each [0, 1, 2] as j}
                  <rect x={x + 14 + j * 22} y="116" width="18" height="18" rx="3" fill="var(--gen-soft)" stroke="var(--gen)" />
                  <text x={x + 23 + j * 22} y="129" text-anchor="middle" class="tag strong">{j + 1}</text>
                {/each}
                <path d="M {x + 82} 125 H {x + 92}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
                <rect x={x + 96} y="108" width="62" height="34" rx="5" fill="white" stroke="var(--faint)" stroke-dasharray="3 2" />
                {#each [0, 1, 2] as j}
                  <rect x={x + 102 + j * 18} y="118" width="14" height="14" rx="2" fill="var(--gen)" opacity="0.55" />
                {/each}
                <path d="M {x + 162} 125 H {x + 172}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
                <rect x={x + 176} y="114" width="30" height="22" rx="5" fill="white" stroke="var(--faint)" />
                <text x={x + 191} y="129" text-anchor="middle" class="tag strong">{t('out', '输出')}</text>
                <text x={x + 14} y="162" class="tag">{t('pieces arrive while it runs', '边跑边有碎片到达')}</text>
              {/if}

              <!-- what it keeps between calls -->
              <text x={x + 14} y="190" class="tag strong">{t('keeps between calls', '调用之间保留')}</text>
              {#each k.keep as line, j}
                <text x={x + 14} y={204 + j * 13} class="tag">{t(line, k.keepZ[j])}</text>
              {/each}

              <!-- which of step 4's stages use it -->
              <text x={x + 14} y="246" class="tag strong">{t('used by', '用于')}</text>
              {#each k.stages as st, j}
                <rect x={x + 14} y={254 + j * 24} width="110" height="20" rx="5" fill={st.f} stroke={st.s} />
                <text x={x + 69} y={268 + j * 24} text-anchor="middle" class="mono strong">{st.n}</text>
              {/each}
              <text x={x + CW - 14} y="94" text-anchor="end" class="tag">{t(k.sched, k.schedZ)}</text>
            </g>
          {/each}

          <text x={W / 2} y="356" text-anchor="middle" class="legend" in:fade={{ delay: 1500 }}>{t('a scheduler built around a KV cache has nothing to do for an encoder, and no way to wait for pieces', '围着 KV cache 建的 scheduler 对 encoder 无事可做，也没法等碎片')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("SGLang-Omni's names: SimpleScheduler · OmniScheduler, which reuses SGLang's · StreamingDetokenizeScheduler and Code2WavScheduler", 'SGLang-Omni 的命名：SimpleScheduler · OmniScheduler，复用 SGLang 的 · StreamingDetokenizeScheduler 和 Code2WavScheduler')}</text>
        </g>
      {/if}
      <!-- 8: 1 of 3, one pass · chapter 10's loop, row by row, against SimpleScheduler's -->
      {#if cur.scene === 'onepass'}
        {@const LX = 16}
        {@const LW = 300}
        {@const RX = 384}
        {@const RW = 320}
        {@const RH = 34}
        {@const ry = (i: number) => 92 + i * 40}
        {@const rows = [
          { n: 'recv_requests', d: 'inbox → Req objects', dz: 'inbox → Req 对象', keep: true, r: 'take what is waiting in the inbox, up to 32', rz: '取走 inbox 里等待的，最多 32 个' },
          { n: 'get_next_batch_to_run', d: 'prefill or decode? room in the pool?', dz: 'prefill 还是 decode？page 池有空间吗？', keep: false, r: 'every request is new, and done after this run', rz: '每个 request 都是新的，跑完就结束' },
          { n: 'ScheduleBatch → tensors', d: 'ids · positions · pages', dz: 'ids · 位置 · pages', keep: true, r: 'stack the inputs: no positions, no pages', rz: '堆叠输入：没有位置，没有 page' },
          { n: 'ModelRunner.forward', d: 'embed → 32 layers → logits', dz: 'embed → 32 层 → logits', keep: true, r: 'run the encoder once', rz: 'encoder 跑一次' },
          { n: 'Sampler', d: 'logits → tokens', dz: 'logits → token', keep: false, r: 'an encoder hands over embeddings: nothing to pick', rz: 'encoder 交出 embedding：没什么可选' },
          { n: 'process_batch_result', d: 'append · finish · send', dz: '追加 · 结束 · 发送', keep: true, r: 'put each result in the outbox: all finished', rz: '每个结果放进 outbox：全部完成' },
        ]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`1 of 3 · one pass · SimpleScheduler, against SGLang's loop row by row`, `1 / 3 · 一次 pass · SimpleScheduler，与 SGLang 的循环逐行对照`)}</text>
          <g in:fade={{ delay: 100, duration: 250 }}>
            <text x={LX} y="70" class="boxtitle">{t(`SGLang's loop · Ch. ${CH_ENGINE} Step 1`, `SGLang 的循环 · Ch. ${CH_ENGINE} Step 1`)}</text>
            <text x={LX} y="84" class="tag">{t('keeps: waiting and running lists, KV pages, the radix tree', '保留：waiting 和 running 列表、KV pages、radix tree')}</text>
            {#each rows as r, i}
              <rect x={LX} y={ry(i)} width={LW} height={RH} rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={LX + 10} y={ry(i) + 15} class="mono strong">{r.n}</text>
              <text x={LX + 10} y={ry(i) + 28} class="tag">{t(r.d, r.dz)}</text>
            {/each}
          </g>
          <g in:fade={{ delay: 500, duration: 250 }}>
            <text x={RX} y="70" class="boxtitle">{t('one pass · SimpleScheduler', '一次 pass · SimpleScheduler')}</text>
            <text x={RX} y="84" class="tag">{t('keeps: nothing', '保留：无')}</text>
            {#each rows as r, i}
              <path d="M {LX + LW + 6} {ry(i) + RH / 2} H {RX - 6}" fill="none" stroke={r.keep ? '#b8b4aa' : 'var(--line)'} stroke-width="1.4" stroke-dasharray={r.keep ? 'none' : '3 3'} marker-end={r.keep ? 'url(#ss-arrow)' : undefined} />
              {#if r.keep}
                <rect x={RX} y={ry(i)} width={RW} height={RH} rx="6" fill="white" stroke="var(--fg)" />
                <text x={RX + 10} y={ry(i) + 21} class="tag strong">{t(r.r, r.rz)}</text>
              {:else}
                <rect x={RX} y={ry(i)} width={RW} height={RH} rx="6" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
                <text x={RX + 10} y={ry(i) + 15} class="tag strong" style:fill="var(--muted)">{t('not needed', '不需要')}</text>
                <text x={RX + 10} y={ry(i) + 28} class="tag">{t(r.r, r.rz)}</text>
              {/if}
            {/each}
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('the encoders batch whatever is already waiting, up to 32 requests, and by default do not wait for more', 'encoder 把已在等待的组 batch，最多 32 个 request，默认不再等更多')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`an encoder also keeps recent results by the input's hash (Ch. ${CH_OMNI} Step 2), but in its own code, not the scheduler's`, `encoder 也按输入的 hash 保留近期结果（Ch. ${CH_OMNI} Step 2），但在自己的代码里，不在 scheduler 里`)}</text>
        </g>
      {/if}
      <!-- 9: 2 of 3, a loop · the same six rows; SGLang's own code in the middle, changed only at the edges -->
      {#if cur.scene === 'loop'}
        {@const LX = 16}
        {@const LW = 300}
        {@const RX = 384}
        {@const RW = 320}
        {@const RH = 34}
        {@const ry = (i: number) => 92 + i * 40}
        {@const rows = [
          { n: 'recv_requests', d: 'inbox → Req objects', dz: 'inbox → Req 对象', own: false, r: "read the stage's inbox, not a socket", rz: '读 stage 的 inbox，不是 socket' },
          { n: 'get_next_batch_to_run', d: 'prefill or decode? room in the pool?', dz: 'prefill 还是 decode？page 池有空间吗？', own: true, r: 'the same choice, the same pool', rz: '同样的选择，同样的池' },
          { n: 'ScheduleBatch → tensors', d: 'ids · positions · pages', dz: 'ids · 位置 · pages', own: true, r: 'the same tensors, the same pages', rz: '同样的张量，同样的 page' },
          { n: 'ModelRunner.forward', d: 'embed → 32 layers → logits', dz: 'embed → 32 层 → logits', own: false, r: "the model's runner: embeddings in, each token sent on", rz: '模型的 runner：embedding 进，每个 token 发出' },
          { n: 'Sampler', d: 'logits → tokens', dz: 'logits → token', own: false, r: "picked inside the model's runner", rz: '在模型的 runner 里选' },
          { n: 'process_batch_result', d: 'append · finish · send', dz: '追加 · 结束 · 发送', own: true, r: 'the same append and finish; its send is switched off', rz: '追加和结束照旧；send 被关掉' },
        ]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`2 of 3 · a loop · SGLang's own scheduler, reused for the thinker and the talker`, `2 / 3 · 循环 · SGLang 自己的 scheduler，thinker 和 talker 复用`)}</text>
          <g in:fade={{ delay: 100, duration: 250 }}>
            <text x={LX} y="70" class="boxtitle">{t(`SGLang's loop · Ch. ${CH_ENGINE} Step 1`, `SGLang 的循环 · Ch. ${CH_ENGINE} Step 1`)}</text>
            <text x={LX} y="84" class="tag">{t('keeps: waiting and running lists, KV pages, the radix tree', '保留：waiting 和 running 列表、KV pages、radix tree')}</text>
            {#each rows as r, i}
              <rect x={LX} y={ry(i)} width={LW} height={RH} rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={LX + 10} y={ry(i) + 15} class="mono strong">{r.n}</text>
              <text x={LX + 10} y={ry(i) + 28} class="tag">{t(r.d, r.dz)}</text>
            {/each}
          </g>
          <g in:fade={{ delay: 500, duration: 250 }}>
            <text x={RX} y="70" class="boxtitle">{t("a loop · SGLang-Omni's OmniScheduler", '循环 · SGLang-Omni 的 OmniScheduler')}</text>
            <text x={RX} y="84" class="tag">{t('keeps: the same lists, pages and tree', '保留：同样的列表、page 和树')}</text>
            {#each rows as r, i}
              <path d="M {LX + LW + 6} {ry(i) + RH / 2} H {RX - 6}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" />
              <rect x={RX} y={ry(i)} width={RW} height={RH} rx="6" fill={r.own ? 'var(--accent-soft)' : 'white'} stroke={r.own ? 'var(--accent)' : 'var(--fg)'} />
              <text x={RX + 10} y={ry(i) + 15} class="tag strong">{r.own ? t("SGLang's own code", 'SGLang 自己的代码') : t('changed', '有改动')}</text>
              <text x={RX + 10} y={ry(i) + 28} class="tag">{t(r.r, r.rz)}</text>
            {/each}
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t("OmniScheduler calls SGLang's Scheduler methods directly (no copy, no subclass), and overrides the ones that touch the inbox or the runner", 'OmniScheduler 直接调用 SGLang Scheduler 的方法（不复制、不继承），只重写碰 inbox 或 runner 的那些')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("left out of SGLang's scheduler: its sockets, tokenizer, grammar, LoRA and speculative decoding (SGLang-Omni's design notes)", '没要 SGLang scheduler 的：socket、分词器、grammar、LoRA 和 speculative decoding（SGLang-Omni 的设计笔记）')}</text>
        </g>
      {/if}
      <!-- 10: the talker's version · step 9's rows, the ready check slid in, and the check at work on one batch -->
      {#if cur.scene === 'talker'}
        {@const LX = 34}
        {@const LW = 250}
        {@const rh = 26}
        {@const ry = (i: number) => 78 + i * 32}
        {@const loopRows = [
          { n: 'recv_requests', t: 'changed', tz: '有改动', f: 'white', s: 'var(--fg)', at: 0 },
          { n: 'get_next_batch_to_run', t: "SGLang's own", tz: 'SGLang 自己的', f: 'var(--accent-soft)', s: 'var(--accent)', at: 1 },
          { n: 'ScheduleBatch → tensors', t: "SGLang's own", tz: 'SGLang 自己的', f: 'var(--accent-soft)', s: 'var(--accent)', at: 2 },
          { n: 'ModelRunner.forward', t: 'changed', tz: '有改动', f: 'white', s: 'var(--fg)', at: 3 },
          { n: 'Sampler', t: 'changed', tz: '有改动', f: 'white', s: 'var(--fg)', at: 4 },
          { n: 'process_batch_result', t: "SGLang's own", tz: 'SGLang 自己的', f: 'var(--accent-soft)', s: 'var(--accent)', at: 5 },
        ]}
        {@const inserted = tp >= 1}
        {@const checking = tp >= 2 && tp <= 4}
        {@const running = tp >= 6}
        {@const PX = 320}
        {@const PY = 76}
        {@const reqs = ['A', 'B', 'C']}
        {@const qx = (i: number) => PX + 130 + i * 56}
        {@const cHere = tp >= 5}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`the check Ch. ${CH_OMNI} Step 5 asked for · step 9's loop, plus one row`, `Ch. ${CH_OMNI} Step 5 要的检查 · 第 9 步的循环，加一行`)}</text>

          <!-- the loop: step 9's five rows; rows below the new one slide down to make room -->
          <text x="16" y="68" class="boxtitle">{t("the talker's loop", 'talker 的循环')}</text>
          {#each loopRows as r}
            {@const y = ry(r.at + (inserted && r.at >= 2 ? 1 : 0))}
            {@const hot = running && r.n === 'ModelRunner.forward'}
            <g style="transform: translate(0px, {y}px); transition: transform 0.7s ease-in-out;">
              <rect x={LX} y="0" width={LW} height={rh} rx="6" fill={r.f} stroke={r.s} stroke-width={hot ? 2 : 1} />
              <text x={LX + 10} y="17" class="mono strong">{r.n}</text>
              <text x={LX + LW - 8} y="17" text-anchor="end" class="tag">{t(r.t, r.tz)}</text>
            </g>
          {/each}
          {#if inserted}
            <g in:fade={{ delay: 650, duration: 400 }} out:fade={{ duration: 150 }}>
              <rect x={LX} y={ry(2)} width={LW} height={rh} rx="6" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width={checking ? 2.5 : 1.5} />
              <text x={LX + 10} y={ry(2) + 17} class="mono strong">{t('ready check', '就绪检查')}</text>
              <text x={LX + LW - 8} y={ry(2) + 17} text-anchor="end" class="tag">{t('next token here?', '下一个 token 到了？')}</text>
              <text x={LX + LW + 8} y={ry(2) + 17} class="tag strong" style:fill="var(--gen)">{t('new', '新')}</text>
            </g>
          {/if}
          <path d="M {LX} {ry(inserted ? 6 : 5) + rh / 2} H {LX - 20} V {ry(0) + rh / 2} H {LX - 6}" fill="none" stroke="#b8b4aa" stroke-width="1.4" marker-end="url(#ss-arrow)" style="transition: d 0.7s ease-in-out;" />

          <!-- the check at work on one batch: three iterations along the top, held while C's token is missing, then run -->
          {#if tp >= 2}
            {@const curIt = tp <= 3 ? 0 : tp <= 5 ? 1 : 2}
            {@const result = (k: number) => (k === 0 ? (tp >= 3 ? 'held' : 'checking') : k === 1 ? (tp >= 4 ? 'held' : '') : tp >= 6 ? 'ran' : '')}
            <g transition:fade={{ duration: 300 }}>
              <rect x={PX} y={PY} width="384" height="200" rx="10" fill="#fbfaf7" stroke="var(--line)" />
              {#each [0, 1, 2] as k}
                {@const r = k <= curIt ? result(k) : ''}
                {@const ix = PX + 12 + k * 122}
                <rect x={ix} y={PY + 12} width="112" height="34" rx="6"
                  fill={r === 'held' ? 'var(--eos-soft)' : r === 'ran' ? 'var(--accent-soft)' : k === curIt ? 'white' : 'none'}
                  stroke={k === curIt ? 'var(--fg)' : r === 'held' ? RED : r === 'ran' ? 'var(--accent)' : 'var(--faint)'}
                  stroke-width={k === curIt ? 2 : 1} stroke-dasharray={k > curIt ? '3 3' : 'none'} style="transition: fill 0.3s, stroke 0.3s;" />
                <text x={ix + 56} y={PY + 26} text-anchor="middle" class="tag strong" style:fill={k > curIt ? 'var(--muted)' : 'var(--fg)'}>{t(`iteration ${k + 1}`, `第 ${k + 1} 轮`)}</text>
                <text x={ix + 56} y={PY + 39} text-anchor="middle" class="tag strong" style:fill={r === 'held' ? RED : 'var(--fg)'}>{r === 'held' ? t('held', '等待') : r === 'ran' ? t('ran', '已跑') : r === 'checking' ? t('checking', '检查中') : ''}</text>
              {/each}
              <!-- a pulse on the iteration that just started -->
              {#key curIt}
                <rect x={PX + 12 + curIt * 122} y={PY + 12} width="112" height="34" rx="6" fill="none" stroke="var(--fg)" class="ss-pulse" />
              {/key}

              <text x={PX + 14} y={PY + 80} class="tag strong">{t("the talker's batch", 'talker 的 batch')}</text>
              <text x={PX + 14} y={PY + 114} class="tag strong">{t('next token', '下一个 token')}</text>
              {#each reqs as q, i}
                <rect x={qx(i)} y={PY + 67} width="40" height="18" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width={running ? 2 : 1} />
                <text x={qx(i) + 20} y={PY + 80} text-anchor="middle" class="tag strong">{q}</text>
                {#if i < 2}
                  <rect x={qx(i) + 6} y={PY + 100} width="28" height="20" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
                  <text x={qx(i) + 20} y={PY + 114} text-anchor="middle" class="tag strong">{t('here', '已到')}</text>
                {:else}
                  <rect x={qx(i) + 6} y={PY + 100} width="28" height="20" rx="4" fill="var(--eos-soft)" stroke={RED} stroke-dasharray="3 2" />
                {/if}
              {/each}
              <!-- C's token: it appears on the thinker's side, then moves into C's slot -->
              {#if tp >= 4}
                <g transition:fade={{ duration: 200 }}>
                  {#if !cHere}<text x={PX + 330} y={PY + 136} text-anchor="middle" class="tag" transition:fade={{ duration: 150 }}>{t('from the thinker', '来自 thinker')}</text>{/if}
                  <g style="transform: translate({cHere ? qx(2) + 6 : PX + 316}px, {PY + 100}px); transition: transform 0.9s ease-in-out;">
                    <rect x="0" y="0" width="28" height="20" rx="4" fill="var(--gen-soft)" stroke="var(--gen)" />
                    <text x="14" y="14" text-anchor="middle" class="tag strong">{cHere ? t('here', '已到') : 'C'}</text>
                  </g>
                </g>
              {/if}
              <text x={PX + 14} y={PY + 164} class="tag strong" style:fill={tp === 3 || tp === 4 ? RED : 'var(--fg)'}>
                {tp <= 2 ? t("checking that every request's next token is here", '在检查每个 request 的下一个 token 是否已到') : tp <= 4 ? t("C's token is not here, so nothing runs", 'C 的 token 没到，什么都不跑') : tp === 5 ? t("C's token arrives from the thinker", 'C 的 token 从 thinker 到达') : t('all three are here, so one forward pass runs', '三个都到了，跑一次前向')}
              </text>
              <text x={PX + 14} y={PY + 180} class="tag">
                {tp <= 2 ? '' : tp <= 4 ? t('the loop goes back to the top and checks again', '循环回到开头再查一次') : tp === 5 ? t('through the inbox, filed under C', '经 inbox 到达，归到 C 名下') : t('for A, B and C together', 'A、B、C 一起')}
              </text>
            </g>
          {/if}

          <g in:fade={{ delay: 600, duration: 250 }}>
            <text x="18" y="318" class="pt">·</text><text x="28" y="318" class="legend">{t(`overlap scheduling is off (Ch. ${CH_ENGINE} Step 8), since each step's input is the frame the step before wrote`, `overlap scheduling 关闭（Ch. ${CH_ENGINE} Step 8），因为每步的输入是上一步写的帧`)}</text>
            <text x="18" y="336" class="pt">·</text><text x="28" y="336" class="legend">{t(`the radix cache is off (Ch. 8 Step 4), since the tree matches token ids and the talker's prompt arrives as vectors`, `radix cache 关闭（Ch. 8 Step 4），因为树按 token id 匹配，而 talker 的 prompt 以向量到达`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t("chunked prefill is off for the talker too · after the thinker's last token, every request reads a pad token, which is always there", 'talker 也关了 chunked prefill · thinker 最后一个 token 之后，每个 request 读一个 pad token，它总在')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("SGLang-Omni's QwenTalkerScheduler skips a decode batch that is missing any request's input, and rolls back its prep", 'SGLang-Omni 的 QwenTalkerScheduler 会跳过缺任何 request 输入的 decode batch，并回滚其准备')}</text>
        </g>
      {/if}

      <!-- 11: 3 of 3, streaming · the same six rows, one column per streaming stage -->
      {#if cur.scene === 'streaming'}
        {@const LX = 16}
        {@const LW = 196}
        {@const CX = [250, 490]}
        {@const CW2 = 214}
        {@const RH = 34}
        {@const ry = (i: number) => 92 + i * 40}
        {@const rows = [
          { n: 'recv_requests', d: 'inbox → Req objects', dz: 'inbox → Req 对象',
            c: [{ keep: true, r: 'a token at a time, filed by request', rz: '一次一个 token，按 request 归档' }, { keep: true, r: 'frames in pieces, filed by request', rz: '帧逐片到达，按 request 归档' }] },
          { n: 'get_next_batch_to_run', d: 'prefill or decode? room in the pool?', dz: 'prefill 还是 decode？page 池有空间吗？',
            c: [{ keep: false, r: 'each token is handled as it arrives', rz: '每个 token 一到就处理' }, { keep: true, r: `requests with ${CHUNK} new frames, batched`, rz: `凑齐 ${CHUNK} 个新帧的 request，组 batch` }] },
          { n: 'ScheduleBatch → tensors', d: 'ids · positions · pages', dz: 'ids · 位置 · pages',
            c: [{ keep: false, r: 'no model, no GPU', rz: '无模型，不用 GPU' }, { keep: true, r: `up to ${CONTEXT} earlier frames + the ${CHUNK} new`, rz: `最多 ${CONTEXT} 个旧帧 + ${CHUNK} 个新帧` }] },
          { n: 'ModelRunner.forward', d: 'embed → 32 layers → logits', dz: 'embed → 32 层 → logits',
            c: [{ keep: true, r: 'pending tokens → text, on the CPU', rz: '待处理 token → 文本，在 CPU 上' }, { keep: true, r: 'code2wav, once over each window', rz: 'code2wav，每个窗口跑一次' }] },
          { n: 'Sampler', d: 'logits → tokens', dz: 'logits → token',
            c: [{ keep: false, r: 'nothing to pick', rz: '没什么可选' }, { keep: false, r: 'nothing to pick: it writes sound', rz: '没什么可选：它写声音' }] },
          { n: 'process_batch_result', d: 'append · finish · send', dz: '追加 · 结束 · 发送',
            c: [{ keep: true, r: 'send the text; keep half a character', rz: '发出文本；留半个字符' }, { keep: true, r: `send the ${CHUNK} new frames' sound`, rz: `发出 ${CHUNK} 个新帧的声音` }] },
        ]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`3 of 3 · streaming · decode and code2wav, against SGLang's loop row by row`, `3 / 3 · 流式 · decode 和 code2wav，与 SGLang 的循环逐行对照`)}</text>
          <g in:fade={{ delay: 100, duration: 250 }}>
            <text x={LX} y="70" class="boxtitle">{t(`SGLang's loop · Ch. ${CH_ENGINE} Step 1`, `SGLang 的循环 · Ch. ${CH_ENGINE} Step 1`)}</text>
            <text x={LX} y="84" class="tag">{t('keeps: lists, KV pages, the tree', '保留：列表、KV pages、树')}</text>
            {#each rows as r, i}
              <rect x={LX} y={ry(i)} width={LW} height={RH} rx="6" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={LX + 10} y={ry(i) + 15} class="mono strong">{r.n}</text>
              <text x={LX + 10} y={ry(i) + 28} class="tag">{t(r.d, r.dz)}</text>
            {/each}
          </g>
          {#each [{ n: 'decode', k: 'keeps: tokens not yet a whole character', kz: '保留：还没凑成整字符的 token' }, { n: 'code2wav', k: 'keeps: the frames so far', kz: '保留：已到的帧' }] as col, j}
            <g in:fade={{ delay: 500 + j * 400, duration: 250 }}>
              <text x={CX[j]} y="70" class="boxtitle">{col.n}</text>
              <text x={CX[j]} y="84" class="tag">{t(col.k, col.kz)}</text>
              {#each rows as r, i}
                {@const c = r.c[j]}
                {#if j === 0}
                  <path d="M {LX + LW + 7} {ry(i) + RH / 2} H {CX[0] - 7}" fill="none" stroke={c.keep ? '#b8b4aa' : 'var(--line)'} stroke-width="1.4" stroke-dasharray={c.keep ? 'none' : '3 3'} marker-end={c.keep ? 'url(#ss-arrow)' : undefined} />
                {/if}
                {#if c.keep}
                  <rect x={CX[j]} y={ry(i)} width={CW2} height={RH} rx="6" fill="white" stroke="var(--fg)" />
                  <text x={CX[j] + 10} y={ry(i) + 15} class="tag strong">{t('changed', '有改动')}</text>
                {:else}
                  <rect x={CX[j]} y={ry(i)} width={CW2} height={RH} rx="6" fill="none" stroke="var(--faint)" stroke-dasharray="4 3" />
                  <text x={CX[j] + 10} y={ry(i) + 15} class="tag strong" style:fill="var(--muted)">{t('not needed', '不需要')}</text>
                {/if}
                <text x={CX[j] + 10} y={ry(i) + 28} class="tag">{t(c.r, c.rz)}</text>
              {/each}
            </g>
          {/each}
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('half a character: the tokenizer works on bytes, so one character can span two tokens', '半个字符：tokenizer 按字节工作，一个字符可能跨两个 token')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("SGLang-Omni's StreamingDetokenizeScheduler and Code2WavScheduler · code2wav rereads earlier frames so the seams are smooth", 'SGLang-Omni 的 StreamingDetokenizeScheduler 和 Code2WavScheduler · code2wav 重读旧帧，让接缝平滑')}</text>
        </g>
      {/if}
      {#if cur.scene === 'stage' || cur.scene === 'talker'}<LoopProgress ms={lapMs} {lap} label={t('loops', '循环')} />{/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  /* step 2: a scheduler working on the request, as a bar that fills */
  .work { transform-box: fill-box; transform-origin: left; animation: work 1.8s linear forwards; }
  @keyframes work { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  /* step 10: the iteration that just started flashes its outline */
  .ss-pulse { animation: ss-pulse 1s ease-out forwards; }
  @keyframes ss-pulse { from { stroke-width: 6; stroke-opacity: 0.45; } to { stroke-width: 2; stroke-opacity: 0; } }
</style>
