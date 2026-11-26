<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import * as N from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type Node = { title: string; titleZh: string; result: string; resultZh: string; body: string; bodyZh: string; tone: Tone; bar?: number; compact?: boolean; dashed?: boolean };
  type Line = { en: string; zh: string };
  type MobileText = { title: string; titleZh: string; subtitle: string; subtitleZh: string; foot: string; footZh: string; legend: string; legendZh: string; formulas?: Line[] };
  type Step = { caption: string; captionZh: string; title: string; titleZh: string; subtitle: string; subtitleZh: string; foot: string; footZh: string; legend: string; legendZh: string; nodes: Node[]; formulas: Line[]; flow?: boolean; desktopH?: number; mobile?: MobileText };

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const steps: Step[] = [{
    caption: 'The target changes during RL. Online draft training reaches 1,667 tokens/s versus 1,464 frozen.',
    captionZh: 'RL 会更新 target，draft 也跟着学。在线版 1667 token/s，冻结版 1464。',
    title: 'Train the draft as the target changes', titleZh: 'target 改变时，draft 也学习',
    subtitle: 'online SFT = the draft learns from each RL batch', subtitleZh: 'online SFT = draft 也从每批 RL 数据学习',
    foot: 'Reported MiMo-7B-RL on H200; not a local benchmark or whole-round speedup.',
    footZh: '文章报告的 MiMo-7B-RL H200 实验；不是本地实测或整轮加速。',
    legend: 'Orange = frozen draft · blue = online draft · bars share one scale', legendZh: '橙 = 冻结 draft · 蓝 = 在线 draft · 柱使用同一比例',
    nodes: [
      { title: 'FROZEN DRAFT', titleZh: '冻结 DRAFT', result: `${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} tokens/s`, resultZh: `${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} token/s`, body: 'old guesses stay unchanged', bodyZh: '猜测仍用旧权重', tone: 'orange', bar: N.SPEC_FROZEN_ROLLOUT_TOKENS_S / N.SPEC_ONLINE_ROLLOUT_TOKENS_S },
      { title: 'ONLINE DRAFT', titleZh: '在线 DRAFT', result: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} tokens/s`, resultZh: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} token/s`, body: 'new guesses learn too', bodyZh: '猜测也跟着训练', tone: 'blue', bar: 1 },
    ],
    formulas: [
      { en: 'RL round 1 → round 2: target weights change', zh: 'RL 第 1 轮 → 第 2 轮：target 权重改变' },
      { en: 'Ch. 15 Step 3: draft guesses; target verifies', zh: '第 1 本第 15 章第 3 步：draft 猜，target 验证' },
      { en: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} − ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} = ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S - N.SPEC_FROZEN_ROLLOUT_TOKENS_S} more tokens/s`, zh: `${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} − ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} = 每秒多 ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S - N.SPEC_FROZEN_ROLLOUT_TOKENS_S} token` },
      { en: `gain = ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_ONLINE_OVER_FROZEN * 100).toFixed(1)}%`, zh: `提升 = ${N.SPEC_ONLINE_ROLLOUT_TOKENS_S} ÷ ${N.SPEC_FROZEN_ROLLOUT_TOKENS_S} − 1 = ${(N.SPEC_ONLINE_OVER_FROZEN * 100).toFixed(1)}%` },
      { en: 'How can the draft learn the target’s next tokens?', zh: 'draft 怎样学习 target 的后续 token？' },
    ],
    mobile: {
      title: 'Train the draft too', titleZh: 'draft 也学习',
      subtitle: 'online SFT = draft learns during RL', subtitleZh: 'online SFT = draft 在 RL 中学习',
      foot: 'Reported H200 result; not a whole-round speedup.', footZh: '文章报告的 H200 结果；不是整轮加速。',
      legend: 'Orange = frozen · blue = online · one scale', legendZh: '橙 = 冻结 · 蓝 = 在线 · 同一比例',
      formulas: [
        { en: 'RL changes target weights', zh: 'RL 会改变 target 权重' },
        { en: 'Ch. 15 Step 3: draft guesses, target verifies', zh: '第 15 章第 3 步：draft 猜，target 验证' },
        { en: '1667 − 1464 = 203 more tokens/s', zh: '1667 − 1464 = 每秒多 203 token' },
        { en: '1667 ÷ 1464 − 1 = 13.9%', zh: '1667 ÷ 1464 − 1 = 13.9%' },
        { en: 'How does the draft learn?', zh: 'draft 怎样学习？' },
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
  const cur = $derived(steps[step]);
  const W = $derived(phone ? 300 : 720);
  const start = 80;
  const formulas = $derived(phone && cur.mobile?.formulas ? cur.mobile.formulas : cur.formulas);
  const formulaStart = 315;
  const legendY = $derived(phone ? start + cur.nodes.length * 96 + 15 + formulas.length * 27 : formulaStart + (cur.formulas.length - 1) * 29 + 45);
  const H = $derived(phone ? legendY + 55 : Math.max(cur.desktopH ?? 500, legendY + 55));
  const nodeW = (count: number) => count === 2 ? 260 : count === 3 ? 200 : 155;
  const nodeX = (i: number, count: number) => count === 2 ? 65 + i * 330 : count === 3 ? 35 + i * 225 : 25 + i * 175;
</script>

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      <defs><marker id="rl-spec-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--line)" /></marker></defs>
      <text x={phone ? 18 : 36} y="30" class="title">{phone ? t(cur.mobile?.title ?? cur.title, cur.mobile?.titleZh ?? cur.titleZh) : t(cur.title, cur.titleZh)}</text>
      <text x={phone ? 18 : 36} y="55" class="label">{phone ? t(cur.mobile?.subtitle ?? cur.subtitle, cur.mobile?.subtitleZh ?? cur.subtitleZh) : t(cur.subtitle, cur.subtitleZh)}</text>
      {#if phone}
        {#each cur.nodes as node, i}
          {@const y = start + i * 96}
          <rect x="25" y={y} width="250" height="80" rx="11" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.dashed ? '5 4' : '0'} />
          <text x="150" y={y + 20} text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x="150" y={y + 43} text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
          <text x="150" y={y + 64} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if node.bar !== undefined}<rect x="35" y={y + 72} width="230" height="5" rx="2" fill="var(--bg)" /><rect x="35" y={y + 72} width={230 * node.bar} height="5" rx="2" fill={stroke(node.tone)} />{/if}
          {#if cur.flow && i < cur.nodes.length - 1}<line x1="150" y1={y + 80} x2="150" y2={y + 92} stroke="var(--line)" stroke-width="2.5" marker-end="url(#rl-spec-arrow)" />{/if}
        {/each}
        {#each formulas as line, i}<text x="150" y={start + cur.nodes.length * 96 + 15 + i * 27} text-anchor="middle" class={i === 0 ? 'result' : 'small'}>{t(line.en, line.zh)}</text>{/each}
        <text x="150" y={legendY} text-anchor="middle" class="small">{t(cur.mobile?.legend ?? cur.legend, cur.mobile?.legendZh ?? cur.legendZh)}</text>
      {:else}
        {#each cur.nodes as node, i}
          {@const w = nodeW(cur.nodes.length)}
          {@const x = nodeX(i, cur.nodes.length)}
          <rect x={x} y="105" width={w} height="160" rx="12" fill={fill(node.tone)} stroke={stroke(node.tone)} stroke-dasharray={node.dashed ? '5 4' : '0'} />
          <text x={x + w / 2} y="137" text-anchor="middle" class="small strong">{t(node.title, node.titleZh)}</text>
          <text x={x + w / 2} y="180" text-anchor="middle" class={node.compact ? 'small' : 'result'}>{t(node.result, node.resultZh)}</text>
          <text x={x + w / 2} y={node.bar === undefined ? 222 : 211} text-anchor="middle" class="small">{t(node.body, node.bodyZh)}</text>
          {#if node.bar !== undefined}<rect x={x + 10} y="237" width={w - 20} height="10" rx="3" fill="var(--bg)" /><rect x={x + 10} y="237" width={(w - 20) * node.bar} height="10" rx="3" fill={stroke(node.tone)} />{/if}
          {#if cur.flow && i < cur.nodes.length - 1}<line x1={x + w} y1="185" x2={nodeX(i + 1, cur.nodes.length)} y2="185" stroke="var(--line)" stroke-width="2.5" marker-end="url(#rl-spec-arrow)" />{/if}
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
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) { .title { font-size: 16px; } .label, .small { font-size: 12px; } .result { font-size: 12px; } }
</style>
