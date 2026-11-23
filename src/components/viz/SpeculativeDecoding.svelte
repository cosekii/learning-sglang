<script lang="ts">
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import type { Deep } from '../../deep';
  import { W_GB, BW, GFLOP_PER_TOKEN, TFLOPS, LAYERS, D_MODEL, D_FF, BYTES } from '../../numbers';
  import { lang } from '../../i18n';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);


  // ---- one request decoding alone, Llama-3-8B on one H100 (Ch. 4 Steps 3 and 5) ----
  const T_READ = (W_GB / (BW * 1000)) * 1000;          // 4.8 ms: the weight read
  const T_TOK = GFLOP_PER_TOKEN / TFLOPS;              // 0.016 ms of math per position
  const fmt1 = (ms: number) => ms.toFixed(1);
  const N = 4;                                          // tokens the example writes
  const T_PLAIN = N * T_READ;                           // 19.1 ms without speculation
  // a pass takes as long as its read; even 5 positions' math (0.08 ms) finishes inside it (Ch. 4 Step 5)

  // the running example: chapter 1's prompt, the target's continuation, and a draft that misses on the 4th token
  const CTX = 'The capital of France is';
  const TARGET = [' Paris', '.', ' It', ' is'];
  const DRAFT = [' Paris', '.', ' The', ' city'];
  const KEPT = DRAFT.findIndex((tok, i) => tok !== TARGET[i]);   // 2 agreed; the 3rd is the target's own, the 4th thrown away

  // DSpark's Table 1, Qwen3-8B target, accepted length per round (counting the target's own token)
  const TABLE = [
    { d: 'GSM8K · math', dZh: 'GSM8K · 数学', v: [5.30, 5.33, 6.17] },
    { d: 'HumanEval · code', dZh: 'HumanEval · 代码', v: [4.33, 4.64, 5.52] },
    { d: 'MT-Bench · chat', dZh: 'MT-Bench · 对话', v: [2.66, 3.11, 3.72] },
  ];

  type Scene = 'pass' | 'before' | 'after' | 'map' | 'eagle' | 'dflash' | 'dspark' | 'compare';
  const steps: { scene: Scene; caption: string; captionZh: string }[] = [
    { scene: 'pass', caption: `A position is one token the pass works on, one row of numbers. Each layer's weights arrive once and every row is multiplied by them while the next layer is read, so 5 rows make the math longer but not the pass.`, captionZh: `position 是 pass 处理的一个 token，一行数字。每层权重只读入一次，所有行都在读下一层时与它相乘，所以 5 行让计算变长，但不让 pass 变长。` },
    { scene: 'before', caption: `Normal decoding writes one token per pass, and each pass reads all ${W_GB} GB of weights in ${fmt1(T_READ)} ms. Five positions in one pass do 5 times the math, and the math still finishes inside that one read.`, captionZh: `普通 decode 每个 pass 写一个 token，每次都在 ${fmt1(T_READ)} ms 内读完全部 ${W_GB} GB 权重。一个 pass 处理 5 个 position 只做 5 倍计算，计算仍在这一次读取内完成。` },
    { scene: 'after', caption: `So guess the next tokens. A draft model proposes ${N}, and the target checks them in one pass. It keeps the ones it agrees with, puts its own token at the first miss, and drops the rest, here ${KEPT + 1} tokens.`, captionZh: `那就猜后面的 token。draft 模型提出 ${N} 个，target 用一个 pass 检查：留下猜对的，在第一个猜错处放自己的 token，丢掉其余，这里得到 ${KEPT + 1} 个 token。` },
    { scene: 'map', caption: `The three drafters differ in how they make the ${N} guesses. EAGLE makes them one pass at a time, DFlash all in one pass, and DSpark in one pass plus a short chain that links each guess to the one before.`, captionZh: `三种 drafter 的区别在于怎么产生这 ${N} 个猜测。EAGLE 一个 pass 猜一个，DFlash 一个 pass 全猜完，DSpark 一个 pass 再加一条短链，把每个猜测连到前一个。` },
    { scene: 'eagle', caption: `EAGLE drafts with one extra layer that reads the target's own hidden states. Each pass makes one guess, and the next pass needs that guess, so ${N} guesses take ${N} passes in a row.`, captionZh: `EAGLE 用一个额外的层做 draft，读 target 自己的隐藏状态。每个 pass 猜一个，下一个 pass 需要这个猜测，所以 ${N} 个猜测要连续 ${N} 个 pass。` },
    { scene: 'dflash', caption: `DFlash's drafter is 5 small layers of its own, fed the target's hidden states as context. The last token and ${N - 1} blanks go through all 5 layers once, and ${N} guesses come out together.`, captionZh: `DFlash 的 drafter 是自己的 5 个小层，以 target 的隐藏状态为 context。最后一个 token 和 ${N - 1} 个空位过一次全部 5 层，${N} 个猜测一起出来。` },
    { scene: 'dspark', caption: `DSpark runs DFlash's one pass, then a small head links each guess to the one above it. It scores each guess's chance to survive and sends the target only the ones worth checking.`, captionZh: `DSpark 先跑 DFlash 的一个 pass，再用一个小 head 把每个猜测连到上一个。它给每个猜测存活的机会打分，只把值得检查的送给 target。` },
    { scene: 'compare', caption: `Normal decoding gets 1 token per target pass. With the same training data and 7 guesses a round, the three drafters get 2.7 to 6.2, and DSpark gets the most in every domain.`, captionZh: `普通 decode 每个 target pass 得 1 个 token。同样的训练数据、每轮 7 个猜测，三种 drafter 得到 2.7 到 6.2 个，DSpark 在每个领域都最多。` },
  ];

  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);
  // step 3's animation, played once: the draft's 4 guesses one by one, the verify pass, the target's picks, what is kept
  let lap = $state(0), lapMs = $state(0);           // the looping step's laps, for LoopProgress
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });   // untracked, so starting a lap does not re-run the effect
  let sp = $state(7);
  $effect(() => {
    if (cur.scene !== 'after') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const AT = [800, 1900, 3000, 4100, 5400, 7200, 8800];
    sp = 0;
    AT.forEach((ms, i) => timers.push(setTimeout(() => (sp = i + 1), ms)));
    nextLap(AT[AT.length - 1]);
    return () => timers.forEach(clearTimeout);
  });
  const W = 720, H = 400;
  const RED = 'var(--eos)', GREEN = '#16a34a', DRAFT_C = 'var(--gen)', TARGET_C = 'var(--accent)';

  // the shared time axis of steps 2 and 3
  const X0 = 74, PX_MS = 26;
  const tx = (ms: number) => X0 + ms * PX_MS;
  const BURSTS = 16;                                    // the compute lane's bursts, a layer pair each: math happens as each layer's weights arrive
  const BURST_W = 1.2;                                  // one position's burst, drawn wide enough to see
  const MATH_X = Math.round((BURSTS * BURST_W) / (T_TOK * PX_MS));   // how much wider than scale
  const T_GUESS = 0.3;                                  // one draft pass, drawn at a nominal length (steps 5–7)
  const DRAFT_END = N * T_GUESS;
  // the rows steps 2 and 3 share
  const YA = 96, YB = 160, BAR_H = 22, AXIS_Y = 204;

</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Speculative decoding, step {step + 1}">
      <defs>
        {#each [['sd-arrow', '#b8b4aa'], ['sd-arrow-gen', 'var(--gen)'], ['sd-arrow-acc', 'var(--accent)'], ['sd-arrow-fg', 'var(--fg)'], ['sd-arrow-grn', '#16a34a']] as [id, c]}
          <marker {id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
          </marker>
        {/each}
      </defs>

      <!-- the pieces steps 2 and 3 share: the axis, one pass (its read, its math), the autoregressive row -->
      {#snippet axis(y: number)}
        <line x1={tx(0)} y1={y} x2={tx(20)} y2={y} stroke="var(--faint)" />
        {#each [0, 5, 10, 15, 20] as tick}
          <line x1={tx(tick)} y1={y} x2={tx(tick)} y2={y + 4} stroke="var(--faint)" />
          <text x={tx(tick)} y={y + 16} text-anchor="middle" class="tag">{tick} ms</text>
        {/each}
      {/snippet}
      {#snippet pass(t0: number, y: number, positions: number, label: string)}
        <rect x={tx(t0)} {y} width={T_READ * PX_MS - 3} height={BAR_H} rx="4" fill="#5b5b5b" />
        <text x={tx(t0) + (T_READ * PX_MS) / 2} y={y + 15} text-anchor="middle" class="tag onbox">{label}</text>
        <rect x={tx(t0)} y={y + BAR_H + 3} width={T_READ * PX_MS - 3} height="8" rx="2" fill="none" stroke="var(--line)" />
        {#each Array(BURSTS) as _, b}
          <rect x={tx(t0) + 1 + (b * (T_READ * PX_MS - 5)) / BURSTS} y={y + BAR_H + 4} width={BURST_W * positions} height="6" rx="0.5" fill={TARGET_C} />
        {/each}
      {/snippet}
      {#snippet lanes(y: number)}
        <text x={X0 - 8} y={y + 15} text-anchor="end" class="tag strong">{t('memory', '内存')}</text>
        <text x={X0 - 8} y={y + BAR_H + 10} text-anchor="end" class="tag strong">{t('compute', '计算')}</text>
      {/snippet}
      {#snippet autoregressive()}
        <text x="16" y="64" class="boxtitle">{t('normal autoregressive decoding', '普通自回归 decode')}</text>
        {@render lanes(YA)}
        {#each TARGET as tok, i}
          <rect x={tx(i * T_READ) + 32} y="72" width={T_READ * PX_MS - 67} height="18" rx="5" fill="var(--accent-soft)" stroke={TARGET_C} />
          <text x={tx(i * T_READ) + (T_READ * PX_MS) / 2 - 1} y="85" text-anchor="middle" class="mono strong">{tok.trim()}</text>
          {@render pass(i * T_READ, YA, 1, t('reads 16 GB', '读取 16 GB'))}
        {/each}
        <text x={tx(T_PLAIN) + 8} y={YA + 15} class="tag strong">{N} tokens · {fmt1(T_PLAIN)} ms</text>
      {/snippet}

      <!-- 1: inside one pass · each layer's weights arrive, its math runs while the next layer is read; 1 position against 5 -->
      {#if cur.scene === 'pass'}
        {@const LX0 = 92}
        {@const LN = 6}
        {@const LCW = 66}
        {@const BW1 = 5}
        {@const lx = (k: number) => LX0 + k * LCW}
        {@const panels = [{ y: 78, n: 1, t: '1 position · normal decoding, the newest token', zh: '1 个 position · 普通 decode，最新的 token' }, { y: 182, n: 5, t: '5 positions · 5 tokens in one pass, as prefill does', zh: '5 个 position · 一个 pass 处理 5 个 token，如同 prefill' }]}
        {@const MX = 536}
        {@const W_MB = Math.round((D_MODEL * D_FF * BYTES) / 1e6)}
        {@const fmtN = (n: number) => n.toLocaleString('en-US')}
        {@const ENL = Math.round(BW1 / ((T_TOK / LAYERS) * (LCW / (T_READ / LAYERS))))}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`inside one pass · the weights arrive a layer at a time · the first ${LN} of ${LAYERS} layers`, `一个 pass 内部 · 权重逐层到达 · 前 ${LN} 层，共 ${LAYERS} 层`)}</text>
          {#each panels as p, pi}
            <g in:fade={{ delay: 100 + pi * 700, duration: 250 }}>
              <text x="16" y={p.y} class="boxtitle">{t(p.t, p.zh)}</text>
              <text x={LX0 - 8} y={p.y + 25} text-anchor="end" class="tag strong">{t('memory', '内存')}</text>
              <text x={LX0 - 8} y={p.y + 53} text-anchor="end" class="tag strong">{t('compute', '计算')}</text>
              {#each Array(LN) as _, k}
                <rect x={lx(k)} y={p.y + 10} width={LCW - 2} height="22" rx="3" fill="#5b5b5b" opacity={k % 2 ? 0.8 : 1} />
                <text x={lx(k) + LCW / 2} y={p.y + 25} text-anchor="middle" class="tag onbox">{t(`layer ${k + 1}`, `第 ${k + 1} 层`)}</text>
                <rect x={lx(k) + LCW - 2} y={p.y + 40} width={BW1 * p.n} height="18" rx="2" fill={TARGET_C} />
              {/each}
              <rect x={lx(0)} y={p.y + 40} width={LN * LCW + BW1 * p.n} height="18" rx="3" fill="none" stroke="var(--line)" />
              <!-- one layer's math: the positions' rows times a weight matrix -->
              {#each Array(p.n) as _, r}
                <rect x={MX} y={p.y + 8 + r * 8} width="34" height="7" rx="1.5" fill="var(--accent-soft)" stroke={TARGET_C} stroke-width="0.8" />
              {/each}
              <text x={MX + 44} y={p.y + 27} text-anchor="middle" class="tag strong">×</text>
              <rect x={MX + 54} y={p.y + 4} width="50" height="44" rx="3" fill="#5b5b5b" />
              <text x={MX + 79} y={p.y + 30} text-anchor="middle" class="tag onbox">W</text>
              <text x={MX} y={p.y + 64} class="tag"><tspan class="strong">x</tspan> · {p.n} × {fmtN(D_MODEL)}{t(', a row per position', '，每个 position 一行')}</text>
              <text x={MX} y={p.y + 77} class="tag"><tspan class="strong">W</tspan> · {fmtN(D_MODEL)} × {fmtN(D_FF)} = {W_MB} MB</text>
            </g>
          {/each}
          <!-- what the picture shows, on the first panel -->
          <g in:fade={{ delay: 1500, duration: 250 }}>
            <path d="M {lx(1) + 2} {78 + 61} V {78 + 66}" fill="none" stroke="var(--faint)" stroke-width="1" />
            <text x={lx(1) - 4} y={78 + 77} class="tag">{t("layer 1's math runs while layer 2 is read, then waits", '第 1 层的计算在读第 2 层时进行，然后等待')}</text>
          </g>
          <g in:fade={{ delay: 2000 }}>
            <text x={W / 2} y="296" text-anchor="middle" class="legend">{t('5 rows make each burst of math 5 times longer, and it still ends before the next layer arrives', '5 行让每段计算长 5 倍，仍在下一层到达前结束')}</text>
            <text x={W / 2} y="314" text-anchor="middle" class="legend">{t(`so the pass ends when the read ends: ${fmt1(T_READ)} ms, for 1 position or 5`, `所以 pass 随读取结束而结束：${fmt1(T_READ)} ms，1 个或 5 个 position 都一样`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`W: one of a layer's weight matrices (the MLP's gate) · the pass: ${fmt1(T_READ)} ms of reading, ${T_TOK.toFixed(3)} ms of math a position (Ch. 4 Step 5)`, `W：一层的权重矩阵之一（MLP 的 gate）· pass：读取 ${fmt1(T_READ)} ms，每个 position 计算 ${T_TOK.toFixed(3)} ms（第 4 章第 5 步）`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(`the math is drawn about ${ENL}× wider than scale so it shows`, `计算画得比实际宽约 ${ENL} 倍，便于看清`)}</text>
        </g>
      {/if}

      <!-- 1: before and after · one pass per token, against one pass over 5 positions -->
      {#if cur.scene === 'before'}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`one request on Llama-3-8B and one H100 · ${N} tokens two ways`, `一个 request · Llama-3-8B 加一块 H100 · ${N} 个 token 两种走法`)}</text>
          <g in:fade={{ delay: 100, duration: 250 }}>{@render autoregressive()}</g>
          <g in:fade={{ delay: 600, duration: 250 }}>
            <text x="16" y="152" class="boxtitle">{t(`one pass over 5 positions · if the next ${N} tokens were known`, `一个 pass 处理 5 个 position · 若已知后面 ${N} 个 token`)}</text>
            {@render lanes(YB)}
            {@render pass(0, YB, 5, t('reads 16 GB', '读取 16 GB'))}
            <text x={tx(T_READ) + 8} y={YB + 15} class="tag strong">{t(`one read · ${fmt1(T_READ)} ms`, `一次读取 · ${fmt1(T_READ)} ms`)}</text>
            <text x={tx(T_READ) + 8} y={YB + 30} class="tag">{t("5 positions' math: still inside the read", '5 个 position 的计算：仍在读取之内')}</text>
            {@render axis(AXIS_Y)}
          </g>
          <g in:fade={{ delay: 900, duration: 250 }}>
            <rect x="16" y="240" width="16" height="10" rx="2" fill="#5b5b5b" />
            <text x="38" y="249" class="tag">{t(`reading ${W_GB} GB of weights, ${fmt1(T_READ)} ms`, `读取 ${W_GB} GB 权重，${fmt1(T_READ)} ms`)}</text>
            <rect x="270" y="242" width="6" height="6" rx="1" fill={TARGET_C} />
            <text x="282" y="249" class="tag">{t(`math, done layer by layer as the weights arrive: ${T_TOK.toFixed(3)} ms a position`, `计算，随权重逐层到达逐层完成：每个 position ${T_TOK.toFixed(3)} ms`)}</text>
          </g>
          <g in:fade={{ delay: 1200 }}>
            <text x={W / 2} y="300" text-anchor="middle" class="legend">{t(`if the next ${N} tokens were known, ${N} reads would become 1`, `若已知后面 ${N} 个 token，${N} 次读取就变成 1 次`)}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`the math is drawn about ${MATH_X}× wider than scale so it shows`, `计算画得比实际宽约 ${MATH_X} 倍，便于看清`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('batch 1 · the KV cache read is left out, small at this length (Ch. 4 Step 6)', 'batch 1 · 未计 KV cache 读取，此长度下很小（第 4 章第 6 步）')}</text>
        </g>
      {/if}

      <!-- 3: speculative decoding · step 2's second row, built as it happens: the draft's guesses, then one pass that checks them -->
      {#if cur.scene === 'after'}
        {@const CX = 150}
        {@const CW = 86}
        {@const ROWS = [{ y: 244, n: 'the draft guesses', zh: 'draft 的猜测', c: DRAFT_C }, { y: 272, n: "the target's picks", zh: 'target 的选择', c: TARGET_C }, { y: 300, n: 'kept', zh: '留下', c: 'var(--fg)' }]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t("speculative decoding · step 2's second row, with a draft in front", '投机解码 · 第 2 步的第二行，前面加一个 draft')}</text>
          {@render autoregressive()}

          <!-- the speculative row, built on its timeline as the round runs -->
          <text x="16" y="152" class="boxtitle">{t('speculative decoding', '投机解码')}</text>
          {@render lanes(YB)}
          {#each Array(N) as _, k}
            {#if sp >= k + 1}
              <g transition:fade={{ duration: 200 }}>
                <rect x={tx(k * T_GUESS)} y={YB} width={T_GUESS * PX_MS - 1.5} height={BAR_H} rx="2" fill={DRAFT_C} opacity="0.85" />
                <rect x={tx(k * T_GUESS) + T_GUESS * PX_MS - 3} y={YB + BAR_H + 4} width="1.5" height="6" fill={DRAFT_C} />
              </g>
            {/if}
          {/each}
          {#if sp >= 5}
            <g transition:fade={{ duration: 150 }}>{@render pass(DRAFT_END, YB, 5, t('verify · 5 positions', '验证 · 5 个 position'))}</g>
          {/if}
          {#if sp >= 1}<text x={tx(DRAFT_END + T_READ) + 8} y={YB + 30} class="tag" style:fill={DRAFT_C} transition:fade={{ duration: 200 }}>{t(`amber: the draft, a small model · ${N} passes, each a small read and a little math`, `琥珀色：draft，一个小模型 · ${N} 个 pass，各是一次小读取加少量计算`)}</text>{/if}
          {#if sp >= 7}
            <text x={tx(DRAFT_END + T_READ) + 8} y={YB + 15} class="tag strong" transition:fade={{ duration: 300 }}>{KEPT + 1} tokens · draft + {fmt1(T_READ)} ms</text>
          {/if}
          {@render axis(AXIS_Y)}

          <!-- the tokens, filled in step with the timeline -->
          {#each ROWS as r, ri}
            <text x="16" y={r.y + 14} class="tag strong" style:fill={r.c}>{t(r.n, r.zh)}</text>
            {#each Array(N) as _, k}
              {@const show = ri === 0 ? sp >= k + 1 : ri === 1 ? sp >= 6 : sp >= 7}
              {@const gone = ri > 0 && k > KEPT}
              {@const tok = ri === 0 ? DRAFT[k] : TARGET[k]}
              <rect x={CX + k * CW} y={r.y} width={CW - 16} height="20" rx="5" fill="none" stroke="var(--line)" stroke-dasharray="3 3" />
              {#if show}
                <g transition:fade={{ duration: 250 }}>
                  {#if gone}
                    <text x={CX + k * CW + (CW - 16) / 2} y={r.y + 14} text-anchor="middle" class="tag" style:fill={RED}>{ri === 1 ? t('not used', '未采用') : t('thrown away', '丢弃')}</text>
                  {:else}
                    <rect x={CX + k * CW} y={r.y} width={CW - 16} height="20" rx="5"
                      fill={ri === 0 ? 'var(--gen-soft)' : ri === 1 ? 'var(--accent-soft)' : k < KEPT ? '#dcfce7' : 'var(--accent-soft)'}
                      stroke={ri === 0 ? DRAFT_C : ri === 1 ? TARGET_C : k < KEPT ? GREEN : TARGET_C} />
                    <text x={CX + k * CW + (CW - 16) / 2} y={r.y + 14} text-anchor="middle" class="mono strong">{tok.trim()}</text>
                    {#if ri === 1}
                      <text x={CX + k * CW + CW - 13} y={r.y + 14} class="tag strong" style:fill={k < KEPT ? GREEN : RED}>{k < KEPT ? '✓' : '✗'}</text>
                    {/if}
                  {/if}
                </g>
              {/if}
            {/each}
          {/each}
          {#if sp >= 7}
            <g transition:fade={{ duration: 300 }}>
              {#each [t('"Paris" and "." match: kept', '"Paris" 和 "." 一致：留下'), t('"The" is wrong: "It" replaces it', '"The" 猜错：换成 "It"'), t('"city" came after "The": dropped', '"city" 跟在 "The" 后：丢掉')] as line, li}
                <text x={CX + N * CW + 2} y={282 + li * 15} class="pt">·</text>
                <text x={CX + N * CW + 12} y={282 + li * 15} class="tag">{line}</text>
              {/each}
              <rect x="30" y="330" width="660" height="26" rx="13" fill="var(--accent-soft)" stroke="var(--accent)" />
              <text x={W / 2} y="347" text-anchor="middle" class="need"><tspan class="strong">{t('time per token', '每个 token 的时间')}</tspan> {t("= (the draft's small reads + the target's one read) ÷ tokens kept", '=（draft 的小读取 + target 的一次读取）÷ 留下的 token 数')}</text>
            </g>
          {/if}
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("the draft is drawn at a nominal length (its cost is steps 5–7) · with sampling, an acceptance test keeps the target's distribution", 'draft 按示意长度绘制（其耗时见第 5–7 步）· 采样时由接受检验保持 target 的分布')}</text>
          <LoopProgress ms={lapMs} {lap} label={t('plays once', '播放一次')} />
        </g>
      {/if}

      <!-- 3: the map · the same 4 guesses three ways; DSpark is DFlash's pass plus EAGLE's link between guesses -->
      {#if cur.scene === 'map'}
        {@const CW = 220}
        {@const CX = [16, 250, 484]}
        {@const GY = 132}
        {@const BY = 180}
        {@const IY = 222}
        {@const gx = (x: number, j: number) => x + 14 + j * 49}
        {@const cards = [
          { n: 'EAGLE', passes: `${N} passes, one after another`, passesZh: `${N} 个 pass，一个接一个`, link: 'each guess sees the one before', linkZh: '每个猜测看到前一个' },
          { n: 'DFlash', passes: '1 pass for all of them', passesZh: '1 个 pass 全猜完', link: 'each guess made on its own', linkZh: '每个猜测独立产生' },
          { n: 'DSpark', passes: "DFlash's 1 pass, then a short chain", passesZh: 'DFlash 的 1 个 pass，再加一条短链', link: 'each guess sees the one before', linkZh: '每个猜测看到前一个' },
        ]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`three drafters · the same ${N} guesses, made three ways · read each card bottom to top`, `三种 drafter · 同样的 ${N} 个猜测，三种做法 · 每张卡片从下往上读`)}</text>
          {#each cards as c, i}
            {@const x = CX[i]}
            <g in:fade={{ delay: 100 + i * 400, duration: 250 }}>
              <rect {x} y="56" width={CW} height="250" rx="12" fill="#fbfaf7" stroke="var(--line)" />
              <text x={x + 14} y="76" class="boxtitle">{t(`${i + 1} of 3`, `第 ${i + 1}/3 种`)}</text>
              <text x={x + 14} y="96" class="slab strong small">{c.n}</text>
              {#each DRAFT as tok, j}
                <rect x={gx(x, j)} y={GY} width="40" height="20" rx="5" fill="var(--gen-soft)" stroke={DRAFT_C} />
                <text x={gx(x, j) + 20} y={GY + 14} text-anchor="middle" class="mono strong">{tok.trim()}</text>
              {/each}
              {#if i === 0}
                {#each Array(N) as _, j}
                  <rect x={gx(x, j)} y={BY} width="40" height="22" rx="5" fill={DRAFT_C} opacity="0.85" />
                  <text x={gx(x, j) + 20} y={BY + 15} text-anchor="middle" class="tag onbox">pass {j + 1}</text>
                  <path d="M {gx(x, j) + 20} {BY - 2} V {GY + 26}" fill="none" stroke={DRAFT_C} stroke-width="1.3" marker-end="url(#sd-arrow-gen)" />
                  {#if j < N - 1}
                    <path d="M {gx(x, j) + 36} {GY + 22} C {gx(x, j) + 40} {GY + 34}, {gx(x, j + 1) + 8} {BY - 18}, {gx(x, j + 1) + 8} {BY - 10} L {gx(x, j + 1) + 8} {BY - 3}" fill="none" stroke={DRAFT_C} stroke-width="1.2" stroke-dasharray="3 2" marker-end="url(#sd-arrow-gen)" />
                  {/if}
                {/each}
                <rect x={gx(x, 0)} y={IY} width="40" height="18" rx="5" fill="var(--accent-soft)" stroke={TARGET_C} />
                <text x={gx(x, 0) + 20} y={IY + 13} text-anchor="middle" class="mono strong">is</text>
                <path d="M {gx(x, 0) + 20} {IY - 2} V {BY + 26}" fill="none" stroke={TARGET_C} stroke-width="1.2" marker-end="url(#sd-arrow-acc)" />
                <text x={gx(x, 1)} y={IY + 13} class="tag">{t('dashed: a guess fed back in', '虚线：把猜测喂回去')}</text>
              {:else}
                <rect x={gx(x, 0)} y={BY} width={3 * 49 + 40} height="22" rx="5" fill={DRAFT_C} opacity="0.85" />
                <text x={gx(x, 0) + (3 * 49 + 40) / 2} y={BY + 15} text-anchor="middle" class="tag onbox">{i === 1 ? t('one pass', '一个 pass') : t("DFlash's one pass", 'DFlash 的一个 pass')}</text>
                {#each Array(N) as _, j}
                  <path d="M {gx(x, j) + 20} {BY - 2} V {GY + 26}" fill="none" stroke={DRAFT_C} stroke-width="1.3" marker-end="url(#sd-arrow-gen)" />
                  <rect x={gx(x, j)} y={IY} width="40" height="18" rx="5" fill={j ? 'white' : 'var(--accent-soft)'} stroke={j ? 'var(--faint)' : TARGET_C} stroke-dasharray={j ? '3 2' : 'none'} />
                  <text x={gx(x, j) + 20} y={IY + 13} text-anchor="middle" class={j ? 'tag' : 'mono strong'}>{j ? t('blank', '空位') : 'is'}</text>
                  <path d="M {gx(x, j) + 20} {IY - 2} V {BY + 26}" fill="none" stroke="#b8b4aa" stroke-width="1.2" marker-end="url(#sd-arrow)" />
                {/each}
                {#if i === 2}
                  {#each Array(N - 1) as _, j}
                    <path d="M {gx(x, j) + 22} {GY - 2} Q {(gx(x, j) + gx(x, j + 1)) / 2 + 20} {GY - 20}, {gx(x, j + 1) + 18} {GY - 4}" fill="none" stroke={GREEN} stroke-width="1.6" marker-end="url(#sd-arrow-grn)" />
                  {/each}
                {/if}
              {/if}
              <text x={x + 14} y="272" class="tag strong">{t(c.passes, c.passesZh)}</text>
              <text x={x + 14} y="288" class="tag" style:fill={i === 1 ? RED : GREEN}>{t(c.link, c.linkZh)}</text>
            </g>
          {/each}
          <text x={W / 2} y="334" text-anchor="middle" class="legend" in:fade={{ delay: 1500 }}>{t("DSpark is DFlash's one pass plus EAGLE's link between guesses (green), made cheap", 'DSpark 是 DFlash 的一个 pass 加 EAGLE 的猜测间链接（绿色），并做得便宜')}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`${N} guesses each to compare them · the defaults are 5 steps for EAGLE in SGLang and a block of 16 for DFlash`, `各画 ${N} 个猜测便于比较 · 默认值：SGLang 中 EAGLE 为 5 步，DFlash 为 16 个一块`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('SGLang: --speculative-algorithm EAGLE3 or DFLASH; DSpark runs under the same block flags as DFLASH', 'SGLang：--speculative-algorithm EAGLE3 或 DFLASH；DSpark 使用与 DFLASH 相同的 block 标志')}</text>
        </g>
      {/if}

      <!-- the target's layers, drawn across, with tapped layers lit; shared by steps 5 and 6 -->
      {#snippet layers(x: number, y: number, taps: number[], names: string[])}
        <text {x} y={y - (names.length ? 20 : 8)} class="tag strong">{t(`the target · ${LAYERS} layers, left to right`, `target · ${LAYERS} 层，从左到右`)}</text>
        {#each Array(LAYERS) as _, l}
          <rect x={x + l * 7} {y} width="5" height="30" rx="1" fill={taps.includes(l) ? TARGET_C : 'var(--line)'} />
        {/each}
        {#each taps as l, k}
          {#if names[k]}<text x={x + l * 7 + 2.5} y={y - 5} text-anchor="middle" class="tag">{names[k]}</text>{/if}
        {/each}
      {/snippet}
      {#snippet num(x: number, y: number, n: number)}
        <circle cx={x} cy={y} r="8" fill="var(--fg)" />
        <text {x} y={y + 3.5} text-anchor="middle" class="tag onbox">{n}</text>
      {/snippet}

      <!-- 4: 1 of 3, EAGLE · a chain, left to right: each pass takes the guess before it -->
      {#if cur.scene === 'eagle'}
        {@const CY = 214}
        {@const HW = 50}
        {@const KW = 44}
        {@const AR = 14}
        {@const X0E = 70}
        {@const hx = (k: number) => X0E + 40 + AR + k * (HW + AR + KW + AR)}
        {@const kx = (k: number) => hx(k) + HW + AR}
        {@const TAPS = [3, 16, 29]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('1 of 3 · EAGLE · one small layer, one guess per pass', '第 1/3 种 · EAGLE · 一个小层，每个 pass 猜一个')}</text>
          <!-- ① the target's hidden states, fused -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            {@render num(30, 96, 1)}
            {@render layers(hx(0) - 60, 82, TAPS, [t('low', '低层'), t('middle', '中层'), t('high', '高层')])}
            {#each TAPS as l}
              <path d="M {hx(0) - 60 + l * 7 + 2.5} 114 C {hx(0) - 60 + l * 7 + 2.5} 150, {hx(0) + HW / 2} 160, {hx(0) + HW / 2} {CY - 21}" fill="none" stroke={TARGET_C} stroke-width="1.1" marker-end="url(#sd-arrow-acc)" />
            {/each}
            <text x={hx(0) - 60 + 236} y="140" class="tag">{t('its hidden states at 3 depths, into pass 1', '它在 3 个深度的隐藏状态，进入 pass 1')}</text>
          </g>
          <!-- ② the chain -->
          <g in:fade={{ delay: 500, duration: 250 }}>
            {@render num(30, CY, 2)}
            <rect x={X0E} y={CY - 10} width="40" height="20" rx="5" fill="var(--accent-soft)" stroke={TARGET_C} />
            <text x={X0E + 20} y={CY + 4} text-anchor="middle" class="mono strong">is</text>
            {#each DRAFT as tok, k}
              <path d="M {(k ? kx(k - 1) + KW : X0E + 40) + 2} {CY} H {hx(k) - 3}" fill="none" stroke={k ? DRAFT_C : TARGET_C} stroke-width="1.4" marker-end={k ? 'url(#sd-arrow-gen)' : 'url(#sd-arrow-acc)'} />
              <rect x={hx(k)} y={CY - 17} width={HW} height="34" rx="6" fill={DRAFT_C} opacity="0.85" />
              <text x={hx(k) + HW / 2} y={CY - 3} text-anchor="middle" class="tag onbox">head</text>
              <text x={hx(k) + HW / 2} y={CY + 10} text-anchor="middle" class="tag onbox">pass {k + 1}</text>
              <path d="M {hx(k) + HW + 2} {CY} H {kx(k) - 3}" fill="none" stroke={DRAFT_C} stroke-width="1.4" marker-end="url(#sd-arrow-gen)" />
              <rect x={kx(k)} y={CY - 11} width={KW} height="22" rx="5" fill="var(--gen-soft)" stroke={DRAFT_C} />
              <text x={kx(k) + KW / 2} y={CY + 4} text-anchor="middle" class="mono strong">{tok.trim()}</text>
            {/each}
          </g>
          <!-- ③ the time it takes -->
          <g in:fade={{ delay: 900, duration: 250 }}>
            {@render num(30, 270, 3)}
            {#each Array(N) as _, k}
              <rect x={hx(k)} y="262" width={HW} height="14" rx="3" fill={DRAFT_C} opacity="0.55" />
            {/each}
            <path d="M {hx(0)} 284 V 290 H {hx(N - 1) + HW} V 284" fill="none" stroke="var(--faint)" />
            <text x={(hx(0) + hx(N - 1) + HW) / 2} y="304" text-anchor="middle" class="tag strong">{t(`${N} passes, one after another: each waits for the guess before it`, `${N} 个 pass，一个接一个：每个都等前一个猜测`)}</text>
          </g>
          <text x={W / 2} y="340" text-anchor="middle" class="legend" in:fade={{ delay: 1200 }}>{t(`then the target checks all ${N} guesses in one pass (step 3)`, `然后 target 用一个 pass 检查全部 ${N} 个猜测（第 3 步）`)}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('EAGLE-3: a low, a middle and a high layer fused, trained on its own drafts · layer positions drawn for illustration', 'EAGLE-3：低、中、高三个层融合，用自己的 draft 训练 · 层位置为示意')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('SGLang also branches: 4 candidates a step, the 8 likeliest checked as a tree (--speculative-eagle-topk 4)', 'SGLang 还会分支：每步 4 个候选，最可能的 8 个按树检查（--speculative-eagle-topk 4）')}</text>
        </g>
      {/if}

      <!-- 5: 2 of 3, DFlash · context from above, tokens left to right through the drafter's 5 layers in one pass -->
      {#if cur.scene === 'dflash'}
        {@const TAPS = [2, 9, 15, 22, 29]}
        {@const LX = 170}
        {@const SL = 232}
        {@const SW = 30}
        {@const SG = 16}
        {@const sx = (k: number) => SL + k * (SW + SG)}
        {@const RY = (j: number) => 196 + j * 26}
        {@const OUTX = sx(4) + SW + 24}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t(`2 of 3 · DFlash · all ${N} guesses in one pass`, `第 2/3 种 · DFlash · 一个 pass 出全部 ${N} 个猜测`)}</text>
          <!-- ① the target's hidden states → ② one context -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            {@render num(LX - 22, 84, 1)}
            {@render layers(LX, 76, TAPS, [])}
            {#each TAPS as l}
              <path d="M {LX + l * 7 + 2.5} 108 L {LX + l * 7 + 2.5} 124" fill="none" stroke={TARGET_C} stroke-width="1.1" marker-end="url(#sd-arrow-acc)" />
            {/each}
            {@render num(LX - 22, 138, 2)}
            <rect x={LX} y="128" width={sx(4) + SW - LX} height="22" rx="5" fill="var(--accent-soft)" stroke={TARGET_C} />
            <text x={LX + 8} y="143" class="tag strong">{t("context: 5 of the target's hidden states, joined", 'context：拼接 target 的 5 个隐藏状态')}</text>
            {#each Array(5) as _, k}
              <path d="M {sx(k) + SW / 2} 152 V {RY(0) - 14}" fill="none" stroke={TARGET_C} stroke-width="1.1" marker-end="url(#sd-arrow-acc)" />
            {/each}
            <text x={sx(4) + SW + 8} y="143" class="tag">{t('into every drafter layer', '进入每个 drafter 层')}</text>
          </g>
          <!-- ③ the input → ④ 5 drafter layers, one pass → ⑤ the guesses -->
          <g in:fade={{ delay: 500, duration: 250 }}>
            {@render num(60, RY(0) - 22, 3)}
            {#each Array(N) as _, j}
              <rect x="70" y={RY(j) - 10} width="56" height="20" rx="5" fill={j ? 'white' : 'var(--accent-soft)'} stroke={j ? 'var(--faint)' : TARGET_C} stroke-dasharray={j ? '3 2' : 'none'} />
              <text x="98" y={RY(j) + 4} text-anchor="middle" class={j ? 'tag' : 'mono strong'}>{j ? t('blank', '空位') : 'is'}</text>
              <path d="M 130 {RY(j)} H {SL - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.1" marker-end="url(#sd-arrow)" />
            {/each}
            {@render num(sx(0) - 14, RY(N - 1) + 40, 4)}
            {#each Array(5) as _, k}
              <rect x={sx(k)} y={RY(0) - 12} width={SW} height={RY(N - 1) - RY(0) + 24} rx="5" fill="var(--gen-soft)" stroke={DRAFT_C} />
              <text x={sx(k) + SW / 2} y={RY(N - 1) + 28} text-anchor="middle" class="tag">{k + 1}</text>
              {#if k < 4}<path d="M {sx(k) + SW + 2} {(RY(0) + RY(N - 1)) / 2} H {sx(k + 1) - 3}" fill="none" stroke={DRAFT_C} stroke-width="1.2" marker-end="url(#sd-arrow-gen)" />{/if}
            {/each}
            <text x={(sx(0) + sx(4) + SW) / 2} y={RY(N - 1) + 44} text-anchor="middle" class="tag strong">{t("the drafter's own 5 layers, run once", 'drafter 自己的 5 个层，只跑一次')}</text>
          </g>
          <g in:fade={{ delay: 900, duration: 250 }}>
            {@render num(OUTX + 28, RY(0) - 22, 5)}
            {#each DRAFT as tok, j}
              <path d="M {sx(4) + SW + 2} {RY(j)} H {OUTX - 3}" fill="none" stroke={DRAFT_C} stroke-width="1.2" marker-end="url(#sd-arrow-gen)" />
              <rect x={OUTX} y={RY(j) - 10} width="56" height="20" rx="5" fill="var(--gen-soft)" stroke={DRAFT_C} />
              <text x={OUTX + 28} y={RY(j) + 4} text-anchor="middle" class="mono strong">{tok.trim()}</text>
            {/each}
            <text x={OUTX + 66} y={RY(1) + 4} class="tag strong">{t(`${N} guesses,`, `${N} 个猜测，`)}</text>
            <text x={OUTX + 66} y={RY(2) + 4} class="tag strong">{t('together', '一起出来')}</text>
          </g>
          <text x={W / 2} y="340" text-anchor="middle" class="legend" in:fade={{ delay: 1300 }}>{t('no guess sees the others, so later ones miss more: on chat 72% of first guesses survive, 63% of 7th', '猜测互相看不见，越靠后错得越多：对话中第 1 个猜测 72% 存活，第 7 个 63%')}</text>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t(`DFlash: Chen, Liang, Liu (ICML 2026) · ${N} positions drawn; its default block is 16, in the same one pass · taps illustrative`, `DFlash：Chen, Liang, Liu（ICML 2026）· 画了 ${N} 个 position；默认块为 16，仍是同一个 pass · 抽取位置为示意`)}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("survival rates: DSpark's paper, Qwen3-4B target, given every earlier guess survived (step 8's setup)", '存活率：DSpark 论文，Qwen3-4B 为 target，假设之前的猜测都存活（第 8 步的设定）')}</text>
        </g>
      {/if}

      <!-- 6: 3 of 3, DSpark · left to right: DFlash's pass, the linking head, the chance to survive, the target -->
      {#if cur.scene === 'dspark'}
        {@const RY = (j: number) => 126 + j * 34}
        {@const SURV = [0.95, 0.85, 0.68, 0.21]}
        {@const KEEP = 3}
        {@const C = { in: 20, pass: 98, g: 214, conf: 326, tgt: 470 }}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t("3 of 3 · DSpark · DFlash's one pass, then a small head that links the guesses", '第 3/3 种 · DSpark · DFlash 的一个 pass，再加一个小 head 连接猜测')}</text>
          <!-- ① input → ② DFlash's pass -->
          <g in:fade={{ delay: 100, duration: 250 }}>
            {@render num(C.in + 28, 80, 1)}
            <text x={C.in + 28} y="102" text-anchor="middle" class="tag strong">{t('input', '输入')}</text>
            {#each Array(N) as _, j}
              <rect x={C.in} y={RY(j) - 10} width="56" height="20" rx="5" fill={j ? 'white' : 'var(--accent-soft)'} stroke={j ? 'var(--faint)' : TARGET_C} stroke-dasharray={j ? '3 2' : 'none'} />
              <text x={C.in + 28} y={RY(j) + 4} text-anchor="middle" class={j ? 'tag' : 'mono strong'}>{j ? t('blank', '空位') : 'is'}</text>
              <path d="M {C.in + 58} {RY(j)} H {C.pass - 4}" fill="none" stroke="#b8b4aa" stroke-width="1.1" marker-end="url(#sd-arrow)" />
            {/each}
            {@render num(C.pass + 42, 80, 2)}
            <text x={C.pass + 42} y="102" text-anchor="middle" class="tag strong">{t("DFlash's one pass", 'DFlash 的一个 pass')}</text>
            <rect x={C.pass} y={RY(0) - 12} width="84" height={RY(N - 1) - RY(0) + 24} rx="6" fill={DRAFT_C} opacity="0.85" />
            <text x={C.pass + 42} y={(RY(0) + RY(N - 1)) / 2 + 4} text-anchor="middle" class="tag onbox">{t('as in step 6', '同第 6 步')}</text>
          </g>
          <!-- ③ the guesses, each linked to the one above -->
          <g in:fade={{ delay: 500, duration: 250 }}>
            {@render num(C.g + 30, 80, 3)}
            <text x={C.g + 30} y="102" text-anchor="middle" class="tag strong">{t('linked guesses', '连起来的猜测')}</text>
            {#each DRAFT as tok, j}
              <path d="M {C.pass + 86} {RY(j)} H {C.g - 4}" fill="none" stroke={DRAFT_C} stroke-width="1.1" marker-end="url(#sd-arrow-gen)" />
              <rect x={C.g} y={RY(j) - 10} width="60" height="20" rx="5" fill="var(--gen-soft)" stroke={DRAFT_C} />
              <text x={C.g + 30} y={RY(j) + 4} text-anchor="middle" class="mono strong">{tok.trim()}</text>
              {#if j < N - 1}
                <path d="M {C.g + 64} {RY(j) + 5} A 15 15 0 0 1 {C.g + 69.5} {RY(j) + 20.9} L {C.g + 64} {RY(j + 1) - 5}" fill="none" stroke={GREEN} stroke-width="1.6" marker-end="url(#sd-arrow-grn)" />
              {/if}
            {/each}
            <text x={C.g + 92} y={(RY(0) + RY(N - 1)) / 2 + 4} class="tag" style:fill={GREEN}>{t('small head', '小 head')}</text>
          </g>
          <!-- ④ the chance each survives, and the trim -->
          <g in:fade={{ delay: 900, duration: 250 }}>
            {@render num(C.conf + 50, 80, 4)}
            <text x={C.conf + 50} y="102" text-anchor="middle" class="tag strong">{t('chance to survive', '存活机会')}</text>
            {#each SURV as a, j}
              <rect x={C.conf} y={RY(j) - 4} width="100" height="8" rx="4" fill="var(--line)" />
              <rect x={C.conf} y={RY(j) - 4} width={100 * a} height="8" rx="4" fill={j < KEEP ? GREEN : RED} opacity="0.75" />
              <text x={C.conf + 108} y={RY(j) + 4} class="tag strong" style:fill={j < KEEP ? 'var(--fg)' : RED}>{a.toFixed(2)}</text>
            {/each}
            <path d="M {C.g - 6} {(RY(KEEP - 1) + RY(KEEP)) / 2} H {C.tgt + 70}" fill="none" stroke={RED} stroke-width="1.3" stroke-dasharray="4 3" />
            <text x={C.tgt + 76} y={(RY(KEEP - 1) + RY(KEEP)) / 2 + 4} class="tag strong" style:fill={RED}>{t('cut', '截断')}</text>
          </g>
          <!-- ⑤ the target checks what is left, and adds its own -->
          <g in:fade={{ delay: 1300, duration: 250 }}>
            {@render num(C.tgt + 30, 80, 5)}
            <text x={C.tgt + 30} y="102" text-anchor="middle" class="tag strong">{t('the target checks 3', 'target 检查 3 个')}</text>
            {#each ['Paris', '.', 'It', ''] as tok, j}
              <path d="M {C.conf + 136} {RY(j)} H {C.tgt - 4}" fill="none" stroke={j < KEEP ? '#b8b4aa' : 'var(--line)'} stroke-width="1.1" stroke-dasharray={j < KEEP ? 'none' : '3 3'} marker-end={j < KEEP ? 'url(#sd-arrow)' : undefined} />
              {#if j < KEEP}
                <rect x={C.tgt} y={RY(j) - 10} width="60" height="20" rx="5" fill={j < KEPT ? '#dcfce7' : 'var(--accent-soft)'} stroke={j < KEPT ? GREEN : TARGET_C} />
                <text x={C.tgt + 30} y={RY(j) + 4} text-anchor="middle" class="mono strong">{tok}</text>
                <text x={C.tgt + 66} y={RY(j) + 4} class="tag strong" style:fill={j < KEPT ? GREEN : TARGET_C}>{j < KEPT ? '✓' : t('its own', '自己的')}</text>
              {:else}
                <text x={C.tgt + 30} y={RY(j) + 4} text-anchor="middle" class="tag">{t('not sent', '未送出')}</text>
              {/if}
            {/each}
          </g>
          <!-- why the link matters, in one example -->
          <g in:fade={{ delay: 1700 }}>
            <text x="18" y="296" class="pt">·</text><text x="28" y="296" class="legend">{t('the link: in DFlash each guess is made on its own; here each next guess is based on the guess before it', '链接：DFlash 中每个猜测独立产生；这里每个新猜测都基于前一个')}</text>
            <text x="18" y="313" class="pt">·</text><text x="28" y="313" class="legend">{t('the cut: in a full batch, checking a likely miss takes room from other requests, so fewer are sent', '截断：batch 满时，检查很可能错的猜测会挤占其他 request 的空间，所以少送')}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t("the chances are illustrative · each is the product of the guess's own score and those above it, which must all survive", '概率为示意 · 每个是该猜测自身分数与上面各猜测分数的乘积，上面的都必须存活')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t('DSpark: DeepSeek-AI and Peking University (2026) · its small head is a rank-256 bias from the guess above', 'DSpark：DeepSeek-AI 与北京大学（2026）· 小 head 是来自上一个猜测的 rank-256 偏置')}</text>
        </g>
      {/if}

      <!-- 7: does it work · tokens per target pass, against normal decoding's 1 -->
      {#if cur.scene === 'compare'}
        {@const GX0 = 90}
        {@const GW = 196}
        {@const YB = 268}
        {@const SC = 28}
        {@const COLS = ['#94a3b8', DRAFT_C, GREEN]}
        <g transition:fade={{ duration: 250 }}>
          <text x="16" y="42" class="rowlabel">{t('does it work · tokens per target pass, Qwen3-8B · higher is better', '有用吗 · 每个 target pass 的 token 数，Qwen3-8B · 越高越好')}</text>
          <g in:fade={{ delay: 100, duration: 250 }}>
            <rect x={GX0} y="58" width="14" height="10" rx="2" fill="white" stroke="var(--faint)" stroke-dasharray="3 2" />
            <text x={GX0 + 20} y="67" class="tag strong">{t('normal decoding', '普通 decode')}</text>
            {#each ['EAGLE-3', 'DFlash', 'DSpark'] as n, i}
              <rect x={GX0 + 130 + i * 100} y="58" width="14" height="10" rx="2" fill={COLS[i]} />
              <text x={GX0 + 150 + i * 100} y="67" class="tag strong">{n}</text>
            {/each}
            {#each [0, 2, 4, 6] as v}
              <line x1={GX0 - 10} y1={YB - v * SC} x2={GX0 + 3 * GW - 10} y2={YB - v * SC} stroke="var(--line)" />
              <text x={GX0 - 16} y={YB - v * SC + 3} text-anchor="end" class="tag">{v}</text>
            {/each}
          </g>
          {#each TABLE as g, gi}
            {@const bx = (i: number) => GX0 + gi * GW + 14 + i * 42}
            <g in:fade={{ delay: 300 + gi * 300, duration: 250 }}>
              <rect x={bx(0)} y={YB - SC} width="34" height={SC} rx="3" fill="white" stroke="var(--faint)" stroke-dasharray="3 2" />
              <text x={bx(0) + 17} y={YB - SC - 5} text-anchor="middle" class="tag strong">1</text>
              {#each g.v as v, i}
                <rect x={bx(i + 1)} y={YB - v * SC} width="34" height={v * SC} rx="3" fill={COLS[i]} opacity="0.85" />
                <text x={bx(i + 1) + 17} y={YB - v * SC - 5} text-anchor="middle" class="tag strong">{v.toFixed(2)}</text>
              {/each}
              <text x={bx(0) + 80} y={YB + 16} text-anchor="middle" class="tag strong">{t(g.d, g.dZh)}</text>
            </g>
          {/each}
          <g in:fade={{ delay: 1300 }}>
            <text x="18" y="310" class="pt">·</text><text x="28" y="310" class="legend">{t('each round is one target pass, so tokens per pass is how many times fewer passes the answer needs', '每轮是一个 target pass，所以每 pass 的 token 数就是答案所需 pass 数减少的倍数')}</text>
            <text x="18" y="327" class="pt">·</text><text x="28" y="327" class="legend">{t("the draft's own time comes off that; chat is harder to guess than math or code for all three", '还要扣除 draft 自身的时间；对三种 drafter，对话都比数学或代码难猜')}</text>
          </g>
          <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote">{t('source: Cheng et al., DSpark, arXiv 2607.05147, Table 1 · all three retrained on the same data, 7 guesses a round, temperature 1', '来源：Cheng 等，DSpark，arXiv 2607.05147，表 1 · 三种都用相同数据重训，每轮 7 个猜测，temperature 1')}</text>
          <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t("a round's count includes the target's own token", '每轮计数包含 target 自己的 token')}</text>
        </g>
      {/if}

    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

