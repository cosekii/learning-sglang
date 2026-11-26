<script lang="ts">
  import { onMount } from 'svelte';
  import StepControls from '../StepControls.svelte';
  import type { NavLink } from '../../chapters';
  import { lang } from '../../i18n';
  import type { Deep } from '../../deep';
  import * as N from '../../ml-sys/numbers';

  type Tone = 'plain' | 'blue' | 'orange';
  type Group = { symbol: string; count: number; tone: Tone; mask?: 0 | 1 };
  const prompt: Group = { symbol: 'P', count: N.AGENT_PROMPT_TOKENS, tone: 'plain' };
  const firstAction: Group = { symbol: 'A', count: N.AGENT_FIRST_ACTION_TOKENS, tone: 'blue', mask: 1 };
  const observation: Group = { symbol: 'O', count: N.AGENT_OBSERVATION_TOKENS, tone: 'orange', mask: 0 };
  const secondAction: Group = { symbol: 'B', count: N.AGENT_SECOND_ACTION_TOKENS, tone: 'blue', mask: 1 };
  const fill = (tone: Tone) => tone === 'blue' ? 'var(--accent-soft)' : tone === 'orange' ? 'var(--gen-soft)' : 'var(--bg)';
  const stroke = (tone: Tone) => tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--gen)' : 'var(--line)';
  const countBefore = (groups: Group[], index: number) => groups.slice(0, index).reduce((sum, group) => sum + group.count, 0);
  const countAll = (groups: Group[]) => groups.reduce((sum, group) => sum + group.count, 0);

  let { prev, next, deep }: { prev?: NavLink; next?: NavLink; deep?: Deep } = $props();
  const t = (en: string, zh: string) => ($lang === 'zh' ? zh : en);
  const steps = [{
    caption: 'The second model call needs earlier actions and tool replies. Separate records would drop seven response tokens.',
    captionZh: '后面的模型调用要读前面的动作和工具回复。分开保存会丢 7 个响应 token。',
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
  const H = $derived(phone ? 820 : 560);
</script>

{#snippet tokenRow(groups: Group[], x: number, y: number, w: number, mask = false)}
  {@const cell = w / countAll(groups)}
  {#each groups as group, i}
    {@const before = countBefore(groups, i)}
    <!-- Token counts stay beside the spans in the arithmetic below. -->
    {#each Array(group.count) as _, j}
      <rect x={x + (before + j) * cell + 1} y={y} width={cell - 2} height="42" rx="4" fill={fill(group.tone)} stroke={stroke(group.tone)} />
      <text x={x + (before + j + 0.5) * cell} y={y + 27} text-anchor="middle" class="token">{mask ? group.mask : group.symbol}</text>
    {/each}
  {/each}
{/snippet}

<figure class="viz">
  <div class="canvas">
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label={$lang === 'zh' ? cur.captionZh : cur.caption}>
      {#if step === 0}
        <text x={phone ? 18 : 36} y="30" class="title">{t(phone ? 'Keep one whole Sample' : 'One Sample keeps the whole interaction', '一个 Sample 保存完整交互')}</text>
        <text x={phone ? 18 : 36} y="55" class="label">{t(phone ? 'Sample = one task’s ordered record' : 'Sample = one task’s ordered trajectory, its complete token record', 'Sample = 一个任务按顺序保存的完整 token 记录')}</text>
        {#if !phone}
          <rect x="30" y="88" width="315" height="320" rx="12" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="6 4" />
          <text x="187" y="120" text-anchor="middle" class="section">{t('SEPARATE RECORDS', '拆开的记录')}</text>
          <text x="187" y="145" text-anchor="middle" class="small">{t('the second call cannot read A or O', '第二次调用读不到 A 和 O')}</text>
          <text x="50" y="180" class="small strong">{t('record 1', '记录 1')}</text>
          {@render tokenRow([prompt, firstAction], 50, 192, 270)}
          <text x="50" y="259" class="small strong">{t('record 2', '记录 2')}</text>
          {@render tokenRow([observation], 50, 271, 270)}
          <text x="50" y="338" class="small strong">{t('record 3 · second call', '记录 3 · 第二次调用')}</text>
          {@render tokenRow([prompt, secondAction], 50, 350, 270)}

          <rect x="375" y="88" width="315" height="320" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="532" y="120" text-anchor="middle" class="section">{t('ONE SAMPLE', '一个 SAMPLE')}</text>
          <text x="532" y="145" text-anchor="middle" class="small">{t('the second call reads P + A + O', '第二次调用读取 P + A + O')}</text>
          <text x="395" y="180" class="small strong">Sample.tokens</text>
          {@render tokenRow([prompt, firstAction, observation, secondAction], 395, 192, 270)}
          <rect x="395" y="259" width="135" height="62" rx="8" fill="var(--bg)" stroke="var(--accent)" />
          <text x="462" y="283" text-anchor="middle" class="tiny">{t('second call input', '第二次调用的输入')}</text>
          <text x="462" y="306" text-anchor="middle" class="result">P + A + O</text>
          <text x="545" y="283" class="result">2 + 4 + 3</text>
          <text x="545" y="307" class="result">= 9 tokens</text>
          <text x="532" y="352" text-anchor="middle" class="small">{t('all 12 response tokens stay ordered', '12 个响应 token 都按顺序留下')}</text>
        {:else}
          <rect x="20" y="80" width="260" height="290" rx="12" fill="var(--bg)" stroke="var(--line)" stroke-dasharray="6 4" />
          <text x="150" y="108" text-anchor="middle" class="section">{t('SEPARATE RECORDS', '拆开的记录')}</text>
          <text x="150" y="132" text-anchor="middle" class="tiny">{t('second call misses A and O', '第二次调用读不到 A 和 O')}</text>
          <text x="36" y="160" class="tiny strong">{t('record 1', '记录 1')}</text>
          {@render tokenRow([prompt, firstAction], 36, 170, 228)}
          <text x="36" y="232" class="tiny strong">{t('record 2', '记录 2')}</text>
          {@render tokenRow([observation], 36, 242, 228)}
          <text x="36" y="304" class="tiny strong">{t('record 3 · second call', '记录 3 · 第二次调用')}</text>
          {@render tokenRow([prompt, secondAction], 36, 314, 228)}

          <rect x="20" y="390" width="260" height="210" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
          <text x="150" y="418" text-anchor="middle" class="section">{t('ONE SAMPLE', '一个 SAMPLE')}</text>
          <text x="36" y="447" class="tiny strong">Sample.tokens</text>
          {@render tokenRow([prompt, firstAction, observation, secondAction], 36, 458, 228)}
          <text x="150" y="531" text-anchor="middle" class="small">{t('second call: P + A + O', '第二次调用：P + A + O')}</text>
          <text x="150" y="560" text-anchor="middle" class="result">2 + 4 + 3 = 9</text>
          <text x="150" y="584" text-anchor="middle" class="tiny">{t('tokens enter the second call', '个 token 进入第二次调用')}</text>
        {/if}
        {#if phone}
          <text x="150" y="624" text-anchor="middle" class="result">4 + 3 = 7</text>
          <text x="150" y="648" text-anchor="middle" class="small">{t('earlier response tokens would be missing', '个早期响应 token 会丢失')}</text>
          <text x="150" y="680" text-anchor="middle" class="small">4 + 3 + 5 = 12 {t('response tokens', '个响应 token')}</text>
          <text x="150" y="714" text-anchor="middle" class="tiny">P = prompt · A = {t('first action', '第一次动作')}</text>
          <text x="150" y="738" text-anchor="middle" class="tiny">O = {t('tool observation', '工具观察')} · B = {t('later action', '后续动作')}</text>
          <text x="150" y="762" text-anchor="middle" class="tiny">{t('action = model’s tool instruction', '动作 = 模型发给工具的指令')}</text>
          <text x="150" y="786" text-anchor="middle" class="tiny">{t('observation = the tool’s reply', '观察 = 工具的回复')}</text>
        {:else}
          <text x="360" y="442" text-anchor="middle" class="result">4 + 3 = 7 {t('earlier response tokens would be missing', '个早期响应 token 会丢失')}</text>
          <text x="360" y="472" text-anchor="middle" class="small">4 + 3 + 5 = 12 {t('response tokens in one Sample', '个响应 token 保存在同一 Sample')}</text>
          <text x="360" y="505" text-anchor="middle" class="tiny">P = prompt · A = {t('first model action', '第一次模型动作')} · O = {t('tool observation', '工具观察')} · B = {t('later model action', '后续模型动作')}</text>
          <text x="360" y="533" text-anchor="middle" class="tiny">{t('action = model’s instruction to a tool · observation = the tool’s reply', '动作 = 模型发给工具的指令 · 观察 = 工具的回复')}</text>
        {/if}
        <text x={W / 2} y={H - 10} text-anchor="middle" class="footnote">{t(phone ? 'Constructed counts · blue = model · orange = observation' : 'Constructed token counts; blue = model tokens · orange = tool observation.', phone ? '构造数量 · 蓝 = 模型 · 橙 = 工具观察' : '构造的 token 数；蓝 = 模型 token · 橙 = 工具观察。')}</text>
      {/if}
    </svg>
  </div>
  <StepControls {step} total={steps.length} caption={cur.caption} captionZh={cur.captionZh}
    deep={deep?.en[step]} deepZh={deep?.zh[step]} onchange={(s) => (step = s)} {prev} {next} />
</figure>

<style>
  .title { font-size: 18px; font-weight: 650; fill: var(--fg); }
  .label, .small { font-size: 13px; fill: var(--fg); }
  .section { font-family: var(--mono); font-size: 15px; font-weight: 700; fill: var(--fg); }
  .tiny { font-size: 11px; fill: var(--fg); }
  .token { font-family: var(--mono); font-size: 13px; font-weight: 650; fill: var(--fg); }
  .strong { font-weight: 650; }
  .result { font-family: var(--mono); font-size: 15px; font-weight: 650; fill: var(--fg); }
  @media (max-width: 600px) {
    .title { font-size: 16px; }
    .label, .small { font-size: 12px; }
    .section { font-size: 13px; }
    .tiny { font-size: 10px; }
    .token, .result { font-size: 12px; }
  }
</style>
