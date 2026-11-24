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
  const firstScores = [9.80, 7.00, 6.78, 6.49];

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
          ? `<b>Model:</b> all ${n} ids go in, and every candidate token gets a score. One guess at what comes next.`
          : `Forward pass again, on all ${n}. The first ${prompt.length} get computed from scratch, same as before.`,
        captionZh: i === 0
          ? `<b>模型：</b>${n} 个 id 全部输入，每个候选 token 都得到分数。这是对下一个 token 的一次猜测。`
          : i === 1
            ? `第 2 轮，${n} 段一起进入模型。前 ${prompt.length} 段重算，Paris 第一次作为输入计算。`
            : `第 3 轮，${n} 段一起进入模型。前 ${n - 1} 段是重算，句号第一次算。`,
      });
      steps.push({
        phase: 'sample', seq, round,
        caption: i === 0
          ? `Softmax turns the scores into chances. Take the top one, or sample.`
          : round.pick.kind === 'eos'
            ? `This time the top pick is <code>&lt;EOS&gt;</code>. It's a normal token; the model learned to produce it when done.`
            : `Pick again.`,
        captionZh: i === 0
          ? `Softmax 把分数变成可能性。取最大的，或者采样。`
          : round.pick.kind === 'eos'
            ? `这次最大的是 <code>&lt;EOS&gt;</code>。它也是普通 token；模型学会了在结束时输出它。`
            : `第 2 轮有了新分数，句号的可能性最大。选中它，下一步接到末尾。`,
      });
      seq = [...seq, round.pick];
      steps.push({
        phase: round.pick.kind === 'eos' ? 'done' : 'append', seq, round,
        caption: round.pick.kind === 'eos'
          ? `<b>Stop.</b> Decode ids to text; inference tokenizes once, then repeats forward, pick, and append until EOS.`
          : i === 0
            ? `<b>Append it.</b> The output becomes part of the input, which is all "autoregressive" means.`
            : `Append.`,
        captionZh: round.pick.kind === 'eos'
          ? `<b>停止。</b>把 id 解码回文本；推理先分词，再循环计算、选择、追加，直到 EOS。`
          : i === 0
            ? `<b>追加：</b>把 ␣Paris 接到末尾，下一轮读全部 ${seq.length} 段。边猜边接，直到「结束」，就叫「自回归」。`
            : `把句号接到末尾，${seq.length - 1} 段变 ${seq.length} 段。普通句号不等于整段结束，所以下一轮仍读全部 ${seq.length} 段。`,
      });
    });
    const counts = rounds.map((_, r) => prompt.length + r);
    const total = counts.reduce((a, b) => a + b, 0);
    steps.push({
      phase: 'tally', seq,
      caption: `<b>The bill:</b> ${total} positions computed for ${rounds.length} new tokens. The first ${prompt.length} columns had identical inputs and outputs ${rounds.length} times; what gets recomputed?`,
      captionZh: `<b>算总账：</b>Paris、句号和 EOS 是 ${rounds.length} 个新 token，共算 ${total} 格。前 ${prompt.length} 列各算 ${rounds.length} 遍；模型里面到底把什么又算了一遍？`,
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
  let phone = $state(false);
  $effect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  const phoneForward = $derived(phone && step === 2 && $lang === 'zh');
  const repeatForward = $derived(step === 5 && $lang === 'zh');
  const phoneRepeat = $derived(phone && repeatForward);
  const phoneAppend = $derived(phone && step === 7 && $lang === 'zh');
  const phoneDone = $derived(phone && step === 10 && $lang === 'zh');
  const phoneTally = $derived(phone && step === 11 && $lang === 'zh');

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
  const tallyGap = $derived($lang === 'zh' ? 44 : tallyRow);
  const counts = rounds.map((_, r) => prompt.length + r);

  const fill = (k: Kind) => (k === 'prompt' ? 'var(--accent-soft)' : k === 'gen' ? 'var(--gen-soft)' : 'var(--eos-soft)');
  const stroke = (k: Kind) => (k === 'prompt' ? 'var(--accent)' : k === 'gen' ? 'var(--gen)' : 'var(--eos)');
  const showModel = $derived(['forward', 'sample', 'append', 'done'].includes(cur.phase) && !((step === 3 || cur.phase === 'done') && $lang === 'zh'));
  const showDist = $derived(['sample', 'append', 'done'].includes(cur.phase) && !((step === 3 || cur.phase === 'done') && $lang === 'zh'));
  const flying = $derived((cur.phase === 'append' || cur.phase === 'done') && !(cur.phase === 'done' && $lang === 'zh'));
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
    <svg viewBox={phoneAppend ? '0 0 360 440' : phoneForward || phoneRepeat || phoneDone || phoneTally ? '0 0 360 570' : `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Autoregressive generation, step {step + 1}" class:phone-forward={phoneForward} class:phone-repeat={phoneRepeat} class:phone-append={phoneAppend} class:phone-done={phoneDone} class:phone-tally={phoneTally}>
      {#if phoneRepeat}
        <text x="16" y="20" class="label">第 1 轮输入：5 段，各算 1 次</text>
        <rect x="16" y="32" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="32" y="41" class="note">原输入 5 段</text>
        <rect x="180" y="32" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="196" y="41" class="note">新生成 1 段</text>
        {#each prompt as tok, i}
          <rect x={16 + i * 66} y="58" width="64" height="30" rx="6" fill={fill(tok.kind)} stroke={stroke(tok.kind)} stroke-width="1.5" />
          <text x={48 + i * 66} y="78" text-anchor="middle" class="tok">{tok.text.replace(/^ /, '␣')}</text>
          <text x={48 + i * 66} y="103" text-anchor="middle" class="id">{tok.id}</text>
        {/each}
        <text x="16" y="140" class="label">第 2 轮输入：同样 5 段 + ␣Paris</text>
        {#each prompt as tok, i}
          <rect x={16 + i * 66} y="156" width="64" height="30" rx="6" fill={fill(tok.kind)} stroke={stroke(tok.kind)} stroke-width="1.5" />
          <text x={48 + i * 66} y="176" text-anchor="middle" class="tok">{tok.text.replace(/^ /, '␣')}</text>
          <text x={48 + i * 66} y="201" text-anchor="middle" class="id">{tok.id}</text>
        {/each}
        <rect x="16" y="220" width="120" height="30" rx="6" fill={fill('gen')} stroke={stroke('gen')} stroke-width="1.5" />
        <text x="76" y="240" text-anchor="middle" class="tok">␣Paris</text>
        <text x="76" y="265" text-anchor="middle" class="id">12366</text>
        <text x="150" y="240" class="note">← 第 1 次作为输入</text>
        <path d="M 8 148 V 282 H 352 V 148 M 180 282 V 310" fill="none" stroke="var(--fg)" stroke-width="2" />
        <polygon points="175,308 185,308 180,316" fill="var(--fg)" />
        <rect x="40" y="320" width="280" height="70" rx="10" class="model neutral-active" />
        <text x="180" y="347" text-anchor="middle" class="model-title">括线里的 6 段一起进入模型</text>
        <text x="180" y="375" text-anchor="middle" class="model-sub">前 5 段第 2 次算 · Paris 第 1 次算</text>
        <text x="180" y="425" text-anchor="middle" class="note">例句意思：法国的首都是巴黎</text>
        <text x="180" y="453" text-anchor="middle" class="note">␣ = 小段开头的空格</text>
        <text x="180" y="481" text-anchor="middle" class="note">本例没存第 1 轮结果，前 5 段不能跳过</text>
      {:else if phoneAppend}
        <text x="16" y="22" class="label">把句号接到末尾：6 段变 7 段</text>
        <rect x="16" y="32" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="32" y="41" class="note">原输入 5 段</text>
        <rect x="158" y="32" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="174" y="41" class="note">模型选出的 token</text>
        {#each prompt as tok, i}
          <rect x={16 + i * 66} y="58" width="64" height="30" rx="6" fill={fill(tok.kind)} stroke={stroke(tok.kind)} stroke-width="1.5" />
          <text x={48 + i * 66} y="78" text-anchor="middle" class="tok">{tok.text.replace(/^ /, '␣')}</text>
          <text x={48 + i * 66} y="103" text-anchor="middle" class="id">{tok.id}</text>
        {/each}
        <rect x="16" y="122" width="120" height="30" rx="6" fill={fill('gen')} stroke={stroke('gen')} stroke-width="1.5" />
        <text x="76" y="142" text-anchor="middle" class="tok">␣Paris</text>
        <text x="76" y="167" text-anchor="middle" class="id">12366</text>
        <rect x="146" y="122" width="54" height="30" rx="6" fill={fill('gen')} stroke={stroke('gen')} stroke-width="1.5" />
        <text x="173" y="142" text-anchor="middle" class="tok">.</text>
        <text x="173" y="167" text-anchor="middle" class="id">13</text>
        <text x="210" y="140" class="note">← 新接的第 7 段</text>
        <text x="16" y="194" class="note">第 7 步选中句号：0.71 = 71%，可能性最大</text>
        <path d="M 16 216 V 228 H 344 V 216 M 180 228 V 250" fill="none" stroke="var(--fg)" stroke-width="2" />
        <polygon points="175,248 185,248 180,256" fill="var(--fg)" />
        <rect x="40" y="260" width="280" height="66" rx="10" class="model neutral-active" />
        <text x="180" y="286" text-anchor="middle" class="model-title">下一轮：上面 7 段一起进入模型</text>
        <text x="180" y="312" text-anchor="middle" class="model-sub">读完整序列，不只读句号</text>
        <text x="180" y="360" text-anchor="middle" class="note">791、6864、315、9822、374、12366、13</text>
        <text x="180" y="388" text-anchor="middle" class="note">本章最简示例没存旧结果，所以下一轮全部重算</text>
        <text x="180" y="420" text-anchor="middle" class="note">普通句号不等于整段结束；下一步继续猜</text>
      {:else if phoneForward}
        <text x="16" y="22" class="label">序列（5 个 token）</text>
        <rect x="206" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="222" y="21" class="note">蓝框 = 输入 5 段</text>
        {#each prompt as tok, i}
          {@const y = 40 + i * 34}
          <rect x="16" {y} width="190" height="28" rx="6" fill={fill(tok.kind)} stroke={stroke(tok.kind)} stroke-width="1.5" />
          <text x="30" y={y + 19} class="tok">{tok.text.replace(/^ /, '␣')}</text>
          <text x="230" y={y + 19} class="id">{tok.id}</text>
          <path d="M 266 {y + 14} H 306" fill="none" stroke="var(--fg)" stroke-width="2" />
        {/each}
        <path d="M 306 54 V 190 M 306 122 H 330 V 214 H 180 V 226" fill="none" stroke="var(--fg)" stroke-width="2" />
        <polygon points="175,224 185,224 180,232" fill="var(--fg)" />
        <rect x="40" y="232" width="280" height="54" rx="10" class="model neutral-active" />
        <text x="180" y="255" text-anchor="middle" class="model-title">模型：给候选小段打分</text>
        <text x="180" y="277" text-anchor="middle" class="model-sub">5 个编号一起算 · 内部见第 2 章</text>
        <text x="180" y="322" text-anchor="middle" class="model-title">Llama 3 候选 token = 128,256 项</text>
        <text x="180" y="344" text-anchor="middle" class="note">128,000 普通 + 256 特殊（含第 2 步「开始」）</text>
        <text x="180" y="366" text-anchor="middle" class="note">约 128 所千人小学 · 每项 1 个分数，只画 4 项</text>
        <text x="80" y="396" class="note">候选小段</text>
        <text x="205" y="396" class="note">示意分数（非实测）</text>
        {#each rounds[0].dist as d, i}
          <text x="95" y={422 + i * 25} class="tok">{d.text.replace(/^ /, '␣')}</text>
          <text x="250" y={422 + i * 25} class="tok">{firstScores[i].toFixed(2)}</text>
        {/each}
        <text x="180" y="532" text-anchor="middle" class="note">分数越高，越可能成为下一段</text>
        <text x="180" y="554" text-anchor="middle" class="note">下一步：把分数变成可能性再选</text>
      {:else if phoneDone}
        <text x="16" y="20" class="label">序列（8 个 token）</text>
        <rect x="16" y="32" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="32" y="41" class="note">输入 5 段</text>
        <rect x="112" y="32" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="128" y="41" class="note">新生成</text>
        <rect x="204" y="32" width="10" height="10" rx="2" fill="var(--eos-soft)" stroke="var(--eos)" />
        <text x="220" y="41" class="note">EOS（停止）</text>
        {#each prompt as tok, i}
          <rect x={16 + i * 66} y="58" width="64" height="30" rx="6" fill={fill(tok.kind)} stroke={stroke(tok.kind)} stroke-width="1.5" />
          <text x={48 + i * 66} y="78" text-anchor="middle" class="tok">{tok.text.replace(/^ /, '␣')}</text>
          <text x={48 + i * 66} y="103" text-anchor="middle" class="id">{tok.id}</text>
        {/each}
        <rect x="16" y="122" width="120" height="30" rx="6" fill={fill('gen')} stroke={stroke('gen')} stroke-width="1.5" />
        <text x="76" y="142" text-anchor="middle" class="tok">{cur.seq[5].text.replace(/^ /, '␣')}</text>
        <text x="76" y="167" text-anchor="middle" class="id">{cur.seq[5].id}</text>
        <rect x="146" y="122" width="54" height="30" rx="6" fill={fill('gen')} stroke={stroke('gen')} stroke-width="1.5" />
        <text x="173" y="142" text-anchor="middle" class="tok">{cur.seq[6].text}</text>
        <text x="173" y="167" text-anchor="middle" class="id">{cur.seq[6].id}</text>
        <rect x="210" y="122" width="134" height="30" rx="6" fill={fill('eos')} stroke={stroke('eos')} stroke-width="1.5" />
        <text x="277" y="142" text-anchor="middle" class="tok">{cur.seq[7].text}</text>
        <text x="277" y="167" text-anchor="middle" class="id">{cur.seq[7].id}</text>
        <text x="180" y="191" text-anchor="middle" class="note">红色 EOS 接到末尾：停止，不再计算下一段</text>
        <text x="180" y="222" text-anchor="middle" class="model-title">解码（decode）：把编号换回文字</text>
        <text x="180" y="252" text-anchor="middle" class="tok">12366、13</text>
        <text x="180" y="274" text-anchor="middle" class="note">两个要翻回文字的新编号</text>
        <path d="M 180 284 V 296" stroke="var(--fg)" stroke-width="2" />
        <polygon points="175,294 185,294 180,302" fill="var(--fg)" />
        <rect x="70" y="304" width="220" height="38" rx="6" fill="white" stroke="var(--line)" />
        <text x="180" y="328" text-anchor="middle" class="tok">查第 2 步的同一张对照表</text>
        <path d="M 180 342 V 354" stroke="var(--fg)" stroke-width="2" />
        <polygon points="175,352 185,352 180,360" fill="var(--fg)" />
        <text x="180" y="384" text-anchor="middle" class="tok">␣Paris、.</text>
        <text x="180" y="406" text-anchor="middle" class="note">按顺序拼回文字</text>
        <rect x="40" y="422" width="280" height="56" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="180" y="443" text-anchor="middle" class="id">新生成的文字（不含输入和 EOS）</text>
        <text x="180" y="467" text-anchor="middle" class="tok">"{generated}"</text>
        <text x="180" y="501" text-anchor="middle" class="note">128001 是 EOS：只负责停止，不放进输出文字</text>
        <text x="180" y="525" text-anchor="middle" class="note">原输入后接新增文字 = 完整内容；这里只画新增</text>
        <text x="180" y="549" text-anchor="middle" class="note">下一步：第 12 步把三轮的计算量加起来</text>
      {:else if phoneTally}
        <text x="16" y="20" class="label">第 11 步序列的 8 列</text>
        <rect x="16" y="32" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="32" y="41" class="note">输入</text>
        <rect x="92" y="32" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="108" y="41" class="note">新生成</text>
        <rect x="188" y="32" width="10" height="10" rx="2" fill="var(--eos-soft)" stroke="var(--eos)" />
        <text x="204" y="41" class="note">EOS（停止）</text>
        {#each prompt as tok, i}
          <rect x={16 + i * 66} y="58" width="64" height="30" rx="6" fill={fill(tok.kind)} stroke={stroke(tok.kind)} stroke-width="1.5" />
          <text x={48 + i * 66} y="78" text-anchor="middle" class="tok">{tok.text.replace(/^ /, '␣')}</text>
          <text x={48 + i * 66} y="103" text-anchor="middle" class="id">{tok.id}</text>
        {/each}
        {#each cur.seq.slice(5) as tok, i}
          {@const x = [16, 146, 210][i]}
          {@const w = [120, 54, 134][i]}
          <rect {x} y="122" width={w} height="30" rx="6" fill={fill(tok.kind)} stroke={stroke(tok.kind)} stroke-width="1.5" />
          <text x={x + w / 2} y="142" text-anchor="middle" class="tok">{tok.text.replace(/^ /, '␣')}</text>
          <text x={x + w / 2} y="167" text-anchor="middle" class="id">{tok.id}</text>
        {/each}
        <text x="16" y="190" class="note">␣ = 小段开头的空格</text>
        <text x="16" y="214" class="note">1 格 = 这一列在这一轮算 1 次</text>
        {#each counts as n, r}
          {@const y = 238 + r * 62}
          <text x="16" y={y + 20} class="note">第 {r + 1} 轮</text>
          {#each cur.seq.slice(0, n) as tok, c}
            <rect x={80 + c * 34} {y} width="28" height="28" rx="4" fill={fill(tok.kind)} stroke={stroke(tok.kind)} />
          {/each}
          <text x="80" y={y + 42} class="note">算 {n} 格 → {r === 0 ? '␣Paris' : r === 1 ? '.' : 'EOS（停止）'}</text>
        {/each}
        <text x="16" y="440" class="sum">5 + 6 + 7 = 18 格</text>
        <text x="16" y="468" class="note">第一次算：5 + 1 + 1 = 7 格</text>
        <text x="16" y="492" class="note">重算：10 + 1 = 11 格</text>
        <text x="16" y="520" class="note">前 5 列各多算 2 次：10 格</text>
        <text x="16" y="544" class="note">␣Paris 再算 1 次：1 格 · EOS 不再输入</text>
      {:else if repeatForward}
        <text x="16" y="22" class="label">第 1 轮输入：5 段，各算 1 次</text>
        <rect x="460" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="476" y="21" class="note">原输入 5 段</text>
        <rect x="580" y="12" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="596" y="21" class="note">新生成 1 段</text>
        {#each layout.slice(0, prompt.length) as { t, x, w }}
          <rect {x} y="44" width={w} height="30" rx="6" fill={fill(t.kind)} stroke={stroke(t.kind)} stroke-width="1.5" />
          <text x={x + w / 2} y="63" text-anchor="middle" class="tok">{t.text.replace(/^ /, '␣')}</text>
          <text x={x + w / 2} y="88" text-anchor="middle" class="id">{t.id}</text>
        {/each}
        <text x="16" y="130" class="label">第 2 轮输入：同样 5 段 + ␣Paris，共 6 段</text>
        {#each layout as { t, x, w }}
          <rect {x} y="150" width={w} height="30" rx="6" fill={fill(t.kind)} stroke={stroke(t.kind)} stroke-width="1.5" />
          <text x={x + w / 2} y="169" text-anchor="middle" class="tok">{t.text.replace(/^ /, '␣')}</text>
          <text x={x + w / 2} y="194" text-anchor="middle" class="id">{t.id}</text>
        {/each}
        <path d="M 16 210 V 224 H {seqEndX} V 210 M {W / 2} 224 V 242" fill="none" stroke="var(--fg)" stroke-width="2" />
        <polygon points="{W / 2 - 5},240 {W / 2 + 5},240 {W / 2},248" fill="var(--fg)" />
        <rect x={modelX} y="252" width={modelW} height="64" rx="10" class="model neutral-active" />
        <text x={W / 2} y="278" text-anchor="middle" class="model-title">上面 6 段一起进入模型</text>
        <text x={W / 2} y="302" text-anchor="middle" class="model-sub">前 5 段第 2 次算 · ␣Paris 第 1 次算</text>
        <text x="16" y="348" class="note">例句意思：法国的首都是巴黎 · ␣ = 小段开头的空格</text>
        <text x="16" y="374" class="note">本例没存第 1 轮结果，所以前 5 段不能跳过</text>
      {:else}
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
                class:pulse={cur.phase === 'forward' && !((step === 2 || step === 5 || step === 8) && $lang === 'zh')} style="animation-delay: {i * 60}ms" />
          <text x={x + w / 2} y={seqY + 19} text-anchor="middle" class="tok">{t.text.replace(/^ /, '␣')}</text>
          <text x={x + w / 2} y={seqY + tokH + 14} text-anchor="middle" class="id">{t.id}</text>
        </g>
      {/each}
      {#if cur.phase === 'tokenize' && $lang === 'zh'}
        <text x="16" y={seqY + tokH + 40} class="note" in:fade>文字 → 小段（token）→ 整数编号（id）→ 模型猜下一段</text>
        <text x="16" y={seqY + tokH + 62} class="note" in:fade>␣ 表示小段开头的空格 · 每个数字对应正上方的小段</text>
        <text x="16" y={seqY + tokH + 84} class="note" in:fade>编号像学号，事先在对照表里分好；同一小段总是同号</text>
      {/if}
      {#if (step === 2 || step === 3) && $lang === 'zh'}
        <rect x="584" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="600" y="21" class="note">蓝框 = 输入的 5 段</text>
      {/if}
      {#if cur.phase === 'done' && $lang === 'zh'}
        <rect x="360" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="376" y="21" class="note">输入 5 段</text>
        <rect x="466" y="12" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="482" y="21" class="note">新生成</text>
        <rect x="580" y="12" width="10" height="10" rx="2" fill="var(--eos-soft)" stroke="var(--eos)" />
        <text x="596" y="21" class="note">EOS（停止）</text>
      {/if}
      {#if step === 4 && $lang === 'zh'}
        <rect x="460" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="476" y="21" class="note">原输入 5 段</text>
        <rect x="580" y="12" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="596" y="21" class="note">新生成 1 段</text>
        <text x="16" y={seqY + tokH + 40} class="note" in:fade>下一轮：上面 {cur.seq.length} 段作为一整组进入模型，再猜一段，直到「结束」</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">「结束」标记怎么出现，第 10 步讲</text>
      {/if}

      {#if step === 6 && $lang === 'zh'}
        <rect x="460" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="476" y="21" class="note">原输入 5 段</text>
        <rect x="580" y="12" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="596" y="21" class="note">模型选出的 token</text>
        <text x="16" y={seqY + tokH + 40} class="note" in:fade>第 2 轮：只画新结果里可能性最大的 4 段</text>
      {/if}
      {#if step === 7 && $lang === 'zh'}
        <rect x="460" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="476" y="21" class="note">原输入 5 段</text>
        <rect x="580" y="12" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="596" y="21" class="note">模型选出的 token</text>
        <text x="18" y={seqY + tokH + 40} class="pt">·</text>
        <text x="28" y={seqY + tokH + 40} class="note" in:fade>橙色句号：新接的第 {cur.seq.length} 段，固定编号是 13</text>
        <text x="18" y={seqY + tokH + 62} class="pt">·</text>
        <text x="28" y={seqY + tokH + 62} class="note" in:fade>下一轮：上面 {cur.seq.length} 段一起进入模型</text>
      {/if}
      {#if step === 8 && $lang === 'zh'}
        <rect x="460" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="476" y="21" class="note">原输入 5 段</text>
        <rect x="580" y="12" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="596" y="21" class="note">模型选出的 token</text>
        <text x="18" y={seqY + tokH + 40} class="pt">·</text>
        <text x="28" y={seqY + tokH + 40} class="note" in:fade>黑色模型和虚线：第 3 轮正在计算，{cur.seq.length} 段一起输入</text>
        <text x="18" y={seqY + tokH + 62} class="pt">·</text>
        <text x="28" y={seqY + tokH + 62} class="note" in:fade>蓝框前 {prompt.length} 段第 3 次 · 橙框 Paris 第 2 次 · 橙框句号第 1 次</text>
        <text x="16" y={modelY + modelH + 26} class="note" in:fade>最简示例没存上次结果 → 前 {cur.seq.length - 1} 段重算；输入没变，结果不变</text>
      {/if}
      {#if step === 9 && $lang === 'zh'}
        <rect x="360" y="12" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
        <text x="376" y="21" class="note">原输入 5 段</text>
        <rect x="466" y="12" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
        <text x="482" y="21" class="note">新生成的文字</text>
        <rect x="580" y="12" width="10" height="10" rx="2" fill="var(--eos-soft)" stroke="var(--eos)" />
        <text x="596" y="21" class="note">EOS（停止）</text>
        <text x="16" y={seqY + tokH + 40} class="note" in:fade={{ duration: 0 }}>红色 = EOS（结束标记） · 和 Paris、句号一样，选可能性最大的</text>
      {/if}
      {#if cur.phase === 'done' && $lang === 'zh'}
        <text x="16" y={seqY + tokH + 40} class="note" in:fade={{ duration: 0 }}>红色 EOS：接到末尾后停止，不再计算下一段</text>
      {/if}

      <!-- Model box with wires in and out -->
      {#if showModel}
        <g transition:fade={{ duration: (step === 2 || step === 3 || step === 9 || step === 10) && $lang === 'zh' ? 0 : 250 }}>
          {#if step === 2 && $lang === 'zh'}
            {#each layout as { x, w }}
              <path d="M {x + w / 2} {seqY + tokH + 18} V 108 H {W / 2} V {modelY - 6}"
                    class="wire active neutral-active" />
            {/each}
          {:else if step === 7 && $lang === 'zh'}
            <path d="M {layout[0].x} 92 V 96 H {seqEndX} V 92 M {W / 2} 96 V {modelY - 6}" class="wire" />
          {:else}
            <path d="M {seqEndX + 4} {seqY + tokH / 2} H {seqEndX + 22} V {seqY + tokH + 24} H {W / 2} V {modelY - 6}"
                  class="wire" class:active={cur.phase === 'forward'} class:neutral-active={(step === 5 || step === 8) && $lang === 'zh'} />
          {/if}
          <polygon points="{W / 2 - 5},{modelY - 8} {W / 2 + 5},{modelY - 8} {W / 2},{modelY}" fill="var(--muted)" />
          <rect x={modelX} y={modelY} width={modelW} height={modelH} rx="10" class="model" class:busy={cur.phase === 'forward'} class:neutral-active={(step === 2 || step === 5 || step === 8) && $lang === 'zh'} />
          <text x={W / 2} y={modelY + 24} text-anchor="middle" class="model-title">{$lang === 'zh' ? '模型' : 'model'}</text>
          <text x={W / 2} y={modelY + 42} text-anchor="middle" class="model-sub">
            {step === 2 && $lang === 'zh' ? '5 个编号一起算一遍' : cur.phase === 'forward' ? t(`processing ${cur.seq.length} tokens…`, `正在处理 ${cur.seq.length} 个 token…`) : t('a score for every candidate token', '每个候选 token 的分数')}
          </text>
          {#if step === 2 && $lang === 'zh'}
            <path d="M {W / 2} {modelY + modelH} V 204" class="wire" />
            <polygon points="{W / 2 - 5},202 {W / 2 + 5},202 {W / 2},208" fill="var(--muted)" />
          {:else}
            <path d="M {W / 2} {modelY + modelH} V {distY - 10}" class="wire" class:active={cur.phase === 'sample'} class:neutral-active={step === 9 && $lang === 'zh'} />
            <polygon points="{W / 2 - 5},{distY - 12} {W / 2 + 5},{distY - 12} {W / 2},{distY - 4}" fill="var(--muted)" />
          {/if}
        </g>
      {/if}

      {#if step === 2 && $lang === 'zh'}
        <g>
          <text x={W / 2} y="222" text-anchor="middle" class="model-title">候选 token：128,000 个普通 + 256 个特殊（含第 2 步「开始」）= 128,256 项</text>
          <text x={W / 2} y="241" text-anchor="middle" class="note">约 13 万 ≈ 128 所千人小学的人数 · 每项 1 个分数，只画 4 项</text>
          <text x="210" y="264" class="note">候选小段</text>
          <text x="410" y="264" class="note">教学示意分数</text>
          <text x="210" y="286" class="tok">␣Paris</text><text x="410" y="286" class="tok">9.80</text>
          <text x="210" y="307" class="tok">␣Lyon</text><text x="410" y="307" class="tok">7.00</text>
          <text x="210" y="328" class="tok">␣a</text><text x="410" y="328" class="tok">6.78</text>
          <text x="210" y="349" class="tok">␣the</text><text x="410" y="349" class="tok">6.49</text>
          <text x={W / 2} y="374" text-anchor="middle" class="note">分数越高，越可能成为下一段；下一步把分数变成可能性再选</text>
        </g>
      {/if}

      {#if step === 3 && $lang === 'zh' && cur.round}
        <g>
          <text x={W / 2} y="112" text-anchor="middle" class="model-title">softmax = 把分数换成可能性的固定规则（完整公式见深入讲解）</text>
          <text x="16" y="136" class="note">固定数 e≈2.718；分数每差 1，可能性约差 2.718 倍</text>
          <rect x="480" y="126" width="10" height="10" rx="2" fill="var(--gen)" />
          <text x="496" y="135" class="note">选中</text>
          <rect x="552" y="126" width="10" height="10" rx="2" fill="var(--line)" />
          <text x="568" y="135" class="note">未选</text>
          <text x="16" y="156" class="note">e^分数 ÷ 全部 128,256 项的 e^分数之和 · 教学示意，不是实测</text>
          <text x="24" y="176" class="note">候选小段</text>
          <text x="150" y="176" class="note">第 3 步分数</text>
          <text x="280" y="176" class="note">可能性（百分比）</text>
          <text x="430" y="176" class="note">条越长，可能性越大</text>
          {#each cur.round.dist as d, i}
            {@const y = 202 + i * 30}
            {@const chosen = d.text === cur.round.pick.text}
            <text x="24" y={y} class="tok" class:dim={!chosen}>{d.text.replace(/^ /, '␣')}</text>
            <text x="150" y={y} class="tok" class:dim={!chosen}>{firstScores[i].toFixed(2)}</text>
            <text x="230" y={y} class="tok" class:dim={!chosen}>→</text>
            <text x="280" y={y} class="tok" class:dim={!chosen}>{d.p.toFixed(2)} = {Math.round(d.p * 100)}%</text>
            <rect x="430" y={y - 14} width={d.p * 260} height="18" rx="3" fill={chosen ? 'var(--gen)' : 'var(--line)'} />
            {#if chosen}<text x="650" y={y} class="pick">← 选中</text>{/if}
          {/each}
          <text x="16" y="326" class="sum">82% + 5% + 4% + 3% + 其余 128,252 项合计 6% = 100%</text>
          <text x="16" y="350" class="note">要结果固定 → 取最大：本例选 82% 最高的 ␣Paris</text>
          <text x="16" y="374" class="note">允许结果变化 → 采样：按百分比随机抽；100 次约 82 次 ␣Paris</text>
          <text x="16" y="394" class="note">下一步：把选中的 ␣Paris 接到原序列末尾</text>
        </g>
      {/if}

      <!-- Next-token distribution -->
      {#if showDist && cur.round}
        <g transition:fade={{ duration: (step === 9 || step === 10) && $lang === 'zh' ? 0 : 250 }}>
          <text x={barLabelX - 60} y={distY + 4} class="label">{step === 4 ? t('p(next token | sequence)', '上一轮猜下一段的结果') : step === 6 ? t('p(next token | sequence)', '下一段的可能性 · 0.71 = 71%') : step === 7 ? t('p(next token | sequence)', '上一轮结果 · 0.71 = 71%') : step === 9 ? t('p(next token | sequence)', '第 9 步算出下一段的可能性') : 'p(next token | sequence)'}</text>
          {#each cur.round.dist as d, i}
            {@const y = distY + 14 + i * (barH + barGap)}
            {@const chosen = d.text === cur.round.pick.text}
            <text x={barLabelX - 8} y={y + 13} text-anchor="end" class="tok" class:dim={!chosen}>{d.text.replace(/^ /, '␣')}</text>
            <rect x={barLabelX} {y} width={d.p * barMaxW} height={barH} rx="3"
                  fill={chosen ? stroke(cur.round.pick.kind) : 'var(--line)'} class="bar" class:steady={step === 9 && $lang === 'zh'} />
            <text x={barLabelX + d.p * barMaxW + 6} y={y + 13} class="id" class:dim={!chosen}>{d.p.toFixed(2)}{step === 9 && $lang === 'zh' && chosen ? ` = ${Math.round(d.p * 100)}%` : ''}</text>
          {/each}
          {#if cur.phase === 'sample'}
            <text x={barLabelX + barMaxW + 50} y={distY + 27} class="pick" in:fade>{t('← pick', '← 选中')}</text>
          {/if}
        </g>
      {/if}

      <!-- Done: decoded output -->
      {#if cur.phase === 'done'}
        {#if $lang === 'zh'}
          <g in:fade={{ duration: 0 }}>
            <text x={W / 2} y="146" text-anchor="middle" class="model-title">解码（decode）：按第 2 步的对照表，把编号换回文字</text>
            <text x="150" y="190" text-anchor="middle" class="tok">12366、13</text>
            <text x="150" y="211" text-anchor="middle" class="note">两个要翻回文字的新编号</text>
            <text x="270" y="190" text-anchor="middle" class="tok">→</text>
            <text x="360" y="190" text-anchor="middle" class="tok">查对照表</text>
            <text x="450" y="190" text-anchor="middle" class="tok">→</text>
            <text x="570" y="190" text-anchor="middle" class="tok">␣Paris、.</text>
            <text x="570" y="211" text-anchor="middle" class="note">按顺序拼回文字</text>
            <rect x="210" y="240" width="300" height="58" rx="6" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x={W / 2} y="261" text-anchor="middle" class="id">新生成的文字（不含输入和 EOS）</text>
            <text x={W / 2} y="284" text-anchor="middle" class="tok">"{generated}"</text>
            <text x={W / 2} y="326" text-anchor="middle" class="note">128001 是 EOS，只负责停止，不放进输出文字</text>
            <text x={W / 2} y="350" text-anchor="middle" class="note">原输入后接新增文字 = 完整内容；这里只画新增部分</text>
            <text x={W / 2} y="374" text-anchor="middle" class="note">下一步：第 12 步把三轮的计算量加起来</text>
          </g>
        {:else}
          <g in:fade>
            <rect x="16" y={modelY + 12} width="200" height="30" rx="6" fill="white" stroke="var(--eos)" />
            <text x="28" y={modelY + 31} class="id">output: <tspan class="out">"{generated}"</tspan></text>
          </g>
        {/if}
      {/if}

      {#if cur.phase === 'tokenize'}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>{t(`Llama-3's tokenizer also puts <|begin_of_text|> (id 128000) in front · left out here`, `实际输入还会在最前面加「开始」标记（id 128000）· 这里省略`)}</text>
      {:else if cur.phase === 'done' && $lang !== 'zh'}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>SGLang also stops a request at max_new_tokens (default 128), or at a stop string or token id it names</text>
      {:else if step === 9 && $lang === 'zh'}
        <text x={W / 2} y={H - 26} text-anchor="middle" class="footnote" in:fade={{ duration: 0 }}>全部候选的可能性合计 1；只画最大的 4 项，其余 1 − (0.88 + 0.05 + 0.03 + 0.02) = 0.02</text>
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade={{ duration: 0 }}>选中 EOS 后，下一步停止</text>
      {:else if step === 8 && $lang === 'zh'}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote" in:fade>怎么少算，第 12 步先算清重复了多少</text>
      {/if}

      <!-- Tally: one row of cells per round, aligned under the token each cell recomputed -->
      {#if cur.phase === 'tally'}
        <g in:fade={{ duration: $lang === 'zh' ? 0 : 400 }}>
          {#if $lang === 'zh'}
            <text x="16" y="110" class="note">1 格 = 这一列在这一轮算 1 次</text>
            <rect x="270" y="99" width="10" height="10" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" />
            <text x="286" y="108" class="note">输入</text>
            <rect x="340" y="99" width="10" height="10" rx="2" fill="var(--gen-soft)" stroke="var(--gen)" />
            <text x="356" y="108" class="note">新生成</text>
            <rect x="440" y="99" width="10" height="10" rx="2" fill="var(--eos-soft)" stroke="var(--eos)" />
            <text x="456" y="108" class="note">EOS（停止）</text>
          {/if}
          {#each counts as n, r}
            {@const y = tallyY + r * tallyGap}
            {#each layout.slice(0, n) as { t, x, w }, c}
              <rect x={x + w / 2 - tallySz / 2} {y} width={tallySz} height={tallySz} rx="4" fill={fill(t.kind)} stroke={stroke(t.kind)}
                    in:fly={$lang === 'zh' ? { duration: 0 } : { y: -8, delay: (r * 8 + c) * 35, duration: 250 }} />
            {/each}
            {@const last = layout[n - 1]}
            <text x={last.x + last.w / 2 + tallySz / 2 + 10} y={y + 15} class="id" in:fade={{ duration: $lang === 'zh' ? 0 : 400, delay: $lang === 'zh' ? 0 : (r * 8 + n) * 35 }}>{t(`round ${r + 1} · ${n} positions`, `第 ${r + 1} 轮 · 算 ${n} 格`)}</text>
            {#if $lang === 'zh'}
              <text x={last.x + last.w / 2 + tallySz / 2 + 10} y={y + 30} class="id" in:fade={{ duration: 0 }}>{r === 0 ? '→ ␣Paris' : r === 1 ? '→ .' : '→ EOS（停止，不再输入）'}</text>
            {/if}
          {/each}
          <g in:fade={{ duration: $lang === 'zh' ? 0 : 400, delay: $lang === 'zh' ? 0 : 900 }}>
            <text x="16" y={tallyY + rounds.length * tallyGap + 22} class="sum">{t(`${counts.join(' + ')} = ${counts.reduce((a, b) => a + b, 0)} positions computed`, `${counts.join(' + ')} = ${counts.reduce((a, b) => a + b, 0)} 格（每格算 1 次）`)}</text>
            {#if $lang === 'zh'}
              <text x="16" y={tallyY + rounds.length * tallyGap + 44} class="sum">第一次算 5 + 1 + 1 = 7 格 · 重算 11 格</text>
              <text x="16" y={tallyY + rounds.length * tallyGap + 70} class="id">重算 11 格 = 前 5 列各多算 2 次（10 格）+ ␣Paris 再算 1 次（1 格）</text>
            {:else}
              <text x="16" y={tallyY + rounds.length * tallyGap + 44} class="sum">{rounds.length} tokens produced</text>
              <text x="16" y={tallyY + rounds.length * tallyGap + 70} class="id">the {prompt.length} prompt columns: same input, same output, computed {rounds.length}×</text>
            {/if}
          </g>
        </g>
      {/if}
      {/if}
    </svg>
  </div>

  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} {prev} {next} onchange={(s) => (step = s)} />
</figure>

<style>
  .phone-forward .label, .phone-repeat .label, .phone-append .label, .phone-done .label, .phone-tally .label { font-size: 12px; }
  .phone-forward .note, .phone-repeat .note, .phone-append .note, .phone-done .note, .phone-tally .note { font-size: 13px; }
  .phone-forward .id, .phone-forward .model-sub, .phone-repeat .id, .phone-repeat .model-sub, .phone-append .id, .phone-append .model-sub, .phone-done .id, .phone-tally .id { font-size: 12px; }
  .phone-forward .note, .phone-forward .id, .phone-forward .model-sub, .phone-repeat .note, .phone-repeat .id, .phone-repeat .model-sub, .phone-append .note, .phone-append .id, .phone-append .model-sub, .phone-done .note, .phone-done .id, .phone-tally .note, .phone-tally .id { fill: var(--fg); }
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
  .bar.steady { transition: none; }
  rect.pulse { animation: pulse 900ms ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
  @keyframes march { to { stroke-dashoffset: -20 } }
</style>
