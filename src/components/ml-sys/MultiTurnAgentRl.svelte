<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import LoopProgress from '../LoopProgress.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import * as N from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type Line = { en: string; zh: string };
  type Node = { title: string; titleZh: string; result: string; resultZh: string; body: string; bodyZh: string; tone: Tone; dashed?: boolean };
  type MobileText = { title: string; titleZh: string; subtitle: string; subtitleZh: string; foot: string; footZh: string; legend: string; legendZh: string; formulas?: Line[] };
  type Step = { caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string; foot: string; footZh: string; legend: string; legendZh: string; nodes: Node[]; formulas: Line[]; flow?: boolean; compare?: boolean; mobile?: MobileText };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: 'The second call needs nine context tokens. Separate records supply only the two prompt tokens.',
    captionZh: '第二次调用需要 9 个上下文 token。拆开后只剩 2 个 prompt token。',
    title: 'Keep one Sample for the whole interaction', titleZh: '一个 Sample 保存完整交互',
    subtitle: 'Sample = one task’s ordered token record', subtitleZh: 'Sample = 一个任务按顺序保存的 token 记录',
    foot: 'Constructed token counts; P, A, O and B are spans, not tokenizer output.', footZh: '构造的 token 数；P、A、O、B 是片段，不是 tokenizer 输出。',
    legend: 'Orange = missing context · blue = preserved record · red = current', legendZh: '橙 = 丢失的上下文 · 蓝 = 保留的记录 · 红 = 当前',
    compare: true,
    nodes: [
      { title: 'SEPARATE RECORDS', titleZh: '拆开的记录', result: 'second call: P P = 2', resultZh: '第二次调用：P P = 2', body: 'missing A(4) + O(3) = 7', bodyZh: '缺少 A(4) + O(3) = 7', tone: 'orange', dashed: true },
      { title: 'ONE SAMPLE', titleZh: '一个 SAMPLE', result: 'second call: P+A+O = 9', resultZh: '第二次调用：P+A+O = 9', body: 'then B(5) · response = 12', bodyZh: '再写 B(5) · 响应 = 12', tone: 'blue' },
    ],
    formulas: [
      { en: 'P = prompt (2) · A = model’s tool instruction (4)', zh: 'P = prompt（2）· A = 模型发给工具的指令（4）' },
      { en: 'O = tool reply (3) · B = later model action (5)', zh: 'O = 工具回复（3）· B = 后续模型动作（5）' },
      { en: 'missing response context: 4 + 3 = 7 tokens', zh: '丢失的响应上下文：4 + 3 = 7 token' },
      { en: 'one Sample response: 4 + 3 + 5 = 12 tokens', zh: '一个 Sample 的响应：4 + 3 + 5 = 12 token' },
      { en: 'Next: which response tokens should teach the model?', zh: '下一步：哪些响应 token 用来训练模型？' },
    ],
    mobile: {
      title: 'Keep one whole Sample', titleZh: '一个 Sample 保存完整交互',
      subtitle: 'Sample = one task’s ordered token record', subtitleZh: 'Sample = 一个任务按顺序保存的 token 记录',
      foot: 'Constructed spans, not real tokenizer output.', footZh: '构造片段，不是真实 tokenizer 输出。',
      legend: 'Orange = missing · blue = kept · red = current', legendZh: '橙 = 丢失 · 蓝 = 保留 · 红 = 当前',
      formulas: [
        { en: 'P = prompt (2) · A = first action (4)', zh: 'P = prompt（2）· A = 第一次动作（4）' },
        { en: 'O = tool reply (3) · B = next action (5)', zh: 'O = 工具回复（3）· B = 后续动作（5）' },
        { en: 'Missing response context: 4 + 3 = 7', zh: '丢失的响应上下文：4 + 3 = 7' },
        { en: 'One Sample response: 4 + 3 + 5 = 12', zh: '一个 Sample 的响应：4 + 3 + 5 = 12' },
        { en: 'Next: which tokens teach the model?', zh: '下一步：哪些 token 训练模型？' },
      ],
    },
  }, {
    caption: 'Mask 1 learns from model actions; mask 0 skips tool replies. Nine of twelve response tokens teach the model.',
    captionZh: 'mask 1 学习模型动作，mask 0 跳过工具回复。12 个响应 token 中有 9 个参与训练。',
    title: 'Give each response token a loss mask', titleZh: '给每个响应 token 一个 loss mask',
    subtitle: 'loss mask: 1 = learn from this token · 0 = skip it', subtitleZh: 'loss mask：1 = 学习这个 token · 0 = 跳过',
    foot: 'The mask selects training tokens; it does not remove context.', footZh: 'mask 只选择训练 token，不会删掉上下文。',
    legend: 'Blue = learn · orange = skip · red = current', legendZh: '蓝 = 学习 · 橙 = 跳过 · 红 = 当前',
    compare: true,
    nodes: [
      { title: 'MODEL ACTIONS', titleZh: '模型动作', result: `A(4) + B(5) = ${N.AGENT_MODEL_ACTION_TOKENS}`, resultZh: `A(4) + B(5) = ${N.AGENT_MODEL_ACTION_TOKENS}`, body: 'mask 1 for every action token', bodyZh: '每个动作 token 的 mask 都是 1', tone: 'blue' },
      { title: 'TOOL REPLY', titleZh: '工具回复', result: 'O = 3', resultZh: 'O = 3', body: 'mask 0 for every observation token', bodyZh: '每个观察 token 的 mask 都是 0', tone: 'orange' },
      { title: 'FOR TRAINING', titleZh: '用于训练', result: `${N.AGENT_MODEL_ACTION_TOKENS} of ${N.AGENT_RESPONSE_TOKENS}`, resultZh: `${N.AGENT_RESPONSE_TOKENS} 个中的 ${N.AGENT_MODEL_ACTION_TOKENS} 个`, body: 'O remains context, not a lesson', bodyZh: 'O 留作上下文，不参与学习', tone: 'blue' },
    ],
    formulas: [
      { en: 'response order: A(4) → O(3) → B(5)', zh: '响应顺序：A(4) → O(3) → B(5)' },
      { en: 'mask order: 1×4 → 0×3 → 1×5', zh: 'mask 顺序：1×4 → 0×3 → 1×5' },
      { en: `learn: 4 + 5 = ${N.AGENT_MODEL_ACTION_TOKENS} · skip: 3`, zh: `学习：4 + 5 = ${N.AGENT_MODEL_ACTION_TOKENS} · 跳过：3` },
      { en: 'O enters the next call; only its training loss is skipped', zh: 'O 仍进入下次调用，只是不计算它的训练损失' },
      { en: 'Next: encode O without repeating the prompt preamble', zh: '下一步：编码 O 时不重复 prompt 前缀' },
    ],
    mobile: {
      title: 'Mark tokens to learn', titleZh: '标出要学习的 token',
      subtitle: 'loss mask: 1 = learn · 0 = skip', subtitleZh: 'loss mask：1 = 学习 · 0 = 跳过',
      foot: 'The mask does not remove context.', footZh: 'mask 不会删掉上下文。',
      legend: 'Blue = learn · orange = skip · red = current', legendZh: '蓝 = 学习 · 橙 = 跳过 · 红 = 当前',
      formulas: [
        { en: 'Response: A(4) → O(3) → B(5)', zh: '响应：A(4) → O(3) → B(5)' },
        { en: 'Mask: 1×4 → 0×3 → 1×5', zh: 'mask：1×4 → 0×3 → 1×5' },
        { en: 'Learn: 4 + 5 = 9 · skip: 3', zh: '学习：4 + 5 = 9 · 跳过：3' },
        { en: 'O stays as context, not a lesson', zh: 'O 留作上下文，不参与学习' },
        { en: 'Next: encode only the new observation', zh: '下一步：只编码新的观察' },
      ],
    },
  }];
  let step = $state(0);
  $effect(() => {
    const q = Number(new URLSearchParams(window.location.search).get('step'));
    if (q >= 1 && q <= steps.length) step = q - 1;
  });
  let phone = $state(false);
  onMount(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => (phone = query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
  let phase = $state(0);
  let lap = $state(0), lapMs = $state(0);
  const nextLap = (ms: number) => untrack(() => { lapMs = ms; lap++; });
  $effect(() => {
    const s = step;
    phase = 0;
    const count = steps[s].nodes.length + 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers.length = 0;
      phase = 0;
      for (let i = 1; i < count; i++) timers.push(setTimeout(() => (phase = i), i * 1400));
      const ms = count * 1400 + 1800;
      timers.push(setTimeout(run, ms));
      nextLap(ms);
    };
    run();
    return () => timers.forEach(clearTimeout);
  });
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const start = 80;
  const formulas = $derived(phone && cur.mobile?.formulas ? cur.mobile.formulas : cur.formulas);
  const formulaStart = 315;
  const legendY = $derived(phone ? start + cur.nodes.length * 96 + 15 + formulas.length * 27 : formulaStart + (cur.formulas.length - 1) * 29 + 45);
  const H = $derived(phone ? legendY + 55 : Math.max(500, legendY + 55));
  const nodeW = (count: number) => count === 2 ? 260 : count === 3 ? 200 : 155;
  const nodeX = (i: number, count: number) => count === 2 ? 65 + i * 330 : count === 3 ? 35 + i * 225 : 25 + i * 175;
  const shown = (i: number) => cur.compare || i <= phase;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs><marker id="agent-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--line)" /></marker></defs>
      <LoopProgress ms={lapMs} {lap} x={phone ? 214 : 640} y={4} label={t('loops · red = current', '循环 · 红 = 当前')} />
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobile?.title ?? cur.title, cur.mobile?.titleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobile?.subtitle ?? cur.subtitle, cur.mobile?.subtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.nodes as node, i}
          {@const y = start + i * 96}
          <g opacity={shown(i) ? 1 : 0.3} class="reveal">
            <rect x="25" y={y} width="250" height="80" rx="11" fill={fill(node.tone)} stroke={phase === i ? 'var(--eos)' : stroke(node.tone)} stroke-width={phase === i ? 3 : 1} stroke-dasharray={node.dashed ? '5 4' : '0'} />
            <text x="150" y={y + 20} text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x="150" y={y + 43} text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
            <text x="150" y={y + 64} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if cur.flow && i < cur.nodes.length - 1}<line x1="150" y1={y + 80} x2="150" y2={y + 92} stroke="var(--line)" stroke-width="2.5" marker-end="url(#agent-arrow)" />{/if}
          </g>
        {/each}
        {#each formulas as line, i}<text x="150" y={start + cur.nodes.length * 96 + 15 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>{/each}
        <text x="150" y={legendY} text-anchor="middle" class="small">{t(cur.mobile?.legend ?? cur.legend, cur.mobile?.legendZh ?? cur.legendZh)}</text>
      {:else}
        {#each cur.nodes as node, i}
          {@const w = nodeW(cur.nodes.length)}
          {@const x = nodeX(i, cur.nodes.length)}
          <g opacity={shown(i) ? 1 : 0.3} class="reveal">
            <rect x={x} y="105" width={w} height="160" rx="12" fill={fill(node.tone)} stroke={phase === i ? 'var(--eos)' : stroke(node.tone)} stroke-width={phase === i ? 3 : 1} stroke-dasharray={node.dashed ? '5 4' : '0'} />
            <text x={x + w / 2} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
            <text x={x + w / 2} y="180" text-anchor="middle" class="result">{t(node.result, node.resultZh)}</text>
            <text x={x + w / 2} y="222" text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
            {#if cur.flow && i < cur.nodes.length - 1}<line x1={x + w} y1="185" x2={nodeX(i + 1, cur.nodes.length)} y2="185" stroke="var(--line)" stroke-width="2.5" marker-end="url(#agent-arrow)" />{/if}
          </g>
        {/each}
        {#each cur.formulas as line, i}<text x="360" y={formulaStart + i * 29} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>{/each}
        <text x="360" y={H - 55} text-anchor="middle" class="small">{t(cur.legend, cur.legendZh)}</text>
      {/if}
      <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{phone ? t(cur.mobile?.foot ?? cur.foot, cur.mobile?.footZh ?? cur.footZh) : t(cur.foot, cur.footZh)}</text>
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh} deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label, .small { font-size: 13px; fill: var(--fg); }
  .strong { font-weight: 650; }
  .result { font-family: var(--mono); font-size: 14px; font-weight: 650; fill: var(--fg); }
  .reveal { transition: opacity 450ms; }
  @media (max-width: 600px) { .title { font-size: 16px; } .label, .small { font-size: 12px; } .result { font-size: 12px; } }
</style>
