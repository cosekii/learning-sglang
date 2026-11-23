<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);

  // ---- The "script": one entry per generation round -------------------------------------------
  // Every round shows the same three phases, which is the whole point: inference is a loop.
  type Kind = 'prompt' | 'gen' | 'eos';
  interface Tok { text: string; id: number; kind: Kind }
  interface Round { dist: { text: string; p: number }[]; pick: Tok }

  const promptText = 'The capital of France is';
  const prompt: Tok[] = [
    { text: 'The', id: 791, kind: 'prompt' },
    { text: ' capital', id: 6864, kind: 'prompt' },
    { text: ' of', id: 315, kind: 'prompt' },
    { text: ' France', id: 9822, kind: 'prompt' },
    { text: ' is', id: 374, kind: 'prompt' },
  ];
  const rounds: Round[] = [
    { dist: [{ text: ' Paris', p: 0.82 }, { text: ' Lyon', p: 0.05 }, { text: ' a', p: 0.04 }, { text: ' the', p: 0.03 }], pick: { text: ' Paris', id: 12366, kind: 'gen' } },
    { dist: [{ text: '.', p: 0.71 }, { text: ',', p: 0.15 }, { text: ' and', p: 0.06 }, { text: '!', p: 0.02 }], pick: { text: '.', id: 13, kind: 'gen' } },
    { dist: [{ text: '<EOS>', p: 0.88 }, { text: ' It', p: 0.05 }, { text: ' The', p: 0.03 }, { text: '\\n', p: 0.02 }], pick: { text: '<EOS>', id: 128001, kind: 'eos' } },
  ];

  // ---- Expand the script into flat steps: each step is a complete state + caption -------------
  type Phase = 'raw' | 'tokenize' | 'forward' | 'sample' | 'append' | 'done' | 'tally';
  interface Step { phase: Phase; seq: Tok[]; round?: Round; caption: string; captionZh: string }

  function buildSteps(): Step[] {
    const steps: Step[] = [];
    let seq = [...prompt];
    steps.push({ phase: 'raw', seq: [], caption: `A prompt is just a string.`, captionZh: `prompt 就是你输入的一段文字。` });
    steps.push({ phase: 'tokenize', seq, caption: `Split into tokens, each one an integer id. The model never sees the text, only these numbers.`, captionZh: `文字切成小段，每段叫 token。每段有固定的整数编号（id），模型只读编号。` });
    rounds.forEach((round, i) => {
      const n = seq.length;
      steps.push({
        phase: 'forward', seq, round,
        caption: i === 0
          ? `<b>Forward pass.</b> All ${n} ids go in, and out comes a score for every token in the vocabulary. One guess at what comes next.`
          : `Forward pass again, on all ${n}. The first ${prompt.length} get computed from scratch, same as before.`,
        captionZh: i === 0
          ? `<b>前向传播。</b>${n} 个 id 全部输入，输出词表中每个 token 的分数。这是对下一个 token 的一次猜测。`
          : i === 1
            ? `第 2 轮，${n} 段一起进入模型。前 ${prompt.length} 段重算，Paris 第一次作为输入计算。`
            : `第 3 轮，${n} 段一起进入模型。前 ${n - 1} 段是重算，句号第一次算。`,
      });
      steps.push({
        phase: 'sample', seq, round,
        caption: i === 0
          ? `Softmax turns the scores into probabilities. Take the top one, or sample.`
          : round.pick.kind === 'eos'
            ? `This time the top pick is <code>&lt;EOS&gt;</code>. It's a normal token in the vocabulary; the model learned to produce it when it's done.`
            : `Pick again.`,
        captionZh: i === 0
          ? `Softmax 把分数变成概率。取最大的，或者采样。`
          : round.pick.kind === 'eos'
            ? `这次最大的是 <code>&lt;EOS&gt;</code>。它是词表里的普通 token；模型学会了在结束时输出它。`
            : `第 2 轮有了新分数，句号的可能性最大。选中它，下一步接到末尾。`,
      });
      seq = [...seq, round.pick];
      steps.push({
        phase: round.pick.kind === 'eos' ? 'done' : 'append', seq, round,
        caption: round.pick.kind === 'eos'
          ? `<b>Stop.</b> Decode the ids back to text. That's inference: tokenize, then forward, pick, append, until EOS.`
          : i === 0
            ? `<b>Append it.</b> The output becomes part of the input, which is all "autoregressive" means.`
            : `Append.`,
        captionZh: round.pick.kind === 'eos'
          ? `<b>停止。</b>把 id 解码回文本。这就是推理：分词，然后前向、选择、追加，直到 EOS。`
          : i === 0
            ? `<b>追加：</b>把 ␣Paris 接到末尾，下一轮读全部 ${seq.length} 段。边猜边接，直到「结束」，就叫「自回归」。`
            : `把句号接到末尾，${seq.length - 1} 段变 ${seq.length} 段。下一轮仍读全部 ${seq.length} 段。`,
      });
    });
    const counts = rounds.map((_, r) => prompt.length + r);
    const total = counts.reduce((a, b) => a + b, 0);
    steps.push({
      phase: 'tally', seq,
      caption: `<b>The bill.</b> ${total} positions computed for ${rounds.length} new tokens. The first ${prompt.length} columns got the exact same treatment ${rounds.length} times. What's actually being recomputed?`,
      captionZh: `<b>算总账。</b>为 ${rounds.length} 个新 token 计算了 ${total} 个位置。前 ${prompt.length} 列被完全相同地处理了 ${rounds.length} 遍。到底在重复计算什么？`,
    });
    return steps;
  }

  const steps = buildSteps();
  let step = $state(0);
  // Deep-linkable: ?step=7 opens at step 7 (1-based). Applied after hydration so server HTML matches.
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  const cur = $derived(steps[step]);

  // ---- Geometry (SVG viewBox units; the SVG scales to fill the stage) ---------------------------
  const W = 720, H = 400;
  const charW = 8.2, padX = 10, gap = 6, tokH = 30, seqY = 44;
  const boxW = (t: Tok) => Math.round(t.text.length * charW + padX * 2);
  const layout = $derived.by(() => {
    let x = 16;
    return cur.seq.map((t) => { const w = boxW(t); const item = { t, x, w }; x += w + gap; return item; });
  });
  const seqEndX = $derived(layout.length ? layout[layout.length - 1].x + layout[layout.length - 1].w : 16);

  const modelX = W / 2 - 110, modelY = 140, modelW = 220, modelH = 54;
  const distY = 240, barH = 18, barGap = 8, barMaxW = 300, barLabelX = 250;
  const tallyY = 130, tallyRow = 32, tallySz = 22;
  const counts = rounds.map((_, r) => prompt.length + r);

  const fill = (k: Kind) => (k === 'prompt' ? 'var(--accent-soft)' : k === 'gen' ? 'var(--gen-soft)' : 'var(--eos-soft)');
  const stroke = (k: Kind) => (k === 'prompt' ? 'var(--accent)' : k === 'gen' ? 'var(--gen)' : 'var(--eos)');
  const showModel = $derived(['forward', 'sample', 'append', 'done'].includes(cur.phase));
  const showDist = $derived(['sample', 'append', 'done'].includes(cur.phase));
  const flying = $derived(cur.phase === 'append' || cur.phase === 'done');
  const detok = $derived(cur.seq.filter((t) => t.kind !== 'eos').map((t) => t.text).join(''));
  const generated = $derived(detok.slice(promptText.length));

  // how each token box enters, depending on why it appeared
  function enter(i: number) {
    if (cur.phase === 'tokenize') return { y: -14, delay: i * 70, duration: 300, easing: cubicOut };
    if (flying && i === layout.length - 1) return { y: 120, duration: 450, easing: cubicOut };
    return { duration: 0 };
  }
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Autoregressive generation, step {step + 1}">
      <!-- Row 1: the raw prompt, then the token sequence -->
      <text x="16" y="22" class="label">{cur.phase === 'raw' ? 'prompt' : t(`sequence (${cur.seq.length} tokens)`, `序列（${cur.seq.length} 个 token）`)}</text>
      {#if cur.phase === 'raw'}
        <g out:fade={{ duration: 200 }}>
          <rect x="16" y={seqY} width={promptText.length * charW + padX * 2} height={tokH} rx="6" fill="white" stroke="var(--line)" stroke-width="1.5" />
          <text x={16 + padX} y={seqY + 19} class="tok">"{promptText}"</text>
        </g>
      {/if}
      {#each layout as { t, x, w }, i (i)}
        <g in:fly={enter(i)}>
          <rect {x} y={seqY} width={w} height={tokH} rx="6" fill={fill(t.kind)} stroke={stroke(t.kind)} stroke-width="1.5"
                class:pulse={cur.phase === 'forward' && !((step === 5 || step === 8) && $lang === 'zh')} style="animation-delay: {i * 60}ms" />
          <text x={x + w / 2} y={seqY + 19} text-anchor="middle" class="tok">{t.text.replace(/^ /, '␣')}</text>
          <text x={x + w / 2} y={seqY + tokH + 14} text-anchor="middle" class="id">{t.id}</text>
        </g>
      {/each}
      {#if cur.phase === 'tokenize' && $lang === 'zh'}
        <text x="16" y={seqY + tokH + 40} class="note" in:fade>文字 → 小段（token）→ 整数编号（id）→ 模型猜下一段</text>
        <text x="16" y={seqY + tokH + 62} class="note" in:fade>␣ 表示小段开头的空格 · 每个数字对应正上方的小段</text>
        <text x="16" y={seqY + tokH + 84} class="note" in:fade>编号像学号，事先在对照表里分好；同一小段总是同号</text>
      {/if}
      {#if step === 4 && $lang === 'zh'}
        <text x="16" y={seqY + tokH + 40} class="note" in:fade>下一轮：上面 {cur.seq.length} 段一起进入模型，再猜一段，直到「结束」</text>
      {/if}
      {#if step === 5 && $lang === 'zh'}
        <text x="18" y={seqY + tokH + 40} class="pt">·</text>
        <text x="28" y={seqY + tokH + 40} class="note" in:fade>黑色模型和虚线：第 2 轮正在计算，{cur.seq.length} 段一起输入</text>
        <text x="18" y={seqY + tokH + 62} class="pt">·</text>
        <text x="28" y={seqY + tokH + 62} class="note" in:fade>蓝框前 {prompt.length} 段：第 2 次作为输入 · 橙框 Paris：第 1 次作为输入</text>
        <text x="16" y={modelY + modelH + 26} class="note" in:fade>最简示例没存上次结果 → 前 {prompt.length} 段只能重算</text>
      {/if}
      {#if step === 6 && $lang === 'zh'}
        <text x="16" y={seqY + tokH + 40} class="note" in:fade>第 2 轮：只画新结果里可能性最大的 4 段</text>
      {/if}
      {#if step === 7 && $lang === 'zh'}
        <text x="18" y={seqY + tokH + 40} class="pt">·</text>
        <text x="28" y={seqY + tokH + 40} class="note" in:fade>橙色句号：新接的第 {cur.seq.length} 段，固定编号是 13</text>
        <text x="18" y={seqY + tokH + 62} class="pt">·</text>
        <text x="28" y={seqY + tokH + 62} class="note" in:fade>下一轮：上面 {cur.seq.length} 段一起进入模型</text>
      {/if}
      {#if step === 8 && $lang === 'zh'}
        <text x="18" y={seqY + tokH + 40} class="pt">·</text>
        <text x="28" y={seqY + tokH + 40} class="note" in:fade>黑色模型和虚线：第 3 轮正在计算，{cur.seq.length} 段一起输入</text>
        <text x="18" y={seqY + tokH + 62} class="pt">·</text>
        <text x="28" y={seqY + tokH + 62} class="note" in:fade>蓝框前 {prompt.length} 段第 3 次 · 橙框 Paris 第 2 次 · 橙框句号第 1 次</text>
        <text x="16" y={modelY + modelH + 26} class="note" in:fade>最简示例没存上次结果 → 前 {cur.seq.length - 1} 段重算；输入没变，结果不变</text>
      {/if}

      <!-- Model box with wires in and out -->
      {#if showModel}
        <g transition:fade={{ duration: 250 }}>
          <path d="M {seqEndX + 4} {seqY + tokH / 2} H {seqEndX + 22} V {seqY + tokH + 24} H {W / 2} V {modelY - 6}"
                class="wire" class:active={cur.phase === 'forward'} class:neutral-active={(step === 5 || step === 8) && $lang === 'zh'} />
          <polygon points="{W / 2 - 5},{modelY - 8} {W / 2 + 5},{modelY - 8} {W / 2},{modelY}" fill="var(--muted)" />
          <rect x={modelX} y={modelY} width={modelW} height={modelH} rx="10" class="model" class:busy={cur.phase === 'forward'} class:neutral-active={(step === 5 || step === 8) && $lang === 'zh'} />
          <text x={W / 2} y={modelY + 24} text-anchor="middle" class="model-title">transformer</text>
          <text x={W / 2} y={modelY + 42} text-anchor="middle" class="model-sub">
            {cur.phase === 'forward' ? t(`processing ${cur.seq.length} tokens…`, `正在处理 ${cur.seq.length} 个 token…`) : t('scores for every vocab token', '词表中每个 token 的分数')}
          </text>
          <path d="M {W / 2} {modelY + modelH} V {distY - 10}" class="wire" class:active={cur.phase === 'sample'} />
          <polygon points="{W / 2 - 5},{distY - 12} {W / 2 + 5},{distY - 12} {W / 2},{distY - 4}" fill="var(--muted)" />
        </g>
      {/if}

      <!-- Next-token distribution -->
      {#if showDist && cur.round}
        <g transition:fade={{ duration: 250 }}>
          <text x={barLabelX - 60} y={distY + 4} class="label">{step === 4 ? t('p(next token | sequence)', '上一轮猜下一段的结果') : step === 6 ? t('p(next token | sequence)', '下一段的可能性 · 0.71 = 71%') : step === 7 ? t('p(next token | sequence)', '上一轮结果 · 0.71 = 71%') : 'p(next token | sequence)'}</text>
          {#each cur.round.dist as d, i}
            {@const y = distY + 14 + i * (barH + barGap)}
            {@const chosen = d.text === cur.round.pick.text}
            <text x={barLabelX - 8} y={y + 13} text-anchor="end" class="tok" class:dim={!chosen}>{d.text.replace(/^ /, '␣')}</text>
            <rect x={barLabelX} {y} width={d.p * barMaxW} height={barH} rx="3"
                  fill={chosen ? stroke(cur.round.pick.kind) : 'var(--line)'} class="bar" />
            <text x={barLabelX + d.p * barMaxW + 6} y={y + 13} class="id" class:dim={!chosen}>{d.p.toFixed(2)}</text>
          {/each}
          {#if cur.phase === 'sample'}
            <text x={barLabelX + barMaxW + 50} y={distY + 27} class="pick" in:fade>{t('← pick', '← 选中')}</text>
          {/if}
        </g>
      {/if}

      <!-- Done: decoded output -->
      {#if cur.phase === 'done'}
        <g in:fade>
          <rect x="16" y={modelY + 12} width="200" height="30" rx="6" fill="white" stroke="var(--eos)" />
          <text x="28" y={modelY + 31} class="id">{t('output:', '输出：')} <tspan class="out">"{generated}"</tspan></text>
        </g>
      {/if}

      {#if cur.phase === 'tokenize'}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>{t(`Llama-3's tokenizer also puts <|begin_of_text|> (id 128000) in front · left out here`, `实际输入还会在最前面加「开始」标记（id 128000）· 这里省略`)}</text>
      {:else if cur.phase === 'done'}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>{t(`SGLang also stops a request at max_new_tokens (default 128), or at a stop string or token id it names`, `SGLang 还会在 max_new_tokens（默认 128）处停止 request，或在它指定的停止字符串或 token id 处停止`)}</text>
      {:else if step === 8 && $lang === 'zh'}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>怎么少算，第 12 步先算清重复了多少</text>
      {/if}

      <!-- Tally: one row of cells per round, aligned under the token each cell recomputed -->
      {#if cur.phase === 'tally'}
        <g in:fade>
          {#each counts as n, r}
            {@const y = tallyY + r * tallyRow}
            {#each layout.slice(0, n) as { t, x, w }, c}
              <rect x={x + w / 2 - tallySz / 2} {y} width={tallySz} height={tallySz} rx="4" fill={fill(t.kind)} stroke={stroke(t.kind)}
                    in:fly={{ y: -8, delay: (r * 8 + c) * 35, duration: 250 }} />
            {/each}
            {@const last = layout[n - 1]}
            <text x={last.x + last.w / 2 + tallySz / 2 + 10} y={y + 15} class="id" in:fade={{ delay: (r * 8 + n) * 35 }}>{t(`round ${r + 1} · ${n} positions`, `第 ${r + 1} 轮 · ${n} 个位置`)}</text>
          {/each}
          <g in:fade={{ delay: 900 }}>
            <text x="16" y={tallyY + rounds.length * tallyRow + 22} class="sum">{t(`${counts.join(' + ')} = ${counts.reduce((a, b) => a + b, 0)} positions computed`, `${counts.join(' + ')} = ${counts.reduce((a, b) => a + b, 0)} 个位置被计算`)}</text>
            <text x="16" y={tallyY + rounds.length * tallyRow + 44} class="sum">{t(`${rounds.length} tokens produced`, `生成 ${rounds.length} 个 token`)}</text>
            <text x="16" y={tallyY + rounds.length * tallyRow + 70} class="id">{t(`the ${prompt.length} prompt columns: same input, same output, computed ${rounds.length}×`, `这 ${prompt.length} 个 prompt 列：输入相同，输出相同，算了 ${rounds.length} 遍`)}</text>
          </g>
        </g>
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .label { font-size: 11px; fill: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .tok { font-family: var(--mono); font-size: 13px; fill: var(--fg); }
  .id { font-family: var(--mono); font-size: 10.5px; fill: var(--muted); }
  .note { font-size: 12px; fill: var(--muted); }
  .sum { font-size: 15px; font-weight: 600; fill: var(--fg); }
  .out { fill: var(--fg); }
  .dim { opacity: 0.45; }
  .pick { font-size: 12px; fill: var(--fg); font-weight: 600; }
  .wire { fill: none; stroke: var(--line); stroke-width: 2; transition: stroke 300ms; }
  .wire.active { stroke: var(--accent); stroke-dasharray: 6 4; animation: march 700ms linear infinite; }
  .wire.active.neutral-active { stroke: var(--fg); animation: none; }
  .model { fill: #f3f1ec; stroke: var(--line); stroke-width: 1.5; transition: stroke 300ms, fill 300ms; }
  .model.busy { stroke: var(--accent); fill: var(--accent-soft); }
  .model.busy.neutral-active { stroke: var(--fg); fill: #f3f1ec; }
  .model-title { font-size: 14px; font-weight: 600; fill: var(--fg); }
  .model-sub { font-size: 11px; fill: var(--muted); }
  .bar { transition: width 400ms ease-out, fill 300ms; }
  rect.pulse { animation: pulse 900ms ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
  @keyframes march { to { stroke-dashoffset: -20 } }
</style>
